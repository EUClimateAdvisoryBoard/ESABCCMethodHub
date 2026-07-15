'use client';

/**
 * Overview Industry — Trade flows — the import-dependency map.
 * ------------------------------------------------------------
 * Scatter of every curated import dependency of EU manufacturing on two
 * sourced axes: import reliance (EC criticality methodology) × largest single
 * supplier's share of EU supply. Shared by the Overview and the Dependencies
 * dashboard. The dense top-right cluster (many dependencies at ~100%
 * reliance) makes direct labels unreadable, so the map uses NUMBERED
 * bubbles — separated by a deterministic repulsion pass — linked to an
 * ordered list that carries the full names, suppliers and values. Hovering
 * either side highlights the other.
 */

import { useState } from 'react';
import { RISK_HOTSPOTS } from './trade-data';

const X_MIN = 0.5; // every entry sits above 63% reliance — start the axis at 50%

export default function DependencyMap() {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 480;
  const M = { t: 24, r: 24, b: 52, l: 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const R = 11; // bubble radius
  const x = (v: number) => M.l + ((Math.max(v, X_MIN) - X_MIN) / (1 - X_MIN)) * iw;
  const y = (v: number) => M.t + (1 - v) * ih;
  const isChina = (s: string) => /china/i.test(s);

  // order by reliance × concentration, largest product first — the
  // numbering shared between bubbles and the side list
  const ranked = [...RISK_HOTSPOTS].sort(
    (a, b) => b.importReliance * b.supplierConcentration - a.importReliance * a.supplierConcentration,
  );

  // deterministic repulsion: push overlapping bubbles apart, keep inside plot
  const placed = ranked.map((h, i) => ({ ...h, n: i + 1, px: x(h.importReliance), py: y(h.supplierConcentration) }));
  const MIN_D = R * 2 + 2;
  for (let iter = 0; iter < 120; iter++) {
    for (let a = 0; a < placed.length; a++) {
      for (let b = a + 1; b < placed.length; b++) {
        let dx = placed[b].px - placed[a].px;
        let dy = placed[b].py - placed[a].py;
        let d = Math.hypot(dx, dy);
        if (d === 0) {
          // identical coordinates: split along a fixed angle per pair
          const ang = ((a * 7 + b * 13) % 360) * (Math.PI / 180);
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          d = 1;
        }
        if (d < MIN_D) {
          const push = (MIN_D - d) / 2 / d;
          placed[a].px -= dx * push;
          placed[a].py -= dy * push;
          placed[b].px += dx * push;
          placed[b].py += dy * push;
        }
      }
    }
    for (const p of placed) {
      p.px = Math.min(Math.max(p.px, M.l + R), M.l + iw - R);
      p.py = Math.min(Math.max(p.py, M.t + R), M.t + ih - R);
    }
  }

  const xTicks = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3">
      <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Import-dependency map</h4>
      <p className="mb-2 mt-1 text-xs text-grey-600 dark:text-[var(--mh-muted)]">
        Every numbered bubble is an import dependency of EU manufacturing — the list alongside carries the
        full names, ordered by the product of the two axes. →right = more of EU demand is imported; ↑up =
        more concentrated in a single supplier; red = China is the largest supplier. The x-axis starts at
        50% — every entry shown is majority-imported.
      </p>
      <div className="grid gap-3 lg:grid-cols-[1fr_330px] lg:items-start">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label="Import-dependency map">
            {/* grid */}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line x1={x(t)} y1={M.t} x2={x(t)} y2={M.t + ih} stroke="var(--mh-border)" />
                <text x={x(t)} y={M.t + ih + 16} textAnchor="middle" fontSize={9} className="fill-grey-400 dark:fill-[var(--mh-muted)]">
                  {(t * 100).toFixed(0)}%
                </text>
              </g>
            ))}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.l} y1={y(t)} x2={M.l + iw} y2={y(t)} stroke="var(--mh-border)" />
                <text x={M.l - 8} y={y(t) + 3} textAnchor="end" fontSize={9} className="fill-grey-400 dark:fill-[var(--mh-muted)]">
                  {(t * 100).toFixed(0)}%
                </text>
              </g>
            ))}
            {/* axis titles */}
            <text x={M.l + iw / 2} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-grey-600 dark:fill-[var(--mh-muted)]">
              Import reliance — share of EU demand met by imports →
            </text>
            <text transform={`rotate(-90 14 ${M.t + ih / 2})`} x={14} y={M.t + ih / 2} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-grey-600 dark:fill-[var(--mh-muted)]">
              Supplier concentration — largest single supplier ↑
            </text>

            {placed.map((h) => {
              const china = isChina(h.supplier);
              const active = hover === h.n;
              const dim = hover !== null && !active;
              return (
                <g
                  key={h.label}
                  onMouseEnter={() => setHover(h.n)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'default' }}
                  opacity={dim ? 0.25 : 1}
                >
                  <circle
                    cx={h.px}
                    cy={h.py}
                    r={active ? R + 2 : R}
                    fill={china ? '#B83230' : '#004B7F'}
                    stroke="var(--mh-card)"
                    strokeWidth={1.5}
                  >
                    <title>{`${h.label} — ${h.supplier}: reliance ${(h.importReliance * 100).toFixed(0)}%, concentration ${(h.supplierConcentration * 100).toFixed(0)}% (${h.naceDivision})`}</title>
                  </circle>
                  <text x={h.px} y={h.py + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff" pointerEvents="none">
                    {h.n}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* linked, ordered list — the labels live here, never on the plot */}
        <ol className="space-y-0.5 text-[11px]">
          {placed.map((h) => {
            const china = isChina(h.supplier);
            const active = hover === h.n;
            return (
              <li
                key={h.label}
                onMouseEnter={() => setHover(h.n)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-2 rounded px-1.5 py-[3px] transition ${
                  active ? 'bg-surface-blue dark:bg-primary/15' : hover !== null ? 'opacity-40' : ''
                }`}
              >
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: china ? '#B83230' : '#004B7F' }}
                >
                  {h.n}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-grey-800 dark:text-[var(--mh-fg)]">{h.label}</span>{' '}
                  <span className="text-grey-500 dark:text-[var(--mh-muted)]">· {h.supplier}</span>
                </span>
                <span className="shrink-0 tabular-nums text-grey-500 dark:text-[var(--mh-muted)]" title="import reliance / supplier concentration">
                  {(h.importReliance * 100).toFixed(0)}/{(h.supplierConcentration * 100).toFixed(0)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-red" /> China largest supplier
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> Other largest supplier
        </span>
        <span>
          List shows reliance/concentration in %; ordering is the product of the two values (a display
          ordering, not a rating). Overlapping bubbles are nudged apart for legibility — exact values in the
          list and tooltips. x-axis: EC import reliance, IR = (M−X)/(P+M−X); y-axis: largest
          supplier&apos;s share of EU supply (concentration proxy). Curated from EC/JRC sources — definitions
          &amp; caveats in Methodology.
        </span>
      </div>
    </div>
  );
}
