/**
 * Summer Prep — Synergies & trade-offs between climate-change MITIGATION and
 * ADAPTATION for the INDUSTRY and TRANSPORT sectors.
 * ---------------------------------------------------------------------------
 * Internal note backing the M · 35 "Summer Prep" sub-module. It maps, subsector
 * by subsector, where a mitigation action also strengthens (or undermines)
 * climate resilience, and where an adaptation need pushes emissions the other
 * way. The subsector taxonomy deliberately mirrors the 2024 ESABCC progress
 * report ("Towards EU climate neutrality") so the structure stays comparable:
 *
 *   Industry  (report Ch. 5): iron & steel, cement & lime, chemicals &
 *             petrochemicals, plus the cross-cutting circular-economy /
 *             material-efficiency layer.
 *   Transport (report Ch. 6): road passenger (cars & vans), road freight
 *             (heavy-duty), rail, aviation, maritime & inland waterways,
 *             plus the cross-cutting demand / modal-shift layer.
 *
 * PROVENANCE — read before using in a Board product. Each entry states a real,
 * literature-grounded interaction and cites the primary work it rests on
 * (IPCC AR6 WGII/WGIII, the EEA European Climate Risk Assessment (EUCRA 2024),
 * and peer-reviewed studies). On 10 July 2026 every citation was source-
 * verified against Crossref/publisher records (titles, authors, journals,
 * volumes, DOIs, and the claim attributed to each source). That pass fixed a
 * wrong DOI (Palin et al. — the old link pointed to an unrelated paper), a
 * dead publisher URL (Material Economics — now the Sitra mirror), an
 * incomplete Rhine citation (now the peer-reviewed 2023 German Economic
 * Review version), and the report's publication date (January 2024). The
 * *framing and the assignment of each mechanism to a subsector* remain
 * AI-compiled working judgements pending sector-lead sign-off. Nothing here
 * is a Board position.
 */

export type SectorKey = 'Industry' | 'Transport';

/** Direction of the mitigation ↔ adaptation interaction. */
export type InteractionKind = 'synergy' | 'trade-off' | 'mixed';

export interface LitReference {
  /** Full human-readable citation. */
  cite: string;
  /** Optional link to the source. */
  url?: string;
}

export interface SynergyEntry {
  id: string;
  sector: SectorKey;
  /** Report-aligned subsector label. */
  subsector: string;
  kind: InteractionKind;
  /** Short headline. */
  title: string;
  /** The mitigation action / lever at stake. */
  mitigation: string;
  /** The adaptation / resilience dimension it interacts with. */
  adaptation: string;
  /** The mechanism — how the two interact, in one paragraph. */
  mechanism: string;
  /** Practical implication for EU policy design. */
  implication: string;
  references: LitReference[];
}

export const SYNERGY_KIND_META: Record<
  InteractionKind,
  { label: string; color: string; description: string; symbol: string }
> = {
  synergy: {
    label: 'Synergy',
    color: '#007B6C',
    symbol: '＋',
    description: 'The mitigation action also reduces climate vulnerability (a win–win).',
  },
  'trade-off': {
    label: 'Trade-off',
    color: '#B83230',
    symbol: '⚠',
    description:
      'The mitigation action increases climate vulnerability, or an adaptation need raises emissions.',
  },
  mixed: {
    label: 'Conditional',
    color: '#FF9933',
    symbol: '≈',
    description:
      'The interaction is a synergy or a trade-off depending on design, siting or resource context.',
  },
};

/** Subsector order per sector (mirrors the report chapter structure). */
export const SUBSECTOR_ORDER: Record<SectorKey, string[]> = {
  Industry: [
    'Iron & steel',
    'Cement & lime',
    'Chemicals & petrochemicals',
    'Cross-cutting — circularity & material efficiency',
  ],
  Transport: [
    'Road passenger (cars & vans)',
    'Road freight (heavy-duty)',
    'Rail',
    'Aviation',
    'Maritime & inland waterways',
    'Cross-cutting — demand & modal shift',
  ],
};

