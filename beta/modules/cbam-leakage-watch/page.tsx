'use client';

/**
 * CBAM & Leakage Watch (beta module M · 49).
 *
 * Epistemic status: AI-compiled — pending Secretariat verification.
 * The CBAM definitive regime started on 1 January 2026; at the compile
 * date (2026-08) only months of noisy, revision-prone data exist. This
 * module therefore ships the MEASUREMENT APPARATUS — three deterministic
 * leakage indicators, the Annex I scope register, the free-allocation
 * phase-down and a dated third-country event ledger — and deliberately
 * refuses to call leakage: the "too young to call" state is a designed
 * UI state, not a data gap. Import index levels are illustrative
 * AI-compiled series calibrated to public COMEXT orders of magnitude,
 * to be replaced by a scripted COMEXT pull before anything is quoted.
 *
 * Surfaces:
 *   1. THE THREE INDICATORS — volume break, resource-shuffling proxy,
 *      downstream displacement — each with an explicit "what this can /
 *      cannot show" panel and no causal language in headlines.
 *   2. SCOPE REGISTER — Annex I sectors at CN-chapter granularity
 *      (Reg. (EU) 2023/956) and the 2026–2034 free-allocation phase-down
 *      (Art. 10a(1a) ETS Directive).
 *   3. EVENT LEDGER — dated, sourced third-country responses with a
 *      deterministic status vocabulary; unverified entries flagged.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { EmptyState } from '@/components/ui/StateView';
import {
  BAND_K,
  BandPoint,
  NATIONAL_FALL_PCT,
  SHUFFLE_DROP_PCT,
  classifyAgainstBand,
  completeMonthsSince,
  fitLinearTrend,
  shufflingSignal,
  trendBand,
} from './model';
import {
  COMPILE_DATE,
  CbamEvent,
  DEFINITIVE_REGIME_START,
  DOWNSTREAM_BOUNDARY,
  EVENTS,
  EVENT_KINDS,
  EventKind,
  IMPORT_SERIES,
  PHASE_DOWN,
  SCOPE_REGISTER,
  SHUFFLING_EXAMPLE,
  SectorKey,
} from './data.generated';

/* ------------------------------------------------------------- palette */
// Chart series palette (named const, chart use only). Six sectors:
// blue / orange / green / purple / red / slate — a colour-vision-deficiency-
// aware set, and series are never distinguished by colour alone (every mark
// carries an adjacent text label; the trend chart shows one sector at a time).
const SECTOR_C: Record<SectorKey, string> = {
  'iron-steel': '#0065A4',
  aluminium: '#54728C',
  cement: '#B83230',
  fertilisers: '#1F8F63',
  electricity: '#E0701A',
  hydrogen: '#A530B8',
};
// Phase-down bars: free allocation grey vs CBAM-covered blue (labelled in a legend).
const FREE_ALLOC_C = '#BCBEC0';
const CBAM_SHARE_C = '#0065A4';
// Shuffling worked example: one colour per hypothetical exporter (labelled).
const EXPORTER_C = ['#B83230', '#E0701A', '#1F8F63'];

const SECTOR_LABEL: Record<SectorKey, string> = {
  cement: 'Cement',
  'iron-steel': 'Iron & steel',
  aluminium: 'Aluminium',
  fertilisers: 'Fertilisers',
  electricity: 'Electricity',
  hydrogen: 'Hydrogen',
};

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtEventDate(e: CbamEvent): string {
  const [y, m, d] = e.date.split('-').map(Number);
  if (e.datePrecision === 'day') return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
  if (e.datePrecision === 'month') return `${MONTHS[(m ?? 1) - 1]} ${y}`;
  return `${y}`;
}

/* ------------------------------------------------------------ UI bits */

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

