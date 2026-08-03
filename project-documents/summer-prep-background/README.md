# Summer Prep — background documents

Offline copies of the **Summer Prep › Policy Gap 2.0 Report** module, so the
work can continue while the Method Hub owner is on parental leave. Each file
stands on its own: no login, no Hub, nothing to install.

Last rebuilt from the workspace data on **3 August 2026**.

| File | What it is | Live version on the Hub |
| --- | --- | --- |
| `ESABCC_Policy-Gap-Tracker_2026-07.xlsx` | All 66 gaps and inconsistencies the Board identified across the 12 chapters of the 2024 progress report, with the verbatim report sentence and page behind each. Two columns to maintain (live status + note), a summary matrix and two figures that follow your edits. | `/beta/policy-gaps` |
| `ESABCC_Indicator-Combined_2026-07.xlsx` | **The whole indicator module in one file** — a dashboard, the indicator check, the new-data figure and the old-vs-new derivations, wired together so the Derivations sheet is the single source of truth for every figure it can back. Start here; the three files below are the same material split up. | `/beta/summer-prep/indicator-check` |
| `ESABCC_Indicator-Check_2026-07.xlsx` | What has moved, data-wise, since the report: all 97 progress indicators, their report baseline, the points added since publication, a figure per indicator, a sheet showing where every post-report number comes from, and the 27 July 2026 fact-check verdict per point. | `/beta/summer-prep/indicator-check` |
| `ESABCC_Synergies-Trade-offs_Industry-Transport_2026-07.docx` | The mitigation ↔ adaptation literature note, subsector by subsector — 20 interactions with mechanism, policy implication and sources. Built in the Board's own Word template. | `/beta/summer-prep/synergies-tradeoffs` |
| `ESABCC_Indicator-New-Data-Overview_2026-07.xlsx` | Everything that has moved since the report in **one figure**: all 78 indicators with new data, shown as the change against each one's own report baseline, with the numbers beside it and a coverage chart per chapter. | `/beta/summer-prep/indicator-check` |
| `ESABCC_Indicators-Old-vs-New-with-derivations_2026-07.xlsx` | Every indicator the report carried, its published figure and its latest value — plus the **derivation as a live Excel formula**. Where the report's own derivation can be carried forward — its own input columns refreshed from the same publisher, its formula untouched — that is what the sheet shows and says; where it cannot, the sheet says that instead of passing off a substitute recipe as the report's method. | `/project-workspace/policy-gap-2-0` |
| `ESABCC_Policy-Gaps_Transport-Industry_2026-07.xlsx` | The transport/industry gaps re-assessed against legislation adopted since the report, 10 candidate additional gaps with the test that would confirm or refute each, and the per-subsector gap landscape. | `/beta/summer-prep/policy-gaps-sectors` |

## Status of the content

The Board's own findings — the gaps, their quotes and pages, the report's
indicator values — are from the published report. The live-status
re-assessments, the candidate gaps and the synergies framing are working
material for this prep cycle, flagged as pending verification inside each file.
**Nothing in these documents is a Board position.**

## What the last rebuild changed

The two policy-gap workbooks and the Word note reproduce **cell for cell**: the
gaps, the sector re-assessments and the synergies entries have not changed since
they were built. The indicator documents have, because the indicator database
has:

* **78 of the 97 indicators now carry post-report data**, up from 55, over
  **239 post-report points** (was 162) — the automation passes since the last
  build closed the remaining manual series (PRODCOM, FAOSTAT, UNFCCC DI).
* **65 indicators now have a derivation block**, up from 53. The calc grids are
  read straight out of migrations 045 / 052 / 079 / 080 rather than from a
  database snapshot, and that snapshot had been missing twelve of them.

## Where the fact-check reaches

The 27 July 2026 fact-check covers **147 of the 239** post-report points, on 52
of the 78 indicators: it was run against the data as it stood that day, and the
series refreshed since have not been re-checked against their sources. Those
points show **“—”** in the “Source check” columns, which means *not yet checked*
— not that the check passed. Of what it does cover, **114 points reproduce
within 2 %**, none is wrong, 3 sit in the revision band, and 33 are published
figures with no machine-readable recipe to check against. Two series (L1, L7)
reproduce their source but sit on a different *level* than the report years —
the jump at the join is partly basis, not movement. Full detail is in
`docs-internal/indicator-postreport-factcheck-2026-07-27.md`.

## How the combined workbook stays in sync

In `ESABCC_Indicator-Combined_2026-07.xlsx`, the Overview, the chapter tabs,
Data (long), New data, Old vs new and the Dashboard hold **live references to
the Derivations sheet** rather than pasted numbers, so editing an input there
moves the whole book on the next recalculation. A cell is only wired that way
where the derivation already agrees with the stored data point to within 0.5 %;
where the two genuinely disagree — O1's later years, for one — the figure stays
a plain number so the discrepancy stays visible rather than being papered over.

## The same derivations are in the Hub

Migration `080_report_way_calc_rows.sql` puts the eleven report-way derivations
into the Hub's calc space, so opening an indicator's "Edit data / calc" shows the
report's own formula continued into 2022–2024 — the workbook and the Hub carry
the same thing. It needs applying to the database like any other migration.

## Rebuilding them

```bash
B=build && mkdir -p $B/out

# 1. the source data, read live out of src/data (no cached copy)
node --experimental-strip-types scripts/summer-prep-background/extract.mjs $B/data.json
# 2. the calc grids, read out of the migrations that seed them
node --experimental-strip-types scripts/summer-prep-background/export_calc_grids.mjs \
  $B/calc.json $B/calc_excel.json $B/reportway.json

FC=scripts/esabcc-indicators/factcheck-postreport-results.json
python3 scripts/summer-prep-background/build_policy_gap_tracker.py $B/data.json $B/out/ESABCC_Policy-Gap-Tracker_2026-07.xlsx
python3 scripts/summer-prep-background/build_sector_policy_gaps.py $B/data.json $B/out/ESABCC_Policy-Gaps_Transport-Industry_2026-07.xlsx
python3 scripts/summer-prep-background/build_indicator_check.py $B/data.json $B/calc.json $FC $B/out/ESABCC_Indicator-Check_2026-07.xlsx
python3 scripts/summer-prep-background/build_indicator_overview.py $B/data.json $B/calc_excel.json $FC $B/reportway.json $B/out
python3 scripts/summer-prep-background/build_indicator_combined.py $B/data.json $B/calc.json $B/calc_excel.json $FC $B/reportway.json $B/out/ESABCC_Indicator-Combined_2026-07.xlsx
python3 scripts/summer-prep-background/build_synergies_docx.py $B/data.json template.dotx $B/out/ESABCC_Synergies-Trade-offs_Industry-Transport_2026-07.docx

python3 scripts/summer-prep-background/check_outputs.py $B/data.json $B/calc.json $B/out [template.dotx]
```

To refresh the report-way derivations themselves first (they need network
access to the publishers), run
`node scripts/esabcc-indicators/build-report-way-rows.mjs` and
`node scripts/esabcc-indicators/emit-report-way-migration.mjs` before step 2.

The Word note needs the Board's own `Advisory_Board_blank_template.dotx`, which
is not in the repository — without it, keep the existing `.docx` (its inputs
change only when `src/data/summer-prep-synergies.ts` does). `check_outputs.py`
takes the template as an optional last argument and reports the one check it
has to skip without it.

The builders read the Method Hub's own data files, so re-running them after a
data change reproduces the documents. `check_outputs.py` re-derives every
summary figure independently and fails if a workbook's formulas would not
produce it.
