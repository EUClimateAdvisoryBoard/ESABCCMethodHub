#!/usr/bin/env node
/**
 * Restore a content-analysis / project-workspace backup snapshot.
 * ---------------------------------------------------------------------------
 *
 * Counterpart to scripts/backup-content-analysis.mjs. Reads a snapshot
 * directory (one <table>.jsonl per table + manifest.json) and upserts every
 * row back through PostgREST, so it works against Supabase today and against
 * any PostgREST-fronted Postgres (e.g. the future EEA-hosted instance) later.
 *
 * Upserts use `Prefer: resolution=merge-duplicates`, which resolves on the
 * table's primary key: rows that still exist are updated in place, deleted
 * rows are re-created, and rows added after the snapshot are left untouched.
 * The restore is therefore additive — it never deletes anything.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
 *     node scripts/restore-content-analysis-backup.mjs <snapshot-dir> [table ...]
 *
 * With table names given, only those tables are restored (e.g. recover a
 * single accidentally-cleared table without touching the rest).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BATCH = 200;

const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) {
  console.error('ERROR: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error('Usage: node scripts/restore-content-analysis-backup.mjs <snapshot-dir> [table ...]');
  process.exit(1);
}
const only = process.argv.slice(3);

async function upsertBatch(table, rows) {
  const resp = await fetch(`${baseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${table}: HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }
}

async function main() {
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  let restored = 0;
  for (const file of files) {
    const table = file.replace(/\.jsonl$/, '');
    if (only.length > 0 && !only.includes(table)) continue;
    const lines = readFileSync(join(dir, file), 'utf8').split('\n').filter(Boolean);
    const rows = lines.map(l => JSON.parse(l));
    for (let i = 0; i < rows.length; i += BATCH) {
      await upsertBatch(table, rows.slice(i, i + BATCH));
    }
    restored += rows.length;
    console.log(`✓ ${table}: ${rows.length} rows upserted`);
  }
  console.log(`\nRestore complete: ${restored} rows.`);
}

main().catch(err => {
  console.error(`RESTORE FAILED: ${err.message}`);
  process.exit(1);
});
