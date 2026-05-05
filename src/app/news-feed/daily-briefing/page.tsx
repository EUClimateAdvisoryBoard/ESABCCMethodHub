'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface TopStory {
  title: string;
  oneLiner: string;
  source: string;
  link: string;
}

interface Signal {
  category: string;
  text: string;
}

interface Factsheet {
  date: string;
  generatedAt: string;
  executiveSummary: string;
  topStories: TopStory[];
  signals: Signal[];
  stats: {
    feedsQueried: number;
    articlesScanned: number;
    articlesUsed: number;
    euClimateRelevant?: number;
  };
  llmProvider?: string;
  llmError?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Clean executive summary text — strip any leaked JSON wrapper from LLM output. */
function cleanSummary(text: string): string {
  let s = text.trim();
  // Strip JSON wrapper if the LLM returned raw JSON as the summary
  if (s.startsWith('{')) {
    const m = s.match(/"executiveSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
    // Fallback: strip leading JSON noise
    s = s.replace(/^\s*\{?\s*"executiveSummary"\s*:\s*"?/, '').replace(/"?\s*,?\s*"topStories"[\s\S]*$/, '').replace(/^\s*\{|\}\s*$/g, '').trim();
  }
  return s;
}

function formatDateLong(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const SIGNAL_STYLE: Record<string, { dot: string; text: string }> = {
  Energy:        { dot: 'bg-amber-500',   text: 'text-amber-800' },
  Finance:       { dot: 'bg-purple-500',  text: 'text-purple-800' },
  Science:       { dot: 'bg-emerald-500', text: 'text-emerald-800' },
  International: { dot: 'bg-sky-500',     text: 'text-sky-800' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DailyBriefingPage() {
  const [data, setData] = useState<Factsheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/daily-summary/factsheet')
      .then(res => {
        if (!res.ok) throw new Error('No briefing available yet');
        return res.json();
      })
      .then((d: Factsheet) => {
        setData(d);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] print:bg-white">
      {/* ── Compact top bar — sticky on phones so the back-link is always
          reachable without scrolling to the top of a long briefing. */}
      <header className="sticky top-0 z-30 bg-[#004B7F] text-white print:hidden pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <Link
            href="/news-feed"
            className="inline-flex items-center gap-1.5 text-[13px] sm:text-xs text-white/85 hover:text-white active:text-white transition min-h-[40px] px-1 -mx-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            News Feed
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium">
            ESABCC MethodHub
          </span>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-7 h-7 border-2 border-[#007B6C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#54728C]">Generating factsheet...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-amber-800 font-medium">No briefing available yet</p>
            <p className="text-xs text-amber-700 mt-1">
              The daily factsheet is generated automatically every morning.
            </p>
          </div>
        )}

        {/* ── Factsheet ────────────────────────────────────────── */}
        {data && !loading && (
          <div className="space-y-5">

            {/* ── Masthead ─────────────────────────────────────── */}
            <div className="border-b-2 border-[#004B7F] pb-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-[#007B6C] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#2E3E4C] leading-tight">
                    EU Climate Policy Factsheet
                  </h1>
                  <p className="text-xs text-[#54728C]">
                    Daily intelligence brief
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-[#808285]">
                <span className="font-semibold text-[#2E3E4C]">
                  {formatDateLong(data.date)}
                </span>
                <span className="text-[#DCDDDE]">|</span>
                <span>{data.stats.feedsQueried} sources</span>
                <span className="text-[#DCDDDE]">|</span>
                <span>{data.stats.articlesScanned} articles scanned</span>
                <span className="text-[#DCDDDE]">|</span>
                <span>{data.stats.euClimateRelevant ?? data.stats.articlesUsed} EU climate-relevant</span>
              </div>
            </div>

            {/* ── Executive Summary ────────────────────────────── */}
            {data.executiveSummary && (
              <section>
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#004B7F] mb-2">
                  Executive Summary
                </h2>
                <div className="bg-[#EEF6F5] border-l-4 border-[#007B6C] pl-4 pr-4 py-3 rounded-r-md">
                  <p className="text-[15px] leading-relaxed text-[#2E3E4C]">
                    {cleanSummary(data.executiveSummary)}
                  </p>
                  {data.topStories.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-[#007B6C]/15">
                      <span className="text-[11px] font-semibold text-[#54728C]">Related:</span>
                      {data.topStories.map((story, idx) =>
                        story.link ? (
                          <a
                            key={idx}
                            href={story.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#007B6C] hover:text-[#00665A] hover:underline transition-colors"
                          >
                            [{idx + 1}] {story.title}
                          </a>
                        ) : (
                          <span key={idx} className="text-[11px] text-[#54728C]">
                            [{idx + 1}] {story.title}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
                {data.llmProvider && (
                  <p className="text-[10px] text-[#BCBEC0] mt-1 text-right">
                    AI-generated via {data.llmProvider}
                  </p>
                )}
              </section>
            )}

            {/* ── Top Stories ──────────────────────────────────── */}
            {data.topStories.length > 0 && (
              <section>
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#004B7F] mb-2">
                  Top Stories
                </h2>
                <div className="space-y-2.5">
                  {data.topStories.map((story, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 group"
                    >
                      <span className="text-[11px] font-bold text-white bg-[#004B7F] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {story.link ? (
                          <a
                            href={story.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-semibold text-[#2E3E4C] hover:text-[#007B6C] transition-colors leading-snug block"
                          >
                            {story.title}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline ml-1 opacity-0 group-hover:opacity-50 transition-opacity -translate-y-px">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-[13px] font-semibold text-[#2E3E4C] leading-snug block">
                            {story.title}
                          </span>
                        )}
                        <p className="text-[12px] text-[#54728C] mt-0.5 leading-relaxed">
                          {stripHtml(story.oneLiner)}
                        </p>
                        {story.source && (
                          <span className="text-[10px] text-[#808285] mt-0.5 block">
                            {story.source}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Quick Signals ────────────────────────────────── */}
            {data.signals.length > 0 && (
              <section>
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#004B7F] mb-2">
                  Signals
                </h2>
                <div className="grid gap-1.5">
                  {data.signals.map((signal, idx) => {
                    const style = SIGNAL_STYLE[signal.category] || { dot: 'bg-slate-400', text: 'text-slate-700' };
                    return (
                      <div key={idx} className="flex items-start gap-2 text-[12px]">
                        <span className={`w-2 h-2 rounded-full ${style.dot} mt-1.5 flex-shrink-0`} />
                        <span className="text-[#2E3E4C]">
                          <span className={`font-semibold ${style.text}`}>{signal.category}:</span>{' '}
                          {signal.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── LLM warning (no API key) ─────────────────────── */}
            {data.llmError === 'no-api-key' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                AI summarisation unavailable — no LLM API key configured. Showing raw article data.
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────── */}
            <footer className="border-t border-[#E6E7E8] pt-3 mt-2">
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <Link
                  href="/news-feed"
                  className="inline-flex items-center gap-1 text-[#007B6C] hover:text-[#00665A] font-medium transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                  Full News Feed
                </Link>
              </div>
              <p className="text-center text-[10px] text-[#BCBEC0] mt-2">
                Auto-generated from {data.stats.feedsQueried} RSS feeds — ESABCC Secretariat MethodHub
              </p>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
