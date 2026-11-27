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
