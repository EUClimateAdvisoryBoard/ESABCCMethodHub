/**
 * Downstream — lead-market policies & downstream standards.
 * ---------------------------------------------------------------------------
 * Data behind the "Downstream" sub-page of Overview Industry
 * (/beta/overview-industry/downstream) and its Excel handover workbook.
 *
 * Two datasets:
 *   • LEAD_MARKET_POLICIES — the EU demand-side ("lead market") instruments
 *     for low-carbon industrial products (public procurement rules, quotas,
 *     border price signals), each documented along the FIVE mandatory
 *     evaluation criteria of the Commission's Better Regulation framework
 *     (Better Regulation Guidelines SWD(2021) 305 / Toolbox Tool #47):
 *     effectiveness, efficiency, relevance, coherence, EU added value.
 *   • DOWNSTREAM_STANDARDS — the definition / label / product-standard layer
 *     that lead markets depend on (what counts as "low-carbon steel"?).
 *
 * IMPORTANT — nature of the notes: most instruments are new or still in the
 * legislative pipeline, so the per-criterion notes are evaluation-STYLE and
 * largely EX-ANTE (a prospective read using the Better Regulation criteria
 * as a grid), not a formal ex-post evaluation. NO rating scale is applied —
 * the notes are AI-compiled working drafts as of July 2026, pending
 * verification by the industry lead; not a Board position.
 */

export const DOWNSTREAM_META = {
  asOf: 'July 2026',
  compiled: '2026-07-15',
  scope:
    'EU demand-side instruments that create lead markets for low-carbon industrial products — public procurement, quotas and border price signals — plus the downstream standards (definitions, labels, product rules) they depend on.',
  frameworkNote:
    'Assessment lens: the five evaluation criteria every Commission evaluation must apply under the Better Regulation Guidelines (SWD(2021) 305 final; Better Regulation Toolbox, Tool #47): effectiveness, efficiency, relevance, coherence and EU added value. Because most instruments here are recent or still proposals, the assessment is evaluation-style and largely ex-ante.',
  frameworkUrl:
    'https://commission.europa.eu/law/law-making-process/planning-and-proposing-law/better-regulation/better-regulation-guidelines-and-toolbox_en',
};

/* ── Better Regulation evaluation criteria ─────────────────────────────── */

export type BRCriterion =
  | 'effectiveness'
  | 'efficiency'
  | 'relevance'
  | 'coherence'
  | 'euAddedValue';

export const BR_CRITERIA: BRCriterion[] = [
  'effectiveness',
  'efficiency',
  'relevance',
  'coherence',
  'euAddedValue',
];

export const BR_CRITERIA_META: Record<
  BRCriterion,
  { label: string; short: string; question: string; color: string }
> = {
  effectiveness: {
    label: 'Effectiveness',
    short: 'Effect.',
    question:
      'Is the instrument delivering (or credibly designed to deliver) its objective — real demand pull for low-carbon products?',
    color: '#004B7F',
  },
  efficiency: {
    label: 'Efficiency',
    short: 'Effic.',
    question:
      'Are the costs proportionate — green premium borne by public buyers, administrative burden, compliance cost — relative to the demand signal created?',
    color: '#007B6C',
  },
  relevance: {
    label: 'Relevance',
    short: 'Relev.',
    question:
      'Does it address the actual need — the green-premium / demand-gap problem that holds back final investment decisions in low-carbon production?',
    color: '#6667AB',
  },
  coherence: {
    label: 'Coherence',
    short: 'Coher.',
    question:
      'Does it fit with the rest of the EU framework (ETS, CBAM, NZIA, ESPR, CPR, state aid) — same definitions, no gaps or contradictions?',
    color: '#FF9933',
  },
  euAddedValue: {
    label: 'EU added value',
    short: 'EU AV',
    question:
      'What does acting at EU level add compared with 27 national schemes — single-market scale, common definitions, level playing field?',
    color: '#A530B8',
  },
};

/* ── Criteria notes ────────────────────────────────────────────────────── */

/**
 * One factual note per Better Regulation criterion. Deliberately NOT rated:
 * no strong/moderate/weak scale is applied anywhere — the note carries the
 * facts (design, data points, state of play) and leaves the judgement to the
 * reader.
 */
export interface CriterionAssessment {
  rationale: string;
}

/* ── Lead-market policies ──────────────────────────────────────────────── */

export type PolicyCategory =
  | 'procurement'
  | 'quota'
  | 'border-price'
  | 'framework';

export const POLICY_CATEGORY_META: Record<
  PolicyCategory,
  { label: string; color: string }
> = {
  procurement: { label: 'Public procurement', color: '#004B7F' },
  quota: { label: 'Quota / mandate', color: '#007B6C' },
  'border-price': { label: 'Border price signal', color: '#B83230' },
  framework: { label: 'Framework revision', color: '#6667AB' },
};

export type PolicyStatus =
  | 'in-force'
  | 'adopted'
  | 'proposed'
  | 'announced';

export const POLICY_STATUS_META: Record<
  PolicyStatus,
  { label: string; color: string }
> = {
  'in-force': { label: 'In force', color: '#007B6C' },
  adopted: { label: 'Adopted', color: '#00928F' },
  proposed: { label: 'Proposal — in negotiation', color: '#FF9933' },
  announced: { label: 'Announced', color: '#808285' },
};

