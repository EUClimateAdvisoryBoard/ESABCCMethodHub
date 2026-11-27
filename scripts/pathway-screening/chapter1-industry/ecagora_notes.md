# Group ecagora: industry variables for pathways 2421 and 2000

AI-compiled — pending Secretariat verification. Nothing was downloaded: all sources were already local (`S/pieter/dl_ecagora/` was not needed).

## 2421: EC 2040 IA, SWD(2024) 63, S2 (PRIMES-GAINS-GLOBIOM), EU27

The source is the Annex 8 graph-data workbook (`raw_eu/annex8_graphs.xlsx`, version 23/04/2024), with Part 3 (Annex 8 s.1.2 and s.1.4) used for units and definitions. Every value comes from published graph data. None was read off an image.

- **elec**: Fig 18, Industry. This is final use. It excludes refineries, and it excludes RFNBO/H2 production (sheet note). 2050 appears to include about 50 TWh of non-energy electricity. **for_h2**: no absolute electrolyser input is published, only capacity and an S2 − S1 difference.
- **h2**: energy use is Fig 31 "Industry". Feedstock is Fig 51 (industrial non-energy). Mtoe × 11.63. Fig 50, which includes refineries, is higher. Fig 31 "Non-energy" differs from Fig 51 by about 5 %.
- **bio**: Fig 50 bio-energy. It includes refineries and solid waste, so it is not purely renewable. Fig 51 lists no biomass feedstock, so the feedstock row is left empty, not set to zero.
- **capture**: Fig 54 gives capture at industrial plants, gross (DACC, BECCS power and biomethane upgrading are excluded). In 2040 about 65 % goes to e-fuels (CCU). The fossil/biogenic split (123/4) comes from the 2040 Sankey (Fig 11) only. Those integer labels sum to 127 against 123.1: an inconsistency inside the source. No process-only split is stated.
- **ghg**: co2_energy is Fig 36 Industry (excluding refineries, after capture). co2_process is Fig 53 (net of capture, and in 2050 it includes a −3.5 Mt chemical-storage credit). nonco2 is Fig 12 "Industry and other" (N2O plus non-HVAC F-gases). Two values are derived rather than published:
  - net = co2_energy + co2_process + nonco2
  - gross = net + Fig 54 capture

  The IA's own CO2 total (Fig 55, including refineries) is 202.6 Mt in 2040 and 19.5 Mt in 2050. Fig 55 "Energy" in 2040 disagrees with Fig 52 (116.5 vs 122.2), and the source gives no explanation.
- 2020: only Fig 36 energy CO2 and Fig 8 capture (zero) are published. Fig 18 gives 2021.

## 2000: Agora Energiewende 2023, EU Gas Exit Pathway, central scenario, EU27

Sources: `raw_tt/agora_breakingfree.pdf` (Annex 1 Table 1 p. 64, Annex 2 Tables 2–3 p. 65) and the EU-27 results deck `raw_tt/agora_gexit_eu27.pdf`. The deck's industry charts (pp. 36, 58, 59, 63, 65) have no data labels, so none were read.

- **ghg net**: Table 1 "Industry", all GHG, after CCS: 797 / 117 / 36 Mt (2018 / 2040 / 2050). Refineries are probably under "Energy conversion". The GWP basis is not stated. Deck p. 58 labels for "industry & refineries" are 121 and 28.
- **capture**: Table 1 gross CCS volume, 77 / 106 Mt. This is effectively industry, because power CCS is not modelled, but it includes about 3 Mt of SMR-CCS up to 2040. Biogenic capture is only described as "more than 30 Mt" in 2050 (deck p. 65), so it is not entered.
- **elec 2050**: derived from the deck p. 36 text (+536 TWh, +57 %) as about 1 476 TWh (range 1 468–1 485). It excludes refineries and electrolysis.
- **Not reported**: elec 2040, for_h2, h2, bio (chart only), plastic (qualitative only), and the emission splits.
