# Summer Prep Audit — Indicator Check (Note 1) & Synergies/Trade-offs (Note 2)

Repo: /home/user/ESABCCMethodHub
Scope read in full:
- beta/modules/summer-prep/indicator-check/page.tsx
- beta/modules/summer-prep/synergies-tradeoffs/page.tsx
- src/data/summer-prep-synergies.ts
- src/app/beta/summer-prep/indicator-check/page.tsx (server wrapper)
- src/lib/project-workspace/db.ts (`listIndicators`)
- src/data/esabcc-indicators.ts (`ESABCC_REPORT_INDICATORS`, the data indicator-check actually renders)
- src/components/workspace/IndicatorModule.tsx (deep-link consumer)
- src/app/project-workspace/[projectId]/page.tsx

Git history checked: commit `f7ae9a3` ("fix(summer-prep): fact-check & strengthen M·37 literature note", 10 Jul 2026) performed a real citation-verification pass on `summer-prep-synergies.ts` — separate from, and not covered by, PR #406 (`29790d9`/`b83856d`, 15 Jul 2026), which only touched the Industry Report submodules (`cleantech-catalogue.ts`, `trade-data.ts`, `downstream-lead-markets.ts`, `industry-scenario-db.ts`). `esabcc-indicators.ts` (Indicator Check's data source) has **never** had a dedicated fact-check/audit commit — it has one commit total (its creation).

---

## 1. FACT-CHECK

### CRITICAL — indicator values silently stored as 0–1 fractions under a `'%'` unit (7 indicators)
**File:** `src/data/esabcc-indicators.ts`
Seven indicators declare `unit: '%'` but store raw fractions (0–1) instead of the 0–100 scale every sibling `%` indicator uses (e.g. `esabcc-e2-fossil-power-share`: 35.63–52.6; `esabcc-e5-electrification`: 21.23–23.28; `esabcc-i6-industry-electrification`: 31.71–33.76; `esabcc-t3a-road-share-passenger`: 80.82–86.5; `esabcc-a3-nue`: 42.01–52.69; `esabcc-f-climate-patents-share`: 11.92–14.3 — all correctly 0–100). `Indicator Check` (`beta/modules/summer-prep/indicator-check/page.tsx:311-344`) renders these raw with `fmtNum()` and appends `r.ind.unit`, so these seven will display as e.g. **"0.34 %"** instead of **"34%"**.
Verified against real published figures (source URLs below):
| id / line | current value (e.g.) | should be | real-world check |
|---|---|---|---|
| `esabcc-e2-res-noBio-power-share` L131–143 | `0.3376` (2022) | `33.76` | EEA/Eurostat non-biomass RES electricity share ≈34% in 2022 |
| `esabcc-i3-circular-mat-use` L240–254 | `0.122` (2024) | `12.2` | Eurostat: EU circular material use rate rose **10.7% (2010) → 12.2% (2024)** — file has `0.108`→`0.122`, an exact fractional match confirming the bug |
| `esabcc-t6a-fossil-transport-share` L460–472 | `0.9322`–`0.9769` | `93.22`–`97.69` | EU transport is ~93–98% fossil-fuel dependent — matches at 100x |
| `esabcc-b5a-residential-fossil-share` L521–533 | `0.42`–`0.5661` | `42`–`56.61` | plausible EU residential fossil heating share |
| `esabcc-b5b-tertiary-fossil-share` L536–548 | `0.322`–`0.4698` | `32.2`–`46.98` | plausible EU tertiary fossil share |
| `esabcc-f-green-bonds-share` L776–788 | `0.0008`–`0.0808` | `0.08`–`8.08` | EU green-bond share of total issuance in low single digits, rising — matches at 100x |
| `esabcc-b3-commercial-renovation-rate` L1531–1546 | `0.006`, target `0.011` | `0.6`, target `1.1` | the indicator's **own description text** (L1536) literally says *"0.6% over 2016-2020, rising to 1.1%…"* — directly contradicts its own stored `0.006`/`0.011` |

