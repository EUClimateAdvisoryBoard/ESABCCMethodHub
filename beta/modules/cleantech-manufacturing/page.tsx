'use client';

/**
 * Clean-Tech Manufacturing Scoreboard — NZIA distance-to-benchmark
 * (beta module M · 46).
 *
 * Six net-zero technologies (solar PV, wind, batteries, heat pumps,
 * electrolysers, grid equipment), each scored against the Net-Zero
 * Industry Act benchmarks — Reg. (EU) 2024/1735 Art. 5(1): manufacturing
 * capacity of at least 40 % of the Union's annual deployment needs by 2030,
 * and a Union share reaching 15 % of world production by 2040. For each technology: the 2030
 * deployment need and current EU manufacturing capacity (shown as a
 * source-labelled RANGE where sources disagree, never a silent average),
 * the announced pipeline (flagged soft), import penetration and supplier
 * concentration, an EEA-style pace ratio (required capacity growth vs the
 * observed ~3-year trend, same arithmetic as the policy-coherence
 * modules), and a short sourced note on what holds domestic capacity back.
 *
 * Epistemic status: AI-compiled from published industry and JRC sources,
 * compiled 2026-08 — pending Secretariat verification. Capacity figures
 * are industry-reported and lumpy; the pipeline column is soft by
 * construction; every uncertain value is flagged in the data and rendered
 * with an ≈ prefix. Not citable without human verification.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  COMPILED,
  NZIA,
  SourcedFigure,
  TECHNOLOGIES,
  TechId,
  Technology,
} from './data.generated';
import {
  NZIA_2030_DOMESTIC_SHARE,
  NZIA_2040_WORLD_SHARE,
  Pace,
  approx,
  benchmarkCapacity,
  computePace,
  currentShare,
  distanceToBenchmark,
  fmt,
  fmtRange,
  hhiLowerBound,
  mid,
} from './model';

/* ------------------------------------------------------------- palette */
// Six-technology chart palette — a colour-vision-deficiency-checked
// six-set (hues spaced and lightness-separated so adjacent series stay
// distinguishable under deuteranopia and protanopia). Chart series only;
// everything else uses the Tailwind semantic tokens.
const TECH_C: Record<TechId, string> = {
  'solar-pv': '#E0701A',
  wind: '#0065A4',
  batteries: '#1F8F63',
  'heat-pumps': '#A530B8',
  electrolysers: '#B83230',
  grid: '#6667AB',
};

const READING_STYLE: Record<string, string> = {
  'on-track': 'bg-surface-green text-secondary-dark',
  lagging: 'bg-surface-orange text-tertiary-dark',
  'off-track': 'bg-accent-red/10 text-accent-red',
  'n/a': 'bg-grey-100 text-tertiary',
};

