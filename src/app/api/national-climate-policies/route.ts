/**
 * /api/national-climate-policies — dataset for the National Level Climate
 * Policies beta module.
 *
 *   GET   the last refreshed dataset from Supabase, or `{ dataset: null }`
 *         when no refresh has run yet (the client then falls back to the
 *         committed snapshot in /data/national-climate-policies.json).
 *   POST  refresh: fetch the current CCLW corpus from Climate Policy
 *         Radar's public API, keep the EU-27 entries and persist them to
 *         `public.national_climate_policies_snapshot` (migration 066).
 *
 * The refresh pages through ~50 API requests and typically takes 15–30 s,
 * hence the raised maxDuration. A module-level lock prevents two
 * concurrent refreshes from the same warm lambda.
 */

import { NextResponse } from 'next/server';
import { getStoredDataset, refreshFromClimateLaws } from '@/lib/climate-laws';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface GlobalLock {
  __cclwRefreshInFlight?: boolean;
}
const g = globalThis as unknown as GlobalLock;

export async function GET() {
  const dataset = await getStoredDataset();
  return NextResponse.json({ dataset });
}

export async function POST() {
  if (g.__cclwRefreshInFlight) {
    return NextResponse.json(
      { error: 'A refresh is already running — try again in a minute.' },
      { status: 429 },
    );
  }
  g.__cclwRefreshInFlight = true;
  try {
    const { dataset, persisted } = await refreshFromClimateLaws();
    return NextResponse.json({
      ok: true,
      persisted,
      snapshotDate: dataset.snapshotDate,
      policyCount: dataset.policies.length,
      // When Supabase env vars are absent the refresh still returns the
      // fresh dataset so the page can use it for the current session.
      dataset: persisted ? undefined : dataset,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed' },
      { status: 502 },
    );
  } finally {
    g.__cclwRefreshInFlight = false;
  }
}
