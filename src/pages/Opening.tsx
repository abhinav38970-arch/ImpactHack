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

  function go(app: string) {
    navigate(app);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-6">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-loop-teal text-2xl font-bold text-white"
        >
          L
        </span>
        <h1 className="mt-3 text-2xl font-bold text-loop-ink">LiverLoop</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Understand your numbers. Build better habits. Prepare for your next
          appointment.
        </p>
      </div>

      <section className="card !bg-loop-teal !text-white" aria-label="Why LiverLoop matters">
        <h2 className="text-base font-bold">
          Fatty liver disease is common. Day-to-day support is rare.
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 px-2 py-3">
            <dt className="order-2 mt-1 block text-[11px] leading-tight text-white/80">
              people live with MASLD worldwide
            </dt>
            <dd className="order-1 text-xl font-bold sm:text-2xl">1.3B</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-2 py-3">
            <dt className="order-2 mt-1 block text-[11px] leading-tight text-white/80">
              projected by 2050
            </dt>
            <dd className="order-1 text-xl font-bold sm:text-2xl">1.8B</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-2 py-3">
            <dt className="order-2 mt-1 block text-[11px] leading-tight text-white/80">
              of US adults affected
            </dt>
            <dd className="order-1 text-xl font-bold sm:text-2xl">1 in 4</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-white/90">
          LiverLoop pairs a calm tracking dashboard with an AI companion: record
          your numbers, reflect on your habits, and walk into appointments prepared.
        </p>
        <p className="mt-1 text-[11px] text-white/70">
          Estimates: Global Burden of Disease Study 2023 (1.3B; 1.8B by 2050); NIDDK (~24% of US adults).
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card flex flex-col" aria-label="Demo profile">
          <h2 className="text-base font-bold text-loop-ink">Explore Maya&apos;s demo</h2>
          <p className="mt-1 flex-1 text-sm text-slate-600">
            A fictional 52-year-old profile with three months of synthetic
            records. Clearly labeled everywhere — nothing here is a real
            patient.
          </p>
          {envelope.demo ? (
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => {
                if (activeMode !== 'demo') switchMode('demo');
                go('/dashboard');
              }}
            >
              Continue Maya&apos;s demo
            </button>
          ) : (
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => {
                chooseDemo();
                go('/dashboard');
              }}
            >
              Explore Maya&apos;s demo
            </button>
          )}
        </section>

        <section className="card flex flex-col" aria-label="Empty profile">
          <h2 className="text-base font-bold text-loop-ink">Start an empty profile</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your own space. Demo and personal records are kept separate and
            never mixed.
          </p>
          {envelope.personal ? (
            <button
              className="btn-secondary mt-4 w-full"
              onClick={() => {
                if (activeMode !== 'personal') switchMode('personal');
                go('/dashboard');
              }}
            >
              Continue {envelope.personal.profile.displayName}&apos;s profile
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="label" htmlFor="op-name">
                  Display name
                </label>
                <input
                  id="op-name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label" htmlFor="op-visit">
                  Next appointment <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="op-visit"
                  type="date"
                  className="field"
                  value={visitDate}
                  min={todayISO()}
                  onChange={(e) => setVisitDate(e.target.value)}
                />
              </div>
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  choosePersonal(name === '' ? 'You' : name, visitDate);
                  go('/dashboard');
                }}
              >
                Start an empty profile
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="card space-y-2">
        <DisclaimerStrip />
        <StorageNotice />
      </div>
    </div>
  );
}
