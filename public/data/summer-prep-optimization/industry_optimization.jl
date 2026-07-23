#!/usr/bin/env julia
# ================================================================================================
# EU INDUSTRY DECARBONIZATION — LEAST-COST TECHNOLOGY OPTIMIZATION (working prototype)
# ================================================================================================
#
# WHAT QUESTION DOES THIS MODEL ANSWER?
# --------------------------------------
# "If EU-27 heavy industry (steel, cement, chemicals/HVC, ammonia, aluminium, glass, paper) had
# to meet its projected 2025-2050 production demand at LEAST COST, which technologies would it
# invest in each period, and how much direct CO2 would that pathway emit?" It is a normative
# ("what would a cost-minimiser do") model, not a forecast of what companies will actually do.
#
# STYLE / LINEAGE
# ----------------
# Written in the spirit of SEAMAPS (https://github.com/SebastianFra/SEAMAPS): one readable Julia
# file, JuMP for the algebra, HiGHS (open-source) as the solver, plain CSV inputs, and a scenario
# loop for sensitivity analysis. No black boxes: every constraint below has a plain-language
# comment explaining what it enforces and why, because this file is displayed on a public web
# page for a non-modeller audience as well as being run as code.
#
# MODEL FORMULATION IN ONE PARAGRAPH
# -----------------------------------
# For each of the 7 subsectors and each candidate technology, the model chooses how much new
# capacity to BUILD (B), how much capacity is INSTALLED (K, existing stock + surviving builds),
# and how much to PRODUCE (Q) in each of 6 five-year snapshots (2025...2050), so that production
# meets exogenous demand exactly, capacity is never exceeded, technologies cannot be built before
# they are commercially available or faster than a realistic deployment-rate ceiling, scrap-based
# recycling routes are capped by scrap availability, and biomass use / CO2 capture are capped by
# shared, economy-wide ceilings. All subsectors are solved TOGETHER in one linear program (LP)
# because they compete for the same limited biomass and CO2-storage pools. The objective is the
# discounted sum of annualised capex, fixed & variable OPEX, fuel cost and carbon cost (on direct
# emissions only) over the whole horizon, discounted at a 7% real rate from a 2025 base year.
#
# UNITS (fixed throughout)
# --------------------------
# - Production / capacity / demand : Mt product per year (million tonnes/yr)
# - Costs                          : EUR per tonne of product (capex is EUR per tonne/yr of
#                                    capacity); model reports totals in million EUR (M EUR)
# - Energy use                     : GJ per tonne of product, by carrier
# - Emission factors               : tCO2 per GJ (combustion) or tCO2 per tonne (process)
# - Emissions results              : Mt CO2 per year
# - Carbon price                   : EUR per tonne CO2 (applied to direct/scope-1 emissions only;
#                                    the cost of carbon embedded in purchased electricity is
#                                    already inside the electricity price, so it is NOT taxed a
#                                    second time here — see the objective section for the note)
#
# DISCLAIMER
# ------------
# This is a WORKING PROTOTYPE built for the ESABCC Method Hub's "Summer Prep" exploration, not a
# validated policy tool and not a Board position. Technology costs, energy intensities and
# constraint ceilings are literature-derived central estimates (see data/sources.csv for the
# provenance of every number) assembled for illustrative, order-of-magnitude sensitivity testing
# — not for investment decisions. Treat results as directional, not as forecasts.
#
# HOW TO RUN
# ------------
#   cd beta/modules/summer-prep/optimization/model
#   julia --project=. industry_optimization.jl
#
# Reads everything from ./data/*.csv, solves one scenario at a time, writes
# ./results/results_<scenario>.csv and ./results/results_summary.json.
# ================================================================================================

using JuMP
using HiGHS
using CSV
using DataFrames
using JSON

# ================================================================================================
# 1. SETTINGS
# ================================================================================================
# All the fixed, model-wide constants live here so a reader can see the whole "dial panel" at a
# glance without hunting through the rest of the file.

const MODEL_DIR    = @__DIR__                       # folder this script lives in
const DATA_DIR     = joinpath(MODEL_DIR, "data")     # CSV inputs
const RESULTS_DIR  = joinpath(MODEL_DIR, "results")  # CSV/JSON outputs (created if missing)

const MODEL_YEARS       = [2025, 2030, 2035, 2040, 2045, 2050]  # 5-year snapshots modelled
const YEAR_STEP         = 5                                     # years represented by each step
const BASE_YEAR         = 2025                                  # discounting anchor
const DISCOUNT_RATE     = 0.07                                  # real discount / WACC rate (7%)
const RETIREMENT_END_YEAR = 2045   # year by which ALL pre-2025 ("existing") capacity has retired

