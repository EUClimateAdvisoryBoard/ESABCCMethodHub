// ---------------------------------------------------------------------------
// Policy Coherence 2.0 — beta block-level coherence model.
//
// Where the four-step coherence model (policy-coherence.ts) grades each ACT
// as one unit, Policy Coherence 2.0 takes the actual policy texts shipped
// with the corpus and re-runs the same four lenses sentence by sentence:
// every text is split into structural blocks (recitals, articles, headings)
// and each block into atomic sentence UNITS. Each unit stays addressable on
// its own — stable id, structural path ("Article 4(3)"), char offsets — but
// remains anchored in the bigger policy file, so findings can quote the
// exact provision and machines can re-join units back into full documents.
//
// From every unit a set of typed CLAIMS is extracted by declared, rule-based
// extractors (targets, deadlines, deontic obligations, instruments,
// financing, monitoring, review clauses, flexibility markers, cross-
// references). Findings — within-policy and cross-policy inconsistencies,
// orphan goals, unmeasurable targets, discretion loopholes — follow
// mechanically from declared rules applied to those claims, in the same
// rule-based spirit as the act-level model. The full run (units + claims +
// findings) is persisted to Supabase so the blocks become a durable,
// referenceable substrate for downstream machine-learning extraction.
// ---------------------------------------------------------------------------

import type { CoherenceStepId, EvidenceTier } from '../content-analysis/policy-coherence';
import type { BlockKind } from '../content-analysis/types';

// ── Units ──────────────────────────────────────────────────────────────────

/** An atomic sentence-level slice of a policy text. Modular (stable id,
 *  own offsets) but part of the bigger file (policyId + blockId + path). */
export interface Pc2Unit {
  /** Deterministic id: `u-<policyId>-b<blockOrder>-s<unitIndex>`. */
  id: string;
  policyId: string;
  /** Same id space as the content-analysis blocks: `block-<policyId>-<order>`. */
  blockId: string;
  blockKind: BlockKind;
  blockOrder: number;
  /** 0-indexed position of the unit inside its block. */
  unitIndex: number;
  /** Structural address — "Recital (12)", "Article 4 — …", "Preamble"… */
  path: string;
  /** Char offsets of the unit inside its block's text. */
  startChar: number;
  endChar: number;
  text: string;
  /** Which of the four coherence steps this unit feeds. */
  stepIds: CoherenceStepId[];
  claims: Pc2Claim[];
}

// ── Claims ─────────────────────────────────────────────────────────────────

export type Pc2ClaimKind =
  | 'target'      // quantified objective (value + indicator family + year)
  | 'deadline'    // dated obligation ("by 31 December 2030", "no later than…")
  | 'obligation'  // deontic clause, with strength (shall/must > should > may)
  | 'instrument'  // delivery mechanism (allowances, standards, penalties…)
  | 'financing'   // money clause (amounts, revenues, funds)
  | 'monitoring'  // MRV clause (report, monitor, verify, inventory)
  | 'review'      // review / revision clause
  | 'flexibility' // discretion marker (derogation, exemption, "where appropriate"…)
  | 'crossref';   // reference to another legal act

/** Indicator family of a quantified target — the comparability key used by
 *  the conflict rules (only same-family targets are ever compared). */
export type Pc2TargetFamily =
  | 'ghg'         // greenhouse-gas reduction
  | 'renewables'  // renewable-energy share
  | 'efficiency'  // energy consumption / efficiency
  | 'removals'    // sinks / LULUCF removals
  | 'vehicles'    // fleet CO₂ / zero-emission vehicles
  | 'neutrality'  // climate-neutrality / net-zero commitments
  | 'other';

/** Deontic strength: 3 shall/must · 2 should · 1 may/aim/endeavour · 0 none. */
export type Pc2DeonticStrength = 0 | 1 | 2 | 3;

export interface Pc2Claim {
  kind: Pc2ClaimKind;
  /** Verbatim excerpt that triggered the extractor (≤ 240 chars). */
  excerpt: string;
  /** Human-readable reading of the claim. */
  detail: string;
  // — structured fields (kind-dependent) —
  value?: number;
  unit?: string;
  year?: number;
  baselineYear?: number;
  family?: Pc2TargetFamily;
  strength?: Pc2DeonticStrength;
  /** Normalised cross-reference key, e.g. "R:2021/1119" / "L:2003/87". */
  refKey?: string;
  /** Corpus policy id the reference resolves to; null when outside corpus. */
  resolvedPolicyId?: string | null;
  /** Matched flexibility / instrument markers. */
  markers?: string[];
}

// ── Findings ───────────────────────────────────────────────────────────────

export type Pc2RuleId =
  | 'pc2-internal-target-conflict'
  | 'pc2-cross-target-divergence'
  | 'pc2-orphan-goal'
  | 'pc2-unmeasurable-target'
  | 'pc2-undated-target'
  | 'pc2-soft-target'
  | 'pc2-discretion-cluster'
  | 'pc2-dangling-crossref'
  | 'pc2-curated-counteraction'
  | 'pc2-ex-ante-status';

export type Pc2Severity = 'high' | 'medium' | 'low' | 'info';
export type Pc2Scope = 'within-policy' | 'cross-policy';

/** Declared rule — printed in the UI so reviewers audit rule applications,
 *  not vibes (same provenance ethos as the act-level model). */
export interface Pc2RuleMeta {
  id: Pc2RuleId;
  name: string;
  stepId: CoherenceStepId;
  scope: Pc2Scope;
  defaultSeverity: Pc2Severity;
  /** The mechanical rule, stated so its application can be re-checked. */
  rule: string;
}

export interface Pc2Evidence {
  policyId: string;
  unitId: string;
  path: string;
  quote: string;
}

export interface Pc2Finding {
  /** Deterministic id, stable across runs over the same corpus. */
  id: string;
  ruleId: Pc2RuleId;
  stepId: CoherenceStepId;
  severity: Pc2Severity;
  scope: Pc2Scope;
  policyIds: string[];
  unitIds: string[];
  title: string;
  detail: string;
  evidence: Pc2Evidence[];
  tier?: EvidenceTier;
}

// ── Run / per-policy roll-up ───────────────────────────────────────────────

export interface Pc2PolicyAnalysis {
  policyId: string;
  shortTitle: string;
  documentType: string;
  celexNumber: string | null;
  blockCount: number;
  unitCount: number;
  claimCount: number;
  targetUnits: number;
  meansUnits: number;       // instrument + financing units
  monitoringUnits: number;
  reviewUnits: number;
  flexibilityUnits: number;
  crossrefUnits: number;
  /** Means units per target unit — block-level goals↔means density. */
  meansPerTarget: number | null;
  /** Flexibility units / total units — discretion density. */
  flexDensity: number;
  findingCount: number;
}

export interface Pc2Stats {
  policyCount: number;
  blockCount: number;
  unitCount: number;
  claimCount: number;
  findingCount: number;
  bySeverity: Record<Pc2Severity, number>;
  byRule: Partial<Record<Pc2RuleId, number>>;
  byStep: Record<CoherenceStepId, number>;
}

export interface Pc2Run {
  engineVersion: string;
  corpusHash: string;
  generatedAt: string;
  policies: Pc2PolicyAnalysis[];
  units: Pc2Unit[];
  findings: Pc2Finding[];
  stats: Pc2Stats;
}
