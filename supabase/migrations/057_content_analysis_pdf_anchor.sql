-- ─────────────────────────────────────────────────────────────────────────────
-- Precise PDF anchor for content-analysis coded segments.
--
-- Until now a passage marked on a rendered PDF page was anchored only to the
-- *enclosing block* (`block_id`), resolved by hit-testing the selection's
-- anchor point against the ingested block bounding boxes. Two problems fell
-- out of that:
--   • the highlight tinted the whole block (paragraph), not the sentence the
--     analyst actually selected — and when the hit-test picked a neighbouring
--     block (common in two-column layouts) the tint landed on the wrong text;
--   • clicking the segment in the sidebar could not jump to the exact spot
--     (and not at all when no block was matched).
--
-- This column stores the exact selection rectangles captured at marking time,
-- in PDF user-space points (the same coordinate space as the block bounding
-- boxes), as `{ "page": <1-indexed>, "rects": [[x, y, w, h], …] }`. The PDF
-- pane renders the highlight over those rectangles and scrolls to them, so a
-- tag sticks to exactly what was selected.
--
-- Nullable + idempotent: legacy segments keep `null` and fall back to the
-- block tint. Writes go through the service role in
-- /api/content-analysis/segments under the existing "public read,
-- service-role write" policy.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_segments
  add column if not exists pdf_anchor jsonb;
