/**
 * Summer Prep · Optimization — Biomass evidence pack.
 * ----------------------------------------------------
 * Sourced context data for the "Biomass — a scarce resource?" section of the
 * optimization module: EU biomass supply for energy, imports/exports, and the
 * competing sectoral claims on the same resource, against which the model's
 * industrial-biomass ceiling (constraints.csv, biomass_pj_max) is judged.
 *
 * SOURCING RULE (house style): every figure carries a real source with a
 * working URL. Ranges are given as [low, high] where the literature disagrees.
 * This file is data + drafted interpretation only — rendered by page.tsx.
 *
 * STATUS: schema stub — populated by the biomass evidence agent.
 */

export interface BiomassSource {
  org: string;
  title: string;
  url: string;
  year?: string;
}

export interface BiomassFigure {
  /** Short display label, e.g. "Forestry biomass (domestic)". */
  label: string;
  /** PJ/yr — a central value or a [low, high] range. */
  value_pj: number | [number, number];
  /** Reference year or period of the figure, e.g. "2021". */
  year?: string;
  /** Qualifier / derivation note shown in the UI tooltip. */
  note?: string;
  source: BiomassSource;
}

/** EU-27 domestic primary biomass supply for energy, by origin category. */
export const EU_BIOMASS_SUPPLY: BiomassFigure[] = [];

/** EU-27 biomass trade: imports and exports (negative value_pj = export). */
export const EU_BIOMASS_TRADE: BiomassFigure[] = [];

/** Competing sectoral claims on EU bioenergy (incl. this model's industry claim). */
export const COMPETING_CLAIMS: BiomassFigure[] = [];

/** The model's own industrial biomass ceiling, PJ/yr (mirrors constraints.csv). */
export const MODEL_CEILING_PJ = 300;

/** Drafted interpretation rendered under the charts. */
export const BIOMASS_VERDICT: { headline: string; paragraphs: string[] } = {
  headline: '',
  paragraphs: [],
};
