'use client';

/**
 * M · 03 — Secretariat News (production)
 * --------------------------------------
 * Route: `/news-feed`
 *
 * The Secretariat's curated climate-policy news surface. Three views live
 * behind the tab bar on this page:
 *
 *   1. Daily summary — hourly RSS sweep, deduplicated, summarised.
 *      Cached in `public/data/daily-summary.json` at render time.
 *   2. 24 h EU briefing — `/news-feed/24h-news-update` — chronological
 *      digest of EU-institutional sources (Commission, Parliament, EEA…).
 *   3. AI daily briefing — `/news-feed/daily-briefing` — LLM summary of
 *      the last 24 h, routed through `LLM_PROVIDER`.
 *
 * Ingestion pipelines (scheduled via GitHub Actions or an EEA cron):
 *
 *   scripts/fetch-news.js             → RSS sweep (hourly)
 *   scripts/generate-daily-summary.js → LLM-backed 24 h summariser (4×/day)
 *
 * The previous Brussels-Bulletin CTA was removed — that module is now
 * parked under `beta/modules/brussels-bulletin` and is intentionally
 * unreachable from production UI.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { newsFeedItems, autoSuggestTags, AUTO_TAG_KEYWORDS, NewsItem, NewsComment } from '@/data/newsfeed';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import OnboardingTour from '@/components/OnboardingTour';
import PolicyClock from '@/components/PolicyClock';
import { useAuth } from '@/lib/auth-context';
import LinkPreview from '@/components/LinkPreview';
import EuEtsPositionsFigure from '@/components/EuEtsPositionsFigure';
import OneEuropeOneMarketFigure from '@/components/OneEuropeOneMarketFigure';
import NewsSavedSearchesPanel from '@/components/NewsSavedSearchesPanel';
import NewsLastVisitBanner from '@/components/NewsLastVisitBanner';
import type { NewsSavedSearch } from '@/lib/useNewsSavedSearches';
import SuggestPolicyButton from '@/components/SuggestPolicyButton';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/StateView';
import { showToast } from '@/components/ui/ToastHost';
import { FilterPill, FilterPillRow } from '@/components/ui/FilterPill';

// ── Constants ──────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: NewsItem['source']; label: string; color: string }[] = [
  { value: 'email_news_in', label: 'Email News-In', color: '#6366F1' },
  { value: 'european_commission', label: 'European Commission', color: '#003399' },
  { value: 'eea', label: 'EEA', color: '#007B6C' },
  { value: 'european_council', label: 'European Council', color: '#1B3A5C' },
  { value: 'ipcc', label: 'IPCC', color: '#E8712B' },
  { value: 'unfccc', label: 'UNFCCC', color: '#00AEEF' },
  { value: 'internal', label: 'Internal', color: '#6B7280' },
  { value: 'other', label: 'Other', color: '#9CA3AF' },
];

const TYPE_OPTIONS: { value: NewsItem['type']; label: string }[] = [
  { value: 'press_release', label: 'Press Release' },
  { value: 'report', label: 'Report' },
  { value: 'article', label: 'Article' },
  { value: 'paper', label: 'Paper' },
  { value: 'internal_note', label: 'Internal Note' },
];

const ALL_TAGS = Object.keys(AUTO_TAG_KEYWORDS);

const TEAL = 'currentColor';

// Swim lanes available in the "Add a Date" form on the Post New tab. Must stay
// in sync with CAT in src/components/PolicyClock.tsx and POLICY_CLOCK_CATEGORIES
// in src/lib/policy-clock-events-store.ts.
type PolicyClockSwimLane =
  | 'revision'
  | 'new_policy'
  | 'commission_workprogramme'
  | 'envi_committee'
  | 'council_meeting'
  | 'plenary'
  | 'consultation'
  | 'implementation';

const POLICY_CLOCK_SWIM_LANES: { value: PolicyClockSwimLane; label: string; color: string; bg: string }[] = [
  { value: 'envi_committee',           label: 'ENVI Committee', color: '#007B6C', bg: '#e6f5f2' },
  { value: 'council_meeting',          label: 'Council',        color: '#1B3A5C', bg: '#e8edf2' },
  { value: 'plenary',                  label: 'EP Plenary',     color: '#6667AB', bg: '#eeeef8' },
  { value: 'commission_workprogramme', label: 'Commission WP',  color: '#003399', bg: '#e6eaf5' },
  { value: 'new_policy',               label: 'New Policy',     color: '#0065A4', bg: '#e6f0f7' },
  { value: 'revision',                 label: 'Revision',       color: '#A530B8', bg: '#f5e6f7' },
  { value: 'consultation',             label: 'Consultation',   color: '#D97706', bg: '#fef3e2' },
  { value: 'implementation',           label: 'Implementation', color: '#16A34A', bg: '#e6f5ea' },
];

type ViewMode = 'feed' | 'live' | 'policy-clock' | 'post' | 'reading-list' | 'daily-summary';
type FilterExternal = 'all' | 'external' | 'internal';

interface ReadingListItem {
  id: string;
  title: string;
  authors: string;
  url: string;
  doi?: string;
  kind: 'paper' | 'report' | 'book' | 'article' | 'news' | 'other';
  priority: 'must-read' | 'important' | 'nice-to-have';
  notes: string;
  addedBy: string;
  addedDate: string;
  read: boolean;
  sourceType?: 'manual' | 'doi' | 'reference-manager' | 'news-feed' | 'live-news';
  sourceId?: string;
  // ID of the matching entry in the Reference Manager library. Every reading
  // list item is auto-synced to the library so clicking the title opens the
  // library entry (not the external URL).
  referenceId?: string;
}

interface SharedReadingListItem {
  id: string;
  title: string;
  authors: string;
  url: string;
  doi?: string;
  kind: 'paper' | 'report' | 'book' | 'article' | 'news' | 'other';
  priority: 'must-read' | 'important' | 'nice-to-have';
  notes: string;
  addedByName: string;
  addedById: string;
  addedDate: string;
  upvotes: number;
  upvotedByMe: boolean;
  sourceType?: string;
  // ID of the matching entry in the Reference Manager library.
  referenceId?: string;
}

type ReadingListTab = 'personal' | 'shared';

// Resolve the library entry id for a reading-list item. Newer items carry it
// in `referenceId`; legacy items (added from the Reference Manager before this
// field existed) stored it as `sourceId` with sourceType === 'reference-manager'.
function readingItemLibraryId(item: {
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;
}): string | undefined {
  if (item.referenceId) return item.referenceId;
  if (item.sourceType === 'reference-manager' && item.sourceId) return item.sourceId;
  return undefined;
}

interface LiveArticle {
  title: string;
  link: string;
  source: string;
  sourceLabel: string;
  published: string;
  description: string;
  relevanceScore?: number;
  importance?: 'high' | 'medium' | 'normal';
}

interface LiveSource { key: string; label: string; color: string; }

interface DailySummaryItem {
  title: string;
  link: string;
  source: string;
  description: string;
  published: string;
  score: number;
}

interface DailySummarySection {
  id: string;
  title: string;
  items: DailySummaryItem[];
}

interface DailySummaryData {
  date: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  sections: DailySummarySection[];
  stats: {
    totalArticlesScanned: number;
    articlesLast24h: number;
    afterDedup: number;
    feedsQueried: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip HTML tags (including truncated ones) and decode common entities from RSS descriptions. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')        // complete tags
    .replace(/<[^>]*$/g, '')         // truncated tag at end of string
    .replace(/^[^<]*>/g, '')         // leftover closing fragment at start
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSourceColor(source: string): string {
  return SOURCE_OPTIONS.find(s => s.value === source)?.color || '#9CA3AF';
}

function getSourceLabel(source: string): string {
  return SOURCE_OPTIONS.find(s => s.value === source)?.label || source;
}

/** Extract the first URL found in a string (used for link previews). */
function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')\]]+/);
  return m ? m[0] : null;
}

