# Run the open TIMES demo model (demo12) with TIMES.jl and extract a compact result set for the
# beta module M · 56 (beta/modules/times-jl/).
#
# TIMES.jl (esma-ie/TIMESjl, GPL-3.0, ESMA Ltd) is an independent Julia/JuMP translation of the
# IEA-ETSAP TIMES model generator. It reads a TIMES model from its .run and DD files,
# preprocesses it, builds the LP and solves it with HiGHS, without GAMS. This script only calls
# its public `run_model` entry point and then reads the solution dump that `run_model` writes
# (`out/solution/`: one Arrow file per variable and equation family). It does not change the
# model or its data.
#
# Usage (from the repository root; Julia 1.11 or later):
#
#   julia --project=scripts/times-jl -e 'using Pkg; Pkg.instantiate()'
#   julia --project=scripts/times-jl scripts/times-jl/run-demo12.jl
#
# Environment variables (all optional):
#   TIMESJL_DEMO_RUN      path to demo12.run. Default: the pinned etsap-TIMES/TIMES_Demo @ 962db86
#                         artifact that TIMES.jl downloads itself (TIMES.times_demo_dir()).
#   TIMESJL_TIMES_SOURCE  a local clone of etsap-TIMES/TIMES_model @ d9a6a25, read by TIMES.jl
#                         instead of its artifact download (needed where github.com archive
#                         downloads are blocked, as in the Claude Code cloud sandbox).
#   TIMESJL_OUT           working folder for the run. Default: a temporary folder.
#   TIMESJL_REUSE=1       skip the run and only extract from an existing TIMESJL_OUT.
#   TIMESJL_THREADS       HiGHS threads (default 4).
#   TIMESJL_JSON          output path. Default: public/data/times-jl/demo12-results.json.
#   JULIA_SSL_CA_ROOTS_PATH  behind a TLS-intercepting proxy, the proxy's CA bundle; without it
#                         Julia's package downloads hang silently rather than fail.
#
# Every number in the output JSON is read from the solver's solution or from the run itself.
# Nothing is estimated or filled in. A result family missing from the solution stops the script
# with an error rather than being written as zero (CLAUDE.md, rule 6: failure is loud).

using TIMES, Arrow, JSON, Dates, JuMP

# The GAMS reference objective for demo12, as quoted in the TIMES.jl README ("Quick start":
# "objective 23960685.737007827 with CPLEX in the reference run"), at the pinned commit below.
const GAMS_REFERENCE_OBJECTIVE = 23960685.737007827
const GAMS_REFERENCE_ROWS = 3233
const GAMS_REFERENCE_COLS = 4485
const GAMS_REFERENCE_SOURCE = "TIMES.jl README, section 'Quick start', step 3 (rows, columns and the GAMS/CPLEX reference objective for demo12)"

repo_root = normpath(joinpath(@__DIR__, "..", ".."))
runfile = haskey(ENV, "TIMESJL_DEMO_RUN") ? ENV["TIMESJL_DEMO_RUN"] : joinpath(TIMES.times_demo_dir(), "demo12.run")
outdir = abspath(get(ENV, "TIMESJL_OUT", mktempdir()))
jsonpath = get(ENV, "TIMESJL_JSON", joinpath(repo_root, "public", "data", "times-jl", "demo12-results.json"))
reuse = get(ENV, "TIMESJL_REUSE", "0") == "1"
threads = parse(Int, get(ENV, "TIMESJL_THREADS", "4"))

isfile(runfile) || error("demo12.run not found at $runfile")

# ------------------------------------------------------------------------------------------ run
run_info = Dict{String,Any}()
if reuse
    isdir(joinpath(outdir, "solution")) || error("TIMESJL_REUSE=1 but $outdir/solution does not exist")
    run_info["reused_existing_output"] = true
else
    t = @elapsed (r = run_model(runfile; out=outdir, threads=threads))
    r.ok || error("run_model did not solve demo12: status $(r.status), error $(r.error)")
    m = r.model.model
    run_info["reused_existing_output"] = false
    run_info["status"] = string(r.status)
    run_info["termination_status"] = string(r.termination_status)
    run_info["wall_time_s_total_first_run"] = round(t; digits=1)
    run_info["rows"] = JuMP.num_constraints(m; count_variable_in_set_constraints=false)
    run_info["columns"] = JuMP.num_variables(m)
    run_info["threads"] = threads
end

soldir = joinpath(outdir, "solution")
manifest = JSON.parsefile(joinpath(soldir, "manifest.json"))
objective = Float64(manifest["objective"])

function table(name)
    f = joinpath(soldir, name * ".arrow")
    isfile(f) || error("solution family $name missing from $soldir — refusing to write an empty series")
    Arrow.Table(f)
end

# --------------------------------------------------------------------------- model description
# Power plants are the processes whose names start with ELC (demo12 naming: ELC + T/R/N + E/N
# (existing/new) + fuel + vintage, e.g. ELCTNGAS01 = new gas plant). The fuel is read from the
# process's input commodity in the model data (TOP, IN), not from the name.
top = Arrow.Table(joinpath(outdir, "TOP.arrow"))
fuel_of = Dict{Tuple{String,String},String}()
for i in eachindex(top.d1)
    p, c, io = top.d2[i], top.d3[i], top.d4[i]
    if startswith(p, "ELC") && io == "IN" && startswith(c, "ELC") && length(c) > 3
        fuel_of[(top.d1[i], p)] = c[4:end]          # ELCGAS -> GAS
    end
