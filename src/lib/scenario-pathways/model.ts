/**
 * Scenarios (M · 55) — screening model and statistics.
 *
 * A TypeScript port of the screening in the EEA export
 * `EU_six_sectors_export.zip` → `export/scripts/variants.py`, generalised
 * so that every threshold is a free parameter instead of one of six fixed
 * settings. With the defaults below it reproduces the export's twelve stage
 * columns exactly; `checkParity()` re-runs that comparison in the browser and
 * the page reports the result, so a drift cannot go unnoticed.
 *
 * Stage codes (as in the export README):
 *   -1 no industry data · 0 fails the 2050 net-GHG rule · 1 outside the 2040
 *   window · 2 fails the ESABCC filter (feasibility, ESABCC 2023 Table 5) ·
 *   3 above a risk level (sustainability, ESABCC 2023 Table 6) · 4 within all
 *   criteria.
 *
 * Statistics: percentiles use linear interpolation between order statistics,
 * which is numpy's default, so medians and 5/25/75/95 % bands match the
 * export's matplotlib charts (`charts.py`, `charts2.py`, `econ.py`,
 * `drivers.py`).
 *
 * The port itself is AI-compiled — pending Secretariat verification. The data
 * are the EEA export as delivered; nothing here edits a value.
 */

// ── dataset shape (written by scripts/build-scenario-pathways.py) ────────

export interface RawDataset {
  meta: {
    title: string;
    source: string;
    embargo: string;
    built_by: string;
    n: number;
    thresholds: Record<string, number>;
    windows: Record<string, [number, number]>;
  };
  cols: string[];
  rows: (string | number | boolean | null)[][];
  inventory: {
    sectors: Record<string, Record<SectorKey, number>>;
    net: Record<string, number>;
  };
  funnel: { steps: [string, number][]; nmed: Record<string, number>; by_src: Record<string, number> };
  sectorMedians: { sector: string; setting: string; n: number | null; median_2040: number | null; median_2050: number | null }[];
}

export interface Pathway {
  id: number;
  src: string;
  pool: string;
  model: string;
  scenario: string;
  /** Industry detail available (the export's `det`). */
  det: boolean;
  /** Net-zero flag from the scenario universe; the JRC fallback when net50 is missing. */
  nz0: boolean;
  /** Numeric columns by name; null where the pathway does not report. */
  v: Record<string, number | null>;
  /** Stage codes from the export, keyed by `nz150|85–95%|m0` etc. Parity reference only. */
  ref: Record<string, number>;
}

export interface Dataset {
  meta: RawDataset['meta'];
  pathways: Pathway[];
  invSectors: Record<number, Record<SectorKey, number>>;
  invNet: Record<number, number>;
  funnel: RawDataset['funnel'];
}

export function parseDataset(raw: RawDataset): Dataset {
  const idx = (c: string) => raw.cols.indexOf(c);
  const iSrc = idx('src'), iPool = idx('pool'), iModel = idx('model'), iScen = idx('scenario');
  const iDet = idx('det'), iNz0 = idx('nz0');
  if ([iSrc, iPool, iModel, iScen, iDet, iNz0].some((i) => i < 0)) {
    throw new Error('Dataset is missing one of the identity columns (src, pool, model, scenario, det, nz0).');
  }
  const numCols = raw.cols
    .map((c, i) => [c, i] as const)
    .filter(([c]) => !['src', 'pool', 'model', 'scenario', 'det', 'nz0'].includes(c) && !c.startsWith('stage:'));
  const stageCols = raw.cols.map((c, i) => [c, i] as const).filter(([c]) => c.startsWith('stage:'));
  const pathways = raw.rows.map((r, id) => {
    const v: Record<string, number | null> = {};
    for (const [c, i] of numCols) v[c] = typeof r[i] === 'number' ? (r[i] as number) : null;
    const ref: Record<string, number> = {};
    for (const [c, i] of stageCols) ref[c.slice(6)] = r[i] as number;
    return {
      id,
      src: String(r[iSrc]),
      pool: String(r[iPool]),
      model: String(r[iModel]),
      scenario: String(r[iScen]),
      det: r[iDet] === true,
      nz0: r[iNz0] === true,
      v,
      ref,
    };
  });
  const invSectors: Dataset['invSectors'] = {};
  for (const [y, rec] of Object.entries(raw.inventory.sectors)) invSectors[Number(y)] = rec;
  const invNet: Dataset['invNet'] = {};
  for (const [y, val] of Object.entries(raw.inventory.net)) invNet[Number(y)] = val;
  return { meta: raw.meta, pathways, invSectors, invNet, funnel: raw.funnel };
}

