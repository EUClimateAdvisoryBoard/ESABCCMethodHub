'use client';

/**
 * Climate Investment vs Rearmament — the Fiscal Squeeze (beta module M · 51).
 *
 * A transparent accounting board for the MFF 2028–34 negotiation, where
 * climate investment, rearmament and debt rules compete for the same euros:
 *   1. NEED — published climate-investment-need estimates as labelled,
 *      scope-annotated rows that are deliberately NON-comparable and are
 *      never averaged.
 *   2. COMMITTED — what EU climate money actually exists (MFF mainstreaming,
 *      the expiring RRF, ETS revenues, the proposed Industrial
 *      Decarbonisation Bank, the Social Climate Fund), one sourced row each.
 *   3. DEFENCE — the rearmament trajectory (Hague 3.5 % + 1.5 %, SAFE,
 *      escape clauses), sourced rows, not projections.
 *   4. THE SQUEEZE — the crowd-out share (how much of the defence increment
 *      displaces public climate investment) as the HEADLINE slider,
 *      explicitly labelled a political variable, with Conservative /
 *      Central / Maximalist presets. Deterministic arithmetic in model.ts.
 *   5. ALIGNMENTS recorded alongside (ground rule 9): dual-use overlaps
 *      where security spending IS climate-adjacent.
 *
 * Epistemic status: AI-compiled 2026-08, pending Secretariat verification.
 * This is the highest-fabrication-risk topic in the proposal round — every
 * figure carries its own locator and confidence flag in data.generated.ts,
 * ranges are shown rather than averages, and the crowd-out share is
 * presented as unknowable rather than estimated.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ALIGNMENT_ROWS,
  COMMITTED_ROWS,
  CURRENT_CLIMATE_INVEST_BN,
  CURRENT_DEFENCE_PCT,
  DEFENCE_ROWS,
  EU_GDP_2024_BN,
  LedgerRow,
  NEED_ROWS,
  Confidence,
} from './data.generated';
import {
  DEFAULTS,
  HAGUE_BROADER_PCT,
  HAGUE_CORE_PCT,
  Params,
  PRESETS,
  RAMP_END,
  RAMP_START,
  RAMP_YEARS,
  computeSqueeze,
} from './model';

/* ------------------------------------------------------------- palette */
// Chart series palette (the only raw hex on this page). Chosen for
// colour-vision deficiency: blue / green / red-brown / orange / violet
// remain distinguishable under deuteranopia and protanopia, and every
// series is also separated by position and label, never by hue alone.
const C = {
  need: '#0065A4', // need side
  committed: '#1F8F63', // committed climate money
  defence: '#B83230', // defence trajectory
  squeeze: '#E0701A', // the displaced (squeezed) share
  dual: '#6667AB', // dual-use / alignment
} as const;

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ------------------------------------------------------------ UI bits */

