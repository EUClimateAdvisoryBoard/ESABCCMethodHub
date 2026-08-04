# WP-02 — Citation-style coverage + RIS / CSL-JSON export

**Area:** Reference Manager (features) · **Size:** M ·
**Depends on:** nothing

## Problem

1. **Style list vs. renderer mismatch.** `CITATION_STYLES` (in
   `src/lib/references/`, exported through the barrel) advertises 10
   citation styles — APA, Chicago, IEEE, Vancouver, Harvard, Nature,
   Science, MLA, Elsevier, Springer — but the renderer
   `src/lib/references/format-citation.ts` implements only 4 (apa,
   chicago, harvard, esabcc). Users can select styles that silently
   fall back or render wrongly.
2. **Asymmetric round-trip.** Import supports DOI, BibTeX, RIS and
   PDF-drop, but export is BibTeX-only (`exportBibTeX` in
   `citation-utils.ts`). Staff moving references to Zotero/EndNote
   need RIS; CSL-JSON is the lossless interchange format the M·01 data
   model is built on.

## Tasks

1. Read `format-citation.ts` and `CITATION_STYLES` first and reconcile
   them: implement string-template renderers for every advertised style
   (IEEE, Vancouver, Nature, Science, MLA, Elsevier, Springer) in the
   same approximation approach the existing 4 use. Keep the `esabcc`
   house style working. Cover at least the CSL types the existing
   renderers cover (article-journal, book, chapter, report/webpage —
   check the actual switch). If any advertised style turns out
   impractical to approximate, remove it from `CITATION_STYLES` instead
   of shipping a broken renderer — the invariant is: **every style in
   the list renders**.
2. Add `exportRIS(refs)` and `exportCSLJSON(refs)` to
   `citation-utils.ts`, mirroring `exportBibTeX`'s signature and
   escaping discipline. RIS output must round-trip through the module's
   own RIS parser (`parseRIS`) for the common fields (type, title,
   authors, year, journal, volume, issue, pages, DOI, URL).
3. Surface the new exports in the UI wherever BibTeX export currently
   appears (`src/components/references/ReferenceList.tsx`, and
   `src/app/references/page.tsx` if the export entry point lives
   there). `page.tsx` is ~96 KB — make minimal, surgical edits only.
4. Add a small pure-function self-check: a `scripts/`-free inline test
   is fine (e.g. a `if (process.env.NODE_ENV === 'test')` block is NOT
   wanted — instead just ensure via manual node -e or a scratch script
   that a sample reference renders under all 10 styles without
   `undefined` appearing in output, and that RIS round-trips). Report
   the sample outputs in your final report.

## File ownership (do not touch files outside this list)

- `src/lib/references/format-citation.ts`
- `src/lib/references/citation-utils.ts`
- `src/lib/references/types.ts` (only if a style-id type needs widening)
- `src/lib/references/index.ts` (barrel re-exports)
- `src/components/references/ReferenceList.tsx`
- `src/app/references/page.tsx` (minimal edits)

Do NOT touch anything under `src/app/api/` — another work package owns
those files.

## Acceptance criteria

- Every style listed in `CITATION_STYLES` produces a non-empty,
  `undefined`-free citation for a journal article, a book, a chapter
  and a report/webpage sample.
- RIS export of a sample list re-imports through `parseRIS` with type,
  title, authors, year, journal, volume, issue, pages, DOI and URL
  intact.
- CSL-JSON export is valid JSON parseable as an array of CSL items.
- Export UI offers BibTeX, RIS and CSL-JSON.
- `npx tsc --noEmit` reports no errors in the owned files.

## Constraints

- Do NOT run any git commands — the orchestrator commits.
- Do NOT add citation-js/citeproc-js or any new dependency; stay with
  the string-template approach (bundle size is a project constraint —
  the app must stay air-gap friendly).
