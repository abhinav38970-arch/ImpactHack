import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { todayISO } from '../lib/dates';
import { buildDemoSeed } from '../lib/seed';
import {
  STORAGE_KEY,
  emptyEnvelope,
  loadEnvelope,
  serializeEnvelope,
} from '../lib/storage';
import type {
  AppMode,
  Entry,
  GuideDraft,
  Habit,
  PersistedEnvelope,
  ProfileState,
  Reflection,
} from '../lib/types';
import { pauseHabit, resumeHabit, toggleCheckin, upsertReflection } from '../lib/habits';
import { addDraft, removeDraft, toggleDraftSelected } from '../lib/visitDrafts';
import type { ToggleResult } from '../lib/visitDrafts';

export type StorageStatus =
  | { state: 'ready' }
  | { state: 'storage-unavailable' }
  | { state: 'save-failed' };

export type LoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'invalid-json'; raw: string }
  | { status: 'unsupported-version'; found: unknown };

interface AppContextValue {
  loadState: LoadState;
  envelope: PersistedEnvelope;
  activeMode: AppMode | null;
  activeProfile: ProfileState | null;
  storageStatus: StorageStatus;
  chooseDemo: () => void;
  choosePersonal: (displayName: string, visitDate?: string) => void;
  switchMode: (mode: AppMode) => void;
  updateProfile: (patch: { displayName?: string; visitDate?: string }) => void;
  clearVisitDate: () => void;
  addEntry: (e: Entry) => void;
  updateEntry: (e: Entry) => void;
  deleteEntry: (id: string) => void;
  addHabit: (h: Habit) => void;
  /** Edit appends a schedule segment (prospective). Returns false if missing. */
  editHabitSchedule: (
    id: string,
    segment: Habit['scheduleHistory'][number],
  ) => void;
  renameHabit: (id: string, title: string) => void;
  pauseHabitOn: (id: string, fromISO: string) => void;
  resumeHabitOn: (id: string, onISO: string) => void;
  archiveHabit: (id: string) => void;
  toggleCheckin: (habitId: string, dateISO: string) => void;
  saveReflection: (r: Reflection) => void;
  /** Save a Guide-suggested question as a draft. Returns whether selected. */
  addGuideDraft: (draft: GuideDraft) => boolean;
  /** Toggle draft selection for the future report. Respects the cap of 3. */
  toggleGuideDraftSelected: (id: string) => ToggleResult;
  removeGuideDraft: (id: string) => void;
  resetDemo: () => void;
  clearPersonal: () => void;
  /** Discard unreadable saved data (a backup is kept) and start fresh. */
  recoverFresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [envelope, setEnvelope] = useState<PersistedEnvelope>(emptyEnvelope());
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({ state: 'ready' });
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      setStorageOk(false);
      setStorageStatus({ state: 'storage-unavailable' });
      setLoadState({ status: 'ready' });
      return;
    }
    const res = loadEnvelope(raw);
    if (res.status === 'ok') {
      setEnvelope(res.envelope);
      setLoadState({ status: 'ready' });
    } else if (res.status === 'fresh') {
      setLoadState({ status: 'ready' });
    } else if (res.status === 'invalid-json') {
      try {
        window.localStorage.setItem(
          `${STORAGE_KEY}.unreadable.${Date.now()}`,
          res.raw,
        );
      } catch {
        /* backup best-effort only */
      }
      setLoadState({ status: 'invalid-json', raw: res.raw });
    } else {
      setLoadState({ status: 'unsupported-version', found: res.found });
    }
  }, []);

  // Persist the whole envelope on change. One key, both modes, no drift.
  useEffect(() => {
    if (loadState.status !== 'ready') return;
    if (!storageOk) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeEnvelope(envelope));
    } catch {
      setStorageStatus({ state: 'save-failed' });
    }
  }, [envelope, loadState.status, storageOk]);

  const mutateMode = useCallback(
    (mode: AppMode, fn: (prev: ProfileState | null) => ProfileState | null) => {
      setEnvelope((prev) => ({ ...prev, [mode]: fn(prev[mode]) }));
    },
    [],
  );

  const value = useMemo<AppContextValue>(() => {
    const activeMode = envelope.activeMode;
    const activeProfile =
      activeMode === 'demo'
        ? envelope.demo
        : activeMode === 'personal'
          ? envelope.personal
          : null;
    return {
      loadState,
      envelope,
      activeMode,
      activeProfile,
      storageStatus,
      chooseDemo: () => {
        setEnvelope((prev) => ({
          ...prev,
          demo: prev.demo ?? buildDemoSeed(todayISO()),
          activeMode: 'demo',
        }));
      },
      choosePersonal: (displayName, visitDate) => {
        const name = displayName.trim() === '' ? 'You' : displayName.trim();
        setEnvelope((prev) => ({
          ...prev,
          personal: prev.personal ?? {
            profile: { displayName: name, ...(visitDate ? { visitDate } : {}) },
            entries: [],
            habits: [],
            checkins: [],
            reflections: [],
            guideDrafts: [],
            updatedAt: new Date().toISOString(),
          },
          activeMode: 'personal',
        }));
      },
      switchMode: (mode) => {
        // Non-destructive: both datasets are preserved; only the pointer flips.
        setEnvelope((prev) => ({ ...prev, activeMode: mode }));
      },
      updateProfile: (patch) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) => {
          if (!prev) return prev;
          const profile = { ...prev.profile };
          if (patch.displayName !== undefined) {
            const n = patch.displayName.trim();
            if (n !== '') profile.displayName = n;
          }
          if (patch.visitDate !== undefined) {
            if (patch.visitDate === '') delete profile.visitDate;
            else profile.visitDate = patch.visitDate;
          }
          return { ...prev, profile, updatedAt: new Date().toISOString() };
        });
      },
      clearVisitDate: () => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) => {
          if (!prev) return prev;
          const profile = { ...prev.profile };
          delete profile.visitDate;
          return { ...prev, profile, updatedAt: new Date().toISOString() };
        });
      },
      addEntry: (e) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? { ...prev, entries: [...prev.entries, e], updatedAt: new Date().toISOString() }
            : prev,
        );
      },
      updateEntry: (e) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                entries: prev.entries.map((x) => (x.id === e.id ? e : x)),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      deleteEntry: (id) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                entries: prev.entries.filter((x) => x.id !== id),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      addHabit: (h) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? { ...prev, habits: [...prev.habits, h], updatedAt: new Date().toISOString() }
            : prev,
        );
      },
      editHabitSchedule: (id, segment) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                habits: prev.habits.map((h) =>
                  h.id === id
                    ? { ...h, scheduleHistory: [...h.scheduleHistory, segment] }
                    : h,
                ),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      renameHabit: (id, title) => {
        const t = title.trim();
        if (!activeMode || t === '') return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                habits: prev.habits.map((h) => (h.id === id ? { ...h, title: t } : h)),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      pauseHabitOn: (id, fromISO) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                habits: prev.habits.map((h) => (h.id === id ? pauseHabit(h, fromISO) : h)),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      resumeHabitOn: (id, onISO) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                habits: prev.habits.map((h) => (h.id === id ? resumeHabit(h, onISO) : h)),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      archiveHabit: (id) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                habits: prev.habits.map((h) =>
                  h.id === id
                    ? { ...h, status: 'archived', archivedAt: new Date().toISOString() }
                    : h,
                ),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      toggleCheckin: (habitId, dateISO) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                checkins: toggleCheckin(prev.checkins, habitId, dateISO),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      saveReflection: (r) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                reflections: upsertReflection(prev.reflections, r),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      addGuideDraft: (draft) => {
        if (!activeMode) return false;
        const current =
          activeMode === 'demo' ? envelope.demo : envelope.personal;
        const res = addDraft(current?.guideDrafts ?? [], draft);
        mutateMode(activeMode, (prev) =>
          prev
            ? { ...prev, guideDrafts: res.drafts, updatedAt: new Date().toISOString() }
            : prev,
        );
        return res.selected;
      },
      toggleGuideDraftSelected: (id) => {
        if (!activeMode) return 'deselected';
        const current =
          activeMode === 'demo' ? envelope.demo : envelope.personal;
        const res = toggleDraftSelected(current?.guideDrafts ?? [], id);
        mutateMode(activeMode, (prev) =>
          prev
            ? { ...prev, guideDrafts: res.drafts, updatedAt: new Date().toISOString() }
            : prev,
        );
        return res.result;
      },
      removeGuideDraft: (id) => {
        if (!activeMode) return;
        mutateMode(activeMode, (prev) =>
          prev
            ? {
                ...prev,
                guideDrafts: removeDraft(prev.guideDrafts, id),
                updatedAt: new Date().toISOString(),
              }
            : prev,
        );
      },
      resetDemo: () => {
        setEnvelope((prev) => ({
          ...prev,
          demo: buildDemoSeed(todayISO()),
          activeMode: 'demo',
        }));
      },
      clearPersonal: () => {
        setEnvelope((prev) => ({ ...prev, personal: null, activeMode: prev.demo ? 'demo' : null }));
      },
      recoverFresh: () => {
        setEnvelope(emptyEnvelope());
        setLoadState({ status: 'ready' });
      },
    };
  }, [envelope, loadState, storageStatus, mutateMode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
