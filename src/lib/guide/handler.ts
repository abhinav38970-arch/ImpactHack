/**
 * LiverLoop Guide — request handler (server-only orchestration).
 * Pure logic over injected dependencies: fully testable with mocked fetch.
 */

import {
  GUIDE_ERROR_MESSAGES,
  validateGuideRequest,
  validateModelOutput,
} from './contract';
import type { GuideErrorCode, GuideResponse } from './contract';
import { loadGuideConfig } from './config';
import { baselineText } from './demoBaseline';
import { FICTIONAL_BASELINE } from './demoBaseline';
import { buildGroundingAppendix, GUIDE_SYSTEM_PROMPT } from './prompt';
import { callGroq } from './provider';
import type { ProviderMessage } from './provider';
import { findRelevant, getVerifiedByIds, groundingText, knownSourceIds } from './registry';
import { SlidingWindowLimiter } from './ratelimit';

export interface HandlerDeps {
  fetchImpl: typeof fetch;
  env: Record<string, string | undefined>;
  limiter?: SlidingWindowLimiter;
}

export interface HandlerResult {
  status: number;
  body: GuideResponse | { error: { code: GuideErrorCode; message: string; retryAfterSeconds?: number } };
  /** Server-side diagnostics only: safe category + provider HTTP status.
   *  Never serialized to the browser. Never contains keys, headers,
   *  chat content, records, or provider response bodies. */
  log?: { providerStatus?: number };
}

function err(status: number, code: GuideErrorCode, retryAfterSeconds?: number): HandlerResult {
  return {
    status,
    body: { error: { code, message: GUIDE_ERROR_MESSAGES[code], ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}) } },
  };
}

export async function handleGuideRequest(
  deps: HandlerDeps,
  rawBody: unknown,
  clientIp: string,
): Promise<HandlerResult> {
  const parsed = validateGuideRequest(rawBody);
  if (!parsed.ok) return err(400, 'invalid_request');
  const req = parsed.value;

  const config = loadGuideConfig(deps.env);
  if (!config.apiKey) return err(503, 'not_configured');

  const limiter = deps.limiter ?? new SlidingWindowLimiter();
  if (!limiter.allow(clientIp || 'unknown')) return err(429, 'rate_limited');

  // Retrieval over verified registry only. Unverified entries can never
  // reach the model or the UI as guidance.
  const relevant = findRelevant(req.message, 3);
  const verifiedText = groundingText(relevant);

  // Fictional context only on explicit request in fictional-demo mode.
  // The baseline is reconstructed server-side; browser records are ignored.
  const useDemo = req.mode === 'fictional-demo' && req.includeDemoBaseline === true;
  const demoText = useDemo ? baselineText(FICTIONAL_BASELINE) : null;

  const messages: ProviderMessage[] = [
    { role: 'system', content: GUIDE_SYSTEM_PROMPT },
    ...req.history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    {
      role: 'user',
      content: `${req.message}\n\n---\n${buildGroundingAppendix({ verifiedText, allowedIds: relevant.map((e) => e.id), demoText })}`,
    },
  ];

  const result = await callGroq({
    fetchImpl: deps.fetchImpl,
    apiKey: config.apiKey,
    model: config.model,
    messages,
    maxCompletionTokens: config.maxCompletionTokens,
    timeoutMs: config.timeoutMs,
  });

  if (!result.ok) {
    switch (result.code) {
      case 'provider_timeout':
        return { ...err(504, 'provider_timeout'), log: {} };
      case 'rate_limited':
        return {
          ...err(429, 'rate_limited', result.retryAfterSeconds),
          log: { providerStatus: result.providerStatus },
        };
      case 'auth_error':
        // Key present but Groq rejected it (401/403): expired, revoked, or
        // pasted with whitespace. Safe message — never echoes the key.
        return {
          status: 502,
          body: {
            error: {
              code: 'provider_error',
              message:
                'The Guide key was rejected by the AI provider (invalid or expired). Create a fresh key at console.groq.com/keys, update GROQ_API_KEY in Vercel, then Redeploy.',
            },
          },
          log: { providerStatus: result.providerStatus },
        };
      case 'bad_request_strict':
      case 'provider_error':
      case 'bad_response':
        return { ...err(502, 'provider_error'), log: { providerStatus: result.providerStatus } };
    }
  }

  // Models in json_object fallback mode sometimes wrap JSON in fences.
  let text = result.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  let modelJson: unknown;
  try {
    modelJson = JSON.parse(text);
  } catch {
    return err(502, 'invalid_output');
  }
  const validated = validateModelOutput(modelJson, knownSourceIds());
  if (!validated.ok) return err(502, 'invalid_output');

  const cited = getVerifiedByIds(validated.value.sourceIds);
  return {
    status: 200,
    body: {
      answer: validated.value.answer,
      sources: cited.map((e) => ({ id: e.id, title: e.sourceTitle, url: e.sourceUrl })),
      suggestedQuestions: validated.value.suggestedQuestions,
      demoBaselineUsed: useDemo,
    },
  };
}
