/**
 * Denmark — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const dk: CountryProfile = {
  code: 'DK',
  name: 'Denmark',
  eurostatCode: 'DK',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 56.2639, lon: 9.5018,
    capital: 'Copenhagen',
    populationM: 5.9,
    areaKkm2: 42.9,
    gdpPerCapitaEur: 53800,
    summary:
      'Denmark is the original wind-power pioneer (Vestas, Ørsted, the 1979 Tvind ' +
      'turbine) and remains the global reference for onshore- and offshore-wind ' +
      'integration — wind supplied ~54% of domestic electricity in 2023. The 2020 ' +
      'Climate Act (Klimalov) writes a 70% GHG reduction by 2030 vs 1990 and net-zero ' +
      'by 2050 into statute (with a 2045 ambition for the latest plan), with annual ' +
      'review by an independent Climate Council (Klimarådet) and a five-year rolling ' +
      'climate-programme cycle.\n\n' +
      'Major recent developments: (i) the 2020 decision to end North Sea oil-and-gas ' +
      'exploration by 2050 with no new licences — a first among major producers; (ii) ' +
      'the 2023 agricultural agreement introducing a CO₂-equivalent levy on livestock ' +
      'emissions from 2030 (first in the world); (iii) the 2024 "Green Tripartite" ' +
      'agreement on land-use restructuring with €5bn for reforestation and rewetting; ' +
      'and (iv) the 2024 Energy Island North Sea tender.',
    highlights: [
      '2030 target: −70% GHG vs 1990 — among the EU\'s most ambitious — in statute',
      'Climate neutrality by 2050 (with 2045 ambition in 2024 climate plan)',
      'World-first agricultural CO₂-eq emissions levy from 2030 (2023 agreement)',
      '2020 end of new North Sea oil-and-gas licensing; production sunset 2050',
      'Wind ~54% of electricity 2023; Energy Island North Sea (3 GW initial) under tender',
    ],
  },
  ghg: {
    totalLatest: { value: 41, unit: 'Mt CO2e', year: 2023, source: 'DCE-Aarhus / UNFCCC' },
    total1990: 70,
    perCapita: { value: 6.9, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.13, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -70, unit: '%', baseline: '1990', notes: 'Climate Act (Klimalov, 2020).' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 statutory; 2024 plan articulates 2045 ambition.' },
    sectors: [
      { id: 'agriculture',  label: 'Agriculture',   share: 28, absolute: 11 },
      { id: 'transport',    label: 'Transport',     share: 28, absolute: 11 },
      { id: 'power',        label: 'Power & heat',  share: 17, absolute: 7 },
      { id: 'industry',     label: 'Industry',      share: 14, absolute: 6 },
      { id: 'buildings',    label: 'Buildings',     share: 9,  absolute: 4 },
      { id: 'waste',        label: 'Waste & other', share: 4,  absolute: 2 },
    ],
    trend: [
      { year: 1990, value: 70 }, { year: 1995, value: 78 },
      { year: 2000, value: 70 }, { year: 2005, value: 65 },
      { year: 2010, value: 62 }, { year: 2015, value: 50 },
      { year: 2019, value: 47 }, { year: 2020, value: 43 },
      { year: 2021, value: 46 }, { year: 2022, value: 44 },
      { year: 2023, value: 41 },
    ],
    narrative:
      'Total emissions have fallen ~41% from 1990, with the largest drop in the power ' +
      'sector (coal phased down, wind scaled up). The Climate Council\'s 2024 status ' +
      'report concluded that the policies on the books still leave a gap of roughly ' +
      '4-6 Mt CO₂e to the 2030 −70% target; agriculture (with intensive livestock ' +
      'systems) is the central remaining structural challenge — addressed by the 2023 ' +
      'levy and 2024 Tripartite agreement.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 44.8, unit: '%', year: 2023, source: 'Eurostat' },
    share2005: 16.0,
    share2020: 31.7,
    target2030: 55,
    bySubsector: [
      { id: 'electricity', label: 'Electricity',       share: 81.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 55.0 },
      { id: 'transport',   label: 'Transport',         share: 11.0 },
    ],
    trend: [
      { year: 2005, value: 16.0 }, { year: 2010, value: 21.9 },
      { year: 2015, value: 30.5 }, { year: 2020, value: 31.7 },
      { year: 2021, value: 34.7 }, { year: 2022, value: 41.6 },
      { year: 2023, value: 44.8 },
    ],
    narrative:
      'Denmark exceeded its 2020 30% target by a wide margin. Wind (onshore + offshore) ' +
      'supplied ~54% of electricity in 2023; biomass-fired CHP supplies most of the ' +
      'district-heating system (sustainability of imported wood biomass remains ' +
      'contested). The 2030 55% RES target is supported by the Energy Island ' +
      'programme (North Sea and Bornholm), Power-to-X tenders for green hydrogen, ' +
      'and a continued offshore-wind pipeline.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 16, unit: 'Mtoe', year: 2022 },
    final:   { value: 14, unit: 'Mtoe', year: 2022 },
    intensity: { value: 62, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -14,
    narrative:
      'Denmark has the second-lowest energy intensity in the EU after Ireland. District ' +
      'heating (~64% of domestic heat demand) is a structural advantage and is being ' +
      'progressively decarbonised away from biomass via large-scale heat pumps. The ' +
      '2030 target is moderate and roughly on the indicative pathway in the 2024 ' +
      'Energy Status report.',
    status: 'on-track',
  },
  air: {
    pm25: { value: 8.7, unit: 'µg/m³', year: 2022 },
    no2:  { value: 12.5, unit: 'µg/m³', year: 2022 },
    ozone: { value: 35.0, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 2100, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 88, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Air quality is good by EU standards but secondary PM from livestock ammonia and ' +
      'wood-stove emissions remain notable concerns. Copenhagen and Aarhus environmental ' +
      'zones target diesel-vehicle phase-out; the 2024 wood-stove subsidy phase-out is ' +
      'aimed at residential particulate sources.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 19, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 90, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 87, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Coastal eutrophication from agricultural nitrogen run-off is the dominant water ' +
      'pressure — the 2022-2027 River Basin Management Plans (Vandområdeplan III) ' +
      'require ~13,000 t/yr nitrogen reductions vs baseline. The 2024 Tripartite ' +
      'land-use agreement converts ~140,000 ha of low-lying peat soils away from ' +
      'cropping, which is expected to reduce both nitrate leaching and direct GHG ' +
      'emissions.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 8.3, unit: '% land', year: 2023 },
    natura2000Marine: { value: 19, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 700, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 5, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Denmark has the lowest Natura 2000 land share in the EU (~8%) and one of the ' +
      'worst habitats-favourable shares (~5%) — driven by very high agricultural land ' +
      'intensity (~60% of territory) and historic loss of wetlands and forests. The ' +
      '2024 Green Tripartite agreement (€5bn) commits to planting ~250,000 ha of new ' +
      'forest and rewetting peatlands — the largest land-use restructuring in modern ' +
      'Danish history.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 51, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 8.0, unit: '%', year: 2022 },
    resourceProductivity: { value: 2.4, unit: '€/kg', year: 2022 },
    narrative:
      'Municipal recycling at ~51% is below the EU-27 average, reflecting a long ' +
      'reliance on waste-to-energy for district heating (~58% of municipal waste ' +
      'incinerated in 2022). The 2020 Action Plan for Circular Economy targets phase-' +
      'down of incineration capacity and a doubling of construction-and-demolition ' +
      'circularity by 2030.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'National klimatilpasningsplan',
      adoptedYear: 2012,
      lastUpdate: 2023,
      url: 'https://en.kefm.dk/climate/adaptation',
    },
    keyRisks: [
      'Coastal flooding and storm surge (extensive low-lying coastlines, Wadden Sea)',
      'Sea-level rise affecting ~30% of land area below 5 m elevation',
      'Pluvial (cloudburst) flooding in Copenhagen and other dense urban areas',
      'Saltwater intrusion in coastal groundwater aquifers',
      'Drought impacts on cereal agriculture (recurrent post-2018)',
    ],
    sectoralPlans: [
      'Water management',
      'Spatial planning',
      'Coastal protection',
      'Agriculture',
      'Health',
    ],
    narrative:
      'Copenhagen Cloudburst Management Plan (2012) is internationally cited as the ' +
      'reference for integrated urban surface-water management after the 2011 €1bn ' +
      'cloudburst event. National strategy is being updated in 2024-2025 to reflect ' +
      'higher sea-level-rise scenarios; coastal-protection competence is being ' +
      'partially recentralised from municipal level.',
    status: 'on-track',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Danish draft NECP "sufficient" on ' +
      'most dimensions, praised the renewables and adaptation framework, but flagged ' +
      'the residual −70% 2030 implementation gap and asked for clearer quantification ' +
      'of the agricultural-sector trajectory.',
    esabccCommentary:
      'Danish climate governance — Climate Act, annual programmes, independent Climate ' +
      'Council — is widely regarded as best-in-class in the EU. The Climate Council\'s ' +
      '2024 status report identified a residual 4-6 Mt CO₂e gap to the 2030 −70% ' +
      'statutory target; the 2023 agricultural-levy and 2024 Tripartite agreement are ' +
      'designed to close that gap but implementation legislation is still pending.',
    gaps: [
      '2030 −70% implementation gap of ~4-6 Mt CO₂e per Climate Council 2024 report',
      'Operationalisation of the agricultural CO₂-eq levy from 2030 (legislation due 2025)',
      'Sustainability of biomass-fired district heating remains contested',
      'LULUCF Regulation compliance depends on land-use restructuring delivery',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 92,
    regions: [
      'North Jutland (oil-and-gas industry and offshore-wind transition)',
      'South Denmark / Funen (industrial restructuring)',
    ],
    narrative:
      'JTF allocation supports the just-transition of the North Sea oil-and-gas industry ' +
      'cluster around Esbjerg/Aalborg toward offshore wind, Power-to-X and CCS, leveraging ' +
      'the substantial existing offshore-engineering skills base.',
  },
  policies: [
    {
      name: 'Climate Act (Klimalov)',
      year: 2020,
      summary: 'Statutory 70% reduction (vs 1990) by 2030 and climate neutrality by 2050; annual climate programme, five-yearly climate plan, independent Climate Council (Klimarådet).',
    },
    {
      name: 'North Sea Agreement',
      year: 2020,
      summary: 'Ends new oil-and-gas licensing in the North Sea; sets production sunset by 2050 — first among major producer countries.',
    },
    {
      name: 'Green Tax Reform / Agricultural CO₂-eq Levy',
      year: 2023,
      summary: 'World-first levy on agricultural GHG emissions (livestock CH₄, soils N₂O) from 2030 — phased in DKK 120/t (€16) rising to DKK 750/t (€100) net by 2035.',
    },
    {
      name: 'Energy Islands Decision',
      year: 2021,
      summary: 'Authorises North Sea Energy Island (initially 3 GW, expandable to 10 GW) and Bornholm Energy Island (~2 GW) as multi-jurisdictional offshore hubs.',
    },
    {
      name: 'Power-to-X Strategy',
      year: 2022,
      summary: 'Sets framework and tendering mechanism for ~4-6 GW green-hydrogen electrolyser capacity by 2030 connected to renewable generation.',
    },
    {
      name: 'Green Tripartite Agreement (Grøn Trepart)',
      year: 2024,
      summary: '€5bn agreement between government, agriculture and environment organisations for the largest land-use restructuring in modern Danish history — 250,000 ha new forest and peatland rewetting.',
    },
    {
      name: 'Copenhagen Cloudburst Plan',
      year: 2012,
      summary: 'Integrated urban surface-water and adaptation plan adopted following 2011 cloudburst; ~€1.5bn investment programme through 2033.',
    },
  ],
  watchNotes:
    '• Climate Council (Klimarådet) annual status report (Feb-March each year) is the principal independent ' +
    'benchmark on policy adequacy vs the Climate Act targets.\n' +
    '• Implementation of the 2023 agricultural CO₂-eq levy and 2024 Tripartite land-use agreement is the ' +
    'pivotal political test of 2025-2026 — sets the global precedent for livestock-emission pricing.\n' +
    '• Energy Island North Sea retender (after first tender drew no bids in 2024) is a stress test of the ' +
    'EU offshore-wind tendering framework under post-2022 inflation/supply-chain conditions.',
};

export default dk;
