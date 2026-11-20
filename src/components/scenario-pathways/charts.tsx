/**
 * Scenarios (M · 55) — SVG chart primitives.
 *
 * Re-draws the chart types of the EEA deck "Six sectors in EU scenario
 * pathways" (export/charts/*.png, made by charts.py, charts2.py, econ.py
 * and drivers.py) as live SVG, so they recompute when the screening
 * settings move:
 *
 *   TrajectoryChart  — inventory bars + 5–95 % / 25–75 % bands + median
 *                      (sector "main" and "data" slides, econ medians,
 *                      the six-settings grid)
 *   FunnelChart      — pathways left after each screening step
 *   SettingsDotPlot  — 2050 median per setting, one panel per sector
 *   DriverPanel      — 2040 strip plot + lever range bars per setting
 *
 * Hand-written SVG rather than Chart.js so the look matches the deck one to
 * one and nothing extra ships to the bundle.
 */
'use client';

import { ReactNode, useId } from 'react';
import { fmtNum } from '@/lib/scenario-pathways/model';

// Deck palette (charts.py: PURP, TEAL, TEALD, TEALL, ORANGE, GREY). Purple vs
// teal differ strongly in lightness as well as hue, so the "net 0" vs
// "≤ 150 Mt" rows stay distinguishable under deuteranopia and protanopia;
// orange is reserved for the setting of the 2040 advice and is always paired
// with a ring/frame, never colour alone.
export const DECK = {
  purple: '#3b2468',
  teal: '#608c95',
  tealDark: '#3f6670',
  tealLight: '#97b4ba',
  orange: '#ec621d',
  grey: '#7a7a7a',
  greyMid: '#9b9b9b',
  bar: '#cfdde0',
  barPale: '#dfe9eb',
  blue: '#2a6f97',
  funnel: ['#d0d0d0', '#b9c9ce', '#97b4ba', '#608c95', '#3f6670', '#3b2468'],
} as const;

// ── scales ───────────────────────────────────────────────────────────────

export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function niceTicks(lo: number, hi: number, count = 6): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export function extent(values: number[], pad = 0.06, includeZero = true): [number, number] {
  const vs = values.filter(Number.isFinite);
  if (includeZero) vs.push(0);
  if (!vs.length) return [0, 1];
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo -= 1; hi += 1; }
  const p = (hi - lo) * pad;
  return [lo - (lo < 0 || !includeZero ? p : 0), hi + p];
}

const tickFmt = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString('en-GB') : String(v)).replace('-', '−');

// ── legend ───────────────────────────────────────────────────────────────

export type LegendItem = { label: string; kind: 'line' | 'band' | 'bar' | 'diamond' | 'dot' | 'range'; color: string; opacity?: number; width?: number };

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
          <svg width="22" height="10" aria-hidden className="shrink-0">
            {it.kind === 'line' && <line x1="1" y1="5" x2="21" y2="5" stroke={it.color} strokeWidth={it.width ?? 3} />}
            {(it.kind === 'band' || it.kind === 'bar') && <rect x="1" y="1" width="20" height="8" fill={it.color} opacity={it.opacity ?? 1} />}
            {it.kind === 'diamond' && <path d="M11 0 L16 5 L11 10 L6 5 Z" fill={it.color} />}
            {it.kind === 'dot' && <circle cx="11" cy="5" r="4" fill={it.color} />}
            {it.kind === 'range' && <rect x="8" y="0" width="6" height="10" fill={it.color} />}
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

// ── trajectory chart ─────────────────────────────────────────────────────

export interface TrajBand { lo: number[]; hi: number[]; color: string; opacity: number; label?: string }
export interface TrajLine { ys: number[]; color: string; width?: number; markers?: boolean; label?: string; dash?: string }

export interface TrajectoryChartProps {
  years: readonly number[];
  bars?: { x: number; y: number }[];
  barColor?: string;
  bands?: TrajBand[];
  lines?: TrajLine[];
  /** Label the median values at these year indices. */
  valueLabels?: { ys: number[]; idx: number[]; color: string };
  diamond?: { x: number; y: number; color: string; title: string };
  /** Orange range marker to the right of the plot (2050 median across the six settings). */
  rangeMarker?: { lo: number; hi: number; title: string };
  yDomain?: [number, number];
  xDomain: [number, number];
  xTicks: number[];
  yLabel: string;
  height?: number;
  width?: number;
  compact?: boolean;
  /** Text in the top-right corner (n = …). */
  corner?: string;
  title?: ReactNode;
  titleColor?: string;
  framed?: boolean;
  ariaLabel: string;
}

