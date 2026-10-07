import { useState } from 'react';
import { formatLong } from '../lib/dates';
import { METRICS } from '../lib/units';
import type { Entry } from '../lib/types';

export function formatEntryValue(e: Entry): string {
  if (e.kind === 'BP') return `${e.systolic}/${e.diastolic} ${e.unit}`;
  return `${e.value} ${e.unit}`;
}

export default function EntryList({
  entries,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  onEdit: (e: Entry) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) =>
    a.date === b.date ? a.kind.localeCompare(b.kind) : a.date < b.date ? 1 : -1,
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No entries here yet. Use the form above to add one.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Recorded entries">
      {sorted.map((e) => (
        <li key={e.id} className="card flex items-start gap-3 !p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-loop-ink">
              {METRICS[e.kind].label}{' '}
              <span className="font-normal text-slate-600">{formatEntryValue(e)}</span>
            </p>
            <p className="text-xs text-slate-500">{formatLong(e.date)}</p>
            {e.rangeMin !== undefined && e.rangeMax !== undefined && (
              <p className="text-xs text-slate-500">
                Lab range on report: {e.rangeMin}–{e.rangeMax} {e.unit}
              </p>
            )}
            {e.note && <p className="mt-1 text-xs text-slate-600">{e.note}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            {confirmId === e.id ? (
              <>
                <button
                  className="btn-danger !px-3 !py-1.5 text-xs"
                  onClick={() => {
                    onDelete(e.id);
                    setConfirmId(null);
                  }}
                >
                  Confirm
                </button>
                <button
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                  onClick={() => setConfirmId(null)}
                >
                  Keep
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                  onClick={() => onEdit(e)}
                >
                  Edit
                </button>
                <button
                  className="btn-danger !px-3 !py-1.5 text-xs"
                  onClick={() => setConfirmId(e.id)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
