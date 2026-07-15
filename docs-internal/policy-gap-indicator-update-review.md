# Review — the Indicator Update part of the Policy Gap 2.0 report

*July 2026. Covers the "data indicator update" machinery behind the Policy Gap 2.0
Project Workspace Indicator Database and the Summer Prep **Indicator Check**
(M·35 sub-module), plus the July-2026 data refresh applied on this branch.*

---

## 1. How the update machinery actually works (map)

Two refresh pipelines exist, keyed off **different id namespaces**:

| Pipeline | Trigger | Id namespace | Writes to |
|---|---|---|---|
| **Runtime "Refresh from source"** (`src/lib/project-workspace/live-sources.ts` + `/api/project-workspace/indicators/[id]/refresh`) | button in the workspace UI | ECNO ids (`fossil-power-share`, `ghg-total-net`, …) | Supabase `pw_indicator_points` directly (+ revision archive) |
| **Monthly CI refresh** (`.github/workflows/refresh-indicators.yml` → `scripts/esabcc-indicators/refresh-from-sources.mjs`) | cron 06:00 UTC on the 1st + manual dispatch | `esabcc-*` ids | `src/data/esabcc-indicators.ts` (new years flagged `afterReport`) + regenerated `supabase/migrations/055_backfill_indicator_points.sql` |

