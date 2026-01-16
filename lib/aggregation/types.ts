export type NumericMetrics = {
  price?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  pe?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  dividendPerShare?: number | null;
  payoutRatio?: number | null;
  revenuePerShare?: number | null;
  epsDiluted?: number | null;
  sharesOutstanding?: number | null;
  floatShares?: number | null;
  beta?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
  avgVolume?: number | null;
  enterpriseValue?: number | null;
  ebitdaTtm?: number | null;
  freeCashFlowTtm?: number | null;
  operatingCashFlowTtm?: number | null;
  grossProfitTtm?: number | null;
  totalDebt?: number | null;
  totalCash?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  pegRatio?: number | null;
  evToEbitda?: number | null;
  evToRevenue?: number | null;
  bookValuePerShare?: number | null;
  roa?: number | null;
  roe?: number | null;
  roi?: number | null;
  revenueTtm?: number | null;
  netIncomeTtm?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  profitMargin?: number | null;
};

export type MetricsSourceMap = {
  [K in keyof NumericMetrics]?: string | null;
};

export type ProviderResponse = {
  payload: unknown;
  fetchedAt: Date;
  ttlSeconds: number;
};

export type ParsedMetrics = {
  asOfDate: Date;
  metrics: NumericMetrics;
};

export type ProviderPriority = {
  [K in keyof NumericMetrics]?: string[];
};

export type MergeResult = {
  metrics: NumericMetrics;
  sources: MetricsSourceMap;
  asOfDate: Date;
};
