/**
 * Database provider configuration.
 *
 * Controls which backend powers the app's data layer. Today every call site
 * still imports Supabase directly — this module only exposes the flag and
 * connection strings so we can wire a self-hosted Postgres path in parallel
 * and cut over per-surface later without a big-bang refactor.
 *
 * Flag: DB_PROVIDER = "supabase" (default) | "postgres"
 *
 * When switching to "postgres" you must also provide DATABASE_URL. Auth,
 * storage and realtime each have their own flags (AUTH_PROVIDER,
 * STORAGE_PROVIDER, REALTIME_PROVIDER) so they can be migrated
 * independently — e.g. move DB + storage to self-hosted while keeping
 * Supabase Auth until an OIDC/EU-Login replacement is ready.
 */

export type DbProvider = 'supabase' | 'postgres';
export type AuthProvider = 'supabase' | 'oidc';
export type StorageProvider = 'supabase' | 's3';
export type RealtimeProvider = 'supabase' | 'postgres' | 'none';

function readProvider<T extends string>(
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = (process.env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  if (typeof console !== 'undefined') {
    console.warn(
      `[db/config] Unknown ${name}="${raw}"; expected one of ${allowed.join(
        ', ',
      )}. Falling back to "${fallback}".`,
    );
  }
  return fallback;
}

export const dbProvider: DbProvider = readProvider<DbProvider>(
  'DB_PROVIDER',
  ['supabase', 'postgres'] as const,
  'supabase',
);

export const authProvider: AuthProvider = readProvider<AuthProvider>(
  'AUTH_PROVIDER',
  ['supabase', 'oidc'] as const,
  'supabase',
);

export const storageProvider: StorageProvider = readProvider<StorageProvider>(
  'STORAGE_PROVIDER',
  ['supabase', 's3'] as const,
  'supabase',
);

export const realtimeProvider: RealtimeProvider = readProvider<RealtimeProvider>(
  'REALTIME_PROVIDER',
  ['supabase', 'postgres', 'none'] as const,
  'supabase',
);

export const databaseUrl: string | undefined = process.env.DATABASE_URL;

export function isSupabase(): boolean {
  return dbProvider === 'supabase';
}

export function isPostgres(): boolean {
  return dbProvider === 'postgres';
}

export function assertPostgresConfigured(): string {
  if (!databaseUrl) {
    throw new Error(
      'DB_PROVIDER=postgres requires DATABASE_URL to be set (e.g. postgresql://user:pw@host:5432/eu_climate).',
    );
  }
  return databaseUrl;
}