/** Turn plain-text URLs into clickable <a> elements. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
function linkifyText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer"
        className="text-secondary hover:underline break-all"
        onClick={e => e.stopPropagation()}>
        {url}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

// Inline figures wired to `figureKind` on news items. Only the kinds listed
// below render — anything else is silently ignored so unknown values don't
// break the feed.
function renderNewsFigure(kind?: string): React.ReactNode {
  if (!kind) return null;
  if (kind === 'eu-ets-positions-apr2026') return <EuEtsPositionsFigure />;
  if (kind === 'one-europe-one-market-apr2026') return <OneEuropeOneMarketFigure />;
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function NewsFeedPage() {
  const { user, displayName, requireAuth, session } = useAuth();
  const [view, setView] = useState<ViewMode>('feed');
  // Reading-position memory (M·03 #3): when the user switches views, remember
  // their scroll position; when they switch back, restore it. The reference
  // counter forces the effect even when toggling the same view repeatedly.
  const scrollMemory = useRef<Record<string, number>>({});
  const prevView = useRef<ViewMode>('feed');
  useEffect(() => {
    const last = prevView.current;
    if (last !== view) {
      // Save the old view's scroll, then restore the new one's (if any).
      scrollMemory.current[last] = window.scrollY;
      prevView.current = view;
      const target = scrollMemory.current[view] ?? 0;
      // Defer to next paint so the new view has rendered before we scroll.
      requestAnimationFrame(() => window.scrollTo({ top: target, behavior: 'auto' }));
    }
  }, [view]);
  const [items, setItems] = useState<NewsItem[]>(newsFeedItems);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterExternal, setFilterExternal] = useState<FilterExternal>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Interactions
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [userComments, setUserComments] = useState<Record<string, NewsComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [addedToLibrary, setAddedToLibrary] = useState<Set<string>>(new Set());
  const [showLibraryConfirm, setShowLibraryConfirm] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');

  // Live feed
  const [liveArticles, setLiveArticles] = useState<LiveArticle[]>([]);
  const [liveSources, setLiveSources] = useState<LiveSource[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [liveQuery, setLiveQuery] = useState('');
  const [liveFetched, setLiveFetched] = useState(false);
  const [liveCategory, setLiveCategory] = useState<string>('eu');
  const [liveTimeFilter, setLiveTimeFilter] = useState<string>('all');
  // Skim mode hides the 2-line summary so the user can scan ~3x more
  // headlines per screen. Persisted to localStorage so the preference
  // survives reloads. Brief item M·03 #2.
  const [readMode, setReadMode] = useState<'skim' | 'read'>(() => {
    if (typeof window === 'undefined') return 'read';
    return (localStorage.getItem('mh:news-mode') as 'skim' | 'read') || 'read';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mh:news-mode', readMode);
  }, [readMode]);
  const [liveActiveSources, setLiveActiveSources] = useState<Set<string>>(new Set());
  const [liveImportanceFilter, setLiveImportanceFilter] = useState<string>('all');

  // Post new form
  const [postMode, setPostMode] = useState<'item' | 'date'>('item');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<NewsItem['type']>('internal_note');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postSuccess, setPostSuccess] = useState(false);

  // "Add a Date" form — drops a user-authored event onto a Policy Clock swim lane
  const [dateTitle, setDateTitle] = useState('');
  const [dateDescription, setDateDescription] = useState('');
  const [dateCategory, setDateCategory] = useState<PolicyClockSwimLane>('envi_committee');
  const [dateOn, setDateOn] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateLocation, setDateLocation] = useState('');
  const [dateSourceUrl, setDateSourceUrl] = useState('');
  const [dateTagsText, setDateTagsText] = useState('');
  const [dateImportant, setDateImportant] = useState(false);
  const [dateSubmitting, setDateSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');
  const [dateSuccess, setDateSuccess] = useState<string | null>(null);
  // DOI magic-wand state for the Share a New Item form.
  const [postDoi, setPostDoi] = useState('');
  const [postDoiLoading, setPostDoiLoading] = useState(false);
  const [postDoiError, setPostDoiError] = useState('');
  const [postDoiUrl, setPostDoiUrl] = useState('');

  // Secretariat Reading List — critical papers/reports to read later.
  // Persisted to localStorage under 'nf-reading-list'.
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const [rlTitle, setRlTitle] = useState('');
  const [rlAuthors, setRlAuthors] = useState('');
  const [rlUrl, setRlUrl] = useState('');
  const [rlKind, setRlKind] = useState<ReadingListItem['kind']>('paper');
  const [rlPriority, setRlPriority] = useState<ReadingListItem['priority']>('important');
  const [rlNotes, setRlNotes] = useState('');
  const [rlAddedBy, setRlAddedBy] = useState('');
  const [rlShowRead, setRlShowRead] = useState(false);
  // DOI magic-wand state for the reading list add form.
  const [rlDoi, setRlDoi] = useState('');
  const [rlDoiLoading, setRlDoiLoading] = useState(false);
  const [rlDoiError, setRlDoiError] = useState('');

  // Shared ESABCC reading list state
  const [rlTab, setRlTab] = useState<ReadingListTab>('personal');
  const [sharedReadingList, setSharedReadingList] = useState<SharedReadingListItem[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  // Add-to-news-reading-list modal
  const [newsToReadingList, setNewsToReadingList] = useState<{ title: string; url: string; authors?: string; sourceType: 'news-feed' | 'live-news'; sourceId?: string } | null>(null);

  // Edit-in-place modal state for the Edit button on feed cards.
  // Holds a draft copy of the fields so the user can cancel without
  // losing their place. `kind` tells the save handler which backend to hit.
  const [editItem, setEditItem] = useState<{
    id: string;
    kind: 'internal' | 'email_news_in';
    title: string;
    summary: string;
    aiSummary: string;
    tags: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Daily summary state
  const [dailySummary, setDailySummary] = useState<DailySummaryData | null>(null);
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [dailySummaryError, setDailySummaryError] = useState('');
  const [dailySummaryDates, setDailySummaryDates] = useState<string[]>([]);
  const [dailySummarySelectedDate, setDailySummarySelectedDate] = useState<string>('');
  const [showArchive, setShowArchive] = useState(false);

  // AI summary backfill state
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');

  // Whether the deployed environment has any LLM API key set (Gemini,
  // Anthropic, or OpenAI). `null` = not yet checked, `true`/`false` = known
  // from /api/inbound-email. Used to show a prominent warning banner when no
  // key is reaching runtime, which is the most common reason summaries
  // silently fail to generate (e.g. the env var was added to Vercel but the
  // project wasn't redeployed so the old serverless build doesn't see it).
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Load from localStorage (interaction state only — likes, comments, library,
  // reading lists). Internal posts themselves now live in Supabase and are
  // fetched below via /api/custom-posts.
  // Allow deep-linking into a specific view/mode via query string, e.g.
  // /news-feed?view=post&mode=date lands directly on the "Add a Date to the
  // Policy Clock" form. Used by the Policy Clock "+ Add date" button.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'feed' || v === 'live' || v === 'policy-clock' || v === 'post' || v === 'reading-list' || v === 'daily-summary') {
      setView(v);
    }
    const m = params.get('mode');
    if (m === 'item' || m === 'date') setPostMode(m);
  }, []);


  useEffect(() => {
    try {
      const storedLikes = localStorage.getItem('nf-likes');
      if (storedLikes) setLikedItems(new Set(JSON.parse(storedLikes)));
      const storedComments = localStorage.getItem('nf-comments');
      if (storedComments) setUserComments(JSON.parse(storedComments));
      const storedLibrary = localStorage.getItem('nf-library');
      if (storedLibrary) setAddedToLibrary(new Set(JSON.parse(storedLibrary)));
      const storedReading = localStorage.getItem('nf-reading-list');
      if (storedReading) setReadingList(JSON.parse(storedReading));
      const storedShared = localStorage.getItem('nf-shared-reading-list');
      if (storedShared) setSharedReadingList(JSON.parse(storedShared));

      // One-time migration: if legacy localStorage posts exist, push them to
      // Supabase so nothing is lost, then clear the key. Best-effort — if the
      // migration POST fails, we keep the legacy key around so a later visit
      // can retry.
      const legacy = localStorage.getItem('nf-custom-items');
      if (legacy) {
        try {
          const parsed: NewsItem[] = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            Promise.all(parsed.map(p =>
              fetch('/api/custom-posts', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  id: p.id,
                  title: p.title,
                  summary: p.summary,
                  aiSummary: p.aiSummary,
                  url: p.url,
                  publishedDate: p.publishedDate,
                  addedDate: p.addedDate,
                  addedBy: p.addedBy,
                  type: p.type,
                  tags: p.tags,
                  sourceLabel: p.sourceLabel,
                }),
              }).then(r => r.ok)
            ))
              .then(results => {
                if (results.every(Boolean)) {
                  localStorage.removeItem('nf-custom-items');
                }
              })
              .catch(() => { /* retry next visit */ });
          } else {
            localStorage.removeItem('nf-custom-items');
          }
        } catch {
          localStorage.removeItem('nf-custom-items');
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch custom (internal) posts from Supabase on mount and poll alongside
  // inbound emails. Posts no longer live in localStorage, so every device and
  // every team member sees the same feed.
  const refreshCustomPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-posts');
      if (!res.ok) return;
      const data = await res.json();
      const customItems: NewsItem[] = (data.items || []).map((it: {
        id: string; title: string; summary: string; aiSummary?: string;
        url: string; publishedDate: string; addedDate: string; addedBy: string;
        type: NewsItem['type']; tags: string[]; sourceLabel: string;
      }) => ({
        id: it.id,
        title: it.title,
        summary: it.summary,
        aiSummary: it.aiSummary,
        source: 'internal' as NewsItem['source'],
        sourceLabel: it.sourceLabel || 'ESABCC Secretariat',
        url: it.url || '',
        publishedDate: it.publishedDate,
        addedDate: it.addedDate,
        addedBy: it.addedBy || 'User',
        type: it.type,
        tags: it.tags || [],
        isExternal: false,
        likes: 0,
        comments: [],
      }));
      // Replace all custom posts in the feed with the fresh server copy.
      setItems(prev => {
        const nonCustom = prev.filter(p => !p.id.startsWith('nf-custom-'));
        return [...customItems, ...nonCustom];
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshCustomPosts();
    const interval = setInterval(refreshCustomPosts, 60000);
    return () => clearInterval(interval);
  }, [refreshCustomPosts]);

  // Fetch inbound email items and merge/replace them into the feed.
  // Hoisted so both the polling effect and the "regenerate AI summaries"
  // button can re-fetch after mutations.
  const refreshInbound = useCallback(async () => {
    try {
      const res = await fetch('/api/inbound-email?items=1');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.hasApiKey === 'boolean') setHasApiKey(data.hasApiKey);
      const inbound: NewsItem[] = (data.items || []).map((it: {
        id: string; title: string; summary: string; source: string; sourceLabel: string;
        url: string; publishedDate: string; receivedDate: string; tags: string[]; from: string;
        fullText?: string; aiSummary?: string; detailedAnalysis?: string;
        isDailySpecial?: boolean; specialKind?: string;
      }) => {
        const senderMatch = (it.from || '').match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/);
        const addedByName = senderMatch ? senderMatch[1].trim() : (it.from || 'Email').trim();

        const safeDate = (s: string) => {
          if (!s) return '';
          const d = new Date(s);
          return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
        };
        const published = safeDate(it.publishedDate) || safeDate(it.receivedDate) || new Date().toISOString().split('T')[0];
        const added = safeDate(it.receivedDate) || published;

        const validSources: NewsItem['source'][] = [
          'european_commission','eea','european_council','ipcc','unfccc','internal','email_news_in','other',
        ];
        const source = (validSources.includes(it.source as NewsItem['source']) ? it.source : 'email_news_in') as NewsItem['source'];

        return {
          id: it.id,
          title: it.title || '(no subject)',
          summary: it.summary || '',
          source,
          sourceLabel: it.sourceLabel || 'Email News-In',
          url: it.url || '',
          publishedDate: published,
          addedDate: added,
          addedBy: addedByName,
          type: 'article' as NewsItem['type'],
          tags: it.tags || [],
          isExternal: true,
          likes: 0,
          comments: [],
          fullText: it.fullText,
          aiSummary: it.aiSummary,
          detailedAnalysis: it.detailedAnalysis,
          isDailySpecial: it.isDailySpecial,
          specialKind: it.specialKind,
        };
      });
      // Replace existing inbound items rather than just merging — this way,
      // when the backfill endpoint adds aiSummary to existing items, the UI
      // actually picks up the updated field instead of keeping the stale copy.
      setItems((prev) => {
        const inboundIds = new Set(inbound.map((i) => i.id));
        const kept = prev.filter((p) => !inboundIds.has(p.id));
        return [...inbound, ...kept];
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshInbound();
    const interval = setInterval(refreshInbound, 60000);
    return () => clearInterval(interval);
  }, [refreshInbound]);

  // Delete a feed item (custom post or inbound email) from the server and
  // optimistically strip it from local state so the UI is instant.
  const deleteFeedItem = useCallback(async (item: NewsItem) => {
    const kind: 'internal' | 'email_news_in' | null =
      item.source === 'internal' ? 'internal'
        : item.source === 'email_news_in' ? 'email_news_in'
          : null;
    if (!kind) return;
    if (!confirm(`Delete "${item.title}"?\n\nThis removes it from the feed for everyone.`)) return;

    const endpoint = kind === 'internal' ? '/api/custom-posts' : '/api/inbound-email';
    try {
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed: ${data.error || res.statusText}`);
        return;
      }
      setItems(prev => prev.filter(p => p.id !== item.id));
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'network error'}`);
    }
  }, []);

  // Persist edits made in the inline editor modal. Title, summary, AI
  // summary, and tags are the fields the user is allowed to change - the
  // raw body/URL/source stay as originally posted.
  const saveEditedItem = useCallback(async () => {
    if (!editItem) return;
    const endpoint = editItem.kind === 'internal' ? '/api/custom-posts' : '/api/inbound-email';
    const tags = editItem.tags
      .split(/[,;\n]/)
      .map(t => t.trim())
      .filter(Boolean);
    setEditSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: editItem.id,
          title: editItem.title,
          summary: editItem.summary,
          aiSummary: editItem.aiSummary,
          tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error || res.statusText}`);
        return;
      }
      // Optimistic local update — avoids a flash of stale content before the
      // next poll.
      setItems(prev => prev.map(p =>
        p.id === editItem.id
          ? { ...p, title: editItem.title, summary: editItem.summary, aiSummary: editItem.aiSummary, tags }
          : p,
      ));
      setEditItem(null);
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'network error'}`);
    } finally {
      setEditSaving(false);
    }
  }, [editItem]);

  // Open the inline editor pre-filled from an item. Only called when the
  // item is of an editable source (internal or email_news_in); the card
  // itself hides the Edit button for RSS/live items which aren't stored
  // locally and therefore have no row to PATCH.
  const openEditModal = useCallback((item: NewsItem) => {
    const kind: 'internal' | 'email_news_in' | null =
      item.source === 'internal' ? 'internal'
        : item.source === 'email_news_in' ? 'email_news_in'
          : null;
    if (!kind) return;
    setEditItem({
      id: item.id,
      kind,
      title: item.title || '',
      summary: item.summary || '',
      aiSummary: item.aiSummary || '',
      tags: (item.tags || []).join(', '),
    });
  }, []);

  // Safety-net auto-backfill: if the inline summary at webhook arrival failed
  // (API overload, timeout, no key at the time, etc.), the next time the news
  // feed is opened we silently backfill any items that are still missing a
  // summary. Runs at most once per page load, and only when there's actually
  // something to fill in. This is in addition to the manual "Regenerate AI
  // summaries" button, which the user can still press to retry a stuck batch.
  const autoBackfillTriggered = useRef(false);
  useEffect(() => {
    if (autoBackfillTriggered.current) return;
    if (hasApiKey !== true) return;
    const missing = items.filter(
      (i) => i.source === 'email_news_in' && !i.aiSummary,
    ).length;
    if (missing === 0) return;

    autoBackfillTriggered.current = true;
    (async () => {
      try {
        await fetch('/api/inbound-email/backfill', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ max: 50 }),
        });
        await refreshInbound();
      } catch {
        // Silent failure — user can still click the manual button to see
        // the detailed error banner.
      }
    })();
  }, [items, hasApiKey, refreshInbound]);

  // Open the full-message modal. For Email News-In items that don't yet have
  // a stored AI summary, fetch one on-demand from /api/inbound-email/summarize.
  // For daily specials (Climate Action Press Review) also fetch the detailed
  // thematic analysis. For custom posts, generate an on-demand summary if missing.
  const openItemModal = useCallback(async (item: NewsItem) => {
    setSelectedItem(item);
    setSummaryError('');

    const isInboundEmail = item.source === 'email_news_in';
    const isCustomPost = item.id.startsWith('nf-custom-');

    const needsSummary = !item.aiSummary;
    const needsDetailed = !!item.isDailySpecial && !item.detailedAnalysis;

    // Skip if no summary work needed, or if item is neither email nor custom post
    if (!needsSummary && !needsDetailed) return;
    if (!isInboundEmail && !isCustomPost) return;

    setSummarizing(true);
    try {
      // For inbound emails, use the stored item id; for custom posts, send text directly
      const payload = isInboundEmail
        ? { id: item.id, detailed: !!item.isDailySpecial }
        : { subject: item.title, body: item.summary };
      const res = await fetch('/api/inbound-email/summarize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSummaryError(data.error || `HTTP ${res.status}`);
        return;
      }
      const updated: NewsItem = {
        ...item,
        aiSummary: data.aiSummary || item.aiSummary,
        detailedAnalysis: data.detailedAnalysis || item.detailedAnalysis,
      };
      setSelectedItem(updated);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      // Persist custom-post AI summaries to Supabase so every viewer sees them.
      if (isCustomPost && data.aiSummary) {
        fetch('/api/custom-posts', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: item.id, aiSummary: data.aiSummary }),
        }).catch(() => { /* non-fatal: will retry on next view */ });
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Summary failed');
    } finally {
      setSummarizing(false);
    }
  }, [session]);

  // Trigger backfill of AI summaries for items stored before the API key was set.
  // Also backfills custom posts stored in localStorage that are missing summaries.
  const runBackfill = useCallback(async () => {
    setBackfillRunning(true);
    setBackfillMessage('');
    try {
      // Backfill custom posts (localStorage) in parallel with inbound emails
      const customWithoutSummary = items.filter(
        i => i.id.startsWith('nf-custom-') && !i.aiSummary && i.summary.length >= 120
      );
      const customPromise = Promise.all(
        customWithoutSummary.map(async (item) => {
          try {
            const res = await fetch('/api/inbound-email/summarize', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify({ subject: item.title, body: item.summary }),
            });
            const data = await res.json();
            if (res.ok && data.aiSummary) return { id: item.id, aiSummary: data.aiSummary as string };
          } catch { /* skip failed items */ }
          return null;
        })
      );

      const res = await fetch('/api/inbound-email/backfill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ max: 50 }),
      });
      const data = await res.json();

      // Apply custom post summaries
      const customResults = (await customPromise).filter(Boolean) as Array<{ id: string; aiSummary: string }>;
      if (customResults.length > 0) {
        const summaryMap = new Map(customResults.map(r => [r.id, r.aiSummary]));
        setItems(prev => prev.map(i =>
          summaryMap.has(i.id) ? { ...i, aiSummary: summaryMap.get(i.id)! } : i
        ));
        // Persist to Supabase so the updated summaries are visible everywhere.
        await Promise.all(customResults.map(r =>
          fetch('/api/custom-posts', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: r.id, aiSummary: r.aiSummary }),
          }).catch(() => null)
        ));
      }

      if (!res.ok) {
        setBackfillMessage(
          data.message || data.error || `Backfill failed (HTTP ${res.status})`
        );
      } else {
        const { processed, updated, skipped, itemsStillMissingSummary, reasons, firstError } = data as {
          processed: number; updated: number; skipped: number; itemsStillMissingSummary: number;
          reasons?: Record<string, number>;
          firstError?: { statusCode?: number; body?: string } | null;
        };
        // Surface reasons for skipped items — without this, a run where every
        // call failed with `no-api-key` or `api-error` looks identical to a
        // run where every item was just too short to summarise, which makes
        // it impossible for the user to diagnose why summaries aren't landing.
        const reasonEntries = Object.entries(reasons || {}).filter(([, n]) => n > 0);
        const reasonSuffix = reasonEntries.length
          ? ` Reasons: ${reasonEntries.map(([k, n]) => `${n} ${k}`).join(', ')}.`
          : '';
        // Include the first LLM error verbatim so we can actually see what
        // went wrong (wrong model, invalid key, rate limit, etc.) regardless
        // of which provider — Gemini, Anthropic, or OpenAI — is configured.
        const errorSuffix = firstError
          ? ` First error: ${firstError.statusCode ? `HTTP ${firstError.statusCode} — ` : ''}${firstError.body || '(no body)'}`
          : '';
        const customSuffix = customResults.length > 0
          ? ` ${customResults.length} custom post(s) also summarised.`
          : '';
        const tail = itemsStillMissingSummary > 0
          ? ` ${itemsStillMissingSummary} still missing — click again to continue.`
          : ' All items now have AI summaries.';
        setBackfillMessage(
          `Processed ${processed} items — ${updated} summarised, ${skipped} skipped.${reasonSuffix}${customSuffix}${tail}${errorSuffix}`
        );
        await refreshInbound();
      }
    } catch (err) {
      setBackfillMessage(err instanceof Error ? err.message : 'Backfill request failed');
    } finally {
      setBackfillRunning(false);
    }
  }, [refreshInbound, items, session]);

  // Fetch live news when switching to live tab
  const fetchLiveNews = useCallback(async (q?: string) => {
    setLiveLoading(true);
    setLiveError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/live-news?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLiveArticles(data.articles || []);
      if (data.sources) setLiveSources(data.sources);
      setLiveFetched(true);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Failed to fetch live news');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'live' && !liveFetched) fetchLiveNews();
  }, [view, liveFetched, fetchLiveNews]);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async (date?: string) => {
    setDailySummaryLoading(true);
    setDailySummaryError('');
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const res = await fetch(`/api/daily-summary?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          setDailySummaryError('No summary available yet for this date. The daily summary is generated automatically each morning.');
          setDailySummary(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setDailySummary(data);
    } catch (err) {
      setDailySummaryError(err instanceof Error ? err.message : 'Failed to load daily summary');
    } finally {
      setDailySummaryLoading(false);
    }
  }, []);

  // Fetch available dates list when entering daily-summary view
  const dailySummaryFetched = useRef(false);
  useEffect(() => {
    if (view === 'daily-summary' && !dailySummaryFetched.current) {
      dailySummaryFetched.current = true;
      fetchDailySummary();
      fetch('/api/daily-summary?list=1')
        .then(r => r.json())
        .then(d => { if (d.dates) setDailySummaryDates(d.dates); })
        .catch(() => {});
    }
  }, [view, fetchDailySummary]);

  // Persist likes (requires login)
  const toggleLike = useCallback(async (id: string) => {
    const authUser = await requireAuth('Sign in to like items.');
    if (!authUser) return;
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('nf-likes', JSON.stringify([...next]));
      return next;
    });
  }, [requireAuth]);

  // Persist comments (requires login)
  const addComment = useCallback(async (itemId: string) => {
    const authUser = await requireAuth('Sign in to post a comment.');
    if (!authUser) return;
    const text = commentInputs[itemId]?.trim();
    if (!text) return;
    const comment: NewsComment = {
      id: `uc-${Date.now()}`,
      author: displayName || 'Anonymous',
      text,
      date: new Date().toISOString().split('T')[0],
    };
    setUserComments(prev => {
      const next = { ...prev, [itemId]: [...(prev[itemId] || []), comment] };
      localStorage.setItem('nf-comments', JSON.stringify(next));
      return next;
    });
    setCommentInputs(prev => ({ ...prev, [itemId]: '' }));
  }, [commentInputs, requireAuth, displayName]);

  // Add to reference library (requires login)
  const addToLibrary = useCallback(async (id: string) => {
    const authUser = await requireAuth('Sign in to add items to your library.');
    if (!authUser) return;
    setAddedToLibrary(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('nf-library', JSON.stringify([...next]));
      return next;
    });
    setShowLibraryConfirm(id);
    setTimeout(() => setShowLibraryConfirm(null), 2000);
  }, [requireAuth]);

  // Post new item (requires login). Persists to Supabase via /api/custom-posts
  // so the post survives cold starts, redeployments, and is visible to every
  // team member — not just the author's browser.
  const handlePost = useCallback(async () => {
    const authUser = await requireAuth('Sign in to post items to the feed.');
    if (!authUser) return;
    if (!postTitle.trim() || !postContent.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      title: postTitle.trim(),
      summary: postContent.trim(),
      url: postDoiUrl || '',
      publishedDate: today,
      addedDate: today,
      addedBy: displayName || 'Anonymous',
      authorId: authUser.id,
      type: postType,
      tags: postTags.length > 0 ? postTags : autoSuggestTags(postTitle + ' ' + postContent),
      sourceLabel: 'ESABCC Secretariat',
    };

    let created: NewsItem | null = null;
    try {
      const res = await fetch('/api/custom-posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[news-feed] Failed to save post:', data.error || res.statusText);
        return;
      }
      const data = await res.json();
      const saved = data.item as {
        id: string; title: string; summary: string; aiSummary?: string;
        url: string; publishedDate: string; addedDate: string; addedBy: string;
        type: NewsItem['type']; tags: string[]; sourceLabel: string;
      };
      created = {
        id: saved.id,
        title: saved.title,
        summary: saved.summary,
        aiSummary: saved.aiSummary,
        source: 'internal',
        sourceLabel: saved.sourceLabel || 'ESABCC Secretariat',
        url: saved.url || '',
        publishedDate: saved.publishedDate,
        addedDate: saved.addedDate,
        addedBy: saved.addedBy,
        type: saved.type,
        tags: saved.tags || [],
        isExternal: false,
        likes: 0,
        comments: [],
      };
    } catch (err) {
      console.error('[news-feed] Network error saving post:', err);
      return;
    }

    const newItem = created;
    setItems(prev => [newItem, ...prev]);

    // Generate AI summary in the background (non-blocking) and PATCH it back
    // to Supabase so every viewer — not just this tab — sees the summary.
    const itemId = newItem.id;
    fetch('/api/inbound-email/summarize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ subject: newItem.title, body: newItem.summary }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.aiSummary) return;
        setItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, aiSummary: data.aiSummary } : i
        ));
        return fetch('/api/custom-posts', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: itemId, aiSummary: data.aiSummary }),
        });
      })
      .catch(() => { /* non-fatal: post exists without AI summary */ });

    setPostTitle('');
    setPostContent('');
    setPostType('internal_note');
    setPostTags([]);
    setPostDoi('');
    setPostDoiError('');
    setPostDoiUrl('');
    setPostSuccess(true);
    setTimeout(() => { setPostSuccess(false); setView('feed'); }, 1500);
  }, [postTitle, postContent, postType, postTags, postDoiUrl, requireAuth, displayName, session]);

  // Post a new Policy Clock date (any swim lane). When "important" is ticked,
  // the API fans out a notification to every other registered user.
  const handlePostDate = useCallback(async () => {
    const authUser = await requireAuth('Sign in to add a date to the Policy Clock.');
    if (!authUser) return;
    if (!dateTitle.trim() || !dateOn) {
      setDateError('Title and date are required.');
      return;
    }
    if (dateEnd && dateEnd < dateOn) {
      setDateError('End date cannot be before the start date.');
      return;
    }
    setDateError('');
    setDateSubmitting(true);
    try {
      const tags = dateTagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/policy-clock/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: dateTitle.trim(),
          description: dateDescription.trim(),
          category: dateCategory,
          date: dateOn,
          endDate: dateEnd || undefined,
          location: dateLocation.trim() || undefined,
          sourceUrl: dateSourceUrl.trim() || undefined,
          sourceLabel: displayName || 'Secretariat',
          importance: dateImportant ? 'high' : 'normal',
          tags,
          addedBy: displayName || 'Anonymous',
          authorId: authUser.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDateError(data.error || `Failed to add date (HTTP ${res.status}).`);
        return;
      }
      const notifiedCount: number = typeof data.notified === 'number' ? data.notified : 0;
      setDateSuccess(
        dateImportant
          ? `Date added. ${notifiedCount} colleague${notifiedCount === 1 ? '' : 's'} notified.`
          : 'Date added to the Policy Clock.',
      );
      setDateTitle('');
      setDateDescription('');
      setDateOn('');
      setDateEnd('');
      setDateLocation('');
      setDateSourceUrl('');
      setDateTagsText('');
      setDateImportant(false);
      setTimeout(() => {
        setDateSuccess(null);
        setView('policy-clock');
      }, 1600);
    } catch (err) {
      setDateError((err as Error).message || 'Network error.');
    } finally {
      setDateSubmitting(false);
    }
  }, [
    requireAuth,
    displayName,
    dateTitle,
    dateDescription,
    dateCategory,
    dateOn,
    dateEnd,
    dateLocation,
    dateSourceUrl,
    dateTagsText,
    dateImportant,
  ]);

  // ── Reading list handlers ────────────────────────────────────────────────
  const persistReadingList = useCallback((list: ReadingListItem[]) => {
    localStorage.setItem('nf-reading-list', JSON.stringify(list));
  }, []);

  // Sync a reading-list entry to the shared Reference Manager library so every
  // reading list article has a corresponding library record. Returns the
  // library entry id on success, or null if the sync failed (in which case the
  // reading list item still works via its external URL fallback).
  //
  // Only entries with a DOI are synced — the Reference Manager is for actual
  // papers (inserted via the DOI magic-wand), not free-form news links or
  // internal notes that would otherwise clutter the library.
  const syncToReferenceLibrary = useCallback(async (data: {
    title: string;
    authors?: string;
    url?: string;
    doi?: string;
    kind: ReadingListItem['kind'];
  }): Promise<string | null> => {
    if (!data.title?.trim()) return null;
    const cleanDoi = (data.doi || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!cleanDoi) return null;
    const kindToCsl: Record<ReadingListItem['kind'], string> = {
      paper: 'article-journal',
      article: 'article-journal',
      report: 'report',
      book: 'book',
      news: 'webpage',
      other: 'article-journal',
    };
    try {
      const resp = await fetch('/api/references/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doi: cleanDoi,
          title: data.title,
          authors: data.authors || '',
          year: '',
          journal: '',
          type: kindToCsl[data.kind] || 'article-journal',
          volume: '',
          issue: '',
          pages: '',
          url: data.url || (cleanDoi ? `https://doi.org/${cleanDoi}` : ''),
          fullCitation: '',
          source: 'reading-list',
        }),
      });
      if (!resp.ok) return null;
      const json = await resp.json().catch(() => null as unknown);
      const id = (json as { id?: string } | null)?.id;
      return typeof id === 'string' && id ? id : null;
    } catch {
      return null;
    }
  }, []);

  const addReadingListItem = useCallback((overrides?: { title?: string; authors?: string; url?: string; doi?: string; kind?: ReadingListItem['kind']; notes?: string; sourceType?: ReadingListItem['sourceType']; sourceId?: string; referenceId?: string }) => {
    const title = overrides?.title ?? rlTitle.trim();
    if (!title) return;
    const itemId = `rl-${Date.now()}`;
    const item: ReadingListItem = {
      id: itemId,
      title,
      authors: overrides?.authors ?? rlAuthors.trim(),
      url: overrides?.url ?? rlUrl.trim(),
      doi: overrides?.doi ?? (rlDoi.trim() || undefined),
      kind: overrides?.kind ?? rlKind,
      priority: rlPriority,
      notes: overrides?.notes ?? rlNotes.trim(),
      addedBy: displayName || rlAddedBy.trim() || 'Anonymous',
      addedDate: new Date().toISOString().split('T')[0],
      read: false,
      sourceType: overrides?.sourceType ?? 'manual',
      sourceId: overrides?.sourceId,
      // Reuse the caller's referenceId if it already knows the library entry
      // (e.g. items coming from the Reference Manager itself), otherwise we'll
      // fill it in via the background sync below.
      referenceId: overrides?.referenceId
        ?? (overrides?.sourceType === 'reference-manager' ? overrides?.sourceId : undefined),
    };
    setReadingList(prev => {
      const next = [item, ...prev];
      persistReadingList(next);
      return next;
    });
    // Auto-sync to the Reference Manager library in the background. We update
    // the same item in state (and persist) once the library entry id is known
    // so future clicks deep-link to /references?ref=<id> instead of the URL.
    if (!item.referenceId) {
      syncToReferenceLibrary({
        title: item.title,
        authors: item.authors,
        url: item.url,
        doi: item.doi,
        kind: item.kind,
      }).then(refId => {
        if (!refId) return;
        setReadingList(prev => {
          const next = prev.map(i => i.id === itemId ? { ...i, referenceId: refId } : i);
          persistReadingList(next);
          return next;
        });
      });
    }
    if (!overrides) {
      setRlTitle('');
      setRlAuthors('');
      setRlUrl('');
      setRlKind('paper');
      setRlPriority('important');
      setRlNotes('');
      setRlDoi('');
      setRlDoiError('');
    }
  }, [rlTitle, rlAuthors, rlUrl, rlKind, rlPriority, rlNotes, rlAddedBy, rlDoi, displayName, user, persistReadingList, syncToReferenceLibrary]);

  const toggleReadingItemRead = useCallback((id: string) => {
    setReadingList(prev => {
      const next = prev.map(i => i.id === id ? { ...i, read: !i.read } : i);
      persistReadingList(next);
      return next;
    });
  }, [persistReadingList]);

  const deleteReadingItem = useCallback((id: string) => {
    setReadingList(prev => {
      const next = prev.filter(i => i.id !== id);
      persistReadingList(next);
      return next;
    });
  }, [persistReadingList]);

  // DOI magic-wand: look up a DOI on Crossref and auto-fill the reading-list
  // form (title, authors, link, kind). Mirrors the pattern used in the full
  // Reference Manager form in /references so contributors get a consistent UX.
  const lookupReadingDoi = useCallback(async () => {
    const cleanDoi = rlDoi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!cleanDoi) {
      setRlDoiError('Enter a DOI first');
      return;
    }
    setRlDoiLoading(true);
    setRlDoiError('');
    try {
      const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (!resp.ok) throw new Error('DOI not found');
      const data = await resp.json();
      const item = data.message;

      if (item.title?.[0]) setRlTitle(item.title[0]);

      if (item.author?.length) {
        const authorStr = item.author
          .map((a: { family?: string; given?: string }) =>
            a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || '')
          .filter(Boolean)
          .join('; ');
        setRlAuthors(authorStr);
      }

      // Prefer a canonical doi.org link so clicking in the list resolves via
      // the DOI system even if the publisher moves the article.
      setRlUrl(`https://doi.org/${cleanDoi}`);

      // Map Crossref types to the reading list's coarser `kind` categories.
      const kindMap: Record<string, ReadingListItem['kind']> = {
        'journal-article': 'paper',
        'proceedings-article': 'paper',
        'book-chapter': 'book',
        'book': 'book',
        'monograph': 'book',
        'report': 'report',
        'report-component': 'report',
        'posted-content': 'paper',
      };
      if (item.type && kindMap[item.type]) setRlKind(kindMap[item.type]);

      // Also auto-add to the reference manager so DOI-fetched items land in
      // both the reading list and the reference library.
      try {
        const refTitle = item.title?.[0] || '';
        const refAuthors = item.author
          ?.map((a: { family?: string; given?: string }) =>
            a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || '')
          .filter(Boolean)
          .join('; ') || '';
        const refYear = item.issued?.['date-parts']?.[0]?.[0]?.toString() || '';
        const refJournal = item['container-title']?.[0] || '';
        const refVolume = item.volume || '';
        const refIssue = item.issue || '';
        const refPages = item.page || '';
        const refType = item.type === 'journal-article' ? 'article-journal'
          : item.type === 'book' ? 'book'
          : item.type === 'report' ? 'report'
          : 'article-journal';
        await fetch('/api/references/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doi: cleanDoi,
            title: refTitle,
            authors: refAuthors,
            year: refYear,
            journal: refJournal,
            type: refType,
            volume: refVolume,
            issue: refIssue,
            pages: refPages,
            url: `https://doi.org/${cleanDoi}`,
            fullCitation: `${refAuthors} (${refYear}). ${refTitle}. ${refJournal}`,
            source: 'reading-list',
          }),
        });
      } catch { /* best effort — reference manager sync is non-blocking */ }
    } catch {
      setRlDoiError('Could not find reference for this DOI. Check the DOI and try again.');
    } finally {
      setRlDoiLoading(false);
    }
  }, [rlDoi]);

  // ── Shared reading list handlers ───────────────────────────────────────────
  // Server-backed via /api/news-feed/shared-list (migration 021). Items and
  // upvote counts are read from Supabase; localStorage is now used only as
  // an offline cache so a fresh tab paints something while the server
  // round-trip is in flight, and as the fallback when the user is signed
  // out / Supabase is not configured.

  const SHARED_CACHE_KEY = 'nf-shared-reading-list';

  /** Hit the server with the current bearer token. Returns null when
   *  there is no session — the caller stays on the optimistic local copy. */
  const sharedFetch = useCallback(async (input: string, init?: RequestInit): Promise<Response | null> => {
    if (!session?.access_token) return null;
    return fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  }, [session]);

  const applyServerItems = useCallback((items: SharedReadingListItem[]) => {
    setSharedReadingList(items);
    try { localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(items)); } catch { /* ignore quota */ }
  }, []);

  const loadSharedReadingList = useCallback(async () => {
    // Hydrate from cache first for instant paint…
    try {
      const stored = localStorage.getItem(SHARED_CACHE_KEY);
      if (stored) setSharedReadingList(JSON.parse(stored));
    } catch { /* ignore */ }
    // …then reconcile with the server. Silent on failure.
    const res = await sharedFetch('/api/news-feed/shared-list');
    if (!res || !res.ok) return;
    const body = (await res.json().catch(() => null)) as { items?: SharedReadingListItem[] } | null;
    if (body?.items) applyServerItems(body.items);
  }, [sharedFetch, applyServerItems]);

  // Refresh whenever the auth state changes (sign in pulls everyone else's
  // items; sign out leaves the local cache visible but read-only).
  useEffect(() => { void loadSharedReadingList(); }, [loadSharedReadingList]);

  const addToSharedReadingList = useCallback(async (item: ReadingListItem) => {
    const authUser = await requireAuth('Sign in to share items to the ESABCC reading list.');
    if (!authUser) return;
    const userName = displayName || 'Anonymous';
    const carriedRefId = item.referenceId
      || (item.sourceType === 'reference-manager' ? item.sourceId : undefined);
    // Cheap duplicate-by-title guard against the local copy. The server
    // does not enforce this — two reviewers may legitimately add similar
    // titles — but it stops the same-tab "click twice" pattern.
    if (sharedReadingList.some(e => e.title.toLowerCase() === item.title.toLowerCase())) {
      setShareSuccess('Already on the shared list!');
      setTimeout(() => setShareSuccess(null), 2000);
      return;
    }
    const res = await sharedFetch('/api/news-feed/shared-list', {
      method: 'POST',
      body: JSON.stringify({
        title: item.title,
        authors: item.authors,
        url: item.url,
        doi: item.doi,
        kind: item.kind,
        priority: item.priority,
        notes: item.notes,
        sourceType: item.sourceType,
        referenceId: carriedRefId,
        addedByName: userName,
      }),
    });
    if (!res || !res.ok) {
      // Server unreachable — keep an optimistic local copy so the user
      // doesn't lose what they just typed. This row carries a `srl-`
      // prefix; the next successful loadSharedReadingList will reconcile
      // by replacing the cache wholesale.
      const sharedId = `srl-${Date.now()}`;
      const optimistic: SharedReadingListItem = {
        id: sharedId, title: item.title, authors: item.authors, url: item.url, doi: item.doi,
        kind: item.kind as SharedReadingListItem['kind'],
        priority: item.priority as SharedReadingListItem['priority'],
        notes: item.notes, addedByName: userName, addedById: authUser.id,
        addedDate: new Date().toISOString().split('T')[0],
        upvotes: 0, upvotedByMe: false, sourceType: item.sourceType, referenceId: carriedRefId,
      };
      applyServerItems([optimistic, ...sharedReadingList]);
    } else {
      const body = (await res.json()) as { items: SharedReadingListItem[] };
      applyServerItems(body.items);
    }
    setShareSuccess(item.id);
    setTimeout(() => setShareSuccess(null), 2000);

    // If no library id yet, sync the reference and PATCH the shared row.
    if (!carriedRefId) {
      const refId = await syncToReferenceLibrary({
        title: item.title, authors: item.authors, url: item.url, doi: item.doi, kind: item.kind,
      });
      if (refId) {
        setReadingList(prev => {
          const updated = prev.map(i => i.id === item.id ? { ...i, referenceId: refId } : i);
          persistReadingList(updated);
          return updated;
        });
        // Find the just-added shared row by title and PATCH its reference_id.
        const target = (sharedReadingList[0]?.title === item.title ? sharedReadingList[0] : undefined);
        if (target?.id && !target.id.startsWith('srl-')) {
          await sharedFetch(`/api/news-feed/shared-list?id=${encodeURIComponent(target.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ referenceId: refId }),
          });
          await loadSharedReadingList();
        }
      }
    }
  }, [
    requireAuth, displayName, sharedFetch, applyServerItems, sharedReadingList,
    syncToReferenceLibrary, persistReadingList, loadSharedReadingList,
  ]);

  const addDirectToSharedList = useCallback(async (data: { title: string; authors: string; url: string; doi?: string; kind: SharedReadingListItem['kind']; priority: SharedReadingListItem['priority']; notes: string; sourceType?: string; sourceId?: string; referenceId?: string }) => {
    const authUser = await requireAuth('Sign in to add items to the ESABCC reading list.');
    if (!authUser) return;
    const userName = displayName || 'Anonymous';
    const referenceId = data.referenceId
      ?? (data.sourceType === 'reference-manager' ? data.sourceId : undefined);
    const res = await sharedFetch('/api/news-feed/shared-list', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title, authors: data.authors, url: data.url, doi: data.doi,
        kind: data.kind, priority: data.priority, notes: data.notes,
        sourceType: data.sourceType, referenceId, addedByName: userName,
      }),
    });
    if (!res || !res.ok) {
      const sharedId = `srl-${Date.now()}`;
      const optimistic: SharedReadingListItem = {
        id: sharedId, title: data.title, authors: data.authors, url: data.url, doi: data.doi,
        kind: data.kind, priority: data.priority, notes: data.notes,
        addedByName: userName, addedById: authUser.id,
        addedDate: new Date().toISOString().split('T')[0],
        upvotes: 0, upvotedByMe: false, sourceType: data.sourceType, referenceId,
      };
      applyServerItems([optimistic, ...sharedReadingList]);
    } else {
      const body = (await res.json()) as { items: SharedReadingListItem[] };
      applyServerItems(body.items);
    }
    if (!referenceId) {
      const refId = await syncToReferenceLibrary({
        title: data.title, authors: data.authors, url: data.url, doi: data.doi, kind: data.kind,
      });
      if (refId) {
        const target = sharedReadingList.find(i => i.title === data.title);
        if (target?.id && !target.id.startsWith('srl-')) {
          await sharedFetch(`/api/news-feed/shared-list?id=${encodeURIComponent(target.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ referenceId: refId }),
          });
          await loadSharedReadingList();
        }
      }
    }
  }, [
    requireAuth, displayName, sharedFetch, applyServerItems, sharedReadingList,
    syncToReferenceLibrary, loadSharedReadingList,
  ]);

  const toggleSharedUpvote = useCallback(async (itemId: string) => {
    const authUser = await requireAuth('Sign in to upvote items.');
    if (!authUser) return;
    // Optimistic flip first, then reconcile with server.
    const before = sharedReadingList;
    const wasUp = before.find(i => i.id === itemId)?.upvotedByMe ?? false;
    const optimistic = before.map(i =>
      i.id !== itemId ? i : { ...i, upvotedByMe: !wasUp, upvotes: wasUp ? i.upvotes - 1 : i.upvotes + 1 },
    );
    applyServerItems(optimistic);
    const res = await sharedFetch('/api/news-feed/shared-list', {
      method: 'POST',
      body: JSON.stringify({ op: wasUp ? 'downvote' : 'upvote', id: itemId }),
    });
    if (!res || !res.ok) {
      // Revert on failure.
      applyServerItems(before);
      return;
    }
    const body = (await res.json()) as { items: SharedReadingListItem[] };
    applyServerItems(body.items);
  }, [requireAuth, sharedFetch, applyServerItems, sharedReadingList]);

  const deleteSharedItem = useCallback(async (itemId: string) => {
    const before = sharedReadingList;
    applyServerItems(before.filter(i => i.id !== itemId));
    const res = await sharedFetch(
      `/api/news-feed/shared-list?id=${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
    );
    if (!res || !res.ok) {
      // Revert on failure (e.g. RLS rejected because we're not the adder).
      applyServerItems(before);
      return;
    }
    const body = (await res.json()) as { items: SharedReadingListItem[] };
    applyServerItems(body.items);
  }, [sharedFetch, applyServerItems, sharedReadingList]);

  // Add a news item to reading list (personal or shared)
  const addNewsToReadingList = useCallback(async (
    data: { title: string; url: string; authors?: string; sourceType: 'news-feed' | 'live-news'; sourceId?: string },
    target: 'personal' | 'shared'
  ) => {
    if (target === 'personal') {
      const authUser = await requireAuth('Sign in to use your personal reading list.');
      if (!authUser) return;
      addReadingListItem({
        title: data.title,
        authors: data.authors || '',
        url: data.url,
        kind: 'news',
        notes: '',
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      });
    } else {
      await addDirectToSharedList({
        title: data.title,
        authors: data.authors || '',
        url: data.url,
        kind: 'news',
        priority: 'important',
        notes: '',
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      });
    }
    setNewsToReadingList(null);
  }, [requireAuth, addReadingListItem, addDirectToSharedList]);

  // DOI magic-wand for the "Share a New Item" form: look up a DOI on Crossref,
  // auto-generate a nice sharing text, and add the reference to the library.
  const lookupPostDoi = useCallback(async () => {
    const cleanDoi = postDoi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!cleanDoi) {
      setPostDoiError('Enter a DOI first');
      return;
    }
    setPostDoiLoading(true);
    setPostDoiError('');
    try {
      const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (!resp.ok) throw new Error('DOI not found');
      const data = await resp.json();
      const item = data.message;

      const title = item.title?.[0] || '';

      // Build author strings — short for the sharing text, long for the library
      let authorsShort = '';
      let libAuthors = '';
      if (item.author?.length) {
        libAuthors = item.author
          .map((a: { family?: string; given?: string }) =>
            a.family && a.given ? `${a.family}, ${a.given.charAt(0)}.` : a.family || a.given || '')
          .filter(Boolean)
          .join('; ');
        if (item.author.length > 2) {
          const first = item.author[0];
          authorsShort = (first.family || first.given || 'Unknown') + ' et al.';
        } else {
          authorsShort = item.author
            .map((a: { family?: string; given?: string }) =>
              a.family && a.given ? `${a.given} ${a.family}` : a.family || a.given || '')
            .filter(Boolean)
            .join(' and ');
        }
      }

      const journal = item['container-title']?.[0] || '';

      // Auto-generate a ready-to-post sharing text
      let content = 'Have a look at this interesting article';
      if (authorsShort) content += ` by ${authorsShort}`;
      if (title) content += ` with the title "${title}"`;
      if (journal) content += ` in the journal ${journal}`;
      content += '.';

      setPostContent(content);
      if (title) setPostTitle(title);
      setPostDoiUrl(`https://doi.org/${cleanDoi}`);

      // Map Crossref type → news-feed type
      const typeMap: Record<string, NewsItem['type']> = {
        'journal-article': 'paper',
        'proceedings-article': 'paper',
        'book-chapter': 'article',
        'book': 'report',
        'report': 'report',
        'posted-content': 'paper',
      };
      if (item.type && typeMap[item.type]) setPostType(typeMap[item.type]);

      // Auto-suggest tags from the article metadata
      const combinedText = `${title} ${journal} ${libAuthors}`;
      const suggested = autoSuggestTags(combinedText);
      if (suggested.length > 0) setPostTags(suggested);

      // Derive year for the reference library entry
      const publishedParts =
        item['published-print']?.['date-parts']?.[0] ||
        item['published-online']?.['date-parts']?.[0] ||
        item['created']?.['date-parts']?.[0] ||
        [];
      const year = publishedParts[0] ? String(publishedParts[0]) : '';

      // Add to the reference library automatically (fire-and-forget — posting
      // the news item is the primary goal).
      try {
        await fetch('/api/references/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doi: cleanDoi,
            title,
            authors: libAuthors,
            year,
            journal,
            type: 'article-journal',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.page || '',
            url: `https://doi.org/${cleanDoi}`,
            source: 'web',
          }),
        });
      } catch {
        // Silently continue – the news post is what matters
      }
    } catch {
      setPostDoiError('Could not find reference for this DOI. Check the DOI and try again.');
    } finally {
      setPostDoiLoading(false);
    }
  }, [postDoi]);

  // Auto-suggest tags when typing in post form
  const suggestedTags = useMemo(() => {
    if (!postTitle && !postContent) return [];
    return autoSuggestTags(postTitle + ' ' + postContent);
  }, [postTitle, postContent]);

  // Filtered items
  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
    }
    if (selectedSources.size > 0) {
      result = result.filter(i => selectedSources.has(i.source));
    }
    if (selectedTypes.size > 0) {
      result = result.filter(i => selectedTypes.has(i.type));
    }
    if (selectedTags.size > 0) {
      result = result.filter(i => i.tags.some(t => selectedTags.has(t)));
    }
    if (filterExternal === 'external') result = result.filter(i => i.isExternal);
    if (filterExternal === 'internal') result = result.filter(i => !i.isExternal);
    // Chronological (newest first). Within the same day, manually posted
    // (internal) items float above auto-ingested ones so they stand out.
    return result.sort((a, b) => {
      const dateA = a.publishedDate || '';
      const dateB = b.publishedDate || '';
      // Primary: date descending
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      // Secondary: manual/internal items first on the same day
      const manualA = !a.isExternal ? 1 : 0;
      const manualB = !b.isExternal ? 1 : 0;
      return manualB - manualA;
    });
  }, [items, search, selectedSources, selectedTypes, selectedTags, filterExternal]);


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <OnboardingTour
        moduleKey="news-feed"
        steps={[
          { title: 'Live + curated feed', body: 'Top of the page is the rolling 24h EU briefing. Scroll for the curated weekly feed.' },
          { title: 'Saved searches', body: 'Save a query once; the counter shows how many new items have landed since you last ran it.' },
          { title: 'Suggest a policy', body: 'Each card has an "↗" affordance that jumps to the matched EU policy.' },
        ]}
      />
      <PageHero
        title="Secretariat News"
        subtitle="Curated climate policy news and internal notes."
      />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* 24h News Update banner — links to the dedicated one-pager */}
        <Link
          href="/news-feed/daily-briefing"
          className="flex items-center gap-3 rounded-lg border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 px-4 py-3 mb-4 transition group"
        >
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-secondary group-hover:text-secondary-dark transition-colors">24h News Update</span>
            <span className="hidden sm:inline text-xs text-tertiary ml-2">— Today&apos;s EU climate &amp; energy briefing in a single page</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary/50 group-hover:text-secondary transition flex-shrink-0">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

        {/* View tabs — horizontally scrollable on mobile */}
        <div className="border-b border-grey-200 mb-4">
          <div className="h-scroll flex gap-4 items-center -mx-3 sm:mx-0 px-3 sm:px-0">
            {([
              ['daily-summary', '24h Summary'],
              ['feed', 'Feed'],
              ['live', 'Live News'],
              ['policy-clock', 'Policy Clock'],
              ['post', 'Post New'],
              ['reading-list', 'Reading List'],
            ] as [ViewMode, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                className={`shrink-0 px-1 pb-2 text-[13px] sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  view === key
                    ? 'border-b-2 border-secondary text-secondary'
                    : 'text-tertiary hover:text-tertiary-dark'
                }`}>
                {label}
              </button>
            ))}
            {/* Brussels Bulletin link removed — module parked under beta/. */}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pb-4 sm:pb-8">
        {/* ──────── 24h Daily Summary View ──────── */}
        {view === 'daily-summary' && (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-tertiary-dark leading-tight">
                    {dailySummary?.title || 'EU Climate & Energy Daily Briefing'}
                  </h2>
                  <p className="text-sm text-tertiary mt-1">
                    {dailySummary?.subtitle || 'Key developments from the last 24 hours'}
                  </p>
                  {dailySummary?.date && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-secondary bg-secondary/10 rounded px-2 py-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Edition {dailySummary.date}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowArchive(s => !s)}
                    className={`text-sm font-medium border rounded-lg px-3 py-2 transition flex items-center gap-1.5 ${
                      showArchive
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-secondary/30 hover:bg-secondary/5'
                    }`}
                    title="Browse past daily editions">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                    </svg>
                    Archive {dailySummaryDates.length > 0 ? `(${dailySummaryDates.length})` : ''}
                  </button>
                </div>
              </div>

              {/* Archive panel — expandable grid of all past editions */}
              {showArchive && (
                <div className="mb-4 bg-grey-50 rounded-lg border border-grey-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-tertiary-dark">Past editions</h3>
                    <span className="text-xs text-tertiary">{dailySummaryDates.length} edition{dailySummaryDates.length !== 1 ? 's' : ''}</span>
                  </div>
                  {dailySummaryDates.length === 0 ? (
                    <p className="text-xs text-tertiary italic">No past editions yet — check back tomorrow after 06:00 Copenhagen time.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setDailySummarySelectedDate('');
                          fetchDailySummary();
                          setShowArchive(false);
                        }}
                        className={`text-left rounded-lg border p-2.5 transition ${
                          !dailySummarySelectedDate
                            ? 'border-secondary bg-secondary/10 text-secondary'
                            : 'border-grey-200 bg-white hover:border-secondary/40 hover:bg-secondary/5'
                        }`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Latest</div>
                        <div className="text-xs font-mono mt-0.5 text-tertiary">newest</div>
                      </button>
                      {dailySummaryDates.map(d => {
                        const dateObj = new Date(d);
                        const label = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                        const isSelected = dailySummarySelectedDate === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDailySummarySelectedDate(d);
                              fetchDailySummary(d);
                              setShowArchive(false);
                            }}
                            className={`text-left rounded-lg border p-2.5 transition ${
                              isSelected
                                ? 'border-secondary bg-secondary/10 text-secondary'
                                : 'border-grey-200 bg-white hover:border-secondary/40 hover:bg-secondary/5'
                            }`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</div>
                            <div className="text-xs font-mono mt-0.5 text-tertiary">{d}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {dailySummary?.stats && (
                <div className="flex flex-wrap gap-3 text-xs text-tertiary mb-4">
                  <span className="bg-grey-50 px-2.5 py-1 rounded-full">{dailySummary.stats.feedsQueried} sources scanned</span>
                  <span className="bg-grey-50 px-2.5 py-1 rounded-full">{dailySummary.stats.totalArticlesScanned} articles found</span>
                  <span className="bg-grey-50 px-2.5 py-1 rounded-full">{dailySummary.stats.articlesLast24h} from last 24h</span>
                  <span className="bg-grey-50 px-2.5 py-1 rounded-full">
                    Updated {dailySummary.generatedAt ? new Date(dailySummary.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'} UTC
                  </span>
                </div>
              )}
            </div>

            {/* Loading */}
            {dailySummaryLoading && (
              <LoadingState label="Loading daily summary…" />
            )}

            {/* Error */}
            {dailySummaryError && !dailySummaryLoading && (
              <ErrorState
                title="Couldn't load today's briefing"
                body={dailySummaryError}
                hint="The pipeline runs every 6 hours; if this persists, check the daily-news GitHub Actions log."
              />
            )}

            {/* Summary sections */}
            {dailySummary && !dailySummaryLoading && (
              <div className="space-y-6">
                {dailySummary.sections.map(section => {
                  if (section.items.length === 0) return null;

                  const sectionStyles: Record<string, { border: string; bg: string }> = {
                    eu_policy: { border: 'border-l-blue-600', bg: 'bg-blue-50' },
                    energy: { border: 'border-l-amber-500', bg: 'bg-amber-50' },
                    climate: { border: 'border-l-emerald-600', bg: 'bg-emerald-50' },
                    finance: { border: 'border-l-purple-500', bg: 'bg-purple-50' },
                    eu_general: { border: 'border-l-indigo-500', bg: 'bg-indigo-50' },
                    other_eu: { border: 'border-l-rose-500', bg: 'bg-rose-50' },
                    other_world: { border: 'border-l-grey-400', bg: 'bg-grey-50' },
                  };
                  const style = sectionStyles[section.id] || sectionStyles.climate;

                  return (
                    <div key={section.id} className={`rounded-lg border border-grey-200 overflow-hidden border-l-4 ${style.border}`}>
                      {/* Section header */}
                      <div className={`px-4 sm:px-5 py-3 ${style.bg} border-b border-grey-200`}>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-tertiary-dark">{section.title}</h3>
                          <span className="text-[11px] text-tertiary">{section.items.length} article{section.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Articles */}
                      <div className="divide-y divide-grey-100">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="px-4 sm:px-5 py-3 hover:bg-grey-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-bold text-tertiary bg-grey-100 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                {item.link ? (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-tertiary-dark hover:text-secondary transition-colors leading-snug block"
                                  >
                                    {item.title}
                                  </a>
                                ) : (
                                  <span className="text-sm font-medium text-tertiary-dark leading-snug block">
                                    {item.title}
                                  </span>
                                )}
                                {item.description && (
                                  <p className="text-xs text-tertiary mt-1 line-clamp-2 leading-relaxed">
                                    {stripHtml(item.description)}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-tertiary">
                                  <span className="font-medium">{item.source}</span>
                                  <span>·</span>
                                  <span>
                                    {item.published
                                      ? new Date(item.published).toLocaleString('en-GB', {
                                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                        })
                                      : '—'}
                                  </span>
                                </div>
                              </div>
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 text-tertiary hover:text-secondary transition-colors mt-0.5"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Footer */}
                <div className="text-center py-4 text-xs text-tertiary space-y-2">
                  <p>Auto-generated from {dailySummary.stats.feedsQueried} RSS feeds. Updated 4x daily.</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link href="/news-feed/daily-briefing" className="inline-flex items-center gap-1.5 text-secondary hover:text-secondary-dark font-medium transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                      Open as one-pager
                    </Link>
                    <span className="text-grey-300">|</span>
                    <button onClick={() => setView('live')} className="text-secondary hover:underline font-medium">Live News</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────── Live News View ──────── */}
        {view === 'live' && (() => {
          const SOURCE_CATEGORIES: Record<string, { label: string; keys: string[] }> = {
            all: { label: 'All Sources', keys: [] },
            eu: { label: 'EU Institutions', keys: ['eea_press', 'eea_articles', 'eea_publications', 'ep_envi', 'ep_top', 'climate_adapt'] },
            policy: { label: 'Policy & Analysis', keys: ['carbon_brief', 'euractiv_env', 'euractiv_climate', 'climate_home'] },
            media: { label: 'Global Media', keys: ['guardian_climate', 'guardian_energy', 'bbc_climate', 'dw_env', 'reuters_energy'] },
            science: { label: 'Science & Research', keys: ['ipcc', 'unfccc', 'iisd_sdg', 'phys_env'] },
          };
          const now = Date.now();
          const timeRanges: Record<string, number> = {
            all: 0, '24h': 24 * 3600000, '3d': 3 * 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000,
          };

          const activeCat = SOURCE_CATEGORIES[liveCategory] || SOURCE_CATEGORIES.all;
          const filteredArticles = liveArticles.filter(a => {
            // Category filter
            if (activeCat.keys.length > 0 && !activeCat.keys.includes(a.source)) return false;
            // Individual source filter
            if (liveActiveSources.size > 0 && !liveActiveSources.has(a.source)) return false;
            // Time filter
            if (liveTimeFilter !== 'all' && timeRanges[liveTimeFilter]) {
              const pubTime = new Date(a.published).getTime();
              if (!pubTime || (now - pubTime) > timeRanges[liveTimeFilter]) return false;
            }
            // Importance filter
            if (liveImportanceFilter === 'high' && a.importance !== 'high') return false;
            if (liveImportanceFilter === 'high+medium' && a.importance === 'normal') return false;
            return true;
          });

          // Strict "breaking" — only the last 2 hours. Anything older is treated
          // as "recent" or regular so the red badge stays meaningful.
          const isBreaking = (pub: string) => {
            const t = new Date(pub).getTime();
            return t > 0 && (now - t) < 2 * 3600000;
          };
          const isRecent = (pub: string) => {
            const t = new Date(pub).getTime();
            return t > 0 && (now - t) < 3 * 86400000;
          };
          // Freshness decay (M·03 #4): map an article's age to an opacity
          // multiplier on its source-colour bar so the list visually decays
          // from vivid → soft → grey. Stops the unread queue from feeling
          // like a pile of identical-weight debt.
          const freshnessOpacity = (pub: string): number => {
            const t = new Date(pub).getTime();
            if (!t) return 0.35;
            const ageH = (now - t) / 3600000;
            if (ageH < 6)   return 1.0;   // vivid — last 6h
            if (ageH < 24)  return 0.85;
            if (ageH < 72)  return 0.6;   // soft — 1–3d
            if (ageH < 168) return 0.4;
            return 0.25;                  // grey — >1w
          };
          const timeAgo = (pub: string) => {
            const t = new Date(pub).getTime();
            if (!t) return '';
            const diff = now - t;
            if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
            return new Date(pub).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          };

          const toggleSource = (key: string) => {
            setLiveActiveSources(prev => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key); else next.add(key);
              return next;
            });
          };

          return (
          <div>
            {/* Search bar */}
            <div className="flex gap-2 mb-3">
              <input type="text" value={liveQuery} onChange={e => setLiveQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchLiveNews(liveQuery)}
                placeholder="Search live news... (e.g. Green Deal, ETS, CBAM)"
                className="flex-1 px-3 py-2 text-sm border border-grey-200 rounded-lg focus:outline-none focus:border-primary" />
              <button onClick={() => fetchLiveNews(liveQuery)}
                className="px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-secondary-dark rounded-lg transition">
                {liveLoading ? 'Loading...' : 'Search'}
              </button>
              <button onClick={() => { setLiveFetched(false); setLiveQuery(''); setLiveCategory('all'); setLiveTimeFilter('all'); setLiveImportanceFilter('all'); setLiveActiveSources(new Set()); fetchLiveNews(); }}
                className="px-3 py-2 text-sm text-tertiary border border-grey-200 rounded-lg hover:bg-grey-50 transition">
                Refresh
              </button>
            </div>

            {/* Saved searches — persistent, with "new since last run" counts. */}
            <div className="mb-3">
              <NewsSavedSearchesPanel
                articles={liveArticles}
                currentQuery={liveQuery}
                onApply={(s: NewsSavedSearch) => {
                  setLiveQuery(s.query);
                  if (!liveFetched) fetchLiveNews(s.query);
                  else fetchLiveNews(s.query);
                }}
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(SOURCE_CATEGORIES).map(([key, cat]) => (
                <button key={key} onClick={() => { setLiveCategory(key); setLiveActiveSources(new Set()); }}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition ${
                    liveCategory === key
                      ? 'bg-primary text-white'
                      : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Time filters */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[10px] text-tertiary font-medium mr-1">Time:</span>
              {[
                { key: 'all', label: 'All' },
                { key: '24h', label: 'Last 24h' },
                { key: '3d', label: 'Last 3 days' },
                { key: '7d', label: 'Last 7 days' },
                { key: '30d', label: 'Last 30 days' },
              ].map(t => (
                <button key={t.key} onClick={() => setLiveTimeFilter(t.key)}
                  className={`text-[10px] px-2 py-1 rounded transition ${
                    liveTimeFilter === t.key
                      ? 'bg-secondary text-white'
                      : 'bg-grey-50 text-tertiary hover:bg-grey-100'
                  }`}>
                  {t.label}
                </button>
              ))}
              {liveTimeFilter === '24h' && (
                <span className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Breaking
                </span>
              )}
            </div>

            {/* Importance filters */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[10px] text-tertiary font-medium mr-1">Importance:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'high+medium', label: 'Important only' },
                { key: 'high', label: 'Key Policy only' },
              ].map(f => (
                <button key={f.key} onClick={() => setLiveImportanceFilter(f.key)}
                  className={`text-[10px] px-2 py-1 rounded transition ${
                    liveImportanceFilter === f.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-grey-50 text-tertiary hover:bg-grey-100'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sticky active-filter summary — recognition-over-recall.
                Renders only when at least one filter deviates from its default,
                each pill has its own × to clear, and the row sticks to the top
                as the user scrolls so the filter context never disappears.
                Brief item M·03 #6. */}
            {(liveCategory !== 'eu' || liveTimeFilter !== 'all' || liveImportanceFilter !== 'all' || liveActiveSources.size > 0) && (
              <FilterPillRow sticky className="mb-3">
                <span
                  className="uppercase tracking-wide font-semibold text-[var(--mh-muted)] pr-1"
                  style={{ fontSize: 'var(--mh-text-2xs)' }}
                >
                  Filtered by
                </span>
                {liveCategory !== 'eu' && (
                  <FilterPill
                    label={`Category: ${(SOURCE_CATEGORIES[liveCategory]?.label) || liveCategory}`}
                    active
                    onClick={() => setLiveCategory('eu')}
                    onClear={() => setLiveCategory('eu')}
                  />
                )}
                {liveTimeFilter !== 'all' && (
                  <FilterPill
                    label={`Time: last ${liveTimeFilter}`}
                    active
                    onClick={() => setLiveTimeFilter('all')}
                    onClear={() => setLiveTimeFilter('all')}
                  />
                )}
                {liveImportanceFilter !== 'all' && (
                  <FilterPill
                    label={liveImportanceFilter === 'high' ? 'Key Policy only' : 'Important only'}
                    active
                    onClick={() => setLiveImportanceFilter('all')}
                    onClear={() => setLiveImportanceFilter('all')}
                  />
                )}
                {liveActiveSources.size > 0 && (
                  <FilterPill
                    label={`${liveActiveSources.size} source${liveActiveSources.size === 1 ? '' : 's'}`}
                    active
                    count={liveActiveSources.size}
                    onClick={() => setLiveActiveSources(new Set())}
                    onClear={() => setLiveActiveSources(new Set())}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLiveCategory('eu');
                    setLiveTimeFilter('all');
                    setLiveImportanceFilter('all');
                    setLiveActiveSources(new Set());
                  }}
                  className="mh-focus mh-motion-fast text-[var(--mh-muted)] hover:text-[var(--mh-status-danger)] underline"
                  style={{ fontSize: 'var(--mh-text-2xs)' }}
                >
                  Clear all
                </button>
              </FilterPillRow>
            )}

            {/* Source chips (clickable to toggle individual sources) */}
            {liveSources.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {liveSources
                  .filter(s => activeCat.keys.length === 0 || activeCat.keys.includes(s.key))
                  .map(s => {
                    const active = liveActiveSources.size === 0 || liveActiveSources.has(s.key);
                    return (
                      <button key={s.key} onClick={() => toggleSource(s.key)}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition ${
                          active ? '' : 'opacity-30'
                        }`}
                        style={{ backgroundColor: s.color + '15', color: s.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </button>
                    );
                  })}
                {liveActiveSources.size > 0 && (
                  <button onClick={() => setLiveActiveSources(new Set())}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-grey-100 text-tertiary hover:bg-grey-200 transition">
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Results count + Skim/Read mode toggle */}
            {!liveLoading && liveFetched && (
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <span className="text-[11px] text-tertiary">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                  {liveCategory !== 'all' && ` in ${activeCat.label}`}
                  {liveTimeFilter !== 'all' && ` · last ${liveTimeFilter}`}
                  {' · '}
                  <span className="text-[var(--mh-status-success)] font-medium mh-tnum">{filteredArticles.filter(a => a.importance === 'high').length} key policy</span>
                  {', '}
                  <span className="text-[var(--mh-status-info)] font-medium mh-tnum">{filteredArticles.filter(a => a.importance === 'medium').length} relevant</span>
                </span>
                <div className="flex items-center gap-2">
                  {filteredArticles.some(a => isBreaking(a.published)) && (
                    <span className="mh-badge mh-badge-danger inline-flex items-center gap-1 mh-tnum">
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {filteredArticles.filter(a => isBreaking(a.published)).length} breaking
                    </span>
                  )}
                  {/* Skim / Read mode toggle — segmented control. Persisted to localStorage. */}
                  <div
                    role="radiogroup"
                    aria-label="Density"
                    className="inline-flex rounded-md border border-[var(--mh-border)] overflow-hidden bg-[var(--mh-card)]"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={readMode === 'skim'}
                      onClick={() => setReadMode('skim')}
                      className={`mh-focus mh-motion-fast px-2.5 py-1 ${readMode === 'skim' ? 'bg-[var(--mh-status-primary)] text-white' : 'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)]'}`}
                      style={{ fontSize: 'var(--mh-text-2xs)', fontWeight: 600 }}
                      title="Headline-only — pack more on screen"
                    >
                      Skim
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={readMode === 'read'}
                      onClick={() => setReadMode('read')}
                      className={`mh-focus mh-motion-fast px-2.5 py-1 ${readMode === 'read' ? 'bg-[var(--mh-status-primary)] text-white' : 'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)]'}`}
                      style={{ fontSize: 'var(--mh-text-2xs)', fontWeight: 600 }}
                      title="Headline + 2-line summary"
                    >
                      Read
                    </button>
                  </div>
                </div>
              </div>
            )}

            {liveError && (
              <div className="mb-4">
                <ErrorState
                  title="Live feeds unreachable"
                  body={liveError}
                  hint="Showing cached or curated content in the Feed tab in the meantime."
                />
              </div>
            )}

            {liveLoading && (
              <LoadingState label={`Fetching live news from ${liveSources.length || 20} sources…`} />
            )}

            {!liveLoading && filteredArticles.length === 0 && liveFetched && (
              <EmptyState
                title="No articles match your filters"
                body="Try a different time window, broader importance, or fewer source filters."
                primaryAction={{
                  label: 'Reset all filters',
                  onClick: () => {
                    setLiveCategory('all');
                    setLiveTimeFilter('all');
                    setLiveImportanceFilter('all');
                    setLiveActiveSources(new Set());
                    showToast({ tone: 'info', message: 'Filters cleared' });
                  },
                }}
              />
            )}

            {!liveLoading && filteredArticles.length > 0 && (
              <div className="space-y-2">
                {filteredArticles.map((article, i) => {
                  const breaking = isBreaking(article.published);
                  const recent = isRecent(article.published);
                  const srcColor = liveSources.find(s => s.key === article.source)?.color || '#9CA3AF';
                  const freshness = freshnessOpacity(article.published);
                  // F-pattern hierarchy: eyebrow → headline → 2-line summary → footer.
                  // Tones use the system-status taxonomy (danger=breaking, warning=new,
                  // success=key policy, info=relevant) so the card reads consistently
                  // with the rest of the app.
                  return (
                  <a
                    key={`${article.link}-${i}`}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mh-focus mh-motion-fast block rounded-lg border p-4 sm:p-5 group ${
                      breaking
                        ? 'bg-[var(--mh-status-danger-bg)] border-[var(--mh-status-danger)]/40 hover:border-[var(--mh-status-danger)]'
                        : article.importance === 'high'
                          ? 'bg-[var(--mh-status-success-bg)] border-[var(--mh-status-success)]/30 hover:border-[var(--mh-status-success)]'
                          : 'bg-[var(--mh-card)] border-[var(--mh-border)] hover:border-[var(--mh-status-primary)]'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-1 rounded-full flex-shrink-0 ${breaking ? 'h-16' : 'h-14'}`}
                        style={{ backgroundColor: srcColor, opacity: freshness }}
                        aria-hidden="true"
                        title={`Posted ${article.published ? timeAgo(article.published) : 'unknown'}`}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Eyebrow: badges + source + time-ago. F-pattern row 1. */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {breaking && (
                            <span className="mh-badge mh-badge-danger inline-flex items-center gap-1">
                              <span aria-hidden="true" className="w-1 h-1 rounded-full bg-current animate-pulse" />
                              Breaking
                            </span>
                          )}
                          {!breaking && recent && (
                            <span className="mh-badge mh-badge-warning">New</span>
                          )}
                          {article.importance === 'high' && (
                            <span className="mh-badge mh-badge-success">Key policy</span>
                          )}
                          {article.importance === 'medium' && (
                            <span className="mh-badge mh-badge-info">Relevant</span>
                          )}
                          <span
                            className="mh-badge"
                            style={{ background: srcColor + '15', color: srcColor }}
                          >
                            {article.sourceLabel}
                          </span>
                          {article.published && (
                            <span
                              className="mh-tnum text-[var(--mh-muted)]"
                              style={{ fontSize: 'var(--mh-text-2xs)' }}
                            >
                              {timeAgo(article.published)}
                            </span>
                          )}
                        </div>
                        {/* Headline: 16 px medium per the brief — F-pattern row 2 (the focal). */}
                        <h3
                          className="font-medium text-[var(--mh-fg)] group-hover:text-[var(--mh-status-primary)] mh-motion-fast"
                          style={{ fontSize: 'var(--mh-text-md)', lineHeight: 'var(--mh-leading-snug)' }}
                        >
                          {article.title}
                        </h3>
                        {/* 2-line summary, 14 px regular — F-pattern row 3.
                            Hidden in Skim mode so the list packs ~3x more headlines
                            on screen (M·03 #2). */}
                        {readMode === 'read' && article.description && (
                          <p
                            className="text-[var(--mh-muted)] mt-1 line-clamp-2"
                            style={{ fontSize: 'var(--mh-text-sm)', lineHeight: 'var(--mh-leading-base)' }}
                          >
                            {stripHtml(article.description)}
                          </p>
                        )}
                        {/* Footer chips — F-pattern row 4 (lightweight, scannable). */}
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewsToReadingList({ title: article.title, url: article.link, authors: article.sourceLabel, sourceType: 'live-news' }); }}
                            className="mh-focus mh-motion-fast inline-flex items-center gap-1 text-[var(--mh-muted)] hover:text-[var(--mh-status-primary)] font-medium"
                            style={{ fontSize: 'var(--mh-text-2xs)' }}
                            title="Save to reading list"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                            </svg>
                            Save to reading list
                          </button>
                          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <SuggestPolicyButton article={{ title: article.title, description: article.description }} />
                          </span>
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 text-[var(--mh-border)] group-hover:text-[var(--mh-status-primary)] mh-motion-fast flex-shrink-0 mt-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </a>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-grey-400 mt-4 text-center">
              {liveSources.length} live RSS sources. Ranked by EU policy relevance. Duplicates removed.
              {' '}Articles under 2h = breaking (red), under 3 days = new (amber).
              {' '}<span className="text-emerald-600">Key Policy</span> = high-relevance EU policy news.
              {' '}<span className="text-blue-500">Relevant</span> = climate policy coverage.
            </p>
          </div>
          );
        })()}

        {/* ──────── Feed View ──────── */}
        {view === 'feed' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar filters */}
            <div className="lg:w-64 flex-shrink-0">
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between bg-white rounded-lg border border-grey-200 p-3 mb-3 text-sm font-medium text-tertiary-dark">
                Filters
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div className={`space-y-4 ${showFilters ? '' : 'hidden lg:block'}`}>
                {/* Search */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Search</label>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search titles & content..."
                    className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                </div>

                {/* External/Internal toggle */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Source Type</label>
                  <div className="flex gap-1">
                    {(['all', 'external', 'internal'] as FilterExternal[]).map(opt => (
                      <button key={opt} onClick={() => setFilterExternal(opt)}
                        className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                          filterExternal === opt
                            ? 'bg-secondary text-white'
                            : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                        }`}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source filter */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Source</label>
                  <div className="space-y-1.5">
                    {SOURCE_OPTIONS.map(s => (
                      <label key={s.value} className="flex items-center gap-2 text-sm text-tertiary-dark cursor-pointer">
                        <input type="checkbox"
                          checked={selectedSources.has(s.value)}
                          onChange={() => {
                            setSelectedSources(prev => {
                              const next = new Set(prev);
                              next.has(s.value) ? next.delete(s.value) : next.add(s.value);
                              return next;
                            });
                          }}
                          className="rounded border-grey-300 text-secondary focus:ring-secondary" />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type filter */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Type</label>
                  <div className="space-y-1.5">
                    {TYPE_OPTIONS.map(t => (
                      <label key={t.value} className="flex items-center gap-2 text-sm text-tertiary-dark cursor-pointer">
                        <input type="checkbox"
                          checked={selectedTypes.has(t.value)}
                          onChange={() => {
                            setSelectedTypes(prev => {
                              const next = new Set(prev);
                              next.has(t.value) ? next.delete(t.value) : next.add(t.value);
                              return next;
                            });
                          }}
                          className="rounded border-grey-300 text-secondary focus:ring-secondary" />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags filter */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map(tag => (
                      <button key={tag} onClick={() => {
                        setSelectedTags(prev => {
                          const next = new Set(prev);
                          next.has(tag) ? next.delete(tag) : next.add(tag);
                          return next;
                        });
                      }}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          selectedTags.has(tag)
                            ? 'bg-secondary text-white'
                            : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Integration Info */}
                <div className="bg-white rounded-lg border border-grey-200 p-4">
                  <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2 block">Email → Feed</label>
                  <p className="text-xs text-tertiary mb-2">
                    Drag any Outlook email into a &ldquo;Feed&rdquo; folder and it lands here — no third-party service, no monthly quota.
                  </p>
                  <a
                    href="/outlook-vba/esabcc-outlook-setup.zip"
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Outlook installer (.zip)
                  </a>
                  <p className="text-[11px] text-tertiary mt-2">
                    Unzip, double-click <code className="bg-grey-100 px-1 rounded">install.cmd</code>. Create a <code className="bg-grey-100 px-1 rounded">Feed</code> subfolder under Inbox;
                    anything you drop there is posted within the hour. Runs fully hidden — no PowerShell window.
                    A <em>Push Outlook Feed Now</em> shortcut lands on your Desktop for instant flushes. Requires classic desktop Outlook for Windows.
                  </p>
                </div>
              </div>
            </div>

            {/* Feed items */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* "What's new since you last visited" banner — item 3.2 in
                  docs/vision/brainstorm-modules-uxui-feasibility-rank.md.
                  Replaces the always-on blue dot with a single dismissible
                  strip; click "Open" scrolls to the first new card with a
                  600 ms ring pulse. */}
              <NewsLastVisitBanner
                items={filtered}
                onOpen={(firstNewId) => {
                  const el = document.getElementById(`news-item-${firstNewId}`);
                  if (!el) return;
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('mh-ring-pulse');
                  setTimeout(() => el.classList.remove('mh-ring-pulse'), 700);
                }}
              />
              {/* Runtime warning when no LLM API key is reaching the
                  serverless functions. The env var is baked into the Vercel
                  build at deploy time, so adding it in the dashboard without
                  triggering a new deployment leaves summary generation broken
                  even though everything looks configured. */}
              {hasApiKey === false && (
                <div className="p-4 rounded-lg border border-amber-300 bg-amber-50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-amber-700">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">AI summaries disabled</span>
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    No LLM API key (<code className="px-1 bg-amber-100 rounded">AZURE_OPENAI_API_KEY</code>,{' '}
                    <code className="px-1 bg-amber-100 rounded">GEMINI_API_KEY</code>,{' '}
                    <code className="px-1 bg-amber-100 rounded">ANTHROPIC_API_KEY</code>, or{' '}
                    <code className="px-1 bg-amber-100 rounded">OPENAI_API_KEY</code>) is
                    reaching the deployed serverless functions. You can connect your
                    organisation&apos;s Azure OpenAI deployment, or use Gemini&apos;s free tier at{' '}
                    <strong>aistudio.google.com/apikey</strong>. After adding it to Vercel → Project Settings → Environment Variables,
                    trigger a <strong>new deployment</strong> (Deployments → ⋯ → Redeploy) —
                    Vercel bakes env vars into the build at deploy time, so existing functions
                    won&apos;t see a newly added key until they&apos;re rebuilt. Then reload
                    this page.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="text-sm text-tertiary">
                  {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                  {(selectedSources.size > 0 || selectedTypes.size > 0 || selectedTags.size > 0 || search || filterExternal !== 'all') && (
                    <button onClick={() => {
                      setSearch(''); setSelectedSources(new Set()); setSelectedTypes(new Set());
                      setSelectedTags(new Set()); setFilterExternal('all');
                    }} className="ml-2 text-secondary hover:underline text-xs">
                      Clear filters
                    </button>
                  )}
                </div>
                {/* Regenerate AI summaries — backfills items that were stored
                    before any LLM key was set in the deployment. */}
                <button
                  onClick={runBackfill}
                  disabled={backfillRunning}
                  className="text-xs px-3 py-1.5 rounded border border-secondary/40 text-secondary hover:bg-secondary/5 transition disabled:opacity-50 flex items-center gap-1.5 font-medium"
                  title="Generate AI summaries for email items that don't have one yet"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                  </svg>
                  {backfillRunning ? 'Summarising…' : 'Regenerate AI summaries'}
                </button>
              </div>
              {backfillMessage && (
                <div className="text-xs text-tertiary-dark bg-secondary/5 border border-secondary/20 rounded px-3 py-2 mb-2">
                  {backfillMessage}
                </div>
              )}

              {filtered.length === 0 && (
                <div className="bg-white rounded-lg border border-grey-200 p-10 text-center">
                  <p className="text-tertiary text-sm">No items match your filters.</p>
                </div>
              )}

              {filtered.map(item => {
                const allComments = [...item.comments, ...(userComments[item.id] || [])];
                const isExpanded = expandedComments.has(item.id);
                const isLiked = likedItems.has(item.id);
                const likeCount = item.likes + (isLiked ? 1 : 0);
                const isInLibrary = addedToLibrary.has(item.id);

                return (
                  <div key={item.id}
                    id={`news-item-${item.id}`}
                    className={`bg-white rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${
                      item.isDailySpecial
                        ? 'border-l-4 border-l-amber-500 border-amber-200 ring-1 ring-amber-300 bg-gradient-to-br from-amber-50/50 to-orange-50/30'
                        : !item.isExternal
                          ? 'border-l-4 border-l-blue-500 border-blue-200 ring-1 ring-blue-200 bg-gradient-to-br from-blue-50/30 to-indigo-50/20'
                          : item.isExternal
                            ? 'border-l-4 border-l-amber-400 border-grey-200'
                            : 'border-grey-200'
                    }`}>
                    <div className="p-5">
                      {/* Header: source badge, type, date */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider text-white px-2 py-0.5 rounded"
                          style={{ backgroundColor: getSourceColor(item.source) }}>
                          {getSourceLabel(item.source)}
                        </span>
                        <span className="text-[10px] font-medium text-tertiary bg-grey-100 px-2 py-0.5 rounded capitalize">
                          {item.type.replace('_', ' ')}
                        </span>
                        {item.isDailySpecial && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm">
                            ★ Daily Special
                          </span>
                        )}
                        {item.isExternal && !item.isDailySpecial && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            External
                          </span>
                        )}
                        {!item.isExternal && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>
                            Posted
                          </span>
                        )}
                        <span className="text-[11px] text-tertiary ml-auto">{formatDate(item.publishedDate)}</span>
                      </div>

                      {/* Title — click opens full message modal */}
                      <h3 className="font-bold text-tertiary-dark mb-1 leading-snug">
                        <button
                          onClick={() => openItemModal(item)}
                          className="text-left hover:text-secondary transition-colors"
                        >
                          {item.title}
                        </button>
                        {item.url && item.url !== '#' && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-tertiary hover:text-secondary transition-colors"
                            title="Open original link"
                            onClick={e => e.stopPropagation()}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className="inline mb-0.5">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                          </a>
                        )}
                      </h3>
                      {/* Visible clickable URL */}
                      {item.url && item.url !== '#' && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] text-secondary/70 hover:text-secondary hover:underline break-all block mb-2 truncate max-w-[90%]"
                          onClick={e => e.stopPropagation()}>
                          {item.url}
                        </a>
                      )}

                      {/* Link preview card – only for manually added posts, not email imports */}
                      {item.source !== 'email_news_in' && (() => {
                        const previewUrl = (item.url && item.url !== '#') ? item.url : extractFirstUrl(item.summary);
                        return previewUrl ? <LinkPreview url={previewUrl} /> : null;
                      })()}

                      {/* AI summary — shown inline for email items that were summarised by the LLM */}
                      {item.aiSummary && (
                        <div className="mb-3 p-3 rounded-md border border-secondary/30 bg-secondary/5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-secondary">
                              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                            </svg>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-secondary">AI Summary</span>
                          </div>
                          <p
                            className="text-[13px] text-tertiary-dark leading-relaxed cursor-pointer"
                            onClick={() => openItemModal(item)}
                            title="Click to read full message"
                          >
                            {item.aiSummary}
                          </p>
                        </div>
                      )}

                      {/* Summary — click to open full message, URLs are clickable */}
                      <p
                        className="text-sm text-tertiary leading-relaxed mb-3 line-clamp-3 cursor-pointer hover:text-tertiary-dark transition-colors"
                        onClick={() => openItemModal(item)}
                        title="Click to read full message"
                      >
                        {linkifyText(item.summary)}
                      </p>

                      {/* Inline figure (if any) — rendered for items that ship
                          with a known `figureKind`. Click opens the modal. */}
                      {item.figureKind && (
                        <div
                          className="mb-3 cursor-zoom-in"
                          onClick={() => openItemModal(item)}
                          title="Click to open full briefing"
                        >
                          {renderNewsFigure(item.figureKind)}
                        </div>
                      )}
                      {(item.fullText && item.fullText.length > item.summary.length) && (
                        <button
                          onClick={() => openItemModal(item)}
                          className="text-xs text-secondary hover:underline mb-2"
                        >
                          Read full message →
                        </button>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.tags.map(tag => (
                          <span key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-2 border-t border-grey-100">
                        {/* Like */}
                        <button onClick={() => toggleLike(item.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                            isLiked ? 'text-red-500' : 'text-tertiary hover:text-red-500'
                          }`}>
                          <svg width="14" height="14" viewBox="0 0 24 24"
                            fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                          </svg>
                          {likeCount}
                        </button>

                        {/* Comments toggle */}
                        <button onClick={() => {
                          setExpandedComments(prev => {
                            const next = new Set(prev);
                            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                            return next;
                          });
                        }}
                          className="flex items-center gap-1.5 text-xs font-medium text-tertiary hover:text-secondary transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                          {allComments.length} comment{allComments.length !== 1 ? 's' : ''}
                        </button>

                        {/* Add to library */}
                        {(item.type === 'paper' || item.type === 'article' || item.type === 'report') && (
                          <button onClick={() => !isInLibrary && addToLibrary(item.id)}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              isInLibrary ? 'text-green-600' : 'text-tertiary hover:text-secondary'
                            }`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {isInLibrary
                                ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                                : <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>
                              }
                            </svg>
                            {isInLibrary ? 'In Library' : 'Add to Library'}
                            {showLibraryConfirm === item.id && (
                              <span className="text-green-600 ml-1 animate-pulse">Added!</span>
                            )}
                          </button>
                        )}

                        {/* Add to reading list */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setNewsToReadingList({ title: item.title, url: item.url || '', authors: item.addedBy, sourceType: 'news-feed', sourceId: item.id }); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-tertiary hover:text-secondary transition-colors ml-auto"
                          title="Add to reading list">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                          </svg>
                          Reading List
                        </button>

                        {/* Edit + Delete — only for items the app actually stores
                            (custom posts + inbound emails). Curated RSS / live-
                            news items aren't in our database, so there's
                            nothing to PATCH or DELETE for them. */}
                        {(item.source === 'internal' || item.source === 'email_news_in') && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                              className="flex items-center gap-1.5 text-xs font-medium text-tertiary hover:text-secondary transition-colors"
                              title="Edit this post">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteFeedItem(item); }}
                              className="flex items-center gap-1.5 text-xs font-medium text-tertiary hover:text-red-500 transition-colors"
                              title="Delete this post">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}

                        {/* Added by */}
                        <span className="text-[11px] text-tertiary ml-auto">
                          Added by {item.addedBy}
                        </span>
                      </div>
                    </div>

                    {/* Comments section */}
                    {isExpanded && (
                      <div className="bg-grey-50 border-t border-grey-200 px-5 py-4">
                        {allComments.length === 0 && (
                          <p className="text-xs text-tertiary mb-3">No comments yet.</p>
                        )}
                        {allComments.map(c => (
                          <div key={c.id} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-tertiary-dark">{c.author}</span>
                              <span className="text-[10px] text-tertiary">{formatDate(c.date)}</span>
                            </div>
                            <p className="text-sm text-tertiary leading-relaxed">{c.text}</p>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <input type="text"
                            value={commentInputs[item.id] || ''}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addComment(item.id)}
                            placeholder="Add a comment..."
                            className="flex-1 border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                          <button onClick={() => addComment(item.id)}
                            className="px-4 py-2 bg-secondary text-white text-sm rounded font-medium hover:bg-secondary-dark transition-colors">
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────── Policy Clock View ──────── */}
        {view === 'policy-clock' && (
          <div className="max-w-[1400px] mx-auto">
            <PolicyClock onAddDate={() => { setPostMode('date'); setView('post'); }} />
          </div>
        )}

        {/* ──────── Post New View ──────── */}
        {view === 'post' && (
          <div className="max-w-2xl mx-auto">
            {/* Mode toggle: share an item vs add a date to the Policy Clock */}
            <div className="mb-4 inline-flex rounded-lg border border-grey-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setPostMode('item')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  postMode === 'item'
                    ? 'bg-secondary text-white'
                    : 'text-tertiary hover:text-tertiary-dark'
                }`}>
                Share an Item
              </button>
              <button
                type="button"
                onClick={() => setPostMode('date')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  postMode === 'date'
                    ? 'bg-secondary text-white'
                    : 'text-tertiary hover:text-tertiary-dark'
                }`}>
                Add a Date
              </button>
            </div>

            {postMode === 'item' && (
            <div className="bg-white rounded-lg border border-grey-200 p-6">
              <h2 className="text-lg font-bold text-tertiary-dark mb-1">Share a New Item</h2>
              <p className="text-sm text-tertiary mb-6">Post an internal note or share content with the secretariat.</p>

              {postSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
                  Item posted successfully! AI summary is being generated. Redirecting to feed...
                </div>
              )}

              <div className="space-y-4">
                {/* DOI magic wand — paste a DOI to auto-generate a sharing text and add to reference library */}
                <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Quick share via DOI</label>
                  <div className="flex gap-2">
                    <input type="text" value={postDoi}
                      onChange={e => { setPostDoi(e.target.value); setPostDoiError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupPostDoi(); } }}
                      placeholder="10.1038/s41558-020-0783-3"
                      className="flex-1 min-w-0 border border-grey-200 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                    <button type="button" onClick={lookupPostDoi}
                      disabled={postDoiLoading}
                      className="px-4 py-2.5 bg-secondary text-white text-sm font-semibold rounded hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                      title="Look up DOI, auto-generate sharing text, and add to reference library">
                      <span className="text-base leading-none">&#9733;</span>
                      {postDoiLoading ? 'Looking up...' : 'Auto-fill'}
                    </button>
                  </div>
                  {postDoiError && <p className="text-red-600 text-xs mt-2">{postDoiError}</p>}
                  <p className="text-[11px] text-tertiary mt-2">Paste a DOI to auto-generate a sharing text and add the reference to the library.</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Title</label>
                  <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                    placeholder="Enter title..."
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Content</label>
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    placeholder="Write your note or summary..."
                    rows={5}
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-y" />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Type</label>
                  <select value={postType} onChange={e => setPostType(e.target.value as NewsItem['type'])}
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary">
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Tags</label>
                  {suggestedTags.length > 0 && postTags.length === 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-tertiary mr-2">Suggested:</span>
                      {suggestedTags.map(tag => (
                        <button key={tag} onClick={() => setPostTags(prev => [...new Set([...prev, tag])])}
                          className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium mr-1 mb-1 hover:bg-secondary/20 transition-colors">
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {postTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-white font-medium">
                        {tag}
                        <button onClick={() => setPostTags(prev => prev.filter(t => t !== tag))}
                          className="hover:text-white/70">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_TAGS.filter(t => !postTags.includes(t)).map(tag => (
                      <button key={tag} onClick={() => setPostTags(prev => [...prev, tag])}
                        className="text-xs px-2 py-1 rounded-full bg-grey-100 text-tertiary font-medium hover:bg-grey-200 transition-colors">
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handlePost}
                  disabled={!postTitle.trim() || !postContent.trim()}
                  className="w-full py-3 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Post Item
                </button>
              </div>
            </div>
            )}

            {postMode === 'date' && (
            <div className="bg-white rounded-lg border border-grey-200 p-6">
              <h2 className="text-lg font-bold text-tertiary-dark mb-1">Add a Date to the Policy Clock</h2>
              <p className="text-sm text-tertiary mb-6">
                Drop an event onto any swim lane. Tick <span className="font-semibold text-red-600">Mark as important</span> to notify every other secretariat member.
              </p>

              {dateSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
                  {dateSuccess}
                </div>
              )}
              {dateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                  {dateError}
                </div>
              )}

              <div className="space-y-4">
                {/* Swim lane picker */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-2">Swim lane</label>
                  <div className="flex flex-wrap gap-1.5">
                    {POLICY_CLOCK_SWIM_LANES.map(lane => {
                      const active = dateCategory === lane.value;
                      return (
                        <button
                          key={lane.value}
                          type="button"
                          onClick={() => setDateCategory(lane.value)}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition"
                          style={{
                            borderColor: active ? lane.color : lane.color + '50',
                            backgroundColor: active ? lane.color : lane.bg,
                            color: active ? '#ffffff' : lane.color,
                          }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#ffffff' : lane.color }} />
                          <span className="font-medium">{lane.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Title</label>
                  <input type="text" value={dateTitle} onChange={e => setDateTitle(e.target.value)}
                    placeholder="e.g. ENVI vote on ETS2 market stability reserve"
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Date</label>
                    <input type="date" value={dateOn} onChange={e => setDateOn(e.target.value)}
                      className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">End date <span className="text-tertiary normal-case">(optional)</span></label>
                    <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                      className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Description</label>
                  <textarea value={dateDescription} onChange={e => setDateDescription(e.target.value)}
                    placeholder="What is happening that day? Why does it matter?"
                    rows={4}
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-y" />
                </div>

                {/* Location + source URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Location <span className="text-tertiary normal-case">(optional)</span></label>
                    <input type="text" value={dateLocation} onChange={e => setDateLocation(e.target.value)}
                      placeholder="Brussels, Strasbourg, …"
                      className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Source URL <span className="text-tertiary normal-case">(optional)</span></label>
                    <input type="url" value={dateSourceUrl} onChange={e => setDateSourceUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Tags <span className="text-tertiary normal-case">(comma-separated, optional)</span></label>
                  <input type="text" value={dateTagsText} onChange={e => setDateTagsText(e.target.value)}
                    placeholder="ets, envi, vote"
                    className="w-full border border-grey-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                </div>

                {/* Important toggle */}
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  dateImportant ? 'border-red-300 bg-red-50' : 'border-grey-200 hover:bg-grey-50'
                }`}>
                  <input type="checkbox" checked={dateImportant}
                    onChange={e => setDateImportant(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-grey-300 text-red-600 focus:ring-red-500" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-tertiary-dark">
                      Mark as important
                      {dateImportant && (
                        <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 rounded px-1.5 py-0.5 uppercase tracking-wider">KEY EVENT</span>
                      )}
                    </span>
                    <span className="block text-xs text-tertiary mt-0.5">
                      Flags the event on the timeline with a pulsing red dot and sends a notification to every other secretariat member.
                    </span>
                  </span>
                </label>

                <button onClick={handlePostDate}
                  disabled={dateSubmitting || !dateTitle.trim() || !dateOn}
                  className="w-full py-3 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {dateSubmitting ? 'Adding…' : 'Add to Policy Clock'}
                </button>
              </div>
            </div>
            )}

          </div>
        )}


        {/* ──────── Reading List View (Personal + Shared ESABCC) ──────── */}
        {view === 'reading-list' && (() => {
          const PRIORITY_STYLES: Record<string, { label: string; badge: string; border: string }> = {
            'must-read': { label: 'Must read', badge: 'bg-red-100 text-red-800 border-red-300', border: 'border-l-red-500' },
            'important': { label: 'Important', badge: 'bg-amber-100 text-amber-800 border-amber-300', border: 'border-l-amber-500' },
            'nice-to-have': { label: 'Nice to have', badge: 'bg-grey-100 text-tertiary border-grey-300', border: 'border-l-grey-400' },
          };
          const KIND_LABELS: Record<string, string> = {
            paper: 'Paper', report: 'Report', book: 'Book', article: 'Article', news: 'News', other: 'Other',
          };
          const PRIORITY_ORDER: Record<string, number> = {
            'must-read': 0, 'important': 1, 'nice-to-have': 2,
          };

          const toRead = readingList
            .filter(i => !i.read)
            .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) || b.addedDate.localeCompare(a.addedDate));
          const doneReading = readingList
            .filter(i => i.read)
            .sort((a, b) => b.addedDate.localeCompare(a.addedDate));

          // Shared list sorted by upvotes (desc), then by date (newest)
          const sharedSorted = [...sharedReadingList]
            .sort((a, b) => b.upvotes - a.upvotes || b.addedDate.localeCompare(a.addedDate));

          return (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-tertiary-dark mb-1">Reading Lists</h2>
                <p className="text-sm text-tertiary">
                  Your personal reading list and the shared ESABCC team reading list. Sign in to track what you want to read and share recommendations with the team.
                </p>
              </div>

              {/* Tab bar: Personal / Shared */}
              <div className="flex gap-1 mb-5 bg-grey-100 rounded-lg p-1 max-w-xs">
                <button onClick={async () => { const u = await requireAuth('Sign in to access your personal reading list.'); if (u) setRlTab('personal'); }}
                  className={`flex-1 text-sm font-medium px-3 py-2 rounded-md transition ${rlTab === 'personal' ? 'bg-white text-tertiary-dark shadow-sm' : 'text-tertiary hover:text-tertiary-dark'}`}>
                  My List ({readingList.length})
                </button>
                <button onClick={() => setRlTab('shared')}
                  className={`flex-1 text-sm font-medium px-3 py-2 rounded-md transition ${rlTab === 'shared' ? 'bg-white text-tertiary-dark shadow-sm' : 'text-tertiary hover:text-tertiary-dark'}`}>
                  ESABCC Shared ({sharedReadingList.length})
                </button>
              </div>

              {/* ─── Personal Reading List Tab ─── */}
              {rlTab === 'personal' && (
                <>
                  {!user ? (
                    <div className="bg-grey-50 border border-grey-200 border-dashed rounded-lg p-8 text-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-tertiary">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
                      </svg>
                      <p className="text-sm text-tertiary mb-3">Sign in to create your personal reading list.</p>
                      <button onClick={() => requireAuth('Sign in to access your personal reading list.')}
                        className="px-4 py-2 bg-secondary text-white text-sm font-semibold rounded hover:bg-secondary-dark transition">
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Add form */}
                      <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-grey-200 p-5 lg:sticky lg:top-[88px]">
                          <h3 className="text-sm font-bold text-tertiary-dark mb-4">Add to my reading list</h3>
                          <div className="space-y-3">
                            {/* DOI magic wand */}
                            <div className="bg-secondary/5 border border-secondary/20 rounded p-3">
                              <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Quick add via DOI</label>
                              <div className="flex gap-2">
                                <input type="text" value={rlDoi}
                                  onChange={e => { setRlDoi(e.target.value); setRlDoiError(''); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupReadingDoi(); } }}
                                  placeholder="10.1038/s41558-020-0783-3"
                                  className="flex-1 min-w-0 border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                                <button type="button" onClick={lookupReadingDoi}
                                  disabled={rlDoiLoading}
                                  className="px-3 py-2 bg-secondary text-white text-sm font-semibold rounded hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                                  title="Look up DOI and auto-fill (also adds to Reference Manager)">
                                  <span className="text-base leading-none">&#9733;</span>
                                  {rlDoiLoading ? 'Looking up...' : 'Auto-fill'}
                                </button>
                              </div>
                              {rlDoiError && <p className="text-red-600 text-xs mt-2">{rlDoiError}</p>}
                              <p className="text-[11px] text-tertiary mt-2">Paste a DOI to auto-fill fields + auto-add to Reference Manager.</p>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Title</label>
                              <input type="text" value={rlTitle} onChange={e => setRlTitle(e.target.value)}
                                placeholder="Paper or report title..."
                                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Author(s)</label>
                              <input type="text" value={rlAuthors} onChange={e => setRlAuthors(e.target.value)}
                                placeholder="e.g. IPCC, Stern, IEA..."
                                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Link (URL or DOI)</label>
                              <input type="url" value={rlUrl} onChange={e => setRlUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Type</label>
                                <select value={rlKind} onChange={e => setRlKind(e.target.value as ReadingListItem['kind'])}
                                  className="w-full border border-grey-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary">
                                  <option value="paper">Paper</option>
                                  <option value="report">Report</option>
                                  <option value="book">Book</option>
                                  <option value="article">Article</option>
                                  <option value="news">News</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Priority</label>
                                <select value={rlPriority} onChange={e => setRlPriority(e.target.value as ReadingListItem['priority'])}
                                  className="w-full border border-grey-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary">
                                  <option value="must-read">Must read</option>
                                  <option value="important">Important</option>
                                  <option value="nice-to-have">Nice to have</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-tertiary-dark uppercase tracking-wider mb-1">Why it matters</label>
                              <textarea value={rlNotes} onChange={e => setRlNotes(e.target.value)}
                                placeholder="One or two lines on why this is worth reading..."
                                rows={3}
                                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-y" />
                            </div>
                            <button onClick={() => addReadingListItem()}
                              disabled={!rlTitle.trim()}
                              className="w-full py-2.5 bg-secondary text-white text-sm font-semibold rounded hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              Add to my reading list
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Personal list */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-tertiary-dark">
                            Want to read <span className="text-tertiary font-normal">({toRead.length})</span>
                          </h3>
                          {doneReading.length > 0 && (
                            <button onClick={() => setRlShowRead(v => !v)}
                              className="text-xs text-secondary hover:underline">
                              {rlShowRead ? 'Hide' : 'Show'} read ({doneReading.length})
                            </button>
                          )}
                        </div>

                        {toRead.length === 0 ? (
                          <div className="bg-grey-50 border border-grey-200 border-dashed rounded-lg p-8 text-center">
                            <p className="text-sm text-tertiary">
                              No items in your reading list yet. Add papers, reports, or news using the form.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {toRead.map(item => {
                              const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES['important'];
                              return (
                                <div key={item.id}
                                  className={`bg-white rounded-lg border border-grey-200 border-l-4 ${style.border} p-4`}>
                                  <div className="flex items-start gap-3">
                                    <input type="checkbox" checked={item.read}
                                      onChange={() => toggleReadingItemRead(item.id)}
                                      className="mt-1 w-4 h-4 accent-secondary cursor-pointer" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
                                          {style.label}
                                        </span>
                                        <span className="text-[10px] font-medium text-tertiary uppercase tracking-wider">
                                          {KIND_LABELS[item.kind] || item.kind}
                                        </span>
                                        {item.sourceType && item.sourceType !== 'manual' && (
                                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            from {item.sourceType === 'news-feed' ? 'News Feed' : item.sourceType === 'live-news' ? 'Live News' : item.sourceType === 'reference-manager' ? 'Ref Manager' : item.sourceType}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-tertiary">
                                          Added {formatDate(item.addedDate)}
                                        </span>
                                      </div>
                                      <h4 className="text-sm font-semibold text-tertiary-dark leading-snug mb-0.5">
                                        {(() => {
                                          const libId = readingItemLibraryId(item);
                                          if (libId) {
                                            return (
                                              <Link href={`/references?ref=${encodeURIComponent(libId)}`}
                                                className="hover:text-secondary transition-colors"
                                                title="Open in Reference Manager library">
                                                {item.title}
                                              </Link>
                                            );
                                          }
                                          if (item.url) {
                                            return (
                                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                                className="hover:text-secondary transition-colors">
                                                {item.title}
                                              </a>
                                            );
                                          }
                                          return item.title;
                                        })()}
                                      </h4>
                                      {item.authors && (
                                        <p className="text-xs text-tertiary mb-1">{item.authors}</p>
                                      )}
                                      {item.notes && (
                                        <p className="text-xs text-tertiary-dark mt-1 leading-relaxed">{item.notes}</p>
                                      )}
                                      {/* Share to ESABCC button */}
                                      <button
                                        onClick={() => addToSharedReadingList(item)}
                                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary hover:text-secondary-dark transition-colors">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                                        </svg>
                                        {shareSuccess === item.id ? 'Shared!' : 'Share to ESABCC list'}
                                      </button>
                                    </div>
                                    <button onClick={() => deleteReadingItem(item.id)}
                                      className="text-tertiary hover:text-red-600 p-1 flex-shrink-0"
                                      aria-label="Remove">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {rlShowRead && doneReading.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-sm font-bold text-tertiary-dark mb-3">Read</h3>
                            <div className="space-y-2">
                              {doneReading.map(item => (
                                <div key={item.id}
                                  className="bg-grey-50 rounded-lg border border-grey-200 p-4 opacity-70">
                                  <div className="flex items-start gap-3">
                                    <input type="checkbox" checked={item.read}
                                      onChange={() => toggleReadingItemRead(item.id)}
                                      className="mt-1 w-4 h-4 accent-secondary cursor-pointer" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-tertiary line-through leading-snug">
                                        {(() => {
                                          const libId = readingItemLibraryId(item);
                                          if (libId) {
                                            return (
                                              <Link href={`/references?ref=${encodeURIComponent(libId)}`}
                                                className="hover:text-secondary transition-colors"
                                                title="Open in Reference Manager library">
                                                {item.title}
                                              </Link>
                                            );
                                          }
                                          if (item.url) {
                                            return (
                                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                                className="hover:text-secondary transition-colors">
                                                {item.title}
                                              </a>
                                            );
                                          }
                                          return item.title;
                                        })()}
                                      </h4>
                                      {item.authors && (
                                        <p className="text-[11px] text-tertiary">{item.authors}</p>
                                      )}
                                    </div>
                                    <button onClick={() => deleteReadingItem(item.id)}
                                      className="text-tertiary hover:text-red-600 p-1 flex-shrink-0"
                                      aria-label="Remove">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── Shared ESABCC Reading List Tab ─── */}
              {rlTab === 'shared' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-tertiary-dark mb-1">
                        ESABCC Shared Reading List
                      </h3>
                      <p className="text-xs text-tertiary">
                        Team recommendations ranked by upvotes. Sign in to upvote or add items from your personal list.
                      </p>
                    </div>
                    {user && (
                      <button onClick={() => setRlTab('personal')}
                        className="text-xs text-secondary hover:underline whitespace-nowrap">
                        + Add from my list
                      </button>
                    )}
                  </div>

                  {sharedSorted.length === 0 ? (
                    <div className="bg-grey-50 border border-grey-200 border-dashed rounded-lg p-8 text-center">
                      <p className="text-sm text-tertiary mb-2">
                        No shared items yet. Share recommendations from your personal reading list to get started.
                      </p>
                      {user && (
                        <button onClick={() => setRlTab('personal')}
                          className="text-xs text-secondary hover:underline">
                          Go to my personal list
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedSorted.map((item, idx) => {
                        const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES['important'];
                        return (
                          <div key={item.id}
                            className={`bg-white rounded-lg border border-grey-200 border-l-4 ${style.border} p-4`}>
                            <div className="flex items-start gap-3">
                              {/* Upvote button */}
                              <button
                                onClick={() => toggleSharedUpvote(item.id)}
                                className={`flex flex-col items-center gap-0.5 min-w-[36px] pt-0.5 transition-colors ${
                                  item.upvotedByMe ? 'text-secondary' : 'text-grey-400 hover:text-secondary'
                                }`}
                                title={item.upvotedByMe ? 'Remove upvote' : 'Upvote this item'}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={item.upvotedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                  <path d="M12 4l-8 8h5v8h6v-8h5z" />
                                </svg>
                                <span className="text-xs font-bold">{item.upvotes}</span>
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {idx === 0 && item.upvotes > 0 && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                      #1 Top Pick
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}>
                                    {style.label}
                                  </span>
                                  <span className="text-[10px] font-medium text-tertiary uppercase tracking-wider">
                                    {KIND_LABELS[item.kind] || item.kind}
                                  </span>
                                  <span className="text-[10px] text-tertiary">
                                    Added {formatDate(item.addedDate)} by <span className="font-medium text-tertiary-dark">{item.addedByName}</span>
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-tertiary-dark leading-snug mb-0.5">
                                  {(() => {
                                    const libId = readingItemLibraryId(item);
                                    if (libId) {
                                      return (
                                        <Link href={`/references?ref=${encodeURIComponent(libId)}`}
                                          className="hover:text-secondary transition-colors"
                                          title="Open in Reference Manager library">
                                          {item.title}
                                        </Link>
                                      );
                                    }
                                    if (item.url) {
                                      return (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                                          className="hover:text-secondary transition-colors">
                                          {item.title}
                                        </a>
                                      );
                                    }
                                    return item.title;
                                  })()}
                                </h4>
                                {item.authors && (
                                  <p className="text-xs text-tertiary mb-1">{item.authors}</p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-tertiary-dark mt-1 leading-relaxed">{item.notes}</p>
                                )}
                              </div>

                              {/* Delete (only for the person who added it) */}
                              {user && item.addedById === user.id && (
                                <button onClick={() => deleteSharedItem(item.id)}
                                  className="text-tertiary hover:text-red-600 p-1 flex-shrink-0"
                                  aria-label="Remove">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {sharedSorted.length > 3 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <p className="text-xs text-amber-800 font-medium">
                        All-Time Highlights: Top {Math.min(3, sharedSorted.length)} most upvoted items are the team&apos;s essential reads.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ──────── Edit-feed-item modal ──────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => !editSaving && setEditItem(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-tertiary-dark">
                Edit {editItem.kind === 'internal' ? 'post' : 'email item'}
              </h3>
              <button onClick={() => !editSaving && setEditItem(null)}
                className="text-tertiary hover:text-tertiary-dark"
                title="Cancel">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1 block">Title</label>
            <input type="text"
              value={editItem.title}
              onChange={e => setEditItem(s => s ? { ...s, title: e.target.value } : s)}
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />

            <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1 block">Summary</label>
            <textarea
              value={editItem.summary}
              onChange={e => setEditItem(s => s ? { ...s, summary: e.target.value } : s)}
              rows={5}
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-y" />

            <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1 block">AI summary</label>
            <textarea
              value={editItem.aiSummary}
              onChange={e => setEditItem(s => s ? { ...s, aiSummary: e.target.value } : s)}
              rows={4}
              placeholder="Leave empty to let the backfill regenerate it on next open."
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-y" />

            <label className="text-xs font-semibold text-tertiary-dark uppercase tracking-wider mb-1 block">Tags</label>
            <input type="text"
              value={editItem.tags}
              onChange={e => setEditItem(s => s ? { ...s, tags: e.target.value } : s)}
              placeholder="comma-separated"
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />

            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setEditItem(null)}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-tertiary hover:text-tertiary-dark disabled:opacity-50">
                Cancel
              </button>
              <button onClick={saveEditedItem}
                disabled={editSaving || !editItem.title.trim()}
                className="px-4 py-2 bg-secondary text-white text-sm rounded font-medium hover:bg-secondary-dark transition-colors disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Add-to-reading-list modal (for news items) ──────── */}
      {newsToReadingList && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setNewsToReadingList(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-tertiary-dark mb-1">Add to Reading List</h3>
            <p className="text-xs text-tertiary mb-4 leading-relaxed line-clamp-2">{newsToReadingList.title}</p>
            <div className="space-y-2">
              <button
                onClick={() => addNewsToReadingList(newsToReadingList, 'personal')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-grey-200 hover:border-secondary hover:bg-secondary/5 transition text-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-secondary flex-shrink-0">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-tertiary-dark">My Personal List</p>
                  <p className="text-[11px] text-tertiary">Private — only you can see this</p>
                </div>
              </button>
              <button
                onClick={() => addNewsToReadingList(newsToReadingList, 'shared')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-grey-200 hover:border-secondary hover:bg-secondary/5 transition text-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-secondary flex-shrink-0">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-tertiary-dark">ESABCC Shared List</p>
                  <p className="text-[11px] text-tertiary">Visible to the whole team — can be upvoted</p>
                </div>
              </button>
            </div>
            <button onClick={() => setNewsToReadingList(null)}
              className="mt-3 w-full text-xs text-tertiary hover:text-tertiary-dark text-center py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ──────── Full message modal ──────── */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-grey-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: getSourceColor(selectedItem.source) }}>
                    {getSourceLabel(selectedItem.source)}
                  </span>
                  <span className="text-[11px] text-tertiary">{formatDate(selectedItem.publishedDate)}</span>
                  <span className="text-[11px] text-tertiary">· From {selectedItem.addedBy}</span>
                </div>
                <h2 className="text-lg font-bold text-tertiary-dark leading-snug">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-tertiary hover:text-tertiary-dark p-1 -mr-1 flex-shrink-0"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body — AI summary + detailed analysis + full email text */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Loading state while /summarize is in flight */}
              {summarizing && !selectedItem.aiSummary && (
                <div className="mb-5 p-4 rounded-lg border border-secondary/30 bg-secondary/5 flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-secondary animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <span className="text-sm text-secondary font-medium">Generating AI summary{selectedItem.isDailySpecial ? ' and detailed analysis' : ''}…</span>
                </div>
              )}

              {/* Error state if /summarize failed */}
              {summaryError && !selectedItem.aiSummary && (
                <div className="mb-5 p-4 rounded-lg border border-red-300 bg-red-50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-red-600">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700">AI Summary unavailable</span>
                  </div>
                  <p className="text-sm text-red-800 leading-relaxed">{summaryError}</p>
                  <p className="text-[11px] text-red-600 mt-2">If this persists, check that at least one LLM key (<code className="px-1 bg-red-100 rounded">AZURE_OPENAI_API_KEY</code>, <code className="px-1 bg-red-100 rounded">GEMINI_API_KEY</code>, <code className="px-1 bg-red-100 rounded">ANTHROPIC_API_KEY</code>, or <code className="px-1 bg-red-100 rounded">OPENAI_API_KEY</code>) is set in the Vercel project environment variables and the project has been redeployed since.</p>
                </div>
              )}

              {selectedItem.aiSummary && (
                <div className="mb-5 p-4 rounded-lg border border-secondary/30 bg-secondary/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-secondary">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">AI Summary</span>
                  </div>
                  <p className="text-sm text-tertiary-dark leading-relaxed">{linkifyText(selectedItem.aiSummary!)}</p>
                </div>
              )}

              {selectedItem.figureKind && (
                <div className="mb-5">
                  {renderNewsFigure(selectedItem.figureKind)}
                </div>
              )}

              {selectedItem.detailedAnalysis && (
                <div className="mb-5 p-4 rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
                  <div className="flex items-center gap-1.5 mb-3">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-amber-700">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Daily Special · Thematic Briefing</span>
                  </div>
                  <div className="text-sm text-tertiary-dark leading-relaxed whitespace-pre-wrap">{linkifyText(selectedItem.detailedAnalysis!)}</div>
                </div>
              )}

              <pre className="text-sm text-tertiary-dark whitespace-pre-wrap font-sans leading-relaxed">
                {linkifyText(selectedItem.fullText || selectedItem.summary)}
              </pre>
            </div>

            {/* Footer — tags + external link */}
            <div className="border-t border-grey-200 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {selectedItem.tags.map(tag => (
                  <span key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              {selectedItem.url && selectedItem.url !== '#' && (
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-secondary hover:underline inline-flex items-center gap-1"
                >
                  Open original link
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
