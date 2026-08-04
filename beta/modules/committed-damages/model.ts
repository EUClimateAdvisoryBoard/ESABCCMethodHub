/**
 * Committed Damages — stylised rebuild of the damage-projection pipeline of
 * the RETRACTED article:
 *
 *   Kotz, M., Levermann, A. & Wenz, L. "The economic commitment of climate
 *   change", Nature 628, 551–557 (17 Apr 2024),
 *   https://doi.org/10.1038/s41586-024-07219-0 — retracted by the authors on
 *   3 Dec 2025 (Retraction Note: https://doi.org/10.1038/s41586-025-09726-0).
 *
 * What this file is — and is not:
 *
 *   The paper combined fixed-effects distributed-lag panel regressions
 *   (1,660 sub-national regions, 1979–2019, DOSE dataset) for five climate
 *   variables with 21 bias-adjusted CMIP-6 models to project income losses.
 *   Its Monte-Carlo machinery, per-region climate fields and bootstrapped
 *   coefficient sets cannot run in a browser. This module instead rebuilds
 *   the STRUCTURE of the pipeline as a reduced-form teaching model:
 *
 *   · the five damage channels of eq. (10) — annual mean temperature (ΔT̄),
 *     day-to-day temperature variability (ΔT̃), total annual precipitation
 *     (ΔP), number of wet days (ΔPwd) and extreme daily rainfall (ΔPext) —
 *     each with a moderator-linear cumulative marginal effect, as in the
 *     paper's interaction terms;
 *   · the first-difference + distributed-lag persistence logic (the paper's
 *     "robust lower bound" between pure level and pure growth effects);
 *   · the growth-rate compounding of eq. (13) into an income path relative
 *     to a no-climate-change baseline.
 *
 *   The EFFECTIVE sensitivities below are NOT the paper's regression
 *   coefficients (those live in its Supplementary Tables 2–4). They are
 *   calibrated so the default settings approximately reproduce the paper's
 *   published headline anchors: world −19 % (likely 11–29 %) and Europe
 *   ≈ −11 % committed income reduction by 2049, a T̄-only model at ≈ −13 %
 *   world, day-to-day variability as the largest add-on channel, and the
 *   levels ≪ lags ≪ growth specification ordering of Extended Data Fig. 3.
 *   Every parameter is exposed as a slider precisely because the certified
 *   numbers no longer exist: the retraction showed the magnitudes are
 *   sensitive to data errors, single countries and error structure.
 *
 *   Country climatologies, regional warming/precipitation scaling factors,
 *   GDP and population are order-of-magnitude values compiled from public
 *   sources (ERA5-era climatologies, EUCRA/IPCC regional fact sheets,
 *   Eurostat 2024 national accounts) and rounded; flagged approximate.
 */

export type Scenario = 'rcp26' | 'rcp85';
export type Spec = 'levels' | 'lags' | 'growth';
export type ChannelKey = 'T' | 'V' | 'P' | 'W' | 'X';

export type Channels = Record<ChannelKey, boolean>;

export const ALL_CHANNELS: Channels = { T: true, V: true, P: true, W: true, X: true };
export const T_ONLY: Channels = { T: true, V: false, P: false, W: false, X: false };

/** Tunable model parameters (sliders). */
export type Params = {
  /** Mean-temperature channel: % growth per °C shock, per °C of baseline T̄ above TREF. */
  cT: number;
  /** Baseline temperature at which the mean-T marginal effect crosses zero (°C). */
  tRef: number;
  /** Variability channel: % growth per °C of day-to-day variability shock at zero seasonality. */
  cV: number;
  /** Total-precipitation channel: % growth per +10 % annual precipitation (benefit), at P = 0. */
  cP: number;
  /** Wet-days channel: % growth per +10 % wet days (damage). */
  cW: number;
  /** Extreme-rainfall channel: % growth per +10 % extreme daily rainfall (damage), scaled by T̄. */
  cX: number;
  /** Number of years a shock keeps hitting the growth rate ('lags' spec). Paper: 8–10 (T), 4 (P). */
  nLags: number;
  /** Contemporaneous share of the lag-sum ('levels' spec). */
  levelShare: number;
  /** Per-year growth wedge per unit of climate-level anomaly ('growth' spec), as share of lag-sum. */
  growthFactor: number;
  /** Multiplier on the warming pathways (climate-sensitivity slider). */
  climateSens: number;
  /** Half-width factor of the likely band, as a multiplier on the damage log-sum. */
  uncSpread: number;
};

