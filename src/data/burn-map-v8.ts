/**
 * Advanced version 8 — the BURN MAP (twin heat maps → one recommendation).
 * ------------------------------------------------------------------------
 * The headline figure, rebuilt around two heat maps and a single derivation:
 *
 *   A · PROGRESS HEAT MAP — the monitoring side. One row per sector, four
 *     fixed lenses per row (emissions & removals · technology & delivery ·
 *     demand & activity · investment & enablers), each cell a reading
 *     (on track / lagging / off track) with its basis and source stated.
 *   B · POLICY-COHERENCE HEAT MAP — the policy-analysis side. The same
 *     sector bands, but the rows are the sector's assessed EU acts and the
 *     columns are the four steps of the beta policy-coherence model
 *     (`src/lib/content-analysis/policy-coherence.ts`): ex ante assumptions
 *     vs world development · coherence across goals · goals ↔ means ·
 *     evaluation. Every cell grade is computed live by
 *     `buildCoherenceProfile`, so map B can never drift from the coherence
 *     assessment it visualises.
 *   🔥 THE BURNS — the hot cells: `off-track` on map A, `incoherent` on
 *     map B. They are collected into a burn ledger and assigned to a
 *     response front by one declared rule (below).
 *   ⇒ ONE RECOMMENDATION — a single headline recommendation whose three
 *     fronts between them claim every burn on the board, each front backed
 *     by the ESABCC's own recommendations (resolved live from the tracker
 *     seed, so uptake status stays current).
 *
 * The burn-assignment rule (declared, mechanical):
 *   1. any burn in the land system (Agriculture & food, LULUCF & forests)
 *      → front 1 — land burns on BOTH maps at once;
 *   2. any remaining MONITORING burn (map A) → front 2 — outside the land
 *      system, the progress map burns where demand is unregulated;
 *   3. any remaining COHERENCE burn (map B) → front 3 — outside the land
 *      system, the coherence map burns where acts were weakened at first
 *      contact (in-law relief, scope cuts, persistent governance gaps).
 *
 * Like Advanced version 7 this is a computed, read-only analytical view.
 * Map B and the burn ledger are fully computed; map A's readings are the
 * curated monitoring layer — each cell carries the observation and source
 * the reading follows from, mirroring the evidence discipline of the
 * coherence model (and of the ESABCC report's own pace-not-position rule).
 */
import { FRAMEWORK_INDICATOR_INDEX } from './sector-frameworks';
import { policies as POLICY_REGISTRY } from './policies';
import {
  buildCoherenceProfile,
  COHERENCE_STEPS,
  type CoherenceGrade,
  type CoherenceStepId,
  type PolicyCoherenceProfile,
} from '@/lib/content-analysis/policy-coherence';
import {
  ESABCC_2024_RECOMMENDATIONS,
  type RecommendationStatus,
} from './esabcc-recommendations';

/** Current schema version of the v8 burn-map view. */
export const BURN_MAP_V8_VERSION = 2;

// ── Map A vocabulary: the four progress lenses ──────────────────────────────

export type ProgressLensId = 'emissions' | 'technology' | 'demand' | 'enablers';

export interface ProgressLens {
  id: ProgressLensId;
  index: number;
  name: string;
  short: string;
  question: string;
}

export const PROGRESS_LENSES: readonly ProgressLens[] = [
  {
    id: 'emissions',
    index: 1,
    name: 'Emissions & removals',
    short: 'Emissions',
    question: 'Is the realised emissions / sink line bending at the pace the corridor requires?',
  },
  {
    id: 'technology',
    index: 2,
    name: 'Technology & delivery',
    short: 'Technology',
    question: 'Are the delivery levers (build-out, uptake, renovation, restoration) moving at corridor pace?',
  },
  {
    id: 'demand',
    index: 3,
    name: 'Demand & activity',
    short: 'Demand',
    question: 'Is the structural driver underneath (consumption, traffic, diets, harvest pressure) turning?',
  },
  {
    id: 'enablers',
    index: 4,
    name: 'Investment & enablers',
    short: 'Enablers',
    question: 'Are finance, infrastructure and plans arriving in time to sustain the pace?',
  },
];

/** Map-A reading — same trichotomy as the coherence model's step 4. */
export type ProgressReading = 'on-track' | 'lagging' | 'off-track';

