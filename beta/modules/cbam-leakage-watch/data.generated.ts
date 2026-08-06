/**
 * CBAM & Leakage Watch (beta module M · 49) — curated data.
 *
 * GENERATED / PROVENANCE
 * ----------------------
 * AI-compiled — pending Secretariat verification. Compile date: 2026-08.
 *
 * What is in this file, and how honest each block is:
 *
 *   1. SCOPE_REGISTER — the CBAM Annex I sectors with CN-chapter
 *      granularity, transcribed from Regulation (EU) 2023/956
 *      (CELEX 32023R0956, consolidated version), Annex I. CN listings are
 *      condensed (heading level, exclusions summarised in prose) — the
 *      Annex itself is the authority, and every row links to it.
 *   2. PHASE_DOWN — the free-allocation phase-down 2026–2034, i.e. the
 *      "CBAM factor" of Article 10a(1a) of Directive 2003/87/EC as
 *      amended by Directive (EU) 2023/959 (CELEX 32023L0959). These are
 *      verbatim percentages from the Directive, not estimates.
 *   3. IMPORT_SERIES — annual import-volume index levels 2019–2025 per
 *      sector. These are ILLUSTRATIVE, AI-compiled levels calibrated to
 *      the orders of magnitude and qualitative shape of public Eurostat
 *      COMEXT reporting (pandemic dip, 2021–22 restock and energy-crisis
 *      spikes, pre-CBAM cement import growth). They are NOT COMEXT
 *      extractions — Eurostat hosts are unreachable from this sandbox —
 *      and must be replaced by a scripted COMEXT pull (workflow-run, per
 *      docs/how-to-access-eurostat-eea-data.md) before any figure is
 *      quoted. No 2026 monthly values are included ANYWHERE in this
 *      file: with months of definitive-regime data, early series are
 *      noisy and revision-prone, and the module renders that refusal as
 *      a designed state rather than inventing numbers.
 *   4. SHUFFLING_EXAMPLE — a fully hypothetical worked example
 *      (Exporters A/B/C) used to explain the resource-shuffling proxy
 *      arithmetic. Deliberately not named countries.
 *   5. DOWNSTREAM_BOUNDARY — CN headings just inside and just outside
 *      Annex I scope (the "screws and cars" boundary). In/out status is
 *      checkable against Annex I; the out-of-scope rows are claims of
 *      ABSENCE from the Annex list.
 *   6. EVENTS — dated ledger of third-country responses. Deterministic
 *      kind vocabulary (EVENT_KINDS below); entries whose date, actor or
 *      instrument could not be confidently pinned to a primary document
 *      from this sandbox carry verification: 'unverified' rather than
 *      being asserted.
 *
 * EUR-Lex, Eurostat and EEA hosts are blocked from this sandbox, so no
 * link in this file has been live-checked; URLs follow the repository's
 * standard citation formats (CELEX links to consolidated versions where
 * provisions are relied on).
 */

export const COMPILE_DATE = '2026-08';
export const DEFINITIVE_REGIME_START = '2026-01-01';

/* ------------------------------------------------------------------ types */

export type SectorKey =
  | 'cement'
  | 'iron-steel'
  | 'aluminium'
  | 'fertilisers'
  | 'electricity'
  | 'hydrogen';

export type ScopeRow = {
  key: SectorKey;
  name: string;
  cnCodes: { code: string; description: string }[];
  /** Exclusions and condensations relative to the full Annex I listing. */
  cnNotes?: string;
  /** Whether indirect (electricity) emissions count towards embedded emissions at the start of the definitive regime. */
  emissionsScope: 'direct only' | 'direct + indirect';
  notes: string;
  source: { label: string; url: string };
};

export type PhaseDownRow = {
  year: number;
  /** CBAM factor, Art. 10a(1a) ETS Directive: share of the free-allocation benchmark still allocated free. */
  freeAllocationPct: number;
  /** 100 − CBAM factor: the share of embedded emissions on which CBAM certificates are due. */
  cbamPhaseInPct: number;
};

export type IndexPoint = { year: number; value: number };

