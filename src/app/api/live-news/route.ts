import { NextRequest, NextResponse } from 'next/server';

/**
 * Live News API — Aggregates climate policy news from EU institutions and global sources
 *
 * Fetches RSS feeds from:
 * - European Commission Press Corner
 * - European Environment Agency (EEA)
 * - Carbon Brief
 * - Climate Home News
 * - UNFCCC
 * - Council of the EU
 *
 * Optional: GNews API for broader coverage (set GNEWS_API_KEY env var)
 *
 * GET /api/live-news                    — all sources
 * GET /api/live-news?source=ec          — European Commission only
 * GET /api/live-news?source=eea         — EEA only
 * GET /api/live-news?q=green+deal       — keyword filter
 */

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  sourceLabel: string;
  published: string;
  description: string;
  /** Computed relevance score (higher = more important) */
  relevanceScore?: number;
  /** Importance tier derived from relevanceScore */
  importance?: 'high' | 'medium' | 'normal';
}

// ── RSS feed sources ────────────────────────────────────────────────────
const RSS_FEEDS: Record<string, { url: string; label: string; color: string }> = {
  // ── EU Institutions ──
  eea_press: {
    url: 'https://www.eea.europa.eu/en/newsroom/rss-feeds/eeas-press-releases-rss',
    label: 'EEA Press Releases',
    color: '#007B6C',
  },
  eea_articles: {
    url: 'https://www.eea.europa.eu/en/newsroom/rss-feeds/featured-articles-rss',
    label: 'EEA Featured Articles',
    color: '#00665A',
  },
  eea_publications: {
    url: 'https://www.eea.europa.eu/en/newsroom/rss-feeds/publications-rss',
    label: 'EEA Publications',
    color: '#005F53',
  },
  ep_envi: {
    url: 'https://www.europarl.europa.eu/rss/committee/envi/en.xml',
    label: 'EU Parliament ENVI Committee',
    color: '#003399',
  },
  ep_top: {
    url: 'https://www.europarl.europa.eu/rss/en/top-stories.xml',
    label: 'EU Parliament Top Stories',
    color: '#1A47B8',
  },
  climate_adapt: {
    url: 'https://climate-adapt.eea.europa.eu/rss-feed',
    label: 'Climate-ADAPT',
    color: '#2E7D32',
  },
  // ── Climate science & policy media ──
  carbon_brief: {
    url: 'https://www.carbonbrief.org/feed',
    label: 'Carbon Brief',
    color: '#E8712B',
  },
  euractiv_env: {
    url: 'https://www.euractiv.com/sections/energy-environment/feed/',
    label: 'Euractiv Energy & Environment',
    color: '#1565C0',
  },
  euractiv_climate: {
    url: 'https://www.euractiv.com/sections/climate-environment/feed/',
    label: 'Euractiv Climate',
    color: '#1976D2',
  },
  climate_home: {
    url: 'https://www.climatechangenews.com/feed/',
    label: 'Climate Home News',
    color: '#2563EB',
  },
  guardian_climate: {
    url: 'https://www.theguardian.com/environment/climate-crisis/rss',
    label: 'The Guardian - Climate',
    color: '#052962',
  },
  guardian_energy: {
    url: 'https://www.theguardian.com/environment/energy/rss',
    label: 'The Guardian - Energy',
    color: '#0D3B66',
  },
  // ── International climate ──
  iisd_sdg: {
    url: 'https://sdg.iisd.org/feed/',
    label: 'IISD SDG Knowledge Hub',
    color: '#0B7A3E',
  },
  ipcc: {
    url: 'https://www.ipcc.ch/feed/',
    label: 'IPCC',
    color: '#00599C',
  },
  unfccc: {
    url: 'https://unfccc.int/feed/',
    label: 'UNFCCC',
    color: '#00AEEF',
  },
  // ── Energy-specific media ──
  reuters_energy: {
    url: 'https://news.google.com/rss/search?q=when:7d+allinurl:reuters.com+EU+energy+climate&ceid=US:en&hl=en-US&gl=US',
    label: 'Reuters (via Google News)',
    color: '#FF8000',
  },
  bbc_climate: {
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    label: 'BBC Science & Environment',
    color: '#BB1919',
  },
  dw_env: {
    url: 'https://rss.dw.com/xml/rss-en-env',
    label: 'Deutsche Welle Environment',
    color: '#0085C8',
  },
  phys_env: {
    url: 'https://phys.org/rss-feed/earth-news/environment/',
    label: 'Phys.org Environment',
    color: '#336699',
  },
};

