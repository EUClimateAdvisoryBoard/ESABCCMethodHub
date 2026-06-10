-- ─────────────────────────────────────────────────────────────────────────────
-- Durable, shared store for the Project Workspace flow-chart boards & versions.
--
-- The Indicator module's "Flow charts" view kept everything in the editing
-- browser's localStorage — the version registry, each version's editable board,
-- and the immutable reset seed of custom versions. So a board a colleague built
-- or edited was invisible to everyone else: the workspace was not synced.
--
-- This table is a generic per-project key→JSON store. The `storage_key` is the
-- same key the client already used in localStorage (e.g.
-- `esabcc-flowchart-registry:<project>`, `esabcc-framework-board-report:<id>`),
-- so the client can keep localStorage as a synchronous cache while the DB is the
-- shared source of truth — hydrated on mount and written through on every edit.
--
-- Public read; writes go through the service role in the API route. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_flowchart_state (
  project_id   text not null,
  storage_key  text not null,
  data         jsonb not null,
  updated_at   timestamptz not null default now(),
  primary key (project_id, storage_key)
);

create index if not exists idx_pw_flowchart_state_project on public.pw_flowchart_state (project_id);

alter table public.pw_flowchart_state enable row level security;

drop policy if exists "Flow-chart state is viewable by everyone" on public.pw_flowchart_state;
create policy "Flow-chart state is viewable by everyone"
  on public.pw_flowchart_state for select using (true);
