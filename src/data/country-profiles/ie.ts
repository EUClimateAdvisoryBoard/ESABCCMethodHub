/**
 * Ireland — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const ie: CountryProfile = {
  code: 'IE',
  name: 'Ireland',
  eurostatCode: 'IE',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 53.4129, lon: -8.2439,
    capital: 'Dublin',
    populationM: 5.1,
    areaKkm2: 70.3,
    gdpPerCapitaEur: 86700,
    summary:
      'Ireland combines one of the EU\'s most dynamic, FDI-driven economies with an ' +
      'unusually agriculture-heavy emissions profile: the dairy and beef herd makes ' +
      'agriculture the single largest GHG source (~37% of national emissions), ' +
      'compared with an EU average near 11%. The Climate Action and Low Carbon ' +
      'Development (Amendment) Act 2021 enshrines a 51% emissions cut by 2030 ' +
      '(vs 2018) and climate neutrality by 2050, supported by statutory five-year ' +
      'carbon budgets and sectoral emission ceilings. Implementation remains the ' +
      'central challenge — projections from the EPA in 2024 indicated Ireland is ' +
      'on course for ~29% reduction by 2030, well short of the legal target.\n\n' +
      'Two structural pressures dominate the outlook: explosive electricity demand ' +
      'growth driven by data centres (already ~21% of metered consumption in 2023 ' +
      'and rising), and the social and rural-economic challenge of reducing the ' +
      'cattle herd. Offshore wind in the Irish and Celtic Seas is the headline ' +
      'supply-side bet (5 GW target by 2030, 20 GW by 2040), but planning, grid ' +
      'and port-infrastructure timelines are tight.',
    highlights: [
      'Climate Act 2021: 51% cut by 2030 (vs 2018), net-zero by 2050',
      'Agriculture ~37% of national GHG — highest share in the EU',
      'Data-centre load already ~21% of metered electricity (2023)',
      '5 GW offshore wind by 2030, 20 GW by 2040 (Programme for Government)',
      'EPA 2024 projections: only ~29% reduction by 2030 under existing measures',
    ],
  },
  ghg: {
    totalLatest: { value: 55.0, unit: 'Mt CO2e', year: 2023, source: 'EPA / UNFCCC' },
    total1990: 55.5,
    perCapita: { value: 10.8, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.12, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -51, unit: '%', baseline: '2018', notes: 'Climate Act 2021 — economy-wide 2030 target.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate-neutral economy by 2050.' },
    sectors: [
      { id: 'agriculture',  label: 'Agriculture',    share: 37, absolute: 20.4 },
      { id: 'transport',    label: 'Transport',      share: 21, absolute: 11.6 },
      { id: 'power',        label: 'Power & heat',   share: 17, absolute: 9.4 },
      { id: 'industry',     label: 'Industry',       share: 13, absolute: 7.2 },
      { id: 'buildings',    label: 'Buildings',      share: 10, absolute: 5.5 },
      { id: 'waste',        label: 'Waste & other',  share: 2,  absolute: 1.1 },
    ],
    trend: [
      { year: 1990, value: 55.5 }, { year: 1995, value: 58.4 },
      { year: 2000, value: 67.9 }, { year: 2005, value: 70.3 },
      { year: 2010, value: 62.0 }, { year: 2015, value: 60.1 },
      { year: 2019, value: 60.8 }, { year: 2020, value: 57.7 },
      { year: 2021, value: 61.5 }, { year: 2022, value: 60.6 },
      { year: 2023, value: 55.0 },
    ],
    narrative:
      'Ireland\'s emissions peaked around 2001 and have fluctuated since, with very ' +
      'limited progress against the 2018 baseline that anchors the statutory 51% ' +
      'target. The 2023 decline reflected a 21% fall in power-sector emissions ' +
      '(coal closure at Moneypoint, more wind) and lower industrial output. ' +
      'Agriculture barely moved despite the AgClimatise plan; transport rebounded ' +
      'with post-COVID activity. The EPA\'s 2024 projection suggests cumulative ' +
      'compliance with the first carbon budget (2021-25) is already off track.',
    status: 'off-track',
  },
  renewables: {
    shareLatest: { value: 15.3, unit: '%', year: 2023, source: 'SEAI / Eurostat' },
    share2005: 2.8,
    share2020: 16.2,
    target2030: 43,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 40.7 },
      { id: 'heating',     label: 'Heating & cooling', share: 7.0 },
      { id: 'transport',   label: 'Transport',  share: 4.5 },
    ],
    trend: [
      { year: 2005, value: 2.8 }, { year: 2010, value: 5.7 },
      { year: 2015, value: 9.1 }, { year: 2020, value: 16.2 },
      { year: 2021, value: 12.5 }, { year: 2022, value: 13.7 },
      { year: 2023, value: 15.3 },
    ],
    narrative:
      'Ireland missed its 2020 binding RES target (16% achieved vs 16% required ' +
      'after statistical transfers from Estonia). Wind generation supplies nearly ' +
      '36% of electricity, but the 43% economy-wide 2030 target — combined with ' +
      'rising data-centre load — implies tripling installed renewable capacity ' +
      'and unlocking offshore wind via the maritime planning regime (MARA, 2023). ' +
      'Heat and transport remain the weakest sub-sectors.',
    status: 'off-track',
  },
  efficiency: {
    primary: { value: 13.6, unit: 'Mtoe', year: 2022 },
    final:   { value: 11.9, unit: 'Mtoe', year: 2022 },
    intensity: { value: 38, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -20,
    narrative:
      'Energy intensity of Ireland\'s GDP is among the lowest in the EU, partly a ' +
      'product of the very large FDI services and pharma base. But absolute final ' +
      'consumption has been rising again post-2020 with data-centre growth and ' +
      'transport rebound. The 2024 NECP final foresees ~20% final-energy reduction ' +
      'by 2030 — challenging given underlying demand growth.',
    status: 'partial',
  },
  air: {
    pm25: { value: 7.8, unit: 'µg/m³', year: 2022 },
    no2:  { value: 12.1, unit: 'µg/m³', year: 2022 },
    ozone: { value: 38.2, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 1300, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 87, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Ireland\'s air quality is relatively good by EU standards but residential ' +
      'solid-fuel burning (turf, peat briquettes, coal) drives winter PM2.5 peaks ' +
      'in towns and rural settlements. The 2022 Solid Fuel Regulations ban the ' +
      'sale of smoky coal and high-emission peat products nationwide; full ' +
      'compliance with WHO 5 µg/m³ remains distant.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 54, unit: '%', year: 2021, source: 'WISE-WFD / EPA' },
    groundwaterGood: { value: 92, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 77, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99.7, unit: '%', year: 2022 },
    narrative:
      'Ireland is one of only three EU member states with above-50% "good ecological ' +
      'status" for surface waters, but the trend has been declining due to ' +
      'agricultural nitrogen pressure — the EU Nitrates Directive derogation review ' +
      '(2023) tightened stocking-rate limits in the most affected catchments. ' +
      'Urban wastewater treatment in smaller agglomerations remains a long-running ' +
      'infringement issue.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 13.9, unit: '% land', year: 2023 },
    natura2000Marine: { value: 8.3, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 380, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 15, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Ireland\'s Article 17 reporting shows only ~15% of habitats in favourable ' +
      'status — among the EU\'s worst — driven by peatland degradation, grassland ' +
      'intensification and water-quality declines. The Citizens\' Assembly on ' +
      'Biodiversity Loss (2023) called for constitutional protection of nature; ' +
      'a Nature Restoration Plan under the EU NRR is in preparation.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 41, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 1.8, unit: '%', year: 2022 },
    resourceProductivity: { value: 4.3, unit: '€/kg', year: 2022 },
    narrative:
      'Municipal recycling at ~41% is below the EU average and well off the 55% ' +
      '2025 target. The circular material use rate (1.8%) is among the EU\'s lowest, ' +
      'reflecting low domestic recycling capacity and high export of recoverable ' +
      'materials. The Whole-of-Government Circular Economy Strategy (2022) and ' +
      'Circular Economy Act 2022 frame the policy response.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Adaptation Framework (NAF)',
      adoptedYear: 2018,
      lastUpdate: 2024,
      url: 'https://www.gov.ie/en/publication/national-adaptation-framework/',
    },
    keyRisks: [
      'Coastal flooding and erosion (sea-level rise, Atlantic storm surges)',
      'Fluvial and pluvial flooding across Shannon and east-coast catchments',
      'Water scarcity in the greater Dublin region during summer drought',
      'Agricultural productivity volatility (heat, drought, fodder crises)',
      'Storm damage to forestry and electricity infrastructure',
    ],
    sectoralPlans: [
      'Agriculture, Forest and Seafood',
      'Built and Archaeological Heritage',
      'Transport infrastructure',
      'Electricity and gas networks',
      'Water quality and water services',
      'Health',
    ],
    narrative:
      'The updated 2024 National Adaptation Framework integrates the EU Climate ' +
      'Adaptation Strategy and requires sectoral adaptation plans on a five-year ' +
      'cycle. Storm Babet (2023) and recurring east-coast flooding have raised the ' +
      'political profile of physical risk; the OPW Flood Risk Management Plans ' +
      'cover 300 communities at significant flood risk.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged Ireland\'s draft NECP as having a ' +
      'low level of ambition relative to the 2030 framework, with insufficient ' +
      'measures to close the ESR (effort-sharing) compliance gap and limited ' +
      'detail on agriculture, transport and the offshore wind delivery pathway.',
    esabccCommentary:
      'Statutory architecture (Climate Act, carbon budgets, sectoral ceilings) is ' +
      'best-in-class but implementation is lagging. ESABCC notes Ireland\'s ESR ' +
      'compliance gap is now the largest among western EU member states; the ' +
      'reliance on flexibilities and LULUCF credits creates substantial fiscal risk.',
    gaps: [
      'No quantified policy mix bringing agriculture emissions to the sectoral ceiling',
      'Offshore wind delivery timeline behind the 5 GW by 2030 trajectory',
      'Data-centre demand growth not adequately reconciled with renewables target',
      'Transport emissions trajectory off-track despite EV grant scheme',
      'Limited detail on industrial heat decarbonisation pathway',
    ],
    status: 'off-track',
  },
  policies: [
    {
      name: 'Climate Action and Low Carbon Development (Amendment) Act',
      year: 2021,
      summary: 'Sets statutory 2030 (−51% vs 2018) and 2050 (net-zero) targets, five-year carbon budgets and sectoral emission ceilings.',
      url: 'https://www.irishstatutebook.ie/eli/2021/act/32/',
    },
    {
      name: 'Climate Action Plan (annual)',
      year: 2024,
      summary: 'Annual cross-government delivery plan with sectoral measures; CAP 2024 sets out implementation pathway against carbon budgets.',
    },
    {
      name: 'Offshore Renewable Energy Development Plan II',
      year: 2023,
      summary: '20 GW offshore wind ambition by 2040 with phased plan-led leasing under MARA (Maritime Area Regulatory Authority).',
    },
    {
      name: 'Maritime Area Planning Act',
      year: 2021,
      summary: 'Establishes statutory maritime spatial planning regime and MARA to consent offshore renewables.',
    },
    {
      name: 'Solid Fuel Regulations',
      year: 2022,
      summary: 'National prohibition on retail sale of smoky coal, wet wood and high-emission peat briquettes to reduce winter PM2.5.',
    },
    {
      name: 'Circular Economy Act',
      year: 2022,
      summary: 'Enables environmental levies (cup, deposit-return scheme), CCTV for illegal dumping and a national circular economy strategy.',
    },
    {
      name: 'AgClimatise — Roadmap for Climate Neutrality in Agriculture',
      year: 2020,
      summary: 'Sectoral roadmap for the agri-food sector with abatement measures (protected urea, low-emission slurry spreading, EBI breeding).',
    },
  ],
  watchNotes:
    '• Climate Change Advisory Council annual review tracks compliance with carbon ' +
    'budgets — first budget period (2021-25) likely to be exceeded; Council has flagged ' +
    'borrowing from the 2026-30 budget as a near-certain outcome.\n' +
    '• Data-centre demand: CRU 2021 direction restricting new connections in Dublin remains ' +
    'a live constraint; revised framework expected 2026.\n' +
    '• Nitrates derogation: post-2025 derogation under review with the Commission; loss ' +
    'would have material implications for dairy expansion model.\n' +
    '• Just Transition: Bord na Móna peat exit (2020) and Midlands transition programme ' +
    'continue under the Climate Action Fund.',
};

export default ie;
