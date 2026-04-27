'use client';
import { useEffect, useState } from 'react';

/**
 * Reactive media-query hook. Returns `false` during SSR and on the first
 * client render, then settles to the real value after mount. This avoids
 * hydration mismatches while still letting components branch on viewport.
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 767px)');
 *   if (isMobile) return <MobileLayout />;
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    // Safari <14 uses addListener/removeListener
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    } else {
      mql.addListener(update);
      return () => mql.removeListener(update);
    }
  }, [query]);

  return matches;
}

/**
 * Re-export device hooks from useDevice.ts — single source of truth for
 * breakpoint-based helpers. Keeps old import paths working.
 */
export { useIsMobile, useDevice } from './useDevice';
