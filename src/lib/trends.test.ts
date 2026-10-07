import { describe, expect, it } from 'vitest';
import {
  aggregateActivityByDay,
  firstLast,
  seriesFor,
  unitsForMetric,
} from './trends';
import type { Entry } from './types';

function e(
  kind: Entry['kind'],
  date: string,
  value: number,
  unit: string,
): Entry {
  return { id: `${kind}-${date}-${value}`, kind, date, unit, value };
}

describe('unit-separated trend selection', () => {
  const entries = [e('WEIGHT', '2026-09-01', 186, 'lb'), e('WEIGHT', '2026-09-08', 84, 'kg')];
  it('lists distinct original units', () => {
    expect(unitsForMetric(entries, 'WEIGHT')).toEqual(['kg', 'lb']);
  });
  it('excludes incompatible units from a series', () => {
    const lb = seriesFor(entries, 'WEIGHT', 'lb', '2026-09-30', 'all');
    expect(lb).toHaveLength(1);
    expect(lb[0].value).toBe(186);
  });
  it('respects the date range', () => {
    const week = seriesFor(
      [e('ALT', '2026-09-01', 50, 'U/L'), e('ALT', '2026-09-28', 52, 'U/L')],
      'ALT',
      'U/L',
      '2026-09-30',
      '7',
    );
    expect(week.map((x) => x.date)).toEqual(['2026-09-28']);
  });
});

describe('activity aggregation', () => {
  it('sums same-day entries and keeps day counts', () => {
    const days = aggregateActivityByDay([
      e('ACTIVITY', '2026-09-08', 20, 'min'),
      e('ACTIVITY', '2026-09-08', 15, 'min'),
      e('ACTIVITY', '2026-09-09', 30, 'min'),
    ]);
    expect(days).toEqual([
      { date: '2026-09-08', minutes: 35, count: 2 },
      { date: '2026-09-09', minutes: 30, count: 1 },
    ]);
  });
});

describe('measurement preservation', () => {
  it('keeps multiple same-day entries without averaging', () => {
    const s = seriesFor(
      [e('WEIGHT', '2026-09-08', 186, 'lb'), e('WEIGHT', '2026-09-08', 185.4, 'lb')],
      'WEIGHT',
      'lb',
      '2026-09-30',
      'all',
    );
    expect(s.map((x) => x.value)).toEqual([186, 185.4]);
  });
  it('keeps blood pressure pairs intact', () => {
    const entries: Entry[] = [
      { id: 'a', kind: 'BP', date: '2026-09-08', unit: 'mmHg', systolic: 128, diastolic: 82 },
    ];
    const s = seriesFor(entries, 'BP', 'mmHg', '2026-09-30', 'all');
    expect(s[0].systolic).toBe(128);
    expect(s[0].diastolic).toBe(82);
  });
});

describe('first-to-last comparison', () => {
  it('returns a labeled numerical change, never a percent', () => {
    expect(firstLast([54, 49, 52])).toEqual({ first: 54, last: 52, change: -2 });
    expect(firstLast([52])).toBeNull();
  });
});
