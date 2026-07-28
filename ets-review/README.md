# ETS Review — submodule

Working analysis space for the Secretariat's read of the latest **EU ETS
review package** and the accompanying **Electrification Action Plan**. It sits
next to `esabcc-reports/` as a research folder (not a software module).

## Contents

| File | What it covers |
|------|----------------|
| [`electrification-46-percent.md`](electrification-46-percent.md) | The core analysis: what the 46% electrification target measures, how much of final demand can physically be electrified, whether 46% is high or low for a 2040 pathway, what it costs to get there with and without demand-side measures, and which demand-side measures do the work. |
| [`model/`](model/) | A least-cost model of the cost question — a reproducible Python reference model (`electrification_lcm.py`) and an interactive slider tool (`explorer.html`) to play with the assumptions. See [`model/README.md`](model/README.md). |

## App module M·37 — three submodules

The 17 July 2026 package has two halves, so beta module **M·37** ([`/beta/ets-review`](../src/app/beta/ets-review/page.tsx)) is a **hub** with three submodules:

| Submodule | Route / source | What it is |
|-----------|----------------|------------|
| **Electrification** | [`/beta/ets-review/electrification`](../src/app/beta/ets-review/electrification/page.tsx) · [`beta/modules/ets-review/electrification/page.tsx`](../beta/modules/ets-review/electrification/page.tsx) | The interactive least-cost model (native React port of `model/electrification_lcm.py`, exact parity) — the carbon price to reach a 2040 electrification rate, price-only vs with demand-side measures. |
| **ETS reform** | [`/beta/ets-review/reform`](../src/app/beta/ets-review/reform/page.tsx) · [`beta/modules/ets-review/reform/page.tsx`](../beta/modules/ets-review/reform/page.tsx) | An overview of the most important proposed changes, **each linked to where it is stated in the Commission's communication of the proposal** (press release IP/26/1596, Q&A, ETS Directive proposal COM(2026) 616), plus the cap-trajectory and removals-cost numbers from **SWD(2026) 616** and a filterable **uncertainty & ambiguity register**. |
| **Advice conflicts** | [`/beta/ets-review/conflicts`](../src/app/beta/ets-review/conflicts/page.tsx) · [`beta/modules/ets-review/conflicts/`](../beta/modules/ets-review/conflicts/) | The package compared against the ESABCC's published advice **across all of its reports**, with every place they do not align classified (contradiction / tension / ambition gap) and **ranked by a transparent four-axis severity score**; genuine alignments are recorded alongside so the read stays even-handed. |

## Interactive model

The carbon price needed to reach 46% electrification — price-only versus with a
demand-side package — is a least-cost model you can drive yourself:

- **In the app:** beta module **M·37 — ETS Review** at [`/beta/ets-review`](../src/app/beta/ets-review/page.tsx) (source: [`beta/modules/ets-review/page.tsx`](../beta/modules/ets-review/page.tsx)). Native React port of the model, in exact numerical parity.
- **Standalone / offline:** open [`model/explorer.html`](model/explorer.html), or the hosted [explorer artifact](https://claude.ai/code/artifact/1a6a35d5-fc56-40e0-9a1d-6734a32dbfab).
- **Reproduce / script it:** `python3 model/electrification_lcm.py` (default run: ~€166/t price-only, ~€55/t with measures, €111/t gap).

## The four questions this submodule answers

1. **Cost** — how expensive is 46% electrification of final demand **without**
   demand-side measures versus **with** them?
2. **Measures** — what would those demand-side measures actually be?
3. **Feasibility** — how much of final demand can even be electrified, and is
   46% *direct* electrification only or does it include *indirect*
   electrification via hydrogen/e-fuels?
4. **Benchmark** — against the modelling for a 2040 (–90%) pathway, is 46%
   high or low?

## Primary anchor

The Board's own indicator **E5 — electrification rate (share of electricity in
final energy use)** — from *Towards EU climate neutrality* and the *2040 climate
target advice* is the reference series used throughout. See the analysis for the
full table and sources.
