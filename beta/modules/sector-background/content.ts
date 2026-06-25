/**
 * Sector Background — curated content for the two sectors Sebastian leads
 * (Industry and Transport) in the ESABCC sector responsibility allocation.
 *
 * This module is a *structured background brief*: for each sector it pulls the
 * report assessment framework (the project-workspace flow chart) and layers on
 *   1. the EU policies that need to be looked into (live from
 *      `src/data/sectoral-policies.ts`),
 *   2. mitigation options (derived from the framework levers), and
 *   3. adaptation options (derived from the beta adaptation layer), plus
 *   4. a hand-curated reading list of influential papers/reports, and
 *   5. notes on how the report methodology (flow charts) can be improved.
 *
 * Items 4 and 5 are the bespoke content held in this file. The reading list was
 * compiled from a deeper, multi-source literature search and is an AI-curated
 * starting point pending final source re-verification by the lead — it is NOT
 * report content; every entry links to the canonical source (DOI landing page
 * or institutional report) so a human can confirm it before it is cited. A
 * handful of DOIs could not be live-resolved from this environment (the egress
 * proxy blocks publisher hosts); those are flagged in the `why` field.
 */

/** Responsibility allocation (from the Board's sector-allocation slide). */
export interface SectorOwnership {
  sector: string;
  lead: string;
  backup: string;
  /** True for the sectors this brief covers (Sebastian's leads). */
  mine: boolean;
}

export const SECTOR_OWNERSHIP: SectorOwnership[] = [
  { sector: 'Energy / energy system', lead: 'Kamila', backup: 'James', mine: false },
  { sector: 'Industry / industrial system', lead: 'Sebastian', backup: 'James', mine: true },
  { sector: 'Buildings / built environment', lead: 'Kamila', backup: 'Mar', mine: false },
  { sector: 'Transport / mobility', lead: 'Sebastian', backup: 'Kamila', mine: true },
  { sector: 'Agriculture / agri-food system', lead: 'Mar', backup: 'Sebastian', mine: false },
  { sector: 'LULUCF + removals / natural system', lead: 'James', backup: 'Mar', mine: false },
];

/** A curated, external reference for the reading list. */
export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  /** Canonical URL (publisher, DOI landing page, or institutional report page). */
  url: string;
  /** What lens it informs: mitigation, adaptation, policy or method. */
  lens: 'mitigation' | 'adaptation' | 'policy' | 'method';
  /** Why it matters for the sector background. */
  why: string;
}

