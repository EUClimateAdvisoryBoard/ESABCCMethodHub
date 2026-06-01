/**
 * Shared types for EU Member State country profiles.
 *
 * Structure follows the EEA "Europe's Environment 2025" country-profile
 * template (GHG emissions, renewable energy, energy efficiency, air, water,
 * biodiversity, circular economy, adaptation), and adds ESABCC-specific
 * sections (NECP commentary, just transition, notable national policies).
 *
 * Every numeric field is optional so that the editor and the external
 * contribute form can save partial drafts.
 */

export type Trend = 'up' | 'down' | 'flat' | 'mixed';
export type Status = 'on-track' | 'partial' | 'off-track' | 'concern' | 'unknown';

export interface TimeSeriesPoint {
  year: number;
  value: number;
}

export interface SectorSplit {
  /** Sector id mirrors `src/data/sectoral-policies` where possible. */
  id: string;
  label: string;
  /** Share in % of national total. */
  share: number;
  /** Optional absolute value (Mt CO2e for emissions, TWh for energy etc.). */
  absolute?: number;
}

export interface IndicatorValue {
  /** Headline figure shown on the country card / heatmap. */
  value: number;
  /** Engineering unit, e.g. "Mt CO2e", "% of gross final consumption". */
  unit: string;
  /** Reporting year. */
  year: number;
  /** Source short-name shown in the citation chip. */
  source?: string;
  /** Source URL. */
  sourceUrl?: string;
}

export interface PolicyEntry {
  name: string;
  /** Year adopted. */
  year?: number;
  /** One-sentence summary of what the instrument does. */
  summary: string;
  /** Optional URL to the law text or government page. */
  url?: string;
}

export interface GhgSection {
  /** Total GHG (incl. LULUCF) Mt CO2e for the most recent reporting year. */
  totalLatest?: IndicatorValue;
  /** 1990 reference total, Mt CO2e. */
  total1990?: number;
  /** Per-capita t CO2e most recent year. */
  perCapita?: IndicatorValue;
  /** Per-GDP kg CO2e / EUR most recent year. */
  perGdp?: IndicatorValue;
  /** Domestic 2030 target — see ESR / Climate Law translation. */
  target2030?: { value: number; unit: string; baseline?: string; notes?: string };
  /** Domestic 2040 / climate-neutrality milestone. */
  target2050?: { value: number; unit: string; year?: number; notes?: string };
  /** Sectoral breakdown — sum should be ~100%. */
  sectors?: SectorSplit[];
  /** Annual total emissions time series, Mt CO2e. */
  trend?: TimeSeriesPoint[];
  /** Short narrative on emissions trajectory. */
  narrative?: string;
  /** Headline assessment status. */
  status?: Status;
}

export interface RenewableEnergySection {
  /** RES share in gross final energy consumption (%). */
  shareLatest?: IndicatorValue;
  share2005?: number;
  share2020?: number;
  /** Binding 2030 share target (%). */
  target2030?: number;
  /** Sub-sector shares (electricity, heating & cooling, transport). */
  bySubsector?: SectorSplit[];
  trend?: TimeSeriesPoint[];
  narrative?: string;
  status?: Status;
}

export interface EnergyEfficiencySection {
  /** Primary energy consumption Mtoe. */
  primary?: IndicatorValue;
  /** Final energy consumption Mtoe. */
  final?: IndicatorValue;
  /** Energy intensity of GDP (kgoe / 1000 EUR). */
  intensity?: IndicatorValue;
  /** Binding 2030 energy-saving target (% reduction vs reference). */
  target2030?: number;
  narrative?: string;
  status?: Status;
}

export interface AirQualitySection {
  /** Population-weighted annual mean PM2.5 (µg/m³). */
  pm25?: IndicatorValue;
  no2?: IndicatorValue;
  ozone?: IndicatorValue;
  /** Premature deaths attributable to PM2.5 (count/yr). */
  prematureDeaths?: IndicatorValue;
  /** Share of urban population exposed above WHO guideline (%). */
  exceedanceShare?: IndicatorValue;
  narrative?: string;
  status?: Status;
}

export interface WaterSection {
  surfaceWaterGood?: IndicatorValue;
  groundwaterGood?: IndicatorValue;
  bathingWaterExcellent?: IndicatorValue;
  drinkingWaterCompliance?: IndicatorValue;
  narrative?: string;
  status?: Status;
}

export interface BiodiversitySection {
  /** Natura 2000 terrestrial coverage (% land area). */
  natura2000Land?: IndicatorValue;
  natura2000Marine?: IndicatorValue;
  protectedAreas?: IndicatorValue;
  threatenedSpecies?: IndicatorValue;
  /** Habitats Directive — % favourable assessments. */
  habitatsFavourable?: IndicatorValue;
  narrative?: string;
  status?: Status;
}

export interface CircularEconomySection {
  municipalRecycling?: IndicatorValue;
  circularMaterialUseRate?: IndicatorValue;
  resourceProductivity?: IndicatorValue;
  narrative?: string;
  status?: Status;
}

