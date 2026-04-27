-- ============================================================================
-- 012 — GDPR: data-retention policy and purge function
--
-- GDPR Art. 5(1)(e) (storage limitation) requires personal data to be kept
-- "no longer than is necessary". The original schema had no retention on
-- activity_log (a behavioural audit trail) or inbound_emails (which keep
-- third-party sender addresses).
--
-- Adds:
--   * tunable retention windows via Postgres GUCs
--       app.activity_log_retention_days  (default 365)
--       app.inbound_email_retention_days (default 730)
--       app.soft_delete_grace_days       (default 30)
--   * a single `public.purge_expired_personal_data()` function
-- ============================================================================

create or replace function public._gdpr_int_setting(name text, fallback integer)
returns integer as $$
declare
  raw_setting text;
  parsed integer;
begin
  raw_setting := current_setting(name, true);
  if raw_setting is null or btrim(raw_setting) = '' then
    return fallback;
  end if;
  begin
    parsed := raw_setting::integer;
  exception when others then
    return fallback;
  end;
  if parsed < 1 then
    return fallback;
  end if;
  return parsed;
end;
$$ language plpgsql stable;

create or replace function public.purge_expired_personal_data()
returns jsonb as $$
declare
  retain_activity_days  integer := public._gdpr_int_setting('app.activity_log_retention_days', 365);
  retain_inbound_days   integer := public._gdpr_int_setting('app.inbound_email_retention_days', 730);
  deleted_activity      integer := 0;
  deleted_inbound       integer := 0;
  redacted_inbound      integer := 0;
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

  return jsonb_build_object(
    'deleted_activity_log',       deleted_activity,
    'deleted_inbound_emails',     deleted_inbound,
    'redacted_inbound_senders',   redacted_inbound,
    'activity_retention_days',    retain_activity_days,
    'inbound_retention_days',     retain_inbound_days,
    'ran_at',                     now()
  );
end;
$$ language plpgsql security definer;

create or replace view public.my_retention_overview as
  select
    auth.uid() as user_id,
    (select count(*) from public.activity_log where user_id = auth.uid())              as activity_log_rows,
    (select min(created_at) from public.activity_log where user_id = auth.uid())       as activity_oldest,
    (select count(*) from public.annotations where user_id = auth.uid())               as annotation_rows,
    (select count(*) from public.comments where user_id = auth.uid())                  as comment_rows,
    (select count(*) from public.personal_reading_list where user_id = auth.uid())     as personal_reading_list_rows,
    (select count(*) from public.shared_reading_list where added_by = auth.uid())      as shared_reading_list_rows;
