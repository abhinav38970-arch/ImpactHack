import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisclaimerStrip, StorageNotice } from '../components/bits';
import { formatLong, todayISO } from '../lib/dates';
import { useApp } from '../state/AppContext';

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  danger,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (armed) {
    return (
      <span className="flex flex-wrap gap-2">
        <button className={danger ? 'btn-danger' : 'btn-secondary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn-secondary" onClick={() => setArmed(false)}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button className={danger ? 'btn-danger' : 'btn-secondary'} onClick={() => setArmed(true)}>
      {label}
    </button>
  );
}

export default function Settings() {
  const {
    activeMode,
    activeProfile,
    envelope,
    switchMode,
    updateProfile,
    clearVisitDate,
    resetDemo,
    clearPersonal,
  } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(activeProfile?.profile.displayName ?? '');
  const [visitDate, setVisitDate] = useState(activeProfile?.profile.visitDate ?? '');
  const [saved, setSaved] = useState(false);

  const entries = activeProfile?.entries.length ?? 0;

  function saveProfile() {
    updateProfile({ displayName: name });
    if (visitDate !== (activeProfile?.profile.visitDate ?? '')) {
      if (visitDate === '') clearVisitDate();
      else updateProfile({ visitDate });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-loop-ink">Settings</h1>

      <section className="card space-y-3" aria-label="Profile">
        <h2 className="text-base font-bold text-loop-ink">
          Profile ({activeMode === 'demo' ? 'fictional demo' : 'personal'})
        </h2>
        <div>
          <label className="label" htmlFor="set-name">Display name</label>
          <input
            id="set-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="set-visit">
            Next appointment <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="set-visit"
            type="date"
            className="field"
            value={visitDate}
            min={todayISO()}
            onChange={(e) => setVisitDate(e.target.value)}
          />
          {activeProfile?.profile.visitDate && (
            <p className="hint-text">
              Currently: {formatLong(activeProfile.profile.visitDate)}. Clear the
              field above and save to remove it.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={saveProfile}>Save profile</button>
          {saved && <span className="text-xs font-semibold text-loop-teal">Saved.</span>}
        </div>
        <p className="hint-text">{entries} {entries === 1 ? 'entry' : 'entries'} in this profile.</p>
      </section>

      <section className="card space-y-3" aria-label="Profiles">
        <h2 className="text-base font-bold text-loop-ink">Profiles</h2>
        <p className="text-sm text-slate-600">
          Demo and personal records are stored separately and never mixed.
          Switching never deletes anything.
        </p>
        <div className="flex flex-wrap gap-2">
          {envelope.demo && activeMode !== 'demo' && (
            <button className="btn-secondary" onClick={() => switchMode('demo')}>
              Switch to Maya&apos;s demo
            </button>
          )}
          {envelope.personal && activeMode !== 'personal' && (
            <button className="btn-secondary" onClick={() => switchMode('personal')}>
              Switch to {envelope.personal.profile.displayName}&apos;s profile
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Opening screen
          </button>
        </div>
      </section>

      <section className="card space-y-3" aria-label="Data management">
        <h2 className="text-base font-bold text-loop-ink">Data management</h2>
        {activeMode === 'demo' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Restore Maya&apos;s fictional records to their original three-month set.
            </p>
            <ConfirmButton
              label="Reset demo data"
              confirmLabel="Yes, reset the demo"
              onConfirm={resetDemo}
            />
          </div>
        )}
        {envelope.personal && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-600">
              Permanently remove the personal profile and all its entries from this browser.
            </p>
            <ConfirmButton
              label="Delete personal data"
              confirmLabel="Yes, delete everything"
              onConfirm={clearPersonal}
              danger
            />
          </div>
        )}
      </section>

      <div className="card space-y-2">
        <DisclaimerStrip />
        <StorageNotice />
      </div>
    </div>
  );
}