/** The verdict-discipline panel every indicator ships with. */
function CanCannotPanel(props: { can: string[]; cannot: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-grey-200 bg-surface-teal p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-dark">What this can show</p>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-tertiary">
          {props.can.map((c) => (
            <li key={c} className="flex gap-1.5">
              <span aria-hidden className="text-secondary">·</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-grey-200 bg-surface-orange p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">What this cannot show</p>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-tertiary">
          {props.cannot.map((c) => (
            <li key={c} className="flex gap-1.5">
              <span aria-hidden className="text-accent-red">·</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KindChip({ kind }: { kind: EventKind }) {
  const cls: Record<EventKind, string> = {
    'eu-milestone': 'bg-surface-blue text-primary',
    'wto-engagement': 'bg-surface-teal text-secondary-dark',
    objection: 'bg-surface-orange text-tertiary-dark',
    'pricing-response': 'bg-surface-green text-secondary-dark',
    'scope-review': 'bg-grey-100 text-tertiary',
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls[kind]}`}>
      {EVENT_KINDS[kind]}
    </span>
  );
}

/* ---------------------------------------------- trend chart (indicator A) */

function TrendChart(props: {
  color: string;
  observed: { year: number; value: number }[];
  band: BandPoint[]; // 2019 → 2027
  bandCutYear: number; // last observed year; band beyond it is projection
}) {
  const { color, observed, band, bandCutYear } = props;
  const W = 720;
  const H = 280;
  const m = { l: 44, r: 12, t: 16, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x0 = 2018.6;
  const x1 = 2027.4;
  const allVals = [...observed.map((p) => p.value), ...band.map((b) => b.lo), ...band.map((b) => b.hi)];
  const yLo = Math.floor((Math.min(...allVals) - 6) / 10) * 10;
  const yHi = Math.ceil((Math.max(...allVals) + 6) / 10) * 10;
  const sx = (yr: number) => m.l + ((yr - x0) / (x1 - x0)) * iw;
  const sy = (v: number) => m.t + ((yHi - v) / (yHi - yLo)) * ih;

  const bandFit = band.filter((b) => b.year <= bandCutYear);
  const bandProj = band.filter((b) => b.year >= bandCutYear);
  const area = (pts: BandPoint[]) =>
    pts.map((b, i) => `${i === 0 ? 'M' : 'L'} ${sx(b.year).toFixed(1)} ${sy(b.hi).toFixed(1)}`).join(' ') +
    [...pts].reverse().map((b) => ` L ${sx(b.year).toFixed(1)} ${sy(b.lo).toFixed(1)}`).join('') +
    ' Z';

  const grid: number[] = [];
  for (let v = yLo; v <= yHi; v += 20) grid.push(v);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Annual import-volume index against its 2019–2025 linear trend band; 2026 onwards is marked as too young to call"
    >
      {grid.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={v === 100 ? '#BCBEC0' : '#E6E7E8'} strokeWidth={1} />
          <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
            {fmt(v)}
          </text>
        </g>
      ))}
      {/* the designed refusal zone: definitive regime, no plotted data */}
      <rect x={sx(2025.5)} y={m.t} width={sx(x1) - sx(2025.5)} height={ih} fill="#F3F4F5" />
      <line x1={sx(2025.5)} x2={sx(2025.5)} y1={m.t} y2={m.t + ih} stroke="#808285" strokeWidth={1} strokeDasharray="4 3" />
      <text x={sx(2026.45)} y={m.t + 14} textAnchor="middle" className="fill-tertiary" fontSize={10} fontWeight={700}>
        definitive regime
      </text>
      <text x={sx(2026.45)} y={m.t + 27} textAnchor="middle" className="fill-grey-500" fontSize={9.5}>
        no series plotted — too young to call
      </text>
      {/* fitted band over the estimation window, then its projection (hatch-light) */}
      <path d={area(bandFit)} fill={color} opacity={0.13} />
      <path d={area(bandProj)} fill={color} opacity={0.07} />
      <path
        d={band.map((b, i) => `${i === 0 ? 'M' : 'L'} ${sx(b.year).toFixed(1)} ${sy(b.fitted).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeDasharray="5 4"
      />
      {/* observed series */}
      <path
        d={observed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.year).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
      />
      {observed.map((p) => (
        <circle key={p.year} cx={sx(p.year)} cy={sy(p.value)} r={3} fill="#FFFFFF" stroke={color} strokeWidth={1.8}>
          <title>{`${p.year}: index ${fmt(p.value)}`}</title>
        </circle>
      ))}
      {Array.from({ length: 9 }, (_, i) => 2019 + i).map((yr) => (
        <text key={yr} x={sx(yr)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>
          {yr}
        </text>
      ))}
      <text x={m.l} y={m.t - 4} className="fill-tertiary" fontSize={9.5}>
        import-volume index, 2019 = 100 (illustrative levels) · band = OLS trend ± {BAND_K} residual SD
      </text>
    </svg>
  );
}

/* ------------------------------------------ phase-down chart (scope section) */

function PhaseDownChart() {
  const W = 720;
  const H = 220;
  const m = { l: 40, r: 12, t: 18, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const bw = (iw / PHASE_DOWN.length) * 0.62;
  const sx = (i: number) => m.l + ((i + 0.5) / PHASE_DOWN.length) * iw;
  const sy = (pct: number) => m.t + ((100 - pct) / 100) * ih;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Free allocation retained versus CBAM-covered share of embedded emissions, 2026 to 2034"
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="#E6E7E8" strokeWidth={1} />
          <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
            {v}%
          </text>
        </g>
      ))}
      {PHASE_DOWN.map((r, i) => (
        <g key={r.year}>
          <rect
            x={sx(i) - bw / 2}
            y={sy(r.cbamPhaseInPct)}
            width={bw}
            height={sy(0) - sy(r.cbamPhaseInPct)}
            fill={CBAM_SHARE_C}
          >
            <title>{`${r.year}: CBAM applies to ${fmt(r.cbamPhaseInPct, 1)}% of embedded emissions`}</title>
          </rect>
          <rect
            x={sx(i) - bw / 2}
            y={sy(100)}
            width={bw}
            height={sy(r.cbamPhaseInPct) - sy(100)}
            fill={FREE_ALLOC_C}
          >
            <title>{`${r.year}: free allocation retained at ${fmt(r.freeAllocationPct, 1)}% (CBAM factor)`}</title>
          </rect>
          <text x={sx(i)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10} fontWeight={r.year === 2026 ? 700 : 400}>
            {r.year}
          </text>
          <text x={sx(i)} y={sy(r.cbamPhaseInPct) - 3} textAnchor="middle" className="fill-tertiary" fontSize={9}>
            {fmt(r.cbamPhaseInPct, r.cbamPhaseInPct % 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      <text x={m.l} y={m.t - 6} className="fill-tertiary" fontSize={9.5}>
        blue = share of embedded emissions on which CBAM certificates are due · grey = free allocation retained (CBAM factor)
      </text>
    </svg>
  );
}

/* --------------------------------------------------------- static copy */

const INDICATOR_CARDS = [
  {
    id: 'A',
    title: 'Volume break',
    question: 'Did CBAM-sector import volumes leave their pre-2026 trend band?',
    failureMode:
      'A splice against a trend can flag a break; it cannot attribute one. Demand cycles, safeguards and stockpiling all move the same series.',
  },
  {
    id: 'B',
    title: 'Resource-shuffling proxy',
    question:
      'Did the supplier mix shift towards low-reported-intensity exporters while those exporters’ national production intensity stood still?',
    failureMode:
      'A mix shift is consistent with shuffling and with genuine specialisation; the proxy narrows the explanation space, it does not close it.',
  },
  {
    id: 'C',
    title: 'Downstream displacement',
    question:
      'Are imports growing in unprotected downstream CN headings — steel arriving inside nails, springs and cars rather than as steel?',
    failureMode:
      'Downstream import growth also tracks demand and exchange rates; but the scope boundary itself is a design fact, checkable today.',
  },
];

const SOURCES: { label: string; url: string }[] = [
  {
    label: 'Regulation (EU) 2023/956 establishing a CBAM — consolidated version (CELEX 02023R0956)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0956-20230516',
  },
  {
    label: 'Directive 2003/87/EC (ETS Directive), Art. 10a(1a) CBAM factor — consolidated version (CELEX 02003L0087)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02003L0087-20240301',
  },
  {
    label: 'Directive (EU) 2023/959 amending the ETS Directive (CELEX 32023L0959)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
  },
  {
    label: 'European Commission — Carbon Border Adjustment Mechanism (policy page, review and extension work)',
    url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
  },
  {
    label: 'Eurostat COMEXT — international trade in goods database (source for the real import series)',
    url: 'https://ec.europa.eu/eurostat/comext/newxtweb/',
  },
  {
    label: 'UK Government — Introduction of a UK CBAM from January 2027 (consultation and response)',
    url: 'https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism-from-january-2027',
  },
  { label: 'ICAP — emissions trading systems worldwide (Türkiye, Brazil, China entries)', url: 'https://icapcarbonaction.com/en/ets' },
  { label: 'WTO — Committee on Trade and Environment', url: 'https://www.wto.org/english/tratop_e/envir_e/wrk_committee_e.htm' },
  { label: 'WTO — dispute settlement gateway (no CBAM dispute filed at compile date)', url: 'https://www.wto.org/english/tratop_e/dispu_e/dispu_status_e.htm' },
  { label: 'Congress.gov — Foreign Pollution Fee Act (bill search)', url: 'https://www.congress.gov/search?q=%22Foreign%20Pollution%20Fee%20Act%22' },
];

/* ------------------------------------------------------------------ page */

export default function CbamLeakageWatchPage() {
  const [sector, setSector] = useState<SectorKey>('iron-steel');

  const regimeMonths = completeMonthsSince(DEFINITIVE_REGIME_START, COMPILE_DATE);
  const unverifiedCount = EVENTS.filter((e) => e.verification === 'unverified').length;
  const outOfScopeCount = DOWNSTREAM_BOUNDARY.filter((r) => !r.inScope).length;

  const series = IMPORT_SERIES.find((s) => s.key === sector)!;
  const { fit, band, verdict2025 } = useMemo(() => {
    const f = fitLinearTrend(series.index);
    const b = trendBand(f, 2019, 2027);
    const p2025 = series.index.find((p) => p.year === 2025)!;
    const band2025 = b.find((x) => x.year === 2025)!;
    return { fit: f, band: b, verdict2025: classifyAgainstBand(p2025.value, band2025) };
  }, [series]);

  const shuffle = useMemo(() => shufflingSignal(SHUFFLING_EXAMPLE), []);

  const eventsSorted = useMemo(
    () => [...EVENTS].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [],
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 49 · CBAM &amp; leakage watch · definitive regime since 1 Jan 2026 · measurement apparatus, not verdicts
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            CBAM &amp; Leakage Watch — three indicators, a scope register, and a refusal to call it early
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            Carbon leakage is the central competitiveness objection to the ETS, and the Carbon Border Adjustment
            Mechanism (Reg. (EU) 2023/956) is the answer on trial: the definitive regime started on 1 January 2026 and
            free allocation phases down from this year. This module sets up the three deterministic indicators that
            could eventually detect leakage, states exactly what each one can and cannot show — and renders the
            current answer honestly: the data is too young to call.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification · read this first
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Only <strong>{regimeMonths} complete months</strong> of definitive-regime data existed at the compile date
            ({COMPILE_DATE}); early trade series are noisy and revision-prone, and{' '}
            <strong>the module’s honesty depends on refusing to call leakage before the data can</strong> — the
            “too young to call” panels below are a designed state, not a gap. The 2019–2025 import index levels are
            illustrative AI-compiled series calibrated to the orders of magnitude and shape of public COMEXT
            reporting (Eurostat hosts are unreachable from this sandbox); they must be replaced by a scripted COMEXT
            pull before any figure is quoted. The scope register and phase-down schedule are transcribed from the
            legal texts; ledger entries that could not be pinned to a primary document are flagged{' '}
            <em>unverified</em> rather than asserted.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Annex I sectors" value="6" sub="Cement, iron & steel, aluminium, fertilisers, electricity, hydrogen." />
          <StatTile label="Free allocation in 2026" value="97.5 %" sub="CBAM factor, Art. 10a(1a) ETS Directive — 0 % from 2034." />
          <StatTile
            label="Definitive-regime data"
            value={`${regimeMonths} months`}
            sub="Complete months since 1 Jan 2026 at compile date — below any callable threshold."
          />
          <StatTile
            label="Ledger entries"
            value={`${EVENTS.length}`}
            sub={`Third-country and EU regime events; ${unverifiedCount} flagged unverified.`}
          />
          <StatTile
            label="Unprotected downstream headings listed"
            value={`${outOfScopeCount}`}
            sub="CN headings just outside Annex I in the register below — the design gap."
          />
        </section>

        {/* 1 — the three indicators */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · Three deterministic indicators — and their stated failure modes</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Each indicator is arithmetic a reviewer can redo by hand: a trend band, a weighted average, a scope
            boundary. None of them measures “leakage” — they flag patterns that leakage would produce, alongside the
            other things that produce the same patterns. Headlines on this page therefore name the pattern, never the
            cause.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {INDICATOR_CARDS.map((c) => (
              <div key={c.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Indicator {c.id} · {c.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary-dark">{c.question}</p>
                <p className="mt-2 text-[11px] leading-snug text-tertiary">
                  <span className="font-semibold">Stated failure mode:</span> {c.failureMode}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2 — indicator A */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · Indicator A — import volumes against the pre-2026 trend band</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Annual import-volume index per CBAM sector (2019 = 100), with an ordinary-least-squares trend fitted on
            2019–2025 and a band of ± {BAND_K} residual standard deviations. When enough definitive-regime data
            exists, observations landing outside the band get the deterministic verdicts <em>above band</em> /{' '}
            <em>below band</em> / <em>within band</em> — nothing more.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IMPORT_SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSector(s.key)}
                aria-pressed={sector === s.key}
                className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold mh-focus ${
                  sector === s.key
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary hover:bg-grey-100'
                }`}
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: SECTOR_C[s.key] }} />
                {SECTOR_LABEL[s.key]}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <TrendChart color={SECTOR_C[sector]} observed={series.index} band={band} bandCutYear={2025} />
              <p className="mt-2 text-[10.5px] text-tertiary">
                Illustrative levels — AI-compiled, calibrated to public COMEXT orders of magnitude (this sector:
                extra-EU imports of roughly €{series.indicativeAnnualValueBnEur < 1 ? fmt(series.indicativeAnnualValueBnEur, 1) : fmt(series.indicativeAnnualValueBnEur)} bn/yr,
                order of magnitude only). Shape encodes: {series.shapeNote}
              </p>
            </div>
            <div className="space-y-3">
              <StatTile
                label={`2025 vs its own trend band — ${SECTOR_LABEL[sector]}`}
                value={verdict2025}
                sub={`Trend slope ${fit.slope >= 0 ? '+' : ''}${fmt(fit.slope, 1)} index points/yr; residual SD ${fmt(fit.residualSd, 1)}. A within-band 2025 is the baseline the 2026 series will be judged against.`}
              />
              <EmptyState
                title="2026: too young to call"
                body={`${regimeMonths} complete months of definitive-regime data existed at compile date. Monthly customs series this young are noisy, seasonal and revision-prone — plotting them would manufacture a verdict.`}
                hint="This panel switches to data once a scripted COMEXT pull delivers at least a full definitive-regime year plus the standard revision lag."
              />
            </div>
          </div>
          <div className="mt-3">
            <CanCannotPanel
              can={[
                'Flag a statistical break: a post-2025 observation outside the 2019–2025 trend band, per sector, with the band arithmetic fully stated.',
                'Rank sectors by how far outside the band they sit, once data exists.',
                'Show that no break has been established — which is itself a reportable finding.',
              ]}
              cannot={[
                'Attribute a break to CBAM or to leakage: demand cycles, the steel safeguard, stockpiling ahead of the regime and price effects move the same series.',
                'Detect leakage that arrives as reduced EU exports rather than increased imports — this indicator only watches the import side.',
                'Say anything yet: with months of data, absence of a plotted 2026 series is the honest output.',
              ]}
            />
          </div>
        </section>

        {/* 3 — indicator B */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · Indicator B — the resource-shuffling proxy, as a worked example</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Resource shuffling: an exporting country routes its cleanest plants’ output to the EU (where reported
            embedded intensity sets the CBAM bill) and its dirtiest output elsewhere. Global emissions are unchanged;
            the reported intensity of EU imports falls. The proxy is deterministic: flag when the import-weighted{' '}
            <em>reported</em> intensity falls by more than {SHUFFLE_DROP_PCT} % while no supplier’s <em>national
            average</em> production intensity fell by more than {NATIONAL_FALL_PCT} %. The example below is fully
            hypothetical — no real countries, no real shipments — because no definitive-regime declaration data is
            available to compute it on.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">
                Worked illustrative example — one steel product, three hypothetical exporters
              </p>
              <div className="mt-3 space-y-4">
                {(['before', 'after'] as const).map((phase) => (
                  <div key={phase}>
                    <p className="mb-1 text-[11px] font-semibold text-tertiary-dark">
                      {phase === 'before' ? 'Period 1 — supplier mix before the shift' : 'Period 2 — supplier mix after the shift'}
                    </p>
                    <div className="flex h-6 w-full overflow-hidden rounded" role="img" aria-label={`Import shares, ${phase} the mix shift`}>
                      {SHUFFLING_EXAMPLE.map((e, i) => {
                        const share = phase === 'before' ? e.shareBefore : e.shareAfter;
                        return (
                          <div
                            key={e.name}
                            className="flex items-center justify-center text-[10px] font-semibold text-white"
                            style={{ width: `${share * 100}%`, background: EXPORTER_C[i] }}
                            title={`${e.name}: ${fmt(share * 100)}% of imports at reported intensity ${fmt(e.reportedIntensity, 1)} t CO₂e/t`}
                          >
                            {String.fromCharCode(65 + i)} · {fmt(share * 100)}%
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-[11.5px]">
                  <thead>
                    <tr className="border-b border-grey-200 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">
                      <th className="py-1.5 pr-3">Exporter (hypothetical)</th>
                      <th className="py-1.5 pr-3">Share P1 → P2</th>
                      <th className="py-1.5 pr-3">Reported intensity of EU shipments</th>
                      <th className="py-1.5 pr-3">National avg intensity</th>
                      <th className="py-1.5">National avg change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHUFFLING_EXAMPLE.map((e, i) => (
                      <tr key={e.name} className="border-b border-grey-100 text-tertiary">
                        <td className="py-1.5 pr-3">
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: EXPORTER_C[i] }} />
                          {e.name}
                        </td>
                        <td className="py-1.5 pr-3 font-mono tabular-nums">
                          {fmt(e.shareBefore * 100)}% → {fmt(e.shareAfter * 100)}%
                        </td>
                        <td className="py-1.5 pr-3 font-mono tabular-nums">{fmt(e.reportedIntensity, 1)} t CO₂e/t</td>
                        <td className="py-1.5 pr-3 font-mono tabular-nums">{fmt(e.nationalAvgIntensity, 1)} t CO₂e/t</td>
                        <td className="py-1.5 font-mono tabular-nums">{fmt(e.nationalAvgChangePct, 1)} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Exporter C ships from one modern plant (0.7 t CO₂e/t) while its national fleet averages{' '}
                {fmt(SHUFFLING_EXAMPLE[2].nationalAvgIntensity, 1)} t CO₂e/t — the shuffling signature is exactly this
                wedge between shipment-level and national intensity, combined with a growing share.
              </p>
            </div>
            <div className="space-y-3">
              <StatTile
                label="Import-weighted reported intensity"
                value={`${fmt(shuffle.beforeIntensity, 2)} → ${fmt(shuffle.afterIntensity, 2)}`}
                sub={`t CO₂e/t, period 1 → period 2: a fall of ${fmt(-shuffle.changePct, 1)} % in what EU importers report.`}
              />
              <StatTile
                label="National intensities in the same window"
                value={shuffle.anyNationalFall ? 'fell' : 'unchanged'}
                sub={`No exporter’s national average fell by more than ${NATIONAL_FALL_PCT} % — the reported improvement has no production-side counterpart.`}
              />
              <StatTile
                label="Proxy verdict (worked example)"
                value={shuffle.flagged ? 'flagged' : 'not flagged'}
                sub={`Deterministic rule: reported-intensity fall > ${SHUFFLE_DROP_PCT} % with no national fall > ${NATIONAL_FALL_PCT} %. On real data this flags a case for investigation, nothing more.`}
              />
            </div>
          </div>
          <div className="mt-3">
            <CanCannotPanel
              can={[
                'Detect the shuffling signature in declaration data: reported import intensity falling with no matching fall in exporters’ national production intensity.',
                'Quantify the wedge per supplier country, from CBAM declarations plus published national inventories — both with locators.',
                'Make the threshold rule explicit and reproducible, so a flag can be argued with.',
              ]}
              cannot={[
                'Prove intent: genuine specialisation (a new low-carbon plant built for export) produces the same near-term pattern.',
                'See shuffling hidden inside default values: where importers fall back on default intensities, the reported series stops carrying plant-level information.',
                'Run today: it needs definitive-regime declaration data that does not yet exist in usable form — hence a worked example, not a live computation.',
              ]}
            />
          </div>
        </section>

        {/* 4 — indicator C */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · Indicator C — downstream displacement: the screws-and-cars boundary</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            CBAM prices the carbon in basic materials at the border — but not the same carbon arriving one processing
            step later. Annex I draws the line partway through Chapter 73: screws (7318) are in, nails (7317) are out;
            aluminium wire (7605) is in, insulated cable (8544) is out; and no machinery, vehicle or electrical
            heading is covered at all. Unlike indicators A and B, this one is a <em>design fact</em> checkable today:
            the boundary exists whether or not displacement has happened yet.
          </p>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[11.5px]">
                <thead>
                  <tr className="border-b border-grey-200 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">
                    <th className="py-1.5 pr-3">CN heading</th>
                    <th className="py-1.5 pr-3">Goods</th>
                    <th className="py-1.5 pr-3">Carbon-intensive input</th>
                    <th className="py-1.5 pr-3">CBAM status</th>
                    <th className="py-1.5">Why it matters</th>
                  </tr>
                </thead>
                <tbody>
                  {DOWNSTREAM_BOUNDARY.map((r) => (
                    <tr key={r.cn} className="border-b border-grey-100 align-top text-tertiary">
                      <td className="py-1.5 pr-3 font-mono tabular-nums text-tertiary-dark">{r.cn}</td>
                      <td className="py-1.5 pr-3">{r.description}</td>
                      <td className="py-1.5 pr-3">{r.upstreamInput}</td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            r.inScope ? 'bg-surface-green text-secondary-dark' : 'bg-surface-orange text-tertiary-dark'
                          }`}
                        >
                          {r.inScope ? 'in Annex I' : 'outside scope'}
                        </span>
                      </td>
                      <td className="py-1.5 text-[11px]">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10.5px] text-tertiary">
              In/out status transcribed from Annex I of Reg. (EU) 2023/956 (consolidated); out-of-scope rows are
              claims of absence from the Annex list and are checkable against the same text.
            </p>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Why this is a design gap the report can address</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                As free allocation phases down, EU producers of basic materials are protected at the border while EU{' '}
                <em>fabricators</em> pay CBAM-priced inputs and compete with imports that do not. The predictable
                margin response is to move the fabrication step — not the steel mill — outside the EU, and re-import
                the material one CN heading downstream. This is a market response to a scope boundary the legislator
                drew, which makes it addressable by redrawing the boundary rather than by waiting for trade data:
                indicators A and B watch outcomes, this one names a lever.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">The Commission’s own downstream-extension work</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                The gap is acknowledged in the machinery: Article 30(2) of the Regulation requires the Commission to
                assess extending the scope to goods further down the value chain, and the European Steel and Metals
                Action Plan (COM(2025) 125, March 2025) announced work to extend CBAM to certain steel- and
                aluminium-intensive downstream products plus stronger anti-circumvention rules, carried forward
                through 2026. The precise state of that proposal at compile date could not be confidently verified
                from this sandbox and is flagged <em>unverified</em> in the ledger below — the design gap itself
                needs no such caveat.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <CanCannotPanel
              can={[
                'State the scope boundary exactly, heading by heading, from Annex I — a design fact, verifiable today.',
                'Once data exists: track import growth in the listed unprotected headings against the same trend-band arithmetic as indicator A.',
                'Support a report recommendation about scope, because the gap is legislative, not conjectural.',
              ]}
              cannot={[
                'Show that displacement has occurred: downstream import series also move with demand, exchange rates and supply chains.',
                'Quantify embedded carbon in complex goods without the attribution rules the extension work itself is meant to define.',
                'Cover services or export-side effects — the boundary register is import-side only.',
              ]}
            />
          </div>
        </section>

        {/* 5 — scope register */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">5 · The CBAM scope register and the free-allocation phase-down</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The six Annex I sectors at CN-chapter granularity (Reg. (EU) 2023/956, consolidated), and the CBAM factor
            of Art. 10a(1a) of the ETS Directive — the schedule on which free allocation gives way to border
            adjustment between 2026 and 2034. Percentages are verbatim from the Directive.
          </p>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <PhaseDownChart />
            <p className="mt-1 text-[10.5px] text-tertiary">
              CBAM factor per year: 97.5 (2026) · 95 (2027) · 90 (2028) · 77.5 (2029) · 51.5 (2030) · 39 (2031) ·
              26.5 (2032) · 14 (2033) · 0 (2034). Directive 2003/87/EC, Art. 10a(1a), as amended by Directive (EU)
              2023/959.
            </p>
          </div>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[11.5px]">
                <thead>
                  <tr className="border-b border-grey-200 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">
                    <th className="py-1.5 pr-3">Sector</th>
                    <th className="py-1.5 pr-3">CN coverage (condensed)</th>
                    <th className="py-1.5 pr-3">Embedded emissions</th>
                    <th className="py-1.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {SCOPE_REGISTER.map((row) => (
                    <tr key={row.key} className="border-b border-grey-100 align-top text-tertiary">
                      <td className="py-2 pr-3 font-semibold text-tertiary-dark">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: SECTOR_C[row.key] }} />
                        {row.name}
                      </td>
                      <td className="py-2 pr-3">
                        <ul className="space-y-0.5">
                          {row.cnCodes.map((c) => (
                            <li key={c.code}>
                              <span className="font-mono tabular-nums text-tertiary-dark">{c.code}</span>{' '}
                              <span className="text-[11px]">{c.description}</span>
                            </li>
                          ))}
                        </ul>
                        {row.cnNotes && <p className="mt-1 text-[10.5px] italic">{row.cnNotes}</p>}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            row.emissionsScope === 'direct + indirect'
                              ? 'bg-surface-blue text-primary'
                              : 'bg-grey-100 text-tertiary'
                          }`}
                        >
                          {row.emissionsScope}
                        </span>
                      </td>
                      <td className="py-2 text-[11px]">
                        {row.notes}{' '}
                        <a href={row.source.url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-primary hover:underline">
                          {row.source.label} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 6 — event ledger */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">6 · Event ledger — third-country responses, dated and sourced</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The geopolitical feedback loop in one table: WTO engagement, objection statements, and — the part that
            cuts the other way — carbon pricing adopted abroad with CBAM as a stated motivation. Kinds come from a
            fixed vocabulary; entries whose date, actor or instrument could not be pinned to a primary document are
            flagged <span className="font-semibold text-accent-red">unverified</span> rather than asserted. No formal
            WTO dispute against CBAM had been filed at the compile date (checkable at the WTO dispute gateway, linked
            below).
          </p>
          <div className="mt-3 space-y-2">
            {eventsSorted.map((e) => (
              <div key={`${e.date}-${e.title}`} className="rounded-lg border border-grey-200 bg-white p-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[11.5px] font-bold tabular-nums text-tertiary-dark">{fmtEventDate(e)}</span>
                  <KindChip kind={e.kind} />
                  {e.verification === 'unverified' && (
                    <span className="inline-block rounded border border-accent-red/50 px-1.5 py-0.5 text-[10px] font-semibold text-accent-red">
                      unverified
                    </span>
                  )}
                  <span className="text-[11px] text-tertiary">{e.actor}</span>
                </div>
                <p className="mt-1 text-[12.5px] font-semibold text-tertiary-dark">{e.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-tertiary">{e.summary}</p>
                <a href={e.source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-primary hover:underline">
                  {e.source.label} ↗
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled — pending Secretariat verification (compile date {COMPILE_DATE}). The import index series are
            illustrative levels, not COMEXT extractions, and no chart on this page plots definitive-regime (2026)
            data — by design, not omission. The resource-shuffling example is fully hypothetical. The scope register
            condenses Annex I to heading level; the Annex itself is the authority, and consolidated EUR-Lex texts are
            cited throughout (Eurostat, EEA and EUR-Lex hosts are unreachable from this sandbox, so links follow the
            repository’s standard citation formats and the real import series awaits a workflow-run COMEXT pull per
            the repository’s data-access recipes). Ledger entries marked unverified need pinning to primary documents
            before any of them is quoted. Indicator headlines deliberately avoid causal language: this module can
            flag breaks, wedges and boundaries — it cannot, and does not, call leakage.
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
