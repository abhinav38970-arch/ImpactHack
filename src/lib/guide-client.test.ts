import { describe, expect, it, vi } from 'vitest';
import { buildGuideRequest, postGuide } from './guide-client';

describe('buildGuideRequest', () => {
  it('contains exactly the allowed keys — never personal records', () => {
    const r = buildGuideRequest('Hi', [{ role: 'user', content: 'a' }], 'general', false);
    expect(Object.keys(r).sort()).toEqual(['history', 'includeDemoBaseline', 'message', 'mode']);
    expect(JSON.stringify(r)).not.toContain('entries');
  });

  it('bounds history to the last 6 messages', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const r = buildGuideRequest('Hi', history, 'general', false);
    expect(r.history).toHaveLength(6);
    expect(r.history[0].content).toBe('m4');
  });
});

describe('postGuide', () => {
  it('posts to the same-origin endpoint and returns the response', async () => {
    const payload = { answer: 'A', sources: [], suggestedQuestions: [], demoBaselineUsed: false };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const res = await postGuide(buildGuideRequest('Hi', [], 'general', false));
      expect(res.answer).toBe('A');
      const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
      const [url, init] = calls[0];
      expect(url).toBe('/api/guide');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws typed errors for error statuses', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'Busy.' } }), {
          status: 429,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(postGuide(buildGuideRequest('Hi', [], 'general', false))).rejects.toMatchObject({
        code: 'rate_limited',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
