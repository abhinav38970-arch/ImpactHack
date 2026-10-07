import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';

const PAGES: Record<string, { title: string; phase: string; body: string; points: string[] }> = {
  trends: {
    title: 'Trends',
    phase: 'Planned for Phase 2',
    body: 'One metric at a time, always with dates and units. A single measurement will be shown as a value — never as a trend line.',
    points: [
      'Independent chart filter (changing it never alters the visit report period)',
      'Honest empty and single-value states',
      'No causal claims when habits and labs appear near each other',
    ],
  },
  habits: {
    title: 'Habits',
    phase: 'Planned for Phase 2',
    body: 'Up to 3 active habits with explicit weekday schedules, quick check-ins, and weekly reflections you control.',
    points: [
      'Starter library plus custom habits — nothing prescribed',
      'Completion counted against planned days only',
      'Reflections suggest; you decide whether to change anything',
    ],
  },
  insights: {
    title: 'Insights',
    phase: 'Planned for Phase 3',
    body: 'Plain rule-based summaries of what you recorded — counts, consistency, and missing information. Not labeled AI.',
    points: [
      'Activity totals and habit consistency',
      'Week-over-week comparisons',
      'Curated lab explanations only from verified sources',
    ],
  },
  visit: {
    title: 'Visit Prep',
    phase: 'Planned for Phase 4',
    body: 'A 4-task preparation checklist ending in a print-friendly one-page report with your results, notes, and top questions.',
    points: [
      'Review, questions (up to 3), notes, and report preview',
      'Missing information only from your own preparation list',
      'Print / Save as PDF plus a separate CSV export',
    ],
  },
};

export default function Placeholder({ page }: { page: keyof typeof PAGES }) {
  const info = PAGES[page];
  return (
    <div className="mx-auto max-w-xl space-y-4 pt-4">
      <div className="card text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-loop-teal">
          {info.phase}
        </p>
        <h1 className="mt-1 text-xl font-bold text-loop-ink">{info.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{info.body}</p>
        <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-sm text-slate-600">
          {info.points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="text-loop-teal">○</span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
          <Link to="/log" className="btn-secondary">
            Go to Log
          </Link>
        </div>
      </div>
      {page === 'insights' && <GuideEntryCard />}
      {page === 'visit' && <VisitDraftsCard />}
    </div>
  );
}

function GuideEntryCard() {
  return (
    <div className="card" aria-label="LiverLoop Guide">
      <p className="text-xs font-semibold uppercase tracking-wide text-loop-teal">
        AI assistant
      </p>
      <h2 className="mt-1 text-base font-bold text-loop-ink">LiverLoop Guide</h2>
      <p className="mt-1 text-sm text-slate-600">
        An educational assistant that explains LiverLoop features, answers from
        verified learning material, and helps phrase appointment questions. It
        does not diagnose or interpret personal results.
      </p>
      <Link to="/insights/guide" className="btn-primary mt-3">
        Open the Guide
      </Link>
    </div>
  );
}

function VisitDraftsCard() {
  const { activeProfile, removeGuideDraft, toggleGuideDraftSelected } = useApp();
  const drafts = activeProfile?.guideDrafts ?? [];
  if (drafts.length === 0) return null;
  return (
    <div className="card" aria-label="Draft questions from the Guide">
      <h2 className="text-base font-bold text-loop-ink">
        Draft questions from the Guide ({drafts.length})
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Saved from LiverLoop Guide suggestions. The full Visit Prep checklist
        arrives in a later phase and will use these drafts.
      </p>
      <ul className="mt-2 space-y-2">
        {drafts.map((d) => (
          <li key={d.id} className="flex items-start gap-2 rounded-xl bg-loop-mist px-3 py-2">
            <p className="flex-1 text-sm text-loop-ink">
              “{d.text}”
              {d.selected && (
                <span className="ml-2 rounded-full bg-loop-mint px-2 py-0.5 text-[11px] font-semibold">
                  Selected
                </span>
              )}
            </p>
            <button
              className="shrink-0 text-xs font-semibold text-loop-teal underline"
              onClick={() => toggleGuideDraftSelected(d.id)}
            >
              {d.selected ? 'Unselect' : 'Select'}
            </button>
            <button
              className="shrink-0 text-xs font-semibold text-red-700 underline"
              onClick={() => removeGuideDraft(d.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
