# Summer Prep — background documents

Offline copies of the **Summer Prep › Policy Gap 2.0 Report** module, so the
work can continue while the Method Hub owner is on parental leave. Each file
stands on its own: no login, no Hub, nothing to install.

| File | What it is | Live version on the Hub |
| --- | --- | --- |
| `ESABCC_Policy-Gap-Tracker_2026-07.xlsx` | All 66 gaps and inconsistencies the Board identified across the 12 chapters of the 2024 progress report, with the verbatim report sentence and page behind each. Two columns to maintain (live status + note), a summary matrix and two figures that follow your edits. | `/beta/policy-gaps` |
| `ESABCC_Indicator-Check_2026-07.xlsx` | What has moved, data-wise, since the report: all 97 progress indicators, their report baseline, the points added since publication, a figure per indicator, a sheet showing where every post-report number comes from, and the 27 July 2026 fact-check verdict per point. | `/beta/summer-prep/indicator-check` |
| `ESABCC_Synergies-Trade-offs_Industry-Transport_2026-07.docx` | The mitigation ↔ adaptation literature note, subsector by subsector — 20 interactions with mechanism, policy implication and sources. Built in the Board's own Word template. | `/beta/summer-prep/synergies-tradeoffs` |
| `ESABCC_Indicator-New-Data-Overview_2026-07.xlsx` | Everything that has moved since the report in **one figure**: all 52 indicators with new data, shown as the change against each one's own report baseline, with the numbers beside it and a coverage chart per chapter. | `/beta/summer-prep/indicator-check` |
| `ESABCC_Indicators-Old-vs-New-with-derivations_2026-07.xlsx` | Every indicator the report carried, its published figure and its latest value — plus the **derivation as a live Excel formula**. Where the report's own derivation can be carried forward — its own input columns refreshed from the same publisher, its formula untouched — that is what the sheet shows and says; where it cannot, the sheet says that instead of passing off a substitute recipe as the report's method. | `/project-workspace/policy-gap-2-0` |
| `ESABCC_Policy-Gaps_Transport-Industry_2026-07.xlsx` | The transport/industry gaps re-assessed against legislation adopted since the report, 10 candidate additional gaps with the test that would confirm or refute each, and the per-subsector gap landscape. | `/beta/summer-prep/policy-gaps-sectors` |

## Status of the content

The Board's own findings — the gaps, their quotes and pages, the report's
indicator values — are from the published report. The live-status
re-assessments, the candidate gaps and the synergies framing are working
material for this prep cycle, flagged as pending verification inside each file.
**Nothing in these documents is a Board position.**

## The numbers behind the Indicator Check

Every value added since the report was re-checked against a fresh pull from its
primary source on 27 July 2026: **114 of 150 points reproduce within 2 %**, none
is wrong, 3 sit in the revision band, and 33 are published figures with no
machine-readable recipe to check them against. Two series (L1, L7) reproduce
their source but sit on a different *level* than the report years — the jump at
the join is partly basis, not movement. Full detail, including what to do about
each, is in `docs-internal/indicator-postreport-factcheck-2026-07-27.md`; the
verdict per point is also in the workbook itself.

## Rebuilding them

```bash
node --experimental-strip-types scripts/summer-prep-background/extract.mjs data.json
python3 scripts/summer-prep-background/build_policy_gap_tracker.py data.json out.xlsx
python3 scripts/summer-prep-background/build_indicator_check.py data.json calc.json factcheck.json out.xlsx
python3 scripts/summer-prep-background/build_sector_policy_gaps.py data.json out.xlsx
python3 scripts/summer-prep-background/build_synergies_docx.py data.json template.dotx out.docx
node scripts/esabcc-indicators/build-report-way-rows.mjs          # continue the report's own derivation
python3 scripts/summer-prep-background/build_indicator_overview.py data.json calc_excel.json factcheck.json reportway.json outdir
python3 scripts/summer-prep-background/check_outputs.py data.json calc.json outdir template.dotx
```

The builders read the Method Hub's own data files, so re-running them after a
data change reproduces the documents. `check_outputs.py` re-derives every
summary figure independently and fails if a workbook's formulas would not
produce it.