export const INDUSTRY_REFERENCES: Reference[] = [
  {
    id: 'matecon-2019',
    title: 'Industrial Transformation 2050 — Pathways to Net-Zero Emissions from EU Heavy Industry',
    authors: 'Material Economics (commissioned by the European Climate Foundation)',
    year: 2019,
    venue: 'Material Economics / University of Cambridge CISL report',
    url: 'https://materialeconomics.com/node/13',
    lens: 'mitigation',
    why: 'The canonical EU heavy-industry net-zero pathway study (steel, cement, plastics, ammonia). Splits abatement into clean production vs material efficiency & circularity — the same two outcome branches the report framework uses.',
  },
  {
    id: 'matecon-circular-2018',
    title: 'The Circular Economy — a Powerful Force for Climate Mitigation',
    authors: 'Material Economics (with Sitra & the Energy Transitions Commission)',
    year: 2018,
    venue: 'Material Economics report',
    url: 'https://materialeconomics.com/node/14',
    lens: 'mitigation',
    why: 'Landmark quantification of demand-side / circularity abatement (reuse, material efficiency, recycling) for EU heavy industry — the evidence base for the I3 material-circularity lever and the "lower demand" outcome.',
  },
  {
    id: 'rissman-2020',
    title: 'Technologies and policies to decarbonize global industry: Review and assessment of mitigation drivers through 2070',
    authors: 'Rissman, J. et al.',
    year: 2020,
    venue: 'Applied Energy 266, 114848',
    url: 'https://doi.org/10.1016/j.apenergy.2020.114848',
    lens: 'mitigation',
    why: 'The single most-cited synthesis of industrial decarbonisation; maps the full lever set (efficiency, electrification, H2, CCS, material efficiency, recycling) plus enabling policies, mirroring the framework.',
  },
  {
    id: 'bataille-2018',
    title: 'A review of technology and policy deep decarbonization pathway options for making energy-intensive industry production consistent with the Paris Agreement',
    authors: 'Bataille, C. et al.',
    year: 2018,
    venue: 'Journal of Cleaner Production 187, 960–973',
    url: 'https://doi.org/10.1016/j.jclepro.2018.03.107',
    lens: 'mitigation',
    why: 'Foundational review pairing near-commercial low-carbon production routes per sector (steel, cement, chemicals) with policy packages; anchors the "low-carbon production processes" lever.',
  },
  {
    id: 'bataille-2020-wires',
    title: 'Physical and policy pathways to net-zero emissions industry',
    authors: 'Bataille, C.',
    year: 2020,
    venue: 'WIREs Climate Change 11(2), e633',
    url: 'https://doi.org/10.1002/wcc.633',
    lens: 'policy',
    why: 'Accessible review linking physical abatement options to the policy architecture (carbon pricing, CCfD, green procurement, standards) needed to drive them; strong on the enabling-conditions row.',
  },
  {
    id: 'davis-2018',
    title: 'Net-zero emissions energy systems',
    authors: 'Davis, S.J., Lewis, N.S. et al.',
    year: 2018,
    venue: 'Science 360(6396), eaas9793',
    url: 'https://doi.org/10.1126/science.aas9793',
    lens: 'mitigation',
    why: 'Defines the "hard-to-abate" framing (steel and cement among them) and the systemic options and costs for eliminating residual emissions; background for why industry is a distinct challenge.',
  },
  {
    id: 'ipcc-ar6-wg3-ch11',
    title: 'Climate Change 2022: Mitigation of Climate Change — Chapter 11: Industry',
    authors: 'Bashmakov, I.A., Nilsson, L.J., Bataille, C. et al. (IPCC AR6 WGIII)',
    year: 2022,
    venue: 'Cambridge University Press (IPCC AR6 WGIII)',
    url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/',
    lens: 'mitigation',
    why: 'The authoritative assessment of industry mitigation; explicitly elevates material efficiency, circularity and emerging primary processes — closely matching the report’s two-branch framework.',
  },
  {
    id: 'vogl-2018',
    title: 'Assessment of hydrogen direct reduction for fossil-free steelmaking',
    authors: 'Vogl, V., Åhman, M., Nilsson, L.J.',
    year: 2018,
    venue: 'Journal of Cleaner Production 203, 736–745',
    url: 'https://doi.org/10.1016/j.jclepro.2018.08.279',
    lens: 'mitigation',
    why: 'The seminal techno-economic assessment of H2-DRI steel (the HYBRIT route) — the reference for the "new production processes" lever and the link to electrolyser-capacity indicators. (DOI digits worth confirming at source.)',
  },
  {
    id: 'vogl-2021-joule',
    title: 'Phasing out the blast furnace to meet global climate targets',
    authors: 'Vogl, V., Olsson, O., Nykvist, B.',
    year: 2021,
    venue: 'Joule 5(10), 2646–2662',
    url: 'https://doi.org/10.1016/j.joule.2021.09.007',
    lens: 'mitigation',
    why: 'Shows that reinvestment windows in the blast-furnace fleet are the critical decision points for avoiding committed emissions — central to timing and lock-in for the steel transition.',
  },
  {
    id: 'madeddu-2020',
    title: 'The CO2 reduction potential for the European industry via direct electrification of heat supply (power-to-heat)',
    authors: 'Madeddu, S., Ueckerdt, F. et al.',
    year: 2020,
    venue: 'Environmental Research Letters 15(12), 124004',
    url: 'https://doi.org/10.1088/1748-9326/abbd02',
    lens: 'mitigation',
    why: 'Bottom-up EU analysis finding 78% of industrial energy demand is electrifiable with established tech (99% with emerging), while flagging that process emissions need separate abatement — key for the fuel-switch lever.',
  },
  {
    id: 'allwood-2010',
    title: 'Options for achieving a 50% cut in industrial carbon emissions by 2050',
    authors: 'Allwood, J.M., Cullen, J.M., Milford, R.L.',
    year: 2010,
    venue: 'Environmental Science & Technology 44(6), 1888–1894',
    url: 'https://doi.org/10.1021/es902909k',
    lens: 'mitigation',
    why: 'The foundational demand-side / material-efficiency study showing supply-side measures alone are insufficient — the intellectual basis for the material-efficiency and substitution levers.',
  },
  {
    id: 'ahman-2017',
    title: 'Global climate policy and deep decarbonization of energy-intensive industries',
    authors: 'Åhman, M., Nilsson, L.J., Johansson, B.',
    year: 2017,
    venue: 'Climate Policy 17(5), 634–649',
    url: 'https://doi.org/10.1080/14693062.2016.1167009',
    lens: 'policy',
    why: 'Argues why standard carbon pricing is insufficient for industry and motivates lead markets / green procurement — directly relevant to reading CBAM, ETS and NZIA together.',
  },
  {
    id: 'sartor-2019-iddri',
    title: 'Decarbonising basic materials in Europe: How carbon contracts-for-difference could help bring breakthrough technologies to market',
    authors: 'Sartor, O. & Bataille, C.',
    year: 2019,
    venue: 'IDDRI Study No. 06',
    url: 'https://www.iddri.org/en/publications-and-events/study/decarbonising-basic-materials-europe',
    lens: 'policy',
    why: 'The report that put Carbon Contracts for Difference on the EU agenda; addresses the lead-market / finance gap for low-carbon basic materials.',
  },
  {
    id: 'richstein-2022',
    title: 'Carbon Contracts-for-Difference: How to de-risk innovative investments for a low-carbon industry?',
    authors: 'Richstein, J.C. & Neuhoff, K.',
    year: 2022,
    venue: 'iScience 25(8), 104700',
    url: 'https://doi.org/10.1016/j.isci.2022.104700',
    lens: 'policy',
    why: 'Peer-reviewed design and quantification of CCfDs (steel mitigation costs cut by up to 27%) — the academic backbone for the CCfD enabling condition.',
  },
  {
    id: 'stede-2021',
    title: 'Carbon pricing of basic materials: Incentives and risks for the value chain and consumers',
    authors: 'Stede, J., Pauliuk, S., Hardadi, G., Neuhoff, K.',
    year: 2021,
    venue: 'Ecological Economics 189, 107168',
    url: 'https://doi.org/10.1016/j.ecolecon.2021.107168',
    lens: 'policy',
    why: 'Evaluates EU ETS reform options (CBAM design, embodied-carbon charges with free allocation) for leakage, competitiveness and demand-side incentives — core to the CBAM / carbon-pricing enabling condition.',
  },
  {
    id: 'leeson-2017',
    title: 'A techno-economic analysis and systematic review of CCS applied to the iron and steel, cement, oil refining and pulp and paper industries',
    authors: 'Leeson, D., Mac Dowell, N., Shah, N., Petit, C., Fennell, P.S.',
    year: 2017,
    venue: 'International Journal of Greenhouse Gas Control 61, 71–84',
    url: 'https://doi.org/10.1016/j.ijggc.2017.03.020',
    lens: 'mitigation',
    why: 'The standard cross-sector industrial CCS cost/feasibility review (steel, cement, refining, pulp & paper) — the reference for the I7 CCS/CCU lever.',
  },
  {
    id: 'iea-steel-2020',
    title: 'Iron and Steel Technology Roadmap',
    authors: 'International Energy Agency',
    year: 2020,
    venue: 'IEA report',
    url: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
    lens: 'mitigation',
    why: 'Authoritative global steel roadmap quantifying material efficiency (~20% demand-side savings), H2-DRI, electrification and CCUS — used to sanity-check the I4 and I7 indicator trajectories.',
  },
  {
    id: 'iea-cement-2018',
    title: 'Technology Roadmap — Low-Carbon Transition in the Cement Industry',
    authors: 'International Energy Agency & WBCSD/CSI',
    year: 2018,
    venue: 'IEA report',
    url: 'https://www.iea.org/reports/technology-roadmap-low-carbon-transition-in-the-cement-industry',
    lens: 'mitigation',
    why: 'The standard reference for cement abatement levers (clinker substitution, fuel switching, efficiency, CCS) and the dominant role of process emissions, which constrain electrification.',
  },
];

