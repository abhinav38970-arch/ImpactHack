import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DisclaimerStrip, EmptyState, StorageNotice } from '../components/bits';
import { formatEntryValue } from '../components/EntryList';
import { TrendBars, TrendLines } from '../components/TrendChart';
import { diffDays, formatLong, greetingForHour, todayISO } from '../lib/dates';
import {
  activeHabits,
  isChecked,
  mondayOf,
  plannedDates,
  summaryText,
  weekSummary,
} from '../lib/habits';
import { tipForDate } from '../lib/insights';
import { aggregateActivityByDay, seriesFor, unitsForMetric } from '../lib/trends';
import { prepTaskCount, prepTasks, recordIdsInPeriod } from '../lib/visitPrep';
import { ENTRY_KINDS, METRICS } from '../lib/units';
import { useApp } from '../state/AppContext';
import type { Entry, EntryKind } from '../lib/types';

const LAB_KINDS = ['ALT', 'AST', 'GGT', 'PLATELET', 'TRIG', 'HBA1C'] as const;

function latestByKind(entries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of entries) {
    const cur = map.get(e.kind);
    if (!cur || e.date > cur.date) map.set(e.kind, e);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function previewKind(entries: Entry[]): EntryKind | null {
  const counts = new Map<EntryKind, number>();
  for (const e of entries) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const ranked = ENTRY_KINDS.filter((k) => (counts.get(k) ?? 0) > 0).sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
  );
  return ranked[0] ?? null;
}

type Tab = 'overview' | 'measure' | 'trend';

