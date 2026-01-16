import { StockProvider, StockData, ProviderConfig } from './types';

/**
 * FMP "Legacy" (/api/v3) endpoints now return 403 for non-legacy subscribers.
 * We must use the Stable API base: https://financialmodelingprep.com/stable/...
 *
 * Docs (Stable):
 * - Quote:   https://financialmodelingprep.com/stable/quote?symbol=AAPL
 * - Profile: https://financialmodelingprep.com/stable/profile?symbol=AAPL
 * - Stock list (symbols): https://financialmodelingprep.com/stable/stock-list
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

export class FMPProvider implements StockProvider {
  name = 'Financial Modeling Prep';
  private config: ProviderConfig;

  constructor(apiKey: string, options?: Partial<ProviderConfig>) {
    this.config = {
      apiKey,
      baseUrl: FMP_BASE_URL,
      rateLimit: 300,
      ...options,
    };
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.config.baseUrl}${endpoint}${separator}apikey=${encodeURIComponent(
        this.config.apiKey
    )}`;
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

        // Try to extract JSON error message for easier debugging
        let bodyText: string | null = null;
        try {
          bodyText = await response.text();
        } catch {
          bodyText = null;
        }

        // Non-retriable statuses (403 etc.) should fail fast with context
        if (!this.isRetriableStatus(response.status) || attempt >= maxRetries) {
          const snippet = bodyText ? bodyText.slice(0, 500) : '';
          throw new Error(
              `FMP API error: ${response.status} ${response.statusText}${
                  snippet ? ` - ${snippet}` : ''
              }`
          );
        }

        let delay = this.getRetryDelayMs(response, attempt);
        if (response.status === 429 && !response.headers.get('retry-after')) {
          delay = Math.max(delay, 60000);
        }
        console.warn(`FMP retry ${attempt + 1}/${maxRetries} (${response.status}) in ${delay}ms`);
        await this.sleep(delay);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('FMP API error:')) {
          throw error;
        }
        if (attempt < maxRetries) {
          const delay = this.getRetryDelayMs(undefined, attempt);
          console.warn(`FMP retry ${attempt + 1}/${maxRetries} (network) in ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('FMP API error: retries exhausted');
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

    const base = 500;
    const max = 10000;
    const jitter = Math.floor(Math.random() * 200);
    return Math.min(max, base * 2 ** attempt) + jitter;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stable stock directory endpoint:
   * - /stock-list
   *
   * Note: field names may differ from legacy. We map defensively.
   */
  async fetchStockList(exchange?: string): Promise<StockData[]> {
    const attempts = [
      {
        label: 'stock-list',
        fetch: () => this.fetch<any[]>('/stock-list'),
        map: (items: any[]) =>
            (items ?? [])
                .filter((s) => s?.symbol && (s?.name || s?.companyName))
                .map((s) => ({
                  symbol: String(s.symbol),
                  name: String(s.name ?? s.companyName ?? s.symbol),
                  // FMP stable stock-list may include exchange / exchangeShortName depending on plan/response
                  exchange: s.exchangeShortName ?? s.exchange ?? s.exchangeSymbol ?? null,
                  currency: s.currency ?? null,
                  country: s.country ?? null,
                  sector: s.sector ?? null,
                  industry: s.industry ?? null,
                  isin: s.isin ?? null,
                  marketCap: s.marketCap ?? s.mktCap ?? null,
                  price: s.price ?? null,
                  change: s.change ?? s.changes ?? null,
                  changePercent: s.changesPercentage ?? null,
                  pe: s.pe ?? null,
                })),
      },
      {
        // Stable screener endpoint: /company-screener
        // Endpoint doc: https://financialmodelingprep.com/stable/company-screener
        label: 'company-screener',
        fetch: () => this.fetch<any[]>('/company-screener?limit=10000'),
        map: (stocks: any[]) =>
            (stocks ?? [])
                .filter((s) => s?.symbol && (s?.companyName || s?.name))
                .map((s) => ({
                  symbol: String(s.symbol),
                  name: String(s.companyName ?? s.name ?? s.symbol),
                  exchange: s.exchangeShortName ?? s.exchange ?? null,
                  currency: s.currency ?? null,
                  country: s.country ?? null,
                  sector: s.sector ?? null,
                  industry: s.industry ?? null,
                  isin: s.isin ?? null,
                  marketCap: s.marketCap ?? null,
                  price: s.price ?? null,
                  change: s.change ?? null,
                  changePercent: s.changesPercentage ?? null,
                  pe: s.pe ?? null,
                })),
      },
    ] as const;

    for (const attempt of attempts) {
      try {
        const data = await attempt.fetch();
        let mapped = attempt.map(data);

        if (exchange) {
          const ex = exchange.toUpperCase();
          mapped = mapped.filter((s) => (s.exchange ?? '').toUpperCase() === ex);
        }

        // Remove obviously broken rows
        mapped = mapped.filter((s) => !!s.symbol && !!s.name);

        if (mapped.length > 0) {
          console.log(`[FMP] Stock list source: ${attempt.label} (${mapped.length})`);
          return mapped;
        }
      } catch (error) {
        console.error(`[FMP] ${attempt.label} failed:`, error);
      }
    }

    console.error('[FMP] No stock list available from stable endpoints');
    return [];
  }

  /**
   * Stable quote endpoint:
   * GET /quote?symbol=AAPL
   * returns an array (typically 1 element).
   */
  async fetchQuote(symbol: string): Promise<StockData | null> {
    try {
      const quotes = await this.fetch<any[]>(
          `/quote?symbol=${encodeURIComponent(symbol)}`
      );
      if (!quotes || quotes.length === 0) return null;

      const q = quotes[0];
      return {
        symbol: q.symbol ?? symbol,
        name: q.name ?? q.companyName ?? null,
        exchange: q.exchangeShortName ?? q.exchange ?? null,
        price: q.price ?? null,
        change: q.change ?? q.changes ?? null,
        changePercent: q.changesPercentage ?? null,
        marketCap: q.marketCap ?? q.mktCap ?? null,
        pe: q.pe ?? null,
        currency: q.currency ?? null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('402 Payment Required')) {
        console.warn(`FMP fetchQuote skipped for ${symbol}: not available on current plan.`);
        return null;
      }
      console.error(`FMP fetchQuote error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Stable profile endpoint:
   * GET /profile?symbol=AAPL
   * returns an array (typically 1 element).
   */
  async fetchProfile(symbol: string): Promise<StockData | null> {
    try {
      const profiles = await this.fetch<any[]>(
          `/profile?symbol=${encodeURIComponent(symbol)}`
      );
      if (!profiles || profiles.length === 0) return null;

      const p = profiles[0];

      // changesPercentage sometimes "0.32%" in legacy; keep robust parsing
      const rawCp = p.changesPercentage ?? p.changePercent ?? null;
      const changePercent =
          typeof rawCp === 'string' ? parseFloat(rawCp.replace('%', '')) : rawCp;

      return {
        symbol: p.symbol ?? symbol,
        name: p.companyName ?? p.name ?? null,
        exchange: p.exchangeShortName ?? p.exchange ?? null,
        currency: p.currency ?? null,
        country: p.country ?? null,
        sector: p.sector ?? null,
        industry: p.industry ?? null,
        isin: p.isin ?? null,
        marketCap: p.mktCap ?? p.marketCap ?? null,
        price: p.price ?? null,
        change: p.changes ?? p.change ?? null,
        changePercent: Number.isFinite(changePercent) ? changePercent : null,
        pe: p.pe ?? null,
      };
    } catch (error) {
      console.error(`FMP fetchProfile error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * NOTE:
   * Legacy supported /profile/{symbolList}. Stable does NOT expose the same "comma list" pattern.
   * Stable bulk profiles uses parts: /profile-bulk?part=0 (download chunks).
   *
   * For now we keep a safe implementation: fetch profiles individually (up to 100) respecting rate limiter.
   * If you want true bulk, implement /profile-bulk?part=N and store results progressively.
   */
  async fetchBulkProfiles(symbols: string[]): Promise<StockData[]> {
    const unique = Array.from(new Set(symbols)).slice(0, 100);
    const results: StockData[] = [];

    for (const sym of unique) {
      const p = await this.fetchProfile(sym);
      if (p) results.push(p);
    }

    return results;
  }

  /**
   * Stable quote endpoint supports comma-separated symbols.
   * GET /quote?symbol=AAPL,MSFT
   */
  async fetchBulkQuotes(symbols: string[]): Promise<StockData[]> {
    const unique = Array.from(new Set(symbols)).slice(0, 100);
    if (unique.length === 0) return [];

    try {
      const list = unique.map((s) => encodeURIComponent(s)).join(',');
      const quotes = await this.fetch<any[]>(`/quote?symbol=${list}`);
      if (!quotes || !Array.isArray(quotes)) return [];

      return quotes.map((q) => ({
        symbol: q.symbol ?? null,
        name: q.name ?? q.companyName ?? null,
        exchange: q.exchangeShortName ?? q.exchange ?? null,
        price: q.price ?? null,
        change: q.change ?? q.changes ?? null,
        changePercent: q.changesPercentage ?? null,
        marketCap: q.marketCap ?? q.mktCap ?? null,
        pe: q.pe ?? null,
        currency: q.currency ?? null,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('402 Payment Required')) {
        console.warn('FMP fetchBulkQuotes skipped: not available on current plan.');
        return [];
      }
      console.error('FMP fetchBulkQuotes error:', error);
      return [];
    }
  }
}