export const TRANSPORT_REFERENCES: Reference[] = [
  {
    id: 'creutzig-2015',
    title: 'Transport: A roadblock to climate change mitigation?',
    authors: 'Creutzig, F. et al.',
    year: 2015,
    venue: 'Science 350(6263), 911–912',
    url: 'https://doi.org/10.1126/science.aac8033',
    lens: 'mitigation',
    why: 'The canonical framing for transport mitigation (Avoid–Shift–Improve) — the exact "reduce demand" vs "efficient fleet" outcome split in the report framework.',
  },
  {
    id: 'creutzig-2018',
    title: 'Towards demand-side solutions for mitigating climate change',
    authors: 'Creutzig, F. et al.',
    year: 2018,
    venue: 'Nature Climate Change 8(4), 268–271',
    url: 'https://doi.org/10.1038/s41558-018-0121-1',
    lens: 'mitigation',
    why: 'Agenda-setting piece on demand-side mitigation; directly supports the "reduce demand for energy-intensive transport" outcome (demand moderation and modal shift).',
  },
  {
    id: 'axsen-2020',
    title: 'Crafting strong, integrated policy mixes for deep CO2 mitigation in road transport',
    authors: 'Axsen, J., Plötz, P., Wolinetz, M.',
    year: 2020,
    venue: 'Nature Climate Change 10, 809–818',
    url: 'https://doi.org/10.1038/s41558-020-0877-y',
    lens: 'policy',
    why: 'Shows why single instruments under-deliver and how to design integrated policy mixes — the basis for reading CO2 standards, AFIR, ETS2 and RED III as a bundle.',
  },
  {
    id: 'milovanoff-2020',
    title: 'Electrification of light-duty vehicle fleet alone will not meet mitigation targets',
    authors: 'Milovanoff, A., Posen, I.D., MacLean, H.L.',
    year: 2020,
    venue: 'Nature Climate Change 10, 1102–1107',
    url: 'https://doi.org/10.1038/s41558-020-00921-7',
    lens: 'mitigation',
    why: 'Quantifies why ZEV uptake (T5) is necessary but not sufficient — demand moderation and modal shift (T2, T3) must carry part of the load. A key caution for any fleet-only narrative.',
  },
  {
    id: 'mattioli-2020',
    title: 'The political economy of car dependence: A systems of provision approach',
    authors: 'Mattioli, G., Roberts, C., Steinberger, J.K., Brown, A.',
    year: 2020,
    venue: 'Energy Research & Social Science 66, 101486',
    url: 'https://doi.org/10.1016/j.erss.2020.101486',
    lens: 'policy',
    why: 'Explains the structural lock-ins behind transport demand — essential background for the demand-moderation and modal-shift levers and the spatial-planning enabling condition.',
  },
  {
    id: 'brand-2021',
    title: 'The climate change mitigation effects of daily active travel in cities',
    authors: 'Brand, C. et al.',
    year: 2021,
    venue: 'Transportation Research Part D 93, 102764',
    url: 'https://doi.org/10.1016/j.trd.2021.102764',
    lens: 'mitigation',
    why: 'Empirical evidence for the mitigation value of modal shift to active travel — supports treating modal shift (T3) as a measurable lever, not a soft aspiration.',
  },
  {
    id: 'gota-2019',
    title: 'Decarbonising transport to achieve Paris Agreement targets',
    authors: 'Gota, S., Huizenga, C., Peet, K., Medimorec, N., Bakker, S.',
    year: 2019,
    venue: 'Energy Efficiency 12(2), 363–386',
    url: 'https://doi.org/10.1007/s12053-018-9671-3',
    lens: 'mitigation',
    why: 'Operationalises the Avoid–Shift–Improve (ASIF) framework against Paris-compatible pathways — the dominant analytical frame for benchmarking the EU framework.',
  },
  {
    id: 'ipcc-ar6-wg3-ch10',
    title: 'Climate Change 2022: Mitigation of Climate Change — Chapter 10: Transport',
    authors: 'Jaramillo, P., Kahn Ribeiro, S., Newman, P. et al. (IPCC AR6 WGIII)',
    year: 2022,
    venue: 'Cambridge University Press (IPCC AR6 WGIII)',
    url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/',
    lens: 'mitigation',
    why: 'The authoritative scientific assessment of transport mitigation options across all modes — the primary anchor for the sector framework.',
  },
  {
    id: 'iea-gevo-2024',
    title: 'Global EV Outlook 2024',
    authors: 'International Energy Agency',
    year: 2024,
    venue: 'IEA report',
    url: 'https://www.iea.org/reports/global-ev-outlook-2024',
    lens: 'mitigation',
    why: 'Authoritative annual data on ZEV uptake and charging — the calibration source for the T5 (ZEV share) and AFIR-linked indicators.',
  },
  {
    id: 'iea-trucks-2017',
    title: 'The Future of Trucks — Implications for Energy and the Environment',
    authors: 'International Energy Agency',
    year: 2017,
    venue: 'IEA report',
    url: 'https://www.iea.org/reports/the-future-of-trucks',
    lens: 'policy',
    why: 'Benchmark assessment of heavy-duty freight efficiency and fuel options — supports the freight efficiency and fuel-switch dimensions of the fleet lever and the HDV CO2 standards.',
  },
  {
    id: 'bieker-2021-icct',
    title: 'A global comparison of the life-cycle GHG emissions of combustion engine and electric passenger cars',
    authors: 'Bieker, G. (ICCT)',
    year: 2021,
    venue: 'International Council on Clean Transportation (white paper)',
    url: 'https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/',
    lens: 'mitigation',
    why: 'Widely cited lifecycle analysis confirming BEVs’ substantial GHG advantage in the EU — evidentiary basis for prioritising ZEV uptake within the fleet lever.',
  },
  {
    id: 'knobloch-2020',
    title: 'Net emission reductions from electric cars and heat pumps in 59 world regions over time',
    authors: 'Knobloch, F. et al.',
    year: 2020,
    venue: 'Nature Sustainability 3(6), 437–447',
    url: 'https://doi.org/10.1038/s41893-020-0488-7',
    lens: 'mitigation',
    why: 'Shows EVs already cut net emissions across nearly all regions including the EU and improve as grids decarbonise — counters "long-tailpipe" objections to fleet electrification.',
  },
  {
    id: 'ueckerdt-2021',
    title: 'Potential and risks of hydrogen-based e-fuels in climate change mitigation',
    authors: 'Ueckerdt, F. et al.',
    year: 2021,
    venue: 'Nature Climate Change 11(5), 384–393',
    url: 'https://doi.org/10.1038/s41558-021-01032-7',
    lens: 'mitigation',
    why: 'Argues e-fuels are scarce and costly and should be reserved for hard-to-electrify modes (aviation, shipping) — critical for prioritising synthetic-fuel switches.',
  },
  {
    id: 'plotz-2022',
    title: 'Hydrogen technology is unlikely to play a major role in sustainable road transport',
    authors: 'Plötz, P.',
    year: 2022,
    venue: 'Nature Electronics 5, 8–10',
    url: 'https://doi.org/10.1038/s41928-021-00706-6',
    lens: 'mitigation',
    why: 'Influential perspective arguing battery-electric, not hydrogen, will dominate road freight and passenger transport — informs fuel-switch prioritisation.',
  },
  {
    id: 'teoh-2022',
    title: 'Targeted Use of Sustainable Aviation Fuel to Maximize Climate Benefits',
    authors: 'Teoh, R. et al.',
    year: 2022,
    venue: 'Environmental Science & Technology 56(23), 17246–17255',
    url: 'https://doi.org/10.1021/acs.est.2c05781',
    lens: 'mitigation',
    why: 'Quantifies how SAF deployment (including non-CO2 contrail effects) maximises aviation climate benefit — supports the ReFuelEU biofuel/synthetic fuel-switch lever for aviation.',
  },
  {
    id: 'korberg-2021',
    title: 'Techno-economic assessment of advanced fuels and propulsion systems in future fossil-free ships',
    authors: 'Korberg, A.D., Brynolf, S., Grahn, M., Skov, I.R.',
    year: 2021,
    venue: 'Renewable and Sustainable Energy Reviews 142, 110861',
    url: 'https://doi.org/10.1016/j.rser.2021.110861',
    lens: 'mitigation',
    why: 'Compares ammonia, methanol, hydrogen and e-fuel options for shipping decarbonisation — key for the FuelEU Maritime fuel-switch lever. (DOI digits worth confirming at source.)',
  },
  {
    id: 'duranton-2011',
    title: 'The Fundamental Law of Road Congestion: Evidence from US Cities',
    authors: 'Duranton, G., Turner, M.A.',
    year: 2011,
    venue: 'American Economic Review 101(6), 2616–2652',
    url: 'https://doi.org/10.1257/aer.101.6.2616',
    lens: 'policy',
    why: 'The classic demonstration of induced demand — new road capacity generates proportional new traffic; foundational for pricing and spatial-planning over road expansion.',
  },
  {
    id: 'moreno-2021',
    title: 'Introducing the "15-Minute City": Sustainability, Resilience and Place Identity in Future Post-Pandemic Cities',
    authors: 'Moreno, C., Allam, Z., Chabaud, D., Gall, C., Pratlong, F.',
    year: 2021,
    venue: 'Smart Cities 4(1), 93–111',
    url: 'https://doi.org/10.3390/smartcities4010006',
    lens: 'policy',
    why: 'Defines the proximity-planning concept now central to EU urban mobility — supports the spatial-planning enabling condition and the Avoid lever (reducing trip distances).',
  },
];