/** Defaults calibrated to the paper's headline anchors (see header comment). */
export const DEFAULTS: Params = {
  cT: 1.42,
  tRef: 1.0,
  cV: 50,
  cP: 1.2,
  cW: 1.0,
  cX: 0.7,
  nLags: 10,
  levelShare: 0.3,
  growthFactor: 0.045,
  climateSens: 1.0,
  uncSpread: 0.5,
};

/** A region's baseline climatology and scaling of regional change per °C of global warming. */
export type Region = {
  id: string;
  name: string;
  /** Annual mean temperature 1979–2019 (°C), population-weighted, approximate. */
  tBar: number;
  /** Seasonal temperature amplitude (warmest − coldest month, °C) — moderator of the T̃ channel. */
  tHat: number;
  /** Annual precipitation (mm), approximate. */
  precip: number;
  /** Regional warming per +1 °C global mean (land amplification). */
  amp: number;
  /** Change in day-to-day variability (°C) per +1 °C global mean. Negative at high latitudes. */
  vTrend: number;
  /** Change in total annual precipitation (%) per +1 °C global mean. Negative = drying. */
  pTrend: number;
  /** Change in the number of wet days (%) per +1 °C global mean. */
  wTrend: number;
  /** GDP 2024, € billion (Eurostat, rounded). */
  gdp: number;
  /** Population 2024, millions. */
  pop: number;
};

