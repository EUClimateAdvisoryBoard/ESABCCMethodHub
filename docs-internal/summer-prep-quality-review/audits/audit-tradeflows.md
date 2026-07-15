# Audit — Trade Flows submodule (incl. FIGARO), Overview Industry / Summer Prep

Scope: `beta/modules/overview-industry/trade-flows/{page.tsx, TradeFlowExplorer.tsx, DependenciesDashboard.tsx,
DependencyMap.tsx, MethodologyPanel.tsx, TradeBalanceFigure.tsx, trade-data.ts, export.ts,
eurostat-io.generated.ts (spot-check only), figaro/*}`.

Pre-audit check: `git log` shows PR #406 (merge of `29790d9` fact-check corrections + `c5d3d2c` IO-methodology
write-up) already landed. Confirmed as fixed and NOT re-reported: Gallium China share 71%→77%, natural
graphite China share 47%→43%, FIGARO release-cadence wording ("t+18 months" → "annual July, up to t-2"), and
the new §2 Leontief/intermediate-demand explainer in `MethodologyPanel.tsx`.

---

## 1. FACT-CHECK

1. **[MINOR] `trade-data.ts:379`** — comment: `"34 critical + 17 strategic raw materials"`. The phrasing reads
   as additive (34 + 17 = 51 distinct materials). Per Reg. (EU) 2024/1252, Annex II lists 34 **critical** raw
   materials, and the 17 **strategic** raw materials (Annex I) are drawn from within/alongside that same
   critical list (the EC's own framing is "34 critical raw materials, of which 17 are also strategic"), not a
   second disjoint set of 17. Low practical impact since the app's own `CriticalMaterial.strategic: boolean`
   field already treats "strategic" and "critical" as mutually exclusive UI tags (a reasonable simplification),
   but the doc comment could mislead a reader into thinking there are 51 named materials in total.
   **Fix:** reword to "34 critical raw materials (Annex II), 17 of which are additionally designated strategic
   (Annex I)." Source: https://eur-lex.europa.eu/eli/reg/2024/1252/oj/eng ,
   https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en

2. **[MINOR / unverifiable] `MethodologyPanel.tsx:260`** — "Cross-check: OECD TiVA (EU-27, data year 2020) put
   C19 at 49.9%". The cited PDF (`tiva-2023-EU27_2020.pdf`) is a real, correctly-titled OECD TiVA country-note
   for the EU27, and the general order of magnitude (EU27 coke/refined-petroleum FVA share is high, comparable
   peers show 65–85%) is directionally consistent with a high FVA share for this sector, but the exact 49.9%
   figure could not be independently confirmed (the source PDF is image-based and not machine-readable via
   automated fetch). No error found — flagging only because it is the one load-bearing number in this file
   that could not be cross-verified with the tools available. Recommend a manual open-and-check of the PDF
   table by a human reviewer before the next external release.

3. **[Verified — no issue] `RISK_HOTSPOTS` "Crude oil / refined feedstock"** (`trade-data.ts:492`) lists
   supplier `USA (crude/products)` with `supplierConcentration: 0.16` — i.e. the named "dominant" supplier only
   holds 16% of the market. This is not an error (the map plots reliance × concentration for every curated row,
   regardless of how concentrated it is), but the label "supplier" reads oddly for a field this diversified;
   consider a UI tweak (see Improvements).

All other checked claims were confirmed accurate — see "Verified correct" below (FIGARO cadence, SWD(2021)352
figures, CRMA structure, IR formula, Gallium/graphite shares, and ~10 spot-checked hardcoded trade values).

---

## 2. UI CHECK

4. **[CRITICAL] Whole submodule has zero dark-mode support — hardcoded light-only Tailwind colors throughout.**
   Files: `page.tsx`, `TradeFlowExplorer.tsx`, `DependenciesDashboard.tsx`, `DependencyMap.tsx`,
   `MethodologyPanel.tsx`, `TradeBalanceFigure.tsx`, `figaro/page.tsx`, `figaro/FigaroExplorer.tsx`,
   `figaro/FigaroTableViewer.tsx`, `figaro/FigaroAnalysis.tsx`. `tailwind.config.ts` sets
   `darkMode: 'class'` and the app has a real, working theme toggle (`src/lib/preferences-context.tsx`,
   `theme: 'system'|'light'|'dark'`, persisted). `src/app/globals.css` defines the app's dark-mode-aware
   tokens `--mh-bg`, `--mh-fg`, `--mh-card`, `--mh-border`, `--mh-muted`, and several other beta modules
   (`beta/modules/policy-gaps/page.tsx`, `beta/modules/summer-prep/*`) already use them. Grepping the entire
   trade-flows directory for `mh-bg|mh-card|mh-border|mh-fg|mh-muted` or any `dark:` variant returns **zero**
   hits. Every surface instead hardcodes `bg-white`, `bg-grey-50/100/200`, `text-grey-500/700/800/900`,
   `border-grey-200`, `bg-surface-blue/green/orange/yellow`, which the Tailwind config defines as **fixed hex
   values** (not CSS vars) — e.g. `grey: {50:'#F9FAFB', ..., 900:'#2E3E4C'}`. In dark mode this entire
   submodule (10 files) will render as solid white/light-grey cards on light backgrounds regardless of the
   user's theme choice — the single most visible UI defect in the module.
   **Fix:** swap the structural surfaces (`bg-white`→`bg-[var(--mh-card)]`, `border-grey-200`→
   `border-[var(--mh-border)]`, `bg-grey-50`→`bg-[var(--mh-bg)]`, body text greys → `text-[var(--mh-fg)]` /
   `text-[var(--mh-muted)]`) to match the pattern already used in `beta/modules/policy-gaps/page.tsx`. The
   brand accent colors (primary/secondary/accent-red etc.) can stay as-is since they are the same in both
   themes; only the neutral chrome needs the swap.

5. **[MAJOR] Low-contrast orange badges recur across the module, failing WCAG AA.** Examples:
   `TradeFlowExplorer.tsx:523` and `:712` — `<span className="... text-[8px] font-bold text-accent-orange">SRM</span>`
   (orange `#FF9933` text at 8px on a white/near-white card — contrast ratio ≈2.1:1, needs ≥4.5:1 for text
   this size, or ≥3:1 even treating it as "large text"); `DependenciesDashboard.tsx:250-257` — the "Strategic ·
   Annex I" pill uses `bg-surface-orange text-accent-orange` (`#FF9933` text on `#FFEDDE` background — contrast
   ≈1.9:1, worse); `page.tsx:58` / `figaro/page.tsx:38` — the "Beta" pill uses `bg-accent-orange` with
   `text-white` (white on `#FF9933` — contrast ≈2.1:1). All three combinations are unreadable for
   low-vision users and fail automated contrast checks.
   **Fix:** darken the orange to something like the existing `accent-orange` paired with a darker text color
   (e.g. use `text-[#7A4400]`-equivalent dark-orange on the light surface, or invert to a solid darker chip
   with white text, similar to how `accent-red`/`primary` chips are used elsewhere in the same files at
   sufficient contrast).

