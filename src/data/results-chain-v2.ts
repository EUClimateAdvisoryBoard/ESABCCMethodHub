/**
 * Advanced version 2 — the results-chain (M&E) flow chart.
 * --------------------------------------------------------
 * Where the report frameworks (and Advanced version 1) read *down a sector*
 * (goal → outcomes → mitigation levers → enabling conditions), this version
 * re-clusters the **whole** indicator catalogue along the six groups of a
 * classic monitoring-&-evaluation results chain:
 *
 *   1 Input    — resources invested: finance, human & physical assets, policy
 *                choices, institutional capacities.
 *   2 Process  — whether policy processes unfold as intended: quality,
 *                participation, coordination, timelines.
 *   3 Output   — direct products, goods and services from interventions,
 *                including short-term changes.
 *   4 Outcome  — short- to medium-term changes in institutional and
 *                behavioural capacities.
 *   5 Impact   — long-term changes: increased resilience, reduced risk and
 *                vulnerability.
 *   6 Context  — external political, socio-economic, institutional,
 *     & Environmental conditions affecting implementation.
 *
 * Crucially, every group carries **both a mitigation and an adaptation track**,
 * so each outcome (and every other rung of the chain) pairs mitigation
 * indicators with adaptation & resilience indicators of equal standing.
 *
 * The clustering below is the synthesis of a multi-source review of climate
 * M&E results-chain framing (OECD-DAC MEL for climate-risk management, IPCC AR6
 * WGII adaptation M&E, EEA climate-risk indicators, GIZ/UNEP & GEF-STAP
 * adaptation M&E guidance). The decision ladder used:
 *   • finance / carbon price / laws / RD&D / committed capacity → INPUT
 *   • how well the policy machinery runs (implementation, coordination) → PROCESS
 *   • deployed capacity / built assets / additions delivered → OUTPUT
 *   • shares / rates / intensities / adopted behaviour & practice → OUTCOME
 *   • realised emissions, sinks, losses, mortality, damages → IMPACT
 *   • GDP, prices, demographics, the climate signal itself → CONTEXT
 * For adaptation, hazard/climate-signal series sit in CONTEXT when used as the
 * conditions we operate in, and in IMPACT when they are the realised harm the
 * policy exists to reduce (see the two systematic ambiguities flagged in the
 * review).
 *
 * Each chip links to indicator ids already curated in the platform
 * (esabcc / ecno / beta / advanced sets), so clicking one opens the same data
 * drawer the other flow charts use. The board is computed from the id lists
 * below and resolved against `FRAMEWORK_INDICATOR_INDEX`.
 */
import { FRAMEWORK_INDICATOR_INDEX } from './sector-frameworks';

export type ResultsGroupId = 'input' | 'process' | 'output' | 'outcome' | 'impact' | 'context';
export type ResultsTrack = 'mitigation' | 'adaptation';

/** Current schema version of the results-chain board (bump to invalidate edits). */
export const RESULTS_CHAIN_V2_VERSION = 1;

/** One indicator chip inside a results-chain group. */
export interface ResultsChainItem {
  /** Stable id for this chip within the board. */
  refId: string;
  /** Short code shown on the chip (indicator code, or a derived token). */
  code: string;
  /** Indicator name. */
  label: string;
  /** Links into the indicator database. Empty → "no data" chip. */
  indicatorIds: string[];
  /** Which climate track this chip belongs to. */
  track: ResultsTrack;
  /** Sector / category tag for sub-clustering (e.g. 'energy-supply'). */
  sector?: string;
  /**
   * True for a *policy-process* indicator — one that measures the qualitative
   * policy machinery (strategies adopted, plans delivered, coordination,
   * mainstreaming) rather than a purely physical/quantitative outcome. These
   * fill the early rungs of the adaptation track, where (unlike mitigation)
   * action is still mostly about building the governance and process, so the
   * board pairs the quantitative side with the qualitative policy side.
   */
  policy?: boolean;
}

/** One rung of the results chain. */
export interface ResultsGroup {
  id: ResultsGroupId;
  /** 1-based position shown in the numbered badge (matches the framework figure). */
  index: number;
  name: string;
  /** The one-line description from the framework figure. */
  blurb: string;
  /** Accent colour for the band. */
  color: string;
  items: ResultsChainItem[];
}

export interface ResultsChainBoard {
  version: number;
  groups: ResultsGroup[];
}

// ── Group metadata (the six rungs, in chain order) ───────────────────────────

interface GroupMeta {
  id: ResultsGroupId;
  index: number;
  name: string;
  blurb: string;
  color: string;
}

