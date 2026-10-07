import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/trends', label: 'Trends', desc: 'Change over time' },
  { to: '/insights', label: 'Insights', desc: 'Summaries of your records' },
  { to: '/visit', label: 'Visit Prep', desc: 'Questions and report' },
  { to: '/settings', label: 'Settings', desc: 'Profile, data, privacy' },
];

export default function More() {
  return (
    <div className="space-y-3 pt-2">
      <h1 className="text-xl font-bold text-loop-ink">More</h1>
      {LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="card flex items-center gap-3 !p-4">
          <span className="flex-1">
            <span className="block text-sm font-semibold text-loop-ink">{l.label}</span>
            <span className="block text-xs text-slate-500">{l.desc}</span>
          </span>
          <span aria-hidden className="text-slate-400">›</span>
        </Link>
      ))}
    </div>
  );
}
