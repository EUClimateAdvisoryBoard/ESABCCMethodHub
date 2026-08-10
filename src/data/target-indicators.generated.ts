/**
 * AUTO-GENERATED — do not edit by hand.
 * Produced by scripts/build-target-indicators.mjs (npm run build:target-indicators).
 *
 * The M·53 assessment ledger: one row for every RELEVANT target in the M·36
 * Policy Targets Register that is NOT flagged "revise target" by the August
 * 2026 review pass (the reduced set — both calls inherited from the register),
 * with the route by which that target is measured.
 * Routes: 'series' (a curated MethodHub series measures it), 'dataset' (the
 * indicator is specified against a named public dataset but not yet built here),
 * 'milestone' (no measurable state of the world — assessed as compliance with
 * the act's own deadline). 'unassessed' is a build failure and cannot occur in
 * a committed file.
 *
 * Matching is deterministic: word-boundary vocabularies with veto phrases,
 * defined in scripts/target-indicator-catalogue.mjs. Every row carries the exact
 * terms that fired. Reviewed corrections come from
 * scripts/target-indicators-overrides.json and are reversible one entry at a time.
 *
 * AI-compiled — pending Secretariat verification. The dataset asserts no values:
 * it asserts a MAPPING between a legal target and a way of measuring it, and
 * that mapping is what a reviewer should challenge.
 *
 * 356 relevant unflagged targets of 819 in the register, across 46 acts
 * (544 relevant in total; 188 of those revise-flagged and excluded).
 *   route:   {"series":235,"dataset":117,"milestone":4}
 *   rung:    {"outcome":156,"lever":196,"enabling":4}
 *   match confidence (how much of the match rests on the target's own wording,
 *   not the act's title): {"strong":259,"moderate":72,"weak":25}
 *   families in use: 66 of 85 (unused: cbam-coverage, sustainable-finance-disclosure, fossil-subsidies, green-bonds, res-power, res-capacity, grid-intensity, energy-intensity, electrification, energy-methane, zev-uptake, zero-emission-buildings, heating-equipment, industrial-pollution, heat-health, insurance-gap, wildfire, infrastructure-resilience, climate-science-observation, crop-drought-yield)
 *   distinct curated indicators linked: 146
 *   overrides applied: 0
 */
import type { RawTargetAssessment, MeasurementFamily } from './target-indicators';

