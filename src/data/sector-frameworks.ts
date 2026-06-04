/**
 * Sector assessment frameworks from the ESABCC report
 * 'Towards EU climate neutrality' (2024).
 *
 * Each sector chapter opens with an *assessment-framework* flow chart
 * (Figures 12, 22, 33, 46, 55, 64) that reads top-to-bottom:
 *
 *   GHG emission reductions  (the sector goal)
 *        ↑
 *   Outcomes                 (what has to change)
 *        ↑
 *   Mitigation levers        (how it changes)
 *        +
 *   Enabling conditions      (what makes it possible)
 *
 * The white boxes in those figures are the *progress indicators* (E1, T2,
 * B5a, …). This file turns those figures into structured, editable data so
 * the MethodHub can render them as a connected board of cards whose nodes
 * link straight into the indicator database (src/data/esabcc-indicators.ts).
 *
 * Indicator codes that the report drew as white boxes but for which no time
 * series was curated into the database (e.g. I2, B3, B4) are kept as
 * `indicatorIds: []` refs — they show up as "no series linked yet" nodes that
 * a user can wire up or fill in later.
 *
 * Some mitigation levers/outcomes were drawn in the report figures *without*
 * any white-box progress indicator at all. To make the board fully tracked we
 * added a chip to each of those, linking either a provisional "beta" series
 * (β-coded) or a fitting existing ECNO series. Those chips are flagged
 * `enhanced: true` so the two built-in boards can diverge:
 *   • the *enhanced* board (`defaultFrameworkBoard`) keeps them; and
 *   • the report-faithful board (`defaultFrameworkBoardReport`) strips them,
 *     so those levers read exactly as the report drew them — no indicator.
 */
import { ESABCC_REPORT_INDICATORS } from './esabcc-indicators';
import { ECNO_INDICATORS, type Indicator } from './ecno-indicators';
import { ALL_BETA_INDICATORS } from './beta-indicators';

export type EnablingKind = 'sector-specific' | 'cross-cutting' | 'not-assessed';

/**
 * Which track a card belongs to. The published report frameworks are all
 * `mitigation`; the "Flow charts (beta)" view adds `adaptation` outcomes,
 * levers and enabling conditions on top. Undefined is treated as mitigation.
 */
export type FrameworkTrack = 'mitigation' | 'adaptation';

/** A white-box indicator chip attached to a framework node. */
export interface IndicatorRef {
  /** Stable id for this chip within the board. */
  refId: string;
  /** Short code shown on the chip, e.g. "T2", "E4a". */
  code: string;
  /** Descriptive label taken from the figure's white box. */
  label: string;
  /** Links into the indicator database (esabcc-indicators ids). May be empty. */
  indicatorIds: string[];
  /**
   * True when this chip is an *enhancement* on top of the published report —
   * a lever/outcome the report figure drew without any progress indicator,
   * which we filled with a beta or reused ECNO series. The report-faithful
   * built-in board strips these (see `defaultFrameworkBoardReport`).
   */
  enhanced?: boolean;
}

/** An outcome or mitigation-lever card. */
export interface FrameworkNode {
  id: string;
  layer: 'outcome' | 'lever';
  label: string;
  /** Mitigation (default) or adaptation. Adaptation cards only appear in the beta board. */
  track?: FrameworkTrack;
  note?: string;
  /**
   * ids of the cards one layer up that this card feeds into.
   * Levers point at outcomes; outcomes point at the goal ("goal").
   */
  parents: string[];
  indicators: IndicatorRef[];
}

/** An enabling-condition bullet (sector-specific, cross-cutting, not assessed). */
export interface EnablingItem {
  id: string;
  kind: EnablingKind;
  /** Mitigation (default) or adaptation. */
  track?: FrameworkTrack;
  label: string;
  /** Chapter reference shown in parentheses, e.g. "ch. 10". */
  chapter?: string;
  indicatorIds?: string[];
}

export interface SectorFramework {
  id: string;
  name: string;
  /** Report figure number, e.g. "Figure 33". */
  figure: string;
  /** Accent colour (hex) used for the sector's cards and spine. */
  color: string;
  /** Text of the dark top box (the sector goal). */
  goal: string;
  goalIndicators: IndicatorRef[];
  outcomes: FrameworkNode[];
  levers: FrameworkNode[];
  enabling: EnablingItem[];
}

export interface FrameworkBoard {
  version: number;
  sectors: SectorFramework[];
}

/** Current schema version of the default board (bump to invalidate saved edits). */
export const FRAMEWORK_BOARD_VERSION = 2;

/**
 * Schema version of the beta board (report frameworks + adaptation layer).
 * Stored under a separate localStorage key so the two boards never collide;
 * bump to invalidate saved edits of the beta board specifically.
 */
export const FRAMEWORK_BOARD_BETA_VERSION = 1;

// ── Indicator lookup ────────────────────────────────────────────────────────

