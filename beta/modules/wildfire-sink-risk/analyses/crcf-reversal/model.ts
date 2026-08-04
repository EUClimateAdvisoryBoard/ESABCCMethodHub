/**
 * A5 — Certified today, burnt tomorrow: buffer-pool arithmetic for carbon
 * farming under the module's fire scenarios.
 *
 * Context. The Carbon Removals and Carbon Farming certification framework
 * (Regulation (EU) 2024/3012, in force December 2024) is the instrument the
 * EU intends to use to scale land-based removals — the same removals the
 * 310/317 Mt sink assumptions lean on, and the same instrument the Method
 * Hub's policy-gap tracker flags for slow uptake (`lulucf-carbon-farming-
 * uptake`). Carbon farming units are temporary by construction, and the
 * framework requires reversal risk to be addressed through liability
 * mechanisms, including collective buffer pools.
 *
 * Question. If certified forest carbon-farming land burns at the rates the
 * parent module projects, what share of certified units does fire alone
 * destroy over a crediting horizon — i.e. how big must a buffer pool be
 * before it covers ANY other reversal risk (drought, beetles, harvest,
 * non-permanence of practice)?
 *
 * Method, kept deliberately simple and stated in full:
 *   • Annual burn probability for certified forest land in year y:
 *       p(y) = burntArea(y) × forestShare / EU_FOREST_MHA × targeting
 *     where burntArea(y) is the parent module's projection at the shared
 *     growth dial, forestShare (0.5) converts total burnt area to forest
 *     burnt area, EU_FOREST_MHA ≈ 160 Mha is the EU forest pool the parent
 *     model documents, and `targeting` expresses that carbon-farming projects
 *     are not sited uniformly — Mediterranean afforestation and agroforestry
 *     sit in higher-risk landscapes (dial, default 1.5×).
 *   • Expected burnt share of the portfolio over horizon T from 2026:
 *       S = 1 − Π (1 − p(y))
 *   • A burnt stand does not lose every credited tonne (partial combustion,
 *     salvage, soil pools): a severity dial (default 70%) scales S into an
 *     expected REVERSED share of credited units.
 *
 * This is a portfolio-level expectation, not a project-level tail risk — a
 * real buffer must also cover variance and correlated bad years (2025 burnt
 * 39% of its area inside Natura 2000 in a single season). So the outputs
 * here are floors, not sufficient buffers, and the page says so.
 *
 * For comparison, collective buffer pools in existing forest-carbon registry
 * practice typically hold on the order of 10-25% of issued units (order of
 * magnitude across voluntary and compliance registries; confidence: low —
 * used as a scale reference, not a data point).
 */

import { DEFAULTS, areaInYear, type Params } from '../../model';

/** EU forest pool, Mha — same figure the parent model's docs use. */
export const EU_FOREST_MHA = 160;

/** Registry-practice buffer range used purely as a scale reference, %. */
export const TYPICAL_BUFFER_PCT: [number, number] = [10, 25];

export const CRCF_DEFAULTS = {
  portfolioMha: 5,
  targeting: 1.5,
  horizonYears: 20,
  severity: 0.7,
};

export type BufferResult = {
  /** Expected share of portfolio area burnt at least once over the horizon, %. */
  burntSharePct: number;
  /** Expected reversed share of credited units (severity-scaled), %. */
  reversedSharePct: number;
  /** Total units credited over the horizon, MtCO2e (portfolio × seqRate × T). */
  creditedMt: number;
  /** Expected reversed units, MtCO2e (stock-weighted: early cohorts risk more). */
  reversedMt: number;
  /** First-year and last-year annual burn probability, %. */
  pFirstPct: number;
  pLastPct: number;
};

export function buffer(
  growthPct: number,
  portfolioMha = CRCF_DEFAULTS.portfolioMha,
  targeting = CRCF_DEFAULTS.targeting,
  horizonYears = CRCF_DEFAULTS.horizonYears,
  severity = CRCF_DEFAULTS.severity,
  p: Params = DEFAULTS
): BufferResult {
  const par: Params = { ...p, mode: 'growth', growthPct };
  const start = 2026;
  let survive = 1;
  let reversedMt = 0;
  let pFirst = 0;
  let pLast = 0;

  for (let k = 0; k < horizonYears; k++) {
    const y = start + k;
    const py = Math.min(0.5, (areaInYear(y, par) * par.forestShare) / (EU_FOREST_MHA * 1e6) * targeting);
    if (k === 0) pFirst = py;
    pLast = py;
    // Stock credited so far on surviving land, MtCO2e: grows with the years.
    const stockMt = portfolioMha * 1e6 * par.seqRate * k / 1e6;
    reversedMt += survive * py * stockMt * severity;
    survive *= 1 - py;
  }

  const burntShare = 1 - survive;
  const creditedMt = (portfolioMha * 1e6 * par.seqRate * horizonYears) / 1e6;

  return {
    burntSharePct: burntShare * 100,
    reversedSharePct: burntShare * severity * 100,
    creditedMt,
    reversedMt,
    pFirstPct: pFirst * 100,
    pLastPct: pLast * 100,
  };
}

export type A5Summary = {
  reversedShareAt5: number;
  reversedShareAt12: number;
  reversedMtAt5: number;
  creditedMt: number;
  typicalBuffer: [number, number];
};

export function summary(): A5Summary {
  const b5 = buffer(5);
  const b12 = buffer(12);
  return {
    reversedShareAt5: b5.reversedSharePct,
    reversedShareAt12: b12.reversedSharePct,
    reversedMtAt5: b5.reversedMt,
    creditedMt: b5.creditedMt,
    typicalBuffer: TYPICAL_BUFFER_PCT,
  };
}
