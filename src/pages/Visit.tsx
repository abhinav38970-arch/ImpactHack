import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DisclaimerStrip } from '../components/bits';
import { formatEntryValue } from '../components/EntryList';
import { downloadCsv, exportFilename, toCsv } from '../lib/csv';
import { formatLong, todayISO } from '../lib/dates';
import { METRICS } from '../lib/units';
import { MAX_DRAFT_CHARS, MAX_SELECTED_DRAFTS, selectedDrafts } from '../lib/visitDrafts';
import {
  MAX_ITEM_CHARS,
  MAX_NOTES_CHARS,
  QUESTION_LIBRARY,
  isPreviewCurrent,
  isReviewCurrent,
  prepTaskCount,
  prepTasks,
  recordIdsInPeriod,
  samePeriod,
  unfinishedItems,
  validatePrepItemText,
} from '../lib/visitPrep';
import { useApp } from '../state/AppContext';
import type { ReportPeriod } from '../lib/types';

function PeriodControl({
  period,
  onChange,
}: {
  period: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
}) {
  const [custom, setCustom] = useState({ from: '', to: '' });
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reporting period">
      {([
        { label: '30 days', value: { kind: 'days', days: 30 } },
        { label: '90 days', value: { kind: 'days', days: 90 } },
        { label: 'All time', value: { kind: 'all' } },
      ] as const).map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
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
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-loop-teal underline">
          Custom dates
        </summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label>
            From
            <input
              type="date"
              className="field !mt-0 !w-auto"
              value={custom.from}
              max={todayISO()}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            />
          </label>
          <label>
            To
            <input
              type="date"
              className="field !mt-0 !w-auto"
              value={custom.to}
              max={todayISO()}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            />
          </label>
          <button
            className="btn-secondary !px-3 !py-1.5 text-xs"
            disabled={custom.from === '' || custom.to === '' || custom.from > custom.to}
            onClick={() => onChange({ kind: 'custom', from: custom.from, to: custom.to })}
          >
            Apply
          </button>
        </div>
      </details>
    </div>
  );
}