/** The measurement families, exactly as the build script read them. */
export const RAW_FAMILIES: MeasurementFamily[] = [
  {
    "key": "ghg-total",
    "label": "Total EU GHG emissions (European Climate Law scope)",
    "unit": "Mt CO₂eq",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "dataset": {
      "name": "EEA GHG data viewer / Eurostat env_air_gge",
      "url": "https://doi.org/10.2908/ENV_AIR_GGE"
    }
  },
  {
    "key": "esr-emissions",
    "label": "Effort Sharing (non-ETS) GHG emissions",
    "unit": "Mt CO₂eq",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [],
    "dataset": {
      "name": "EEA Effort Sharing emissions and targets (ESR data viewer)",
      "url": "https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-under-the-effort-sharing"
    }
  },
  {
    "key": "ets-emissions",
    "label": "EU ETS verified emissions (stationary installations)",
    "unit": "Mt CO₂e",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [
      "adv-eu-ets-emissions"
    ],
    "dataset": {
      "name": "EU Transaction Log / EEA ETS data viewer",
      "url": "https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards"
    }
  },
  {
    "key": "carbon-price",
    "label": "Carbon price and pricing coverage",
    "unit": "EUR/t CO₂e · % of emissions",
    "sector": "cross-cutting",
    "direction": "context",
    "indicator_ids": [
      "eu-ets-price",
      "carbon-pricing-coverage"
    ],
    "dataset": {
      "name": "EEX/ICE EUA settlement prices; World Bank Carbon Pricing Dashboard",
      "url": "https://carbonpricingdashboard.worldbank.org/"
    }
  },
  {
    "key": "cbam-coverage",
    "label": "CBAM-covered imports and embodied emissions",
    "unit": "Mt CO₂e · % of imports",
    "sector": "industry",
    "direction": "context",
    "indicator_ids": [
      "cbam-import-coverage",
      "embodied-import-emissions"
    ],
    "dataset": {
      "name": "CBAM transitional registry quarterly reports; Eurostat COMEXT",
      "url": "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en"
    }
  },
  {
    "key": "climate-finance-eu-budget",
    "label": "Climate mainstreaming of the EU budget",
    "unit": "% of EU budget",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "adapt-fin-mff-climate-mainstreaming"
    ],
    "dataset": {
      "name": "Commission programme statements / MFF climate-mainstreaming reporting",
      "url": "https://commission.europa.eu/strategy-and-policy/eu-budget/performance-and-reporting/programme-performance-statements_en"
    }
  },
  {
    "key": "cohesion-funds",
    "label": "Cohesion and regional-fund climate allocations",
    "unit": "% of allocation",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "Cohesion Open Data Platform (ERDF/CF/JTF thematic concentration)",
      "url": "https://cohesiondata.ec.europa.eu/"
    }
  },
  {
    "key": "investeu-finance",
    "label": "Public climate investment mobilised (InvestEU / EIB)",
    "unit": "EUR bn",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "clean-tech-investment"
    ],
    "dataset": {
      "name": "InvestEU Fund implementation reports; EIB Group Climate Bank Roadmap reporting",
      "url": "https://investeu.europa.eu/investeu-programme/investeu-fund_en"
    }
  },
  {
    "key": "sustainable-finance-disclosure",
    "label": "Sustainability reporting and taxonomy alignment",
    "unit": "% of undertakings · % of capex",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "ESMA/EFRAG CSRD filing statistics; Platform on Sustainable Finance taxonomy-alignment reporting",
      "url": "https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-sustainable-activities_en"
    }
  },
  {
    "key": "fossil-subsidies",
    "label": "Fossil-fuel subsidies",
    "unit": "EUR bn",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [
      "esabcc-f-fossil-subsidies",
      "fossil-subsidies"
    ],
    "dataset": {
      "name": "Commission State of the Energy Union fossil-fuel subsidy tracking (FFST)",
      "url": "https://energy.ec.europa.eu/topics/energy-strategy/energy-union_en"
    }
  },
  {
    "key": "green-bonds",
    "label": "Green bond issuance",
    "unit": "EUR bn",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "esabcc-f-green-bonds",
      "esabcc-f-green-bonds-share",
      "green-bond-issuance"
    ],
    "dataset": {
      "name": "Climate Bonds Initiative / ECB green bond statistics",
      "url": "https://www.climatebonds.net/market/data/"
    }
  },
  {
    "key": "rdi-budgets",
    "label": "Research, development and innovation effort",
    "unit": "% of GDP · EUR bn",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "esabcc-f-gerd",
      "esabcc-f-climate-patents-share",
      "energy-rdd-budget"
    ],
    "dataset": {
      "name": "Eurostat rd_e_gerdtot; IEA energy RD&D budgets; EPO patent statistics",
      "url": "https://doi.org/10.2908/RD_E_GERDTOT"
    }
  },
  {
    "key": "just-transition-jobs",
    "label": "Green employment and just-transition outcomes",
    "unit": "thousand jobs · %",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "environmental-employment"
    ],
    "dataset": {
      "name": "Eurostat env_ac_egss1 (environmental goods and services sector employment)",
      "url": "https://doi.org/10.2908/ENV_AC_EGSS1"
    }
  },
  {
    "key": "governance-necp",
    "label": "NECP completeness and national climate governance",
    "unit": "score · count of Member States",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "necp-implementation-score",
      "national-climate-laws"
    ],
    "dataset": {
      "name": "Commission NECP assessments (SWD series) and the EEA governance reporting dashboard",
      "url": "https://www.eea.europa.eu/en/analysis/indicators"
    }
  },
  {
    "key": "res-share",
    "label": "Renewable share of gross final energy consumption",
    "unit": "%",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_ren",
      "url": "https://doi.org/10.2908/NRG_IND_REN"
    }
  },
  {
    "key": "res-power",
    "label": "Renewable and fossil shares of electricity generation",
    "unit": "%",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "adv-wind-solar-share",
      "adv-fossil-power-share",
      "esabcc-e2-fossil-power-share",
      "esabcc-e2-res-noBio-power-share",
      "fossil-power-share"
    ],
    "dataset": {
      "name": "Eurostat nrg_bal_c / EMBER European Electricity Review",
      "url": "https://ember-energy.org/data/european-electricity-review/"
    }
  },
  {
    "key": "res-capacity",
    "label": "Renewable capacity additions (solar and wind)",
    "unit": "GW/yr",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "esabcc-e4a-solar-pv-add",
      "esabcc-e4b-wind-add",
      "solar-pv-additions",
      "wind-additions"
    ],
    "dataset": {
      "name": "IRENASTAT capacity statistics; Eurostat nrg_inf_epc",
      "url": "https://www.irena.org/Data"
    }
  },
  {
    "key": "grid-intensity",
    "label": "GHG intensity of electricity",
    "unit": "g CO₂eq/kWh",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "adv-grid-co2-intensity",
      "esabcc-e3-grid-co2-intensity"
    ],
    "dataset": {
      "name": "EEA greenhouse gas emission intensity of electricity generation",
      "url": "https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1"
    }
  },
  {
    "key": "energy-supply-ghg",
    "label": "Energy supply GHG emissions",
    "unit": "Mt CO₂eq",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "esabcc-e1-energy-supply-ghg",
      "power-sector-ghg"
    ],
    "dataset": {
      "name": "EEA GHG inventory, CRF 1.A.1 (energy industries)",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "energy-consumption",
    "label": "Primary and final energy consumption",
    "unit": "TWh",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_eff (energy efficiency indicators)",
      "url": "https://doi.org/10.2908/NRG_IND_EFF"
    }
  },
  {
    "key": "energy-intensity",
    "label": "Energy intensity of the economy",
    "unit": "kgoe per 1000 EUR",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "beta-energy-intensity"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_ei",
      "url": "https://doi.org/10.2908/NRG_IND_EI"
    }
  },
  {
    "key": "electrification",
    "label": "Electrification of final energy demand",
    "unit": "%",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "esabcc-e5-electrification",
      "end-use-electrification"
    ],
    "dataset": {
      "name": "Eurostat nrg_bal_c (electricity share of final energy consumption)",
      "url": "https://doi.org/10.2908/NRG_BAL_C"
    }
  },
  {
    "key": "grid-infrastructure",
    "label": "Grid, interconnection and storage build-out",
    "unit": "% · GW",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "battery-storage-capacity",
      "smart-meter-rollout"
    ],
    "dataset": {
      "name": "ENTSO-E TYNDP and Transparency Platform; PCI/PMI transparency platform",
      "url": "https://tyndp.entsoe.eu/"
    }
  },
  {
    "key": "hydrogen",
    "label": "Hydrogen and RFNBO production capacity",
    "unit": "GW · TWh",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "hydrogen-electrolyser-capacity",
      "electrolyser-mfg-capacity"
    ],
    "dataset": {
      "name": "European Hydrogen Observatory (electrolyser capacity, hydrogen production)",
      "url": "https://observatory.clean-hydrogen.europa.eu/"
    }
  },
  {
    "key": "ccs",
    "label": "CO₂ capture, transport and storage capacity",
    "unit": "Mt CO₂/yr",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [
      "beta-ccs-capacity",
      "engineered-cdr-capacity"
    ],
    "dataset": {
      "name": "IEA CCUS Projects Explorer; NZIA Art. 23 CO₂ injection-capacity reporting",
      "url": "https://www.iea.org/data-and-statistics/data-tools/ccus-projects-explorer"
    }
  },
  {
    "key": "energy-methane",
    "label": "Energy-sector methane emissions",
    "unit": "Mt CO₂eq",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "adv-energy-methane",
      "esabcc-e6-energy-ch4"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 1.B (fugitive emissions); IEA Global Methane Tracker",
      "url": "https://www.iea.org/data-and-statistics/data-tools/methane-tracker"
    }
  },
  {
    "key": "energy-poverty",
    "label": "Energy poverty",
    "unit": "% of population",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "adv-energy-poverty",
      "energy-poverty-share"
    ],
    "dataset": {
      "name": "Eurostat ilc_mdes01 (inability to keep home adequately warm)",
      "url": "https://doi.org/10.2908/ILC_MDES01"
    }
  },
  {
    "key": "fossil-share-energy",
    "label": "Fossil-fuel share of gross available energy and import dependency",
    "unit": "%",
    "sector": "energy",
    "direction": "down",
    "indicator_ids": [
      "beta-fossil-share-gae"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_ffgae and nrg_ind_id (import dependency)",
      "url": "https://doi.org/10.2908/NRG_IND_FFGAE"
    }
  },
  {
    "key": "heating-cooling",
    "label": "Renewable share in heating and cooling, and district heating",
    "unit": "%",
    "sector": "energy",
    "direction": "up",
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_ren (RES-H&C component); EED Art. 26 district-heating reporting",
      "url": "https://doi.org/10.2908/NRG_IND_REN"
    }
  },
  {
    "key": "transport-ghg",
    "label": "Transport GHG emissions",
    "unit": "Mt CO₂eq",
    "sector": "transport",
    "direction": "down",
    "indicator_ids": [
      "esabcc-t1-transport-ghg",
      "beta-transport-fec"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 1.A.3; Eurostat nrg_bal_c (transport final energy)",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "car-co2",
    "label": "CO₂ intensity of new light-duty vehicles",
    "unit": "g CO₂/km",
    "sector": "transport",
    "direction": "down",
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "dataset": {
      "name": "EEA monitoring of CO₂ emissions from new passenger cars and vans (Reg. (EU) 2019/631)",
      "url": "https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b"
    }
  },
  {
    "key": "hdv-co2",
    "label": "CO₂ intensity and zero-emission share of heavy-duty vehicles",
    "unit": "g CO₂/tkm · %",
    "sector": "transport",
    "direction": "down",
    "indicator_ids": [
      "esabcc-t5b-zev-lorries-stock",
      "zev-share-truck-stock"
    ],
    "dataset": {
      "name": "VECTO/CO₂ HDV monitoring database (Reg. (EU) 2018/956); EAFO fleet statistics",
      "url": "https://co2hdv.jrc.ec.europa.eu/"
    }
  },
  {
    "key": "zev-uptake",
    "label": "Zero-emission vehicle uptake",
    "unit": "% of registrations · % of stock",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [
      "adv-bev-share",
      "esabcc-t5a-zev-share-newcars",
      "ev-share-new-cars",
      "zev-share-car-stock",
      "zev-share-van-stock"
    ],
    "dataset": {
      "name": "European Alternative Fuels Observatory (EAFO) vehicle statistics",
      "url": "https://alternative-fuels-observatory.ec.europa.eu/"
    }
  },
  {
    "key": "charging-infrastructure",
    "label": "Recharging and refuelling infrastructure deployment",
    "unit": "points · MW",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [
      "zev-charging-points"
    ],
    "dataset": {
      "name": "EAFO recharging/refuelling point statistics (AFIR Art. 20 reporting)",
      "url": "https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27/infrastructure"
    }
  },
  {
    "key": "shore-power",
    "label": "Shore-side electricity supply at ports and airports",
    "unit": "installations · %",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "EMSA/EAFO onshore power supply monitoring (AFIR Arts. 9–12 reporting)",
      "url": "https://alternative-fuels-observatory.ec.europa.eu/transport-mode/shipping"
    }
  },
  {
    "key": "aviation-fuels",
    "label": "Sustainable aviation fuel share",
    "unit": "% of fuel uplifted",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "EASA/EUROCONTROL ReFuelEU Aviation annual reporting (Reg. (EU) 2023/2405 Art. 13)",
      "url": "https://www.easa.europa.eu/eco/eaer"
    }
  },
  {
    "key": "maritime-fuels",
    "label": "GHG intensity of energy used on board ships",
    "unit": "g CO₂e/MJ",
    "sector": "transport",
    "direction": "down",
    "indicator_ids": [],
    "dataset": {
      "name": "THETIS-MRV shipping emissions database; FuelEU Maritime Art. 24 reporting",
      "url": "https://mrv.emsa.europa.eu/"
    }
  },
  {
    "key": "modal-shift",
    "label": "Modal split of passenger and freight transport",
    "unit": "% of pkm · % of tkm",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "dataset": {
      "name": "Eurostat tran_hv_ms_frmod and tran_hv_psmod (modal split)",
      "url": "https://doi.org/10.2908/TRAN_HV_FRMOD"
    }
  },
  {
    "key": "transport-demand",
    "label": "Passenger and freight transport demand",
    "unit": "Gpkm · Gtkm",
    "sector": "transport",
    "direction": "context",
    "indicator_ids": [
      "esabcc-t2a-passenger-demand",
      "esabcc-t2b-freight-demand",
      "esabcc-t3b-air-passenger",
      "air-passengers-per-capita"
    ],
    "dataset": {
      "name": "Eurostat transport statistics (tran_hv_pstra, road_go_ta_tott, avia_paoc)",
      "url": "https://ec.europa.eu/eurostat/web/transport/database"
    }
  },
  {
    "key": "transport-renewables",
    "label": "Renewable and low-carbon fuel share in transport",
    "unit": "%",
    "sector": "transport",
    "direction": "up",
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "dataset": {
      "name": "Eurostat nrg_ind_ren (RES-T component); RED III Art. 25 reporting",
      "url": "https://doi.org/10.2908/NRG_IND_REN"
    }
  },
  {
    "key": "buildings-ghg",
    "label": "Building-stock GHG emissions and energy use",
    "unit": "Mt CO₂eq · TWh",
    "sector": "buildings",
    "direction": "down",
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 1.A.4; Eurostat nrg_bal_c (households and services)",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "renovation",
    "label": "Building renovation rate and depth",
    "unit": "%/yr",
    "sector": "buildings",
    "direction": "up",
    "indicator_ids": [
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate"
    ],
    "dataset": {
      "name": "EU Building Stock Observatory renovation indicators; EPBD Art. 3 national building renovation plans",
      "url": "https://building-stock-observatory.energy.ec.europa.eu/"
    }
  },
  {
    "key": "zero-emission-buildings",
    "label": "Zero-emission and nearly zero-energy new buildings",
    "unit": "% of new buildings",
    "sector": "buildings",
    "direction": "up",
    "indicator_ids": [
      "beta-nzeb-new-share"
    ],
    "dataset": {
      "name": "EU Building Stock Observatory (new-build performance); EPBD Art. 11 reporting",
      "url": "https://building-stock-observatory.energy.ec.europa.eu/"
    }
  },
  {
    "key": "heating-equipment",
    "label": "Heat pumps and fossil-boiler phase-out",
    "unit": "million units · %",
    "sector": "buildings",
    "direction": "up",
    "indicator_ids": [
      "adv-heat-pump-sales",
      "esabcc-b6-heat-pump-stock",
      "esabcc-b5a-residential-fossil-share",
      "esabcc-b5b-tertiary-fossil-share",
      "heat-pump-stock",
      "heat-pump-sales"
    ],
    "dataset": {
      "name": "EHPA European heat pump market report; Eurostat nrg_bal_c (residential fuel mix)",
      "url": "https://www.ehpa.org/market-data/"
    }
  },
  {
    "key": "floor-space",
    "label": "Floor space and building-stock size",
    "unit": "index · m²/person",
    "sector": "buildings",
    "direction": "context",
    "indicator_ids": [
      "esabcc-b4-dwellings",
      "esabcc-b4-floor-area",
      "esabcc-b4-surface-residential",
      "esabcc-b4-surface-tertiary",
      "floor-space-per-capita"
    ],
    "dataset": {
      "name": "EU Building Stock Observatory floor-area statistics",
      "url": "https://building-stock-observatory.energy.ec.europa.eu/"
    }
  },
  {
    "key": "industry-ghg",
    "label": "Industrial GHG emissions and energy use",
    "unit": "Mt CO₂eq · TWh",
    "sector": "industry",
    "direction": "down",
    "indicator_ids": [
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 1.A.2 + 2; Eurostat nrg_bal_c (industry)",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "basic-materials",
    "label": "GHG intensity and output of basic materials (steel, cement, chemicals)",
    "unit": "t CO₂eq/t · Mt",
    "sector": "industry",
    "direction": "down",
    "indicator_ids": [
      "esabcc-i4-steel-ghg-intensity",
      "esabcc-i4-cement-ghg-intensity",
      "esabcc-i4-chemicals-ghg-intensity",
      "esabcc-i2-steel-production",
      "esabcc-i2-cement-production",
      "esabcc-i2-chemicals-production",
      "esabcc-i7a-steel-projects",
      "esabcc-i7b-cement-projects",
      "esabcc-i7c-chemicals-projects"
    ],
    "dataset": {
      "name": "Eurostat PRODCOM; EU ETS verified emissions by activity",
      "url": "https://ec.europa.eu/eurostat/web/prodcom"
    }
  },
  {
    "key": "circularity",
    "label": "Circular material use and resource productivity",
    "unit": "% · EUR/kg",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "dataset": {
      "name": "Eurostat cei_srm030 (circular material use rate), env_ac_mfa (material flows)",
      "url": "https://doi.org/10.2908/CEI_SRM030"
    }
  },
  {
    "key": "waste-recycling",
    "label": "Waste generation, recycling and landfill rates",
    "unit": "% · kg/capita",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "Eurostat env_waspac (packaging waste), env_wasmun (municipal waste)",
      "url": "https://doi.org/10.2908/ENV_WASPAC"
    }
  },
  {
    "key": "fgas",
    "label": "Fluorinated greenhouse gases placed on the market",
    "unit": "Mt CO₂eq",
    "sector": "industry",
    "direction": "down",
    "indicator_ids": [],
    "dataset": {
      "name": "EEA F-gas reporting under Reg. (EU) 2024/573 (HFC quota and placing on the market)",
      "url": "https://www.eea.europa.eu/en/analysis/indicators/fluorinated-greenhouse-gas-emissions"
    }
  },
  {
    "key": "cleantech-manufacturing",
    "label": "EU clean-tech manufacturing capacity",
    "unit": "GW/yr · % of demand",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "dataset": {
      "name": "NZIA Art. 42 monitoring; JRC Clean Energy Technology Observatory",
      "url": "https://setis.ec.europa.eu/publications/clean-energy-technology-observatory-reports_en"
    }
  },
  {
    "key": "critical-raw-materials",
    "label": "Critical raw material capacity and supply concentration",
    "unit": "% of consumption",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "JRC Raw Materials Information System (RMIS); CRMA Art. 5 benchmark monitoring",
      "url": "https://rmis.jrc.ec.europa.eu/"
    }
  },
  {
    "key": "batteries",
    "label": "Battery performance, collection and recycled content",
    "unit": "% · Wh/kg",
    "sector": "industry",
    "direction": "up",
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "dataset": {
      "name": "Batteries Regulation Art. 75 reporting; Eurostat env_wasbat (battery collection)",
      "url": "https://doi.org/10.2908/ENV_WASBAT"
    }
  },
  {
    "key": "industrial-pollution",
    "label": "Industrial pollutant releases",
    "unit": "kt/yr",
    "sector": "industry",
    "direction": "down",
    "indicator_ids": [],
    "dataset": {
      "name": "Industrial Emissions Portal (E-PRTR successor, Reg. (EU) 2024/1244)",
      "url": "https://industry.eea.europa.eu/"
    }
  },
  {
    "key": "agri-ghg",
    "label": "Agricultural GHG emissions",
    "unit": "Mt CO₂eq",
    "sector": "agrifood",
    "direction": "down",
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 3 (agriculture)",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "nutrients",
    "label": "Fertiliser use and nutrient balance",
    "unit": "Mt N · kg N/ha",
    "sector": "agrifood",
    "direction": "down",
    "indicator_ids": [
      "adv-nitrogen-balance",
      "esabcc-a3-fertiliser-use",
      "esabcc-a3-nue",
      "nitrogen-fertiliser-use"
    ],
    "dataset": {
      "name": "Eurostat aei_pr_gnb (gross nutrient balance), aei_fm_usefert",
      "url": "https://doi.org/10.2908/AEI_PR_GNB"
    }
  },
  {
    "key": "livestock",
    "label": "Livestock numbers and animal-product output",
    "unit": "million heads · Mt",
    "sector": "agrifood",
    "direction": "context",
    "indicator_ids": [
      "esabcc-a4-bovine-herd-size",
      "esabcc-a4-dairy-herd-size",
      "esabcc-a4-pig-herd-size",
      "cattle-population"
    ],
    "dataset": {
      "name": "Eurostat apro_mt_lscatl and apro_mk_pobta (livestock and milk statistics)",
      "url": "https://doi.org/10.2908/APRO_MT_LSCATL"
    }
  },
  {
    "key": "diets-food-waste",
    "label": "Diets, food consumption and food waste",
    "unit": "kcal/cap/day · kg/cap/yr",
    "sector": "agrifood",
    "direction": "down",
    "indicator_ids": [
      "esabcc-a5-bovine-consumption",
      "esabcc-a5-dairy-consumption",
      "esabcc-a5-pig-consumption",
      "esabcc-a6-food-waste",
      "food-waste-per-capita",
      "meat-consumption-per-capita"
    ],
    "dataset": {
      "name": "Eurostat env_wasfw (food waste); FAO food balance sheets",
      "url": "https://doi.org/10.2908/ENV_WASFW"
    }
  },
  {
    "key": "organic-pesticides",
    "label": "Organic farming and pesticide use",
    "unit": "% of UAA",
    "sector": "agrifood",
    "direction": "up",
    "indicator_ids": [
      "adv-organic-farming",
      "organic-farming-share"
    ],
    "dataset": {
      "name": "Eurostat org_cropar (organic area), aei_fm_salpest09 (pesticide sales)",
      "url": "https://doi.org/10.2908/ORG_CROPAR"
    }
  },
  {
    "key": "bioenergy-feedstock",
    "label": "Biomass and bioenergy use",
    "unit": "TWh · Mt",
    "sector": "agrifood",
    "direction": "context",
    "indicator_ids": [
      "esabcc-a7-bioenergy-feedstock",
      "esabcc-l8-bioenergy-use"
    ],
    "dataset": {
      "name": "Eurostat nrg_bal_c (bioenergy); JRC Biomass Mandate biomass flows",
      "url": "https://joint-research-centre.ec.europa.eu/jrc-mission-statement-work-programme/knowledge-centre-bioeconomy_en"
    }
  },
  {
    "key": "lulucf-sink",
    "label": "LULUCF net emissions and removals",
    "unit": "Mt CO₂eq",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "dataset": {
      "name": "EEA GHG inventory CRF 4 (LULUCF); LULUCF Regulation compliance reporting",
      "url": "https://www.eea.europa.eu/en/datahub"
    }
  },
  {
    "key": "forests",
    "label": "Forest carbon sink, afforestation and deforestation",
    "unit": "Mt CO₂eq · thousand ha/yr",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [
      "adv-forest-sink-decline",
      "esabcc-l3-afforestation",
      "esabcc-l4-deforestation",
      "esabcc-l6-forest-sink",
      "esabcc-l2-forest-area",
      "forest-net-sink",
      "harvested-wood-pool"
    ],
    "dataset": {
      "name": "Eurostat for_area (forest area); EEA LULUCF forest-land fluxes; JRC Forest Observatory",
      "url": "https://forest-observatory.ec.europa.eu/"
    }
  },
  {
    "key": "peatlands-soils",
    "label": "Peatlands, organic soils and soil health",
    "unit": "Mt CO₂/yr · ha",
    "sector": "ecosystems",
    "direction": "down",
    "indicator_ids": [
      "adv-peatland-emissions",
      "beta-cropland-grassland-flux",
      "beta-wetlands-flux",
      "esabcc-l2-cropland-area",
      "esabcc-l2-grassland-area",
      "esabcc-l2-wetland-area"
    ],
    "dataset": {
      "name": "EEA LULUCF category fluxes; LUCAS Soil survey (Eurostat/JRC)",
      "url": "https://esdac.jrc.ec.europa.eu/projects/lucas"
    }
  },
  {
    "key": "restoration",
    "label": "Ecosystem restoration area under the Nature Restoration Regulation",
    "unit": "% of area",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "National restoration plans and Art. 21 reporting (Reg. (EU) 2024/1991); EEA restoration dashboard",
      "url": "https://environment.ec.europa.eu/topics/nature-and-biodiversity/nature-restoration-regulation_en"
    }
  },
  {
    "key": "biodiversity-status",
    "label": "Habitat and species conservation status, protected areas",
    "unit": "% of habitats · % of land and sea",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "Habitats Directive Art. 17 conservation-status reporting; Natura 2000 Barometer (EEA)",
      "url": "https://www.eea.europa.eu/en/topics/in-depth/biodiversity"
    }
  },
  {
    "key": "marine-status",
    "label": "Marine environmental status",
    "unit": "% of marine area",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "MSFD Art. 17 good-environmental-status assessments (WISE-Marine)",
      "url": "https://water.europa.eu/marine"
    }
  },
  {
    "key": "urban-green",
    "label": "Urban green space and tree canopy",
    "unit": "% of urban area",
    "sector": "ecosystems",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "Copernicus Urban Atlas green-infrastructure layers (NRR Art. 8 baseline)",
      "url": "https://land.copernicus.eu/local/urban-atlas"
    }
  },
  {
    "key": "water-stress",
    "label": "Water stress and abstraction",
    "unit": "% of renewable freshwater",
    "sector": "water",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "dataset": {
      "name": "EEA Water Exploitation Index Plus (WEI+)",
      "url": "https://www.eea.europa.eu/en/analysis/indicators/use-of-freshwater-resources-in-europe-1"
    }
  },
  {
    "key": "water-quality",
    "label": "Ecological and chemical status of water bodies",
    "unit": "% of water bodies",
    "sector": "water",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "WISE State of Water (WFD river basin management plan reporting)",
      "url": "https://water.europa.eu/freshwater"
    }
  },
  {
    "key": "water-reuse-leakage",
    "label": "Water reuse and network leakage",
    "unit": "% · m³",
    "sector": "water",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "EurEau/WISE water-loss statistics; Reg. (EU) 2020/741 water-reuse reporting",
      "url": "https://water.europa.eu/freshwater"
    }
  },
  {
    "key": "floods-droughts",
    "label": "Flood and drought exposure",
    "unit": "% of population · km²",
    "sector": "water",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "dataset": {
      "name": "Copernicus EFAS/EDO drought and flood indicators; Floods Directive Art. 15 reporting",
      "url": "https://european-flood.emergency.copernicus.eu/"
    }
  },
  {
    "key": "heat-health",
    "label": "Heat exposure and heat-related mortality",
    "unit": "deaths/yr · CDD index",
    "sector": "health",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-heat-mortality",
      "adv-adapt-cooling-degree-days",
      "beta-adapt-heat-mortality",
      "beta-adapt-cooling-degree-days"
    ],
    "dataset": {
      "name": "Eurostat nrg_chdd (cooling degree days); EuroMOMO / Lancet Countdown Europe heat mortality",
      "url": "https://doi.org/10.2908/NRG_CHDD"
    }
  },
  {
    "key": "infectious-disease",
    "label": "Climate-sensitive infectious disease burden",
    "unit": "cases/yr",
    "sector": "health",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-west-nile"
    ],
    "dataset": {
      "name": "ECDC Surveillance Atlas of Infectious Diseases (vector-borne and water-borne)",
      "url": "https://atlas.ecdc.europa.eu/"
    }
  },
  {
    "key": "air-quality",
    "label": "Air quality and pollution-related health burden",
    "unit": "µg/m³ · premature deaths",
    "sector": "health",
    "direction": "down",
    "indicator_ids": [],
    "dataset": {
      "name": "EEA Air Quality e-Reporting database and health-impact assessments",
      "url": "https://www.eea.europa.eu/en/topics/in-depth/air-pollution"
    }
  },
  {
    "key": "health-preparedness",
    "label": "Health-system preparedness and response capacity",
    "unit": "count of Member States · capacities",
    "sector": "health",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "ECDC/HERA preparedness and response planning reporting (Reg. (EU) 2022/2371 Art. 7)",
      "url": "https://www.ecdc.europa.eu/en/all-topics/preparedness-and-response"
    }
  },
  {
    "key": "adaptation-governance",
    "label": "National adaptation strategies, plans and risk assessments",
    "unit": "count of Member States",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "dataset": {
      "name": "EEA Climate-ADAPT country profiles; Governance Regulation Art. 19 adaptation reporting",
      "url": "https://climate-adapt.eea.europa.eu/en/countries-regions/countries"
    }
  },
  {
    "key": "adaptation-local",
    "label": "Local and regional adaptation planning",
    "unit": "% of cities · signatories",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "adv-adapt-cities-plans",
      "adapt-out-mission-charter-signatories",
      "adapt-out-com-adaptation-signatories"
    ],
    "dataset": {
      "name": "Covenant of Mayors Europe signatory database; EU Mission on Adaptation Charter",
      "url": "https://eu-mayors.ec.europa.eu/en/scoreboard"
    }
  },
  {
    "key": "climate-losses",
    "label": "Economic losses from weather and climate extremes",
    "unit": "EUR bn/yr",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-economic-losses",
      "climate-economic-losses",
      "adv-adapt-coastal-transport-damage",
      "beta-adapt-transport-coastal-damage",
      "beta-adapt-energy-drought-damage"
    ],
    "dataset": {
      "name": "EEA economic losses from weather- and climate-related extremes (CATDAT-based)",
      "url": "https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related"
    }
  },
  {
    "key": "insurance-gap",
    "label": "Climate insurance protection gap",
    "unit": "% of losses uninsured",
    "sector": "cross-cutting",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-insurance-gap",
      "beta-adapt-insurance-gap"
    ],
    "dataset": {
      "name": "EIOPA dashboard on insurance protection gap for natural catastrophes",
      "url": "https://www.eiopa.europa.eu/tools-and-data/dashboard-insurance-protection-gap-natural-catastrophes_en"
    }
  },
  {
    "key": "early-warning",
    "label": "Early warning and civil-protection capacity",
    "unit": "services · capacities",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "dataset": {
      "name": "Copernicus EFAS/EFFIS service coverage; rescEU capacity reporting (Dec. 1313/2013)",
      "url": "https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection/resceu_en"
    }
  },
  {
    "key": "wildfire",
    "label": "Wildfire burnt area and forest disturbance",
    "unit": "hectares/yr",
    "sector": "ecosystems",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-burnt-area",
      "beta-adapt-burnt-area",
      "adv-adapt-forest-disturbance"
    ],
    "dataset": {
      "name": "Copernicus EFFIS European Forest Fire Information System",
      "url": "https://forest-fire.emergency.copernicus.eu/"
    }
  },
  {
    "key": "infrastructure-resilience",
    "label": "Resilience of critical infrastructure and networks",
    "unit": "% of network · entities",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "beta-adapt-rail-disruption"
    ],
    "dataset": {
      "name": "CER Directive Art. 9 critical-entity reporting; ENTSO-E incident classification scale",
      "url": "https://home-affairs.ec.europa.eu/policies/internal-security/counter-terrorism-and-radicalisation/protection_en"
    }
  },
  {
    "key": "climate-science-observation",
    "label": "Climate observation, projections and knowledge base",
    "unit": "datasets · services",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "adv-adapt-global-temp",
      "adv-adapt-sea-level"
    ],
    "dataset": {
      "name": "Copernicus Climate Change Service (C3S) and Climate-ADAPT knowledge base",
      "url": "https://climate.copernicus.eu/"
    }
  },
  {
    "key": "international-climate",
    "label": "International climate finance and cooperation",
    "unit": "EUR bn",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [
      "international-climate-finance"
    ],
    "dataset": {
      "name": "EU biennial transparency report / OECD DAC climate-related development finance",
      "url": "https://www.oecd.org/en/topics/climate-finance.html"
    }
  },
  {
    "key": "crop-drought-yield",
    "label": "Climate impacts on crop yields",
    "unit": "% yield loss",
    "sector": "agrifood",
    "direction": "down",
    "indicator_ids": [
      "adv-adapt-crop-loss"
    ],
    "dataset": {
      "name": "JRC MARS crop-yield forecasts; Copernicus EDO agricultural drought indicators",
      "url": "https://joint-research-centre.ec.europa.eu/monitoring-agricultural-resources-mars_en"
    }
  },
  {
    "key": "compliance-milestone",
    "label": "Compliance milestone (act done / not done by the deadline)",
    "unit": "met / not met",
    "sector": "cross-cutting",
    "direction": "up",
    "indicator_ids": [],
    "dataset": {
      "name": "The act's own reporting obligation (Commission implementation reports, EUR-Lex national transposition measures)",
      "url": "https://eur-lex.europa.eu/collection/eu-law/inter-measures.html"
    }
  }
];

