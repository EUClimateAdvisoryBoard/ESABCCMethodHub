/**
 * /api/climate-councils — CRUD for the EU climate councils catalogue.
 *
 *   GET    list all councils (seeds the table on first run if empty)
 *   POST   upsert a single council (create or replace by id)
 *   DELETE remove a council by ?id=...
 *
 * RLS on the underlying Supabase table (033_climate_councils.sql) requires
 * an authenticated user for write operations, so anonymous viewers get the
 * read-only catalogue while signed-in users can edit.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  listCouncils,
  upsertCouncil,
  deleteCouncil,
} from '@/lib/climate-councils-store';
import {
  ClimateCouncil,
  CouncilLevel,
  CouncilStatus,
} from '@/data/climate-councils';

// Custom fields are open-ended key/value pairs added by curators. We
// normalise both keys and values to plain strings, drop blanks, and cap
// the field count so a misuse can't bloat the row.
function sanitizeCustomFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, string> = {};
  let n = 0;
  for (const [rawKey, rawVal] of Object.entries(input as Record<string, unknown>)) {
    const key = String(rawKey).trim().slice(0, 80);
    if (!key) continue;
    const value = rawVal == null ? '' : String(rawVal).slice(0, 4000);
    out[key] = value;
    if (++n >= 40) break;
  }
  return out;
}

const VALID_LEVELS: CouncilLevel[] = ['eu', 'national', 'subnational'];
const VALID_STATUSES: CouncilStatus[] = [
  'active_statutory',
  'active_no_statute',
  'inter_ministerial',
  'partial_proxy',
  'legislated_not_operational',
  'dormant',
  'abolished',
  'none',
];

export async function GET() {
  const councils = await listCouncils();
  return NextResponse.json({ councils, count: councils.length });
}

export async function POST(request: NextRequest) {
  let body: Partial<ClimateCouncil>;
  try {
    body = (await request.json()) as Partial<ClimateCouncil>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (!body.countryCode || !body.countryName || !body.bodyName) {
    return NextResponse.json(
      { error: 'Missing countryCode, countryName, or bodyName' },
      { status: 400 },
    );
  }
  if (body.level && !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json(
      { error: `Invalid level. Allowed: ${VALID_LEVELS.join(', ')}` },
      { status: 400 },
    );
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const council: ClimateCouncil = {
    id: body.id.trim(),
    countryCode: body.countryCode.trim(),
    countryName: body.countryName.trim(),
    bodyName: body.bodyName.trim(),
    bodyOriginal: (body.bodyOriginal || '').trim(),
    level: (body.level || 'national') as CouncilLevel,
    region: (body.region || '').trim(),
    status: (body.status || 'active_statutory') as CouncilStatus,
    established: (body.established || '').trim(),
    statutory: (body.statutory || '').trim(),
    url: (body.url || '').trim(),
    legalBasisUrl: (body.legalBasisUrl || '').trim(),
    notes: (body.notes || '').trim(),
    lat: typeof body.lat === 'number' ? body.lat : 0,
    lon: typeof body.lon === 'number' ? body.lon : 0,
    customFields: sanitizeCustomFields(body.customFields),
  };

  const saved = await upsertCouncil(council);
  return NextResponse.json({ council: saved });
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const ok = await deleteCouncil(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
