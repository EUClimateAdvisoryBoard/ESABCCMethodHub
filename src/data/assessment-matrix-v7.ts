/**
 * Advanced version 7 — the STRUCTURED ASSESSMENT MATRIX.
 * -------------------------------------------------------
 * Versions 1–6 each fixed one weakness of the report frameworks (data quality,
 * the M&E chain, the thematic map, the sector fold-in, the policy loop).
 * Version 7 is the *methodology* board: it encodes the key structural
 * distinctions a monitoring-and-progress scientific report has to keep apart —
 * and shows, transparently, how each one is assessed. Five dimensions:
 *
 *   A  MITIGATION PILLAR — structured by the six *emission sectors*
 *      (Energy, Industry, Buildings, Transport, Agriculture, LULUCF). Each
 *      sector is read corridor → drivers → observed: the benchmark trajectory
 *      it must travel, the underlying levers that bend it, and the realised
 *      emissions/removals it is judged on.
 *   B  ADAPTATION PILLAR — structured by the thirteen *adaptation areas*
 *      (after the UK CCC's monitoring framework): Nature; Working lands and
 *      seas; Food security; Water supply; Energy; Telecoms and ICT; Transport;
 *      Towns and cities; Buildings; Health; Community preparedness and
 *      response; Business; Finance. Each area is read risk ↔ action: the
 *      climate-driven harm signal against the adaptation delivery responding
 *      to it. An empty lane is a stated monitoring gap, never silently dropped.
 *   C  MAIN POLICIES — the seven instrument families that do the steering
 *      (ETS1 + CBAM, ETS2, ESR, LULUCF Regulation, CAP, EU Taxonomy,
 *      Governance Regulation + European Climate Law), each mapped to the
 *      sectors and adaptation areas it reaches, with the next milestone that
 *      bites and an explicit note on its adaptation reach.
 *   D  CROSSCUTTING THEMES — electrification, lifestyle change, funding &
 *      finance, infrastructure, innovation, CDR, labour & skills. These cut
 *      across both pillars; their overlaps with sectors/areas are *stated* on
 *      each row rather than hidden (the slide's "some overlaps" footnote made
 *      first-class).
 *   E  SOCIETAL OBJECTIVES — the six objectives other than climate mitigation
 *      (cost effectiveness, competitiveness, resilience/adaptation, autonomy,
 *      just transition, environment & biodiversity), applied as *assessment
 *      lenses*: each lens is a question the report asks of every chapter, with
 *      the proxy indicators that answer it.
 *
 * The board also carries the ASSESSMENT PROTOCOL — the eight numbered method
 * steps that turn a cell of this matrix into a finding in the report — so the
 * methodology is reproducible, not implied.
 *
 * Like Advanced versions 2/4/5/6 this is a computed, read-only analytical
 * view: every chip resolves against the platform's existing registries
 * (`FRAMEWORK_INDICATOR_INDEX`, `SECTOR_POLICIES`, `POLICY_GAP_INDICATORS`),
 * so the matrix can never drift from the underlying data.
 */
import { FRAMEWORK_INDICATOR_INDEX } from './sector-frameworks';
import { SECTOR_POLICIES, type SectorPolicy } from './sectoral-policies';
import { POLICY_GAP_INDICATORS } from '@/lib/scenarios/policy-gap';

/** Current schema version of the v7 assessment-matrix view. */
export const ASSESSMENT_MATRIX_V7_VERSION = 1;

export type MatrixTrack = 'mitigation' | 'adaptation' | 'both';

// ── Shared chip models ───────────────────────────────────────────────────────

/** One indicator chip anywhere on the matrix. */
export interface MatrixIndicatorChip {
  refId: string;
  code: string;
  label: string;
  /** Links into the indicator database. Empty → "no data" chip. */
  indicatorIds: string[];
  track: MatrixTrack;
  /** True for qualitative policy-process indicators (strategies, plans, mainstreaming). */
  policy?: boolean;
}

/** One benchmark chip on a mitigation sector's corridor, from POLICY_GAP_INDICATORS. */
export interface MatrixBenchmarkChip {
  code: string;
  title: string;
  unit: string;
  targets: { year: number; value: number; label: string }[];
}

