/**
 * Adaptation–Mitigation Theory of Change board — data model + published default.
 * --------------------------------------------------------------------------------
 * The modular, expandable successor to the static "Adaptation–Mitigation Theory
 * of Change" SVG (EUCRA Chapter 8, EEA 2024). The same six-layer policy logic —
 * Impact → Outcomes → Outputs → Activities → Inputs → Assumptions — but as a
 * board of layer bands, each holding nodes on a mitigation or adaptation track,
 * with indicator chips that resolve to live series in the indicator database
 * (ESABCC report set E1–E6/O2, plus candidate adaptation proxies for the
 * proposed E7 resilience indicator).
 *
 * A second section models the hazard detail diagram: five climate hazards →
 * physical impacts → the mitigation levers each impact undermines.
 *
 * Rendered by `AdaptationTocBoardView` as a computed, read-only analytical view
 * (like Advanced versions 7 and 8).
 */

export type TocNodeKind =
  /** Existing mitigation framework (teal). */
  | 'mitigation'
  /** New adaptation additions (coral). */
  | 'adaptation'
  /** Adaptation risk / pressure (red). */
  | 'risk'
  /** Mitigation levers (gray). */
  | 'lever'
  /** Enabling conditions (amber). */
  | 'enabler'
  /** Assumption cards (neutral). */
  | 'assumption';

export interface TocChip {
  /** Short code shown on the chip (E1, O2, CDD …). */
  code: string;
  label: string;
  indicatorIds: string[];
  /** Multiplier applied before display (e.g. fraction-stored share → %). */
  scale?: number;
  decimals?: number;
}

export interface TocNode {
  id: string;
  kind: TocNodeKind;
  title: string;
  subtitle?: string;
  /** Synergy / risk flag rendered as a small badge on the card. */
  badge?: { tone: 'synergy' | 'risk'; label: string };
  /** Extra context shown under the chips (caveats, gaps). */
  note?: string;
  chips: TocChip[];
}

export interface TocLayer {
  id: string;
  /** 1-based position in the causal chain, read top-down. */
  index: number;
  name: string;
  /** The M&E role of the layer ("long-run goal", "levers", …). */
  role: string;
  blurb: string;
  /** Band header colour. */
  color: string;
  nodes: TocNode[];
}

export interface TocHazard {
  id: string;
  name: string;
}

export interface TocHazardImpact {
  id: string;
  title: string;
  detail: string;
  /** Names of the hazards driving this impact. */
  hazardIds: string[];
  /** Titles of the levers / outcomes this impact undermines. */
  undermines: string[];
  chips: TocChip[];
}

export interface AdaptationTocBoard {
  version: number;
  layers: TocLayer[];
  hazards: TocHazard[];
  impacts: TocHazardImpact[];
}

export const ADAPTATION_TOC_BOARD_VERSION = 1;