const GROUP_META: readonly GroupMeta[] = [
  {
    id: 'input',
    index: 1,
    name: 'Input',
    blurb: 'Resources invested: financial, human, physical assets, policy choices, institutional capacities.',
    color: '#2F6E5B',
  },
  {
    id: 'process',
    index: 2,
    name: 'Process',
    blurb: 'Whether policy processes unfold as intended: quality, participation, coordination, timelines.',
    color: '#3D6E8C',
  },
  {
    id: 'output',
    index: 3,
    name: 'Output',
    blurb: 'Direct products, goods, and services from interventions, including short-term changes.',
    color: '#4E8595',
  },
  {
    id: 'outcome',
    index: 4,
    name: 'Outcome',
    blurb: 'Short- to medium-term changes in institutional and behavioural capacities.',
    color: '#9E4A46',
  },
  {
    id: 'impact',
    index: 5,
    name: 'Impact',
    blurb: 'Long-term changes: increased resilience, reduced risk and vulnerability.',
    color: '#7A3E6B',
  },
  {
    id: 'context',
    index: 6,
    name: 'Context & Environmental',
    blurb: 'External political, socio-economic, institutional, environmental, and climatic conditions affecting implementation.',
    color: '#7A6E2E',
  },
];

// ── The clustering: indicator ids per group, per track ───────────────────────
//
// Mitigation ladder: finance/price/laws = Input · implementation = Process ·
// deployed/built capacity = Output · shares/rates/intensities = Outcome ·
// emissions/sinks = Impact · macro & socio-economic conditions = Context.

const MITIGATION: Record<ResultsGroupId, string[]> = {
  input: [
    'clean-tech-investment',
    'eu-ets-price',
    'fossil-subsidies',
    'green-bond-issuance',
    'energy-rdd-budget',
    'carbon-pricing-coverage',
    'national-climate-laws',
    'international-climate-finance',
    'cbam-import-coverage',
  ],
  process: [
    'necp-implementation-score',
  ],
  output: [
    'solar-pv-additions',
    'wind-additions',
    'battery-storage-capacity',
    'smart-meter-rollout',
    'zev-charging-points',
    'heat-pump-sales',
    'heat-pump-stock',
    'hydrogen-electrolyser-capacity',
    'engineered-cdr-capacity',
    'battery-mfg-capacity',
    'solar-pv-mfg-capacity',
    'electrolyser-mfg-capacity',
    'esabcc-e4a-solar-pv-add',
    'esabcc-e4b-wind-add',
    'esabcc-b6-heat-pump-stock',
    'esabcc-t5b-zev-lorries-stock',
    'esabcc-l3-afforestation',
    'adv-heat-pump-sales',
    'beta-ccs-capacity',
  ],
  outcome: [
    // energy system shares & intensity
    'res-share',
    'fossil-power-share',
    'end-use-electrification',
    'final-energy-consumption',
    'esabcc-e2-fossil-power-share',
    'esabcc-e2-res-noBio-power-share',
    'esabcc-e3-grid-co2-intensity',
    'esabcc-e5-electrification',
    'esabcc-o2-pec',
    'esabcc-o2-fec',
    'esabcc-o3-gross-inland',
    'adv-res-share-fec',
    'adv-wind-solar-share',
    'adv-fossil-power-share',
    'adv-grid-co2-intensity',
    'beta-fossil-share-gae',
    'beta-energy-intensity',
    // industry
    'industry-electrification',
    'esabcc-i3-circular-mat-use',
    'esabcc-i4-steel-ghg-intensity',
    'esabcc-i4-cement-ghg-intensity',
    'esabcc-i4-chemicals-ghg-intensity',
    'esabcc-i5-industry-fec',
    'esabcc-i6-industry-electrification',
    'adv-circular-material-use',
    'beta-dmc-per-capita',
    'beta-resource-productivity',
    'clean-tech-trade-balance',
    // transport
    'ev-share-new-cars',
    'zev-share-car-stock',
    'road-passenger-share',
    'rail-passenger-share',
    'rail-iww-freight-share',
    'rail-electrification',
    'zev-share-van-stock',
    'zev-share-truck-stock',
    'esabcc-t2a-passenger-demand',
    'esabcc-t2b-freight-demand',
    'esabcc-t3a-road-share-passenger',
    'esabcc-t3b-air-passenger',
    'esabcc-t4-car-co2-intensity',
    'esabcc-t5a-zev-share-newcars',
    'esabcc-t6a-fossil-transport-share',
    'esabcc-t6b-foodcrop-biofuels',
    'adv-new-car-co2',
    'adv-bev-share',
    'adv-res-transport',
    'adv-freight-rail-share',
    'beta-transport-fec',
    'beta-new-car-co2',
    // buildings
    'building-renovation-rate',
    'renewable-heating-cooling',
    'floor-space-per-capita',
    'esabcc-b2-buildings-fec',
    'esabcc-b5a-residential-fossil-share',
    'esabcc-b5b-tertiary-fossil-share',
    'beta-nzeb-new-share',
    // agriculture & demand-side behaviour
    'organic-farming-share',
    'nitrogen-fertiliser-use',
    'cattle-population',
    'food-waste-per-capita',
    'esabcc-a3-fertiliser-use',
    'esabcc-a3-nue',
    'esabcc-a7-bioenergy-feedstock',
    'adv-organic-farming',
    'adv-nitrogen-balance',
    'meat-consumption-per-capita',
    'air-passengers-per-capita',
    'household-energy-per-capita',
  ],
  impact: [
    'ghg-total-net',
    'power-sector-ghg',
    'buildings-ghg',
    'industry-ghg',
    'agri-ghg',
    'lulucf-net-removal',
    'forest-net-sink',
    'harvested-wood-pool',
    'embodied-import-emissions',
    'esabcc-o1-ghg-total',
    'esabcc-e1-energy-supply-ghg',
    'esabcc-e6-energy-ch4',
    'esabcc-i1-industry-ghg',
    'esabcc-t1-transport-ghg',
    'esabcc-b1-buildings-ghg',
    'esabcc-a1-agri-nonco2',
    'esabcc-l1-lulucf-net',
    'adv-eu-ets-emissions',
    'adv-energy-methane',
    'adv-lulucf-net',
    'adv-forest-sink-decline',
    'adv-peatland-emissions',
    'beta-cropland-grassland-flux',
    'beta-wetlands-flux',
  ],
  context: [
    'energy-poverty-share',
    'environmental-employment',
    'adv-energy-poverty',
  ],
};

