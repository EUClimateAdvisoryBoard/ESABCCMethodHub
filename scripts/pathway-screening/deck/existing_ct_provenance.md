# Clean-tech chart inputs (deck slides 11–13): re-pull for existing pathways

AI-compiled, pending Secretariat verification. Compiled on 25 Nov 2026. Values are in `existing_ct.json`. Raw downloads are in `raw_ct/`, and the scripts are in `ct_scripts/` (`assemble.py` builds the values and `finalise.py` adds flags and runs the validation).

## Membership (cross-checked)
`sets3.csv` and `sector_dump.json` (ecl/red/esabcc flags) agree with the brief.
- s1 ECL: 779, 1266, 1275.
- s2 ECL +10%: the s1 runs plus 718, 862, 1257, 1321 (Elec_imp_Ag280), 1322 (H2_dom_Ag280), 1325 (Synf_imp_Ag280), 1327 and EC_S2. That is 11.
- s3 ESABCC 2040: 767, 771, 772, 775, 776, 780, 1260, 1268 and EC_LIFE. That is 9.

## Sources, variables and access log
| Pathways | Source | Access (25 Nov 2026) | Variables used |
|---|---|---|---|
| 767–780 (REMIND 3.2) | IIASA ESABCC explorer, legacy `eu-climate-advisory-board` via `pyam.iiasa.Connection` | OK, anonymous; all 6 variables present, region EU27 → `raw_ct/esabcc2023_remind32_EU27.csv` | Capacity\|Electricity\|Solar\|PV, Capacity\|Electricity\|Wind, Final Energy, Final Energy\|Electricity, Capacity\|Hydrogen\|Electricity, Carbon Capture |
| 862 REMIND 2.1 | IIASA `ecemf` via ixmp4 (`pyam.iiasa.Connection('ecemf')` returned "No permission / no scenarios", so ixmp4 `Platform('ecemf')` was used) | OK; EU27; **no Capacity\|Hydrogen\|\* variable** (checked the full variable list) → cap_ely null | same IAMC names |
| 1257, 1260, 1266, 1268, 1275 | Schreyer et al. 2025, Zenodo 17132530, `EU_FossFree_Scripts_Data.zip` → `data/AllScenarioData.mif` | 200, 101 MB | Cap\|Electricity\|Solar\|PV, Cap\|Electricity\|Wind, FE, FE\|+\|Electricity, Cap\|Hydrogen\|Electricity, Carbon Management\|Carbon Capture (EU27) |
| 1321, 1322, 1325 | Schreyer et al. 2024, Zenodo 10853459 (from the Raw sheet), `data.zip` → `ElecH2_2023_7_12/ScenarioData.mif` | 200 | same as 2025 |
| 718 POTEnCIA 4.2 | `scenario-research/raw_eu/POTEnCIA_CETO2025_IAMC.xlsx` (untrusted, read only), region European Union (R9) | local | IAMC names. Electrolysers: **Capacity\|Hydrogen** (total H2 production capacity; no electrolysis split is reported) |
| 1327 JRC-EU-TIMES CLI | POLIZERO, Zenodo 16759092, `..._results.xlsx` | 200 | FE = Figure 10 (EU) CLI, four sectors excluding international transport (as role FE in the workbook); FE\|El = Figure 9 (EU) CLI, Electricity; capture = Figure 16b, power + industrial process + other transformation + DAC (excluding the LULUCF row, as role CAP); PJ/1000 → EJ. **No capacities** (Fig 11 is TWh), so PV, wind and electrolysers are null |
| EC_S2, EC_LIFE | `raw_eu/annex8_graphs.xlsx` (SWD(2024) 63 annex 8, PRIMES) | local | Capture = Fig 8 ("carbon captured yearly"); electrolysers = Fig 23, Electrolyzers column (GW); FE = Fig 32, sum of 8 carriers in Mtoe × 0.041868; FE\|El = Fig 32, Electricity. 2030 is common to all scenarios. **No PV or wind capacity by scenario** (Fig 22 gives total renewables only), so these are null |
| Ref rings | Eurostat API `nrg_inf_epcrw` (200, JSON) | OK | PV 2024: 307.1 GW; wind 2024: 231.1 GW (CAP_NET_ELC, EU27_2020) |
| Ref ring electrolysers | ACER end-2025 | ACER primary not fetched | 0.49 GW from a secondary report (qcintel, citing ACER); the ACER 2025 MMR gives 308 MW for end-2024. **Flag: secondary.** |