export interface AdaptationSection {
  /** National adaptation strategy adopted? */
  strategy?: { adoptedYear?: number; lastUpdate?: number; url?: string; title?: string };
  /** Top climate risks ranked by the country's risk assessment. */
  keyRisks?: string[];
  /** Sectors with statutory adaptation plans. */
  sectoralPlans?: string[];
  narrative?: string;
  status?: Status;
}

export interface NecpSection {
  /** NECP draft submission status. */
  draftSubmitted?: string;
  finalSubmitted?: string;
  /** Commission assessment headline. */
  commissionAssessment?: string;
  /** ESABCC commentary placeholder. */
  esabccCommentary?: string;
  /** Identified gaps / risks. */
  gaps?: string[];
  narrative?: string;
  status?: Status;
}

export interface JustTransitionSection {
  /** Just Transition Fund allocation (€ million 2021-27). */
  jtfAllocationEurM?: number;
  /** Regions covered by Territorial Just Transition Plans. */
  regions?: string[];
  narrative?: string;
}

export interface CountryHero {
  /** Centroid lat/lon for the map marker / map fly-to. */
  lat: number;
  lon: number;
  capital: string;
  /** Population (million). */
  populationM?: number;
  /** Area (1000 km²). */
  areaKkm2?: number;
  /** GDP per capita (EUR PPS, most recent year). */
  gdpPerCapitaEur?: number;
  /** Two-paragraph executive summary that appears on top of profile. */
  summary: string;
  /** Inline lead-headlines. */
  highlights?: string[];
}

export interface CountryProfile {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Two-letter Eurostat code (EL for Greece). */
  eurostatCode: string;
  /** Last time the baseline / seed data in repo was reviewed (YYYY-MM-DD). */
  lastReviewed?: string;
  hero: CountryHero;
  ghg: GhgSection;
  renewables: RenewableEnergySection;
  efficiency: EnergyEfficiencySection;
  air: AirQualitySection;
  water: WaterSection;
  biodiversity: BiodiversitySection;
  circular: CircularEconomySection;
  adaptation: AdaptationSection;
  necp: NecpSection;
  justTransition?: JustTransitionSection;
  /** Selected national legislation / strategies. */
  policies?: PolicyEntry[];
  /** Free-text "what to watch" notes from the ESABCC Secretariat. */
  watchNotes?: string;
}

/**
 * Heatmap row keys — these are the indicator columns we score per country
 * in the landing-page heatmap. Keep stable; the heatmap renderer reads them.
 */
export const HEATMAP_INDICATORS = [
  { key: 'ghg', label: 'GHG trajectory' },
  { key: 'renewables', label: 'Renewables' },
  { key: 'efficiency', label: 'Energy efficiency' },
  { key: 'air', label: 'Air quality' },
  { key: 'water', label: 'Water' },
  { key: 'biodiversity', label: 'Biodiversity' },
  { key: 'circular', label: 'Circular economy' },
  { key: 'adaptation', label: 'Adaptation' },
  { key: 'necp', label: 'NECP delivery' },
] as const;
export type HeatmapIndicatorKey = (typeof HEATMAP_INDICATORS)[number]['key'];

export const STATUS_COLORS: Record<Status, string> = {
  'on-track': '#1F8A4C',
  'partial': '#FFB300',
  'off-track': '#E15522',
  'concern': '#B83230',
  'unknown': '#B0B7BD',
};

export const STATUS_LABELS: Record<Status, string> = {
  'on-track': 'On track',
  'partial': 'Partial progress',
  'off-track': 'Off track',
  'concern': 'Concern',
  'unknown': 'Not assessed',
};

/**
 * A staged edit awaiting review.  Used both for main-user edits (auto-approved)
 * and for external-contributor submissions (require approval).
 */
export interface CountryProfileSubmission {
  id: string;
  countryCode: string;
  /** "main" = signed-in user; "external" = via share-link token. */
  source: 'main' | 'external';
  /** Display name of the contributor. */
  contributorName: string;
  /** Optional email. */
  contributorEmail?: string;
  /** Short note from the contributor describing the change. */
  message?: string;
  /** Partial profile patch — only changed sections. */
  patch: Partial<CountryProfile>;
  /** ISO timestamp. */
  submittedAt: string;
  /** Pending / approved / rejected. */
  state: 'pending' | 'approved' | 'rejected';
  /** Reviewer id and timestamp once acted upon. */
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ShareLink {
  /** URL-safe random token. */
  token: string;
  countryCode: string;
  /** Restrict editing to specific sections (empty = all sections). */
  sections?: (keyof CountryProfile)[];
  /** Optional intended contributor identity. */
  contributorName?: string;
  contributorEmail?: string;
  /** Free-text message shown to the contributor on the landing page. */
  invitationMessage?: string;
  createdAt: string;
  createdBy?: string;
  /** ISO expiry timestamp (default 30 days). */
  expiresAt?: string;
  /** Has the link been revoked? */
  revoked?: boolean;
  /** How many times it was used. */
  uses?: number;
}
