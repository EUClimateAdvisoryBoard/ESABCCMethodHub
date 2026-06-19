'use client';

/**
 * ETS Wishlist — GHG Impact (beta module).
 *
 * A transparent, slider-driven estimator of the greenhouse-gas consequences
 * of the EPP (European People's Party) "wishlist" of demands to soften the
 * EU Emissions Trading System and the surrounding Fit-for-55 architecture.
 * The user pasted the ten demands; this module models each one's effect on
 * cumulative EU GHG mitigation, individually AND combined, so you can see
 * "how far this wishlist sends the EU back".
 *
 * WHAT THIS IS — and IS NOT
 * -------------------------
 * It is a deliberately STYLISED, reduced-form accounting model. Every number
 * is an explicit, editable assumption (a slider), grouped into named
 * SCENARIOS so you can explore a conservative reading of the demands, a
 * central reading, and a maximalist reading. It is NOT a forecast and NOT a
 * partial-equilibrium model of the carbon market — for that, see the sister
 * module "ETS Endgame & CDR Safety Valve".
 *
 * THE KEY MODELLING HONESTY POINT
 * -------------------------------
 * Under a BINDING, BANKED cap, cumulative ETS emissions ≈ the cumulative cap
 * minus the bank left at the end. So:
 *   • Demands that change the CAP or add fungible SUPPLY (slower LRF, a
 *     weaker MSR, removal credits, international credits) translate fairly
 *     directly into extra cumulative emissions — these are the big levers.
 *   • Demands that only change how free allowances are HANDED OUT (CBAM
 *     phase-out, free allocation beyond 2030, benchmark methodology,
 *     conditional free allocation) do NOT move the capped total much; their
 *     emission effect is second-order (leakage, weaker transition signal,
 *     less investment). They are modelled small and flagged "indirect".
 *   • One demand (earmarking ETS revenue for clean investment) is a
 *     mitigation GAIN, shown as a negative bar.
 *   • Aviation sits OUTSIDE the ETS cap for extra-EU flights, so keeping it
 *     out is genuine FORGONE mitigation.
 *
 * Instruments are linked to the actual EU legislation (EUR-Lex ELI URLs) in
 * the Sources section and on each card.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ====================================================================== utils */

const START = 2025;

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function fmt(n: number, d = 0): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
}

/* ====================================================================== model */

type Params = {
  /* horizon */
  endYear: number; // 2035 | 2040 | 2050

  /* cross-cutting realism */
  bankPassThrough: number; // 0..1 — share of extra allowances/supply that become real extra emissions (vs. banked/cancelled)
  interaction: number; // 0..1 — overlap haircut on the additive supply-side demands (1 = pure addition)

  /* #1 — slow the Linear Reduction Factor */
  lrfRef: number; // Mt — fixed quantity the LRF % is applied to (the linear reduction base)
  lrfDelta3135: number; // pp — how much slower the LRF is, 2031–2035 (the "at least 1 pp")
  lrfDeltaPost35: number; // pp — slower LRF after 2035 ("more moderate decline")

  /* #2 — reform / weaken the Market Stability Reserve */
  msrAffectedMt: number; // Mt — allowances the MSR would otherwise withhold/invalidate over the horizon
  msrReleaseShare: number; // 0..1 — share the reformed MSR fails to absorb / releases back

  /* #3 — CO2-removals market integrated into the ETS */
  cdrAdmittedMt: number; // Mt — cumulative removal credits admitted as ETS-fungible
  cdrIntegrityGap: number; // 0..1 — share that is non-permanent / reversed / non-additional → net emissions

  /* #4 — international carbon credits in the EU market */
  intlCreditsMt: number; // Mt — cumulative international credits admitted
  intlNonAdditional: number; // 0..1 — share non-additional / low quality → displaced domestic abatement

  /* #5 — slow CBAM free-allowance phase-out (≤30% cut before 2030) */
  cbamFreeExtraMt: number; // Mt — extra free allowances retained vs. the legislated phase-out
  /* #6 — free allowances for non-CBAM industry beyond 2030 */
  freeBeyond2030Mt: number; // Mt — extra free allowances kept beyond 2030
  /* #7 — looser benchmark methodology */
  benchmarkLooseningMt: number; // Mt — extra free allocation from less stringent benchmarks
  /* #8 — reward fast decarbonisers with continued free allowances */
  demand8Mt: number; // Mt — net (signed: + = giveaway setback, − = effective incentive)
  /* shared: how much free-allocation generosity leaks into forgone abatement */
  freeAllocDeterrence: number; // 0..1 — share of extra free allowances that becomes forgone abatement / leakage

  /* #9 — earmark ETS revenue for clean investment (a GAIN) */
  cleanInvestBn: number; // €bn — additional clean investment mobilised over the horizon
  abatementCost: number; // €/tCO2e — lifecycle cost of the abatement it buys
  investAdditionality: number; // 0..1 — share that is genuinely additional (not BAU)

  /* #10 — limit aviation carbon charge to intra-EU routes */
  extraEuAviationMt: number; // Mt/yr — extra-EU departing aviation CO2 left outside the ETS
  aviationAbatementRate: number; // 0..1 — share a full ETS price/SAF pull would abate vs. CORSIA
};

const DEFAULTS: Params = {
  endYear: 2040,
  bankPassThrough: 0.9,
  interaction: 0.9,

  lrfRef: 1954,
  lrfDelta3135: 1.0,
  lrfDeltaPost35: 0.5,

  msrAffectedMt: 500,
  msrReleaseShare: 0.3,

  cdrAdmittedMt: 250,
  cdrIntegrityGap: 0.25,

  intlCreditsMt: 400,
  intlNonAdditional: 0.73,

  cbamFreeExtraMt: 300,
  freeBeyond2030Mt: 200,
  benchmarkLooseningMt: 150,
  demand8Mt: 15,
  freeAllocDeterrence: 0.2,

  cleanInvestBn: 30,
  abatementCost: 250,
  investAdditionality: 0.5,

  extraEuAviationMt: 107,
  aviationAbatementRate: 0.12,
};

/* spread a cumulative total evenly across the active years of the horizon */
function spread(total: number, years: number[], firstActive: number): number[] {
  const active = years.filter((y) => y >= firstActive);
  if (active.length === 0) return years.map(() => 0);
  const per = total / active.length;
  return years.map((y) => (y >= firstActive ? per : 0));
}

type DemandResult = {
  id: string;
  mt: number; // cumulative Mt CO2e over the horizon (+ setback, − gain)
  series: number[]; // per-year Mt
};