// ── screening settings ───────────────────────────────────────────────────

export type ThresholdKey = 'cap' | 'bio' | 'wccs' | 'wbio' | 'h2' | 'fe' | 'cap_r' | 'bio_r' | 'land_r';

export interface ThresholdDef {
  key: ThresholdKey;
  /** Column tested against the threshold. */
  col: string;
  group: 'filter' | 'risk';
  label: string;
  unit: string;
  /** Default from `variants.py` TH. */
  def: number;
  min: number;
  max: number;
  step: number;
}

/**
 * The nine tests of `variants.py`. Units are inferred from the variable
 * definitions and the data range in the export; the thresholds are the
 * export's own `TH` values (ESABCC 2023, Tables 5 and 6).
 */
export const THRESHOLDS: ThresholdDef[] = [
  { key: 'cap', col: 'cap50', group: 'filter', label: 'EU CO₂ capture, 2050', unit: 'Mt CO₂', def: 500, min: 100, max: 1500, step: 5 },
  { key: 'bio', col: 'bio50', group: 'filter', label: 'EU bioenergy, 2050', unit: 'EJ', def: 20, min: 2, max: 40, step: 0.5 },
  { key: 'wccs', col: 'wccs50', group: 'filter', label: 'World CO₂ storage, 2050', unit: 'Mt CO₂', def: 8600, min: 1000, max: 25000, step: 100 },
  { key: 'wbio', col: 'wbio50', group: 'filter', label: 'World bioenergy, 2050', unit: 'EJ', def: 240, min: 50, max: 400, step: 5 },
  { key: 'h2', col: 'h2_30', group: 'filter', label: 'EU hydrogen, 2030', unit: 'EJ', def: 1.89, min: 0.2, max: 4, step: 0.01 },
  { key: 'fe', col: 'fe_decl', group: 'filter', label: 'Final-energy decline to 2030', unit: '%', def: 20, min: 0, max: 40, step: 0.5 },
  { key: 'cap_r', col: 'cap50', group: 'risk', label: 'EU CO₂ capture, 2050', unit: 'Mt CO₂', def: 425, min: 100, max: 1500, step: 5 },
  { key: 'bio_r', col: 'bio50', group: 'risk', label: 'EU bioenergy, 2050', unit: 'EJ', def: 9, min: 2, max: 40, step: 0.5 },
  { key: 'land_r', col: 'land50', group: 'risk', label: 'EU land sink, 2050', unit: 'Mt CO₂', def: 400, min: 0, max: 900, step: 10 },
];

export const DEFAULT_TH: Record<ThresholdKey, number> = Object.fromEntries(
  THRESHOLDS.map((t) => [t.key, t.def]),
) as Record<ThresholdKey, number>;

/** 2040 cut slider bounds. The upper handle at WIN_OPEN means "no upper bound". */
export const WIN_MIN = 70;
export const WIN_OPEN = 100;

export interface Settings {
  /** Restrict to these source pools; empty = all. */
  pools: string[];
  /** Apply the 2050 net-GHG step. */
  netOn: boolean;
  /** EU net GHG in 2050 must be ≤ this, Mt CO₂e. */
  netTol: number;
  /** Apply the 2040 window step. */
  winOn: boolean;
  /** 2040 net GHG cut vs 1990, whole percent. `winHi >= WIN_OPEN` = open-ended. */
  winLo: number;
  winHi: number;
  filterOn: boolean;
  riskOn: boolean;
  th: Record<ThresholdKey, number>;
  /** Margin on all filter and risk thresholds, percent (export: 0 or 10). */
  margin: number;
  /** Missing filter values count as passed (the export's rule). */
  missingPass: boolean;
  /** 2050 net GHG used by step 1; default the reported `net50`. Set to screen on inventory-scaled values. */
  netValue?: (p: Pathway) => number | null;
}

