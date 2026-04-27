-- ============================================================================
-- 002 — Inbound emails store
--
-- Persistent backend for the Secretariat News Feed. Every forwarded newsletter
-- (via the Pipedream webhook → /api/inbound-email) is written here so that the
-- feed survives cold starts, redeployments, and is the permanent basis for the
-- monthly Brussels Bulletin.
-- ============================================================================

create table if not exists public.inbound_emails (
  id                text primary key,
  title             text not null,
  summary           text not null default '',
  full_text         text not null default '',
  ai_summary        text,
  detailed_analysis text,
  is_daily_special  boolean not null default false,
  special_kind      text,
  source            text not null default 'email_news_in',
  source_label      text not null default 'Email News-In',
  from_display      text not null default '',
  url               text not null default '#',
  published_date    timestamptz not null default now(),
  received_date     timestamptz not null default now(),
  tags              text[] not null default '{}',
  is_external       boolean not null default true,
  type              text not null default 'newsletter',
  created_at        timestamptz not null default now()
);

alter table public.inbound_emails
  add column if not exists detailed_analysis text,
  add column if not exists is_daily_special  boolean not null default false,
  add column if not exists special_kind      text;

create index if not exists idx_inbound_emails_received   on public.inbound_emails (received_date desc);
create index if not exists idx_inbound_emails_published  on public.inbound_emails (published_date desc);
create index if not exists idx_inbound_emails_daily_special
  on public.inbound_emails (is_daily_special, received_date desc);

alter table public.inbound_emails enable row level security;

drop policy if exists "Inbound emails are viewable by everyone" on public.inbound_emails;
drop policy if exists "Inbound emails are viewable by authenticated users" on public.inbound_emails;
create policy "Inbound emails are viewable by authenticated users"
  on public.inbound_emails for select using (auth.uid() is not null);
