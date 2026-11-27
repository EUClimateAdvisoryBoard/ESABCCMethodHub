# Audit: EU27 industry GHG decomposition 2005–2024 (production vs intensity effect)

> AI-compiled — pending Secretariat verification. Independent audit, 26 Nov 2026. No repository file was edited.

Scope: `scripts/pathway-screening/deck/` files `industry_intensity.json`, `production_tonnes.json`,
`production_index.json`, `steel_check.json`, `chem_weights.json`, `method_comparison.json`, `fig_method_compare.py`,
`fig_intensity.py`, `README.md` (from line 71), `sector_dump.json` key `H`, and `/inventory_sectors_2005_2024.json`.

Every number below was re-derived from primary sources downloaded in this session. The raw files are in `raw/` next to this
file, the scripts in `scripts/`, and the console outputs in `out_*.txt`.

## Sources re-pulled (all retrieved 26 Nov 2026)

| Source | URL | Release / note |
|---|---|---|
| Eurostat `env_air_gge` (EU27_2020, MIO_T, all gases) | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_air_gge?geo=EU27_2020&unit=MIO_T&sinceTimePeriod=2005 | updated 2026-06-02, i.e. the 2026 submission (1990–2024). 1.A.2 2024 = 351.562 Mt, identical to EU NID 2026 Table 3.24 (351 562 kt). |
| **EU CRT 2026** (all CRT tables, 1990–2024) | https://www.eea.europa.eu/en/analysis/publications/annual-european-union-greenhouse-gas-inventory-2026/eua_crt_2026.zip/@@download/file | 21.7 MB zip, 35 xlsx files. Linked from the EEA publication page. Without `/@@download/file` the URL returns an HTML page (200). |
| EU CRT 2025 (1990–2023) | https://www.eea.europa.eu/en/analysis/publications/annual-european-union-greenhouse-gas-inventory-2025/eu_crt_1990_2023.zip/@@download/file | used only to test the "different inventory release" claim |
| EU NID 2026 | https://www.eea.europa.eu/en/analysis/publications/2026-unfccc-submission-of-the-eu-ghg-inventory-report-under-the-paris-agreement-1990-2024/eu-nid-2026_final.pdf/@@download/file | §3.6.2 (1.A.2 ↔ ISIC concordance), Table 3.24, Table 4.34 |
| Eurostat `sts_inpr_a` (I21, CA, PRD) | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_inpr_a?geo=EU27_2020&unit=I21&s_adj=CA&indic_bt=PRD&sinceTimePeriod=2005&nace_r2=… | updated 2026-11-19 |
| Eurostat `sts_copr_a` F (construction) | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_copr_a?geo=EU27_2020&unit=I21&s_adj=CA&indic_bt=PRD&nace_r2=F&sinceTimePeriod=2005 | sensitivity only |
| PRODCOM DS-059359 | https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-059359?format=JSON&lang=EN&reporter=EU27_2020&product=<code> | codes 20151075, 20151050, 20143385, 20141130, 2410T110 |
| worldsteel Steel Statistical Yearbooks 2015, 2016, 2018, 2020 (concise) | https://worldsteel.org/wp-content/uploads/Steel-Statistical-Yearbook-2015.pdf (and 2016, 2018, 2020-concise-version) | Table 1 |
| Eurofer European Steel in Figures 2026 | https://www.eurofer.eu/assets/european-steel-in-figures-2026/Steel-in-Figures-SIF-Final_printer.pdf | table "EU crude steel output by production route 2016–2025" |
| CEMBUREAU Key facts & figures | https://cembureau.eu/about-us/key-facts-figures/ | inline Chart.js data, chart "Cement Production And Consumption EU 27 & Cement Europe 2000–2024" |
| FAOSTAT Forestry bulk | https://bulks-faostat.fao.org/production/Forestry_E_All_Data_(Normalized).zip | file dated 1 Apr 2026; area 5707, item 1876, element 5510 |