# Energy carriers tracked throughout (must match energy_use.csv / fuel_prices.csv / emission
# factors columns exactly).
const CARRIERS = ["coal", "coke", "natural_gas", "electricity", "hydrogen", "biomass", "oil"]

# Technologies that represent EXISTING (pre-2025) production stock. Each subsector's incumbent
# technology starts in 2025 with capacity equal to 2025 demand (aluminium is split between the
# primary route and the recycling route, in proportion to the 2025 scrap share) and that stock
# is retired linearly to zero by RETIREMENT_END_YEAR, forcing reinvestment decisions. These same
# technologies are excluded from the "clean-tech" cost/efficiency scenarios below, since a
# capex or efficiency *improvement* scenario is meant to represent progress on the ALTERNATIVE
# routes, not the conventional incumbent.
const EXISTING_STOCK_TECHS = [
    "steel_bfbof", "cement_ref", "hvc_ref", "ammonia_smr",
    "alu_ref", "alu_sec", "glass_ng", "paper_ref",
]

# Scrap/recycling-limited technologies -> the subsector whose scrap_share_max constraint applies.
const SCRAP_LIMITED_TECHS = Dict("steel_scrap_eaf" => "steel", "alu_sec" => "aluminium")

# Sentinel year used internally when an emission factor applies to "all" years (see ef_lookup).
const EF_ALL_YEARS = -1

# ================================================================================================
# 2. READ INPUTS
# ================================================================================================
# Every input table is read once at "central" values; scenarios below simply scale/deep-copy this
# base data. We fail loudly and early if a file or an expected column is missing, rather than
# letting a cryptic KeyError surface deep inside the model build.

"""All model input data for ONE scenario run (mutable so scenarios can adjust it in place)."""
mutable struct ModelData
    subsectors::Vector{String}
    techs::Vector{String}
    subsector_of::Dict{String,String}
    capex::Dict{String,Float64}                 # EUR per tonne/yr of capacity
    fixed_opex::Dict{String,Float64}             # EUR per tonne/yr of capacity per year
    var_opex::Dict{String,Float64}               # EUR per tonne produced
    lifetime::Dict{String,Float64}               # years
    available_from::Dict{String,Int}             # first year a build is allowed
    max_build_share::Dict{String,Float64}        # share of subsector demand buildable per step
    capture_rate::Dict{String,Float64}           # CCS capture rate, 0 for non-CCS techs
    process_co2::Dict{String,Float64}            # tCO2 per tonne, non-energy process emissions
    energy::Dict{Tuple{String,String},Float64}   # (tech, carrier) -> GJ per tonne
    demand::Dict{Tuple{String,Int},Float64}      # (subsector, year) -> Mt
    fuel_price::Dict{Tuple{String,Int},Float64}  # (carrier, year) -> EUR per GJ
    ef::Dict{Tuple{String,Int},Float64}          # (carrier, year|EF_ALL_YEARS) -> tCO2 per GJ
    carbon_price_low::Dict{Int,Float64}          # EUR per tCO2
    carbon_price_central::Dict{Int,Float64}
    carbon_price_high::Dict{Int,Float64}
    carbon_price_choice::String                  # "low" | "central" | "high" — active column
    scrap_share_max::Dict{Tuple{String,Int},Float64}  # (subsector, year) -> max share of demand
    biomass_pj_max::Dict{Int,Float64}            # year -> PJ, economy-wide biomass ceiling
    ccs_mt_max::Dict{Int,Float64}                # year -> Mt CO2/yr, economy-wide CCS ceiling
    existing_share_2025::Dict{String,Float64}    # share of 2025 subsector demand held by tech
end

const INPUT_FILES = [
    "sectors.csv", "demand.csv", "technologies.csv", "energy_use.csv", "fuel_prices.csv",
    "carbon_price.csv", "emission_factors.csv", "constraints.csv", "scenarios.csv", "sources.csv",
]

"""Error loudly, listing every missing file at once, if any required CSV is not present."""
function assert_files_exist(dir::String, filenames::Vector{String})
    missing_files = [f for f in filenames if !isfile(joinpath(dir, f))]
    if !isempty(missing_files)
        error("Missing required input file(s) in $(dir): $(join(missing_files, ", ")). " *
              "Generate the data/*.csv inputs (see README.md) before running the model.")
    end
end

"""Error loudly, naming the file and the missing column(s), if a table lacks expected columns."""
function assert_columns(df::DataFrame, filename::String, required::Vector{Symbol})
    missing_cols = [c for c in required if !hasproperty(df, c)]
    if !isempty(missing_cols)
        error("Input file '$(filename)' is missing required column(s): " *
              join(string.(missing_cols), ", ") *
              ". Found columns: $(join(string.(propertynames(df)), ", "))")
    end
