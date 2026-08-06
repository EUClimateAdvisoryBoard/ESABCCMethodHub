/**
 * Climate Investment vs Rearmament — curated evidence rows (beta module M · 51).
 *
 * GENERATED: AI-compiled 2026-08 — pending Secretariat verification.
 *
 * Provenance
 * ----------
 * Compiled by a Claude agent in August 2026 from the following documents,
 * each cited per row with a locator (document, section or key-figures page):
 *   - Commission Communication COM(2024) 63 final, "Securing our future"
 *     (6 Feb 2024) and its underpinning impact assessment SWD(2024) 63
 *     (2040 climate target) — investment-need figures.
 *   - I4CE, "European Climate Investment Deficit report — an investment
 *     pathway for Europe's future" (Feb 2024) — need, actual and deficit
 *     on one consistent 22-sector scope.
 *   - Draghi report, "The future of European competitiveness" (Sept 2024).
 *   - MFF/NGEU, RRF, ETS, SCF legal acts via EUR-Lex (ELI links below).
 *   - NATO Hague Summit Declaration (25 June 2025); EDA Defence Data;
 *     Regulation (EU) 2025/1106 (SAFE); Commission ReArm Europe /
 *     Readiness 2030 fiscal package (March 2025).
 *
 * Rules applied at compile time:
 *   - Every figure carries its own source and locator; figures the agent
 *     could not pin to a page or key-figures table are marked
 *     `confidence: 'medium'` or `'low'` and MUST be human-verified before
 *     any of this is quoted outside the hub.
 *   - Need-side rows are deliberately NON-COMPARABLE (different scopes,
 *     periods and counting conventions); `gapComputable` is true only
 *     where need and actual investment exist on the SAME scope (I4CE).
 *   - No averaging across rows anywhere in this file or downstream.
 *   - Quotes are intended as verbatim substrings of the source; pending
 *     verification they are labelled as such in the UI.
 */

export type Confidence = 'high' | 'medium' | 'low';

export type RowStatus =
  | 'in force'
  | 'proposed'
  | 'expiring'
  | 'political commitment';

export type NeedRow = {
  id: string;
  label: string;
  /** €bn per year, lower and upper bound of the published figure (lo = hi for point estimates). */
  lo: number;
  hi: number;
  period: string;
  /** What the figure does and does not count — the reason the rows must not be compared or averaged. */
  scope: string;
  source: string;
  locator: string;
  url: string;
  /** True only where the same source publishes need AND actual investment on one scope. */
  gapComputable: boolean;
  confidence: Confidence;
  note?: string;
};

export type LedgerRow = {
  id: string;
  label: string;
  /** Headline amount as published, with its own unit and period — deliberately NOT normalised. */
  amountLabel: string;
  status: RowStatus;
  scope: string;
  source: string;
  locator: string;
  url: string;
  confidence: Confidence;
  note?: string;
};

export type AlignmentRow = {
  id: string;
  label: string;
  body: string;
  source: string;
  locator: string;
  url: string;
  confidence: Confidence;
};

/* ------------------------------------------------------------- constants */

/**
 * EU-27 nominal GDP 2024, €bn. Live Eurostat pull 2026-08-06:
 * nama_10_gdp, na_item B1GQ, unit CP_MEUR, geo EU27_2020 gives
 * €18,043bn for 2024 (and €18,796bn for 2025, if this module is ever
 * rebased). The stored value was 17,900 — about 0.8 % low — which came
 * from a rounding the compile could not verify. It can now: the Eurostat
 * dissemination API answers over plain HTTPS from this sandbox.
 */
export const EU_GDP_2024_BN = 18_043;

/**
 * EU-27 defence expenditure 2024 as % of GDP. EDA Defence Data 2024-2025
 * (published 2 September 2025) reports €343bn in 2024, a 19 % rise on 2023,
 * at 1.9 % of GDP — so the PERCENTAGE stored here was right but the €
 * figure it was derived from was not: the compile had €326bn, about 5 %
 * low. Checked 2026-08-06. EDA also reports an expected €381bn in 2025 at
 * 2.1 % of GDP, the first time EU-wide spending has passed 2 % in the EDA
 * series — relevant context for the squeeze this module models, but not
 * folded into the 2024-based arithmetic.
 */
export const CURRENT_DEFENCE_PCT = 1.9;

/** EU climate investment actually realised, €bn/yr — I4CE 2022 figure on the 22-sector scope. */
export const CURRENT_CLIMATE_INVEST_BN = 407;

