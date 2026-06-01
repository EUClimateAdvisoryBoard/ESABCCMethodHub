/**
 * Estonia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const ee: CountryProfile = {
  code: 'EE',
  name: 'Estonia',
  eurostatCode: 'EE',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 58.5953, lon: 25.0136,
    capital: 'Tallinn',
    populationM: 1.37,
    areaKkm2: 45.3,
    gdpPerCapitaEur: 23800,
    summary:
      'Estonia is the most carbon-intensive economy in the EU per unit of energy, a ' +
      'historical inheritance of its oil-shale industry — uniquely, Estonia is the ' +
      'only country in the world generating most of its electricity from oil shale. ' +
      'Total greenhouse-gas emissions have nevertheless fallen ~60% since 1990 ' +
      '(post-Soviet industrial collapse plus the post-2018 ETS-price-driven retreat ' +
      'of oil-shale generation), making Estonia\'s headline decarbonisation record ' +
      'one of the strongest in the EU on a percentage basis. The Ida-Viru oil-shale ' +
      'region anchors the just-transition agenda.\n\n' +
      'In May 2022 the Riigikogu adopted a climate-neutrality target by 2050 and is ' +
      'preparing a binding Climate Act. Estonia has bet on a digital-government and ' +
      'efficiency-led decarbonisation model; the e-government infrastructure is ' +
      'leveraged for monitoring, building stock data and circular-economy tracking. ' +
      'The 2025 Baltic synchronisation with the European continental grid (and ' +
      'desynchronisation from the Russian BRELL system) is a defining moment for ' +
      'electricity-sector planning.',
    highlights: [
      'Climate neutrality by 2050 (statutory Climate Act under preparation)',
      'Oil-shale phase-out: electricity-only generation ends in 2035, all uses by 2040',
      'GHG cut ~60% from 1990 — among the EU\'s steepest reductions',
      'Baltic synchronisation with European grid completed February 2025',
    ],
  },
  ghg: {
    totalLatest: { value: 11.8, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC' },
    total1990: 39.6,
    perCapita: { value: 8.6, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.36, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -24, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55; LULUCF separate.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (2022 Riigikogu resolution).' },
    sectors: [
      { id: 'power',          label: 'Power & heat',  share: 38, absolute: 4.5 },
      { id: 'transport',      label: 'Transport',     share: 22, absolute: 2.6 },
      { id: 'industry',       label: 'Industry',      share: 14, absolute: 1.7 },
      { id: 'agriculture',    label: 'Agriculture',   share: 12, absolute: 1.4 },
      { id: 'buildings',      label: 'Buildings',     share: 9,  absolute: 1.1 },
      { id: 'waste',          label: 'Waste & other', share: 5,  absolute: 0.5 },
    ],
    trend: [
      { year: 1990, value: 39.6 }, { year: 1995, value: 20.7 },
      { year: 2000, value: 17.2 }, { year: 2005, value: 18.7 },
      { year: 2010, value: 20.6 }, { year: 2015, value: 16.7 },
      { year: 2019, value: 14.4 }, { year: 2020, value: 11.5 },
      { year: 2021, value: 13.6 }, { year: 2022, value: 11.8 },
      { year: 2023, value: 9.8 },
    ],
    narrative:
      'Headline emissions have plummeted as oil-shale electricity output has fallen ' +
      'from peaks above 12 TWh (2018) to <2 TWh in 2023 — a direct consequence of ' +
      'EU ETS prices crossing the marginal-cost threshold of oil-shale generation. ' +
      'However, the sector remains a strategic security asset and a partial revival ' +
      'is possible. The 2023 emissions of ~10 Mt is the lowest annual figure in the ' +
      'series. Transport and agriculture are now the binding non-ETS challenges.',
    status: 'on-track',
  },
  renewables: {
    shareLatest: { value: 38.5, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 17.5,
    share2020: 30.1,
    target2030: 65,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 28.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 61.4 },
      { id: 'transport',   label: 'Transport',  share: 8.2 },
    ],
    trend: [
      { year: 2005, value: 17.5 }, { year: 2010, value: 24.6 },
      { year: 2015, value: 29.0 }, { year: 2020, value: 30.1 },
      { year: 2021, value: 37.6 }, { year: 2022, value: 38.5 },
      { year: 2023, value: 41.0 },
    ],
    narrative:
      'Heating-and-cooling renewables (predominantly biomass district heating) are ' +
      'the foundation of Estonia\'s RES achievement; electricity renewables have ' +
      'surged with onshore-wind and PV growth since 2021. The 2030 NECP target of ' +
      '65% RES — the most ambitious among Baltic states — depends on the offshore ' +
      'wind pipeline (Saaremaa, Hiiumaa zones) and continued solar growth. Wind ' +
      'auctions accelerated after the 2022 energy-security shock.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 5.2, unit: 'Mtoe', year: 2022 },
    final:   { value: 2.9, unit: 'Mtoe', year: 2022 },
    intensity: { value: 226, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -23,
    narrative:
      'Energy intensity per unit GDP is among the highest in the EU due to the ' +
      'oil-shale sector\'s upstream losses, but final-energy intensity in services ' +
      'and households is competitive. The buildings stock — predominantly Soviet-era ' +
      'panel-block housing — is the central efficiency challenge; the KredEx ' +
      'renovation programme is a recognised European good-practice model.',
    status: 'partial',
  },
  air: {
    pm25: { value: 6.3, unit: 'µg/m³', year: 2022 },
    no2:  { value: 9.5, unit: 'µg/m³', year: 2022 },
    ozone: { value: 38.4, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 600, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 78, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Estonia has among the lowest PM2.5 concentrations in the EU thanks to low ' +
      'population density and prevailing maritime air masses. Localised hotspots ' +
      'persist in Ida-Viru (oil-shale combustion legacy) and Tallinn (residential ' +
      'wood burning, traffic). Compliance with the new Ambient Air Quality Directive ' +
      '2030 limits appears achievable with limited additional measures.',
    status: 'on-track',
  },
  water: {
    surfaceWaterGood: { value: 56, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 71, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 80, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Surface waters are heavily affected by diffuse pollution from agriculture and ' +
      'historic legacy contamination in Ida-Viru oil-shale mining areas. Bathing ' +
      'water quality is good along the Baltic coast. Drinking water compliance is ' +
      'high — Estonia largely resolved long-standing radon and fluoride issues with ' +
      'EU Cohesion Fund investment in the 2010s.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 17.9, unit: '% land', year: 2023 },
    natura2000Marine: { value: 27.0, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 720, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 33, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Estonia retains exceptional natural mires, boreal forest and coastal habitats. ' +
      'Forest cover (~52% of land) supports a substantial LULUCF sink that has ' +
      'weakened in recent inventories owing to increased harvesting — a politically ' +
      'sensitive issue, with the LULUCF Regulation requiring removals to rise.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 30, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 17.9, unit: '%', year: 2022 },
    resourceProductivity: { value: 0.7, unit: '€/kg', year: 2022 },
    narrative:
      'Municipal recycling is low and Estonia is at risk of missing the 2025 ' +
      '(55%) target. The circular material use rate is, paradoxically, above the ' +
      'EU average — driven by industrial residue reuse in the oil-shale and ' +
      'construction sectors. The 2022 Circular Economy White Paper sets the agenda ' +
      'to 2035.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Climate Change Adaptation Development Plan to 2030',
      adoptedYear: 2017,
      lastUpdate: 2023,
      url: 'https://envir.ee/en',
    },
    keyRisks: [
      'Coastal erosion and storm-surge exposure along the western archipelago',
      'Forest pest outbreaks (bark beetle) and storm-felling events',
      'Heat-waves and urban-heat-island effects in Tallinn and Tartu',
      'Winter ice loss affecting Baltic shipping and ecosystem services',
      'Heavy-rainfall pluvial flooding in urban catchments',
    ],
    sectoralPlans: [
      'Land use & planning',
      'Health',
      'Forestry',
      'Agriculture',
      'Energy & infrastructure',
    ],
    narrative:
      'The 2017 Adaptation Development Plan is being revised to align with the EU ' +
      '2021 Adaptation Strategy. Storm Toomas (2019) and the heat-waves of 2018 and ' +
      '2021 elevated political attention to physical climate risk. Sectoral plans ' +
      'are implemented in coordination with the Ministry of Climate (established 2023).',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-12',
    finalSubmitted: '2024-08',
    commissionAssessment:
      'The Commission assessment (Dec 2023) found the Estonian draft NECP partially ' +
      'aligned with Fit-for-55; flagged insufficient ambition on RES (revised upward ' +
      'in the final NECP), missing detail on oil-shale phase-out trajectory and ' +
      'limited treatment of LULUCF removals.',
    esabccCommentary:
      'Estonia\'s Climate Act preparation is the key institutional development. The ' +
      'oil-shale phase-out timetable (electricity 2035, all uses 2040) was reset in ' +
      '2023 — ESABCC notes the credibility of the trajectory depends on the ETS ' +
      'price remaining above ~€60/t.',
    gaps: [
      'Oil-shale exit pathway: no statutory phase-out date in primary law',
      'LULUCF: declining removals trajectory misaligned with Regulation requirements',
      'Transport: no quantified policy mix to close the ESR 2030 gap',
      'Just-transition reskilling pipeline for Ida-Viru region not yet scaled to need',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 354,
    regions: [
      'Ida-Viru County (oil-shale mining and power generation)',
    ],
    narrative:
      'Ida-Viru is the EU\'s most carbon-intensive region per unit GVA. The €354m JTF ' +
      'envelope is concentrated on workforce reskilling, SME diversification and ' +
      'remediation of legacy mining sites. Population decline in Narva and Kohtla-Järve ' +
      'is the underlying demographic challenge.',
  },
  policies: [
    {
      name: 'General Principles of Climate Policy until 2050',
      year: 2017,
      summary: 'Riigikogu-adopted long-term climate policy resolution; 2022 amendment added the 2050 climate-neutrality target.',
    },
    {
      name: 'Climate Act (Kliimaseadus) — under preparation',
      year: 2025,
      summary: 'Framework law to enshrine 2050 climate neutrality, sectoral budgets and adaptation governance; legislative process advanced 2024-25.',
    },
    {
      name: 'National Development Plan of the Energy Sector to 2030',
      year: 2017,
      summary: 'Strategic plan covering electricity, heating, transport energy and oil-shale phase-down.',
    },
    {
      name: 'Earth\'s Crust Act / Oil-shale licensing reforms',
      year: 2017,
      summary: 'Sets the legal basis for mining permits and royalty regime; 2023 amendment introduced declining mining quotas.',
    },
    {
      name: 'KredEx Renovation Programme',
      year: 2010,
      summary: 'Grant-and-loan scheme for energy-efficient retrofits of multi-apartment buildings; EU good-practice reference.',
    },
  ],
  watchNotes:
    '• Baltic synchronisation (Feb 2025) completed — electricity-market integration with ' +
    'continental Europe shifts price-formation and security dynamics.\n' +
    '• Climate Act parliamentary progression is the headline political indicator for 2026.\n' +
    '• Forest harvesting policy and LULUCF removals are the primary contested area in the NECP.',
};

export default ee;
