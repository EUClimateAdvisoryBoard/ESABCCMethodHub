# M · 36 — Policy Targets Register

!!! tip "Status"
    Beta · route [`/beta/policy-targets`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/policy-targets)

A reviewable, exportable table of **every target, goal, objective and
commitment** in the EU climate acquis — each one extracted **verbatim**
from the enacting terms of the source act, and classified along the
dimensions the Secretariat screens on. It is the structured companion to
the M·04 Policy Navigator: the Navigator maps how acts relate, this
register pulls the concrete commitments out of them.

## What it produces

One row per target (a policy can have many), with twelve columns:

| # | Column | Notes |
|---|--------|-------|
| 1 | Name of policy | Official title of the act. |
| 2 | Type of policy | regulation · directive · decision · communication · strategy. |
| 3 | Policy area | Headline sector (Climate, Energy, Transport, Finance …). |
| 4 | Target text | **Verbatim** quote, numbered per policy. |
| 5 | Target label | target · goal · objective · commitment · other. |
| 6 | Obligation | mandatory vs voluntary. |
| 7 | Type of target | quantitative · qualitative · unspecified. |
| 8 | Timeline | time phrase from the quote (e.g. "by 2030") — or, for a few reviewed rows, from the surrounding provision — or unspecified. |
| 9 | Indicators | metrics linked to the target, if any. |
| 10 | Climate-relevance | mitigation · adaptation · both · none. |
| 11 | Source | link to the act on EUR-Lex. |
| 12 | **Human confirmed** | reviewer checkbox — grey until ticked, then green. |

The full table (including confirmation status) downloads as **`.xlsx`**
(styled, auto-filtered, confirmed rows shaded green) or **`.csv`**.

## How the data is built

The pipeline is **recall-first** by design — it is better to surface a
borderline candidate for a human to reject than to miss a real target.

```mermaid
flowchart LR
    A[EUR-Lex texts<br/>public/data/policy-texts/*.txt] --> B[Extraction agents<br/>one per policy group]
    A --> C[Regex safety-net<br/>extract-policy-targets.mjs]
    B --> D[scripts/policy-targets-input/*.json]
    C --> D
    D --> E[build-policy-targets.mjs<br/>VERBATIM validation + classify]
    O[Reviewed overrides<br/>policy-targets-overrides.json] --> E
    E --> F[src/data/policy-targets.generated.ts]
    F --> G[/beta/policy-targets table + Excel/]
```

1. **Agents** read each act and pull every target-like statement from the
   **articles/annexes only** — never the preamble/recitals.
2. A **regex safety-net** sweeps the same enacting terms for unambiguous
   quantified/dated targets, so nothing obvious slips through.
3. `build-policy-targets.mjs` is the **trust boundary**: a candidate is
   kept only if its quote is an exact substring of the source act's
   enacting terms, and the exact source characters are re-sliced so the
   stored text is guaranteed real EUR-Lex text — not an agent paraphrase.
   Obligation, type, timeline and climate-relevance are then derived
   deterministically for consistency.
4. **Reviewed overrides** (`scripts/policy-targets-overrides.json`) carry the
   verified corrections from the July 2026 per-act fact-check pass (one
   reviewer per act, every row checked against the source, adversarially
   verified): precise provision references (including amendment text an act
   inserts into *other* legislation), context-supported timelines,
   substance-based climate-relevance calls the keyword rules miss (e.g. SAF
   mandates, EV-charging infrastructure), and drops for heading-only or
   duplicate rows. Each entry records its reason and is applied after
   deterministic classification.

Row ids are **stable content hashes** of (policy, quote) — regenerating the
dataset does not shift them, so human confirmations (column 12) keep
pointing at the same target.

Regenerate with:

```bash
npm run build:policy-targets   # regex sweep → merge/validate → generated TS
```

## Nomenclature

The register keeps the ESABCC distinction explicit in column 5:

- **Goal** — a long-term direction (e.g. the Paris "global adaptation goal").
- **Objective** — a stated purpose of the act, broader than a single figure.
- **Target** — a quantified, usually dated milestone.
- **Commitment** — an undertaking a party is bound to deliver.

## Obligation depends on the instrument

Column 6 combines the **instrument type** (regulations, directives and
decisions bind; communications and strategies are soft law) with the
**modal language** of the provision ("shall" → mandatory, "should" /
"may" / "aim to" → voluntary). Soft-law rows are **always voluntary** —
even when the quoted passage contains "shall", it is quoting or proposing
binding text that lives elsewhere — and best-efforts constructions
("shall endeavour / aim / strive") count as voluntary in binding acts too.

## Code surface

| Path | Role |
|------|------|
| `beta/modules/policy-targets/page.tsx` | Table UI, filters, Excel/CSV export, confirm workflow. |
| `src/app/beta/policy-targets/page.tsx` | Route re-export. |
| `src/data/policy-targets.ts` | Types, display metadata, shared column config, stats. |
| `src/data/policy-targets.generated.ts` | Generated dataset (verbatim rows). |
| `src/lib/useTargetConfirmations.ts` | Per-user human-confirm state (localStorage). |
| `scripts/extract-policy-targets.mjs` | Regex safety-net. |
| `scripts/build-policy-targets.mjs` | Merge, verbatim validation, classification, overrides. |
| `scripts/policy-targets-input/*.json` | Committed extraction input (agents + regex). |
| `scripts/policy-targets-overrides.json` | Verified corrections from the fact-check pass (with reasons). |

## Caveats

- The register mirrors **whatever version of each act is in the corpus**.
  RED was updated (2026-07) to the current EUR-Lex consolidated text
  (02018L2001 — EN — 16.07.2024, reflecting Directive (EU) 2023/2413 "RED
  III" and the later 2024 amendments), so its rows now carry the amended
  figures (42.5 %/45 % 2030 target, 29 %/14.5 % transport target, the new
  49 % buildings and 42 %/60 % industry-hydrogen targets, etc.) rather than
  the original 2018 ones. The EU ETS file remains pre-consolidation
  (original 2003/87/EC) — its figures are the ones in force in that text,
  not the latest amendment.
- Extraction favours recall — **always confirm a row against the source**
  before citing it. That is exactly what column 12 is for.
