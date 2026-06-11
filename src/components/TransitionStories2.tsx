'use client';

/**
 * Transition Stories 2 — "Mind the Gap".
 *
 * A cinematic landing page for the Advisory Board's policy gap report,
 * "Towards EU climate neutrality: Progress, policy gaps and opportunities"
 * (ESABCC, 2024). It carries the report's big messages — the doubled pace,
 * the widening gap to the advice corridor, the thinning sink, the unpriced
 * sectors and the 13 key recommendations — through one continuous scroll.
 *
 * It builds on Transition Stories (M·22): the same real photography from
 * the Advisory Board's own report covers and the same real series
 * (`src/data/transition-panorama.ts`, `src/lib/scenarios/policy-gap.ts`),
 * but pushes the staging further: living SVG scenes (flowing water, rising
 * embers, grazing cattle, a pedalling cyclist, gliding trams, turning wind
 * turbines) layered over the photographs, a scroll-driven gap chart that
 * shades THE GAP itself, a depleting carbon-budget bar, and a typographic
 * finale of all 13 recommendations.
 *
 * Visual direction is inspired by oryzo.ai (Awwwards SOTD): a warm
 * near-black canvas, a single cream ink, hairline + dashed rules as the
 * only ornament, theatrical display type, and one burnt accent — here the
 * ESABCC signal orange, reserved for the gap.
 *
 * Every figure is real. Where a number is computed it is computed from the
 * imported series, not typed in. All motion is suppressed under
 * `prefers-reduced-motion`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import {
  EU_1990_BASE_MT,
  PANORAMA_SECTORS,
  PanoramaNode,
  TOTAL_PATHWAY,
} from '@/data/transition-panorama';

// ─────────────────────────────────────────────────────────────────────────────
// Palette — Oryzo-style: one dark, one cream, one ember. Teal only for
// the required pathway, orange only for the gap.
// ─────────────────────────────────────────────────────────────────────────────

const INK = '#0f0c08';
const CREAM = '#f4ead8';
const EMBER = '#f26119';
const TEAL = '#74CBC8';

// ─────────────────────────────────────────────────────────────────────────────
// Shared hooks (same patterns as Transition Stories M·22)
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
function useParallax<T extends HTMLElement>(speed = 0.16): React.RefObject<T> {
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
        el.style.transform = `translateY(${offset.toFixed(1)}px) scale(1.16)`;
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

/** Oryzo-style dashed chapter rule with a centred label chip. */
function ChapterRule({ no, label }: { no: string; label: string }) {
  return (
    <div className="relative max-w-[1180px] mx-auto px-6" aria-hidden>
      <div className="border-t border-dashed" style={{ borderColor: 'rgba(244,234,216,0.22)' }} />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] tracking-[0.3em] uppercase"
          style={{ borderColor: 'rgba(244,234,216,0.3)', color: 'rgba(244,234,216,0.7)', background: INK }}
        >
          <span style={{ color: EMBER }}>{no}</span> {label}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived numbers — everything computed from the imported series.
// ─────────────────────────────────────────────────────────────────────────────

const HIST = TOTAL_PATHWAY.historical;
const FIRST = HIST[0]; // 2005
const LATEST = HIST[HIST.length - 1]; // 2022
const T2030 = TOTAL_PATHWAY.targets.find(t => t.year === 2030)!;
const PACE_HISTORICAL = (FIRST.value - LATEST.value) / (LATEST.year - FIRST.year); // Mt/yr achieved
const PACE_REQUIRED = (LATEST.value - T2030.low) / (2030 - LATEST.year); // Mt/yr to the 2030 target
const PACE_RATIO = PACE_REQUIRED / PACE_HISTORICAL;
const WAM_2030 = TOTAL_PATHWAY.wam.find(d => d.year === 2030)!.value;
const WAM_2050 = TOTAL_PATHWAY.wam[TOTAL_PATHWAY.wam.length - 1].value;
const GAP_2030 = WAM_2030 - T2030.low;
const CUM_GT = HIST.reduce((a, d) => a + d.value, 0) / 1000;
const VS_1990 = (1 - LATEST.value / EU_1990_BASE_MT) * 100;

/** The Advisory Board's 2040-advice pathway used in M·21/M·22. */
const ADVICE_PATH = [
  { year: LATEST.year, value: LATEST.value },
  { year: 2030, value: T2030.low },
  { year: 2040, value: 358.5 },
  { year: 2050, value: 0 },
];

function adviceAt(year: number): number {
  for (let i = 0; i < ADVICE_PATH.length - 1; i++) {
    const a = ADVICE_PATH[i];
    const b = ADVICE_PATH[i + 1];
    if (year >= a.year && year <= b.year) {
      return a.value + ((b.value - a.value) * (year - a.year)) / (b.year - a.year);
    }
  }
  return 0;
}

const sectorById = (id: string): PanoramaNode => PANORAMA_SECTORS.find(s => s.id === id)!;
const sectorChange = (s: PanoramaNode): number => {
  const a = s.series[0].value;
  const b = s.series[s.series.length - 1].value;
  return ((b - a) / Math.abs(a)) * 100;
};

// ─────────────────────────────────────────────────────────────────────────────
// The 13 key recommendations (ESABCC 2024, pp. 8–13), in three acts.
// ─────────────────────────────────────────────────────────────────────────────

const ACTS: {
  act: string;
  title: string;
  recs: { no: number; title: string; body: string; tag: string }[];
}[] = [
  {
    act: 'Act I',
    title: 'Deliver 2030.',
    recs: [
      {
        no: 1,
        title: 'Implement, urgently — and enforce.',
        body:
          'Member States should urgently adopt and implement national measures to more than double the pace of reductions and reverse the declining carbon sink. If updated NECPs fall short, the Commission should take enforcement action.',
        tag: 'Fit for 55',
      },
      {
        no: 2,
        title: 'Finish the pending laws.',
        body:
          'Adopt the legislative initiatives still on the table — above all an ambitious revision of the Energy Taxation Directive that aligns fuel taxes with climate goals and ends exemptions for aviation, maritime and road freight fuels.',
        tag: 'Energy taxation',
      },
      {
        no: 3,
        title: 'Give renewables a stable outlook.',
        body:
          'Adopt and implement the electricity market reform, the Net-Zero Industry Act and the Critical Raw Materials Act, so that wind, solar and grids get the long-term investment signal the 2030 build-out depends on.',
        tag: 'Investment',
      },
      {
        no: 4,
        title: 'End fossil fuel subsidies.',
        body:
          'Fully and urgently phase out fossil fuel subsidies, with a deadline and a plan in every NECP — and redirect support for vulnerable households into targeted help that keeps the incentive to save energy.',
        tag: 'Subsidies',
      },
    ],
  },
  {
    act: 'Act II',
    title: 'Fix the framework.',
    recs: [
      {
        no: 5,
        title: 'Make every policy consistent.',
        body:
          'Check every draft measure against climate neutrality — including delegated acts, state-aid decisions, energy-infrastructure planning (TEN-E), the EU Taxonomy and the Industrial Emissions Directive. No more policies that pull the other way.',
        tag: 'Consistency',
      },
      {
        no: 6,
        title: 'Strengthen governance & compliance.',
        body:
          'Use the upcoming revisions of the Governance Regulation and the European Climate Law to harden the framework: credible national long-term strategies, real monitoring and real consequences.',
        tag: 'Governance',
      },
      {
        no: 7,
        title: 'Make the two ETS fit for net zero.',
        body:
          'Clarify how the EU ETS works as its cap approaches zero — including the role of removals — and develop alternatives to free allocation against carbon leakage.',
        tag: 'Carbon pricing',
      },
      {
        no: 8,
        title: 'Assess the social impacts, then act.',
        body:
          'Build EU policy on systematic, context-specific impact assessments and ex-post evaluations of socio-economic effects, so the transition is just by design — not by afterthought.',
        tag: 'Just transition',
      },
    ],
  },
  {
    act: 'Act III',
    title: 'Open the next decade.',
    recs: [
      {
        no: 9,
        title: 'Point the CAP at the climate.',
        body:
          'Realign the common agricultural policy with EU climate goals: a standalone emissions objective, and stronger incentives for climate action across the food system.',
        tag: 'Agriculture',
      },
      {
        no: 10,
        title: 'Spend the scarce tools wisely.',
        body:
          'Target CCS/CCU, hydrogen and bioenergy at the activities with no or limited alternatives — and electrify everything else directly.',
        tag: 'CCS · H₂ · bio',
      },
      {
        no: 11,
        title: 'Move the money.',
        body:
          'Drive the required increase in public and private climate investment — starting with honest tracking of what the EU budget actually spends on climate.',
        tag: 'Finance',
      },
      {
        no: 12,
        title: 'Want less, waste less.',
        body:
          'Cut energy and material demand in mobility, housing, products and diets — through efficiency and through behavioural change. The cheapest megatonne is the one never emitted.',
        tag: 'Sufficiency',
      },
      {
        no: 13,
        title: 'Price all emissions. Reward removals.',
        body:
          'Extend GHG pricing to agriculture, food, LULUCF and upstream fossil operations, and build EU-level incentives for carbon removals. Today, the cheapest sectors to ignore are the least priced.',
        tag: 'Full coverage',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Living-scene SVGs — silhouettes animated with CSS only.
// ─────────────────────────────────────────────────────────────────────────────

/** A side-view cow silhouette. `graze` nods the head down to the grass. */
function Cow({ graze = false, flip = false, delay = 0 }: { graze?: boolean; flip?: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 230 140" className="h-full w-auto" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <g fill={INK}>
        {/* body, legs, udder */}
        <path d="M77,55 C90,44 113,40 134,43 C155,45 173,46 184,57 C193,66 195,77 190,87 L193,124 L185,125 L181,92 C176,95 170,96 163,96 L165,124 L157,125 L155,96 L117,94 L114,124 L106,125 L107,92 C101,90 95,87 91,82 L88,124 L80,125 L80,76 C76,70 74,61 77,55 Z" />
        <path d="M120,94 C126,103 138,103 144,95 L141,91 L123,91 Z" opacity={0.9} />
        {/* tail */}
        <g className="ts2-tail" style={{ transformOrigin: '189px 62px', animationDelay: `${delay + 0.4}s` }}>
          <path d="M189,62 C198,74 200,92 196,108 L192,107 C195,92 193,76 186,66 Z" />
          <ellipse cx="194.5" cy="110" rx="3.4" ry="6" />
        </g>
        {/* head — pivots at the neck to graze */}
        <g
          className={graze ? 'ts2-graze' : undefined}
          style={{ transformOrigin: '80px 58px', animationDelay: `${delay}s` }}
        >
          <path d="M80,48 C70,42 58,40 48,44 C40,47 33,54 31,61 C29,67 32,72 38,73 L52,73 C58,73 64,70 68,66 L82,66 C86,62 85,53 80,48 Z" />
          {/* ear + horn */}
          <path d="M52,42 C46,37 38,36 33,39 C38,42 45,44 50,46 Z" />
          <path d="M60,40 C61,34 65,30 70,29 C68,34 66,39 64,42 Z" />
        </g>
      </g>
    </svg>
  );
}

/** Pasture band: dusk gradient, drifting clouds, swaying grass, three cows. */
function PastureScene() {
  return (
    <div className="relative h-[240px] sm:h-[300px] overflow-hidden" aria-hidden>
      {/* dusk sky */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${INK} 0%, #2b1a0e 46%, #7a3c14 78%, #b4581c 100%)` }}
      />
      {/* drifting cloud bands */}
      <div className="ts2-cloud absolute top-[18%] left-0 w-[60%] h-8 rounded-full opacity-[0.12]" style={{ background: CREAM, filter: 'blur(18px)' }} />
      <div className="ts2-cloud absolute top-[38%] left-0 w-[42%] h-6 rounded-full opacity-[0.09]" style={{ background: CREAM, filter: 'blur(14px)', animationDelay: '-26s', animationDuration: '74s' }} />
      {/* ground */}
      <div className="absolute inset-x-0 bottom-0 h-[34px]" style={{ background: INK }} />
      <div className="absolute inset-x-0 bottom-[33px] border-t" style={{ borderColor: 'rgba(244,234,216,0.18)' }} />
      {/* grass tufts */}
      {Array.from({ length: 14 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 26"
          className="ts2-sway absolute bottom-[28px] w-[16px] h-[22px]"
          style={{ left: `${4 + i * 7.1}%`, transformOrigin: '50% 100%', animationDelay: `${(i % 5) * 0.7}s` }}
        >
          <path d="M10,26 C9,16 6,10 2,6 M10,26 C10,14 10,8 10,2 M10,26 C11,16 14,10 18,7" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
      ))}
      {/* the herd */}
      <div className="absolute bottom-[18px] left-[6%] h-[110px] sm:h-[140px]"><Cow graze /></div>
      <div className="absolute bottom-[20px] left-[42%] h-[86px] sm:h-[108px] opacity-90"><Cow flip delay={1.2} /></div>
      <div className="absolute bottom-[16px] right-[7%] h-[100px] sm:h-[126px]"><Cow graze delay={2.6} /></div>
    </div>
  );
}

/** A pedalling cyclist that rides across its container. */
function Cyclist() {
  const spoke = (cx: number) => (
    <g className="ts2-spin" style={{ transformOrigin: `${cx}px 100px` }}>
      <circle cx={cx} cy={100} r={24} fill="none" stroke={CREAM} strokeWidth="3" />
      <line x1={cx - 23} y1={100} x2={cx + 23} y2={100} stroke={CREAM} strokeWidth="1.4" />
      <line x1={cx} y1={77} x2={cx} y2={123} stroke={CREAM} strokeWidth="1.4" />
      <line x1={cx - 16.5} y1={83.5} x2={cx + 16.5} y2={116.5} stroke={CREAM} strokeWidth="1.1" />
    </g>
  );
  return (
    <svg viewBox="0 0 210 140" className="h-full w-auto" aria-hidden>
      {spoke(56)}
      {spoke(158)}
      <g stroke={CREAM} strokeWidth="3.4" fill="none" strokeLinecap="round">
        {/* frame */}
        <path d="M56,100 L97,58 L146,58 L158,100 M97,58 L107,98 L56,100 M107,98 L158,100" />
        {/* handlebar + seat post */}
        <path d="M146,58 L152,44 M152,44 L160,42 M97,58 L91,46 M85,46 L97,46" />
      </g>
      {/* crank */}
      <g className="ts2-spin" style={{ transformOrigin: '107px 98px' }}>
        <line x1={97} y1={88} x2={117} y2={108} stroke={CREAM} strokeWidth="3" />
        <rect x={92} y={85} width={9} height={4} rx={2} fill={CREAM} />
        <rect x={113} y={106} width={9} height={4} rx={2} fill={CREAM} />
      </g>
      {/* rider — two leg poses toggled to read as pedalling */}
      <g fill={CREAM}>
        <circle cx={160} cy={26} r={8.5} />
        <path d="M91,44 C100,36 116,30 130,32 L152,40 C156,42 156,48 152,50 L134,46 C120,46 104,50 96,54 Z" />
        {/* arm */}
        <path d="M132,40 L150,46 L148,52 L130,46 Z" />
      </g>
      <g className="ts2-poseA" stroke={CREAM} strokeWidth="6.5" fill="none" strokeLinecap="round">
        <path d="M96,52 L92,74 L97,89" />
        <path d="M98,54 L110,76 L116,106" />
      </g>
      <g className="ts2-poseB" stroke={CREAM} strokeWidth="6.5" fill="none" strokeLinecap="round">
        <path d="M96,52 L106,72 L97,89" />
        <path d="M98,54 L96,80 L116,106" />
      </g>
    </svg>
  );
}

/** A walking pedestrian silhouette (two-pose toggle). */
function Walker({ delay = 0, h = 64 }: { delay?: number; h?: number }) {
  return (
    <svg viewBox="0 0 60 110" style={{ height: h }} className="w-auto" aria-hidden>
      <g fill={CREAM}>
        <circle cx={30} cy={14} r={8} />
        <path d="M24,24 C34,22 38,28 37,40 L35,62 L25,62 L23,40 C22,32 22,26 24,24 Z" />
      </g>
      <g className="ts2-poseA" style={{ animationDelay: `${delay}s` }} stroke={CREAM} strokeWidth="6" fill="none" strokeLinecap="round">
        <path d="M30,60 L20,82 L16,104" />
        <path d="M30,60 L40,80 L46,102" />
        <path d="M30,32 L20,48" />
        <path d="M30,32 L40,46" />
      </g>
      <g className="ts2-poseB" style={{ animationDelay: `${delay}s` }} stroke={CREAM} strokeWidth="6" fill="none" strokeLinecap="round">
        <path d="M30,60 L28,84 L30,106" />
        <path d="M30,60 L34,84 L32,106" />
        <path d="M30,32 L24,50" />
        <path d="M30,32 L36,48" />
      </g>
    </svg>
  );
}

/** A tram that glides across the mobility scene. */
function Tram() {
  return (
    <svg viewBox="0 0 300 110" className="h-full w-auto" aria-hidden>
      {/* pantograph */}
      <path d="M120,28 L150,8 L180,28" stroke={CREAM} strokeWidth="2.4" fill="none" />
      <line x1={20} y1={6} x2={290} y2={6} stroke={CREAM} strokeWidth="1.2" opacity={0.4} />
      {/* body */}
      <rect x={14} y={28} width={272} height={58} rx={14} fill="none" stroke={CREAM} strokeWidth="3" />
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x={30 + i * 52} y={40} width={36} height={22} rx={4} fill={CREAM} opacity={0.85} />
      ))}
      <line x1={14} y1={72} x2={286} y2={72} stroke={CREAM} strokeWidth="1.4" opacity={0.5} />
      {/* bogies */}
      <rect x={48} y={86} width={56} height={9} rx={4} fill={CREAM} />
      <rect x={196} y={86} width={56} height={9} rx={4} fill={CREAM} />
    </svg>
  );
}

/** A passing car silhouette with a headlight beam. */
function Car() {
  return (
    <svg viewBox="0 0 240 80" className="h-full w-auto" aria-hidden>
      <path
        d="M18,58 C16,46 24,38 40,36 L60,22 C66,17 76,14 90,14 L140,14 C154,14 164,18 172,26 L186,36 C206,38 222,44 224,54 C226,60 222,64 214,64 L30,64 C22,64 19,62 18,58 Z"
        fill={INK}
        stroke={CREAM}
        strokeWidth="2.6"
      />
      <path d="M70,24 L88,20 L88,36 L64,36 Z M96,20 L136,20 L138,36 L96,36 Z" fill={CREAM} opacity={0.8} />
      <circle cx={62} cy={64} r={12} fill={INK} stroke={CREAM} strokeWidth="2.6" />
      <circle cx={182} cy={64} r={12} fill={INK} stroke={CREAM} strokeWidth="2.6" />
      {/* headlight beam */}
      <path d="M222,48 L240,44 L240,56 L222,56 Z" fill={EMBER} opacity={0.55} />
    </svg>
  );
}

/** A turning wind turbine. */
function Turbine({ h = 180, dur = 6, delay = 0 }: { h?: number; dur?: number; delay?: number }) {
  return (
    <svg viewBox="0 0 120 200" style={{ height: h }} className="w-auto" aria-hidden>
      <path d="M57,60 L63,60 L66,196 L54,196 Z" fill={INK} />
      <g
        className="ts2-rotor"
        style={{ transformOrigin: '60px 56px', animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
      >
        {[0, 120, 240].map(a => (
          <path
            key={a}
            d="M60,56 C57,38 57,20 60,4 C63,20 63,38 60,56 Z"
            fill={INK}
            transform={`rotate(${a} 60 56)`}
          />
        ))}
      </g>
      <circle cx={60} cy={56} r={5} fill={INK} />
      <circle cx={60} cy={56} r={1.6} fill={EMBER} className="ts2-beacon" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — winding road through the forest, the report as a marquee.
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  const vsText = useCountUp(VS_1990, inView, 0);
  const paceText = useCountUp(PACE_RATIO, inView, 1);

  return (
    <section id="ts2-hero" className="relative h-[100svh] min-h-[640px] overflow-hidden" style={{ background: INK }}>
      <img
        src="/essay/pathway-road.jpg"
        alt="Aerial photograph of a road curving through dense European forest, a single car on the asphalt"
        className="absolute inset-0 w-full h-full object-cover ts2-kenburns"
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}99 0%, ${INK}33 40%, ${INK} 96%)` }} />
      <Grain />

      <div ref={ref} className="relative h-full max-w-[1180px] mx-auto px-6 flex flex-col justify-end pb-[16vh]">
        <p className="ts2-rise text-[11px] tracking-[0.34em] uppercase font-semibold" style={{ color: TEAL }}>
          Transition Stories · Part II — the policy gap report
        </p>
        <h1
          className="ts2-rise mt-4 font-bold leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 10.5vw, 148px)', color: CREAM, animationDelay: '120ms' }}
        >
          Mind
          <br />
          the&nbsp;<span style={{ color: EMBER }}>gap</span>.
        </h1>
        <p
          className="ts2-rise mt-6 max-w-xl text-[15px] sm:text-[17px] leading-relaxed"
          style={{ color: 'rgba(244,234,216,0.78)', animationDelay: '240ms' }}
        >
          The EU has come a third of the way to climate neutrality. The law says where the
          road ends; current policies don&apos;t reach it. This is the Advisory Board&apos;s
          progress-and-gaps assessment — <em>Towards EU climate neutrality</em> — told as
          one continuous drive.
        </p>

        <div className="ts2-rise mt-10 flex flex-wrap gap-x-12 gap-y-6" style={{ animationDelay: '360ms' }}>
          {[
            [`−${vsText} %`, `net emissions vs 1990 · ${LATEST.year}`, CREAM],
            [`× ${paceText}`, 'the pace needed to 2030, vs 2005–2022', EMBER],
            ['13', 'key recommendations in the report', TEAL],
          ].map(([v, l, c]) => (
            <div key={l as string}>
              <div className="text-[40px] sm:text-[54px] font-bold tabular-nums leading-none" style={{ color: c as string }}>
                {v}
              </div>
              <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* marquee — the report's subtitle, looping */}
      <div className="absolute bottom-0 inset-x-0 border-t border-dashed overflow-hidden" style={{ borderColor: 'rgba(244,234,216,0.25)', background: INK }}>
        <div className="ts2-marquee flex whitespace-nowrap py-3 text-[12px] tracking-[0.34em] uppercase" style={{ color: 'rgba(244,234,216,0.6)' }}>
          {[0, 1].map(k => (
            <span key={k} className="shrink-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i}>
                  Progress <span style={{ color: EMBER }}>·</span> Policy gaps <span style={{ color: EMBER }}>·</span> Opportunities{' '}
                  <span style={{ color: TEAL }}>·</span> ESABCC 2024 <span style={{ color: TEAL }}>·</span>{' '}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ color: 'rgba(244,234,216,0.5)' }}>
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <span className="block w-px h-10 overflow-hidden" style={{ background: 'rgba(244,234,216,0.35)' }}>
          <span className="block w-px h-4 ts2-scrollcue" style={{ background: CREAM }} />
        </span>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prologue — three sentences, one per beat.
// ─────────────────────────────────────────────────────────────────────────────

function PrologueLine({ index, children }: { index: number; children: React.ReactNode }) {
  const [ref, inView] = useInView<HTMLParagraphElement>(0.6);
  return (
    <p
      ref={ref}
      className={`${inView ? 'ts2-rise' : 'opacity-0'} text-[22px] sm:text-[32px] leading-snug font-semibold tracking-tight ${index > 0 ? 'mt-8' : ''}`}
      style={{ color: 'rgba(244,234,216,0.62)', animationDelay: `${index * 140}ms` }}
    >
      {children}
    </p>
  );
}

function Prologue() {
  return (
    <section className="py-24 sm:py-32" style={{ background: INK }}>
      <div className="max-w-[880px] mx-auto px-6">
        <div className="border border-dashed rounded-2xl px-7 sm:px-12 py-12 sm:py-16" style={{ borderColor: 'rgba(244,234,216,0.25)' }}>
          <PrologueLine index={0}>
            The EU has cut net emissions <strong style={{ color: CREAM }}>{Math.round(VS_1990)} %</strong> below 1990.
          </PrologueLine>
          <PrologueLine index={1}>
            The law requires <strong style={{ color: TEAL }}>−55 % by 2030</strong> and <strong style={{ color: TEAL }}>net zero by 2050</strong>.
          </PrologueLine>
          <PrologueLine index={2}>
            To get there, the pace must <strong style={{ color: EMBER }}>more than double</strong>. That distance is the gap.
          </PrologueLine>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 01 — the gap, drawn and shaded by scroll.
// ─────────────────────────────────────────────────────────────────────────────

const CW = 1100;
const CH = 560;
const CM = { top: 56, right: 190, bottom: 54, left: 84 };

function GapScrolly() {
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

  const wamFuture = useMemo(() => TOTAL_PATHWAY.wam.filter(d => d.year >= LATEST.year), []);
  const gapArea = useMemo(() => {
    const area = d3
      .area<{ year: number; value: number }>()
      .x(d => x(d.year))
      .y0(d => y(adviceAt(d.year)))
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);
    return area(wamFuture) ?? undefined;
  }, [wamFuture, x, y]);

  // choreography: 0–0.4 history · 0.4–0.7 the fork · 0.7–1 the gap shades in
  const fHist = Math.min(progress / 0.4, 1);
  const fFork = Math.max(0, Math.min((progress - 0.4) / 0.3, 1));
  const fGap = Math.max(0, Math.min((progress - 0.7) / 0.3, 1));
  const year =
    2005 + fHist * (LATEST.year - 2005) + fFork * (2050 - LATEST.year);

  const ann = (visible: boolean) =>
    ({ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease' }) as React.CSSProperties;

  return (
    <section id="ts2-gap" ref={ref} className="relative" style={{ height: '380vh', background: INK }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <img src="/essay/hero-arctic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK} 4%, transparent 50%, ${INK} 96%)` }} />
        <Grain />

        <div className="relative max-w-[1180px] w-full mx-auto px-6" style={{ paddingTop: 'max(7vh, 96px)' }}>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 01 · The distance</p>
          <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
            Same road. Different destinations.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.7)' }}>
            EU net emissions since 2005, then the fork: what Member States&apos; own
            projections deliver, against the corridor the Advisory Board assessed as
            1.5&nbsp;°C-compatible. The orange field between them is the policy gap.
          </p>
        </div>

        <div className="relative flex-1 max-w-[1180px] w-full mx-auto px-2 sm:px-6">
          <div
            className="absolute right-6 top-2 font-bold tabular-nums select-none leading-none"
            style={{ fontSize: 'clamp(80px, 13vw, 180px)', color: 'rgba(244,234,216,0.08)' }}
            aria-hidden
          >
            {Math.round(year)}
          </div>

          <svg
            viewBox={`0 0 ${CW} ${CH}`}
            className="w-full h-full"
            role="img"
            aria-label="EU net greenhouse-gas emissions 2005 to 2050: history, Member State projections, the Advisory Board pathway, and the policy gap between them"
          >
            <defs>
              <pattern id="ts2-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke={EMBER} strokeWidth="1.6" opacity="0.5" />
              </pattern>
              <clipPath id="ts2-gapclip">
                <rect
                  x={x(LATEST.year)}
                  y={0}
                  width={(x(2050) - x(LATEST.year)) * fGap}
                  height={CH}
                />
              </clipPath>
            </defs>

            {y.ticks(4).map(t => (
              <g key={t}>
                <line x1={CM.left} x2={CW - CM.right} y1={y(t)} y2={y(t)} stroke={CREAM} strokeOpacity={t === 0 ? 0.4 : 0.08} />
                <text x={CM.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="rgba(244,234,216,0.5)">
                  {t.toLocaleString('en-GB')}
                </text>
              </g>
            ))}
            {[2010, 2020, 2030, 2040, 2050].map(t => (
              <text key={t} x={x(t)} y={CH - 24} textAnchor="middle" fontSize={12} fill="rgba(244,234,216,0.5)">
                {t}
              </text>
            ))}
            <text x={CM.left - 10} y={CM.top - 20} textAnchor="end" fontSize={11} fill="rgba(244,234,216,0.5)">Mt CO₂e</text>

            {/* the gap, shaded */}
            <g clipPath="url(#ts2-gapclip)" style={{ opacity: fGap > 0 ? 1 : 0 }}>
              <path d={gapArea} fill={EMBER} opacity={0.16} />
              <path d={gapArea} fill="url(#ts2-hatch)" />
            </g>

            {/* history draws with scroll */}
            <path
              d={line(HIST) ?? undefined}
              fill="none"
              stroke={CREAM}
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
                stroke={EMBER}
                strokeWidth={2.5}
                strokeDasharray="2 7"
                strokeLinecap="round"
                style={{ opacity: fFork }}
              />
              <path
                d={line(ADVICE_PATH) ?? undefined}
                fill="none"
                stroke={TEAL}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 - fFork }}
              />
            </g>

            {/* annotations */}
            <g style={ann(fHist >= 1)}>
              <circle cx={x(LATEST.year)} cy={y(LATEST.value)} r={6} fill={CREAM} />
              <text x={x(LATEST.year) + 14} y={y(LATEST.value) - 8} fontSize={12.5} fill={CREAM} fontWeight={700}>
                {LATEST.year} · {fmt(LATEST.value)} Mt
              </text>
              <text x={x(LATEST.year) + 14} y={y(LATEST.value) + 8} fontSize={11} fill="rgba(244,234,216,0.55)">
                −{fmt(PACE_HISTORICAL)} Mt a year since 2005
              </text>
            </g>

            <g style={ann(year >= 2030 && fFork > 0.3)}>
              <circle cx={x(2030)} cy={y(T2030.low)} r={6} fill={INK} stroke={TEAL} strokeWidth={2.5} />
              <text x={x(2030)} y={y(T2030.low) + 26} textAnchor="middle" fontSize={12.5} fill={TEAL} fontWeight={700}>
                −55 % by 2030
              </text>
              <text x={x(2030)} y={y(T2030.low) + 42} textAnchor="middle" fontSize={11} fill="rgba(244,234,216,0.55)">
                needs −{fmt(PACE_REQUIRED)} Mt a year
              </text>
            </g>

            <g style={ann(fGap > 0.35)}>
              <text
                x={x(2041)}
                y={y((adviceAt(2041) + 1850) / 2)}
                textAnchor="middle"
                fontSize={26}
                fill={EMBER}
                fontWeight={800}
                letterSpacing="0.18em"
              >
                THE GAP
              </text>
            </g>

            <g style={ann(fGap > 0.15)}>
              <line x1={x(2030)} x2={x(2030)} y1={y(WAM_2030)} y2={y(T2030.low)} stroke={EMBER} strokeWidth={1.5} strokeDasharray="3 4" />
              <text x={x(2030) - 10} y={y((WAM_2030 + T2030.low) / 2)} textAnchor="end" fontSize={11.5} fill={EMBER} fontWeight={700}>
                {fmt(GAP_2030)} Mt short
              </text>
            </g>

            <g style={ann(fGap >= 0.96)}>
              <text x={x(2050) + 12} y={y(WAM_2050)} dy="0.32em" fontSize={13} fill={EMBER} fontWeight={700}>{fmt(WAM_2050)} Mt</text>
              <text x={x(2050) + 12} y={y(WAM_2050) + 17} fontSize={11} fill="rgba(244,234,216,0.55)">current projections, 2050</text>
              <circle cx={x(2050)} cy={y(0)} r={6} fill={TEAL} />
              <text x={x(2050) + 12} y={y(0) - 14} fontSize={13} fill={TEAL} fontWeight={700}>net zero</text>
              <text x={x(2050) + 12} y={y(0) + 2} fontSize={11} fill="rgba(244,234,216,0.55)">the legal obligation</text>
            </g>
          </svg>
        </div>

        <div className="relative max-w-[1180px] w-full mx-auto px-6 pb-6">
          <div className="flex items-center gap-3 text-[11px]" style={{ ...ann(fGap >= 0.96), color: 'rgba(244,234,216,0.55)' }}>
            <span className="inline-block w-7 border-t-2 border-dashed" style={{ borderColor: EMBER }} /> Member State projections (WAM)
            <span className="inline-block w-7 border-t-2 ml-4" style={{ borderColor: TEAL }} /> ESABCC advice pathway
            <span className="ml-auto hidden sm:inline">
              In 2050 the gap is <strong style={{ color: EMBER }}>{fmt(WAM_2050)} Mt CO₂e</strong> — every year of it, a choice.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 02 — water: the thinning sink, over real forest water.
// ─────────────────────────────────────────────────────────────────────────────

function WaterChapter() {
  const img = useParallax<HTMLImageElement>(0.13);
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const lulucf = sectorById('lulucf');
  const latest = lulucf.series[lulucf.series.length - 1];
  const sinkText = useCountUp(Math.abs(latest.value), inView);
  const need = lulucf.benchmarks?.find(b => b.year === 2030)?.low ?? -310;
  const needText = useCountUp(Math.abs(need), inView);

  return (
    <section id="ts2-water" className="relative min-h-[96vh] overflow-hidden flex items-end" style={{ background: INK }}>
      <img
        ref={img}
        src="/essay2/forest-water.jpg"
        alt="Aerial photograph of water flowing between trees in a flooded European forest"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {/* living water: flow lines traced over the channel */}
      <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        {[
          'M-20,330 C200,300 420,360 620,330 C820,300 1020,350 1220,320',
          'M-20,390 C220,360 430,420 640,390 C850,360 1030,410 1220,380',
          'M-20,450 C240,430 460,480 660,450 C860,420 1040,470 1220,440',
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i === 1 ? TEAL : CREAM}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="3 14"
            opacity={0.4}
            className="ts2-flow"
            style={{ animationDelay: `${i * -2.4}s`, animationDuration: `${7 + i * 2}s` }}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <circle
            key={i}
            cx={120 + i * 160}
            cy={335 + (i % 3) * 58}
            r={2.4}
            fill={CREAM}
            className="ts2-glint"
            style={{ animationDelay: `${i * 0.9}s` }}
          />
        ))}
      </svg>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}cc 0%, ${INK}22 40%, ${INK}f2 100%)` }} />
      <Grain />

      <div ref={ref} className="relative max-w-[1180px] w-full mx-auto px-6 pb-16 pt-[34vh]">
        <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 02 · Water &amp; land</p>
        <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
          The land is forgetting<br />how to breathe.
        </h2>
        <div className="mt-6 grid lg:grid-cols-[auto_minmax(0,1fr)] gap-x-14 gap-y-6 items-end">
          <div className="flex gap-x-12">
            <div>
              <div className="text-[46px] sm:text-[62px] font-bold tabular-nums leading-none" style={{ color: TEAL }}>−{sinkText}</div>
              <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                Mt removed by forests &amp; land · {latest.year}
              </div>
            </div>
            <div>
              <div className="text-[46px] sm:text-[62px] font-bold tabular-nums leading-none" style={{ color: EMBER }}>−{needText}</div>
              <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                Mt required by 2030 · LULUCF Regulation
              </div>
            </div>
          </div>
          <p className="max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.75)' }}>
            Wetlands, rivers and forests are the EU&apos;s only working carbon-removal machine —
            and the sink has weakened by roughly a third since 2005, declining sharply since 2015.
            The report&apos;s very first recommendation: <strong style={{ color: CREAM }}>reverse the
            decline in time</strong>, and start building incentives that pay the land for what it
            absorbs (Key recommendations 1 &amp; 13).
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 03 — fire: real firefighters, rising embers, a depleting budget.
// ─────────────────────────────────────────────────────────────────────────────

function FireChapter() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const cumText = useCountUp(CUM_GT, inView, 0);
  const budgetShare = ((11 + 14) / 2 / CUM_GT) * 100; // remaining vs already spent

  return (
    <section id="ts2-fire" className="relative overflow-hidden" style={{ background: INK }}>
      <div className="relative h-[88vh] min-h-[520px] overflow-hidden">
        <img
          src="/essay/stakes-wildfire.jpg"
          alt="Two firefighters hosing down a grass fire at the edge of a reed bed"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* embers */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="ts2-ember absolute rounded-full"
              style={{
                left: `${(i * 61) % 97}%`,
                bottom: '12%',
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                background: i % 4 === 0 ? CREAM : EMBER,
                animationDelay: `${(i * 0.7) % 6}s`,
                animationDuration: `${5 + (i % 5)}s`,
              }}
            />
          ))}
          <div
            className="ts2-glow absolute left-0 right-0 top-[8%] h-[30%]"
            style={{ background: `radial-gradient(60% 100% at 50% 30%, ${EMBER}33, transparent 70%)` }}
          />
        </div>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}b3 0%, transparent 45%, ${INK} 100%)` }} />
        <Grain />
        <div className="relative h-full max-w-[1180px] mx-auto px-6 flex flex-col justify-end pb-14">
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 03 · Fire</p>
          <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
            The budget is already burning.
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.75)' }}>
            These two people are holding a line. So is the number below: the greenhouse-gas
            budget the Advisory Board recommends for 2030–2050 is a fraction of what the EU
            has already emitted since 2005.
          </p>
        </div>
      </div>

      <div ref={ref} className="max-w-[1180px] mx-auto px-6 pb-20 pt-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-[52px] sm:text-[72px] font-bold tabular-nums leading-none" style={{ color: EMBER }}>{cumText}</span>
          <span className="text-[14px] max-w-md leading-snug" style={{ color: 'rgba(244,234,216,0.65)' }}>
            Gt CO₂e emitted by the EU since 2005 — against a recommended budget of just{' '}
            <strong style={{ color: CREAM }}>11–14 Gt for the whole of 2030–2050</strong>.
          </span>
        </div>
        <div className="mt-7 h-[14px] rounded-full overflow-hidden flex" style={{ background: 'rgba(244,234,216,0.08)' }} aria-hidden>
          <div
            className="h-full"
            style={{
              width: inView ? `${100 - budgetShare}%` : '0%',
              background: `repeating-linear-gradient(45deg, ${EMBER}, ${EMBER} 6px, #b34a12 6px, #b34a12 12px)`,
              transition: 'width 1600ms cubic-bezier(0.2,0,0,1) 200ms',
            }}
          />
          <div
            className="h-full"
            style={{
              width: inView ? `${budgetShare}%` : '0%',
              background: TEAL,
              transition: 'width 1600ms cubic-bezier(0.2,0,0,1) 200ms',
            }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[11px]" style={{ color: 'rgba(244,234,216,0.5)' }}>
          <span>already emitted, 2005–{LATEST.year}</span>
          <span style={{ color: TEAL }}>what may remain, 2030–2050</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 04 — the fields: flooded cropland, then a living pasture of cows.
// ─────────────────────────────────────────────────────────────────────────────

function FieldsChapter() {
  const img = useParallax<HTMLImageElement>(0.12);
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const agri = sectorById('agriculture');
  const latest = agri.series[agri.series.length - 1];
  const change = sectorChange(agri);
  const valueText = useCountUp(latest.value, inView);
  const changeText = useCountUp(Math.abs(change), inView, 0);

  return (
    <section id="ts2-fields" style={{ background: INK }}>
      <div className="relative h-[70vh] min-h-[440px] overflow-hidden">
        <img
          ref={img}
          src="/essay/stakes-flood.jpg"
          alt="A maize field standing in flood water after heavy rain"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}b3 0%, ${INK}26 45%, ${INK} 100%)` }} />
        <Grain />
        <div ref={ref} className="relative h-full max-w-[1180px] mx-auto px-6 flex flex-col justify-end pb-12">
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 04 · The fields</p>
          <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
            The sector that barely moved.
          </h2>
          <div className="mt-5 flex flex-wrap gap-x-12 gap-y-5 items-end">
            <div>
              <div className="text-[42px] sm:text-[56px] font-bold tabular-nums leading-none" style={{ color: CREAM }}>{valueText}</div>
              <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                Mt CO₂e from agriculture · {latest.year}
              </div>
            </div>
            <div>
              <div className="text-[42px] sm:text-[56px] font-bold tabular-nums leading-none" style={{ color: EMBER }}>−{changeText} %</div>
              <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                in seventeen years · 2005–{latest.year}
              </div>
            </div>
            <p className="max-w-md text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.75)' }}>
              Methane from herds, nitrous oxide from fields — farming&apos;s emissions are almost
              flat while floods and droughts hit its own yields. The report&apos;s answer: point
              the CAP at the climate, and price what was never priced
              (Key recommendations 9 &amp; 13).
            </p>
          </div>
        </div>
      </div>
      {/* the living pasture */}
      <PastureScene />
      <div className="max-w-[1180px] mx-auto px-6 py-5 flex flex-wrap gap-x-8 gap-y-1.5 text-[11px]" style={{ color: 'rgba(244,234,216,0.45)' }}>
        <span>CH₄ — enteric fermentation &amp; manure</span>
        <span>N₂O — fertilised soils</span>
        <span>No standalone CAP emissions objective — yet</span>
        <span className="ml-auto" style={{ color: 'rgba(244,234,216,0.6)' }}>2030 benchmark: {fmt(agri.benchmarks?.find(b => b.year === 2030)?.low ?? 333.2)} Mt</span>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 05 — works: industry at night, wind on the ridge.
// ─────────────────────────────────────────────────────────────────────────────

function WorksChapter() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const industry = sectorById('industry');
  const energy = sectorById('energy-supply');
  const iLatest = industry.series[industry.series.length - 1];
  const eLatest = energy.series[energy.series.length - 1];
  const iText = useCountUp(iLatest.value, inView);
  const eText = useCountUp(eLatest.value, inView);

  const levers = [
    { name: 'Solar PV build-out', status: 'on track', color: TEAL },
    { name: 'Wind build-out', status: 'too slow', color: EMBER },
    { name: 'Electrification of final energy', status: 'too slow', color: EMBER },
    { name: 'Industrial circularity', status: 'too slow', color: EMBER },
    { name: 'Low-carbon steel & cement projects', status: 'mixed', color: CREAM },
  ];

  return (
    <section id="ts2-works" className="relative overflow-hidden" style={{ background: INK }}>
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[52vh] overflow-hidden">
          <img
            src="/essay/closing-industry.jpg"
            alt="Industrial processing facility photographed at night"
            className="absolute inset-0 w-full h-full object-cover ts2-kenburns-slow"
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}66, ${INK}e6)` }} />
          {/* thinning steam plumes */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {[18, 38, 62].map((l, i) => (
              <span
                key={l}
                className="ts2-plume absolute bottom-[30%] rounded-full"
                style={{
                  left: `${l}%`,
                  width: 26 + i * 8,
                  height: 26 + i * 8,
                  background: CREAM,
                  filter: 'blur(14px)',
                  animationDelay: `${i * 2.1}s`,
                }}
              />
            ))}
          </div>
          <Grain />
          <div className="relative h-full flex flex-col justify-end p-8 sm:p-10">
            <div className="text-[40px] sm:text-[50px] font-bold tabular-nums leading-none" style={{ color: CREAM }}>{iText} <span className="text-[15px] font-normal" style={{ color: 'rgba(244,234,216,0.5)' }}>Mt</span></div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>industry · {iLatest.year}</div>
          </div>
        </div>
        <div className="relative min-h-[52vh] overflow-hidden">
          <img
            src="/essay/sink-rivers.jpg"
            alt="Aerial photograph of wind farms strung along forested mountain ridges"
            className="absolute inset-0 w-full h-full object-cover ts2-kenburns-slow"
            loading="lazy"
            style={{ animationDelay: '-11s' }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}66, ${INK}e6)` }} />
          {/* turning turbines on the ridge */}
          <div className="absolute inset-x-0 bottom-[18%] flex justify-around items-end pointer-events-none" aria-hidden>
            <Turbine h={130} dur={6} />
            <Turbine h={180} dur={4.8} delay={-2} />
            <Turbine h={110} dur={7.2} delay={-4} />
          </div>
          <Grain />
          <div className="relative h-full flex flex-col justify-end p-8 sm:p-10">
            <div className="text-[40px] sm:text-[50px] font-bold tabular-nums leading-none" style={{ color: CREAM }}>{eText} <span className="text-[15px] font-normal" style={{ color: 'rgba(244,234,216,0.5)' }}>Mt</span></div>
            <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>energy supply · {eLatest.year}</div>
          </div>
        </div>
      </div>

      <div ref={ref} className="max-w-[1180px] mx-auto px-6 py-16">
        <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 05 · The works</p>
        <h2 className="mt-2 font-bold tracking-tight leading-none max-w-3xl" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
          Solar is sprinting. Almost everything else is jogging.
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.75)' }}>
          Energy supply has cut deepest since 2005 — yet wind additions, electrification and
          industrial circularity all run below the required pace. The report asks for a stable
          investment outlook for renewables, an ETS that works at a zero cap, an end to fossil
          subsidies, and CCS &amp; hydrogen saved for the jobs nothing else can do
          (Key recommendations 3, 4, 7 &amp; 10).
        </p>
        <ul className="mt-7 flex flex-wrap gap-2.5">
          {levers.map(lv => (
            <li
              key={lv.name}
              className="inline-flex items-center gap-2 text-[12.5px] border rounded-full px-3.5 py-1.5"
              style={{ borderColor: 'rgba(244,234,216,0.2)', color: 'rgba(244,234,216,0.85)' }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: lv.color }} />
              {lv.name}
              <span style={{ color: 'rgba(244,234,216,0.45)' }}>· {lv.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 06 — mobility culture: a street that changes its mind with scroll.
// ─────────────────────────────────────────────────────────────────────────────

function MobilityChapter() {
  const reduced = usePrefersReducedMotion();
  const [ref, p] = useScrollProgress<HTMLDivElement>();
  const progress = reduced ? 1 : p;
  const shift = Math.max(0, Math.min((progress - 0.42) / 0.22, 1)); // 0 = car era, 1 = people era
  const transport = sectorById('transport');
  const tLatest = transport.series[transport.series.length - 1];
  const tChange = sectorChange(transport);

  return (
    <section id="ts2-mobility" ref={ref} className="relative" style={{ height: '300vh', background: INK }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <img
          src="/essay/sectors-rail.jpg"
          alt="Aerial photograph of a railway line crossing dense forest"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.34 + shift * 0.18, transition: 'opacity 400ms ease' }}
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}e6 0%, ${INK}66 45%, ${INK} 100%)` }} />
        <Grain />

        <div className="relative max-w-[1180px] w-full mx-auto px-6" style={{ paddingTop: 'max(9vh, 96px)' }}>
          <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 06 · Mobility culture</p>
          <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
            {shift < 0.5 ? <>Stuck since 2005.</> : <>Another street is possible.</>}
          </h2>
          <div className="mt-4 grid sm:grid-cols-[auto_minmax(0,1fr)] gap-x-12 gap-y-4 items-start">
            <div className="flex gap-x-10">
              <div>
                <div className="text-[38px] sm:text-[48px] font-bold tabular-nums leading-none" style={{ color: tChange >= 0 ? EMBER : TEAL }}>
                  {tChange >= 0 ? '+' : '−'}{Math.abs(tChange).toFixed(0)} %
                </div>
                <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                  transport emissions vs 2005
                </div>
              </div>
              <div>
                <div className="text-[38px] sm:text-[48px] font-bold tabular-nums leading-none" style={{ color: CREAM }}>{fmt(tLatest.value)}</div>
                <div className="mt-1.5 text-[11px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,234,216,0.55)' }}>
                  Mt CO₂e · {tLatest.year}
                </div>
              </div>
            </div>
            <p className="max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.75)' }}>
              {shift < 0.5 ? (
                <>The EU&apos;s most stubborn sector: seventeen years bought a single-digit cut,
                with ~90&nbsp;% of its energy still fossil. Keep scrolling — the report
                doesn&apos;t stop at engines.</>
              ) : (
                <>Vehicle standards alone don&apos;t close this gap. The report calls for cutting
                transport <em>demand</em> itself — rail, cycling, public transport, fewer and
                lighter vehicles: a change of mobility culture, not just of fuel
                (Key recommendation 12).</>
              )}
            </p>
          </div>
        </div>

        {/* the street */}
        <div className="relative flex-1" aria-hidden>
          {/* road surface */}
          <div className="absolute inset-x-0 bottom-0 h-[120px]" style={{ background: '#171109' }} />
          <div className="absolute inset-x-0 bottom-[120px] border-t" style={{ borderColor: 'rgba(244,234,216,0.25)' }} />
          <div
            className="absolute inset-x-0 bottom-[58px] border-t-2 border-dashed"
            style={{ borderColor: 'rgba(244,234,216,0.25)' }}
          />
          {/* car era */}
          <div style={{ opacity: 1 - shift, transition: 'opacity 400ms ease' }}>
            <div className="ts2-drive absolute bottom-[126px] h-[64px]"><Car /></div>
            <div className="ts2-drive absolute bottom-[14px] h-[56px]" style={{ animationDelay: '-7s', animationDuration: '13s', transform: 'scaleX(-1)' }}><Car /></div>
            <div className="ts2-drive absolute bottom-[132px] h-[50px]" style={{ animationDelay: '-3.4s', animationDuration: '9s' }}><Car /></div>
          </div>
          {/* people era */}
          <div style={{ opacity: shift, transition: 'opacity 400ms ease' }}>
            <div className="ts2-glide absolute bottom-[118px] h-[86px]"><Tram /></div>
            <div className="ts2-ride absolute bottom-[8px] h-[100px]"><Cyclist /></div>
            <div className="ts2-stroll absolute bottom-[16px]"><Walker h={70} /></div>
            <div className="ts2-stroll absolute bottom-[16px]" style={{ animationDelay: '-19s' }}><Walker h={56} delay={0.3} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 07 — the ledger: where it's heading vs where it must be, by sector.
