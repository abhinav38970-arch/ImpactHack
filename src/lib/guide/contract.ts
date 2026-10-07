/**
 * LiverLoop Guide — request/response contract.
 *
 * Single source of truth shared by the browser client, the Vercel serverless
 * function, and the local Vite dev middleware. The browser NEVER sends
 * entries, notes, reflections, habits, uploads, or localStorage contents —
 * only the fields below.
 */

export const GUIDE_LIMITS = {
  maxMessageChars: 1000,
  maxHistoryMessages: 6,
  maxHistoryCharsEach: 1000,
  maxTotalChars: 8000,
  maxAnswerChars: 2000,
  maxSuggestedQuestions: 3,
  maxQuestionChars: 200,
} as const;

export type GuideRole = 'user' | 'assistant';
export type GuideMode = 'general' | 'fictional-demo';

export interface GuideHistoryItem {
  role: GuideRole;
  content: string;
}

export interface GuideRequest {
  message: string;
  history: GuideHistoryItem[];
  mode: GuideMode;
  /** Explicit user action only. Honored solely in fictional-demo mode. */
  includeDemoBaseline: boolean;
}

export interface GuideSource {
  id: string;
  title: string;
  url: string;
}

export interface GuideResponse {
  answer: string;
  sources: GuideSource[];
  suggestedQuestions: string[];
  demoBaselineUsed: boolean;
}

export type GuideErrorCode =
  | 'invalid_request'
  | 'not_configured'
  | 'rate_limited'
  | 'provider_timeout'
  | 'provider_error'
  | 'invalid_output';

export interface GuideErrorBody {
  error: { code: GuideErrorCode; message: string; retryAfterSeconds?: number };
}

/** Safe, user-facing messages. Never include secrets, SDK text, or traces. */
export const GUIDE_ERROR_MESSAGES: Record<GuideErrorCode, string> = {
  invalid_request:
    'That request could not be understood. Try a shorter message.',
  not_configured:
    'Live Guide is not configured. You can still use LiverLoop and the verified learning links below.',
  rate_limited:
    'The Guide is busy right now. Please wait a minute and try again.',
  provider_timeout:
    'The Guide took too long to respond. Please try again.',
  provider_error:
    'The Guide is temporarily unavailable. Please try again later.',
  invalid_output:
    'The Guide returned an unusable response. Please try again.',
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Strict validation. Rejects anything malformed — no silent coercion. */
export function validateGuideRequest(
  raw: unknown,
): { ok: true; value: GuideRequest } | { ok: false; message: string } {
  if (!isRecord(raw)) return { ok: false, message: 'Request must be an object.' };
  const { message, history, mode, includeDemoBaseline } = raw;

  if (typeof message !== 'string' || message.trim().length === 0) {
    return { ok: false, message: 'Message must be a non-empty string.' };
  }
  if (message.length > GUIDE_LIMITS.maxMessageChars) {
    return {
      ok: false,
      message: `Message must be ${GUIDE_LIMITS.maxMessageChars} characters or fewer.`,
    };
  }
  if (!Array.isArray(history)) {
    return { ok: false, message: 'History must be an array.' };
  }
  if (history.length > GUIDE_LIMITS.maxHistoryMessages) {
    return {
      ok: false,
      message: `History must have ${GUIDE_LIMITS.maxHistoryMessages} messages or fewer.`,
    };
  }
  let total = message.length;
  for (const item of history) {
    if (!isRecord(item)) return { ok: false, message: 'History items must be objects.' };
    // Only user/assistant roles accepted. No system/tool messages from browsers.
    if (item.role !== 'user' && item.role !== 'assistant') {
      return { ok: false, message: 'History roles must be user or assistant.' };
    }
    if (typeof item.content !== 'string' || item.content.length === 0) {
      return { ok: false, message: 'History content must be non-empty strings.' };
    }
    if (item.content.length > GUIDE_LIMITS.maxHistoryCharsEach) {
      return {
        ok: false,
        message: `History messages must be ${GUIDE_LIMITS.maxHistoryCharsEach} characters or fewer.`,
      };
    }
    total += item.content.length;
  }
  if (total > GUIDE_LIMITS.maxTotalChars) {
    return {
      ok: false,
      message: `Request text must total ${GUIDE_LIMITS.maxTotalChars} characters or fewer.`,
    };
  }
  if (mode !== 'general' && mode !== 'fictional-demo') {
    return { ok: false, message: 'Mode must be general or fictional-demo.' };
  }
  if (typeof includeDemoBaseline !== 'boolean') {
    return { ok: false, message: 'includeDemoBaseline must be a boolean.' };
  }
  return {
    ok: true,
    value: {
      message,
      history: history as GuideHistoryItem[],
      mode,
      includeDemoBaseline,
    },
  };
}

/** Shape of the model's raw JSON before registry gating. */
export interface RawModelOutput {
  answer?: unknown;
  sourceIds?: unknown;
  suggestedQuestions?: unknown;
}

export interface ValidatedModelOutput {
  answer: string;
  /** Only IDs present in the server registry. Unknown IDs are dropped. */
  sourceIds: string[];
  suggestedQuestions: string[];
}

/**
 * Validate provider output. Unknown source IDs are rejected (dropped, never
 * rendered as links); overlong/extra questions are trimmed.
 */
export function validateModelOutput(
  raw: unknown,
  knownSourceIds: Set<string>,
): { ok: true; value: ValidatedModelOutput } | { ok: false } {
  if (!isRecord(raw)) return { ok: false };
  const { answer, sourceIds, suggestedQuestions } = raw as RawModelOutput;
  if (typeof answer !== 'string' || answer.trim().length === 0) return { ok: false };
  if (answer.length > GUIDE_LIMITS.maxAnswerChars) return { ok: false };
  if (!Array.isArray(sourceIds)) return { ok: false };
  const keptIds: string[] = [];
  for (const id of sourceIds) {
    if (typeof id !== 'string') return { ok: false };
    if (knownSourceIds.has(id) && !keptIds.includes(id)) keptIds.push(id);
  }
  if (!Array.isArray(suggestedQuestions)) return { ok: false };
  const keptQuestions: string[] = [];
  for (const q of suggestedQuestions) {
    if (typeof q !== 'string') return { ok: false };
    const t = q.trim();
    if (t.length === 0) continue;
    if (t.length > GUIDE_LIMITS.maxQuestionChars) continue;
    if (keptQuestions.length < GUIDE_LIMITS.maxSuggestedQuestions) {
      keptQuestions.push(t);
    }
  }
  return { ok: true, value: { answer: answer.trim(), sourceIds: keptIds, suggestedQuestions: keptQuestions } };
}