/** One law chip on a main-policy card, resolved from SECTOR_POLICIES. */
export interface MatrixPolicyChip {
  id: string;
  name: string;
  acronym?: string;
  instrumentType: SectorPolicy['instrumentType'];
  nextMilestone?: { year: number; requirement: string };
}

// ── Dimension A: mitigation pillar (six emission sectors) ────────────────────

export interface MitigationSectorRow {
  key: string;
  label: string;
  color: string;
  /** One-line systems description of how the sector is assessed. */
  blurb: string;
  /** Benchmark trajectory the sector is judged against (Climate Law / FF55 MIX). */
  corridor: MatrixBenchmarkChip[];
  /** The underlying levers that bend the headline. */
  drivers: MatrixIndicatorChip[];
  /** Realised emissions / removals — what the gap is measured on. */
  observed: MatrixIndicatorChip[];
  /** Keys into MAIN_POLICY_CARDS — the instrument families steering this sector. */
  mainPolicyKeys: string[];
}

// ── Dimension B: adaptation pillar (thirteen adaptation areas) ───────────────

export interface AdaptationAreaRow {
  key: string;
  label: string;
  /** What the area covers and why it is assessed as its own system. */
  blurb: string;
  /** Climate-driven harm / hazard signal in this area. */
  risk: MatrixIndicatorChip[];
  /** Adaptation delivery responding to that risk (incl. policy-process series). */
  action: MatrixIndicatorChip[];
  /** Stated monitoring gap when a lane is empty (or thin) — the finding itself. */
  gapNote?: string;
  /** Keys into MAIN_POLICY_CARDS with leverage over this area. */
  mainPolicyKeys: string[];
}

// ── Dimension C: main policies ───────────────────────────────────────────────

export interface MainPolicyCard {
  key: string;
  /** Display label exactly as the report structures it (e.g. "ETS1 + CBAM"). */
  label: string;
  /** The resolved laws behind the family (deep-linked into the Policy Navigator). */
  policies: MatrixPolicyChip[];
  /** Mitigation sectors this family steers (labels). */
  steersSectors: string[];
  /** Adaptation areas this family reaches (labels) — often none; that is a finding. */
  steersAreas: string[];
  /** Explicit statement of the family's adaptation reach (or lack of it). */
  adaptationNote: string;
}

// ── Dimension D: crosscutting themes ─────────────────────────────────────────

export interface CrosscuttingThemeRow {
  key: string;
  label: string;
  /** Which pillar(s) the theme cuts across. */
  track: MatrixTrack;
  blurb: string;
  chips: MatrixIndicatorChip[];
  /** Where this theme overlaps sectors/areas/lenses — stated, per the "some overlaps" caveat. */
  overlapNote?: string;
  gapNote?: string;
}

// ── Dimension E: societal objectives (assessment lenses) ─────────────────────

export interface SocietalObjectiveLens {
  key: string;
  label: string;
  /** The assessment question the lens asks of every chapter. */
  question: string;
  chips: MatrixIndicatorChip[];
  gapNote?: string;
}

// ── The assessment protocol ──────────────────────────────────────────────────

export interface ProtocolStep {
  index: number;
  name: string;
  /** What the step does. */
  what: string;
  /** The transparent output it produces in the report. */
  output: string;
}

/**
 * The eight method steps that turn a matrix cell into a report finding. This
 * is the methodology made explicit: every finding in the monitoring report can
 * be traced to a step, and every step names its output.
 */
