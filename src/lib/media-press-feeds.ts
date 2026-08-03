/**
 * Press feed ingestion — RSS / Atom, Google Alerts and Talkwalker Alerts.
 *
 * This is the second press channel, alongside the Google News RSS search in
 * `media-monitoring.ts`. Where that one *generates* query URLs from keywords
 * on every run, this one polls a registry of standing feed URLs
 * (`media_press_sources`) that an operator registered once.
 *
 * Why both: Google News search is unauthenticated, rate-limits aggressively,
 * and changes its feed format without notice — a format change silently took
 * the whole dashboard to zero. Standing alerts are far more stable and reach
 * outlets the search feed crowds out, so the two channels backstop each other.
 *
 * ── What is and isn't automatic ──────────────────────────────────────────
 * Neither Google Alerts nor Talkwalker Alerts exposes an API for *creating*
 * alerts, so an alert per keyword cannot be provisioned from here. What is
 * automatic:
 *
 *   * `buildAlertQueries()` turns the current `media_keywords` rows into
 *     ready-to-paste alert queries, so setup is copy-paste rather than
 *     hand-typing, and new keywords surface as "not yet covered".
 *   * Every item pulled from these feeds is matched against the *current*
 *     keyword rows at fetch time. Adding a keyword in the Method Hub
 *     immediately applies to incoming items without touching the alerts.
 *
 * XML is parsed with regex, matching the house style of `rss-feeds.ts` and
 * `media-monitoring.ts`, so no new dependency is pulled into the bundle.
 */

import {
  canonicaliseUrl,
  domainFromUrl,
  isBlockedDomain,
  resolveOutletByDomain,
  type FetchedArticle,
  type MediaKeyword,
} from '@/lib/media-monitoring';
import { validateFeedUrl } from '@/lib/media-url-safety';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PressSourceType = 'google_alert' | 'talkwalker_alert' | 'rss';

export const PRESS_SOURCE_TYPES: PressSourceType[] = [
  'google_alert',
  'talkwalker_alert',
  'rss',
];

export interface PressSource {
  id: string;
  name: string;
  source_type: PressSourceType;
  feed_url: string;
  alert_query: string | null;
  country: string | null;
  language: string | null;
  default_report_slug: string | null;
  is_active: boolean;
}

/** One parsed feed entry, before keyword matching and enrichment. */
export interface RawFeedEntry {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  sourceName: string;
}

export interface PressSourceResult {
  source_id: string;
  name: string;
  status: 'success' | 'error';
  items: number;
  kept: number;
  error: string | null;
}

export interface PressFetchStats {
  sources: number;
  failedSources: number;
  itemsSeen: number;
  droppedTooOld: number;
  droppedBlocked: number;
  droppedNoKeyword: number;
  perSource: PressSourceResult[];
}

export function emptyPressFetchStats(): PressFetchStats {
  return {
    sources: 0,
    failedSources: 0,
    itemsSeen: 0,
    droppedTooOld: 0,
    droppedBlocked: 0,
    droppedNoKeyword: 0,
    perSource: [],
  };
}

/* ------------------------------------------------------------------ */
/*  XML helpers                                                        */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Decode XML entities. Feed text is frequently double-encoded (an entity
 * inside a CDATA block inside an escaped fragment), so this runs twice —
 * enough for every case seen in practice without looping unboundedly on
 * pathological input.
 */
export function decodeEntities(input: string): string {
  const once = (s: string) =>
    s
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  return once(once(input));
}

/**
 * Strip markup, then decode, then strip again.
 *
 * The second pass is not redundant. Google Alerts marks up matched terms
 * with `<b>` but declares its titles `type="html"`, so the tags arrive
 * escaped as `&lt;b&gt;` — decoding after a single strip would leave literal
 * `<b>` tags in every headline on the dashboard. Stripping either side of
 * the decode handles both escaped and unescaped markup.
 */