/**
 * All indicators that framework nodes can link to, indexed by id. Includes the
 * ESABCC report set, the beta + beta-adaptation indicators, and the ECNO
 * progress-tracker indicators (a few levers/outcomes link straight to an
 * existing ECNO series rather than a new beta one). ESABCC ids win on the rare
 * chance of a collision since they are listed first.
 */
export const FRAMEWORK_INDICATOR_INDEX: Record<string, Indicator> = Object.fromEntries(
  [...ECNO_INDICATORS, ...ALL_BETA_INDICATORS, ...ESABCC_REPORT_INDICATORS].map((i) => [i.id, i]),
);

/** Resolve a list of indicator ids to the full indicator records. */
export function resolveIndicators(ids: string[]): Indicator[] {
  return ids.map((id) => FRAMEWORK_INDICATOR_INDEX[id]).filter(Boolean) as Indicator[];
}

// small helper so the data below stays terse and readable
let _ref = 0;
function ref(code: string, label: string, indicatorIds: string[] = []): IndicatorRef {
  return { refId: `ref-${++_ref}`, code, label, indicatorIds };
}

/**
 * Like `ref`, but marks the chip as an *enhancement* the report itself did not
 * draw (an otherwise-empty lever/outcome we filled with a beta or reused ECNO
 * series). The report-faithful board strips every `enhanced` chip.
 */
function refX(code: string, label: string, indicatorIds: string[] = []): IndicatorRef {
  return { refId: `ref-${++_ref}`, code, label, indicatorIds, enhanced: true };
}

// ── The six sector frameworks ────────────────────────────────────────────────

