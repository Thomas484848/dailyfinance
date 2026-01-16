import { AggregatorConfig } from '../config';
import { ProviderAdapter } from '../provider';
import { ProviderResponse } from '../types';
import { buildLimiter } from './limiter';

const BASE_URL = 'https://financialmodelingprep.com/stable';

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
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${body}`);
    }
    return response.json();
  });
}

export function buildFmpAdapter(config: AggregatorConfig): ProviderAdapter | null {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) return null;

  const limiter = buildLimiter(config, 'fmp');
  const ttlQuote = config.ttlSeconds.quote;
  const ttlOverview = config.ttlSeconds.overview;

  return {
    name: 'fmp',
    limiter,
    fetchQuote: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(
        apiKey
      )}`;
      try {
        const payload = await fetchJson(limiter, url);
        return { payload, fetchedAt: new Date(), ttlSeconds: ttlQuote };
      } catch (error) {
        if (error instanceof Error && error.message.includes('402')) return null;
        throw error;
      }
    },
    fetchOverview: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(
        apiKey
      )}`;
      try {
        const payload = await fetchJson(limiter, url);
        return { payload, fetchedAt: new Date(), ttlSeconds: ttlOverview };
      } catch (error) {
        if (error instanceof Error && error.message.includes('402')) return null;
        throw error;
      }
    },
    parseQuote: (payload) => {
      if (!Array.isArray(payload) || payload.length === 0) return null;
      const item = payload[0] ?? {};
      return {
        asOfDate: new Date(),
        metrics: {
          price: item.price ?? null,
          volume: item.volume ?? null,
          marketCap: item.marketCap ?? item.mktCap ?? null,
          pe: item.pe ?? null,
        },
      };
    },
    parseOverview: (payload) => {
      if (!Array.isArray(payload) || payload.length === 0) return null;
      const item = payload[0] ?? {};
      let week52Low: number | null = null;
      let week52High: number | null = null;
      if (typeof item.range === 'string' && item.range.includes('-')) {
        const [low, high] = item.range.split('-').map((value: string) => Number(value.trim()));
        week52Low = Number.isFinite(low) ? low : null;
        week52High = Number.isFinite(high) ? high : null;
      }

      return {
        asOfDate: new Date(),
        metrics: {
          marketCap: item.mktCap ?? item.marketCap ?? null,
          pe: item.pe ?? null,
          eps: item.eps ?? null,
          dividendPerShare: item.lastDiv ?? null,
          beta: item.beta ?? null,
          avgVolume: item.volAvg ?? null,
          sharesOutstanding: item.sharesOutstanding ?? null,
          week52Low,
          week52High,
          revenueTtm: item.revenue ?? null,
          netIncomeTtm: item.netIncome ?? null,
          grossMargin: item.grossProfitMargin ?? null,
          operatingMargin: item.operatingProfitMargin ?? null,
          profitMargin: item.netProfitMargin ?? null,
        },
      };
    },
  };
}
