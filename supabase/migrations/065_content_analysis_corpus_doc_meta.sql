-- ─────────────────────────────────────────────────────────────────────────────
-- Self-describing workspace-corpus rows.
--
-- The `content_analysis_corpus` table (migration 062) recorded only
-- (project_id, document_id): which documents belong to a workspace. Rendering
-- the "In this workspace" list then depended on the *viewer* independently
-- resolving each document id to a real document in their own local library /
-- reference list — and when that document hadn't propagated to them yet, the
-- synced membership row had nothing to show, so the workspace looked empty and
-- "not synced".
--
-- This adds a `doc_meta` JSONB column carrying the lightweight, self-describing
-- snapshot of the document (title, kind, source tier and, for references,
-- author/year/type) captured when it was added. The list row can now render
-- directly from the corpus row for every collaborator, regardless of whether
-- the heavy document substrate has reached them. The full text/blocks still
-- load on demand when the document is opened.
--
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_corpus
  add column if not exists doc_meta jsonb;
