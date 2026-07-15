/**
 * Overview Industry — Clean Tech, Side 2: the EXTERNAL role (data).
 * ------------------------------------------------------------------
 * The complement of `cleantech-catalogue.ts` (Side 1). Side 1 maps the
 * emissions of the manufacturing subsectors we ALREADY have and the levers
 * that remove them. This file maps the NEW manufacturing industries — solar
 * PV, wind turbines, batteries, electric vehicles, electrolysers, heat pumps
 * — and their EXTERNAL role: how their products decarbonise the OTHER
 * sectors (power, transport, buildings, other industry, agriculture).
 *
 * Four data blocks:
 *   • DEMAND_SECTORS         — the sectors being decarbonised;
 *   • CLEANTECH_INDUSTRIES   — each clean-tech industry: NACE mapping, the
 *                              sectors it supports (with mechanism + source),
 *                              sourced mitigation potentials, sourced
 *                              deployment levels in robust 2040 modelling,
 *                              and the EU manufacturing position;
 *   • SECTOR_PATHWAYS        — the sectoral emission reductions modelled in
 *                              the European Commission's 2040-target impact
 *                              assessment (SWD(2024) 63), linking each
 *                              sector's cut to its clean-tech drivers;
 *   • EXTERNAL_PRIORITIES    — an EDITORIAL priority & competitiveness read
 *                              (flagged, like the clean/old overlay).
 *
 * SOURCING RULE (hard, same as Side 1): every data point carries a `source`
 * with a real, working link — nothing is invented. Scenario figures are
 * study- and assumption-dependent; each is attributed to the specific source
 * it came from and should be read as "as reported by <source>". The ONLY
 * non-sourced layer is EXTERNAL_PRIORITIES, which is an analytical judgement
 * by MethodHub, clearly flagged in the UI and the export.
 */

import type { Source, Sourced } from './cleantech-catalogue';

/* -------------------------------------------------------------- sectors */

export type DemandSectorId = 'power' | 'transport' | 'buildings' | 'industry' | 'agriculture';

export interface DemandSector {
  id: DemandSectorId;
  name: string;
  color: string;
  icon: string;
  /** One line: what decarbonising this sector depends on. */
  summary: string;
}

export const DEMAND_SECTORS: DemandSector[] = [
  {
    id: 'power',
    name: 'Power',
    color: '#0065A4',
    icon: '⚡',
    summary:
      'Electricity supply — the keystone sector: every electrification lever downstream is only as clean as the power behind it.',
  },
  {
    id: 'transport',
    name: 'Transport',
    color: '#B83230',
    icon: '🚗',
    summary:
      'Road transport dominated by oil; decarbonised mainly by battery-electric vehicles on clean power, plus e-fuels for the hard end.',
  },
  {
    id: 'buildings',
    name: 'Buildings',
    color: '#FF9933',
    icon: '🏠',
    summary:
      'Space and water heating on gas and oil boilers; decarbonised mainly by heat pumps, efficiency and district heat.',
  },
  {
    id: 'industry',
    name: 'Other industry',
    color: '#6667AB',
    icon: '🏭',
    summary:
      'The Side-1 subsectors themselves: their electrification, hydrogen and heat-pump levers all consume Side-2 products.',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    color: '#007B6C',
    icon: '🌾',
    summary:
      'Machinery, heat and fertiliser inputs: electrified equipment, solar/heat-pump heat and green-ammonia fertiliser.',
  },
];

/* ---------------------------------------------------- clean-tech industries */

export type SupportRole = 'primary' | 'supporting';

export interface SectorSupport {
  sectorId: DemandSectorId;
  role: SupportRole;
  /** The mechanism: how this industry's products cut that sector's emissions. */
  note: string;
  source: Source;
}

export interface CleanTechIndustry {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** NACE Rev. 2.1 manufacturing codes (Section C) for the industry itself. */
  nace: string[];
  naceNote?: string;
  /** What the industry manufactures. */
  what: string;
  /** The demand sectors its products decarbonise. */
  supports: SectorSupport[];
  /** Sourced mitigation-potential statements. */
  mitigation: Sourced[];
  /** Sourced deployment levels in robust 2040/2050 modelling. */
  scenarioDeployment: Sourced[];
  /** Sourced EU manufacturing / competitiveness position. */
  euPosition: Sourced[];
}

/** Placeholder marker — populated in the research-fill pass below. */
export const CLEANTECH_INDUSTRIES: CleanTechIndustry[] = [];

/* ----------------------------------------------------- scenario pathways */

export interface PathwayPoint {
  year: number;
  /** Modelled reduction vs the pathway's base year, as a positive %. */
  pct: number;
}

export interface SectorPathway {
  sectorId: DemandSectorId;
  baseYear: string;
  /** Scenario the points come from, e.g. "EC 2040 IA, S3 (−90–95%)". */
  scenario: string;
  points: PathwayPoint[];
  note?: string;
  source: Source;
  /** CleanTechIndustry ids that deliver the modelled cut in this sector. */
  drivenBy: string[];
}

export const SECTOR_PATHWAYS: SectorPathway[] = [];

/* ------------------------------------------------------------- headlines */

/** Sourced headline facts for the top of Side 2. */
export const EXTERNAL_HEADLINES: Sourced[] = [];

export const PATHWAY_CAVEAT =
  'Scenario figures are model results, not observations: they come from the impact assessment underpinning the ' +
  'Commission’s 2040 recommendation and are assumption-dependent (technology costs, behaviour, carbon removals). ' +
  'Sectoral definitions follow the modelling framework (PRIMES/GAINS), so they do not align one-to-one with the EU ' +
  'ETS scopes used on Side 1. Read each bar as "as modelled by <source>", not a settled number.';

/* ------------------------------------------------- editorial priority read */

/**
 * EDITORIAL overlay (like the clean/old classification on Side 1): a ranked
 * read of where mitigation leverage and EU competitiveness meet. NOT a
 * sourced datum — flagged as a MethodHub judgement in the UI and the export.
 */
export interface ExternalPriority {
  techId: string;
  rank: number;
  /** Why this industry ranks where it does on mitigation leverage. */
  rationale: string;
  /** The competitiveness read: where the EU can realistically build strength. */
  competitiveness: string;
}

export const EXTERNAL_PRIORITY_NOTE =
  'This ranking is an analytical judgement by MethodHub, layered on the sourced data above — not an external ' +
  'taxonomy. It weighs two things: (1) mitigation leverage — how much of the modelled economy-wide cut to 2040 the ' +
  'industry’s products deliver, and how many sectors they serve; (2) competitive defensibility — whether the EU has ' +
  'a manufacturing base worth defending or a realistic path to build one, versus deploying imports. It is a ' +
  'prioritisation for POLICY ATTENTION, not a verdict on which technology matters for the climate.';

export const EXTERNAL_PRIORITIES: ExternalPriority[] = [];
