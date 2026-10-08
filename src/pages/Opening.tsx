import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisclaimerStrip, StorageNotice } from '../components/bits';
import { todayISO } from '../lib/dates';
import { useApp } from '../state/AppContext';

/**
 * Full-screen entry page — the judge's first impression.
 * Split hero: story + actions left, product glimpse right.
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
      {/* Hero — full-bleed gradient */}
      <div className="w-full bg-gradient-to-br from-loop-teal via-[#0d6b6a] to-[#084443] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 md:py-20 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
              <span aria-hidden>●</span> ImpactHacks · MASLD education prototype
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-loop-teal shadow-lg">
                L
              </span>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">LiverLoop</h1>
            </div>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/90 md:text-xl">
              Understand your numbers. Build better habits. Walk into appointments prepared.
            </p>
            <p className="mt-2 max-w-lg text-sm text-white/70">
              Fatty liver disease affects 1 in 4 US adults — day-to-day support is rare. LiverLoop pairs a calm tracking dashboard with an AI companion.
            </p>
            <div className="mt-7 flex max-w-lg flex-col gap-2.5 sm:flex-row">
              <button
                onClick={startDemo}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-base font-bold text-loop-teal shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {envelope.demo ? 'Continue Maya’s demo →' : 'Explore Maya’s demo →'}
              </button>
              <button
                onClick={() => setShowPersonalForm((v) => !v)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl px-6 py-3.5 text-base font-semibold text-white ring-2 ring-inset ring-white/40 transition hover:bg-white/10"
                aria-expanded={showPersonalForm}
              >
                Start fresh
              </button>
            </div>
            <p className="mt-3 max-w-lg text-xs text-white/60">
              1 click, no signup · Maya is fictional with 3 months of synthetic records · data stays in this browser · 💬 Guide on every page
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
              <div className="mt-4 max-w-lg space-y-3 rounded-2xl bg-white p-5 text-left text-loop-ink shadow-xl">
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

          {/* Product glimpse */}
          <div className="hidden lg:block" aria-hidden>
            <div className="space-y-3">
              <div className="rounded-3xl bg-white p-5 text-loop-ink shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-loop-teal">Your next step</p>
                <p className="mt-1 text-sm text-slate-600">1 habit waiting for today&apos;s check-in.</p>
                <span className="mt-3 inline-flex rounded-xl bg-loop-teal px-4 py-2 text-sm font-semibold text-white">Complete check-in</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '✎', t: 'Record', d: 'Labs, weight, BP, activity' },
                  { icon: '✓', t: 'Reflect', d: 'Tiny habits + weekly review' },
                  { icon: '✉', t: 'Prepare', d: 'Questions + visit report' },
                ].map((s) => (
                  <div key={s.t} className="rounded-2xl bg-white/12 p-4 text-center ring-1 ring-inset ring-white/20 backdrop-blur">
                    <p className="text-2xl">{s.icon}</p>
                    <p className="mt-1 text-sm font-bold text-white">{s.t}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/70">{s.d}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-center">
                {[
                  { n: '1.3B', d: 'live with MASLD' },
                  { n: '1.8B', d: 'projected by 2050' },
                  { n: '1 in 4', d: 'of US adults' },
                ].map((s) => (
                  <div key={s.n} className="flex-1 rounded-2xl bg-white/10 px-2 py-3 ring-1 ring-inset ring-white/15">
                    <p className="text-xl font-bold text-white">{s.n}</p>
                    <p className="mt-0.5 text-[11px] text-white/70">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below hero — light section */}
      <div className="w-full bg-[#edf2f0]">
        <div className="mx-auto w-full max-w-7xl space-y-5 px-6 py-10 lg:px-10">
          <section className="card" aria-label="How LiverLoop works">
            <h2 className="text-center text-lg font-bold text-loop-ink">A calm loop, not a data dump</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: '✎', title: 'Record', body: 'Log labs, weight, BP, activity with units + dates. Nothing is judged here.' },
                { icon: '✓', title: 'Reflect', body: 'Up to 3 tiny habits, daily check-ins, a 2-minute weekly review.' },
                { icon: '✉', title: 'Prepare', body: 'Review records, pick appointment questions, print a visit report.' },
              ].map((s, i) => (
                <div key={s.title} className="relative rounded-2xl bg-loop-mist p-4">
                  <span aria-hidden className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-loop-teal ring-1 ring-black/5">{i + 1}</span>
                  <p aria-hidden className="text-2xl">{s.icon}</p>
                  <p className="mt-1 text-base font-bold text-loop-ink">{s.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="card space-y-2">
            <DisclaimerStrip />
            <StorageNotice />
          </div>
        </div>
      </div>
    </div>
  );
}
