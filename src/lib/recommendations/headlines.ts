/**
 * Headline-recommendation mapping for the "by report" and "role matrix" views.
 * ---------------------------------------------------------------------------
 * AI-compiled — pending Secretariat verification.
 *
 * The tracker stores some reports at the level of their detailed
 * sub-recommendations (e.g. the February 2026 adaptation report as 1.1, 1.2 …)
 * and others at the level of their headline recommendations. These views show
 * every report at the headline level. This file says, per report, which
 * headline each stored recommendation belongs to. It is a presentation layer
 * only: the editable tracker, its rows and its uptake events are unchanged.
 *
 * Two kinds of headline:
 *   • `self`    — the stored row already is the headline; it is shown as-is
 *                 with an empty sub-recommendations cell.
 *   • `grouped` — the headline title is quoted from the report (`locator`
 *                 gives the PDF page in `esabcc-reports/`), and the stored rows
 *                 listed in `subIds` are shown as numbered sub-recommendations.
 *
 * For the January 2024 report the 13 key recommendations are `self`
 * headlines, and the 55 chapter recommendations are grouped under one generic
 * headline per chapter ("Detailed recommendations for …"). That generic title
 * is a MethodHub label, not a quotation; chapter membership follows the
 * chapter code in `area` (E1, I2 …), so chapter rows added in the tracker
 * later join their chapter automatically.
 *
 * Page locators are PDF page numbers (the viewer's page index), not the
 * printed folio.
 *
 * Stored rows not named here (e.g. recommendations added in the tracker) are
 * shown as their own headline rows after the mapped ones, so nothing is
 * silently dropped; the only rows left out are those listed, with a reason,
 * in `EXCLUDED`. Seed ids are stable: they are the primary keys of the
 * `pw_recommendations` seed rows.
 *
 * Compiled 2026-10-06 from the report PDFs in `esabcc-reports/`; titles of
 * grouped headlines are verbatim from the cited page (line breaks and PDF
 * hyphenation removed).
 */

export interface HeadlineDef {
  /** Stable key for this headline within its report. */
  key: string;
  /** Present for `self` headlines: the stored row that is the headline. */
  selfId?: string;
  /** Present for `grouped` headlines: the verbatim headline title. */
  title?: string;
  /** Page locator for a quoted title (PDF page in `esabcc-reports/`). */
  locator?: string;
  /** Stored rows shown as sub-recommendations, in report order. */
  subIds?: string[];
  /**
   * January 2024 only: chapter letter whose rows (area "E1 · …") form the
   * sub-recommendations of this generic chapter headline.
   */
  chapter?: string;
}

const self = (id: string): HeadlineDef => ({ key: id, selfId: id });

/** January 2024 chapter letters, in report order, with their chapter names. */
const CHAPTERS_2024: [string, string][] = [
  ['E', 'energy supply'],
  ['I', 'industry'],
  ['T', 'transport'],
  ['B', 'buildings'],
  ['A', 'agriculture and food'],
  ['L', 'LULUCF and adaptation'],
  ['C', 'pricing and removals'],
  ['W', 'fairness and wellbeing'],
  ['F', 'investment and finance'],
  ['G', 'climate governance'],
  ['S', 'labour, skills and just transition'],
];