// Shorthands for the chips reused across layers.
const CHIP_E1: TocChip = { code: 'E1', label: 'Energy supply GHG', indicatorIds: ['esabcc-e1-energy-supply-ghg'], decimals: 0 };
const CHIP_E2_FOSSIL: TocChip = { code: 'E2', label: 'Fossil share of electricity', indicatorIds: ['esabcc-e2-fossil-power-share'], decimals: 1 };
const CHIP_E2_RES: TocChip = { code: 'E2', label: 'Non-biomass RES share', indicatorIds: ['esabcc-e2-res-noBio-power-share'], scale: 100, decimals: 1 };
const CHIP_E3: TocChip = { code: 'E3', label: 'GHG intensity of electricity', indicatorIds: ['esabcc-e3-grid-co2-intensity'], decimals: 0 };
const CHIP_E4A: TocChip = { code: 'E4a', label: 'Solar PV additions', indicatorIds: ['esabcc-e4a-solar-pv-add'], decimals: 1 };
const CHIP_E4B: TocChip = { code: 'E4b/c', label: 'Wind additions', indicatorIds: ['esabcc-e4b-wind-add'], decimals: 1 };
const CHIP_E5: TocChip = { code: 'E5', label: 'Electrification rate', indicatorIds: ['esabcc-e5-electrification'], decimals: 1 };
const CHIP_E6: TocChip = { code: 'E6', label: 'Energy methane emissions', indicatorIds: ['esabcc-e6-energy-ch4'], decimals: 1 };
const CHIP_O2_PEC: TocChip = { code: 'O2', label: 'Primary energy consumption', indicatorIds: ['esabcc-o2-pec'], decimals: 0 };
const CHIP_O2_FEC: TocChip = { code: 'O2', label: 'Final energy consumption', indicatorIds: ['esabcc-o2-fec'], decimals: 0 };
const CHIP_CDD: TocChip = { code: 'CDD', label: 'Cooling degree days', indicatorIds: ['adv-adapt-cooling-degree-days'], decimals: 0 };
const CHIP_DROUGHT: TocChip = { code: 'EDR', label: 'Energy drought damage', indicatorIds: ['beta-adapt-energy-drought-damage'], decimals: 1 };
const CHIP_WEI: TocChip = { code: 'WEI+', label: 'Water exploitation index', indicatorIds: ['adv-adapt-wei'], decimals: 1 };
const CHIP_LOSSES: TocChip = { code: 'LOSS', label: 'Climate-extreme economic losses', indicatorIds: ['adv-adapt-economic-losses'], decimals: 1 };

