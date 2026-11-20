# Scenarios (M · 55) — inventory scaling, functional review, 2026-11-20

Pass: adds scaling of all emission results to the EEA inventory for 2020
(request: "scale all of the results to the historic GHG inventories").
Supersedes nothing in `scenario-pathways-functional-review-2026-11-20.md`;
the screening is unchanged. AI-compiled — pending Secretariat verification.

## Method

Base year 2020. Ratio v × inv/v₂₀₂₀ where model and inventory share a sign
and the factor is within 0.25–4, otherwise offset v + (inv − v₂₀₂₀); held
constant to 2050. Targets: inventory 2020 per sector
(`inventory_sectors_2005_2024.csv`) and EU net GHG 3,044 Mt
(`inventory_eu_net_ghg_1990_2024.csv`).

## Checks

| # | Check | Result | What it proves |
|---|---|---|---|
| 1 | Screening parity after the change | 15,936 / 15,936 | Scaling does not touch the default screening. |
| 2 | Ratio factors inventory/model 2020, all pathways (p5 / p50 / p95) | supply 0.40 / 0.65 / 0.90; mobility 0.49 / 0.82 / 1.03; buildings 0.50 / 0.80 / 0.99; agri-food 0.65 / 0.78 / 1.08; industry 1.00 | Ratio is usable for these sectors; models sit above the inventory in 2020. |
| 3 | Ecosystems: model 2020 sign opposite to the inventory sink | 767 of 1,253 pathways | Ratio is unusable there; the offset fallback is necessary. |
| 4 | Industry unchanged | factor 1 for all pathways (i20 = 607.5 = inventory) | Consistent with the export's own harmonisation. |
| 5 | Advice setting, ratio: medians 2020/30/40/50 | net GHG 3,044 / 1,745 / 329 / 3; supply 787 / 340 / −35 / −138; mobility 713 / 498 / 86 / 6; buildings 418 / 261 / 75 / 10; agri-food 371 / 313 / 266 / 267; ecosystems −263 / −267 / −277 / −276 (45 ratio, 17 offset) | 2020 equals the inventory by construction; arithmetic only, no external check of the later years is implied. |
| 6 | Advice setting, offset: 2050 medians | supply −465, mobility −81, buildings −45 | Why ratio is the default. |
| 7 | Step 1 on scaled 2050 net GHG (advice setting) | 75 pathways instead of 64 | Kept off by default; the advice screened on reported values. |

## Deliberately not covered

- No convergence option (scaling fading out by 2050), no alternative base
  year (2020 is a COVID year); both are reasonable next steps.
- The 2040 cut is already computed by the export against the inventory
  (2015, or 2020 where 2015 is missing) and is not rescaled.
- Lever indicators (TWh, EJ, Mha) have no inventory counterpart here and stay
  as reported.