export default function Visit() {
  const {
    activeProfile,
    activeMode,
    setVisitPeriod,
    confirmRecordReview,
    saveVisitNotes,
    setVisitNoNotes,
    setVisitNoQuestions,
    addPrepItem,
    togglePrepItem,
    removePrepItem,
    addQuestion,
    toggleGuideDraftSelected,
    removeGuideDraft,
    moveGuideDraft,
  } = useApp();

  const entries = activeProfile?.entries ?? [];
  const drafts = activeProfile?.guideDrafts ?? [];
  const prep = activeProfile?.visitPrep;
  const recordsRev = activeProfile?.recordsRev ?? 0;
  const contentRev = activeProfile?.contentRev ?? 0;
  const visitDate = activeProfile?.profile.visitDate;
  const today = todayISO();

  const [customQ, setCustomQ] = useState('');
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);
  const [capNote, setCapNote] = useState(false);

  const period: ReportPeriod = prep?.period ?? { kind: 'days', days: 90 };
  const recordIds = useMemo(
    () => (prep ? recordIdsInPeriod(entries, period, today) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, prep?.period, today],
  );
  const periodEntries = useMemo(
    () => entries.filter((e) => recordIds.includes(e.id)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, recordIds],
  );

  const tasks = useMemo(
    () =>
      prep
        ? prepTasks(prep, drafts, recordsRev, contentRev, recordIds)
        : { review: false, questions: false, notes: false, preview: false },
    [prep, drafts, recordsRev, contentRev, recordIds],
  );
  const doneCount = prepTaskCount(tasks);
  const reviewStale =
    !!prep && prep.reviewedRecordsRev !== null && !isReviewCurrent(prep, recordsRev, recordIds);
  const previewStale =
    !!prep &&
    prep.previewRecordsRev !== null &&
    !isPreviewCurrent(prep, recordsRev, contentRev, recordIds);

  const selected = selectedDrafts(drafts);
  const unselected = drafts.filter((d) => !d.selected);
  const missing = prep ? unfinishedItems(prep.items) : [];

  if (!prep) return null;

  function exportPeriodCsv() {
    const header = ['date', 'metric', 'value', 'systolic', 'diastolic', 'unit', 'range_min', 'range_max', 'note', 'fictional_demo'];
    const rows = periodEntries.map((e) => [
      e.date,
      METRICS[e.kind].label,
      e.value ?? '',
      e.systolic ?? '',
      e.diastolic ?? '',
      e.unit,
      e.rangeMin ?? '',
      e.rangeMax ?? '',
      e.note ?? '',
      activeMode === 'demo' ? 'yes' : 'no',
    ]);
    downloadCsv(exportFilename('visit-measurements', today), toCsv(header, rows));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-loop-ink">Visit Prep</h1>
        <p className="text-sm text-slate-500">
          {visitDate ? `Appointment: ${formatLong(visitDate)}.` : 'No appointment date set — add one in Settings.'}{' '}
          <strong className="text-loop-ink">{doneCount} of 4 preparation tasks completed.</strong>{' '}
          Task completion only — not medical readiness.
        </p>
      </div>

      <section className="card space-y-2" aria-label="Reporting period">
        <h2 className="text-sm font-semibold text-loop-ink">Reporting period</h2>
        <PeriodControl period={period} onChange={setVisitPeriod} />
        <p className="hint-text">Changing the period re-checks which records are included.</p>
      </section>

      <section className="card space-y-2" aria-label="1. Review recorded information">
        <h2 className="text-base font-bold text-loop-ink">
          1. Review recorded information {tasks.review && <span aria-label="done">✓</span>}
        </h2>
        {periodEntries.length === 0 ? (
          <p className="text-sm text-slate-500">
            No records in this period. <Link to="/log" className="font-semibold text-loop-teal underline">Add one in Log</Link>, or widen the period.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {periodEntries.map((e) => (
              <li key={e.id} className="py-1.5">
                <span className="font-medium text-loop-ink">{METRICS[e.kind].label}</span>{' '}
                <span className="text-slate-600">{formatEntryValue(e)}</span>{' '}
                <span className="text-xs text-slate-500">{formatLong(e.date)}</span>
                {e.rangeMin !== undefined && (
                  <span className="block text-xs text-slate-500">
                    Lab range on report: {e.rangeMin}–{e.rangeMax} {e.unit}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {reviewStale && (
          <p className="text-sm font-medium text-amber-700" role="note">
            Recorded information changed since your last review — please review again.
          </p>
        )}
        <button
          className="btn-primary"
          disabled={tasks.review}
          onClick={() => confirmRecordReview(recordIds)}
        >
          {tasks.review ? 'Reviewed ✓' : 'I reviewed this information'}
        </button>
      </section>

      <section className="card space-y-3" aria-label="2. Choose appointment questions">
        <h2 className="text-base font-bold text-loop-ink">
          2. Choose appointment questions {tasks.questions && <span aria-label="done">✓</span>}
        </h2>
        <p className="hint-text">
          Up to {MAX_SELECTED_DRAFTS} selected for the report. Saved suggestions from the Guide appear here too.
        </p>
        {selected.length === 0 && !prep.noQuestions && (
          <p className="text-sm text-slate-500">No questions selected yet.</p>
        )}
        <ol className="space-y-2">
          {selected.map((d, i) => (
            <li key={d.id} className="flex items-start gap-2 rounded-xl bg-loop-mist px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-loop-teal text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="flex-1 text-sm text-loop-ink">
                “{d.text}”
                {d.source && d.source !== 'custom' && (
                  <span className="ml-1 text-[11px] text-slate-500">({d.source})</span>
                )}
              </p>
              <span className="flex shrink-0 gap-1">
                <button aria-label={`Move “${d.text}” earlier`} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-white" disabled={i === 0} onClick={() => moveGuideDraft(d.id, -1)}>↑</button>
                <button aria-label={`Move “${d.text}” later`} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-white" disabled={i === selected.length - 1} onClick={() => moveGuideDraft(d.id, 1)}>↓</button>
                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-loop-teal underline" onClick={() => toggleGuideDraftSelected(d.id)}>Unselect</button>
                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 underline" onClick={() => removeGuideDraft(d.id)}>Remove</button>
              </span>
            </li>
          ))}
        </ol>
        {unselected.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500">Saved but not selected</p>
            <ul className="mt-1 space-y-1">
              {unselected.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <p className="flex-1 text-slate-600">“{d.text}”</p>
                  <button className="text-xs font-semibold text-loop-teal underline" onClick={() => toggleGuideDraftSelected(d.id)}>Select</button>
                  <button className="text-xs font-semibold text-red-700 underline" onClick={() => removeGuideDraft(d.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-slate-500">Question library</p>
          <ul className="mt-1 space-y-1">
            {QUESTION_LIBRARY.map((q) => (
              <li key={q} className="flex items-center gap-2 text-sm">
                <p className="flex-1 text-slate-600">“{q}”</p>
                <button
                  className="text-xs font-semibold text-loop-teal underline"
                  onClick={() => {
                    const ok = addQuestion(q, 'library');
                    setCapNote(!ok);
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <label htmlFor="visit-custom-q" className="sr-only">Write your own question</label>
          <input
            id="visit-custom-q"
            className="field !mt-0 flex-1"
            value={customQ}
            maxLength={MAX_DRAFT_CHARS}
            onChange={(e) => setCustomQ(e.target.value)}
            placeholder="Write your own question…"
          />
          <button
            className="btn-secondary shrink-0"
            disabled={customQ.trim() === ''}
            onClick={() => {
              const ok = addQuestion(customQ, 'custom');
              if (ok) setCustomQ('');
              setCapNote(!ok);
            }}
          >
            Add
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-teal-700"
            checked={prep.noQuestions}
            onChange={(e) => setVisitNoQuestions(e.target.checked)}
          />
          No questions to add right now
        </label>
        {capNote && (
          <p className="text-xs text-amber-700" role="note">
            Saved below as unselected — Visit Prep holds up to {MAX_SELECTED_DRAFTS} selected questions.
          </p>
        )}
      </section>

      <section className="card space-y-3" aria-label="3. Add notes">
        <h2 className="text-base font-bold text-loop-ink">
          3. Add notes {tasks.notes && <span aria-label="done">✓</span>}
        </h2>
        <label htmlFor="visit-notes" className="label">
          What changed, what you tried, or what you want to discuss
        </label>
        <textarea
          id="visit-notes"
          className="field"
          rows={3}
          maxLength={MAX_NOTES_CHARS}
          value={noteDraft ?? prep.notes}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Your words, kept exactly as written."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-primary"
            disabled={(noteDraft ?? prep.notes).trim() === '' || (noteDraft ?? prep.notes) === prep.notes}
            onClick={() => {
              saveVisitNotes(noteDraft ?? prep.notes);
              setNoteDraft(null);
            }}
          >
            Save notes
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-teal-700"
              checked={prep.noNotes}
              onChange={(e) => setVisitNoNotes(e.target.checked)}
            />
            No notes to add
          </label>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-sm font-semibold text-loop-ink">Things to gather or complete</h3>
          <p className="hint-text">Only items you add here can appear as missing information. Nothing is assumed.</p>
          <ul className="mt-1 space-y-1">
            {prep.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-700"
                  checked={item.done}
                  onChange={() => togglePrepItem(item.id)}
                  aria-label={`Mark “${item.text}” ${item.done ? 'not done' : 'done'}`}
                />
                <span className={`flex-1 ${item.done ? 'text-slate-400 line-through' : 'text-loop-ink'}`}>
                  {item.text}
                </span>
                <button className="text-xs font-semibold text-red-700 underline" onClick={() => removePrepItem(item.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <label htmlFor="visit-item" className="sr-only">New preparation item</label>
            <input
              id="visit-item"
              className="field !mt-0 flex-1"
              value={itemDraft}
              maxLength={MAX_ITEM_CHARS}
              onChange={(e) => {
                setItemDraft(e.target.value);
                setItemError(null);
              }}
              placeholder="e.g. Find my September report"
            />
            <button
              className="btn-secondary shrink-0"
              onClick={() => {
                const err = validatePrepItemText(itemDraft);
                if (err || prep.items.length >= 20) {
                  setItemError(err ?? 'Up to 20 items.');
                  return;
                }
                addPrepItem(itemDraft);
                setItemDraft('');
              }}
            >
              Add
            </button>
          </div>
          {itemError && <p className="error-text" role="alert">{itemError}</p>}
          {missing.length > 0 && (
            <p className="mt-2 text-sm text-amber-700" role="note">
              Still open: {missing.map((i) => `“${i.text}”`).join(', ')}
            </p>
          )}
        </div>
      </section>

      <section className="card space-y-2" aria-label="4. Preview report">
        <h2 className="text-base font-bold text-loop-ink">
          4. Preview report {tasks.preview && <span aria-label="done">✓</span>}
        </h2>
        {previewStale && (
          <p className="text-sm font-medium text-amber-700" role="note">
            Your information changed since the last preview — please preview again.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link to="/visit/report" className="btn-primary">
            Preview report
          </Link>
          <button className="btn-secondary" onClick={exportPeriodCsv} disabled={periodEntries.length === 0}>
            Export period CSV
          </button>
        </div>
        <p className="hint-text">
          Previewing opens the report — a separate explicit step there marks this task complete.
        </p>
      </section>

      <div className="card">
        <DisclaimerStrip />
      </div>
    </div>
  );
}
