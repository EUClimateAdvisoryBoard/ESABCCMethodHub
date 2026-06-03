-- 053_custom_references_tags.sql
-- ---------------------------------------------------------------------------
-- Add a `tags` column to custom_references so free tags and project tags
-- ("project:<report>") persist alongside the reference. This lets the
-- /api/references endpoint and the Word add-in offer a live "project view"
-- (filter the shared library down to one report's literature) without a
-- separate join table. Project membership is encoded inside the tag array
-- via the `project:` prefix — see src/lib/references/projects.ts.

ALTER TABLE custom_references
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index so "which references belong to project X?" stays cheap as the
-- shared library grows.
CREATE INDEX IF NOT EXISTS idx_custom_references_tags
  ON custom_references USING gin (tags);