end

"""Parse an emission_factors.csv year cell: an integer year, or the string 'all' (case
insensitive) meaning the factor is constant across all model years."""
function parse_ef_year(x)::Int
    s = strip(string(x))
    return lowercase(s) == "all" ? EF_ALL_YEARS : parse(Int, s)
end

"""Look up an emission factor for (carrier, year), falling back to the carrier's 'all-years'
value if a year-specific one was not given."""
function ef_lookup(data::ModelData, carrier::String, year::Int)::Float64
    haskey(data.ef, (carrier, year)) && return data.ef[(carrier, year)]
    haskey(data.ef, (carrier, EF_ALL_YEARS)) && return data.ef[(carrier, EF_ALL_YEARS)]
    error("emission_factors.csv has no factor for carrier='$(carrier)', year=$(year), and no " *
          "'all' fallback row for that carrier.")
end

"""Look up a fuel/carrier price for (carrier, year); errors clearly if the combination is not
covered by fuel_prices.csv (every carrier x model-year combination must be present)."""
function fuel_price_lookup(data::ModelData, carrier::String, year::Int)::Float64
    haskey(data.fuel_price, (carrier, year)) && return data.fuel_price[(carrier, year)]
    error("fuel_prices.csv has no price for carrier='$(carrier)', year=$(year).")
end

"""Active carbon price (EUR/tCO2) for a given year, depending on which column (low/central/high)
the current scenario has selected."""
function active_carbon_price(data::ModelData, year::Int)::Float64
    if data.carbon_price_choice == "low"
        return data.carbon_price_low[year]
    elseif data.carbon_price_choice == "high"
        return data.carbon_price_high[year]
    else
        return data.carbon_price_central[year]
    end
end

