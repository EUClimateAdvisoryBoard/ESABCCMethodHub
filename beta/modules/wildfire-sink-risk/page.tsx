'use client';

/**
 * Wildfires & the Land Sink — beta module (M · 41).
 *
 * The argument the page is built to make, in one line: EU wildfires are not
 * only a civil-protection emergency, they are a climate-target emergency,
 * because the land they burn is the same land the 2040 and 2050 targets are
 * counting on to absorb carbon.
 *
 * The page is a thin presentation layer over `model.ts`. All arithmetic,
 * assumptions and sources live there; nothing is computed inline here that
 * isn't pure layout. Every dial in the model is exposed as a slider, and every
 * assumption is documented in a table at the bottom of the page rather than in
 * a separate note, so the caveats travel with the numbers.
 *
 * Charts are hand-rolled inline SVG, matching the convention used by the other
 * estimator modules in this repo (see ai-environmental-impact): no chart
 * library, fixed viewBox, responsive via `w-full`.
 */

import { useMemo, useState, type ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ASSUMPTIONS,
  BASE_1990,
  BURNT_AREA,
  DEFAULTS,
  END_YEAR,
  FIRST_YEAR,
  FIVE_YEAR_MEAN,
  LAST_OBS_YEAR,
  LONG_RUN_MEAN,
  NET_ALLOWED_2030,
  PRESETS,
  SECTOR_2040,
  SINK_2040_RANGE,
  SINK_TARGET_2030,
  cumulativeExcess,
  excessImpact,
  feasibility,
  fmt,
  ha,
  mt,
  series,
  type Params,
  type Preset,
} from './model';

/* ───────────────────────────────────────────────────────────────── palette */

/**
 * Round SVG coordinates. Server and client can disagree on the last bit of a
 * float, which React reports as a hydration mismatch on the `y` attribute.
 * Rounding to a tenth of a user unit is invisible and makes the two agree.
 */
const R = (v: number) => Math.round(v * 10) / 10;

const C = {
  fire: '#B83230',
  fireLight: '#E0A09F',
  ember: '#FF9933',
  sink: '#007B6C',
  sinkLight: '#74CBC8',
  plan: '#004B7F',
  planLight: '#7495B2',
  grid: '#E6E7E8',
  axis: '#808285',
};

/* ────────────────────────────────────────────────────── sensitivity config */

/**
 * The dials swept in the tornado chart, with a plausible low/high for each.
 * These bounds are judgement calls about what a reasonable sceptic would
 * accept, not statistical confidence intervals — which is stated on the page.
 */
const SWEEP: { key: keyof Params; label: string; low: number; high: number; note: string }[] = [
  { key: 'growthPct', label: 'Burnt-area growth', low: 0, high: 6, note: '0-6 %/yr' },
  { key: 'embeddedHa', label: 'Fire already in projections', low: 450_000, high: 700_000, note: '450-700k ha/yr' },
  { key: 'fuelLoad', label: 'Combustion per hectare', low: 25, high: 65, note: '25-65 tCO₂/ha' },
  { key: 'forestShare', label: 'Forest share of burnt area', low: 0.3, high: 0.75, note: '30-75%' },
  { key: 'seqRate', label: 'Removals on forest land', low: 1.2, high: 4.5, note: '1.2-4.5 tCO₂/ha/yr' },
  { key: 'recoveryYears', label: 'Recovery time', low: 8, high: 40, note: '8-40 yr' },
  { key: 'decompShare', label: 'Post-fire decomposition', low: 0.05, high: 0.5, note: '5-50%' },
];

