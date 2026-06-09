# Advanced version 4 — the monitoring-map flow chart (and why it beats the sectoral view)

This note documents **"Advanced version 4"**, the sector-free *monitoring-map*
board in the Indicator module's *Flow charts* view. It sits alongside the
report-faithful default, the enhanced and beta boards, Advanced version 1
(high-data-quality, per-sector), Advanced version 2 (the six-rung M&E results
chain) and Advanced version 3 (the integrated per-sector board).

Where every other board is organised **down a sector** (Energy, Industry,
Transport, Buildings, Agriculture, LULUCF), version 4 throws the sector axis away
entirely and folds the *whole* catalogue into **four thematic layers**:

1. **Enablers & inputs** — finance, carbon pricing, laws, R&D, skills, adopted strategies & plans.
2. **Delivery on the ground** — capacity installed, assets built, measures rolled out.
3. **Outcomes** — shares, rates, intensities, and ultimately realised emissions & removals.
4. **Risk, harm & climate signal** — the hazard signal we operate in and the realised loss the system exists to reduce.

Each indicator is placed by **what kind of signal it is**, not which sector it
belongs to. Every layer carries **both pillars of equal weight** — mitigation and
adaptation & resilience — so the board has one overarching goal (a
climate-neutral *and* climate-resilient EU by 2050) and two equal branches.

## The point: it is a *diagnostic* causal pipeline, not an org chart

The four layers are meant to be read **left-to-right as a causal chain**: did we
set the conditions → did delivery follow → did the outcomes move → is the harm
actually falling? Read this way the board is diagnostic — a stall shows up as a
**break in the pipeline**:

- enablers green but **delivery flat** → an implementation gap;
- delivery up but **outcomes flat** → effort isn't yet bending the numbers;
- outcomes improving but **risk still climbing** → the locked-in warming is
  outrunning mitigation, and the answer is more adaptation.

A healthy system shows movement propagating left→right; the layer where it dies
is where to look. The sectoral view **structurally cannot** show this, because
each sector column silently mixes all four stages together.

## Why this beats the sectoral view (the rationale we surface in the UI)

The sectoral view mirrors how policy is owned and how the report is written — the
right lens for a *sector lead* who owns one column. But for judging progress **as
a system** it has three structural weaknesses, and the monitoring map fixes each:

| The sectoral view | This monitoring map |
|---|---|
| **Hides where progress stalls** — finance, built capacity, shares and realised emissions are mixed inside each column, so you can't see if the blockage is upstream or downstream. | **Reads the causal chain** — a stall is a visible break in the enabler → delivery → outcome → risk pipeline. |
| **No home for cross-cutting signals** — carbon price, finance, R&D and almost all of adaptation risk (heat mortality, wildfire, drought, sea level, flood damage, insurance gap) belong to no single sector, so they get scattered or dropped. | **One home per signal type** — finance/price/law live together in Enablers; the hazard signal and realised harm live together in Risk, whatever sector they touch. |
| **Adaptation is an afterthought** — the columns are built around emissions; risk & resilience are bolted on. | **Adaptation is a full, equal pillar** in every layer, and every chip in a layer is the *same kind of signal*, so you weigh like with like. |

The two are **complements, not rivals**: the sectoral view stays the default
owner's board; version 4 is the board-level *"are we on track, and where is it
stuck?"* view.

## Where it lives in the code

| Concern | Location |
|---|---|
| Board factory & layer model | `src/data/monitoring-map-v4.ts` (`defaultMonitoringMapBoardV4`, `LAYER_META`, `layerForItem`) |
| Source catalogue | derived from `defaultResultsChainBoardV2()` in `src/data/results-chain-v2.ts` (no ids re-listed by hand) |
| Version registration | `src/lib/project-workspace/flowchart-versions.ts` (built-in id `advanced-v4`, variant `advanced-v4`) |
| View / rationale UI | `src/components/frameworks/MonitoringMapBoardView.tsx` |
| Rendering | reuses `ResultsChainFlow` (numbered layers, each split into a mitigation and an adaptation pillar) |

## How it is derived (staying in lock-step with the catalogue)

To avoid hand-maintaining ~100 indicator ids, the board is **computed** from the
Advanced-version-2 results chain: each of its six M&E rungs maps onto one of the
four layers, preserving the mitigation/adaptation pillar and the `policy` flag.

```
Input + Process        → Enablers & inputs
Output                 → Delivery on the ground
Outcome                → Outcomes
Impact (mitigation)    → Outcomes              (realised emissions & removals)
Impact (adaptation)    → Risk, harm & signal   (realised loss & harm)
Context                → Risk, harm & signal   (the climate signal)
```

The "Impact" split is the one deliberate judgement call: realised emissions and
removals are the **outcome** the mitigation pipeline bends, whereas realised
loss, mortality and damages are the **risk** the adaptation pillar exists to
reduce — so the same M&E rung lands in two different monitoring-map layers
depending on its pillar.

As in version 2, the adaptation pillar leans on **policy-process indicators** in
the early layers, where (unlike mitigation) action is still mostly about building
governance and process rather than moving physical numbers.

## Provenance

The layered "enabler → delivery → outcome → risk" reading is *inspired by* the
monitoring-map approach national climate advisory bodies use to judge progress.
It is an **original synthesis, not a reproduction** of any one body's framework:
the layer names, descriptions and indicator placement are our own, and every chip
links only to indicators already curated in this platform.
