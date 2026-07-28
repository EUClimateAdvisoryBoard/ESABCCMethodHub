# Policy Targets Register (M·36) — human-review corrections, July 2026

Third pass over the register. Where the two earlier passes were internal
fact-checks (see `policy-targets-factcheck-2026-07.md`), this one starts from an
ESABCC reviewer's mark-up of the exported workbook
(`eupolicytargets_v2_28072026.xlsx`): **21 rows flagged "not correct", each with
a written reason**. The reviewer noted the mark-up was not exhaustive and asked
that the reasons be generalised to comparable rows across the register.

Alongside the corrections, the pass adds what the reviewer asked for:
a duplicate-target column, an eight-way sector/system classification, a written
argument for every mitigation/adaptation call, and per-sector summaries.

Result: **1 018 → 935 rows**, of which **684 are in the default (transition)
lens**, up from 673 — the register lost 122 rows that were not targets and
gained 39 corrected or newly-captured ones.

---

## 1. What the reviewer flagged, and the rule taken from it

Each flagged row was read as an instance of a general class, and the class was
then applied to all 1 018 rows. The eight rules, and what they removed:

| Rule | Class | Rows removed | Reviewer's example |
|---|---|---|---|
| NT-1 | Content requirement for a plan, strategy or report | 16 | Social Climate Fund Art. 4(4)(a)-(b) — *"not a target but a description of what the plans submitted by the Member States should include"* |
| NT-2 | Eligibility or funding scope | 9 | Social Climate Fund Art. 7(2)(d) — *"part of a list of measures eligible to be covered by the fund"* |
| NT-3 | Assessment, award or project-selection criteria | 25 | TEN-E Art. 4(3)(a),(c),(d),(f) — *"not a target but a characteristic of a project"*; Annex I(4) — *"a criteria for an eligible project"*; Social Climate Fund Art. 16 |
| NT-4 | Definition or definitional chapeau | 4 | EU Taxonomy Art. 9 — *"not a target but a clarification of definitions"* |
| NT-5 | Pointer to a target set by another instrument | 14 | TEN-E Art. 4(2)(e)(iii), Art. 16(4)(a) — *"a listing of characteristics of projects that are in line with targets from other policies … should not be captured"* |
| NT-6 | Context, illustrative statistic or heading | 12 | Zero Pollution Action Plan body ×2 — *"just a summary of other commitments as context"* |
| DUP | The same sentence already registered under a more precise provision | 14 | (found by scan, not flagged) |
| FIX | Truncated quote, superseded by a complete re-extraction | 28 | EU Taxonomy Art. 11(1) — *"This is incomplete. Please extract the text following a colon"*; Zero Pollution §2.3 — *"the prior sentence should have been included to understand what 'It' refers to"* |

Every removed row is listed with its reason in
`scripts/policy-targets-overrides.json` (tagged `[human review 2026-07]`) and in
the **Removed rows** sheet of the workbook, so any removal can be reversed by
deleting one entry and rebuilding.

### Where the rules were deliberately *not* applied

The rules cut close to real targets, so two limits were set and applied
consistently:

