import type { RateLimiter } from '../rate-limiter';

export interface StockData {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  isin?: string;
  marketCap?: number;
  price?: number;
  change?: number;
  changePercent?: number;
  pe?: number;
}

export interface StockProvider {
  name: string;
  fetchStockList(exchange?: string): Promise<StockData[]>;
  fetchQuote(symbol: string): Promise<StockData | null>;
  fetchProfile(symbol: string): Promise<StockData | null>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit?: number;
  rateLimiter?: RateLimiter;
  maxRetries?: number;
}