export const HEADLINES: Record<string, HeadlineDef[]> = {
  // Letter to ACER, 11 Nov 2022, p.1–2: three bulleted key recommendations,
  // stored one-to-one.
  'acer-energy-infrastructure-2022': [
    self('acer-2022-target-compliance'),
    self('acer-2022-resilience-building-blocks'),
    self('acer-2022-transparency-experts'),
  ],

  // Advice on TEN-E scenario guidelines, Nov 2022, p.6: six key
  // recommendations; the tracker stores 16 rows drawn from sub-points 1.1–6.5.
  'scenario-guidelines-2022': [
    {
      key: 'tene-guide-2022-h1',
      title:
        'Scenarios should be adjusted as necessary to remain compatible with EU’s climate and energy targets, and be modelled until at least 2050.',
      locator: 'p. 6',
      subIds: ['tene-guide-2022-target-compliance', 'tene-guide-2022-policy-inputs'],
    },
    {
      key: 'tene-guide-2022-h2',
      title:
        'Scenarios should capture a range of climate neutrality pathways reflecting the varying impacts of key infrastructure development drivers.',
      locator: 'p. 6',
      subIds: [
        'tene-guide-2022-range-pathways',
        'tene-guide-2022-differentiation',
        'tene-guide-2022-benchmarking',
      ],
    },
    {
      key: 'tene-guide-2022-h3',
      title:
        'Scenario development should incorporate future climate projections and their impact on energy infrastructure resilience.',
      locator: 'p. 6',
      subIds: ['tene-guide-2022-climate-projections'],
    },
    {
      key: 'tene-guide-2022-h4',
      title: 'Scenarios should be constructed using an integrated building-block approach …',
      locator: 'p. 6',
      subIds: ['tene-guide-2022-storyline-blocks', 'tene-guide-2022-consistency-of-inputs'],
    },
    {
      key: 'tene-guide-2022-h5',
      title: 'Assumptions should be based on up-to-date, scientifically sound and forward-looking information.',
      locator: 'p. 6',
      subIds: [
        'tene-guide-2022-quality-assumptions',
        'tene-guide-2022-infrastructure-lifetimes',
        'tene-guide-2022-eu-modelling-alignment',
        'tene-guide-2022-uncertainty',
      ],
    },
    {
      key: 'tene-guide-2022-h6',
      title:
        'The process should be more transparent and built on timely consultations of stakeholders and external experts.',
      locator: 'p. 6',
      subIds: [
        'tene-guide-2022-transparency-fair',
        'tene-guide-2022-reporting-content',
        'tene-guide-2022-stakeholder-engagement',
        'tene-guide-2022-independent-experts',
      ],
    },
  ],

  // Initial advice on climate targets, Jan 2023, p.1–2: one key
  // recommendation, followed by "five key areas" the analysis should consider.
  'climate-targets-2023': [
    {
      key: 'climate-targets-2023-h1',
      title:
        'The Advisory Board recommends that the European Commission follow an approach that is systematic, transparent and guided by EU values, when preparing its EU 2040 climate target proposal and accompanying greenhouse gas budget.',
      locator: 'p. 1',
      subIds: [
        'climate-targets-2023-init-context',
        'climate-targets-2023-init-fair-share',
        'climate-targets-2023-init-transformation',
        'climate-targets-2023-init-side-effects',
        'climate-targets-2023-init-value-judgements',
      ],
    },
  ],

  // Energy-crisis advice, Feb 2023, cover letter p.2: eight key
  // recommendations, stored one-to-one. The ninth stored row
  // (energy-crisis-2023-biogas-hydrogen) is measure 5 of the detailed section
  // (p.38) and has no counterpart in the eight, so it is excluded from these
  // views (see EXCLUDED).
  'energy-crisis-2023': [
    self('energy-crisis-2023-root-causes'),
    self('energy-crisis-2023-efficiency'),
    self('energy-crisis-2023-renewables'),
    self('energy-crisis-2023-electrification'),
    self('energy-crisis-2023-vulnerable-consumers'),
    self('energy-crisis-2023-gas-diversification'),
    self('energy-crisis-2023-biomass'),
    self('energy-crisis-2023-coal-oil'),
  ],

  // Energy infrastructure CBA advice, Mar 2023, p.6–9: one block of
  // recommendations on the TYNDP process (stored as one row) and seven
  // numbered CBA recommendations; the tracker stores 12 rows for the seven.
  'decarbonised-energy-infrastructure-2023': [
    self('ei-cba-2023-governance'),
    {
      key: 'ei-cba-2023-h1',
      title: 'Account adequately for all relevant greenhouse gas emissions',
      locator: 'p. 7',
      subIds: ['ei-cba-2023-ghg-accounting', 'ei-cba-2023-cost-of-carbon'],
    },
    {
      key: 'ei-cba-2023-h2',
      title: 'Assess climate adaptation costs, benefits and measures',
      locator: 'p. 7',
      subIds: ['ei-cba-2023-adaptation-costs', 'ei-cba-2023-resilience-benefits'],
    },
    {
      key: 'ei-cba-2023-h3',
      title: 'Apply appropriate scenarios and sensitivities',
      locator: 'p. 7',
      subIds: [
        'ei-cba-2023-scenarios-only-compliant',
        'ei-cba-2023-sensitivity-climate-years',
        'ei-cba-2023-transparency-fair',
      ],
    },
    {
      key: 'ei-cba-2023-h4',
      title: 'Ensure adequately granular net present value assessment',
      locator: 'p. 8',
      subIds: ['ei-cba-2023-npv-bcr-granularity', 'ei-cba-2023-discount-rate'],
    },
    {
      key: 'ei-cba-2023-h5',
      title: 'Consider project implementation feasibility',
      locator: 'p. 8',
      subIds: ['ei-cba-2023-project-feasibility'],
    },
    {
      key: 'ei-cba-2023-h6',
      title: 'Adequately capture renewable energy integration benefits',
      locator: 'p. 8',
      subIds: ['ei-cba-2023-renewables-integration'],
    },
    {
      key: 'ei-cba-2023-h7',
      title: 'Adequately assess multisectoral dynamics to identify the most beneficial solutions',
      locator: 'p. 9',
      subIds: ['ei-cba-2023-sector-coupling'],
    },
  ],

  '2040-target-advice-2023': [self('advice-2023-2040-target')],

  // January 2024: 13 key recommendations, then one generic headline per
  // chapter (see CHAPTERS_2024).
  'towards-eu-climate-neutrality-2024': [
    ...[
      'kr1-necps-implementation',
      'kr2-adopt-pending-greendeal',
      'kr3-renewables-investment-outlook',
      'kr4-phase-out-ff-subsidies',
      'kr5-policy-consistency-climate-neutrality',
      'kr6-strengthen-governance',
      'kr7-ets-fit-for-net-zero',
      'kr8-impact-assessment-just-transition',
      'kr9-agriculture-food-incentives',
      'kr10-target-ccs-hydrogen-bioenergy',
      'kr11-scale-climate-investment',
      'kr12-energy-material-demand-reduction',
      'kr13-expand-ghg-pricing-and-removal-incentives',
    ].map(self),
    ...CHAPTERS_2024.map(([letter, name]) => ({
      key: `towards-2024-chapter-${letter}`,
      title: `Detailed recommendations for ${name}`,
      chapter: letter,
    })),
  ],

  // TEN-E draft scenarios advice, Jun 2024, p.5–7: three key
  // recommendations; the tracker stores 11 rows drawn from their bullets and
  // the chapter findings.
  'ten-e-draft-scenarios-2024': [
    {
      key: 'tene-2024-h1',
      title:
        'The European associations of gas and electricity transmission system operators should improve their draft scenarios to make them more in line with the achievement of the EU climate objectives for 2030 and 2050 and the ‘energy efficiency first’ principle.',
      locator: 'p. 5',
      subIds: [
        'tene-2024-target-alignment',
        'tene-2024-hydrogen-cost-assumptions',
        'tene-2024-res-tech-costs',
        'tene-2024-co2-price',
        'tene-2024-ccs-cost-coverage',
        'tene-2024-methane-blend-biomethane',
        'tene-2024-hydrogen-methane-buildings',
        'tene-2024-pathway-range',
      ],
    },
    {
      key: 'tene-2024-h2',
      title:
        'The European associations of gas and electricity transmission system operators should factor climate risks into their scenarios to enhance the resilience of EU energy infrastructure against the adverse effects of climate change',
      locator: 'p. 7',
      subIds: ['tene-2024-climate-resilience'],
    },
    {
      key: 'tene-2024-h3',
      title: 'The transparency, timeliness and participatory nature of the scenario-building process should be further enhanced',
      locator: 'p. 7',
      subIds: ['tene-2024-transparency-participation', 'tene-2024-fair-process'],
    },
  ],

  // CDR report, Feb 2025: nine recommendations, stored one-to-one.
  'carbon-removals-2025': [
    self('cdr-2025-separate-targets'),
    self('cdr-2025-mrv-quality'),
    self('cdr-2025-land-sink-lulucf'),
    self('cdr-2025-innovation'),
    self('cdr-2025-co2-infrastructure'),
    self('cdr-2025-ets-integration'),
    self('cdr-2025-lulucf-pricing'),
    self('cdr-2025-emitter-responsibility'),
    self('cdr-2025-governance-diplomacy'),
  ],

  // Climate Law advice, Jun 2025: four recommendations, stored one-to-one.
  'climate-law-amendment-2025': [
    self('climate-law-2025-2040-target'),
    self('climate-law-2025-three-targets'),
    self('climate-law-2025-international-action'),
    self('climate-law-2025-adaptation'),
  ],

  // Adaptation report, Feb 2026, p.4: five recommendations; the tracker
  // stores their 17 sub-recommendations (1.1–5.5).
  'adaptation-2026': [
    {
      key: 'adaptation-2026-h1',
      title: 'Mandate and harmonise climate risk assessments',
      locator: 'p. 4',
      subIds: [
        'adaptation-2026-risk-assessment-mandate',
        'adaptation-2026-common-scenarios',
        'adaptation-2026-methodology-standards',
        'adaptation-2026-planning-pathways',
        'adaptation-2026-corporate-disclosure',
      ],
    },
    {
      key: 'adaptation-2026-h2',
      title: 'Adopt a common reference for adaptation planning',
      locator: 'p. 4',
      subIds: ['adaptation-2026-planning-baseline', 'adaptation-2026-stress-test'],
    },
    {
      key: 'adaptation-2026-h3',
      title: 'Set the vision for a climate resilient EU',
      locator: 'p. 4',
      subIds: ['adaptation-2026-vision-targets', 'adaptation-2026-science-participation'],
    },
    {
      key: 'adaptation-2026-h4',
      title: 'Embed fair and just climate resilience in all EU policies and measures',
      locator: 'p. 4',
      subIds: [
        'adaptation-2026-resilience-by-design',
        'adaptation-2026-mel-system',
        'adaptation-2026-fairness',
      ],
    },
    {
      key: 'adaptation-2026-h5',
      title:
        'Mobilise public and private adaptation investment and establish a coherent approach to managing the costs of climate impacts',
      locator: 'p. 4',
      subIds: [
        'adaptation-2026-economic-governance',
        'adaptation-2026-mff',
        'adaptation-2026-private-finance',
        'adaptation-2026-insurance',
        'adaptation-2026-crisis-response',
      ],
    },
  ],

  // Agri-food report, Mar 2026: six recommendations, stored one-to-one.
  'agri-food-2026': [
    self('agri-food-2026-cap-payments'),
    self('agri-food-2026-ag-ets'),
    self('agri-food-2026-transition-support'),
    self('agri-food-2026-adaptation-risk'),
    self('agri-food-2026-food-policy'),
    self('agri-food-2026-finance'),
  ],
};

