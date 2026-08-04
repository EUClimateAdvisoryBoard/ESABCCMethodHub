/**
 * A7 — Which growth rate is climate-consistent?
 *
 * The parent module's central control is a burnt-area growth dial that no
 * default can make neutral. This analysis benchmarks the dial against the
 * published climate-fire literature, so the obvious sceptic's question —
 * "which setting does climate science actually support?" — gets an answer
 * with sources instead of a shrug.
 *
 * Anchor: Turco et al. 2018 (Nature Communications 9:3821, "Exacerbated
 * fires in Mediterranean Europe due to anthropogenic warming projected with
 * non-stationary climate-fire models"). Projected change in Mediterranean-
 * Europe burned area RELATIVE TO THE 1971-2000 BASELINE:
 *
 *     +40-54%  at 1.5 °C global warming
 *     +62-87%  at 2 °C
 *     +96-187% at 3 °C
 *
 * The ranges reflect model variants with and without antecedent-climate
 * (fuel) effects. Mediterranean Europe is where most EU burnt area is, so
 * the numbers are used EU-wide here — stated, not hidden.
 *
 * (The JRC's PESETA IV wildfire study points the same direction — fire
 * danger rising across Europe, most strongly in the south — and is cited on
 * the page qualitatively.)
 *
 * The mapping, done carefully because it is where such comparisons usually
 * cheat: the Turco percentages are anchored on 1971-2000, a period already
 * ~0.35 °C above pre-industrial, while today's fire regime sits at ~1.3 °C.
 * So the EU has already climbed part of the curve, and only the REMAINING
 * climb between now and 2050 may be converted into a compound growth rate:
 *
 *     g = ( M(GWL_2050) / M(GWL_now) )^(1/25) − 1
 *
 * where M is the piecewise-linear burned-area multiplier through the Turco
 * points. This deliberately captures the mean climate signal ONLY — not fuel
 * accumulation from land abandonment, not ignition trends, not suppression
 * capacity, all of which the dial also embodies.
 */

/** Warming of the 1971-2000 baseline period vs pre-industrial, °C (~0.3-0.4). */
export const GWL_BASELINE = 0.35;

/** Approximate current global warming level, °C (2021-25 mean, IPCC-consistent). */
export const GWL_NOW = 1.3;

/** Turco et al. 2018 burned-area multipliers vs the 1971-2000 baseline. */
export const TURCO_POINTS: { gwl: number; lo: number; hi: number }[] = [
  { gwl: GWL_BASELINE, lo: 1.0, hi: 1.0 },
  { gwl: 1.5, lo: 1.4, hi: 1.54 },
  { gwl: 2.0, lo: 1.62, hi: 1.87 },
  { gwl: 3.0, lo: 1.96, hi: 2.87 },
];

/** OLS slope through 2021-25 as %/yr of the mean — the parent model's trend. */
export const RECENT_TREND_PCT = 12.8;

/** Piecewise-linear interpolation of the Turco multiplier band. */
export function multiplierAt(gwl: number): { lo: number; hi: number } {
  const pts = TURCO_POINTS;
  if (gwl <= pts[0].gwl) return { lo: 1, hi: 1 };
  for (let i = 1; i < pts.length; i++) {
    if (gwl <= pts[i].gwl) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (gwl - a.gwl) / (b.gwl - a.gwl);
      return { lo: a.lo + t * (b.lo - a.lo), hi: a.hi + t * (b.hi - a.hi) };
    }
  }
  const last = pts[pts.length - 1];
  return { lo: last.lo, hi: last.hi }; // clamp beyond 3 °C rather than extrapolate
}

export type ImpliedGrowth = {
  gwl2050: number;
  /** Climate-consistent compound growth 2025→2050, %/yr, low and high. */
  loPct: number;
  hiPct: number;
  /** Burnt-area multiplier remaining between now and 2050, low and high. */
  ratioLo: number;
  ratioHi: number;
};

export function impliedGrowth(gwl2050: number): ImpliedGrowth {
  const now = multiplierAt(GWL_NOW);
  const then = multiplierAt(gwl2050);
  const ratioLo = then.lo / now.hi; // most conservative pairing
  const ratioHi = then.hi / now.lo; // most aggressive pairing
  const years = 2050 - 2025;
  return {
    gwl2050,
    loPct: (Math.pow(Math.max(ratioLo, 0.01), 1 / years) - 1) * 100,
    hiPct: (Math.pow(Math.max(ratioHi, 0.01), 1 / years) - 1) * 100,
    ratioLo,
    ratioHi,
  };
}

export const DEFAULT_GWL_2050 = 2.0;

export type A7Summary = {
  loPctAt2C: number;
  hiPctAt2C: number;
  hiPctAt3C: number;
  moduleDefaultPct: number;
  recentTrendPct: number;
};

export function summary(): A7Summary {
  const g2 = impliedGrowth(2.0);
  const g3 = impliedGrowth(3.0);
  return {
    loPctAt2C: g2.loPct,
    hiPctAt2C: g2.hiPct,
    hiPctAt3C: g3.hiPct,
    moduleDefaultPct: 5,
    recentTrendPct: RECENT_TREND_PCT,
  };
}