function computeImpacts(p: Params): { years: number[]; byId: Record<string, DemandResult>; } {
  const years = range(START, p.endYear);
  const byId: Record<string, DemandResult> = {};

  // #1 — LRF slowdown. The linear reduction "foregone" each year is the
  // cumulative pp-slowdown × the reduction base. Years 2031–2035 use the full
  // delta; later years add the post-2035 delta on top of the 5-year build-up.
  const cumPP = (t: number): number => {
    if (t < 2031) return 0;
    if (t <= 2035) return (t - 2030) * p.lrfDelta3135;
    return 5 * p.lrfDelta3135 + (t - 2035) * p.lrfDeltaPost35;
  };
  const s1 = years.map((t) => (cumPP(t) / 100) * p.lrfRef * p.bankPassThrough);
  byId['d1'] = { id: 'd1', series: s1, mt: s1.reduce((a, b) => a + b, 0) };

  // #2 — MSR weakening
  const mt2 = p.msrAffectedMt * p.msrReleaseShare * p.bankPassThrough;
  byId['d2'] = { id: 'd2', mt: mt2, series: spread(mt2, years, 2027) };

  // #3 — CDR offsets net of integrity
  const mt3 = p.cdrAdmittedMt * p.cdrIntegrityGap;
  byId['d3'] = { id: 'd3', mt: mt3, series: spread(mt3, years, 2031) };

  // #4 — international credits net of quality
  const mt4 = p.intlCreditsMt * p.intlNonAdditional;
  byId['d4'] = { id: 'd4', mt: mt4, series: spread(mt4, years, 2028) };

  // #5–#8 — free allocation (indirect: leakage / forgone abatement only)
  const mt5 = p.cbamFreeExtraMt * p.freeAllocDeterrence;
  byId['d5'] = { id: 'd5', mt: mt5, series: spread(mt5, years, 2026) };
  const mt6 = p.freeBeyond2030Mt * p.freeAllocDeterrence;
  byId['d6'] = { id: 'd6', mt: mt6, series: spread(mt6, years, 2031) };
  const mt7 = p.benchmarkLooseningMt * p.freeAllocDeterrence;
  byId['d7'] = { id: 'd7', mt: mt7, series: spread(mt7, years, 2026) };
  const mt8 = p.demand8Mt; // already a net signed Mt assumption
  byId['d8'] = { id: 'd8', mt: mt8, series: spread(mt8, years, 2031) };

  // #9 — revenue earmark (a GAIN, negative). €bn × additionality / (€/t).
  const mt9 = -((p.cleanInvestBn * 1000) / p.abatementCost) * p.investAdditionality;
  byId['d9'] = { id: 'd9', mt: mt9, series: spread(mt9, years, 2027) };

  // #10 — aviation kept outside the cap → forgone mitigation each year
  const aviationStart = 2027;
  const s10 = years.map((t) => (t >= aviationStart ? p.extraEuAviationMt * p.aviationAbatementRate : 0));
  byId['d10'] = { id: 'd10', mt: s10.reduce((a, b) => a + b, 0), series: s10 };

  return { years, byId };
}

/* The headline net number, with the overlap haircut applied to the additive
 * supply-side demands (d1–d4) only. */
function netSetback(byId: Record<string, DemandResult>, interaction: number): {
  supply: number; freeAlloc: number; aviation: number; gain: number; net: number;
} {
  const supply = interaction * (byId.d1.mt + byId.d2.mt + byId.d3.mt + byId.d4.mt);
  const freeAlloc = byId.d5.mt + byId.d6.mt + byId.d7.mt + byId.d8.mt;
  const aviation = byId.d10.mt;
  const gain = byId.d9.mt; // negative
  return { supply, freeAlloc, aviation, gain, net: supply + freeAlloc + aviation + gain };
}

/* ====================================================================== scenarios */

type Scenario = { id: string; label: string; blurb: string; overrides: Partial<Params> };

const SCENARIOS: Scenario[] = [
  {
    id: 'conservative',
    label: 'Conservative reading',
    blurb:
      'The demands are taken at their gentlest: the LRF slows by exactly the stated minimum, offsets are admitted in small volumes with high integrity, and free-allocation effects are treated as almost purely distributional. A floor on the damage.',
    overrides: {
      lrfDelta3135: 1.0, lrfDeltaPost35: 0.25,
      msrAffectedMt: 400, msrReleaseShare: 0.15,
      cdrAdmittedMt: 150, cdrIntegrityGap: 0.1,
      intlCreditsMt: 200, intlNonAdditional: 0.5,
      cbamFreeExtraMt: 200, freeBeyond2030Mt: 120, benchmarkLooseningMt: 80,
      freeAllocDeterrence: 0.1, demand8Mt: 0,
      cleanInvestBn: 45, investAdditionality: 0.6,
      extraEuAviationMt: 95, aviationAbatementRate: 0.08,
      bankPassThrough: 0.8, interaction: 0.85,
    },
  },
  {
    id: 'central',
    label: 'Central reading',
    blurb:
      'A mid-range reading of the wishlist as written: a 1 pp LRF slowdown then a moderate post-2035 decline, meaningful but capped offset volumes, and second-order free-allocation effects. The calibrated starting point.',
    overrides: { ...DEFAULTS },
  },
  {
    id: 'maximalist',
    label: 'Maximalist reading',
    blurb:
      'The demands are taken at their most permissive: a deeper, longer LRF slowdown, a largely disarmed MSR, large offset and international-credit inflows at low integrity, and free allocation that visibly slows industrial abatement. A ceiling on the damage.',
    overrides: {
      lrfDelta3135: 1.5, lrfDeltaPost35: 0.9,
      msrAffectedMt: 900, msrReleaseShare: 0.5,
      cdrAdmittedMt: 400, cdrIntegrityGap: 0.4,
      intlCreditsMt: 700, intlNonAdditional: 0.85,
      cbamFreeExtraMt: 450, freeBeyond2030Mt: 320, benchmarkLooseningMt: 250,
      freeAllocDeterrence: 0.35, demand8Mt: 40,
      cleanInvestBn: 15, investAdditionality: 0.4,
      extraEuAviationMt: 120, aviationAbatementRate: 0.16,
      bankPassThrough: 1.0, interaction: 0.95,
    },
  },
];

/* ====================================================================== demand metadata */

type Category = 'supply' | 'freealloc' | 'gain' | 'aviation';

type DemandMeta = {
  id: string;
  n: number;
  title: string;
  bullet: string; // the wishlist text
  instrument: string;
  url: string;
  mechanism: string;
  category: Category;
  direct: 'direct' | 'indirect';
};

