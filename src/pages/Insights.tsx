import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DisclaimerStrip } from '../components/bits';
import { formatLong, todayISO } from '../lib/dates';
import { getVerifiedByIds, verifiedEntries } from '../lib/guide/registry';
import {
  activityInPeriod,
  compareEquivalentWeeks,
  habitCompletionInPeriod,
  labStat,
  latestReflection,
  rangeStart,
} from '../lib/insights';
import type { InsightsRange } from '../lib/insights';
import { activeHabits } from '../lib/habits';
import { METRICS } from '../lib/units';
import { useApp } from '../state/AppContext';
import type { EntryKind } from '../lib/types';

const PERIODS: Array<{ key: InsightsRange; label: string }> = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

/** Recorded lab kinds mapped to verified registry entries. */
const KIND_TO_ENTRY: Partial<Record<EntryKind, string>> = {
  ALT: 'alt',
  AST: 'ast',
  GGT: 'ggt',
  TRIG: 'triglycerides',
};

export default function Insights() {
  const { activeProfile } = useApp();
  const entries = useMemo(() => activeProfile?.entries ?? [], [activeProfile]);
  const habits = useMemo(() => activeProfile?.habits ?? [], [activeProfile]);
  const checkins = useMemo(() => activeProfile?.checkins ?? [], [activeProfile]);
  const reflections = useMemo(() => activeProfile?.reflections ?? [], [activeProfile]);
  const today = todayISO();

  const [range, setRange] = useState<InsightsRange>('30');
  const from = rangeStart(range, today);

  const activity = useMemo(() => activityInPeriod(entries, from, today), [entries, from, today]);
  const habitSum = useMemo(
    () => habitCompletionInPeriod(activeHabits(habits), checkins, from, today),
    [habits, checkins, from, today],
  );
  const labs = useMemo(() => labStat(entries), [entries]);
  const compare = useMemo(
    () => compareEquivalentWeeks(entries, activeHabits(habits), checkins, today),
    [entries, habits, checkins, today],
  );
  const reflection = useMemo(() => latestReflection(reflections), [reflections]);

  const recordedKinds = useMemo(() => {
    const kinds = new Set(entries.map((e) => e.kind));
    return (Object.keys(KIND_TO_ENTRY) as EntryKind[]).filter((k) => kinds.has(k));
  }, [entries]);
  const eduEntries = useMemo(
    () => getVerifiedByIds(recordedKinds.map((k) => KIND_TO_ENTRY[k]!)),
    [recordedKinds],
  );
  const recordedUnverified = useMemo(() => {
    const kinds = new Set(entries.map((e) => e.kind));
    return (['PLATELET', 'HBA1C'] as EntryKind[]).filter((k) => kinds.has(k));
  }, [entries]);
  const masld = useMemo(() => verifiedEntries().find((e) => e.id === 'masld-overview'), []);

  const schedulesDiffer = compare.habitsNow.planned !== compare.habitsPrev.planned;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-loop-ink">Insights</h1>
          <p className="text-sm text-slate-500">
            Plain summaries of what you recorded — counted, never interpreted.
          </p>
        </div>
        <div className="ml-auto flex gap-2" role="group" aria-label="Summary period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setRange(p.key)}
              aria-pressed={range === p.key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                range === p.key
                  ? 'bg-loop-teal text-white ring-loop-teal'
                  : 'bg-white text-slate-600 ring-slate-300 hover:bg-loop-mist'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <section className="card" aria-label="Your recorded activity">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-loop-ink">Your recorded activity</h2>
          <Link to="/trends" className="ml-auto text-xs font-semibold text-loop-teal underline">
            View in Trends
          </Link>
        </div>
        {activity.dates === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            No activity entries in this period.{' '}
            <Link to="/log" className="font-semibold text-loop-teal underline">Log activity</Link>
          </p>
        ) : (
          <p className="mt-1 text-sm text-loop-ink">
            You logged <strong>{activity.minutes} minutes</strong> across{' '}
            <strong>{activity.dates} {activity.dates === 1 ? 'date' : 'dates'}</strong>.
          </p>
        )}
      </section>

      <section className="card" aria-label="Your planned habits">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-loop-ink">Your planned habits</h2>
          <Link to="/habits" className="ml-auto text-xs font-semibold text-loop-teal underline">
            Open Habits
          </Link>
        </div>
        {habitSum.planned === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            No elapsed planned actions in this period.{' '}
            <Link to="/habits" className="font-semibold text-loop-teal underline">Choose a habit</Link>
          </p>
        ) : (
          <div className="mt-1 text-sm text-loop-ink">
            <p>
              You completed <strong>{habitSum.completed} of {habitSum.planned} elapsed planned actions</strong>.
            </p>
            <ul className="mt-2 space-y-1">
              {habitSum.perHabit.map((h) => (
                <li key={h.id} className="flex justify-between gap-2 text-slate-600">
                  <span>{h.title}</span>
                  <span className="shrink-0 font-medium text-loop-ink">
                    {h.completed}/{h.planned}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card" aria-label="Week over week">
        <h2 className="text-base font-bold text-loop-ink">Week over week</h2>
        <p className="text-xs text-slate-500">
          Equivalent elapsed days: {formatLong(compare.current.start)}–{formatLong(compare.current.end)}{' '}
          vs {formatLong(compare.previous.start)}–{formatLong(compare.previous.end)}.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-loop-mist p-3">
            <p className="text-xs font-semibold text-slate-500">Activity minutes</p>
            <p className="text-sm text-loop-ink">
              {compare.activityNow.minutes} min ({compare.activityNow.dates} dates) vs{' '}
              {compare.activityPrev.dates === 0 ? (
                <>no prior entries</>
              ) : (
                <>{compare.activityPrev.minutes} min ({compare.activityPrev.dates} dates)</>
              )}
            </p>
          </div>
          <div className="rounded-xl bg-loop-mist p-3">
            <p className="text-xs font-semibold text-slate-500">Planned actions</p>
            <p className="text-sm text-loop-ink">
              {compare.habitsNow.completed}/{compare.habitsNow.planned} vs{' '}
              {compare.habitsPrev.completed}/{compare.habitsPrev.planned}
            </p>
            {schedulesDiffer && (
              <p className="mt-1 text-xs text-slate-500">
                Planned days differ between these weeks, so the counts are not directly comparable.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card" aria-label="Your weekly reflection">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-loop-ink">Your weekly reflection</h2>
          <Link to="/habits" className="ml-auto text-xs font-semibold text-loop-teal underline">
            Edit in Habits
          </Link>
        </div>
        {!reflection ? (
          <p className="mt-1 text-sm text-slate-500">
            No saved reflection yet. Reflections live in Habits and appear here word-for-word.
          </p>
        ) : (
          <blockquote className="mt-2 space-y-1 border-l-4 border-loop-mint pl-3 text-sm text-loop-ink">
            <p><span className="font-semibold">What helped: </span>{reflection.helped || '—'}</p>
            <p><span className="font-semibold">What got in the way: </span>{reflection.blocked || '—'}</p>
            <p><span className="font-semibold">Keep or change: </span>{reflection.keepChange || '—'}</p>
            <p className="text-xs text-slate-500">Your words, week of {formatLong(reflection.weekStart)}.</p>
          </blockquote>
        )}
      </section>

      <section className="card" aria-label="Learning material">
        <h2 className="text-base font-bold text-loop-ink">Learning material</h2>
        <p className="text-xs text-slate-500">
          Verified educational content only — never personalized interpretation.
        </p>
        <div className="mt-2 space-y-2">
          {eduEntries.map((e) => (
            <details key={e.id} className="rounded-xl bg-loop-mist px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-loop-ink">
                {e.title}
              </summary>
              <div className="mt-1 space-y-1 text-sm text-slate-600">
                <p><span className="font-medium text-loop-ink">What it measures: </span>{e.body!.measures}</p>
                <p><span className="font-medium text-loop-ink">What it does not establish: </span>{e.body!.notEstablished}</p>
                <p><span className="font-medium text-loop-ink">Ask your clinician: </span>{e.body!.askClinician}</p>
                <p className="text-xs">
                  Source:{' '}
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-loop-teal underline">
                    {e.sourceTitle}
                  </a>{' '}
                  (checked {formatLong(e.dateChecked)})
                </p>
              </div>
            </details>
          ))}
          {recordedUnverified.map((k) => (
            <p key={k} className="rounded-xl bg-loop-mist px-3 py-2 text-sm text-slate-500">
              {METRICS[k].label}: a verified explanation is not yet available.
            </p>
          ))}
          {recordedKinds.length === 0 && masld && (
            <details className="rounded-xl bg-loop-mist px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-loop-ink">
                {masld.title}
              </summary>
              <div className="mt-1 space-y-1 text-sm text-slate-600">
                <p>{masld.body!.measures}</p>
                <p className="text-xs">
                  Source:{' '}
                  <a href={masld.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-loop-teal underline">
                    {masld.sourceTitle}
                  </a>
                </p>
              </div>
            </details>
          )}
        </div>
      </section>

      <section className="card" aria-label="Next step">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-loop-ink">
            {labs.count === 0
              ? 'No lab results recorded yet.'
              : `Your latest recorded lab result is dated ${formatLong(labs.latestDate!)}.`}{' '}
            Bring {labs.count === 0 ? 'your questions' : 'this picture'} to your visit.
          </p>
          <Link to="/visit" className="btn-primary ml-auto">
            Continue to Visit Prep
          </Link>
        </div>
      </section>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-loop-ink">LiverLoop Guide</p>
          <Link to="/insights/guide" className="btn-secondary ml-auto !py-2 text-xs">
            Open the Guide
          </Link>
        </div>
        <p className="hint-text">
          Educational assistant for app help and verified learning material. No diagnosis, no personal interpretation.
        </p>
      </div>

      <div className="card">
        <DisclaimerStrip />
      </div>
    </div>
  );
}
