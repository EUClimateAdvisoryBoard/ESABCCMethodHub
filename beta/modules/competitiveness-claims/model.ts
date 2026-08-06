/**
 * Competitiveness Claims Register (beta module M · 47) — verdict
 * aggregation helpers. Pure functions over the generated register so the
 * balance arithmetic shown in the UI is reproducible and testable.
 */

import type { Claim, Direction, Topic, Verdict } from './data.generated';

export const VERDICT_ORDER: Verdict[] = ['SUPPORTED', 'REVISION', 'UNSUPPORTED', 'NOT_CHECKABLE'];

export const VERDICT_META: Record<
  Verdict,
  { label: string; short: string; badge: string; dot: string; definition: string }
> = {
  SUPPORTED: {
    label: 'Supported',
    short: 'SUP',
    badge: 'bg-surface-green text-secondary-dark border border-secondary/40',
    dot: 'bg-secondary',
    definition: 'The proposition matches the checked evidence (within ≈2 % for quantities).',
  },
  REVISION: {
    label: 'Revision',
    short: 'REV',
    badge: 'bg-surface-orange text-tertiary-dark border border-accent-orange/60',
    dot: 'bg-accent-orange',
    definition: 'Directionally right, but the number or the scope is wrong (right order, wrong number).',
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    short: 'UNS',
    badge: 'bg-accent-red/10 text-accent-red border border-accent-red/40',
    dot: 'bg-accent-red',
    definition: 'The checked evidence contradicts the proposition, or the inference is invalid as stated.',
  },
  NOT_CHECKABLE: {
    label: 'Not checkable',
    short: 'N/C',
    badge: 'bg-grey-100 text-tertiary border border-grey-300',
    dot: 'bg-grey-400',
    definition: 'No decisive evidence can exist yet — ex-ante estimates, counterfactuals, intent.',
  },
};

export const DIRECTION_META: Record<Direction, { label: string; sub: string }> = {
  'against-ambition': {
    label: 'Against ambition',
    sub: 'Claims deployed against regulatory or climate ambition',
  },
  'for-ambition': {
    label: 'For ambition',
    sub: 'Claims deployed in defence of regulatory or climate ambition',
  },
};

export const TOPIC_META: Record<Topic, string> = {
  'energy-prices': 'Energy prices',
  'regulatory-burden': 'Regulatory burden',
  'ets-leakage': 'ETS & leakage',
  omnibus: 'Omnibus',
  'growth-and-jobs': 'Growth & jobs',
};

export type VerdictTally = Record<Verdict, number>;

export function emptyTally(): VerdictTally {
  return { SUPPORTED: 0, REVISION: 0, UNSUPPORTED: 0, NOT_CHECKABLE: 0 };
}

/** Proposition-level verdict counts for a set of claims. */
export function tallyVerdicts(claims: Claim[]): VerdictTally {
  const t = emptyTally();
  for (const c of claims) for (const p of c.propositions) t[p.verdict] += 1;
  return t;
}

/** Verdict counts split by claim direction — the balance strip. */
export function tallyByDirection(claims: Claim[]): Record<Direction, VerdictTally> {
  return {
    'against-ambition': tallyVerdicts(claims.filter((c) => c.direction === 'against-ambition')),
    'for-ambition': tallyVerdicts(claims.filter((c) => c.direction === 'for-ambition')),
  };
}

export function propositionCount(claims: Claim[]): number {
  return claims.reduce((n, c) => n + c.propositions.length, 0);
}

export function steelmanCount(claims: Claim[]): number {
  return claims.filter((c) => c.steelman).length;
}

/**
 * Integrity check for the mandatory steel-man rule: every claim with an
 * UNSUPPORTED proposition must carry a steelman. Returns offending ids
 * (empty on a healthy register); surfaced in the UI rather than silently
 * ignored, per the loud-failure ground rule.
 */
export function missingSteelmen(claims: Claim[]): string[] {
  return claims
    .filter((c) => c.propositions.some((p) => p.verdict === 'UNSUPPORTED') && !c.steelman)
    .map((c) => c.id);
}

export interface ClaimFilters {
  direction: Direction | 'all';
  verdict: Verdict | 'all';
  topic: Topic | 'all';
}

/** A claim passes the verdict filter if ANY of its propositions carries it. */
export function filterClaims(claims: Claim[], f: ClaimFilters): Claim[] {
  return claims.filter(
    (c) =>
      (f.direction === 'all' || c.direction === f.direction) &&
      (f.topic === 'all' || c.topic === f.topic) &&
      (f.verdict === 'all' || c.propositions.some((p) => p.verdict === f.verdict)),
  );
}