Blocked or failing hosts (bodies read): `unfccc.int` and `di.unfccc.int` answer 200 with a 212-byte Incapsula JavaScript
challenge; `sdi.eea.europa.eu` (EEA datahub file store) closes the tunnel mid-exchange; `discodata.eea.europa.eu` answers 502.
None of them is needed, because the EEA publication page serves the full EU CRT.

---

## Findings

### C-1 (critical). The black line and the decomposition use different scopes, and the stated reason is wrong

- **Where:** `inventory_sectors_2005_2024.json` and `sector_dump.json` → `H.*.industry` (887.7 / 527.5) against
  `industry_intensity.json` → `sector.E2005` / `E2024` (906.3 / 544.5); `README.md:131`; `fig_intensity.py:54`
  ("Sector totals are 1–3 % above the EEA series on the industry slide (different inventory release)").
- **Current claim:** the 18 Mt gap reflects a different inventory release.
- **What the data show:**
  - **Same release.** In the same file, supply, mobility, buildings and ecosystems equal the current Eurostat release
    (2026 submission) to 0.01 Mt in every year. EEA `UNFCCC_v33`, the source named in the export's `hist.py`, is the same
    submission.
  - **Not the 2025 release either.** The EU CRT 2025 gives 904.0 Mt for 2005 and 558.8 Mt for 2023 in the stated scope,
    against 887.7 and 536.2 in the deck.
  - **The difference is three 1.A.2.g subcategories.** The industry column is the 2026 CRT for 1.A.2 + 2.A + 2.B + 2.C +
    2.E + 2.H minus:
    - 1.A.2.g.iii mining and quarrying (1.83 Mt in 2005, 1.36 Mt in 2024);
    - 1.A.2.g.v construction (2.89 / 2.98 Mt);
    - 1.A.2.g.vii off-road vehicles and other machinery (13.87 / 13.67 Mt).

    Values are CO₂ + CH₄×28 + N₂O×265 from CRT Table 1.A(a)s2. This reproduces all 20 years within 0.05 Mt (rounding;
    `out_eea_scope_fit.txt`). No combination of Eurostat-published categories reproduces it, because Eurostat does not publish
    the 1.A.2.g subcategories (best fit ±5.9 Mt).
  - **Provenance not committed.** The series came from `/home/claude/deck/deck7_data.json` `hist` (see `export/scripts/hist.py`
    in `EU_six_sectors_export.zip`). That file is not in the repository, so the provenance was undocumented.
  - **The gap is 2.1 % in 2005 and 3.4 % in 2024**, not "1–3 %".
- **Correct:** the EEA line is a manufacturing scope (excluding mining, construction and off-road machinery) from the same
  2026 submission. The decomposition uses the full 1.A.2 scope. On slide 8 the waterfall (906 → 545) and the black line
  (888 → 528) therefore do not reconcile, and the published footnote gives a false cause.
- **Fix:** use one scope and one source for both. See "Recommended final method": the manufacturing scope from EU CRT 2026,
  which reproduces 887.7 / 527.5 exactly. Correct `README.md:131` and `fig_intensity.py:54`. Commit the scope definition
  and the CRT extraction (Table 1.A(a)s2 rows 1.A.2.g.iii, .v, .vii) to `scripts/`.

### M-1 (major). T2 chemicals basket: process-emission weights applied to the whole branch, combustion included

- **Where:** `fig_method_compare.py:12-15`; `chem_weights.json`; `method_comparison.json` → `results."T2…".branches.Chemicals`
  (−59.8 / −37.9); `README.md:186-194`.