export const ASSESSMENT_PROTOCOL: readonly ProtocolStep[] = [
  {
    index: 1,
    name: 'Fix the structure',
    what:
      'Adopt the five structural distinctions and never mix them: mitigation by emission sector, adaptation by adaptation area, policies and crosscutting themes as their own layers, societal objectives as lenses.',
    output: 'The report skeleton — chapters A–E, identical every cycle, so editions are comparable.',
  },
  {
    index: 2,
    name: 'Select indicators against published criteria',
    what:
      'Admit an indicator only if it is causally relevant to its cell, EU-27 in coverage, from an authoritative source (Eurostat, EEA, JRC, Copernicus, ECDC or peer-reviewed), and carries the longest available time series.',
    output: 'A criteria table per indicator; rejected candidates listed with the failed criterion.',
  },
  {
    index: 3,
    name: 'Derive the benchmark',
    what:
      'Mitigation cells take their corridor from the Climate Law targets and Fit-for-55 MIX trajectories. Adaptation cells, lacking legal quantified targets, are benchmarked on the direction and pace of the risk trend itself.',
    output: 'A benchmark line per cell, with its legal or modelling source cited.',
  },
  {
    index: 4,
    name: 'Score pace, not position',
    what:
      'Compare the indicator’s recent rate of change with the rate the benchmark requires (mitigation), or compare the action trend with the risk trend (adaptation). A good level moving too slowly is still off track.',
    output: 'One of four ratings per cell: on track · too slow · off track · insufficient data.',
  },
  {
    index: 5,
    name: 'Attribute the policy signal',
    what:
      'Map every cell to the main-policy family steering it and check consistency: is the next binding milestone aligned with what the pace gap requires? Cells no main policy reaches are flagged.',
    output: 'A policy-coverage map; uncovered cells and misaligned milestones listed.',
  },
  {
    index: 6,
    name: 'Apply the societal-objective lenses',
    what:
      'Re-read every chapter through the six objectives other than mitigation. A sector can be on track for emissions and failing the just-transition or autonomy lens at the same time — both verdicts are reported.',
    output: 'A lens verdict per chapter, with the proxy indicators that ground it.',
  },
  {
    index: 7,
    name: 'State gaps and uncertainty as findings',
    what:
      'Every empty lane, missing series and data-vintage limit is reported as a monitoring gap with a named owner-institution that could close it. Absence of evidence is itself evidence for the governance cycle.',
    output: 'The monitoring-gap register — the report’s ask of the data infrastructure.',
  },
  {
    index: 8,
    name: 'Close the loop with the governance cycle',
    what:
      'Time the report to feed the ratchet: NECP updates, the Climate Law stocktake, ETS reviews and CAP amendments. Re-run steps 2–7 every edition; revisit step 1 only at a full method review.',
    output: 'A versioned method annex; changes to the method are logged and justified.',
  },
];

// ── Board model ──────────────────────────────────────────────────────────────

export interface AssessmentMatrixBoard {
  version: number;
  sectors: MitigationSectorRow[];
  /** Climate-signal context strip shared by all adaptation areas. */
  climateSignal: MatrixIndicatorChip[];
  /** Adaptation governance strip (the pillar's enabling machinery). */
  adaptationGovernance: MatrixIndicatorChip[];
  areas: AdaptationAreaRow[];
  policies: MainPolicyCard[];
  themes: CrosscuttingThemeRow[];
  objectives: SocietalObjectiveLens[];
}

// ── Curated content ──────────────────────────────────────────────────────────

/** Qualitative policy-process indicators (mirrors the v2/v6 tagging). */
const POLICY_PROCESS_IDS = new Set<string>([
  'national-adaptation-strategies',
  'adv-adapt-cities-plans',
  'adapt-gov-cra-completed',
  'adapt-gov-climate-law-adaptation',
  'adapt-gov-nap-adopted',
  'adapt-gov-eu-strategy-actions',
  'adapt-out-mission-charter-signatories',
  'adapt-out-com-adaptation-signatories',
  'adapt-fin-mff-climate-mainstreaming',
  'necp-implementation-score',
  'national-climate-laws',
]);

interface SectorSpec {
  key: string;
  label: string;
  color: string;
  blurb: string;
  gapIndicatorIds: string[];
  driverIds: string[];
  observedIds: string[];
  mainPolicyKeys: string[];
}

