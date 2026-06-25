// ---------------------------------------------------------------------------
// Generate the Sector Background readings seed migration.
//
// Emits supabase/migrations/073_sector_background_readings_seed.sql, which
// seeds the live database so the Industry & Transport reading lists from the
// "Sector Background" beta module show up:
//   1. in the Reference Manager (custom_references) — with DOI;
//   2. in the "Policy Gap" project workspace corpus (content_analysis_corpus);
//   3. each tagged with its chapter (sector) tag — Industry or Transport —
//      in content_analysis_overall_tags (the same store the workbench uses).
//
// The chapter code ids must match the seeded catalog in
// src/lib/content-analysis/chapter-tags.ts exactly (chapter:<color>:<name>).
//
//   node scripts/seed-sector-background-readings.mjs
//
// The migration is idempotent (ON CONFLICT upserts), so it is safe to re-run
// and safe to re-apply over an already-seeded database.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'supabase', 'migrations', '073_sector_background_readings_seed.sql');

const PROJECT_ID = 'policy-gap-2-0'; // the "Policy Gap 2.0" project workspace id (src/data/project-workspace.ts)
const CHAPTER_INDUSTRY = 'chapter:#9C3B3B:Industry';
const CHAPTER_TRANSPORT = 'chapter:#3D6E8C:Transport';

