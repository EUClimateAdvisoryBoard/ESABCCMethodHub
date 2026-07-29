# What counts as a target — the rulebook for the M·36 Policy Targets Register

**Read this before adding, removing or re-classifying any row of the policy
targets register.** It is the standing rulebook, not a record of one pass.

Its authority is an ESABCC reviewer's mark-up of the exported workbook
(`eupolicytargets_v2_28072026.xlsx`, July 2026): 21 rows flagged "not correct",
each with a written reason in the `reason` column. Those reasons — quoted
verbatim below — were generalised into the rules here and applied to the whole
register in two passes (see `policy-targets-human-review-2026-07.md` for what
each pass changed). The reviewer asked explicitly that this be done: *"the human
revision was not exhaustive but you can learn from the examples given for other
similar cases."*

Everything below is the reviewer's judgement plus the two limits and two scope
calls that were needed to apply it consistently. Where a limit or scope call is
an inference rather than the reviewer's own words, it says so.

---

## 1. The test

A row belongs in the register when the quoted text **sets an outcome that
someone is supposed to reach** — a state of the world, a level, a share, a date
by which something must be true.

A row does **not** belong when the quoted text instead:

1. describes what a document must contain (NT-1),
2. describes what money may be spent on or who may receive it (NT-2),
3. states a criterion for assessing, selecting or ranking something (NT-3),
4. defines a term (NT-4),
5. points at a target set by a different instrument (NT-5), or
6. is context, an illustrative statistic, a heading or a fragment (NT-6).

**Read the row in the source act, with the chapeau above it.** This is the
single most productive check. Many rows read as targets only because the
sentence that governs them was cut away — ERDF Art. 7(1)(b) looks like an
investment commitment until you see that its chapeau is *"The ERDF and the
Cohesion Fund shall **not** support:"*, at which point the row asserts the
opposite of the law. Never judge a quote on its own words when a chapeau,
derogation or exemption clause governs it.

---

## 2. The removal rules, with the reviewer's own words

### NT-1 · Content requirement for a plan, strategy or report
An item on the list of what a Member State plan, strategy or report must
contain, describe or justify.

> Social Climate Fund Art. 4(4)(a)-(b): *"This is not a target but a description
> of what the plans submitted by the Members States should include."*

### NT-2 · Eligibility or funding scope
A list of measures, costs or beneficiaries a fund may cover; a ceiling on
eligible expenditure; a condition for receiving money.

> Social Climate Fund Art. 7(2)(d): *"This is not a target, but part of a list of
> measures eligible to be covered by the fund."*

### NT-3 · Assessment, award or selection criteria; project characteristics
Criteria used to assess a plan, select or rank a project, or describe what an
eligible project looks like.

> TEN-E Art. 4(3)(a),(c),(d),(f): *"This is not a target but a characteristics of
> a project."*
> TEN-E Annex I(4): *"This is not a target but a criteria for an eligible
> project."*
> Social Climate Fund Art. 16: *"this is not a target in itself."*

### NT-4 · Definition
A definition, or the chapeau that introduces one.

> EU Taxonomy Art. 9: *"This is not a target but a clarification of definitions."*

### NT-5 · Pointer to another instrument's target
Text whose whole content is alignment with a target set elsewhere — "in line
with", "consistent with", "in order to meet" the Union's 2030 targets, the 2050
climate-neutrality objective, the Paris Agreement.

> TEN-E Art. 4(2)(e)(iii), Art. 4(5)(a), Art. 16(4)(a): *"This is not a target,
> but a listing of chracteristics of a projects that are in line with targets
> from other policies (e.g. the paris Agreement or the 2050 climate neutrality
> also known as net zero) and should not be captured."*

The target itself stays in the register — under the act that sets it.

### NT-6 · Context, illustrative material, headings, fragments
Soft-law text summarising commitments made elsewhere; background statistics;
annex or section headings; mid-sentence fragments carrying no complete statement.

> Zero Pollution Action Plan, body ×2: *"just a summary of other commitments as
> context."*

### DUP · Duplicate
The same sentence already in the register under another row of the same act —
including the common case where one row is a *sentence inside* a longer row, not
a near-identical twin. Keep the row with the more precise provision reference,
or the fuller quote. *(Inferred, not reviewer-flagged: found by scanning.)*

---

## 3. The correction rules — fix, don't delete

A truncated quote is a defect in the extraction, not a reason to drop the row.
Fix it by **re-extracting from the EUR-Lex source**, never by editing text.

### FIX-COLON · Chapeau cut at its colon
The quote ends at the colon introducing a list, and the enumerated points are not
separate rows. Re-extract chapeau + points.

> EU Taxonomy Art. 11(1): *"This is incomplete. Please extract the text following
> a colon."*

If the sub-points *are* already separate rows, leave the chapeau alone.

### FIX-ANAPHORA · Pronoun with no antecedent
The quote opens on "It", "This", "Those", "Such", "That quantity". Re-extract
with the preceding sentence included.

> Zero Pollution §2.3: *"The prior sentence should have been included to
> understand what 'It' refers to in the extracted target text."*

### FIX-TRUNCATION · Sliced mid-sentence
The subject sits before the slice, or the sentence continues past it. Re-extract
to sentence bounds. *(Inferred from the same defect class; found register-wide.)*

### FIX-ANNEX · A collated target list, only partly captured
A communication's annex that collates targets set by other instruments — capture
every entry.

> Water Resilience Strategy, Annex II: *"Annex 2 of this policy has 15
> intermediary targets collated from different regulations. Make sure each one is
> a row here if not already captured in the original policy it is citing. This is
> a common format for Communication documents and should be done for all of
> them."*

