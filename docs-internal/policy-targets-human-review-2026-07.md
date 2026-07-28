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

Two passes were run. The first generalised the reviewer's reasons into rules and
applied them to the rows a keyword sweep flagged; the second (documented below)
audited **every** row against its source text with ten parallel review agents.

Result: **1 018 → 918 rows**, of which **645 are in the default (transition)
lens**. Across both passes the register lost 257 rows that were not targets or
were duplicates, and gained 156 corrected, completed or newly-captured ones.

---

## 1. What the reviewer flagged, and the rule taken from it

Each flagged row was read as an instance of a general class, and the class was
then applied to all 1 018 rows. The eight rules, and what they removed across
both passes (pass 1 flagged rows by keyword; pass 2 audited every row):

| Rule | Class | Rows removed | Reviewer's example |
|---|---|---|---|
| NT-1 | Content requirement for a plan, strategy or report | 24 | Social Climate Fund Art. 4(4)(a)-(b) — *"not a target but a description of what the plans submitted by the Member States should include"* |
| NT-2 | Eligibility or funding scope | 18 | Social Climate Fund Art. 7(2)(d) — *"part of a list of measures eligible to be covered by the fund"* |
| NT-3 | Assessment, award or project-selection criteria | 32 | TEN-E Art. 4(3)(a),(c),(d),(f) — *"not a target but a characteristic of a project"*; Annex I(4) — *"a criteria for an eligible project"*; Social Climate Fund Art. 16 |
| NT-4 | Definition or definitional chapeau | 7 | EU Taxonomy Art. 9 — *"not a target but a clarification of definitions"* |
| NT-5 | Pointer to a target set by another instrument | 20 | TEN-E Art. 4(2)(e)(iii), Art. 16(4)(a) — *"a listing of characteristics of projects that are in line with targets from other policies … should not be captured"* |
| NT-6 | Context, illustrative statistic or heading | 44 | Zero Pollution Action Plan body ×2 — *"just a summary of other commitments as context"* |
| DUP | The same sentence already registered under a more precise provision | 27 | (found by scan, not flagged) |
| FIX | Truncated quote, superseded by a complete re-extraction | 85 | EU Taxonomy Art. 11(1) — *"This is incomplete. Please extract the text following a colon"*; Zero Pollution §2.3 — *"the prior sentence should have been included to understand what 'It' refers to"* |

Every removed row is listed with its reason in
`scripts/policy-targets-overrides.json` (tagged `[human review 2026-07]` for the
first pass, `[agent review 2026-07 round 2]` for the second) and in the **Removed
rows** sheet of the workbook, which names the pass, the rule and the reason — so
any removal can be reversed by deleting one entry and rebuilding.

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

- **≥ 0.45 — "Duplicate wording"** (6 rows): the same sentence in two acts, e.g.
  the CPR Art. 5(1)(b) and ERDF Art. 3(1)(b) policy objective 2 (similarity 1.00).
- **≥ 0.25 — "Similar target"** (56 rows): a restatement or a close cousin, e.g.
  the Water Resilience Strategy's Annex II energy line and EPBD Art. 3(1), or the
  Birds and Habitats Directives' parallel protection duties.
- Where the target text *names* another tracked act (routine in communications),
  the match to that act is favoured and the note says "cited in the text".

Intra-policy duplicates are not reported here — they were removed outright under
rule DUP.

## 3. New columns — the eight sectors/systems

Columns 13-20 flag, per target, relevance to: **Energy · Buildings and built
environment · Agri-food · Transport and mobility · Industry · Land and marine
ecosystems · Water · Health**. A target can carry several; 104 of the 645 rows
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

Counts across the 645 rows: Energy 171 · Industry 149 · Transport 113 ·
Land and marine ecosystems 104 · Buildings 69 · Water 50 · Health 49 ·
Agri-food 37. 104 rows carry no sector.

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

Distribution across the 645 rows: mitigation 399 · adaptation 197 ·
mitigation + adaptation 46 · neither 3.

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
| `scripts/policy-targets-input/_corrections-2026-07.json` | pass 1: the 28 corrected re-extractions and the Water Resilience Annex II targets |
| `scripts/policy-targets-input/_corrections-2026-07b.json` | pass 2: 120 corrected, completed and newly-captured quotes |
| `scripts/policy-targets-overrides.json` | the 257 removals and 53 reclassifications, each with its rule and reason |
| `scripts/build-policy-targets.mjs` | merge, verbatim validation, classification (`npm run build:policy-targets`) |
| `scripts/export-policy-targets-workbook.py` | the reviewer workbook |
| `public/data/eu-policy-targets-corrected.xlsx` | the workbook itself |

---

# Second pass — the whole register audited against the same rules

The first pass generalised the reviewer's 21 reasons by keyword-flagging 190 of
the 1 018 rows and reading those. That leaves the rows the flags did not reach.
This pass audits **every row in the workbook**: the 684 rows were split into ten
packets, and one agent per packet read its rows *against the act's EUR-Lex source
text* — the rulebook it worked from (the six removal classes, the duplicate rule,
the two truncation fixes, and the "Limits" that say where not to apply them) is
reproduced in §1 above. Each agent proposed only actions, with the evidence for
each; nothing was applied on an agent's say-so.

## What was checked before anything was applied

- **Every DUP claim** was re-checked mechanically: the dropped row's text must be
  contained in another row of the same act (12 of 13 confirmed by containment; the
  13th is a row that opens with a section heading and was confirmed by hand).
