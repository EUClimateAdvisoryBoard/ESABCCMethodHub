/**
 * POST /api/auth/site-logout
 * --------------------------
 * Clears the site-wide access cookie. The next page request will be
 * intercepted by middleware and redirected back to /site-login.
 */
import { NextResponse } from 'next/server';
import { SITE_AUTH_COOKIE } from '@/lib/site-auth';

export const runtime = 'edge';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SITE_AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
