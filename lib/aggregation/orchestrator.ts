import { prisma } from '../prisma';
import { getCachedPayload, saveCachedPayload } from './cache';
import { loadAggregatorConfig } from './config';
import { mergeMetrics } from './merge';
import { ProviderAdapter } from './provider';
import { buildProviders } from './providers';
import { MergeResult, ParsedMetrics } from './types';

type EnrichOptions = {
  force?: boolean;
};

type ParsedWithProvider = {
  provider: string;
  parsed: ParsedMetrics;
};

function resolveSymbol(
  symbol: string,
  exchangeCode: string | null | undefined,
  provider: string,
  aliases: { provider: string; symbol: string; exchangeCode: string | null }[]
): string {
  const match = aliases.find(
    (alias) =>
      alias.provider === provider &&
      alias.symbol &&
      (alias.exchangeCode ?? null) === (exchangeCode ?? null)
  );
  return match?.symbol ?? symbol;
}

async function getOrFetch(
  provider: ProviderAdapter,
  instrumentId: string,
  endpoint: 'quote' | 'overview' | 'financials',
  symbol: string,
  ttlSeconds: number
): Promise<ParsedMetrics | null> {
  const cached = await getCachedPayload(instrumentId, provider.name, endpoint);
  if (cached) {
    if (endpoint === 'quote' && provider.parseQuote) return provider.parseQuote(cached.payload);
    if (endpoint === 'overview' && provider.parseOverview)
      return provider.parseOverview(cached.payload);
    if (endpoint === 'financials' && provider.parseFinancials)
      return provider.parseFinancials(cached.payload);
  }

  let response = null;
  if (endpoint === 'quote' && provider.fetchQuote) {
    response = await provider.fetchQuote(symbol);
  } else if (endpoint === 'overview' && provider.fetchOverview) {
    response = await provider.fetchOverview(symbol);
  } else if (endpoint === 'financials' && provider.fetchFinancials) {
    response = await provider.fetchFinancials(symbol);
  }

  if (!response) return null;

  await saveCachedPayload(
    instrumentId,
    provider.name,
    endpoint,
    response.payload,
    response.ttlSeconds
  );

  if (endpoint === 'quote' && provider.parseQuote) return provider.parseQuote(response.payload);
  if (endpoint === 'overview' && provider.parseOverview)
    return provider.parseOverview(response.payload);
  if (endpoint === 'financials' && provider.parseFinancials)
    return provider.parseFinancials(response.payload);
  return null;
}

