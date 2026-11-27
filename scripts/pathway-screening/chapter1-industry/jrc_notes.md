# JRC group: industry variables (718, 2400, 1327)

AI-compiled — pending Secretariat verification. Paths are relative to the scratchpad root S. The values are in `pieter/jrc.csv`, built by `pieter/work_jrc/build.py`.

## 718 POTEnCIA CETO 2025 (IAMC xlsx, sheet `data`, region "European Union (R9)" = EU27)
- **Electricity:** `Final Energy|Industry|Electricity`. This excludes non-energy use and electrolysis. No electricity-input-to-hydrogen variable exists, so `for_h2` is not reported.
- **Hydrogen:** energy use is `Final Energy|Industry|Hydrogen`. Feedstock is `Non-Energy Use|Chemicals|Hydrogen`.
- **Biomass:** fuel is Solids + Liquids + Gases `|Biomass`. Feedstock is `Non-Energy Use|Chemicals|Liquids|Biomass`.
- **Capture:** `Carbon Capture|Energy|Demand|Industry` (split into fossil and biomass) plus `Carbon Capture|Industrial Processes`. Process capture is counted as fossil.
- **Emissions:** CO2 only.
  - Net = `Emissions|CO2|Energy|Demand|Industry` + `Industrial Processes`. The energy term already includes the industrial BECCS credit (cement energy CO2 is negative).
  - Gross uses the `Gross Emissions|…` variant. The difference from net equals the biogenic capture, which confirms how net is defined.
- **Not available:** non-CO2 by sector; plastic waste.

## 2400 CETO 2024 (5-year reports, EU27, ktoe × 0.01163 = TWh)
- **Electricity:** bal `CFIND r79`.
- **Electricity for hydrogen:** derived by allocation by share. Electrolysis input (`tih2 r79`) plus own use in hydrogen production (`cenh2 r79`) is multiplied by industry H2 / total H2 supply (`toh2 r83` + `nimp r83`). Industry H2 = `CFIND` + `nech` + `tibf` r83.
  - I used total supply rather than "final use" because the H2 that goes into blast furnaces sits outside final use. The share computed over final use is given in the note.
  - The allocated amount is large: 462 TWh in 2040 and 507 TWh in 2050.
- **Hydrogen feedstock:** chemicals non-energy use (`nech r83`) plus H2 into blast furnaces as a reductant (`tibf r83`, 11–13 Mtoe). The chemicals-only figure is in the note.
- **Biomass:** fuel is `CFIND r68`, which includes renewable municipal waste and biogas. Feedstock is `nech r68` (bio-liquids) plus charcoal into blast furnaces (`tibf r68`).
- **Capture:** ind `CCS r16/r17`. Fossil = total − renewable. No split between energy and process capture.
- **Emissions:** CO2 only.
  - Gross = summary Emissions r15 (combustion) + r71 (process), measured after fossil CCS.
  - Net = gross + r104, the industry share of biogenic CO2 stored.
- **Not available:** plastic waste (non-renewable wastes are given only as context); non-CO2 by sector.

## 1327 POLIZERO JRC-EU-TIMES CLI (results.xlsx, Zenodo 10.5281/zenodo.16759092)
- **No industry fuel split for the EU:** the EU sheets give only total industry final energy and economy-wide final energy by fuel. The industry-by-fuel tables cover Switzerland only. So electricity, hydrogen, biomass and plastic are all not reported.
- **Capture:** `Figure 16b (EU) r6` "Industrial process". This is the industry total, with no fossil/biogenic split.
- **Net emissions:** the `Figure 16a (EU) r20` Industry row, taken to be CO2 after CCS.
  - Its scope cannot be confirmed: the 2020 value (624 Mt) is about 60 Mt above CETO's industry CO2.
- **Non-CO2:** taken from the downloaded assumptions file (Table 27b, EU-27). It is an exogenous input, not a model result.

## What was deliberately not done
- I did not take values from other models.
- I did not use CETO 2024 numbers for 718.
- I estimated no plastic proxies.

## Item 7
Sector values are in `pieter/jrc_sectors.csv`, built by `work_jrc/build7.py`. All of them are CO2 only, measured after CCS. No model gives non-CO2 by sector.
- **718 CETO 2025:** each sector is `Emissions|CO2|Energy|Demand|Industry|<sector>` + `Emissions|CO2|Industrial Processes|<sector>`.
  - The sectors available are steel, non-metallic minerals ("cement" row, which also covers lime, glass and ceramics; the cement-only figures are in the note), chemicals, non-ferrous metals and "Other Sector". Pulp and paper and food sit inside other.
  - The industrial BECCS credit is netted per sector: non-metallic minerals energy CO2 is negative in 2040 and 2050.
  - The sector rows fall short of the item-6 net by 20.1 / 3.5 / 2.1 Mt (2020 / 2040 / 2050). This is energy CO2 that the file does not allocate to any sector; the process rows sum exactly.
- **2400 CETO 2024:** each sector is summary Emissions energy rows (r16–r43) plus process rows (r72–r83). Solvent and other process emissions go to "other". The sectors sum exactly to the item-6 gross.
  - The industry BECCS storage credit (r104: 13.8 / 10.8 Mt in 2040 / 2050) is given only for industry as a whole. The sector values are therefore gross, and the total row exceeds the item-6 net by that amount.
- **Refineries:** both CETO datasets put them in energy supply, so they are not included.
- **1327 POLIZERO:** no EU sector split, so one "not reported" row.

## Item 8
Cost values are in `pieter/jrc_costs.csv`, built by `work_jrc/build8.py`.
- **718 CETO 2025:** costs are not reported. The IAMC file has no Investment, Cost, Capital Cost or OM Cost variables. It has only prices, which are not costs.
- **2400 CETO 2024:** taken from the summary report, sheet `Industry`. Units are M EUR2015, published as "5 year averages"; the averaging window is not stated.
  - CAPEX = r161 "Capital investment": 34.5 / 28.0 bn per year (2040 / 2050).
  - OPEX = fixed (r141) + variable O&M (r142) + fuel (r143), which includes fuel and energy purchases: 348 / 358 bn. This equals Overview r135.
  - Other costs:
    - capital annuity (r140);
    - CO2 costs (r145);
    - infrastructure efficiency investment (r162).
  - Not reported:
    - CCS capex for industry: the CCS-sheet costs are economy-wide (compression, biogenic capture and DAC);
    - H2 capex attributable to industry;
    - total system cost: only demand-side totals (Overview r134) and power-sector totals (r139) exist, and adding them would double count electricity purchases.
- **1327 POLIZERO:** no EU costs in the results file. The assumptions file holds only technology unit costs, which are inputs, not pathway totals.
