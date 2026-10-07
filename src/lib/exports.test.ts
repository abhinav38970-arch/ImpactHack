import { describe, expect, it } from 'vitest';
import {
  CHECKIN_HEADER,
  MEASUREMENT_HEADER,
  REFLECTION_HEADER,
  checkinsCsv,
  measurementsCsv,
  reflectionsCsv,
} from './exports';
import type { CheckIn, Entry, Habit, Reflection } from './types';

describe('export schemas', () => {
  it('exports measurements with original units, dates, and demo flag', () => {
    const entries: Entry[] = [
      { id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 52, note: 'ok, fine' },
      { id: 'b', kind: 'BP', date: '2026-09-02', unit: 'mmHg', systolic: 128, diastolic: 82 },
    ];
    const csv = measurementsCsv(entries, true);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(MEASUREMENT_HEADER.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('2026-09-01,ALT,52');
    expect(lines[1]).toContain('"ok, fine"');
    expect(lines[1].endsWith(',yes')).toBe(true);
    expect(lines[2]).toContain('128,82,mmHg');
  });

  it('marks personal exports as non-demo', () => {
    const csv = measurementsCsv([], false);
    expect(csv.trim().split('\r\n')).toHaveLength(1);
    const csv2 = checkinsCsv([], [], false);
    expect(csv2).toContain('fictional_demo');
  });

  it('exports check-ins with habit context', () => {
    const habits: Habit[] = [
      {
        id: 'h1',
        title: 'Walk',
        status: 'active',
        createdDate: '2026-09-01',
        scheduleHistory: [{ effectiveFrom: '2026-09-01', weekdays: [1] }],
        pauses: [],
        createdAt: 'x',
      },
    ];
    const checkins: CheckIn[] = [{ habitId: 'h1', date: '2026-09-08' }];
    const csv = checkinsCsv(checkins, habits, true);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(CHECKIN_HEADER.join(','));
    expect(lines[1]).toBe('2026-09-08,h1,Walk,yes,yes');
  });

  it('exports reflections verbatim with formula protection', () => {
    const rs: Reflection[] = [
      { id: 'r', weekStart: '2026-09-07', helped: '=TRICK()', blocked: 'b', keepChange: 'c', updatedAt: 'x' },
    ];
    const csv = reflectionsCsv(rs, false);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(REFLECTION_HEADER.join(','));
    expect(lines[1]).toContain("'=TRICK()");
    expect(lines[1].endsWith(',no')).toBe(true);
  });
});
