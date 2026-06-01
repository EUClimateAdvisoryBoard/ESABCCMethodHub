import { NextRequest, NextResponse } from 'next/server';
import { listSubmissions } from '@/lib/country-profiles/server';
import type { CountryProfileSubmission } from '@/data/country-profiles/_types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const countryCode = url.searchParams.get('country') ?? undefined;
  const state = (url.searchParams.get('state') ?? undefined) as
    | CountryProfileSubmission['state']
    | undefined;
  const submissions = await listSubmissions({ countryCode, state });
  return NextResponse.json({ submissions });
}