"""Read and validate all data/*.csv inputs, returning the central-scenario ModelData plus the
raw scenarios.csv table (which drives the scenario loop in main())."""
function read_inputs()::Tuple{ModelData,DataFrame}
    assert_files_exist(DATA_DIR, INPUT_FILES)

    sectors_df = CSV.read(joinpath(DATA_DIR, "sectors.csv"), DataFrame)
    assert_columns(sectors_df, "sectors.csv",
        [:subsector, :name, :branch, :production_2023_mt, :direct_co2_2023_mt, :source])
    subsectors = String.(sectors_df.subsector)

    tech_df = CSV.read(joinpath(DATA_DIR, "technologies.csv"), DataFrame)
    assert_columns(tech_df, "technologies.csv",
        [:tech, :subsector, :name, :capex_eur_t, :fixed_opex_eur_t, :var_opex_eur_t,
         :lifetime_yr, :available_from, :max_build_share, :capture_rate, :process_co2_t_t,
         :source])
    techs = String.(tech_df.tech)
    allunique(techs) || error("technologies.csv contains duplicate 'tech' identifiers.")
    subsector_of      = Dict(zip(techs, String.(tech_df.subsector)))
    capex             = Dict(zip(techs, Float64.(tech_df.capex_eur_t)))
    fixed_opex        = Dict(zip(techs, Float64.(tech_df.fixed_opex_eur_t)))
    var_opex          = Dict(zip(techs, Float64.(tech_df.var_opex_eur_t)))
    lifetime          = Dict(zip(techs, Float64.(tech_df.lifetime_yr)))
    available_from    = Dict(zip(techs, Int.(round.(tech_df.available_from))))
    max_build_share   = Dict(zip(techs, Float64.(tech_df.max_build_share)))
    capture_rate      = Dict(zip(techs, Float64.(tech_df.capture_rate)))
    process_co2       = Dict(zip(techs, Float64.(tech_df.process_co2_t_t)))

    for t in EXISTING_STOCK_TECHS
        t in techs || error("Expected existing-stock technology '$(t)' not found in " *
                             "technologies.csv (technology IDs are fixed by the model spec).")
    end

    energy_df = CSV.read(joinpath(DATA_DIR, "energy_use.csv"), DataFrame)
    assert_columns(energy_df, "energy_use.csv", [:tech, :carrier, :gj_per_t])
    energy = Dict{Tuple{String,String},Float64}()
    for row in eachrow(energy_df)
        energy[(String(row.tech), String(row.carrier))] = Float64(row.gj_per_t)
    end

    demand_df = CSV.read(joinpath(DATA_DIR, "demand.csv"), DataFrame)
    assert_columns(demand_df, "demand.csv", [:subsector, :year, :demand_mt])
    demand = Dict{Tuple{String,Int},Float64}()
    for row in eachrow(demand_df)
        demand[(String(row.subsector), Int(row.year))] = Float64(row.demand_mt)
    end
    for s in subsectors, y in MODEL_YEARS
        haskey(demand, (s, y)) ||
            error("demand.csv is missing subsector='$(s)', year=$(y).")
    end

    fp_df = CSV.read(joinpath(DATA_DIR, "fuel_prices.csv"), DataFrame)
    assert_columns(fp_df, "fuel_prices.csv", [:carrier, :year, :price_eur_gj])
    fuel_price = Dict{Tuple{String,Int},Float64}()
    for row in eachrow(fp_df)
        fuel_price[(String(row.carrier), Int(row.year))] = Float64(row.price_eur_gj)
    end
    for c in CARRIERS, y in MODEL_YEARS
        haskey(fuel_price, (c, y)) ||
            error("fuel_prices.csv is missing carrier='$(c)', year=$(y).")
    end

    cp_df = CSV.read(joinpath(DATA_DIR, "carbon_price.csv"), DataFrame)
    assert_columns(cp_df, "carbon_price.csv", [:year, :price_low, :price_central, :price_high])
    carbon_price_low = Dict{Int,Float64}(); carbon_price_central = Dict{Int,Float64}()
    carbon_price_high = Dict{Int,Float64}()
    for row in eachrow(cp_df)
        y = Int(row.year)
        carbon_price_low[y]     = Float64(row.price_low)
        carbon_price_central[y] = Float64(row.price_central)
        carbon_price_high[y]    = Float64(row.price_high)
    end
    for y in MODEL_YEARS
        haskey(carbon_price_central, y) || error("carbon_price.csv is missing year=$(y).")
    end

    ef_df = CSV.read(joinpath(DATA_DIR, "emission_factors.csv"), DataFrame)
    assert_columns(ef_df, "emission_factors.csv", [:carrier, :year, :tco2_per_gj])
    ef = Dict{Tuple{String,Int},Float64}()
    for row in eachrow(ef_df)
        ef[(String(row.carrier), parse_ef_year(row.year))] = Float64(row.tco2_per_gj)
    end

    con_df = CSV.read(joinpath(DATA_DIR, "constraints.csv"), DataFrame)
    assert_columns(con_df, "constraints.csv", [:name, :subsector, :year, :value])
    scrap_share_max = Dict{Tuple{String,Int},Float64}()
    biomass_pj_max  = Dict{Int,Float64}()
    ccs_mt_max      = Dict{Int,Float64}()
    for row in eachrow(con_df)
        nm = String(row.name); y = Int(row.year); v = Float64(row.value)
        if nm == "scrap_share_max"
            scrap_share_max[(String(row.subsector), y)] = v
        elseif nm == "biomass_pj_max"
            biomass_pj_max[y] = v   # economy-wide total; 'subsector' column is informational only
        elseif nm == "ccs_mt_max"
            ccs_mt_max[y] = v       # economy-wide total; 'subsector' column is informational only
        end
    end
    for y in MODEL_YEARS
        haskey(biomass_pj_max, y) || error("constraints.csv missing biomass_pj_max for year=$(y).")
        haskey(ccs_mt_max, y)     || error("constraints.csv missing ccs_mt_max for year=$(y).")
    end
    for t in keys(SCRAP_LIMITED_TECHS)
        if t in techs
            s = SCRAP_LIMITED_TECHS[t]
            for y in MODEL_YEARS
                haskey(scrap_share_max, (s, y)) ||
                    error("constraints.csv missing scrap_share_max for subsector='$(s)', " *
                          "year=$(y) (needed for technology '$(t)').")
            end
        end
    end

    scenarios_df = CSV.read(joinpath(DATA_DIR, "scenarios.csv"), DataFrame)
    assert_columns(scenarios_df, "scenarios.csv", [:scenario, :description, :param, :factor])

    sources_df = CSV.read(joinpath(DATA_DIR, "sources.csv"), DataFrame)
    assert_columns(sources_df, "sources.csv",
        [:table, :item, :source_org, :source_title, :url, :year, :note])

    # Existing (2025) stock shares: aluminium splits between primary (alu_ref) and secondary
    # recycling (alu_sec) according to the 2025 scrap_share_max; every other subsector's
    # incumbent technology holds 100% of 2025 demand.
    haskey(scrap_share_max, ("aluminium", BASE_YEAR)) ||
        error("constraints.csv needs scrap_share_max for subsector='aluminium', " *
              "year=$(BASE_YEAR) to split 2025 aluminium stock between alu_ref and alu_sec.")
    alu_scrap_2025 = scrap_share_max[("aluminium", BASE_YEAR)]
    existing_share_2025 = Dict{String,Float64}()
    for t in EXISTING_STOCK_TECHS
        existing_share_2025[t] = 1.0
    end
    existing_share_2025["alu_ref"] = 1.0 - alu_scrap_2025
    existing_share_2025["alu_sec"] = alu_scrap_2025

    data = ModelData(subsectors, techs, subsector_of, capex, fixed_opex, var_opex, lifetime,
        available_from, max_build_share, capture_rate, process_co2, energy, demand, fuel_price,
        ef, carbon_price_low, carbon_price_central, carbon_price_high, "central",
        scrap_share_max, biomass_pj_max, ccs_mt_max, existing_share_2025)
    return data, scenarios_df
