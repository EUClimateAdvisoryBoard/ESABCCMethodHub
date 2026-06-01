import { NextRequest, NextResponse } from 'next/server';
import { rejectSubmission } from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
  await rejectSubmission(params.id, undefined, reason);
  return NextResponse.json({ ok: true });
}
