# Clean Tech submodule audit — Summer Prep / Industry Report

Scope: `beta/modules/overview-industry/cleantech/{page.tsx,EmissionsSunburst.tsx,ExternalRolePanel.tsx,export.ts}`,
`beta/modules/overview-industry/cleantech-catalogue.ts` (2142 lines), `cleantech-external-role.ts` (826 lines),
`nace-2-1.ts`, `nace-emissions-layer.ts`.

Baseline: PR #406 (commits `c5d3d2c`, `29790d97`) already fixed Aramis CCS support figures/FID timing, HEINEKEN
Seville metric framing, Stegra/Boden strain flag, and Porthos H2 2027 reconciliation. None of those are re-reported
below. All findings verified read-only; no repo files were edited.

Findings are ranked by impact within each dimension. ~28 findings total.

---

## 1. FACT-CHECK

**1. CRITICAL — `cleantech-external-role.ts:725-727` — 2040 target headline is now stale policy framing**
Quote: `'−90 to −95% net GHG by 2040'` … `'the preferred option of the Commission's 2040-target impact assessment (vs 1990), in line with the ESABCC advice'`
Issue: This was accurate for the 2024 impact assessment, but the EU has since **legislated** a different, final number: Council and Parliament agreed in Dec 2025, and the amended European Climate Law — Regulation (EU) 2026/667, in force since 7 April 2026 — sets a legally binding **flat 90%** net GHG reduction for 2040 (not a range), with an 85% domestic floor and up to 5% international credits from 2036. For a tool dated "today" = 2026-07-15, presenting "90–95%" as the current framing (sourced only to the 2024 IA) is stale and could mislead a reader into thinking the range is still live policy.
Fix: State the adopted 90% target first (cite Regulation (EU) 2026/667 / Council press release), and keep the IA's 90–95% preferred-option range and the ESABCC's 90–95% recommendation as clearly-dated 2024 analytical context feeding into it.
Source: https://www.consilium.europa.eu/en/press/press-releases/2026/03/05/2040-climate-target-council-gives-final-green-light/ ; https://www.europarl.europa.eu/news/en/press-room/20260205IPR33620/eu-climate-law-a-2040-emissions-reduction-target-of-90-for-the-eu

**2. MAJOR — `cleantech-catalogue.ts:800-813` — LEILAC-2 timeline is ~5 years stale**
Quote: `fid: 'EU-funded demonstrations (not commercial FIDs) — LEILAC-2 targeting operation ~2025'`, source dated 2021.
Issue: LEILAC-2 only completed pre-FEED and entered FEED in late 2025/early 2026; construction has not started; commissioning is now guided for 2026, not 2025.
Fix: "Pre-FEED completed; FEED phase entered late 2025 — commissioning now targeted 2026," citing a current LEILAC source.
Source: https://www.leilac.com/news/leilac-2-gets-new-improved-design-revised-timeline/ ; https://www.leilac.com/report/leilac2-pre-feed-report/

**3. MAJOR — `cleantech-external-role.ts:439-441` — battery capacity trajectory predates the Northvolt collapse**
Quote: `'EU holds only ~6.5% of global battery-cell production'` … `'planned capacity would lift it to ~15%'` (Draghi 2024).
Issue: That "~15%" trajectory leaned heavily on Northvolt, Europe's flagship gigafactory, which went bankrupt in March 2025 (Skellefteå output collapsed from a planned 16 GWh to ~1 GWh before assets were sold to Lyten in Aug 2025). No caveat reflects this; the single largest project behind the projection has since failed, even as other capacity (e.g. CATL Debrecen) fills part of the gap.
Fix: Add a footnote flagging the Northvolt bankruptcy and point to more current 2025/26 capacity data.
Source: https://www.eurofound.europa.eu/en/publications/all/battery-manufacturing-in-the-eu-from-hope-to-crisis-to-hope-again ; https://www.europarl.europa.eu/RegData/etudes/BRIE/2025/767214/EPRS_BRI(2025)767214_EN.pdf

