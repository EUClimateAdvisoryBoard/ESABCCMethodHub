/**
 * A6 — The protected land burns first: Natura 2000 weighting.
 *
 * The parent module's methodology records one striking number and does
 * nothing with it: in 2025, 424,023 ha — 39% of all EU burnt area — fell
 * inside Natura 2000 sites (JRC/EFFIS, quoted in `../../model.ts`). This
 * analysis does the arithmetic that number implies.
 *
 * The Natura 2000 terrestrial network covers roughly 18-19% of EU land
 * (EEA Natura 2000 barometer; ~766,000 km² of ~4.1 million km²; confidence:
 * medium — used to one significant figure). If 18.7% of the land carries 39%
 * of the fire, protected land burnt at ≈ 2.8 TIMES the rate of unprotected
 * land in 2025. That is not an accident of one season: protected sites are
 * disproportionately the fire-prone Mediterranean woodlands, and their
 * management regimes constrain exactly the fuel-management toolkit (grazing,
 * clearing, prescribed burning) that analysis A3 prices.
 *
 * The policy collision is with the Nature Restoration Regulation
 * ((EU) 2024/1991): restoration measures on at least 20% of EU land and sea
 * by 2030, and for habitats in poor condition ≥30% restored by 2030, 60% by
 * 2040, 90% by 2050. Restoration targets are being set on the land
 * statistically most likely to burn — and neither instrument requires the
 * restoration plans to be fire-resilient.
 *
 * Everything here inherits the parent module's carbon machinery; the only
 * new dials are the Natura share of burnt area (default: the observed 2025
 * value) and a recovery multiplier reflecting that high-nature-value systems
 * are the slowest to return.
 */

import { DEFAULTS, areaInYear, excessImpact, type Params } from '../../model';

/** Observed 2025: burnt area inside Natura 2000, ha (JRC, via parent model docs). */
export const N2K_BURNT_2025_HA = 424_023;

/** 2025 total EU burnt area, ha (JRC figure the parent module uses). */
export const TOTAL_BURNT_2025_HA = 1_079_538;

/** Natura 2000 share of 2025 burnt area — the observed default for the dial. */
export const N2K_SHARE_2025 = N2K_BURNT_2025_HA / TOTAL_BURNT_2025_HA; // ≈ 0.393

/** Natura 2000 terrestrial coverage, Mha (~18.7% of ~410 Mha EU land; EEA barometer, 1 s.f.). */
export const N2K_AREA_MHA = 76.6;

/** EU-27 land area, Mha. */
export const EU_LAND_MHA = 410;

/** Burn-rate ratio inside vs outside the network, from the 2025 observations. */
export function burnRateRatio2025(): { inside: number; outside: number; ratio: number } {
  const inside = N2K_BURNT_2025_HA / (N2K_AREA_MHA * 1e6);
  const outside = (TOTAL_BURNT_2025_HA - N2K_BURNT_2025_HA) / ((EU_LAND_MHA - N2K_AREA_MHA) * 1e6);
  return { inside, outside, ratio: inside / outside };
}

export const N2K_DEFAULTS = {
  sharePct: Math.round(N2K_SHARE_2025 * 1000) / 10, // 39.3
  recoveryMultiplier: 1.5,
};

export type N2kResult = {
  /** Excess sink loss occurring on protected land, MtCO2e, in the given year. */
  lossOnN2kMt: number;
  /** Same with the slower-recovery multiplier applied to the protected share. */
  lossOnN2kSlowMt: number;
  /** Cumulative burnt area inside Natura 2000, 2026..year, ha. */
  cumN2kBurntHa: number;
  /** That as a share of the whole terrestrial network, %. */
  cumShareOfNetworkPct: number;
};

export function n2k(
  year: number,
  growthPct: number,
  sharePct = N2K_DEFAULTS.sharePct,
  recoveryMultiplier = N2K_DEFAULTS.recoveryMultiplier,
  p: Params = DEFAULTS
): N2kResult {
  const par: Params = { ...p, mode: 'growth', growthPct };
  const share = sharePct / 100;

  const loss = excessImpact(year, par).total * share;
  // Slower recovery on protected land: rerun the parent machinery with the
  // recovery window stretched, and take the protected share of that.
  const slowPar: Params = { ...par, recoveryYears: Math.round(par.recoveryYears * recoveryMultiplier) };
  const lossSlow = excessImpact(year, slowPar).total * share;

  let cum = 0;
  for (let y = 2026; y <= year; y++) cum += areaInYear(y, par) * share;

  return {
    lossOnN2kMt: loss,
    lossOnN2kSlowMt: lossSlow,
    cumN2kBurntHa: cum,
    cumShareOfNetworkPct: (cum / (N2K_AREA_MHA * 1e6)) * 100,
  };
}

/** Nature Restoration Regulation milestones, for the collision table. */
export const NRL_MILESTONES = [
  { year: 2030, text: 'Restoration measures on ≥20% of EU land and sea; ≥30% of habitats in poor condition restored.' },
  { year: 2040, text: '≥60% of habitats in poor condition restored.' },
  { year: 2050, text: '≥90% of habitats in poor condition restored.' },
];

export type A6Summary = {
  ratio2025: number;
  lossOnN2k2040At5: number;
  cumN2kBurnt2040At5Ha: number;
  cumShareOfNetwork2040At5: number;
};

export function summary(): A6Summary {
  const r = burnRateRatio2025();
  const res = n2k(2040, 5);
  return {
    ratio2025: r.ratio,
    lossOnN2k2040At5: res.lossOnN2kMt,
    cumN2kBurnt2040At5Ha: res.cumN2kBurntHa,
    cumShareOfNetwork2040At5: res.cumShareOfNetworkPct,
  };
}
