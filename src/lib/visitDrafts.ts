/**
 * Draft appointment questions saved from LiverLoop Guide (pure helpers).
 * At most MAX_SELECTED_DRAFTS may be selected for the future Visit Prep
 * report. Saving never replaces another question silently: when full, new
 * drafts are kept unselected and the UI reports the capacity limit.
 */

import type { GuideDraft } from './types';

export const MAX_SELECTED_DRAFTS = 3;
export const MAX_DRAFT_CHARS = 200;

export function selectedDrafts(drafts: GuideDraft[]): GuideDraft[] {
  return drafts.filter((d) => d.selected);
}

export function addDraft(
  drafts: GuideDraft[],
  draft: GuideDraft,
): { drafts: GuideDraft[]; selected: boolean; duplicate: boolean } {
  const text = draft.text.trim();
  if (text.length === 0 || text.length > MAX_DRAFT_CHARS) {
    return { drafts, selected: false, duplicate: false };
  }
  // Never store the same question twice: select the existing one instead.
  const existing = drafts.find((d) => d.text.trim().toLowerCase() === text.toLowerCase());
  if (existing) {
    if (existing.selected) return { drafts, selected: true, duplicate: true };
    const toggled = toggleDraftSelected(drafts, existing.id);
    return { drafts: toggled.drafts, selected: toggled.result === 'selected', duplicate: true };
  }
  const select = selectedDrafts(drafts).length < MAX_SELECTED_DRAFTS;
  return {
    drafts: [...drafts, { ...draft, text, selected: select }],
    selected: select,
    duplicate: false,
  };
}

export type ToggleResult = 'selected' | 'deselected' | 'full';

export function toggleDraftSelected(
  drafts: GuideDraft[],
  id: string,
): { drafts: GuideDraft[]; result: ToggleResult } {
  const target = drafts.find((d) => d.id === id);
  if (!target) return { drafts, result: 'deselected' };
  if (target.selected) {
    return {
      drafts: drafts.map((d) => (d.id === id ? { ...d, selected: false } : d)),
      result: 'deselected',
    };
  }
  if (selectedDrafts(drafts).length >= MAX_SELECTED_DRAFTS) {
    return { drafts, result: 'full' };
  }
  return {
    drafts: drafts.map((d) => (d.id === id ? { ...d, selected: true } : d)),
    result: 'selected',
  };
}

export function removeDraft(drafts: GuideDraft[], id: string): GuideDraft[] {
  return drafts.filter((d) => d.id !== id);
}

/** Move a draft earlier (-1) or later (+1) in report order. No-op at edges. */
export function moveDraft(drafts: GuideDraft[], id: string, dir: -1 | 1): GuideDraft[] {
  const i = drafts.findIndex((d) => d.id === id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= drafts.length) return drafts;
  const next = [...drafts];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
