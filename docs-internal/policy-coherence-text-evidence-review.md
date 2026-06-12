# Policy Coherence Assessment — full review & text-evidence layer

*June 2026 — accompanies the `policy-coherence-evidence.ts` build.*

This document records (1) a full review of the four-step policy coherence
assessment, (2) the text-evidence layer built from that review — every curated
grade anchored to the actual words of the acts — and (3) how the tagged corpus
is registered in the Content Analysis module as the **"Policy coherence —
master library"**.

## 1. What was reviewed

The beta coherence model (`src/lib/content-analysis/policy-coherence.ts`)
grades the tracked corpus on four levels:

| Step | Lens | Framework | Basis |
|---|---|---|---|
| ① | Ex ante design vs world development | Assumption-Based Planning (Dewar et al., RAND 1993) | curated |
| ② | Coherence across policy goals | Nilsson et al. (2016) seven-point interaction scale | curated |
| ③ | Goals vs means of implementation | Howlett & Rayner (2007) goals/means congruence | derived from objective–delivery checklist |
| ④ | Policy evaluation (change & outcomes) | EEA distance-to-target pace ratio | mixed (derived machinery + computed pace) |

The model's discipline held up well under review: every grade follows from a
declared rule applied to citable evidence, steps ③–④ derive from the checklist
rather than re-assessing, and the pace readings are arithmetic. **The gap the
review found was provenance**: legal bases were cited as references
("RED Art. 29 + Annex IX") but the *text* of those provisions was nowhere in
the module — a reader could not see the words an assessment stems from without
leaving the app, and could not tell whether the cited (consolidated) provision
even exists in the shipped text library.

## 2. The text-evidence layer

`src/lib/content-analysis/policy-coherence-evidence.ts` now carries
**83 provision anchors** covering all 24 step-① assumption audits, all 26
step-② goal interactions (per-side) and the 9 step-④ measured in-act targets:

- **59 verbatim quotes**, extracted from and programmatically verified against
  `public/data/policy-texts/<policyId>.txt` (whitespace- and
  typographic-quote-normalised matching). These are the literal words of the
  acts.
- **24 flagged paraphrases** (`quote: null` + `gloss` + `textNote`) where the
  text library lacks the act or ships a pre-amendment version. Nothing is
  passed off as a quote that isn't one.

Each anchor carries: the provision reference (`Art. 4(2)`), the passage, a
one-line *reading* (why this passage grounds the assessment), and the vintage
caveat where applicable.

Steps ③ and ④ (machinery) stay **derived**: their in-text tags are generated
from the checklist roll-ups (`meansCoherence` / `evaluationCoherence`) and
anchored on the provisions the checklist rationales cite — never re-authored.

### Where it surfaces

- **Beta module** (`/beta/policy-coherence`): every ex-ante card shows an
  *"In the act — where the assumption stems from"* block; every interaction
  card shows the side-by-side provisions that create the interaction; the
  evaluation view quotes the in-act target under each pace reading; the
  synthesis drill-down includes the ① and ④ anchors. Verbatim passages are
  badged `verbatim`; paraphrases are badged `paraphrase — text not in library`
  with the reason.
