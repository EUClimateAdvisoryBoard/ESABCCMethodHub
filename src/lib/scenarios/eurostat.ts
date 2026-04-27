/**
 * Eurostat data source for the Scenario Explorer.
 *
 * Eurostat exposes a fully open REST API (no auth, no rate limit beyond a
 * ~300k cell-per-call cap) that returns JSON-stat 2.0 documents.
 *
 *   Base: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}
 *
 * We map a curated set of Eurostat datasets onto IIASA-style variable names
 * (e.g. "Emissions|Kyoto Gases", "Population") so the existing dashboard
 * presets and charts in ScenarioExplorer.tsx can consume them without
 * special-casing.
 *
 * Each Eurostat variable produces a single synthetic "run" — Eurostat is
 * historical observation data, not a model projection, so there is one
 * series per (variable, region) combination. The chart UI labels the
 * series as "Eurostat | Historical".
 */

const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

// ── Variable registry ──────────────────────────────────────────────────────
//
// Maps an IIASA-style variable name (the key the frontend already uses
// in DASHBOARD_PRESETS) to the Eurostat dataset code plus the additional
// dimension filters needed to reduce the response to a clean year×geo cube.

export interface EurostatVariableSpec {
  /** Eurostat dataset code, e.g. "env_air_gge" */
  code: string;
  /** Human-readable label for the chart unit/title */
  label: string;
  /** Reported unit string */
  unit: string;
  /** Extra dimension filters to apply (e.g. {src_crf: 'TOTX4_MEMO', airpol: 'GHG'}) */
  filters?: Record<string, string>;
  /** Optional value scale factor (e.g. convert from kt to Mt) */
  scale?: number;
  /** Description shown in the variable picker */
  description?: string;
  /** Group used to organise the variable picker UI */
  group: EurostatGroup;
}

// ── Eurostat URL helpers ────────────────────────────────────────────────────
//
// Every Eurostat dataset is assigned a persistent DOI under the 10.2908 prefix.
// If DOI resolution fails (unlikely), the direct databrowser link is a reliable
// fallback that always resolves to the dataset's page.

/** Eurostat DOI link for a dataset (e.g. "env_air_gge" → "https://doi.org/10.2908/env_air_gge"). */
export function eurostatDoiUrl(code: string): string {
  return `https://doi.org/10.2908/${code}`;
}

/** Direct Eurostat database browser link for a dataset. */
export function eurostatBrowserUrl(code: string): string {
  return `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`;
}

/** Variable groupings used by the explorer UI. */
export type EurostatGroup =
  | 'Climate & emissions'
  | 'Energy'
  | 'Economy'
  | 'Population & society'
  | 'Transport'
  | 'Agriculture & land'
  | 'Industry'
  | 'Environment';

export const EUROSTAT_GROUPS: EurostatGroup[] = [
  'Climate & emissions',
  'Energy',
  'Economy',
  'Population & society',
  'Transport',
  'Agriculture & land',
  'Industry',
  'Environment',
];

