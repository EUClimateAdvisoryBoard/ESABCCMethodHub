/**
 * NECPR 2025 — Comparable Targets (beta module).
 *
 * Data behind the module. Three sources, all extracted from the 2025 National
 * Energy and Climate Progress Report workbooks published through the EEA's
 * Reportnet 3 dataflow by `scripts/extract-necpr-2025.py`:
 *
 *   Annex I  (GHG)  Tables 1–4 — NECPR_Annex_I_GHG_Progress_2025.xlsx
 *   Annex II (RES)  Table 7     — NECPR_Annex_II_RES_2025.xlsx
 *   Annex IV (EE)   Table 6     — NECPR_Annex_IV_EE_Progress_2025.xlsx
 *
 * The TARGET_FAMILIES block is the one part of this file that is *not*
 * mechanical: the workbooks give no cross-country key, so each reported
 * objective was read and assigned to a family by hand. Every member carries the
 * name exactly as submitted (`nameAsSubmitted`), so the mapping can be checked
 * against the source. See docs-internal/necpr-2025-annex-i-ii-iv-review-2026-07-29.md.
 */

// ---------------------------------------------------------------------------
// Palette — validated with the dataviz skill's checker against both surfaces.
// light: #0065A4,#D97514,#00928F,#B83230,#6667AB  → all six checks PASS
// dark:  #2A86C2,#C97C20,#00A096,#CE5450,#8778C6  → all six checks PASS
// ---------------------------------------------------------------------------

export const SERIES = {
  actual: { light: '#0065A4', dark: '#2A86C2', label: 'Inventory (actual)' },
  wem: { light: '#D97514', dark: '#C97C20', label: 'With existing measures' },
  wam: { light: '#00928F', dark: '#00A096', label: 'With additional measures' },
  alert: { light: '#B83230', dark: '#CE5450', label: 'Target' },
  extra: { light: '#6667AB', dark: '#8778C6', label: 'Other' },
} as const;

export const EU27 = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
] as const;

export type Country = (typeof EU27)[number];

export const COUNTRY_NAMES: Record<Country, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CY: 'Cyprus', CZ: 'Czechia',
  DE: 'Germany', DK: 'Denmark', EE: 'Estonia', EL: 'Greece', ES: 'Spain',
  FI: 'Finland', FR: 'France', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland',
  IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MT: 'Malta',
  NL: 'Netherlands', PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden',
  SI: 'Slovenia', SK: 'Slovakia',
};

// ---------------------------------------------------------------------------
// Headline coverage
// ---------------------------------------------------------------------------

export interface CoverageStep {
  label: string;
  value: number;
  of: number;
  note: string;
}

/** How much of each "other objectives" table survives to a comparable number. */
export const COVERAGE_FUNNEL: Record<'ghg' | 'res' | 'ee', CoverageStep[]> = {
  ghg: [
    { label: 'Member States reporting', value: 17, of: 27, note: 'ten submitted nothing to Annex I Table 4' },
    { label: 'Objectives submitted', value: 88, of: 88, note: 'PL 23, LU 12, RO 8, DE 7, SI 6, LT 5, PT 5' },
    { label: 'With a numeric target', value: 75, of: 88, note: '13 objectives are prose only' },
    { label: 'Climate-related', value: 72, of: 88, note: '16 PL entries are air quality, water, waste or nature' },
    { label: 'Comparable after normalisation', value: 60, of: 88, note: 'across 15 Member States, once units and bases are fixed' },
  ],
  res: [
    { label: 'Member States reporting', value: 13, of: 27, note: 'fourteen submitted nothing to Annex II Table 7' },
    { label: 'Country–objective pairs', value: 66, of: 66, note: 'six standardised categories plus free-text "other"' },
    { label: 'With a numeric progress value', value: 27, of: 66, note: 'ES, SI and SK return NA in every field' },
    { label: 'With a numeric target too', value: 9, of: 66, note: 'the rest state the target as prose' },
  ],
  ee: [
    { label: 'Member States reporting', value: 8, of: 27, note: 'nineteen submitted nothing to Annex IV Table 6' },
    { label: 'Rows submitted', value: 55, of: 55, note: 'IE 12, DK 13, CZ 13, FR 6, HU 5, SI 4, EL 1, PL 1' },
    { label: 'Rows with any content', value: 29, of: 55, note: 'DK and CZ submitted 26 rows of NA' },
    { label: 'With a quantity in the prose', value: 11, of: 55, note: 'the table has no unit, year or value column at all' },
  ],
};

// ---------------------------------------------------------------------------
// Finding 1 — the aggregate LULUCF sink
// ---------------------------------------------------------------------------

export interface SinkPoint {
  year: number;
  actual?: number;
  wem?: number;
  wam?: number;
}

/** EU-27 net LULUCF, Mt CO2e (negative = sink). Sum of 27 national series. */
export const LULUCF_EU27: SinkPoint[] = [
  { year: 2022, actual: -183 },
  { year: 2023, actual: -198, wem: -165, wam: -172 },
  { year: 2030, wem: -183, wam: -233 },
  { year: 2035, wem: -157, wam: -204 },
  { year: 2040, wem: -148, wam: -199 },
];

/** EU-wide 2030 net-removals target, Regulation (EU) 2018/841 as amended. */
export const LULUCF_EU_TARGET_2030 = -310;

export interface SinkCountry {
  cc: Country;
  actual2023: number;
  wam2030: number;
  wam2040: number;
}

/** Per-country net LULUCF, Mt CO2e. Negative = sink, positive = net source. */
export const LULUCF_BY_COUNTRY: SinkCountry[] = [
  { cc: 'DE', actual2023: 68.7, wam2030: 31.9, wam2040: 32.4 },
  { cc: 'FI', actual2023: 12.0, wam2030: 11.5, wam2040: 16.0 },
  { cc: 'LV', actual2023: 4.6, wam2030: 4.6, wam2040: 6.3 },
  { cc: 'IE', actual2023: 3.9, wam2030: 5.5, wam2040: 6.8 },
  { cc: 'NL', actual2023: 3.8, wam2030: 4.8, wam2040: 4.9 },
  { cc: 'EE', actual2023: 2.1, wam2030: 2.2, wam2040: 2.3 },
  { cc: 'MT', actual2023: 0.0, wam2030: 0.0, wam2040: 0.0 },
  { cc: 'BE', actual2023: -0.3, wam2030: -1.3, wam2040: -1.3 },
  { cc: 'CY', actual2023: -0.3, wam2030: -0.4, wam2040: -0.4 },
  { cc: 'LU', actual2023: -0.7, wam2030: -0.4, wam2040: -0.4 },
  { cc: 'PT', actual2023: -2.0, wam2030: -6.1, wam2040: -7.4 },
  { cc: 'CZ', actual2023: -3.6, wam2030: -5.7, wam2040: -7.1 },
  { cc: 'EL', actual2023: -4.1, wam2030: -7.6, wam2040: -8.0 },
  { cc: 'SI', actual2023: -4.3, wam2030: -2.1, wam2040: -2.2 },
  { cc: 'LT', actual2023: -5.3, wam2030: -7.6, wam2040: -7.0 },
  { cc: 'HR', actual2023: -5.5, wam2030: -4.0, wam2040: -4.2 },
  { cc: 'HU', actual2023: -5.8, wam2030: -5.8, wam2040: -6.0 },
  { cc: 'SK', actual2023: -7.8, wam2030: -5.8, wam2040: -4.7 },
  { cc: 'BG', actual2023: -8.6, wam2030: -9.5, wam2040: -9.4 },
  { cc: 'AT', actual2023: 7.5, wam2030: -4.0, wam2040: -2.9 },
  { cc: 'DK', actual2023: -0.5, wam2030: 0.3, wam2040: -2.0 },
  { cc: 'SE', actual2023: -31.2, wam2030: -29.3, wam2040: -18.1 },
  { cc: 'PL', actual2023: -32.7, wam2030: -42.1, wam2040: -30.0 },
  { cc: 'FR', actual2023: -37.4, wam2030: -24.7, wam2040: -21.1 },
  { cc: 'RO', actual2023: -46.4, wam2030: -49.1, wam2040: -50.1 },
  { cc: 'ES', actual2023: -51.0, wam2030: -46.0, wam2040: -40.3 },
  { cc: 'IT', actual2023: -53.6, wam2030: -42.8, wam2040: -45.0 },
];

