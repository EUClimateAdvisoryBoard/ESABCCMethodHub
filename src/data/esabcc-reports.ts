/**
 * ESABCC published reports.
 *
 * One entry per report the European Scientific Advisory Board on Climate
 * Change has released. Used by the media-monitoring module to cluster
 * coverage per report so board members can see which of their publications
 * are getting the most traction.
 *
 * The `match_terms` array is the source of truth for clustering: any article
 * whose matched keywords or text contain one of these terms is attributed to
 * the report. Keep the terms specific enough that they
 * don't cross-match ("2040 climate target" is unique; "climate law" is not
 * and shouldn't be used alone).
 */

export type EsabccReportCategory =
  | 'energy-infrastructure'
  | 'climate-targets'
  | 'energy-crisis'
  | 'climate-neutrality'
  | 'carbon-removals'
  | 'climate-law'
  | 'adaptation'
  | 'agri-food';

export interface EsabccReport {
  slug: string;
  title: string;
  short_title: string;
  category: EsabccReportCategory;
  published_on: string; // ISO date
  source_url: string;
  pdf_filename?: string; // file inside /esabcc-reports
  /** Terms used to cluster coverage. Case-insensitive substring match. */
  match_terms: string[];
}

export const ESABCC_REPORTS: EsabccReport[] = [
  {
    slug: 'acer-energy-infrastructure-2022',
    title:
      'Towards a climate-neutral and climate-resilient EU energy infrastructure: recommendations to ACER',
    short_title: 'Recommendations to ACER (energy infrastructure)',
    category: 'energy-infrastructure',
    published_on: '2022-11-14',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/towards-a-climate-neutral-and-climate-resilient-eu-energy-infrastructure-recommendations-to-acer',
    pdf_filename: '20221114-lettertoacer.pdf',
    match_terms: [
      'recommendations to ACER',
      'letter to ACER',
      'ACER scenario',
      'TYNDP scenario',
    ],
  },
  {
    slug: 'scenario-guidelines-2022',
    title: 'Advice on TEN-E scenario guidelines',
    short_title: 'TEN-E scenario guidelines',
    category: 'energy-infrastructure',
    published_on: '2022-11-14',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications',
    pdf_filename: '2022-11-14-adviceontene_scenarioguidelines.pdf',
    match_terms: [
      'TEN-E scenario guidelines',
      'scenario guidelines',
      'advice on TEN-E',
    ],
  },
  {
    slug: 'climate-targets-2023',
    title:
      'Setting climate targets based on scientific evidence and EU values',
    short_title: 'Initial recommendations on climate targets',
    category: 'climate-targets',
    published_on: '2023-01-16',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/setting-climate-targets-based-on-scientific-evidence-and-eu-values-initial-recommendations-to-the-european-commission',
    pdf_filename: 'setting-climate-targets-based-on.pdf',
    match_terms: [
      'setting climate targets',
      'initial recommendations',
      'climate targets based on scientific evidence',
    ],
  },
  {
    slug: 'energy-crisis-2023',
    title:
      'Addressing the energy crisis while delivering on EU’s climate objectives',
    short_title: 'Energy crisis recommendations',
    category: 'energy-crisis',
    published_on: '2023-02-07',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/addressing-the-energy-crisis-while-delivering-on-eus-climate-objectives-recommendations-to-policy-makers',
    pdf_filename:
      '2023-02-07-recommendationspolicyresponsesenergycrisisclimateneutrality.pdf',
    match_terms: [
      'energy crisis',
      'energy crisis recommendations',
      'policy responses energy crisis',
    ],
  },
  {
    slug: 'decarbonised-energy-infrastructure-2023',
    title:
      'Towards a decarbonised and climate-resilient EU energy infrastructure: recommendations on an energy system-wide cost-benefit analysis',
    short_title: 'Cost-benefit analysis (energy infrastructure)',
    category: 'energy-infrastructure',
    published_on: '2023-03-15',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure-recommendations-on-an-energy-system-wide-cost-benefit-analysis',
    pdf_filename:
      '2023-03-15-towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure.pdf',
    match_terms: [
      'cost-benefit analysis',
      'energy system-wide cost-benefit',
      'decarbonised and climate-resilient EU energy infrastructure',
    ],
  },
  {
    slug: '2040-climate-target-2023',
    title:
      'Scientific advice for the determination of an EU-wide 2040 climate target and a greenhouse gas budget for 2030–2050',
    short_title: '2040 climate target',
    category: 'climate-targets',
    published_on: '2023-06-15',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
    pdf_filename:
      'scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target-and-a-greenhouse-gas-budget-for-2030-2050.pdf',
    match_terms: [
      '2040 climate target',
      'EU-wide 2040',
      'greenhouse gas budget',
      '2030-2050 budget',
    ],
  },
  {
    slug: 'eu-climate-neutrality-2024',
    title:
      'Towards EU climate neutrality: progress, policy gaps and opportunities',
    short_title: 'EU climate neutrality progress',
    category: 'climate-neutrality',
    published_on: '2024-01-18',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
    pdf_filename: 'esabcc_report_towards-eu-climate-neutrality.pdf',
    match_terms: [
      'towards EU climate neutrality',
      'progress policy gaps',
      'progress, policy gaps and opportunities',
    ],
  },
  {
    slug: 'ten-e-draft-scenarios-2024',
    title:
      'Towards climate-neutral and resilient energy networks across Europe (advice on draft scenarios under the TEN-E regulation)',
    short_title: 'TEN-E draft scenarios advice',
    category: 'energy-infrastructure',
    published_on: '2024-06-27',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/towards-climate-neutral-and-resilient-energy-networks-across-europe-advice-on-draft-scenarios-under-the-eu-regulation-on-trans-european-energy-networks',
    pdf_filename:
      '20240627advice-on-draft-scenarios-under-ten-e-regulation_for-publication.pdf',
    match_terms: [
      'advice on draft scenarios',
      'TEN-E regulation',
      'trans-European energy networks',
      'resilient energy networks across Europe',
    ],
  },
  {
    slug: 'carbon-removals-2025',
    title:
      'Scaling up carbon dioxide removals: recommendations for navigating opportunities and risks in the EU',
    short_title: 'Scaling up carbon dioxide removals',
    category: 'carbon-removals',
    published_on: '2025-02-21',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu',
    pdf_filename:
      '2025-02-21-scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu.pdf',
    match_terms: [
      'scaling up carbon dioxide removals',
      'carbon dioxide removals',
      'CO2 removals',
      'CDR recommendations',
    ],
  },
  {
    slug: 'climate-law-amendment-2025',
    title: 'Scientific advice for amending the European Climate Law',
    short_title: 'European Climate Law advice',
    category: 'climate-law',
    published_on: '2025-06-02',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications',
    pdf_filename: '20250602_european-climate-law_advice-for-publication.pdf',
    match_terms: [
      'amending the European Climate Law',
      'European Climate Law advice',
      'climate law amendment',
    ],
  },
  {
    slug: 'adaptation-2026',
    title:
      'Strengthening resilience to climate change: recommendations for an effective EU adaptation policy framework',
    short_title: 'EU adaptation policy framework',
    category: 'adaptation',
    published_on: '2026-02-17',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications',
    pdf_filename: '20260217_adaptation-report.pdf',
    match_terms: [
      'EU adaptation policy',
      'adaptation policy framework',
      'strengthening resilience to climate change',
    ],
  },
  {
    slug: 'agri-food-2026',
    title:
      'Climate adaptation and mitigation in the agri-food system: recommendations for coherent EU policies',
    short_title: 'Agri-food system recommendations',
    category: 'agri-food',
    published_on: '2026-03-11',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/climate-adaptation-and-mitigation-in-the-agri-food-system-recommendations-for-coherent-eu-policies',
    pdf_filename: '2026-03-1120260311_eu-agri-food-system-report.pdf',
    match_terms: [
      'agri-food system',
      'agri-food',
      'climate adaptation and mitigation in the agri-food',
    ],
  },
  {
    slug: 'agri-food-technical-annex-2026',
    title: 'Climate adaptation and mitigation in the agri-food system — Technical Annex',
    short_title: 'Agri-food technical annex',
    category: 'agri-food',
    published_on: '2026-03-11',
    source_url:
      'https://climate-advisory-board.europa.eu/reports-and-publications/climate-adaptation-and-mitigation-in-the-agri-food-system-recommendations-for-coherent-eu-policies',
    pdf_filename: '2026-03-11-eu-agri-food-system-report_technical_annex.pdf',
    match_terms: [
      'agri-food technical annex',
      'agri-food system technical annex',
    ],
  },
];

export const ESABCC_REPORT_BY_SLUG: Map<string, EsabccReport> = new Map(
  ESABCC_REPORTS.map((r) => [r.slug, r]),
);

/**
 * Return the slugs of every report whose match-terms appear in the supplied
 * text. Matching is case-insensitive and substring-based so it forgives
 * trailing colons, hyphens, etc.
 */
export function matchReportsInText(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const report of ESABCC_REPORTS) {
    for (const term of report.match_terms) {
      if (lower.includes(term.toLowerCase())) {
        hits.push(report.slug);
        break;
      }
    }
  }
  return hits;
}

/**
 * Match a list of keyword strings (from media_articles.matched_keywords or
 * matched_keywords) against the report match-terms. An
 * article can be attributed to multiple reports.
 */
export function matchReportsFromKeywords(
  keywords: string[] | null | undefined,
): string[] {
  if (!keywords || keywords.length === 0) return [];
  return matchReportsInText(keywords.join(' • '));
}