**4. MINOR — `cleantech-catalogue.ts:596-608` — ELYSIS Alma entry uses a superseded 2021/2024 milestone**
Quote: `fid: 'Prototype cell construction/start-up from 2024; first technology licence issued'`
Issue: A materially newer milestone (Nov 2025) exists: ELYSIS started up its full 450 kA commercial-size inert-anode cell at Alma — a first at this scale — now in multi-year performance testing, with a 10-cell Arvida demo plant planned (~2027).
Fix: Cite the Nov 2025 startup and Arvida plans; bump TRL note toward "TRL 7 (full-scale cell operating, multi-year validation)".
Source: https://elysis.com/en/elysis-achieves-breakthrough-with-commercial-size-cell-a-first-in-aluminium-production-using-the ; https://www.miningweekly.com/article/major-step-forward-for-emissions-free-aluminium-smelting-2025-11-14

**5. MINOR — `cleantech-catalogue.ts:382-390` — thyssenkrupp tkH2Steel completion year off by ~1 year**
Quote: `'Under construction (~2027)... runs on natural gas until ~2028'`
Issue: Public sourcing indicates plant completion targeted **end-2026**, first hydrogen use planned 2028, full switch by 2029 — the "~2027" completion marker is imprecise (the "gas until ~2028" part is broadly right).
Fix: "Under construction, plant completion targeted end-2026; first H₂ use planned 2028, full switch by 2029."
Source: https://www.midrex.com/company-news/thyssenkrupp-steel-receives-construction-approval-for-hydrogen-ready-dri-smelter-project/

**6. MINOR — `cleantech-catalogue.ts:1497-1499` — EU industrial-heat pilot auction outcome now known but not reflected**
Quote: `'Terms and conditions published October 2025 — policy instrument, not a plant'`, status `'announced'`.
Issue: The auction (IF25 Heat) has since closed: the Commission awarded **€400m to 65 projects** (results ~25 May 2026, ~6.6 Mt CO₂ avoided over 10 years) against the €1bn ceiling quoted. A second round (IF26 Heat) is now the live one.
Fix: Update status and note the €400m/65-project outcome, or flag IF25 as concluded / IF26 as open.
Source: https://www.pv-magazine.com/2026/05/25/eu-awards-e400-million-to-65-industrial-heat-projects-in-auction/

**7. MINOR — `cleantech-external-role.ts:312-314` — solar-import value off by ~€0.1bn**
Quote: `'98% of EU solar-panel imports came from China in 2024 (€10.8 bn)'`
Issue: The 98% share is exact; Eurostat's Oct-2025 release states €10.9bn (some EU sources cite €11.1bn on a slightly different scope), not €10.8bn.
Fix: Correct to €10.9bn per the cited Eurostat release.
Source: https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251009-2

**8. MINOR — `cleantech-external-role.ts:605-607` — REPowerEU heat-pump goal stated without the shortfall**
Quote: `'REPowerEU goal: 10 million additional heat pumps by 2027, ~30 million by 2030'`
Issue: Target is quoted correctly, but EU heat-pump sales fell ~23% in 2024 (~2.1M units, back to pre-war levels) and only partly recovered in 2025 (~2.3M) — running well below the pace needed for 30 million by 2030. Presented alone, the target overstates how "on track" the sector is, which matters given this industry's competitiveness ranking (#2 in EXTERNAL_PRIORITIES) leans partly on policy-demand momentum.
Fix: Add a note that 2024–2025 installation trends are running below the required pace.
Source: https://sigmaearth.com/heat-pump-sales-in-europe-drop-23-returning-to-pre-ukraine-war-levels/ ; https://heatpumpswatch.org/are-the-ambitious-heat-pump-targets-achievable/

**9. MINOR — `cleantech-catalogue.ts:1645-1653` — Holland Hydrogen I (Shell) presents a smoother history than actual**
Quote: `'FID 2022; under construction, commissioning due 2026'`
Issue: Not wrong, but omits that the project was reported "may never open" in March 2025 after a Dutch government "corrective factor" undercut its economics; it has since recovered toward the stated 2026 commissioning.
Fix: Optionally note the 2025 viability scare before resuming toward commissioning.
Source: https://nltimes.nl/2025/03/23/billion-euro-hydrogen-plant-rotterdam-may-never-open-industry-stalls