/**
 * Approximate share of EU-27 GDP produced by the 23 member states that are
 * NATO allies (Austria, Ireland, Malta and Cyprus are outside the Hague
 * commitment). Order-of-magnitude from Eurostat national accounts; a slider
 * in the model, not a claim.
 */
export const NATO_GDP_COVERAGE_DEFAULT = 0.94;

/* ------------------------------------------------------------- need side */

export const NEED_ROWS: NeedRow[] = [
  {
    id: 'ia2040-energy',
    label: 'Commission 2040 target IA — energy system',
    lo: 660,
    hi: 660,
    period: 'annual average 2031–2050',
    scope:
      'Energy system only, EXCLUDING transport. Total (public + private) investment, including replacement that would happen anyway. EU-27.',
    source: 'COM(2024) 63 final, "Securing our future" (underpinned by SWD(2024) 63)',
    locator: 'Communication of 6 Feb 2024, investment-needs discussion (≈ €660bn/yr, energy system, 2031–2050)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
    gapComputable: false,
    confidence: 'high',
    note: 'No like-for-like "actual" figure is published on this scope, so a gap in €bn/yr cannot be computed from this row alone.',
  },
  {
    id: 'ia2040-transport',
    label: 'Commission 2040 target IA — transport',
    lo: 870,
    hi: 870,
    period: 'annual average 2031–2050',
    scope:
      'Transport only, dominated by vehicle purchases — largely fleet turnover that occurs in any scenario, so this is NOT additional climate spending and must not be added to the energy-system row.',
    source: 'COM(2024) 63 final / SWD(2024) 63 (2040 climate target impact assessment)',
    locator: 'Impact-assessment investment tables (transport ≈ €870bn/yr, 2031–2050) — page reference pending verification',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
    gapComputable: false,
    confidence: 'medium',
  },
  {
    id: 'i4ce-deficit',
    label: 'I4CE European Climate Investment Deficit',
    lo: 813,
    hi: 813,
    period: 'needed each year by 2030',
    scope:
      '22 sectors across buildings, transport and energy, EU-27, public + private. The one source that publishes need (€813bn/yr) AND actual investment (€407bn/yr in 2022) on the same scope — so the only row a € gap can honestly be computed from.',
    source: 'I4CE, European Climate Investment Deficit report (Feb 2024)',
    locator: 'Key figures: need €813bn/yr by 2030; realised €407bn in 2022; deficit €406bn/yr',
    url: 'https://www.i4ce.org/en/publication/european-climate-investment-deficit-report-investment-pathway-europe-future-climate/',
    gapComputable: true,
    confidence: 'high',
  },
  {
    id: 'draghi',
    label: 'Draghi report — additional investment need',
    lo: 750,
    hi: 800,
    period: 'per year, to 2030',
    scope:
      'ADDITIONAL investment (on top of today\'s), and NOT climate-only: covers digitalisation, decarbonisation AND defence together (≈ 4.4–4.7 % of 2023 EU GDP). Not comparable with either Commission or I4CE rows.',
    source: 'M. Draghi, The future of European competitiveness (Sept 2024)',
    locator: 'Part A, financing-investment discussion (minimum €750–800bn additional per year)',
    url: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en',
    gapComputable: false,
    confidence: 'high',
  },
];

/* -------------------------------------------------------- committed side */

