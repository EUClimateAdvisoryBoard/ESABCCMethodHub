/**
 * Persistent store for the EU climate councils catalogue.
 *
 * Primary backend: Supabase table `public.climate_councils`
 * (see `supabase/migrations/033_climate_councils.sql`).
 *
 * Fallback: in-memory global array seeded from `SEED_COUNCILS`,
 * used only when Supabase env vars are missing (e.g. local dev
 * without `.env.local`, or CI build).
 */

import { getServerSupabase } from './supabase-server';
import { memoryCache, withBackend } from './db/store-factory';
import {
  ClimateCouncil,
  CouncilStatus,
  CouncilLevel,
  SEED_COUNCILS,
} from '@/data/climate-councils';

interface DbRow {
  id: string;
  country_code: string;
  country_name: string;
  body_name: string;
  body_original: string | null;
  level: CouncilLevel;
  region: string | null;
  status: CouncilStatus;
  established: string | null;
  statutory: string | null;
  url: string | null;
  legal_basis_url: string | null;
  notes: string | null;
  lat: number | null;
  lon: number | null;
  custom_fields: Record<string, string> | null;
}

function rowToCouncil(r: DbRow): ClimateCouncil {
  return {
    id: r.id,
    countryCode: r.country_code,
    countryName: r.country_name,
    bodyName: r.body_name,
    bodyOriginal: r.body_original || '',
    level: r.level,
    region: r.region || '',
    status: r.status,
    established: r.established || '',
    statutory: r.statutory || '',
    url: r.url || '',
    legalBasisUrl: r.legal_basis_url || '',
    notes: r.notes || '',
    lat: r.lat ?? 0,
    lon: r.lon ?? 0,
    customFields: r.custom_fields || {},
  };
}

function councilToRow(c: ClimateCouncil): DbRow {
  return {
    id: c.id,
    country_code: c.countryCode,
    country_name: c.countryName,
    body_name: c.bodyName,
    body_original: c.bodyOriginal,
    level: c.level,
    region: c.region,
    status: c.status,
    established: c.established,
    statutory: c.statutory,
    url: c.url,
    legal_basis_url: c.legalBasisUrl,
    notes: c.notes,
    lat: c.lat,
    lon: c.lon,
    custom_fields: c.customFields || {},
  };
}

const cache = memoryCache<ClimateCouncil>(
  '__climateCouncils',
  () => SEED_COUNCILS.map(c => ({ ...c })),
);

interface SeedFlag {
  __climateCouncilsSeeded?: boolean;
}
const g = globalThis as unknown as SeedFlag;

function upsertMemory(c: ClimateCouncil): ClimateCouncil {
  const list = cache.get();
  const idx = list.findIndex(x => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.push(c);
  return c;
}

function deleteMemory(id: string): boolean {
  const before = cache.get().length;
  cache.set(cache.get().filter(c => c.id !== id));
  return cache.get().length < before;
}

/**
 * Ensure the Supabase table is seeded once. Idempotent; uses upsert with
 * `ignoreDuplicates: true` so re-runs don't overwrite curated edits.
 */
async function maybeSeedSupabase(): Promise<void> {
  if (g.__climateCouncilsSeeded) return;
  const sb = getServerSupabase();
  if (!sb) return;

  const { count, error } = await sb
    .from('climate_councils')
    .select('*', { count: 'exact', head: true });
  if (error) return;
  if ((count ?? 0) === 0) {
    const rows = SEED_COUNCILS.map(councilToRow);
    await sb.from('climate_councils').insert(rows);
  }
  g.__climateCouncilsSeeded = true;
}

export async function listCouncils(): Promise<ClimateCouncil[]> {
  return withBackend(
    async (sb) => {
      await maybeSeedSupabase();
      const { data, error } = await sb
        .from('climate_councils')
        .select('*')
        .order('country_name', { ascending: true })
        .order('level', { ascending: true });
      if (!error && data) {
        return (data as DbRow[]).map(rowToCouncil);
      }
      return [...cache.get()];
    },
    () => [...cache.get()],
  );
}

export async function upsertCouncil(c: ClimateCouncil): Promise<ClimateCouncil> {
  return withBackend(
    async (sb) => {
      await maybeSeedSupabase();
      const { data, error } = await sb
        .from('climate_councils')
        .upsert(councilToRow(c), { onConflict: 'id' })
        .select('*')
        .single();
      if (!error && data) return rowToCouncil(data as DbRow);
      // Fallback: update in-memory cache
      return upsertMemory(c);
    },
    () => upsertMemory(c),
  );
}

export async function deleteCouncil(id: string): Promise<boolean> {
  return withBackend(
    async (sb) => {
      await maybeSeedSupabase();
      const { error } = await sb.from('climate_councils').delete().eq('id', id);
      if (!error) return true;
      return deleteMemory(id);
    },
    () => deleteMemory(id),
  );
}
