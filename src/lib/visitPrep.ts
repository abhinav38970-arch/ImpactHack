/**
 * Visit Prep domain logic (pure). Four tasks, explicit confirmations, and
 * revision-based staleness — no timestamps, no page-view auto-completion.
 *
 * - recordsRev bumps on report-relevant record changes (entries, habits,
 *   check-ins, reflections).
 * - contentRev bumps on questions/notes/items changes.
 * - Review stores recordsRev + included record IDs; stale when either the
 *   revision or the included set differs (covers period changes).
 * - Preview stores both revisions + IDs + period; stale when any differs.
 * - Confirming never bumps a revision, so no confirmation loop is possible.
 */

import type { Entry, GuideDraft, PrepItem, ReportPeriod, VisitPrepState } from './types';
import { addDaysISO } from './dates';

export const MAX_PREP_ITEMS = 20;
export const MAX_ITEM_CHARS = 140;
export const MAX_NOTES_CHARS = 2000;

export const QUESTION_LIBRARY: string[] = [
  'What do these recorded results mean in my situation?',
  'What information would be useful to track before my next visit?',
  'When should I follow up?',
  'Are my current goals appropriate for me?',
];

export function defaultVisitPrep(): VisitPrepState {
  return {
    period: { kind: 'days', days: 90 },
    noQuestions: false,
    notes: '',
    noNotes: false,
    items: [],
    reviewedRecordsRev: null,
    reviewedRecordIds: null,
    previewRecordsRev: null,
    previewContentRev: null,
    previewRecordIds: null,
    previewPeriod: null,
  };
}

export function samePeriod(a: ReportPeriod, b: ReportPeriod): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'days' && b.kind === 'days') return a.days === b.days;
  if (a.kind === 'custom' && b.kind === 'custom') return a.from === b.from && a.to === b.to;
  return a.kind === 'all';
}

/** Entry IDs included in a period, sorted. Day-bounded, local dates. */
export function recordIdsInPeriod(entries: Entry[], period: ReportPeriod, todayISO: string): string[] {
  return entries
    .filter((e) => {
      if (e.date > todayISO) return false;
      switch (period.kind) {
        case 'all':
          return true;
        case 'days':
          return e.date >= addDaysISO(todayISO, -(period.days - 1));
        case 'custom':
          return e.date >= period.from && e.date <= period.to;
      }
    })
    .map((e) => e.id)
    .sort();
}

function sameIdSet(a: string[] | null, b: string[]): boolean {
  if (a === null || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export function isReviewCurrent(
  prep: VisitPrepState,
  recordsRev: number,
  recordIdsNow: string[],
): boolean {
  return (
    prep.reviewedRecordsRev === recordsRev && sameIdSet(prep.reviewedRecordIds, recordIdsNow)
  );
}

export function isPreviewCurrent(
  prep: VisitPrepState,
  recordsRev: number,
  contentRev: number,
  recordIdsNow: string[],
): boolean {
  return (
    prep.previewRecordsRev === recordsRev &&
    prep.previewContentRev === contentRev &&
    sameIdSet(prep.previewRecordIds, recordIdsNow) &&
    prep.previewPeriod !== null &&
    samePeriod(prep.previewPeriod, prep.period)
  );
}

export interface PrepTasks {
  review: boolean;
  questions: boolean;
  notes: boolean;
  preview: boolean;
}

export function prepTasks(
  prep: VisitPrepState,
  drafts: GuideDraft[],
  recordsRev: number,
  contentRev: number,
  recordIdsNow: string[],
): PrepTasks {
  const selected = drafts.filter((d) => d.selected).length;
  return {
    review: isReviewCurrent(prep, recordsRev, recordIdsNow),
    questions: selected > 0 || prep.noQuestions,
    notes: prep.notes.trim().length > 0 || prep.noNotes,
    preview: isPreviewCurrent(prep, recordsRev, contentRev, recordIdsNow),
  };
}

export function prepTaskCount(t: PrepTasks): number {
  return [t.review, t.questions, t.notes, t.preview].filter(Boolean).length;
}

/** Unfinished user-defined items — the ONLY source of "missing information". */
export function unfinishedItems(items: PrepItem[]): PrepItem[] {
  return items.filter((i) => !i.done);
}

export function validatePrepItemText(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return 'Write the item first.';
  if (t.length > MAX_ITEM_CHARS) return `Keep items under ${MAX_ITEM_CHARS} characters.`;
  return null;
}
