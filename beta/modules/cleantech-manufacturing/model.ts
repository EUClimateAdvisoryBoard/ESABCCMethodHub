/**
 * Clean-Tech Manufacturing Scoreboard — deterministic arithmetic
 * (beta module M · 46).
 *
 * Everything here is arithmetic on the sourced ranges in
 * data.generated.ts — no judgement calls, no hidden averaging beyond the
 * explicitly labelled mid-point, and every function returns `null` rather
 * than a number when the inputs do not support one.
 *
 * The pace ratio mirrors the EEA-style distance-to-target arithmetic
 * defined once in src/lib/content-analysis/policy-coherence.ts
 * (computePace): observed per-year change over the recent trend window
 * divided by the per-year change required from the latest value to the
 * target, read against the same thresholds (≥1.0 on-track, ≥0.5 lagging,
 * otherwise off-track).
 */

import type { RangeFigure, SupplierShare, Technology } from './data.generated';

/** NZIA 2030 benchmark — manufacturing capacity as % of annual deployment needs. */
export const NZIA_2030_DOMESTIC_SHARE = 40;
/** NZIA 2040 benchmark — EU share of world production, ≈%. */
export const NZIA_2040_WORLD_SHARE = 15;
/** Same thresholds as src/lib/content-analysis/policy-coherence.ts. */
export const PACE_THRESHOLDS = { onTrack: 1.0, lagging: 0.5 } as const;

export const BENCHMARK_YEAR = 2030;

export type PaceReading = 'on-track' | 'lagging' | 'off-track';

export interface Pace {
  observedPerYear: number;
  requiredPerYear: number;
  /** null when no further growth is required (already at/past the benchmark). */
  ratio: number | null;
  reading: PaceReading;
  /** Trend window actually used, for honest display. */
  trendFrom: number;
  trendTo: number;
}

/** Explicit, labelled mid-point of a source-disagreement range. */
export const mid = (r: RangeFigure): number => (r.low.value + r.high.value) / 2;

/** The 40 %-of-need benchmark capacity, native unit, against the need mid-point. */
export function benchmarkCapacity(t: Technology): number {
  return (NZIA_2030_DOMESTIC_SHARE / 100) * mid(t.need2030);
}

export interface ShareEnvelope {
  /** Most pessimistic defensible reading: low capacity ÷ high need. */
  low: number;
  /** Most optimistic defensible reading: high capacity ÷ low need. */
  high: number;
  /** Mid capacity ÷ mid need — labelled as such wherever shown. */
  mid: number;
}

/** Current capacity as % of the 2030 deployment need — full honest envelope. */
export function currentShare(t: Technology): ShareEnvelope | null {
  if (!t.capacity) return null;
  return {
    low: (100 * t.capacity.low.value) / t.need2030.high.value,
    high: (100 * t.capacity.high.value) / t.need2030.low.value,
    mid: (100 * mid(t.capacity)) / mid(t.need2030),
  };
}

/** Capacity still missing to reach 40 % of the mid-point need, native unit.
 *  `low` uses the high capacity estimate, `high` the low one; both floored at 0. */
export function distanceToBenchmark(t: Technology): { low: number; high: number } | null {
  if (!t.capacity) return null;
  const target = benchmarkCapacity(t);
  return {
    low: Math.max(0, target - t.capacity.high.value),
    high: Math.max(0, target - t.capacity.low.value),
  };
}

/** EEA-style pace ratio on the capacity mid-point. Null where the trend or
 *  the capacity itself is not published — never a silent zero. */
export function computePace(t: Technology): Pace | null {
  if (!t.capacity || !t.capacityPast) return null;
  const capMid = mid(t.capacity);
  const obsYears = Math.max(1, t.capacityYear - t.capacityPast.year);
  const observedPerYear = (capMid - t.capacityPast.value) / obsYears;
  const reqYears = Math.max(1, BENCHMARK_YEAR - t.capacityYear);
  const requiredPerYear = (benchmarkCapacity(t) - capMid) / reqYears;
  const base = { observedPerYear, requiredPerYear, trendFrom: t.capacityPast.year, trendTo: t.capacityYear };
  // Already at / past the benchmark with no required growth → on track.
  if (requiredPerYear <= 0) return { ...base, ratio: null, reading: 'on-track' };
  const ratio = observedPerYear / requiredPerYear;
  const reading: PaceReading =
    ratio >= PACE_THRESHOLDS.onTrack ? 'on-track' : ratio >= PACE_THRESHOLDS.lagging ? 'lagging' : 'off-track';
  return { ...base, ratio, reading };
}

/** Herfindahl–Hirschman index over the LISTED origins only (0–10 000 scale).
 *  With a partial share table this is a lower bound — label it as one. */
export function hhiLowerBound(shares: SupplierShare[]): number {
  return Math.round(shares.reduce((s, x) => s + x.share * x.share, 0));
}

/* ------------------------------------------------------------ formatting */

export const fmt = (n: number, d = 0): string =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/** '9–14.1' style range string (no unit). */
export function fmtRange(r: RangeFigure, d = 1): string {
  if (r.low.value === r.high.value) return fmt(r.low.value, d);
  return `${fmt(r.low.value, d)}–${fmt(r.high.value, d)}`;
}

/** '≈' prefix for figures whose data entry is flagged uncertain. */
export const approx = (uncertain: boolean | undefined, s: string): string => (uncertain ? `≈${s}` : s);