- **A plan-content item that carries its own date or quantity stays.** The EPBD
  Art. 3(2) roadmap ("national targets for 2030, 2040 and 2050 … annual energy
  renovation rate") and the Marine Strategy Framework Directive's dated
  milestones (good environmental status determined by 15 July 2012, programme of
  measures by 2015) are content requirements in form, but each fixes an outcome
  and a date. The Social Climate Fund items the reviewer flagged fix neither.
- **An obligation to *establish* something stays; a description of what it must
  *contain* goes.** Floods Directive Art. 7(1) (Member States shall establish
  flood risk management plans) is kept; Art. 7(3) (what those plans shall
  address) is removed. Same line for the EPBD renovation plan and the national
  restoration plans.

Review clauses and reporting obligations with their own deadline (CO2 Standards
for Cars Art. 15, Euro 7 Art. 18, LULUCF Art. 4(4)) were **kept** — the reviewer
flagged none of them, and they are labelled as commitments rather than targets.

### The two structural corrections

- **Truncated quotes (28 rows).** Two failure modes, both fixed by re-extracting
  from the EUR-Lex source rather than by editing text: a chapeau cut off at its
  colon (the enumerated points that follow are now part of the quote — FuelEU
  Art. 4(2) now carries the −2 %…−80 % schedule, the F-gas Annex VII quota table,
  the CO2-cars Art. 4(1) targets, the Taxonomy Arts. 10 and 11 conditions), and a
  sentence opening on a pronoun with no antecedent (the preceding sentence is now
  included, so "It will aim to ensuring that, by 2030, 75 % of soils are healthy"
  reads with the Soil Health Mission sentence that governs it). The corrected
  quotes live in `scripts/policy-targets-input/_corrections-2026-07.json` and are
  re-validated as verbatim source substrings by the build, exactly like every
  other candidate.
- **Missing annex targets (13 rows added).** The reviewer noted that Annex II of
  the Water Resilience Strategy collates intermediate targets from other
  instruments and that each should be a row. All 14 statements in that annex are
  now captured (one was already registered), and each carries in the new
  duplicate column the act it restates where that act is tracked. The other
  communications were checked for the same pattern: the Zero Pollution Action
  Plan's Annex 2 was already complete (all six targets present); the Green Deal,
  Renovation Wave and Preparedness Union Strategy annexes are action-and-timetable
  lists, not target lists, and were left as they are.

---

## 2. New column — duplicate and near-duplicate targets

`duplicate_of` (workbook column 22) names the closest target text in a
**different** policy, using token similarity over content words:

- **≥ 0.45 — "Duplicate wording"** (8 rows): the same sentence in two acts, e.g.
  the CPR Art. 5(1)(b) and ERDF Art. 3(1)(b) policy objective 2 (similarity 1.00).
- **≥ 0.25 — "Similar target"** (78 rows): a restatement or a close cousin, e.g.
  the Water Resilience Strategy's Annex II energy line and EPBD Art. 3(1), or the
  Birds and Habitats Directives' parallel protection duties.
- Where the target text *names* another tracked act (routine in communications),
  the match to that act is favoured and the note says "cited in the text".

Intra-policy duplicates are not reported here — they were removed outright under
rule DUP.

## 3. New columns — the eight sectors/systems

Columns 13-20 flag, per target, relevance to: **Energy · Buildings and built
environment · Agri-food · Transport and mobility · Industry · Land and marine
ecosystems · Water · Health**. A target can carry several; 104 of the 684 rows
carry none and are kept in the register for review, as requested — they are the
cross-cutting, financial and institutional targets (Climate Law headline targets,
cohesion-funding climate shares, governance duties).

Classification is deterministic (`scripts/policy-targets-classify.mjs`): a
per-sector vocabulary matched on word boundaries against the target text and its
provision heading, with veto phrases for the traps ("soil health" is not Health,
"capacity building" is not Buildings, "battery electric vehicle" is not
Industry). Where a target's own words carry no sector vocabulary but its act
addresses exactly one system, the act's system is inherited and the evidence
column says so.

Counts across the 684 rows: Energy 183 · Industry 159 · Transport 116 ·
Land and marine ecosystems 91 · Buildings 78 · Water 54 · Health 49 ·
Agri-food 34.

## 4. Refined mitigation / adaptation call, with the argument

Climate relevance is no longer a keyword tally. It is decided by the **mechanism**
the target works through, and the mechanism is written out in column 21:

**Mitigation** — M1 cuts GHGs directly · M2 increases removals or protects the
sink · M3 cuts energy demand · M4 switches supply or fuels to low-carbon sources ·
M5 builds the enabling conditions (infrastructure, permitting, finance,
standards) · M6 cuts material and product emissions through circularity.

**Adaptation** — A1 reduces exposure or vulnerability of people, assets and
infrastructure · A2 keeps ecosystems and soils in a condition where they buffer
climate impacts · A3 raises adaptive capacity (risk assessment, early warning,
planning, insurance) · A4 protects health from climate-sensitive hazards ·
A5 seizes an opportunity created by a changing climate.

Each argument quotes the words that fired the mechanism, so a reader can check
it against the target text. This directly implements two of the reviewer's
classification corrections: the Zero Pollution air-pollution and transport-noise
targets are now **adaptation** via A4 (public health), and the Water Resilience
Annex II energy line is now flagged for **Energy, Buildings and Water**.

Where an earlier fact-check set a row's climate call explicitly, that call still
wins — the argument then states that it was set in review and gives the reading
of the quoted words, rather than contradicting the column beside it.

Distribution across the 684 rows: mitigation 448 · adaptation 180 ·
mitigation + adaptation 50 · neither 6.

## 5. Per-sector summaries

The workbook carries a **Sector summary** sheet (targets, share of the register,
number of policies, mandatory / quantitative / time-bound counts, the
mitigation-adaptation split, and how many targets are shared with another sector)
and one sheet per sector listing every contributing policy with its counts and an
example target.

---

## Files

| File | Role |
|---|---|
| `scripts/policy-targets-classify.mjs` | sectors, mechanism-based climate call + argument, duplicate detection |
| `scripts/policy-targets-input/_corrections-2026-07.json` | the 28 corrected re-extractions and the Water Resilience Annex II targets |
| `scripts/policy-targets-overrides.json` | the 122 removals, each with its rule and reason |
| `scripts/build-policy-targets.mjs` | merge, verbatim validation, classification (`npm run build:policy-targets`) |
| `scripts/export-policy-targets-workbook.py` | the reviewer workbook |
| `public/data/eu-policy-targets-corrected.xlsx` | the workbook itself |

## Known limits of this pass

- The corrections generalise 21 reviewer judgements to 1 018 rows. The rules are
  written down and every removal is individually reversible, but the borderline
  calls in §1 are judgement, not law — the plan-content and criteria classes are
  where a second reviewer is most likely to disagree.
- Sector and climate classification is lexical. It reads the target text and its
  provision heading, not the act around them, so a target whose subject matter is
  only implied by its parent provision can be under-tagged.
- Similarity in the duplicate column is token overlap. It finds restatements and
  parallel wording; it does not detect two targets that mean the same thing in
  entirely different words.
- The caveat from the earlier passes stands: a few corpus texts are
  pre-consolidation versions (EU ETS 2003/87/EC original, RED 2018), so their
  figures reflect that text.
