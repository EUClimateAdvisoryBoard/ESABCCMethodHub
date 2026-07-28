# WP3 — Conflict identification, classification and severity ranking

*Read WP0 first. Inputs: `advice-core.ts`, `advice-wider.ts`,
`package-positions.ts`. Output: `conflicts.ts` exporting
`CONFLICTS: ConflictFinding[]` plus ranking helpers.*

## Goal

Cross the advice corpus against the package positions and produce the finding
set: every material misalignment, classified
(`contradiction` / `tension` / `ambition-gap`), scored on the four-axis rubric
in `types.ts`, plus genuine `alignment` findings for balance. The ranking *is*
the deliverable — the severity scores must be defensible axis by axis.

## Method

1. Read the three input files fully. Build a theme-by-theme cross-map first
   (which advice positions and package positions share a theme), then write
   findings only where the quoted evidence on both sides actually supports
   one.
2. **Candidate conflict hypotheses to test** (test — do not assume; keep only
   those the quotes support, and adjust kind/scoring to the evidence):
   - H1 Cap ambition: package delivers ~85–87% (external estimate ~80%) by
     2040 vs the Board's advised 90–95% domestic reduction and 11–14 Gt
     budget.
   - H2 International credits: ~260 Mt inside the system vs the Board's
     domestic-only delivery advice.
   - H3 Removals above the cap + net/gross ambiguity vs the Board's separate
     targets for reductions and removals and its fungibility warnings.
   - H4 Removal delivery risk (revenue-driven, "may simply not be met") vs the
     Board's advice that removals must not substitute for reductions unless
     robustly guaranteed (permanence, liability, MRV).
   - H5 LRF backloading (3.7%→1.7%) vs the Board's cumulative-budget / early
     action logic.
   - H6 Free allocation continuation & CBAM interaction vs polluter-pays /
     fossil-subsidy phase-out advice.
   - H7 Aviation scope (≤5,000 km only, 2032 CORSIA revert; maritime pots) vs
     full-pricing advice.
   - H8 46% electrification target vs the Board's scenario range (~50–54% by
     2040) — likely `ambition-gap`.
   - H9 Indicative-only target + Q4 2026 legislation deferral vs the Board's
     governance/bindingness advice.
   - H10 Price-only reliance vs demand-side measures / efficiency-first advice
     (note the package's own IA supports the measures case — this may be
     tension *within* the package worth recording).
   - H11 Waste incineration inclusion vs advice to extend pricing — likely
     `alignment` with a data-quality tension.
   - H12 MSR reform toward a stable rising price — check advice on price
     signals; possibly `alignment`.
   - H13 IDB / revenue use vs investment-support advice — possibly
     `alignment`.
   - H14 2033-review conditionality (credits) as governance risk vs advice on
     ratchets and certainty.
   Add any further findings the corpus supports that are not on this list, and
   drop any hypothesis the evidence does not carry.
3. **Classification**: per `CONFLICT_KIND_META` definitions. If in doubt
   between contradiction and tension, ask: did the Board explicitly advise
   against this design (contradiction) or merely require a safeguard the
   package lacks (tension)?
4. **Scoring**: use the written anchors in `SEVERITY_AXES` — every axis score
   must cite its anchor logic in `scoreRationale` (one sentence each, with the
   number/quote that justifies it, e.g. magnitude 3 because ~260 Mt credits ≈
   2% of the advised 11–14 Gt budget…). Do not cluster everything at 2–3;
   differentiate honestly.
5. **Reasoning chains** (`reasoning`): 3–6 numbered steps: what the advice
   says (with position id) → what the package does (with position id) → why
   that is a conflict/alignment of this kind → what the severity turns on.
6. Expected volume: **10–16 conflict findings + 3–6 alignments**. Merge
   near-duplicates; one finding per genuinely distinct conflict.

## File shape

```ts
import { severityScore, severityTier, type ConflictFinding } from './types';
/** …header per WP0 convention 6… */
export const CONFLICTS: ConflictFinding[] = [ /* … */ ];

/** Conflicts only (kind !== 'alignment'), sorted by severityScore desc. */
export function rankedConflicts(): ConflictFinding[] { /* … */ }
/** Alignments, sorted by severityScore desc (interpreted as strength). */
export function alignments(): ConflictFinding[] { /* … */ }
```

## Definition of done

- Typechecks; every `packageIds`/`adviceIds` id resolves in the input files;
  ≥1 id per side per finding; every finding has all four rationale sentences;
  ranking helpers deterministic (stable tie-break by id). Header notes
  AI-assembled, pending verification.
