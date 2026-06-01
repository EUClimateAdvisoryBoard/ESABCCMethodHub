import { NextResponse } from 'next/server';
import { loadAllEffectiveProfiles } from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const profiles = await loadAllEffectiveProfiles();
  return NextResponse.json({ profiles });
}