**10. MINOR — `cleantech-catalogue.ts:996` — ammonia "EU green-ammonia pipeline" is generic where a concrete, on-point example exists**
Quote: `'Several announced; FIDs gated by hydrogen cost & offtake'`
Issue: Yara — the very company profiled two lines above at Herøya — shelved its own next-stage green-H₂ expansion at Porsgrunn and Sluiskil in Oct 2024, citing "low-value" economics. This would make the existing "scaleProblems" rationale concrete with a dated example.
Fix: Add the Yara Porsgrunn/Sluiskil shelving as a named illustration.
Source: https://www.qcintel.com/ammonia/article/yara-scraps-commercial-green-hydrogen-plans-in-norway-netherlands-31148.html

**11. UNABLE TO FULLY VERIFY — `cleantech-catalogue.ts:576` — aluminium "−45% (2005–2023)"**
Could not independently confirm the exact 45%/2005-2023 pairing (adjacent EEA/European Aluminium stats found: −50% carbon intensity since 1990, −5% since 2015, 78% renewable power 2023). Not contradicted, but worth the maintainers re-checking directly against the cited EEA brief rather than treating as settled.

**12. UNABLE TO FULLY VERIFY — `cleantech-catalogue.ts:748-757` — cement CCS MAC €30–107/tCO₂ figures**
Search surfaced different summary numbers from the same IEAGHG 2018-TR03 report (oxyfuel €42/t, MEA-reference €80/t, membrane-assisted €84/t) — compatible with, but not an exact match to, the file's €59–107/t framing. Low priority; spot-check against the primary PDF if precision matters.
Source: https://publications.ieaghg.org/technicalreports/2018-TR03%20Cost%20of%20CO2%20capture%20in%20the%20industrial%20sector%20cement%20and%20iron%20and%20steel%20industries.pdf

---

## 2. UI CHECK

**13. CRITICAL — whole submodule has zero dark-mode support (systemic)**
Files: `page.tsx`, `EmissionsSunburst.tsx`, `ExternalRolePanel.tsx` (verified: `grep -c "dark:"` = 0 in all three).
Issue: The rest of the beta chrome (`SiteHeader.tsx`, `SiteFooter.tsx`) and sibling modules (e.g. `beta/modules/summer-prep/page.tsx:141-239`) consistently pair every surface color with a `dark:` variant bound to `--mh-bg/--mh-fg/--mh-card/--mh-border/--mh-muted` (defined in `src/app/globals.css:119-130`). The Clean Tech submodule instead hardcodes `bg-white`, `text-grey-900`, `border-grey-200`, `bg-grey-50`, `bg-surface-blue`, etc. throughout (e.g. `page.tsx:68` `bg-grey-50`; `EmissionsSunburst.tsx:89` `border-grey-200 bg-white`; every `ProjectRow`/`DataLeaf`/detail-panel card). Toggling dark mode leaves this module's cards and page background hard-white while the header/footer and every other beta page around it go dark — a jarring, out-of-family regression across the entire figure and both side panels.
Fix: Re-skin using the same `dark:` + `--mh-*` pattern already established in `summer-prep/page.tsx`, or migrate the whole surface to a shared style once (many repeated card patterns would benefit from a shared `Card` component too — see Improvements).

**14. MAJOR — the sunburst wheel is not keyboard-operable**
`EmissionsSunburst.tsx:612-624` (arc paths) and `~660-673` (centre circle).
Quote: `<path ... onClick={() => clickArc(node)} onPointerEnter={e => showTip(e, node)} ... />` — no `tabIndex`, no `onKeyDown`, no `role="button"`.
Issue: The primary interactive figure of the whole module — the collapsible wheel itself — can only be operated with a mouse/pointer. A keyboard-only user cannot expand/collapse any ring, select a subsector, or reach the connected detail panel content at all (fails WCAG 2.1.1 Keyboard). The tooltip (hover-only, `onPointerEnter`) has no focus-triggered equivalent either.
Fix: Give each arc `tabIndex={0}`, `role="button"`, an `aria-label` describing the node and its state, and an `onKeyDown` handling Enter/Space (mirroring `clickArc`); show the tooltip content on focus as well as pointer-hover.