/** Dimension A — the six emission sectors, exactly the report's structure. */
const SECTOR_SPECS: readonly SectorSpec[] = [
  {
    key: 'energy',
    label: 'Energy',
    color: '#2563EB',
    blurb:
      'Decarbonise power and fuels supply — the corridor every electrified sector downstream depends on.',
    gapIndicatorIds: ['e1-energy-ghg', 'e2-res-share', 'e3-grid-intensity'],
    driverIds: [
      'solar-pv-additions',
      'wind-additions',
      'battery-storage-capacity',
      'res-share',
      'fossil-power-share',
    ],
    observedIds: ['power-sector-ghg', 'esabcc-e1-energy-supply-ghg'],
    mainPolicyKeys: ['ets1-cbam', 'govreg-ecl'],
  },
  {
    key: 'industry',
    label: 'Industry',
    color: '#475569',
    blurb:
      'Cut process and energy emissions under the cap while keeping production onshore — intensity and circularity are the levers.',
    gapIndicatorIds: ['i1-industry-ghg', 'i5-final-energy'],
    driverIds: [
      'industry-electrification',
      'esabcc-i4-steel-ghg-intensity',
      'esabcc-i3-circular-mat-use',
      'hydrogen-electrolyser-capacity',
    ],
    observedIds: ['industry-ghg', 'esabcc-i1-industry-ghg'],
    mainPolicyKeys: ['ets1-cbam', 'taxonomy'],
  },
  {
    key: 'buildings',
    label: 'Buildings',
    color: '#D97706',
    blurb:
      'Renovate the stock and swap heating systems — the slowest-turning capital stock in the matrix.',
    gapIndicatorIds: ['b1-buildings-ghg', 'b2-buildings-energy'],
    driverIds: [
      'building-renovation-rate',
      'heat-pump-sales',
      'renewable-heating-cooling',
      'esabcc-b5a-residential-fossil-share',
    ],
    observedIds: ['buildings-ghg', 'esabcc-b1-buildings-ghg'],
    mainPolicyKeys: ['ets2', 'esr', 'govreg-ecl'],
  },
  {
    key: 'transport',
    label: 'Transport',
    color: '#7C3AED',
    blurb:
      'Electrify the fleet and shift modes — the only sector whose emissions exceeded 1990 levels for decades.',
    gapIndicatorIds: ['t1-transport-ghg', 't6-fossil-transport'],
    driverIds: [
      'ev-share-new-cars',
      'zev-charging-points',
      'esabcc-t4-car-co2-intensity',
      'rail-iww-freight-share',
    ],
    observedIds: ['esabcc-t1-transport-ghg'],
    mainPolicyKeys: ['ets2', 'esr'],
  },
  {
    key: 'agriculture',
    label: 'Agriculture',
    color: '#16A34A',
    blurb:
      'Bend non-CO₂ emissions through inputs, herds and diets — the sector where mitigation, adaptation and food security meet.',
    gapIndicatorIds: ['a1-agriculture-ghg'],
    driverIds: [
      'nitrogen-fertiliser-use',
      'organic-farming-share',
      'cattle-population',
      'food-waste-per-capita',
    ],
    observedIds: ['agri-ghg', 'esabcc-a1-agri-nonco2'],
    mainPolicyKeys: ['cap', 'esr'],
  },
  {
    key: 'lulucf',
    label: 'LULUCF',
    color: '#059669',
    blurb:
      'Rebuild the land sink the corridor counts on — a sink that is itself climate-vulnerable, so pillar B reaches into this row.',
    gapIndicatorIds: ['l1-lulucf', 'l8-bioenergy'],
    driverIds: ['esabcc-l3-afforestation', 'harvested-wood-pool', 'adv-forest-sink-decline'],
    observedIds: ['lulucf-net-removal', 'esabcc-l1-lulucf-net'],
    mainPolicyKeys: ['lulucf-reg', 'cap'],
  },
];

interface AreaSpec {
  key: string;
  label: string;
  blurb: string;
  riskIds: string[];
  actionIds: string[];
  gapNote?: string;
  mainPolicyKeys: string[];
}

