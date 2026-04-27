'use client';

// ---------------------------------------------------------------------------
// RecentAnnotationsFeed
//
// Sidebar feed on the Reference Library page that lists the most recent PDF
// annotations across ALL references in the library.  Each item shows the
// reference title, the highlighted quote, the user's note, and a direct link
// to open the annotated PDF at the right page.
//
// Annotations live in localStorage so we subscribe to the `storage` event to
// keep this feed fresh across tabs, and we also expose a small custom event
// (`esabcc:annotations-changed`) that the annotate page fires whenever it
// mutates annotations so the feed updates immediately in the same tab.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getRecentPdfAnnotations,
  PdfAnnotation,
} from '@/lib/references/pdf-annotations';

interface RefSummary {
  id: string;
  title: string;
}

interface Props {
  // Map of reference id → display title, provided by the parent so we don't
  // need to re-fetch the library.
  referenceTitles: Record<string, string>;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RecentAnnotationsFeed({ referenceTitles }: Props) {
  const [items, setItems] = useState<PdfAnnotation[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setItems(getRecentPdfAnnotations(25));
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('esabcc:annotations-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('esabcc:annotations-changed', refresh);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="border border-grey-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-grey-100 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-tertiary-dark">
          Recent annotations
        </h2>
        <span className="text-xs text-tertiary">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="p-4 text-xs text-tertiary text-center">
          No annotations yet. Open a reference with a PDF and highlight a
          passage to get started.
        </p>
      ) : (
        <ul className="divide-y divide-grey-100 max-h-[75vh] overflow-y-auto">
          {items.map(a => {
            const title = referenceTitles[a.reference_id] || 'Unknown reference';
            return (
              <li key={a.id} className="p-3">
                <Link
                  href={`/references/annotate/?id=${encodeURIComponent(a.reference_id)}`}
                  className="block group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[11px] font-medium text-primary group-hover:underline line-clamp-2">
                      {title}
                    </span>
                    <span className="text-[10px] text-tertiary shrink-0">
                      {formatRelative(a.created_at)}
                    </span>
                  </div>
                  <blockquote
                    className="text-[11px] italic px-2 py-1 rounded border-l-2 border-grey-300 line-clamp-2"
                    style={{ background: a.color + '55' }}
                  >
                    “{a.quote}”
                  </blockquote>
                  {a.note && (
                    <div className="text-[11px] text-tertiary-dark mt-1 line-clamp-2">
                      {a.note}
                    </div>
                  )}
                  <div className="text-[10px] text-tertiary mt-1">
                    Page {a.page}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