/**
 * Stored rows left out of these views because they are not headline
 * recommendations and have no headline to sit under. The tracker keeps them.
 * Delete an entry to show the row again.
 */
export const EXCLUDED: Record<string, string> = {
  'energy-crisis-2023-biogas-hydrogen':
    'Measure 5 of the detailed recommendations (PDF p.38) with no counterpart among the eight key ' +
    'recommendations in the cover letter (p.2); not a headline recommendation. [human review 2026-10]',
};

/** Minimal shape of a stored recommendation this module needs. */
export interface StoredRec {
  id: string;
  title: string;
  summary: string;
  area: string;
}

export interface HeadlineRow<R extends StoredRec = StoredRec> {
  key: string;
  title: string;
  /** Present when the headline is itself a stored row. */
  self?: R;
  /** Stored rows shown as sub-recommendations. */
  subs: R[];
  /** True when the title is a quotation from the report. */
  quoted: boolean;
  locator?: string;
}

const chapterOf = (area: string): string | null => {
  const m = /^([A-Z])\d+\s*·/.exec(area);
  return m ? m[1] : null;
};

/**
 * Arrange one report's stored rows into headline rows. Rows in `EXCLUDED` are
 * left out; headlines whose rows are all missing (e.g. deleted in the tracker)
 * are dropped; rows the mapping does not name are appended as their own
 * headline rows.
 */
