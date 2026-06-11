// ---------------------------------------------------------------------------
// Sector flow — progress reporting → policy analysis → recommendations.
// ---------------------------------------------------------------------------
//
// The "Sector flow" lens of the Content Analysis workbench draws, for each of
// the six ESABCC report sectors, the causal chain the Secretariat reasons
// along when drafting:
//
//   ① Progress reporting   — what the monitored indicators say (live series
//                            from the indicator database, with an on-/off-
//                            track signal against the legal target);
//   ② Policy analysis      — the EU instruments that respond to each signal
//                            (from the Policy Navigator's sectoral library,
//                            cross-matched against the workspace corpus so
//                            coded evidence shows up on the right card);
//   ③ Recommendations      — the ESABCC advice that closes the remaining
//                            gap (from the recommendation tracker, with its
//                            uptake status).
//
// A fourth lane carries the co-benefits (health, air, water, biodiversity,
// equity, jobs, security…) each chain unlocks beyond GHG — wired to the
// indicator/policy/recommendation node they spring from, and backed by a
// data series of their own where one exists in the database.
//
// Everything dynamic (indicator values, recommendation statuses, policy
// metadata) is resolved at build time from the shared databases, so the
// chart never drifts from the tracker modules. Only the *wiring* — which
// indicator a policy responds to, which instruments a recommendation acts
// through, and the co-benefit links — is curated here.
// ---------------------------------------------------------------------------

import {
  SECTOR_FRAMEWORKS,
  FRAMEWORK_INDICATOR_INDEX,
  type SectorFramework,
} from '@/data/sector-frameworks';
import type { Indicator, IndicatorDataPoint } from '@/data/ecno-indicators';
import { SECTOR_POLICIES, type SectorPolicy } from '@/data/sectoral-policies';
import {
  ESABCC_2024_RECOMMENDATIONS,
  type PastRecommendation,
  type RecommendationStatus,
} from '@/data/esabcc-recommendations';
import type { AnalysisDocument, CodeNode, CodedSegment } from './types';

// ── Definition shapes (the curated wiring) ──────────────────────────────────

export type SectorFlowId =
  | 'energy'
  | 'industry'
  | 'transport'
  | 'buildings'
  | 'agriculture'
  | 'lulucf';

export type CoBenefitDimension =
  | 'health'
  | 'air'
  | 'water'
  | 'biodiversity'
  | 'equity'
  | 'jobs'
  | 'security'
  | 'resources'
  | 'resilience';

export const CO_BENEFIT_META: Record<
  CoBenefitDimension,
  { label: string; color: string; icon: string }
> = {
  health: { label: 'Health', color: '#C04866', icon: '❤' },
  air: { label: 'Air quality', color: '#0065A4', icon: '🌬' },
  water: { label: 'Water', color: '#0E7490', icon: '💧' },
  biodiversity: { label: 'Biodiversity', color: '#4D7C0F', icon: '🌿' },
  equity: { label: 'Fairness & equity', color: '#6D5BD0', icon: '⚖' },
  jobs: { label: 'Jobs & economy', color: '#B45309', icon: '🛠' },
  security: { label: 'Energy security', color: '#3D5265', icon: '🛡' },
  resources: { label: 'Resource use', color: '#64748B', icon: '♻' },
  resilience: { label: 'Climate resilience', color: '#7C5E2F', icon: '🌡' },
};

interface ProgressDef {
  /** Report indicator code shown on the chip (E2, T5a, …). */
  code: string;
  /** Id in the shared indicator database. */
  indicatorId: string;
  /** The sector's headline series — drives the sector-selector signal dot. */
  headline?: boolean;
}

interface PolicyDef {
  /** Id in SECTOR_POLICIES (the Policy Navigator library). */
  policyId: string;
  /** Progress-indicator codes this instrument responds to (drawn as edges). */
  respondsTo: string[];
}

interface FeaturedRecDef {
  /** Id in the ESABCC 2024 recommendation tracker. */
  recId: string;
  /** Instruments the recommendation acts through. Empty ⇒ identified policy
   *  gap — the advice has no instrument to flow through yet. */
  viaPolicies: string[];
}

