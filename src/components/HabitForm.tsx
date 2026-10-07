import { useState } from 'react';
import {
  scheduleText,
  validateHabitDraft,
} from '../lib/habits';
import type { HabitDraft } from '../lib/habits';
import type { Habit, Weekday } from '../lib/types';

export const STARTER_LABELS = [
  'Movement I choose',
  'My drink-swap goal',
  'Add a vegetable to a meal',
  'My bedtime routine',
  'Take a movement break',
  'Create my own habit',
];

const CUSTOM = 'Create my own habit';

const WEEKDAYS: Array<{ v: Weekday; label: string }> = [
  { v: 1, label: 'Mon' },
  { v: 2, label: 'Tue' },
  { v: 3, label: 'Wed' },
  { v: 4, label: 'Thu' },
  { v: 5, label: 'Fri' },
  { v: 6, label: 'Sat' },
  { v: 0, label: 'Sun' },
];

function draftFromHabit(h: Habit): HabitDraft & { starter: string } {
  const seg = h.scheduleHistory[h.scheduleHistory.length - 1];
  const inLibrary = STARTER_LABELS.includes(h.title);
  return {
    starter: inLibrary ? h.title : CUSTOM,
    title: inLibrary ? '' : h.title,
    weekdays: seg ? [...seg.weekdays] : [],
    targetValue: seg?.targetValue ?? '',
    targetUnit: seg?.targetUnit ?? '',
  };
}

export default function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Habit | null;
  submitLabel: string;
  onSubmit: (d: HabitDraft) => void;
  onCancel: () => void;
}) {
  const [starter, setStarter] = useState(() =>
    initial ? draftFromHabit(initial).starter : STARTER_LABELS[0],
  );
  const [title, setTitle] = useState(() =>
    initial ? draftFromHabit(initial).title : '',
  );
  const [weekdays, setWeekdays] = useState<Weekday[]>(() =>
    initial ? draftFromHabit(initial).weekdays : [1, 3, 5],
  );
  const init = initial ? draftFromHabit(initial) : null;
  const [targetValue, setTargetValue] = useState(init?.targetValue ?? '');
  const [targetUnit, setTargetUnit] = useState(init?.targetUnit ?? '');
  const [errors, setErrors] = useState<{ title?: string; weekdays?: string }>({});

  const effectiveTitle = starter === CUSTOM ? title : starter;

  function toggleDay(w: Weekday) {
    setWeekdays((ws) => (ws.includes(w) ? ws.filter((x) => x !== w) : [...ws, w]));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validateHabitDraft({
      title: effectiveTitle,
      weekdays,
      targetValue,
      targetUnit,
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      title: effectiveTitle.trim(),
      weekdays,
      targetValue: targetValue.trim(),
      targetUnit: targetUnit.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" aria-label="Habit form">
      <div>
        <label className="label" htmlFor="hf-starter">
          Choose a habit
        </label>
        <select
          id="hf-starter"
          className="field"
          value={starter}
          onChange={(e) => setStarter(e.target.value)}
        >
          {STARTER_LABELS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {starter === CUSTOM && (
        <div>
          <label className="label" htmlFor="hf-title">
            Your habit name
          </label>
          <input
            id="hf-title"
            className="field"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Evening stretch"
            autoComplete="off"
          />
          {errors.title && (
            <p className="error-text" role="alert">
              {errors.title}
            </p>
          )}
        </div>
      )}

      <fieldset>
        <legend className="label">Planned weekdays</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Weekdays">
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.v);
            return (
              <button
                key={d.v}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.v)}
                className={`min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ${
                  on
                    ? 'bg-loop-teal text-white ring-loop-teal'
                    : 'bg-white text-slate-600 ring-slate-300'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {errors.weekdays && (
          <p className="error-text" role="alert">
            {errors.weekdays}
          </p>
        )}
        <p className="hint-text">
          {weekdays.length > 0
            ? `Planned: ${scheduleText(weekdays)}. Changes apply from today, not retroactively.`
            : 'Only planned days count — other days are never marked missed.'}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="hf-target">
            My target <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="hf-target"
            className="field"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="hf-unit">
            Target unit <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="hf-unit"
            className="field"
            value={targetUnit}
            onChange={(e) => setTargetUnit(e.target.value)}
            placeholder="e.g. min"
            autoComplete="off"
          />
        </div>
      </div>
      <p className="hint-text">
        Targets are your own or your clinician&apos;s — the app never sets one for you.
      </p>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