/** Cross-cutting / adaptation references that inform both sectors. */
export const ADAPTATION_REFERENCES: Reference[] = [
  {
    id: 'eucra-2024',
    title: 'European Climate Risk Assessment (EUCRA)',
    authors: 'European Environment Agency',
    year: 2024,
    venue: 'EEA Report 01/2024',
    url: 'https://www.eea.europa.eu/en/analysis/publications/european-climate-risk-assessment',
    lens: 'adaptation',
    why: 'Europe’s flagship risk assessment; its infrastructure and economy/finance risk clusters frame the flooding, heat, drought and sea-level risks to industrial assets, supply chains and transport networks — the basis of the beta adaptation layer.',
  },
  {
    id: 'forzieri-2018',
    title: 'Escalating impacts of climate extremes on critical infrastructures in Europe',
    authors: 'Forzieri, G. et al.',
    year: 2018,
    venue: 'Global Environmental Change 48, 97–107',
    url: 'https://doi.org/10.1016/j.gloenvcha.2017.11.007',
    lens: 'adaptation',
    why: 'The benchmark European study quantifying multi-hazard damage to energy, transport and industrial infrastructure to 2100 (losses up to ~10×) — the evidence base for the resilient-infrastructure adaptation outcomes.',
  },
  {
    id: 'nemry-2012',
    title: 'Impacts of Climate Change on Transport: A focus on road and rail transport infrastructures',
    authors: 'Nemry, F., Demirel, H. (JRC/IPTS)',
    year: 2012,
    venue: 'JRC Scientific and Policy Reports (EUR 25553 EN)',
    url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC72217',
    lens: 'adaptation',
    why: 'The foundational JRC PESETA II analysis of climate impacts on European road and rail and concrete adaptation measures — underpins the transport climate-proofing & maintenance levers.',
  },
  {
    id: 'peseta-iv-2020',
    title: 'Climate change impacts and adaptation in Europe (JRC PESETA IV final report)',
    authors: 'Feyen, L. et al. (eds.), JRC',
    year: 2020,
    venue: 'EUR 30180 EN, Publications Office of the EU',
    url: 'https://joint-research-centre.ec.europa.eu/projects-and-activities/peseta-climate-change-projects/jrc-peseta-iv_en',
    lens: 'adaptation',
    why: 'PESETA IV’s transport chapter quantifies extreme-heat-driven road/rail O&M cost increases across the EU (up to €4.8 bn/yr at 4 °C) — key for transport resilience planning.',
  },
  {
    id: 'ipcc-ar6-wg2-ch13',
    title: 'Climate Change 2022: Impacts, Adaptation and Vulnerability — Chapter 13: Europe',
    authors: 'Bednar-Friedl, B., Biesbroek, R. et al. (IPCC AR6 WGII)',
    year: 2022,
    venue: 'Cambridge University Press, pp. 1817–1927',
    url: 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-13/',
    lens: 'adaptation',
    why: 'The authoritative IPCC assessment of climate risks and adaptation for Europe, covering infrastructure and economic risks (heat, flooding, drought) and the adaptation gap relevant to both sectors.',
  },
  {
    id: 'koks-2019',
    title: 'A global multi-hazard risk analysis of road and railway infrastructure assets',
    authors: 'Koks, E.E., Rozenberg, J., Zorn, C. et al.',
    year: 2019,
    venue: 'Nature Communications 10, 2677',
    url: 'https://doi.org/10.1038/s41467-019-10442-3',
    lens: 'adaptation',
    why: 'First global multi-hazard exposure/risk estimate for road and rail assets, dominated by flooding — a widely cited methodological basis for transport-network resilience prioritisation.',
  },
  {
    id: 'verschuur-2023',
    title: 'Systemic risks from climate-related disruptions at ports',
    authors: 'Verschuur, J., Koks, E.E., Hall, J.W.',
    year: 2023,
    venue: 'Nature Climate Change 13, 804–811',
    url: 'https://doi.org/10.1038/s41558-023-01754-w',
    lens: 'adaptation',
    why: 'Links climate-driven port downtime at 1,300+ ports to global trade flows (~$81 bn trade at risk/yr) — central to maritime, supply-chain and sea-level resilience.',
  },
  {
    id: 'sun-2024',
    title: 'Global supply chains amplify economic costs of future extreme heat risk',
    authors: 'Sun, Y., Zhu, S., Wang, D. et al.',
    year: 2024,
    venue: 'Nature 627, 797–804',
    url: 'https://doi.org/10.1038/s41586-024-07147-z',
    lens: 'adaptation',
    why: 'Demonstrates how extreme heat propagates through supply chains to amplify losses, with manufacturing-heavy economies most exposed — directly relevant to industrial supply-chain resilience.',
  },
  {
    id: 'eu-adapt-strategy-2021',
    title: 'Forging a climate-resilient Europe — the new EU Strategy on Adaptation to Climate Change (COM(2021) 82 final)',
    authors: 'European Commission',
    year: 2021,
    venue: 'Communication COM(2021) 82 final',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0082',
    lens: 'policy',
    why: 'The governing EU adaptation-policy instrument; mandates climate-proofing of infrastructure (incl. TEN-T), resilience standards and risk-transfer measures relevant to industry and transport.',
  },
  {
    id: 'climate-proofing-2021',
    title: 'Technical guidance on the climate proofing of infrastructure in the period 2021–2027 (Commission Notice 2021/C 373/01)',
    authors: 'European Commission',
    year: 2021,
    venue: 'Official Journal of the EU, C 373',
    url: 'https://op.europa.eu/en/publication-detail/-/publication/23a24b21-16d0-11ec-b4fe-01aa75ed71a1',
    lens: 'policy',
    why: 'The operational EU methodology for climate-proofing major infrastructure (including TEN-T transport) — the practical complement to the EU Adaptation Strategy.',
  },
  {
    id: 'eea-transport-adapt-2014',
    title: 'Adaptation of transport to climate change in Europe',
    authors: 'European Environment Agency',
    year: 2014,
    venue: 'EEA Report No 8/2014',
    url: 'https://www.eea.europa.eu/en/analysis/publications/adaptation-of-transport-to-climate',
    lens: 'adaptation',
    why: 'EEA’s dedicated review of transport adaptation across road, rail, ports, aviation and inland waterways — surveys national initiatives and mainstreaming into transport policy.',
  },
  {
    id: 'eea-losses-2025',
    title: 'Economic losses and fatalities from weather- and climate-related extremes in Europe',
    authors: 'European Environment Agency',
    year: 2025,
    venue: 'EEA indicator',
    url: 'https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related',
    lens: 'adaptation',
    why: 'Authoritative European loss accounting (€822 bn, 1980–2024) with a large insurance protection gap (<20% covered) — grounds the economy/finance risk cluster and the case for risk transfer.',
  },
];

