-- ============================================================================
-- 084 — Media Monitoring read-path performance
--
-- Adds indexes that support the query patterns used by the media-monitoring
-- read endpoints (src/app/api/media-monitoring/*):
--   - articles/route.ts defaults to sorting by (estimated_reach desc,
--     published_at desc); without a matching composite index that sort
--     forces a full table scan once media_articles grows past a few
--     thousand rows.
--   - analytics/route.ts and articles/route.ts both filter/group by
--     outlet_domain; media_articles only had outlet_id (FK) indexed, not the
--     denormalized outlet_domain text column that the app actually queries.
-- ============================================================================

create index if not exists idx_media_articles_reach
  on public.media_articles (estimated_reach desc, published_at desc);

create index if not exists idx_media_articles_outlet_domain
  on public.media_articles (outlet_domain);
