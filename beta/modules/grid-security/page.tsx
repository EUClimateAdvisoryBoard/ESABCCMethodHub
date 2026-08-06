'use client';

/**
 * Grid & Interconnection Security Ledger (beta module M · 50).
 *
 * Three deterministic panels on the infrastructure that electrification
 * runs on — now both an investment gap and a security target:
 *   1. INTERCONNECTION — the 15 %-by-2030 electricity interconnection
 *      target (European Council Oct 2014 / Governance Regulation (EU)
 *      2018/1999 Annex I) as a target card, with indicative per-member-state
 *      ratios and distance-to-target bars.
 *   2. INVESTMENT GAP — grid investment need (COM(2023) 757 ≈ €584 bn to
 *      2030; ENTSO-E TYNDP capacity needs) vs realised investment, with a
 *      simple pace-ratio computation (model.ts).
 *   3. INCIDENT LEDGER — dated, sourced register of physical/cyber
 *      incidents and resilience milestones on EU energy infrastructure
 *      since 2022, classified by a deterministic vocabulary; attribution
 *      always quoted or paraphrased from the investigating authority,
 *      never asserted by the module.
 *
 * Epistemic status: AI-compiled — pending Secretariat verification. The
 * interconnection ratios are 2017-basis orders of magnitude; the realised
 * investment pace is the weakest number on the page and is flagged as
 * such; several ledger details carry explicit unverified notes. Nothing
 * here is a citable statistic. See data.generated.ts for the full
 * provenance block.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ConfidenceDot from '@/components/ui/ConfidenceDot';
import { FilterPill } from '@/components/ui/FilterPill';
import {
  ASSET_TYPES,
  ATTRIBUTION_STATUSES,
  AssetType,
  INTERCONNECTION_TARGET_PCT,
  LedgerEntry,
  confidenceScore,
  countBelowTarget,
  distanceToTarget,
  ledgerCounts,
  paceStats,
  sortLedger,
} from './model';
import {
  INVESTMENT_ROWS,
  LEDGER,
  MEMBER_STATE_RATIOS,
  PACE_BASIS_NOTE,
  PACE_INPUTS,
  SOURCES,
  TARGET_CARD,
} from './data.generated';

/* ------------------------------------------------------------- palette */
// Asset-type series palette (chart/chip colours). Chosen from the repo's
// validated chart set for colour-vision-deficiency safety: no red–green
// pairing carries meaning; orange vs blue encodes below/at target on the
// bars, and each asset type additionally carries a text label, never
// colour alone.
const ASSET_C: Record<AssetType, string> = {
  'gas-pipeline': '#E0701A',
  'power-cable': '#0065A4',
  'telecom-cable': '#6667AB',
  'grid-substation': '#B83230',
  'grid-system': '#A530B8',
  'cyber-ot': '#1F8F63',
  milestone: '#00928F',
};
const BAR_BELOW = '#E0701A'; // below the 15 % target
const BAR_AT = '#0065A4'; // at or above the 15 % target

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

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

function AssetChip({ type }: { type: AssetType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-grey-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-tertiary-dark">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: ASSET_C[type] }} aria-hidden />
      {ASSET_TYPES[type].label}
    </span>
  );
}