Basis notes:
- Electrolysers: REMIND Cap\|Hydrogen\|Electricity is the capacity of the electrolysis technology as reported, on the hydrogen-output side. Implied utilisation for 1266 in 2050 is 4.35 EJ / 362.8 GW, about 38 %. The PRIMES Fig 23 basis is not stated in the annex. POTEnCIA is total H2 capacity. These bases are not harmonised.
- FE: the Schreyer `FE` includes bunkers (1266 in 2030: 41.44 against 38.46 EJ for `FE|w/o Bunkers`). The deck medians reproduce only with `FE`, so the deck used FE including bunkers for Schreyer. The IAMC `Final Energy` of the ESABCC/ECEMF runs is likely excluding bunkers (not verified). The deck therefore mixes bases. `fe_wo_bunkers_*` is added for the 8 Schreyer runs.
- `el_share_*` = fe_el / fe × 100 (calculated).

## Coverage
| Set | PV/wind | FE, FE\|El | Electrolyser | Capture |
|---|---|---|---|---|
| ECL (3) | 3 | 3 | 3 | 3 |
| ECL +10% (11) | 9 (deck: 8; 718 adds) | 11 (deck: 8) | 9 (deck: 7; 718 and EC_S2 add; null for 862 and 1327) | 11 (deck: 8) |
| ESABCC 2040 (9) | 8 (LIFE null) | 9 (deck: 8) | 9 (deck: 8) | 9 (deck: 8) |

## Validation against slides 11–13 (deck_plotted = REMIND-family runs only)
The medians below are computed from the deck-plotted members and compared with the slide medians as read off.

| Chart, year | ECL n / median | slide | ECL+10% n / median | slide | ESABCC n / median | slide |
|---|---|---|---|---|---|---|
| PV 2030/40/50 | 3: 854 / 1823 / 2112 | ~855 / 1820 / 2110 | 8: 855 / 1835 / 2130 | ~855 / 1835 / 2130 | 8: 883 / 1861 / 2087 | ~880 / 1860 / 2090 |
| Wind | 452 / 938 / 1313 | ~450 / 935 / 1310 | 427 / 910 / 1267 | ~425 / 910 / 1265 | 395 / 800 / 1042 | ~395 / 800 / 1040 |
| El. share % | 28.6 / 51.6 / 58.6 | ~28.7 / 51.5 / 58.5 | 28.6 / 48.5 / 58.2 | ~28.7 / 48.5 / 58.2 | 29.4 / 53.3 / 60.9 | ~29.4 / 53.2 / 61 |
| FE EJ | 41.4 / 30.8 / 29.0 | ~41.4 / 30.8 / 29.0 | 41.4 / 30.9 / 29.1 | ~41.5 / 31 / 29 | 39.5 / 28.7 / 25.4 | ~39.5 / 28.7 / 25.5 |
| Electrolyser GW | 11.6 / 105 / 292 | ~12 / 105 / 290 | 7: 12.9 / 126 / 363 | ~12 / 125 / 362 | 20.9 / 86 / 167 | ~20 / 86 / 167 |
| CO2 captured Mt | 43.9 / 171 / 317 | ~44 / 171 / 318 | 33.5 / 196 / 331 | ~33 / 196 / 330 | 33.9 / 218 / 323 | ~34 / 217 / 322 |

- Dot counts reproduce: 3 / 8 / 8 on every panel, and 3 / 7 / 8 for electrolysers. Extremes match individual dots: PV 2050 at 2814 (1322) and 1553 (1321); electrolyser 2050 at 584 (1322); capture 2050 at 464 (1322) and 447.5 (1325, the dot partly hidden behind the "Board risk level 425" label); capture 2050 at 230 (1257).
- **No mismatch for the plotted pathways.** All medians agree within the reading precision of the raster slide (about ±1–2 % of axis).
- **Mismatches against the deck's footnotes.**
  1. 718 is treated as non-reporting in the deck, but the CETO 2025 xlsx reports all six variables. Plotting it would move the ECL +10% medians: wind 2030 from 427 to 417 and electrolysers 2040 from 126 to 148. Capture is also affected.
  2. EC_S2 and EC_LIFE report electrolysers (Fig 23), FE and capture (S2 459 Mt and LIFE 348 Mt in 2050; the deck's method note gives S2 as about 450). They are not plotted. LIFE does have a 2050 capture figure in Fig 8 (347.6), which contradicts the deck note "LIFE gives no 2050 capture figure".
  3. 1327 reports FE, electricity and capture (430 Mt in 2050) but is not plotted.
  4. The EC and POLIZERO FE boundaries differ from REMIND (EC 2050 FE 21.9–23.4 EJ). Check comparability before plotting.
- `deck_plotted` in the JSON marks the pathways the deck used. Filtering on it reproduces the slides exactly.

## Not covered by this pass
- No ACER primary document was fetched.
- Bunker basis of the ESABCC/ECEMF `Final Energy` not verified.
- Electrolyser bases were not harmonised.
- No values were changed in repository files.
