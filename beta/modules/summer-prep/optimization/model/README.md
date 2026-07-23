# EU Industry Decarbonization — Least-Cost Optimization (working prototype)

A small, single-file [SEAMAPS](https://github.com/SebastianFra/SEAMAPS)-style least-cost
optimization model of EU-27 energy-intensive industry (steel, cement, high-value chemicals,
ammonia, aluminium, glass, paper), built for the ESABCC Method Hub's "Summer Prep" exploration.

It answers one question: *if these 7 subsectors had to meet their projected 2025-2050 production
demand at least cost, which technologies would a cost-minimiser invest in each period, and how
much direct CO2 would that pathway emit?* It is a normative planning model, not a forecast.

**This is a working prototype, not a validated policy tool and not a Board position.** Technology
costs, energy intensities and constraint ceilings are literature-derived central estimates (see
`data/sources.csv` for the provenance of every number), assembled for illustrative,
order-of-magnitude sensitivity testing — not for investment decisions. Treat all results as
directional.

## How to run

Requires Julia 1.11. All dependencies (JuMP, HiGHS, CSV, DataFrames, JSON) are pinned in
`Project.toml`.

```bash
cd beta/modules/summer-prep/optimization/model
julia --project=. -e 'import Pkg; Pkg.instantiate()'   # first time only: installs dependencies
julia --project=. industry_optimization.jl
```

The script prints a one-line progress summary per scenario (objective value and 2040 direct CO2)
as it solves, then writes its outputs to `results/`.

## Inputs (`data/*.csv`)

| File | Contents |
|---|---|
| `sectors.csv` | The 7 subsectors: 2023 production, 2023 direct CO2, sources |
| `demand.csv` | Central production demand path per subsector, 2025-2050 |
| `technologies.csv` | Per-technology capex, OPEX, lifetime, availability, build-rate cap, CCS capture rate, process CO2 |
| `energy_use.csv` | Specific energy use (GJ/t) by technology and carrier |
| `fuel_prices.csv` | Fuel/electricity/hydrogen prices (EUR/GJ) by year |
| `carbon_price.csv` | EU ETS carbon price path — low/central/high columns |
| `emission_factors.csv` | Combustion emission factors (tCO2/GJ); electricity factor varies by year (grid mix) |
| `constraints.csv` | Scrap availability, biomass ceiling, CO2 capture & storage ceiling |
| `scenarios.csv` | Sensitivity scenario definitions (scenario, description, param, factor) |
| `sources.csv` | Source citation for every non-trivial number used above |

The model reads these once at "central" values and asserts every file and every required column
is present before building anything, so a missing or misnamed input fails fast with a clear
message rather than a cryptic error deep inside the solve.

## Outputs (`results/`)

- `results_<scenario>.csv` — one row per (subsector, technology, year) with columns:
  `subsector, tech, year, production_mt, capacity_mt, new_build_mt, direct_co2_mt,
  indirect_co2_mt, cost_meur`
- `results_summary.json` — `{ "scenarios": { "<id>": { total_discounted_cost_beur, co2_2030_mt,
  co2_2040_mt, co2_2050_mt, total_direct_co2_by_year, by_subsector: { "<s>": { co2_2050_mt,
  dominant_tech_2040, tech_shares } } } } }`

Direct (scope-1) and indirect (purchased-electricity) CO2 are reported separately: the carbon
price is applied only to direct emissions (EU ETS scope), since the carbon cost embedded in
electricity is already inside the electricity price used for the energy-cost term.

## Scenarios solved

Every scenario is a full independent re-solve of the joint LP, driven entirely by
`data/scenarios.csv` (the model does not hardcode this list — it will solve whatever scenarios
the CSV defines, always including an unmodified `central` run):

- `central` — everything at central values
- `co2_low` / `co2_high` — switch to the carbon price's low/high column
- `capex_low` / `capex_high` — clean-tech capex x0.7 / x1.3 (incumbent technologies excluded)
- `demand_low` / `demand_high` — demand x0.8 / x1.1
- `elec_cheap` / `elec_exp` — electricity price x0.7 / x1.3
- `h2_cheap` / `h2_exp` — hydrogen price x0.6 / x1.4
- `eff_gain` — clean-tech energy intensity x0.9
- `slow_build` — max build-rate share x0.5 (deployment bottleneck)

## Model formulation, in brief

One joint linear program covers all 7 subsectors and their candidate technologies together for
2025-2050 (5-year steps), because they compete for the same shared biomass and CO2
capture/storage ceilings. Per technology-year: new build (B), installed capacity (K) and
production (Q) are chosen so that demand is met exactly, capacity is never exceeded, builds
respect commercial-availability and build-rate limits, scrap-based routes respect scrap
availability, and total biomass use / total captured CO2 stay under their economy-wide ceilings.
2025 incumbent capacity retires linearly to zero by 2045, forcing reinvestment. The objective
minimises the discounted sum of annualised capex (CRF at 7%), fixed & variable OPEX, energy cost
and carbon cost (on direct emissions only), discounted at 7% from a 2025 base year.

See the heavily-commented header and section banners in `industry_optimization.jl` for the full
plain-language explanation of every constraint.
