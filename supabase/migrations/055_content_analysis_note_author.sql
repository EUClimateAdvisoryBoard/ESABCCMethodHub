-- ─────────────────────────────────────────────────────────────────────────────
-- Tag-comment authorship for content-analysis coded segments.
--
-- A coded segment's `note` is the shared "comment on this tag" the whole team
-- can read. Until now it carried no byline, so the segments list couldn't show
-- who left the comment. These columns capture the display name + auth id of
-- whoever last wrote/edited the note, plus the edit timestamp, so the workbench
-- can render "Maria Schmidt · 3 Jun 2026" under each comment.
--
-- The display name is the user-chosen name (never derived from the email
-- local-part), mirroring how comments/annotations already store bylines, so
-- this stays within GDPR data-minimisation.
--
-- Writes go through the service role in /api/content-analysis/segments under
-- the existing "public read, service-role write" policy. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_segments
  add column if not exists note_author     text,
  add column if not exists note_author_id  uuid references auth.users(id) on delete set null,
  add column if not exists note_updated_at timestamptz;