interface CoBenefitDef {
  id: string;
  dimension: CoBenefitDimension;
  label: string;
  detail: string;
  /** Nodes this co-benefit springs from: progress codes, policy ids, rec ids. */
  linkedTo: string[];
  /** Optional series in the indicator database that tracks the co-benefit. */
  indicatorId?: string;
}

export interface SectorFlowDef {
  sectorId: SectorFlowId;
  /** Chapter letter of the 2024 sectoral recommendations (E, I, T, B, A, L). */
  recPrefix: string;
  progress: ProgressDef[];
  policies: PolicyDef[];
  featuredRecs: FeaturedRecDef[];
  coBenefits: CoBenefitDef[];
  /** Lower-cased fragments matched against workspace code names and document
   *  titles for the soft "coded evidence in this workspace" counter. */
  keywords: string[];
}

// ── Curated wiring for the six report sectors ───────────────────────────────

export const SECTOR_FLOW_DEFS: SectorFlowDef[] = [
  {
    sectorId: 'energy',
    recPrefix: 'E',
    progress: [
      { code: 'E1', indicatorId: 'esabcc-e1-energy-supply-ghg', headline: true },
      { code: 'E2', indicatorId: 'esabcc-e2-fossil-power-share' },
      { code: 'E4a', indicatorId: 'esabcc-e4a-solar-pv-add' },
      { code: 'E5', indicatorId: 'esabcc-e5-electrification' },
    ],
    policies: [
      { policyId: 'eu-ets', respondsTo: ['E1', 'E2'] },
      { policyId: 'red-iii', respondsTo: ['E2', 'E4a'] },
      { policyId: 'mdr', respondsTo: ['E5'] },
      { policyId: 'methane-regulation', respondsTo: ['E1'] },
      { policyId: 'innovation-fund', respondsTo: ['E4a'] },
    ],
    featuredRecs: [
      { recId: 'e4-renewables-growth-support', viaPolicies: ['red-iii', 'mdr'] },
      { recId: 'e5-system-integration-flexibility', viaPolicies: ['mdr'] },
      { recId: 'e7-ccus-targeting', viaPolicies: ['eu-ets', 'innovation-fund'] },
      { recId: 'e9-upstream-fossil-emissions', viaPolicies: ['methane-regulation'] },
      { recId: 'kr3-renewables-investment-outlook', viaPolicies: ['red-iii'] },
    ],
    coBenefits: [
      {
        id: 'energy-air',
        dimension: 'air',
        label: 'Cleaner air from less combustion',
        detail:
          'Phasing fossil fuels out of the power mix cuts SO₂, NOₓ and fine-particle emissions alongside CO₂ — fewer respiratory and cardiovascular cases.',
        linkedTo: ['E2', 'red-iii'],
      },
      {
        id: 'energy-water',
        dimension: 'water',
        label: 'Lower cooling-water demand',
        detail:
          'Wind and solar need a fraction of the freshwater that thermal plants withdraw for cooling — easing pressure on rivers in drought summers.',
        linkedTo: ['E4a'],
      },
      {
        id: 'energy-security',
        dimension: 'security',
        label: 'Less import dependence',
        detail:
          'Every percentage point of fossil share displaced by domestic renewables reduces exposure to imported fuel-price shocks.',
        linkedTo: ['E2', 'kr3-renewables-investment-outlook'],
        indicatorId: 'beta-fossil-share-gae',
      },
      {
        id: 'energy-jobs',
        dimension: 'jobs',
        label: 'Clean-energy employment',
        detail:
          'Accelerated wind, solar and grid build-out creates installation, manufacturing and operation jobs across the EU.',
        linkedTo: ['e4-renewables-growth-support'],
      },
    ],
    keywords: ['energy', 'electricity', 'renewable', 'power', 'grid', 'hydrogen', 'fossil'],
  },
  {
    sectorId: 'industry',
    recPrefix: 'I',
    progress: [
      { code: 'I1', indicatorId: 'esabcc-i1-industry-ghg', headline: true },
      { code: 'I3', indicatorId: 'esabcc-i3-circular-mat-use' },
      { code: 'I4', indicatorId: 'esabcc-i4-steel-ghg-intensity' },
      { code: 'I6', indicatorId: 'esabcc-i6-industry-electrification' },
    ],
    policies: [
      { policyId: 'eu-ets', respondsTo: ['I1', 'I4'] },
      { policyId: 'cbam', respondsTo: ['I1'] },
      { policyId: 'ecodesign', respondsTo: ['I3'] },
      { policyId: 'net-zero-industry-act', respondsTo: ['I4', 'I6'] },
      { policyId: 'ied', respondsTo: ['I4'] },
    ],
    featuredRecs: [
      { recId: 'i1-circular-economy-ceap2', viaPolicies: ['ecodesign'] },
      { recId: 'i2-carbon-leakage-alternatives', viaPolicies: ['cbam', 'eu-ets'] },
      { recId: 'i3-low-emission-industrial-tech', viaPolicies: ['net-zero-industry-act'] },
      { recId: 'kr7-ets-fit-for-net-zero', viaPolicies: ['eu-ets'] },
      { recId: 'kr12-energy-material-demand-reduction', viaPolicies: ['ecodesign'] },
    ],
    coBenefits: [
      {
        id: 'industry-air',
        dimension: 'air',
        label: 'Less industrial pollution',
        detail:
          'IED 2.0 permitting tightens SO₂, NOₓ, dust and effluent limits in the same plants that decarbonise — air- and water-quality gains arrive together.',
        linkedTo: ['ied'],
      },
      {
        id: 'industry-resources',
        dimension: 'resources',
        label: 'Circularity cuts extraction',
        detail:
          'Higher circular material use means less primary steel, cement and chemicals demand — lower mining pressure and embodied emissions.',
        linkedTo: ['I3', 'i1-circular-economy-ceap2'],
        indicatorId: 'beta-dmc-per-capita',
      },
      {
        id: 'industry-jobs',
        dimension: 'jobs',
        label: 'Clean-tech manufacturing base',
        detail:
          'Net-Zero Industry Act capacity targets anchor electrolyser, battery and heat-pump manufacturing — and their skilled jobs — inside the EU.',
        linkedTo: ['net-zero-industry-act'],
      },
      {
        id: 'industry-health',
        dimension: 'health',
        label: 'Healthier industrial regions',
        detail:
          'Communities around heavy-industry clusters see the largest health gains as coke ovens, blast furnaces and kilns electrify or switch to hydrogen.',
        linkedTo: ['I4'],
      },
    ],
    keywords: ['industry', 'industrial', 'steel', 'cement', 'chemical', 'circular', 'cbam', 'material'],
  },
  {
    sectorId: 'transport',
    recPrefix: 'T',
    progress: [
      { code: 'T1', indicatorId: 'esabcc-t1-transport-ghg', headline: true },
      { code: 'T5a', indicatorId: 'esabcc-t5a-zev-share-newcars' },
      { code: 'T3a', indicatorId: 'esabcc-t3a-road-share-passenger' },
      { code: 'T6a', indicatorId: 'esabcc-t6a-fossil-transport-share' },
    ],
    policies: [
      { policyId: 'co2-cars-vans', respondsTo: ['T5a', 'T1'] },
      { policyId: 'ets2', respondsTo: ['T6a', 'T1'] },
      { policyId: 'afir', respondsTo: ['T5a'] },
      { policyId: 'eurovignette', respondsTo: ['T3a'] },
      { policyId: 'fueleu-maritime', respondsTo: ['T6a'] },
    ],
    featuredRecs: [
      { recId: 't2-modal-shift', viaPolicies: ['eurovignette'] },
      { recId: 't3-efficient-zev-incentives', viaPolicies: ['co2-cars-vans', 'afir'] },
      { recId: 't4-direct-electrification-fuels', viaPolicies: ['fueleu-maritime'] },
      { recId: 't5-etd-end-exemptions', viaPolicies: [] },
      { recId: 't6-ets-price-convergence', viaPolicies: ['ets2'] },
    ],
    coBenefits: [
      {
        id: 'transport-air',
        dimension: 'air',
        label: 'Cleaner urban air, less noise',
        detail:
          'Zero-emission vehicles eliminate tailpipe NOₓ and particulates — and electric drivetrains halve traffic noise in cities.',
        linkedTo: ['T5a', 'co2-cars-vans'],
      },
      {
        id: 'transport-health',
        dimension: 'health',
        label: 'Active-mobility health dividend',
        detail:
          'Modal shift to walking, cycling and rail builds physical activity into daily life — one of the strongest public-health levers in the chain.',
        linkedTo: ['t2-modal-shift', 'T3a'],
      },
      {
        id: 'transport-equity',
        dimension: 'equity',
        label: 'Cushioning carbon costs',
        detail:
          'Social Climate Fund revenue (≈€65bn from ETS2) is earmarked for vulnerable households and transport-poor regions hit by road-fuel pricing.',
        linkedTo: ['ets2'],
      },
    ],
    keywords: ['transport', 'vehicle', 'mobility', 'aviation', 'maritime', 'rail', 'fuel'],
  },
  {
    sectorId: 'buildings',
    recPrefix: 'B',
    progress: [
      { code: 'B1', indicatorId: 'esabcc-b1-buildings-ghg', headline: true },
      { code: 'B3', indicatorId: 'esabcc-b3-residential-renovation-rate' },
      { code: 'B6', indicatorId: 'esabcc-b6-heat-pump-stock' },
      { code: 'B5a', indicatorId: 'esabcc-b5a-residential-fossil-share' },
    ],
    policies: [
      { policyId: 'epbd', respondsTo: ['B3', 'B1'] },
      { policyId: 'ets2', respondsTo: ['B5a'] },
      { policyId: 'red-iii', respondsTo: ['B5a', 'B6'] },
      { policyId: 'eed', respondsTo: ['B1'] },
      { policyId: 'sclf', respondsTo: ['B3'] },
    ],
    featuredRecs: [
      { recId: 'b1-ets2-epbd-implementation', viaPolicies: ['ets2', 'epbd'] },
      { recId: 'b2-renovation-strategies', viaPolicies: ['epbd'] },
      { recId: 'b3-heat-pumps-district-heating', viaPolicies: ['red-iii', 'epbd'] },
      { recId: 'b4-buildings-demand-sufficiency', viaPolicies: ['eed'] },
      { recId: 'b5-epc-meps-buildings-data', viaPolicies: ['epbd'] },
    ],
    coBenefits: [
      {
        id: 'buildings-health',
        dimension: 'health',
        label: 'Healthier homes',
        detail:
          'Deep renovation removes damp, mould and cold — cutting excess winter mortality and asthma, with the largest gains in the worst housing.',
        linkedTo: ['B3', 'epbd'],
      },
      {
        id: 'buildings-equity',
        dimension: 'equity',
        label: 'Energy-poverty relief',
        detail:
          'Lower bills from efficient buildings, with Social Climate Fund support targeted at energy-poor households first (EPBD Art. 17 priority).',
        linkedTo: ['sclf'],
      },
      {
        id: 'buildings-air',
        dimension: 'air',
        label: 'No fossil boilers indoors or out',
        detail:
          'Replacing oil and gas boilers with heat pumps removes NO₂ at the flue and improves indoor air in millions of dwellings.',
        linkedTo: ['B5a', 'B6'],
      },
      {
        id: 'buildings-jobs',
        dimension: 'jobs',
        label: 'Local renovation jobs',
        detail:
          'Renovation and heat-pump installation are labour-intensive and inherently local — a construction-sector jobs engine in every Member State.',
        linkedTo: ['b2-renovation-strategies'],
      },
    ],
    keywords: ['building', 'renovation', 'heating', 'heat pump', 'dwelling', 'epbd'],
  },
  {
    sectorId: 'agriculture',
    recPrefix: 'A',
    progress: [
      { code: 'A1', indicatorId: 'esabcc-a1-agri-nonco2', headline: true },
      { code: 'A3', indicatorId: 'esabcc-a3-fertiliser-use' },
      { code: 'A5', indicatorId: 'esabcc-a5-bovine-consumption' },
      { code: 'A6', indicatorId: 'esabcc-a6-food-waste' },
    ],
    policies: [
      { policyId: 'cap', respondsTo: ['A1', 'A3'] },
      { policyId: 'nec', respondsTo: ['A3'] },
      { policyId: 'farm-to-fork', respondsTo: ['A5', 'A6'] },
      { policyId: 'nature-restoration-law', respondsTo: ['A1'] },
    ],
    featuredRecs: [
      { recId: 'a1-cap-emission-objective', viaPolicies: ['cap'] },
      { recId: 'a2-agri-emissions-pricing', viaPolicies: [] },
      { recId: 'a3-healthy-diets-food-waste', viaPolicies: ['farm-to-fork'] },
      { recId: 'kr9-agriculture-food-incentives', viaPolicies: ['cap'] },
    ],
    coBenefits: [
      {
        id: 'agriculture-water',
        dimension: 'water',
        label: 'Cleaner rivers & groundwater',
        detail:
          'Cutting the nitrogen surplus reduces nitrate leaching and algal blooms — the same fertiliser lever serves climate and the Water Framework Directive.',
        linkedTo: ['A3', 'nec'],
        indicatorId: 'esabcc-a3-nue',
      },
      {
        id: 'agriculture-health',
        dimension: 'health',
        label: 'Healthier diets',
        detail:
          'A shift toward plant-rich diets cuts livestock methane and cardiovascular disease together — the report\'s clearest win–win.',
        linkedTo: ['A5', 'a3-healthy-diets-food-waste'],
      },
      {
        id: 'agriculture-biodiversity',
        dimension: 'biodiversity',
        label: 'Farmland nature recovery',
        detail:
          'Extensification, restored peatland and landscape features rebuild pollinator and farmland-bird populations alongside the carbon gain.',
        linkedTo: ['nature-restoration-law'],
      },
      {
        id: 'agriculture-air',
        dimension: 'air',
        label: 'Ammonia & particulate cuts',
        detail:
          'Less synthetic fertiliser and better manure management cut ammonia — a major precursor of fine-particle pollution under the NEC ceilings.',
        linkedTo: ['A3'],
      },
    ],
    keywords: ['agricult', 'farm', 'food', 'livestock', 'fertilis', 'diet', 'manure'],
  },
  {
    sectorId: 'lulucf',
    recPrefix: 'L',
    progress: [
      { code: 'L1', indicatorId: 'esabcc-l1-lulucf-net', headline: true },
      { code: 'L6', indicatorId: 'esabcc-l6-forest-sink' },
      { code: 'L3', indicatorId: 'esabcc-l3-afforestation' },
      { code: 'L4', indicatorId: 'esabcc-l4-deforestation' },
    ],
    policies: [
      { policyId: 'lulucf-regulation', respondsTo: ['L1', 'L6'] },
      { policyId: 'nature-restoration-law', respondsTo: ['L6'] },
      { policyId: 'forest-strategy', respondsTo: ['L3'] },
      { policyId: 'deforestation-regulation', respondsTo: ['L4'] },
      { policyId: 'cap', respondsTo: ['L1'] },
    ],
    featuredRecs: [
      { recId: 'l1-forests-wetlands-land', viaPolicies: ['cap', 'nature-restoration-law'] },
      { recId: 'l3-lulucf-pricing-instrument', viaPolicies: [] },
      { recId: 'l4-land-use-removal-incentives', viaPolicies: ['lulucf-regulation'] },
      { recId: 'l6-lulucf-sink-contingency', viaPolicies: ['lulucf-regulation'] },
    ],
    coBenefits: [
      {
        id: 'lulucf-biodiversity',
        dimension: 'biodiversity',
        label: 'Habitat doubles as sink',
        detail:
          'Restored forests, wetlands and peatlands are the same hectares the Nature Restoration Law counts — carbon and biodiversity targets share land.',
        linkedTo: ['nature-restoration-law', 'L6'],
      },
      {
        id: 'lulucf-water',
        dimension: 'water',
        label: 'Flood & drought buffering',
        detail:
          'Rewetted peatland and continuous forest cover slow runoff, recharge groundwater and damp flood peaks downstream.',
        linkedTo: ['l1-forests-wetlands-land'],
      },
      {
        id: 'lulucf-resilience',
        dimension: 'resilience',
        label: 'A sink that survives warming',
        detail:
          'Diverse, climate-adapted forests resist the fires, drought and bark-beetle losses that have been eroding the EU sink since 2015.',
        linkedTo: ['L6', 'l6-lulucf-sink-contingency'],
      },
      {
        id: 'lulucf-health',
        dimension: 'health',
        label: 'Green space & cooling',
        detail:
          'Afforestation near cities adds recreation space, urban cooling and measurable mental-health benefits.',
        linkedTo: ['L3'],
      },
    ],
    keywords: ['lulucf', 'forest', 'land use', 'wetland', 'soil', 'sink', 'biomass', 'peat'],
  },
];

