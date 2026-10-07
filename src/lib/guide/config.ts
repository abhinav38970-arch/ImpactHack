/**
 * LiverLoop Guide — server configuration (server-only).
 * Reads plain environment variables. Never VITE_-prefixed, never shipped
 * to the browser. Missing key => unconfigured state, not a crash.
 */

import { DEFAULT_GUIDE_MODEL, GUIDE_MAX_COMPLETION_TOKENS, GUIDE_REQUEST_TIMEOUT_MS } from './provider';

export interface GuideServerConfig {
  apiKey: string | null;
  model: string;
  maxCompletionTokens: number;
  timeoutMs: number;
}

export function loadGuideConfig(env: Record<string, string | undefined>): GuideServerConfig {
  const apiKey = (env.GROQ_API_KEY ?? '').trim();
  const model = (env.GUIDE_MODEL ?? '').trim() || DEFAULT_GUIDE_MODEL;
  const timeoutRaw = Number(env.GUIDE_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw >= 1000 && timeoutRaw <= 60_000
      ? Math.floor(timeoutRaw)
      : GUIDE_REQUEST_TIMEOUT_MS;
  return {
    apiKey: apiKey.length > 0 ? apiKey : null,
    model,
    maxCompletionTokens: GUIDE_MAX_COMPLETION_TOKENS,
    timeoutMs,
  };
}
