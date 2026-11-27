# Industry indicators for chapter 1 (ECL and ECL +10 % sets, 2040 and 2050)

AI-compiled — pending Secretariat verification. Built 27 Nov 2026.

`Industry_indicators_ECL_sets_2040_2050.xlsx` gives min / median / max ranges across the 6 pathways of the ECL-compatible set and the 14 pathways of the ECL +10 % set (screening in [`../screen_three_sets.py`](../screen_three_sets.py)), for:

1. industry electricity, split into direct use and electricity to make hydrogen;
2. hydrogen use in industry;
3. biomass use, split into fuel and feedstock;
4. plastic waste use;
5. CO2 captured in industry, split into fossil and biogenic;
6. industry GHG emissions, as net, gross and before capture.

- **Source data.** `remind.csv`, `jrc.csv` and `ecagora.csv` hold one row per pathway × item × year, with the variable as published, the file, a locator and any derivation. Rows that say "not reported" record what was searched.
- **Definitions.** `definitions.txt` holds the definitions, harmonised across models. `build_xlsx.py` writes the workbook; every cell on the Ranges and By pathway sheets is a formula over sheet Data.
- **Rebuild.** Run `python3 -I build_xlsx.py Industry_indicators_ECL_sets_2040_2050.xlsx`.

Key caveats:
- Values are as published (EU27), not harmonised to the inventory.
- No model puts electrolysis electricity in industry electricity. Electricity for hydrogen is an allocation by share, derivable for 4 ECL and 8 ECL +10 % pathways.
- No pathway reports plastic waste use in industry.
- Emission scopes differ: CETO 2024/2025 and POLIZERO are CO2 only; REMIND books all F-gases under industry; EC IA S2 excludes refineries. "Gross" uses one common definition (before negative-emission credits, fossil CCS netted). For EC IA S2 it is recomputed from the extraction (see the row note).
- Model notes: `*_notes.md`.
