import { sleep } from '../utils';

type Task<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type LimiterOptions = {
  requestsPerMinute?: number | null;
  requestsPerDay?: number | null;
  maxConcurrent?: number | null;
};

export class ProviderLimiter {
  private queue: Task<unknown>[] = [];
  private activeCount = 0;
  private minuteWindowStart = Date.now();
  private dayWindowStart = Date.now();
  private minuteCount = 0;
  private dayCount = 0;
  private timer: NodeJS.Timeout | null = null;
  private options: Required<LimiterOptions>;

  constructor(options: LimiterOptions) {
    this.options = {
      requestsPerMinute: options.requestsPerMinute ?? null,
      requestsPerDay: options.requestsPerDay ?? null,
      maxConcurrent: options.maxConcurrent ?? 2,
    };
  }

  schedule<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ run, resolve, reject });
      this.processQueue();
    });
  }

  private canRun(now: number): { ok: boolean; waitMs: number } {
    this.resetWindows(now);

    if (
      this.options.requestsPerMinute &&
      this.minuteCount >= this.options.requestsPerMinute
    ) {
      return {
        ok: false,
        waitMs: this.minuteWindowStart + 60000 - now,
      };
    }

    if (this.options.requestsPerDay && this.dayCount >= this.options.requestsPerDay) {
      return {
        ok: false,
        waitMs: this.dayWindowStart + 86400000 - now,
      };
    }

    return { ok: true, waitMs: 0 };
  }

  private resetWindows(now: number) {
    if (now - this.minuteWindowStart >= 60000) {
      this.minuteWindowStart = now;
      this.minuteCount = 0;
    }
    if (now - this.dayWindowStart >= 86400000) {
      this.dayWindowStart = now;
      this.dayCount = 0;
    }
  }

  private bumpCounts() {
    this.minuteCount += 1;
    this.dayCount += 1;
  }

  private processQueue() {
    if (this.timer) return;

    while (this.activeCount < this.options.maxConcurrent && this.queue.length > 0) {
      const now = Date.now();
      const availability = this.canRun(now);
      if (!availability.ok) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this.processQueue();
        }, Math.max(availability.waitMs, 1000));
        return;
      }

      const task = this.queue.shift();
      if (!task) return;
      this.activeCount += 1;
      this.bumpCounts();

      task
        .run()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.activeCount -= 1;
          if (this.queue.length > 0) {
            this.processQueue();
          }
        });
    }
  }
}

export async function withLimiter<T>(
  limiter: ProviderLimiter,
  run: () => Promise<T>
): Promise<T> {
  return limiter.schedule(run);
}
