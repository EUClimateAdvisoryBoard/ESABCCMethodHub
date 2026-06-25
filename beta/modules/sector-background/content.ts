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
 * Items 4 and 5 are the bespoke content held in this file. The reading list is
 * an AI-curated starting point pending source re-verification by the lead — it
 * is NOT report content; every entry links to the canonical source so a human
 * can confirm it before it is cited.
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
    authors: 'Material Economics (with University of Cambridge IIS & others)',
    year: 2019,
    venue: 'Material Economics report',
    url: 'https://materialeconomics.com/latest/industrial-transformation-2050',
    lens: 'mitigation',
    why: 'Foundational EU heavy-industry net-zero pathway study (steel, cement, plastics, ammonia). Splits the abatement into clean production vs material efficiency & circularity — the same two outcome branches the report framework uses ("lower demand" vs "low-carbon production").',
  },
  {
    id: 'rissman-2020',
    title: 'Technologies and policies to decarbonize global industry: Review and assessment of mitigation drivers through 2070',
    authors: 'Rissman, J. et al.',
    year: 2020,
    venue: 'Applied Energy 266, 114848',
    url: 'https://doi.org/10.1016/j.apenergy.2020.114848',
    lens: 'mitigation',
    why: 'The most-cited systematic review of industrial mitigation options and the policies that drive them; a natural backbone for mapping levers to instruments.',
  },
  {
    id: 'bataille-2018',
    title: 'A review of technology and policy deep decarbonization pathway options for making energy-intensive industry production consistent with the Paris Agreement',
    authors: 'Bataille, C. et al.',
    year: 2018,
    venue: 'Journal of Cleaner Production 187, 960–973',
    url: 'https://doi.org/10.1016/j.jclepro.2018.03.107',
    lens: 'mitigation',
    why: 'Sets out the deep-decarbonisation logic for energy-intensive industry and the policy sequencing (lead markets, carbon contracts, standards) underpinning the enabling-conditions row.',
  },
  {
    id: 'vogl-2018',
    title: 'Assessment of hydrogen direct reduction for fossil-free steelmaking',
    authors: 'Vogl, V., Åhman, M., Nilsson, L.J.',
    year: 2018,
    venue: 'Journal of Cleaner Production 203, 736–745',
    url: 'https://doi.org/10.1016/j.jclepro.2018.08.279',
    lens: 'mitigation',
    why: 'The reference techno-economic assessment of H2-DRI — the headline "new production process" lever for steel and the rationale for linking it to electrolyser-capacity indicators.',
  },
  {
    id: 'ahman-2017',
    title: 'Global climate policy and deep decarbonization of energy-intensive industries',
    authors: 'Åhman, M., Nilsson, L.J., Johansson, B.',
    year: 2017,
    venue: 'Climate Policy 17(5), 634–649',
    url: 'https://doi.org/10.1080/14693062.2016.1167009',
    lens: 'policy',
    why: 'Argues why standard carbon pricing is insufficient for industry and motivates the lead-markets / green-public-procurement enabling conditions — directly relevant to reading CBAM, ETS and NZIA together.',
  },
  {
    id: 'iea-steel-2020',
    title: 'Iron and Steel Technology Roadmap',
    authors: 'International Energy Agency',
    year: 2020,
    venue: 'IEA report',
    url: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
    lens: 'mitigation',
    why: 'Quantitative, sector-detailed roadmap used to sanity-check the GHG-intensity (I4) and low-carbon-project (I7) indicator trajectories.',
  },
  {
    id: 'emf-2019',
    title: 'Completing the Picture: How the Circular Economy Tackles Climate Change',
    authors: 'Ellen MacArthur Foundation & Material Economics',
    year: 2019,
    venue: 'Ellen MacArthur Foundation report',
    url: 'https://www.ellenmacarthurfoundation.org/completing-the-picture',
    lens: 'mitigation',
    why: 'Establishes the emissions value of circularity (the I3 Circular Material Use Rate lever) — the evidence base for treating material circularity as a first-order industrial mitigation lever, not a side benefit.',
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
    why: 'The canonical framing for transport mitigation: demand (avoid), modal shift, efficiency and fuels — the exact "reduce demand" vs "efficient fleet" outcome split in the report framework.',
  },
  {
    id: 'axsen-2020',
    title: 'Crafting strong, integrated policy mixes for deep CO2 mitigation in road transport',
    authors: 'Axsen, J., Plötz, P., Wolinetz, M.',
    year: 2020,
    venue: 'Nature Climate Change 10, 809–818',
    url: 'https://doi.org/10.1038/s41558-020-0877-y',
    lens: 'policy',
    why: 'Shows why single instruments under-deliver and how to design integrated policy mixes — the evidence base for reading CO2 standards, AFIR, ETS2 and RED III as a bundle rather than singly.',
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
    authors: 'Mattioli, G. et al.',
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
    venue: 'Energy Efficiency 12, 363–386',
    url: 'https://doi.org/10.1007/s12053-018-9671-3',
    lens: 'mitigation',
    why: 'Global ASIF-style decomposition of transport decarbonisation; useful for benchmarking the EU framework against the Avoid–Shift–Improve structure.',
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
];

