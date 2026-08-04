'use client';

/**
 * Wildfires & the Land Sink — shared presentation kit for the `analyses/`
 * sub-modules (M · 41 · A1-A7).
 *
 * Each analysis page is a thin layer over its own pure model file, exactly as
 * the parent module's `page.tsx` is over `model.ts`. This file keeps the seven
 * pages visually identical to the parent module without copy-pasting the
 * controls into each one: same palette, same slider, same stat cards, same
 * hand-rolled-SVG conventions (fixed viewBox, responsive via `w-full`).
 *
 * The `AnalysisShell` also carries the shared honesty banner: every analysis
 * inherits the parent module's status — beta, illustrative arithmetic,
 * not an ESABCC position, not suitable for citation as a quantitative finding.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { fmt } from '../model';

/* ─────────────────────────────────────────────────────── palette + utils */

/** Same rounding trick as the parent page — avoids SVG hydration mismatches. */
export const R = (v: number) => Math.round(v * 10) / 10;

export const C = {
  fire: '#B83230',
  fireLight: '#E0A09F',
  ember: '#FF9933',
  sink: '#007B6C',
  sinkLight: '#74CBC8',
  plan: '#004B7F',
  planLight: '#7495B2',
  grid: '#E6E7E8',
  axis: '#808285',
  ink: '#3D5265',
};

/* ─────────────────────────────────────────────────────────────── controls */

