/**
 * Social-media monitoring — server-side utilities.
 *
 * We do not search LinkedIn from the server. Search-engine backends
 * (Brave, Google News) only surface a stub page for LinkedIn posts
 * ("We cannot provide a description for this page right now") because
 * LinkedIn blocks crawlers from reading post content. The result is
 * stale, low-quality garbage that isn't worth the API budget.
 *
 * Instead, posts enter `media_social_posts` through two channels:
 *
 *   1. `POST /api/media-monitoring/social/ingest` — driven by the Edge
 *      browser extension (which reads the DOM of the user's already-
 *      authenticated LinkedIn tab) and by the manual-paste form on the
 *      Social Media dashboard.
 *   2. This file's `fetchSocialPosts()` — which only pulls sources that
 *      have an explicit RSS/Atom `feed_url` configured (e.g. RSS.app
 *      paid-tier bridges to LinkedIn profiles or company pages). No
 *      `feed_url` means no automatic fetching.
 *
 * Match attribution (keywords + ESABCC report slugs) is computed here so
 * API routes stay thin.
 */

import {
  matchReportsFromKeywords,
  matchReportsInText,
} from '@/data/esabcc-reports';
import type { MediaKeyword } from '@/lib/media-monitoring';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SocialPlatform = 'linkedin' | 'x' | 'mastodon' | 'bluesky';

/**
 * Historically included 'keyword' for phrase-search sources — removed
 * now that we no longer do server-side LinkedIn searches. Rows with
 * legacy types still read fine because the column is free-text.
 */
export type SocialSourceType = 'account' | 'company' | 'hashtag';

export interface SocialSource {
  id: string;
  platform: SocialPlatform;
  handle: string;
  source_type: SocialSourceType;
  display_name: string | null;
  profile_url: string | null;
  feed_url: string | null;
  country: string | null;
  language: string | null;
  default_report_slug: string | null;
  is_board_member: boolean;
  is_active: boolean;
}

export interface FetchedSocialPost {
  platform: SocialPlatform;
  post_url: string;
  external_id: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_profile_url: string | null;
  source_id: string | null;
  content: string;
  excerpt: string;
  language: string | null;
  country: string | null;
  posted_at: string | null;
  estimated_reach: number;
  link_url: string | null;
  matched_keyword_ids: string[];
  matched_keywords: string[];
  matched_report_slugs: string[];
}

interface FetchSocialOptions {
  sinceIso?: string;
  timeoutMs?: number;
  activeOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  XML helpers                                                        */
/* ------------------------------------------------------------------ */

function xmlText(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return '';
  return (m[1] ?? m[2] ?? '').trim();
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  guid: string;
}

function parseFeed(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const rssItemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  const atomEntryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;

  const harvest = (re: RegExp) => {
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml)) !== null) {
      const block = match[0];
      const title = stripHtml(xmlText(block, 'title'));

      let link = xmlText(block, 'link');
      if (!link) {
        const atomLink = block.match(/<link[^>]*href="([^"]+)"/i);
        if (atomLink) link = atomLink[1];
      }

      const descriptionRaw =
        xmlText(block, 'description') ||
        xmlText(block, 'content') ||
        xmlText(block, 'summary');
      const pubDate =
        xmlText(block, 'pubDate') ||
        xmlText(block, 'published') ||
        xmlText(block, 'updated');
      const author =
        xmlText(block, 'author') ||
        xmlText(block, 'dc:creator') ||
        xmlText(block, 'name');
      const guid = xmlText(block, 'guid') || xmlText(block, 'id') || link;

      if (title || link) {
        items.push({
          title,
          link,
          description: descriptionRaw,
          pubDate,
          author: stripHtml(author),
          guid,
        });
      }
    }
  };

  harvest(rssItemRe);
  if (items.length === 0) harvest(atomEntryRe);
  return items;
}

/* ------------------------------------------------------------------ */
/*  Matching                                                           */
/* ------------------------------------------------------------------ */

function matchKeywordsInText(
  text: string,
  keywords: MediaKeyword[],
): MediaKeyword[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.keyword.toLowerCase()));
}

function safeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function extractLinkedInId(url: string): string | null {
  const m = url.match(/linkedin\.com\/(?:posts|pulse|feed\/update)\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractLinkedInAuthor(url: string): string | null {
  const postsMatch = url.match(/linkedin\.com\/posts\/([^/_?#]+)/i);
  if (postsMatch) return postsMatch[1].toLowerCase();
  const pulseMatch = url.match(/linkedin\.com\/pulse\/[^/?#]+?-([^/?#-]+)(?:-\d+)?(?:\?|#|$)/i);
  if (pulseMatch) return pulseMatch[1].toLowerCase();
  return null;
}

function isLinkedInPostUrl(url: string): boolean {
  const host = safeDomain(url);
  if (host !== 'linkedin.com' && !host?.endsWith('.linkedin.com')) return false;
  return /linkedin\.com\/(posts|pulse|feed\/update)\//i.test(url);
}

/* ------------------------------------------------------------------ */
/*  RSS fetcher                                                        */
/* ------------------------------------------------------------------ */

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; EU-Climate-Monitor/1.0)',
  Accept:
    'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchRss(
  url: string,
  timeoutMs: number,
): Promise<RawFeedItem[]> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 900 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseFeed(xml);
}

/**
 * Fetch posts from every source that has an `feed_url` configured.
 * Sources without a feed URL are skipped — they exist only as reference
 * data and metadata for extension-ingested posts.
 */
export async function fetchSocialPosts(
  sources: SocialSource[],
  keywords: MediaKeyword[],
  opts: FetchSocialOptions = {},
): Promise<FetchedSocialPost[]> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const activeOnly = opts.activeOnly ?? true;
  const sinceTs = opts.sinceIso ? new Date(opts.sinceIso).getTime() : 0;

  const activeSources = (activeOnly ? sources.filter((s) => s.is_active) : sources)
    .filter((s) => !!s.feed_url);
  if (activeSources.length === 0) return [];

  const byUrl = new Map<string, FetchedSocialPost>();

  // Small concurrency since typical deployments have <10 feeds
  const CONCURRENCY = 3;
  for (let i = 0; i < activeSources.length; i += CONCURRENCY) {
    const wave = activeSources.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      wave.map(async (source) => ({
        source,
        items: await fetchRss(source.feed_url as string, timeoutMs),
      })),
    );

    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      const { source, items } = r.value;

      for (const it of items) {
        if (source.platform === 'linkedin' && !isLinkedInPostUrl(it.link)) {
          continue;
        }

        const publishedTs = it.pubDate ? Date.parse(it.pubDate) : NaN;
        if (sinceTs && Number.isFinite(publishedTs) && publishedTs < sinceTs) {
          continue;
        }

        const cleanContent = stripHtml(it.description).slice(0, 2000);
        const excerpt = cleanContent.slice(0, 280);
        const fullText = `${it.title} ${cleanContent}`;

        const matchedKws = matchKeywordsInText(fullText, keywords);
        if (matchedKws.length === 0 && !source.is_board_member) {
          if (matchReportsInText(fullText).length === 0) continue;
        }

        const matchedReports = Array.from(
          new Set([
            ...matchReportsFromKeywords(matchedKws.map((k) => k.keyword)),
            ...matchReportsInText(fullText),
            ...(source.default_report_slug ? [source.default_report_slug] : []),
          ]),
        );

        const urlAuthor = extractLinkedInAuthor(it.link);
        const post: FetchedSocialPost = {
          platform: source.platform,
          post_url: it.link,
          external_id: extractLinkedInId(it.link) ?? it.guid ?? null,
          author_handle: urlAuthor ?? source.handle,
          author_name: source.display_name ?? it.author ?? source.handle,
          author_profile_url: source.profile_url,
          source_id: source.id || null,
          content: cleanContent,
          excerpt,
          language: source.language,
          country: source.country,
          posted_at: Number.isFinite(publishedTs)
            ? new Date(publishedTs).toISOString()
            : null,
          estimated_reach: 0,
          link_url: null,
          matched_keyword_ids: matchedKws.map((k) => k.id),
          matched_keywords: matchedKws.map((k) => k.keyword),
          matched_report_slugs: matchedReports,
        };

        const existing = byUrl.get(post.post_url);
        if (existing) {
          for (const kw of matchedKws) {
            if (!existing.matched_keyword_ids.includes(kw.id)) {
              existing.matched_keyword_ids.push(kw.id);
              existing.matched_keywords.push(kw.keyword);
            }
          }
          for (const slug of matchedReports) {
            if (!existing.matched_report_slugs.includes(slug)) {
              existing.matched_report_slugs.push(slug);
            }
          }
        } else {
          byUrl.set(post.post_url, post);
        }
      }
    }

    if (i + CONCURRENCY < activeSources.length) await sleep(500);
  }

  return Array.from(byUrl.values()).sort((a, b) => {
    const ta = a.posted_at ? Date.parse(a.posted_at) : 0;
    const tb = b.posted_at ? Date.parse(b.posted_at) : 0;
    return tb - ta;
  });
}
