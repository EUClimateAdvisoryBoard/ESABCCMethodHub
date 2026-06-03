/**
 * Lightweight self-contained SVG time-series chart for an indicator.
 *
 * Renders the historical series (pre/post-report points distinguished), an
 * optional target line, and graceful "no data" handling. Kept dependency-free
 * (no chart.js wiring) so it can be dropped into the framework board, the
 * indicator detail drawer, and the list view alike.
 */
'use client';
import type { Indicator } from '@/data/ecno-indicators';

interface Props {
  indicator: Indicator;
  height?: number;
  /** Compact sparkline mode: hides axes/labels. */
  spark?: boolean;
}

export default function IndicatorChart({ indicator, height = 160, spark = false }: Props) {
  const data = [...indicator.data].sort((a, b) => a.year - b.year);
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-[var(--mh-muted,#6b7280)]" style={{ height }}>
        No data series available.
      </div>
    );
  }

  const W = 320;
  const H = height;
  const padL = spark ? 2 : 38;
  const padR = spark ? 2 : 10;
  const padT = spark ? 4 : 10;
  const padB = spark ? 4 : 22;

  const years = data.map((d) => d.year);
  const values = data.map((d) => d.value);
  const target = indicator.targetValue;
  const minY = Math.min(...values, target ?? Infinity);
  const maxY = Math.max(...values, target ?? -Infinity);
  const yPad = (maxY - minY) * 0.08 || 1;
  const y0 = minY - yPad;
  const y1 = maxY + yPad;
  const minX = Math.min(...years);
  const maxX = Math.max(...years, target && indicator.targetYear ? indicator.targetYear : -Infinity);

  const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - y0) / (y1 - y0 || 1)) * (H - padT - padB);

  const pre = data.filter((d) => !d.afterReport);
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(d.year).toFixed(1)},${sy(d.value).toFixed(1)}`).join(' ');

  const accent = '#3D6E8C';
  const ticks = spark ? [] : [y0, (y0 + y1) / 2, y1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${indicator.name} chart`}>
      {/* gridlines + y labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={sy(t)} x2={W - padR} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={padL - 4} y={sy(t) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {Math.round(t).toLocaleString()}
          </text>
        </g>
      ))}

      {/* target line */}
      {target != null && (
        <g>
          <line x1={padL} y1={sy(target)} x2={W - padR} y2={sy(target)} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="4 3" />
          {!spark && (
            <text x={W - padR} y={sy(target) - 3} textAnchor="end" fontSize={8} fill="#dc2626">
              target {indicator.targetYear ?? ''}
            </text>
          )}
        </g>
      )}

      {/* series */}
      <path d={path} fill="none" stroke={accent} strokeWidth={1.8} strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={sx(d.year)}
          cy={sy(d.value)}
          r={spark ? 1.4 : 2.4}
          fill={d.afterReport ? '#f59e0b' : accent}
        >
          {!spark && <title>{`${d.year}: ${d.value.toLocaleString()} ${indicator.unit}`}</title>}
        </circle>
      ))}

      {/* x labels (first / last) */}
      {!spark && (
        <>
          <text x={sx(pre[0]?.year ?? minX)} y={H - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {minX}
          </text>
          <text x={sx(maxX)} y={H - 6} textAnchor="end" fontSize={8} fill="#9ca3af">
            {maxX}
          </text>
        </>
      )}
    </svg>
  );
}
