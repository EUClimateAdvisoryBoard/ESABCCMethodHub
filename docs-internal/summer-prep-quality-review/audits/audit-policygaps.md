# Policy Gap side audit — ESABCC Method Hub Summer Prep

Scope: `beta/modules/policy-gaps/page.tsx` (Policy Gap Tracker), `beta/modules/summer-prep/policy-gaps-sectors/page.tsx` (Note 3), `src/data/summer-prep-sector-gaps.ts`, plus base data `src/data/policy-gaps.ts` (read for cross-referencing). Data is static (no API route — the tracker seeds from `POLICY_GAPS` and persists edits only in `localStorage`; routes are re-exported at `src/app/beta/policy-gaps/page.tsx` and `src/app/beta/summer-prep/policy-gaps-sectors/page.tsx`).

---

## 1. FACT-CHECK

### MAJOR

1. **`src/data/summer-prep-sector-gaps.ts:82`** — quote: `"the Combined Transport file is still in negotiation and delivery mechanisms are unproven"`.
   What's wrong: this materially undersells where the file actually stands as of mid-2026. The Commission announced its intention to **withdraw/abandon** the Combined Transport Directive recast at the end of 2025; the European Parliament rejected the withdrawal in late January 2026; Council negotiations are described in June 2026 press as a "stalemate" that has "lost momentum," with rail-sector associations making a last-ditch push to save the file. "Still in negotiation" reads as normal legislative progress, not a file that nearly died and remains at serious risk of collapse.
   Proposed fix: reword to something like *"the Combined Transport Directive recast came close to being withdrawn by the Commission in late 2025, was kept alive only after Parliament rejected the withdrawal (Jan 2026), and remains stalled in Council with no agreed text as of mid-2026 — the ambition gap is unresolved and the file's survival itself is in question."*
   Source: https://www.railwaygazette.com/freight/2026/06/04/rail-association-throw-last-hail-mary-to-save-combined-transport-directive/ ; https://www.cer.be/cer-press-releases/council-faces-stalemate-as-combined-transport-directive-loses-momentum