export type SectorImportSeries = {
  key: SectorKey;
  /** Extra-EU import value, order of magnitude only (€ bn/yr, recent years). Illustrative, AI-compiled. */
  indicativeAnnualValueBnEur: number;
  /** Annual import-volume index, 2019 = 100. ILLUSTRATIVE levels — see file header. */
  index: IndexPoint[];
  /** The real-world features the illustrative shape encodes (so a reviewer can check the shape, not just the levels). */
  shapeNote: string;
};

export type ShufflingExporter = {
  name: string;
  /** Import share before / after the mix shift (fractions of 1, must sum to 1 in each column). */
  shareBefore: number;
  shareAfter: number;
  /** Reported embedded intensity of the goods actually shipped to the EU (t CO2e / t product). */
  reportedIntensity: number;
  /** The exporter country's national average production intensity for the same product (t CO2e / t). */
  nationalAvgIntensity: number;
  /** Change in that national average over the comparison window (%). */
  nationalAvgChangePct: number;
};

export type DownstreamRow = {
  cn: string;
  description: string;
  upstreamInput: string;
  inScope: boolean;
  note: string;
};

export const EVENT_KINDS = {
  'eu-milestone': 'EU regime milestone',
  'wto-engagement': 'WTO engagement',
  objection: 'Objection / retaliation statement',
  'pricing-response': 'Carbon-pricing or border-measure adoption abroad',
  'scope-review': 'Scope review / extension work',
} as const;

export type EventKind = keyof typeof EVENT_KINDS;

export type CbamEvent = {
  /** ISO date; precision declared separately so month-known entries are not dressed up as day-known. */
  date: string;
  datePrecision: 'day' | 'month' | 'year';
  actor: string;
  title: string;
  summary: string;
  kind: EventKind;
  /** 'sourced' = pinned to the linked document with confidence; 'unverified' = reported event, details pending verification against a primary document. */
  verification: 'sourced' | 'unverified';
  source: { label: string; url: string };
};

/* --------------------------------------------------- 1 · scope register */

const CBAM_CONSOLIDATED = {
  label: 'Reg. (EU) 2023/956, Annex I (consolidated)',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0956-20230516',
};

export const SCOPE_REGISTER: ScopeRow[] = [
  {
    key: 'cement',
    name: 'Cement',
    cnCodes: [
      { code: '2507 00 80', description: 'Other kaolinic clays (calcined)' },
      { code: '2523 10 00', description: 'Cement clinkers' },
      { code: '2523 21 00 / 2523 29 00', description: 'White and other Portland cement' },
      { code: '2523 30 00', description: 'Aluminous cement' },
      { code: '2523 90 00', description: 'Other hydraulic cements' },
    ],
    emissionsScope: 'direct + indirect',
    notes:
      'Clinker is the emissions-intensive step; trade is regional (freight cost per tonne is high), so import exposure concentrates on Mediterranean and Black Sea suppliers.',
    source: CBAM_CONSOLIDATED,
  },
  {
    key: 'electricity',
    name: 'Electricity',
    cnCodes: [{ code: '2716 00 00', description: 'Electrical energy' }],
    emissionsScope: 'direct + indirect',
    notes:
      'Imported via interconnectors from coupled and non-coupled neighbours; default values based on exporting-country emission factors apply unless actual values are demonstrated (Annex IV).',
    source: CBAM_CONSOLIDATED,
  },
  {
    key: 'fertilisers',
    name: 'Fertilisers',
    cnCodes: [
      { code: '2808 00 00', description: 'Nitric acid; sulphonitric acids' },
      { code: '2814', description: 'Ammonia, anhydrous or in aqueous solution' },
      { code: '2834 21 00', description: 'Nitrates of potassium' },
      { code: '3102', description: 'Mineral or chemical fertilisers, nitrogenous' },
      { code: '3105', description: 'Fertilisers containing two or three of N, P, K' },
    ],
    cnNotes: 'Heading 3105 60 00 (potassic-phosphatic fertilisers, no nitrogen step) is excluded.',
    emissionsScope: 'direct + indirect',
    notes:
      'Embedded emissions dominated by the ammonia (Haber–Bosch) step, so exposure tracks natural-gas price differentials; EU domestic ammonia output was heavily curtailed in 2022.',
    source: CBAM_CONSOLIDATED,
  },
  {
    key: 'iron-steel',
    name: 'Iron & steel',
    cnCodes: [
      { code: '2601 12 00', description: 'Agglomerated iron ores and concentrates (sinter)' },
      { code: 'Chapter 72', description: 'Iron and steel (pig iron, semis, flat and long products…)' },
      { code: '7301 – 7311', description: 'Sheet piling, rails, tubes and pipes, structures, tanks, containers' },
      { code: '7318', description: 'Screws, bolts, nuts and similar articles' },
      { code: '7326', description: 'Other articles of iron or steel' },
    ],
    cnNotes:
      'Chapter 72 exclusions: certain ferro-alloys of heading 7202 and ferrous scrap (7204). Chapter 73 coverage is the enumerated headings only — 7312–7317 and 7319–7325 are outside scope.',
    emissionsScope: 'direct only',
    notes:
      'The largest CBAM category by import value and embedded emissions. Indirect emissions are excluded at the start of the definitive regime, pending the Article 30 review.',
    source: CBAM_CONSOLIDATED,
  },
  {
    key: 'aluminium',
    name: 'Aluminium',
    cnCodes: [
      { code: '7601', description: 'Unwrought aluminium' },
      { code: '7603 – 7608', description: 'Powders, bars and profiles, wire, plates and sheets, foil, tubes' },
      { code: '7609 00 00 – 7614', description: 'Fittings, structures, reservoirs, casks, gas containers, stranded wire' },
      { code: '7616', description: 'Other articles of aluminium' },
    ],
    cnNotes: 'Aluminium scrap (7602) and household articles (7615) are not listed in Annex I.',
    emissionsScope: 'direct only',
    notes:
      'Highly electricity-intensive, yet indirect emissions are excluded at the start of the definitive regime — the sector where that exclusion matters most.',
    source: CBAM_CONSOLIDATED,
  },
  {
    key: 'hydrogen',
    name: 'Hydrogen',
    cnCodes: [{ code: '2804 10 00', description: 'Hydrogen' }],
    emissionsScope: 'direct only',
    notes:
      'Current import volumes are negligible; the heading is in scope for the future hydrogen import market rather than present trade.',
    source: CBAM_CONSOLIDATED,
  },
];

