/**
 * Shared persistence skeleton for the Secretariat's "Supabase-or-memory"
 * stores — inbound emails, custom posts, climate councils, scenario
 * submissions, policy-clock events and friends.
 *
 * Every one of those stores hand-rolled the same three things:
 *
 *   1. Acquire the server Supabase client (or `null` in local dev / CI
 *      where the env vars are absent).
 *   2. Run the query when a client exists; otherwise fall back to a
 *      module-scoped in-memory array stashed on `globalThis`, so the data
 *      survives Next.js hot-reload within a single warm process.
 *   3. On a Supabase error, log it under a per-store tag and degrade to
 *      the in-memory copy instead of throwing.
 *
 * This module owns *only* that skeleton. It deliberately does NOT try to
 * generate the queries, the row↔domain converters, the dedupe keys or the
 * seeding strategies — those differ enough between stores that hiding them
 * behind a generic abstraction would risk silently changing a data
 * pipeline. Stores keep their bespoke logic and call these helpers for the
 * parts that were genuinely identical, so behaviour is unchanged while the
 * boilerplate disappears.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';

/** True when a durable Supabase backend is configured (vs. memory-only). */
export function isPersistent(): boolean {
  return getServerSupabase() !== null;
}

/**
 * A stable accessor for a module-scoped in-memory array kept on
 * `globalThis` under a unique key. The key must be unique per store (it is
 * the same `__camelCaseName` the stores previously declared by hand). The
 * `seed` factory runs once, the first time the cache is touched in a given
 * process — used by stores that ship with a seed dataset (e.g. climate
 * councils); leave it as the default empty array for write-only feeds.
 */
export function memoryCache<T>(
  key: string,
  seed: () => T[] = () => [],
): {
  get(): T[];
  set(value: T[]): void;
} {
  const g = globalThis as unknown as Record<string, T[] | undefined>;
  if (!g[key]) g[key] = seed();
  return {
    get: () => g[key]!,
    set: (value: T[]) => {
      g[key] = value;
    },
  };
}

/**
 * Run `withClient` when a Supabase backend is configured, otherwise run
 * `fallback`. This mirrors the universal
 *
 *   const sb = getServerSupabase();
 *   if (sb) { …query…; return … }
 *   return memory;
 *
 * shape every store repeated. Crucially, `withClient` still owns its own
 * `{ data, error }` handling and any "log-and-degrade-to-memory" decision,
 * so each store's error semantics stay byte-for-byte what they were — this
 * helper only removes the repeated null-check plumbing.
 */
export async function withBackend<T>(
  withClient: (sb: SupabaseClient) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const sb = getServerSupabase();
  if (sb) return withClient(sb);
  return fallback();
}
