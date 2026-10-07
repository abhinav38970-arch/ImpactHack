import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, loadEnvelope, serializeEnvelope } from './storage';

/** A Phase 1-shaped envelope: schemaVersion 1, no habit collections. */
function phase1Envelope(): string {
  return JSON.stringify({
    schemaVersion: 1,
    demo: {
      profile: { displayName: 'Maya', visitDate: '2026-11-01' },
      entries: [{ id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 50 }],
      updatedAt: 'x',
    },
    personal: {
      profile: { displayName: 'You' },
      entries: [{ id: 'b', kind: 'WEIGHT', date: '2026-09-02', unit: 'lb', value: 186 }],
      updatedAt: 'y',
    },
    activeMode: 'demo',
  });
}

describe('v1 to v2 migration', () => {
  it('migrates non-destructively, preserving both profiles', () => {
    const res = loadEnvelope(phase1Envelope());
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect(res.envelope.demo!.entries).toHaveLength(1);
    expect(res.envelope.demo!.habits).toEqual([]);
    expect(res.envelope.demo!.checkins).toEqual([]);
    expect(res.envelope.demo!.reflections).toEqual([]);
    expect(res.envelope.demo!.guideDrafts).toEqual([]);
    expect(res.envelope.personal!.entries).toHaveLength(1);
    expect(res.envelope.personal!.habits).toEqual([]);
    expect(res.envelope.personal!.guideDrafts).toEqual([]);
    expect(res.envelope.activeMode).toBe('demo');
    // Migrated envelope re-serializes and loads cleanly.
    expect(loadEnvelope(serializeEnvelope(res.envelope)).status).toBe('ok');
  });

  it('keeps demo and personal isolated after migration', () => {
    const res = loadEnvelope(phase1Envelope());
    if (res.status !== 'ok') return;
    expect(res.envelope.demo!.entries[0].id).not.toBe(
      res.envelope.personal!.entries[0].id,
    );
  });

  it('does not give existing empty profiles fictional habits', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      demo: null,
      personal: { profile: { displayName: 'You' }, entries: [], updatedAt: 'y' },
      activeMode: 'personal',
    });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.envelope.personal!.habits).toEqual([]);
    expect(res.envelope.personal!.guideDrafts).toEqual([]);
    expect(res.envelope.demo).toBeNull();
  });
});

describe('v2 to v3 migration', () => {
  it('preserves records and adds empty draft lists per profile', () => {
    const raw = JSON.stringify({
      schemaVersion: 2,
      demo: {
        profile: { displayName: 'Maya' },
        entries: [{ id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 50 }],
        habits: [],
        checkins: [],
        reflections: [],
        updatedAt: 'x',
      },
      personal: {
        profile: { displayName: 'You' },
        entries: [],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [{ id: 'd1', text: 'Kept draft', selected: true, createdAt: 'x' }],
        updatedAt: 'y',
      },
      activeMode: 'personal',
    });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect(res.envelope.demo!.entries).toHaveLength(1);
    expect(res.envelope.demo!.guideDrafts).toEqual([]);
    // Existing drafts survive migration untouched (isolation intact).
    expect(res.envelope.personal!.guideDrafts).toHaveLength(1);
    expect(res.envelope.personal!.guideDrafts[0].text).toBe('Kept draft');
  });
});

describe('v3 to v4 migration', () => {
  it('preserves everything and adds revision counters plus visit-prep state', () => {
    const raw = JSON.stringify({
      schemaVersion: 3,
      demo: {
        profile: { displayName: 'Maya' },
        entries: [{ id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 50 }],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [{ id: 'd1', text: 'Kept draft', selected: true, createdAt: 'x' }],
        updatedAt: 'x',
      },
      personal: {
        profile: { displayName: 'You' },
        entries: [],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [],
        updatedAt: 'y',
      },
      activeMode: 'demo',
    });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.envelope.schemaVersion).toBe(SCHEMA_VERSION);
    expect(res.envelope.demo!.entries).toHaveLength(1);
    expect(res.envelope.demo!.guideDrafts).toHaveLength(1);
    expect(res.envelope.demo!.recordsRev).toBe(0);
    expect(res.envelope.demo!.contentRev).toBe(0);
    expect(res.envelope.demo!.visitPrep.period).toEqual({ kind: 'days', days: 90 });
    expect(res.envelope.demo!.visitPrep.reviewedRecordsRev).toBeNull();
    expect(res.envelope.personal!.visitPrep.items).toEqual([]);
    // Migrated envelope re-serializes and loads cleanly.
    expect(loadEnvelope(serializeEnvelope(res.envelope)).status).toBe('ok');
  });

  it('preserves existing v4 revision and prep state', () => {
    const raw = JSON.stringify({
      schemaVersion: 4,
      demo: {
        profile: { displayName: 'Maya' },
        entries: [],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [],
        recordsRev: 7,
        contentRev: 3,
        visitPrep: {
          period: { kind: 'all' },
          noQuestions: true,
          notes: '',
          noNotes: false,
          items: [],
          reviewedRecordsRev: 7,
          reviewedRecordIds: [],
          previewRecordsRev: null,
          previewContentRev: null,
          previewRecordIds: null,
          previewPeriod: null,
        },
        updatedAt: 'x',
      },
      personal: null,
      activeMode: 'demo',
    });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status !== 'ok') return;
    expect(res.envelope.demo!.recordsRev).toBe(7);
    expect(res.envelope.demo!.visitPrep.noQuestions).toBe(true);
  });
});