- **Issue:**
  - **The weights are N₂O-dominated.** Nitric acid (34.6 Mt) and adipic acid (9.4 Mt) take 48 % of the weight. Their
    emissions fell by 95 % and 99 % through N₂O abatement, so the products' tonnage moves only the residual 1.7 Mt that is
    left of them.
  - **The basket covers emissions it does not describe.** It is applied to 1.A.2.c combustion (77.3 Mt in 2005) and to the
    rest of 2.B (24.1 Mt: 2.B.9 fluorochemicals, 2.B.10 hydrogen and other). The fuel use of the whole chemicals branch is
    thereby indexed to how much nitric and adipic acid were made.
  - **Which product carries which emissions changes the answer.** Branch production effect:
    - −59.8 Mt with the basket (T2);
    - −25.9 Mt with sub-branches (each 2.B.x on its own product, combustion and the rest of 2.B on C20);
    - −50.1 Mt with sub-branches and combustion on C20.1 basic chemicals (index 71.0 in 2024).

  Source: `out_lmdi.txt` §6.
- **Fix:** drop the single basket. Decompose chemicals as sub-branches, set out in the recommended method:
  - 2.B.1, 2.B.2, 2.B.3 and 2.B.8 each on its own activity (CRT activity data; PRODCOM as sensitivity);
  - 1.A.2.c plus the residual 2.B on the C20.1 basic-chemicals volume index (C20 as sensitivity).

  Combustion is concentrated in basic chemicals (steam crackers, ammonia, chlor-alkali), which is why C20.1 suits it better
  than C20 as a whole. Do not add C21: the C20_C21 index is 161 in 2024 (2005 = 100), driven by pharmaceuticals, which emit
  little.

### M-2 (major). PRODCOM nitric acid 2024 is an outlier; the adipic acid series is too rounded to use

- **Where:** `production_tonnes.json` → `series.nitric_acid.values.2024` = 4281 kt N; `series.adipic_acid`.
- **Issue: nitric acid.**
  - PRODCOM falls 19 % from 2023 to 2024 (5289 → 4281 kt N). The EU CRT activity data for 2.B.2 rise 10 %
    (11 214 → 12 297 kt), and 2.B.2 N₂O rises 4 % (5.80 → 6.03 kt).
  - The ratio of CRT to PRODCOM (converted to HNO₃) is 0.44–0.56 in 2005–2023 and jumps to 0.64 in 2024
    (`out_crt_coverage.txt`).
  - With the CRT trend for nitric acid, the T2 basket is 71.6 in 2024 rather than 65.0. The T2 chemicals production effect
    becomes −46.3 Mt rather than −59.8, and the T2 industry share falls from 50.4 % to 46.7 % on the manufacturing scope
    (`out_avg3_and_nitric.txt`).
  - Unable to fully verify which source is right; flagged rather than replaced.
- **Issue: adipic acid.** The series is "adipic acid; its salts and esters", rounded by ±100 kt in 2005 and ±70 kt in 2024.
  Its 2024 index (70.8) could lie anywhere between 55 and 91. The CRT activity data for 2.B.3 are mostly confidential
  (31 kt in 2024 against 560 kt in PRODCOM).
- **Fix:**
  - Record the 2024 nitric-acid outlier in `production_tonnes.json` flags.
  - In the sub-branch method these products carry only 2.B.2 and 2.B.3 emissions, so the choice moves the result by 2.6 Mt
    (R: −158.5 against −161.0), not 13 Mt.
  - Show 2023 as an end-year check.

### M-3 (major). Sector index lines contradict the waterfall next to them

- **Where:** `industry_intensity.json` → `sector.production_index_emission_weighted` / `intensity_index`; `fig_intensity.py:39, 53`;
  `README.md:118, 122, 160`.
- **Issue:**
  - The sector production index is a Laspeyres index weighted by 2005 emissions: 85.8 in 2024 (T1) and 88.0 (V). The
    intensity line is the emissions index divided by it: 70.0 (T1) and 68.3 (V).
  - The waterfall comes from the sum of branch LMDI effects. Its exact implied indices, exp(effect / L) with L the sector
    log-mean, are:
    - T1: production 84.2, intensity 71.4;
    - V: production 86.9, intensity 69.2.
  - The Laspeyres line therefore implies a production effect of −108.8 Mt, while the waterfall beside it says −122.2.
  - The Laspeyres index has a structure effect folded in, and the LMDI sum does not share it.