export const READING_META: Record<ProgressReading, { label: string; color: string }> = {
  'on-track': { label: 'On track', color: '#16A34A' },
  lagging: { label: 'Lagging', color: '#F59E0B' },
  'off-track': { label: 'Off track', color: '#DC2626' },
};

/** Map-B grade colours — identical to the Policy Coherence board's. */
export const GRADE_META: Record<CoherenceGrade, { label: string; color: string; fg: string }> = {
  coherent: { label: 'Coherent', color: '#16A34A', fg: '#fff' },
  partial: { label: 'Partial', color: '#F59E0B', fg: '#fff' },
  incoherent: { label: 'Incoherent', color: '#DC2626', fg: '#fff' },
  'not-assessed': { label: 'Not assessed', color: '#E5E7EB', fg: '#6B7280' },
};

export const REC_STATUS_META: Record<RecommendationStatus, { label: string; color: string }> = {
  addressed: { label: 'Addressed', color: '#15803D' },
  partially: { label: 'Partially addressed', color: '#B45309' },
  'in-progress': { label: 'In progress', color: '#1D4ED8' },
  'not-addressed': { label: 'Not addressed', color: '#B91C1C' },
};

// ── Board model ──────────────────────────────────────────────────────────────

export interface ProgressCell {
  lens: ProgressLensId;
  reading: ProgressReading;
  /** The indicator the cell is read on. */
  indicator: string;
  /** The observation the reading follows from, figures where available. */
  basis: string;
  /** Citable source of the observation. */
  source: string;
  /** Links into the indicator database (data drawer). Empty → text-only cell. */
  indicatorIds: string[];
}

export interface BurnSector {
  key: string;
  label: string;
  color: string;
  /** One-line systems description of this band of the map. */
  blurb: string;
  /** Map A — one cell per lens, in PROGRESS_LENSES order. */
  cells: ProgressCell[];
  /** Map B — the sector's acts in the coherence model's id space. */
  policyIds: string[];
}

export interface BurnMapBoard {
  version: number;
  sectors: BurnSector[];
}

// ── Curated content: map A readings + the sector → acts mapping ─────────────
//
// Each reading states the observation and source it follows from. The
// sector→policy mapping assigns every coherence-assessed act to exactly ONE
// band (its centre of gravity), so the joined map counts each act once.

interface SectorSpec {
  key: string;
  label: string;
  color: string;
  blurb: string;
  cells: Omit<ProgressCell, 'lens'>[]; // in PROGRESS_LENSES order
  policyIds: string[];
}

