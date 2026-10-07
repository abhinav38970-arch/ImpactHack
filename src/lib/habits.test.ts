import { describe, expect, it } from 'vitest';
import {
  canActivate,
  countPlanned,
  isChecked,
  isPausedOn,
  mondayOf,
  pauseHabit,
  plannedDates,
  resumeHabit,
  summaryText,
  toggleCheckin,
  upsertReflection,
  validateHabitDraft,
  weekSummary,
} from './habits';
import type { Habit } from './types';

function habit(): Habit {
  return {
    id: 'h1',
    title: 'Movement I choose',
    status: 'active',
    createdDate: '2026-09-07',
    // Mon / Wed / Fri starting 2026-09-07 (a Monday).
    scheduleHistory: [{ effectiveFrom: '2026-09-07', weekdays: [1, 3, 5] }],
    pauses: [],
    createdAt: '2026-09-07',
  };
}

describe('habit schedule model', () => {
  it('counts Mon/Wed/Fri opportunities only, none on other days', () => {
    // Through Sun Sep 13: Mon 7 + Wed 9 + Fri 11 = 3.
    expect(countPlanned(habit(), '2026-09-13')).toBe(3);
    expect(plannedDates(habit(), '2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
    ]);
  });

  it('does not count days before the schedule starts', () => {
    expect(countPlanned(habit(), '2026-09-06')).toBe(0);
    expect(countPlanned(habit(), '2026-09-07')).toBe(1);
  });

  it('excludes paused dates', () => {
    const h = habit();
    h.pauses = [{ start: '2026-09-09', end: '2026-09-09' }];
    expect(plannedDates(h, '2026-09-13')).toEqual(['2026-09-07', '2026-09-11']);
  });

  it('applies schedule edits prospectively without rewriting the past', () => {
    const h = habit();
    // From Sep 14: Mondays only.
    h.scheduleHistory.push({ effectiveFrom: '2026-09-14', weekdays: [1] });
    // Past unchanged…
    expect(plannedDates(h, '2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
    ]);
    // …future follows the new segment (Mon 14, Mon 21).
    expect(plannedDates(h, '2026-09-21')).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
      '2026-09-14',
      '2026-09-21',
    ]);
  });

  it('returns empty with no schedule history', () => {
    const h = habit();
    h.scheduleHistory = [];
    expect(countPlanned(h, '2026-09-30')).toBe(0);
  });
});

describe('creation bound', () => {
  it('generates no opportunities before the creation date', () => {
    const h = habit();
    h.createdDate = '2026-09-09'; // Wednesday
    expect(plannedDates(h, '2026-09-13')).toEqual(['2026-09-09', '2026-09-11']);
  });
});

describe('pause and resume', () => {
  it('pausing stops future opportunities but keeps completions', () => {
    let h = pauseHabit(habit(), '2026-09-10');
    expect(h.status).toBe('paused');
    expect(isPausedOn(h, '2026-09-10')).toBe(true);
    expect(isPausedOn(h, '2026-09-09')).toBe(false);
    expect(plannedDates(h, '2026-09-13')).toEqual(['2026-09-07', '2026-09-09']);
    // A completion recorded before pausing is a separate record: untouched.
    const done = toggleCheckin([], 'h1', '2026-09-09');
    expect(isChecked(done, 'h1', '2026-09-09')).toBe(true);
  });

  it('resuming closes the pause the day before', () => {
    let h = pauseHabit(habit(), '2026-09-10');
    h = resumeHabit(h, '2026-09-12');
    expect(h.status).toBe('active');
    expect(isPausedOn(h, '2026-09-11')).toBe(true);
    expect(isPausedOn(h, '2026-09-12')).toBe(false);
  });

  it('same-day pause+resume is a no-op for history', () => {
    let h = pauseHabit(habit(), '2026-09-10');
    h = resumeHabit(h, '2026-09-10');
    expect(h.pauses).toEqual([]);
    expect(plannedDates(h, '2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
    ]);
  });
});

describe('archive', () => {
  it('archived habits keep their historical planned dates', () => {
    const h = { ...habit(), status: 'archived' as const };
    expect(plannedDates(h, '2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
    ]);
    const done = toggleCheckin([], 'h1', '2026-09-09');
    const s = weekSummary([h], done, '2026-09-07', '2026-09-13');
    expect(s).toEqual({ planned: 3, completed: 1, extra: 0 });
  });
});

describe('check-ins', () => {
  it('toggles one record per date and supports undo', () => {
    const once = toggleCheckin([], 'h1', '2026-09-09');
    expect(once).toHaveLength(1);
    // Toggling again undoes the completion — never a duplicate record.
    expect(toggleCheckin(once, 'h1', '2026-09-09')).toHaveLength(0);
    const redone = toggleCheckin(toggleCheckin(once, 'h1', '2026-09-09'), 'h1', '2026-09-09');
    expect(redone).toHaveLength(1);
    expect(isChecked(redone, 'h1', '2026-09-09')).toBe(true);
  });

  it('summarizes zero-opportunity weeks honestly', () => {
    const s = weekSummary([habit()], [], '2026-09-07', '2026-09-06');
    expect(s).toEqual({ planned: 0, completed: 0, extra: 0 });
    expect(summaryText(s)).toBe('No planned actions yet this week.');
    const partial = weekSummary([habit()], toggleCheckin([], 'h1', '2026-09-07'), '2026-09-07', '2026-09-09');
    expect(summaryText(partial)).toBe('1 of 2 planned actions completed.');
  });

  it('counts check-ins on later-paused days as extra, not planned', () => {
    const h = pauseHabit(habit(), '2026-09-09');
    const done = toggleCheckin([], 'h1', '2026-09-09');
    const s = weekSummary([h], done, '2026-09-07', '2026-09-13');
    // Open pause from Sep 9 leaves only Mon Sep 7 planned.
    expect(s.planned).toBe(1);
    expect(s.completed).toBe(0);
    expect(s.extra).toBe(1);
  });
});

describe('three-active limit', () => {
  it('blocks a fourth activation, including resume', () => {
    const hs = [habit(), { ...habit(), id: 'h2' }, { ...habit(), id: 'h3' }];
    expect(canActivate(hs)).toBe(false);
    expect(canActivate(hs.slice(0, 2))).toBe(true);
    const withPaused = [...hs.slice(0, 2), { ...habit(), id: 'h4', status: 'paused' as const }];
    expect(canActivate(withPaused)).toBe(true);
  });
});

describe('reflections', () => {
  it('saves one reflection per week and edits it', () => {
    const r1 = { id: 'r1', weekStart: '2026-09-07', helped: 'a', blocked: 'b', keepChange: 'c', updatedAt: 'x' };
    const after = upsertReflection([], r1);
    expect(after).toHaveLength(1);
    const edited = upsertReflection(after, { ...r1, helped: 'z' });
    expect(edited).toHaveLength(1);
    expect(edited[0].helped).toBe('z');
    expect(mondayOf('2026-09-10')).toBe('2026-09-07');
  });
});

describe('habit draft validation', () => {
  it('requires a name and at least one weekday', () => {
    expect(validateHabitDraft({ title: '', weekdays: [1], targetValue: '', targetUnit: '' }).title).toBeDefined();
    expect(validateHabitDraft({ title: 'Walk', weekdays: [], targetValue: '', targetUnit: '' }).weekdays).toBeDefined();
    expect(validateHabitDraft({ title: 'Walk', weekdays: [1], targetValue: '', targetUnit: '' })).toEqual({});
  });
});
