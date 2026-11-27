# New ECL-set members: chart-variable extraction notes

AI-compiled — pending Secretariat verification. Compiled 2026-11-25.

Output: `deck/new_members.json`, built by `deck/x/build.py` (run with `venv/bin/python -I`, scripts kept outside the download folders). Keys are `<var>_<year>`. `null` means the value is not published in the source. It never means zero. A value of 0 is a published zero.

Units: GHG and CO2 in Mt per year; energy in EJ per year; capacity in GW. For CETO, ktoe are converted to EJ with 1 ktoe = 4.1868e-5 EJ, kt to Mt by dividing by 1,000, and MW to GW by dividing by 1,000.

## 2000: Agora Energiewende (2023), "Breaking free from fossil gas", EU Gas Exit Pathway (Central Scenario)

Source: `raw_tt/agora_breakingfree.pdf`. Years: 2018, 2030, 2040, 2050. I rendered Annex 1, Table 1 (printed p.64, PDF p.64) to PNG and read it. Every number below matches the rendered page.

| Variable | 2018 | 2030 | 2040 | 2050 | Locator |
|---|---|---|---|---|---|
| ind_ghg | 797 | 502 | 117 | 36 | Table 1, "GHG emissions (Mt CO₂eq)", row "Industry". **This is GHG (CO2e), not CO2 only.** The table does not split it into energy and process CO2. |
| cap_pv | 99 | 572 | 929 | 1 277 | Table 1, "Solar PV capacity (GW)" |
| cap_wind | 155 | 478 | 923 | 1 204 | Table 1, sum of "Onshore wind capacity (GW)" (145 / 391 / 688 / 845) and "Offshore wind capacity (GW)" (10 / 87 / 235 / 359) |
| cap_ely | null | 34 | 136 | 272 | Table 1, "Domestic electrolyser capacity (GWel)". **Basis: electric input (GWel).** The 2018 cell is "–", so it is left null. Figure ES 1 (p.8) repeats 34 GW (2030) and 272 GW (2050) and adds 80 GW for 2035. |
| co2_cap | null | 8 | 77 | 106 | Table 1, "Carbon capture and storage (gross volume, Mt CO₂)". Printed as −8 / −77 / −106; stored here as positive magnitudes. The 2018 cell is "–", so it is left null. Table 3 (p.65) gives the same series as "CCS" negative emissions, with −34 in 2035 and −100 in 2045. Strictly, this is CCS, that is capture *and storage*. |
| ind_fe, ind_el, ind_h2 | null | null | null | null | Not published as numbers. Figure 16 (p.36), "Final energy consumption in industry, EU-27", shows them only as stacked bars in TWh LHV, with no data labels. Its footnote says H₂ and bioenergy include non-energy demand. Reading values off the bars would be an estimate, so none were recorded. |
| ind_co2e, ind_co2p | null | null | null | null | Not published. Table 1 gives industry only as total GHG. |
| fe, fe_el | null | null | null | null | Not published as absolute values. Table 1 gives primary energy and gross electricity consumption, not final energy. Figure ES 1 (p.8) gives only shares: industry "40% power in final energy demand" (2030) and "63% power in final energy demand" (around 2045); buildings 40% (2030) and 56% (2050). These are shares, not EJ, so they were not used. |

Anomaly in the source: Table 1 prints LULUCF as −251 / −310 / **361 / 400**. The 2040 and 2050 entries have lost their minus sign; Table 3 has −361 and −400. This does not affect any value extracted here.

Comparability flag: Agora's base year is 2018, not 2020. Its industry figure is GHG, whereas the deck's industry figure is CO2 (energy plus process).

## 2400: JRC CETO 2024 (POTEnCIA), EU27

Source: `raw_eu/ceto24/EU27/5_year_reports/ceto2024_EU27_summary_5years.xlsx`.

The header (row 1 of every sheet) has 11 value columns for 2000, 2005, …, 2050 in columns B–L. The columns headed 2055–2070 are empty. The values used are 2020 = column F, 2030 = column H, 2040 = column J and 2050 = column L. The script asserts both the header years and each row label.

