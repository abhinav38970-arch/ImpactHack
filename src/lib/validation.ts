import { isValidISODate, todayISO } from './dates';
import { METRICS } from './units';
import type { EntryKind } from './types';

/**
 * Raw form values for a log entry. Strings because they come from inputs.
 * Validation is structural only (required fields, numeric shape, ordering).
 * It never judges medical normality — no thresholds, no interpretation.
 */
export interface EntryFormValues {
  kind: EntryKind;
  date: string;
  unit: string;
  value: string;
  systolic: string;
  diastolic: string;
  rangeMin: string;
  rangeMax: string;
  note: string;
}

export type FieldErrors = Partial<Record<string, string>>;

const MAX_NOTE = 280;
/** Generous technical cap to catch typos (extra zeros). Not a medical bound. */
const MAX_VALUE = 1_000_000;

function parsePositiveNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function validateEntryForm(v: EntryFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const spec = METRICS[v.kind];

  if (!isValidISODate(v.date)) {
    errors.date = 'Enter a valid date (YYYY-MM-DD).';
  } else if (v.date > todayISO()) {
    // One-day tolerance is NOT applied: future measurements cannot exist.
    // (Same-day in another timezone is an accepted edge case of this rule.)
    errors.date = 'Date cannot be in the future.';
  }

  if (!spec.allowedUnits.includes(v.unit)) {
    errors.unit = `Choose one of: ${spec.allowedUnits.join(', ')}.`;
  }

  if (spec.input === 'bp') {
    const sys = parsePositiveNumber(v.systolic);
    const dia = parsePositiveNumber(v.diastolic);
    if (sys === null || sys <= 0 || sys > MAX_VALUE) {
      errors.systolic = 'Enter the systolic (upper) number.';
    }
    if (dia === null || dia <= 0 || dia > MAX_VALUE) {
      errors.diastolic = 'Enter the diastolic (lower) number.';
    }
    if (
      sys !== null &&
      dia !== null &&
      sys > 0 &&
      dia > 0 &&
      sys <= dia
    ) {
      errors.systolic =
        'Systolic is usually higher than diastolic — please check the order.';
    }
  } else {
    const n = parsePositiveNumber(v.value);
    if (n === null || n <= 0 || n > MAX_VALUE) {
      errors.value = 'Enter a number greater than zero.';
    }
  }

  if (spec.allowsRange) {
    const hasMin = v.rangeMin.trim() !== '';
    const hasMax = v.rangeMax.trim() !== '';
    if (hasMin !== hasMax) {
      errors.rangeMin = 'Enter both ends of the range, or leave both blank.';
    } else if (hasMin && hasMax) {
      const lo = parsePositiveNumber(v.rangeMin);
      const hi = parsePositiveNumber(v.rangeMax);
      if (lo === null || lo <= 0 || hi === null || hi <= 0) {
        errors.rangeMin = 'Range ends must be numbers greater than zero.';
      } else if (!(lo < hi)) {
        errors.rangeMin = 'The lower end must be smaller than the upper end.';
      }
    }
  }

  if (v.note.length > MAX_NOTE) {
    errors.note = `Keep notes under ${MAX_NOTE} characters.`;
  }

  return errors;
}

export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