**15. MAJOR — two colour combinations fail WCAG AA contrast**
- `EmissionsSunburst.tsx:109`: `announced: { ..., cls: 'bg-surface-orange text-accent-orange border-accent-orange' }` — orange text (#FF9933) on near-white peach (#FFEDDE) computes to **≈1.87:1** contrast (needs 4.5:1 for this ~9px badge text). This is the "Announced (pre-FID)" status pill, used on real project rows.
- `EmissionsSunburst.tsx:150`: inactive TRL pips, `on ? 'text-white' : 'text-grey-400 bg-grey-100'` — light-grey-on-light-grey computes to **≈1.69:1**.
Fix: Darken the text or deepen the background for both (e.g. reuse the `accent-orange`-on-`surface-orange` pairing already used correctly elsewhere with a darker text token; for TRL pips use `text-grey-500`/`text-tertiary` at minimum on `bg-grey-200`).

**16. MINOR — support matrix breaks table semantics for assistive tech**
`ExternalRolePanel.tsx:111`: the industry-name cell is a `<td>` (`<td className="border-t border-grey-100 py-1 pr-3">`) rather than `<th scope="row">`, while the sector columns are correctly `<th>` (`ExternalRolePanel.tsx:94`). A screen-reader user navigating cell-by-cell loses the row/column relationship that identifies which industry a given support dot belongs to.
Fix: Change the industry-name cell to `<th scope="row">` (keeping its button/styling).

**17. MINOR — support-matrix dot `aria-label` is under-specified**
`ExternalRolePanel.tsx:155`: `aria-label={`${cell.role} support`}` — announces only "primary support" or "supporting support" with no industry/sector name; the fuller context lives only in a `title` attribute (`line 144`), which many screen readers/touch users never see.
Fix: `aria-label={`${t.name} → ${s.name}: ${cell.role} support`}`.

**18. Internal links verified — no broken hrefs found.** `page.tsx:73` (`/beta/overview-industry`) and the module's own route (`/beta/overview-industry/cleantech`) both resolve under `src/app/beta/overview-industry/**` (confirmed via directory listing); `@/data/clean-tech-reading-list` and `../downstream/export.ts` (referenced in `export.ts`'s docstring) both exist. No fix needed — listed for completeness.

---

## 3. QUALITY

**19. CRITICAL — the whole "Cross-cutting enablers" dataset is invisible in the live UI**
`cleantech-catalogue.ts:1453-1696` defines `CROSS_CUTTING_ENABLERS` (4 subsectors: electrification/heat pumps, CO₂ transport & storage — including Northern Lights, Porthos, Aramis, Project Greensand, Stockholm Exergi BECCS — clean hydrogen/electrolysers — ELYgator, Holland Hydrogen I — and circular economy). `export.ts` correctly includes it (`ALL_SUBSECTORS = CATALOGUE + CROSS_CUTTING_ENABLERS`, lines 119-122), but **`EmissionsSunburst.tsx`'s `buildWheel()` only iterates `CATALOGUE`** (`cleantech-catalogue.ts:290` `EMISSIONS_MAP.forEach` / `EmissionsSunburst.tsx:290` `entries.push` from `EMISSIONS_MAP`/`CATALOGUE` only) — `CROSS_CUTTING_ENABLERS` is never imported or rendered anywhere in `page.tsx`, `EmissionsSunburst.tsx`, or `ExternalRolePanel.tsx` (confirmed: zero matches for `CROSS_CUTTING_ENABLERS` outside `cleantech-catalogue.ts` and `export.ts`). The catalogue's own docstring (`cleantech-catalogue.ts:20-25`) explicitly claims these enablers are "held OUT of the subsector catalogue... but still surfacing the enablers those manufacturing subsectors depend on" — that surfacing does not exist on the page; a site visitor can only ever see this content by downloading the Excel workbook.
Fix: Add a fourth visual block (or a toggle) to `EmissionsSunburst.tsx` presenting the 4 cross-cutting enablers and their levers/projects, matching the docstring's stated design intent — this is some of the richest, most current project data in the file (Aramis FID guidance, Greensand as the first full-scale EU CO₂ storage, etc.) and it is currently unreachable from the page.

