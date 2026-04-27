-- ============================================================================
-- 02-service-accounts.sql — One Postgres role per Method Hub module.
--
-- Why: the Secretariat's spec asks for least-privilege service accounts so a
-- compromise in one module can't reach another module's tables. These roles
-- are the DB-side half; the app-side half (separate connection strings per
-- module) is already wired via DB_PROVIDER=postgres + DATABASE_URL.
--
-- IT action: psql "$ADMIN_URL/eu_climate" -v ON_ERROR_STOP=1 \
--              -f 02-service-accounts.sql
--
-- Before go-live, IT MUST rotate the placeholder passwords:
--   alter role svc_ref_manager   with password '<from vault>';
--   alter role svc_policy_nav    with password '<from vault>';
--   alter role svc_data_explorer with password '<from vault>';
--   alter role svc_news          with password '<from vault>';
-- and store the real values in the ESABCC password vault.
-- ============================================================================

-- Helper: create role if not exists, no password surprises -------------------
do $$
declare
  r text;
begin
  foreach r in array array[
    'svc_ref_manager',
    'svc_policy_nav',
    'svc_data_explorer',
    'svc_news'
  ]
  loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format(
        'create role %I login password %L nosuperuser nocreatedb nocreaterole noreplication',
        r, 'CHANGE_ME_' || upper(r)
      );
    end if;
  end loop;
end $$;

-- Shared grants: connect + schema usage -------------------------------------
grant connect on database eu_climate to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

grant usage on schema public to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

grant usage on schema auth to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

grant select on all tables in schema auth to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

-- ── Module: Reference Manager ────────────────────────────────────
grant select, insert, update, delete on
  public.libraries,
  public.library_members,
  public.references,
  public.csl_styles,
  public.personal_reading_list,
  public.shared_reading_list,
  public.reading_list_upvotes,
  public.inbound_emails
to svc_ref_manager;

-- ── Module: Policy Navigator ─────────────────────────────────────
grant select, insert, update, delete on
  public.annotations,
  public.comments,
  public.custom_tags,
  public.policy_clock_events,
  public.scenario_submissions
to svc_policy_nav;
grant select, update on public.profiles to svc_policy_nav;

-- ── Module: Data Explorer ────────────────────────────────────────
grant select on
  public.scenario_submissions,
  public.profiles
to svc_data_explorer;

-- ── Module: News / Media Monitoring ────────────────────────────────
grant select, insert, update, delete on
  public.media_keywords,
  public.media_outlets,
  public.media_articles,
  public.media_fetch_runs,
  public.media_social_sources,
  public.media_social_posts,
  public.custom_posts,
  public.notifications,
  public.activity_log
to svc_news;

grant usage, select on all sequences in schema public to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

-- Default privileges for future tables (so the next migration "just works")
alter default privileges in schema public grant select, insert, update, delete on tables to svc_ref_manager;
alter default privileges in schema public grant select, insert, update, delete on tables to svc_policy_nav;
alter default privileges in schema public grant select                          on tables to svc_data_explorer;
alter default privileges in schema public grant select, insert, update, delete on tables to svc_news;
alter default privileges in schema public grant usage, select on sequences to
  svc_ref_manager, svc_policy_nav, svc_data_explorer, svc_news;

\echo '02-service-accounts.sql complete. Next: run 03-verify.sh'
