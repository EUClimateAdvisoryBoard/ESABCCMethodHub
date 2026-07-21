# Indicator Check — data-provenance & update audit (July 2026)

*Per-indicator verification of the Summer-Prep **Indicator Check** page
(`/beta/summer-prep/indicator-check`), which reads the ESABCC report progress
indicators from the Policy Gap 2.0 workspace database (`esabcc-*` series in
`src/data/esabcc-indicators.ts`).*

**Question asked:** for every indicator, is the datasource used the *same one the
original ESABCC 2024 report used*, is the link correct, and is there newer data
available at that source?

## Method
1. **Ground truth for "what the report used":** extracted the *actual* `Source:`
   citation from every figure sheet of the report's own workbook
   `ESABCC_report_Towards EU climate neutrality_underlying data.xlsx`
   (70 figure sheets, one per indicator). This is what the report itself declares.
2. **App side:** parsed `source` / `sourceUrl` / data points from
   `src/data/esabcc-indicators.ts` (97 series).
3. **Live check:** Eurostat and EEA are reachable through the agent proxy, so each
   series was checked against its live source for (a) the latest year now published
   and (b) whether the shown values reproduce. Non-API sources (SolarPower Europe,
   WindEurope, EHPA, BNEF, FAOSTAT, OECD, JRC, Green Steel Tracker, Pocketbook,
   FFST, Cleantech for Europe) checked via web.

**Headline:** sources match the report almost everywhere. The problems are
(1) **one confirmed wrong value (O1 2024)**, (2) **several wrong/misleading source
*links*** even where the source *name* is right, and (3) **many series frozen at
their 2021 report vintage that now have 2–3 newer years available**.

---

## Priority issues (fix these first)

### 1. O1 — Total EU GHG emissions: 2024 value is wrong ★
App shows `2023 = 3104.6 → 2024 = 3222.1` (an **increase**). The live EEA/Eurostat
inventory (`env_air_gge`, EU27_2020, GHG) gives, on the same gross-excl-LULUCF basis
the series tracks:
`2022 = 3359.6 → 2023 = 3088.3 → 2024 = 3017.2` (a **decrease**, EEA: −3% vs 2023).
The app's 2022/2023 match the real series within ~1 %; **2024 = 3222.1 is ~205 Mt too
high and moves the wrong direction.** It should be ≈ 3017 (decrease). This is the
page's flagship indicator and its "biggest move" card.
Also note "European Climate Law scope" legally means *net* of LULUCF (`TOTXMEMO`:
2024 = 2786.2); the series actually carries the *gross* total — same choice the report
made, so consistent with the report, but the label is loose.
Working link: `https://ec.europa.eu/eurostat/databrowser/product/view/env_air_gge`

### 2. Wrong or misleading source *links* (source name OK, URL points elsewhere)
| Code(s) | Problem | Should point to |
|---|---|---|
| **A3 (NUE)** | `sourceUrl` DOI `10.1093/jambio/lxac084` resolves to an **unrelated turfgrass-fungi microbiology paper** — dead/wrong citation. | Ludemann et al. 2024, ESSD, `10.5194/essd-16-525-2024` (data only to 2020). Also a real source *mismatch*: the report's Fig 58 NUE is derived from the CRF inventory, not Ludemann. |
| **A4 (all consumption/production/herd)** | All A4 sub-series link to Eurostat `apro_mt_lscatl` (a livestock-population table). Consumption rows have **no data there at all**; production reproduces from `apro_mt_pann`; dairy from `apro_mk_farm`; herd totals match **FAOSTAT**, not the linked Eurostat table. | consumption → FAOSTAT FBS; meat production → `apro_mt_pann`; milk → `apro_mk_farm`. |
| **B4 (dwellings, floor area, residential & tertiary surface)** | Labelled "Eurostat (Building Stock Observatory, demo_pjan)" but the link is Eurostat `demo_pjan` (population only) — it contains no dwelling/floor-area data. Report source is the **European Building Stock Observatory**. Only B4 (population) legitimately uses `demo_pjan`. | BSO database for the four building series; keep `demo_pjan` only for population. |
| **I2 (all steel/cement/chemicals)** | Link is the generic PRODCOM homepage; label "Eurostat PRODCOM + Eurofer/Cembureau" is a **source substitution** — the report used **Eurofer** (steel), **Cembureau/Cement Europe** (cement), Eurostat **DS-056120** (chemicals — genuinely PRODCOM, so OK). | commodity-specific deep links (Eurofer stats, Cement Europe report, DS-056120 databrowser). |
| **I7b, I7c** | Attributed to internal "ESABCC project database"; report used the **Cembureau** and **CEFIC** low-carbon-project maps. Reader can't verify freshness from the app link. | Cembureau / CEFIC map URLs. |
| **F2, F2 (share)** | Labelled **BloombergNEF**, but the shown percentages come from the **EEA/LSEG (Refinitiv)** green-bonds indicator — different provider, not comparable to the report's BNEF €bn series. | Decide one provider; relabel. |
| **T4** | Source name (EEA) is right and values are current, but the linked EEA *narrative* page is stale (text stops at 2023). | EEA CO₂-monitoring dataset `co2cars.apps.eea.europa.eu`. |
| **E4a / E4b/c** | Labelled "Eurostat (nrg_inf_epcrw)" but the post-report points are **SolarPower Europe / WindEurope** figures (Eurostat-implied additions differ materially; for wind the year-on-year trend even inverts). Report itself cited "Eurostat + WindEurope outlook" for wind, so wind is defensible — but the on-page label says only Eurostat. | relabel post-2022 points as SolarPower Europe / WindEurope. |
| **L6** | Labelled "EU GHG inventory (CRF)"; report Fig 69 is a **calculated composite** (wood harvesting + living-biomass sink), not a raw CRF line. | label as "…(CRF), calculated". |