**20. MAJOR — `TECH_METRICS` key mismatch orphans the circular-economy lever's chart data**
`cleantech-catalogue.ts:1665,1678,1812,1922`.
The subsector id is `x-circular` (line 1665); its one technology has `id: 'x-circular-levers'` (line 1678); `TECH_CLASSIFICATION` correctly keys off `'x-circular-levers'` (line 1922) — but `TECH_METRICS` uses the wrong key, `'x-circular'` (line 1812: `'x-circular': { macLowEur: -50, macHighEur: 10, trlLow: 8, trlHigh: 9, ... }`), which matches no technology id at all (`x-circular` is only ever a subsector id, and `SUBSECTOR_IMAGES` correctly uses it as such at line 1947). Effect: `TECH_METRICS[node.tech.id]` (`EmissionsSunburst.tsx:503`, `972`) and `metric` in `export.ts:244` both resolve to `undefined` for this lever, so the MAC bar / TRL pips silently fall back to plain text in the UI, and the "MAC band (chart metric)" column is blank in the exported Technologies sheet — even though sourced numeric MAC/TRL data exists and was clearly intended to render.
Fix: Rename the `TECH_METRICS` key from `'x-circular'` to `'x-circular-levers'`.

**21. MAJOR — `nace-emissions-layer.ts` (582 lines) is entirely dead code**
Confirmed via repo-wide grep: `NACE_EMISSIONS`, `naceEmissionFor`, and `hasNaceEmission` are exported but never imported anywhere outside the file itself. The file's own docstring says this whole-economy GHG/MAC layer exists "so that clicking any arc of the sunburst surfaces 'how much does this activity emit...'" — but `EmissionsSunburst.tsx` never imports it; only `nace-2-1.ts` (the pure classification, no emissions data) is used. This is a substantial, well-sourced dataset (all 22 NACE sections) sitting completely unused.
Fix: Either wire it into the sunburst/detail panel (e.g. surfacing whole-economy context for divisions outside the ~18 covered subsectors), or, if it's intentionally staged for a future feature, note that in the file header so it isn't mistaken for a bug/orphan by future maintainers.

**22. MEDIUM/MAJOR — aluminium's wheel arc is sized ~9x smaller than the subsector's own stated footprint, unflagged**
`cleantech-catalogue.ts:2007-2016` (`EMISSIONS_MAP` aluminium block, `mt: 2.75`, `etsBasis: false`) vs. the aluminium subsector's own emissions text (`cleantech-catalogue.ts:572-573`): "≈2.75 Mt CO₂ direct... Sector ≈24 Mt CO₂e/yr incl. indirect." Because `exact: !shared` and aluminium is not a shared block, `buildWheel()` marks it `exact: true` (`EmissionsSunburst.tsx:301-303`), so the wheel draws it as a clean "≈3 Mt" arc with no asterisk/caveat — unlike the genuinely-shared cement/lime and chemicals blocks, which do get a `*` flag. A reader scanning the wheel's proportions will see aluminium as one of the smallest arcs, when on the sector's own fuller (indirect-inclusive) accounting it would be comparable in size to glass+ceramics combined.
Fix: Either size the aluminium arc using the ~24 Mt sector-inclusive figure (consistent with how food/drink and pulp&paper use sector-wide, not direct-only, figures), or mark it `exact: false` with a `*` and an explicit "direct emissions only, ~9x understates full footprint" caveat in the tooltip.

