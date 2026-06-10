# Advanced version 7 — the structured assessment matrix (the methodology board)

This note documents **"Advanced version 7"**, the methodology board in the
Indicator module's *Flow charts* view. It sits alongside the report-faithful
default, the enhanced and beta boards, and Advanced versions 1–6.

Where versions 1–6 each proposed a *geometry* — richer sector chains (1, 3),
the M&E results chain (2, 5), the sector-free monitoring map (4), the adaptive
policy loop (6) — version 7 is the synthesis: it fixes the **key structural
distinctions** a monitoring-and-progress scientific report must keep apart,
and publishes the **assessment protocol** that turns each cell of the
structure into a finding. It is the board you would hand to someone writing
the report's method chapter.

## The five structural dimensions

The board encodes five dimensions, each with a different structure *because
each thing is structured differently in reality*:

| Dim | What | Structure | Why its own dimension |
|---|---|---|---|
| **A** | Mitigation pillar | the six **emission sectors** — Energy, Industry, Buildings, Transport, Agriculture, LULUCF | emissions are organised by *source*; this mirrors the inventory, the ESR/ETS scopes and the report's chapters |
| **B** | Adaptation pillar | thirteen **adaptation areas** (after the UK CCC's monitoring framework) — Nature; Working lands and seas; Food security; Water supply; Energy; Telecoms and ICT; Transport; Towns and cities; Buildings; Health; Community preparedness and response; Business; Finance | climate risk is organised by *what is exposed*; health, water, nature and telecoms have no emission sector to live in |
| **C** | Main policies | seven instrument families — ETS1 + CBAM, ETS2, Effort Sharing Regulation, LULUCF Regulation, CAP, EU Taxonomy, Governance Regulation + European Climate Law | one law spans several sectors; mapping policies *onto* sectors (as earlier versions did) duplicates them, a policy layer doesn't |
| **D** | Crosscutting themes | electrification, lifestyle changes (demand/culture), funding & finance, infrastructure, innovation, CDR, labour & skills | these cut across both pillars; their overlaps with sectors/areas/lenses are **stated on each row** rather than hidden |
| **E** | Societal objectives | six objectives *other than climate mitigation* — cost effectiveness, competitiveness, resilience (adaptation), autonomy, just transition (whole-of-society), environment/biodiversity | they are **lenses applied to every chapter**, not chapters: a sector can be on track for emissions and failing fairness, and the report says both |

Three structural rules follow:

1. **Equal pillars, different skeletons.** Mitigation and adaptation carry equal
   weight (as in versions 1, 3, 6), but each keeps the structure native to it —
   sectors for emissions, exposed systems for risk. Cross-pillar dependencies
   are drawn where they bite (the LULUCF sink assumes forest resilience; the
   building stock is renovated and made heat-safe in one investment).
2. **Reading inside a cell is inherited from the earlier versions.** Each
   mitigation sector reads *corridor → drivers → observed* (from the version-6
   loop's stations 1/3/4); each adaptation area reads *risk ↔ action*; pace —
   not position — is scored (from the version-2 chain).
3. **Absence is a finding.** An empty lane renders as a stated monitoring gap
   with a named ask (from versions 4–6). The board currently states gaps for
   most adaptation areas, labour & skills, and sub-national just-transition
   data — plus a red "no main policy reaches this cell" tag where the policy
   layer leaves a cell unsteered (e.g. Telecoms and ICT).

## The assessment protocol (the method made explicit)

Eight numbered steps, each with a declared output, shipped on the board itself
(`ASSESSMENT_PROTOCOL`):

1. **Fix the structure** → the report skeleton, identical every cycle.
2. **Select indicators against published criteria** (causal relevance, EU-27
   coverage, authoritative source, longest series) → a criteria table; rejects
   listed with the failed criterion.
3. **Derive the benchmark** (Climate Law / Fit-for-55 MIX corridors for
   mitigation; risk-trend direction for adaptation) → a cited benchmark per cell.
4. **Score pace, not position** → on track · too slow · off track · insufficient data.
5. **Attribute the policy signal** → a policy-coverage map; uncovered cells and
   misaligned milestones listed.
6. **Apply the societal-objective lenses** → a lens verdict per chapter.
7. **State gaps and uncertainty as findings** → the monitoring-gap register.
8. **Close the loop with the governance cycle** (NECPs, the Climate Law
   stocktake, ETS/CAP reviews) → a versioned method annex.

Steps 2–7 re-run every edition; step 1 changes only at a full method review —
that is what makes successive report editions comparable.

## Where it lives in the code

| Concern | Location |
|---|---|
| Board factory, dimension models, protocol | `src/data/assessment-matrix-v7.ts` (`defaultAssessmentMatrixBoardV7`, `ASSESSMENT_PROTOCOL`) |
| Source registries | `FRAMEWORK_INDICATOR_INDEX` (indicator chips), `SECTOR_POLICIES` (laws + milestones), `POLICY_GAP_INDICATORS` (benchmark corridors) — nothing is re-listed by hand |
| Version registration | `src/lib/project-workspace/flowchart-versions.ts` (built-in id `advanced-v7`, variant `advanced-v7`) |
| View / rationale / protocol UI | `src/components/frameworks/AssessmentMatrixBoardView.tsx` |
| Rendering (the five lettered blocks) | `src/components/frameworks/AssessmentMatrixFlow.tsx` |

Like versions 2/4/5/6 it is a **computed, read-only analytical view**: every
chip resolves at build time against the platform's existing registries, so the
matrix cannot drift from the underlying data; indicator chips open the shared
data drawer and policy chips deep-link into the Policy Navigator.

## Provenance

The thirteen adaptation areas follow the UK Climate Change Committee's
adaptation monitoring framework (as the source slide notes, "from UK CCC");
the emission sectors, policy families, themes and objectives follow the
ESABCC report's own structure. The synthesis — the five-dimension matrix, the
lens treatment of societal objectives and the eight-step protocol — is an
**original method design, not a reproduction** of any one body's framework,
and every chip links only to indicators already curated in this platform.
