/**
 * Slovakia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const sk: CountryProfile = {
  code: 'SK',
  name: 'Slovakia',
  eurostatCode: 'SK',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 48.6690, lon: 19.6990,
    capital: 'Bratislava',
    populationM: 5.4,
    areaKkm2: 49.0,
    gdpPerCapitaEur: 19200,
    summary:
      'Slovakia operates one of the EU\'s most decarbonised power systems — the four-unit ' +
      'Mochovce + Bohunice nuclear fleet supplies ~60% of electricity, hydro adds ~15%, ' +
      'and the new Mochovce-3 reactor (commercial operation 2023) has further reduced ' +
      'fossil generation. Headline emissions are ~46% below 1990 levels, driven by ' +
      'industrial restructuring and the nuclear build-out. The 2022 Climate Change Act ' +
      'sets climate-neutrality by 2050 in statute, and the Nováky lignite plant — ' +
      'long-running on subsidised "general economic interest" support — was closed ' +
      'in 2023, marking the effective end of coal-fired power.\n\n' +
      'The structural challenge is industry: Slovakia is the most industrial economy in ' +
      'the EU per capita (~25% of GVA), with steel (US Steel Košice / now Slovak Steel), ' +
      'aluminium (Slovalco), chemicals and a very large automotive sector (the highest ' +
      'per-capita car production in the world). Industrial decarbonisation — particularly ' +
      'green hydrogen for steel and chemicals — is the headline NECP delivery question.',
    highlights: [
      'Climate Change Act (2022): net-zero by 2050 in statute',
      'Nuclear supplies ~60% of electricity (Mochovce-3 online 2023, Mochovce-4 in 2025)',
      'Nováky lignite plant closed 2023 — effective end of coal-fired power',
      'EU\'s most industrialised economy per capita; steel + automotive dominate emissions',
      'Just Transition: Upper Nitra coal region — ~€460m JTF allocation',
    ],
  },
  ghg: {
    totalLatest: { value: 39, unit: 'Mt CO2e', year: 2022, source: 'UNFCCC / EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=SK" },
    total1990: 73,
    perCapita: { value: 7.1, unit: 't CO2e/cap', year: 2022, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=SK" },
    perGdp: { value: 0.36, unit: 'kg CO2e/€', year: 2022, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=SK" },
    target2030: { value: -55, unit: '%', baseline: '1990', notes: 'Climate Change Act (Act 219/2022); aligns with EU economy-wide trajectory.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Net-zero by 2050 enshrined in the 2022 Climate Change Act.' },
    sectors: [
      { id: 'industry',    label: 'Industry',      share: 38, absolute: 15 },
      { id: 'transport',   label: 'Transport',     share: 22, absolute: 9 },
      { id: 'power',       label: 'Power & heat',  share: 18, absolute: 7 },
      { id: 'buildings',   label: 'Buildings',     share: 10, absolute: 4 },
      { id: 'agriculture', label: 'Agriculture',   share: 8,  absolute: 3 },
      { id: 'waste',       label: 'Waste & other', share: 4,  absolute: 2 },
    ],
    trend: [
      { year: 1990, value: 73 }, { year: 1995, value: 53 },
      { year: 2000, value: 50 }, { year: 2005, value: 51 },
      { year: 2010, value: 46 }, { year: 2015, value: 43 },
      { year: 2019, value: 43 }, { year: 2020, value: 39 },
      { year: 2021, value: 42 }, { year: 2022, value: 39 },
      { year: 2023, value: 36 },
    ],
    narrative:
      'Slovakia\'s emissions profile is dominated by industry (~38%), reflecting one of ' +
      'the most materials-intensive economic structures in the EU — US Steel Košice ' +
      'alone accounts for ~10% of national emissions. Power-sector emissions are low ' +
      'and falling further with the Nováky closure and Mochovce-3 commissioning. ' +
      'Transport emissions are ~75% above 1990. The 2030 −55% target is challenging ' +
      'without a credible industrial decarbonisation pathway.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 17.5, unit: '%', year: 2022, source: 'Eurostat SHARES', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=SK" },
    share2005: 6.4,
    share2020: 17.3,
    target2030: 23,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 23.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 19.8 },
      { id: 'transport',   label: 'Transport',  share: 9.4 },
    ],
    trend: [
      { year: 2005, value: 6.4 }, { year: 2010, value: 9.1 },
      { year: 2015, value: 12.9 }, { year: 2020, value: 17.3 },
      { year: 2021, value: 17.4 }, { year: 2022, value: 17.5 },
    ],
    narrative:
      'Slovakia met its 2020 binding target (14%) but the RES share has plateaued since ' +
      '2017 — the post-2013 retroactive cuts to PV support effectively halted new ' +
      'deployment for nearly a decade. The 2030 target (23%) is among the lowest in the ' +
      'EU and was flagged by the Commission as below fair share. New auction frameworks ' +
      'and the lifting of administrative bottlenecks in 2023-24 are intended to revive PV ' +
      'and onshore wind deployment, with ~1.2 GW of PV pipeline now connecting.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 16.0, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=SK" },
    final:   { value: 11.7, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=SK" },
    intensity: { value: 196, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=SK" },
    target2030: -8,
    narrative:
      'Energy intensity remains roughly 70% above the EU-27 average reflecting the ' +
      'industrial structure. Building stock is heavily concentrated in panelák ' +
      'apartment blocks; the deep-renovation programme is part-funded through PNRR and ' +
      'has been a relative bright spot, with ~5,000 family homes/year renovated through ' +
      'the "Obnov dom" scheme. Industrial energy management is covered by ETS and EED ' +
      'Article 8 audits.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/slovakia-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 18.7, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/slovakia-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 64.2, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/slovakia-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 4900, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=SK" },
    narrative:
      'PM2.5 concentrations remain well above the WHO guideline value, particularly in ' +
      'the Košice region (steel) and across mountainous valleys where household solid-fuel ' +
      'heating combines with weak winter ventilation. NO₂ exceedances on Bratislava ' +
      'arterials persist. The new Ambient Air Quality Directive will require substantial ' +
      'tightening of the policy mix, particularly for household heating replacement.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 54, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/slovakia" },
    groundwaterGood: { value: 81, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/slovakia" },
    bathingWaterExcellent: { value: 84, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=SK" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=SK" },
    narrative:
      'Surface and groundwater status is relatively favourable, reflecting Slovakia\'s ' +
      'mountainous geography and limited intensive agriculture. The Danube and Váh ' +
      'basins face localised pressures from industry (Košice, Bratislava) and from the ' +
      'controversial Gabčíkovo barrage system. Drinking-water compliance is among the ' +
      'highest in the EU.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 30.0, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=SK" },
    threatenedSpecies: { value: 320, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=SK" },
    habitatsFavourable: { value: 26, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/slovakia" },
    protectedAreas: { value: 22.7, unit: '% land', year: 2023, source: "EEA CDDA — designated areas", sourceUrl: "https://www.eea.europa.eu/en/datahub/datahubitem-view/c97c5544-1ed5-453c-94a9-7c0e065e18a3?country=SK" },
    narrative:
      'Slovakia has ~30% Natura 2000 land coverage including the High Tatras, Low Tatras ' +
      'and Slovak Karst — important for brown bear, wolf, lynx and capercaillie. ' +
      'Bark-beetle outbreaks driven by climate-warming have devastated large stretches ' +
      'of spruce forest in the Tatras. Logging in primary forests has been subject of ' +
      'multiple CJEU rulings against Slovakia under the Habitats Directive.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 49, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=SK" },
    circularMaterialUseRate: { value: 5.5, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=SK" },
    resourceProductivity: { value: 1.1, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=SK" },
    narrative:
      'Municipal recycling at ~49% is close to the 2025 EU target (55%) and Slovakia has ' +
      'made strong progress on landfill diversion under the 2019 Waste Act amendments. ' +
      'The 2022 DRS deposit-return scheme for beverage packaging achieved a >90% return ' +
      'rate in its first year — among the highest in the EU. The circular material use ' +
      'rate remains low at ~5.5%, reflecting the materials-intensive industrial mix.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Strategy of the Adaptation of the Slovak Republic to Climate Change',
      adoptedYear: 2014,
      lastUpdate: 2023,
      url: 'https://www.minzp.sk/klima/adaptacia-zmenu-klimy/',
    },
    keyRisks: [
      'Forest dieback (Norway spruce) under bark-beetle and drought stress in Tatras',
      'Flash flooding in mountain river valleys and urban pluvial events',
      'Drought stress on cropland in southern Slovakia (Žitný ostrov)',
      'Heatwaves and urban-heat-island effects in Bratislava and Košice',
      'Avalanche / glacier-lake / rockfall risk in High Tatras',
    ],
    sectoralPlans: [
      'Forestry',
      'Water management',
      'Agriculture',
      'Health',
      'Urban planning',
    ],
    narrative:
      'The 2014 adaptation strategy was updated in 2018 and supplemented by the National ' +
      'Adaptation Action Plan (2021). Forest dieback in the Tatras is the most visible ' +
      'climate impact — over 50,000 ha of spruce forest lost to bark-beetle since 2000. ' +
      'The Žitný ostrov in southern Slovakia hosts central Europe\'s largest groundwater ' +
      'reservoir, which is increasingly stressed by drought events.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-08',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Slovak NECP partially aligned: the ' +
      'renewables 2030 contribution (23%) was below fair share, energy-efficiency ' +
      'ambition insufficient, and industrial decarbonisation policy detail thin.',
    esabccCommentary:
      'ESABCC notes Slovakia\'s heavily industrial economy means ETS sectors dominate ' +
      'the emissions profile, and the 2030 trajectory depends critically on US Steel\'s ' +
      'DRI/EAF transition (now partly clarified post-acquisition by GFG Alliance in 2025) ' +
      'and on Slovalco\'s viability under high electricity prices. Renewable deployment ' +
      'lifecycle is improving but the 23% target is among the lowest in the EU.',
    gaps: [
      'Renewables 2030 target (23%) below Commission fair-share assessment',
      'Industrial decarbonisation: steel + chemicals pathways insufficiently specified',
      'Transport sector trajectory not credible without urban mobility + fleet renewal reform',
      'Limited treatment of LULUCF risks from spruce forest dieback',
      'Energy efficiency 2030 contribution insufficient vs Annex I indicative level',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 460,
    regions: [
      'Upper Nitra (Hornonitrianske bane / Nováky lignite)',
      'Košice region (US Steel + industrial cluster)',
      'Bratislava region (Slovnaft refinery)',
    ],
    narrative:
      'Slovakia\'s ~€460m JTF allocation centres on the Upper Nitra coal region (HBP ' +
      'lignite mines and the Nováky plant) where ~3,000 jobs were affected by the 2023 ' +
      'closure. The Territorial Just Transition Plan supports site rehabilitation, ' +
      'reskilling, and new economic activity around mobility, renewables and ' +
      'environmental services. Implementation is broadly on track and considered a ' +
      'relative EU success story.',
  },
  policies: [
    {
      name: 'Climate Change Act (Act 219/2022)',
      year: 2022,
      summary: 'Framework law setting 2050 net-zero target, sectoral monitoring and reporting obligations.',
    },
    {
      name: 'Low-Carbon Development Strategy 2030 (with 2050 outlook)',
      year: 2020,
      summary: 'Long-term strategy underpinning the NECP; identifies industrial decarbonisation as the central challenge.',
    },
    {
      name: 'National Recovery and Resilience Plan (PNRR)',
      year: 2021,
      summary: '€6.4bn package with strong green pillar (~43%): RES, building renovation ("Obnov dom"), low-emission transport.',
    },
    {
      name: 'Coal Phase-out Decision (Upper Nitra Plan)',
      year: 2019,
      summary: 'Government decision ending state support to Nováky lignite operation by 2023; closure completed Q4 2023.',
    },
    {
      name: 'Deposit-Return Scheme (DRS)',
      year: 2022,
      summary: 'Mandatory take-back system for PET and aluminium beverage containers; achieved >90% return rate in first year.',
    },
    {
      name: 'Mochovce New Build (Units 3 & 4)',
      year: 2008,
      summary: 'Two 470 MWe VVER reactors at Mochovce; Unit 3 commercial operation 2023, Unit 4 expected 2025.',
    },
    {
      name: 'National Adaptation Strategy + Action Plan',
      year: 2018,
      summary: 'Cross-sectoral adaptation framework; National Adaptation Action Plan adopted 2021.',
    },
  ],
  watchNotes:
    '• US Steel Košice (now under GFG Alliance): DRI/EAF transition is the single most ' +
    'consequential industrial decarbonisation project; multi-€bn investment with state-aid ' +
    'and IPCEI hydrogen dependencies.\n' +
    '• Mochovce-4 commissioning (targeted 2025) will complete the nuclear build-out and ' +
    'leave Slovakia with surplus low-carbon electricity for industrial users + hydrogen.\n' +
    '• 2023-25 political volatility: Fico government has signalled some pushback on ' +
    'Fit for 55 elements; NECP delivery institutions remain in place but with reduced ' +
    'political traction.\n' +
    '• Tatras forest dieback: cumulative carbon-sink loss could materially affect LULUCF ' +
    'compliance under the LULUCF Regulation.',
};

export default sk;
