# Advanced version 8 — the steering panorama (the headline figure)

This note documents **"Advanced version 8"**, the headline-figure board in the
Indicator module's *Flow charts* view. It sits alongside the report-faithful
default, the enhanced and beta boards, and Advanced versions 1–7.

Where versions 1–7 each answered one question well — how a sector transforms
(1, 3), where an indicator sits in the results chain (2, 5), the whole
monitoring map (4), the closed governance loop (6), the report's method
structure (7) — version 8 answers the question a **report cover figure** must
answer in one glance:

> *Is each sector on track — do its policies explain why — and what does the
> Board therefore recommend?*

## The geometry: three layers, one thread per sector

The figure is a stack of three layers, pierced by one vertical thread per
sector (EU economy-wide, Energy supply, Industry, Transport, Buildings,
Agriculture & food, LULUCF & forests):

| Layer | What | Vocabulary | Source registry |
|---|---|---|---|
| **① Progress** | per-sector pace against the scenario corridor: benchmarks, observed results, delivery drivers, and the gap stated as one finding | pace — on track · mixed · too slow · off track | `POLICY_GAP_INDICATORS` (benchmarks), `FRAMEWORK_INDICATOR_INDEX` (chips) |
| **② Policy** | the EU instruments aiming the sector at the corridor, each with the next milestone that bites — and each scored for whether it *explains* the pace above | contribution — delivering · partial · lagging | `SECTOR_POLICIES` (laws + milestones), deep-linked into the Policy Navigator |
| **③ Recommendations** | the ESABCC's own advice for the sector, each chip naming the gap in ①/② it responds to | uptake — addressed · partially · in progress · not addressed (**resolved live from the tracker seed**) | `ESABCC_2024_RECOMMENDATIONS` |

The design claim — and why it can carry a report — is the **derivation**:
reading any sector top-to-bottom is an argument, not a collage. The measured
gap (①) is explained by the instrument mix (②), and the explanation points at
the advice (③). Each sector chain states that argument in one line (e.g.
agriculture: *"an off-track sector whose main instrument does not steer ⇒ the
advice is structural — objectives, pricing, demand — and none of it is yet
addressed"*). Transport is the demonstration thread: strong standards, late
prices, off-track line, and the demand-side advice not addressed.

## The two coupled representations

1. **The panorama (hero).** A CSS-3D stack of the three layers
   (`perspective` + `rotateX/rotateZ` on one container, so the slabs and the
   per-sector connector threads stay column-aligned), with per-layer depth
   shadows. A toggle flattens it to a print-friendly 2-D figure. Hovering a
   sector dims every other thread; clicking a sector cell opens and scrolls to
   its full chain. All chips on the slabs are compact tags with tooltips
   (benchmark 2030 targets, instrument assessments, recommendation titles +
   status + responds-to).
2. **The seven threads, expanded.** One collapsible chain per sector:
   *Where the sector stands* (pace verdict + gap statement + corridor +
   observed + drivers) ⇒ *What steers it* (instrument cards with contribution
   badge, assessment, next milestone, Policy Navigator link) ⇒ *What the
   Board advises* (recommendation cards with live status and the gap each
   responds to). The chain header carries the derivation tally
   (benchmarks · instrument mix → recommendations).

## What is computed and what is curated

Like versions 2/4/5/6/7 this is a **computed, read-only analytical view**:
every chip resolves at build time against the platform's registries, so the
figure cannot drift from the underlying data — indicator chips open the shared
data drawer, instrument chips deep-link into the Policy Navigator, benchmark
chips carry the Policy Gap targets, and recommendation statuses come straight
from the tracker seed (assessed 2026-06).

The **pace and contribution verdicts are the curated editorial layer** — the
ESABCC 2024 report's own sector findings, written into the sector specs in
`headline-figure-v8.ts` with a one-line justification each. They are the one
thing a future edition re-scores by hand (protocol step 4 of version 7);
everything they score is linked, inspectable data.

## Where it lives in the code

| Concern | Location |
|---|---|
| Board factory, layer/verdict models, curated sector specs | `src/data/headline-figure-v8.ts` (`defaultHeadlineFigureBoardV8`, `PANORAMA_LAYERS`, `PACE_META`, `CONTRIBUTION_META`, `REC_STATUS_META`) |
| Source registries | `POLICY_GAP_INDICATORS`, `SECTOR_POLICIES`, `FRAMEWORK_INDICATOR_INDEX`, `ESABCC_2024_RECOMMENDATIONS` — nothing re-listed by hand |
| View / rationale / legend UI | `src/components/frameworks/HeadlineFigureBoardView.tsx` |
| Rendering (3-D panorama + expandable chains) | `src/components/frameworks/HeadlineFigureFlow.tsx` |
| Version registration | `src/lib/project-workspace/flowchart-versions.ts` (built-in id `advanced-v8`, variant `advanced-v8`) |

## Provenance

The sector set, corridor benchmarks (Climate Law / Fit-for-55 MIX) and policy
registry follow the platform's existing structures (shared with Advanced
version 6); the recommendations and their uptake statuses are the ESABCC's own
(January 2024 report, tracker assessment 2026-06). The synthesis — the
three-layer stack, the contribution scoring of instruments against the pace
verdict, and the per-recommendation "responds to" derivation — is an
**original figure design, not a reproduction** of any published ESABCC figure.
