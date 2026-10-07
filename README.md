# LiverLoop

Understand your numbers. Build better habits. Prepare for your next appointment.

LiverLoop is an educational tracking and appointment-preparation prototype for
adults living with metabolic dysfunction-associated steatotic liver disease
(MASLD). It follows a connected loop — **Record → Reflect → Prepare** — with
an AI companion (LiverLoop Guide) for app help and verified learning material.

It does not diagnose, interpret personal results, predict risk, or prescribe
treatment.

## Run locally

```bash
npm install
npm run dev      # frontend + Guide API together
npm test         # unit tests (mocked provider — no API cost)
npm run typecheck
npm run build
```

`npm run preview` serves the static build only (the Guide shows its
unconfigured state there by design).

## Deploy to Vercel

1. Push this repo to GitHub, then Import it in Vercel (framework: Vite —
   `vercel.json` already pins build `npm run build`, output `dist`, keeps
   `/api/*` on serverless functions, and falls back SPA routes to index).
2. Add environment variables in Vercel project settings:
   - `GROQ_API_KEY` (required for the live Guide; get one at console.groq.com/keys)
   - `GUIDE_MODEL` (optional, default `openai/gpt-oss-20b`)
3. Deploy. Without the key, the app works fully and the Guide shows its
   honest unconfigured state.

Local setup: copy `.env.example` to `.env` (git-ignored) and paste the key.
Never commit `.env`, never use a `VITE_*` secret. Full details in
`docs/guide-setup.md`.

## Status

Working: profiles + Maya demo, Dashboard, Log, Trends, Habits, Insights,
Visit Prep + print-friendly report + CSV exports, LiverLoop Guide.
See each milestone report for manual QA still required (browser + print).
