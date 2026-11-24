# M·56 TIMES.jl Demo Runner — fact-check (2026-11-24)

*Fact-check of every figure and factual claim in beta module M·56
(`beta/modules/times-jl/`), its data file
`public/data/times-jl/demo12-results.json`, its docs page
`docs/modules/times-jl.md`, `scripts/times-jl/README.md` and its registry rows,
added in commit 1165960 ("Add beta module M·56: TIMES.jl Demo Runner").
Checked on 2026-11-24 against the solver output, the TIMES_Demo DD files at
962db86, the TIMES.jl repository at 4091d41 (README, `docs/m13-plan.md`,
`docs/known-differences.md`, `src/`), and two fresh runs.*

This pass changes no stored values. Its two corrections are prose decisions
for the owner (Secretariat), and they land in the separate correction commit
that follows this one.

## Verdict bands

Standard bands for quantities: **CONFIRMED** (≤ 2 %), **REVISION** (2–5 %),
**WRONG** (> 5 %), **NO SOURCE YEAR**, **NOT CHECKABLE**. A prose claim about
the model or about TIMES.jl is CONFIRMED when its source says it, and WRONG
when the source, read at the pinned commit, contradicts it.

## What each check proves

- **Solver figures** (rows, columns, objective, generation, CO₂, capacity,
  cost components) were re-derived from a second, independent run of the
  same pinned stack (`rerun.log`, objective 2.3960685737007916e7, bit-identical
  to the committed JSON). This proves the figures are reproducible. It does
  **not** prove that TIMES.jl is correct. That rests on the GAMS comparison,
  which this pass can check only through the three published reference
  numbers.
- **Parity** is checked against the reference values as the TIMES.jl README
  quotes them. GAMS itself was not run, because the sandbox has none. Equal
  rows, columns and objective are consistent with an identical matrix but do
  not prove it, and the page says so.

## Findings