// Adaptation ladder: strategy/finance/mandate = Input · plans & risk products
// delivered = Output · adopted practice / changed exposure & vulnerability /
// financial resilience = Outcome · realised losses, mortality, damages = Impact ·
// the climate signal & baseline pressures = Context.

const ADAPTATION: Record<ResultsGroupId, string[]> = {
  input: [
    'national-adaptation-strategies',
  ],
  process: [],
  output: [
    'adv-adapt-cities-plans',
  ],
  outcome: [
    'adv-adapt-insurance-gap',
    'beta-adapt-insurance-gap',
    'beta-adapt-flood-prone-population',
    'beta-adapt-rail-disruption',
  ],
  impact: [
    'adv-adapt-economic-losses',
    'climate-economic-losses',
    'adv-adapt-heat-mortality',
    'beta-adapt-heat-mortality',
    'adv-adapt-crop-loss',
    'adv-adapt-west-nile',
    'adv-adapt-burnt-area',
    'beta-adapt-burnt-area',
    'adv-adapt-forest-disturbance',
    'adv-adapt-coastal-transport-damage',
    'beta-adapt-transport-coastal-damage',
    'adv-adapt-river-flood-damage',
    'beta-adapt-energy-drought-damage',
    'beta-adapt-drought-impact',
  ],
  context: [
    'adv-adapt-global-temp',
    'adv-adapt-sea-level',
    'adv-adapt-cooling-degree-days',
    'beta-adapt-cooling-degree-days',
    'adv-adapt-wei',
    'water-exploitation-index',
  ],
};

/**
 * Ids that are *policy-process* indicators — the qualitative policy machinery
 * (strategies adopted, plans delivered, risk assessments, coordination,
 * mainstreaming, finance committed). They dominate the early rungs of the
 * adaptation track, where action is still mostly about building governance and
 * process, so the board pairs the quantitative side with the qualitative side.
 */
const POLICY_PROCESS_IDS = new Set<string>([
  'national-adaptation-strategies',
  'adv-adapt-cities-plans',
]);

// ── Builder ──────────────────────────────────────────────────────────────────

let _ref = 0;

/** Derive a short chip token for indicators that carry no report code. */
function fallbackCode(name: string): string {
  const initials = name
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '•';
}

function buildItems(ids: string[], track: ResultsTrack): ResultsChainItem[] {
  return ids.map((id) => {
    const ind = FRAMEWORK_INDICATOR_INDEX[id];
    return {
      refId: `rc-${++_ref}`,
      code: ind?.code ?? (ind ? fallbackCode(ind.name) : '?'),
      label: ind?.name ?? id,
      indicatorIds: ind ? [id] : [],
      track,
      sector: ind?.category,
      policy: POLICY_PROCESS_IDS.has(id) || undefined,
    };
  });
}

/**
 * The published "Advanced version 2" results-chain board: the whole indicator
 * catalogue clustered along the six M&E groups, each carrying paired mitigation
 * and adaptation tracks.
 */
export function defaultResultsChainBoardV2(): ResultsChainBoard {
  _ref = 0;
  const groups: ResultsGroup[] = GROUP_META.map((g) => ({
    ...g,
    items: [...buildItems(MITIGATION[g.id], 'mitigation'), ...buildItems(ADAPTATION[g.id], 'adaptation')],
  }));
  return { version: RESULTS_CHAIN_V2_VERSION, groups };
}
