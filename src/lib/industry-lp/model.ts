/**
 * EU INDUSTRY DECARBONIZATION — LEAST-COST LP, ported to TypeScript so it can
 * run on demand, client-side, in the browser.
 *
 * This is a line-for-line semantic port of
 * `beta/modules/summer-prep/optimization/model/industry_optimization.jl`
 * (Julia/JuMP + HiGHS) — same decision variables (B = new build, K =
 * installed capacity, Q = production), same constraints, same CRF-annualized,
 * VINTAGE-COSTED capex (a unit built in year yb keeps paying yb's capex rate
 * for every year it survives — see section 4.11 below), same 7% discounting,
 * same "carbon price on direct CO2 only" rule. Read the Julia file's comments
 * for the full plain-language rationale of each constraint; this file's
 * comments point back to the matching Julia section rather than repeating
 * the explanation.
 *
 * Framework-free: no React, no DOM. `buildAndSolve()` is the single public
 * entry point a page (or a Web Worker, or a node test script) calls.
 */

import type { CellValue, InputSheet } from '../../data/summer-prep-optimization';
import { CAPEX_TRAJECTORY } from '../../data/summer-prep-capex-trajectory';
import { solveLP } from './solver';
import type {
  IndustryLpOverrides,
  IndustryLpResult,
  LPConstraint,
  LPProblem,
  LPTerm,
  SubsectorResult,
  TechYearResult,
} from './types';

export type { IndustryLpOverrides, IndustryLpResult } from './types';

/* ================================================================================================
 * 1. SETTINGS — mirrors the Julia file's "SETTINGS" block exactly.
 * ============================================================================================== */

export const MODEL_YEARS = [2025, 2030, 2035, 2040, 2045, 2050] as const;
const YEAR_STEP = 5;
const BASE_YEAR = 2025;
const DISCOUNT_RATE = 0.07;
const RETIREMENT_END_YEAR = 2045;

const CARRIERS = ['coal', 'coke', 'natural_gas', 'electricity', 'hydrogen', 'biomass', 'oil'] as const;
type Carrier = (typeof CARRIERS)[number];

/** Same fixed list as Julia's EXISTING_STOCK_TECHS — do not reorder/rename. */
export const EXISTING_STOCK_TECHS = [
  'steel_bfbof',
  'cement_ref',
  'hvc_ref',
  'ammonia_smr',
  'alu_ref',
  'alu_sec',
  'glass_ng',
  'paper_ref',
] as const;
const EXISTING_STOCK_SET = new Set<string>(EXISTING_STOCK_TECHS);

/** Same as Julia's SCRAP_LIMITED_TECHS dict: tech -> subsector whose scrap_share_max applies. */
const SCRAP_LIMITED_TECHS: Record<string, string> = {
  steel_scrap_eaf: 'steel',
  alu_sec: 'aluminium',
};

const EF_ALL_YEARS = -1;

/* ================================================================================================
 * 2. READ INPUTS — turns the site's INPUT_SHEETS workbook (typed cells, row-major) into the same
 * lookup dictionaries `read_inputs()` builds in Julia. Every non-trivial number here comes from
 * the sheet at runtime — nothing is hardcoded.
 * ============================================================================================== */

export type InputSheets = Record<string, InputSheet>;

