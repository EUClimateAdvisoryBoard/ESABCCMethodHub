# WP-01 — Fix the dead `getStore()` data path and deduplicate route helpers

**Area:** Reference Manager (correctness) · **Size:** M ·
**Depends on:** nothing

## Problem

When the GitHub-as-database backend of the shared reference store was
retired, `getStore()` in `src/lib/references/custom-store.ts:175` was
left behind as a deprecated stub that **always returns `[]`**. The PDF
route was migrated to the async Supabase-backed `listRefs()`
(see the comment at `src/app/api/references/pdf/route.ts:55`), but three
routes were not:

1. `src/app/api/references/route.ts:207` — the main Word-add-in list
   endpoint builds `customRefs` from `getStore()`, so references added
   via the web UI or VBA bridge **never appear** in add-in search
   results; only the Supabase `references` table and the static seed do.
2. `src/app/api/references/project-workspace/route.ts:618` — the
   `refById` map is built from `getStore()`, so `ref-doc-<refId>` ids
   pointing at custom references fail to resolve in "Cite from project
   workspace".
3. `src/app/api/references/library/backfill/route.ts:242` — the
   CrossRef backfill walks an always-empty store, making the entire
   admin endpoint a silent no-op. It also still imports the retired
   `persistToGitHub` / `hasGitHubToken` no-ops.

Separately, `normalize` / `sanitize` / `normalizeDoi`-style helpers are
copy-pasted across `api/references/route.ts`, `doi/route.ts`,
`library/route.ts` and `project-workspace/route.ts`.

## Tasks

1. In each of the three routes above, replace the synchronous
   `getStore()` call with the async `listRefs()` accessor (follow the
   pattern already used in `pdf/route.ts`). Preserve each route's
   existing output shape exactly — the Word add-in and Content Analysis
   workbench consume these contracts.
2. In `library/backfill/route.ts`, remove the `persistToGitHub` /
   `hasGitHubToken` usage: writes should go through the store's
   Supabase upsert path (`upsertRef` or whatever the live write path
   is — read `custom-store.ts` first). Keep the route additive-only and
   keep the `admin_audit_log` write.
3. Once no call sites remain, delete the retired no-op stubs from
   `custom-store.ts`: `getStore`, `reloadFromGitHub`, `persistToGitHub`,
   `hasGitHubToken`, and `ensureSeedLoaded` **if** it is also a no-op —
   read it first; if `ensureSeedLoaded` still does real work, keep it
   and only remove the dead ones. Update all imports.
4. Create `src/lib/references/server/route-helpers.ts` (server-only)
   exporting the shared `normalize` / `sanitize` / `normalizeDoi`
   helpers, then replace the duplicated copies in the four routes with
   imports. Compare the duplicated implementations first — if they have
   drifted apart, unify on the most complete variant and note the
   difference in the PR-ready commit description you leave in your
   report.

## File ownership (do not touch files outside this list)

- `src/lib/references/custom-store.ts`
- `src/lib/references/server/route-helpers.ts` (new)
- `src/app/api/references/route.ts`
- `src/app/api/references/doi/route.ts`
- `src/app/api/references/library/route.ts`
- `src/app/api/references/library/backfill/route.ts`
- `src/app/api/references/project-workspace/route.ts`
- `src/app/api/references/pdf/route.ts` (only if its comment needs
  updating after the stub deletion)

## Acceptance criteria

- No remaining references to `getStore`, `reloadFromGitHub`,
  `persistToGitHub`, `hasGitHubToken` anywhere in `src/`
  (grep must come back empty).
- The three routes source custom references via `listRefs()` and their
  response shapes are unchanged (same keys, same sanitisation).
- Helper logic exists once, in the shared module.
- `npx tsc --noEmit` reports no errors in the owned files.

## Constraints

- Do NOT run any git commands (no add/commit/push) — the orchestrator
  commits.
- Do NOT install new dependencies.
- These routes serve the legacy VBA bridge: keep the ISO-8859-1-safe
  sanitisation (smart quotes → straight, en-dash → hyphen) intact.
