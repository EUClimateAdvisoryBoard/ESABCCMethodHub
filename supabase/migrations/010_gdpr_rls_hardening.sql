-- ============================================================================
-- 010 — GDPR: tighten public-read RLS policies
--
-- The original schema used `using (true)` on profiles, annotations, comments,
-- activity_log, reading lists, upvotes and inbound_emails. That allowed any
-- anonymous visitor to read the full behavioural trail of every user — a
-- direct violation of GDPR Art. 5(1)(f) (integrity and confidentiality) and
-- Art. 6 (no lawful basis for public processing of internal staff data).
--
-- Scope: this is an internal ESABCC secretariat tool. There is no legitimate
-- reason for unauthenticated visitors to read user-generated content. All
-- previously-public reads now require an authenticated session.
-- ============================================================================

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Annotations are viewable by everyone" on public.annotations;
drop policy if exists "Annotations are viewable by authenticated users" on public.annotations;
create policy "Annotations are viewable by authenticated users"
  on public.annotations for select
  using (auth.uid() is not null);

drop policy if exists "Custom tags are viewable by everyone" on public.custom_tags;
drop policy if exists "Custom tags are viewable by authenticated users" on public.custom_tags;
create policy "Custom tags are viewable by authenticated users"
  on public.custom_tags for select
  using (auth.uid() is not null);

drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Comments are viewable by authenticated users" on public.comments;
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "Activity log is viewable by everyone" on public.activity_log;
drop policy if exists "Activity log is viewable by self" on public.activity_log;
drop policy if exists "Activity log is viewable by admins" on public.activity_log;
create policy "Activity log is viewable by self"
  on public.activity_log for select
  using (auth.uid() = user_id);
create policy "Activity log is viewable by admins"
  on public.activity_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Shared reading list is viewable by everyone" on public.shared_reading_list;
drop policy if exists "Shared reading list is viewable by authenticated users" on public.shared_reading_list;
create policy "Shared reading list is viewable by authenticated users"
  on public.shared_reading_list for select
  using (auth.uid() is not null);

drop policy if exists "Upvotes are viewable by everyone" on public.reading_list_upvotes;
drop policy if exists "Upvotes are viewable by authenticated users" on public.reading_list_upvotes;
create policy "Upvotes are viewable by authenticated users"
  on public.reading_list_upvotes for select
  using (auth.uid() is not null);

drop policy if exists "Inbound emails are viewable by everyone" on public.inbound_emails;
drop policy if exists "Inbound emails are viewable by authenticated users" on public.inbound_emails;
create policy "Inbound emails are viewable by authenticated users"
  on public.inbound_emails for select
  using (auth.uid() is not null);
