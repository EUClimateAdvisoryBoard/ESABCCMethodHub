# Cluster analysis of EU-27 national climate laws & policies

**Dataset:** `public/data/national-climate-policies.json` — 535 laws and
policies across all 27 member states, snapshot of *Climate Change Laws of
the World* (Grantham Research Institute / Climate Policy Radar, CC-BY 4.0),
snapshot date 2022-11-02. This is the dataset behind the
`beta/modules/national-climate-policies` module.

**Method:** `cluster_analysis.py` (reproducible; figures and CSVs in
`output/`).

1. **Policy-level clustering** — each policy is represented by TF-IDF
   features of its title + summary (4 000 terms → 120 SVD dimensions,
   boilerplate stop-words removed) concatenated with normalised multi-hot
   encodings of its sectors, instruments, response types and hazards
   (near-duplicate taxonomy labels such as *Transport/Transportation* and
   *Flood/Floods* folded together first). K-Means, k = 3…12 scanned, k = 12
   selected by silhouette.
2. **Country-level typology** — each member state is profiled by the
   *composition* of its portfolio across the 12 policy clusters plus law
   share, adaptation share and post-2015 share; Ward hierarchical
   clustering, cut at 6 groups (best country-level silhouette).

---

## The 12 policy families (K-Means, n = 535)

| # | n | Label | Law share | Median year | Signature |
|---|---|-------|-----------|-------------|-----------|
| C0 | 53 | **Adaptation & natural resources** | 34% | 2015 | water, forestry, drought/flood/wildfire hazards; national adaptation strategies |
| C1 | 44 | **Multi-sector decarbonisation strategies** | 32% | 2012 | 2030/2050 targets spanning LULUCF, industry, agriculture, buildings |
| C2 | 74 | **Renewable electricity & power market** | 68% | 2014 | wind, grid, offshore, generation, market rules — the largest cluster |
| C3 | 38 | **Building energy performance** | 66% | 2010 | renovation, certification, EPBD-style standards |
| C4 | 29 | **Biofuel & fuel-quality obligations** | 66% | 2012 | quota/blending obligations on petrol & diesel; standards instrument in 97% |
| C5 | 57 | **Clean mobility plans** | 49% | 2014 | alternative fuels, hydrogen, cycling, transport strategies |
| C6 | 48 | **Integrated National Energy & Climate Plans (NECPs)** | 0% | 2019 | all 27 member states; 92% of titles are NECPs |
| C7 | 48 | **Climate & vehicle taxation** | 81% | 2014 | CO₂-graduated vehicle/registration taxes, bonus-malus; tax instrument in 100% |
| C8 | 58 | **Framework climate laws & governance** | 36% | 2018 | economy-wide, institutional mandates, mitigation + adaptation combined |
| C9 | 42 | **Energy-production regulation amendments** | 64% | 2014 | certificates, biomass, smart meters — incremental amendments to energy acts |
| C10 | 13 | **Disaster risk management** | 85% | 2009 | civil protection, early-warning, subnational government duties |
| C11 | 31 | **Purchase subsidies & e-mobility incentives** | 32% | 2019 | EV charging, purchase grants, COVID-recovery programmes |

### What the clusters reveal

1. **The corpus organises by instrument as much as by sector.** Three
   clusters are defined almost purely by *how* they intervene — taxation
   (C7, 100% tax incentives), obligations (C4, 97% standards) and subsidies
   (C11, 97% subsidies) — cutting across the sectoral clusters. National
   climate action is as much a fiscal-instrument story as a sector story.

2. **A clear generational shift.** The oldest families are
   directive-transposition workhorses: disaster-risk laws (median 2009),
   building standards (2010), biofuel quotas (2012). The youngest are
   governance and demand-side families: framework climate laws (2018),
   NECPs (2019) and e-mobility subsidies (2019). The timeline figure shows
   national activity moving from sector-specific *implementation* toward
   economy-wide *governance* plus electrification incentives.

3. **EU harmonisation is directly visible.** C6 contains exactly one
   NECP-type entry per member state, with text so standardised that 27
   different countries' plans form one tight cluster (0% laws — all are
   policy documents mandated by the Governance Regulation (EU) 2018/1999).
   The same applies to C3/C4 reflecting EPBD and RED transposition waves.

4. **Mitigation dominates 88% / 33%.** Only a third of entries carry an
   adaptation response, and adaptation is concentrated in just two
   families (C0 natural-resource adaptation, C8 framework laws), plus a
   small legacy disaster-risk cluster (C10) led by older civil-protection
   acts.

## Country typology (Ward, 6 groups)

| Group | Countries | Profile |
|-------|-----------|---------|
| T1 | BG, DE, ES, FR, GR, HR, IE, IT, LU, NL, PL, PT | Large, broad portfolios (ES 63, FR 49, IT 36, DE 34) tilted to renewable-electricity law (C2) and purchase subsidies (C11); below-average adaptation share |
| T2 | DK, RO, SK | Older portfolios with a strong biofuel-obligation signature (C4) and few recent entries — early movers whose snapshot looks dated |
| T3 | FI, HU | High law share; outsized disaster-risk (C10), building-standards (C3) and mobility-plan (C5) components |
| T4 | AT, BE, CZ, MT, SE, SI | Adaptation-tilted (C0) with strong vehicle/CO₂ taxation (C7); little renewable-electricity legislation in the snapshot |
| T5 | EE, LT, LV | Small Baltic portfolios (5–6 entries) dominated by overarching strategies (C1) and the NECP (C6); lowest law share — strategy-led rather than statute-led |
| T6 | CY | Only 2 records in the snapshot — a coverage artifact, not a real typology |

The biggest single differentiator between member states is **portfolio
depth**: from 2 records (CY) to 63 (ES). Some of that is real legislative
activity, but some is CCLW coverage bias — worth keeping in mind before
reading T5/T6 as "laggards".

## Caveats

- **Silhouette is low in absolute terms (≈ 0.07),** which is typical for
  sparse text data: the clusters are interpretable tendencies with soft
  boundaries, not well-separated islands. k = 12 was the top of the scanned
  range; nearby k values give similar structure.
- **The snapshot is from November 2022** — it predates Fit-for-55
  transposition, most national climate-law updates of 2023-25, and the 2024
  NECP revisions. Re-running after a Climate Policy Radar API refresh
  (supported by the module) would likely grow C8 and C11 substantially.
- **CCLW metadata is noisy**: duplicate taxonomy labels (partially
  normalised here), uneven summary depth across countries, and
  document-count differences that reflect editorial coverage as well as
  actual policy activity.

## Reproducing

```bash
pip install scikit-learn pandas matplotlib scipy
python3 beta/modules/national-climate-policies/analysis/cluster_analysis.py
```

Outputs land in `analysis/output/`: 7 figures, per-policy cluster
assignments (`cluster_assignments.csv`), country typology
(`country_clusters.csv`) and full statistics (`cluster_stats.json`).
