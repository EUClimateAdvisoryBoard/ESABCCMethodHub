# Run the open TIMES demo model (demo12) with TIMES.jl and extract a compact result set for the
# beta module M · 56 (beta/modules/times-jl/).
#
# TIMES.jl (esma-ie/TIMESjl, GPL-3.0) is an independent Julia/JuMP translation of the IEA-ETSAP
# TIMES model generator. It reads a TIMES model from its .run and DD files, preprocesses it,
# builds the LP and solves it with HiGHS, without GAMS. This script only calls its public
# `run_model` entry point and then reads the solution dump it writes (one Arrow file per
# variable and equation family). It does not modify the model.
#
# Usage (from the repository root; Julia 1.11 or later):
#
#   julia --project=scripts/times-jl -e 'using Pkg; Pkg.instantiate()'
#   julia --project=scripts/times-jl scripts/times-jl/run-demo12.jl
#
# Options (environment variables):
#   TIMESJL_DEMO_RUN  path to demo12.run (default: TIMES.times_demo_dir(), the pinned
#                     etsap-TIMES/TIMES_Demo @ 962db86 artifact TIMES.jl downloads itself)
#   TIMESJL_TIMES_SOURCE  local clone of etsap-TIMES/TIMES_model @ d9a6a25 (read by TIMES.jl;
#                     needed where github.com archive downloads are blocked)
#   TIMESJL_OUT       working folder for the run (default: a temporary folder)
#   TIMESJL_JSON      output JSON (default: public/data/times-jl/demo12-results.json)
#
# The output JSON holds only values read from the solver's solution, plus run metadata. Nothing
# is estimated or filled in: a series missing from the solution is written as missing and the
# script says so on stderr.

using TIMES, Arrow, JSON, Dates, Pkg

const GAMS_REFERENCE_OBJECTIVE = 23960685.737007827   # TIMES.jl README, Quick start: GAMS/CPLEX reference run of demo12
const GAMS_REFERENCE_SOURCE = "TIMES.jl README, 'Quick start' section (GAMS reference run of demo12 with CPLEX)"

runfile = get(ENV, "TIMESJL_DEMO_RUN", joinpath(TIMES.times_demo_dir(), "demo12.run"))
outdir = get(ENV, "TIMESJL_OUT", mktempdir())
jsonpath = get(ENV, "TIMESJL_JSON", joinpath(@__DIR__, "..", "..", "public", "data", "times-jl", "demo12-results.json"))

isfile(runfile) || error("demo12.run not found at $runfile")

# ---------------------------------------------------------------- run, capturing the step log
logbuf = IOBuffer()
t_total = @elapsed begin
    global r = redirect_stdout_tee(logbuf) do
        run_model(runfile; out=outdir, threads=parse(Int, get(ENV, "TIMESJL_THREADS", "4")))
    end
end
