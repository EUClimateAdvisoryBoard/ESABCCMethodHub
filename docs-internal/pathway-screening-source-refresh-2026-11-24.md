# Pathway screening: source refresh, 24 Nov 2026

> AI-compiled — pending Secretariat verification. This pass adds sources to the three-set screening; it changes no value in
> `EU_pathway_screening_three_sets.xlsx`. A separate fact-check pass of the extracted rows is still due.

## Context

The three-set screening in `EU_pathway_screening_three_sets.xlsx` (commit 785bdd4, built 23 Nov 2026) holds 1,219 pathways with EU industry data
from 13 sources. Only 3 pathways passed the strict set ("ECL-compatible, within ESABCC limits"), all from REMIND. Four research agents swept IAM
platforms, EU institutions, think tanks/industry and the peer-reviewed literature for additional EU27 pathways. The Secretariat chose four sources
from the shortlist for this pass (shortlist items 3–6). Their values were extracted into the workbook's Raw-row format and re-screened.

## Method

- `scripts/pathway-screening/screen_three_sets.py` re-implements the sheet Screening formulas, reading values (Raw), limits (Limits) and
  per-pathway inputs (Screening) from the workbook. On the workbook alone it reproduces **3 / 10 / 8** and the 23 ESABCC 2040 passes; set
  membership and the "stops at" reason agree for all 1,219 pathways, and the 2030 cut, 2040 cut and final-energy decline agree to
  floating-point precision (max. difference < 1e-12 percentage points).
- Added values are in `scripts/pathway-screening/additions/`, one row per published number with a locator. No value was estimated, read off an axis
  or back-calculated from a rounded percentage. Values that are not published are absent, which the screening counts as "no data" (passes).
- Exceptions are in `scripts/pathway-screening/pathway-screening-overrides.json` (content-hash ids, tagged reasons).

## Result

| Set | Before | After |
|---|---|---|
| ECL-compatible, within ESABCC limits | 3 | **4** (+ Agora EU Gas Exit Pathway) |
| ECL range, 10% tolerance margin | 10 | **11** (+ Agora EU Gas Exit Pathway) |
| ESABCC 2040-compatible | 8 | 8 |

## Findings per source

1. **Agora Energiewende (2023), *Breaking free from fossil gas*, EU Gas Exit Pathway (ID 2000): passes ECL and ECL +10%.**
   - Net GHG incl. LULUCF, domestic (Annex 1 Table 1, p. 64, row Total): 3,509 Mt (2018), 1,865 (2030), 548 (2040), −39 (2050).
     Harmonised on 2018, the 2030 cut is 59.7 % and the 2040 cut is 88.2 %.
   - Other limits:
     - CCS: 106 Mt, gross.
     - Bioenergy and waste: 615 TWh = 2.2 EJ (Table 1). This includes waste; no bioenergy-only figure is published.
     - LULUCF in 2050: −400 Mt (Annex 2 Table 3, p. 65). This is **exactly on** the land-sink risk level, which excludes only values above 400.
     - Hydrogen in 2030: 186 TWh = 0.67 EJ. This includes fossil hydrogen.
   - Two overrides, both approved by the Secretariat in session on 24 Nov 2026 (`[human review 2026-11]`):
     - `base_year` = 2018: no 2015 or 2020 value is published.
     - `industry_start_year` = 2018: industry is published for 2018 and 2050 (797 and 36 Mt CO2e), as one GHG total without an energy/process split.
   - Self-inconsistency in the source: the 2030 and 2040 sector rows of Table 1 sum to 1,840 and 542, not the printed 1,865 and 548, and
     Figure 18 (p. 39) labels 2040 as 531. The pathway passes on all three 2040 values (cut 88.2–88.5 %). The printed total is used.
   - Not published: final energy 2018/2020, which counts as passed, and absolute totals including international transport.
   - The table prints the 2040/2050 LULUCF values in Table 1 without a minus sign; Table 3 gives −361/−400.
