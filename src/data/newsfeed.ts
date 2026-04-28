/**
 * Seed news-feed items bundled with the app.
 * ------------------------------------------
 * Shipped dataset of curated climate-policy news headlines, used
 * when the live RSS pipeline has not yet populated `news_articles`
 * (fresh deploy, offline demo, CI build). The live pipeline
 * (`scripts/fetch-news.js` + `scripts/generate-daily-summary.js`)
 * takes over as soon as it runs once.
 *
 * Source attribution lives in `sourceLabel`; `autoSuggestTags` and
 * `AUTO_TAG_KEYWORDS` are hand-curated helpers used by M·03 to
 * propose tags to the user before they commit them.
 */
export interface NewsComment {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: 'european_commission' | 'eea' | 'european_council' | 'ipcc' | 'unfccc' | 'internal' | 'email_news_in' | 'other';
  sourceLabel: string;
  url: string;
  publishedDate: string;
  addedDate: string;
  addedBy: string;
  type: 'article' | 'paper' | 'press_release' | 'report' | 'internal_note';
  tags: string[];
  isExternal: boolean;
  likes: number;
  comments: NewsComment[];
  linkedReferenceId?: string;
  fullText?: string;
  aiSummary?: string;
  detailedAnalysis?: string;
  isDailySpecial?: boolean;
  specialKind?: string;
  // Identifier for an inline figure component to render inside the card.
  // Only a fixed set of values is wired up in the UI (see news-feed/page.tsx).
  figureKind?: string;
}

// ── Seeded (static) news feed items ────────────────────────────────────────
// These ship with the app and are kept separate from the Supabase-backed
// custom posts and inbound-email items — the fetch loops only replace items
// they own, so these stay pinned to the feed.