// id, authors, year, title, venue, url, type, chapter
// `type` is the reference-library type; `chapter` is 'industry' | 'transport'.
const READINGS = [
  // ── Industry ────────────────────────────────────────────────────────────
  ['sbg-matecon-2019', 'Material Economics', '2019', 'Industrial Transformation 2050 — Pathways to Net-Zero Emissions from EU Heavy Industry', 'Material Economics / University of Cambridge CISL report', 'https://materialeconomics.com/node/13', 'report', 'industry'],
  ['sbg-matecon-circular-2018', 'Material Economics', '2018', 'The Circular Economy — a Powerful Force for Climate Mitigation', 'Material Economics report', 'https://materialeconomics.com/node/14', 'report', 'industry'],
  ['sbg-rissman-2020', 'Rissman, J., et al.', '2020', 'Technologies and policies to decarbonize global industry: Review and assessment of mitigation drivers through 2070', 'Applied Energy 266, 114848', 'https://doi.org/10.1016/j.apenergy.2020.114848', 'article', 'industry'],
  ['sbg-bataille-2018', 'Bataille, C., et al.', '2018', 'A review of technology and policy deep decarbonization pathway options for making energy-intensive industry production consistent with the Paris Agreement', 'Journal of Cleaner Production 187, 960–973', 'https://doi.org/10.1016/j.jclepro.2018.03.107', 'article', 'industry'],
  ['sbg-bataille-2020-wires', 'Bataille, C.', '2020', 'Physical and policy pathways to net-zero emissions industry', 'WIREs Climate Change 11(2), e633', 'https://doi.org/10.1002/wcc.633', 'article', 'industry'],
  ['sbg-davis-2018', 'Davis, S. J., Lewis, N. S., et al.', '2018', 'Net-zero emissions energy systems', 'Science 360(6396), eaas9793', 'https://doi.org/10.1126/science.aas9793', 'article', 'industry'],
  ['sbg-ipcc-ar6-wg3-ch11', 'Bashmakov, I. A., Nilsson, L. J., Bataille, C., et al. (IPCC AR6 WGIII)', '2022', 'Climate Change 2022: Mitigation of Climate Change — Chapter 11: Industry', 'Cambridge University Press (IPCC AR6 WGIII)', 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/', 'chapter', 'industry'],
  ['sbg-vogl-2018', 'Vogl, V., Åhman, M., Nilsson, L. J.', '2018', 'Assessment of hydrogen direct reduction for fossil-free steelmaking', 'Journal of Cleaner Production 203, 736–745', 'https://doi.org/10.1016/j.jclepro.2018.08.279', 'article', 'industry'],
  ['sbg-vogl-2021-joule', 'Vogl, V., Olsson, O., Nykvist, B.', '2021', 'Phasing out the blast furnace to meet global climate targets', 'Joule 5(10), 2646–2662', 'https://doi.org/10.1016/j.joule.2021.09.007', 'article', 'industry'],
  ['sbg-madeddu-2020', 'Madeddu, S., Ueckerdt, F., et al.', '2020', 'The CO2 reduction potential for the European industry via direct electrification of heat supply (power-to-heat)', 'Environmental Research Letters 15(12), 124004', 'https://doi.org/10.1088/1748-9326/abbd02', 'article', 'industry'],
  ['sbg-allwood-2010', 'Allwood, J. M., Cullen, J. M., Milford, R. L.', '2010', 'Options for achieving a 50% cut in industrial carbon emissions by 2050', 'Environmental Science & Technology 44(6), 1888–1894', 'https://doi.org/10.1021/es902909k', 'article', 'industry'],
  ['sbg-ahman-2017', 'Åhman, M., Nilsson, L. J., Johansson, B.', '2017', 'Global climate policy and deep decarbonization of energy-intensive industries', 'Climate Policy 17(5), 634–649', 'https://doi.org/10.1080/14693062.2016.1167009', 'article', 'industry'],
  ['sbg-sartor-2019-iddri', 'Sartor, O., Bataille, C.', '2019', 'Decarbonising basic materials in Europe: How carbon contracts-for-difference could help bring breakthrough technologies to market', 'IDDRI Study No. 06', 'https://www.iddri.org/en/publications-and-events/study/decarbonising-basic-materials-europe', 'report', 'industry'],
  ['sbg-richstein-2022', 'Richstein, J. C., Neuhoff, K.', '2022', 'Carbon Contracts-for-Difference: How to de-risk innovative investments for a low-carbon industry?', 'iScience 25(8), 104700', 'https://doi.org/10.1016/j.isci.2022.104700', 'article', 'industry'],
  ['sbg-stede-2021', 'Stede, J., Pauliuk, S., Hardadi, G., Neuhoff, K.', '2021', 'Carbon pricing of basic materials: Incentives and risks for the value chain and consumers', 'Ecological Economics 189, 107168', 'https://doi.org/10.1016/j.ecolecon.2021.107168', 'article', 'industry'],
  ['sbg-leeson-2017', 'Leeson, D., Mac Dowell, N., Shah, N., Petit, C., Fennell, P. S.', '2017', 'A techno-economic analysis and systematic review of CCS applied to the iron and steel, cement, oil refining and pulp and paper industries', 'International Journal of Greenhouse Gas Control 61, 71–84', 'https://doi.org/10.1016/j.ijggc.2017.03.020', 'article', 'industry'],
  ['sbg-iea-steel-2020', 'International Energy Agency', '2020', 'Iron and Steel Technology Roadmap', 'IEA report', 'https://www.iea.org/reports/iron-and-steel-technology-roadmap', 'report', 'industry'],
  ['sbg-iea-cement-2018', 'International Energy Agency & WBCSD/CSI', '2018', 'Technology Roadmap — Low-Carbon Transition in the Cement Industry', 'IEA report', 'https://www.iea.org/reports/technology-roadmap-low-carbon-transition-in-the-cement-industry', 'report', 'industry'],

  // ── Transport ───────────────────────────────────────────────────────────
  ['sbg-creutzig-2015', 'Creutzig, F., et al.', '2015', 'Transport: A roadblock to climate change mitigation?', 'Science 350(6263), 911–912', 'https://doi.org/10.1126/science.aac8033', 'article', 'transport'],
  ['sbg-creutzig-2018', 'Creutzig, F., et al.', '2018', 'Towards demand-side solutions for mitigating climate change', 'Nature Climate Change 8(4), 268–271', 'https://doi.org/10.1038/s41558-018-0121-1', 'article', 'transport'],
  ['sbg-axsen-2020', 'Axsen, J., Plötz, P., Wolinetz, M.', '2020', 'Crafting strong, integrated policy mixes for deep CO2 mitigation in road transport', 'Nature Climate Change 10, 809–818', 'https://doi.org/10.1038/s41558-020-0877-y', 'article', 'transport'],
  ['sbg-milovanoff-2020', 'Milovanoff, A., Posen, I. D., MacLean, H. L.', '2020', 'Electrification of light-duty vehicle fleet alone will not meet mitigation targets', 'Nature Climate Change 10, 1102–1107', 'https://doi.org/10.1038/s41558-020-00921-7', 'article', 'transport'],
  ['sbg-mattioli-2020', 'Mattioli, G., Roberts, C., Steinberger, J. K., Brown, A.', '2020', 'The political economy of car dependence: A systems of provision approach', 'Energy Research & Social Science 66, 101486', 'https://doi.org/10.1016/j.erss.2020.101486', 'article', 'transport'],
  ['sbg-brand-2021', 'Brand, C., et al.', '2021', 'The climate change mitigation effects of daily active travel in cities', 'Transportation Research Part D 93, 102764', 'https://doi.org/10.1016/j.trd.2021.102764', 'article', 'transport'],
  ['sbg-gota-2019', 'Gota, S., Huizenga, C., Peet, K., Medimorec, N., Bakker, S.', '2019', 'Decarbonising transport to achieve Paris Agreement targets', 'Energy Efficiency 12(2), 363–386', 'https://doi.org/10.1007/s12053-018-9671-3', 'article', 'transport'],
  ['sbg-ipcc-ar6-wg3-ch10', 'Jaramillo, P., Kahn Ribeiro, S., Newman, P., et al. (IPCC AR6 WGIII)', '2022', 'Climate Change 2022: Mitigation of Climate Change — Chapter 10: Transport', 'Cambridge University Press (IPCC AR6 WGIII)', 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/', 'chapter', 'transport'],
  ['sbg-iea-gevo-2024', 'International Energy Agency', '2024', 'Global EV Outlook 2024', 'IEA report', 'https://www.iea.org/reports/global-ev-outlook-2024', 'report', 'transport'],
  ['sbg-iea-trucks-2017', 'International Energy Agency', '2017', 'The Future of Trucks — Implications for Energy and the Environment', 'IEA report', 'https://www.iea.org/reports/the-future-of-trucks', 'report', 'transport'],
  ['sbg-bieker-2021-icct', 'Bieker, G. (ICCT)', '2021', 'A global comparison of the life-cycle GHG emissions of combustion engine and electric passenger cars', 'International Council on Clean Transportation (white paper)', 'https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/', 'report', 'transport'],
  ['sbg-knobloch-2020', 'Knobloch, F., et al.', '2020', 'Net emission reductions from electric cars and heat pumps in 59 world regions over time', 'Nature Sustainability 3(6), 437–447', 'https://doi.org/10.1038/s41893-020-0488-7', 'article', 'transport'],
  ['sbg-ueckerdt-2021', 'Ueckerdt, F., et al.', '2021', 'Potential and risks of hydrogen-based e-fuels in climate change mitigation', 'Nature Climate Change 11(5), 384–393', 'https://doi.org/10.1038/s41558-021-01032-7', 'article', 'transport'],
  ['sbg-plotz-2022', 'Plötz, P.', '2022', 'Hydrogen technology is unlikely to play a major role in sustainable road transport', 'Nature Electronics 5, 8–10', 'https://doi.org/10.1038/s41928-021-00706-6', 'article', 'transport'],
  ['sbg-teoh-2022', 'Teoh, R., et al.', '2022', 'Targeted Use of Sustainable Aviation Fuel to Maximize Climate Benefits', 'Environmental Science & Technology 56(23), 17246–17255', 'https://doi.org/10.1021/acs.est.2c05781', 'article', 'transport'],
  ['sbg-korberg-2021', 'Korberg, A. D., Brynolf, S., Grahn, M., Skov, I. R.', '2021', 'Techno-economic assessment of advanced fuels and propulsion systems in future fossil-free ships', 'Renewable and Sustainable Energy Reviews 142, 110861', 'https://doi.org/10.1016/j.rser.2021.110861', 'article', 'transport'],
  ['sbg-duranton-2011', 'Duranton, G., Turner, M. A.', '2011', 'The Fundamental Law of Road Congestion: Evidence from US Cities', 'American Economic Review 101(6), 2616–2652', 'https://doi.org/10.1257/aer.101.6.2616', 'article', 'transport'],
  ['sbg-moreno-2021', 'Moreno, C., Allam, Z., Chabaud, D., Gall, C., Pratlong, F.', '2021', 'Introducing the "15-Minute City": Sustainability, Resilience and Place Identity in Future Post-Pandemic Cities', 'Smart Cities 4(1), 93–111', 'https://doi.org/10.3390/smartcities4010006', 'article', 'transport'],

  // ── Cross-cutting adaptation (assigned to the sector each most informs) ───
  ['sbg-eucra-2024', 'European Environment Agency', '2024', 'European Climate Risk Assessment (EUCRA)', 'EEA Report 01/2024', 'https://www.eea.europa.eu/en/analysis/publications/european-climate-risk-assessment', 'report', 'industry'],
  ['sbg-forzieri-2018', 'Forzieri, G., et al.', '2018', 'Escalating impacts of climate extremes on critical infrastructures in Europe', 'Global Environmental Change 48, 97–107', 'https://doi.org/10.1016/j.gloenvcha.2017.11.007', 'article', 'transport'],
  ['sbg-nemry-2012', 'Nemry, F., Demirel, H. (JRC/IPTS)', '2012', 'Impacts of Climate Change on Transport: A focus on road and rail transport infrastructures', 'JRC Scientific and Policy Reports (EUR 25553 EN)', 'https://publications.jrc.ec.europa.eu/repository/handle/JRC72217', 'report', 'transport'],
  ['sbg-peseta-iv-2020', 'Feyen, L., et al. (eds.), JRC', '2020', 'Climate change impacts and adaptation in Europe (JRC PESETA IV final report)', 'EUR 30180 EN, Publications Office of the EU', 'https://joint-research-centre.ec.europa.eu/projects-and-activities/peseta-climate-change-projects/jrc-peseta-iv_en', 'report', 'transport'],
  ['sbg-ipcc-ar6-wg2-ch13', 'Bednar-Friedl, B., Biesbroek, R., et al. (IPCC AR6 WGII)', '2022', 'Climate Change 2022: Impacts, Adaptation and Vulnerability — Chapter 13: Europe', 'Cambridge University Press, pp. 1817–1927', 'https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-13/', 'chapter', 'industry'],
  ['sbg-koks-2019', 'Koks, E. E., Rozenberg, J., Zorn, C., et al.', '2019', 'A global multi-hazard risk analysis of road and railway infrastructure assets', 'Nature Communications 10, 2677', 'https://doi.org/10.1038/s41467-019-10442-3', 'article', 'transport'],
  ['sbg-verschuur-2023', 'Verschuur, J., Koks, E. E., Hall, J. W.', '2023', 'Systemic risks from climate-related disruptions at ports', 'Nature Climate Change 13, 804–811', 'https://doi.org/10.1038/s41558-023-01754-w', 'article', 'transport'],
  ['sbg-sun-2024', 'Sun, Y., Zhu, S., Wang, D., et al.', '2024', 'Global supply chains amplify economic costs of future extreme heat risk', 'Nature 627, 797–804', 'https://doi.org/10.1038/s41586-024-07147-z', 'article', 'industry'],
  ['sbg-eu-adapt-strategy-2021', 'European Commission', '2021', 'Forging a climate-resilient Europe — the new EU Strategy on Adaptation to Climate Change (COM(2021) 82 final)', 'Communication COM(2021) 82 final', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0082', 'legislation', 'transport'],
  ['sbg-climate-proofing-2021', 'European Commission', '2021', 'Technical guidance on the climate proofing of infrastructure in the period 2021–2027 (Commission Notice 2021/C 373/01)', 'Official Journal of the EU, C 373', 'https://op.europa.eu/en/publication-detail/-/publication/23a24b21-16d0-11ec-b4fe-01aa75ed71a1', 'report', 'transport'],
  ['sbg-eea-transport-adapt-2014', 'European Environment Agency', '2014', 'Adaptation of transport to climate change in Europe', 'EEA Report No 8/2014', 'https://www.eea.europa.eu/en/analysis/publications/adaptation-of-transport-to-climate', 'report', 'transport'],
  ['sbg-eea-losses-2025', 'European Environment Agency', '2025', 'Economic losses and fatalities from weather- and climate-related extremes in Europe', 'EEA indicator', 'https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related', 'report', 'industry'],
];

// SQL-escape a string literal (double the single quotes).
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// DOI is the doi.org suffix when the url is a DOI link, else ''.
const doiOf = (url) => (url.startsWith('https://doi.org/') ? url.slice('https://doi.org/'.length) : '');
// A compact title for the corpus list row.
const shortOf = (title) => title.split(/[:—]/)[0].trim().slice(0, 70);

const rows = READINGS.map(([id, authors, year, title, venue, url, type, chapter]) => {
  const doi = doiOf(url);
  const fullCitation =
    `${authors} (${year}). ${title}. ${venue}.` + (doi ? ` DOI: ${doi}.` : '');
  const docId = `ref-doc-${id}`;
  const chapterCode = chapter === 'industry' ? CHAPTER_INDUSTRY : CHAPTER_TRANSPORT;
  const tags = ['Sector Background', chapter === 'industry' ? 'Industry' : 'Transport'];
  const docMeta = {
    id: docId,
    title,
    shortTitle: shortOf(title),
    kind: 'report',
    sourceKind: 'reference',
    referenceType: type,
    referenceAuthors: authors,
    referenceYear: year,
    referenceUrl: url,
  };
  return { id, docId, doi, authors, year, title, venue, url, type, fullCitation, tags, chapterCode, docMeta };
});

const refValues = rows
  .map(
    (r) =>
      `  (${q(r.id)}, ${q(r.doi)}, ${q(r.title)}, ${q(r.authors)}, ${q(r.year)}, ${q(r.venue)}, ${q(r.type)}, ${q(r.url)}, ${q(r.fullCitation)}, 'web', ARRAY[${r.tags.map(q).join(', ')}]::text[])`,
  )
  .join(',\n');

const corpusValues = rows
  .map((r) => `  (${q(PROJECT_ID)}, ${q(r.docId)}, ${q(JSON.stringify(r.docMeta))}::jsonb)`)
  .join(',\n');

const tagValues = rows
  .map((r) => `  (${q(r.docId)}, ${q(r.chapterCode)})`)
  .join(',\n');

const sql = `-- 073_sector_background_readings_seed.sql
-- ---------------------------------------------------------------------------
-- Seed the Sector Background reading lists (Industry & Transport) so they show
-- up in the live app. GENERATED by scripts/seed-sector-background-readings.mjs
-- — edit that script and re-run it, do not hand-edit this file.
--
--   1. custom_references          — the papers in the Reference Manager (DOI).
--   2. content_analysis_corpus    — added to the "Policy Gap 2.0" project workspace.
--   3. content_analysis_overall_tags — each tagged with its chapter (sector)
--      tag, Industry (chapter:#9C3B3B:Industry) or Transport
--      (chapter:#3D6E8C:Transport), matching src/lib/content-analysis/chapter-tags.ts.
--
-- Document ids are ref-doc-<referenceId>, the id space the workbench uses for
-- references. Idempotent: every statement upserts, so re-running is safe.
-- ---------------------------------------------------------------------------

insert into public.custom_references
  (id, doi, title, authors, year, journal, type, url, full_citation, source, tags)
values
${refValues}
on conflict (id) do update set
  doi = excluded.doi,
  title = excluded.title,
  authors = excluded.authors,
  year = excluded.year,
  journal = excluded.journal,
  type = excluded.type,
  url = excluded.url,
  full_citation = excluded.full_citation,
  tags = excluded.tags;

insert into public.content_analysis_corpus (project_id, document_id, doc_meta)
values
${corpusValues}
on conflict (project_id, document_id) do update set
  doc_meta = excluded.doc_meta;

insert into public.content_analysis_overall_tags (document_id, code_id)
values
${tagValues}
on conflict (document_id, code_id) do nothing;
`;

writeFileSync(OUT, sql);
const nInd = rows.filter((r) => r.chapterCode === CHAPTER_INDUSTRY).length;
const nTra = rows.length - nInd;
console.log(`Wrote ${OUT}`);
console.log(`  ${rows.length} readings — ${nInd} Industry, ${nTra} Transport`);