/** A structured note on how the report flow-chart methodology can be improved. */
export interface MethodNote {
  id: string;
  title: string;
  /** Which sector(s) it applies to, for filtering/badging. */
  scope: 'industry' | 'transport' | 'both';
  body: string;
  /** Whether the MethodHub already prototypes this (so the lead can point at it). */
  prototyped?: boolean;
}

export const METHOD_NOTES: MethodNote[] = [
  {
    id: 'm-empty-levers',
    title: 'Close the "no indicator" gaps on mitigation levers',
    scope: 'both',
    prototyped: true,
    body: 'Several report levers were drawn without a progress indicator (Industry: product demand reduction, material efficiency, new production processes; Transport: demand reduction outcome, vehicle efficiency). The Enhanced board fills these with provisional β-series (e.g. material consumption per capita, resource productivity, WLTP new-car CO₂). Decision needed: promote the β-series to tracked indicators or accept the levers stay qualitative.',
  },
  {
    id: 'm-adaptation',
    title: 'Add a first-class adaptation & resilience track',
    scope: 'both',
    prototyped: true,
    body: 'The published frameworks are mitigation-only. The beta board grafts an adaptation layer per sector (Industry: water- & climate-resilient production and supply chains; Transport: climate-resilient infrastructure), anchored in EUCRA 2024 and wired to resilience series (economic losses, WEI+, rail-at-risk). This makes mitigation and adaptation equal-weight branches of one sector goal.',
  },
  {
    id: 'm-policy-tags',
    title: 'Tag each node with the EU instrument(s) that act on it',
    scope: 'both',
    prototyped: true,
    body: 'The "Policy Gap Report 2.0" board attaches policy instruments (and flags gaps) to each lever/outcome. For these two sectors that means mapping ETS/CBAM/IED/NZIA/CRMA onto the industry levers and CO₂ standards/AFIR/ETS2/RED III/FuelEU/ReFuelEU onto the transport levers — turning the flow chart into a coherence-analysis surface.',
  },
  {
    id: 'm-scenario',
    title: 'Bind indicators to scenario reporting variables',
    scope: 'both',
    prototyped: true,
    body: 'The "Scenario call" board maps each white-box indicator to an IAMC/ISIMIP reporting variable and the model track that resolves it, with a held cross-scenario corridor for 2030/2050. This lets the framework double as the scenario-submission template and gives every lever a forward corridor, not just a historical series.',
  },
  {
    id: 'm-industry-subsectors',
    title: 'Disaggregate Industry by material value chain',
    scope: 'industry',
    body: 'The single "Industry" framework hides very different abatement logics for steel, cement and chemicals. A useful improvement is a per-material drill-down (each with its own I4 GHG-intensity and I7 project pipeline) so demand-side vs supply-side levers can be weighted by sub-sector — Material Economics (2019) and the IEA steel & cement roadmaps give the structure.',
  },
  {
    id: 'm-transport-asif',
    title: 'Make the Transport framework explicitly Avoid–Shift–Improve',
    scope: 'transport',
    body: 'The report split (reduce demand / efficient fleet) maps onto the established Avoid–Shift–Improve (ASIF) decomposition but does not name it. Re-labelling the outcome rows as Avoid (demand), Shift (modal) and Improve (fleet/fuel) would align the framework with the dominant transport-mitigation literature (Creutzig 2015; Gota 2019) and make the "fleet-alone-is-not-enough" caution (Milovanoff 2020) legible.',
  },
];