export const COMMITTED_ROWS: LedgerRow[] = [
  {
    id: 'mff-mainstreaming',
    label: 'MFF 2021–27 + NGEU climate mainstreaming',
    amountLabel: '≥ 30 % of ≈ €2.018tn ≈ €605bn over 2021–27 (≈ €86bn/yr)',
    status: 'in force',
    scope:
      'An accounting share across the whole budget, not a dedicated fund. ECA Special Report 09/2022 found reported climate spending "not always relevant or backed up by the amounts reported" — treat the €/yr as an upper bound on real climate money.',
    source: 'Interinstitutional Agreement of 16 Dec 2020; ECA Special Report 09/2022',
    locator: 'IIA point 16(d) (30 % target); ECA SR 09/2022 summary',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020Q1222(01)',
    confidence: 'medium',
    note: 'The Commission\'s July 2025 proposal for the MFF 2028–34 raises the mainstreaming ambition; figures for the next MFF are proposals under negotiation, not commitments — pending verification.',
  },
  {
    id: 'rrf-expiry',
    label: 'Recovery and Resilience Facility — expiring',
    amountLabel: '€723bn capacity; ≥ 37 % climate per plan; ends 2026',
    status: 'expiring',
    scope:
      'Grants (€338bn) and loans (€385bn), current prices. Climate contribution across plans assessed at ≈ 42.5 % (Commission mid-term evaluation, Feb 2024). Final payment requests are due by 31 Aug 2026 and the facility closes on 31 Dec 2026 — the single largest EU climate-investment vehicle disappears with no successor yet enacted.',
    source: 'Regulation (EU) 2021/241; Commission mid-term evaluation of the RRF (2024)',
    locator: 'Reg. 2021/241 Arts. 4, 18(4)(e) (37 % climate); mid-term evaluation (42.5 %); wind-down timetable pending verification',
    url: 'https://eur-lex.europa.eu/eli/reg/2021/241/oj',
    confidence: 'medium',
  },
  {
    id: 'ets-revenues',
    label: 'ETS auction revenues',
    amountLabel: '≈ €43.6bn in 2023; effectively 100 % earmarked for climate',
    status: 'in force',
    scope:
      'Member-state auction revenues must be used for climate- and energy-related purposes (Directive 2003/87/EC Art. 10(3) as amended by Directive (EU) 2023/959). ETS2 adds revenues from 2027. Revenue scales with the carbon price — it is not a fixed commitment.',
    source: 'Commission Carbon Market Report 2024; Directive 2003/87/EC (consolidated)',
    locator: 'Carbon Market Report 2024 (2023 auction revenue); Dir. 2003/87/EC Art. 10(3)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02003L0087-20240301',
    confidence: 'medium',
  },
  {
    id: 'idb',
    label: 'Industrial Decarbonisation Bank (proposed)',
    amountLabel: '€100bn (announced ambition, not enacted)',
    status: 'proposed',
    scope:
      'Announced in the Clean Industrial Deal (26 Feb 2025), to be assembled from the Innovation Fund, ETS revenues and an InvestEU amendment — largely a re-labelling of revenue streams already counted in the ETS row above; do NOT add the two rows.',
    source: 'Commission, Clean Industrial Deal, COM(2025) 85 final',
    locator: 'COM(2025) 85 final, financing section (€100bn Industrial Decarbonisation Bank)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0085',
    confidence: 'medium',
  },
  {
    id: 'scf',
    label: 'Social Climate Fund',
    amountLabel: '€65bn 2026–2032 (+ 25 % national co-financing ≈ €87bn total)',
    status: 'in force',
    scope:
      'Funded from ETS2 revenues; targeted at vulnerable households, micro-enterprises and transport users — social cushioning of the transition rather than mitigation capex.',
    source: 'Regulation (EU) 2023/955',
    locator: 'Reg. (EU) 2023/955, Arts. 10–11 (financial envelope, co-financing)',
    url: 'https://eur-lex.europa.eu/eli/reg/2023/955/oj',
    confidence: 'high',
  },
];

/* ---------------------------------------------------- defence trajectory */

