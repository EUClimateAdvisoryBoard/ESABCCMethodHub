'use client';
import { useState, useEffect } from 'react';
import { Annotation } from '@/lib/types';
import { fetchAnnotations, deleteAnnotationRemote, getTagColor } from '@/lib/store';
interface Props {
  policyId: string;
  refreshKey?: number;
}

export default function AnnotationPanel({ policyId, refreshKey }: Props) {
  const [annotations, setAnnotations] = useState<(Annotation & { user_id?: string; user_display_name?: string })[]>([]);
  const [filterTag, setFilterTag] = useState<string>('');

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
      {/* Tag filter */}
      <div className="flex flex-wrap gap-1.5 px-1">
        <button onClick={() => setFilterTag('')}
          className={`text-xs px-2 py-1 rounded-full font-medium transition ${!filterTag ? 'bg-secondary text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'}`}>
          All ({annotations.length})
        </button>
        {Object.entries(tagCounts).map(([tag, count]) => (
          <button key={tag} onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
            className={`text-xs px-2 py-1 rounded-full font-medium transition ${filterTag === tag ? 'text-white' : 'text-tertiary hover:opacity-80'}`}
            style={{ backgroundColor: filterTag === tag ? getTagColor(tag) : `${getTagColor(tag)}20` }}>
            {tag.replace(/_/g, ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Annotation list */}
      {filtered.map(ann => {
        return (
          <div key={ann.id} className="bg-white rounded border border-grey-200 p-3 hover:border-secondary/30 transition cursor-pointer"
            onClick={() => scrollTo(ann)}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: getTagColor(ann.tag) }}>
                {ann.tag.replace(/_/g, ' ')}
              </span>
              <button onClick={e => { e.stopPropagation(); handleDelete(ann.id); }}
                className="text-grey-400 hover:text-accent-red text-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
            </div>
            <p className="text-xs text-tertiary italic line-clamp-3">&ldquo;{ann.text_excerpt}&rdquo;</p>
            {ann.note && <p className="text-xs text-tertiary-dark mt-1">{ann.note}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              {ann.user_display_name && (
                <span className="text-xs text-secondary font-medium">{ann.user_display_name}</span>
              )}
              <span className="text-xs text-grey-400">{new Date(ann.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
