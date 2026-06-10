'use client';

/**
 * EU Transition Panorama — beta module body.
 *
 * Recreates the design language of the Swedish Panorama tool
 * (panorama-sweden.com, Klimatpolitiska rådet / Naturvårdsverket /
 * Energimyndigheten) for the EU:
 *
 *   - an animated, zoomable radial panorama of sectors and subsectors
 *     (PanoramaSunburst);
 *   - a detail panel per node: latest emissions, trend since 2005 with the
 *     2030 / 2040 / 2050 benchmarks, and the transition levers tracked by
 *     the progress report;
 *   - an animated pathway chart from 2005 emissions to 2050 climate
 *     neutrality with the AR6-based 2040 advice corridor.
 *
 * Data: `src/data/transition-panorama.ts` (see provenance note there).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import PanoramaSunburst from '@/components/charts/PanoramaSunburst';
import {
  DATA_SOURCES,
  EU_1990_BASE_MT,
  LEVER_STATUS_META,
  PANORAMA_SECTORS,
  PanoramaBenchmark,
  PanoramaNode,
  TOTAL_PATHWAY,
  findNode,
  latestValue,
} from '@/data/transition-panorama';
import { ESABCC } from '@/lib/esabcc-palette';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Animated count-up for headline numbers. */
function useCountUp(target: number, decimals = 0, duration = 1100): string {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const u = Math.min((now - start) / duration, 1);
      setValue(target * d3.easeCubicOut(u));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** True once the element has scrolled into view (one-shot). */
function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);
  return [ref, inView];
}

