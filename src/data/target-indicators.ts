/**
 * M·53 Policy Targets → Indicators — typed model and display metadata.
 * --------------------------------------------------------------------------
 * The assessment ledger that sits on top of the M·36 Policy Targets Register
 * (src/data/policy-targets.ts). M·36 answers "what does EU climate law actually
 * require, verbatim?"; this dataset answers the follow-up the Policy Gap report
 * needs: "and how do we measure whether it is being met?".
 *
 * One row per RELEVANT, UNFLAGGED M·36 target — the register's own transition
 * lens, minus the rows the August 2026 review pass flagged "revise target"
 * (likely not targets under the reviewers' NT-7..NT-15 rules). Both calls are
 * inherited from the register, not re-made here. Each in-scope target is
 * assigned to one of three assessment routes:
 *
 *   'series'    a curated MethodHub time series already measures the target;
 *   'dataset'   no curated series yet, but the indicator is specified against a
 *               named public dataset (provider, dataset code, URL);
 *   'milestone' the target names no measurable state of the world (adopt a plan,
 *               submit a report), so it is assessed as compliance with the act's
 *               own deadline.
 *
 * There is deliberately no fourth "not assessed" route: the build script
 * (scripts/build-target-indicators.mjs) exits non-zero if any in-scope target
 * ends without one, which is what makes the claim "every relevant unflagged
 * target was systematically assessed" checkable rather than rhetorical.
 *
 * What the dataset does NOT claim: that a linked series is the *best* measure of
 * a target, or that a 'dataset' route has been pulled. Route and family are a
 * mapping proposal produced by a deterministic vocabulary; `confidence` says how
 * much of each match rests on the target's own wording rather than the act's
 * title, and every row carries the exact terms that fired.
 *
 * AI-compiled — pending Secretariat verification.
 */
import { policyTargets, type PolicyTarget, type SectorKey } from './policy-targets';
import { RAW_FAMILIES, RAW_TARGET_ASSESSMENTS } from './target-indicators.generated';

/** How a target is measured. See the file header for the definitions. */
export type AssessmentRoute = 'series' | 'dataset' | 'milestone';
/** How much of the family match rests on the target's own wording. */
export type MatchConfidence = 'strong' | 'moderate' | 'weak' | 'reviewed';
/** Row of the flow chart the target is drawn on. */
export type Rung = 'outcome' | 'lever' | 'enabling';

/** A measurable concept, and what measures it. */
export interface MeasurementFamily {
  key: string;
  label: string;
  unit: string;
  /** One of the eight M·36 sectors, or 'cross-cutting'. */
  sector: string;
  direction: 'up' | 'down' | 'context';
  /** Curated MethodHub series measuring this family (validated at build time). */
  indicator_ids: string[];
  /** The primary public dataset the series is — or would be — built from. */
  dataset: { name: string; url: string };
}

export interface RawTargetAssessment {
  /** M·36 target id (stable content hash). */
  id: string;
  policy_id: string;
  /** Card label: the provision heading, or the opening clause of the quote. */
  label: string;
  rung: Rung;
  route: AssessmentRoute;
  confidence: MatchConfidence;
  /** Measurement families, best fit first. */
  families: string[];
  /** Curated indicator ids across those families, de-duplicated. */
  indicator_ids: string[];
  /** The terms that fired each family, for auditability. */
  evidence: Record<string, string[]>;
  /** Prose reason when an override touched this row; '' otherwise. */
  override_reason: string;
}

/** An assessment joined to the M·36 target it assesses. */
export interface TargetAssessment extends RawTargetAssessment {
  target: PolicyTarget;
  /** Sector columns the card is drawn in — the target's own M·36 sectors, or
   *  ['cross-cutting'] when it carries none. */
  columns: FlowColumnKey[];
}

export type FlowColumnKey = SectorKey | 'cross-cutting';

export const FAMILIES: MeasurementFamily[] = RAW_FAMILIES;
export const FAMILY_BY_KEY: Record<string, MeasurementFamily> = Object.fromEntries(
  FAMILIES.map((f) => [f.key, f]),
);

/** The milestone route's pseudo-family, so the UI can render it like any other. */
export const MILESTONE_FAMILY_KEY = 'compliance-milestone';

// ─── Join ───────────────────────────────────────────────────────────────────
const TARGET_BY_ID: Record<string, PolicyTarget> = Object.fromEntries(
  policyTargets.map((t) => [t.id, t]),
);

/**
 * Rows whose target id no longer resolves in the register — only possible if
 * M·36 was rebuilt without rebuilding this dataset. Surfaced in the UI as an
 * error rather than silently shortening the list, because a quietly shorter
 * ledger is exactly the failure this module exists to rule out.
 */
export const ORPHANED_ASSESSMENTS: string[] = RAW_TARGET_ASSESSMENTS
  .filter((a) => !TARGET_BY_ID[a.id])
  .map((a) => a.id);

/** In-scope targets in M·36 (relevant and not revise-flagged) that carry no
 *  assessment row — must be empty. */
