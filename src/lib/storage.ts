import type { PersistedEnvelope, ProfileState } from './types';

/**
 * Single versioned persistence envelope.
 * One localStorage key holds both modes so demo and personal records
 * can never drift apart or overwrite each other silently.
 *
 * Schema history:
 * - v1: profile + entries only.
 * - v2: adds habits, checkins, reflections (Phase 2).
 *   v1 envelopes migrate non-destructively on load.
 * - v3: adds guideDrafts (LiverLoop Guide milestone).
 *   v1 and v2 envelopes migrate non-destructively on load.
 */
export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = 'liverloop.v1';

export type LoadResult =
  | { status: 'ok'; envelope: PersistedEnvelope }
  | { status: 'fresh' }
  | { status: 'invalid-json'; raw: string }
  | { status: 'unsupported-version'; found: unknown };

function isProfileStateV1(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.profile !== 'object' || o.profile === null) return false;
  if (!Array.isArray(o.entries)) return false;
  return true;
}

function isProfileStateV2(v: unknown): boolean {
  if (!isProfileStateV1(v)) return false;
  if (v === null) return true;
  const o = v as Record<string, unknown>;
  for (const k of ['habits', 'checkins', 'reflections']) {
    if (o[k] !== undefined && !Array.isArray(o[k])) return false;
  }
  return true;
}

function isProfileStateV3(v: unknown): boolean {
  if (!isProfileStateV2(v)) return false;
  if (v === null) return true;
  const o = v as Record<string, unknown>;
  if (o.guideDrafts !== undefined && !Array.isArray(o.guideDrafts)) return false;
  return true;
}

/** Fill Phase 2 collections. Existing records pass through untouched. */
export function migrateV1ProfileToV2(v1: unknown): ProfileState {
  const o = v1 as {
    profile: ProfileState['profile'];
    entries: ProfileState['entries'];
    updatedAt: string;
  };
  return {
    profile: o.profile,
    entries: o.entries,
    habits: [],
    checkins: [],
    reflections: [],
    guideDrafts: [],
    updatedAt: o.updatedAt,
  };
}

function normalizeV2Profile(v: unknown): ProfileState {
  const o = v as Record<string, unknown>;
  return {
    ...(v as object),
    habits: Array.isArray(o.habits) ? o.habits : [],
    checkins: Array.isArray(o.checkins) ? o.checkins : [],
    reflections: Array.isArray(o.reflections) ? o.reflections : [],
    // v2 has no drafts field; preserve one if present rather than dropping it.
    guideDrafts: Array.isArray(o.guideDrafts) ? o.guideDrafts : [],
  } as ProfileState;
}

/** v2 and v3 share the same record shapes; v3 only adds guideDrafts. */
function normalizeV3Profile(v: unknown): ProfileState {
  const o = v as Record<string, unknown>;
  return {
    ...(v as object),
    habits: Array.isArray(o.habits) ? o.habits : [],
    checkins: Array.isArray(o.checkins) ? o.checkins : [],
    reflections: Array.isArray(o.reflections) ? o.reflections : [],
    guideDrafts: Array.isArray(o.guideDrafts) ? o.guideDrafts : [],
  } as ProfileState;
}

/** Pure parse + shape check + v1/v2→v3 migration. Never throws. */
export function loadEnvelope(raw: string | null): LoadResult {
  if (raw === null) return { status: 'fresh' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid-json', raw };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'invalid-json', raw };
  }
  const o = parsed as Record<string, unknown>;
  if (o.schemaVersion === 1) {
    // Non-destructive migration: keep every record, add empty collections.
    if (
      !isProfileStateV1(o.demo) ||
      !isProfileStateV1(o.personal) ||
      (o.activeMode !== null && o.activeMode !== 'demo' && o.activeMode !== 'personal')
    ) {
      return { status: 'invalid-json', raw };
    }
    return {
      status: 'ok',
      envelope: {
        schemaVersion: SCHEMA_VERSION,
        demo: o.demo === null ? null : migrateV1ProfileToV2(o.demo),
        personal: o.personal === null ? null : migrateV1ProfileToV2(o.personal),
        activeMode: o.activeMode as PersistedEnvelope['activeMode'],
      },
    };
  }
  if (o.schemaVersion === 2) {
    // v2 → v3: keep every record, add empty draft lists.
    if (
      !isProfileStateV2(o.demo) ||
      !isProfileStateV2(o.personal) ||
      (o.activeMode !== null && o.activeMode !== 'demo' && o.activeMode !== 'personal')
    ) {
      return { status: 'invalid-json', raw };
    }
    return {
      status: 'ok',
      envelope: {
        schemaVersion: SCHEMA_VERSION,
        demo: o.demo === null ? null : normalizeV2Profile(o.demo),
        personal: o.personal === null ? null : normalizeV2Profile(o.personal),
        activeMode: o.activeMode as PersistedEnvelope['activeMode'],
      },
    };
  }
  if (o.schemaVersion !== SCHEMA_VERSION) {
    return { status: 'unsupported-version', found: o.schemaVersion };
  }
  if (
    !isProfileStateV3(o.demo) ||
    !isProfileStateV3(o.personal) ||
    (o.activeMode !== null && o.activeMode !== 'demo' && o.activeMode !== 'personal')
  ) {
    return { status: 'invalid-json', raw };
  }
  return {
    status: 'ok',
    envelope: {
      schemaVersion: SCHEMA_VERSION,
      demo: o.demo === null ? null : normalizeV3Profile(o.demo),
      personal: o.personal === null ? null : normalizeV3Profile(o.personal),
      activeMode: o.activeMode as PersistedEnvelope['activeMode'],
    },
  };
}

export function emptyEnvelope(): PersistedEnvelope {
  return { schemaVersion: SCHEMA_VERSION, demo: null, personal: null, activeMode: null };
}

export function serializeEnvelope(e: PersistedEnvelope): string {
  return JSON.stringify(e);
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory storage for tests and for fallback when browser storage fails. */
export function createMemoryStorage(): KeyValueStorage & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    dump: () => Object.fromEntries(map),
  };
}
