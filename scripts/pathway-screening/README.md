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

## Sources added (24 Nov 2026)

| IDs | Source | Pathways | Result |
|---|---|---|---|
| 2000 | Agora Energiewende (2023), *Breaking free from fossil gas*, EU Gas Exit Pathway | 1 | **ECL and ECL +10%** (with the two overrides) |
| 2010–2012 | UBA Climate Change 18/2026 (Öko-Institut, Fraunhofer ISI, IREES): EUBase, EUTarget, EUSupreme | 3 | none; EUTarget stops at the land-sink risk level (414 Mt) |
| 2020–2029 | EC SWD(2026) 616 (ETS review impact assessment) | 10 (placeholders) | not checkable: no absolute economy-wide values published |
| 2050 | CLEVER (négaWatt, 2023), Open Energy Platform tables | 1 | none; stops at the final-energy filter (25.4 %) |

The column `File in this workspace` names the working copy used during extraction; the source documents are not committed. They are at:

- Agora: https://www.agora-energiewende.org/publications/breaking-free-from-fossil-gas (Annex 1 Table 1, Annex 2 Tables 2–3, pp. 64–65)
- UBA: https://www.umweltbundesamt.de/publikationen/pathways-to-an-eu-in-2050-net-zero-ghg-emissions (PDF `18_2026_CC_V2.pdf`)
- EC: SWD(2026) 616 via `publications.europa.eu/resource/celex/52026SC0616`
- CLEVER: Open Energy Platform API, schema `scenario`, e.g. https://openenergyplatform.org/api/v0/schema/scenario/tables/all_ghg_emissions_by_sector/rows/ (pulled 24 Nov 2026)

Result: ECL 3 → **4**, ECL +10% 10 → **11**, ESABCC 2040 unchanged at **8**.
The QA record is [`docs-internal/pathway-screening-source-refresh-2026-11-24.md`](../../docs-internal/pathway-screening-source-refresh-2026-11-24.md).
