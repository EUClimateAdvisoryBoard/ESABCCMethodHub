# ESABCC pathway sets for the EU 2040 and 2050 targets (export 24 Nov 2026)

Screening database and the three pathway sets behind the deck "Three pathway sets for the EU 2040 and 2050 targets".

**Internal use only.** `data/systems_fix.csv`, `data/pathways_screened_1219.csv` and the Excel file contain Scenario Compass data, which are embargoed. Do not upload them to external services.

## The three sets

| Set | 2040 cut vs 1990 | EU net GHG 2050 | ESABCC limits | Pathways |
|---|---|---|---|---|
| ECL-compatible, within ESABCC limits (ECL) | 85–90% | ≤ 0 Mt (rule: ≤ 1 Mt, so REMIND-EU CCS180_highImp at +0.3 Mt counts) | all filters and risk levels | 3 |
| ECL range, 10% tolerance margin (ECL +10%) | 85–90% | ≤ 50 Mt | EU CO₂ capture, EU primary bioenergy, world CO₂ storage ×1.1; others as published | 10 + EC 2040 IA S2 |
| ESABCC 2040-compatible | 90–95% | ≤ 0 Mt (≤ 1 Mt) | all filters and risk levels | 23 pass; 8 main runs shown + EC 2040 IA LIFE |

All sets: industry data reported (industry energy CO₂ and process CO₂ for 2020 and 2050), 2030 cut ≥ 55% (missing 2030 counts as passed). JRC pathways: net-zero flag instead of a 2050 value.

Limits (ESABCC 2023, Tables 5 and 6): filter EU capture 500 Mt, EU primary bioenergy 20 EJ, world storage 8,600 Mt, world bioenergy 240 EJ, EU hydrogen 2030 1.89 EJ, final energy decline 2020–30 ≤ 20%; risk levels EU capture 425 Mt, EU primary bioenergy 9 EJ, land sink 400 Mt. A limit only removes a pathway that reports the variable.

Window bounds as coded: 85–90% is 84.95 ≤ cut < 90.5; 90–95% is 90.5 ≤ cut < 95.5. Cuts scaled to the inventory (1990: 4,608.5 Mt). For the 16 REMIND 3.2 runs of the ESABCC 2023 advice the Board's own stored 2040 cut is used; with the general formula, def_bioLim7p5_500 and flex_bioLim7p5_500 move above 95% and ESABCC 2040 has 6 main runs.

## Files

### data/
- `pathways_screened_1219.csv`: start here. One row per pathway with industry data (duplicates removed): source, model, scenario, region, 2030 and 2040 cut (%), net GHG 2050, limit indicators, set membership (`in_ECL`, `in_ECL_plus10`, `ESABCC2040_passes`, `in_ESABCC2040`).
- `systems_fix.csv`: full audited database (12k+ columns of indicators; `det` = industry data, `dup` = duplicate copy). Row index = `id`.
- `stages.csv`: per row of systems_fix: `red30`, `red` (2030 and 2040 cut, %), sector values harmonised to the 2020 inventory (`{sector}_{year}`).
- `sets3.csv`: set flags per id (`s1` ECL, `s2` ECL +10%, `s3_all` ESABCC 2040 passes, `s3` main runs shown).
- `why.csv`: reason a pathway is not shown in a sector chart.
- `sector_dump.json`: sector values 2020–2050 of every set member, EC 2040 IA sector values, inventory, WEM/WAM.
- `inventory_eu_net_ghg.json`, `inventory_sectors_2005_2024.json`: EEA inventory (EU27).
- `wemwam.json`: Member States' projections 2026 (EEA), EU27, summed to the same scopes, AR5 GWPs, not harmonised.
- `trend.json`: least-squares line through the inventory 2005–2024 per sector, read at 2030/2040/2050 (calculated).
- `ind_detail.json`, `ind_detail_stats.json`: industry final energy, electricity, hydrogen, energy CO₂, process CO₂ for set members, as reported (16 of 18 model pathways; POTEnCIA and JRC-EU-TIMES do not report).
- `facet3.json`, `funnel3.json`: chart and funnel numbers.

### EC 2040 impact assessment (SWD(2024) 63, Part 3), not in the database
- S2 (in ECL +10%): 2030 cut 56.9%, 2040 cut 87.5% (Table 1), net GHG 2050 −34 Mt, CO₂ capture 2050 ≈ 450 Mt (text p. 18, total incl. e-fuels and DACC), land sink 332 Mt.
- LIFE (in ESABCC 2040): 2040 cut 92.3%, net GHG 2050 −70 Mt, capture 2050 lower than S1–S3 (no figure), land sink 389 Mt.
- S1 (77.2%) and S3 (capture ≈ 450 Mt, above the 425 Mt risk level) are in no set.

### scripts/
Working scripts as used; paths point to `/home/claude/...` and need adjusting.
- `facet.py` (harmonisation, loads stages), `facet4.py` (sector charts), `funnel3.py`, `methodfig.py`, `indfig.py` and `ind_detail.py` (industry detail), `wemwam.py`, `dump_sector.py`, `build3.py` + `insight_slides3.py` (HTML deck), `mkpdf.py`, `shot3.py` (Playwright), `retol.py` (recompute ECL +10% at a given tolerance), `build_xlsx3.py` + `roles.py` + `extract.py` (traced Excel).
- Fonts: Selawik as Segoe UI stand-in (`segoe.py`). Colours (ESABCC chart): ECL #608c95, ECL +10% #b04545, ESABCC 2040 #2e422f, inventory #2c2d2d, accent #f26119.

### outputs/
- `EU_pathway_screening_three_sets.xlsx`: every value linked to the raw data by formula; limits editable on sheet Limits.
- `Three_pathway_sets_EU_2040_2050.pdf` and `settings3.html`: meeting deck (14 slides).
- `industry_chart_legend.png`, `ind_energy_chart.png`, `ind_co2_chart.png`: 300 dpi figures.

## Not included
REMIND-EU ensemble of Rodrigues et al. 2026 (289 runs); the 433 pathways staged on 22 Nov evening (no new set member at the strict rules).