/** Cross-cutting / adaptation references that inform both sectors. */
export const ADAPTATION_REFERENCES: Reference[] = [
  {
    id: 'eucra-2024',
    title: 'European Climate Risk Assessment (EUCRA)',
    authors: 'European Environment Agency',
    year: 2024,
    venue: 'EEA Report 1/2024',
    url: 'https://www.eea.europa.eu/publications/european-climate-risk-assessment',
    lens: 'adaptation',
    why: 'The risk taxonomy (36 risks, 8 "urgent action needed") the beta adaptation layer is built on — it frames each sector\'s adaptation outcomes (infrastructure, economy & finance clusters).',
  },
  {
    id: 'forzieri-2018',
    title: 'Escalating impacts of climate extremes on critical infrastructures in Europe',
    authors: 'Forzieri, G. et al.',
    year: 2018,
    venue: 'Global Environmental Change 48, 97–107',
    url: 'https://doi.org/10.1016/j.gloenvcha.2017.11.007',
    lens: 'adaptation',
    why: 'Quantifies multi-hazard risk to energy, transport and industrial infrastructure to 2100 — the evidence base for the "climate-resilient infrastructure" adaptation outcomes in both sectors.',
  },
  {
    id: 'nemry-2012',
    title: 'Impacts of Climate Change on Transport: A focus on road and rail transport infrastructures',
    authors: 'Nemry, F., Demirel, H.',
    year: 2012,
    venue: 'JRC Scientific and Policy Reports (EUR 25553 EN)',
    url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC72217',
    lens: 'adaptation',
    why: 'The JRC reference assessment for climate-proofing rail and road — directly underpins the transport adaptation levers (climate-proofing & maintenance, flood/heat risk reduction).',
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
    body: 'The single "Industry" framework hides very different abatement logics for steel, cement and chemicals. A useful improvement is a per-material drill-down (each with its own I4 GHG-intensity and I7 project pipeline) so demand-side vs supply-side levers can be weighted by sub-sector — Material Economics (2019) and the IEA steel roadmap give the structure.',
  },
  {
    id: 'm-transport-asif',
    title: 'Make the Transport framework explicitly Avoid–Shift–Improve',
    scope: 'transport',
    body: 'The report split (reduce demand / efficient fleet) maps onto the established Avoid–Shift–Improve (ASIF) decomposition but does not name it. Re-labelling the outcome rows as Avoid (demand), Shift (modal) and Improve (fleet/fuel) would align the framework with the dominant transport-mitigation literature (Creutzig 2015; Gota 2019) and make the "fleet-alone-is-not-enough" caution (Milovanoff 2020) legible.',
  },
];
