import { StockProvider, StockData, ProviderConfig } from './types';

const AV_BASE_URL = 'https://www.alphavantage.co/query';

export class AlphaVantageProvider implements StockProvider {
  name = 'Alpha Vantage';
  private config: ProviderConfig;

  constructor(apiKey: string, options?: Partial<ProviderConfig>) {
    this.config = {
      apiKey,
      baseUrl: AV_BASE_URL,
      rateLimit: 5, // requests per minute (free tier)
      ...options,
    };
  }

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const searchParams = new URLSearchParams({
      ...params,
      apikey: this.config.apiKey,
    });

    const url = `${this.config.baseUrl}?${searchParams}`;
    return this.fetchWithRetry<T>(url);
  }

  private async fetchWithRetry<T>(url: string): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 5;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (this.config.rateLimiter) {
        await this.config.rateLimiter.wait();
      }

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'dailyfinance/1.0',
            Accept: 'application/json',
          },
        });
        if (response.ok) {
          return response.json();
        }

        if (this.isRetriableStatus(response.status) && attempt < maxRetries) {
          const delay = this.getRetryDelayMs(response, attempt);
          console.warn(
            `Alpha Vantage retry ${attempt + 1}/${maxRetries} (${response.status}) in ${delay}ms`
          );
          await this.sleep(delay);
          continue;
        }

        throw new Error(`Alpha Vantage API error: ${response.status}`);
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = this.getRetryDelayMs(undefined, attempt);
          console.warn(
            `Alpha Vantage retry ${attempt + 1}/${maxRetries} (network) in ${delay}ms`
          );
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Alpha Vantage API error: retries exhausted');
  }

  private isRetriableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private getRetryDelayMs(response: Response | undefined, attempt: number): number {
    const retryAfter = response?.headers.get('retry-after');
    if (retryAfter) {
      const asNumber = Number(retryAfter);
      if (!Number.isNaN(asNumber)) {
        return asNumber * 1000;
      }
      const asDate = Date.parse(retryAfter);
      if (!Number.isNaN(asDate)) {
        return Math.max(asDate - Date.now(), 0);
      }
    }

    const base = 1000;
    const max = 20000;
    const jitter = Math.floor(Math.random() * 200);
    return Math.min(max, base * 2 ** attempt) + jitter;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchStockList(): Promise<StockData[]> {
    // Alpha Vantage ne fournit pas de liste complete d'actions
    // On l'utilise principalement comme fallback pour des recherches
    console.warn('Alpha Vantage does not provide stock listings');
    return [];
  }

  async fetchQuote(symbol: string): Promise<StockData | null> {
    try {
      const data = await this.fetch<any>({
        function: 'GLOBAL_QUOTE',
        symbol,
      });

      const quote = data['Global Quote'];
      if (!quote || !quote['01. symbol']) return null;

      const toNumber = (value: string | undefined): number | undefined => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const changePercentRaw = quote['10. change percent'];
      const changePercentValue = changePercentRaw
        ? toNumber(changePercentRaw.replace('%', ''))
        : undefined;

      return {
        symbol: quote['01. symbol'],
        name: symbol, // AV ne retourne pas le nom dans GLOBAL_QUOTE
        price: toNumber(quote['05. price']),
        change: toNumber(quote['09. change']),
        changePercent: changePercentValue,
      };
    } catch (error) {
      console.error(`Alpha Vantage fetchQuote error for ${symbol}:`, error);
      return null;
    }
  }

  async fetchProfile(symbol: string): Promise<StockData | null> {
    try {
      const data = await this.fetch<any>({
        function: 'OVERVIEW',
        symbol,
      });

      if (!data || !data.Symbol) return null;

      const toNumber = (value: string | undefined): number | undefined => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      return {
        symbol: data.Symbol,
        name: data.Name,
        exchange: data.Exchange,
        currency: data.Currency,
        country: data.Country,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: toNumber(data.MarketCapitalization),
        pe: toNumber(data.PERatio),
      };
    } catch (error) {
      console.error(`Alpha Vantage fetchProfile error for ${symbol}:`, error);
      return null;
    }
  }

  async searchSymbol(keywords: string): Promise<StockData[]> {
    try {
      const data = await this.fetch<any>({
        function: 'SYMBOL_SEARCH',
        keywords,
      });

      const matches = data.bestMatches || [];

      return matches.map((m: any) => ({
        symbol: m['1. symbol'],
        name: m['2. name'],
        exchange: m['4. region'],
        currency: m['8. currency'],
      }));
    } catch (error) {
      console.error('Alpha Vantage searchSymbol error:', error);
      return [];
    }
  }
}

