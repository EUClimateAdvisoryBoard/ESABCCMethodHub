'use client';

/**
 * Trade-Partner Climate Policy & Article 6 Tracker (beta module M · 52).
 *
 * The ETS Phase-5 proposal (COM(2026) 616) leans on ≈260 Mt of
 * international credits over 2036–40 and CBAM assumes trade partners
 * respond — both are bets on other jurisdictions. This module tracks the
 * actual state of play in three panels:
 *   1. PARTNER REGISTER — US, UK, China, India, Türkiye, Japan, Brazil,
 *      Gulf states: carbon-price coverage and level, 2035 NDC status,
 *      CBAM stance and EU-ETS linkage prospects, each on a deterministic
 *      status vocabulary (in force / adopted / proposed / rolled back /
 *      none) with source links.
 *   2. ARTICLE 6 SUPPLY PIPELINE — authorised and issued volumes by host
 *      (order of magnitude), and a credibility band against the ≈260 Mt
 *      demand: plausible supply at quality as a RANGE bar with an
 *      integrity-haircut slider echoing the M · 26 safety-valve logic.
 *   3. ROLLBACK WATCH — a dated ledger of partner-policy reversals and
 *      their counterweights.
 *
 * Epistemic status: AI-compiled snapshot (compile date 2026-08, source
 * currency roughly early 2026) — pending Secretariat verification.
 * Partner-policy status changes weekly; every panel carries the compile
 * date. Values that could not be corroborated are flagged, not asserted.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ARTICLE6_HOSTS,
  COMPILE_DATE,
  DEMAND_SOURCE,
  KNOWLEDGE_CUTOFF_NOTE,
  LedgerEntry,
  PARTNERS,
  PolicyStatus,
  ROLLBACK_LEDGER,
  StatusCell,
  SUPPLY_TIERS,
} from './data.generated';
import {
  DEFAULT_HAIRCUT,
  DEMAND_MT,
  Dimension,
  fmt,
  fmtRange,
  STATUS_META,
  statusCount,
  supplyAtQuality,
  uncertainCellCount,
  VERDICT_TEXT,
  verdict,
} from './model';

/* ------------------------------------------------------------- palette */
// Status vocabulary colours (CVD-aware: green/blue/orange/red/grey — the
// validated 5-set used across modules; colour is never the only channel,
// every chip also carries its text label).
const STATUS_C: Record<PolicyStatus, string> = {
  'in-force': '#1F8F63',
  adopted: '#0065A4',
  proposed: '#E0701A',
  'rolled-back': '#B83230',
  none: '#808285',
};
// Supply-chart series (same CVD-safe family; bars are text-labelled too):
// demand slate, issued grey, authorised blue, face-value orange, at-quality green.
const BAR_C = { demand: '#3D5265', issued: '#808285', authorised: '#0065A4', faceValue: '#E0701A', quality: '#1F8F63' };

/* ------------------------------------------------------------- UI bits */

function SnapshotTag() {
  return (
    <span
      title={KNOWLEDGE_CUTOFF_NOTE}
      className="inline-block shrink-0 rounded bg-grey-100 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-tertiary"
    >
      snapshot {COMPILE_DATE}
    </span>
  );
}

function StatusChip({ status }: { status: PolicyStatus }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-grey-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-tertiary-dark">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_C[status] }} />
      {STATUS_META[status].label}
    </span>
  );
}