// ── Indicator signals — the live "progress reporting" assessment ────────────

export type SignalStatus = 'on-track' | 'watch' | 'off-track' | 'no-target' | 'no-data';

export interface IndicatorSignal {
  status: SignalStatus;
  /** Short badge text, e.g. "On track", "Off track", "No target". */
  label: string;
  color: string;
  /** One-line explanation for the tooltip. */
  hint: string;
  latest?: IndicatorDataPoint;
  /** % change over the recent window (≤5 yrs); sign follows the data. */
  deltaPct?: number;
  /** First year of the window `deltaPct` is computed over. */
  deltaFromYear?: number;
  /** True when the recent movement is in the indicator's good direction. */
  improving?: boolean;
  series: IndicatorDataPoint[];
}

export const SIGNAL_COLORS: Record<SignalStatus, string> = {
  'on-track': '#00928F',
  watch: '#D97706',
  'off-track': '#B83230',
  'no-target': '#5B6B7C',
  'no-data': '#8A95A3',
};

/**
 * Classify an indicator's recent trajectory against its legal target: the
 * observed pace over the last ≤5 data years versus the pace still needed to
 * reach `targetValue` by `targetYear`. ≥85% of the needed pace counts as on
 * track, ≥40% as "watch", anything slower (or moving the wrong way) as off
 * track. Indicators without a target still get a trend read-out.
 */
