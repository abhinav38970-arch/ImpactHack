/**
 * Insights — deterministic summaries only. Every number here comes from
 * recorded data via pure functions. No LLM, no medical interpretation.
 *
 * Windows use local calendar dates. The week starts Monday, consistent
 * with Habits (`mondayOf`).
 */

import { addDaysISO, todayISO } from './dates';
import { verifiedEntries } from './guide/registry';
import type { EduEntry } from './guide/registry';
import { mondayOf, plannedDates } from './habits';
import type { CheckIn, Entry, Habit, Reflection } from './types';

export type InsightsRange = '7' | '30' | '90';

export function rangeStart(range: InsightsRange, today: string): string {
  const n = Number(range);
  return addDaysISO(today, -(n - 1));
}

export interface ActivitySummary {
  minutes: number;
  dates: number;
}

export function activityInPeriod(entries: Entry[], from: string, to: string): ActivitySummary {
  const days = new Set<string>();
  let minutes = 0;
  for (const e of entries) {
    if (e.kind !== 'ACTIVITY') continue;
    if (e.date < from || e.date > to) continue;
    minutes += e.value ?? 0;
    days.add(e.date);
  }
  return { minutes, dates: days.size };
}

export interface HabitPeriodSummary {
  planned: number;
  completed: number;
  perHabit: Array<{ id: string; title: string; planned: number; completed: number }>;
}

export function habitCompletionInPeriod(
  habits: Habit[],
  checkins: CheckIn[],
  from: string,
  to: string,
): HabitPeriodSummary {
  const perHabit = habits.map((h) => {
    const plannedSet = new Set(plannedDates(h, to).filter((d) => d >= from));
    let completed = 0;
    for (const c of checkins) {
      if (c.habitId === h.id && plannedSet.has(c.date)) completed++;
    }
    return { id: h.id, title: h.title, planned: plannedSet.size, completed };
  });
  return {
    planned: perHabit.reduce((s, p) => s + p.planned, 0),
    completed: perHabit.reduce((s, p) => s + p.completed, 0),
    perHabit,
  };
}

export interface LabStat {
  count: number;
  types: number;
  latestDate: string | null;
}

const LAB_KINDS = new Set(['ALT', 'AST', 'GGT', 'PLATELET', 'TRIG', 'HBA1C']);

export function labStat(entries: Entry[]): LabStat {
  const labs = entries.filter((e) => LAB_KINDS.has(e.kind));
  const types = new Set(labs.map((e) => e.kind)).size;
  const latestDate = labs.length > 0 ? labs.map((e) => e.date).sort().at(-1)! : null;
  return { count: labs.length, types, latestDate };
}

export interface WeekWindow {
  start: string;
  end: string;
}

/**
 * Equivalent elapsed windows: the current week Monday..today, and the same
 * weekdays last week (Monday..today-minus-7). Never includes future days.
 */
export function equivalentWeeks(today: string): { current: WeekWindow; previous: WeekWindow } {
  const start = mondayOf(today);
  return {
    current: { start, end: today },
    previous: { start: addDaysISO(start, -7), end: addDaysISO(today, -7) },
  };
}

export interface WeekComparison {
  current: WeekWindow;
  previous: WeekWindow;
  activityNow: ActivitySummary;
  activityPrev: ActivitySummary;
  habitsNow: HabitPeriodSummary;
  habitsPrev: HabitPeriodSummary;
}

export function compareEquivalentWeeks(
  entries: Entry[],
  habits: Habit[],
  checkins: CheckIn[],
  today: string = todayISO(),
): WeekComparison {
  const { current, previous } = equivalentWeeks(today);
  return {
    current,
    previous,
    activityNow: activityInPeriod(entries, current.start, current.end),
    activityPrev: activityInPeriod(entries, previous.start, previous.end),
    habitsNow: habitCompletionInPeriod(habits, checkins, current.start, current.end),
    habitsPrev: habitCompletionInPeriod(habits, checkins, previous.start, previous.end),
  };
}

export function latestReflection(reflections: Reflection[]): Reflection | null {
  if (reflections.length === 0) return null;
  return [...reflections].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))[0];
}

/**
 * One verified educational tip per calendar date, rotating deterministically
 * through verified registry content. Null when nothing verified exists —
 * callers then show neutral app help instead of invented advice.
 */
export function tipForDate(iso: string): EduEntry | null {
  const v = verifiedEntries();
  if (v.length === 0) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return v[0];
  const days = Math.floor(new Date(y, m - 1, d).getTime() / 86400000);
  return v[((days % v.length) + v.length) % v.length];
}
