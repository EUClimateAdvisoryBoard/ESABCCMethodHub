/**
 * Cyprus — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const cy: CountryProfile = {
  code: 'CY',
  name: 'Cyprus',
  eurostatCode: 'CY',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 35.1264, lon: 33.4299,
    capital: 'Nicosia',
    populationM: 0.92,
    areaKkm2: 9.3,
    gdpPerCapitaEur: 27000,
    summary:
      'Cyprus operates the EU\'s most isolated electricity system: it is the only ' +
      'EU member state with no synchronous interconnection to another country\'s ' +
      'grid, and its power sector relies almost entirely on imported heavy-fuel oil ' +
      'and diesel. Total greenhouse-gas emissions of ~8 Mt CO2e have grown ~50% ' +
      'since 1990 — among the few member-state series with positive growth — driven ' +
      'by population, tourism and electricity-demand growth. The EuroAsia ' +
      'Interconnector (a planned 1 GW HVDC link via Crete to mainland Greece) is the ' +
      'single most important strategic project for decarbonisation; commissioning ' +
      'is now targeted post-2030 after multiple delays.\n\n' +
      'Cyprus is also among the EU\'s most climate-vulnerable countries: a steeply ' +
      'warming and drying Mediterranean climate, severe wildfire and drought risks, ' +
      'and acute water-scarcity profile. Domestic offshore-gas discoveries (Aphrodite ' +
      'field) sit alongside considerations of a Levantine pipeline (EastMed) that ' +
      'has slipped on commercial and geopolitical grounds. The 2024 NECP update ' +
      'targets 23% RES and a ~32% emissions cut versus 2005 by 2030.',
    highlights: [
      'Only EU member state with no electricity grid connection to another country',
      'EuroAsia Interconnector (1 GW HVDC to Greece) — strategic enabler, post-2030 target',
      '2024 NECP: 23% RES by 2030; −32% GHG vs 2005',
      'Among the EU\'s most exposed to drought, wildfire and heatwaves',
    ],
  },
  ghg: {
    totalLatest: { value: 8.2, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=CY" },
    total1990: 5.5,
    perCapita: { value: 9.0, unit: 't CO2e/cap', year: 2022, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=CY" },
    perGdp: { value: 0.32, unit: 'kg CO2e/€', year: 2022, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=CY" },
    target2030: { value: -32, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55; ambition raised in 2024 NECP.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (Long-Term Strategy 2024).' },
    sectors: [
      { id: 'power',          label: 'Power & heat',  share: 38, absolute: 3.1 },
      { id: 'transport',      label: 'Transport',     share: 28, absolute: 2.3 },
      { id: 'industry',       label: 'Industry',      share: 12, absolute: 1.0 },
      { id: 'agriculture',    label: 'Agriculture',   share: 7,  absolute: 0.6 },
      { id: 'buildings',      label: 'Buildings',     share: 8,  absolute: 0.6 },
      { id: 'waste',          label: 'Waste & other', share: 7,  absolute: 0.6 },
    ],
    trend: [
      { year: 1990, value: 5.5 }, { year: 1995, value: 6.4 },
      { year: 2000, value: 8.0 }, { year: 2005, value: 9.6 },
      { year: 2010, value: 9.4 }, { year: 2015, value: 8.6 },
      { year: 2019, value: 8.9 }, { year: 2020, value: 7.6 },
      { year: 2021, value: 8.0 }, { year: 2022, value: 8.2 },
      { year: 2023, value: 8.0 },
    ],
    narrative:
      'Cyprus is one of only a handful of EU member states with positive emissions ' +
      'growth versus 1990 (~+50%). Emissions peaked around 2008 and have been ' +
      'broadly flat since 2015 despite population and economic growth, reflecting ' +
      'improving energy intensity. Power-sector emissions remain dominant given the ' +
      'fuel-oil dependence; transport is the second-largest source. The 2030 ESR ' +
      'target (−32% vs 2005) is among the more demanding for a high-growth economy ' +
      'and depends on accelerated RES deployment and the EuroAsia Interconnector.',
    status: 'off-track',
  },
  renewables: {
    shareLatest: { value: 16.8, unit: '%', year: 2022, source: 'Eurostat SHARES', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=CY" },
    share2005: 3.1,
    share2020: 16.9,
    target2030: 23,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 16.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 38.2 },
      { id: 'transport',   label: 'Transport',  share: 9.7 },
    ],
    trend: [
      { year: 2005, value: 3.1 }, { year: 2010, value: 6.0 },
      { year: 2015, value: 9.9 }, { year: 2020, value: 16.9 },
      { year: 2021, value: 18.4 }, { year: 2022, value: 16.8 },
      { year: 2023, value: 19.0 },
    ],
    narrative:
      'Solar thermal water-heating has been near-universal in Cypriot households for ' +
      'decades, anchoring the heating-and-cooling RES share. PV deployment has ' +
      'accelerated since 2018; capacity passed 500 MW in 2023. The 2030 NECP ' +
      'target of 23% is below the EU 42.5% ambition because the isolated electricity ' +
      'system limits curtailment-free RES integration. Storage deployment (pilot ' +
      'BESS contracts 2024) and demand-response are the critical complementary ' +
      'enablers pending the EuroAsia Interconnector.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 2.5, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=CY" },
    final:   { value: 1.9, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=CY" },
    intensity: { value: 96, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=CY" },
    target2030: -19,
    narrative:
      'Energy intensity has fallen ~25% since 2005, but absolute consumption is ' +
      'rising with tourism and air-conditioning demand. Cooling load growth is ' +
      'structural; passive cooling and building-envelope codes are the priority ' +
      'levers. EED Article 8 audit coverage is incomplete for SMEs.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/cyprus-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 16.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/cyprus-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 70.0, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/cyprus-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 540, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 100, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=CY" },
    narrative:
      'PM2.5 levels are elevated due to a substantial Saharan dust contribution ' +
      '(~30-40% of annual average), residential biomass burning and heavy-fuel-oil ' +
      'power generation. Ozone is among the highest in the EU reflecting ' +
      'Mediterranean photochemistry. Compliance with the new Ambient Air Quality ' +
      'Directive will be challenging without accelerated power-sector ' +
      'decarbonisation.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 16, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/cyprus" },
    groundwaterGood: { value: 31, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/cyprus" },
    bathingWaterExcellent: { value: 99, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=CY" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=CY" },
    narrative:
      'Cyprus is among the most water-scarce countries in the EU (~270 m³/cap/yr ' +
      'natural availability). Groundwater is over-abstracted and saline intrusion ' +
      'affects coastal aquifers. Desalination supplies ~30% of potable water and ' +
      'capacity is being expanded. Bathing-water quality is near-perfect — a ' +
      'tourism asset of strategic importance.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 28.8, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=CY" },
    natura2000Marine: { value: 7.2, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=CY" },
    threatenedSpecies: { value: 420, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=CY" },
    habitatsFavourable: { value: 38, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/cyprus" },
    narrative:
      'Natura 2000 terrestrial coverage at ~29% is approaching the 30%-by-2030 EU ' +
      'target. Marine coverage is below average and is being expanded. The Akamas ' +
      'peninsula and Troodos massif host endemic biodiversity of European ' +
      'significance. Pressures include coastal development, wildfire and invasive ' +
      'species.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 18, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=CY" },
    circularMaterialUseRate: { value: 3.0, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=CY" },
    resourceProductivity: { value: 1.6, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=CY" },
    narrative:
      'Cyprus has one of the EU\'s lowest recycling rates and is at acute risk of ' +
      'missing the 2025 (55%) target. Landfill remains dominant. The 2021 Circular ' +
      'Economy Action Plan and the 2024 launch of the Pay-As-You-Throw pilot in ' +
      'Aglantzia mark the operational starting point of a long catch-up trajectory.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Adaptation Strategy and Action Plan',
      adoptedYear: 2017,
      lastUpdate: 2024,
      url: 'https://www.moa.gov.cy/',
    },
    keyRisks: [
      'Severe and intensifying drought; declining surface and groundwater availability',
      'Wildfire in Troodos and forested foothills (notably the 2021 Arakapas fire)',
      'Heatwaves with mortality and labour-productivity impacts',
      'Coastal erosion and sea-level rise affecting tourism infrastructure',
      'Marine heatwaves and Lessepsian species invasion in EEZ',
    ],
    sectoralPlans: [
      'Water management',
      'Agriculture',
      'Forestry & wildfire',
      'Public health',
      'Tourism & coastal zones',
    ],
    narrative:
      'The 2017 Adaptation Strategy is being revised in 2024-25 to integrate the ' +
      'risk profile signalled by the 2021 Arakapas wildfire and successive drought ' +
      'years. The 2024 Long-Term Strategy and the Climate Law (drafting stage) bring ' +
      'adaptation into a statutory framework. The eastern Mediterranean is ' +
      'projected to warm faster than the EU average — Cyprus is a frontline ' +
      'climate-adaptation case.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-09',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'The Commission assessment (Dec 2023) found the Cypriot draft NECP partially ' +
      'aligned with Fit-for-55; the final 2024 submission tightened the GHG and RES ' +
      'targets but the Commission flagged persistent gaps in transport, the ' +
      'circular economy and the credibility of the EuroAsia Interconnector ' +
      'timeline.',
    esabccCommentary:
      'Cyprus is the EU\'s most fragile electricity system from a decarbonisation ' +
      'perspective: no interconnection, limited storage, rising cooling demand and ' +
      'a fuel-oil-dependent generation fleet. ESABCC notes that the EuroAsia ' +
      'Interconnector is the load-bearing assumption in any credible 2030 RES ' +
      'pathway; the operational date has slipped to post-2030.',
    gaps: [
      'EuroAsia Interconnector: timeline slipped — 2030 RES assumptions need revision',
      'Transport: limited policy mix beyond EV registration incentives',
      'Circular economy: recycling rates well below the 2025 trajectory',
      'Industrial energy efficiency: limited EED Article 8 coverage for SMEs',
    ],
    status: 'partial',
  },
  policies: [
    {
      name: 'Climate Law (Νόμος για το Κλίμα) — under preparation',
      year: 2025,
      summary: 'Framework climate law to enshrine 2050 net-zero and statutory adaptation governance; legislative process advanced 2024-25.',
    },
    {
      name: 'Long-Term Strategy to 2050',
      year: 2024,
      summary: 'Sets climate neutrality by 2050 with sectoral decarbonisation scenarios; updates the 2018 baseline strategy.',
    },
    {
      name: 'Renewable Energy Sources Law',
      year: 2013,
      summary: 'Support framework for RES; 2023 amendment introduces simplified permitting and battery-storage facilitation.',
    },
    {
      name: 'EuroAsia Interconnector Project (PCI 3.10)',
      year: 2017,
      summary: 'EU Project of Common Interest — 1 GW HVDC link Israel-Cyprus-Crete-Greece; commissioning of the Cyprus-Crete leg targeted post-2030.',
    },
    {
      name: 'National Energy and Climate Plan (updated)',
      year: 2024,
      summary: '2030 framework setting −32% GHG vs 2005, 23% RES, and 19% final-energy savings.',
    },
  ],
  watchNotes:
    '• EuroAsia Interconnector timeline (Cyprus-Crete leg) is the single most ' +
    'important policy variable; delays cascade through 2030 RES arithmetic.\n' +
    '• Aphrodite-field gas commercialisation and the broader Eastern Mediterranean ' +
    'pipeline debate (EastMed) sit awkwardly with the 2050 net-zero target.\n' +
    '• Wildfire-management reform and drought resilience are the binding ' +
    'adaptation priorities through the next NECP cycle.',
};

export default cy;
