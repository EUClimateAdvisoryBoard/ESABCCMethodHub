# WP3 — Trade flows (incl. FIGARO): dark mode, contrast, quality fixes

Read first: `audits/audit-tradeflows.md` (finding numbers refer to it) and the shared protocol +
dark-mode mapping table in `README.md`. Fact-check came back clean — this WP is UI + quality.

**Mission:** make the whole trade-flows surface theme-aware and fix the contrast/quality issues.

**Write-set (edit nothing else):**
- `beta/modules/overview-industry/trade-flows/page.tsx`
- `beta/modules/overview-industry/trade-flows/TradeFlowExplorer.tsx`
- `beta/modules/overview-industry/trade-flows/DependenciesDashboard.tsx`
- `beta/modules/overview-industry/trade-flows/DependencyMap.tsx`
- `beta/modules/overview-industry/trade-flows/MethodologyPanel.tsx`
- `beta/modules/overview-industry/trade-flows/TradeBalanceFigure.tsx`
- `beta/modules/overview-industry/trade-flows/trade-data.ts`
- `beta/modules/overview-industry/trade-flows/export.ts`
- `beta/modules/overview-industry/trade-flows/figaro/*` (all 5 files)

Do NOT edit `eurostat-io.generated.ts` (machine-generated).

## P0 — must do

1. **(Finding #4, CRITICAL)** Dark mode across all 10 hand-written files. Apply the README
   mapping table to every `bg-white`, `bg-grey-50/100/200`, `text-grey-*`, `border-grey-*`,
   `bg-surface-*` chrome surface. Reference implementation: `beta/modules/policy-gaps/page.tsx`.
   Brand accents (primary/secondary/accent-red) stay. For the custom SVG figures
   (`TradeBalanceFigure`, `DependencyMap`, FIGARO charts), make axis/grid/label strokes and
   text theme-aware (CSS vars), keeping the data-series colors.
2. **(Finding #5, MAJOR)** Fix the three recurring orange contrast failures in one consistent
   pass (shared token/pairing so all three land ≥4.5:1 for text, ≥3:1 for large text):
   - `TradeFlowExplorer.tsx:523, 712` — 8px `text-accent-orange` "SRM" tag on white (≈2.1:1)
   - `DependenciesDashboard.tsx:250-257` — "Strategic · Annex I" pill `bg-surface-orange
     text-accent-orange` (≈1.9:1)
   - `page.tsx:58` and `figaro/page.tsx:38` — "Beta" pill `bg-accent-orange text-white` (≈2.1:1)
   Use a dark-orange text on the light surface (or a darker solid chip with white text), and
   give each a dark-mode pair.

## P1 — should do

3. **(Finding #11)** `page.tsx:101-104` vs `export.ts` — the "12 sheets: …" prose names only 11
   items. Permanent fix: export a `SHEET_NAMES: string[]` const from `export.ts` (kept adjacent
   to the `wb.addWorksheet(...)` calls, one entry per sheet, in order) and render the page
   string from it (`SHEET_NAMES.length` + `join(' · ')`), so the two files can never drift.
4. **(Finding #12)** `figaro/FigaroAnalysis.tsx:294, 299` — add the same `total > 0 ? … : 0`
   zero-guard used elsewhere in the file to the two unguarded percentage KPIs.
5. **(Finding #1)** `trade-data.ts:379` comment — reword to "34 critical raw materials
   (Annex II), 17 of which are additionally designated strategic (Annex I)". Apply the same
   phrasing wherever the "34 + 17" additive framing appears on-page
   (`DependenciesDashboard.tsx`, `export.ts` read-me row) — grep for `34` + `17` in the
   write-set.
6. **(Finding #6)** `TradeBalanceFigure.tsx` — add an `sr-only` data table mirroring the
   per-division import/export values (pattern reference: `DependencyMap.tsx`'s textual list).

## P2 — cheap

7. **(Finding #9)** `figaro/FigaroExplorer.tsx:62` — friendlier error message: keep the
   regenerate-command hint, show a generic "couldn't load the FIGARO extract" headline, and move
   the raw `String(e)` into a collapsed `<details>`/console.
8. **(Finding #2 / Improvement 7)** `MethodologyPanel.tsx:260` — alongside the static OECD TiVA
   PDF citation, add the interactive TiVA explorer link
   (https://www.oecd.org/en/topics/sub-issues/trade-in-value-added.html) so the 49.9%
   cross-check is machine-checkable in future.

## Do not touch

Everything in the audit's "Verified correct" list (FIGARO cadence, gallium/graphite shares,
SWD(2021)352 figures, IR formula, CRMA classifications, the spot-checked generated values,
overflow/sticky-header handling). Do not renumber or rename export sheets — only enumerate them.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `grep -rc "dark:" beta/modules/overview-industry/trade-flows --include=*.tsx` — every
  component file > 0.
- `grep -n "SHEET_NAMES" beta/modules/overview-industry/trade-flows/{export.ts,page.tsx}` —
  defined in export, consumed in page; the rendered count derives from `SHEET_NAMES.length`.
- No remaining `text-accent-orange` on `bg-surface-orange`/white in the three fixed spots.
- No edits outside the write-set; `eurostat-io.generated.ts` untouched.