function fmt(v: number, decimals = 0): string {
  const s = Math.abs(v).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `−${s}` : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini trend chart (detail panel)
// ─────────────────────────────────────────────────────────────────────────────

function MiniTrendChart({ node, color }: { node: PanoramaNode; color: string }) {
  const reduced = usePrefersReducedMotion();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(false);
    const t = window.setTimeout(() => setDrawn(true), 30);
    return () => window.clearTimeout(t);
  }, [node.id]);

  const W = 380;
  const H = 200;
  const M = { top: 14, right: 14, bottom: 26, left: 44 };

  const benchmarks = node.benchmarks ?? [];
  const lastYear = benchmarks.length > 0 ? 2050 : latestValue(node).year;
  const x = d3.scaleLinear().domain([2005, lastYear]).range([M.left, W - M.right]);

  const yValues = [
    0,
    ...node.series.map(p => p.value),
    ...benchmarks.flatMap(b => [b.low, b.high ?? b.low]),
  ];
  const y = d3
    .scaleLinear()
    .domain([Math.min(...yValues), Math.max(...yValues)])
    .nice()
    .range([H - M.bottom, M.top]);

  const line = d3
    .line<{ year: number; value: number }>()
    .x(p => x(p.year))
    .y(p => y(p.value));
  const area = d3
    .area<{ year: number; value: number }>()
    .x(p => x(p.year))
    .y0(y(0))
    .y1(p => y(p.value));

  const xTicks = lastYear === 2050 ? [2005, 2020, 2030, 2040, 2050] : [2005, 2010, 2015, 2020];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={`Emissions trend for ${node.name} with 2030, 2040 and 2050 benchmarks`}>
      {/* zero line */}
      <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="#c8cacc" strokeWidth={1} />
      {/* y extent labels */}
      {y.ticks(4).map(t => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#eceded" strokeWidth={1} />
          <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={9.5} fill="#8a929a">
            {fmt(t)}
          </text>
        </g>
      ))}
      {xTicks.map(t => (
        <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={9.5} fill="#8a929a">
          {t}
        </text>
      ))}

      <path
        d={area(node.series) ?? undefined}
        fill={color}
        style={{
          opacity: drawn || reduced ? 0.13 : 0,
          transition: reduced ? undefined : 'opacity 700ms var(--mh-ease-standard) 350ms',
        }}
      />
      <path
        d={line(node.series) ?? undefined}
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: drawn || reduced ? 0 : 1,
          transition: reduced ? undefined : 'stroke-dashoffset 900ms var(--mh-ease-standard)',
        }}
      />

      {/* benchmark capsules */}
      {benchmarks.map(b => {
        const yTop = y(Math.max(b.low, b.high ?? b.low));
        const yBot = y(Math.min(b.low, b.high ?? b.low));
        const h = Math.max(yBot - yTop, 7);
        return (
          <g
            key={b.year}
            style={{
              opacity: drawn || reduced ? 1 : 0,
              transition: reduced ? undefined : 'opacity 500ms var(--mh-ease-standard) 600ms',
            }}
          >
            <rect
              x={x(b.year) - 3.5}
              y={yTop - (h === 7 ? 3.5 : 0)}
              width={7}
              height={h}
              rx={3.5}
              fill="#2c2d2d"
              opacity={0.8}
            >
              <title>{`${b.label}: ${fmt(b.low)}${b.high !== undefined ? ` to ${fmt(b.high)}` : ''} Mt CO₂e (${b.source})`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pathway-to-net-zero chart (bottom section)
// ─────────────────────────────────────────────────────────────────────────────

function PathwayChart() {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const draw = inView || reduced;

  const W = 960;
  const H = 340;
  const M = { top: 22, right: 130, bottom: 34, left: 58 };

  const x = d3.scaleLinear().domain([2005, 2050]).range([M.left, W - M.right]);
  const y = d3.scaleLinear().domain([0, 4600]).range([H - M.bottom, M.top]);

  const line = d3
    .line<{ year: number; value: number }>()
    .x(p => x(p.year))
    .y(p => y(p.value));

  const targets = TOTAL_PATHWAY.targets;
  const t2030 = targets.find(t => t.year === 2030) as PanoramaBenchmark;
  const t2040 = targets.find(t => t.year === 2040) as PanoramaBenchmark;
  const t2050 = targets.find(t => t.year === 2050) as PanoramaBenchmark;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="EU total net greenhouse-gas emissions 2005 to 2050: historical data, Member State projections and the targets of the European Climate Law including the 2040 advice range">
        {y.ticks(5).map(t => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#9aa0a6' : '#eceded'} strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8a929a">
              {t.toLocaleString('en-GB')}
            </text>
          </g>
        ))}
        {[2005, 2010, 2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050].map(t => (
          <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize={11} fill="#8a929a">
            {t}
          </text>
        ))}
        <text x={M.left - 8} y={M.top - 8} textAnchor="end" fontSize={10} fill="#8a929a">
          Mt CO₂e
        </text>

        {/* historical */}
        <path
          d={line(TOTAL_PATHWAY.historical) ?? undefined}
          fill="none"
          stroke={ESABCC.almostBlack}
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: draw ? 0 : 1,
            transition: reduced ? undefined : 'stroke-dashoffset 1200ms var(--mh-ease-standard)',
          }}
        />
        {/* WAM projections */}
        <path
          d={line(TOTAL_PATHWAY.wam) ?? undefined}
          fill="none"
          stroke={ESABCC.signature}
          strokeWidth={2}
          strokeDasharray="6 5"
          style={{
            opacity: draw ? 1 : 0,
            transition: reduced ? undefined : 'opacity 600ms var(--mh-ease-standard) 1100ms',
          }}
        />

        {/* targets */}
        <g
          style={{
            opacity: draw ? 1 : 0,
            transition: reduced ? undefined : 'opacity 600ms var(--mh-ease-standard) 1500ms',
          }}
        >
          {/* 2030 −55 % */}
          <circle cx={x(2030)} cy={y(t2030.low)} r={6} fill={ESABCC.seaBlue} />
          <text x={x(2030) - 11} y={y(t2030.low)} dy="0.32em" textAnchor="end" fontSize={11.5} fill={ESABCC.seaBlue} fontWeight={600}>
            −55 % (2030)
          </text>

          {/* 2040 advice corridor */}
          <rect
            x={x(2040) - 7}
            y={y(t2040.high!)}
            width={14}
            height={y(t2040.low) - y(t2040.high!)}
            rx={7}
            fill={ESABCC.signalOrange}
            opacity={0.85}
          >
            <title>{t2040.label}</title>
          </rect>
          <text x={x(2040) + 13} y={y((t2040.low + t2040.high!) / 2) - 7} fontSize={11.5} fill={ESABCC.signalOrange} fontWeight={600}>
            2040 advice range
          </text>
          <text x={x(2040) + 13} y={y((t2040.low + t2040.high!) / 2) + 7} fontSize={10.5} fill="#8a929a">
            −90 to −95 % vs 1990
          </text>

          {/* 2050 net zero */}
          <circle cx={x(2050)} cy={y(0)} r={6} fill={ESABCC.forestGreen} />
          <text x={x(2050) + 11} y={y(0) - 4} fontSize={11.5} fill={ESABCC.forestGreen} fontWeight={600}>
            Climate neutrality
          </text>
          <text x={x(2050) + 11} y={y(0) + 9} fontSize={10.5} fill="#8a929a">
            2050, net zero
          </text>
        </g>

        {/* legend */}
        <g transform={`translate(${M.left + 8}, ${M.top + 4})`} fontSize={11} fill="#3D5265">
          <line x1={0} x2={26} y1={4} y2={4} stroke={ESABCC.almostBlack} strokeWidth={2.5} />
          <text x={32} y={8}>Historical net emissions (EEA)</text>
          <line x1={0} x2={26} y1={24} y2={24} stroke={ESABCC.signature} strokeWidth={2} strokeDasharray="6 5" />
          <text x={32} y={28}>Member State projections (WAM)</text>
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────────────────────

function DetailPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const found = findNode(selectedId);

  if (!found) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-tertiary-dark">How to read the panorama</h3>
        <p className="text-[12.5px] text-tertiary leading-relaxed">
          Each arc is sized by its latest net emissions. The inner ring shows the seven
          sectors of the European Climate Law scope; the outer ring shows their subsectors.
          Hatched arcs are <strong>net removals</strong> (the LULUCF sink). Click a sector
          to open its panorama, or any arc to see its trend, benchmarks and transition levers.
        </p>
        <ul className="space-y-1.5">
          {PANORAMA_SECTORS.map(s => {
            const latest = latestValue(s);
            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded border border-grey-200 hover:border-grey-300 hover:bg-grey-50 transition text-left"
                >
                  <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-[12.5px] font-medium text-tertiary-dark">{s.name}</span>
                  <span className="text-[12px] text-tertiary tabular-nums">
                    {fmt(latest.value)} Mt
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const { node, parent } = found;
  const color = parent?.color ?? node.color;
  const latest = latestValue(node);
  const first = node.series[0];
  const changePct = ((latest.value - first.value) / Math.abs(first.value)) * 100;

  return (
    <div key={node.id} className="space-y-4 panorama-panel-enter">
      <div>
        {parent && (
          <button
            onClick={() => onSelect(parent.id)}
            className="text-[11px] text-primary hover:underline mb-1 inline-flex items-center gap-1"
          >
            ← {parent.name}
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-base font-bold text-tertiary-dark leading-snug">{node.name}</h3>
        </div>
        {node.note && (
          <p className="mt-1.5 text-[11.5px] text-tertiary leading-relaxed">{node.note}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-grey-50 rounded p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-tertiary">
            {node.isSink ? `Net removals ${latest.year}` : `Emissions ${latest.year}`}
          </div>
          <div className="text-lg font-bold text-tertiary-dark tabular-nums">
            {fmt(latest.value, latest.value !== Math.round(latest.value) ? 1 : 0)}
            <span className="text-[11px] font-medium text-tertiary ml-1">Mt CO₂e</span>
          </div>
        </div>
        <div className="bg-grey-50 rounded p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-tertiary">Change since 2005</div>
          <div
            className="text-lg font-bold tabular-nums"
            style={{
              color:
                (node.isSink ? changePct < 0 : changePct > 0)
                  ? ESABCC.red
                  : ESABCC.forestGreen,
            }}
          >
            {changePct >= 0 ? '+' : '−'}
            {Math.abs(changePct).toFixed(0)} %
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <h4 className="text-[11px] uppercase tracking-wide text-tertiary">
            Trend and benchmarks
          </h4>
          {(node.benchmarks?.length ?? 0) > 0 && (
            <span className="text-[10px] text-tertiary">▮ = 2030 / 2040 / 2050 benchmark</span>
          )}
        </div>
        <MiniTrendChart node={node} color={color} />
        {node.benchmarks && (
          <ul className="mt-1.5 space-y-1">
            {node.benchmarks.map(b => (
              <li key={b.year} className="text-[11px] text-tertiary leading-snug">
                <span className="font-semibold text-tertiary-dark">{b.year}:</span>{' '}
                {fmt(b.low)}
                {b.high !== undefined && ` to ${fmt(b.high)}`} Mt CO₂e — {b.label}
                <span className="opacity-70"> ({b.source.split(' — ')[0].split(';')[0]})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {node.levers && node.levers.length > 0 && (
        <div>
          <h4 className="text-[11px] uppercase tracking-wide text-tertiary mb-1.5">
            Transition levers <span className="normal-case">(progress-report indicators)</span>
          </h4>
          <ul className="space-y-2">
            {node.levers.map(lever => {
              const meta = LEVER_STATUS_META[lever.status];
              return (
                <li key={lever.id} className="border border-grey-200 rounded p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-tertiary bg-grey-50 border border-grey-200 rounded-sm px-1 py-0.5">
                      {lever.id}
                    </span>
                    <span className="flex-1 text-[12px] font-semibold text-tertiary-dark leading-snug">
                      {lever.name}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-tertiary leading-snug">{lever.note}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[10.5px] text-tertiary/80 leading-snug">
            Statuses are indicative summaries of the assessments in the Advisory Board&apos;s
            progress report <em>Towards EU climate neutrality</em> (2024).
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Module body
// ─────────────────────────────────────────────────────────────────────────────

export default function TransitionPanorama() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const headline = useMemo(() => {
    // Official ECL-scope total (report Figure 4) — the sector sum differs
    // slightly because of scope differences in the sectoral figures.
    const last = TOTAL_PATHWAY.historical[TOTAL_PATHWAY.historical.length - 1];
    const vs1990 = (1 - last.value / EU_1990_BASE_MT) * 100;
    return { total: last.value, year: last.year, vs1990 };
  }, []);

  const totalText = useCountUp(headline.total);
  const vs1990Text = useCountUp(headline.vs1990);
  const sinkText = useCountUp(Math.abs(latestValue(PANORAMA_SECTORS.find(s => s.id === 'lulucf')!).value));

  return (
    <div className="space-y-10">
      {/* Headline stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeadlineCard
          label={`Net emissions ${headline.year}`}
          value={totalText}
          unit="Mt CO₂e"
          sub="European Climate Law scope, EU-27"
        />
        <HeadlineCard
          label="Reduction vs 1990"
          value={`−${vs1990Text}`}
          unit="%"
          sub="2030 target: −55 % · 2040 advice: −90 to −95 %"
        />
        <HeadlineCard
          label="LULUCF net sink"
          value={`−${sinkText}`}
          unit="Mt CO₂e"
          sub="Weakened by roughly a third since 2005"
        />
        <HeadlineCard
          label="2030–2050 GHG budget"
          value="11–14"
          unit="Gt CO₂e"
          sub="Advisory Board recommendation, AR6-based pathways"
        />
      </section>

      {/* Panorama + detail panel */}
      <section className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        <div>
          <PanoramaSunburst selectedId={selectedId} onSelect={setSelectedId} />
          <div className="mt-2 flex items-center justify-center gap-4 text-[10.5px] text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ESABCC.signature }} />
              Net emissions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ESABCC.forestGreen,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 2px, transparent 2px 6px)',
                }}
              />
              Net removals (sink)
            </span>
            <span>Subsector splits: latest reported year (2021)</span>
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 bg-white border border-grey-200 rounded-lg p-4 sm:p-5 min-h-[420px]">
          <DetailPanel selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
      </section>

      {/* Pathway to net zero */}
      <section>
        <h2 className="text-lg font-semibold text-tertiary-dark">
          The pathway to climate neutrality
        </h2>
        <p className="mt-1 mb-4 max-w-3xl text-[12.5px] text-tertiary leading-relaxed">
          Total EU net greenhouse-gas emissions against the targets of the European Climate
          Law. The 2040 corridor is the Advisory Board&apos;s recommended target range,
          derived from 1.5&nbsp;°C-compatible EU pathways assessed in the IPCC AR6 scenario
          database. Current Member State projections (dashed) leave a substantial gap to
          all three milestones.
        </p>
        <PathwayChart />
      </section>

      {/* Sources */}
      <section className="border-t border-grey-200 pt-5">
        <h2 className="text-[11px] uppercase tracking-wide text-tertiary mb-2">Data sources</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {DATA_SOURCES.map(s => (
            <div key={s.label}>
              <dt className="text-[11.5px] font-semibold text-tertiary-dark">{s.label}</dt>
              <dd className="text-[11.5px] text-tertiary leading-snug">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-tertiary/80 leading-relaxed max-w-3xl">
          Design inspired by{' '}
          <a href="https://panorama-sweden.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Panorama
          </a>
          , the visualisation of Sweden&apos;s climate transition by the Swedish Climate Policy
          Council, the Swedish EPA and the Swedish Energy Agency. Scenario benchmarks will be
          updated to the AR7 scenario database when it becomes available.
        </p>
      </section>

      <style jsx global>{`
        .panorama-panel-enter {
          animation: panorama-panel-in var(--mh-duration-base, 240ms) var(--mh-ease-decelerated, ease-out);
        }
        @keyframes panorama-panel-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .panorama-panel-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function HeadlineCard({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-grey-200 border-l-4 border-l-primary rounded p-3">
      <div className="text-[11px] uppercase tracking-wide text-tertiary">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-tertiary-dark tabular-nums">
        {value}
        <span className="ml-1 text-[12px] font-medium text-tertiary">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] text-tertiary leading-tight">{sub}</div>
    </div>
  );
}