end

# ================================================================================================
# 3. SCENARIO ADJUSTMENTS
# ================================================================================================
# scenarios.csv rows have columns (scenario, description, param, factor). For a given scenario id
# we apply every matching row to a deep copy of the central ModelData. Two params ("carbon_price_
# low"/"carbon_price_high") are SWITCHES (they select which carbon-price column is active) rather
# than multiplicative factors; all others multiply the named quantity by 'factor'.

"""Apply one (param, factor) scenario adjustment to `data` in place."""
function apply_scenario_row!(data::ModelData, param::String, factor::Float64)
    if param == "capex_clean"
        # Clean/alternative technologies get cheaper (or, with factor>1, more expensive) capex.
        # The incumbent/reference technologies are left untouched — this represents progress on
        # the ALTERNATIVE routes only, not on the conventional plant.
        for t in data.techs
            if !(t in EXISTING_STOCK_TECHS)
                data.capex[t] *= factor
            end
        end
    elseif param == "energy_intensity_clean"
        # Efficiency/learning improvement: clean technologies need less energy per tonne.
        for t in data.techs, c in CARRIERS
            if !(t in EXISTING_STOCK_TECHS) && haskey(data.energy, (t, c))
                data.energy[(t, c)] *= factor
            end
        end
    elseif param == "carbon_price_low"
        data.carbon_price_choice = "low"     # switch the EU ETS carbon-price path used
    elseif param == "carbon_price_high"
        data.carbon_price_choice = "high"
    elseif param == "demand"
        # Scales projected product demand up/down in every subsector and year (e.g. circularity
        # vs. growth scenarios). 2025 existing-stock capacity is derived from (scaled) 2025
        # demand, so this also shifts the starting stock consistently.
        for k in keys(data.demand)
            data.demand[k] *= factor
        end
    elseif param == "elec_price"
        for y in MODEL_YEARS
            key = ("electricity", y)
            haskey(data.fuel_price, key) && (data.fuel_price[key] *= factor)
        end
    elseif param == "h2_price"
        for y in MODEL_YEARS
            key = ("hydrogen", y)
            haskey(data.fuel_price, key) && (data.fuel_price[key] *= factor)
        end
    elseif param == "none"
        # The central scenario: no override — solve with the unmodified central inputs.
    elseif param == "max_build_share"
        # Represents a deployment bottleneck (or, with factor>1, faster rollout capacity):
        # scales how much new capacity of EVERY technology can be added per 5-year step.
        for t in data.techs
            data.max_build_share[t] *= factor
        end
    else
        error("Unknown scenario parameter '$(param)' in scenarios.csv. Supported params: " *
              "capex_clean, energy_intensity_clean, carbon_price_low, carbon_price_high, " *
              "demand, elec_price, h2_price, max_build_share.")
    end
    return data
end

"""Build the ModelData for one scenario: deep-copy the central data, then apply every
scenarios.csv row tagged with this scenario id, in file order."""
function build_scenario_data(base::ModelData, scenarios_df::DataFrame, scenario_id::String)
    data = deepcopy(base)
    rows = filter(r -> String(r.scenario) == scenario_id, scenarios_df)
    for row in eachrow(rows)
        apply_scenario_row!(data, String(row.param), Float64(row.factor))
    end
    return data
end

# ================================================================================================
# 4. BUILD MODEL
# ================================================================================================

"""Capital Recovery Factor: turns a lump-sum capex into a level annual payment over `lifetime`
years at real discount rate `r`. Standard annuity formula: CRF = r(1+r)^L / ((1+r)^L - 1)."""
function crf(r::Float64, lifetime::Float64)::Float64
    lifetime > 0 || error("Technology lifetime must be positive to annualise capex.")
    return r * (1 + r)^lifetime / ((1 + r)^lifetime - 1)
end

"""Present-value discount factor for year `y`, relative to BASE_YEAR, at DISCOUNT_RATE."""
discount_factor(y::Int) = 1.0 / (1.0 + DISCOUNT_RATE)^(y - BASE_YEAR)

