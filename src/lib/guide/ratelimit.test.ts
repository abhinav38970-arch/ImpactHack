import { describe, expect, it } from 'vitest';
import { SlidingWindowLimiter } from './ratelimit';

describe('sliding-window limiter', () => {
  it('allows up to the cap then blocks', () => {
    const l = new SlidingWindowLimiter({ maxRequests: 3, windowMs: 60_000 });
    const t = 1_000_000;
    expect(l.allow('ip', t)).toBe(true);
    expect(l.allow('ip', t + 1)).toBe(true);
    expect(l.allow('ip', t + 2)).toBe(true);
    expect(l.allow('ip', t + 3)).toBe(false);
  });

  it('slides the window and isolates keys', () => {
    const l = new SlidingWindowLimiter({ maxRequests: 1, windowMs: 1000 });
    expect(l.allow('a', 0)).toBe(true);
    expect(l.allow('a', 500)).toBe(false);
    expect(l.allow('b', 500)).toBe(true);
    expect(l.allow('a', 1001)).toBe(true);
  });
});
