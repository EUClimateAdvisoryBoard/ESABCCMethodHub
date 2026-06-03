/**
 * Public barrel for the Reference Manager module (M·01).
 * ------------------------------------------------------
 * Components and API routes should import from `@/lib/references`,
 * not reach directly into the submodules. That keeps the internal
 * layout (split between `types`, `citation-utils`, `reference-service`)
 * refactorable without touching every call site.
 *
 * PDF storage and annotation helpers live in
 * `./pdf-storage` and `./pdf-annotations` — they are imported
 * explicitly by the few components that actually render PDFs, not
 * re-exported here, to keep pdf.js out of every bundle that includes
 * this barrel.
 */
export * from './types';
export * from './citation-utils';
export * from './reference-service';
export * from './projects';
