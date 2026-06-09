#!/usr/bin/env node
/**
 * Compare row counts for every tracked table between Supabase and the
 * self-hosted Postgres target. Run after restore.sh to sanity-check the
 * migration before flipping DB_PROVIDER in staging.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgres://..." DATABASE_URL="postgres://..." \
 *     node scripts/migrate-to-postgres/verify-parity.mjs
 *
 * Exits with code 1 if any table's row count differs.
 */

import pg from 'pg';

const TABLES = [
  'profiles',
  'libraries',
  'library_members',
  'references',
  'annotations',
  'comments',
  'activity_log',
  'custom_tags',
  'custom_posts',
  'inbound_emails',
  'scenario_submissions',
  'notifications',
  'policy_clock_events',
  'media_keywords',
  'media_articles',
  'media_outlets',
  'media_fetch_runs',
  // Content analysis — the team's hand-coded work (segments, summaries,
  // notes, tags, codes, corpus). Losing any of these in a migration means
  // losing analyst contributions, so every one is verified.
  'content_analysis_codes',
  'content_analysis_segments',
  'content_analysis_suggestions',
  'content_analysis_summaries',
  'content_analysis_notes',
  'content_analysis_overall_tags',
  'content_analysis_documents',
  'content_analysis_corpus',
  'content_analysis_outlines',
  'content_analysis_master_tag_status',
  'content_analysis_project_locks',
  // Project workspace.
  'pw_projects',
  'pw_modules',
  'pw_indicators',
  'pw_indicator_points',
  'pw_recommendations',
  'pw_recommendation_events',
  'pw_member_state_cells',
  'pw_policy_annotations',
  'pw_indicator_refreshes',
  'pw_custom_module_content',
  'pw_policy_codes',
  'pw_indicator_sheets',
  'pw_comments',
  'pw_verifications',
  'pw_indicator_revisions',
  'pw_meetings',
  'pw_meeting_milestones',
  'pw_project_phases',
  'pw_flowchart_state',
];

async function countRows(connectionString, label) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const counts = {};
  for (const table of TABLES) {
    try {
      const { rows } = await client.query(`select count(*)::int as n from public."${table}"`);
      counts[table] = rows[0].n;
    } catch (err) {
      counts[table] = `ERR: ${err.message.split('\n')[0]}`;
    }
  }
  await client.end();
  return { label, counts };
}

async function main() {
  const src = process.env.SUPABASE_DB_URL;
  const dst = process.env.DATABASE_URL;
  if (!src || !dst) {
    console.error('Set both SUPABASE_DB_URL (source) and DATABASE_URL (target).');
    process.exit(2);
  }

  const [a, b] = await Promise.all([
    countRows(src, 'supabase'),
    countRows(dst, 'self-hosted'),
  ]);

  let mismatches = 0;
  console.log(`\n${'table'.padEnd(28)} ${'supabase'.padStart(12)} ${'self-hosted'.padStart(14)}  diff`);
  console.log('-'.repeat(70));
  for (const table of TABLES) {
    const s = a.counts[table];
    const t = b.counts[table];
    const same = s === t;
    if (!same) mismatches += 1;
    console.log(
      `${table.padEnd(28)} ${String(s).padStart(12)} ${String(t).padStart(14)}  ${same ? 'ok' : 'MISMATCH'}`,
    );
  }

  if (mismatches > 0) {
    console.error(`\n${mismatches} table(s) disagree. Investigate before flipping DB_PROVIDER.`);
    process.exit(1);
  }
  console.log('\nAll table row counts match. Safe to proceed to a staging cutover.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