export function indicatorSignal(ind: Indicator): IndicatorSignal {
  const series = [...ind.data].sort((a, b) => a.year - b.year);
  if (series.length < 2) {
    return {
      status: 'no-data', label: 'No data', color: SIGNAL_COLORS['no-data'],
      hint: 'Fewer than two data points — no trend can be read.', series,
    };
  }
  const latest = series[series.length - 1];
  const refIdx = series.findIndex(p => p.year >= latest.year - 5);
  const ref = series[Math.max(0, refIdx)];
  const span = latest.year - ref.year;
  const observedPace = span > 0 ? (latest.value - ref.value) / span : 0;
  const deltaPct = ref.value !== 0 ? ((latest.value - ref.value) / Math.abs(ref.value)) * 100 : undefined;
  const goodSign = ind.direction === 'down' ? -1 : 1;
  const improving = observedPace * goodSign > 0;

  const base = { latest, deltaPct, deltaFromYear: ref.year, improving, series };

  if (ind.targetValue === undefined || ind.targetYear === undefined || ind.targetYear <= latest.year) {
    return {
      ...base, status: 'no-target', label: improving ? 'Improving' : 'Worsening',
      color: improving ? SIGNAL_COLORS['on-track'] : SIGNAL_COLORS['off-track'],
      hint: 'No quantified target on file — showing the recent trend only.',
    };
  }

  const required = ind.targetValue - latest.value;
  // Already at or beyond the target level.
  if (required * goodSign <= 0) {
    return {
      ...base, status: 'on-track', label: 'Target met', color: SIGNAL_COLORS['on-track'],
      hint: `Already at or beyond the ${ind.targetYear} target level.`,
    };
  }
  const neededPace = required / (ind.targetYear - latest.year);
  if (observedPace * goodSign <= 0) {
    return {
      ...base, status: 'off-track', label: 'Off track', color: SIGNAL_COLORS['off-track'],
      hint: `Moving away from the ${ind.targetYear} target (${ind.targetValue} ${ind.unit}).`,
    };
  }
  const ratio = observedPace / neededPace;
  if (ratio >= 0.85) {
    return {
      ...base, status: 'on-track', label: 'On track', color: SIGNAL_COLORS['on-track'],
      hint: `Recent pace ≈ ${Math.round(ratio * 100)}% of what the ${ind.targetYear} target requires.`,
    };
  }
  if (ratio >= 0.4) {
    return {
      ...base, status: 'watch', label: 'Too slow', color: SIGNAL_COLORS.watch,
      hint: `Recent pace is only ${Math.round(ratio * 100)}% of what the ${ind.targetYear} target requires.`,
    };
  }
  return {
    ...base, status: 'off-track', label: 'Off track', color: SIGNAL_COLORS['off-track'],
    hint: `Recent pace is ${Math.round(ratio * 100)}% of what the ${ind.targetYear} target requires.`,
  };
}

