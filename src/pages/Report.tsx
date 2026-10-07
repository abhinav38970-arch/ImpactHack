import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DisclaimerStrip } from '../components/bits';
import { formatEntryValue } from '../components/EntryList';
import { formatLong, todayISO } from '../lib/dates';
import { activeHabits } from '../lib/habits';
import { activityInPeriod, habitCompletionInPeriod } from '../lib/insights';
import { METRICS } from '../lib/units';
import {
  isPreviewCurrent,
  recordIdsInPeriod,
  samePeriod,
  unfinishedItems,
} from '../lib/visitPrep';
import { selectedDrafts } from '../lib/visitDrafts';
import { useApp } from '../state/AppContext';
import type { ReportPeriod } from '../lib/types';

function periodLabel(p: ReportPeriod): string {
  switch (p.kind) {
    case 'all':
      return 'All time';
    case 'days':
      return `Last ${p.days} days`;
    case 'custom':
      return `${formatLong(p.from)} – ${formatLong(p.to)}`;
  }
}

export default function Report() {
  const { activeProfile, activeMode, confirmReportPreview } = useApp();
  const entries = activeProfile?.entries ?? [];
  const habits = activeProfile?.habits ?? [];
  const checkins = activeProfile?.checkins ?? [];
  const drafts = activeProfile?.guideDrafts ?? [];
  const prep = activeProfile?.visitPrep;
  const recordsRev = activeProfile?.recordsRev ?? 0;
  const contentRev = activeProfile?.contentRev ?? 0;
  const visitDate = activeProfile?.profile.visitDate;
  const name = activeProfile?.profile.displayName ?? 'there';
  const today = todayISO();

  // Independent control: initialized from Visit Prep, never synced back.
  const [period, setPeriod] = useState<ReportPeriod>(
    () => prep?.period ?? { kind: 'days', days: 90 },
  );

  const recordIds = useMemo(
    () => recordIdsInPeriod(entries, period, today),
    [entries, period, today],
  );
  const periodEntries = useMemo(
    () => entries.filter((e) => recordIds.includes(e.id)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, recordIds],
  );
  const from = periodEntries.length > 0 ? periodEntries[periodEntries.length - 1].date : today;
  const activity = useMemo(() => activityInPeriod(entries, from, today), [entries, from, today]);
  const habitSum = useMemo(
    () => habitCompletionInPeriod(activeHabits(habits), checkins, from, today),
    [habits, checkins, from, today],
  );
  const questions = selectedDrafts(drafts).slice(0, 3);
  const missing = prep ? unfinishedItems(prep.items) : [];
  // The confirm below snapshots THIS page's period; the Visit task compares
  // against the visit period, so differing periods correctly stay incomplete.
  const matchesVisitPeriod = prep ? samePeriod(period, prep.period) : false;
  const current =
    prep && matchesVisitPeriod
      ? isPreviewCurrent(prep, recordsRev, contentRev, recordIds)
      : false;

  if (!prep) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link to="/visit" className="text-xs font-semibold text-loop-teal underline">
          ← Back to Visit Prep
        </Link>
        <div className="ml-auto flex gap-2" role="group" aria-label="Report period">
          {([
            { label: '30 days', value: { kind: 'days', days: 30 } },
            { label: '90 days', value: { kind: 'days', days: 90 } },
            { label: 'All time', value: { kind: 'all' } },
          ] as const).map((o) => (
            <button
              key={o.label}
              onClick={() => setPeriod(o.value)}
              aria-pressed={samePeriod(period, o.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                samePeriod(period, o.value)
                  ? 'bg-loop-teal text-white ring-loop-teal'
                  : 'bg-white text-slate-600 ring-slate-300 hover:bg-loop-mist'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {!matchesVisitPeriod && (
        <p className="no-print rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200" role="note">
          This preview uses a different period than Visit Prep — the Visit Prep preview task needs the periods to match.
        </p>
      )}

      <article className="card print-card" aria-label="Appointment preparation report">
        <header className="border-b border-slate-200 pb-3">
          <h1 className="text-lg font-bold text-loop-ink">LiverLoop appointment-preparation report</h1>
          <p className="text-sm text-slate-600">
            {name}
            {visitDate ? ` · Appointment: ${formatLong(visitDate)}` : ''} · Reporting period:{' '}
            {periodLabel(period)}
          </p>
          {activeMode === 'demo' && (
            <p className="mt-2 inline-block rounded-lg bg-loop-mint px-3 py-1 text-xs font-bold text-loop-ink">
              Fictional demo data — not a real patient.
            </p>
          )}
        </header>

        <section className="mt-3">
          <h2 className="text-sm font-bold text-loop-ink">Recorded measurements</h2>
          {periodEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No measurements recorded in this period.</p>
          ) : (
            <table className="mt-1 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th scope="col" className="py-1 pr-2">Date</th>
                  <th scope="col" className="py-1 pr-2">Measurement</th>
                  <th scope="col" className="py-1 pr-2">Value</th>
                  <th scope="col" className="py-1">Lab range on report</th>
                </tr>
              </thead>
              <tbody>
                {periodEntries.map((e) => (
                  <tr key={e.id} className="report-row border-b border-slate-100 last:border-0">
                    <td className="py-1 pr-2 text-slate-600">{formatLong(e.date)}</td>
                    <td className="py-1 pr-2 font-medium text-loop-ink">{METRICS[e.kind].label}</td>
                    <td className="py-1 pr-2 text-loop-ink">{formatEntryValue(e)}</td>
                    <td className="py-1 text-slate-500">
                      {e.rangeMin !== undefined ? `${e.rangeMin}–${e.rangeMax} ${e.unit}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-3">
          <h2 className="text-sm font-bold text-loop-ink">Activity and habit summary</h2>
          {activity.dates === 0 && habitSum.planned === 0 ? (
            <p className="text-sm text-slate-500">No activity entries or planned habit actions in this period.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>
                {activity.minutes} activity minutes logged across {activity.dates}{' '}
                {activity.dates === 1 ? 'date' : 'dates'}.
              </li>
              <li>
                {habitSum.completed} of {habitSum.planned} elapsed planned habit actions completed.
              </li>
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Counts only — shown together with measurements for context, not as proof of cause.
          </p>
        </section>

        <section className="mt-3">
          <h2 className="text-sm font-bold text-loop-ink">Notes</h2>
          {prep.notes.trim() !== '' ? (
            <p className="whitespace-pre-wrap text-sm text-loop-ink">{prep.notes}</p>
          ) : (
            <p className="text-sm text-slate-500">No notes added.</p>
          )}
        </section>

        <section className="mt-3">
          <h2 className="text-sm font-bold text-loop-ink">Questions for the appointment</h2>
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">No questions selected.</p>
          ) : (
            <ol className="list-decimal pl-5 text-sm text-loop-ink">
              {questions.map((q) => (
                <li key={q.id}>“{q.text}”</li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-3">
          <h2 className="text-sm font-bold text-loop-ink">Still to gather or complete</h2>
          {missing.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing outstanding.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-loop-ink">
              {missing.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Only items you chose to track are listed — nothing is assumed missing.
          </p>
        </section>

        <footer className="mt-3 border-t border-slate-200 pt-2">
          <DisclaimerStrip />
        </footer>
      </article>

      <div className="no-print card space-y-2">
        {current ? (
          <p className="text-sm font-semibold text-loop-teal" role="status">
            Report preview reviewed ✓ — this completes the Visit Prep preview task.
          </p>
        ) : (
          <>
            <button className="btn-primary" onClick={() => confirmReportPreview(recordIds, period)}>
              I reviewed this report preview
            </button>
            {!matchesVisitPeriod && (
              <p className="hint-text">
                Confirming records this period&apos;s preview. The Visit Prep task needs the Visit Prep period to match.
              </p>
            )}
          </>
        )}
        <button className="btn-secondary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <p className="hint-text">
          Uses your browser&apos;s printing. This does not send the report anywhere or confirm a doctor saw it.
        </p>
      </div>
    </div>
  );
}
