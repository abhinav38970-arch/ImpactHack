import { useMemo, useState } from 'react';
import EntryForm from '../components/EntryForm';
import EntryList from '../components/EntryList';
import { DisclaimerStrip } from '../components/bits';
import { CATEGORIES } from '../lib/units';
import { useApp } from '../state/AppContext';
import type { Entry, EntryCategory } from '../lib/types';
import { METRICS } from '../lib/units';

type Filter = 'All' | EntryCategory;

export default function Log() {
  const { activeProfile, addEntry, updateEntry, deleteEntry } = useApp();
  const [filter, setFilter] = useState<Filter>('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  const entries = useMemo(() => activeProfile?.entries ?? [], [activeProfile]);

  const visible = useMemo(
    () =>
      filter === 'All'
        ? entries
        : entries.filter((e) => METRICS[e.kind].category === filter),
    [entries, filter],
  );

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="page-title">Log</h1>
          <p className="page-sub">
            Record with original values, units + dates. Nothing is judged here.
          </p>
        </div>
        {!showForm && !editing && (
          <button className="btn-primary ml-auto shrink-0" onClick={() => setShowForm(true)}>
            + Add entry
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <EntryForm
          key={editing ? editing.id : 'new'}
          initial={editing}
          submitLabel={editing ? 'Save changes' : 'Save entry'}
          onSubmit={(e) => {
            if (editing) updateEntry(e);
            else addEntry(e);
            closeForm();
          }}
          onCancel={closeForm}
        />
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {(['All', ...CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            aria-pressed={filter === c}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
              filter === c
                ? 'bg-loop-teal text-white ring-loop-teal'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-loop-mist'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <EntryList
        entries={visible}
        onEdit={(e) => {
          setEditing(e);
          setShowForm(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onDelete={deleteEntry}
      />

      <div className="card">
        <DisclaimerStrip />
      </div>
    </div>
  );
}