- **Correct values:** T1 84.2 / 71.4; V 86.9 / 69.2; recommended method R on the manufacturing scope 79.3 / 75.0.
  Source: `out_lmdi.txt` §5b and `out_lmdi_mfg_scope.txt`.
- **Fix:** compute the sector index lines for each year t as exp(ΣΔP_i(2005→t) / L_t) and exp(ΣΔI_i / L_t). Their product
  equals the emissions index exactly, and they match the waterfall. Correct the README numbers "88 / 68" and "86 / 70".

### M-4 (major). The production share depends heavily on the base year, and this is not disclosed

- **Where:** `README.md:120-126, 151-160, 182-188`; slide wording "production effect 34 % of the decline".
- **Issue:** 2005 is close to the 2007 cyclical peak. The production share of the decline changes as follows
  (`out_lmdi.txt` §7, `out_avg3_and_nitric.txt`):

  | Variant | 2005–2024 | 2005–2023 | 2007–2024 | 2010–2024 | Averages 2005–07 → 2022–24 |
  |---|---|---|---|---|---|
  | V | 27.7 % | 25.9 % | 43.2 % | 20.0 % | 32.8 % (mfg scope) |
  | T1 | 33.8 % | 34.2 % | 50.5 % | 24.9 % | 42.7 % |
  | R, recommended (mfg scope) | 44.6 % | 44.6 % | — | — | 50.2 % |

- **End year: robust.** 2023 against 2024 moves the share by 2 percentage points at most. In the 2026 submission, 2024 is a
  regular inventory year, not a proxy. The EEA line (C-1) is also the 2026 submission, not the approximated inventory.
  The 2024 inputs that are preliminary are PRODCOM (see M-2) and `sts_inpr_a` C10–C12 2024 (flag `i`).
- **Fix:** state the base-year sensitivity on the slide or in its note. Consider three-year averages at both ends.

### M-5 (major). Inventory activity data were obtainable; two stated facts are wrong

- **Where:**
  - `README.md:149` ("could not be downloaded (unfccc.int bot challenge)");
  - `README.md:145` ("only an unwrought-aluminium proxy exists, not primary aluminium");
  - `production_tonnes.json` → `_source.inventory_attempt.preferred` ("Not obtained"), `.eea` ("only the NID PDF is offered"),
    and `branch_mapping."Non-ferrous metals".note`.
- **Correct:**
  - The EEA publication page links `eua_crt_2026.zip`, which contains Table 2(I).A-H for every year 1990–2024 (URL in the
    sources table).
  - Extracted to `crt_activity_2005_2024.json`; indices for 2024 (2005 = 100):

    | Product | Index | Comparison |
    |---|---|---|
    | 2.C.1.a steel | 70.1 | crude steel 71.0; the CRT/Eurofer ratio is stable at 0.90–0.92 |
    | 2.C.1.b pig iron | 61.9 | |
    | 2.A.1 cement | 62.5 | clinker-type activity data; IEF stable at 0.54–0.55 |
    | 2.A.2 lime | 69.4 | |
    | 2.A.3 glass | 97.2 | |
    | 2.B.1 ammonia | 64.1 | |
    | 2.B.2 nitric acid | 81.8 | |
    | 2.B.8.b ethylene | 57.9 | |
    | **2.C.3 primary aluminium** | **28.7** | C24.4: 79.8 |

  - The CRT activity data are sums over the Member States that report them. Confidential entries ("C") are excluded, so the
    levels undercount: the CRT 2024 xlsx shows 108 282 kt for 2.A.1, while NID Table 4.34 gives 113 723 kt gap-filled. Use
    them for trends only where coverage is stable (steel, cement, lime, glass, ammonia, ethylene; nitric acid with care;
    adipic acid not usable).