const DEMANDS: DemandMeta[] = [
  {
    id: 'd1', n: 1, title: 'Slow the Linear Reduction Factor',
    bullet: 'Slow the LRF by ≥1 pp between 2031 and 2035, followed by a more moderate decline after 2035.',
    instrument: 'EU ETS Directive — Art. 9 (LRF), as revised by Directive (EU) 2023/959',
    url: 'https://eur-lex.europa.eu/eli/dir/2023/959/oj',
    mechanism:
      'The LRF removes a fixed absolute amount from the cap each year: 4.3% (2024–27) then 4.4% (2028+) of the 2008–2012 average cap (~1.95 Gt) — i.e. ≈84 Mt/yr then ≈86 Mt/yr (UBA/DEHSt). So 1 pp of LRF ≈ 19.5 Mt/yr of foregone reduction, and the shortfall compounds: each year of a slower LRF leaves the cap permanently higher. Under a banked cap that extra headroom is extra cumulative emissions — the single biggest lever.',
    category: 'supply', direct: 'direct',
  },
  {
    id: 'd2', n: 2, title: 'Reform the Market Stability Reserve',
    bullet: 'Reform the MSR to better prevent excessive price volatility.',
    instrument: 'Market Stability Reserve — Decision (EU) 2015/1814 (amended by 2023/959)',
    url: 'https://eur-lex.europa.eu/eli/dec/2015/1814/oj',
    mechanism:
      'The MSR withdraws 24% of the surplus (TNAC) each year and, since 2024, permanently invalidates holdings above 400 Mt (381.7 Mt were cancelled in Jan 2024). A reform that releases reserves to damp price spikes re-injects, and stops cancelling, allowances — raising the cumulative supply that can be emitted. The most uncertain lever, because the reform is undefined.',
    category: 'supply', direct: 'direct',
  },
  {
    id: 'd3', n: 3, title: 'CO₂-removals market integrated into the ETS',
    bullet: 'Establish a market for CO₂ removals and integrate it into the ETS.',
    instrument: 'Carbon Removals & Carbon Farming Regulation (EU) 2024/3012 (CRCF)',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/3012/oj',
    mechanism:
      'If a removal credit can be surrendered against an emission, each tonne removed lets a tonne be emitted. Where the removal is non-permanent, reversed, or non-additional, the net effect is extra emissions — the integrity gap. Perfect removals (gap 0) are neutral here.',
    category: 'supply', direct: 'direct',
  },
  {
    id: 'd4', n: 4, title: 'International carbon credits in the EU market',
    bullet: 'Include international carbon credits in the EU carbon market.',
    instrument: 'Paris Agreement Art. 6 (international credits); the EU ETS has excluded them since Phase 4',
    url: 'https://unfccc.int/process-and-meetings/the-paris-agreement/article-64-mechanism',
    mechanism:
      'Admitting international offsets adds supply to the EU market. The DG CLIMA study by Cames et al. (2016) found 85% of CDM projects — 73% of the 2013–2020 CER supply — had a low likelihood of being additional and not over-credited. That non-additional share displaces real domestic abatement, tonne for tonne.',
    category: 'supply', direct: 'direct',
  },
  {
    id: 'd5', n: 5, title: 'Slow the CBAM free-allowance phase-out',
    bullet: 'Slow the phase-out of free allowances under CBAM, with a maximum 30% reduction before 2030.',
    instrument: 'CBAM Regulation (EU) 2023/956 + ETS Directive Art. 10a',
    url: 'https://eur-lex.europa.eu/eli/reg/2023/956/oj',
    mechanism:
      'Free allocation does not change the capped total, so the direct emission effect is ~0. The real cost is indirect: a weaker carbon-price signal for industry and continued leakage exposure, modelled via a small "forgone-abatement" share.',
    category: 'freealloc', direct: 'indirect',
  },
  {
    id: 'd6', n: 6, title: 'Free allowances for non-CBAM industry beyond 2030',
    bullet: 'Ensure industries not covered by CBAM retain access to free allowances beyond 2030.',
    instrument: 'EU ETS Directive Art. 10a (free allocation)',
    url: 'https://eur-lex.europa.eu/eli/dir/2003/87/oj',
    mechanism:
      'As with CBAM, extending free allocation is mostly a rent transfer inside a fixed cap. Modelled as a small indirect leakage / weaker-signal effect.',
    category: 'freealloc', direct: 'indirect',
  },
  {
    id: 'd7', n: 7, title: 'Revise the benchmark methodology',
    bullet: 'Revise the methodology for carbon-efficiency benchmarks used to allocate free permits.',
    instrument: 'Commission Implementing Regulation (EU) 2021/447 (benchmark values)',
    url: 'https://eur-lex.europa.eu/eli/reg_impl/2021/447/oj',
    mechanism:
      'Looser benchmarks hand out more free allowances and slow benchmark tightening, weakening the incentive to beat best-practice efficiency. Indirect effect, modelled via the same forgone-abatement share.',
    category: 'freealloc', direct: 'indirect',
  },
  {
    id: 'd8', n: 8, title: 'Reward faster decarbonisers with free allowances',
    bullet: 'Reward faster-decarbonising companies with continued access to free allowances.',
    instrument: 'EU ETS Directive Art. 10a / conditionality provisions',
    url: 'https://eur-lex.europa.eu/eli/dir/2003/87/oj',
    mechanism:
      'Genuinely ambiguous: conditional free allocation could sharpen incentives (a negative / mitigating value) or simply prolong giveaways (a positive setback). Modelled as a small net assumption you can push either way.',
    category: 'freealloc', direct: 'indirect',
  },
  {
    id: 'd9', n: 9, title: 'Earmark ETS revenue for clean investment',
    bullet: 'Require member states to spend ETS revenues on clean investments and strengthen ETS-based environmental funds.',
    instrument: 'EU ETS Directive Art. 10(3); Innovation/Modernisation Funds; Social Climate Fund Reg. (EU) 2023/955',
    url: 'https://eur-lex.europa.eu/eli/reg/2023/955/oj',
    mechanism:
      'The one helpful demand. Hypothecating revenue to additional clean investment buys real abatement — shown as a mitigation GAIN (negative bar). Under a binding ETS cap the benefit largely accrues in non-ETS sectors or enables a tighter future cap.',
    category: 'gain', direct: 'indirect',
  },
  {
    id: 'd10', n: 10, title: 'Limit aviation charges to intra-EU routes',
    bullet: 'Limit carbon charges on aviation to intra-European routes rather than extending them to extra-EU flights.',
    instrument: 'Aviation ETS — Directive (EU) 2023/958; extra-EU flights under ICAO CORSIA',
    url: 'https://eur-lex.europa.eu/eli/dir/2023/958/oj',
    mechanism:
      'The ETS covers ~74 Mt of intra-EEA aviation; extending it to all departing flights would add ~107 Mt/yr (T&E, 2025) currently left to the far weaker CORSIA scheme (a 2022 CORSIA credit averaged €3.2/t vs €80/t in the ETS). Keeping extra-EU flights out forgoes the abatement a full carbon price / SAF pull would have driven — a genuine, uncapped loss.',
    category: 'aviation', direct: 'direct',
  },
];

const META = Object.fromEntries(DEMANDS.map((d) => [d.id, d])) as Record<string, DemandMeta>;

const CAT_COLOR: Record<Category, string> = {
  supply: '#B83230', // red — direct extra supply/emissions
  freealloc: '#FF9933', // orange — indirect
  aviation: '#A530B8', // purple — forgone (uncapped)
  gain: '#007B6C', // green — mitigation gain
};

/* ====================================================================== anchors */

// ESABCC advised an EU GHG budget of 11–14 GtCO2e for 2030–2050 and a 2040
// target of 90–95% net cut vs 1990 (ESABCC, 2023). Midpoint used as scale.
const BUDGET_2030_2050_MT = 12500; // Mt CO2e (12.5 Gt midpoint of 11–14 Gt)
const EU_ANNUAL_CUT_MT = 130; // Mt/yr — recent EEA average annual net reduction (2018–2023); the pace needed to reach −90% by 2040 is ~165 Mt/yr
const EU_NET_2023_MT = 3200; // Mt CO2e — EU-27 net GHG emissions, 2023 (EEA; −8.3% YoY)

/* ====================================================================== UI bits */

function Slider(props: {
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  unit?: string; std?: number; display?: (v: number) => string; onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, display, onChange } = props;
  const fmtVal = (v: number) => (display ? display(v) : fmt(v, step < 1 ? 2 : 0));
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmtVal(value)}{unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
        {stdPct !== null && (
          <span aria-hidden title={`Standard: ${fmtVal(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}% )` }} />
        )}
      </div>
      {hint ? <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{hint}</p> : null}
    </label>
  );
}

