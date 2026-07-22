# Policy Targets Register (M·36) — fact-check audit, July 2026

Full review of the target-extraction dataset shipped with PR #407: every one
of the 662 rows across all 38 acts was fact-checked (one reviewer agent per
act reading the act's EUR-Lex source text), findings were adversarially
re-verified, and the confirmed corrections were applied. Result: **653 rows**
(9 dropped), with 312 rows corrected via `scripts/policy-targets-overrides.json`.

## What was checked, per row

1. Quote provenance (verbatim, enacting terms only) — re-validated
   independently of the build pipeline.
2. Provision reference (`article`) against the actual location of the quote.
3. Timeline support (agent-supplied timelines vs the surrounding provision).
4. Indicators (fabricated vs context-supported).
5. Classifications: label, obligation, type, climate-relevance.
6. Act metadata: title, CELEX, document type, EUR-Lex URL.

## Outcome

- **Verbatim integrity held**: all 662 quotes were exact substrings of the
  enacting terms — no fabricated or paraphrased text was found. All CELEX
  numbers and EUR-Lex URLs checked out.
- **426 row-level findings** were raised; after deterministic re-verification
  against the sources, they resolved into 321 override entries + rule fixes.

## Errors fixed

- **Provision references**: ~180 rows now cite the precise paragraph/point;
  amendment text an act inserts into *other* legislation is now labelled as
  such (EU Climate Law Art. 13 insertions into Reg. 2018/1999; Governance
  Regulation Arts. 47/53 insertions — rows previously cited non-existent
  articles like "Article 2a"). Green Deal / Fit-for-55 rows cite numbered
  sections instead of "Body". Mid-word 80-char truncations eliminated.
- **Obligation**: soft law (communications/strategies) is now always
  voluntary; "shall endeavour / aim / strive" counts as voluntary (PPWR 2040
  endeavour sub-targets, CAP Art. 105, RED interconnection objective, FuelEU
  RFNBO multiplier…). Fit-for-55 was also re-typed strategy → communication.
- **Climate relevance**: substance-based corrections for keyword misses —
  all 13 RefuelEU SAF mandates, AFIR EV-charging/shore-side rows, FuelEU OPS,
  CAP climate/eco-scheme rows, CSDDD/SFDR "climate change mitigation"/Paris
  rows (none → mitigation/both); and keyword false positives (chemical
  "emissions" in the Water FD, industrial "resilience" in NZIA,
  "climate-related" budget shares) downgraded.
- **Type**: EUR 65bn (SCF), EUR/tonne penalties (ETS), month-count deadlines
  (CRMA) now quantitative; chapeau quotes whose numbers sit in unquoted
  sub-points no longer claim to be quantitative.
- **Timelines**: garbled 60-char truncations replaced with the correct
  period from the source (or cleared when unsupported); wrong years fixed
  (e.g. RED Art. 3 headline target: 2023 review year → the 2030 target year).
- **Dropped rows (9)**: document titles/headings extracted as "targets"
  (Fit-for-55 title ×2, Horizon Europe headings ×2) and near-duplicate rows
  (Fit-for-55 ×2, CO2 cars, methane, Climate Law).
- **Metadata**: NZIA title corrected (had CRMA's "secure and sustainable
  supply" wording); Fit-for-55 document type corrected.

## Durability improvements

- Row ids are now **stable content hashes** — regeneration no longer shifts
  ids, so reviewers' column-12 confirmations stay attached to the right rows.
- All corrections live in `scripts/policy-targets-overrides.json` with a
  per-entry reason, applied by the build script after deterministic
  classification — `npm run build:policy-targets` reproduces the dataset.

Remaining known caveat (unchanged, documented in the module docs): a few
corpus texts are pre-consolidation versions (EU ETS 2003/87/EC original,
RED 2018), so their figures reflect that text.

---

# Second pass — the 24 added acts + a relevance lens (July 2026)

After the first pass the register was expanded from 38 to **62 acts** by adding
the resilience, health, civil-protection, cohesion-funding and single-market
acquis (birds/habitats/floods directives, the CPR/ERDF/InvestEU/MFF funding
instruments, the health-union / cross-border-health / one-health-AMR / mental-
health / OSH acts, the civil-protection & preparedness & critical-entities
resilience acts, TEN-E/TEN-T, the adaptation strategy, managing-climate-risks,
water-resilience, the 8th EAP, competitiveness compass, cultural-heritage
framework, renovation wave). That is **404 new rows across 24 acts**.

## What was done

- **Fact-check fan-out.** One Sonnet reviewer agent per act read the act's
  EUR-Lex source text and checked every row (quote provenance, provision
  reference, label, obligation, type, timeline, indicators, climate-relevance),
  then a second Sonnet verifier agent adversarially re-checked each act's
  proposed changes against the source (the same propose → verify method as the
  first pass). 13 acts completed both passes; for 11 acts the verifier hit the
  session token limit, so the reviewer's pass was used for those (noted below).
- **Corrections applied** (`scripts/policy-targets-overrides.json`, tagged
  `[fact-check 2026-07 new-acts]`): **257 rows touched** — **39 dropped**,
  **208 field corrections**, **20 explicit relevance flips**. Field fixes by
  column: article 120, climate-relevance 64, type 54, label 34, obligation 16,
  timeline 11.
  - *Dropped rows* were non-targets: subject-matter/scope clauses (e.g. "This
    Directive relates to…", Art. 1 of the birds/floods/CER/ERDF/TEN-T acts),
    definitions clauses ("'climate proofing' means…"), document titles/section
    headings, near-duplicate sentences, footnote/illustrative content, and
    retrospective statistics ("the 2008 MSFD goal was not met") — never dropped
    merely for being non-climate.
  - *Climate-relevance* was corrected by substance: CPR Art. 6 climate-
    expenditure targets → `both` (they track mitigation **and** adaptation
    intervention codes); adaptation/resilience/restoration rows wrongly tagged
    `none` → `adaptation`/`both`; non-climate biodiversity, health and cohesion
    boilerplate confirmed `none`.
  - *Obligation/type/article* fixes: soft-law communications set voluntary,
    binding "shall"/non-regression clauses set mandatory, numeric/dated quotes
    re-typed quantitative, generic "Article N" references sharpened to the exact
    paragraph/sub-point.

## New: the relevance lens (column-13 `relevant` flag)

The expanded register carries a lot of material that is peripheral to a climate
board — generic institutional/procedural commitments and non-climate sectoral
provisions. Each row now has a boolean **`relevant`** flag:

- **Default rule** (`relevantDefault` in `scripts/build-policy-targets.mjs`):
  a row is *relevant* if its climate-relevance is not `none`, **or** it is a
  quantified, time-bound target/goal; otherwise *peripheral*.
- **Refined per row** by the fact-check pass — the reviewer/verifier set
  `relevant` explicitly where it disagreed with the default (20 flips), so the
  override wins; everything else follows the deterministic rule.
- **In the UI** (M·36 page) a *Relevance* filter defaults to **relevant**, so
  the register opens on the transition-material targets and hides the peripheral
  commitments; switch it to *all* / *peripheral* to see the rest. The flag is
  also a column in the Excel/CSV export.

Result: pure non-climate acts (birds & habitats directives, the health-union /
cross-border-health / one-health-AMR / mental-health / OSH acts, MFF) fall
entirely into *peripheral*; climate-core acts (adaptation strategy 26/26,
managing-climate-risks 19/21, floods 15/17, ERDF climate-spend 12/12) stay
*relevant*; mixed acts (competitiveness compass, TEN-T, 8th EAP, preparedness,
critical-entities, civil-protection, cultural heritage) keep only their
climate/energy slices.

## Outcome

- Dataset is now **1018 targets across 62 acts** (39 of the 404 new-act
  candidates dropped). Relevance split: **669 relevant / 349 peripheral**
  (new acts: 165 / 200; older 38 acts: 504 / 149).
- The build remains deterministic and idempotent
  (`npm run build:policy-targets` reproduces the dataset).

## Known caveats (this pass)

- **11 acts are reviewer-only** (verifier not run — session limit): managing-
  climate-risks, mental-health-approach, mff-regulation, one-health-amr,
  osh-framework-directive, preparedness-union-strategy, renovation-wave,
  ten-e-regulation, ten-t-regulation, union-civil-protection-mechanism,
  water-resilience-strategy. Their corrections come from a single (still
  source-checked) reading rather than the two-agent propose→verify loop; re-run
  the verifier for these when capacity allows.
- Relevance is a **screening lens**, not a legal classification — it reflects
  materiality to the EU climate/energy transition, and every row (including
  peripheral ones) remains in the dataset and viewable via the *all* filter.
