# Audit — Downstream, Report Objectives, and the two Summer-Prep/Industry landing pages

Scope: `beta/modules/overview-industry/downstream/{page.tsx,export.ts}`,
`beta/modules/overview-industry/report-objectives/{page.tsx,ScenarioDatabase.tsx,scenario-export.ts}`,
`beta/modules/overview-industry/page.tsx`, `beta/modules/summer-prep/page.tsx`, and their data files
(`src/data/downstream-lead-markets.ts`, `src/data/industry-report-objectives.ts`, `src/data/industry-scenario-db.ts`).

Pre-check: `git log` shows commit `29790d9` ("Fact-check corrections across Summer Prep Industry Report
submodules", merged in PR #406, same day as this audit) already fixed: IAA minimum shares framing, CBAM
ENVI/plenary timing, EC 2040 IA S1/S2/S3 band labels, AR6 DB 188 frameworks / DOI zenodo.5886912, and the
NZIA 15%/2040 "aspirational" vs 40%/2030 "binding" framing. All of these were re-verified below and found
**correct as already fixed** — not re-reported as issues, listed instead under "Verified correct."

---

## 1. FACT-CHECK

### MINOR-1 — NZIA CO2-storage framing slightly overstates "first legally binding" claim's uniqueness
**File:** `src/data/downstream-lead-markets.ts` — not directly, but `src/data/industry-report-objectives.ts:656,664-668` and cross-referenced in downstream page's framework text.
This is a nuance, not an error: the ≥50 Mt/yr CO2 injection-capacity target (NZIA Art. 20) is correctly described as binding and dated 2030, confirmed via EU Climate Action / Wolf Theiss / Carbon Gap sources. No fix needed — logged as verified, see below.

### MINOR-2 — Better Regulation criteria wording is accurate but the canonical EC term is "EU added value," which the page correctly uses
**File:** `beta/modules/overview-industry/downstream/page.tsx:11-13`, `src/data/downstream-lead-markets.ts:10-13,30-33`
Verified against SWD(2021) 305 final and Better Regulation Toolbox #47: the five criteria are effectiveness, efficiency, coherence, relevance, EU added value. The page/data file list order (effectiveness, efficiency, relevance, coherence, EU added value) and definitions match official EC framing. **No fix needed** — logged as verified.

### MINOR-3 — IAA "45% of national support-scheme budgets" nuance omitted
**File:** `src/data/downstream-lead-markets.ts:378-380` (keyData "Minimum low-carbon shares")
Secondary sources (Mayer Brown, Skadden) on the March 2026 IAA proposal note that Member States must apply the 25%/5%/25% shares to **at least 45% of the national budget** allocated to support schemes involving these materials — a scope qualifier the data file's keyData note doesn't mention (it says "in covered public contracts" without the 45%-of-budget nuance).
**Proposed fix:** In the `keyData` row `'Minimum low-carbon shares (as proposed)'`, append: "...; Member States must apply the shares to ≥45% of the national budget for support schemes covering these materials."
Source: https://www.skadden.com/insights/publications/2026/04/european-commission-proposes-industrial-accelerator-act ; https://www.mayerbrown.com/en/insights/publications/2026/03/european-commission-proposes-industrial-accelerator-act

### MINOR-4 — EC 2040 IA S3 net-2040 number: secondary sources cite "92%" as the modelled S3 figure, not just the "90-95%" band
**File:** `src/data/industry-scenario-db.ts` line ~778-792 (sc-ec-ia-s3), already partly fixed in PR #406 to "−90 to −95%"
One secondary source (search summary) states "Scenario 3 (S3) in the impact assessment delivers a 92 percent emissions reduction in 2040 relative to 1990," while the Commission's own Option-3 framing elsewhere is described as "90-95%, recommended 90%." The page's current "−90 to −95%" band is consistent with the official IA option framing and is very likely correct (the "92%" figure floating in secondary sources may be a single model's point estimate within that band, not the headline range) — flagging as **low-confidence, no action recommended** without seeing the primary annex table. Not counted in severity totals.

### MINOR-5 — CBAM "Council general approach June 2026" date is stated as fact but should be double-checked against a primary Council source
**File:** `src/data/downstream-lead-markets.ts:602,653-654`
Verified via WebSearch: ENVI committee vote was 6 July 2026 (56-11-12), Parliament plenary mandate expected September 2026 before trilogues — this matches the page's post-PR-#406 text exactly. Council general approach in June 2026 is referenced consistently across the page's own sources (taxation-customs.ec.europa.eu press release dated 2026-06-12) — **verified correct**, no fix needed.

### MINOR-6 — ELV Regulation dates verified, but Parliament final-approval date is omitted
**File:** `src/data/downstream-lead-markets.ts:688-689, 723-734`
Verified: Council formally adopted 29 June 2026 (confirmed via consilium.europa.eu press release), following Parliament's final approval on 18 June 2026 (europarl.europa.eu press release). The data file states "provisional agreement 12 Dec 2025; Council formal adoption 29 June 2026" but omits the intermediate Parliament plenary vote (18 June 2026). Minor completeness gap, not an error.
**Proposed fix:** Add "; EP plenary approval 18 June 2026" between the provisional-agreement and Council-adoption dates in `statusDetail`.
Source: https://www.europarl.europa.eu/news/en/press-room/20260611IPR45210/new-rules-for-a-more-sustainable-eu-automotive-sector ; https://www.consilium.europa.eu/en/press/press-releases/2026/06/29/council-greenlights-rules-for-a-more-circular-automotive-sector/

---

## 2. UI CHECK

### MAJOR-1 — Downstream, Report Objectives and the Industry landing page have zero dark-mode support; Summer Prep landing page (same surface) is fully dark-mode-aware
**Files:** `beta/modules/overview-industry/downstream/page.tsx` (0 `dark:` classes), `beta/modules/overview-industry/report-objectives/page.tsx` (0), `beta/modules/overview-industry/report-objectives/ScenarioDatabase.tsx` (0), `beta/modules/overview-industry/page.tsx` (0) — vs. `beta/modules/summer-prep/page.tsx` (12 `dark:` classes using `var(--mh-bg)`, `var(--mh-fg)`, `var(--mh-card)`, `var(--mh-border)`, `var(--mh-muted)`).
Confirmed the app has a working, class-based dark-mode system: `tailwind.config.ts` sets `darkMode: 'class'`, `src/app/globals.css` defines both light and dark values for `--mh-bg/-fg/-card/-border/-muted` (lines 119-130), and `src/lib/preferences-context.tsx` toggles the `.dark` class. All four in-scope files under audit use hardcoded light-only Tailwind classes (`bg-white`, `text-grey-900`, `border-grey-200`, `bg-grey-50`, `bg-grey-100`, `text-grey-500/600/700`, etc.) with no dark-mode fallback — in dark mode these pages will render as a stark white/light-grey island against the rest of a dark-themed app (broken contrast/readability, jarring UX). Every card, table, badge and section on all 3 in-scope pages is affected — this is the single largest, most systemic UI issue in scope.
**Proposed fix:** Add `dark:` variants mirroring the pattern already used in `summer-prep/page.tsx` (e.g. `bg-grey-50 dark:bg-[var(--mh-bg)]`, `bg-white dark:bg-[var(--mh-card)]`, `border-grey-200 dark:border-[var(--mh-border)]`, `text-grey-900 dark:text-[var(--mh-fg)]`, `text-grey-500/600 dark:text-[var(--mh-muted)]`) across all card/table/badge wrappers in `downstream/page.tsx`, `report-objectives/page.tsx`, `ScenarioDatabase.tsx`, and the `overview-industry/page.tsx` landing page.

### MINOR-7 — Chart.js canvases (Chart, Line, Bar) are hardcoded to a light palette and will not adapt to dark mode even if surrounding chrome is fixed
**Files:** `beta/modules/overview-industry/report-objectives/page.tsx:60-70` (`CAT`, `GRID='#EDEEF0'`, `TICK='#54728C'`), `ScenarioDatabase.tsx:54-79` (`GRID`, `TICK`, `MEDIAN_COLOR='#111827'`, `MUTED='#AEB6C2'`, `SUB_COLORS`)
Grid lines (`#EDEEF0`, near-white) and the median line color (`#111827`, near-black) are tuned for a white chart background (`bg-white` container). If MAJOR-1 is fixed and the surrounding card goes dark, these chart colors would remain invisible/illegible (near-white gridlines vanish on a dark card; the point-border `'#FFFFFF'` used for hover dots would also look wrong).
**Proposed fix:** Parametrize `GRID`/`TICK`/point-border colors from the same `--mh-*` variables (read via `getComputedStyle` or a small light/dark chart-theme hook), consistent with the `dataviz` skill's guidance on theme-aware chart palettes.

### MINOR-8 — Comment claims "Beta module M · 35 (formerly M · 37)" — verify against actual current numbering
**File:** `beta/modules/summer-prep/page.tsx:4`
Cross-checked against `src/app/page.tsx:399-400`: current numbering is `M · 34 = Electricity Prices`, `M · 35 = Summer Prep`. The `src/app/page.tsx` comment (line 395-398) explicitly documents that Overview Industry and Policy Gap Tracker used to be `M · 34`/`M · 36` before being folded into Summer Prep, and that `M · 34` was later reassigned to the new Electricity Prices module. The summer-prep page's own badges ("Module 1 · was M · 34 (Overview Industry)", "Module 2 · was M · 36 + the internal notes") and header comment are **internally consistent with this history** — not a bug, just worth flagging that a reader unfamiliar with the renumbering could be confused since M·34 now means something entirely different elsewhere in the app. No code fix needed; optional: add one clause noting M·34 was later reused for Electricity Prices, to close the loop for a future reader of this file in isolation.

### Internal links — all verified resolving
All hrefs from the landing pages resolve to real routes: `/beta/overview-industry`, `/beta/overview-industry/cleantech`, `/beta/overview-industry/trade-flows`, `/beta/overview-industry/downstream`, `/beta/overview-industry/report-objectives`, `/beta/policy-gaps`, `/beta/summer-prep/indicator-check`, `/beta/summer-prep/synergies-tradeoffs`, `/beta/summer-prep/policy-gaps-sectors` all have matching `page.tsx` files under `src/app/beta/...`. **No broken links found.**

### Landing-page description accuracy — verified consistent
Both `overview-industry/page.tsx` and `summer-prep/page.tsx` describe Downstream and Report Objectives in terms that match what those pages actually contain (five Better Regulation criteria review + Excel handover workbook for Downstream; roadmap/clean-tech synthesis + objectives + fully sourced Excel for Report Objectives). **No drift found.**

### MINOR-9 — Table overflow handling is present but table minimum widths force horizontal scroll on typical laptop viewports
**Files:** `downstream/page.tsx:113-114` (`min-w-[520px]`), `:273` (`min-w-[780px]`); `report-objectives/page.tsx:830` (`min-w-[900px]`); `ScenarioDatabase.tsx:233,551,583` (`min-w-[640px]`/`[860px]`)
All tables are correctly wrapped in `overflow-x-auto` containers, so this is not a bug, but the 780px/900px/860px minimum widths mean on any viewport under ~1024px (common with sidebar-docked dev tools, tablets in portrait, or a 2-up browser window) users get horizontal scrollbars on nearly every table on these two pages. This is a pre-existing pattern across the codebase, not unique to these files, so flagged as a minor improvement rather than a regression.

---

## 3. QUALITY

### MINOR-10 — Dead import: `INDUSTRY_HISTORY` imported but never used in `ScenarioDatabase.tsx`
**File:** `beta/modules/overview-industry/report-objectives/ScenarioDatabase.tsx:41`
```
import {
  SCENARIOS,
  SUBSECTORS,
  ENSEMBLE_FAMILIES,
  INDUSTRY_HISTORY,   // <-- imported, zero further references in this file
  MEDIAN_YEARS,
  ...
```
Confirmed via grep: `INDUSTRY_HISTORY` appears exactly once in the file (the import line itself) — it is not read by `MultiScenarioFigure`, `SubsectorDrilldown`, or `ScenarioDatabaseTable`. (It IS legitimately used in `scenario-export.ts` for the "Industry history" Excel sheet — that usage is correct and should stay.)
**Proposed fix:** Remove `INDUSTRY_HISTORY` from the import list in `ScenarioDatabase.tsx`.

### MINOR-11 — Data duplication: `AR6_DB_IIASA` source citation is maintained in three near-identical copies that drifted once already
**Files:** `src/data/industry-report-objectives.ts:255-261` (`SOURCES` register) and `src/data/industry-scenario-db.ts:190-197` (`SCENARIO_SOURCES` register)
Both files independently define an `ar6-db-iiasa` source object with its own `cite` string, `url`, and `doi`. PR #406 had to fix both copies in lockstep (191→188 frameworks, DOI 5886911→5886912) because they are not a single source of truth — a future edit to only one file will silently re-introduce the same drift this PR just fixed.
**Proposed fix:** Consolidate into one shared source registry (e.g. export `SHARED_SOURCES` from one file and import it into the other, or a new `src/data/shared-sources.ts`), so the AR6 citation, DOI and any other source shared between the two registers can only be edited once.

### MINOR-12 — `overallRead` and `keyData` framing were fixed for IAA but the near-duplicate GPP/PP-Act/ESPR "handoverNotes" prose blocks are not cross-linked and could drift similarly
**File:** `src/data/downstream-lead-markets.ts` (all `handoverNotes` fields, e.g. lines 244, 335, 439, 516, 593)
Not a current bug, but each policy's `handoverNotes` re-states overlap with other policies (e.g. IAA's notes mention the ESPR steel delegated act; ESPR's notes mention the IAA) using free text rather than a cross-reference by id. If the ESPR steel-delegated-act timing changes, up to 3 separate policy entries (IAA, ESPR, and the `espr-steel-da` standard) need manual, coordinated updates. Flagged as a structural risk, not a factual error today.

### MINOR-13 — `scenario-export.ts` re-derives `indexedValueAt`/`subsectorValueAt` math already computed once in `ScenarioDatabase.tsx`'s render path, rather than sharing a single computed table
**Files:** `beta/modules/overview-industry/report-objectives/scenario-export.ts:79`, `ScenarioDatabase.tsx:118`
Both call the same pure functions from `industry-scenario-db.ts` (`indexedValueAt`, `ensembleMedian`) independently at render/export time — functionally fine (same source of truth, same functions), but it means the Excel numbers and the on-page chart numbers are computed twice rather than shared, so any future rounding/edge-case fix has to be applied and tested in both call sites. Low risk since the underlying function is shared, but noted for maintainability.

---

## 4. IMPROVEMENTS (max 8)

1. **Fix the dark-mode gap (MAJOR-1) first** — port the `dark:` / `var(--mh-*)` pattern from `summer-prep/page.tsx` into `downstream/page.tsx`, `report-objectives/page.tsx`, `ScenarioDatabase.tsx` and the `overview-industry` landing page; this is the highest-value fix in scope since it affects every visual element on 3 of the 4 audited pages.
2. **Make the Chart.js palettes theme-aware** (MINOR-7) so charts don't become illegible the moment the surrounding chrome goes dark — read grid/tick/label colors from CSS custom properties instead of literal hex values.
3. **Consolidate the duplicated AR6 source citation** (MINOR-11) into one shared registry to stop the same fact (modelling-framework count, DOI) from being able to drift between `industry-report-objectives.ts` and `industry-scenario-db.ts` again.
4. **Remove the dead `INDUSTRY_HISTORY` import** (MINOR-10) in `ScenarioDatabase.tsx` — a one-line cleanup.
5. **Add the 45%-of-national-budget qualifier to the IAA keyData row** (MINOR-3) so the handover workbook and page carry the full scope of the binding minimum-share obligation, not just the headline percentages.
6. **Cross-reference overlapping `handoverNotes`/`watchPoints` by policy/standard id** (MINOR-12) instead of free-text restatement, so a single edit (e.g. to the ESPR steel delegated-act date) propagates instead of needing three manual updates.
7. **Give the data tables a responsive "card" fallback below ~640px** (MINOR-9) instead of relying solely on horizontal scroll, particularly for the Downstream instrument index and Report-Objectives data-points tables, which are the two most information-dense tables in scope.
8. **Add a short "last fact-checked" per-file timestamp/badge** (e.g. surfacing `DOWNSTREAM_META.compiled` / `IR_META.compiledOn` more prominently in the UI itself, not just the footer prose) so a reader can see at a glance which of the two pages was verified most recently — useful now that PR #406 shows fact-checks land asynchronously across submodules.

---

## Verified correct (spot-checked against primary/secondary sources, no issue found)

- Better Regulation Guidelines SWD(2021) 305 final, five criteria (effectiveness, efficiency, relevance, coherence, EU added value) — matches `downstream-lead-markets.ts` framing exactly. [commission.europa.eu/system/files/2021-11/swd2021_305_en.pdf]
- IAA proposal (COM, 4 March 2026, 2026/0068(COD)): minimum shares ≥25% steel, 5% concrete/mortar, 25% aluminium fixed in the proposal; "low-carbon" thresholds deferred to delegated acts (ESPR/CPR) — matches the post-PR-#406 text. [mayerbrown.com/en/insights/publications/2026/03; skadden.com/insights/publications/2026/04]
- CBAM downstream extension: ENVI committee adopted its position 6 July 2026 (56-11-12); Parliament plenary mandate expected September 2026 before trilogues — matches the page's post-PR-#406 text exactly. [carbon-pulse.com/529093; steelorbis.com]
- NZIA benchmarks: 40%/2030 domestic-manufacturing benchmark (Art. 5) vs 15%/2040 "aspires to reach" world-production objective (Art. 1) — the EUR-Lex summary's "the EU aspires to reach a 15% share of global production by 2040" corroborates the post-PR-#406 "aspirational objective" framing. [eur-lex.europa.eu/EN/legal-content/summary/eu-net-zero-industry-act.html]
- NZIA Art. 20 CO2 injection-capacity target: ≥50 Mt/yr by 2030, legally binding, pro-rata obligation on named oil & gas producers — matches `downstream-lead-markets.ts` and `industry-report-objectives.ts`. [climate.ec.europa.eu/eu-action/industrial-carbon-management/eus-2030-carbon-storage-target_en; zeroemissionsplatform.eu]
- AR6 Scenarios Database: 3,131 scenarios, 188 modelling frameworks, release 1.1 (Nov 2022), DOI 10.5281/zenodo.5886912 — matches the corrected figures in both `industry-report-objectives.ts` and `industry-scenario-db.ts` post-PR-#406. [zenodo.org/records/5886912; iiasa.ac.at]
- ELV Regulation: provisional agreement 12 Dec 2025, Council formal adoption 29 June 2026, recycled-plastic quota 15%→25% (≥20% ELV-sourced sub-quota) — matches `downstream-lead-markets.ts`. [consilium.europa.eu press release 2026-06-29; europarl.europa.eu 20260611IPR45210]
- ESPR (Reg. (EU) 2024/1781) working plan COM(2025) 187 (16 April 2025): iron & steel delegated act targeted 2026, aluminium 2027 — matches `downstream-lead-markets.ts` and `DOWNSTREAM_STANDARDS`. [dpp-tool.com/en/blog/espr-delegated-acts; green-forum.ec.europa.eu]
- Construction Products Regulation (EU) 2024/3110: in force 7/8 January 2025, harmonised environmental specs applying progressively from 2026 — matches `downstream-lead-markets.ts`. [eur-lex.europa.eu/eli/reg/2024/3110/oj/eng]
- EU 2040 climate target: adopted as binding 90% net reduction vs 1990, ≥85% domestic with international credits capped at 5% from 2036 — matches the `com-2024-63` data point's "since adopted as binding: 90%, of which 85% domestic" note in `industry-report-objectives.ts`. [europarl.europa.eu 20260205IPR33620; consilium.europa.eu 2026-03-05]
- Landing-page → sub-page description accuracy (both `overview-industry/page.tsx` and `summer-prep/page.tsx`) and all internal `href` targets — all resolve to real routes under `src/app/beta/...`, no broken links.
- Module-numbering comments (`M · 34`/`M · 35`/`M · 36`) in `summer-prep/page.tsx` are internally consistent with the renumbering documented in `src/app/page.tsx`.