/** Dimension B — the thirteen adaptation areas (after the UK CCC framework). */
const AREA_SPECS: readonly AreaSpec[] = [
  {
    key: 'nature',
    label: 'Nature',
    blurb: 'Ecosystem condition under fire, drought and disturbance pressure.',
    riskIds: ['adv-adapt-burnt-area', 'adv-adapt-forest-disturbance'],
    actionIds: [],
    gapNote:
      'No EU series yet tracks restoration delivering resilience; the Nature Restoration Law national plans (due 2026) should seed the first one.',
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'working-lands-seas',
    label: 'Working lands and seas',
    blurb: 'Farming, forestry and fisheries as climate-exposed production systems.',
    riskIds: ['adv-adapt-crop-loss', 'beta-adapt-drought-impact'],
    actionIds: [],
    gapNote:
      'Farm-level adaptation uptake (irrigation efficiency, drought-tolerant varieties) is not monitored EU-wide, and the marine side has no series at all.',
    mainPolicyKeys: ['cap'],
  },
  {
    key: 'food-security',
    label: 'Food security',
    blurb: 'Whether climate shocks to yields propagate into supply and prices.',
    riskIds: ['adv-adapt-crop-loss'],
    actionIds: [],
    gapNote:
      'Food-security monitoring lives in CAP and EFSA dashboards not yet curated here — supply-stress and stock indicators are an open ask.',
    mainPolicyKeys: ['cap'],
  },
  {
    key: 'water-supply',
    label: 'Water supply',
    blurb: 'Scarcity and competition for water across users and basins.',
    riskIds: ['adv-adapt-wei', 'water-exploitation-index'],
    actionIds: [],
    gapNote: 'Water reuse and demand-management delivery have no EU-wide series yet.',
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'energy-resilience',
    label: 'Energy',
    blurb: 'Keeping the power system dependable in a hotter, drier climate.',
    riskIds: ['beta-adapt-energy-drought-damage', 'adv-adapt-cooling-degree-days'],
    actionIds: [],
    gapNote:
      'Grid hardening and cooling-water management are unmonitored — only the pressure side has data. Mirrors the mitigation Energy row in pillar A.',
    mainPolicyKeys: ['ets1-cbam', 'govreg-ecl'],
  },
  {
    key: 'telecoms-ict',
    label: 'Telecoms and ICT',
    blurb: 'Digital infrastructure as a climate-exposed lifeline service.',
    riskIds: [],
    actionIds: [],
    gapNote:
      'Both lanes empty: no EU-wide series exists. Outage reporting under NIS2 / the Critical Entities Resilience Directive could seed one — a named ask.',
    mainPolicyKeys: [],
  },
  {
    key: 'transport-resilience',
    label: 'Transport',
    blurb: 'Network disruption from heat, storms and coastal flooding.',
    riskIds: ['beta-adapt-rail-disruption', 'adv-adapt-coastal-transport-damage'],
    actionIds: [],
    gapNote:
      'Forward-looking delivery (climate-proofed TEN-T share) is unmonitored; only realised disruption has data.',
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'towns-cities',
    label: 'Towns and cities',
    blurb: 'Urban flood exposure and the local planning response.',
    riskIds: ['beta-adapt-flood-prone-population', 'adv-adapt-river-flood-damage'],
    actionIds: ['adv-adapt-cities-plans', 'adapt-out-com-adaptation-signatories'],
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'buildings-resilience',
    label: 'Buildings',
    blurb: 'The same stock pillar A renovates must also shelter people from heat and floods.',
    riskIds: ['adv-adapt-cooling-degree-days'],
    actionIds: ['building-renovation-rate'],
    gapNote:
      'Renovation rate is a shared mitigation/adaptation lever — efficiency and resilience are one investment — but overheating-specific delivery (passive cooling, EPBD resilience requirements) has no series.',
    mainPolicyKeys: ['ets2', 'govreg-ecl'],
  },
  {
    key: 'health',
    label: 'Health',
    blurb: 'Heat mortality and the northward spread of climate-sensitive disease.',
    riskIds: ['adv-adapt-heat-mortality', 'adv-adapt-west-nile'],
    actionIds: [],
    gapNote: 'Heat-health action-plan coverage is not yet an EU series.',
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'community-preparedness',
    label: 'Community preparedness and response',
    blurb: 'Early warning and the civil-protection machinery between hazard and harm.',
    riskIds: [],
    actionIds: ['adapt-out-ews-efas-coverage', 'adapt-out-mission-charter-signatories'],
    gapNote:
      'The hazard signal is shared across areas — see the climate-signal strip; what is measured here is the response capacity.',
    mainPolicyKeys: ['govreg-ecl'],
  },
  {
    key: 'business',
    label: 'Business',
    blurb: 'Corporate exposure to physical climate risk and its disclosure.',
    riskIds: ['adv-adapt-economic-losses'],
    actionIds: [],
    gapNote:
      'CSRD / Taxonomy adaptation disclosures are not yet aggregated into a progress series — the private-sector action lane is open.',
    mainPolicyKeys: ['taxonomy'],
  },
  {
    key: 'finance',
    label: 'Finance',
    blurb: 'Whether the financial system absorbs climate losses and funds resilience.',
    riskIds: ['adv-adapt-insurance-gap'],
    actionIds: ['adapt-fin-eib-adaptation-share', 'adapt-fin-mff-climate-mainstreaming'],
    mainPolicyKeys: ['taxonomy', 'govreg-ecl'],
  },
];

