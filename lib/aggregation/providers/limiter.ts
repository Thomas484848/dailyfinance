import { ProviderLimiter } from '../limiter';
import { AggregatorConfig } from '../config';

export function buildLimiter(config: AggregatorConfig, key: string): ProviderLimiter {
  const quota = config.quotas[key] ?? {};
  return new ProviderLimiter({
    requestsPerMinute: quota.requestsPerMinute ?? null,
    requestsPerDay: quota.requestsPerDay ?? null,
    maxConcurrent: quota.maxConcurrent ?? 2,
  });
}
