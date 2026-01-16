import { AggregatorConfig } from '../config';
import { ProviderAdapter } from '../provider';
import { ProviderResponse } from '../types';
import { buildLimiter } from './limiter';

const BASE_URL = 'https://finnhub.io/api/v1';

async function fetchJson(
  limiter: ReturnType<typeof buildLimiter>,
  url: string
): Promise<unknown> {
  return limiter.schedule(async () => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'dailyfinance/1.0',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Finnhub error: ${response.status} ${response.statusText} - ${body}`);
    }
    return response.json();
  });
}

export function buildFinnhubAdapter(config: AggregatorConfig): ProviderAdapter | null {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) return null;

  const limiter = buildLimiter(config, 'finnhub');
  const ttlQuote = config.ttlSeconds.quote;
  const ttlOverview = config.ttlSeconds.overview;
  const ttlFinancials = config.ttlSeconds.financials;

  return {
    name: 'finnhub',
    limiter,
    fetchQuote: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(
        symbol
      )}&token=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlQuote };
    },
    fetchOverview: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
        symbol
      )}&token=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlOverview };
    },
    fetchFinancials: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/stock/metric?symbol=${encodeURIComponent(
        symbol
      )}&metric=all&token=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlFinancials };
    },
    parseQuote: (payload) => {
      const data = payload as any;
      if (!data || data.c === undefined) return null;
      return {
        asOfDate: new Date(),
        metrics: {
          price: data.c ?? null,
          open: data.o ?? null,
          high: data.h ?? null,
          low: data.l ?? null,
          close: data.pc ?? null,
        },
      };
    },
    parseOverview: (payload) => {
      const data = payload as any;
      if (!data || !data.ticker) return null;
      return {
        asOfDate: new Date(),
        metrics: {
          marketCap:
            data.marketCapitalization === null || data.marketCapitalization === undefined
              ? null
              : data.marketCapitalization * 1000000,
        },
      };
    },
    parseFinancials: (payload) => {
      const data = payload as any;
      const metric = data?.metric;
      if (!metric || data?.error) return null;
      const marketCap =
        metric.marketCapitalization === null || metric.marketCapitalization === undefined
          ? null
          : metric.marketCapitalization * 1000000;
      return {
        asOfDate: new Date(),
        metrics: {
          pe: metric.peTTM ?? null,
          eps: metric.epsTTM ?? null,
          dividendYield: metric.dividendYieldIndicatedAnnual ?? null,
          marketCap,
          beta: metric.beta ?? null,
          sharesOutstanding: metric.sharesOutstanding ?? null,
          week52High: metric['52WeekHigh'] ?? null,
          week52Low: metric['52WeekLow'] ?? null,
        },
      };
    },
  };
}
