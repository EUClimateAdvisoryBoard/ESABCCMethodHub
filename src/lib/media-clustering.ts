/**
 * Media clustering — assign each article in the pool to the reports, board
 * members and country it belongs to.
 *
 * The dashboard's Reports / Members / Countries sections are all lenses over
 * one shared pool (`media_articles`), which is fed by two channels: the alert
 * and RSS feeds, and the weekly Newton Media spreadsheet upload. Clustering
 * runs over the pool regardless of how an article arrived, so the lenses stay
 * consistent across sources.
 *
 * Clustering is deliberately kept out of the ingestion path and run as its own
 * pass. Report match-terms and the board roster change over time; when they do,
 * the whole pool needs re-clustering, not just newly arrived rows.
 */

import {
  BOARD_CONTEXT_TERMS,
  BOARD_MEMBERS,
  type BoardMember,
} from '@/data/esabcc-board';
import { matchReportsFromKeywords, matchReportsInText } from '@/data/esabcc-reports';

/** The article fields clustering needs. */
export interface ClusterableArticle {
  id: string;
  title: string | null;
  summary: string | null;
  full_text?: string | null;
  country: string | null;
  outlet_domain: string | null;
  matched_keywords: string[] | null;
}

export interface ClusterResult {
  report_slugs: string[];
  member_slugs: string[];
  country: string | null;
}

/* ------------------------------------------------------------------ */
/*  Text matching                                                      */
/* ------------------------------------------------------------------ */

/**
 * Whole-word containment test.
 *
 * `String.includes` is wrong for names: "Eory" is a substring of "theory",
 * and "Riahi" of longer transliterations. Unicode property escapes are used
 * for the boundary so accented and non-Latin names (Καρτάλης, Díaz Anadón)
 * are handled the same way as ASCII ones — `\b` is ASCII-only and would
 * misfire on both.
 */
export function containsTerm(haystack: string, term: string): boolean {
  const needle = term.trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`,
    'iu',
  ).test(haystack);
}

/** True when the text shows the article is about the advisory board. */
export function hasBoardContext(text: string): boolean {
  const lower = text.toLowerCase();
  return BOARD_CONTEXT_TERMS.some((t) => lower.includes(t));
}

/**
 * Attribute an article to board members.
 *
 * A member's `aliases` attribute on their own. `contextAliases` — common
 * surnames like Nilsson and Persson — attribute only when the article also
 * carries board context, so a story about an unrelated Persson is not filed
 * under a board member.
 */
export function matchBoardMembers(
  text: string,
  members: BoardMember[] = BOARD_MEMBERS,
): string[] {
  const boardContext = hasBoardContext(text);
  const hits: string[] = [];

  for (const member of members) {
    const direct = member.aliases.some((a) => containsTerm(text, a));
    if (direct) {
      hits.push(member.slug);
      continue;
    }
    if (
      boardContext &&
      member.contextAliases.some((a) => containsTerm(text, a))
    ) {
      hits.push(member.slug);
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/*  Country resolution                                                 */
/* ------------------------------------------------------------------ */

/**
 * Country names as they appear in Newton Media's `Topic` column, mapped to
 * ISO-3166 alpha-2. Newton files the topic hierarchy as "ESABCC > Germany".
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  austria: 'AT',
  belgium: 'BE',
  bulgaria: 'BG',
  croatia: 'HR',
  cyprus: 'CY',
  czechia: 'CZ',
  'czech republic': 'CZ',
  denmark: 'DK',
  estonia: 'EE',
  finland: 'FI',
  france: 'FR',
  germany: 'DE',
  greece: 'GR',
  hungary: 'HU',
  ireland: 'IE',
  italy: 'IT',
  latvia: 'LV',
  lithuania: 'LT',
  luxembourg: 'LU',
  malta: 'MT',
  netherlands: 'NL',
  poland: 'PL',
  portugal: 'PT',
  romania: 'RO',
  slovakia: 'SK',
  slovenia: 'SI',
  spain: 'ES',
  sweden: 'SE',
  norway: 'NO',
  switzerland: 'CH',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'united states': 'US',
  serbia: 'RS',
  turkey: 'TR',
  ukraine: 'UA',
};

export function isoFromCountryName(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (/^[A-Za-z]{2}$/.test(key)) return key.toUpperCase();
  return COUNTRY_NAME_TO_ISO[key] ?? null;
}

/** Country-code TLDs, used as a last resort when nothing else resolves. */
const TLD_TO_ISO: Record<string, string> = {
  at: 'AT', be: 'BE', bg: 'BG', ch: 'CH', cz: 'CZ', de: 'DE', dk: 'DK',
  ee: 'EE', es: 'ES', fi: 'FI', fr: 'FR', gr: 'GR', hr: 'HR', hu: 'HU',
  ie: 'IE', it: 'IT', lt: 'LT', lv: 'LV', nl: 'NL', no: 'NO', pl: 'PL',
  pt: 'PT', ro: 'RO', se: 'SE', si: 'SI', sk: 'SK', uk: 'GB',
};

/**
 * Resolve an article's country.
 *
 * The stored `country` (from the outlet registry or the Newton export) wins.
 * Only when it is absent does this fall back to the domain's ccTLD, which is
 * a weaker signal — `.eu` and `.com` say nothing, and a `.de` domain can
 * publish about anywhere.
 */
export function resolveCountry(article: ClusterableArticle): string | null {
  if (article.country && /^[A-Za-z]{2}$/.test(article.country)) {
    return article.country.toUpperCase();
  }
  const domain = article.outlet_domain;
  if (!domain) return null;
  const tld = domain.split('.').pop()?.toLowerCase();
  return tld ? TLD_TO_ISO[tld] ?? null : null;
}

/* ------------------------------------------------------------------ */
/*  Clustering                                                         */
/* ------------------------------------------------------------------ */

/**
 * Cluster one article.
 *
 * Full text is included in the matched text when available (the Newton export
 * carries it) because a board member is often quoted in the body while the
 * headline names only the institution.
 */
export function clusterArticle(article: ClusterableArticle): ClusterResult {
  const text = [article.title, article.summary, article.full_text]
    .filter(Boolean)
    .join('\n');

  const reportSlugs = Array.from(
    new Set([
      ...matchReportsFromKeywords(article.matched_keywords),
      ...matchReportsInText(text),
    ]),
  );

  return {
    report_slugs: reportSlugs,
    member_slugs: matchBoardMembers(text),
    country: resolveCountry(article),
  };
}

/** Cluster a batch, returning only rows whose clustering actually changed. */
export function clusterBatch(
  articles: ClusterableArticle[],
  previous: Map<string, ClusterResult> = new Map(),
): { id: string; cluster: ClusterResult }[] {
  const changed: { id: string; cluster: ClusterResult }[] = [];

  for (const article of articles) {
    const cluster = clusterArticle(article);
    const before = previous.get(article.id);
    const same =
      before &&
      before.country === cluster.country &&
      sameSet(before.report_slugs, cluster.report_slugs) &&
      sameSet(before.member_slugs, cluster.member_slugs);
    if (!same) changed.push({ id: article.id, cluster });
  }

  return changed;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}
