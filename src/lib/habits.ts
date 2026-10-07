import { addDaysISO } from './dates';
import type { CheckIn, Habit, Reflection, Weekday } from './types';

/**
 * Habit domain logic (pure functions — UI and tests share these).
 *
 * Rules:
 * - Explicit selected weekdays per effective-dated segment.
 * - No opportunities before habit.createdDate.
 * - Only elapsed days (date <= throughISO) count. Future is never "missed".
 * - Paused dates generate no opportunities. Pausing takes effect from the
 *   pause start date; completions already recorded are never deleted, so a
 *   same-day pause cannot rewrite a prior completion.
 * - Resuming closes the open pause the day before the resume date; a
 *   same-day pause+resume leaves history untouched (pause is dropped).
 * - Schedule/target edits append a segment: prospective only.
 * - Archived habits keep history (callers decide inclusion by status/date).
 */

export const MAX_ACTIVE_HABITS = 3;

export function isPausedOn(habit: Habit, dateISO: string): boolean {
  return habit.pauses.some(
    (p) => p.start <= dateISO && (p.end === undefined || dateISO <= p.end),
  );
}

/** Expand the scheduled dates for a habit on/after creation, up to throughISO. */
export function plannedDates(habit: Habit, throughISO: string): string[] {
  const segs = [...habit.scheduleHistory].sort((a, b) =>
    a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
  );
  if (segs.length === 0) return [];

  const out: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const nextStart = i + 1 < segs.length ? segs[i + 1].effectiveFrom : null;
    // A segment never reaches before the habit existed.
    let day = seg.effectiveFrom < habit.createdDate ? habit.createdDate : seg.effectiveFrom;
    // Guard: cap iteration to 3 years of days to avoid runaway loops.
    for (let step = 0; step < 1100; step++) {
      if (day > throughISO) break;
      if (nextStart !== null && day >= nextStart) break;
      const [y, m, d] = day.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).getDay();
      if (
        seg.weekdays.includes(weekday as Weekday) &&
        !isPausedOn(habit, day)
      ) {
        out.push(day);
      }
      day = addDaysISO(day, 1);
    }
  }
  return out;
}

export function countPlanned(habit: Habit, throughISO: string): number {
  return plannedDates(habit, throughISO).length;
}

export function activeHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.status === 'active');
}

/** The 3-active limit applies to creating AND to resuming a paused habit. */
export function canActivate(habits: Habit[]): boolean {
  return activeHabits(habits).length < MAX_ACTIVE_HABITS;
}

export function checkinKey(habitId: string, dateISO: string): string {
  return `${habitId}|${dateISO}`;
}

/** Toggle a completion. Idempotent: at most one record per habit per date. */
export function toggleCheckin(
  checkins: CheckIn[],
  habitId: string,
  dateISO: string,
): CheckIn[] {
  const key = checkinKey(habitId, dateISO);
  if (checkins.some((c) => checkinKey(c.habitId, c.date) === key)) {
    return checkins.filter((c) => checkinKey(c.habitId, c.date) !== key);
  }
  return [...checkins, { habitId, date: dateISO }];
}

export function isChecked(checkins: CheckIn[], habitId: string, dateISO: string): boolean {
  return checkins.some((c) => c.habitId === habitId && c.date === dateISO);
}

/**
 * Pause starting `fromISO` (inclusive). Appends an open pause; if one is
 * already open, the habit is unchanged. Recorded completions are untouched.
 */
export function pauseHabit(habit: Habit, fromISO: string): Habit {
  const open = habit.pauses.some((p) => p.end === undefined && p.start <= fromISO);
  if (open || habit.status !== 'active') return habit;
  return {
    ...habit,
    status: 'paused',
    pauses: [...habit.pauses, { start: fromISO }],
  };
}

/**
 * Resume on `onISO`: the open pause ends the day before, so a same-day
 * pause+resume collapses to a no-op and prior completions always stand.
 */
export function resumeHabit(habit: Habit, onISO: string): Habit {
  const idx = habit.pauses.findIndex((p) => p.end === undefined);
  if (idx === -1) {
    return habit.status === 'paused' ? { ...habit, status: 'active' } : habit;
  }
  const end = addDaysISO(onISO, -1);
  const pauses = habit.pauses
    .map((p, i) => (i === idx ? { ...p, end } : p))
    .filter((p) => p.end === undefined || p.start <= p.end);
  return { ...habit, status: 'active', pauses };
}

export interface WeekSummary {
  planned: number;
  completed: number;
  /** Check-ins on days that are not currently planned (e.g. later paused). */
  extra: number;
}

/** Completion within [weekStartISO, throughISO] across the given habits. */
export function weekSummary(
  habits: Habit[],
  checkins: CheckIn[],
  weekStartISO: string,
  throughISO: string,
): WeekSummary {
  const plannedSet = new Set<string>();
  for (const h of habits) {
    for (const d of plannedDates(h, throughISO)) {
      if (d >= weekStartISO) plannedSet.add(checkinKey(h.id, d));
    }
  }
  let completed = 0;
  let extra = 0;
  for (const c of checkins) {
    if (c.date < weekStartISO || c.date > throughISO) continue;
    if (!habits.some((h) => h.id === c.habitId)) continue;
    if (plannedSet.has(checkinKey(c.habitId, c.date))) completed++;
    else extra++;
  }
  return { planned: plannedSet.size, completed, extra };
}

export function summaryText(s: WeekSummary): string {
  if (s.planned === 0 && s.extra === 0) return 'No planned actions yet this week.';
  if (s.planned === 0) return `${s.extra} check-in(s) on unscheduled days this week.`;
  return `${s.completed} of ${s.planned} planned actions completed.`;
}

/** Monday (local) starting the week that contains iso. */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0 Sun … 6 Sat
  const back = (dow + 6) % 7;
  dt.setDate(dt.getDate() - back);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function weekLabel(weekStartISO: string): string {
  const end = addDaysISO(weekStartISO, 6);
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };
  return `${fmt(weekStartISO)} – ${fmt(end)}`;
}

/** Insert or replace the reflection for a week (one per week, editable). */
export function upsertReflection(
  reflections: Reflection[],
  r: Reflection,
): Reflection[] {
  const i = reflections.findIndex((x) => x.weekStart === r.weekStart);
  if (i === -1) return [...reflections, r];
  return reflections.map((x, idx) => (idx === i ? r : x));
}

export interface HabitDraft {
  title: string;
  weekdays: Weekday[];
  targetValue: string;
  targetUnit: string;
}

export function validateHabitDraft(d: HabitDraft): Partial<Record<'title' | 'weekdays', string>> {
  const errors: Partial<Record<'title' | 'weekdays', string>> = {};
  if (d.title.trim() === '') errors.title = 'Give the habit a name.';
  else if (d.title.trim().length > 80) errors.title = 'Keep the name under 80 characters.';
  if (d.weekdays.length === 0) errors.weekdays = 'Choose at least one weekday.';
  return errors;
}

const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export function scheduleText(weekdays: Weekday[]): string {
  if (weekdays.length === 7) return 'Every day';
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((w) => weekdays.includes(w)).map((w) => WEEKDAY_NAMES[w]).join(', ');
}