### 3. Series frozen at 2021 report vintage — newer data now exists
These show **no post-report points** on the page even though the source has published
2–3 more years (all sources confirmed to now reach the stated year):

| Code | Source now reaches | Notes |
|---|---|---|
| **E5** electrification rate | 2024 | source has 2022/23/24; app shows only 2021 baseline |
| **I4** steel/cement/chemicals intensity | 2023–24 | derived (EEA emissions ÷ production); both inputs now to 2024 |
| **I2** steel-use, steel-trade, cement-use, chemicals-use, chemicals-trade | ~2024 | production series updated, these five not |
| **T3a** road passenger share | 2023 | Pocketbook 2025 ≈ 90.2 % |
| **T5b** zero-emission lorries | 2025 | AFO: 2023=10,371; 2024=15,947; 2025=29,053 |
| **T6b** food-crop biofuels | 2024 | Eurostat `nrg_ind_urtd` (SHARES successor) |
| **A2** bovine & dairy GHG (+ their intensities) | 2024 | inventory now to 2024; app frozen 2021 |
| **A3** fertiliser N use, **A3** NUE | 2024 / — | CRF to 2024; NUE source itself capped at 2020 |
| **A4** consumption (bovine/dairy/pig) | ~2022–23 | FAOSTAT FBS to 2023 |
| **A5** consumption (bovine/dairy/pig) | 2023 | FAOSTAT FBS |
| **A7** bioenergy feedstock | ~2023–24 | EU Agricultural Outlook 2025-2035 (Dec 2025) |
| **L2** all six land-area categories | 2023 (2024 in raw CRF) | app frozen 2021 |
| **L3** afforestation, **L4** deforestation, **L5** settlement area | 2024 | CRF 2026 submission |
| **B4** dwellings/floor-area/surfaces | post-2016/20 | BSO updated June 2026 (JS-only, exact years not pulled) |
| **F1** fossil-fuel subsidies | 2024 | FFST has 2024; app frozen 2023 |
| **F4** climate-patent share | >2019 | OECD; series-definition-dependent |

### 4. One-year lags & value drifts (lower priority)
- **O3** gross inland energy: 2024 available (15023.9); app's 2022/23 also run ~3 % high vs current Eurostat (revision).
- **I5** industrial FEC, **I6** industrial electrification: 2024 now available.
- **B5a / B5b** residential & tertiary fossil share: 2024 available; also the % magnitude
  doesn't reproduce from a naive fossil/total split — the report used a specific fossil
  definition worth re-checking against the workbook formula.
- **B2** buildings FEC, **T6a**, **L8**, **L7**, **L1**: already at 2024; minor revision drift only.
- **L1** net LULUCF: at 2024 but the magnitude (2023 = −215.5, 2024 = −231) runs ~15–19 Mt
  heavier than EEA's publicly-cited −198 / −212 — likely 2026-final-vs-approximated or a
  CO₂-only-vs-all-gas scope difference; worth a manual check.

---

## Sources that DO match the report and are current (no action)
O2 (PEC/FEC), E1, E2 (fossil & RES), E3, E6, I1, I3, T1, T2a, T2b, T3b, T4, T5a, T6a,
B1, B6, A1, A6, F3, F5 — source name matches the report's figure-sheet citation, the
correct dataset is used, and the app is at (or within one routine revision of) the
source's current latest year. Baseline values differ by <1–2 % in a few cases, which
is normal Eurostat/EEA back-revision, not a source problem.

---

## Reachability caveats (couldn't fully verify live)
- EEA GHG data viewer, BSO, OECD Data Explorer, JRC datam, and the industry project
  trackers (Green Steel / Cembureau / CEFIC) are JavaScript single-page apps with no
  plain CSV/API in static HTML — latest *year* confirmed via metadata/secondary
  sources, exact latest *values* not always pulled.
- FAOSTAT API (`fenixservices.fao.org`) was returning HTTP 521 (origin down) during
  the check — A4/A5 FAOSTAT values confirmed to reach 2023 via mirrors, exact figures
  unverified.

*Full per-batch working notes are in the session scratchpad `findings_b01…b16.md`.*