"""Exogenous existing-stock capacity (Mt) of technology `t` in year `y`. Only the incumbent
technologies in EXISTING_STOCK_TECHS carry existing stock; it equals their 2025 share of 2025
demand, declining LINEARLY to zero by RETIREMENT_END_YEAR (2045) — i.e. every tonne of 2025
capacity must eventually be replaced by a new build of some technology."""
function k_exist(data::ModelData, t::String, y::Int)::Float64
    t in EXISTING_STOCK_TECHS || return 0.0
    s = data.subsector_of[t]
    base_2025 = data.existing_share_2025[t] * data.demand[(s, BASE_YEAR)]
    remaining_share = max(0.0, 1.0 - (y - BASE_YEAR) / (RETIREMENT_END_YEAR - BASE_YEAR))
    return base_2025 * remaining_share
end

"""Build the full joint LP for all subsectors/technologies/years given scenario-adjusted `data`.
Returns the JuMP model plus the variable/expression containers needed to extract results."""
function build_model(data::ModelData)
    m = Model(HiGHS.Optimizer)
    set_silent(m)  # keep the console output to our own scenario summary line

    techs = data.techs
    Y = MODEL_YEARS

    # --- 4.1 Decision variables --------------------------------------------------------------
    # B = new capacity built in year y (Mt/yr added); K = total installed capacity (Mt/yr);
    # Q = actual production (Mt/yr). All are non-negative by construction (you cannot "un-build"
    # capacity or produce a negative amount).
    @variable(m, B[t = techs, y = Y] >= 0)
    @variable(m, K[t = techs, y = Y] >= 0)
    @variable(m, Q[t = techs, y = Y] >= 0)

    # --- 4.2 Availability ----------------------------------------------------------------------
    # A technology cannot be built before it is commercially available (e.g. you cannot build an
    # H2-DRI steel plant in 2025 if it only reaches market readiness in 2035).
    @constraint(m, con_availability[t = techs, y = Y; y < data.available_from[t]], B[t, y] == 0)

    # --- 4.3 Build-rate ceiling ------------------------------------------------------------------
    # New capacity of any single technology cannot ramp up faster than a realistic share of that
    # subsector's demand per 5-year step (supply-chain, permitting, workforce, financing limits).
    @constraint(m, con_buildrate[t = techs, y = Y],
        B[t, y] <= data.max_build_share[t] * data.demand[(data.subsector_of[t], y)])

    # --- 4.4 Capacity accounting -----------------------------------------------------------------
    # Installed capacity in year y = surviving pre-2025 existing stock + every past build that has
    # not yet reached the end of its technical lifetime. This is the exact, vintage-tracked
    # equivalent of the simpler recursive rule "K[y] = K[y-1]*survival + B[y]": because we only
    # have 6 discrete snapshot years, summing over surviving vintages directly is both correct and
    # easier to audit than a recursive year-on-year update.
    @constraint(m, con_capacity[t = techs, y = Y],
        K[t, y] == k_exist(data, t, y) +
                   sum(B[t, yb] for yb in Y if yb <= y && (y - yb) < data.lifetime[t]))

    # --- 4.5 Capacity adequacy -------------------------------------------------------------------
    # You cannot produce more than your installed capacity allows.
    @constraint(m, con_adequacy[t = techs, y = Y], Q[t, y] <= K[t, y])

    # --- 4.6 Demand balance ----------------------------------------------------------------------
    # All technologies within a subsector must together produce exactly the exogenous demand for
    # that subsector's product in every year (no shortage, no unwanted surplus).
    @constraint(m, con_demand[s = data.subsectors, y = Y],
        sum(Q[t, y] for t in techs if data.subsector_of[t] == s) == data.demand[(s, y)])

    # --- 4.7 Scrap / recycling availability --------------------------------------------------
    # Recycling-based routes (steel EAF-from-scrap, secondary aluminium) can only produce up to
    # the share of demand that available scrap can physically supply in that year.
    for (t, s) in SCRAP_LIMITED_TECHS
        if t in techs
            @constraint(m, [y = Y], Q[t, y] <= data.scrap_share_max[(s, y)] * data.demand[(s, y)])
        end
    end

    # --- 4.8 Emissions expressions -----------------------------------------------------------
    # PreCapture = the CO2 a technology would emit BEFORE any carbon capture is applied: fossil
    # fuel combustion (every carrier except electricity, whose emissions are tracked separately
    # as "indirect") plus non-energy process emissions (e.g. cement clinker calcination).
    @expression(m, PreCapture[t = techs, y = Y],
        Q[t, y] * (sum(get(data.energy, (t, c), 0.0) * ef_lookup(data, c, y)
                       for c in CARRIERS if c != "electricity") + data.process_co2[t]))
    # Captured CO2 (only non-zero for CCS technologies, via their capture_rate).
    @expression(m, Captured[t = techs, y = Y], data.capture_rate[t] * PreCapture[t, y])
    # Direct (scope-1) CO2 actually released to the atmosphere after any capture.
    @expression(m, DirectCO2[t = techs, y = Y], (1.0 - data.capture_rate[t]) * PreCapture[t, y])
    # Indirect CO2 from purchased electricity, tracked separately (see objective note below: its
    # carbon cost is already embedded in the electricity price, so it is reported but not taxed
    # again by the explicit carbon price here).
    @expression(m, IndirectCO2[t = techs, y = Y],
        Q[t, y] * get(data.energy, (t, "electricity"), 0.0) * ef_lookup(data, "electricity", y))

    # --- 4.9 Biomass ceiling -------------------------------------------------------------------
    # Sustainable biomass is a scarce, shared resource across ALL subsectors (paper, HVC bio-
    # naphtha, etc). Total biomass use (GJ) in a year cannot exceed the economy-wide ceiling
    # (converted from PJ to GJ: 1 PJ = 1e6 GJ).
    @constraint(m, con_biomass[y = Y],
        sum(Q[t, y] * get(data.energy, (t, "biomass"), 0.0) for t in techs) <=
        data.biomass_pj_max[y] * 1.0e6)

    # --- 4.10 CO2 capture & storage ceiling ------------------------------------------------------
    # Total CO2 captured across ALL CCS technologies in ALL subsectors cannot exceed the
    # economy-wide CO2 transport & storage ramp-up ceiling for that year.
    @constraint(m, con_ccs[y = Y], sum(Captured[t, y] for t in techs) <= data.ccs_mt_max[y])

    # --- 4.11 Costs and objective ----------------------------------------------------------------
    # Energy cost: quantity produced x energy intensity x fuel price, summed over all carriers.
    @expression(m, EnergyCost[t = techs, y = Y],
        Q[t, y] * sum(get(data.energy, (t, c), 0.0) * fuel_price_lookup(data, c, y)
                      for c in CARRIERS))
    # Total annual cost of operating technology t in year y (million EUR):
    #   annualised capex (CRF x capex x capacity) + fixed OPEX x capacity + variable OPEX x
    #   production + energy cost + carbon price x DIRECT emissions only. Carbon price is NOT
    #   applied to indirect (electricity) emissions here, because the EU ETS price a producer
    #   actually pays on its own smokestack (scope 1) is what this term represents; any carbon
    #   cost passed through in the electricity price is already inside EnergyCost above.
    @expression(m, AnnualCost[t = techs, y = Y],
        crf(DISCOUNT_RATE, data.lifetime[t]) * data.capex[t] * K[t, y] +
        data.fixed_opex[t] * K[t, y] +
        data.var_opex[t] * Q[t, y] +
        EnergyCost[t, y] +
        active_carbon_price(data, y) * DirectCO2[t, y])

    # Objective: minimise the discounted sum of 5-year-period costs across the whole horizon.
    # Each snapshot year y represents a YEAR_STEP-year period, so its annual cost is multiplied by
    # YEAR_STEP before discounting back to BASE_YEAR at DISCOUNT_RATE.
    @objective(m, Min,
        sum(discount_factor(y) * YEAR_STEP * AnnualCost[t, y] for t in techs, y in Y))

    return m, B, K, Q, DirectCO2, IndirectCO2, AnnualCost