2. **`src/data/summer-prep-sector-gaps.ts:133–136`** (`cand-steel-lead-market`) — quote: `"refuted if the Industrial Decarbonisation Accelerator Act introduces binding content/procurement quotas."`
   What's wrong: (a) the act's name changed — von der Leyen renamed it the **Industrial Accelerator Act** in her September 2025 State of the Union address, and the Commission tabled the actual draft on **4 March 2026** (before this note's "mid-2026" cutoff), with "Made in EU"/low-carbon procurement content among its core measures. The note still frames this as a hypothetical future test rather than acknowledging a concrete proposal already exists and partially engages the question. This is a missed update, not just a naming nit.
   Proposed fix: rename to "Industrial Accelerator Act" and update the test to reflect that a draft (tabled 4 March 2026, with Made-in-EU/low-carbon procurement content) exists but is not yet adopted — the gap is "policy proposed, not yet enacted," not fully open.
   Source: https://www.sidley.com/en/insights/newsupdates/2026/04/industrial-accelerator-act ; https://single-market-economy.ec.europa.eu/publications/industrial-accelerator-act_en

3. **`src/data/summer-prep-sector-gaps.ts:102`** (`transport-biofuel-fraud`) — quote: `"The Union Database for Biofuels (mandatory from 2024)"`.
   What's wrong: overstated. The UDB became operational for registration in Jan/Nov 2024, but multiple 2025-era sources confirm the Commission was still negotiating with Member States on the date from which use becomes *mandatory* and sanctions can be imposed — there was no immediate enforcement in 2024. Calling it flatly "mandatory from 2024" overstates how resolved the traceability gap is, which matters because the note uses it to justify "partially-addressed" rather than "open."
   Proposed fix: soften to "operational since January 2024, with the delegated act setting a binding mandatory-use/sanctions date still pending agreement with Member States as of 2025–2026" — the "partially-addressed" verdict is still defensible but the reasoning should reflect that enforcement teeth are not yet in place.
   Source: https://vespertool.com/blog/the-udb-will-be-mandatory/ ; https://energy.ec.europa.eu/news/eu-database-biofuels-becomes-operational-2024-01-15_en

### MINOR / Verification notes (no change needed, but flagging basis)

4. **`src/data/policy-gaps.ts:66`** and **`beta/modules/policy-gaps/page.tsx:267,717`** — see UI/Quality section below (date error) — technically also a fact error since the ESABCC report was published **18 January 2024**, not January 2025; listed there because it's primarily an internal-consistency bug.

5. Spot-checked and **correct**: ESPR = Regulation (EU) 2024/1781, in force 18 July 2024, replacing the energy-only Ecodesign Directive; NZIA = Regulation (EU) 2024/1735, in force 29 June 2024; TEN-T recast = Regulation (EU) 2024/1679, in force 18 July 2024; HDV CO2 standards = Regulation (EU) 2024/1610 (−45%/2030, −65%/2035, −90%/2040); NZIA Art. 23 CO2-storage target = 50 Mt/yr injection capacity by 2030; ReFuelEU Aviation Art. 4(5) excludes food/feed-crop fuels from the SAF definition; FuelEU Maritime treats food/feed-crop biofuels as fossil-equivalent (no favourable emission factor); RED III/II Art. 26 keeps the 7% food/feed-crop cap; Clean Industrial Deal launched 26 Feb 2025; Affordable Energy Action Plan (COM/2025/79) launched 26 Feb 2025; extra-EU aviation remains under CORSIA (EU ETS exemption reviewed in 2026, expires 2027, no scope change adopted yet); 50% of extra-EU maritime emissions are within EU ETS scope (the other 50% outside); non-CO2 aviation effects are MRV-only since 1 Jan 2025 (first reports due 31 March 2026), no pricing/mitigation measure adopted; Lee et al. 2021, *Atmospheric Environment* 244:117834, correctly cited for the ~66% non-CO2 share of aviation's effective radiative forcing.

---

## 2. UI CHECK (dark mode, tables, accessibility, links, export)

### MAJOR

6. **`beta/modules/policy-gaps/page.tsx:293–301` (Excel export)** — the "Summary" sheet's "By current status" and "By gap type" breakdowns (`stats.byStatus`, `stats.byType`) are computed from the full `gaps` array, while the "Policy gaps" sheet exports only `filtered` rows. If a user filters (e.g. to "Transport" only) and exports, the workbook's data sheet shows the filtered subset but the summary sheet's counts describe the entire, unfiltered tracker — a real mismatch inside the same exported file.
   Fix: compute `stats` from `filtered` (or add a second, clearly-labelled "whole tracker" total alongside a "current view" breakdown) so the two sheets agree.

7. **`beta/modules/policy-gaps/page.tsx`** — the page never renders `<SiteFooter />`. Every other module page checked (31 files, including the sibling Note 3 at `beta/modules/summer-prep/policy-gaps-sectors/page.tsx`) renders `SiteFooter`. This is a visible chrome inconsistency on a page that otherwise mirrors the rest of the site's layout.
   Fix: import and render `SiteFooter` at the end of the tracker's JSX, matching Note 3 and the rest of `beta/modules/*`.

### MINOR

8. **`beta/modules/summer-prep/policy-gaps-sectors/page.tsx:349`** — quote: `className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:bg-[var(--mh-card)]"` (candidate-gap subsector badge). Unlike the equivalent report-gap subsector badge at line 303 (`dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]`), this one has a `dark:bg` override but **no `dark:text` override** — the grey-blue label text stays `#54728C` in dark mode instead of switching to `var(--mh-muted)`, giving inconsistent contrast between the two visually-identical badge types.
   Fix: add `dark:text-[var(--mh-muted)]` to match line 303's pattern.

9. **`beta/modules/summer-prep/policy-gaps-sectors/page.tsx:346`** — the candidate-gap card (`border-dashed border-[#FF9933]/70 bg-[#FF9933]/5`) has no explicit dark-mode override at all, relying on low-alpha compositing over whatever background is behind it. It happens to look acceptable in both themes because of the low alpha, but it's inconsistent with the report-gap card two sections up (line 300), which does declare `dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]`.

10. **`beta/modules/policy-gaps/page.tsx:482`** — the "Add a new gap" panel (`border-[#00928F]/40 bg-[#00928F]/5`) similarly has no `dark:` variant, same low-risk-but-inconsistent pattern as #9.

11. **`beta/modules/policy-gaps/page.tsx:603`** — the table's last `<th>` (over the Edit/Delete buttons) is empty: `<th className="px-3 py-2 font-semibold" />`. Screen-reader users get an unlabeled column header.
    Fix: add a visually-hidden label, e.g. `<span className="sr-only">Actions</span>`.

12. **Search scope** (`beta/modules/policy-gaps/page.tsx:151–157`) — the free-text search checks `title`, `description`, `instrument`, `quote`, `statusNote` but not `sector` or `reference`. A user typing "Ch. 6" or "Buildings" to jump to a chapter gets no hits unless the word also appears in the title/description.
    Fix: extend the `needle` check to include `g.sector.toLowerCase().includes(needle)` and `g.reference.toLowerCase().includes(needle)`.

13. **Inline-edit UX inconsistency** — the "Add gap" flow has an explicit Cancel button (`beta/modules/policy-gaps/page.tsx:580–585`) that discards the draft, but editing an existing row (`updateGap` fired directly on every keystroke, lines 637–660) has no Cancel — edits are committed to state (and then to localStorage) immediately, with only a "Done" button to close the editor. A user who opens Edit, changes the status, and wants to back out has no undo path short of manually reverting the text or hitting the page-level "Reset" (which discards *everything*, not just this row).

14. **Internal links**: verified all three cross-links from the Tracker's "Internal notes" strip (`/beta/summer-prep/indicator-check`, `/beta/summer-prep/synergies-tradeoffs`, `/beta/summer-prep/policy-gaps-sectors`) resolve to real route files under `src/app/beta/summer-prep/*`. No broken links found. Note 3, however, has no link back to the Tracker or to the other two prep notes — one-directional navigation.

---

## 3. QUALITY (data-model integrity, export correctness, dead code, filter/edit bugs)

### MAJOR

15. **Maritime subsector is empty in the landscape matrix** — `SECTOR_SUBSECTORS.Transport` (`src/data/summer-prep-sector-gaps.ts:34-41`) lists `'Maritime'` as a subsector, but no entry in `GAP_REASSESSMENTS` is tagged `subsector: 'Maritime'` and no `CANDIDATE_GAPS` entry has `subsector: 'Maritime'` either. The one report gap that substantively concerns maritime (`transport-extra-eu-exemption`, "half of extra-EU maritime transport remains exempt from the EU ETS") is bucketed only under `subsector: 'Aviation'`, even though its own reassessment note says "(also applies to Maritime)" (line 107). The result: the "Gap landscape — Transport" table renders a completely blank Maritime row (0 across all four gap types, 0 candidates), which reads to the sector lead as "no known gaps in Maritime" — clearly wrong, and avoidable given FuelEU Maritime alone raises several open questions (biofuel/RFNBO availability, well-to-wake accounting, port infrastructure).
    Fix: either (a) give the data model a `subsectors: string[]` (plural) field so one gap can appear in both Aviation and Maritime landscape cells, or (b) add at least one candidate gap under Maritime so the row isn't silently empty.

16. **Custom/added gaps are mislabeled as report baseline** — `commitAdd()` (`beta/modules/policy-gaps/page.tsx:211`) sets `reportStatus: 'open'` on every user-added gap, because the `PolicyGap` type only allows the literal `'open'`. When exported to Excel, every row — including gaps the Secretariat typed in themselves, which the Board never reviewed — gets `reportStatus: 'Open (Jan 2025)'` (line 267), implying it was a Board finding at the report baseline. This conflates "the Board found this open in the report" with "an analyst added this row later."
    Fix: either omit `reportStatus`/leave it blank for custom rows (e.g. make it optional and check `g.id` against a known-report-id set before rendering "Open (Jan 2024)"), or add a `source: 'report' | 'custom'` field and branch the export/label logic on it.

### MINOR

17. **Dead/fragile code**: `statusRoll` in `beta/modules/summer-prep/policy-gaps-sectors/page.tsx:118-127` initializes and increments a count for `'unknown'`, but the roll-up display (lines 272-284) only ever iterates `['open', 'partially-addressed', 'addressed']` — an `'unknown'` count is computed and then silently dropped. Harmless today (no `GAP_REASSESSMENTS` entry uses `'unknown'`), but if a future reassessment does, the number disappears from the UI with no indication.

18. Sector/tag taxonomy is otherwise consistent: `GAP_SECTORS` (12 report chapters, `src/data/policy-gaps.ts:104-117`) matches the sector strings used across the codebase; `SECTOR_SUBSECTORS`'s top-level keys (`'Industry' | 'Transport'`) match two of the 12 `GAP_SECTORS` values exactly; every id referenced in `GAP_REASSESSMENTS` (10 keys) resolves to a real `POLICY_GAPS` entry, and coverage is complete — all 3 Industry-tagged and all 7 Transport-tagged report gaps have a reassessment (no missing/orphaned ids in either direction). `CANDIDATE_GAPS` ids are cleanly namespaced with a `cand-` prefix so there's no collision risk with report-gap ids.

---

## 4. IMPROVEMENTS (max 8)

1. **Fix the Jan-2025/Jan-2024 baseline-date bug everywhere it appears** (`src/data/policy-gaps.ts:66`, `beta/modules/policy-gaps/page.tsx:267` and `:717`) — replace "Jan-2025"/"Open (Jan 2025)"/"January-2025" with "Jan-2024"/"Open (Jan 2024)"/"January-2024" to match `GAP_REPORT_META.published` ('January 2024') and the actual ESABCC publication date (18 Jan 2024). This is the single most visible, easily-fixed factual bug in the whole surface — it appears in the exported Excel file that gets shared outside the tool.
2. **Add column sorting** to the Tracker table (by sector, type, or status) — with 60+ rows and only filter dropdowns, users can't currently re-order to see e.g. all "open" gaps grouped, short of using the status filter one value at a time.
3. **Make the landscape matrix cells keyboard/screen-reader accessible** — currently the count + shading + `title` tooltip is the only way to know what a cell means; add a visually-hidden text equivalent ("3 report gaps, 1 candidate") per cell for consistency with the rest of the accessible-first UI.
4. **Cross-link Note 3 back to the Tracker and the other two prep notes** (mirroring the Tracker's own "Internal notes" strip) so analysts can navigate the three-note prep cycle in either direction.
5. **Surface the `reassessmentAsOf` provenance date more prominently on the Excel export** of the Tracker (it currently only appears in Note 3's UI copy, not in any export) so a shared spreadsheet still communicates "as of mid-2026, provisional, pending review" rather than reading as a settled Board judgement.
6. **Give `GAP_REASSESSMENTS`/`CANDIDATE_GAPS` a `lastCheckedAgainst` field** (e.g. a short list of the legislation each entry was checked against, with dates) so the next fact-check pass can tell which entries were verified this round versus untouched — this file is clearly due for the same fact-check pass PR #406 gave the Industry submodules, and future passes will hit the same problem without a way to tell what's fresh.
7. **De-duplicate the "Combined Transport Directive… TEN-T… " sentence** referenced in finding #1 into two separate, independently-scored assessments (one for the Directive, one for TEN-T) since their real-world status diverges sharply (TEN-T recast in force; Combined Transport Directive recast nearly withdrawn) — bundling them into a single "partially-addressed" verdict hides that divergence.
8. **Add a `Maritime` candidate or reassessment entry** (see finding #15) so the sector lead isn't shown a landscape with an entire silently-empty subsector.

---

## Verified correct

- ESABCC report "Towards EU climate neutrality: Progress, policy gaps and opportunities" — published 18 January 2024 (`GAP_REPORT_META.published = 'January 2024'` is correct).
- Report URL (`climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities`) resolves and matches the real report.
- ESPR = Regulation (EU) 2024/1781, in force 18 July 2024, replaces the energy-only Ecodesign Directive 2009/125/EC, first obligations (unsold textiles/footwear ban) from 19 July 2026, delegated acts rolling 2026–2030.
- Net-Zero Industry Act = Regulation (EU) 2024/1735, in force 29 June 2024; Art. 23 CO2-storage obligation targets 50 Mt/yr injection capacity by 2030 across 44 obligated entities.
- TEN-T recast = Regulation (EU) 2024/1679, in force 18 July 2024.
- HDV CO2 standards = Regulation (EU) 2024/1610, applies from 1 July 2024 (−45%/2030, −65%/2035, −90%/2040 vs. 2019 baseline).
- ReFuelEU Aviation (Reg. (EU) 2023/2405) Art. 4(5) excludes food/feed-crop biofuels from the SAF definition/mandate.
- FuelEU Maritime (Reg. (EU) 2023/1805) treats food/feed-crop biofuels as fossil-equivalent (no favourable emission factor).
- RED III (recast RED, 2023) Art. 26 retains the 7% food/feed-crop cap carried over from RED II.
- Union Database for Biofuels became operational for registration in Jan/Nov 2024 (mandatory-use date still being negotiated with Member States — see finding #3 for the nuance).
- Clean Industrial Deal launched 26 February 2025; Affordable Energy Action Plan (COM/2025/79) launched the same day, both emphasising lead-market/procurement tools.
- Industrial Accelerator Act (renamed from "Industrial Decarbonisation Accelerator Act") draft tabled 4 March 2026 — real, but the note's naming/timing is stale (see finding #2).
- Extra-EU aviation remains outside EU ETS (under CORSIA); the ETS exemption is under review with an expiry set for 2027, but no scope change has been adopted as of mid-2026 — "assessed unchanged" is defensible.
- Only 50% of extra-EU maritime voyage emissions are within EU ETS scope — confirmed.
- Non-CO2 aviation effects have been MRV-only since 1 January 2025 (first reports due 31 March 2026); no pricing/mitigation measure exists yet — "confirmed if… remain only monitored" is accurate as of now.
- Lee et al. (2021), *Atmospheric Environment* 244:117834, correctly cited for aviation's ~66% non-CO2 share of effective radiative forcing.
- AFIR (Reg. (EU) 2023/1804) heavy-duty charging/refuelling rollout is genuinely lagging relative to the HDV CO2 trajectory (10 Member States requested more flexibility in Dec 2025; AFIF funding exhaustion risk flagged into 2026-2027) — the candidate gap's premise holds up.
- All 12 `GAP_SECTORS` chapters, all cross-links from the Tracker, and the `GAP_REASSESSMENTS`/`POLICY_GAPS` id cross-references (10/10 Industry+Transport gaps covered) check out with no orphaned or missing ids.
