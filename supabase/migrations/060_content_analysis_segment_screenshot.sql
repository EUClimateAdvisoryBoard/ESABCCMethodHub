-- ─────────────────────────────────────────────────────────────────────────────
-- Captured figure screenshot for content-analysis coded segments.
--
-- A coded segment used to anchor only to text — a verbatim quote plus its
-- block / PDF rectangles. But policy and report PDFs carry their argument in
-- charts and figures as much as in prose, and an analyst tagging "Share of
-- electricity after electrification" wants the *figure itself* attached to the
-- tag, not a caption fragment.
--
-- The "Capture figure" tool in the PDF pane lets the analyst box a chart on the
-- rendered page; the boxed region is cropped from the page canvas to a PNG and
-- stored here as a `data:image/png;base64,…` data-URL. The segment still keeps
-- its `pdf_anchor` (the region rectangle) so the figure is framed on the page
-- and click-to-jump lands on it.
--
-- Nullable + idempotent: text-only segments keep `null`. Writes go through the
-- service role in /api/content-analysis/segments under the existing "public
-- read, service-role write" policy.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_segments
  add column if not exists screenshot text;
