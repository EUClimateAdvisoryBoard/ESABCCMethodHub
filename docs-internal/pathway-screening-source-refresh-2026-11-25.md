# Pathway screening: source refresh, 25 Nov 2026 (all available sources)

> AI-compiled — pending Secretariat verification. Supersedes the counts in
> `pathway-screening-source-refresh-2026-11-24.md`, whose findings stand. This pass changes no value in
> `EU_pathway_screening_three_sets.xlsx`. A separate fact-check pass of the extracted rows is still due.

## Context

After the 24 Nov pass (Agora, UBA, SWD(2026) 616 and CLEVER: ECL 3 → 4), the Secretariat asked for every available source
that can extend the dataset. A second research round followed (national institutes, industry and consultancies, academic
non-REMIND models). After it, every source with usable EU27 values was extracted and re-screened with
`scripts/pathway-screening/screen_three_sets.py`. The `--check` run still reproduces the workbook (3 / 10 / 8, 23).

## Result

| Set | Workbook | 24 Nov | 25 Nov |
|---|---|---|---|
| Pathways screened | 1,219 | 1,234 | **1,596** |
| ECL-compatible, within ESABCC limits | 3 | 4 | **160** |
| ECL range, 10% tolerance margin | 10 | 11 | **197** |
| ESABCC 2040-compatible (main runs) | 8 | 8 | **9** |

The ECL members by source are Rodrigues et al. 2026 (155), Schreyer (2), ESABCC (1), Agora (1) and JRC CETO 2024 (1). The
ESABCC 2040 set adds EC IA LIFE to the 8 from the workbook.

**Reading the sets.** Rodrigues et al. supply 155 of the 160 ECL pathways. All of them are sensitivities of one REMIND-EU set-up,
and all but a few share the same exogenous land sink (372.3 Mt in 2050), so pathway counts now overstate diversity. Statistics
per set should be read by model family or by study (for example, the median of study medians), not pooled.

## Findings per source

1. **Rodrigues et al. (2026), Nat. Commun. 17:3417 (IDs 3000–3336, 337 runs).**
   - **Data used:** `data/2025_12_16/data.rds` as reported, not the harmonised file. The harmonised file only scales Emi and
     Carbon Management variables by about 1.034, so the cuts are unchanged.
   - **Variables:** the Schreyer names are used (NET = `Emi|GHG|LULUCF national accounting`, AR5). There are 336 net-zero runs
     plus `14_Npi`. The paper's figure of 336 includes the 48 `limVRE_limInt` runs, which the deposit's `loadData.R` drops; that
     is why an earlier count found 289.
   - **Main run:** one, the paper's reference `14_Nzero_57_bio7p5` (Table 1 footnote), so Rodrigues adds no ESABCC 2040 main
     run. The reference run's 2040 cut is 86.8 %, outside that window. 17 sensitivities pass ESABCC 2040 before the main-run
     selection.
   - **Duplicates:** none against the Schreyer or REMIND 3.2 rows (no pair agrees within 1 Mt on 2040 and 2050).
   - **Where the runs that fail stop:** final-energy filter 71, 2040 window 60, 2050 net rule 19, capture risk 19,
     bioenergy risk 11, capture filter 2.
2. **JRC CETO 2024, POTEnCIA (ID 2400): passes ECL and ECL +10%.**
   - **Values:** 2040 cut 90.2 % (on the 2015 base), net +0.9 Mt in 2050, capture 418.5 Mt (Overview r117), biomass 7.72 EJ
     (r43), LULUCF −302.8 Mt (Emissions r150). Hydrogen production is 0.244 EJ (balance r62).
   - **NET row choice (orchestrator correction):** NET = Overview r97 (incl. intra-EEA transport; r97 = r104 + Emissions
     r87 + r100 + r150 in all years). This matches the scope of the CETO 2025 row in the workbook (ID 718: 2015 3,636.7 Mt
     vs r97 3,638.1 Mt).
   - **Silent failure caught:** the extraction agent's "domestic-only" derivation gave 502.8 Mt for 2015 and was discarded.
3. **JRC GECO 2024, POLES-JRC (IDs 2410–2412): stop at "no industry data".** No industrial process CO2 row is published. 1.5C:
   2040 cut 90.7 %, capture 535.6 Mt, which would fail the capture filter anyway.