6. **[MINOR] Chart accessibility relies on hover/`<title>` only for two SVG figures.** `TradeBalanceFigure.tsx`
   gives the whole chart one `aria-label` (good) but per-division import/export values exist only as SVG
   `<text>` nodes with no adjacent accessible data table; `DependencyMap.tsx` mitigates this well (numbered
   bubbles + a fully-textual ordered list alongside — good pattern), but `TradeBalanceFigure` has no such
   textual fallback. A screen-reader user gets the aria-label summary but not the per-division breakdown.
   **Fix:** add a visually-hidden (`sr-only`) data table mirroring the 24 rows, or reuse the
   `DependencyMap`-style "numbered list alongside the plot" pattern.

7. **[MINOR] The app's colorblind-safe palette preference is not honored.** `src/lib/preferences-context.tsx`
   exposes `colorblind_safe` (switches charts to the Wong-2011 deuteranope-safe palette), but nothing in
   `trade-flows/` imports `usePreferences` or branches on it — red/blue (China vs. other) and red/teal/blue
   hues are hardcoded everywhere (`DependencyMap.tsx`, `FigaroAnalysis.tsx`, `TradeBalanceFigure.tsx`). Mitigated
   somewhat because color is almost always paired with a text label (partner name, "China" callout), so this is
   not a hard accessibility blocker, but it is an inconsistency with the rest of the app's stated capability.

8. **[MINOR] Responsive/overflow handling is actually solid** — worth noting as a positive, not a bug: every
   wide table/SVG in the module (`TradeBalanceFigure`, `DependencyMap`, `FigaroTableViewer`,
   `DependenciesDashboard` register tables) is wrapped in `overflow-x-auto` with an explicit `minWidth`, so
   nothing clips on narrow viewports; sticky headers in `FigaroTableViewer` work correctly on scroll.

9. **[MINOR] `FigaroExplorer.tsx` error/loading states are present but the error path is generic.** `loadFigaroIo()`
   failure surfaces `String(e)` (e.g. `Error: Failed to load /data/figaro/figaro-io-eu27.json (HTTP 404)`)
   directly in the UI (line 62) — functionally fine and does show a helpful regenerate-command hint, but the
   raw `String(e)` interpolation could leak a full stack description on unexpected errors (e.g. JSON parse
   errors would show `SyntaxError: Unexpected token < in JSON...`). Low risk since this is an internal tool,
   but consider a friendlier generic message with the raw error only in a collapsed detail/console.log.

