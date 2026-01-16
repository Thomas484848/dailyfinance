import { ProviderLimiter } from './limiter';
import { ParsedMetrics, ProviderResponse } from './types';

export type ProviderEndpoint = 'quote' | 'overview' | 'financials';

export type ProviderAdapter = {
  name: string;
  limiter: ProviderLimiter;
  fetchQuote?: (symbol: string) => Promise<ProviderResponse | null>;
  fetchOverview?: (symbol: string) => Promise<ProviderResponse | null>;
  fetchFinancials?: (symbol: string) => Promise<ProviderResponse | null>;
  parseQuote?: (payload: unknown) => ParsedMetrics | null;
  parseOverview?: (payload: unknown) => ParsedMetrics | null;
  parseFinancials?: (payload: unknown) => ParsedMetrics | null;
};
