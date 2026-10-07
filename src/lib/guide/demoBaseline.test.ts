import { describe, expect, it } from 'vitest';
import { FICTIONAL_BASELINE, baselineText, baselineTotals } from './demoBaseline';

describe('fictional demo baseline', () => {
  it('computes deterministic totals from fixed data', () => {
    const t = baselineTotals(FICTIONAL_BASELINE);
    expect(t).toEqual({
      labPanels: 3,
      latestPanelDaysAgo: 12,
      weightEntries: 6,
      activityEntries: 6,
      activityMinutesTotal: 165,
      activeHabits: 2,
    });
  });

  it('labels output as fictional and avoids clinical conclusions', () => {
    const text = baselineText(FICTIONAL_BASELINE);
    expect(text).toContain('fictional');
    expect(text).toContain('not a real patient');
    expect(text).toContain('165');
    expect(text.toLowerCase()).not.toContain('improv');
    expect(text.toLowerCase()).not.toContain('risk');
  });
});
