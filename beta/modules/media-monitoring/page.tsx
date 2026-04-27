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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { EsabccReport } from '@/data/esabcc-reports';

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

type Tab = 'overview' | 'reports' | 'articles' | 'social' | 'keywords';

const PALETTE = ['#004B7F', '#007B6C', '#E8712B', '#6667AB', '#B83230', '#00928F', '#A530B8', '#FF9933'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

function timeAgo(s: string | null): string {
  if (!s) return '—';
  const diffMs = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MediaMonitoringPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [windowDays, setWindowDays] = useState(90);
  const [keywordFilter, setKeywordFilter] = useState<string>('');

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCountry, setArticleCountry] = useState('');
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
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialSearch, setSocialSearch] = useState('');
  const [socialBoardOnly, setSocialBoardOnly] = useState(false);
  const [socialReportFilter, setSocialReportFilter] = useState('');
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

  const [fetchRunning, setFetchRunning] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const qs = new URLSearchParams({ days: String(windowDays) });
      if (keywordFilter) qs.set('keyword', keywordFilter);
      const res = await fetch(`/api/media-monitoring/analytics?${qs.toString()}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [windowDays, keywordFilter]);

  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const qs = new URLSearchParams({ limit: '100', sort: articleSort });
      if (keywordFilter) qs.set('keyword', keywordFilter);
      if (articleCountry) qs.set('country', articleCountry);
      if (articleOutlet) qs.set('outlet', articleOutlet);
      if (articleTier) qs.set('tier', articleTier);
      if (articleKnownOnly) qs.set('known_only', '1');
      const res = await fetch(`/api/media-monitoring/articles?${qs.toString()}`);
      const data = await res.json();
      setArticles(data.items || []);
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoadingArticles(false);
    }
  }, [keywordFilter, articleCountry, articleOutlet, articleTier, articleSort, articleKnownOnly]);

  const loadKeywords = useCallback(async () => {
    setLoadingKeywords(true);
    try {
      const res = await fetch('/api/media-monitoring/keywords');
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (err) {
      console.error('Failed to load keywords', err);
    } finally {
      setLoadingKeywords(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const qs = new URLSearchParams({ days: String(windowDays) });
      const res = await fetch(`/api/media-monitoring/reports?${qs.toString()}`);
      const data = await res.json();
      setReportSummaries(data.reports || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoadingReports(false);
    }
  }, [windowDays]);

  const loadSocial = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const qs = new URLSearchParams({
        limit: '100',
        sort: socialSort,
        platform: 'linkedin',
      });
      if (socialReportFilter) qs.set('report', socialReportFilter);
      if (socialAuthorFilter) qs.set('author', socialAuthorFilter);
      if (socialBoardOnly) qs.set('board_only', '1');
      if (keywordFilter) qs.set('keyword', keywordFilter);
      const res = await fetch(`/api/media-monitoring/social?${qs.toString()}`);
      const data = await res.json();
      setSocialPosts(data.items || []);
    } catch (err) {
      console.error('Failed to load social posts', err);
    } finally {
      setLoadingSocial(false);
    }
  }, [socialSort, socialReportFilter, socialAuthorFilter, socialBoardOnly, keywordFilter]);

  const loadSocialSources = useCallback(async () => {
    try {
      const res = await fetch('/api/media-monitoring/social/sources');
      const data = await res.json();
      setSocialSources(data.sources || []);
    } catch (err) {
      console.error('Failed to load social sources', err);
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
  }, [tab, loadArticles, loadKeywords, loadReports, loadSocial, loadSocialSources]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function triggerFetch() {
    setFetchRunning(true);
    setFetchMessage(null);
    try {
      const res = await fetch('/api/media-monitoring/fetch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFetchMessage(
          `Fetched ${data.articles_found} articles (${data.articles_new} new) across ${data.keywords_count} keywords`,
        );
        loadAnalytics();
        if (tab === 'articles') loadArticles();
      } else {
        setFetchMessage(`Fetch failed: ${data.error || 'unknown error'}`);
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
    const res = await fetch('/api/media-monitoring/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: newKeyword.trim(),
        label: newLabel.trim() || null,
        category: newCategory,
        language: newLanguage,
      }),
    });
    if (res.ok) {
      setNewKeyword('');
      setNewLabel('');
      loadKeywords();
    }
  }

  async function deleteKeyword(id: string) {
    if (!confirm('Delete this keyword? Existing articles keep their matches.')) return;
    await fetch(`/api/media-monitoring/keywords?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    loadKeywords();
  }

  async function toggleKeyword(k: Keyword) {
    await fetch('/api/media-monitoring/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: k.id, is_active: !k.is_active }),
    });
    loadKeywords();
  }

  async function submitManualPost(e: React.FormEvent) {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    setManualSubmitting(true);
    setManualMessage(null);
    try {
      const res = await fetch('/api/media-monitoring/social/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: manualUrl.trim(),
          content: manualContent.trim() || undefined,
          author_name: manualAuthor.trim() || undefined,
          posted_at: manualPosted.trim() || undefined,
        }),
      });
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
      });
      const data = await res.json();
      if (data.success) {
        setSocialFetchMessage(
          `Fetched ${data.posts_found} posts (${data.posts_new} new) across ${data.sources_count} sources`,
        );
        loadSocial();
        loadReports();
      } else {
        setSocialFetchMessage(`Social fetch failed: ${data.error || 'unknown error'}`);
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
    await fetch('/api/media-monitoring/social/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
    loadSocialSources();
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
      <div className="flex gap-1 mb-6 border-b border-grey-200 overflow-x-auto">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'reports', label: 'Reports' },
            { key: 'articles', label: 'Press' },
            { key: 'social', label: 'Social Media' },
            { key: 'keywords', label: 'Keywords' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
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
      {analytics && analytics.byKeyword.length > 0 && tab !== 'keywords' && tab !== 'reports' && (
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
                <Line
                  data={timelineData}
                  options={{
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
                  }}
                />
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
                  <Bar
                    data={topOutletsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                    }}
                  />
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
                  <Bar
                    data={topCountriesData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                    }}
                  />
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
                  <Bar
                    data={keywordFreqData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                    }}
                  />
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
                  <Doughnut
                    data={tierData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
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
                  <Doughnut
                    data={languageData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
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
          <div className="bg-white border border-grey-200 rounded p-4 flex flex-wrap gap-3 items-center">
            <input
              type="text"
              value={articleSearch}
              onChange={(e) => setArticleSearch(e.target.value)}
              placeholder="Search title, summary, outlet…"
              className="flex-1 min-w-[200px] text-sm border border-grey-200 rounded px-3 py-2"
            />
            <input
              type="text"
              value={articleCountry}
              onChange={(e) => setArticleCountry(e.target.value.toUpperCase())}
              placeholder="Country (ISO, e.g. DE)"
              maxLength={2}
              className="text-sm border border-grey-200 rounded px-3 py-2 w-40"
            />
            <input
              type="text"
              value={articleOutlet}
              onChange={(e) => setArticleOutlet(e.target.value)}
              placeholder="Outlet domain (e.g. politico.eu)"
              className="text-sm border border-grey-200 rounded px-3 py-2 w-60"
            />
            <select
              value={articleTier}
              onChange={(e) => setArticleTier(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Outlet tier"
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
              onClick={loadArticles}
              className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium"
            >
              Apply
            </button>
          </div>

          {loadingArticles ? (
            <div className="text-center text-tertiary py-10">Loading articles…</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center text-tertiary py-10">
              No articles yet. Click &quot;Refresh feeds&quot; to fetch the latest coverage.
            </div>
          ) : (
            <div className="space-y-3">
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
          <div className="bg-white border border-grey-200 rounded p-4 flex flex-wrap gap-3 items-center">
            <input
              type="text"
              value={socialSearch}
              onChange={(e) => setSocialSearch(e.target.value)}
              placeholder="Search post content or author…"
              className="flex-1 min-w-[200px] text-sm border border-grey-200 rounded px-3 py-2"
            />
            <input
              type="text"
              value={socialAuthorFilter}
              onChange={(e) => setSocialAuthorFilter(e.target.value)}
              placeholder="Author handle"
              className="text-sm border border-grey-200 rounded px-3 py-2 w-48"
            />
            <select
              value={socialReportFilter}
              onChange={(e) => setSocialReportFilter(e.target.value)}
              className="text-sm border border-grey-200 rounded px-3 py-2"
              title="Filter by report cluster"
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
              onClick={loadSocial}
              className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium"
            >
              Apply
            </button>
          </div>

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
                  site (<code>{typeof window !== 'undefined' ? window.location.origin : ''}</code>).
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