// ---------------------------------------------------------------------------
// Finding 2 — "commitments" that are the country's own projection
// ---------------------------------------------------------------------------

export interface LulucfCommitment {
  cc: Country;
  necp: number | null;
  wem: number | null;
  wam: number | null;
  /** echo = the stated commitment equals the country's own projection. */
  verdict: 'echo' | 'independent' | 'unit-error' | 'not-reported';
  note?: string;
}

/** Annex I Table 3, 2030, kt CO2e as submitted. */
export const LULUCF_COMMITMENTS: LulucfCommitment[] = [
  { cc: 'EE', necp: 2230.6, wem: 2230.6, wam: 2230.6, verdict: 'echo', note: 'identical to both projections' },
  { cc: 'ES', necp: -46008.4, wem: -44048.4, wam: -46008.4, verdict: 'echo', note: 'identical to the WAM projection' },
  { cc: 'HU', necp: -4942.6, wem: -4942.6, wam: -5750.9, verdict: 'echo', note: 'identical to the WEM projection' },
  { cc: 'RO', necp: -49054.4, wem: -48958.6, wam: -49054.7, verdict: 'echo', note: 'identical to the WAM projection' },
  { cc: 'EL', necp: -6200, wem: -6540.5, wam: -7578.8, verdict: 'echo', note: 'description states “Projected values in the WEM scenario”' },
  { cc: 'BE', necp: -1, wem: -1105.6, wam: -1270.2, verdict: 'unit-error', note: 'reads −1 against a −1,106 kt projection' },
  { cc: 'FR', necp: -18, wem: -6480.9, wam: -24668, verdict: 'unit-error', note: 'reads −18 against a −6,481 kt projection' },
  { cc: 'NL', necp: 5.4, wem: 4778.6, wam: 4779.2, verdict: 'unit-error', note: 'reads 5.4 against a 4,779 kt projection' },
  { cc: 'PL', necp: 92, wem: -24550.5, wam: -42083, verdict: 'unit-error', note: 'reads 92 against a −24,551 kt projection' },
  { cc: 'AT', necp: null, wem: -4004.1, wam: -4004.1, verdict: 'not-reported' },
  { cc: 'BG', necp: null, wem: -9515.9, wam: -9515.9, verdict: 'not-reported' },
  { cc: 'CZ', necp: null, wem: -5741.5, wam: -5741.5, verdict: 'not-reported' },
  { cc: 'FI', necp: null, wem: 11515.9, wam: 11515.9, verdict: 'not-reported' },
  { cc: 'IE', necp: null, wem: 7792, wam: 5534.9, verdict: 'not-reported' },
  { cc: 'IT', necp: null, wem: -42781, wam: -42781, verdict: 'not-reported' },
  { cc: 'MT', necp: null, wem: 3.2, wam: 3.2, verdict: 'not-reported' },
  { cc: 'SE', necp: null, wem: -29291.1, wam: -29291.1, verdict: 'not-reported' },
  { cc: 'CY', necp: -322.9, wem: -325, wam: -352, verdict: 'independent' },
  { cc: 'DE', necp: 40000, wem: 32313, wam: 31939.7, verdict: 'independent' },
  { cc: 'DK', necp: 920, wem: 322.1, wam: 322.1, verdict: 'independent' },
  { cc: 'HR', necp: -5527, wem: -3957.9, wam: -3957.9, verdict: 'independent' },
  { cc: 'LT', necp: -6606, wem: -7457.4, wam: -7594.2, verdict: 'independent' },
  { cc: 'LU', necp: -403, wem: -195.6, wam: -429.7, verdict: 'independent' },
  { cc: 'LV', necp: -644, wem: 4609.1, wam: 4609.1, verdict: 'independent' },
  { cc: 'PT', necp: -6535, wem: -3587.6, wam: -6146.4, verdict: 'independent' },
  { cc: 'SI', necp: -146, wem: -813.2, wam: -2107.2, verdict: 'independent' },
  { cc: 'SK', necp: -4689.7, wem: -2722.1, wam: -5800.7, verdict: 'independent' },
];

// ---------------------------------------------------------------------------
// Annex I Table 1 — headline target coverage
// ---------------------------------------------------------------------------

export interface ScopeCoverage {
  scope: string;
  short: string;
  y2030: Country[];
  y2040: Country[];
  y2050: Country[];
}

export const TARGET_COVERAGE: ScopeCoverage[] = [
  {
    scope: 'Total GHG excluding LULUCF, excluding international aviation',
    short: 'Excl. LULUCF',
    y2030: ['AT', 'CY', 'CZ', 'DE', 'EL', 'ES', 'FI', 'FR', 'HU', 'LU', 'MT', 'PT', 'RO', 'SK'],
    y2040: ['CZ', 'DE', 'EL', 'FI', 'HU', 'LU', 'PT', 'RO', 'SK'],
    y2050: ['CZ', 'EL', 'FI', 'HU', 'LU', 'PT', 'RO', 'SK'],
  },
  {
    scope: 'Total GHG including LULUCF, excluding international aviation',
    short: 'Incl. LULUCF',
    y2030: ['CY', 'DK', 'EL', 'ES', 'HU', 'IE', 'IT', 'LT', 'LU', 'MT', 'NL', 'RO', 'SK'],
    y2040: ['EL', 'FI', 'HU', 'LT', 'LU', 'RO', 'SK'],
    y2050: ['DK', 'EE', 'EL', 'FI', 'HU', 'IE', 'LT', 'LU', 'NL', 'RO', 'SI', 'SK'],
  },
  {
    scope: 'Total GHG including LULUCF, including international aviation',
    short: 'Incl. LULUCF + aviation',
    y2030: ['CY', 'EL', 'ES', 'LU', 'MT'],
    y2040: ['EL', 'LU'],
    y2050: ['EL', 'LU'],
  },
];

export const NEUTRALITY_YEAR: Record<Country, number | null> = {
  AT: 2040, BE: null, BG: 2050, CY: 2050, CZ: null, DE: 2045, DK: 2050,
  EE: 2050, EL: 2050, ES: 2050, FI: 2035, FR: 2050, HR: null, HU: 2050,
  IE: 2050, IT: 2050, LT: 2050, LU: 2050, LV: 2050, MT: 2050, NL: 2050,
  PL: null, PT: 2050, RO: 2045, SE: null, SI: 2050, SK: 2050,
};

/** Member States whose neutrality year is blank in Table 1 but exists elsewhere. */
export const NEUTRALITY_ELSEWHERE: Partial<Record<Country, string>> = {
  SE: 'Net zero by 2045 is reported in Annex I Table 4 instead ("Zero net emissions").',
};

// ---------------------------------------------------------------------------
// THE MAPPING — comparable target families
// ---------------------------------------------------------------------------

export type Annex = 'I' | 'II' | 'IV';

export type Basis =
  | 'absolute'      // a level in kt / Mt CO2e or an energy unit
  | 'pct-2005'      // % change against 2005
  | 'pct-1990'      // % change against 1990
  | 'pct-other'     // % change against some other base year
  | 'share'         // a share of a total (%)
  | 'count'         // a number of things
  | 'qualitative';  // no number

