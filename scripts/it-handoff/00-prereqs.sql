-- ============================================================================
-- 00-prereqs.sql — Run ONCE as a Postgres superuser on the new instance.
-- Creates the database, enables required extensions, and installs a thin
-- `auth` schema shim so the existing Supabase-style migrations apply
-- unchanged on plain Postgres.
--
-- IT action:   psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -f 00-prereqs.sql
--              where $ADMIN_URL points at the `postgres` maintenance DB,
--              e.g. postgresql://admin@db.internal.example:5432/postgres
-- Idempotent:  safe to re-run.
-- ============================================================================

-- 1) Database ----------------------------------------------------------------
-- \gexec pattern so this file works even if the DB already exists.
select 'create database eu_climate'
where not exists (select 1 from pg_database where datname = 'eu_climate')
\gexec

\connect eu_climate

-- 2) Required extensions -----------------------------------------------------
--   uuid-ossp  → legacy uuid_generate_v4() used in a few older migrations
--   pgcrypto   → gen_random_uuid() used everywhere for PKs
--   pg_trgm    → fuzzy search on references / media articles
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 3) Auth-schema compatibility shim -----------------------------------------
-- The app's existing RLS policies reference `auth.uid()` and `auth.users`,
-- which Supabase ships by default. On a plain Postgres we stub them so the
-- migrations apply without edits. Once the real auth provider (EU Login /
-- OIDC) is wired in, replace this shim with the provider's own schema.
create schema if not exists auth;

create table if not exists auth.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

-- auth.uid() — returns the current authenticated user id. In the shim this
-- reads from a session GUC that the app sets per-request via SET LOCAL.
-- Returning NULL is safe: RLS policies that compare against NULL deny.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

-- 4) Application role (created here so later scripts can grant to it) -------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'eu_climate_app') then
    -- Password is a placeholder; IT replaces via ALTER ROLE before go-live.
    -- NOSUPERUSER NOCREATEDB NOCREATEROLE — least privilege.
    create role eu_climate_app login password 'CHANGE_ME_BEFORE_GO_LIVE'
      nosuperuser nocreatedb nocreaterole noreplication;
  end if;
end $$;

grant connect on database eu_climate to eu_climate_app;
grant usage on schema public to eu_climate_app;
grant usage on schema auth   to eu_climate_app;

-- Future tables created in public/auth inherit these grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to eu_climate_app;
alter default privileges in schema public
  grant usage, select on sequences to eu_climate_app;
alter default privileges in schema auth
  grant select on tables to eu_climate_app;

\echo '00-prereqs.sql complete. Next: run 01-apply-schema.sh'
