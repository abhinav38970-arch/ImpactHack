import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DemoBanner } from './bits';
import { useApp } from '../state/AppContext';

const DESKTOP_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◧' },
  { to: '/log', label: 'Log', icon: '✎' },
  { to: '/trends', label: 'Trends', icon: '↗' },
  { to: '/habits', label: 'Habits', icon: '✓' },
  { to: '/insights', label: 'Insights', icon: '☀' },
  { to: '/visit', label: 'Visit Prep', icon: '✉' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
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
      <div className="mx-auto flex min-h-screen max-w-6xl">
        {/* Desktop sidebar — hidden in print */}
        <aside className="no-print hidden w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white/70 p-4 md:flex">
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 rounded-xl px-2 py-1 text-left"
            aria-label="LiverLoop home"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-loop-teal text-lg font-bold text-white"
            >
              L
            </span>
            <span>
              <span className="block text-base font-bold leading-tight text-loop-ink">
                LiverLoop
              </span>
              <span className="block text-xs text-slate-500">
                {activeProfile ? activeProfile.profile.displayName : 'Welcome'}
              </span>
            </span>
          </button>
          <nav aria-label="Primary">
            {DESKTOP_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => linkClass(isActive)}
              >
                <span aria-hidden className="w-5 text-center">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar — hidden in print */}
          <header className="no-print flex items-center gap-2 bg-white/70 px-4 py-3 md:hidden">
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

          <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 pb-24 pt-4 md:px-6 md:pb-12">
            <DemoBanner />
            <Outlet />
          </main>

          {/* Mobile bottom tabs — hidden in print */}
          <nav
            aria-label="Primary mobile"
            className="no-print fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden"
          >
            {MOBILE_TABS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium ${
                    isActive ? 'text-loop-teal' : 'text-slate-500'
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