export const ADVICE_SETTINGS: Settings = {
  pools: [],
  netOn: true,
  netTol: 150,
  winOn: true,
  winLo: 85,
  winHi: 95,
  filterOn: true,
  riskOn: true,
  th: { ...DEFAULT_TH },
  margin: 0,
  missingPass: true,
};

/**
 * The export's rounding rule for the window: a whole-percent window
 * [lo, hi] is tested as lo − 0.05 ≤ cut < hi + 0.5, which is exactly the
 * `WIN` table in variants.py ((84.95, 90.5), (84.95, 95.5), (84.95, ∞)).
 */
export function windowBounds(s: Pick<Settings, 'winLo' | 'winHi'>): [number, number] {
  return [s.winLo - 0.05, s.winHi >= WIN_OPEN ? Infinity : s.winHi + 0.5];
}

export function windowLabel(s: Pick<Settings, 'winLo' | 'winHi'>): string {
  return s.winHi >= WIN_OPEN ? `≥ ${s.winLo}%` : `${s.winLo}–${s.winHi}%`;
}

export function netLabel(tol: number): string {
  return tol === 0 ? 'net GHG ≤ 0' : `net GHG ≤ ${tol.toLocaleString('en-GB')} Mt`;
}

export interface Screened {
  p: Pathway;
  /** -2 excluded by the source-pool filter; otherwise the export's codes. */
  stage: number;
  /** Tests failed at the stage that excluded the pathway (or flagged ones). */
  reasons: string[];
}

export function screen(p: Pathway, s: Settings): Screened {
  if (s.pools.length && !s.pools.includes(p.pool)) return { p, stage: -2, reasons: ['source not selected'] };
  if (!p.det) return { p, stage: -1, reasons: ['no industry data'] };
  if (s.netOn) {
    const n = s.netValue ? s.netValue(p) : p.v.net50;
    const ok = n != null ? n <= s.netTol : p.src === 'JRC' && p.nz0 && s.netTol >= 0;
    if (!ok) return { p, stage: 0, reasons: [n == null ? '2050 net GHG not reported' : `2050 net GHG ${fmtNum(n)} Mt`] };
  }
  if (s.winOn) {
    const r = p.v.red;
    const [lo, hi] = windowBounds(s);
    if (r == null || !(lo <= r && r < hi)) {
      return { p, stage: 1, reasons: [r == null ? '2040 cut not reported' : `2040 cut ${r.toFixed(1)}%`] };
    }
  }
  const f = 1 + s.margin / 100;
  const over = (t: ThresholdDef) => {
    const v = p.v[t.col];
    if (v == null) return !s.missingPass;
    return v > s.th[t.key] * f;
  };
  if (s.filterOn) {
    const ex = THRESHOLDS.filter((t) => t.group === 'filter' && over(t)).map((t) => t.label);
    if (ex.length) return { p, stage: 2, reasons: ex };
  }
  if (s.riskOn) {
    const rk = THRESHOLDS.filter((t) => t.group === 'risk' && over(t)).map((t) => t.label);
    if (rk.length) return { p, stage: 3, reasons: rk };
  }
  return { p, stage: 4, reasons: [] };
}

export function screenAll(ds: Dataset, s: Settings): Screened[] {
  return ds.pathways.map((p) => screen(p, s));
}

// ── the six settings of the deck ─────────────────────────────────────────

export interface Preset {
  key: string; // export stage key, e.g. nz150|85–95%|m0
  netTol: number;
  winLo: number;
  winHi: number;
  label: string;
  short: string;
  advice: boolean;
}

export const PRESETS: Preset[] = (['0', '150'] as const).flatMap((nz) =>
  (
    [
      ['85–90%', 85, 90],
      ['85–95%', 85, 95],
      ['≥ 85%', 85, WIN_OPEN],
    ] as const
  ).map(([w, lo, hi]) => ({
    key: `nz${nz}|${w}|m0`,
    netTol: Number(nz),
    winLo: lo,
    winHi: hi,
    label: `Net GHG ${nz === '0' ? '≤ 0' : '≤ 150 Mt'} · 2040 cut ${w}`,
    short: `${nz === '0' ? '≤ 0' : '≤ 150'} · ${w}`,
    advice: nz === '150' && w === '85–95%',
  })),
);

