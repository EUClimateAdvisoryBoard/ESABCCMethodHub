// ---------------------------------------------------------------------------
// Shared string helpers for the reference-manager API routes.
//
// `sanitize` / `normalize` / `normalizeDoi` were copy-pasted (in sync, no
// drift found -- see WP-01) across `api/references/route.ts`, `doi/route.ts`,
// `library/route.ts` and `project-workspace/route.ts`. Consolidated here so
// the logic exists exactly once.
//
// Server-only: these routes serve the legacy VBA/Word bridge, which is why
// `sanitize` exists at all. Import this module directly from API routes --
// it is intentionally NOT re-exported from the `@/lib/references` barrel
// (`./index.ts`), mirroring how `custom-store.ts` is kept out of it.
// ---------------------------------------------------------------------------

/**
 * Sanitize a string for VBA/Word compatibility: smart quotes -> straight
 * quotes, en/em-dash -> hyphen, ellipsis character -> "...", NBSP -> space.
 * Word's COM bridge chokes on some Unicode punctuation, so every
 * add-in-facing string field is passed through this before serialisation.
 */
export function sanitize(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')    // smart double quotes
    .replace(/[\u2013\u2014]/g, '-')           // en-dash, em-dash
    .replace(/[\u2026]/g, '...')               // ellipsis
    .replace(/[\u00A0]/g, ' ');                // non-breaking space
}

/**
 * Normalize a string for fuzzy comparison: lowercase, decompose Unicode
 * (so "e" + acute accent becomes "e" + combining mark), strip combining
 * marks, collapse whitespace. This makes "Edenhofer" match accented
 * spellings and "co2" match "CO" + subscript "2" once the subscript is
 * normalized.
 */
export function normalize(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a DOI for comparison / dedup: strip the "https://doi.org/" (or
 * "dx.doi.org") host prefix and a leading "doi:" scheme, lowercase, trim.
 */
export function normalizeDoi(d: string | undefined): string {
  return (d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();
}