// ── Simple XML/RSS parser ───────────────────────────────────────────────
function parseRSSItems(xml: string, source: string, sourceLabel: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const tagRegex = (tag: string) => new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const titleMatch = tagRegex('title').exec(content);
    const linkMatch = tagRegex('link').exec(content);
    const pubDateMatch = tagRegex('pubDate').exec(content);
    const dcDateMatch = tagRegex('dc:date').exec(content);
    const descMatch = tagRegex('description').exec(content);

    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link = (linkMatch?.[1] || linkMatch?.[2] || '').trim();
    const published = (pubDateMatch?.[1] || pubDateMatch?.[2] || dcDateMatch?.[1] || dcDateMatch?.[2] || '').trim();
    const description = (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]*>/g, '').replace(/<[^>]*$/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);

    if (title && link) {
      items.push({ title, link, source, sourceLabel, published, description });
    }
  }
  return items;
}

// ── Fetch a single RSS feed ─────────────────────────────────────────────
async function fetchRSSFeed(key: string, feed: { url: string; label: string }): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feed.url, {
      next: { revalidate: 900 }, // cache 15 min
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, application/json' },
    });
    if (!res.ok) return [];

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Handle JSON responses (EC Press Corner)
    if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const data = JSON.parse(text);
        const results = Array.isArray(data) ? data : (data.results || data.items || []);
        return results.slice(0, 20).map((item: Record<string, string>) => ({
          title: item.title || item.headline || '',
          link: item.url || item.link || '',
          source: key,
          sourceLabel: feed.label,
          published: item.date || item.published || item.pubDate || '',
          description: (item.description || item.summary || item.subtitle || '').replace(/<[^>]*>/g, '').replace(/<[^>]*$/g, '').replace(/\s+/g, ' ').trim().slice(0, 300),
        }));
      } catch { return []; }
    }

    // Parse RSS/XML
    return parseRSSItems(text, key, feed.label);
  } catch {
    return [];
  }
}

// ── GNews API (optional, broader coverage) ──────────────────────────────
async function fetchGNews(query: string = 'EU climate policy'): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map((a: Record<string, string | { name: string }>) => ({
      title: a.title || '',
      link: a.url || '',
      source: 'gnews',
      sourceLabel: typeof a.source === 'object' ? a.source.name : 'GNews',
      published: (a.publishedAt as string) || '',
      description: ((a.description as string) || '').slice(0, 300),
    }));
  } catch { return []; }
}

