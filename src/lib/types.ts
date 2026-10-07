/**
 * LiverLoop v1 data model.
 *
 * Phase 1 covers: profile + manual entries (labs, body, blood pressure,
 * activity). Habits, reflections, visit prep, and insights arrive in later
 * phases — their future shapes are sketched below so Phase 1 storage does
 * not need to be redesigned, but no UI or logic for them exists yet.
 */

/** The ten entry types supported in v1. */
export type EntryKind =
  | 'ALT'
  | 'AST'
  | 'GGT'
  | 'PLATELET'
  | 'TRIG'
  | 'HBA1C'
  | 'WEIGHT'
  | 'WAIST'
  | 'BP'
  | 'ACTIVITY';

export type EntryCategory = 'Labs' | 'Body' | 'Blood pressure' | 'Activity';

/**
 * A single recorded measurement.
 *
 * Phase 1 rule: preserve the original value and unit exactly as entered.
 * No unit conversion is performed. Later charts must separate entries by
 * (metric, unit) until a conversion is deliberately implemented and tested.
 */
export interface Entry {
  id: string;
  kind: EntryKind;
  /** Calendar date in YYYY-MM-DD (local). */
  date: string;
  /** Unit string as entered/selected, e.g. "mg/dL", "lb", "mmHg". */
  unit: string;
  /** Single numeric value. Used by every kind except BP. */
  value?: number;
  /** Blood pressure only. */
  systolic?: number;
  /** Blood pressure only. */
  diastolic?: number;
  /**
   * Optional lab reference range copied from the user's own report.
   * Both ends are required together; ordering is validated.
   * Never used to judge normality — display only.
   */
  rangeMin?: number;
  rangeMax?: number;
  /** Optional free-text note (user's own words). */
  note?: string;
}

export interface Profile {
  displayName: string;
  /** Optional upcoming appointment date in YYYY-MM-DD. */
  visitDate?: string;
}

/** All data belonging to one mode (demo or personal). */
export interface ProfileState {
  profile: Profile;
  entries: Entry[];
  /** Phase 2+. Absent in Phase 1 envelopes; migration fills []. */
  habits: Habit[];
  /** Presence of a record = completed. Key is (habitId, date). */
  checkins: CheckIn[];
  reflections: Reflection[];
  /**
   * Draft appointment questions (Guide suggestions, library picks, custom).
   * At most MAX_SELECTED_DRAFTS may be selected for the Visit Prep report.
   */
  guideDrafts: GuideDraft[];
  /**
   * Revision counters for Visit Prep staleness. recordsRev bumps on any
   * report-relevant record change (entries, habits, check-ins, reflections,
   * report period inclusion); contentRev bumps on questions/notes/items
   * changes. Phase 4+. Migration starts both at 0.
   */
  recordsRev: number;
  contentRev: number;
  visitPrep: VisitPrepState;
  updatedAt: string;
}

export type AppMode = 'demo' | 'personal';

/**
 * Single versioned persistence envelope.
 * One localStorage key holds BOTH modes so they can never drift apart.
 */
export interface PersistedEnvelope {
  schemaVersion: number;
  demo: ProfileState | null;
  personal: ProfileState | null;
  activeMode: AppMode | null;
}

// ---------------------------------------------------------------------------
// Future shapes (Phase 2+). Declared now so the model supports them later.
// No Phase 1 code reads or writes these.
// ---------------------------------------------------------------------------

/** 0 = Sunday … 6 = Saturday. Explicit selected weekdays per clarification. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * One effective-dated schedule segment. Future edits append a new segment;
 * past segments are never rewritten, so history stays honest.
 */
export interface HabitScheduleSegment {
  effectiveFrom: string; // YYYY-MM-DD
  weekdays: Weekday[];
  /** User's own or clinician-provided target note, free text. */
  targetNote?: string;
  /** Optional user-entered numeric target (never prescribed by the app). */
  targetValue?: string;
  /** Optional user-entered unit for the target. */
  targetUnit?: string;
}

export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: string;
  title: string;
  status: HabitStatus;
  /** Local creation date (YYYY-MM-DD). No opportunities exist before this. */
  createdDate: string;
  scheduleHistory: HabitScheduleSegment[];
  /** Paused date ranges (inclusive). `end` absent = open-ended pause. */
  pauses: Array<{ start: string; end?: string }>;
  createdAt: string;
  archivedAt?: string;
}

/**
 * One completed check-in. Uniqueness is enforced on (habitId, date):
 * there is at most one record per habit per local calendar date.
 */
export interface CheckIn {
  habitId: string;
  /** Local calendar date YYYY-MM-DD. */
  date: string;
}

/** One reflection per calendar week (Monday-start). Editable. */
export interface Reflection {
  id: string;
  /** Monday (YYYY-MM-DD) of the reflected week. */
  weekStart: string;
  helped: string;
  blocked: string;
  keepChange: string;
  updatedAt: string;
}

/**
 * A draft appointment question kept for the Visit Prep report.
 * `source` records where it came from; all sources share one store so
 * Guide suggestions are never lost or duplicated by Visit Prep.
 */
export interface GuideDraft {
  id: string;
  text: string;
  selected: boolean;
  source?: 'guide' | 'library' | 'custom';
  createdAt: string;
}

/** Independent reporting period for Visit Prep / report. */
export type ReportPeriod =
  | { kind: 'days'; days: 30 | 90 }
  | { kind: 'all' }
  | { kind: 'custom'; from: string; to: string };

/** A user-defined preparation item ("Find my September report"). */
export interface PrepItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

/**
 * Visit preparation state. Review/preview store the revision numbers AND
 * the included record-ID set they were confirmed against, so any relevant
 * change — or a period change that alters the set — marks them stale
 * without fragile timestamp comparisons.
 */
export interface VisitPrepState {
  period: ReportPeriod;
  noQuestions: boolean;
  notes: string;
  noNotes: boolean;
  items: PrepItem[];
  reviewedRecordsRev: number | null;
  reviewedRecordIds: string[] | null;
  previewRecordsRev: number | null;
  previewContentRev: number | null;
  previewRecordIds: string[] | null;
  previewPeriod: ReportPeriod | null;
}
