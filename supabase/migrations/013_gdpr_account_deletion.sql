-- ============================================================================
-- 013 — GDPR: self-service account deletion with grace period
--
-- GDPR Art. 17 (right to erasure) requires data subjects to be able to
-- request deletion of their own data. The original schema only allowed
-- admins to delete accounts via the auth.admin API.
--
-- This migration introduces a 30-day soft-delete workflow:
--   * users POST  /api/user/delete-request  → row inserted here
--   * users DELETE /api/user/delete-request → cancelled_at set (Art. 17(3)
--     allows the data subject to withdraw the request before erasure)
--   * the weekly retention cron calls process_pending_deletions() which
--     hard-deletes any rows whose scheduled_for is in the past and which
--     have not been cancelled.
-- The grace period gives the user time to recover from accidental requests
-- and gives the controller time to honour any legal-obligation holds.
-- ============================================================================

create table if not exists public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at  timestamptz,
  reason        text default '',
  unique(user_id)
);

alter table public.deletion_requests enable row level security;

drop policy if exists "Deletion requests visible to self" on public.deletion_requests;
create policy "Deletion requests visible to self"
  on public.deletion_requests for select using (auth.uid() = user_id);

drop policy if exists "Deletion requests visible to admins" on public.deletion_requests;
create policy "Deletion requests visible to admins"
  on public.deletion_requests for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists idx_deletion_requests_scheduled
  on public.deletion_requests(scheduled_for) where cancelled_at is null;

create or replace function public.process_pending_deletions()
returns integer as $$
declare
  victim record;
  count_erased integer := 0;
begin
  for victim in
    select id, user_id
      from public.deletion_requests
     where cancelled_at is null
       and scheduled_for <= now()
  loop
    delete from auth.users where id = victim.user_id;
    delete from public.deletion_requests where id = victim.id;
    count_erased := count_erased + 1;
  end loop;
  return count_erased;
end;
$$ language plpgsql security definer;

create or replace function public.purge_expired_personal_data()
returns jsonb as $$
declare
  retain_activity_days  integer := public._gdpr_int_setting('app.activity_log_retention_days', 365);
  retain_inbound_days   integer := public._gdpr_int_setting('app.inbound_email_retention_days', 730);
  deleted_activity      integer := 0;
  deleted_inbound       integer := 0;
  redacted_inbound      integer := 0;
  deleted_users         integer := 0;
begin
  with d as (
    delete from public.activity_log
     where created_at < now() - make_interval(days => retain_activity_days)
     returning 1
  )
  select count(*) into deleted_activity from d;

  with d as (
    delete from public.inbound_emails
     where received_date < now() - make_interval(days => retain_inbound_days)
     returning 1
  )
  select count(*) into deleted_inbound from d;

  with u as (
    update public.inbound_emails
       set from_display = case
             when position('@' in from_display) > 0
               then '<redacted>@' || split_part(split_part(from_display, '@', 2), '>', 1)
             else '<redacted>'
           end
     where received_date < now() - interval '180 days'
       and from_display !~ '^<redacted>'
       and from_display <> ''
     returning 1
  )
  select count(*) into redacted_inbound from u;

  deleted_users := public.process_pending_deletions();

  return jsonb_build_object(
    'deleted_activity_log',       deleted_activity,
    'deleted_inbound_emails',     deleted_inbound,
    'redacted_inbound_senders',   redacted_inbound,
    'erased_users',               deleted_users,
    'activity_retention_days',    retain_activity_days,
    'inbound_retention_days',     retain_inbound_days,
    'ran_at',                     now()
  );
end;
$$ language plpgsql security definer;
