import { NextRequest, NextResponse } from 'next/server';
import {
  resolveShareLink,
  revokeShareLink,
  loadEffectiveProfile,
} from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const link = await resolveShareLink(params.token);
  if (!link) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (link.revoked) return NextResponse.json({ error: 'revoked' }, { status: 410 });
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  const profile = await loadEffectiveProfile(link.countryCode);
  return NextResponse.json({ link, profile });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  await revokeShareLink(params.token);
  return NextResponse.json({ ok: true });
}
