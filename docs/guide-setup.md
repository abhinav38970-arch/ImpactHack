# LiverLoop Guide — setup and operations

The Guide is a server-connected educational assistant (Groq-powered).
The app remains fully usable when the Guide is unconfigured or unavailable.

## Where the key goes (manual steps — nothing here is automated)

The API key lives **only** in server-side environment variables:

1. **Local development.** Copy `.env.example` to `.env` in the project root
   (this file is git-ignored and must never be committed), then paste the key:
   `GROQ_API_KEY=<key>`. Restart `npm run dev` after changing it.
2. **Vercel.** Project Settings → Environment Variables → add `GROQ_API_KEY`
   (Production and Preview). Optional override: `GUIDE_MODEL`
   (default `openai/gpt-oss-20b`, verified 2026-10-07 to support strict
   structured outputs).

Rules that are enforced by construction, not just policy:

- The key is read only in `api/guide.ts` and the Vite dev middleware.
- No `VITE_*` variable may hold a secret (Vite would ship it to browsers).
- The key is never in React code, localStorage, chat history, responses,
  logs, or error messages. Tests assert the request payload shape.
- The project pins Node `22.x` (`engines` in package.json; Vercel supports
  22.x — Node 20 is deprecated Oct 2026). Server code is typechecked by
  `tsconfig.api.json` with `@types/node`; browser code stays Node-free.

If a key was ever pasted into chat, a ticket, or committed by mistake,
**rotate it** at https://console.groq.com/keys and replace it in the two
places above.

## Running it locally

- `npm run dev` serves the frontend **and** `POST /api/guide` together
  (Vite dev middleware; Vite never runs Vercel functions on its own).
- `npm run preview` serves the static build only — the Guide shows its
  "not configured" state there by design.

## Smoke test (one request, negligible cost)

1. `npm run dev`, open the app, pick **Maya's demo**.
2. Go to Insights → Open the Guide → acknowledge the notice.
3. Send: `How do I log a result?`
4. Expect: a short answer, no sources section or app-doc-grounded steps,
   and no error. Then send `What does ALT measure?` and expect an answer
   with a MedlinePlus ALT source link.
5. Do not run bulk or automated live tests — unit tests use mocked fetch.

## Cost and abuse controls

- Output capped at 600 completion tokens; history capped at 6 messages;
  request text capped server-side; 25s provider timeout.
- In-memory per-IP sliding window (10 req/min). This is a **judge-demo
  guardrail only**: serverless instances do not share memory, so a public
  deployment needs a shared store (e.g. Upstash or Vercel KV) plus Groq
  spend limits (console.groq.com spend limits). Same-origin POST and the
  demo-mode gating are not authentication.
- Free-tier reference (2026-10-07, subject to change — check
  console.groq.com/settings/limits): gpt-oss-20b/120b allow 30 RPM,
  1K requests/day, 8K tokens/min. The Guide's small prompts fit comfortably.

## Privacy boundaries (enforced in code, tested)

- The browser sends only message text, recent history, mode, and the demo
  flag. Entries, notes, reflections, habits, uploads, and localStorage
  contents have no code path to the server.
- Maya summaries use a fixed server-side fictional baseline, only on
  explicit request in demo mode, always labeled fictional.
- Chat history lives in React state for the session only and is cleared on
  profile switch. No chat-content logging by default.
