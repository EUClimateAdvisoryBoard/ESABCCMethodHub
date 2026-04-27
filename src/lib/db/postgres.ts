/**
 * Self-hosted Postgres pool, lazily constructed.
 *
 * Only instantiated when DB_PROVIDER=postgres. Until then this module is
 * dormant and imports from `pg` are deferred so the package remains
 * optional (only required in the self-hosted deployment target).
 *
 * NEVER import this from client components — it opens a TCP connection.
 */

import { assertPostgresConfigured, isPostgres } from './config';

type PgPool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  end: () => Promise<void>;
};

let cached: PgPool | null = null;

export async function getPgPool(): Promise<PgPool> {
  if (cached) return cached;
  if (!isPostgres()) {
    throw new Error(
      'getPgPool() called while DB_PROVIDER != "postgres". Check your env or guard with isPostgres().',
    );
  }
  const connectionString = assertPostgresConfigured();

  const pgMod = (await import('pg').catch(() => {
    throw new Error(
      'The `pg` package is not installed. Run `npm install pg @types/pg` before enabling DB_PROVIDER=postgres.',
    );
  })) as { Pool: new (cfg: { connectionString: string; ssl?: unknown }) => PgPool };

  const ssl =
    process.env.DATABASE_SSL === 'disable'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' };

  cached = new pgMod.Pool({ connectionString, ssl });
  return cached;
}

export async function closePgPool(): Promise<void> {
  if (cached) {
    await cached.end();
    cached = null;
  }
}
