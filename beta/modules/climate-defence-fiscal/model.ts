/**
 * Climate Investment vs Rearmament — deterministic squeeze arithmetic
 * (beta module M · 51).
 *
 * AI-compiled 2026-08 — pending Secretariat verification.
 *
 * Everything here is bookkeeping, not modelling: the defence increment is
 * the Hague commitment applied to today's GDP (no growth, today's euros),
 * ramped linearly from 2025 to 2035; the squeeze is that increment times a
 * crowd-out share the USER sets, because the crowd-out share is a political
 * variable no source can supply. No regression, no elasticities, no
 * forecast. All € figures are €bn/yr in 2024 euros against 2024 GDP.
 */

import {
  CURRENT_CLIMATE_INVEST_BN,
  CURRENT_DEFENCE_PCT,
  EU_GDP_2024_BN,
  NATO_GDP_COVERAGE_DEFAULT,
  NEED_ROWS,
  NeedRow,
} from './data.generated';

export const RAMP_START = 2025;
export const RAMP_END = 2035;
export const RAMP_YEARS: number[] = Array.from(
  { length: RAMP_END - RAMP_START + 1 },
  (_, i) => RAMP_START + i,
);

/** Hague commitment, core band (% of GDP). */
export const HAGUE_CORE_PCT = 3.5;
/** Hague commitment, broader defence- and security-related band (% of GDP). */
export const HAGUE_BROADER_PCT = 1.5;

export type Params = {
  /** THE political variable: share of the defence increment displacing public climate investment, 0..1. */
  crowdOut: number;
  /** Count the 1.5 % "defence- and security-related" band in the increment? */
  includeBroader: boolean;
  /** Share of the 1.5 % band assumed climate-adjacent (dual-use) and therefore NOT squeezing, 0..1. */
  dualUseShare: number;
  /** Share of EU GDP covered by the Hague commitment (23 of 27 member states are NATO allies), 0..1. */
  natoCoverage: number;
  /** Which need-side row the gap is read against. */
  needId: string;
};

export const DEFAULTS: Params = {
  crowdOut: 0.4,
  includeBroader: false,
  dualUseShare: 0.2,
  natoCoverage: NATO_GDP_COVERAGE_DEFAULT,
  needId: 'i4ce-deficit',
};

export type Preset = {
  id: 'conservative' | 'central' | 'maximalist';
  label: string;
  blurb: string;
  overrides: Partial<Params>;
};

export const PRESETS: Preset[] = [
  {
    id: 'conservative',
    label: 'Conservative — no crowd-out',
    blurb:
      'The rearmament increment is financed entirely outside climate budgets: escape-clause deficits, SAFE loans, new own resources. Crowd-out 0 % — defensible as long as debt rules stay suspended for defence.',
    overrides: { crowdOut: 0, includeBroader: false, dualUseShare: 0.2 },
  },
  {
    id: 'central',
    label: 'Central — partial crowd-out',
    blurb:
      'A 40 % share of the core (3.5 %) increment displaces public climate investment once escape clauses lapse in 2028 and MFF headings compete. The 40 % is a reading, not a finding.',
    overrides: { crowdOut: 0.4, includeBroader: false, dualUseShare: 0.2 },
  },
  {
    id: 'maximalist',
    label: 'Maximalist — full crowd-out',
    blurb:
      'Every euro of the full 5 % commitment (core + broader band, no dual-use credit) comes out of money that would otherwise fund the transition. An upper bound by construction, not a projection.',
    overrides: { crowdOut: 1, includeBroader: true, dualUseShare: 0 },
  },
];

export type SqueezeResult = {
  /** Defence increment at full ramp (2035), €bn/yr in 2024 euros. */
  incrementCore: number;
  incrementBroader: number;
  increment2035: number;
  /** Annual displaced climate investment at 2035, €bn/yr. */
  displaced2035: number;
  /** Per-year displaced series along the linear ramp, €bn/yr. */
  displacedSeries: number[];
  /** Per-year increment series along the linear ramp, €bn/yr. */
  incrementSeries: number[];
  /** Cumulative displaced over 2025–2035, €bn. */
  displacedCumulative: number;
  /** Years of delay at current pace: cumulative displaced ÷ current annual climate investment. */
  delayYears: number;
  /** The selected need row. */
  need: NeedRow;
  /** Gap vs the selected need row, €bn/yr — null when the row has no like-for-like actual. */
  gapWithoutLo: number | null;
  gapWithoutHi: number | null;
  gapWithLo: number | null;
  gapWithHi: number | null;
};

export function needById(id: string): NeedRow {
  return NEED_ROWS.find((r) => r.id === id) ?? NEED_ROWS[0];
}

export function computeSqueeze(p: Params): SqueezeResult {
  const gdp = EU_GDP_2024_BN * p.natoCoverage;

  const incrementCore = (gdp * (HAGUE_CORE_PCT - CURRENT_DEFENCE_PCT)) / 100;
  const incrementBroader = p.includeBroader
    ? (gdp * HAGUE_BROADER_PCT * (1 - p.dualUseShare)) / 100
    : 0;
  const increment2035 = incrementCore + incrementBroader;

  // Linear ramp: 0 of the increment in 2025, all of it in 2035.
  const incrementSeries = RAMP_YEARS.map(
    (y) => increment2035 * ((y - RAMP_START) / (RAMP_END - RAMP_START)),
  );
  const displacedSeries = incrementSeries.map((v) => v * p.crowdOut);

  const displaced2035 = increment2035 * p.crowdOut;
  const displacedCumulative = displacedSeries.reduce((a, b) => a + b, 0);
  const delayYears = displacedCumulative / CURRENT_CLIMATE_INVEST_BN;

  const need = needById(p.needId);
  const gapWithoutLo = need.gapComputable ? need.lo - CURRENT_CLIMATE_INVEST_BN : null;
  const gapWithoutHi = need.gapComputable ? need.hi - CURRENT_CLIMATE_INVEST_BN : null;

  return {
    incrementCore,
    incrementBroader,
    increment2035,
    displaced2035,
    displacedSeries,
    incrementSeries,
    displacedCumulative,
    delayYears,
    need,
    gapWithoutLo,
    gapWithoutHi,
    gapWithLo: gapWithoutLo === null ? null : gapWithoutLo + displaced2035,
    gapWithHi: gapWithoutHi === null ? null : gapWithoutHi + displaced2035,
  };
}
