/**
 * Poland — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / KOBiZE / EU
 * Commission NECP assessments published 2022-2024 and rounded for headline
 * display. Treat values as best-available baseline data — editors should
 * refine specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const pl: CountryProfile = {
  code: 'PL',
  name: 'Poland',
  eurostatCode: 'PL',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 51.9194, lon: 19.1451,
    capital: 'Warsaw',
    populationM: 37.8,
    areaKkm2: 312.7,
    gdpPerCapitaEur: 18500,
    summary:
      'Poland is the EU\'s most coal-dependent member state and its fifth-largest ' +
      'emitter. Coal (hard coal + lignite) still supplied ~61% of electricity ' +
      'generation in 2023, down from ~83% in 2015 but still the highest share in the ' +
      'EU. Domestic mitigation ambition has historically lagged the EU framework: ' +
      'the previous government negotiated a 2049 hard-coal exit with the Silesian ' +
      'mining unions (2021 social agreement), and the 2019 PEP2040 energy strategy ' +
      'did not target climate neutrality. The change of government in late 2023 has ' +
      'opened a substantial policy reset — a long-promised climate-neutrality law ' +
      'is in preparation and PEP2040 is being revised.\n\n' +
      'Poland is the EU\'s largest beneficiary of the Just Transition Fund (€3.85bn), ' +
      'reflecting the scale of its coal-region restructuring challenge across ' +
      'Silesia, Wielkopolska Wschodnia, Łódzkie, Lubelskie and Małopolskie. The ' +
      '2022 Russian invasion of Ukraine reshaped the energy debate — gas decoupling ' +
      'accelerated, but coal-dependence persistence was politically reinforced. ' +
      'Renewable build-out has accelerated rapidly (PV from <1 GW in 2018 to ~17 GW ' +
      'in 2023) but onshore-wind investment was strangled by the 2016 "10H rule" ' +
      'until partial liberalisation in 2023.',
    highlights: [
      'Largest JTF beneficiary in the EU: €3.85bn for six coal-affected regions',
      '~61% of power from coal in 2023 — highest share in the EU',
      'Hard-coal exit by 2049 (2021 social agreement); 2024 government renegotiation under way',
      'PEP2040 revision in progress; climate-neutrality law expected 2025-2026',
    ],
  },
  ghg: {
    totalLatest: { value: 365, unit: 'Mt CO2e', year: 2023, source: 'KOBiZE / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=PL" },
    total1990: 478,
    perCapita: { value: 9.6, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=PL" },
    perGdp: { value: 0.55, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=PL" },
    target2030: { value: -17.7, unit: '%', baseline: '2005', notes: 'ESR target under Fit-for-55; combined with EU ETS reductions delivers ~−35% vs 1990.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'No statutory national 2050 target as of 2024; aligned via EU Climate Law. National neutrality law in preparation.' },
    sectors: [
      { id: 'power',         label: 'Power & heat',  share: 36, absolute: 131 },
      { id: 'transport',     label: 'Transport',     share: 19, absolute: 69 },
      { id: 'industry',      label: 'Industry',      share: 16, absolute: 58 },
      { id: 'buildings',     label: 'Buildings',     share: 13, absolute: 47 },
      { id: 'agriculture',   label: 'Agriculture',   share: 9,  absolute: 33 },
      { id: 'waste',         label: 'Waste & other', share: 7,  absolute: 26 },
    ],
    trend: [
      { year: 1990, value: 478 }, { year: 1995, value: 432 },
      { year: 2000, value: 393 }, { year: 2005, value: 401 },
      { year: 2010, value: 410 }, { year: 2015, value: 391 },
      { year: 2019, value: 395 }, { year: 2020, value: 368 },
      { year: 2021, value: 393 }, { year: 2022, value: 383 },
      { year: 2023, value: 365 },
    ],
    narrative:
      'Poland\'s emissions are ~24% below 1990 (a steep early-1990s drop from heavy-' +
      'industry transition, broadly flat since 2000). The 2023 decline (−4.7% y/y) ' +
      'reflects EUA price-induced coal-to-gas displacement and mild winter heating ' +
      'demand. Power-sector emissions remain the dominant pressure (>36% of total). ' +
      'The ESR target of −17.7% vs 2005 is achievable but the residential heating ' +
      'sector (small coal boilers — "kopciuchy") represents a persistent gap, ' +
      'addressed by the Clean Air Programme.',
    status: 'concern',
  },
  renewables: {
    shareLatest: { value: 16.9, unit: '%', year: 2023, source: 'Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=PL" },
    share2005: 6.9,
    share2020: 16.1,
    target2030: 32.6,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 27.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 21.4 },
      { id: 'transport',   label: 'Transport',  share: 9.1 },
    ],
    trend: [
      { year: 2005, value: 6.9 },  { year: 2010, value: 9.3 },
      { year: 2015, value: 11.8 }, { year: 2020, value: 16.1 },
      { year: 2021, value: 15.6 }, { year: 2022, value: 16.9 },
      { year: 2023, value: 16.9 },
    ],
    narrative:
      'Poland hit its 2020 EU target of 15% (achieved 16.1%) thanks to a late surge ' +
      'in biomass. Solar PV has exploded since 2019 — driven by net-metering for ' +
      'prosumers under "Mój Prąd" — reaching ~17 GW by end-2023 (up from <1 GW in ' +
      '2018). The 2016 "10H rule" (turbines must sit ≥10× tip-height from buildings) ' +
      'effectively halted onshore wind for seven years; the 2023 amendment cut the ' +
      'minimum to 700 m, unlocking a multi-GW pipeline. Offshore wind in the Baltic ' +
      '(~5.9 GW awarded through 2030) is the centrepiece of PEP2040. The 32.6% PNIEC ' +
      'target is below the EU contribution formula (38%) — flagged by the Commission ' +
      'as the principal gap.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 105, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=PL" },
    final:   { value: 75, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=PL" },
    intensity: { value: 195, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=PL" },
    target2030: -23,
    narrative:
      'Energy intensity (~195 kgoe/1000 EUR) is roughly double the EU-27 average — ' +
      'a structural feature of the coal-heavy power mix and heavy-industry base. ' +
      'The "Czyste Powietrze" (Clean Air) programme is the central efficiency tool, ' +
      'targeting 3 million single-family homes through 2029 for retrofit and ' +
      'heating-source replacement; uptake has accelerated since 2022 but lags the ' +
      'envelope target. EED Article 8 audit compliance is improving but enforcement ' +
      'remains weak.',
    status: 'partial',
  },
  air: {
    pm25: { value: 16.4, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/poland-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 17.8, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/poland-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 49.5, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/poland-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 39000, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=PL" },
    narrative:
      'Poland has the EU\'s most severe winter PM2.5 problem — driven by ~3 million ' +
      'small residential coal/biomass boilers ("kopciuchy") concentrated in single-' +
      'family housing. The 2018 CJEU ruling (C-336/16) found Poland in persistent ' +
      'breach of the Ambient Air Quality Directive. The Clean Air Programme has ' +
      'disbursed ~€3bn through 2023 to replace boilers and retrofit homes; the 2023 ' +
      'rate of ~150,000 projects/yr needs to triple to meet the 2029 ambition.',
    status: 'off-track',
  },
  water: {
    surfaceWaterGood: { value: 11, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/poland" },
    groundwaterGood: { value: 91, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/poland" },
    bathingWaterExcellent: { value: 56, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=PL" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=PL" },
    narrative:
      'Only ~11% of surface water bodies reach "good ecological status" — among ' +
      'the lowest in the EU — driven by hydromorphological alterations of rivers ' +
      'and diffuse agricultural pollution. The 2022 Oder River disaster (golden ' +
      'algae bloom, ~300 tonnes of fish killed) was attributed to saline industrial ' +
      'discharges and low flows; a joint Polish-German investigation framework ' +
      'and a new monitoring system have followed. Bathing-water excellence at ' +
      '~56% is well below the EU average.',
    status: 'off-track',
  },
  biodiversity: {
    natura2000Land: { value: 19.7, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=PL" },
    natura2000Marine: { value: 22, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=PL" },
    threatenedSpecies: { value: 1240, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=PL" },
    habitatsFavourable: { value: 19, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/poland" },
    narrative:
      'Poland hosts the EU\'s last large primary forest (Białowieża) and significant ' +
      'wetland and grassland complexes. The Białowieża logging case (CJEU C-441/17, ' +
      '2018) established a precedent against management interventions in Natura 2000 ' +
      'core zones. Only ~19% of habitat assessments are favourable; pressures from ' +
      'industrial forestry, agricultural intensification and the 2022 Oder disaster ' +
      'remain prominent.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 41, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=PL" },
    circularMaterialUseRate: { value: 9.0, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=PL" },
    resourceProductivity: { value: 0.8, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=PL" },
    narrative:
      'Resource productivity (~€0.8/kg) is among the lowest in the EU — a function ' +
      'of the resource-intensive heavy-industry base. Municipal recycling at ~41% ' +
      'is below the 2025 (55%) trajectory. The 2023 EPR reform (long-delayed ' +
      'transposition of the Single-Use Plastics Directive) raised packaging ' +
      'producer fees, and the 2025 deposit-return scheme for beverage containers ' +
      'is expected to deliver a step-change in collection rates.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'Strategiczny plan adaptacji do zmian klimatu (SPA 2020) / 44 City Adaptation Plans',
      adoptedYear: 2013,
      lastUpdate: 2019,
      url: 'https://www.gov.pl/web/klimat/adaptacja-do-zmian-klimatu',
    },
    keyRisks: [
      'Drought and water scarcity (central Poland — Wielkopolska, Kujawy)',
      'Heatwaves and excess mortality in urban areas',
      'Pluvial and fluvial flooding (Odra/Oder, Vistula basins)',
      'Forest fires in lowland pine forests (eastern and central Poland)',
      'Coastal erosion on the Baltic coast (Hel peninsula, Pomerania)',
    ],
    sectoralPlans: [
      'Water',
      'Forestry',
      'Agriculture',
      'Urban planning (44 cities)',
      'Health',
    ],
    narrative:
      'The 2013 SPA is the umbrella strategy; the 44 City Adaptation Plans (MPA-44) ' +
      'developed 2017-2019 are the most operational adaptation instrument. The 2022 ' +
      'Oder disaster, the 2024 catastrophic floods in Lower Silesia (≥7 deaths, ' +
      '€5bn+ damages) and recurring drought across central Poland have raised ' +
      'political salience; a new National Climate Adaptation Strategy is expected ' +
      'under the 2024 government.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-09',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Poland received one of the bluntest verdicts of the December 2023 cycle: the ' +
      'Commission concluded the draft was "not aligned". The specific concerns ran ' +
      'across the file — a renewables share (29.8%) well below the EU\'s indicative ' +
      'contribution, an under-defined ESR pathway, no quantified end-date for coal ' +
      'in the electricity mix, and a just-transition annex that was thin on numbers. ' +
      'The October 2024 final plan answered some of these points by lifting RES to ' +
      '32.6% and sketching an indicative coal-exit curve, but stopped short of ' +
      'putting a statutory phase-out date for power-sector coal into law.',
    esabccCommentary:
      'Our reading of the Polish file is that the previous PNIEC was constrained ' +
      'less by analytical capability than by the political weight of coal-region ' +
      'restructuring — Poland has the largest such burden anywhere in the EU. The ' +
      'change of government at the end of 2023 has materially widened the policy ' +
      'space: a national climate-neutrality law is under preparation and the 2021 ' +
      'social agreement that fixed the mining exit at 2049 is being reopened. In ' +
      'our view 2049 is incompatible with EU-wide neutrality by 2050, so what is ' +
      'now renegotiated in Warsaw will shape the credibility of the whole pathway.',
    gaps: [
      'No statutory 2050 climate-neutrality target; national climate law in preparation',
      '2030 RES target (32.6%) below the EU contribution formula (38%)',
      'No statutory coal-phase-out date for power generation (only social-agreement coal-mining target of 2049)',
      'Clean Air Programme delivery rate insufficient for residential PM2.5 reductions',
      'Limited treatment of industrial decarbonisation (steel — ArcelorMittal Dąbrowa Górnicza, refining)',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 3850,
    regions: [
      'Śląskie (Silesian hard-coal basin — Katowice region)',
      'Wielkopolska Wschodnia (lignite — Konin / Turek)',
      'Łódzkie (lignite — Bełchatów, Europe\'s largest lignite power plant)',
      'Lubelskie (LW Bogdanka coal mine, Lublin region)',
      'Małopolskie (Brzeszcze coal-mining area)',
      'Dolnośląskie (Turów lignite — Polish-Czech border)',
    ],
    narrative:
      'Poland is the EU\'s largest JTF beneficiary at €3.85bn (2021-27), covering ' +
      'six regions across hard-coal (Silesia, Lubelskie, Małopolskie) and lignite ' +
      'belts (Wielkopolska Wschodnia, Łódzkie, Dolnośląskie). The 2021 social ' +
      'agreement for the hard-coal sector negotiated phased mine closures through ' +
      '2049 with state-supported severance — pending renegotiation in 2024-2025 to ' +
      'align with EU ETS price reality. Bełchatów (Łódzkie) is Europe\'s single ' +
      'largest CO2-emitting power plant and the central decarbonisation case.',
  },
  policies: [
    {
      name: 'Polish Energy Policy 2040 (PEP2040)',
      year: 2021,
      summary: 'National energy strategy: offshore wind ramp-up (5.9 GW by 2030), first nuclear units 2033/2035, coal share declining to ~28% of electricity by 2030. 2024 revision in progress.',
      url: 'https://www.gov.pl/web/klimat/polityka-energetyczna-polski',
    },
    {
      name: 'Social Agreement for the Hard-Coal Sector',
      year: 2021,
      summary: 'Tripartite agreement (government, unions, mining companies) phasing out hard-coal mining by 2049 with state-financed severance; under renegotiation in 2024.',
    },
    {
      name: 'Clean Air Programme (Czyste Powietrze)',
      year: 2018,
      summary: 'Replacement / retrofit subsidy programme for ~3m single-family homes; budget envelope ~€25bn through 2029; central tool against winter PM2.5.',
    },
    {
      name: '"10H" Wind Distance Rule Amendment',
      year: 2023,
      summary: 'Cut minimum distance of onshore wind turbines from buildings from 10× tip-height to 700 m, unblocking multi-GW pipeline; further liberalisation under the 2024 government.',
    },
    {
      name: 'Offshore Wind Act',
      year: 2021,
      summary: 'Contracts-for-difference framework for Baltic offshore wind; first commissioning (Baltic Power, PGE-Ørsted, MFW Baltyk) expected 2025-2026.',
    },
    {
      name: 'Mój Prąd / Prosumer Net-Metering',
      year: 2019,
      summary: 'Subsidy + net-metering framework that drove the residential-PV explosion (>17 GW installed by 2023); moved to net-billing for new installations in 2022.',
    },
    {
      name: 'Nuclear Energy Programme (PPEJ)',
      year: 2020,
      summary: 'Plan for 6-9 GW of large-scale nuclear capacity by 2043; first project (Choczewo, AP1000) under preparatory works with Westinghouse-Bechtel consortium.',
    },
  ],
  watchNotes:
    '• The change of government (December 2023) has opened a policy-reset window: a ' +
    'national climate-neutrality law, PEP2040 revision and recalibration of the 2049 ' +
    'coal-exit date are the central files to watch in 2025-2026.\n' +
    '• EU ETS price (~€60-90/t) is making lignite generation structurally loss-making — ' +
    'Bełchatów (Łódzkie) economics and the implied early closure date are a ' +
    'just-transition stress test.\n' +
    '• Court of Justice of the EU has multiple open files on Polish environmental policy ' +
    '(air quality, Białowieża, Turów lignite); compliance risk remains material.',
};

export default pl;
