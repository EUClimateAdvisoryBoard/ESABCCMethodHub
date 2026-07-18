# Reference Manager & Project Workspace — improvement round, July 2026

Brainstorm and work-package breakdown for the next improvement round on
M·01 (Reference Manager) and M·07 (Project Workspace). Produced from a
full code exploration of both modules on 2026-07-18.

## How this round is organised

Four self-contained work packages, each implementable independently with
disjoint file ownership so they can be built in parallel:

| WP | Title | Area | Size |
| --- | --- | --- | --- |
| [WP-01](WP-01-custom-store-data-path.md) | Fix the dead `getStore()` data path + deduplicate route helpers | Reference Manager (correctness) | M |
| [WP-02](WP-02-citation-styles-and-exports.md) | Citation-style coverage + RIS / CSL-JSON export | Reference Manager (features) | M |
| [WP-03](WP-03-workspace-project-module-lifecycle.md) | Project & module lifecycle (rename / delete / reorder) | Project Workspace | M–L |
| [WP-04](WP-04-reference-pdfs-bucket-hardening.md) | Tighten `reference-pdfs` storage bucket RLS | Security (SQL) | S |

## Findings that motivated the selection

### Reference Manager

- **Dead data path (bug).** `getStore()` in
  `src/lib/references/custom-store.ts:175` is a deprecated stub that
  always returns `[]` — a leftover from retiring the GitHub-as-database
  storage backend. Three API routes still call it, so web/VBA-added
  references silently vanish from the Word add-in list endpoint
  (`api/references/route.ts:207`), the workspace citation endpoint
  (`api/references/project-workspace/route.ts:618`), and the admin
  backfill endpoint (`api/references/library/backfill/route.ts:242`,
  which is a complete no-op as a result). → **WP-01**
- **Advertised vs. implemented citation styles.** `CITATION_STYLES`
  lists 10 styles; `format-citation.ts` renders 4 (APA, Chicago,
  Harvard, ESABCC). The UI can advertise styles it cannot render. →
  **WP-02**
- **Export is BibTeX-only** while import supports DOI / BibTeX / RIS /
  PDF-drop. RIS and CSL-JSON export close the round-trip. → **WP-02**
- **Copy-pasted helpers.** `normalize` / `sanitize` / `normalizeDoi`
  are duplicated across four API routes. → folded into **WP-01**
- **Publicly writable PDF bucket.** Migration
  `060_reference_pdfs_bucket.sql` grants anonymous write, update and
  delete on the `reference-pdfs` storage bucket — anyone can overwrite
  or delete staff PDFs. → **WP-04**

### Project Workspace

- **No lifecycle endpoints.** Projects have GET/POST only — no rename,
  no delete. Modules are create-only despite a `position` column
  existing for ordering. Mistyped project names and abandoned test
  projects are permanent. → **WP-03**
- **Stale documentation.** The header comment in
  `src/data/project-workspace.ts` still describes the module as
  localStorage-backed stubs; it has been Supabase-backed for ~30
  migrations. → folded into **WP-03**
- **Missing `noStore()`** in `listMemberStateCells`
  (`src/lib/project-workspace/db.ts`) unlike its sibling readers —
  potential stale-cache read. → folded into **WP-03**

### Verified non-issues

- The `pw_modules.kind` CHECK constraint drift flagged during
  exploration is already handled: migrations 048 and 070 re-create the
  constraint with all eight kinds.

## Backlog — good ideas deliberately NOT in this round

Kept here so they aren't lost; each needs either a product decision or
more design than a parallel work package should carry.

1. **Workspace membership & roles.** All `pw_*` tables use
   `to authenticated using (true)` RLS — any signed-in user can edit or
   delete any project's data. A `pw_members` table with owner/editor/
   viewer roles (mirroring the existing `library_members` pattern from
   migration 001) is the right fix, but it changes the sharing model
   for the whole Secretariat and needs sign-off first.
2. **Unify the two reference data models.** The CSL-JSON `references`
   table (M·01) and the flat `custom_references` store coexist with
   ad-hoc bridging in every route. Converging on CSL-JSON with a
   compatibility view would remove a whole class of drift bugs. Large,
   migration-heavy, needs a data-migration rehearsal.
3. **Real citation processing via citeproc-js / citation-js.** The
   hand-rolled BibTeX/RIS parsers and string-template citation
   formatter are self-described approximations. Adopting citation-js
   would raise fidelity but adds a heavyweight dependency to an
   air-gap-friendly bundle — needs a bundle-size decision.
4. **Shared (synced) PDF annotations.** Annotations are per-browser
   localStorage. Syncing them to Supabase would enable the collaborative
   review workflow the rest of the app already has (comments,
   verifications).
5. **Resolve arXiv / ISBN identifiers.** Clipboard detection already
   recognises them but only DOIs are resolved. arXiv API + OpenLibrary
   lookups are straightforward additions to the import modal.
6. **Fuzzy dedup on import.** Live import dedups by normalized DOI
   only; title+year fuzzy matching (already present in the backfill
   route) should move into the shared import path.
7. **A real citation graph.** `CitationGraphPanel` edges are
   title-token Jaccard similarity, not citations. OpenCitations /
   CrossRef reference lists could provide real edges.
8. **Surface seeding failures.** Workspace self-healing seed writes log
   `console.error` and continue; an admin-visible health indicator
   (the activity-log self-test pattern from migration 069 is a good
   template) would make silent failures visible.
9. **Delete the legacy `src/lib/references.ts`** module (base64 PDFs in
   localStorage), which is explicitly marked "migrate and delete" but
   still supplies a type import.

## Conventions for implementers

- Branch: all four WPs land on `claude/reference-manager-improvements-kcfiet`.
- API routes: `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`,
  Bearer-token auth via `createServerClient(token)` + `getUser()` for
  workspace writes; open CORS only on add-in-facing reference GETs.
- Migrations: next free number in `supabase/migrations/`, idempotent
  (`if not exists` / `drop policy if exists`).
- Verify with `npx tsc --noEmit` and `npm run lint` (scoped to your
  files if the tree has parallel work in flight).
