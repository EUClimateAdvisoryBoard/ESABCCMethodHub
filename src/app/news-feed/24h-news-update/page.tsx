'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────────────────────

interface Highlight {
  headline: string;
  summary: string;
  tag: string;
  color: string;
}

interface SummaryItem {
  title: string;
  link: string;
  source: string;
  description: string;
  published: string;
  score: number;
  isMex?: boolean;
}

interface Section {
  id: string;
  title: string;
  items: SummaryItem[];
}

interface DailySummary {
  date: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  highlights?: Highlight[];
  sections: Section[];
  stats: {
    totalArticlesScanned: number;
    articlesLast24h: number;
    afterDedup: number;
    feedsQueried: number;
    mexStoriesIngested?: number;
    mexShareInBriefing?: number;
    euClimateRelevant?: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8220;|&ldquo;/g, '\u201C')
    .replace(/&#8221;|&rdquo;/g, '\u201D')
    .replace(/&#0?38;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const SECTION_STYLE: Record<string, { accent: string; bg: string; hoverBorder: string; hoverText: string; icon: string }> = {
  eu_policy:    { accent: 'bg-[#007B6C]', bg: 'bg-[#007B6C]/5',  hoverBorder: 'hover:border-[#007B6C]/40', hoverText: 'hover:text-[#007B6C]', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  energy:       { accent: 'bg-[#E87722]', bg: 'bg-[#E87722]/5',  hoverBorder: 'hover:border-[#E87722]/40', hoverText: 'hover:text-[#E87722]', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  climate:      { accent: 'bg-[#2E8B57]', bg: 'bg-[#2E8B57]/5',  hoverBorder: 'hover:border-[#2E8B57]/40', hoverText: 'hover:text-[#2E8B57]', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 018 8c0 2-1 4-3 5.5S14 20 12 20s-3-1-5-2.5S4 14 4 12a8 8 0 018-8z' },
  finance:      { accent: 'bg-[#7C3AED]', bg: 'bg-[#7C3AED]/5',  hoverBorder: 'hover:border-[#7C3AED]/40', hoverText: 'hover:text-[#7C3AED]', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  eu_general:   { accent: 'bg-[#003399]', bg: 'bg-[#003399]/5',  hoverBorder: 'hover:border-[#003399]/30', hoverText: 'hover:text-[#003399]', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  other_world:  { accent: 'bg-[#6B7280]', bg: 'bg-[#6B7280]/5',  hoverBorder: 'hover:border-[#6B7280]/30', hoverText: 'hover:text-[#6B7280]', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function DailyNewsUpdatePage() {
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/data/daily-summary.json')
      .then(res => {
        if (!res.ok) throw new Error('No briefing available yet');
        return res.json();
      })
      .then((d: DailySummary) => {
        setData(d);
        setError('');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const climateEnergySections = data?.sections.filter(s =>
    ['eu_policy', 'energy', 'climate', 'finance'].includes(s.id)
  ) ?? [];
  const beyondClimateSections = data?.sections.filter(s =>
    ['eu_general', 'other_world'].includes(s.id)
  ) ?? [];

  const totalClimateEnergy = climateEnergySections.reduce((n: number, s: Section) => n + s.items.length, 0);
  const totalBeyond = beyondClimateSections.reduce((n: number, s: Section) => n + s.items.length, 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB] print:bg-white">
      {/* ── Top navigation bar ─────────────────────────────────── */}
      <header className="bg-[#004B7F] text-white print:hidden sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <Link
            href="/news-feed"
            className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Secretariat News
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium">
            ESABCC MethodHub
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* ── Masthead ──────────────────────────────────────────── */}
        <div className="border-b-2 border-[#004B7F] pb-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#007B6C] to-[#004B7F] flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#2E3E4C] leading-tight">
                24h EU News Update
              </h1>
              <p className="text-sm text-[#54728C] mt-0.5">
                Climate, energy & major European developments
              </p>
            </div>
          </div>
          {data && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#808285]">
              <span className="font-semibold text-[#2E3E4C]">{formatDateLong(data.date)}</span>
              <span className="text-[#DCDDDE]">|</span>
              <span>{totalClimateEnergy} climate & energy stories</span>
              <span className="text-[#DCDDDE]">|</span>
              <span>{totalBeyond} general stories</span>
              <span className="text-[#DCDDDE]">|</span>
              <span>{data.stats.feedsQueried} feeds scanned</span>
            </div>
          )}
        </div>

        {/* ── Loading / Error states ────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#007B6C] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-[#54728C]">Loading briefing...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-sm text-[#808285]">No briefing available yet. Check back later.</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Editorial Highlights ────────────────────────── */}
            {data.highlights && data.highlights.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004B7F" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#004B7F]">
                    Key Developments
                  </h2>
                </div>
                <div className="space-y-3">
                  {data.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg border border-[#E6E7E8] overflow-hidden transition hover:shadow-md"
                    >
                      <div className="flex">
                        <div className="w-1 flex-shrink-0" style={{ backgroundColor: h.color }} />
                        <div className="p-4 sm:p-5 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{
                                color: h.color,
                                backgroundColor: h.color + '15',
                              }}
                            >
                              {h.tag}
                            </span>
                          </div>
                          <h3 className="text-[15px] sm:text-base font-bold text-[#2E3E4C] leading-snug mb-2">
                            {h.headline}
                          </h3>
                          <p className="text-[13px] text-[#54728C] leading-relaxed">
                            {h.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Section divider ─────────────────────────────── */}
            {data.highlights && data.highlights.length > 0 && totalClimateEnergy > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[#E6E7E8]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#808285]">Full Coverage</span>
                <div className="flex-1 h-px bg-[#E6E7E8]" />
              </div>
            )}

            {/* ── Climate & Energy Sections ────────────────────── */}
            {climateEnergySections.map(section => {
              if (section.items.length === 0) return null;
              const style = SECTION_STYLE[section.id] || SECTION_STYLE.climate;
              return (
                <section key={section.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1.5 h-6 rounded-full ${style.accent}`} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#004B7F]">
                      {section.title}
                    </h2>
                    <span className="text-[10px] text-[#BCBEC0] ml-auto">{section.items.length} {section.items.length === 1 ? 'story' : 'stories'}</span>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((item, i) => (
                      <article key={i} className={`bg-white rounded-lg border border-[#E6E7E8] p-4 ${style.hoverBorder} transition`}>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-[#808285]">{item.source}</span>
                          {item.isMex && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">MEX</span>
                          )}
                          <span className="text-[10px] text-[#BCBEC0] ml-auto">{timeAgo(item.published)}</span>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[15px] sm:text-base font-semibold text-[#2E3E4C] ${style.hoverText} transition-colors leading-snug block`}
                        >
                          {stripHtml(item.title)}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline ml-1 opacity-30">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </a>
                        <p className="text-[13px] text-[#54728C] mt-1.5 leading-relaxed">
                          {stripHtml(item.description)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── Beyond Climate divider ──────────────────────── */}
            {totalBeyond > 0 && (
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[#E6E7E8]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#808285]">Beyond Climate & Energy</span>
                <div className="flex-1 h-px bg-[#E6E7E8]" />
              </div>
            )}

            {/* ── Non-Climate Sections ─────────────────────────── */}
            {beyondClimateSections.map(section => {
              if (section.items.length === 0) return null;
              const style = SECTION_STYLE[section.id] || SECTION_STYLE.eu_general;
              return (
                <section key={section.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1.5 h-6 rounded-full ${style.accent}`} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#004B7F]">
                      {section.title}
                    </h2>
                    <span className="text-[10px] text-[#BCBEC0] ml-auto">{section.items.length} {section.items.length === 1 ? 'story' : 'stories'}</span>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((item, i) => (
                      <article key={i} className={`bg-white rounded-lg border border-[#E6E7E8] p-4 ${style.hoverBorder} transition`}>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-[#808285]">{item.source}</span>
                          <span className="text-[10px] text-[#BCBEC0] ml-auto">{timeAgo(item.published)}</span>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[15px] sm:text-base font-semibold text-[#2E3E4C] ${style.hoverText} transition-colors leading-snug block`}
                        >
                          {stripHtml(item.title)}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline ml-1 opacity-30">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </a>
                        <p className="text-[13px] text-[#54728C] mt-1.5 leading-relaxed">
                          {stripHtml(item.description)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── Empty state ──────────────────────────────────── */}
            {totalClimateEnergy === 0 && totalBeyond === 0 && (!data.highlights || data.highlights.length === 0) && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-[#F0F1F2] flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808285" strokeWidth="2">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-[#808285]">No stories matched the EU climate & energy filter today.</p>
                <p className="text-xs text-[#BCBEC0] mt-1">This can happen on weekends or holidays. The next update runs automatically.</p>
              </div>
            )}
          </>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="border-t border-[#E6E7E8] pt-4 mt-4 print:mt-2">
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
            <span className="text-[#DCDDDE]">|</span>
            <Link
              href="/news-feed/daily-briefing"
              className="text-[#007B6C] hover:text-[#00665A] font-medium transition"
            >
              AI Daily Briefing
            </Link>
          </div>
          <p className="text-center text-[10px] text-[#BCBEC0] mt-3 leading-relaxed">
            Auto-updated 4x daily via RSS from EEA, European Commission, European Parliament,
            Carbon Brief, Euractiv, Climate Home News, The Guardian, BBC, Deutsche Welle, IPCC, UNFCCC & more.
            <br />
            Curated by ESABCC Secretariat MethodHub.
          </p>
        </footer>
      </main>
    </div>
  );
}