/** The published default board (computed, read-only — not persisted). */
export function defaultAdaptationTocBoard(): AdaptationTocBoard {
  return {
    version: ADAPTATION_TOC_BOARD_VERSION,
    layers: [
      {
        id: 'impact',
        index: 1,
        name: 'Impact',
        role: 'long-run goal',
        blurb:
          'The twin 2050 end-states the whole chain must deliver: an energy supply that is decarbonised and one that stays operational under the climate already locked in.',
        color: '#0F6E56',
        nodes: [
          {
            id: 'impact-decarbonised',
            kind: 'mitigation',
            title: 'Decarbonised EU energy supply',
            subtitle: 'Energy supply GHG → net zero by 2050',
            chips: [CHIP_E1],
          },
          {
            id: 'impact-resilient',
            kind: 'adaptation',
            title: 'Climate-resilient energy system',
            subtitle: 'Proposed E7: infrastructure resilience → 2050',
            note:
              'E7 has no observed series yet — that gap is the point of the adaptation track. Candidate proxies are attached on the E7 output node below.',
            chips: [],
          },
        ],
      },
      {
        id: 'outcomes',
        index: 2,
        name: 'Outcomes',
        role: 'intermediate results',
        blurb:
          'What the levers must change on the way to the impact. The adaptation-demand node is a pressure, not a goal: cooling and desalination demand push O2 back up.',
        color: '#3D6E8C',
        nodes: [
          {
            id: 'outcome-supply-ghg',
            kind: 'mitigation',
            title: '↓ GHG from supply',
            subtitle: 'Substitution pace of the electricity mix',
            chips: [CHIP_E2_FOSSIL, CHIP_E2_RES],
          },
          {
            id: 'outcome-demand',
            kind: 'mitigation',
            title: '↓ Energy demand',
            subtitle: 'Primary + final demand on the EED trajectory',
            chips: [CHIP_O2_PEC, CHIP_O2_FEC],
          },
          {
            id: 'outcome-resilient-infra',
            kind: 'adaptation',
            title: 'Resilient infrastructure',
            subtitle: 'Proposed E7: adaptive capacity of grid + generation assets',
            chips: [CHIP_LOSSES],
          },
          {
            id: 'outcome-adaptation-pressure',
            kind: 'risk',
            title: '⚠ Adaptation demand pressure',
            subtitle: 'Cooling + desalination demand works against O2',
            chips: [CHIP_CDD],
          },
        ],
      },
      {
        id: 'outputs',
        index: 3,
        name: 'Outputs',
        role: 'indicator row',
        blurb:
          'The measurable outputs each lever feeds — the indicator row of the original diagram, with the proposed E7 as the new adaptation output.',
        color: '#534AB7',
        nodes: [
          {
            id: 'output-grid-mix',
            kind: 'mitigation',
            title: 'E2/E3 — grid mix',
            subtitle: 'Fossil share + GHG intensity of electricity',
            chips: [CHIP_E2_FOSSIL, CHIP_E3],
          },
          {
            id: 'output-res',
            kind: 'mitigation',
            title: 'E4a/b — RES roll-out',
            subtitle: 'Annual solar PV + wind capacity additions',
            chips: [CHIP_E4A, CHIP_E4B],
          },
          {
            id: 'output-methane',
            kind: 'mitigation',
            title: 'E6 — methane',
            subtitle: 'Fugitive + combustion CH₄, Methane Regulation scope',
            chips: [CHIP_E6],
          },
          {
            id: 'output-electrification',
            kind: 'mitigation',
            title: 'E5 + O2 — electrification & demand',
            subtitle: 'Electricity share of final energy + total demand',
            chips: [CHIP_E5, CHIP_O2_FEC],
          },
          {
            id: 'output-e7',
            kind: 'adaptation',
            title: 'New — E7: climate resilience of energy infrastructure',
            subtitle: 'Physical risk exposure · adaptive capacity · disruption frequency',
            note:
              'No observed E7 series exists yet; these are the closest live proxies in the indicator database. The drought-damage figure is a JRC PESETA IV scenario baseline, not an annual series.',
            chips: [CHIP_CDD, CHIP_DROUGHT, CHIP_WEI, CHIP_LOSSES],
          },
        ],
      },
      {
        id: 'activities',
        index: 4,
        name: 'Activities',
        role: 'levers',
        blurb:
          'The mitigation levers of the report framework plus the new adaptation lever. Synergy badges mark levers that also build resilience; risk badges mark adaptation pressure on a lever.',
        color: '#6B6A66',
        nodes: [
          {
            id: 'lever-fossil-phaseout',
            kind: 'lever',
            title: 'Fossil fuel phase-out',
            subtitle: 'Feeds the grid-mix output (E2/E3)',
            chips: [CHIP_E2_FOSSIL],
          },
          {
            id: 'lever-methane',
            kind: 'lever',
            title: 'Methane reduction',
            subtitle: 'Feeds the methane output (E6)',
            chips: [CHIP_E6],
          },
          {
            id: 'lever-res-rollout',
            kind: 'lever',
            title: 'Fast RES roll-out',
            subtitle: 'Feeds the RES output (E4a/b)',
            badge: { tone: 'synergy', label: '↔ synergy — diversification builds resilience' },
            chips: [CHIP_E4A, CHIP_E4B],
          },
          {
            id: 'lever-ccs',
            kind: 'lever',
            title: 'Targeted CCU/CCS',
            subtitle: 'Residual emissions in hard-to-abate supply',
            badge: { tone: 'risk', label: '⚠ water risk — cooling + capture need water' },
            chips: [CHIP_WEI],
          },
          {
            id: 'lever-system-integration',
            kind: 'lever',
            title: 'System integration',
            subtitle: 'Feeds electrification + demand (E5, O2)',
            badge: { tone: 'synergy', label: '↔ synergy — flexibility absorbs climate shocks' },
            chips: [CHIP_E5],
          },
          {
            id: 'lever-physical-resilience',
            kind: 'adaptation',
            title: 'New lever — physical resilience of energy infrastructure',
            subtitle: 'Hardening assets · redundancy · climate-proofing grid + generation',
            chips: [CHIP_DROUGHT, CHIP_LOSSES],
          },
        ],
      },
      {
        id: 'inputs',
        index: 5,
        name: 'Inputs',
        role: 'enabling conditions',
        blurb:
          'What has to be in place for the levers to work — with physical-risk assessment added as a co-condition alongside decarbonisation finance.',
        color: '#854F0B',
        nodes: [
          {
            id: 'input-investor-certainty',
            kind: 'enabler',
            title: 'Investor certainty',
            subtitle: 'Market signals, carbon price',
            chips: [],
          },
          {
            id: 'input-infrastructure',
            kind: 'enabler',
            title: 'Infrastructure',
            subtitle: 'Grid, storage, networks',
            chips: [],
          },
          {
            id: 'input-crosscutting',
            kind: 'enabler',
            title: 'Cross-cutting conditions',
            subtitle: 'Finance · skills · innovation',
            chips: [],
          },
          {
            id: 'input-risk-assessment',
            kind: 'adaptation',
            title: 'New — physical risk assessment + adaptive capacity planning',
            subtitle:
              'Climate hazard mapping of assets · resilience investment as co-condition alongside decarbonisation finance',
            chips: [],
          },
        ],
      },
      {
        id: 'assumptions',
        index: 6,
        name: 'Assumptions',
        role: 'made explicit',
        blurb:
          'The conditions the causal chain silently relies on. The adaptation framing turns the implicit ones into explicit, testable risk assumptions.',
        color: '#5F5E5A',
        nodes: [
          {
            id: 'assumption-existing',
            kind: 'assumption',
            title: 'Existing (implicit)',
            subtitle: 'Demand falls over time · grid stays reliable · levers perform as planned',
            chips: [],
          },
          {
            id: 'assumption-explicit-risk',
            kind: 'risk',
            title: 'New — explicit risk assumptions',
            subtitle:
              'Physical risks do not impair lever performance · demand reduction is not offset by adaptation needs',
            chips: [CHIP_CDD, CHIP_LOSSES],
          },
        ],
      },
    ],
    hazards: [
      { id: 'hazard-heat', name: 'Warming / heatwaves' },
      { id: 'hazard-drought', name: 'Drought / ↓ precipitation' },
      { id: 'hazard-wildfire', name: 'Wildfires' },
      { id: 'hazard-flood', name: 'Floods / landslides' },
      { id: 'hazard-extreme', name: 'Extreme weather' },
    ],
    impacts: [
      {
        id: 'impact-cooling-demand',
        title: '↑ Cooling demand',
        detail: 'Heat raises space-cooling demand, working against the demand-reduction outcome.',
        hazardIds: ['hazard-heat'],
        undermines: ['↓ Energy demand (O2)'],
        chips: [CHIP_CDD],
      },
      {
        id: 'impact-grid-capacity',
        title: '↓ Grid capacity',
        detail: 'Lines and transformers derate in heat; wildfires force pre-emptive shutdowns.',
        hazardIds: ['hazard-heat', 'hazard-wildfire'],
        undermines: ['System integration'],
        chips: [],
      },
      {
        id: 'impact-hydro',
        title: '↓ Hydro production',
        detail: 'Drought cuts reservoir inflows; southern-Europe hydropower projected −18% to +9%.',
        hazardIds: ['hazard-drought'],
        undermines: ['Fast RES roll-out'],
        chips: [CHIP_DROUGHT],
      },
      {
        id: 'impact-thermal',
        title: '↓ Thermal production',
        detail: 'Heat stress and scarce cooling water curtail thermal (and nuclear) output.',
        hazardIds: ['hazard-heat', 'hazard-drought'],
        undermines: ['Fossil fuel phase-out', 'Targeted CCU/CCS'],
        chips: [CHIP_WEI],
      },
      {
        id: 'impact-desalination',
        title: '↑ Desalination need',
        detail: 'Water scarcity adds energy-intensive desalination demand to the system.',
        hazardIds: ['hazard-drought'],
        undermines: ['↓ Energy demand (O2)'],
        chips: [],
      },
      {
        id: 'impact-infra-damage',
        title: 'Damage to transport + storage infrastructure',
        detail: 'Floods, storms and fires damage fuel transport, storage and CO₂ infrastructure.',
        hazardIds: ['hazard-flood', 'hazard-extreme', 'hazard-wildfire'],
        undermines: ['Targeted CCU/CCS', 'System integration'],
        chips: [CHIP_LOSSES],
      },
    ],
  };
}
