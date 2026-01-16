import { ProviderAdapter } from '../provider';
import { AggregatorConfig } from '../config';
import { buildAlphaVantageAdapter } from './providers-alpha-vantage';
import { buildFmpAdapter } from './providers-fmp';
import { buildFinnhubAdapter } from './providers-finnhub';
import { buildTwelveDataAdapter } from './providers-twelvedata';
export function buildProviders(config: AggregatorConfig): ProviderAdapter[] {
  const providers: ProviderAdapter[] = [];

  const fmp = buildFmpAdapter(config);
  if (fmp) providers.push(fmp);

  const av = buildAlphaVantageAdapter(config);
  if (av) providers.push(av);

  const finnhub = buildFinnhubAdapter(config);
  if (finnhub) providers.push(finnhub);

  const twelvedata = buildTwelveDataAdapter(config);
  if (twelvedata) providers.push(twelvedata);

  return providers;
}
