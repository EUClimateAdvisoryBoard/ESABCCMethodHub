# Policy Targets Register (M·36) — v3 human-review pass + consolidated-text refresh, August 2026

Fourth pass over the register, driven by the ESABCC reviewers' mark-up of the
v3 workbook (`eupolicytargets_v3_29072026.xlsx`, sheet **Revision**: 646 rows,
reviewers James, Kamila, Mar, Sebastian across ten acts). Alongside the
corrections, the pass refreshed every outdated source text against the current
consolidated EUR-Lex version and added three new register dimensions the
reviewers asked for.

Result: **819 targets across 61 acts**, of which **544 are in the default
(transition) lens** — from 918/645 before the pass.

---

## 1. What the reviewers marked, and what was done with it

The Revision sheet carried 105 rows marked **"Not a target (1)"**, 41
**"Comments for AI"**, and 134 fillings of the new **"First order target (1)
Second order target (2)"** column (132 usable). All 646 rows were matched to
their stable dataset ids (645/645 with text present).

### Deletions — the target definition, sharpened

The reviewers' reasons generalise to nine new removal rules, extending the
July NT-1..NT-6 set. The unifying principle, quoted from the review request:
*anything that requires just one intervention (like banning something) rather
than a progression over time towards a goal is not a target. Targets should be
either timebound or at least imply a progression of efforts which can be
measured.*

| Rule | Class | Reviewer's archetype |
|---|---|---|
| NT-7 | Pure conduct obligation | Methane Regulation Art 13 — "This is an obligation… not a target to achieve something in the future" |
| NT-8 | Threshold-triggered obligation | EED enterprise energy-audit duties — "threshold triggered obligation" |
| NT-9 | Derogation / reduced requirement | AFIR Art 3(8), 4(5) — 50 % power-output reductions on low-traffic roads |
| NT-10 | Bare fragment (no actor/date) | PPWR recycled-content percentages quoted without their chapeau |
| NT-11 | Qualifying condition for a headline target | NRL rows that "qualify how the headline target should be achieved" |
| NT-12 | One-off ban / market restriction | PPWR Art 25(1) format ban from 2030 |
| NT-13 | Methodology / compliance calculation | RED "part of the methodology for calculating compliance" |
| NT-14 | Commission assessment duty | RED "an obligation for the Commission to do an evaluation" |
| NT-15 | Process obligation to set objectives later | PPWR Art 49 — Member States to set collection objectives by 2029 |

Every marked row was dropped via `scripts/policy-targets-overrides.json`
(tagged `[human review 2026-08 v3]`), except where the comment supplied a fix
instead: incomplete quotes were re-extracted in full, and rows the reviewer
asked to merge were replaced by grouped extractions.

### Groupings and additions

Seven NRL provisions split across staged sub-point rows (Art 4(1), 4(2), 5(1),
5(7), 11(3), 11(4), plus the farmland-bird index) were merged into single rows
quoting the full provision (`_corrections-2026-08-v3.json`; `MAX_QUOTE` raised
to 2000 and the dedupe key to 300 chars to admit them). Six targets the
extraction had missed were added: NRL Art 4(7), 8(2) urban green space
(health-relevant per the reviewer), 11(2), 12(2), 12(3), and the Water
Resilience Strategy leakage row extended with its Drinking Water Directive
context.

### Reclassifications

Marine-ecosystem NRL rows gained the Water sector; NZIA benchmark rows gained
Energy; the RED building-codes arguments were rewritten mitigation-only per
the reviewer's critique; tree-planting rows carry the land-sink mitigation
argument. Thirteen Water Resilience Strategy rows that restate targets from
other instruments are kept, with the cross-check note in column 22.

## 2. New register dimensions (columns)

1. **First order target (1) Second order target (2)** — first order = the
   overall change the act exists to achieve (subject-matter articles, headline
   quantified targets and their staged deadlines); second order = dependent,
   complementary or niche. 118 human labels (incl. labels carried onto grouped
   or re-extracted successor rows) locked as `source: human`; the remaining
   701 rows assigned by calibrated agents (`source: ai`, one-sentence
   rationale each) in `scripts/policy-targets-review-2026-08.json`.
2. **Revise target / Revise reason** — 382 rows flagged as likely not targets
   under NT-1..NT-15, each with the rule and a row-specific reason. The ten
   human-reviewed acts are exempt (their surviving rows are implicitly
   endorsed). These rows are *flagged, not removed* — the flag is the
   candidate list for the next review round.
3. **Document updated (consolidated version)** — marks every row of the 17
   acts whose source text was replaced (below).

## 3. Consolidated-text refresh (EUR-Lex sweep)

All 49 CELEX-numbered acts were checked against the Publications Office
Cellar for a newer consolidated version (13 communications are never
consolidated). **17 were outdated and replaced** — recorded in
`scripts/policy-targets-replaced.json`:

RED (02018L2001-20240716 — the **RED III**-amended text: 42.5 %/45 % 2030,
buildings 49 %, industry 1.6 pp + RFNBO 42 %/60 %, transport 29 %/14.5 % GHG
intensity), EU ETS (02003L0087-20240301 — LRF 4.3 %/4.4 %, maritime, ETS2),
**EU Climate Law (02021R1119-20260407 — adds the adopted binding 90 %
net-reduction-by-2040 target)**, CO2 cars (2035 100 % zero-emission), Effort
Sharing (-40 % trajectory), Waste Framework (55/60/65 % recycling +
food-waste 2030), IED, Governance, CSRD and CSDDD (Omnibus I — **CSDDD's
climate-transition Article 22 is repealed**, leaving the act with no targets;
documented in its input file), WFD, CPR, ERDF, UCPM, MFF, OSH, Habitats.

The **F-gas Regulation was checked by name as requested**: the register
already uses Regulation (EU) 2024/573 (which replaced 517/2014); Cellar shows
no substantive amendment since — the stored text is current. Eleven acts
could not be conclusively determined (noted in the sweep audit) and were left
unchanged.

Targets for all 17 replaced acts were re-extracted from the amended texts,
with reviewer decisions carried onto rows whose content hash changed
(`[carried to consolidated text 2026-08]`) and agent-audit removals tagged
`[re-extraction 2026-08]` (Pass 4 in the workbook's Removed rows sheet).

## 4. Reproducibility

```bash
npm run build:policy-targets                      # rebuild dataset
python3 scripts/export-policy-targets-workbook.py # regenerate workbook
```

Every removal names its rule and reason in the overrides file and the
workbook's **Removed rows** sheet; every order assignment and revise flag
lives in `scripts/policy-targets-review-2026-08.json` with source and
rationale, so any call can be reversed by editing one entry and rebuilding.
