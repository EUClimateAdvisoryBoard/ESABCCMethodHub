/**
 * Netherlands — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const nl: CountryProfile = {
  code: 'NL',
  name: 'Netherlands',
  eurostatCode: 'NL',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 52.1326, lon: 5.2913,
    capital: 'Amsterdam',
    populationM: 17.8,
    areaKkm2: 41.5,
    gdpPerCapitaEur: 52400,
    summary:
      'The Netherlands is a high-density, trade-driven economy with one of the most ' +
      'carbon-intensive energy systems per square kilometre in the EU — historically ' +
      'anchored on Groningen natural gas, a large petrochemical cluster around ' +
      'Rotterdam/Antwerp, and intensive livestock agriculture. The 2015 Urgenda ' +
      'climate ruling — upheld by the Supreme Court in 2019 — was the first ' +
      'successful citizen climate lawsuit globally and forced an accelerated coal ' +
      'and emissions pathway. The 2019 Climate Act (Klimaatwet) writes a 49% 2030 ' +
      'reduction and 95% 2050 reduction (vs 1990) into statute; the 2023 amendment ' +
      'tightens the 2030 target to 55-60%.\n\n' +
      'The agricultural nitrogen (PAS) crisis — triggered by a 2019 Council of State ' +
      'ruling — has frozen permits for housing, infrastructure and farms near ' +
      'Natura 2000 sites, and is reshaping the rural policy landscape. Meanwhile ' +
      'offshore wind is being scaled to ~21 GW by 2030 and the Groningen gas field ' +
      'was permanently closed in October 2023, ending six decades of domestic gas ' +
      'production.',
    highlights: [
      '2030 target: −55% to −60% GHG vs 1990 (Climate Act amendment, 2023)',
      'Climate neutrality by 2050 in statute; coalition aims for 2040 net-zero electricity',
      'Groningen gas field permanently closed October 2023',
      'Urgenda Supreme Court ruling (2019) — landmark precedent for state climate duties',
      'Nitrogen crisis (PAS) freezes ~18,000 permits; €25bn rural transition fund',
    ],
  },
  ghg: {
    totalLatest: { value: 156, unit: 'Mt CO2e', year: 2023, source: 'RIVM / UNFCCC' },
    total1990: 228,
    perCapita: { value: 8.8, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.17, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -55, unit: '%', baseline: '1990', notes: 'Climate Act amendment (2023) — government aims for −60% to keep buffer.' },
    target2050: { value: -95, unit: '%', year: 2050, notes: 'Climate Act target range −95% to climate neutrality by 2050.' },
    sectors: [
      { id: 'power',        label: 'Power & heat',  share: 25, absolute: 39 },
      { id: 'industry',     label: 'Industry',      share: 28, absolute: 44 },
      { id: 'transport',    label: 'Transport',     share: 19, absolute: 30 },
      { id: 'buildings',    label: 'Buildings',     share: 12, absolute: 19 },
      { id: 'agriculture',  label: 'Agriculture',   share: 14, absolute: 22 },
      { id: 'waste',        label: 'Waste & other', share: 2,  absolute: 2 },
    ],
    trend: [
      { year: 1990, value: 228 }, { year: 1995, value: 235 },
      { year: 2000, value: 222 }, { year: 2005, value: 220 },
      { year: 2010, value: 217 }, { year: 2015, value: 205 },
      { year: 2019, value: 184 }, { year: 2020, value: 168 },
      { year: 2021, value: 172 }, { year: 2022, value: 159 },
      { year: 2023, value: 156 },
    ],
    narrative:
      'Total emissions have fallen ~32% from 1990, with the largest single drop in ' +
      '2022-2023 as gas-fired industrial output contracted under the price shock and ' +
      'coal generation phased down ahead of the 2030 deadline. The Rotterdam ' +
      'petrochemical cluster (Shell Pernis, Yara, Dow) remains the single largest ' +
      'emission concentration in the EU and is central to the 2030-2040 pathway — ' +
      'hinging on hydrogen, CCS (Porthos, Aramis) and electrification. Agriculture ' +
      'emissions (CH₄, N₂O) remain stubborn and entangled with the nitrogen crisis.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 17.5, unit: '%', year: 2023, source: 'CBS / Eurostat' },
    share2005: 2.5,
    share2020: 14.0,
    target2030: 39,
    bySubsector: [
      { id: 'electricity', label: 'Electricity',       share: 47.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 8.5 },
      { id: 'transport',   label: 'Transport',         share: 9.6 },
    ],
    trend: [
      { year: 2005, value: 2.5 }, { year: 2010, value: 3.9 },
      { year: 2015, value: 5.7 }, { year: 2020, value: 14.0 },
      { year: 2021, value: 13.0 }, { year: 2022, value: 15.0 },
      { year: 2023, value: 17.5 },
    ],
    narrative:
      'The Netherlands started from one of the lowest renewable shares in the EU and ' +
      'narrowly hit its 2020 14% target via co-firing biomass and a late solar boom. ' +
      'Offshore wind is now the centrepiece: ~4.7 GW operational end-2023 with a ~21 ' +
      'GW pipeline by 2030 (Hollandse Kust, IJmuiden Ver, Nederwiek). Solar PV ' +
      'penetration is the highest per capita in the EU but grid congestion (netcongestie) ' +
      'is the binding constraint — TenneT projects grid-saturation in most provinces ' +
      'until 2030. The 39% NECP target requires sustained 2 percentage-point annual ' +
      'gains; Commission assessment flags this as challenging.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 60, unit: 'Mtoe', year: 2022 },
    final:   { value: 45, unit: 'Mtoe', year: 2022 },
    intensity: { value: 92, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -22,
    narrative:
      'Final energy consumption fell ~8% between 2008 and 2022; the trajectory has ' +
      'flattened with industrial electrification and heat-pump deployment. Compulsory ' +
      'industrial-energy-saving obligations (Energiebesparingsplicht) under the ' +
      'Environmental Management Act and tightened EED audit thresholds drive most ' +
      'reductions; building renovation lags despite the National Insulation Programme ' +
      '(Nationaal Isolatieprogramma).',
    status: 'partial',
  },
  air: {
    pm25: { value: 9.4, unit: 'µg/m³', year: 2022 },
    no2:  { value: 17.8, unit: 'µg/m³', year: 2022 },
    ozone: { value: 41.5, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 8400, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 94, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Dense population and intensive livestock farming create a particular ammonia / ' +
      'secondary-PM problem: NL has among the highest NH₃ deposition in the EU. ' +
      'Urban NO₂ has fallen sharply since 2015 with environmental zones in Amsterdam, ' +
      'Rotterdam, Utrecht. The Schone Lucht Akkoord (Clean Air Agreement, 2020) sets ' +
      'a 50% health-impact reduction goal for 2030 vs 2016, with provincial and ' +
      'municipal action plans.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 1, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 76, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 70, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 100, unit: '%', year: 2022 },
    narrative:
      'Drinking-water quality is among the best in the EU, but surface-water ecological ' +
      'status is the worst in the EU — only ~1% of water bodies are "good", reflecting ' +
      'agricultural nitrate/phosphate loads, pesticide residues and morphological ' +
      'pressures across an entirely engineered delta. The 2027 WFD compliance deadline ' +
      'will be missed by a wide margin; the Delta Programme integrates flood-risk and ' +
      'fresh-water-supply planning.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 13.6, unit: '% land', year: 2023 },
    natura2000Marine: { value: 26, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 1100, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 12, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Only ~12% of habitats are in favourable conservation status — the lowest in the ' +
      'EU — driven by nitrogen deposition exceeding critical loads on the majority of ' +
      'sensitive Natura 2000 sites. The 2019 Council of State PAS ruling froze permits ' +
      'for activities producing nitrogen near Natura 2000 sites and forced the 2022 ' +
      'National Rural Area Programme (NPLG) with €25bn for buyouts, extensification ' +
      'and habitat restoration through 2035.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 56, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 27.5, unit: '%', year: 2022 },
    resourceProductivity: { value: 4.4, unit: '€/kg', year: 2022 },
    narrative:
      'Circular material use rate is the highest in the EU (~28%) — driven by an open, ' +
      'logistically-integrated economy and a strong waste-trading hub. The 2016 ' +
      'Government-wide Circular Economy Programme targets a fully circular economy by ' +
      '2050; the 2023 National Circular Economy Programme (NPCE) sets quantified 2030 ' +
      'milestones for plastics, food waste and construction materials.',
    status: 'on-track',
  },
  adaptation: {
    strategy: {
      title: 'Nationale Klimaatadaptatiestrategie (NAS) / Delta Programme',
      adoptedYear: 2016,
      lastUpdate: 2024,
      url: 'https://www.klimaatadaptatienederland.nl/',
    },
    keyRisks: [
      'Sea-level rise and coastal/storm-surge flooding (60% of land below high-water mark)',
      'River flooding from Rhine and Meuse discharges',
      'Urban heat and pluvial flooding in densely-built Randstad cities',
      'Salinisation of soils and freshwater intake in the delta',
      'Subsidence of peat-soil polders driving emissions and infrastructure risk',
    ],
    sectoralPlans: [
      'Flood risk (Delta Programme)',
      'Spatial planning',
      'Water management',
      'Agriculture',
      'Infrastructure',
    ],
    narrative:
      'The Delta Programme (statutorily anchored, annually updated and tabled with the ' +
      'budget) is widely cited as best-in-class climate adaptation governance — €1.5bn ' +
      'annual envelope, multi-decadal scenario planning, and explicit adaptive-pathways ' +
      'methodology. The 2024 second-generation Delta Decisions integrate accelerated ' +
      'sea-level-rise scenarios (up to 2 m by 2100) into infrastructure investment ' +
      'planning.',
    status: 'on-track',
  },
  necp: {
    draftSubmitted: '2023-12',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the draft NECP "sufficient" on overall ' +
      'ambition but flagged shortfalls in the renewables sub-sector mix (especially ' +
      'heating), insufficient quantification of the industrial-decarbonisation pathway, ' +
      'and gaps in the energy-efficiency policy mix vs the 22% reduction trajectory.',
    esabccCommentary:
      'Updated 2030 target of −55% to −60% is aligned with the EU framework, but ' +
      'sectoral pathways depend heavily on industrial CCS (Porthos, Aramis) coming ' +
      'online by 2026-2028 and a doubling of offshore-wind deployment rate. The 2023 ' +
      'coalition crisis over rural/nitrogen policy is a continuing implementation risk ' +
      'for the LULUCF and agriculture pathways.',
    gaps: [
      'Grid congestion as a binding constraint on the renewables and electrification rollout',
      'Heating-and-cooling renewables share well below indicative pathway',
      'Quantified CCS deployment trajectory contingent on Aramis FID and CO₂ storage permits',
      'Agriculture pathway depends on nitrogen-policy implementation that remains politically contested',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 623,
    regions: [
      'Groningen (gas extraction phase-out)',
      'IJmond (Tata Steel cluster)',
      'Greater Rotterdam (petrochemicals)',
      'Western Noord-Brabant / Zeeland (chemicals)',
    ],
    narrative:
      'JTF allocation focuses on transitioning the heavy-industry clusters around the ' +
      'North Sea ports and on the Groningen province following the 2023 gas-field ' +
      'closure. Tata Steel IJmuiden hydrogen-DRI transition is the single largest ' +
      'restructuring project, with €1bn+ national co-funding agreed in 2024.',
  },
  policies: [
    {
      name: 'Climate Act (Klimaatwet)',
      year: 2019,
      summary: 'Statutory 2030 target (-55% to -60% vs 1990 after 2023 amendment) and 2050 climate-neutrality goal; mandates 5-yearly Climate Plans and annual progress reports.',
    },
    {
      name: 'National Climate Agreement (Klimaatakkoord)',
      year: 2019,
      summary: 'Sectoral implementation accord across power, industry, buildings, transport and agriculture with quantified 2030 measures.',
    },
    {
      name: 'Offshore Wind Energy Roadmap 2030',
      year: 2022,
      summary: 'Sets ~21 GW offshore wind capacity by 2030 across new wind zones (IJmuiden Ver, Nederwiek, Lagelander).',
    },
    {
      name: 'National Rural Area Programme (NPLG)',
      year: 2022,
      summary: '€25bn rural transition fund integrating nitrogen, climate, water and nature objectives; provincial plans submitted 2024.',
    },
    {
      name: 'Energiebesparingsplicht (Energy-Saving Obligation)',
      year: 2023,
      summary: 'Statutory obligation on industrial facilities to implement all energy-saving measures with payback <5 years; expanded scope under EED 2023.',
    },
    {
      name: 'Delta Act / Delta Programme',
      year: 2011,
      summary: 'Statutory framework for flood-risk and freshwater-supply planning; €1.5bn/yr Delta Fund, annually tabled with budget.',
    },
    {
      name: 'CO₂ levy on industry (CO2-heffing industrie)',
      year: 2021,
      summary: 'National carbon levy topping up EU ETS to a 2030 corridor price, applied to industrial installations exceeding sector benchmarks.',
    },
  ],
  watchNotes:
    '• Urgenda Foundation v State of the Netherlands (Supreme Court, 2019) remains the global benchmark ' +
    'for state climate duties of care; subsequent rulings (Shell, 2021, on appeal) test reach to private actors.\n' +
    '• Nitrogen (stikstof) crisis is the dominant political constraint on housebuilding, transport infrastructure ' +
    'and agricultural transition — 2024 coalition agreement softened buyout instruments.\n' +
    '• Porthos CCS (operational 2026) and Aramis (FID expected 2025) are central to the industrial pathway; ' +
    'first North Sea CO₂ storage permits issued 2023.',
};

export default nl;
