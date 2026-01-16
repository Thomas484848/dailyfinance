import { AggregatorConfig } from '../config';
import { ProviderAdapter } from '../provider';
import { ProviderResponse } from '../types';
import { buildLimiter } from './limiter';

const BASE_URL = 'https://www.alphavantage.co/query';

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
      throw new Error(
        `Alpha Vantage error: ${response.status} ${response.statusText} - ${body}`
      );
    }
    return response.json();
  });
}

export function buildAlphaVantageAdapter(config: AggregatorConfig): ProviderAdapter | null {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) return null;

  const limiter = buildLimiter(config, 'alphavantage');
  const ttlQuote = config.ttlSeconds.quote;
  const ttlOverview = config.ttlSeconds.overview;

  return {
    name: 'alphavantage',
    limiter,
    fetchQuote: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
        symbol
      )}&apikey=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlQuote };
    },
    fetchOverview: async (symbol: string): Promise<ProviderResponse | null> => {
      const url = `${BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(
        symbol
      )}&apikey=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(limiter, url);
      return { payload, fetchedAt: new Date(), ttlSeconds: ttlOverview };
    },
    parseQuote: (payload) => {
      const quote = (payload as any)?.['Global Quote'];
      if (!quote) return null;
      return {
        asOfDate: new Date(),
        metrics: {
          price: Number(quote['05. price']) || null,
          open: Number(quote['02. open']) || null,
          high: Number(quote['03. high']) || null,
          low: Number(quote['04. low']) || null,
          close: Number(quote['08. previous close']) || null,
          volume: Number(quote['06. volume']) || null,
        },
      };
    },
    parseOverview: (payload) => {
      const data = payload as any;
      if (
        !data ||
        data.Symbol === undefined ||
        data.Information ||
        data.Note ||
        data['Error Message']
      ) {
        return null;
      }
      return {
        asOfDate: new Date(),
        metrics: {
          marketCap: Number(data.MarketCapitalization) || null,
          pe: Number(data.PERatio) || null,
          eps: Number(data.EPS) || null,
          dividendYield: Number(data.DividendYield) || null,
          dividendPerShare: Number(data.DividendPerShare) || null,
          payoutRatio: Number(data.DividendPayoutRatio) || null,
          revenuePerShare: Number(data.RevenuePerShareTTM) || null,
          epsDiluted: Number(data.DilutedEPSTTM) || null,
          sharesOutstanding: Number(data.SharesOutstanding) || null,
          beta: Number(data.Beta) || null,
          week52High: Number(data['52WeekHigh']) || null,
          week52Low: Number(data['52WeekLow']) || null,
          avgVolume: Number(data.AverageVolume ?? data.AverageVolume10day) || null,
          enterpriseValue: Number(data.EnterpriseValue) || null,
          ebitdaTtm: Number(data.EBITDA) || null,
          freeCashFlowTtm: Number(data.FreeCashFlowTTM) || null,
          operatingCashFlowTtm: Number(data.OperatingCashflow) || null,
          grossProfitTtm: Number(data.GrossProfitTTM) || null,
          totalDebt: Number(data.TotalDebt) || null,
          totalCash: Number(data.TotalCash) || null,
          debtToEquity: Number(data.DebtToEquity) || null,
          currentRatio: Number(data.CurrentRatio) || null,
          quickRatio: Number(data.QuickRatio) || null,
          priceToBook: Number(data.PriceToBookRatio) || null,
          priceToSales: Number(data.PriceToSalesRatioTTM) || null,
          pegRatio: Number(data.PEGRatio) || null,
          evToEbitda: Number(data.EVToEBITDA) || null,
          evToRevenue: Number(data.EVToRevenue) || null,
          bookValuePerShare: Number(data.BookValue) || null,
          roa: Number(data.ReturnOnAssetsTTM) || null,
          roe: Number(data.ReturnOnEquityTTM) || null,
          roi: Number(data.ReturnOnInvestmentTTM) || null,
          revenueTtm: Number(data.RevenueTTM) || null,
          netIncomeTtm: Number(data.NetIncomeTTM) || null,
          grossMargin: null,
          operatingMargin: Number(data.OperatingMarginTTM) || null,
          profitMargin: Number(data.ProfitMargin) || null,
        },
      };
    },
  };
}