export const EUROSTAT_VARIABLES: Record<string, EurostatVariableSpec> = {
  // ── Climate & emissions ──────────────────────────────────────────────
  'Emissions|Kyoto Gases': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions (UNFCCC inventory, excl. LULUCF)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'GHG', unit: 'THS_T' },
    description: 'Total GHG emissions in CO2-equivalent, excluding LULUCF',
  },
  'Emissions|Kyoto Gases incl. LULUCF': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions including LULUCF',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOT', airpol: 'GHG', unit: 'THS_T' },
    description: 'Total GHG emissions including LULUCF',
  },
  'Emissions|CO2': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'CO2 emissions (excl. LULUCF)',
    unit: 'kt CO2',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'CO2', unit: 'THS_T' },
    description: 'CO2 emissions excluding LULUCF (UNFCCC reporting)',
  },
  'Emissions|CH4': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'CH4 emissions',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'CH4_CO2E', unit: 'THS_T' },
    description: 'Methane emissions in CO2-equivalent terms',
  },
  'Emissions|N2O': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'N2O emissions',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'N2O_CO2E', unit: 'THS_T' },
    description: 'Nitrous oxide emissions in CO2-equivalent terms',
  },
  'Emissions|HFC': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'HFC emissions',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'HFC', unit: 'THS_T' },
    description: 'Hydrofluorocarbon F-gas emissions',
  },
  'Emissions|PFC': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'PFC emissions',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'PFC', unit: 'THS_T' },
    description: 'Perfluorocarbon F-gas emissions',
  },
  'Emissions|SF6': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'SF6 emissions',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'TOTX4_MEMO', airpol: 'SF6', unit: 'THS_T' },
    description: 'Sulphur hexafluoride emissions',
  },
  'Emissions|Energy sector': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions — energy sector (CRF1)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'CRF1', airpol: 'GHG', unit: 'THS_T' },
    description: 'GHG emissions from CRF1 — fuel combustion + fugitive',
  },
  'Emissions|Industrial processes': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions — industrial processes (CRF2)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'CRF2', airpol: 'GHG', unit: 'THS_T' },
    description: 'GHG emissions from CRF2 — industrial processes & product use',
  },
  'Emissions|Agriculture': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions — agriculture (CRF3)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'CRF3', airpol: 'GHG', unit: 'THS_T' },
    description: 'GHG emissions from CRF3 — agriculture',
  },
  'Emissions|LULUCF': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG flux — LULUCF (CRF4)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'CRF4', airpol: 'GHG', unit: 'THS_T' },
    description: 'Land-use, land-use change and forestry net flux',
  },
  'Emissions|Waste': {
    group: 'Climate & emissions',
    code: 'env_air_gge',
    label: 'GHG emissions — waste (CRF5)',
    unit: 'kt CO2-eq',
    filters: { src_crf: 'CRF5', airpol: 'GHG', unit: 'THS_T' },
    description: 'GHG emissions from CRF5 — waste management',
  },

  // ── Energy ────────────────────────────────────────────────────────────
  'Primary Energy': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Primary energy consumption',
    unit: 'TJ',
    filters: { nrg_bal: 'PEC2020-2030', siec: 'TOTAL', unit: 'TJ' },
    description: 'Primary energy consumption (Europe 2020/2030 indicator)',
  },
  'Final Energy': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Final energy consumption',
    unit: 'TJ',
    filters: { nrg_bal: 'FEC2020-2030', siec: 'TOTAL', unit: 'TJ' },
    description: 'Final energy consumption (Europe 2020/2030 indicator)',
  },
  'Final Energy|Industry': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Final energy consumption — industry',
    unit: 'TJ',
    filters: { nrg_bal: 'FC_IND_E', siec: 'TOTAL', unit: 'TJ' },
    description: 'Final energy consumption in industry',
  },
  'Final Energy|Transport': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Final energy consumption — transport',
    unit: 'TJ',
    filters: { nrg_bal: 'FC_TRA_E', siec: 'TOTAL', unit: 'TJ' },
    description: 'Final energy consumption in transport',
  },
  'Final Energy|Households': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Final energy consumption — households',
    unit: 'TJ',
    filters: { nrg_bal: 'FC_OTH_HH_E', siec: 'TOTAL', unit: 'TJ' },
    description: 'Final energy consumption in households',
  },
  'Final Energy|Services': {
    group: 'Energy',
    code: 'nrg_bal_c',
    label: 'Final energy consumption — services',
    unit: 'TJ',
    filters: { nrg_bal: 'FC_OTH_CP_E', siec: 'TOTAL', unit: 'TJ' },
    description: 'Final energy consumption in commercial & public services',
  },
  'Renewable Share|Total': {
    group: 'Energy',
    code: 'nrg_ind_ren',
    label: 'Share of renewables in gross final consumption',
    unit: '%',
    filters: { nrg_bal: 'REN' },
    description: 'Overall renewable energy share under the RES directive',
  },
  'Renewable Share|Electricity': {
    group: 'Energy',
    code: 'nrg_ind_ren',
    label: 'Share of renewables in electricity',
    unit: '%',
    filters: { nrg_bal: 'REN_ELC' },
    description: 'Renewable share of electricity',
  },
  'Renewable Share|Heating': {
    group: 'Energy',
    code: 'nrg_ind_ren',
    label: 'Share of renewables in heating & cooling',
    unit: '%',
    filters: { nrg_bal: 'REN_HEAT_CL' },
    description: 'Renewable share of heating & cooling',
  },
  'Renewable Share|Transport': {
    group: 'Energy',
    code: 'nrg_ind_ren',
    label: 'Share of renewables in transport',
    unit: '%',
    filters: { nrg_bal: 'REN_TRA' },
    description: 'Renewable share of transport energy',
  },
  'Energy Imports|Dependency': {
    group: 'Energy',
    code: 'nrg_ind_id',
    label: 'Energy import dependency (all products)',
    unit: '%',
    filters: { siec: 'TOTAL', nrg_bal: 'IDEP' },
    description: 'Imports / (gross available energy + intl bunkers)',
  },
  'Price|Electricity|Households': {
    group: 'Energy',
    code: 'nrg_pc_204',
    label: 'Electricity price — households (band DC, incl. taxes)',
    unit: 'EUR/kWh',
    filters: { product: '6000', consom: '4161901', unit: 'KWH', tax: 'I_TAX', currency: 'EUR' },
    description: 'Band DC: 2 500–5 000 kWh, all taxes included',
  },
  'Price|Electricity|Industry': {
    group: 'Energy',
    code: 'nrg_pc_205',
    label: 'Electricity price — industry (band IC, excl. VAT)',
    unit: 'EUR/kWh',
    filters: { product: '6000', consom: '4162900', unit: 'KWH', tax: 'X_VAT', currency: 'EUR' },
    description: 'Band IC: 500–2 000 MWh, excl. VAT',
  },
  'Price|Gas|Households': {
    group: 'Energy',
    code: 'nrg_pc_202',
    label: 'Natural gas price — households (band D2, incl. taxes)',
    unit: 'EUR/kWh',
    filters: { product: '4100', consom: '4141902', unit: 'KWH', tax: 'I_TAX', currency: 'EUR' },
    description: 'Band D2: 20–200 GJ, all taxes included',
  },
  'Price|Gas|Industry': {
    group: 'Energy',
    code: 'nrg_pc_203',
    label: 'Natural gas price — industry (band I3, excl. VAT)',
    unit: 'EUR/kWh',
    filters: { product: '4100', consom: '4142902', unit: 'KWH', tax: 'X_VAT', currency: 'EUR' },
    description: 'Band I3: 10 000–100 000 GJ, excl. VAT',
  },

  // ── Economy ──────────────────────────────────────────────────────────
  'GDP|MER': {
    group: 'Economy',
    code: 'nama_10_gdp',
    label: 'GDP (chain-linked volumes, 2015 prices)',
    unit: 'million EUR',
    filters: { unit: 'CLV15_MEUR', na_item: 'B1GQ' },
    description: 'Gross domestic product at market prices',
  },
  'GDP|Current prices': {
    group: 'Economy',
    code: 'nama_10_gdp',
    label: 'GDP (current prices)',
    unit: 'million EUR',
    filters: { unit: 'CP_MEUR', na_item: 'B1GQ' },
    description: 'GDP at current market prices',
  },
  'GDP|Per capita PPS': {
    group: 'Economy',
    code: 'nama_10_pc',
    label: 'GDP per capita (PPS, current)',
    unit: 'PPS',
    filters: { unit: 'CP_PPS_EU27_2020_HAB', na_item: 'B1GQ' },
    description: 'GDP per capita in purchasing power standards',
  },
  'Gross Value Added': {
    group: 'Economy',
    code: 'nama_10_gdp',
    label: 'Gross value added',
    unit: 'million EUR',
    filters: { unit: 'CLV15_MEUR', na_item: 'B1G' },
    description: 'Gross value added at basic prices',
  },
  'Government Debt|% GDP': {
    group: 'Economy',
    code: 'gov_10dd_edpt1',
    label: 'General government gross debt (% GDP)',
    unit: '% of GDP',
    filters: { unit: 'PC_GDP', sector: 'S13', na_item: 'GD' },
    description: 'Maastricht-definition government debt',
  },
  'Inflation|HICP': {
    group: 'Economy',
    code: 'prc_hicp_aind',
    label: 'HICP — annual average rate of change',
    unit: '%',
    filters: { unit: 'RCH_A_AVG', coicop: 'CP00' },
    description: 'Harmonised index of consumer prices, all items',
  },
  'Unemployment Rate': {
    group: 'Economy',
    code: 'une_rt_a',
    label: 'Unemployment rate (15–74)',
    unit: '%',
    filters: { unit: 'PC_ACT', sex: 'T', age: 'Y15-74' },
    description: 'Annual unemployment rate, total population aged 15–74',
  },

  // ── Population & society ─────────────────────────────────────────────
  'Population': {
    group: 'Population & society',
    code: 'demo_pjan',
    label: 'Population on 1 January',
    unit: 'persons',
    filters: { sex: 'T', age: 'TOTAL' },
    description: 'Total population on 1 January',
  },
  'Population|Working age': {
    group: 'Population & society',
    code: 'demo_pjan',
    label: 'Working-age population (15–64)',
    unit: 'persons',
    filters: { sex: 'T', age: 'Y15-64' },
    description: 'Population aged 15–64 on 1 January',
  },
  'Life Expectancy': {
    group: 'Population & society',
    code: 'demo_mlexpec',
    label: 'Life expectancy at birth',
    unit: 'years',
    filters: { sex: 'T', age: 'Y_LT1' },
    description: 'Life expectancy at birth — total population',
  },
  'At Risk of Poverty': {
    group: 'Population & society',
    code: 'ilc_li02',
    label: 'At-risk-of-poverty rate (60% median)',
    unit: '%',
    filters: { unit: 'PC', sex: 'T', age: 'TOTAL', indic_il: 'LI_R_MD60' },
    description: 'Share of population below 60% of median equivalised income',
  },

  // ── Transport ────────────────────────────────────────────────────────
  'Transport|Modal split passengers|Cars': {
    group: 'Transport',
    code: 'tran_hv_psmod',
    label: 'Modal split — passenger cars',
    unit: '% of pkm',
    filters: { vehicle: 'CAR', unit: 'PC' },
    description: 'Share of passenger cars in inland passenger transport',
  },
  'Transport|Modal split passengers|Rail': {
    group: 'Transport',
    code: 'tran_hv_psmod',
    label: 'Modal split — rail (passengers)',
    unit: '% of pkm',
    filters: { vehicle: 'TRN', unit: 'PC' },
    description: 'Share of trains in inland passenger transport',
  },
  'Transport|Modal split passengers|Bus & coach': {
    group: 'Transport',
    code: 'tran_hv_psmod',
    label: 'Modal split — bus & coach',
    unit: '% of pkm',
    filters: { vehicle: 'BUS_TOT', unit: 'PC' },
    description: 'Share of buses & coaches in inland passenger transport',
  },
  'Transport|Modal split freight|Road': {
    group: 'Transport',
    code: 'tran_hv_frmod',
    label: 'Modal split — road freight',
    unit: '% of tkm',
    filters: { tra_mode: 'ROAD', unit: 'PC' },
    description: 'Share of road in inland freight transport',
  },
  'Transport|Modal split freight|Rail': {
    group: 'Transport',
    code: 'tran_hv_frmod',
    label: 'Modal split — rail freight',
    unit: '% of tkm',
    filters: { tra_mode: 'RAIL', unit: 'PC' },
    description: 'Share of rail in inland freight transport',
  },
  'Transport|Modal split freight|Inland waterways': {
    group: 'Transport',
    code: 'tran_hv_frmod',
    label: 'Modal split — inland waterways',
    unit: '% of tkm',
    filters: { tra_mode: 'IWW', unit: 'PC' },
    description: 'Share of inland waterways in inland freight transport',
  },
  'Transport|Car stock|Electric': {
    group: 'Transport',
    code: 'road_eqs_carpda',
    label: 'Stock of cars — electric (BEV)',
    unit: 'units',
    filters: { mot_nrg: 'ELC' },
    description: 'Number of battery-electric cars in the fleet',
  },
  'Transport|Car stock|Petrol': {
    group: 'Transport',
    code: 'road_eqs_carpda',
    label: 'Stock of cars — petrol',
    unit: 'units',
    filters: { mot_nrg: 'PET' },
    description: 'Number of petrol cars in the fleet',
  },
  'Transport|Car stock|Diesel': {
    group: 'Transport',
    code: 'road_eqs_carpda',
    label: 'Stock of cars — diesel',
    unit: 'units',
    filters: { mot_nrg: 'DIE' },
    description: 'Number of diesel cars in the fleet',
  },

  // ── Agriculture & land ────────────────────────────────────────────────
  'Agriculture|Utilised area': {
    group: 'Agriculture & land',
    code: 'apro_cpsh1',
    label: 'Utilised agricultural area — total',
    unit: 'thousand ha',
    filters: { strucpro: 'AR', crops: 'UAA' },
    description: 'Total utilised agricultural area',
  },
  'Agriculture|Cattle stock': {
    group: 'Agriculture & land',
    code: 'apro_mt_lscatl',
    label: 'Cattle livestock — total',
    unit: 'thousand head',
    filters: { animals: 'A2000', month: 'M12' },
    description: 'Total bovine animals in December',
  },
  'Agriculture|Pig stock': {
    group: 'Agriculture & land',
    code: 'apro_mt_lspig',
    label: 'Pig livestock — total',
    unit: 'thousand head',
    filters: { animals: 'A3100', month: 'M12' },
    description: 'Total live pigs in December',
  },
  'Agriculture|Organic farming area': {
    group: 'Agriculture & land',
    code: 'sdg_02_40',
    label: 'Area under organic farming',
    unit: '% UAA',
    filters: { unit: 'PC_UAA', agprdmet: 'TOTAL' },
    description: 'Share of utilised agricultural area under organic farming',
  },

  // ── Industry ──────────────────────────────────────────────────────────
  'Industry|Production index': {
    group: 'Industry',
    code: 'sts_inpr_a',
    label: 'Industrial production index — total industry',
    unit: 'index 2021 = 100',
    filters: { unit: 'I21', s_adj: 'CA', nace_r2: 'B-D', indic_bt: 'PROD' },
    description: 'Annual production index of total industry (B–D)',
  },
  'Industry|Energy intensity': {
    group: 'Industry',
    code: 'nrg_ind_ei',
    label: 'Energy intensity of industry (gross VA)',
    unit: 'kgoe/€1000',
    filters: { nrg_bal: 'NRGI_IND' },
    description: 'Energy use per €1 000 of industrial gross value added',
  },

  // ── Environment ───────────────────────────────────────────────────────
  'Waste|Municipal generation': {
    group: 'Environment',
    code: 'env_wasmun',
    label: 'Municipal waste generation per capita',
    unit: 'kg/capita',
    filters: { unit: 'KG_HAB', wst_oper: 'GEN' },
    description: 'Municipal waste generated, kg per capita per year',
  },
  'Waste|Municipal recycling rate': {
    group: 'Environment',
    code: 'env_wasmun',
    label: 'Municipal waste recycling rate',
    unit: '%',
    filters: { unit: 'PC', wst_oper: 'RCY_M_C' },
    description: 'Material recycling + composting share of municipal waste',
  },
  'Water|Abstraction|Public supply': {
    group: 'Environment',
    code: 'env_wat_abs',
    label: 'Freshwater abstraction — public supply',
    unit: 'million m³',
    filters: { wat_src: 'FRW', wat_proc: 'ABS_PWS' },
    description: 'Annual freshwater abstraction for public water supply',
  },
};

