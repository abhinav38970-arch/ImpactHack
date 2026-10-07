import { describe, expect, it } from 'vitest';
import {
  EDU_REGISTRY,
  findRelevant,
  getVerifiedByIds,
  groundingText,
  knownSourceIds,
  verifiedEntries,
} from './registry';

describe('educational registry gating', () => {
  it('exposes verified entries with bodies and source metadata', () => {
    for (const e of verifiedEntries()) {
      expect(e.body).not.toBeNull();
      expect(e.sourceUrl.startsWith('https://')).toBe(true);
      expect(e.dateChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.clinicianReviewed).toBe(false);
    }
    expect(verifiedEntries().length).toBeGreaterThanOrEqual(6);
  });

  it('never supplies unverified entries as guidance', () => {
    const unverified = EDU_REGISTRY.filter((e) => !e.sourceVerified);
    expect(unverified.length).toBeGreaterThan(0);
    for (const e of unverified) {
      expect(e.body).toBeNull();
    }
    expect(getVerifiedByIds(unverified.map((e) => e.id))).toEqual([]);
    expect(groundingText([])).toBe('');
  });

  it('retrieves relevant verified entries by keyword', () => {
    const ids = findRelevant('What does ALT measure?').map((e) => e.id);
    expect(ids).toContain('alt');
    const trig = findRelevant('my triglyceride results and cholesterol').map((e) => e.id);
    expect(trig).toContain('triglycerides');
  });

  it('never claims clinician review without a reviewer', () => {
    for (const e of EDU_REGISTRY) {
      expect(e.clinicianReviewed).toBe(false);
    }
  });

  it('knownSourceIds matches verified entries only', () => {
    expect(knownSourceIds()).toEqual(new Set(verifiedEntries().map((e) => e.id)));
  });
});