export function toHeadlineRows<R extends StoredRec>(reportId: string, allRows: R[]): HeadlineRow<R>[] {
  const rows = allRows.filter(r => !(r.id in EXCLUDED));
  const defs = HEADLINES[reportId];
  if (!defs) return rows.map(r => ({ key: r.id, title: r.title, self: r, subs: [], quoted: false }));

  const byId = new Map(rows.map(r => [r.id, r]));
  const used = new Set<string>();
  const out: HeadlineRow<R>[] = [];
  for (const d of defs) {
    if (d.selfId) {
      const r = byId.get(d.selfId);
      if (!r) continue;
      used.add(r.id);
      out.push({ key: d.key, title: r.title, self: r, subs: [], quoted: false });
      continue;
    }
    const subs = d.chapter
      ? rows.filter(r => chapterOf(r.area) === d.chapter)
      : (d.subIds ?? []).map(id => byId.get(id)).filter((r): r is R => !!r);
    if (subs.length === 0) continue;
    subs.forEach(r => used.add(r.id));
    out.push({ key: d.key, title: d.title ?? '', subs, quoted: !d.chapter, locator: d.locator });
  }
  for (const r of rows) {
    if (!used.has(r.id)) out.push({ key: r.id, title: r.title, self: r, subs: [], quoted: false });
  }
  return out;
}