export const SECTOR_FRAMEWORKS: SectorFramework[] = [
  // ── Energy supply — Figure 12 ──────────────────────────────────────────────
  {
    id: 'energy',
    name: 'Energy supply',
    figure: 'Figure 12',
    color: '#2F6E5B',
    goal: 'Decarbonised EU energy supply by 2050',
    goalIndicators: [ref('E1', 'Energy supply GHG emissions', ['esabcc-e1-energy-supply-ghg'])],
    outcomes: [
      {
        id: 'en-o1',
        layer: 'outcome',
        label: 'Reduced GHG emissions from energy supply',
        parents: ['goal'],
        indicators: [
          ref('E2', 'Fossil fuels and non-biomass RES in electricity mix', [
            'esabcc-e2-fossil-power-share',
            'esabcc-e2-res-noBio-power-share',
          ]),
          ref('E3', 'Electricity grid GHG emission intensity', ['esabcc-e3-grid-co2-intensity']),
        ],
      },
      {
        id: 'en-o2',
        layer: 'outcome',
        label: 'Reduced energy demand',
        note: 'Reduced final energy demand from end-use sectors (chapters 5–8)',
        parents: ['goal'],
        indicators: [
          ref('O2', 'Final and primary energy demand (chapter 3)', ['esabcc-o2-fec', 'esabcc-o2-pec']),
        ],
      },
    ],
    levers: [
      {
        id: 'en-l1',
        layer: 'lever',
        label: 'Fossil fuel phase-out',
        parents: ['en-o1'],
        indicators: [refX('E7β', 'Fossil share of gross available energy', ['beta-fossil-share-gae'])],
      },
      {
        id: 'en-l2',
        layer: 'lever',
        label: 'Reduction of methane emissions',
        parents: ['en-o1'],
        indicators: [ref('E6', 'Methane emissions', ['esabcc-e6-energy-ch4'])],
      },
      {
        id: 'en-l3',
        layer: 'lever',
        label: 'Fast RES roll-out at scale',
        parents: ['en-o1'],
        indicators: [
          ref('E4a', 'Solar PV capacities', ['esabcc-e4a-solar-pv-add']),
          ref('E4b', 'Wind power capacities', ['esabcc-e4b-wind-add']),
        ],
      },
      {
        id: 'en-l4',
        layer: 'lever',
        label: 'Targeted CCU/CCS',
        parents: ['en-o1'],
        indicators: [refX('E8β', 'CO₂ capture & storage capacity', ['beta-ccs-capacity'])],
      },
      {
        id: 'en-l5',
        layer: 'lever',
        label: 'System integration',
        parents: ['en-o1', 'en-o2'],
        indicators: [ref('E5', 'Electrification rate', ['esabcc-e5-electrification'])],
      },
      {
        id: 'en-l6',
        layer: 'lever',
        label: 'Energy efficiency',
        parents: ['en-o2'],
        indicators: [refX('E9β', 'Energy intensity of the economy', ['beta-energy-intensity'])],
      },
    ],
    enabling: [
      { id: 'en-e1', kind: 'sector-specific', label: "Investors' certainty and market signals" },
      { id: 'en-e2', kind: 'sector-specific', label: 'Infrastructure' },
      { id: 'en-e3', kind: 'cross-cutting', label: 'Price signals', chapter: 'ch. 10' },
      { id: 'en-e4', kind: 'cross-cutting', label: 'Whole-of-society approach', chapter: 'ch. 11' },
      { id: 'en-e5', kind: 'cross-cutting', label: 'Finance', chapter: 'ch. 12' },
      { id: 'en-e6', kind: 'cross-cutting', label: 'Innovation', chapter: 'ch. 13' },
      { id: 'en-e7', kind: 'cross-cutting', label: 'Skills and workforce', chapter: 'ch. 15' },
    ],
  },

  // ── Industry — Figure 22 ─────────────────────────────────────────────────
  {
    id: 'industry',
    name: 'Industry',
    figure: 'Figure 22',
    color: '#9C3B3B',
    goal: '92% GHG reductions by 2050 (compared to 2005)',
    goalIndicators: [ref('I1', 'Total GHG emissions', ['esabcc-i1-industry-ghg'])],
    outcomes: [
      {
        id: 'in-o1',
        layer: 'outcome',
        label: 'Lower demand for GHG-intensive materials',
        parents: ['goal'],
        indicators: [
          ref('I2', 'Total demand for selected materials', [
            'esabcc-i2-steel-use',
            'esabcc-i2-cement-use',
            'esabcc-i2-chemicals-production',
          ]),
        ],
      },
      {
        id: 'in-o2',
        layer: 'outcome',
        label: 'Low-carbon production processes',
        parents: ['goal'],
        indicators: [
          ref('I4', 'GHG intensity for selected materials', [
            'esabcc-i4-steel-ghg-intensity',
            'esabcc-i4-cement-ghg-intensity',
            'esabcc-i4-chemicals-ghg-intensity',
          ]),
        ],
      },
    ],
    levers: [
      {
        id: 'in-l1',
        layer: 'lever',
        label: 'Product demand reduction',
        parents: ['in-o1'],
        indicators: [refX('I8β', 'Material consumption per capita', ['beta-dmc-per-capita'])],
      },
      {
        id: 'in-l2',
        layer: 'lever',
        label: 'Material efficiency and substitution',
        parents: ['in-o1'],
        indicators: [refX('I9β', 'Resource productivity (GDP/DMC)', ['beta-resource-productivity'])],
      },
      {
        id: 'in-l3',
        layer: 'lever',
        label: 'Material circularity',
        parents: ['in-o1'],
        indicators: [ref('I3', 'Circular Material Use Rate', ['esabcc-i3-circular-mat-use'])],
      },
      {
        id: 'in-l4',
        layer: 'lever',
        label: 'Energy efficiency and fuel switches',
        parents: ['in-o2'],
        indicators: [
          ref('I5', 'Total energy use', ['esabcc-i5-industry-fec']),
          ref('I6', 'Energy mix', ['esabcc-i6-industry-electrification']),
        ],
      },
      {
        id: 'in-l5',
        layer: 'lever',
        label: 'New production processes',
        parents: ['in-o2'],
        // Links to the existing ECNO electrolyser-capacity series (hydrogen-based
        // direct reduction etc. is the headline new low-carbon process).
        indicators: [refX('H2', 'Installed electrolyser capacity', ['hydrogen-electrolyser-capacity'])],
      },
      {
        id: 'in-l6',
        layer: 'lever',
        label: 'CCS/CCU',
        parents: ['in-o2'],
        indicators: [
          ref('I7', '# of low-carbon projects', [
            'esabcc-i7a-steel-projects',
            'esabcc-i7b-cement-projects',
            'esabcc-i7c-chemicals-projects',
          ]),
        ],
      },
    ],
    enabling: [
      { id: 'in-e1', kind: 'sector-specific', label: 'Lead markets' },
      { id: 'in-e2', kind: 'not-assessed', label: 'Transition plans and strategies' },
      { id: 'in-e3', kind: 'cross-cutting', label: 'Infrastructure', chapter: 'ch. 4' },
      { id: 'in-e4', kind: 'cross-cutting', label: 'Price signals & international competitiveness', chapter: 'ch. 10' },
      { id: 'in-e5', kind: 'cross-cutting', label: 'Whole-of-society approach', chapter: 'ch. 11' },
      { id: 'in-e6', kind: 'cross-cutting', label: 'Finance', chapter: 'ch. 12' },
      { id: 'in-e7', kind: 'cross-cutting', label: 'RD&D and innovation', chapter: 'ch. 13' },
      { id: 'in-e8', kind: 'cross-cutting', label: 'Skills and workforce', chapter: 'ch. 15' },
    ],
  },

  // ── Transport — Figure 33 ────────────────────────────────────────────────
  {
    id: 'transport',
    name: 'Transport',
    figure: 'Figure 33',
    color: '#3D6E8C',
    goal: '−92% GHG emissions by 2050 compared to 2005 (−90% compared to 1990)',
    goalIndicators: [ref('T1', 'Total GHG emissions', ['esabcc-t1-transport-ghg'])],
    outcomes: [
      {
        id: 'tr-o1',
        layer: 'outcome',
        label: 'Reduce demand for energy-intensive transport',
        parents: ['goal'],
        indicators: [refX('T7β', 'Transport final energy consumption', ['beta-transport-fec'])],
      },
      {
        id: 'tr-o2',
        layer: 'outcome',
        label: 'Low-emission, energy- and resource-efficient vehicle fleet',
        parents: ['goal'],
        indicators: [ref('T4', 'Average GHG intensity of new vehicles', ['esabcc-t4-car-co2-intensity'])],
      },
    ],
    levers: [
      {
        id: 'tr-l1',
        layer: 'lever',
        label: 'Demand moderation',
        parents: ['tr-o1'],
        indicators: [ref('T2', 'Total demand', ['esabcc-t2a-passenger-demand', 'esabcc-t2b-freight-demand'])],
      },
      {
        id: 'tr-l2',
        layer: 'lever',
        label: 'Modal shift',
        parents: ['tr-o1'],
        indicators: [ref('T3', '% per mode', ['esabcc-t3a-road-share-passenger', 'esabcc-t3b-air-passenger'])],
      },
      {
        id: 'tr-l3',
        layer: 'lever',
        label: 'Uptake of ZEVs',
        parents: ['tr-o2'],
        indicators: [
          ref('T5', '% of ZEVs in new registrations', ['esabcc-t5a-zev-share-newcars', 'esabcc-t5b-zev-lorries-stock']),
        ],
      },
      {
        id: 'tr-l4',
        layer: 'lever',
        label: 'Vehicle efficiency',
        parents: ['tr-o2'],
        indicators: [refX('T8β', 'Average CO₂ of new cars (WLTP)', ['beta-new-car-co2'])],
      },
      {
        id: 'tr-l5',
        layer: 'lever',
        label: 'Fuel switches (bio, synthetic, …)',
        parents: ['tr-o2'],
        indicators: [
          ref('T6a', '% of fossil fuels in total FEC', ['esabcc-t6a-fossil-transport-share']),
          ref('T6b', '% of 1st-gen biofuels', ['esabcc-t6b-foodcrop-biofuels']),
        ],
      },
    ],
    enabling: [
      { id: 'tr-e1', kind: 'sector-specific', label: 'Transport infrastructure' },
      { id: 'tr-e2', kind: 'sector-specific', label: 'Supply chains' },
      { id: 'tr-e3', kind: 'not-assessed', label: 'Sharing economy' },
      { id: 'tr-e4', kind: 'not-assessed', label: 'Digitalisation' },
      { id: 'tr-e5', kind: 'cross-cutting', label: 'Circular economy', chapter: 'ch. 5' },
      { id: 'tr-e6', kind: 'cross-cutting', label: 'Price signals', chapter: 'ch. 10' },
      { id: 'tr-e7', kind: 'cross-cutting', label: 'Whole-of-society approach', chapter: 'ch. 11' },
      { id: 'tr-e8', kind: 'cross-cutting', label: 'Finance', chapter: 'ch. 12' },
      { id: 'tr-e9', kind: 'cross-cutting', label: 'Innovation', chapter: 'ch. 13' },
      { id: 'tr-e10', kind: 'cross-cutting', label: 'Spatial planning', chapter: 'ch. 7' },
      { id: 'tr-e11', kind: 'cross-cutting', label: 'Skills and workforce', chapter: 'ch. 15' },
    ],
  },

  // ── Buildings — Figure 46 ────────────────────────────────────────────────
  {
    id: 'buildings',
    name: 'Buildings',
    figure: 'Figure 46',
    color: '#B5852F',
    goal: 'Decarbonised EU building stock by 2050',
    goalIndicators: [ref('B1', 'Total GHG emissions', ['esabcc-b1-buildings-ghg'])],
    outcomes: [
      {
        id: 'bu-o1',
        layer: 'outcome',
        label: 'Reduced energy and material demand',
        parents: ['goal'],
        indicators: [ref('B2', 'Final energy consumption', ['esabcc-b2-buildings-fec'])],
      },
      {
        id: 'bu-o2',
        layer: 'outcome',
        label: 'Efficient and decarbonised energy supply',
        parents: ['goal'],
        indicators: [
          ref('B5', 'Energy mix', ['esabcc-b5a-residential-fossil-share', 'esabcc-b5b-tertiary-fossil-share']),
        ],
      },
    ],
    levers: [
      {
        id: 'bu-l1',
        layer: 'lever',
        label: 'Energy and material sufficiency',
        parents: ['bu-o1'],
        // Existing ECNO series: per-capita household final energy use is the
        // clearest sufficiency proxy.
        indicators: [refX('HH', 'Household energy use per capita', ['household-energy-per-capita'])],
      },
      {
        id: 'bu-l2',
        layer: 'lever',
        label: 'Sustainable construction',
        parents: ['bu-o1'],
        indicators: [ref('B4', 'Population and floor area', ['esabcc-b4-floor-area'])],
      },
      {
        id: 'bu-l3',
        layer: 'lever',
        label: 'Zero-emission new builds',
        parents: ['bu-o1'],
        indicators: [refX('B7β', 'nZEB / class-A share of new dwellings', ['beta-nzeb-new-share'])],
      },
      {
        id: 'bu-l4',
        layer: 'lever',
        label: 'Deep retrofits',
        parents: ['bu-o1'],
        indicators: [ref('B3', 'Renovation rate', ['esabcc-b3-residential-renovation-rate'])],
      },
      {
        id: 'bu-l5',
        layer: 'lever',
        label: 'Heat pumps',
        parents: ['bu-o2'],
        indicators: [ref('B6', 'Stock of heat pumps', ['esabcc-b6-heat-pump-stock'])],
      },
    ],
    enabling: [
      { id: 'bu-e1', kind: 'sector-specific', label: 'Prosumers & positive energy buildings/districts' },
      { id: 'bu-e2', kind: 'sector-specific', label: 'Quality and use of data' },
      { id: 'bu-e3', kind: 'sector-specific', label: 'Public and private investment' },
      { id: 'bu-e4', kind: 'sector-specific', label: 'Urban and spatial planning' },
      { id: 'bu-e5', kind: 'cross-cutting', label: 'Pricing emissions', chapter: 'ch. 10' },
      { id: 'bu-e6', kind: 'cross-cutting', label: 'Whole-of-society approach', chapter: 'ch. 11' },
      { id: 'bu-e7', kind: 'cross-cutting', label: 'Finance and investments', chapter: 'ch. 12' },
      { id: 'bu-e8', kind: 'cross-cutting', label: 'Innovation', chapter: 'ch. 13' },
      { id: 'bu-e9', kind: 'cross-cutting', label: 'Skills and workforce', chapter: 'ch. 15' },
    ],
  },

  // ── Agriculture — Figure 55 ──────────────────────────────────────────────
  {
    id: 'agriculture',
    name: 'Agriculture',
    figure: 'Figure 55',
    color: '#5E8C3D',
    goal: '−35 to −45% GHG emission reductions by 2050 (compared to 2005)',
    goalIndicators: [ref('A1', 'Total emissions in Mt CO₂e', ['esabcc-a1-agri-nonco2'])],
    outcomes: [
      {
        id: 'ag-o1',
        layer: 'outcome',
        label: 'Lower GHG intensity of production',
        parents: ['goal'],
        indicators: [
          ref('A2', 'Emission intensity of dairy cattle, non-dairy cattle, pigs & swine', [
            'esabcc-a2-dairy-ghg-intensity',
            'esabcc-a2-bovine-ghg-intensity',
            'esabcc-a2-pig-ghg-intensity',
          ]),
        ],
      },
      {
        id: 'ag-o2',
        layer: 'outcome',
        label: 'Lower demand for / production of GHG-intensive agricultural products',
        parents: ['goal'],
        indicators: [ref('A3', 'Total fertiliser use', ['esabcc-a3-fertiliser-use'])],
      },
    ],
    levers: [
      {
        id: 'ag-l1',
        layer: 'lever',
        label: 'Low-emission livestock production',
        parents: ['ag-o1'],
        indicators: [ref('A4', 'Production of animal products', ['esabcc-a4-dairy-production'])],
      },
      {
        id: 'ag-l2',
        layer: 'lever',
        label: 'Improved crop nutrient management',
        parents: ['ag-o1'],
        indicators: [ref('A3-NUE', 'Nitrogen use efficiency', ['esabcc-a3-nue'])],
      },
      {
        id: 'ag-l3',
        layer: 'lever',
        label: 'Reduced production',
        parents: ['ag-o2'],
        // Existing ECNO series: EU cattle herd size proxies livestock production.
        indicators: [refX('A8', 'EU cattle herd size', ['cattle-population'])],
      },
      {
        id: 'ag-l4',
        layer: 'lever',
        label: 'Sustainable, healthy diets',
        parents: ['ag-o2'],
        indicators: [ref('A5', 'Animal product consumption per capita', ['esabcc-a5-bovine-consumption'])],
      },
      {
        id: 'ag-l5',
        layer: 'lever',
        label: 'Reduced food loss and waste',
        parents: ['ag-o2'],
        indicators: [ref('A6', 'Food waste per capita', ['esabcc-a6-food-waste'])],
      },
      {
        id: 'ag-l6',
        layer: 'lever',
        label: 'Minimise demand for biofuel crops',
        parents: ['ag-o2'],
        indicators: [ref('A7', 'Bioenergy feedstock crops', ['esabcc-a7-bioenergy-feedstock'])],
      },
    ],
    enabling: [
      { id: 'ag-e1', kind: 'sector-specific', label: 'Social and cultural values' },
      { id: 'ag-e2', kind: 'sector-specific', label: 'Regulatory framework on food and feed safety' },
      { id: 'ag-e3', kind: 'sector-specific', label: 'Yields' },
      { id: 'ag-e4', kind: 'cross-cutting', label: 'Whole-of-society approach', chapter: 'ch. 11' },
      { id: 'ag-e5', kind: 'cross-cutting', label: 'Finance', chapter: 'ch. 12' },
      { id: 'ag-e6', kind: 'cross-cutting', label: 'Innovation', chapter: 'ch. 13' },
      { id: 'ag-e7', kind: 'cross-cutting', label: 'Skills and workforce', chapter: 'ch. 15' },
    ],
  },

  // ── LULUCF — Figure 64 ───────────────────────────────────────────────────
  {
    id: 'lulucf',
    name: 'LULUCF',
    figure: 'Figure 64',
    color: '#6B7B3A',
    goal: '−310 Mt CO₂e net removals in 2030, up to −600 Mt CO₂e in 2050',
    goalIndicators: [ref('L1', 'Total GHG emissions and removals', ['esabcc-l1-lulucf-net'])],
    outcomes: [
      {
        id: 'lu-o1',
        layer: 'outcome',
        label: 'Maintain or expand the surface area of carbon-rich land-use categories',
        parents: ['goal'],
        indicators: [ref('L2', 'Overall changes in land-use-change categories', ['esabcc-l2-forest-area'])],
      },
      {
        id: 'lu-o2',
        layer: 'outcome',
        label: 'Reduce emissions and increase removals within land-use categories',
        parents: ['goal'],
        indicators: [refX('L9β', 'Net flux from cropland & grassland', ['beta-cropland-grassland-flux'])],
      },
    ],
    levers: [
      {
        id: 'lu-l1',
        layer: 'lever',
        label: 'Decrease deforestation',
        parents: ['lu-o1'],
        indicators: [ref('L4', 'Deforestation', ['esabcc-l4-deforestation'])],
      },
      {
        id: 'lu-l2',
        layer: 'lever',
        label: 'Increased a-/reforestation',
        parents: ['lu-o1'],
        indicators: [ref('L3', 'Afforestation', ['esabcc-l3-afforestation'])],
      },
      {
        id: 'lu-l3',
        layer: 'lever',
        label: 'Wetland conservation and restoration',
        parents: ['lu-o2'],
        indicators: [refX('L10β', 'Net GHG emissions from wetlands', ['beta-wetlands-flux'])],
      },
      {
        id: 'lu-l4',
        layer: 'lever',
        label: 'Improved forest management',
        parents: ['lu-o2'],
        indicators: [ref('L6', 'Forest carbon sink', ['esabcc-l6-forest-sink'])],
      },
      {
        id: 'lu-l5',
        layer: 'lever',
        label: 'Soil management',
        parents: ['lu-o2'],
        indicators: [ref('L7', 'Emissions in non-forest lands', ['esabcc-l7-nonforest-lulucf'])],
      },
    ],
    enabling: [
      {
        id: 'lu-e1',
        kind: 'sector-specific',
        label: 'Keep demand for biomass within sustainable limits',
        indicatorIds: ['esabcc-l8-bioenergy-use'],
      },
      { id: 'lu-e2', kind: 'sector-specific', label: 'Enhancing climate adaptation / resilience' },
      {
        id: 'lu-e3',
        kind: 'cross-cutting',
        label: 'Spatial planning',
        chapter: 'ch. 7',
        indicatorIds: ['esabcc-l5-settlement-area'],
      },
      { id: 'lu-e4', kind: 'cross-cutting', label: 'Price signals and incentives', chapter: 'ch. 10' },
      { id: 'lu-e5', kind: 'cross-cutting', label: 'Reduced livestock production and food waste', chapter: 'ch. 8' },
    ],
  },
];

