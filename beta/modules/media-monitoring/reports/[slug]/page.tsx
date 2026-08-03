'use client';

/**
 * Per-ESABCC-report monitoring page.
 *
 * Shows all coverage attributed to a
 * single ESABCC report. Board members can open this page directly from the
 * Reports tab on the main dashboard and share the URL with colleagues.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chart, registerables } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { EsabccReport } from '@/data/esabcc-reports';
import { formatNumber, formatDate } from '@/lib/media-format';

Chart.register(...registerables);

const TIMELINE_CHART_OPTIONS: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true },
  },
  plugins: { legend: { position: 'bottom' } },
};

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
}

interface ReportDetailResponse {
  report: EsabccReport;
  articles: Article[];
  timeline: { date: string; press: number }[];
  summary: {
    press_count: number;
    press_reach: number;
  };
}

export default function ReportDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [data, setData] = useState<ReportDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const res = await fetch(`/api/media-monitoring/reports/${slug}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error('Failed to load report detail', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, retryCount]);

  const timelineChart = useMemo(() => {
    if (!data || data.timeline.length === 0) return null;
    return {
      labels: data.timeline.map((t) => t.date),
      datasets: [
        {
          label: 'Articles',
          data: data.timeline.map((t) => t.press),
          backgroundColor: '#004B7FCC',
        },
      ],
    };
  }, [data]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark">Report not found</h1>
        <p className="text-sm text-tertiary mt-2">
          The report slug &quot;{slug}&quot; isn&apos;t in the ESABCC catalogue.
        </p>
        <Link
          href="/media-monitoring"
          className="inline-block mt-4 text-sm text-primary hover:underline"
        >
          Back to media monitoring
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark">Couldn&apos;t load this report</h1>
        <p className="text-sm text-tertiary mt-2">{error}</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-sm bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark font-medium"
          >
            Retry
          </button>
          <Link
            href="/media-monitoring"
            className="text-sm text-primary hover:underline"
          >
            Back to media monitoring
          </Link>
        </div>
      </div>
    );
  }

  const report = data?.report;

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link
        href="/media-monitoring"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" />
        </svg>
        Back to media monitoring
      </Link>

      {loading && !data ? (
        <div className="text-center text-tertiary py-20">Loading report…</div>
      ) : report ? (
        <>
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-tertiary font-medium">
              {report.category.replace(/-/g, ' ')} · Published {formatDate(report.published_on)}
            </p>
            <h1 className="text-2xl font-bold text-tertiary-dark mt-1">{report.title}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <a
                href={report.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open on climate-advisory-board.europa.eu →
              </a>
              {report.pdf_filename && (
                <a
                  href={`/esabcc-reports/${report.pdf_filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-secondary hover:underline"
                >
                  PDF archive
                </a>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
              <p className="text-2xl font-bold text-primary">
                {formatNumber(data?.summary.press_count || 0)}
              </p>
              <p className="text-xs text-tertiary mt-1">Articles</p>
            </div>
            <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
              <p className="text-2xl font-bold text-accent-orange">
                {formatNumber(data?.summary.press_reach || 0)}
              </p>
              <p className="text-xs text-tertiary mt-1">Total reach</p>
            </div>
          </div>

          {/* Timeline */}
          {timelineChart && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-6 mb-6">
              <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">
                Coverage timeline
              </h2>
              <div style={{ height: 260 }}>
                <Bar data={timelineChart} options={TIMELINE_CHART_OPTIONS} />
              </div>
            </div>
          )}

          {/* Article list */}
          {(
            <div className="mb-8">
              <h2 className="font-bold text-tertiary-dark text-sm mb-3 uppercase tracking-wider">
                Articles ({data?.articles.length ?? 0})
              </h2>
              {data && data.articles.length > 0 ? (
                <div className="space-y-3">
                  {data.articles.map((a) => (
                    <article
                      key={a.id}
                      className="bg-white border border-grey-200 rounded p-4 hover:border-primary transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-semibold text-tertiary-dark hover:text-primary block"
                          >
                            {a.title}
                          </a>
                          <p className="text-sm text-tertiary mt-1 line-clamp-2">{a.summary}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-tertiary flex-wrap">
                            <span className="font-medium text-secondary">{a.source_name}</span>
                            {a.country && <span>· {a.country}</span>}
                            <span>· {formatDate(a.published_at)}</span>
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
              ) : (
                <p className="text-sm text-tertiary py-6 text-center">
                  No coverage attributed to this report yet.
                </p>
              )}
            </div>
          )}

        </>
      ) : null}
    </div>
  );
}
