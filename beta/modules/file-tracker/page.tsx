'use client';

/**
 * File Tracker — beta module.
 * ---------------------------
 * One screen per climate-policy "file" (dossier): for LULUCF, the EU ETS, the
 * 2040 target, the Effort Sharing Regulation and ~18 other acts it shows the
 * recent news in reverse-chronological order with short summaries, so a reader
 * can open a file and immediately see "there is this discussion now".
 *
 * Data: `/api/file-tracker` merges a committed curated seed
 * (`public/data/file-tracker-seed.json`) with fresh items pulled daily from
 * the EU institutional RSS feeds (Commission, Council, EEA, EUR-Lex). The page
 * falls back to the seed snapshot if the API is unreachable.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import {
  POLICY_FILES,
  POLICY_FILES_BY_ID,
  FILE_SECTORS,
  type FileNewsItem,
  type FileSector,
  type FileStage,
} from '@/lib/policy-files';

interface ApiFile {
  id: string;
  last_update: string | null;
  items: FileNewsItem[];
}

interface ApiResponse {
  generated_at: string;
  live_items: number;
  seed_items: number;
  files: ApiFile[];
  sources: string[];
}

const KIND_STYLE: Record<FileNewsItem['kind'], { dot: string; label: string }> = {
  proposal: { dot: '#7C3AED', label: 'Proposal' },
  vote: { dot: '#00928F', label: 'Vote / adoption' },
  consultation: { dot: '#2563EB', label: 'Consultation' },
  milestone: { dot: '#D97706', label: 'Milestone' },
  publication: { dot: '#0891B2', label: 'Publication' },
  development: { dot: '#64748B', label: 'Development' },
};

const STAGE_STYLE: Record<FileStage, string> = {
  'In force': 'bg-[#00928F]/10 text-[#007a77] border-[#00928F]/30',
  'Under revision': 'bg-amber-50 text-amber-700 border-amber-200',
  Proposed: 'bg-violet-50 text-violet-700 border-violet-200',
  Implementation: 'bg-blue-50 text-blue-700 border-blue-200',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relTime(iso: string | null): string {
  if (!iso) return 'no items yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} d ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}

export default function FileTrackerPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [sector, setSector] = useState<FileSector | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load(seedOnly = false) {
    try {
      const res = await fetch(`/api/file-tracker${seedOnly ? '?seed_only=1' : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      // Fallback: load the committed seed snapshot directly.
      try {
        const res = await fetch('/data/file-tracker-seed.json', { cache: 'no-store' });
        const seed = (await res.json()) as { items: FileNewsItem[] };
        const byFile = new Map<string, FileNewsItem[]>();
        for (const it of seed.items) {
          const arr = byFile.get(it.fileId) ?? [];
          arr.push(it);
          byFile.set(it.fileId, arr);
        }
        setData({
          generated_at: new Date().toISOString(),
          live_items: 0,
          seed_items: seed.items.length,
          files: POLICY_FILES.map((f) => {
            const items = (byFile.get(f.id) ?? []).sort((a, b) => b.date.localeCompare(a.date));
            return { id: f.id, last_update: items[0]?.date ?? null, items };
          }),
          sources: ['curated snapshot'],
        });
        setError('Live feeds unavailable — showing the committed snapshot.');
      } catch {
        setError('Could not load the file tracker.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filesById = useMemo(() => {
    const m = new Map<string, ApiFile>();
    for (const f of data?.files ?? []) m.set(f.id, f);
    return m;
  }, [data]);

  // Files passing the sector + search filters, ordered by most recent activity.
  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POLICY_FILES.filter((f) => {
      if (sector !== 'All' && f.sector !== sector) return false;
      if (!q) return true;
      const apiFile = filesById.get(f.id);
      const inMeta = `${f.name} ${f.shortCode} ${f.summary} ${f.celex ?? ''}`.toLowerCase().includes(q);
      const inNews = apiFile?.items.some((i) =>
        `${i.title} ${i.summary}`.toLowerCase().includes(q),
      );
      return inMeta || inNews;
    }).sort((a, b) => {
      const ua = filesById.get(a.id)?.last_update ?? '';
      const ub = filesById.get(b.id)?.last_update ?? '';
      return ub.localeCompare(ua);
    });
  }, [sector, query, filesById]);

  // Default selection: the most recently active visible file.
  useEffect(() => {
    if (!data) return;
    if (selectedId && visibleFiles.some((f) => f.id === selectedId)) return;
    setSelectedId(visibleFiles[0]?.id ?? null);
  }, [data, visibleFiles, selectedId]);

  const selected = selectedId ? POLICY_FILES_BY_ID[selectedId] : null;
  const selectedItems = selectedId ? filesById.get(selectedId)?.items ?? [] : [];
  const filteredSelectedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectedItems;
    return selectedItems.filter((i) => `${i.title} ${i.summary}`.toLowerCase().includes(q));
  }, [selectedItems, query]);

  const totalItems = useMemo(
    () => (data?.files ?? []).reduce((n, f) => n + f.items.length, 0),
    [data],
  );

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title="File Tracker"
        subtitle={
          <>
            Track every relevant EU climate-policy file in one place. Pick a dossier — LULUCF, the
            EU ETS, the 2040 target, Effort Sharing… — and see the recent developments in
            chronological order with short summaries. Refreshed daily from the European Commission,
            Council, EEA and EUR-Lex feeds, on top of a curated baseline.
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#3D5265]/70">
          <span className="px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            BETA
          </span>
          <span>{POLICY_FILES.length} files tracked</span>
          <span aria-hidden>·</span>
          <span>{totalItems} developments</span>
          {data && data.live_items > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="text-[#007a77]">{data.live_items} live items today</span>
            </>
          )}
          <button
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            disabled={refreshing}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#00928F] rounded-sm hover:bg-[#007a77] transition-colors disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </PageHero>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-sm border border-amber-200 bg-amber-50 text-amber-800 text-[13px]">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and developments…"
            className="w-full sm:max-w-sm px-3 py-2 text-[14px] border border-[#E6E7E8] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#00928F]/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...FILE_SECTORS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`px-2.5 py-1 text-[12px] rounded-sm border transition-colors ${
                  sector === s
                    ? 'bg-[#3D5265] text-white border-[#3D5265]'
                    : 'bg-white text-[#3D5265]/80 border-[#E6E7E8] hover:border-[#3D5265]/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#3D5265]/60">Loading file tracker…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            {/* File list (master) */}
            <aside className="lg:max-h-[75vh] lg:overflow-y-auto lg:pr-1 -mx-1 px-1">
              <div className="space-y-1.5">
                {visibleFiles.map((f) => {
                  const apiFile = filesById.get(f.id);
                  const count = apiFile?.items.length ?? 0;
                  const isSel = f.id === selectedId;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-sm border transition-colors ${
                        isSel
                          ? 'border-[#00928F] bg-[#00928F]/[0.06]'
                          : 'border-[#E6E7E8] bg-white hover:border-[#00928F]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-sm bg-[#3D5265]/[0.06] text-[#3D5265] text-[11px] font-semibold whitespace-nowrap">
                          {f.shortCode}
                        </span>
                        <span className="text-[13px] font-semibold leading-tight">{f.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#3D5265]/60">
                        <span>{f.sector}</span>
                        <span aria-hidden>·</span>
                        <span>{count} item{count === 1 ? '' : 's'}</span>
                        <span aria-hidden>·</span>
                        <span className={apiFile?.last_update ? 'text-[#007a77]' : ''}>
                          {relTime(apiFile?.last_update ?? null)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {visibleFiles.length === 0 && (
                  <div className="px-3 py-6 text-center text-[13px] text-[#3D5265]/60">
                    No files match your filters.
                  </div>
                )}
              </div>
            </aside>

            {/* Detail (chronological timeline for the selected file) */}
            <section>
              {selected ? (
                <div>
                  <div className="pb-4 mb-4 border-b border-[#E6E7E8]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[18px] sm:text-[20px] font-bold text-[#3D5265]">
                        {selected.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold border ${STAGE_STYLE[selected.stage]}`}
                      >
                        {selected.stage}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] text-[#3D5265]/80 leading-relaxed max-w-3xl">
                      {selected.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#3D5265]/60">
                      <span>{selected.sector}</span>
                      {selected.celex && (
                        <>
                          <span aria-hidden>·</span>
                          <span>CELEX {selected.celex}</span>
                        </>
                      )}
                      {selected.url && (
                        <>
                          <span aria-hidden>·</span>
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00928F] hover:underline"
                          >
                            Official page ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {filteredSelectedItems.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-[#3D5265]/60">
                      No developments recorded for this file yet.
                    </div>
                  ) : (
                    <ol className="relative border-l border-[#E6E7E8] ml-2 space-y-5">
                      {filteredSelectedItems.map((item) => {
                        const k = KIND_STYLE[item.kind] ?? KIND_STYLE.development;
                        return (
                          <li key={item.id} className="ml-5">
                            <span
                              className="absolute -left-[6px] mt-1.5 w-[11px] h-[11px] rounded-full border-2 border-white"
                              style={{ backgroundColor: k.dot }}
                              aria-hidden
                            />
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#3D5265]/60">
                              <time dateTime={item.date} className="font-semibold text-[#3D5265]/80">
                                {fmtDate(item.date)}
                              </time>
                              <span
                                className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold text-white"
                                style={{ backgroundColor: k.dot }}
                              >
                                {k.label}
                              </span>
                              <span>{item.source}</span>
                            </div>
                            <h3 className="mt-1 text-[15px] font-semibold leading-snug text-[#3D5265]">
                              {item.url ? (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-[#00928F] hover:underline"
                                >
                                  {item.title}
                                </a>
                              ) : (
                                item.title
                              )}
                            </h3>
                            <p className="mt-1 text-[13px] text-[#3D5265]/75 leading-relaxed max-w-3xl">
                              {item.summary}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-[#3D5265]/60">
                  Select a file to see its timeline.
                </div>
              )}
            </section>
          </div>
        )}

        {/* Provenance */}
        <div className="mt-10 pt-5 border-t border-[#E6E7E8] text-[12px] text-[#3D5265]/55 leading-relaxed">
          <p>
            <strong className="text-[#3D5265]/70">Sources &amp; method.</strong> Developments are
            attributed to files by keyword matching over the live RSS feeds of the European
            Commission, Council of the EU, European Environment Agency and EUR-Lex, merged on top of
            a hand-curated baseline snapshot. The feed pull revalidates daily. Curated baseline items
            are illustrative summaries of public developments and should be verified against the
            linked official source before citation.{' '}
            <Link href="/news-feed" className="text-[#00928F] hover:underline">
              See also the production News module ↗
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