/* --------------------------------------------- 2 · free-allocation phase-down */

/**
 * CBAM factor per Art. 10a(1a) of Directive 2003/87/EC as amended by
 * Directive (EU) 2023/959 (CELEX 02003L0087, consolidated): 100 % until
 * end-2025, then 97.5 / 95 / 90 / 77.5 / 51.5 / 39 / 26.5 / 14 %, and no
 * factor (0 %) from 2034.
 */
export const PHASE_DOWN: PhaseDownRow[] = [
  { year: 2026, freeAllocationPct: 97.5, cbamPhaseInPct: 2.5 },
  { year: 2027, freeAllocationPct: 95, cbamPhaseInPct: 5 },
  { year: 2028, freeAllocationPct: 90, cbamPhaseInPct: 10 },
  { year: 2029, freeAllocationPct: 77.5, cbamPhaseInPct: 22.5 },
  { year: 2030, freeAllocationPct: 51.5, cbamPhaseInPct: 48.5 },
  { year: 2031, freeAllocationPct: 39, cbamPhaseInPct: 61 },
  { year: 2032, freeAllocationPct: 26.5, cbamPhaseInPct: 73.5 },
  { year: 2033, freeAllocationPct: 14, cbamPhaseInPct: 86 },
  { year: 2034, freeAllocationPct: 0, cbamPhaseInPct: 100 },
];

/* ------------------------------------------------- 3 · import index series */

/**
 * ILLUSTRATIVE annual import-volume index (2019 = 100) per CBAM sector.
 * AI-compiled levels calibrated to the qualitative shape and order of
 * magnitude of public COMEXT reporting — NOT extracted data. See file
 * header. Deliberately ends at 2025: the pre-definitive-regime window.
 */
