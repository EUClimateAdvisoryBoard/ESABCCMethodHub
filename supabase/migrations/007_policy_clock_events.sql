-- ============================================================================
-- 007 — Policy Clock user-authored events + notifications table
--
-- Persistent backend for dates added through the "Post New" tab on the
-- Secretariat News Feed. Each row represents a single dated event that is
-- merged into the Policy Clock timeline alongside the curated OJ deadlines
-- and the live RSS feed items.
-- ============================================================================

create table if not exists public.policy_clock_events (
  id                text primary key,
  event_date        date not null,
  end_date          date,
  event_time        text,
  title             text not null,
  description       text not null default '',
  category          text not null,
  source_label      text not null default 'User-added',
  source_url        text,
  location          text,
  importance        text not null default 'normal',
  tags              text[] not null default '{}',
  added_by          text not null default '',
  author_id         uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_policy_clock_events_date       on public.policy_clock_events (event_date desc);
create index if not exists idx_policy_clock_events_category   on public.policy_clock_events (category);
create index if not exists idx_policy_clock_events_importance on public.policy_clock_events (importance);

alter table public.policy_clock_events enable row level security;

drop policy if exists "Policy clock events are viewable by everyone" on public.policy_clock_events;
create policy "Policy clock events are viewable by everyone"
  on public.policy_clock_events for select using (true);

drop policy if exists "Authors can delete own policy clock events" on public.policy_clock_events;
create policy "Authors can delete own policy clock events"
  on public.policy_clock_events for delete using (auth.uid() = author_id);

-- Notifications (idempotent)
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'system',
  title       text not null,
  message     text not null default '',
  link        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