- **Fix:**
  - Correct both README statements and the JSON `_source` and note.
  - Use the CRT as the primary activity source with PRODCOM, CEMBUREAU and worldsteel as cross-checks. Steel shows the
    agreement.
  - Put 2.C.3 on primary aluminium. Effect: −4.8 Mt production on 7.0 Mt of 2005 emissions.

### M-6 (major). "Other industry" uses a proxy that does not match the emissions in it

- **Where:** `README.md:115`; `industry_intensity.json` → `branches."Other industry"` (+17.1 / −58.9).
- **Issue:**
  - 1.A.2.g covers the following (EU NID 2026 §3.6.2):
    - ISIC 17–20, 25 and 28–37;
    - construction (ISIC 45);
    - mining (1.A.2.g.iii);
    - off-road machinery (1.A.2.g.vii);
    - Germany's entire industrial autoproducer power and heat (§3.6.2.7).
  - Total manufacturing C also contains the energy-intensive branches already decomposed and the fast-growing C21 and
    C26–C30.
  - The +17 Mt production effect, the only large positive bar, is therefore largely an artefact of the proxy:
    - on the manufacturing scope of C-1: +14.8;
    - with the construction index F (97.5 in 2024): about −3.
- **Fix:**
  - Adopt the manufacturing scope (C-1), which removes construction, mining and off-road from this branch.
  - Label the branch "other manufacturing (proxy: total manufacturing)".
  - P2: build a value-added-weighted index for manufacturing excluding C10–C12, C17, C19, C20, C23 and C24 from
    `nama_10_a64` chain-linked volumes.

### m-1 (minor). Unallocated 1.A.2 dropped silently from the branch sum

- **Where:** `industry_intensity.json` → `sector.E2024` = 544.5; `fig_method_compare.py:71` ("industry −362 Mt").
- **Issue:** Eurostat's 1.A.2 exceeds the sum of 1.A.2.a–g by 0.6–2.3 Mt from 2013 onwards: 0.93 Mt in 2024 and 2.28 Mt in
  2023. The branch sum drops this.
- **Correct:**
  - the sector total is 545.47 Mt in 2024;
  - the change is −360.8 Mt in the full scope and −360.3 Mt in the manufacturing scope.

  The time series also has spurious dips (for example 2013, 2016–2020, 2023).
- **Fix:** carry the residual 1.A.2 − Σ(1.A.2.a…g) explicitly in "other". Recommended method R does this.

### m-2 (minor). Rounded inputs in `fig_method_compare.py:23`

- **Issue:** the LMDI is computed from `E2005` and `E2024` rounded to 0.1 Mt, not from the series. Several stored values are
  off by 0.1:

  | Value | Stored | Correct |
  |---|---|---|
  | Non-ferrous intensity effect | −9.1 | −9.2 (−9.19) |
  | V steel, production / intensity | −49.7 / −23.1 | −49.6 / −23.2 |
  | V minerals, intensity | −46.0 | −45.9 |
  | `intensity_index_2024`, non-ferrous | 60.2 | 60.0 |
  | `intensity_index_2024`, chemicals | 51.5 | 51.6 |
  | `intensity_index_2024`, food | 60.9 | 60.8 |

- **Fix:** use `series[y]['E']` unrounded.

### m-3 (minor). Double rounding in the README

- **Issue:**
  - `README.md:84`: manufacturing index 2024 shown as 114. The true value is 113.45, so it should read 113. Likewise
    `README.md:92`: "14 % above 2005" should read 13 %.
  - `README.md:157`: minerals in tonnes shown as −81 / −27. The true values are −80.45 / −26.81, so they should read −80 / −27.
- **Fix:** round once, from unrounded values.

### m-4 (minor). "Almost all of that spread comes from chemicals" (`README.md:188`)

- **Correct:** of the 79.3 Mt difference between V and T2 in the production effect, chemicals contribute 53.9 (68 %),
  minerals 19.1, paper 3.3 and steel 3.0. The sentence should read "about two-thirds".

### m-5 (minor). Concordance details

