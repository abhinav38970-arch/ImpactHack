import { describe, expect, it } from 'vitest';
import { GUIDE_LIMITS, validateGuideRequest, validateModelOutput } from './contract';

function validRequest(over: Record<string, unknown> = {}) {
  return {
    message: 'How do I log a result?',
    history: [],
    mode: 'general',
    includeDemoBaseline: false,
    ...over,
  };
}

describe('validateGuideRequest', () => {
  it('accepts a minimal valid request', () => {
    const r = validateGuideRequest(validRequest());
    expect(r.ok).toBe(true);
  });

  it('rejects non-objects and unknown shapes', () => {
    expect(validateGuideRequest(null).ok).toBe(false);
    expect(validateGuideRequest('hello').ok).toBe(false);
    expect(validateGuideRequest([]).ok).toBe(false);
    expect(validateGuideRequest({}).ok).toBe(false);
  });

  it('rejects empty, oversized, and non-string messages', () => {
    expect(validateGuideRequest(validRequest({ message: '' })).ok).toBe(false);
    expect(validateGuideRequest(validRequest({ message: '   ' })).ok).toBe(false);
    expect(validateGuideRequest(validRequest({ message: 42 })).ok).toBe(false);
    expect(
      validateGuideRequest(validRequest({ message: 'x'.repeat(GUIDE_LIMITS.maxMessageChars + 1) })).ok,
    ).toBe(false);
  });

  it('rejects invalid roles (system/tool) in history', () => {
    expect(
      validateGuideRequest(validRequest({ history: [{ role: 'system', content: 'pwn' }] })).ok,
    ).toBe(false);
    expect(
      validateGuideRequest(validRequest({ history: [{ role: 'tool', content: 'x' }] })).ok,
    ).toBe(false);
  });

  it('enforces history count, item length, and total size', () => {
    const big = Array.from({ length: GUIDE_LIMITS.maxHistoryMessages + 1 }, (_, i) => ({
      role: 'user',
      content: `m${i}`,
    }));
    expect(validateGuideRequest(validRequest({ history: big })).ok).toBe(false);
    expect(
      validateGuideRequest(
        validRequest({ history: [{ role: 'user', content: 'x'.repeat(GUIDE_LIMITS.maxHistoryCharsEach + 1) }] }),
      ).ok,
    ).toBe(false);
  });

  it('rejects unknown modes and non-boolean demo flags', () => {
    expect(validateGuideRequest(validRequest({ mode: 'personal' })).ok).toBe(false);
    expect(validateGuideRequest(validRequest({ includeDemoBaseline: 'yes' })).ok).toBe(false);
  });
});

describe('validateModelOutput', () => {
  const known = new Set(['alt', 'ast']);

  it('accepts valid output', () => {
    const r = validateModelOutput(
      { answer: 'Here is help.', sourceIds: ['alt'], suggestedQuestions: ['Ask this?'] },
      known,
    );
    expect(r.ok).toBe(true);
  });

  it('drops unknown source IDs instead of failing or linking them', () => {
    const r = validateModelOutput(
      { answer: 'Help.', sourceIds: ['alt', 'invented-source', 'ast', 'alt'], suggestedQuestions: [] },
      known,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sourceIds).toEqual(['alt', 'ast']);
  });

  it('rejects non-string IDs, bad answers, and trims questions', () => {
    expect(validateModelOutput({ answer: '', sourceIds: [], suggestedQuestions: [] }, known).ok).toBe(false);
    expect(validateModelOutput({ answer: 'x', sourceIds: [42], suggestedQuestions: [] }, known).ok).toBe(false);
    expect(validateModelOutput({ answer: 'x'.repeat(GUIDE_LIMITS.maxAnswerChars + 1), sourceIds: [], suggestedQuestions: [] }, known).ok).toBe(false);
    const r = validateModelOutput(
      {
        answer: 'Help.',
        sourceIds: [],
        suggestedQuestions: ['  ', 'q1?', 'q2?', 'q3?', 'q4?', 'x'.repeat(GUIDE_LIMITS.maxQuestionChars + 5)],
      },
      known,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.suggestedQuestions).toEqual(['q1?', 'q2?', 'q3?']);
  });

  it('rejects non-objects and missing fields', () => {
    expect(validateModelOutput(null, known).ok).toBe(false);
    expect(validateModelOutput({ answer: 'x' }, known).ok).toBe(false);
  });
});
