import { NextRequest, NextResponse } from 'next/server';
import { approveSubmission } from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const profile = await approveSubmission(params.id);
  if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ profile });
}