- **Content Analysis master library**: `buildCoherenceSegmentsFor` seeds the
  anchors as master-level coded segments (`seg-coh-…`) under the four `coh-*`
  codes — 96 segments at seed time, growing/re-anchoring as fuller bodies
  load (the store's `reanchorChecklistSegments` and `applyPolicyBodies` now
  rebuild them alongside the checklist annotations, and hydrate backfills
  them once into pre-existing snapshots). With the full policy texts as
  substrate, 49 anchors resolve to exact word-level spans; the rest highlight
  the cited article block (multi-paragraph quotes can't sit inside one block).
- **Seeded project** `project-policy-coherence` ("Policy coherence — master
  library") scopes exactly the coherence-assessed corpus.

## 3. Review findings

**F1 — Text-library vintage is uneven (material).** Building the layer forced
a word-level comparison of the assessment's legal citations against the
shipped texts. Four heavily-cited acts ship in pre-amendment versions:

| Act | Shipped text | Missing provisions cited by the assessment |
|---|---|---|
| EU ETS Directive | original 2003/87/EC | Art. 9 LRF 4.3/4.4 %, Art. 10a(1a) CBAM phase-out, Chapter IVa (ETS2) — all 2023/959 |
| Effort Sharing Regulation | 2018/842 as adopted | Annex I −40 % update (2023/857) |
| Renewable Energy Directive | RED II (2018/2001) | 42.5 % target, Arts. 15b–16f acceleration areas, Art. 22a (RED III, 2023/2413) |
| CO₂ cars Regulation | 2019/631 as adopted | Art. 1(5a) 2035 100 % step (2023/851) |

REPowerEU, Farm to Fork, the Habitats and (revised) Air Quality Directives,
the electricity-market reform, the hydrogen/gas package, the Green Claims
proposal and the EuGB Regulation are absent from the library altogether.
*Recommendation:* point `fetch-eurlex-texts.js` at the consolidated CELEX ids
for these four acts; the affected anchors flip from paraphrase to verbatim
automatically once the texts update (anchoring is re-run on substrate change).

**F2 — Assessment content survives word-level confrontation.** Confronting
each assumption, interaction and target with the actual provision text
produced no contradictions: the cited provisions say what the assessment says
they say (e.g. CBAM Art. 1(3) literally defines CBAM as the replacement for
ETS free allocation — the step-② "reinforcing" mechanism is stated in the
act's own words; the F-gas Regulation's own recitals record the heat-pump
tension scored as −1). Two citations were *sharpened* during anchoring: the
NRL plan deadline lives in Art. 16(1) (not Art. 14), and the CSRD wave scope
is operationalised in Art. 5(2).

**F3 — Limitations (accepted).** (a) Multi-paragraph quotes anchor at the
article block, not the exact span — a consequence of the one-block segment
model. (b) The 24 kB seed-time truncation of policy bodies means deep-in-act
anchors resolve only after the lazy body merge or an ingest; this mirrors the
existing checklist-annotation behaviour. (c) `cap-strategic-plans.txt` is a
EUR-Lex page scrape with navigation chrome; its article text is intact and
quotes verify, but it should be re-fetched clean.

## 4. Verification

- All 59 verbatim quotes verified against the text library (0 failures).
- `tsc --noEmit` and `next build` pass.
- Seed smoke test: 96 `seg-coh-*` segments across `coh-exante` (14),
  `coh-horizontal` (19), `coh-means` (30), `coh-evaluation` (33); project
  seeded with the assessed corpus.

---

## 5. Update — June 2026 deep-research pass

A second round: a web-verified research pass over the whole assessment
(two parallel research agents, ~80 sources; key URLs in the PR description
and inline in the observation `source` fields), plus the Content Analysis
integration that makes the tags first-class inside the module.

### 5.1 What the research changed in the assessment

**Status flips and observation refreshes** (every curated observation now
reflects June 2026):

- *EU Climate Law*: the 2040 target is adopted law — **Reg. (EU) 2026/667**
  (−90 % net by 2040, ≥85 % domestic, ≤5 pp Article-6 credits from 2036; in
  force 7 Apr 2026). Ex-ante stays *under pressure* by its own criterion
  (the H1 2024 deadline was missed) but the observation now records the
  ratchet delivering, late.
- *Social Climate Fund*: flipped **under pressure → violated** — the same
  Reg. 2026/667 postpones ETS2 to 2028 *in law*, which is exactly the
  violation criterion declared ex ante. Only Sweden's Plan was approved by
  spring 2026.
- *CSRD / Taxonomy*: Omnibus I is now adopted (Dir. (EU) 2026/470, in force
  18 Mar 2026; >1,000 employees AND >€450m turnover; first reports FY2027)
  — observations updated from "proposal" to enacted law.
- *CBAM*: definitive regime started **on schedule** 1 Jan 2026 (first
  certificate price €75.36/t); de-minimis enacted as Reg. (EU) 2025/2083;
  downstream extension proposed Dec 2025.
- *CO₂ cars*: averaging enacted as Reg. (EU) 2025/1214; the Dec 2025
  proposal to cut the 2035 step to 90 % is recorded as a live proposal, not
  law. BEV share 17.4 % (2025), 19.4 % (Q1 2026).
- Data refresh to 2024 across the step-④ measurements (ETS −51 % vs 2005;
  ESR flat at index 80; LULUCF −212 Mt proxy; RES share 25.2 %; final
  energy 900 Mtoe — first rebound year against the EED cap).

**New coverage** — five ex-ante audits (EUDR *violated* — postponed twice,
Reg. 2025/2650; Batteries *violated* — stop-the-clock Reg. 2025/1561 +
missing carbon-footprint delegated acts; IED 2.0 *under pressure* —
transposition deadline 1 Jul 2026; TEN-T *violated* — ECA: 2030 core
completion "will not be met"; ESPR *valid* — working plan on schedule) and
six goal interactions (EUDR×CAP −1; Batteries×CRMA +2; Cars×Batteries +1;
IED×ETS 0 by-design demarcation; TEN-T×AFIR +2; ESPR×NZIA +1). All carry
text anchors; the evidence layer now holds **100 anchors (72 verbatim,
verified, 0 failures)**.

**Systemic finding** recorded in the model header: post-adoption softening
(scope cuts, date slips, step-averaging after first contact with compliance
costs) recurs across CSRD, CBAM, CO₂ cars, EUDR, Batteries, ETS2/SCF and
CAP — a property of the 2025–26 simplification wave, not act-specific
noise. Also noted: the Energy Taxation Directive revision is blocked
(ECOFIN Nov 2025) — a standing fossil-pricing coherence gap the corpus
cannot express because the ETD is not a tracked policy.

**New vintage findings**: the shipped EUDR text still carries the original
30 Dec 2024 application date (predates both postponements); the IED text is
Dir. 2010/75/EU without the 2024 revision; `ten-t-regulation.txt` is a page
stub, not legal text.

### 5.2 Content Analysis integration ("see exactly where it comes from")

- **Full-text substrate**: `scripts/build-policy-bodies-from-texts.mjs`
  (wired into `prebuild`) now generates the long-missing
  `public/content-analysis/policy-bodies.json` from the shipped policy
  texts — 55 documents, annex-trimmed, ~10 MB lazy-fetched asset. The
  module's existing `applyPolicyBodies` merge finally has something to
  merge: documents swap their 24 kB stubs for the real legal text and the
  seeded coherence/checklist annotations re-anchor to **exact word-level
  spans** (59 of 72 verbatim anchors; the rest highlight the cited article
  block).
- **localStorage discipline**: merged bodies are marked `staticBody` and
  `persist()` strips them back to the seed cap (same pattern as screenshot
  stripping) — the full text lives in memory and re-merges on every mount,
  so the quota is never at risk.
- **Compare tab lenses**: the standalone Content Analysis module's Compare
  tab now has a lens switcher — *Tag matrix* (existing) · *Objective
  checklist* · *Coherence model* — mounting the same boards as the beta
  module/workspace, scoped to the active project corpus, quotes included.

### 5.3 Verification (this round)

- 100 anchors, 72 verbatim — all verified against the text library, 0
  failures.
- Bodies smoke test: 59 exact word-level spans, 11 article-block anchors,
  53 derived ③/④ roll-ups across the assessed corpus.
- `tsc --noEmit` and `next build` (including the new prebuild step) pass.

---

## 6. The coherence master library (granular taxonomy seeding)

The tags and annotations are now seeded as a first-class **master library**
in the Content Analysis module:

- **Granular verdict taxonomy** (`COHERENCE_CHILD_CODES`, defined next to
  the model in `policy-coherence-evidence.ts` so codes and annotations
  cannot drift): 17 child codes under the four step codes — the three
  Assumption-Based-Planning statuses, the **full seven-point Nilsson
  scale** (empty points stay in the tree as taggable categories), the
  declared means-coherence bands, and the EEA pace readings plus the
  derived MRV/review machinery code. Colors encode the verdict
  (green/amber/red ramps).
- **Every seeded annotation carries its verdict code**, not just its step:
  104 segments at seed across 13 populated codes (e.g. `coh-exante-violated`
  ×6, `coh-scale-m2` ×3, `coh-eval-offtrack` ×3, `coh-eval-machinery` ×29).
  Filtering the code tree by a verdict now lists exactly the passages that
  ground that verdict, corpus-wide.
- **Landing**: the "Policy coherence — master library" project is pinned in
  the Master row of the module landing (violet accent, own kind label,
  not deletable), with its real annotation count (master-level segments
  under the `root-coherence` subtree) instead of 0.
- **Migration**: snapshots whose `seg-coh-` segments still carry the flat
  step codes are rebuilt once at hydrate (seed-generated segments, never
  user-authored); the new child codes merge in via the standard
  missing-master-code path, and `getMasterCode` resolves them everywhere
  since the catalog derives from the seed.

---

## 7. Adversarial fact-check round (June 2026)

Two verification agents tried to falsify every load-bearing claim against
EUR-Lex, EEA, Eurostat, Commission and ACEA sources.

**Legal instruments — all regulation numbers and dates verified** (2026/667,
2026/470, 2025/794, 2025/2083, 2025/1214, 2024/3234 + 2025/2650, 2025/1561,
2024/1785, COM(2025) 187, ECA SR 02/2026, CRCF DA of 3 Feb 2026, CBAM first
certificate price €75.36). Three substantive refinements applied:

- *Taxonomy*: the Jul 2025 delegated act cut datapoints **~64% for
  non-financial undertakings** (more for banks); reporting voluntariness
  below the 1,000-employee/€450m threshold flows from the **Omnibus
  level-1** CSRD changes, not the DA. Observation re-attributed.
- *Social Climate Fund*: the ETS2 delay was enacted by Reg. 2026/667
  Art. 2 **declaring the Art. 30k postponement rules applicable** — which
  arguably triggers the SCF's own fallback clause cutting the Fund to
  €54.6 bn (legally unsettled; Reg. 2026/667 is silent on the SCF). New
  verbatim anchor quotes that fallback subparagraph: the act prices in its
  own failure mode. Lithuania's plan approval (8 Jun 2026) recorded.
- *EUDR*: all dates verified incl. the rejected "no-risk" tier.

**Data points — five errors found and corrected** in the pace-ratio inputs:

| Series | Was | Corrected | Source |
|---|---|---|---|
| ETS stationary 2019 (index, 2005=100) | 67 | **65** (−35%) | Carbon Market Report 2020 |
| ETS 2024 yoy | −7% | **−5.8%** | CAPR 2025 |
| ESR 2019 (index) | 88 | **90** (−10%) | CAPR 2020 |
| Final energy 2019 | 935 Mtoe | **984 Mtoe** | Eurostat |
| LULUCF 2019 sink | −240 Mt | **−249 Mt** | EEA (revision-sensitive) |

Plus refreshes: net GHG 2018 index 78; latest points moved to 2024/2025
(net GHG 2024 provisional −37.2%; new-car CO₂ **106.8 g/km 2024 — up from
106.4 in 2023, the first reversal of the WLTP series**; organic share 10.8%
in 2023; Russian gas 19% 2024 → ~13% 2025, with the stepwise import ban now
law as **Reg. (EU) 2026/261**). The ESR Member-State lists were wrong and
were replaced with the CAPR 2025 lists (2023 exceedances: HR, CY, DK, IE,
IT, MT; projected 2026–30: AT, EE, DE, IE, MT, SE). The data-centre claim
was tightened (IEA: ~+65% by 2030; doubling only in market estimates).

**Corrected readings (mechanical ripple):** the fixes flipped four pace
readings — Climate Law on-track → **lagging (0.83)**, ESR off-track →
**lagging (0.60)**, EED off-track → **lagging (0.74)**, CO₂ cars stays
off-track but at **0.26**. The corrected board now matches the EEA's own
T&P 2025 readings (WEM −47% / WAM −54% vs −55%) — a good sign the
distance-to-target machinery reproduces the official method when fed clean
inputs. Residual weak points flagged by the verifiers: the 2019 LULUCF
level is revision-sensitive, and the 2018 net-GHG index is inferred from
the CAPR 2020 anchor rather than a current published figure.
