# WP5 — Policy Gap Tracker & Policy Gaps — Transport & Industry (Note 3)

Read first: `audits/audit-policygaps.md` (finding numbers refer to it) and the shared protocol +
dark-mode mapping table in `README.md`. This side had NOT had a fact-check pass before — it has
the real factual errors of this review.

**Mission:** fix the factual errors (report date, legislation status), the Maritime blind spot,
the export mismatches, and the tracker UX/a11y gaps.

**Write-set (edit nothing else):**
- `beta/modules/policy-gaps/page.tsx`
- `beta/modules/summer-prep/policy-gaps-sectors/page.tsx`
- `src/data/policy-gaps.ts`
- `src/data/summer-prep-sector-gaps.ts`

## P0 — must do

1. **(Finding #4 / Improvement 1)** Fix the report-baseline date everywhere: the ESABCC report
   published **18 January 2024**, and `GAP_REPORT_META.published = 'January 2024'` is correct —
   but `src/data/policy-gaps.ts:66`, `beta/modules/policy-gaps/page.tsx:267` ("Open (Jan
   2025)" in the Excel export) and `:717` say Jan/January 2025. Correct all three to 2024. Then
   `grep -rn "2025" src/data/policy-gaps.ts beta/modules/policy-gaps/page.tsx` and check no
   other baseline-date instance remains (leave genuine 2025 policy dates alone).
2. **(Finding #1, MAJOR)** `src/data/summer-prep-sector-gaps.ts:82` — Combined Transport
   Directive: replace "still in negotiation and delivery mechanisms are unproven" with the real
   status: Commission moved to withdraw the recast in late 2025; Parliament rejected the
   withdrawal (Jan 2026); Council stalled with no agreed text as of mid-2026 — ambition gap
   unresolved and the file's survival itself in question. Add the audit's two source URLs in
   the entry's source field per file convention.
3. **(Finding #2, MAJOR)** `src/data/summer-prep-sector-gaps.ts:133-136`
   (`cand-steel-lead-market`): rename "Industrial Decarbonisation Accelerator Act" → "Industrial
   Accelerator Act" and update the test: a draft was tabled 4 March 2026 with Made-in-EU /
   low-carbon procurement content — the gap is "policy proposed, not yet enacted", no longer a
   purely hypothetical future test. Sources per audit.
4. **(Finding #3, MAJOR)** `src/data/summer-prep-sector-gaps.ts:102` — Union Database for
   Biofuels: soften "mandatory from 2024" to operational since January 2024 with the binding
   mandatory-use/sanctions date still pending agreement with Member States as of 2025–26; keep
   the "partially-addressed" verdict.
5. **(Finding #15, MAJOR)** Empty Maritime row in the Transport landscape matrix. Implement
   BOTH halves:
   a. Give reassessments/candidates an optional `alsoSubsectors?: string[]` field in
      `summer-prep-sector-gaps.ts`; set it to `['Maritime']` on `transport-extra-eu-exemption`
      (whose note already says "(also applies to Maritime)"); count `alsoSubsectors` rows into
      the matrix cells in `policy-gaps-sectors/page.tsx`.
   b. Add one Maritime candidate gap grounded in the audit's pointer (FuelEU Maritime open
      questions: biofuel/RFNBO availability, well-to-wake accounting, port infrastructure) —
      keep it in the file's existing candidate style: falsifiable test, status, sources.
6. **(Finding #6, MAJOR)** `beta/modules/policy-gaps/page.tsx:293-301` — Excel export: compute
   the Summary sheet's by-status/by-type stats from `filtered` (matching the Gaps sheet), and
   add a clearly-labelled "whole tracker" total row alongside so both readings are available.
7. **(Finding #16, MAJOR)** Custom-added gaps mislabeled as report baseline: add
   `source: 'report' | 'custom'` to the gap model (default `'report'` for seeded rows;
   `commitAdd()` sets `'custom'`), and branch the export/label logic so custom rows never render
   "Open (Jan 2024)" as a Board-report baseline (show "— (added later)" or blank). Ensure
   backwards compatibility with rows already persisted in localStorage (treat missing field as
   `'report'` for known report ids, else `'custom'` — the audit notes report ids are a known
   set and custom ids are generated).

## P1 — should do

8. **(Finding #7, MAJOR)** Add `<SiteFooter />` to `beta/modules/policy-gaps/page.tsx`
   (the only module page missing it — mirror Note 3's usage).
9. **(Finding #12)** Extend tracker free-text search to `g.sector` and `g.reference`.
10. **(Finding #8)** `policy-gaps-sectors/page.tsx:349` — candidate-gap subsector badge: add
    `dark:text-[var(--mh-muted)]` to match line 303's report-gap badge.
11. **(Finding #9, #10)** Add explicit `dark:` variants to the candidate-gap card
    (`policy-gaps-sectors/page.tsx:346`) and the "Add a new gap" panel
    (`policy-gaps/page.tsx:482`), consistent with their sibling cards.
12. **(Finding #11)** `policy-gaps/page.tsx:603` — empty actions `<th>`: add
    `<span className="sr-only">Actions</span>`.
13. **(Finding #14)** Add a small cross-link strip on Note 3 back to the Tracker and the other
    two prep notes (mirror the Tracker's "Internal notes" strip).

## P2 — cheap

14. **(Finding #17)** `policy-gaps-sectors/page.tsx:118-127/272-284` — either render the
    `'unknown'` status count when non-zero or drop it from `statusRoll`; no silent computation.
15. **(Finding #13)** Inline-edit has no cancel: snapshot the row when Edit opens and add a
    "Cancel" button restoring the snapshot (keep "Done" as-is). Only if it fits cleanly into
    the existing edit state model; skip if it would need a big refactor.

## Do not touch

Everything in the audit's "Verified correct" list (ESPR/NZIA/TEN-T/HDV/ReFuelEU/FuelEU/RED III
citations, CORSIA/ETS scope statements, Lee et al. citation, AFIR candidate-gap premise, sector
taxonomy, `cand-` id namespacing). Data persisted in localStorage must keep loading (no breaking
schema change without a fallback).

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `grep -rn "Jan 2025\|January-2025\|Jan-2025" src/data/policy-gaps.ts beta/modules/policy-gaps/`
  → no matches.
- `grep -n "Maritime" src/data/summer-prep-sector-gaps.ts` → at least one candidate or
  `alsoSubsectors` tag; the matrix code counts it.
- `grep -n "SiteFooter" beta/modules/policy-gaps/page.tsx` → imported and rendered.
- Export summary derives from `filtered`.
- No edits outside the four write-set files.
