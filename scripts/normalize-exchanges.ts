import { prisma } from '../lib/prisma';
import { loadEnv } from './load-env';

const EXCHANGE_PRIORITY: { [key: string]: number } = {
  US: 80,
  NYSE: 100,
  NASDAQ: 95,
  AMEX: 90,
  LSE: 85,
  PA: 80,
  F: 75,
  T: 70,
  HK: 65,
  TO: 60,
  SW: 55,
  MI: 50,
  BE: 45,
  AU: 40,
  SS: 35,
  SZ: 30,
};

function getExchangePriority(exchange: string | null): number {
  if (!exchange) return 0;
  return EXCHANGE_PRIORITY[exchange.toUpperCase()] || 10;
}

function normalizeCompanyName(name: string): string {
  let normalized = name.toUpperCase();

  const suffixesToRemove = [
    /\s+INC\.?$/i,
    /\s+INCORPORATED$/i,
    /\s+CORP\.?$/i,
    /\s+CORPORATION$/i,
    /\s+LTD\.?$/i,
    /\s+LIMITED$/i,
    /\s+PLC\.?$/i,
    /\s+SA\.?$/i,
    /\s+AG\.?$/i,
    /\s+NV\.?$/i,
    /\s+SE\.?$/i,
    /\s+CO\.?$/i,
    /\s+COMPANY$/i,
    /\s+GROUP$/i,
    /\s+HOLDING(S)?$/i,
    /\s+COMMON\s+STOCK$/i,
    /\s+ORDINARY\s+SHARES?$/i,
    /\s+CLASS\s+[A-Z]$/i,
    /\s+ADR$/i,
    /\s+ADS$/i,
    /\s+CDR$/i,
    /\s+GDR$/i,
  ];

  for (const pattern of suffixesToRemove) {
    normalized = normalized.replace(pattern, '');
  }

  normalized = normalized
    .replace(/[.,\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

async function normalizeExchanges() {
  loadEnv();
  console.log('[normalize] Starting exchange normalization');

  const stocks = await prisma.stock.findMany({
    where: { active: true },
    select: {
      id: true,
      symbol: true,
      name: true,
      exchange: true,
      isin: true,
      marketCap: true,
    },
  });

  const groups = new Map<string, typeof stocks>();

  for (const stock of stocks) {
    const key = `${stock.symbol}|${normalizeCompanyName(stock.name)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(stock);
    groups.set(key, bucket);
  }

  const idsToDeactivate: string[] = [];

  for (const bucket of groups.values()) {
    if (bucket.length <= 1) continue;

    const sorted = bucket.slice().sort((a, b) => {
      const aPriority = getExchangePriority(a.exchange);
      const bPriority = getExchangePriority(b.exchange);
      if (aPriority !== bPriority) return bPriority - aPriority;

      const aHasIsin = Boolean(a.isin);
      const bHasIsin = Boolean(b.isin);
      if (aHasIsin !== bHasIsin) return aHasIsin ? -1 : 1;

      const aCap = a.marketCap ?? -1;
      const bCap = b.marketCap ?? -1;
      if (aCap !== bCap) return bCap - aCap;

      return (a.exchange ?? '').localeCompare(b.exchange ?? '');
    });

    const keep = sorted[0];
    for (const stock of sorted.slice(1)) {
      if (stock.id !== keep.id) {
        idsToDeactivate.push(stock.id);
      }
    }
  }

  const uniqueIds = Array.from(new Set(idsToDeactivate));
  const batchSize = 200;
  let totalUpdated = 0;

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const result = await prisma.stock.updateMany({
      where: { id: { in: batch } },
      data: { active: false },
    });
    totalUpdated += result.count;
  }

  for (const id of uniqueIds) {
    const stock = stocks.find((item) => item.id === id);
    if (!stock) continue;
    await prisma.instrument.updateMany({
      where: { symbol: stock.symbol, exchangeCode: stock.exchange ?? null },
      data: { active: false },
    });
  }

  console.log(
    `[normalize] Deactivated ${totalUpdated} duplicate listings (symbol + name group).`
  );
  console.log('[normalize] Done.');

  await prisma.$disconnect();
}

normalizeExchanges().catch((error) => {
  console.error('[normalize] Fatal error:', error);
  process.exit(1);
});
