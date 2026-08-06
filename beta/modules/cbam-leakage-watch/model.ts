/**
 * CBAM & Leakage Watch (beta module M · 49) — indicator arithmetic.
 *
 * Deterministic, dependency-free calculations for the three leakage
 * indicators. Everything here is reproducible pen-and-paper arithmetic:
 * an ordinary-least-squares trend with a residual band (indicator A),
 * and an import-weighted intensity comparison with a fixed threshold
 * rule (indicator B). Indicator C (downstream displacement) needs no
 * arithmetic — it is a scope-boundary register.
 *
 * None of these calculations establishes causation. A point outside the
 * trend band is a BREAK, not leakage; a falling import-weighted reported
 * intensity is a MIX SHIFT, not proof of resource shuffling. The page
 * renders those limits next to every result.
 */

import type { IndexPoint, ShufflingExporter } from './data.generated';

/* --------------------------------------------------- A · volume-break trend */

export type TrendFit = {
  /** Index points per year. */
  slope: number;
  /** Fitted value at year = 0 (use `fittedAt`, not this, for readouts). */
  intercept: number;
  /** Standard deviation of the fit residuals (n − 2 degrees of freedom). */
  residualSd: number;
  n: number;
};

/**
 * Ordinary least squares of index value on calendar year. Throws on
 * fewer than three points — a silent two-point "trend" is exactly the
 * kind of quiet failure this repository hunts.
 */
export function fitLinearTrend(points: IndexPoint[]): TrendFit {
  const n = points.length;
  if (n < 3) {
    throw new Error(`fitLinearTrend needs at least 3 points, got ${n}`);
  }
  const meanX = points.reduce((s, p) => s + p.year, 0) / n;
  const meanY = points.reduce((s, p) => s + p.value, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.year - meanX) * (p.year - meanX);
    sxy += (p.year - meanX) * (p.value - meanY);
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const ssRes = points.reduce((s, p) => {
    const r = p.value - (intercept + slope * p.year);
    return s + r * r;
  }, 0);
  const residualSd = Math.sqrt(ssRes / (n - 2));
  return { slope, intercept, residualSd, n };
}

export function fittedAt(fit: TrendFit, year: number): number {
  return fit.intercept + fit.slope * year;
}

/** Band half-width in residual standard deviations. Stated wherever the band is drawn. */
export const BAND_K = 2;

export type BandPoint = { year: number; fitted: number; lo: number; hi: number };

/** The fitted trend ± BAND_K residual standard deviations over a year range (inclusive). */
export function trendBand(fit: TrendFit, fromYear: number, toYear: number): BandPoint[] {
  const out: BandPoint[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    const f = fittedAt(fit, y);
    out.push({ year: y, fitted: f, lo: f - BAND_K * fit.residualSd, hi: f + BAND_K * fit.residualSd });
  }
  return out;
}

export type BandVerdict = 'within band' | 'above band' | 'below band';

/** Deterministic classification of an observation against the band. */
export function classifyAgainstBand(value: number, band: BandPoint): BandVerdict {
  if (value > band.hi) return 'above band';
  if (value < band.lo) return 'below band';
  return 'within band';
}

/* ------------------------------------------ B · resource-shuffling proxy */

/**
 * Import-share-weighted mean intensity. Throws if the shares do not sum
 * to 1 (±0.1 %) — a mix that quietly drops a leg must fail loudly.
 */
export function weightedIntensity(mix: { share: number; intensity: number }[]): number {
  const total = mix.reduce((s, m) => s + m.share, 0);
  if (Math.abs(total - 1) > 0.001) {
    throw new Error(`weightedIntensity: shares sum to ${total.toFixed(4)}, expected 1`);
  }
  return mix.reduce((s, m) => s + m.share * m.intensity, 0);
}

/** Threshold rule, stated in the UI: flag when the import-weighted reported
 * intensity falls by more than SHUFFLE_DROP_PCT while no exporter's national
 * average intensity fell by more than NATIONAL_FALL_PCT. */
export const SHUFFLE_DROP_PCT = 5;
export const NATIONAL_FALL_PCT = 1;

export type ShufflingSignal = {
  beforeIntensity: number;
  afterIntensity: number;
  changePct: number;
  anyNationalFall: boolean;
  flagged: boolean;
};

export function shufflingSignal(exporters: ShufflingExporter[]): ShufflingSignal {
  const beforeIntensity = weightedIntensity(
    exporters.map((e) => ({ share: e.shareBefore, intensity: e.reportedIntensity })),
  );
  const afterIntensity = weightedIntensity(
    exporters.map((e) => ({ share: e.shareAfter, intensity: e.reportedIntensity })),
  );
  const changePct = ((afterIntensity - beforeIntensity) / beforeIntensity) * 100;
  const anyNationalFall = exporters.some((e) => e.nationalAvgChangePct < -NATIONAL_FALL_PCT);
  return {
    beforeIntensity,
    afterIntensity,
    changePct,
    anyNationalFall,
    flagged: changePct < -SHUFFLE_DROP_PCT && !anyNationalFall,
  };
}

/* ----------------------------------------------------- regime-age helper */

/**
 * Complete calendar months elapsed from a start date (YYYY-MM-DD) to a
 * compile month (YYYY-MM), exclusive of the compile month itself.
 * '2026-01-01' → '2026-08' gives 7.
 */
export function completeMonthsSince(startIso: string, compileYm: string): number {
  const [sy, sm] = startIso.split('-').map(Number);
  const [cy, cm] = compileYm.split('-').map(Number);
  if (!sy || !sm || !cy || !cm) {
    throw new Error(`completeMonthsSince: bad inputs ${startIso} / ${compileYm}`);
  }
  return Math.max(0, (cy - sy) * 12 + (cm - sm));
}