Fix: multiply the affected `data[].value` and `targetValue` fields by 100 (or store consistently as 0–100 like every other `%` indicator), then re-run the Indicator Check page and Project Workspace Indicator Database tab (same `listIndicators` read) to confirm the "Report"/"Latest"/"New since report" numbers show correctly-scaled percentages.
Note: the `pctChange` (relative % move) shown as the "▲/▼ change vs report" badge is **not** affected — it's a ratio, so it's scale-invariant and already correct (see Quality §, "Verified correct").
Sources: https://ec.europa.eu/eurostat/databrowser/view/sdg_12_41/default/table , https://www.eea.europa.eu/en/analysis/indicators/circular-material-use-rate-in-europe , https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table , https://www.eea.europa.eu/en/analysis/maps-and-charts/percentage-of-green-bond-issuances-1

### MINOR — Tonelli et al. water-electrolysis figures not independently confirmable from the primary text
**File:** `src/data/summer-prep-synergies.ts:167` — *"Water electrolysis needs ~9 litres of purified water per kg of H₂ stoichiometrically — roughly 24 litres once water treatment is counted…"*
The DOI (10.1038/s41467-023-41107-x) resolves to the correct paper (Tonelli et al. 2023, Nat. Commun. 14:5532 — confirmed via Crossref), and the 9L stoichiometric / ~20-30L-with-treatment range is the literature consensus, but I could not open the paywalled full text to confirm Tonelli et al. itself states exactly "24 litres" (ResearchGate mirror returned HTTP 403). Not a red flag, but the specific number is attributed to the wrong level of precision for a paper I could only access via abstract/search snippets.
Source: general-literature figures corroborating 9–30 L/kg range: https://rmi.org/hydrogen-reality-check-distilling-green-hydrogens-water-consumption/ , https://pubs.acs.org/doi/10.1021/acsenergylett.1c01375

### Citations sampled and verified (no hallucinations found) — see "Verified correct" for the full list and DOIs.

---

## 2. UI CHECK

### MAJOR — hardcoded light-mode colors fail WCAG contrast in dark mode (both pages)
Computed contrast ratios (WCAG relative-luminance formula) against the actual dark-mode CSS var values (`--mh-bg:#0F1620`, `--mh-card:#18222E` from `src/app/globals.css:126-130`):

| Location | Color used, no `dark:` override | Background in dark mode | Contrast | WCAG min |
|---|---|---|---|---|
| `beta/modules/summer-prep/indicator-check/page.tsx:208-211` (summary tile inline `style={{color: t.color}}`, e.g. `#3D5265`, `#004B7F`, `#54728C`) | `#3D5265` | `--mh-bg` `#0F1620` | **2.24:1** | 4.5:1 |
| same, `#004B7F` value | `#004B7F` | `#0F1620` | **2.0:1** | 4.5:1 |
| same, `#54728C` value | `#54728C` | `#0F1620` | **3.6:1** | 4.5:1 |
| `indicator-check/page.tsx:112` (`Sparkline`, `const stroke = '#004B7F'`) | `#004B7F` | `--mh-card` `#18222E` | **1.77:1** | 3:1 (graphical) |
| `synergies-tradeoffs/page.tsx:58-60` (`text-[#004B7F]` "Mitigation" label) | `#004B7F` | `--mh-bg` `#0F1620` | **2.0:1** | 4.5:1 |
| `synergies-tradeoffs/page.tsx:64-66` (`text-[#007B6C]` "Adaptation / resilience" label) | `#007B6C` | `--mh-bg` `#0F1620` | **3.5:1** | 4.5:1 |
| `synergies-tradeoffs/page.tsx:34-40` (`KindBadge`, `color: m.color` on a 10%-alpha tint of the same color) — synergy `#007B6C` | text `#007B6C` vs. blended badge bg | `#18222E` card | **2.84:1** | 4.5:1 |
| same, trade-off `#B83230` | text `#B83230` vs. blended badge bg | `#18222E` card | **2.57:1** | 4.5:1 |