// ── Resolved flow model (what the board renders) ────────────────────────────

export interface FlowIndicator {
  code: string;
  indicator: Indicator;
  signal: IndicatorSignal;
  headline: boolean;
}

export interface FlowPolicy {
  policy: SectorPolicy;
  respondsTo: string[];
}

export interface FlowRec {
  rec: PastRecommendation;
  viaPolicies: string[];
  /** True when the recommendation has no instrument to flow through. */
  gap: boolean;
}

export interface FlowCoBenefit extends CoBenefitDef {
  indicator?: Indicator;
  signal?: IndicatorSignal;
}

export interface SectorFlow {
  def: SectorFlowDef;
  sector: SectorFramework;
  indicators: FlowIndicator[];
  policies: FlowPolicy[];
  recs: FlowRec[];
  /** Remaining chapter recommendations not drawn as cards. */
  moreRecs: PastRecommendation[];
  coBenefits: FlowCoBenefit[];
  /** Uptake mix across every recommendation in the sector chapter. */
  statusCounts: Record<RecommendationStatus, number>;
}

const recById = new Map(ESABCC_2024_RECOMMENDATIONS.map(r => [r.id, r]));
const policyById = new Map(SECTOR_POLICIES.map(p => [p.id, p]));

/** All 2024 sectoral recommendations of one report chapter (E1…, T1…, …). */
function chapterRecs(prefix: string): PastRecommendation[] {
  const re = new RegExp(`^${prefix}\\d+ ·`);
  return ESABCC_2024_RECOMMENDATIONS.filter(r => re.test(r.area));
}

