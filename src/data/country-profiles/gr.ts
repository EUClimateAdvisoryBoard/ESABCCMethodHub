/**
 * Greece — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 *
 * Note: Greece\'s Eurostat country code is "EL", not "GR".
 */
import type { CountryProfile } from './_types';

const gr: CountryProfile = {
  code: 'GR',
  name: 'Greece',
  eurostatCode: 'EL',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 39.0742, lon: 21.8243,
    capital: 'Athens',
    populationM: 10.4,
    areaKkm2: 132.0,
    gdpPerCapitaEur: 20800,
    summary:
      'Greece sits at the climate frontline of Europe — successive record-breaking ' +
      'wildfire seasons (Evia 2021, Rhodes & Alexandroupolis 2023), repeated ' +
      'heatwave-driven excess-mortality episodes in Athens, and the 2023 Daniel ' +
      'storm (Thessaly floods, ~€5 bn damages) have raised the political salience ' +
      'of adaptation. The National Climate Law (4936/2022) sets a 55% emissions ' +
      'cut by 2030 (vs 1990), an 80% cut by 2040 and climate neutrality by 2050. ' +
      'Lignite phase-out is legally mandated by 2028 (with a single Ptolemaida V ' +
      'unit potentially extended to 2028 as a strategic reserve).\n\n' +
      'Renewables have grown rapidly — wind and solar reached ~57% of electricity ' +
      'in 2023 — but transmission constraints, non-interconnected islands and the ' +
      'tourism-driven summer demand peak shape the system. Western Macedonia ' +
      '(Kozani, Florina) and Megalopoli are the EU\'s largest single Territorial ' +
      'Just Transition Plan envelopes per capita; reskilling and economic ' +
      'restructuring in these lignite regions is the defining domestic policy ' +
      'challenge.',
    highlights: [
      'Lignite phase-out by 2028 (with one strategic-reserve unit possible)',
      'Climate Law 4936/2022: −55% by 2030, −80% by 2040, net-zero 2050',
      '€1.6 bn Just Transition Fund — largest per-capita allocation in EU',
      'Storm Daniel (2023): Thessaly floods, ~€5 bn damages',
      'Record-breaking 2023 wildfire season; Alexandroupolis fire largest in EU history',
    ],
  },
  ghg: {
    totalLatest: { value: 71.0, unit: 'Mt CO2e', year: 2023, source: 'YPEN / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=EL" },
    total1990: 105.6,
    perCapita: { value: 6.8, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=EL" },
    perGdp: { value: 0.36, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=EL" },
    target2030: { value: -55, unit: '%', baseline: '1990', notes: 'National Climate Law (4936/2022) — economy-wide target.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Net-zero by 2050; -80% interim 2040 milestone in statute.' },
    sectors: [
      { id: 'power',        label: 'Power & heat',   share: 26, absolute: 18.5 },
      { id: 'transport',    label: 'Transport',      share: 24, absolute: 17.0 },
      { id: 'industry',     label: 'Industry',       share: 19, absolute: 13.5 },
      { id: 'buildings',    label: 'Buildings',      share: 12, absolute: 8.5 },
      { id: 'agriculture',  label: 'Agriculture',    share: 12, absolute: 8.5 },
      { id: 'waste',        label: 'Waste & other',  share: 7,  absolute: 5.0 },
    ],
    trend: [
      { year: 1990, value: 105.6 }, { year: 1995, value: 110.2 },
      { year: 2000, value: 125.4 }, { year: 2005, value: 137.2 },
      { year: 2010, value: 118.2 }, { year: 2015, value: 95.4 },
      { year: 2019, value: 85.0 },  { year: 2020, value: 75.6 },
      { year: 2021, value: 79.4 },  { year: 2022, value: 75.5 },
      { year: 2023, value: 71.0 },
    ],
    narrative:
      'Greek emissions have fallen ~33% from 1990 — among the deepest cuts in the ' +
      'EU — but the post-2008 decline was partly driven by economic contraction. ' +
      'Power-sector emissions have collapsed since 2019 with the lignite phase-out: ' +
      'PPC closed Megalopoli III/IV (2022) and the Kardia and Amyntaio plants ' +
      '(2020-2021). Transport and buildings remain the laggards; the 2030 −55% ' +
      'target requires sharp action in those sectors.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 25.3, unit: '%', year: 2023, source: 'YPEN / Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=EL" },
    share2005: 7.0,
    share2020: 21.7,
    target2030: 44,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 57.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 35.5 },
      { id: 'transport',   label: 'Transport',  share: 5.5 },
    ],
    trend: [
      { year: 2005, value: 7.0 }, { year: 2010, value: 9.8 },
      { year: 2015, value: 15.4 }, { year: 2020, value: 21.7 },
      { year: 2021, value: 21.9 }, { year: 2022, value: 22.7 },
      { year: 2023, value: 25.3 },
    ],
    narrative:
      'Solar PV deployment has been the headline story — installed PV capacity ' +
      'roughly doubled between 2020 and 2024 (from ~3 GW to >7 GW). The Cretan ' +
      'interconnection (Phase II, 2024) is closing one of the EU\'s largest ' +
      'non-interconnected island energy gaps. Storage auctions (~1 GW awarded ' +
      '2023-24) are addressing the increasing curtailment risk. The 44% 2030 ' +
      'target was raised in the revised NECP from 35%.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 21.4, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=EL" },
    final:   { value: 15.8, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=EL" },
    intensity: { value: 116, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=EL" },
    target2030: -38,
    narrative:
      'Energy intensity remains above the EU-27 average, weighed down by an ageing ' +
      'building stock (~70% pre-1980) and tourism-driven summer demand. The ' +
      '"Exoikonomo" residential renovation programme is the principal EED Article 8 ' +
      'instrument, supported by Recovery and Resilience Facility envelopes. ' +
      'Industrial heat decarbonisation pathway remains thin.',
    status: 'partial',
  },
  air: {
    pm25: { value: 12.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/greece-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 22.8, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/greece-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 65.1, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/greece-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 7400, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 98, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=EL" },
    narrative:
      'Athens and Thessaloniki suffer the EU\'s highest ozone exposure and ' +
      'recurring PM2.5 exceedances from a mix of traffic, residential wood-burning ' +
      '(fireplaces), Saharan dust and wildfire smoke. The 2023 wildfire season ' +
      'caused multi-week PM2.5 spikes well above 50 µg/m³ across Attica and Thrace. ' +
      'NO₂ has improved with fleet renewal but remains elevated in the Athens basin.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 56, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/greece" },
    groundwaterGood: { value: 80, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/greece" },
    bathingWaterExcellent: { value: 97, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=EL" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=EL" },
    narrative:
      'Bathing-water quality is among the EU\'s highest (97% excellent) — a key ' +
      'tourism asset. However, the Thessaly basin (Pinios) suffers from severe ' +
      'agricultural water stress and salinisation; Storm Daniel (Sept 2023) ' +
      'destroyed irrigation infrastructure across the plain. Aegean and Cycladic ' +
      'island freshwater stress remains acute, addressed largely through ' +
      'desalination.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 27.5, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=EL" },
    natura2000Marine: { value: 22.0, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=EL" },
    threatenedSpecies: { value: 1010, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=EL" },
    habitatsFavourable: { value: 24, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/greece" },
    narrative:
      'Greece has very high Natura 2000 coverage (~27.5% land) reflecting ' +
      'exceptional Mediterranean biodiversity, but only ~24% of habitats achieve ' +
      'favourable conservation status. Wildfire impacts on forest habitats and ' +
      'coastal development pressure are dominant stressors. The 2023 ' +
      'Alexandroupolis fire destroyed core Natura 2000 forest in the Dadia ' +
      'reserve — habitat of the cinereous vulture.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 21, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=EL" },
    circularMaterialUseRate: { value: 5.4, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=EL" },
    resourceProductivity: { value: 1.3, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=EL" },
    narrative:
      'Greece has one of the EU\'s lowest municipal recycling rates (~21%) and ' +
      'high landfilling (~80%) — multiple Court of Justice infringement rulings ' +
      'on illegal landfills are still being addressed. The National Waste ' +
      'Management Plan 2020-30 targets 55% recycling by 2025, requiring ' +
      'separate collection rollout and biowaste valorisation infrastructure.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Adaptation Strategy (NAS) / Regional Adaptation Plans (PESPKA)',
      adoptedYear: 2016,
      lastUpdate: 2024,
      url: 'https://ypen.gov.gr/klima/prosarmogi/',
    },
    keyRisks: [
      'Wildfires (interface zones, Attica, Evia, North-East)',
      'Heatwaves and Athens urban heat-island excess mortality',
      'Coastal flooding and erosion (islands, Thermaikos, Saronic Gulf)',
      'Tourism vulnerability — beach loss, water stress, heat-stress at destinations',
      'Agricultural water scarcity (Thessaly, Crete) and flash flooding',
    ],
    sectoralPlans: [
      'Agriculture and livestock',
      'Forestry and wildfire',
      'Water resources',
      'Coastal zones and tourism',
      'Health',
      'Infrastructure and transport',
    ],
    narrative:
      'Adaptation became a top-tier political priority after the 2018 Mati fire ' +
      '(102 deaths) and Storm Daniel (2023). The Climate Law 4936/2022 made ' +
      'regional adaptation plans (PESPKA) mandatory across all 13 regions and ' +
      'created a Climate Crisis Ministry, an institutional novelty in the EU. ' +
      'The 2023 wildfire response prompted a major civil-protection reform ' +
      '(Aegis programme, surveillance UAVs, EU rescEU asset pre-positioning).',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Commission assessment (Dec 2023) was broadly positive on the raised ' +
      'renewables ambition and lignite-exit timeline. Gaps flagged: transport ' +
      'decarbonisation pathway, building-renovation rate, security-of-supply ' +
      'arrangements during the lignite-to-RES transition, and limited treatment ' +
      'of non-CO₂ agricultural emissions.',
    esabccCommentary:
      'Greece is one of the most ambitious 2030 RES movers in the EU, but its ' +
      'system faces unique challenges from non-interconnected islands, summer ' +
      'tourism peaks and severe climate-physical risk. ESABCC notes the Just ' +
      'Transition financing envelope is well-designed but absorption capacity ' +
      'in Western Macedonia remains a risk. The lignite-exit financial costs ' +
      '(PPC compensation, district-heating replacement) need clear closure.',
    gaps: [
      'Transport emissions pathway insufficient to deliver sectoral ESR contribution',
      'Lignite phase-out: residual strategic-reserve unit\'s role and exit date unclear',
      'Storage and flexibility deployment lagging RES capacity growth',
      'District-heating decarbonisation in Western Macedonia post-lignite',
      'Building renovation absorption rate below trajectory',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 1629,
    regions: [
      'Western Macedonia (Kozani, Florina) — lignite',
      'Megalopoli (Peloponnese) — lignite',
      'Non-interconnected islands (North Aegean, South Aegean, Ionian)',
    ],
    narrative:
      'Greece received €1.63 bn under the EU Just Transition Fund (2021-27) — ' +
      'the largest per-capita allocation in the EU. The Just Transition Master ' +
      'Plan (SDAM) frames investments in renewables, storage, agri-food, smart ' +
      'agriculture and tourism diversification, with PPC land redevelopment ' +
      '("Apollon" 550 MW PV at Megalopoli, 1 GW PV across Western Macedonia). ' +
      'Reskilling capacity remains the binding constraint.',
  },
  policies: [
    {
      name: 'National Climate Law (4936/2022)',
      year: 2022,
      summary: 'Statutory 2030 (−55% vs 1990), 2040 (−80%) and 2050 (net-zero) targets, sectoral carbon budgets, regional adaptation plans, ban on new oil heating from 2025.',
      url: 'https://www.kodiko.gr/nomologia/document_navigation/803604/nomos-4936-2022',
    },
    {
      name: 'Lignite Phase-out Plan',
      year: 2020,
      summary: 'Closure of all PPC lignite generation by 2028; PPC compensation, district-heating replacement and worker-transition programmes.',
    },
    {
      name: 'Just Transition Master Plan (SDAM)',
      year: 2021,
      summary: 'Cross-government strategy for Western Macedonia and Megalopoli covering renewables, agri-food, smart agriculture, education and infrastructure.',
    },
    {
      name: 'Revised National Energy and Climate Plan (NECP)',
      year: 2024,
      summary: '44% RES by 2030, 38% energy-efficiency target, electrification and storage ramp-up, building renovation through Exoikonomo.',
    },
    {
      name: 'Aegis Civil Protection Programme',
      year: 2024,
      summary: 'Post-2023 wildfire-response reform: surveillance UAVs, pre-positioned rescEU assets, integrated coordination centres.',
    },
    {
      name: 'Exoikonomo Building Renovation Programme',
      year: 2011,
      summary: 'Flagship residential energy-renovation scheme with RRF and ERDF funding; deep-renovation tier added 2022.',
    },
  ],
  watchNotes:
    '• Wildfire season 2026: meteorological outlook and Aegis programme effectiveness will ' +
    'shape the political room for further climate ambition.\n' +
    '• Lignite exit: Ptolemaida V status (strategic reserve vs early closure) remains a ' +
    'live political question; depends on gas-LNG balance after the Bulgarian / Romanian ' +
    'interconnections come fully online.\n' +
    '• Thessaly post-Daniel reconstruction: €5+ bn rebuild programme will set the benchmark ' +
    'for climate-resilient infrastructure standards.\n' +
    '• EuroAsia Interconnector (Israel-Cyprus-Crete-Attica) FID and timeline materially ' +
    'affects long-term island decarbonisation and renewable export options.',
};

export default gr;