export const IMPORT_SERIES: SectorImportSeries[] = [
  {
    key: 'iron-steel',
    indicativeAnnualValueBnEur: 45,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 82 },
      { year: 2021, value: 108 },
      { year: 2022, value: 112 },
      { year: 2023, value: 94 },
      { year: 2024, value: 97 },
      { year: 2025, value: 101 },
    ],
    shapeNote:
      'Pandemic dip in 2020, restocking boom in 2021–22, normalisation under the steel safeguard quotas thereafter.',
  },
  {
    key: 'aluminium',
    indicativeAnnualValueBnEur: 25,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 90 },
      { year: 2021, value: 107 },
      { year: 2022, value: 114 },
      { year: 2023, value: 96 },
      { year: 2024, value: 99 },
      { year: 2025, value: 103 },
    ],
    shapeNote:
      'Similar cycle to steel, amplified in 2022 by EU smelter curtailments during the electricity-price crisis.',
  },
  {
    key: 'fertilisers',
    indicativeAnnualValueBnEur: 6,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 98 },
      { year: 2021, value: 112 },
      { year: 2022, value: 138 },
      { year: 2023, value: 118 },
      { year: 2024, value: 113 },
      { year: 2025, value: 116 },
    ],
    shapeNote:
      'The 2022 spike encodes the gas-crisis curtailment of EU ammonia production, substituted by imports; partial re-shoring afterwards.',
  },
  {
    key: 'cement',
    indicativeAnnualValueBnEur: 1,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 104 },
      { year: 2021, value: 115 },
      { year: 2022, value: 124 },
      { year: 2023, value: 118 },
      { year: 2024, value: 122 },
      { year: 2025, value: 128 },
    ],
    shapeNote:
      'A rising trend from a small base — growing clinker and cement inflows from Mediterranean and Black Sea suppliers through the transitional period.',
  },
  {
    key: 'electricity',
    indicativeAnnualValueBnEur: 3,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 95 },
      { year: 2021, value: 108 },
      { year: 2022, value: 142 },
      { year: 2023, value: 116 },
      { year: 2024, value: 108 },
      { year: 2025, value: 112 },
    ],
    shapeNote:
      'The 2022 spike encodes the crisis year (French nuclear outages, price-driven flows); interconnector-constrained otherwise.',
  },
  {
    key: 'hydrogen',
    indicativeAnnualValueBnEur: 0.1,
    index: [
      { year: 2019, value: 100 },
      { year: 2020, value: 99 },
      { year: 2021, value: 101 },
      { year: 2022, value: 103 },
      { year: 2023, value: 102 },
      { year: 2024, value: 104 },
      { year: 2025, value: 105 },
    ],
    shapeNote:
      'Essentially flat at negligible absolute volumes — a placeholder heading for a market that does not yet exist at scale.',
  },
];

/* ------------------------------------- 4 · resource-shuffling worked example */

/**
 * HYPOTHETICAL worked example — no real countries, no real shipments.
 * Three exporters of the same steel product; between the two periods the
 * EU import mix shifts towards Exporter C, whose shipments carry a low
 * reported intensity (a single modern plant allocated to EU orders)
 * while its national average intensity does not move.
 */
export const SHUFFLING_EXAMPLE: ShufflingExporter[] = [
  {
    name: 'Exporter A (coal-based BF-BOF fleet)',
    shareBefore: 0.55,
    shareAfter: 0.4,
    reportedIntensity: 2.4,
    nationalAvgIntensity: 2.4,
    nationalAvgChangePct: 0,
  },
  {
    name: 'Exporter B (mixed fleet, EAF-heavy)',
    shareBefore: 0.3,
    shareAfter: 0.3,
    reportedIntensity: 1.4,
    nationalAvgIntensity: 1.5,
    nationalAvgChangePct: 0,
  },
  {
    name: 'Exporter C (one low-intensity plant serving the EU)',
    shareBefore: 0.15,
    shareAfter: 0.3,
    reportedIntensity: 0.7,
    nationalAvgIntensity: 2.2,
    nationalAvgChangePct: 0,
  },
];

/* --------------------------------------------- 5 · downstream boundary rows */

/**
 * The Annex I boundary through the steel and aluminium value chain.
 * In-scope rows are transcribed from Annex I; out-of-scope rows are
 * claims of absence from the Annex I list (checkable against the same
 * consolidated text). Chapter-84/85/87 rows are out of scope as whole
 * chapters — no machinery, vehicle or electrical heading appears in
 * Annex I.
 */