export function TrajectoryChart(props: TrajectoryChartProps) {
  const {
    years, bars = [], barColor = DECK.bar, bands = [], lines = [], valueLabels, diamond, rangeMarker,
    xDomain, xTicks, yLabel, compact = false, corner, framed = false, ariaLabel,
  } = props;
  const W = props.width ?? (compact ? 420 : 900);
  const H = props.height ?? (compact ? 250 : 380);
  const clipId = useId().replace(/:/g, '');
  const m = { l: compact ? 44 : 62, r: rangeMarker ? 150 : compact ? 34 : 20, t: compact ? 26 : 14, b: compact ? 22 : 28 };
  const all: number[] = [
    ...bars.map((b) => b.y),
    ...bands.flatMap((b) => [...b.lo, ...b.hi]),
    ...lines.flatMap((l) => l.ys),
    ...(diamond ? [diamond.y] : []),
    ...(rangeMarker ? [rangeMarker.lo, rangeMarker.hi] : []),
  ];
  const [y0, y1] = props.yDomain ?? extent(all);
  const sx = linear(xDomain[0], xDomain[1], m.l, W - m.r);
  const sy = linear(y0, y1, H - m.b, m.t);
  const yTicks = niceTicks(y0, y1, compact ? 4 : 6);
  const bw = Math.max(1, (sx(1) - sx(0)) * 0.8);
  const path = (ys: number[]) => ys.map((y, i) => `${i ? 'L' : 'M'}${sx(years[i]).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
  const area = (lo: number[], hi: number[]) =>
    `${path(hi)} ${lo.map((y, i) => [years[i], y] as const).reverse().map(([x, y]) => `L${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')} Z`;
  const fs = compact ? 10 : 12;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id={clipId}>
            <rect x={m.l} y={m.t} width={W - m.l - m.r + (rangeMarker ? 140 : 0)} height={H - m.t - m.b} />
          </clipPath>
        </defs>
        {framed && <rect x={1.5} y={1.5} width={W - 3} height={H - 3} fill="none" stroke={DECK.orange} strokeWidth={3} />}
        {props.title && (
          <text x={m.l} y={16} fontSize={compact ? 12 : 14} fontWeight={700} fill={props.titleColor ?? DECK.tealDark}>
            {props.title}
          </text>
        )}
        {corner && (
          <text x={W - m.r} y={compact ? 40 : 30} textAnchor="end" fontSize={compact ? 13 : 15} fontWeight={700} fill={DECK.purple}>
            {corner}
          </text>
        )}
        {/* y grid labels */}
        {yTicks.map((t) => (
          <text key={t} x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={fs} className="fill-grey-500">
            {tickFmt(t)}
          </text>
        ))}
        <text transform={`translate(${compact ? 10 : 14},${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={fs} className="fill-tertiary dark:fill-[var(--mh-muted)]">
          {yLabel}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {bars.map((b) => (
            <rect key={b.x} x={sx(b.x) - bw / 2} y={Math.min(sy(b.y), sy(0))} width={bw} height={Math.abs(sy(b.y) - sy(0))} fill={barColor}>
              <title>{`${b.x}: ${fmtNum(b.y)} (EEA inventory)`}</title>
            </rect>
          ))}
          {bands.map((b, i) => (
            <path key={i} d={area(b.lo, b.hi)} fill={b.color} opacity={b.opacity}>
              {b.label && <title>{b.label}</title>}
            </path>
          ))}
          {lines.map((l, i) => (
            <g key={i}>
              <path d={path(l.ys)} fill="none" stroke={l.color} strokeWidth={l.width ?? 3} strokeDasharray={l.dash} strokeLinejoin="round">
                {l.label && <title>{l.label}</title>}
              </path>
              {l.markers && l.ys.map((y, j) => (
                <circle key={j} cx={sx(years[j])} cy={sy(y)} r={compact ? 3 : 4.5} fill={l.color}>
                  <title>{`${l.label ?? ''} ${years[j]}: ${fmtNum(y)}`}</title>
                </circle>
              ))}
            </g>
          ))}
          {diamond && (
            <path d={`M${sx(diamond.x)},${sy(diamond.y) - 8} l8,8 l-8,8 l-8,-8 Z`} fill={diamond.color}>
              <title>{diamond.title}</title>
            </path>
          )}
        </g>
        {/* zero line + axes */}
        {y0 < 0 && y1 > 0 && <line x1={m.l} x2={W - m.r} y1={sy(0)} y2={sy(0)} stroke="#1f1f1f" strokeWidth={0.8} />}
        <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} stroke="#9a9a9a" strokeWidth={1} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#9a9a9a" strokeWidth={1} />
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={H - m.b + (compact ? 14 : 18)} textAnchor="middle" fontSize={fs} className="fill-grey-500">
            {t}
          </text>
        ))}
        {valueLabels && valueLabels.idx.map((i) => (
          <text
            key={i}
            x={sx(years[i]) + (compact && i === years.length - 1 ? 4 : 0)}
            y={sy(valueLabels.ys[i]) - (compact ? 6 : 10)}
            textAnchor={compact && i === years.length - 1 ? 'start' : 'middle'}
            fontSize={compact ? 11 : 15}
            fontWeight={700}
            fill={valueLabels.color}
            paintOrder="stroke"
            stroke="white"
            strokeWidth={3}
          >
            {fmtNum(valueLabels.ys[i], 0)}
          </text>
        ))}
        {rangeMarker && Number.isFinite(rangeMarker.lo) && (
          <g>
            <rect x={W - m.r + 22} y={sy(Math.max(rangeMarker.lo, rangeMarker.hi))} width={9}
              height={Math.max(3, Math.abs(sy(rangeMarker.lo) - sy(rangeMarker.hi)))} fill={DECK.orange} />
            <text x={W - m.r + 38} y={sy((rangeMarker.lo + rangeMarker.hi) / 2) - 18} fontSize={12} fontWeight={700} fill={DECK.orange}>
              <tspan x={W - m.r + 38} dy="0">2050 median</tspan>
              <tspan x={W - m.r + 38} dy="14">across the six</tspan>
              <tspan x={W - m.r + 38} dy="14">settings:</tspan>
              <tspan x={W - m.r + 38} dy="14">{`${fmtNum(rangeMarker.lo, 0)} to ${fmtNum(rangeMarker.hi, 0)}`}</tspan>
            </text>
            <title>{rangeMarker.title}</title>
          </g>
        )}
      </svg>
    </figure>
  );
}

// ── funnel ───────────────────────────────────────────────────────────────

export interface FunnelStep { label: string; n: number; off?: boolean }

export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const W = 900, rowH = 46, labelW = 330, H = steps.length * rowH + 30;
  const max = Math.max(1, ...steps.map((s) => s.n));
  const sx = linear(0, max * 1.12, labelW + 10, W - 10);
  const ticks = niceTicks(0, max * 1.12, 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pathways left after each screening step">
      {steps.map((s, i) => {
        const y = i * rowH + 6;
        const col = DECK.funnel[Math.min(i, DECK.funnel.length - 1)];
        const last = i === steps.length - 1;
        return (
          <g key={s.label} opacity={s.off ? 0.45 : 1}>
            <text x={labelW} y={y + 22} textAnchor="end" fontSize={13} fontWeight={last ? 700 : 400} className="fill-tertiary-dark dark:fill-[var(--mh-fg)]">
              {s.label}{s.off ? ' (step off)' : ''}
            </text>
            <rect x={sx(0)} y={y} width={Math.max(0, sx(s.n) - sx(0))} height={rowH - 14} fill={col} />
            <text x={sx(s.n) + 8} y={y + 23} fontSize={18} fontWeight={700} fill={i < 2 ? '#666' : col}>
              {s.n.toLocaleString('en-GB')}
            </text>
            <title>{`${s.label}: ${s.n.toLocaleString('en-GB')} pathways`}</title>
          </g>
        );
      })}
      <line x1={sx(0)} x2={W - 10} y1={H - 24} y2={H - 24} stroke="#9a9a9a" />
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-grey-500">
          {t.toLocaleString('en-GB')}
        </text>
      ))}
    </svg>
  );
}

// ── settings dot plot ────────────────────────────────────────────────────

export interface DotRow { label: string; value: number | null; n: number; group: 'net0' | 'net150' | 'current'; advice?: boolean }

export function SettingsDotPlot({ title, unit, rows }: { title: string; unit: string; rows: DotRow[] }) {
  const W = 420, rowH = 30, labelW = 120, valW = 92, top = 24, H = top + rows.length * rowH + 34;
  const vals = rows.map((r) => r.value).filter((v): v is number => v != null && Number.isFinite(v));
  const [x0, x1] = extent(vals, 0.15);
  const sx = linear(x0, x1, labelW + 8, W - valW - 6);
  const ticks = niceTicks(x0, x1, 4);
  const color = (g: DotRow['group']) => (g === 'net0' ? DECK.purple : g === 'net150' ? DECK.teal : DECK.orange);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${title}: 2050 median by setting`}>
      <text x={labelW + 8} y={14} fontSize={14} fontWeight={700} fill={DECK.tealDark}>{title}</text>
      {x0 < 0 && x1 > 0 && <line x1={sx(0)} x2={sx(0)} y1={top} y2={top + rows.length * rowH} stroke="#1f1f1f" strokeWidth={1.4} />}
      {rows.map((r, i) => {
        const y = top + i * rowH + rowH / 2;
        const c = color(r.group);
        const sep = i > 0 && rows[i - 1].group !== r.group;
        return (
          <g key={r.label}>
            {sep && <line x1={labelW + 8} x2={W - 6} y1={y - rowH / 2} y2={y - rowH / 2} stroke="#cfcfcf" />}
            <text x={labelW} y={y + 4} textAnchor="end" fontSize={11} fontWeight={r.group === 'current' ? 700 : 400} className="fill-tertiary dark:fill-[var(--mh-muted)]">
              {r.label}
            </text>
            {r.value != null && Number.isFinite(r.value) ? (
              <>
                {r.advice && <circle cx={sx(r.value)} cy={y} r={10} fill={DECK.orange} />}
                <circle cx={sx(r.value)} cy={y} r={r.advice ? 6 : 8} fill={r.group === 'current' ? 'white' : c} stroke={c} strokeWidth={r.group === 'current' ? 3 : 0}>
                  <title>{`${r.label}: ${fmtNum(r.value)} ${unit} (n = ${r.n})`}</title>
                </circle>
                <text x={W - 6} y={y + 4} textAnchor="end" fontSize={11} fontWeight={700} fill={c}>
                  {`${fmtNum(r.value, 0)}  (n=${r.n})`}
                </text>
              </>
            ) : (
              <text x={W - 6} y={y + 4} textAnchor="end" fontSize={11} fill={DECK.grey}>no pathway</text>
            )}
          </g>
        );
      })}
      <line x1={labelW + 8} x2={W - 6} y1={top + rows.length * rowH} y2={top + rows.length * rowH} stroke="#9a9a9a" />
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={top + rows.length * rowH + 14} textAnchor="middle" fontSize={10} className="fill-grey-500">{tickFmt(t)}</text>
      ))}
      <text x={(labelW + W - valW) / 2} y={H - 4} textAnchor="middle" fontSize={10} className="fill-tertiary dark:fill-[var(--mh-muted)]">{unit}</text>
    </svg>
  );
}

