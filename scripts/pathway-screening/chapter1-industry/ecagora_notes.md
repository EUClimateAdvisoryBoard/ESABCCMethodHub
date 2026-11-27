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

## Item 7

Sector rows are in `ecagora_sectors.csv`.

**2421 (EC IA, S2).** Each sector value is energy CO2 (Fig 52, after capture) plus process CO2 (Fig 53, net of capture). The values are CO2 only, with no DACCS, so non-CO2 is not split by sector.

- **steel**: this row includes non-ferrous process CO2. Fig 53 "Metal production" covers both ferrous and non-ferrous metals.
- **non_ferrous**: energy CO2 only, because its process CO2 sits in the steel row.
- **cement**: covers all non-metallic minerals.
- **pulp_paper** and **food**: energy CO2 only.
- **chemicals, 2050**: the value is −1.9 Mt. This is because a −3.5 Mt process credit for carbon from non-fossil feedstock stored in materials is netted.
- **refineries** (28.6 / 10.3 Mt): listed separately and excluded from the total. PRIMES books refineries in the energy branch.
- **Sum check**: the total is 179.7 / 9.3 Mt. Adding item 6 non-CO2 (4.7 / 4.7) gives item 6 net exactly.
- **2020**: no sector split is published. Figs 52 and 53 give 2015 and 2030 only.

**2000 (Agora).** Not reported. The source gives only an industry total. The deck p. 58 sector chart has no data labels for individual sectors.

## Item 8

See `ecagora_costs.csv`.

**2421 (EC IA, S2).**
- **Industry investment:** Fig 104 gives an average annual industry investment of 45.6 bn EUR2023/yr for 2031–2040 and 24.0 bn EUR2023/yr for 2041–2050. The unit comes from the Part 3 tables and text. Fig 107 splits this by sector.
- **What the investment figure covers:** only the decarbonisation-related part of industrial investment, including carbon capture. It excludes full plant costs and R&D. Hydrogen production is counted as supply-side investment.
- **Industrial carbon capture:** printed in the text only, as about 4 bn/yr for 2031–2040 and about 2 bn/yr averaged over 2031–2050.
- **OPEX:** published only as % differences against S2 (Table 35). No absolute value, so not reported.
- **Other:** Table 36 gives the industrial electricity price: 130–131 EUR23/MWh in 2040 (one range for S1–S3 and LIFE) and 131 in 2050.
- **Context:** Fig 112 gives total energy system costs of 12.1 % of GDP in 2040 and 10.6 % in 2050.

**2000 (Agora).**
- **Industry investment:** chart-only, in report Figure 29 and deck p. 74, with no data labels. Not reported.
- **OPEX, CCS and H2 costs:** none published.
- **Context:** about 285 bn EUR/yr of capex over 2031–2050 for buildings, industry and energy supply. This excludes power grids and gas/hydrogen infrastructure, and the price base is not stated.
