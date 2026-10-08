import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisclaimerStrip, StorageNotice } from '../components/bits';
import { todayISO } from '../lib/dates';
import { useApp } from '../state/AppContext';

/**
 * Full-screen entry page — the judge's first impression.
 * Airy hero, stats band, differentiators, loop, judge CTA.
 */
export default function Opening() {
  const { envelope, activeMode, chooseDemo, choosePersonal, switchMode } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [showPersonalForm, setShowPersonalForm] = useState(false);

  function go(app: string) {
    navigate(app);
  }

  function startDemo() {
    if (!envelope.demo) chooseDemo();
    else if (activeMode !== 'demo') switchMode('demo');
    go('/dashboard');
  }

  function startPersonal() {
    choosePersonal(name === '' ? 'You' : name, visitDate);
    go('/dashboard');
  }

  return (
    <div className="min-h-screen w-full">
      {/* ── Hero: breathing room, one idea per block ── */}
      <div className="w-full bg-gradient-to-br from-loop-teal via-[#0d6b6a] to-[#084443] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
              <span aria-hidden>●</span> ImpactHacks · MASLD education prototype
            </p>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">
              LiverLoop
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90 md:text-2xl md:leading-relaxed">
              Understand your numbers. Build better habits. Walk into appointments prepared.
            </p>

            <div className="mt-9 flex max-w-lg flex-col gap-2.5 sm:flex-row">
              <button
                onClick={startDemo}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-bold text-loop-teal shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {envelope.demo ? 'Continue Maya’s demo →' : 'Explore Maya’s demo →'}
              </button>
              <button
                onClick={() => setShowPersonalForm((v) => !v)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold text-white ring-2 ring-inset ring-white/40 transition hover:bg-white/10"
                aria-expanded={showPersonalForm}
              >
                Start fresh
              </button>
            </div>
            <p className="mt-4 max-w-lg text-xs leading-relaxed text-white/60">
              1 click, no signup · Maya is fictional with 3 months of synthetic records · data stays in this browser
            </p>

            {envelope.personal && !showPersonalForm && (
              <button
                onClick={() => {
                  if (activeMode !== 'personal') switchMode('personal');
                  go('/dashboard');
                }}
                className="mt-2 text-sm font-semibold text-white underline underline-offset-2"
              >
                Continue {envelope.personal.profile.displayName}&apos;s profile →
              </button>
            )}

            {showPersonalForm && !envelope.personal && (
              <div className="mt-5 max-w-lg space-y-3 rounded-2xl bg-white p-5 text-left text-loop-ink shadow-xl">
                <div>
                  <label className="label" htmlFor="op-name">Display name</label>
                  <input id="op-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" autoComplete="off" />
                </div>
                <div>
                  <label className="label" htmlFor="op-visit">Next appointment <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="op-visit" type="date" className="field" value={visitDate} min={todayISO()} onChange={(e) => setVisitDate(e.target.value)} />
                </div>
                <button className="btn-primary w-full !py-3" onClick={startPersonal}>Create my space →</button>
              </div>
            )}
          </div>

          {/* Product glimpse — one clean mock window */}
          <div className="hidden lg:block" aria-hidden>
            <div className="overflow-hidden rounded-3xl bg-white text-loop-ink shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-100 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="ml-2 text-xs font-semibold text-slate-400">LiverLoop · Dashboard</span>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-lg font-bold">Good evening, Maya</p>
                  <p className="text-xs text-slate-500">Record → Reflect → Prepare</p>
                </div>
                <div className="rounded-2xl bg-loop-teal p-4 text-white">
                  <p className="text-sm font-bold">Your next step</p>
                  <p className="mt-0.5 text-xs text-white/85">1 habit waiting for today&apos;s check-in.</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-loop-mist px-3 py-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white text-xs text-transparent">✓</span>
                  <span className="text-sm font-medium">Movement I choose</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-loop-mist p-3">
                    <p className="text-[11px] font-semibold text-slate-500">This week</p>
                    <p className="text-sm font-bold">2 of 3 planned ✓</p>
                  </div>
                  <div className="rounded-xl bg-loop-mist p-3">
                    <p className="text-[11px] font-semibold text-slate-500">Visit prep</p>
                    <p className="text-sm font-bold">2 of 4 done</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-white/60">Record → Reflect → Prepare — one calm loop</p>
          </div>
        </div>
      </div>

      {/* ── Stats band ── */}
      <div className="w-full border-b border-slate-200/60 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 sm:grid-cols-3 lg:px-10">
          {[
            { n: '1.3B', d: 'people live with MASLD worldwide' },
            { n: '1.8B', d: 'projected by 2050' },
            { n: '1 in 4', d: 'of US adults affected' },
          ].map((s) => (
            <div key={s.n} className="text-center sm:text-left">
              <p className="text-3xl font-bold tracking-tight text-loop-teal md:text-4xl">{s.n}</p>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto w-full max-w-7xl px-6 pb-5 text-xs text-slate-400 lg:px-10">
          Estimates: Global Burden of Disease Study 2023; NIDDK (~24% of US adults).
        </p>
      </div>

      {/* ── Differentiators ── */}
      <div className="w-full bg-[#edf2f0]">
        <div className="mx-auto w-full max-w-7xl space-y-10 px-6 py-14 md:py-20 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-loop-teal">Why LiverLoop is different</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-loop-ink md:text-4xl">
              Not another tracker. A loop you can trust.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Most liver apps record numbers, guess at what they mean, and keep your data. LiverLoop does the opposite — on purpose.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: '🛡️',
                title: 'Private by construction',
                body: 'Your records never leave this browser. The AI server only ever receives your question text — unit tests enforce the payload shape, so there is no code path that uploads entries, notes, or habits.',
              },
              {
                icon: '✅',
                title: 'Verified-only answers',
                body: 'The Guide explains only from reviewed sources (MedlinePlus, NIDDK) with clickable citations — or openly says verified information is insufficient. It never invents facts, ranges, or sources.',
              },
              {
                icon: '🔁',
                title: 'One calm loop, end to end',
                body: 'Record labs and habits, reflect weekly, and walk into appointments with questions plus a print-friendly report — tracking, behavior, and visit prep in one place instead of three apps.',
              },
              {
                icon: '🤝',
                title: 'Honest boundaries',
                body: 'No diagnoses. No risk scores. No “you improved 12%” claims. Counts and summaries only — plus help phrasing the right questions for your clinician.',
              },
            ].map((c) => (
              <div key={c.title} className="card !p-6">
                <p aria-hidden className="text-3xl">{c.icon}</p>
                <h3 className="mt-3 text-lg font-bold text-loop-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>

          {/* Head-to-head */}
          <div className="card overflow-hidden !p-0">
            <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 border-b border-slate-100 bg-loop-mist/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:px-8">
              <span />
              <span className="text-center">Typical liver apps</span>
              <span className="text-center text-loop-teal">LiverLoop</span>
            </div>
            {[
              ['Your health data', 'Uploaded to their servers', 'Stays in your browser'],
              ['AI answers', 'Made up from thin air', 'Verified sources or “I don’t know”'],
              ['Risk & scores', 'Scary unverified scores', 'None — counts, never judgments'],
              ['Getting started', 'Account + signup forms', '1 click into Maya’s demo'],
              ['Appointment help', 'Nothing to bring', 'Questions + printed report'],
            ].map(([label, them, us]) => (
              <div key={label} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-sm last:border-0 md:px-8">
                <span className="font-semibold text-loop-ink">{label}</span>
                <span className="text-center text-slate-500">{them}</span>
                <span className="text-center font-semibold text-loop-teal">{us}</span>
              </div>
            ))}
          </div>

          {/* Loop */}
          <div>
            <h2 className="text-center text-2xl font-bold text-loop-ink">How the loop works</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { icon: '✎', title: 'Record', body: 'Labs, weight, BP, activity — with original values, units, and dates.' },
                { icon: '✓', title: 'Reflect', body: 'Up to 3 tiny habits, daily check-ins, a 2-minute weekly review.' },
                { icon: '✉', title: 'Prepare', body: 'Review records, choose questions, print your visit report.' },
              ].map((s, i) => (
                <div key={s.title} className="relative rounded-2xl bg-white p-6 ring-1 ring-black/5">
                  <span aria-hidden className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-loop-mint/60 text-xs font-bold text-loop-ink">{i + 1}</span>
                  <p aria-hidden className="text-3xl">{s.icon}</p>
                  <p className="mt-2 text-lg font-bold text-loop-ink">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Judge CTA */}
          <div className="rounded-3xl bg-loop-teal px-6 py-10 text-center text-white md:py-12">
            <h2 className="text-2xl font-bold md:text-3xl">See it in 30 seconds</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
              Jump into Maya&apos;s fictional demo — three months of synthetic records, clearly labeled, ready to explore.
            </p>
            <button onClick={startDemo} className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-loop-teal shadow-lg transition hover:-translate-y-0.5">
              Explore Maya’s demo →
            </button>
          </div>

          <div className="card space-y-2">
            <DisclaimerStrip />
            <StorageNotice />
          </div>
        </div>
      </div>
    </div>
  );
}
