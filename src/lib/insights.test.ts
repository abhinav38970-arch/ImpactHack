import { describe, expect, it } from 'vitest';
import {
  activityInPeriod,
  compareEquivalentWeeks,
  equivalentWeeks,
  habitCompletionInPeriod,
  labStat,
  latestReflection,
  rangeStart,
} from './insights';
import type { CheckIn, Entry, Habit, Reflection } from './types';

function entry(kind: Entry['kind'], date: string, value: number): Entry {
  return { id: `${kind}-${date}-${value}`, kind, date, unit: 'x', value };
}

function habit(): Habit {
  return {
    id: 'h1',
    title: 'Movement I choose',
    status: 'active',
    createdDate: '2026-09-07',
    scheduleHistory: [{ effectiveFrom: '2026-09-07', weekdays: [1, 3, 5] }],
    pauses: [],
    createdAt: 'x',
  };
}

describe('activity totals', () => {
  const entries = [
    entry('ACTIVITY', '2026-09-28', 20),
    entry('ACTIVITY', '2026-09-28', 15),
    entry('ACTIVITY', '2026-09-30', 30),
    entry('WEIGHT', '2026-09-30', 186),
  ];
  it('sums minutes and counts distinct dates in range', () => {
    expect(activityInPeriod(entries, '2026-09-28', '2026-09-30')).toEqual({ minutes: 65, dates: 2 });
    expect(activityInPeriod(entries, '2026-09-30', '2026-09-30')).toEqual({ minutes: 30, dates: 1 });
    expect(activityInPeriod(entries, '2026-08-01', '2026-08-31')).toEqual({ minutes: 0, dates: 0 });
  });
  it('derives range starts inclusively', () => {
    expect(rangeStart('7', '2026-09-30')).toBe('2026-09-24');
  });
});

describe('scheduled opportunity summaries', () => {
  it('counts elapsed planned actions and per-habit breakdowns', () => {
    const checkins: CheckIn[] = [{ habitId: 'h1', date: '2026-09-07' }];
    const s = habitCompletionInPeriod([habit()], checkins, '2026-09-07', '2026-09-13');
    expect(s.planned).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.perHabit).toEqual([{ id: 'h1', title: 'Movement I choose', planned: 3, completed: 1 }]);
  });
  it('ignores check-ins outside planned days in completion', () => {
    const checkins: CheckIn[] = [{ habitId: 'h1', date: '2026-09-08' }];
    const s = habitCompletionInPeriod([habit()], checkins, '2026-09-07', '2026-09-13');
    expect(s.completed).toBe(0);
  });
});

describe('lab stats', () => {
  it('counts labs and reports the latest date', () => {
    const s = labStat([entry('ALT', '2026-09-01', 50), entry('WEIGHT', '2026-09-02', 1)]);
    expect(s).toEqual({ count: 1, types: 1, latestDate: '2026-09-01' });
    expect(labStat([])).toEqual({ count: 0, types: 0, latestDate: null });
  });
});

describe('equivalent weeks', () => {
  it('compares elapsed weekdays only (Wed example)', () => {
    // 2026-09-30 is a Wednesday.
    const w = equivalentWeeks('2026-09-30');
    expect(w.current).toEqual({ start: '2026-09-28', end: '2026-09-30' });
    expect(w.previous).toEqual({ start: '2026-09-21', end: '2026-09-23' });
  });
  it('reports missing prior data as no entries, not zeroes', () => {
    const c = compareEquivalentWeeks(
      [entry('ACTIVITY', '2026-09-29', 25)],
      [],
      [],
      '2026-09-30',
    );
    expect(c.activityNow).toEqual({ minutes: 25, dates: 1 });
    expect(c.activityPrev).toEqual({ minutes: 0, dates: 0 });
  });
});

describe('reflection recap', () => {
  it('picks the latest reflection by week', () => {
    const rs: Reflection[] = [
      { id: 'a', weekStart: '2026-09-07', helped: 'x', blocked: 'y', keepChange: 'z', updatedAt: 'x' },
      { id: 'b', weekStart: '2026-09-14', helped: 'p', blocked: 'q', keepChange: 'r', updatedAt: 'x' },
    ];
    expect(latestReflection(rs)?.id).toBe('b');
    expect(latestReflection([])).toBeNull();
  });
});
