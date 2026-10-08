import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisclaimerStrip, StorageNotice } from '../components/bits';
import { todayISO } from '../lib/dates';
import { useApp } from '../state/AppContext';

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
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pt-6 pb-24 md:pt-10">
      {/* Hero — judge sees this first */}
      <div className="text-center">
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-loop-mint px-3 py-1 text-xs font-semibold text-loop-ink">
          <span aria-hidden>●</span> ImpactHacks · MASLD education prototype
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-loop-teal text-2xl font-bold text-white shadow-sm md:h-16 md:w-16 md:text-3xl"
          >
            L
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-loop-ink md:text-5xl">LiverLoop</h1>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 md:text-lg">
          Understand your numbers. Build better habits. Walk into appointments prepared.
        </p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
          Judges: 1 click to explore — no signup, data stays in this browser.
        </p>
        <div className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
          <button onClick={startDemo} className="btn-primary flex-1 !py-3 !text-base">
            {envelope.demo ? 'Continue Maya’s demo →' : 'Explore Maya’s demo →'}
          </button>
          <button
            onClick={() => setShowPersonalForm((v) => !v)}
            className="btn-secondary flex-1 !py-3 !text-base"
            aria-expanded={showPersonalForm}
          >
            Start fresh
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Maya is fictional with 3 months of synthetic records · Personal starts empty · 💬 Guide bottom-right on every page
        </p>

        {envelope.personal && !showPersonalForm && (
          <button
            onClick={() => {
              if (activeMode !== 'personal') switchMode('personal');
              go('/dashboard');
            }}
            className="mt-2 text-sm font-semibold text-loop-teal underline"
          >
            Continue {envelope.personal.profile.displayName}&apos;s profile →
          </button>
        )}

        {showPersonalForm && !envelope.personal && (
          <div className="card mx-auto mt-4 max-w-md space-y-3 text-left">
            <div>
              <label className="label" htmlFor="op-name">Display name</label>
              <input id="op-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" autoComplete="off" />
            </div>
            <div>
              <label className="label" htmlFor="op-visit">Next appointment <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="op-visit" type="date" className="field" value={visitDate} min={todayISO()} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
            <button className="btn-secondary w-full" onClick={startPersonal}>Create my space</button>
          </div>
        )}
      </div>

      {/* How it works — Record → Reflect → Prepare */}
      <section className="card" aria-label="How LiverLoop works">
        <h2 className="text-center text-base font-bold text-loop-ink">A calm loop, not a data dump</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { icon: '✎', title: 'Record', body: 'Log labs, weight, BP, activity with units + dates.' },
            { icon: '✓', title: 'Reflect', body: 'Tiny habits + 2-minute weekly review.' },
            { icon: '✉', title: 'Prepare', body: 'Questions + print-friendly visit report.' },
          ].map((s) => (
            <div key={s.title} className="rounded-xl bg-loop-mist p-3 text-center">
              <p aria-hidden className="text-xl">{s.icon}</p>
              <p className="mt-1 text-sm font-bold text-loop-ink">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it matters */}
      <section className="card !bg-loop-teal !text-white" aria-label="Why LiverLoop matters">
        <h2 className="text-base font-bold md:text-lg">Fatty liver disease is common. Day-to-day support is rare.</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center md:gap-3">
          {[
            { n: '1.3B', d: 'people live with MASLD worldwide' },
            { n: '1.8B', d: 'projected by 2050' },
            { n: '1 in 4', d: 'of US adults affected' },
          ].map((s) => (
            <div key={s.n} className="rounded-xl bg-white/10 px-2 py-3">
              <dd className="text-xl font-bold sm:text-2xl md:text-3xl">{s.n}</dd>
              <dt className="mt-1 block text-[11px] leading-tight text-white/80 md:text-xs">{s.d}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-white/70">
          Estimates: Global Burden of Disease Study 2023; NIDDK (~24% of US adults).
        </p>
      </section>

      <div className="card space-y-2">
        <DisclaimerStrip />
        <StorageNotice />
      </div>
    </div>
  );
}