/** Resolve one sector's curated wiring against the live databases. */
export function buildSectorFlow(def: SectorFlowDef): SectorFlow {
  const sector = SECTOR_FRAMEWORKS.find(s => s.id === def.sectorId)!;

  const indicators: FlowIndicator[] = def.progress
    .map(p => {
      const indicator = FRAMEWORK_INDICATOR_INDEX[p.indicatorId];
      if (!indicator) return null;
      return { code: p.code, indicator, signal: indicatorSignal(indicator), headline: !!p.headline };
    })
    .filter((x): x is FlowIndicator => x !== null);

  const policies: FlowPolicy[] = def.policies
    .map(p => {
      const policy = policyById.get(p.policyId);
      return policy ? { policy, respondsTo: p.respondsTo } : null;
    })
    .filter((x): x is FlowPolicy => x !== null);

  const recs: FlowRec[] = def.featuredRecs
    .map(r => {
      const rec = recById.get(r.recId);
      return rec ? { rec, viaPolicies: r.viaPolicies, gap: r.viaPolicies.length === 0 } : null;
    })
    .filter((x): x is FlowRec => x !== null);

  const featuredIds = new Set(recs.map(r => r.rec.id));
  const chapter = chapterRecs(def.recPrefix);
  const moreRecs = chapter.filter(r => !featuredIds.has(r.id));

  const statusCounts: Record<RecommendationStatus, number> = {
    'not-addressed': 0, 'in-progress': 0, partially: 0, addressed: 0,
  };
  const counted = new Set<string>();
  for (const r of [...chapter, ...recs.map(x => x.rec)]) {
    if (counted.has(r.id)) continue;
    counted.add(r.id);
    statusCounts[r.status] += 1;
  }

  const coBenefits: FlowCoBenefit[] = def.coBenefits.map(cb => {
    const indicator = cb.indicatorId ? FRAMEWORK_INDICATOR_INDEX[cb.indicatorId] : undefined;
    return { ...cb, indicator, signal: indicator ? indicatorSignal(indicator) : undefined };
  });

  return { def, sector, indicators, policies, recs, moreRecs, coBenefits, statusCounts };
}