/** One of the six deck settings, carrying over the user's other choices. */
export function presetSettings(base: Settings, pr: Preset): Settings {
  return { ...base, netOn: true, winOn: true, netTol: pr.netTol, winLo: pr.winLo, winHi: pr.winHi };
}

export function matchesPreset(s: Settings): Preset | undefined {
  if (!s.netOn || !s.winOn) return undefined;
  return PRESETS.find((p) => p.netTol === s.netTol && p.winLo === s.winLo && p.winHi === s.winHi);
}

export function isExportDefault(s: Settings): boolean {
  return (
    s.pools.length === 0 &&
    s.filterOn &&
    s.riskOn &&
    s.missingPass &&
    s.margin === 0 &&
    THRESHOLDS.every((t) => s.th[t.key] === t.def)
  );
}

/** Re-runs all twelve export settings with the default thresholds. */
export function checkParity(ds: Dataset): { checked: number; mismatches: number } {
  let checked = 0, mismatches = 0;
  for (const pr of PRESETS) {
    for (const m of [0, 10]) {
      const key = pr.key.replace('|m0', `|m${m}`);
      const s: Settings = { ...presetSettings(ADVICE_SETTINGS, pr), margin: m };
      for (const p of ds.pathways) {
        const ref = p.ref[key];
        if (ref == null) continue;
        checked++;
        if (screen(p, s).stage !== ref) mismatches++;
      }
    }
  }
  return { checked, mismatches };
}

// ── sectors ──────────────────────────────────────────────────────────────

export type SectorKey = 'supply' | 'industry' | 'mobility' | 'buildings' | 'agri' | 'eco';
export const YEARS = [2020, 2030, 2040, 2050] as const;

export interface Lever {
  label: string;
  unit: string;
  /** Column stem; `${stem}_${year}` for series, or a single column via `col`. */
  stem?: string;
  col?: string;
  colYear?: number;
}

export interface SectorDef {
  key: SectorKey;
  name: string;
  unit: string;
  /** y-axis range used by the export's charts (charts.py SEC). */
  yl: [number, number];
  variable: string;
  inventory: string;
  /** Emissions value for one pathway and year. */
  value: (p: Pathway, y: number) => number | null;
  /** Lever indicators shown on the deck's "levers" slide and driver charts. */
  levers: Lever[];
  /** First column of the driver chart (drivers.py SYS). */
  driver: { col: string; label: string; unit: string; ref: number | null; refLabel: string; emYear?: number };
  /** `emYear` marks a column that is the sector's own emissions in that year, so it follows the harmonisation. */
  driverCols: { col: string; label: string; unit: string; ref20?: string; refInv?: number; emYear?: number }[];
  /** As reported by the model; equals `value` when no harmonisation is applied. */
  reported?: (p: Pathway, y: number) => number | null;
  /** How each pathway was harmonised (set by `harmoniseSector`). */
  harmKind?: (p: Pathway) => HarmKind;
}

const col = (stem: string) => (p: Pathway, y: number) => p.v[`${stem}_${y}`] ?? null;
const INDUSTRY_COL: Record<number, string> = { 2020: 'i20', 2030: 'i30', 2040: 'i40', 2050: 'i50' };

