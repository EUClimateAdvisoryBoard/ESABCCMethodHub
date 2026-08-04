/**
 * A1 — Whose sink burns? Member-state decomposition.
 *
 * The parent module's stated top structural limitation is that it treats the
 * EU as one pool. This analysis removes that limitation for the one question
 * where geography is the whole story: fire risk is overwhelmingly Iberian and
 * Mediterranean, while the large legal sink obligations under Annex IIa of the
 * LULUCF Regulation sit mostly in the Nordic, Baltic and continental forests.
 *
 * Method: the parent module's cohort machinery (`cohortImpact`) is run once
 * per Member State over that country's own EFFIS burnt-area series — observed
 * 2021-25, then compounded forward at the shared growth dial — and differenced
 * against a counterfactual held at that country's own 2006-2024 mean. Exactly
 * the baseline subtraction of the parent module, done 27 times.
 *
 * Per-hectare carbon parameters (fuel load, forest share, removal rate,
 * recovery) are inherited EU-wide from the parent defaults. That is a real
 * simplification — Mediterranean shrub carries less fuel per hectare than the
 * boreal stands that dominate the EU average, but burns and re-burns more
 * often — and it is stated on the page rather than hidden.
 *
 * The comparison target is Annex IIa of Regulation (EU) 2018/841 as amended by
 * 2023/839: each country's legally-set 2030 net-removals value and its required
 * improvement over the 2016-18 baseline. A country's excess fire loss in 2030
 * is charged against those two numbers.
 *
 * Product caveat: the per-country EFFIS series is the rapid-damage-assessment
 * annual product, which differs a few percent from the JRC-report figures the
 * parent module quotes. All within-analysis comparisons stay inside this one
 * product. See `../data.ts`.
 */

import { DEFAULTS, cohortImpact, type Impact, type Params } from '../../model';
import {
  COUNTRIES,
  baIn,
  improvementMt,
  longRunMean,
  recentMean,
  targetSinkMt,
  type CountryFire,
} from '../data';

export const FIRST_OBS = 2021;
export const LAST_OBS = 2025;

/** Burnt area for one country in one year under the shared growth dial, ha. */
export function countryArea(c: CountryFire, year: number, growthPct: number): number {
  const obs = year >= FIRST_OBS && year <= LAST_OBS ? baIn(c.fires, year) : null;
  if (obs !== null) return obs;
  if (year < FIRST_OBS) return longRunMean(c);
  return recentMean(c) * Math.pow(1 + growthPct / 100, year - LAST_OBS);
}

/**
 * Excess sink loss for one country in `year`, MtCO2e — the country-level
 * version of the parent module's `excessImpact`, with the identical baseline
 * subtraction against the country's own long-run fire load.
 */
export function countryExcess(c: CountryFire, year: number, growthPct: number, p: Params = DEFAULTS): Impact {
  const projected = cohortImpact(year, (y) => countryArea(c, y, growthPct), p, FIRST_OBS);
  const counterfactual = cohortImpact(year, () => longRunMean(c), p, FIRST_OBS);
  return {
    combustion: projected.combustion - counterfactual.combustion,
    decomposition: projected.decomposition - counterfactual.decomposition,
    foregone: projected.foregone - counterfactual.foregone,
    total: projected.total - counterfactual.total,
  };
}

export type CountryRow = {
  c: CountryFire;
  /** 2021-25 mean burnt area, ha/yr. */
  anchorHa: number;
  /** 2006-24 mean burnt area, ha/yr (the embedded baseline). */
  embeddedHa: number;
  /** Share of the summed EU-27 2021-25 burnt area, %. */
  fireSharePct: number;
  /** Annex IIa 2030 net-removals value, Mt (positive = sink; negative = the
   *  country is legally allowed to remain a net source, e.g. DK, IE, NL). */
  target2030Mt: number;
  /** Required improvement 2016-18 → 2030, Mt (always positive). */
  improvementMt: number;
  /** Share of the EU-wide 310 Mt 2030 obligation, %. */
  sinkSharePct: number;
  /** Excess sink loss in 2030 at the chosen growth rate, MtCO2e. */
  loss2030: number;
  /** Excess sink loss in 2040, MtCO2e. */
  loss2040: number;
  /** loss2030 as % of the country's required 2016-18 → 2030 improvement. */
  lossPctOfImprovement: number;
  /** loss2030 as % of the country's 2030 target sink (0 when target ≤ 0). */
  lossPctOfTarget: number;
};

export function countryRows(growthPct: number, p: Params = DEFAULTS): CountryRow[] {
  const euFire = COUNTRIES.reduce((s, c) => s + recentMean(c), 0);
  return COUNTRIES.map((c) => {
    const loss2030 = countryExcess(c, 2030, growthPct, p).total;
    const loss2040 = countryExcess(c, 2040, growthPct, p).total;
    const target = targetSinkMt(c);
    const improve = improvementMt(c);
    return {
      c,
      anchorHa: recentMean(c),
      embeddedHa: longRunMean(c),
      fireSharePct: (recentMean(c) / euFire) * 100,
      target2030Mt: target,
      improvementMt: improve,
      sinkSharePct: (target / 310) * 100,
      loss2030,
      loss2040,
      lossPctOfImprovement: improve > 0 ? (loss2030 / improve) * 100 : 0,
      lossPctOfTarget: target > 0 ? (loss2030 / target) * 100 : 0,
    };
  });
}

export type A1Summary = {
  /** Share of EU-27 2021-25 fire in the top four fire countries, %. */
  top4FireSharePct: number;
  /** Those same four countries' share of the EU 310 Mt 2030 obligation, %. */
  top4SinkSharePct: number;
  /** The worst-hit country at 5%/yr and its 2030 loss vs required improvement. */
  worst: { name: string; loss2030: number; pctOfImprovement: number };
  /** Sweden's fire share, for the asymmetry headline, %. */
  swedenFireSharePct: number;
  /** Sweden's sink share, %. */
  swedenSinkSharePct: number;
};

/** Headline numbers at the parent module's default 5%/yr, for the overview. */
export function summary(): A1Summary {
  const rows = countryRows(5);
  const byFire = [...rows].sort((a, b) => b.fireSharePct - a.fireSharePct);
  const top4 = byFire.slice(0, 4);
  const worst = [...rows]
    .filter((r) => r.improvementMt > 0.05)
    .sort((a, b) => b.lossPctOfImprovement - a.lossPctOfImprovement)[0];
  const swe = rows.find((r) => r.c.iso3 === 'SWE')!;
  return {
    top4FireSharePct: top4.reduce((s, r) => s + r.fireSharePct, 0),
    top4SinkSharePct: top4.reduce((s, r) => s + r.sinkSharePct, 0),
    worst: { name: worst.c.name, loss2030: worst.loss2030, pctOfImprovement: worst.lossPctOfImprovement },
    swedenFireSharePct: swe.fireSharePct,
    swedenSinkSharePct: swe.sinkSharePct,
  };
}
