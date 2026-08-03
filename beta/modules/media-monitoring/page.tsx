'use client';

/**
 * Media Monitoring — dashboard page.
 *
 * Tabs:
 *   overview  — summary cards, timeline, map, top outlets, top countries
 *   reports   — ESABCC reports clustered with press + social traction
 *   articles  — searchable + filterable press article list
 *   social    — LinkedIn (+ other) posts mentioning ESABCC content
 *   keywords  — manage the keyword queries the fetcher iterates over
 *
 * Data comes from /api/media-monitoring/{analytics,articles,reports,social,...}.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { EsabccReport } from '@/data/esabcc-reports';
import { formatNumber, formatDate, timeAgo } from '@/lib/media-format';

Chart.register(...registerables);

const MediaMonitoringMap = dynamic(() => import('@/components/MediaMonitoringMap'), {
  ssr: false,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Keyword {
  id: string;
  keyword: string;
  label: string | null;
  category: string;
  language: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

interface Article {
  id: string;
  url: string;
  title: string;
  summary: string;
  source_name: string;
  outlet_domain: string | null;
  country: string | null;
  language: string | null;
  published_at: string | null;
  estimated_reach: number;
  matched_keywords: string[];
  matched_report_slugs?: string[];
}

interface SocialPost {
  id: string;
  platform: string;
  post_url: string;
  author_handle: string | null;
  author_name: string | null;
  author_profile_url: string | null;
  content: string;
  excerpt: string | null;
  posted_at: string | null;
  estimated_reach: number;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  matched_keywords: string[];
  matched_report_slugs: string[];
  source?: {
    display_name: string | null;
    profile_url: string | null;
    is_board_member: boolean;
  } | null;
}

interface SocialSource {
  id: string;
  platform: string;
  handle: string;
  source_type: string;
  display_name: string | null;
  profile_url: string | null;
  feed_url: string | null;
  is_board_member: boolean;
  is_active: boolean;
  default_report_slug: string | null;
}

interface ReportSummary extends EsabccReport {
  press_count: number;
  press_reach: number;
  social_count: number;
  social_reach: number;
  last_press_at: string | null;
  last_social_at: string | null;
}

interface AnalyticsResponse {
  summary: {
    total_articles: number;
    unique_outlets: number;
    total_reach: number;
    avg_reach: number;
    countries_covered: number;
  };
  timeline: { date: string; count: number; reach: number }[];
  byCountry: { country: string; country_name: string; count: number; reach: number }[];
  byOutlet: {
    domain: string;
    name: string;
    country: string;
    tier: string;
    count: number;
    reach: number;
    latitude?: number;
    longitude?: number;
  }[];
  byKeyword: { keyword: string; count: number }[];
  byTier: { tier: string; count: number }[];
  byLanguage: { language: string; count: number }[];
  recentRuns: {
    id: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    articles_found: number;
    articles_new: number;
    keywords_count: number;
    error_message: string | null;
  }[];
  window_days: number;
}

type Tab = 'overview' | 'reports' | 'articles' | 'social' | 'keywords' | 'sources';

/** A registered press feed (RSS / Google Alert / Talkwalker Alert). */
interface PressSource {
  id: string;
  name: string;
  source_type: 'google_alert' | 'talkwalker_alert' | 'rss';
  feed_url: string;
  alert_query: string | null;
  country: string | null;
  language: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_item_count: number;
}

/** A ready-to-paste alert query generated from the active keywords. */
interface AlertQuery {
  keywords: string[];
  query: string;
  category: string;
  language: string;
  country: string;
}

const PRESS_SOURCE_LABELS: Record<PressSource['source_type'], string> = {
  google_alert: 'Google Alert',
  talkwalker_alert: 'Talkwalker Alert',
  rss: 'RSS feed',
};

const PALETTE = ['#004B7F', '#007B6C', '#E8712B', '#6667AB', '#B83230', '#00928F', '#A530B8', '#FF9933'];

// ── Chart options (static — hoisted so identity is stable across renders) ──────

const TIMELINE_CHART_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: {
      position: 'left',
      title: { display: true, text: 'Articles' },
    },
    y1: {
      position: 'right',
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Reach' },
      ticks: {
        callback: (v) => formatNumber(Number(v)),
      },
    },
  },
};

const HORIZONTAL_BAR_OPTIONS: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
};

