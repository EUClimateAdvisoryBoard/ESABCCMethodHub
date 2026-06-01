/**
 * France — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / CITEPA / EU
 * Commission NECP assessments published 2022-2024 and rounded for headline
 * display. Treat values as best-available baseline data — editors should
 * refine specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const fr: CountryProfile = {
  code: 'FR',
  name: 'France',
  eurostatCode: 'FR',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 46.2276, lon: 2.2137,
    capital: 'Paris',
    populationM: 68.0,
    areaKkm2: 643.8,
    gdpPerCapitaEur: 38500,
    summary:
      'France is the EU\'s second-largest economy and combines one of the lowest ' +
      'electricity-sector carbon intensities in the developed world (≈55 g CO2/kWh) ' +
      'with a comparatively slow build-out of variable renewables. A 56-reactor ' +
      'nuclear fleet provides ~65% of electricity; the 2023 nuclear "renaissance" law ' +
      '(loi relative à l\'accélération nucléaire) authorises up to 14 new EPR2 units, ' +
      'while the Energy-Climate Law (2019) targets carbon neutrality by 2050. The ' +
      'Stratégie Nationale Bas-Carbone (SNBC) sets a five-yearly carbon-budget ' +
      'pathway across all sectors; the third revision (SNBC-3, finalised 2024) ' +
      'aligns with the EU \'Fit-for-55\' −55% pathway.\n\n' +
      'Implementation risks centre on transport (the single largest emitting sector), ' +
      'buildings (winter heat-pump rollout under MaPrimeRénov\'), and industrial ' +
      'decarbonisation of the Dunkirk, Fos-sur-Mer and Le Havre clusters. The 2022 ' +
      'Conseil d\'État (Grande-Synthe / Affaire du Siècle) rulings hold the state ' +
      'legally responsible for meeting its own carbon budgets — a benchmark against ' +
      'which SNBC delivery is now judged.',
    highlights: [
      'Carbon neutrality by 2050 written into the 2019 Energy-Climate Law',
      'Electricity ~92% low-carbon (nuclear + hydro + RES); decarbonisation challenge is in end-uses',
      'SNBC-3 sets a −50% net GHG target by 2030 (vs 1990) aligned with Fit-for-55',
      '€2bn+ Just Transition Fund envelope for Hauts-de-France and Pays de la Loire',
    ],
  },
  ghg: {
    totalLatest: { value: 373, unit: 'Mt CO2e', year: 2023, source: 'CITEPA / UNFCCC' },
    total1990: 547,
    perCapita: { value: 5.5, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.14, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -50, unit: '%', baseline: '1990', notes: 'SNBC-3 net target aligned with EU Fit-for-55 −55% gross pathway (with LULUCF sink restored).' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Carbon neutrality (Loi Énergie-Climat 2019).' },
    sectors: [
      { id: 'transport',     label: 'Transport',     share: 32, absolute: 119 },
      { id: 'agriculture',   label: 'Agriculture',   share: 19, absolute: 71 },
      { id: 'industry',      label: 'Industry',      share: 18, absolute: 67 },
      { id: 'buildings',     label: 'Buildings',     share: 16, absolute: 60 },
      { id: 'power',         label: 'Power & heat',  share: 10, absolute: 37 },
      { id: 'waste',         label: 'Waste & other', share: 5,  absolute: 19 },
    ],
    trend: [
      { year: 1990, value: 547 }, { year: 1995, value: 528 },
      { year: 2000, value: 553 }, { year: 2005, value: 553 },
      { year: 2010, value: 506 }, { year: 2015, value: 458 },
      { year: 2019, value: 441 }, { year: 2020, value: 397 },
      { year: 2021, value: 418 }, { year: 2022, value: 404 },
      { year: 2023, value: 373 },
    ],
    narrative:
      'France has cut gross GHG emissions by ~32% from 1990 levels — a slower pace ' +
      'than Germany or Italy, partly because the power sector decarbonised early via ' +
      'nuclear. Transport remains stubborn at ~32% of total emissions; the SNBC-2 ' +
      'carbon budget for 2019-2023 was overshot in transport and buildings. A sharp ' +
      'drop in 2023 (−5.8% y/y) reflects gas-price-induced industrial demand ' +
      'destruction and exceptionally rapid heat-pump deployment, but the LULUCF ' +
      'sink has collapsed (−40% since 2015) due to forest dieback, threatening the ' +
      'achievability of the 2030 net target.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 22.2, unit: '%', year: 2023, source: 'SDES' },
    share2005: 9.5,
    share2020: 19.1,
    target2030: 33,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 27.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 26.5 },
      { id: 'transport',   label: 'Transport',  share: 9.6 },
    ],
    trend: [
      { year: 2005, value: 9.5 },  { year: 2010, value: 12.7 },
      { year: 2015, value: 15.0 }, { year: 2020, value: 19.1 },
      { year: 2021, value: 19.3 }, { year: 2022, value: 20.7 },
      { year: 2023, value: 22.2 },
    ],
    narrative:
      'France missed its 2020 EU target of 23% (achieved 19.1%) — the only EU member ' +
      'state to do so — and has been catching up since. The 2023 acceleration law ' +
      '(loi APER) streamlined permitting for solar and offshore wind, and the 2024 ' +
      'PPE update raises 2035 installed capacities to 75-100 GW solar and 18 GW ' +
      'offshore wind. Heating-and-cooling RES share is comparatively high thanks to ' +
      'biomass and heat-pump deployment under MaPrimeRénov\'. The Commission ' +
      'flagged the 33% NECP target as below the EU formula contribution (44%) — ' +
      'a key area where the final NECP was strengthened.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 230, unit: 'Mtoe', year: 2022 },
    final:   { value: 142, unit: 'Mtoe', year: 2022 },
    intensity: { value: 105, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -30,
    narrative:
      'Final energy consumption fell ~10% between 2012 and 2022, helped by the 2022 ' +
      'sobriété énergétique plan that durably cut peak winter electricity demand. ' +
      'Buildings retrofit through MaPrimeRénov\' (~€4-5bn/yr) and the obligation to ' +
      'phase out F/G-rated rental properties (DPE thresholds) drive the trajectory. ' +
      'The 2030 −30% target relative to 2012 implies a doubling of the historical ' +
      'savings rate; the Commission assessed this as ambitious but plausible.',
    status: 'partial',
  },
  air: {
    pm25: { value: 9.5, unit: 'µg/m³', year: 2022 },
    no2:  { value: 18.2, unit: 'µg/m³', year: 2022 },
    ozone: { value: 47.1, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 32000, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 94, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'PM2.5 has fallen by roughly a third since 2010, but the Conseil d\'État has ' +
      'levied multiple €10m penalty payments on the state (2021, 2022, 2023) for ' +
      'persistent NO₂ and PM10 exceedances in Paris, Lyon, Marseille and the Rhône ' +
      'valley. Low-emission zones (ZFE-m) in 11 metropolitan areas have been ' +
      'phased in unevenly, with rollback in 2024 amid political pressure. The ' +
      'revised AAQD limits (2030) will be binding on most ZFE perimeters.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 43, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 69, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 80, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 98, unit: '%', year: 2022 },
    narrative:
      'Surface-water ecological status at ~43% "good" is above EU average, but the ' +
      'south-eastern and south-western basins face structural drought stress — 2022 ' +
      'and 2023 saw unprecedented summer low-flow events across the Loire, Garonne ' +
      'and Rhône. The 2023 "Plan Eau" commits 53 measures including water-use ' +
      'reduction targets (−10% by 2030) and contested mega-bassines storage projects.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 13.1, unit: '% land', year: 2023 },
    natura2000Marine: { value: 35, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 2430, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 20, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Mainland Natura 2000 coverage is below the EU-27 average; the overseas ' +
      'territories host globally significant biodiversity hotspots that are ' +
      'separately managed. The Stratégie Nationale Biodiversité 2030 (SNB-3) ' +
      'commits to 30% protected area (10% strictly) by 2030, but only ~20% of ' +
      'continental habitat assessments are favourable — particularly poor for ' +
      'agricultural grasslands, alpine ecosystems and Mediterranean coastal habitats.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 43, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 19.3, unit: '%', year: 2022 },
    resourceProductivity: { value: 3.0, unit: '€/kg', year: 2022 },
    narrative:
      'France hosts the EU\'s most advanced extended-producer-responsibility (EPR) ' +
      'architecture, covering 25+ product streams under the 2020 anti-waste law ' +
      '(loi AGEC). Circular material use rate is well above EU average (~12%), but ' +
      'municipal recycling at ~43% trails the 2025 (55%) and 2030 (60%) Waste ' +
      'Framework Directive targets — driven by uneven sorting-at-source rollout.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Plan National d\'Adaptation au Changement Climatique (PNACC-3)',
      adoptedYear: 2011,
      lastUpdate: 2024,
      url: 'https://www.ecologie.gouv.fr/plan-national-dadaptation-changement-climatique-pnacc',
    },
    keyRisks: [
      'Heatwaves and excess mortality (Mediterranean basin, Île-de-France)',
      'Drought and water scarcity across southern half (Garonne, Rhône, Loire basins)',
      'Coastal erosion and submersion (Atlantic, Channel, Mediterranean)',
      'Forest fires (Mediterranean rim, Landes, Aquitaine, increasingly Atlantic coast)',
      'Agricultural yield losses (cereals, viticulture) under multi-year droughts',
    ],
    sectoralPlans: [
      'Water',
      'Forestry',
      'Agriculture',
      'Health',
      'Coastal & maritime',
      'Infrastructure',
    ],
    narrative:
      'PNACC-3 (October 2024) reframes France\'s adaptation pathway around a "Trajectoire ' +
      'de Réchauffement de Référence" of +4°C nationally by 2100 — a deliberate ' +
      'planning hypothesis above the Paris-aligned trajectory, intended to robustify ' +
      'infrastructure decisions. The 2022 wildfires (Gironde, ~30,000 ha) and 2023 ' +
      'Mediterranean marine heatwave accelerated political prioritisation; ' +
      'adaptation now sits alongside mitigation in the SNBC architecture.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'Commission assessment (December 2023) judged the French NECP draft "partially ' +
      'aligned" — flagged the 2030 renewable energy contribution (33%) as below the ' +
      'EU formula (44%), insufficient quantification of the transport decarbonisation ' +
      'pathway, and gaps in the energy-poverty action plan. Final NECP improved on ' +
      'the renewables ambition and added detail on the nuclear-renewables mix.',
    esabccCommentary:
      'France\'s mitigation architecture (SNBC + Energy-Climate Law) is well-developed ' +
      'but the carbon-budget overshoot in 2019-2023 (transport, buildings) has not ' +
      'triggered automatic corrective measures. ESABCC notes the LULUCF sink ' +
      'collapse materially reduces the achievability of the −50% net 2030 target, ' +
      'and that the SNBC-3 outlook depends on rapid EPR2 build-out — first ' +
      'commissioning expected only 2035-2037.',
    gaps: [
      'Transport sector overshooting SNBC-2 budget; LEZ rollout politically contested',
      'LULUCF sink collapse (−40% since 2015) not yet reflected in policy mix',
      'Renewables 2030 trajectory dependent on offshore wind delivery (no operating capacity in 2023)',
      'Limited detail on industrial CCS / hydrogen ramp-up for Dunkirk/Fos clusters',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 1027,
    regions: [
      'Hauts-de-France (Dunkirk industrial cluster)',
      'Pays de la Loire (Saint-Nazaire / Loire estuary)',
      'Bouches-du-Rhône (Fos-sur-Mer)',
      'Le Havre / Seine-Maritime',
    ],
    narrative:
      '€1.0bn JTF envelope (2021-27) prioritises industrial reorientation of carbon-' +
      'intensive clusters (steel, refining, chemicals) rather than coal regions — ' +
      'France phased out coal-fired power generation in 2022 except for the Cordemais ' +
      'and Saint-Avold plants kept on standby. The "France 2030" plan adds €54bn for ' +
      'industrial decarbonisation, hydrogen and battery gigafactories.',
  },
  policies: [
    {
      name: 'Energy-Climate Law (Loi Énergie-Climat)',
      year: 2019,
      summary: 'Writes carbon neutrality by 2050 into statute; mandates five-yearly carbon budgets via the SNBC; phased out coal-fired power generation by 2022.',
      url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000039355955/',
    },
    {
      name: 'Stratégie Nationale Bas-Carbone (SNBC-3)',
      year: 2024,
      summary: 'Sectoral decarbonisation strategy and carbon budgets to 2033; SNBC-3 aligns with the EU Fit-for-55 −55% pathway and integrates the PNACC adaptation framework.',
    },
    {
      name: 'Climate & Resilience Law (Loi Climat et Résilience)',
      year: 2021,
      summary: 'Cross-sectoral implementation law from the Citizens\' Climate Convention: LEZ rollout, ban on short-haul flights with rail alternative, soil artificialisation halving by 2030.',
    },
    {
      name: 'Acceleration of Renewables Law (APER)',
      year: 2023,
      summary: 'Streamlined permitting for solar PV (mandatory on large car parks, motorway verges) and offshore wind; designated "acceleration zones" via municipal planning.',
    },
    {
      name: 'Nuclear Acceleration Law',
      year: 2023,
      summary: 'Authorises construction of up to 14 new EPR2 reactors; simplifies licensing for sites adjacent to existing nuclear installations.',
    },
    {
      name: 'Anti-Waste / Circular Economy Law (Loi AGEC)',
      year: 2020,
      summary: 'Phases out single-use plastics by 2040; creates 12 new EPR streams; mandates digital "repairability index" on electronics.',
    },
    {
      name: 'Green Industry Law (Loi Industrie Verte)',
      year: 2023,
      summary: 'Accelerates siting of decarbonisation industries (batteries, hydrogen electrolysers); creates the green-industry tax credit (C3IV).',
    },
  ],
  watchNotes:
    '• Conseil d\'État has imposed three €10m penalty payments on the state for air-quality ' +
    'inaction (2021-2023); a similar mechanism applies to the carbon-budget rulings ' +
    '(Grande-Synthe, Affaire du Siècle).\n' +
    '• Haut Conseil pour le Climat (HCC) publishes an annual carbon-budget review — ' +
    '2025 edition expected to flag SNBC-2 overshoot in transport and buildings.\n' +
    '• Nuclear delivery is the central wedge: EPR2 first concrete pour due 2027, with ' +
    'commissioning of the lead unit not before 2035 — leaving a ~10-year window dependent ' +
    'on existing fleet lifetime extensions (visite décennale n°5).',
};

export default fr;
