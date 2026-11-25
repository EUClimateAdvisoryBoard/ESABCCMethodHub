# Pathway screening: added sources

> AI-compiled — pending Secretariat verification.

This folder extends the three-set EU pathway screening in
[`EU_pathway_screening_three_sets.xlsx`](../../EU_pathway_screening_three_sets.xlsx) (built 23 Nov 2026) with
sources that are not in its database. The workbook's own build script (`build_xlsx3.py`) reads files that are
not in this repository, so the screening is re-implemented in
[`screen_three_sets.py`](screen_three_sets.py), which reads the workbook directly.

```bash
python3 -I scripts/pathway-screening/screen_three_sets.py --check
```

```bash
python3 -I scripts/pathway-screening/screen_three_sets.py --out scripts/pathway-screening/screen-result-2026-11-24.csv
```

`--check` screens the workbook alone and fails unless it reproduces 3 / 10 / 8 (and 23 ESABCC 2040 passes before
the main-run selection). The full run adds every file in [`additions/`](additions/) and applies
[`pathway-screening-overrides.json`](pathway-screening-overrides.json).

## Files

| File | Content |
|---|---|
| `additions/<source>_raw.csv` | One row per published value, in the format of the workbook's sheet Raw. `Value used = Value as published × Factor`; `Note` holds the page/table/row locator and any derivation. Rows with role `NET_INTL` (totals including international transport) are kept for reference and not screened. |
| `additions/<source>_scenarios.csv` | One row per pathway: `ID`, `Model`, `Scenario`, `main_run` (ESABCC 2040 main-run selection), `src`, `one_total` (industry reported as one total, as for POLIZERO). |
| `pathway-screening-overrides.json` | Exceptions to the workbook rules, one entry each, with a content-hash `id` (checked on every run) and a tagged `reason`. Delete an entry and re-run to reverse it. |
| `screen-result-2026-11-24.csv` | Result of the full run: cuts, limit values, set membership and the step where each pathway stops. |

## Sources added (24–25 Nov 2026)

| IDs | Source | Pathways | Result |
|---|---|---|---|
| 2000 | Agora Energiewende (2023), *Breaking free from fossil gas*, EU Gas Exit Pathway | 1 | ECL and ECL +10% (two start-year overrides) |
| 2010–2012 | UBA Climate Change 18/2026: EUBase, EUTarget, EUSupreme | 3 | none; EUTarget and EUSupreme stop at the land-sink risk level |
| 2020–2029 | EC SWD(2026) 616 (ETS review IA) | 10 placeholders | not checkable: no absolute economy-wide values published |
| 2050 | CLEVER (négaWatt, 2023), Open Energy Platform | 1 | none; final-energy filter |
| 2200–2201 | Compass Lexecon for BusinessEurope (2024) | 2 | none; no industry data (base year 2019 override only) |
| 2400 | JRC CETO 2024 (POTEnCIA) | 1 | ECL and ECL +10% |
| 2410–2412 | JRC GECO 2024 (POLES-JRC) | 3 | none; no industrial process CO2 published |
| 2420–2423 | EC 2040 IA SWD(2024) 63, S1/S2/S3/LIFE (Annex 8 graph data) | 4 | S2 → ECL +10%; LIFE → ESABCC 2040 (process-CO2 start-year override) |
| 2430 | CAN Europe/EEB PAC 2.0 (2024) | 1 | none; runs to 2040 only, no industry 2050 |
| 2500–2506 | NGFS Phase V, MESSAGEix-GLOBIOM downscaled to EU27 | 7 | none; all above zero in 2050 |
| 2510–2516 | NGFS Phase V, REMIND-MAgPIE 3.3-4.8 IPD-median (damage-feedback) runs | 7 | none; `main_run` FALSE for all: built on the retracted Kotz et al. (2024) damage function |
| 3000–3336 | Rodrigues et al. (2026), Nat. Commun., REMIND-EU, Zenodo 10.5281/zenodo.18661988 | 337 extracted, **1 screened** | only the reference run `14_Nzero_57_bio7p5` (ID 3162) is screened (override `source_representative`): ECL and ECL +10%. The other 336 sensitivities stay in `additions/`; screened, they would give 155 ECL and 184 ECL +10% members. |

Result: 1,219 → 1,260 pathways screened; ECL 3 → **6**, ECL +10% 10 → **14**, ESABCC 2040 8 → **9**.
The six ECL members are ESABCC 2023 REMIND 3.2 `rigid_bioLim7p5_300`, Schreyer REMIND-EU `07_NZ_CCS180_highImp` and
`07_NZ_CCS350_highImp`, Agora EU Gas Exit Pathway, JRC CETO 2024 and the Rodrigues et al. reference run.
Deleting the `source_representative` override screens all 337 Rodrigues runs (ECL 160, ECL +10% 197).

The column `File in this workspace` names the working copy used during extraction; the source documents are not committed. They are at:

- Agora: https://www.agora-energiewende.org/publications/breaking-free-from-fossil-gas (Annex 1 Table 1, Annex 2 Tables 2–3, pp. 64–65)
- UBA: https://www.umweltbundesamt.de/publikationen/pathways-to-an-eu-in-2050-net-zero-ghg-emissions (PDF `18_2026_CC_V2.pdf`)
- EC: SWD(2026) 616 via `publications.europa.eu/resource/celex/52026SC0616`
- Compass Lexecon: https://vno-ncw.nl/sites/default/files/energy-and-climate-transition-final-report.pdf (p. 19 table, p. 43 chart)
- JRC: https://jeodpp.jrc.ec.europa.eu/ftp/public/JRC-OpenData/ (POTEnCIA/CETO_2024, GECOutlook/GECO2024), CC BY 4.0
- EC 2040 IA: `policy_targets_2040_IA_Annex_8_graphs.xlsx` on climate.ec.europa.eu
- PAC 2.0: https://www.pac-scenarios.eu/ (Technical Summary, p. 138)
- NGFS Phase V: IIASA `ngfs_phase_5` database, DOI 10.5281/zenodo.13989530 (NGFS licence adapted from CC BY 4.0: attribution, no reproduction of a substantial portion)
- Rodrigues et al. 2026: Zenodo 10.5281/zenodo.18661988, `data/2025_12_16/data.rds`, CC BY 4.0
- CLEVER: Open Energy Platform API, schema `scenario`, e.g. https://openenergyplatform.org/api/v0/schema/scenario/tables/all_ghg_emissions_by_sector/rows/ (pulled 24 Nov 2026)

The deck `settings3.html` / `Three_pathway_sets_EU_2040_2050.pdf` was updated to these sets; see [`deck/README.md`](deck/README.md).

The QA record is [`docs-internal/pathway-screening-source-refresh-2026-11-24.md`](../../docs-internal/pathway-screening-source-refresh-2026-11-24.md).
