import { useState } from 'react';
import HabitCard from '../components/HabitCard';
import HabitForm from '../components/HabitForm';
import ReflectionForm from '../components/ReflectionForm';
import { DisclaimerStrip } from '../components/bits';
import { newId, todayISO } from '../lib/dates';
import {
  MAX_ACTIVE_HABITS,
  activeHabits,
  canActivate,
  mondayOf,
  summaryText,
  weekSummary,
} from '../lib/habits';
import type { HabitDraft } from '../lib/habits';
import type { Habit } from '../lib/types';
import { useApp } from '../state/AppContext';

export default function Habits() {
  const {
    activeProfile,
    addHabit,
    editHabitSchedule,
    renameHabit,
    pauseHabitOn,
    resumeHabitOn,
    archiveHabit,
    toggleCheckin,
    saveReflection,
  } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const today = todayISO();
  const weekStart = mondayOf(today);
  const habits = activeProfile?.habits ?? [];
  const checkins = activeProfile?.checkins ?? [];
  const reflections = activeProfile?.reflections ?? [];

  const actives = activeHabits(habits);
  const paused = habits.filter((h) => h.status === 'paused');
  const archived = habits.filter((h) => h.status === 'archived');
  const overall = weekSummary(actives, checkins, weekStart, today);
  const atLimit = !canActivate(habits);

  function createHabit(d: HabitDraft) {
    addHabit({
      id: newId(),
      title: d.title,
      status: 'active',
      createdDate: today,
      scheduleHistory: [
        {
          effectiveFrom: today,
          weekdays: d.weekdays,
          ...(d.targetValue || d.targetUnit
            ? { targetValue: d.targetValue || undefined, targetUnit: d.targetUnit || undefined }
            : {}),
        },
      ],
      pauses: [],
      createdAt: new Date().toISOString(),
    });
    setShowCreate(false);
  }

  function saveEdit(habit: Habit, d: HabitDraft) {
    if (d.title !== habit.title) renameHabit(habit.id, d.title);
    const last = habit.scheduleHistory[habit.scheduleHistory.length - 1];
    const sameWeekdays =
      last &&
      last.weekdays.length === d.weekdays.length &&
      last.weekdays.every((w) => d.weekdays.includes(w));
    const sameTarget =
      (last?.targetValue ?? '') === d.targetValue &&
      (last?.targetUnit ?? '') === d.targetUnit;
    if (!(sameWeekdays && sameTarget)) {
      editHabitSchedule(habit.id, {
        effectiveFrom: today,
        weekdays: d.weekdays,
        ...(d.targetValue || d.targetUnit
          ? { targetValue: d.targetValue || undefined, targetUnit: d.targetUnit || undefined }
          : {}),
      });
    }
    setEditingId(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="page-title">Habits</h1>
          <p className="page-sub">
            {actives.length === 0
              ? 'Start tiny — up to 3 habits. Only planned days count.'
              : `This week: ${summaryText(overall)} · Small steps count.`}
          </p>
        </div>
        {!showCreate && editingId === null && (
          <button
            className="btn-primary ml-auto shrink-0"
            onClick={() => setShowCreate(true)}
            disabled={atLimit}
            title={
              atLimit
                ? `Pause or archive a habit first — ${MAX_ACTIVE_HABITS} may be active at once.`
                : 'Add a habit'
            }
          >
            + Add habit
          </button>
        )}
      </div>

      {atLimit && !showCreate && (
        <p className="card !py-3 text-sm text-slate-600" role="note">
          {MAX_ACTIVE_HABITS} habits are active. To start a different one, pause
          or archive one below first. Paused and archived habits keep their history.
        </p>
      )}

      {showCreate && (
        <HabitForm
          submitLabel="Add habit"
          onSubmit={createHabit}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {actives.length === 0 && paused.length === 0 && !showCreate ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
          <p className="text-sm font-semibold text-loop-ink">No habits yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Pick one small, manageable habit — for example, movement you choose
            on set weekdays. Only planned days count toward completion.
          </p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
            Add your first habit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {actives.map((h) =>
            editingId === h.id ? (
              <HabitForm
                key={h.id}
                initial={h}
                submitLabel="Save changes"
                onSubmit={(d) => saveEdit(h, d)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <HabitCard
                key={h.id}
                habit={h}
                checkins={checkins}
                todayISO={today}
                weekStartISO={weekStart}
                onToggleToday={() => toggleCheckin(h.id, today)}
                onPause={() => pauseHabitOn(h.id, today)}
                onResume={() => resumeHabitOn(h.id, today)}
                onArchive={() => setArchiveId(h.id)}
                onEdit={() => {
                  setEditingId(h.id);
                  setShowCreate(false);
                }}
              />
            ),
          )}
        </div>
      )}

      {archiveId && (
        <div className="card space-y-2" role="alertdialog" aria-label="Confirm archive">
          <p className="text-sm text-loop-ink">
            Archive this habit? Its past check-ins stay in your history, but it
            will no longer appear for check-in.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-danger"
              onClick={() => {
                archiveHabit(archiveId);
                setArchiveId(null);
              }}
            >
              Archive habit
            </button>
            <button className="btn-secondary" onClick={() => setArchiveId(null)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <section className="space-y-3" aria-label="Paused habits">
          <h2 className="text-sm font-semibold text-slate-500">Paused</h2>
          {paused.map((h) => (
            <div key={h.id} className="card flex items-center gap-3 !p-4">
              <p className="flex-1 text-sm font-medium text-loop-ink">{h.title}</p>
              <button
                className="btn-secondary !px-3 !py-2 text-xs"
                disabled={atLimit}
                title={
                  atLimit
                    ? `${MAX_ACTIVE_HABITS} habits are already active — pause or archive one first.`
                    : 'Resume this habit'
                }
                onClick={() => resumeHabitOn(h.id, today)}
              >
                Resume
              </button>
            </div>
          ))}
        </section>
      )}

      {archived.length > 0 && (
        <section className="space-y-2" aria-label="Archived habits">
          <h2 className="text-sm font-semibold text-slate-500">
            Archived ({archived.length})
          </h2>
          <p className="text-xs text-slate-500">
            Past check-ins are kept and still count in the weeks when they happened.
          </p>
        </section>
      )}

      <ReflectionForm reflections={reflections} todayISO={today} onSave={saveReflection} />

      <div className="card">
        <DisclaimerStrip />
      </div>
    </div>
  );
}