/** EU-27, order-of-magnitude climatology + national accounts. All values approximate. */
export const EU27: Region[] = [
  { id: 'AT', name: 'Austria',     tBar: 7.1,  tHat: 19, precip: 1100, amp: 1.6, vTrend: 0.2,   pTrend: 1.0,  wTrend: 0.5,  gdp: 480,  pop: 9.1 },
  { id: 'BE', name: 'Belgium',     tBar: 10.5, tHat: 15, precip: 850,  amp: 1.4, vTrend: 0.2,   pTrend: 0.5,  wTrend: 1.0,  gdp: 610,  pop: 11.8 },
  { id: 'BG', name: 'Bulgaria',    tBar: 10.9, tHat: 21, precip: 610,  amp: 1.4, vTrend: 0.3,   pTrend: -3.5, wTrend: -1.0, gdp: 100,  pop: 6.4 },
  { id: 'HR', name: 'Croatia',     tBar: 11.6, tHat: 20, precip: 900,  amp: 1.5, vTrend: 0.3,   pTrend: -4.0, wTrend: -1.5, gdp: 82,   pop: 3.8 },
  { id: 'CY', name: 'Cyprus',      tBar: 19.3, tHat: 15, precip: 450,  amp: 1.5, vTrend: 0.35,  pTrend: -6.0, wTrend: -3.0, gdp: 33,   pop: 0.9 },
  { id: 'CZ', name: 'Czechia',     tBar: 7.9,  tHat: 19, precip: 680,  amp: 1.5, vTrend: 0.15,  pTrend: 0.5,  wTrend: 0.5,  gdp: 320,  pop: 10.9 },
  { id: 'DK', name: 'Denmark',     tBar: 8.8,  tHat: 15, precip: 750,  amp: 1.3, vTrend: 0.05,  pTrend: 1.5,  wTrend: 1.5,  gdp: 395,  pop: 6.0 },
  { id: 'EE', name: 'Estonia',     tBar: 6.0,  tHat: 21, precip: 660,  amp: 1.5, vTrend: -0.05, pTrend: 3.0,  wTrend: 2.0,  gdp: 39,   pop: 1.4 },
  { id: 'FI', name: 'Finland',     tBar: 2.3,  tHat: 23, precip: 550,  amp: 1.7, vTrend: -0.15, pTrend: 4.0,  wTrend: 2.5,  gdp: 275,  pop: 5.6 },
  { id: 'FR', name: 'France',      tBar: 11.5, tHat: 15, precip: 850,  amp: 1.4, vTrend: 0.25,  pTrend: -1.5, wTrend: 0.0,  gdp: 2920, pop: 68.4 },
  { id: 'DE', name: 'Germany',     tBar: 9.1,  tHat: 17, precip: 750,  amp: 1.4, vTrend: 0.2,   pTrend: 0.5,  wTrend: 0.5,  gdp: 4300, pop: 84.5 },
  { id: 'EL', name: 'Greece',      tBar: 15.5, tHat: 18, precip: 650,  amp: 1.4, vTrend: 0.35,  pTrend: -5.5, wTrend: -2.5, gdp: 235,  pop: 10.4 },
  { id: 'HU', name: 'Hungary',     tBar: 10.5, tHat: 21, precip: 590,  amp: 1.5, vTrend: 0.25,  pTrend: -1.5, wTrend: -0.5, gdp: 200,  pop: 9.6 },
  { id: 'IE', name: 'Ireland',     tBar: 9.6,  tHat: 9,  precip: 1150, amp: 1.1, vTrend: 0.1,   pTrend: 1.0,  wTrend: 1.0,  gdp: 510,  pop: 5.3 },
  { id: 'IT', name: 'Italy',       tBar: 13.5, tHat: 17, precip: 830,  amp: 1.4, vTrend: 0.35,  pTrend: -4.5, wTrend: -2.0, gdp: 2130, pop: 58.9 },
  { id: 'LV', name: 'Latvia',      tBar: 6.4,  tHat: 21, precip: 670,  amp: 1.5, vTrend: -0.05, pTrend: 3.0,  wTrend: 2.0,  gdp: 40,   pop: 1.9 },
  { id: 'LT', name: 'Lithuania',   tBar: 6.9,  tHat: 21, precip: 680,  amp: 1.5, vTrend: -0.05, pTrend: 3.0,  wTrend: 2.0,  gdp: 78,   pop: 2.9 },
  { id: 'LU', name: 'Luxembourg',  tBar: 9.3,  tHat: 16, precip: 900,  amp: 1.4, vTrend: 0.2,   pTrend: 0.5,  wTrend: 0.5,  gdp: 86,   pop: 0.7 },
  { id: 'MT', name: 'Malta',       tBar: 19.2, tHat: 12, precip: 550,  amp: 1.3, vTrend: 0.3,   pTrend: -6.0, wTrend: -3.0, gdp: 22,   pop: 0.6 },
  { id: 'NL', name: 'Netherlands', tBar: 10.2, tHat: 14, precip: 850,  amp: 1.3, vTrend: 0.15,  pTrend: 1.0,  wTrend: 1.0,  gdp: 1120, pop: 17.9 },
  { id: 'PL', name: 'Poland',      tBar: 8.5,  tHat: 20, precip: 600,  amp: 1.5, vTrend: 0.1,   pTrend: 1.0,  wTrend: 1.0,  gdp: 810,  pop: 36.6 },
  { id: 'PT', name: 'Portugal',    tBar: 15.2, tHat: 11, precip: 850,  amp: 1.3, vTrend: 0.3,   pTrend: -5.5, wTrend: -2.5, gdp: 285,  pop: 10.6 },
  { id: 'RO', name: 'Romania',     tBar: 9.8,  tHat: 22, precip: 640,  amp: 1.4, vTrend: 0.25,  pTrend: -2.5, wTrend: -1.0, gdp: 350,  pop: 19.1 },
  { id: 'SK', name: 'Slovakia',    tBar: 8.0,  tHat: 20, precip: 750,  amp: 1.5, vTrend: 0.15,  pTrend: 0.0,  wTrend: 0.0,  gdp: 130,  pop: 5.4 },
  { id: 'SI', name: 'Slovenia',    tBar: 9.5,  tHat: 19, precip: 1150, amp: 1.5, vTrend: 0.25,  pTrend: -2.5, wTrend: -1.0, gdp: 67,   pop: 2.1 },
  { id: 'ES', name: 'Spain',       tBar: 14.3, tHat: 14, precip: 640,  amp: 1.4, vTrend: 0.35,  pTrend: -5.5, wTrend: -2.5, gdp: 1590, pop: 48.6 },
  { id: 'SE', name: 'Sweden',      tBar: 4.2,  tHat: 20, precip: 620,  amp: 1.5, vTrend: -0.1,  pTrend: 3.0,  wTrend: 2.0,  gdp: 545,  pop: 10.5 },
];

