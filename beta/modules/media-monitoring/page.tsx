'use client';

/**
 * Media Monitoring — dashboard page.
 *
 * One coverage pool, several lenses. The pool is fed by two channels — the
 * alert/RSS feeds and the weekly Newton Media spreadsheet upload — and every
 * tab below is a view over it rather than a separate dataset.
 *
 * Tabs:
 *   overview  — summary cards, timeline, map, top outlets, top countries
 *   reports   — coverage clustered by ESABCC publication
 *   members   — coverage clustered by board member
 *   countries — coverage clustered by country
 *   articles  — searchable + filterable article list
 *   keywords  — manage the keywords driving search and alert matching
 *   sources   — registered feeds, generated alert queries, Newton upload
 *
 * Data comes from /api/media-monitoring/{analytics,articles,clusters,...}.
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

interface ReportSummary extends EsabccReport {
  press_count: number;
  press_reach: number;
  last_press_at: string | null;
}

/** One row of a clustered lens (report, board member or country). */
interface ClusterBucket {
  key: string;
  label: string;
  count: number;
  reach: number;
  countries: number;
  outlets: number;
  last_at: string | null;
  top: {
    title: string;
    url: string;
    outlet: string | null;
    reach: number;
    published_at: string | null;
  }[];
}

interface ClustersResponse {
  days: number;
  total_articles: number;
  by_discovery_source: Record<string, number>;
  reports: ClusterBucket[];
  members: ClusterBucket[];
  countries: ClusterBucket[];
}

/** A past Newton Media spreadsheet upload. */
interface MediaImport {
  id: string;
  filename: string;
  status: string;
  rows_total: number;
  rows_imported: number;
  rows_new: number;
  rows_skipped: number;
  error_message: string | null;
  created_at: string;
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

type Tab =
  | 'overview'
  | 'reports'
  | 'members'
  | 'countries'
  | 'articles'
  | 'keywords'
  | 'sources';

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
  tier: 'essential' | 'optional';
  label: string;
  languages: string[];
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