export const newsFeedItems: NewsItem[] = [
  {
    id: 'nf-seed-one-europe-one-market-apr2026',
    title: 'EU agenda update — One Europe, One Market roadmap (24 Apr) and Better Regulation Communication (28 Apr)',
    summary:
      'Two key policy documents shaping the EU\'s priorities and working methods for the coming period have just been adopted. On 24 April, the Council, the Parliament and the Commission signed the "One Europe, One Market" roadmap on the sidelines of the informal meeting of Heads of State or Government in Cyprus — a political and operational commitment, with a concrete action plan and targets to be achieved by the end of 2027. On 28 April (this afternoon), the European Commission adopted a Communication on better regulation — "A Simpler, Clearer and Better Enforced EU Rulebook" — which complements the roadmap with a strong focus on enforcing the single-market rulebook. The figure below maps the priority actions across the five strategic building blocks against the quarterly proposal and target-for-agreement deadlines, including the tight ETS review (proposal Q3 2026, target agreement Q1 2027) and the Circular Economy Act (proposal Q3 2026, target agreement Q3 2027).',
    source: 'european_commission',
    sourceLabel: 'European Commission / European Council',
    url: 'https://commission.europa.eu/news/one-europe-one-market-roadmap_en',
    publishedDate: '2026-04-28',
    addedDate: '2026-04-28',
    addedBy: 'ESABCC Secretariat',
    type: 'press_release',
    tags: ['policy', 'climate', 'energy', 'emissions', 'industry', 'mitigation'],
    isExternal: false,
    likes: 0,
    comments: [],
    isDailySpecial: true,
    specialKind: 'extraordinary_news',
    figureKind: 'one-europe-one-market-apr2026',
    fullText:
      'Dear colleagues,\n\n' +
      'Two key policy documents that shed light on the EU\'s key priorities and working methods for the coming period have been adopted recently and deserve to be noticed:\n\n' +
      'On 24 April, the Council, the Parliament, and the Commission signed on the sidelines of the informal meeting of Heads of State or Government in Cyprus the "One Europe, One Market" roadmap, a political and operational commitment, with the aim to rapidly strengthen Europe\'s competitiveness via a concrete action plan and targets set to be achieved by the end of 2027.\n\n' +
      'On 28 April, earlier this afternoon, the European Commission adopted a Communication on better regulation – "A Simpler, Clearer and Better Enforced EU Rulebook", aimed at modernising how EU laws are designed, implemented and enforced, while ensuring they are clear, agile, and fit for purpose. The document somehow complements the One Europe, One Market roadmap as it places a particular focus on enforcing the single market rulebook.\n\n' +
      '── One Europe, One Market roadmap ──\n\n' +
      'As a reminder, at their informal retreat on 12 February on strengthening the EU single market in a new geoeconomic context, EU leaders discussed various ways to improve the EU\'s competitiveness, building further on the famous Draghi and Letta reports published in 2024. As a follow-up, the results of those discussions were supposed to be translated into concrete commitments and timelines at the European Council of 19-20 March, in the form of a "One Europe, One Market Roadmap and Action Plan". The developments in the Middle East forced EU leaders at the time to focus on a short-term energy crisis and energy security, instead of talking about long-term competitiveness which was the original aim. The building blocks of a "One Europe, One Market" agenda had been agreed by the EU leaders, nevertheless.\n\n' +
      'With some delay, preparations continued and led to the adoption of the Joint "One Europe, One Market Roadmap", endorsed by the European Parliament, the Council of the European Union, and the European Commission; and finally signed last Friday. The document is both a political and operational commitment, translated in a concrete action plan and targets set to be achieved by the end of 2027.\n\n' +
      'Key legislative and policy initiatives are outlined across five strategic building blocks, each proposal coming with a target for agreement: (1) Simplifying rules; (2) A more integrated Single Market; (3) Championing strong trade; (4) Reducing energy prices and decarbonising; (5) Driving the digital and AI transformation. The roadmap also includes clear responsibilities for all EU institutions, which will meet on a quarterly basis to take stock of progress and update the roadmap when necessary.\n\n' +
      'Most relevant priority actions (proposal → target for agreement):\n\n' +
      'Simplifying rules\n' +
      '  • Omnibus on energy products — Q3 2026 → Q4 2027.\n\n' +
      'A more integrated Single Market\n' +
      '  • EU Inc. — Q1 2026 → end of 2026.\n' +
      '  • Industrial Accelerator Act — Q1 2026 → end of 2026.\n' +
      '  • Public Procurement Act — Q2 2026 → Q4 2027.\n' +
      '  • Critical Raw Materials Centre — Q2 2026 → end of 2026.\n' +
      '  • Circular Economy Act — Q3 2026 → Q3 2027.\n\n' +
      'Reducing energy prices and decarbonising\n' +
      '  • European Grids package — Q4 2025 → Q3 2026.\n' +
      '  • Energy Highways (investment projects) — Q4 2025 → launch from April 2026 onwards.\n' +
      '  • Amendment to the Market Stability Reserve — Q2 2026 → end of 2026.\n' +
      '  • Network charges and taxation — Q2 2026 → Q2 2027.\n' +
      '  • Energy security package — Q2 2026 → Q2 2027.\n' +
      '  • ETS review — Q3 2026 → Q1 2027.\n' +
      '  • Update of the governance of the Energy Union — Q4 2026 → Q4 2027.\n' +
      '  • Energy efficiency framework — Q3 2026 → Q4 2027.\n' +
      '  • Renewable energy framework — Q3 2026 → Q4 2027.\n\n' +
      '── A Simpler, Clearer and Better Enforced EU Rulebook ──\n\n' +
      'The Communication aims to modernise how EU laws are designed, implemented and enforced, along five key objectives:\n\n' +
      '(1) Simplicity by design — regulatory discipline; future-proof and adaptive regulation; leaner and more accessible legislation; realistic transposition and implementation deadlines; tapping into technological progress to streamline legislation; enforcement by design.\n\n' +
      '(2) Further improving the better-regulation framework — targeted improvements to increase both the number and the relevance of impact assessments (a "matrix of key impacts" with costs/benefits and supporting figures, data and statistics); minimum requirements for accelerated pathways under shocks or crises; a smarter and more flexible consultation system (one consultation per initiative); a shared understanding with the other institutions of what constitutes a "substantial amendment", with quantification of costs/savings via a simple cost calculation method.\n\n' +
      '(3) Regulatory deep cleaning — each Member of the College screens the legislative stock under their responsibility for relevance and fitness. The action plan focuses on 12 areas to be examined as a priority in 2026 and 2027, supported by a high-level stakeholder group (the Simplification Platform). EEA-relevant focus areas include:\n' +
      '  • Transport.\n' +
      '  • Energy — a comprehensive review of the energy governance framework will reduce reporting requirements for Member States.\n' +
      '  • Climate — the EU ETS will aim to simplify and remove outdated provisions, simplifying monitoring, reporting and verification; the cleaning will look into merging the LULUCF and the Effort Sharing Regulation into a single instrument on national climate targets.\n' +
      '  • Environment — the Circular Economy Act will address obstacles to the smooth functioning of the single market; the Marine Strategy Framework Directive will be revised to simplify implementation and reduce administrative burdens, with synergies to the preparation of the Ocean Act and a possible consolidation of the legal framework around the Spatial Planning Directive.\n' +
      '  • Housing and permitting — a deep cleaning of permitting rules across legislation, beyond those already published, with a view to simplifying and clarifying cross-cutting elements.\n\n' +
      '(4) Tackling regulatory gold-plating — a toolkit of best practices and criteria will help Member States identify and avoid gold-plating in national transposition and implementation, including through the European Semester and the Single Market Enforcement Taskforce.\n\n' +
      '(5) Better implementation and robust enforcement — eleven single-market focus areas have been identified for proactive enforcement. Notably:\n' +
      '  • Circular economy, packaging and waste — several Member States apply the Directives incorrectly and have not reached the recycling targets for municipal and packaging waste, which is critical to the availability of secondary raw materials.\n' +
      '  • Empowering consumers through electricity demand response — several Member States are late in fully and correctly transposing the requirements of the Electricity Directive on demand response, flexibility and aggregation, and the roll-out of smart meters.\n' +
      '  • Construction and installation services related to the green transition.\n\n' +
      'The Commission will accelerate enforcement actions where directives are not transposed, including by using dedicated AI tools to assist in checking how Member States transpose EU laws. Support to Member States will be provided through implementation strategies, transposition roadmaps, tailored guidance and dedicated working groups.\n',
    detailedAnalysis:
      'Why this matters for ESABCC. Two of the most ambitious files on the Board\'s radar — the ETS review and the Circular Economy Act — now have firm Council target dates (Q1 2027 and Q3 2027 respectively), with proposals only landing in Q3 2026. That leaves an unusually short negotiation window of one to four quarters, which sharpens the question of how much technical scrutiny is realistic before Council positions harden. The roadmap also bundles three energy framework files (efficiency, renewables, Energy Union governance) on a single Q4 2027 horizon, signalling that simplification will be the dominant frame — including a possible merger of LULUCF and the Effort Sharing Regulation into one instrument on national climate targets, a structurally important change for the Board\'s climate-target advice.\n\n' +
      'Reading the timeline: the front-loaded actions are energy-grid and energy-security ones (European Grids package, Energy Highways, Energy security package, MSR amendment) — all proposed by Q2 2026 with agreement targeted for 2026 or H1 2027. The climate-policy core (ETS review, Circular Economy Act, energy-efficiency and renewables frameworks) all share a Q3 2026 proposal slot, which will create competing demands on Council working-party bandwidth and on stakeholder consultation capacity.\n\n' +
      'On the better-regulation side, three signals deserve close watching: (i) the new "matrix of key impacts" template will reshape how climate, environmental and social costs/benefits are presented in impact assessments; (ii) the introduction of a "substantial-amendment assessment" doctrine, shared with Parliament and Council, may become a lever to slow Council-side ambition raises; (iii) the deep-cleaning of the energy governance framework explicitly targets Member States\' reporting obligations, which the Board relies on for monitoring progress towards 2030 and 2040 climate goals.\n\n' +
      'The eleven focus areas for single-market enforcement add a third layer: the Commission will more proactively investigate Member States in circular economy/packaging/waste and in electricity demand response and smart-meter roll-out — both areas where transposition gaps directly translate into mitigation under-delivery. ESABCC may want to flag in its next advice that simplification, ambition and enforcement need to be sequenced — not traded off — and to call for the matrix of key impacts to systematically include the science-based 2040 trajectory as a benchmark.',
  },
  {
    id: 'nf-seed-ets-positions-apr2026',
    title: 'EPRS figure: EU Member State positions on the EU ETS review (April 2026)',
    summary:
      'EPRS has published an overview of where EU Member States stand on eleven options currently debated in the EU ETS review. Out of 21 capitals tracked, the picture is deeply fragmented: only one single-country position (PL backing a Carbon Central Bank) is shared, while Pause ETS1 and Postpone ETS2 split the Council roughly down the middle. Two rows stand out as clear majority positions against further ambition — a slower phase-out of free allocation (12 Member States in favour, none opposed) and pushing back ETS2 (8 opposed vs. 5 in favour, including a Franco-German axis against pause and several Central/Eastern European capitals in favour of postponement). The remaining nine rows are sparsely populated, signalling that most governments have not yet taken a public position on carbon central banking, market stability, speculation, or international credits. This is an extraordinary news item for the Secretariat because the review is now entering the decisive Council working-party phase and this map defines the negotiating geometry.',
    source: 'internal',
    sourceLabel: 'ESABCC Secretariat',
    url: '',
    publishedDate: '2026-04-17',
    addedDate: '2026-04-17',
    addedBy: 'ESABCC Secretariat',
    type: 'internal_note',
    tags: ['climate', 'policy', 'emissions', 'mitigation'],
    isExternal: false,
    likes: 0,
    comments: [],
    isDailySpecial: true,
    specialKind: 'extraordinary_news',
    figureKind: 'eu-ets-positions-apr2026',
    detailedAnalysis:
      'Reading the columns: the Franco-German axis (DE + FR) is aligned against adding international credits to the EU ETS and against pausing ETS1, but splits on postponing ETS2 (FR opposed, DE silent). A Visegrád-plus bloc (CZ, HU, PL, SK) is broadly on the side of postponement, pauses, and a slower free-allocation phase-out. A core of traditionally ambitious capitals (DK, SE, FI) is explicitly opposed to pausing ETS1 and postponing ETS2, preserving the market signal. Netherlands and Poland diverge sharply on international credits and on reducing the LRF. Southern Member States (ES, IT, EL, PT) concentrate their support around a slower free-allocation phase-out and, for ES and IT, around a price corridor / cap. Reading the rows: the eleven options fall into three clusters — (1) market-weakening measures (pause ETS1, postpone ETS2, reduced LRF, slower free allocation phase-out) where most of the positions are found; (2) market-architecture measures (Carbon Central Bank, MWI, stronger MSR, stronger Art. 29a, price corridor / cap) where positions are sparse but the few that exist are almost all "in favour"; and (3) integrity measures (tackle speculation, international credits) where the field is polarised. Implication for ESABCC: the Council centre of gravity currently leans towards weakening short-term ambition (postpone ETS2, slow free-allocation phase-out) rather than towards structural reform. The Board should flag that market-architecture options that would stabilise prices without lowering the cap command quiet support and deserve more visibility in its next advice.',
  },
];