### SIBLING-GAP · A sub-point missing while its siblings are registered
AFIR Art. 9(1)(a) was in the register; (b) and (c) — the same duty for other ship
types — were not. When a quantified sub-point's siblings are registered, capture
it too. *(Inferred, found by scanning.)*

---

## 4. Classification rules

- **Climate relevance follows the mechanism**, not keywords. Mitigation: cuts
  GHGs, increases removals, or enables either (infrastructure, permitting,
  finance, standards). Adaptation: reduces vulnerability or exposure of people,
  assets, ecosystems or services; raises adaptive capacity (risk assessment,
  early warning, planning, insurance); protects health from climate-sensitive
  hazards; seizes an opportunity from a changing climate. Column 21 of the export
  carries the written argument, quoting the words that fired it.
  > Zero Pollution Annex 2, Targets 1 and 2: *"This should be classified as a
  > public health target and hence relevant to adaptation."*
- **A target may belong to several of the eight systems.**
  > Water Resilience Annex II, energy line: *"This should be classified as
  > relevant to buildings, energy and water (this latter relevant to adaptation)."*
- **Targets in none of the eight systems stay in the register**, flagged as such,
  for review — the reviewer asked for this explicitly.

---

## 5. Where the rules must NOT be applied

These limits exist because the first pass over-flagged. They are inferences from
the reviewer's examples, applied consistently ever since.

1. **A plan-content item that carries its own date or quantity stays.** EPBD
   Art. 3(2) (the roadmap "shall include national targets for 2030, 2040 and 2050
   … annual energy renovation rate") stays; the Social Climate Fund items the
   reviewer flagged fix neither a date nor a quantity, so they went.
2. **An obligation to ESTABLISH something stays; a description of what it must
   CONTAIN goes.** Floods Dir. Art. 7(1) (Member States shall establish flood risk
   management plans) stays; Art. 7(3) (what those plans shall address) goes.
3. **Review and reporting obligations with their own deadline stay** (CO2 cars
   Art. 15, Euro 7 Art. 18, LULUCF Art. 4(4)). They are labelled `commitment`,
   not `target`; the reviewer flagged none of them.
4. **An act's own subject-matter or objective clause stays** (European Climate
   Law Art. 1, FuelEU Art. 1). It goes under NT-5 only when its whole content is
   alignment with another act's target.
5. **Never drop a row merely for being non-climate, qualitative or
   unquantified.** Only the rules above justify removal.

**When in doubt, keep the row.** A false removal is much worse than a missed one:
the register is a screening aid whose peripheral rows are filtered by the
relevance lens anyway.

---

## 6. Scope calls

- **Annexes that list ACTIONS are out of scope; annexes that list TARGETS are
  in.** The Renovation Wave annex ("key Commission actions and indicative
  timelines"), the Green Deal roadmap annex and the Water Resilience Annex I
  ("Full List of Actions") are indexes of actions already described in the body.
  The Water Resilience Annex II and the Zero Pollution Annex 2 collate targets and
  are captured in full. *(Inferred; the reviewer's Annex II instruction speaks of
  "intermediary targets".)*
- **A row that already exists as peripheral is a relevance question, not a
  missing row** — flip the lens flag rather than adding a duplicate.

---

## 7. How to apply a correction in this repo

The dataset is generated. **Never hand-edit `src/data/policy-targets.generated.ts`.**

| To do this | Edit this | Then |
|---|---|---|
| Remove a row | add `{"id": "tgt-…", "drop": true, "reason": "NT-3: … [tag]"}` to `scripts/policy-targets-overrides.json` | rebuild |
| Change a field (climate, sectors, label, relevance) | add `{"id": "tgt-…", "set": {...}, "reason": "…"}` to the same file | rebuild |
| Fix a truncated quote, or add a missing one | add the corrected/new quote to a file in `scripts/policy-targets-input/` (e.g. `_corrections-2026-07b.json`), and drop the superseded row via an override | rebuild |

Rebuild with `npm run build:policy-targets`; regenerate the reviewer workbook
with `python3 scripts/export-policy-targets-workbook.py`.

**Every entry carries a `reason` naming its rule.** That is what makes a removal
reversible and the workbook's "Removed rows" sheet meaningful.

### Four hard requirements

1. **Quotes are verbatim.** Every `quote` must be a contiguous substring of the
   act's text in `public/data/policy-texts/<policy_id>.txt` (whitespace
   normalised). The build re-validates and re-slices from the source; a
   paraphrase is silently rejected.
2. **Quotes are ≤ 900 characters** — the build's ceiling. A longer re-extraction
   is rejected, and if you dropped the row it supersedes, the target disappears
   from the register. Trim to the last complete list item.
3. **Check completeness after rebuilding**: every candidate you added must appear
   in the rebuilt dataset. This is how the four-row loss above was caught.
4. **Row ids are content hashes** of `policy_id + normalised text`. Changing a
   quote changes its id — which is why a corrected quote is a *new* candidate plus
   a *drop* of the old id, never an in-place edit.

---

## 8. Evidence and history

- The reviewer's marked-up workbook: 21 rows, `Not correct` + `reason` columns,
  July 2026. The reasons are quoted above.
- What each pass changed, with counts per rule and the borderline calls:
  `docs-internal/policy-targets-human-review-2026-07.md`.
- The two earlier internal fact-checks:
  `docs-internal/policy-targets-factcheck-2026-07.md`.
- Removals, with rule and reason per row, also ship in the **Removed rows** sheet
  of `public/data/eu-policy-targets-corrected.xlsx`.

The exported workbook keeps empty `12 · Human confirmed`, `Not correct` and
`reason` columns for exactly this purpose: the next reviewer marks rows there,
and **those reasons become the next rules in this file.**