4. **EC 2040 IA, SWD(2024) 63, Annex 8 graph data (IDs 2420–2423).**
   - **Results:** S2 (2040 cut 88.0 %, capture 459.17 Mt) is in ECL +10% only. LIFE (92.7 %, capture 347.55 Mt) is in ESABCC
     2040. S3 stops at the capture risk level (452.30 Mt). S1 is outside the window (78.1 %).
   - **Consistency with the deck:** the results reproduce the deck's two hand-added IA rows, now from machine-readable values.
   - **Sets sheet:** the S2 net 2050 of −34 matches no source value (Fig 4 −42.37, Fig 5 −21.48); LIFE −70 is Table 1, not
     Fig 4 (−76.90). The "no capture/bioenergy figure" notes are outdated.
   - **Override:** `industry_process_start_year = 2015`, because process CO2 has no 2020 point.
   - **Not applied:** final energy is given for 2019, not 2020, so the FE test reads "no data". Measured from 2019 the decline
     would be 22.0 %, but 2019 is pre-COVID.
5. **Compass Lexecon for BusinessEurope, 2024 (IDs 2200–2201): stop at "no industry data".**
   - The industry rule is deliberately not waived.
   - Only the `base_year = 2019` override is applied.
   - LULUCF and non-CO2 are taken from the EC 2040 IA by the authors, so the runs are not independent of it.
6. **PAC 2.0, 2024 (ID 2430): stops at "no industry data".** The pathway runs to 2040 only (2040 net −100.3 Mt; land sink 519 Mt
   in 2040, recorded in notes only).
7. **NGFS Phase V, MESSAGEix-GLOBIOM downscaled to EU27 (IDs 2500–2506): all fail the 2050 net rule.**
   - The best 2040 cut is 76.3 %.
   - Net uses `Emissions|Kyoto Gases (incl. indirect LULUCF)`, the only Kyoto total published for the downscaled region; drop
     these runs if plain `Emissions|Kyoto Gases` is required.
   - The GCAM legs (native and downscaled) and the downscaled REMIND legs are exact duplicates of workbook IDs 1094–1100 and
     967–973, so they were not added.

8. **NGFS Phase V REMIND-MAgPIE 3.3-4.8 "IPD-median" runs (IDs 2510–2516): added, all `main_run` = FALSE.**
   - **What they are:** the runs feed the median Kotz et al. (2024) chronic damages back into REMIND. They share 2020 history
     with IDs 967–973 and then diverge (Below 2°C 2040: 589 vs 1,609 Mt). No run duplicates an existing REMIND row (closest
     gap 41 Mt).
   - **Results:** NZ2050 (2040 cut 93.5 %, −1.9 Mt in 2050) and Low demand (95.0 %, −53.1 Mt) reach the ESABCC 2040 window but would fail it even as main runs: NZ2050 on the capture filter, capture risk and bioenergy risk levels, Low demand on the final-energy filter.
   - **Why they are not main runs:** NGFS reports Kotz et al. as retracted from Nature, and names the REMIND integrated run as
     the emissions output affected. All seven are therefore excluded from the ESABCC 2040 main-run selection; their cuts are
     outside both 85–90 % windows. **Decision for the Secretariat:** keep them excluded, flip the flag, or drop them.

## Where the rules were deliberately not applied

These are the overrides in `pathway-screening-overrides.json`, each reversible by deleting one entry:

- Agora: `base_year` 2018 and `industry_start_year` 2018. Approved by the Secretariat.
- Compass Lexecon: `base_year` 2019.
- EC IA S1–S3 and LIFE: `industry_process_start_year` 2015.

The last two were added on the instruction to add every available source and **need confirmation**. Without the IA override,
S2 and LIFE leave their sets (giving 160 / 196 / 8).

## Verified correct — no action

- `--check` reproduces the workbook.
- Rodrigues: no duplicates against existing REMIND rows. All 337 runs report industry data and 2040 net.
- GECO 2024 NET scope matches the workbook's GECO 2025 rows (2015: 3,429 vs 3,410 Mt).

## Not covered / not added

- **Scenario Compass:** 34 unscreened EU runs were not added because the data are embargoed; no values were written.
  - 10 are exact copies of screened runs.
  - 7 MESSAGE runs are 2015-only stubs.
  - 7 AIM-Hub CF35 runs stop at 2030.
  - 4 GEM-E3 V2023 ELEVATE runs are new but have no 2015/2020 base.
  - 6 are REMIND NGFS Phase 2 damage variants.
  - The Secretariat should decide on the 4 GEM-E3 runs and the Below 2°C damage variant.
- **Not public:** CATALYSE (charts only; ask E3-Modelling), NGFS Phase VI, PRISMA, ELEVATE and UPTAKE. Eurelectric
  (EU27+UK) was not added.