function AnchorCard({ h, b }: { h: string; b: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">{h}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{b}</p>
    </div>
  );
}

/* Click-to-open info popover — explains the intuition in plain language. */
function InfoButton({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={title ? `What is: ${title}` : 'More information'}
        className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none transition-colors ${open ? 'border-primary bg-primary text-white' : 'border-grey-400 text-tertiary hover:border-primary hover:text-primary'}`}>i</button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <span className="absolute left-1/2 top-5 z-50 block w-64 -translate-x-1/2 rounded-lg border border-grey-200 bg-white p-3 text-left shadow-xl sm:w-72">
            {title ? <span className="mb-1 block text-[11px] font-bold normal-case tracking-normal text-tertiary-dark">{title}</span> : null}
            <span className="block text-[11px] font-normal normal-case leading-relaxed tracking-normal text-tertiary">{children}</span>
          </span>
        </>
      )}
    </span>
  );
}

function MethodRow({ tag, color, formula, body, cites }: {
  tag: string; color: string; formula: string; body: string; cites: [string, string][];
}) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>{tag}</span>
        <code className="rounded bg-grey-100 px-2 py-0.5 font-mono text-[11px] text-tertiary-dark">{formula}</code>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-tertiary">{body}</p>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px]">
        {cites.map(([label, url]) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{label} ↗</a>
        ))}
      </p>
    </div>
  );
}

/* Diverging horizontal bar chart: setbacks to the right (warm), gain to the left (green). */
function DivergingBars({ rows }: { rows: { id: string; label: string; mt: number; color: string }[] }) {
  const W = 760;
  const rowH = 30;
  const H = rows.length * rowH + 26;
  const m = { l: 250, r: 70, t: 6, b: 20 };
  const iw = W - m.l - m.r;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.mt)));
  const zero = m.l + (iw * maxAbs) / (maxAbs + maxAbs); // centred zero
  const sx = (mt: number) => zero + (mt / maxAbs) * (iw / 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Per-demand cumulative GHG impact (Mt CO2e)">
      <line x1={zero} x2={zero} y1={m.t} y2={H - m.b} stroke="#BCBEC0" strokeWidth={1} />
      {rows.map((r, i) => {
        const y = m.t + i * rowH;
        const x = sx(r.mt);
        const x0 = zero;
        const bx = Math.min(x, x0);
        const bw = Math.abs(x - x0);
        return (
          <g key={r.id}>
            <text x={m.l - 10} y={y + rowH / 2 + 3} textAnchor="end" fontSize={11} className="fill-tertiary">
              {r.label.length > 40 ? `${r.label.slice(0, 39)}…` : r.label}
            </text>
            <rect x={bx} y={y + 5} width={Math.max(bw, 1)} height={rowH - 12} rx={2} fill={r.color} opacity={0.9} />
            <text x={r.mt >= 0 ? x + 5 : x - 5} y={y + rowH / 2 + 3} textAnchor={r.mt >= 0 ? 'start' : 'end'}
              fontSize={10.5} className="fill-tertiary-dark font-semibold tabular-nums">
              {r.mt >= 0 ? '+' : '−'}{fmt(Math.abs(r.mt))}
            </text>
          </g>
        );
      })}
      <text x={zero + iw / 4} y={H - 6} textAnchor="middle" fontSize={9} className="fill-grey-500">more emissions →</text>
      <text x={zero - iw / 4} y={H - 6} textAnchor="middle" fontSize={9} className="fill-grey-500">← mitigation gain</text>
    </svg>
  );
}

/* Stacked cumulative-over-time area-ish line for the combined net path. */
function CumulativeLine({ years, totals }: { years: number[]; totals: number[] }) {
  const W = 760, H = 220;
  const m = { l: 56, r: 16, t: 12, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const cum: number[] = [];
  totals.reduce((acc, v, i) => (cum[i] = acc + v), 0);
  const max = Math.max(1, ...cum);
  const min = Math.min(0, ...cum);
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const sy = (v: number) => m.t + ih - ((v - min) / (max - min)) * ih;
  const path = cum.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const area = `${path} L${sx(years.length - 1).toFixed(1)},${sy(0).toFixed(1)} L${sx(0).toFixed(1)},${sy(0).toFixed(1)} Z`;
  const yticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative net extra emissions over time">
      {Array.from({ length: yticks + 1 }, (_, i) => {
        const v = min + ((max - min) * i) / yticks;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" fontSize={9} className="fill-grey-500 tabular-nums">{fmt(v)}</text>
          </g>
        );
      })}
      <path d={area} fill="#B8323018" />
      <path d={path} fill="none" stroke="#B83230" strokeWidth={2} />
      {years.map((yr, i) => (yr % 5 === 0 ? (
        <text key={yr} x={sx(i)} y={H - 8} textAnchor="middle" fontSize={9} className="fill-grey-500">{yr}</text>
      ) : null))}
      <text x={m.l} y={m.t - 2} fontSize={9} className="fill-grey-500">Mt CO₂e (cumulative net setback)</text>
    </svg>
  );
}

/* ====================================================================== page */

export default function EtsWishlistImpactPage() {
  const [p, setP] = useState<Params>(DEFAULTS);
  const [activeScenario, setActiveScenario] = useState<string>('central');

  const set = <K extends keyof Params>(k: K, v: Params[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setActiveScenario('custom');
  };

  const applyScenario = (s: Scenario) => {
    setP({ ...DEFAULTS, ...s.overrides, endYear: p.endYear });
    setActiveScenario(s.id);
  };

  const { years, byId } = useMemo(() => computeImpacts(p), [p]);
  const net = useMemo(() => netSetback(byId, p.interaction), [byId, p.interaction]);

  // ordered rows for the diverging chart (largest setback first, gain last)
  const rows = DEMANDS.map((d) => ({
    id: d.id, label: `#${d.n} ${d.title}`, mt: byId[d.id].mt, color: CAT_COLOR[d.category],
  })).sort((a, b) => b.mt - a.mt);

  // combined per-year totals (with the interaction haircut on supply demands)
  const totals = years.map((_, i) => {
    const supply = p.interaction * (byId.d1.series[i] + byId.d2.series[i] + byId.d3.series[i] + byId.d4.series[i]);
    const rest = byId.d5.series[i] + byId.d6.series[i] + byId.d7.series[i] + byId.d8.series[i]
      + byId.d9.series[i] + byId.d10.series[i];
    return supply + rest;
  });

  const yearsOfProgress = net.net / EU_ANNUAL_CUT_MT;
  const budgetPct = (net.net / BUDGET_2030_2050_MT) * 100;
  const eqYearShare = (net.net / EU_NET_2023_MT) * 100;

  const numFmt = (n: number) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            <span>Beta module · ETS policy · interactive GHG estimator</span>
            <span className="rounded-full bg-surface-yellow px-2 py-0.5 text-[10px] font-bold text-tertiary-dark">BETA</span>
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">The ETS Wishlist — what it costs in carbon</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            A summary of the EPP&apos;s ten demands to soften the EU Emissions Trading System has been circulating. This
            module models each demand&apos;s effect on EU greenhouse-gas mitigation — <strong>one by one and all
            together</strong> — so you can see how far the wishlist would set the EU back. Every figure is an explicit,
            editable assumption, organised into <strong>scenarios</strong>, and every instrument links to the actual
            EU legislation.
          </p>
          <p className="mt-2 max-w-3xl text-[12px] text-tertiary">
            This is a deliberately stylised accounting model, not a forecast or a market simulation. The honest core: under
            a binding, banked cap, demands that change the <em>cap</em> or add fungible <em>supply</em> (slower LRF, weaker
            MSR, removal &amp; international credits) drive real extra emissions, while demands that only reshuffle
            <em> free allowances</em> mostly move rents, not the capped total — so they are modelled small and labelled
            &ldquo;indirect&rdquo;.
          </p>
          <p className="mt-2 text-[12px] text-tertiary">New to the EU ETS? Tap the small <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-grey-400 text-[8px] font-bold text-tertiary">i</span> buttons anywhere on the page for plain-language explanations of what is going on.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md bg-secondary-light px-3 py-1.5 text-[12px] font-semibold text-white">Accounting model (this page)</span>
            <Link href="/beta/ets-wishlist-impact/market"
              className="inline-flex items-center rounded-md border border-secondary-light px-3 py-1.5 text-[12px] font-semibold text-secondary hover:bg-surface-teal">
              Market model — solve the carbon price &amp; banking →
            </Link>
          </div>
        </section>

        {/* headline */}
        <section className="mb-6 rounded-xl border border-accent-red/30 bg-surface-blue p-5">
          <div className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
            <div>
              <p className="flex items-center text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">
                Net setback to {p.endYear}
                <InfoButton title="What this number is">The extra greenhouse gas the wishlist would let the EU emit, cumulatively, by {p.endYear} — adding up all ten demands and subtracting the one that helps (revenue earmarking). It is built bottom-up from per-demand volumes. For the version that also lets the carbon price respond, see the market model.</InfoButton>
              </p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-accent-red sm:text-5xl">
                {net.net >= 0 ? '+' : '−'}{fmt(Math.abs(net.net))} <span className="text-2xl">Mt CO₂e</span>
              </p>
              <p className="mt-1 text-[12px] text-tertiary">cumulative {START}–{p.endYear}, all demands combined</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <AnchorCard h="≈ Years of EU progress lost"
                b={`About ${fmt(yearsOfProgress, 1)} years of the EU's recent average annual net cut (~${EU_ANNUAL_CUT_MT} Mt/yr, EEA) — undone.`} />
              <AnchorCard h="Share of the 2030–2050 budget"
                b={`≈ ${fmt(budgetPct, 1)}% of the ESABCC-advised EU GHG budget for 2030–2050 (11–14 Gt; 12.5 Gt midpoint).`} />
              <AnchorCard h="Vs one year of EU emissions"
                b={`≈ ${fmt(eqYearShare, 1)}% of the EU's entire 2023 net emissions (${fmt(EU_NET_2023_MT)} Mt, EEA).`} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              { k: 'Supply-side (#1–4)', v: net.supply, c: CAT_COLOR.supply, note: 'after overlap haircut',
                info: <>The demands that change the <strong>cap</strong> or add fungible <strong>supply</strong> — slower LRF, weaker MSR, removal &amp; international credits. Under a binding cap, extra allowances are extra emissions, so these bite hardest. This is the largest block, and the LRF dominates it.</> },
              { k: 'Free allocation (#5–8)', v: net.freeAlloc, c: CAT_COLOR.freealloc, note: 'indirect / leakage',
                info: <>Free allowances are handed out <em>within</em> the fixed cap, so giving away more does not change the capped total — it mostly transfers money to industry. The only emission effect is indirect (leakage, a weaker transition signal), which is why this block is small and uncertain.</> },
              { k: 'Aviation (#10)', v: net.aviation, c: CAT_COLOR.aviation, note: 'forgone, uncapped',
                info: <>Extra-EU flights sit <strong>outside</strong> the ETS cap (only the weak CORSIA scheme applies). Because these emissions are not capped, keeping them out is a genuine, non-offset loss — the abatement a real carbon price would have driven, forgone every year.</> },
              { k: 'Revenue earmark (#9)', v: net.gain, c: CAT_COLOR.gain, note: 'mitigation gain',
                info: <>The one demand that <strong>helps</strong>: spending ETS revenue on clean investment buys real abatement, shown as a negative (mitigation) bar. Under a binding ETS cap its benefit mostly lands outside the ETS or enables a tighter future cap.</> },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border border-grey-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: x.c }} />
                  <p className="flex items-center text-[10.5px] font-bold uppercase tracking-[0.08em] text-tertiary">{x.k}<InfoButton title={x.k}>{x.info}</InfoButton></p>
                </div>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{numFmt(x.v)} <span className="text-[11px] font-normal text-tertiary">Mt</span></p>
                <p className="text-[10px] text-tertiary">{x.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* scenarios + horizon */}
        <section className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Scenario (set of assumptions)</p>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((s) => (
                  <button key={s.id} onClick={() => applyScenario(s)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      activeScenario === s.id ? 'border-primary bg-primary text-white'
                        : 'border-grey-300 bg-white text-tertiary-dark hover:border-primary hover:text-primary'}`}>
                    {s.label}
                  </button>
                ))}
                {activeScenario === 'custom' && (
                  <span className="inline-flex items-center rounded-full border border-dashed border-grey-400 px-3 py-1.5 text-[12px] font-semibold text-tertiary">Custom</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Horizon</p>
              <div className="flex gap-2">
                {[2035, 2040, 2050].map((y) => (
                  <button key={y} onClick={() => setP((prev) => ({ ...prev, endYear: y }))}
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      p.endYear === y ? 'border-secondary-light bg-secondary-light text-white'
                        : 'border-grey-300 bg-white text-tertiary-dark hover:border-secondary-light'}`}>
                    to {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-[11.5px] leading-relaxed text-tertiary">
            {SCENARIOS.find((s) => s.id === activeScenario)?.blurb
              ?? 'You have moved the assumptions away from a named scenario. Pick a scenario above to return to a calibrated starting point.'}
          </p>
        </section>

        {/* combined charts */}
        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <h2 className="mb-1 flex items-center text-[13px] font-bold text-tertiary-dark">Each demand, ranked by carbon impact
              <InfoButton title="Reading the bars">Each bar is one demand&apos;s cumulative effect, in Mt CO₂e. Bars to the right add emissions (a setback); the single green bar to the left is the demand that cuts them. Colour shows the channel — red supply demands move the capped total directly, so they are biggest; orange free-allocation demands barely move it.</InfoButton>
            </h2>
            <p className="mb-2 text-[11px] text-tertiary">Cumulative {START}–{p.endYear}, Mt CO₂e. Red = direct extra supply · orange = indirect free-allocation · purple = forgone (uncapped) aviation · green = mitigation gain.</p>
            <DivergingBars rows={rows} />
          </div>
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <h2 className="mb-1 flex items-center text-[13px] font-bold text-tertiary-dark">The hole deepens over time
              <InfoButton title="Why it accelerates">Once the LRF is slowed, the cap stays permanently higher and the gap compounds: each extra year of a slower cap adds to the running total, and admitted credits ramp up too. So the curve steepens rather than rising in a straight line — the longer the wishlist is in force, the faster the damage accumulates.</InfoButton>
            </h2>
            <p className="mb-2 text-[11px] text-tertiary">Cumulative net extra emissions as the slower cap and admitted credits build up year on year.</p>
            <CumulativeLine years={years} totals={totals} />
          </div>
        </section>

        {/* per-demand cards with their own sliders */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-tertiary-dark">The ten demands, one by one</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {DEMANDS.map((d) => (
              <DemandCard key={d.id} meta={d} mt={byId[d.id].mt} p={p} set={set} />
            ))}
          </div>
        </section>

        {/* cross-cutting realism */}
        <section className="mb-8 rounded-lg border border-primary/30 bg-surface-blue p-4">
          <h2 className="mb-3 flex items-center text-[13px] font-bold text-primary">Cross-cutting realism knobs
            <InfoButton title="Why these two knobs exist">Real-world frictions that apply to all the supply demands at once. <strong>Bank pass-through</strong>: not every extra allowance is emitted — some is banked or cancelled by the MSR, so &lt;100% converts to emissions. <strong>Overlap haircut</strong>: demands #1–4 all loosen the same market, so naively adding them double-counts; the haircut trims the total to avoid that.</InfoButton>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Slider label="Bank pass-through" hint="Share of extra allowances/supply that become real extra emissions rather than being banked or cancelled."
              value={p.bankPassThrough} min={0.5} max={1} step={0.05} std={DEFAULTS.bankPassThrough}
              display={(v) => `${fmt(v * 100)}%`} onChange={(v) => set('bankPassThrough', v)} />
            <Slider label="Overlap haircut on supply demands" hint="Demands #1–4 all add supply the bank smooths; <100% avoids double-counting where they overlap."
              value={p.interaction} min={0.6} max={1} step={0.05} std={DEFAULTS.interaction}
              display={(v) => `${fmt(v * 100)}%`} onChange={(v) => set('interaction', v)} />
          </div>
        </section>

        {/* scientific methodology */}
        <section className="mb-8">
          <h2 className="mb-1 text-[15px] font-bold text-tertiary-dark">How each number is derived — the scientific basis</h2>
          <p className="mb-4 max-w-3xl text-[12px] text-tertiary">
            This page is an explicit, auditable accounting model. Below, every lever is tied to the equation it uses, the
            calibrated value, and the primary source. The governing theory is the <strong>binding-cap (waterbed)</strong>
            {' '}result: under a fixed, fully banked cap, cumulative emissions equal cumulative allowance supply minus the
            bank left at the end (Ellerman &amp; Montero on banking; Perino 2018 on how the post-2023 MSR cancellation
            <em> punctures</em> that waterbed). That is why cap- and supply-changing demands bite, and pure
            free-allocation reshuffles do not.
          </p>
          <div className="space-y-3">
            <MethodRow
              tag="#1 · LRF" color={CAT_COLOR.supply}
              formula="extra cap(t) = Σ (Δpp/100) × base ; base = 2008–2012 avg cap"
              body="The linear reduction removes a fixed absolute volume each year — 4.3% (2024–27) and 4.4% (2028+) of the 2008–2012 average cap (~1.95 Gt), i.e. ≈84 then ≈86 Mt/yr. A Δpp slowdown foregoes Δpp×base/100 ≈ 19.5 Mt per pp, and because the cap never recovers, the gap compounds year on year. Summed over the horizon and multiplied by the bank pass-through."
              cites={[['Dir. (EU) 2023/959 Art. 9', 'https://eur-lex.europa.eu/eli/dir/2023/959/oj'], ['UBA/DEHSt', 'https://www.dehst.de/EN/Topics/EU-ETS-1/EU-ETS-1-Information/Reform-Prospects/Climate-Protection-Ambition/climate-protection-ambition_node.html']]} />
            <MethodRow
              tag="#2 · MSR" color={CAT_COLOR.supply}
              formula="setback = affected volume × release share × pass-through"
              body="The MSR withdraws 24% of the TNAC (thresholds 833 / 1,096 Mt) and permanently invalidates holdings above 400 Mt — 381.7 Mt were cancelled in January 2024. A reform that re-releases reserves to damp prices both re-injects allowances and stops future cancellation. We model the cumulative volume that the current MSR would otherwise lock away/cancel and the share a weaker MSR lets back. Deliberately wide, because the proposed reform is undefined."
              cites={[['Decision (EU) 2015/1814', 'https://eur-lex.europa.eu/eli/dec/2015/1814/oj'], ['EC MSR / TNAC', 'https://climate.ec.europa.eu/eu-action/carbon-markets/eu-emissions-trading-system-eu-ets/market-stability-reserve_en']]} />
            <MethodRow
              tag="#3 · CDR offsets" color={CAT_COLOR.supply}
              formula="setback = admitted removals × integrity gap"
              body="If a removal credit can be surrendered against an emission, each non-permanent, reversed or non-additional tonne is a net addition. With perfect, permanent removals (gap = 0) the term vanishes — this is a risk premium on integrity, not an objection to removals. The CRCF sets the certification rules the integrity gap is judged against."
              cites={[['Reg. (EU) 2024/3012 (CRCF)', 'https://eur-lex.europa.eu/eli/reg/2024/3012/oj']]} />
            <MethodRow
              tag="#4 · Int'l credits" color={CAT_COLOR.supply}
              formula="setback = admitted credits × non-additional share (0.73)"
              body="Admitting international offsets adds fungible supply. The default non-additional share is the CER-supply-weighted finding of the DG CLIMA study: 73% of 2013–2020 CDM credit supply (85% of projects) had a low likelihood of being additional and not over-credited."
              cites={[['Cames et al. 2016 (DG CLIMA)', 'https://www.oeko.de/en/publications/how-additional-is-the-clean-development-mechanism'], ['Paris Art. 6', 'https://unfccc.int/process-and-meetings/the-paris-agreement/article-64-mechanism']]} />
            <MethodRow
              tag="#5–8 · Free allocation" color={CAT_COLOR.freealloc}
              formula="setback = extra free allowances × forgone-abatement share (indirect)"
              body="Free allocation is distributed within the fixed cap, so it does not change the capped total (≈0 direct effect). Benchmark-based allocation also preserves the marginal price signal. The residual modelled effect is the indirect channel — leakage exposure and a weaker investment/transition signal — captured by a small forgone-abatement share. Genuinely uncertain and deliberately small."
              cites={[['ETS Dir. Art. 10a', 'https://eur-lex.europa.eu/eli/dir/2003/87/oj'], ['CBAM Reg. (EU) 2023/956', 'https://eur-lex.europa.eu/eli/reg/2023/956/oj'], ['Impl. Reg. 2021/447', 'https://eur-lex.europa.eu/eli/reg_impl/2021/447/oj']]} />
            <MethodRow
              tag="#9 · Revenue earmark" color={CAT_COLOR.gain}
              formula="gain = −(€bn × 1000 / (€/t)) × additionality"
              body="Hypothecating revenue to additional clean investment buys abatement at an assumed lifecycle cost (€/t), discounted by the share that is genuinely additional (not business-as-usual). Shown as a negative (mitigation) bar. Under a binding ETS cap the benefit largely accrues outside the ETS or by enabling a tighter future cap — flagged accordingly."
              cites={[['ETS Dir. Art. 10(3)', 'https://eur-lex.europa.eu/eli/dir/2003/87/oj'], ['Reg. (EU) 2023/955 (SCF)', 'https://eur-lex.europa.eu/eli/reg/2023/955/oj']]} />
            <MethodRow
              tag="#10 · Aviation" color={CAT_COLOR.aviation}
              formula="forgone = Σ extra-EU Mt/yr × abatement rate (2027→horizon)"
              body="Extra-EU departing flights (~107 Mt/yr, T&E 2025) sit outside the ETS cap, under the far weaker CORSIA (a 2022 CORSIA credit ≈ €3.2/t vs €80/t in the ETS). Because these emissions are uncapped, the abatement a full carbon price / SAF pull would have driven is a real, non-offset loss each year it is forgone."
              cites={[['Dir. (EU) 2023/958', 'https://eur-lex.europa.eu/eli/dir/2023/958/oj'], ['T&E 2025', 'https://www.transportenvironment.org/articles/flying-blind-european-aviation-hits-new-emissions-high']]} />
          </div>
          <div className="mt-4 rounded-lg border border-primary/30 bg-surface-blue p-4">
            <p className="text-[12px] font-bold text-primary">Combining the levers</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary">
              The headline is <span className="font-mono">net = interaction × (d1+d2+d3+d4) + (d5+…+d8) + d10 + d9</span>. The
              overlap haircut on the additive supply-side demands avoids double-counting: more supply from one lever is
              partly absorbed where another also loosens, and the shared bank smooths them. This linear accounting is a
              first-order approximation — for the price-endogenous version, where the carbon price, banking and the MSR
              are solved jointly, use the{' '}
              <Link href="/beta/ets-wishlist-impact/market" className="font-semibold text-primary hover:underline">market model →</Link>.
            </p>
          </div>
        </section>

        {/* method & limits */}
        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">Method &amp; honest limits</p>
            <ul className="list-disc space-y-1.5 pl-4 text-[11.5px] leading-relaxed text-tertiary">
              <li>This is a transparent <strong>accounting</strong> model, not a partial-equilibrium carbon-market model. It does not solve for an allowance price or for banking endogenously.</li>
              <li>The dominant lever (#1, LRF) is computed directly from the cumulative pp-slowdown × a fixed reduction base — the same arithmetic the cap itself uses.</li>
              <li>Free-allocation demands (#5–8) have ≈0 effect on the <em>capped</em> total; their modelled impact is purely the indirect leakage / weaker-signal channel, which is genuinely uncertain.</li>
              <li>Demands overlap (more supply from one is partly absorbed where another also loosens) — the overlap haircut crudely corrects for double-counting.</li>
              <li>The &ldquo;wishlist&rdquo; text is a third-party summary of an EPP position; treat the attribution as indicative and verify against the primary document.</li>
              <li>Defaults are order-of-magnitude calibrations, deliberately exposed as sliders precisely because they are uncertain.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">Indicative sources &amp; instruments</p>
            <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-tertiary">
              {[
                ['EU ETS Directive 2003/87/EC (consolidated)', 'https://eur-lex.europa.eu/eli/dir/2003/87/oj'],
                ['Directive (EU) 2023/959 — ETS reform (LRF, rebasing)', 'https://eur-lex.europa.eu/eli/dir/2023/959/oj'],
                ['Decision (EU) 2015/1814 — Market Stability Reserve', 'https://eur-lex.europa.eu/eli/dec/2015/1814/oj'],
                ['Regulation (EU) 2023/956 — CBAM', 'https://eur-lex.europa.eu/eli/reg/2023/956/oj'],
                ['Regulation (EU) 2024/3012 — Carbon Removals (CRCF)', 'https://eur-lex.europa.eu/eli/reg/2024/3012/oj'],
                ['Directive (EU) 2023/958 — Aviation ETS', 'https://eur-lex.europa.eu/eli/dir/2023/958/oj'],
                ['Regulation (EU) 2023/955 — Social Climate Fund / revenue use', 'https://eur-lex.europa.eu/eli/reg/2023/955/oj'],
                ['Impl. Reg. (EU) 2021/447 — benchmark values', 'https://eur-lex.europa.eu/eli/reg_impl/2021/447/oj'],
                ['ICAP — EU ETS factsheet (cap & parameters)', 'https://icapcarbonaction.com/en/ets/eu-emissions-trading-system-eu-ets'],
                ['UBA/DEHSt — climate-protection ambition (84/86 Mt LRF)', 'https://www.dehst.de/EN/Topics/EU-ETS-1/EU-ETS-1-Information/Reform-Prospects/Climate-Protection-Ambition/climate-protection-ambition_node.html'],
                ['European Commission — MSR & 2024 TNAC publication', 'https://climate.ec.europa.eu/eu-action/carbon-markets/eu-emissions-trading-system-eu-ets/market-stability-reserve_en'],
                ['Cames et al. (2016) — How additional is the CDM? (DG CLIMA)', 'https://www.oeko.de/en/publications/how-additional-is-the-clean-development-mechanism'],
                ['Perino (2018) — New Phase-4 rules temporarily puncture the waterbed (Nat. Clim. Change)', 'https://www.nature.com/articles/s41558-018-0120-2'],
                ['T&E (2025) — Flying blind: European aviation emissions (107 Mt uncovered)', 'https://www.transportenvironment.org/articles/flying-blind-european-aviation-hits-new-emissions-high'],
                ['ESABCC — 2040 target & EU GHG budget advice (11–14 Gt)', 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040'],
                ['EEA — EU ETS data viewer & GHG inventory (3.2 Gt, 2023)', 'https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards'],
              ].map(([label, url]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{label} ↗</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mb-2 text-[11px] text-tertiary">
          See also the sister module{' '}
          <Link href="/beta/ets-cdr-price" className="text-primary hover:underline">ETS Endgame &amp; CDR Safety Valve</Link>{' '}
          for an intertemporal allowance-price reconstruction of the same market.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

/* ---------------------------------------------------------------- demand card */

function DemandCard({ meta, mt, p, set }: {
  meta: DemandMeta; mt: number; p: Params; set: <K extends keyof Params>(k: K, v: Params[K]) => void;
}) {
  const color = CAT_COLOR[meta.category];
  const tag = meta.direct === 'direct'
    ? { t: 'DIRECT', c: 'bg-accent-red/10 text-accent-red' }
    : { t: 'INDIRECT', c: 'bg-accent-orange/10 text-accent-orange' };
  return (
    <div className="flex flex-col rounded-lg border border-grey-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }}>{meta.n}</span>
          <h3 className="text-[13.5px] font-bold leading-tight text-tertiary-dark">{meta.title}</h3>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${tag.c}`}>{tag.t}</span>
          <InfoButton title={`${tag.t} effect`}>{meta.direct === 'direct'
            ? <><strong>Direct</strong>: this demand changes the cap or adds tradable supply, so under a binding cap it converts to extra emissions roughly tonne-for-tonne (the robust, well-understood channel).</>
            : <><strong>Indirect</strong>: this demand does not change the capped total — its emission effect runs through softer channels (leakage, a weaker investment signal). Small and genuinely uncertain, so treat it as a sign-of-the-effect, not a precise figure.</>}</InfoButton>
          <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${mt >= 0 ? 'text-accent-red' : 'text-secondary'}`}>
            {mt >= 0 ? '+' : '−'}{fmt(Math.abs(mt))}<span className="text-[10px] font-normal text-tertiary"> Mt</span>
          </p>
        </div>
      </div>
      <p className="mb-2 text-[11.5px] italic leading-snug text-tertiary">&ldquo;{meta.bullet}&rdquo;</p>
      <p className="mb-2 text-[11px] leading-relaxed text-tertiary">{meta.mechanism}</p>
      <p className="mb-3 text-[10.5px] text-tertiary">
        Instrument:{' '}
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{meta.instrument} ↗</a>
      </p>
      <div className="mt-auto space-y-3 border-t border-grey-100 pt-3">
        <DemandSliders id={meta.id} p={p} set={set} />
      </div>
    </div>
  );
}

function pct(v: number) { return `${fmt(v * 100)}%`; }

function DemandSliders({ id, p, set }: {
  id: string; p: Params; set: <K extends keyof Params>(k: K, v: Params[K]) => void;
}) {
  switch (id) {
    case 'd1':
      return (
        <>
          <Slider label="LRF slowdown 2031–2035" unit="pp" value={p.lrfDelta3135} min={0} max={2} step={0.1}
            std={DEFAULTS.lrfDelta3135} hint="The demand says ≥1 pp." onChange={(v) => set('lrfDelta3135', v)} />
          <Slider label="LRF slowdown after 2035" unit="pp" value={p.lrfDeltaPost35} min={0} max={1.5} step={0.05}
            std={DEFAULTS.lrfDeltaPost35} hint="The 'more moderate decline'." onChange={(v) => set('lrfDeltaPost35', v)} />
          <Slider label="Linear reduction base" unit="Mt" value={p.lrfRef} min={1700} max={2100} step={10}
            std={DEFAULTS.lrfRef} hint="The 2008–2012 average cap the LRF % is applied to (≈1.95 Gt → ≈86 Mt/yr at 4.4%; 1 pp ≈ 19.5 Mt/yr)." onChange={(v) => set('lrfRef', v)} />
        </>
      );
    case 'd2':
      return (
        <>
          <Slider label="Allowances MSR would withhold/cancel" unit="Mt" value={p.msrAffectedMt} min={100} max={1200} step={50}
            std={DEFAULTS.msrAffectedMt} onChange={(v) => set('msrAffectedMt', v)} />
          <Slider label="Share the reform releases back" value={p.msrReleaseShare} min={0} max={1} step={0.05}
            std={DEFAULTS.msrReleaseShare} display={pct} onChange={(v) => set('msrReleaseShare', v)} />
        </>
      );
    case 'd3':
      return (
        <>
          <Slider label="Removal credits admitted (cumulative)" unit="Mt" value={p.cdrAdmittedMt} min={0} max={800} step={25}
            std={DEFAULTS.cdrAdmittedMt} onChange={(v) => set('cdrAdmittedMt', v)} />
          <Slider label="Integrity gap (non-permanent / non-additional)" value={p.cdrIntegrityGap} min={0} max={0.6} step={0.05}
            std={DEFAULTS.cdrIntegrityGap} display={pct} hint="0% = perfect removals → no setback." onChange={(v) => set('cdrIntegrityGap', v)} />
        </>
      );
    case 'd4':
      return (
        <>
          <Slider label="International credits admitted (cumulative)" unit="Mt" value={p.intlCreditsMt} min={0} max={1200} step={50}
            std={DEFAULTS.intlCreditsMt} onChange={(v) => set('intlCreditsMt', v)} />
          <Slider label="Non-additional / low-quality share" value={p.intlNonAdditional} min={0} max={0.95} step={0.01}
            std={DEFAULTS.intlNonAdditional} display={pct} hint="Cames et al. (2016): 73% of CDM CER supply unlikely additional." onChange={(v) => set('intlNonAdditional', v)} />
        </>
      );
    case 'd5':
      return (
        <>
          <Slider label="Extra free allowances retained vs phase-out" unit="Mt" value={p.cbamFreeExtraMt} min={0} max={700} step={25}
            std={DEFAULTS.cbamFreeExtraMt} onChange={(v) => set('cbamFreeExtraMt', v)} />
          <FreeAllocShared p={p} set={set} />
        </>
      );
    case 'd6':
      return (
        <>
          <Slider label="Extra free allowances kept beyond 2030" unit="Mt" value={p.freeBeyond2030Mt} min={0} max={600} step={25}
            std={DEFAULTS.freeBeyond2030Mt} onChange={(v) => set('freeBeyond2030Mt', v)} />
          <FreeAllocShared p={p} set={set} />
        </>
      );
    case 'd7':
      return (
        <>
          <Slider label="Extra free allocation from looser benchmarks" unit="Mt" value={p.benchmarkLooseningMt} min={0} max={500} step={25}
            std={DEFAULTS.benchmarkLooseningMt} onChange={(v) => set('benchmarkLooseningMt', v)} />
          <FreeAllocShared p={p} set={set} />
        </>
      );
    case 'd8':
      return (
        <Slider label="Net effect (signed)" unit="Mt" value={p.demand8Mt} min={-50} max={80} step={5}
          std={DEFAULTS.demand8Mt} hint="− = sharper incentive (helps) · + = prolonged giveaway (setback)." onChange={(v) => set('demand8Mt', v)} />
      );
    case 'd9':
      return (
        <>
          <Slider label="Additional clean investment mobilised" unit="€bn" value={p.cleanInvestBn} min={0} max={120} step={5}
            std={DEFAULTS.cleanInvestBn} onChange={(v) => set('cleanInvestBn', v)} />
          <Slider label="Abatement cost" unit="€/t" value={p.abatementCost} min={50} max={600} step={10}
            std={DEFAULTS.abatementCost} onChange={(v) => set('abatementCost', v)} />
          <Slider label="Additionality (not business-as-usual)" value={p.investAdditionality} min={0} max={1} step={0.05}
            std={DEFAULTS.investAdditionality} display={pct} onChange={(v) => set('investAdditionality', v)} />
        </>
      );
    case 'd10':
      return (
        <>
          <Slider label="Extra-EU aviation left outside the cap" unit="Mt/yr" value={p.extraEuAviationMt} min={0} max={160} step={5}
            std={DEFAULTS.extraEuAviationMt} onChange={(v) => set('extraEuAviationMt', v)} />
          <Slider label="Abatement a full ETS price would pull (vs CORSIA)" value={p.aviationAbatementRate} min={0} max={0.4} step={0.01}
            std={DEFAULTS.aviationAbatementRate} display={pct} onChange={(v) => set('aviationAbatementRate', v)} />
        </>
      );
    default:
      return null;
  }
}

function FreeAllocShared({ p, set }: { p: Params; set: <K extends keyof Params>(k: K, v: Params[K]) => void }) {
  return (
    <Slider label="Forgone-abatement share (shared #5–7)" value={p.freeAllocDeterrence} min={0} max={0.6} step={0.05}
      std={DEFAULTS.freeAllocDeterrence} display={pct}
      hint="Free allocation barely moves the capped total; this is the indirect leakage / weaker-signal channel."
      onChange={(v) => set('freeAllocDeterrence', v)} />
  );
}
