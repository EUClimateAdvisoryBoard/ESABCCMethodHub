/**
 * Sweden — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const se: CountryProfile = {
  code: 'SE',
  name: 'Sweden',
  eurostatCode: 'SE',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 60.1282, lon: 18.6435,
    capital: 'Stockholm',
    populationM: 10.5,
    areaKkm2: 450.3,
    gdpPerCapitaEur: 49500,
    summary:
      'Sweden has the lowest GHG intensity per unit of GDP in the EU and one of the ' +
      'most decarbonised electricity systems globally (~98% fossil-free via hydro, ' +
      'nuclear, wind and biomass). The 2017 Climate Policy Framework — a cross-party ' +
      'consensus — enshrines a 2045 net-zero target (including LULUCF), five years ' +
      'ahead of the EU goal, with statutory milestones for 2030 and 2040 and an ' +
      'independent Climate Policy Council that scrutinises government action.\n\n' +
      'The 2022 centre-right Tidö coalition reorientation marked a policy shift: tax ' +
      'cuts on fossil fuels (diesel, gasoline reduction obligation softened in 2024), ' +
      'reduced biofuel blending mandate, and re-prioritisation toward new nuclear ' +
      'build. The Climate Policy Council\'s 2023 and 2024 reports warned the 2030 ' +
      'transport-sector target will now be missed; the LULUCF sink has weakened as ' +
      'forest growth slows and harvest intensifies.',
    highlights: [
      'Net-zero by 2045 — earliest in the EU after Finland — written into statute (Climate Act, 2017)',
      'Power system already ~98% fossil-free; lowest GHG per GDP in the EU',
      'Transport sector target at risk after 2024 biofuel-mandate cut',
      'LULUCF sink weakening — forest harvest pressure and climate stress on boreal forests',
      'New build nuclear: 2024 legislation removes 10-reactor cap; pipeline 2030s',
    ],
  },
  ghg: {
    totalLatest: { value: 41, unit: 'Mt CO2e', year: 2023, source: 'Naturvårdsverket / UNFCCC' },
    total1990: 71,
    perCapita: { value: 3.9, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.07, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -63, unit: '%', baseline: '1990 (excl. LULUCF)', notes: 'Climate Policy Framework — domestic milestone; transport sub-target −70% vs 2010.' },
    target2050: { value: -85, unit: '%', year: 2045, notes: 'Net-zero by 2045 incl. LULUCF and flexibility mechanisms; gross emissions cut ≥85%.' },
    sectors: [
      { id: 'transport',    label: 'Transport',     share: 33, absolute: 14 },
      { id: 'industry',     label: 'Industry',      share: 32, absolute: 13 },
      { id: 'agriculture',  label: 'Agriculture',   share: 14, absolute: 6 },
      { id: 'buildings',    label: 'Buildings',     share: 7,  absolute: 3 },
      { id: 'power',        label: 'Power & heat',  share: 9,  absolute: 4 },
      { id: 'waste',        label: 'Waste & other', share: 5,  absolute: 1 },
    ],
    trend: [
      { year: 1990, value: 71 }, { year: 1995, value: 72 },
      { year: 2000, value: 68 }, { year: 2005, value: 67 },
      { year: 2010, value: 64 }, { year: 2015, value: 53 },
      { year: 2019, value: 50 }, { year: 2020, value: 46 },
      { year: 2021, value: 47 }, { year: 2022, value: 45 },
      { year: 2023, value: 41 },
    ],
    narrative:
      'Sweden has cut gross emissions ~42% from 1990. Industry (steel — SSAB/H2 Green ' +
      'Steel, cement — Cementa) and transport dominate the remaining stock; coal in ' +
      'iron-and-steel reduction is the central decarbonisation challenge. The LULUCF ' +
      'sink (~−35 Mt CO2e in 2010-15) has weakened to ~−30 Mt CO2e and is projected to ' +
      'fall further as harvest levels stay high and boreal disturbances increase; this ' +
      'has direct implications for compliance with the EU LULUCF Regulation.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 66.0, unit: '%', year: 2023, source: 'Eurostat' },
    share2005: 40.5,
    share2020: 60.1,
    target2030: 65,
    bySubsector: [
      { id: 'electricity', label: 'Electricity',       share: 75.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 70.0 },
      { id: 'transport',   label: 'Transport',         share: 29.0 },
    ],
    trend: [
      { year: 2005, value: 40.5 }, { year: 2010, value: 47.2 },
      { year: 2015, value: 53.4 }, { year: 2020, value: 60.1 },
      { year: 2021, value: 62.6 }, { year: 2022, value: 65.8 },
      { year: 2023, value: 66.0 },
    ],
    narrative:
      'Sweden has the highest renewable share in the EU and has comfortably exceeded ' +
      'its 2020 49% target. Hydro (~40% of electricity), wind (~22%) and biomass ' +
      '(district heating, industry) form the backbone; nuclear (~30%) is non-renewable ' +
      'but fossil-free. The 2024 NECP target of 65% for 2030 is roughly aligned with ' +
      'current shares — Commission flagged limited ambition uplift. The transport sub-' +
      'target depends on the reduction obligation (reduktionsplikt) for transport fuels, ' +
      'cut sharply in 2024 by the coalition.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 47, unit: 'Mtoe', year: 2022 },
    final:   { value: 32, unit: 'Mtoe', year: 2022 },
    intensity: { value: 99, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -8,
    narrative:
      'Energy intensity is a third lower than the EU-27 average. Final energy ' +
      'consumption is broadly stable; growth in electrified heavy industry (H2 Green ' +
      'Steel, battery factories — Northvolt, but in restructuring 2024) is partially ' +
      'offset by efficiency gains. The 2030 saving target is modest by EU standards; ' +
      'Commission has asked Sweden to raise ambition.',
    status: 'on-track',
  },
  air: {
    pm25: { value: 5.8, unit: 'µg/m³', year: 2022 },
    no2:  { value: 8.5, unit: 'µg/m³', year: 2022 },
    ozone: { value: 31.0, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 2900, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 51, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'Air quality is among the best in the EU thanks to dispersed population, ' +
      'fossil-free district heating and stringent vehicle standards. Wood-stove ' +
      'particulate emissions remain a winter pollution source in some municipalities. ' +
      'Stockholm and Gothenburg environmental zones and a national transport-' +
      'electrification trajectory should bring further reductions through 2030.',
    status: 'on-track',
  },
  water: {
    surfaceWaterGood: { value: 23, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 98, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 77, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Groundwater status is essentially universally good; surface-water ecological ' +
      'status (~23% "good") is constrained by atmospheric mercury deposition (legacy ' +
      'fish-mercury contamination is widespread) and historical hydropower ' +
      'morphological alterations. Re-licensing of small hydro plants under the ' +
      '2019 National Plan is gradually addressing fish-passage issues.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 13.4, unit: '% land', year: 2023 },
    natura2000Marine: { value: 14, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 2250, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 20, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Natura 2000 land share is below the EU-27 mean and habitat favourable-status ' +
      'is only ~20%, driven by intensive forestry. The dominant pressure is the ' +
      'forestry model — clear-cutting on short rotations affects ~70% of the productive ' +
      'forest area — with consequences for old-growth-dependent species and carbon ' +
      'stocks. EU Forest Strategy 2030 and the Nature Restoration Regulation are ' +
      'politically contested in Sweden.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 41, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 7.0, unit: '%', year: 2022 },
    resourceProductivity: { value: 2.6, unit: '€/kg', year: 2022 },
    narrative:
      'Municipal recycling at ~41% lags the EU-27 average — Sweden incinerates ~50% of ' +
      'municipal waste with energy recovery for district heat (long-time policy choice ' +
      'that locks in incinerator capacity). Circular material use rate (~7%) is below ' +
      'EU average. The 2020 National Circular Economy Strategy sets a long-term ' +
      'redirection of policy toward material circulation over thermal recovery.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Nationell strategi för klimatanpassning',
      adoptedYear: 2018,
      lastUpdate: 2024,
      url: 'https://www.naturvardsverket.se/klimatanpassning',
    },
    keyRisks: [
      'Forest fires and pest outbreaks across boreal forests (notable 2018 fires)',
      'Pluvial and river flooding in Götaland and Mälardalen',
      'Coastal erosion and storm surge (Skåne, Halland)',
      'Permafrost thaw and infrastructure damage in northernmost municipalities',
      'Public-health impacts of summer heatwaves (Stockholm 2018, 2022)',
    ],
    sectoralPlans: [
      'Forestry',
      'Spatial planning',
      'Water management',
      'Infrastructure',
      'Public health',
    ],
    narrative:
      'The 2018 Climate Adaptation Ordinance mandates risk-based adaptation plans for ' +
      'central government agencies; SMHI runs the national climate-adaptation portal. ' +
      'Municipal-level capacity is uneven and the National Audit Office (2022) found ' +
      'fragmented implementation; the 2024 strategy review proposes earmarked grants ' +
      'and statutory municipal duties.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-12',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Swedish draft NECP "sufficient" on ' +
      'overall ambition but flagged limited additional measures vs the 2019 plan, ' +
      'weakening of the transport-sector pathway after the 2023 biofuel-mandate cut, ' +
      'and absence of a quantified LULUCF Regulation compliance pathway.',
    esabccCommentary:
      'Sweden has historically led on climate-policy architecture but the 2022-2024 ' +
      'coalition policy mix (fossil-fuel tax cuts, biofuel-mandate reduction) has ' +
      'increased the gap to the 2030 transport target. The Climate Policy Council in ' +
      'its 2023 and 2024 annual reports concluded the government policy mix is not ' +
      'consistent with the statutory targets.',
    gaps: [
      'Transport sector 2030 target now off track after biofuel-mandate cut',
      'LULUCF sink declining; EU LULUCF Regulation 2030 commitment at risk',
      'Limited additional renewables ambition (2030 65% target ≈ current level)',
      'Reliance on new nuclear build for post-2035 power-sector outlook',
    ],
    status: 'partial',
  },
  policies: [
    {
      name: 'Climate Act (Klimatlag) / Climate Policy Framework',
      year: 2017,
      summary: 'Statutory 2045 net-zero target with 2030 (-63%), 2040 (-75%) milestones; mandates 4-yearly climate action plan and independent Climate Policy Council.',
    },
    {
      name: 'Carbon tax (Koldioxidskatt)',
      year: 1991,
      summary: 'Among the world\'s first and highest national carbon taxes (~€115/tCO₂ in 2024) — applies to non-ETS fossil fuel use.',
    },
    {
      name: 'Reduction Obligation for transport fuels (Reduktionsplikt)',
      year: 2018,
      summary: 'Mandate to blend low-carbon fuels into petrol and diesel; 2024 amendment cut the trajectory sharply (gasoline 6%, diesel 6% from 2024).',
    },
    {
      name: 'Industrial Leap Programme (Industriklivet)',
      year: 2018,
      summary: 'Innovation funding for industrial decarbonisation — co-funds H2 Green Steel, HYBRIT, cement-CCS demonstrators.',
    },
    {
      name: 'New Build Nuclear Authorisation Act',
      year: 2024,
      summary: 'Removes 10-reactor and site restrictions from the 1984 nuclear law; enables new build at sites beyond the historic three.',
    },
    {
      name: 'Forestry Act amendments (skogsvårdslagen)',
      year: 2021,
      summary: 'Updates forestry obligations with biodiversity-protection emphasis; politically contested vs EU Forest Strategy 2030.',
    },
  ],
  watchNotes:
    '• Climate Policy Council annual reports (March each year) are the principal independent reality-check ' +
    'on the government action plan; 2024 report concluded current policy is not consistent with the 2045 statutory goal.\n' +
    '• LULUCF Regulation 2030 compliance is the single most exposed area — forest sink under climatic and harvest pressure.\n' +
    '• Northvolt restructuring (Nov 2024) is a test of the industrial-electrification narrative; impacts skilled-jobs/JTF.',
};

export default se;
