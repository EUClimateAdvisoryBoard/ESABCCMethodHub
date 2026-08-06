/**
 * Climate Security Ledger — deterministic arithmetic (beta module M · 45).
 *
 * Everything here is plain, reproducible arithmetic over the calibration
 * anchors in data.generated.ts — no fitting, no randomness, no hidden
 * state. The method (proposal P1, PROPOSALS-policy-gap-2-0):
 *
 *   Backward leg.  For each fossil fuel f and year t ≥ baseline year b,
 *   the counterfactual demand is the frozen-structure baseline
 *
 *     cf(f, t) = demand(f, b) × (activity(t) / activity(b)) ^ coupling
 *
 *   where activity is the EU-27 real-GDP index and `coupling` ∈ [0, 1] is
 *   an exposed slider (1 = frozen fuel intensity per unit of GDP, the
 *   proposal's definition; 0 = demand frozen outright). Then
 *
 *     avoided imports(f, t) = (cf(f, t) − actual(f, t)) × import share(f, t)
 *
 *   The sign is kept honest: years where actual demand sat ABOVE the
 *   counterfactual (2020, when GDP fell faster than fuel use) enter the
 *   sums as negatives rather than being dropped.
 *
 *   Valuation.  Avoided bill = avoided volume × border price under one of
 *   three switchable price scenarios; all prices are in € million per
 *   native volume unit so volume × price is always € million.
 *
 *   Forward leg.  The 2030 delivery shortfall of a pathway relative to the
 *   advised path becomes extra import volume (× assumed 2030 import share)
 *   and an extra bill; a stress slider interpolates each fuel's price
 *   linearly from the recent forward level (s = 0) to the 2022 crisis
 *   average (s = 1), replaying a 2022-style shock on the 2030 exposure.
 *
 * Epistemic status: the arithmetic is exact. Since the 2026-08 fact-check
 * the backward leg runs on live Eurostat observations and published World
 * Bank price averages, so it is no longer order-of-magnitude; the FORWARD
 * leg still runs on AI-inferred 2030 per-fuel levels and should be read as
 * indicative only (see data.generated.ts). Neither leg is an attribution
 * study — the frozen-structure counterfactual cannot
 * separate the effect of climate policy from the effect of the 2022 price
 * shock itself, and does not try to.
 */

import {
  ACTIVITY,
  DEMAND,
  EU_POPULATION_M,
  FUELS,
  IMPORT_SHARE,
  IMPORT_SHARE_2030,
  PRICES,
  PROJ_2030,
  YEARS,
  type Fuel,
  type PathKey,
  type PriceScenario,
} from './data.generated';

export type BaselineKey = 'frozen2015' | 'frozen2019';

export const BASELINE_YEAR: Record<BaselineKey, number> = {
  frozen2015: 2015,
  frozen2019: 2019,
};

/** Index of the baseline year inside YEARS. */
export function baseIndex(b: BaselineKey): number {
  return YEARS.indexOf(BASELINE_YEAR[b]);
}

/**
 * Counterfactual demand for fuel f in year index i under baseline b:
 * frozen fuel intensity per unit of activity, scaled by actual activity
 * raised to the coupling exponent. Defined for i ≥ baseIndex(b) only;
 * earlier years return NaN so charts can skip them explicitly.
 */
export function counterfactual(f: Fuel, i: number, b: BaselineKey, coupling: number): number {
  const j = baseIndex(b);
  if (i < j) return NaN;
  const act = Math.pow(ACTIVITY.series[i] / ACTIVITY.series[j], coupling);
  return DEMAND[f].series[j] * act;
}

/** Avoided demand (counterfactual − actual), native units; negative kept. */
export function avoidedDemand(f: Fuel, i: number, b: BaselineKey, coupling: number): number {
  const cf = counterfactual(f, i, b, coupling);
  return Number.isNaN(cf) ? 0 : cf - DEMAND[f].series[i];
}

/** Avoided imports = avoided demand × that year's import share. */
export function avoidedImports(f: Fuel, i: number, b: BaselineKey, coupling: number): number {
  return avoidedDemand(f, i, b, coupling) * (IMPORT_SHARE[f].series[i] / 100);
}

