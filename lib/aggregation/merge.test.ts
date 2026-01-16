import { describe, expect, it } from 'vitest';
import { mergeMetrics } from './merge';

describe('mergeMetrics', () => {
  it('honors provider priority per field', () => {
    const result = mergeMetrics(
      [
        {
          provider: 'a',
          asOfDate: new Date('2024-01-01'),
          metrics: { price: 100, marketCap: 500 },
        },
        {
          provider: 'b',
          asOfDate: new Date('2024-01-02'),
          metrics: { price: 105, marketCap: 600 },
        },
      ],
      {
        price: ['b', 'a'],
        marketCap: ['a', 'b'],
      }
    );

    expect(result.metrics.price).toBe(105);
    expect(result.sources.price).toBe('b');
    expect(result.metrics.marketCap).toBe(500);
    expect(result.sources.marketCap).toBe('a');
  });

  it('falls back to latest when no priority list', () => {
    const result = mergeMetrics(
      [
        {
          provider: 'a',
          asOfDate: new Date('2024-01-01'),
          metrics: { pe: 12 },
        },
        {
          provider: 'b',
          asOfDate: new Date('2024-01-03'),
          metrics: { pe: 15 },
        },
      ],
      {}
    );

    expect(result.metrics.pe).toBe(15);
    expect(result.sources.pe).toBe('b');
  });
});