**23. MEDIUM — the wheel's central total mixes incompatible measurement bases without a prominent caveat**
The centre "≈588 Mt CO₂(e)/yr drawn" (`EmissionsSunburst.tsx:681`) sums 4 EU-ETS-basis blocks (steel, cement&lime, refining, chemicals — `etsBasis: true`, a subset of the 569 Mt EU ETS industry total) with 5 non-ETS sector-association figures from different organisations/years/system-boundaries (aluminium JRC direct-only, glass CINEA, ceramics Cerame-Unie, pulp&paper CEPI, food&drink FoodDrinkEurope) — see `cleantech-catalogue.ts:1996-2087`. The per-block scope badge and the Excel export's "% of EU ETS industry" column ("— different basis") do disclose this per-row, but the headline total itself is presented as one homogeneous number with only a generic starred-block footnote, not a "this total mixes ETS and non-ETS scopes" caveat.
Fix: Add one sentence near the centre total (or in the caption under the wheel) stating explicitly that the total blends EU ETS 2023 activity data with broader sector-association estimates on different boundaries/years.

**24. MINOR — `EMISSIONS_MAP_UNSIZED` render loop has no separator for >1 entries**
`EmissionsSunburst.tsx:728-732`: `{EMISSIONS_MAP_UNSIZED.map(u => (<span ...>{u.label} is not drawn (...).</span>))}` — currently harmless (only one entry, "nonferrous"), but if a second unsized subsector is ever added, the two `<span>`s will render with no separating space/punctuation.
Fix: Join with a space/comma, e.g. wrap in `.join()`-style rendering or add a leading space in the template.

---

## 4. IMPROVEMENTS (max 8)

