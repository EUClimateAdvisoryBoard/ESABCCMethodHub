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
