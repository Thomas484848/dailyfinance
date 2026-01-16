import { prisma } from '../lib/prisma';

const BATCH_SIZE = 200;

async function syncInstruments() {
  const total = await prisma.stock.count({ where: { active: true } });
  let processed = 0;
  let created = 0;
  let updated = 0;

  console.log(`[sync] Starting instrument sync. Total: ${total}`);

  let cursor: string | null = null;

  while (processed < total) {
    const batch = await prisma.stock.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (batch.length === 0) break;

    await prisma.$transaction(
      batch.map((stock) =>
        prisma.instrument.upsert({
          where: {
            symbol_exchangeCode: {
              symbol: stock.symbol,
              exchangeCode: stock.exchange ?? null,
            },
          },
          update: {
            name: stock.name,
            country: stock.country ?? null,
            currency: stock.currency ?? null,
            sector: stock.sector ?? null,
            industry: stock.industry ?? null,
            isin: stock.isin ?? null,
            active: stock.active,
          },
          create: {
            symbol: stock.symbol,
            exchangeCode: stock.exchange ?? null,
            name: stock.name,
            country: stock.country ?? null,
            currency: stock.currency ?? null,
            sector: stock.sector ?? null,
            industry: stock.industry ?? null,
            isin: stock.isin ?? null,
            active: stock.active,
          },
        })
      )
    );

    processed += batch.length;
    cursor = batch[batch.length - 1].id;
    created += batch.length;
    console.log(`[sync] Progress ${processed}/${total}`);
  }

  console.log(`[sync] Done. Processed: ${processed}, Created/Updated: ${created}`);
}

syncInstruments()
  .catch((error) => {
    console.error('[sync] Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