- **GECO 2025 discrepancy:** the workbook's Scenario Compass vintage is about 100 Mt below the JRC FTP file in 2030 and 54–70 Mt
  below in 2040, while capture, biomass and LULUCF match. Intra-EU transport explains only 14–40 Mt, so a different submission
  vintage is likely. Unable to verify; left unchanged.
- The deck charts and the workbook sheets are not rebuilt.

## Deferred backlog

- Report the set statistics per study or model family.
- Extract the NGFS Phase V REMIND IPD-median runs.
- Rebuild the workbook with the added sources.
- Fact-check pass on the extracted rows, starting with the Rodrigues mapping, CETO 2024 r97 and the EC IA Fig 4/Fig 5 choice.

## Decision after this pass — Rodrigues et al. reduced to one run (25 Nov 2026)

The Secretariat decided to use one Rodrigues et al. run instead of 337: the paper's reference scenario
`14_Nzero_57_bio7p5` (ID 3162; 2040 cut 86.8 %, net −99.6 Mt in 2050, capture 382.8 Mt, bioenergy 7.5 EJ, land sink 372.3 Mt).
This is applied by one override entry (`source_representative`, `[human review 2026-11]`). The other 336 runs stay in
`scripts/pathway-screening/additions/rodrigues2026_*.csv`, and deleting the entry screens them again.

| Set | Workbook | All Rodrigues runs | Reference run only |
|---|---|---|---|
| Pathways screened | 1,219 | 1,596 | **1,260** |
| ECL-compatible, within ESABCC limits | 3 | 160 | **6** |
| ECL range, 10% tolerance margin | 10 | 197 | **14** |
| ESABCC 2040-compatible (main runs) | 8 | 9 | **9** |

ECL members:
- ESABCC REMIND 3.2 `rigid_bioLim7p5_300_withICEPhOP` (779)
- Schreyer REMIND-EU `07_NZ_CCS180_highImp` (1266) and `07_NZ_CCS350_highImp` (1275)
- Agora EU Gas Exit Pathway (2000)
- JRC CETO 2024 (2400)
- Rodrigues reference run (3162)

**Open — CETO editions.** CETO 2024 (2400) and CETO 2025 (718) are two vintages of the same POTEnCIA scenario. CETO 2025 misses
ECL on bioenergy (9.17 EJ, against the 9 EJ limit) and CETO 2024 passes. Both are kept until the Secretariat decides. Keeping
CETO 2025 only would give ECL 5.

## Deck update — 25 Nov 2026

The 14-slide deck (`settings3.html`, `Three_pathway_sets_EU_2040_2050.pdf`) was updated to these sets: ECL 6, ECL +10% 14,
ESABCC 2040 9. Slides and wording are kept; only data change. Method, per-slide checks against the old data, and caveats are in
`scripts/pathway-screening/deck/README.md`.

**Findings recorded alongside the update (no values changed):**
- **Funnel, 2040-window box.** The screener gives 70 for the old data where the deck shows 68. All later boxes match. This is
  unexplained.
- **Footnotes on the clean-technology slides contradicted by the re-pull.** CETO 2025 (ID 718) does report PV and wind capacity,
  final energy, electrolysers and capture in the JRC IAMC file. EC IA LIFE has a 2050 capture figure (347.55 Mt, Annex 8 Fig 8).
- **Mixed final-energy bases.** REMIND final energy includes feedstocks and bunkers; POTEnCIA excludes them. Medians mix both.
- **Electrolyser reference ring.** The end-2025 value of 0.49 GW comes from a secondary source citing ACER; not verified.

## Round 4 — exhaustive source sweep (25 Nov 2026)

Eight research agents swept these slices:
- scenario databases
- open repositories
- EU projects and Commission/JRC studies
- think tanks, NGOs, industry and non-English sources
- literature
- downscaled and benchmark datasets
- regional institutes
- the 2040 policy process

They extracted 624 pathways in the Raw-row format; the files are `scripts/pathway-screening/additions/r4-*`. 89 of them are duplicates and are excluded through `duplicate_of` overrides:
- ENGAGE was extracted twice (58).
- 23 ESABCC-database "X"/"Xf" ENGAGE pairs and 4 other same-source pairs have identical values.
- GECO 2022 is held in the JRC file and in the ESABCC database (3).
- EU Reference 2020 was extracted twice (1).

None of the 624 duplicates a pathway already screened, whether matched by name or by 2040/2050 net values within 0.5 Mt.

