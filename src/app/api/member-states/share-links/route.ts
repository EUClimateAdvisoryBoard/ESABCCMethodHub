import { NextRequest, NextResponse } from 'next/server';
import {
  createShareLink,
  listShareLinks,
} from '@/lib/country-profiles/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const country = url.searchParams.get('country') ?? undefined;
  const links = await listShareLinks(country ?? undefined);
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.countryCode) {
    return NextResponse.json({ error: 'countryCode required' }, { status: 400 });
  }
  const link = await createShareLink(body);
  const origin = req.headers.get('origin') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.json({
    link,
    url: `${origin}/contribute/${link.token}`,
  });
}
