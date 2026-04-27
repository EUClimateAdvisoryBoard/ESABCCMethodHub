/**
 * Shared RSS feed fetching and parsing logic.
 * Used by both /api/policy-news and /api/rss-feeds route handlers.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PolicyNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  policy_ids: string[];
  source: string;
}

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

/* ------------------------------------------------------------------ */
/*  RSS feed sources                                                   */
/* ------------------------------------------------------------------ */

const RSS_FEEDS: { url: string; source: string }[] = [
  {
    url: 'https://ec.europa.eu/commission/presscorner/api/rss',
    source: 'European Commission',
  },
  {
    url: 'https://www.eea.europa.eu/en/newsroom/news/rss',
    source: 'European Environment Agency',
  },
  {
    url: 'https://www.consilium.europa.eu/en/rss/newsroom/',
    source: 'Council of the EU',
  },
  {
    url: 'https://eur-lex.europa.eu/rss/rss-recent-acts.xml',
    source: 'EUR-Lex',
  },
];

/* ------------------------------------------------------------------ */
/*  Climate / energy keyword filter                                    */
/* ------------------------------------------------------------------ */

const CLIMATE_KEYWORDS = [
  'climate',
  'emission',
  'energy',
  'green deal',
  'carbon',
  'environment',
  'renewable',
  'sustainability',
  'biodiversity',
  'pollution',
  'lulucf',
  'ets',
  'net zero',
  'net-zero',
];

export const CLIMATE_RE = new RegExp(CLIMATE_KEYWORDS.join('|'), 'i');

/* ------------------------------------------------------------------ */
/*  Keyword -> policy ID mapping                                       */
/* ------------------------------------------------------------------ */

const KEYWORD_POLICY_MAP: [RegExp, string][] = [
  [/\beu\s*ets\b|emissions?\s*trading/i, 'eu-ets-directive'],
  [/\bcbam\b|carbon\s*border/i, 'cbam-regulation'],
  [/\bgreen\s*deal\b/i, 'eu-green-deal'],
  [/\bfit\s*for\s*55\b/i, 'fit-for-55'],
  [/\bclimate\s*law\b/i, 'eu-climate-law'],
  [/\beffort\s*sharing\b/i, 'effort-sharing-regulation'],
  [/\blulucf\b|land\s*use/i, 'lulucf-regulation'],
  [/\brenewable\s*energy\b|red\s*(ii|iii)\b/i, 'renewable-energy-directive'],
  [/\benergy\s*efficiency\b/i, 'energy-efficiency-directive'],
  [/\btaxonomy\b/i, 'taxonomy-regulation'],
  [/\bsfdr\b|sustainable\s*finance\s*disclosure/i, 'sfdr'],
  [/\bco2?\s*cars?\b|vehicle\s*emission/i, 'co2-cars-regulation'],
  [/\bepbd\b|building.*energy\s*performance/i, 'epbd-recast'],
  [/\bsocial\s*climate\s*fund\b/i, 'social-climate-fund'],
  [/\bmethane\b/i, 'methane-regulation'],
  [/\bnature\s*restoration\b/i, 'nature-restoration-law'],
  [/\bcsrd\b|sustainability\s*reporting/i, 'csrd'],
  [/\bfueleu\b|maritime\s*fuel/i, 'fueleu-maritime'],
  [/\brefueleu\b|aviation\s*fuel/i, 'refueleu-aviation'],
  [/\bnet.?zero\s*industry/i, 'net-zero-industry-act'],
  [/\bcritical\s*raw\s*materials?\b/i, 'critical-raw-materials-act'],
  [/\bdeforestation\b/i, 'deforestation-regulation'],
  [/\bf.?gas\b|fluorinated/i, 'f-gas-regulation'],
  [/\beuro\s*7\b/i, 'euro-7-regulation'],
  [/\bbatter(y|ies)\s*regulat/i, 'batteries-regulation'],
  [/\becodesign\b/i, 'ecodesign-sustainable-products'],
  [/\bpackaging\s*waste\b/i, 'packaging-waste-regulation'],
  [/\bcsddd\b|due\s*diligence/i, 'csddd'],
  [/\bcap\b.*agricultur|common\s*agricultural/i, 'cap-strategic-plans'],
];

export function inferPolicyIds(text: string): string[] {
  const ids = new Set<string>();
  for (const [re, id] of KEYWORD_POLICY_MAP) {
    if (re.test(text)) ids.add(id);
  }
  // Default to green deal if nothing matched but it passed climate filter
  if (ids.size === 0) ids.add('eu-green-deal');
  return Array.from(ids);
}

/* ------------------------------------------------------------------ */
/*  XML parsing helpers (no external libraries)                        */
/* ------------------------------------------------------------------ */

/**
 * Extract text content between the first occurrence of <tag>...</tag>.
 * Handles CDATA sections and strips HTML tags from the result.
 */
function xmlText(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return '';
  const raw = (m[1] ?? m[2] ?? '').trim();
  return raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseRssFeed(xml: string, source: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];

  // Detect Atom vs RSS
  const isAtom = /<feed[\s>]/i.test(xml);

  if (isAtom) {
    const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;
    let match: RegExpExecArray | null;
    while ((match = entryRe.exec(xml)) !== null) {
      const block = match[0];
      const title = xmlText(block, 'title');
      const linkM = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      const link = linkM ? linkM[1] : '';
      const description =
        xmlText(block, 'summary') || xmlText(block, 'content');
      const pubDate = xmlText(block, 'updated') || xmlText(block, 'published');
      if (title && link) items.push({ title, link, description, pubDate, source });
    }
  } else {
    const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemRe.exec(xml)) !== null) {
      const block = match[0];
      const title = xmlText(block, 'title');
      const link =
        xmlText(block, 'link') ||
        (() => {
          const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
          return m ? m[1] : '';
        })();
      const description =
        xmlText(block, 'description') || xmlText(block, 'summary');
      const pubDate =
        xmlText(block, 'pubDate') ||
        xmlText(block, 'dc:date') ||
        xmlText(block, 'date');
      if (title && link) items.push({ title, link, description, pubDate, source });
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/*  Fetch all feeds                                                    */
/* ------------------------------------------------------------------ */

export async function fetchAllFeedItems(): Promise<RawFeedItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        next: { revalidate: 3600 },
        headers: {
          'User-Agent':
            'EU-Climate-Policy-Aggregator/1.0 (research; +https://github.com)',
          Accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssFeed(xml, feed.source);
    }),
  );

  const all: RawFeedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // Sort newest first
  all.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0;
    const db = new Date(b.pubDate).getTime() || 0;
    return db - da;
  });

  return all;
}

/* ------------------------------------------------------------------ */
/*  Convert raw items to PolicyNewsItem                                */
/* ------------------------------------------------------------------ */

export function toPolicyNewsItem(
  raw: RawFeedItem,
  index: number,
): PolicyNewsItem {
  const combined = `${raw.title} ${raw.description}`;
  const policy_ids = inferPolicyIds(combined);

  let date = '';
  if (raw.pubDate) {
    try {
      date = new Date(raw.pubDate).toISOString().slice(0, 10);
    } catch {
      date = '';
    }
  }

  return {
    id: `rss-${index}-${Buffer.from(raw.title.slice(0, 40)).toString('base64url').slice(0, 12)}`,
    title: raw.title,
    summary: raw.description.slice(0, 500) || 'No description available.',
    url: raw.link,
    date,
    policy_ids,
    source: raw.source,
  };
}