/**
 * A fresh, deep copy of the *enhanced* board — every mitigation lever/outcome
 * carries an indicator chip, including the ones the report drew empty (those
 * are flagged `enhanced`). Used as the editable starting point of the
 * "Enhanced flow charts" built-in version.
 */
export function defaultFrameworkBoard(): FrameworkBoard {
  return {
    version: FRAMEWORK_BOARD_VERSION,
    sectors: JSON.parse(JSON.stringify(SECTOR_FRAMEWORKS)) as SectorFramework[],
  };
}

/**
 * A fresh, deep copy of the board exactly as the report 'Towards EU climate
 * neutrality' (2024) draws it: the `enhanced` chips we added to otherwise-empty
 * levers/outcomes are stripped, so those nodes carry no indicator — 1:1 with
 * the published figures. This is the default ("ESABCC report") built-in version.
 */
export function defaultFrameworkBoardReport(): FrameworkBoard {
  const sectors = JSON.parse(JSON.stringify(SECTOR_FRAMEWORKS)) as SectorFramework[];
  for (const sector of sectors) {
    for (const node of [...sector.outcomes, ...sector.levers]) {
      node.indicators = node.indicators.filter((r) => !r.enhanced);
    }
  }
  return { version: FRAMEWORK_BOARD_VERSION, sectors };
}