end

# ================================================================================================
# 5. SOLVE
# ================================================================================================

"""Solve `model` and error loudly (naming the scenario) if it did not reach a provably optimal
solution — silent infeasibility or numerical trouble should never be reported as a result."""
function solve_and_check!(model::Model, scenario_id::String)
    optimize!(model)
    status = termination_status(model)
    if status != MOI.OPTIMAL
        error("Scenario '$(scenario_id)' did not solve to optimality (HiGHS termination " *
              "status = $(status)). This usually means the input data is infeasible for this " *
              "scenario (e.g. demand cannot be met given build-rate, scrap, biomass or CCS " *
              "ceilings) — check data/*.csv for this scenario's adjusted values.")
    end
    return status
end

# ================================================================================================
# 6. EXTRACT & WRITE RESULTS
# ================================================================================================

"""Pull all decision-variable/expression values for one solved scenario into a tidy DataFrame and
write it to results/results_<scenario_id>.csv."""
function extract_results(data::ModelData, scenario_id::String, B, K, Q, DirectCO2, IndirectCO2,
                          AnnualCost)::DataFrame
    rows = DataFrame(subsector = String[], tech = String[], year = Int[],
                      production_mt = Float64[], capacity_mt = Float64[], new_build_mt = Float64[],
                      direct_co2_mt = Float64[], indirect_co2_mt = Float64[], cost_meur = Float64[])
    for t in data.techs, y in MODEL_YEARS
        push!(rows, (data.subsector_of[t], t, y,
                      value(Q[t, y]), value(K[t, y]), value(B[t, y]),
                      value(DirectCO2[t, y]), value(IndirectCO2[t, y]), value(AnnualCost[t, y])))
    end
    sort!(rows, [:subsector, :tech, :year])
    mkpath(RESULTS_DIR)
    CSV.write(joinpath(RESULTS_DIR, "results_$(scenario_id).csv"), rows)
    return rows