- **Every NT-1/2/3/4 claim** was re-read against the source with its chapeau —
  the drop only stands where the source actually shows "…shall include:",
  "…shall contain:", "the following conditions", "…means:", "shall not support:"
  or an equivalent above the quoted words.
- **Every proposed quote** was validated as a verbatim contiguous substring of the
  act's text before being written, and again by the build.
- A first application **lost four rows** — re-extractions longer than the build's
  900-character ceiling were rejected while the rows they superseded were already
  dropped. Caught by a completeness check (every candidate must appear in the
  rebuilt dataset), fixed by trimming long quotes to their last complete item, and
  the check is now part of the pass.

## Outcome

**935 → 918 rows; 684 → 645 in the default lens.** 135 rows removed, 117 added or
re-extracted. By rule (cumulative over both passes, as shown in the workbook's
Corrections log): NT-1 24 · NT-2 18 · NT-3 32 · NT-4 7 · NT-5 20 · NT-6 44 ·
DUP 27 · FIX 28 · FIX-COLON 13 · FIX-ANAPHORA 21 · FIX-TRUNCATION 23.

What the audit found that the keyword flags had missed:

- **Rows that read as targets only because the chapeau was cut away.** The clearest
  is ERDF Art. 7(1)(b) — "investment to achieve the reduction of greenhouse gas
  emissions from activities listed in Annex I to Directive 2003/87/EC" — which sits
  under "*Article 7 — Exclusion from the scope … The ERDF and the Cohesion Fund
  shall not support:*". As a row it asserted the opposite of the law. Same shape:
  CPR Art. 73(2)(j) (a selection criterion), CBAM Art. 2(8)(d) and 2(9) (conditions
  the Commission checks on a third country), NZIA Art. 26(2) (auction award
  criteria), EPBD Art. 14(5)(b) (a condition for *not* applying the recharging
  duty).
- **13 same-act duplicates** the first scan missed because one row is a sentence
  inside another, not a near-identical twin — five of them in EPBD Art. 9 alone,
  two in the Climate Law Art. 4.
- **A third truncation mode.** Beyond chapeaux cut at a colon and pronouns without
  antecedents, 23 quotes were sliced mid-sentence: the subject sat before the slice
  ("*will make it mandatory to consider the future climate hazards…*" — the 2026
  Eurocodes update is the subject) or the sentence continued past it (TEN-T
  Art. 41(1)(c), Art. 46(1); Competitiveness Compass). All are now re-extracted to
  sentence bounds by a register-wide sweep.
- **Missing sub-points.** AFIR Art. 9(1)(a) (90 % shore-side electricity for
  container ships) was registered while its siblings (b) and (c) — the same duty
  for ro-ro and other passenger ships — were not. A sweep for "sibling registered,
  this one not" over quantified sub-points added 10 such rows (Nature Restoration
  Art. 4, 5 and 14; EED Art. 8(1)(b); 8th EAP Art. 3(s)).
- **Uncaptured commitment lists in the communications.** The EU Adaptation
  Strategy's operative content is fourteen "The Commission will:" bullet lists; the
  register held 8 bullets and missed 40, including whole lists on insurance,
  fiscal resilience, water and international action. Those 40 are now rows, as are
  8 from the Preparedness Union Strategy and 6 from Managing Climate Risks.
- **53 classification corrections**, e.g. five f-gas leak-check rows carrying a
  spurious `water` sector (the classifier had keyed on "leak"), the Effort Sharing
  safety-reserve rows sitting at `none` inside a GHG-reduction regulation, and the
  Green Deal EMFF row tagged `transport` rather than `agrifood`.

## Two scope calls made here, applied consistently

- **Annexes that list ACTIONS are out of scope; annexes that list TARGETS are in.**
  The Renovation Wave annex ("key Commission actions and indicative timelines",
  23 entries), the Green Deal roadmap annex and the Water Resilience Annex I
  ("Full List of Actions", ~45 entries) are indexes of actions already described in
  the body — 20 proposed additions from the Renovation Wave annex were rejected on
  this ground. The Water Resilience Annex II and the Zero Pollution Annex 2 collate
  *targets*, and both are captured in full.
- **A row an agent proposed adding that already exists as peripheral is a
  relevance question, not a missing row.** Three such rows (Water Resilience
  objective 2, the Fit-for-55 RRF green share, the Preparedness 72-hour
  self-sufficiency guideline) were flipped into the default lens instead.

## Known limits

- The corrections generalise 21 reviewer judgements across the register. The rules
  are written down and every removal is individually reversible, but the borderline
  calls in §1 are judgement, not law — the plan-content and criteria classes are
  where a second reviewer is most likely to disagree. The second pass read every
  row against its source, so coverage is no longer the weak point; the rules
  themselves are.
- Rows the second pass deliberately kept but queried, in case a reviewer wants
  them looked at again: the Renovation Wave and Fit-for-55 restatements of the RRF
  and MFF climate shares (they carry their own quantity and period), the CRMA
  Art. 11 bare duration points, and the Water Resilience Cohesion-financing
  package. The remaining ~33 non-key actions of the Preparedness Union Strategy
  annex were also left out under the actions-not-targets call above.
- Sector and climate classification is lexical. It reads the target text and its
  provision heading, not the act around them, so a target whose subject matter is
  only implied by its parent provision can be under-tagged.
- Similarity in the duplicate column is token overlap. It finds restatements and
  parallel wording; it does not detect two targets that mean the same thing in
  entirely different words.
- The caveat from the earlier passes stands: a few corpus texts are
  pre-consolidation versions (EU ETS 2003/87/EC original, RED 2018), so their
  figures reflect that text.