1. **Surface the Cross-cutting enablers in the UI.** As found in #19, this is the highest-leverage single change: a "Side 1.5" panel or a 5th ring showing electrification, CCS networks, hydrogen and circularity levers would use data that's already fully written and sourced, and directly fulfils the module's own stated design intent.
2. **Adopt the site's `dark:` + `--mh-*` pattern module-wide** (ties to finding #13) — ideally via one or two shared components (`Card`, `SourceLink`, `StatusPill`) reused across `page.tsx`/`EmissionsSunburst.tsx`/`ExternalRolePanel.tsx` and the sibling `downstream`/`trade-flows` modules, so a future palette or dark-mode fix only needs to happen once.
3. **Add a "last verified" date per project row.** Given how many project statuses drift within months (Stegra, ArcelorMittal, FlagshipONE, Northvolt-adjacent battery claims, Holland Hydrogen I), stamping each `Project` with a `lastChecked` field would let the UI flag rows older than e.g. 6 months for a fact-check pass, and would have made several of this audit's findings self-evident from the data alone.
4. **Wire `nace-emissions-layer.ts` into the detail panel** for any NACE division a user clicks that falls outside the ~18 curated subsectors (e.g. non-ferrous metals, or the cross-cutting enablers once surfaced) — the data already exists (finding #21) and would let "click any arc" genuinely work economy-wide as the file's own docstring promises.
5. **Make the ETS-vs-sector-association basis mixing explicit and consistent.** Either normalise all subsector blocks to one basis (hardest, but most defensible) or add a persistent "basis" legend/toggle so a reader can filter the wheel to "EU ETS 2023 only" vs "full sector accounting" (ties to findings #22–23).
6. **Cross-link Side 1 and Side 2.** Side 2's `SECTOR_PATHWAYS` "industry" pathway text explicitly says "This is Side 1 seen from the modelling side" (`cleantech-external-role.ts:701`) — but there is no actual link/button from that pathway card back to the Side-1 wheel (or vice versa, e.g. from the steel/ammonia subsector detail to the electrolysers industry card). A couple of cross-navigation buttons would make the "two sides of one story" framing real, not just prose.
7. **Add a print/PDF-friendly or shareable static snapshot of the wheel's current fold/colour state** (e.g. via a URL query param encoding `collapsed`/`colorMode`/`selectedId`), so an ESABCC analyst can link a colleague directly to e.g. "steel levers, coloured clean-vs-old" instead of only being able to share the Excel workbook or a screenshot.
8. **Batch a fact-check refresh cadence into the Excel export itself** — e.g. a "Data vintage" sheet listing the oldest-cited source per subsector/lever (several here are 2018–2021 IEA/IEAGHG reports underpinning MAC figures still being used in 2026) so reviewers know where a refresh is most overdue without needing a manual audit like this one.

---

## Verified correct (do not re-touch)

- OVERVIEW_FACTS: energy-intensive industry ≈27% of EU industrial GHG, −42% since 2005, ~60% of cement GHG is process/calcination CO₂, ≈€73bn/yr external costs — all confirmed against the EEA's Feb 2026 "Zero pollution, decarbonisation and circular economy in energy-intensive industries" briefing.
- Material Economics "Industrial Transformation 2050" three-lever figures (58–171 / 143–241 / 45–235 Mt CO₂/yr) — confirmed verbatim.
- Steel EU ETS 2023 ≈96 Mt CO₂ and ≈145 Mt value-chain basis — confirmed against Sandbag's EUTL read.
- SSAB Luleå 12-month delay (end-2028 → end-2029, grid-related) — confirmed exactly.
- ArcelorMittal Bremen/Eisenhüttenstadt cancellation, June 2025, €1.3bn grant forgone — confirmed exactly.
- LeadIT green-steel announcement drop (~15 in 2021 → 2 in 2025) — confirmed.
- EPRS steel MAC €73–166/tCO₂ by 2030, 5–24% price premium — confirmed.
- Aluminium ≈2.75 Mt CO₂ direct (2022), JRC factsheet — confirmed (see also finding #22 on how this figure is *used*).
- Brevik CCS (operational summer 2025, ~400kt/yr) and Padeswood CCS (FID 25 Sept 2025, ~800kt/yr) — both confirmed exactly.
- Cement/lime EU ETS 2023 ≈124 Mt, glass ≈22 Mt direct, ceramics ≈19 Mt (64/19/17% combustion/electricity/process split) — all confirmed.
- Refining + chemicals ≈203 Mt = 36% of EU ETS industry (2023) — confirmed as Sandbag's corrected figure (a Feb-2026 corrigendum fixed an earlier erroneous 173 Mt/30%; the file already uses the corrected number).
- Yara Herøya (24MW, ~20,500 t/yr NH₃, FID Jan 2022, inaugurated June 2024), BASF/SABIC/Linde electric cracker Ludwigshafen (6MW, operating since April 2024, now commercial as Linde STARBRIDGE), Kassø e-methanol (42,000 t/yr, inaugurated May 2025) — all confirmed current.
- Northern Lights (Phase 1 operational Aug 2025, Phase 2 FID March 2025), Project Greensand (FID Dec 2024, storage from mid-2026), Stockholm Exergi BECCS (FID March 2025), ELYgator (FID July 2025) — all confirmed exactly.
- Esbjerg mega heat pump (70MW, first heat Nov 2024) and Arla Foods Falkenberg biomass switch (commissioned Dec 2024) — confirmed.
- All NACE Rev. 2.1 codes checked across both data files (steel, aluminium, non-ferrous, cement, lime, glass, ceramics, ammonia, HVC, chlor-alkali, methanol, refining, pulp & paper, food/beverages/tobacco, all 4 cross-cutting enablers, and all 6 external-role clean-tech industries) — every code matches the official label/hierarchy in `nace-2-1.ts` exactly; no mismatches found.
- Wind: EU turbine suppliers' 92% 2024 European-market share (GWEC) and EU power emissions −22% in 2023 — confirmed.
- IEA ETP2024 clean-tech market ">$2 trillion by 2035, tripling from ~$700bn (2023)" and China's ~60% global electrolyser capacity share — confirmed verbatim.
- NZIA figures in `cleantech-external-role.ts` (≥40% by 2030, 15% of world production by 2040) are already correctly framed as EU benchmarks/aims, not misrepresented as binding — no fix needed here (contrast with the aspirational/binding nuance already corrected elsewhere in the codebase by PR #406).
