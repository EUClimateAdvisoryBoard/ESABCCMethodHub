/**
 * Trade-Partner Climate Policy & Article 6 Tracker — deterministic model
 * (beta module M · 52).
 *
 * All arithmetic for the credibility-band view lives here so it is
 * reproducible and testable: the demand anchor (≈260 Mt cumulative
 * international credits over 2036–40, per the ETS Phase-5 proposal
 * COM(2026) 616 — 2 % of the cap, contingent on a 2033 availability
 * review), the integrity-haircut arithmetic echoing the safety-valve
 * logic of M · 26 (ETS Endgame & CDR Safety Valve), and the status
 * vocabulary metadata. No fetches, no randomness, no agent judgement —
 * classification and arithmetic are deterministic functions of the
 * snapshot in data.generated.ts.
 *
 * AI-compiled — pending Secretariat verification (see data.generated.ts
 * for the provenance block).
 */

import { PARTNERS, Partner, PolicyStatus, StatusCell, SUPPLY_TIERS } from './data.generated';

/* ------------------------------------------------------ demand anchor */

/**
 * ≈260 Mt cumulative over 2036–40: the ETS share (2 % of the cap) of the
 * Climate Law's 5 % international-flexibility allowance, as proposed in
 * COM(2026) 616. Contingent on the 2033 availability review — if that
 * review fails, the 2036–40 LRF reverts from 1.7 % to 2.7 % instead.
 */
export const DEMAND_MT = 260;

/** Default integrity haircut. M · 26 uses 10 % (default) to 20 % (authors'
 *  recommendation) for ETS-internal permanent CDR; international credits
 *  carry higher non-additionality, baseline and corresponding-adjustment
 *  risk, so the default here is deliberately heavier. */
export const DEFAULT_HAIRCUT = 0.5;

/* ----------------------------------------------------- status metadata */

/** Deterministic vocabulary metadata — display labels and rank order. */
export const STATUS_META: Record<PolicyStatus, { label: string; rank: number }> = {
  'in-force': { label: 'in force', rank: 0 },
  adopted: { label: 'adopted', rank: 1 },
  proposed: { label: 'proposed', rank: 2 },
  'rolled-back': { label: 'rolled back', rank: 3 },
  none: { label: 'none', rank: 4 },
};

export type Dimension = 'carbonPrice' | 'ndc2035' | 'cbam' | 'linkage';

export function cell(p: Partner, dim: Dimension): StatusCell {
  return p[dim];
}

/** Count partners whose cell on a dimension carries a given status. */
export function statusCount(dim: Dimension, status: PolicyStatus): number {
  return PARTNERS.filter((p) => p[dim].status === status).length;
}

/** Count of cells flagged uncertain across the whole register. */
export function uncertainCellCount(): number {
  const dims: Dimension[] = ['carbonPrice', 'ndc2035', 'cbam', 'linkage'];
  return PARTNERS.reduce((n, p) => n + dims.filter((d) => p[d].uncertain).length, 0);
}

/* ------------------------------------------------- credibility band */

export interface SupplyBand {
  /** Plausible cumulative supply at quality, Mt, after the haircut. */
  lo: number;
  hi: number;
  /** Fractions of the 260 Mt demand covered at each end of the band. */
  coverageLo: number;
  coverageHi: number;
  /** Shortfall against demand (positive = shortfall), Mt, at each end. */
  gapAtHi: number;
  gapAtLo: number;
}

/**
 * Plausible-supply-at-quality band. The low end is the low end of
 * announced host authorisations; the high end takes authorisations plus
 * the face-value pipeline tier (which is defined as additional to the
 * authorised tier in data.generated.ts). Both ends are then discounted
 * by the integrity haircut h — one authorised tonne counts as (1 − h)
 * tonnes of quality-assured compliance, the same discount logic the
 * safety valve of M · 26 applies to CDR certificates.
 */
export function supplyAtQuality(haircut: number): SupplyBand {
  const h = Math.min(Math.max(haircut, 0), 0.95);
  const lo = SUPPLY_TIERS.authorised.range[0] * (1 - h);
  const hi = (SUPPLY_TIERS.authorised.range[1] + SUPPLY_TIERS.pipeline.range[1]) * (1 - h);
  return {
    lo,
    hi,
    coverageLo: lo / DEMAND_MT,
    coverageHi: hi / DEMAND_MT,
    gapAtHi: DEMAND_MT - hi,
    gapAtLo: DEMAND_MT - lo,
  };
}

export type Verdict = 'shortfall' | 'straddles' | 'covered';

/** Deterministic reading of the band against demand. */
export function verdict(band: SupplyBand): Verdict {
  if (band.hi < DEMAND_MT) return 'shortfall';
  if (band.lo >= DEMAND_MT) return 'covered';
  return 'straddles';
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  shortfall: 'Even the face-value top of the pipeline falls short of the ≈260 Mt demand at this haircut.',
  straddles:
    'The band straddles the ≈260 Mt demand: only the speculative top of the pipeline covers it, while everything authorised today covers a few per cent at most.',
  covered: 'The whole band clears the ≈260 Mt demand at this haircut — which should raise suspicion about the face-value pipeline tier, not comfort.',
};

/* --------------------------------------------------------- formatting */

export const fmt = (n: number, d = 0): string =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Format an order-of-magnitude [lo, hi] Mt range for display. */
export function fmtRange([lo, hi]: [number, number]): string {
  if (lo === 0 && hi === 0) return '0';
  const f = (v: number) => (v > 0 && v < 1 ? `${fmt(v, v < 0.1 ? 2 : 1)}` : fmt(v));
  return lo === hi ? `≈${f(lo)}` : `≈${f(lo)}–${f(hi)}`;
}
