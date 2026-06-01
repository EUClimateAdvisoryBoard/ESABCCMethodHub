/**
 * Finland — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const fi: CountryProfile = {
  code: 'FI',
  name: 'Finland',
  eurostatCode: 'FI',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 61.9241, lon: 25.7482,
    capital: 'Helsinki',
    populationM: 5.6,
    areaKkm2: 338.4,
    gdpPerCapitaEur: 45100,
    summary:
      'Finland adopted in its 2022 Climate Act (Ilmastolaki) the most ambitious ' +
      'climate-neutrality target in the EU: net-zero by 2035, with negative emissions ' +
      'thereafter (-60% by 2050 net). The target rests crucially on the boreal forest ' +
      'sink (~−20 Mt CO₂e in the 2010s), which absorbed about a third of gross ' +
      'emissions — but the sink has collapsed since 2018, turning the LULUCF sector ' +
      'briefly into a net source in 2021-2022 for the first time on record. This has ' +
      'reopened the entire 2035 net-zero feasibility debate.\n\n' +
      'The 2023 Orpo government has maintained the 2035 statutory target but the 2024 ' +
      'Climate Annual Report and the Climate Change Panel (independent expert body) ' +
      'concluded that current policy and the LULUCF outlook are not consistent with ' +
      'the target. New nuclear (Olkiluoto 3 commissioned 2023, 1.6 GW), large district ' +
      'heating heat pumps and Power-to-X projects (Inkoo, Ahvenkoski) form the ' +
      'industrial decarbonisation backbone alongside SSAB\'s green-steel pipeline.',
    highlights: [
      'Net-zero by 2035 — most ambitious EU target — in statute (Climate Act, 2022)',
      'Forest sink crisis: LULUCF briefly net source 2021-2022, reopening 2035 feasibility',
      'Olkiluoto 3 nuclear (1.6 GW) commissioned April 2023 — Europe\'s largest reactor',
      'EU LULUCF Regulation 2030 commitment at very high risk',
      'Wind capacity tripled 2018-2023; offshore-wind framework legislated 2024',
    ],
  },
  ghg: {
    totalLatest: { value: 42, unit: 'Mt CO2e (excl. LULUCF)', year: 2023, source: 'Statistics Finland / UNFCCC' },
    total1990: 71,
    perCapita: { value: 7.5, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.16, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -60, unit: '%', baseline: '1990 (excl. LULUCF)', notes: 'Climate Act 2022 — interim milestone on path to 2035 net-zero.' },
    target2050: { value: -100, unit: '%', year: 2035, notes: 'Net-zero by 2035 incl. LULUCF; ≥−60% net by 2050 (negative emissions).' },
    sectors: [
      { id: 'energy',       label: 'Energy supply',  share: 25, absolute: 11 },
      { id: 'industry',     label: 'Industry',       share: 25, absolute: 11 },
      { id: 'transport',    label: 'Transport',      share: 21, absolute: 9 },
      { id: 'agriculture',  label: 'Agriculture',    share: 15, absolute: 6 },
      { id: 'buildings',    label: 'Buildings',      share: 8,  absolute: 3 },
      { id: 'waste',        label: 'Waste & other',  share: 6,  absolute: 2 },
    ],
    trend: [
      { year: 1990, value: 71 }, { year: 1995, value: 71 },
      { year: 2000, value: 70 }, { year: 2005, value: 69 },
      { year: 2010, value: 75 }, { year: 2015, value: 55 },
      { year: 2019, value: 53 }, { year: 2020, value: 48 },
      { year: 2021, value: 49 }, { year: 2022, value: 46 },
      { year: 2023, value: 42 },
    ],
    narrative:
      'Gross emissions are down ~41% from 1990, driven by phase-out of coal-fired CHP, ' +
      'commissioning of Olkiluoto 3, and the closure of paper-pulp capacity. The ' +
      'critical issue is LULUCF: the forest sink — historically equivalent to ~−25 Mt ' +
      'CO₂e/yr — fell sharply from 2018 as harvests intensified, growth rates declined ' +
      'and natural disturbances increased. The sector turned net source in 2021. The ' +
      'EU LULUCF Regulation requires Finland to deliver -17.8 Mt CO₂e net removals in ' +
      '2030 — currently projected to fall short by 15+ Mt CO₂e.',
    status: 'off-track',
  },
  renewables: {
    shareLatest: { value: 47.9, unit: '%', year: 2023, source: 'Statistics Finland' },
    share2005: 28.6,
    share2020: 43.9,
    target2030: 51,
    bySubsector: [
      { id: 'electricity', label: 'Electricity',       share: 53.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 56.0 },
      { id: 'transport',   label: 'Transport',         share: 22.0 },
    ],
    trend: [
      { year: 2005, value: 28.6 }, { year: 2010, value: 32.4 },
      { year: 2015, value: 39.3 }, { year: 2020, value: 43.9 },
      { year: 2021, value: 43.1 }, { year: 2022, value: 47.9 },
      { year: 2023, value: 47.9 },
    ],
    narrative:
      'Finland\'s RES share is among the highest in the EU, dominated by biomass from ' +
      'the forest-products industry (black liquor, wood chips, forest residues). Wind ' +
      'capacity tripled 2018-2023 (~7 GW end-2023); the 2030 wind pipeline targets ' +
      '~15 GW. Offshore wind framework legislation passed 2024 opens the Gulf of ' +
      'Bothnia. Biomass-share dependency creates tension with the LULUCF objective ' +
      'and Renewable Energy Directive sustainability criteria.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 33, unit: 'Mtoe', year: 2022 },
    final:   { value: 25, unit: 'Mtoe', year: 2022 },
    intensity: { value: 130, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -14,
    narrative:
      'Energy intensity is high vs the EU mean owing to long heating season, dispersed ' +
      'settlement and energy-intensive forest-products industry. Final consumption has ' +
      'fallen ~6% since 2010 despite GDP growth; further savings target ~14% to 2030. ' +
      'District heating decarbonisation (large heat-pump installations in Helsinki ' +
      'and Espoo) is the lead infrastructure project.',
    status: 'partial',
  },
  air: {
    pm25: { value: 5.5, unit: 'µg/m³', year: 2022 },
    no2:  { value: 9.0, unit: 'µg/m³', year: 2022 },
    ozone: { value: 28.0, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 1600, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 48, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Finland has the EU\'s lowest population-weighted PM2.5 exposure thanks to low ' +
      'population density, clean district heating and limited diesel-passenger-car ' +
      'fleet. Residential wood combustion is the dominant remaining urban source; ' +
      'transboundary spring-time PM events from agricultural fires further south ' +
      'occasionally exceed thresholds.',
    status: 'on-track',
  },
  water: {
    surfaceWaterGood: { value: 65, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 98, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 79, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Water quality is among the best in the EU; ~65% of surface water bodies meet ' +
      '"good" ecological status. Eutrophication of the Baltic Sea (Gulf of Finland, ' +
      'Archipelago Sea) remains the dominant cross-border challenge; nutrient losses ' +
      'from agriculture in the south are the main pressure within Finnish waters.',
    status: 'on-track',
  },
  biodiversity: {
    natura2000Land: { value: 12.7, unit: '% land', year: 2023 },
    natura2000Marine: { value: 11, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 2670, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 12, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Finland has extensive protected forest area but only ~12% of habitats reach ' +
      'favourable conservation status. The dominant pressure is the forestry model — ' +
      'high-intensity clear-cut rotations across most of the productive forest base — ' +
      'compounded by drainage of peatland forests. The METSO voluntary forest ' +
      'protection programme and the 2023 Helmi habitat-restoration programme aim to ' +
      'address these pressures; the Nature Restoration Regulation is politically ' +
      'contested.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 42, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 8.3, unit: '%', year: 2022 },
    resourceProductivity: { value: 1.7, unit: '€/kg', year: 2022 },
    narrative:
      'Municipal recycling at ~42% is below the EU-27 average — heavily reliant on ' +
      'waste-to-energy in CHP. Circular material use rate (~8%) is also below average. ' +
      'The 2021 Strategic Programme for a Circular Economy targets a doubling of ' +
      'material circularity by 2035 and 50% reduction in domestic material consumption ' +
      'per capita.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Kansallinen ilmastonmuutokseen sopeutumissuunnitelma 2030',
      adoptedYear: 2014,
      lastUpdate: 2022,
      url: 'https://mmm.fi/en/climate-change-adaptation',
    },
    keyRisks: [
      'Forest fires, pest outbreaks and storm damage to boreal forests',
      'Permafrost / frozen-ground degradation impacting roads and rail in Lapland',
      'Pluvial and river flooding (Pohjanmaa, Helsinki-Vantaa)',
      'Coastal storm surge in Bothnian Bay communities',
      'Heat-stress mortality in southern urban areas (rising rapidly)',
    ],
    sectoralPlans: [
      'Forestry',
      'Agriculture',
      'Water management',
      'Spatial planning',
      'Infrastructure',
    ],
    narrative:
      'National Adaptation Plan 2030 (2022 update) provides a sector-based framework; ' +
      'implementation responsibility sits with sectoral ministries with no statutory ' +
      'enforcement. The Climate Change Panel and the Climate Annual Report have ' +
      'called for a standalone adaptation act and earmarked municipal grants.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-06',
    finalSubmitted: '2024-08',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Finnish draft NECP "sufficient" on ' +
      'ESR ambition but flagged severe concerns on LULUCF compliance with the 2030 ' +
      'EU regulatory commitment, weak quantification of forest-sink restoration ' +
      'measures, and limited additional energy-efficiency policy.',
    esabccCommentary:
      'The 2022 Climate Act\'s 2035 net-zero target was world-leading, but the forest-' +
      'sink crisis since 2018 has substantially weakened feasibility — the Climate ' +
      'Change Panel\'s 2024 assessment concluded the policy mix is not consistent with ' +
      'the statutory target. The single largest open question for the EU is how the ' +
      'LULUCF Regulation 2030 shortfall (15+ Mt CO₂e) will be addressed.',
    gaps: [
      'EU LULUCF Regulation 2030 commitment at very high risk (15+ Mt CO₂e shortfall projected)',
      'No quantified pathway to restore the forest sink to 2010s levels',
      'Transport sector pathway uncertain after biofuel-mandate cut in 2023',
      'Adaptation lacks statutory backbone and earmarked finance',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 466,
    regions: [
      'Eastern and Northern Finland (peat-industry phase-out)',
      'Southern peat regions (energy peat transition)',
    ],
    narrative:
      'JTF allocation focuses primarily on the just-transition of the energy-peat ' +
      'industry, which collapsed faster than anticipated after 2019 ETS price rises ' +
      'and removal of the peat tax break — leaving regional employment gaps. Programme ' +
      'supports reskilling, alternative bio-economy projects and rewetting of cutaway ' +
      'peatlands.',
  },
  policies: [
    {
      name: 'Climate Act (Ilmastolaki)',
      year: 2022,
      summary: 'Statutory 2035 net-zero target — most ambitious in the EU — with 2030 (-60%), 2040 (-80%), 2050 (-90%) milestones; mandates climate plans and independent Climate Change Panel.',
    },
    {
      name: 'Medium-Term Climate Change Plan (KAISU 2030)',
      year: 2022,
      summary: 'ESR-sector implementation plan covering transport, agriculture, buildings, waste and machinery toward the 2030 -50% (effort-sharing) goal.',
    },
    {
      name: 'Climate Change Adaptation Plan 2030',
      year: 2022,
      summary: 'Sector-based national adaptation framework; ministerial implementation without statutory enforcement mechanism.',
    },
    {
      name: 'Offshore Wind Framework Act',
      year: 2024,
      summary: 'Establishes permitting and tendering regime for offshore wind in the Finnish EEZ (Gulf of Bothnia priority).',
    },
    {
      name: 'Energy Peat Tax-Break Repeal',
      year: 2019,
      summary: 'Removal of the favourable energy-peat tax treatment, with associated regional just-transition measures; rapid market exit followed.',
    },
    {
      name: 'METSO Forest Biodiversity Programme',
      year: 2008,
      summary: 'Voluntary forest-protection programme compensating private landowners for habitat protection; budget reinforced in 2022 plan.',
    },
    {
      name: 'Helmi Habitat Programme',
      year: 2021,
      summary: 'Restoration programme for peatlands, traditional rural biotopes, wetlands and small water bodies; scaled-up in 2023.',
    },
  ],
  watchNotes:
    '• Forest-sink trajectory is the single most consequential climate-policy variable for Finland — ' +
    'and likely the EU\'s single largest LULUCF Regulation compliance risk.\n' +
    '• Climate Annual Report (Ilmastovuosikertomus) and the independent Climate Change Panel publish ' +
    'reality-checks on policy consistency vs the statutory 2035 target.\n' +
    '• Olkiluoto 1/2 (operating) and OL3 (2023 commissioned) plus the cancelled Hanhikivi-1 project ' +
    'shape the post-2030 baseload outlook; new small-modular-reactor (SMR) framework legislation expected 2026.',
};

export default fi;