function UncertainTag({ label = 'uncertain' }: { label?: string }) {
  return (
    <span className="inline-block shrink-0 rounded bg-surface-orange px-1.5 py-0.5 text-[10px] font-semibold text-accent-orange">
      ⚠ {label}
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

function CellRow({ label, c }: { label: string; c: StatusCell & { coverageNote?: string } }) {
  return (
    <div className="border-t border-grey-100 py-2 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{label}</span>
        <StatusChip status={c.status} />
        <span className="text-[12px] font-semibold text-tertiary-dark">{c.headline}</span>
        {c.sourceYear && <span className="font-mono text-[10px] tabular-nums text-tertiary">({c.sourceYear})</span>}
        {c.uncertain && <UncertainTag />}
      </div>
      {c.coverageNote && <p className="mt-1 pl-0 text-[11px] leading-snug text-tertiary sm:pl-[7.5rem]">{c.coverageNote}</p>}
      <p className="mt-1 pl-0 text-[11px] leading-snug text-tertiary sm:pl-[7.5rem]">{c.note}</p>
    </div>
  );
}

/* --------------------------------------- supply vs demand range chart */

type BarRow = { label: string; lo: number; hi: number; color: string; note?: string };

function SupplyChart({ rows, xMax }: { rows: BarRow[]; xMax: number }) {
  const W = 720;
  const rowH = 34;
  const m = { l: 8, r: 120, t: 26, b: 22 };
  const H = m.t + rows.length * rowH + m.b;
  const iw = W - m.l - m.r;
  const sx = (v: number) => m.l + (v / xMax) * iw;

  const grid: number[] = [];
  for (let v = 0; v <= xMax; v += 200) grid.push(v);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Article 6 supply tiers and plausible supply at quality, as ranges in megatonnes, against the ${DEMAND_MT} megatonne demand of the ETS Phase-5 proposal`}
    >
      {grid.map((v) => (
        <g key={v}>
          <line x1={sx(v)} x2={sx(v)} y1={m.t - 6} y2={H - m.b} stroke="#E6E7E8" strokeWidth={1} />
          <text x={sx(v)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>
            {fmt(v)}
          </text>
        </g>
      ))}
      <text x={W - m.r + 8} y={H - 8} className="fill-grey-500" fontSize={10}>
        Mt cumulative
      </text>
      {/* demand line */}
      <line x1={sx(DEMAND_MT)} x2={sx(DEMAND_MT)} y1={m.t - 14} y2={H - m.b} stroke={BAR_C.demand} strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={sx(DEMAND_MT) + 5} y={m.t - 6} fontSize={10} fontWeight={700} className="fill-tertiary-dark">
        demand ≈{DEMAND_MT} Mt · COM(2026) 616 · 2036–40
      </text>
      {rows.map((r, i) => {
        const y = m.t + i * rowH + 6;
        const x0 = sx(r.lo);
        const x1 = Math.max(sx(r.hi), x0 + 2); // keep near-zero ranges visible
        return (
          <g key={r.label}>
            <text x={m.l} y={y - 3} fontSize={10.5} fontWeight={700} className="fill-tertiary-dark">
              {r.label}
            </text>
            <rect x={x0} y={y} width={x1 - x0} height={12} rx={2} fill={r.color} opacity={0.85} />
            {/* range end caps */}
            <line x1={x0} x2={x0} y1={y - 2} y2={y + 14} stroke={r.color} strokeWidth={2} />
            <line x1={x1} x2={x1} y1={y - 2} y2={y + 14} stroke={r.color} strokeWidth={2} />
            <text x={x1 + 6} y={y + 10} fontSize={10} className="fill-tertiary">
              {fmtRange([r.lo, r.hi])} Mt
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------- static copy */

const SOURCES: { label: string; url: string }[] = [
  { label: 'World Bank — State and Trends of Carbon Pricing 2025', url: 'https://www.worldbank.org/en/publication/state-and-trends-of-carbon-pricing' },
  { label: 'World Bank — Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
  { label: 'ICAP — ETS map & Status Report 2025', url: 'https://icapcarbonaction.com/en/ets' },
  { label: 'UNFCCC — NDC Registry (2035 NDCs)', url: 'https://unfccc.int/NDCREG' },
  { label: 'UNFCCC — Article 6 cooperative implementation (6.2 reporting & CARP)', url: 'https://unfccc.int/process-and-meetings/the-paris-agreement/cooperative-implementation' },
  { label: 'UNEP-CCC — Article 6 pipeline', url: 'https://unepccc.org/article-6-pipeline/' },
  { label: 'IETA — Article 6 market analyses', url: 'https://www.ieta.org/' },
  { label: DEMAND_SOURCE.label, url: DEMAND_SOURCE.url },
  { label: 'UK–EU summit key documents, 19 May 2025 (Common Understanding)', url: 'https://www.gov.uk/government/publications/uk-eu-summit-key-documents' },
  { label: 'White House — EO of 20 Jan 2025 (Paris withdrawal)', url: 'https://www.whitehouse.gov/presidential-actions/2025/01/putting-america-first-in-international-environmental-agreements/' },
  { label: 'MEE (China) — national ETS expansion 2025', url: 'https://english.mee.gov.cn/' },
  { label: 'GX League (Japan, METI)', url: 'https://gx-league.go.jp/' },
  { label: 'Brazil — Law 15.042/2024 (SBCE)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L15042.htm' },
];

/* ------------------------------------------------------------------ page */

export default function TradePartnerClimatePage() {
  const [haircut, setHaircut] = useState(DEFAULT_HAIRCUT);

  const band = useMemo(() => supplyAtQuality(haircut), [haircut]);
  const bandVerdict = verdict(band);

  const faceLo = SUPPLY_TIERS.authorised.range[0] + SUPPLY_TIERS.pipeline.range[0];
  const faceHi = SUPPLY_TIERS.authorised.range[1] + SUPPLY_TIERS.pipeline.range[1];

  const chartRows: BarRow[] = [
    { label: 'Issued / first-transferred to date', lo: SUPPLY_TIERS.issued.range[0], hi: SUPPLY_TIERS.issued.range[1], color: BAR_C.issued },
    { label: 'Host authorisations to date', lo: SUPPLY_TIERS.authorised.range[0], hi: SUPPLY_TIERS.authorised.range[1], color: BAR_C.authorised },
    { label: 'Face-value pipeline (authorisations + agreements + PACM)', lo: faceLo, hi: faceHi, color: BAR_C.faceValue },
    { label: `Plausible supply at quality (after ${Math.round(haircut * 100)} % haircut)`, lo: band.lo, hi: band.hi, color: BAR_C.quality },
  ];
  const xMax = Math.max(800, Math.ceil(faceHi / 200) * 200);

  const inForcePrices = statusCount('carbonPrice', 'in-force');
  const ndcOnRegister = statusCount('ndc2035', 'adopted');
  const linkageInPrinciple = statusCount('linkage', 'adopted');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 52 · trade-partner climate policy &amp; Article 6 · snapshot {COMPILE_DATE}
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Trade-Partner Climate Policy &amp; Article 6 Tracker
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            The ETS Phase-5 proposal leans on ≈260 Mt of international credits over 2036–40, and CBAM assumes trade
            partners respond — both are bets on other jurisdictions. This module tracks the actual state of play: what
            the EU&rsquo;s main trade partners are doing on carbon pricing, 2035 NDCs, CBAM and ETS linkage; how much
            Article 6 supply plausibly exists at quality against that ≈260 Mt; and which partner policies moved
            backwards — or forwards — since 2024.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification · this is a snapshot
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            <strong>Partner-policy status changes weekly; every panel below is a snapshot with compile date{' '}
            {COMPILE_DATE}.</strong> Source currency is roughly early 2026 — later developments are not captured, so
            treat the register as stale by up to two quarters. Carbon-price levels are ranges with a source year, not
            spot quotes; Article 6 volumes are orders of magnitude from UNFCCC and IETA public reporting, not audited
            registry totals; {uncertainCellCount()} of the register&rsquo;s {PARTNERS.length * 4} status cells are
            explicitly flagged as uncertain. Nothing here has been human-verified; anything the compile could not
            corroborate is flagged, not asserted.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="Partners tracked" value={`${PARTNERS.length}`} sub="Nine jurisdictions — the Gulf card covers Saudi Arabia and the UAE together." />
          <StatTile
            label="National carbon price in force"
            value={`${inForcePrices} of ${PARTNERS.length}`}
            sub="UK and China. Four more (India, Türkiye, Japan, Brazil) have adopted schemes with no compliance price yet."
          />
          <StatTile
            label="2035 NDCs on the register"
            value={`${ndcOnRegister} of ${PARTNERS.length}`}
            sub="UK, Japan, Brazil, China (announced Sept 2025; submission unverified), UAE. US withdrawn; India, Türkiye, Saudi Arabia none at compile."
          />
          <StatTile label="EU-ETS linkage agreed in principle" value={`${linkageInPrinciple}`} sub="The UK, at the 19 May 2025 summit. No other partner is close." />
          <StatTile
            label="Article 6 issued vs Phase-5 demand"
            value={`${fmtRange(SUPPLY_TIERS.issued.range)} / ${DEMAND_MT} Mt`}
            sub="Credits actually moved under Article 6 to date, against the ≈260 Mt of 2036–40 demand in COM(2026) 616."
          />
        </section>

        {/* 1 — partner register */}
        <section className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-tertiary-dark">1 · Partner register</h2>
            <SnapshotTag />
          </div>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            One card per partner; every cell uses the deterministic status vocabulary{' '}
            <span className="font-semibold">in force / adopted / proposed / rolled back / none</span> and carries its
            source year. Price levels and coverage follow World Bank State &amp; Trends 2025 and the ICAP 2025 status
            reporting; cells the compile could not fully corroborate are flagged.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {PARTNERS.map((p) => (
              <div key={p.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-tertiary-dark">{p.name}</p>
                  <SnapshotTag />
                </div>
                <div className="mt-2">
                  {(
                    [
                      ['Carbon price', 'carbonPrice'],
                      ['2035 NDC', 'ndc2035'],
                      ['CBAM', 'cbam'],
                      ['EU-ETS linkage', 'linkage'],
                    ] as [string, Dimension][]
                  ).map(([label, dim]) => (
                    <CellRow key={dim} label={label} c={p[dim]} />
                  ))}
                </div>
                <p className="mt-2 border-t border-grey-100 pt-2 text-[10.5px] text-tertiary">
                  Sources:{' '}
                  {p.sources.map((s, i) => (
                    <span key={s.url}>
                      {i > 0 && ' · '}
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {s.label} ↗
                      </a>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2 — Article 6 credibility band */}
        <section className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-tertiary-dark">2 · Article 6 supply vs the ≈260 Mt bet</h2>
            <SnapshotTag />
          </div>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            COM(2026) 616 would re-admit up to 2 % of the cap in high-quality international credits — roughly{' '}
            {DEMAND_MT} Mt cumulative over 2036–40, contingent on a 2033 availability review. Set an integrity haircut
            (the M · 26 safety-valve logic: one pipeline tonne counts as less than one quality-assured tonne) and read
            the plausible-supply range against the demand line. All supply figures are AI-compiled orders of magnitude.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <SupplyChart rows={chartRows} xMax={xMax} />
              <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
                Band construction (deterministic, see <span className="font-mono">model.ts</span>): the low end assumes
                only the low end of today&rsquo;s host authorisations delivers; the high end takes the whole face-value
                pipeline at its word; both are then discounted by the haircut. Range end caps mark the order-of-magnitude
                bounds — the honest reading is the width, not any midpoint.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-grey-200 bg-white p-3">
                <label className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-tertiary-dark">Integrity haircut</span>
                    <span className="font-mono text-[12px] tabular-nums text-primary">{Math.round(haircut * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={haircut}
                    onChange={(e) => setHaircut(Number(e.target.value))}
                    className="mt-1.5 w-full accent-primary"
                  />
                  <p className="mt-1 text-[10.5px] leading-snug text-tertiary">
                    Share of pipeline volume assumed to fail the quality bar (additionality, baselines, corresponding
                    adjustments). M · 26 uses 10–20 % for ETS-internal permanent CDR; the default here is a heavier{' '}
                    {Math.round(DEFAULT_HAIRCUT * 100)} % because international crediting carries higher integrity risk.
                  </p>
                </label>
              </div>
              <StatTile
                label="Plausible supply at quality, 2036–40"
                value={`${fmt(band.lo)}–${fmt(band.hi)} Mt`}
                sub={`Covers ${fmt(band.coverageLo * 100, band.coverageLo < 0.1 ? 1 : 0)}–${fmt(band.coverageHi * 100)} % of the ≈${DEMAND_MT} Mt demand at this haircut.`}
              />
              <div className="rounded-lg border border-grey-200 bg-surface-blue p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Deterministic reading</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary-dark">{VERDICT_TEXT[bandVerdict]}</p>
                <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">
                  This is the question the proposal&rsquo;s own 2033 availability review must answer; if it fails, the
                  2036–40 LRF reverts from 1.7 % to 2.7 % and the cap tightens instead.
                </p>
              </div>
            </div>
          </div>

          {/* host table */}
          <div className="mt-4 rounded-lg border border-grey-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12px] font-bold text-tertiary-dark">Authorised and issued volumes by host — order of magnitude</p>
              <SnapshotTag />
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-grey-200 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">
                    <th className="py-1.5 pr-3">Host</th>
                    <th className="py-1.5 pr-3">Buyers</th>
                    <th className="py-1.5 pr-3 text-right">Authorised (Mt)</th>
                    <th className="py-1.5 pr-3 text-right">Issued (Mt)</th>
                    <th className="py-1.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {ARTICLE6_HOSTS.map((h) => (
                    <tr key={h.host} className="border-b border-grey-100 align-top">
                      <td className="py-2 pr-3 font-semibold text-tertiary-dark">{h.host}</td>
                      <td className="py-2 pr-3 text-tertiary">{h.buyers}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-tertiary-dark">{fmtRange(h.authorisedMt)}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-tertiary-dark">{fmtRange(h.issuedMt)}</td>
                      <td className="py-2 text-tertiary">
                        {h.note} {h.confidence === 'unverified' && <UncertainTag label="unverified" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10.5px] text-tertiary">
              Order-of-magnitude compilation from UNFCCC Article 6 reporting, the UNEP-CCC Article 6 pipeline and IETA
              analyses — not audited registry totals. AI-compiled, pending Secretariat verification.
            </p>
          </div>
        </section>

        {/* 3 — rollback watch */}
        <section className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-tertiary-dark">3 · Rollback watch — reversals and counterweights</h2>
            <SnapshotTag />
          </div>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The report&rsquo;s international-context chapter needs the trajectory, not a snapshot: a dated ledger of
            partner-policy reversals (red) and the counterweights that pushed the other way (green). Entries the
            compile could not corroborate carry an unverified flag. Coverage runs to roughly early 2026.
          </p>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <div className="space-y-3">
              {ROLLBACK_LEDGER.map((e: LedgerEntry) => (
                <div key={`${e.date}-${e.title}`} className="flex gap-3 border-b border-grey-100 pb-3 last:border-b-0 last:pb-0">
                  <span className="w-16 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-tertiary">{e.date}</span>
                  <span
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: e.kind === 'rollback' ? STATUS_C['rolled-back'] : STATUS_C['in-force'] }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-tertiary-dark">
                      <span
                        className="mr-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em]"
                        style={{
                          color: e.kind === 'rollback' ? STATUS_C['rolled-back'] : STATUS_C['in-force'],
                          background: e.kind === 'rollback' ? '#FBEAE9' : '#E8F4EF',
                        }}
                      >
                        {e.kind}
                      </span>
                      {e.partner} — {e.title} {e.confidence === 'unverified' && <UncertainTag label="unverified" />}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-tertiary">{e.note}</p>
                    <a href={e.source.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[10.5px] text-primary hover:underline">
                      {e.source.label} ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled snapshot (compile date {COMPILE_DATE}; source currency roughly early 2026) — pending
            Secretariat verification. Partner-policy status changes weekly and nothing here is refreshed
            automatically; a scripted pull exists only where a stable API does (World Bank), so most cells are manual.
            Carbon-price levels are auction/secondary-market ranges with a source year, not comparable spot prices;
            coverage shares mix national and sub-national bases as noted per cell. Article 6 volumes are orders of
            magnitude — the 6.2 reporting layer is self-declared and lagged, and the face-value pipeline tier is
            marketing, not delivery. The credibility band is arithmetic on those declared ranges, not a market
            forecast. The rollback ledger records direction, not magnitude, and deliberately lists counterweights
            alongside reversals so the trajectory is read even-handedly.
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
