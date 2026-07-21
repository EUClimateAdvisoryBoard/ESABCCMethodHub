'use client';

/**
 * ETS Review — the reform itself (beta submodule under M·37).
 *
 * The companion to the electrification least-cost model. Where that submodule
 * drives the cost question, this one is an OVERVIEW of the most important changes
 * the Commission proposed to the EU ETS on 17 July 2026 (Phase 5, 2031–2040) —
 * and, for each, the ACTUAL link to where it is stated in the Commission's own
 * communication of the proposal: the press release (IP/26/1596), the Q&A
 * (QANDA/26/1598), the ETS Directive proposal (COM(2026) 616) and the underlying
 * impact assessment (SWD(2026) 616).
 *
 * Three layers:
 *   1. Key changes — a sourced overview grid (element → proposed figure → the
 *      Commission's own words → a link into the communication).
 *   2. The numbers behind them — cap trajectory (LRF 3.7% → 1.7%) and the new
 *      permanent-removals cost bands.
 *   3. The uncertainty & ambiguity register — every load-bearing hedge in the
 *      package, tagged and page-sourced (carried over from the impact assessment).
 *
 * Figures are transcribed from the proposal communication and the IA. Where the
 * IA gives a range, the range is shown.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* --------------------------------------------------------------- palette */
const C_RED = '#B83230';
const C_BLUE = '#2F6FB0';
const C_AMBER = '#C77D11';
const C_TEAL = '#0D9488';
const C_PURPLE = '#8A4B9E';
const C_NAVY = '#2E3E4C';
const INK = '#5d6f6e';
const GRID = '#eef3f2';