2. **UBA Climate Change 18/2026 (Öko-Institut, Fraunhofer ISI, IREES), IDs 2010–2012: no pass.**
   - EUTarget: 2040 cut 87.9 %, net 0 in 2050, CCS 106 Mt. It stops at the land-sink risk level: LULUCF is −414 Mt in 2050 (p. 88), 14 Mt over.
     The ECL +10% set applies no tolerance to the land sink.
   - EUSupreme: 2040 cut 92.0 %, net −130 Mt. It stops at the land-sink risk level (−499 Mt).
   - EUBase: a current-policy run, +816 Mt in 2050.
   - Scope: the labelled totals exclude international aviation but include international navigation (Fig. 19 and Fig. 53 notes). Neither leg is
     printed separately, so no domestic-only total could be built. The cuts are harmonised on the report's 2020 value (3,411 Mt against the
     inventory's 3,044 Mt), which removes the level difference but not any difference in trend.
   - Not published: primary biomass, and hydrogen in 2030 for EUTarget/EUSupreme (the report says only "roughly twice" EUBase).
   - The report disagrees with itself on EUSupreme industry in 2050: 161 Mt in the text (p. 122) and 141 Mt in Fig. 43. The text value is stored;
     the difference does not affect the result.
3. **EC SWD(2026) 616, ETS review impact assessment (IDs 2020–2029): NOT CHECKABLE.**
   - The "85%" and "90%" runs are described only as percentages, and no 1990 base or absolute Mt value is printed.
   - Removals stored underground are given for 2030–2040 only (Annex 8 Part I Table 11), and no 2050 values are published.
   - The supplementary spreadsheet returned HTTP 429 on every attempt (5 tries, 45–90 s apart). The publication page labels it "Technology
     Assumptions Energy".
   - The runs are kept as placeholders with no values.
4. **CLEVER (négaWatt, 2023), Open Energy Platform, region `eu27` (ID 2050): no pass.**
   - 2040 cut 93.4 % (domestic, both bunker rows excluded); net −57.5 Mt in 2050; no CCS.
   - It stops at the final-energy filter: −25.4 % 2020–30 on the EED perimeter. Every definition tried exceeds 20 %, ranging from 20.1 %
     (against Eurostat's 2020 actual) to 25.5 %.
   - Primary bioenergy in 2050 is 6.78 EJ, not the 6.0 EJ in the first research note (that sum came from the wrong of two unlabelled OEP series).
   - Silent-failure note: two OEP tables hold two unlabelled series per key, and parsing by key silently keeps the last one. The row ids used are
     recorded in each Note.

## Verified correct — no action

- Agora Table 1 total row (3,509 / 1,865 / 548 / −39) and the 2018 sector sum (1,096 + 797 + 453 + 1,414 − 251 = 3,509), checked against the PDF text.
- UBA EUTarget 2030 net (1,841 Mt), checked against the report text.
- The re-implemented screening reproduces the workbook (see Method).

## Not covered in this pass

- Shortlist items 1–2 (Rodrigues et al. 2026, Zenodo 10.5281/zenodo.18661988; JRC CETO 2024) were not added.
- The EC 2040 IA rows on sheet Sets (S2, LIFE) were not completed from the Annex 8 graph-data workbook.
- The GECO 2025 discrepancy (screening 15C 2040 = 276.9 Mt against 333.6 Mt in the JRC FTP file) is left unchanged; unable to verify which vintage
  is right.
- The sector-value charts and deck were not rebuilt; this pass covers set membership only.
- The workbook itself is unchanged: the added sources are not in its sheets.

## Deferred backlog

- Rebuild the workbook (Raw, Screening, Sets) with the added sources once `build_xlsx3.py` can run from repository files.
- Retry the SWD(2026) 616 supplementary spreadsheet, and ask DG CLIMA for economy-wide series of the 85 % runs.
- Ask the UBA authors for the figure data behind Fig. 19 (the international-navigation split) and for primary biomass.
- Ask the NGFS Phase VI, PRISMA, ELEVATE and UPTAKE consortia for access.