export default function Dashboard() {
  const { activeProfile, toggleCheckin } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [showAllMeasures, setShowAllMeasures] = useState(false);
  const entries = activeProfile?.entries ?? [];
  const habits = activeProfile?.habits ?? [];
  const checkins = activeProfile?.checkins ?? [];
  const reflections = activeProfile?.reflections ?? [];
  const name = activeProfile?.profile.displayName ?? 'there';
  const visitDate = activeProfile?.profile.visitDate;
  const today = todayISO();
  const weekStart = mondayOf(today);

  const labs = entries.filter((e) => (LAB_KINDS as readonly string[]).includes(e.kind));
  const latestAnyDate = entries.length > 0 ? entries.map((e) => e.date).sort().at(-1)! : null;
  const latest = latestByKind(entries).slice(0, 8);
  const labKinds = new Set(labs.map((e) => e.kind)).size;

  const actives = activeHabits(habits);
  const scheduledToday = actives.filter((h) => plannedDates(h, today).includes(today)).slice(0, 3);
  const incompleteToday = scheduledToday.filter((h) => !isChecked(checkins, h.id, today));
  const week = weekSummary(actives, checkins, weekStart, today);

  const dow = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10))).getDay();
  const isWeekend = dow === 0 || dow === 5 || dow === 6;
  const reflectionDone = reflections.some((r) => r.weekStart === weekStart);
  const showNudge = isWeekend && actives.length > 0 && !reflectionDone;

  const pKind = previewKind(entries);
  const pUnits = pKind ? unitsForMetric(entries, pKind) : [];
  const pUnit = pUnits[0] ?? null;
  const pSeries = pKind && pUnit ? seriesFor(entries, pKind, pUnit, today, 'all').slice(-12) : [];

  const tip = tipForDate(today);

  const prep = activeProfile?.visitPrep;
  const recordsRev = activeProfile?.recordsRev ?? 0;
  const contentRev = activeProfile?.contentRev ?? 0;
  const drafts = activeProfile?.guideDrafts ?? [];
  const visitRecordIds = prep ? recordIdsInPeriod(entries, prep.period, today) : [];
  const tasks = prep ? prepTasks(prep, drafts, recordsRev, contentRev, visitRecordIds) : null;
  const tasksDone = tasks ? prepTaskCount(tasks) : 0;

  const isEmpty = entries.length === 0 && actives.length === 0;
  const showPrep = !isEmpty && incompleteToday.length === 0 && visitDate && tasksDone < 4;
  const hero = isEmpty
    ? { text: 'Start your loop — record a result or choose a small habit.', cta: 'Add your first entry', to: '/log' }
    : incompleteToday.length > 0
      ? { text: `${incompleteToday.length} habit${incompleteToday.length === 1 ? '' : 's'} waiting for today’s check-in.`, cta: 'Complete check-in', to: '/habits' }
      : showPrep
        ? { text: `Visit prep: ${tasksDone} of 4 done.`, cta: 'Continue prep', to: '/visit' }
        : {
            text: entries.length > 0 ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · latest ${formatLong(latestAnyDate!)}` : 'Habits on track — add a measurement to see trends.',
            cta: 'Review trends',
            to: '/trends',
          };

  return (
    <div className="w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-loop-ink">
            {greetingForHour(new Date().getHours())}, {name}
          </h1>
          <p className="text-sm text-slate-500">{formatLong(today)} · Record → Reflect → Prepare</p>
        </div>
        <div className="ml-auto">
          {!visitDate ? (
            <Link to="/settings" className="text-xs font-semibold text-loop-teal underline">No visit date — add one</Link>
          ) : (
            (() => {
              const n = diffDays(today, visitDate);
              return (
                <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-loop-ink ring-1 ring-black/10">
                  {n < 0 ? 'Visit passed — update in Settings' : `Next visit: ${formatLong(visitDate)}${n === 0 ? ' (today)' : ` (in ${n}d)`}`}
                </span>
              );
            })()
          )}
        </div>
      </div>

      {/* Hero: exactly one primary action */}
      <section className="card flex flex-col gap-3 bg-loop-teal !text-white sm:flex-row sm:items-center" aria-label="Your next step">
        <div className="flex-1">
          <h2 className="text-base font-bold">Your next step</h2>
          <p className="mt-1 text-sm text-white/90">{hero.text}</p>
        </div>
        <Link to={hero.to} className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-loop-teal hover:bg-loop-mist">
          {hero.cta}
        </Link>
      </section>

      {/* Today + Progress side by side on wide screens */}
      <div className="grid gap-5 xl:grid-cols-5">
      {/* Today — single focus card */}
      <section className="card xl:col-span-2" aria-label="Today">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-loop-ink">Today</h2>
          <Link to="/habits" className="ml-auto text-xs font-semibold text-loop-teal underline">Open Habits</Link>
        </div>
        {actives.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No habits yet — <Link to="/habits" className="font-semibold text-loop-teal underline">choose one small habit</Link> to build consistency.
          </p>
        ) : scheduledToday.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing scheduled today. Nice — prep or trends when ready.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {scheduledToday.map((h) => {
              const done = isChecked(checkins, h.id, today);
              return (
                <li key={h.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-loop-mist px-3 py-2">
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-teal-700" checked={done} onChange={() => toggleCheckin(h.id, today)} aria-label={done ? `Undo ${h.title}` : `Complete ${h.title}`} />
                    <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'font-medium text-loop-ink'}`}>{h.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {showNudge && (
          <div className="mt-3 rounded-xl border-l-4 border-loop-teal bg-loop-mist/60 p-3">
            <p className="text-sm font-semibold text-loop-ink">2-minute weekly review</p>
            <p className="text-xs text-slate-600">What helped — what got in the way?</p>
            <Link to="/habits" className="btn-primary mt-2 !py-1.5 text-xs">Reflect</Link>
          </div>
        )}
      </section>

      {/* Progress — tabbed, not crammed */}
      <section className="card xl:col-span-3" aria-label="Progress at a glance">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-loop-ink">Progress</h2>
          <div className="ml-auto flex gap-1 rounded-full bg-loop-mist p-1" role="tablist" aria-label="Progress views">
            {(['overview', 'measure', 'trend'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? 'bg-white text-loop-ink shadow-sm' : 'text-slate-500'}`}
              >
                {t === 'overview' ? 'Overview' : t === 'measure' ? 'Measures' : 'Trends'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-loop-mist p-3">
              <p className="text-xs font-semibold text-slate-500">Labs</p>
              <p className="text-sm font-bold text-loop-ink">{labs.length === 0 ? 'None yet' : `${labKinds} type${labKinds === 1 ? '' : 's'}`}</p>
            </div>
            <div className="rounded-xl bg-loop-mist p-3">
              <p className="text-xs font-semibold text-slate-500">This week</p>
              <p className="text-sm font-bold text-loop-ink">{week.planned === 0 ? 'No plans' : `${week.completed}/${week.planned}`}</p>
              <p className="text-[11px] text-slate-500">{summaryText(week)}</p>
            </div>
            <div className="rounded-xl bg-loop-mist p-3">
              <p className="text-xs font-semibold text-slate-500">Visit prep</p>
              <p className="text-sm font-bold text-loop-ink">{tasksDone}/4 done</p>
              <Link to="/visit" className="text-[11px] font-semibold text-loop-teal underline">Continue →</Link>
            </div>
            <div className="rounded-xl bg-loop-mist p-3">
              <p className="text-xs font-semibold text-slate-500">Entries</p>
              <p className="text-sm font-bold text-loop-ink">{entries.length}</p>
              <Link to="/log" className="text-[11px] font-semibold text-loop-teal underline">Open Log →</Link>
            </div>
          </div>
        )}

        {tab === 'measure' && (
          <div className="mt-3">
            {latest.length === 0 ? (
              <EmptyState title="Nothing recorded yet" body="Add a lab, measurement, or activity and it shows here." actionLabel="Go to Log" actionTo="/log" />
            ) : (
              <>
                <dl className="divide-y divide-slate-100">
                  {(showAllMeasures ? latest : latest.slice(0, 4)).map((e) => (
                    <div key={e.kind} className="flex items-baseline gap-2 py-2">
                      <dt className="text-sm text-slate-600">{METRICS[e.kind].label}</dt>
                      <dd className="ml-auto text-sm font-semibold text-loop-ink">{formatEntryValue(e)}</dd>
                      <dd className="w-20 shrink-0 text-right text-xs text-slate-500">{formatLong(e.date)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2 flex gap-2">
                  {latest.length > 4 && (
                    <button onClick={() => setShowAllMeasures((v) => !v)} className="text-xs font-semibold text-loop-teal underline">
                      {showAllMeasures ? 'Show less' : `Show all ${latest.length}`}
                    </button>
                  )}
                  <Link to="/log" className="ml-auto text-xs font-semibold text-loop-teal underline">Open Log →</Link>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'trend' && (
          <div className="mt-3">
            {!pKind || !pUnit ? (
              <p className="text-sm text-slate-500">Log 2+ results to see a trend. <Link to="/log" className="font-semibold text-loop-teal underline">Add entry</Link></p>
            ) : pSeries.length >= 2 || (pKind === 'ACTIVITY' && pSeries.length >= 1) ? (
              <>
                {pKind === 'ACTIVITY' ? (
                  <TrendBars bars={aggregateActivityByDay(pSeries).map((d) => ({ x: d.date, y: d.minutes }))} unit={pUnit} description="Recent daily activity." />
                ) : pKind === 'BP' ? (
                  <TrendLines
                    series={[
                      { label: 'Systolic', color: '#0E7C7B', points: pSeries.map((e) => ({ x: e.date, y: e.systolic ?? 0 })) },
                      { label: 'Diastolic', color: '#475569', points: pSeries.map((e) => ({ x: e.date, y: e.diastolic ?? 0 })) },
                    ]}
                    unit={pUnit}
                    description="Recent blood pressure."
                  />
                ) : (
                  <TrendLines series={[{ label: METRICS[pKind].label, color: '#0E7C7B', points: pSeries.map((e) => ({ x: e.date, y: e.value ?? 0 })) }]} unit={pUnit} description={`Recent ${METRICS[pKind].label}.`} />
                )}
                <Link to="/trends" className="mt-2 inline-block text-xs font-semibold text-loop-teal underline">Open Trends →</Link>
              </>
            ) : (
              <p className="text-sm text-slate-600">{METRICS[pKind].label}: 1 measurement — trends appear after 2+. <Link to="/trends" className="font-semibold text-loop-teal underline">Open Trends</Link></p>
            )}
          </div>
        )}
      </section>
      </div>

      <details className="card !py-3" aria-label="Tip of the day">
        <summary className="cursor-pointer text-sm font-semibold text-loop-ink">Tip of the day · <span className="font-normal text-slate-500">verified learning</span></summary>
        {tip?.body ? (
          <div className="mt-2 text-sm text-slate-600">
            <p className="font-semibold text-loop-ink">{tip.title}</p>
            <p className="mt-1">{tip.body.measures}</p>
            <p className="mt-1 text-xs">Source: <a href={tip.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-loop-teal underline">{tip.sourceTitle}</a> · <Link to="/insights" className="underline">More in Insights</Link></p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">New here? Log a result, then check Trends. <Link to="/insights" className="font-medium text-loop-teal underline">Insights →</Link></p>
        )}
      </details>

      {isWeekend && actives.length > 0 && reflectionDone && <p className="text-center text-xs text-slate-500">Reflection saved for this week ✓</p>}

      <div className="card space-y-2">
        <DisclaimerStrip />
        <StorageNotice />
      </div>
    </div>
  );
}
