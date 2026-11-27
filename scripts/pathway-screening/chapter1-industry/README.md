# Industry indicators for chapter 1 (ECL and ECL +10 % sets, 2040 and 2050)

AI-compiled — pending Secretariat verification. Built 27 Nov 2026.

`Industry_indicators_ECL_sets_2040_2050.xlsx` gives min / median / max ranges across the 6 pathways of the ECL-compatible set and the 14 pathways of the ECL +10 % set (screening in [`../screen_three_sets.py`](../screen_three_sets.py)), for:

1. industry electricity, as reported (excludes electricity used to make hydrogen);
2. hydrogen use in industry;
3. biomass use, split into fuel and feedstock;
4. plastic waste use;
5. CO2 captured in industry, split into fossil and biogenic;
6. industry GHG emissions, as net, gross and before capture;
7. residual emissions by industrial sector (steel, cement, chemicals, ...; CO2 only);
8. industry CAPEX and OPEX where published (sheet Costs; no ranges, because units and periods differ).

- **Source data.** `remind.csv`, `jrc.csv` and `ecagora.csv` (items 1–6), `*_sectors.csv` (item 7) and `*_costs.csv` (item 8) hold one row per pathway × item × year, with the variable as published, the file, a locator and any derivation. Rows that say "not reported" record what was searched.
- **Definitions.** `definitions.txt` holds the definitions, harmonised across models. `build_xlsx.py` writes the workbook; every cell on the Ranges and By pathway sheets is a formula over sheet Data.
- **Rebuild.** Run `python3 -I build_xlsx.py Industry_indicators_ECL_sets_2040_2050.xlsx`.

Key caveats:
- Values are as published (EU27), not harmonised to the inventory.
- No model puts electrolysis electricity in industry electricity, and none publishes the electricity used to make industry's hydrogen; it is not estimated.
- Sector residual emissions are CO2 only; 4 pathways (779, 862, 1327, Agora) give no sector split. Only CETO 2024 and EC IA S2 publish industry costs.
- No pathway reports plastic waste use in industry.
- Emission scopes differ: CETO 2024/2025 and POLIZERO are CO2 only; REMIND books all F-gases under industry; EC IA S2 excludes refineries. "Gross" uses one common definition (before negative-emission credits, fossil CCS netted). For EC IA S2 it is recomputed from the extraction (see the row note).
- Model notes: `*_notes.md`.
