/**
 * A3 — Prevention as a mitigation measure: the €/tCO2 of an avoided hectare.
 *
 * The parent module prices the carbon consequence of a burnt hectare and
 * prices engineered removals at €400/t. This analysis adds the one number the
 * module was missing — the cost of NOT burning the hectare — and divides.
 *
 * The full carbon cost of one burnt hectare, under the parent defaults:
 *
 *   combustion            42.0 tCO2  (the fire itself)
 *   decomposition         10.5 tCO2  (25% of combustion, over the next decade)
 *   foregone removals     25.0 tCO2  (forestShare 50% × 2.5 t/ha/yr × 20 yr
 *                                     recovery, linear ramp → × R/2)
 *   ─────────────────────────────
 *   lifecycle total      ~77.5 tCO2 per hectare kept unburnt
 *
 * (Undiscounted, and only the forest fraction carries the removals term —
 * both choices inherited from the parent model.)
 *
 * Cost side, from published European sources rather than invented numbers:
 *   • reintroduced grazing:      €60-80 /ha/yr   (EU LIFE LANDSCAPE FIRE,
 *     via CINEA project page)
 *   • mechanical fuel clearing:  ~€1,000 /ha     (same source's comparison)
 *   • prescribed burning:        between those two; the Mediterranean
 *     literature consistently finds it among the cheapest treatments
 *     (e.g. Annals of Forest Science 2021, 78:35)
 *
 * The honest weak link is LEVERAGE: hectares treated per hectare of expected
 * burn actually avoided. Fuel treatment does not translate 1:1 into avoided
 * burnt area — treatments are placed strategically, lose effectiveness over
 * time, and some fires overrun them. Leverage is therefore the analysis's
 * main dial, defaulted deliberately against the finding (10 treated ha per
 * avoided burnt ha) — and the finding survives it with an order of magnitude
 * to spare.
 */

import { DEFAULTS, ENGINEERED_COST_EUR_T, areaInYear, excessImpact, type Params } from '../../model';

/** Lifecycle carbon cost of one burnt hectare, tCO2/ha, under params `p`. */
export function lifecycleTco2PerHa(p: Params = DEFAULTS): number {
  const combustion = p.fuelLoad;
  const decomposition = p.fuelLoad * p.decompShare;
  const foregone = p.forestShare * p.seqRate * (p.recoveryYears / 2);
  return combustion + decomposition + foregone;
}

/** Published cost anchors, €/ha/yr. */
export const COST_ANCHORS: { label: string; low: number; high: number; source: string }[] = [
  { label: 'Reintroduced grazing', low: 60, high: 80, source: 'EU LIFE LANDSCAPE FIRE (CINEA project page)' },
  { label: 'Prescribed burning', low: 100, high: 500, source: 'Mediterranean fuel-management literature (order of magnitude)' },
  { label: 'Mechanical fuel clearing', low: 900, high: 1100, source: 'LIFE LANDSCAPE FIRE comparison figure (~€1,000/ha)' },
];

export type MarginalResult = {
  /** €/tCO2 implied by the dials. */
  eurPerT: number;
  /** Ratio of engineered-removal cost to this, ×. */
  cheaperThanRemovalsBy: number;
};

/** The core division: (cost of treating) / (carbon saved per avoided hectare). */
export function marginal(costPerHa: number, leverage: number, p: Params = DEFAULTS): MarginalResult {
  const eurPerT = (costPerHa * leverage) / lifecycleTco2PerHa(p);
  return { eurPerT, cheaperThanRemovalsBy: ENGINEERED_COST_EUR_T / eurPerT };
}

export type ProgrammeResult = {
  /** Burnt area avoided in 2040 by holding growth at gTo instead of gFrom, ha. */
  avoidedHa2040: number;
  /** Hectares under treatment in 2040 to achieve that, at the leverage dial. */
  treatedHa2040: number;
  /** Programme cost in 2040, € bn/yr. */
  costBnYr: number;
  /** Sink saved in 2040, MtCO2e. */
  sinkSavedMt: number;
  /** Implied programme cost, €/tCO2. */
  eurPerT: number;
  /** Cost of replacing the same tonnes with engineered removals, € bn/yr. */
  removalsCostBnYr: number;
};

/**
 * Programme framing: what does it cost to hold burnt-area growth at `gTo`
 * instead of `gFrom`, and what is the 2040 carbon payoff? Uses the parent
 * model end-to-end, so the "sink saved" is the genuine cohort-model
 * difference, not a per-hectare shortcut.
 */
export function programme(
  costPerHa: number,
  leverage: number,
  gFrom = 5,
  gTo = 0,
  p: Params = DEFAULTS
): ProgrammeResult {
  const pFrom: Params = { ...p, mode: 'growth', growthPct: gFrom };
  const pTo: Params = { ...p, mode: 'growth', growthPct: gTo };
  const avoided = Math.max(0, areaInYear(2040, pFrom) - areaInYear(2040, pTo));
  const treated = avoided * leverage;
  const costBn = (treated * costPerHa) / 1e9;
  const saved = excessImpact(2040, pFrom).total - excessImpact(2040, pTo).total;
  return {
    avoidedHa2040: avoided,
    treatedHa2040: treated,
    costBnYr: costBn,
    sinkSavedMt: saved,
    eurPerT: saved > 0 ? (costBn * 1e9) / (saved * 1e6) : 0,
    removalsCostBnYr: (saved * 1e6 * ENGINEERED_COST_EUR_T) / 1e9,
  };
}

export const DEFAULT_COST_PER_HA = 300;
export const DEFAULT_LEVERAGE = 10;

export type A3Summary = {
  lifecycleTco2: number;
  marginalEurPerT: number;
  cheaperBy: number;
  programmeEurPerT: number;
  programmeCostBn: number;
  programmeRemovalsBn: number;
};

export function summary(): A3Summary {
  const m = marginal(DEFAULT_COST_PER_HA, DEFAULT_LEVERAGE);
  const pr = programme(DEFAULT_COST_PER_HA, DEFAULT_LEVERAGE);
  return {
    lifecycleTco2: lifecycleTco2PerHa(),
    marginalEurPerT: m.eurPerT,
    cheaperBy: m.cheaperThanRemovalsBy,
    programmeEurPerT: pr.eurPerT,
    programmeCostBn: pr.costBnYr,
    programmeRemovalsBn: pr.removalsCostBnYr,
  };
}