const SECTOR_SPECS: readonly SectorSpec[] = [
  {
    key: 'economy-wide',
    label: 'EU economy-wide',
    color: '#9E4A46',
    blurb:
      'The master band: the corridor, the cross-cutting machinery and the finance layer — where the whole map is steered and funded.',
    cells: [
      {
        reading: 'lagging',
        indicator: 'Net GHG emissions vs the Climate Law corridor',
        basis:
          'Net emissions ~−37% below 1990 by 2023, but the final NECPs project only ~−54% by 2030 against −55% — and the required pace nearly doubles after 2030.',
        source: 'EEA GHG inventory; Commission NECP aggregate assessment.',
        indicatorIds: ['ghg-total-net', 'esabcc-o1-ghg-total'],
      },
      {
        reading: 'lagging',
        indicator: 'Clean-tech investment & manufacturing position',
        basis:
          'Clean-tech investment is rising, but the EU keeps losing manufacturing share in solar PV and batteries to imports.',
        source: 'JRC cleantech monitoring; IEA investment tracking.',
        indicatorIds: ['clean-tech-investment'],
      },
      {
        reading: 'lagging',
        indicator: 'Primary & final energy demand',
        basis:
          'Consumption fell sharply in 2022–23, but official analyses attribute a large share to crisis demand response rather than structural efficiency.',
        source: 'Eurostat energy balances; EEA Trends & Projections.',
        indicatorIds: [],
      },
      {
        reading: 'off-track',
        indicator: 'Climate investment gap',
        basis:
          'The economy-wide climate investment gap persists (of the order of €400 bn/yr) and the post-RRF public-finance pipeline is unresolved.',
        source: 'ECNO / I4CE investment-gap analyses; Commission strategic foresight.',
        indicatorIds: [],
      },
    ],
    policyIds: [
      'eu-climate-law',
      'governance-regulation',
      'fit-for-55',
      'eu-green-deal',
      'effort-sharing-regulation',
      'taxonomy-regulation',
      'csrd',
    ],
  },
  {
    key: 'energy-supply',
    label: 'Energy supply',
    color: '#2563EB',
    blurb:
      'The coolest band on the monitoring map — supply decarbonises roughly on corridor — but its demand-switch cell burns: the system cleans faster than demand electrifies.',
    cells: [
      {
        reading: 'on-track',
        indicator: 'Energy-supply GHG emissions',
        basis:
          'Power-sector emissions are falling faster than the economy-wide average as coal exits and renewables scale; verified ETS stationary emissions sit below the cap path.',
        source: 'EEA ETS data viewer; EU GHG inventory.',
        indicatorIds: ['power-sector-ghg', 'esabcc-e1-energy-supply-ghg'],
      },
      {
        reading: 'on-track',
        indicator: 'Renewables build-out',
        basis:
          'Record solar additions and recovering wind auctions; the RES share (24.5% in 2023) trails the linear path to 42.5% by under 2 pp.',
        source: 'Eurostat SHARES; industry deployment statistics.',
        indicatorIds: ['solar-pv-additions', 'wind-additions', 'res-share'],
      },
      {
        reading: 'off-track',
        indicator: 'Electrification of final demand',
        basis:
          'The electricity share of final energy is stagnant near 23% against a ~30% 2030 benchmark — supply decarbonises but demand does not switch to it.',
        source: 'Eurostat energy balances; ECNO electrification tracking.',
        indicatorIds: [],
      },
      {
        reading: 'lagging',
        indicator: 'Grids, storage & interconnection',
        basis:
          'Grid investment and interconnector build-out trail the renewables they must absorb; storage scales from a low base.',
        source: 'ENTSO-E TYNDP; ACER market monitoring.',
        indicatorIds: ['battery-storage-capacity'],
      },
    ],
    policyIds: [
      'renewable-energy-directive',
      'energy-efficiency-directive',
      'repowereu-plan',
      'methane-regulation',
    ],
  },
  {
    key: 'industry',
    label: 'Industry',
    color: '#475569',
    blurb:
      'Emissions fall under the tightening cap, but the technology cell burns: the decline is partly lost output, and breakthrough capacity is mostly pre-FID.',
    cells: [
      {
        reading: 'lagging',
        indicator: 'Industrial GHG emissions',
        basis:
          'Emissions decline under the tightened ETS, but attribution analyses assign part of the 2022–23 fall to crisis output contraction rather than transformation.',
        source: 'EEA ETS data viewer; Commission carbon market reports.',
        indicatorIds: ['industry-ghg', 'esabcc-i1-industry-ghg'],
      },
      {
        reading: 'off-track',
        indicator: 'Breakthrough technology deployment',
        basis:
          'Hydrogen-DRI, CCS and electrified process-heat projects are mostly pre-FID; EU solar-module manufacturing share remains in low single digits with exits.',
        source: 'JRC cleantech monitoring; project trackers.',
        indicatorIds: ['esabcc-i4-steel-ghg-intensity', 'clean-tech-trade-balance'],
      },
      {
        reading: 'lagging',
        indicator: 'Material demand & circularity',
        basis:
          'The circular material use rate is flat near 11.5%; primary material demand is untouched by any binding instrument.',
        source: 'Eurostat circular-economy indicators.',
        indicatorIds: ['esabcc-i3-circular-mat-use'],
      },
      {
        reading: 'lagging',
        indicator: 'Transformation investment conditions',
        basis:
          'Energy-price differentials with competitors persist and state-aid / Innovation Fund delivery is slower than the investment cycle it must catch.',
        source: 'Commission competitiveness reports; Innovation Fund dashboards.',
        indicatorIds: [],
      },
    ],
    policyIds: [
      'eu-ets-directive',
      'cbam-regulation',
      'net-zero-industry-act',
      'critical-raw-materials-act',
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    color: '#7C3AED',
    blurb:
      'The hottest monitoring band: the only sector above its 1990 emissions, a stalled technology cell after in-law relief, and a demand cell no instrument regulates.',
    cells: [
      {
        reading: 'off-track',
        indicator: 'Transport GHG emissions',
        basis:
          'The only sector whose emissions remain above 1990; the 2030 corridor requires a bend that current fleet turnover cannot deliver in time.',
        source: 'EU GHG inventory; EEA Trends & Projections.',
        indicatorIds: ['esabcc-t1-transport-ghg'],
      },
      {
        reading: 'lagging',
        indicator: 'Zero-emission vehicle uptake',
        basis:
          'The BEV share of new registrations stalled in the mid-teens in 2024, and the 2025 CO₂ compliance step was converted into 2025–27 averaging.',
        source: 'ACEA registrations; amending regulation (2025, OJ).',
        indicatorIds: ['ev-share-new-cars'],
      },
      {
        reading: 'off-track',
        indicator: 'Transport demand & modal shift',
        basis:
          'Passenger and freight volumes keep growing while the rail / inland-waterway share stays flat — demand growth eats the technology gains.',
        source: 'Eurostat transport statistics.',
        indicatorIds: ['rail-iww-freight-share'],
      },
      {
        reading: 'lagging',
        indicator: 'Charging & refuelling infrastructure',
        basis:
          'Light-duty public charging tracks the AFIR fleet formula in most Member States; heavy-duty pools and hydrogen stations lag their later milestones.',
        source: 'European Alternative Fuels Observatory (EAFO).',
        indicatorIds: ['zev-charging-points'],
      },
    ],
    policyIds: ['co2-cars-regulation', 'afir-regulation', 'fueleu-maritime', 'refueleu-aviation'],
  },
  {
    key: 'buildings',
    label: 'Buildings',
    color: '#D97706',
    blurb:
      'Falling emissions flatter the band — warm winters and crisis prices did much of it — while the delivery cell burns: renovation and heat pumps run at half pace.',
    cells: [
      {
        reading: 'lagging',
        indicator: 'Buildings GHG emissions',
        basis:
          'Emissions decline, but mild winters and crisis-driven demand response account for a substantial share — the structural trend is weaker than the headline.',
        source: 'EU GHG inventory; EEA Trends & Projections.',
        indicatorIds: ['buildings-ghg', 'esabcc-b1-buildings-ghg'],
      },
      {
        reading: 'off-track',
        indicator: 'Renovation & heat-pump rollout',
        basis:
          'Deep renovation is stuck near 1%/yr — roughly half the corridor pace — and heat-pump sales fell back in 2023–24.',
        source: 'BPIE renovation monitors; EHPA sales statistics.',
        indicatorIds: ['building-renovation-rate', 'heat-pump-sales'],
      },
      {
        reading: 'lagging',
        indicator: 'Floor area & sufficiency',
        basis:
          'Per-capita floor area keeps rising; no EU instrument touches the demand side of the stock.',
        source: 'Eurostat / national building stock statistics.',
        indicatorIds: [],
      },
      {
        reading: 'lagging',
        indicator: 'Renovation financing & plans',
        basis:
          'Financing costs rose with rates; Social Climate Plans are not yet operational and national renovation plans are only due in 2026.',
        source: 'Commission EPBD implementation reports; SCF guidance.',
        indicatorIds: [],
      },
    ],
    policyIds: ['epbd-recast', 'social-climate-fund'],
  },
  {
    key: 'agriculture',
    label: 'Agriculture & food',
    color: '#16A34A',
    blurb:
      'A band that burns on both maps at once: flat emissions and an untouched demand side under a policy frame whose assumptions were weakened in law mid-period.',
    cells: [
      {
        reading: 'off-track',
        indicator: 'Agricultural non-CO₂ emissions',
        basis:
          'Non-CO₂ emissions have been essentially flat since 2010 while the 2030 benchmark assumes a fall; no instrument prices them.',
        source: 'EU GHG inventory; EEA Trends & Projections.',
        indicatorIds: ['agri-ghg', 'esabcc-a1-agri-nonco2'],
      },
      {
        reading: 'lagging',
        indicator: 'Farming-practice transition',
        basis:
          'Organic area reached 10.5% (2022) against the 25% 2030 goal; nutrient-management and feed measures remain marginal.',
        source: 'Eurostat organic farming statistics.',
        indicatorIds: ['organic-farming-share', 'nitrogen-fertiliser-use'],
      },
      {
        reading: 'off-track',
        indicator: 'Diets & food waste',
        basis:
          'Dietary shift and food-waste reduction — the largest demand-side levers — are untouched by any binding EU instrument after the framework law was never tabled.',
        source: 'Eurostat food-waste statistics; Commission work programme 2024.',
        indicatorIds: ['food-waste-per-capita'],
      },
      {
        reading: 'off-track',
        indicator: 'Transition finance for farming',
        basis:
          'CAP payments still scale with area and herd; there is no dedicated transition finance for extensification or emission cuts.',
        source: 'CAP strategic-plan approvals; ECA reviews.',
        indicatorIds: [],
      },
    ],
    policyIds: ['cap-strategic-plans', 'farm-to-fork-strategy'],
  },
  {
    key: 'lulucf',
    label: 'LULUCF & forests',
    color: '#059669',
    blurb:
      'The other land band: a shrinking sink the corridor counts on, with the design assumption behind the −310 Mt target already violated on the coherence map.',
    cells: [
      {
        reading: 'off-track',
        indicator: 'Net LULUCF sink',
        basis:
          'The reported net sink declined to roughly −200 Mt — about 110 Mt below the 2013–16 reference and persistent across inventory years — against a −310 Mt 2030 target.',
        source: 'EEA / UNFCCC EU GHG inventory.',
        indicatorIds: ['lulucf-net-removal', 'adv-forest-sink-decline'],
      },
      {
        reading: 'lagging',
        indicator: 'Restoration & forest management action',
        basis:
          'Afforestation and restoration run far below the pace the target implies; national restoration plans are only due September 2026.',
        source: 'Commission; Environment Council records.',
        indicatorIds: ['esabcc-l3-afforestation'],
      },
      {
        reading: 'off-track',
        indicator: 'Harvest & disturbance pressure',
        basis:
          'Harvest rates plus fire and bark-beetle disturbance erode the standing stock the sink projection assumes left standing.',
        source: 'EFFIS burnt-area statistics; forest-disturbance literature.',
        indicatorIds: ['adv-adapt-burnt-area', 'adv-adapt-forest-disturbance'],
      },
      {
        reading: 'off-track',
        indicator: 'Removal incentives for land managers',
        basis:
          'No EU instrument yet pays land managers for verified removals; carbon-farming certification is not operative at scale.',
        source: 'CRCF implementation state of play.',
        indicatorIds: [],
      },
    ],
    policyIds: ['lulucf-regulation', 'nature-restoration-law'],
  },
];

// ── The one big recommendation ───────────────────────────────────────────────

export type FrontKey = 'land' | 'demand' | 'ratchet';

export interface RecommendationFront {
  key: FrontKey;
  index: number;
  name: string;
  /** Which burns this front claims — the declared assignment rule, per front. */
  claims: string;
  /** What to do — the front's share of the one recommendation. */
  action: string;
  /** ESABCC recommendations the front builds on (tracker ids). */
  recIds: string[];
}

export interface BigRecommendation {
  kicker: string;
  /** THE recommendation, in one sentence. */
  headline: string;
  rationale: string;
  fronts: RecommendationFront[];
}

export const BIG_RECOMMENDATION: BigRecommendation = {
  kicker: 'One recommendation · three fronts · every burn claimed',
  headline:
    'Use the 2040 target package — the one decision that reopens every act at once — to retrofit the framework where the map burns: give the land system a real steering instrument, regulate demand where technology alone cannot bend the line, and protect the ratchet so acts are flanked instead of weakened at first contact.',
  rationale:
    'The two maps burn in different places, and that asymmetry is the finding. The land system burns on both at once — failing outcomes under a policy frame whose own assumptions are violated. Outside it, the monitoring map burns almost only in demand-side cells, which no EU instrument regulates; and the coherence map burns almost only where adopted acts were weakened on first market contact. One package answers all three patterns, because the 2040 architecture must reopen the CAP, the post-2030 targets and the flanking finance together.',
  fronts: [
    {
      key: 'land',
      index: 1,
      name: 'Steer the land system',
      claims: 'every burn in Agriculture & food and LULUCF & forests — on either map',
      action:
        'Put an emission objective into the post-2027 CAP, price agricultural and land-sector carbon, pay land managers for verified removals and restoration, and plan explicitly for the sink falling short of −310 Mt.',
      recIds: [
        'kr9-agriculture-food-incentives',
        'a1-cap-emission-objective',
        'a2-agri-emissions-pricing',
        'c4-agri-lulucf-pricing',
        'l4-land-use-removal-incentives',
        'l6-lulucf-sink-contingency',
      ],
    },
    {
      key: 'demand',
      index: 2,
      name: 'Regulate demand, not only technology',
      claims: 'every remaining monitoring burn (map A) — they are the unregulated demand-side cells',
      action:
        'Pair every technology standard with a demand-side instrument: transport demand management and modal shift, electrification targets for final demand, material-demand and sufficiency levers for industry and buildings, and an investment plan that closes the enabling gap.',
      recIds: [
        'kr12-energy-material-demand-reduction',
        't1-curb-transport-demand',
        't2-modal-shift',
        'b4-buildings-demand-sufficiency',
        'i1-circular-economy-ceap2',
        'kr11-scale-climate-investment',
      ],
    },
    {
      key: 'ratchet',
      index: 3,
      name: 'Protect the ratchet',
      claims: 'every remaining coherence burn (map B) — they mark acts weakened at first contact',
      action:
        'Replace in-law relief with flanking support: enforce the Governance Regulation instead of re-running gap cycles, run the Climate Law Art. 6(4) consistency check on every amendment (CO₂-standards averaging, omnibus de-scoping, GAEC relaxation), and adopt the one blocked file — energy taxation — so the price signal stops leaking.',
      recIds: [
        'kr1-necps-implementation',
        'kr6-strengthen-governance',
        'kr5-policy-consistency-climate-neutrality',
        'kr2-adopt-pending-greendeal',
      ],
    },
  ],
};

// ── Burn ledger: computed from both maps + the declared assignment rule ─────

export interface ProgressBurn {
  kind: 'progress';
  sectorKey: string;
  sectorLabel: string;
  color: string;
  lens: ProgressLensId;
  /** "Transport · Demand & activity" — the chip label. */
  label: string;
  basis: string;
  front: FrontKey;
}

export interface CoherenceBurn {
  kind: 'coherence';
  sectorKey: string;
  sectorLabel: string;
  color: string;
  policyId: string;
  policyLabel: string;
  step: CoherenceStepId;
  /** "CAP strategic plans · Ex ante" — the chip label. */
  label: string;
  basis: string;
  front: FrontKey;
}

export type Burn = ProgressBurn | CoherenceBurn;

const LAND_SECTORS = new Set(['agriculture', 'lulucf']);

/** The declared burn-assignment rule (see header). */
export function assignFront(burn: { kind: Burn['kind']; sectorKey: string }): FrontKey {
  if (LAND_SECTORS.has(burn.sectorKey)) return 'land';
  return burn.kind === 'progress' ? 'demand' : 'ratchet';
}

const POLICY_TITLE = new Map(POLICY_REGISTRY.map((p) => [p.id, p.short_title] as const));

export function policyTitle(id: string): string {
  return POLICY_TITLE.get(id) ?? id;
}

const LENS_BY_ID = Object.fromEntries(PROGRESS_LENSES.map((l) => [l.id, l])) as Record<
  ProgressLensId,
  ProgressLens
>;
const STEP_BY_ID = Object.fromEntries(COHERENCE_STEPS.map((s) => [s.id, s]));

/** One-line evidence summary for a coherence cell, used in tooltips & burns. */
export function coherenceCellBasis(
  profile: PolicyCoherenceProfile,
  step: CoherenceStepId,
): string {
  switch (step) {
    case 'ex-ante':
      return profile.exAnte
        ? `Assumption ${profile.exAnte.status.replace('-', ' ')}: ${profile.exAnte.observation}`
        : 'No ex-ante assessment.';
    case 'horizontal': {
      if (profile.interactions.length === 0) return 'No assessed goal interactions.';
      const worst = [...profile.interactions].sort((a, b) => a.score - b.score)[0];
      const other = worst.a === profile.policyId ? worst.b : worst.a;
      return `Worst interaction ${worst.score} with ${policyTitle(other)}: ${worst.rationale}`;
    }
    case 'goals-means':
      return profile.means.score === null
        ? 'No means-side checklist verdicts.'
        : `Means-coherence score ${Math.round(profile.means.score * 100)}% across the checklist's instruments / coverage / enforcement / financing / timeline criteria.`;
    case 'evaluation': {
      const m = profile.evaluation.measurement;
      if (!m) return 'No outcome measurement; grade reflects MRV/review machinery.';
      const ratio = m.pace.ratio === null ? '—' : m.pace.ratio.toFixed(2);
      return `${m.indicator}: observed pace ÷ required pace = ${ratio} → ${m.pace.reading.replace('-', ' ')}.`;
    }
  }
}

export interface BurnLedger {
  burns: Burn[];
  byFront: Record<FrontKey, Burn[]>;
  progressCount: number;
  coherenceCount: number;
}

/** Collect every burn on both maps and assign each to its front. */
export function computeBurnLedger(
  board: BurnMapBoard,
  profiles: Map<string, PolicyCoherenceProfile>,
): BurnLedger {
  const burns: Burn[] = [];
  for (const s of board.sectors) {
    for (const c of s.cells) {
      if (c.reading !== 'off-track') continue;
      const burn: ProgressBurn = {
        kind: 'progress',
        sectorKey: s.key,
        sectorLabel: s.label,
        color: s.color,
        lens: c.lens,
        label: `${s.label} · ${LENS_BY_ID[c.lens].name}`,
        basis: c.basis,
        front: 'land',
      };
      burn.front = assignFront(burn);
      burns.push(burn);
    }
    for (const pid of s.policyIds) {
      const profile = profiles.get(pid);
      if (!profile) continue;
      for (const step of COHERENCE_STEPS) {
        if (profile.stepGrades[step.id] !== 'incoherent') continue;
        const burn: CoherenceBurn = {
          kind: 'coherence',
          sectorKey: s.key,
          sectorLabel: s.label,
          color: s.color,
          policyId: pid,
          policyLabel: policyTitle(pid),
          step: step.id,
          label: `${policyTitle(pid)} · ${STEP_BY_ID[step.id].shortName}`,
          basis: coherenceCellBasis(profile, step.id),
          front: 'ratchet',
        };
        burn.front = assignFront(burn);
        burns.push(burn);
      }
    }
  }
  const byFront: Record<FrontKey, Burn[]> = { land: [], demand: [], ratchet: [] };
  for (const b of burns) byFront[b.front].push(b);
  return {
    burns,
    byFront,
    progressCount: burns.filter((b) => b.kind === 'progress').length,
    coherenceCount: burns.filter((b) => b.kind === 'coherence').length,
  };
}

// ── Recommendation chips (resolved live from the tracker seed) ──────────────

export interface RecChip {
  id: string;
  /** Report code, e.g. "KR9", "T1" — derived from the recommendation's area. */
  code: string;
  title: string;
  status: RecommendationStatus;
}

const REC_BY_ID = new Map(ESABCC_2024_RECOMMENDATIONS.map((r) => [r.id, r]));

export function frontRecChips(front: RecommendationFront): RecChip[] {
  return front.recIds
    .map((id): RecChip | null => {
      const r = REC_BY_ID.get(id);
      if (!r) return null;
      return {
        id: r.id,
        code: r.area.split('·')[0]?.trim() || r.area,
        title: r.title,
        status: r.status,
      };
    })
    .filter((r): r is RecChip => !!r);
}

// ── Builders ─────────────────────────────────────────────────────────────────

/** Validate the framework indicator ids at build time (drops unknown ids). */
function knownIds(ids: string[]): string[] {
  return ids.filter((id) => FRAMEWORK_INDICATOR_INDEX[id]);
}

/**
 * The published "Advanced version 8" burn-map board: map A's curated readings
 * joined to the sector → acts mapping that map B is computed over.
 */
export function defaultBurnMapBoardV8(): BurnMapBoard {
  const sectors: BurnSector[] = SECTOR_SPECS.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    blurb: s.blurb,
    cells: s.cells.map((c, i) => ({
      ...c,
      lens: PROGRESS_LENSES[i].id,
      indicatorIds: knownIds(c.indicatorIds),
    })),
    policyIds: s.policyIds,
  }));
  return { version: BURN_MAP_V8_VERSION, sectors };
}

/** Map B, computed live: one coherence profile per act on the board. */
export function buildBoardProfiles(board: BurnMapBoard): Map<string, PolicyCoherenceProfile> {
  const m = new Map<string, PolicyCoherenceProfile>();
  for (const s of board.sectors) {
    for (const pid of s.policyIds) {
      if (!m.has(pid)) m.set(pid, buildCoherenceProfile(pid));
    }
  }
  return m;
}
