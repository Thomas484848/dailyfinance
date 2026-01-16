import { prisma } from '../lib/prisma';
import { loadEnv } from './load-env';
import { FMPProvider } from '../lib/providers/fmp';
import { AlphaVantageProvider } from '../lib/providers/alpha-vantage';
import { computeValuation } from '../lib/valuation';
import { chunk } from '../lib/utils';
import { RateLimiter } from '../lib/rate-limiter';

const BATCH_SIZE = 100;
const DEFAULT_FMP_RPM = 200;
const AV_MIN_INTERVAL_MS = 12000;

function isSameDay(dateA: Date, dateB: Date): boolean {
  return dateA.toISOString().slice(0, 10) === dateB.toISOString().slice(0, 10);
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

async function upsertValuation(stockId: string, pe: number | null, sector: string | null) {
  const valuation = computeValuation(pe, sector);
  const existing = await prisma.valuation.findFirst({ where: { stockId } });

  if (existing) {
    if (
      existing.peCurrent === valuation.peCurrent &&
      existing.peAvg === valuation.peAvg &&
      existing.status === valuation.status
    ) {
      return false;
    }

    await prisma.valuation.update({
      where: { id: existing.id },
      data: {
        peCurrent: valuation.peCurrent,
        peAvg: valuation.peAvg,
        status: valuation.status,
      },
    });
    return true;
  }

  await prisma.valuation.create({
    data: {
      stockId,
      peCurrent: valuation.peCurrent,
      peAvg: valuation.peAvg,
      status: valuation.status,
    },
  });
  return true;
}

async function refreshQuotes() {
  loadEnv();
  console.log('[refresh] Starting quote refresh');

  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) {
    console.error('[refresh] FMP_API_KEY is not set');
    process.exit(1);
  }

  const envMinInterval = process.env.FMP_MIN_INTERVAL_MS
    ? Number(process.env.FMP_MIN_INTERVAL_MS)
    : null;
  const envRpm = process.env.FMP_RPM ? Number(process.env.FMP_RPM) : null;
  const minIntervalMs = Number.isFinite(envMinInterval)
    ? Math.max(0, envMinInterval!)
    : Math.ceil(60000 / (Number.isFinite(envRpm) ? envRpm! : DEFAULT_FMP_RPM));
  const rateLimiter = new RateLimiter({ minIntervalMs });
  const fmp = new FMPProvider(apiKey, { rateLimiter, maxRetries: 5 });
  const avApiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  const avLimiter = new RateLimiter({ minIntervalMs: AV_MIN_INTERVAL_MS });
  const alphaVantage = avApiKey
    ? new AlphaVantageProvider(avApiKey, { rateLimiter: avLimiter, maxRetries: 3 })
    : null;

  const stocks = await prisma.stock.findMany({
    where: { active: true },
    include: {
      quotes: { orderBy: { timestamp: 'desc' }, take: 1 },
      valuations: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  });

  const today = new Date();
  let pending = stocks.filter((stock) => {
    const latestQuote = stock.quotes[0];
    if (!latestQuote) return true;
    return !isSameDay(new Date(latestQuote.timestamp), today);
  });

  const allowedList = await fmp.fetchStockList();
  const allowedSymbols = new Set(
    allowedList
      .map((item) => normalizeSymbol(item.symbol ?? ''))
      .filter((symbol) => symbol.length > 0)
  );
  let skippedPlan = 0;
  if (allowedSymbols.size > 0) {
    const before = pending.length;
    pending = pending.filter((stock) => allowedSymbols.has(normalizeSymbol(stock.symbol)));
    skippedPlan = before - pending.length;
    console.log(
      `[refresh] Allowed symbols from FMP: ${allowedSymbols.size}. Pending after filter: ${pending.length}/${before}`
    );
  } else {
    console.warn('[refresh] FMP symbol list unavailable. Proceeding without plan filter.');
  }

  pending.sort((a, b) => {
    const aHasQuote = !!a.quotes[0];
    const bHasQuote = !!b.quotes[0];
    if (aHasQuote !== bHasQuote) return aHasQuote ? 1 : -1;
    const aCap = a.marketCap ?? -1;
    const bCap = b.marketCap ?? -1;
    if (aCap !== bCap) return bCap - aCap;
    return a.name.localeCompare(b.name);
  });

  console.log(
    `[refresh] Total stocks: ${stocks.length}, pending updates: ${pending.length}`
  );
  if (pending.length === 0) {
    console.log('[refresh] Nothing to refresh (already updated today)');
    await prisma.$disconnect();
    return;
  }

  const batches = chunk(pending, BATCH_SIZE);
  let updatedQuotes = 0;
  let updatedMarketCaps = 0;
  let updatedValuations = 0;
  let skipped = 0;
  let errors = 0;
  let useBulkQuotes = true;

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    console.log(`[refresh] Batch ${i + 1}/${batches.length} (${batch.length} symbols)`);

    const symbols = batch.map((stock) => normalizeSymbol(stock.symbol));
    let quotes: Awaited<ReturnType<typeof fmp.fetchBulkQuotes>> = [];
    let bulkUnavailable = true;
    if (useBulkQuotes) {
      quotes = await fmp.fetchBulkQuotes(symbols);
      bulkUnavailable = quotes.length === 0;
      if (bulkUnavailable) {
        useBulkQuotes = false;
        console.warn(
          '[refresh] FMP bulk quote unavailable for this plan. Falling back to per-symbol requests.'
        );
      }
    }
    const quoteMap = new Map(
      quotes
        .filter((quote) => !!quote.symbol)
        .map((quote) => [normalizeSymbol(quote.symbol!), quote])
    );
    const useAlphaVantageFallback = quotes.length === 0 && alphaVantage;

    for (const stock of batch) {
      try {
        let quote = quoteMap.get(normalizeSymbol(stock.symbol));
        if (!quote && bulkUnavailable) {
          quote = await fmp.fetchQuote(stock.symbol);
        }
        if ((!quote || quote.price === undefined || quote.price === null) && useAlphaVantageFallback) {
          quote = await alphaVantage.fetchQuote(stock.symbol);
        }

        if (!quote || quote.price === undefined || quote.price === null) {
          skipped += 1;
          continue;
        }

        const latestQuote = stock.quotes[0];
        const nextChange = quote.change ?? null;
        const nextChangePercent = quote.changePercent ?? null;
        const quoteChanged =
          !latestQuote ||
          latestQuote.price !== quote.price ||
          latestQuote.change !== nextChange ||
          latestQuote.changePercent !== nextChangePercent;

        if (quoteChanged) {
          await prisma.quote.create({
            data: {
              stockId: stock.id,
              price: quote.price,
              change: nextChange,
              changePercent: nextChangePercent,
            },
          });
          updatedQuotes += 1;
        } else {
          skipped += 1;
        }

        if (
          quote.marketCap !== undefined &&
          quote.marketCap !== null &&
          stock.marketCap !== quote.marketCap
        ) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: { marketCap: quote.marketCap },
          });
          updatedMarketCaps += 1;
        }

        if (quote.pe !== undefined) {
          const valuationUpdated = await upsertValuation(
            stock.id,
            quote.pe ?? null,
            stock.sector ?? null
          );
          if (valuationUpdated) {
            updatedValuations += 1;
          }
        }
      } catch (error) {
        errors += 1;
        console.error(`[refresh] Error updating ${stock.symbol}:`, error);
      }
    }

    const stats = rateLimiter.getStats();
    console.log(
      `[refresh] Progress ${Math.min((i + 1) * BATCH_SIZE, pending.length)}/${
        pending.length
      } | requests=${stats.requestCount} rpm=${stats.rpm} | quotes=${updatedQuotes} errors=${errors}`
    );
  }

  console.log('[refresh] Refresh completed');
  console.log(`[refresh] Quotes updated: ${updatedQuotes}`);
  console.log(`[refresh] Market caps updated: ${updatedMarketCaps}`);
  console.log(`[refresh] Valuations updated: ${updatedValuations}`);
  console.log(`[refresh] Skipped: ${skipped}`);
  console.log(`[refresh] Skipped (plan): ${skippedPlan}`);
  console.log(`[refresh] Errors: ${errors}`);

  await prisma.$disconnect();
}

refreshQuotes().catch((error) => {
  console.error('[refresh] Fatal error:', error);
  process.exit(1);
});