function StatusChip({ entry }: { entry: LedgerEntry }) {
  const positive = entry.attribution === 'not-applicable';
  const concluded = entry.attribution === 'accident-concluded' || entry.attribution === 'technical-failure';
  const tone = positive
    ? 'bg-surface-green text-secondary'
    : concluded
      ? 'bg-surface-blue text-primary'
      : 'bg-surface-orange text-tertiary-dark';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`} title={ATTRIBUTION_STATUSES[entry.attribution].rule}>
      {ATTRIBUTION_STATUSES[entry.attribution].label}
    </span>
  );
}

/* ------------------------------------------- interconnection bar rows */

function InterconnectionBars() {
  const rows = useMemo(
    () => [...MEMBER_STATE_RATIOS].sort((a, b) => a.ratioPct - b.ratioPct),
    [],
  );
  const axisMax = 100; // values above 100 are capped visually and labelled
  return (
    <div>
      <div className="space-y-1">
        {rows.map((r) => {
          const below = r.ratioPct < INTERCONNECTION_TARGET_PCT;
          const capped = r.ratioPct > axisMax;
          const w = (Math.min(r.ratioPct, axisMax) / axisMax) * 100;
          const gap = distanceToTarget(r.ratioPct);
          return (
            <div
              key={r.code}
              className="group flex items-center gap-2"
              title={`${r.name}: ≈ ${fmt(r.ratioPct)} % (${r.basisYear} basis, ${r.uncertainty} uncertainty)${
                below ? ` · ${fmt(gap)} pp below the 15 % target` : ' · at/above target'
              }${r.note ? ` — ${r.note}` : ''}`}
            >
              <span className="w-24 shrink-0 truncate text-[11px] text-tertiary">{r.name}</span>
              <div className="relative h-4 flex-1 rounded bg-grey-100">
                {/* 15 % target marker */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 z-10 w-0 border-l-2 border-dashed border-tertiary-dark/60"
                  style={{ left: `${(INTERCONNECTION_TARGET_PCT / axisMax) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${w}%`, background: below ? BAR_BELOW : BAR_AT, opacity: 0.85 }}
                />
                {capped && (
                  <span className="absolute inset-y-0 right-1 flex items-center font-mono text-[9.5px] tabular-nums text-white">
                    {fmt(r.ratioPct)} % →
                  </span>
                )}
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-tertiary-dark">
                ≈ {fmt(r.ratioPct)} %
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-tertiary">
                ’{String(r.basisYear).slice(2)}
              </span>
              <span className="w-10 shrink-0 text-right">
                <ConfidenceDot score={confidenceScore(r.uncertainty)} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR_BELOW }} /> below 15 % target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR_AT }} /> at / above target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0 border-l-2 border-dashed border-tertiary-dark/60" /> 15 % target line
        </span>
        <span>columns: indicative level · basis year · confidence (axis capped at 100 %)</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------- pace chart (SVG) */

function PaceChart() {
  const s = paceStats(PACE_INPUTS);
  const W = 720;
  const H = 132;
  const m = { l: 200, r: 60, t: 18, b: 26 };
  const iw = W - m.l - m.r;
  const xMax = 70; // €bn/yr axis
  const sx = (v: number) => m.l + (v / xMax) * iw;
  const rows = [
    {
      label: `Required pace (€${fmt(PACE_INPUTS.needBn)} bn ÷ ${PACE_INPUTS.periodEndYear - PACE_INPUTS.periodStartYear + 1} yr)`,
      value: s.requiredAnnualBn,
      color: BAR_AT,
      range: null as null | { lo: number; hi: number },
    },
    {
      label: 'Realised pace (AI-compiled estimate)',
      value: PACE_INPUTS.realisedAnnualBn.central,
      color: BAR_BELOW,
      range: { lo: PACE_INPUTS.realisedAnnualBn.low, hi: PACE_INPUTS.realisedAnnualBn.high },
    },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Required versus realised annual grid investment pace in billion euro per year">
      {[0, 20, 40, 60].map((v) => (
        <g key={v}>
          <line x1={sx(v)} x2={sx(v)} y1={m.t} y2={H - m.b} stroke="#E6E7E8" strokeWidth={1} />
          <text x={sx(v)} y={H - 10} textAnchor="middle" className="fill-grey-500" fontSize={10}>
            {v}
          </text>
        </g>
      ))}
      <text x={W - m.r + 8} y={H - 10} className="fill-grey-500" fontSize={10}>
        €bn/yr
      </text>
      {rows.map((r, i) => {
        const y = m.t + i * 46;
        return (
          <g key={r.label}>
            <text x={m.l - 8} y={y + 15} textAnchor="end" className="fill-tertiary" fontSize={11}>
              {r.label}
            </text>
            <rect x={sx(0)} y={y} width={sx(r.value) - sx(0)} height={22} rx={3} fill={r.color} opacity={0.85} />
            {r.range && (
              <g>
                <line x1={sx(r.range.lo)} x2={sx(r.range.hi)} y1={y + 11} y2={y + 11} stroke="#2E3E4C" strokeWidth={1.5} />
                <line x1={sx(r.range.lo)} x2={sx(r.range.lo)} y1={y + 5} y2={y + 17} stroke="#2E3E4C" strokeWidth={1.5} />
                <line x1={sx(r.range.hi)} x2={sx(r.range.hi)} y1={y + 5} y2={y + 17} stroke="#2E3E4C" strokeWidth={1.5} />
              </g>
            )}
            <text x={sx(r.range ? r.range.hi : r.value) + 6} y={y + 15} className="fill-tertiary-dark" fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace">
              {r.range ? `${fmt(r.range.lo)}–${fmt(r.range.hi)}` : `≈ ${fmt(r.value, 1)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------- page */

type LedgerFilter = 'all' | AssetType;

export default function GridSecurityPage() {
  const [filter, setFilter] = useState<LedgerFilter>('all');

  const ledger = useMemo(() => sortLedger(LEDGER), []);
  const shown = useMemo(
    () => (filter === 'all' ? ledger : ledger.filter((e) => e.assetType === filter)),
    [ledger, filter],
  );
  const counts = useMemo(() => ledgerCounts(ledger), [ledger]);
  const pace = paceStats(PACE_INPUTS);
  const belowTarget = countBelowTarget(MEMBER_STATE_RATIOS);
  const milestones = ledger.filter((e) => e.assetType === 'milestone').length;

  const filterTypes = useMemo(() => {
    const present = new Set(ledger.map((e) => e.assetType));
    return (Object.keys(ASSET_TYPES) as AssetType[]).filter((t) => present.has(t));
  }, [ledger]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 50 · grid &amp; interconnection security ledger · AI-compiled
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Grid &amp; Interconnection Security Ledger
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            Electrification is the delivery mechanism for most of the EU’s gap closures, and it runs on
            infrastructure that is now both an investment gap and a security target. Three deterministic panels: the
            15 %-by-2030 interconnection target and where the member states indicatively stand; grid investment need
            versus realised pace; and a dated, sourced ledger of physical and cyber incidents on EU energy
            infrastructure since 2022 — with the resilience milestones recorded alongside as the positive counterpart.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-6 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Compiled 2026-08 from the documents cited on each row. The interconnection ratios are{' '}
            <strong>2017-basis orders of magnitude</strong> (COM(2017) 718 table) — interconnectors commissioned since
            are noted but not folded into the numbers, and monitoring reports use differing definitions, so the ratios
            are indicative and not comparable with NECP self-reported levels. The realised investment pace is an
            AI-compiled range and the weakest number on the page. In the incident ledger, attribution is{' '}
            <strong>always quoted or paraphrased from the investigating authority</strong>, never asserted by this
            module, and entries that could not be confidently sourced carry an explicit unverified note.{' '}
            <strong>Nothing on this page is a citable statistic.</strong>
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="MS below the 15 % target"
            value={`${fmt(belowTarget)} / 27`}
            sub="On the 2017-basis indicative levels — several have commissioned links since."
          />
          <StatTile
            label="Grid investment need to 2030"
            value="≈ €584 bn"
            sub="COM(2022) 552, restated in the EU Action Plan for Grids, COM(2023) 757."
          />
          <StatTile
            label="Pace ratio (realised ÷ required)"
            value={`≈ ${fmt(pace.ratio.central, 2)} ×`}
            sub={`Range ${fmt(pace.ratio.low, 2)}–${fmt(pace.ratio.high, 2)} ×; realised pace is an AI-compiled estimate.`}
          />
          <StatTile
            label="Ledger entries since 2022"
            value={fmt(ledger.length)}
            sub={`${fmt(ledger.length - milestones)} incidents · ${fmt(milestones)} resilience milestones.`}
          />
        </section>

        {/* 1 — interconnection */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The 15 % interconnection target — and where the member states stand</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-[340px_1fr]">
            {/* target card */}
            <div className="space-y-3">
              <div className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Policy target</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-tertiary-dark">15 % by 2030</p>
                <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
                  Electricity interconnection capacity as a share of installed generation capacity. Endorsed by the
                  European Council in October 2014 as the extension of the 10 %-by-2020 objective; carried into Union
                  law as a mandatory NECP reporting dimension by the Governance Regulation (EU) 2018/1999, Annex I.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-tertiary">{TARGET_CARD.natureNote}</p>
                <ul className="mt-2.5 space-y-1 text-[11px]">
                  {TARGET_CARD.origin.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {s.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-grey-200 bg-surface-blue p-4">
                <p className="text-[11px] font-bold text-tertiary-dark">What actually compares — read before the bars</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-tertiary">
                  As with the NECPR modules: the definitions differ, so the bars are indicative, not a ranking.
                  The headline indicator divides import capacity by installed generation — small systems can exceed
                  100 % (Luxembourg) and a large system can look weak while being amply secure. Monitoring reports and
                  NECP self-reporting use different capacity bases and years; links to third countries (GB since 2021,
                  NO, CH) count physically but change the policy meaning. Distance-to-target here means only
                  “percentage points below 15 on the 2017-basis figure” — nothing more.
                </p>
              </div>
            </div>
            {/* bars */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-2 text-[12px] font-bold text-tertiary-dark">
                Indicative interconnection levels vs the 15 % line — 2017 basis, orders of magnitude
              </p>
              <InterconnectionBars />
              <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
                Hover a row for the distance to target, the basis year and what has changed since (e.g. Belgium’s Nemo
                Link and ALEGrO, Ireland’s Greenlink, Denmark’s Viking Link). Estonia’s EstLink 2 was out of service
                December 2024 – June 2025 after cable damage — see the ledger below: the target and the security
                register are the same infrastructure.
              </p>
            </div>
          </div>
        </section>

        {/* 2 — investment gap */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The investment gap — need vs realised pace</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The rows below measure different things (different scopes, periods and voltage levels) and are deliberately
            shown as labelled rows rather than averaged. Only the pace computation reduces anything to one number, and
            it states exactly which inputs it uses.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {INVESTMENT_ROWS.map((r) => (
                <div key={r.id} className="rounded-lg border border-grey-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-bold text-tertiary-dark">{r.label}</p>
                    <ConfidenceDot score={confidenceScore(r.uncertainty)} />
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-bold tabular-nums text-primary">{r.figure}</p>
                  <p className="mt-1 text-[11px] leading-snug text-tertiary">{r.scopeNote}</p>
                  <a href={r.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[11px] text-primary hover:underline">
                    {r.locator} ↗
                  </a>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[12px] font-bold text-tertiary-dark">Pace ratio</p>
                <PaceChart />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <StatTile label="Required pace" value={`≈ €${fmt(pace.requiredAnnualBn, 0)} bn/yr`} sub="€584 bn spread evenly over 2021–2030." />
                  <StatTile
                    label="Years at realised pace"
                    value={`≈ ${fmt(pace.yearsAtRealisedPace, 0)} yr`}
                    sub="How long the decade’s need would take at the central realised estimate."
                  />
                </div>
                <p className="mt-2 text-[10.5px] leading-snug text-tertiary">{PACE_BASIS_NOTE}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 — incident ledger */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · Incident ledger — EU energy infrastructure since 2022</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Classification is deterministic: one asset-type label and one attribution status per entry, assigned
            against the written rules in <span className="font-mono text-[12px]">model.ts</span>. The attribution
            status records only what an investigating authority has publicly concluded — sabotage confirmed:{' '}
            {fmt(counts['sabotage-confirmed'])}, state-attributed: {fmt(counts['state-attributed'])}, investigation
            ongoing: {fmt(counts['investigation-ongoing'])}, accident/technical concluded:{' '}
            {fmt(counts['accident-concluded'] + counts['technical-failure'])}, milestones:{' '}
            {fmt(counts['not-applicable'])}. The accident and technical-failure entries are kept deliberately: not
            every cable break is sabotage, and the ledger records the authorities saying so.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterPill label="All entries" active={filter === 'all'} count={ledger.length} onClick={() => setFilter('all')} />
            {filterTypes.map((t) => (
              <FilterPill
                key={t}
                label={ASSET_TYPES[t].label}
                active={filter === t}
                count={ledger.filter((e) => e.assetType === t).length}
                onClick={() => setFilter(filter === t ? 'all' : t)}
              />
            ))}
          </div>
          <div className="mt-3 space-y-3">
            {shown.map((e) => (
              <article key={e.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-bold tabular-nums text-tertiary-dark">{e.date}</span>
                  <AssetChip type={e.assetType} />
                  <StatusChip entry={e} />
                  <span className="ml-auto">
                    <ConfidenceDot score={confidenceScore(e.uncertainty)} showLabel />
                  </span>
                </div>
                <h3 className="mt-1.5 text-[13.5px] font-bold text-tertiary-dark">{e.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary">{e.summary}</p>
                <div className="mt-2 rounded border-l-2 border-grey-300 bg-grey-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
                    Investigating authority ({e.quoteKind === 'paraphrase' ? 'paraphrase' : 'as reported'})
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-tertiary-dark">{e.authorityPosition}</p>
                </div>
                {e.unverifiedNote && (
                  <p className="mt-2 rounded bg-surface-orange px-2.5 py-1.5 text-[11px] leading-snug text-tertiary-dark">
                    <span className="font-bold">Unverified:</span> {e.unverifiedNote}
                  </p>
                )}
                <ul className="mt-2 space-y-0.5 text-[11px]">
                  {e.sources.map((s) => (
                    <li key={s.url + s.label}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {s.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled 2026-08, pending Secretariat verification — see the provenance block in{' '}
            <span className="font-mono text-[11px]">data.generated.ts</span>. Interconnection ratios are 2017-basis
            (COM(2017) 718) orders of magnitude with post-2017 links noted but not folded in; ENTSO-E monetary TYNDP
            figures and 2022 Norwegian drone observations were dropped rather than guessed; the realised investment
            pace mixes a sourced DSO figure with an assumed TSO order of magnitude and is flagged high-uncertainty.
            Incident attribution is quoted or paraphrased from the named investigating authority and several
            court-outcome details carry explicit unverified notes. Deep links could not be live-verified from this
            sandbox: where a link was uncertain, the institution’s stable root is given with a textual locator.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url + s.label}>
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
