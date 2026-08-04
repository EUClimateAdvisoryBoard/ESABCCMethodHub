# WP-03 — Project Workspace: project & module lifecycle

**Area:** Project Workspace · **Size:** M–L · **Depends on:** nothing

## Problem

Projects can be created but never renamed, archived or deleted
(`src/app/api/project-workspace/projects/route.ts` has GET/POST only).
Modules can be added (`projects/[projectId]/modules` POST) but never
removed or reordered, even though `pw_modules.position` exists. In
practice: a typo in a project name is permanent, and abandoned test
projects clutter the landing page forever.

Two hygiene items ride along:

- The header comment in `src/data/project-workspace.ts` (~lines 6–15)
  still claims the module is localStorage-backed seed stubs; it has
  been Supabase-backed (`pw_*` tables, `src/lib/project-workspace/db.ts`)
  since migration 038.
- `listMemberStateCells` in `src/lib/project-workspace/db.ts` (~line
  876) omits the `noStore()` call its sibling readers make — a
  potential stale-cache read.

## Tasks

1. **API — project item route.** Create
   `src/app/api/project-workspace/projects/[projectId]/route.ts` with:
   - `PATCH` — update `name` / `description` (whatever editable fields
     `pw_projects` has — read migration 038 and `db.ts` first).
   - `DELETE` — delete the project; child rows cascade via the existing
     `on delete cascade` FKs. **Refuse (400) to delete seed projects**
     (`policy-gap-2-0`, `industry-project` — source the id list from
     `SEED_PROJECTS` in `src/data/project-workspace.ts`, do not
     hardcode a second copy).
   Follow the module's auth convention exactly (see
   `projects/route.ts`): Bearer token → `createServerClient(token)` →
   `getUser()` → 401 if absent; `runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`.
2. **API — module lifecycle.** Extend the modules routes:
   - `DELETE` for a module (new
     `projects/[projectId]/modules/[moduleId]/route.ts` or query-param
     DELETE on the collection route — match whichever pattern the rest
     of the module uses for item deletes). Refuse to delete seed
     modules (`is_seed`) unless you find an existing convention that
     allows it.
   - `PATCH` reorder — accept an ordered list of module ids and update
     `position` transactionally (or per-row; keep it simple).
3. **Client contract.** Add matching methods to the `pwApi` object in
   `src/lib/project-workspace/client.ts` (updateProject, deleteProject,
   deleteModule, reorderModules), using the existing `authHeader()`
   pattern.
4. **UI.**
   - Project rename + delete: a small "…" menu on the project header in
     `src/components/workspace/ProjectShell.tsx` (or on the landing
     page cards — pick the location that needs the least new
     scaffolding, and use the existing dialog primitives the module
     already uses, e.g. how `AddModuleDialog` is built). Delete must
     confirm (type-the-name or explicit confirm dialog) and then route
     back to `/project-workspace`.
   - Module removal: an affordance in the tab strip or the Add-tool
     dialog; confirm before delete; optimistic update then
     `router.refresh()` per the module's existing pattern.
   - Module reorder: simple up/down controls are sufficient — do NOT
     add a drag-and-drop dependency.
   - Respect the preview mode gate (`isWorkspaceDbEnabled()` /
     DB-disabled fallback): hide mutation affordances exactly the way
     the New-project button is hidden.
5. **Activity log.** If `src/lib/project-workspace/activity-log.ts`
   exposes a server-side helper the existing routes use to record
   events, record project rename/delete and module add/remove/reorder
   the same way. If wiring it in is invasive, skip it and say so in
   your report.
6. **Hygiene.** Rewrite the stale header comment in
   `src/data/project-workspace.ts` to describe the actual architecture
   (Supabase `pw_*` tables, seeding via `ensureSeedDataFor`, preview
   fallback). Add the missing `noStore()` to `listMemberStateCells`.

## File ownership (do not touch files outside these trees)

- `src/app/api/project-workspace/**`
- `src/lib/project-workspace/**`
- `src/components/workspace/**`
- `src/app/project-workspace/**`
- `src/data/project-workspace.ts`

Do NOT touch `src/lib/references/**`, `src/app/api/references/**`,
`src/components/references/**` or `supabase/migrations/**` — other work
packages own those. No schema change is needed for this WP (cascade FKs
and `position` already exist).

## Acceptance criteria

- PATCH/DELETE project and DELETE/reorder module endpoints exist, are
  auth-gated, and refuse seed-project deletion.
- `pwApi` exposes the four new methods.
- The UI can rename a project, delete a non-seed project (with
  confirmation), remove a module (with confirmation) and reorder
  modules; all affordances hidden in preview mode.
- Stale comment rewritten; `noStore()` added.
- `npx tsc --noEmit` reports no errors in the owned files.

## Constraints

- Do NOT run any git commands — the orchestrator commits.
- Do NOT install new dependencies (no dnd libraries, no icon packs —
  inline SVGs per module convention).
- Keep tab state in the URL (`?module=`) — deleting the active module
  should push to the project's default tab.
