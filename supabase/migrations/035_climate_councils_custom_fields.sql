-- ============================================================================
-- 035 — climate_councils.custom_fields
--
-- Adds a free-form jsonb column for curator-added key/value pairs.
-- The union of keys used across all rows defines the optional fields
-- offered to every body in the edit UI ("Add field" / "More fields").
-- ============================================================================

alter table public.climate_councils
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;
