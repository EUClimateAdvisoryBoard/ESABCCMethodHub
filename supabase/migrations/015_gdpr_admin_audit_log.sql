-- ============================================================================
-- 015 — GDPR: tamper-resistant audit log of admin actions
--
-- GDPR Art. 5(2) (accountability) requires the controller to demonstrate
-- compliance. Sensitive operations (granting / revoking admin roles,
-- scheduling deletions, immediate erasures, retention purges) need a
-- per-action record with actor, target, action, and timestamp.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_actor   on public.admin_audit_log(actor_id);
create index if not exists idx_admin_audit_target  on public.admin_audit_log(target_type, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admin audit log is viewable by admins" on public.admin_audit_log;
create policy "Admin audit log is viewable by admins"
  on public.admin_audit_log for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- No insert/update/delete policies: only service-role contexts may write.
