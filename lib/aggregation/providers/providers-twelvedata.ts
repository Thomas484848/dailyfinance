import { AggregatorConfig } from '../config';
import { ProviderAdapter } from '../provider';
import { ProviderResponse } from '../types';
import { buildLimiter } from './limiter';

const BASE_URL = 'https://api.twelvedata.com';

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
      throw new Error(`TwelveData error: ${response.status} ${response.statusText} - ${body}`);
    }
    return response.json();
  });
}

export function buildTwelveDataAdapter(config: AggregatorConfig): ProviderAdapter | null {
  const apiKey = process.env.TWELVEDATA_API_KEY?.trim();
  if (!apiKey) return null;

  const limiter = buildLimiter(config, 'twelvedata');
  const ttlQuote = config.ttlSeconds.quote;

  return {
    name: 'twelvedata',
    limiter,
    fetchQuote: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(
        symbol
      )}&apikey=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlQuote };
    },
    parseQuote: (payload) => {
      const data = payload as any;
      if (!data || data.status === 'error') return null;
      return {
        asOfDate: new Date(),
        metrics: {
          price: Number(data.close) || null,
          open: Number(data.open) || null,
          high: Number(data.high) || null,
          low: Number(data.low) || null,
          close: Number(data.close) || null,
          volume: Number(data.volume) || null,
        },
      };
    },
  };
}
