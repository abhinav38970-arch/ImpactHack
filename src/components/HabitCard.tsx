import {
  isChecked,
  isPausedOn,
  plannedDates,
  scheduleText,
  summaryText,
  weekSummary,
} from '../lib/habits';
import type { CheckIn, Habit } from '../lib/types';

export default function HabitCard({
  habit,
  checkins,
  todayISO,
  weekStartISO,
  onToggleToday,
  onPause,
  onResume,
  onArchive,
  onEdit,
}: {
  habit: Habit;
  checkins: CheckIn[];
  todayISO: string;
  weekStartISO: string;
  onToggleToday: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
  onEdit: () => void;
}) {
  const seg = habit.scheduleHistory[habit.scheduleHistory.length - 1];
  const pausedToday = isPausedOn(habit, todayISO);
  const scheduledToday =
    !pausedToday && plannedDates(habit, todayISO).includes(todayISO);
  const checkedToday = isChecked(checkins, habit.id, todayISO);
  const summary = weekSummary([habit], checkins, weekStartISO, todayISO);
  const paused = habit.status === 'paused';
  const archived = habit.status === 'archived';

  const target =
    seg?.targetValue || seg?.targetUnit
      ? `My target: ${[seg?.targetValue, seg?.targetUnit].filter(Boolean).join(' ')}`
      : null;

  return (
    <article className="card" aria-label={`Habit: ${habit.title}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-loop-ink">{habit.title}</h3>
          <p className="text-xs text-slate-500">
            {seg ? scheduleText(seg.weekdays) : 'No schedule'}
            {target ? ` · ${target}` : ''}
          </p>
          {paused && (
            <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Paused — generates no planned days
            </p>
          )}
          {archived && (
            <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Archived — history kept
            </p>
          )}
        </div>
      </div>

      {!archived && (
        <div className="mt-3 rounded-xl bg-loop-mist px-3 py-2.5">
          {scheduledToday ? (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-teal-700"
                checked={checkedToday}
                onChange={onToggleToday}
                aria-label={checkedToday ? `Undo today's ${habit.title}` : `Complete today's ${habit.title}`}
              />
              <span className="text-sm font-medium text-loop-ink">
                {checkedToday ? 'Done today — select again to undo.' : 'Scheduled today — check off when done.'}
              </span>
            </label>
          ) : (
            <p className="text-sm text-slate-500">
              {pausedToday ? 'Paused today — nothing scheduled.' : 'Not scheduled today.'}
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-sm text-slate-600" aria-live="polite">
        This week: {summaryText(summary)}
        {summary.extra > 0 && (
          <span className="block text-xs text-slate-500">
            Plus {summary.extra} check-in(s) on days not currently planned.
          </span>
        )}
      </p>

      {!archived && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-secondary !px-3 !py-2 text-xs" onClick={onEdit}>
            Edit
          </button>
          {paused ? (
            <button className="btn-secondary !px-3 !py-2 text-xs" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button className="btn-secondary !px-3 !py-2 text-xs" onClick={onPause}>
              Pause
            </button>
          )}
          <button className="btn-danger !px-3 !py-2 text-xs" onClick={onArchive}>
            Archive
          </button>
        </div>
      )}
    </article>
  );
}
