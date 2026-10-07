import { describe, expect, it, vi } from 'vitest';
import { handleGuideRequest } from './handler';
import { SlidingWindowLimiter } from './ratelimit';

const ENV = { GROQ_API_KEY: 'test-key-not-real', GUIDE_TIMEOUT_MS: '5000' };

function groqJson(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function groqChatCompletion(content: string): Response {
  return groqJson({ choices: [{ message: { content } }] });
}

function validOutput(over: Record<string, unknown> = {}) {
  return {
    answer: 'Use Log to record a result with its value, unit, and date.',
    sourceIds: ['alt'],
    suggestedQuestions: ['What could be influencing my ALT result?'],
    ...over,
  };
}

function req(over: Record<string, unknown> = {}) {
  return {
    message: 'What does ALT measure?',
    history: [],
    mode: 'general',
    includeDemoBaseline: false,
    ...over,
  };
}

describe('handleGuideRequest', () => {
  it('answers from verified content without personal records', async () => {
    const fetchImpl = vi.fn(async () => groqChatCompletion(JSON.stringify(validOutput())));
    const res = await handleGuideRequest({ fetchImpl: fetchImpl as typeof fetch, env: ENV }, req(), '1.2.3.4');
    expect(res.status).toBe(200);
    if (res.status !== 200 || !('answer' in res.body)) throw new Error('expected success');
    expect(res.body.sources).toEqual([
      { id: 'alt', title: 'MedlinePlus: ALT Blood Test', url: 'https://medlineplus.gov/lab-tests/alt-blood-test' },
    ]);
    expect(res.body.demoBaselineUsed).toBe(false);

    // Inspect what left the server: grounding present, personal data absent.
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const [, init] = calls[0];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key-not-real' });
    const body = JSON.parse(init.body as string);
    const joined = JSON.stringify(body);
    for (const banned of ['entries', 'reflections', 'checkins', 'localStorage', 'notes']) {
      expect(joined).not.toContain(`"${banned}"`);
    }
    expect(joined).toContain('verified educational content');
  });

  it('attaches the fictional baseline only on explicit demo request', async () => {
    const fetchImpl = vi.fn(async () =>
      groqChatCompletion(JSON.stringify(validOutput({ answer: 'Maya summary.', sourceIds: [], suggestedQuestions: [] }))),
    );
    const demoReq = req({ mode: 'fictional-demo', includeDemoBaseline: true, message: 'Summarize the demo.' });
    const res = await handleGuideRequest({ fetchImpl: fetchImpl as typeof fetch, env: ENV }, demoReq, '1.2.3.4');
    expect(res.status).toBe(200);
    if (res.status !== 200 || !('answer' in res.body)) throw new Error('expected success');
    expect(res.body.demoBaselineUsed).toBe(true);
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const [, init] = calls[0];
    expect(JSON.parse(init.body as string).messages.at(-1).content).toContain('fictional demo baseline');
  });

  it('ignores the demo flag outside fictional-demo mode', async () => {
    const fetchImpl = vi.fn(async () => groqChatCompletion(JSON.stringify(validOutput())));
    const res = await handleGuideRequest(
      { fetchImpl: fetchImpl as typeof fetch, env: ENV },
      req({ includeDemoBaseline: true }),
      '1.2.3.4',
    );
    expect(res.status).toBe(200);
    if (res.status !== 200 || !('answer' in res.body)) throw new Error('expected success');
    expect(res.body.demoBaselineUsed).toBe(false);
  });

  it('returns unconfigured without calling the provider', async () => {
    const fetchImpl = vi.fn(async () => groqChatCompletion('{}'));
    const res = await handleGuideRequest({ fetchImpl: fetchImpl as typeof fetch, env: {} }, req(), '1.2.3.4');
    expect(res.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects malformed requests without calling the provider', async () => {
    const fetchImpl = vi.fn(async () => groqChatCompletion('{}'));
    const res = await handleGuideRequest(
      { fetchImpl: fetchImpl as typeof fetch, env: ENV },
      { message: '', history: [], mode: 'general', includeDemoBaseline: false },
      '1.2.3.4',
    );
    expect(res.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps provider 429, auth failure, and timeout to safe errors', async () => {
    const r429 = await handleGuideRequest(
      { fetchImpl: (async () => new Response('slow', { status: 429 })) as typeof fetch, env: ENV },
      req(),
      '10.0.0.1',
    );
    expect(r429.status).toBe(429);

    const r401 = await handleGuideRequest(
      { fetchImpl: (async () => new Response('no', { status: 401 })) as typeof fetch, env: ENV },
      req(),
      '10.0.0.2',
    );
    expect(r401.status).toBe(502);

    const hanging = () =>
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new DOMException('aborted', 'AbortError')), 10);
      });
    const rTimeout = await handleGuideRequest(
      { fetchImpl: hanging as typeof fetch, env: ENV },
      req(),
      '10.0.0.3',
    );
    expect(rTimeout.status).toBe(504);
  });

  it('rejects malformed model output and drops unknown source IDs', async () => {
    const bad = vi.fn(async () => groqChatCompletion('not json{{'));
    const rBad = await handleGuideRequest({ fetchImpl: bad as typeof fetch, env: ENV }, req(), '10.0.1.1');
    expect(rBad.status).toBe(502);

    const unknown = vi.fn(async () =>
      groqChatCompletion(JSON.stringify(validOutput({ sourceIds: ['alt', 'made-up'] }))),
    );
    const rUnknown = await handleGuideRequest(
      { fetchImpl: unknown as typeof fetch, env: ENV },
      req(),
      '10.0.1.2',
    );
    expect(rUnknown.status).toBe(200);
    if (rUnknown.status !== 200 || !('answer' in rUnknown.body)) throw new Error('expected success');
    expect(rUnknown.body.sources.map((s) => s.id)).toEqual(['alt']);
  });

  it('enforces the server rate limit', async () => {
    const fetchImpl = vi.fn(async () => groqChatCompletion(JSON.stringify(validOutput())));
    const limiter = new SlidingWindowLimiter({ maxRequests: 1, windowMs: 60_000 });
    const deps = { fetchImpl: fetchImpl as typeof fetch, env: ENV, limiter };
    expect((await handleGuideRequest(deps, req(), '9.9.9.9')).status).toBe(200);
    const second = await handleGuideRequest(deps, req(), '9.9.9.9');
    expect(second.status).toBe(429);
  });
});
