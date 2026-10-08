/**
 * POST /api/guide — LiverLoop Guide endpoint (Vercel serverless function).
 *
 * Flow: React UI → this endpoint → Groq. The API key lives only in
 * server-side environment variables and never reaches the browser.
 *
 * Minimal structural typing keeps this file dependency-free
 * (no @vercel/node needed); Vercel's runtime objects satisfy it.
 */

import { handleGuideRequest } from '../src/lib/guide/handler';
import { SlidingWindowLimiter } from '../src/lib/guide/ratelimit';

interface ApiRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

// Process-local limiter (judge-demo guardrail; see docs/guide-setup.md for
// why public deployments need a shared store instead).
const limiter = new SlidingWindowLimiter();

function clientIp(req: ApiRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  if (typeof first === 'string' && first.length > 0) return first.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function readJsonBody(req: ApiRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return undefined;
    }
  }
  return req.body;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'invalid_request', message: 'Use POST.' } });
    return;
  }
  const result = await handleGuideRequest(
    { fetchImpl: fetch, env: process.env as Record<string, string | undefined>, limiter },
    readJsonBody(req),
    clientIp(req),
  );
  if (result.status !== 200) {
    // Minimal safe diagnostics for Vercel runtime logs: internal category
    // plus HTTP statuses only. Never keys, headers, chat content, records,
    // or provider response bodies.
    const code = 'error' in result.body ? result.body.error.code : 'unknown';
    console.log(
      JSON.stringify({
        scope: 'guide',
        httpStatus: result.status,
        code,
        providerStatus: result.log?.providerStatus ?? null,
      }),
    );
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(result.status).json(result.body);
}
