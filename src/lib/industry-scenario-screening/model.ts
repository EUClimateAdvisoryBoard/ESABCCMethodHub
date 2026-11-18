/**
 * Industry scenario screening — typed view and screening logic.
 * ---------------------------------------------------------------------------
 * Wraps `src/data/industry-scenario-screening.generated.ts` (built from
 * public/data/industry-scenario-screening/Scenario_database.xlsx by
 * scripts/build-industry-scenario-screening.py) and holds the screening rules
 * of the EEA deck "EU industry emission pathways in scenario databases:
 * screening against the ESABCC criteria" (18 November 2026).
 *
 * The rules here are the workbook's own COUNTIFS criteria, not a
 * reinterpretation: the build script recomputes the Pools and Sensitivity
 * sheets with the same rules and refuses to write if any count differs, and
 * `checkAgainstWorkbook()` repeats that check at run time so the tab shows a
 * loud warning rather than silently diverging numbers.
 *
 * AI-compiled — pending human verification.
 */
import {
  PATHWAY_COLUMNS,
  PATHWAY_ROWS,
  REMIND_COLUMNS,
  REMIND_ROWS,
  SENSITIVITY,
} from '@/data/industry-scenario-screening.generated';

type Cell = string | number | boolean | null | string[];

/** One pathway of the 1,008 in All_pathways. */
export interface Pathway {
  id: string;
  pool: string;
  group: string;
  model: string;
  scenario: string;
  publicationYear: number;
  period: 'up to 2024' | '2025–2026';
  netZero2050: boolean;
  /** Net GHG cut in 2040 vs 1990, %. Null where the pathway is not net zero. */
  red2040: number | null;
  in8595: boolean | null;
  filterPass: boolean | null;
  withinRisk: boolean | null;
  /** 0 = in database … 4 = within all risk levels (see STAGES). */
  stage: number;
  /** Harmonised EU industry emissions, Mt CO2e. */
  ind: { 2020: number; 2030: number; 2040: number; 2050: number };
  cap2050: number | null;
  bio2050EJ: number | null;
  landSink2050: number | null;
  globalCcs2050: number | null;
  globalBio2050: number | null;
  h2_2030EJ: number | null;
  feDecline2020_30: number | null;
  filterExclusions: string[] | null;
  esabccEnvOk: boolean | null;
  esabccAdviceSet: boolean | null;
  isCmip7: boolean;
}

/** One run of the REMIND-EU ensemble (Rodrigues et al. 2026). */
export type RemindRun = Record<(typeof REMIND_COLUMNS)[number], Cell> & { id: string };

function colIndex<T extends readonly string[]>(cols: T) {
  const m = new Map<string, number>();
  cols.forEach((c, i) => m.set(c, i));
  return (row: Cell[], c: T[number]) => row[m.get(c)!] ?? null;
}

const pcol = colIndex(PATHWAY_COLUMNS);
const n = (v: Cell) => (typeof v === 'number' ? v : null);
const b = (v: Cell) => (typeof v === 'boolean' ? v : null);

export const PATHWAYS: Pathway[] = (PATHWAY_ROWS as Cell[][]).map((r, i) => {
  const group = String(pcol(r, 'group'));
  return {
    id: `p${i}`,
    pool: String(pcol(r, 'pool')),
    group,
    model: String(pcol(r, 'model')),
    scenario: String(pcol(r, 'scenario')),
    publicationYear: Number(pcol(r, 'publication_year')),
    period: pcol(r, 'period') as Pathway['period'],
    netZero2050: pcol(r, 'net_zero_2050') === true,
    red2040: n(pcol(r, 'red2040_pct')),
    in8595: b(pcol(r, 'in_85_95')),
    filterPass: b(pcol(r, 'esabcc_filter_pass')),
    withinRisk: b(pcol(r, 'within_risk_levels')),
    stage: Number(pcol(r, 'stage')),
    ind: {
      2020: Number(pcol(r, 'ind2020')),
      2030: Number(pcol(r, 'ind2030')),
      2040: Number(pcol(r, 'ind2040')),
      2050: Number(pcol(r, 'ind2050')),
    },
    cap2050: n(pcol(r, 'cap2050')),
    bio2050EJ: n(pcol(r, 'bio2050_EJ')),
    landSink2050: n(pcol(r, 'land_sink2050')),
    globalCcs2050: n(pcol(r, 'global_ccs2050')),
    globalBio2050: n(pcol(r, 'global_bio2050')),
    h2_2030EJ: n(pcol(r, 'h2_2030_EJ')),
    feDecline2020_30: n(pcol(r, 'fe_decline_2020_30_pct')),
    filterExclusions: (pcol(r, 'filter_exclusions') as string[] | null) ?? null,
    esabccEnvOk: b(pcol(r, 'esabcc_env_ok')),
    esabccAdviceSet: b(pcol(r, 'esabcc_advice_set')),
    isCmip7: group === 'CMIP7',
  };
});

