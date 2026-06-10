'use client';

/**
 * Transition Stories — a cinematic, scroll-driven data essay on the EU's
 * path to climate neutrality.
 *
 * Design goals: real photography (extracted from the covers of the
 * Advisory Board's own reports — no icons, no clip-art), editorial
 * typography, and scroll-driven motion: a pathway chart that draws itself
 * as the reader scrolls and forks into two futures, full-bleed parallax
 * chapters, ticking counters, 3D-tilting photo cards and a film-grain
 * finish.
 *
 * Every number is real: EEA emissions history, Member State WAM
 * projections, the European Climate Law targets and the ESABCC 2040
 * advice corridor, sectoral series, benchmarks and transition levers from
 * `src/data/transition-panorama.ts`.
 *
 * All motion is suppressed under `prefers-reduced-motion`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import {
  EU_1990_BASE_MT,
  LEVER_STATUS_META,
  PANORAMA_SECTORS,
  PanoramaNode,
  TOTAL_PATHWAY,
} from '@/data/transition-panorama';

// ─────────────────────────────────────────────────────────────────────────────
// Shared hooks & helpers
// ─────────────────────────────────────────────────────────────────────────────

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

/** One-shot: true once the element enters the viewport. */
function useInView<T extends Element>(threshold = 0.3): [React.RefObject<T>, boolean] {
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
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, threshold]);
  return [ref, inView];
}

/** Animated count-up that starts when `start` flips true. */
function useCountUp(target: number, start: boolean, decimals = 0, duration = 1400): string {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min((now - t0) / duration, 1);
      setValue(target * d3.easeCubicOut(u));
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration, reduced]);
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Scroll progress (0..1) of a tall section as it passes the viewport. */
function useScrollProgress<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      setP(Math.min(1, Math.max(0, -rect.top / Math.max(total, 1))));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return [ref, p];
}