export async function enrichInstrument(
  instrumentId: string,
  options: EnrichOptions = {}
): Promise<MergeResult | null> {
  const config = loadAggregatorConfig();
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    include: { aliases: true },
  });

  if (!instrument) return null;

  if (!options.force) {
    const latest = await prisma.metrics.findFirst({
      where: { instrumentId },
      orderBy: { asOfDate: 'desc' },
    });
    if (latest) {
      const ageSeconds = (Date.now() - latest.asOfDate.getTime()) / 1000;
      if (ageSeconds < config.ttlSeconds.quote) {
        return {
          asOfDate: latest.asOfDate,
          metrics: {
            price: latest.price,
            open: latest.open,
            high: latest.high,
            low: latest.low,
            close: latest.close,
            volume: latest.volume,
            marketCap: latest.marketCap,
            pe: latest.pe,
            eps: latest.eps,
            dividendYield: latest.dividendYield,
            revenueTtm: latest.revenueTtm,
            netIncomeTtm: latest.netIncomeTtm,
            grossMargin: latest.grossMargin,
            operatingMargin: latest.operatingMargin,
            profitMargin: latest.profitMargin,
            dividendPerShare: latest.dividendPerShare,
            payoutRatio: latest.payoutRatio,
            revenuePerShare: latest.revenuePerShare,
            epsDiluted: latest.epsDiluted,
            sharesOutstanding: latest.sharesOutstanding,
            floatShares: latest.floatShares,
            beta: latest.beta,
            week52High: latest.week52High,
            week52Low: latest.week52Low,
            avgVolume: latest.avgVolume,
            enterpriseValue: latest.enterpriseValue,
            ebitdaTtm: latest.ebitdaTtm,
            freeCashFlowTtm: latest.freeCashFlowTtm,
            operatingCashFlowTtm: latest.operatingCashFlowTtm,
            grossProfitTtm: latest.grossProfitTtm,
            totalDebt: latest.totalDebt,
            totalCash: latest.totalCash,
            debtToEquity: latest.debtToEquity,
            currentRatio: latest.currentRatio,
            quickRatio: latest.quickRatio,
            priceToBook: latest.priceToBook,
            priceToSales: latest.priceToSales,
            pegRatio: latest.pegRatio,
            evToEbitda: latest.evToEbitda,
            evToRevenue: latest.evToRevenue,
            bookValuePerShare: latest.bookValuePerShare,
            roa: latest.roa,
            roe: latest.roe,
            roi: latest.roi,
          },
          sources: {
            price: latest.priceSource,
            open: latest.openSource,
            high: latest.highSource,
            low: latest.lowSource,
            close: latest.closeSource,
            volume: latest.volumeSource,
            marketCap: latest.marketCapSource,
            pe: latest.peSource,
            eps: latest.epsSource,
            dividendYield: latest.dividendYieldSource,
            revenueTtm: latest.revenueTtmSource,
            netIncomeTtm: latest.netIncomeTtmSource,
            grossMargin: latest.grossMarginSource,
            operatingMargin: latest.operatingMarginSource,
            profitMargin: latest.profitMarginSource,
            dividendPerShare: latest.dividendPerShareSource,
            payoutRatio: latest.payoutRatioSource,
            revenuePerShare: latest.revenuePerShareSource,
            epsDiluted: latest.epsDilutedSource,
            sharesOutstanding: latest.sharesOutstandingSource,
            floatShares: latest.floatSharesSource,
            beta: latest.betaSource,
            week52High: latest.week52HighSource,
            week52Low: latest.week52LowSource,
            avgVolume: latest.avgVolumeSource,
            enterpriseValue: latest.enterpriseValueSource,
            ebitdaTtm: latest.ebitdaTtmSource,
            freeCashFlowTtm: latest.freeCashFlowTtmSource,
            operatingCashFlowTtm: latest.operatingCashFlowTtmSource,
            grossProfitTtm: latest.grossProfitTtmSource,
            totalDebt: latest.totalDebtSource,
            totalCash: latest.totalCashSource,
            debtToEquity: latest.debtToEquitySource,
            currentRatio: latest.currentRatioSource,
            quickRatio: latest.quickRatioSource,
            priceToBook: latest.priceToBookSource,
            priceToSales: latest.priceToSalesSource,
            pegRatio: latest.pegRatioSource,
            evToEbitda: latest.evToEbitdaSource,
            evToRevenue: latest.evToRevenueSource,
            bookValuePerShare: latest.bookValuePerShareSource,
            roa: latest.roaSource,
            roe: latest.roeSource,
            roi: latest.roiSource,
          },
        };
      }
    }
  }

  const providers = buildProviders(config);
  const parsedResults: ParsedWithProvider[] = [];

  const tasks = providers.flatMap((provider) => {
    const symbol = resolveSymbol(
      instrument.symbol,
      instrument.exchangeCode,
      provider.name,
      instrument.aliases
    );

    return [
      provider.fetchQuote && provider.parseQuote
        ? getOrFetch(provider, instrument.id, 'quote', symbol, config.ttlSeconds.quote).then(
            (parsed) => (parsed ? { provider: provider.name, parsed } : null)
          )
        : Promise.resolve(null),
      provider.fetchOverview && provider.parseOverview
        ? getOrFetch(
            provider,
            instrument.id,
            'overview',
            symbol,
            config.ttlSeconds.overview
          ).then((parsed) => (parsed ? { provider: provider.name, parsed } : null))
        : Promise.resolve(null),
      provider.fetchFinancials && provider.parseFinancials
        ? getOrFetch(
            provider,
            instrument.id,
            'financials',
            symbol,
            config.ttlSeconds.financials
          ).then((parsed) => (parsed ? { provider: provider.name, parsed } : null))
        : Promise.resolve(null),
    ];
  });

  const settled = await Promise.allSettled(tasks);
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      parsedResults.push(result.value);
    }
  }

  if (parsedResults.length === 0) return null;

  const merged = mergeMetrics(
    parsedResults.map((item) => ({
      provider: item.provider,
      asOfDate: item.parsed.asOfDate,
      metrics: item.parsed.metrics,
    })),
    config.priorities
  );

  await prisma.metrics.create({
    data: {
      instrumentId,
      asOfDate: merged.asOfDate,
      price: merged.metrics.price ?? null,
      open: merged.metrics.open ?? null,
      high: merged.metrics.high ?? null,
      low: merged.metrics.low ?? null,
      close: merged.metrics.close ?? null,
      volume: merged.metrics.volume ?? null,
      marketCap: merged.metrics.marketCap ?? null,
      pe: merged.metrics.pe ?? null,
      eps: merged.metrics.eps ?? null,
      dividendYield: merged.metrics.dividendYield ?? null,
      revenueTtm: merged.metrics.revenueTtm ?? null,
      netIncomeTtm: merged.metrics.netIncomeTtm ?? null,
      grossMargin: merged.metrics.grossMargin ?? null,
      operatingMargin: merged.metrics.operatingMargin ?? null,
      profitMargin: merged.metrics.profitMargin ?? null,
      dividendPerShare: merged.metrics.dividendPerShare ?? null,
      payoutRatio: merged.metrics.payoutRatio ?? null,
      revenuePerShare: merged.metrics.revenuePerShare ?? null,
      epsDiluted: merged.metrics.epsDiluted ?? null,
      sharesOutstanding: merged.metrics.sharesOutstanding ?? null,
      floatShares: merged.metrics.floatShares ?? null,
      beta: merged.metrics.beta ?? null,
      week52High: merged.metrics.week52High ?? null,
      week52Low: merged.metrics.week52Low ?? null,
      avgVolume: merged.metrics.avgVolume ?? null,
      enterpriseValue: merged.metrics.enterpriseValue ?? null,
      ebitdaTtm: merged.metrics.ebitdaTtm ?? null,
      freeCashFlowTtm: merged.metrics.freeCashFlowTtm ?? null,
      operatingCashFlowTtm: merged.metrics.operatingCashFlowTtm ?? null,
      grossProfitTtm: merged.metrics.grossProfitTtm ?? null,
      totalDebt: merged.metrics.totalDebt ?? null,
      totalCash: merged.metrics.totalCash ?? null,
      debtToEquity: merged.metrics.debtToEquity ?? null,
      currentRatio: merged.metrics.currentRatio ?? null,
      quickRatio: merged.metrics.quickRatio ?? null,
      priceToBook: merged.metrics.priceToBook ?? null,
      priceToSales: merged.metrics.priceToSales ?? null,
      pegRatio: merged.metrics.pegRatio ?? null,
      evToEbitda: merged.metrics.evToEbitda ?? null,
      evToRevenue: merged.metrics.evToRevenue ?? null,
      bookValuePerShare: merged.metrics.bookValuePerShare ?? null,
      roa: merged.metrics.roa ?? null,
      roe: merged.metrics.roe ?? null,
      roi: merged.metrics.roi ?? null,
      priceSource: merged.sources.price ?? null,
      openSource: merged.sources.open ?? null,
      highSource: merged.sources.high ?? null,
      lowSource: merged.sources.low ?? null,
      closeSource: merged.sources.close ?? null,
      volumeSource: merged.sources.volume ?? null,
      marketCapSource: merged.sources.marketCap ?? null,
      peSource: merged.sources.pe ?? null,
      epsSource: merged.sources.eps ?? null,
      dividendYieldSource: merged.sources.dividendYield ?? null,
      revenueTtmSource: merged.sources.revenueTtm ?? null,
      netIncomeTtmSource: merged.sources.netIncomeTtm ?? null,
      grossMarginSource: merged.sources.grossMargin ?? null,
      operatingMarginSource: merged.sources.operatingMargin ?? null,
      profitMarginSource: merged.sources.profitMargin ?? null,
      dividendPerShareSource: merged.sources.dividendPerShare ?? null,
      payoutRatioSource: merged.sources.payoutRatio ?? null,
      revenuePerShareSource: merged.sources.revenuePerShare ?? null,
      epsDilutedSource: merged.sources.epsDiluted ?? null,
      sharesOutstandingSource: merged.sources.sharesOutstanding ?? null,
      floatSharesSource: merged.sources.floatShares ?? null,
      betaSource: merged.sources.beta ?? null,
      week52HighSource: merged.sources.week52High ?? null,
      week52LowSource: merged.sources.week52Low ?? null,
      avgVolumeSource: merged.sources.avgVolume ?? null,
      enterpriseValueSource: merged.sources.enterpriseValue ?? null,
      ebitdaTtmSource: merged.sources.ebitdaTtm ?? null,
      freeCashFlowTtmSource: merged.sources.freeCashFlowTtm ?? null,
      operatingCashFlowTtmSource: merged.sources.operatingCashFlowTtm ?? null,
      grossProfitTtmSource: merged.sources.grossProfitTtm ?? null,
      totalDebtSource: merged.sources.totalDebt ?? null,
      totalCashSource: merged.sources.totalCash ?? null,
      debtToEquitySource: merged.sources.debtToEquity ?? null,
      currentRatioSource: merged.sources.currentRatio ?? null,
      quickRatioSource: merged.sources.quickRatio ?? null,
      priceToBookSource: merged.sources.priceToBook ?? null,
      priceToSalesSource: merged.sources.priceToSales ?? null,
      pegRatioSource: merged.sources.pegRatio ?? null,
      evToEbitdaSource: merged.sources.evToEbitda ?? null,
      evToRevenueSource: merged.sources.evToRevenue ?? null,
      bookValuePerShareSource: merged.sources.bookValuePerShare ?? null,
      roaSource: merged.sources.roa ?? null,
      roeSource: merged.sources.roe ?? null,
      roiSource: merged.sources.roi ?? null,
    },
  });

  return merged;
}

export async function refreshBatch(instrumentIds: string[], jobType = 'manual') {
  const job = await prisma.job.create({
    data: {
      type: jobType,
      status: 'running',
      startedAt: new Date(),
    },
  });

  for (const instrumentId of instrumentIds) {
    const run = await prisma.jobRun.create({
      data: {
        jobId: job.id,
        instrumentId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      await enrichInstrument(instrumentId, { force: true });
      await prisma.jobRun.update({
        where: { id: run.id },
        data: { status: 'done', finishedAt: new Date() },
      });
    } catch (error) {
      await prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          finishedAt: new Date(),
        },
      });
    }
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'done', finishedAt: new Date() },
  });

  return job.id;
}
