#!/usr/bin/env node
/**
 * Off-site backup of every content-analysis & project-workspace table.
 * ---------------------------------------------------------------------------
 *
 * Exports the full contents of the Supabase tables that hold the team's
 * hand-made work — coded segments (in-text tags), per-document summaries,
 * general notes, overall tags, the code system, workspace corpus membership,
 * ingested documents, and all pw_* project-workspace tables — so that a
 * Supabase-side incident (accidental deletion, project loss, billing lapse)
 * can never take the work with it.
 *
 * Output: one JSON-Lines file per table (one row per line — git-friendly
 * diffs, stream-friendly restores) plus a manifest.json with row counts.
 * Restore with scripts/restore-content-analysis-backup.mjs, or row-by-row by
 * hand — the files are plain PostgREST rows, nothing proprietary.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
 *     node scripts/backup-content-analysis.mjs [out-dir]
 *
 * (NEXT_PUBLIC_SUPABASE_URL is accepted in place of SUPABASE_URL.)
 *
 * Run automatically every night by .github/workflows/content-analysis-backup.yml,
 * which commits the snapshot to the `data-backups` branch and uploads it as a
 * workflow artifact.
 *
 * Behaviour on failure is deliberately loud: a table that exists but cannot
 * be read aborts the run with exit 1 (a backup that silently skips data is
 * worse than no backup). A table that does not exist yet (its migration
 * hasn't been applied) is recorded as `missing` in the manifest and skipped —
 * that is expected while migrations roll out.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Every durable table behind the content-analysis workbench and the project
// workspace, with its primary-key columns (used as a deterministic paging
// order; PostgREST offset paging is only stable with an explicit order).
const TABLES = {
  // Content analysis — the hand-coded work.
  content_analysis_codes: ['id'],
  content_analysis_segments: ['id'],
  content_analysis_suggestions: ['id'],
  content_analysis_summaries: ['id'],
  content_analysis_notes: ['id'],
  content_analysis_overall_tags: ['document_id', 'code_id'],
  content_analysis_documents: ['id'],
  content_analysis_corpus: ['project_id', 'document_id'],
  content_analysis_outlines: ['project_id'],
  content_analysis_master_tag_status: ['policy_id', 'code_id'],
  content_analysis_project_locks: ['project_id'],
  // Project workspace.
  pw_projects: ['id'],
  pw_modules: ['project_id', 'id'],
  pw_indicators: ['id'],
  pw_indicator_points: ['indicator_id', 'year'],
  pw_recommendations: ['id'],
  pw_recommendation_events: ['id'],
  pw_member_state_cells: ['project_id', 'country_code', 'sector_id'],
  pw_policy_annotations: ['id'],
  pw_indicator_refreshes: ['id'],
  pw_custom_module_content: ['project_id', 'module_id'],
  pw_policy_codes: ['id'],
  pw_indicator_sheets: ['indicator_id'],
  pw_comments: ['id'],
  pw_verifications: ['project_id', 'target_kind', 'target_id', 'user_id'],
  pw_indicator_revisions: ['id'],
  pw_meetings: ['id'],
  pw_meeting_milestones: ['id'],
  pw_project_phases: ['id'],
  pw_flowchart_state: ['project_id', 'storage_key'],
};

const PAGE_SIZE = 500;

const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) {
  console.error(
    'ERROR: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n' +
    'The backup must run with the service-role key so RLS cannot hide rows from it.',
  );
  process.exit(1);
}

const outDir = process.argv[2] || 'backup-out';

/** True for "relation does not exist" — the table's migration hasn't been
 *  applied yet. Anything else is a real failure. */
function isMissingTable(status, bodyText) {
  if (status === 404) return true;
  return /does not exist|PGRST205|42P01/i.test(bodyText);
}

async function fetchPage(table, orderCols, offset) {
  const order = orderCols.map(c => `${c}.asc`).join(',');
  const url = `${baseUrl}/rest/v1/${table}?select=*&order=${order}&limit=${PAGE_SIZE}&offset=${offset}`;
  const resp = await fetch(url, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      prefer: 'count=exact',
    },
  });
  const text = await resp.text();
  if (!resp.ok) {
    if (isMissingTable(resp.status, text)) return { missing: true };
    throw new Error(`${table}: HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }
  // content-range: "0-499/1234" — the total after the slash is the row count
  // the server vouches for; we use it to verify the export is complete.
  const range = resp.headers.get('content-range') || '';
  const total = Number(range.split('/')[1] ?? NaN);
  return { rows: JSON.parse(text), total };
}

async function exportTable(table, orderCols) {
  const rows = [];
  let total = null;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchPage(table, orderCols, offset);
    if (page.missing) return { missing: true };
    if (Number.isFinite(page.total)) total = page.total;
    rows.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
  }
  if (total !== null && rows.length !== total) {
    throw new Error(
      `${table}: exported ${rows.length} rows but the server reports ${total}. ` +
      'Refusing to write an incomplete backup.',
    );
  }
  return { rows };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: baseUrl,
    format: 'jsonl-per-table (PostgREST rows)',
    tables: {},
  };

  let totalRows = 0;
  for (const [table, orderCols] of Object.entries(TABLES)) {
    const result = await exportTable(table, orderCols);
    if (result.missing) {
      console.warn(`~ ${table}: table not present (migration not applied) — skipped`);
      manifest.tables[table] = { rows: 0, missing: true };
      continue;
    }
    const file = join(outDir, `${table}.jsonl`);
    const body = result.rows.map(r => JSON.stringify(r)).join('\n');
    writeFileSync(file, body.length > 0 ? body + '\n' : '');
    manifest.tables[table] = { rows: result.rows.length, bytes: Buffer.byteLength(body) };
    totalRows += result.rows.length;
    console.log(`✓ ${table}: ${result.rows.length} rows`);
  }

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nBackup complete: ${totalRows} rows across ${Object.keys(TABLES).length} tables → ${outDir}/`);
}

main().catch(err => {
  console.error(`BACKUP FAILED: ${err.message}`);
  process.exit(1);
});