- **2.C.2 ferroalloys** is in NACE 24.10, with iron and steel, not 24.4. It amounts to 3.42 Mt in 2005 and 1.25 Mt in 2024.
  Moving it changes the branch results as follows:
  - steel: −52.6 / −20.2 → −53.3 / −21.7;
  - non-ferrous: −4.1 / −9.2 → −3.6 / −7.5.
- **2.H** is mainly 2.H.1 pulp and paper and 2.H.2 food and beverages, so it belongs to those branches, not to "other"
  (1.23 Mt in 2005, 0.30 Mt in 2024).
- **1.A.2.d** covers ISIC 21–22, which corresponds to C17 + C18. C18 printing fell to 53. Emissions are dominated by C17,
  so keep C17 and note it.
- **1.A.2.c** covers ISIC Rev. 3.1 Division 24, which includes C21 in principle. See M-1 for why C21 should not be added.
- **Iron and steel:** 1.A.2.a covers ISIC 271 + 2731, that is C24.1–C24.3 plus iron casting. C24.1 is an acceptable proxy.

### m-6 (minor). CEMBUREAU 2018 EU27 value looks wrong; the UK question cannot be fully verified

- **2018 value.** The EU27 value is 179.8 Mt, between 165.7 (2017) and 173.1 (2019). The gap between Cement Europe and EU27
  production is 3.2 Mt in 2018, against 11–15 Mt in every other year from 2000 to 2024, and EU27 consumption is smooth.
  This affects only the 2018 point of the minerals line (P_used 75.1).
- **Unit.** Tonnes is confirmed: the bar chart on the same page shows EU27 = 161 "Million tonnes".
- **UK.** CEMBUREAU does not state the composition. The stable 12–13 Mt gap to Cement Europe in 2000–2017 is consistent with
  a fixed EU27_2020 series. If the UK (about 11.5 Mt) were in the 2005 figure, the 2024 index would be 70.5, not 67.1.
  Unable to fully verify — left unchanged; flag it.
- **Product.** The data are cement, not clinker; 2.A.1 activity in the CRT is mostly clinker (index 62.5). Cement is the
  right measure of output if the clinker ratio is meant to count as an intensity lever. Keep cement and show clinker as a
  sensitivity: R +5.4 Mt production.
- **Fix:** flag 2018 in the JSON.

### m-7 (minor). Lime shown as sold quicklime

- **Where:** `fig_method_compare.py:39`, `README.md:184` ("lime 82").
- **Issue:** sold quicklime (PRODCOM) excludes captive lime. Its ratio to the CRT 2.A.2 activity data drifts from 1.48 to 1.26.
- **Correct:** CRT lime index for 2024 is 69.4.

### m-8 (minor). Comparison with the Secretariat's steel chart (`README.md:128-129`)

- **Issue:** the README uses the C24.1 value index (−27.6 %). The slide now uses crude-steel tonnes (−29.0 %).
- **Correct:** the Secretariat-style split is −55.9 / −16.9 with tonnes, and −53.2 / −19.6 with C24.1. The LMDI split with
  tonnes is −52.6 / −20.2.

### m-9 (minor). Figure footers and labels

- `fig_intensity.py:53` describes the sector index as "weighted by 2005 emissions" (see M-3).
- `fig_intensity.py:54` says "1–3 %" (correct: 2.1–3.4 %) and "different inventory release" (wrong, see C-1).
- `fig_intensity.py:79` labels minerals "cement, glass". Lime (21 Mt) is larger than glass (4 Mt), so "cement, lime, glass"
  is more accurate.
- `fig_method_compare.py:69` is dead code (`if False`).

### m-10 (minor). Eurostat flags not carried

- **Issue:** `sts_inpr_a` carries flag `i` on C24.1, C20 and C24.4 for 2005–2014/15, and on C24.4, C10–C12 and C23.5 for
  2024. The flags are not recorded in `production_index.json` or `industry_intensity.json`.
- **Fix:** record them.

---

## Verified correct — no action

