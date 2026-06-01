"""Build src/data/esabcc-indicators.ts from the extracted Excel JSON.

The ESABCC 'Towards EU climate neutrality' report's underlying data
ships one figure per progress indicator (O1-O3, E1-E6, I1-I7, T1-T6,
B1-B6, A1-A7, L1-L8, plus finance / R&D figures 74-86). Each figure
holds several series (historic + scenario benchmarks). For the
Indicator Database we keep ONE historical time-series per indicator
(the totals / 'Historic' row) and surface 2030 / 2050 benchmarks via
the existing targetValue / targetYear fields when available.

The output file declares one Indicator per ESABCC code, all flagged
`group: 'esabcc'`. The pre-existing ECNO indicators continue to live
in ecno-indicators.ts but are re-emitted with `group: 'additional'`
and, where a topical match exists, `duplicateOf` points at the ESABCC
entry.
"""
import json
import re

DATA = json.load(open('scripts/esabcc-indicators/extract.json'))

# ── Per-figure recipe ────────────────────────────────────────────────────
# Each entry produces one Indicator. Fields:
#   sheet      — workbook sheet name to pull data from
#   series     — series label inside the sheet (case-insensitive contains-match)
#   id         — TypeScript indicator id (also keys live-sources)
#   code       — indicator code as printed in the report (e.g. 'O1', 'E4a')
#   name       — short name shown in the UI
#   category   — one of IndicatorCategory
#   description, sourceShort, sourceUrl
#   direction  — 'up' or 'down' (better-is direction)
#   target     — optional (value, year)
#   duplicateOf — optional id from ECNO_INDICATORS this matches
#   unitOverride — optional unit override (Excel units are sometimes shorthand)

