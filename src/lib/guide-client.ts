/**
 * LiverLoop Guide — browser client (no secrets here, ever).
 * Sends ONLY {message, history, mode, includeDemoBaseline} to /api/guide.
 * Personal entries, notes, reflections, habits, and localStorage contents
 * are never included — there is no code path that adds them.
 */

import type {
  GuideErrorBody,
  GuideErrorCode,
  GuideHistoryItem,
  GuideMode,
  GuideRequest,
  GuideResponse,
} from './guide/contract';

export class GuideRequestError extends Error {
  code: GuideErrorCode;
  retryAfterSeconds?: number;
  constructor(code: GuideErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'GuideRequestError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Build the exact request payload. Test asserts no other keys exist. */
export function buildGuideRequest(
  message: string,
  history: GuideHistoryItem[],
  mode: GuideMode,
  includeDemoBaseline: boolean,
): GuideRequest {
  return {
    message,
    history: history.slice(-6),
    mode,
    includeDemoBaseline,
  };
}

function isGuideResponse(v: unknown): v is GuideResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.answer === 'string' &&
    Array.isArray(o.sources) &&
    Array.isArray(o.suggestedQuestions) &&
    typeof o.demoBaselineUsed === 'boolean'
  );
}

export async function postGuide(
  req: GuideRequest,
  signal?: AbortSignal,
): Promise<GuideResponse> {
  let res: Response;
  try {
    res = await fetch('/api/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new GuideRequestError(
      'provider_error',
      'The Guide is temporarily unavailable. Please try again later.',
    );
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as GuideErrorBody | null)?.error;
    const code: GuideErrorCode =
      err?.code === 'invalid_request' ||
      err?.code === 'not_configured' ||
      err?.code === 'rate_limited' ||
      err?.code === 'provider_timeout' ||
      err?.code === 'provider_error' ||
      err?.code === 'invalid_output'
        ? err.code
        : 'provider_error';
    const fallback: Record<GuideErrorCode, string> = {
      invalid_request: 'That request could not be understood.',
      not_configured: 'Live Guide is not configured.',
      rate_limited: 'The Guide is busy right now. Please wait and try again.',
      provider_timeout: 'The Guide took too long to respond.',
      provider_error: 'The Guide is temporarily unavailable.',
      invalid_output: 'The Guide returned an unusable response.',
    };
    throw new GuideRequestError(
      code,
      typeof err?.message === 'string' && err.message.length > 0 ? err.message : fallback[code],
      typeof err?.retryAfterSeconds === 'number' ? err.retryAfterSeconds : undefined,
    );
  }
  if (!isGuideResponse(data)) {
    throw new GuideRequestError(
      'invalid_output',
      'The Guide returned an unusable response. Please try again.',
    );
  }
  return data;
}
