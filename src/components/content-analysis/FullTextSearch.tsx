'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalysisDocument } from '@/lib/content-analysis/types';

export interface SearchHit {
  documentId: string;
  /** 0-indexed char offset in the doc's `text` where the keyword starts. */
  offset: number;
  /** Keyword actually matched (preserves original casing from the text). */
  match: string;
  /** Keyword as typed by the user. */
  query: string;
  /** ~60-char context window around the hit for the result list preview. */
  preview: string;
  /** Where in the preview string the match starts / ends, for highlighting. */
  previewStart: number;
  previewEnd: number;
}

interface Props {
  documents: AnalysisDocument[];
  onJump: (hit: SearchHit) => void;
}

const MAX_HITS_PER_DOC = 4;
const MAX_TOTAL_HITS = 120;
const PREVIEW_BEFORE = 50;
const PREVIEW_AFTER = 70;
const DEBOUNCE_MS = 180;

/**
 * Full-text search across every document's body. Case-insensitive
 * substring search (literal — no regex, to keep it predictable for
 * non-power-users). Each hit is grouped by document and clickable;
 * the parent page scrolls to the matched block on jump.
 */
export default function FullTextSearch({ documents, onJump }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const hits = useMemo(() => {
    const q = debounced.trim();
    if (q.length < 2) return [] as SearchHit[];
    const qLower = q.toLowerCase();
    const out: SearchHit[] = [];
    for (const doc of documents) {
      const text = doc.text;
      if (!text) continue;
      const lower = text.toLowerCase();
      let cursor = 0;
      let count = 0;
      while (count < MAX_HITS_PER_DOC) {
        const idx = lower.indexOf(qLower, cursor);
        if (idx < 0) break;
        const previewStartAbs = Math.max(0, idx - PREVIEW_BEFORE);
        const previewEndAbs = Math.min(text.length, idx + q.length + PREVIEW_AFTER);
        const rawPreview = text.slice(previewStartAbs, previewEndAbs).replace(/\s+/g, ' ').trim();
        // Re-locate the match inside the cleaned preview (whitespace
        // collapse may have shifted indices by a few characters).
        const relLower = rawPreview.toLowerCase();
        const relIdx = relLower.indexOf(qLower);
        out.push({
          documentId: doc.id,
          offset: idx,
          match: text.slice(idx, idx + q.length),
          query: q,
          preview: rawPreview,
          previewStart: relIdx >= 0 ? relIdx : 0,
          previewEnd: relIdx >= 0 ? relIdx + q.length : q.length,
        });
        cursor = idx + qLower.length;
        count++;
        if (out.length >= MAX_TOTAL_HITS) break;
      }
      if (out.length >= MAX_TOTAL_HITS) break;
    }
    return out;
  }, [debounced, documents]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const arr = map.get(h.documentId) ?? [];
      arr.push(h);
      map.set(h.documentId, arr);
    }
    return map;
  }, [hits]);

  const docById = useMemo(() => new Map(documents.map(d => [d.id, d])), [documents]);

  return (
    <div className="flex flex-col">
      <div className="relative px-2.5 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search all policy text…"
          className="w-full border border-[#E6E7E8] rounded-sm pl-7 pr-6 py-1.5 text-[12.5px] text-[#3D5265] focus:border-[#00928F] focus:outline-none"
          aria-label="Full-text search"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A95A3]"
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A95A3] hover:text-[#3D5265] text-[14px] leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {debounced.trim().length >= 2 && (
        <div className="max-h-[40vh] overflow-y-auto">
          {hits.length === 0 ? (
            <div className="px-3 py-4 text-[12px] italic text-[#8A95A3]">
              No matches for “{debounced}”.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6E7E8]">
              {[...grouped.entries()].map(([docId, docHits]) => {
                const doc = docById.get(docId);
                if (!doc) return null;
                return (
                  <li key={docId}>
                    <div className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3] flex items-center justify-between">
                      <span className="truncate">{doc.shortTitle}</span>
                      <span className="tabular-nums text-[#3D5265]/70">{docHits.length}</span>
                    </div>
                    <ul>
                      {docHits.map((h, i) => (
                        <li key={`${docId}-${h.offset}-${i}`}>
                          <button
                            type="button"
                            onClick={() => onJump(h)}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] text-[11.5px] text-[#3D5265] leading-snug"
                          >
                            <PreviewText hit={h} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-3 py-1.5 border-t border-[#E6E7E8] bg-[#FBFBFA] font-mono text-[10px] text-[#8A95A3] flex items-center justify-between">
            <span>{hits.length} match{hits.length === 1 ? '' : 'es'} in {grouped.size} document{grouped.size === 1 ? '' : 's'}</span>
            {hits.length >= MAX_TOTAL_HITS && <span>+ more (narrow query)</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewText({ hit }: { hit: SearchHit }) {
  const { preview, previewStart, previewEnd } = hit;
  return (
    <span>
      <span>…{preview.slice(0, previewStart)}</span>
      <mark className="bg-[#FEF3C7] text-[#3D5265] px-0.5 rounded-sm font-medium">
        {preview.slice(previewStart, previewEnd)}
      </mark>
      <span>{preview.slice(previewEnd)}…</span>
    </span>
  );
}
