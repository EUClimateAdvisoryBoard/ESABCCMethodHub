# scripts/times-jl/

The run and extraction script behind beta module
[M·56 TIMES.jl Demo Runner](../../beta/modules/times-jl/page.tsx)
(docs: [`docs/modules/times-jl.md`](../../docs/modules/times-jl.md)).

[TIMES.jl](https://github.com/esma-ie/TIMESjl) (ESMA Ltd, GPL-3.0) is an
independent Julia/JuMP translation of the IEA-ETSAP TIMES model generator. It
reads a TIMES model from its `.run` and DD files, preprocesses it, builds the
linear programme and solves it with the open-source solver HiGHS, without GAMS.
It is pre-release software (Phase 1) and is not an IEA-ETSAP product.

| File | Purpose |
| --- | --- |
| [`Project.toml`](Project.toml) | Julia environment. Pins TIMES.jl to commit `4091d41` through `[sources]`, which needs Julia 1.11 or later. |
| [`run-demo12.jl`](run-demo12.jl) | Runs the open TIMES_Demo demo12 model with `TIMES.run_model` and reads the solution dump. Writes [`public/data/times-jl/demo12-results.json`](../../public/data/times-jl/demo12-results.json). |

## Run

```bash
julia --project=scripts/times-jl -e 'using Pkg; Pkg.instantiate()'
julia --project=scripts/times-jl scripts/times-jl/run-demo12.jl
```

The first run takes about four minutes on four cores, almost all of it Julia
compiling TIMES.jl. Every value in the JSON is read from the solver's solution:
nothing is estimated. A missing result family stops the script with an error
rather than being written as zero.

## What is extracted

| JSON key | Read from | Unit |
| --- | --- | --- |
| `generation_by_fuel` | `VAR_ACT` of the power plants (`ELC*`), summed over vintages and timeslices; the fuel is the plant's input commodity in `TOP` | PJ |
| `new_capacity_by_fuel` | `VAR_NCAP` of the power plants | GW (every plant has `PRC_CAPACT` = 31.536 PJ per GW-year) |
| `co2_by_sector` | `VAR_COMNET` of the sectoral CO₂ commodities. The script checks that each one has an equality balance row (`EQE_COMBAL`), so the level is the net emission | kt CO₂ |
| `objective_components` | `VAR_OBJ` (INV, FIX, VAR, SAL) | MEuro05, discounted |
| `parity` | the run's objective and the GAMS/CPLEX reference quoted in the TIMES.jl README | — |

## Behind a TLS-intercepting proxy (e.g. the Claude Code cloud sandbox)

Two workarounds were needed on 2026-11-24:

- **Julia's package downloads hang silently**, rather than fail, until
  `JULIA_SSL_CA_ROOTS_PATH` points at the proxy's CA bundle.
- **github.com archive downloads were refused, but `git clone` worked.**
  `Pkg.add(url=…)` and TIMES.jl's own artifact downloads (the TIMES source and
  the demo models) therefore failed. The run used clones at the pinned commits:

  ```bash
  git clone https://github.com/esma-ie/TIMESjl                 # then Pkg.develop(path="TIMESjl")
  git clone https://github.com/etsap-TIMES/TIMES_model && git -C TIMES_model checkout d9a6a25
  git clone https://github.com/etsap-TIMES/TIMES_Demo  && git -C TIMES_Demo  checkout 962db86
  export TIMESJL_TIMES_SOURCE=$PWD/TIMES_model
  export TIMESJL_DEMO_RUN=$PWD/TIMES_Demo/model/demo12.run
  ```