function ConfidenceChip({ level }: { level: Confidence }) {
  const cls =
    level === 'high'
      ? 'bg-surface-green text-secondary'
      : level === 'medium'
        ? 'bg-surface-yellow text-tertiary-dark'
        : 'bg-surface-orange text-tertiary-dark';
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${cls}`}
      title="Compile-time confidence of the AI-compiled figure — not a verification verdict."
    >
      {level === 'high' ? 'confidence: high' : level === 'medium' ? 'pending verification' : 'low confidence'}
    </span>
  );
}

function StatusChip({ status }: { status: LedgerRow['status'] }) {
  const cls =
    status === 'in force'
      ? 'bg-surface-green text-secondary'
      : status === 'expiring'
        ? 'bg-surface-orange text-tertiary-dark'
        : status === 'proposed'
          ? 'bg-surface-blue text-primary'
          : 'bg-grey-100 text-tertiary';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function LedgerCard({ row, accent }: { row: LedgerRow; accent: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[12.5px] font-bold text-tertiary-dark">
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-baseline" style={{ background: accent }} />
          {row.label}
        </p>
        <span className="flex shrink-0 gap-1.5">
          <StatusChip status={row.status} />
          <ConfidenceChip level={row.confidence} />
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[13px] font-bold tabular-nums text-tertiary-dark">{row.amountLabel}</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-tertiary">{row.scope}</p>
      {row.note && <p className="mt-1.5 text-[11px] leading-snug text-tertiary">{row.note}</p>}
      <p className="mt-2 text-[10.5px] text-tertiary">
        <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
          {row.source} ↗
        </a>{' '}
        · {row.locator}
      </p>
    </div>
  );
}

/* ---------------------------------------- need comparison (NOT one bar) */

function NeedComparison({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const axisMax = 1000; // €bn/yr — shared axis for reading off values only, NOT for comparison.
  const W = 720;
  const rowH = 92;
  const m = { l: 8, r: 12, t: 26, b: 22 };
  const H = m.t + NEED_ROWS.length * rowH + m.b;
  const barLeft = 200;
  const iw = W - barLeft - m.r;
  const sx = (v: number) => barLeft + (v / axisMax) * iw;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Published climate-investment-need estimates, one scope-annotated row each — not comparable with one another">
        {/* shared axis, labelled as a reading aid only */}
        {[0, 250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line x1={sx(v)} x2={sx(v)} y1={m.t - 6} y2={H - m.b} stroke="#E6E7E8" strokeWidth={1} />
            <text x={sx(v)} y={H - 8} textAnchor="middle" fontSize={9.5} className="fill-grey-500">
              {fmt(v)}
            </text>
          </g>
        ))}
        <text x={W - m.r} y={H - 8} textAnchor="end" fontSize={9.5} className="fill-grey-500">
          €bn/yr
        </text>
        <text x={barLeft} y={m.t - 12} fontSize={10} fontWeight={700} className="fill-accent-orange">
          ⚠ each row measures something different — read rows singly, never compare heights or average
        </text>
        {NEED_ROWS.map((r, i) => {
          const y = m.t + i * rowH;
          const selected = r.id === selectedId;
          const barY = y + 14;
          return (
            <g key={r.id} onClick={() => onSelect(r.id)} className="cursor-pointer">
              <rect x={0} y={y} width={W} height={rowH - 8} rx={6} fill={selected ? '#F2F6F8' : 'transparent'} stroke={selected ? C.need : '#E6E7E8'} strokeWidth={selected ? 1.5 : 1} />
              <text x={m.l + 6} y={y + 18} fontSize={11} fontWeight={700} className="fill-tertiary-dark">
                {r.label}
              </text>
              <text x={m.l + 6} y={y + 32} fontSize={9.5} className="fill-grey-600">
                {r.period}
              </text>
              <text x={m.l + 6} y={y + 46} fontSize={9} className="fill-grey-500">
                {r.gapComputable ? '€ gap computable (need + actual, same scope)' : 'no like-for-like actual — € gap not computable'}
              </text>
              {/* range bar */}
              <line x1={barLeft} x2={W - m.r} y1={barY} y2={barY} stroke="#F3F4F5" strokeWidth={10} />
              <line x1={sx(r.lo)} x2={sx(Math.max(r.hi, r.lo + 6))} y1={barY} y2={barY} stroke={C.need} strokeWidth={10} strokeLinecap="round" opacity={selected ? 1 : 0.55} />
              <text x={sx(r.hi) + 8} y={barY + 3.5} fontSize={10.5} fontWeight={700} className="fill-tertiary-dark" style={{ fontFamily: 'ui-monospace, monospace' }}>
                {r.lo === r.hi ? `≈ ${fmt(r.lo)}` : `${fmt(r.lo)}–${fmt(r.hi)}`}
              </text>
              {/* scope note under the bar */}
              <foreignObject x={barLeft} y={barY + 10} width={iw} height={rowH - 34}>
                <p className="text-[9px] leading-[1.35] text-tertiary" style={{ margin: 0 }}>
                  <span className="font-bold uppercase tracking-wide text-grey-600">scope · </span>
                  {r.scope}
                </p>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------- squeeze ramp chart */

function SqueezeChart(props: { increment: number[]; displaced: number[] }) {
  const { increment, displaced } = props;
  const W = 720;
  const H = 240;
  const m = { l: 48, r: 12, t: 16, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const yMax = Math.max(...increment, 100) * 1.12;
  const sx = (i: number) => m.l + (i / (RAMP_YEARS.length - 1)) * iw;
  const sy = (v: number) => m.t + ((yMax - v) / yMax) * ih;
  const area = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ') +
    ` L ${sx(vals.length - 1).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(0).toFixed(1)} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Defence-spending increment ramped linearly to 2035, with the user-set displaced share shaded">
      {grid.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? '#BCBEC0' : '#E6E7E8'} strokeWidth={1} />
          <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" fontSize={9.5} className="fill-grey-500">
            {fmt(v)}
          </text>
        </g>
      ))}
      <text x={m.l} y={m.t - 5} fontSize={9.5} className="fill-tertiary">
        €bn/yr (2024 euros, no GDP growth)
      </text>
      {RAMP_YEARS.map((y, i) =>
        y % 2 === 1 ? (
          <text key={y} x={sx(i)} y={H - 8} textAnchor="middle" fontSize={9.5} className="fill-grey-500">
            {y}
          </text>
        ) : null,
      )}
      <path d={area(increment)} fill={C.defence} opacity={0.16} />
      <path d={increment.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')} fill="none" stroke={C.defence} strokeWidth={2} />
      <path d={area(displaced)} fill={C.squeeze} opacity={0.45} />
      <path d={displaced.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')} fill="none" stroke={C.squeeze} strokeWidth={2} />
    </svg>
  );
}