// ── Region registry ──────────────────────────────────────────────────────
//
// Eurostat uses NUTS-style geo codes. Regions are organised into tiers
// (Aggregates, EU member states, EFTA + UK, Candidate countries, Other Europe)
// so the explorer can offer a structured region picker.

export type EurostatRegionTier =
  | 'Aggregates'
  | 'EU member states'
  | 'EFTA & UK'
  | 'Candidate & potential'
  | 'Other Europe';

export interface EurostatRegionEntry {
  /** Eurostat geo code (e.g. "DE", "EU27_2020") */
  code: string;
  /** Tier shown in the picker */
  tier: EurostatRegionTier;
}

export const EUROSTAT_REGION_TIERS: EurostatRegionTier[] = [
  'Aggregates',
  'EU member states',
  'EFTA & UK',
  'Candidate & potential',
  'Other Europe',
];

export const EUROSTAT_REGION_ENTRIES: Record<string, EurostatRegionEntry> = {
  // ── Aggregates ─────────────────────────────────────────────────────────
  'EU27 (2020)':           { code: 'EU27_2020', tier: 'Aggregates' },
  'Euro area (EA20)':      { code: 'EA20',      tier: 'Aggregates' },
  'Euro area (EA19)':      { code: 'EA19',      tier: 'Aggregates' },
  'EU28':                  { code: 'EU28',      tier: 'Aggregates' },
  'EFTA':                  { code: 'EFTA',      tier: 'Aggregates' },

  // ── EU member states ──────────────────────────────────────────────────
  'Austria':               { code: 'AT', tier: 'EU member states' },
  'Belgium':               { code: 'BE', tier: 'EU member states' },
  'Bulgaria':              { code: 'BG', tier: 'EU member states' },
  'Croatia':               { code: 'HR', tier: 'EU member states' },
  'Cyprus':                { code: 'CY', tier: 'EU member states' },
  'Czechia':               { code: 'CZ', tier: 'EU member states' },
  'Denmark':               { code: 'DK', tier: 'EU member states' },
  'Estonia':               { code: 'EE', tier: 'EU member states' },
  'Finland':               { code: 'FI', tier: 'EU member states' },
  'France':                { code: 'FR', tier: 'EU member states' },
  'Germany':               { code: 'DE', tier: 'EU member states' },
  'Greece':                { code: 'EL', tier: 'EU member states' },
  'Hungary':               { code: 'HU', tier: 'EU member states' },
  'Ireland':               { code: 'IE', tier: 'EU member states' },
  'Italy':                 { code: 'IT', tier: 'EU member states' },
  'Latvia':                { code: 'LV', tier: 'EU member states' },
  'Lithuania':             { code: 'LT', tier: 'EU member states' },
  'Luxembourg':            { code: 'LU', tier: 'EU member states' },
  'Malta':                 { code: 'MT', tier: 'EU member states' },
  'Netherlands':           { code: 'NL', tier: 'EU member states' },
  'Poland':                { code: 'PL', tier: 'EU member states' },
  'Portugal':              { code: 'PT', tier: 'EU member states' },
  'Romania':               { code: 'RO', tier: 'EU member states' },
  'Slovakia':              { code: 'SK', tier: 'EU member states' },
  'Slovenia':              { code: 'SI', tier: 'EU member states' },
  'Spain':                 { code: 'ES', tier: 'EU member states' },
  'Sweden':                { code: 'SE', tier: 'EU member states' },

  // ── EFTA & UK ──────────────────────────────────────────────────────────
  'Iceland':               { code: 'IS', tier: 'EFTA & UK' },
  'Liechtenstein':         { code: 'LI', tier: 'EFTA & UK' },
  'Norway':                { code: 'NO', tier: 'EFTA & UK' },
  'Switzerland':           { code: 'CH', tier: 'EFTA & UK' },
  'United Kingdom':        { code: 'UK', tier: 'EFTA & UK' },

  // ── Candidate & potential ──────────────────────────────────────────────
  'Türkiye':               { code: 'TR', tier: 'Candidate & potential' },
  'Montenegro':            { code: 'ME', tier: 'Candidate & potential' },
  'North Macedonia':       { code: 'MK', tier: 'Candidate & potential' },
  'Serbia':                { code: 'RS', tier: 'Candidate & potential' },
  'Albania':               { code: 'AL', tier: 'Candidate & potential' },
  'Bosnia and Herzegovina':{ code: 'BA', tier: 'Candidate & potential' },
  'Moldova':               { code: 'MD', tier: 'Candidate & potential' },
  'Ukraine':               { code: 'UA', tier: 'Candidate & potential' },
  'Kosovo':                { code: 'XK', tier: 'Candidate & potential' },

  // ── Other Europe ───────────────────────────────────────────────────────
  'Georgia':               { code: 'GE', tier: 'Other Europe' },
  'Armenia':               { code: 'AM', tier: 'Other Europe' },
  'Azerbaijan':            { code: 'AZ', tier: 'Other Europe' },
  'Belarus':               { code: 'BY', tier: 'Other Europe' },
  'Russia':                { code: 'RU', tier: 'Other Europe' },
};