function rowObjects(sheet: InputSheet): Record<string, CellValue>[] {
  return sheet.rows.map((row) => {
    const obj: Record<string, CellValue> = {};
    sheet.columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
}

function num(v: CellValue | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: CellValue | undefined): string {
  return v === undefined ? '' : String(v);
}

/** Parses an emission_factors.csv year cell: an integer year, or "all" (case-insensitive). */
function parseEfYear(v: CellValue): number {
  const s = String(v).trim().toLowerCase();
  return s === 'all' ? EF_ALL_YEARS : Number(v);
}

/** All model input data, in central (unscaled) form — the TS equivalent of Julia's `ModelData`. */
interface BaseData {
  subsectors: string[];
  techs: string[];
  subsectorOf: Record<string, string>;
  /** key: `${tech}|${year}` -> EUR/t capacity (vintage costing — replaces a single-year capex). */
  capexTrajectory: Record<string, number>;
  fixedOpex: Record<string, number>;
  varOpex: Record<string, number>;
  lifetime: Record<string, number>;
  availableFrom: Record<string, number>;
  maxBuildShare: Record<string, number>;
  captureRate: Record<string, number>;
  processCo2: Record<string, number>;
  /** key: `${tech}|${carrier}` -> GJ/t. Missing combos are implicitly 0 (matches Julia's `get(..., 0.0)`). */
  energy: Record<string, number>;
  /** key: `${subsector}|${year}` -> Mt */
  demand: Record<string, number>;
  /** key: `${carrier}|${year}` -> EUR/GJ */
  fuelPrice: Record<string, number>;
  /** key: `${carrier}|${year|EF_ALL_YEARS}` -> tCO2/GJ */
  ef: Record<string, number>;
  carbonPriceLow: Record<number, number>;
  carbonPriceCentral: Record<number, number>;
  carbonPriceHigh: Record<number, number>;
  /** key: `${subsector}|${year}` -> share (0-1) */
  scrapShareMax: Record<string, number>;
  biomassPjMax: Record<number, number>;
  ccsMtMax: Record<number, number>;
  existingShare2025: Record<string, number>;
}

function energyKey(tech: string, carrier: string): string {
  return `${tech}|${carrier}`;
}
function yearKey(a: string, y: number): string {
  return `${a}|${y}`;
}

function parseBaseData(sheets: InputSheets): BaseData {
  const sectors = rowObjects(sheets.sectors);
  const subsectors = sectors.map((r) => str(r.subsector));

  const techRows = rowObjects(sheets.technologies);
  const techs = techRows.map((r) => str(r.tech));
  const subsectorOf: Record<string, string> = {};
  const fixedOpex: Record<string, number> = {};
  const varOpex: Record<string, number> = {};
  const lifetime: Record<string, number> = {};
  const availableFrom: Record<string, number> = {};
  const maxBuildShare: Record<string, number> = {};
  const captureRate: Record<string, number> = {};
  const processCo2: Record<string, number> = {};
  for (const r of techRows) {
    const t = str(r.tech);
    subsectorOf[t] = str(r.subsector);
    // NOTE: the technologies sheet's own capex_eur_t is no longer read here — it is superseded
    // by CAPEX_TRAJECTORY (below), whose 2025 value equals this column by construction.
    fixedOpex[t] = num(r.fixed_opex_eur_t);
    varOpex[t] = num(r.var_opex_eur_t);
    lifetime[t] = num(r.lifetime_yr);
    availableFrom[t] = Math.round(num(r.available_from));
    maxBuildShare[t] = num(r.max_build_share);
    captureRate[t] = num(r.capture_rate);
    processCo2[t] = num(r.process_co2_t_t);
  }
  for (const t of EXISTING_STOCK_TECHS) {
    if (!techs.includes(t)) {
      throw new Error(`Expected existing-stock technology '${t}' not found in the technologies sheet.`);
    }
  }

  const energy: Record<string, number> = {};
  for (const r of rowObjects(sheets.energy_use)) {
    energy[energyKey(str(r.tech), str(r.carrier))] = num(r.gj_per_t);
  }

  const demand: Record<string, number> = {};
  for (const r of rowObjects(sheets.demand)) {
    demand[yearKey(str(r.subsector), num(r.year))] = num(r.demand_mt);
  }
  for (const s of subsectors) {
    for (const y of MODEL_YEARS) {
      if (!(yearKey(s, y) in demand)) throw new Error(`demand sheet missing subsector='${s}', year=${y}.`);
    }
  }

  const fuelPrice: Record<string, number> = {};
  for (const r of rowObjects(sheets.fuel_prices)) {
    fuelPrice[yearKey(str(r.carrier), num(r.year))] = num(r.price_eur_gj);
  }
  for (const c of CARRIERS) {
    for (const y of MODEL_YEARS) {
      if (!(yearKey(c, y) in fuelPrice)) throw new Error(`fuel_prices sheet missing carrier='${c}', year=${y}.`);
    }
  }

  const carbonPriceLow: Record<number, number> = {};
  const carbonPriceCentral: Record<number, number> = {};
  const carbonPriceHigh: Record<number, number> = {};
  for (const r of rowObjects(sheets.carbon_price)) {
    const y = num(r.year);
    carbonPriceLow[y] = num(r.price_low);
    carbonPriceCentral[y] = num(r.price_central);
    carbonPriceHigh[y] = num(r.price_high);
  }
  for (const y of MODEL_YEARS) {
    if (!(y in carbonPriceCentral)) throw new Error(`carbon_price sheet missing year=${y}.`);
  }

  const ef: Record<string, number> = {};
  for (const r of rowObjects(sheets.emission_factors)) {
    ef[yearKey(str(r.carrier), parseEfYear(r.year))] = num(r.tco2_per_gj);
  }

  const scrapShareMax: Record<string, number> = {};
  const biomassPjMax: Record<number, number> = {};
  const ccsMtMax: Record<number, number> = {};
  for (const r of rowObjects(sheets.constraints)) {
    const name = str(r.name);
    const y = num(r.year);
    const v = num(r.value);
    if (name === 'scrap_share_max') scrapShareMax[yearKey(str(r.subsector), y)] = v;
    else if (name === 'biomass_pj_max') biomassPjMax[y] = v;
    else if (name === 'ccs_mt_max') ccsMtMax[y] = v;
  }
  for (const y of MODEL_YEARS) {
    if (!(y in biomassPjMax)) throw new Error(`constraints sheet missing biomass_pj_max for year=${y}.`);
    if (!(y in ccsMtMax)) throw new Error(`constraints sheet missing ccs_mt_max for year=${y}.`);
  }
  for (const t of Object.keys(SCRAP_LIMITED_TECHS)) {
    if (!techs.includes(t)) continue;
    const s = SCRAP_LIMITED_TECHS[t];
    for (const y of MODEL_YEARS) {
      if (!(yearKey(s, y) in scrapShareMax)) {
        throw new Error(`constraints sheet missing scrap_share_max for subsector='${s}', year=${y} (needed for '${t}').`);
      }
    }
  }

  const aluScrap2025 = scrapShareMax[yearKey('aluminium', BASE_YEAR)];
  if (aluScrap2025 === undefined) {
    throw new Error(`constraints sheet needs scrap_share_max for subsector='aluminium', year=${BASE_YEAR}.`);
  }
  const existingShare2025: Record<string, number> = {};
  for (const t of EXISTING_STOCK_TECHS) existingShare2025[t] = 1.0;
  existingShare2025['alu_ref'] = 1.0 - aluScrap2025;
  existingShare2025['alu_sec'] = aluScrap2025;

  // Time-dependent (vintage) capex: every technology must have a value for every model year in
  // CAPEX_TRAJECTORY (generated straight from capex_trajectory.csv — see that file's header for
  // the generator). Fail loudly rather than silently defaulting, matching the Julia reference.
  const capexTrajectory: Record<string, number> = { ...CAPEX_TRAJECTORY };
  for (const t of techs) {
    for (const y of MODEL_YEARS) {
      if (!(yearKey(t, y) in capexTrajectory)) {
        throw new Error(`capex trajectory is missing tech='${t}', year=${y}.`);
      }
    }
  }

  return {
    subsectors,
    techs,
    subsectorOf,
    capexTrajectory,
    fixedOpex,
    varOpex,
    lifetime,
    availableFrom,
    maxBuildShare,
    captureRate,
    processCo2,
    energy,
    demand,
    fuelPrice,
    ef,
    carbonPriceLow,
    carbonPriceCentral,
    carbonPriceHigh,
    scrapShareMax,
    biomassPjMax,
    ccsMtMax,
    existingShare2025,
  };
}

/* ================================================================================================
 * 3. OVERRIDES — the TS equivalent of Julia's `apply_scenario_row!` / `build_scenario_data`.
 * Every override is a scale factor (default 1) applied on top of a fresh copy of the base data,
 * so repeated calls (e.g. from a slider) never accumulate state.
 * ============================================================================================== */

interface Data extends BaseData {
  carbonPriceChoice: 'low' | 'central' | 'high';
  carbonScale: number;
}

function applyOverrides(base: BaseData, overrides: IndustryLpOverrides): Data {
  const capexTrajectory = { ...base.capexTrajectory };
  const energy = { ...base.energy };
  const demand = { ...base.demand };
  const fuelPrice = { ...base.fuelPrice };
  const maxBuildShare = { ...base.maxBuildShare };
  const biomassPjMax = { ...base.biomassPjMax };

  // capex_clean: a LEVEL SHIFT of the whole capex trajectory (every model year scaled by the
  // same factor, including its 2025 anchor) for non-reference technologies only.
  const capexCleanScale = overrides.capexCleanScale ?? 1;
  if (capexCleanScale !== 1) {
    for (const t of base.techs) {
      if (EXISTING_STOCK_SET.has(t)) continue;
      for (const y of MODEL_YEARS) {
        const k = yearKey(t, y);
        capexTrajectory[k] = base.capexTrajectory[k] * capexCleanScale;
      }
    }
  }

  // learning_rate: reshapes each non-reference technology's OWN trajectory around its fixed 2025
  // anchor by raising the (year/2025) cost ratio to the power `learningRateScale` — see the
  // doc comment on IndustryLpOverrides.learningRateScale. Order-independent versus capex_clean
  // (a uniform level shift cancels out of the ratio), so it is safe to apply after it.
  const learningRateScale = overrides.learningRateScale ?? 1;
  if (learningRateScale !== 1) {
    for (const t of base.techs) {
      if (EXISTING_STOCK_SET.has(t)) continue;
      const base2025 = capexTrajectory[yearKey(t, BASE_YEAR)];
      for (const y of MODEL_YEARS) {
        const k = yearKey(t, y);
        const ratio = base2025 !== 0 ? capexTrajectory[k] / base2025 : 1;
        capexTrajectory[k] = base2025 * Math.pow(ratio, learningRateScale);
      }
    }
  }

  const energyIntensityCleanScale = overrides.energyIntensityCleanScale ?? 1;
  if (energyIntensityCleanScale !== 1) {
    for (const t of base.techs) {
      if (EXISTING_STOCK_SET.has(t)) continue;
      for (const c of CARRIERS) {
        const k = energyKey(t, c);
        if (k in base.energy) energy[k] = base.energy[k] * energyIntensityCleanScale;
      }
    }
  }

  const demandScale = overrides.demandScale ?? 1;
  if (demandScale !== 1) {
    for (const k of Object.keys(demand)) demand[k] = base.demand[k] * demandScale;
  }

  const elecPriceScale = overrides.elecPriceScale ?? 1;
  const h2PriceScale = overrides.h2PriceScale ?? 1;
  for (const y of MODEL_YEARS) {
    if (elecPriceScale !== 1) {
      const k = yearKey('electricity', y);
      if (k in fuelPrice) fuelPrice[k] = base.fuelPrice[k] * elecPriceScale;
    }
    if (h2PriceScale !== 1) {
      const k = yearKey('hydrogen', y);
      if (k in fuelPrice) fuelPrice[k] = base.fuelPrice[k] * h2PriceScale;
    }
  }

  const buildRateScale = overrides.buildRateScale ?? 1;
  if (buildRateScale !== 1) {
    for (const t of base.techs) maxBuildShare[t] = base.maxBuildShare[t] * buildRateScale;
  }

  const biomassCeilingScale = overrides.biomassCeilingScale ?? 1;
  if (biomassCeilingScale !== 1) {
    for (const y of MODEL_YEARS) {
      if (y in biomassPjMax) biomassPjMax[y] = base.biomassPjMax[y] * biomassCeilingScale;
    }
  }

  // Re-derive existing_share_2025 / k_exist inputs from the (possibly demand-scaled) 2025 demand —
  // matches Julia, where k_exist() reads data.demand at BASE_YEAR *after* the demand scenario has
  // already mutated it.
  return {
    ...base,
    capexTrajectory,
    energy,
    demand,
    fuelPrice,
    maxBuildShare,
    biomassPjMax,
    carbonPriceChoice: overrides.carbonPricePath ?? 'central',
    carbonScale: overrides.carbonScale ?? 1,
  };
}

/* ================================================================================================
 * 4. HELPERS — crf, discounting, existing-stock decay, lookups. Mirror Julia 1:1.
 * ============================================================================================== */

function crf(r: number, lifetimeYears: number): number {
  if (lifetimeYears <= 0) throw new Error('Technology lifetime must be positive to annualise capex.');
  const f = Math.pow(1 + r, lifetimeYears);
  return (r * f) / (f - 1);
}

function discountFactor(y: number): number {
  return 1 / Math.pow(1 + DISCOUNT_RATE, y - BASE_YEAR);
}

/** Exogenous existing-stock capacity (Mt) of tech `t` in year `y` — linear decay to 0 by 2045. */
function kExist(data: Data, t: string, y: number): number {
  if (!EXISTING_STOCK_SET.has(t)) return 0;
  const s = data.subsectorOf[t];
  const base2025 = data.existingShare2025[t] * data.demand[yearKey(s, BASE_YEAR)];
  const remainingShare = Math.max(0, 1 - (y - BASE_YEAR) / (RETIREMENT_END_YEAR - BASE_YEAR));
  return base2025 * remainingShare;
}

/** Vintage capex lookup (EUR/t capacity) for tech `t` in build-year `y` — errors loudly if the
 * trajectory has no entry, mirroring Julia's own KeyError-avoiding style. */
function capexTrajLookup(data: Data, t: string, y: number): number {
  const k = yearKey(t, y);
  const v = data.capexTrajectory[k];
  if (v === undefined) throw new Error(`capex trajectory has no value for tech='${t}', year=${y}.`);
  return v;
}

function efLookup(data: Data, carrier: string, y: number): number {
  const specific = yearKey(carrier, y);
  if (specific in data.ef) return data.ef[specific];
  const allYears = yearKey(carrier, EF_ALL_YEARS);
  if (allYears in data.ef) return data.ef[allYears];
  throw new Error(`emission_factors sheet has no factor for carrier='${carrier}', year=${y}, and no 'all' fallback.`);
}

function fuelPriceLookup(data: Data, carrier: string, y: number): number {
  const k = yearKey(carrier, y);
  if (k in data.fuelPrice) return data.fuelPrice[k];
  throw new Error(`fuel_prices sheet has no price for carrier='${carrier}', year=${y}.`);
}

function activeCarbonPrice(data: Data, y: number): number {
  const table = data.carbonPriceChoice === 'low' ? data.carbonPriceLow : data.carbonPriceChoice === 'high' ? data.carbonPriceHigh : data.carbonPriceCentral;
  return table[y] * data.carbonScale;
}

function getEnergy(data: Data, t: string, c: string): number {
  return data.energy[energyKey(t, c)] ?? 0;
}

/** Per-Mt-produced CO2 BEFORE capture: fossil combustion (all carriers except electricity) + process CO2. */
function preCaptureCoef(data: Data, t: string, y: number): number {
  let s = 0;
  for (const c of CARRIERS) {
    if (c === 'electricity') continue;
    s += getEnergy(data, t, c) * efLookup(data, c, y);
  }
  return s + data.processCo2[t];
}

/* ================================================================================================
 * 5. BUILD LP — the TS equivalent of Julia's `build_model`. Variables: B[t,y], K[t,y], Q[t,y].
 * ============================================================================================== */

function bName(t: string, y: number): string {
  return `B_${t}_${y}`;
}
function kName(t: string, y: number): string {
  return `K_${t}_${y}`;
}
function qName(t: string, y: number): string {
  return `Q_${t}_${y}`;
}

interface BuiltProblem {
  problem: LPProblem;
  data: Data;
}

function buildLpProblem(data: Data): BuiltProblem {
  const Y = MODEL_YEARS;
  const techs = data.techs;

  const variables: string[] = [];
  const objective: LPTerm[] = [];
  const constraints: LPConstraint[] = [];
  const fixedZero: string[] = [];

  for (const t of techs) {
    for (const y of Y) {
      variables.push(bName(t, y), kName(t, y), qName(t, y));
    }
  }

  // --- 4.2 Availability: B[t,y] = 0 if y < available_from[t] ------------------------------------
  for (const t of techs) {
    for (const y of Y) {
      if (y < data.availableFrom[t]) fixedZero.push(bName(t, y));
    }
  }

  // --- 4.3 Build-rate ceiling: B[t,y] <= max_build_share[t] * demand[subsector,y] ---------------
  for (const t of techs) {
    const s = data.subsectorOf[t];
    for (const y of Y) {
      constraints.push({
        name: `buildrate_${t}_${y}`,
        terms: [{ coef: 1, v: bName(t, y) }],
        sense: '<=',
        rhs: data.maxBuildShare[t] * data.demand[yearKey(s, y)],
      });
    }
  }

  // --- 4.4 Capacity accounting: K[t,y] = k_exist(t,y) + sum(B[t,yb] : yb<=y, y-yb<lifetime[t]) --
  for (const t of techs) {
    for (const y of Y) {
      const terms: LPTerm[] = [{ coef: 1, v: kName(t, y) }];
      for (const yb of Y) {
        if (yb <= y && y - yb < data.lifetime[t]) terms.push({ coef: -1, v: bName(t, yb) });
      }
      constraints.push({ name: `capacity_${t}_${y}`, terms, sense: '=', rhs: kExist(data, t, y) });
    }
  }

  // --- 4.5 Capacity adequacy: Q[t,y] <= K[t,y] ---------------------------------------------------
  for (const t of techs) {
    for (const y of Y) {
      constraints.push({
        name: `adequacy_${t}_${y}`,
        terms: [
          { coef: 1, v: qName(t, y) },
          { coef: -1, v: kName(t, y) },
        ],
        sense: '<=',
        rhs: 0,
      });
    }
  }

  // --- 4.6 Demand balance: sum(Q[t,y] : subsector_of[t]==s) == demand[s,y] ----------------------
  for (const s of data.subsectors) {
    for (const y of Y) {
      const terms = techs.filter((t) => data.subsectorOf[t] === s).map((t) => ({ coef: 1, v: qName(t, y) }));
      constraints.push({ name: `demand_${s}_${y}`, terms, sense: '=', rhs: data.demand[yearKey(s, y)] });
    }
  }

  // --- 4.7 Scrap / recycling availability --------------------------------------------------------
  for (const [t, s] of Object.entries(SCRAP_LIMITED_TECHS)) {
    if (!techs.includes(t)) continue;
    for (const y of Y) {
      constraints.push({
        name: `scrap_${t}_${y}`,
        terms: [{ coef: 1, v: qName(t, y) }],
        sense: '<=',
        rhs: data.scrapShareMax[yearKey(s, y)] * data.demand[yearKey(s, y)],
      });
    }
  }

  // --- 4.9 Biomass ceiling: sum(Q[t,y]*energy[t,biomass]) <= biomass_pj_max[y] ------------------
  // Units: Q is Mt product and intensity GJ/t, so Q*intensity is numerically PJ (Mt*GJ/t = 1 PJ),
  // the same unit as biomass_pj_max — no conversion factor.
  for (const y of Y) {
    const terms = techs
      .map((t) => ({ coef: getEnergy(data, t, 'biomass'), v: qName(t, y) }))
      .filter((term) => term.coef !== 0);
    if (terms.length > 0) {
      constraints.push({ name: `biomass_${y}`, terms, sense: '<=', rhs: data.biomassPjMax[y] });
    }
  }

  // --- 4.10 CO2 capture & storage ceiling: sum(Captured[t,y]) <= ccs_mt_max[y] --------------------
  for (const y of Y) {
    const terms = techs
      .map((t) => ({ coef: data.captureRate[t] * preCaptureCoef(data, t, y), v: qName(t, y) }))
      .filter((term) => term.coef !== 0);
    if (terms.length > 0) {
      constraints.push({ name: `ccs_${y}`, terms, sense: '<=', rhs: data.ccsMtMax[y] });
    }
  }

  // --- 4.11 Objective: discounted sum of vintage-costed capex + fixed/var OPEX + energy + carbon -
  // VINTAGE CAPEX COSTING (mirrors Julia's CapexTerm, same section): a unit built in year yb pays
  // its build-year capex rate for every year it survives. Instead of a coefficient on K[t,y] (the
  // pre-vintage-costing shape), each build-vintage variable B[t,yb] gets a coefficient equal to
  // crf(lifetime[t]) * capexTraj(t,yb) * (discounted YEAR_STEP summed over every y that vintage
  // survives). Existing (pre-2025) stock is not a decision variable, so its capex — always costed
  // at the fixed 2025 trajectory anchor — is a genuine CONSTANT term. This mini-LP's text format
  // has no native "constant in the objective" syntax, so the constant is carried by a helper
  // variable (CONST_ONE) pinned to exactly 1 via an equality constraint — the LP-native equivalent
  // of the plain constant JuMP adds directly into the objective on the Julia side.
  const CONST_ONE = 'CONST_ONE';
  variables.push(CONST_ONE);
  constraints.push({ name: 'const_one', terms: [{ coef: 1, v: CONST_ONE }], sense: '=', rhs: 1 });
  let constOffset = 0;
  for (const t of techs) {
    for (const y of Y) {
      constOffset +=
        discountFactor(y) *
        YEAR_STEP *
        crf(DISCOUNT_RATE, data.lifetime[t]) *
        capexTrajLookup(data, t, BASE_YEAR) *
        kExist(data, t, y);
    }
  }
  if (constOffset !== 0) objective.push({ coef: constOffset, v: CONST_ONE });

  for (const t of techs) {
    for (const yb of Y) {
      let survivalDisc = 0;
      for (const y of Y) {
        if (y >= yb && y - yb < data.lifetime[t]) survivalDisc += discountFactor(y) * YEAR_STEP;
      }
      const bCoef = crf(DISCOUNT_RATE, data.lifetime[t]) * capexTrajLookup(data, t, yb) * survivalDisc;
      if (bCoef !== 0) objective.push({ coef: bCoef, v: bName(t, yb) });
    }
  }

  for (const t of techs) {
    for (const y of Y) {
      const disc = discountFactor(y) * YEAR_STEP;
      const kCoef = data.fixedOpex[t];
      const energyCostPerT = CARRIERS.reduce((s, c) => s + getEnergy(data, t, c) * fuelPriceLookup(data, c, y), 0);
      const directCoef = (1 - data.captureRate[t]) * preCaptureCoef(data, t, y);
      const qCoef = data.varOpex[t] + energyCostPerT + activeCarbonPrice(data, y) * directCoef;
      if (disc * kCoef !== 0) objective.push({ coef: disc * kCoef, v: kName(t, y) });
      if (disc * qCoef !== 0) objective.push({ coef: disc * qCoef, v: qName(t, y) });
    }
  }

  return { problem: { variables, objective, constraints, fixedZero }, data };
}

/* ================================================================================================
 * 6. EXTRACT RESULTS — the TS equivalent of `extract_results` + `build_scenario_summary`.
 * ============================================================================================== */

/** Per-(tech,year) vintage-costed annualised capex (M EUR), matching CapexTerm[t,y] on the Julia
 * side: annualised(capex(t,2025)) x surviving existing stock, plus annualised(capex(t,yb)) x
 * surviving build B[t,yb] for every past vintage yb<=y. */
function capexTermForYear(data: Data, get: (name: string) => number, t: string, y: number): number {
  let sum = capexTrajLookup(data, t, BASE_YEAR) * kExist(data, t, y);
  for (const yb of MODEL_YEARS) {
    if (yb <= y && y - yb < data.lifetime[t]) sum += capexTrajLookup(data, t, yb) * get(bName(t, yb));
  }
  return crf(DISCOUNT_RATE, data.lifetime[t]) * sum;
}

function extractResults(data: Data, values: Record<string, number>, objective: number): {
  rows: TechYearResult[];
  co2ByYear: Record<string, number>;
  indirectCo2ByYear: Record<string, number>;
  biomassPjByYear: Record<string, number>;
  biomassCeilingPjByYear: Record<string, number>;
  bySubsector: Record<string, SubsectorResult>;
  totalDiscountedCostBeur: number;
} {
  const rows: TechYearResult[] = [];
  const get = (name: string) => values[name] ?? 0;

  for (const t of data.techs) {
    const s = data.subsectorOf[t];
    for (const y of MODEL_YEARS) {
      const Q = get(qName(t, y));
      const K = get(kName(t, y));
      const B = get(bName(t, y));
      const preCapture = Q * preCaptureCoef(data, t, y);
      const directCo2 = (1 - data.captureRate[t]) * preCapture;
      const indirectCo2 = Q * getEnergy(data, t, 'electricity') * efLookup(data, 'electricity', y);
      const biomassPj = Q * getEnergy(data, t, 'biomass');
      const energyCost = Q * CARRIERS.reduce((sum, c) => sum + getEnergy(data, t, c) * fuelPriceLookup(data, c, y), 0);
      const cost =
        capexTermForYear(data, get, t, y) +
        data.fixedOpex[t] * K +
        data.varOpex[t] * Q +
        energyCost +
        activeCarbonPrice(data, y) * directCo2;
      rows.push({
        tech: t,
        subsector: s,
        year: y,
        production_mt: Q,
        capacity_mt: K,
        new_build_mt: B,
        direct_co2_mt: directCo2,
        indirect_co2_mt: indirectCo2,
        cost_meur: cost,
        biomass_pj: biomassPj,
      });
    }
  }

  const co2ByYear: Record<string, number> = {};
  const indirectCo2ByYear: Record<string, number> = {};
  const biomassPjByYear: Record<string, number> = {};
  const biomassCeilingPjByYear: Record<string, number> = {};
  for (const y of MODEL_YEARS) {
    co2ByYear[String(y)] = rows.filter((r) => r.year === y).reduce((s, r) => s + r.direct_co2_mt, 0);
    indirectCo2ByYear[String(y)] = rows.filter((r) => r.year === y).reduce((s, r) => s + r.indirect_co2_mt, 0);
    biomassPjByYear[String(y)] = rows.filter((r) => r.year === y).reduce((s, r) => s + r.biomass_pj, 0);
    biomassCeilingPjByYear[String(y)] = data.biomassPjMax[y];
  }

  const bySubsector: Record<string, SubsectorResult> = {};
  for (const s of data.subsectors) {
    const sub = rows.filter((r) => r.subsector === s);
    const co2_2050 = sub.filter((r) => r.year === 2050).reduce((sum, r) => sum + r.direct_co2_mt, 0);

    const rows2040 = sub.filter((r) => r.year === 2040);
    let dominant_tech_2040 = '';
    if (rows2040.length > 0) {
      dominant_tech_2040 = rows2040.reduce((best, r) => (r.production_mt > best.production_mt ? r : best)).tech;
    }

    const tech_shares: Record<string, Record<string, number>> = {};
    for (const y of MODEL_YEARS) {
      const suby = sub.filter((r) => r.year === y);
      const total = suby.reduce((sum, r) => sum + r.production_mt, 0);
      const shares: Record<string, number> = {};
      for (const r of suby) {
        shares[r.tech] = total > 1e-9 ? r.production_mt / total : 0;
      }
      tech_shares[String(y)] = shares;
    }

    const biomass_pj_by_year: Record<string, number> = {};
    for (const y of MODEL_YEARS) {
      biomass_pj_by_year[String(y)] = sub.filter((r) => r.year === y).reduce((sum, r) => sum + r.biomass_pj, 0);
    }

    bySubsector[s] = { co2_2050_mt: co2_2050, dominant_tech_2040, tech_shares, biomass_pj_by_year };
  }

  return {
    rows,
    co2ByYear,
    indirectCo2ByYear,
    biomassPjByYear,
    biomassCeilingPjByYear,
    bySubsector,
    totalDiscountedCostBeur: objective / 1000.0,
  };
}

/**
 * Maps one of the built-in scenarios' (knob, factor) pair — as stored in
 * `SCENARIO_META` in the data file — onto the equivalent `IndustryLpOverrides`. Exposed so the
 * page's preset dropdown can reuse the exact same semantics as the parity test / Julia scenarios
 * instead of re-deriving them.
 */
export function overridesFromScenarioMeta(knob: string, factor: number): IndustryLpOverrides {
  switch (knob) {
    case 'none':
      return {};
    case 'carbon_price_low':
      return { carbonPricePath: 'low' };
    case 'carbon_price_high':
      return { carbonPricePath: 'high' };
    case 'capex_clean':
      return { capexCleanScale: factor };
    case 'demand':
      return { demandScale: factor };
    case 'elec_price':
      return { elecPriceScale: factor };
    case 'h2_price':
      return { h2PriceScale: factor };
    case 'energy_intensity_clean':
      return { energyIntensityCleanScale: factor };
    case 'learning_rate':
      return { learningRateScale: factor };
    case 'max_build_share':
      return { buildRateScale: factor };
    default:
      return {};
  }
}

/** The "central" override set — every scale at 1, carbon path central. Used by the page's Reset button. */
export const CENTRAL_OVERRIDES: Required<IndustryLpOverrides> = {
  carbonPricePath: 'central',
  carbonScale: 1,
  capexCleanScale: 1,
  demandScale: 1,
  elecPriceScale: 1,
  h2PriceScale: 1,
  energyIntensityCleanScale: 1,
  learningRateScale: 1,
  buildRateScale: 1,
  biomassCeilingScale: 1,
};

/* ================================================================================================
 * 7. PUBLIC ENTRY POINT
 * ============================================================================================== */

/**
 * Build the joint LP for all 7 subsectors / 25 technologies / 6 years from the site's input
 * workbook, apply the given sensitivity overrides, solve it, and return a fully extracted result.
 * Pure function of (inputSheets, overrides) — safe to call repeatedly (e.g. on every slider tick).
 */
export async function buildAndSolve(inputSheets: InputSheets, overrides: IndustryLpOverrides = {}): Promise<IndustryLpResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const base = parseBaseData(inputSheets);
  const data = applyOverrides(base, overrides);
  const { problem } = buildLpProblem(data);

  const outcome = await solveLP(problem);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const solveTimeMs = t1 - t0;

  if (outcome.status !== 'optimal') {
    return {
      status: outcome.status,
      message:
        outcome.message ??
        (outcome.status === 'infeasible'
          ? 'Demand cannot be met under these build-rate/scrap/CCS limits — relax a constraint.'
          : 'The solver failed to return a result.'),
      solverName: outcome.solverName,
      solveTimeMs,
    };
  }

  const extracted = extractResults(data, outcome.values, outcome.objective);
  return {
    status: 'optimal',
    solverName: outcome.solverName,
    solveTimeMs,
    objectiveValueMeur: outcome.objective,
    totalDiscountedCostBeur: extracted.totalDiscountedCostBeur,
    co2ByYear: extracted.co2ByYear,
    indirectCo2ByYear: extracted.indirectCo2ByYear,
    biomassPjByYear: extracted.biomassPjByYear,
    biomassCeilingPjByYear: extracted.biomassCeilingPjByYear,
    bySubsector: extracted.bySubsector,
    rows: extracted.rows,
  };
}