export const DOWNSTREAM_BOUNDARY: DownstreamRow[] = [
  {
    cn: '7318',
    description: 'Screws, bolts, nuts, washers',
    upstreamInput: 'Steel wire rod, bars',
    inScope: true,
    note: 'Added to Annex I in the final act — the legislator saw the fastener loophole coming for this heading.',
  },
  {
    cn: '7326',
    description: 'Other articles of iron or steel',
    upstreamInput: 'Steel semis and products',
    inScope: true,
    note: 'A broad residual heading, in scope.',
  },
  {
    cn: '7610',
    description: 'Aluminium structures and parts',
    upstreamInput: 'Aluminium profiles, sheets',
    inScope: true,
    note: 'Fabricated aluminium structures are in scope.',
  },
  {
    cn: '7317',
    description: 'Nails, tacks, staples',
    upstreamInput: 'Steel wire rod',
    inScope: false,
    note: 'One heading below the screws: the same wire rod escapes CBAM as a nail but not as a screw.',
  },
  {
    cn: '7312',
    description: 'Stranded wire, ropes, cables of steel',
    upstreamInput: 'Steel wire rod',
    inScope: false,
    note: 'Outside the enumerated Chapter 73 headings.',
  },
  {
    cn: '7315',
    description: 'Chain and parts thereof, of steel',
    upstreamInput: 'Steel bars, wire',
    inScope: false,
    note: 'Outside the enumerated Chapter 73 headings.',
  },
  {
    cn: '7320',
    description: 'Springs and leaves for springs, of steel',
    upstreamInput: 'Spring steel',
    inScope: false,
    note: 'Outside the enumerated Chapter 73 headings.',
  },
  {
    cn: '7322',
    description: 'Radiators for central heating',
    upstreamInput: 'Steel sheet',
    inScope: false,
    note: 'Steel-sheet-intensive consumer good, out of scope.',
  },
  {
    cn: '7615',
    description: 'Aluminium table, kitchen and household articles',
    upstreamInput: 'Aluminium sheet',
    inScope: false,
    note: 'Sits between two in-scope aluminium headings (7614 and 7616) yet is not listed.',
  },
  {
    cn: '8302',
    description: 'Base-metal mountings, fittings (builders’ hardware)',
    upstreamInput: 'Steel, aluminium semis',
    inScope: false,
    note: 'Chapter 83 is entirely outside Annex I.',
  },
  {
    cn: '8413 / 8501',
    description: 'Pumps; electric motors and generators',
    upstreamInput: 'Steel, aluminium, copper',
    inScope: false,
    note: 'Machinery and electrical equipment (Chapters 84–85) are entirely outside Annex I.',
  },
  {
    cn: '8544',
    description: 'Insulated wire and cable',
    upstreamInput: 'Aluminium and copper conductor',
    inScope: false,
    note: 'Aluminium conductor pays CBAM as wire (7605), not as insulated cable.',
  },
  {
    cn: '8703 / 8708',
    description: 'Motor cars; parts of motor vehicles',
    upstreamInput: '≈ 1 t steel + aluminium per car',
    inScope: false,
    note: 'The "cars" half of the screws-and-cars gap: a tonne of steel pays CBAM at the border, the same tonne inside a car does not.',
  },
];

/* ------------------------------------------------------- 6 · event ledger */

