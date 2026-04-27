-- ============================================================================
-- 016 — GDPR: close the admin-bootstrap gap
--
-- Migration 011 moved the admin email allowlist out of source, but left a
-- hole: if a user is created via a path that doesn't go through the app
-- (e.g. the Supabase dashboard), the handle_new_user() trigger only set
-- role='user' and `grant_admin_from_setting()` had to be run manually to
-- promote them. On a fresh database, if nobody runs that function, nobody
-- has admin and there's no recovery from the UI.
--
-- Fix: the trigger itself now consults the same `app.admin_emails` GUC
-- that grant_admin_from_setting() uses, so promotion happens at insert
-- regardless of how the auth.users row was created.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_setting text;
  email_list text[];
  new_role text := 'user';
begin
  raw_setting := current_setting('app.admin_emails', true);
  if raw_setting is not null and btrim(raw_setting) <> '' then
    email_list := array(
      select btrim(e)
        from unnest(string_to_array(lower(raw_setting), ',')) as e
       where btrim(e) <> ''
    );
    if lower(new.email) = any(email_list) then
      new_role := 'admin';
    end if;
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous user'),
    new_role
  );
  return new;
end;
$$ language plpgsql security definer;
