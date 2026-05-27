/**
 * Backward-compatible placeholder for pre-fetched policy body texts.
 */
// Placeholder kept for backward compatibility with any lingering
// imports. The real prefetched bodies are now served as a static asset
// from `public/content-analysis/policy-bodies.json` and loaded lazily
// by the content-analysis page via `useEffect` — this avoids the
// (~15 MB) policy corpus being bundled into the client JS.

export interface PolicyBody {
  text: string;
  fetchedAt: string;
  sourceUrl: string;
  source: 'eurlex-html' | 'eurlex-pdf' | 'manual';
}

/** Deliberately empty — real data lives in the JSON asset. */
export const POLICY_BODIES: Record<string, PolicyBody> = {};
