/**
 * Austria — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const at: CountryProfile = {
  code: 'AT',
  name: 'Austria',
  eurostatCode: 'AT',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 47.5162, lon: 14.5501,
    capital: 'Vienna',
    populationM: 9.1,
    areaKkm2: 83.9,
    gdpPerCapitaEur: 48400,
    summary:
      'Austria combines an exceptionally clean electricity mix — over 80% renewable, ' +
      'dominated by run-of-river and reservoir hydropower — with one of the EU\'s ' +
      'most ambitious climate-neutrality targets: 2040, a decade ahead of the EU ' +
      'baseline. The 2030 Renewable Electricity Expansion Act (EAG, 2021) targets ' +
      '100% renewable electricity (national balance) by 2030 with 27 TWh of new ' +
      'capacity by then (11 TWh PV, 10 TWh wind, 5 TWh hydro, 1 TWh biomass). ' +
      'The Climate Law (Klimaschutzgesetz) reform has been pending since 2020, ' +
      'leaving Austria without a binding statutory pathway — one of the EU\'s ' +
      'most prominent governance gaps.\n\n' +
      'The Alpine geography drives an unusually concentrated adaptation challenge: ' +
      'glacier retreat, permafrost thaw, alpine landslide risk, river-flow regime ' +
      'shifts and high-Alpine ski-tourism vulnerability. The 2024 Wiederkehr-' +
      'storm sequence and 2024 east-Austrian flooding reinforced the political ' +
      'salience of adaptation, even as federal climate-law gridlock continues.',
    highlights: [
      'Climate neutrality by 2040 — among the most ambitious EU targets',
      '80%+ renewable electricity, hydropower-dominated',
      '100% renewable electricity (national balance) by 2030 (EAG 2021)',
      'Federal Climate Law (KSG) reform stalled since 2020',
      '€57/t CO₂ national carbon price (2024), rising to €65 in 2026',
    ],
  },
  ghg: {
    totalLatest: { value: 68.8, unit: 'Mt CO2e', year: 2023, source: 'UBA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=AT" },
    total1990: 79.0,
    perCapita: { value: 7.6, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=AT" },
    perGdp: { value: 0.16, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=AT" },
    target2030: { value: -48, unit: '%', baseline: '2005', notes: 'ESR target; revised NECP indicative national contribution.' },
    target2050: { value: -100, unit: '%', year: 2040, notes: 'Climate neutrality by 2040 — government-programme commitment.' },
    sectors: [
      { id: 'transport',    label: 'Transport',      share: 28, absolute: 19.3 },
      { id: 'industry',     label: 'Industry',       share: 31, absolute: 21.3 },
      { id: 'power',        label: 'Power & heat',   share: 12, absolute: 8.3 },
      { id: 'buildings',    label: 'Buildings',      share: 12, absolute: 8.3 },
      { id: 'agriculture',  label: 'Agriculture',    share: 11, absolute: 7.6 },
      { id: 'waste',        label: 'Waste & other',  share: 6,  absolute: 4.0 },
    ],
    trend: [
      { year: 1990, value: 79.0 }, { year: 1995, value: 81.4 },
      { year: 2000, value: 81.6 }, { year: 2005, value: 92.0 },
      { year: 2010, value: 84.6 }, { year: 2015, value: 78.7 },
      { year: 2019, value: 80.0 }, { year: 2020, value: 73.5 },
      { year: 2021, value: 77.5 }, { year: 2022, value: 72.7 },
      { year: 2023, value: 68.8 },
    ],
    narrative:
      'Austrian emissions peaked around 2005, fell to ~80 Mt by 2019 and then dropped ' +
      'further with COVID and the 2022-2023 energy crisis. The 2023 decline reflected ' +
      'reduced industrial output (voestalpine slowdown) and a mild winter. Transport ' +
      'remains the largest single ESR sector and the principal compliance risk — ' +
      'fuel tourism from neighbouring countries inflates the national inventory.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 39.3, unit: '%', year: 2023, source: 'Statistik Austria / Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=AT" },
    share2005: 22.6,
    share2020: 36.5,
    target2030: 57,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 82.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 38.0 },
      { id: 'transport',   label: 'Transport',  share: 10.6 },
    ],
    trend: [
      { year: 2005, value: 22.6 }, { year: 2010, value: 30.6 },
      { year: 2015, value: 32.6 }, { year: 2020, value: 36.5 },
      { year: 2021, value: 36.4 }, { year: 2022, value: 38.6 },
      { year: 2023, value: 39.3 },
    ],
    narrative:
      'Hydropower (~60% of electricity) and biomass (~15%) provide the renewable ' +
      'backbone; wind and PV are the principal growth vectors under the 2021 EAG. ' +
      'Drought-driven hydro shortfalls (2022) and grid bottlenecks in eastern ' +
      'Austria (Burgenland, Lower Austria) are the central operational issues. ' +
      'The 100% renewable electricity (national balance) 2030 target is ambitious ' +
      'given grid-build and permitting timelines.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 33.6, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=AT" },
    final:   { value: 27.9, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=AT" },
    intensity: { value: 90, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=AT" },
    target2030: -25,
    narrative:
      'Final energy consumption has been broadly flat at ~28-29 Mtoe for over a ' +
      'decade. The 2014 Energy Efficiency Act (EEffG) provides the EED Article 8 ' +
      'transposition; the 2023 reform raised the 2030 target. Industrial heat ' +
      'decarbonisation and building renovation are the principal levers; the rate ' +
      'of "thermal renovation" remains below the 3% / yr indicative trajectory.',
    status: 'partial',
  },
  air: {
    pm25: { value: 11.2, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/austria-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 14.4, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/austria-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 56.8, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/austria-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 3700, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 95, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=AT" },
    narrative:
      'Air quality has improved markedly since 2005, particularly NO₂ in urban ' +
      'centres after diesel-fleet renewal. Inversion-driven PM2.5 spikes in ' +
      'Alpine valley basins (Graz, Klagenfurt, Inn valley) remain the dominant ' +
      'localised concern. The IG-Luft federal air-quality law sets binding limits ' +
      'and a sanctions regime; new AAQ Directive limits (2030) will require ' +
      'further action in valley settlements.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 39, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/austria" },
    groundwaterGood: { value: 88, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/austria" },
    bathingWaterExcellent: { value: 97, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=AT" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=AT" },
    narrative:
      'Drinking and bathing water quality is excellent — Austria draws ~50% of ' +
      'drinking water from karst aquifers and is one of few EU countries supplying ' +
      'untreated groundwater at scale. Surface-water status is constrained by ' +
      'hydromorphological alterations from hydropower infrastructure and ' +
      'agricultural diffuse pollution in the Marchfeld and Burgenland. Glacier ' +
      'retreat is altering long-term seasonal flow regimes.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 15.0, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=AT" },
    natura2000Marine: { value: 0, unit: '% EEZ', year: 2023, source: 'Landlocked', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=AT" },
    threatenedSpecies: { value: 540, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=AT" },
    habitatsFavourable: { value: 18, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/austria" },
    narrative:
      'Natura 2000 land coverage at ~15% is below the EU-27 average; the federal ' +
      'system (nature protection is a Länder competence) creates persistent ' +
      'designation gaps that have triggered Court of Justice rulings. Alpine ' +
      'grassland abandonment, intensive valley-floor agriculture and ski-tourism ' +
      'pressure on subalpine ecosystems are leading stressors.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 63, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=AT" },
    circularMaterialUseRate: { value: 13.0, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=AT" },
    resourceProductivity: { value: 2.4, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=AT" },
    narrative:
      'Austria has one of the EU\'s highest municipal recycling rates (~63%) and ' +
      'mature waste infrastructure — landfilling of untreated municipal waste has ' +
      'been banned since 2004. The 2022 Circular Economy Strategy targets 80% ' +
      'recycling by 2030 and 18% circular material use rate. Deposit-return ' +
      'scheme for beverage containers launched 2025.',
    status: 'on-track',
  },
  adaptation: {
    strategy: {
      title: 'Österreichische Strategie zur Anpassung an den Klimawandel (Austrian Adaptation Strategy)',
      adoptedYear: 2012,
      lastUpdate: 2024,
      url: 'https://www.bmk.gv.at/themen/klima_umwelt/klimaschutz/anpassungsstrategie.html',
    },
    keyRisks: [
      'Glacier retreat and high-Alpine permafrost thaw / rockfall',
      'Flash flooding and Alpine landslides (Hochwasserrisiko)',
      'Heatwaves and excess mortality (Vienna, urban valley settlements)',
      'Ski-tourism vulnerability — snow-line shifts in mid-altitude resorts',
      'Forest dieback (spruce bark-beetle, drought)',
    ],
    sectoralPlans: [
      'Water management',
      'Forestry',
      'Agriculture',
      'Tourism',
      'Health',
      'Infrastructure and disaster risk',
    ],
    narrative:
      'The 2024 update to the federal adaptation strategy integrates new climate ' +
      'projections (CMIP6-based ÖKS15 successor) and tightens Länder coordination. ' +
      'The 2024 floods in Lower Austria (€700M+ damages) demonstrated remaining ' +
      'gaps in pluvial-flood resilience. Glacier monitoring (Pasterze, Hintereisferner) ' +
      'documents accelerating mass loss, with implications for downstream water ' +
      'balance and tourism.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-10',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) flagged that Austria\'s 2030 GHG, RES and ' +
      'efficiency contributions were below the levels needed for collective EU ' +
      'compliance, particularly the ESR-sector pathway. The Commission also noted ' +
      'the absence of a binding Climate Law as a governance gap.',
    esabccCommentary:
      'Austria has very ambitious targets (2040 neutrality, 100% RES electricity 2030) ' +
      'but no statutory pathway — the Klimaschutzgesetz reform has been blocked in ' +
      'coalition negotiations since 2020. ESABCC notes the gap between political ' +
      'ambition and statutory enforcement is the principal credibility risk. The ' +
      'national carbon-pricing system (NEHG) is the most concrete instrument.',
    gaps: [
      'No binding Climate Law / sectoral budgets in force',
      'Transport emissions trajectory not aligned with sectoral ESR ceiling',
      'Grid expansion timeline lags RES capacity-addition pace',
      'Building renovation rate below 3% / yr indicative trajectory',
      'Limited detail on industrial decarbonisation (voestalpine H2 pathway)',
    ],
    status: 'partial',
  },
  policies: [
    {
      name: 'Renewable Energy Expansion Act (EAG)',
      year: 2021,
      summary: 'Targets 100% renewable electricity (national balance) by 2030 with 27 TWh of new capacity; market-premium auction framework.',
      url: 'https://www.ris.bka.gv.at/Dokumente/BgblAuth/BGBLA_2021_I_150/BGBLA_2021_I_150.html',
    },
    {
      name: 'National Emission Certificate Trading Act (NEHG)',
      year: 2022,
      summary: 'National ETS for transport and buildings fuels; €35/t CO₂ start (2022), €45 (2023), €57 (2024) — to be merged into EU ETS2 from 2027.',
    },
    {
      name: 'Mobility Master Plan 2030',
      year: 2021,
      summary: 'Federal mobility decarbonisation roadmap — public-transit "Klimaticket" launched 2021, EV target 100% new sales 2030, ban on new ICE fleet registration 2027 (federal procurement).',
    },
    {
      name: 'Renewable Heat Act (EWG)',
      year: 2023,
      summary: 'Phase-out of fossil heating in new buildings (2023) and replacement requirement for oil and coal heating systems through 2035.',
    },
    {
      name: 'Climate Law (Klimaschutzgesetz)',
      summary: 'Existing 2011 Klimaschutzgesetz remains in force but its 2020 targets expired; reform stalled in coalition negotiations.',
    },
    {
      name: 'Circular Economy Strategy',
      year: 2022,
      summary: 'Strategy to 2030 targeting 80% municipal recycling, 18% circular material use rate; deposit-return for beverage containers 2025.',
    },
  ],
  watchNotes:
    '• Klimaschutzgesetz reform: dossier remains the EU\'s most prominent national climate-law ' +
    'gridlock; outcome of next federal government coalition negotiations will determine ' +
    'whether 2040 neutrality acquires a statutory foundation.\n' +
    '• voestalpine H2 / "greentec steel" investment in Linz / Donawitz: hydrogen-DRI ' +
    'pathway with €1.5 bn FID — execution risk on hydrogen supply.\n' +
    '• Eastern Austrian grid bottlenecks: 380kV ring closure (Salzburg-Tauern line) decision ' +
    'pending; affects ability to absorb planned PV / wind capacity.\n' +
    '• Glacier and high-Alpine permafrost monitoring will increasingly feed into infrastructure ' +
    'standards (rail tunnels, cable cars, hydropower reservoirs).',
};

export default at;
