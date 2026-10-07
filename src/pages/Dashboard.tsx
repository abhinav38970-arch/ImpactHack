import { Link } from 'react-router-dom';
import { DisclaimerStrip, EmptyState, StorageNotice, SummaryCard } from '../components/bits';
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
import { aggregateActivityByDay, seriesFor, unitsForMetric } from '../lib/trends';
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

export default function Dashboard() {
  const { activeProfile, toggleCheckin } = useApp();
  const entries = activeProfile?.entries ?? [];
  const habits = activeProfile?.habits ?? [];
  const checkins = activeProfile?.checkins ?? [];
  const reflections = activeProfile?.reflections ?? [];
  const name = activeProfile?.profile.displayName ?? 'there';
  const visitDate = activeProfile?.profile.visitDate;
  const today = todayISO();
  const weekStart = mondayOf(today);

  const labs = entries.filter((e) =>
    (LAB_KINDS as readonly string[]).includes(e.kind),
  );
  const bodyActivity = entries.filter(
    (e) => METRICS[e.kind].category !== 'Labs',
  );
  const latestLabDate =
    labs.length > 0 ? labs.map((e) => e.date).sort().at(-1)! : null;
  const latestAnyDate =
    entries.length > 0 ? entries.map((e) => e.date).sort().at(-1)! : null;
  const latest = latestByKind(entries).slice(0, 8);

  const labKinds = new Set(labs.map((e) => e.kind)).size;
  const activityMin = entries
    .filter((e) => e.kind === 'ACTIVITY')
    .reduce((s, e) => s + (e.value ?? 0), 0);

  // Habits: today's scheduled checklist (max 3 — at most 3 can be active).
  const actives = activeHabits(habits);
  const scheduledToday = actives
    .filter((h) => plannedDates(h, today).includes(today))
    .slice(0, 3);
  const incompleteToday = scheduledToday.filter(
    (h) => !isChecked(checkins, h.id, today),
  );
  const week = weekSummary(actives, checkins, weekStart, today);

  // Reflection nudge: Fri–Sun only, hidden once this week's reflection exists.
  const dow = new Date(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  ).getDay();
  const isWeekend = dow === 0 || dow === 5 || dow === 6;
  const reflectionDone = reflections.some((r) => r.weekStart === weekStart);
  const showNudge = isWeekend && actives.length > 0 && !reflectionDone;

  // Trend preview: the metric with the most recorded data.
  const pKind = previewKind(entries);
  const pUnits = pKind ? unitsForMetric(entries, pKind) : [];
  const pUnit = pUnits[0] ?? null;
  const pSeries =
    pKind && pUnit ? seriesFor(entries, pKind, pUnit, today, 'all').slice(-12) : [];

  // Hero order: start → check-in → trends. Never Visit Prep (unfinished).
  const isEmpty = entries.length === 0 && actives.length === 0;
  const hero = isEmpty
    ? {
        text: 'Start your loop — record a result or choose a small habit to track.',
        cta: 'Add your first entry',
        to: '/log',
        secondary: { label: 'or choose a habit', to: '/habits' },
      }
    : incompleteToday.length > 0
      ? {
          text: `${incompleteToday.length} scheduled ${incompleteToday.length === 1 ? 'habit needs' : 'habits need'} today's check-in.`,
          cta: "Complete today's check-in",
          to: '/habits',
          secondary: null,
        }
      : {
          text:
            entries.length > 0
              ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} recorded. Latest recorded result: ${formatLong(latestAnyDate!)}.`
              : 'Habits on track — add measurements to see trends.',
          cta: 'Review recorded trends',
          to: '/trends',
          secondary: null,
        };

  let visitPill: React.ReactNode;
  if (!visitDate) {
    visitPill = (
      <Link to="/settings" className="text-xs font-semibold text-loop-teal underline">
        No visit date set — add one in Settings
      </Link>
    );
  } else {
    const n = diffDays(today, visitDate);
    visitPill = (
      <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-loop-ink ring-1 ring-black/10">
        {n < 0
          ? `Visit date ${formatLong(visitDate)} passed — update it in Settings`
          : `Next visit: ${formatLong(visitDate)}${n === 0 ? ' (today)' : ` (in ${n} day${n === 1 ? '' : 's'})`}`}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-xl font-bold text-loop-ink">
            {greetingForHour(new Date().getHours())}, {name}
          </h1>
          <p className="text-sm text-slate-500">{formatLong(today)}</p>
        </div>
        <div className="ml-auto">{visitPill}</div>
      </div>

      {/* Hero: exactly one primary action */}
      <section className="card flex flex-col gap-3 bg-loop-teal !text-white sm:flex-row sm:items-center" aria-label="Your next step">
        <div className="flex-1">
          <h2 className="text-base font-bold">Your next step</h2>
          <p className="mt-1 text-sm text-white/90">{hero.text}</p>
          {hero.secondary && (
            <Link to={hero.secondary.to} className="mt-1 inline-block text-sm font-semibold text-white underline">
              {hero.secondary.label}
            </Link>
          )}
        </div>
        <Link
          to={hero.to}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-loop-teal hover:bg-loop-mist"
        >
          {hero.cta}
        </Link>
      </section>

      {/* Four summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Lab records">
          {labs.length === 0 ? (
            <p className="text-slate-500">No lab records yet.</p>
          ) : (
            <>
              <p className="text-lg font-bold">{labKinds} {labKinds === 1 ? 'type' : 'types'} recorded</p>
              <p className="text-slate-500">Latest recorded result: {formatLong(latestLabDate!)}</p>
            </>
          )}
        </SummaryCard>
        <SummaryCard title="Body & activity">
          {bodyActivity.length === 0 ? (
            <p className="text-slate-500">No body or activity entries yet.</p>
          ) : (
            <>
              <p className="text-lg font-bold">{bodyActivity.length} {bodyActivity.length === 1 ? 'entry' : 'entries'}</p>
              <p className="text-slate-500">
                {activityMin > 0 ? `${activityMin} activity minutes logged` : 'Latest recorded result: ' + formatLong(bodyActivity.map((e) => e.date).sort().at(-1)!)}
              </p>
            </>
          )}
        </SummaryCard>
        <SummaryCard title="Habit consistency">
          {actives.length === 0 ? (
            <p className="text-slate-500">
              No active habits. <Link to="/habits" className="font-semibold text-loop-teal underline">Choose one</Link>
            </p>
          ) : (
            <>
              <p className="text-lg font-bold">
                {week.planned === 0 ? 'No planned actions yet' : `${week.completed}/${week.planned} planned`}
              </p>
              <p className="text-slate-500">This week: {summaryText(week)}</p>
            </>
          )}
        </SummaryCard>
        <SummaryCard title="Visit preparation" pending="Visit preparation arrives in a later phase.">
          <p className="text-slate-500">Not started.</p>
        </SummaryCard>
      </div>

      {/* Today's checklist */}
      {actives.length > 0 && (
        <section className="card" aria-label="Today's checklist">
          <div className="flex items-center">
            <h2 className="text-base font-bold text-loop-ink">Today&apos;s checklist</h2>
            <Link to="/habits" className="ml-auto text-xs font-semibold text-loop-teal underline">
              Open Habits
            </Link>
          </div>
          {scheduledToday.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing scheduled today.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {scheduledToday.map((h) => {
                const done = isChecked(checkins, h.id, today);
                return (
                  <li key={h.id}>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-loop-mist px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-teal-700"
                        checked={done}
                        onChange={() => toggleCheckin(h.id, today)}
                        aria-label={done ? `Undo today's ${h.title}` : `Complete today's ${h.title}`}
                      />
                      <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'font-medium text-loop-ink'}`}>
                        {h.title}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Trend preview */}
      {pKind && pUnit && (
        <section className="card" aria-label="Trend preview">
          <div className="flex items-center">
            <h2 className="text-base font-bold text-loop-ink">
              Trend preview: {METRICS[pKind].label}
            </h2>
            <Link to="/trends" className="ml-auto text-xs font-semibold text-loop-teal underline">
              Open Trends
            </Link>
          </div>
          <div className="mt-2">
            {pSeries.length >= 2 || (pKind === 'ACTIVITY' && pSeries.length >= 1) ? (
              pKind === 'ACTIVITY' ? (
                <TrendBars
                  bars={aggregateActivityByDay(pSeries).map((d) => ({ x: d.date, y: d.minutes }))}
                  unit={pUnit}
                  description={`Recent daily logged activity minutes.`}
                />
              ) : pKind === 'BP' ? (
                <TrendLines
                  series={[
                    { label: 'Systolic', color: '#0E7C7B', points: pSeries.map((e) => ({ x: e.date, y: e.systolic ?? 0 })) },
                    { label: 'Diastolic', color: '#475569', points: pSeries.map((e) => ({ x: e.date, y: e.diastolic ?? 0 })) },
                  ]}
                  unit={pUnit}
                  description={`Recent blood pressure readings.`}
                />
              ) : (
                <TrendLines
                  series={[
                    { label: METRICS[pKind].label, color: '#0E7C7B', points: pSeries.map((e) => ({ x: e.date, y: e.value ?? 0 })) },
                  ]}
                  unit={pUnit}
                  description={`Recent ${METRICS[pKind].label} values.`}
                />
              )
            ) : (
              <p className="text-sm text-slate-600">
                {METRICS[pKind].label}: {pSeries[0]?.value ?? '—'} {pUnit} on{' '}
                {pSeries[0] ? formatLong(pSeries[0].date) : '—'} — one measurement
                doesn&apos;t show a trend yet.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Weekly reflection nudge */}
      {showNudge && (
        <section className="card !border-l-4 !border-l-loop-teal" aria-label="Weekly reflection nudge">
          <h2 className="text-base font-bold text-loop-ink">Two-minute weekly review</h2>
          <p className="mt-1 text-sm text-slate-600">
            What helped this week — and what got in the way?
          </p>
          <Link to="/habits" className="btn-primary mt-3">
            Reflect on this week
          </Link>
        </section>
      )}
      {isWeekend && actives.length > 0 && reflectionDone && (
        <p className="text-sm text-slate-500">Reflection saved for this week.</p>
      )}

      {/* Latest measurements */}
      <section className="card" aria-label="Latest measurements">
        <div className="flex items-center">
          <h2 className="text-base font-bold text-loop-ink">Latest measurements</h2>
          <Link to="/log" className="ml-auto text-xs font-semibold text-loop-teal underline">
            Open Log
          </Link>
        </div>
        {latest.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nothing recorded yet"
              body="Add a lab result, measurement, or activity entry and it will show up here with its value, unit, and date."
              actionLabel="Go to Log"
              actionTo="/log"
            />
          </div>
        ) : (
          <dl className="mt-3 divide-y divide-slate-100">
            {latest.map((e) => (
              <div key={e.kind} className="flex items-baseline gap-2 py-2">
                <dt className="text-sm font-medium text-slate-600">{METRICS[e.kind].label}</dt>
                <dd className="ml-auto text-sm font-semibold text-loop-ink">
                  {formatEntryValue(e)}
                </dd>
                <dd className="w-24 shrink-0 text-right text-xs text-slate-500">
                  {formatLong(e.date)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="card space-y-2">
        <DisclaimerStrip />
        <StorageNotice />
      </div>
    </div>
  );
}