- **Eurostat emissions (branches).** All seven branch emission series in `industry_intensity.json` and `steel_check.json`
  match the 2026 Eurostat release within 0.005 Mt in every year 2005–2024.
- **CRF definitions.** All CRF codes and definitions are applied as stated.
- **Scope choices.** Excluding 2.D, 2.F and 2.G is sensible and consistent in both series: they are product use, not
  production. 1.A.1.b refining sits in energy supply.
- **`chem_weights.json`.** 28.091 / 34.582 / 9.419 / 19.822 Mt match Eurostat 2005 for 2.B.1, 2.B.2, 2.B.3 and 2.B.8.
- **`sts_inpr_a`.** Every I21 value in `production_index.json` (C, C17, C20, C23, C24) matches, and the 2005 = 100 rebasing
  is correct within ±0.05. Every `P` series in `industry_intensity.json` matches: C24.1, C24.4, C20, C23, C17, C10–C12, C.
  `steel_check.json` C24.1 matches.
- **Crude steel.**
  - All 2005–2015 values equal worldsteel EU(28) minus United Kingdom exactly, using the stated yearbook editions; for
    example 2005: 195 681 − 13 239 = 182 442.
  - 2016–2024 equal Eurofer ESIF 2026 exactly (2024: 129 586 kt).
  - The splice checks for 2016–2019 (+0.15 / +0.06 / −0.13 / −0.26 %) are correct.
  - Index 2024 = 71.0.
  - Mixing yearbook vintages changes values by 86 kt at most (2014), which is immaterial.
  - The CRT 2.C.1.a trend (70.1) corroborates it.
- **Cement.** The CEMBUREAU values 2005–2024 match the page's Chart.js dataset "PRODUCTION EU27" exactly; index 2024 = 67.1.
- **PRODCOM.** Ammonia, nitric acid, adipic acid, ethylene and pig iron: every value, unit (KG_N for ammonia and nitric acid),
  `:R` / `:E` flag and rounding base matches DS-059359. The odd 4 kt rounding bases for pig iron in 2011 and 2017 are in the
  source itself.
- **FAOSTAT.** Paper and paperboard values and A/E flags match the bulk file; index 2024 = 82.6.
- **LMDI-I.** The independent re-implementation reproduces the following to ≤0.1 Mt (except the rounding cases in m-2):
  every branch and industry effect in `method_comparison.json` (V, T1, T2), and the `industry_intensity.json` branch and
  sector effects: T1 −122.2 / −239.6; V −100.1 / −261.7; T2 −179.4 / −182.4. The shares 27.7 / 33.8 / 49.6 % are correct.
  The additive decomposition has no residual, and summing branch effects is valid.
- **`steel_check.json`.** The emissions and intensity indices are internally consistent, using C24.1.
- **Steel figure.** The intensity line in `fig_steel_intensity.png` (87.7 in 2024) is consistent with its LMDI.
- **Branch intensity indices.** `intensity_index_2024` values are consistent with E / P, apart from rounding (m-2).
- **README index table** (`README.md:81-88`): 59, 96, 95, 80, 74 are correct; for 114 see m-3. "−41 %" and "−4 % to −26 %"
  are correct.
- **README method comparison table** (`README.md:180-185`): 72/71, 74/67, 96/65 (67/64/71/61), 95/83 and 80/25 are correct,
  as are "over 95 %" for nitric (−95.4 %) and adipic (−99.4 %) acid.
- **Industry change.** The 2005–2024 annual reduction on the EEA line, (887.7 − 527.5) / 19 = 19.0 Mt per year, is
  arithmetically correct for that scope.

## Recommended final method

