import { sleep } from './utils';

export interface RateLimiterStats {
  requestCount: number;
  windowStart: number;
  rpm: number;
}

export class RateLimiter {
  private lastRequestAt = 0;
  private windowStart = Date.now();
  private requestCount = 0;
  private minIntervalMs: number;

  constructor(options: { minIntervalMs: number }) {
    this.minIntervalMs = options.minIntervalMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const nextAllowed = Math.max(this.lastRequestAt + this.minIntervalMs, now);
    const delay = nextAllowed - now;

    if (delay > 0) {
      await sleep(delay);
    }

    this.lastRequestAt = Date.now();
    this.bump();
  }

  getStats(): RateLimiterStats {
    const now = Date.now();
    const elapsed = Math.max(now - this.windowStart, 1);
    const rpm = Math.round((this.requestCount * 60000) / elapsed);

    return {
      requestCount: this.requestCount,
      windowStart: this.windowStart,
      rpm,
    };
  }

  private bump() {
    const now = Date.now();
    if (now - this.windowStart >= 60000) {
      this.windowStart = now;
      this.requestCount = 0;
    }
    this.requestCount += 1;
  }
}
