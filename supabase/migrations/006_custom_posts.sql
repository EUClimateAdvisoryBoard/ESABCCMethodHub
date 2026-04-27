-- ============================================================================
-- 006 — Custom (internal) posts store
--
-- Persistent backend for user-authored internal posts on the Secretariat
-- News Feed (the "Share a New Item" form at /news-feed → Post tab). Before
-- this table, posts were only kept in the browser's localStorage under the
-- key 'nf-custom-items', which meant they disappeared whenever the user
-- cleared storage, switched device, or used a different browser.
-- ============================================================================

create table if not exists public.custom_posts (
  id                text primary key,
  title             text not null,
  summary           text not null default '',
  ai_summary        text,
  source            text not null default 'internal',
  source_label      text not null default 'ESABCC Secretariat',
  url               text not null default '',
  published_date    date not null default current_date,
  added_date        date not null default current_date,
  added_by          text not null default '',
  author_id         uuid references auth.users(id) on delete set null,
  type              text not null default 'internal_note',
  tags              text[] not null default '{}',
  is_external       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_custom_posts_added_date on public.custom_posts (added_date desc);
create index if not exists idx_custom_posts_created    on public.custom_posts (created_at desc);
create index if not exists idx_custom_posts_author     on public.custom_posts (author_id);

alter table public.custom_posts enable row level security;

drop policy if exists "Custom posts are viewable by everyone" on public.custom_posts;
create policy "Custom posts are viewable by everyone"
  on public.custom_posts for select using (true);