**Result:** 1,795 pathways are screened; ECL is 6 (unchanged), ECL +10% 18 (+4), and ESABCC 2040 9 (unchanged).

| New pathways screened (535) | Count | Stops at (ECL) |
|---|---|---|
| ESABCC 2023 database (ENGAGE runs, REMIND variants, WITCH DIAG, NGFS3, GECO 2022) | 246 + 6 downscaled | mostly the 2050 net rule |
| AR6 database (native EU28 regions) | 110 | 2050 net rule / no industry data |
| ENGAGE T34 (Bertram et al. 2024) | 57 | 2050 net rule; REMIND: no process CO2 |
| NAVIGATE WITCH, ECEMF WP2, ECEMF WP1 final | 19 + 6 + 6 | 2050 net rule / no industry data |
| CD-LINKS, COMMIT, NGFS Phase 3 | 17 + 9 + 18 | 2050 net rule |
| JRC GECO 2019–2023 | 13 | no industry data (no process CO2 published) |
| PARIS REINFORCE GCAM, IAM COMPACT WILIAM, Strefler et al. 2024 | 8 + 6 + 8 | 2050 net rule / limits |
| TYNDP 2024, Strategic Perspectives 2023, EU Reference 2020 | 3 + 2 + 1 | no industry data / 2050 net rule |

Totals for the 535: the 2050 net rule stops 367, no industry data 136, the 2040 window 27, the 2030 rule 4, and bioenergy 1.

**Open — vintage duplicates (Secretariat decision).** The only new set members are four REMIND 3.0 runs from the ESABCC 2023 database: Elec_dom, Elec_imp, Synf_dom and Synf_imp (IDs 4158–4161). They enter ECL +10% with 2040 cuts of 87.4–89.8 %, about +20 Mt in 2050, and capture of 253–270 Mt. They are the 2023 call submissions of the runs published as Schreyer et al. 2024 (IDs 1321–1325), which are already in the set. Their values differ materially; for example, Synf_dom capture is 269 Mt in the submission against 568 Mt in the published run. If they are treated as earlier vintages, ECL +10% returns to 14. The same question applies to:
- the ECEMF WP1 final runs (5100–5105) against the pre-release run 862 (2050 net +9 Mt vs +107 Mt);
- CETO 2024 against CETO 2025.

**Other open points:**
- The AR6 "EU28" native regions may equal R10 Europe for some models.
- NGFS Phase 3 REMIND damage variants are included as in the ESABCC database.
- **Licences:** the AR6, ENGAGE and NGFS licences restrict redistributing substantial parts of their data. The extracted rows sit in this internal repository; check before any external sharing.
- **Not reachable:** data.paris-reinforce.eu (proxy 502), EUCalc, europarl.europa.eu (403).
- **Unextractable but promising:** VTT EU2040 CDR modelling (2025) has 12 EU27 runs at a 91–93 % cut in 2040, but no base year or industry data and an inconsistent net row. Contact VTT. CATALYSE gives charts only.

**Not changed:** the deck still shows 6 / 14 / 9; it is updated after the vintage decision.

## Decision 26 Nov 2026 — earlier vintages counted once; deck updated

The Secretariat decided that the four REMIND 3.0 runs from the ESABCC 2023 database (IDs 4158–4161) are earlier vintages
(2023 call submissions) of the published Schreyer et al. 2024 runs (IDs 1320, 1321, 1324, 1325). Only the published
versions count. The decision is applied as four `duplicate_of` entries, `[human review 2026-11]`.

**Result:** 1,791 pathways screened; ECL 6, ECL +10% 14, ESABCC 2040 9 (24 passes before the main-run selection). 1,639 report
industry data, and 749 of these pass the 2030 rule.

**Deck:**
- Slides 1, 2 and 4 now show the larger database. The round-4 sources are grouped into five rows; JRC GECO 2019–2024 (no process CO2) moved to the note.
- The set slides are unchanged, because the sets did not change.

The ECEMF WP1 final runs (5100–5105) remain alongside the pre-release run 862. They enter no set, but they are another vintage question for the Secretariat.

## Christoph Bertram's scenario publications (26 Nov 2026)

A dedicated sweep of Bertram's work covered OpenAlex (114 works) and ORCID. His affiliations: IT:U Linz from 2026, previously UMD CGS 2023 to date (now as research affiliate) and PIK. The sweep found that these are already screened or are duplicates:
- NGFS phases III and V
- ENGAGE (2021, 2024, post-Glasgow, Brutschin 2025)
- CD-LINKS and COMMIT
- the 2018 targeted-policies runs
- Bauer 2020 and Soergel 2021
- ScenarioMIP-CMIP7
- nine of ten Frilingou 2026 runs

