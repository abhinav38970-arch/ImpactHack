import type { Entry, EntryKind } from './types';

/**
 * Trend selection helpers (pure). Phase 2 rules:
 * - No unit conversion: series are filtered by (metric, original unit).
 * - Same-day entries are preserved, never averaged or discarded.
 * - Activity entries sharing a date aggregate to daily logged minutes.
 * - Blood pressure stays two labeled series (systolic, diastolic).
 */

export type RangeKey = '7' | '30' | '90' | 'all';

export function rangeStartISO(range: RangeKey, todayISO: string): string | null {
  if (range === 'all') return null;
  const n = Number(range);
  const [y, m, d] = todayISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - (n - 1));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Distinct original units recorded for a metric, sorted for stable display. */
export function unitsForMetric(entries: Entry[], kind: EntryKind): string[] {
  const set = new Set<string>();
  for (const e of entries) if (e.kind === kind) set.add(e.unit);
  return [...set].sort();
}

/** Entries for one metric + one original unit inside the range, oldest first. */
export function seriesFor(
  entries: Entry[],
  kind: EntryKind,
  unit: string,
  todayISO: string,
  range: RangeKey,
): Entry[] {
  const from = rangeStartISO(range, todayISO);
  return entries
    .filter(
      (e) =>
        e.kind === kind &&
        e.unit === unit &&
        (from === null || e.date >= from) &&
        e.date <= todayISO,
    )
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

export interface DayTotal {
  date: string;
  minutes: number;
  count: number;
}

/** Aggregate same-date activity entries to daily logged minutes. */
export function aggregateActivityByDay(series: Entry[]): DayTotal[] {
  const map = new Map<string, { minutes: number; count: number }>();
  for (const e of series) {
    if (e.value === undefined) continue;
    const cur = map.get(e.date) ?? { minutes: 0, count: 0 };
    cur.minutes += e.value;
    cur.count += 1;
    map.set(e.date, cur);
  }
  return [...map.entries()]
    .map(([date, v]) => ({ date, minutes: v.minutes, count: v.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface FirstLast {
  first: number;
  last: number;
  change: number;
}

/** Factual first-to-last comparison. No percent, no judgment. */
export function firstLast(values: number[]): FirstLast | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  return { first, last, change: last - first };
}

export function formatSigned(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
