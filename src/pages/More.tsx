import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/trends', label: 'Trends', desc: 'One metric at a time', icon: '↗' },
  { to: '/insights', label: 'Insights', desc: 'Counts + verified learning', icon: '☀' },
  { to: '/visit', label: 'Visit Prep', desc: 'Questions + print report', icon: '✉' },
  { to: '/settings', label: 'Settings', desc: 'Profile, exports, privacy', icon: '⚙' },
];

export default function More() {
  return (
    <div className="mx-auto max-w-xl space-y-3 pt-2">
      <div>
        <h1 className="page-title">More</h1>
        <p className="page-sub">Everything else, one tap away.</p>
      </div>
      {LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="card flex items-center gap-3 !p-4 transition hover:-translate-y-px hover:shadow">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-loop-mist text-lg">{l.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-loop-ink">{l.label}</span>
            <span className="block truncate text-xs text-slate-500">{l.desc}</span>
          </span>
          <span aria-hidden className="text-lg text-slate-300">›</span>
        </Link>
      ))}
      <div className="card !bg-loop-teal !text-white">
        <p className="text-sm font-bold">Need help?</p>
        <p className="mt-0.5 text-xs text-white/85">The 💬 Guide in the bottom-right works on every page.</p>
      </div>
    </div>
  );
}