// ── Default shared ("ESABCC") reading list seed ────────────────────────────
// The shared reading list on the News Feed page is stored in localStorage per
// browser, but the Secretariat can pin items here so they show up as baseline
// "must-read" entries on every device. User-added items are merged on top and
// deletions persist via the exclusion list stored alongside.

export interface DefaultSharedReadingItem {
  id: string;
  title: string;
  authors: string;
  url: string;
  kind: 'paper' | 'report' | 'book' | 'article' | 'news' | 'other';
  priority: 'must-read' | 'important' | 'nice-to-have';
  notes: string;
  addedByName: string;
  addedDate: string;
  sourceType?: string;
  sourceId?: string;
}

export const DEFAULT_SHARED_READING_LIST: DefaultSharedReadingItem[] = [
  {
    id: 'srl-seed-ets-positions-apr2026',
    title: 'EPRS figure: EU Member State positions on the EU ETS review (April 2026)',
    authors: 'Killmayer, L. (graphic); EPRS (compilation)',
    url: '',
    kind: 'report',
    priority: 'must-read',
    notes:
      'Dot-matrix of 21 Member State positions across 11 ETS-review options. Extraordinary-news pick — defines the Council negotiating geometry ahead of the working-party phase. Flagged for the ESABCC reading list.',
    addedByName: 'ESABCC Secretariat',
    addedDate: '2026-04-17',
    sourceType: 'news-feed',
    sourceId: 'nf-seed-ets-positions-apr2026',
  },
];