// ── Beta board: report frameworks + a per-sector adaptation framework ─────
//
// For the "Flow charts (beta)" view each sector is copied verbatim and then
// given its OWN adaptation & resilience sub-framework: one or more adaptation
// outcomes (framed around the relevant EUCRA 2024 risk cluster — ecosystems,
// food, health, infrastructure, economy & finance), each fed by adaptation
// levers, plus an adaptation enabling condition. All adaptation cards carry
// `track: 'adaptation'`. Indicators are the sector-fitting beta-adaptation
// series, with fitting ECNO series reused where they already exist
// (water-exploitation-index, climate-economic-losses). Motivated by the EU
// Adaptation Strategy (2021) and the EEA European Climate Risk Assessment
// (EUCRA, 2024).

interface AdaptOutcome {
  id: string;
  label: string;
  /** Short EUCRA framing line (cluster + urgency) shown under the card. */
  note?: string;
  indicators: IndicatorRef[];
}
interface AdaptLever {
  id: string;
  label: string;
  /** id of the adaptation outcome this lever feeds. */
  parent: string;
  indicators: IndicatorRef[];
}
interface AdaptEnabling {
  id: string;
  kind: EnablingKind;
  label: string;
  indicatorIds?: string[];
}
interface AdaptationLayer {
  outcomes: AdaptOutcome[];
  levers: AdaptLever[];
  enabling: AdaptEnabling[];
}