export const EVENTS: CbamEvent[] = [
  {
    date: '2021-07-14',
    datePrecision: 'day',
    actor: 'European Commission',
    title: 'CBAM proposal tabled (COM(2021) 564 final)',
    summary:
      'Part of the Fit-for-55 package: a carbon border adjustment on cement, iron & steel, aluminium, fertilisers and electricity, coupled to ETS free-allocation phase-out.',
    kind: 'eu-milestone',
    verification: 'sourced',
    source: {
      label: 'COM(2021) 564 final (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021PC0564',
    },
  },
  {
    date: '2021-07-26',
    datePrecision: 'month',
    actor: 'China (Ministry of Ecology and Environment / MOFCOM)',
    title: 'First official Chinese objection to the CBAM proposal',
    summary:
      'Spokespeople characterised CBAM as a unilateral measure that expands climate issues into trade and violates common-but-differentiated-responsibilities principles. Exact briefing date and transcript pending verification.',
    kind: 'objection',
    verification: 'unverified',
    source: {
      label: 'MOFCOM press-briefing archive',
      url: 'http://english.mofcom.gov.cn/',
    },
  },
  {
    date: '2022-11-15',
    datePrecision: 'month',
    actor: 'BASIC group (Brazil, South Africa, India, China)',
    title: 'BASIC ministerial statement at COP27 against carbon border measures',
    summary:
      'The joint ministerial statement expressed grave concern over unilateral trade measures such as carbon border adjustments, calling them discriminatory. Verbatim wording and exact release date pending verification against the ministerial text.',
    kind: 'objection',
    verification: 'unverified',
    source: {
      label: 'UNFCCC COP27 documentation portal',
      url: 'https://unfccc.int/cop27',
    },
  },
  {
    date: '2023-05-16',
    datePrecision: 'day',
    actor: 'European Union',
    title: 'Regulation (EU) 2023/956 published (OJ L 130)',
    summary:
      'The CBAM Regulation enters the statute book; transitional reporting from 1 October 2023, definitive regime from 1 January 2026.',
    kind: 'eu-milestone',
    verification: 'sourced',
    source: CBAM_CONSOLIDATED,
  },
  {
    date: '2023-06-01',
    datePrecision: 'year',
    actor: 'India, China and others at the WTO',
    title: 'CBAM raised repeatedly in WTO committees',
    summary:
      'CBAM placed on the agenda of the Committee on Trade and Environment and the Committee on Market Access on multiple occasions from 2021 onwards; no formal dispute-settlement case had been filed as of the compile date. Individual meeting records pending verification.',
    kind: 'wto-engagement',
    verification: 'unverified',
    source: {
      label: 'WTO Committee on Trade and Environment',
      url: 'https://www.wto.org/english/tratop_e/envir_e/wrk_committee_e.htm',
    },
  },
  {
    date: '2023-10-01',
    datePrecision: 'day',
    actor: 'European Union',
    title: 'CBAM transitional period begins',
    summary:
      'Quarterly embedded-emissions reporting by importers, without financial adjustment — the data foundation for the definitive regime (Art. 32 ff.).',
    kind: 'eu-milestone',
    verification: 'sourced',
    source: CBAM_CONSOLIDATED,
  },
  {
    date: '2023-12-18',
    datePrecision: 'day',
    actor: 'United Kingdom (HM Treasury)',
    title: 'UK announces its own CBAM from 2027',
    summary:
      'The UK government announced a UK carbon border adjustment mechanism, explicitly in the context of the EU CBAM and carbon-leakage risk to UK industry.',
    kind: 'pricing-response',
    verification: 'sourced',
    source: {
      label: 'UK Government — Introduction of a UK CBAM from January 2027 (consultation)',
      url: 'https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism-from-january-2027',
    },
  },
  {
    date: '2024-03-01',
    datePrecision: 'year',
    actor: 'India (Ministry of Commerce and Industry)',
    title: 'Repeated Indian statements on retaliation and mirror measures',
    summary:
      'Ministers publicly described CBAM as discriminatory and stated India would respond, including through its own carbon-tax measures on EU exports and via the EU–India FTA negotiations. Individual statements and dates pending verification against primary records.',
    kind: 'objection',
    verification: 'unverified',
    source: {
      label: 'Press Information Bureau, Government of India',
      url: 'https://pib.gov.in/',
    },
  },
  {
    date: '2024-10-30',
    datePrecision: 'day',
    actor: 'United Kingdom (HM Treasury / HMRC)',
    title: 'UK CBAM design confirmed: 1 January 2027, five sectors',
    summary:
      'The consultation response confirmed a UK CBAM from 1 January 2027 covering aluminium, cement, fertilisers, hydrogen and iron & steel, with glass and ceramics left out of the initial scope.',
    kind: 'pricing-response',
    verification: 'sourced',
    source: {
      label: 'UK Government — UK CBAM consultation response',
      url: 'https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism-from-january-2027',
    },
  },
  {
    date: '2024-12-11',
    datePrecision: 'month',
    actor: 'Brazil',
    title: 'Brazil enacts cap-and-trade law (SBCE)',
    summary:
      'Law No. 15.042/2024 established the Brazilian emissions trading system; preserving export access under carbon border regimes such as CBAM featured prominently in the legislative debate.',
    kind: 'pricing-response',
    verification: 'sourced',
    source: {
      label: 'ICAP ETS map — Brazil',
      url: 'https://icapcarbonaction.com/en/ets',
    },
  },
  {
    date: '2025-02-26',
    datePrecision: 'day',
    actor: 'European Commission',
    title: 'Omnibus I: CBAM simplification proposed',
    summary:
      'A 50-tonne annual de minimis threshold exempting the large majority of importers while keeping the vast bulk of embedded emissions in scope, plus authorisation and declaration simplifications. Final adopted instrument number pending verification.',
    kind: 'scope-review',
    verification: 'unverified',
    source: {
      label: 'European Commission — CBAM policy page',
      url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    },
  },
  {
    date: '2025-03-19',
    datePrecision: 'day',
    actor: 'European Commission',
    title: 'Steel and Metals Action Plan announces downstream extension work',
    summary:
      'The European Steel and Metals Action Plan (COM(2025) 125) announced work to extend CBAM to certain steel- and aluminium-intensive downstream products and to strengthen anti-circumvention provisions — the Commission’s own acknowledgement of the downstream displacement gap.',
    kind: 'scope-review',
    verification: 'sourced',
    source: {
      label: 'European Commission — CBAM policy page (review and extension work)',
      url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    },
  },
  {
    date: '2025-03-26',
    datePrecision: 'month',
    actor: 'China (Ministry of Ecology and Environment)',
    title: 'China expands its national ETS to steel, cement and aluminium',
    summary:
      'The national ETS was extended beyond power generation to the three heavy-industry sectors most exposed to CBAM; alignment with border carbon regimes was part of the public rationale reported at the time.',
    kind: 'pricing-response',
    verification: 'sourced',
    source: {
      label: 'ICAP ETS map — China',
      url: 'https://icapcarbonaction.com/en/ets',
    },
  },
  {
    date: '2025-04-01',
    datePrecision: 'year',
    actor: 'United States (Congress)',
    title: 'Foreign Pollution Fee Act reintroduced',
    summary:
      'A border fee on carbon-intensive imports without a domestic carbon price — a US legislative response shaped by the CBAM precedent. Bill number, sponsors and current status pending verification.',
    kind: 'pricing-response',
    verification: 'unverified',
    source: {
      label: 'Congress.gov — bill search: Foreign Pollution Fee Act',
      url: 'https://www.congress.gov/search?q=%22Foreign%20Pollution%20Fee%20Act%22',
    },
  },
  {
    date: '2025-07-09',
    datePrecision: 'month',
    actor: 'Türkiye',
    title: 'Türkiye adopts its Climate Law, creating the legal basis for a national ETS',
    summary:
      'Law No. 7552 established the framework for a Turkish emissions trading system; protecting export competitiveness under the EU CBAM was a central and publicly stated motivation. Exact adoption and gazette dates pending verification.',
    kind: 'pricing-response',
    verification: 'unverified',
    source: {
      label: 'ICAP ETS map — Türkiye',
      url: 'https://icapcarbonaction.com/en/ets',
    },
  },
  {
    date: '2026-01-01',
    datePrecision: 'day',
    actor: 'European Union',
    title: 'CBAM definitive regime begins; free-allocation phase-down starts',
    summary:
      'Embedded-emissions liability starts accruing for imports from 1 January 2026 (certificate surrender following the declaration cycle); the ETS free-allocation CBAM factor drops to 97.5 %.',
    kind: 'eu-milestone',
    verification: 'sourced',
    source: CBAM_CONSOLIDATED,
  },
  {
    date: '2026-06-01',
    datePrecision: 'year',
    actor: 'European Commission',
    title: 'Downstream-extension proposal work continuing through 2026',
    summary:
      'The legislative follow-up to the Action Plan announcement — extending CBAM to selected downstream CN headings and tightening anti-circumvention rules — is in progress in 2026. Its precise state (proposal adopted, under negotiation, or pending) could not be confidently verified from this sandbox at compile date.',
    kind: 'scope-review',
    verification: 'unverified',
    source: {
      label: 'European Commission — CBAM policy page',
      url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    },
  },
];
