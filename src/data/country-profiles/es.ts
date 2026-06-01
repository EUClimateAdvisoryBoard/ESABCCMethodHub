/**
 * Spain — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / MITECO / EU
 * Commission NECP assessments published 2022-2024 and rounded for headline
 * display. Treat values as best-available baseline data — editors should
 * refine specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const es: CountryProfile = {
  code: 'ES',
  name: 'Spain',
  eurostatCode: 'ES',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 40.4637, lon: -3.7492,
    capital: 'Madrid',
    populationM: 48.4,
    areaKkm2: 505.9,
    gdpPerCapitaEur: 27500,
    summary:
      'Spain is among the EU\'s most ambitious renewables leaders and a frontrunner ' +
      'in the green-transition policy debate. The 2021 Climate Change and Energy ' +
      'Transition Law (Ley 7/2021) sets climate neutrality by 2050 and a 32% ' +
      'renewable share by 2030 — raised to 48% in the 2024 PNIEC update, the highest ' +
      'in the EU. Spain has phased out coal-fired power generation (last 4 GW closed ' +
      '2020-2024) and is closing its nuclear fleet by 2035, with renewables growing ' +
      'from 22% of generation in 2010 to ~50% in 2023 (wind 23%, solar 17%, hydro & ' +
      'other RES 10%).\n\n' +
      'The defining vulnerability is water: Spain\'s south, south-east and Levante ' +
      'face structural drought stress, with 2023 the second-driest year on record. ' +
      'The Doñana wetland crisis and persistent illegal abstractions are an EU ' +
      'infringement file. On just transition, Spain is widely cited as a model: ' +
      'tripartite agreements covering coal-region closures (2018) and nuclear-plant ' +
      'localities provide a template for community-led restructuring.',
    highlights: [
      'Climate neutrality by 2050 in statute (Ley 7/2021); 2030 RES target raised to 48% in 2024 PNIEC',
      'Coal phase-out completed; nuclear phase-out scheduled 2027-2035',
      '~50% renewable electricity in 2023 — among the highest in the EU',
      'Just Transition Strategy widely cited as an EU best-practice model',
    ],
  },
  ghg: {
    totalLatest: { value: 275, unit: 'Mt CO2e', year: 2023, source: 'MITECO / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=ES" },
    total1990: 288,
    perCapita: { value: 5.7, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=ES" },
    perGdp: { value: 0.20, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=ES" },
    target2030: { value: -32, unit: '%', baseline: '1990', notes: 'PNIEC 2024 update target (raised from −23% in original 2020 PNIEC).' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality in Ley 7/2021.' },
    sectors: [
      { id: 'transport',     label: 'Transport',     share: 30, absolute: 82 },
      { id: 'industry',      label: 'Industry',      share: 21, absolute: 58 },
      { id: 'power',         label: 'Power & heat',  share: 14, absolute: 38 },
      { id: 'agriculture',   label: 'Agriculture',   share: 14, absolute: 38 },
      { id: 'buildings',     label: 'Buildings',     share: 10, absolute: 28 },
      { id: 'waste',         label: 'Waste & other', share: 11, absolute: 31 },
    ],
    trend: [
      { year: 1990, value: 288 }, { year: 1995, value: 326 },
      { year: 2000, value: 388 }, { year: 2005, value: 444 },
      { year: 2010, value: 354 }, { year: 2015, value: 339 },
      { year: 2019, value: 314 }, { year: 2020, value: 271 },
      { year: 2021, value: 289 }, { year: 2022, value: 296 },
      { year: 2023, value: 275 },
    ],
    narrative:
      'Spain\'s emissions peaked in 2007 at ~440 Mt CO2e and have since fallen by ' +
      '~37%. Power-sector decarbonisation has been the largest contributor — coal ' +
      'output dropped from 53 TWh in 2017 to zero by 2024. The 2023 fall (−7% y/y) ' +
      'reflects high renewables generation, lower industrial demand and lower CCGT ' +
      'output. Transport (the largest sector at ~30%) remains the dominant residual ' +
      'challenge; agriculture/livestock methane is a second focus area.',
    status: 'on-track',
  },
  renewables: {
    shareLatest: { value: 24.1, unit: '%', year: 2023, source: 'MITECO', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=ES" },
    share2005: 8.4,
    share2020: 21.2,
    target2030: 48,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 50.4 },
      { id: 'heating',     label: 'Heating & cooling', share: 18.0 },
      { id: 'transport',   label: 'Transport',  share: 10.6 },
    ],
    trend: [
      { year: 2005, value: 8.4 },  { year: 2010, value: 13.8 },
      { year: 2015, value: 16.2 }, { year: 2020, value: 21.2 },
      { year: 2021, value: 20.5 }, { year: 2022, value: 22.1 },
      { year: 2023, value: 24.1 },
    ],
    narrative:
      'Spain exceeded its 2020 EU target (20%) at 21.2% and is on a steep deployment ' +
      'trajectory — 2022-2023 saw record solar PV additions (~8 GW/yr) and the ' +
      'commissioning of large hybrid wind-solar parks across Extremadura, Andalucía ' +
      'and Castilla-La Mancha. The 2024 PNIEC update lifts the 2030 RES target to ' +
      '48% (the highest binding contribution in the EU) and adds 22 GW of offshore ' +
      'wind targets by 2030 across the Galician and Canary coasts. Permitting and ' +
      'grid-connection backlogs remain the principal bottleneck.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 116, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=ES" },
    final:   { value: 85, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=ES" },
    intensity: { value: 95, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=ES" },
    target2030: -32,
    narrative:
      'Final energy consumption fell ~15% between 2007 and 2022. The 2024 PNIEC ' +
      'update raises the 2030 primary-energy-consumption reduction target to 32% ' +
      '(vs 2007), with €4bn+ of NextGenEU funding supporting buildings retrofit ' +
      'under the Programa PREE and the PRTR. The Commission assessment flagged the ' +
      'efficiency target as the strongest among large member states, with no ' +
      'identified gap to the EU contribution formula.',
    status: 'on-track',
  },
  air: {
    pm25: { value: 9.2, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/spain-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 17.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/spain-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 62.1, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/spain-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 23000, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 89, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=ES" },
    narrative:
      'PM2.5 levels are among the lowest of major EU economies, but ozone is a ' +
      'persistent problem — Mediterranean climate conditions favour photochemical ' +
      'production, with SOMO35 well above the WHO long-term goal. NO₂ exceedances ' +
      'in Madrid and Barcelona persist; Madrid Central (LEZ) has been politically ' +
      'contested but largely retained. Saharan dust intrusions are a complicating ' +
      'factor for PM10 compliance.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 50, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/spain" },
    groundwaterGood: { value: 65, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/spain" },
    bathingWaterExcellent: { value: 88, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=ES" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=ES" },
    narrative:
      'Spain is the EU member state most exposed to drought and water stress: 2022 ' +
      'and 2023 were the second- and fifth-driest years on record. Catalonia ' +
      'declared a drought emergency in 2024 covering 6m inhabitants. The Doñana ' +
      'wetland aquifer over-abstraction case is a flagship EU infringement file. ' +
      'The PERTE de Digitalización del Ciclo del Agua deploys €3bn for irrigation ' +
      'modernisation and desalination, but structural reform of water rights ' +
      'remains politically contested.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 27.4, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=ES" },
    natura2000Marine: { value: 12, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=ES" },
    threatenedSpecies: { value: 2890, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=ES" },
    habitatsFavourable: { value: 9, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/spain" },
    narrative:
      'Spain holds the EU\'s largest Natura 2000 terrestrial network (~27% of land) ' +
      'and is one of the most biodiverse member states. Yet only ~9% of habitat ' +
      'assessments return "favourable" — particularly poor for Mediterranean ' +
      'wetlands, dehesa systems and high-mountain habitats. The 2023 National ' +
      'Biodiversity Strategy 2030 commits to the EU 30/10 targets; the Mar Menor ' +
      'lagoon collapse (granted legal personhood in 2022) has reshaped the public ' +
      'debate on agricultural pollution.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 42, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=ES" },
    circularMaterialUseRate: { value: 7.1, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=ES" },
    resourceProductivity: { value: 2.5, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=ES" },
    narrative:
      'Municipal recycling at ~42% lags both the 2025 EU target (55%) and the ' +
      'EU-27 average. Circular material use rate (~7%) is well below the EU-27 ' +
      'average (~12%). The 2022 Waste & Soil Law and the 2023 España Circular 2030 ' +
      'strategy roll out new EPR streams (textiles, packaging) and a single-use ' +
      'plastics tax. Regional disparities are large — Basque Country and Catalonia ' +
      'are well ahead of southern regions.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'Plan Nacional de Adaptación al Cambio Climático (PNACC 2021-2030)',
      adoptedYear: 2006,
      lastUpdate: 2020,
      url: 'https://www.miteco.gob.es/es/cambio-climatico/temas/impactos-vulnerabilidad-y-adaptacion/plan-nacional-adaptacion-cambio-climatico.html',
    },
    keyRisks: [
      'Drought and water scarcity (southern and eastern peninsular Spain, islands)',
      'Heatwaves and excess mortality (Mediterranean cities, Madrid)',
      'Wildfires (Mediterranean rim, north-west Atlantic strip)',
      'Coastal erosion and Mediterranean sea-level rise (Levante, Costa del Sol)',
      'Crop yield losses (cereals, olive groves, viticulture) under chronic drought',
    ],
    sectoralPlans: [
      'Water',
      'Agriculture',
      'Forestry',
      'Coastal & maritime',
      'Health',
      'Tourism',
    ],
    narrative:
      'PNACC 2021-2030 is comprehensive and statutorily backed by Ley 7/2021; ' +
      'it commits to 80+ adaptation lines of action with biannual reporting. The ' +
      '2022 record-breaking heatwave (estimated 4,700 excess deaths) and recurring ' +
      'wildfires (~300,000 ha in 2022) have raised political salience. The ' +
      'PERTE de Agua and the Estrategia de Desertificación 2022 explicitly link ' +
      'adaptation funding to vulnerable Mediterranean and arid regions.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-06',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'In the December 2023 round Spain attracted one of the friendlier headline ' +
      'verdicts in the EU: the Commission described the plan as "largely aligned" and ' +
      'singled out the renewables architecture for praise. The September 2024 update ' +
      'then took the renewables share to 48% and the economy-wide GHG cut to 32% ' +
      'against 1990, while adding a new chapter on industrial decarbonisation. The ' +
      'remaining holes that we still see being flagged are in non-ETS transport ' +
      'measures, livestock methane and a thin waste-sector annex.',
    esabccCommentary:
      'What makes Spain unusual in the EU comparison is not the size of its ambition ' +
      'but the clarity of its supply-side choices — coal already gone, nuclear set to ' +
      'follow on a published schedule, and a renewables build-out that already exceeds ' +
      'the previous PNIEC. The delivery risk has migrated to the demand side: road ' +
      'transport, agricultural methane and the water-energy-food nexus in the south. ' +
      'We would also draw attention to the Spanish just-transition framework — the ' +
      'institute, the tripartite agreements, the comarca-level reinvestment plans — ' +
      'as a piece of governance design other Member States could usefully adapt.',
    gaps: [
      'Transport sector ESR trajectory not clearly delivered — limited LEZ rollout, weak modal-shift policy',
      'Agriculture methane (livestock, manure management) under-addressed',
      'Permitting and grid-connection bottlenecks for renewables — auction shortfalls in 2023-24',
      'Limited treatment of negative emissions / industrial CCS in 2040 outlook',
    ],
    status: 'on-track',
  },
  justTransition: {
    jtfAllocationEurM: 869,
    regions: [
      'Asturias (coal-mining valleys)',
      'A Coruña (As Pontes coal/lignite plant)',
      'León / Palencia (Castilla y León coal basins)',
      'Teruel (Aragón coal/lignite — Andorra plant)',
      'Almería (Carboneras coal plant area)',
      'Córdoba (Puente Nuevo / mining transition)',
    ],
    narrative:
      '€869m JTF envelope (2021-27), embedded in Spain\'s broader Just Transition ' +
      'Strategy (2019-2027). The 2018 tripartite "Acuerdo Marco" between government, ' +
      'unions and coal companies set the template: closure plans with severance, ' +
      'early retirement, and regional reinvestment commitments. Spain\'s Just ' +
      'Transition Institute (Instituto para la Transición Justa) is widely cited as ' +
      'a model of governance for fossil-region restructuring.',
  },
  policies: [
    {
      name: 'Climate Change and Energy Transition Law (Ley 7/2021)',
      year: 2021,
      summary: 'Frames climate neutrality by 2050, mandates 5-yearly PNIEC updates, requires divestment of fossil-fuel exploration permits; created the Just Transition Institute.',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-8447',
    },
    {
      name: 'PNIEC 2023-2030 (2024 update)',
      year: 2024,
      summary: 'Updated NECP raising 2030 targets: −32% GHG vs 1990, 48% renewables, 32% efficiency improvement; explicit phase-out trajectories for coal (completed) and nuclear (2027-2035).',
    },
    {
      name: 'Just Transition Strategy / Acuerdo Marco',
      year: 2019,
      summary: 'Tripartite framework agreement (government/unions/companies) covering coal-region closures with severance, retraining and regional reinvestment.',
    },
    {
      name: 'Long-Term Decarbonisation Strategy (ELP 2050)',
      year: 2020,
      summary: 'Pathway to climate neutrality by 2050 with sectoral milestones; integrates the Just Transition Strategy and the National Adaptation Plan.',
    },
    {
      name: 'Waste & Contaminated Soils Law (Ley 7/2022)',
      year: 2022,
      summary: 'Transposes EU waste directives; introduces single-use plastics tax, new EPR streams (textiles, fishing gear), separate biowaste collection mandate.',
    },
    {
      name: 'PERTE de Digitalización del Ciclo del Agua',
      year: 2022,
      summary: '€3bn investment plan covering irrigation modernisation, desalination, leakage reduction; central tool of the National Hydrological Plan update.',
    },
    {
      name: 'Hydrogen Roadmap',
      year: 2020,
      summary: 'Targets 11 GW of electrolyser capacity by 2030; positions Spain as a major EU green-hydrogen exporter (H2Med corridor to France/Germany).',
    },
  ],
  watchNotes:
    '• Nuclear phase-out (Almaraz I 2027 → Trillo 2035) is politically contested; ' +
    'PP-led regional governments and industry have called for life-extension, against ' +
    'the 2019 protocol agreement with the operators.\n' +
    '• Doñana aquifer infringement (CJEU C-559/19) and the wider Mediterranean drought ' +
    'narrative remain the headline environmental risk file.\n' +
    '• H2Med pipeline (Spain-France-Germany green-hydrogen corridor) and the ' +
    'iberian-MAGHREB interconnection are decisive for Spain\'s ambition to become a ' +
    'net green-energy exporter — first capacity expected 2030.',
};

export default es;
