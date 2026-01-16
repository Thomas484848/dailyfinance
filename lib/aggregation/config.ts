import { ProviderPriority } from './types';

export type ProviderQuota = {
  requestsPerMinute?: number | null;
  requestsPerDay?: number | null;
  maxConcurrent?: number | null;
};

export type AggregatorConfig = {
  ttlSeconds: {
    quote: number;
    overview: number;
    financials: number;
  };
  priorities: ProviderPriority;
  quotas: Record<string, ProviderQuota>;
};

export function loadAggregatorConfig(): AggregatorConfig {
  const quoteTtl = Number(process.env.TTL_QUOTE_SECONDS ?? 900);
  const overviewTtl = Number(process.env.TTL_OVERVIEW_SECONDS ?? 604800);
  const financialsTtl = Number(process.env.TTL_FINANCIALS_SECONDS ?? 2592000);

  return {
    ttlSeconds: {
      quote: Number.isFinite(quoteTtl) ? quoteTtl : 900,
      overview: Number.isFinite(overviewTtl) ? overviewTtl : 604800,
      financials: Number.isFinite(financialsTtl) ? financialsTtl : 2592000,
    },
    priorities: {
      price: (process.env.MERGE_PRIORITY_PRICE ?? 'alphavantage,fmp,finnhub')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      marketCap: (process.env.MERGE_PRIORITY_MARKETCAP ?? 'fmp,alphavantage,finnhub')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      pe: (process.env.MERGE_PRIORITY_PE ?? 'fmp,alphavantage,finnhub')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      eps: (process.env.MERGE_PRIORITY_EPS ?? 'fmp,alphavantage,finnhub')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      dividendYield: (
        process.env.MERGE_PRIORITY_DIVIDEND_YIELD ?? 'fmp,finnhub,alphavantage'
      )
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      revenueTtm: (process.env.MERGE_PRIORITY_REVENUE_TTM ?? 'finnhub,fmp')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      netIncomeTtm: (process.env.MERGE_PRIORITY_NET_INCOME_TTM ?? 'finnhub,fmp')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    },
    quotas: {
      fmp: {
        requestsPerMinute: Number(process.env.FMP_RPM ?? 200),
        requestsPerDay: Number(process.env.FMP_RPD ?? 250),
        maxConcurrent: Number(process.env.FMP_MAX_CONCURRENT ?? 2),
      },
      alphavantage: {
        requestsPerMinute: Number(process.env.AV_RPM ?? 5),
        requestsPerDay: Number(process.env.AV_RPD ?? 500),
        maxConcurrent: Number(process.env.AV_MAX_CONCURRENT ?? 1),
      },
      finnhub: {
        requestsPerMinute: Number(process.env.FINNHUB_RPM ?? 60),
        requestsPerDay: Number(process.env.FINNHUB_RPD ?? 2000),
        maxConcurrent: Number(process.env.FINNHUB_MAX_CONCURRENT ?? 2),
      },
      twelvedata: {
        requestsPerMinute: Number(process.env.TWELVEDATA_RPM ?? 8),
        requestsPerDay: Number(process.env.TWELVEDATA_RPD ?? 800),
        maxConcurrent: Number(process.env.TWELVEDATA_MAX_CONCURRENT ?? 1),
      },
    },
  };
}
