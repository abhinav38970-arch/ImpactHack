import { describe, expect, it } from 'vitest';
import type { PersistedEnvelope } from './types';
import {
  SCHEMA_VERSION,
  createMemoryStorage,
  emptyEnvelope,
  loadEnvelope,
  serializeEnvelope,
} from './storage';
import { defaultVisitPrep } from './visitPrep';

function envelopeWith(over: Partial<PersistedEnvelope>): string {
  return serializeEnvelope({ ...emptyEnvelope(), ...over });
}

describe('loadEnvelope', () => {
  it('reports fresh when nothing is stored', () => {
    expect(loadEnvelope(null)).toEqual({ status: 'fresh' });
  });

  it('round-trips a valid envelope', () => {
    const raw = envelopeWith({ activeMode: 'demo' });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.envelope.schemaVersion).toBe(SCHEMA_VERSION);
      expect(res.envelope.activeMode).toBe('demo');
    }
  });

  it('keeps demo and personal isolated in one envelope', () => {
    const raw = envelopeWith({
      demo: {
        profile: { displayName: 'Maya' },
        entries: [{ id: 'a', kind: 'ALT', date: '2026-09-01', unit: 'U/L', value: 50 }],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [],
        recordsRev: 0,
        contentRev: 0,
        visitPrep: defaultVisitPrep(),
        updatedAt: 'x',
      },
      personal: {
        profile: { displayName: 'You' },
        entries: [],
        habits: [],
        checkins: [],
        reflections: [],
        guideDrafts: [],
        recordsRev: 0,
        contentRev: 0,
        visitPrep: defaultVisitPrep(),
        updatedAt: 'x',
      },
      activeMode: 'personal',
    });
    const res = loadEnvelope(raw);
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.envelope.demo!.entries).toHaveLength(1);
      expect(res.envelope.personal!.entries).toHaveLength(0);
    }
  });

  it('reports invalid-json without throwing, preserving the raw text', () => {
    const res = loadEnvelope('{not json');
    expect(res.status).toBe('invalid-json');
    if (res.status === 'invalid-json') expect(res.raw).toBe('{not json');
  });

  it('rejects malformed shapes as invalid-json', () => {
    expect(loadEnvelope('[]').status).toBe('invalid-json');
    expect(loadEnvelope('"x"').status).toBe('invalid-json');
    expect(
      loadEnvelope(envelopeWith({ activeMode: 'nope' } as never)).status,
    ).toBe('invalid-json');
  });

  it('reports unsupported-version for other schema versions', () => {
    const res = loadEnvelope('{"schemaVersion":99,"demo":null,"personal":null,"activeMode":null}');
    expect(res.status).toBe('unsupported-version');
    if (res.status === 'unsupported-version') expect(res.found).toBe(99);
  });
});

describe('memory storage adapter', () => {
  it('stores and retrieves values', () => {
    const s = createMemoryStorage();
    expect(s.getItem('k')).toBeNull();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });
});