/** Climate-signal context strip — the warming all thirteen areas operate in. */
const CLIMATE_SIGNAL_IDS = ['adv-adapt-global-temp', 'adv-adapt-sea-level', 'climate-economic-losses'];

/** Adaptation-governance strip — the pillar's enabling machinery. */
const ADAPT_GOVERNANCE_IDS = [
  'national-adaptation-strategies',
  'adapt-gov-nap-adopted',
  'adapt-gov-cra-completed',
  'adapt-gov-climate-law-adaptation',
  'adapt-gov-eu-strategy-actions',
];

interface PolicySpec {
  key: string;
  label: string;
  policyIds: string[];
  steersSectors: string[];
  steersAreas: string[];
  adaptationNote: string;
}

/** Dimension C — the seven main-policy families, exactly the report's structure. */
const POLICY_SPECS: readonly PolicySpec[] = [
  {
    key: 'ets1-cbam',
    label: 'ETS1 + CBAM',
    policyIds: ['eu-ets', 'cbam'],
    steersSectors: ['Energy', 'Industry'],
    steersAreas: [],
    adaptationNote:
      'A pure mitigation price signal — physical risk to the assets it covers is unpriced. Auction revenues (Innovation / Modernisation Funds) are the indirect resilience channel.',
  },
  {
    key: 'ets2',
    label: 'ETS2',
    policyIds: ['ets2'],
    steersSectors: ['Buildings', 'Transport'],
    steersAreas: ['Buildings'],
    adaptationNote:
      'Prices heating and transport fuels from 2027; the Social Climate Fund is its fairness valve — assessed under the just-transition lens, not here.',
  },
  {
    key: 'esr',
    label: 'Effort Sharing Regulation',
    policyIds: ['esr'],
    steersSectors: ['Buildings', 'Transport', 'Agriculture'],
    steersAreas: [],
    adaptationNote:
      'Binding national targets for the non-ETS economy; carries no adaptation obligation — national adaptation effort is governed via the Governance Regulation instead.',
  },
  {
    key: 'lulucf-reg',
    label: 'LULUCF Regulation',
    policyIds: ['lulucf-regulation'],
    steersSectors: ['LULUCF'],
    steersAreas: ['Nature', 'Working lands and seas'],
    adaptationNote:
      'The −310 Mt 2030 sink target silently assumes forest resilience — here adaptation failure is mitigation failure, the matrix’s clearest cross-pillar dependency.',
  },
  {
    key: 'cap',
    label: 'CAP',
    policyIds: ['cap'],
    steersSectors: ['Agriculture', 'LULUCF'],
    steersAreas: ['Working lands and seas', 'Food security'],
    adaptationNote:
      'The only main policy with explicit adaptation conditionality (GAEC standards, eco-schemes) — and the main lever over the two least-monitored adaptation areas.',
  },
  {
    key: 'taxonomy',
    label: 'EU Taxonomy',
    policyIds: ['taxonomy'],
    steersSectors: ['Industry'],
    steersAreas: ['Business', 'Finance'],
    adaptationNote:
      'Climate adaptation is one of its six objectives and DNSH screens the rest — the main instrument for steering *private* finance into resilience.',
  },
  {
    key: 'govreg-ecl',
    label: 'Gov. Reg + ECL',
    policyIds: ['governance-regulation', 'climate-law'],
    steersSectors: ['Energy', 'Industry', 'Buildings', 'Transport', 'Agriculture', 'LULUCF'],
    steersAreas: ['All thirteen areas'],
    adaptationNote:
      'The frame around everything: Climate Law Art. 5 makes adaptation a legal obligation, and the Governance Regulation’s NECP/NAS reporting is the ratchet both pillars feed (protocol step 8).',
  },
];