/** Backwards-compatible flat label → code map. */
export const EUROSTAT_REGIONS: Record<string, string> = Object.fromEntries(
  Object.entries(EUROSTAT_REGION_ENTRIES).map(([label, entry]) => [label, entry.code]),
);

const REVERSE_REGIONS: Record<string, string> = Object.fromEntries(
  Object.entries(EUROSTAT_REGIONS).map(([label, code]) => [code, label]),
);

// ── Run registry ──────────────────────────────────────────────────────────
//
// Eurostat is historical observation data — there's effectively one "run"
// per dataset (the historical observation series). The frontend filters
// runs by id, so we need a stable id space. We allocate run id 1 to the
// single Eurostat "Historical" series; the model is "Eurostat" and the
// scenario is "Historical".

export const EUROSTAT_RUN_ID = 1;
export const EUROSTAT_MODEL = 'Eurostat';
export const EUROSTAT_SCENARIO = 'Historical (Eurostat)';

export interface EurostatRun {
  id: number;
  model: string;
  scenario: string;
  category: string;
  meta: Record<string, string>;
}

export function eurostatRuns(): EurostatRun[] {
  return [
    {
      id: EUROSTAT_RUN_ID,
      model: EUROSTAT_MODEL,
      scenario: EUROSTAT_SCENARIO,
      category: 'Historical',
      meta: { source: 'Eurostat', type: 'observation' },
    },
  ];
}

