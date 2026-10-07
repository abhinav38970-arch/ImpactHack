/**
 * CSV export builders — one consistent schema per file. User-entered text
 * passes through the formula guard in csv.ts; original units and dates are
 * preserved; every row carries a fictional_demo indicator.
 */

import { toCsv } from './csv';
import { METRICS } from './units';
import type { CheckIn, Entry, Habit, Reflection } from './types';

export const MEASUREMENT_HEADER = [
  'date',
  'metric',
  'value',
  'systolic',
  'diastolic',
  'unit',
  'range_min',
  'range_max',
  'note',
  'fictional_demo',
];

export function measurementsCsv(entries: Entry[], isDemo: boolean): string {
  const rows = [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => [
      e.date,
      METRICS[e.kind].label,
      e.value ?? '',
      e.systolic ?? '',
      e.diastolic ?? '',
      e.unit,
      e.rangeMin ?? '',
      e.rangeMax ?? '',
      e.note ?? '',
      isDemo ? 'yes' : 'no',
    ]);
  return toCsv(MEASUREMENT_HEADER, rows);
}

export const CHECKIN_HEADER = ['date', 'habit_id', 'habit_title', 'completed', 'fictional_demo'];

export function checkinsCsv(
  checkins: CheckIn[],
  habits: Habit[],
  isDemo: boolean,
): string {
  const titles = new Map(habits.map((h) => [h.id, h.title]));
  const rows = [...checkins]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((c) => [
      c.date,
      c.habitId,
      titles.get(c.habitId) ?? '',
      'yes',
      isDemo ? 'yes' : 'no',
    ]);
  return toCsv(CHECKIN_HEADER, rows);
}

export const REFLECTION_HEADER = [
  'week_start',
  'helped',
  'blocked',
  'keep_change',
  'fictional_demo',
];

export function reflectionsCsv(reflections: Reflection[], isDemo: boolean): string {
  const rows = [...reflections]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((r) => [
      r.weekStart,
      r.helped,
      r.blocked,
      r.keepChange,
      isDemo ? 'yes' : 'no',
    ]);
  return toCsv(REFLECTION_HEADER, rows);
}
