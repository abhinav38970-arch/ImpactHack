import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DemoBanner } from './bits';
import { useApp } from '../state/AppContext';

const DESKTOP_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◧', hint: 'Today + progress' },
  { to: '/log', label: 'Log', icon: '✎', hint: 'Record results' },
  { to: '/trends', label: 'Trends', icon: '↗', hint: 'Change over time' },
  { to: '/habits', label: 'Habits', icon: '✓', hint: 'Small steps' },
  { to: '/insights', label: 'Insights', icon: '☀', hint: 'Summaries + Guide' },
  { to: '/visit', label: 'Visit Prep', icon: '✉', hint: 'Questions + report' },
  { to: '/settings', label: 'Settings', icon: '⚙', hint: 'Profile + data' },
];

const MOBILE_TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◧' },
  { to: '/log', label: 'Log', icon: '✎' },
  { to: '/habits', label: 'Habits', icon: '✓' },
  { to: '/more', label: 'More', icon: '⋯' },
];

function linkClass(active: boolean) {
  return `nav-link ${active ? 'nav-link-active' : ''}`;
}

export default function Shell() {
  const { activeProfile } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        {/* Desktop sidebar — hidden in print */}
        <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-200/80 bg-white/80 p-4 backdrop-blur md:flex">
          <button
            onClick={() => navigate('/')}
            className="mb-2 flex items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition hover:bg-loop-mist"
            aria-label="LiverLoop home"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-loop-teal text-lg font-bold text-white shadow-sm"
            >
              L
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold leading-tight text-loop-ink">
                LiverLoop
              </span>
              <span className="block truncate text-xs text-slate-500">
                {activeProfile ? `${activeProfile.profile.displayName} · Record → Reflect → Prepare` : 'Welcome'}
              </span>
            </span>
          </button>
          <nav aria-label="Primary" className="space-y-0.5">
            {DESKTOP_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => linkClass(isActive)}
                title={item.hint}
              >
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-loop-mist text-center text-sm">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight">{item.label}</span>
                  <span className="block text-[11px] font-normal text-slate-400">{item.hint}</span>
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-loop-teal p-3 text-white">
            <p className="text-xs font-bold">Questions?</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/85">Tap 💬 bottom-right — Guide is on every page.</p>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar — hidden in print */}
          <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-loop-teal font-bold text-white"
            >
              L
            </span>
            <span className="text-base font-bold text-loop-ink">LiverLoop</span>
            {location.pathname === '/more' ? null : (
              <span className="ml-auto text-xs text-slate-500">
                {activeProfile?.profile.displayName ?? ''}
              </span>
            )}
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 pb-32 pt-4 md:px-8 md:pb-16">
            <DemoBanner />
            <Outlet />
          </main>

          {/* Mobile bottom tabs — hidden in print */}
          <nav
            aria-label="Primary mobile"
            className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-slate-200/80 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden"
          >
            {MOBILE_TABS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition ${
                    isActive ? 'bg-loop-mint/60 text-loop-ink' : 'text-slate-500 hover:bg-slate-50'
                  }`
                }
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
