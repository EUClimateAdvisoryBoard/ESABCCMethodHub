/**
 * EU industry emissions chart in the style of the screening slide of the EEA
 * deck: inventory bars (2005–2024), past-trend regression, Member States'
 * WEM/WAM projections, and one polyline per scenario pathway (2020, 2030,
 * 2040, 2050, harmonised Mt CO2e). Hovering a line names it; clicking selects
 * it (the parent keeps the selection in the URL).
 *
 * AI-compiled — pending human verification.
 */
'use client';

import { useMemo, useState } from 'react';
import { INVENTORY } from '@/data/industry-scenario-screening.generated';
import { DECK } from './palette';

export interface ChartLine {
  id: string;
  label: string;
  sublabel?: string;
  points: [number, number][];
  colour: string;
  /** Lines drawn in the background (greyed out by the current filter). */
  muted?: boolean;
}

interface Props {
  lines: ChartLine[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Show the inventory, past trend and WEM/WAM layers. */
  showHistory?: boolean;
  /** Draw a thick median line through the non-muted lines. */
  median?: boolean;
  ariaLabel: string;
  height?: number;
}

const W = 900;
const PAD = { l: 52, r: 16, t: 14, b: 30 };
const X0 = 2005;
const X1 = 2050;

export default function PathwayChart({
  lines,
  selectedId,
  onSelect,
  showHistory = true,
  median = false,
  ariaLabel,
  height = 420,
}: Props) {
  const H = height;
  const [hover, setHover] = useState<string | null>(null);

  const yMax = useMemo(() => {
    let m = 700;
    for (const l of lines) if (!l.muted) for (const [, v] of l.points) m = Math.max(m, v);
    return Math.min(1600, Math.ceil(m / 100) * 100);
  }, [lines]);

  const x = (yr: number) => PAD.l + ((yr - X0) / (X1 - X0)) * (W - PAD.l - PAD.r);
  // Values are not clamped: lines above the axis run off the plot and are cut
  // by the clip path, rather than being flattened along the top edge.
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const path = (pts: [number, number][]) => pts.map(([a, v], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(v).toFixed(1)}`).join('');

  const series = (key: 'pastTrend' | 'wem' | 'wam') =>
    INVENTORY.filter(r => r[key] != null).map(r => [r.year, r[key] as number] as [number, number]);

  const medianLine = useMemo(() => {
    if (!median) return null;
    const active = lines.filter(l => !l.muted);
    if (active.length < 2) return null;
    const years = active[0].points.map(p => p[0]);
    return years.map(yr => {
      const vals = active.map(l => l.points.find(p => p[0] === yr)?.[1]).filter((v): v is number => v != null).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return [yr, vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2] as [number, number];
    });
  }, [lines, median]);

  const ticks = [];
  for (let v = 0; v <= yMax; v += yMax > 1000 ? 200 : 100) ticks.push(v);
  const barW = ((W - PAD.l - PAD.r) / (X1 - X0)) * 0.7;
  const focus = hover ?? selectedId ?? null;
  const focusLine = focus ? lines.find(l => l.id === focus) : null;
  const ordered = [...lines.filter(l => l.muted), ...lines.filter(l => !l.muted)];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={DECK.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={DECK.muted} className="tabular-nums">
              {t.toLocaleString('en-GB')}
            </text>
          </g>
        ))}
        {[2005, 2010, 2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050].map(yr => (
          <text key={yr} x={x(yr)} y={H - 10} textAnchor="middle" fontSize={11} fill={DECK.muted} className="tabular-nums">
            {yr}
          </text>
        ))}
        <text x={PAD.l} y={PAD.t - 2} fontSize={10} fill={DECK.muted}>Mt CO₂e</text>
        <defs>
          <clipPath id="sd-plot">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
          </clipPath>
        </defs>

        {showHistory &&
          INVENTORY.filter(r => r.industry != null).map(r => (
            <rect
              key={r.year}
              x={x(r.year) - barW / 2}
              y={y(r.industry as number)}
              width={barW}
              height={y(0) - y(r.industry as number)}
              fill={DECK.teal}
            >
              <title>{`Inventory ${r.year}: ${r.industry} Mt CO₂e (EEA 2026)`}</title>
            </rect>
          ))}

        <g clipPath="url(#sd-plot)">
        {ordered.map(l => {
          const isFocus = l.id === focus;
          return (
            <path
              key={l.id}
              d={path(l.points)}
              fill="none"
              stroke={l.muted ? '#d4d4d4' : l.colour}
              strokeWidth={isFocus ? 3.5 : l.muted ? 0.8 : 1.4}
              strokeOpacity={l.muted ? 0.55 : isFocus ? 1 : 0.85}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
              onMouseEnter={() => setHover(l.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(selectedId === l.id ? null : l.id)}
            />
          );
        })}
        {focusLine && (
          <path d={path(focusLine.points)} fill="none" stroke={DECK.ink} strokeWidth={3.5} pointerEvents="none" />
        )}
        {medianLine && <path d={path(medianLine)} fill="none" stroke={DECK.tealD} strokeWidth={4} pointerEvents="none" />}
        </g>

        {showHistory && (
          <>
            <path d={path(series('pastTrend'))} fill="none" stroke={DECK.muted} strokeWidth={2.5} strokeDasharray="2 4" pointerEvents="none" />
            <path d={path(series('wem'))} fill="none" stroke={DECK.tealD} strokeWidth={2.5} pointerEvents="none" />
            <path d={path(series('wam'))} fill="none" stroke={DECK.red} strokeWidth={2.5} strokeDasharray="7 4" pointerEvents="none" />
          </>
        )}
      </svg>
      {focusLine && (
        <div className="pointer-events-none absolute right-3 top-3 max-w-[60%] rounded border border-grey-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
          <div className="font-semibold text-tertiary-dark">{focusLine.label}</div>
          {focusLine.sublabel && <div className="text-tertiary">{focusLine.sublabel}</div>}
          <div className="mt-1 font-mono tabular-nums text-tertiary">
            {focusLine.points.map(([yr, v]) => `${yr}: ${Math.round(v)}`).join(' · ')} Mt
          </div>
        </div>
      )}
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; colour: string; kind?: 'bar' | 'line' | 'dash' | 'dot' }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-tertiary">
      {items.map(it => (
        <span key={it.label} className="inline-flex items-center gap-2">
          <i
            aria-hidden
            className="inline-block"
            style={{
              width: 22,
              height: it.kind === 'bar' ? 10 : 0,
              background: it.kind === 'bar' ? it.colour : undefined,
              borderTop: it.kind === 'bar' ? undefined : `3px ${it.kind === 'dash' ? 'dashed' : it.kind === 'dot' ? 'dotted' : 'solid'} ${it.colour}`,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
