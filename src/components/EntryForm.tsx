import { useMemo, useState } from 'react';
import { CATEGORIES, ENTRY_KINDS, METRICS } from '../lib/units';
import { newId, todayISO } from '../lib/dates';
import { isValid, validateEntryForm } from '../lib/validation';
import type { EntryFormValues } from '../lib/validation';
import type { Entry, EntryCategory, EntryKind } from '../lib/types';

export function blankForm(kind: EntryKind, date: string): EntryFormValues {
  return {
    kind,
    date,
    unit: METRICS[kind].defaultUnit,
    value: '',
    systolic: '',
    diastolic: '',
    rangeMin: '',
    rangeMax: '',
    note: '',
  };
}

export function formFromEntry(e: Entry): EntryFormValues {
  return {
    kind: e.kind,
    date: e.date,
    unit: e.unit,
    value: e.value !== undefined ? String(e.value) : '',
    systolic: e.systolic !== undefined ? String(e.systolic) : '',
    diastolic: e.diastolic !== undefined ? String(e.diastolic) : '',
    rangeMin: e.rangeMin !== undefined ? String(e.rangeMin) : '',
    rangeMax: e.rangeMax !== undefined ? String(e.rangeMax) : '',
    note: e.note ?? '',
  };
}

export function entryFromForm(
  v: EntryFormValues,
  id: string,
): Entry {
  const spec = METRICS[v.kind];
  const base = {
    id,
    kind: v.kind,
    date: v.date,
    unit: v.unit,
    ...(v.note.trim() !== '' ? { note: v.note.trim() } : {}),
  };
  if (spec.input === 'bp') {
    return { ...base, systolic: Number(v.systolic), diastolic: Number(v.diastolic) };
  }
  const single: Entry = { ...base, value: Number(v.value) };
  if (spec.allowsRange && v.rangeMin.trim() !== '' && v.rangeMax.trim() !== '') {
    single.rangeMin = Number(v.rangeMin);
    single.rangeMax = Number(v.rangeMax);
  }
  return single;
}

export default function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Entry | null;
  submitLabel: string;
  onSubmit: (e: Entry) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<EntryFormValues>(() =>
    initial ? formFromEntry(initial) : blankForm('ALT', todayISO()),
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateEntryForm>>({});

  const spec = METRICS[form.kind];
  const kindsByCategory = useMemo(() => {
    const map = new Map<EntryCategory, EntryKind[]>();
    for (const k of ENTRY_KINDS) {
      const c = METRICS[k].category;
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(k);
    }
    return CATEGORIES.map((c) => ({ category: c, kinds: map.get(c) ?? [] }));
  }, []);

  function set<K extends keyof EntryFormValues>(key: K, val: EntryFormValues[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleKind(kind: EntryKind) {
    setForm((f) => ({
      ...f,
      kind,
      unit: METRICS[kind].defaultUnit,
      // Clear kind-specific fields so stale values can't leak across kinds.
      value: METRICS[kind].input === 'single' ? f.value : '',
      systolic: '',
      diastolic: '',
      rangeMin: '',
      rangeMax: '',
    }));
    setErrors({});
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validateEntryForm(form);
    setErrors(errs);
    if (!isValid(errs)) return;
    onSubmit(entryFromForm(form, initial ? initial.id : newId()));
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" aria-label="Log entry form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ef-kind">
            What are you recording?
          </label>
          <select
            id="ef-kind"
            className="field"
            value={form.kind}
            onChange={(e) => handleKind(e.target.value as EntryKind)}
          >
            {kindsByCategory.map((g) => (
              <optgroup key={g.category} label={g.category}>
                {g.kinds.map((k) => (
                  <option key={k} value={k}>
                    {METRICS[k].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ef-date">
            Date
          </label>
          <input
            id="ef-date"
            type="date"
            className="field"
            value={form.date}
            max={todayISO()}
            onChange={(e) => set('date', e.target.value)}
          />
          {errors.date && (
            <p className="error-text" role="alert">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      {spec.input === 'bp' ? (
        <fieldset>
          <legend className="label">
            Blood pressure <span className="font-normal text-slate-500">(mmHg)</span>
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ef-sys">
                Systolic (upper)
              </label>
              <input
                id="ef-sys"
                className="field"
                inputMode="decimal"
                autoComplete="off"
                value={form.systolic}
                onChange={(e) => set('systolic', e.target.value)}
                placeholder="e.g. 128"
              />
              {errors.systolic && (
                <p className="error-text" role="alert">
                  {errors.systolic}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="ef-dia">
                Diastolic (lower)
              </label>
              <input
                id="ef-dia"
                className="field"
                inputMode="decimal"
                autoComplete="off"
                value={form.diastolic}
                onChange={(e) => set('diastolic', e.target.value)}
                placeholder="e.g. 82"
              />
              {errors.diastolic && (
                <p className="error-text" role="alert">
                  {errors.diastolic}
                </p>
              )}
            </div>
          </div>
          <p className="hint-text">{spec.hint}</p>
        </fieldset>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ef-value">
              Value
            </label>
            <input
              id="ef-value"
              className="field"
              inputMode="decimal"
              autoComplete="off"
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              placeholder="e.g. 52"
            />
            {errors.value && (
              <p className="error-text" role="alert">
                {errors.value}
              </p>
            )}
            <p className="hint-text">{spec.hint}</p>
          </div>
          <div>
            <label className="label" htmlFor="ef-unit">
              Unit
            </label>
            <select
              id="ef-unit"
              className="field"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
            >
              {spec.allowedUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {errors.unit && (
              <p className="error-text" role="alert">
                {errors.unit}
              </p>
            )}
          </div>
        </div>
      )}

      {spec.allowsRange && (
        <div>
          <span className="label">
            Lab reference range <span className="font-normal text-slate-500">(optional)</span>
          </span>
          <div className="mt-1 grid grid-cols-2 gap-4">
            <div>
              <label className="label sr-only" htmlFor="ef-rmin">
                Range lower end
              </label>
              <input
                id="ef-rmin"
                className="field"
                inputMode="decimal"
                autoComplete="off"
                value={form.rangeMin}
                onChange={(e) => set('rangeMin', e.target.value)}
                placeholder="Lower end"
              />
            </div>
            <div>
              <label className="label sr-only" htmlFor="ef-rmax">
                Range upper end
              </label>
              <input
                id="ef-rmax"
                className="field"
                inputMode="decimal"
                autoComplete="off"
                value={form.rangeMax}
                onChange={(e) => set('rangeMax', e.target.value)}
                placeholder="Upper end"
              />
            </div>
          </div>
          {errors.rangeMin && (
            <p className="error-text" role="alert">
              {errors.rangeMin}
            </p>
          )}
          <p className="hint-text">
            Only if printed on your report. Shown for context — never used to judge results.
          </p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="ef-note">
          Note <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="ef-note"
          className="field"
          rows={2}
          maxLength={300}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="Anything you want to remember about this entry."
        />
        {errors.note && (
          <p className="error-text" role="alert">
            {errors.note}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
