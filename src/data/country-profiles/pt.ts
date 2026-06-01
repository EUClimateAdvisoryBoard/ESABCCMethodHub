/**
 * Portugal — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const pt: CountryProfile = {
  code: 'PT',
  name: 'Portugal',
  eurostatCode: 'PT',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 39.3999, lon: -8.2245,
    capital: 'Lisbon',
    populationM: 10.5,
    areaKkm2: 92.2,
    gdpPerCapitaEur: 24600,
    summary:
      'Portugal is one of the EU\'s renewable-energy success stories: hydro, wind ' +
      'and rapidly growing solar PV pushed renewables to 61% of electricity in 2023, ' +
      'and the country shut its last coal-fired power plant (Pego) in November ' +
      '2021, becoming one of the first EU member states without coal generation. ' +
      'The Climate Framework Law (Lei de Bases do Clima, 2021) sets climate ' +
      'neutrality for 2045 — five years ahead of the EU target — supported by ' +
      'the Roadmap to Carbon Neutrality 2050 (RNC2050) and a 55% emissions ' +
      'reduction goal by 2030 (vs 2005, raised to up to 55% under the revised NECP).\n\n' +
      'The dominant climate risk is hydrological: a long Atlantic-Mediterranean ' +
      'drought has stressed reservoirs (Alqueva, Castelo do Bode), reduced ' +
      'hydropower output and intensified wildfire seasons. Adaptation, ' +
      'water-resource resilience and the green-hydrogen industrial pivot (Sines) ' +
      'now define the next stage of Portuguese climate policy.',
    highlights: [
      'Coal-free since November 2021 (Pego closure)',
      '61% renewable electricity in 2023 — among the highest in the EU',
      'Climate neutrality by 2045 in statute (Lei de Bases do Clima)',
      'Sines green-hydrogen hub: 2 GW electrolyser ambition by 2030',
      'Severe multi-year drought stress in the south (Alentejo, Algarve)',
    ],
  },
  ghg: {
    totalLatest: { value: 53.5, unit: 'Mt CO2e', year: 2023, source: 'APA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=PT" },
    total1990: 60.2,
    perCapita: { value: 5.1, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=PT" },
    perGdp: { value: 0.22, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=PT" },
    target2030: { value: -55, unit: '%', baseline: '2005', notes: 'Up to -55% per Climate Framework Law and revised NECP.' },
    target2050: { value: -100, unit: '%', year: 2045, notes: 'Climate-neutral economy by 2045 (Climate Framework Law).' },
    sectors: [
      { id: 'transport',    label: 'Transport',      share: 27, absolute: 14.4 },
      { id: 'power',        label: 'Power & heat',   share: 18, absolute: 9.6 },
      { id: 'industry',     label: 'Industry',       share: 21, absolute: 11.2 },
      { id: 'agriculture',  label: 'Agriculture',    share: 12, absolute: 6.4 },
      { id: 'buildings',    label: 'Buildings',      share: 11, absolute: 5.9 },
      { id: 'waste',        label: 'Waste & other',  share: 11, absolute: 5.9 },
    ],
    trend: [
      { year: 1990, value: 60.2 }, { year: 1995, value: 70.4 },
      { year: 2000, value: 81.8 }, { year: 2005, value: 84.0 },
      { year: 2010, value: 70.2 }, { year: 2015, value: 67.0 },
      { year: 2019, value: 66.3 }, { year: 2020, value: 57.6 },
      { year: 2021, value: 58.0 }, { year: 2022, value: 55.8 },
      { year: 2023, value: 53.5 },
    ],
    narrative:
      'Portugal\'s emissions peaked around 2005 and have fallen ~36% since, ' +
      'driven by power-sector decarbonisation (Pego closure 2021; Sines closure ' +
      '2021) and the 2020 COVID activity dip. Cumulative compliance with the ESR ' +
      'trajectory has been comfortable through 2023, although transport emissions ' +
      'have rebounded and require sharper action. RNC2050 trajectory remains ' +
      'broadly on track for the 2030 milestone.',
    status: 'on-track',
  },
  renewables: {
    shareLatest: { value: 35.0, unit: '%', year: 2023, source: 'DGEG / Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=PT" },
    share2005: 19.5,
    share2020: 34.0,
    target2030: 51,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 61.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 41.0 },
      { id: 'transport',   label: 'Transport',  share: 9.6 },
    ],
    trend: [
      { year: 2005, value: 19.5 }, { year: 2010, value: 24.2 },
      { year: 2015, value: 30.5 }, { year: 2020, value: 34.0 },
      { year: 2021, value: 34.0 }, { year: 2022, value: 34.7 },
      { year: 2023, value: 35.0 },
    ],
    narrative:
      'Portugal exceeded its 2020 binding target (31% vs 34% achieved) and is now ' +
      'targeting 51% gross final renewables by 2030 in the revised NECP. The 2024 ' +
      'PV pipeline grew faster than transmission upgrades — curtailment has ' +
      'emerged in southern Alentejo. Offshore wind tender for 2 GW (planned 2024) ' +
      'is the key supply-side bet for the second half of the decade. Heating-and-' +
      'cooling renewables share is high due to biomass.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 21.5, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=PT" },
    final:   { value: 16.4, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=PT" },
    intensity: { value: 96, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=PT" },
    target2030: -29,
    narrative:
      'Final energy consumption has stayed roughly flat since 2014 despite ' +
      'GDP growth. The 2024 NECP final foresees a 29% final-energy reduction by ' +
      '2030 vs 2007 reference, driven by buildings renovation (PRR Recovery and ' +
      'Resilience Plan envelope) and electrification of mobility. EED Article 8 ' +
      'enterprise audits remain only partially complied with.',
    status: 'partial',
  },
  air: {
    pm25: { value: 8.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/portugal-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 13.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/portugal-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 41.2, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/portugal-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 2900, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 90, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=PT" },
    narrative:
      'Air quality has improved with the closure of coal generation and shipping-' +
      'fuel sulphur limits in Lisbon and Porto, but Saharan dust intrusions and ' +
      'wildfire smoke episodes drive PM2.5 spikes in the dry season. Urban NO₂ ' +
      'has fallen below the EU limit but remains above WHO; Lisbon\'s ZER low-' +
      'emission zone is the main urban measure.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 56, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/portugal" },
    groundwaterGood: { value: 76, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/portugal" },
    bathingWaterExcellent: { value: 87, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=PT" },
    drinkingWaterCompliance: { value: 98.7, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=PT" },
    narrative:
      'Persistent drought in the south has reduced reservoir levels at Alqueva, ' +
      'Castelo do Bode and Bravura to historically low values; agricultural ' +
      'allocations were cut multiple times since 2022. The Plano de Eficiência ' +
      'Hídrica (Algarve, Alentejo) accelerates wastewater reuse, desalination ' +
      'and metering. Cross-border Iberian water-allocation tensions (Tagus, ' +
      'Guadiana) remain a live diplomatic issue with Spain.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 22.4, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=PT" },
    natura2000Marine: { value: 7.6, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=PT" },
    threatenedSpecies: { value: 660, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=PT" },
    habitatsFavourable: { value: 23, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/portugal" },
    narrative:
      'Natura 2000 land coverage is above the EU average but conservation status ' +
      'remains weak — only ~23% of habitats favourable, with Mediterranean montados ' +
      '(cork-oak landscapes), dunes and freshwater habitats under heaviest pressure. ' +
      'The 2017 and 2022 mega-wildfires devastated forest habitats in central ' +
      'Portugal. Iberian lynx recovery in the Guadiana is a flagship success story.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 31, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=PT" },
    circularMaterialUseRate: { value: 2.4, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=PT" },
    resourceProductivity: { value: 1.4, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=PT" },
    narrative:
      'Portugal\'s municipal recycling rate at ~31% is well below the 55% 2025 ' +
      'target — landfilling still accounts for ~45% of municipal waste. The Plano ' +
      'Estratégico para os Resíduos Urbanos (PERSU 2030) targets 55% recycling ' +
      'and biowaste separate collection rollout completed in 2024.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'Estratégia Nacional de Adaptação às Alterações Climáticas (ENAAC 2020/2030)',
      adoptedYear: 2015,
      lastUpdate: 2024,
      url: 'https://www.apambiente.pt/clima/adaptacao',
    },
    keyRisks: [
      'Extreme heatwaves and excess mortality (Lisbon, Évora, Alentejo)',
      'Rural and forest wildfires (central Portugal, Algarve)',
      'Prolonged drought and water scarcity (Algarve, Alentejo)',
      'Coastal erosion and sea-level rise (Aveiro, Costa da Caparica)',
      'Agricultural and viticulture productivity shifts',
    ],
    sectoralPlans: [
      'Agriculture and forestry',
      'Water resources',
      'Coasts and seas',
      'Health',
      'Energy and industry',
      'Tourism',
    ],
    narrative:
      'The 2017 wildfires (114 deaths in Pedrógão Grande and Leiria), 2022\'s ' +
      'record-low river flows and the multi-year drought have placed adaptation ' +
      'at the centre of Portuguese policy. The Climate Framework Law mandates ' +
      'binding sectoral adaptation plans by 2025. The new Sistema Nacional de ' +
      'Defesa da Floresta contra Incêndios reformed fire-management governance ' +
      'after the 2017 disaster.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-08',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) was broadly positive on renewables and ' +
      'GHG ambition, but flagged gaps in the transport decarbonisation pathway, ' +
      'limited treatment of green-hydrogen industrial demand assumptions, and ' +
      'insufficient grid-investment detail to absorb planned RES capacity.',
    esabccCommentary:
      'Portugal is one of the more credible 2030 deliverers — coal exit completed, ' +
      'RES trajectory ahead of pace. ESABCC notes the principal medium-term risk ' +
      'is grid bottlenecks limiting further RES integration, and the dependence of ' +
      'the LULUCF balance on fire-risk control. The 2045 neutrality date is ' +
      'ambitious and credible if industrial green-hydrogen plans materialise.',
    gaps: [
      'Transport sector trajectory: insufficient measures to meet sectoral ESR contribution',
      'Grid-investment plan (PDIRT/PDIRD) timing lag behind RES deployment',
      'Green-hydrogen demand assumptions not yet matched by industrial offtake contracts',
      'Buildings renovation rate well below the 3% / yr indicative pathway',
    ],
    status: 'on-track',
  },
  policies: [
    {
      name: 'Lei de Bases do Clima (Climate Framework Law)',
      year: 2021,
      summary: 'Sets statutory 2030 (up to −55% vs 2005) and 2045 (climate-neutrality) targets, sectoral budgets and citizen climate-rights framework.',
      url: 'https://diariodarepublica.pt/dr/detalhe/lei/98-2021-175907499',
    },
    {
      name: 'Roteiro para a Neutralidade Carbónica 2050 (RNC2050)',
      year: 2019,
      summary: 'Cross-sectoral 2050 decarbonisation pathway with scenario analysis informing the NECP.',
    },
    {
      name: 'Plano Nacional Energia e Clima (PNEC 2030, revised 2024)',
      year: 2024,
      summary: 'Energy and climate plan to 2030 with 51% RES, 29% final-energy reduction and decarbonisation pathway.',
    },
    {
      name: 'Estratégia Nacional do Hidrogénio (EN-H2)',
      year: 2020,
      summary: 'Green-hydrogen strategy centred on the Sines industrial complex; 2 GW electrolyser ambition by 2030.',
    },
    {
      name: 'Plano de Eficiência Hídrica (Algarve / Alentejo)',
      year: 2022,
      summary: 'Drought-response framework with desalination, wastewater reuse, conveyance and metering investments.',
    },
    {
      name: 'Fundo Ambiental',
      year: 2016,
      summary: 'Consolidated environmental finance vehicle financing climate, adaptation, biodiversity and circular-economy measures.',
    },
  ],
  watchNotes:
    '• Drought outlook: APA and IPMA monitoring shows persistent meteorological deficit in ' +
    'the south; reservoir storage trends through summer 2026 will determine whether ' +
    'agricultural allocations are again restricted.\n' +
    '• Offshore wind tender — 2 GW first phase (Viana do Castelo, Figueira da Foz, Sines): ' +
    'final auction design and grid-injection assumptions remain to be confirmed.\n' +
    '• Sines green-hydrogen valley: H2 Sines and GreenH2Atlantic FID decisions pending; ' +
    'EU IF/IPCEI co-funding agreed but offtake contracts thin.\n' +
    '• 2045 neutrality date five years ahead of EU baseline — material implications for ' +
    'industrial competitiveness and for LULUCF / negative-emissions assumptions.',
};

export default pt;