export const SECTORS: SectorDef[] = [
  {
    key: 'supply', name: 'Energy supply', unit: 'Mt CO₂', yl: [-700, 1500],
    variable: 'Emissions|CO2|Energy|Supply', inventory: 'CRF 1.A.1 + 1.B, CO₂',
    value: col('sup_e'),
    levers: [
      { label: 'Wind electricity', unit: 'TWh', stem: 'sup_wind' },
      { label: 'Solar electricity', unit: 'TWh', stem: 'sup_solar' },
      { label: 'Hydrogen production', unit: 'EJ', stem: 'sup_h2' },
    ],
    driver: { col: 'sup_e_2040', label: 'CO₂ 2040', unit: 'Mt CO₂', ref: 786.8, refLabel: 'inventory 2020', emYear: 2040 },
    driverCols: [
      { col: 'sup_el_2040', label: 'Electricity generation', unit: 'TWh', ref20: 'sup_el_2020' },
      { col: 'sup_wind_2040', label: 'Wind', unit: 'TWh', ref20: 'sup_wind_2020' },
      { col: 'sup_solar_2040', label: 'Solar', unit: 'TWh', ref20: 'sup_solar_2020' },
      { col: 'sup_h2_2040', label: 'Hydrogen production', unit: 'EJ', ref20: 'sup_h2_2020' },
    ],
  },
  {
    key: 'industry', name: 'Industry', unit: 'Mt CO₂e', yl: [-150, 950],
    variable: 'Industry GHG harmonised to the 2020 inventory', inventory: 'Industry GHG (main deck)',
    value: (p, y) => p.v[INDUSTRY_COL[y]] ?? null,
    levers: [
      { label: 'Electricity use', unit: 'EJ', col: 'el40', colYear: 2040 },
      { label: 'Hydrogen use', unit: 'EJ', col: 'h240', colYear: 2040 },
      { label: 'CO₂ captured', unit: 'Mt CO₂', col: 'ccs50', colYear: 2050 },
    ],
    driver: { col: 'i40', label: 'GHG 2040', unit: 'Mt CO₂e', ref: 593.2, refLabel: 'inventory 2020 (CO₂)', emYear: 2040 },
    driverCols: [
      { col: 'el40', label: 'Electricity use', unit: 'EJ' },
      { col: 'h240', label: 'Hydrogen use', unit: 'EJ' },
      { col: 'ccs50', label: 'CO₂ captured, 2050', unit: 'Mt CO₂' },
      { col: 'fe40', label: 'Final energy', unit: 'EJ' },
    ],
  },
  {
    key: 'mobility', name: 'Mobility', unit: 'Mt CO₂', yl: [-50, 1000],
    variable: 'Emissions|CO2|Energy|Demand|Transportation', inventory: 'CRF 1.A.3, CO₂',
    value: col('mob_e'),
    levers: [
      { label: 'Final energy', unit: 'EJ', stem: 'mob_fe' },
      { label: 'Electricity use', unit: 'EJ', stem: 'mob_el' },
      { label: 'Hydrogen use', unit: 'EJ', stem: 'mob_h2' },
    ],
    driver: { col: 'mob_e_2040', label: 'CO₂ 2040', unit: 'Mt CO₂', ref: 713.2, refLabel: 'inventory 2020', emYear: 2040 },
    driverCols: [
      { col: 'mob_fe_2040', label: 'Final energy', unit: 'EJ', ref20: 'mob_fe_2020' },
      { col: 'mob_el_2040', label: 'Electricity use', unit: 'EJ', ref20: 'mob_el_2020' },
      { col: 'mob_h2_2040', label: 'Hydrogen use', unit: 'EJ', ref20: 'mob_h2_2020' },
    ],
  },
  {
    key: 'buildings', name: 'Built environment', unit: 'Mt CO₂', yl: [-50, 650],
    variable: 'Emissions|CO2|Energy|Demand|Residential and Commercial', inventory: 'CRF 1.A.4.a + 1.A.4.b, CO₂',
    value: col('bui_e'),
    levers: [
      { label: 'Final energy', unit: 'EJ', stem: 'bui_fe' },
      { label: 'Electricity use', unit: 'EJ', stem: 'bui_el' },
      { label: 'Gas use', unit: 'EJ', stem: 'bui_gas' },
    ],
    driver: { col: 'bui_e_2040', label: 'CO₂ 2040', unit: 'Mt CO₂', ref: 418.2, refLabel: 'inventory 2020', emYear: 2040 },
    driverCols: [
      { col: 'bui_fe_2040', label: 'Final energy', unit: 'EJ', ref20: 'bui_fe_2020' },
      { col: 'bui_el_2040', label: 'Electricity use', unit: 'EJ', ref20: 'bui_el_2020' },
      { col: 'bui_gas_2040', label: 'Gas use', unit: 'EJ', ref20: 'bui_gas_2020' },
    ],
  },
  {
    key: 'agri', name: 'Agri-food', unit: 'Mt CO₂e', yl: [0, 650],
    variable: 'Emissions|CH4|AFOLU|Agriculture × 28 + Emissions|N2O|AFOLU|Agriculture × 0.265 (kt)',
    inventory: 'CRF 3, CH₄ and N₂O',
    value: (p, y) => {
      const ch4 = p.v[`agr_ch4_${y}`], n2o = p.v[`agr_n2o_${y}`];
      return ch4 == null || n2o == null ? null : ch4 * 28 + n2o * 0.265;
    },
    levers: [
      { label: 'Methane', unit: 'Mt CH₄', stem: 'agr_ch4' },
      { label: 'Nitrous oxide', unit: 'kt N₂O', stem: 'agr_n2o' },
    ],
    driver: { col: 'agr_ch4_2040', label: 'CH₄ 2040', unit: 'Mt CH₄', ref: 8.5, refLabel: 'inventory 2020' },
    driverCols: [
      { col: 'agr_n2o_2040', label: 'N₂O 2040', unit: 'kt N₂O', refInv: 502.4 },
      { col: 'agr_ch4_2050', label: 'CH₄ 2050', unit: 'Mt CH₄', refInv: 8.5 },
      { col: 'agr_n2o_2050', label: 'N₂O 2050', unit: 'kt N₂O', refInv: 502.4 },
    ],
  },
  {
    key: 'eco', name: 'Ecosystems', unit: 'Mt CO₂ (negative = sink)', yl: [-700, 450],
    variable: 'Emissions|CO2|AFOLU', inventory: 'CRF 4, CO₂',
    value: col('eco_e'),
    levers: [
      { label: 'Forest area', unit: 'Mha', stem: 'eco_forest' },
      { label: 'LULUCF CO₂', unit: 'Mt CO₂', stem: 'eco_e' },
    ],
    driver: { col: 'eco_e_2040', label: 'Net land CO₂ 2040', unit: 'Mt CO₂ (− = sink)', ref: -263.4, refLabel: 'inventory 2020', emYear: 2040 },
    driverCols: [
      { col: 'eco_e_2050', label: 'Net land CO₂ 2050', unit: 'Mt CO₂', refInv: -263.4, emYear: 2050 },
      { col: 'eco_forest_2040', label: 'Forest area 2040', unit: 'million ha', ref20: 'eco_forest_2020' },
    ],
  },
];

