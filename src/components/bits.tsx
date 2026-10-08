import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';

export function DemoBanner() {
  const { activeMode } = useApp();
  if (activeMode !== 'demo') return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 rounded-2xl bg-loop-mint/80 px-4 py-2 text-center text-xs font-semibold text-loop-ink ring-1 ring-inset ring-loop-teal/20"
    >
      <span aria-hidden>🧪</span> Fictional demo data (Maya) — not a real patient.
    </div>
  );
}

export function DisclaimerStrip() {
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      For education, tracking, and appointment preparation only. Not medical
      advice. Bring questions to your clinician.
    </p>
  );
}

export function StorageNotice() {
  const { storageStatus } = useApp();
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">
        Entries are stored locally in this browser in this prototype.
      </p>
      <p className="text-xs text-slate-500">
        Please use synthetic or non-sensitive test data only.
      </p>
      {storageStatus.state === 'storage-unavailable' && (
        <p role="alert" className="text-xs font-semibold text-amber-700">
          Browser storage is unavailable — entries will not persist after you
          leave this page.
        </p>
      )}
      {storageStatus.state === 'save-failed' && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          Saving failed (browser storage may be full) — recent changes may not
          persist after refresh.
        </p>
      )}
    </div>
  );
}

export function SummaryCard({
  title,
  children,
  pending,
}: {
  title: string;
  children: React.ReactNode;
  pending?: string;
}) {
  return (
    <section className="card" aria-label={title}>
      <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
      <div className="mt-2 text-sm text-loop-ink">{children}</div>
      {pending && <p className="hint-text mt-2">{pending}</p>}
    </section>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
      <p aria-hidden className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-loop-mist text-xl">○</p>
      <p className="mt-2 text-sm font-bold text-loop-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      <Link to={actionTo} className="btn-primary mt-4">
        {actionLabel} →
      </Link>
    </div>
  );
}