  const [clusters, setClusters] = useState<ClustersResponse | null>(null);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);

  const [imports, setImports] = useState<MediaImport[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [clusterRunning, setClusterRunning] = useState(false);

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

  const clustersAbortRef = useRef<AbortController | null>(null);
  const loadClusters = useCallback(async () => {
    clustersAbortRef.current?.abort();
    const controller = new AbortController();
    clustersAbortRef.current = controller;
    setLoadingClusters(true);
    try {
      const res = await fetch(
        `/api/media-monitoring/clusters?days=${windowDays}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setClusters(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load clusters', err);
      setErrorMessage('Failed to load clustered coverage.');
    } finally {
      if (clustersAbortRef.current === controller) setLoadingClusters(false);
    }
  }, [windowDays]);

  const importsAbortRef = useRef<AbortController | null>(null);
  const loadImports = useCallback(async () => {
    importsAbortRef.current?.abort();
    const controller = new AbortController();
    importsAbortRef.current = controller;
    try {
      const res = await fetch('/api/media-monitoring/import', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setImports(data.imports || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load import history', err);
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
    if (tab === 'members' || tab === 'countries' || tab === 'reports') {
      loadClusters();
    }
    if (tab === 'sources') {
      loadPressSources();
      loadAlertQueries();
      loadImports();
    }
  }, [
    tab,
    loadArticles,
    loadKeywords,
    loadReports,
    loadClusters,
    loadImports,
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

  async function uploadNewtonFile(file: File) {
    setUploading(true);
    setUploadMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);

      // Deliberately not using mutationHeaders(): it sets a JSON content-type,
      // which would stop the browser writing the multipart boundary.
      const headers: Record<string, string> = {};
      if (adminKey) headers['x-media-secret'] = adminKey;

      const res = await fetch('/api/media-monitoring/import', {
        method: 'POST',
        headers,
        body,
      });
      if (res.status === 401) {
        setUploadMessage(`Failed: ${UNAUTHORIZED_MESSAGE}`);
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setUploadMessage(`Failed: ${data.error || res.statusText}`);
        return;
      }
      setUploadMessage(
        `Imported ${data.rows_imported} rows (${data.rows_new} new)` +
          (data.rows_skipped ? `, ${data.rows_skipped} skipped` : ''),
      );
      loadImports();
      loadAnalytics();
      if (tab === 'reports') loadReports();
    } catch (err) {
      setUploadMessage(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setUploading(false);
      // Clear the input so re-selecting the same file fires a change event.
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

  async function triggerRecluster() {
    setClusterRunning(true);
    try {
      const res = await fetch('/api/media-monitoring/cluster?full=true', {
        method: 'POST',
        headers: mutationHeaders(),
      });
      if (res.status === 401) {
        setErrorMessage(UNAUTHORIZED_MESSAGE);
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(`Re-cluster failed: ${data.error || res.statusText}`);
        return;
      }
      setUploadMessage(
        `Re-clustered ${data.scanned} articles (${data.updated} updated).`,
      );
      loadClusters();
    } catch (err) {
      setErrorMessage(
        `Re-cluster failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setClusterRunning(false);
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

  /** Copies the draft article filters (search/country/outlet) into the applied state. */
  function applyArticleFilters(e?: React.FormEvent) {
    e?.preventDefault();
    setArticleSearch(articleSearchDraft.trim());
    setArticleCountry(articleCountryDraft.trim().toUpperCase());
    setArticleOutlet(articleOutletDraft.trim());
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
            { key: 'members', label: 'Board members' },
            { key: 'countries', label: 'Countries' },
            { key: 'articles', label: 'Press' },
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

      {/* Keyword filter chip strip (applies to overview + articles) */}
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

      {/* ─────────────── Board members / Countries ─────────────── */}
      {(tab === 'members' || tab === 'countries') && (
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <p className="text-sm text-tertiary max-w-2xl">
              {tab === 'members' ? (
                <>
                  Coverage clustered by board member. A member is attributed
                  when they are named in the headline, summary or full text.
                  Common surnames are only attributed when the article also
                  mentions the board, so an unrelated namesake is not counted.
                </>
              ) : (
                <>
                  Coverage clustered by country, taken from the outlet&apos;s
                  country where known and the Newton Media topic otherwise.
                </>
              )}
            </p>
            {clusters && (
              <p className="text-xs text-tertiary shrink-0">
                {formatNumber(clusters.total_articles)} articles in the last{' '}
                {clusters.days} days
                {Object.keys(clusters.by_discovery_source).length > 0 && (
                  <>
                    {' · '}
                    {Object.entries(clusters.by_discovery_source)
                      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                      .join(', ')}
                  </>
                )}
              </p>
            )}
          </div>

          {loadingClusters ? (
            <div className="text-center text-tertiary py-10">Loading…</div>
          ) : (
            (() => {
              const buckets =
                tab === 'members' ? clusters?.members ?? [] : clusters?.countries ?? [];
              if (buckets.length === 0) {
                return (
                  <div className="text-center text-tertiary py-10">
                    No coverage in this window yet.
                  </div>
                );
              }
              const maxReach = Math.max(...buckets.map((b) => b.reach), 1);
              return (
                <div className="bg-white border border-grey-200 rounded overflow-hidden">
                  {buckets.map((b) => {
                    const open = expandedBucket === `${tab}:${b.key}`;
                    return (
                      <div key={b.key} className="border-b border-grey-200 last:border-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBucket(open ? null : `${tab}:${b.key}`)
                          }
                          className="w-full text-left px-4 py-3 hover:bg-grey-50 flex items-center gap-4"
                        >
                          <span className="flex-1 min-w-0">
                            <span
                              className={`text-sm ${b.count > 0 ? 'font-medium text-tertiary-dark' : 'text-tertiary'}`}
                            >
                              {b.label}
                            </span>
                            {/* Reach bar, scaled to the leader in this lens. */}
                            <span className="block mt-1 h-1.5 bg-grey-100 rounded overflow-hidden">
                              <span
                                className="block h-full bg-secondary"
                                style={{
                                  width: `${Math.round((b.reach / maxReach) * 100)}%`,
                                }}
                              />
                            </span>
                          </span>
                          <span className="text-right shrink-0 w-20">
                            <span className="block text-sm font-bold text-primary">
                              {formatNumber(b.count)}
                            </span>
                            <span className="block text-[10px] text-tertiary uppercase tracking-wider">
                              articles
                            </span>
                          </span>
                          <span className="text-right shrink-0 w-24 hidden sm:block">
                            <span className="block text-sm text-tertiary-dark">
                              {formatNumber(b.reach)}
                            </span>
                            <span className="block text-[10px] text-tertiary uppercase tracking-wider">
                              reach
                            </span>
                          </span>
                          <span className="text-right shrink-0 w-24 hidden md:block text-xs text-tertiary">
                            {b.last_at ? timeAgo(b.last_at) : '—'}
                          </span>
                        </button>

                        {open && (
                          <div className="px-4 pb-4 bg-grey-50">
                            {b.top.length === 0 ? (
                              <p className="text-xs text-tertiary py-2">
                                No articles attributed yet.
                              </p>
                            ) : (
                              <ul className="space-y-2 pt-2">
                                {b.top.map((a) => (
                                  <li key={a.url} className="text-xs">
                                    <a
                                      href={a.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-secondary hover:underline"
                                    >
                                      {a.title}
                                    </a>
                                    <span className="text-tertiary">
                                      {' '}
                                      — {a.outlet ?? 'unknown outlet'}
                                      {a.published_at
                                        ? ` · ${formatDate(a.published_at)}`
                                        : ''}
                                      {a.reach > 0
                                        ? ` · ${formatNumber(a.reach)} reach`
                                        : ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <p className="text-[10px] text-tertiary mt-2">
                              {b.outlets} outlet{b.outlets === 1 ? '' : 's'} ·{' '}
                              {b.countries} countr{b.countries === 1 ? 'y' : 'ies'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ─────────────── Reports ─────────────── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-tertiary max-w-2xl">
              Coverage clustered by ESABCC report, across the whole pool —
              alert and RSS feeds plus the Newton Media import. An article is
              attributed via the report&apos;s title and match terms. Click a
              card to open the full timeline.
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
                        Articles
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-accent-violet">
                        {formatNumber(r.press_reach)}
                      </p>
                      <p className="text-[10px] text-tertiary uppercase tracking-wider">
                        Total reach
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-tertiary">
                    Last coverage:{' '}
                    {r.last_press_at ? timeAgo(r.last_press_at) : '—'}
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

          <div className="bg-white border border-grey-200 rounded p-4">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
              <h2 className="text-sm font-semibold text-primary">
                Newton Media weekly upload
              </h2>
              <button
                type="button"
                onClick={triggerRecluster}
                disabled={clusterRunning}
                className="text-xs border border-grey-200 rounded px-3 py-1.5 hover:bg-grey-50 disabled:opacity-50"
              >
                {clusterRunning ? 'Re-clustering…' : 'Re-cluster pool'}
              </button>
            </div>
            <p className="text-xs text-tertiary leading-relaxed mb-3">
              Upload the weekly Newton Media .xlsx export. Rows join the same
              pool as the feeds and are clustered into reports, board members
              and countries on the way in. Re-uploading an overlapping export
              updates those rows rather than duplicating them, so the weekly
              overlap is safe.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={uploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadNewtonFile(file);
                }}
                className="text-sm"
              />
              {uploading && (
                <span className="text-xs text-tertiary">Processing…</span>
              )}
            </div>
            {uploadMessage && (
              <p className="text-xs text-accent-violet mt-2">{uploadMessage}</p>
            )}

            {imports.length > 0 && (
              <div className="mt-3 border-t border-grey-200 pt-3">
                <p className="text-[10px] uppercase tracking-wider text-tertiary mb-1">
                  Recent imports
                </p>
                <ul className="space-y-1">
                  {imports.slice(0, 5).map((imp) => (
                    <li key={imp.id} className="text-xs text-tertiary">
                      <span
                        className={
                          imp.status === 'error' ? 'text-red-700' : 'text-tertiary-dark'
                        }
                      >
                        {imp.filename}
                      </span>{' '}
                      · {formatDate(imp.created_at)} ·{' '}
                      {imp.status === 'error'
                        ? `failed: ${imp.error_message ?? 'unknown error'}`
                        : `${imp.rows_imported} rows, ${imp.rows_new} new`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                . Set delivery to <em>RSS feed</em> and language to{' '}
                <em>Any</em> — the queries mix languages on purpose — then copy
                the feed URL back into step 2. These regenerate whenever you
                change your keywords.
              </p>

              {(['essential', 'optional'] as const).map((tier) => {
                const group = alertQueries.filter((q) => q.tier === tier);
                if (group.length === 0) return null;
                return (
                  <div key={tier} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-tertiary-dark mb-1">
                      {tier === 'essential'
                        ? `Start here — ${group.length} alert${group.length === 1 ? '' : 's'}`
                        : `Optional — ${group.length} more`}
                    </p>
                    <p className="text-xs text-tertiary mb-2">
                      {tier === 'essential'
                        ? 'The ESABCC’s own names, its reports and the policy terms. This is the set worth creating.'
                        : 'Individual board-member name-watching. Every one of these keywords is already searched on Google News automatically — an alert just adds a second, more reliable channel.'}
                    </p>
                    <div className="space-y-2">
                      {group.map((q) => (
                        <div
                          key={q.query}
                          className="border border-grey-200 rounded px-3 py-2"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-tertiary-dark">
                              {q.label}
                            </span>
                            <span className="text-[10px] text-tertiary">
                              {q.keywords.length} terms ·{' '}
                              {q.languages.join(', ').toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyQuery(q.query)}
                              className="text-xs border border-grey-200 rounded px-2 py-0.5 hover:bg-grey-50 ml-auto shrink-0"
                            >
                              {copiedQuery === q.query ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <code className="text-xs block break-all text-tertiary">
                            {q.query}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
              on keyword, feed source, import, and refresh actions.
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
