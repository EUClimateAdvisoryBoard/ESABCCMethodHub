'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Smart "Back" control for the per-module hero.
 *
 * The previous hero shipped a single link that always pointed at `/` ("Back to
 * MethodHub overview"). Users read that as a browser-style Back button and were
 * surprised to be thrown all the way to the landing page after, say, opening a
 * single reference out of a filtered search.
 *
 * This control instead returns to wherever the user actually came from:
 *
 *   - If there is in-app history in this tab (`window.history.length > 1`),
 *     `router.back()` returns to the previous view — the filtered list, the
 *     search results, the module index, whatever it was.
 *   - Otherwise (the page was opened directly via a deep link or in a fresh
 *     tab) there is nothing to go back to, so we fall back to `fallbackHref`
 *     (the MethodHub overview by default).
 *
 * A separate, always-present "MethodHub overview" link is still rendered so the
 * landing page is one click away regardless of history.
 */
export default function HeroBackButton({ fallbackHref = '/' }: { fallbackHref?: string }) {
  const router = useRouter();
  // Whether a real "previous page" exists in this tab's history. Computed after
  // mount so SSR and the first client render agree (avoids hydration mismatch).
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanGoBack(window.history.length > 1);
  }, []);

  const goBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#E87722] hover:text-[#c45f14] active:text-[#c45f14] transition py-1.5 -ml-1 pl-1 min-h-[40px]"
        aria-label="Go back to the previous view"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>
      {/* Always-available shortcut to the hub overview, independent of history. */}
      <Link
        href={fallbackHref}
        className="inline-flex items-center text-[13px] text-[#3D5265]/60 hover:text-[#3D5265] dark:text-[var(--mh-muted)] transition py-1.5 min-h-[40px]"
      >
        <span className="text-[#3D5265]/30 dark:text-[var(--mh-border)] mr-2" aria-hidden>·</span>
        <span className="hidden sm:inline">MethodHub overview</span>
        <span className="sm:hidden">Overview</span>
      </Link>
    </div>
  );
}