/** World as one pseudo-region (population-weighted), for the global reference line. */
export const WORLD: Region = {
  id: 'WORLD', name: 'World', tBar: 21, tHat: 13, precip: 1050, amp: 1.25,
  vTrend: 0.3, pTrend: 0.6, wTrend: 0.6, gdp: 0, pop: 8100,
};

export const YEAR0 = 2020;
export const YEAR1 = 2100;
export const YEARS: number[] = Array.from({ length: YEAR1 - YEAR0 + 1 }, (_, i) => YEAR0 + i);

/** EU-27 GDP 2024 (€ bn) and population (m), summed from the table above. */
export const EU_GDP_2024 = EU27.reduce((s, r) => s + r.gdp, 0);
export const EU_POP_2024 = EU27.reduce((s, r) => s + r.pop, 0);

/** SSP2-style real GDP-per-capita growth used only to express % losses in €. */
export const EU_BASELINE_GROWTH = 0.014;

/**
 * Global-mean warming above the 2020 level (°C), stylised CMIP-6 pathways.
 * rcp26 ≈ SSP2-RCP2.6 (peaks ≈ +0.7 °C above 2020 and flattens),
 * rcp85 ≈ SSP5-RCP8.5 (≈ +0.9 °C by 2050, ≈ +3.8 °C by 2100).
 */
export function warming(scenario: Scenario, year: number, sens = 1): number {
  const t = year - YEAR0;
  if (t <= 0) return 0;
  if (scenario === 'rcp85') return sens * (0.022 * t + 0.00032 * t * t);
  return sens * 0.68 * Math.tanh(t / 32);
}

/* ---- moderator-linear cumulative marginal effects (lag-sums), % per unit shock ---- */

/** ΔT̄ channel: % growth per +1 °C, more negative the warmer the baseline (moderator T̄). */
export const meanTempME = (p: Params, tBar: number) => -p.cT * Math.max(0, tBar - p.tRef);

/** ΔT̃ channel: % growth per +1 °C day-to-day variability; strongest at low seasonality (moderator T̂). */
export const variabilityME = (p: Params, tHat: number) => -p.cV * Math.max(0.15, 1 - tHat / 40);

/** ΔP channel: % growth per +10 % annual precipitation — a benefit, larger in dry regions (moderator P). */
export const precipME = (p: Params, precip: number) => +p.cP * Math.max(0.1, (1300 - precip) / 1300);

/** ΔPwd channel: % growth per +10 % wet days — a damage (moderator Pwd folded into the constant). */
export const wetDaysME = (p: Params) => -p.cW;

/** ΔPext channel: % growth per +10 % extreme daily rainfall, steeper in warm regions (moderator T̄). */
export const extremeME = (p: Params, tBar: number) => -p.cX * (0.4 + tBar / 25);

/** Intensification of extreme daily rainfall, % per °C of REGIONAL warming (Clausius–Clapeyron ≈ 7). */
export const CC_SCALING = 7;

/** Cap on the moving-average moderator, mimicking the paper's 95th-percentile cap (°C above baseline). */
const MODERATOR_CAP = 4;

export type ProjectOptions = {
  channels?: Channels;
  spec?: Spec;
  /** Multiplier applied to the damage log-sum (used for the likely band). */
  scale?: number;
};

/**
 * Project the income path of one region relative to a no-climate-change
 * baseline. Returns fractional income change per year (YEARS-indexed,
 * negative = loss), i.e. the paper's "percentage change in income per capita
 * relative to a baseline without climate impacts" (eq. 13).
 */