end
prc_desc = Dict{Tuple{String,String},String}()
pd = Arrow.Table(joinpath(outdir, "PRC_DESC.arrow"))
for i in eachindex(pd.d1)
    prc_desc[(pd.d1[i], pd.d2[i])] = pd.element_text[i]
end

# ------------------------------------------------------------------------------------- results
years = sort(unique(String.(table("VAR_ACT").d2)))
regions = sort(unique(String.(table("VAR_ACT").d1)))

# Electricity generation by fuel: VAR_ACT of the power plants, summed over vintages and timeslices.
# demo12 measures the activity of every power plant in its electricity output (PRC_ACTUNT, PJ).
act = table("VAR_ACT")
gen = Dict{Tuple{String,String,String},Float64}()      # (region, year, fuel) -> PJ
for i in eachindex(act.level)
    key = (act.d1[i], act.d4[i])
    haskey(fuel_of, key) || continue
    k = (act.d1[i], act.d2[i], fuel_of[key])
    gen[k] = get(gen, k, 0.0) + act.level[i]
end
isempty(gen) && error("no power-plant activity found in VAR_ACT")

# New capacity of power plants: VAR_NCAP (GW in demo12), by region, year and fuel.
ncap = table("VAR_NCAP")
newcap = Dict{Tuple{String,String,String},Float64}()
for i in eachindex(ncap.level)
    key = (ncap.d1[i], ncap.d3[i])
    haskey(fuel_of, key) || continue
    k = (ncap.d1[i], ncap.d2[i], fuel_of[key])
    newcap[k] = get(newcap, k, 0.0) + ncap.level[i]
end

# CO2 by sector: VAR_COMNET of the sectoral CO2 commodities (kt). Their balance rows are equalities
# (EQE_COMBAL), so the net level is the sector's net emission, not a slack.
comnet = table("VAR_COMNET")
combal_e = table("EQE_COMBAL")
eq_co2 = Set((combal_e.d1[i], combal_e.d2[i], combal_e.d3[i]) for i in eachindex(combal_e.d1) if endswith(combal_e.d3[i], "CO2"))
co2 = Dict{Tuple{String,String,String},Float64}()
for i in eachindex(comnet.level)
    c = comnet.d3[i]
    endswith(c, "CO2") || continue
    (comnet.d1[i], comnet.d2[i], c) in eq_co2 || error("CO2 commodity $c has no equality balance row; its VAR_COMNET is not an emission")
    k = (comnet.d1[i], comnet.d2[i], c[1:end-3])
    co2[k] = get(co2, k, 0.0) + comnet.level[i]
end
isempty(co2) && error("no sectoral CO2 found in VAR_COMNET")

# Objective by cost component and region (VAR_OBJ, MEuro05).
obj = table("VAR_OBJ")
objparts = [Dict("region" => obj.d1[i], "component" => obj.d2[i], "currency" => obj.d3[i], "value" => obj.level[i])
            for i in eachindex(obj.level)]

rows(d, field) = [Dict("region" => k[1], "year" => k[2], field => k[3], "value" => v) for (k, v) in sort(collect(d))]

# ------------------------------------------------------------------------------------ provenance
timesjl_commit = try
    readchomp(`git -C $(pkgdir(TIMES)) rev-parse HEAD`)
catch
    "unknown (TIMES.jl not installed from a git checkout)"
end

out = Dict(
    "generated" => string(Dates.today()),
    "generator" => "scripts/times-jl/run-demo12.jl",
    "model" => Dict(
        "name" => "TIMES_Demo demo12",
        "source" => "etsap-TIMES/TIMES_Demo @ 962db86 (CC BY 4.0, IEA-ETSAP), model/demo12.run",
        "regions" => regions,
        "milestone_years" => years,
        "note" => "A stylised two-region demonstration model shipped with TIMES. Its regions (REG1, REG2) and data are illustrative and represent no real country.",
    ),
    "software" => Dict(
        "julia" => string(VERSION),
        "timesjl_commit" => timesjl_commit,
        "times_gams_source" => "etsap-TIMES/TIMES_model v4.9.7 @ d9a6a25",
        "solver" => get(manifest, "solver", "unknown"),
    ),
    "run" => run_info,
    "parity" => Dict(
        "objective_timesjl" => objective,
        "objective_gams_reference" => GAMS_REFERENCE_OBJECTIVE,
        "relative_difference" => abs(objective - GAMS_REFERENCE_OBJECTIVE) / abs(GAMS_REFERENCE_OBJECTIVE),
        "rows_gams_reference" => GAMS_REFERENCE_ROWS,
        "columns_gams_reference" => GAMS_REFERENCE_COLS,
        "reference_source" => GAMS_REFERENCE_SOURCE,
    ),
    "units" => Dict("generation" => "PJ", "new_capacity" => "GW", "co2" => "kt CO2", "objective" => "MEuro05 (discounted)"),
    "process_descriptions" => Dict(string(k[1], ".", k[2]) => v for (k, v) in prc_desc if haskey(fuel_of, k)),
    "generation_by_fuel" => rows(gen, "fuel"),
    "new_capacity_by_fuel" => rows(newcap, "fuel"),
    "co2_by_sector" => rows(co2, "sector"),
    "objective_components" => objparts,
)

mkpath(dirname(jsonpath))
open(jsonpath, "w") do io
    JSON.print(io, out, 1)
end
println("== wrote $jsonpath: objective $objective, relative difference to GAMS ",
        out["parity"]["relative_difference"])
