import { useState } from 'react';
import { addDaysISO, newId } from '../lib/dates';
import { mondayOf, weekLabel } from '../lib/habits';
import type { Reflection } from '../lib/types';

function recentWeeks(todayISO: string, n: number): string[] {
  const out: string[] = [];
  let monday = mondayOf(todayISO);
  for (let i = 0; i < n; i++) {
    out.push(monday);
    monday = addDaysISO(monday, -7);
  }
  return out;
}

export default function ReflectionForm({
  reflections,
  todayISO,
  onSave,
}: {
  reflections: Reflection[];
  todayISO: string;
  onSave: (r: Reflection) => void;
}) {
  const weeks = recentWeeks(todayISO, 8);
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO));
  const existing = reflections.find((r) => r.weekStart === weekStart);

  const [helped, setHelped] = useState(existing?.helped ?? '');
  const [blocked, setBlocked] = useState(existing?.blocked ?? '');
  const [keepChange, setKeepChange] = useState(existing?.keepChange ?? '');
  const [savedTick, setSavedTick] = useState(false);

  function selectWeek(w: string) {
    setWeekStart(w);
    const e = reflections.find((r) => r.weekStart === w);
    setHelped(e?.helped ?? '');
    setBlocked(e?.blocked ?? '');
    setKeepChange(e?.keepChange ?? '');
    setSavedTick(false);
  }

  function handleSave() {
    onSave({
      id: existing?.id ?? newId(),
      weekStart,
      helped: helped.trim(),
      blocked: blocked.trim(),
      keepChange: keepChange.trim(),
      updatedAt: new Date().toISOString(),
    });
    setSavedTick(true);
    window.setTimeout(() => setSavedTick(false), 2500);
  }

  return (
    <section className="card space-y-3" aria-label="Weekly reflection">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-loop-ink">Weekly reflection</h3>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          Week of
          <select
            className="field !mt-0 !w-auto !py-1.5"
            value={weekStart}
            onChange={(e) => selectWeek(e.target.value)}
            aria-label="Reflection week"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                {weekLabel(w)}
                {reflections.some((r) => r.weekStart === w) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="label" htmlFor="rf-helped">What helped?</label>
        <textarea
          id="rf-helped"
          className="field"
          rows={2}
          value={helped}
          onChange={(e) => setHelped(e.target.value)}
          placeholder="e.g. Morning walks fit my schedule."
        />
      </div>
      <div>
        <label className="label" htmlFor="rf-blocked">What got in the way?</label>
        <textarea
          id="rf-blocked"
          className="field"
          rows={2}
          value={blocked}
          onChange={(e) => setBlocked(e.target.value)}
          placeholder="e.g. Rain and late meetings."
        />
      </div>
      <div>
        <label className="label" htmlFor="rf-keep">What would you like to keep or change?</label>
        <textarea
          id="rf-keep"
          className="field"
          rows={2}
          value={keepChange}
          onChange={(e) => setKeepChange(e.target.value)}
          placeholder="e.g. Keep mornings; try shorter walks on busy days."
        />
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={handleSave}>
          {existing ? 'Save changes' : 'Save reflection'}
        </button>
        {savedTick && (
          <span className="text-xs font-semibold text-loop-teal" role="status">
            Saved.
          </span>
        )}
      </div>
      <p className="hint-text">
        Saving only stores your words. To keep your plan, do nothing further —
        to change it, use Edit or Pause on a habit card. The app never changes
        habits on its own.
      </p>
    </section>
  );
}
