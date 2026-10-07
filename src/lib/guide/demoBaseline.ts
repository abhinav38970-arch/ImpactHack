/**
 * LiverLoop Guide — fixed fictional demo baseline (server-side).
 *
 * The server never trusts browser-sent records as "fictional". When the user
 * explicitly requests a Maya summary, this fixed baseline is supplied, and
 * numerical totals below are calculated by deterministic code — the model
 * receives them as facts. This baseline mirrors the app's Maya seed in shape
 * but is deliberately minimal; it must not imply it reflects later edits.
 */

export interface FictionalBaseline {
  name: string;
  age: number;
  labPanels: Array<{
    daysAgo: number;
    alt: number;
    ast: number;
    ggt: number;
    platelets: number;
    triglycerides: number;
    hba1c: number;
  }>;
  weightsLb: number[];
  waistIn: number[];
  activityMinutes: number[];
  habits: Array<{ title: string; schedule: string; target: string }>;
  reflectionWeeks: number;
  visitInDays: number;
}

export const FICTIONAL_BASELINE: FictionalBaseline = {
  name: 'Maya',
  age: 52,
  labPanels: [
    { daysAgo: 80, alt: 54, ast: 38, ggt: 48, platelets: 242, triglycerides: 168, hba1c: 6.1 },
    { daysAgo: 45, alt: 49, ast: 41, ggt: 44, platelets: 251, triglycerides: 175, hba1c: 6.0 },
    { daysAgo: 12, alt: 52, ast: 39, ggt: 47, platelets: 246, triglycerides: 162, hba1c: 6.2 },
  ],
  weightsLb: [186.4, 187.1, 185.6, 186.8, 185.2, 186.0],
  waistIn: [38.2, 37.9, 38.0],
  activityMinutes: [25, 30, 20, 35, 25, 30],
  habits: [
    { title: 'Movement I choose', schedule: 'Monday, Wednesday, Friday', target: '20 min' },
    { title: 'Add a vegetable to a meal', schedule: 'Tuesday, Thursday, Saturday', target: 'none set' },
  ],
  reflectionWeeks: 1,
  visitInDays: 21,
};

export interface BaselineTotals {
  labPanels: number;
  latestPanelDaysAgo: number;
  weightEntries: number;
  activityEntries: number;
  activityMinutesTotal: number;
  activeHabits: number;
}

/** Deterministic totals — the model must use these, not compute its own. */
export function baselineTotals(b: FictionalBaseline): BaselineTotals {
  return {
    labPanels: b.labPanels.length,
    latestPanelDaysAgo: Math.min(...b.labPanels.map((p) => p.daysAgo)),
    weightEntries: b.weightsLb.length,
    activityEntries: b.activityMinutes.length,
    activityMinutesTotal: b.activityMinutes.reduce((s, m) => s + m, 0),
    activeHabits: b.habits.length,
  };
}

export function baselineText(b: FictionalBaseline): string {
  const t = baselineTotals(b);
  const habits = b.habits
    .map((h) => `- ${h.title} (${h.schedule}; target: ${h.target})`)
    .join('\n');
  return [
    'Based on the fictional demo baseline. Maya is a fictional 52-year-old demonstration profile, not a real patient.',
    `Recorded information: ${t.labPanels} lab panels (ALT, AST, GGT, platelet count, triglycerides, HbA1c), most recent about ${t.latestPanelDaysAgo} days ago; ${t.weightEntries} weight entries; ${t.activityEntries} activity entries totaling ${t.activityMinutesTotal} logged minutes; ${b.reflectionWeeks} saved weekly reflection; next visit in about ${b.visitInDays} days.`,
    `Active habits:\n${habits}`,
    'ALT values across panels (U/L): ' +
      b.labPanels.map((p) => p.alt).join(', ') +
      '. AST values (U/L): ' +
      b.labPanels.map((p) => p.ast).join(', ') +
      '. These are recorded numbers only; do not interpret them or infer outcomes.',
  ].join('\n');
}
