import { describe, expect, it } from 'vitest';
import type { EntryFormValues } from './validation';
import { isValid, validateEntryForm } from './validation';

function base(over: Partial<EntryFormValues> = {}): EntryFormValues {
  return {
    kind: 'ALT',
    date: '2026-09-28',
    unit: 'U/L',
    value: '52',
    systolic: '',
    diastolic: '',
    rangeMin: '',
    rangeMax: '',
    note: '',
    ...over,
  };
}

describe('validateEntryForm', () => {
  it('accepts a valid lab entry', () => {
    expect(isValid(validateEntryForm(base()))).toBe(true);
  });

  it('requires a valid non-future date', () => {
    expect(validateEntryForm(base({ date: '' })).date).toBeDefined();
    expect(validateEntryForm(base({ date: 'not-a-date' })).date).toBeDefined();
    expect(validateEntryForm(base({ date: '2999-01-01' })).date).toBeDefined();
  });

  it('rejects units outside the allowed list', () => {
    const errs = validateEntryForm(base({ unit: 'kg' }));
    expect(errs.unit).toBeDefined();
  });

  it('rejects non-numeric and non-positive values', () => {
    expect(validateEntryForm(base({ value: '' })).value).toBeDefined();
    expect(validateEntryForm(base({ value: 'abc' })).value).toBeDefined();
    expect(validateEntryForm(base({ value: '0' })).value).toBeDefined();
    expect(validateEntryForm(base({ value: '-5' })).value).toBeDefined();
  });

  it('requires both range ends together and correct ordering', () => {
    expect(validateEntryForm(base({ rangeMin: '7' })).rangeMin).toBeDefined();
    expect(
      validateEntryForm(base({ rangeMin: '60', rangeMax: '50' })).rangeMin,
    ).toBeDefined();
    expect(
      isValid(validateEntryForm(base({ rangeMin: '7', rangeMax: '56' }))),
    ).toBe(true);
  });

  it('validates blood pressure pairs and their order', () => {
    const bp = base({ kind: 'BP', unit: 'mmHg', value: '', systolic: '128', diastolic: '82' });
    expect(isValid(validateEntryForm(bp))).toBe(true);
    expect(
      validateEntryForm({ ...bp, systolic: '80', diastolic: '90' }).systolic,
    ).toBeDefined();
    expect(validateEntryForm({ ...bp, systolic: '' }).systolic).toBeDefined();
  });

  it('caps note length', () => {
    expect(validateEntryForm(base({ note: 'x'.repeat(281) })).note).toBeDefined();
  });

  it('accepts alternative units for weight and triglycerides', () => {
    expect(
      isValid(validateEntryForm(base({ kind: 'WEIGHT', unit: 'kg', value: '84.2' }))),
    ).toBe(true);
    expect(
      isValid(validateEntryForm(base({ kind: 'TRIG', unit: 'mmol/L', value: '1.9' }))),
    ).toBe(true);
  });
});