// ─────────────────────────────────────────────────────────────────────────────

function LedgerRow({ sector, maxAbs }: { sector: PanoramaNode; maxAbs: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const latest = sector.series[sector.series.length - 1];
  const bench = sector.benchmarks?.find(b => b.year === 2030);
  const latestText = useCountUp(Math.abs(latest.value), inView);
  if (!bench) return null;
  // Works for sinks too: −244 today vs a −310 target leaves +66 Mt to close.
  const gap = latest.value - bench.low;
  const nowPct = (Math.abs(latest.value) / maxAbs) * 100;
  const benchPct = (Math.abs(bench.low) / maxAbs) * 100;

  return (
    <div ref={ref} className="py-6 sm:py-7 border-b" style={{ borderColor: 'rgba(244,234,216,0.12)' }}>
      <div className="grid sm:grid-cols-[210px_minmax(0,1fr)_auto] items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-[17px] sm:text-[19px] font-bold tracking-tight" style={{ color: CREAM }}>{sector.name}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'rgba(244,234,216,0.45)' }}>
            {sector.isSink ? 'net removals' : 'net emissions'} · {latest.year}: {sector.isSink ? '−' : ''}{latestText} Mt
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-[7px] rounded-full flex-1 overflow-hidden" style={{ background: 'rgba(244,234,216,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: inView ? `${nowPct}%` : '0%',
                  background: CREAM,
                  transition: 'width 1100ms cubic-bezier(0.2,0,0,1) 100ms',
                }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] w-[68px]" style={{ color: 'rgba(244,234,216,0.45)' }}>today</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[7px] rounded-full flex-1 overflow-hidden" style={{ background: 'rgba(244,234,216,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: inView ? `${benchPct}%` : '0%',
                  background: TEAL,
                  transition: 'width 1100ms cubic-bezier(0.2,0,0,1) 250ms',
                }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] w-[68px]" style={{ color: TEAL }}>2030</span>
          </div>
        </div>
        <div
          className="justify-self-start sm:justify-self-end text-[12px] font-semibold tabular-nums px-3 py-1.5 rounded-full"
          style={{
            color: gap > 0 ? '#ffb289' : TEAL,
            background: gap > 0 ? 'rgba(242,97,25,0.13)' : 'rgba(116,203,200,0.13)',
          }}
        >
          {gap > 0 ? `${fmt(gap)} Mt still to close` : 'on the line'}
        </div>
      </div>
    </div>
  );
}