1. **One emissions source and scope for both the black line and the decomposition.** Use EU CRT 2026 (EEA `eua_crt_2026.zip`;
   for the published categories this is identical to Eurostat `env_air_gge`, June 2026). Define manufacturing industry as:
   - 1.A.2 minus 1.A.2.g.iii, 1.A.2.g.v and 1.A.2.g.vii;
   - plus 2.A + 2.B + 2.C + 2.E + 2.H.

   This reproduces the existing slide line, 887.7 → 527.5, to 0.05 Mt, so the black line stays as it is and becomes
   documented. It also matches the NACE C production proxies. Carry unallocated 1.A.2 in "other manufacturing". If
   construction and off-road are wanted, use the full scope (906.3 → 545.5) on both the line and the waterfall instead.
2. **Sub-branches with matched activity.** LMDI-I additive per sub-branch, summed:

   | Sub-branch | Emissions | Activity (sensitivity) |
   |---|---|---|
   | Iron and steel | 1.A.2.a + 2.C.1 + 2.C.2 | crude steel, worldsteel/Eurofer (CRT pig iron or BOF-route tonnes) |
   | Cement | 2.A.1 | CEMBUREAU cement (CRT clinker activity) |
   | Lime | 2.A.2 | CRT activity |
   | Glass | 2.A.3 | CRT activity |
   | Other minerals | 1.A.2.f + 2.A.4 | C23 |
   | Chemicals, combustion and other | 1.A.2.c + 2.B residual | C20.1 (C20) |
   | Ammonia | 2.B.1 | CRT ammonia (PRODCOM) |
   | Nitric acid | 2.B.2 | CRT nitric acid (PRODCOM) |
   | Adipic acid | 2.B.3 | CRT adipic acid |
   | Petrochemicals | 2.B.8 | CRT ethylene (PRODCOM ethylene) |
   | Aluminium | 2.C.3 | CRT primary aluminium |
   | Other non-ferrous | 1.A.2.b + 2.C.4–7 | C24.4 |
   | Paper | 1.A.2.d + 2.H.1 | C17 (FAOSTAT) |
   | Food | 1.A.2.e + 2.H.2 | C10–C12 |
   | Other manufacturing | 1.A.2.g (manufacturing part) + 2.E + unallocated | C |
3. **Sector index lines as exp(Σeffect / L).** They then multiply exactly to the emissions index and agree with the waterfall.
4. **Result.** Manufacturing scope, 2005–2024, with 2.C.2 and 2.H still in the old branches (moving them changes the totals
   by under 0.5 Mt):
   - production effect −160.8 Mt, intensity effect −199.5 Mt, production share **44.6 %**;
   - 2023 end year: 44.6 %;
   - three-year averages at both ends: 50.2 %;
   - sector indices for 2024: production 79.3, intensity 75.0, emissions 59.4.

   Sensitivities, on the full scope: steel on pig iron 49.8 %; cement on clinker activity 45.4 %; chemicals combustion on
   C20 37.2 %.

   On the slide, report the output share as a range rather than one number: about 28 % (value index only) to about 45 %
   (matched physical activity) for the 2005 base. Also say that the 2007 and 2010 bases move it by +15 and −10 points.
5. **Steel, cement and the clinker ratio.** Keep the T1 measures for steel and cement. Show N₂O abatement in nitric and
   adipic acid separately, as the largest single intensity item (about −39 Mt): it is a technology effect, not an output
   effect.

## What this pass deliberately did not cover

- It did not re-check `fig_sector.py` and the pathway values on slide 8, nor the PNG composites.
- It did not build the value-added-weighted "other manufacturing" index (M-6, P2), nor a BOF-route steel denominator for
  2005–2015 from worldsteel production-process tables.
- It did not attempt per-Member-State gap filling of CRT activity data; the EU sums were used as trend indicators only.
- It did not verify CEMBUREAU's EU27 composition with CEMBUREAU directly (m-6).

## Deferred backlog — good ideas deliberately not in this round

- A three-factor LMDI (activity, structure, intensity) using value added, to separate the change in branch mix from output.
- Splitting 1.A.2.f by product using the fuel tables 1.A(a)s2 crossed with ETS installation data.
- Replacing FAOSTAT paper with CEPI national data for the EU27 members.
