-- ============================================================================
-- 011 — GDPR: stop hard-coding a personal email in source / database
--
-- The original `handle_new_user()` trigger and the bootstrap UPDATE both
-- contained a specific staff member's email. That is:
--   * personal data committed to the git history of every clone (Art. 5(1)(c)
--     data minimisation, Art. 32 confidentiality);
--   * a privilege-bootstrapping mechanism that bypasses any controlled
--     access-grant process.
--
-- The trigger is reduced to a generic "create profile with role=user".
-- Admin bootstrapping is now an explicit operational step driven by the
-- Postgres GUC `app.admin_emails`.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous user'),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.grant_admin_from_setting()
returns integer as $$
declare
  raw_setting text;
  email_list text[];
  updated_count integer;
begin
  raw_setting := current_setting('app.admin_emails', true);
  if raw_setting is null or btrim(raw_setting) = '' then
    return 0;
  end if;

  email_list := string_to_array(lower(raw_setting), ',');
  email_list := array(select btrim(e) from unnest(email_list) as e where btrim(e) <> '');

  with promoted as (
    update public.profiles p
       set role = 'admin'
      from auth.users u
     where p.id = u.id
       and lower(u.email) = any(email_list)
       and p.role <> 'admin'
     returning p.id
  )
  select count(*) into updated_count from promoted;

  return updated_count;
end;
$$ language plpgsql security definer;

-- Run the bootstrap once on migration apply. If the GUC is unset, this is
-- a no-op. IT sets the GUC before applying this migration in production.
select public.grant_admin_from_setting();
