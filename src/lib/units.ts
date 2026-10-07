import type { EntryCategory, EntryKind } from './types';

export interface MetricSpec {
  kind: EntryKind;
  label: string;
  category: EntryCategory;
  /** Display default from the approved blueprint. */
  defaultUnit: string;
  allowedUnits: string[];
  /** 'bp' entries use systolic/diastolic instead of a single value. */
  input: 'single' | 'bp';
  /** Short neutral helper shown under the form field. */
  hint: string;
  /** Labs may carry an optional reference range from the user's report. */
  allowsRange: boolean;
}

export const METRICS: Record<EntryKind, MetricSpec> = {
  ALT: {
    kind: 'ALT',
    label: 'ALT',
    category: 'Labs',
    defaultUnit: 'U/L',
    allowedUnits: ['U/L'],
    input: 'single',
    hint: 'Enter the value exactly as shown on your report.',
    allowsRange: true,
  },
  AST: {
    kind: 'AST',
    label: 'AST',
    category: 'Labs',
    defaultUnit: 'U/L',
    allowedUnits: ['U/L'],
    input: 'single',
    hint: 'Enter the value exactly as shown on your report.',
    allowsRange: true,
  },
  GGT: {
    kind: 'GGT',
    label: 'GGT',
    category: 'Labs',
    defaultUnit: 'U/L',
    allowedUnits: ['U/L'],
    input: 'single',
    hint: 'Enter the value exactly as shown on your report.',
    allowsRange: true,
  },
  PLATELET: {
    kind: 'PLATELET',
    label: 'Platelet count',
    category: 'Labs',
    defaultUnit: '×10⁹/L',
    allowedUnits: ['×10⁹/L', 'x10^9/L'],
    input: 'single',
    hint: 'Enter the value exactly as shown on your report.',
    allowsRange: true,
  },
  TRIG: {
    kind: 'TRIG',
    label: 'Triglycerides',
    category: 'Labs',
    defaultUnit: 'mg/dL',
    allowedUnits: ['mg/dL', 'mmol/L'],
    input: 'single',
    hint: 'Default display is mg/dL. Your original unit is preserved.',
    allowsRange: true,
  },
  HBA1C: {
    kind: 'HBA1C',
    label: 'HbA1c',
    category: 'Labs',
    defaultUnit: '%',
    allowedUnits: ['%', 'mmol/mol'],
    input: 'single',
    hint: 'Default display is %. Your original unit is preserved.',
    allowsRange: true,
  },
  WEIGHT: {
    kind: 'WEIGHT',
    label: 'Weight',
    category: 'Body',
    defaultUnit: 'lb',
    allowedUnits: ['lb', 'kg'],
    input: 'single',
    hint: 'Default display is lb. Your original unit is preserved.',
    allowsRange: false,
  },
  WAIST: {
    kind: 'WAIST',
    label: 'Waist circumference',
    category: 'Body',
    defaultUnit: 'in',
    allowedUnits: ['in', 'cm'],
    input: 'single',
    hint: 'Default display is inches. Your original unit is preserved.',
    allowsRange: false,
  },
  BP: {
    kind: 'BP',
    label: 'Blood pressure',
    category: 'Blood pressure',
    defaultUnit: 'mmHg',
    allowedUnits: ['mmHg'],
    input: 'bp',
    hint: 'Two values: systolic over diastolic, e.g. 128 / 82.',
    allowsRange: false,
  },
  ACTIVITY: {
    kind: 'ACTIVITY',
    label: 'Activity minutes',
    category: 'Activity',
    defaultUnit: 'min',
    allowedUnits: ['min'],
    input: 'single',
    hint: 'Minutes of movement you choose, for one day.',
    allowsRange: false,
  },
};

export const ENTRY_KINDS: EntryKind[] = [
  'ALT',
  'AST',
  'GGT',
  'PLATELET',
  'TRIG',
  'HBA1C',
  'WEIGHT',
  'WAIST',
  'BP',
  'ACTIVITY',
];

export const CATEGORIES: EntryCategory[] = [
  'Labs',
  'Body',
  'Blood pressure',
  'Activity',
];
