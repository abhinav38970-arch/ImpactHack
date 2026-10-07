/**
 * Minimal accessible SVG chart. No chart library: one metric, neutral
 * colors only (teal/slate — never red/green judgments), always paired
 * with a data table by the calling page.
 */

export interface LineSeries {
  label: string;
  color: string;
  points: Array<{ x: string; y: number }>;
}

export interface BarPoint {
  x: string;
  y: number;
}

const W = 560;
const H = 240;
const PAD_L = 52;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 30;

function scale(
  points: Array<{ y: number }>,
  height: number,
): { min: number; max: number; yOf: (v: number) => number } {
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }
  const yOf = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * height;
  return { min, max, yOf };
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
  });
}

export function TrendLines({
  series,
  unit,
  description,
}: {
  series: LineSeries[];
  unit: string;
  description: string;
}) {
  const all = series.flatMap((s) => s.points);
  const innerH = H - PAD_T - PAD_B;
  const innerW = W - PAD_L - PAD_R;
  const { min, max, yOf } = scale(all, innerH);
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const xOf = (i: number) =>
    n === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW;

  // X labels use the longest series' dates.
  const longest = series.reduce((a, b) => (a.points.length >= b.points.length ? a : b));
  const labelIdx = longest.points.length <= 8
    ? longest.points.map((_, i) => i)
    : [0, Math.floor(longest.points.length / 2), longest.points.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={description}
      >
        {[0, 0.5, 1].map((t) => {
          const v = max - t * (max - min);
          const y = yOf(v);
          return (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#E2E8F0" />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                {Math.round(v * 10) / 10}
              </text>
            </g>
          );
        })}
        {series.map((s) => (
          <g key={s.label}>
            {s.points.length > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                points={s.points.map((p, i) => `${xOf(i)},${yOf(p.y)}`).join(' ')}
              />
            )}
            {s.points.map((p, i) => (
              <circle key={`${p.x}-${i}`} cx={xOf(i)} cy={yOf(p.y)} r="4" fill={s.color}>
                <title>{`${s.label}: ${p.y} ${unit} on ${p.x}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={xOf(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#64748B"
          >
            {shortDate(longest.points[i].x)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label} ({unit})
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function TrendBars({
  bars,
  unit,
  description,
}: {
  bars: BarPoint[];
  unit: string;
  description: string;
}) {
  const innerH = H - PAD_T - PAD_B;
  const innerW = W - PAD_L - PAD_R;
  const { max, yOf } = scale([{ y: 0 }, ...bars], innerH);
  const slot = innerW / Math.max(bars.length, 1);
  const barW = Math.min(34, slot * 0.6);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={description}
      >
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke="#94A3B8"
        />
        <text x={PAD_L - 6} y={yOf(max) + 4} textAnchor="end" fontSize="11" fill="#64748B">
          {Math.round(max * 10) / 10}
        </text>
        {bars.map((b, i) => {
          const x = PAD_L + slot * i + (slot - barW) / 2;
          const y = yOf(b.y);
          return (
            <rect key={b.x} x={x} y={y} width={barW} height={Math.max(2, yOf(0) - y)} rx="4" fill="#0E7C7B">
              <title>{`${b.y} ${unit} logged on ${b.x}`}</title>
            </rect>
          );
        })}
        {bars.map((b, i) =>
          bars.length <= 10 || i % Math.ceil(bars.length / 6) === 0 ? (
            <text
              key={`l-${b.x}`}
              x={PAD_L + slot * i + slot / 2}
              y={H - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#64748B"
            >
              {shortDate(b.x)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-600">
        Daily logged {unit}. Days without an entry mean nothing was logged — not
        zero activity.
      </figcaption>
    </figure>
  );
}