export const DEFENCE_ROWS: LedgerRow[] = [
  {
    id: 'hague',
    label: 'NATO Hague Summit commitment',
    amountLabel: 'at least 3.5 % of GDP core defence + up to 1.5 % defence- and security-related, by 2035',
    status: 'political commitment',
    scope:
      'Applies to NATO allies — 23 of 27 EU member states (Austria, Ireland, Malta and Cyprus are outside it). The 1.5 % band covers infrastructure, resilience and industrial-base spending, which is where the dual-use overlap with climate investment sits. A summit declaration, not law.',
    source: 'NATO, The Hague Summit Declaration (25 June 2025)',
    locator:
      'Declaration para. 2, verified verbatim 2026-08-06: "Allies will allocate at least 3.5% of GDP annually based on the agreed definition of NATO defence expenditure by 2035" and "Allies will account for up to 1.5% of GDP annually to inter alia protect our critical infrastructure, defend our networks, ensure our civil preparedness and resilience, unleash innovation, and strengthen our defence industrial base." Note the asymmetry the earlier label lost: the core-defence leg is a FLOOR ("at least") and the second leg is a CEILING ("up to"), so 5 % is not a simple sum of two equally binding parts.',
    url: 'https://www.nato.int/en/about-us/official-texts-and-resources/official-texts/2025/06/25/the-hague-summit-declaration',
    confidence: 'high',
  },
  {
    id: 'eda-current',
    label: 'Current EU defence spending',
    amountLabel: '€343bn in 2024 (1.9 % of EU GDP); €381bn expected in 2025 (2.1 %)',
    status: 'in force',
    scope:
      'EDA Defence Data estimate for 2024, total defence expenditure of EDA member states — the baseline the Hague increment is measured against in this module.',
    source: 'European Defence Agency, Defence Data 2024-2025 (published 2 September 2025)',
    locator:
      'EDA headline figures, verified 2026-08-06: defence expenditure by the 27 EU Member States reached €343bn in 2024, a 19 % rise on 2023, at 1.9 % of GDP; €381bn is expected in 2025, at 2.1 % of GDP — the first time EU-wide spending passes 2 % in the EDA series. The earlier compile carried ≈ €326bn, about 5 % low, though its 1.9 % of GDP was right.',
    url: 'https://eda.europa.eu/publications-and-data/defence-data',
    confidence: 'high',
  },
  {
    id: 'safe',
    label: 'SAFE — Security Action for Europe',
    amountLabel: 'up to €150bn in loans',
    status: 'in force',
    scope:
      'EU-budget-backed LOANS to member states for common defence procurement (Regulation (EU) 2025/1106, 27 May 2025). Loans are repayable — they shift spending forward rather than adding budget resources, so their crowd-out logic differs from grant money.',
    source: 'Regulation (EU) 2025/1106',
    locator: 'Reg. (EU) 2025/1106 (SAFE instrument, €150bn ceiling)',
    url: 'https://eur-lex.europa.eu/eli/reg/2025/1106/oj',
    confidence: 'high',
  },
  {
    id: 'escape-clause',
    label: 'National escape-clause activations (SGP)',
    amountLabel: 'up to 1.5 % of GDP/yr additional defence spending, 2025–2028',
    status: 'in force',
    scope:
      'Coordinated activation of the Stability and Growth Pact national escape clause for defence, proposed in the March 2025 ReArm Europe / Readiness 2030 package; the Council granted activations to a group of member states in July 2025 (the exact count is pending verification). Deficit-financed room — the reason "0 % crowd-out" is a defensible reading, at least until debt rules bind again.',
    source: 'Commission, ReArm Europe / Readiness 2030 (March 2025); Council recommendations (July 2025)',
    locator: 'Commission communication of 4 March 2025 (fiscal leg); Council decisions of July 2025 — member-state count pending verification',
    url: 'https://commission.europa.eu/topics/defence/future-european-defence_en',
    confidence: 'low',
  },
];

/* ------------------------------------------------- alignments (rule 9) */

export const ALIGNMENT_ROWS: AlignmentRow[] = [
  {
    id: 'nato-15-band',
    label: 'The 1.5 % band can count climate-adjacent infrastructure',
    body:
      'The Hague commitment\'s 1.5 % "defence- and security-related" band covers critical-infrastructure protection, resilience and networks — categories under which grid hardening, protected interconnectors and climate-resilient transport corridors can plausibly be counted. To that extent the two agendas overlap rather than compete.',
    source: 'NATO, The Hague Summit Declaration (25 June 2025)',
    locator: 'Declaration, description of the 1.5 % category — wording pending verification',
    url: 'https://www.nato.int/cps/en/natohq/official_texts_236705.htm',
    confidence: 'medium',
  },
  {
    id: 'safe-dual-use',
    label: 'SAFE finances military mobility and infrastructure protection',
    body:
      'The SAFE regulation\'s eligible categories include military mobility and the protection of critical infrastructure — spending that upgrades the same grids, ports and rail corridors the energy transition needs.',
    source: 'Regulation (EU) 2025/1106',
    locator: 'Reg. (EU) 2025/1106, eligible-products provisions — article number pending verification',
    url: 'https://eur-lex.europa.eu/eli/reg/2025/1106/oj',
    confidence: 'medium',
  },
  {
    id: 'forces-energy',
    label: 'Energy independence of armed forces',
    body:
      'The Joint Communication on the climate and security nexus commits the EU to reducing the fossil-fuel dependence and improving the energy resilience of armed forces — decarbonisation as an operational-security good.',
    source: 'JOIN(2023) 19 final, "A new outlook on the climate and security nexus" (June 2023)',
    locator: 'JOIN(2023) 19 final, actions on armed-forces energy transition',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023JC0019',
    confidence: 'high',
  },
  {
    id: 'repowereu',
    label: 'Energy security IS partly climate policy',
    body:
      'REPowerEU frames renewables, efficiency and electrification as the route out of dependence on imported Russian fossil fuels — the clearest case where a euro of security spending and a euro of climate spending are the same euro.',
    source: 'Commission, REPowerEU Plan, COM(2022) 230 final',
    locator: 'COM(2022) 230 final (18 May 2022), plan objectives',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022DC0230',
    confidence: 'high',
  },
];
