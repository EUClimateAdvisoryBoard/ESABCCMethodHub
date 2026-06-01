import { NextRequest, NextResponse } from 'next/server';
import {
  loadEffectiveProfile,
  saveProfilePatch,
  createSubmission,
} from '@/lib/country-profiles/server';
import type { CountryProfile } from '@/data/country-profiles/_types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const profile = await loadEffectiveProfile(params.code);
  if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    patch?: Partial<CountryProfile>;
    message?: string;
    contributorName?: string;
  };
  if (!body.patch) {
    return NextResponse.json({ error: 'patch required' }, { status: 400 });
  }
  // Main-user edits are auto-approved: record an audit row, then apply.
  const submission = await createSubmission({
    countryCode: params.code,
    source: 'main',
    contributorName: body.contributorName || 'Signed-in user',
    message: body.message,
    patch: body.patch,
  });
  const profile = await saveProfilePatch(params.code, body.patch);
  return NextResponse.json({ profile, submission });
}
