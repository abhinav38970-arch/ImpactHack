/**
 * LiverLoop Guide — process-local sliding-window rate limiter.
 *
 * Judge-demo guardrail only. A process-local counter is NOT sufficient
 * protection on serverless deployments (each instance has its own memory),
 * so public use requires a shared store such as Upstash or Vercel KV —
 * see docs/guide-setup.md. The UI must never present this as full abuse
 * protection.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly config: RateLimitConfig = DEFAULT_RATE_LIMIT) {}

  /** Returns true when allowed (and records the hit). */
  allow(key: string, now = Date.now()): boolean {
    const windowStart = now - this.config.windowMs;
    const prev = this.hits.get(key) ?? [];
    const recent = prev.filter((t) => t > windowStart);
    if (recent.length >= this.config.maxRequests) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** For tests only. */
  size(): number {
    return this.hits.size;
  }
}
