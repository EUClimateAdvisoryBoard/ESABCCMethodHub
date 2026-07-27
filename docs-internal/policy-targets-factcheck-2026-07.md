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
  first pass). **All 24 acts completed both passes** (the 11 acts whose verifier
  first hit the session token limit were re-verified in a follow-up run). The
  verifiers materially improved the 11 re-verified acts — e.g. restoring
  quantitative typing the reviewer had wrongly downgraded (renovation wave,
  TEN-E) and overturning an unjustified drop (TEN-E Art. 1(1), which embeds the
  Regulation's own 2030/climate-neutrality objective).
- **Corrections applied** (`scripts/policy-targets-overrides.json`, tagged
  `[fact-check 2026-07 new-acts]`): **255 rows touched** — **39 dropped**,
  **205 field corrections**, **27 explicit relevance flips**. Field fixes by
  column: article 101, type 74, climate-relevance 69, label 35, obligation 16,
  timeline 14.
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
  `relevant` explicitly where it disagreed with the default (27 flips), so the
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
  candidates dropped). Relevance split: **673 relevant / 345 peripheral**
  (new acts: 169 / 196; older 38 acts: 504 / 149).
- All 24 added acts are **two-agent verified** (reviewer → adversarial verifier).
- The build remains deterministic and idempotent
  (`npm run build:policy-targets` reproduces the dataset).

## Known caveats (this pass)

- Relevance is a **screening lens**, not a legal classification — it reflects
  materiality to the EU climate/energy transition, and every row (including
  peripheral ones) remains in the dataset and viewable via the *all* filter.

---

# Third pass — conformance audit against the documented methodology (July 2026)

The first two passes checked the *rows* against the sources. This pass checked
the *pipeline* against its own documentation: every guarantee in
`docs/modules/policy-targets.md` was re-derived from the shipped dataset by an
independent implementation (deliberately not importing the build script, so a
self-consistent bug in the builder could not pass itself). Four violations were
found and fixed, and the checks are now enforced on every build.

## What was broken

1. **The build no longer reproduced the dataset.** `npm run build:policy-targets`
   yielded 1 025 rows against the committed 1 018. Cause: the TEN-T source text
   was fetched in full at `89c8053` (a 17 703-line expansion of
   `public/data/policy-texts/ten-t-regulation.txt`) but the committed
   `_regex.json` still reflected the pre-fetch stub, so 7 TEN-T candidates from
   the completed text never reached the merge. The documented "deterministic and
   idempotent" claim was therefore false at HEAD.
2. **8 soft-law rows were mandatory.** Overrides on `managing-climate-risks` (3)
   and `water-resilience-strategy` (5) set `obligation: mandatory` because the
   reviewer read the passage as binding ("must be fully integrated", "the
   Drinking Water Directive requires…", Nature Restoration Regulation
   restatements). That is exactly the confusion the soft-law rule exists to
   prevent: column 6 reports the obligation created by *the act the row belongs
   to*, and the binding force in each case sits in an act the register carries
   under its own rows. Overrides were applied after classification with no
   guardrail, so they could overrule the rule.
3. **The best-efforts rule was under-implemented.** It matched only "shall
   endeavour / aim / strive", missing the "shall make (all appropriate) efforts"
   family — TEN-T Art. 46(1) was typed mandatory.
4. **17 rows were duplicates.** The dedupe key hashed the quote as-is, so the
   same provision survived twice whenever the agent quoted it with its paragraph
   enumerator ("1. Member States shall…") and the sentence-splitting regex net
   without it. Affected acts: EU Climate Law (3), EPBD (4), LULUCF (2), RefuelEU
   (2), CBAM, CSDDD, F-gas, FuelEU, SCF, Taxonomy. Two of these rows also
   carried a reviewer's TODO note *inside* the provision reference
   ("…(duplicate of tgt-0074; consider removing one)"), which rendered in the
   register's Provision column.

## What was changed

- **`scripts/build-policy-targets.mjs`** — enumerator-insensitive dedupe key
  (richer agent entry wins); best-efforts detection extended to a governing
  "shall make … efforts" / "use its best endeavours" while a *secondary*
  best-efforts duty still cannot downgrade a binding headline target (EED
  Art. 4(1) verified unchanged); soft-law obligation re-asserted after overrides,
  logging each override it overrules.
- **`scripts/check-policy-targets.mjs`** (new, wired into
  `npm run build:policy-targets` and `npm run check:policy-targets`) — 10
  invariants: verbatim, enacting-terms-only, stable + unique ids, one row per
  target, soft-law voluntary, best-efforts voluntary, relevance-lens default,
  act metadata vs the canonical registry, enum/bounds/numbering, and override
  hygiene (no stale entries, every entry has a reason, no reviewer notes leaking
  into the provision reference).
- **`scripts/policy-targets-overrides.json`** — `obligation` removed from the 8
  soft-law entries (the rest of each correction kept, reason annotated); 11
  entries stranded by the dedupe fix removed after confirming the surviving twin
  carries an equal or sharper reference and timeline in every case; 8 TEN-T
  entries added (below).

## The 7 new TEN-T rows, fact-checked

Reviewed against the source before being shipped, same criteria as the earlier
passes:

- **Kept (4)**, with the provision reference sharpened to the exact sub-point
  and the timeline taken from the binding chapeau the sub-point hangs off:
  Art. 15(2)(b) axle load (by 31 Dec 2050), Art. 16(2)(c) freight design speed
  and Art. 16(4)(b) passenger design speed (both by 31 Dec 2040), Art. 19(1)(b)
  75 % cross-border punctuality (by 31 Dec 2030, **voluntary** — the chapeau is
  "shall make all possible efforts to ensure"; the "shall" inside the quote is
  an incidental exclusion rule). All four are technical/operational transport
  standards with no climate content in the quote → `none` / peripheral,
  consistent with the sibling TEN-T rail-specification rows.
- **Dropped (3)**: Art. 21(3)(a) inland-port and Art. 33(2)(a)–(b) airport
  thresholds are network-*membership eligibility criteria* ("In order to be part
  of the comprehensive network, an airport shall meet at least one of the
  following conditions…") — scope clauses, not targets the act sets.
- **One older row dropped**: `tgt-e999f611` quoted only the speed clause of
  Art. 16(4)(b), omitting the governing "75 % of the length of each rail
  section" threshold and so overstating the requirement. The complete point is
  now carried by `tgt-6208c6ed`.

## Outcome

- **1 004 targets across 62 acts** (1 018 → +7 TEN-T, −17 duplicates, −4
  reviewed drops). Relevance split **660 relevant / 344 peripheral**.
- Obligation **744 mandatory / 260 voluntary** (9 rows flipped to voluntary: the
  8 soft-law rows and TEN-T Art. 46(1)).
- No row's id changed and no surviving row's quote changed, so existing column-12
  confirmations remain attached.
- Two consecutive builds now produce byte-identical output, and all 10
  invariants pass.
