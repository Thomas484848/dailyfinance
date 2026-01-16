import { MergeResult, NumericMetrics, ProviderPriority } from './types';

const METRIC_KEYS: (keyof NumericMetrics)[] = [
  'price',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'marketCap',
  'pe',
  'eps',
  'dividendYield',
  'dividendPerShare',
  'payoutRatio',
  'revenuePerShare',
  'epsDiluted',
  'sharesOutstanding',
  'floatShares',
  'beta',
  'week52High',
  'week52Low',
  'avgVolume',
  'enterpriseValue',
  'ebitdaTtm',
  'freeCashFlowTtm',
  'operatingCashFlowTtm',
  'grossProfitTtm',
  'totalDebt',
  'totalCash',
  'debtToEquity',
  'currentRatio',
  'quickRatio',
  'priceToBook',
  'priceToSales',
  'pegRatio',
  'evToEbitda',
  'evToRevenue',
  'bookValuePerShare',
  'roa',
  'roe',
  'roi',
  'revenueTtm',
  'netIncomeTtm',
  'grossMargin',
  'operatingMargin',
  'profitMargin',
];

type Candidate = {
  provider: string;
  asOfDate: Date;
  value: number;
};

export function mergeMetrics(
  inputs: { provider: string; asOfDate: Date; metrics: NumericMetrics }[],
  priorities: ProviderPriority
): MergeResult {
  const metrics: NumericMetrics = {};
  const sources: Record<string, string | null> = {};
  let latestDate = new Date(0);

  for (const item of inputs) {
    if (item.asOfDate > latestDate) {
      latestDate = item.asOfDate;
    }
  }

  for (const key of METRIC_KEYS) {
    const candidates: Candidate[] = [];
    for (const input of inputs) {
      const value = input.metrics[key];
      if (value === null || value === undefined || Number.isNaN(value)) continue;
      candidates.push({ provider: input.provider, asOfDate: input.asOfDate, value });
    }

    if (candidates.length === 0) {
      metrics[key] = null;
      sources[key] = null;
      continue;
    }

    const priorityList = priorities[key] ?? [];
    candidates.sort((a, b) => {
      const aPriority = priorityList.indexOf(a.provider);
      const bPriority = priorityList.indexOf(b.provider);
      const aRank = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
      const bRank = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;
      if (aRank !== bRank) return aRank - bRank;
      return b.asOfDate.getTime() - a.asOfDate.getTime();
    });

    metrics[key] = candidates[0].value;
    sources[key] = candidates[0].provider;
  }

  return {
    metrics,
    sources,
    asOfDate: latestDate.getTime() === 0 ? new Date() : latestDate,
  };
}