export const UNASSESSED_TARGETS: string[] = policyTargets
  .filter((t) => t.relevant && !t.revise_flag && !RAW_TARGET_ASSESSMENTS.some((a) => a.id === t.id))
  .map((t) => t.id);

export const targetAssessments: TargetAssessment[] = RAW_TARGET_ASSESSMENTS
  .filter((a) => TARGET_BY_ID[a.id])
  .map((a) => {
    const target = TARGET_BY_ID[a.id];
    const columns: FlowColumnKey[] = target.sectors.length ? [...target.sectors] : ['cross-cutting'];
    return { ...a, target, columns };
  });

// ─── Display metadata ───────────────────────────────────────────────────────
/**
 * Route palette. Blue / amber / purple rather than a green-to-red ramp: the
 * three routes are different KINDS of assessment, not a quality ladder, and the
 * palette must not read as good-to-bad. Every chip also carries its text label,
 * so colour never carries the meaning alone (CVD-safe).
 */
export const ROUTE_META: Record<AssessmentRoute, {
  label: string; short: string; color: string; bg: string; description: string;
}> = {
  series: {
    label: 'Measured by a curated series',
    short: 'Series',
    color: '#0065A4',
    bg: '#EAF3F9',
    description:
      'A time series already curated in MethodHub tracks this target. Progress can be read off today.',
  },
  dataset: {
    label: 'Indicator specified, series not yet built',
    short: 'Specified',
    color: '#E0701A',
    bg: '#FDF2E7',
    description:
      'No curated series covers this target yet. The indicator is specified against a named public '
      + 'dataset — provider, dataset code and URL — so building it is a pull, not a research project. '
      + 'This is the measurement gap the Policy Gap report should name.',
  },
  milestone: {
    label: 'Assessed as a compliance milestone',
    short: 'Milestone',
    color: '#6667AB',
    bg: '#EFEFF7',
    description:
      'The target names no measurable state of the world — it requires an institution to act by a date. '
      + 'It is assessed as done / not done against the act\'s own deadline, not with a statistical series.',
  },
};

export const CONFIDENCE_META: Record<MatchConfidence, { label: string; note: string }> = {
  strong: { label: 'Strong match', note: 'A defining term fired inside the target\'s own wording.' },
  moderate: { label: 'Moderate match', note: 'Supporting terms fired inside the target\'s own wording.' },
  weak: {
    label: 'Weak match — review first',
    note: 'The match rests on the provision heading or the act\'s title rather than the target text. '
      + 'These rows are the first a reviewer should challenge.',
  },
  reviewed: { label: 'Set by review', note: 'Assigned by hand in the overrides file, with a recorded reason.' },
};

export const RUNG_META: Record<Rung, { label: string; description: string; color: string }> = {
  outcome: {
    label: 'First-order targets',
    description: 'The overall change the act exists to achieve (M·36 first-order targets).',
    color: '#4E8595',
  },
  lever: {
    label: 'Second-order targets',
    description: 'Targets that narrow, implement or complement a headline target.',
    color: '#9E4A46',
  },
  enabling: {
    label: 'Procedural obligations',
    description: 'Duties to act by a date rather than to reach a state — assessed as milestones.',
    color: '#C9B83F',
  },
};

// ─── Stats ──────────────────────────────────────────────────────────────────
export interface CoverageStats {
  /** Relevant targets assessed. */
  total: number;
  /** Acts behind them. */
  policies: number;
  byRoute: Record<AssessmentRoute, number>;
  byConfidence: Record<MatchConfidence, number>;
  byRung: Record<Rung, number>;
  /** Distinct curated indicator series doing the measuring. */
  indicators: number;
  /** Distinct measurement families in use. */
  families: number;
  /** Families that measure nothing in the register — measurement capacity with
   *  no legal target attached to it. */
  unusedFamilies: string[];
  /** Rows carrying a recorded override reason. */
  overridden: number;
}

export function computeCoverage(rows: TargetAssessment[]): CoverageStats {
  const byRoute: Record<AssessmentRoute, number> = { series: 0, dataset: 0, milestone: 0 };
  const byConfidence: Record<MatchConfidence, number> = { strong: 0, moderate: 0, weak: 0, reviewed: 0 };
  const byRung: Record<Rung, number> = { outcome: 0, lever: 0, enabling: 0 };
  const policies = new Set<string>();
  const indicators = new Set<string>();
  const families = new Set<string>();
  let overridden = 0;
  for (const r of rows) {
    byRoute[r.route]++;
    byConfidence[r.confidence]++;
    byRung[r.rung]++;
    policies.add(r.policy_id);
    for (const id of r.indicator_ids) indicators.add(id);
    for (const k of r.families) families.add(k);
    if (r.override_reason) overridden++;
  }
  const unusedFamilies = FAMILIES.filter((f) => f.key !== MILESTONE_FAMILY_KEY && !families.has(f.key))
    .map((f) => f.key);
  return {
    total: rows.length,
    policies: policies.size,
    byRoute,
    byConfidence,
    byRung,
    indicators: indicators.size,
    families: families.size,
    unusedFamilies,
    overridden,
  };
}