Unlike the rest of both files (which correctly pair every `text-[#3D5265]/NN` with a `dark:text-[var(--mh-muted)]` or similar), these specific spans use a bare hex value with no `dark:` class and no reference to the `--mh-*` tokens, so they keep their light-mode tuning against a near-black background. `mixed` kind (`#FF9933`) passes at 6.36:1 — only `synergy` and `trade-off` fail.
Fix: replace the hardcoded colors in these specific spots with theme-aware pairs, e.g. `text-[#3D5265] dark:text-[var(--mh-fg)]` for the summary tiles, and for the badge/label colors either lighten them for dark mode (`dark:text-[#4FB8A8]`-style brighter variant) or drive them off `--mh-fg`/`--mh-muted` with the category color reserved for the background chip only.

### MAJOR — Supabase fetch errors are silently indistinguishable from "no indicators"
**File:** `src/lib/project-workspace/db.ts:688-694`
```
const { data: rows } = await sb
  .from('pw_indicators')
  .select('*')
  ...
if (!rows || rows.length === 0) return [];
```
The Supabase `error` field is destructured away and never checked. A failed query (RLS error, network blip, bad credentials) returns `rows === null`, which this code treats identically to "the project genuinely has zero indicators" — it returns `[]`. `Indicator Check`'s summary tiles then show `0 / 0 / 0 / 0` and the page falls through to `beta/modules/summer-prep/indicator-check/page.tsx:384-388`: *"No indicators match the current filter."* — a message that blames the user's filter selection for what could be a full backend outage. There is also no `error.tsx` or `loading.tsx` anywhere under `src/app/` (checked repo-wide), so an actual thrown exception (not just a null/empty response) would fall through to Next.js's bare default error screen.
Fix: check `error` from both Supabase calls in `listIndicators`, log/report it, and have the server wrapper (`src/app/beta/summer-prep/indicator-check/page.tsx`) pass a distinct `error` flag/prop so the dashboard can render "couldn't load the indicator database" instead of the generic empty-filter message; add `src/app/beta/summer-prep/loading.tsx` (or a segment-level one) for the `force-dynamic` fetch.

### MINOR — no loading state for a `force-dynamic` page
**File:** `src/app/beta/summer-prep/indicator-check/page.tsx:18` (`export const dynamic = 'force-dynamic'`)
No `loading.tsx` exists at any level above this route, so a slow `listIndicators` call (cold Supabase connection, `ensureSeedDataFor` backfill writes) blocks navigation with no skeleton/spinner.
Fix: add a `loading.tsx` alongside the route, mirroring the card-grid skeleton pattern likely already used elsewhere in the Project Workspace.

---

## 3. QUALITY

### CRITICAL (cross-referenced from Fact-Check) — see the 7-indicator fraction/percent bug above; this is simultaneously a data-model integrity defect (`esabcc-indicators.ts` is otherwise internally 0–100-scaled) and a factual-display defect.

### MINOR — `esabcc-b3-commercial-renovation-rate` internally contradicts its own description
**File:** `src/data/esabcc-indicators.ts:1536-1546`
Description text says "0.6% … rising to 1.1%" while `data`/`targetValue` store `0.006`/`0.011`. Its sibling `esabcc-b3-residential-renovation-rate` (L1513-1528) stores `1.000` for a stated "1.0%" — i.e. the *residential* entry is correctly scaled and the *commercial* entry is not, so the pair is internally inconsistent with each other, not just with the rest of the file.
Fix: same as above — scale to `0.6` / `1.1`.

### Verified correct — no duplicate IDs, no cross-file taxonomy drift
Programmatically checked: 97 unique `id`s in `esabcc-indicators.ts`, 20 unique `id`s in `summer-prep-synergies.ts` — zero collisions in either file. The `SUBSECTOR_ORDER` labels ("Iron & steel", "Road passenger (cars & vans)", etc.) and the ReFuelEU/FuelEU regulation citations line up with the same regulation numbers used elsewhere in `src/data/sector-frameworks.ts` (`Reg (EU) 2023/2405`, `Reg (EU) 2023/1805`).

