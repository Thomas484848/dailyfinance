import { FMPProvider } from './fmp';
import { AlphaVantageProvider } from './alpha-vantage';
import { StockProvider, StockData } from './types';

export type { StockData, StockProvider };

export function createFMPProvider(): FMPProvider | null {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('FMP_API_KEY not configured');
    return null;
  }
  return new FMPProvider(apiKey);
}

export function createAlphaVantageProvider(): AlphaVantageProvider | null {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('ALPHA_VANTAGE_API_KEY not configured');
    return null;
  }
  return new AlphaVantageProvider(apiKey);
}

/**
 * Agregateur de providers avec fallback
 */
export class StockDataAggregator {
  private providers: StockProvider[] = [];

  constructor() {
    const fmp = createFMPProvider();
    const av = createAlphaVantageProvider();

    if (fmp) this.providers.push(fmp);
    if (av) this.providers.push(av);
  }

  async fetchStockList(exchange?: string): Promise<StockData[]> {
    for (const provider of this.providers) {
      const stocks = await provider.fetchStockList(exchange);
      if (stocks.length > 0) {
        console.log(`Fetched ${stocks.length} stocks from ${provider.name}`);
        return stocks;
      }
    }
    return [];
  }

  async fetchQuote(symbol: string): Promise<StockData | null> {
    for (const provider of this.providers) {
      const quote = await provider.fetchQuote(symbol);
      if (quote) {
        return quote;
      }
    }
    return null;
  }

  async fetchProfile(symbol: string): Promise<StockData | null> {
    for (const provider of this.providers) {
      const profile = await provider.fetchProfile(symbol);
      if (profile) {
        return profile;
      }
    }
    return null;
  }
}