// ── JSON-stat 2.0 parser ─────────────────────────────────────────────────

interface JsonStatDimension {
  label?: string;
  category?: {
    index?: Record<string, number> | string[];
    label?: Record<string, string>;
  };
}

interface JsonStatResponse {
  version?: string;
  label?: string;
  source?: string;
  updated?: string;
  /** value can be array OR sparse object {idx: value} */
  value?: number[] | Record<string, number | null> | null;
  /** dimension order — last dimension is "time" in Eurostat */
  id?: string[];
  /** parallel size array */
  size?: number[];
  dimension?: Record<string, JsonStatDimension>;
}

/**
 * Parse a JSON-stat 2.0 response into a flat array of {year, value, geo}.
 *
 * Eurostat responses always include a `time` dimension (typically last)
 * and a `geo` dimension. Other dimensions should already be filtered down
 * to single values via the URL params, but we handle the general case
 * by iterating all index combinations.
 */
export function parseJsonStat(
  json: JsonStatResponse,
): { geo: string; year: number; value: number }[] {
  if (!json || !json.id || !json.size || !json.dimension || json.value == null) {
    return [];
  }

  const dimIds = json.id;
  const sizes = json.size;
  if (dimIds.length !== sizes.length) return [];

  // Build per-dimension index → key arrays so we can decode position → keys
  const dimKeys: string[][] = dimIds.map((dimId) => {
    const dim = json.dimension![dimId];
    const idx = dim?.category?.index;
    if (!idx) return [];
    if (Array.isArray(idx)) return idx.slice();
    // Object form: invert {key: position} → array indexed by position
    const arr: string[] = new Array(Object.keys(idx).length);
    for (const [key, pos] of Object.entries(idx)) {
      arr[pos] = key;
    }
    return arr;
  });

  const timeIdx = dimIds.indexOf('time');
  const geoIdx = dimIds.indexOf('geo');
  if (timeIdx === -1 || geoIdx === -1) return [];

  // Compute strides for row-major flat indexing (last dim is fastest)
  const strides: number[] = new Array(sizes.length);
  let stride = 1;
  for (let i = sizes.length - 1; i >= 0; i--) {
    strides[i] = stride;
    stride *= sizes[i];
  }
  const total = stride;

  const isArray = Array.isArray(json.value);
  const lookupValue = (flatIdx: number): number | null => {
    if (isArray) {
      const v = (json.value as (number | null)[])[flatIdx];
      return v == null || isNaN(v) ? null : v;
    }
    const v = (json.value as Record<string, number | null>)[String(flatIdx)];
    return v == null || isNaN(v as number) ? null : (v as number);
  };

  const out: { geo: string; year: number; value: number }[] = [];

  // Iterate every flat index, decode the dimension positions, emit (geo, year, value)
  for (let flatIdx = 0; flatIdx < total; flatIdx++) {
    const v = lookupValue(flatIdx);
    if (v == null) continue;

    // Decode dimension positions from flat index
    let rem = flatIdx;
    const positions: number[] = new Array(sizes.length);
    for (let d = 0; d < sizes.length; d++) {
      positions[d] = Math.floor(rem / strides[d]);
      rem -= positions[d] * strides[d];
    }

    const geoCode = dimKeys[geoIdx]?.[positions[geoIdx]] || '';
    const timeKey = dimKeys[timeIdx]?.[positions[timeIdx]] || '';
    const year = parseInt(timeKey, 10);
    if (!geoCode || !year || isNaN(year)) continue;

    out.push({ geo: geoCode, year, value: v });
  }

  return out;
}

