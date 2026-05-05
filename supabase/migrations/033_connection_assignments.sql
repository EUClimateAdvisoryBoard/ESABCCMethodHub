-- Migration 033: connection_assignments
-- Tracks which reviewer a connection has been assigned to for review.
-- Independent of verification status so assignments survive approve/reject actions.

create table if not exists public.connection_assignments (
  connection_id   integer      not null primary key,
  assignee_user_id uuid        references auth.users(id) on delete set null,
  assignee_name   text         not null,
  assigned_by     uuid         references auth.users(id) on delete set null,
  assigned_at     timestamptz  not null default now()
);

alter table public.connection_assignments enable row level security;

-- All authenticated users can read assignments (shared editorial view).
create policy "conn_assign_read" on public.connection_assignments
  for select using (auth.role() = 'authenticated');

-- All authenticated users can insert / update / delete assignments.
create policy "conn_assign_write" on public.connection_assignments
  for all using (auth.role() = 'authenticated');

create index if not exists connection_assignments_assignee_idx
  on public.connection_assignments (assignee_user_id);
