/**
 * LiverLoop Guide — Groq provider adapter (server-only).
 *
 * No SDK dependency: plain fetch against Groq's OpenAI-compatible chat
 * completions endpoint. The UI never touches this module. `fetchImpl` is
 * injected so tests use mocks and never spend API credits.
 *
 * Verified against Groq docs 2026-10-07:
 * - POST https://api.groq.com/openai/v1/chat/completions
 * - Authorization: Bearer <key>
 * - Structured outputs: response_format {type:'json_schema', json_schema:{name, strict, schema}}
 * - Strict constrained decoding (`strict: true`) supported on
 *   openai/gpt-oss-20b (also 120b, qwen3.8-27b). Default model below.
 */

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_GUIDE_MODEL = 'openai/gpt-oss-20b';
export const GUIDE_MAX_COMPLETION_TOKENS = 600;
export const GUIDE_REQUEST_TIMEOUT_MS = 25000;

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderCallInput {
  fetchImpl: typeof fetch;
  apiKey: string;
  model: string;
  messages: ProviderMessage[];
  maxCompletionTokens: number;
  timeoutMs: number;
}

export type ProviderResult =
  | { ok: true; content: string }
  | { ok: false; code: 'provider_timeout' | 'rate_limited' | 'auth_error' | 'provider_error' | 'bad_response'; retryAfterSeconds?: number };

const GUIDE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    sourceIds: { type: 'array', items: { type: 'string' } },
    suggestedQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'sourceIds', 'suggestedQuestions'],
  additionalProperties: false,
} as const;

export function buildGroqBody(
  model: string,
  messages: ProviderMessage[],
  maxCompletionTokens: number,
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: 0.2,
    max_completion_tokens: maxCompletionTokens,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'liverloop_guide', strict: true, schema: GUIDE_JSON_SCHEMA },
    },
  };
}

function parseRetryAfter(headers: Headers): number | undefined {
  const v = headers.get('retry-after');
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 600) return undefined;
  return Math.ceil(n);
}

export async function callGroq(input: ProviderCallInput): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const res = await input.fetchImpl(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGroqBody(input.model, input.messages, input.maxCompletionTokens)),
      signal: controller.signal,
    });
    if (res.status === 429) {
      return { ok: false, code: 'rate_limited', retryAfterSeconds: parseRetryAfter(res.headers) };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, code: 'auth_error' };
    }
    if (!res.ok) {
      return { ok: false, code: 'provider_error' };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, code: 'bad_response' };
    }
    const content =
      typeof data === 'object' && data !== null
        ? (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message
            ?.content
        : undefined;
    if (typeof content !== 'string' || content.length === 0) {
      return { ok: false, code: 'bad_response' };
    }
    return { ok: true, content };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, code: 'provider_timeout' };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, code: 'provider_timeout' };
    }
    return { ok: false, code: 'provider_error' };
  } finally {
    clearTimeout(timer);
  }
}
