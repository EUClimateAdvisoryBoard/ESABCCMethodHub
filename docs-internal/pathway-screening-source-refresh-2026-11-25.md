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