export const SECTOR_BY_KEY = Object.fromEntries(SECTORS.map((s) => [s.key, s])) as Record<SectorKey, SectorDef>;

// ── harmonisation to the historic inventory ─────────────────────────────

/**
 * Scaling of model results to the EEA inventory (requested 2026-11-20:
 * "scale all of the results to the historic GHG inventories").
 *
 * Base year 2020, the first model year and the year the export already
 * harmonises industry to (i20 = 607.5 Mt = inventory 2020 for every
 * pathway, so industry is unchanged by any method here).
 *
 *   ratio  — v′(y) = v(y) × inv₂₀₂₀ / v₂₀₂₀ for every year. Used only where
 *            model and inventory 2020 have the same sign and the factor lies
 *            in RATIO_BOUNDS; elsewhere the pathway falls back to offset.
 *            (Ecosystems: most models report a 2020 land source or a tiny
 *            sink against an inventory sink of −263 Mt, so a ratio would
 *            flip or explode the series.)
 *   offset — v′(y) = v(y) + (inv₂₀₂₀ − v₂₀₂₀) for every year.
 *   none   — as reported (the deck).
 *
 * The correction is held constant to 2050 (no convergence back to the
 * reported values). Pathways without a 2020 value cannot be scaled and drop
 * out of the scaled charts (they are counted as `missing`).
 */
export type HarmMethod = 'none' | 'ratio' | 'offset';
export type HarmKind = 'none' | 'ratio' | 'offset' | 'missing';
export const HARM_BASE_YEAR = 2020;
export const RATIO_BOUNDS: [number, number] = [0.25, 4];

export function harmKindFor(m20: number | null, inv: number, method: HarmMethod): HarmKind {
  if (method === 'none') return 'none';
  if (m20 == null || !Number.isFinite(inv)) return 'missing';
  if (method === 'offset') return 'offset';
  const f = m20 !== 0 ? inv / m20 : NaN;
  return Number.isFinite(f) && f >= RATIO_BOUNDS[0] && f <= RATIO_BOUNDS[1] ? 'ratio' : 'offset';
}