// ── Eurostat fetcher ──────────────────────────────────────────────────────

export interface EurostatDatapoint {
  run_id: number;
  year: number;
  value: number;
  unit: string;
  region: string;
  variable: string;
  /** Eurostat DOI link for the underlying dataset */
  eurostatDoi: string;
  /** Direct Eurostat database browser link */
  eurostatUrl: string;
}

/**
 * Fetch a single Eurostat variable for a single region (or all regions)
 * and convert it into datapoints in the same shape as the IIASA proxy.
 *
 * @param variable  IIASA-style variable name (must be in EUROSTAT_VARIABLES)
 * @param region    Either a Eurostat region label ("Germany") or geo code ("DE"); pass '' for EU27
 */
export async function fetchEurostatVariable(
  variable: string,
  region: string,
): Promise<EurostatDatapoint[]> {
  const spec = EUROSTAT_VARIABLES[variable];
  if (!spec) {
    throw new Error(`Eurostat: unknown variable "${variable}"`);
  }

  // Resolve region label → geo code
  const geoCode =
    EUROSTAT_REGIONS[region] || region || EUROSTAT_REGIONS['EU27'];

  // Build query string with all filter dimensions + geo
  const params = new URLSearchParams({
    format: 'JSON',
    lang: 'EN',
    geo: geoCode,
  });
  if (spec.filters) {
    for (const [k, v] of Object.entries(spec.filters)) {
      params.append(k, v);
    }
  }

  const url = `${EUROSTAT_BASE}/${spec.code}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Eurostat ${res.status}: ${text.slice(0, 200)} (url: ${url})`,
    );
  }
  const json = (await res.json()) as JsonStatResponse;
  const parsed = parseJsonStat(json);

  const scale = spec.scale ?? 1;
  const doi = eurostatDoiUrl(spec.code);
  const browserUrl = eurostatBrowserUrl(spec.code);
  return parsed.map((p) => ({
    run_id: EUROSTAT_RUN_ID,
    year: p.year,
    value: p.value * scale,
    unit: spec.unit,
    region: REVERSE_REGIONS[p.geo] || p.geo,
    variable,
    eurostatDoi: doi,
    eurostatUrl: browserUrl,
  }));
}