interface ThemeSpec {
  key: string;
  label: string;
  track: MatrixTrack;
  blurb: string;
  chipIds: string[];
  overlapNote?: string;
  gapNote?: string;
}

/** Dimension D — the seven crosscutting themes, overlaps stated per row. */
const THEME_SPECS: readonly ThemeSpec[] = [
  {
    key: 'electrification',
    label: 'Electrification',
    track: 'mitigation',
    blurb: 'The single biggest cross-sector lever: electrify end uses while the grid decarbonises.',
    chipIds: ['end-use-electrification', 'industry-electrification', 'ev-share-new-cars', 'heat-pump-sales'],
    overlapNote: 'Overlaps every pillar-A sector by design — the theme reads the same lever across them.',
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle changes (demand/culture)',
    track: 'mitigation',
    blurb: 'Demand-side change the technology themes cannot deliver: diets, flying, household energy.',
    chipIds: [
      'meat-consumption-per-capita',
      'air-passengers-per-capita',
      'household-energy-per-capita',
      'food-waste-per-capita',
    ],
  },
  {
    key: 'funding-finance',
    label: 'Funding and finance',
    track: 'both',
    blurb: 'Whether capital is flowing at transition scale — and whether any of it funds resilience.',
    chipIds: ['clean-tech-investment', 'green-bond-issuance', 'fossil-subsidies', 'adapt-fin-eib-adaptation-share'],
    overlapNote:
      'Overlaps the Finance adaptation area and the cost-effectiveness lens — same money, three questions.',
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    track: 'both',
    blurb: 'The physical networks the transition runs on — built for net zero, exposed to the climate.',
    chipIds: ['zev-charging-points', 'battery-storage-capacity', 'smart-meter-rollout', 'rail-electrification'],
    overlapNote:
      'The resilience of these same assets is assessed in the Energy and Transport adaptation areas.',
  },
  {
    key: 'innovation',
    label: 'Innovation',
    track: 'mitigation',
    blurb: 'R&D effort and manufacturing scale-up behind the technology curves.',
    chipIds: [
      'energy-rdd-budget',
      'esabcc-f-climate-patents-share',
      'hydrogen-electrolyser-capacity',
      'battery-mfg-capacity',
    ],
  },
  {
    key: 'cdr',
    label: 'CDR',
    track: 'mitigation',
    blurb: 'Carbon dioxide removal — the land sink plus the engineered capacity net zero arithmetic requires.',
    chipIds: ['engineered-cdr-capacity', 'beta-ccs-capacity', 'lulucf-net-removal'],
    overlapNote: 'Overlaps the LULUCF sector row — counted once in the headline, read twice.',
  },
  {
    key: 'labour-skills',
    label: 'Labour and skills',
    track: 'both',
    blurb: 'Whether the workforce can build the transition — and absorb its disruptions.',
    chipIds: ['environmental-employment'],
    gapNote:
      'Skills-shortage and retraining-throughput series are missing EU-wide — one of the report’s standing monitoring gaps.',
  },
];

interface ObjectiveSpec {
  key: string;
  label: string;
  question: string;
  chipIds: string[];
  gapNote?: string;
}

/** Dimension E — the six societal objectives other than climate mitigation. */
const OBJECTIVE_SPECS: readonly ObjectiveSpec[] = [
  {
    key: 'cost-effectiveness',
    label: 'Cost effectiveness',
    question: 'Is the transition delivered at least cost — is the price signal coherent?',
    chipIds: ['eu-ets-price', 'carbon-pricing-coverage', 'fossil-subsidies'],
  },
  {
    key: 'competitiveness',
    label: 'Competitiveness',
    question: 'Is EU industry winning, not losing, from the transition?',
    chipIds: ['clean-tech-trade-balance', 'battery-mfg-capacity', 'solar-pv-mfg-capacity'],
  },
  {
    key: 'resilience',
    label: 'Resilience (adaptation)',
    question: 'Is climate risk to society falling — the lens pillar B answers in full?',
    chipIds: ['adv-adapt-economic-losses', 'adv-adapt-insurance-gap'],
  },
  {
    key: 'autonomy',
    label: 'Autonomy',
    question: 'Is dependence on imported fossil fuels and foreign clean tech declining?',
    chipIds: ['beta-fossil-share-gae', 'embodied-import-emissions', 'electrolyser-mfg-capacity'],
  },
  {
    key: 'just-transition',
    label: 'Just transition (whole-of-society)',
    question: 'Are the costs and benefits of the transition fairly shared?',
    chipIds: ['energy-poverty-share', 'environmental-employment'],
    gapNote: 'Distributional series below national level are scarce — flagged in the gap register.',
  },
  {
    key: 'environment-biodiversity',
    label: 'Environment / biodiversity',
    question: 'Does climate action also restore — not consume — nature?',
    chipIds: ['esabcc-l4-deforestation', 'water-exploitation-index', 'organic-farming-share'],
  },
];

