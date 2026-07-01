/**
 * Industry Project — seed reading list.
 * -------------------------------------
 * The scoping-phase "Review of policy papers" overview the industry team kept
 * in an Excel (source · document · reviewer), transcribed here so the Project
 * Workspace can seed it into the shared reading-responsibility view on first
 * load. Each row becomes a grey/scientific corpus document in the industry
 * project, with its reviewer set as the responsible reader.
 *
 * The list is intentionally broad — it includes sources still marked "to read"
 * (no reviewer yet) so the view is a live overview of who is reading what, not
 * only of what has already been picked up. New literature is added through the
 * view itself (by DOI or from the reference manager) and persists in the DB.
 */

export interface IndustryReadingSeed {
  /** Stable synthetic corpus/document id. */
  id: string;
  /** Publishing organisation / author group (the Excel "Source" column). */
  source: string;
  /** Document title, or the source name when only a source was listed. */
  title: string;
  /** Responsible reader (the Excel "Reviewer" column); empty = unassigned. */
  reader: string;
  /** Source tier — academia reads as scientific literature, the rest as grey. */
  tier: 'grey' | 'scientific';
  /** Link to the document, when the Excel carried one. */
  url?: string;
}

export const INDUSTRY_READING_SEED: IndustryReadingSeed[] = [
  { id: 'reading-ind-01', source: 'The Shift Project', title: 'Décarboner l\'industrie sans la saborder, 2022 + Pour une industrie lourde post-carbone, une nouvelle révolution industrielle, 2017', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-02', source: 'Bruegel', title: 'Several dozens of papers on industrial policy published in past few years (ETS, IIA, Clean Industrial Deal, etc.)', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-03', source: 'Jacques Delors Centre', title: 'Jacques Delors Centre', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-04', source: 'Agora', title: 'Powering Europe\'s industry, 2026 / other', reader: '', tier: 'grey' },
  { id: 'reading-ind-05', source: 'European Climate Neutrality Observatory', title: 'Clean Industrial Transition Monitor + industry chapter/tracker', reader: '', tier: 'grey' },
  { id: 'reading-ind-06', source: 'Dechema', title: 'Dechema', reader: 'Pieter', tier: 'grey', url: 'https://dechema.de/dechema_media/Downloads/Positionspapiere/2026_10+Trilateral+Chemical+Region.pdf' },
  { id: 'reading-ind-07', source: 'IDDRI', title: 'IDDRI', reader: '', tier: 'grey' },
  { id: 'reading-ind-08', source: 'I4CE', title: '(they are considering publishing on investment needs for heavy industry this year - perhaps contact after summer)', reader: '', tier: 'grey' },
  { id: 'reading-ind-09', source: 'Bellona Foundation', title: 'Bellona Foundation', reader: '', tier: 'grey' },
  { id: 'reading-ind-10', source: 'Strategic Perspectives', title: 'Boosting electrification in Europe', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-11', source: 'E3G', title: 'Multiple articles', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-12', source: 'Ecologic Institute', title: 'Ecologic Institute', reader: '', tier: 'grey' },
  { id: 'reading-ind-13', source: 'Oeko-Institut', title: 'Oeko-Institut', reader: '', tier: 'grey' },
  { id: 'reading-ind-14', source: 'CAN-Europe', title: 'CAN-Europe', reader: '', tier: 'grey' },
  { id: 'reading-ind-15', source: 'Material Economics', title: 'Material Economics', reader: '', tier: 'grey' },
  { id: 'reading-ind-16', source: 'Carbon Market Watch', title: 'Carbon Market Watch', reader: '', tier: 'grey' },
  { id: 'reading-ind-17', source: 'Clean Air Task Force', title: 'Clean Air Task Force', reader: '', tier: 'grey' },
  { id: 'reading-ind-18', source: 'WWF', title: 'WWF', reader: '', tier: 'grey' },
  { id: 'reading-ind-19', source: 'EEB', title: 'EEB', reader: '', tier: 'grey' },
  { id: 'reading-ind-20', source: 'IEEP', title: 'IEEP', reader: '', tier: 'grey' },
  { id: 'reading-ind-21', source: 'EMBER', title: 'incl. clean tech', reader: '', tier: 'grey' },
  { id: 'reading-ind-22', source: 'Regulatory Assistance Project', title: 'SOME LIKE IT HOT: MOVING INDUSTRIAL ELECTRIFICATION FROM POTENTIAL TO PRACTICE', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-23', source: 'European Climate Foundation', title: 'European Climate Foundation', reader: '', tier: 'grey' },
  { id: 'reading-ind-24', source: 'Rayner et al.', title: 'Handbook on European Union Climate Change Policy and Politics, 2023', reader: 'Elsa', tier: 'scientific' },
  { id: 'reading-ind-25', source: 'EUI', title: 'See some links on the right columns', reader: '', tier: 'scientific' },
  { id: 'reading-ind-26', source: 'EUI', title: 'Decarbonising manufacturing firms in the European Union’s emissions trading system', reader: '', tier: 'scientific', url: 'https://op.europa.eu/en/publication-detail/-/publication/e0e1d607-1109-11f0-b1a3-01aa75ed71a1/language-en' },
  { id: 'reading-ind-27', source: 'EUI', title: 'State-of-play in international carbon markets 2025', reader: '', tier: 'scientific', url: 'https://cadmus.eui.eu/entities/publication/29f52f6d-6ce0-45dd-9434-f18931ed5c59' },
  { id: 'reading-ind-28', source: 'EUI', title: 'Industrial decarbonization in a fragmented world : carbon pricing with border adjustments using standardized values', reader: '', tier: 'scientific', url: 'https://cadmus.eui.eu/entities/publication/0dc3480d-0382-4a85-a7ea-81b3ee925b94' },
  { id: 'reading-ind-29', source: 'PIK-MCC', title: 'e.g. on steel, ETS', reader: '', tier: 'scientific' },
  { id: 'reading-ind-30', source: 'Wuppertal institute', title: 'several papers, including one on how to make the EU chemical industry both competitive and climate neutral by 2050', reader: 'Pieter', tier: 'scientific' },
  { id: 'reading-ind-31', source: 'Fraunhofer ISI', title: 'Fraunhofer ISI', reader: '', tier: 'scientific' },
  { id: 'reading-ind-32', source: 'Ma et al. 2025', title: 'Climate Resilience and Energy Flexibility in Industrial Systems: A Scoping Review of Concepts, Technologies, Applications, and Policy Links', reader: 'Mar', tier: 'scientific', url: 'https://www.mdpi.com/1996-1073/18/18/4985' },
  { id: 'reading-ind-33', source: 'Ariadne project', title: 'Ariadne project', reader: '', tier: 'scientific' },
  { id: 'reading-ind-34', source: 'Various', title: 'Readings on the evolution of EU industrial policies and policy mix (e.g. state aid, geoeconomic instruments)', reader: 'Ciarán', tier: 'scientific' },
  { id: 'reading-ind-35', source: 'Penasco et al. 2021 (Laura as co-author)', title: 'Systematic review of the outcomes and trade-offs of ten types of decarbonization policy instruments', reader: 'Ciarán', tier: 'scientific' },
  { id: 'reading-ind-36', source: 'Edholm et al. (2026)', title: 'The EU charting its course in a geopolitical world (book). Chapters on industrial policy, trade, climate policies', reader: 'Ciarán', tier: 'scientific' },
  { id: 'reading-ind-37', source: 'Rissman et al.', title: 'Zero-Carbon Industry book', reader: '', tier: 'scientific' },
  { id: 'reading-ind-38', source: 'CIRCOMOD', title: 'Circular economy modelling for climate mitigation group (Edgar, Detlev and Keywan are involved)', reader: '', tier: 'scientific' },
  { id: 'reading-ind-39', source: 'Cefic (chemical industry)', title: 'Carbon managers roadmap', reader: 'Pieter', tier: 'grey' },
  { id: 'reading-ind-40', source: 'Eurofer (steel industry)', title: 'Eurofer (steel industry)', reader: '', tier: 'grey' },
  { id: 'reading-ind-41', source: 'Cement Europe', title: 'Cement Europe', reader: '', tier: 'grey' },
  { id: 'reading-ind-42', source: 'Plastics Europe', title: '2026 report on status of circular plastics', reader: 'Pieter', tier: 'grey' },
  { id: 'reading-ind-43', source: 'European Aluminium', title: 'Position paper on EU Electrification Plan', reader: '', tier: 'grey' },
  { id: 'reading-ind-44', source: 'Bio-based Industries Consortium', title: 'Bio-based Industries Consortium', reader: '', tier: 'grey' },
  { id: 'reading-ind-45', source: 'Multiple actors', title: 'Input to public consultation on IAA and CBAM', reader: '', tier: 'grey' },
  { id: 'reading-ind-46', source: 'EurElectric', title: 'Enhancing industrial competitiveness through electrification', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-47', source: 'FoodDrinksEurope', title: 'Net-zero roadmap', reader: '', tier: 'grey', url: 'https://www.fooddrinkeurope.eu/resource/a-net-zero-pathway-for-the-eu-food-and-drink-sector/' },
  { id: 'reading-ind-48', source: 'TBD', title: 'TBD', reader: '', tier: 'grey' },
  { id: 'reading-ind-49', source: 'Commission', title: 'Strategic dialogues with industry sectors (steel, chemicals, cement), 2025-2026', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-50', source: 'Commission', title: 'ECL-aligned EU sectoral decarbonisation pathways, 2025', reader: '', tier: 'grey' },
  { id: 'reading-ind-51', source: 'Commission', title: 'Sectoral action plans e.g. fertilisers May 2026', reader: '', tier: 'grey' },
  { id: 'reading-ind-52', source: 'Commission', title: 'High-level stakeholder roundtable on the EU ETS review, 2026', reader: '', tier: 'grey' },
  { id: 'reading-ind-53', source: 'Commission', title: '2026 European Semester - Spring Package', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-54', source: 'Commission', title: 'A Quantitative Framework to Assess Sectors along Dimensions Relevant for Industrial Policy', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-55', source: 'Commission', title: 'Clean Industrial Deal State Aid Framework', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-56', source: 'Commission', title: 'RESourceEU Action Plan (December 2025)', reader: 'Kamila', tier: 'grey' },
  { id: 'reading-ind-57', source: 'Commission', title: 'The Net-Zero manufacturing industry landscape across Member States', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-58', source: 'Commission', title: 'Clean Industrial Deal', reader: 'Pieter', tier: 'grey' },
  { id: 'reading-ind-59', source: 'Commission', title: 'Draghi\'s report', reader: '', tier: 'grey' },
  { id: 'reading-ind-60', source: 'Commission', title: 'Letta\'s report', reader: '', tier: 'grey' },
  { id: 'reading-ind-61', source: 'Commission', title: 'Implementation dialogues, including: CCS in climate policy, barriers and enablers', reader: '', tier: 'grey', url: 'https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/implementation-dialogues-0_en' },
  { id: 'reading-ind-62', source: 'JRC', title: 'Industrial decarbonisation sectoral factsheets, 2026 / other', reader: 'Pieter', tier: 'grey' },
  { id: 'reading-ind-63', source: 'JRC', title: 'Capturing the Potential of the Circular Economy Transition in Energy-Intensive Industries', reader: 'Pieter', tier: 'grey' },
  { id: 'reading-ind-64', source: 'JRC', title: 'BREF, INCITE, LIFE', reader: '', tier: 'grey' },
  { id: 'reading-ind-65', source: 'ENVI Committee', title: 'Public hearing on the EU ETS current performance and pathways for the future, 2026', reader: '', tier: 'grey' },
  { id: 'reading-ind-66', source: 'EPRS', title: 'EPRS', reader: '', tier: 'grey' },
  { id: 'reading-ind-67', source: 'Council Analysis and Research Team', title: 'Forward Look 2026 / other', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-68', source: 'EEA', title: 'Past industry publications, recent ones on circular economy, draft industry paper from CCE1', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-69', source: 'European Court of Auditors', title: 'Innovation Fund - High potential, but slow progress and little impact on emissions', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-70', source: 'IPCC', title: 'AR6 Chapter 11 Industry + AR7 industry-related docs', reader: 'Elsa', tier: 'grey' },
  { id: 'reading-ind-71', source: 'SAM', title: 'including recent work on advanced materials', reader: '', tier: 'grey' },
  { id: 'reading-ind-72', source: 'EASAC', title: 'EASAC', reader: '', tier: 'grey' },
  { id: 'reading-ind-73', source: 'Danish council', title: 'Danish council', reader: '', tier: 'grey' },
  { id: 'reading-ind-74', source: 'Swedish council', title: '2023 annual report (second part on synergies and conflicts of climate policy, incl. industrial transition)', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-75', source: 'Finnish council', title: 'Finnish council', reader: '', tier: 'grey' },
  { id: 'reading-ind-76', source: 'Irish council', title: '[fairly limited work on industry - but will check annual report chapters on Buildings, Industry and Waste]', reader: 'Ciarán', tier: 'grey' },
  { id: 'reading-ind-77', source: 'Dutch council', title: 'Dutch council', reader: '', tier: 'grey' },
  { id: 'reading-ind-78', source: 'French council', title: 'French council', reader: '', tier: 'grey' },
  { id: 'reading-ind-79', source: 'German council(s)', title: 'German council(s)', reader: '', tier: 'grey' },
  { id: 'reading-ind-80', source: 'Luxembourgish council', title: 'Luxembourgish council', reader: '', tier: 'grey' },
  { id: 'reading-ind-81', source: 'Estonian council', title: 'Estonian council', reader: '', tier: 'grey' },
  { id: 'reading-ind-82', source: 'Slovenian council', title: 'Slovenian council', reader: '', tier: 'grey' },
  { id: 'reading-ind-83', source: 'Greek council', title: 'Greek council', reader: '', tier: 'grey' },
  { id: 'reading-ind-84', source: 'UK-CCC', title: 'UK-CCC', reader: '', tier: 'grey' },
  { id: 'reading-ind-85', source: 'Sectoral adaptation plans', title: 'several EU countries', reader: '', tier: 'grey' },
  { id: 'reading-ind-86', source: 'OECD', title: 'Pro-competitive Industrial Policy', reader: '', tier: 'grey' },
  { id: 'reading-ind-87', source: 'UNIDO', title: 'Promoting climate resilience in industry', reader: 'Mar', tier: 'grey', url: 'https://www.unido.org/sites/default/files/2015-12/01._UNIDO_Promoting_Climate_Resilient_Industry_0.pdf' },
  { id: 'reading-ind-88', source: 'GRI', title: 'GRI', reader: '', tier: 'grey' },
  { id: 'reading-ind-89', source: 'IEA', title: 'e.g. energy crisis analysis', reader: '', tier: 'grey', url: 'https://www.iea.org/commentaries/the-energy-crisis-creates-even-stronger-impetus-for-eu-electrification' },
];