export const RAW_TARGET_ASSESSMENTS: RawTargetAssessment[] = [
  {
    "id": "tgt-009edd20",
    "policy_id": "afir-regulation",
    "label": "Targets for recharging infrastructure dedicated to light-duty electric vehicles",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a5baad46",
    "policy_id": "afir-regulation",
    "label": "for each light-duty battery electric vehicle registered in their territory, a total…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c7fb7ca2",
    "policy_id": "afir-regulation",
    "label": "for each light-duty plug-in hybrid vehicle registered in their territory, a total power…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2bc0527f",
    "policy_id": "afir-regulation",
    "label": "along the TEN-T core road network, publicly accessible recharging pools dedicated to…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging pool*",
        "publicly accessible",
        "recharging"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1d85bb03",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2025, each recharging pool offers a power output of at least 400 kW and…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-667001e9",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2027, each recharging pool offers a power output of at least 600 kW and…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9cb011ef",
    "policy_id": "afir-regulation",
    "label": "along the TEN-T comprehensive road network, publicly accessible recharging pools…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging pool*",
        "publicly accessible",
        "recharging"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e206f70b",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2027, along at least 50 % of the length of the TEN-T comprehensive road…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2c9e6749",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2030, each recharging pool offers a power output of at least 300 kW and…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c032b615",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2035, each recharging pool offers a power output of at least 600 kW and…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1d13d77c",
    "policy_id": "afir-regulation",
    "label": "Targets for recharging infrastructure dedicated to heavy-duty electric vehicles",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "publicly accessible",
        "recharging"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a675f706",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2025, along at least 15 % of the length of the TEN-T road network,…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2e9619e4",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2027, along at least 50 % of the length of the TEN-T road network,…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging pool*",
        "publicly accessible",
        "recharging"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b8b261df",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2030, along the TEN-T core road network, publicly accessible recharging…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-985392c5",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2030, along the TEN-T comprehensive road network, publicly accessible…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging pool*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-414687de",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2027, in each safe and secure parking area at least two publicly…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3914b0a3",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2030, in each safe and secure parking area at least four publicly…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c84353b0",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2025, in each urban node publicly accessible recharging points dedicated…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ad99e542",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2030, in each urban node publicly accessible recharging points dedicated…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging station*",
        "publicly accessible",
        "recharging",
        "power output"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ba1eca66",
    "policy_id": "afir-regulation",
    "label": "Targets for hydrogen refuelling infrastructure of road vehicles",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "hydrogen refuelling",
        "publicly accessible",
        "refuelling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-64e17c9a",
    "policy_id": "afir-regulation",
    "label": "To that end, Member States shall ensure that by 31 December 2030 publicly accessible…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "hydrogen refuelling",
        "publicly accessible",
        "refuelling",
        "ten-t core network"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e2381291",
    "policy_id": "afir-regulation",
    "label": "Member States shall ensure that, by 31 December 2030, at least one publicly accessible…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "hydrogen refuelling",
        "publicly accessible",
        "refuelling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7c64b132",
    "policy_id": "afir-regulation",
    "label": "Targets for shore-side electricity supply in maritime ports",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power",
      "maritime-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "shore-side electricity",
        "maritime port*"
      ],
      "maritime-fuels": [
        "ship*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8b105bf9",
    "policy_id": "afir-regulation",
    "label": "TEN-T core maritime ports and TEN-T comprehensive maritime ports for which the annual…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "shore-side electricity",
        "maritime port*",
        "moored"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-867264a9",
    "policy_id": "afir-regulation",
    "label": "TEN-T core maritime ports and TEN-T comprehensive maritime ports for which the annual…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "shore-side electricity",
        "maritime port*",
        "moored"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e2aa825d",
    "policy_id": "afir-regulation",
    "label": "TEN-T core maritime ports and TEN-T comprehensive maritime ports for which the annual…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "shore-side electricity",
        "maritime port*",
        "moored"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d78f9658",
    "policy_id": "afir-regulation",
    "label": "Targets for shore-side electricity supply in inland waterway ports",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "modal-shift",
      "shore-power"
    ],
    "indicator_ids": [
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "evidence": {
      "modal-shift": [
        "inland waterway*",
        "ten-t"
      ],
      "shore-power": [
        "shore-side electricity"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-082f27a7",
    "policy_id": "afir-regulation",
    "label": "at least one installation providing shore-side electricity supply to inland waterway…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "modal-shift",
      "shore-power"
    ],
    "indicator_ids": [
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "evidence": {
      "modal-shift": [
        "inland waterway*",
        "ten-t"
      ],
      "shore-power": [
        "shore-side electricity"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a839356f",
    "policy_id": "afir-regulation",
    "label": "Targets for supply of liquefied methane in maritime ports",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "refuelling point*",
        "refuelling",
        "ten-t core network"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3e0be761",
    "policy_id": "afir-regulation",
    "label": "Targets for supply of electricity to stationary aircraft",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "electricity supply to stationary aircraft",
        "airport*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-32fbe5f8",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2024, at all aircraft contact stands used for commercial air transport…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "aircraft contact stand*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6f1c7eb1",
    "policy_id": "afir-regulation",
    "label": "by 31 December 2029, at all aircraft remote stands used for commercial air transport…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "shore-power": [
        "aircraft remote stand*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a341c43f",
    "policy_id": "afir-regulation",
    "label": "As of 1 January 2030 at the latest, Member States shall take the necessary measures to…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "fossil-share-energy",
      "grid-infrastructure"
    ],
    "indicator_ids": [
      "beta-fossil-share-gae",
      "battery-storage-capacity",
      "smart-meter-rollout"
    ],
    "evidence": {
      "fossil-share-energy": [
        "fossil fuel*"
      ],
      "grid-infrastructure": [
        "grid"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0648a8b9",
    "policy_id": "batteries-regulation",
    "label": "recycling of 75 % by average weight of lead-acid batteries;",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "waste-recycling",
      "batteries"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ],
      "batteries": [
        "batter*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-dcca0c91",
    "policy_id": "batteries-regulation",
    "label": "recycling of 65 % by average weight of lithium-based batteries;",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "batteries",
      "waste-recycling"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "batteries": [
        "batter*",
        "lithium"
      ],
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ac4e687c",
    "policy_id": "batteries-regulation",
    "label": "recycling of 80 % by average weight of nickel-cadmium batteries;",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "batteries",
      "waste-recycling"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "batteries": [
        "batter*",
        "nickel"
      ],
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-631a4288",
    "policy_id": "batteries-regulation",
    "label": "recycling of 50 % by average weight of other waste batteries.",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "waste-recycling",
      "batteries"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ],
      "batteries": [
        "batter*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b4729590",
    "policy_id": "batteries-regulation",
    "label": "recycling of 80 % by average weight of lead-acid batteries;",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "waste-recycling",
      "batteries"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ],
      "batteries": [
        "batter*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e6eda40b",
    "policy_id": "batteries-regulation",
    "label": "recycling of 70 % by average weight of lithium-based batteries.",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "batteries",
      "waste-recycling"
    ],
    "indicator_ids": [
      "battery-mfg-capacity"
    ],
    "evidence": {
      "batteries": [
        "batter*",
        "lithium"
      ],
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d73de49a",
    "policy_id": "birds-directive",
    "label": "In the light of the requirements referred to in Article 2, Member States shall take the…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "species",
        "habitat*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8fd7ecd2",
    "policy_id": "birds-directive",
    "label": "The species mentioned in Annex I shall be the subject of special conservation measures…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "species",
        "habitat*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-fcee3e48",
    "policy_id": "cap-strategic-plans",
    "label": "General objectives, point (b)",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "international-climate",
      "agri-ghg",
      "biodiversity-status"
    ],
    "indicator_ids": [
      "international-climate-finance",
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "evidence": {
      "international-climate": [
        "paris agreement"
      ],
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ],
      "biodiversity-status": [
        "biodiversity"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1fdf0d05",
    "policy_id": "cap-strategic-plans",
    "label": "Specific objectives (1), point (d)",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance",
      "agri-ghg",
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies",
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg",
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation"
      ],
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ],
      "lulucf-sink": [
        "sequestration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e2fd1e7f",
    "policy_id": "cap-strategic-plans",
    "label": "Specific objectives (1), point (f)",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "biodiversity",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-71394e15",
    "policy_id": "cap-strategic-plans",
    "label": "Specific rules on Union financial assistance to the wine sector",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "energy-consumption",
      "agri-ghg"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption",
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "evidence": {
      "energy-consumption": [
        "energy efficiency",
        "energy saving*"
      ],
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-249f062b",
    "policy_id": "cap-strategic-plans",
    "label": "Minimum financial allocations for interventions addressing environmental and climate-…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "agri-ghg",
      "livestock"
    ],
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg",
      "esabcc-a4-bovine-herd-size",
      "esabcc-a4-dairy-herd-size",
      "esabcc-a4-pig-herd-size",
      "cattle-population"
    ],
    "evidence": {
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ],
      "livestock": [
        "animal*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6c3bf26d",
    "policy_id": "cap-strategic-plans",
    "label": "Minimum financial allocations for eco-schemes (1)",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "agri-ghg",
      "organic-pesticides"
    ],
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg",
      "adv-organic-farming",
      "organic-farming-share"
    ],
    "evidence": {
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ],
      "organic-pesticides": [
        "eco-scheme*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-44850cc4",
    "policy_id": "cap-strategic-plans",
    "label": "Minimum financial allocations for the redistributive income support (1)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "agri-ghg"
    ],
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "evidence": {
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-478572a0",
    "policy_id": "co2-cars-regulation",
    "label": "Subject matter and objectives",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "new light commercial vehicle*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-742f6eb4",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new passenger car fleet, an EU fleet-wide target equal…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-79a06394",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new light commercial vehicles fleet, an EU fleet-wide…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "new light commercial vehicle*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e4063c9d",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new passenger car fleet, an EU fleet-wide target equal…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3e12eaf0",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new passenger car fleet, an EU fleet-wide target equal…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5c1c2fd6",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new light commercial vehicles fleet, an EU fleet- wide…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "new light commercial vehicle*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bdeab1af",
    "policy_id": "co2-cars-regulation",
    "label": "for the average emissions of the new light commercial vehicles fleet, an EU fleet-wide…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "eu fleet-wide target*",
        "new light commercial vehicle*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7df59417",
    "policy_id": "co2-cars-regulation",
    "label": "From 1 January 2025 to 31 December 2029, a zero- and low-emission vehicles' benchmark…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "new light commercial vehicle*",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5f47f8c2",
    "policy_id": "co2-cars-regulation",
    "label": "Specific emissions targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "car-co2"
    ],
    "indicator_ids": [
      "adv-new-car-co2",
      "esabcc-t4-car-co2-intensity",
      "beta-new-car-co2"
    ],
    "evidence": {
      "car-co2": [
        "specific emissions of co2",
        "passenger car*",
        "light commercial vehicle*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4d13b442",
    "policy_id": "common-provisions-regulation",
    "label": "policy objective 2 (greener, low-carbon)",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "cohesion-funds",
      "circularity",
      "transport-demand"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity",
      "esabcc-t2a-passenger-demand",
      "esabcc-t2b-freight-demand",
      "esabcc-t3b-air-passenger",
      "air-passengers-per-capita"
    ],
    "evidence": {
      "cohesion-funds": [
        "erdf",
        "cohesion fund"
      ],
      "circularity": [
        "circular econom*"
      ],
      "transport-demand": [
        "urban mobility"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cfb70166",
    "policy_id": "common-provisions-regulation",
    "label": "The JTF shall support the specific objective of enabling regions and people to address…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total",
      "cohesion-funds"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate-neutral",
        "climate-neutral economy"
      ],
      "cohesion-funds": [
        "erdf",
        "cohesion fund"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-12c33847",
    "policy_id": "common-provisions-regulation",
    "label": "climate targets (30%/37% contribution)",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "cohesion-funds"
    ],
    "indicator_ids": [],
    "evidence": {
      "cohesion-funds": [
        "erdf",
        "cohesion fund"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c0a409a4",
    "policy_id": "competitiveness-compass",
    "label": "decarbonisation framework",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "decarbonised economy",
        "2040 target",
        "decarbonis*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-56f58432",
    "policy_id": "critical-raw-materials-act",
    "label": "Union extraction capacity is capable of extracting the ores, minerals or concentrates…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "critical-raw-materials"
    ],
    "indicator_ids": [],
    "evidence": {
      "critical-raw-materials": [
        "critical raw material*",
        "strategic raw material*",
        "extraction capacity",
        "raw material*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c6198b5f",
    "policy_id": "critical-raw-materials-act",
    "label": "Union processing capacity, including for all intermediate processing steps, is capable…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "critical-raw-materials"
    ],
    "indicator_ids": [],
    "evidence": {
      "critical-raw-materials": [
        "critical raw material*",
        "strategic raw material*",
        "processing capacity",
        "raw material*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-27fe56c5",
    "policy_id": "critical-raw-materials-act",
    "label": "Union recycling capacity, including for all intermediate recycling steps, is capable of…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "critical-raw-materials"
    ],
    "indicator_ids": [],
    "evidence": {
      "critical-raw-materials": [
        "critical raw material*",
        "strategic raw material*",
        "recycling capacity",
        "raw material*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-706e71ff",
    "policy_id": "critical-raw-materials-act",
    "label": "diversify the Union’s imports of strategic raw materials with a view to ensuring that,…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "critical-raw-materials"
    ],
    "indicator_ids": [],
    "evidence": {
      "critical-raw-materials": [
        "critical raw material*",
        "strategic raw material*",
        "raw material*",
        "third country"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-337c264c",
    "policy_id": "deforestation-regulation",
    "label": "Subject matter and scope",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "biodiversity-status",
      "forests",
      "international-climate"
    ],
    "indicator_ids": [
      "adv-forest-sink-decline",
      "esabcc-l3-afforestation",
      "esabcc-l4-deforestation",
      "esabcc-l6-forest-sink",
      "esabcc-l2-forest-area",
      "forest-net-sink",
      "harvested-wood-pool",
      "international-climate-finance"
    ],
    "evidence": {
      "biodiversity-status": [
        "biodiversity"
      ],
      "forests": [
        "deforest*"
      ],
      "international-climate": [
        "global"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3dadfa86",
    "policy_id": "effort-sharing-regulation",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality",
        "emission reduction*",
        "negative emissions"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-131f748f",
    "policy_id": "effort-sharing-regulation",
    "label": "Annual emission levels for the period from 2021 to 2030",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "esr-emissions"
    ],
    "indicator_ids": [],
    "evidence": {
      "esr-emissions": [
        "effort sharing"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0687280c",
    "policy_id": "effort-sharing-regulation",
    "label": "Annual emission levels for the period from 2021 to 2030",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "esr-emissions"
    ],
    "indicator_ids": [],
    "evidence": {
      "esr-emissions": [
        "effort sharing",
        "annual emission allocation*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d020f28f",
    "policy_id": "eighth-environment-action-programme",
    "label": "long-term priority objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "ghg-total",
      "restoration"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "biodiversity-status": [
        "biodiversity",
        "ecosystem*"
      ],
      "ghg-total": [
        "climate neutrality"
      ],
      "restoration": [
        "restore*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-044d8e2c",
    "policy_id": "eighth-environment-action-programme",
    "label": "thematic objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "just-transition-jobs",
      "ghg-total"
    ],
    "indicator_ids": [
      "environmental-employment",
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "just-transition-jobs": [
        "just transition"
      ],
      "ghg-total": [
        "emission reduction*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c1995bfa",
    "policy_id": "eighth-environment-action-programme",
    "label": "thematic objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptive capacity",
        "adaptation",
        "resilience",
        "preparedness",
        "vulnerabilit*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b6763ec6",
    "policy_id": "eighth-environment-action-programme",
    "label": "thematic objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "circularity",
      "waste-recycling"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "circularity": [
        "circular econom*"
      ],
      "waste-recycling": [
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-10002a64",
    "policy_id": "eighth-environment-action-programme",
    "label": "thematic objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "peatlands-soils"
    ],
    "indicator_ids": [
      "adv-peatland-emissions",
      "beta-cropland-grassland-flux",
      "beta-wetlands-flux",
      "esabcc-l2-cropland-area",
      "esabcc-l2-grassland-area",
      "esabcc-l2-wetland-area"
    ],
    "evidence": {
      "biodiversity-status": [
        "protected area*",
        "biodiversity",
        "ecosystem*"
      ],
      "peatlands-soils": [
        "soil",
        "desertification"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-25097ba7",
    "policy_id": "eighth-environment-action-programme",
    "label": "thematic objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg",
      "diets-food-waste",
      "industry-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-a5-bovine-consumption",
      "esabcc-a5-dairy-consumption",
      "esabcc-a5-pig-consumption",
      "esabcc-a6-food-waste",
      "food-waste-per-capita",
      "meat-consumption-per-capita",
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification"
    ],
    "evidence": {
      "buildings-ghg": [
        "buildings"
      ],
      "diets-food-waste": [
        "food system*"
      ],
      "industry-ghg": [
        "industr*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-de710e8e",
    "policy_id": "eighth-environment-action-programme",
    "label": "enabling condition",
    "rung": "lever",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "biodiversity"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-00b3b2ef",
    "policy_id": "energy-efficiency-directive",
    "label": "Energy efficiency targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "energy-consumption": [
        "final energy consumption",
        "primary energy consumption",
        "energy efficiency target*",
        "energy consumption of",
        "energy efficiency",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ecd28c7f",
    "policy_id": "energy-efficiency-directive",
    "label": "Energy efficiency targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "energy-consumption": [
        "final energy consumption",
        "primary energy consumption",
        "energy efficiency target*",
        "energy efficiency",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cb34e96a",
    "policy_id": "energy-efficiency-directive",
    "label": "Public sector leading on energy efficiency",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "energy-consumption": [
        "final energy consumption",
        "energy consumption of",
        "energy efficiency",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-83435daa",
    "policy_id": "energy-efficiency-directive",
    "label": "Exemplary role of public bodies’ buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floor-space",
      "renovation",
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b4-dwellings",
      "esabcc-b4-floor-area",
      "esabcc-b4-surface-residential",
      "esabcc-b4-surface-tertiary",
      "floor-space-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate",
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "floor-space": [
        "floor area"
      ],
      "renovation": [
        "renovat*"
      ],
      "buildings-ghg": [
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d534e2a7",
    "policy_id": "energy-efficiency-directive",
    "label": "Energy savings obligation",
    "rung": "enabling",
    "route": "milestone",
    "confidence": "strong",
    "families": [
      "compliance-milestone"
    ],
    "indicator_ids": [],
    "evidence": {
      "compliance-milestone": [
        "member states shall"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-17d3600a",
    "policy_id": "energy-efficiency-directive",
    "label": "Energy savings obligation",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption",
      "energy-poverty",
      "governance-necp"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption",
      "adv-energy-poverty",
      "energy-poverty-share",
      "necp-implementation-score",
      "national-climate-laws"
    ],
    "evidence": {
      "energy-consumption": [
        "energy savings obligation",
        "energy efficiency",
        "energy saving*"
      ],
      "energy-poverty": [
        "energy poverty",
        "vulnerable customer*"
      ],
      "governance-necp": [
        "national energy and climate plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3f81d827",
    "policy_id": "energy-efficiency-directive",
    "label": "new savings each year from 1 January 2021 to 31 December 2030 of: (i) 0,8 % of annual…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "energy-consumption": [
        "final energy consumption",
        "energy efficiency",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7c3c42a1",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9b161e18",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e556fea0",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c31a4248",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-35e2d67c",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-64c67d8f",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "waste heat"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-916775f4",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply (GHG emissions criterion)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-44d534d0",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply (GHG emissions criterion)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f665ad36",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply (GHG emissions criterion)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8f201f25",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply (GHG emissions criterion)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9a8d4547",
    "policy_id": "energy-efficiency-directive",
    "label": "Heating and cooling supply (GHG emissions criterion)",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "heating-cooling"
    ],
    "indicator_ids": [
      "renewable-heating-cooling"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-fcbc4f23",
    "policy_id": "epbd-recast",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "emissions from buildings",
        "energy performance of buildings",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3b113ab6",
    "policy_id": "epbd-recast",
    "label": "Calculation of cost-optimal levels of minimum energy performance requirements",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg",
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "buildings"
      ],
      "energy-consumption": [
        "energy-efficient"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2ad08a12",
    "policy_id": "epbd-recast",
    "label": "Minimum energy performance standards for non-residential buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "energy performance of buildings",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1672096b",
    "policy_id": "epbd-recast",
    "label": "Minimum energy performance standards for non-residential buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-74ba8943",
    "policy_id": "epbd-recast",
    "label": "Trajectories for progressive renovation of the residential building stock",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "renovation"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "energy performance of buildings",
        "building",
        "buildings"
      ],
      "renovation": [
        "renovat*",
        "building renovation plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0adeee0d",
    "policy_id": "epbd-recast",
    "label": "Trajectories for progressive renovation of the residential building stock",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "energy performance of buildings",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-fc2da23e",
    "policy_id": "epbd-recast",
    "label": "Trajectories for progressive renovation of the residential building stock",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "energy performance of buildings",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a14d2fb5",
    "policy_id": "epbd-recast",
    "label": "Each Member State shall set a maximum energy performance threshold to the effect that…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "energy performance of buildings",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-21c2285b",
    "policy_id": "epbd-recast",
    "label": "Minimum…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "renovation"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "building",
        "buildings"
      ],
      "renovation": [
        "renovat*",
        "building renovation plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-74ea67f7",
    "policy_id": "epbd-recast",
    "label": "Solar energy in buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "floor-space"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b4-dwellings",
      "esabcc-b4-floor-area",
      "esabcc-b4-surface-residential",
      "esabcc-b4-surface-tertiary",
      "floor-space-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "building",
        "buildings"
      ],
      "floor-space": [
        "floor area",
        "useful floor"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4d0579d6",
    "policy_id": "epbd-recast",
    "label": "Infrastructure for sustainable mobility",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-173ee764",
    "policy_id": "epbd-recast",
    "label": "Infrastructure for sustainable mobility",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure",
      "buildings-ghg"
    ],
    "indicator_ids": [
      "zev-charging-points",
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging point*",
        "recharging"
      ],
      "buildings-ghg": [
        "energy performance of buildings",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-75cad6ac",
    "policy_id": "erdf-regulation",
    "label": "a greener, low-carbon transitioning towards a net zero carbon economy and resilient…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "circularity",
      "transport-demand",
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity",
      "esabcc-t2a-passenger-demand",
      "esabcc-t2b-freight-demand",
      "esabcc-t3b-air-passenger",
      "air-passengers-per-capita",
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "circularity": [
        "circular econom*"
      ],
      "transport-demand": [
        "urban mobility"
      ],
      "adaptation-governance": [
        "adaptation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bd266d7c",
    "policy_id": "erdf-regulation",
    "label": "promoting energy efficiency and reducing greenhouse gas emissions;",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "cohesion-funds",
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "cohesion-funds": [
        "cohesion fund"
      ],
      "energy-consumption": [
        "energy efficiency"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d5a1299e",
    "policy_id": "erdf-regulation",
    "label": "promoting renewable energy in accordance with Directive (EU) 2018/2001, including the…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "cohesion-funds",
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "cohesion-funds": [
        "cohesion fund"
      ],
      "res-share": [
        "renewable energy"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2f85d592",
    "policy_id": "erdf-regulation",
    "label": "promoting climate change adaptation and disaster risk prevention and resilience, taking…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-governance",
      "climate-losses"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies",
      "adv-adapt-economic-losses",
      "climate-economic-losses",
      "adv-adapt-coastal-transport-damage",
      "beta-adapt-transport-coastal-damage",
      "beta-adapt-energy-drought-damage"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation",
        "resilience"
      ],
      "climate-losses": [
        "disaster risk"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-46805553",
    "policy_id": "erdf-regulation",
    "label": "Member States of group 1 or more developed regions shall allocate at least 85 % of…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "cohesion-funds"
    ],
    "indicator_ids": [],
    "evidence": {
      "cohesion-funds": [
        "erdf",
        "cohesion fund"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0044637b",
    "policy_id": "erdf-regulation",
    "label": "Member States of group 2 or transition regions shall allocate at least 40 % of their…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "cohesion-funds"
    ],
    "indicator_ids": [],
    "evidence": {
      "cohesion-funds": [
        "erdf",
        "cohesion fund"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2a8611c2",
    "policy_id": "erdf-regulation",
    "label": "Member States of group 3 or less developed regions shall allocate at least 25 % of…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "cohesion-funds"
    ],
    "indicator_ids": [],
    "evidence": {
      "cohesion-funds": [
        "erdf",
        "cohesion fund",
        "less developed regions"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d9d32922",
    "policy_id": "eu-adaptation-strategy",
    "label": "Forging a climate-resilient Union",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance",
      "international-climate"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies",
      "international-climate-finance"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation"
      ],
      "international-climate": [
        "international"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2bff7066",
    "policy_id": "eu-adaptation-strategy",
    "label": "Forging a climate-resilient Union",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptive capacity",
        "adaptation",
        "vulnerabilit*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-203e0ccc",
    "policy_id": "eu-adaptation-strategy",
    "label": "Integrating climate resilience in national fiscal frameworks",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation",
        "resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1e2b4e6d",
    "policy_id": "eu-adaptation-strategy",
    "label": "Faster adaptation: Speeding up adaptation across the board",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation",
        "climate risk*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-51aa6776",
    "policy_id": "eu-adaptation-strategy",
    "label": "Accelerating the rollout of adaptation solutions",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptation",
        "resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ca094b73",
    "policy_id": "eu-climate-law",
    "label": "Subject matter and scope",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "international-climate",
      "ghg-total"
    ],
    "indicator_ids": [
      "international-climate-finance",
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "international-climate": [
        "paris agreement",
        "global"
      ],
      "ghg-total": [
        "climate neutrality"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-eaf1577d",
    "policy_id": "eu-climate-law",
    "label": "Climate-neutrality objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality",
        "union-wide greenhouse gas emissions",
        "greenhouse gas emissions and removals",
        "negative emissions"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8bf4d88c",
    "policy_id": "eu-climate-law",
    "label": "Intermediate Union climate targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality",
        "domestic reduction of net greenhouse gas emissions",
        "net greenhouse gas emissions",
        "1990 levels",
        "compared to 1990"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-da84eebb",
    "policy_id": "eu-climate-law",
    "label": "Intermediate Union climate targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality",
        "net greenhouse gas emissions",
        "1990 levels",
        "compared to 1990"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bdf617b6",
    "policy_id": "eu-climate-law",
    "label": "Adaptation to climate change",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "adaptive capacity",
        "adaptation",
        "resilience",
        "vulnerabilit*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-637f3e43",
    "policy_id": "eu-ets-directive",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "carbon-price"
    ],
    "indicator_ids": [
      "eu-ets-price",
      "carbon-pricing-coverage"
    ],
    "evidence": {
      "carbon-price": [
        "emission allowance*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-47fa3e3f",
    "policy_id": "eu-ets-directive",
    "label": "Method of allocation of allowances for aviation through auctioning",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "ets-emissions"
    ],
    "indicator_ids": [
      "adv-eu-ets-emissions"
    ],
    "evidence": {
      "ets-emissions": [
        "free allocation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-fbfa566c",
    "policy_id": "eu-ets-directive",
    "label": "Phase-in of requirements for maritime transport",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "maritime-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "maritime-fuels": [
        "ship*",
        "maritime transport",
        "shipping"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-267919e1",
    "policy_id": "eu-ets-directive",
    "label": "Union-wide quantity of allowances",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "ets-emissions"
    ],
    "indicator_ids": [
      "adv-eu-ets-emissions"
    ],
    "evidence": {
      "ets-emissions": [
        "union-wide quantity of allowances"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-24857210",
    "policy_id": "eu-ets-directive",
    "label": "Auctioning of allowances",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "carbon-price"
    ],
    "indicator_ids": [
      "eu-ets-price",
      "carbon-pricing-coverage"
    ],
    "evidence": {
      "carbon-price": [
        "auctioning of allowances",
        "emission allowance*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-204d9be4",
    "policy_id": "eu-ets-directive",
    "label": "Union-wide quantity of allowances (ETS2: buildings, road transport and additional sec…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ets-emissions"
    ],
    "indicator_ids": [
      "adv-eu-ets-emissions"
    ],
    "evidence": {
      "ets-emissions": [
        "linear reduction factor",
        "union-wide quantity of allowances"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0ca12710",
    "policy_id": "eu-ets-directive",
    "label": "Union-wide quantity of allowances (ETS2: buildings, road transport and additional sec…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ets-emissions"
    ],
    "indicator_ids": [
      "adv-eu-ets-emissions"
    ],
    "evidence": {
      "ets-emissions": [
        "linear reduction factor",
        "union-wide quantity of allowances"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b32fc266",
    "policy_id": "eu-green-deal",
    "label": "The European Green Deal is a response to these challenges. It is a new growth strategy…",
    "rung": "enabling",
    "route": "milestone",
    "confidence": "strong",
    "families": [
      "compliance-milestone"
    ],
    "indicator_ids": [],
    "evidence": {
      "compliance-milestone": [
        "strategy"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a4e25ea5",
    "policy_id": "eu-green-deal",
    "label": "By summer 2020, the Commission will present an impact assessed plan to increase the…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "emission reduction*",
        "1990 levels"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1ee15483",
    "policy_id": "eu-green-deal",
    "label": "The Commission will develop requirements to ensure that all packaging in the EU market…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "recycl*"
      ],
      "circularity": [
        "circular econom*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ce6f27be",
    "policy_id": "eu-green-deal",
    "label": "As an example, the Commission will support clean steel breakthrough technologies…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "basic-materials",
      "circularity",
      "energy-supply-ghg"
    ],
    "indicator_ids": [
      "esabcc-i4-steel-ghg-intensity",
      "esabcc-i4-cement-ghg-intensity",
      "esabcc-i4-chemicals-ghg-intensity",
      "esabcc-i2-steel-production",
      "esabcc-i2-cement-production",
      "esabcc-i2-chemicals-production",
      "esabcc-i7a-steel-projects",
      "esabcc-i7b-cement-projects",
      "esabcc-i7c-chemicals-projects",
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity",
      "esabcc-e1-energy-supply-ghg",
      "power-sector-ghg"
    ],
    "evidence": {
      "basic-materials": [
        "steel"
      ],
      "circularity": [
        "circular econom*"
      ],
      "energy-supply-ghg": [
        "coal"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e659cd0e",
    "policy_id": "eu-green-deal",
    "label": "To achieve climate neutrality, a 90% reduction in transport emissions is needed by 2050.",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total",
      "transport-ghg"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "esabcc-t1-transport-ghg",
      "beta-transport-fec"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality"
      ],
      "transport-ghg": [
        "transport emissions"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cbc6b28e",
    "policy_id": "eu-green-deal",
    "label": "By 2025, about 1 million public recharging and refuelling stations will be needed for…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging",
        "refuelling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8b3862c0",
    "policy_id": "eu-green-deal",
    "label": "The Commission’s proposals for the common agricultural policy for 2021 to 2027…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "agri-ghg",
      "marine-status"
    ],
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "evidence": {
      "agri-ghg": [
        "agricultur*",
        "farm"
      ],
      "marine-status": [
        "fisher*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c5018ef7",
    "policy_id": "eu-green-deal",
    "label": "The Commission has proposed a 25% target for climate mainstreaming across all EU…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "climate-finance-eu-budget",
      "just-transition-jobs"
    ],
    "indicator_ids": [
      "adapt-fin-mff-climate-mainstreaming",
      "environmental-employment"
    ],
    "evidence": {
      "climate-finance-eu-budget": [
        "climate mainstreaming"
      ],
      "just-transition-jobs": [
        "just transition"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c58aac0f",
    "policy_id": "eu-green-deal",
    "label": "At least 30% of the InvestEU Fund will contribute to fighting climate change.",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "investeu-finance",
      "just-transition-jobs"
    ],
    "indicator_ids": [
      "clean-tech-investment",
      "environmental-employment"
    ],
    "evidence": {
      "investeu-finance": [
        "investeu"
      ],
      "just-transition-jobs": [
        "just transition"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e16d2c6d",
    "policy_id": "eu-green-deal",
    "label": "The EIB set itself the target of doubling its climate target from 25% to 50% by 2025,…",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "just-transition-jobs"
    ],
    "indicator_ids": [
      "environmental-employment"
    ],
    "evidence": {
      "just-transition-jobs": [
        "just transition"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1d99940c",
    "policy_id": "european-health-union",
    "label": "new EU preparedness and response authority",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance",
      "health-preparedness",
      "infectious-disease"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies",
      "adv-adapt-west-nile"
    ],
    "evidence": {
      "adaptation-governance": [
        "resilience",
        "preparedness"
      ],
      "health-preparedness": [
        "health"
      ],
      "infectious-disease": [
        "disease*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-75f1b0a6",
    "policy_id": "f-gas-regulation",
    "label": "Maximum quantities and calculation of reference values and quota",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*",
        "quota"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9827d28c",
    "policy_id": "f-gas-regulation",
    "label": "Prevention of emissions",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1d7cca1c",
    "policy_id": "f-gas-regulation",
    "label": "Leak checks",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "fgas",
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ],
      "cleantech-manufacturing": [
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6e36ba24",
    "policy_id": "f-gas-regulation",
    "label": "Leak checks",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5cde3d7b",
    "policy_id": "f-gas-regulation",
    "label": "Leak checks",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4095939a",
    "policy_id": "f-gas-regulation",
    "label": "Leak checks",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-07c922a0",
    "policy_id": "f-gas-regulation",
    "label": "Leakage detection systems",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "fgas",
      "early-warning"
    ],
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ],
      "early-warning": [
        "alert*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1eb2c4e3",
    "policy_id": "f-gas-regulation",
    "label": "Leakage detection systems",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "fgas",
      "early-warning"
    ],
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ],
      "early-warning": [
        "alert*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ad13d0c2",
    "policy_id": "f-gas-regulation",
    "label": "Restrictions on placing on the market and sale",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of",
        "placing on the market"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bb0d4f19",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3c2e1f1c",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-23e32e4b",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b6eb909a",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ce454cb9",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "switchgear"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-29ff133e",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "switchgear"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-fccfd356",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "switchgear"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-06baa173",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of",
        "switchgear"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0a15046d",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "global warming potential of",
        "switchgear"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cc48cad2",
    "policy_id": "f-gas-regulation",
    "label": "Control of use",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas",
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "switchgear"
      ],
      "waste-recycling": [
        "recycl*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4fe57798",
    "policy_id": "f-gas-regulation",
    "label": "Reduction of the quantity of hydrofluorocarbons placed on the market",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*",
        "quota",
        "placing on the market"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a33963ca",
    "policy_id": "f-gas-regulation",
    "label": "Determination of reference values and quota allocations for the placing on the market…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "quota",
        "placing on the market"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-878d2403",
    "policy_id": "f-gas-regulation",
    "label": "Products or equipment pre-charged with hydrofluorocarbons",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-af6b2c36",
    "policy_id": "f-gas-regulation",
    "label": "Reporting by undertakings",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*",
        "placing on the market"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a1f07801",
    "policy_id": "f-gas-regulation",
    "label": "Production rights for placing hydrofluorocarbons on the market",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3344bbe2",
    "policy_id": "f-gas-regulation",
    "label": "Production rights for placing hydrofluorocarbons on the market",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cc5d1fda",
    "policy_id": "f-gas-regulation",
    "label": "Production rights for placing hydrofluorocarbons on the market",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d8ae4a5f",
    "policy_id": "f-gas-regulation",
    "label": "Production rights for placing hydrofluorocarbons on the market",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "fgas"
    ],
    "indicator_ids": [],
    "evidence": {
      "fgas": [
        "fluorinated greenhouse gas*",
        "hydrofluorocarbon*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f5445a08",
    "policy_id": "fit-for-55",
    "label": "The EU has led by example in setting ambitious targets for reducing net emissions by at…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality",
        "compared to 1990"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5f156a66",
    "policy_id": "fit-for-55",
    "label": "To reach the 2030 target, the updated Renewable Energy Directive proposes to increase…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "renewable energy",
        "renewables"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f3ad597b",
    "policy_id": "fit-for-55",
    "label": "The Social Climate Fund will provide €72.2 billion in current prices for the period…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "just-transition-jobs",
      "energy-poverty"
    ],
    "indicator_ids": [
      "environmental-employment",
      "adv-energy-poverty",
      "energy-poverty-share"
    ],
    "evidence": {
      "just-transition-jobs": [
        "social climate fund"
      ],
      "energy-poverty": [
        "energy poverty"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-915011a0",
    "policy_id": "fit-for-55",
    "label": "The revision of the Energy Efficiency Directive proposes to increase the level of…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "energy-consumption": [
        "energy efficiency target*",
        "energy efficiency",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5c469240",
    "policy_id": "fit-for-55",
    "label": "The new proposal looks to reverse the current trend of diminishing CO2 removals and…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "lulucf-sink": [
        "lulucf",
        "carbon sink*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-91351581",
    "policy_id": "fit-for-55",
    "label": "Next to a carbon price signal, clear targets are needed to drive change such as in the…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "esr-emissions",
      "carbon-price"
    ],
    "indicator_ids": [
      "eu-ets-price",
      "carbon-pricing-coverage"
    ],
    "evidence": {
      "esr-emissions": [
        "effort sharing",
        "esr"
      ],
      "carbon-price": [
        "carbon price"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8c6b0235",
    "policy_id": "fit-for-55",
    "label": "Reflecting the need for steeper emission reductions, the Commission is today proposing…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "ghg-total": [
        "emission reduction*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2025acfe",
    "policy_id": "fit-for-55",
    "label": "Emissions remain higher than in 1990 and a 90% reduction in overall transport emissions…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total",
      "transport-ghg"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "esabcc-t1-transport-ghg",
      "beta-transport-fec"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality"
      ],
      "transport-ghg": [
        "transport emissions"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-27f97df3",
    "policy_id": "fit-for-55",
    "label": "30% of programmes under the 2021-2027 Multiannual Financial Framework are dedicated to…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "agri-ghg"
    ],
    "indicator_ids": [
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg"
    ],
    "evidence": {
      "agri-ghg": [
        "agricultur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a4ff486a",
    "policy_id": "fit-for-55",
    "label": "national recovery and resilience plans financed under the Recovery and Resilience…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-governance": [
        "resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c21f91da",
    "policy_id": "floods-directive",
    "label": "purpose",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4e67eef1",
    "policy_id": "floods-directive",
    "label": "preliminary flood risk assessment",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "preliminary flood risk assessment",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4d746907",
    "policy_id": "floods-directive",
    "label": "deadline",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "preliminary flood risk assessment",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0dab4982",
    "policy_id": "floods-directive",
    "label": "identification of areas",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e6e437e1",
    "policy_id": "floods-directive",
    "label": "flood hazard and risk maps",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood hazard map*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d6f61cfe",
    "policy_id": "floods-directive",
    "label": "deadline",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood hazard map*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3f43624f",
    "policy_id": "floods-directive",
    "label": "flood risk management plans",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood risk management plan*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-766fafcb",
    "policy_id": "floods-directive",
    "label": "deadline",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood risk management plan*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a9eca80a",
    "policy_id": "floods-directive",
    "label": "review cycle",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "preliminary flood risk assessment",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-aa3b0d2b",
    "policy_id": "floods-directive",
    "label": "review cycle",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood hazard map*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7dd5e003",
    "policy_id": "floods-directive",
    "label": "review cycle",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "floods-droughts"
    ],
    "indicator_ids": [
      "adv-adapt-river-flood-damage",
      "beta-adapt-flood-prone-population",
      "beta-adapt-drought-impact"
    ],
    "evidence": {
      "floods-droughts": [
        "flood risk*",
        "flood risk management plan*",
        "flood*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-822f75f6",
    "policy_id": "fueleu-maritime",
    "label": "Subject matter and objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "maritime-fuels",
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "maritime-fuels": [
        "fueleu",
        "maritime transport"
      ],
      "ghg-total": [
        "climate neutrality"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-03870a56",
    "policy_id": "fueleu-maritime",
    "label": "GHG intensity limit on energy used on board by a ship",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "maritime-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "maritime-fuels": [
        "fueleu",
        "ship*",
        "maritime transport"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-31e539a8",
    "policy_id": "fueleu-maritime",
    "label": "Additional zero-emission requirements for energy used at berth",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "maritime-fuels",
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "maritime-fuels": [
        "fueleu",
        "ship*",
        "maritime transport"
      ],
      "shore-power": [
        "at berth",
        "moored"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-87d2e3dd",
    "policy_id": "fueleu-maritime",
    "label": "From 1 January 2035, a ship moored at the quayside in a port of call which is not…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "maritime-fuels",
      "shore-power"
    ],
    "indicator_ids": [],
    "evidence": {
      "maritime-fuels": [
        "fueleu",
        "ship*",
        "maritime transport"
      ],
      "shore-power": [
        "at berth",
        "moored"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-81f05f73",
    "policy_id": "governance-regulation",
    "label": "Subject matter and scope",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "international-climate"
    ],
    "indicator_ids": [
      "international-climate-finance"
    ],
    "evidence": {
      "international-climate": [
        "paris agreement"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d5d58cc1",
    "policy_id": "governance-regulation",
    "label": "National objectives, targets and contributions for the five dimensions of the…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "renewable energy"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d9eab39e",
    "policy_id": "governance-regulation",
    "label": "National objectives, targets and contributions for the five dimensions of the Energy…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c6b8bfbd",
    "policy_id": "governance-regulation",
    "label": "National objectives, targets and contributions for the five dimensions of the Energy…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-00be6309",
    "policy_id": "governance-regulation",
    "label": "National objectives, targets and contributions for the five dimensions of the Energy…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3def2076",
    "policy_id": "governance-regulation",
    "label": "Amendments to Directive 2010/31/EU",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "buildings-ghg": [
        "building stock",
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7537e9a3",
    "policy_id": "habitats-directive",
    "label": "The aim of this Directive shall be to contribute towards ensuring bio-diversity through…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "habitat*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f92dd8e8",
    "policy_id": "horizon-europe",
    "label": "Principles of the Programme",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "rdi-budgets"
    ],
    "indicator_ids": [
      "esabcc-f-gerd",
      "esabcc-f-climate-patents-share",
      "energy-rdd-budget"
    ],
    "evidence": {
      "rdi-budgets": [
        "research and innovation",
        "horizon europe"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f7d681f8",
    "policy_id": "investeu-regulation",
    "label": "supporting financing and investment operations related to sustainable infrastructure in…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "investeu-finance"
    ],
    "indicator_ids": [
      "clean-tech-investment"
    ],
    "evidence": {
      "investeu-finance": [
        "investeu",
        "financing and investment operation*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-596143a5",
    "policy_id": "investeu-regulation",
    "label": "Implementing partners shall apply a target of at least 60 % of the investment under the…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "investeu-finance"
    ],
    "indicator_ids": [
      "clean-tech-investment"
    ],
    "evidence": {
      "investeu-finance": [
        "investeu",
        "implementing partner*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a714b712",
    "policy_id": "lulucf-regulation",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "lulucf-sink": [
        "lulucf",
        "land use, land use change",
        "land use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3fd63c95",
    "policy_id": "lulucf-regulation",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "lulucf-sink": [
        "lulucf"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-742a1c15",
    "policy_id": "lulucf-regulation",
    "label": "Commitments and targets",
    "rung": "enabling",
    "route": "milestone",
    "confidence": "strong",
    "families": [
      "compliance-milestone"
    ],
    "indicator_ids": [],
    "evidence": {
      "compliance-milestone": [
        "shall ensure that"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4d15af1f",
    "policy_id": "lulucf-regulation",
    "label": "Commitments and targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "lulucf-sink": [
        "lulucf"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2b161df1",
    "policy_id": "lulucf-regulation",
    "label": "Commitments and targets",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "lulucf-sink"
    ],
    "indicator_ids": [
      "adv-lulucf-net",
      "esabcc-l1-lulucf-net",
      "lulucf-net-removal"
    ],
    "evidence": {
      "lulucf-sink": [
        "lulucf",
        "net removals"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ab1dfc69",
    "policy_id": "managing-climate-risks",
    "label": "Solutions space",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-local",
      "adaptation-governance"
    ],
    "indicator_ids": [
      "adv-adapt-cities-plans",
      "adapt-out-mission-charter-signatories",
      "adapt-out-com-adaptation-signatories",
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "adaptation-local": [
        "local authorit*",
        "mission on adaptation",
        "region*"
      ],
      "adaptation-governance": [
        "adaptation",
        "resilience",
        "climate risk*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f31be2b9",
    "policy_id": "managing-climate-risks",
    "label": "Tools for empowering risk owners",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "early-warning"
    ],
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "evidence": {
      "early-warning": [
        "emergency warning",
        "alert*",
        "emergenc*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-7a4b75ab",
    "policy_id": "marine-strategy-framework-directive",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "marine-status": [
        "good environmental status",
        "marine"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ef0b8565",
    "policy_id": "marine-strategy-framework-directive",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status",
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restore*"
      ],
      "biodiversity-status": [
        "ecosystem*"
      ],
      "marine-status": [
        "marine"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d65eab7d",
    "policy_id": "marine-strategy-framework-directive",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "biodiversity-status",
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "biodiversity",
        "ecosystem*"
      ],
      "marine-status": [
        "marine",
        "sea"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-99e2443d",
    "policy_id": "marine-strategy-framework-directive",
    "label": "Marine strategies",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "marine-status": [
        "good environmental status",
        "marine"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3fcb25b0",
    "policy_id": "marine-strategy-framework-directive",
    "label": "Marine strategies",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "marine-status": [
        "good environmental status",
        "marine"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-516064e1",
    "policy_id": "nature-restoration-law",
    "label": "Subject matter",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9ca55191",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ],
      "restoration": [
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f11320a4",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "favourable reference area",
        "restoration",
        "re-establish*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-eda69613",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ],
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e7f21b18",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ],
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5c2dda93",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "nature restoration",
        "favourable reference area",
        "restoration"
      ],
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0782ca31",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems (derogation phase-in)",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "favourable reference area",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-56e9df2f",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of terrestrial, coastal and freshwater ecosystems (habitats of species)",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration",
        "re-establish*"
      ],
      "biodiversity-status": [
        "species",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d4d67d5e",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of marine ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ],
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-de88c2a8",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of marine ecosystems (condition known)",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "habitat type*",
        "habitat*",
        "ecosystem*"
      ],
      "restoration": [
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e3289ec4",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of marine ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "favourable reference area",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0f2c56f1",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of urban ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "urban-green"
    ],
    "indicator_ids": [],
    "evidence": {
      "urban-green": [
        "urban green space*",
        "tree canopy cover",
        "urban ecosystem*",
        "green space*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a9703c91",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of urban ecosystems",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "urban-green"
    ],
    "indicator_ids": [],
    "evidence": {
      "urban-green": [
        "urban green space*",
        "urban ecosystem*",
        "green space*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1803b80e",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of the natural connectivity of rivers",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration target*",
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3b196cfe",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of agricultural ecosystems (peatland rewetting)",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "peatlands-soils"
    ],
    "indicator_ids": [
      "adv-peatland-emissions",
      "beta-cropland-grassland-flux",
      "beta-wetlands-flux",
      "esabcc-l2-cropland-area",
      "esabcc-l2-grassland-area",
      "esabcc-l2-wetland-area"
    ],
    "evidence": {
      "peatlands-soils": [
        "peatland*",
        "organic soil*",
        "rewett*",
        "drained",
        "soils"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5eeae50e",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of agricultural ecosystems (biodiversity indicators)",
    "rung": "lever",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "restoration",
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "nature restoration",
        "restoration"
      ],
      "biodiversity-status": [
        "biodiversity",
        "ecosystem*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c66e2768",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of forest ecosystems (common forest bird index)",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "restoration",
      "forests"
    ],
    "indicator_ids": [
      "adv-forest-sink-decline",
      "esabcc-l3-afforestation",
      "esabcc-l4-deforestation",
      "esabcc-l6-forest-sink",
      "esabcc-l2-forest-area",
      "forest-net-sink",
      "harvested-wood-pool"
    ],
    "evidence": {
      "restoration": [
        "nature restoration",
        "restoration"
      ],
      "forests": [
        "forest*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d6fb00f0",
    "policy_id": "nature-restoration-law",
    "label": "Restoration of forest ecosystems (biodiversity indicators)",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "forests",
      "restoration"
    ],
    "indicator_ids": [
      "adv-forest-sink-decline",
      "esabcc-l3-afforestation",
      "esabcc-l4-deforestation",
      "esabcc-l6-forest-sink",
      "esabcc-l2-forest-area",
      "forest-net-sink",
      "harvested-wood-pool"
    ],
    "evidence": {
      "biodiversity-status": [
        "species",
        "biodiversity",
        "ecosystem*"
      ],
      "forests": [
        "forest*",
        "tree*"
      ],
      "restoration": [
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9730be62",
    "policy_id": "nature-restoration-law",
    "label": "Planting three billion additional trees",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-950818cf",
    "policy_id": "net-zero-industry-act",
    "label": "The general objective of this Regulation is to improve the functioning of the internal…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "cleantech-manufacturing": [
        "net-zero technolog*",
        "manufacturing capacity",
        "manufactur*",
        "supply chain*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-47a4b74d",
    "policy_id": "net-zero-industry-act",
    "label": "a benchmark of at least 40 % of the Union’s annual deployment needs for the…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "cleantech-manufacturing": [
        "net-zero technolog*",
        "annual deployment needs",
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8fa67f0f",
    "policy_id": "net-zero-industry-act",
    "label": "an increased Union share for the corresponding technologies with a view to reaching 15…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "cleantech-manufacturing": [
        "net-zero technolog*",
        "manufacturing capacity",
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-57e59816",
    "policy_id": "net-zero-industry-act",
    "label": "An annual injection capacity of at least 50 million tonnes of CO2 shall be achieved by…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ccs"
    ],
    "indicator_ids": [
      "beta-ccs-capacity",
      "engineered-cdr-capacity"
    ],
    "evidence": {
      "ccs": [
        "co2 injection",
        "storage site*",
        "geological storage"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0e4c2ced",
    "policy_id": "net-zero-industry-act",
    "label": "Contribution of authorised oil and gas producers",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ccs",
      "fossil-share-energy"
    ],
    "indicator_ids": [
      "beta-ccs-capacity",
      "engineered-cdr-capacity",
      "beta-fossil-share-gae"
    ],
    "evidence": {
      "ccs": [
        "co2 injection",
        "storage site*"
      ],
      "fossil-share-energy": [
        "natural gas",
        "oil"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b4eeb98f",
    "policy_id": "one-health-amr",
    "label": "EU as best-practice region",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "infectious-disease"
    ],
    "indicator_ids": [
      "adv-adapt-west-nile"
    ],
    "evidence": {
      "infectious-disease": [
        "antimicrobial resistance",
        "one health",
        "surveillance"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ed3fa064",
    "policy_id": "one-health-amr",
    "label": "boosting research and innovation",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "infectious-disease",
      "rdi-budgets"
    ],
    "indicator_ids": [
      "adv-adapt-west-nile",
      "esabcc-f-gerd",
      "esabcc-f-climate-patents-share",
      "energy-rdd-budget"
    ],
    "evidence": {
      "infectious-disease": [
        "antimicrobial resistance",
        "one health",
        "disease*"
      ],
      "rdi-budgets": [
        "research and innovation",
        "research, development"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3a42469b",
    "policy_id": "one-health-amr",
    "label": "shaping the global agenda",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "infectious-disease",
      "grid-infrastructure"
    ],
    "indicator_ids": [
      "adv-adapt-west-nile",
      "battery-storage-capacity",
      "smart-meter-rollout"
    ],
    "evidence": {
      "infectious-disease": [
        "antimicrobial resistance",
        "one health"
      ],
      "grid-infrastructure": [
        "interconnect*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f71b863a",
    "policy_id": "one-health-amr",
    "label": "tackling falsified medicines",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "infectious-disease"
    ],
    "indicator_ids": [
      "adv-adapt-west-nile"
    ],
    "evidence": {
      "infectious-disease": [
        "antimicrobial resistance",
        "one health"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-17cdf20e",
    "policy_id": "packaging-waste-regulation",
    "label": "All packaging placed on the market shall be recyclable.",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-685a7a80",
    "policy_id": "packaging-waste-regulation",
    "label": "Without prejudice to paragraph 10, from 1 January 2030 or 24 months from the entry into…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bb0da776",
    "policy_id": "packaging-waste-regulation",
    "label": "Without prejudice to paragraph 10 of this Article, from 1 January 2038 packaging shall…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-012c6f71",
    "policy_id": "packaging-waste-regulation",
    "label": "By 1 January 2030 or 3 years from the date of entry into force of the implementing act…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0040efea",
    "policy_id": "packaging-waste-regulation",
    "label": "By 1 January 2040, any plastic part of packaging placed on the market shall contain the…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c6d633ca",
    "policy_id": "packaging-waste-regulation",
    "label": "By 1 January 2030, the manufacturer or importer shall ensure that the packaging placed…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "cleantech-manufacturing": [
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e03a5cc0",
    "policy_id": "packaging-waste-regulation",
    "label": "By 1 January 2030 or 3 years from the entry into force of the implementing acts adopted…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c7bf5165",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2030, economic operators that use transport packaging, or sales…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5cf01ede",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2040, those economic operators shall endeavour to use at least 70 % of…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b2266e38",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2030, by way of derogation from paragraph 1 of this Article, economic…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5b792546",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2030, by way of derogation from paragraph 1, economic operators that use…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-38fc3b3d",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2030, economic operators that use grouped packaging in the form of…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-992819ce",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2040, economic operators shall endeavour to use at least 25 % of the…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a35097ed",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2030, final distributors that make alcoholic and non-alcoholic beverages…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8d252139",
    "policy_id": "packaging-waste-regulation",
    "label": "From 1 January 2040, economic operators shall endeavour to make at least 40 % of the…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "waste-recycling",
      "circularity"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity"
    ],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ],
      "circularity": [
        "re-use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-acc4ce38",
    "policy_id": "packaging-waste-regulation",
    "label": "From 2030, final distributors shall endeavour to offer 10 % of products for sale in a…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-291ed126",
    "policy_id": "packaging-waste-regulation",
    "label": "A sustained reduction is considered to be achieved if the annual consumption does not…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "weak",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c0a59b98",
    "policy_id": "packaging-waste-regulation",
    "label": "Each Member State shall reduce the packaging waste generated per capita, as compared to…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5771d109",
    "policy_id": "packaging-waste-regulation",
    "label": "By 1 January 2029, Member States shall take the necessary measures to ensure the…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "separate collection",
        "waste",
        "single-use plastic*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-aad1e4a5",
    "policy_id": "packaging-waste-regulation",
    "label": "by 31 December 2025, a minimum of 65 % by weight of all packaging waste generated;",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0a5326f9",
    "policy_id": "packaging-waste-regulation",
    "label": "by 31 December 2030, a minimum of 70 % by weight of all packaging waste generated;",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-acafe137",
    "policy_id": "packaging-waste-regulation",
    "label": "by 31 December 2025, the following minimum percentages by weight of the following…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-048b897a",
    "policy_id": "packaging-waste-regulation",
    "label": "by 31 December 2030, the following minimum percentages by weight of the following…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "packaging waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-8aac09f1",
    "policy_id": "refueleu-aviation",
    "label": "Shares of SAF available at Union airports",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "saf",
        "aviation",
        "aircraft operator*",
        "union airport*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1d58bcbd",
    "policy_id": "refueleu-aviation",
    "label": "Shares of SAF referred to in Article 4",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-4a01d6e4",
    "policy_id": "refueleu-aviation",
    "label": "Refuelling obligation for aircraft operators",
    "rung": "lever",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "aviation",
        "aircraft operator*",
        "union airport*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6d81dc1f",
    "policy_id": "refueleu-aviation",
    "label": "From 1 January 2030, each year a minimum share of 6 % of SAF, of which:",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f4140bc0",
    "policy_id": "refueleu-aviation",
    "label": "for the period from 1 January 2030 until 31 December 2031, an average share over the…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-36485fbf",
    "policy_id": "refueleu-aviation",
    "label": "for the period from 1 January 2032 until 31 December 2034, an average share over the…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f2feea34",
    "policy_id": "refueleu-aviation",
    "label": "From 1 January 2035, each year a minimum share of 20 % of SAF, of which a minimum share…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-def6d915",
    "policy_id": "refueleu-aviation",
    "label": "From 1 January 2040, each year a minimum share of 34 % of SAF, of which a minimum share…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2d138352",
    "policy_id": "refueleu-aviation",
    "label": "From 1 January 2045, each year a minimum share of 42 % of SAF, of which a minimum share…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-728d4b37",
    "policy_id": "refueleu-aviation",
    "label": "From 1 January 2050, each year a minimum share of 70 % of SAF, of which a minimum share…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "aviation-fuels"
    ],
    "indicator_ids": [],
    "evidence": {
      "aviation-fuels": [
        "synthetic aviation fuel*",
        "saf",
        "aviation"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-47473830",
    "policy_id": "renewable-energy-directive",
    "label": "Binding overall Union target for 2030",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "gross final consumption of energy",
        "binding overall union target",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ea52e5db",
    "policy_id": "renewable-energy-directive",
    "label": "Binding overall Union target for 2030",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "binding overall union target",
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a948a791",
    "policy_id": "renewable-energy-directive",
    "label": "developing transmission and distribution grid infrastructure, intelligent networks,…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "grid-infrastructure",
      "res-share"
    ],
    "indicator_ids": [
      "battery-storage-capacity",
      "smart-meter-rollout",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "grid-infrastructure": [
        "interconnect*",
        "grid",
        "network*"
      ],
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-71d8a044",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share",
      "energy-consumption"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share",
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ],
      "energy-consumption": [
        "final energy consumption",
        "energy consumption"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-15aa5e48",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "heating-cooling",
      "res-share"
    ],
    "indicator_ids": [
      "renewable-heating-cooling",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "district heating",
        "efficient district heating"
      ],
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-08bc8c2c",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in buildings",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d225ba67",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in industry",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c26a110b",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in industry",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "hydrogen"
    ],
    "indicator_ids": [
      "hydrogen-electrolyser-capacity",
      "electrolyser-mfg-capacity"
    ],
    "evidence": {
      "hydrogen": [
        "hydrogen",
        "renewable fuels of non-biological origin"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-44d2b2e9",
    "policy_id": "renewable-energy-directive",
    "label": "Mainstreaming renewable energy in heating and cooling",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "res-share": [
        "gross final consumption of energy",
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-04ec5819",
    "policy_id": "renewable-energy-directive",
    "label": "District heating and cooling",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share",
      "heating-cooling",
      "governance-necp"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share",
      "renewable-heating-cooling",
      "necp-implementation-score",
      "national-climate-laws"
    ],
    "evidence": {
      "res-share": [
        "share of energy from renewable sources",
        "gross final consumption of energy",
        "energy from renewable",
        "renewable sources"
      ],
      "heating-cooling": [
        "heating and cooling",
        "district heating",
        "waste heat"
      ],
      "governance-necp": [
        "integrated national energy and climate plan*",
        "national energy and climate plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a2546930",
    "policy_id": "renewable-energy-directive",
    "label": "District heating and cooling",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "heating-cooling",
      "res-share"
    ],
    "indicator_ids": [
      "renewable-heating-cooling",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "heating-cooling": [
        "heating and cooling",
        "district heating",
        "waste heat"
      ],
      "res-share": [
        "share of energy from renewable sources",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a4156be1",
    "policy_id": "renewable-energy-directive",
    "label": "Increase of renewable energy and reduction of greenhouse gas intensity…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "transport-renewables",
      "res-share"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "transport-renewables": [
        "greenhouse gas intensity reduction",
        "fuel supplier*"
      ],
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-51716f9d",
    "policy_id": "renewable-energy-directive",
    "label": "Increase of renewable energy and reduction of greenhouse gas intensity…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "transport-renewables": [
        "advanced biofuel*",
        "biofuel*",
        "biogas"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b755363c",
    "policy_id": "renewable-energy-directive",
    "label": "Increase of renewable energy and reduction of greenhouse gas intensity in the…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "hydrogen",
      "res-share",
      "maritime-fuels"
    ],
    "indicator_ids": [
      "hydrogen-electrolyser-capacity",
      "electrolyser-mfg-capacity",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "hydrogen": [
        "renewable fuels of non-biological origin"
      ],
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ],
      "maritime-fuels": [
        "maritime transport"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-399cd9d4",
    "policy_id": "renewable-energy-directive",
    "label": "Specific rules for biofuels, bioliquids and biomass fuels produced from food and feed…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share",
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share",
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "res-share": [
        "gross final consumption of energy",
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ],
      "transport-renewables": [
        "greenhouse gas intensity reduction",
        "food and feed crop*",
        "biofuel*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-98bdf8b9",
    "policy_id": "renewable-energy-directive",
    "label": "Specific rules for biofuels, bioliquids and biomass fuels produced from food and…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "transport-renewables": [
        "greenhouse gas intensity reduction",
        "food and feed crop*",
        "biofuel*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cbe76459",
    "policy_id": "renewable-energy-directive",
    "label": "For the calculation of a Member State’s gross final consumption of energy from…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share",
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share",
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "res-share": [
        "gross final consumption of energy",
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ],
      "transport-renewables": [
        "greenhouse gas intensity reduction",
        "food and feed crop*",
        "biofuel*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a6b92607",
    "policy_id": "renewable-energy-directive",
    "label": "at least 50 % for biofuels, biogas consumed in the transport sector, and bioliquids…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "transport-renewables": [
        "biofuel*",
        "biogas"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-dee6fef3",
    "policy_id": "renewable-energy-directive",
    "label": "at least 60 % for biofuels, biogas consumed in the transport sector, and bioliquids…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "transport-renewables": [
        "biofuel*",
        "biogas"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6e693ed3",
    "policy_id": "renewable-energy-directive",
    "label": "at least 65 % for biofuels, biogas consumed in the transport sector, and bioliquids…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "transport-renewables"
    ],
    "indicator_ids": [
      "adv-res-transport",
      "esabcc-t6a-fossil-transport-share",
      "esabcc-t6b-foodcrop-biofuels"
    ],
    "evidence": {
      "transport-renewables": [
        "biofuel*",
        "biogas"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d30fa3b5",
    "policy_id": "renewable-energy-directive",
    "label": "for electricity, heating and cooling production from biomass fuels used in…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "bioenergy-feedstock",
      "heating-cooling",
      "industry-ghg"
    ],
    "indicator_ids": [
      "esabcc-a7-bioenergy-feedstock",
      "esabcc-l8-bioenergy-use",
      "renewable-heating-cooling",
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification"
    ],
    "evidence": {
      "bioenergy-feedstock": [
        "biomass"
      ],
      "heating-cooling": [
        "heating and cooling"
      ],
      "industry-ghg": [
        "installation*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9edf0aa9",
    "policy_id": "renewable-energy-directive",
    "label": "Sustainability and greenhouse gas emissions saving criteria for biofuels, bioliquids…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "industry-ghg",
      "res-share"
    ],
    "indicator_ids": [
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification",
      "adv-res-share-fec",
      "res-share"
    ],
    "evidence": {
      "industry-ghg": [
        "installation*"
      ],
      "res-share": [
        "energy from renewable",
        "renewable sources"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1a90ae77",
    "policy_id": "renewable-energy-directive",
    "label": "Greenhouse gas emissions saving criteria for renewable fuels of non-biological origin…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "res-share",
      "hydrogen"
    ],
    "indicator_ids": [
      "adv-res-share-fec",
      "res-share",
      "hydrogen-electrolyser-capacity",
      "electrolyser-mfg-capacity"
    ],
    "evidence": {
      "res-share": [
        "renewable energy",
        "energy from renewable",
        "renewable sources"
      ],
      "hydrogen": [
        "renewable fuels of non-biological origin"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b20d9477",
    "policy_id": "renovation-wave",
    "label": "The objective is to at least double the annual energy renovation rate of residential…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "renovation",
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate",
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "buildings-ghg": [
        "building",
        "buildings"
      ],
      "renovation": [
        "renovat*"
      ],
      "ghg-total": [
        "climate neutrality"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-43962846",
    "policy_id": "renovation-wave",
    "label": "Mobilising forces at all levels towards these goals will result in 35 million building…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "renovation",
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate",
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "buildings-ghg": [
        "building",
        "buildings"
      ],
      "renovation": [
        "renovat*"
      ],
      "ghg-total": [
        "climate neutrality"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-afb5f9cf",
    "policy_id": "renovation-wave",
    "label": "The increased rate and depth of renovation will have to be maintained also post-2030 in…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total",
      "renovation",
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate",
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality"
      ],
      "renovation": [
        "renovat*"
      ],
      "buildings-ghg": [
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-53d706f5",
    "policy_id": "renovation-wave",
    "label": "To achieve the 55% emission reduction target, by 2030 the EU should reduce buildings’…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "energy-consumption",
      "ghg-total",
      "buildings-ghg"
    ],
    "indicator_ids": [
      "esabcc-o2-pec",
      "esabcc-o2-fec",
      "esabcc-o3-gross-inland",
      "final-energy-consumption",
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita"
    ],
    "evidence": {
      "energy-consumption": [
        "final energy consumption",
        "energy consumption"
      ],
      "ghg-total": [
        "climate neutrality",
        "emission reduction*"
      ],
      "buildings-ghg": [
        "building",
        "buildings"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c1927192",
    "policy_id": "single-use-plastics-directive",
    "label": "Member States shall take the necessary measures to achieve an ambitious and sustained…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "waste",
        "single-use plastic*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-3e62e517",
    "policy_id": "single-use-plastics-directive",
    "label": "from 2025, beverage bottles listed in Part F of the Annex which are manufactured from…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "waste-recycling",
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "waste-recycling": [
        "recycl*"
      ],
      "cleantech-manufacturing": [
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9369ace5",
    "policy_id": "single-use-plastics-directive",
    "label": "from 2030, beverage bottles listed in Part F of the Annex contain at least 30 %…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2e47a203",
    "policy_id": "single-use-plastics-directive",
    "label": "by 2025, of an amount of waste single-use plastic products listed in Part F of the…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "waste",
        "single-use plastic*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-401c38dc",
    "policy_id": "single-use-plastics-directive",
    "label": "by 2029, of an amount of waste single-use plastic products listed in Part F of the…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "waste",
        "single-use plastic*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-49e5ffde",
    "policy_id": "social-climate-fund",
    "label": "Objectives",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "just-transition-jobs",
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "environmental-employment",
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "buildings-ghg": [
        "emissions from buildings",
        "buildings"
      ],
      "just-transition-jobs": [
        "social climate fund",
        "social impact*"
      ],
      "ghg-total": [
        "climate neutrality"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-18f21fe8",
    "policy_id": "social-climate-fund",
    "label": "Objectives",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "just-transition-jobs",
      "heating-cooling"
    ],
    "indicator_ids": [
      "environmental-employment",
      "renewable-heating-cooling"
    ],
    "evidence": {
      "just-transition-jobs": [
        "social climate fund",
        "vulnerable household*"
      ],
      "heating-cooling": [
        "heating and cooling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-a79274ff",
    "policy_id": "ten-e-regulation",
    "label": "This Regulation lays down guidelines for the timely development and interoperability of…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "ghg-total",
      "grid-infrastructure",
      "energy-poverty"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "battery-storage-capacity",
      "smart-meter-rollout",
      "adv-energy-poverty",
      "energy-poverty-share"
    ],
    "evidence": {
      "ghg-total": [
        "climate neutrality"
      ],
      "grid-infrastructure": [
        "interconnect*"
      ],
      "energy-poverty": [
        "energy price*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c1b1e3ba",
    "policy_id": "ten-t-regulation",
    "label": "The overall objective of the development of the trans-European transport network is to…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "modal-shift"
    ],
    "indicator_ids": [
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "evidence": {
      "modal-shift": [
        "multimodal",
        "ten-t",
        "trans-european transport network"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f842737a",
    "policy_id": "ten-t-regulation",
    "label": "promotion of zero and low emission mobility in line with the relevant Union CO2…",
    "rung": "lever",
    "route": "series",
    "confidence": "weak",
    "families": [
      "modal-shift"
    ],
    "indicator_ids": [
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "evidence": {
      "modal-shift": [
        "ten-t",
        "trans-european transport network"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-85c5b03d",
    "policy_id": "ten-t-regulation",
    "label": "the deployment of alternative fuels recharging and refuelling infrastructure, thereby…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "charging-infrastructure"
    ],
    "indicator_ids": [
      "zev-charging-points"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging",
        "refuelling"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5076f692",
    "policy_id": "ten-t-regulation",
    "label": "the development of green, sustainable and climate resilient infrastructure, taking into…",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "air-quality",
      "biodiversity-status",
      "ghg-total"
    ],
    "indicator_ids": [
      "esabcc-o1-ghg-total",
      "ghg-total-net"
    ],
    "evidence": {
      "air-quality": [
        "noise"
      ],
      "biodiversity-status": [
        "ecosystem*"
      ],
      "ghg-total": [
        "decarbonis*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-576b3acd",
    "policy_id": "ten-t-regulation",
    "label": "by 31 December 2030, the development of multimodal passenger hubs to facilitate first…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "charging-infrastructure",
      "hdv-co2",
      "modal-shift"
    ],
    "indicator_ids": [
      "zev-charging-points",
      "esabcc-t5b-zev-lorries-stock",
      "zev-share-truck-stock",
      "adv-freight-rail-share",
      "esabcc-t3a-road-share-passenger",
      "rail-passenger-share",
      "rail-iww-freight-share",
      "road-passenger-share",
      "rail-electrification"
    ],
    "evidence": {
      "charging-infrastructure": [
        "recharging station*",
        "recharging"
      ],
      "hdv-co2": [
        "buses",
        "coach*"
      ],
      "modal-shift": [
        "multimodal",
        "ten-t",
        "trans-european transport network"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-cb8ac9f5",
    "policy_id": "union-civil-protection-mechanism",
    "label": "preparedness objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "early-warning"
    ],
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "evidence": {
      "early-warning": [
        "civil protection",
        "resceu",
        "union civil protection mechanism"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-015302ff",
    "policy_id": "union-civil-protection-mechanism",
    "label": "public awareness objective",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "early-warning"
    ],
    "indicator_ids": [
      "adapt-out-ews-efas-coverage"
    ],
    "evidence": {
      "early-warning": [
        "civil protection",
        "resceu",
        "union civil protection mechanism"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-5b6fa7eb",
    "policy_id": "union-civil-protection-mechanism",
    "label": "national risk assessment and capability summary",
    "rung": "enabling",
    "route": "milestone",
    "confidence": "strong",
    "families": [
      "compliance-milestone"
    ],
    "indicator_ids": [],
    "evidence": {
      "compliance-milestone": [
        "member states shall"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-730fbf8d",
    "policy_id": "waste-framework-directive",
    "label": "The following waste hierarchy shall apply as a priority order in waste prevention and…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-791d5e91",
    "policy_id": "waste-framework-directive",
    "label": "Member States shall take the necessary and appropriate measures to achieve, by 31…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "diets-food-waste",
      "cleantech-manufacturing"
    ],
    "indicator_ids": [
      "esabcc-a5-bovine-consumption",
      "esabcc-a5-dairy-consumption",
      "esabcc-a5-pig-consumption",
      "esabcc-a6-food-waste",
      "food-waste-per-capita",
      "meat-consumption-per-capita",
      "battery-mfg-capacity",
      "solar-pv-mfg-capacity",
      "clean-tech-trade-balance",
      "esabcc-f-cleantech-investment"
    ],
    "evidence": {
      "diets-food-waste": [
        "food waste"
      ],
      "cleantech-manufacturing": [
        "manufactur*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2f609e11",
    "policy_id": "waste-framework-directive",
    "label": "by 2020, the preparing for re-use and the recycling of waste materials such as at least…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ff103340",
    "policy_id": "waste-framework-directive",
    "label": "by 2020, the preparing for re-use, recycling and other material recovery, including…",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-75265f06",
    "policy_id": "waste-framework-directive",
    "label": "by 2025, the preparing for re-use and the recycling of municipal waste shall be…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "municipal waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-6e56e4be",
    "policy_id": "waste-framework-directive",
    "label": "by 2030, the preparing for re-use and the recycling of municipal waste shall be…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "municipal waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-063ef481",
    "policy_id": "waste-framework-directive",
    "label": "by 2035, the preparing for re-use and the recycling of municipal waste shall be…",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "recycl*",
        "municipal waste",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e574acbe",
    "policy_id": "water-framework-directive",
    "label": "Environmental objectives",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration",
      "water-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restore*"
      ],
      "water-quality": [
        "surface water"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-006c4c03",
    "policy_id": "water-framework-directive",
    "label": "Environmental objectives",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-quality",
      "basic-materials"
    ],
    "indicator_ids": [
      "esabcc-i4-steel-ghg-intensity",
      "esabcc-i4-cement-ghg-intensity",
      "esabcc-i4-chemicals-ghg-intensity",
      "esabcc-i2-steel-production",
      "esabcc-i2-cement-production",
      "esabcc-i2-chemicals-production",
      "esabcc-i7a-steel-projects",
      "esabcc-i7b-cement-projects",
      "esabcc-i7c-chemicals-projects"
    ],
    "evidence": {
      "water-quality": [
        "surface water"
      ],
      "basic-materials": [
        "chemical*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-22764fca",
    "policy_id": "water-framework-directive",
    "label": "Environmental objectives",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "restoration",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "restoration": [
        "restore*"
      ],
      "water-stress": [
        "groundwater"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-af443426",
    "policy_id": "water-resilience-strategy",
    "label": "Restoring and protecting the water cycle as basis for sustainable water supply.",
    "rung": "outcome",
    "route": "series",
    "confidence": "weak",
    "families": [
      "restoration",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "restoration": [
        "restore*"
      ],
      "water-stress": [
        "water resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-baacc710",
    "policy_id": "water-resilience-strategy",
    "label": "Building a water-smart economy together with citizens and economic actors in a way that…",
    "rung": "outcome",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "buildings-ghg",
      "industry-ghg",
      "water-stress"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification",
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "buildings-ghg": [
        "building"
      ],
      "industry-ghg": [
        "industr*"
      ],
      "water-stress": [
        "water resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d764fb49",
    "policy_id": "water-resilience-strategy",
    "label": "To guide action on water efficiency across the EU, in view of the potential for water…",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-stress",
      "adaptation-local"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index",
      "adv-adapt-cities-plans",
      "adapt-out-mission-charter-signatories",
      "adapt-out-com-adaptation-signatories"
    ],
    "evidence": {
      "water-stress": [
        "water efficiency",
        "water resilience"
      ],
      "adaptation-local": [
        "region*",
        "territorial"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2d03b04a",
    "policy_id": "water-resilience-strategy",
    "label": "Drinking Water Directive leakage-reduction duty",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "water-reuse-leakage"
    ],
    "indicator_ids": [],
    "evidence": {
      "water-reuse-leakage": [
        "leakage*",
        "water supply network*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e9ef3e8d",
    "policy_id": "water-resilience-strategy",
    "label": "Develop and implement Destination Earth and EU Digital Twin of the Ocean applications…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-stress",
      "adaptation-governance",
      "marine-status"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index",
      "adapt-gov-nap-adopted",
      "adapt-gov-cra-completed",
      "adapt-gov-climate-law-adaptation",
      "adapt-gov-eu-strategy-actions",
      "national-adaptation-strategies"
    ],
    "evidence": {
      "water-stress": [
        "water resilience"
      ],
      "adaptation-governance": [
        "resilience"
      ],
      "marine-status": [
        "ocean*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-ca9cf814",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "restoration"
    ],
    "indicator_ids": [],
    "evidence": {
      "restoration": [
        "restoration measure*",
        "nature restoration",
        "restoration"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-b2dd6556",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "species",
        "biodiversity",
        "habitat*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-266256bb",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "restoration",
      "biodiversity-status",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "restoration": [
        "restore*"
      ],
      "biodiversity-status": [
        "biodiversity"
      ],
      "water-stress": [
        "water resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-435f0151",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-quality",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "water-quality": [
        "water framework directive",
        "surface water"
      ],
      "water-stress": [
        "water resilience",
        "groundwater"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-45ba053a",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "buildings-ghg",
      "renovation"
    ],
    "indicator_ids": [
      "esabcc-b1-buildings-ghg",
      "esabcc-b2-buildings-fec",
      "buildings-ghg",
      "household-energy-per-capita",
      "esabcc-b3-residential-renovation-rate",
      "esabcc-b3-commercial-renovation-rate",
      "building-renovation-rate"
    ],
    "evidence": {
      "buildings-ghg": [
        "energy performance of buildings",
        "building",
        "buildings"
      ],
      "renovation": [
        "renovat*",
        "building renovation plan*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-1a06ec5d",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "industry-ghg",
      "agri-ghg",
      "water-stress"
    ],
    "indicator_ids": [
      "esabcc-i1-industry-ghg",
      "esabcc-i5-industry-fec",
      "esabcc-i6-industry-electrification",
      "industry-ghg",
      "industry-electrification",
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg",
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "industry-ghg": [
        "industrial emissions",
        "industr*"
      ],
      "agri-ghg": [
        "farming",
        "livestock"
      ],
      "water-stress": [
        "water resilience",
        "water use"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e2602443",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "peatlands-soils",
      "agri-ghg",
      "nutrients"
    ],
    "indicator_ids": [
      "adv-peatland-emissions",
      "beta-cropland-grassland-flux",
      "beta-wetlands-flux",
      "esabcc-l2-cropland-area",
      "esabcc-l2-grassland-area",
      "esabcc-l2-wetland-area",
      "esabcc-a1-agri-nonco2",
      "esabcc-a2-bovine-ghg",
      "esabcc-a2-dairy-ghg",
      "esabcc-a2-pig-ghg",
      "agri-ghg",
      "adv-nitrogen-balance",
      "esabcc-a3-fertiliser-use",
      "esabcc-a3-nue",
      "nitrogen-fertiliser-use"
    ],
    "evidence": {
      "peatlands-soils": [
        "soil health",
        "soil"
      ],
      "agri-ghg": [
        "agricultur*",
        "cap strategic plan*"
      ],
      "nutrients": [
        "nutrient*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-43735a1a",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-reuse-leakage",
      "grid-infrastructure",
      "water-quality"
    ],
    "indicator_ids": [
      "battery-storage-capacity",
      "smart-meter-rollout"
    ],
    "evidence": {
      "water-reuse-leakage": [
        "leakage*"
      ],
      "grid-infrastructure": [
        "network*"
      ],
      "water-quality": [
        "drinking water"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-20debc4f",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "water-quality",
      "water-reuse-leakage"
    ],
    "indicator_ids": [],
    "evidence": {
      "water-quality": [
        "urban wastewater",
        "wastewater"
      ],
      "water-reuse-leakage": [
        "water reuse"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-234e47d8",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "water-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "water-quality": [
        "urban wastewater",
        "wastewater",
        "drinking water"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-bf261741",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "water-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "water-quality": [
        "urban wastewater",
        "wastewater",
        "drinking water"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-2efaa2da",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "moderate",
    "families": [
      "water-quality",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "water-quality": [
        "drinking water"
      ],
      "water-stress": [
        "water resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d06c9b8e",
    "policy_id": "water-resilience-strategy",
    "label": "The key 2027-2033 intermediate targets",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-quality",
      "adaptation-local"
    ],
    "indicator_ids": [
      "adv-adapt-cities-plans",
      "adapt-out-mission-charter-signatories",
      "adapt-out-com-adaptation-signatories"
    ],
    "evidence": {
      "water-quality": [
        "urban wastewater",
        "wastewater"
      ],
      "adaptation-local": [
        "cities"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-d01d7f59",
    "policy_id": "water-resilience-strategy",
    "label": "By June 2028, the Commission will evaluate the Water Reuse Regulation, and will…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "water-reuse-leakage",
      "circularity",
      "water-stress"
    ],
    "indicator_ids": [
      "adv-circular-material-use",
      "esabcc-i3-circular-mat-use",
      "beta-dmc-per-capita",
      "beta-resource-productivity",
      "adv-adapt-wei",
      "water-exploitation-index"
    ],
    "evidence": {
      "water-reuse-leakage": [
        "water reuse"
      ],
      "circularity": [
        "reuse"
      ],
      "water-stress": [
        "water resilience"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-0752f1e7",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 1",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "air-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "air-quality": [
        "air pollution",
        "premature death*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-f44985f6",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 2",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "air-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "air-quality": [
        "noise"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-782699f0",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 3",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "biodiversity-status",
      "air-quality"
    ],
    "indicator_ids": [],
    "evidence": {
      "biodiversity-status": [
        "biodiversity",
        "ecosystem*"
      ],
      "air-quality": [
        "air pollution"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-e203357e",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 4",
    "rung": "outcome",
    "route": "series",
    "confidence": "strong",
    "families": [
      "nutrients"
    ],
    "indicator_ids": [
      "adv-nitrogen-balance",
      "esabcc-a3-fertiliser-use",
      "esabcc-a3-nue",
      "nitrogen-fertiliser-use"
    ],
    "evidence": {
      "nutrients": [
        "nutrient loss*",
        "nutrient*"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-c354de79",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 5",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "moderate",
    "families": [
      "marine-status"
    ],
    "indicator_ids": [],
    "evidence": {
      "marine-status": [
        "sea"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-682ee7da",
    "policy_id": "zero-pollution-action-plan",
    "label": "Target 6",
    "rung": "outcome",
    "route": "dataset",
    "confidence": "strong",
    "families": [
      "waste-recycling"
    ],
    "indicator_ids": [],
    "evidence": {
      "waste-recycling": [
        "municipal waste",
        "waste generat*",
        "waste"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9af34bec",
    "policy_id": "zero-pollution-action-plan",
    "label": "Furthermore, the proposed ‘’Mission in the area of Soil Health and Food’, together with…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "peatlands-soils"
    ],
    "indicator_ids": [
      "adv-peatland-emissions",
      "beta-cropland-grassland-flux",
      "beta-wetlands-flux",
      "esabcc-l2-cropland-area",
      "esabcc-l2-grassland-area",
      "esabcc-l2-wetland-area"
    ],
    "evidence": {
      "peatlands-soils": [
        "soil health",
        "soil",
        "soils"
      ]
    },
    "override_reason": ""
  },
  {
    "id": "tgt-9f8ee271",
    "policy_id": "zero-pollution-action-plan",
    "label": "The proposed Horizon Europe Cities Mission will, through a demand-driven and…",
    "rung": "lever",
    "route": "series",
    "confidence": "strong",
    "families": [
      "adaptation-local",
      "ghg-total",
      "rdi-budgets"
    ],
    "indicator_ids": [
      "adv-adapt-cities-plans",
      "adapt-out-mission-charter-signatories",
      "adapt-out-com-adaptation-signatories",
      "esabcc-o1-ghg-total",
      "ghg-total-net",
      "esabcc-f-gerd",
      "esabcc-f-climate-patents-share",
      "energy-rdd-budget"
    ],
    "evidence": {
      "adaptation-local": [
        "cities"
      ],
      "ghg-total": [
        "climate neutrality"
      ],
      "rdi-budgets": [
        "horizon europe"
      ]
    },
    "override_reason": ""
  }
];