/** Per-year avoided-import volumes for all fuels (zero before the baseline year). */
export function avoidedImportSeries(b: BaselineKey, coupling: number): Record<Fuel, number[]> {
  const out = {} as Record<Fuel, number[]>;
  for (const f of FUELS) out[f] = YEARS.map((_, i) => avoidedImports(f, i, b, coupling));
  return out;
}

/** Cumulative avoided-import volume per fuel over the whole window. */
export function totalAvoidedVolume(b: BaselineKey, coupling: number): Record<Fuel, number> {
  const s = avoidedImportSeries(b, coupling);
  const out = {} as Record<Fuel, number>;
  for (const f of FUELS) out[f] = s[f].reduce((a, v) => a + v, 0);
  return out;
}

/** Price for fuel f under a scenario, € million per native unit. */
export function priceOf(f: Fuel, sc: PriceScenario): number {
  return PRICES[f][sc].value;
}

/** Per-year avoided bill per fuel, € million, under a price scenario. */
export function billSeries(b: BaselineKey, coupling: number, sc: PriceScenario): Record<Fuel, number[]> {
  const vols = avoidedImportSeries(b, coupling);
  const out = {} as Record<Fuel, number[]>;
  for (const f of FUELS) out[f] = vols[f].map((v) => v * priceOf(f, sc));
  return out;
}

/**
 * Total avoided bill, € million, with a lo–hi range propagated from each
 * price's published band — the within-year monthly spread for gas and oil,
 * the spread between the two steam-coal markers for coal. It is therefore a
 * "what if the whole window had cleared at the cheapest / dearest month"
 * bracket, NOT a confidence interval. Volume tolerances are stated in prose
 * and are not compounded here — see the caveats panel.
 */
export function totalBill(
  b: BaselineKey,
  coupling: number,
  sc: PriceScenario,
): { value: number; lo: number; hi: number; perFuel: Record<Fuel, number> } {
  const vols = totalAvoidedVolume(b, coupling);
  let value = 0;
  let lo = 0;
  let hi = 0;
  const perFuel = {} as Record<Fuel, number>;
  for (const f of FUELS) {
    const p = PRICES[f][sc];
    perFuel[f] = vols[f] * p.value;
    value += vols[f] * p.value;
    // For a negative volume, the lo/hi price bounds swap roles.
    lo += vols[f] * (vols[f] >= 0 ? p.lo : p.hi);
    hi += vols[f] * (vols[f] >= 0 ? p.hi : p.lo);
  }
  return { value, lo, hi, perFuel };
}

/** € per EU citizen for a € million total. */
export function perCitizen(millionEur: number): number {
  return (millionEur * 1e6) / (EU_POPULATION_M.value * 1e6);
}

/* ------------------------------------------------- forward-looking leg */

/**
 * Stress-interpolated price for fuel f, € million per native unit:
 * s = 0 → recent forward level, s = 1 → 2022 crisis average.
 */
export function stressedPrice(f: Fuel, s: number): number {
  const fw = PRICES[f].forward.value;
  const cr = PRICES[f].crisis2022.value;
  return fw + s * (cr - fw);
}

export type ForwardRow = {
  path: PathKey;
  /** Extra import volume in 2030 vs the advised path, native units per fuel. */
  extraVolume: Record<Fuel, number>;
  /** Extra import bill in 2030 vs the advised path, € million (stress-priced). */
  extraBill: number;
  /** Total 2030 fossil-import bill of the path itself, € million (stress-priced). */
  exposure: number;
};

/**
 * The security cost of each 2030 delivery shortfall: extra import volume
 * and bill of WEM and WAM relative to the advised path, plus each path's
 * own total import-bill exposure, all under the stress-slider price.
 */
export function forwardLeg(stress: number): ForwardRow[] {
  const shortfallOf = (path: PathKey): ForwardRow => {
    const extraVolume = {} as Record<Fuel, number>;
    let extraBill = 0;
    let exposure = 0;
    for (const f of FUELS) {
      const share = IMPORT_SHARE_2030.shares[f] / 100;
      const p = stressedPrice(f, stress);
      const extra = (PROJ_2030.levels[path][f].value - PROJ_2030.levels.advised[f].value) * share;
      extraVolume[f] = extra;
      extraBill += extra * p;
      exposure += PROJ_2030.levels[path][f].value * share * p;
    }
    return { path, extraVolume, extraBill, exposure };
  };
  return (['wem', 'wam', 'advised'] as PathKey[]).map(shortfallOf);
}