// ── Helpers exposed to the API route ─────────────────────────────────────

export function eurostatVariables(): string[] {
  return Object.keys(EUROSTAT_VARIABLES);
}

/**
 * Grouped variable list used by the explorer UI. Each group lists its
 * variables in registry order so related metrics stay together.
 */
export interface EurostatVariableInfo {
  name: string;
  label: string;
  unit: string;
  description?: string;
  /** Eurostat DOI link for the underlying dataset */
  eurostatDoi: string;
  /** Direct Eurostat database browser link */
  eurostatUrl: string;
}

export function eurostatGroupedVariables(): {
  group: EurostatGroup;
  variables: EurostatVariableInfo[];
}[] {
  return EUROSTAT_GROUPS.map((group) => ({
    group,
    variables: Object.entries(EUROSTAT_VARIABLES)
      .filter(([, spec]) => spec.group === group)
      .map(([name, spec]) => ({
        name,
        label: spec.label,
        unit: spec.unit,
        description: spec.description,
        eurostatDoi: eurostatDoiUrl(spec.code),
        eurostatUrl: eurostatBrowserUrl(spec.code),
      })),
  }));
}

export function eurostatRegions(): string[] {
  return Object.keys(EUROSTAT_REGION_ENTRIES);
}

export function eurostatTieredRegions(): {
  tier: EurostatRegionTier;
  regions: { name: string; code: string }[];
}[] {
  return EUROSTAT_REGION_TIERS.map((tier) => ({
    tier,
    regions: Object.entries(EUROSTAT_REGION_ENTRIES)
      .filter(([, entry]) => entry.tier === tier)
      .map(([name, entry]) => ({ name, code: entry.code })),
  }));
}

export function eurostatModels(): string[] {
  return [EUROSTAT_MODEL];
}

export function eurostatScenarios(): string[] {
  return [EUROSTAT_SCENARIO];
}
