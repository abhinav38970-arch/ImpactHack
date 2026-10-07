import { addDaysISO, newId } from './dates';
import { mondayOf, plannedDates } from './habits';
import { defaultVisitPrep } from './visitPrep';
import type { CheckIn, Entry, EntryKind, Habit, ProfileState, Reflection } from './types';

/**
 * Fictional Maya demo seed. Three months of synthetic records anchored to
 * the day the demo is created, so the appointment never sits in the past.
 *
 * Values vary modestly in BOTH directions — this is not an improvement
 * story. No disease stage, severity, or outcome is assigned or implied.
 */

interface SeedPoint {
  kind: EntryKind;
  unit: string;
  daysAgo: number;
  value?: number;
  rangeMin?: number;
  rangeMax?: number;
}

const LAB_PANELS: Array<{ daysAgo: number; rows: SeedPoint[] }> = [
  {
    daysAgo: 80,
    rows: [
      { kind: 'ALT', unit: 'U/L', daysAgo: 80, value: 54, rangeMin: 7, rangeMax: 56 },
      { kind: 'AST', unit: 'U/L', daysAgo: 80, value: 38 },
      { kind: 'GGT', unit: 'U/L', daysAgo: 80, value: 48 },
      { kind: 'PLATELET', unit: '×10⁹/L', daysAgo: 80, value: 242 },
      { kind: 'TRIG', unit: 'mg/dL', daysAgo: 80, value: 168 },
      { kind: 'HBA1C', unit: '%', daysAgo: 80, value: 6.1 },
    ],
  },
  {
    daysAgo: 45,
    rows: [
      { kind: 'ALT', unit: 'U/L', daysAgo: 45, value: 49 },
      { kind: 'AST', unit: 'U/L', daysAgo: 45, value: 41 },
      { kind: 'GGT', unit: 'U/L', daysAgo: 45, value: 44 },
      { kind: 'PLATELET', unit: '×10⁹/L', daysAgo: 45, value: 251 },
      { kind: 'TRIG', unit: 'mg/dL', daysAgo: 45, value: 175 },
      { kind: 'HBA1C', unit: '%', daysAgo: 45, value: 6.0 },
    ],
  },
  {
    daysAgo: 12,
    rows: [
      { kind: 'ALT', unit: 'U/L', daysAgo: 12, value: 52 },
      { kind: 'AST', unit: 'U/L', daysAgo: 12, value: 39 },
      { kind: 'GGT', unit: 'U/L', daysAgo: 12, value: 47 },
      { kind: 'PLATELET', unit: '×10⁹/L', daysAgo: 12, value: 246 },
      { kind: 'TRIG', unit: 'mg/dL', daysAgo: 12, value: 162 },
      { kind: 'HBA1C', unit: '%', daysAgo: 12, value: 6.2 },
    ],
  },
];

const WEIGHTS: Array<{ daysAgo: number; value: number }> = [
  { daysAgo: 70, value: 186.4 },
  { daysAgo: 58, value: 187.1 },
  { daysAgo: 44, value: 185.6 },
  { daysAgo: 30, value: 186.8 },
  { daysAgo: 16, value: 185.2 },
  { daysAgo: 5, value: 186.0 },
];

const WAISTS: Array<{ daysAgo: number; value: number }> = [
  { daysAgo: 65, value: 38.2 },
  { daysAgo: 32, value: 37.9 },
  { daysAgo: 6, value: 38.0 },
];

const ACTIVITIES: Array<{ daysAgo: number; value: number }> = [
  { daysAgo: 9, value: 25 },
  { daysAgo: 7, value: 30 },
  { daysAgo: 6, value: 20 },
  { daysAgo: 4, value: 35 },
  { daysAgo: 2, value: 25 },
  { daysAgo: 1, value: 30 },
];

export function buildDemoSeed(todayISO: string): ProfileState {
  const entries: Entry[] = [];
  for (const panel of LAB_PANELS) {
    for (const r of panel.rows) {
      entries.push({
        id: newId(),
        kind: r.kind,
        unit: r.unit,
        date: addDaysISO(todayISO, -r.daysAgo),
        value: r.value,
        ...(r.rangeMin !== undefined
          ? { rangeMin: r.rangeMin, rangeMax: r.rangeMax }
          : {}),
      });
    }
  }
  for (const w of WEIGHTS) {
    entries.push({
      id: newId(),
      kind: 'WEIGHT',
      unit: 'lb',
      date: addDaysISO(todayISO, -w.daysAgo),
      value: w.value,
    });
  }
  for (const w of WAISTS) {
    entries.push({
      id: newId(),
      kind: 'WAIST',
      unit: 'in',
      date: addDaysISO(todayISO, -w.daysAgo),
      value: w.value,
    });
  }
  for (const a of ACTIVITIES) {
    entries.push({
      id: newId(),
      kind: 'ACTIVITY',
      unit: 'min',
      date: addDaysISO(todayISO, -a.daysAgo),
      value: a.value,
    });
  }

  // Two active habits with weekday schedules, created ~60 days ago.
  const habits: Habit[] = [
    {
      id: 'seed-habit-move',
      title: 'Movement I choose',
      status: 'active',
      createdDate: addDaysISO(todayISO, -60),
      scheduleHistory: [
        {
          effectiveFrom: addDaysISO(todayISO, -60),
          weekdays: [1, 3, 5],
          targetValue: '20',
          targetUnit: 'min',
        },
      ],
      pauses: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-habit-veg',
      title: 'Add a vegetable to a meal',
      status: 'active',
      createdDate: addDaysISO(todayISO, -60),
      scheduleHistory: [
        { effectiveFrom: addDaysISO(todayISO, -60), weekdays: [2, 4, 6] },
      ],
      pauses: [],
      createdAt: new Date().toISOString(),
    },
  ];

  // Completed and missed days: check-ins for most elapsed scheduled days
  // in the last 3 weeks, skipping every fourth occurrence so both states
  // appear. Today is left unchecked so the demo opens with an action.
  const checkins: CheckIn[] = [];
  for (const h of habits) {
    const days = plannedDates(h, addDaysISO(todayISO, -1)).filter(
      (d) => d >= addDaysISO(todayISO, -21),
    );
    days.forEach((d, i) => {
      if (i % 4 !== 3) checkins.push({ habitId: h.id, date: d });
    });
  }

  const reflections: Reflection[] = [
    {
      id: 'seed-reflection-1',
      weekStart: mondayOf(addDaysISO(todayISO, -7)),
      helped: 'Morning walks fit better than evenings.',
      blocked: 'Rain on two days and a late work meeting.',
      keepChange: 'Keep the morning walks; try a movement break on busy days.',
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    profile: { displayName: 'Maya', visitDate: addDaysISO(todayISO, 21) },
    entries,
    habits,
    checkins,
    reflections,
    // A few fictional questions, a short note, and one prep item — but the
    // preparation tasks stay incomplete so judges complete them live.
    guideDrafts: [
      {
        id: 'seed-draft-1',
        text: 'What do these recorded results mean in my situation?',
        selected: true,
        source: 'library' as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'seed-draft-2',
        text: 'What information would be useful to track before my next visit?',
        selected: false,
        source: 'guide' as const,
        createdAt: new Date().toISOString(),
      },
    ],
    recordsRev: 0,
    contentRev: 0,
    visitPrep: {
      ...defaultVisitPrep(),
      notes: 'Walking in the mornings has felt easier than evenings.',
      items: [
        {
          id: 'seed-item-1',
          text: 'Find my September lab report.',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}
