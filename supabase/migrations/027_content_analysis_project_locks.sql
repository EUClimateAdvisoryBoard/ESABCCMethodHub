-- ============================================================================
-- 027 — Project locks (soft-locking for collaborative content analysis)
--
-- Soft locking is the "one editor at a time per project" model. While a
-- holder is in the row, other workbench tabs render the project read-only
-- with a "Request edit access" button.
--
-- Lifecycle:
--   • Acquire — POST /api/content-analysis/locks  (insert if no row, or
--               steal if heartbeat is older than STALE_AFTER_SECONDS).
--   • Heartbeat — PATCH /api/content-analysis/locks every ~30s while the
--               editor tab is alive. Updates `heartbeat_at`.
--   • Release — DELETE /api/content-analysis/locks (sendBeacon on tab
--               close), or implicit when heartbeat times out.
--
-- The table is intentionally tiny (one row per project at most). It does
-- not store edit history — every successful mutation already lands in
-- the existing content_analysis_segments / content_codes tables.
-- ============================================================================

create table if not exists public.content_analysis_project_locks (
  project_id   text primary key,
  -- Stable per-browser identifier from the client. Today the workbench
  -- generates a uuid in localStorage and ships it via the X-MH-Client-Id
  -- header; once OIDC lands this column carries the OIDC `sub` instead
  -- (no schema change — same string id semantics).
  holder_id    text not null,
  -- Human label shown in the lock pill ("Alice", "Bob's tablet").
  -- Kept denormalised because there's no users table when the workbench
  -- runs without auth.
  holder_name  text not null,
  acquired_at  timestamptz not null default now(),
  heartbeat_at timestamptz not null default now()
);

create index if not exists idx_ca_locks_heartbeat
  on public.content_analysis_project_locks (heartbeat_at);

alter table public.content_analysis_project_locks enable row level security;

-- Reads are public — every workbench tab needs to see the current holder
-- to decide whether to render the disabled banner. Writes are
-- service-role-only and gated by the API route.
drop policy if exists "Project locks are viewable by everyone"
  on public.content_analysis_project_locks;
create policy "Project locks are viewable by everyone"
  on public.content_analysis_project_locks for select using (true);