// Shared references reused across several entries.
const AR6_WG2: LitReference = {
  cite: 'IPCC (2022) AR6 WGII, "Impacts, Adaptation and Vulnerability" — Ch. 13 (Europe) & Ch. 18 (Climate Resilient Development Pathways).',
  url: 'https://www.ipcc.ch/report/ar6/wg2/',
};
const AR6_WG3: LitReference = {
  cite: 'IPCC (2022) AR6 WGIII, "Mitigation of Climate Change" — Ch. 10 (Transport) & Ch. 11 (Industry).',
  url: 'https://www.ipcc.ch/report/ar6/wg3/',
};
const EUCRA: LitReference = {
  cite: 'EEA (2024) "European Climate Risk Assessment" (EUCRA), EEA Report 01/2024.',
  url: 'https://www.eea.europa.eu/publications/european-climate-risk-assessment',
};
const SHARIFI_SYN: LitReference = {
  cite: 'Sharifi, A. (2021) "Co-benefits and synergies between urban climate change mitigation and adaptation measures: A literature review", Science of the Total Environment 750:141642.',
  url: 'https://doi.org/10.1016/j.scitotenv.2020.141642',
};
const SHARIFI_TRADE: LitReference = {
  cite: 'Sharifi, A. (2020) "Trade-offs and conflicts between urban climate change mitigation and adaptation measures: A literature review", Journal of Cleaner Production 276:122813.',
  url: 'https://doi.org/10.1016/j.jclepro.2020.122813',
};