export interface DataPoint {
  label: string;
  value: string;
  source: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface LeadMarketPolicy {
  id: string;
  name: string;
  shortName: string;
  category: PolicyCategory;
  status: PolicyStatus;
  statusDetail: string;
  reference: string;
  sectors: string;
  description: string;
  leadMarketMechanism: string;
  assessment: Record<BRCriterion, CriterionAssessment>;
  overallRead: string;
  keyData: DataPoint[];
  sources: SourceLink[];
  handoverNotes: string;
}

export const LEAD_MARKET_POLICIES: LeadMarketPolicy[] = [
  {
    id: 'gpp-voluntary',
    name: 'EU Green Public Procurement (voluntary framework)',
    shortName: 'Voluntary GPP',
    category: 'procurement',
    status: 'in-force',
    statusDetail:
      'Voluntary since 2008 (COM(2008) 400); ~20 common EU GPP criteria sets maintained by the Commission. Directive 2014/24/EU permits — but does not require — environmental award criteria.',
    reference: 'COM(2008) 400; Directive 2014/24/EU; EU GPP criteria sets',
    sectors: 'All sectors (criteria sets incl. buildings, road transport, ICT)',
    description:
      'The baseline instrument: common, voluntary environmental criteria that public buyers can insert into tenders. The 2014 procurement directives allow life-cycle costing and "most economically advantageous tender" (MEAT) awards, but the default in practice remains lowest price.',
    leadMarketMechanism:
      'Voluntary demand pull: if enough contracting authorities adopt the common criteria, tenders reward low-carbon products. No obligation, no floor, no monitoring regime.',
    assessment: {
      effectiveness: {
        rationale:
          'Uptake stayed low after 15+ years: fewer than 15% of above-threshold contracts include green criteria and over 55% of tenders are still awarded on lowest price alone. The voluntary design never converted the EU\'s ~14%-of-GDP purchasing power into a reliable demand signal.',
      },
      efficiency: {
        rationale:
          'Cheap to run (criteria sets, no enforcement apparatus) and low burden on buyers — but the foregone scale means very little demand pull per euro of policy effort. Evidence also shows green criteria can reduce bidder participation and raise award prices where used without market preparation.',
      },
      relevance: {
        rationale:
          'The need it targets is exactly right — public purchasing is the single largest controllable demand lever for low-carbon materials (~€2 trillion/yr). The instrument, not the problem, is the weak part.',
      },
      coherence: {
        rationale:
          'GPP criteria pre-date and are not aligned with the ETS/CBAM carbon-accounting stack now used by NZIA, ESPR and the proposed IAA; sectoral mandatory regimes are overtaking it, leaving two parallel logics until the Public Procurement Directive revision knits them together.',
      },
      euAddedValue: {
        rationale:
          'Common criteria sets prevented 27 divergent national green-criteria catalogues and lowered the entry cost for municipalities — real but modest added value given voluntariness.',
      },
    },
    overallRead:
      'The reference case for why the EU is now legislating mandatory criteria: right lever, wrong (voluntary) design. Useful mainly as the baseline against which NZIA/ESPR/IAA should be judged.',
    keyData: [
      {
        label: 'Public procurement volume',
        value: '≈14% of EU GDP (~€2 trillion per year)',
        source: 'European Commission, single-market public procurement pages',
      },
      {
        label: 'Green uptake',
        value: '<15% of above-threshold contracts include green criteria',
        source: 'IISD / EEB analyses of TED data, 2024–25',
      },
      {
        label: 'Lowest-price awards',
        value: '>55% of EU tenders awarded on lowest price only',
        source: 'Bruegel / Commission procurement performance indicators',
      },
    ],
    sources: [
      {
        label: 'Commission — public procurement (single market)',
        url: 'https://single-market-economy.ec.europa.eu/single-market/public-procurement_en',
      },
      {
        label: 'EU GPP criteria (Green Forum)',
        url: 'https://green-forum.ec.europa.eu/green-public-procurement_en',
      },
      {
        label: 'IISD — EU Public Procurement Directive review explained',
        url: 'https://www.iisd.org/articles/explainer/european-union-public-procurement-directive-review',
      },
      {
        label: 'Intereconomics — GPP: a neglected tool of the Green Deal?',
        url: 'https://www.intereconomics.eu/contents/year/2022/number/3/article/green-public-procurement-a-neglected-tool-in-the-european-green-deal-toolbox.html',
      },
    ],
    handoverNotes:
      'Treat as background/baseline. No action needed — the live files are the PP Directive revision and the IAA, which replace this logic with mandatory criteria.',
  },
  {
    id: 'nzia-procurement',
    name: 'Net-Zero Industry Act — procurement & auction non-price criteria (Arts 25–26)',
    shortName: 'NZIA Arts 25–26',
    category: 'procurement',
    status: 'in-force',
    statusDetail:
      'Regulation (EU) 2024/1735 in force since 29 June 2024. Implementing Regulation (EU) 2026/718 (20 March 2026) sets the minimum environmental-sustainability requirements for public procurement of net-zero technologies. Auction non-price criteria implementing act adopted August 2025; ≥30% of auctioned renewables volume (or ≥6 GW/yr) per Member State must apply them from 30 December 2025.',
    reference:
      'Reg. (EU) 2024/1735, Arts 25–26; Implementing Reg. (EU) 2026/718; auctions implementing act (Aug 2025)',
    sectors:
      'Net-zero technologies: solar, wind, batteries, heat pumps, electrolysers, grids etc. (Art. 4 list)',
    description:
      'The first binding EU-wide non-price rules for clean-tech demand: contracting authorities buying net-zero technologies must apply minimum environmental-sustainability requirements plus at least one of a social condition, cybersecurity compliance or timely-delivery clause; a resilience criterion applies where a single third country supplies >50% of an technology. Renewable-energy auctions must embed non-price (sustainability, resilience, cybersecurity) criteria for a minimum share of volume.',
    leadMarketMechanism:
      'Converts public tenders and renewables auctions from pure price competition into markets that reward sustainability and supply-chain resilience — a lead market for cleaner and EU-diversified clean tech, with guardrails capping the extra cost buyers must accept.',
    assessment: {
      effectiveness: {
        rationale:
          'The machinery only completed in 2026 (procurement IR of 20 March 2026; first NZIA-compliant auctions opening through 2026). Design caution: the 30%/6 GW auction floor and cost-cap guardrails deliberately limit how much demand is actually redirected, so even full compliance moves a minority of volume.',
      },
      efficiency: {
        rationale:
          'Leverages existing tender machinery and caps the premium public buyers must absorb — proportionate by design. But per-tender assessment of eight environmental criteria plus resilience checks adds real administrative load on contracting authorities, and pre-qualification-style criteria may shrink bidder pools.',
      },
      relevance: {
        rationale:
          'Directly answers the diagnosed problem — EU clean-tech manufacturers losing tenders on price to concentrated non-EU supply — and the 2024–25 evidence (solar, batteries) kept the need acute.',
      },
      coherence: {
        rationale:
          'Well linked to the CRMA and state-aid frameworks, but now overlaps the proposed IAA (which adds its own procurement preferences for net-zero tech) and the upcoming Public Procurement Act — three layers whose reconciliation is explicitly still open.',
      },
      euAddedValue: {
        rationale:
          'Single-market-wide criteria prevent a race to the bottom between national auctions and give manufacturers one rulebook instead of 27 — precisely the case where EU action outperforms national schemes.',
      },
    },
    overallRead:
      'The most advanced binding lead-market instrument actually in force — but calibrated conservatively. Watch 2026 auction rounds for the first real effectiveness evidence.',
    keyData: [
      {
        label: 'Auction volume covered',
        value: '≥30% of annual renewables auction volume or ≥6 GW/yr per Member State (from 30 Dec 2025)',
        source: 'NZIA Art. 26 + implementing act (Aug 2025)',
      },
      {
        label: 'Procurement requirements',
        value: 'Minimum environmental-sustainability requirements + 1 of {social condition, cybersecurity, timely delivery}',
        source: 'Implementing Regulation (EU) 2026/718',
      },
      {
        label: 'Resilience trigger',
        value: 'Applies where >50% of EU supply of the technology comes from one third country',
        source: 'NZIA Art. 25',
      },
      {
        label: 'Environmental criteria menu',
        value: 'Life-cycle carbon footprint, circularity, biodiversity, energy efficiency, water, pollution, innovation, system integration',
        source: 'Implementing Regulation (EU) 2026/718',
      },
    ],
    sources: [
      {
        label: 'NZIA — Regulation (EU) 2024/1735 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735',
      },
      {
        label: 'Commission — Net-Zero Industry Act hub',
        url: 'https://single-market-economy.ec.europa.eu/industry/sustainability/net-zero-industry-act_en',
      },
      {
        label: 'Implementing Regulation (EU) 2026/718 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202600718',
      },
      {
        label: 'HSF Kramer — NZIA: new implementing rules (2025)',
        url: 'https://www.hsfkramer.com/notes/energy/2025-posts/the-net-zero-industry-act-new-implementing-rules-to-accelerate-clean-technology-manufacturing-in-the-eu',
      },
      {
        label: 'Covington — auctions non-price criteria implementing act (Aug 2025)',
        url: 'https://www.globalpolicywatch.com/2025/08/adoption-of-implementing-act-on-non-price-criteria-in-renewable-energy-auctions/',
      },
      {
        label: 'EPRS briefing — Implementing the NZIA (2025)',
        url: 'https://www.europarl.europa.eu/RegData/etudes/BRIE/2025/769489/EPRS_BRI(2025)769489_EN.pdf',
      },
    ],
    handoverNotes:
      'Track the first NZIA-compliant auction rounds (H2 2026) and Member State transposition practice — that is the first empirical effectiveness data any of these instruments will produce. Check how the IAA trilogue resolves the NZIA-overlap question.',
  },
  {
    id: 'iaa-lead-markets',
    name: 'Industrial Accelerator Act — lead-market pillar',
    shortName: 'IAA (proposal)',
    category: 'procurement',
    status: 'proposed',
    statusDetail:
      'Commission proposal of 4 March 2026 (2026/0068(COD)), delivering the Clean Industrial Deal lead-markets commitment. First reading; joint ITRE/IMCO/INTA procedure, rapporteurs appointed 29 April 2026. Adoption unlikely before 2027; lead-market procurement obligations proposed to apply from 1 January 2029.',
    reference: 'COM proposal, 2026/0068(COD), 4 March 2026',
    sectors:
      'Steel, cement, aluminium, electric vehicles, net-zero technologies (chemicals door left open)',
    description:
      'The flagship demand-side proposal: minimum shares of low-carbon products in public works and infrastructure contracts, public EV fleet procurement, public support for construction/renovation, and renewables/net-zero support schemes — combined with "Union origin" (made-in-EU) preferences based on Customs Code rules of origin (FTA/GPA partners treated as equivalent). Low-carbon definitions are delegated to existing product law (ESPR for steel/aluminium, CPR for cement/concrete); until those land, the Commission may run a voluntary GHG-intensity classification as an interim signal. Targets manufacturing at 20% of EU GDP by 2035 (14.3% in 2024).',
    leadMarketMechanism:
      'Binding minimum shares of low-carbon products = a guaranteed quantity signal (not just award points), designed to underwrite offtake for near-zero steel, cement and aluminium plants that currently cannot close their green premium (~10–40% for steel, higher for cement).',
    assessment: {
      effectiveness: {
        rationale:
          'Ex-ante the design is the strongest yet — binding minimum shares beat award-criteria nudges. But effectiveness hinges on three unresolved points: the level of the shares (set later via implementing acts), the 2029 start date (late for plants needing offtake now), and the retreat from a mandatory to a voluntary carbon label, which weakens the price-discovery signal buyers need.',
      },
      efficiency: {
        rationale:
          'Reuses ETS/CBAM emissions data and existing product law rather than inventing new accounting — good. Open cost questions: green-premium pass-through to public budgets, administrative burden on contracting authorities verifying origin and carbon intensity, and WTO/GPA exposure of the Union-origin preferences.',
      },
      relevance: {
        rationale:
          'Aims squarely at the need every diagnosis (Draghi report, Clean Industrial Deal, ESABCC industry analysis) identified: without demand-side pull, EU low-carbon steel/cement/aluminium projects do not reach FID. Sector choice matches where green premiums block investment.',
      },
      coherence: {
        rationale:
          'Deliberately architected to sit on ESPR/CPR definitions and CBAM/ETS data — coherent on paper, but that makes it hostage to the ESPR steel delegated act (2026) and CPR acts landing on time, and its overlap with NZIA procurement rules and the parallel Public Procurement Act revision is not yet reconciled.',
      },
      euAddedValue: {
        rationale:
          'A lead market only works at scale: 27 national low-carbon procurement schemes with 27 definitions would fragment exactly the demand pool the plants need. EU-level minimum shares plus one classification system is the textbook added-value case.',
      },
    },
    overallRead:
      'The central file to follow. The design direction is right (binding shares, common definitions); the risks are timing (2029), ambition level left to implementing acts, and the voluntary-label retreat. Trilogue outcome expected 2027.',
    keyData: [
      {
        label: 'Proposal date / procedure',
        value: '4 March 2026, 2026/0068(COD), joint ITRE-IMCO-INTA',
        source: 'EP Legislative Train',
      },
      {
        label: 'Application of procurement obligations',
        value: 'From 1 January 2029 (as proposed)',
        source: 'Commission proposal / law-firm analyses',
      },
      {
        label: 'Headline target',
        value: 'Manufacturing 20% of EU GDP by 2035 (14.3% in 2024)',
        source: 'EP Legislative Train',
      },
      {
        label: 'Initial lead-market sectors',
        value: 'Steel, cement, aluminium, EVs, net-zero technologies',
        source: 'Commission proposal',
      },
      {
        label: 'Notable drafting change',
        value: 'EU-origin steel rule dropped and emissions sliding scale narrowed to primary steel vs earlier leaks; semiconductors/AI/quantum removed',
        source: 'EUROMETAL / Covington analyses, March 2026',
      },
    ],
    sources: [
      {
        label: 'EP Legislative Train — Industrial Accelerator Act',
        url: 'https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-industrial-decarbonisation-accelerator-act',
      },
      {
        label: 'Commission — Industrial Accelerator Act page',
        url: 'https://single-market-economy.ec.europa.eu/publications/industrial-accelerator-act_en',
      },
      {
        label: 'Covington — Commission publishes the proposed IAA (Mar 2026)',
        url: 'https://www.globalpolicywatch.com/2026/03/european-commission-publishes-the-proposed-industrial-accelerator-act/',
      },
      {
        label: 'Carbon Brief Q&A — the EU\'s "Made in Europe" rules',
        url: 'https://www.carbonbrief.org/qa-what-the-eus-new-industry-and-made-in-europe-rules-mean-for-climate-action/',
      },
      {
        label: 'One Click LCA — what the IAA changes for low-carbon steel/concrete/aluminium',
        url: 'https://oneclicklca.com/en/resources/articles/industrial-accelerator-act',
      },
      {
        label: 'InfluenceMap — IAA decarbonisation impact at risk',
        url: 'https://influencemap.org/insight/Distractions-Risk-Undermining-Europe-s-Industrial-Accelerator-Act-37184',
      },
      {
        label: 'EUROFER position — prioritise low-carbon steel made in Europe',
        url: 'https://www.eurofer.eu/press-releases/industrial-accelerator-act-eu-must-prioritise-low-carbon-steel-made-in-europe-not-foreign-imports',
      },
    ],
    handoverNotes:
      'Priority file. Follow the joint-committee report (draft expected autumn/winter 2026) and Council general approach; the ambition level of the minimum shares and the fate of the voluntary vs mandatory label are the two decisions that matter most for the progress-report storyline.',
  },
  {
    id: 'pp-act',
    name: 'Public Procurement Directive revision ("Public Procurement Act")',
    shortName: 'PP Act (announced)',
    category: 'framework',
    status: 'announced',
    statusDetail:
      'Commission revision of Directives 2014/23/24/25/EU announced in the Clean Industrial Deal; public consultation ran 3 Nov 2025 – 26 Jan 2026; proposal scheduled for 2026 (Commission work programme; expected H2 2026). EP resolution of 9 Sept 2025 (432/95/124) supports revision.',
    reference:
      'Revision of Dirs 2014/23/EU, 2014/24/EU, 2014/25/EU — proposal pending',
    sectors: 'All public purchasing; strategic-sector preferences targeted',
    description:
      'The horizontal rewrite of the EU procurement rulebook: simplification, plus mainstreaming of sustainability, resilience and social criteria, and — for strategic sectors/technologies — a "European preference" (made-in-Europe) criterion promised in the 2025 State of the Union.',
    leadMarketMechanism:
      'Would move green/resilience criteria from sectoral exceptions (NZIA, IAA) into the default procurement framework itself — potentially ending the lowest-price default that neutralises lead-market signals across the ~€2 trillion market.',
    assessment: {
      effectiveness: {
        rationale:
          'No proposal text yet. The effectiveness question is whether sustainability criteria become mandatory defaults (with floors) or remain enabled-but-optional — the voluntary GPP experience shows the latter does not move demand.',
      },
      efficiency: {
        rationale:
          'Simplification could cut tender transaction costs (a genuine pain point for SMEs and small buyers); but stacking sustainability + resilience + social + European-preference tests risks the opposite. Depends entirely on drafting.',
      },
      relevance: {
        rationale:
          'The framework is the root cause of the lowest-price default; every sectoral instrument (NZIA, IAA, ESPR GPP acts) is currently a workaround. Revising the trunk rather than adding branches addresses the actual need.',
      },
      coherence: {
        rationale:
          'This file decides whether the procurement layer stack (NZIA + ESPR implementing acts + IAA + GPP criteria) becomes one coherent system or four overlapping regimes — the single biggest coherence lever in the whole lead-market agenda.',
      },
      euAddedValue: {
        rationale:
          'Procurement thresholds and remedies are already EU-harmonised; only EU-level revision can change the default award logic across the single market.',
      },
    },
    overallRead:
      'The structural fix. Until the proposal lands, assessment is placeholder — but flag it as the file that determines the coherence of everything else.',
    keyData: [
      {
        label: 'Consultation',
        value: '3 Nov 2025 – 26 Jan 2026 (closed)',
        source: 'Commission Have-Your-Say / Public Buyers Community',
      },
      {
        label: 'EP resolution',
        value: '9 Sept 2025 — 432 for / 95 against / 124 abstentions',
        source: 'EP Legislative Train — Public Procurement Act',
      },
      {
        label: 'Market covered',
        value: '≈14% of EU GDP (~€2 trillion/yr); >250,000 contracting authorities',
        source: 'Commission single-market pages',
      },
    ],
    sources: [
      {
        label: 'EP Legislative Train — Public Procurement Act',
        url: 'https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-public-procurement-act',
      },
      {
        label: 'Commission — revision of the Public Procurement Directives (consultation)',
        url: 'https://public-buyers-community.ec.europa.eu/revision-public-procurement-directives',
      },
      {
        label: 'Bruegel — mapping the road ahead for EU procurement reform',
        url: 'https://www.bruegel.org/first-glance/mapping-road-ahead-eu-public-procurement-reform',
      },
      {
        label: 'IISD — Public Procurement Directive review explained',
        url: 'https://www.iisd.org/articles/explainer/european-union-public-procurement-directive-review',
      },
    ],
    handoverNotes:
      'Watch for the proposal (expected H2 2026 — check the Commission work programme item). First read: do sustainability criteria get a mandatory floor, and how is "European preference" squared with GPA commitments? Update the assessment from too-early once text exists.',
  },
  {
    id: 'espr-gpp',
    name: 'Ecodesign for Sustainable Products Regulation — mandatory GPP & product requirements',
    shortName: 'ESPR (GPP acts)',
    category: 'procurement',
    status: 'in-force',
    statusDetail:
      'Regulation (EU) 2024/1781 in force since 18 July 2024. First working plan (COM(2025) 187, 16 April 2025) prioritises iron & steel (delegated act targeted 2026, compliance ~2028) and aluminium (2027) as intermediate products; Art. 65 lets implementing acts make GPP criteria MANDATORY for products with ecodesign rules.',
    reference: 'Reg. (EU) 2024/1781, esp. Art. 65; COM(2025) 187',
    sectors:
      'Working-plan priorities: iron & steel, aluminium (intermediates); textiles, furniture, mattresses, tyres (final)',
    description:
      'The product-law backbone: delegated acts will set ecodesign requirements (incl. embodied-carbon and recycled-content information/classes) and Digital Product Passports for steel and aluminium; implementing acts under Art. 65 can then require public buyers to purchase within the top performance classes — the first genuinely mandatory GPP mechanism in EU law.',
    leadMarketMechanism:
      'Two-step lead market: (1) performance classes make carbon intensity visible and comparable; (2) mandatory GPP acts oblige public buyers to buy the better classes, creating protected demand for top-class (low-carbon) steel and aluminium.',
    assessment: {
      effectiveness: {
        rationale:
          'Nothing binding exists yet for materials — the steel delegated act is targeted for 2026 with compliance ~2028, and no Art. 65 GPP implementing act has been adopted. The mechanism is credible; the delivery risk is timing, given the IAA explicitly depends on these definitions.',
      },
      efficiency: {
        rationale:
          'Class-based requirements are administratively lean for buyers (buy class A/B — no bespoke LCA per tender), pushing the burden to producers via the DPP. DPP/verification compliance cost for producers is real but serves multiple regimes at once (IAA, CBAM, CPR).',
      },
      relevance: {
        rationale:
          'Solves the recognised binding constraint of the entire lead-market agenda: without harmonised low-carbon definitions and classes for materials, no procurement preference can be enforced.',
      },
      coherence: {
        rationale:
          'Deliberately positioned as the definitions layer the IAA, CPR and GPP mandates plug into; working plan explicitly coordinates intermediate-product rules so they don\'t cascade badly into final-product markets. Main risk is schedule slip, not design conflict.',
      },
      euAddedValue: {
        rationale:
          'One EU classification and passport per product beats 27 national eco-labels — and it is the piece that makes cross-border lead markets possible at all.',
      },
    },
    overallRead:
      'Quiet but decisive: the steel delegated act (due 2026) is the single most consequential pending act for industrial lead markets. If it slips, the IAA start date slips with it.',
    keyData: [
      {
        label: 'Working plan adoption',
        value: '16 April 2025 (COM(2025) 187), mid-term review 2028',
        source: 'Commission Green Forum',
      },
      {
        label: 'Steel delegated act',
        value: 'Indicative adoption 2026, compliance ~2028; aluminium 2027/~2029',
        source: 'ESPR first working plan analyses',
      },
      {
        label: 'Mandatory GPP power',
        value: 'Art. 65 implementing acts can set mandatory minimum procurement requirements',
        source: 'Reg. (EU) 2024/1781',
      },
    ],
    sources: [
      {
        label: 'ESPR — Regulation (EU) 2024/1781 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781',
      },
      {
        label: 'Commission — ESPR 2025–2030 working plan',
        url: 'https://green-forum.ec.europa.eu/news/2025-2030-working-plan-2025-07-11_en',
      },
      {
        label: 'Sidley — priority products for ecodesign requirements',
        url: 'https://www.sidley.com/en/insights/newsupdates/2025/04/european-commission-releases-list-of-priority-products',
      },
      {
        label: 'One Click LCA — first ESPR working plan explained',
        url: 'https://oneclicklca.com/en/resources/articles/first-espr-working-plan',
      },
    ],
    handoverNotes:
      'Watch the iron & steel delegated act consultation (expected late 2026). Two things to check in the draft: whether carbon-intensity classes align with the IAA voluntary classification and CBAM methodology, and whether an Art. 65 mandatory-GPP act is announced alongside.',
  },
  {
    id: 'cbam-downstream',
    name: 'CBAM — definitive regime & extension to downstream products',
    shortName: 'CBAM + downstream',
    category: 'border-price',
    status: 'proposed',
    statusDetail:
      'Base regulation (EU) 2023/956 in force; definitive regime with financial obligations from 1 Jan 2026 (2025 omnibus added a 50 t/yr de-minimis exempting ~90% of importers while keeping ~99% of embedded emissions). December 2025 proposal extends scope to ~180 downstream products (avg. 79% steel/aluminium content) with certificates from 1 Jan 2028; Council general approach June 2026; ENVI position adopted (incl. Temporary Decarbonisation Fund); trilogues ahead.',
    reference:
      'Reg. (EU) 2023/956; omnibus amendment 2025; downstream-extension proposal Dec 2025 (COD ongoing)',
    sectors:
      'Cement, iron & steel, aluminium, fertilisers, electricity, hydrogen; extension: fabricated metal products, machinery components etc.',
    description:
      'Not a procurement tool but the price floor under every lead market: CBAM equalises the carbon cost of imports so that low-carbon EU production is not undercut at the border. The downstream extension answers the main circumvention route (importing the same steel one processing step later, as screws, structures or components).',
    leadMarketMechanism:
      'Defends the price premium that lead-market instruments create: without border adjustment downstream, procurement preferences for low-carbon materials would simply pull in third-country processed goods. Its embedded-emissions methodology is also becoming the common carbon-accounting language for labels and classes.',
    assessment: {
      effectiveness: {
        rationale:
          'The mechanism is live and the de-minimis redesign kept 99% of embedded emissions covered with a fraction of the administrative population. But effectiveness against circumvention is only as good as scope: the 2028 downstream extension exists precisely because leakage was shifting downstream, and export-side leakage remains unaddressed pending the 2026 review.',
      },
      efficiency: {
        rationale:
          'The 2025 simplification materially improved the cost-benefit ratio (~90% of importers exempted, negligible emissions coverage lost). The downstream extension re-raises burden questions for thousands of importers of complex goods — default values and simplified methods will decide whether it stays proportionate.',
      },
      relevance: {
        rationale:
          'With free allocation phasing out from 2026, some border instrument is indispensable for exactly the sectors (steel, cement, aluminium) the lead-market agenda targets; the downstream gap was the most-cited flaw and is being addressed.',
      },
      coherence: {
        rationale:
          'Tightly coupled to the ETS (certificate price mirrors EUA auctions, scope mirrors free-allocation phase-out) and now reused as the methodology base for the IAA classification — CBAM is becoming the accounting keystone of the whole framework.',
      },
      euAddedValue: {
        rationale:
          'A border measure is definitionally impossible at Member State level inside a customs union.',
      },
    },
    overallRead:
      'The defensive half of the lead-market strategy. Downstream extension trilogue (H2 2026) and the export-leakage solution are the open items.',
    keyData: [
      {
        label: 'Definitive regime',
        value: 'Financial obligations from 1 Jan 2026; first certificate surrender 2027',
        source: 'Reg. (EU) 2023/956 as amended',
      },
      {
        label: 'De-minimis effect',
        value: '50 t/yr threshold exempts ~90% of importers, keeps ~99% of embedded emissions',
        source: 'Commission press material, 2025 omnibus',
      },
      {
        label: 'Downstream extension',
        value: '~180 product categories, avg. 79% steel/aluminium content; certificates from 1 Jan 2028',
        source: 'Commission proposal Dec 2025; Mayer Brown/Akin analyses',
      },
      {
        label: 'Council position',
        value: 'General approach on downstream extension agreed June 2026',
        source: 'Commission / Council press, 12 June 2026',
      },
    ],
    sources: [
      {
        label: 'CBAM — Regulation (EU) 2023/956 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
      },
      {
        label: 'Commission — CBAM strengthening (press)',
        url: 'https://ec.europa.eu/commission/presscorner/detail/en/ip_25_3088',
      },
      {
        label: 'Commission — Council agreement on strengthening CBAM (June 2026)',
        url: 'https://taxation-customs.ec.europa.eu/news/commission-welcomes-council-agreement-strengthening-cbam-2026-06-12_en',
      },
      {
        label: 'Mayer Brown — CBAM operational rules & downstream extension (Dec 2025)',
        url: 'https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-issues-cbam-operational-rules-and-proposes-downstream-extension-of-the-cbam-scope',
      },
      {
        label: 'Covington — CBAM expansion to complex metal products (Feb 2026)',
        url: 'https://www.insideenergyandenvironment.com/2026/02/eu-cbam-commission-proposes-expansion-to-complex-metal-products/',
      },
    ],
    handoverNotes:
      'Trilogues on the downstream extension expected H2 2026 — track the product list, default values and the ENVI-backed Temporary Decarbonisation Fund. Also watch the export-leakage review. Relevant for the report chapter wherever import-dependency meets decarbonisation.',
  },
  {
    id: 'elv-quotas',
    name: 'End-of-Life Vehicles Regulation — recycled-content quotas',
    shortName: 'ELV Regulation',
    category: 'quota',
    status: 'adopted',
    statusDetail:
      'Provisional agreement 12 Dec 2025; Council formal adoption 29 June 2026. Applies (in the main) two years after entry into force. Recycled-plastic quota: 15% at year 6 rising to 25% at year 10 (with 20% of that from ELVs); delegated act within two years to set minimum recycled-steel (ferrous scrap) and recycled-aluminium shares per vehicle type.',
    reference: 'ELV Regulation (2023/0284(COD)) — adopted June 2026',
    sectors: 'Automotive; upstream pull on plastics recyclers, steel & aluminium',
    description:
      'The first EU quota placing recycled-content obligations on a major PRIVATE product market: every new vehicle type must embed minimum recycled plastic, with recycled steel and aluminium shares to follow by delegated act. Extends producer responsibility and circularity rules across the vehicle life cycle.',
    leadMarketMechanism:
      'Quota = guaranteed offtake. Creates a captive lead market for automotive-grade recyclates (and later recycled/low-carbon steel and aluminium) independent of public budgets — demonstrating the quota model that ESABCC and think-tank work suggest for materials generally.',
    assessment: {
      effectiveness: {
        rationale:
          'Binding and quantified — ex-ante the strongest demand-signal design in this list — but obligations only bite from ~2028 (application) and the material quotas that matter for industrial decarbonisation (steel, aluminium) are still a delegated act away.',
      },
      efficiency: {
        rationale:
          'Quotas outsource the cost to the value chain rather than public budgets, but closed-loop plastic supply (25%, with ELV-sourced sub-quota) is tight: recyclate availability and quality could make compliance expensive; the phase-in and review clauses are the safety valve.',
      },
      relevance: {
        rationale:
          'Targets a real gap: voluntary recyclate demand collapsed with virgin-price swings, and automotive is the highest-value sink for circular materials. Also directly relevant to steel decarbonisation via future scrap-share requirements.',
      },
      coherence: {
        rationale:
          'Fits the ESPR/CPR circularity architecture, but the recycled-steel delegated act must be squared with the ESPR steel act, EU scrap-export policy and the IAA low-carbon steel definitions — several moving parts, one material.',
      },
      euAddedValue: {
        rationale:
          'Vehicle type-approval is a single-market competence; only EU-level quotas can create a harmonised recyclate market at automotive scale.',
      },
    },
    overallRead:
      'The proof-of-concept for quantity-based lead markets in private products. The steel/aluminium delegated act is the piece to watch for the industry storyline.',
    keyData: [
      {
        label: 'Recycled plastic quota',
        value: '15% at entry-into-force +6 yrs → 25% at +10 yrs; ≥20% of it from ELVs',
        source: 'Provisional agreement Dec 2025 / Council adoption June 2026',
      },
      {
        label: 'Steel & aluminium',
        value: 'Delegated act within 2 yrs to set minimum recycled ferrous-scrap and aluminium shares',
        source: 'Council of the EU, adopted text',
      },
      {
        label: 'Application',
        value: 'Regulation applies 2 years after entry into force',
        source: 'Council press, 29 June 2026',
      },
    ],
    sources: [
      {
        label: 'EP Legislative Train — ELV circularity requirements',
        url: 'https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-rules-on-end-of-life-vehicles-and-type-approval-of-motor-vehicles',
      },
      {
        label: 'Council document ST-6759-2026 (compromise text)',
        url: 'https://data.consilium.europa.eu/doc/document/ST-6759-2026-INIT/en/pdf',
      },
      {
        label: 'CDX — EU formally adopts the ELV Regulation',
        url: 'https://public.cdxsystem.com/en/web/cdx/w/eu-formally-adopts-end-of-life-vehicles-regulation-what-it-means-for-the-automotive-supply-chain',
      },
    ],
    handoverNotes:
      'Publication in the OJ and exact entry-into-force date should land summer/autumn 2026 — update the dates then. The recycled-steel delegated act (due ~2028) is the crossover point with the low-carbon steel agenda.',
  },
  {
    id: 'fuel-quotas',
    name: 'Clean-fuel demand quotas — ReFuelEU Aviation, FuelEU Maritime, RED III industry target',
    shortName: 'Fuel quotas',
    category: 'quota',
    status: 'in-force',
    statusDetail:
      'ReFuelEU Aviation (Reg. (EU) 2023/2405): SAF blending 2% from 2025, 6% 2030, 70% 2050; synthetic-fuel sub-mandate from 2030. FuelEU Maritime (Reg. (EU) 2023/1805): GHG-intensity of ship energy −2% 2025 tightening to −80% 2050, RFNBO multiplier to 2033. RED III (Dir. (EU) 2023/2413, Art. 22a): 42% of industrial hydrogen from RFNBOs by 2030 (60% by 2035).',
    reference:
      'Reg. (EU) 2023/2405; Reg. (EU) 2023/1805; Dir. (EU) 2023/2413 Art. 22a',
    sectors: 'Aviation, maritime, industrial hydrogen users (refining, chemicals, fertilisers)',
    description:
      'The purest lead-market instruments in force: legally mandated minimum shares of sustainable aviation fuel, falling GHG-intensity of marine energy, and renewable-hydrogen shares in industry — quantity signals that create offtake for clean fuels regardless of the fossil price.',
    leadMarketMechanism:
      'Quotas translate directly into bankable demand volumes (SAF offtake contracts, e-fuel FIDs, electrolyser projects), shifting the green premium onto users (airlines, shipping lines, industrial H₂ consumers) with flexibility/pooling mechanisms to contain cost.',
    assessment: {
      effectiveness: {
        rationale:
          '2025 was the first compliance year and the 2% SAF mandate was broadly deliverable — but nearly all supply is HEFA-based, the 2030 synthetic sub-mandate still lacks FIDs at scale, and RED III industry-target transposition is late in many Member States. The signal works; delivery of advanced volumes lags.',
      },
      efficiency: {
        rationale:
          'Quotas avoid public spending but concentrate compliance cost on users with few abatement alternatives (SAF at 2–6× fossil kerosene). Flexibility mechanisms (pooling, banking, the ETS SAF allowances top-up) mitigate; whether e-fuel sub-mandates are the cheapest route to those molecules remains contested.',
      },
      relevance: {
        rationale:
          'Aviation, shipping and industrial hydrogen are exactly the segments where carbon pricing alone cannot trigger first-of-a-kind fuel plants — the demand-gap diagnosis holds squarely.',
      },
      coherence: {
        rationale:
          'Interlocks with ETS/ETS2 and the hydrogen framework, but feedstock competition across the three regimes, the RFNBO delegated-act strictness debate, and uneven RED III transposition create friction; the 2026–27 reviews will need to reconcile ambition with actual supply.',
      },
      euAddedValue: {
        rationale:
          'Fuel mandates for inherently cross-border transport modes only work as single-market rules — national SAF mandates (pre-ReFuelEU) were fragmenting exactly this market.',
      },
    },
    overallRead:
      'The working demonstration that binding quotas create lead markets — and of the limits: quotas deliver the cheapest compliant product (HEFA), not automatically the transformative one (e-fuels), unless sub-mandates and enforcement hold.',
    keyData: [
      {
        label: 'SAF mandate trajectory',
        value: '2% (2025) → 6% (2030, incl. 1.2% synthetic avg. 2030–31) → 20% (2035) → 70% (2050)',
        source: 'Reg. (EU) 2023/2405, Annex I',
      },
      {
        label: 'FuelEU Maritime trajectory',
        value: 'GHG-intensity of energy used on board: −2% (2025) → −6% (2030) → −80% (2050)',
        source: 'Reg. (EU) 2023/1805',
      },
      {
        label: 'RED III industry target',
        value: '42% of industrial H₂ from RFNBOs by 2030; 60% by 2035',
        source: 'Dir. (EU) 2023/2413, Art. 22a',
      },
    ],
    sources: [
      {
        label: 'ReFuelEU Aviation — Reg. (EU) 2023/2405 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2405',
      },
      {
        label: 'FuelEU Maritime — Reg. (EU) 2023/1805 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805',
      },
      {
        label: 'RED III — Dir. (EU) 2023/2413 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413',
      },
      {
        label: 'EASA/Commission — ReFuelEU Aviation implementation hub',
        url: 'https://www.easa.europa.eu/en/domains/environment/refueleu-aviation',
      },
    ],
    handoverNotes:
      'For the transport chapter: check 2025 compliance data (first ReFuelEU/FuelEU reporting lands 2026) and the state of RED III Art. 22a transposition. The e-fuel sub-mandate supply outlook is the credibility test to flag.',
  },
];

/* ── Downstream standards ──────────────────────────────────────────────── */

export type StandardType =
  | 'definition'
  | 'label'
  | 'product-standard'
  | 'methodology'
  | 'international';

export const STANDARD_TYPE_META: Record<StandardType, { label: string; color: string }> = {
  definition: { label: 'Legal definition / classes', color: '#004B7F' },
  label: { label: 'Label / classification', color: '#FF9933' },
  'product-standard': { label: 'Product standard', color: '#007B6C' },
  methodology: { label: 'Accounting methodology', color: '#6667AB' },
  international: { label: 'International convergence', color: '#A530B8' },
};

export interface DownstreamStandard {
  id: string;
  name: string;
  type: StandardType;
  status: string;
  description: string;
  whyItMatters: string;
  watchPoints: string;
  sources: SourceLink[];
}

export const DOWNSTREAM_STANDARDS: DownstreamStandard[] = [
  {
    id: 'espr-steel-da',
    name: 'ESPR delegated acts for iron & steel and aluminium (+ Digital Product Passport)',
    type: 'definition',
    status: 'Steel DA targeted 2026 (compliance ~2028); aluminium 2027 (~2029)',
    description:
      'Will set the harmonised ecodesign requirements for the two key intermediate materials — expected to cover embodied carbon (per kg), recycled content and traceability — and attach a Digital Product Passport carrying the data through the value chain.',
    whyItMatters:
      'This is where "low-carbon steel" gets its binding EU definition. The IAA\'s minimum procurement shares and any mandatory GPP act are legally anchored to these classes; every quarter of delay pushes the whole lead-market machinery back.',
    watchPoints:
      'Draft consultation expected late 2026. Check: alignment of the carbon-intensity classes with CBAM/ETS methodology and the IAA interim classification; treatment of scrap-based vs primary routes (the "sliding scale" debate); whether an Art. 65 mandatory-GPP act is trailed.',
    sources: [
      {
        label: 'Commission — ESPR working plan 2025–2030',
        url: 'https://green-forum.ec.europa.eu/news/2025-2030-working-plan-2025-07-11_en',
      },
      {
        label: 'One Click LCA — ESPR working plan analysis',
        url: 'https://oneclicklca.com/en/resources/articles/first-espr-working-plan',
      },
    ],
  },
  {
    id: 'iaa-voluntary-label',
    name: 'Voluntary GHG-intensity classification for industrial products (IAA interim scheme)',
    type: 'label',
    status: 'Proposed in the IAA (Mar 2026) as an interim, voluntary scheme',
    description:
      'Until ESPR/CPR delegated acts land, the Commission may run a voluntary carbon-intensity classification for industrial products (steel first), built on EU ETS data and CBAM accounting methods. Successor to the Clean Industrial Deal\'s promised "voluntary carbon intensity label" originally slated for 2025.',
    whyItMatters:
      'Interim price discovery: lets front-runner producers differentiate near-zero products and lets buyers specify classes in contracts before the binding definitions exist.',
    watchPoints:
      'Widely criticised (incl. by producers and the Climate Group) as too weak — voluntary classes may not support investment decisions. Trilogue may upgrade it to mandatory; that single design choice materially changes the effectiveness of the whole IAA lead-market pillar.',
    sources: [
      {
        label: 'Carbon Brief Q&A — Made in Europe rules',
        url: 'https://www.carbonbrief.org/qa-what-the-eus-new-industry-and-made-in-europe-rules-mean-for-climate-action/',
      },
      {
        label: 'Climate Group — call for a mandatory harmonised low-carbon steel definition',
        url: 'https://www.theclimategroup.org/our-work/news/we-need-mandatory-harmonised-eu-definition-low-carbon-steel-established-without-delay',
      },
      {
        label: 'GMK Center — IAA effects on the EU steel market',
        url: 'https://gmk.center/en/posts/industrial-accelerator-act-how-the-new-industrial-policy-will-affect-the-eu-steel-market/',
      },
    ],
  },
  {
    id: 'cpr-classes',
    name: 'Construction Products Regulation (EU) 2024/3110 — environmental declarations & carbon classes',
    type: 'product-standard',
    status: 'In force Jan 2025; applies progressively from 2026 as harmonised specs are adopted',
    description:
      'Rewrites the rules for placing construction products on the EU market: mandatory declaration of environmental performance (life-cycle, incl. GWP) in the Declaration of Performance and Conformity, digital product passports for construction, and empowerments to set threshold classes — the vehicle for low-carbon cement and concrete classes referenced by the IAA.',
    whyItMatters:
      'Construction is where public procurement meets materials: works contracts are the main channel through which minimum low-carbon shares for cement/concrete/steel will bite. Without CPR carbon classes, works-tender requirements have no harmonised metric.',
    watchPoints:
      'Pace of the harmonised technical specifications (acquis process is historically slow); cement/concrete class thresholds; interaction with EN 197-5/-6 low-clinker cement standards and national annexes that still block some low-clinker cements.',
    sources: [
      {
        label: 'CPR — Regulation (EU) 2024/3110 (EUR-Lex)',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3110',
      },
      {
        label: 'Commission — construction products review',
        url: 'https://single-market-economy.ec.europa.eu/sectors/construction/construction-products-regulation-cpr_en',
      },
    ],
  },
  {
    id: 'cbam-methodology',
    name: 'CBAM embedded-emissions methodology as the common accounting standard',
    type: 'methodology',
    status: 'Operational rules issued Dec 2025; definitive regime from Jan 2026',
    description:
      'The CBAM implementing framework (system boundaries, actual vs default values, verification) is becoming the de-facto EU standard for product-level embedded emissions in steel, cement, aluminium, fertilisers and hydrogen — explicitly reused by the IAA classification and expected to inform ESPR material classes.',
    whyItMatters:
      'One accounting language across border adjustment, labels and procurement criteria is what keeps compliance cost tolerable and prevents gaming between regimes.',
    watchPoints:
      'Default-value stringency for the downstream extension; treatment of scrap and electricity emissions factors; mutual recognition questions with international schemes (IDDI, ISO/GHG Protocol steel guidance).',
    sources: [
      {
        label: 'Mayer Brown — CBAM operational rules (Dec 2025)',
        url: 'https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-issues-cbam-operational-rules-and-proposes-downstream-extension-of-the-cbam-scope',
      },
      {
        label: 'Commission — CBAM (taxation & customs)',
        url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
      },
    ],
  },
  {
    id: 'low-clinker-cement',
    name: 'Low-clinker cement standards — EN 197-5/-6 and national adoption',
    type: 'product-standard',
    status: 'European standards published; national implementation uneven',
    description:
      'EN 197-5 (CEM II/C-M, CEM VI) and EN 197-6 (recycled fines) allow substantially lower clinker factors than classic CEM I/II — the cheapest near-term cement decarbonisation lever — but usability depends on national application documents, exposure-class rules and public-works specifications that in several Member States still default to high-clinker cements.',
    whyItMatters:
      'A lead market for low-carbon cement fails at the last metre if works specifications (often set by public buyers themselves) forbid the very cements the classes reward — a concrete example of downstream standards as the binding constraint.',
    watchPoints:
      'National concrete-standard revisions; whether the IAA/CPR works requirements reference performance-based (rather than recipe-based) concrete specs.',
    sources: [
      {
        label: 'CEN — EN 197-5:2021 (via CEN catalogue)',
        url: 'https://standards.cencenelec.eu/dyn/www/f?p=CEN:110:0::::FSP_PROJECT:69015',
      },
      {
        label: 'Cembureau — low-carbon cement standards positions',
        url: 'https://cembureau.eu/policy-focus/',
      },
    ],
  },
  {
    id: 'iddi',
    name: 'IDDI & international near-zero definitions (steel / cement)',
    type: 'international',
    status: 'Ongoing — UNIDO/CEM initiative; green procurement pledges by members',
    description:
      'The Industrial Deep Decarbonisation Initiative coordinates public-procurement pledges for low-emission steel and cement and works toward shared near-zero definitions and disclosure frameworks internationally, alongside ResponsibleSteel, the IEA near-zero thresholds and the GHG Protocol/ISO steel guidance.',
    whyItMatters:
      'EU lead markets interact with export markets: if EU classes diverge from the definitions used by other IDDI members (UK, Canada, Germany, India, US states), producers face duplicate certification and the global demand pool fragments — the added-value case for convergence.',
    watchPoints:
      'Whether the IAA/ESPR classes reference or mutually recognise IEA/IDDI near-zero thresholds; procurement-pledge follow-through by members.',
    sources: [
      {
        label: 'UNIDO — Industrial Deep Decarbonisation Initiative',
        url: 'https://www.unido.org/IDDI',
      },
      {
        label: 'IEA — Achieving Net Zero Heavy Industry Sectors in G7 Members (near-zero definitions)',
        url: 'https://www.iea.org/reports/achieving-net-zero-heavy-industry-sectors-in-g7-members',
      },
    ],
  },
];

/* ── What to watch (handover timeline) ─────────────────────────────────── */

export interface WatchItem {
  when: string;
  what: string;
  policyId: string;
}

export const WATCH_TIMELINE: WatchItem[] = [
  {
    when: 'H2 2026',
    what: 'Public Procurement Act proposal (revision of Dirs 2014/23/24/25) — check mandatory floors for sustainability criteria and the European-preference design.',
    policyId: 'pp-act',
  },
  {
    when: 'H2 2026',
    what: 'First NZIA-compliant renewables auction rounds under the 30%/6 GW non-price-criteria floor — first empirical effectiveness evidence.',
    policyId: 'nzia-procurement',
  },
  {
    when: 'H2 2026',
    what: 'CBAM downstream-extension trilogues (Council GA June 2026, ENVI position adopted) — product list, default values, Temporary Decarbonisation Fund.',
    policyId: 'cbam-downstream',
  },
  {
    when: 'Late 2026',
    what: 'ESPR iron & steel delegated act draft — carbon-intensity classes, scrap treatment, alignment with CBAM methodology and IAA classification.',
    policyId: 'espr-gpp',
  },
  {
    when: 'Autumn/winter 2026',
    what: 'IAA joint-committee draft report (ITRE/IMCO/INTA) and Council general approach — ambition of minimum low-carbon shares; voluntary vs mandatory label.',
    policyId: 'iaa-lead-markets',
  },
  {
    when: 'Summer/autumn 2026',
    what: 'ELV Regulation publication in the OJ — fix entry-into-force and quota dates; then the recycled-steel/aluminium delegated act (~2028).',
    policyId: 'elv-quotas',
  },
  {
    when: '2026–27',
    what: 'First ReFuelEU/FuelEU compliance reporting (2025 data) and RED III Art. 22a transposition state — quota-delivery evidence for the transport chapter.',
    policyId: 'fuel-quotas',
  },
];