// ── driver panel ─────────────────────────────────────────────────────────

export interface DriverRow { label: string; values: number[]; group: 'net0' | 'net150' | 'current'; star?: boolean }
export interface DriverColumn { label: string; unit: string; rows: DriverRow[]; ref?: number | null; refStyle?: 'inventory' | 'model2020' }

/** One column of the driver chart: a strip plot (first column) or range bars with a median tick. */
export function DriverColumnChart({ col, strip, showLabels }: { col: DriverColumn; strip: boolean; showLabels: boolean }) {
  const rowH = 36, top = 40, labelW = showLabels ? 170 : 6, W = labelW + (strip ? 330 : 230), H = top + col.rows.length * rowH + 22;
  const vals = col.rows.flatMap((r) => r.values);
  if (col.ref != null) vals.push(col.ref);
  const [x0, x1] = extent(vals, 0.08);
  const textW = 92;
  const sx = linear(x0, x1, labelW + 6, W - textW);
  const ticks = niceTicks(x0, x1, 3);
  const color = (g: DriverRow['group']) => (g === 'net0' ? DECK.purple : g === 'net150' ? DECK.blue : DECK.orange);
  const fmt = (v: number) => (Math.max(...vals.map(Math.abs)) >= 20 ? fmtNum(v, 0) : fmtNum(v, 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto" style={{ width: '100%', minWidth: strip ? 300 : 180 }} role="img" aria-label={`${col.label} by setting`}>
      <text x={labelW + 6} y={14} fontSize={12.5} fontWeight={700} fill={DECK.tealDark}>{col.label}</text>
      <text x={labelW + 6} y={29} fontSize={11} fontWeight={700} fill={DECK.tealDark}>{col.unit}</text>
      {col.ref != null && Number.isFinite(col.ref) && (
        <line x1={sx(col.ref)} x2={sx(col.ref)} y1={top - 4} y2={top + col.rows.length * rowH}
          stroke={col.refStyle === 'model2020' ? DECK.grey : DECK.orange} strokeWidth={col.refStyle === 'model2020' ? 1.4 : 2}
          strokeDasharray={col.refStyle === 'model2020' ? '2 3' : '6 4'}>
          <title>{col.refStyle === 'model2020' ? `2020 median in the models: ${fmt(col.ref)}` : `Inventory reference: ${fmt(col.ref)}`}</title>
        </line>
      )}
      {col.rows.map((r, i) => {
        const y = top + i * rowH + rowH / 2;
        const c = color(r.group);
        const sep = i > 0 && col.rows[i - 1].group !== r.group;
        const lo = r.values.length ? Math.min(...r.values) : NaN, hi = r.values.length ? Math.max(...r.values) : NaN;
        return (
          <g key={r.label}>
            {sep && <line x1={labelW + 6} x2={W - 4} y1={y - rowH / 2} y2={y - rowH / 2} stroke="#cfcfcf" />}
            {showLabels && (
              <text x={labelW - 4} y={y + 4} textAnchor="end" fontSize={11.5} fontWeight={700} fill={r.group === 'current' ? DECK.orange : DECK.tealDark}>
                {(r.star ? '★ ' : '') + r.label}
              </text>
            )}
            {!r.values.length ? (
              <text x={(labelW + W - textW) / 2} y={y + 4} textAnchor="middle" fontSize={10.5} fill={DECK.grey}>not reported</text>
            ) : strip ? (
              r.values.map((v, k) => (
                <circle key={k} cx={sx(v)} cy={y + jitter(i, k) * rowH * 0.36} r={3.4} fill={c} opacity={0.75} stroke="white" strokeWidth={0.5}>
                  <title>{fmt(v)}</title>
                </circle>
              ))
            ) : (
              <>
                <rect x={sx(lo)} y={y - 6} width={Math.max(2, sx(hi) - sx(lo))} height={12} fill={c} opacity={0.75} />
                <line x1={sx(median(r.values))} x2={sx(median(r.values))} y1={y - 11} y2={y + 11} stroke="#1f1f1f" strokeWidth={2.2} />
                <title>{`${r.label}: ${fmt(lo)} to ${fmt(hi)}, median ${fmt(median(r.values))} (n = ${r.values.length})`}</title>
              </>
            )}
            {r.values.length > 0 && (
              <text x={W - 4} y={y + 4} textAnchor="end" fontSize={10.5} className="fill-tertiary-dark dark:fill-[var(--mh-fg)]">
                {lo === hi ? fmt(lo) : `${fmt(lo)} to ${fmt(hi)}`}
              </text>
            )}
          </g>
        );
      })}
      <line x1={labelW + 6} x2={W - textW} y1={top + col.rows.length * rowH} y2={top + col.rows.length * rowH} stroke="#9a9a9a" />
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={H - 6} textAnchor="middle" fontSize={10} className="fill-grey-500">{tickFmt(t)}</text>
      ))}
    </svg>
  );
}

function median(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  const h = (s.length - 1) / 2;
  return s[Math.floor(h)] + (s[Math.ceil(h)] - s[Math.floor(h)]) * (h - Math.floor(h));
}

/** Deterministic jitter in [-0.5, 0.5] so strip plots do not reshuffle on every render. */
function jitter(i: number, k: number) {
  const x = Math.sin((i + 1) * 12.9898 + (k + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}
