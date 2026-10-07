import { describe, expect, it } from 'vitest';
import {
  defaultVisitPrep,
  isPreviewCurrent,
  isReviewCurrent,
  prepTaskCount,
  prepTasks,
  recordIdsInPeriod,
  samePeriod,
  unfinishedItems,
  validatePrepItemText,
} from './visitPrep';
import type { GuideDraft } from './types';

function drafts(n: number): GuideDraft[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    text: `Q${i}?`,
    selected: true,
    createdAt: 'x',
  }));
}

describe('review and preview invalidation', () => {
  it('starts incomplete and completes on explicit confirmation', () => {
    const prep = defaultVisitPrep();
    const ids = ['a', 'b'];
    expect(isReviewCurrent(prep, 3, ids)).toBe(false);
    expect(isPreviewCurrent(prep, 3, 1, ids)).toBe(false);
    const reviewed = { ...prep, reviewedRecordsRev: 3, reviewedRecordIds: ids };
    expect(isReviewCurrent(reviewed, 3, ids)).toBe(true);
    // Confirming never completes the preview by itself.
    expect(isPreviewCurrent(reviewed, 3, 1, ids)).toBe(false);
  });

  it('invalidates review when records change or the set changes', () => {
    const prep = {
      ...defaultVisitPrep(),
      reviewedRecordsRev: 3,
      reviewedRecordIds: ['a', 'b'],
    };
    expect(isReviewCurrent(prep, 4, ['a', 'b'])).toBe(false);
    expect(isReviewCurrent(prep, 3, ['a', 'b', 'c'])).toBe(false);
    expect(isReviewCurrent(prep, 3, ['a', 'b'])).toBe(true);
  });

  it('invalidates preview on notes/questions changes, not review of same data', () => {
    const prep = {
      ...defaultVisitPrep(),
      reviewedRecordsRev: 3,
      reviewedRecordIds: ['a'],
      previewRecordsRev: 3,
      previewContentRev: 1,
      previewRecordIds: ['a'],
      previewPeriod: { kind: 'days', days: 90 } as const,
    };
    expect(isPreviewCurrent(prep, 3, 1, ['a'])).toBe(true);
    expect(isPreviewCurrent(prep, 3, 2, ['a'])).toBe(false);
    expect(isPreviewCurrent(prep, 4, 1, ['a'])).toBe(false);
  });

  it('treats period changes by comparing included sets', () => {
    expect(samePeriod({ kind: 'days', days: 90 }, { kind: 'days', days: 30 })).toBe(false);
    expect(samePeriod({ kind: 'days', days: 90 }, { kind: 'days', days: 90 })).toBe(true);
    const entries = [
      { id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 1 },
      { id: 'b', kind: 'ALT', date: '2026-06-01', unit: 'U/L', value: 2 },
    ] as never[];
    expect(recordIdsInPeriod(entries, { kind: 'days', days: 90 }, '2026-10-07')).toEqual(['a']);
    expect(recordIdsInPeriod(entries, { kind: 'all' }, '2026-10-07')).toEqual(['a', 'b']);
  });
});

describe('four-task checklist', () => {
  it('counts explicit completions only', () => {
    const prep = defaultVisitPrep();
    const t = prepTasks(prep, [], 0, 0, []);
    expect(t).toEqual({ review: false, questions: false, notes: false, preview: false });
    expect(prepTaskCount(t)).toBe(0);
  });

  it('accepts explicit no-questions and no-notes states', () => {
    const prep = { ...defaultVisitPrep(), noQuestions: true, noNotes: true };
    const t = prepTasks(prep, [], 0, 0, []);
    expect(t.questions).toBe(true);
    expect(t.notes).toBe(true);
    expect(prepTaskCount(t)).toBe(2);
  });

  it('counts selected drafts toward the questions task', () => {
    const t = prepTasks(defaultVisitPrep(), drafts(2), 0, 0, []);
    expect(t.questions).toBe(true);
    const none = prepTasks(
      defaultVisitPrep(),
      drafts(2).map((d) => ({ ...d, selected: false })),
      0,
      0,
      [],
    );
    expect(none.questions).toBe(false);
  });
});

describe('user-defined missing information', () => {
  it('lists only unfinished user items', () => {
    const items = [
      { id: 'a', text: 'Find report', done: false, createdAt: 'x' },
      { id: 'b', text: 'Done thing', done: true, createdAt: 'x' },
    ];
    expect(unfinishedItems(items).map((i) => i.id)).toEqual(['a']);
  });

  it('validates item text', () => {
    expect(validatePrepItemText('  ')).not.toBeNull();
    expect(validatePrepItemText('x'.repeat(141))).not.toBeNull();
    expect(validatePrepItemText('Find my report.')).toBeNull();
  });
});
