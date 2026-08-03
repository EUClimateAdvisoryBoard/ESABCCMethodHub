# Media Monitoring — functional review (2 August 2026)

Companion to `project-documents/2026-08-02 Media Monitoring Module Overview.pdf`.
Scope: how the module *functions* end to end (data flow, automation, metrics,
UX), as distinct from the code-quality/security review implemented earlier on
branch `claude/media-monitoring-improvements-yqo3dc`.

## What the module functionally does today

- **Press channel.** `/api/media-monitoring/fetch` reads all active rows from
  `media_keywords` (129 keywords across 5 categories and 12 languages, seeded
  by migration 005), queries Google News RSS search (batched OR queries of up
  to 5 keywords per language+country; ESABCC/report keywords and acronyms
  fetched individually), filters results through a 39-domain blocklist and a
  curated 120-outlet allowlist (`OUTLET_REGISTRY`), deduplicates on canonical
  URL, and upserts into `media_articles` with keyword, outlet, country, reach
  and report attribution. Every run is audited in `media_fetch_runs`.
- **Social channel.** LinkedIn posts arrive via the Manifest-V3 browser
  extension or the manual paste form (both through `/social/ingest`,
  secret-protected, fail-closed), or via optional per-author RSS sources.
  Report matching happens at ingest.
- **Reports.** 13 ESABCC reports in `src/data/esabcc-reports.ts`, each with
  2–4 match terms; articles/posts get `matched_report_slugs` at ingest, which
  powers the Reports tab and per-report detail pages.
- **Dashboard.** Five tabs (Overview, Reports, Articles, Social, Keywords)
  under `/beta/media-monitoring`, linked from the hub as module M·13.

## Functional gaps (ranked by impact)

1. **No automation runs the pipeline.** Nothing in `.github/workflows/` or
   `vercel.json` calls the fetch endpoints; the "daily climate & energy news
   summary" commits come from `daily-updates.yml` → `scripts/fetch-news.js`,
   a separate static-JSON news system unrelated to this module. Press data
   refreshes only when a person clicks "Refresh feeds".
2. **Social starts empty.** Migration 008 seeds no social sources (009's
   delete is a no-op — 008 never inserted the rows its comment describes),
   and the ingest endpoint fails closed until `MEDIA_MONITORING_SECRET` is
   set. Without the secret configured in production, the social channel
   captures nothing.
3. **Auth posture is inverted on the cron path.** `GET /fetch` and
   `GET /social/fetch` skip the secret check when the env var is unset
   (fail-open), while the ingest endpoint fails closed — the opposite of what
   you'd want if the secret is ever missing.
4. **"Reach" is misleading at stakeholder level.** `estimated_reach` is the
   outlet's monthly audience applied verbatim to every article, then summed
   into "Total reach" (ten BBC articles ≈ 12B "reach"). It is an outlet
   weight, not readership of the coverage.
5. **Keyword stats inflate for batched queries.** When none of the OR'd
   keywords literally appears in the RSS snippet (common — snippets are
   usually just the title), the article is credited to *all* batched
   keywords (`media-monitoring.ts` fallback), skewing the by-keyword chart.
6. **The allowlist is the volume bottleneck.** `knownOutletsOnly` defaults to
   true, so anything outside the 120-outlet registry is silently dropped
   (drop counts only go to console). This is the likeliest cause of thin
   coverage (migration 005's header: "only 7 articles found in 12 months").
7. **Report matching never re-runs.** `matched_report_slugs` is computed at
   ingest only; articles collected before a report was added to the catalogue
   (e.g. the 2026 adaptation/agri-food reports) never gain its attribution.
8. **Overview is press-only; Social tab is LinkedIn-only.** The analytics
   endpoint queries `media_articles` only, and `loadSocial()` hardcodes
   `platform=linkedin`, so other stored platforms would be invisible.
9. **Social reach is always 0.** Both ingest paths hardcode
   `estimated_reach: 0`; the Reports tab's social reach figure and the Social
   tab's reach sort are non-functional.
10. **Board-member attribution is effectively dead.** Extension/manual
    ingests store `source_id: null` (no author→source lookup), and the RSS
    path that would set it has no seeded sources — so the ★ board-member
    badge/filter rarely applies.
11. **"Last refreshed" banner conflates channels.** `recentRuns` isn't
    filtered by channel and the social route writes counts into
    `articles_found`/`articles_new`, so a social run displays as "X articles".
12. **Provenance labels are wrong.** The hub card and `docs/overview/beta.md`
    say GDELT; the pipeline is Google News RSS.
13. **Keyword seed not fully reproducible.** The original core ESABCC keyword
    rows exist only in the live DB; migrations 004/005 don't recreate them.

## Recommended next steps (as in the presentation)

1. Add a scheduler (GitHub Action or Vercel cron) calling both fetch
   endpoints daily with the secret; make the GET path fail closed.
2. Set `MEDIA_MONITORING_SECRET` in production and roll the key out to the
   comms team via the extension options page.
3. Rework the reach metric (rename to audience-weighted coverage or estimate
   per-article reach); stop summing monthly uniques.
4. Include social posts in the analytics endpoint / Overview tab; drop the
   hardcoded LinkedIn platform filter.
5. Add a re-match script for `matched_report_slugs` to run when the report
   catalogue changes.
6. Revisit the outlet allowlist: keep unknown outlets flagged for triage
   instead of dropping them, and persist drop counts per run.
7. Fix the GDELT label, the run-banner channel mix-up, and commit the core
   keyword seed to a migration.