| Variable | Sheet, row: label | Source unit | Notes |
|---|---|---|---|
| ind_fe | Industry, r45: "by sector" (under "Energy consumption (ktoe)") | ktoe | This equals EnergyBalances r57 "Final energy consumption - Industry" and Overview r82 (229,956 ktoe in 2020). It **excludes non-energy use**, which is shown separately on Industry r76: 89,937 ktoe (3.77 EJ) in 2020. The chemicals part of that is 71,098 ktoe. |
| ind_el | Industry, r72: "Electricity" (Energy consumption by fuel) | ktoe | |
| ind_h2 | Industry, r73: "Hydrogen" (Energy consumption by fuel) | ktoe | 2020 is a published 0. This is energy use only. Whether hydrogen feedstock appears in non-energy use is not stated, and I did not verify it. |
| ind_co2e | Industry, r106: "Emissions from energy consumption" (CO2 emissions, kt CO2) | kt CO2 | This equals Emissions r15 "Industry" (under "CO2 from Final Energy Consumption") and Overview r106. |
| ind_co2p | Industry, r118: "Process emissions" | kt CO2 | Includes "Solvent use and other process emissions" (r123; 7.2 Mt in 2020). Equals Emissions r71 "CO2 from Process emissions". |
| ind_ghg | ind_co2e + ind_co2p | Mt CO2 | Equals Industry r94 "Total emissions" exactly; the script checks this. **CO2 only.** The summary has no industry non-CO2. |
| cap_pv | PowerGen, r106: "Solar photovoltaics" (under "Gross capacities installed (MW)", r91) | MW | Gross capacity. |
| cap_wind | PowerGen, r103: "Wind" (gross capacities installed) | MW | Equals On-shore r104 plus Off-shore r105, for example 514.2 + 280.6 = 794.8 GW in 2050. |
| fe | Overview, r80: "Final energy demand (ktoe)" | ktoe | Equals EnergyBalances r56 "Final energy consumption". Excludes non-energy use (Overview r78). |
| fe_el | Overview, r95: "Electricity" (Final energy demand by fuel) | ktoe | Equals PowerGen r4 "Final energy demand". |
| co2_cap | Overview, r117: "CO2 emissions captured (kt CO2)" | kt CO2 | Total gross capture. The summary does not break it down by source. For reference, power-sector capture is 193.0 Mt in 2050 (pg_5years sheet "CO2 emissions captured", TOTAL), and direct air capture is 46.6 Mt (Emissions r110). So the total appears to include DAC, but the sheet does not say so. 2020 is a published 0. |
| cap_ely | — | — | **null.** No electrolyser capacity is published in any CETO file in `ceto24/` (summary, bal, pg and their det/annual versions were searched). The pg "Gross Capacities" sheet lists power plants only. The files give only electricity used for hydrogen production (pg "Electricity Balance" r18: 1,788 TWh in 2050) and hydrogen transformation input and output (bal `tih2`/`toh2`). |

Comparability flags:
- CETO's industry and total final energy exclude non-energy use. REMIND's `FE|Industry` and `FE` include it (see below).
- CETO's industry emissions are net emitted CO2: captured fossil and process CO2 does not appear in the emitted rows. This is the same convention as the IAMC `Emi|*` variables.

## 3162: Rodrigues et al. (2026), REMIND-EU, `14_Nzero_57_bio7p5`, region EU27

Source: `raw_lit/rodrigues_full1216/data/2025_12_16/data.rds`, as reported, not harmonised, following `round3/rodrigues/rodrigues_notes.md`.

The brief's path `raw_lit/rodrigues/data/2025_12_16/data.rds` does not exist. That folder holds only `data_EU27andDEU.rds` and the harmonised file. The full `data.rds` is in `rodrigues_full1216/`, as the round-3 notes say. `eu.parquet` was not used.

This deposit strips the `+` notation, so `Emi|CO2|Energy|Demand|+|Industry` becomes `Emi|CO2|Energy|Demand|Industry`. Values are taken directly from the file and rounded to 4 decimal places.

| Variable | IAMC variable used | Unit |
|---|---|---|
| ind_fe | FE\|Industry | EJ/yr |
| ind_el | FE\|Industry\|Electricity | EJ/yr |
| ind_h2 | FE\|Industry\|Hydrogen | EJ/yr |
| ind_co2e | Emi\|CO2\|Energy\|Demand\|Industry | Mt CO2/yr |
| ind_co2p | Emi\|CO2\|Industrial Processes | Mt CO2/yr |
| ind_ghg | ind_co2e + ind_co2p (the deck's definition) | Mt CO2/yr |
| cap_pv | Cap\|Electricity\|Solar\|PV (excludes CSP; Cap\|Electricity\|Solar is 0.4–2.2 GW higher) | GW |
| cap_wind | Cap\|Electricity\|Wind (= Onshore + Offshore) | GW |
| fe | FE | EJ/yr |
| fe_el | FE\|Electricity | EJ/yr |
| co2_cap | Carbon Management\|Carbon Capture (gross, all sources: biomass, DAC, fossil, industry energy and process, waste) | Mt CO2/yr |
| cap_ely | **null** | — |

- **cap_ely.** The file has **no electrolyser capacity variable**. There is no `Cap|Hydrogen|Electricity` and no `Cap|Hydrogen|*`. `Cap|Electricity|Hydrogen` does exist, but it is hydrogen-fired *power generation* capacity, not electrolysis, so I did not use it. Electrolytic hydrogen output is published as `SE|Hydrogen|Electricity|Standard Electrolysis`: 0 / 0.130 / 1.040 / 1.952 EJ/yr in 2020 / 2030 / 2040 / 2050. A capacity could be derived from it only by assuming a load factor and efficiency, so no value was recorded.
- **Definitional flags.**
  - `FE|Industry` includes `FE|Non-energy Use|Industry` (feedstocks): 3.09 / 3.06 / 2.61 / 2.19 EJ.
  - `FE` includes both non-energy use and international bunkers (3.12 EJ in 2020). The file's `FE|w/o Non-energy Use w/o Bunkers` is 41.20 / 36.21 / 28.09 / 24.60 EJ.
  - These match the deck's REMIND convention (the REMIND 3.2 entries in `ind_detail.json` use `FE|Industry`, which is 16.3 EJ in 2020). They do **not** match CETO, which excludes non-energy use.
  - Emissions are as reported. The round-3 harmonised file divides `Emi|*` and `Carbon Management|*` by about 1.034.

## Not covered by this pass

- No industry non-CO2 for CETO or REMIND.
- No harmonisation of base years or of energy scopes across the three pathways.
- No values were read off Agora's figures.