// ── Builders ─────────────────────────────────────────────────────────────────

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

function buildChips(ids: string[], track: MatrixTrack): MatrixIndicatorChip[] {
  return ids.map((id) => {
    const ind = FRAMEWORK_INDICATOR_INDEX[id];
    return {
      refId: `am-${++_ref}`,
      code: ind?.code ?? (ind ? fallbackCode(ind.name) : '?'),
      label: ind?.name ?? id,
      indicatorIds: ind ? [id] : [],
      track,
      policy: POLICY_PROCESS_IDS.has(id) || undefined,
    };
  });
}

function buildPolicies(ids: string[]): MatrixPolicyChip[] {
  const nowYear = new Date().getFullYear();
  const byId = new Map(SECTOR_POLICIES.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is SectorPolicy => !!p)
    .map((p) => {
      const next = [...p.keyMilestones]
        .sort((a, b) => a.year - b.year)
        .find((m) => m.year >= nowYear);
      return {
        id: p.id,
        name: p.name,
        acronym: p.acronym,
        instrumentType: p.instrumentType,
        nextMilestone: next,
      };
    });
}

function buildCorridor(ids: string[]): MatrixBenchmarkChip[] {
  const byId = new Map(POLICY_GAP_INDICATORS.map((g) => [g.id, g]));
  return ids
    .map((id) => byId.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({
      code: g.code,
      title: g.title,
      unit: g.unit,
      targets: g.benchmarks.map((b) => ({ year: b.year, value: b.value, label: b.label })),
    }));
}

/**
 * The published "Advanced version 7" structured assessment matrix: the five
 * dimensions of the monitoring-report methodology, computed from the
 * platform's policy, benchmark and indicator registries.
 */
export function defaultAssessmentMatrixBoardV7(): AssessmentMatrixBoard {
  _ref = 0;
  return {
    version: ASSESSMENT_MATRIX_V7_VERSION,
    sectors: SECTOR_SPECS.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      blurb: s.blurb,
      corridor: buildCorridor(s.gapIndicatorIds),
      drivers: buildChips(s.driverIds, 'mitigation'),
      observed: buildChips(s.observedIds, 'mitigation'),
      mainPolicyKeys: s.mainPolicyKeys,
    })),
    climateSignal: buildChips(CLIMATE_SIGNAL_IDS, 'adaptation'),
    adaptationGovernance: buildChips(ADAPT_GOVERNANCE_IDS, 'adaptation'),
    areas: AREA_SPECS.map((a) => ({
      key: a.key,
      label: a.label,
      blurb: a.blurb,
      risk: buildChips(a.riskIds, 'adaptation'),
      action: buildChips(a.actionIds, 'adaptation'),
      gapNote: a.gapNote,
      mainPolicyKeys: a.mainPolicyKeys,
    })),
    policies: POLICY_SPECS.map((p) => ({
      key: p.key,
      label: p.label,
      policies: buildPolicies(p.policyIds),
      steersSectors: p.steersSectors,
      steersAreas: p.steersAreas,
      adaptationNote: p.adaptationNote,
    })),
    themes: THEME_SPECS.map((t) => ({
      key: t.key,
      label: t.label,
      track: t.track,
      blurb: t.blurb,
      chips: buildChips(t.chipIds, t.track),
      overlapNote: t.overlapNote,
      gapNote: t.gapNote,
    })),
    objectives: OBJECTIVE_SPECS.map((o) => ({
      key: o.key,
      label: o.label,
      question: o.question,
      chips: buildChips(o.chipIds, 'both'),
      gapNote: o.gapNote,
    })),
  };
}