/* --------------------------------------------------------- static copy */

const SOURCES: { label: string; url: string }[] = [
  { label: 'COM(2024) 63 final — Securing our future (2040 climate target communication)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063' },
  { label: 'I4CE — European Climate Investment Deficit report (Feb 2024)', url: 'https://www.i4ce.org/en/publication/european-climate-investment-deficit-report-investment-pathway-europe-future-climate/' },
  { label: 'Draghi report — The future of European competitiveness (Sept 2024)', url: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en' },
  { label: 'Interinstitutional Agreement of 16 Dec 2020 (MFF climate mainstreaming)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020Q1222(01)' },
  { label: 'ECA Special Report 09/2022 — Climate spending in the 2014–2020 EU budget', url: 'https://www.eca.europa.eu/en/publications?did=61103' },
  { label: 'Regulation (EU) 2021/241 — Recovery and Resilience Facility', url: 'https://eur-lex.europa.eu/eli/reg/2021/241/oj' },
  { label: 'Directive 2003/87/EC (consolidated) — EU ETS, Art. 10(3) revenue use', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02003L0087-20240301' },
  { label: 'COM(2025) 85 final — Clean Industrial Deal (€100bn Industrial Decarbonisation Bank)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0085' },
  { label: 'Regulation (EU) 2023/955 — Social Climate Fund', url: 'https://eur-lex.europa.eu/eli/reg/2023/955/oj' },
  { label: 'NATO — The Hague Summit Declaration (25 June 2025)', url: 'https://www.nato.int/cps/en/natohq/official_texts_236705.htm' },
  { label: 'EDA — Defence Data (2024 estimate)', url: 'https://eda.europa.eu/publications-and-data/defence-data' },
  { label: 'Regulation (EU) 2025/1106 — SAFE (Security Action for Europe)', url: 'https://eur-lex.europa.eu/eli/reg/2025/1106/oj' },
  { label: 'Commission — ReArm Europe / Readiness 2030 (March 2025, fiscal package)', url: 'https://commission.europa.eu/topics/defence/future-european-defence_en' },
  { label: 'JOIN(2023) 19 final — A new outlook on the climate and security nexus', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023JC0019' },
  { label: 'COM(2022) 230 final — REPowerEU Plan', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022DC0230' },
];

/* ------------------------------------------------------------------ page */

export default function ClimateDefenceFiscalPage() {
  const [params, setParams] = useState<Params>({ ...DEFAULTS });
  const [activePreset, setActivePreset] = useState<string | null>('central');

  const set = <K extends keyof Params>(k: K, v: Params[K]) => {
    setParams((p) => ({ ...p, [k]: v }));
    if (k !== 'needId') setActivePreset(null);
  };
  const applyPreset = (id: string) => {
    const preset = PRESETS.find((s) => s.id === id);
    if (!preset) return;
    setParams((p) => ({ ...p, ...preset.overrides }));
    setActivePreset(id);
  };

  const r = useMemo(() => computeSqueeze(params), [params]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 51 · fiscal accounting board · MFF 2028–34 context · AI-compiled
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Climate Investment vs Rearmament — the Fiscal Squeeze
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            The Board&rsquo;s recommendations land in a negotiation where climate investment, rearmament and debt
            rules compete for the same euros. This board lays the three sides out as sourced rows — what the
            transition needs, what is actually committed, and where defence spending is headed — and makes the one
            genuinely unknowable number, the crowd-out share, the headline slider rather than a hidden assumption.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification · read this first
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            This is the <strong>highest-fabrication-risk topic</strong> in the current proposal round: the need-side
            estimates are heterogeneous, several locators could not be pinned to a page from this sandbox, and
            defence-fiscal figures move monthly. Three disciplines are enforced in the UI accordingly.{' '}
            <strong>Ranges are shown, never averages</strong> — the need estimates measure different things and are
            rendered as separately scoped rows that must not be compared or combined. <strong>The crowd-out share is
            unknowable</strong> — how much of the defence increment displaces public climate investment is a
            political choice yet to be made, so it is a slider you set, not a number this module asserts. And every
            row carries its own source, locator and confidence flag; rows marked &ldquo;pending verification&rdquo;
            must be checked against the source before anything here is quoted outside the hub.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Defence increment at 2035"
            value={`+${fmt(r.increment2035)} €bn/yr`}
            sub={`Hague ${HAGUE_CORE_PCT} %${params.includeBroader ? ` + ${HAGUE_BROADER_PCT} %` : ''} vs ${fmt(CURRENT_DEFENCE_PCT, 1)} % today, on 2024 GDP (€${fmt(EU_GDP_2024_BN / 1000, 1)}tn) × ${fmt(params.natoCoverage * 100)} % NATO coverage.`}
          />
          <StatTile
            label="Displaced climate investment"
            value={`${fmt(r.displaced2035)} €bn/yr`}
            sub={`At 2035, at your crowd-out setting of ${fmt(params.crowdOut * 100)} % — a political variable, not an estimate.`}
          />
          <StatTile
            label="Climate gap with the squeeze"
            value={
              r.gapWithLo === null || r.gapWithHi === null
                ? 'not computable'
                : r.gapWithLo === r.gapWithHi
                  ? `${fmt(r.gapWithLo)} €bn/yr`
                  : `${fmt(r.gapWithLo)}–${fmt(r.gapWithHi)} €bn/yr`
            }
            sub={
              r.gapWithoutLo === null
                ? `The selected need row (${r.need.label}) publishes no like-for-like actual — select the I4CE row for a € gap.`
                : `Vs ${fmt(r.gapWithoutLo)} €bn/yr without it (${r.need.label}, need − €${fmt(CURRENT_CLIMATE_INVEST_BN)}bn realised).`
            }
          />
          <StatTile
            label="Delay at current pace"
            value={`${fmt(r.delayYears, 1)} yr`}
            sub={`Cumulative displaced ${RAMP_START}–${RAMP_END} (€${fmt(r.displacedCumulative)}bn) ÷ current climate investment (€${fmt(CURRENT_CLIMATE_INVEST_BN)}bn/yr, I4CE 2022).`}
          />
        </section>

        {/* 1 — need */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · What the transition needs — four estimates that measure different things</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Each published estimate is a labelled row with its own scope note. They differ in what they count
            (energy system vs 22 sectors vs everything-including-defence), in period, and in whether they count
            total or <em>additional</em> investment — so this module never averages them and never stacks them into
            one bar. Click a row to use it as the reference for the gap arithmetic in section 4.
          </p>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <NeedComparison selectedId={params.needId} onSelect={(id) => set('needId', id)} />
            <div className="mt-1 flex flex-wrap gap-2">
              {NEED_ROWS.map((row) => (
                <span key={row.id} className="inline-flex items-center gap-1.5 text-[10px] text-tertiary">
                  <ConfidenceChip level={row.confidence} />
                  <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                    {row.label} ↗
                  </a>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 2 — committed */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · What is actually committed — the EU climate-money ledger</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Sourced rows, each with its own unit and period, deliberately not normalised into one figure: the rows
            overlap (the proposed Industrial Decarbonisation Bank repackages ETS revenues), one is an accounting
            share rather than a fund, and the largest single vehicle expires in 2026.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {COMMITTED_ROWS.map((row) => (
              <LedgerCard key={row.id} row={row} accent={C.committed} />
            ))}
          </div>
        </section>

        {/* 3 — defence */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · The defence trajectory — commitments, not projections</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            What has actually been committed or enacted, one sourced row each. The module ramps the Hague
            commitment linearly to 2035 on constant 2024 GDP — bookkeeping on stated commitments, not a spending
            forecast.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {DEFENCE_ROWS.map((row) => (
              <LedgerCard key={row.id} row={row} accent={C.defence} />
            ))}
          </div>
        </section>

        {/* 4 — the squeeze */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · The squeeze — set the political variable yourself</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            How much of the defence increment comes out of money that would otherwise have funded the transition?
            No source can answer that: it depends on fiscal choices not yet made. So it is the headline control.
            The presets are <em>readings</em> of the situation, not estimates.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applyPreset(s.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  activePreset === s.id ? 'border-primary bg-surface-blue' : 'border-grey-200 bg-white hover:bg-grey-50'
                }`}
              >
                <p className="text-[12px] font-bold text-tertiary-dark">{s.label}</p>
                <p className="mt-1 text-[11px] leading-snug text-tertiary">{s.blurb}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <SqueezeChart increment={r.incrementSeries} displaced={r.displacedSeries} />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: C.defence }} />
                  defence increment vs today (ramped linearly to 2035)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: C.squeeze }} />
                  share displacing public climate investment (your setting)
                </span>
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Constant 2024 euros and 2024 GDP throughout; the linear ramp is a presentation device, not a
                spending path. Core increment +{fmt(r.incrementCore)} €bn/yr
                {params.includeBroader
                  ? `; broader 1.5 % band adds +${fmt(r.incrementBroader)} €bn/yr after the dual-use deduction`
                  : '; the broader 1.5 % band is excluded at this setting'}
                .
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-accent-orange/50 bg-white p-3">
                <label className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-bold text-tertiary-dark">Crowd-out share — political variable</span>
                    <span className="font-mono text-[13px] font-bold tabular-nums text-accent-orange">
                      {fmt(params.crowdOut * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={params.crowdOut}
                    onChange={(e) => set('crowdOut', Number(e.target.value))}
                    className="mt-1.5 w-full accent-primary"
                  />
                  <p className="mt-1 text-[10.5px] leading-snug text-tertiary">
                    Share of the defence increment displacing public climate investment. Unknowable in advance —
                    there is no source for this number, and the module does not pretend otherwise.
                  </p>
                </label>
              </div>
              <div className="rounded-lg border border-grey-200 bg-white p-3 space-y-3">
                <label className="flex cursor-pointer items-start gap-2 text-[11.5px] text-tertiary-dark">
                  <input
                    type="checkbox"
                    checked={params.includeBroader}
                    onChange={(e) => set('includeBroader', e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    Count the broader 1.5 % &ldquo;defence- and security-related&rdquo; band in the increment
                  </span>
                </label>
                <label className={`block ${params.includeBroader ? '' : 'opacity-45'}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-tertiary-dark">…of which dual-use (climate-adjacent)</span>
                    <span className="font-mono text-[12px] tabular-nums text-primary">{fmt(params.dualUseShare * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={params.dualUseShare}
                    disabled={!params.includeBroader}
                    onChange={(e) => set('dualUseShare', Number(e.target.value))}
                    className="mt-1 w-full accent-primary"
                  />
                  <p className="mt-0.5 text-[10px] leading-snug text-tertiary">
                    Grid hardening, infrastructure protection, military mobility — deducted from the 1.5 % band
                    before it can squeeze (see section 5). Also unsourced; also yours to set.
                  </p>
                </label>
                <label className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-tertiary-dark">NATO share of EU GDP</span>
                    <span className="font-mono text-[12px] tabular-nums text-primary">{fmt(params.natoCoverage * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min={0.9}
                    max={1}
                    step={0.01}
                    value={params.natoCoverage}
                    onChange={(e) => set('natoCoverage', Number(e.target.value))}
                    className="mt-1 w-full accent-primary"
                  />
                  <p className="mt-0.5 text-[10px] leading-snug text-tertiary">
                    Austria, Ireland, Malta and Cyprus are outside the Hague commitment; ≈ 94 % is an
                    order-of-magnitude default, pending verification.
                  </p>
                </label>
              </div>
              <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Gap arithmetic (I4CE scope only)</p>
                {r.gapWithoutLo === null ? (
                  <p className="mt-1 text-[11px] leading-snug text-tertiary">
                    The selected need row ({r.need.label}) has no like-for-like &ldquo;actual&rdquo; figure, so no €
                    gap is computed — that refusal is deliberate. Select the I4CE row in section 1 for the one
                    honest gap calculation.
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1 font-mono text-[12px] tabular-nums text-tertiary-dark">
                    <p>
                      gap without squeeze <span className="float-right font-bold">{fmt(r.gapWithoutLo)} €bn/yr</span>
                    </p>
                    <p>
                      + displaced at 2035 <span className="float-right font-bold text-accent-orange">+{fmt(r.displaced2035)} €bn/yr</span>
                    </p>
                    <p className="border-t border-grey-300 pt-1">
                      gap with squeeze <span className="float-right font-bold">{fmt(r.gapWithLo ?? 0)} €bn/yr</span>
                    </p>
                    <p>
                      ≈ delay at current pace <span className="float-right font-bold">{fmt(r.delayYears, 1)} yr</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 5 — alignments */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">5 · Recorded alongside — where the two agendas genuinely align</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            An even-handed board records the overlaps, not only the conflict: some security spending <em>is</em>{' '}
            climate-adjacent, and some climate spending is security policy. These rows feed the dual-use deduction
            in section 4.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {ALIGNMENT_ROWS.map((row) => (
              <div key={row.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[12px] font-bold text-tertiary-dark">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-baseline" style={{ background: C.dual }} />
                    {row.label}
                  </p>
                  <ConfidenceChip level={row.confidence} />
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">{row.body}</p>
                <p className="mt-2 text-[10.5px] text-tertiary">
                  <a href={row.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                    {row.source} ↗
                  </a>{' '}
                  · {row.locator}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled 2026-08 — pending Secretariat verification; nothing on this page is citable outside the hub
            before a fact-check pass. The squeeze arithmetic is deliberately trivial: commitment percentages times
            2024 GDP, a linear ramp, and a crowd-out share the user sets — no forecast, no elasticities, no GDP
            growth, no deflators. Known simplifications: the Hague commitment binds NATO allies, not the EU as such
            (approximated by a GDP-coverage slider); the defence baseline (EDA, ≈ 1.9 %) and the NATO definition of
            defence spending differ; the &ldquo;current pace&rdquo; denominator is I4CE&rsquo;s 2022 realised
            investment and ages accordingly; committed-side rows overlap and are not summed for exactly that reason.
            Several locators (page numbers, the Hague declaration wording, the escape-clause member-state count)
            could not be verified from this sandbox and are flagged on their rows.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