function Ledger() {
  const rows = PANORAMA_SECTORS.filter(s => s.benchmarks?.some(b => b.year === 2030));
  const maxAbs = Math.max(...rows.map(s => Math.abs(s.series[s.series.length - 1].value)));
  return (
    <section id="ts2-ledger" className="py-20 sm:py-28" style={{ background: INK }}>
      <div className="max-w-[1180px] mx-auto px-6">
        <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 07 · The ledger</p>
        <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
          Seven sectors, one deadline.
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.7)' }}>
          Where each sector stands today against its 2030 benchmark — cream is the present,
          teal is the obligation, the badge is the distance between them.
        </p>
        <div className="mt-8">
          {rows.map(s => (
            <LedgerRow key={s.id} sector={s} maxAbs={maxAbs} />
          ))}
        </div>
        <p className="mt-4 text-[11px]" style={{ color: 'rgba(244,234,216,0.4)' }}>
          EEA GHG inventory via the progress-report workbook · 2030 benchmarks from the Fit for 55
          MIX scenario and the LULUCF Regulation, as compiled for the EU Transition Panorama (M·21).
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter 08 — the thirteen messages, in three acts.
// ─────────────────────────────────────────────────────────────────────────────

function RecCard({ no, title, body, tag, index }: { no: number; title: string; body: string; tag: string; index: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.25);
  return (
    <div
      ref={ref}
      className={`${inView ? 'ts2-rise' : 'opacity-0'} relative border rounded-2xl p-6 sm:p-8 flex flex-col`}
      style={{ borderColor: 'rgba(244,234,216,0.18)', background: 'rgba(244,234,216,0.025)', animationDelay: `${(index % 4) * 110}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-bold tabular-nums leading-none" style={{ fontSize: 'clamp(40px, 4.4vw, 64px)', color: 'rgba(244,234,216,0.16)' }}>
          {String(no).padStart(2, '0')}
        </span>
        <span
          className="text-[10px] tracking-[0.22em] uppercase border rounded-full px-3 py-1 mt-1.5 whitespace-nowrap"
          style={{ borderColor: 'rgba(244,234,216,0.25)', color: 'rgba(244,234,216,0.6)' }}
        >
          {tag}
        </span>
      </div>
      <h3 className="mt-4 text-[20px] sm:text-[22px] font-bold tracking-tight leading-snug" style={{ color: CREAM }}>{title}</h3>
      <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.65)' }}>{body}</p>
    </div>
  );
}

function Messages() {
  return (
    <section id="ts2-messages" className="py-20 sm:py-28" style={{ background: INK }}>
      <div className="max-w-[1180px] mx-auto px-6">
        <p className="text-[11px] tracking-[0.3em] uppercase font-semibold" style={{ color: TEAL }}>Chapter 08 · The big messages</p>
        <h2 className="mt-2 font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(30px, 4.6vw, 56px)', color: CREAM }}>
          Thirteen ways to close a gap.
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.7)' }}>
          The Advisory Board&apos;s key recommendations, condensed. The full argument — and
          every caveat — is in the report.
        </p>

        {ACTS.map(act => (
          <div key={act.act} className="mt-14">
            <div className="flex items-baseline gap-4 border-b border-dashed pb-3" style={{ borderColor: 'rgba(244,234,216,0.22)' }}>
              <span className="text-[11px] tracking-[0.3em] uppercase" style={{ color: EMBER }}>{act.act}</span>
              <h3 className="text-[22px] sm:text-[26px] font-bold tracking-tight" style={{ color: CREAM }}>{act.title}</h3>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
              {act.recs.map((r, i) => (
                <RecCard key={r.no} {...r} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Closing — the turbine field at dawn, and where to go next.
// ─────────────────────────────────────────────────────────────────────────────

function Closing() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <section id="ts2-closing" className="pb-10" style={{ background: INK }}>
      <div className="relative overflow-hidden">
        <img
          src="/essay2/energy-turbine.jpg"
          alt="Aerial photograph looking straight down a wind turbine beside a solar-roofed factory"
          className="absolute inset-0 w-full h-full object-cover opacity-35 ts2-kenburns-slow"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK} 0%, transparent 50%, ${INK} 100%)` }} />
        <Grain />
        <div ref={ref} className={`relative max-w-[1180px] mx-auto px-6 py-24 sm:py-32 ${inView ? 'ts2-rise' : 'opacity-0'}`}>
          <h2 className="font-bold tracking-tight leading-[1.02] max-w-3xl" style={{ fontSize: 'clamp(34px, 5.4vw, 64px)', color: CREAM }}>
            The gap is not destiny.
            <br />
            <span style={{ color: TEAL }}>It is a to-do list.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.72)' }}>
            Thirteen recommendations, one decade to act on them. Explore the live indicators
            behind every chart, or step back into the first Transition Stories essay.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/policy-navigator"
              className="inline-flex items-center gap-2 rounded-full font-semibold text-[13px] px-5 py-2.5 transition-colors"
              style={{ background: TEAL, color: INK }}
            >
              Open the live Policy Gap indicators →
            </Link>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 rounded-full border font-semibold text-[13px] px-5 py-2.5 transition-colors hover:border-white/70"
              style={{ borderColor: 'rgba(244,234,216,0.35)', color: CREAM }}
            >
              Track the recommendations
            </Link>
            <Link
              href="/beta/transition-stories"
              className="inline-flex items-center gap-2 rounded-full border font-semibold text-[13px] px-5 py-2.5 transition-colors hover:border-white/70"
              style={{ borderColor: 'rgba(244,234,216,0.35)', color: CREAM }}
            >
              Part I — Transition Stories
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-6 pt-10 border-t border-dashed" style={{ borderColor: 'rgba(244,234,216,0.18)' }}>
        <div className="grid sm:grid-cols-3 gap-x-10 gap-y-5">
          <div>
            <h3 className="text-[10.5px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(244,234,216,0.45)' }}>Report</h3>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.6)' }}>
              ESABCC (2024), <em>Towards EU climate neutrality: Progress, policy gaps and
              opportunities</em> — assessment report under Article 3 of the European Climate Law.
              The 13 recommendations above are editorial condensations of pp. 8–13.
            </p>
          </div>
          <div>
            <h3 className="text-[10.5px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(244,234,216,0.45)' }}>Data</h3>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.6)' }}>
              EEA GHG inventory and Member State WAM projections; European Climate Law targets;
              ESABCC 2040-advice pathway; Fit for 55 MIX benchmarks — all via the series shared
              with the EU Transition Panorama (M·21) and the Policy Gap indicator registry.
              Derived figures (pace ×{PACE_RATIO.toFixed(1)}, gaps, cumulative {Math.round(CUM_GT)} Gt) are computed
              from those series in this page&apos;s source.
            </p>
          </div>
          <div>
            <h3 className="text-[10.5px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(244,234,216,0.45)' }}>Photography &amp; scenes</h3>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(244,234,216,0.6)' }}>
              All photography is taken from the published covers and pages of ESABCC reports
              (2040-target advice, energy-infrastructure advice, CDR report, adaptation report,
              agri-food report, progress report, TEN-E advice). The animated pasture, street and
              turbine vignettes are original silhouette illustrations — no stock, no clip-art.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter rail + shell
// ─────────────────────────────────────────────────────────────────────────────

const CHAPTERS: { id: string; label: string }[] = [
  { id: 'ts2-hero', label: 'Mind the gap' },
  { id: 'ts2-gap', label: '01 · The distance' },
  { id: 'ts2-water', label: '02 · Water & land' },
  { id: 'ts2-fire', label: '03 · Fire' },
  { id: 'ts2-fields', label: '04 · The fields' },
  { id: 'ts2-works', label: '05 · The works' },
  { id: 'ts2-mobility', label: '06 · Mobility culture' },
  { id: 'ts2-ledger', label: '07 · The ledger' },
  { id: 'ts2-messages', label: '08 · The big messages' },
  { id: 'ts2-closing', label: 'Coda' },
];

function ChapterRail() {
  const [active, setActive] = useState('ts2-hero');
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (v) setActive(v.target.id);
      },
      { threshold: [0.12, 0.35] },
    );
    CHAPTERS.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <nav
      aria-label="Chapters"
      className="hidden xl:flex flex-col gap-3 fixed right-6 top-1/2 -translate-y-1/2 z-40"
    >
      {CHAPTERS.map(c => (
        <button
          key={c.id}
          onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth' })}
          className="group flex items-center justify-end gap-2.5"
          aria-label={c.label}
        >
          <span
            className="text-[10px] tracking-[0.18em] uppercase opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(244,234,216,0.7)' }}
          >
            {c.label}
          </span>
          <span
            className="block rounded-full transition-all"
            style={{
              width: active === c.id ? 22 : 7,
              height: 7,
              background: active === c.id ? EMBER : 'rgba(244,234,216,0.3)',
            }}
          />
        </button>
      ))}
    </nav>
  );
}

