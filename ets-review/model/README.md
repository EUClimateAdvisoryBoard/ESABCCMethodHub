# Electrification least-cost model

A small, transparent least-cost model that answers the ETS Review's cost
question: **what carbon price is needed to reach a given EU electrification rate
in 2040, with and without demand-side measures?** It is the quantitative engine
behind [`../electrification-46-percent.md`](../electrification-46-percent.md) §4–5.

Two front-ends, one model:

| File | Use |
|------|-----|
| [`electrification_lcm.py`](electrification_lcm.py) | Reference model + CLI. Dependency-free (Python 3.8+ stdlib). Reproducible, scriptable, the source of truth. |
| [`explorer.html`](explorer.html) | Interactive slider tool — the same equations in JavaScript. Open it in any browser, or use the hosted [Artifact](https://claude.ai/code/artifact/1a6a35d5-fc56-40e0-9a1d-6734a32dbfab). |

The JS and Python implementations are kept in exact parity (default run:
**€166/t price-only, €55/t with measures, €111/t gap**).

## What the model does

Final energy demand in the three electrifiable end-use sectors — **buildings
heat, road transport, industry heat** — is split into adoption *tranches*
ordered by their barrier-adjusted marginal abatement cost. Each sector has a
rising switching-cost curve

```
switch_cost(f) = base + spread · f^gamma        (f = cumulative adoption 0..1)
```

where `base` is the low-barrier entry cost (operating-economics driven), `spread`
is the barrier spread to the hard tail (split incentives, capital constraints,
hassle/search costs), and `gamma` sets the convexity of that tail. For a uniform
carbon price `P` (a collapsed ETS1+ETS2), the model electrifies **every tranche
whose switching cost is ≤ P**. The electrification rate is then

```
R(P) = baseline_rate + Σ  size_i   over tranches with switch_cost_i ≤ P
```

Sweeping `P` traces the supply curve `R(P)`; the reported price is the lowest `P`
that reaches the target rate.

### Why this is a least-cost optimum, not a heuristic

The tranches are independent and each tranche's cost is linear in the carbon
price, so the whole problem is the separable mixed-integer program

```
min  Σ_i  x_i · ( annualised_electric_cost_i − fossil_cost_i
                  + barrier_i − P · abatement_i )
s.t. x_i ∈ {0,1}
```

whose optimum is exactly *"adopt tranche i iff its switching cost ≤ P"* — the
merit-order (marginal-abatement-cost) solution. Computing the argmin per tranche
*is* solving the LP; no external solver is needed.

### The demand-side package

The "with measures" curve applies two levers, both exposed as sliders:

- **Barrier removal** — per-sector `measure_strength` shrinks that sector's
  `spread` (regulation, standards, subsidies remove the non-price barrier the
  carbon price can't reach). Defaults: buildings 65%, transport 70%, industry 55%.
- **Electricity-price reform** — `elec_price_reform_eur_t` shifts *every*
  tranche's `base` down (improving the electricity-to-gas running-cost ratio
  helps operating economics everywhere). Default 28 €/t-equivalent.

The horizontal gap between the two curves at the target is the **shadow value of
demand-side policy**.

## Calibration

Barrier-cost distributions are calibrated so the default run reproduces the ETS
Review note and sits inside the published literature:

- price-only ~€166/t (Ariadne/PIK put price-only for the ESR/ETS2 sectors at
  175–350 €/t; Günther/Pahle 2025 at 71–261 €/t);
- with-measures ~€55/t;
- ~1,620 TWh new electricity and ~870 Mt CO₂/yr abated at the 46% target;
- sector switching-cost tails (~360 buildings, ~250 transport, ~300 industry
  €/t) aligned with the same literature and this repo's `pypsa-service` sector
  MAC midpoints (Power 45, Buildings 110, Road transport 140, Industry 80/180).

## What it is *not*

Not PyPSA-Eur, not an integrated assessment model, no hourly dispatch (so no
heat-pump peak-load feedback onto power prices — a real omission that would raise
both curves somewhat), and it collapses ETS1 and ETS2 into one uniform price.
Barrier-cost distributions are a calibration to the hidden-cost literature, not
estimated. **Treat the gap between the two curves and their ordering
(price-only ≫ €45 trigger ≫ price-with-measures) as robust; treat absolute price
levels as indicative.** For a full power-system solve, see the repo's
[`pypsa-service/`](../../pypsa-service/), which runs real PyPSA against
PyPSA-Eur `technology-data`.

## Running it

```bash
python3 electrification_lcm.py                 # headline result + curves
python3 electrification_lcm.py --target 50     # a 50% target instead of 46%
python3 electrification_lcm.py --barrier-mult 1.25   # +25% barrier costs
python3 electrification_lcm.py --sensitivity   # barrier-cost tornado band
python3 electrification_lcm.py --json          # machine-readable output
```

Open `explorer.html` directly in a browser for the slider version — no build
step, no dependencies, works offline.
