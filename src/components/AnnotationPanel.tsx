'use client';
import { useState, useEffect } from 'react';
import { Annotation } from '@/lib/types';
import { fetchAnnotations, deleteAnnotationRemote, getTagColor } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

interface Props {
  policyId: string;
  refreshKey?: number;
}

export default function AnnotationPanel({ policyId, refreshKey }: Props) {
  const [annotations, setAnnotations] = useState<(Annotation & { user_id?: string; user_display_name?: string })[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    fetchAnnotations(policyId).then(setAnnotations);
    const interval = setInterval(() => {
      fetchAnnotations(policyId).then(setAnnotations);
    }, 30_000);
    return () => clearInterval(interval);
  }, [policyId, refreshKey]);

  const filtered = filterTag ? annotations.filter(a => a.tag === filterTag) : annotations;
  const tagCounts = annotations.reduce<Record<string, number>>((acc, a) => {
    acc[a.tag] = (acc[a.tag] || 0) + 1; return acc;
  }, {});

  const handleDelete = async (id: string) => {
    const ok = await deleteAnnotationRemote(id);
    if (!ok) return;
    const updated = await fetchAnnotations(policyId);
    setAnnotations(updated);
  };

  const scrollTo = (ann: Annotation) => {
    window.dispatchEvent(new CustomEvent('scroll-to-annotation', { detail: { charStart: ann.char_start } }));
  };

  if (annotations.length === 0) {
    return (
      <div className="text-sm text-grey-500 italic p-4">
        No annotations yet. Select text in the document to create one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tag filter — horizontal scroll on phones to avoid stealing too much
          vertical space when many tags exist. */}
      <div className="flex flex-nowrap sm:flex-wrap gap-1.5 px-1 overflow-x-auto -mx-1 sm:mx-0 sm:overflow-visible scrollbar-none">
        <button
          onClick={() => setFilterTag('')}
          className={`shrink-0 text-[12px] sm:text-xs px-3 py-1.5 sm:px-2 sm:py-1 min-h-[36px] sm:min-h-0 rounded-full font-medium transition ${!filterTag ? 'bg-secondary text-white' : 'bg-grey-100 dark:bg-[var(--mh-border)] text-tertiary dark:text-[var(--mh-fg)] hover:bg-grey-200'}`}
        >
          All ({annotations.length})
        </button>
        {Object.entries(tagCounts).map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
            className={`shrink-0 text-[12px] sm:text-xs px-3 py-1.5 sm:px-2 sm:py-1 min-h-[36px] sm:min-h-0 rounded-full font-medium transition ${filterTag === tag ? 'text-white' : 'text-tertiary dark:text-[var(--mh-fg)] hover:opacity-80'}`}
            style={{ backgroundColor: filterTag === tag ? getTagColor(tag) : `${getTagColor(tag)}20` }}
          >
            {tag.replace(/_/g, ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Annotation list */}
      {filtered.map(ann => {
        const isOwner = user?.id === ann.user_id;
        return (
          <div
            key={ann.id}
            className="bg-white dark:bg-[var(--mh-card)] rounded border border-grey-200 dark:border-[var(--mh-border)] p-3 hover:border-secondary/30 active:bg-grey-50 dark:active:bg-[var(--mh-bg)] transition cursor-pointer"
            onClick={() => scrollTo(ann)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollTo(ann); } }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className="text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full text-white truncate max-w-[80%]"
                style={{ backgroundColor: getTagColor(ann.tag) }}
              >
                {ann.tag.replace(/_/g, ' ')}
              </span>
              {isOwner && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(ann.id); }}
                  aria-label="Delete annotation"
                  className="text-grey-400 dark:text-[var(--mh-muted)] hover:text-accent-red active:text-accent-red p-1.5 -m-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[12px] sm:text-xs text-tertiary dark:text-[var(--mh-muted)] italic line-clamp-3">&ldquo;{ann.text_excerpt}&rdquo;</p>
            {ann.note && <p className="text-[13px] sm:text-xs text-tertiary-dark dark:text-[var(--mh-fg)] mt-1 break-words">{ann.note}</p>}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {ann.user_display_name && (
                <span className="text-[11px] sm:text-xs text-secondary font-medium truncate max-w-[60%]">{ann.user_display_name}</span>
              )}
              <span className="text-[11px] sm:text-xs text-grey-400 dark:text-[var(--mh-muted)]">{new Date(ann.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
