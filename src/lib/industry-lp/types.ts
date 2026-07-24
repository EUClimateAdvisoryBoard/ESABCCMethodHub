/**
 * Shared types for the in-browser EU industry least-cost LP port.
 *
 * This mirrors (in TypeScript, solver-agnostic form) the Julia/JuMP model at
 * `beta/modules/summer-prep/optimization/model/industry_optimization.jl`.
 * Nothing in this file touches React, the DOM, or a specific solver — it is
 * pure data shape.
 */

/** A generic solver-agnostic linear term: `coef * <variable name>`. */
export interface LPTerm {
  coef: number;
  v: string;
}

export type LPSense = '<=' | '>=' | '=';

export interface LPConstraint {
  name: string;
  terms: LPTerm[];
  sense: LPSense;
  rhs: number;
}

/**
 * A fully-specified LP in solver-agnostic form: minimize `objective` subject
 * to `constraints`, with every variable in `variables` implicitly bounded
 * `>= 0` except those listed in `fixedZero` (bounded `== 0`, used to enforce
 * "cannot build before commercial availability").
 */
export interface LPProblem {
  variables: string[];
  objective: LPTerm[];
  constraints: LPConstraint[];
  fixedZero: string[];
}

export type SolveStatus = 'optimal' | 'infeasible' | 'error';

export interface SolveOutcome {
  status: SolveStatus;
  objective: number;
  /** variable name -> solved value (primal). Empty if not optimal. */
  values: Record<string, number>;
  message?: string;
  solverName: 'highs-wasm' | 'javascript-lp-solver';
}

export type CarbonPricePath = 'low' | 'central' | 'high';

/** UI-facing sensitivity overrides. All scale factors default to 1. */
export interface IndustryLpOverrides {
  carbonPricePath?: CarbonPricePath;
  /** Multiplies the selected carbon price path (0.5-2.0 typical UI range). */
  carbonScale?: number;
  /** Multiplies CAPEX of every technology NOT in EXISTING_STOCK_TECHS. */
  capexCleanScale?: number;
  /** Multiplies demand in every subsector/year. */
  demandScale?: number;
  /** Multiplies the electricity fuel price in every year. */
  elecPriceScale?: number;
  /** Multiplies the hydrogen fuel price in every year. */
  h2PriceScale?: number;
  /** Multiplies energy intensity (GJ/t, every carrier) of non-reference technologies. */
  energyIntensityCleanScale?: number;
  /** Multiplies max_build_share of every technology. */
  buildRateScale?: number;
}

/** Per-technology, per-year extracted results (the LP's decision variables + derived quantities). */
export interface TechYearResult {
  tech: string;
  subsector: string;
  year: number;
  production_mt: number;
  capacity_mt: number;
  new_build_mt: number;
  direct_co2_mt: number;
  indirect_co2_mt: number;
  cost_meur: number;
}

export interface SubsectorResult {
  co2_2050_mt: number;
  dominant_tech_2040: string;
  /** year (string) -> tech id -> production share (0-1) */
  tech_shares: Record<string, Record<string, number>>;
}

export interface IndustryLpResult {
  status: SolveStatus;
  message?: string;
  solverName: SolveOutcome['solverName'];
  solveTimeMs: number;
  /** Present only when status === 'optimal'. */
  objectiveValueMeur?: number;
  totalDiscountedCostBeur?: number;
  /** year (string) -> total EU-27 direct CO2, Mt */
  co2ByYear?: Record<string, number>;
  /** year (string) -> total EU-27 indirect (electricity) CO2, Mt */
  indirectCo2ByYear?: Record<string, number>;
  bySubsector?: Record<string, SubsectorResult>;
  /** Full per-tech/year table, for charts that need more detail than the summary. */
  rows?: TechYearResult[];
}