/** Per-sector adaptation sub-frameworks, keyed by sector id. */
const ADAPTATION_LAYERS: Record<string, AdaptationLayer> = {
  energy: {
    outcomes: [
      {
        id: 'en-ad-o1',
        label: 'Energy supply resilient to heat, drought & extremes',
        note: 'EUCRA infrastructure cluster — risks to energy generation, transmission & demand (more action needed)',
        indicators: [
          ref('CDDβ', 'Cooling degree days', ['beta-adapt-cooling-degree-days']),
          ref('WEI+', 'Water scarcity (WEI+)', ['water-exploitation-index']),
        ],
      },
    ],
    levers: [
      {
        id: 'en-ad-l1',
        label: 'Cooling-water & drought management for generation',
        parent: 'en-ad-o1',
        indicators: [ref('WEI+', 'Water scarcity (WEI+)', ['water-exploitation-index'])],
      },
      {
        id: 'en-ad-l2',
        label: 'Generation & grid resilience to heat & drought',
        parent: 'en-ad-o1',
        indicators: [ref('EDRβ', 'Drought damage to energy', ['beta-adapt-energy-drought-damage'])],
      },
    ],
    enabling: [
      {
        id: 'en-ad-e1',
        kind: 'cross-cutting',
        label: 'Climate-risk assessment & insurance of energy assets',
        indicatorIds: ['beta-adapt-insurance-gap'],
      },
    ],
  },
  industry: {
    outcomes: [
      {
        id: 'in-ad-o1',
        label: 'Water- & climate-resilient production and supply chains',
        note: 'EUCRA economy & finance cluster — risks to industrial output & supply chains (more action needed)',
        indicators: [ref('LOSS', 'Climate economic losses', ['climate-economic-losses'])],
      },
    ],
    levers: [
      {
        id: 'in-ad-l1',
        label: 'Industrial water-stress management',
        parent: 'in-ad-o1',
        indicators: [ref('WEI+', 'Water scarcity (WEI+)', ['water-exploitation-index'])],
      },
      {
        id: 'in-ad-l2',
        label: 'Risk transfer & insurance for climate losses',
        parent: 'in-ad-o1',
        indicators: [ref('INSβ', 'Insurance protection gap', ['beta-adapt-insurance-gap'])],
      },
    ],
    enabling: [
      {
        id: 'in-ad-e1',
        kind: 'cross-cutting',
        label: 'Supply-chain climate-risk management',
      },
    ],
  },
  transport: {
    outcomes: [
      {
        id: 'tr-ad-o1',
        label: 'Climate-resilient transport infrastructure',
        note: 'EUCRA infrastructure cluster — inland flooding is one of 8 risks rated "urgent action needed"',
        indicators: [ref('LOSS', 'Climate economic losses', ['climate-economic-losses'])],
      },
    ],
    levers: [
      {
        id: 'tr-ad-l1',
        label: 'Climate-proofing & maintenance of rail, road & ports',
        parent: 'tr-ad-o1',
        indicators: [ref('RAILβ', 'Rail network at weather risk', ['beta-adapt-rail-disruption'])],
      },
      {
        id: 'tr-ad-l2',
        label: 'Flood- & heat-risk reduction on networks',
        parent: 'tr-ad-o1',
        indicators: [ref('COASTβ', 'Coastal flood damage to transport', ['beta-adapt-transport-coastal-damage'])],
      },
    ],
    enabling: [
      {
        id: 'tr-ad-e1',
        kind: 'cross-cutting',
        label: 'Resilience standards in TEN-T planning',
      },
    ],
  },
  buildings: {
    outcomes: [
      {
        id: 'bu-ad-o1',
        label: 'Heat-resilient buildings & population',
        note: 'EUCRA health cluster — heat on human health is one of 8 "urgent action needed" risks',
        indicators: [
          ref('HEATβ', 'Heat-related mortality', ['beta-adapt-heat-mortality']),
          ref('CDDβ', 'Cooling degree days', ['beta-adapt-cooling-degree-days']),
        ],
      },
      {
        id: 'bu-ad-o2',
        label: 'Flood-safe built environment',
        note: 'EUCRA infrastructure cluster — river & pluvial flooding (urgent action needed)',
        indicators: [ref('LOSS', 'Climate economic losses', ['climate-economic-losses'])],
      },
    ],
    levers: [
      {
        id: 'bu-ad-l1',
        label: 'Passive cooling, shading & green infrastructure',
        parent: 'bu-ad-o1',
        indicators: [ref('CDDβ', 'Cooling degree days', ['beta-adapt-cooling-degree-days'])],
      },
      {
        id: 'bu-ad-l2',
        label: 'Heat action plans & protection of vulnerable groups',
        parent: 'bu-ad-o1',
        indicators: [ref('HEATβ', 'Heat-related mortality', ['beta-adapt-heat-mortality'])],
      },
      {
        id: 'bu-ad-l3',
        label: 'Flood-risk reduction & risk-informed siting',
        parent: 'bu-ad-o2',
        indicators: [ref('FLOODβ', 'Population in flood-prone areas', ['beta-adapt-flood-prone-population'])],
      },
    ],
    enabling: [
      {
        id: 'bu-ad-e1',
        kind: 'sector-specific',
        label: 'Overheating & flood standards in building codes',
      },
    ],
  },
  agriculture: {
    outcomes: [
      {
        id: 'ag-ad-o1',
        label: 'Drought- & heat-resilient farming and food systems',
        note: 'EUCRA food cluster — crop production is one of 8 "urgent action needed" risks',
        indicators: [
          ref('WEI+', 'Water scarcity (WEI+)', ['water-exploitation-index']),
          ref('DRGTβ', 'Ecosystem drought impact', ['beta-adapt-drought-impact']),
        ],
      },
    ],
    levers: [
      {
        id: 'ag-ad-l1',
        label: 'Water-efficient irrigation & drought management',
        parent: 'ag-ad-o1',
        indicators: [ref('WEI+', 'Water scarcity (WEI+)', ['water-exploitation-index'])],
      },
      {
        id: 'ag-ad-l2',
        label: 'Drought-tolerant crops & soil-moisture management',
        parent: 'ag-ad-o1',
        indicators: [ref('DRGTβ', 'Cropland drought impact', ['beta-adapt-drought-impact'])],
      },
    ],
    enabling: [
      {
        id: 'ag-ad-e1',
        kind: 'sector-specific',
        label: 'Crop diversification, insurance & early warning',
      },
    ],
  },
  lulucf: {
    outcomes: [
      {
        id: 'lu-ad-o1',
        label: 'Resilient forests & ecosystems',
        note: 'EUCRA ecosystems cluster — wildfire is one of 8 "urgent action needed" risks',
        indicators: [ref('FIREβ', 'Area burnt by wildfires', ['beta-adapt-burnt-area'])],
      },
    ],
    levers: [
      {
        id: 'lu-ad-l1',
        label: 'Wildfire risk management & early warning (EFFIS)',
        parent: 'lu-ad-o1',
        indicators: [ref('FIREβ', 'Area burnt by wildfires', ['beta-adapt-burnt-area'])],
      },
      {
        id: 'lu-ad-l2',
        label: 'Drought-adapted species & ecosystem restoration',
        parent: 'lu-ad-o1',
        indicators: [ref('DRGTβ', 'Drought impact on ecosystems', ['beta-adapt-drought-impact'])],
      },
    ],
    enabling: [
      {
        id: 'lu-ad-e1',
        kind: 'sector-specific',
        label: 'Climate-adapted forest management & restoration',
      },
    ],
  },
};