const rcol = colIndex(REMIND_COLUMNS);
export const REMIND_RUNS: RemindRun[] = (REMIND_ROWS as Cell[][]).map((r, i) => {
  const o = { id: `r${i}` } as RemindRun;
  for (const c of REMIND_COLUMNS) (o as Record<string, Cell>)[c] = rcol(r, c);
  return o;
});

/* ── Screening rules (README, METHOD) ─────────────────────────────────── */

/** 2040 range: 84.95 <= red2040 < 95.05 (85–95 % after rounding). */
export const RANGE_2040 = { lo: 84.95, hi: 95.05 } as const;

/** ESABCC risk levels, 2040 advice Table 6. */
export const ADVICE_RISK_LEVELS: RiskLevels = { capture: 425, biomass: 9, landSink: 400 };

export interface RiskLevels {
  /** EU CO2 captured in 2050, Mt. */
  capture: number;
  /** EU primary biomass in 2050, EJ. */
  biomass: number;
  /** Net land sink in 2050, Mt CO2 (a larger assumed sink is the riskier one). */
  landSink: number;
}

export const STAGES = [
  { stage: 0, label: 'In the scenario databases', short: 'All pathways', colour: '#9b9b9b' },
  { stage: 1, label: 'Reach EU net-zero GHG by 2050', short: 'Net zero 2050', colour: '#a493cf' },
  { stage: 2, label: 'Cut net GHG by 85–95 % by 2040', short: '85–95 % by 2040', colour: '#6a4fb0' },
  { stage: 3, label: 'Pass the ESABCC feasibility filter', short: 'ESABCC filter', colour: '#d9a21b' },
  { stage: 4, label: 'Within all ESABCC risk levels', short: 'Risk levels', colour: '#3b2468' },
] as const;

/** Excel COUNTIFS "<=": a blank cell never satisfies a numeric criterion. */
function le(v: number | null, limit: number): boolean {
  return v != null && v <= limit;
}

export function inRange2040(v: number | null): boolean {
  return v != null && v >= RANGE_2040.lo && v < RANGE_2040.hi;
}

/** Sensitivity criterion for the multi-model pathways (sheet Sensitivity). */
export function passesWithRisk(p: Pathway, risk: RiskLevels | null): boolean {
  if (!(inRange2040(p.red2040) && p.filterPass === true)) return false;
  if (!risk) return true;
  return le(p.cap2050, risk.capture) && le(p.bio2050EJ, risk.biomass) && le(p.landSink2050, risk.landSink);
}

/** Same criterion for a REMIND-EU run (net zero is not implied there). */
export function remindPassesWithRisk(r: RemindRun, risk: RiskLevels | null): boolean {
  if (!(r.net_zero_2050 === true && inRange2040(r.red2040_pct as number | null) && r.esabcc_filter_pass === true)) return false;
  if (!risk) return true;
  return (
    le(r.cap2050 as number | null, risk.capture) &&
    le(r.bio2050_EJ as number | null, risk.biomass) &&
    le(r.land_sink2050 as number | null, risk.landSink)
  );
}

/**
 * Stage of a pathway under user-chosen risk levels. Stages 0–3 are the
 * workbook's; stage 4 is re-evaluated so the funnel follows the sliders.
 */
export function stageUnder(p: Pathway, risk: RiskLevels): number {
  if (p.stage < 3) return p.stage;
  return passesWithRisk(p, risk) ? 4 : 3;
}

export function remindStage(r: RemindRun, risk: RiskLevels): number {
  if (r.net_zero_2050 !== true) return 0;
  if (!inRange2040(r.red2040_pct as number | null)) return 1;
  if (r.esabcc_filter_pass !== true) return 2;
  return remindPassesWithRisk(r, risk) ? 4 : 3;
}

/**
 * Re-run the workbook's own counts. Returns a list of mismatches (empty when
 * the data and the rules agree with the cached workbook values).
 */
export function checkAgainstWorkbook(): string[] {
  const issues: string[] = [];
  for (const s of SENSITIVITY) {
    const risk =
      s.captureLimit == null ? null : { capture: s.captureLimit, biomass: s.biomassLimitEJ!, landSink: s.landSinkLimit! };
    const mm = PATHWAYS.filter(p => passesWithRisk(p, risk)).length;
    const re = REMIND_RUNS.filter(r => remindPassesWithRisk(r, risk)).length;
    if (mm !== s.multiModelRemaining) issues.push(`${s.variant}: ${mm} multi-model pathways vs ${s.multiModelRemaining} in the workbook`);
    if (re !== s.remindEuRemaining) issues.push(`${s.variant}: ${re} REMIND-EU runs vs ${s.remindEuRemaining} in the workbook`);
  }
  return issues;
}

/* ── Small numeric helpers ────────────────────────────────────────────── */

export function quantiles(values: number[]): { min: number; median: number; max: number } | null {
  const v = values.filter(x => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { min: v[0], median, max: v[v.length - 1] };
}

export function fmt(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
