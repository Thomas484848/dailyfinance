import { prisma } from '../lib/prisma';
import { enrichInstrument } from '../lib/aggregation/orchestrator';
import { sleep } from '../lib/utils';

type StaleInstrument = {
  id: string;
  asOfDate: number | null;
};

const BATCH_SIZE = Number(process.env.REFRESH_BATCH_SIZE ?? 50);
const MAX_CONCURRENT = Number(process.env.REFRESH_CONCURRENCY ?? 2);
const STALE_SECONDS = Number(process.env.REFRESH_STALE_SECONDS ?? 3600);
const LOOP_SLEEP_MS = Number(process.env.REFRESH_LOOP_SLEEP_MS ?? 1000);
const IDLE_SLEEP_MS = Number(process.env.REFRESH_IDLE_SLEEP_MS ?? 60000);

async function fetchStaleBatch(limit: number): Promise<StaleInstrument[]> {
  const rows = await prisma.$queryRaw<
    { id: string; asOfDate: number | null }[]
  >`
    SELECT i.id as id, mm.maxDate as asOfDate
    FROM Instrument i
    LEFT JOIN (
      SELECT instrumentId, MAX(asOfDate) as maxDate
      FROM Metrics
      GROUP BY instrumentId
    ) mm ON mm.instrumentId = i.id
    WHERE i.active = 1
    ORDER BY
      CASE WHEN mm.maxDate IS NULL THEN 0 ELSE 1 END,
      mm.maxDate ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    asOfDate: normalizeAsOfDate(row.asOfDate),
  }));
}

function normalizeAsOfDate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const asDate = Date.parse(value);
    return Number.isFinite(asDate) ? asDate : null;
  }
  return null;
}

async function runBatch(items: StaleInstrument[]) {
  const queue = items.slice();
  let completed = 0;

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      try {
        await enrichInstrument(item.id, { force: true });
      } catch (error) {
        console.error('[refresh-all] Error:', error);
      } finally {
        completed += 1;
        if (completed % 10 === 0 || completed === items.length) {
          console.log(`[refresh-all] Progress ${completed}/${items.length}`);
        }
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, MAX_CONCURRENT) }, () => worker());
  await Promise.all(workers);
}

async function refreshAll() {
  console.log('[refresh-all] Starting loop');
  while (true) {
    const batch = await fetchStaleBatch(
      Number.isFinite(BATCH_SIZE) && BATCH_SIZE > 0 ? BATCH_SIZE : 50
    );

    const now = Date.now();
    const stale = batch.filter((item) => {
      if (!item.asOfDate) return true;
      return now - item.asOfDate > STALE_SECONDS * 1000;
    });

    if (stale.length === 0) {
      console.log('[refresh-all] Nothing stale. Sleeping...');
      await sleep(IDLE_SLEEP_MS);
      continue;
    }

    console.log(`[refresh-all] Batch size ${stale.length}`);
    await runBatch(stale);
    await sleep(LOOP_SLEEP_MS);
  }
}

refreshAll().catch((error) => {
  console.error('[refresh-all] Fatal error:', error);
  process.exit(1);
});
