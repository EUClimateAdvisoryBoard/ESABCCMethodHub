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
