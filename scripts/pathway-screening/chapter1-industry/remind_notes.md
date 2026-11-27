# REMIND group: industry variables (AI-compiled, pending Secretariat verification)

Region EU27 throughout; 1 EJ = 277.778 TWh; published values are in each CSV note. Scripts are in `S/pieter/scr_remind/`.

**Sources.** The local files for 779 and 862 held only about ten variables, so I pulled the full scenarios with pyam (2026-11-27) into `dl_remind/`: 779 from IIASA `eu-climate-advisory-board`, 862 from IIASA `ecemf`. 1321/1322/1325: Schreyer 2024 `ScenarioData.mif`. 1257/1266/1275: Schreyer 2025 `AllScenarioData.mif`. 3162: Rodrigues `data.rds` (2025_12_16).

**All runs.**
- `FE|Industry|Electricity` excludes electrolysis, so hydrogen's electricity is *not* in item 1.
- `FE|Industry|Hydrogen` is pure H2. Synfuels are separate, and synthetic feedstocks appear in notes only.
- All F-gases (economy-wide) are booked under industrial processes.
- No run reports plastic waste as an industry input.

**Native naming (1321–1325, 1257–1275, 3162).**
- `FE|Industry` includes non-energy use (checked); the bio fuel/feedstock split uses the NEU variables.
- for_h2 = electricity input × industry H2 / `FE|Hydrogen`. Schreyer's input is `…|direct FE H2`, which excludes synfuel and storage electrolysis. Rodrigues reports only the total input, so its value is an upper bound.
- Net = `Emi|GHG|Industry` (summed from parts for Rodrigues): net energy CO2 (after industry BECCS, synfuel-CCS and plastics credits) + process CO2 + F-gases + N2O. GWP is AR5.
- Gross = gross energy CO2 + industrial-process GHG. Fossil CCS is already netted out.
- In Schreyer 2025, `Emi|GHG|Gross|…|Industry` still contains the plastics credit, so I did not use it.
- Capture total includes synfuel-origin CO2, so total > fossil + biogenic.
- Rodrigues has no fuel split for capture, so its fossil/biogenic rows use *stored* CO2.
- Odd: Schreyer 2024 F-gases are 12 Mt in 2040 vs about 50 Mt elsewhere.

**779 ESABCC (IAMC).**
- `Final Energy|Industry` appears to include NEU (inferred from the 2020 level).
- Not reported: bio fuel/feedstock split, electrolysis input, gross emissions, industrial N2O.
- Net = energy CO2 + process CO2 + F-gases.
- Industry CCS split is inferred and stored-based: (CCS − Storage) for Biomass and Fossil adds up exactly to `Storage|Other`. "Fossil" may include synfuel carbon.
- `Final Energy|Industry|Fossil` equals coal only (labelling slip?).

**862 ECEMF (IAMC).**
- `Final Energy|Industry` *excludes* NEU. Bio feedstock comes from `Non-Energy Use|*|Biomass`.
- Only process capture is labelled, so total/fossil/biogenic capture are not reported.
- Net/gross = (gross) energy CO2 + `Kyoto Gases|Industrial Processes`.
- `CO2|Industry and Industrial Processes` duplicates `Energy|Demand|Industry` (not used).

**Not covered.** 2030 values, harmonised Rodrigues data, and Eurostat reconciliation.

## Item 7

Output: `remind_sectors.csv`, built by `scr_remind/sectors.py`. The 2020 column is for orientation.

**Coverage.** The seven native-REMIND runs (1321–1325, 1257–1275, 3162) split industry into Steel, Cement, Chemicals and Other Industry, using `Emi|CO2|Energy|Demand|Industry|<sector>`. 779 (ESABCC) and 862 (ECEMF) have no emissions by subsector, so each gets one "not reported" row.

**What each sector row holds.**
- Each row is CO2 only: energy CO2 plus the sector's process CO2.
- Process CO2 is reported for cement and chemicals in Schreyer 2025 and Rodrigues, but for cement only in Schreyer 2024.
- For Rodrigues, cement process CO2 is derived as total process CO2 minus chemicals process CO2.
- Energy CO2 is after CCS and net of the credits booked to the sector: industry BECCS, CCS of synfuel-origin CO2, and plastics carbon storage (Schreyer 2025 and Rodrigues only). This is why chemicals turns negative in 2050, between about −15 and −83 Mt.
- Non-ferrous metals, pulp and paper, and food sit inside "other". Refineries are in energy supply, not industry.
- "Cement" is the source's label. The file does not say whether it covers lime and glass.

**Sum check.**
- The four sector rows add up exactly to `Energy|Demand|Industry`.
- The total row (energy + process CO2) differs from the item 6 net value by the non-CO2 emissions (F-gases, economy-wide, plus industrial N2O). These are not allocated to sectors; the size of the gap is stated in the note on each total row.

## Item 8

Output: `remind_costs.csv`, built by `scr_remind/costs.py`.

**No pathway publishes industry CAPEX or OPEX.** This holds for all nine runs. I searched for Invest*, *Cost*, Capital/OM/Policy Cost*, Expenditure*, Energy Service|Industry* and Price|*Industry*.

**What does exist:**
- **Unit prices only.** Industry fuel prices are published for Schreyer 2025 (US$2005/GJ) and ECEMF (EUR2020/GJ). They are prices per GJ, not expenditure, and I did not multiply them by quantities.
- **System-wide investment, not attributable to industry.** CO2 transport and storage investment, and H2 or electrolysis investment, in billion US$2005/yr, annual. The values are quoted in the row notes.
- **Schreyer 2025 `Energy investments|Demand`** is 0 in every year.

**Context only (not industry):**
- **Schreyer 2025:** `Energy system costs`, billion US$2005/yr, annual. The source has a value for 2050 (about 490) but NA for 2040.
- **Schreyer 2024:** only the additional energy-system cost relative to an unnamed reference run.
- **ESABCC, ECEMF and the reduced Rodrigues file:** no cost variables.