export interface FamilyMember {
  cc: Country;
  /** Exactly as submitted, in the submission language. */
  nameAsSubmitted: string;
  /** English rendering, where the submission is not in English. */
  nameEn?: string;
  /** The sector field as submitted, truncated where it runs to prose. */
  sectorAsSubmitted: string;
  unitAsSubmitted: string;
  basis: Basis;
  /** 2030 target as submitted — the raw number, uncorrected. */
  target2030?: number;
  /** What has to happen before this row can sit next to the others. */
  normalisation?: string;
}

export interface TargetFamily {
  id: string;
  label: string;
  /** Which annex table the members come from. */
  annex: Annex;
  table: string;
  /** A one-line statement of what the family measures. */
  definition: string;
  members: FamilyMember[];
  /** Whether the family is directly comparable once normalised. */
  comparability: 'good' | 'partial' | 'poor';
  comment: string;
}

export const TARGET_FAMILIES: TargetFamily[] = [
  // --- Annex I: whole-economy and ESR -------------------------------------
  {
    id: 'economy-wide',
    label: 'Economy-wide GHG target',
    annex: 'I',
    table: 'Table 4',
    definition: 'A national total-emissions target covering all or nearly all sectors.',
    comparability: 'partial',
    comment:
      'Nine Member States restate a whole-economy target here that Annex I Table 1 also carries for 19 of them — so this family is mostly a duplicate, and the two copies do not always use the same scope (DE excludes LULUCF here, NL excludes international aviation, SE is net).',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national overall GHG mitigation target according to Federal Climate Change Act', sectorAsSubmitted: 'all sectors excl. LULUCF', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; convert Mt→kt' },
      { cc: 'EL', nameAsSubmitted: 'National climate neutrality target', sectorAsSubmitted: 'All sectors', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 60924.9 },
      { cc: 'FR', nameAsSubmitted: '2030 target', sectorAsSubmitted: 'all', unitAsSubmitted: 'MtCO2e', basis: 'absolute', target2030: 270, normalisation: 'convert Mt→kt' },
      { cc: 'FR', nameAsSubmitted: 'Carbon budget', sectorAsSubmitted: 'All', unitAsSubmitted: 'MtCO2eq', basis: 'absolute', target2030: 335, normalisation: 'a five-year ceiling excluding LULUCF, not a single-year level' },
      { cc: 'HU', nameAsSubmitted: 'Hungary aims to reduce its gross GHG emissions by at least 50%…', sectorAsSubmitted: 'All', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 53730.8 },
      { cc: 'NL', nameAsSubmitted: 'Climate Act: greenhouse gas reduction', sectorAsSubmitted: 'All sectors except international aviation', unitAsSubmitted: 'kt CO2eq', basis: 'absolute', target2030: 102395 },
      { cc: 'SE', nameAsSubmitted: 'Zero net emissions', sectorAsSubmitted: "All sectors within Sweden's territory", unitAsSubmitted: 'kton CO2-eq', basis: 'qualitative', normalisation: 'net zero by 2045; no 2030 value given' },
      { cc: 'EE', nameAsSubmitted: 'Net emissions of greenhouse gases (incl. the LULUCF sector) of 8 Mt CO2 eq. by 2035', sectorAsSubmitted: 'The whole economy', unitAsSubmitted: 'million tonnes of CO2 eq.', basis: 'qualitative', normalisation: 'target is in the name only; every value cell is NA' },
      { cc: 'PL', nameAsSubmitted: 'Dążenie do ograniczenia emisji krajowych emisji gazów cieplarnianych, w tym CO2', nameEn: 'Striving to limit national greenhouse gas emissions, including CO₂', sectorAsSubmitted: 'brak danych', unitAsSubmitted: 'brak danych', basis: 'qualitative', normalisation: 'translate; no target, unit or sector supplied' },
    ],
  },
  {
    id: 'esr-total',
    label: 'ESR / non-ETS total',
    annex: 'I',
    table: 'Table 4',
    definition: 'The national Effort Sharing Regulation target across all non-ETS sectors.',
    comparability: 'good',
    comment:
      'The most tractable family in Table 4 — every Member State means the same thing by it, and Annex I Table 2 carries the allocation and both projections for all 27, so the seven who restate it here can be checked against a common benchmark. Greece\'s 2030 figure is out by a factor of 1,000.',
    members: [
      { cc: 'EL', nameAsSubmitted: 'ESR target', sectorAsSubmitted: 'ESR sectors', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 47613900, normalisation: 'divide by 1,000 — decimal error; description says −22.7% vs 2005' },
      { cc: 'HR', nameAsSubmitted: 'ESR', sectorAsSubmitted: 'Non-ETS sector', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 15040.9 },
      { cc: 'HU', nameAsSubmitted: 'Under the ESR, Hungary is required to achieve a reduction of 18.7%…', sectorAsSubmitted: 'Domestic transport (excluding aviation), buildings, agriculture…', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 40544.7 },
      { cc: 'LU', nameAsSubmitted: 'National Climate Law of 15 December 2020', sectorAsSubmitted: 'GHG emissions attributed to Luxembourg under Regulation (EU) 2018/842', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 4552 },
      { cc: 'SE', nameAsSubmitted: 'Milestone target: National ESR target for 2030', sectorAsSubmitted: 'Sectors covered by the EU Effort Sharing Regulation', unitAsSubmitted: 'kton CO2-eq', basis: 'absolute', target2030: 17095, normalisation: '8 pp of the −63% may be met through supplementary measures' },
      { cc: 'SK', nameAsSubmitted: 'National reduction targets for GHG emissions not covered by the EU ETS (22.7%)', sectorAsSubmitted: 'ESR 1.A.1 … ESR 5', unitAsSubmitted: 'MtCO2e', basis: 'absolute', normalisation: 'only a 2035 value (17,885) is given, and the unit says Mt while the value is kt' },
      { cc: 'PL', nameAsSubmitted: 'Redukcja emisji gazów cieplarnianych w sektorach nieobjętych systemem ETS na poziomie -17,7% w 2030 r. w porównaniu do poziomu w roku 2005.', nameEn: 'Reduce GHG emissions in non-ETS sectors by 17.7% in 2030 against 2005', sectorAsSubmitted: 'brak danych', unitAsSubmitted: 'brak danych', basis: 'pct-2005', normalisation: 'translate; the −17.7% is in the title only, every value cell is NA' },
    ],
  },
  {
    id: 'ets-sector',
    label: 'ETS sector target',
    annex: 'I',
    table: 'Table 4',
    definition: 'A national target for emissions inside the EU ETS.',
    comparability: 'poor',
    comment: 'One Member State only. Nothing to compare against.',
    members: [
      { cc: 'HR', nameAsSubmitted: 'ETS', sectorAsSubmitted: 'ETS sector', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: 6861.4, normalisation: 'description says −62% vs 2005' },
    ],
  },

  // --- Annex I: sectoral ---------------------------------------------------
  {
    id: 'sector-transport',
    label: 'Sectoral GHG — transport',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for domestic transport, generally inside the ESR.',
    comparability: 'good',
    comment:
      'Seven Member States, seven different names, one quantity. Five give a level in kt or Mt; PT and SI give a percentage cut against 2005 written as a fraction (−0.4 = −40%). Normalise the two percentage cases and this family compares directly.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act, based on annex 2a…', sectorAsSubmitted: 'transport', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only 2022–2023 targets given' },
      { cc: 'LT', nameAsSubmitted: 'Transport sector target in non-ETS', sectorAsSubmitted: 'Transport (non-ETS)', unitAsSubmitted: 'kt CO2 eq.', basis: 'absolute', target2030: 3693 },
      { cc: 'LU', nameAsSubmitted: 'Sectoral objectives under the Climate Law - Regulation of 22 June 2022', sectorAsSubmitted: 'Transports: CRF 1A3 & 1A5', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 3053 },
      { cc: 'PT', nameAsSubmitted: 'Sectoral greenhouse gas (GHG) emission reduction target', sectorAsSubmitted: 'Transports (CRF 1A3)', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.4, normalisation: '×100 — the fraction −0.4 means −40%' },
      { cc: 'RO', nameAsSubmitted: 'Transport emissionS target', sectorAsSubmitted: 'transport', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 17400 },
      { cc: 'SE', nameAsSubmitted: 'Milestone target: Emissions from domestic transport by 2030', sectorAsSubmitted: 'Domestic transport (excluding domestic aviation…)', unitAsSubmitted: 'kton CO2-eq', basis: 'absolute', target2030: 6163, normalisation: '−70% against 2010, not 2005' },
      { cc: 'SI', nameAsSubmitted: 'ESD emissions from transport sector', sectorAsSubmitted: '1.A.3 Transport', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.01, normalisation: '×100 — the fraction −0.01 means −1%' },
    ],
  },
  {
    id: 'sector-buildings',
    label: 'Sectoral GHG — buildings',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for residential and commercial buildings (CRF 1A4).',
    comparability: 'partial',
    comment:
      'Six Member States, but the boundary moves: PT splits services from residential, SI folds in agricultural energy use, LT calls it "small scale energy". The CRF codes in the sector field are what make the match possible.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act…', sectorAsSubmitted: 'buildings', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only 2022–2023 targets given' },
      { cc: 'LT', nameAsSubmitted: 'Small scale energy emission target in non-ETS', sectorAsSubmitted: 'Small scale energy (non-ETS)', unitAsSubmitted: 'kt CO2 eq.', basis: 'absolute', target2030: 1669, normalisation: 'boundary check — "small scale energy" is broader than CRF 1A4a+b' },
      { cc: 'LU', nameAsSubmitted: 'Sectoral objectives under the Climate Law - Regulation of 22 June 2022', sectorAsSubmitted: 'Commercial/institutional & residential buildings CRF 1A4a & 1A4b', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 590 },
      { cc: 'PT', nameAsSubmitted: 'Sectoral greenhouse gas (GHG) emission reduction target', sectorAsSubmitted: 'Services (CRF 1A4a)', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.7, normalisation: '×100; services only — pair with the residential row' },
      { cc: 'PT', nameAsSubmitted: 'Sectoral greenhouse gas (GHG) emission reduction target', sectorAsSubmitted: 'Residential (CRF 1A4b)', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.35, normalisation: '×100; residential only' },
      { cc: 'RO', nameAsSubmitted: 'Buildings emissionS target', sectorAsSubmitted: 'Buildings', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 9175 },
      { cc: 'SI', nameAsSubmitted: 'ESR emissions from buildings and energy use in agriculture', sectorAsSubmitted: '1.A.4. Other sectors and 1.A.5. Other', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.69, normalisation: '×100; includes agricultural energy use' },
    ],
  },
  {
    id: 'sector-industry',
    label: 'Sectoral GHG — industry',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for manufacturing industry and industrial processes.',
    comparability: 'partial',
    comment:
      'Five Member States. LU and SI bundle energy industries or construction into the same aggregate, so the boundary needs checking before the levels are put side by side.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act…', sectorAsSubmitted: 'industry', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only 2022–2023 targets given' },
      { cc: 'LT', nameAsSubmitted: 'Industry (including industrial combustion) emission target in non-ETS', sectorAsSubmitted: 'Industry (including industrial combustion) (non-ETS)', unitAsSubmitted: 'kt CO2 eq.', basis: 'absolute', target2030: 729 },
      { cc: 'LU', nameAsSubmitted: 'Sectoral objectives under the Climate Law - Regulation of 22 June 2022', sectorAsSubmitted: 'Energy and manufacturing industries, construction: CRF 1A1a excl. waste incineration, 1A2, 1B & 2', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 242, normalisation: 'includes energy industries — not a like-for-like industry aggregate' },
      { cc: 'RO', nameAsSubmitted: 'Industry emissions target', sectorAsSubmitted: 'Industry', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 19490 },
      { cc: 'SI', nameAsSubmitted: 'ESR emissions from manufacturing ndustries and construction and industrial processes', sectorAsSubmitted: '1.A.2. Manufacturing industries and construction and 2. Industrial processes', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.4, normalisation: '×100' },
    ],
  },
  {
    id: 'sector-agriculture',
    label: 'Sectoral GHG — agriculture',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for agriculture (CRF 3, sometimes with agricultural energy use).',
    comparability: 'good',
    comment:
      'Seven Member States and the cleanest sectoral family after transport. FI uses a 2019 base year and a 2035 target date, everyone else 2005 and 2030.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act…', sectorAsSubmitted: 'agriculture', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only 2022–2023 targets given' },
      { cc: 'FI', nameAsSubmitted: 'Reduce emissions from agriculture by 29 %', sectorAsSubmitted: 'Agriculture', unitAsSubmitted: '%', basis: 'pct-other', normalisation: '−29% by 2035 against 2019 — different base year and target year' },
      { cc: 'LT', nameAsSubmitted: 'Agriculture sector target in non-ETS', sectorAsSubmitted: 'Agriculture (non-ETS)', unitAsSubmitted: 'kt CO2 eq.', basis: 'absolute', target2030: 3703 },
      { cc: 'LU', nameAsSubmitted: 'Sectoral objectives under the Climate Law - Regulation of 22 June 2022', sectorAsSubmitted: 'agriculture and forestry: CRF 1A4c & 3', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 556 },
      { cc: 'PT', nameAsSubmitted: 'Sectoral greenhouse gas (GHG) emission reduction target', sectorAsSubmitted: 'Agriculture (CRF 3 e 1A4c)', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.11, normalisation: '×100' },
      { cc: 'RO', nameAsSubmitted: 'Agriculture emission target', sectorAsSubmitted: 'Agriculture', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 19212 },
      { cc: 'SI', nameAsSubmitted: 'ESR emissions from agriculture', sectorAsSubmitted: '3. Agriculture', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.03, normalisation: '×100' },
    ],
  },
  {
    id: 'sector-waste',
    label: 'Sectoral GHG — waste',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for waste and wastewater (CRF 5).',
    comparability: 'good',
    comment:
      'Six Member States on a well-defined CRF boundary. Portugal\'s row is the one to watch: the target is a fraction while its own progress series is in absolute kt.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act…', sectorAsSubmitted: 'waste, others', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only 2022–2023 targets given' },
      { cc: 'LT', nameAsSubmitted: 'Waste management emission target in non-ETS', sectorAsSubmitted: 'Waste management (non-ETS)', unitAsSubmitted: 'kt CO2 eq.', basis: 'absolute', target2030: 524 },
      { cc: 'LU', nameAsSubmitted: 'Sectoral objectives under the Climate Law - Regulation of 22 June 2022', sectorAsSubmitted: 'waste and wastewater treatment: CRF 5 incl. waste incineration', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: 111 },
      { cc: 'PT', nameAsSubmitted: 'Sectoral greenhouse gas (GHG) emission reduction target', sectorAsSubmitted: 'Waste and wastewater (CRF 5)', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.3, normalisation: '×100; the progress series on the same row is in absolute kt' },
      { cc: 'RO', nameAsSubmitted: 'Waste emissions target', sectorAsSubmitted: 'Waste', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 4250 },
      { cc: 'SI', nameAsSubmitted: 'ESR emissions from waste', sectorAsSubmitted: '5. Waste', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.65, normalisation: '×100' },
    ],
  },
  {
    id: 'sector-energy',
    label: 'Sectoral GHG — energy supply',
    annex: 'I',
    table: 'Table 4',
    definition: 'A GHG target for energy industries and fugitive emissions (CRF 1A1, 1B).',
    comparability: 'partial',
    comment:
      'Only three Member States, and Slovenia\'s row carries absolute kt in the progress series under a "%" unit — the one place in this family where the file contradicts itself.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'national indicative target according to the Federal Climate Change Act…', sectorAsSubmitted: 'energy', unitAsSubmitted: 'Mt CO2(eq)', basis: 'absolute', normalisation: 'AR4 GWP; only a 2022 target given' },
      { cc: 'RO', nameAsSubmitted: 'Energy system target', sectorAsSubmitted: 'Energy supply plus Fugitive emissions', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: 13450 },
      { cc: 'SI', nameAsSubmitted: 'ESR emissions from energy industries and fugitive emissions', sectorAsSubmitted: '1.A.1. Energy industries and 1.B Fugitive emissions', unitAsSubmitted: '%', basis: 'pct-2005', target2030: -0.35, normalisation: '×100; progress series is in kt, not %' },
    ],
  },
  {
    id: 'lulucf',
    label: 'LULUCF net removals',
    annex: 'I',
    table: 'Tables 3 & 4',
    definition: 'A target for net greenhouse gas removals from land use and forestry.',
    comparability: 'good',
    comment:
      'Four Member States restate it in Table 4, but Table 3 carries the same quantity for all 27 — this is the one family with full coverage. The catch is what the number means: for five Member States the "commitment" is a copy of their own projection.',
    members: [
      { cc: 'HR', nameAsSubmitted: 'Target of net greenhouse gas removals in 2030', sectorAsSubmitted: 'LULUCF', unitAsSubmitted: 'ktCO2eq', basis: 'absolute', target2030: -5527 },
      { cc: 'LU', nameAsSubmitted: 'LULUCF target under the 2024 NECP update (in line with EU Regulation 2018/841: see Table 3)', sectorAsSubmitted: 'LULUCF (CRF 4).', unitAsSubmitted: 'kt CO2e', basis: 'absolute', target2030: -403 },
      { cc: 'RO', nameAsSubmitted: 'LULUCF  removals  target', sectorAsSubmitted: 'LULUCF', unitAsSubmitted: 'ktCO2e', basis: 'absolute', target2030: -49054 },
      { cc: 'PL', nameAsSubmitted: 'Udział sektora LULUCF w wypełnianiu celów redukcyjnych do 2030 roku w UE', nameEn: 'The LULUCF sector’s contribution to meeting the EU’s 2030 reduction targets', sectorAsSubmitted: 'LULUCF', unitAsSubmitted: 'Mt ekw. CO2', basis: 'qualitative', normalisation: 'translate; unit is Mt while Table 3 is kt, and every value cell is NA' },
    ],
  },
  {
    id: 'coal-phaseout',
    label: 'Coal phase-out',
    annex: 'I',
    table: 'Table 4',
    definition: 'A target to end or reduce coal use in power and heat generation.',
    comparability: 'poor',
    comment:
      'Two Member States and two incompatible metrics: Finland targets zero TWh of coal, Poland a maximum coal share of electricity output. Both are meaningful; neither can be put on the same axis.',
    members: [
      { cc: 'FI', nameAsSubmitted: 'Phasing out coal in energy production', sectorAsSubmitted: 'Energy sector', unitAsSubmitted: 'TWh (of energy use)', basis: 'absolute', target2030: 0, normalisation: 'legislated ban from 1 May 2029' },
      { cc: 'PL', nameAsSubmitted: 'Zmniejszenie udziału węgla kamiennego i brunatnego w produkcji energii elektrycznej do 56-60% w 2030 roku…', nameEn: 'Reduce the share of hard coal and lignite in electricity generation to 56–60% by 2030, falling further to 2040', sectorAsSubmitted: 'Elektroenergetyka', unitAsSubmitted: '%', basis: 'share', target2030: 56, normalisation: 'translate; a share of generation, not a volume' },
    ],
  },
  {
    id: 'clean-power',
    label: 'Decarbonised electricity',
    annex: 'I',
    table: 'Table 4',
    definition: 'A target for the carbon intensity or renewable share of electricity supply.',
    comparability: 'poor',
    comment: 'Two Member States, two units — kg CO₂/kWh against a renewable share.',
    members: [
      { cc: 'NL', nameAsSubmitted: 'Climate Act: CO2-neutral electricity production in 2035', sectorAsSubmitted: 'Electricity', unitAsSubmitted: 'kg CO2 / kWh produced', basis: 'absolute', normalisation: '2035 target of 0; 2023 actual 0.22' },
      { cc: 'LU', nameAsSubmitted: 'Renewable energy sources target under the the 2024 NECP update', sectorAsSubmitted: 'Electricity', unitAsSubmitted: 'Share of RES in FEC (%) - incl. cooperation measures', basis: 'share', target2030: 39.1 },
    ],
  },
  {
    id: 'ghg-intensity',
    label: 'GHG intensity of GDP',
    annex: 'I',
    table: 'Table 4',
    definition: 'Emissions per unit of economic output.',
    comparability: 'poor',
    comment: 'One Member State, on an index base of 1960 = 100%.',
    members: [
      { cc: 'HU', nameAsSubmitted: 'Continuous reduction of the GHG intensity of GDP', sectorAsSubmitted: 'All', unitAsSubmitted: 'ktCO2eq/GDP volume (1960=100%)', basis: 'pct-other', normalisation: 'index on a 1960 base; no target value given' },
    ],
  },

  // --- Annex II: RES -------------------------------------------------------
  {
    id: 'res-district-heating',
    label: 'Renewables in district heating',
    annex: 'II',
    table: 'Table 7',
    definition: 'The renewable share of, or renewable energy delivered by, district heating and cooling.',
    comparability: 'partial',
    comment:
      'The best-populated standardised RES category — twelve Member States name it, but only four give both a number and a target, across six different units. LT and DE write the target as a fraction (0.9, 0.45) while LV and HR write a percentage (73.9, 20.9), in the same column.',
    members: [
      { cc: 'DE', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'percent', basis: 'share', target2030: 0.45, normalisation: '×100 — the fraction 0.45 means 45%' },
      { cc: 'LT', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 0.9, normalisation: '×100 — the fraction 0.9 means 90%' },
      { cc: 'LV', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 73.9 },
      { cc: 'HR', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 20.9, normalisation: 'reported progress is 0.1% in both years — check, this looks like an error' },
      { cc: 'FR', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'TWh', basis: 'absolute', normalisation: 'target "31 to 36 TWh" for 2028, as prose; a volume, not a share' },
      { cc: 'IT', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'Mtep', basis: 'absolute', normalisation: 'progress only, no target; a volume, not a share' },
      { cc: 'RO', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'ktoe', basis: 'absolute', normalisation: 'target is prose ("9.4% of energy used in district heating"); progress is installed capacity in ktoe' },
      { cc: 'HU', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: '(+/-)%points (compared to previous year)', basis: 'pct-other', normalisation: 'an annual rate of change, not a level' },
      { cc: 'ES', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative', normalisation: 'NA in every field' },
      { cc: 'SI', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative', normalisation: 'NA in every field' },
      { cc: 'SK', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative', normalisation: 'every field blank' },
      { cc: 'PL', nameAsSubmitted: 'Renewable energy use in district heating', sectorAsSubmitted: '—', unitAsSubmitted: 'Nie dotyczy', basis: 'qualitative', normalisation: '"Nie dotyczy" = not applicable' },
    ],
  },
  {
    id: 'res-buildings',
    label: 'Renewables in buildings',
    annex: 'II',
    table: 'Table 7',
    definition: 'The renewable share of energy used in buildings.',
    comparability: 'partial',
    comment:
      'Ten Member States name it, three give a comparable pair. Greece writes the target as 0.722 against progress values of 40.7% and 44.5% — fraction against percent within one row.',
    members: [
      { cc: 'EL', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 0.722, normalisation: '×100; progress on the same row is already in percent' },
      { cc: 'HR', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 65.1 },
      { cc: 'LV', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '%', basis: 'share', target2030: 65 },
      { cc: 'FR', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: 'TWh', basis: 'absolute', normalisation: 'target "44 to 52 TWh" for 2028; indicator is heat-pump output, not a share' },
      { cc: 'HU', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '(+/-)%points (compared to previous year)', basis: 'pct-other', normalisation: 'an annual rate of change' },
      { cc: 'ES', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SI', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SK', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative' },
      { cc: 'PL', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: 'brak danych', basis: 'qualitative', normalisation: '"brak danych" = no data' },
      { cc: 'RO', nameAsSubmitted: 'Renewable energy use in buildings', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative', normalisation: 'target is a paragraph of renovation milestones' },
    ],
  },
  {
    id: 'res-self-consumers',
    label: 'Renewables self-consumers',
    annex: 'II',
    table: 'Table 7',
    definition: 'The number or capacity of renewable self-consumers (prosumers).',
    comparability: 'poor',
    comment:
      'Seven Member States, four units — a headcount, a capacity in MW and an energy flow in PJ/a. Poland already has 1.38 m prosumers against a one-million 2030 target, so its target was passed before the reporting period began.',
    members: [
      { cc: 'LT', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'number of prosumers', basis: 'count', target2030: 300000 },
      { cc: 'PL', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'Liczba', basis: 'count', normalisation: 'target "1 mln prosumentów" as prose; 2023 progress 1,383,480 — already exceeded' },
      { cc: 'RO', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'MW', basis: 'absolute', normalisation: 'target "at least 3500 MW" as prose; capacity, not headcount' },
      { cc: 'HU', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'PJ/a', basis: 'absolute', normalisation: 'an energy flow, not a headcount or capacity' },
      { cc: 'ES', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SI', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SK', nameAsSubmitted: 'Renewables self-consumers', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative' },
    ],
  },
  {
    id: 'res-communities',
    label: 'Renewable energy communities',
    annex: 'II',
    table: 'Table 7',
    definition: 'The number or capacity of renewable energy communities.',
    comparability: 'poor',
    comment: 'Seven Member States, no comparable pair at all — units split between a count and a capacity, and every target is prose.',
    members: [
      { cc: 'PL', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'Liczba', basis: 'count', normalisation: 'target "Do 300 społeczności energetycznych do 2030 r." = up to 300 communities by 2030' },
      { cc: 'IT', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'MW', basis: 'absolute', normalisation: 'target "5 GW di capacità delle configurazioni supportate" by 2027' },
      { cc: 'HU', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'pcs/a', basis: 'count', normalisation: 'new communities per year, not a stock' },
      { cc: 'RO', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'MW', basis: 'absolute', normalisation: 'target is a description of legislative intent; progress 0 MW in both years' },
      { cc: 'ES', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SI', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: 'NA', basis: 'qualitative' },
      { cc: 'SK', nameAsSubmitted: 'Renewable energy communities', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative' },
    ],
  },
  {
    id: 'res-cities',
    label: 'Renewable energy produced by cities',
    annex: 'II',
    table: 'Table 7',
    definition: 'Renewable energy generated by or within municipalities.',
    comparability: 'poor',
    comment: 'Six Member States name the category and not one supplies a number.',
    members: (['ES', 'HU', 'PL', 'RO', 'SI', 'SK'] as Country[]).map((cc) => ({
      cc,
      nameAsSubmitted: 'Renewable energy produced by cities',
      sectorAsSubmitted: '—',
      unitAsSubmitted: cc === 'PL' ? 'brak danych' : cc === 'ES' || cc === 'SI' ? 'NA' : '—',
      basis: 'qualitative' as Basis,
      normalisation: 'no target, no indicator, no value',
    })),
  },
  {
    id: 'res-sludge',
    label: 'Energy from sewage sludge',
    annex: 'II',
    table: 'Table 7',
    definition: 'Energy recovered from sludge produced by wastewater treatment.',
    comparability: 'poor',
    comment: 'Five Member States, one number between them (HU, 16 MW in 2023).',
    members: (['ES', 'HU', 'PL', 'SI', 'SK'] as Country[]).map((cc) => ({
      cc,
      nameAsSubmitted: 'Energy recovered from the sludge acquired through the treatment of wastewater',
      sectorAsSubmitted: '—',
      unitAsSubmitted: cc === 'HU' ? 'MW' : cc === 'PL' ? 'brak danych' : cc === 'ES' || cc === 'SI' ? 'NA' : '—',
      basis: cc === 'HU' ? ('absolute' as Basis) : ('qualitative' as Basis),
      normalisation: cc === 'HU' ? 'progress only (16 MW in 2023), target is prose' : 'no target, no indicator, no value',
    })),
  },
  {
    id: 'res-overall',
    label: 'Overall / sectoral RES share',
    annex: 'II',
    table: 'Table 7 + Annex I Table 4',
    definition: 'The renewable share of gross final energy consumption, overall or by sector.',
    comparability: 'good',
    comment:
      'Only Luxembourg and Romania put this in the "other objectives" tables — but Annex II Table 1 carries overall and sectoral RES shares for all 27, so this family has full coverage from the structured part of the workbook. Use that, not this.',
    members: [
      { cc: 'LU', nameAsSubmitted: 'Renewable energy sources target under the 2024 NECP update', sectorAsSubmitted: 'Overall (gross final energy consumption)', unitAsSubmitted: 'Share of RES in FEC (%)', basis: 'share', target2030: 37 },
      { cc: 'LU', nameAsSubmitted: 'Renewable energy sources target under the the 2024 NECP update', sectorAsSubmitted: 'Heat', unitAsSubmitted: 'Share of RES in FEC (%)', basis: 'share', target2030: 40.1 },
      { cc: 'LU', nameAsSubmitted: 'Renewable energy sources target under the the 2024 NECP update', sectorAsSubmitted: 'Transport', unitAsSubmitted: 'Share of RES in FEC (%)', basis: 'share', target2030: 27.1 },
      { cc: 'RO', nameAsSubmitted: 'Renewable Energy emissions target', sectorAsSubmitted: 'Energy', unitAsSubmitted: '%', basis: 'share', target2030: 38.28, normalisation: 'declared unit is %, but the progress series is in ktCO2e' },
      { cc: 'FI', nameAsSubmitted: 'Promoting the use of renewable fuels in the transport sector', sectorAsSubmitted: 'Transport', unitAsSubmitted: '%', basis: 'share', target2030: 34, normalisation: 'a road-transport blending obligation, not a RES-T share on the RED definition' },
    ],
  },

  // --- Annex IV: EE --------------------------------------------------------
  {
    id: 'ee-final-energy',
    label: 'Final energy consumption cap',
    annex: 'IV',
    table: 'Table 6 + Annex I Table 4',
    definition: 'A ceiling on national final energy consumption.',
    comparability: 'good',
    comment:
      'Four Member States state it in the "other objectives" tables in four units — TWh, ktoe, PJ and GWh — but the quantity is identical and Annex IV Table 1 carries it for all 27 in a structured form. Convert and this compares cleanly.',
    members: [
      { cc: 'SI', nameAsSubmitted: 'In 2030, final energy use will be lower than 50,2 TWh (4.320 ktoe)', sectorAsSubmitted: '—', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 50.2, normalisation: '2023 actual 52.2 TWh, stated in the progress text' },
      { cc: 'HU', nameAsSubmitted: 'Final energy consumption', sectorAsSubmitted: '—', unitAsSubmitted: 'PJ (in prose)', basis: 'absolute', target2030: 740, normalisation: 'convert PJ→TWh; no progress value given' },
      { cc: 'FR', nameAsSubmitted: 'Consommation énergétique finale', nameEn: 'Final energy consumption', sectorAsSubmitted: 'France entière', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 1243, normalisation: 'translate; 2023 actual 1,509 TWh, buried in the progress text' },
      { cc: 'LU', nameAsSubmitted: 'Energy efficiency target under the 2024 NECP update', sectorAsSubmitted: 'All end uses', unitAsSubmitted: 'FEC in GWh', basis: 'absolute', target2030: 36949, normalisation: 'reported in Annex I Table 4, not Annex IV' },
    ],
  },
  {
    id: 'ee-primary-energy',
    label: 'Primary energy consumption',
    annex: 'IV',
    table: 'Table 6',
    definition: 'A ceiling on national primary energy consumption, in total or by fuel.',
    comparability: 'partial',
    comment:
      'France alone, but in unusual detail — a total plus a per-fuel breakdown with 2022 and 2023 actuals. Petroleum products and total primary energy both rose between 2022 and 2023.',
    members: [
      { cc: 'FR', nameAsSubmitted: 'Consommation d’énergie primaire', nameEn: 'Primary energy consumption', sectorAsSubmitted: 'France entière', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 1844, normalisation: 'translate; 2023 actual 2,419 TWh — up from 2,376 in 2022' },
      { cc: 'FR', nameAsSubmitted: 'Consommation d’énergie primaire à usage énergétique – Charbon', nameEn: 'Primary energy consumption — coal', sectorAsSubmitted: 'France Continentale', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 26, normalisation: 'translate; 2023 actual 49 TWh' },
      { cc: 'FR', nameAsSubmitted: 'Consommation d’énergie primaire à usage énergétique – Gaz naturel', nameEn: 'Primary energy consumption — natural gas', sectorAsSubmitted: 'France Continentale', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 260, normalisation: 'translate; 2023 actual 358 TWh' },
      { cc: 'FR', nameAsSubmitted: 'Consommation d’énergie primaire à usage énergétique – Produits pétroliers', nameEn: 'Primary energy consumption — petroleum products', sectorAsSubmitted: 'France Continentale', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 359, normalisation: 'translate; 2023 actual 597 TWh — up from 593 in 2022' },
    ],
  },
  {
    id: 'ee-buildings',
    label: 'Building-stock energy reduction',
    annex: 'IV',
    table: 'Table 6',
    definition: 'A target to cut energy use in the residential or whole building stock.',
    comparability: 'partial',
    comment:
      'Three Member States on three different bases — a percentage against 2020 (SI), a percentage against a 2018–2020 average (HU) and a count of retrofitted buildings (IE). The percentages can be aligned; the count cannot.',
    members: [
      { cc: 'SI', nameAsSubmitted: 'Reduction of final energy use in buildings by 15% by 2030 compared to 2020', sectorAsSubmitted: '—', unitAsSubmitted: '% (in prose)', basis: 'pct-other', target2030: -15, normalisation: '2023 progress −3.8%, stated in prose' },
      { cc: 'HU', nameAsSubmitted: 'Energy use of residential building stock compared to 2018-2020 average', sectorAsSubmitted: '—', unitAsSubmitted: '% (in prose)', basis: 'pct-other', target2030: -20, normalisation: 'base is a three-year average; no progress value' },
      { cc: 'IE', nameAsSubmitted: 'Buildings - retrofit', sectorAsSubmitted: '—', unitAsSubmitted: 'dwellings (in prose)', basis: 'count', target2030: 500000, normalisation: '201,000 upgrades 2019–2024, of which 65,000 to B2' },
    ],
  },
  {
    id: 'ee-public-sector',
    label: 'Public-sector energy',
    annex: 'IV',
    table: 'Table 6',
    definition: 'A target for energy use or renovation in public buildings and the public sector.',
    comparability: 'partial',
    comment:
      'Four Member States and four metrics: an annual rate (SI), a level against a 2018–2020 average (HU), a paired efficiency-and-emissions percentage (IE) and a floor area renovated per year (EL). Article 5 EED gives the common anchor if anyone wants to align them.',
    members: [
      { cc: 'SI', nameAsSubmitted: 'Reduction of final energy use in the public sector by 1.9% annually compared to 2021', sectorAsSubmitted: '—', unitAsSubmitted: '%/year (in prose)', basis: 'pct-other', normalisation: 'progress text says the reduction "is not yet being monitored"' },
      { cc: 'HU', nameAsSubmitted: 'Energy consumption of public building stock compared to 2018-2020 average', sectorAsSubmitted: '—', unitAsSubmitted: '% (in prose)', basis: 'pct-other', target2030: -18 },
      { cc: 'IE', nameAsSubmitted: 'Public sector – energy efficiency', sectorAsSubmitted: '—', unitAsSubmitted: '% (in prose)', basis: 'pct-other', target2030: -50, normalisation: '50% efficiency and 51% emission reduction by 2030; register still being built' },
      { cc: 'EL', nameAsSubmitted: 'Annually renovate 3% of the total floor area of public buildings', sectorAsSubmitted: '—', unitAsSubmitted: 'm²/year (in prose)', basis: 'share', normalisation: '5,400 m²/year; progress reads "Fulfilled" — the Hellenic Parliament building' },
    ],
  },
  {
    id: 'ee-heating',
    label: 'Heating decarbonisation',
    annex: 'IV',
    table: 'Table 6',
    definition: 'Heat-pump deployment, fossil-boiler phase-out and renewable heat.',
    comparability: 'poor',
    comment:
      'Two Member States, and Ireland\'s five heating entries are programme narratives rather than targets. The only two numbers are Ireland\'s 680,000 heat pumps by 2030 and France\'s 297 TWh of renewable heat.',
    members: [
      { cc: 'IE', nameAsSubmitted: 'Heating – heat pumps', sectorAsSubmitted: '—', unitAsSubmitted: 'units (in prose)', basis: 'count', target2030: 680000, normalisation: '~14,500 installed under SEAI schemes 2019–Jan 2025' },
      { cc: 'IE', nameAsSubmitted: 'Heating - boilers', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative', normalisation: 'phase-out roadmap to 2040; no quantified target' },
      { cc: 'IE', nameAsSubmitted: 'Heating - geothermal', sectorAsSubmitted: '—', unitAsSubmitted: '—', basis: 'qualitative', normalisation: 'expected impact reads "N/A. To date, no targets have been set."' },
      { cc: 'FR', nameAsSubmitted: 'Production de chaleur et de froid renouvelable', nameEn: 'Renewable heating and cooling production', sectorAsSubmitted: 'France Continentale', unitAsSubmitted: 'TWh (in prose)', basis: 'absolute', target2030: 297, normalisation: 'translate; 2023 actual 183 TWh' },
    ],
  },

  // --- outside the climate frame ------------------------------------------
  {
    id: 'non-climate',
    label: 'Non-climate environmental objectives',
    annex: 'I',
    table: 'Table 4',
    definition: 'Objectives submitted to the GHG table that do not measure greenhouse gases.',
    comparability: 'poor',
    comment:
      'Sixteen of Poland\'s twenty-three Table 4 entries. They are real national objectives, but they belong to air quality, water, waste and nature policy — filter them out before any GHG comparison, or Poland looks like the most prolific reporter in the table.',
    members: [
      { cc: 'PL', nameAsSubmitted: 'Całkowita redukcja liczby stref z przekroczeniami poziomu dopuszczalnego pyłu PM10', nameEn: 'Eliminate all zones exceeding the PM10 limit value', sectorAsSubmitted: 'ochrona powietrza', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie do 30 liczby aglomeracji i miast powyżej 100 tys. mieszkańców…', nameEn: 'Raise to 30 the number of cities over 100k meeting the PM2.5 exposure ceiling', sectorAsSubmitted: 'ochrona powietrza', unitAsSubmitted: 'szt.', basis: 'count' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie odsetka ludności korzystającej z sieci kanalizacyjnej…', nameEn: 'Raise the share of the population connected to sewerage to 85%', sectorAsSubmitted: 'gospodarka komunalna', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie odsetka ludności korzystającej z oczyszczalni ścieków do 86%…', nameEn: 'Raise the share of the population served by wastewater treatment to 86%', sectorAsSubmitted: 'gospodarka komunalna', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Poziom przygotowania do ponownego użycia i recyklingu odpadów komunalnych 60% wagowo', nameEn: 'Municipal waste reuse and recycling rate of 60% by weight', sectorAsSubmitted: 'Gospodarka odpadami', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Objęcie 100% obszarów Natura 2000, dla których ustanowione zostały plany…', nameEn: 'Conservation plans in place for 100% of Natura 2000 sites', sectorAsSubmitted: 'Ochrona przyrody', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie pojemności obiektów małej retencji wodnej…', nameEn: 'Increase small water-retention capacity to ~844,836 dam³', sectorAsSubmitted: 'Gospodarka wodna', unitAsSubmitted: 'dam3', basis: 'absolute' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie do 60% odsetka mieszkańców polskich miast objętych miejskimi planami adaptacji…', nameEn: 'Raise to 60% the share of urban residents covered by local climate-adaptation plans', sectorAsSubmitted: 'Miasta', unitAsSubmitted: '%', basis: 'share' },
      { cc: 'PL', nameAsSubmitted: 'Wzrost poziomu lesistości kraju do 31% z obecnych 29,6%', nameEn: 'Raise national forest cover from 29.6% to 31%', sectorAsSubmitted: 'LULUCF', unitAsSubmitted: '%', basis: 'share', normalisation: 'tagged LULUCF, but it is a land-cover indicator, not a removals target' },
      { cc: 'PL', nameAsSubmitted: 'Zwiększenie wskaźnika wydajności środowiskowej >70 pkt.', nameEn: 'Raise the Environmental Performance Index above 70 points', sectorAsSubmitted: 'Środowiskowy', unitAsSubmitted: 'pkt', basis: 'count' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data-quality flags worth surfacing individually
// ---------------------------------------------------------------------------

export type FlagSeverity = 'error' | 'structural' | 'comparability';

export interface QualityFlag {
  severity: FlagSeverity;
  where: string;
  countries: string;
  headline: string;
  detail: string;
}

export const QUALITY_FLAGS: QualityFlag[] = [
  {
    severity: 'error',
    where: 'Annex I, Table 2',
    countries: 'all 27',
    headline: 'The allocation series is in Mt but labelled kt, so the table’s own gap column subtracts kt from Mt',
    detail:
      'Austria’s 2030 annual emission allocation reads 36.14 against 2030 WAM Effort Sharing emissions of 34,223.4. The reported 2030 WAM difference is −34,187.25 — exactly 36.14 − 34,223.40. Every pre-calculated difference value in the table is affected. Separately, the allocation trajectory implies −28% on 2005, which is the pre-2023 ESR vintage, not the −40% of the current one.',
  },
  {
    severity: 'error',
    where: 'Annex I, Table 1',
    countries: 'HU, IE',
    headline: 'Three national targets are out by an order of magnitude',
    detail:
      'Hungary’s 2030 target reads 475,000 kt excluding LULUCF and 412,000 kt including it, against its own projections of 53,731 and 48,788 kt. Ireland’s 2030 including-LULUCF target reads 335,000 kt against a 59,837 kt projection. All three flow into the reported gap column, which then shows both Member States comfortably beating targets they are not beating.',
  },
  {
    severity: 'error',
    where: 'Annex I, Table 4',
    countries: 'EL',
    headline: 'The ESR target is out by a factor of 1,000',
    detail:
      'Greece reports 47,613,900 for 2030 and 48,687,500 for 2035 against current progress of about 46,000 ktCO₂eq. The description gives the real target: −22.7% on 2005.',
  },
  {
    severity: 'structural',
    where: 'Annex IV, Table 6',
    countries: 'all 27',
    headline: 'The table has no unit, year or value column',
    detail:
      'Every objective, its target and its progress are free text. Nothing in it is machine-comparable by construction, and only 11 of the 29 substantive rows contain a number with a unit anywhere in their prose. For contrast, Annex IV Table 1 — the national energy-consumption contribution — is structured and complete.',
  },
  {
    severity: 'structural',
    where: 'Annex I, Table 1',
    countries: 'all 27',
    headline: 'One column carries two different quantities',
    detail:
      'Target_year_for_climate_neutrality holds a year on the "Climate neutrality" rows and the NECP removals figure on the "Role of removals" rows. A parser that reads the column by name gets both mixed together.',
  },
  {
    severity: 'comparability',
    where: 'Annex I, Table 4',
    countries: 'PT, SI',
    headline: 'Percentage targets written as fractions',
    detail:
      'Portugal’s sectoral targets read −0.7, −0.35, −0.4 for what the descriptions confirm are −70%, −35% and −40% against 2005. Slovenia does the same. In both files at least one row of the set then carries absolute kt in the progress series while the target stays a fraction.',
  },
  {
    severity: 'comparability',
    where: 'Annex I, Table 4',
    countries: 'all reporting',
    headline: '65 sector labels and 22 unit strings for 88 objectives',
    detail:
      'The sector field ranges from CRF codes to 200-character prose to "brak danych". The unit field includes four spellings of kt CO₂e, three of Mt CO₂e, and entries that are not units at all: pkt, szt., dam3, and "Share of RES in FEC (%) - incl. cooperation measures". GWP mixes AR5 (290 rows) and AR4 (150 rows).',
  },
  {
    severity: 'comparability',
    where: 'Annex II, Table 7',
    countries: 'all reporting',
    headline: 'The objective type is standardised; the indicator and unit are not',
    detail:
      'District heating alone appears in six units — %, percent, TWh, ktoe, Mtep and %points per year. Targets are prose in 34 rows. Where they are numeric they mix fractions and percentages in the same column: LT 0.9 and DE 0.45 against LV 73.9 and HR 20.9.',
  },
  {
    severity: 'comparability',
    where: 'Annex I Table 4, Annex IV Table 6',
    countries: 'PL, FR',
    headline: 'Two Member States submit untranslated',
    detail:
      'Poland’s 23 Annex I Table 4 entries are in Polish, 13 of them with "brak danych" (no data) in the description, unit and sector fields. France’s 6 Annex IV Table 6 entries are in French — and are the most extractable content in that table. Both are mechanically translatable; neither is matchable by name against an English submission.',
  },
  {
    severity: 'comparability',
    where: 'Annex I, Table 3',
    countries: 'BE, FR, NL, PL',
    headline: 'Four LULUCF commitments submitted in Mt into a kt column',
    detail:
      'Belgium reports −1, France −18, the Netherlands 5.4 and Poland 92, against projections in the thousands. Fourteen distinct unit strings appear in this one column.',
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const FAMILY_COUNTRIES = (f: TargetFamily): Country[] =>
  Array.from(new Set(f.members.map((m) => m.cc))).sort();

export const COMPARABILITY_META: Record<TargetFamily['comparability'], { label: string; tone: string }> = {
  good: { label: 'Comparable', tone: 'good' },
  partial: { label: 'Comparable with care', tone: 'partial' },
  poor: { label: 'Not comparable', tone: 'poor' },
};