export function harmonise(
  value: (p: Pathway, y: number) => number | null,
  inv: number,
  method: HarmMethod,
): { value: (p: Pathway, y: number) => number | null; kind: (p: Pathway) => HarmKind } {
  if (method === 'none') return { value, kind: () => 'none' };
  const kind = (p: Pathway) => harmKindFor(value(p, HARM_BASE_YEAR), inv, method);
  return {
    kind,
    value: (p, y) => {
      const v = value(p, y), m20 = value(p, HARM_BASE_YEAR);
      if (v == null || m20 == null) return null;
      const k = harmKindFor(m20, inv, method);
      return k === 'ratio' ? v * (inv / m20) : v + (inv - m20);
    },
  };
}

export function harmoniseSector(s: SectorDef, inv: Record<SectorKey, number> | undefined, method: HarmMethod): SectorDef {
  const target = inv?.[s.key];
  if (method === 'none' || target == null) return { ...s, reported: s.value, harmKind: () => 'none' };
  const h = harmonise(s.value, target, method);
  return { ...s, value: h.value, reported: s.value, harmKind: h.kind };
}

export function harmMix(ps: Pathway[], s: SectorDef): Record<HarmKind, number> {
  const out: Record<HarmKind, number> = { none: 0, ratio: 0, offset: 0, missing: 0 };
  for (const p of ps) if (s.reported?.(p, 2050) != null) out[(s.harmKind ?? (() => 'none'))(p)]++;
  return out;
}

// ── statistics ───────────────────────────────────────────────────────────

/** numpy.percentile with the default linear interpolation. */
export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const h = (sorted.length - 1) * (q / 100);
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}

export function quantiles(values: number[], qs = [5, 25, 50, 75, 95]): Record<number, number> {
  const s = [...values].sort((a, b) => a - b);
  return Object.fromEntries(qs.map((q) => [q, percentile(s, q)]));
}

export function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 50);
}

export interface BandStats {
  n: number;
  /** One entry per year in YEARS. */
  q: Record<5 | 25 | 50 | 75 | 95, number[]>;
  /** The individual series when n < 5 (the export draws single lines then). */
  lines: number[][];
}

/** Series for every pathway in the set that reports all four years (as the export's charts require). */
export function sectorMatrix(ps: Pathway[], value: (p: Pathway, y: number) => number | null): number[][] {
  const out: number[][] = [];
  for (const p of ps) {
    const row = YEARS.map((y) => value(p, y));
    if (row.every((x) => x != null)) out.push(row as number[]);
  }
  return out;
}

export function bandStats(rows: number[][]): BandStats {
  const q = { 5: [], 25: [], 50: [], 75: [], 95: [] } as unknown as BandStats['q'];
  for (let j = 0; j < YEARS.length; j++) {
    const s = rows.map((r) => r[j]).sort((a, b) => a - b);
    for (const k of [5, 25, 50, 75, 95] as const) q[k].push(percentile(s, k));
  }
  return { n: rows.length, q, lines: rows.length < 5 ? rows : [] };
}

export function netGhgValue(p: Pathway, y: number): number | null {
  return p.v[`net_ghg_${y}`] ?? null;
}

// ── formatting ───────────────────────────────────────────────────────────

export function fmtNum(v: number | null | undefined, digits?: number): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const d = digits ?? (Math.abs(v) >= 20 ? 0 : Math.abs(v) >= 1 ? 1 : 2);
  return v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
}

/** Human labels for the export's `src` codes (as used in the deck's source note). */
export const SRC_LABEL: Record<string, string> = {
  SC: 'Scenario Compass',
  Schreyer: 'Schreyer et al. 2025',
  ElecH2: 'Schreyer et al. 2024',
  ESABCC: 'ESABCC 2023',
  ngfs_phase_4: 'NGFS 4',
  ngfs_phase_5: 'NGFS 5',
  deeds: 'DEEDS',
  ecemf: 'ECEMF',
  navigate: 'NAVIGATE',
  shape: 'SHAPE',
  CircEUlar: 'CircEUlar',
  IAMC_GCAM: 'IAM COMPACT GCAM',
  JRC: 'JRC',
  POLIZERO: 'POLIZERO',
};

export const STAGE_LABEL: Record<number, string> = {
  [-2]: 'Source not selected',
  [-1]: 'No industry data',
  0: 'Fails 2050 net GHG',
  1: 'Outside 2040 window',
  2: 'Fails ESABCC filter',
  3: 'Above a risk level',
  4: 'Within all criteria',
};
