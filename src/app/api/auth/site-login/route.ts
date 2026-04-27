/**
 * POST /api/auth/site-login   { password } | form-encoded `password`
 * ------------------------------------------------------------------
 * Server-side check for the site-wide access password. On success,
 * sets an HttpOnly signed cookie that the Edge middleware verifies on
 * every page request. Replaces the old client-side PasswordGate.
 *
 * Accepts JSON or form-encoded bodies so the login page works even
 * without JavaScript (progressive enhancement). When the request is
 * a form submit (no `Accept: application/json`), responds with a 303
 * redirect to the original destination instead of JSON.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  SITE_AUTH_COOKIE,
  SITE_AUTH_MAX_AGE_SECONDS,
  checkSitePassword,
  issueSiteAuthToken,
} from '@/lib/site-auth';

export const runtime = 'edge';

function safeNext(raw: string | null): string {
  if (!raw) return '/';
  // Only allow same-origin relative paths to avoid open-redirect
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  const wantsJson = (req.headers.get('accept') || '').includes('application/json')
    || ct.includes('application/json');

  let password = '';
  let next = '/';
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    password = String(body?.password ?? '');
    next = safeNext(typeof body?.next === 'string' ? body.next : null);
  } else {
    const form = await req.formData();
    password = String(form.get('password') ?? '');
    next = safeNext(form.get('next') ? String(form.get('next')) : null);
  }

  if (!checkSitePassword(password)) {
    // Constant-ish delay to slow down naive brute force
    await new Promise((r) => setTimeout(r, 250));
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
    }
    const back = new URL('/site-login', req.url);
    if (next !== '/') back.searchParams.set('next', next);
    back.searchParams.set('error', '1');
    return NextResponse.redirect(back, { status: 303 });
  }

  const token = await issueSiteAuthToken();
  const res = wantsJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(next, req.url), { status: 303 });

  res.cookies.set(SITE_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SITE_AUTH_MAX_AGE_SECONDS,
  });
  return res;
}
