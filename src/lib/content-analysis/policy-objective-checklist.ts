// ---------------------------------------------------------------------------
// Per-policy objective–delivery checklist — AI-generated baseline.
//
// Where policy-master-tags.ts answers "what is this act ABOUT?", this file
// answers "can this act DELIVER its own stated objective?". Every tracked
// policy is scored against the twelve `check-*` criteria seeded under
// `root-assessment` in ./seed.ts (objective clarity, quantified targets,
// instrument sufficiency, Climate Law consistency for neutrality and
// adaptation, …). Each entry carries a VERDICT:
//
//   met            — the criterion is satisfied; evidence cited.
//   partial        — provisions exist but with a material gap (named).
//   not-met        — missing relative to the act's own objective — these are
//                    the objective–content inconsistencies the checklist
//                    exists to surface.
//   not-applicable — the criterion has no purchase on this act (used
//                    sparingly: an act that plausibly affects emissions or
//                    resilience but is silent scores not-met, not n.a.).
//
// Verdicts were authored by a fleet of analysis agents reading each policy's
// title, summary and shipped full text (src/data/policies.ts), mirroring the
// ESABCC consistency assessments mandated by Climate Law Arts. 5–7. Like the
// master tags, every verdict starts life as an AI assessment; reviewers
// confirm entries they agree with via the shared master-tag-status flow
// (the (policyId, codeId) key space is reused unchanged).
//
// This block is machine-assisted: prefer re-running the assessment agents
// over the criteria rubric + policy corpus rather than hand-editing verdicts.
// ---------------------------------------------------------------------------

import type { TagOrigin } from './policy-master-tags';

/** Fulfilment verdict for one checklist criterion on one policy. */
export type ChecklistVerdict = 'met' | 'partial' | 'not-met' | 'not-applicable';

/** One criterion verdict on a policy, with provenance + evidence. */
export interface PolicyChecklistEntry {
  /** A `check-*` code id from the `root-assessment` branch in seed.ts. */
  codeId: string;
  verdict: ChecklistVerdict;
  /** Model confidence in [0, 1]; lower when only a summary was available. */
  confidence?: number;
  /** Evidence-grounded justification, citing articles/recitals when possible. */
  rationale: string;
  /** `'ai'` baseline; promoted to `'human'` via master-tag-status confirms. */
  origin?: TagOrigin;
}

/** The twelve criteria, in assessment order (matches the seed branch). */
export const CHECKLIST_CODE_IDS = [
  'check-objective',
  'check-target-quant',
  'check-timeline',
  'check-instruments',
  'check-coverage',
  'check-monitoring',
  'check-enforcement',
  'check-financing',
  'check-cons-neutrality',
  'check-cons-adaptation',
  'check-just-transition',
  'check-review',
] as const;

/** Keys are Policy.id values from `@/data/policies`. */
export const POLICY_OBJECTIVE_CHECKLISTS: Record<string, PolicyChecklistEntry[]> = {
};

/** The checklist for one policy (empty array if not yet assessed). */
export function getPolicyChecklist(policyId: string): PolicyChecklistEntry[] {
  return POLICY_OBJECTIVE_CHECKLISTS[policyId] ?? [];
}

export interface ChecklistSummary {
  met: number;
  partial: number;
  notMet: number;
  notApplicable: number;
  /** Criteria with purchase on this act (total minus n.a.). */
  applicable: number;
  /** met + ½·partial over applicable criteria, in [0, 1]; null if none. */
  score: number | null;
}

/** Roll one policy's verdicts up into counts + a deliverability score. */
export function summarizeChecklist(entries: PolicyChecklistEntry[]): ChecklistSummary {
  const s = { met: 0, partial: 0, notMet: 0, notApplicable: 0 };
  for (const e of entries) {
    if (e.verdict === 'met') s.met++;
    else if (e.verdict === 'partial') s.partial++;
    else if (e.verdict === 'not-met') s.notMet++;
    else s.notApplicable++;
  }
  const applicable = s.met + s.partial + s.notMet;
  return {
    ...s,
    applicable,
    score: applicable > 0 ? (s.met + 0.5 * s.partial) / applicable : null,
  };
}