/* ─────────────────────────────────────────────────────────────── controls */

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  std?: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, display, onChange } = props;
  const show = (v: number) => (display ? display(v) : fmt(v));
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {show(value)}
          {unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {stdPct !== null && (
          <span
            aria-hidden
            title={`Default: ${show(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `${stdPct}%` }}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined &&
          (modified ? (
            <button
              type="button"
              onClick={() => onChange(std)}
              className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
            >
              ↺ default {show(std)}
            </button>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-tertiary/70">default</span>
          ))}
      </div>
    </label>
  );
}

function ControlGroup({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/40 bg-surface-blue' : 'border-grey-200 bg-white'}`}>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-[0.1em] ${accent ? 'text-primary' : 'text-tertiary'}`}>
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

function Stat({ value, unit, label, sub, tone = 'default' }: {
  value: string; unit?: string; label: string; sub?: string;
  tone?: 'default' | 'fire' | 'sink';
}) {
  const tones = {
    default: 'border-grey-200 bg-white',
    fire: 'border-accent-red/30 bg-[#FDF3F3]',
    sink: 'border-secondary/30 bg-surface-teal',
  };
  const colors = { default: 'text-primary', fire: 'text-accent-red', sink: 'text-secondary-dark' };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className={`font-mono text-[26px] font-bold leading-none tabular-nums ${colors[tone]}`}>
        {value}
        {unit ? <span className="ml-1 text-[13px] font-semibold text-tertiary">{unit}</span> : null}
      </div>
      <div className="mt-2 text-[12px] font-semibold text-tertiary-dark">{label}</div>
      {sub ? <div className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{sub}</div> : null}
    </div>
  );
}

function Section({ eyebrow, title, lede, children }: {
  eyebrow: string; title: string; lede?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="border-t border-grey-200 py-12">
      <div className="mb-6 max-w-text">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-orange">{eyebrow}</div>
        <h2 className="text-[24px] font-bold leading-tight text-tertiary-dark">{title}</h2>
        {lede ? <p className="mt-3 text-[14px] leading-relaxed text-tertiary">{lede}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════  CHARTS  */

/** 1 — Burnt area: five observed years, then the projection. */
function BurntAreaChart({ rows, mode }: { rows: ReturnType<typeof series>; mode: string }) {
  const W = 860;
  const H = 300;
  const m = { l: 54, r: 16, t: 14, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(...rows.map((r) => r.ha), 1.2e6) * 1.08;
  const bw = iw / rows.length;
  const sx = (i: number) => R(m.l + i * bw);
  const sy = (v: number) => R(m.t + ih - (v / max) * ih);
  const ticks = [0, 250_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000].filter((t) => t <= max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="EU-27 burnt area per year, observed 2021-2025 and projected to 2050">
      <defs>
        <pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={C.fireLight} fillOpacity={0.45} />
          <line x1="0" y1="0" x2="0" y2="5" stroke={C.fire} strokeWidth={1.6} strokeOpacity={0.5} />
        </pattern>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">
            {t / 1000}k
          </text>
        </g>
      ))}

      {/* the fire load already assumed inside the inventories */}
      <line x1={m.l} x2={W - m.r} y1={sy(LONG_RUN_MEAN)} y2={sy(LONG_RUN_MEAN)}
        stroke={C.plan} strokeWidth={1.5} strokeDasharray="6 3" />
      {/* white backing so the label stays readable where it crosses the bars */}
      <rect x={W - m.r - 244} y={sy(LONG_RUN_MEAN) - 15} width={244} height={13} fill="#FFFFFF" fillOpacity={0.88} rx={2} />
      <text x={W - m.r - 2} y={sy(LONG_RUN_MEAN) - 5} textAnchor="end" fontSize={9.5} fill={C.plan} fontWeight={700}>
        550k ha — fire already in the projections
      </text>

      {rows.map((r, i) => {
        const h = Math.max(0, m.t + ih - sy(r.ha));
        return (
          <rect key={r.year} x={sx(i) + bw * 0.14} y={sy(r.ha)} width={bw * 0.72} height={h} rx={1}
            fill={r.observed ? C.fire : 'url(#hatch)'} />
        );
      })}

      {/* year labels every 5 years, plus the record */}
      {rows.map((r, i) =>
        r.year % 5 === 0 || r.year === LAST_OBS_YEAR || r.year === FIRST_YEAR ? (
          <text key={r.year} x={sx(i) + bw / 2} y={H - 16} textAnchor="middle" fontSize={9} fill={C.axis}>
            {r.year}
          </text>
        ) : null
      )}

      {/* call out the 2025 record */}
      {(() => {
        const i = rows.findIndex((r) => r.year === 2025);
        return (
          <g>
            <line x1={sx(i) + bw / 2} x2={sx(i) + bw / 2} y1={sy(rows[i].ha) - 6} y2={sy(rows[i].ha) - 20}
              stroke={C.fire} strokeWidth={1} />
            <text x={sx(i) + bw / 2} y={sy(rows[i].ha) - 24} textAnchor="middle" fontSize={9.5} fill={C.fire} fontWeight={700}>
              2025 record · 1.08 Mha
            </text>
          </g>
        );
      })()}

      <line x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>hectares burnt per year — solid = EFFIS observed, hatched = projected ({mode})</text>
    </svg>
  );
}

/** 2 — What the sink loses, split into its three components. */
function CompositionChart({ rows }: { rows: ReturnType<typeof series> }) {
  const W = 860;
  const H = 280;
  const m = { l: 54, r: 162, t: 14, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const proj = rows.filter((r) => r.year >= 2026);
  const max = Math.max(...proj.map((r) => Math.max(0, r.excess.total)), 10) * 1.15;
  const bw = iw / proj.length;
  const sy = (v: number) => R(m.t + ih - (v / max) * ih);
  const step = max > 60 ? 25 : max > 30 ? 10 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);

  const layers = [
    { key: 'combustion' as const, label: 'Burnt in the fire', color: C.fire },
    { key: 'decomposition' as const, label: 'Rotting afterwards', color: C.ember },
    { key: 'foregone' as const, label: 'Removals never made', color: C.planLight },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Composition of the additional sink loss by year">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">{t}</text>
        </g>
      ))}

      {proj.map((r, i) => {
        let acc = 0;
        return (
          <g key={r.year}>
            {layers.map((L) => {
              const v = Math.max(0, r.excess[L.key]);
              const y0 = sy(acc);
              const y1 = sy(acc + v);
              acc += v;
              return <rect key={L.key} x={m.l + i * bw + bw * 0.12} y={y1} width={bw * 0.76}
                height={Math.max(0, y0 - y1)} fill={L.color} />;
            })}
          </g>
        );
      })}

      {proj.map((r, i) =>
        r.year % 5 === 0 ? (
          <text key={r.year} x={m.l + i * bw + bw / 2} y={H - 16} textAnchor="middle" fontSize={9} fill={C.axis}>
            {r.year}
          </text>
        ) : null
      )}

      {layers.map((L, i) => (
        <g key={L.key} transform={`translate(${m.l + iw + 14}, ${m.t + 16 + i * 20})`}>
          <rect width={11} height={11} rx={2} fill={L.color} />
          <text x={16} y={9.5} fontSize={10} fill="#3D5265">{L.label}</text>
        </g>
      ))}

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>additional sink loss, MtCO₂e per year, above the fire load already assumed</text>
    </svg>
  );
}

/** 3 — The money chart: planned sink vs the sink fire actually leaves. */
function SinkGapChart({ rows }: { rows: ReturnType<typeof series> }) {
  const W = 860;
  const H = 340;
  const m = { l: 54, r: 150, t: 20, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  // Line chart, so a non-zero baseline is legitimate — it is labelled on the
  // axis caption. Starting at zero would spend half the panel on empty space
  // and make the gap, which is the entire point of the chart, unreadable.
  const lo = 150;
  const max = 400;
  const sx = (y: number) => R(m.l + ((y - FIRST_YEAR) / (END_YEAR - FIRST_YEAR)) * iw);
  const sy = (v: number) => R(m.t + ih - ((v - lo) / (max - lo)) * ih);

  const refPath = rows.map((r) => `${sx(r.year)},${sy(r.refSink)}`).join(' ');
  const adjPath = rows.map((r) => `${sx(r.year)},${sy(r.adjSink)}`).join(' ');
  const gapPoly = [
    ...rows.map((r) => `${sx(r.year)},${sy(r.refSink)}`),
    ...[...rows].reverse().map((r) => `${sx(r.year)},${sy(r.adjSink)}`),
  ].join(' ');

  const f40 = rows.find((r) => r.year === 2040)!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Planned EU land sink versus the sink after wildfire losses, to 2050">
      {[150, 200, 250, 300, 350, 400].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">{t}</text>
        </g>
      ))}

      {/* the gap — the whole point of the chart */}
      <polygon points={gapPoly} fill={C.fire} fillOpacity={0.18} />

      {/* 2030 legal target marker */}
      <g>
        <line x1={sx(2030)} x2={sx(2030)} y1={m.t} y2={m.t + ih} stroke={C.plan} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
        <circle cx={sx(2030)} cy={sy(SINK_TARGET_2030)} r={4} fill={C.plan} />
        <text x={sx(2030) + 7} y={sy(SINK_TARGET_2030) - 8} fontSize={9.5} fill={C.plan} fontWeight={700}>
          2030 legal target 310 Mt
        </text>
      </g>

      {/* 2040 assumption band */}
      <line x1={sx(2040)} x2={sx(2040)} y1={sy(SINK_2040_RANGE.high)} y2={sy(SINK_2040_RANGE.low)}
        stroke={C.planLight} strokeWidth={7} strokeOpacity={0.35} strokeLinecap="round" />
      <text x={sx(2040)} y={sy(SINK_2040_RANGE.high) - 8} textAnchor="middle" fontSize={9} fill={C.plan}>
        2040 IA range
      </text>

      <polyline points={refPath} fill="none" stroke={C.plan} strokeWidth={2.4} />
      <polyline points={adjPath} fill="none" stroke={C.fire} strokeWidth={2.4} strokeDasharray="6 3" />

      {/* the 2040 gap, annotated */}
      <g>
        <line x1={sx(2040)} x2={sx(2040)} y1={sy(f40.refSink)} y2={sy(f40.adjSink)} stroke={C.fire} strokeWidth={2} />
        <circle cx={sx(2040)} cy={sy(f40.refSink)} r={3.5} fill={C.plan} />
        <circle cx={sx(2040)} cy={sy(f40.adjSink)} r={3.5} fill={C.fire} />
      </g>

      {[2021, 2030, 2040, 2050].map((y) => (
        <text key={y} x={sx(y)} y={H - 20} textAnchor="middle" fontSize={9.5} fill={C.axis}>{y}</text>
      ))}

      <g transform={`translate(${m.l + iw + 14}, ${m.t + 10})`}>
        <line x1={0} x2={20} y1={5} y2={5} stroke={C.plan} strokeWidth={2.4} />
        <text x={25} y={8.5} fontSize={10} fill="#3D5265">Planned sink</text>
        <line x1={0} x2={20} y1={25} y2={25} stroke={C.fire} strokeWidth={2.4} strokeDasharray="6 3" />
        <text x={25} y={28.5} fontSize={10} fill="#3D5265">After fire</text>
        <rect x={0} y={40} width={20} height={11} fill={C.fire} fillOpacity={0.18} />
        <text x={25} y={49} fontSize={10} fill="#3D5265">The gap</text>
        <text x={0} y={78} fontSize={10.5} fill={C.fire} fontWeight={700}>
          {mt(f40.refSink - f40.adjSink)} in 2040
        </text>
        <text x={0} y={93} fontSize={9} fill="#54728C">every other sector</text>
        <text x={0} y={105} fontSize={9} fill="#54728C">must absorb this</text>
      </g>

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={12} fontSize={9} fill={C.axis}>EU-27 net land sink, MtCO₂e per year — axis starts at 150, not zero</text>
    </svg>
  );
}

/** 4 — Tornado: which assumption actually drives the answer. */
function TornadoChart({ base, p }: { base: number; p: Params }) {
  const rows = SWEEP.map((s) => {
    const lo = excessImpact(2040, { ...p, [s.key]: s.low } as Params).total;
    const hi = excessImpact(2040, { ...p, [s.key]: s.high } as Params).total;
    return { ...s, lo: Math.min(lo, hi), hi: Math.max(lo, hi), span: Math.abs(hi - lo) };
  }).sort((a, b) => b.span - a.span);

  const W = 860;
  const rowH = 30;
  const m = { l: 210, r: 60, t: 26, b: 28 };
  const H = rows.length * rowH + m.t + m.b;
  const iw = W - m.l - m.r;
  const min = Math.min(0, ...rows.map((r) => r.lo));
  const max = Math.max(...rows.map((r) => r.hi), base) * 1.05;
  const sx = (v: number) => R(m.l + ((v - min) / (max - min)) * iw);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Sensitivity of the 2040 sink loss to each assumption">
      {/* central case reference line */}
      <line x1={sx(base)} x2={sx(base)} y1={m.t - 8} y2={H - m.b + 4} stroke={C.plan} strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={sx(base)} y={m.t - 12} textAnchor="middle" fontSize={9.5} fill={C.plan} fontWeight={700}>
        current {base.toFixed(0)} Mt
      </text>

      {rows.map((r, i) => {
        const y = m.t + i * rowH;
        return (
          <g key={r.key}>
            <text x={m.l - 10} y={y + rowH / 2 + 3} textAnchor="end" fontSize={10.5} fill="#3D5265">{r.label}</text>
            <rect x={sx(r.lo)} y={y + 7} width={Math.max(2, sx(r.hi) - sx(r.lo))} height={rowH - 15} rx={2}
              fill={C.ember} fillOpacity={0.75} />
            <text x={sx(r.hi) + 6} y={y + rowH / 2 + 3} fontSize={9.5} fill={C.axis} className="tabular-nums">
              {r.lo.toFixed(0)}–{r.hi.toFixed(0)}
            </text>
          </g>
        );
      })}

      <line x1={m.l} x2={m.l + iw} y1={H - m.b + 4} y2={H - m.b + 4} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={H - 8} fontSize={9} fill={C.axis}>
        2040 sink loss, MtCO₂e — each bar sweeps one assumption across its plausible range, all others held at current settings
      </text>
    </svg>
  );
}

/** 5 — The catch-up: what the lost sink means for everyone else. */
function CatchUpChart({ burden }: { burden: number }) {
  const W = 860;
  const rowH = 34;
  const m = { l: 210, r: 150, t: 26, b: 26 };
  const H = SECTOR_2040.length * rowH + m.t + m.b;
  const iw = W - m.l - m.r;
  const max = Math.max(...SECTOR_2040.map((s) => s.mt)) * 1.05;
  const sx = (v: number) => R((v / max) * iw);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="The lost sink compared with illustrative 2040 sector emissions">
      {SECTOR_2040.map((s, i) => {
        const y = m.t + i * rowH;
        const pct = (burden / s.mt) * 100;
        return (
          <g key={s.sector}>
            <text x={m.l - 10} y={y + rowH / 2 + 3} textAnchor="end" fontSize={10.5} fill="#3D5265">{s.sector}</text>
            <rect x={m.l} y={y + 7} width={sx(s.mt)} height={rowH - 16} rx={2} fill={s.color} fillOpacity={0.28} />
            {/* the slice of that sector the lost sink is equivalent to */}
            <rect x={m.l} y={y + 7} width={sx(Math.min(burden, s.mt))} height={rowH - 16} rx={2} fill={C.fire} />
            <text x={m.l + sx(s.mt) + 8} y={y + rowH / 2 + 3} fontSize={9.5} fill={C.axis} className="tabular-nums">
              {s.mt} Mt · lost sink = {pct.toFixed(0)}%
            </text>
          </g>
        );
      })}
      <text x={m.l} y={16} fontSize={9} fill={C.axis}>
        illustrative EU-27 residual emissions in 2040, MtCO₂e — red = the extra cut the lost sink forces
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════   PAGE   */

export default function WildfireSinkRiskPage() {
  const [p, setP] = useState<Params>({ ...DEFAULTS });
  const [activePreset, setActivePreset] = useState('central');
  const [showAllAssumptions, setShowAllAssumptions] = useState(false);

  const set = (k: keyof Params) => (v: number) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setActivePreset('custom');
  };

  const applyPreset = (pr: Preset) => {
    setP({ ...DEFAULTS, ...pr.over });
    setActivePreset(pr.id);
  };

  const rows = useMemo(() => series(p), [p]);
  const f40 = useMemo(() => feasibility(2040, p), [p]);
  const f30 = useMemo(() => feasibility(2030, p), [p]);
  const cum = useMemo(() => cumulativeExcess(2026, 2040, p), [p]);
  const cum50 = useMemo(() => cumulativeExcess(2026, 2050, p), [p]);
  const e40 = f40.extraBurden;

  const fiveYearTotal = BURNT_AREA.reduce((s, d) => s + d.ha, 0);
  const modeLabel =
    p.mode === 'flat' ? 'held flat' : p.mode === 'trend' ? 'five-year linear trend' : `+${p.growthPct}%/yr`;

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />

      {/* ───────────────────────────────────────────────────────── HERO */}
      <div className="border-b border-grey-200 bg-gradient-to-b from-[#FDF3F3] to-white">
        <div className="mx-auto max-w-content px-6 py-14">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded bg-accent-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              M · 41 — beta
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
              Wildfires &amp; the land sink
            </span>
          </div>

          <h1 className="max-w-3xl text-[38px] font-bold leading-[1.12] text-tertiary-dark">
            Wildfires burn houses and livelihoods today.
            <span className="text-accent-red"> They also burn the feasibility of the 2040 target.</span>
          </h1>

          <p className="mt-5 max-w-text text-[15px] leading-relaxed text-tertiary">
            In 2025 the EU lost <strong className="text-tertiary-dark">1,079,538 hectares</strong> to fire — an area
            about the size of Cyprus, and the worst year in the EFFIS record. The emergency response measured that in
            homes, evacuations and lives. This module measures it in a second currency that nobody bills for at the
            time: the <strong className="text-tertiary-dark">carbon that land was supposed to absorb</strong> on the
            way to climate neutrality.
          </p>

          <p className="mt-3 max-w-text text-[15px] leading-relaxed text-tertiary">
            The 2040 target is a <em>net</em> target. Net means gross emissions minus the land sink. So every tonne the
            forest fails to absorb is a tonne that steel, cement, farming, aviation or shipping has to stop emitting
            instead. The arithmetic is not a metaphor — it is subtraction, and it is done below.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat tone="fire" value={ha(fiveYearTotal)} label="Burnt in the EU, 2021-2025"
              sub={`Five-year mean ${ha(FIVE_YEAR_MEAN)}/yr, against a long-run ${ha(LONG_RUN_MEAN)}/yr`} />
            <Stat tone="fire" value={mt(e40, 0)} unit="CO₂e" label="Sink lost in 2040"
              sub={`${f40.burdenPctOfSink.toFixed(0)}% of the sink the 2040 target is counting on`} />
            <Stat tone="default" value={f40.monthsOfEffort.toFixed(1)} unit="months" label="Of EU climate effort erased"
              sub="Measured against the average annual net cut required between 2030 and 2040" />
            <Stat tone="sink" value={fmt(Math.round(cum))} unit="Mt" label="Cumulative extra CO₂e, 2026-2040"
              sub={`${fmt(Math.round(cum50))} Mt by 2050 — the budget cost, not just the target-year cost`} />
          </div>

          <p className="mt-6 max-w-text text-[11.5px] leading-relaxed text-tertiary">
            Currently showing the <strong className="text-tertiary-dark">
              {PRESETS.find((x) => x.id === activePreset)?.label ?? 'custom'}
            </strong> case. Every figure on this page moves with the assumptions — all of which are exposed as sliders
            and documented at the bottom. This is a back-of-the-envelope model, not a projection.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-content px-6">

        {/* ─────────────────────────────────────────── 1. THE FIRE RECORD */}
        <Section
          eyebrow="1 · The record"
          title="Five years, three and a quarter million hectares"
          lede={
            <>
              EFFIS has mapped EU-27 burnt area since 2006. The last five years contain the worst year on record and
              the second worst. The dashed line is the fire load that inventories and Member State projections already
              quietly assume — everything above it is a problem the 2040 target has not been told about.
            </>
          }
        >
          <div className="rounded-lg border border-grey-200 bg-white p-5">
            <BurntAreaChart rows={rows} mode={modeLabel} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {BURNT_AREA.map((d) => (
              <div key={d.year} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-bold text-tertiary-dark">{d.year}</span>
                  <span className="font-mono text-[12px] font-bold tabular-nums text-accent-red">{ha(d.ha)}</span>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">{d.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-grey-200 bg-surface-blue p-5">
            <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-primary">
              Why we do not simply extend the trend
            </h4>
            <p className="max-w-text text-[13px] leading-relaxed text-tertiary">
              A straight line through these five points rises by about{' '}
              <strong className="text-tertiary-dark">84,000 hectares every year</strong> — roughly 13% of the five-year
              mean, compounding. Extended to 2040 that reaches over 2 Mha a year, and the 2040 target stops being
              arithmetically reachable through the land sector at all. But five points containing one record year is a
              weak basis for a trend, and fire is famously volatile: 2024 was quieter than 2021. So the default here is
              deliberately more cautious — burnt area sits at the five-year mean and creeps up{' '}
              {DEFAULTS.growthPct}%/yr. The trend case is available as a stress test, and it is the one that should
              worry people, because it is what the observed record actually says.
            </p>
          </div>
        </Section>

        {/* ──────────────────────────────────── 2. HECTARES INTO CARBON */}
        <Section
          eyebrow="2 · From hectares to carbon"
          title="A burnt hectare costs the inventory three separate things"
          lede={
            <>
              Most coverage stops at the smoke column. That is only the first of three carbon consequences, and over a
              decade it is not always the largest. The third one — removals that simply never happen — is the one that
              compounds, because every fire year leaves behind another cohort of land that under-performs for decades.
            </>
          }
        >
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              {
                n: '1', t: 'Burnt in the fire', c: C.fire,
                d: 'Carbon in the vegetation that goes straight up the smoke column. Calibrated to CAMS, which measured roughly 12.5 MtC — about 45.8 MtCO₂ — from the EU’s 1.08 Mha in 2025. That back-solves to about 42 tCO₂ per hectare.',
              },
              {
                n: '2', t: 'Rotting afterwards', c: C.ember,
                d: 'Fire kills far more biomass than it consumes. Standing dead wood and roots decay over the following decade, releasing CO₂ long after the news crews leave. Modelled at a quarter of the combustion figure, spread over ten years.',
              },
              {
                n: '3', t: 'Removals never made', c: C.planLight,
                d: 'The sink the stand would have delivered while it regrows. A burnt forest does not resume absorbing at its old rate for roughly two decades. This is the term that accumulates — and the one the target actually depends on.',
              },
            ].map((x) => (
              <div key={x.n} className="rounded-lg border border-grey-200 bg-white p-5">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: x.c }}>{x.n}</span>
                  <h4 className="text-[13px] font-bold text-tertiary-dark">{x.t}</h4>
                </div>
                <p className="text-[12px] leading-relaxed text-tertiary">{x.d}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-grey-200 bg-white p-5">
            <CompositionChart rows={rows} />
          </div>

          <div className="mt-5 rounded-lg border border-accent-orange/40 bg-surface-orange p-5">
            <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-accent-red">
              The honest subtraction
            </h4>
            <p className="max-w-text text-[13px] leading-relaxed text-tertiary">
              The chart above does <em>not</em> show the total carbon cost of EU wildfire. It shows only the{' '}
              <strong className="text-tertiary-dark">additional</strong> cost — the amount by which the projected fire
              path exceeds the roughly {ha(LONG_RUN_MEAN)}/yr that inventories and Member State projections already
              contain. Counting the whole fire load against the target would be double-counting, and would roughly
              double every number on this page. That correction is the single most consequential methodological choice
              in the module, and it is a slider like everything else.
            </p>
          </div>
        </Section>

        {/* ─────────────────────────────────────────────── 3. THE GAP */}
        <Section
          eyebrow="3 · The gap"
          title="The sink the targets assume, and the sink fire leaves behind"
          lede={
            <>
              The blue line is the plan: the sink recovers from today’s 212 Mt to the legally binding 310 Mt in 2030 and
              on to the 2040 impact-assessment assumption. The red line is what is left once the extra fire load is
              subtracted. The shaded wedge between them is the part of the 2040 target that quietly stops being funded
              by the land.
            </>
          }
        >
          <div className="rounded-lg border border-grey-200 bg-white p-5">
            <SinkGapChart rows={rows} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Stat value={mt(f30.extraBurden, 0)} label="Sink shortfall in 2030"
              sub={`Against a legally binding 310 Mt target the EU is already off track for — the 2023 outturn was 198 Mt`} />
            <Stat tone="fire" value={mt(e40, 0)} label="Sink shortfall in 2040"
              sub={`${f40.burdenPctOfSink.toFixed(0)}% of the planned ${fmt(rows.find((r) => r.year === 2040)!.refSink)} Mt sink`} />
            <Stat tone="sink" value={mt(rows.find((r) => r.year === 2050)!.refSink - rows.find((r) => r.year === 2050)!.adjSink, 0)}
              label="Sink shortfall in 2050"
              sub="Net zero means the sink must cover all residual emissions — a shortfall here has nowhere to go" />
          </div>
        </Section>

        {/* ────────────────────────────────────── 4. TARGET FEASIBILITY */}
        <Section
          eyebrow="4 · Feasibility"
          title="What this does to the 2040 and 2050 targets"
          lede={
            <>
              The 2040 target is −{p.target2040Pct}% net against a 1990 baseline of {fmt(BASE_1990)} MtCO₂e. That
              allows {fmt(Math.round(f40.netAllowed))} Mt of net emissions in 2040. Net emissions are gross emissions
              minus the sink — so if the sink under-delivers, the gross budget for everything else shrinks by exactly
              the same amount. There is no third option.
            </>
          }
        >
          <div className="rounded-lg border border-grey-200 bg-white p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-4 text-[12px] font-bold uppercase tracking-[0.1em] text-tertiary">
                  The 2040 gross budget
                </h4>
                <div className="space-y-3">
                  {[
                    { l: 'Net emissions allowed (−90% vs 1990)', v: f40.netAllowed, c: '#54728C' },
                    { l: 'Planned land sink', v: rows.find((r) => r.year === 2040)!.refSink, c: C.sink },
                    { l: 'Gross budget if the sink delivers', v: f40.grossPlanned, c: C.plan, bold: true },
                    { l: 'Gross budget after wildfire losses', v: f40.grossActual, c: C.fire, bold: true },
                  ].map((r) => (
                    <div key={r.l}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={`text-[12px] ${r.bold ? 'font-bold text-tertiary-dark' : 'text-tertiary'}`}>{r.l}</span>
                        <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: r.c }}>
                          {fmt(Math.round(r.v))} Mt
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-grey-100">
                        <div className="h-2 rounded-full" style={{ width: `${(r.v / 900) * 100}%`, background: r.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-[#FDF3F3] p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-red">
                  The catch-up bill
                </div>
                <div className="mt-3 font-mono text-[40px] font-bold leading-none text-accent-red tabular-nums">
                  {mt(e40, 0)}
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-tertiary">
                  of additional cuts that every other sector must find by 2040, purely to stand still against a target
                  that was set assuming the land would absorb more than it now will.
                </p>
                <div className="mt-4 space-y-2 border-t border-accent-red/20 pt-4 text-[12px] text-tertiary">
                  <div className="flex justify-between gap-3">
                    <span>Share of the 2040 gross budget</span>
                    <strong className="tabular-nums text-tertiary-dark">{f40.burdenPctOfGross.toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Equivalent cars off the road</span>
                    <strong className="tabular-nums text-tertiary-dark">{fmt(f40.carsMillions, 1)} m</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Months of EU-wide climate effort</span>
                    <strong className="tabular-nums text-tertiary-dark">{f40.monthsOfEffort.toFixed(1)}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Cumulative 2026-2050</span>
                    <strong className="tabular-nums text-tertiary-dark">{fmt(Math.round(cum50))} Mt</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h4 className="mb-3 mt-8 text-[13px] font-bold text-tertiary-dark">
            Who has to catch up, and by how much
          </h4>
          <div className="rounded-lg border border-grey-200 bg-white p-5">
            <CatchUpChart burden={e40} />
          </div>
          <p className="mt-3 max-w-text text-[11.5px] leading-relaxed text-tertiary">
            Sector figures are illustrative residual 2040 emissions used only to give the shortfall a sense of scale;
            they are not a Commission scenario read-out. The point is the ratio, not the sector totals: a sink
            shortfall of {mt(e40, 0)} is the same size as a material fraction of what an entire hard-to-abate sector is
            still expected to be emitting in 2040 — and those are precisely the sectors with the fewest cheap options
            left.
          </p>

          <div className="mt-6 rounded-lg border border-accent-red/30 bg-[#FDF3F3] p-5">
            <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-accent-red">
              And 2050 is worse, structurally
            </h4>
            <p className="max-w-text text-[13px] leading-relaxed text-tertiary">
              Net zero in 2050 means the sink must exactly cancel whatever gross emissions remain. In 2040 a sink
              shortfall can be absorbed by cutting harder elsewhere. In 2050 there is no &ldquo;elsewhere&rdquo; left to
              cut: a permanently fire-degraded sink has to be replaced tonne-for-tonne by engineered removals, which are
              the most expensive tonnes in the entire system. On the current settings the 2050 shortfall is{' '}
              <strong className="text-tertiary-dark">
                {mt(rows.find((r) => r.year === 2050)!.refSink - rows.find((r) => r.year === 2050)!.adjSink, 0)}
              </strong>{' '}
              — a standing bill that has to be paid every year, forever, in the most expensive currency available.
            </p>
          </div>
        </Section>

        {/* ──────────────────────────────────────── 5. SENSITIVITY */}
        <Section
          eyebrow="5 · Sensitivity"
          title="Test the assumptions — including against yourself"
          lede={
            <>
              A back-of-the-envelope number is only worth as much as its worst assumption. Start from a named case,
              then move any dial. The tornado chart shows which assumptions actually drive the answer and which are
              decoration — sweep each one across its plausible range and see how far the 2040 shortfall moves.
            </>
          }
        >
          <div className="mb-6 grid gap-3 md:grid-cols-5">
            {PRESETS.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => applyPreset(pr)}
                className={`rounded-lg border p-3 text-left transition ${
                  activePreset === pr.id
                    ? 'border-primary bg-surface-blue ring-1 ring-primary/30'
                    : 'border-grey-200 bg-white hover:border-primary/40'
                }`}
              >
                <div className={`text-[12px] font-bold leading-tight ${activePreset === pr.id ? 'text-primary' : 'text-tertiary-dark'}`}>
                  {pr.label}
                </div>
                <div className="mt-2 font-mono text-[15px] font-bold tabular-nums text-accent-red">
                  {mt(excessImpact(2040, { ...DEFAULTS, ...pr.over }).total, 0)}
                </div>
                <div className="text-[9.5px] text-tertiary">in 2040</div>
              </button>
            ))}
          </div>

          <p className="mb-6 max-w-text rounded-lg border border-grey-200 bg-grey-50 p-4 text-[12.5px] leading-relaxed text-tertiary">
            {PRESETS.find((x) => x.id === activePreset)?.blurb ??
              'Custom settings — you have moved at least one dial away from a named case.'}
          </p>

          <div className="mb-8 rounded-lg border border-grey-200 bg-white p-5">
            <TornadoChart base={e40} p={p} />
            <p className="mt-3 text-[11.5px] leading-relaxed text-tertiary">
              Read this as a ranking, not a probability distribution: the bounds are judgements about what a reasonable
              sceptic would accept, not statistical confidence intervals. The ordering is the useful output — it tells
              you which argument to have. If the top bar is the growth rate, then the debate is about climate and fire
              management, not about forest carbon accounting.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ControlGroup title="Burnt area" accent>
              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-tertiary-dark">Projection mode</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'flat', l: 'Flat' },
                    { id: 'growth', l: 'Growth' },
                    { id: 'trend', l: 'Trend' },
                  ] as const).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => { setP((prev) => ({ ...prev, mode: o.id })); setActivePreset('custom'); }}
                      className={`rounded border px-2 py-1.5 text-[11px] font-semibold transition ${
                        p.mode === o.id ? 'border-primary bg-primary text-white' : 'border-grey-300 bg-white text-tertiary hover:border-primary/50'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">
                  Flat holds the anchor forever. Growth compounds it. Trend extends the 2021-25 regression line
                  (+{fmt(Math.round(84_248 / 1000))}k ha/yr) and ignores the anchor.
                </p>
              </div>

              <Slider label="Anchor burnt area" value={p.anchorHa} min={400_000} max={1_200_000} step={10_000}
                unit="ha/yr" std={DEFAULTS.anchorHa} display={(v) => fmt(Math.round(v / 1000)) + 'k'}
                onChange={set('anchorHa')}
                hint="Where the projection starts in 2025. Default is the five-year mean, which smooths the record year." />

              <Slider label="Annual growth in burnt area" value={p.growthPct} min={-2} max={8} step={0.5}
                unit="%/yr" std={DEFAULTS.growthPct} display={(v) => v.toFixed(1)} onChange={set('growthPct')}
                hint="Net of climate change making fires worse and fuel management making them better." />

              <Slider label="Fire already in the projections" value={p.embeddedHa} min={400_000} max={800_000} step={10_000}
                unit="ha/yr" std={DEFAULTS.embeddedHa} display={(v) => fmt(Math.round(v / 1000)) + 'k'}
                onChange={set('embeddedHa')}
                hint="The baseline subtracted to avoid double-counting. Raising it shrinks every number on this page." />
            </ControlGroup>

            <ControlGroup title="Carbon">
              <Slider label="Combustion per hectare" value={p.fuelLoad} min={15} max={80} step={1}
                unit="tCO₂/ha" std={DEFAULTS.fuelLoad} onChange={set('fuelLoad')}
                hint="Calibrated to CAMS on the 2025 record year. Light shrub ~20, dense conifer 70+." />

              <Slider label="Forest share of burnt area" value={p.forestShare} min={0.15} max={0.85} step={0.05}
                unit="of area" std={DEFAULTS.forestShare} display={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={set('forestShare')}
                hint="Only forest carries a durable removals stream. Scrub and grass regrow within a few years." />

              <Slider label="Removals on forest land" value={p.seqRate} min={0.8} max={5} step={0.1}
                unit="tCO₂/ha/yr" std={DEFAULTS.seqRate} display={(v) => v.toFixed(1)} onChange={set('seqRate')}
                hint="What an unburnt hectare of productive EU forest absorbs each year." />

              <Slider label="Recovery time" value={p.recoveryYears} min={5} max={50} step={1}
                unit="years" std={DEFAULTS.recoveryYears} onChange={set('recoveryYears')}
                hint="Until a burnt stand absorbs at its pre-fire rate again. Repeat burns can make this effectively never." />

              <Slider label="Post-fire decomposition" value={p.decompShare} min={0} max={0.6} step={0.05}
                unit="of combustion" std={DEFAULTS.decompShare} display={(v) => `${(v * 100).toFixed(0)}%`}
                onChange={set('decompShare')}
                hint="Fire-killed biomass that rots rather than burns, released over the decay window below." />

              <Slider label="Decay window" value={p.decompYears} min={1} max={30} step={1}
                unit="years" std={DEFAULTS.decompYears} onChange={set('decompYears')}
                hint="Longer windows spread the same carbon more thinly across more years." />
            </ControlGroup>

            <ControlGroup title="Policy">
              <Slider label="Planned 2040 land sink" value={p.sink2040} min={150} max={400} step={5}
                unit="Mt" std={DEFAULTS.sink2040} onChange={set('sink2040')}
                hint={`The Commission's 2040 impact assessment spans ${SINK_2040_RANGE.low}/${SINK_2040_RANGE.central}/${SINK_2040_RANGE.high} Mt. The ESABCC frames total removals within 100-400 Mt.`} />

              <Slider label="2040 net reduction target" value={p.target2040Pct} min={80} max={95} step={1}
                unit="% vs 1990" std={DEFAULTS.target2040Pct} onChange={set('target2040Pct')}
                hint="Legislated at 90%. The ESABCC advised 90-95% — the stricter the target, the more a lost sink hurts." />

              <div className="rounded border border-grey-200 bg-grey-50 p-3 text-[11px] leading-relaxed text-tertiary">
                <strong className="text-tertiary-dark">Fixed anchors.</strong> 1990 baseline {fmt(BASE_1990)} MtCO₂e
                net; 2030 net allowance {fmt(Math.round(NET_ALLOWED_2030))} Mt (−55%); 2030 LULUCF target{' '}
                {SINK_TARGET_2030} Mt under Regulation (EU) 2023/839; 2050 net zero.
              </div>
            </ControlGroup>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => applyPreset(PRESETS[0])}
              className="rounded border border-grey-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-tertiary hover:border-primary/50"
            >
              ↺ Reset everything to the central case
            </button>
            <span className="text-[11px] text-tertiary">
              Current: burnt area {modeLabel}, {ha(rows.find((r) => r.year === 2040)!.ha)} in 2040 →{' '}
              <strong className="text-accent-red">{mt(e40, 1)}</strong> sink loss
            </span>
          </div>
        </Section>

        {/* ────────────────────────────────────── 6. ASSUMPTIONS */}
        <Section
          eyebrow="6 · Documentation"
          title="Every assumption, its source, and how much to trust it"
          lede={
            <>
              The confidence column is deliberately blunt. Three of these dials are rated low, and they are not
              marginal ones — the forest share of burnt area, the recovery time and the decomposition fraction between
              them can move the headline number by a factor of two. That is the honest state of the evidence, and it is
              why this module ships with sliders instead of a single number.
            </>
          }
        >
          <div className="overflow-x-auto rounded-lg border border-grey-200">
            <table className="w-full min-w-[860px] border-collapse bg-white text-left">
              <thead>
                <tr className="border-b border-grey-200 bg-grey-50">
                  {['Assumption', 'Value', 'Source', 'Confidence'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tertiary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllAssumptions ? ASSUMPTIONS : ASSUMPTIONS.slice(0, 4)).map((a) => (
                  <tr key={a.key} className="border-b border-grey-100 align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-[12.5px] font-semibold text-tertiary-dark">{a.label}</div>
                      <p className="mt-1 max-w-md text-[11px] leading-snug text-tertiary">{a.rationale}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] font-semibold tabular-nums text-primary">
                      {a.value}
                    </td>
                    <td className="px-4 py-3 text-[11px] leading-snug text-tertiary">{a.source}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        a.confidence === 'high' ? 'bg-surface-green text-secondary-dark'
                          : a.confidence === 'medium' ? 'bg-surface-yellow text-[#8A6D00]'
                          : 'bg-[#FDF3F3] text-accent-red'
                      }`}>
                        {a.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setShowAllAssumptions((v) => !v)}
            className="mt-3 text-[11.5px] font-semibold text-primary hover:underline"
          >
            {showAllAssumptions ? '− Show fewer' : `+ Show all ${ASSUMPTIONS.length} assumptions`}
          </button>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-5">
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-tertiary">
                What would make this worse
              </h4>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-tertiary">
                <li>• Soil and peat carbon loss, which this model ignores entirely.</li>
                <li>• Repeat burns converting forest permanently to shrub — recovery never completes.</li>
                <li>• Fire-climate feedbacks and drought-driven bark beetle mortality compounding.</li>
                <li>• EFFIS maps fires above roughly 30 ha, so true burnt area is higher than modelled.</li>
                <li>• 39% of the 2025 burnt area was inside Natura 2000 — the land the sink strategy leans on hardest.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-5">
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-tertiary">
                What would make this better
              </h4>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-tertiary">
                <li>• Serious fuel management and landscape-scale prevention lowering the growth rate.</li>
                <li>• Faster assisted regeneration shortening the recovery ramp.</li>
                <li>• Afforestation elsewhere offsetting fire losses within the same sink account.</li>
                <li>• A higher embedded-fire baseline, if projections already assume more fire than 550k ha/yr.</li>
                <li>• Salvage logging moving carbon into harvested wood products rather than leaving it to rot.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ────────────────────────────────────── 7. CLOSING */}
        <section className="border-t border-grey-200 py-14">
          <div className="max-w-text">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-orange">
              The point
            </div>
            <h2 className="text-[26px] font-bold leading-tight text-tertiary-dark">
              A fire season is a climate policy event, and it is not currently treated as one
            </h2>
            <div className="mt-5 space-y-4 text-[14px] leading-relaxed text-tertiary">
              <p>
                When a wildfire season ends, it is accounted for in hectares, homes and lives. Those are the right
                things to count first. But the same fire quietly does something else: it removes part of the
                <em> mechanism </em> the EU has written into law for reaching climate neutrality. The land sink is not a
                nice-to-have in the 2040 architecture — it is a load-bearing assumption, sized at over 300 MtCO₂e a year,
                and it is the only pillar of the target that can be destroyed by weather.
              </p>
              <p>
                On the settings currently loaded, fire erodes{' '}
                <strong className="text-accent-red">{mt(e40, 0)}</strong> of that pillar by 2040 — roughly{' '}
                {f40.burdenPctOfSink.toFixed(0)}% of it, or {f40.monthsOfEffort.toFixed(1)} months of the EU&rsquo;s
                entire decarbonisation effort, handed as an unfunded bill to sectors that are already being asked for
                everything they have. Move to the trend case and it stops being a bill and starts being a
                feasibility problem.
              </p>
              <p>
                None of this argues that the 2040 target is wrong. It argues the opposite: that the target has a
                dependency nobody is currently managing as a climate policy. Fire prevention, fuel management and
                landscape restoration are usually budgeted as civil protection. On this arithmetic they are also among
                the cheapest mitigation instruments the EU has — because every hectare that does not burn is a hectare
                that keeps absorbing, and a tonne that steel and cement do not have to find instead.
              </p>
              <p className="rounded-lg border-l-4 border-accent-red bg-[#FDF3F3] py-3 pl-4 pr-4 text-[14px] font-semibold text-tertiary-dark">
                Wildfires do not only burn houses and livelihoods now. They burn the feasibility of the 2040 target —
                and unlike houses, a sink cannot be rebuilt in a season.
              </p>
            </div>

            <div className="mt-8 rounded-lg border border-grey-200 bg-grey-50 p-5 text-[11.5px] leading-relaxed text-tertiary">
              <strong className="text-tertiary-dark">Sources.</strong> Burnt area: Copernicus Emergency Management
              Service — European Forest Fire Information System (EFFIS),{' '}
              <a href="https://forest-fire.emergency.copernicus.eu/" target="_blank" rel="noreferrer"
                className="text-primary underline">forest-fire.emergency.copernicus.eu</a>, and the JRC annual
              &ldquo;Forest Fires in Europe, Middle East and North Africa&rdquo; reports. Fire emissions: Copernicus
              Atmosphere Monitoring Service (CAMS) global fire assimilation system. Land sink and inventory: EU
              greenhouse gas inventory and EEA trends and projections. Targets: European Climate Law as amended,
              Regulation (EU) 2023/839 on LULUCF, and the Commission&rsquo;s 2040 climate target impact assessment.
              Advice range: ESABCC, <em>Scientific advice for the determination of an EU-wide 2040 climate target</em>.
              <br /><br />
              <strong className="text-tertiary-dark">Status.</strong> Beta module, illustrative arithmetic only. Not an
              ESABCC position, not a projection, and not suitable for citation as a quantitative finding. It exists to
              make an argument legible and to be argued with.
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