/** Slow vertical parallax applied directly to a ref'd element. */
function useParallax<T extends HTMLElement>(speed = 0.18): React.RefObject<T> {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el || !el.parentElement) return;
        const rect = el.parentElement.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = `translateY(${offset.toFixed(1)}px) scale(1.18)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed, reduced]);
  return ref;
}

function fmt(v: number, decimals = 0): string {
  const s = Math.abs(v).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `−${s}` : s;
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

function Grain() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
      style={{ backgroundImage: GRAIN }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 1 — Hero
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  const latest = TOTAL_PATHWAY.historical[TOTAL_PATHWAY.historical.length - 1];
  const vs1990 = (1 - latest.value / EU_1990_BASE_MT) * 100;
  const totalText = useCountUp(latest.value, inView);
  const vsText = useCountUp(vs1990, inView, 0);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[#0c1117]">
      <img
        src="/essay/hero-arctic.jpg"
        alt="Aerial photograph of fragmenting arctic sea ice"
        className="absolute inset-0 w-full h-full object-cover essay-kenburns"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1117]/55 via-[#0c1117]/25 to-[#0c1117]" />
      <Grain />

      <div className="relative h-full max-w-[1180px] mx-auto px-6 flex flex-col justify-end pb-[12vh]">
        <p className="essay-rise text-[12px] tracking-[0.34em] uppercase text-[#9fd8d5] font-semibold">
          A cinematic data briefing · ESABCC MethodHub
        </p>
        <h1
          className="essay-rise mt-4 font-bold text-white leading-[0.98] tracking-tight"
          style={{ fontSize: 'clamp(44px, 8.2vw, 108px)', animationDelay: '120ms' }}
        >
          The Transition,
          <br />
          in&nbsp;Focus.
        </h1>
        <p
          className="essay-rise mt-5 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-white/80"
          style={{ animationDelay: '240ms' }}
        >
          Where the European Union&apos;s emissions stand, where its laws say they must go,
          and how narrow the corridor to climate neutrality has become — told with the
          Advisory Board&apos;s own data and photography.
        </p>

        <div className="essay-rise mt-10 flex flex-wrap gap-x-12 gap-y-6" style={{ animationDelay: '360ms' }}>
          <div>
            <div className="text-[40px] sm:text-[52px] font-bold text-white tabular-nums leading-none">
              {totalText}
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase text-white/60">
              Mt CO₂e net emissions · {latest.year}
            </div>
          </div>
          <div>
            <div className="text-[40px] sm:text-[52px] font-bold text-[#9fd8d5] tabular-nums leading-none">
              −{vsText} %
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase text-white/60">
              vs 1990 · target −55 % by 2030
            </div>
          </div>
          <div>
            <div className="text-[40px] sm:text-[52px] font-bold text-[#f5905a] tabular-nums leading-none">
              2050
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase text-white/60">
              climate neutrality · European Climate Law
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/55">
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <span className="block w-px h-10 bg-white/40 overflow-hidden">
          <span className="block w-px h-4 bg-white essay-scrollcue" />
        </span>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 2 — The pathway, drawn by scroll, forking into two futures
// ─────────────────────────────────────────────────────────────────────────────

const CW = 1100;
const CH = 560;
const CM = { top: 60, right: 200, bottom: 56, left: 86 };

function PathwayScrolly() {
  const reduced = usePrefersReducedMotion();
  const [ref, p] = useScrollProgress<HTMLDivElement>();
  const progress = reduced ? 1 : p;

  const x = useMemo(() => d3.scaleLinear().domain([2005, 2050]).range([CM.left, CW - CM.right]), []);
  const y = useMemo(() => d3.scaleLinear().domain([0, 4600]).range([CH - CM.bottom, CM.top]), []);

  const line = useMemo(
    () =>
      d3
        .line<{ year: number; value: number }>()
        .x(d => x(d.year))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX),
    [x, y],
  );

  const advicePath = useMemo(
    () => [
      { year: 2022, value: 3333.9 },
      { year: 2030, value: 2149.8 },
      { year: 2040, value: 358.5 },
      { year: 2050, value: 0 },
    ],
    [],
  );

  // Scroll choreography: 0–0.55 draws history, 0.55–1 grows the fork.
  const year = 2005 + Math.min(progress / 0.55, 1) * (2022 - 2005) + Math.max(0, (progress - 0.55) / 0.45) * (2050 - 2022);
  const fHist = Math.min(progress / 0.55, 1);
  const fFork = Math.max(0, Math.min((progress - 0.55) / 0.45, 1));

  const wamFuture = TOTAL_PATHWAY.wam.filter(d => d.year >= 2022);
  const t2040 = TOTAL_PATHWAY.targets.find(t => t.year === 2040)!;

  const ann = (visible: boolean) =>
    ({ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease' }) as React.CSSProperties;

  return (
    <section ref={ref} className="relative bg-[#0c1117]" style={{ height: '360vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <img
          src="/essay/pathway-road.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1117] via-transparent to-[#0c1117]" />
        <Grain />

        <div className="relative max-w-[1180px] w-full mx-auto px-6 pt-[7vh]">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#9fd8d5] font-semibold">Chapter 01</p>
          <h2 className="mt-2 text-white font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)' }}>
            One line, two futures.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/70">
            Net EU greenhouse-gas emissions since 2005 — and the fork after today:
            what Member States&apos; own projections deliver, against the corridor the
            Advisory Board derived from 1.5&nbsp;°C-compatible pathways.
          </p>
        </div>

        <div className="relative flex-1 max-w-[1180px] w-full mx-auto px-2 sm:px-6">
          <div
            className="absolute right-6 top-2 font-bold tabular-nums text-white/12 select-none leading-none"
            style={{ fontSize: 'clamp(80px, 13vw, 180px)' }}
            aria-hidden
          >
            {Math.round(year)}
          </div>

          <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-full" role="img"
            aria-label="EU net greenhouse-gas emissions 2005 to 2050: history, Member State projections and the Advisory Board's 2040 advice corridor">
            {y.ticks(4).map(t => (
              <g key={t}>
                <line x1={CM.left} x2={CW - CM.right} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={t === 0 ? 0.4 : 0.08} />
                <text x={CM.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="#8b97a3">
                  {t.toLocaleString('en-GB')}
                </text>
              </g>
            ))}
            {[2010, 2020, 2030, 2040, 2050].map(t => (
              <text key={t} x={x(t)} y={CH - 26} textAnchor="middle" fontSize={12} fill="#8b97a3">
                {t}
              </text>
            ))}
            <text x={CM.left - 10} y={CM.top - 22} textAnchor="end" fontSize={11} fill="#8b97a3">Mt CO₂e</text>

            {/* history draws with scroll */}
            <path
              d={line(TOTAL_PATHWAY.historical) ?? undefined}
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - fHist }}
            />

            {/* the fork */}
            <g style={{ opacity: fFork > 0 ? 1 : 0, transition: 'opacity 300ms ease' }}>
              <path
                d={line(wamFuture) ?? undefined}
                fill="none"
                stroke="#f5905a"
                strokeWidth={2.5}
                strokeDasharray="2 7"
                strokeLinecap="round"
                style={{ opacity: fFork }}
              />
              <path
                d={line(advicePath) ?? undefined}
                fill="none"
                stroke="#74CBC8"
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 - fFork }}
              />
            </g>

            {/* annotations */}
            <g style={ann(year >= 2009.5)}>
              <circle cx={x(2009)} cy={y(3940.7)} r={5} fill="#ffffff" />
              <text x={x(2009)} y={y(3940.7) - 36} textAnchor="middle" fontSize={12.5} fill="#cfd8e0" fontWeight={600}>financial crisis</text>
              <text x={x(2009)} y={y(3940.7) - 20} textAnchor="middle" fontSize={11} fill="#8b97a3">−8 % in one year</text>
            </g>
            <g style={ann(year >= 2020.4)}>
              <circle cx={x(2020)} cy={y(3195.8)} r={5} fill="#ffffff" />
              <text x={x(2020)} y={y(3195.8) + 30} textAnchor="middle" fontSize={12.5} fill="#cfd8e0" fontWeight={600}>COVID-19</text>
              <text x={x(2020)} y={y(3195.8) + 46} textAnchor="middle" fontSize={11} fill="#8b97a3">…then the rebound</text>
            </g>
            <g style={ann(fHist >= 1)}>
              <circle cx={x(2022)} cy={y(3333.9)} r={6} fill="#ffffff" />
              <text x={x(2022) + 14} y={y(3333.9) - 8} fontSize={12.5} fill="#ffffff" fontWeight={700}>2022 · 3,334 Mt</text>
              <text x={x(2022) + 14} y={y(3333.9) + 8} fontSize={11} fill="#8b97a3">latest inventory</text>
            </g>

            <g style={ann(year >= 2030 && fFork > 0)}>
              <circle cx={x(2030)} cy={y(2149.8)} r={6} fill="#ffffff" stroke="#74CBC8" strokeWidth={2.5} />
              <text x={x(2030)} y={y(2149.8) - 18} textAnchor="middle" fontSize={12.5} fill="#9fd8d5" fontWeight={700}>−55 % by 2030</text>
            </g>

            <g style={ann(year >= 2040 && fFork > 0)}>
              <rect
                x={x(2040) - 8}
                y={y(t2040.high!)}
                width={16}
                height={y(t2040.low) - y(t2040.high!)}
                rx={8}
                fill="#74CBC8"
                opacity={0.9}
              />
              <text x={x(2040) - 16} y={y((t2040.low + t2040.high!) / 2) - 6} textAnchor="end" fontSize={12.5} fill="#9fd8d5" fontWeight={700}>2040 advice corridor</text>
              <text x={x(2040) - 16} y={y((t2040.low + t2040.high!) / 2) + 10} textAnchor="end" fontSize={11} fill="#8b97a3">−90 to −95 % vs 1990</text>
            </g>

            <g style={ann(fFork >= 0.96)}>
              <text x={x(2050) + 12} y={y(1716.7)} dy="0.32em" fontSize={13} fill="#f5905a" fontWeight={700}>1,717 Mt</text>
              <text x={x(2050) + 12} y={y(1716.7) + 17} fontSize={11} fill="#8b97a3">current projections</text>
              <circle cx={x(2050)} cy={y(0)} r={6} fill="#74CBC8" />
              <text x={x(2050) + 12} y={y(0) - 14} fontSize={13} fill="#9fd8d5" fontWeight={700}>net zero</text>
              <text x={x(2050) + 12} y={y(0) + 2} fontSize={11} fill="#8b97a3">the legal obligation</text>
            </g>
          </svg>
        </div>

        <div className="relative max-w-[1180px] w-full mx-auto px-6 pb-6">
          <div className="flex items-center gap-3 text-[11px] text-white/55" style={ann(fFork >= 0.96)}>
            <span className="inline-block w-7 border-t-2 border-[#f5905a] border-dashed" /> Member State projections (WAM)
            <span className="inline-block w-7 border-t-2 border-[#74CBC8] ml-4" /> ESABCC 2040 advice pathway
            <span className="ml-auto hidden sm:inline">The gap in 2050: <strong className="text-[#f5905a]">1,717 Mt CO₂e</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 3 — Sector ledger
// ─────────────────────────────────────────────────────────────────────────────

function Spark({ node, color, draw }: { node: PanoramaNode; color: string; draw: boolean }) {
  const w = 220;
  const h = 46;
  const xs = d3.scaleLinear().domain(d3.extent(node.series, d => d.year) as [number, number]).range([2, w - 2]);
  const ys = d3
    .scaleLinear()
    .domain([Math.min(0, d3.min(node.series, d => d.value) ?? 0), Math.max(0, d3.max(node.series, d => d.value) ?? 0)])
    .range([h - 4, 4]);
  const l = d3
    .line<{ year: number; value: number }>()
    .x(d => xs(d.year))
    .y(d => ys(d.value))
    .curve(d3.curveMonotoneX);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[150px] sm:w-[220px] h-auto shrink-0" aria-hidden>
      <line x1={0} x2={w} y1={ys(0)} y2={ys(0)} stroke="#ffffff" strokeOpacity={0.15} />
      <path
        d={l(node.series) ?? undefined}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: draw ? 0 : 1,
          transition: 'stroke-dashoffset 1100ms cubic-bezier(0.2,0,0,1) 150ms',
        }}
      />
    </svg>
  );
}

function SectorRow({ sector, maxAbs }: { sector: PanoramaNode; maxAbs: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.45);
  const [open, setOpen] = useState(false);
  const latest = sector.series[sector.series.length - 1];
  const first = sector.series[0];
  const change = ((latest.value - first.value) / Math.abs(first.value)) * 100;
  const valueText = useCountUp(Math.abs(latest.value), inView);
  const barPct = (Math.abs(latest.value) / maxAbs) * 100;
  const worse = sector.isSink ? change < 0 : change > 0;

  return (
    <div ref={ref} className="border-b border-white/10">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left py-6 sm:py-7 grid grid-cols-[minmax(0,1.2fr)_auto] sm:grid-cols-[220px_minmax(0,1fr)_auto_auto] items-center gap-x-6 gap-y-3 group"
        aria-expanded={open}
      >
        <div>
          <div className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight group-hover:text-[#9fd8d5] transition-colors">
            {sector.name}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
            {sector.isSink ? `net removals · ${latest.year}` : `net emissions · ${latest.year}`}
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="h-[6px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: inView ? `${barPct}%` : '0%',
                background: sector.color,
                transition: 'width 1100ms cubic-bezier(0.2,0,0,1) 150ms',
              }}
            />
          </div>
          <div className="mt-2.5 hidden lg:block">
            <Spark node={sector} color={sector.color} draw={inView} />
          </div>
        </div>

        <div className="text-right">
          <span className="text-[28px] sm:text-[34px] font-bold tabular-nums text-white leading-none">
            {sector.isSink ? '−' : ''}{valueText}
          </span>
          <span className="ml-1.5 text-[11px] text-white/50">Mt</span>
        </div>

        <div
          className="justify-self-end text-[12px] font-semibold tabular-nums px-2.5 py-1 rounded-full"
          style={{
            color: worse ? '#ff9a76' : '#9fd8d5',
            background: worse ? 'rgba(242,97,25,0.12)' : 'rgba(116,203,200,0.12)',
          }}
        >
          {change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(0)} % since 2005
        </div>
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{ maxHeight: open ? 420 : 0, opacity: open ? 1 : 0 }}
      >
        <div className="pb-7 grid sm:grid-cols-2 gap-x-10 gap-y-4">
          <div>
            <h4 className="text-[10.5px] tracking-[0.2em] uppercase text-white/45 mb-2">Benchmarks</h4>
            <ul className="space-y-1.5">
              {(sector.benchmarks ?? []).map(b => (
                <li key={b.year} className="text-[13px] text-white/75 leading-snug">
                  <span className="font-bold text-white tabular-nums">{b.year}</span>
                  {' · '}{fmt(b.low)}{b.high !== undefined ? ` to ${fmt(b.high)}` : ''} Mt — {b.label}
                </li>
              ))}
              {(sector.benchmarks ?? []).length === 0 && (
                <li className="text-[13px] text-white/50">Tracked at aggregate level only.</li>
              )}
            </ul>
            {sector.note && <p className="mt-3 text-[12px] text-white/50 leading-relaxed">{sector.note}</p>}
          </div>
          <div>
            <h4 className="text-[10.5px] tracking-[0.2em] uppercase text-white/45 mb-2">Transition levers</h4>
            <ul className="flex flex-wrap gap-2">
              {(sector.levers ?? []).map(lv => {
                const meta = LEVER_STATUS_META[lv.status];
                return (
                  <li
                    key={lv.id}
                    title={lv.note}
                    className="inline-flex items-center gap-2 text-[12px] text-white/80 border border-white/15 rounded-full px-3 py-1.5"
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: meta.color }} />
                    {lv.name}
                    <span className="text-white/40">· {meta.label}</span>
                  </li>
                );
              })}
              {(sector.levers ?? []).length === 0 && (
                <li className="text-[13px] text-white/50">—</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectorLedger() {
  const img = useParallax<HTMLImageElement>(0.14);
  const maxAbs = Math.max(...PANORAMA_SECTORS.map(s => Math.abs(s.series[s.series.length - 1].value)));
  return (
    <section className="bg-[#0c1117]">
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden">
        <img
          ref={img}
          src="/essay/sectors-rail.jpg"
          alt="Aerial photograph of a railway line crossing dense forest"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1117]/70 via-[#0c1117]/20 to-[#0c1117]" />
        <Grain />
        <div className="relative h-full max-w-[1180px] mx-auto px-6 flex flex-col justify-end pb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#9fd8d5] font-semibold">Chapter 02</p>
          <h2 className="mt-2 text-white font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)' }}>
            Where the emissions live.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/70">
            Seven sectors carry the European Climate Law scope. Select any of them
            for its benchmarks and the levers the progress report tracks.
          </p>
        </div>
      </div>
      <div className="max-w-[1180px] mx-auto px-6 pb-16">
        {PANORAMA_SECTORS.map(s => (
          <SectorRow key={s.id} sector={s} maxAbs={maxAbs} />
        ))}
        <p className="mt-4 text-[11px] text-white/40">
          EEA GHG data viewer via the ESABCC progress-report workbook · lever statuses are indicative
          summaries of the 2024 progress report.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 4 — The stakes (tilting photo cards)
// ─────────────────────────────────────────────────────────────────────────────

function TiltCard({
  src,
  alt,
  kicker,
  title,
  body,
}: {
  src: string;
  alt: string;
  kicker: string;
  title: string;
  body: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [refIn, inView] = useInView<HTMLDivElement>(0.3);

  function onMove(e: React.PointerEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    ref.current.style.transform = `perspective(900px) rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 7).toFixed(2)}deg) scale(1.015)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale(1)';
  }

  return (
    <div ref={refIn} className={inView ? 'essay-rise' : 'opacity-0'}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative rounded-2xl overflow-hidden h-[420px] sm:h-[480px] transition-transform duration-200 ease-out will-change-transform shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
      >
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1117]/95 via-[#0c1117]/25 to-transparent" />
        <Grain />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-[10.5px] tracking-[0.28em] uppercase text-[#9fd8d5] font-semibold">{kicker}</p>
          <h3 className="mt-2 text-white font-bold tracking-tight text-[24px] sm:text-[28px] leading-tight">{title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/75 max-w-md">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Stakes() {
  const [ref, inView] = useInView<HTMLDivElement>(0.25);
  const cumHist = TOTAL_PATHWAY.historical.reduce((a, d) => a + d.value, 0) / 1000;
  const cumText = useCountUp(cumHist, inView, 1);
  return (
    <section className="bg-[#0c1117] py-20 sm:py-28">
      <div className="max-w-[1180px] mx-auto px-6">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#9fd8d5] font-semibold">Chapter 03</p>
        <h2 className="mt-2 text-white font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)' }}>
          What is at stake.
        </h2>
        <div ref={ref} className="mt-4 flex flex-wrap items-baseline gap-x-3">
          <span className="text-[46px] sm:text-[64px] font-bold tabular-nums text-[#f5905a] leading-none">{cumText}</span>
          <span className="text-[14px] text-white/65 max-w-md leading-snug">
            Gt CO₂e emitted by the EU since 2005 — against a recommended budget of just{' '}
            <strong className="text-white">11–14 Gt for 2030–2050</strong>.
          </span>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-6 lg:gap-8">
          <TiltCard
            src="/essay/stakes-wildfire.jpg"
            alt="Firefighters working at the edge of a wildfire at night"
            kicker="From the 2026 adaptation report"
            title="Risks arrive faster than plans."
            body="Europe is the fastest-warming continent. The Advisory Board's adaptation work finds preparedness lagging the hazards already materialising — heat, drought and fire among them."
          />
          <TiltCard
            src="/essay/stakes-flood.jpg"
            alt="Flooded maize field after heavy rain"
            kicker="From the 2026 agri-food report"
            title="The land feels it first."
            body="Agricultural emissions have fallen only 5 % since 2005 while floods and droughts increasingly hit yields — the agri-food system is both a driver and a casualty of climate change."
          />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 5 — The weakening sink
// ─────────────────────────────────────────────────────────────────────────────

function Sink() {
  const img = useParallax<HTMLImageElement>(0.12);
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const lulucf = PANORAMA_SECTORS.find(s => s.id === 'lulucf')!;
  const latest = lulucf.series[lulucf.series.length - 1];
  const sinkText = useCountUp(Math.abs(latest.value), inView);

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-[#0c1117] flex items-end">
      <img
        ref={img}
        src="/essay/sink-rivers.jpg"
        alt="Aerial photograph of rivers braiding through green wetland"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1117]/75 via-[#0c1117]/15 to-[#0c1117]/95" />
      <Grain />
      <div ref={ref} className="relative max-w-[1180px] w-full mx-auto px-6 pb-16 pt-[30vh]">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#9fd8d5] font-semibold">Chapter 04</p>
        <h2 className="mt-2 text-white font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)' }}>
          The sink is thinning.
        </h2>
        <div className="mt-6 grid lg:grid-cols-[auto_minmax(0,1fr)] gap-x-14 gap-y-6 items-end">
          <div>
            <div className="text-[52px] sm:text-[68px] font-bold tabular-nums text-[#9fd8d5] leading-none">
              −{sinkText}
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase text-white/60">
              Mt CO₂e removed by land & forests · {latest.year}
            </div>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/75">
              Europe&apos;s forests offset part of every other sector — but the net sink has
              weakened by roughly a third since 2005, while the 2030 target requires
              <strong className="text-white"> −310 Mt</strong> and the pathways assume more.
              Every megatonne the land stops absorbing must be cut somewhere else.
            </p>
          </div>
          <div className="max-w-[420px] w-full">
            <Spark node={lulucf} color="#9fd8d5" draw={inView} />
            <div className="flex justify-between text-[10px] text-white/45 mt-1 w-[150px] sm:w-[220px]">
              <span>2005</span>
              <span>{latest.year}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 6 — Closing + credits
// ─────────────────────────────────────────────────────────────────────────────

function Closing() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <section className="bg-[#0c1117] pb-10">
      <div className="relative overflow-hidden">
        <img
          src="/essay/closing-industry.jpg"
          alt="Industrial processing facility photographed at night"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1117] via-transparent to-[#0c1117]" />
        <Grain />
        <div ref={ref} className={`relative max-w-[1180px] mx-auto px-6 py-24 sm:py-32 ${inView ? 'essay-rise' : 'opacity-0'}`}>
          <h2 className="text-white font-bold tracking-tight leading-[1.02] max-w-3xl" style={{ fontSize: 'clamp(34px, 5.4vw, 64px)' }}>
            The corridor is narrow —<br />
            <span className="text-[#9fd8d5]">but it is still open.</span>
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              ['2030', '−55 % vs 1990', 'European Climate Law'],
              ['2040', '−90 to −95 %', 'ESABCC advice, AR6-based'],
              ['2050', 'net zero', 'the legal obligation'],
            ].map(([y, v, s]) => (
              <div key={y} className="border border-white/15 rounded-xl px-5 py-4 bg-white/[0.04] backdrop-blur-[2px]">
                <div className="text-[12px] text-white/50 tabular-nums">{y}</div>
                <div className="text-[20px] font-bold text-white">{v}</div>
                <div className="text-[10.5px] text-white/45 mt-0.5">{s}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/beta/transition-panorama"
              className="inline-flex items-center gap-2 rounded-full bg-[#74CBC8] text-[#0c1117] font-semibold text-[13px] px-5 py-2.5 hover:bg-[#9fd8d5] transition-colors"
            >
              Explore the data in the Transition Panorama →
            </Link>
            <Link
              href="/scenarios"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 text-white font-semibold text-[13px] px-5 py-2.5 hover:border-white/60 transition-colors"
            >
              Open the Scenario Explorer
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-6 pt-10 border-t border-white/10">
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
          <div>
            <h3 className="text-[10.5px] tracking-[0.2em] uppercase text-white/45 mb-2">Data</h3>
            <p className="text-[12px] text-white/60 leading-relaxed">
              EEA GHG data viewer (history, 2022 partly proxy); Member States&apos; WAM projections
              reported to the EEA; European Climate Law targets; ESABCC (2023) 2040-target advice —
              1.5&nbsp;°C-compatible EU pathways assessed from the IPCC AR6 scenario database. All series
              from the progress-report underlying-data workbook in this repository.
            </p>
          </div>
          <div>
            <h3 className="text-[10.5px] tracking-[0.2em] uppercase text-white/45 mb-2">Photography</h3>
            <p className="text-[12px] text-white/60 leading-relaxed">
              All imagery is taken from the published covers of ESABCC reports: the European Climate
              Law advice (2025), the 2040 climate target advice (2023), <em>Towards EU climate
              neutrality</em> (2024), the adaptation report (2026), the EU agri-food system report
              (2026), the EU energy infrastructure report (2023) and the carbon dioxide removals
              report (2025).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Essay shell
// ─────────────────────────────────────────────────────────────────────────────

export default function TransitionStories() {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reading-progress bar across the whole essay.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrap = wrapRef.current;
        const bar = barRef.current;
        if (!wrap || !bar) return;
        const rect = wrap.getBoundingClientRect();
        const total = wrap.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
        bar.style.width = `${(p * 100).toFixed(2)}%`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="bg-[#0c1117]">
      <div className="sticky top-0 z-40 h-[3px] bg-white/10">
        <div
          ref={barRef}
          className="h-full w-0"
          style={{ background: 'linear-gradient(90deg, #74CBC8, #f5905a)' }}
        />
      </div>

      <Hero />
      <PathwayScrolly />
      <SectorLedger />
      <Stakes />
      <Sink />
      <Closing />

      <style jsx global>{`
        @keyframes essay-kenburns-kf {
          from { transform: scale(1); }
          to { transform: scale(1.09) translateY(-1.5%); }
        }
        .essay-kenburns { animation: essay-kenburns-kf 22s ease-in-out infinite alternate; }

        @keyframes essay-rise-kf {
          from { opacity: 0; transform: translateY(26px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .essay-rise { animation: essay-rise-kf 900ms cubic-bezier(0.2, 0, 0, 1) both; }

        @keyframes essay-scrollcue-kf {
          0% { transform: translateY(-16px); }
          70%, 100% { transform: translateY(40px); }
        }
        .essay-scrollcue { animation: essay-scrollcue-kf 1.8s cubic-bezier(0.3, 0, 0.4, 1) infinite; }

        @media (prefers-reduced-motion: reduce) {
          .essay-kenburns, .essay-scrollcue { animation: none; }
          .essay-rise { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