| # | Claim (file) | Source checked | Verdict |
| --- | --- | --- | --- |
| 1 | 3,233 rows × 4,485 columns (page, docs, registry) | Run log and `JuMP.num_constraints`/`num_variables`, both runs; README L78 `3233 rows, 4485 columns` | CONFIRMED (identical) |
| 2 | Objective 23,960,685.737008; GAMS reference 23,960,685.737007827; Δ 3.7e-15 ("within 4e-15" in the registry) | Run JSON; README L84 `objective 23960685.737007827 with CPLEX`; README probes table "4e-15" for demo12 | CONFIRMED |
| 3 | Cost components sum to the objective (16.256 + 2.008 + 6.371 − 0.675 = 23.961 M) | `VAR_OBJ` rows in the JSON | CONFIRMED (identity holds to rounding) |
| 4 | First run ≈ 244 s end to end | JSON `run.wall_time_s_total_first_run` 244.1; second cold run 252.5 s | CONFIRMED as a single-run figure (the two cold runs differ by 3 %; it is a timing, not a constant) |
| 5 | "a repeat run in the same session takes seconds" (stat tile) | Timed in one Julia session: first 252.5 s, second 1.8 s, same objective | CONFIRMED |
| 6 | New capacity is in GW because every plant has PRC_CAPACT 31.536 | `base.dd` and `newtechs.dd`: 31 of 31 `ELC*` PRC_CAPACT entries are 31.536; the 32nd name (REG1.ELCRNHYD01) does not exist as a process in REG1 | CONFIRMED |
| 7 | Sectoral CO₂ `VAR_COMNET` is the net emission, not a slack | All 72 CO₂ balance rows are in `EQE_COMBAL` (equalities); the script asserts this per row | CONFIRMED |
| 8 | "demo12 puts no cap or price on CO₂" | Parameters declared across all 10 DD files: COM_AGG, COM_FR, COM_IE, COM_PKRSV, COM_PROJ, UC_CAP, UC_COMPRD, UC_FLO, UC_RHSRT(S). No COM_BNDNET, COM_CUMNET or COM_TAXNET. UC_COMPRD belongs to UC_RNW-PP_LOW on ELC, not CO₂ | CONFIRMED |
| 9 | Power mix shaped by UC_RNW-PP_LOW (bounds-uc_wsets.dd) and AU_NUC_MaxCAP (uc_nuc_maxcap.dd) | Both files at the locators given | CONFIRMED |
| 10 | "its demand projections grow" | `dem_ref.dd` COM_PROJ: 17 of 17 demand series higher in 2050 than in 2006 | CONFIRMED |
| 11 | "gas generation grows from 2005 to the 2010s and declines after 2020" (page, "Reading the demo results") | JSON, both regions: 1,280 / 2,940 / 6,101 / 5,727 / 4,768 / 1,109 PJ for 2005–2050. Gas peaks in **2015**, and 2020 is already 6 % below the peak | **WRONG** (> 5 %: the decline starts after 2015, not after 2020) |
| 12 | "By 2050 nuclear and wind are the two largest sources" | JSON, both regions: NUC 4,397, WIN 2,582, COA 1,772 PJ | CONFIRMED for both regions together, which the sentence states. Not true of REG1 alone (coal 1,772 > nuclear 1,552 > wind 1,354), so the sentence must keep its "both regions together" scope |
| 13 | Total CO₂ 3,383 → 5,544 Mt (both regions) | JSON sum of sectoral CO₂, kt ÷ 1,000 | CONFIRMED |
| 14 | Limits panel: "elastic demand … untranslated (before the M1.3 gate)", attributed to the README Progress section of 19 Nov 2026 | README L286 says so. But at the pinned commit 4091d41, `docs/m13-plan.md` change 69 records the linear form of elastic demand (%TIMESED% YES) as translated and checked at layers 1–3 on demo12_ed and demo12_edagg, and `src/model/eqobjels.jl` exists. `docs/known-differences.md` K4 (20 Nov) covers its base prices | **WRONG** at the pinned commit: the README's Progress text lags the code. The stochastic extension is still in progress (m13-plan changes 70–76), so the rest of the bullet stands |
| 15 | TIMES.jl is Phase 1, has no release, does not write report parameters (M1.6 not started), and is not an IEA-ETSAP product | README L6, L245, L14–19 | CONFIRMED |
| 16 | "its own code is largely AI-written under human review" | README, "An experiment in AI-assisted translation": "Almost all of the code … written by AI models … A human … reviews every pull request" | CONFIRMED |
| 17 | JRC-EU-TIMES matches GAMS to the end of preprocessing; its matrix and optimum are not compared yet | README L343–352 | CONFIRMED |
| 18 | TIMES.jl's probes compare every coefficient against GAMS's CONVERT export at 1e-9 | README, "Probes against GAMS", Matrix column | CONFIRMED |
| 19 | "TIMES is the IEA-ETSAP model generator behind many of the energy-system models that inform EU policy, including JRC-EU-TIMES" (hero) | The TIMES.jl README names JRC-EU-TIMES as "a multi-country model of the European energy system". "Many … that inform EU policy" has no source in this module | NOT CHECKABLE from the module's sources. It is a general characterisation, so it is left for the owner; see decisions |
| 20 | Software versions: Julia 1.11.7, HiGHS.jl 1.27.0, TIMES.jl 4091d41, TIMES v4.9.7 d9a6a25, TIMES_Demo 962db86 | Solution manifest, `git rev-parse` in each clone, Artifacts.toml | CONFIRMED |
| 21 | Sandbox workarounds: downloads hang without `JULIA_SSL_CA_ROOTS_PATH`; github.com archive downloads refused while `git clone` worked | Session record: the first install made no progress until the CA bundle was set; `curl` to github.com returned 403 while both clones succeeded | CONFIRMED (observed in this session) |

## Decisions for the owner

1. **Finding 11.** Reword the gas sentence to "gas generation peaks in 2015
   and declines thereafter". This is prose only; no stored value changes.
2. **Finding 14.** Rewrite the limits bullet. Elastic demand's linear form
   was translated after the README's Progress text (m13-plan change 69,
   present at the pinned commit). Untranslated: the stochastic extension
   (in progress), MACRO, ETL, lumpy investments, discrete unit commitment and
   TIMES-Micro. Cite the m13-plan alongside the README.
3. **Finding 19.** Either keep the hero sentence as a plain characterisation or
   soften it to name only what is sourced ("the model generator behind
   JRC-EU-TIMES, the JRC's multi-country model of the European energy
   system"). Unable to fully verify; left unchanged.

## Verified correct — no action

Findings 1–10, 12, 13, 15–18, 20 and 21. Later passes should not re-touch
these unless the pinned TIMES.jl commit or the demo data move.

## What this pass deliberately did not cover

- GAMS was not run. The parity verdict rests on the reference values the
  TIMES.jl README publishes, not on a fresh GAMS solve.
- Per-coefficient matrix parity (TIMES.jl's layer 2) and TIMES.jl's CI test
  suite were not re-run.
- The economic plausibility of demo12's data was not assessed. It is a
  teaching dataset and the page claims nothing about it.
- The rendering of the page in browsers other than headless Chromium.