10. **[Verified] No broken internal links** — `href="/beta/overview-industry"`, `/beta/overview-industry/trade-flows`,
    `/beta/overview-industry/trade-flows/figaro` all resolve to real files under `src/app/beta/overview-industry/...`.

---

## 3. QUALITY

11. **[MINOR] Off-by-one in the export-workbook sheet summary text.** `page.tsx:101-104` advertises
    `"12 sheets: read-me · headline facts · trade backbone (2023 + 2024) · FIGARO partners · foreign value
    added · imported inputs · critical materials · strategic & energy dependencies · risk hotspots ·
    critical inputs · sources"` — this string names 11 distinct bullet items (it collapses two real, separate
    workbook sheets — "Strategic dependencies" and "Energy dependency", `export.ts:377` and `:405` — into one
    combined label "strategic & energy dependencies") while still claiming "12 sheets" total. The count (12) is
    correct against `export.ts`'s actual `wb.addWorksheet(...)` calls; only the enumeration undercounts by one
    named item, so a reader manually counting the list will get 11, not 12.
    **Fix:** split into `... · strategic dependencies · energy dependency · risk hotspots ...` to match the
    12 actual sheet names 1:1.

12. **[MINOR] Unguarded percentage math in `FigaroAnalysis.tsx`.** Lines 294 and 299:
    `((stats.totalImported / stats.totalIntermediate) * 100).toFixed(1)` and
    `((stats.manufImported / stats.manufTotal) * 100).toFixed(1)` have no zero-guard, unlike the otherwise
    consistent pattern used everywhere else in the same file (e.g. `focusStats` and `perIndustry.share` both
    guard with `total > 0 ? … : 0`). In practice `totalIntermediate`/`manufTotal` will never be 0 given the
    real FIGARO extract, so this is latent rather than currently triggering, but it is inconsistent with the
    module's own defensive-coding convention and would render `NaN%` if the JSON were ever partially empty.
    **Fix:** apply the same `total > 0 ? … : 0` guard used elsewhere in the file.

13. **[MINOR] Provenance freshness is good, not stale.** `eurostat-io.generated.ts:11` — `Generated: 2026-07-07`,
    8 days before this audit (today 2026-07-15); `public/data/figaro/*.json` on-disk timestamps are 2026-07-09.
    Both are current, not stale. No action needed, noting for completeness since the audit brief asked to check.

14. **[Verified] Export (`export.ts`) does not drift from the UI.** Every dataset shown in
    `TradeFlowExplorer`/`DependenciesDashboard`/`MethodologyPanel` (trade backbone both years, FIGARO
    import/export/FVA, use-table input mix, critical materials, strategic dependencies, energy dependency,
    risk hotspots, sector inputs) has a corresponding, correctly-populated worksheet in `export.ts`, and the
    "Read me" sheet's prose (aggregation-gap numbers, layer descriptions) is generated from the same live
    constants (`SECTION_C_TEC`, `SECTION_C_DIVISION_SUM`) rather than hardcoded, so it cannot silently drift.

15. **[Verified] No dead code found** in the 9 hand-written files; `eurostat-io.generated.ts` is fully
    machine-generated and consistent with its own header comment.

---

## 4. IMPROVEMENTS (max 8)

