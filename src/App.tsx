import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Guide from './pages/Guide';
import Habits from './pages/Habits';
import Insights from './pages/Insights';
import Log from './pages/Log';
import More from './pages/More';
import Opening from './pages/Opening';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Trends from './pages/Trends';
import Visit from './pages/Visit';
import { useApp } from './state/AppContext';

/**
 * BrowserRouter with server fallback config:
 * - Vercel: vercel.json rewrites all paths to /index.html
 * - Netlify/static: public/_redirects
 */
function RequireProfile({ children }: { children: JSX.Element }) {
  const { loadState, activeMode } = useApp();
  if (loadState.status === 'loading') {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <p className="text-sm text-slate-500">Loading LiverLoop…</p>
      </div>
    );
  }
  if (loadState.status === 'invalid-json') {
    return <RecoveryScreen kind="invalid" />;
  }
  if (loadState.status === 'unsupported-version') {
    return <RecoveryScreen kind="version" found={loadState.found} />;
  }
  if (!activeMode) return <Navigate to="/" replace />;
  return children;
}

function RecoveryScreen({ kind, found }: { kind: 'invalid' | 'version'; found?: unknown }) {
  const { recoverFresh } = useApp();
  return (
    <div className="mx-auto max-w-md space-y-4 pt-16">
      <div className="card" role="alert">
        <h1 className="text-lg font-bold text-loop-ink">Saved data couldn&apos;t be read</h1>
        <p className="mt-2 text-sm text-slate-600">
          {kind === 'invalid'
            ? 'What is stored in this browser is not valid LiverLoop data. Nothing was deleted: a backup copy was kept in this browser under a separate key.'
            : `What is stored in this browser was saved by an unsupported version (found: ${String(found)}). Nothing was deleted.`}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          You can start fresh with an empty opening screen. Previously saved
          records will not be available.
        </p>
        <button className="btn-primary mt-4" onClick={recoverFresh}>
          Start fresh
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Opening />} />
        <Route
          element={
            <RequireProfile>
              <Shell />
            </RequireProfile>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/guide" element={<Guide />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/visit/report" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/more" element={<More />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