export default function TransitionStories2() {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    <div ref={wrapRef} style={{ background: INK }}>
      <div className="sticky top-0 z-40 h-[3px]" style={{ background: 'rgba(244,234,216,0.1)' }}>
        <div ref={barRef} className="h-full w-0" style={{ background: `linear-gradient(90deg, ${TEAL}, ${EMBER})` }} />
      </div>
      <ChapterRail />

      <Hero />
      <Prologue />
      <GapScrolly />
      <ChapterRule no="→" label="What the gap looks like on the ground" />
      <WaterChapter />
      <FireChapter />
      <FieldsChapter />
      <WorksChapter />
      <MobilityChapter />
      <ChapterRule no="Σ" label="The account, and the answer" />
      <Ledger />
      <Messages />
      <Closing />

      <style jsx global>{`
        @keyframes ts2-kenburns-kf {
          from { transform: scale(1); }
          to { transform: scale(1.09) translateY(-1.5%); }
        }
        .ts2-kenburns { animation: ts2-kenburns-kf 22s ease-in-out infinite alternate; }
        .ts2-kenburns-slow { animation: ts2-kenburns-kf 34s ease-in-out infinite alternate; }

        @keyframes ts2-rise-kf {
          from { opacity: 0; transform: translateY(26px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ts2-rise { animation: ts2-rise-kf 900ms cubic-bezier(0.2, 0, 0, 1) both; }

        @keyframes ts2-scrollcue-kf {
          0% { transform: translateY(-16px); }
          70%, 100% { transform: translateY(40px); }
        }
        .ts2-scrollcue { animation: ts2-scrollcue-kf 1.8s cubic-bezier(0.3, 0, 0.4, 1) infinite; }

        @keyframes ts2-marquee-kf {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ts2-marquee { animation: ts2-marquee-kf 40s linear infinite; }

        @keyframes ts2-flow-kf {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -170; }
        }
        .ts2-flow { animation: ts2-flow-kf 8s linear infinite; }

        @keyframes ts2-glint-kf {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.75; }
        }
        .ts2-glint { animation: ts2-glint-kf 4.5s ease-in-out infinite; }

        @keyframes ts2-ember-kf {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          12% { opacity: 0.9; }
          100% { transform: translateY(-380px) translateX(36px); opacity: 0; }
        }
        .ts2-ember { animation: ts2-ember-kf 6s ease-out infinite; }

        @keyframes ts2-glow-kf {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .ts2-glow { animation: ts2-glow-kf 3.4s ease-in-out infinite; }

        @keyframes ts2-plume-kf {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          18% { opacity: 0.16; }
          100% { transform: translateY(-220px) scale(1.7); opacity: 0; }
        }
        .ts2-plume { animation: ts2-plume-kf 7.5s ease-out infinite; }

        @keyframes ts2-cloud-kf {
          from { transform: translateX(-30%); }
          to { transform: translateX(160%); }
        }
        .ts2-cloud { animation: ts2-cloud-kf 58s linear infinite; }

        @keyframes ts2-sway-kf {
          from { transform: rotate(-3deg); }
          to { transform: rotate(3.5deg); }
        }
        .ts2-sway { animation: ts2-sway-kf 2.6s ease-in-out infinite alternate; }

        @keyframes ts2-tail-kf {
          0%, 55%, 100% { transform: rotate(0deg); }
          70% { transform: rotate(9deg); }
          85% { transform: rotate(-5deg); }
        }
        .ts2-tail { animation: ts2-tail-kf 5.2s ease-in-out infinite; }

        @keyframes ts2-graze-kf {
          0%, 14% { transform: rotate(0deg); }
          26%, 64% { transform: rotate(33deg); }
          76%, 100% { transform: rotate(0deg); }
        }
        .ts2-graze { animation: ts2-graze-kf 9s ease-in-out infinite; }

        @keyframes ts2-spin-kf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ts2-spin { animation: ts2-spin-kf 1.7s linear infinite; }

        @keyframes ts2-rotor-kf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ts2-rotor { animation: ts2-rotor-kf 6s linear infinite; }

        @keyframes ts2-beacon-kf {
          0%, 88%, 100% { opacity: 0.15; }
          94% { opacity: 1; }
        }
        .ts2-beacon { animation: ts2-beacon-kf 2.8s linear infinite; }

        @keyframes ts2-poseA-kf {
          0%, 49.9% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ts2-poseB-kf {
          0%, 49.9% { opacity: 0; }
          50%, 100% { opacity: 1; }
        }
        .ts2-poseA { animation: ts2-poseA-kf 0.85s steps(1) infinite; }
        .ts2-poseB { animation: ts2-poseB-kf 0.85s steps(1) infinite; }

        @keyframes ts2-drive-kf {
          from { left: -16%; }
          to { left: 108%; }
        }
        .ts2-drive { animation: ts2-drive-kf 11s linear infinite; }

        @keyframes ts2-ride-kf {
          from { left: -14%; }
          to { left: 106%; }
        }
        .ts2-ride { animation: ts2-ride-kf 24s linear infinite; }

        @keyframes ts2-glide-kf {
          from { right: -30%; left: auto; }
          to { right: 112%; left: auto; }
        }
        .ts2-glide { animation: ts2-glide-kf 34s linear infinite; }

        @keyframes ts2-stroll-kf {
          from { left: 104%; }
          to { left: -8%; }
        }
        .ts2-stroll { animation: ts2-stroll-kf 46s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .ts2-kenburns, .ts2-kenburns-slow, .ts2-scrollcue, .ts2-marquee,
          .ts2-flow, .ts2-glint, .ts2-ember, .ts2-glow, .ts2-plume,
          .ts2-cloud, .ts2-sway, .ts2-tail, .ts2-graze, .ts2-spin,
          .ts2-rotor, .ts2-beacon, .ts2-poseA, .ts2-poseB,
          .ts2-drive, .ts2-ride, .ts2-glide, .ts2-stroll {
            animation: none;
          }
          .ts2-poseB { opacity: 0; }
          .ts2-rise { animation: none; opacity: 1; }
          .ts2-drive, .ts2-ride { left: 30%; }
          .ts2-stroll { left: 60%; }
          .ts2-glide { right: 20%; }
        }
      `}</style>
    </div>
  );
}
