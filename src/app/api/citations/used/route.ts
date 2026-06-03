/**
 * Citation Usage Log — POST/GET /api/citations/used.
 * --------------------------------------------------
 * Records every reference inserted into a Word document so we can answer the
 * "what share of references in our reports are EU-funded?" question without
 * having to re-extract DOIs from finished `.docx` files.
 *
 * The Word add-in (and any other client that inserts a citation) calls this
 * endpoint with the reference id and the document key. The DOI and funder
 * array are denormalised onto the row at write time so analytics queries
 * don't have to join across two reference tables (`references` and
 * `custom_references`).
 *
 * Auth model:
 *   - Web flows authenticate via the standard Supabase session (RLS).
 *   - The Word add-in / bridge service uses a shared `BRIDGE_AUTH_TOKEN`
 *     bearer token; when present and valid, this route uses the service-role
 *     client so the bridge does not need a Supabase session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import type { FundingEntry } from '@/lib/references/types';
import { isEuFunder } from '@/lib/references/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UsageBody {
  reference_id?: string;
  document_key?: string;
  doi?: string | null;
  funding?: FundingEntry[] | null;
}

function bridgeAuthorized(req: NextRequest): boolean {
  const token = process.env.BRIDGE_AUTH_TOKEN;
  if (!token) return false;
  const header = req.headers.get('authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim() === token;
}

export async function POST(request: NextRequest) {
  let body: UsageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.reference_id || !body.document_key) {
    return NextResponse.json(
      { error: 'reference_id and document_key are required' },
      { status: 400 },
    );
  }

  const usingBridge = bridgeAuthorized(request);
  const supabase = usingBridge ? createAdminClient() : createServerClient();

  const row = {
    reference_id: body.reference_id,
    document_key: body.document_key,
    doi: body.doi ?? null,
    funding: body.funding && body.funding.length > 0 ? body.funding : null,
  };

  const { data, error } = await supabase
    .from('citations_used')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id, recorded: true }, { status: 201 });
}

interface UsageRow {
  id: string;
  reference_id: string;
  document_key: string;
  doi: string | null;
  funding: FundingEntry[] | null;
  inserted_at: string;
}

// GET /api/citations/used?document_key=… — returns the rows plus a rolled-up
// EU-funded share so dashboards don't have to compute it themselves.
export async function GET(request: NextRequest) {
  const documentKey = request.nextUrl.searchParams.get('document_key');

  const usingBridge = bridgeAuthorized(request);
  const supabase = usingBridge ? createAdminClient() : createServerClient();

  let query = supabase
    .from('citations_used')
    .select('id, reference_id, document_key, doi, funding, inserted_at')
    .order('inserted_at', { ascending: false });
  if (documentKey) query = query.eq('document_key', documentKey);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as UsageRow[];
  const total = rows.length;
  const withFunding = rows.filter(r => Array.isArray(r.funding) && r.funding!.length > 0).length;
  const euFunded = rows.filter(r =>
    Array.isArray(r.funding) && r.funding!.some(isEuFunder),
  ).length;

  return NextResponse.json({
    count: total,
    eu_funded: euFunded,
    with_funding_metadata: withFunding,
    eu_funded_share: total > 0 ? euFunded / total : 0,
    citations: rows,
  });
}
