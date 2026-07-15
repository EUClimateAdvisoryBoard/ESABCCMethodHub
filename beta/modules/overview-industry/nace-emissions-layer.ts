/**
 * NACE Rev. 2.1 — whole-economy EMISSIONS & MARGINAL-ABATEMENT layer.
 * ---------------------------------------------------------------------------
 * The clean-tech catalogue (`cleantech-catalogue.ts`) goes DEEP on the ~18
 * energy-intensive industrial subsectors. This file goes BROAD: a sourced
 * greenhouse-gas + marginal-abatement data point for activities across the
 * ENTIRE NACE Rev. 2.1 wheel (all 22 sections and, where a distinct emissions
 * story exists, the division beneath them), so that clicking any arc of the
 * sunburst surfaces "how much does this activity emit, which way is it going,
 * and what does it cost to abate?".
 *
 * BACKBONE SOURCE. Greenhouse-gas figures are anchored to Eurostat's **Air
 * emissions accounts by NACE Rev. 2 activity** (dataset `env_ac_ainah_r2`) —
 * the official EU statistic that allocates the whole economy's GHG (CO₂e) to
 * economic activities on a residence basis. Total EU-27 economy GHG was
 * ≈ 3.3 bn t CO₂e in 2024 (−20% vs 2013). Where the accounts group activities
 * (they resolve to ~64 NACE-based industries, not all 87 divisions), the
 * division inherits its section/grouping figure with a note.
 *
 * MARGINAL ABATEMENT. Cost ranges and levers are attributed to sector
 * literature — IPCC AR6 WGIII (by chapter: 6 Energy, 7 AFOLU, 9 Buildings,
 * 10 Transport, 11 Industry), the IEA, the EEA and the European Commission's
 * JRC. MAC is inherently study- and assumption-dependent; each is reported
 * "as per <source>", not as a settled number, and is left `undefined` for the
 * many service activities that have no meaningful sectoral abatement-cost
 * literature (their footprint is overwhelmingly indirect — purchased
 * electricity and building heat).
 *
 * SOURCING RULE (hard, identical to the catalogue): every value carries a
 * `source` with a real, working link. Nothing here is invented; gaps are left
 * empty rather than guessed.
 *
 * STATUS: staged, not yet wired in. This whole-economy layer is intentionally
 * held out of the live UI for now — it is not imported by `EmissionsSunburst.tsx`
 * (which currently reads only `nace-2-1.ts`, the pure classification, for the
 * sunburst). It is kept here, complete and sourced, for a future integration
 * that lets clicking any arc surface whole-economy context per NACE division;
 * see the "Wire `nace-emissions-layer.ts` into the sunburst detail panel" item
 * in the deferred backlog of `docs-internal/summer-prep-quality-review/README.md`.
 * Do not delete as dead code — it is deliberately unused, not orphaned.
 */

import type { Source, Sourced } from './cleantech-catalogue';
import { naceAncestors } from './nace-2-1';

/** Emissions + abatement evidence for a single NACE code. */
export interface NaceEmission {
  /** EU-27 greenhouse-gas emissions for this activity (CO₂e), sourced. */
  ghg: Sourced;
  /** Direction of travel over time, sourced. */
  trend?: Sourced;
  /**
   * Marginal abatement cost of the activity's principal near-zero route, or a
   * characterisation of the abatement-cost landscape, sourced. Left undefined
   * where no meaningful sectoral MACC exists (most services).
   */
  mac?: Sourced;
  /** One line naming the main decarbonisation levers for this activity. */
  levers?: string;
  /** Caveat on the emissions figure or its NACE mapping. */
  note?: string;
}

/* --------------------------------------------------------------- sources */

const E = {
  eurostatAea: {
    org: 'Eurostat',
    title: 'Air emissions accounts by NACE Rev. 2 activity (env_ac_ainah_r2)',
    url: 'https://ec.europa.eu/eurostat/databrowser/view/env_ac_ainah_r2/default/table?lang=en',
    year: '2024',
  } as Source,
  eurostatByActivity: {
    org: 'Eurostat',
    title: 'Greenhouse gas emissions by economic activity — Statistics Explained',
    url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Greenhouse_gas_emissions_by_economic_activity',
    year: '2025',
  } as Source,
  eurostatNews2024: {
    org: 'Eurostat',
    title: '2024 EU economy greenhouse gas emissions: −20% since 2013',
    url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260123-1',
    year: '2026',
  } as Source,
  eurostatNews2023: {
    org: 'Eurostat',
    title: 'EU greenhouse gas emissions reduced by 7% in 2023',
    url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250113-1',
    year: '2025',
  } as Source,
  eurostatFootprint: {
    org: 'Eurostat',
    title: 'Greenhouse gas emission footprints — Statistics Explained',
    url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Greenhouse_gas_emission_footprints',
    year: '2025',
  } as Source,
};