export const AUTO_TAG_KEYWORDS: Record<string, string[]> = {
  climate: ['climate', 'greenhouse', 'warming', 'temperature', 'CO2', 'carbon'],
  energy: ['energy', 'renewable', 'solar', 'wind', 'electricity', 'fossil', 'fuel'],
  adaptation: ['adaptation', 'resilience', 'resilient', 'risk', 'vulnerability', 'flood', 'drought', 'heat'],
  mitigation: ['mitigation', 'reduction', 'reduce', 'abatement', 'sequestration', 'capture'],
  transport: ['transport', 'mobility', 'vehicle', 'aviation', 'shipping', 'rail', 'EV'],
  agriculture: ['agriculture', 'farming', 'food', 'land use', 'soil', 'livestock', 'crop'],
  biodiversity: ['biodiversity', 'ecosystem', 'species', 'habitat', 'nature', 'forest'],
  policy: ['policy', 'regulation', 'directive', 'legislation', 'law', 'framework', 'strategy'],
  emissions: ['emissions', 'GHG', 'CO2', 'methane', 'nitrous oxide', 'fluorinated'],
  industry: ['industry', 'industrial', 'manufacturing', 'cement', 'steel', 'chemicals'],
};

export function autoSuggestTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(AUTO_TAG_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      tags.push(tag);
    }
  }
  return tags;
}
