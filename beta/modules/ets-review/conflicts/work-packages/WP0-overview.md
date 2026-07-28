# WP0 — Advice conflicts submodule: mission, architecture, conventions

*Beta module M·37 (ETS Review), third submodule. Route: `/beta/ets-review/conflicts`.*
*Design: Claude (Fable), 2026-07-28. Implementation: WP1–WP4 by Sonnet agents; WP5 verification by Fable.*

## Mission

Compare the Commission's **17 July 2026 package** — the **ETS review** (Directive
proposal COM(2026) 616 with its full impact assessment SWD(2026) 616, 5 parts /
958 pp incl. all annexes) and the **Electrification Action Plan** (COM(2026)
595) — against the **ESABCC's published advice across all of its reports**.
Identify every place where the package **does not align** with the advice, rank
those conflicts by the **severity of the conflict itself**, and present the
result as a submodule of beta module M·37 in the style of the existing
Digital-Energy-Roadmap coherence check.

## Source inventory

**Side A — ESABCC advice** (all reports, downloaded in `esabcc-reports/`; text
pre-extracted with page markers to
`/tmp/claude-0/-home-user-ESABCCMethodHub/30ae822b-238f-5e81-821c-e3bbd57cdf28/scratchpad/esabcc-text/*.txt`,
`===== PAGE n =====` delimiters):

| Report id (= key in `RECOMMENDATION_REPORTS`) | PDF (pages) |
|---|---|
| `2040-target-advice-2023` | scientific-advice-…-2040-climate-target… (110) |
| `towards-eu-climate-neutrality-2024` | esabcc_report_towards-eu-climate-neutrality (360) — plus `esabcc-reports/2024-01-18-towards-eu-climate-neutrality-tracker-source.md` |
| `climate-targets-2023` | setting-climate-targets-based-on (4) |
| `climate-law-amendment-2025` | 20250602_european-climate-law_advice (61) |
| `carbon-removals-2025` | 2025-02-21-scaling-up-carbon-dioxide-removals… (333) |
| `energy-crisis-2023` | 2023-02-07-recommendationspolicyresponses… (49) |
| `acer-energy-infrastructure-2022` | 20221114-lettertoacer (2) |
| `scenario-guidelines-2022` | 2022-11-14-adviceontene_scenarioguidelines (27) |
| `decarbonised-energy-infrastructure-2023` | 2023-03-15-towards-a-decarbonised… (35) |
| `ten-e-draft-scenarios-2024` | 20240627advice-on-draft-scenarios… (34) |
| `adaptation-2026` | 20260217_adaptation-report (169) |
| `agri-food-2026` | 2026-03-1120260311_eu-agri-food-system-report (359) + technical annex (41) |

Plus the structured registry `src/data/esabcc-recommendations.ts` (176
recommendation ids across all reports) — every `AdvicePosition.recIds` entry
must resolve there.

**Side B — the package** (originals not stored in-repo; use the repo's
existing verbatim-quoted extractions, each of which carries document + page
locators):

- `beta/modules/ets-review/reform/page.tsx` — the proposed changes register
  (10 `PROPOSED_CHANGES`), the numbers (cap/LRF, 250 Mt removals, ~260 Mt
  credits, IDB), the 23-entry uncertainty & ambiguity register with `src`
  locators into SWD parts/annexes.
- `beta/modules/impact-assessment/data.ts` — `IA_FINDINGS` from all 5 SWD
  parts with quotes, `pdfPages`, figure/table refs.
- `ets-review/electrification-46-percent.md` — the Electrification Action Plan
  analysis (46% target definition, benchmark vs Board scenarios, cost with/
  without demand-side measures, the four measure families, COM(2026) 595/600).
- `ets-review/README.md`, `beta/modules/ets-review/page.tsx` (hub stats),
  `beta/modules/ets-review/electrification/page.tsx` (model constants).

## File map (all new files under `beta/modules/ets-review/conflicts/`)

| File | WP | Content |
|---|---|---|
| `types.ts` | WP0 (done) | Data model, doc registries, severity rubric + `severityScore`/`severityTier` |
| `advice-core.ts` | WP1a | `ADVICE_CORE: AdvicePosition[]` — targets/budget/climate-law core |
| `advice-wider.ts` | WP1b | `ADVICE_WIDER: AdvicePosition[]` — CDR, energy crisis, infrastructure, adaptation, agri-food |
| `package-positions.ts` | WP2 | `PACKAGE_POSITIONS: PackagePosition[]` |
| `conflicts.ts` | WP3 | `CONFLICTS: ConflictFinding[]` (ranked accessor helpers included) |
| `page.tsx` | WP4 | The submodule UI |
| `src/app/beta/ets-review/conflicts/page.tsx` | WP4 | Route re-export |

Pipeline: **WP1a ∥ WP1b ∥ WP2 → WP3 → WP4 → WP5 (verify/commit)**.

## Conventions (binding for every WP)

1. **No invented numbers or quotes.** Every quote must be traceable: side A to
   a page of the extracted report text; side B to an in-repo extraction that
   itself carries a document locator. If you cannot find support, drop the
   entry — coverage gaps are acceptable, fabrication is not.
2. Quotes near-verbatim, ≤ ~60 words, ellipses allowed, straight typographic
   style matching the source.
3. Ids: kebab-case with the prefixes `ap-` / `pp-` / `cf-`.
4. Language: plain, complete sentences; British English like the rest of the
   repo ("programme", "modelled").
5. Both sides are steel-manned: the package's own caveats (e.g. the 2033
   review condition) belong in the record, and genuine **alignments must be
   recorded** so the assessment is even-handed.
6. Everything is flagged as *AI-assembled, pending Secretariat verification*
   (file headers + UI caveat box).
7. TypeScript strict; import shared types from `./types` only — do not
   redefine them.

## Severity rubric (summary — canonical definition in `types.ts`)

Four axes, each 0–3 with written anchors: **magnitude** (climate consequence),
**directness** (how head-on the divergence), **bindingness** (how locked-in
the package element), **centrality** (how central the crossed advice).
Weighted score 0–10 (weights 0.35/0.30/0.20/0.15), tiers: ≥7 critical,
≥5 major, ≥3 moderate, else minor. Every finding records a one-sentence
rationale per axis. Alignments are scored too (as strength of alignment) but
ranked separately and excluded from the conflict ranking.

## QA bar (checked in WP5)

- `tsc` clean; every `recIds` entry resolves in `esabcc-recommendations.ts`;
  every `packageIds`/`adviceIds` entry resolves; every conflict has ≥1 id per
  side; spot-check of ≥10 side-A quotes against the PDFs' extracted text.