export function Slider(props: {
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

export function ControlGroup({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/40 bg-surface-blue' : 'border-grey-200 bg-white'}`}>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-[0.1em] ${accent ? 'text-primary' : 'text-tertiary'}`}>
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

export function Stat({ value, unit, label, sub, tone = 'default' }: {
  value: string; unit?: string; label: string; sub?: string;
  tone?: 'default' | 'fire' | 'sink' | 'plan';
}) {
  const tones = {
    default: 'border-grey-200 bg-white',
    fire: 'border-accent-red/30 bg-[#FDF3F3]',
    sink: 'border-secondary/30 bg-surface-teal',
    plan: 'border-primary/30 bg-surface-blue',
  };
  const colors = {
    default: 'text-primary',
    fire: 'text-accent-red',
    sink: 'text-secondary-dark',
    plan: 'text-primary',
  };
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

export function Section({ eyebrow, title, lede, children }: {
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

/** The one-paragraph finding box every analysis leads with. */
export function Finding({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-accent-red bg-[#FDF3F3] p-5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-red">
        What this analysis finds
      </div>
      <div className="text-[14px] leading-relaxed text-tertiary-dark">{children}</div>
    </div>
  );
}

export function Caveat({ title = 'Read this first', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-4 text-[12.5px] leading-relaxed text-tertiary">
      <span className="font-bold text-tertiary-dark">{title}. </span>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── shell */

/** Registry of the seven analyses — single source for breadcrumbs, the
 *  overview page's cards, and the prev/next footer links. */
export type AnalysisMeta = {
  slug: string;
  code: string;
  title: string;
  question: string;
  gapType: 'ambition gap' | 'policy gap' | 'implementation gap' | 'inconsistency' | 'method' | 'evidence';
};

export const ANALYSES: AnalysisMeta[] = [
  {
    slug: 'member-states',
    code: 'A1',
    title: 'Whose sink burns?',
    question: 'Fire is Iberian and Mediterranean; the big sinks are not. What does the per-country arithmetic look like against the Annex IIa targets?',
    gapType: 'ambition gap',
  },
  {
    slug: 'disturbance-flexibility',
    code: 'A2',
    title: 'The paper wedge',
    question: 'How many Mt of fire emissions could legally leave the compliance accounts through the natural-disturbance mechanism while staying in the atmosphere?',
    gapType: 'inconsistency',
  },
  {
    slug: 'prevention',
    code: 'A3',
    title: 'The cheapest removal not being bought',
    question: 'What does one avoided hectare cost, and what is the implied €/tCO₂ against €400/t engineered removals?',
    gapType: 'policy gap',
  },
  {
    slug: 'hindcast',
    code: 'A4',
    title: 'Hindcast: did fire shrink the sink?',
    question: 'The sink fell ~70 Mt from 2016-18 to 2023. Run the cohort model backwards over 2006-2024: how much of that can fire explain?',
    gapType: 'evidence',
  },
  {
    slug: 'crcf-reversal',
    code: 'A5',
    title: 'Certified today, burnt tomorrow',
    question: 'How large a buffer pool does carbon-farming certification need if the land it certifies burns at each growth rate?',
    gapType: 'policy gap',
  },
  {
    slug: 'natura2000',
    code: 'A6',
    title: 'The protected land burns first',
    question: '39% of the 2025 burnt area fell inside Natura 2000. What does that do to the land the Nature Restoration Law is counting on?',
    gapType: 'implementation gap',
  },
  {
    slug: 'fwi-scenarios',
    code: 'A7',
    title: 'Which growth rate is climate-consistent?',
    question: 'Benchmark the growth dial against published climate-fire projections: what do 1.5, 2 and 3 °C imply for the slider?',
    gapType: 'method',
  },
];

export const GAP_TYPE_COLORS: Record<AnalysisMeta['gapType'], string> = {
  'ambition gap': '#FF9933',
  'policy gap': '#B83230',
  'implementation gap': '#0065A4',
  inconsistency: '#6667AB',
  method: '#54728C',
  evidence: '#007B6C',
};

export function AnalysisShell({ meta, headline, lede, children }: {
  meta: AnalysisMeta;
  /** The page H1 — usually sharper than the registry title. */
  headline: ReactNode;
  lede: ReactNode;
  children: ReactNode;
}) {
  const i = ANALYSES.findIndex((a) => a.slug === meta.slug);
  const prev = i > 0 ? ANALYSES[i - 1] : null;
  const next = i < ANALYSES.length - 1 ? ANALYSES[i + 1] : null;

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />

      <div className="border-b border-grey-200 bg-gradient-to-b from-[#FDF3F3] to-white">
        <div className="mx-auto max-w-content px-6 py-12">
          <nav className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-tertiary">
            <Link href="/beta/wildfire-sink-risk" className="hover:text-primary hover:underline">
              M · 41 Wildfires &amp; the land sink
            </Link>
            <span aria-hidden>→</span>
            <Link href="/beta/wildfire-sink-risk/analyses" className="hover:text-primary hover:underline">
              Analyses
            </Link>
            <span aria-hidden>→</span>
            <span className="text-tertiary-dark">
              {meta.code} · {meta.title}
            </span>
          </nav>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="rounded bg-accent-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              M · 41 · {meta.code} — beta
            </span>
            <span
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ color: GAP_TYPE_COLORS[meta.gapType], borderColor: GAP_TYPE_COLORS[meta.gapType] }}
            >
              {meta.gapType}
            </span>
          </div>

          <h1 className="max-w-3xl text-[34px] font-bold leading-[1.14] text-tertiary-dark">{headline}</h1>
          <p className="mt-5 max-w-text text-[15px] leading-relaxed text-tertiary">{lede}</p>
        </div>
      </div>

      <div className="mx-auto max-w-content px-6">{children}</div>

      <div className="mx-auto max-w-content px-6">
        <div className="flex items-center justify-between gap-4 border-t border-grey-200 py-8 text-[12px] font-semibold">
          {prev ? (
            <Link href={`/beta/wildfire-sink-risk/analyses/${prev.slug}`} className="text-primary hover:underline">
              ← {prev.code} · {prev.title}
            </Link>
          ) : (
            <Link href="/beta/wildfire-sink-risk/analyses" className="text-primary hover:underline">
              ← All analyses
            </Link>
          )}
          {next ? (
            <Link href={`/beta/wildfire-sink-risk/analyses/${next.slug}`} className="text-right text-primary hover:underline">
              {next.code} · {next.title} →
            </Link>
          ) : (
            <Link href="/beta/wildfire-sink-risk/analyses" className="text-right text-primary hover:underline">
              Back to all analyses →
            </Link>
          )}
        </div>
        <p className="border-t border-grey-200 py-6 text-[11.5px] leading-relaxed text-tertiary">
          <strong className="text-tertiary-dark">Status.</strong> Beta analysis under M · 41, illustrative arithmetic
          only. Not an ESABCC position, not a projection, not suitable for citation as a quantitative finding. All
          assumptions inherit from the parent module&apos;s model and are documented on this page where they differ.
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