/* ---------------------------------------------------------- source links */
const SRC = {
  PR: { label: 'Press release IP/26/1596', url: 'https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1596' },
  QA: { label: 'Q&A QANDA/26/1598', url: 'https://ec.europa.eu/commission/presscorner/detail/en/qanda_26_1598' },
  COM: { label: 'ETS Directive proposal COM(2026) 616', url: 'https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en' },
  IA: { label: 'Impact assessment SWD(2026) 616', url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en' },
};
type SrcKey = keyof typeof SRC;

/* ------------------------------------------------- the key proposed changes */
interface Change {
  cat: string; catColor: string; title: string; figure: string;
  proposed: string; quote: string; links: SrcKey[];
}
const CAT = {
  ambition: { label: 'Ambition & cap', color: C_RED },
  invest: { label: 'Investment & revenue', color: C_BLUE },
  industry: { label: 'Industry protection', color: C_AMBER },
  flex: { label: 'Flexibility', color: C_TEAL },
  scope: { label: 'Scope', color: C_PURPLE },
};
type CatKey = keyof typeof CAT;

const CHANGES: (Change & { cat: CatKey })[] = [
  {
    cat: 'ambition', catColor: CAT.ambition.color,
    title: 'A gentler cap trajectory (LRF)', figure: '3.7% → 1.7%',
    proposed: 'The Linear Reduction Factor is cut from today’s 4.3% to 3.7% for 2031–35 and 1.7% for 2036–40 — a two-step, more back-loaded path to the 85% domestic reduction by 2040 (−90% net with credits + removals).',
    quote: '“It updates the Linear Reduction Factor (LRF) of 3.7% for 2031-2035 and 1.7% for 2036-2040, making the trajectory more gradual.”',
    links: ['PR', 'COM', 'IA'],
  },
  {
    cat: 'flex', catColor: CAT.flex.color,
    title: 'International credits re-admitted', figure: 'up to 2%',
    proposed: 'From 2036 the EU may use up to 2% high-quality international credits toward the required reductions — the first re-opening to offshore credits since the Kyoto units were phased out.',
    quote: '“Up to 2% high-quality international credits will allow to finance decarbonisation projects abroad and provide breathing space in 2036-2040.”',
    links: ['PR', 'QA'],
  },
  {
    cat: 'scope', catColor: CAT.scope.color,
    title: 'Permanent carbon removals integrated', figure: 'new',
    proposed: 'Permanent removals (BECCS, DACCS) become usable for compliance, giving the hardest-to-abate sectors flexibility and pulling the technologies to scale. The IA models 175–330 Mt over 2031–40.',
    quote: '“The proposal also integrates permanent carbon removals into the EU ETS … additional flexibility for the hardest-to-abate sectors.”',
    links: ['PR', 'IA'],
  },
  {
    cat: 'flex', catColor: CAT.flex.color,
    title: 'Market Stability Reserve reform', figure: '24% → 12%',
    proposed: 'The MSR intake rate is halved (24% → 12%) so allowances stay in circulation longer, cutting volatility. Complements the April 2026 proposal to stop automatic invalidation of reserve allowances.',
    quote: '“a reform of the Market Stability Reserve (MSR) to … maintain liquidity and reduce excessive price volatility.”',
    links: ['PR', 'QA'],
  },
  {
    cat: 'invest', catColor: CAT.invest.color,
    title: 'Industrial Decarbonisation Bank', figure: '€100 bn',
    proposed: 'A new €100 bn bank channels ETS revenue into industrial decarbonisation at scale; an ETS Investment Booster runs before 2030 as its first phase. The IA models ~1,630 Mt abated at ~€60/t average support.',
    quote: '“The Industrial Decarbonisation Bank will have €100bn funding going towards industrial decarbonisation across Europe at scale.”',
    links: ['PR', 'IA'],
  },
  {
    cat: 'invest', catColor: CAT.invest.color,
    title: 'Revenue earmarking', figure: '50%',
    proposed: 'Member States must spend 50% of national ETS revenues on decarbonising ETS sectors — adding to more than €100 bn of investment before 2030. “Contributions by industry should flow back to industry.”',
    quote: '“Member States will be required to spend 50% of their national ETS revenues on investments to decarbonise ETS sectors.”',
    links: ['PR', 'QA'],
  },
  {
    cat: 'industry', catColor: CAT.industry.color,
    title: 'Free allocation continues, conditional', figure: 'beyond 2030',
    proposed: 'Free allocation is kept past 2030 but tied more tightly to actual decarbonisation investment in Europe — rewarding movers, pressuring laggards.',
    quote: '“Free allocation for companies will continue beyond 2030, and will be more closely linked to investments in decarbonisation in Europe.”',
    links: ['PR', 'IA'],
  },
  {
    cat: 'industry', catColor: CAT.industry.color,
    title: 'CBAM phase-out slowed & benchmarks', figure: '2038 · +€6 bn',
    proposed: 'For CBAM sectors the free-allocation phase-out is slowed and extended to 2038 (from 2034). A separate benchmarks proposal raises industry free allocation by €6 bn for 2026–30.',
    quote: '“the reduction of free allocation will be slowed and the phase-out extended until 2038.”',
    links: ['PR', 'IA'],
  },
  {
    cat: 'scope', catColor: CAT.scope.color,
    title: 'Aviation & maritime strengthened', figure: 'strengthened',
    proposed: 'The ETS for aviation and maritime is reinforced and aligned with international measures (CORSIA, IMO), addressing evasion and levelling the field. Aviation baseline 690 Mt (2024); maritime SMAP support 46 M EUAs.',
    quote: '“The proposal strengthens EU ETS for aviation and maritime sectors and extends it to waste incineration.”',
    links: ['PR', 'IA'],
  },
  {
    cat: 'scope', catColor: CAT.scope.color,
    title: 'Waste incineration brought in', figure: 'new sector',
    proposed: 'Municipal (and, in the widest option, hazardous + landfill) waste incineration is gradually pulled into the ETS — the IA scopes cap additions of +41.5 Mt (municipal), +10.7 Mt (hazardous), ~+65 Mt (landfill).',
    quote: '“… extends it to waste incineration … addresses risks of circumvention and levels the playing field.”',
    links: ['PR', 'IA'],
  },
];

/* =========================================================== uncertainty tags */
type TagKey = 'range' | 'data-gap' | 'contested' | 'attribution' | 'definitional' | 'assumption' | 'unquantified';
const TAGS: Record<TagKey, { label: string; color: string; blurb: string }> = {
  range: { label: 'Model spread', color: C_BLUE, blurb: 'Two models (PRIMES / POTEnCIA) or a cost band disagree; the IA shows a range, not a point.' },
  assumption: { label: 'Load-bearing assumption', color: C_AMBER, blurb: 'A result hinges on an input the IA sets by assumption (cost fall, price path, compliance).' },
  attribution: { label: 'Attribution', color: C_RED, blurb: 'The effect cannot be cleanly attributed to the ETS versus other drivers.' },
  'data-gap': { label: 'Data gap', color: C_PURPLE, blurb: 'Missing, proxied or buffered data; the estimate is built on partial evidence.' },
  definitional: { label: 'Definitional / scope', color: C_TEAL, blurb: 'The number moves with a definition or scope choice (net vs gross, denominator).' },
  contested: { label: 'Contested', color: '#9a6a00', blurb: 'Stakeholders openly disagree; the IA records division, not consensus.' },
  unquantified: { label: 'Could not quantify', color: C_NAVY, blurb: 'The IA states a quantity it could not compute or monetise.' },
};

interface Unc { tag: TagKey; title: string; detail: string; src: string; }
const REGISTER: Unc[] = [
  { tag: 'unquantified', title: 'Costs & benefits could not be monetised', detail: 'The Regulatory Scrutiny Board and the IA state it was “not possible to monetise the aggregated costs and benefits of the preferred option” — too heterogeneous, and dependent on future MRV design.', src: 'Annex 1–2, p8' },
  { tag: 'attribution', title: 'Reductions may not be the ETS at all', detail: 'The evaluation finds industrial cuts were “primarily driven by a decline in levels of activity … unrelated to the ETS” — energy-crisis prices, not the carbon price. Decoupling could not be shown.', src: 'Annex 15, p29' },
  { tag: 'attribution', title: 'MSR effect cannot be isolated', detail: 'Price rises “mainly explained by the increased Linear Reduction Factor, with the MSR having only a small effect”; “the individual effect of the MSR on confidence cannot be assessed.” No clean 2014 baseline exists.', src: 'Annex 15, p20/70' },
  { tag: 'definitional', title: '“Carbon-leakage formula not relevant”', detail: 'EU27 ETS emissions rise from baseline in every scenario (+7.7 to +45.8 Mt), so the conventional leakage rate (foreign rise ÷ domestic fall) simply cannot be computed for this reform.', src: 'Annex 12, p58' },
  { tag: 'range', title: 'The cap depends on which model', detail: 'PRIMES and POTEnCIA put the 2035 cap anywhere from 560 to 670 Mt for the same 85% target — “the intrinsic uncertainties involved in assessments on the longer-term technological future.”', src: 'Annex 8 I, p11' },
  { tag: 'range', title: 'CDR cost “highly variable and uncertain”', detail: '“Reliable cost estimates are only available for BECCS”; DACCS spans €185–370/t in 2040. The IA “tries to withhold judgement on cost-competitiveness” and assumes BECCS cost = BioCCS cost.', src: 'Annex 8 II, p37/46' },
  { tag: 'assumption', title: 'Removal target “may simply not be met”', detail: 'Under PO3 “as long as removals are not cost competitive … the EU ETS [misses] its net objective. The risk … is that the modelled assumptions would simply not be met.” DACCS never reaches competitiveness in-period.', src: 'Part 1, p30–31' },
  { tag: 'assumption', title: 'Cost falls “significantly shape the results”', detail: 'Removals fiscal cost “strongly depends on … ETS prices, the ratio of BioCCS to DACCS and timing” and “cannot be fully optimised.” A “conservative approach … would be advisable.”', src: 'Annex 8 II, p46' },
  { tag: 'data-gap', title: '20 MW figure rests on two countries', detail: 'The headline “up to 28 MtCO₂e / 94,428 installations” comes from French + Polish registries only, “applied as a representative curve for the entire EU” and “driven primarily by the Polish dataset.”', src: 'Annex 12, p62/68' },
  { tag: 'data-gap', title: 'Waste emissions “complex to estimate”', detail: 'Municipal, hazardous and landfill caps are built on “a buffer for underestimation” and “limited availability of measurement-based data … constraints on harmonised, robust and verified data.”', src: 'Annex 8 I, p18' },
  { tag: 'contested', title: 'Removals integration is “very divisive”', detail: 'Temporary removals drew “the highest level of strong disagreement”; ~12% of consultation respondents (mainly NGOs) oppose integration outright on environmental-integrity grounds.', src: 'Annex 8 II, p64' },
  { tag: 'contested', title: 'Free allocation: industry vs NGOs', detail: 'Business favours keeping and improving free allocation; NGOs favour phase-out on “polluter pays”. On the 20 MW threshold and CORSIA quality, groups are “strongly divided”.', src: 'Annex 2 (consultation)' },
  { tag: 'assumption', title: 'Aviation cap addition “is uncertain”', detail: 'The +148 Mt added for incoming/outgoing international aviation in 2027 rests on a PRIMES estimate the IA calls “uncertain, but it gives an indication.” Small maritime extensions were “ignored”.', src: 'Annex 8 I, p8' },
  { tag: 'assumption', title: 'Price volatility “cannot be assessed”', detail: 'Modelled prices “rely on uncertain assumptions and may not capture actual short-term price movements”; “within-year price volatility cannot be assessed quantitatively.” “Reality will lie between these two extremes.”', src: 'Part 1, p52–53' },
  { tag: 'assumption', title: 'IDB abatement is “illustrative”', detail: 'The Bank’s 1,630 Mt figure “will depend on the final IDB design … demand for low-carbon products and project delivery risks”, and the ETS price feeding it “is an assumption … derived from 2040 climate-target modelling.”', src: 'Part 1, p34–35' },
  { tag: 'assumption', title: 'Refinery output held constant', detail: 'The free-allocation calculation “assumes refinery output remains constant over time”, while “in reality it is expected to decline” — an explicit simplification affecting the leakage budget.', src: 'Annex 12, p21' },
  { tag: 'definitional', title: 'Net vs gross removals ambiguity', detail: 'CR2 gross outcome is “uncertain and unlimited”; CR3 has “a maximum level of removals … but not a minimum,” so the net can silently equal the gross and miss the target.', src: 'Annex 8 II, p29/53' },
];

/* ---------------------------------------------------- cap trajectory chart */
const CAP_YEARS = [2030, 2035, 2040];
const CAP_SERIES = [
  { key: 'Legal default (LRF 4.3%)', color: C_RED, pts: [975, 485, 69] },
  { key: 'Proposed (LRF 3.7% → 1.7%)', color: C_TEAL, pts: [911, 580, 330], band: [[911, 911], [560, 670], [330, 375]] as [number, number][] },
];
function CapChart() {
  const W = 720, H = 330, M = { l: 46, r: 138, t: 16, b: 34 };
  const PX = W - M.l - M.r, PY = H - M.t - M.b, YMAX = 1000;
  const xs = [M.l, M.l + PX / 2, M.l + PX];
  const x = (i: number) => xs[i];
  const y = (v: number) => M.t + (1 - v / YMAX) * PY;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="EU ETS cap trajectory to 2040, proposed vs legal default, million tonnes CO2">
      {[0, 250, 500, 750, 1000].map((t) => (
        <g key={t}>
          <line x1={M.l} y1={y(t)} x2={M.l + PX} y2={y(t)} stroke={GRID} />
          <text x={M.l - 7} y={y(t) + 3} textAnchor="end" fontSize={10.5} fill="#8fa1a0" className="tabular-nums">{t}</text>
        </g>
      ))}
      {CAP_YEARS.map((yr, i) => <text key={yr} x={x(i)} y={H - M.b + 16} textAnchor="middle" fontSize={11} fill={INK} className="tabular-nums">{yr}</text>)}
      <text transform={`translate(12 ${M.t + PY / 2}) rotate(-90)`} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={INK}>Cap · Mt CO₂ (EEA, gross)</text>
      {(() => {
        const s = CAP_SERIES[1]; if (!s.band) return null;
        const up = s.band.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(b[1])}`).join(' ');
        const dn = s.band.slice().reverse().map((b, i) => `L${x(s.band!.length - 1 - i)} ${y(b[0])}`).join(' ');
        return <path d={`${up} ${dn} Z`} fill={C_TEAL} opacity={0.1} />;
      })()}
      {CAP_SERIES.map((s) => (
        <g key={s.key}>
          <path d={s.pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} />
          {s.pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.6} fill={s.color} stroke="#fff" strokeWidth={1.5} />)}
          <text x={x(2) + 8} y={y(s.pts[2]) + 3.5} fontSize={10.5} fontWeight={700} fill={s.color}>{s.pts[2]}</text>
          <text x={x(2) + 8} y={y(s.pts[2]) + 15} fontSize={9} fill={INK}>{s.key.split(' (')[0]}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------------------------------------------------- CDR cost range bars */
const CDR_2040 = [
  { name: 'BioCCS', lo: 160, avg: 176, hi: 192, color: C_TEAL },
  { name: 'DACCS', lo: 185, avg: 278, hi: 370, color: C_RED },
  { name: 'Biochar', lo: 37, avg: 88, hi: 138, color: C_AMBER },
];
const fmt = (n: number) => Math.round(n).toString();
function RangeBars({ rows, max, unit }: { rows: { name: string; lo: number; hi: number; avg?: number; color: string }[]; max: number; unit: string }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const lp = (r.lo / max) * 100, wp = ((r.hi - r.lo) / max) * 100;
        const rightEnd = lp + wp;
        const labelLeft = rightEnd > 58;
        const label = `${fmt(r.lo)}–${fmt(r.hi)}${r.avg !== undefined ? ` (${fmt(r.avg)})` : ''} ${unit}`;
        return (
          <div key={r.name} className="grid grid-cols-[92px_1fr] items-center gap-3">
            <div className="text-[11.5px] leading-tight text-tertiary-dark">{r.name}</div>
            <div className="relative h-5">
              <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-grey-200" />
              <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ left: `${lp}%`, width: `${Math.max(wp, 0.5)}%`, background: r.color }} />
              {r.avg !== undefined && <span className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 bg-white" style={{ left: `${(r.avg / max) * 100}%` }} />}
              <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums"
                style={labelLeft ? { right: `${100 - lp + 1.5}%`, color: r.color } : { left: `${rightEnd + 1.5}%`, color: r.color }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- chips */
function SourceChip({ k }: { k: SrcKey }) {
  const s = SRC[k];
  const short = k === 'PR' ? 'Press release' : k === 'QA' ? 'Q&A' : k === 'COM' ? 'COM(2026) 616' : 'SWD 616';
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
      className="inline-flex items-center gap-1 rounded border border-grey-200 bg-grey-50 px-1.5 py-0.5 text-[10px] font-semibold text-tertiary hover:border-primary hover:text-primary">
      {short}<span aria-hidden>↗</span>
    </a>
  );
}
function TagChip({ tag, onClick, active }: { tag: TagKey; onClick?: () => void; active?: boolean }) {
  const t = TAGS[tag];
  const cls = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition ${active === false ? 'opacity-40' : ''}`;
  const style = { borderColor: t.color, color: t.color, background: active ? `${t.color}12` : 'transparent' };
  const inner = <><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />{t.label}</>;
  if (!onClick) return <span className={cls} style={style}>{inner}</span>;
  return <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-grey-200 bg-white p-4 ${className}`}>{children}</div>;
}

/* ======================================================================== page */
export default function EtsReformPage() {
  const [tagFilter, setTagFilter] = useState<TagKey | null>(null);
  const [catFilter, setCatFilter] = useState<CatKey | null>(null);

  const changes = useMemo(() => CHANGES.filter((c) => catFilter === null || c.cat === catFilter), [catFilter]);
  const register = useMemo(() => REGISTER.filter((r) => tagFilter === null || r.tag === tagFilter), [tagFilter]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; for (const r of REGISTER) c[r.tag] = (c[r.tag] ?? 0) + 1; return c; }, []);

  const nav = [
    { id: 'changes', label: 'Key changes' },
    { id: 'numbers', label: 'The numbers' },
    { id: 'register', label: 'Uncertainty register' },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · <a href="/beta/ets-review" className="underline hover:text-primary">ETS Review</a> · ETS-reform submodule
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">The ETS reform — what&apos;s proposed, and where it says so</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            The 17 July 2026 review of the EU ETS (Phase 5, <strong>2031–2040</strong>), aligned with the −90% 2040 target. Below are
            the <strong>most important proposed changes</strong> — each with the Commission&apos;s own wording and a link into its{' '}
            <strong>communication of the proposal</strong> — then the numbers behind them, and every uncertainty the package carries.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {(['PR', 'QA', 'COM', 'IA'] as SrcKey[]).map((k) => (
              <a key={k} href={SRC[k].url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 bg-white px-2 py-1 hover:border-primary">
                <span className="font-semibold text-tertiary-dark">{SRC[k].label}</span><span aria-hidden className="text-tertiary">↗</span>
              </a>
            ))}
          </div>
        </section>

        {/* nav */}
        <nav className="sticky top-0 z-10 -mx-4 mb-6 border-y border-grey-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="font-semibold text-tertiary hover:text-primary">{n.label}</a>)}
            <a href="/beta/ets-review/electrification" className="font-semibold text-tertiary hover:text-primary">↔ Electrification model</a>
            <span className="ml-auto text-tertiary">{CHANGES.length} changes · {REGISTER.length} uncertainties</span>
          </div>
        </nav>

        {/* ===================== KEY CHANGES ===================== */}
        <section id="changes" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">The most important changes — and their link in the communication</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Each card: the proposed change, the Commission&apos;s exact words, and a chip linking straight to where it is stated — the
            press release, the Q&amp;A, the ETS Directive proposal or the impact assessment. Filter by theme.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setCatFilter(null)}
              className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${catFilter === null ? 'bg-tertiary-dark text-white' : 'text-tertiary hover:text-primary'}`}>All themes</button>
            {(Object.keys(CAT) as CatKey[]).map((k) => (
              <button key={k} type="button" onClick={() => setCatFilter(catFilter === k ? null : k)}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{ borderColor: CAT[k].color, color: CAT[k].color, background: catFilter === k ? `${CAT[k].color}12` : 'transparent', opacity: catFilter === null || catFilter === k ? 1 : 0.4 }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: CAT[k].color }} />{CAT[k].label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {changes.map((c) => (
              <div key={c.title} className="flex flex-col rounded-lg border border-l-[3px] border-grey-200 bg-white p-4" style={{ borderLeftColor: c.catColor }}>
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-bold text-tertiary-dark">{c.title}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums" style={{ background: `${c.catColor}14`, color: c.catColor }}>{c.figure}</span>
                </div>
                <p className="text-[12px] leading-relaxed text-tertiary">{c.proposed}</p>
                <p className="mt-2 border-l-2 pl-2 text-[11.5px] italic leading-snug text-tertiary-dark" style={{ borderColor: `${c.catColor}55` }}>{c.quote}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Stated in →</span>
                  {c.links.map((k) => <SourceChip key={k} k={k} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== THE NUMBERS ===================== */}
        <section id="numbers" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">The numbers behind them</h2>
          <p className="mb-4 max-w-3xl text-[13px] text-tertiary">
            The two figures that carry the reform: the cap trajectory the LRF cut produces, and the cost of the newly-admitted
            permanent removals — both from the impact assessment, shown with their ranges.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Cap trajectory to 2040 · Mt CO₂</p>
              <p className="mb-2 text-[11px] text-tertiary">The proposed LRF (3.7% then 1.7%) lifts the 2040 cap to ~330 Mt versus ~69 Mt under the unchanged legal default. Shaded = PRIMES–POTEnCIA model band.</p>
              <CapChart />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-tertiary">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: C_TEAL }} />Proposed (LRF 3.7% → 1.7%)</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: C_RED }} />Legal default (4.3%)</span>
              </div>
            </Card>
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Permanent-removal unit cost in 2040 · €/t</p>
              <p className="mb-3 text-[11px] text-tertiary">Bar = lower–upper estimate; tick = mid-point. BECCS turns cost-competitive with the allowance price around <strong>2036–2038</strong>; <strong>DACCS does not</strong> within the period.</p>
              <RangeBars rows={CDR_2040} max={400} unit="€/t" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { v: '3.7→1.7', u: '%', l: 'Proposed LRF', c: C_TEAL },
                  { v: '175–330', u: 'Mt', l: 'Removals 2031–40', c: C_NAVY },
                  { v: '2038', u: '', l: 'CBAM phase-out ends', c: C_AMBER },
                ].map((k) => (
                  <div key={k.l} className="rounded-md border border-grey-200 p-2.5">
                    <p className="font-mono text-base font-bold tabular-nums" style={{ color: k.c }}>{k.v}<span className="text-[10px] font-normal text-tertiary"> {k.u}</span></p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{k.l}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* ===================== UNCERTAINTY REGISTER ===================== */}
        <section id="register" className="mb-8 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">The uncertainty &amp; ambiguity register</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Every load-bearing hedge, range, data gap, contested point and unquantifiable behind the reform, in one place — filter by type.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(Object.keys(TAGS) as TagKey[]).map((k) => (
              <TagChip key={k} tag={k} onClick={() => setTagFilter(tagFilter === k ? null : k)} active={tagFilter === null ? undefined : tagFilter === k} />
            ))}
            {tagFilter && <button type="button" onClick={() => setTagFilter(null)} className="text-[11px] font-semibold text-accent-orange hover:underline">↺ clear</button>}
            <span className="ml-auto text-[11px] text-tertiary">{register.length} of {REGISTER.length}</span>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {register.map((r) => (
              <div key={r.title} className="rounded-lg border-l-[3px] border border-grey-200 bg-white p-3.5" style={{ borderLeftColor: TAGS[r.tag].color }}>
                <div className="mb-1"><TagChip tag={r.tag} /></div>
                <p className="text-[13px] font-bold text-tertiary-dark">{r.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{r.detail}</p>
                <p className="mt-1.5"><span className="rounded bg-grey-100 px-1 py-px font-mono text-[9.5px] text-tertiary">{r.src}</span></p>
              </div>
            ))}
          </div>
          {register.length === 0 && <p className="py-6 text-center text-[13px] text-tertiary">No entries for this filter.</p>}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
            {(Object.keys(TAGS) as TagKey[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: TAGS[k].color }} />{TAGS[k].label} · {counts[k] ?? 0}</span>
            ))}
          </div>
        </section>

        {/* method */}
        <section className="mb-4">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Sources.</strong> Proposed changes and their wording are taken verbatim from the
            Commission&apos;s communication of the 17 July 2026 proposal: the press release{' '}
            <a href={SRC.PR.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">IP/26/1596</a>, the{' '}
            <a href={SRC.QA.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Q&amp;A</a>, and the ETS Directive proposal{' '}
            <a href={SRC.COM.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">COM(2026) 616</a>. Figures and every
            uncertainty come from the underlying impact assessment{' '}
            <a href={SRC.IA.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">SWD(2026) 616</a> (5 parts, 958 pp) and its
            technology-assumptions workbook (E3Modelling / PRIMES); page references (pNN) point to the printed page of the cited part.
            The cost question itself is modelled in the companion{' '}
            <a href="/beta/ets-review/electrification" className="underline hover:text-primary">Electrification submodule</a>.
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
