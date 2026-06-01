import { NextRequest, NextResponse } from 'next/server';
import {
  resolveShareLink,
  createSubmission,
} from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const link = await resolveShareLink(params.token);
  if (!link) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (link.revoked) return NextResponse.json({ error: 'revoked' }, { status: 410 });
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.patch || !body.contributorName) {
    return NextResponse.json(
      { error: 'patch and contributorName required' },
      { status: 400 },
    );
  }
  const submission = await createSubmission({
    countryCode: link.countryCode,
    source: 'external',
    contributorName: body.contributorName,
    contributorEmail: body.contributorEmail ?? link.contributorEmail,
    message: body.message,
    patch: body.patch,
    shareLinkToken: link.token,
  });
  return NextResponse.json({ submission });
}
