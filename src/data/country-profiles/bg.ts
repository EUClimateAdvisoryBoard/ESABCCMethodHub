/**
 * Bulgaria — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const bg: CountryProfile = {
  code: 'BG',
  name: 'Bulgaria',
  eurostatCode: 'BG',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 42.7339, lon: 25.4858,
    capital: 'Sofia',
    populationM: 6.4,
    areaKkm2: 110.9,
    gdpPerCapitaEur: 12700,
    summary:
      'Bulgaria is the EU\'s lowest-GDP-per-capita member state and one of its most ' +
      'lignite-dependent economies. The Maritsa East complex (three lignite-fired plants ' +
      'plus the state-owned Maritsa Iztok mines) supplies ~35-40% of national electricity ' +
      'and employs ~12,000 people directly, making decarbonisation a politically explosive ' +
      'question. Headline emissions are ~50% below 1990 levels (industrial collapse), but ' +
      'the trajectory has been roughly flat since 2013 and the country has resisted ' +
      'committing to a coal phase-out date, instead pursuing a "balanced" pathway anchored ' +
      'on the two-unit Kozloduy nuclear plant and a planned new AP1000 reactor.\n\n' +
      'Air quality is among the worst in the EU — Sofia, Plovdiv and Vidin record some of ' +
      'the highest PM2.5 levels on the continent — driven by household solid-fuel heating ' +
      '(wood and coal briquettes) and lignite-fired power. Climate policy is dominated by ' +
      'short-lived coalition governments since 2021, slow EU-funds absorption, and ' +
      'ongoing disputes over the NECP\'s 2030 lignite trajectory.',
    highlights: [
      'EU\'s lowest GDP per capita (~€12,700); high energy poverty (~25% of households)',
      'Maritsa East lignite complex: ~35-40% of electricity, ~12,000 direct jobs',
      'Kozloduy nuclear (2 units, ~33% of generation); new AP1000 unit planned for ~2034',
      'PM2.5 levels among the worst in the EU — Sofia, Plovdiv repeatedly exceed limits',
      'NECP refuses to commit to a coal phase-out date; flagged as concern by Commission',
    ],
  },
  ghg: {
    totalLatest: { value: 47, unit: 'Mt CO2e', year: 2022, source: 'UNFCCC / EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=BG" },
    total1990: 102,
    perCapita: { value: 7.3, unit: 't CO2e/cap', year: 2022, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=BG" },
    perGdp: { value: 0.57, unit: 'kg CO2e/€', year: 2022, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=BG" },
    target2030: { value: -55, unit: '%', baseline: '1990', notes: 'Climate Change Mitigation Act and 2024 NECP; aligns with EU economy-wide trajectory.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 in line with EU Climate Law (no domestic statute).' },
    sectors: [
      { id: 'power',       label: 'Power & heat',  share: 36, absolute: 17 },
      { id: 'industry',    label: 'Industry',      share: 22, absolute: 10 },
      { id: 'transport',   label: 'Transport',     share: 17, absolute: 8 },
      { id: 'agriculture', label: 'Agriculture',   share: 11, absolute: 5 },
      { id: 'buildings',   label: 'Buildings',     share: 8,  absolute: 4 },
      { id: 'waste',       label: 'Waste & other', share: 6,  absolute: 3 },
    ],
    trend: [
      { year: 1990, value: 102 }, { year: 1995, value: 79 },
      { year: 2000, value: 65 },  { year: 2005, value: 67 },
      { year: 2010, value: 58 },  { year: 2015, value: 56 },
      { year: 2019, value: 56 },  { year: 2020, value: 49 },
      { year: 2021, value: 55 },  { year: 2022, value: 47 },
      { year: 2023, value: 42 },
    ],
    narrative:
      'Bulgaria\'s emissions are ~54% below 1990 — almost entirely a legacy of the ' +
      'post-1990 industrial collapse rather than active decarbonisation. The trajectory ' +
      'has been broadly flat since 2013 with year-on-year volatility driven by Maritsa ' +
      'East operating hours. Power and industry dominate the profile; transport is the ' +
      'fastest-growing sector. EU ETS carbon price has reduced lignite run hours sharply ' +
      'in 2023-24, accelerating the underlying transition without an official phase-out date.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 19.1, unit: '%', year: 2022, source: 'Eurostat SHARES', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=BG" },
    share2005: 9.2,
    share2020: 23.3,
    target2030: 27.1,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 19.4 },
      { id: 'heating',     label: 'Heating & cooling', share: 36.4 },
      { id: 'transport',   label: 'Transport',  share: 9.7 },
    ],
    trend: [
      { year: 2005, value: 9.2 }, { year: 2010, value: 13.9 },
      { year: 2015, value: 18.3 }, { year: 2020, value: 23.3 },
      { year: 2021, value: 17.0 }, { year: 2022, value: 19.1 },
    ],
    narrative:
      'Bulgaria over-achieved its binding 2020 target (16%) but the RES share has slipped ' +
      'since 2020 as gross final consumption rose — wind capacity has been static since ' +
      '~2014 due to grid constraints in the windy north-east, and PV is only now ' +
      'recovering after the post-2012 retroactive support cuts. The 2030 target (27%) is ' +
      'below the Commission\'s fair-share assessment; large utility-scale PV pipeline ' +
      '(~5 GW) and the 2024 hybrid auctions are expected to drive acceleration.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 17.6, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=BG" },
    final:   { value: 11.2, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=BG" },
    intensity: { value: 318, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=BG" },
    target2030: -8,
    narrative:
      'Bulgaria has the EU\'s highest energy intensity (~3× the EU-27 average) reflecting ' +
      'heavy industry (metals, chemicals), inefficient district heating, and a building ' +
      'stock dominated by poorly insulated panel-block apartments. The National Energy ' +
      'Efficiency Action Plan and PNRR-funded building renovation programmes are key ' +
      'instruments but absorption rates are low.',
    status: 'off-track',
  },
  air: {
    pm25: { value: 17.4, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/bulgaria-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 19.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/bulgaria-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 70.5, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/bulgaria-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 10300, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 100, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=BG" },
    narrative:
      'Bulgaria has the worst air quality in the EU on most metrics. Population-weighted ' +
      'PM2.5 of ~17 µg/m³ is more than three times the WHO guideline value; Sofia, ' +
      'Plovdiv, Vidin and Pernik regularly record winter peaks above 100 µg/m³. The ' +
      'dominant source is household solid-fuel heating (wood and low-grade coal briquettes), ' +
      'compounded by lignite-fired power and an old vehicle fleet. Bulgaria lost a CJEU ' +
      'case in 2017 (C-488/15) and remains under follow-up infringement proceedings.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 42, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/bulgaria" },
    groundwaterGood: { value: 71, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/bulgaria" },
    bathingWaterExcellent: { value: 78, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=BG" },
    drinkingWaterCompliance: { value: 93, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=BG" },
    narrative:
      'Surface-water status is mixed (~42% good ecological status) with industrial and ' +
      'mining legacy pollution on the Iskar and tributaries and significant pressure ' +
      'from inadequate urban wastewater treatment in smaller towns. Drinking-water ' +
      'compliance is below the EU average; rural communities face frequent supply ' +
      'interruptions and quality issues. The Black Sea coast is the principal asset for ' +
      'bathing-water and tourism.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 34.9, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=BG" },
    natura2000Marine: { value: 16, unit: '% territorial waters', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=BG" },
    threatenedSpecies: { value: 470, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=BG" },
    habitatsFavourable: { value: 39, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/bulgaria" },
    narrative:
      'Bulgaria has one of the highest Natura 2000 land coverages in the EU (~35%) — ' +
      'including the Rila and Pirin national parks and the Rhodope Mountains — and ' +
      'hosts important populations of brown bear, wolf and chamois. Pressures include ' +
      'illegal construction (notably ski-resort expansion at Bansko/Pirin, subject of ' +
      'CJEU litigation), poaching, and infrastructure encroachment.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 35, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=BG" },
    circularMaterialUseRate: { value: 4.6, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=BG" },
    resourceProductivity: { value: 0.4, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=BG" },
    narrative:
      'Municipal recycling at ~35% lags the EU-27 average but is above several regional ' +
      'peers; landfilling still dominates. Bulgaria has the EU\'s lowest resource ' +
      'productivity, reflecting the materials-intensive industrial base. The 2024-2027 ' +
      'circular economy programme is part of the PNRR and remains in early implementation.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Adaptation Strategy 2030',
      adoptedYear: 2019,
      lastUpdate: 2023,
      url: 'https://www.moew.government.bg/bg/klimat/adaptaciya/',
    },
    keyRisks: [
      'Heatwaves and excess mortality in Sofia, Plovdiv and Black Sea coastal cities',
      'Drought stress in southern Bulgaria (Thracian plain)',
      'Flash flooding and landslides in mountain river valleys',
      'Coastal erosion and tourism-infrastructure exposure on Black Sea shore',
      'Forest fire risk across Strandzha, Pirin and Rhodope mountains',
    ],
    sectoralPlans: [
      'Agriculture',
      'Water',
      'Forestry',
      'Tourism',
      'Disaster risk management',
    ],
    narrative:
      'The 2019 National Adaptation Strategy sets a 2030 framework with nine sectoral ' +
      'action plans. Bulgaria\'s southern Mediterranean climate exposure means drought ' +
      'and heat-stress risks are particularly acute, and 2022-23 saw record forest fires ' +
      'in Strandzha and the Rhodopes. Implementation funding is limited; PNRR provides ' +
      'partial finance for flood-risk and forest-protection investments.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2024-01',
    finalSubmitted: '2024-12',
    commissionAssessment:
      'Commission assessment (Dec 2023, with revisions through 2024) found the Bulgarian ' +
      'NECP significantly off-track: no committed coal phase-out date, renewables 2030 ' +
      'target below fair share, energy-efficiency contribution insufficient, and weak ' +
      'evidence on transport ESR delivery.',
    esabccCommentary:
      'ESABCC notes the absence of a coal phase-out date is the single most consequential ' +
      'gap. The economic logic of running Maritsa East has deteriorated rapidly under EU ' +
      'ETS carbon pricing, but political resistance — and unresolved obligations under ' +
      'long-term PPAs — keep capacity in operation. Air quality remains a chronic public ' +
      'health crisis, with strong co-benefits available from household heating decarbonisation.',
    gaps: [
      'No coal phase-out date — flagged by Commission as fundamental NECP gap',
      'Renewables 2030 target (27%) below Commission fair-share assessment',
      'Energy efficiency 2030 contribution insufficient vs Annex I indicative level',
      'Household solid-fuel heating: limited policy mix for replacement / clean-air co-benefits',
      'Low PNRR absorption (one of the slowest in the EU) constrains delivery',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 1180,
    regions: [
      'Stara Zagora (Maritsa East lignite mines + 3 power plants)',
      'Pernik (lignite + steel legacy)',
      'Kyustendil (Bobov Dol lignite plant)',
    ],
    narrative:
      'Bulgaria receives ~€1.2bn JTF over 2021-27 covering three regions, with Stara ' +
      'Zagora (Maritsa East) by far the largest beneficiary. The Territorial Just ' +
      'Transition Plans were repeatedly revised — partly to accommodate political ' +
      'resistance to closure dates — and final Commission approval came in late 2023. ' +
      'The PNRR contains parallel commitments on coal-region restructuring that have ' +
      'become a political flashpoint in successive coalition negotiations.',
  },
  policies: [
    {
      name: 'Climate Change Mitigation Act',
      year: 2014,
      summary: 'Framework law covering ETS implementation, national emission projections, monitoring and reporting; amended 2021 to integrate EU Climate Law objectives.',
    },
    {
      name: 'National Energy and Climate Plan (NECP)',
      year: 2020,
      summary: 'NECP 2030 plan updated 2024; sets renewables, efficiency and emissions reduction trajectory but omits coal phase-out date.',
    },
    {
      name: 'National Recovery and Resilience Plan (PNRR)',
      year: 2022,
      summary: '€5.7bn package with strong green pillar including grid expansion, RES, building renovation, and hydrogen valley pilots.',
    },
    {
      name: 'Renewable Energy Act',
      year: 2011,
      summary: 'Transposes RED II/III; framework for support schemes, prosumer rules, permitting and grid connection (reformed 2023 to ease utility-scale deployment).',
    },
    {
      name: 'National Air Quality Improvement Programme 2018-2024',
      year: 2018,
      summary: 'Multi-sectoral plan to reduce PM10/PM2.5 — household heating replacement, transport measures; updated 2025 under new AAQ Directive.',
    },
    {
      name: 'Kozloduy New Build Decision',
      year: 2023,
      summary: 'Government decision to construct AP1000 reactor at Kozloduy site (Westinghouse / Hyundai); operation targeted ~2034.',
    },
    {
      name: 'National Climate Change Adaptation Strategy 2030',
      year: 2019,
      summary: 'Cross-sectoral adaptation strategy with action plans for nine priority sectors.',
    },
  ],
  watchNotes:
    '• Coal phase-out: politically untouchable since 2020, but ETS carbon price and the ' +
    'Just Transition Plan are forcing de facto exits — Bobov Dol and parts of Maritsa East ' +
    'increasingly idle in 2024-25.\n' +
    '• Long-term PPAs at Maritsa East 1 and 3 (AES and ContourGlobal) expire 2026/2024 ' +
    'respectively — a key inflection point for the lignite fleet.\n' +
    '• Eurozone accession (targeted 2025/26) brings strong scrutiny of fiscal sustainability, ' +
    'including coal-region subsidies.\n' +
    '• Air quality: any further CJEU adverse ruling could trigger material financial ' +
    'penalties — a strong political motivator for household heating reform.',
};

export default bg;