NGFS Phase I is no longer public, and the Phase V short-term runs stop in 2030.

29 new EU runs were added (`additions/r4-P_bertram_*`, IDs 9500–9528):
- NGFS Phase IV GCAM (7, EU-12 + EU-15 = EU28)
- NGFS Phase IV REMIND IntegratedPhysicalDamages, median and 95th-high (14, main_run FALSE). The Net Zero 2050 runs cut 94.8 % by 2040 but end at +1.2 to +1.8 Mt in 2050.
- NGFS Phase IV MESSAGE downscaled to EU27 (7, no industry energy CO2)
- Frilingou 2026 GCAM 7.0 Survey_NDC_Infl (1)

None duplicates a screened run (2040/2050 net within 0.5 Mt). None enters a set: 19 stop at the 2050 net rule, 7 have no industry data, 2 fall outside the 2040 window and 1 fails the 2030 rule.

**Result:** 1,820 pathways screened (1,661 with EU industry data, 759 passing the 2030 rule); ECL 6, ECL +10% 14, ESABCC 2040 9. The deck slides 1, 2 and 4 are updated.

**Not reached:** the AMPERE and ADVANCE public databases. They need a guest login, which this environment's permission settings refused. AMPERE has EU27 views.

## Round 5 — author, team, older-study, land/CDR and citation sweeps (26 Nov 2026)

Five further agents ran these sweeps:
- **IAM teams by author (13 researchers):** Luderer, Kriegler, Pietzcker, Ueckerdt, Strefler, Riahi, Krey, van Ruijven, van Vuuren, Bob van der Zwaan, Sabine Fuss, Minx, Edenhofer.
- **EU model teams by author:** E3M/NTUA, CMCC, the JRC TIMES/POTEnCIA/POLES teams, Enerdata, IER, UCL, SINTEF and Cambridge Econometrics.
- **Older EU studies (2010–2022)** and **land/CDR/bioeconomy pathways.**
- **Citation chasing:** 629 works from 2023–2026 citing the main EU pathway studies. This found nothing new.

They added 341 pathways (`additions/r5-*`). None duplicates a screened pathway; the two near-identical Merfort 2023 pairs differ by up to 26 Mt and are kept. The new pathways are:
- **PIK REMIND studies:** Merfort et al. 2026 (225) and 2025 (29), Merfort et al. 2023 (47), Luderer et al. 2022 (11), Strefler et al. 2021 (12 + 4) and Bantje et al. 2026 (5). The region is REMIND EUR, which is EU27+UK. These are global studies, not EU-target designs.
- **GEM-E3 EU NetZero:** 2 runs, from the climate_solutions explorer.
- **JRC GECO 2018:** 3 runs, from PDF tables.
- **TYNDP 2022:** Distributed Energy and Global Ambition.
- **EU Reference Scenario 2016.**

**Result:** 2,161 pathways screened, 1,997 with EU industry data and 811 passing the 2030 rule. The sets are unchanged: ECL 6, ECL +10% 14, ESABCC 2040 9. Of the 341 new pathways, 330 stop at the 2050 net rule. The closest misses:
- Luderer 2022 sensitivity runs: 87.5–89.9 % cut in 2040, +178 to +442 Mt in 2050.
- Best Merfort 2026 runs: 92–93.5 % cut, but about 750 Mt of capture and 15 EJ of bioenergy.

Deck slides 1, 2 and 4 are updated.

**Flags:**
- **GEM-E3 net GHG:** the Kyoto total probably excludes LULUCF for the whole GEM-E3 family. A family-wide decision is needed.
- **Gross industry CO2:** the Luderer and Merfort files publish industry energy CO2 gross of industry CCS.
- **Bantje 2026:** the 2015 level (about 5,150 Mt) looks high for EU27+UK, and its totals with and without bunkers are identical. Neither could be explained.
- **Merfort 2026:** EU land CO2 is a +536 Mt source in 2020.
- **Not reached:**
  - AMPERE and ADVANCE (guest login).
  - The Schreyer 2020 ERL data statement (publisher 403).
  - The ECF Roadmap 2050 archive (timeout).
- **Watch list:** Merfort 2026 REMIND 1.5 °C data is reviewer-only until acceptance. Once the Milestones paper has a DOI, its citers can be chased.