end

"""Build the JSON-ready summary block for one scenario from its results DataFrame + objective."""
function build_scenario_summary(data::ModelData, model::Model, rows::DataFrame)::Dict{String,Any}
    total_discounted_cost_beur = objective_value(model) / 1000.0  # M EUR -> B EUR

    total_direct_co2_by_year = Dict{String,Any}()
    for y in MODEL_YEARS
        total_direct_co2_by_year[string(y)] = sum(rows.direct_co2_mt[rows.year .== y])
    end

    by_subsector = Dict{String,Any}()
    for s in data.subsectors
        sub = rows[rows.subsector .== s, :]
        co2_2050 = sum(sub.direct_co2_mt[sub.year .== 2050])

        rows2040 = sub[sub.year .== 2040, :]
        dominant_tech_2040 = isempty(rows2040) ? "" :
            rows2040.tech[argmax(rows2040.production_mt)]

        tech_shares = Dict{String,Any}()
        for y in MODEL_YEARS
            suby = sub[sub.year .== y, :]
            total_prod = sum(suby.production_mt)
            shares = Dict{String,Any}()
            for i in 1:nrow(suby)
                shares[suby.tech[i]] = total_prod > 1e-9 ? suby.production_mt[i] / total_prod : 0.0
            end
            tech_shares[string(y)] = shares
        end

        by_subsector[s] = Dict{String,Any}(
            "co2_2050_mt" => co2_2050,
            "dominant_tech_2040" => dominant_tech_2040,
            "tech_shares" => tech_shares,
        )
    end

    return Dict{String,Any}(
        "total_discounted_cost_beur" => total_discounted_cost_beur,
        "co2_2030_mt" => total_direct_co2_by_year["2030"],
        "co2_2040_mt" => total_direct_co2_by_year["2040"],
        "co2_2050_mt" => total_direct_co2_by_year["2050"],
        "total_direct_co2_by_year" => total_direct_co2_by_year,
        "by_subsector" => by_subsector,
    )
end

# ================================================================================================
# 7. SCENARIO LOOP / MAIN
# ================================================================================================

"""Determine the full, deduplicated list of scenario ids to solve, always running 'central'
first (it is included even if scenarios.csv happens not to list it explicitly, since central
means simply 'no adjustments applied')."""
function scenario_id_list(scenarios_df::DataFrame)::Vector{String}
    ids = unique(String.(scenarios_df.scenario))
    ids = filter(!=("central"), ids)
    return vcat(["central"], ids)
end

function main()
    println("=" ^ 78)
    println("EU Industry Decarbonization — Least-Cost Optimization (working prototype)")
    println("=" ^ 78)

    base_data, scenarios_df = read_inputs()
    ids = scenario_id_list(scenarios_df)
    println("Solving $(length(ids)) scenario(s): $(join(ids, ", "))")

    summary = Dict{String,Any}()
    for scenario_id in ids
        data = build_scenario_data(base_data, scenarios_df, scenario_id)
        model, B, K, Q, DirectCO2, IndirectCO2, AnnualCost = build_model(data)
        solve_and_check!(model, scenario_id)

        rows = extract_results(data, scenario_id, B, K, Q, DirectCO2, IndirectCO2, AnnualCost)
        summary[scenario_id] = build_scenario_summary(data, model, rows)

        obj = objective_value(model)
        co2_2040 = summary[scenario_id]["co2_2040_mt"]
        println(rpad("  scenario '$(scenario_id)'", 26),
                "obj = ", round(obj, digits = 1), " M EUR (disc.)   |   ",
                "direct CO2 2040 = ", round(co2_2040, digits = 1), " Mt")
    end

    mkpath(RESULTS_DIR)
    open(joinpath(RESULTS_DIR, "results_summary.json"), "w") do io
        JSON.print(io, Dict("scenarios" => summary), 2)
    end

    println("=" ^ 78)
    println("Done. Wrote $(length(ids)) results_<scenario>.csv file(s) and results_summary.json")
    println("to: $(RESULTS_DIR)")
    println("=" ^ 78)
end

# Only auto-run when this file is executed directly (e.g. `julia --project=. industry_optimiza-
# tion.jl`), not when it is `include`-d by other code for testing.
if abspath(PROGRAM_FILE) == @__FILE__
    main()
end