const DOUGHNUT_OPTIONS: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MediaMonitoringPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [windowDays, setWindowDays] = useState(90);
  const [keywordFilter, setKeywordFilter] = useState<string>('');

  // Global, dismissible error banner — set by any loader/mutation on failure.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin key (x-media-secret) for mutation endpoints, persisted locally.
  const [adminKey, setAdminKey] = useState('');

  // window.location.origin — populated client-side only, to avoid a hydration mismatch.
  const [origin, setOrigin] = useState('');

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesTotal, setArticlesTotal] = useState<number | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  // Draft values track the input fields as the user types; "applied" values
  // (used by loadArticles + filteredArticles) only change on Apply/Enter so
  // typing doesn't re-fire a network request on every keystroke.
  const [articleSearchDraft, setArticleSearchDraft] = useState('');
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCountryDraft, setArticleCountryDraft] = useState('');
  const [articleCountry, setArticleCountry] = useState('');
  const [articleOutletDraft, setArticleOutletDraft] = useState('');
  const [articleOutlet, setArticleOutlet] = useState('');
  const [articleSort, setArticleSort] = useState<'reach' | 'published'>('reach');
  const [articleKnownOnly, setArticleKnownOnly] = useState(true);
  const [articleTier, setArticleTier] = useState<string>('');

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('esabcc');
  const [newLanguage, setNewLanguage] = useState('en');

  const [reportSummaries, setReportSummaries] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('');

  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [socialTotal, setSocialTotal] = useState<number | null>(null);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialSearchDraft, setSocialSearchDraft] = useState('');
  const [socialSearch, setSocialSearch] = useState('');
  const [socialBoardOnly, setSocialBoardOnly] = useState(false);
  const [socialReportFilter, setSocialReportFilter] = useState('');
  const [socialAuthorFilterDraft, setSocialAuthorFilterDraft] = useState('');
  const [socialAuthorFilter, setSocialAuthorFilter] = useState('');
  const [socialSort, setSocialSort] = useState<'recent' | 'reach'>('recent');

  const [socialSources, setSocialSources] = useState<SocialSource[]>([]);
  const [socialFetchRunning, setSocialFetchRunning] = useState(false);
  const [socialFetchMessage, setSocialFetchMessage] = useState<string | null>(null);

  const [manualUrl, setManualUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualPosted, setManualPosted] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  const [pressSources, setPressSources] = useState<PressSource[]>([]);
  const [loadingPressSources, setLoadingPressSources] = useState(false);
  const [alertQueries, setAlertQueries] = useState<AlertQuery[]>([]);
  const [uncoveredKeywords, setUncoveredKeywords] = useState<string[]>([]);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] =
    useState<PressSource['source_type']>('google_alert');
  const [newSourceQuery, setNewSourceQuery] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  const [fetchRunning, setFetchRunning] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  // ── Admin key + origin bootstrapping ────────────────────────────────────────

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const stored = window.localStorage.getItem('media-monitoring-admin-key');
      if (stored) setAdminKey(stored);
    } catch {
      // localStorage unavailable (private browsing, etc.) — admin key just won't persist.
    }
  }, []);

  function updateAdminKey(value: string) {
    setAdminKey(value);
    try {
      if (value) {
        window.localStorage.setItem('media-monitoring-admin-key', value);
      } else {
        window.localStorage.removeItem('media-monitoring-admin-key');
      }
    } catch {
      // ignore — persistence is best-effort
    }
  }

  /** Headers for mutating requests: JSON content-type + optional admin secret. */
  const mutationHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminKey) headers['x-media-secret'] = adminKey;
    return headers;
  }, [adminKey]);

  const UNAUTHORIZED_MESSAGE =
    'Unauthorized — this action requires an admin key. Set it in the Keywords tab.';

  // ── Data loaders ────────────────────────────────────────────────────────────
  // Each loader aborts its own previous in-flight request before starting a
  // new one, so a slow earlier response can never clobber a newer one.

  const analyticsAbortRef = useRef<AbortController | null>(null);
  const loadAnalytics = useCallback(async () => {
    analyticsAbortRef.current?.abort();
    const controller = new AbortController();
    analyticsAbortRef.current = controller;
    setLoadingAnalytics(true);
    try {
      const qs = new URLSearchParams({ days: String(windowDays) });
      if (keywordFilter) qs.set('keyword', keywordFilter);
      const res = await fetch(`/api/media-monitoring/analytics?${qs.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load analytics', err);
      setErrorMessage('Failed to load analytics data.');
    } finally {
      if (analyticsAbortRef.current === controller) setLoadingAnalytics(false);
    }
  }, [windowDays, keywordFilter]);

  const articlesAbortRef = useRef<AbortController | null>(null);
  const loadArticles = useCallback(async () => {
    articlesAbortRef.current?.abort();
    const controller = new AbortController();
    articlesAbortRef.current = controller;
    setLoadingArticles(true);
    try {
      const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
      const qs = new URLSearchParams({ limit: '100', sort: articleSort, since });
      if (keywordFilter) qs.set('keyword', keywordFilter);
      if (articleCountry) qs.set('country', articleCountry);
      if (articleOutlet) qs.set('outlet', articleOutlet);
      if (articleTier) qs.set('tier', articleTier);
      if (articleKnownOnly) qs.set('known_only', '1');
      const res = await fetch(`/api/media-monitoring/articles?${qs.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setArticles(data.items || []);
      setArticlesTotal(typeof data.total === 'number' ? data.total : null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load articles', err);
      setErrorMessage('Failed to load articles.');
    } finally {
      if (articlesAbortRef.current === controller) setLoadingArticles(false);
    }
  }, [windowDays, keywordFilter, articleCountry, articleOutlet, articleTier, articleSort, articleKnownOnly]);

  const keywordsAbortRef = useRef<AbortController | null>(null);
  const loadKeywords = useCallback(async () => {
    keywordsAbortRef.current?.abort();
    const controller = new AbortController();
    keywordsAbortRef.current = controller;
    setLoadingKeywords(true);
    try {
      const res = await fetch('/api/media-monitoring/keywords', { signal: controller.signal });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load keywords', err);
      setErrorMessage('Failed to load keywords.');
    } finally {
      if (keywordsAbortRef.current === controller) setLoadingKeywords(false);
    }
  }, []);

  const reportsAbortRef = useRef<AbortController | null>(null);
  const loadReports = useCallback(async () => {
    reportsAbortRef.current?.abort();
    const controller = new AbortController();
    reportsAbortRef.current = controller;
    setLoadingReports(true);
    try {
      const qs = new URLSearchParams({ days: String(windowDays) });
      const res = await fetch(`/api/media-monitoring/reports?${qs.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setReportSummaries(data.reports || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load reports', err);
      setErrorMessage('Failed to load reports.');
    } finally {
      if (reportsAbortRef.current === controller) setLoadingReports(false);
    }
  }, [windowDays]);

  const socialAbortRef = useRef<AbortController | null>(null);
  const loadSocial = useCallback(async () => {
    socialAbortRef.current?.abort();
    const controller = new AbortController();
    socialAbortRef.current = controller;
    setLoadingSocial(true);
    try {
      const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString();
      const qs = new URLSearchParams({
        limit: '100',
        sort: socialSort,
        platform: 'linkedin',
        since,
      });
      if (socialReportFilter) qs.set('report', socialReportFilter);
      if (socialAuthorFilter) qs.set('author', socialAuthorFilter);
      if (socialBoardOnly) qs.set('board_only', '1');
      if (keywordFilter) qs.set('keyword', keywordFilter);
      const res = await fetch(`/api/media-monitoring/social?${qs.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSocialPosts(data.items || []);
      setSocialTotal(typeof data.total === 'number' ? data.total : null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load social posts', err);
      setErrorMessage('Failed to load social posts.');
    } finally {
      if (socialAbortRef.current === controller) setLoadingSocial(false);
    }
  }, [windowDays, socialSort, socialReportFilter, socialAuthorFilter, socialBoardOnly, keywordFilter]);

  const socialSourcesAbortRef = useRef<AbortController | null>(null);
  const loadSocialSources = useCallback(async () => {
    socialSourcesAbortRef.current?.abort();
    const controller = new AbortController();
    socialSourcesAbortRef.current = controller;
    try {
      const res = await fetch('/api/media-monitoring/social/sources', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSocialSources(data.sources || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load social sources', err);
      setErrorMessage('Failed to load social sources.');
    }
  }, []);

  const pressSourcesAbortRef = useRef<AbortController | null>(null);
  const loadPressSources = useCallback(async () => {
    pressSourcesAbortRef.current?.abort();
    const controller = new AbortController();
    pressSourcesAbortRef.current = controller;
    setLoadingPressSources(true);
    try {
      const res = await fetch('/api/media-monitoring/press-sources', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPressSources(data.sources || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load press sources', err);
      setErrorMessage('Failed to load feed sources.');
    } finally {
      setLoadingPressSources(false);
    }
  }, []);

  const alertQueriesAbortRef = useRef<AbortController | null>(null);
  const loadAlertQueries = useCallback(async () => {
    alertQueriesAbortRef.current?.abort();
    const controller = new AbortController();
    alertQueriesAbortRef.current = controller;
    try {
      const res = await fetch('/api/media-monitoring/alert-queries', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setAlertQueries(data.queries || []);
      setUncoveredKeywords(data.uncovered || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load alert queries', err);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (tab === 'articles') loadArticles();
    if (tab === 'keywords') loadKeywords();
    if (tab === 'reports') loadReports();
    if (tab === 'social') {
      loadSocial();
      loadSocialSources();
    }
    if (tab === 'sources') {
      loadPressSources();
      loadAlertQueries();
    }
  }, [
    tab,
    loadArticles,
    loadKeywords,
    loadReports,
    loadSocial,
    loadSocialSources,
    loadPressSources,
    loadAlertQueries,
  ]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function triggerFetch() {
    setFetchRunning(true);
    setFetchMessage(null);
    try {
      const res = await fetch('/api/media-monitoring/fetch', {
        method: 'POST',
        headers: mutationHeaders(),
      });
      if (res.status === 401) {
        setFetchMessage(null);
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        const scope =
          data.sources_count > 0
            ? `${data.keywords_count} keywords and ${data.sources_count} feeds`
            : `${data.keywords_count} keywords`;
        setFetchMessage(
          `Fetched ${data.articles_found} articles (${data.articles_new} new) across ${scope}` +
            // One channel failing still stores the other's results, so say so
            // rather than reporting a clean success.
            (data.degraded ? ` — degraded: ${data.degraded}` : ''),
        );
        loadAnalytics();
        if (tab === 'articles') loadArticles();
        if (tab === 'reports') loadReports();
        if (tab === 'social') loadSocial();
        if (tab === 'sources') loadPressSources();
      } else {
        setFetchMessage(`Fetch failed: ${data.error || res.statusText || 'unknown error'}`);
      }
    } catch (err) {
      setFetchMessage(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetchRunning(false);
    }
  }

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    try {
      const res = await fetch('/api/media-monitoring/keywords', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          label: newLabel.trim() || null,
          category: newCategory,
          language: newLanguage,
        }),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to add keyword: ${data.error || res.statusText}`);
        return;
      }
      setNewKeyword('');
      setNewLabel('');
      loadKeywords();
    } catch (err) {
      setErrorMessage(`Failed to add keyword: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function addPressSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    setAddingSource(true);
    try {
      const res = await fetch('/api/media-monitoring/press-sources', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify({
          name: newSourceName.trim(),
          feed_url: newSourceUrl.trim(),
          source_type: newSourceType,
          alert_query: newSourceQuery.trim() || null,
        }),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to add feed: ${data.error || res.statusText}`);
        return;
      }
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceQuery('');
      loadPressSources();
      loadAlertQueries();
    } catch (err) {
      setErrorMessage(
        `Failed to add feed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setAddingSource(false);
    }
  }

  async function togglePressSource(s: PressSource) {
    try {
      const res = await fetch('/api/media-monitoring/press-sources', {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify({
          id: s.id,
          is_active: !s.is_active,
          source_type: s.source_type,
        }),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to update feed: ${data.error || res.statusText}`);
        return;
      }
      loadPressSources();
    } catch (err) {
      setErrorMessage(
        `Failed to update feed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function deletePressSource(id: string) {
    if (!confirm('Remove this feed? Articles already collected are kept.')) return;
    try {
      const res = await fetch(
        `/api/media-monitoring/press-sources?id=${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: mutationHeaders() },
      );
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to remove feed: ${data.error || res.statusText}`);
        return;
      }
      loadPressSources();
      loadAlertQueries();
    } catch (err) {
      setErrorMessage(
        `Failed to remove feed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function copyQuery(query: string) {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedQuery(query);
      window.setTimeout(() => setCopiedQuery(null), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the
      // query is selectable in the page, so this is not worth an error banner.
    }
  }

  async function deleteKeyword(id: string) {
    if (!confirm('Delete this keyword? Existing articles keep their matches.')) return;
    try {
      const res = await fetch(`/api/media-monitoring/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to delete keyword: ${data.error || res.statusText}`);
        return;
      }
      loadKeywords();
    } catch (err) {
      setErrorMessage(`Failed to delete keyword: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function toggleKeyword(k: Keyword) {
    try {
      const res = await fetch('/api/media-monitoring/keywords', {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify({ id: k.id, is_active: !k.is_active }),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to update keyword: ${data.error || res.statusText}`);
        return;
      }
      loadKeywords();
    } catch (err) {
      setErrorMessage(`Failed to update keyword: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function submitManualPost(e: React.FormEvent) {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    setManualSubmitting(true);
    setManualMessage(null);
    try {
      const res = await fetch('/api/media-monitoring/social/ingest', {
        method: 'POST',
        headers: mutationHeaders(),
        body: JSON.stringify({
          url: manualUrl.trim(),
          content: manualContent.trim() || undefined,
          author_name: manualAuthor.trim() || undefined,
          posted_at: manualPosted.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        setManualMessage(`Failed: ${UNAUTHORIZED_MESSAGE}`);
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setManualMessage(`Failed: ${data.error || res.statusText}`);
      } else {
        const reports = (data.matched_report_slugs || []).join(', ');
        setManualMessage(
          `Added${reports ? ` (reports: ${reports})` : ''}.`,
        );
        setManualUrl('');
        setManualContent('');
        setManualAuthor('');
        setManualPosted('');
        loadSocial();
        loadReports();
      }
    } catch (err) {
      setManualMessage(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setManualSubmitting(false);
    }
  }

  async function triggerSocialFetch() {
    setSocialFetchRunning(true);
    setSocialFetchMessage(null);
    try {
      const res = await fetch('/api/media-monitoring/social/fetch', {
        method: 'POST',
        headers: mutationHeaders(),
      });
      if (res.status === 401) {
        setSocialFetchMessage(null);
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setSocialFetchMessage(
          `Fetched ${data.posts_found} posts (${data.posts_new} new) across ${data.sources_count} sources`,
        );
        if (tab === 'social') loadSocial();
        if (tab === 'reports') loadReports();
      } else {
        setSocialFetchMessage(`Social fetch failed: ${data.error || res.statusText || 'unknown error'}`);
      }
    } catch (err) {
      setSocialFetchMessage(
        `Social fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSocialFetchRunning(false);
    }
  }

  async function toggleSocialSource(s: SocialSource) {
    try {
      const res = await fetch('/api/media-monitoring/social/sources', {
        method: 'PATCH',
        headers: mutationHeaders(),
        body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(`Failed to update source: ${data.error || res.statusText}`);
        return;
      }
      loadSocialSources();
    } catch (err) {
      setErrorMessage(`Failed to update source: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Copies the draft article filters (search/country/outlet) into the applied state. */
  function applyArticleFilters(e?: React.FormEvent) {
    e?.preventDefault();
    setArticleSearch(articleSearchDraft.trim());
    setArticleCountry(articleCountryDraft.trim().toUpperCase());
    setArticleOutlet(articleOutletDraft.trim());
  }

  /** Copies the draft social filters (search/author) into the applied state. */
  function applySocialFilters(e?: React.FormEvent) {
    e?.preventDefault();
    setSocialSearch(socialSearchDraft.trim());
    setSocialAuthorFilter(socialAuthorFilterDraft.trim());
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredArticles = useMemo(() => {
    if (!articleSearch) return articles;
    const q = articleSearch.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.source_name || '').toLowerCase().includes(q),
    );
  }, [articles, articleSearch]);

  const filteredSocialPosts = useMemo(() => {
    if (!socialSearch) return socialPosts;
    const q = socialSearch.toLowerCase();
    return socialPosts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        (p.author_name || '').toLowerCase().includes(q) ||
        (p.author_handle || '').toLowerCase().includes(q),
    );
  }, [socialPosts, socialSearch]);

  const filteredReports = useMemo(() => {
    if (!reportCategoryFilter) return reportSummaries;
    return reportSummaries.filter((r) => r.category === reportCategoryFilter);
  }, [reportSummaries, reportCategoryFilter]);

  const lastRun = analytics?.recentRuns?.[0];

  // ── Chart data ─────────────────────────────────────────────────────────────

  const timelineData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.timeline.map((t) => t.date),
      datasets: [
        {
          label: 'Articles',
          data: analytics.timeline.map((t) => t.count),
          borderColor: '#004B7F',
          backgroundColor: 'rgba(0,75,127,0.15)',
          fill: true,
          tension: 0.25,
          yAxisID: 'y',
        },
        {
          label: 'Est. reach',
          data: analytics.timeline.map((t) => t.reach),
          borderColor: '#E8712B',
          backgroundColor: 'rgba(232,113,43,0.08)',
          fill: false,
          tension: 0.25,
          yAxisID: 'y1',
        },
      ],
    };
  }, [analytics]);

  const topOutletsData = useMemo(() => {
    if (!analytics) return null;
    const top = analytics.byOutlet.slice(0, 10);
    return {
      labels: top.map((o) => o.name),
      datasets: [
        {
          label: 'Articles',
          data: top.map((o) => o.count),
          backgroundColor: PALETTE[0] + 'CC',
          borderColor: PALETTE[0],
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  const topCountriesData = useMemo(() => {
    if (!analytics) return null;
    const top = analytics.byCountry.slice(0, 12);
    return {
      labels: top.map((c) => c.country_name || c.country),
      datasets: [
        {
          label: 'Articles',
          data: top.map((c) => c.count),
          backgroundColor: PALETTE[1] + 'CC',
          borderColor: PALETTE[1],
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  const keywordFreqData = useMemo(() => {
    if (!analytics) return null;
    const top = analytics.byKeyword.slice(0, 10);
    return {
      labels: top.map((k) => k.keyword),
      datasets: [
        {
          label: 'Articles',
          data: top.map((k) => k.count),
          backgroundColor: PALETTE[2] + 'CC',
          borderColor: PALETTE[2],
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  const tierData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.byTier.map((t) => t.tier),
      datasets: [
        {
          data: analytics.byTier.map((t) => t.count),
          backgroundColor: PALETTE,
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  const languageData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.byLanguage.map((l) => l.language.toUpperCase()),
      datasets: [
        {
          data: analytics.byLanguage.map((l) => l.count),
          backgroundColor: PALETTE,
          borderWidth: 1,
        },
      ],
    };
  }, [analytics]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" />
        </svg>
        Back to Method Hub
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-tertiary-dark">Media Monitoring</h1>
          <p className="text-sm text-tertiary mt-1">
            Track press coverage of the ESABCC and EU climate policy across major European outlets.
            Coverage is weighted by the estimated monthly readership of each outlet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="text-sm border border-grey-200 rounded px-2 py-1.5 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button
            onClick={triggerFetch}
            disabled={fetchRunning}
            className="text-sm bg-secondary text-white rounded px-4 py-1.5 hover:bg-secondary-dark disabled:opacity-50 font-medium"
          >
            {fetchRunning ? 'Fetching…' : 'Refresh feeds'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 px-4 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex items-start justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="text-red-700 hover:text-red-900 font-medium leading-none"
          >
            ×
          </button>
        </div>
      )}

      {fetchMessage && (
        <div className="mb-4 px-4 py-2 rounded bg-primary/5 border border-primary/20 text-sm text-primary">
          {fetchMessage}
        </div>
      )}

      {lastRun && (
        <p className="text-xs text-tertiary mb-4">
          Last refreshed {timeAgo(lastRun.finished_at || lastRun.started_at)} ·{' '}
          {lastRun.articles_found} articles · {lastRun.articles_new} new ·{' '}
          <span className={lastRun.status === 'success' ? 'text-primary' : 'text-red-600'}>
            {lastRun.status}
          </span>
        </p>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Media monitoring sections" className="flex gap-1 mb-6 border-b border-grey-200 overflow-x-auto">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'reports', label: 'Reports' },
            { key: 'articles', label: 'Press' },
            { key: 'social', label: 'Social Media' },
            { key: 'keywords', label: 'Keywords' },
            { key: 'sources', label: 'Sources' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-secondary text-secondary'
                : 'border-transparent text-tertiary hover:text-tertiary-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Keyword filter chip strip (applies to overview + articles + social) */}
      {analytics && analytics.byKeyword.length > 0 && tab !== 'keywords' && tab !== 'reports' && tab !== 'sources' && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setKeywordFilter('')}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              keywordFilter === ''
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-tertiary border-grey-200 hover:border-primary'
            }`}
          >
            All keywords
          </button>
          {analytics.byKeyword.slice(0, 12).map((k) => (
            <button
              key={k.keyword}
              onClick={() => setKeywordFilter(k.keyword)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                keywordFilter === k.keyword
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-tertiary border-grey-200 hover:border-primary'
              }`}
            >
              {k.keyword} <span className="opacity-60">({k.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* ─────────────── Overview ─────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                label: 'Articles',
                value: formatNumber(analytics?.summary.total_articles || 0),
                color: 'text-primary',
              },
              {
                label: 'Outlets',
                value: formatNumber(analytics?.summary.unique_outlets || 0),
                color: 'text-secondary',
              },
              {
                label: 'Countries',
                value: formatNumber(analytics?.summary.countries_covered || 0),
                color: 'text-tertiary-dark',
              },
              {
                label: 'Total reach',
                value: formatNumber(analytics?.summary.total_reach || 0),
                color: 'text-accent-violet',
              },
              {
                label: 'Avg reach/article',
                value: formatNumber(analytics?.summary.avg_reach || 0),
                color: 'text-accent-orange',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded shadow-sm border border-grey-200 p-5"
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-tertiary mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
              Coverage timeline
            </h2>
            {timelineData && analytics && analytics.timeline.length > 0 ? (
              <div style={{ height: 280 }}>
                <Line data={timelineData} options={TIMELINE_CHART_OPTIONS} />
              </div>
            ) : (
              <EmptyState loading={loadingAnalytics} />
            )}
          </div>

          {/* Map */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
              Geographic coverage
            </h2>
            {analytics && analytics.byCountry.length > 0 ? (
              <MediaMonitoringMap
                byCountry={analytics.byCountry}
                outlets={analytics.byOutlet}
              />
            ) : (
              <EmptyState loading={loadingAnalytics} />
            )}
          </div>

          {/* Two-up: Top outlets + Top countries */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Top outlets
              </h2>
              {topOutletsData && analytics && analytics.byOutlet.length > 0 ? (
                <div style={{ height: 320 }}>
                  <Bar data={topOutletsData} options={HORIZONTAL_BAR_OPTIONS} />
                </div>
              ) : (
                <EmptyState loading={loadingAnalytics} />
              )}
            </div>

            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Top countries
              </h2>
              {topCountriesData && analytics && analytics.byCountry.length > 0 ? (
                <div style={{ height: 320 }}>
                  <Bar data={topCountriesData} options={HORIZONTAL_BAR_OPTIONS} />
                </div>
              ) : (
                <EmptyState loading={loadingAnalytics} />
              )}
            </div>
          </div>

          {/* Three-up: keywords, tiers, languages */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Keyword frequency
              </h2>
              {keywordFreqData && analytics && analytics.byKeyword.length > 0 ? (
                <div style={{ height: 260 }}>
                  <Bar data={keywordFreqData} options={HORIZONTAL_BAR_OPTIONS} />
                </div>
              ) : (
                <EmptyState loading={loadingAnalytics} />
              )}
            </div>

            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Outlet tier mix
              </h2>
              {tierData && analytics && analytics.byTier.length > 0 ? (
                <div style={{ height: 260 }}>
                  <Doughnut data={tierData} options={DOUGHNUT_OPTIONS} />
                </div>
              ) : (
                <EmptyState loading={loadingAnalytics} />
              )}
            </div>

            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Languages
              </h2>
              {languageData && analytics && analytics.byLanguage.length > 0 ? (
                <div style={{ height: 260 }}>
                  <Doughnut data={languageData} options={DOUGHNUT_OPTIONS} />
                </div>
              ) : (
                <EmptyState loading={loadingAnalytics} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── Reports ─────────────── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-tertiary max-w-2xl">
              Coverage clustered by ESABCC report. Each card totals the press
              and social (LinkedIn) mentions attributed to that publication
              via the report&apos;s title and keywords. Click a card to open
              the full timeline for board-member sharing.
            </p>
            <select
              value={reportCategoryFilter}
              onChange={(e) => setReportCategoryFilter(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2 bg-white"
            >
              <option value="">All categories</option>
              <option value="climate-targets">Climate targets</option>
              <option value="climate-neutrality">Climate neutrality</option>
              <option value="energy-infrastructure">Energy infrastructure</option>
              <option value="energy-crisis">Energy crisis</option>
              <option value="carbon-removals">Carbon removals</option>
              <option value="climate-law">Climate law</option>
              <option value="adaptation">Adaptation</option>
              <option value="agri-food">Agri-food</option>
            </select>
          </div>

          {loadingReports ? (
            <div className="text-center text-tertiary py-10">Loading reports…</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center text-tertiary py-10">
              No reports match this category.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((r) => (
                <Link
                  key={r.slug}
                  href={`/media-monitoring/reports/${r.slug}`}
                  className="bg-white border border-grey-200 rounded p-5 hover:border-primary transition block"
                >
                  <p className="text-[10px] uppercase tracking-wider text-tertiary font-medium">
                    {r.category.replace(/-/g, ' ')} · {formatDate(r.published_on)}
                  </p>
                  <h3 className="font-bold text-tertiary-dark text-sm mt-1 mb-3 line-clamp-3">
                    {r.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-lg font-bold text-primary">
                        {formatNumber(r.press_count)}
                      </p>
                      <p className="text-[10px] text-tertiary uppercase tracking-wider">
                        Press articles
                      </p>
                      <p className="text-xs text-tertiary mt-0.5">
                        {formatNumber(r.press_reach)} reach
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-accent-violet">
                        {formatNumber(r.social_count)}
                      </p>
                      <p className="text-[10px] text-tertiary uppercase tracking-wider">
                        LinkedIn posts
                      </p>
                      <p className="text-xs text-tertiary mt-0.5">
                        {formatNumber(r.social_reach)} reach
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-tertiary">
                    <span>
                      Last press: {r.last_press_at ? timeAgo(r.last_press_at) : '—'}
                    </span>
                    <span>
                      Last social: {r.last_social_at ? timeAgo(r.last_social_at) : '—'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────── Articles ─────────────── */}
      {tab === 'articles' && (
        <div className="space-y-4">
          <form
            onSubmit={applyArticleFilters}
            className="bg-white border border-grey-200 rounded p-4 flex flex-wrap gap-3 items-center"
          >
            <input
              type="text"
              value={articleSearchDraft}
              onChange={(e) => setArticleSearchDraft(e.target.value)}
              placeholder="Search title, summary, outlet…"
              aria-label="Search articles by title, summary or outlet"
              className="flex-1 min-w-[200px] text-sm border border-grey-200 rounded px-3 py-2"
            />
            <input
              type="text"
              value={articleCountryDraft}
              onChange={(e) => setArticleCountryDraft(e.target.value.toUpperCase())}
              placeholder="Country (ISO, e.g. DE)"
              aria-label="Filter by country ISO code"
              maxLength={2}
              className="text-sm border border-grey-200 rounded px-3 py-2 w-40"
            />
            <input
              type="text"
              value={articleOutletDraft}
              onChange={(e) => setArticleOutletDraft(e.target.value)}
              placeholder="Outlet domain (e.g. politico.eu)"
              aria-label="Filter by outlet domain"
              className="text-sm border border-grey-200 rounded px-3 py-2 w-60"
            />
            <select
              value={articleTier}
              onChange={(e) => setArticleTier(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Outlet tier"
              aria-label="Filter by outlet tier"
            >
              <option value="">All tiers</option>
              <option value="global">Global only</option>
              <option value="global,national">Global + National</option>
              <option value="global,national,trade">Global + National + Trade</option>
              <option value="trade">Trade only</option>
            </select>
            <select
              value={articleSort}
              onChange={(e) => setArticleSort(e.target.value as 'reach' | 'published')}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Sort order"
              aria-label="Sort articles"
            >
              <option value="reach">Sort: reach ↓</option>
              <option value="published">Sort: newest</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-tertiary cursor-pointer">
              <input
                type="checkbox"
                checked={articleKnownOnly}
                onChange={(e) => setArticleKnownOnly(e.target.checked)}
                className="accent-primary"
              />
              Reputable outlets only
            </label>
            <button
              type="submit"
              className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium"
            >
              Apply
            </button>
          </form>

          {loadingArticles ? (
            <div className="text-center text-tertiary py-10">Loading articles…</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center text-tertiary py-10">
              No articles yet. Click &quot;Refresh feeds&quot; to fetch the latest coverage.
            </div>
          ) : (
            <div className="space-y-3">
              {articlesTotal !== null && articlesTotal > articles.length ? (
                <p className="text-xs text-tertiary">
                  Showing {articles.length} of {formatNumber(articlesTotal)} articles matching these filters.
                </p>
              ) : articlesTotal === null && articles.length === 100 ? (
                <p className="text-xs text-tertiary">Showing first 100 results.</p>
              ) : null}
              {filteredArticles.map((a) => (
                <article
                  key={a.id}
                  className="bg-white border border-grey-200 rounded p-4 hover:border-primary transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-tertiary-dark hover:text-primary block"
                        >
                          {a.title}
                        </a>
                      ) : (
                        <span className="text-base font-semibold text-tertiary-dark block">
                          {a.title}
                        </span>
                      )}
                      <p className="text-sm text-tertiary mt-1 line-clamp-2">{a.summary}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-tertiary flex-wrap">
                        <span className="font-medium text-secondary">{a.source_name}</span>
                        {a.country && <span>· {a.country}</span>}
                        {a.language && <span>· {a.language.toUpperCase()}</span>}
                        <span>· {formatDate(a.published_at)}</span>
                        {a.matched_keywords.length > 0 && (
                          <span className="flex gap-1 flex-wrap">
                            {a.matched_keywords.slice(0, 3).map((k) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px]"
                              >
                                {k}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-accent-orange">
                        {formatNumber(a.estimated_reach)}
                      </p>
                      <p className="text-[10px] text-tertiary">est. reach</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────── Social Media ─────────────── */}
      {tab === 'social' && (
        <div className="space-y-4">
          <form
            onSubmit={applySocialFilters}
            className="bg-white border border-grey-200 rounded p-4 flex flex-wrap gap-3 items-center"
          >
            <input
              type="text"
              value={socialSearchDraft}
              onChange={(e) => setSocialSearchDraft(e.target.value)}
              placeholder="Search post content or author…"
              aria-label="Search post content or author"
              className="flex-1 min-w-[200px] text-sm border border-grey-200 rounded px-3 py-2"
            />
            <input
              type="text"
              value={socialAuthorFilterDraft}
              onChange={(e) => setSocialAuthorFilterDraft(e.target.value)}
              placeholder="Author handle"
              aria-label="Filter by author handle"
              className="text-sm border border-grey-200 rounded px-3 py-2 w-48"
            />
            <select
              value={socialReportFilter}
              onChange={(e) => setSocialReportFilter(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Filter by report cluster"
              aria-label="Filter by report cluster"
            >
              <option value="">All reports</option>
              {reportSummaries.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.short_title}
                </option>
              ))}
            </select>
            <select
              value={socialSort}
              onChange={(e) => setSocialSort(e.target.value as 'recent' | 'reach')}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Sort order"
              aria-label="Sort posts"
            >
              <option value="recent">Sort: newest</option>
              <option value="reach">Sort: reach ↓</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-tertiary cursor-pointer">
              <input
                type="checkbox"
                checked={socialBoardOnly}
                onChange={(e) => setSocialBoardOnly(e.target.checked)}
                className="accent-primary"
              />
              Board members only
            </label>
            <button
              type="submit"
              className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium"
            >
              Apply
            </button>
          </form>

          {/* Capture tools: browser extension download + manual paste form */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-grey-200 rounded p-4">
              <h3 className="text-xs uppercase tracking-wider text-tertiary font-medium mb-2">
                Edge / Chrome extension
              </h3>
              <p className="text-sm text-tertiary-dark mb-3">
                One-click capture from any LinkedIn post you see in your
                feed. Runs in your authenticated session so it reads the real
                post content — no API required.
              </p>
              <a
                href="/esabcc-capture.zip"
                download
                className="inline-block text-sm bg-accent-violet text-white rounded px-4 py-2 hover:opacity-90 font-medium mb-3"
              >
                Download esabcc-capture.zip
              </a>
              <ol className="text-xs text-tertiary space-y-1 list-decimal list-inside">
                <li>Unzip to a folder you won&apos;t delete.</li>
                <li>Open <code>edge://extensions</code> and enable Developer mode.</li>
                <li>Click <strong>Load unpacked</strong> and select the folder.</li>
                <li>
                  In the extension&apos;s options, set API base URL to this
                  site (<code>{origin}</code>).
                </li>
                <li>Right-click any LinkedIn post → <strong>Send to ESABCC monitor</strong>.</li>
              </ol>
            </div>

            <div className="bg-white border border-grey-200 rounded p-4">
              <h3 className="text-xs uppercase tracking-wider text-tertiary font-medium mb-2">
                Add a post manually
              </h3>
              <p className="text-sm text-tertiary-dark mb-3">
                Paste any LinkedIn post URL. Fill in the content for proper
                report clustering — the URL alone gives us almost nothing
                because LinkedIn hides post text from crawlers.
              </p>
              <form onSubmit={submitManualPost} className="space-y-2">
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/posts/..."
                  required
                  className="w-full text-sm border border-grey-200 rounded px-3 py-2"
                />
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Post content (paste what you see — used for keyword + report matching)"
                  rows={4}
                  className="w-full text-sm border border-grey-200 rounded px-3 py-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    placeholder="Author name"
                    className="text-sm border border-grey-200 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    value={manualPosted}
                    onChange={(e) => setManualPosted(e.target.value)}
                    placeholder="Posted (22h, 3d, or ISO date)"
                    className="text-sm border border-grey-200 rounded px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={manualSubmitting || !manualUrl.trim()}
                  className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium disabled:opacity-50"
                >
                  {manualSubmitting ? 'Adding…' : 'Add to dashboard'}
                </button>
                {manualMessage && (
                  <p className={`text-xs mt-2 ${manualMessage.startsWith('Failed') ? 'text-red-600' : 'text-primary'}`}>
                    {manualMessage}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Optional: RSS feed-based sources (admin-only) */}
          {socialSources.length > 0 && (
            <details className="bg-white border border-grey-200 rounded">
              <summary className="px-4 py-3 cursor-pointer text-xs uppercase tracking-wider text-tertiary font-medium">
                Tracked accounts ({socialSources.filter((s) => s.is_active).length} active)
                {socialFetchRunning && <span className="ml-2 text-[10px]">· fetching…</span>}
              </summary>
              <div className="px-4 pb-4 space-y-4">
                {(['company', 'hashtag', 'account'] as const).map((type) => {
                  const group = socialSources.filter((s) => s.source_type === type);
                  if (group.length === 0) return null;
                  const typeLabel =
                    type === 'account'
                      ? 'Board-member accounts'
                      : type === 'company'
                      ? 'Company / institutional pages'
                      : 'Hashtags';
                  const badgeEmoji = type === 'hashtag' ? '#' : type === 'company' ? '🏛' : '★';
                  return (
                    <div key={type}>
                      <p className="text-[10px] uppercase tracking-wider text-tertiary mb-2">
                        {typeLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleSocialSource(s)}
                            className={`text-xs px-3 py-1 rounded-full border transition ${
                              s.is_active
                                ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/40'
                                : 'bg-grey-100 text-tertiary border-grey-200'
                            }`}
                            title={s.feed_url ? `Feed: ${s.feed_url}` : 'No feed URL — posts arrive via the extension or manual ingest only'}
                          >
                            <span className="mr-1">{badgeEmoji}</span>
                            {s.display_name || s.handle}
                            {s.feed_url && <span className="ml-1 opacity-60">· feed</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 pt-2 border-t border-grey-100">
                  <button
                    onClick={triggerSocialFetch}
                    disabled={socialFetchRunning}
                    className="text-xs bg-secondary text-white rounded px-3 py-1.5 hover:bg-secondary-dark disabled:opacity-50"
                  >
                    {socialFetchRunning ? 'Pulling feeds…' : 'Pull RSS feeds'}
                  </button>
                  <p className="text-[10px] text-tertiary">
                    Only sources with an RSS feed URL are fetched. Posts for accounts without a feed come in via the extension or the manual form above.
                  </p>
                </div>
                {socialFetchMessage && (
                  <p className="text-xs text-accent-violet">{socialFetchMessage}</p>
                )}
              </div>
            </details>
          )}

          {loadingSocial ? (
            <div className="text-center text-tertiary py-10">Loading posts…</div>
          ) : filteredSocialPosts.length === 0 ? (
            <div className="text-center text-tertiary py-10">
              No LinkedIn posts captured yet. Install the browser extension or
              paste a URL using the tools above.
            </div>
          ) : (
            <div className="space-y-3">
              {socialTotal !== null && socialTotal > socialPosts.length ? (
                <p className="text-xs text-tertiary">
                  Showing {socialPosts.length} of {formatNumber(socialTotal)} posts matching these filters.
                </p>
              ) : socialTotal === null && socialPosts.length === 100 ? (
                <p className="text-xs text-tertiary">Showing first 100 results.</p>
              ) : null}
              {filteredSocialPosts.map((p) => (
                <article
                  key={p.id}
                  className="bg-white border border-grey-200 rounded p-4 hover:border-accent-violet transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-accent-violet/10 text-accent-violet font-medium uppercase tracking-wider">
                          {p.platform}
                        </span>
                        {p.source?.is_board_member && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            ★ Board member
                          </span>
                        )}
                        {p.author_name && (
                          <span className="text-sm font-semibold text-tertiary-dark">
                            {p.author_name}
                          </span>
                        )}
                        {p.author_handle && (
                          <span className="text-xs text-tertiary">@{p.author_handle}</span>
                        )}
                      </div>
                      <a
                        href={p.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-tertiary-dark hover:text-accent-violet line-clamp-3 block"
                      >
                        {p.excerpt || p.content || '(no text)'}
                      </a>
                      <div className="flex items-center gap-3 mt-2 text-xs text-tertiary flex-wrap">
                        <span>{formatDate(p.posted_at)}</span>
                        {typeof p.like_count === 'number' && (
                          <span>· {p.like_count} likes</span>
                        )}
                        {typeof p.comment_count === 'number' && (
                          <span>· {p.comment_count} comments</span>
                        )}
                        {p.matched_report_slugs.length > 0 && (
                          <span className="flex gap-1 flex-wrap">
                            {p.matched_report_slugs.slice(0, 2).map((slug) => (
                              <Link
                                key={slug}
                                href={`/media-monitoring/reports/${slug}`}
                                className="px-2 py-0.5 rounded bg-accent-violet/10 text-accent-violet text-[10px] hover:underline"
                              >
                                {slug}
                              </Link>
                            ))}
                          </span>
                        )}
                        {p.matched_keywords.length > 0 && (
                          <span className="flex gap-1 flex-wrap">
                            {p.matched_keywords.slice(0, 3).map((k) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px]"
                              >
                                {k}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.estimated_reach > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-accent-orange">
                          {formatNumber(p.estimated_reach)}
                        </p>
                        <p className="text-[10px] text-tertiary">est. reach</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────── Keywords ─────────────── */}
      {tab === 'sources' && (
        <div className="space-y-4">
          <div className="bg-white border border-grey-200 rounded p-4">
            <h2 className="text-sm font-semibold text-primary mb-2">
              Standing feeds
            </h2>
            <p className="text-xs text-tertiary leading-relaxed">
              Coverage is collected from two places. Google News is searched
              automatically on every run using the keywords below — nothing to
              set up. The feeds registered here are polled alongside it, which
              matters because Google News rate-limits heavily and changes its
              format without notice.
            </p>
            <p className="text-xs text-tertiary leading-relaxed mt-2">
              <strong className="text-secondary">Alerts are created by hand.</strong>{' '}
              Neither Google Alerts nor Talkwalker offers an API for creating
              alerts, so each one is set up once in their website and its RSS
              URL is pasted here. Everything after that is automatic: each new
              item is matched against your current keywords at fetch time, so
              adding a keyword applies to incoming coverage immediately without
              touching the alerts.
            </p>
          </div>

          {alertQueries.length > 0 && (
            <div className="bg-white border border-grey-200 rounded p-4">
              <h2 className="text-sm font-semibold text-primary mb-1">
                Step 1 — queries built from your keywords
              </h2>
              <p className="text-xs text-tertiary mb-3">
                Copy a query, then paste it into{' '}
                <a
                  href="https://www.google.com/alerts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary underline"
                >
                  google.com/alerts
                </a>{' '}
                or{' '}
                <a
                  href="https://alerts.talkwalker.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary underline"
                >
                  alerts.talkwalker.com
                </a>
                . Set delivery to <em>RSS feed</em>, then copy the feed URL back
                into step 2. These regenerate whenever you change your keywords.
              </p>
              <div className="space-y-2">
                {alertQueries.map((q) => (
                  <div
                    key={q.query}
                    className="flex flex-wrap items-center gap-2 border border-grey-200 rounded px-3 py-2"
                  >
                    <span className="text-xs uppercase tracking-wide text-tertiary shrink-0">
                      {q.category} · {q.language.toUpperCase()}
                    </span>
                    <code className="text-xs flex-1 min-w-[12rem] break-all">
                      {q.query}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyQuery(q.query)}
                      className="text-xs border border-grey-200 rounded px-2 py-1 hover:bg-grey-50 shrink-0"
                    >
                      {copiedQuery === q.query ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
              {uncoveredKeywords.length > 0 && (
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2 mt-3">
                  <strong>
                    {uncoveredKeywords.length} keyword
                    {uncoveredKeywords.length === 1 ? '' : 's'} not covered by
                    any registered alert:
                  </strong>{' '}
                  {uncoveredKeywords.join(', ')}. These are still searched on
                  Google News — adding an alert for them just adds a second,
                  more reliable channel.
                </p>
              )}
            </div>
          )}

          <form
            onSubmit={addPressSource}
            className="bg-white border border-grey-200 rounded p-4 space-y-3"
          >
            <h2 className="text-sm font-semibold text-primary">
              Step 2 — register the feed URL
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={newSourceType}
                onChange={(e) =>
                  setNewSourceType(e.target.value as PressSource['source_type'])
                }
                className="text-sm border border-grey-200 rounded px-3 py-2"
              >
                <option value="google_alert">Google Alert</option>
                <option value="talkwalker_alert">Talkwalker Alert</option>
                <option value="rss">RSS feed</option>
              </select>
              <input
                type="text"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="Name (e.g. Alert: ESABCC)"
                className="text-sm border border-grey-200 rounded px-3 py-2"
                required
              />
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="Feed URL"
                className="md:col-span-2 text-sm border border-grey-200 rounded px-3 py-2"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newSourceQuery}
                onChange={(e) => setNewSourceQuery(e.target.value)}
                placeholder="Query used (optional — drives coverage check)"
                className="md:col-span-3 text-sm border border-grey-200 rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={addingSource}
                className="bg-secondary text-white rounded px-4 py-2 text-sm font-medium hover:bg-secondary-dark disabled:opacity-50"
              >
                {addingSource ? 'Adding…' : 'Add feed'}
              </button>
            </div>
            <p className="text-xs text-tertiary">
              For a Google Alert this must be the URL behind the orange RSS
              icon (<code>google.com/alerts/feeds/…</code>), not the alerts
              management page.
            </p>
          </form>

          <div className="bg-white border border-grey-200 rounded overflow-hidden">
            {loadingPressSources ? (
              <p className="text-sm text-tertiary p-4">Loading feeds…</p>
            ) : pressSources.length === 0 ? (
              <p className="text-sm text-tertiary p-4">
                No feeds registered yet. Google News search still runs on every
                refresh, so the dashboard keeps working without them.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-grey-50 text-xs uppercase tracking-wide text-tertiary">
                  <tr>
                    <th className="text-left px-4 py-2">Feed</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Last run</th>
                    <th className="text-right px-4 py-2">Items</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pressSources.map((s) => (
                    <tr key={s.id} className="border-t border-grey-200 align-top">
                      <td className="px-4 py-2">
                        <span
                          className={s.is_active ? 'font-medium' : 'text-tertiary'}
                        >
                          {s.name}
                        </span>
                        {!s.is_active && (
                          <span className="ml-2 text-xs text-tertiary">(paused)</span>
                        )}
                        <div className="text-xs text-tertiary break-all">
                          {s.feed_url}
                        </div>
                        {s.last_error && (
                          <div className="text-xs text-red-700 mt-1">
                            {s.last_error}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {PRESS_SOURCE_LABELS[s.source_type] ?? s.source_type}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {s.last_fetched_at ? (
                          <span
                            className={
                              s.last_status === 'error'
                                ? 'text-red-700'
                                : 'text-tertiary'
                            }
                          >
                            {s.last_status === 'error' ? 'Failed' : 'OK'} ·{' '}
                            {new Date(s.last_fetched_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-tertiary">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {s.last_item_count}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => togglePressSource(s)}
                          className="text-xs border border-grey-200 rounded px-2 py-1 hover:bg-grey-50"
                        >
                          {s.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePressSource(s.id)}
                          className="text-xs border border-grey-200 rounded px-2 py-1 ml-2 hover:bg-grey-50 text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'keywords' && (
        <div className="space-y-4">
          <form
            onSubmit={addKeyword}
            className="bg-white border border-grey-200 rounded p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Keyword or phrase"
              className="md:col-span-2 text-sm border border-grey-200 rounded px-3 py-2"
              required
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="text-sm border border-grey-200 rounded px-3 py-2"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2"
            >
              <option value="esabcc">ESABCC</option>
              <option value="institution_quote">Institution Quote</option>
              <option value="board_quote">Board Quote</option>
              <option value="report">Report</option>
              <option value="policy">Policy</option>
              <option value="institution">Institution</option>
              <option value="person">Person</option>
              <option value="general">General</option>
            </select>
            <div className="flex gap-2">
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="flex-1 text-sm border border-grey-200 rounded px-3 py-2"
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
                <option value="nl">NL</option>
                <option value="pl">PL</option>
                <option value="pt">PT</option>
                <option value="el">EL</option>
                <option value="da">DA</option>
                <option value="sv">SV</option>
                <option value="fi">FI</option>
                <option value="no">NO</option>
              </select>
              <button
                type="submit"
                className="bg-secondary text-white rounded px-4 py-2 text-sm font-medium hover:bg-secondary-dark"
              >
                Add
              </button>
            </div>
          </form>

          <div className="bg-white border border-grey-200 rounded p-4 flex flex-wrap items-center gap-3">
            <label htmlFor="media-admin-key" className="text-xs text-tertiary font-medium">
              Admin key
            </label>
            <input
              id="media-admin-key"
              type="password"
              value={adminKey}
              onChange={(e) => updateAdminKey(e.target.value)}
              placeholder="Only needed if MEDIA_MONITORING_SECRET is set on the server"
              aria-label="Admin key for mutation endpoints"
              className="flex-1 min-w-[240px] text-sm border border-grey-200 rounded px-3 py-2"
            />
            <p className="text-[10px] text-tertiary max-w-xs">
              Stored locally in this browser and sent as <code>x-media-secret</code>{' '}
              on keyword, social source, manual post, and refresh actions.
            </p>
          </div>

          {loadingKeywords ? (
            <div className="text-center text-tertiary py-10">Loading keywords…</div>
          ) : keywords.length === 0 ? (
            <div className="text-center text-tertiary py-10">
              No keywords configured yet. Add one above to start monitoring coverage.
            </div>
          ) : (
            <div className="bg-white border border-grey-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-grey-50 text-tertiary text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Keyword</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Language</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Added</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((k) => (
                    <tr key={k.id} className="border-t border-grey-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-tertiary-dark">{k.keyword}</p>
                        {k.label && <p className="text-xs text-tertiary">{k.label}</p>}
                      </td>
                      <td className="px-4 py-3 text-tertiary capitalize">{k.category}</td>
                      <td className="px-4 py-3 text-tertiary uppercase">{k.language}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleKeyword(k)}
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            k.is_active
                              ? 'bg-primary/10 text-primary'
                              : 'bg-grey-100 text-tertiary'
                          }`}
                        >
                          {k.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-tertiary">{formatDate(k.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteKeyword(k.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="text-center text-tertiary text-sm py-10">
      {loading ? 'Loading…' : 'No data yet. Click "Refresh feeds" to fetch coverage.'}
    </div>
  );
}
