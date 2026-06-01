/**
 * Romania — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const ro: CountryProfile = {
  code: 'RO',
  name: 'Romania',
  eurostatCode: 'RO',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 45.9432, lon: 24.9668,
    capital: 'Bucharest',
    populationM: 19.0,
    areaKkm2: 238.4,
    gdpPerCapitaEur: 15300,
    summary:
      'Romania operates one of the EU\'s most balanced low-carbon power mixes — ' +
      'roughly 30% hydropower from the state-controlled Hidroelectrica fleet, ~20% ' +
      'nuclear from the two Cernavodă CANDU units, plus growing wind in Dobrogea and ' +
      'recovering solar. Headline emissions are ~60% below 1990 levels, reflecting the ' +
      'collapse of heavy industry in the 1990s rather than active decarbonisation policy. ' +
      'The 2024 NECP update commits to coal phase-out by 2032 (extended from 2030 amid ' +
      'energy-security concerns) and a 2050 climate-neutrality goal, with the Jiu Valley ' +
      'and Oltenia lignite regions the focus of a major Just Transition programme.\n\n' +
      'Romania is also a regional gas hub with significant offshore Black Sea reserves ' +
      '(Neptun Deep, FID 2023) coming online from 2027 — government policy positions ' +
      'gas as a transition fuel, a stance contested by environmental groups and ' +
      'increasingly by the Commission\'s ETS / methane-regulation framework. Building ' +
      'renovation and transport decarbonisation are the principal NECP delivery risks.',
    highlights: [
      'Long-Term Strategy: climate neutrality by 2050, with 2030 −78% target (vs 1990)',
      'Coal phase-out by 2032 (extended from 2030); Jiu Valley + Oltenia restructuring',
      'Largest JTF allocation in the EU after Poland: ~€2.1bn for six lignite/industrial counties',
      'Hidroelectrica IPO (2023) brought the state hydro champion to public markets',
      'Neptun Deep offshore gas project (FID 2023) — controversial transition-fuel bet',
    ],
  },
  ghg: {
    totalLatest: { value: 113, unit: 'Mt CO2e', year: 2022, source: 'UNFCCC / EEA' },
    total1990: 280,
    perCapita: { value: 5.9, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.39, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -78, unit: '%', baseline: '1990', notes: 'Long-Term Strategy (2023); reflects deep 1990s baseline collapse rather than ambition vs current levels.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (Long-Term Strategy, 2023).' },
    sectors: [
      { id: 'power',       label: 'Power & heat',  share: 24, absolute: 27 },
      { id: 'industry',    label: 'Industry',      share: 22, absolute: 25 },
      { id: 'transport',   label: 'Transport',     share: 20, absolute: 23 },
      { id: 'agriculture', label: 'Agriculture',   share: 16, absolute: 18 },
      { id: 'buildings',   label: 'Buildings',     share: 13, absolute: 15 },
      { id: 'waste',       label: 'Waste & other', share: 5,  absolute: 5 },
    ],
    trend: [
      { year: 1990, value: 280 }, { year: 1995, value: 188 },
      { year: 2000, value: 144 }, { year: 2005, value: 154 },
      { year: 2010, value: 124 }, { year: 2015, value: 116 },
      { year: 2019, value: 117 }, { year: 2020, value: 105 },
      { year: 2021, value: 116 }, { year: 2022, value: 113 },
      { year: 2023, value: 108 },
    ],
    narrative:
      'Headline emissions reduction of ~60% vs 1990 is the EU\'s deepest, but almost ' +
      'entirely driven by the 1990s industrial collapse — emissions have been roughly ' +
      'flat since 2015. The energy/power sector still relies on lignite (Oltenia complex) ' +
      'for ~15% of generation. Transport emissions are up 60% on 1990 due to fleet growth ' +
      'and a high share of imported old diesel vehicles. The 2030 target is ambitious on ' +
      'paper but only requires a further ~10% cut from current levels.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 24.1, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 17.6,
    share2020: 24.5,
    target2030: 36.2,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 41.4 },
      { id: 'heating',     label: 'Heating & cooling', share: 26.6 },
      { id: 'transport',   label: 'Transport',  share: 8.9 },
    ],
    trend: [
      { year: 2005, value: 17.6 }, { year: 2010, value: 22.7 },
      { year: 2015, value: 24.8 }, { year: 2020, value: 24.5 },
      { year: 2021, value: 23.6 }, { year: 2022, value: 24.1 },
    ],
    narrative:
      'Romania exceeded its 2020 binding target (24%) but the RES share has plateaued ' +
      'since 2014 — the early wind boom in Dobrogea stalled after policy support was ' +
      'withdrawn in 2014, and solar PV growth was sluggish until prosumer rules and ' +
      'auction frameworks were reformed in 2022-23. The 36% 2030 target requires ~6.9 GW ' +
      'of new wind and ~7.7 GW of new solar by 2030; the Contracts-for-Difference scheme ' +
      'launched in 2024 is intended to accelerate deployment.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 32.4, unit: 'Mtoe', year: 2022 },
    final:   { value: 24.1, unit: 'Mtoe', year: 2022 },
    intensity: { value: 174, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -45,
    narrative:
      'Energy intensity has nearly halved since 2000 but remains roughly 70% above the ' +
      'EU-27 average. The building stock is dominated by Soviet-era prefab apartment ' +
      'blocks ("blocuri") where deep renovation is structurally difficult; the National ' +
      'Renovation Wave plan and PNRR-funded thermal rehabilitation schemes are key ' +
      'delivery instruments but suffer from low absorption rates.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.5, unit: 'µg/m³', year: 2022 },
    no2:  { value: 22.0, unit: 'µg/m³', year: 2022 },
    ozone: { value: 60.1, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 21300, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'PM2.5 levels are well above the WHO guideline, with wood and coal-fired domestic ' +
      'heating, illegal waste burning around Bucharest, and an ageing diesel fleet as ' +
      'dominant sources. Romania has been the subject of multiple CJEU infringement ' +
      'rulings on air quality (Bucharest, Brașov, Iași) and remains a chronic ' +
      'underperformer on PM10/PM2.5 monitoring and reporting coverage.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 65, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 88, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 56, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 96, unit: '%', year: 2022 },
    narrative:
      'Romania reports better surface-water status than most EU peers (~65% good ' +
      'ecological status) reflecting low industrial / agricultural pressure on Carpathian ' +
      'and Danube tributaries — though comparability with other Member States\' ' +
      'classification is contested. Rural water supply / wastewater treatment is the ' +
      'main investment gap: ~30% of rural population still lacks centralised wastewater ' +
      'treatment, a binding EU infringement file.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 23.4, unit: '% land', year: 2023 },
    natura2000Marine: { value: 22, unit: '% territorial waters', year: 2023 },
    threatenedSpecies: { value: 580, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 56, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Romania hosts some of the EU\'s most intact forest, wetland and large-carnivore ' +
      'ecosystems — the Carpathians host ~6,000 brown bears (largest EU population), and ' +
      'the Danube Delta is a global biodiversity hotspot. Habitats favourable share at ' +
      '~56% is the highest in the EU. Key pressures are illegal logging in primary and ' +
      'old-growth forests (subject of CJEU rulings and Commission infringements) and ' +
      'wetland drainage.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 12, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 1.3, unit: '%', year: 2022 },
    resourceProductivity: { value: 0.6, unit: '€/kg', year: 2022 },
    narrative:
      'Romania has the lowest municipal recycling rate in the EU (~12%) and one of the ' +
      'lowest circular material use rates (~1.3%). Waste management infrastructure is ' +
      'underdeveloped: landfilling dominates and several illegal dumps remain subject to ' +
      'CJEU rulings. The 2023 DRS deposit-return scheme is a major step forward and is ' +
      'building scale rapidly through 2024-25.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Strategy and Action Plan 2024-2030',
      adoptedYear: 2024,
      lastUpdate: 2024,
      url: 'https://mmediu.ro/strategia-nationala-privind-schimbarile-climatice',
    },
    keyRisks: [
      'Drought and heatwaves on the southern plains (Bărăgan, Oltenia)',
      'Flash flooding in Carpathian foothills and Danube tributaries',
      'Coastal erosion and saltwater intrusion on Black Sea shore',
      'Forest pest outbreaks (Ips typographus) under heat-drought stress',
      'Agricultural yield variability and rural water-supply stress',
    ],
    sectoralPlans: [
      'Agriculture and rural development',
      'Water and forestry',
      'Energy',
      'Health',
      'Transport infrastructure',
    ],
    narrative:
      'The 2024 National Climate Change Strategy sets the adaptation framework and is ' +
      'aligned with the EU Climate Adaptation Strategy. Romania\'s exposure is ' +
      'particularly pronounced on the southern Bărăgan and Oltenia plains, where ' +
      'aridification is well documented, and on the Black Sea coast where erosion ' +
      'rates exceed 1 m/yr in places. PNRR funding supports flood-risk and ' +
      'forest-protection investments.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-10',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Commission assessment (Dec 2023) found the draft Romanian NECP partially aligned: ' +
      'the energy efficiency 2030 contribution was deemed below the indicative national ' +
      'level, transport ESR delivery thin, and the coal phase-out timetable (2030) was ' +
      'considered fragile — subsequently extended to 2032 in the final NECP.',
    esabccCommentary:
      'ESABCC notes Romania\'s deep 1990s baseline collapse delivers favourable ' +
      'headline numbers vs 1990 but the post-2015 trajectory is essentially flat. ' +
      'The Neptun Deep gas project locks in long-lived fossil infrastructure that risks ' +
      'becoming stranded under tightening EU climate policy; transport and buildings ' +
      'remain the binding constraints on ESR delivery.',
    gaps: [
      'Coal phase-out slipped from 2030 to 2032 on energy-security grounds',
      'New offshore gas (Neptun Deep) inconsistent with 2050 net-zero pathway',
      'Transport sector trajectory not credible without urban mobility / fleet renewal reform',
      'Building renovation pace below NECP indicative path',
      'Low EU-funds absorption (PNRR delays) limits investment delivery',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 2140,
    regions: [
      'Hunedoara (Jiu Valley hard-coal)',
      'Gorj (Oltenia lignite complex)',
      'Dolj (Oltenia lignite-fired power)',
      'Mureș (chemical industry)',
      'Galați (steel — Liberty Galați)',
      'Prahova (refining)',
    ],
    narrative:
      'Romania receives the EU\'s second-largest JTF allocation (~€2.1bn) covering six ' +
      'counties — primarily the Jiu Valley hard-coal basin and the Oltenia lignite ' +
      'complex (CE Oltenia, ~13,000 direct employees). The Territorial Just Transition ' +
      'Plans foresee mine closure, site rehabilitation and reskilling, with new economic ' +
      'activities targeting renewables, hydrogen, agri-food and tourism.',
  },
  policies: [
    {
      name: 'Long-Term Strategy on Climate Change',
      year: 2023,
      summary: 'Strategic framework setting 2050 climate-neutrality and 2030 −78% (vs 1990) GHG targets; underpins the NECP update.',
    },
    {
      name: 'National Recovery and Resilience Plan (PNRR)',
      year: 2021,
      summary: '€29.2bn package with strong green pillar (≈41%): renewables, hydrogen, building renovation, rail and EV charging.',
    },
    {
      name: 'Decarbonisation Law (Law 334/2022)',
      year: 2022,
      summary: 'Statutory framework for coal phase-out (2030, since extended to 2032) and restructuring of CE Oltenia and CE Hunedoara.',
    },
    {
      name: 'Contracts-for-Difference (CfD) Scheme',
      year: 2024,
      summary: 'Two-way CfD support scheme for onshore wind, solar PV and offshore wind; first auctions for ~5 GW launched in 2024-25.',
    },
    {
      name: 'Prosumer Net-Metering Framework',
      year: 2022,
      summary: 'Quantitative net-metering rules for small RES self-consumers; triggered a ~6× expansion of rooftop solar in 2022-24.',
    },
    {
      name: 'Deposit-Return Scheme (RetuRO SGR)',
      year: 2023,
      summary: 'Mandatory take-back system for beverage packaging; operational from end-2023.',
    },
    {
      name: 'Offshore Black Sea Law (Law 256/2022)',
      year: 2022,
      summary: 'Revised fiscal regime for offshore gas (Neptun Deep) — enabled OMV Petrom / Romgaz FID in 2023.',
    },
  ],
  watchNotes:
    '• Neptun Deep first gas expected 2027 — a major test of EU methane regulation ' +
    'and aligned with NECP gas-bridge logic; ESABCC has flagged stranded-asset risk.\n' +
    '• Coal phase-out: 2032 timetable is contingent on adequate gas + renewable + storage ' +
    'replacement — slippage would put ESR compliance at risk.\n' +
    '• Old-growth forest protection: ongoing CJEU litigation may force tightening of ' +
    'logging controls in Carpathian Natura 2000 sites.\n' +
    '• 2024-25 elections produced a coalition that is broadly supportive of NECP delivery ' +
    'but with continuing emphasis on gas as a transition fuel.',
};

export default ro;