// ── Route handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  const query = request.nextUrl.searchParams.get('q');

  try {
    let articles: NewsArticle[] = [];

    if (source && RSS_FEEDS[source]) {
      // Fetch single source
      articles = await fetchRSSFeed(source, RSS_FEEDS[source]);
    } else {
      // Fetch all sources in parallel
      const feedPromises = Object.entries(RSS_FEEDS).map(([key, feed]) => fetchRSSFeed(key, feed));
      const gnewsPromise = fetchGNews(query || 'EU climate policy');
      const results = await Promise.allSettled([...feedPromises, gnewsPromise]);
      articles = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    }

    // ── Step 1: Climate / EU policy relevance filter ──────────────────
    // Articles from general media sources (BBC, DW, Guardian, Phys.org)
    // must mention climate/energy/EU policy topics to be included.
    // EU-institution and policy-media sources pass through unfiltered.

    const EU_INSTITUTION_KEYS = new Set([
      'eea_press', 'eea_articles', 'eea_publications',
      'ep_envi', 'ep_top', 'climate_adapt',
    ]);
    const POLICY_MEDIA_KEYS = new Set([
      'euractiv_env', 'euractiv_climate', 'carbon_brief', 'climate_home',
      'ipcc', 'unfccc', 'iisd_sdg',
    ]);
    const GENERAL_MEDIA_KEYS = new Set([
      'guardian_climate', 'guardian_energy', 'bbc_climate',
      'dw_env', 'reuters_energy', 'phys_env', 'gnews',
    ]);

    // Climate & EU policy keyword patterns for filtering general media
    const CLIMATE_FILTER_RE = /\b(climate|emission|carbon|green\s*deal|renewable|sustainability|biodiversity|net.?zero|decarboni[sz]|fossil\s*fuel|energy\s*transition|global\s*warming|greenhouse|cop\s*\d{2}|paris\s*agreement)\b/i;
    const EU_POLICY_FILTER_RE = /\b(eu\b|european|europe|brussels|commission|parliament|council|ets\b|cbam|fit\s*for\s*55|eea\b|taxonomy|lulucf|effort\s*sharing|red\s*(ii|iii)|epbd|csrd|sfdr|fueleu|refueleu|euro\s*7)\b/i;

    // Filter: general media must be climate-relevant
    articles = articles.filter(a => {
      if (EU_INSTITUTION_KEYS.has(a.source) || POLICY_MEDIA_KEYS.has(a.source)) return true;
      const text = `${a.title} ${a.description}`;
      return CLIMATE_FILTER_RE.test(text);
    });

    // ── Step 2: Deduplication ──────────────────────────────────────────
    // Remove near-duplicate articles (same story from different sources).
    // Normalize titles and detect overlapping words.
    const normalizeTitle = (t: string) =>
      t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    const titleWords = (t: string) => {
      const words = normalizeTitle(t).split(' ').filter(w => w.length > 3);
      return new Set(words);
    };

    const isSimilar = (a: string, b: string): boolean => {
      const wordsA = titleWords(a);
      const wordsB = titleWords(b);
      if (wordsA.size === 0 || wordsB.size === 0) return false;
      let overlap = 0;
      for (const w of wordsA) if (wordsB.has(w)) overlap++;
      const smaller = Math.min(wordsA.size, wordsB.size);
      return overlap / smaller >= 0.6;
    };

    const seen: string[] = [];
    articles = articles.filter(a => {
      for (const t of seen) {
        if (isSimilar(a.title, t)) return false;
      }
      seen.push(a.title);
      return true;
    });

    // ── Step 3: Multi-factor relevance scoring ─────────────────────────
    // Score articles by: source authority, EU policy keywords, climate
    // keywords, specificity of policy mentions, and recency.

    const EU_POLICY_KEYWORDS_TITLE = /\b(eu\b|european\s*(commission|parliament|council|green\s*deal)|brussels|ets\b|cbam|fit\s*for\s*55|green\s*deal|taxonomy|climate\s*law|effort\s*sharing|lulucf|red\s*(ii|iii)|epbd|csrd|sfdr|fueleu|refueleu|net.?zero\s*industry|critical\s*raw\s*materials?|deforestation\s*regulat|ecodesign|batteries?\s*regulat)\b/i;
    const CLIMATE_KEYWORDS_TITLE = /\b(climate|emission|carbon|renewable|decarboni[sz]|fossil\s*fuel|energy\s*transition|global\s*warming|greenhouse|cop\s*\d{2}|paris\s*agreement|net.?zero|biodiversity|nature\s*restoration)\b/i;
    const LEGISLATIVE_KEYWORDS = /\b(regulation|directive|legislation|law|amendment|proposal|vote|adopted|trilogue|plenary|council\s*position|committee\s*report|impact\s*assessment|public\s*consultation)\b/i;

    const now = Date.now();

    const computeRelevance = (a: NewsArticle): number => {
      let score = 0;
      const title = a.title;
      const desc = a.description;
      const text = `${title} ${desc}`;

      // Source authority
      if (EU_INSTITUTION_KEYS.has(a.source)) score += 12;
      else if (POLICY_MEDIA_KEYS.has(a.source)) score += 7;
      else if (GENERAL_MEDIA_KEYS.has(a.source)) score += 2;

      // EU policy keyword matches (title is worth more)
      if (EU_POLICY_KEYWORDS_TITLE.test(title)) score += 8;
      else if (EU_POLICY_KEYWORDS_TITLE.test(desc)) score += 3;

      // Climate keyword matches
      if (CLIMATE_KEYWORDS_TITLE.test(title)) score += 4;
      else if (CLIMATE_KEYWORDS_TITLE.test(desc)) score += 1;

      // Legislative / regulatory specificity (indicates actionable policy news)
      if (LEGISLATIVE_KEYWORDS.test(text)) score += 5;

      // Recency bonus (articles from last 6h get extra weight)
      const pubTime = new Date(a.published).getTime();
      if (pubTime > 0) {
        const ageHours = (now - pubTime) / 3600000;
        if (ageHours < 6) score += 4;
        else if (ageHours < 24) score += 2;
        else if (ageHours < 72) score += 1;
      }

      return score;
    };

    // Assign scores and importance tiers
    for (const a of articles) {
      a.relevanceScore = computeRelevance(a);
      if (a.relevanceScore >= 20) a.importance = 'high';
      else if (a.relevanceScore >= 12) a.importance = 'medium';
      else a.importance = 'normal';
    }

    // Sort by relevance score (desc), then date (desc)
    articles.sort((a, b) => {
      const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const da = new Date(a.published).getTime() || 0;
      const db = new Date(b.published).getTime() || 0;
      return db - da;
    });

    // ── Step 4: Keyword search filter (user query) ─────────────────────
    if (query) {
      const q = query.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      count: articles.length,
      sources: Object.entries(RSS_FEEDS).map(([key, feed]) => ({ key, label: feed.label, color: feed.color })),
      articles: articles.slice(0, 50),
      fetchedAt: new Date().toISOString(),
      gnewsEnabled: !!process.env.GNEWS_API_KEY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