export const SYNERGIES: SynergyEntry[] = [
  // ─────────────────────────────── INDUSTRY ────────────────────────────────
  // Iron & steel
  {
    id: 'ind-steel-scrap-circularity',
    sector: 'Industry',
    subsector: 'Iron & steel',
    kind: 'synergy',
    title: 'Scrap-based electric steel cuts emissions and supply-chain exposure',
    mitigation: 'Shift from blast-furnace/BOF to scrap-fed electric-arc-furnace (EAF) steel.',
    adaptation:
      'Lower dependence on imported coking coal and iron ore, and lower process-water intensity.',
    mechanism:
      'Secondary (scrap-based) steelmaking cuts total (direct + indirect) CO₂ by roughly 85–90 % versus the integrated route where the electricity is largely decarbonised — the IEA roadmap\'s 2.2 vs 0.3 tCO₂/t pair is direct + indirect, not direct-only (direct-only is 1.2 vs 0.04) while also shortening and localising the supply chain, reducing exposure to climate- and geopolitics-driven disruption of coke and ore imports. (A water-intensity advantage for EAF over integrated works is often asserted but is not supported by the sources cited here — the IEA roadmap gives only a sector-wide average and does not split by route.)',
    implication:
      'Circular-economy and scrap-quality policy (CEAP, Ecodesign) is simultaneously a resilience instrument; the report already flags the EU’s recycling-first, prevention-last gap for industry.',
    references: [
      AR6_WG3,
      {
        cite: 'IEA (2020) "Iron and Steel Technology Roadmap" (direct + indirect intensities ≈2.2 tCO₂/t BF-BOF vs ≈0.3 tCO₂/t scrap-EAF; direct-only ≈1.2 vs ≈0.04).',
        url: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
      },
      {
        cite: 'Material Economics (2018) "The Circular Economy — A Powerful Force for Climate Mitigation", Material Economics/Sitra.',
        url: 'https://www.sitra.fi/wp-content/uploads/2018/06/the-circular-economy-a-powerful-force-for-climate-mitigation.pdf',
      },
    ],
  },
  {
    id: 'ind-steel-h2-water',
    sector: 'Industry',
    subsector: 'Iron & steel',
    kind: 'trade-off',
    title: 'Green-hydrogen DRI is water-hungry in water-stressed regions',
    mitigation: 'Hydrogen direct-reduced iron (H₂-DRI) powered by renewable electrolysis.',
    adaptation: 'Freshwater availability under more frequent and severe droughts.',
    mechanism:
      'Water electrolysis needs ~9 litres of purified water per kg of H₂ stoichiometrically — on the order of 20–30 litres once water treatment is counted, plus cooling water on top (Tonelli et al. 2023). Siting large H₂-DRI plants in southern/Mediterranean regions that are attractive for cheap solar power can collide with declining summer water availability, creating a maladaptation risk unless desalination or reuse is planned in.',
    implication:
      'Green-steel siting and Net-Zero Industry Act support should carry a water-stress screen; the EUCRA rates southern-European water scarcity as a high and rising risk.',
    references: [
      {
        cite: 'Tonelli, D. et al. (2023) "Global land and water limits to electrolytic hydrogen production using wind and solar resources", Nature Communications 14:5532.',
        url: 'https://doi.org/10.1038/s41467-023-41107-x',
      },
      {
        cite: 'Vogl, V., Åhman, M. & Nilsson, L.J. (2018) "Assessment of hydrogen direct reduction for fossil-free steelmaking", Journal of Cleaner Production 203:736–745.',
        url: 'https://doi.org/10.1016/j.jclepro.2018.08.279',
      },
      EUCRA,
    ],
  },
  // Cement & lime
  {
    id: 'ind-cement-adaptation-demand',
    sector: 'Industry',
    subsector: 'Cement & lime',
    kind: 'trade-off',
    title: 'Building climate defences drives cement demand',
    mitigation: 'Decarbonising and moderating clinker/cement output.',
    adaptation:
      'Concrete-intensive protective infrastructure — dykes, sea walls, flood defences, reinforced foundations.',
    mechanism:
      'Hard adaptation infrastructure is overwhelmingly concrete- and cement-based, so ramping up coastal and flood protection pushes cement demand — and its hard-to-abate process emissions — in the opposite direction to the mitigation target. The larger the unmet adaptation deficit, the stronger the counter-pull on the cement budget.',
    implication:
      'Adaptation investment plans and cement decarbonisation (CCS, clinker substitution) must be budgeted together; nature-based and low-clinker defences reduce the clash.',
    references: [
      {
        cite: 'Habert, G. et al. (2020) "Environmental impacts and decarbonization strategies in the cement and concrete industries", Nature Reviews Earth & Environment 1:559–573.',
        url: 'https://doi.org/10.1038/s43017-020-0093-3',
      },
      AR6_WG2,
    ],
  },
  {
    id: 'ind-cement-cool-durable',
    sector: 'Industry',
    subsector: 'Cement & lime',
    kind: 'mixed',
    title: 'Lower-carbon, durable and reflective concretes aid heat resilience',
    mitigation: 'Clinker substitution, CO₂-cured and novel-binder concretes.',
    adaptation:
      'Longer-lived infrastructure and cooler urban surfaces (reduced urban-heat-island effect).',
    mechanism:
      'Blended and carbonation-cured concretes cut embodied carbon, but the durability case is conditional and cuts both ways. Habert et al. find that carbonation can damage the electrochemical protection of steel reinforcement and is deleterious for the durability of concrete exposed to rain or high humidity — precisely the climate-exposed infrastructure at issue here — while noting that more than 80 % of cement goes into applications where higher carbonation raises no durability concern. So the mitigation product extends life in unreinforced and sheltered uses and can shorten it in outdoor reinforced structures. NOTE: an earlier version also claimed a reflective/\u201ccool surface\u201d urban-heat benefit; neither cited source addresses albedo or urban heat islands, so that limb has been removed pending a source.',
    implication:
      'Standards and public procurement can reward the mixes that deliver both lower embodied carbon and demonstrated durability/albedo.',
    references: [
      SHARIFI_SYN,
      {
        cite: 'Habert, G. et al. (2020) Nature Reviews Earth & Environment 1:559–573.',
        url: 'https://doi.org/10.1038/s43017-020-0093-3',
      },
    ],
  },
  {
    id: 'ind-cement-ccs-water',
    sector: 'Industry',
    subsector: 'Cement & lime',
    kind: 'trade-off',
    title: 'Cement CCS adds a water penalty in water-stressed basins',
    mitigation:
      'Post-combustion carbon capture on cement plants — the indispensable lever for the sector’s process emissions.',
    adaptation: 'Freshwater availability for capture solvents and cooling under drought.',
    mechanism:
      'Carbon capture raises a plant’s water intensity — retrofitting post-combustion capture raises a coal plant’s water intensity by roughly 55%, and CCS water footprints span orders of magnitude (≈0.7–575 m³ per tCO₂) depending on the CCS technology — the 575 upper bound is BECCS including biomass evapotranspiration, while post-combustion capture, the cement-relevant case, sits at roughly 2.2–2.6 m³/tCO₂ (Rosa et al. cover power plants and DACCS/BECCS, not cement, so the transfer to kilns is an inference). Cement CCS sited in drought-prone basins therefore adds water demand exactly where EUCRA sees scarcity rising; cooling choices (dry/hybrid) and reuse determine how sharp the conflict becomes.',
    implication:
      'CCS permitting and Net-Zero Industry Act support for cement should carry the same water-stress screen proposed for hydrogen, with capture/cooling configurations sized to local hydrology.',
    references: [
      {
        cite: 'Rosa, L., Sanchez, D.L., Realmonte, G., Baldocchi, D. & D’Odorico, P. (2021) "The water footprint of carbon capture and storage technologies", Renewable and Sustainable Energy Reviews 138:110511.',
        url: 'https://doi.org/10.1016/j.rser.2020.110511',
      },
      EUCRA,
    ],
  },
  // Chemicals & petrochemicals
  {
    id: 'ind-chem-biofeedstock-land',
    sector: 'Industry',
    subsector: 'Chemicals & petrochemicals',
    kind: 'trade-off',
    title: 'Bio-based feedstock switching competes with land and water',
    mitigation: 'Replacing fossil feedstocks with biomass-derived feedstocks for chemicals/plastics.',
    adaptation:
      'Food-system resilience and land/water availability under climate stress.',
    mechanism:
      'Large-scale biomass feedstocks for chemicals add to the same land- and water-competition pressures the report flags for biofuels and bioenergy: they can raise vulnerability of food and ecosystems in a drying climate and drive indirect land-use change. The trade-off is smallest for waste/residue and CO₂-based (CCU) feedstocks.',
    implication:
      'Feedstock-switching incentives should prioritise circular carbon and residues over primary biomass, mirroring the report’s cascading-use logic.',
    references: [
      AR6_WG3,
      {
        cite: 'IPCC (2019) "Climate Change and Land" (SRCCL), SPM on land-based mitigation competition.',
        url: 'https://www.ipcc.ch/srccl/',
      },
    ],
  },
  {
    id: 'ind-chem-coastal-cooling',
    sector: 'Industry',
    subsector: 'Chemicals & petrochemicals',
    kind: 'mixed',
    title: 'Riverside/coastal clusters: electrified but climate-exposed',
    mitigation: 'Electrification and heat integration of large coastal/riverside chemical clusters.',
    adaptation:
      'Exposure to river low-flows, cooling-water limits, sea-level rise and storm surge.',
    mechanism:
      'The big integrated chemical parks (e.g. along the Rhine–Scheldt axis) benefit from grid and hydrogen infrastructure for electrification, but sit exactly where cooling-water availability falls in droughts and where flood/surge risk rises. The same site that enables deep mitigation carries concentrated climate risk, so the two agendas must be planned on the same asset.',
    implication:
      'Cluster decarbonisation roadmaps (and their permitting) should embed climate-proofing of cooling water and flood defences, not treat them separately.',
    references: [EUCRA, AR6_WG2],
  },
  // Cross-cutting industry
  {
    id: 'ind-xc-electrification-grid',
    sector: 'Industry',
    subsector: 'Cross-cutting — circularity & material efficiency',
    kind: 'mixed',
    title: 'Industrial electrification shifts risk onto a climate-exposed grid',
    mitigation: 'Electrifying industrial heat and processes.',
    adaptation:
      'Grid reliability under heatwaves, droughts (hydro/thermal derating) and storms.',
    mechanism:
      'Electrification is central to industrial mitigation but concentrates the sector’s resilience on the power system, which itself is stressed by climate: heatwaves cut thermal-plant output and transmission capacity, droughts cut hydro and cooling, and demand for cooling peaks at the same time. Deep electrification is only a robust strategy if paired with a climate-resilient, flexible grid.',
    implication:
      'The report’s "plan and operate the energy system as a whole" gap is also an adaptation gap; industrial electrification and grid climate-proofing are one problem.',
    references: [
      {
        cite: 'van Vliet, M.T.H. et al. (2016) "Power-generation system vulnerability and adaptation to changes in climate and water resources", Nature Climate Change 6:375–380.',
        url: 'https://doi.org/10.1038/nclimate2903',
      },
      AR6_WG3,
    ],
  },
  {
    id: 'ind-xc-material-efficiency',
    sector: 'Industry',
    subsector: 'Cross-cutting — circularity & material efficiency',
    kind: 'synergy',
    title: 'Material efficiency lowers emissions and critical-material exposure',
    mitigation: 'Doing more with less material (light-weighting, reuse, longer product life).',
    adaptation:
      'Reduced exposure to climate- and geopolitics-disrupted primary-material and critical-raw-material supply chains.',
    mechanism:
      'Cutting primary material throughput reduces both embodied emissions and the volume of vulnerable imports the EU must secure, so material efficiency doubles as a supply-security/resilience measure. This is the same logic the report applies when it criticises the recycling-only focus of the first Circular Economy Action Plan.',
    implication:
      'Material-efficiency mandates (Ecodesign for circularity, product-lifetime rules) should be credited for their resilience value, not only their tonnes of CO₂.',
    references: [
      {
        cite: 'IEA (2021) "The Role of Critical Minerals in Clean Energy Transitions".',
        url: 'https://www.iea.org/reports/the-role-of-critical-minerals-in-clean-energy-transitions',
      },
      AR6_WG3,
    ],
  },

  // ─────────────────────────────── TRANSPORT ───────────────────────────────
  // Road passenger
  {
    id: 'tr-cars-activetravel',
    sector: 'Transport',
    subsector: 'Road passenger (cars & vans)',
    kind: 'synergy',
    title: 'Modal shift to active/public travel is also a health-resilience gain',
    mitigation: 'Shifting car trips to walking, cycling and public transport in compact cities.',
    adaptation:
      'Lower exposure to air pollution and heat, and reduced pressure on infrastructure.',
    mechanism:
      'Avoiding car kilometres cuts CO₂ while the accompanying urban form — compactness, green corridors, shade — reduces heat exposure and pollution and builds the classic mitigation–adaptation co-benefit documented for cities. Street trees and shading that make walking/cycling viable in heat are adaptation and mitigation at once.',
    implication:
      'Demand-moderation and modal-shift measures (which the report flags as under-used in EU strategy) should be evaluated for their heat- and health-resilience co-benefits.',
    references: [SHARIFI_SYN, AR6_WG2],
  },
  {
    id: 'tr-cars-ev-heat',
    sector: 'Transport',
    subsector: 'Road passenger (cars & vans)',
    kind: 'trade-off',
    title: 'EV batteries, charging and minerals are climate-exposed',
    mitigation: 'Battery-electric vehicles and charging infrastructure.',
    adaptation:
      'Battery performance and charging reliability under extreme heat and flooding; mineral supply-chain exposure.',
    mechanism:
      'The battery supply chain, not the vehicle, is where the cited evidence sits. Lithium, cobalt, copper and rare earths are concentrated in climate-exposed places — around 80 % of Chilean copper comes from arid, water-stressed areas, and the 2022 Sichuan drought cut lithium output by roughly 1 200 t — so a fleet-wide switch to EVs deepens EU exposure to climate-driven supply shocks on top of an already concentrated market (~98 % rare-earth dependence on China). NOTE: an earlier version of this entry also claimed extreme heat degrades battery range and lifetime and floods kerbside chargers; neither cited source supports that (the full EUCRA text does not mention charging at all), so it has been removed pending a source.',
    implication:
      'Charging-network and battery standards should include thermal/flood resilience, and vehicle-efficiency incentives (the report’s ambition gap) also cut mineral exposure.',
    references: [
      EUCRA,
      {
        cite: 'IEA (2021) "The Role of Critical Minerals in Clean Energy Transitions".',
        url: 'https://www.iea.org/reports/the-role-of-critical-minerals-in-clean-energy-transitions',
      },
    ],
  },
  {
    id: 'tr-cars-v2g-flex',
    sector: 'Transport',
    subsector: 'Road passenger (cars & vans)',
    kind: 'mixed',
    title: 'EV fleets as distributed storage can back up a climate-stressed grid',
    mitigation:
      'Electrifying cars and vans with smart charging and vehicle-to-grid (V2G) capability.',
    adaptation:
      'Power-system flexibility and reserve capacity during heatwave demand peaks and climate-driven supply shocks.',
    mechanism:
      'A large EV fleet is also a large distributed battery: with smart charging and V2G it can shift load away from heatwave-driven peaks and provide reserve when extremes derate thermal, hydro or network capacity — turning the electrification lever into a resilience resource instead of only an added load. The benefit is conditional on chargers, market rules and aggregation actually enabling bidirectional participation.',
    implication:
      'AFIR roll-out and network codes should enable bidirectional charging and aggregation so the EV fleet contributes to, rather than burdens, system adequacy in extremes — the flip side of this note’s EV-exposure trade-off.',
    references: [
      {
        cite: 'Kempton, W. & Tomić, J. (2005) "Vehicle-to-grid power implementation: From stabilizing the grid to supporting large-scale renewable energy", Journal of Power Sources 144(1):280–294.',
        url: 'https://doi.org/10.1016/j.jpowsour.2004.12.022',
      },
      AR6_WG3,
    ],
  },
  // Road freight
  {
    id: 'tr-freight-modalshift-rail',
    sector: 'Transport',
    subsector: 'Road freight (heavy-duty)',
    kind: 'mixed',
    title: 'Road→rail freight shift depends on a climate-proofed railway',
    mitigation: 'Shifting freight from heavy trucks to (electrified) rail and inland waterways.',
    adaptation:
      'Resilience of the receiving rail/waterway network to heat, floods and low river levels.',
    mechanism:
      'Modal shift is a core mitigation lever, but the lower-carbon modes it relies on are themselves climate-sensitive: rail to heat-buckling and flooding, inland waterways to droughts. The shift is a durable win only if the target network is adapted; otherwise mitigation gains are eroded by reliability losses during extremes.',
    implication:
      'The report’s modal-shift ambition/implementation gaps (Combined Transport Directive, Rail Freight Corridors, TEN-T) should be read together with TEN-T climate-proofing requirements.',
    references: [
      {
        cite: 'Palin, E.J., Stipanovic Oslakovic, I., Gavin, K. & Quinn, A. (2021) "Implications of climate change for railway infrastructure", WIREs Climate Change 12(5):e728.',
        url: 'https://doi.org/10.1002/wcc.728',
      },
      EUCRA,
    ],
  },
  // Rail
  {
    id: 'tr-rail-heat-buckling',
    sector: 'Transport',
    subsector: 'Rail',
    kind: 'trade-off',
    title: 'The low-carbon rail backbone is itself heat- and flood-vulnerable',
    mitigation: 'Electrified rail as the low-carbon spine of passenger and freight transport.',
    adaptation:
      'Track buckling and speed restrictions in heatwaves; line flooding, scour and landslides.',
    mechanism:
      'Rail is among the lowest-carbon modes, yet steel track buckles and overhead lines sag in extreme heat (forcing speed restrictions), and lines flood or wash out in extreme rain. Rising heatwave frequency in Europe therefore threatens the reliability of the very asset the mitigation strategy leans on — protecting it is a precondition, not an optional add-on.',
    implication:
      'Rail electrification funding should be paired with heat-/flood-proofing (rail stress management, drainage) so adaptation protects the mitigation investment.',
    references: [
      {
        cite: 'Dobney, K., Baker, C.J., Quinn, A.D. & Chapman, L. (2009) "Quantifying the effects of high summer temperatures due to climate change on buckling and rail related delays in south-east United Kingdom", Meteorological Applications 16(2):245–251.',
        url: 'https://doi.org/10.1002/met.114',
      },
      {
        cite: 'Palin, E.J., Stipanovic Oslakovic, I., Gavin, K. & Quinn, A. (2021) "Implications of climate change for railway infrastructure", WIREs Climate Change 12(5):e728.',
        url: 'https://doi.org/10.1002/wcc.728',
      },
      EUCRA,
    ],
  },
  // Aviation
  {
    id: 'tr-aviation-saf-land',
    sector: 'Transport',
    subsector: 'Aviation',
    kind: 'trade-off',
    title: 'Biomass-based SAF competes with land, water and food resilience',
    mitigation: 'Sustainable aviation fuels (SAF) mandated under ReFuelEU Aviation.',
    adaptation:
      'Land/water competition and food-system resilience under climate stress.',
    mechanism:
      'ReFuelEU Aviation (Art. 4(5)) excludes food- and feed-crop biofuels from the SAF mandate, but the eligible biomass pathways (RED Annex IX feedstocks, incl. certain intermediate crops added by Delegated Directive 2024/1405) still draw on a finite biomass, land and water base — the biofuel indirect-effects concern the report raises — so scaling them can erode food- and ecosystem resilience in a drying climate. The trade-off is smallest for genuine wastes/residues; synthetic e-SAF instead shifts the pressure onto renewable electricity and water.',
    implication:
      'SAF sub-targets should steer hard toward genuine residues and e-fuels; the report’s biofuel ambition/implementation gaps apply directly here.',
    references: [
      AR6_WG3,
      {
        cite: 'Staples, M.D. et al. (2018) "Aviation CO₂ emissions reductions from the use of alternative jet fuels", Energy Policy 114:342–354.',
        url: 'https://doi.org/10.1016/j.enpol.2017.12.007',
      },
    ],
  },
  {
    id: 'tr-aviation-heat-airports',
    sector: 'Transport',
    subsector: 'Aviation',
    kind: 'trade-off',
    title: 'Heat cuts aircraft payload; coastal airports face rising seas',
    mitigation: 'Efficiency and demand moderation in aviation.',
    adaptation:
      'Higher temperatures reduce lift/payload; low-lying airports face sea-level rise and surge.',
    mechanism:
      'Higher air temperature lowers air density, so a fully loaded aircraft needs more runway or must shed payload — Coffel et al. find 10–30 % of departures at the daily maximum temperature weight-restricted, shedding 0.5–4 % of payload and fuel on average. The effect is strongly site-specific and bites hardest at hot, high-elevation or short-runway airports (LaGuardia ~50 % of departures, Dubai ~55 %); the same study names London Heathrow and Paris Charles de Gaulle among the airports MINIMALLY affected, so the European exposure runs mainly through coastal siting rather than heat. On that, EUCRA is explicit: airports and harbours in low-elevation coastal areas are at risk from sea-level rise. Efficiency losses act against the sector\'s mitigation effort at exactly the times demand peaks.',
    implication:
      'Airport adaptation planning belongs alongside aviation decarbonisation and the report’s call to close the extra-EU ETS exemption.',
    references: [
      {
        cite: 'Coffel, E. & Horton, R. (2015) "Climate Change and the Impact of Extreme Temperatures on Aviation", Weather, Climate, and Society 7(1):94–102.',
        url: 'https://doi.org/10.1175/WCAS-D-14-00026.1',
      },
      {
        cite: 'Coffel, E.D., Thompson, T.R. & Horton, R.M. (2017) "The impacts of rising temperatures on aircraft takeoff performance", Climatic Change 144:381–388.',
        url: 'https://doi.org/10.1007/s10584-017-2018-9',
      },
      EUCRA,
    ],
  },
  // Maritime & inland waterways
  {
    id: 'tr-maritime-ports-exposed',
    sector: 'Transport',
    subsector: 'Maritime & inland waterways',
    kind: 'trade-off',
    title: 'Green-fuel bunkering is being built at the most sea-exposed nodes',
    mitigation: 'Alternative marine fuels (e-ammonia, e-methanol) and shore-side electricity at ports.',
    adaptation:
      'Ports’ acute exposure to sea-level rise, storm surge and extreme waves.',
    mechanism:
      'The fuel-bunkering, shore-power and hydrogen/ammonia infrastructure needed to decarbonise shipping is concentrated in ports — precisely the assets most exposed to sea-level rise and storm surge. New low-carbon port infrastructure that is not designed for those hazards risks being stranded or damaged, undercutting the mitigation investment.',
    implication:
      'FuelEU Maritime / AFIR port-infrastructure roll-out should be conditioned on climate-proofing of the port itself.',
    references: [
      {
        cite: 'Izaguirre, C., Losada, I.J., Camus, P., Vigh, J.L. & Stenek, V. (2021) "Climate change risk to global port operations", Nature Climate Change 11:14–20.',
        url: 'https://doi.org/10.1038/s41558-020-00937-z',
      },
      EUCRA,
      AR6_WG2,
    ],
  },
  {
    id: 'tr-iww-lowflow',
    sector: 'Transport',
    subsector: 'Maritime & inland waterways',
    kind: 'trade-off',
    title: 'Droughts strand the low-carbon inland-waterway option',
    mitigation: 'Shifting freight to inland waterways (a low-carbon mode).',
    adaptation: 'Falling and more variable river levels in droughts (e.g. Rhine 2018, 2022).',
    mechanism:
      'Inland shipping is low-carbon per tonne-km but directly hostage to river hydrology: the 2018 and 2022 Rhine low-water episodes forced barges to sail part-loaded (at a 78 cm gauge at Kaub, roughly four times as many vessels are needed as at 250 cm). Crucially, the loss is NOT absorbed by other modes — Ademmer et al. find no evidence of a substantial shift to road or rail, so the disruption propagates into industrial output: about 0.034 % lower German industrial production per low-water day, ~1 % in a month with 30 such days, peaking at −1.5 % (≈ −0.4 % of GDP) in November 2018. Climate change degrades the reliability of the very mode the mitigation strategy wants to grow, and the alternatives do not take up the slack. (The 2018/2022 episodes are documented by EUCRA; Ademmer et al.’s own sample ends in March 2019.)',
    implication:
      'Modal-shift-to-water targets need a hydrological-risk hedge (fleet design for low draught, redundancy with rail) or they will underperform in dry years.',
    references: [
      {
        cite: 'Ademmer, M., Jannsen, N. & Meuchelböck, S. (2023) "Extreme Weather Events and Economic Activity: The Case of Low Water Levels on the Rhine River", German Economic Review 24(2):121–144.',
        url: 'https://doi.org/10.1515/ger-2022-0077',
      },
      EUCRA,
    ],
  },
  // Cross-cutting transport
  {
    id: 'tr-xc-demand-moderation',
    sector: 'Transport',
    subsector: 'Cross-cutting — demand & modal shift',
    kind: 'synergy',
    title: 'Avoiding travel demand reduces both emissions and exposure',
    mitigation: 'Transport-demand moderation, teleworking and compact settlement patterns.',
    adaptation:
      'Less exposure of people and goods to disrupted, climate-stressed networks.',
    mechanism:
      'Reducing the need to travel cuts emissions and simultaneously reduces the population and freight exposed to network disruptions (heat, floods) — the least infrastructure is also the least vulnerable infrastructure. This is the "avoid" tier of avoid–shift–improve doing double duty.',
    implication:
      'The report’s finding that demand moderation is absent from EU mobility strategy is thus both a mitigation and a resilience gap.',
    references: [AR6_WG3, SHARIFI_SYN],
  },
  {
    id: 'tr-xc-infrastructure-carbon',
    sector: 'Transport',
    subsector: 'Cross-cutting — demand & modal shift',
    kind: 'trade-off',
    title: 'Climate-proofing transport infrastructure has an embodied-carbon cost',
    mitigation: 'Keeping transport-infrastructure embodied emissions down.',
    adaptation:
      'Hardening roads, bridges and drainage against heat and extreme rainfall.',
    mechanism:
      'Adapting transport assets — heavier drainage, reinforced bridges, raised roads, heat-resistant pavements — is material- and cement-intensive, so the adaptation programme pulls against the embodied-carbon side of the mitigation ledger, echoing the cement/adaptation-demand trade-off in the industry chapter.',
    implication:
      'Resilience upgrades should specify low-carbon and nature-based solutions (e.g. sustainable drainage) to blunt the embodied-carbon penalty.',
    references: [SHARIFI_TRADE, AR6_WG2],
  },
];

/** Report metadata surfaced in the UI. */
export const SYNERGY_REPORT_META = {
  reportTitle: 'Towards EU climate neutrality: Progress, policy gaps and opportunities',
  reportPublished: 'January 2024',
  reportUrl:
    'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
  /** Date of the last full citation-verification pass over this file. */
  citationsVerifiedOn: '10 July 2026',
};