### Verified correct — `pctChange` math
**File:** `beta/modules/summer-prep/indicator-check/page.tsx:73-76`
```
pctChange = ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100;
```
Correctly uses `Math.abs()` on the denominator (avoids a sign flip when the baseline itself is negative), only computes when `hasUpdate` is true, and is scale-invariant — so the seven fraction-scaled indicators above still show the *correct* relative "±X.X%" change badge even though their absolute values mis-render. Baseline is correctly taken as the last **pre**-report point and latest as the last point overall (`readIndicator`, L65-86); `afterReport` re-derivation in `db.ts:740-750` (matching year against the bundled metadata since the DB table has no `afterReport` column) is a sound design and was spot-checked against 3 indicators — years align.

### Verified correct (false-positive avoided) — `esabcc-t5a-zev-share-newcars`
Values 0.01→14.60 across 2010–2023 look superficially like the same fraction bug (sub-1 values in early years) but are genuine, correctly-scaled percentages: EU BEV+FCEV new-car share truly was ~0.01% in 2010, rising through ~5.4% (2020), ~8.9% (2021), ~13.4% (2022) — consistent with known EV-market-share trajectories. Not a bug.

---

## 4. IMPROVEMENTS (max 8)

1. **Fix the 7 fraction-scaled `%` indicators** in `esabcc-indicators.ts` (multiply by 100; also fix `esabcc-b3-commercial-renovation-rate`'s `targetValue`), and add a regen-time invariant in `scripts/esabcc-indicators/build.py` that rejects any `unit: '%'` indicator whose values fall entirely below 1.5, to stop this class of bug from re-appearing after a `--new-only` regen.
2. **Make `listIndicators` surface fetch errors** instead of collapsing them into `[]`; thread an `error` prop into `IndicatorCheckPage` so a backend outage renders as "couldn't load the indicator database" rather than "no indicators match the current filter."
3. **Add `dark:` overrides (or swap to `--mh-fg`/`--mh-muted`) for the hardcoded `#3D5265`/`#004B7F`/`#007B6C`/`#54728C` text and stroke colors** in both pages' summary tiles, sparkline, Mitigation/Adaptation mini-labels, and `KindBadge` — all currently fail WCAG contrast against the dark theme (measured 1.77–3.6:1 against 3–4.5:1 minimums).
4. **Add a route-level `loading.tsx`** for `src/app/beta/summer-prep/indicator-check` (and ideally `synergies-tradeoffs`) given the `force-dynamic` Supabase read has no visible in-flight state today.
5. Since the Note-2 citation-verification claim on the landing page and in `summer-prep-synergies.ts` genuinely holds up (independently re-checked via Crossref for 15 DOIs), consider running the **same fact-check discipline on `esabcc-indicators.ts`** next — it has never had a dedicated review commit and is exactly where the fraction/percent bug above was hiding.
6. The Tonelli et al. (2023) "~24 litres" figure (L167) should be traced to the exact page/table in the paper rather than left as an inferred number, or softened to "on the order of 20–30 litres" to match what's actually verifiable in open sources.
7. `readIndicator`'s `post` (new-since-report points) array is unbounded — a long-running indicator could show many "new since report" values in the card footer; consider capping the inline list (e.g. "+N more") for visual consistency with the Sparkline's `slice(-10)` cap.
8. Add a small legend note next to the `KindBadge`/filter-chip colors (`synergy`/`trade-off`/`mixed`) clarifying they're colorblind-safe only via the accompanying `＋`/`⚠`/`≈` glyphs — worth a quick contrast/colorblind-simulator pass now that the underlying hex values are being touched for fix #3.

---

## Verified correct (summary list)

**Citations (Crossref cross-checked, title/author/journal/volume/page all match):**
- Sharifi (2021) Sci. Total Environ. 750:141642 — https://doi.org/10.1016/j.scitotenv.2020.141642
- Sharifi (2020) J. Cleaner Prod. 276:122813 — https://doi.org/10.1016/j.jclepro.2020.122813
- Tonelli et al. (2023) Nat. Commun. 14:5532 — https://doi.org/10.1038/s41467-023-41107-x
- Vogl, Åhman & Nilsson (2018) J. Cleaner Prod. 203:736-745 — https://doi.org/10.1016/j.jclepro.2018.08.279
- Habert et al. (2020) Nat. Rev. Earth Environ. 1:559-573 — https://doi.org/10.1038/s43017-020-0093-3
- Rosa et al. (2021) Renew. Sustain. Energy Rev. 138:110511 — https://doi.org/10.1016/j.rser.2020.110511 (55% water-intensity increase and 0.7–575 m³/tCO₂ range both confirmed)
- van Vliet et al. (2016) Nat. Clim. Change 6:375-380 — https://doi.org/10.1038/nclimate2903
- Kempton & Tomić (2005) J. Power Sources 144:280-294 — https://doi.org/10.1016/j.jpowsour.2004.12.022
- Palin et al. (2021) WIREs Clim. Change 12(5):e728 — https://doi.org/10.1002/wcc.728
- Dobney et al. (2009) Meteorol. Appl. 16(2):245-251 — https://doi.org/10.1002/met.114
- Staples et al. (2018) Energy Policy 114:342-354 — https://doi.org/10.1016/j.enpol.2017.12.007
- Coffel & Horton (2015) Weather Clim. Soc. 7(1):94-102 — https://doi.org/10.1175/WCAS-D-14-00026.1
- Coffel, Thompson & Horton (2017) Climatic Change 144:381-388 — https://doi.org/10.1007/s10584-017-2018-9
- Izaguirre et al. (2021) Nat. Clim. Change 11:14-20 — https://doi.org/10.1038/s41558-020-00937-z
- Ademmer, Jannsen & Meuchelböck (2023) German Econ. Rev. 24(2):121-144 — https://doi.org/10.1515/ger-2022-0077
- IEA (2020) "Iron and Steel Technology Roadmap" (2.2 tCO₂/t BF-BOF figure confirmed) — https://www.iea.org/reports/iron-and-steel-technology-roadmap
- Material Economics (2018)/Sitra mirror, exact URL resolves — https://www.sitra.fi/wp-content/uploads/2018/06/the-circular-economy-a-powerful-force-for-climate-mitigation.pdf
- EEA (2024) EUCRA, "EEA Report 01/2024" confirmed — https://www.eea.europa.eu/en/analysis/publications/european-climate-risk-assessment
- ReFuelEU Aviation Art. 4(5) exclusion + Delegated Directive (EU) 2024/1405 Annex IX additions, both confirmed — https://eur-lex.europa.eu/eli/dir_del/2024/1405/oj/eng
- ESABCC report URL + Jan 2024 publication date confirmed — https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities
- IPCC AR6 WGII Ch.13 (Europe)/Ch.18 (Climate Resilient Development Pathways) and WGIII Ch.10 (Transport)/Ch.11 (Industry) chapter assignments are correct.

**Code/UI:**
- Deep link `?indicator=<id>` from Indicator Check into the Project Workspace correctly consumed client-side by `IndicatorModule.tsx:105-134` (`useSearchParams`) — pre-selects the indicator and switches view; verified by reading the consumer, not just the comment.
- No duplicate indicator or synergy-entry IDs (97 + 20, checked programmatically).
- `pctChange` arithmetic (sign, `Math.abs` denominator, baseline/latest selection) is correct.
- `esabcc-t5a-zev-share-newcars` and `esabcc-b3-residential-renovation-rate` are correctly scaled despite superficially resembling the fraction bug.
- All internal links checked resolve to real files/routes: `/beta/summer-prep/indicator-check`, `/beta/summer-prep/synergies-tradeoffs`, `/project-workspace/policy-gap-2-0`.
- `--mh-bg/--mh-fg/--mh-card/--mh-border/--mh-muted` are correctly defined for both themes in `src/app/globals.css:118-132` and correctly applied at the page-container level in both audited pages.