const SOURCES: { label: string; url: string }[] = [
  { label: 'Reg. (EU) 2024/1735 — Net-Zero Industry Act (CELEX 32024R1735, act as adopted; no consolidated version yet)', url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj' },
  { label: 'JRC Clean Energy Technology Observatory (CETO) — annual reports', url: 'https://setis.ec.europa.eu/publications-and-reports/clean-energy-technology-observatory_en' },
  { label: 'SolarPower Europe — EU Market Outlook for Solar Power 2024–2028', url: 'https://www.solarpowereurope.org/insights/outlooks/eu-market-outlook-for-solar-power-2024-2028' },
  { label: 'European Solar Manufacturing Council (ESMC)', url: 'https://esmc.solar/' },
  { label: 'WindEurope — Wind energy in Europe: 2024 statistics and outlook 2025–2030', url: 'https://windeurope.org/intelligence-platform/product/wind-energy-in-europe-2024-statistics-and-the-outlook-for-2025-2030/' },
  { label: 'Transport & Environment — EU battery manufacturing risk analyses', url: 'https://www.transportenvironment.org/topics/electric-cars/batteries' },
  { label: 'Fraunhofer ISI — battery production capacity mapping', url: 'https://www.isi.fraunhofer.de/en/themen/batterien.html' },
  { label: 'European Heat Pump Association (EHPA) — market data', url: 'https://www.ehpa.org/market-data/' },
  { label: 'Hydrogen Europe — Clean Hydrogen Monitor', url: 'https://hydrogeneurope.eu/reports/' },
  { label: 'IEA — Global Hydrogen Review 2024', url: 'https://www.iea.org/reports/global-hydrogen-review-2024' },
  { label: 'IEA — Batteries and Secure Energy Transitions (2024)', url: 'https://www.iea.org/reports/batteries-and-secure-energy-transitions' },
  { label: 'European Commission — EU Action Plan for Grids (COM(2023) 757)', url: 'https://energy.ec.europa.eu/topics/infrastructure/grids/eu-action-plan-grids_en' },
  { label: 'REPowerEU Plan (COM(2022) 230)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM%3A2022%3A230%3AFIN' },
  { label: 'Eurostat COMEXT — international trade in goods', url: 'https://ec.europa.eu/eurostat/web/international-trade-in-goods/database' },
];

/* ------------------------------------------------------------- UI bits */

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function PaceChip({ pace }: { pace: Pace | null }) {
  const reading = pace ? pace.reading : 'n/a';
  const label =
    pace === null
      ? 'pace n/a'
      : pace.ratio === null
        ? 'benchmark met'
        : `pace ${fmt(pace.ratio, 2)}× · ${pace.reading}`;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${READING_STYLE[reading]}`}
      title={
        pace
          ? `Observed ${fmt(pace.observedPerYear, 2)}/yr (${pace.trendFrom}–${pace.trendTo}) vs required ${fmt(Math.max(pace.requiredPerYear, 0), 2)}/yr to reach 40 % of the mid-point need by 2030 — EEA distance-to-target method.`
          : 'No published capacity trend on a consistent unit — pace not computed rather than invented.'
      }
    >
      {label}
    </span>
  );
}

function SourceChip({ f, unit }: { f: SourcedFigure; unit?: string }) {
  return (
    <span
      className="inline-flex items-baseline gap-1 rounded bg-grey-100 px-1.5 py-0.5 text-[10px] text-tertiary"
      title={`${f.source}${f.note ? ` — ${f.note}` : ''}${f.uncertain ? ' — flagged uncertain' : ''}`}
    >
      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
        {approx(f.uncertain, fmt(f.value, f.value < 10 ? 1 : 0))}
        {unit ? ` ${unit}` : ''}
      </span>
      <span>· {f.source.split('—')[0].split('(')[0].trim()}, {f.year}</span>
      {f.uncertain && <span className="font-semibold text-accent-orange" aria-label="flagged uncertain">⚑</span>}
    </span>
  );
}

/* -------------------------------------------- benchmark bar (per tech) */

function BenchmarkBar({ t }: { t: Technology }) {
  const W = 720;
  const H = 78;
  const m = { l: 8, r: 56, t: 20, b: 18 };
  const iw = W - m.l - m.r;
  const target = benchmarkCapacity(t);
  const capHigh = t.capacity ? t.capacity.high.value : 0;
  const pipeEndRaw = t.pipeline.value !== null && t.capacity ? capHigh + t.pipeline.value : 0;
  // The need range frames the axis; a soft pipeline never stretches it — it clips with a '→' instead.
  const axisMax = Math.max(t.need2030.high.value, capHigh, target) * 1.06;
  const x = (v: number) => m.l + (Math.min(v, axisMax) / axisMax) * iw;
  const barY = m.t + 12;
  const barH = 16;
  const c = TECH_C[t.id];
  const pipeClipped = pipeEndRaw > axisMax;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${t.name}: EU manufacturing capacity against the 2030 deployment need and the NZIA 40 % benchmark, in ${t.unit}`}
    >
      {/* axis */}
      <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#DCDDDE" strokeWidth={1} />
      <text x={m.l} y={H - 5} fontSize={9} className="fill-grey-500">0</text>
      <text x={W - m.r} y={H - 5} fontSize={9} textAnchor="end" className="fill-grey-500">
        {fmt(axisMax, 0)} {t.unit}
      </text>

      {/* 2030 need range band */}
      <rect
        x={x(t.need2030.low.value)}
        y={m.t}
        width={Math.max(2, x(t.need2030.high.value) - x(t.need2030.low.value))}
        height={H - m.t - m.b}
        fill="#808285"
        opacity={0.13}
      />
      <text x={x(t.need2030.low.value)} y={m.t - 6} fontSize={9} className="fill-tertiary">
        2030 need {fmtRange(t.need2030, t.need2030.low.value < 10 ? 1 : 0)} {t.unit}
      </text>

      {/* NZIA 40 % target line */}
      <line x1={x(target)} x2={x(target)} y1={m.t - 2} y2={H - m.b} stroke="#FF9933" strokeWidth={2} strokeDasharray="4 3" />
      <text x={x(target) + 4} y={H - m.b - 4} fontSize={9} fontWeight={700} className="fill-tertiary-dark">
        NZIA 40 % = {fmt(target, target < 10 ? 1 : 0)}
      </text>

      {t.capacity ? (
        <g>
          {/* solid to the low estimate, translucent across the disagreement range */}
          <rect x={m.l} y={barY} width={Math.max(1, x(t.capacity.low.value) - m.l)} height={barH} rx={2} fill={c} />
          <rect
            x={x(t.capacity.low.value)}
            y={barY}
            width={Math.max(1, x(t.capacity.high.value) - x(t.capacity.low.value))}
            height={barH}
            rx={2}
            fill={c}
            opacity={0.4}
          >
            <title>Source disagreement range — both estimates kept, never averaged silently.</title>
          </rect>
          <text x={x(t.capacity.high.value) + 5} y={barY + barH - 4} fontSize={9.5} fontWeight={700} fill={c}>
            EU capacity {fmtRange(t.capacity, t.capacity.low.value < 10 ? 1 : 0)}
          </text>
          {/* announced pipeline — soft, dashed outline */}
          {t.pipeline.value !== null && (
            <g>
              <rect
                x={x(t.capacity.high.value)}
                y={barY + 2}
                width={Math.max(2, x(Math.min(pipeEndRaw, axisMax)) - x(t.capacity.high.value))}
                height={barH - 4}
                fill="none"
                stroke={c}
                strokeWidth={1.2}
                strokeDasharray="3 3"
              >
                <title>{`Announced pipeline (SOFT): ${t.pipeline.note}`}</title>
              </rect>
              <text
                x={x(Math.min(pipeEndRaw, axisMax)) + 4}
                y={barY + barH - 4}
                fontSize={9}
                className="fill-tertiary"
              >
                {pipeClipped ? '+pipeline →' : 'pipeline (soft)'}
              </text>
            </g>
          )}
        </g>
      ) : (
        <text x={m.l} y={barY + barH - 4} fontSize={10} className="fill-tertiary" fontStyle="italic">
          no comparable published capacity figure — benchmark bar deliberately not drawn
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------- share-of-need bar (detail view) */

function ShareBar({ t }: { t: Technology }) {
  const share = currentShare(t);
  if (!share) return null;
  const W = 680;
  const H = 56;
  const m = { l: 8, r: 40, t: 16, b: 16 };
  const iw = W - m.l - m.r;
  const maxPct = Math.max(100, share.high * 1.05);
  const x = (v: number) => m.l + (Math.min(v, maxPct) / maxPct) * iw;
  const c = TECH_C[t.id];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${t.name}: current capacity as a share of the 2030 deployment need, against the 40 % benchmark`}>
      <rect x={m.l} y={m.t} width={iw} height={H - m.t - m.b} rx={3} fill="#F3F4F5" />
      <rect x={m.l} y={m.t} width={Math.max(2, x(share.low) - m.l)} height={H - m.t - m.b} rx={3} fill={c} />
      <rect x={x(share.low)} y={m.t} width={Math.max(2, x(share.high) - x(share.low))} height={H - m.t - m.b} fill={c} opacity={0.4} />
      <line x1={x(share.mid)} x2={x(share.mid)} y1={m.t - 2} y2={H - m.b + 2} stroke="#2E3E4C" strokeWidth={1.5} />
      <line x1={x(NZIA_2030_DOMESTIC_SHARE)} x2={x(NZIA_2030_DOMESTIC_SHARE)} y1={m.t - 4} y2={H - m.b + 4} stroke="#FF9933" strokeWidth={2} strokeDasharray="4 3" />
      <text x={x(NZIA_2030_DOMESTIC_SHARE) + 4} y={m.t - 6} fontSize={9.5} fontWeight={700} className="fill-tertiary-dark">
        40 % benchmark
      </text>
      <text x={W - m.r + 4} y={H - m.b} fontSize={9} className="fill-grey-500">
        {fmt(maxPct, 0)} %
      </text>
      <text x={m.l} y={H - 3} fontSize={9.5} className="fill-tertiary">
        current share envelope {fmt(share.low, 0)}–{fmt(share.high, 0)} % · mid-point {fmt(share.mid, 0)} % (capacity mid ÷ need mid)
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ page */

export default function CleantechManufacturingPage() {
  const [sel, setSel] = useState<TechId>('solar-pv');
  const t = TECHNOLOGIES.find((x) => x.id === sel)!;

  const rows = useMemo(
    () =>
      TECHNOLOGIES.map((tech) => ({
        tech,
        pace: computePace(tech),
        share: currentShare(tech),
        distance: distanceToBenchmark(tech),
      })),
    [],
  );

  const checkable = rows.filter((r) => r.share !== null);
  const meetsNow = checkable.filter((r) => r.share !== null && r.share.mid >= NZIA_2030_DOMESTIC_SHARE);
  const behindPace = checkable.filter((r) => r.pace !== null && r.pace.reading !== 'on-track');
  const chinaDominated = TECHNOLOGIES.filter((x) => x.suppliers?.shares[0]?.name === 'China');

  const selPace = computePace(t);
  const selShare = currentShare(t);
  const selDistance = distanceToBenchmark(t);
  const selTarget = benchmarkCapacity(t);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 46 · clean-tech manufacturing scoreboard · NZIA distance-to-benchmark
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Who manufactures the transition? Six technologies against the NZIA benchmarks
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            The competitiveness debate is mostly argued on prices; the other half is manufacturing. The Net-Zero
            Industry Act (Reg. (EU) 2024/1735, Art. 5(1)) sets the Union a benchmark of manufacturing at least
            40 % of its own annual deployment needs by 2030, and a Union share reaching 15 % of world production by
            2040. This scoreboard measures the
            distance for solar PV, wind, batteries, heat pumps, electrolysers and grid equipment — deployment need,
            EU capacity (as a range where sources disagree), announced pipeline (soft), import penetration and
            supplier concentration, and an EEA-style pace ratio on the observed capacity trend.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending human verification
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Compiled {COMPILED} from published JRC and industry sources. <strong>Capacity figures are
            industry-reported and lumpy</strong> — nameplate, effective and ramp-up capacity are routinely conflated
            in the sources, which is why disagreeing estimates are shown as ranges with their own source labels,
            never averaged silently. <strong>The announced-pipeline column is soft by construction</strong>:
            announcement-to-FID attrition is severe (Northvolt is the canonical example). Import-penetration and
            supplier-share figures are taken from published COMEXT summaries — the committed CN-code pipeline for
            reproducing them deterministically is deferred work. Figures flagged ⚑ in the data are uncertain and
            rendered with an ≈ prefix. Nothing here is citable pending Secretariat verification.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Technologies covered"
            value={`${TECHNOLOGIES.length}`}
            sub="All six are listed net-zero technology families under Reg. (EU) 2024/1735."
          />
          <StatTile
            label="Above the 40 % benchmark today"
            value={`${meetsNow.length} of ${checkable.length}`}
            sub={`${meetsNow.map((r) => r.tech.short).join(' & ') || 'none'} — on capacity mid-points; grid equipment has no comparable capacity figure.`}
          />
          <StatTile
            label="Behind pace on capacity growth"
            value={`${behindPace.length} of ${checkable.length}`}
            sub={`${behindPace.map((r) => `${r.tech.short} (${r.pace!.ratio === null ? '—' : fmt(r.pace!.ratio, 2)}×)`).join(', ') || 'none'} — observed ~3-yr trend vs growth required to reach 40 % of need by 2030.`}
          />
          <StatTile
            label="China-dominated supply"
            value={`${chinaDominated.length} of ${TECHNOLOGIES.length}`}
            sub="China is the top import origin (solar, batteries, heat pumps) or dominates a critical component tier (wind: permanent magnets)."
          />
        </section>

        {/* NZIA target cards */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The benchmarks, as law</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Both benchmarks come from the Net-Zero Industry Act, in force since 29 June 2024. They are indicative
            benchmarks, not binding targets on any actor — which is exactly why a distance-to-benchmark scoreboard,
            rather than a compliance tracker, is the honest instrument.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">2030 · domestic manufacturing</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-tertiary-dark">{NZIA_2030_DOMESTIC_SHARE} %</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">
                &ldquo;{NZIA.benchmark2030}&rdquo;
              </p>
              <p className="mt-2 text-[10.5px] text-tertiary">
                {NZIA.benchmark2030Locator} · CELEX {NZIA.celex} ·{' '}
                <a href={NZIA.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  EUR-Lex ↗
                </a>
              </p>
              <p className="mt-2 text-[10.5px] leading-snug text-tertiary">{NZIA.benchmark2030Scope}</p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">2040 · share of world production</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-tertiary-dark">{NZIA_2040_WORLD_SHARE} %</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">
                &ldquo;{NZIA.benchmark2040}&rdquo;
              </p>
              <p className="mt-2 text-[10.5px] text-tertiary">
                {NZIA.benchmark2040Locator} · note the closing exception: the benchmark does not apply where Union
                capacity would run significantly above the Union&apos;s own 2040 deployment needs. Where an EU
                world-production share is published it is shown in the detail view below — solar PV sits near
                ≈1–2 %, electrolysers near ≈25 %.
              </p>
            </div>
          </div>
        </section>

        {/* scoreboard */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The scoreboard — capacity vs need, all six technologies</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Solid bar: EU manufacturing capacity up to the lower source estimate; translucent extension: the
            disagreement range between sources; dashed outline: announced pipeline (soft). Grey band: the 2030 annual
            deployment need range; dashed orange line: the NZIA 40 % benchmark against the need mid-point. Native
            units per technology — the bars are not comparable across rows.
          </p>
          <div className="mt-3 space-y-3">
            {rows.map(({ tech, pace, share }) => (
              <div
                key={tech.id}
                className={`rounded-lg border bg-white p-4 ${tech.id === sel ? 'border-primary' : 'border-grey-200'}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: TECH_C[tech.id] }} />
                  <p className="text-[13px] font-bold text-tertiary-dark">{tech.name}</p>
                  <span className="font-mono text-[10.5px] tabular-nums text-tertiary">{tech.unit}</span>
                  <PaceChip pace={pace} />
                  {share && (
                    <span className="font-mono text-[10.5px] tabular-nums text-tertiary">
                      share of need {fmt(share.low, 0)}–{fmt(share.high, 0)} %
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSel(tech.id)}
                    className="mh-focus ml-auto rounded border border-grey-300 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-grey-100"
                  >
                    {tech.id === sel ? 'shown below' : 'detail ↓'}
                  </button>
                </div>
                <BenchmarkBar t={tech} />
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-tertiary">
                  {tech.importPenetration ? (
                    <span title={`${tech.importPenetration.source}${tech.importPenetration.note ? ` — ${tech.importPenetration.note}` : ''}`}>
                      import penetration{' '}
                      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                        {approx(tech.importPenetration.uncertain, `${fmt(tech.importPenetration.value, 0)} %`)}
                      </span>{' '}
                      ({tech.importPenetration.year}){tech.importPenetration.uncertain ? ' ⚑' : ''}
                    </span>
                  ) : (
                    <span>import penetration: not established</span>
                  )}
                  {tech.suppliers && tech.suppliers.shares[0] && (
                    <span title={`${tech.suppliers.basis} — ${tech.suppliers.source}, ${tech.suppliers.year}`}>
                      top supplier {tech.suppliers.shares[0].name}{' '}
                      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                        {approx(tech.suppliers.shares[0].uncertain, `${fmt(tech.suppliers.shares[0].share, 0)} %`)}
                      </span>
                      {tech.suppliers.shares[0].uncertain ? ' ⚑' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* detail view */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · Technology detail</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TECHNOLOGIES.map((tech) => (
              <button
                key={tech.id}
                type="button"
                onClick={() => setSel(tech.id)}
                className={`mh-focus rounded-full border px-3 py-1 text-[11.5px] font-semibold ${
                  tech.id === sel
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary hover:bg-grey-100'
                }`}
              >
                {tech.short}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-[15px] font-bold text-tertiary-dark">{t.name}</h3>
              <span className="text-[11px] text-tertiary">NZIA listing: {t.nziaListing}</span>
              <PaceChip pace={selPace} />
            </div>

            {/* benchmark bar: current share → 40 % */}
            <div className="mt-3">
              {selShare ? (
                <ShareBar t={t} />
              ) : (
                <p className="rounded bg-grey-100 p-3 text-[12px] italic text-tertiary">
                  No benchmark bar: no comparable published EU manufacturing-capacity figure exists for this family —
                  the constraint is order-book capacity and lead times, not a computable share. Deliberately left
                  uncomputed rather than approximated.
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* figures with sources */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">2030 deployment need ({t.unit})</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <SourceChip f={t.need2030.low} unit={t.unit} />
                    <SourceChip f={t.need2030.high} unit={t.unit} />
                  </div>
                  {t.need2030.note && <p className="mt-1 text-[10.5px] text-tertiary">{t.need2030.note}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
                    EU manufacturing capacity, {t.capacityYear} ({t.unit})
                  </p>
                  {t.capacity ? (
                    <>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <SourceChip f={t.capacity.low} unit={t.unit} />
                        <SourceChip f={t.capacity.high} unit={t.unit} />
                      </div>
                      {t.capacity.note && <p className="mt-1 text-[10.5px] text-tertiary">{t.capacity.note}</p>}
                    </>
                  ) : (
                    <p className="mt-1 text-[11px] italic text-tertiary">No comparable published figure — see note above.</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Announced pipeline — SOFT</p>
                  <p className="mt-1 text-[11.5px] text-tertiary-dark">
                    {t.pipeline.value !== null ? (
                      <span className="font-mono font-semibold tabular-nums">
                        ≈{fmt(t.pipeline.value, t.pipeline.value < 10 ? 1 : 0)} {t.unit}
                      </span>
                    ) : (
                      <span className="italic">no consolidated figure</span>
                    )}{' '}
                    <span className="text-tertiary">
                      · {t.pipeline.horizon} · {t.pipeline.source}, {t.pipeline.year}
                    </span>
                  </p>
                  <p className="mt-1 text-[10.5px] text-tertiary">{t.pipeline.note}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Distance & pace to the 2030 benchmark</p>
                  {selDistance && t.capacity ? (
                    <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary">
                      Benchmark capacity (40 % of need mid-point):{' '}
                      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                        {fmt(selTarget, selTarget < 10 ? 1 : 0)} {t.unit}
                      </span>
                      . Missing capacity:{' '}
                      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                        {selDistance.high === 0
                          ? 'none — benchmark already met'
                          : `${fmt(selDistance.low, selDistance.low < 10 ? 1 : 0)}–${fmt(selDistance.high, selDistance.high < 10 ? 1 : 0)} ${t.unit}`}
                      </span>
                      .
                      {selPace && (
                        <>
                          {' '}
                          Observed trend{' '}
                          <span className="font-mono tabular-nums">
                            {selPace.observedPerYear >= 0 ? '+' : ''}
                            {fmt(selPace.observedPerYear, 2)}/yr
                          </span>{' '}
                          ({selPace.trendFrom}–{selPace.trendTo}) vs required{' '}
                          <span className="font-mono tabular-nums">
                            {fmt(Math.max(selPace.requiredPerYear, 0), 2)}/yr
                          </span>{' '}
                          — pace ratio{' '}
                          <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                            {selPace.ratio === null ? 'n/a (benchmark met)' : `${fmt(selPace.ratio, 2)}×`}
                          </span>
                          , read against the EEA thresholds (≥1.0 on track, ≥0.5 lagging).
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] italic text-tertiary">Not computable without a capacity figure.</p>
                  )}
                </div>
              </div>

              {/* supplier concentration + world share */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Supplier concentration</p>
                  {t.suppliers ? (
                    <div className="mt-1.5">
                      {t.suppliers.shares.map((s) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-[11px] text-tertiary">{s.name}</span>
                          <div className="relative h-4 flex-1 rounded bg-grey-100">
                            <div
                              className="absolute inset-y-0 left-0 rounded"
                              style={{ width: `${s.share}%`, background: TECH_C[t.id], opacity: 0.85 }}
                            />
                          </div>
                          <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-tertiary-dark">
                            {approx(s.uncertain, `${fmt(s.share, 0)} %`)}
                          </span>
                        </div>
                      ))}
                      <p className="mt-1.5 text-[10.5px] text-tertiary">
                        Basis: {t.suppliers.basis} — {t.suppliers.source}, {t.suppliers.year}
                        {t.suppliers.uncertain ? ' ⚑' : ''}. HHI ≥{' '}
                        <span className="font-mono tabular-nums">{fmt(hhiLowerBound(t.suppliers.shares))}</span>{' '}
                        (lower bound over listed origins only; &gt;2 500 counts as highly concentrated).
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] italic text-tertiary">No defensible import-share breakdown.</p>
                  )}
                  <p className="mt-1.5 text-[11px] leading-relaxed text-tertiary">{t.topSupplierNote}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
                    EU share of world production (2040 axis: ≈{NZIA_2040_WORLD_SHARE} %)
                  </p>
                  {t.worldShare ? (
                    <p className="mt-1 text-[11.5px] text-tertiary">
                      <span className="font-mono font-semibold tabular-nums text-tertiary-dark">
                        {approx(t.worldShare.uncertain, `${fmt(t.worldShare.value, t.worldShare.value < 10 ? 1 : 0)} %`)}
                      </span>{' '}
                      · {t.worldShare.source}, {t.worldShare.year}
                      {t.worldShare.uncertain ? ' ⚑' : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] italic text-tertiary">No defensible published share.</p>
                  )}
                </div>
                <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">What holds domestic capacity back</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">{t.bottleneck.text}</p>
                  <p className="mt-1.5 text-[10px] text-tertiary">Sources: {t.bottleneck.sources.join(' · ')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled {COMPILED} — pending Secretariat verification. Deployment needs are scenario quantities, not
            observations, and are flagged accordingly. Capacity figures conflate nameplate, effective and ramp-up
            capacity across sources — the disagreement is shown, not resolved. The pace ratio is computed on the
            capacity mid-point against the need mid-point (both labelled), using the same arithmetic and thresholds
            as the policy-coherence modules; for solar PV the post-2023 plant closures probably make the shown ratio
            an overestimate of the true pace. Import-penetration and supplier shares come from published COMEXT
            summaries — the deterministic CN-code list per technology, the Policy-Targets-Register entries with
            verbatim NZIA provision text, and the join to the cleantech-catalogue mitigation levers are the deferred
            backlog for this module, deliberately not in this round. NZIA benchmark texts above are paraphrases, not
            quotes.
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