function stripHtml(input: string): string {
  const decoded = decodeEntities(input.replace(/<[^>]+>/g, ' '));
  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Read the text content of the first `<tag>` in a block. */
function tagText(xml: string, tag: string): string {
  const re = new RegExp(
    `<(?:\\w+:)?${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</(?:\\w+:)?${tag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return '';
  return (m[1] ?? m[2] ?? '').trim();
}

/**
 * Resolve an Atom `<link>`. Atom puts the URL in an `href` attribute and may
 * carry several links per entry (alternate, self, enclosure); the alternate
 * is the article. RSS puts the URL in the element body instead.
 */
function atomLink(block: string): string {
  const links = [...block.matchAll(/<(?:\w+:)?link\b([^>]*)>/gi)];
  let fallback = '';
  for (const [, attrs] of links) {
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const rel = attrs.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!rel || rel === 'alternate') return decodeEntities(href);
    if (!fallback) fallback = decodeEntities(href);
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Redirect unwrapping                                                */
/* ------------------------------------------------------------------ */

/**
 * Google Alerts never links straight to the article. Every entry points at
 * a tracking hop:
 *
 *   https://www.google.com/url?rct=j&sa=t&url=<REAL URL>&ct=ga&usg=...
 *
 * The publisher URL sits in the `url` parameter (older alerts used `q`).
 * Talkwalker and plain RSS feeds normally link directly, but some route
 * through a similar hop, so this is applied to every entry.
 *
 * Returns the input unchanged when there is nothing to unwrap.
 */
export function unwrapRedirectUrl(raw: string): string {
  let current = (raw ?? '').trim();

  // Bounded: a tracking hop wrapping another tracking hop is possible but
  // three levels is already beyond anything observed.
  for (let depth = 0; depth < 3; depth += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return current;
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const isRedirector =
      (host === 'google.com' && parsed.pathname === '/url') ||
      host === 'news.url.google.com' ||
      (host.endsWith('talkwalker.com') && parsed.pathname.startsWith('/redirect'));

    if (!isRedirector) return current;

    const target =
      parsed.searchParams.get('url') ??
      parsed.searchParams.get('q') ??
      parsed.searchParams.get('link');

    // A redirector we recognise but can't unwrap: better to keep the
    // tracking URL, which still resolves, than to return nothing.
    if (!target) return current;
    current = target;
  }

  return current;
}

/* ------------------------------------------------------------------ */
/*  Feed parsing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parse RSS 2.0 (`<item>`) and Atom (`<entry>`) feeds with one function.
 *
 * Google Alerts emits Atom; Talkwalker Alerts emits RSS 2.0; outlet feeds
 * are a mix of both. Rather than branch on the provider — which would break
 * the moment one of them switched format — this detects the element in use
 * and reads whichever date and summary fields are present.
 */
export function parseFeedEntries(xml: string): RawFeedEntry[] {
  const entries: RawFeedEntry[] = [];

  const isAtom = /<entry[\s>]/i.test(xml);
  const blockRe = isAtom
    ? /<entry[\s>][\s\S]*?<\/entry>/gi
    : /<item[\s>][\s\S]*?<\/item>/gi;

  // Feed-level title, used as the outlet name when an entry carries none
  // (common for a single-outlet RSS feed).
  const feedTitle = stripHtml(tagText(xml.split(isAtom ? '<entry' : '<item')[0], 'title'));

  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml)) !== null) {
    const block = match[0];

    const title = stripHtml(tagText(block, 'title'));
    if (!title) continue;

    const rawLink = isAtom ? atomLink(block) : decodeEntities(tagText(block, 'link'));
    const link = unwrapRedirectUrl(rawLink);
    if (!link) continue;

    // Atom: <content> or <summary>. RSS: <description> or content:encoded.
    const summary = stripHtml(
      tagText(block, 'content') ||
        tagText(block, 'summary') ||
        tagText(block, 'description') ||
        tagText(block, 'encoded'),
    ).slice(0, 500);

    // Atom: <published>/<updated> (ISO 8601). RSS: <pubDate> (RFC 822).
    const rawDate =
      tagText(block, 'pubDate') ||
      tagText(block, 'published') ||
      tagText(block, 'updated') ||
      tagText(block, 'date');
    const ts = rawDate ? Date.parse(rawDate) : NaN;

    // Entry-level attribution: RSS <source>, Atom <author><name>.
    const entrySource =
      block.match(/<source[^>]*>([^<]*)<\/source>/i)?.[1]?.trim() ||
      stripHtml(tagText(block, 'name'));

    entries.push({
      title,
      link,
      summary,
      publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
      sourceName: entrySource || feedTitle || '',
    });
  }

  return entries;
}

/* ------------------------------------------------------------------ */
/*  Keyword matching                                                   */
/* ------------------------------------------------------------------ */

/**
 * Match an item against the keyword list.
 *
 * Word-boundary matching, so the acronym "ETS" doesn't match "targets" and
 * "CAP" doesn't match "capacity" — a plain `includes()` produced a stream of
 * false positives on short keywords.
 */
export function matchKeywords(
  text: string,
  keywords: MediaKeyword[],
): MediaKeyword[] {
  const haystack = text.toLowerCase();
  return keywords.filter((kw) => {
    const needle = kw.keyword.trim().toLowerCase();
    if (!needle) return false;
    // Escape regex metacharacters — keywords are free text from the DB.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(
      haystack,
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Alert query generation                                             */
/* ------------------------------------------------------------------ */

export interface AlertQuery {
  /** Keywords this query covers. */
  keywords: string[];
  /** The query string to paste into the provider's UI. */
  query: string;
  /**
   * 'essential' — covers the ESABCC's own names, reports and policy terms.
   * These are worth the manual setup.
   * 'optional'  — individual board-member name-watching. Useful, but a long
   * tail that Google News search already covers automatically.
   */
  tier: 'essential' | 'optional';
  label: string;
  /** Languages represented, for the operator's information only. */
  languages: string[];
}

/**
 * Quote a keyword for an alert query. Multi-word phrases need quoting so the
 * provider matches the phrase rather than the loose union of its words.
 */
function quoteTerm(keyword: string): string {
  const term = keyword.trim();
  if (!term) return '';
  return /\s/.test(term) ? `"${term}"` : term;
}

/**
 * Categories covering the ESABCC's own names, publications and policy terms.
 * Everything else is individual name-watching.
 */
const ESSENTIAL_CATEGORIES = new Set([
  'esabcc',
  'institution',
  'institution_quote',
  'report',
  'policy',
]);

/**
 * Turn keyword rows into ready-to-paste alert queries.
 *
 * ── Why these are not grouped by language ─────────────────────────────────
 * Grouping by category *and* language turned 129 keyword rows into 40
 * queries, i.e. 40 alerts to create by hand — most of them covering a single
 * keyword. That is not a setup anyone will actually complete.
 *
 * The language split was borrowed from the Google News search path, where it
 * genuinely matters: `hl`/`gl` select which regional edition is searched.
 * Alerts have no equivalent — they match the literal terms, so a query mixing
 * German and French terms works fine with the provider's language set to
 * "Any". Dropping the split, and raising the per-query term limit, collapses
 * the same coverage into a handful of alerts.
 *
 * Queries are split into two tiers so the setup can be done in priority
 * order rather than all at once. Every keyword is searched on Google News
 * automatically regardless; alerts are a more reliable second channel, so a
 * keyword without one is covered, just less robustly.
 */
export function buildAlertQueries(
  keywords: MediaKeyword[],
  opts: { maxTerms?: number } = {},
): AlertQuery[] {
  // Both providers degrade on very long queries. 15 OR-ed terms stays well
  // inside what they handle and is still checkable by eye in their UI.
  const maxTerms = opts.maxTerms ?? 15;
  const active = keywords.filter((k) => k.is_active && k.keyword.trim());

  const tiers: { tier: 'essential' | 'optional'; rows: MediaKeyword[] }[] = [
    {
      tier: 'essential',
      rows: active.filter((k) => ESSENTIAL_CATEGORIES.has(k.category)),
    },
    {
      tier: 'optional',
      rows: active.filter((k) => !ESSENTIAL_CATEGORIES.has(k.category)),
    },
  ];

  const queries: AlertQuery[] = [];
  for (const { tier, rows } of tiers) {
    // De-duplicate: several keyword rows differ only by language but carry
    // the same literal term, and an alert has no use for the repeat.
    const seen = new Set<string>();
    const unique = rows.filter((k) => {
      const key = k.keyword.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const chunks = Math.ceil(unique.length / maxTerms);
    for (let i = 0; i < unique.length; i += maxTerms) {
      const slice = unique.slice(i, i + maxTerms);
      const part = Math.floor(i / maxTerms) + 1;
      queries.push({
        keywords: slice.map((k) => k.keyword),
        query: slice.map((k) => quoteTerm(k.keyword)).join(' OR '),
        tier,
        label:
          tier === 'essential'
            ? `ESABCC & reports${chunks > 1 ? ` (${part}/${chunks})` : ''}`
            : `Board members${chunks > 1 ? ` (${part}/${chunks})` : ''}`,
        languages: Array.from(new Set(slice.map((k) => k.language || 'en'))).sort(),
      });
    }
  }
  return queries;
}

/**
 * Which active keywords are not mentioned by any registered alert's stored
 * query. Drives the "not yet covered by an alert" hint in the dashboard.
 */
export function uncoveredKeywords(
  keywords: MediaKeyword[],
  sources: PressSource[],
): string[] {
  const covered = sources
    .filter((s) => s.is_active && s.alert_query)
    .map((s) => (s.alert_query ?? '').toLowerCase())
    .join(' \n ');

  return keywords
    .filter((k) => k.is_active)
    .map((k) => k.keyword)
    .filter((kw) => kw.trim() && !covered.includes(kw.trim().toLowerCase()));
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; EU-Climate-Monitor/1.0)',
  Accept:
    'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface PressFetchOptions {
  sinceIso?: string;
  timeoutMs?: number;
  /** Concurrent feed requests (default 4). */
  concurrency?: number;
  /** Delay between waves in ms (default 300). */
  delayMs?: number;
  /**
   * Drop items matching no active keyword. On by default: an alert built
   * from our keywords matches by construction, so a non-matching item is
   * usually the provider being loose rather than real coverage.
   */
  requireKeywordMatch?: boolean;
  /** Drop items from BLOCKED_DOMAINS. On by default. */
  applyBlocklist?: boolean;
  stats?: PressFetchStats;
}

/**
 * Fetch every active press source and return normalised articles.
 *
 * Note the deliberate asymmetry with the Google News fetcher: that one
 * applies `knownOutletsOnly` to filter an unfiltered firehose down to
 * outlets we recognise. Here the operator chose each feed, so an unknown
 * outlet is the point — an EU institution newsroom or an NGO feed should
 * not be discarded for missing from OUTLET_REGISTRY. Only the blocklist
 * and the keyword filter apply.
 *
 * A failing feed never fails the run: per-source errors are recorded in
 * `stats.perSource` (and surfaced back to `media_press_sources`) so a dead
 * feed is visible in the dashboard rather than silently contributing zero.
 */
export async function fetchPressFeeds(
  sources: PressSource[],
  keywords: MediaKeyword[],
  opts: PressFetchOptions = {},
): Promise<FetchedArticle[]> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const concurrency = opts.concurrency ?? 4;
  const delayMs = opts.delayMs ?? 300;
  const requireKeywordMatch = opts.requireKeywordMatch ?? true;
  const applyBlocklist = opts.applyBlocklist ?? true;
  const sinceTs = opts.sinceIso ? new Date(opts.sinceIso).getTime() : 0;
  const stats = opts.stats ?? emptyPressFetchStats();

  const activeSources = sources.filter((s) => s.is_active);
  const activeKeywords = keywords.filter((k) => k.is_active);
  stats.sources = activeSources.length;
  if (activeSources.length === 0) return [];

  const merged = new Map<string, FetchedArticle>();

  for (let i = 0; i < activeSources.length; i += concurrency) {
    const wave = activeSources.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      wave.map(async (source) => {
        // Re-validate at fetch time as well as at write time: a row could
        // predate the validation, or have been edited directly in the DB.
        const check = validateFeedUrl(source.feed_url);
        if (!check.ok) throw new Error(`invalid feed_url: ${check.reason}`);

        const res = await fetch(check.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(timeoutMs),
          next: { revalidate: 900 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { source, entries: parseFeedEntries(await res.text()) };
      }),
    );

    for (let j = 0; j < results.length; j += 1) {
      const r = results[j];
      const source = wave[j];

      if (r.status !== 'fulfilled') {
        stats.failedSources += 1;
        const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
        stats.perSource.push({
          source_id: source.id,
          name: source.name,
          status: 'error',
          items: 0,
          kept: 0,
          error: message,
        });
        console.warn(`[press-feeds] ${source.name}: ${message}`);
        continue;
      }

      const { entries } = r.value;
      let kept = 0;

      for (const entry of entries) {
        stats.itemsSeen += 1;

        const publishedTs = entry.publishedAt ? Date.parse(entry.publishedAt) : NaN;
        if (sinceTs && Number.isFinite(publishedTs) && publishedTs < sinceTs) {
          stats.droppedTooOld += 1;
          continue;
        }

        const canonical = canonicaliseUrl(entry.link);
        const domain = domainFromUrl(canonical);

        if (applyBlocklist && isBlockedDomain(domain)) {
          stats.droppedBlocked += 1;
          continue;
        }

        const matched = matchKeywords(`${entry.title} ${entry.summary}`, activeKeywords);
        if (requireKeywordMatch && matched.length === 0) {
          stats.droppedNoKeyword += 1;
          continue;
        }

        const outlet = resolveOutletByDomain(domain);

        // Dedup within this run on outlet + normalised title as well as URL,
        // since two alerts covering overlapping keywords return the same
        // story. Cross-channel dedup against Google News happens later, in
        // `mergeArticleSets`.
        const existing = merged.get(canonical);
        if (existing) {
          for (const kw of matched) {
            if (!existing.matched_keyword_ids.includes(kw.id)) {
              existing.matched_keyword_ids.push(kw.id);
              existing.matched_keywords.push(kw.keyword);
            }
          }
          continue;
        }

        merged.set(canonical, {
          url: entry.link,
          canonical_url: canonical,
          title: entry.title,
          summary: entry.summary || 'No description available.',
          source_name: entry.sourceName || outlet?.name || domain || source.name,
          outlet_domain: outlet?.domain ?? domain,
          outlet,
          published_at: entry.publishedAt,
          language: source.language || outlet?.language || 'en',
          country: outlet?.country ?? source.country ?? null,
          estimated_reach: outlet?.estimated_readership ?? 0,
          matched_keyword_ids: matched.map((k) => k.id),
          matched_keywords: matched.map((k) => k.keyword),
          discovery_source: source.source_type,
          press_source_id: source.id,
        });
        kept += 1;
      }

      stats.perSource.push({
        source_id: source.id,
        name: source.name,
        status: 'success',
        items: entries.length,
        kept,
        error: null,
      });
    }

    if (i + concurrency < activeSources.length) {
      await sleep(delayMs);
    }
  }

  if (stats.failedSources > 0) {
    console.warn(
      `[press-feeds] ${stats.failedSources}/${stats.sources} sources failed`,
    );
  }

  return Array.from(merged.values());
}