/** All six sector flows, resolved. Cheap enough to build per render. */
export function buildAllSectorFlows(): SectorFlow[] {
  return SECTOR_FLOW_DEFS.map(buildSectorFlow);
}

// ── Workspace evidence — tying the chart back to the coded corpus ───────────

export interface CorpusEvidence {
  documents: number;
  segments: number;
}

/**
 * Coded evidence in the active workspace corpus that belongs to one policy
 * card: documents matched by CELEX number (exact) or acronym/title fragment
 * (soft), plus the coded segments on those documents.
 */
export function policyCorpusEvidence(
  policy: SectorPolicy,
  documents: AnalysisDocument[],
  segments: CodedSegment[],
): CorpusEvidence {
  const acronym = (policy.acronym ?? '').toLowerCase();
  const name = policy.name.toLowerCase();
  const matched = new Set<string>();
  for (const d of documents) {
    const celex = (d.celexNumber ?? '').toUpperCase();
    if (policy.ceLexId && celex && celex.includes(policy.ceLexId.toUpperCase())) {
      matched.add(d.id);
      continue;
    }
    const t = `${d.title ?? ''} ${d.shortTitle ?? ''}`.toLowerCase();
    if ((acronym.length >= 3 && t.includes(acronym)) || t.includes(name)) matched.add(d.id);
  }
  if (matched.size === 0) return { documents: 0, segments: 0 };
  const segs = segments.filter(s => matched.has(s.documentId)).length;
  return { documents: matched.size, segments: segs };
}

/**
 * Soft sector-level counter: coded segments in the workspace whose code name
 * or document title matches the sector's keyword set. A heuristic signal —
 * shown as "evidence in this workspace touching the sector", not a count of
 * formally classified passages.
 */
export function sectorCorpusEvidence(
  def: SectorFlowDef,
  documents: AnalysisDocument[],
  codes: CodeNode[],
  segments: CodedSegment[],
): CorpusEvidence {
  const matchText = (s: string) => {
    const t = s.toLowerCase();
    return def.keywords.some(k => t.includes(k));
  };
  const matchedCodes = new Set(codes.filter(c => matchText(c.name)).map(c => c.id));
  const matchedDocs = new Set(
    documents.filter(d => matchText(`${d.title ?? ''} ${d.shortTitle ?? ''}`)).map(d => d.id),
  );
  const hitDocs = new Set<string>();
  let hits = 0;
  for (const s of segments) {
    if (matchedCodes.has(s.codeId) || matchedDocs.has(s.documentId)) {
      hits += 1;
      hitDocs.add(s.documentId);
    }
  }
  return { documents: hitDocs.size, segments: hits };
}
