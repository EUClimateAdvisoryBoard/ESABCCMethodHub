/**
 * TIMES.jl demo runner (beta module M · 56) — result types and aggregation.
 *
 * The page reads public/data/times-jl/demo12-results.json, written by
 * scripts/times-jl/run-demo12.jl from an actual TIMES.jl run of the open
 * TIMES_Demo demo12 model. This file only types and sums those rows; it
 * computes no model result of its own. Every value it returns is a sum of
 * solver output rows, and a series that is absent from the file is reported
 * as absent (see `checkResults`), never as zero.
 */

export type Region = 'REG1' | 'REG2';
export const REGIONS: readonly Region[] = ['REG1', 'REG2'];
export const REGION_FILTERS = ['all', 'REG1', 'REG2'] as const;
export type RegionFilter = (typeof REGION_FILTERS)[number];

export type Row = { region: string; year: string; value: number };
export type FuelRow = Row & { fuel: string };
export type SectorRow = Row & { sector: string };

export type Demo12Results = {
  generated: string;
  generator: string;
  model: { name: string; source: string; regions: string[]; milestone_years: string[]; note: string };
  software: { julia: string; timesjl_commit: string; times_gams_source: string; solver: string };
  run: {
    reused_existing_output: boolean;
    status?: string;
    termination_status?: string;
    wall_time_s_total_first_run?: number;
    rows?: number;
    columns?: number;
    threads?: number;
  };
  parity: {
    objective_timesjl: number;
    objective_gams_reference: number;
    relative_difference: number;
    rows_gams_reference: number;
    columns_gams_reference: number;
    reference_source: string;
  };
  units: { generation: string; new_capacity: string; co2: string; objective: string };
  process_descriptions: Record<string, string>;
  generation_by_fuel: FuelRow[];
  new_capacity_by_fuel: FuelRow[];
  co2_by_sector: SectorRow[];
  objective_components: { region: string; component: string; currency: string; value: number }[];
};

/** Fuel labels for the demo12 power-plant input commodities (ELC + fuel). */
export const FUEL_LABEL: Record<string, string> = {
  COA: 'Coal',
  GAS: 'Natural gas',
  OIL: 'Oil',
  NUC: 'Nuclear',
  HYD: 'Hydro',
  WIN: 'Wind',
  SOL: 'Solar',
  BIO: 'Biomass',
};
export const FUEL_ORDER = ['COA', 'OIL', 'GAS', 'NUC', 'BIO', 'HYD', 'WIN', 'SOL'];

/** Sector labels for the demo12 sectoral CO2 commodities (sector + CO2). */
export const SECTOR_LABEL: Record<string, string> = {
  ELC: 'Power',
  IND: 'Industry',
  TRA: 'Transport',
  RSD: 'Residential',
  COM: 'Commercial',
  AGR: 'Agriculture',
};
export const SECTOR_ORDER = ['ELC', 'IND', 'TRA', 'RSD', 'COM', 'AGR'];

/** TIMES objective components (VAR_OBJ index OBV). */
export const OBJ_LABEL: Record<string, string> = {
  OBJINV: 'Investment',
  OBJFIX: 'Fixed O&M',
  OBJVAR: 'Variable costs',
  OBJSAL: 'Salvage value (credited)',
};

const inRegion = (r: Row, f: RegionFilter) => f === 'all' || r.region === f;

/** year → key → summed value, for the chosen region filter. */
export function pivot<T extends Row>(rows: T[], key: (r: T) => string, f: RegionFilter): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!inRegion(r, f)) continue;
    const y = out.get(r.year) ?? new Map<string, number>();
    const k = key(r);
    y.set(k, (y.get(k) ?? 0) + r.value);
    out.set(r.year, y);
  }
  return out;
}

export function total(m: Map<string, number> | undefined): number {
  if (!m) return 0;
  let s = 0;
  m.forEach((v) => (s += v));
  return s;
}

/**
 * The objective identity: TIMES's objective is INV + FIX + VAR − SAL summed
 * over regions. Returned so the page can show that the components add up to
 * the solver's objective (a cheap internal-consistency check on the file).
 */
export function objectiveFromComponents(rows: Demo12Results['objective_components']): number {
  let s = 0;
  for (const r of rows) s += r.component === 'OBJSAL' ? -r.value : r.value;
  return s;
}

/** Loud validation: which expected series are missing or empty. */
export function checkResults(d: Partial<Demo12Results> | null | undefined): string[] {
  if (!d) return ['the results file did not parse'];
  const missing: string[] = [];
  if (!d.parity) missing.push('parity block');
  if (!d.generation_by_fuel?.length) missing.push('generation by fuel');
  if (!d.co2_by_sector?.length) missing.push('CO₂ by sector');
  if (!d.new_capacity_by_fuel?.length) missing.push('new capacity by fuel');
  if (!d.objective_components?.length) missing.push('objective components');
  return missing;
}
