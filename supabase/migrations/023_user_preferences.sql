-- 023_user_preferences.sql
--
-- Per-user UI / UX preferences.
--
-- Backs the /profile/preferences panel and the global PreferencesProvider.
-- All keys default to "system" / "off" so existing users notice no change
-- on rollout. Local-only preferences live in localStorage; this table holds
-- the durable, cross-device subset.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.user_preferences (
  user_id              uuid        primary key references auth.users(id) on delete cascade,
  -- 'system' | 'light' | 'dark'
  theme                text        not null default 'system',
  -- 'comfortable' | 'compact'
  density              text        not null default 'comfortable',
  -- 'immediate' | 'daily' | 'weekly' | 'off'
  notify_frequency     text        not null default 'immediate',
  -- master switch for the (future) email digest cron
  email_digest         boolean     not null default false,
  -- 'apa' | 'chicago' | 'harvard' | 'bibtex' (default M·01 export style)
  default_citation     text        not null default 'apa',
  -- ISO 639-1 language code for AI summaries
  ai_summary_language  text        not null default 'en',
  -- whether the user has dismissed the onboarding tour for each module
  -- shape: { "references": true, "scenarios": false, ... }
  onboarding_seen      jsonb       not null default '{}'::jsonb,
  -- whether keyboard shortcuts are enabled
  shortcuts_enabled    boolean     not null default true,
  -- whether the user has opted into the public contributor leaderboard
  public_profile       boolean     not null default false,
  updated_at           timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users read their own preferences"
  on public.user_preferences;
create policy "Users read their own preferences"
  on public.user_preferences for select using (user_id = auth.uid());

drop policy if exists "Users insert their own preferences"
  on public.user_preferences;
create policy "Users insert their own preferences"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own preferences"
  on public.user_preferences;
create policy "Users update their own preferences"
  on public.user_preferences for update using (user_id = auth.uid());

-- For #18 leaderboard: allow everyone to read display name + role of users
-- who have opted into public profile. We expose this through a SECURITY
-- DEFINER function rather than relaxing RLS on `profiles`.
create or replace function public.user_has_public_profile(uid uuid)
returns boolean
language sql stable
as $$
  select coalesce((select public_profile from public.user_preferences where user_id = uid), false);
$$;