1. **Fix the dark-mode gap first (finding #4).** This is the highest-leverage single change: swap the ~10
   files' hardcoded `bg-white`/`border-grey-200`/`text-grey-*` chrome to the `--mh-*` CSS vars already used by
   sibling modules, so the submodule stops being the one part of Summer Prep that ignores the user's theme.

2. **Fix the orange-badge contrast (finding #5)** across all three recurring patterns (SRM tag, "Strategic ·
   Annex I" pill, "Beta" pill) in one pass, since they share the same underlying `accent-orange` color token —
   a single darker-orange or higher-contrast pairing fixes all three at once.

3. **Add a per-division `sr-only` data table to `TradeBalanceFigure`** mirroring the pattern already used well
   in `DependencyMap` (numbered list beside the plot), so screen-reader users get the same per-row detail
   keyboard/AT users of the dependency map already receive.

4. **Wire `colorblind_safe` into the three custom-SVG figures** (`DependencyMap`, `TradeBalanceFigure`,
   `FigaroAnalysis`'s red/blue/teal hues) via `usePreferences()`, since the app already ships a Wong-2011-safe
   palette as a first-class preference and every other chart-heavy module should honor it consistently.

5. **Make the "12 sheets" summary self-verifying.** Rather than a hand-maintained prose string in `page.tsx`,
   derive the sheet-name list from `export.ts`'s own worksheet titles (e.g. export a `SHEET_NAMES` const array
   from `export.ts` and `.join(' · ')` it in `page.tsx`) so the two files can never drift again (closes finding
   #11 permanently rather than just once).

6. **Add the zero-guard to `FigaroAnalysis.tsx`'s two unguarded percentage KPIs** (finding #12) purely for
   defensive consistency with the rest of the file — trivial, low-risk, closes a latent `NaN%` render.

7. **Surface the FVA cross-check number as a link-through, not just prose.** `MethodologyPanel.tsx`'s OECD
   TiVA 49.9% cross-check (finding #2) is the one number in the file that couldn't be automatically re-verified
   because the source PDF is an image; consider linking directly to the interactive TiVA data explorer/table
   (`https://www.oecd.org/en/topics/sub-issues/trade-in-value-added.html`) instead of (or in addition to) the
   static PDF, so future reviewers and readers can machine-check it.

8. **Tighten the "34 critical + 17 strategic" phrasing** (finding #1) to "34 critical, 17 of which also
   strategic" in both `trade-data.ts`'s comment and the on-page copy in `DependenciesDashboard.tsx` /
   `export.ts`'s Read-me row, so a reader cannot infer 51 total materials.

---

## Verified correct (spot-checked, no issue found)

- **FIGARO release cadence** — "published annually each July, covering data up to t−2"
  (`MethodologyPanel.tsx:201`, fixed in `29790d9`) matches Eurostat's own metadata: *"Eurostat usually releases
  the FIGARO data in July each year… produced annually with a time delay of T-2."*
  (https://ec.europa.eu/eurostat/cache/metadata/en/naio_10_fcp_esms.htm)
- **Gallium China share 77%** and **natural graphite China share 43%** (`trade-data.ts:392-393, 484, 488`,
  fixed in `29790d9`) — both match Eurostat's 2026 "International trade in critical raw materials" Statistics
  Explained article for 2025 trade data (also matches Magnesium 92-93%, Ferro-tungsten 68%, Lithium
  carbonate/Chile 70%).
  (https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials)
- **SWD(2021) 352 figures** (`trade-data.ts:447` / `DependenciesDashboard.tsx:301`) — "137 products… ~6% of
  extra-EU goods imports; 34 judged highly vulnerable; 99 of 137 in the energy-intensive ecosystem" all match
  the source document exactly (34 = 0.6% of import value, 99 dependent products in energy-intensive ecosystem).
  (https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352)
- **Import reliance formula** `IR = (imports − exports) / (domestic production + imports − exports)`
  (`MethodologyPanel.tsx:265`, `DependencyMap.tsx:184`) — matches the JRC RMIS definition exactly (net import /
  apparent consumption, apparent consumption = domestic production + import − export).
  (https://rmis.jrc.ec.europa.eu/uploads/scoreboard2018/indicators/3._Import_reliance.pdf)
- **CRMA structure** — Regulation (EU) 2024/1252, Annex I = 17 Strategic Raw Materials, Annex II = 34 Critical
  Raw Materials, in force from 23 May 2024 — matches `CRMA_SOURCE` citation and the Strategic/Critical
  designations used throughout `CRITICAL_MATERIALS` (spot-checked Tungsten/Boron/Silicon/Cobalt = strategic;
  Niobium/Scandium = critical-only, both correctly classified).
- **Internal-consistency spot-checks against `eurostat-io.generated.ts`** (10+ values): C19 2023 extra-EU
  imports €218.4bn (methodology text says "€218bn" ✓); C19 FVA 64.2% (text says "peaks at 64%" ✓);
  manufacturing-wide FVA 22.4% (headline fact fallback "22.4" ✓); China's share of extra-EU imports 24.4%
  (headline fact fallback "24%" ✓); C28 2023 extra-EU surplus €165.0bn (`expExt 219.1 − impExt 54.1`, matches
  the division note "€165 bn extra-EU surplus in 2023" exactly ✓); `INPUT_MIX_TOTAL_C` 19.2% imported share
  arithmetic checks out (1196.3/6233.9 ✓).
- **`public/data/figaro/*.json` file sizes** match the "~0.9 MB" / "~0.1 MB" claims in `figaro-data.ts`'s
  UI copy (actual: 804 KB and 100 KB).
- **No broken internal links** — all `Link href="/beta/overview-industry..."` targets resolve to real files
  under `src/app/beta/overview-industry/`.
- **`DependencyMap.tsx`'s X_MIN=0.5 comment** ("every entry sits above 63% reliance") is accurate — the lowest
  `importReliance` value in `RISK_HOTSPOTS` is 0.63 (Silicon metal).
- **Export workbook does not drift from the on-page data** (see finding #14) and no dead code was found in the
  hand-written files (see finding #15).
