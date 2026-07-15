# WP4 — Downstream, Report objectives & industry landing: dark mode, charts, citation hygiene

Read first: `audits/audit-downstream-objectives.md` (finding numbers refer to it) and the shared
protocol + dark-mode mapping table in `README.md`. Fact-check came back essentially clean —
this WP is UI + maintainability + two small completeness fixes.

**Mission:** dark-mode the three light-only pages and their Chart.js palettes, kill the
duplicated AR6 citation, and land the two minor data completeness fixes.

**Write-set (edit nothing else):**
- `beta/modules/overview-industry/page.tsx` (industry landing)
- `beta/modules/overview-industry/downstream/page.tsx`
- `beta/modules/overview-industry/downstream/export.ts`
- `beta/modules/overview-industry/report-objectives/page.tsx`
- `beta/modules/overview-industry/report-objectives/ScenarioDatabase.tsx`
- `beta/modules/overview-industry/report-objectives/scenario-export.ts`
- `src/data/downstream-lead-markets.ts`
- `src/data/industry-report-objectives.ts`
- `src/data/industry-scenario-db.ts`

## P0 — must do

1. **(MAJOR-1)** Dark mode on `downstream/page.tsx`, `report-objectives/page.tsx`,
   `ScenarioDatabase.tsx`, and `overview-industry/page.tsx` (all currently 0 `dark:` classes).
   Apply the README mapping table to every card, table, badge, and section wrapper. Reference
   implementation: `beta/modules/summer-prep/page.tsx` (12 `dark:` usages, same surface).
2. **(MINOR-7)** Make the Chart.js palettes theme-aware so charts stay legible on dark cards:
   `report-objectives/page.tsx:60-70` (`GRID='#EDEEF0'`, `TICK='#54728C'`) and
   `ScenarioDatabase.tsx:54-79` (`GRID`, `TICK`, `MEDIAN_COLOR='#111827'`, `MUTED`,
   point-border `#FFFFFF`). Implement a small shared hook in one of the two files (export it to
   the other): resolve dark state from the `document.documentElement` `.dark` class via the app
   preference system (`src/lib/preferences-context.tsx` exposes the theme; charts must
   re-render on theme change — subscribe to the context, not a one-shot read). Dark values:
   grid ≈ `#2A3644`, ticks ≈ `#8FA1B3`, median ≈ `#E6EBF0`, point border = card bg.

## P1 — should do

3. **(MINOR-11)** Consolidate the duplicated `ar6-db-iiasa` source object
   (`industry-report-objectives.ts:255-261` and `industry-scenario-db.ts:190-197`): define it
   once (export a shared const from `industry-scenario-db.ts` or a tiny
   `src/data/shared-sources.ts` — new file allowed) and import it in the other register so the
   cite/DOI/url can only be edited in one place. Keep both registers' external shapes unchanged.
4. **(MINOR-10)** Remove the dead `INDUSTRY_HISTORY` import in `ScenarioDatabase.tsx:41`
   (the `scenario-export.ts` usage is legitimate — keep it).
5. **(MINOR-3)** `src/data/downstream-lead-markets.ts:378-380` — IAA "Minimum low-carbon shares
   (as proposed)" keyData row: append "; Member States must apply the shares to ≥45% of the
   national budget for support schemes covering these materials." (sources: Skadden/Mayer Brown
   analyses already cited in the audit — add one URL to the row's source field consistent with
   file conventions).
6. **(MINOR-6)** `src/data/downstream-lead-markets.ts:688-689/723-734` — ELV Regulation
   `statusDetail`: insert "; EP plenary approval 18 June 2026" between the provisional
   agreement (12 Dec 2025) and Council adoption (29 June 2026).

## P2 — cheap

7. **(MINOR-8)** `beta/modules/summer-prep/page.tsx` is NOT in your write-set — skip anything
   there. Instead, optional: in `overview-industry/page.tsx`, if the module-number badge text
   references "M · 34", add a clarifying clause that M·34 was later reassigned to Electricity
   Prices (matching the history documented in `src/app/page.tsx:395-400`) — only if such badge
   text exists on this page.

## Do not touch

Everything in the audit's "Verified correct" list (Better Regulation five criteria, IAA share
percentages themselves, CBAM ENVI/plenary dates, NZIA framings, AR6 database numbers, ELV
quotas, ESPR/CPR dates, 2040-target note in `industry-report-objectives.ts`). MINOR-4 (S3 "92%")
was assessed no-action — leave the "−90 to −95%" band as is.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `grep -c "dark:"` > 0 for all four P0 files.
- `grep -rn "ar6-db-iiasa" src/data/` shows one definition and one import/reference, not two
  literal copies of the cite/DOI.
- `grep -n "INDUSTRY_HISTORY" beta/modules/overview-industry/report-objectives/ScenarioDatabase.tsx`
  → no matches.
- No edits outside the write-set (plus optionally `src/data/shared-sources.ts` if created).
