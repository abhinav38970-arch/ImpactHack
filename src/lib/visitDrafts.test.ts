import { describe, expect, it } from 'vitest';
import { MAX_SELECTED_DRAFTS, addDraft, removeDraft, selectedDrafts, toggleDraftSelected } from './visitDrafts';
import type { GuideDraft } from './types';

function draft(id: string, text = 'Question?', selected = false): GuideDraft {
  return { id, text, selected, createdAt: 'x' };
}

describe('visit drafts', () => {
  it('selects drafts until the cap, then keeps extras unselected', () => {
    let drafts: GuideDraft[] = [];
    for (let i = 0; i < MAX_SELECTED_DRAFTS; i++) {
      const r = addDraft(drafts, draft(`d${i}`, `Q${i}?`));
      drafts = r.drafts;
      expect(r.selected).toBe(true);
    }
    const full = addDraft(drafts, draft('extra', 'One more?'));
    expect(full.selected).toBe(false);
    expect(selectedDrafts(full.drafts)).toHaveLength(MAX_SELECTED_DRAFTS);
    // Never replaces another question silently.
    expect(full.drafts.map((d) => d.id)).toContain('extra');
  });

  it('toggles selection with a full signal at capacity', () => {
    let drafts: GuideDraft[] = [];
    for (let i = 0; i < MAX_SELECTED_DRAFTS; i++) {
      drafts = addDraft(drafts, draft(`d${i}`, `Q${i}?`)).drafts;
    }
    const unselected = addDraft(drafts, draft('extra', 'One more?')).drafts;
    expect(toggleDraftSelected(unselected, 'extra').result).toBe('full');
    const freed = toggleDraftSelected(unselected, 'd0');
    expect(freed.result).toBe('deselected');
    expect(toggleDraftSelected(freed.drafts, 'extra').result).toBe('selected');
  });

  it('removes drafts and rejects empty or oversized text', () => {
    const drafts = addDraft([], draft('a', 'Keep?')).drafts;
    expect(removeDraft(drafts, 'a')).toEqual([]);
    expect(addDraft([], draft('b', '')).drafts).toEqual([]);
    expect(addDraft([], draft('c', 'x'.repeat(201))).drafts).toEqual([]);
  });
});