/* Sector abatement / lever literature (attributed per MAC value). */
const M = {
  ipccInd: { org: 'IPCC', title: 'AR6 WGIII Chapter 11: Industry', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/', year: '2022' } as Source,
  ipccTransport: { org: 'IPCC', title: 'AR6 WGIII Chapter 10: Transport', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/', year: '2022' } as Source,
  ipccBuildings: { org: 'IPCC', title: 'AR6 WGIII Chapter 9: Buildings', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-9/', year: '2022' } as Source,
  ieaCement: { org: 'IEA', title: 'Cement — Energy System / Industry', url: 'https://www.iea.org/energy-system/industry/cement', year: '2024' } as Source,
  ieaChem: { org: 'IEA', title: 'Chemicals — Energy System / Industry', url: 'https://www.iea.org/energy-system/industry/chemicals', year: '2024' } as Source,
  ieaCcus: { org: 'IEA', title: 'Transforming Industry through CCUS', url: 'https://www.iea.org/reports/transforming-industry-through-ccus', year: '2019' } as Source,
  ieaEnergyAI: { org: 'IEA', title: 'Energy and AI — Executive summary', url: 'https://www.iea.org/reports/energy-and-ai/executive-summary', year: '2025' } as Source,
  ieaDataCentres: { org: 'IEA', title: 'Data Centres and Data Transmission Networks', url: 'https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks', year: '2024' } as Source,
  eprsSteel: { org: 'European Parliament (EPRS)', title: 'Carbon-free steel production — cost reduction options', url: 'https://www.europarl.europa.eu/RegData/etudes/STUD/2021/690008/EPRS_STU(2021)690008_EN.pdf', year: '2021' } as Source,
  shippingMac: { org: 'Cleaner Engineering & Technology (Elsevier)', title: 'Marginal abatement cost curves for CO₂ emission reduction from shipping to 2050', url: 'https://www.sciencedirect.com/science/article/pii/S2666822X24000108', year: '2024' } as Source,
  icctSaf: { org: 'ICCT', title: 'Why and how to bring down the cost of SAF', url: 'https://theicct.org/why-and-how-to-bring-down-the-cost-of-saf-sept25/', year: '2025' } as Source,
  pulpReview: { org: 'Renewable & Sustainable Energy Reviews (Elsevier)', title: 'Decarbonization pathways for the pulp and paper industry: a comprehensive review', url: 'https://www.sciencedirect.com/science/article/pii/S1364032125007439', year: '2025' } as Source,
  eeaBuildings: { org: 'EEA', title: 'Greenhouse gas emissions from energy use in buildings in Europe', url: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-energy', year: '2024' } as Source,
  eeaTransport: { org: 'EEA', title: 'Greenhouse gas emissions from transport in Europe', url: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-transport', year: '2024' } as Source,
  eeaAviShip: { org: 'EEA', title: 'Aviation and shipping emissions in focus', url: 'https://www.eea.europa.eu/articles/aviation-and-shipping-emissions-in-focus', year: '2023' } as Source,
  ecDataCentres: { org: 'European Commission (DG ENER)', title: 'In focus: Data centres — an energy-hungry challenge', url: 'https://energy.ec.europa.eu/news/focus-data-centres-energy-hungry-challenge-2025-11-17_en', year: '2025' } as Source,
};

const eurostatNews2015: Source = {
  org: 'Eurostat',
  title: 'EU economy greenhouse gas emissions: −17% since 2015',
  url: 'https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20260616-2',
  year: '2026',
};

/**
 * WHOLE-WHEEL emissions & abatement layer. Greenhouse-gas figures are the
 * PRODUCTION-based (residence-principle) values of Eurostat's air emissions
 * accounts — distinct from, and generally smaller than, the demand-based GHG
 * "footprint" (e.g. the power activity is ≈585 Mt on the accounts basis, not
 * the ≈876 Mt footprint). Where the accounts group activities (they resolve to
 * ~64 NACE-based industries), a division carries its group/section figure with
 * a note; finer codes inherit via `naceEmissionFor`.
 */
export const NACE_EMISSIONS: Record<string, NaceEmission> = {
  /* ═══════════════════════════ A — AGRICULTURE, FORESTRY & FISHING ═══════ */
  A: {
    ghg: { value: '≈ 459 Mt CO₂e (EU-27, 2023)', note: 'non-CO₂-dominated: CH₄ (enteric fermentation ≈231 Mt CO₂e) and N₂O (soils/manure) together exceed CO₂; the EU’s largest methane source. Excludes the LULUCF land carbon sink.', source: E.eurostatAea },
    trend: { value: '−3.7% 2013→2023 (476.8 → 459.1 Mt)', source: eurostatNews2015 },
    mac: { value: 'Many AFOLU measures €0–100/tCO₂e; ~⅓ below ~€20/tCO₂e, some negative-cost', note: 'global supply-side agriculture + forestry economic potential 7.2–10.6 GtCO₂e/yr by 2030 at ≤US$100/tCO₂e', source: { org: 'IPCC', title: 'AR6 WGIII Chapter 7: AFOLU', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-7/', year: '2022' } },
    levers: 'Cut enteric/manure CH₄ (feed additives, diet, manure biogas), reduce N₂O via precision fertiliser, and decarbonise on-farm energy and machinery.',
    note: 'Air emissions accounts are production-based; the forest/land carbon sink (LULUCF) is not included here.',
  },
  '01': {
    ghg: { value: '≈ 449 Mt CO₂e (EU-27, 2023)', note: 'dominated by CH₄ (enteric fermentation from cattle) and N₂O (agricultural soils, manure); CO₂ a minority share', source: E.eurostatAea },
    trend: { value: '−3.8% 2013→2023 (466.2 → 448.6 Mt)', source: E.eurostatAea },
    mac: { value: 'Many options €0–100/tCO₂e; ~⅓ achievable <~€20/tCO₂e, some negative-cost', note: 'AFOLU levers span soil carbon, improved nitrogen and livestock management', source: { org: 'IPCC', title: 'AR6 WGIII Chapter 7: AFOLU', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-7/', year: '2022' } },
    levers: 'Enteric-CH₄ inhibitors and herd efficiency, manure anaerobic digestion, precision nitrogen to cut N₂O, and soil-carbon/cover-crop practices.',
    note: 'Land-use-change removals/emissions (LULUCF) are excluded from this industry figure.',
  },
  '02': {
    ghg: { value: '≈ 5.2 Mt CO₂e (EU-27, 2023)', note: 'operational emissions of the forestry industry (harvesting/logging machinery, transport) — NOT the forest carbon sink', source: E.eurostatAea },
    trend: { value: '+15.5% 2013→2023 (4.49 → 5.19 Mt)', source: E.eurostatAea },
    mac: { value: 'Largely low- or negative-cost; much potential below ~€20–100/tCO₂e', note: 'forest management, afforestation/reforestation and avoided degradation are among the largest cost-effective land options', source: { org: 'IPCC', title: 'AR6 WGIII Chapter 7: AFOLU', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-7/', year: '2022' } },
    levers: 'Improved/sustainable forest management, afforestation & reforestation, avoided deforestation/degradation, and low-carbon harvesting machinery.',
    note: 'Major caveat: the EU forest CARBON SINK (hundreds of Mt CO₂ removals/yr) sits in LULUCF, not in this NACE-02 operational figure.',
  },
  '03': {
    ghg: { value: '≈ 5.3 Mt CO₂e (EU-27, 2023)', note: 'almost entirely CO₂ from marine diesel/gas oil in fishing vessels, plus aquaculture energy', source: E.eurostatAea },
    trend: { value: '−13.7% 2013→2023 (6.15 → 5.31 Mt)', source: E.eurostatAea },
    mac: { value: '€/tCO₂e MAC curves scarce; efficiency gives up to ~20% fuel savings, hybridisation up to ~79% cuts', note: 'barriers are fleet age, capital and fuel-tax exemptions rather than pure abatement cost', source: { org: 'European Parliament (EPRS/STOA)', title: 'Decarbonising the fishing sector', url: 'https://www.europarl.europa.eu/thinktank/en/document/EPRS_STU(2023)740225', year: '2023' } },
    levers: 'Vessel energy efficiency (hull/propeller, gear, engines), operational change, hybrid-electric propulsion, and biofuels/e-fuels/hydrogen long term.',
  },

  /* ═══════════════════════════════ B — MINING & QUARRYING ════════════════ */
  B: {
    ghg: { value: '≈ 45 Mt CO₂e (EU-27, 2023)', note: 'one of two EU activities (with agriculture) where CH₄+N₂O exceed CO₂ — coal-mine and oil/gas fugitive methane plus extraction-energy CO₂', source: E.eurostatAea },
    trend: { value: '−34.2% 2013→2023 (68.7 → 45.2 Mt)', note: 'steep fall tracks the EU coal phase-down', source: eurostatNews2015 },
    mac: { value: 'Fossil-methane abatement highly cost-effective: ~35 Mt abatable at NO net cost at 2024 energy prices', note: 'IEA: ~US$260 bn to 2030 for a 75% fossil-methane cut', source: { org: 'IEA', title: 'Global Methane Tracker 2025 — Key findings', url: 'https://www.iea.org/reports/global-methane-tracker-2025/key-findings', year: '2025' } },
    levers: 'Capture/oxidise coal-mine (ventilation-air) methane, leak detection & repair and no routine flaring/venting in oil & gas, and electrified extraction.',
    note: 'Eurostat env_ac_ainah_r2 reports mining only at section level; divisions 05–09 are not disaggregated, so they inherit this figure.',
  },

  /* ═══════════════════════════════ C — MANUFACTURING ═════════════════════ */
  C: {
    ghg: { value: '≈ 665 Mt CO₂e (EU-27, 2024)', note: 'production-based air-emissions-account total for manufacturing (distinct from the larger demand-based footprint). Chemicals (128 Mt), non-metallic minerals (157 Mt), basic metals (140 Mt) and refining (119 Mt) make up the bulk.', source: E.eurostatByActivity },
    trend: { value: '−18% (−146 Mt) 2013→2024', source: E.eurostatNews2024 },
    mac: { value: 'Wide: cheap efficiency/heat-electrification in light industry to €100–360/tCO₂ for heavy-industry near-zero routes', source: M.ipccInd },
    levers: 'Electrify low/medium-temperature heat, switch to clean hydrogen and clean electricity, apply CCUS to process CO₂, and boost material efficiency & circularity.',
  },
  '10': {
    ghg: { value: '≈ 55 Mt CO₂e (EU-27, 2024; grouped C10–C12)', note: 'Eurostat reports food, beverages and tobacco as one group; division 10 dominates it. Combustion/process GHG on residence principle.', source: E.eurostatAea },
    trend: { value: '−13% 2013→2024 (63.6 → 55.0 Mt, C10–C12)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (much low- or negative-cost)', note: 'food heat is largely <200 °C and readily electrifiable; efficiency and heat pumps lead', source: M.ipccInd },
    levers: 'Electrify low-temperature process heat (heat pumps), improve efficiency, switch boilers to biomethane/biomass, and cut F-gas refrigerant emissions.',
    note: 'Eurostat A*64 publishes divisions 10, 11 and 12 only as the combined group C10–C12.',
  },
  '11': {
    ghg: { value: '≈ part of the 55 Mt C10–C12 group (EU-27, 2024)', note: 'beverages are a minor share of the combined food/beverages/tobacco group', source: E.eurostatAea },
    trend: { value: '−13% 2013→2024 (C10–C12 group)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (much low/negative-cost)', note: 'low-temperature heat electrification for brewing/bottling, biogas from wastewater', source: M.ipccInd },
    levers: 'Electrify brewing/bottling process heat, capture wastewater biogas, raise efficiency, and use low-carbon electricity.',
    note: 'Reported by Eurostat only within combined group C10–C12.',
  },
  '12': {
    ghg: { value: '≈ negligible; part of the 55 Mt C10–C12 group (EU-27, 2024)', note: 'a tiny fraction of the group; not published separately', source: E.eurostatAea },
    trend: { value: '−13% 2013→2024 (C10–C12 group)', source: E.eurostatAea },
    levers: 'Generic measures only: efficient buildings/HVAC, low-temperature heat electrification, low-carbon electricity.',
    note: 'Low-emitting, non-energy-intensive division; no dedicated MAC literature.',
  },
  '13': {
    ghg: { value: '≈ 6.4 Mt CO₂e (EU-27, 2024; grouped C13–C15)', note: 'textiles, apparel and leather reported together; division 13 (dyeing/finishing/spinning) dominates', source: E.eurostatAea },
    trend: { value: '−24% 2013→2024 (8.4 → 6.4 Mt, C13–C15)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (indicative light-industry range)', note: 'no textile-specific EU MAC curve; IPCC industry range used as proxy', source: M.ipccInd },
    levers: 'Electrify dyeing/finishing heat, recover waste heat, improve efficiency, and source low-carbon electricity.',
    note: 'Eurostat A*64 publishes divisions 13, 14 and 15 only as combined group C13–C15.',
  },
  '14': {
    ghg: { value: '≈ part of the 6.4 Mt C13–C15 group (EU-27, 2024)', note: 'light assembly; small share (mainly building energy)', source: E.eurostatAea },
    trend: { value: '−24% 2013→2024 (C13–C15 group)', source: E.eurostatAea },
    levers: 'Generic measures only: efficient buildings/HVAC and lighting, low-carbon electricity.',
    note: 'Low-emitting; most footprint is upstream fibres/textiles. No dedicated MAC literature.',
  },
  '15': {
    ghg: { value: '≈ part of the 6.4 Mt C13–C15 group (EU-27, 2024)', note: 'small emitter; not published separately', source: E.eurostatAea },
    trend: { value: '−24% 2013→2024 (C13–C15 group)', source: E.eurostatAea },
    levers: 'Generic measures only: electrify/recover low-temperature process heat, efficiency, low-carbon electricity.',
    note: 'Reported within combined group C13–C15; no dedicated MAC literature.',
  },
  '16': {
    ghg: { value: '≈ 4.2 Mt CO₂e (EU-27, 2024)', note: 'already low-carbon — much on-site drying heat is fired with wood residues (biomass CO₂ reported separately)', source: E.eurostatAea },
    trend: { value: '−14% 2013→2024 (4.9 → 4.2 Mt)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (indicative; low residual)', note: 'residual fossil abatement is small; IPCC industry range used', source: M.ipccInd },
    levers: 'Switch residual fossil drying heat to biomass/electric, recover kiln waste heat, and improve efficiency.',
  },
  '17': {
    ghg: { value: '≈ 25 Mt CO₂e (EU-27, 2024)', note: 'one of the larger manufacturing emitters; ~50%+ of energy is already biomass (black liquor)', source: E.eurostatAea },
    trend: { value: '−28% 2013→2024 (35.2 → 25.2 Mt)', source: E.eurostatAea },
    mac: { value: '≈ US$20–70/tCO₂ (BECCS on recovery boilers); efficiency often negative-cost', note: 'energy efficiency, steam/drying electrification, biomass switching, then BECCS for carbon-negative operation', source: M.pulpReview },
    levers: 'Energy efficiency, electrify steam and drying, expand biomass switching, and deploy BECCS on recovery boilers.',
  },
  '18': {
    ghg: { value: '≈ 2.5 Mt CO₂e (EU-27, 2024)', note: 'small emitter; mostly electricity-driven with minor drying/solvent (VOC) use', source: E.eurostatAea },
    trend: { value: '−14% 2013→2024 (2.9 → 2.5 Mt)', source: E.eurostatAea },
    levers: 'Low-carbon electricity, press/dryer efficiency, and electric/UV drying to reduce solvent use.',
    note: 'Low-emitting, largely electricity-based; no dedicated MAC literature.',
  },
  '19': {
    ghg: { value: '≈ 119 Mt CO₂e (EU-27, 2024)', note: 'among the two largest manufacturing emitters; refinery process heat/hydrogen (SMR), FCC and utilities. Consistent with EU ETS refinery totals (~120 Mt).', source: E.eurostatAea },
    trend: { value: '−17% 2013→2024 (142.4 → 118.6 Mt)', source: E.eurostatAea },
    mac: { value: '≈ US$50–100/tCO₂ (CCS retrofit); low-carbon H₂ substitution near-term', note: 'replacing SMR hydrogen with low-emissions hydrogen is a low-barrier like-for-like swap', source: M.ieaCcus },
    levers: 'Switch refinery hydrogen to low-carbon hydrogen, apply CCS to hydrogen/process units, electrify heat, and raise efficiency.',
    note: 'Cross-check: EU ETS/EUTL refinery emissions ≈120 Mt.',
  },
  '20': {
    ghg: { value: '≈ 128 Mt CO₂e (EU-27, 2024)', note: 'the largest manufacturing emitter; steam cracking (olefins), ammonia and process/N₂O emissions', source: E.eurostatAea },
    trend: { value: '−21% 2013→2024 (162.6 → 128.0 Mt; +6% 2023→2024)', source: E.eurostatAea },
    mac: { value: '≈ US$15–25/tCO₂ (CCS on pure ammonia streams) to >US$100/tCO₂ (electrolytic H₂ / cracker electrification)', note: 'CCUS on high-purity streams is cheap; feedstock hydrogen and cracker electrification cost more', source: M.ieaChem },
    levers: 'CCUS on ammonia/high-purity streams, electrolytic hydrogen feedstock, electrify steam crackers and process heat, and abate N₂O.',
    note: 'Cross-check: EU ETS/EUTL chemicals and EEA chemical-industry GHG indicator.',
  },
  '21': {
    ghg: { value: '≈ 5.0 Mt CO₂e (EU-27, 2024)', note: 'modest emitter; steam/process heat, solvents and utilities', source: E.eurostatAea },
    trend: { value: '−12% 2013→2024 (5.7 → 5.0 Mt)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (indicative industry range)', note: 'no pharma-specific EU MAC curve; IPCC industry range used', source: M.ipccInd },
    levers: 'Electrify steam/process heat with heat pumps, recover solvents, improve efficiency, and source low-carbon electricity.',
  },
  '22': {
    ghg: { value: '≈ 6.9 Mt CO₂e (EU-27, 2024)', note: 'modest direct emissions (electricity-intensive moulding/extrusion); most value-chain footprint is upstream in chemicals (C20)', source: E.eurostatAea },
    trend: { value: '−17% 2013→2024 (8.3 → 6.9 Mt)', source: E.eurostatAea },
    mac: { value: '≈ €50–150/tCO₂e (indicative industry range)', note: 'IPCC industry range; recycled feedstock cuts embodied emissions', source: M.ipccInd },
    levers: 'Electrify and improve efficiency of moulding/extrusion, low-carbon electricity, and recycled feedstock.',
  },
  '23': {
    ghg: { value: '≈ 157 Mt CO₂e (EU-27, 2023)', note: 'cement clinker and lime (process CO₂ from calcination) plus glass and ceramics. Broader than EU ETS (covers combustion + process + non-ETS sites).', source: E.eurostatAea },
    trend: { value: '−13% 2013→2023 (181 → 157 Mt)', source: E.eurostatAea },
    mac: { value: 'CCS-heavy; near-zero cement ≈ +75–150% production cost, capture ≈ US$60–150/tCO₂', note: 'clinker substitution and alt-fuels are low/negative-cost early levers; unavoidable calcination CO₂ needs CCUS', source: M.ieaCement },
    levers: 'Clinker substitution (SCMs / limestone-calcined clay), alternative fuels, kiln efficiency, and CCUS on calcination-process CO₂.',
    note: 'Cross-check: Sandbag EU ETS 2023 cement+lime ≈124 Mt; Eurostat 157 Mt additionally covers glass, ceramics and non-ETS installations.',
  },
  '24': {
    ghg: { value: '≈ 140 Mt CO₂e (EU-27, 2023)', note: 'iron & steel dominate (blast-furnace coke/coal + process CO₂); aluminium and non-ferrous add smaller shares', source: E.eurostatAea },
    trend: { value: '−19% 2013→2023 (174 → 140 Mt)', source: E.eurostatAea },
    mac: { value: '≈ €73–166/tCO₂ by 2030 (cleaner routes vs conventional)', note: 'scrap-EAF lowest-cost; H₂-DRI and CCS at the higher end. Saves ≈2 t CO₂ per t steel switching coal-BF to H₂-DRI.', source: M.eprsSteel },
    levers: 'Scrap-based electric-arc furnaces, hydrogen direct-reduced iron (H₂-DRI), CCS on blast furnaces, and clean-electricity aluminium smelting.',
    note: 'Cross-check: Sandbag EU ETS 2023 iron & steel ≈96 Mt (≈145 Mt value-chain basis); Eurostat 140 Mt covers all basic metals.',
  },
  '25': {
    ghg: { value: '≈ 11 Mt CO₂e (EU-27, 2023)', note: 'low direct emissions; fabrication/assembly dominated by indirect electricity plus modest heat-treatment/forging/coating', source: E.eurostatAea },
    trend: { value: '−15% 2013→2023 (13.0 → 11.1 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: decarbonise electricity, electrify process heat (heat treatment/forging), improve efficiency.',
  },
  '26': {
    ghg: { value: '≈ 2.6 Mt CO₂e (EU-27, 2023)', note: 'very low direct emissions; largely indirect electricity, with some process F-gases (semiconductor etch)', source: E.eurostatAea },
    trend: { value: '−13% 2013→2023 (3.0 → 2.6 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity for fabs, plus abatement of process fluorinated gases (PFCs/SF₆/NF₃).',
  },
  '27': {
    ghg: { value: '≈ 3.2 Mt CO₂e (EU-27, 2023)', note: 'low direct emissions; assembly-oriented, dominated by indirect electricity, some SF₆ in switchgear', source: E.eurostatAea },
    trend: { value: '−27% 2013→2023 (4.4 → 3.2 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity, efficiency, and SF₆ substitution/containment in switchgear.',
  },
  '28': {
    ghg: { value: '≈ 7.8 Mt CO₂e (EU-27, 2023)', note: 'low-to-moderate direct emissions; indirect electricity plus some process heat and testing', source: E.eurostatAea },
    trend: { value: '−23% 2013→2023 (10.1 → 7.8 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: decarbonise electricity, electrify process heat, improve energy/material efficiency.',
  },
  '29': {
    ghg: { value: '≈ 9.2 Mt CO₂e (EU-27, 2023)', note: 'low direct emissions for the sector’s size; assembly and paint/coating combustion', source: E.eurostatAea },
    trend: { value: '+32% 2013→2023 (7.0 → 9.2 Mt)', note: 'one of few manufacturing divisions with rising direct emissions, tracking output', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity, electrify paint-shop/curing heat; largest leverage is embodied-material choice.',
  },
  '30': {
    ghg: { value: '≈ 1.6 Mt CO₂e (EU-27, 2023)', note: 'very low direct emissions (ships, rail, aircraft assembly); dominated by indirect electricity', source: E.eurostatAea },
    trend: { value: '−7% 2013→2023 (1.7 → 1.6 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity, electrified process heat, efficiency in large assembly halls.',
  },
  '31': {
    ghg: { value: '≈ 2.7 Mt CO₂e combined with C32 (EU-27, 2023)', note: 'very low direct emissions; Eurostat reports furniture only jointly with other manufacturing (C31_C32)', source: E.eurostatAea },
    trend: { value: '−18% 2013→2023 (3.3 → 2.7 Mt, C31_C32)', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity, electrify drying/finishing heat, reduce solvent-based coating combustion.',
    note: 'Eurostat publishes GHG only for the combined aggregate C31_C32.',
  },
  '32': {
    ghg: { value: '≈ 2.7 Mt CO₂e combined with C31 (EU-27, 2023)', note: 'heterogeneous small-scale manufacturing (jewellery, instruments, toys, medical devices); indirect-electricity dominated', source: E.eurostatAea },
    trend: { value: '−18% 2013→2023 (3.3 → 2.7 Mt, C31_C32)', source: E.eurostatAea },
    levers: 'Mostly indirect: decarbonise electricity and improve energy/material efficiency across diverse processes.',
    note: 'Eurostat publishes GHG only for the combined aggregate C31_C32.',
  },
  '33': {
    ghg: { value: '≈ 2.8 Mt CO₂e (EU-27, 2023)', note: 'very low direct emissions; repair/maintenance/installation, indirect electricity and mobile-equipment fuel', source: E.eurostatAea },
    trend: { value: '−4% 2013→2023 (2.9 → 2.8 Mt)', source: E.eurostatAea },
    levers: 'Mostly indirect: clean electricity, electrify service fleets and heat, efficiency.',
  },

  /* ═════════════════ D — ELECTRICITY, GAS, STEAM & AIR CONDITIONING ══════ */
  D: {
    ghg: { value: '≈ 585 Mt CO₂e (EU-27, 2023)', note: 'the largest single activity in the EU air-emissions accounts; fossil power and heat generation. Section D equals division 35. (The ≈876 Mt sometimes quoted is the demand-based footprint, not this production figure.)', source: E.eurostatAea },
    trend: { value: '−44% 2013→2023 (1,042.8 → 584.5 Mt; −458 Mt)', note: 'the sharpest relative and largest absolute fall of any NACE activity; coal-to-renewables switching', source: E.eurostatNews2023 },
    mac: { value: 'Large low-cost potential; much wind/solar mitigation below US$20/tCO₂e, some net-negative', note: 'AR6 SPM Fig. SPM.7: wind and solar offer the largest mitigation potential of any single option', source: { org: 'IPCC', title: 'AR6 WGIII Chapter 6: Energy systems', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-6/', year: '2022' } },
    levers: 'Scale wind/solar, phase out coal and unabated gas, expand grids and storage, and electrify heat.',
  },
  '35': {
    ghg: { value: '≈ 585 Mt CO₂e (EU-27, 2023)', note: 'fossil power and heat generation — the EU’s single largest emitting activity. (The ≈876 Mt sometimes quoted is the demand-based footprint, not this production figure.)', source: E.eurostatAea },
    trend: { value: '−44% 2013→2023 (1,042.8 → 584.5 Mt; −458 Mt)', note: 'sharpest fall of any NACE activity', source: E.eurostatNews2023 },
    mac: { value: 'Large low-cost potential; much wind/solar mitigation below US$20/tCO₂e, some net-negative', source: { org: 'IPCC', title: 'AR6 WGIII Chapter 6: Energy systems', url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-6/', year: '2022' } },
    levers: 'Scale wind/solar, phase out coal and unabated gas, expand grids and storage, and electrify heat.',
  },

  /* ═══════════ E — WATER SUPPLY; SEWERAGE, WASTE & REMEDIATION ═══════════ */
  E: {
    ghg: { value: '≈ 145 Mt CO₂e (EU-27, 2023)', note: 'sum of water supply (E36 ≈4.6 Mt) and the combined sewerage/waste/remediation item (E37–E39 ≈141 Mt); the latter is CH₄-heavy (landfill)', source: E.eurostatAea },
    trend: { value: 'E37–E39 −6% 2013→2023 (150.0 → 140.9 Mt)', source: E.eurostatAea },
    mac: { value: 'Landfill-gas capture and methane abatement are low-cost, often net-negative', note: 'organics diversion and gas capture deliver most waste-sector cuts at low or negative cost', source: M.ipccInd },
    levers: 'Divert biodegradable waste from landfill, capture landfill gas, expand recycling/composting/anaerobic digestion, and recover biogas from sludge.',
  },
  '36': {
    ghg: { value: '≈ 4.6 Mt CO₂e (EU-27, 2023)', note: 'small direct footprint; mostly energy for abstraction, pumping and treatment', source: E.eurostatAea },
    trend: { value: '−10% 2013→2023 (5.1 → 4.6 Mt)', source: E.eurostatAea },
    levers: 'Efficient pumping, leak reduction and renewable-powered abstraction/treatment.',
  },
  '37': {
    ghg: { value: 'Part of the E37–E39 aggregate ≈ 141 Mt CO₂e (EU-27, 2023)', note: 'sewerage/wastewater is CH₄- and N₂O-heavy but a minor share of the aggregate versus landfill; not published separately', source: E.eurostatAea },
    trend: { value: 'E37–E39 −6% 2013→2023 (150.0 → 140.9 Mt)', source: E.eurostatAea },
    mac: { value: 'Biogas capture from sludge and N₂O/aeration control are typically low-cost; methane recovery can be net-saving', source: M.ipccInd },
    levers: 'Anaerobic digestion/biogas recovery from sludge, N₂O abatement in treatment, and energy-efficient aeration.',
    note: 'Divisions 37, 38 and 39 are published only as one combined item E37–E39.',
  },
  '38': {
    ghg: { value: 'Dominant share of the E37–E39 aggregate ≈ 141 Mt CO₂e (EU-27, 2023) — mostly landfill CH₄', note: 'the EU waste sector emitted ≈101 Mt CO₂e of CH₄ in 2020, ~80% from solid-waste landfill (JRC/EEA)', source: E.eurostatAea },
    trend: { value: 'E37–E39 −6% 2013→2023; landfill CH₄ falling as biodegradable waste is diverted', source: { org: 'European Commission (JRC)', title: 'Proper waste management can significantly reduce EU greenhouse gas emissions', url: 'https://joint-research-centre.ec.europa.eu/jrc-news-and-updates/proper-waste-management-can-significantly-reduce-greenhouse-gas-emissions-eu-2025-08-14_en', year: '2025' } },
    mac: { value: 'Landfill-gas capture and methane abatement are low-cost, often net-negative; organics diversion highly cost-effective', source: M.ipccInd },
    levers: 'Divert biodegradable waste from landfill (Landfill Directive), capture landfill gas, and expand recycling, composting/AD and waste-to-energy.',
    note: 'Published only within the combined E37–E39 item, but the largest contributor to it.',
  },
  '39': {
    ghg: { value: 'Minor share of the E37–E39 aggregate ≈ 141 Mt CO₂e (EU-27, 2023)', note: 'remediation is a small contributor; no standalone GHG value is published', source: E.eurostatAea },
    trend: { value: 'E37–E39 −6% 2013→2023 (150.0 → 140.9 Mt)', source: E.eurostatAea },
    levers: 'Electrified/low-emission machinery and lower-energy in-situ remediation methods.',
    note: 'Published only within the combined E37–E39 item.',
  },

  /* ══════════════════════════════ F — CONSTRUCTION ══════════════════════ */
  F: {
    ghg: { value: '≈ 55 Mt CO₂e direct (EU-27, 2023)', note: 'direct emissions are modest (site machinery and fuel); the sector’s dominant impact is EMBODIED emissions in cement and steel, counted under manufacturing (NACE C)', source: E.eurostatAea },
    trend: { value: '+2.7% 2013→2023 (53.1 → 54.5 Mt)', note: 'one of few activities with rising direct emissions; Eurostat’s 2015–2025 estimate shows construction +11.4%', source: eurostatNews2015 },
    mac: { value: 'Direct cuts cheap (electrified machinery, biofuels); the big, costlier abatement lies in cement/steel decarbonisation and material efficiency', source: M.ipccInd },
    levers: 'Low-carbon materials (green cement/steel, timber), electrified site machinery, and material-efficient/circular building design.',
    note: 'Air emissions accounts report construction only at section level; divisions 41–43 inherit this figure.',
  },

  /* ═══════════════════════ G — WHOLESALE & RETAIL TRADE ═════════════════ */
  G: {
    ghg: { value: '≈ 59 Mt CO₂e (EU-27, 2023)', note: 'sum of wholesale (46 ≈34 Mt) and retail (47 ≈24.5 Mt); own-account distribution fleets, warehouse energy and refrigerant F-gases', source: E.eurostatAea },
    trend: { value: 'Declining with EU trade/services (~−20% 2013–2023)', source: E.eurostatNews2023 },
    levers: 'Fleet/last-mile electrification, warehouse electrification and on-site solar, low-GWP refrigerants, and grid decarbonisation.',
  },
  '46': {
    ghg: { value: '≈ 34 Mt CO₂e (EU-27, 2023)', note: 'direct emissions dominated by own-account road-freight fleets plus warehouse heating & electricity; cold-chain refrigerant F-gases', source: E.eurostatAea },
    trend: { value: 'Declining (~−20% for EU trade/services 2013–2023)', source: E.eurostatNews2023 },
    levers: 'Fleet/last-mile electrification, warehouse electrification and solar, low-GWP refrigerants, and grid decarbonisation.',
    note: 'Air emissions accounts allocate own-account freight to the trade operator, raising direct emissions above pure building energy.',
  },
  '47': {
    ghg: { value: '≈ 24.5 Mt CO₂e (EU-27, 2023)', note: 'mostly building energy (heating, lighting, HVAC), commercial-refrigeration F-gas leakage and delivery vehicles', source: E.eurostatAea },
    trend: { value: 'Declining (~−20% for EU trade/services 2013–2023)', source: E.eurostatNews2023 },
    levers: 'Building efficiency and electrified heating, low-GWP commercial refrigeration (F-gas phase-down), on-site renewables, grid decarbonisation.',
    note: 'Largest single lever is switching commercial refrigeration to low-GWP refrigerants under the EU F-gas Regulation.',
  },

  /* ═════════════════════ H — TRANSPORTATION & STORAGE ═══════════════════ */
  H: {
    ghg: { value: '≈ 460 Mt CO₂e (EU-27, 2023)', note: 'sum of land (49 ≈171), water (50 ≈131), air (51 ≈131), warehousing (52 ≈21) and postal (53 ≈7). International shipping/aviation of resident operators is included (residence principle).', source: E.eurostatAea },
    trend: { value: '+14% 2013→2023 — the ONLY EU sector with higher emissions than a decade earlier', source: E.eurostatNews2024 },
    mac: { value: 'Very wide: road electrification increasingly at parity; shipping e-fuels ≈US$130–1,000/tCO₂; aviation e-kerosene the costliest', source: M.ipccTransport },
    levers: 'Electrify road transport, zero-carbon shipping fuels (ammonia/methanol) + efficiency, sustainable aviation fuel, modal shift to rail, and ETS/ETS2 pricing.',
  },
  '49': {
    ghg: { value: '≈ 171 Mt CO₂e (EU-27, 2023)', note: 'largest emitter within transport; road freight (heavy trucks), buses/coaches, taxis and pipelines. Excludes private-car use (allocated to households).', source: E.eurostatAea },
    trend: { value: 'Rising within transport (+14% for section H 2013–2023); road ~¾ of transport GHG', source: M.eeaTransport },
    mac: { value: 'Wide: battery-electric light/medium road at/below parity; heavy-duty higher-cost but falling', note: 'IPCC finds electrification the lowest-cost deep lever for road; no single €/tCO₂ headline', source: M.ipccTransport },
    levers: 'Battery-electric trucks and buses, electric road systems, hydrogen/advanced biofuels for long-haul, modal shift to rail, and ETS2 from 2027.',
  },
  '50': {
    ghg: { value: '≈ 131 Mt CO₂e (EU-27, 2023)', note: 'fuel burned by EU-resident shipping operators, including international voyages (residence principle); consistent with ~124 Mt CO₂ of EEA-port maritime traffic', source: E.eurostatAea },
    trend: { value: 'Rising long-term; now under EU ETS (2024) and FuelEU Maritime (2025)', source: M.eeaAviShip },
    mac: { value: '≈ US$240–350/tCO₂e (green methanol) to US$340–590/tCO₂e (ammonia); wider range US$130–1,000/tCO₂', note: 'efficiency and wind-assist cheaper near-term', source: M.shippingMac },
    levers: 'Green ammonia/methanol and e-fuels, efficiency (slow steaming, wind-assist, hull/propeller), shore power, plus EU ETS + FuelEU Maritime.',
    note: 'Large figure reflects residence-principle allocation of international bunker fuel to resident operators.',
  },
  '51': {
    ghg: { value: '≈ 131 Mt CO₂e (EU-27, 2023)', note: 'resident airlines including their international flights (residence principle); ~165 Mt from all flights departing European airports on a broader geographic scope', source: E.eurostatAea },
    trend: { value: 'Sharp COVID dip then strong rebound toward pre-pandemic levels by 2023; among fastest-growing emitters', source: M.eeaAviShip },
    mac: { value: 'High: bio-SAF ≈ €1,461/t fuel, e-kerosene ≈ €7,695/t fuel (~10× fossil, 2024) — several-hundred to >€1,000/tCO₂', note: 'SAF cost premium is the binding constraint; e-fuel abatement the highest of any transport mode', source: M.icctSaf },
    levers: 'Sustainable aviation fuel (bio + synthetic e-kerosene) under ReFuelEU Aviation, aircraft/engine efficiency, plus EU ETS (aviation) and CORSIA.',
  },
  '52': {
    ghg: { value: '≈ 20.6 Mt CO₂e (EU-27, 2023)', note: 'cargo/materials-handling equipment, ground-handling, port/terminal operations, warehouse energy; refrigerated storage adds F-gas leakage', source: E.eurostatAea },
    trend: { value: 'Rising within transport & storage (+14% for section H 2013–2023)', source: E.eurostatNews2024 },
    levers: 'Electrified handling equipment, terminal/shore electrification, warehouse efficiency and solar, low-GWP refrigerants for cold logistics.',
  },
  '53': {
    ghg: { value: '≈ 6.8 Mt CO₂e (EU-27, 2023)', note: 'predominantly last-mile and line-haul delivery vehicles plus sorting-centre building energy', source: E.eurostatAea },
    trend: { value: 'Structurally rising with e-commerce parcel volumes (within section H +14%)', source: E.eurostatNews2024 },
    levers: 'Electric delivery vans and cargo bikes, route optimisation and delivery-density gains, depot electrification, and ETS2 pricing.',
  },

  /* ══════════════ I — ACCOMMODATION & FOOD SERVICE ══════════════════════ */
  I: {
    ghg: { value: '≈ 14 Mt CO₂e (EU-27, 2023)', note: 'accommodation (55) and food service (56) combined — Eurostat publishes section I as a single item. Building energy (heating, HVAC, hot water), cooking fuel and refrigerant F-gases.', source: E.eurostatAea },
    trend: { value: 'Declining with EU services (~−20% 2013–2023), plus post-COVID tourism recovery', source: E.eurostatNews2023 },
    levers: 'Building efficiency retrofits, heat pumps replacing boilers, induction cooking, low-GWP refrigeration, and on-site solar.',
  },
  '55': {
    ghg: { value: '≈ 14 Mt CO₂e for accommodation + food service combined (section I, EU-27, 2023)', note: 'not split into 55/56 by Eurostat; accommodation is dominated by building energy — space/water heating, HVAC — plus refrigerant F-gases', source: E.eurostatAea },
    trend: { value: 'Declining with EU services (~−20% 2013–2023)', source: E.eurostatNews2023 },
    levers: 'Building efficiency, heat pumps replacing gas/oil boilers, low-GWP refrigeration/HVAC, on-site solar and grid decarbonisation.',
    note: 'Eurostat air emissions accounts do not disaggregate NACE 55 from 56; the ~14 Mt is the combined section I total.',
  },
  '56': {
    ghg: { value: '≈ 14 Mt CO₂e for accommodation + food service combined (section I, EU-27, 2023)', note: 'restaurant/catering direct emissions come from cooking fuel (gas), commercial-refrigeration F-gases and building energy; upstream food supply-chain emissions excluded', source: E.eurostatAea },
    trend: { value: 'Broadly declining with EU services (~−20% 2013–2023), with a COVID dip and reopening rebound', source: E.eurostatNews2023 },
    levers: 'Electrified (induction) cooking replacing gas, low-GWP commercial refrigeration, building efficiency, and grid decarbonisation.',
    note: 'Combined with NACE 55 in the air emissions accounts; largest total footprint is upstream (food production), out of scope here.',
  },

  /* ══════════════ J–V — SERVICES, PUBLIC SECTOR & OTHER ═════════════════ */
  J: {
    ghg: { value: 'Part of the services aggregate; small direct', note: 'publishing/film/TV/radio (58–60) have negligible direct process emissions; footprint dominated by purchased electricity and building heating', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services (~−14% 2013→2024, −36 Mt)', source: E.eurostatNews2024 },
    levers: 'Clean-power procurement, building efficiency, low-carbon studio/broadcast operations.',
  },
  K: {
    ghg: { value: 'Part of the services aggregate; small direct, large & rising indirect electricity', note: 'telecom networks (61), software/IT (62) and hosting/data centres (63) have minimal direct emissions but the fastest-growing electricity demand in services', source: E.eurostatNews2024 },
    trend: { value: 'Direct declining; indirect electricity demand rising (data centres, networks)', source: M.ieaEnergyAI },
    levers: 'Clean-power PPAs, data-centre/network efficiency, renewable electricity.',
  },
  '61': {
    ghg: { value: 'Small direct; significant, steady network electricity demand', note: 'fixed/mobile network operation and data transmission are electricity-intensive; data centres + transmission ≈330 Mt CO₂e globally in 2020, mostly indirect', source: M.ieaDataCentres },
    trend: { value: 'Electricity broadly flat-to-rising (traffic growth offset by 5G/fibre efficiency)', source: M.ieaDataCentres },
    levers: 'Network energy efficiency, renewable electricity, legacy copper/3G decommissioning, equipment sleep modes.',
  },
  '63': {
    ghg: { value: 'Small direct; large & fast-growing electricity demand', note: 'EU data-centre electricity ≈70 TWh in 2024, projected ≈115 TWh by 2030 (+~70%), driven by AI. Emissions almost entirely indirect via purchased electricity.', source: M.ieaEnergyAI },
    trend: { value: 'Rising sharply (AI-driven)', source: M.ecDataCentres },
    levers: 'Server/cooling efficiency (PUE), clean-power PPAs, waste-heat reuse for district heating, and workload/grid flexibility.',
    note: 'New NACE Rev. 2.1 division carving out data-processing, hosting and computing infrastructure — the key growth story in services electricity demand.',
  },
  L: {
    ghg: { value: 'Part of the services aggregate; very small direct', note: 'banks (64), insurance (65) and auxiliary finance (66) have negligible operational emissions — offices, IT and fleets. Financed emissions are out of scope here.', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services', source: E.eurostatAea },
    levers: 'Green electricity procurement, office efficiency, fleet electrification.',
  },
  M: {
    ghg: { value: 'Small direct operational; strong link to buildings-stock emissions', note: 'real estate (68) direct emissions are small, but its managed building stock ties it to buildings energy — ~34% of global energy-related emissions per IPCC AR6', source: M.ipccBuildings },
    trend: { value: 'Declining with services and buildings decarbonisation', source: M.eeaBuildings },
    levers: 'Building retrofit/deep renovation, heat-pump electrification of heating, green leases, on-site renewables.',
  },
  '68': {
    ghg: { value: 'Small direct; proxy for building-stock heating/cooling emissions', note: 'the distinctive story is indirect: commercial/residential building operation. IPCC AR6 assigns buildings ~34% of global energy-related GHG.', source: M.ipccBuildings },
    trend: { value: 'Declining (EU building-energy emissions falling)', source: M.eeaBuildings },
    levers: 'Deep renovation, fossil-boiler-to-heat-pump switching, envelope insulation, EPBD compliance, district heating.',
    note: 'Emissions are dominated by the managed building stock (heating/cooling), not the real-estate service activity itself.',
  },
  N: {
    ghg: { value: 'Part of the services aggregate; small direct', note: 'legal/accounting (69), consultancy (70), engineering (71), R&D (72), advertising (73), other professional (74), veterinary (75): office- and IT-based, some lab/vehicle emissions', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services', source: E.eurostatAea },
    levers: 'Green electricity, office/lab efficiency, business-travel reduction, fleet electrification.',
  },
  O: {
    ghg: { value: 'Part of the services aggregate; modest direct from fleets/equipment', note: 'rental/leasing (77), employment (78), travel (79), security (80), building/landscape services (81), office admin (82); somewhat higher direct emissions via fleets and equipment', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services', source: E.eurostatAea },
    levers: 'Fleet electrification, low-carbon cleaning/landscaping equipment, green electricity.',
  },
  P: {
    ghg: { value: 'Small direct relative to size; large public building stock + fleets', note: 'public administration and defence (84): heating of large public/office building stocks and vehicle/defence fleets; most operational emissions indirect', source: M.eeaBuildings },
    trend: { value: 'Declining with services and public-building decarbonisation', source: E.eurostatAea },
    levers: 'Public-building retrofit/heat pumps, green public procurement, fleet electrification, on-site renewables.',
  },
  '84': {
    ghg: { value: 'Small direct; heating of an extensive public building estate', note: 'the distinctive story is the large government building estate: heating/cooling and purchased electricity dominate. Buildings ~34% of global energy-related emissions (IPCC AR6).', source: M.ipccBuildings },
    trend: { value: 'Declining', source: M.eeaBuildings },
    levers: 'Public-building deep renovation, heat-pump conversion, EPBD exemplary role, green procurement, fleet/defence electrification.',
    note: 'Emissions concentrated in heating large public building stocks and government/defence fleets, not administrative activity per se.',
  },
  Q: {
    ghg: { value: 'Small direct; large school/university building stock heating', note: 'education (85) operational emissions dominated by heating of schools and campuses plus purchased electricity; direct process emissions negligible', source: M.eeaBuildings },
    trend: { value: 'Declining', source: E.eurostatAea },
    levers: 'School/campus retrofit, heat-pump conversion, on-site solar, green electricity.',
  },
  '85': {
    ghg: { value: 'Small direct; heating of a large education building estate', note: 'the distinctive story is the extensive education building stock (schools, universities): heating/cooling and electricity dominate (IPCC AR6 buildings ~34% of energy-related GHG)', source: M.ipccBuildings },
    trend: { value: 'Declining', source: M.eeaBuildings },
    levers: 'Campus/school deep renovation, fossil-boiler-to-heat-pump switching, rooftop solar, demand-side management.',
    note: 'Emissions dominated by heating education building stocks rather than the teaching activity.',
  },
  R: {
    ghg: { value: 'Small-to-moderate direct; energy-intensive hospital building stock', note: 'human health (86), residential care (87), social work (88); hospitals are among the most energy-intensive buildings (24/7 operation, ventilation, sterilisation) — mostly indirect electricity/heat plus medical gases', source: M.eeaBuildings },
    trend: { value: 'Declining', source: E.eurostatAea },
    levers: 'Hospital energy efficiency, heat-pump/CHP heating, low-GWP anaesthetic gases, green electricity.',
  },
  '86': {
    ghg: { value: 'Moderate direct for services; energy-intensive hospitals', note: 'the distinctive story is the 24/7 hospital building stock (heating, ventilation, sterilisation) plus medical-gas emissions; building operation dominates', source: M.ipccBuildings },
    trend: { value: 'Declining', source: M.eeaBuildings },
    levers: 'Hospital deep retrofit, heat pumps/waste-heat recovery, low-GWP anaesthetics/inhalers, on-site renewables, green power.',
    note: 'Hospitals are among the most energy-intensive building types; emissions driven by continuous building operation plus medical gases.',
  },
  S: {
    ghg: { value: 'Part of the services aggregate; small direct', note: 'arts (90), libraries/museums (91), gambling (92), sports/recreation (93); venue and facility heating/cooling and electricity dominate (e.g. pools, stadiums)', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services', source: E.eurostatAea },
    levers: 'Venue/facility efficiency, heat pumps for pools, green electricity, LED lighting.',
  },
  T: {
    ghg: { value: 'Part of the services aggregate; small direct', note: 'membership organisations (94), repair of goods (95), other personal services (96); small, dispersed premises-heating and electricity emissions', source: E.eurostatNews2024 },
    trend: { value: 'Declining with services', source: E.eurostatAea },
    levers: 'Premises efficiency, green electricity, low-carbon equipment.',
  },
  U: {
    ghg: { value: 'Negligible direct at activity level', note: 'households as employers (97) and undifferentiated household production for own use (98); energy use is captured under household consumption rather than production accounts', source: E.eurostatAea },
    levers: 'Not material at sector level.',
  },
  V: {
    ghg: { value: 'Negligible / not separately reported', note: 'extraterritorial organisations and bodies (99) — embassies, international organisations; office building heating/electricity only', source: E.eurostatAea },
    levers: 'Not material at sector level.',
  },
};

/* ------------------------------------------------------------- resolution */

export interface ResolvedNaceEmission {
  data: NaceEmission;
  /** The code the data actually came from (self or nearest mapped ancestor). */
  sourceCode: string;
  /** True when the data was inherited from a broader code. */
  inherited: boolean;
}

/**
 * Emissions/abatement data for a code, falling back to the NEAREST ancestor
 * that carries data (so a class inherits its division/section figure). Returns
 * null when nothing in the chain has data.
 */
export function naceEmissionFor(code: string): ResolvedNaceEmission | null {
  const direct = NACE_EMISSIONS[code];
  if (direct) return { data: direct, sourceCode: code, inherited: false };
  // ancestors are outermost-first; walk from the nearest parent outward.
  const chain = naceAncestors(code);
  for (let i = chain.length - 1; i >= 0; i--) {
    const a = chain[i];
    const d = NACE_EMISSIONS[a.code];
    if (d) return { data: d, sourceCode: a.code, inherited: true };
  }
  return null;
}

/** True if this code or any ancestor carries emissions data. */
export const hasNaceEmission = (code: string): boolean => naceEmissionFor(code) !== null;

/** The Eurostat air-emissions-accounts backbone source, for attribution. */
export const NACE_EMISSIONS_BACKBONE: Source = E.eurostatAea;