export function project(region: Region, p: Params, scenario: Scenario, opts: ProjectOptions = {}): number[] {
  const ch = opts.channels ?? ALL_CHANNELS;
  const spec = opts.spec ?? 'lags';
  const scale = opts.scale ?? 1;
  const nLags = Math.max(1, Math.round(p.nLags));

  const out: number[] = [0];
  const shocks: number[] = [];
  let logSum = 0; // cumulative log income change, in %
  let prev = { T: 0, V: 0, P: 0, W: 0, X: 0 };

  for (let y = YEAR0 + 1; y <= YEAR1; y++) {
    const g = warming(scenario, y, p.climateSens);
    // 30-year moving-average moderator, capped as in the paper's 95th-pct rule:
    const tBar30 = Math.min(region.tBar + region.amp * g, region.tBar + MODERATOR_CAP);
    const cur = {
      T: region.amp * g,                    // ΔT̄ vs 2020 (°C)
      V: region.vTrend * g,                 // ΔT̃ vs 2020 (°C)
      P: region.pTrend * g,                 // ΔP vs 2020 (%)
      W: region.wTrend * g,                 // ΔPwd vs 2020 (%)
      X: CC_SCALING * region.amp * g,       // ΔPext vs 2020 (%)
    };

    // This year's shock (full lag-sum size), % of GRPpc:
    const shock =
      (ch.T ? meanTempME(p, tBar30) * (cur.T - prev.T) : 0) +
      (ch.V ? variabilityME(p, region.tHat) * (cur.V - prev.V) : 0) +
      (ch.P ? precipME(p, region.precip) * ((cur.P - prev.P) / 10) : 0) +
      (ch.W ? wetDaysME(p) * ((cur.W - prev.W) / 10) : 0) +
      (ch.X ? extremeME(p, tBar30) * ((cur.X - prev.X) / 10) : 0);
    shocks.push(shock);

    let delta: number;
    if (spec === 'levels') {
      // Pure level effects: only the contemporaneous coefficient hits.
      delta = shock * p.levelShare;
    } else if (spec === 'growth') {
      // Pure growth effects: the LEVEL of the climate anomaly depresses the
      // growth rate every year (no first difference, no recovery).
      delta =
        p.growthFactor *
        ((ch.T ? meanTempME(p, tBar30) * cur.T : 0) +
          (ch.V ? variabilityME(p, region.tHat) * cur.V : 0) +
          (ch.P ? precipME(p, region.precip) * (cur.P / 10) : 0) +
          (ch.W ? wetDaysME(p) * (cur.W / 10) : 0) +
          (ch.X ? extremeME(p, tBar30) * (cur.X / 10) : 0));
    } else {
      // Distributed lags (the paper's lower-bound spec): each shock keeps
      // hitting the growth rate for nLags years, uniformly.
      delta = 0;
      for (let l = 0; l < nLags; l++) {
        const i = shocks.length - 1 - l;
        if (i >= 0) delta += shocks[i] / nLags;
      }
    }

    logSum += delta * scale;
    out.push(Math.max(Math.exp(logSum / 100) - 1, -0.97));
    prev = cur;
  }
  return out;
}

/** GDP-weighted EU-27 aggregate income-change path. */
export function euSeries(p: Params, scenario: Scenario, opts: ProjectOptions = {}): number[] {
  const agg = new Array(YEARS.length).fill(0);
  for (const r of EU27) {
    const s = project(r, p, scenario, opts);
    for (let i = 0; i < agg.length; i++) agg[i] += s[i] * r.gdp;
  }
  return agg.map((v) => v / EU_GDP_2024);
}

/** € bn per year lost in `year`, against an SSP2-style baseline grown from 2024 GDP. */
export function euroLoss(fraction: number, year: number): number {
  const baseline = EU_GDP_2024 * Math.pow(1 + EU_BASELINE_GROWTH, year - 2024);
  return fraction * baseline;
}

/** Year at which the two scenario paths diverge by more than `gap` (fraction of income). */
export function divergenceYear(low: number[], high: number[], gap = 0.02): number | null {
  for (let i = 0; i < YEARS.length; i++) {
    if (low[i] - high[i] >= gap) return YEARS[i];
  }
  return null;
}
