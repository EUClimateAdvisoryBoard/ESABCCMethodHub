-- ─────────────────────────────────────────────────────────────────────────────
-- Rich "summary decks" for whole-document content-analysis summaries.
--
-- Migration 054 gave every document a free-text summary. This turns that
-- summary into a little interactive presentation: alongside the plain-text
-- lead (`text`), a summary can now carry an ordered deck of slides — text,
-- SmartArt-style flowcharts and screenshots — stored in `blocks` as JSONB.
--
-- Embedded screenshots make `blocks` heavy, so it is deliberately kept out of
-- the bulk list query (the API selects everything *except* `blocks`) and only
-- fetched on demand when the user opens "Show summary". `block_count` mirrors
-- the number of slides so the list/badge can render without touching `blocks`.
--
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_summaries
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.content_analysis_summaries
  add column if not exists block_count integer not null default 0;
