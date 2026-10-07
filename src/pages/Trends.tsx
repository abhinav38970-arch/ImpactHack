import { useMemo, useState } from 'react';
import { TrendBars, TrendLines } from '../components/TrendChart';
import { DisclaimerStrip, EmptyState } from '../components/bits';
import { formatLong, todayISO } from '../lib/dates';
import {
  aggregateActivityByDay,
  firstLast,
  formatSigned,
  seriesFor,
  unitsForMetric,
} from '../lib/trends';
import type { RangeKey } from '../lib/trends';
import { CATEGORIES, ENTRY_KINDS, METRICS } from '../lib/units';
import { useApp } from '../state/AppContext';
import type { EntryKind } from '../lib/types';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
];

const TEAL = '#0E7C7B';
const SLATE = '#475569';

export function defaultTrendKind(
  kinds: EntryKind[],
  counts: Map<EntryKind, number>,
): EntryKind | null {
  if (kinds.length === 0) return null;
  return [...kinds].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
}

export default function Trends() {
  const { activeProfile } = useApp();
  const entries = useMemo(() => activeProfile?.entries ?? [], [activeProfile]);
  const today = todayISO();

  const counts = useMemo(() => {
    const m = new Map<EntryKind, number>();
    for (const e of entries) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    return m;
  }, [entries]);
  const kindsWithData = useMemo(
    () => ENTRY_KINDS.filter((k) => (counts.get(k) ?? 0) > 0),
    [counts],
  );

  const [kind, setKind] = useState<EntryKind | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('90');

  const activeKind: EntryKind | null = kind ?? defaultTrendKind(kindsWithData, counts);
  const units = activeKind ? unitsForMetric(entries, activeKind) : [];
  const activeUnit = unit && units.includes(unit) ? unit : (units[0] ?? null);
  const excludedUnits = units.filter((u) => u !== activeUnit);

  const series = useMemo(
    () =>
      activeKind && activeUnit
        ? seriesFor(entries, activeKind, activeUnit, today, range)
        : [],
    [entries, activeKind, activeUnit, today, range],
  );

  if (kindsWithData.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-loop-ink">Trends</h1>
        <EmptyState
          title="No entries to chart yet"
          body="Record a lab result, measurement, or activity in Log first. Trends appear here with their dates and units — one metric at a time."
          actionLabel="Go to Log"
          actionTo="/log"
        />
        <div className="card">
          <DisclaimerStrip />
        </div>
      </div>
    );
  }

  const spec = activeKind ? METRICS[activeKind] : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-loop-ink">Trends</h1>
        <p className="text-sm text-slate-500">
          One metric at a time, with dates and units. Shown together with
          habits elsewhere never means one caused the other.
        </p>
      </div>

      <div className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tr-metric">
              Metric
            </label>
            <select
              id="tr-metric"
              className="field"
              value={activeKind ?? ''}
              onChange={(e) => {
                setKind(e.target.value as EntryKind);
                setUnit(null);
              }}
            >
              {CATEGORIES.map((c) => {
                const ks = kindsWithData.filter((k) => METRICS[k].category === c);
                if (ks.length === 0) return null;
                return (
                  <optgroup key={c} label={c}>
                    {ks.map((k) => (
                      <option key={k} value={k}>
                        {METRICS[k].label} ({counts.get(k)})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tr-unit">
              Unit
            </label>
            <select
              id="tr-unit"
              className="field"
              value={activeUnit ?? ''}
              disabled={units.length <= 1}
              onChange={(e) => setUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {excludedUnits.length > 0 && (
              <p className="hint-text">
                {excludedUnits.length} {excludedUnits.length === 1 ? 'entry' : 'entries'} in{' '}
                {excludedUnits.join(', ')} {excludedUnits.length === 1 ? 'is' : 'are'} not
                shown — units are never converted or mixed.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                range === r.key
                  ? 'bg-loop-teal text-white ring-loop-teal'
                  : 'bg-white text-slate-600 ring-slate-300 hover:bg-loop-mist'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {spec && activeUnit && (
        <TrendBody
          kind={activeKind!}
          unit={activeUnit}
          series={series}
          rangeLabel={RANGES.find((r) => r.key === range)!.label}
        />
      )}

      <div className="card">
        <DisclaimerStrip />
      </div>
    </div>
  );
}

function TrendBody({
  kind,
  unit,
  series,
  rangeLabel,
}: {
  kind: EntryKind;
  unit: string;
  series: ReturnType<typeof seriesFor>;
  rangeLabel: string;
}) {
  const label = METRICS[kind].label;

  if (series.length === 0) {
    return (
      <EmptyState
        title={`No ${label} entries in this period`}
        body={`Try a longer date range, or record a new ${label} entry in Log.`}
        actionLabel="Go to Log"
        actionTo="/log"
      />
    );
  }

  if (kind === 'ACTIVITY') {
    const days = aggregateActivityByDay(series);
    const total = days.reduce((s, d) => s + d.minutes, 0);
    return (
      <section className="card space-y-3" aria-label={`${label} trend`}>
        <h2 className="text-base font-bold text-loop-ink">
          {label} — {rangeLabel}
        </h2>
        <TrendBars
          bars={days.map((d) => ({ x: d.date, y: d.minutes }))}
          unit={unit}
          description={`Bar chart of daily logged activity minutes, ${days.length} days.`}
        />
        <p className="text-sm text-slate-600">
          {total} {unit} logged across {days.length} {days.length === 1 ? 'day' : 'days'}.
        </p>
        <DataTable kind={kind} unit={unit} series={series} />
      </section>
    );
  }

  if (kind === 'BP') {
    const sys = series.map((e) => ({ x: e.date, y: e.systolic ?? 0 }));
    const dia = series.map((e) => ({ x: e.date, y: e.diastolic ?? 0 }));
    const flS = firstLast(sys.map((p) => p.y));
    const flD = firstLast(dia.map((p) => p.y));
    return (
      <section className="card space-y-3" aria-label={`${label} trend`}>
        <h2 className="text-base font-bold text-loop-ink">
          {label} — {rangeLabel}
        </h2>
        {series.length === 1 ? (
          <SingleValueCard kind={kind} unit={unit} series={series} />
        ) : (
          <>
            <TrendLines
              series={[
                { label: 'Systolic', color: TEAL, points: sys },
                { label: 'Diastolic', color: SLATE, points: dia },
              ]}
              unit={unit}
              description={`Line chart of blood pressure, ${series.length} readings.`}
            />
            {flS && flD && (
              <p className="text-sm text-slate-600">
                First: {flS.first}/{flD.first} {unit} ({formatLong(series[0].date)}) → Latest:{' '}
                {flS.last}/{flD.last} {unit} ({formatLong(series[series.length - 1].date)}).
                Change: {formatSigned(flS.change)}/{formatSigned(flD.change)} {unit}.
              </p>
            )}
          </>
        )}
        <DataTable kind={kind} unit={unit} series={series} />
      </section>
    );
  }

  const values = series.map((e) => e.value ?? 0);
  const fl = firstLast(values);
  return (
    <section className="card space-y-3" aria-label={`${label} trend`}>
      <h2 className="text-base font-bold text-loop-ink">
        {label} — {rangeLabel}
      </h2>
      {series.length === 1 ? (
        <SingleValueCard kind={kind} unit={unit} series={series} />
      ) : (
        <>
          <TrendLines
            series={[
              {
                label,
                color: TEAL,
                points: series.map((e) => ({ x: e.date, y: e.value ?? 0 })),
              },
            ]}
            unit={unit}
            description={`Line chart of ${label}, ${series.length} observations.`}
          />
          {fl && (
            <p className="text-sm text-slate-600">
              First: {fl.first} {unit} ({formatLong(series[0].date)}) → Latest: {fl.last}{' '}
              {unit} ({formatLong(series[series.length - 1].date)}). Change:{' '}
              {formatSigned(fl.change)} {unit}.
            </p>
          )}
        </>
      )}
      <DataTable kind={kind} unit={unit} series={series} />
    </section>
  );
}

function SingleValueCard({
  kind,
  unit,
  series,
}: {
  kind: EntryKind;
  unit: string;
  series: ReturnType<typeof seriesFor>;
}) {
  const e = series[0];
  const value = kind === 'BP' ? `${e.systolic}/${e.diastolic}` : `${e.value}`;
  return (
    <div className="rounded-xl bg-loop-mist p-4 text-center">
      <p className="text-2xl font-bold text-loop-ink">
        {value} <span className="text-base font-medium">{unit}</span>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        One observation on {formatLong(e.date)} — a single measurement
        doesn&apos;t show a trend yet.
      </p>
    </div>
  );
}

function DataTable({
  kind,
  unit,
  series,
}: {
  kind: EntryKind;
  unit: string;
  series: ReturnType<typeof seriesFor>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="py-2 text-left text-xs text-slate-500">
          All displayed {METRICS[kind].label} entries in {unit}. Same-day entries
          are listed separately.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th scope="col" className="py-1.5 pr-2 font-semibold">Date</th>
            <th scope="col" className="py-1.5 pr-2 font-semibold">Value</th>
            {kind !== 'BP' && kind !== 'ACTIVITY' && (
              <th scope="col" className="py-1.5 font-semibold">Lab range on report</th>
            )}
          </tr>
        </thead>
        <tbody>
          {series.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 pr-2 text-slate-600">{formatLong(e.date)}</td>
              <td className="py-1.5 pr-2 font-medium text-loop-ink">
                {kind === 'BP' ? `${e.systolic}/${e.diastolic} ${unit}` : `${e.value} ${unit}`}
              </td>
              {kind !== 'BP' && kind !== 'ACTIVITY' && (
                <td className="py-1.5 text-slate-500">
                  {e.rangeMin !== undefined ? `${e.rangeMin}–${e.rangeMax} ${unit}` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