/**
 * A fresh, deep copy of the report board with each sector's adaptation
 * sub-framework grafted on — the starting point for the "Flow charts (beta)" view.
 */
export function defaultFrameworkBoardBeta(): FrameworkBoard {
  const sectors = JSON.parse(JSON.stringify(SECTOR_FRAMEWORKS)) as SectorFramework[];
  for (const sector of sectors) {
    const layer = ADAPTATION_LAYERS[sector.id];
    if (!layer) continue;
    for (const o of layer.outcomes) {
      sector.outcomes.push({
        id: o.id,
        layer: 'outcome',
        track: 'adaptation',
        label: o.label,
        note: o.note,
        parents: ['goal'],
        indicators: o.indicators,
      });
    }
    for (const l of layer.levers) {
      sector.levers.push({
        id: l.id,
        layer: 'lever',
        track: 'adaptation',
        label: l.label,
        parents: [l.parent],
        indicators: l.indicators,
      });
    }
    for (const e of layer.enabling) {
      sector.enabling.push({
        id: e.id,
        kind: e.kind,
        track: 'adaptation',
        label: e.label,
        indicatorIds: e.indicatorIds,
      });
    }
  }
  // Deep-clone so the shared ADAPTATION_LAYERS objects aren't aliased into the
  // returned (editable) board.
  return JSON.parse(JSON.stringify({ version: FRAMEWORK_BOARD_BETA_VERSION, sectors })) as FrameworkBoard;
}

export const ENABLING_KIND_LABEL: Record<EnablingKind, string> = {
  'sector-specific': 'Sector-specific (this chapter)',
  'cross-cutting': 'Cross-cutting',
  'not-assessed': 'Not assessed',
};
