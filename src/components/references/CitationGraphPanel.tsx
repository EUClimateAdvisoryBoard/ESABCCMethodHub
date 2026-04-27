'use client';
/**
 * Citation-graph panel for M·01 (#19).
 *
 * The bundled `references.ts` doesn't carry a `references[]` field per
 * paper, so we approximate "this paper cites that paper" by finding
 * other library entries whose title tokens overlap heavily (Jaccard ≥
 * 0.25) AND that pre-date the focus paper. It's a soft heuristic — the
 * panel labels itself as "likely-related" rather than "cites" so users
 * understand the limitation.
 */
import { useMemo, useState } from 'react';
import type { Reference as StaticRef } from '@/data/references';
import { references as ALL } from '@/data/references';

const STOP = new Set(['the','and','for','with','from','that','this','of','in','on','to','by','an','as','is','at','a']);

function tokens(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 3 && !STOP.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

interface Props {
  /** Anchor paper id (from data/references.ts). */
  rootId: string;
}

export default function CitationGraphPanel({ rootId }: Props) {
  const [threshold, setThreshold] = useState(0.25);
  const root = useMemo(() => ALL.find(r => r.id === rootId), [rootId]);

  const related = useMemo(() => {
    if (!root) return { older: [] as Array<StaticRef & { score: number }>, newer: [] as Array<StaticRef & { score: number }> };
    const tt = tokens(root.title);
    const rootYear = parseInt(root.year || '0', 10);
    const older: Array<StaticRef & { score: number }> = [];
    const newer: Array<StaticRef & { score: number }> = [];
    let evaluated = 0;
    for (const r of ALL) {
      if (r.id === root.id) continue;
      if (++evaluated > 4000) break;
      const s = jaccard(tt, tokens(r.title));
      if (s < threshold) continue;
      const y = parseInt(r.year || '0', 10);
      if (y && rootYear && y < rootYear) older.push({ ...r, score: s });
      else newer.push({ ...r, score: s });
    }
    older.sort((a, b) => b.score - a.score);
    newer.sort((a, b) => b.score - a.score);
    return { older: older.slice(0, 8), newer: newer.slice(0, 8) };
  }, [root, threshold]);

  if (!root) return null;
  return (
    <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-grey-500">Likely-related papers</p>
          <h3 className="text-sm font-bold truncate">{root.title}</h3>
          <p className="text-xs text-grey-500">{root.authors} ({root.year})</p>
        </div>
        <label className="text-xs text-grey-500 flex items-center gap-2">
          threshold
          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
          />
          <span className="tabular-nums">{threshold.toFixed(2)}</span>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-tertiary mb-1">Likely cited (older)</p>
          {related.older.length === 0 ? (
            <p className="text-xs text-grey-500">No matches above threshold.</p>
          ) : (
            <ul className="space-y-1">
              {related.older.map(r => (
                <li key={r.id} className="text-xs">
                  <a href={`/references?ref=${encodeURIComponent(r.id)}`} className="hover:underline">
                    <span className="font-mono text-[10px] text-grey-500">{r.score.toFixed(2)}</span>{' '}
                    {r.title} <span className="text-grey-500">({r.year})</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-tertiary mb-1">Likely citing / contemporary (newer)</p>
          {related.newer.length === 0 ? (
            <p className="text-xs text-grey-500">No matches above threshold.</p>
          ) : (
            <ul className="space-y-1">
              {related.newer.map(r => (
                <li key={r.id} className="text-xs">
                  <a href={`/references?ref=${encodeURIComponent(r.id)}`} className="hover:underline">
                    <span className="font-mono text-[10px] text-grey-500">{r.score.toFixed(2)}</span>{' '}
                    {r.title} <span className="text-grey-500">({r.year})</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="text-[10px] text-grey-500 mt-3">
        Heuristic: papers in the local library whose titles share ≥{Math.round(threshold * 100)}% Jaccard token overlap. Treat as &quot;likely-related&quot;, not as a verified citation graph (no Crossref <code>references[]</code> available yet).
      </p>
    </section>
  );
}
