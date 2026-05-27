/**
 * Compact Open Graph preview card that fetches and displays metadata for a given URL.
 */
'use client';
import { useState, useEffect } from 'react';

interface LinkMeta {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

// Simple in-memory cache so we don't re-fetch for every re-render
const cache = new Map<string, LinkMeta | null>();

/**
 * LinkPreview — renders a compact Open Graph preview card for a URL.
 *
 * Fetches metadata via /api/link-preview and shows title, description,
 * image (if available), and domain name.
 */
export default function LinkPreview({ url }: { url: string }) {
  const [meta, setMeta] = useState<LinkMeta | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache.has(url)) {
      const cached = cache.get(url)!;
      setMeta(cached);
      setLoading(false);
      setError(!cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((data: LinkMeta) => {
        if (cancelled) return;
        // Only cache & show if we got a meaningful title
        if (data.title) {
          cache.set(url, data);
          setMeta(data);
        } else {
          cache.set(url, null);
          setError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(url, null);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  // Don't render anything while loading or on error — keep the feed clean
  if (loading) {
    return (
      <div className="mt-2 mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 animate-pulse">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
          <div className="hidden sm:block w-24 h-[68px] rounded bg-gray-200 flex-shrink-0" />
        </div>
      </div>
    );
  }

  if (error || !meta) return null;

  return (
    <a
      href={meta.url || url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 mb-3 rounded-lg border border-gray-200 hover:border-secondary/40 bg-gray-50 hover:bg-secondary/5 transition-colors overflow-hidden group"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex">
        {/* Text content */}
        <div className="flex-1 min-w-0 p-3">
          {meta.siteName && (
            <p className="text-[10px] uppercase tracking-wider text-tertiary font-semibold mb-1 truncate">
              {meta.siteName}
            </p>
          )}
          <p className="text-sm font-semibold text-tertiary-dark leading-snug line-clamp-2 group-hover:text-secondary transition-colors">
            {meta.title}
          </p>
          {meta.description && (
            <p className="text-xs text-tertiary leading-relaxed mt-1 line-clamp-2">
              {meta.description}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        {meta.image && (
          <div className="hidden sm:flex items-center flex-shrink-0 p-2">
            <img
              src={meta.image}
              alt=""
              className="w-28 h-20 object-cover rounded"
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </a>
  );
}