RECIPES = [
    # ── Overall ─────────────────────────────────────────────────────────
    {
        'sheet': 'Figure 7', 'series': 'Total (ECL scope)',
        'id': 'esabcc-o1-ghg-total', 'code': 'O1',
        'name': 'Total EU GHG emissions (European Climate Law scope)',
        'category': 'emissions', 'unitOverride': 'Mt CO₂eq',
        'description':
            "ESABCC progress indicator O1. Total EU-27 GHG emissions in the "
            "scope of the European Climate Law (EU-27 plus international "
            "aviation and maritime). 2030 target: -55% vs 1990; 2050: "
            "climate neutrality; ESABCC 2040 advice range: -90 to -95%.",
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down', 'target': (2150, 2030),
        'duplicateOf': 'ghg-total-net',
    },
    {
        'sheet': 'Figure 9', 'series': 'PEC',
        'id': 'esabcc-o2-pec', 'code': 'O2 (PEC)',
        'name': 'Primary energy consumption (EU-27)',
        'category': 'energy-demand', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator O2 (primary energy component). '
            'EED 2030 indicative benchmark applies; Climate Target Plan MIX '
            '2050 trajectory used as longer-run benchmark.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 9', 'series': 'FEC',
        'id': 'esabcc-o2-fec', 'code': 'O2 (FEC)',
        'name': 'Final energy consumption (EU-27)',
        'category': 'energy-demand', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator O2 (final energy component). 2030 '
            'EED indicative benchmark: 763 Mtoe (~8 875 TWh).',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
        'duplicateOf': 'final-energy-consumption',
    },
    {
        'sheet': 'Figure 10', 'series': 'Total',
        'id': 'esabcc-o3-gross-inland', 'code': 'O3',
        'name': 'Gross inland energy consumption (EU-27)',
        'category': 'energy-demand', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator O3. Gross inland energy consumption '
            'covering all fuels and renewables. Benchmark from Climate Target '
            'Plan MIX 2050 scenario.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    # ── Energy supply (E1-E6) ────────────────────────────────────────────
    {
        'sheet': 'Figure 11 and 13', 'series': 'Total',
        'id': 'esabcc-e1-energy-supply-ghg', 'code': 'E1',
        'name': 'Energy supply GHG emissions',
        'category': 'energy-supply', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator E1. Total energy supply emissions: '
            'public power & heat, refineries and other energy industries. '
            'Fit-for-55 MIX gives the 2030 benchmark.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'power-sector-ghg',
    },
    {
        'sheet': 'Figure 14', 'series': 'Share fossils',
        'id': 'esabcc-e2-fossil-power-share', 'code': 'E2 (fossil)',
        'name': 'Fossil share of EU electricity mix',
        'category': 'energy-supply', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator E2 (fossil component). Share of fossil '
            'fuels in total electricity generation; complements the renewable '
            'share to highlight the substitution pace.',
        'sourceShort': 'Eurostat (nrg_bal_peh)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table',
        'direction': 'down',
        'duplicateOf': 'fossil-power-share',
    },
    {
        'sheet': 'Figure 14', 'series': 'Share renewables (excl. bio)',
        'id': 'esabcc-e2-res-noBio-power-share', 'code': 'E2 (RES)',
        'name': 'Non-biomass renewable share of EU electricity mix',
        'category': 'energy-supply', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator E2 (renewables component). Share of '
            'non-biomass renewables (wind, solar PV, hydro, geothermal) in '
            'total electricity generation.',
        'sourceShort': 'Eurostat (nrg_bal_peh)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table',
        'direction': 'up',
    },
    {
        'sheet': 'Figure 15', 'series': 'historical',
        'id': 'esabcc-e3-grid-co2-intensity', 'code': 'E3',
        'name': 'Average GHG intensity of EU electricity',
        'category': 'energy-supply', 'unitOverride': 'g CO₂eq/kWh',
        'description':
            'ESABCC progress indicator E3. Average EU electricity GHG '
            'intensity (Scope-2). Fit-for-55 MIX 2030 benchmark plus '
            '1.5TECH 2050 trajectory.',
        'sourceShort': 'EEA',
        'sourceUrl': 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 16', 'series': 'Historic',
        'id': 'esabcc-e4a-solar-pv-add', 'code': 'E4a',
        'name': 'Annual solar PV capacity additions (EU)',
        'category': 'energy-supply', 'unitOverride': 'GW/yr',
        'description':
            'ESABCC progress indicator E4a. Net new solar photovoltaic '
            'capacity commissioned per year across the EU-27.',
        'sourceShort': 'Eurostat (nrg_inf_epcrw)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table',
        'direction': 'up',
        'duplicateOf': 'solar-pv-additions',
    },
    {
        'sheet': 'Figure 17', 'series': 'Historic',
        'id': 'esabcc-e4b-wind-add', 'code': 'E4b/c',
        'name': 'Annual wind capacity additions (EU)',
        'category': 'energy-supply', 'unitOverride': 'GW/yr',
        'description':
            'ESABCC progress indicators E4b (onshore) and E4c (offshore). '
            'Net new wind capacity commissioned per year, all axes.',
        'sourceShort': 'Eurostat (nrg_inf_epcrw)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table',
        'direction': 'up',
        'duplicateOf': 'wind-additions',
    },
    {
        'sheet': 'Figure 18', 'series': 'Historic',
        'id': 'esabcc-e5-electrification', 'code': 'E5',
        'name': 'Electrification rate of final energy use',
        'category': 'energy-demand', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator E5. Share of electricity in total '
            'final energy consumption; Fit-for-55 MIX gives the 2030 benchmark.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'up',
        'duplicateOf': 'end-use-electrification',
    },
    {
        'sheet': 'Figure 19', 'series': 'Total',
        'id': 'esabcc-e6-energy-ch4', 'code': 'E6',
        'name': 'Energy-related methane emissions (EU-27)',
        'category': 'energy-supply', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator E6. Methane emissions from fuel '
            'combustion and fugitives. Aligned with the Methane Regulation.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    # ── Industry (I1-I7) ─────────────────────────────────────────────────
    {
        'sheet': 'Figure 20 and 23', 'series': 'Total',
        'id': 'esabcc-i1-industry-ghg', 'code': 'I1',
        'name': 'Industrial GHG emissions',
        'category': 'industry', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator I1. Industrial CO₂ plus other GHGs '
            '(combustion + process emissions). Fit-for-55 MIX 2030 benchmark.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'industry-ghg',
    },
    {
        'sheet': 'Figure 25', 'series': 'Historic',
        'id': 'esabcc-i3-circular-mat-use', 'code': 'I3',
        'name': 'Circular material use rate (EU)',
        'category': 'industry', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator I3. Share of material input from '
            'recycled sources. Circular Economy Action Plan benchmark: '
            '23.4% by 2030.',
        'sourceShort': 'Eurostat (sdg_12_41)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/sdg_12_41/default/table',
        'direction': 'up', 'target': (23.4, 2030),
    },
    {
        'sheet': 'Figure 26', 'series': 'Steel',
        'id': 'esabcc-i4-steel-ghg-intensity', 'code': 'I4 (steel)',
        'name': 'GHG intensity of EU steel production',
        'category': 'industry', 'unitOverride': 't CO₂/t',
        'description':
            'ESABCC progress indicator I4 (steel component). Total emissions '
            '(combustion + process) per tonne of crude steel produced.',
        'sourceShort': 'EEA + Eurofer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 26', 'series': 'Cement',
        'id': 'esabcc-i4-cement-ghg-intensity', 'code': 'I4 (cement)',
        'name': 'GHG intensity of EU cement production',
        'category': 'industry', 'unitOverride': 't CO₂/t',
        'description':
            'ESABCC progress indicator I4 (cement component). Total emissions '
            'per tonne of cement produced.',
        'sourceShort': 'EEA + Cembureau',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 26', 'series': 'Base organic chemicals',
        'id': 'esabcc-i4-chemicals-ghg-intensity', 'code': 'I4 (chemicals)',
        'name': 'GHG intensity of EU base organic chemicals',
        'category': 'industry', 'unitOverride': 't CO₂/t',
        'description':
            'ESABCC progress indicator I4 (chemicals component). Combustion + '
            'process emissions per tonne of ethylene, propylene, methanol etc.',
        'sourceShort': 'EEA + Eurostat (DS-056120)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 27', 'series': 'Total',
        'id': 'esabcc-i5-industry-fec', 'code': 'I5',
        'name': 'Industrial final energy consumption (EU)',
        'category': 'industry', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator I5. Final energy use in manufacturing '
            'industries (excluding non-energy use).',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 28', 'series': '% of electricity',
        'id': 'esabcc-i6-industry-electrification', 'code': 'I6',
        'name': 'Electricity share of industrial final energy use',
        'category': 'industry', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator I6. Share of electricity in industrial '
            'final energy use (excluding non-energy use). Climate Target Plan '
            'benchmarks for 2030 and 2050.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'up',
        'duplicateOf': 'industry-electrification',
    },
    # ── Transport (T1-T6) ────────────────────────────────────────────────
    {
        'sheet': 'Figure 32 and 34', 'series': 'Total',
        'id': 'esabcc-t1-transport-ghg', 'code': 'T1',
        'name': 'Transport GHG emissions (EU)',
        'category': 'transport', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator T1. All EU-27 transport GHG emissions '
            '(road, rail, IWW, aviation). Fit-for-55 MIX 2030 benchmark.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 35', 'series': 'Total',
        'id': 'esabcc-t2a-passenger-demand', 'code': 'T2a',
        'name': 'Total passenger transport demand',
        'category': 'transport', 'unitOverride': 'Gpkm',
        'description':
            'ESABCC progress indicator T2a. Total passenger-kilometres '
            'travelled across all inland and air modes.',
        'sourceShort': 'Eurostat Statistical Pocketbook',
        'sourceUrl': 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 36', 'series': 'Total',
        'id': 'esabcc-t2b-freight-demand', 'code': 'T2b',
        'name': 'Total freight transport demand',
        'category': 'transport', 'unitOverride': 'Gtkm',
        'description':
            'ESABCC progress indicator T2b. Total freight tonne-kilometres '
            'across road, rail and inland waterways.',
        'sourceShort': 'Eurostat Statistical Pocketbook',
        'sourceUrl': 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 37', 'series': 'Passenger (cars and two-wheelers)',
        'id': 'esabcc-t3a-road-share-passenger', 'code': 'T3a',
        'name': 'Road share of motorised inland passenger transport',
        'category': 'transport', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator T3a. Passenger-side road share '
            '(cars + two-wheelers) of motorised inland transport, excluding '
            'aviation, maritime and active modes.',
        'sourceShort': 'Eurostat Statistical Pocketbook',
        'sourceUrl': 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en',
        'direction': 'down',
        'duplicateOf': 'road-passenger-share',
    },
    {
        'sheet': 'Figure 38', 'series': 'Historic',
        'id': 'esabcc-t3b-air-passenger', 'code': 'T3b',
        'name': 'Intra-EU air passenger transport',
        'category': 'transport', 'unitOverride': 'Gpkm',
        'description':
            'ESABCC progress indicator T3b. Intra-EU passenger-kilometres '
            'travelled by air; Fit-for-55 MIX 2030 plus 1.5LIFE/TECH 2050 '
            'benchmarks.',
        'sourceShort': 'Eurostat Statistical Pocketbook',
        'sourceUrl': 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 40', 'series': 'Historic - WLTP',
        'id': 'esabcc-t4-car-co2-intensity', 'code': 'T4',
        'name': 'Average CO₂ intensity of new passenger cars (WLTP)',
        'category': 'transport', 'unitOverride': 'g CO₂/km',
        'description':
            'ESABCC progress indicator T4. Average tailpipe CO₂ intensity '
            'of newly registered cars, WLTP basis. Reg (EU) 2023/851 sets '
            '0 g/km from 2035.',
        'sourceShort': 'EEA',
        'sourceUrl': 'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger',
        'direction': 'down', 'target': (0, 2035),
    },
    {
        'sheet': 'Figure 41', 'series': 'ZEV share',
        'id': 'esabcc-t5a-zev-share-newcars', 'code': 'T5a',
        'name': 'ZEV share of new passenger car registrations',
        'category': 'transport', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator T5a. Battery-electric + fuel-cell '
            'share of new passenger car registrations.',
        'sourceShort': 'EU Alternative Fuels Observatory',
        'sourceUrl': 'https://alternative-fuels-observatory.ec.europa.eu/',
        'direction': 'up', 'target': (100, 2035),
        'duplicateOf': 'ev-share-new-cars',
    },
    {
        'sheet': 'Figure 42', 'series': 'Total',
        'id': 'esabcc-t5b-zev-lorries-stock', 'code': 'T5b',
        'name': 'Zero-emission lorries in the EU fleet',
        'category': 'transport', 'unitOverride': 'vehicles',
        'description':
            'ESABCC progress indicator T5b. Stock of zero-emission heavy-duty '
            'lorries on EU roads.',
        'sourceShort': 'EU Alternative Fuels Observatory',
        'sourceUrl': 'https://alternative-fuels-observatory.ec.europa.eu/',
        'direction': 'up',
        'duplicateOf': 'zev-share-truck-stock',
    },
    {
        'sheet': 'Figure 43', 'series': 'Historic',
        'id': 'esabcc-t6a-fossil-transport-share', 'code': 'T6a',
        'name': 'Fossil share of transport energy use',
        'category': 'transport', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator T6a. Fossil share of transport energy '
            'use including international bunker fuels.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 44', 'series': 'Biofuels from food crops',
        'id': 'esabcc-t6b-foodcrop-biofuels', 'code': 'T6b',
        'name': 'Use of first-generation (food-crop) biofuels in transport',
        'category': 'transport', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator T6b. Energy from first-generation '
            'biofuels (food/feed crops) used in the transport sector.',
        'sourceShort': 'SHARES summary',
        'sourceUrl': 'https://ec.europa.eu/eurostat/web/energy/data/shares',
        'direction': 'down',
    },
    # ── Buildings (B1-B6) ────────────────────────────────────────────────
    {
        'sheet': 'Figure 45 and 47', 'series': 'Total',
        'id': 'esabcc-b1-buildings-ghg', 'code': 'B1',
        'name': 'Residential + tertiary building GHG emissions',
        'category': 'buildings', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator B1. Direct GHG emissions from heating, '
            'cooling and cooking in residential and tertiary buildings.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'buildings-ghg',
    },
    {
        'sheet': 'Figure 48', 'series': 'Total (residential + tertiary)',
        'id': 'esabcc-b2-buildings-fec', 'code': 'B2',
        'name': 'Final energy consumption in buildings',
        'category': 'buildings', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator B2. Final energy consumption in '
            'residential plus tertiary buildings (heating, cooling, ' +
            'appliances, lighting).',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 51', 'series': 'Fossils',
        'id': 'esabcc-b5a-residential-fossil-share', 'code': 'B5a',
        'name': 'Fossil share of residential energy mix',
        'category': 'buildings', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator B5a (fossil component). Share of '
            'fossil fuels in residential final energy consumption.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 52', 'series': 'Fossils',
        'id': 'esabcc-b5b-tertiary-fossil-share', 'code': 'B5b',
        'name': 'Fossil share of tertiary energy mix',
        'category': 'buildings', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator B5b (fossil component). Share of '
            'fossil fuels in tertiary sector final energy consumption.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 53', 'series': 'Historic',
        'id': 'esabcc-b6-heat-pump-stock', 'code': 'B6',
        'name': 'EU stock of installed heat pumps',
        'category': 'buildings', 'unitOverride': 'million units',
        'description':
            'ESABCC progress indicator B6. Cumulative stock of heat pumps. '
            'REPowerEU 2030 objective requires 60 million units.',
        'sourceShort': 'European Heat Pump Association',
        'sourceUrl': 'https://www.ehpa.org/market-data/',
        'direction': 'up', 'target': (60, 2030),
        'duplicateOf': 'heat-pump-stock',
    },
    # ── Agriculture (A1-A7) ──────────────────────────────────────────────
    {
        'sheet': 'Figure 54 and 56', 'series': 'Total',
        'id': 'esabcc-a1-agri-nonco2', 'code': 'A1',
        'name': 'Agricultural non-CO₂ emissions',
        'category': 'agriculture', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator A1. Non-CO₂ emissions from EU '
            'agriculture (enteric fermentation, manure, fertiliser, other).',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'agri-ghg',
    },
    {
        'sheet': 'Figure 58', 'series': 'Total',
        'id': 'esabcc-a3-fertiliser-use', 'code': 'A3 (use)',
        'name': 'Total fertiliser nitrogen use (EU)',
        'category': 'agriculture', 'unitOverride': 'Mt N',
        'description':
            'ESABCC progress indicator A3 (total use). Total nitrogen applied '
            'as inorganic + organic fertiliser. Farm-to-Fork 2030 benchmark: '
            '20% reduction vs 2018.',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'nitrogen-fertiliser-use',
    },
    {
        'sheet': 'Figure 58', 'series': 'Nitrogen Use Efficiency',
        'id': 'esabcc-a3-nue', 'code': 'A3 (NUE)',
        'name': 'Nitrogen use efficiency in EU agriculture',
        'category': 'agriculture', 'unitOverride': '%',
        'description':
            'ESABCC progress indicator A3 (efficiency component). Share of '
            'applied N that ends up in harvested products.',
        'sourceShort': 'Ludemann et al. 2023',
        'sourceUrl': 'https://doi.org/10.1093/jambio/lxac084',
        'direction': 'up',
    },
    {
        'sheet': 'Figure 62', 'series': 'Historic total',
        'id': 'esabcc-a7-bioenergy-feedstock', 'code': 'A7',
        'name': 'Agricultural products used as bioenergy feedstock',
        'category': 'agriculture', 'unitOverride': 'Mt fresh',
        'description':
            'ESABCC progress indicator A7. Cereal and oilseed crops diverted '
            'to bioenergy. Climate Target Plan 2030 benchmark for sustainable '
            'levels.',
        'sourceShort': 'JRC medium-term outlook',
        'sourceUrl': 'https://datam.jrc.ec.europa.eu/datam/mashup/AGRICULTURAL_OUTLOOK/',
        'direction': 'down',
    },
    # ── LULUCF (L1-L8) ───────────────────────────────────────────────────
    {
        'sheet': 'Figure 63 and 65', 'series': 'Total',
        'id': 'esabcc-l1-lulucf-net', 'code': 'L1',
        'name': 'LULUCF net GHG balance',
        'category': 'lulucf', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator L1. Net GHG balance for land use, '
            'land-use change and forestry (negative = net removals). '
            'LULUCF Regulation 2030 target: net -310 Mt CO₂eq.',
        'sourceShort': 'EEA GHG data viewer',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down', 'target': (-310, 2030),
        'duplicateOf': 'lulucf-net-removal',
    },
    {
        'sheet': 'Figure 67', 'series': 'Afforestation',
        'id': 'esabcc-l3-afforestation', 'code': 'L3',
        'name': 'Annual afforested area',
        'category': 'lulucf', 'unitOverride': 'thousand ha/yr',
        'description':
            'ESABCC progress indicator L3. Annual area of land newly '
            'classified as forest (afforestation).',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'up',
    },
    {
        'sheet': 'Figure 67', 'series': 'Deforestation',
        'id': 'esabcc-l4-deforestation', 'code': 'L4',
        'name': 'Annual deforested area',
        'category': 'lulucf', 'unitOverride': 'thousand ha/yr',
        'description':
            'ESABCC progress indicator L4. Annual area of forest converted '
            'to other land uses (deforestation).',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 68', 'series': 'annual increase in settlement area',
        'id': 'esabcc-l5-settlement-area', 'code': 'L5',
        'name': 'Annual settlement area increase (net land take proxy)',
        'category': 'lulucf', 'unitOverride': 'thousand ha/yr',
        'description':
            'ESABCC progress indicator L5. Annual increase in settlement '
            'area used as proxy for net land take. 7th EAP no-net-land-take '
            '2050 target.',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down', 'target': (0, 2050),
    },
    {
        'sheet': 'Figure 69', 'series': 'Living biomass sink',
        'id': 'esabcc-l6-forest-sink', 'code': 'L6',
        'name': 'Forest land living-biomass carbon sink',
        'category': 'lulucf', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator L6. Net removals attributed to living '
            'forest biomass (negative = removals).',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
        'duplicateOf': 'forest-net-sink',
    },
    {
        'sheet': 'Figure 71', 'series': 'Total',
        'id': 'esabcc-l7-nonforest-lulucf', 'code': 'L7',
        'name': 'Non-forest LULUCF net GHG emissions',
        'category': 'lulucf', 'unitOverride': 'Mt CO₂eq',
        'description':
            'ESABCC progress indicator L7. Net GHG balance from cropland, '
            'grassland, wetlands and settlements (positive = net emissions).',
        'sourceShort': 'EU GHG inventory (CRF)',
        'sourceUrl': 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
        'direction': 'down',
    },
    {
        'sheet': 'Figure 72', 'series': 'Total',
        'id': 'esabcc-l8-bioenergy-use', 'code': 'L8',
        'name': 'Total bioenergy use (EU-27)',
        'category': 'lulucf', 'unitOverride': 'TWh',
        'description':
            'ESABCC progress indicator L8. Final consumption of bioenergy '
            'across power, heat, transport, industry and other sectors.',
        'sourceShort': 'Eurostat (nrg_bal_c)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
        'direction': 'down',
    },
    # ── Finance / Carbon pricing / R&D ───────────────────────────────────
    {
        'sheet': 'Figure 78', 'series': 'FFST',
        'id': 'esabcc-f-fossil-subsidies', 'code': 'F1',
        'name': 'EU fossil-fuel subsidies (FFST)',
        'category': 'finance', 'unitOverride': 'billion EUR',
        'description':
            'ESABCC chapter on finance. Total EU fossil-fuel subsidies '
            'estimated by the Fossil Fuel Subsidy Tracker. Should fall to '
            'zero per Council conclusions.',
        'sourceShort': 'Fossil Fuel Subsidy Tracker',
        'sourceUrl': 'https://fossilfuelsubsidytracker.org/',
        'direction': 'down', 'target': (0, 2025),
        'duplicateOf': 'fossil-subsidies',
    },
    {
        'sheet': 'Figure 80', 'series': 'Green bonds',
        'id': 'esabcc-f-green-bonds', 'code': 'F2',
        'name': 'EU green bond issuance',
        'category': 'finance', 'unitOverride': 'billion EUR',
        'description':
            'ESABCC chapter on finance. Annual green bond issuance by EU '
            'issuers (sovereign + corporate).',
        'sourceShort': 'BloombergNEF',
        'sourceUrl': 'https://about.bnef.com/clean-energy-investment/',
        'direction': 'up',
        'duplicateOf': 'green-bond-issuance',
    },
    {
        'sheet': 'Figure 80', 'series': 'Green bonds share',
        'id': 'esabcc-f-green-bonds-share', 'code': 'F2 (share)',
        'name': 'Green share of EU bond issuance',
        'category': 'finance', 'unitOverride': '%',
        'description':
            'ESABCC chapter on finance. Green bonds as a share of total '
            'EU bond issuance.',
        'sourceShort': 'BloombergNEF',
        'sourceUrl': 'https://about.bnef.com/clean-energy-investment/',
        'direction': 'up',
    },
    {
        'sheet': 'Figure 81', 'series': 'EU27',
        'id': 'esabcc-f-gerd', 'code': 'F3',
        'name': 'EU R&D expenditure (GERD)',
        'category': 'finance', 'unitOverride': '% of GDP',
        'description':
            'ESABCC chapter on innovation. Gross domestic expenditure on '
            'research and development as a share of GDP. Lisbon agenda '
            'target: 3%.',
        'sourceShort': 'Eurostat (rd_e_gerdtot)',
        'sourceUrl': 'https://ec.europa.eu/eurostat/databrowser/view/rd_e_gerdtot/default/table',
        'direction': 'up', 'target': (3.0, 2030),
    },
    {
        'sheet': 'Figure 83', 'series': 'Share of climate patents across all fillings in the EU',
        'id': 'esabcc-f-climate-patents-share', 'code': 'F4',
        'name': 'Climate-related share of EU patent filings',
        'category': 'finance', 'unitOverride': '%',
        'description':
            'ESABCC chapter on innovation. Climate-mitigation patents as a '
            'share of all EU patent filings (OECD ENV-Tech taxonomy).',
        'sourceShort': 'OECD Green Growth Indicators',
        'sourceUrl': 'https://www.oecd.org/environment/indicators-modelling-outlooks/',
        'direction': 'up',
    },
    {
        'sheet': 'Figure 86', 'series': 'EU',
        'id': 'esabcc-f-cleantech-investment', 'code': 'F5',
        'name': 'Cleantech investment in the EU',
        'category': 'finance', 'unitOverride': '% of GDP',
        'description':
            'ESABCC chapter on innovation. Total cleantech investment '
            '(public + private) relative to EU GDP.',
        'sourceShort': 'Cleantech for Europe',
        'sourceUrl': 'https://www.cleantechforeurope.com/publications/',
        'direction': 'up',
        'duplicateOf': 'clean-tech-investment',
    },
]


def find_series(sheet, label_substring):
    rec = DATA.get(sheet)
    if not rec:
        return None
    lab = label_substring.strip().lower()
    for s in rec['series']:
        if s['label'].strip().lower() == lab:
            return s
    for s in rec['series']:
        if lab in s['label'].strip().lower():
            return s
    return None


def ts_string(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def emit_recipe(r):
    s = find_series(r['sheet'], r['series'])
    if not s:
        return f"  // [missing] {r['sheet']} / {r['series']}\n"
    points = [p for p in s['data'] if isinstance(p['value'], (int, float))]
    points.sort(key=lambda p: p['year'])
    # Round to 4 sig figs to reduce file size
    def fmt(v):
        if v == 0:
            return '0'
        av = abs(v)
        if av >= 100:
            return f'{v:.1f}'
        if av >= 10:
            return f'{v:.2f}'
        if av >= 1:
            return f'{v:.3f}'
        return f'{v:.4f}'
    pts = ', '.join(f"{{ year: {p['year']}, value: {fmt(p['value'])} }}" for p in points)
    src_url = r['sourceUrl']
    unit = r.get('unitOverride') or s['unit'] or ''
    tgt = r.get('target')
    target_lines = ''
    if tgt is not None:
        target_lines = f"    targetValue: {tgt[0]},\n    targetYear: {tgt[1]},\n"
    dup = r.get('duplicateOf')
    dup_line = f"    duplicateOf: {ts_string(dup)},\n" if dup else ''
    return (
        "  {\n"
        f"    id: {ts_string(r['id'])},\n"
        f"    code: {ts_string(r['code'])},\n"
        f"    name: {ts_string(r['name'])},\n"
        f"    category: {ts_string(r['category'])},\n"
        f"    unit: {ts_string(unit)},\n"
        f"    description:\n      {ts_string(r['description'])},\n"
        f"    source: {ts_string(r['sourceShort'])},\n"
        f"    sourceUrl: {ts_string(src_url)},\n"
        f"    direction: {ts_string(r['direction'])},\n"
        f"{target_lines}"
        f"{dup_line}"
        "    group: 'esabcc',\n"
        "    isSeed: true,\n"
        f"    data: [{pts}],\n"
        "  },\n"
    )


lines = [
    "/**\n"
    " * ESABCC report (2024, 'Towards EU climate neutrality') progress\n"
    " * indicators — primary historical time series for each named\n"
    " * indicator (O1-O3, E1-E6, I1-I7, T1-T6, B1-B6, A1-A7, L1-L8, plus\n"
    " * the finance/innovation chapter figures 78, 80-86).\n"
    " *\n"
    " * Generated by scripts/esabcc-indicators/build.py from the report's\n"
    " * underlying-data workbook. Numbers are rounded; full precision is\n"
    " * preserved in scripts/esabcc-indicators/extract.json. Where the\n"
    " * primary publisher (Eurostat / EEA / EAFO / EHPA / IRENA) has a\n"
    " * stable API, the indicator id is also registered in the live-source\n"
    " * registry so 'Refresh from source' pulls fresh values.\n"
    " *\n"
    " * Cross-reference with ECNO_INDICATORS via the `duplicateOf` field:\n"
    " * the ESABCC indicator is treated as the authoritative copy, and the\n"
    " * ECNO entry stays around as an `additional` indicator covering the\n"
    " * same concept (kept so projects that already linked to that id\n"
    " * don't break).\n"
    " */\n"
    "import type { Indicator } from './ecno-indicators';\n"
    "\n"
    "export const ESABCC_REPORT_INDICATORS: Indicator[] = [\n"
]

for r in RECIPES:
    lines.append(emit_recipe(r))

lines.append("];\n")
print(''.join(lines))
