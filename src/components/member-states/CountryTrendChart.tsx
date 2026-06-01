'use client';

/**
 * Lightweight line chart for a country indicator time-series, plus an
 * optional horizontal "target" line. Pure SVG — no Chart.js dependency so it
 * also works inside server-rendered profile pages.
 */

import type { TimeSeriesPoint } from '@/data/country-profiles/_types';

interface Props {
  series: TimeSeriesPoint[];
  target?: { value: number; label: string };
  /** Optional second series (e.g. linear pathway to target). */
  reference?: TimeSeriesPoint[];
  unit: string;
  title: string;
  color?: string;
  height?: number;
}

export default function CountryTrendChart({
  series, target, reference, unit, title, color = '#0065A4', height = 220,
}: Props) {
  if (!series || series.length === 0) {
    return (
      <div className="text-[11px] text-tertiary italic">No time-series data yet.</div>
    );
  }
  const all = [...series, ...(reference ?? [])];
  const years = all.map(p => p.year);
  const values = all.map(p => p.value);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  let minV = Math.min(...values, target?.value ?? Infinity);
  let maxV = Math.max(...values, target?.value ?? -Infinity);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  const pad = (maxV - minV) * 0.08;
  minV -= pad; maxV += pad;

  const W = 560;
  const H = height;
  const ml = 44, mr = 14, mt = 18, mb = 28;
  const iw = W - ml - mr;
  const ih = H - mt - mb;

  const xs = (y: number) => ml + ((y - minY) / Math.max(1, (maxY - minY))) * iw;
  const ys = (v: number) => mt + (1 - (v - minV) / (maxV - minV)) * ih;

  const path = (pts: TimeSeriesPoint[]) =>
    pts
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(p.year).toFixed(1)} ${ys(p.value).toFixed(1)}`)
      .join(' ');

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => minV + (i * (maxV - minV)) / ticks);
  const yearTickCount = Math.min(6, maxY - minY);
  const yearTicks = Array.from({ length: yearTickCount + 1 }, (_, i) =>
    Math.round(minY + (i * (maxY - minY)) / yearTickCount),
  );

  return (
    <div className="bg-white rounded-md border border-grey-100 p-3">
      <div className="text-[11px] font-semibold text-tertiary-dark mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img">
        {/* y grid + labels */}
        {tickValues.map(v => (
          <g key={v}>
            <line x1={ml} y1={ys(v)} x2={W - mr} y2={ys(v)} stroke="#EEF1F4" />
            <text x={ml - 6} y={ys(v) + 3} textAnchor="end" fontSize="9" fill="#808285">
              {v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {yearTicks.map(y => (
          <text key={y} x={xs(y)} y={H - 8} textAnchor="middle" fontSize="9" fill="#808285">
            {y}
          </text>
        ))}

        {/* axis labels */}
        <text x={ml} y={mt - 6} fontSize="9" fill="#808285">{unit}</text>

        {/* reference */}
        {reference && reference.length > 0 && (
          <path
            d={path(reference)}
            fill="none"
            stroke="#B0B7BD"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
        )}

        {/* target line */}
        {target && (
          <g>
            <line
              x1={ml} x2={W - mr}
              y1={ys(target.value)} y2={ys(target.value)}
              stroke="#1F8A4C" strokeWidth={1.2} strokeDasharray="4 3"
            />
            <text
              x={W - mr} y={ys(target.value) - 3}
              textAnchor="end" fontSize="9" fill="#1F8A4C"
            >
              {target.label}
            </text>
          </g>
        )}

        {/* main series */}
        <path d={path(series)} fill="none" stroke={color} strokeWidth={1.8} />
        {series.map(p => (
          <circle key={p.year} cx={xs(p.year)} cy={ys(p.value)} r={2.2} fill={color}>
            <title>{p.year}: {p.value} {unit}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
