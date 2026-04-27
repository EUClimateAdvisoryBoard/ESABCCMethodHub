/**
 * Data-layer entry point.
 *
 * Today this module is intentionally thin: all call sites still import
 * Supabase directly from `@/lib/supabase` and `@/lib/supabase-server`.
 * The purpose is to centralise provider selection so, when we cut over
 * surface-by-surface to self-hosted Postgres, each migration lands here
 * first and the rest of the app keeps working.
 *
 * Migration plan (see scripts/migrate-to-postgres/):
 *   1. dump Supabase → restore to self-hosted Postgres (schema + data)
 *   2. flip DB_PROVIDER=postgres in a staging env
 *   3. run scripts/migrate-to-postgres/verify-parity.mjs to compare row counts
 *   4. port each *-store.ts module behind this entry point, table by table
 *   5. migrate Auth (hardest — replaces Supabase Auth with EU Login / OIDC)
 *   6. migrate Storage (one bucket: `reference-pdfs`) to S3/MinIO
 *   7. migrate the single Realtime subscription in reference-service.ts
 */

export {
  dbProvider,
  authProvider,
  storageProvider,
  realtimeProvider,
  databaseUrl,
  isSupabase,
  isPostgres,
} from './config';

export { getPgPool, closePgPool } from './postgres';
