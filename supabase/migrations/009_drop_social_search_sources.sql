-- ============================================================================
-- 009 — Drop LinkedIn phrase-search sources
--
-- Migration 008 seeded `media_social_sources` rows with source_type='keyword'
-- so the server-side fetcher could run `site:linkedin.com "<phrase>"`
-- queries against Brave / Google News. In practice those search backends
-- only return LinkedIn's stub meta pages ("We cannot provide a description
-- for this page right now") because LinkedIn blocks crawlers from reading
-- post content — the results were garbage.
--
-- The social fetcher now only pulls sources that have an explicit `feed_url`
-- (RSS.app bridges etc.). Post capture happens via the browser extension or
-- the manual-paste form, both posting to /api/media-monitoring/social/ingest.
--
-- This migration drops the now-unused phrase-search rows.
-- ============================================================================

delete from public.media_social_sources
 where source_type = 'keyword';