Read path: `listIndicators('policy-gap-2-0')` (`src/lib/project-workspace/db.ts`)
serves both the workspace Indicator Database **and** the Summer Prep Indicator
Check (`src/app/beta/summer-prep/indicator-check/page.tsx` is a dynamic server
component since PR #397's follow-up). With a configured database it reads
`pw_indicators`/`pw_indicator_points` and re-derives the `afterReport` flag from
the bundled metadata; without one it falls back to the bundled TS series. The
Indicator Check's "latest movement" figures are **derived**, not stored: baseline
= last non-`afterReport` point, movement = delta to the latest `afterReport`
point. So getting new movements to show requires exactly two writes — the TS
series (preview/fallback/seed) and `pw_indicator_points` (production DB), which
is what the 055 backfill migration is for. There is no third store.

The CI script is the documented, fact-checked path: per-recipe unit conversion,
an **anchor check** (a fetched value at the report's last year must be within
2× and same-signed, else the recipe is skipped), splice mode for scope-offset
sources, `refresh-provenance.json` + a regenerated fact-check PDF, and a PR
(never a direct push). It deliberately strips and **supersedes hand-sourced
interim points** with exact API values on the next run. Note the sandbox
network cannot reach ec.europa.eu / eea.europa.eu (see
`docs/how-to-access-eurostat-eea-data.md`), so exact values can only come from
the GitHub-runner side.

## 2. Findings

### Fixed on this branch

1. **The I3 recipe silently stopped updating (fraction ÷100 vs percent).**
   `refresh-from-sources.mjs` still converted the circular-material-use rate to
   a fraction (`v/100`) after the WP6 unit fix rescaled the TS series to
   percent-numbers — every subsequent run failed the anchor check
   (`0.010× off anchor`) and the indicator quietly stopped refreshing. The
   recipe now stores percent directly.
2. **`syncCombined()` in `build-points-backfill.mjs` truncated
   `combined_migrations.sql` to EOF from the 055 marker.** When 055 was the
   last block that was harmless; with 056–065 appended after it, the next CI
   refresh would have **deleted every later migration block** from the one-shot
   apply file. It now replaces only its own block. (The banner-bump regex also
   never matched the actual banner text; fixed, and made upward-only.)
3. **Six `%` indicators were still fraction-scale in the DB while the TS is
   percent-scale.** Migration 058 rescaled only the six with an ECNO twin. The
   remaining six (`esabcc-e2-res-noBio-power-share`, `esabcc-t6a-fossil-transport-share`,
   `esabcc-i3-circular-mat-use`, `esabcc-b5a-residential-fossil-share`,
   `esabcc-b5b-tertiary-fossil-share`, `esabcc-f-green-bonds-share`) rendered as
   e.g. "0.117 %" in the production Indicator Database, and a regenerated 055
   (which reads the percent TS verbatim) would have mixed scales inside one
   series. **Migration 075** rescales them to the percent convention;
   055 was regenerated to match.
4. **`combined_migrations.sql` was stale**: blocks 066–074 had never been
   appended (banner said `-> 065`). Appended, plus the new 075.
5. **~25 of the 45+ report indicators had no refresh recipe at all** and had
   been frozen at their report vintage (2019–2022) — this is the id-namespace
   gap: the runtime registry covers ECNO ids, the CI recipes covered only 12
   `esabcc-*` ids. Ten new CI recipes added (see §3).

### Known limitations (not fixed here)

6. **EHPA adapter is a deliberate dead end** (`live-sources.ts` throws for
   `heat-pump-stock`/`heat-pump-sales` — no public API). B6 can only be
   hand-sourced from EHPA press releases; note their country sample shifts
   (21 → 19 → 16 countries in 2023/24/25).
7. **Provenance `status: "up-to-date"` is ambiguous** — it means "no source
   years after the report anchor", which also happens when a source regresses
   or a dataset moves. Consider distinguishing "source has no newer years"
   from "source lost the anchor year".
8. **The runtime registry's `nitrogen-fertiliser-use` transform** divides
   tonnes by 1 000 (comment says Mt) — flagged for the ECNO side; the
   `esabcc-a3-fertiliser-use` series is scoped to *total* N (mineral + manure,
   from the inventory), which Eurostat `aei_fm_usefert` (mineral only) cannot
   continue — deliberately left without a recipe rather than splicing a
   non-representative trend.
9. **This session could not dispatch the refresh workflow** (the integration
   token lacks `actions: write`). The ten new recipes are therefore
   **empirically unvalidated** until the next run — but each is anchor-checked
   and/or splice-mode, so a wrong dataset/dimension code degrades to a logged
   skip, never to written garbage. To validate immediately: Actions →
   "Refresh indicators from Eurostat & EEA" → Run workflow on this branch with
   `push_branch=<this branch>`, `open_pr=false`.

## 3. Coverage extension added on this branch

New CI recipes (all splice-mode unless noted, so scope/level offsets cancel and
only the source's year-on-year movement is applied to the report baseline):

| Indicator | Source recipe | Mode |
|---|---|---|
| O1 total GHG (Climate-Law scope) | `env_air_gge` TOTX4_MEMONIA + intl maritime memo | splice |
| E2 fossil power share | `nrg_bal_peh` fossil legs ÷ TOTAL (new ratio kind) | ratio + splice |
| E2 non-bio RES power share | `nrg_bal_peh` hydro+geo+wind+solar ÷ TOTAL | ratio + splice |
| E3 grid GHG intensity | `env_air_gge` CRF 1.A.1 ÷ `nrg_bal_peh` GEP | ratio + splice (trend proxy) |
| T3a road passenger share | `tran_hv_psmod` CAR_BUS_TOT | splice |
| T5b zero-emission lorries | `road_eqs_lormot` LOR_HVY × ELC | direct (anchor-guarded) |
| T6a fossil transport share | `nrg_bal_s` FC_TRA fossil ÷ TOTAL | ratio + splice |
| L6 forest sink | `env_air_gge` CRF 4.A | splice (sign-preserving) |
| L7 non-forest LULUCF | `env_air_gge` CRF 4.B–4.E sum | splice |
| L8 bioenergy use | `nrg_bal_s` GIC biofuel legs | splice |

## 4. July-2026 hand-sourced data points (interim, superseded by the next CI run)

Added as `afterReport` points in `src/data/esabcc-indicators.ts`, mirrored to
the DB via the regenerated 055. Every value is from the named publisher;
"movement" values that will be replaced by exact Eurostat pulls are rounded as
published.

| Indicator | New points | Source | Confidence |
|---|---|---|---|
| E2 fossil power share | 2023 = 33.0, 2024 = 29.0, 2025 = 29.0 % | Ember European Electricity Review 2024/2025/2026 (EU-27 share of generation; Ember's 2022 = 39 % matches the series' 38.76) | high (published rounded) |
| E2 non-bio RES share | 2023 = 39.0 % | Ember EER 2024 (wind+solar 27 % + hydro 12 %) | medium (sum of rounded components, ±1 pp) |
| E4a solar additions | 2025 = 65.1 GW | SolarPower Europe, EU Market Outlook 2025–2030 | high |
| E4b wind additions | 2025 = 15.1 GW (EU-27) | WindEurope 2025 statistics (Feb 2026) | high |
| B6 heat-pump stock | 2023 = 23.96 M; 2024 = 25.5 M | EHPA press releases (21- resp. 19-country "Europe" sample — see finding 6) | 2023 high / 2024 medium |
| F5 cleantech investment | 2023 = 0.0007, 2024 = 0.0005, 2025 = 0.0004 (fraction of GDP) | Cleantech for Europe annual briefings: €11.6 bn (2023), €8.7–8.8 bn (2024), €8.2 bn (2025) ÷ Eurostat EU-27 nominal GDP (≈ €17.1 / 17.9 / 18.3 tn) | medium (GDP denominator approximated; series stores 1-significant-digit fractions) |

Deliberately **not** added, with reasons:

- **E3 grid intensity** — EEA has published 2023/2024 in interactive charts
  only ("11 % less in 2024 than 2023"); no exact g CO₂e/kWh value was
  retrievable, and Ember's number is a different scope (242 vs EEA 251 for
  2022). The new splice recipe will fill it with a consistent trend.
- **F2 green-bond issuance (bn EUR)** — the series is BloombergNEF EU-27;
  available continuations (CBI, AFME) use different scope ("Europe" incl. UK),
  currency and alignment methodology. The F2 *share* series is current to 2024.
- **F4 climate-patent share** — OECD ENV-Tech EU-27 values after 2019 not
  retrievable outside the OECD Data Explorer.
- **A7 bioenergy feedstock, A3 NUE, L3 afforestation, L5 settlement area** —
  the 2026 inventory (published April 2026) and the December-2025 JRC outlook
  contain the data, but no explicit values were retrievable through the
  sandbox network; sources documented for a manual pass.

## 5. Recommendations

1. Run the refresh workflow once on this branch (see finding 9) to validate
   the ten new recipes and replace the interim Ember/press-release values with
   exact Eurostat pulls where covered.
2. Extend `render_verification_pdf.py`'s fact-check to include hand-sourced
   points (they currently only appear in this review, not in the PDF).
3. Unify the two id namespaces (or at least register the `esabcc-*`
   duplicates in the runtime registry) so the workspace refresh button also
   works for report-coded indicators.
4. Regenerate/audit `combined_migrations.sql` on every migration-adding PR —
  066–074 were missing for weeks without anything catching it.
