import { NextRequest, NextResponse } from 'next/server';
import { SITE_AUTH_COOKIE, verifySiteAuthToken } from '@/lib/site-auth';

/**
 * GDPR/security middleware.
 *
 * Two responsibilities:
 *
 * 1. Site-wide access gate. The legacy `PasswordGate` React component
 *    embedded the password in the client bundle, which leaked it to anyone
 *    who viewed source. This middleware enforces the gate at the edge using
 *    a server-only `SITE_PASSWORD` env var and an HMAC-signed HttpOnly
 *    cookie (see `src/lib/site-auth.ts`). Page requests without a valid
 *    cookie are 302'd to `/site-login`. We intentionally do NOT gate
 *    `/api/*`, `/word-addin/*` or `/word-addin-dist/*` so that webhooks,
 *    cron secrets, and the Office Add-in (loaded by Microsoft Word from a
 *    public URL) keep working — each of those paths has its own auth
 *    mechanism (Bearer secret, RLS, or runs inside Office's sandbox).
 *
 * 2. Dynamic CORS for /api/*. The Office host set we need to accept
 *    (word.office.com, outlook.office.com, *.officeapps.live.com,
 *    *.office.microsoft.com) can't be expressed as a single static
 *    Access-Control-Allow-Origin value. Origins are matched against an
 *    allowlist and reflected back per-request with Vary: Origin so caches
 *    stay honest. Localhost is allowed in development so the Word add-in
 *    dev build and the main web app can share the API.
 */

const OFFICE_HOST_PATTERNS: RegExp[] = [
  /^https:\/\/word\.office\.com$/,
  /^https:\/\/outlook\.office\.com$/,
  /^https:\/\/[a-z0-9-]+\.officeapps\.live\.com$/,
  /^https:\/\/[a-z0-9-]+\.office\.com$/,
  /^https:\/\/[a-z0-9-]+\.office\.microsoft\.com$/,
];

const DEV_HOST_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (OFFICE_HOST_PATTERNS.some((re) => re.test(origin))) return true;
  if (process.env.NODE_ENV !== 'production' && DEV_HOST_PATTERNS.some((re) => re.test(origin))) {
    return true;
  }
  const configured = (process.env.API_EXTRA_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return configured.includes(origin);
}

function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') || '';
  if (isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Cron-Secret',
    );
    res.headers.set('Access-Control-Max-Age', '86400');
  }
  return res;
}

// Path prefixes that bypass the site-wide password gate.
const SITE_AUTH_BYPASS_PREFIXES = [
  '/site-login',
  '/word-addin',         // Office Add-in taskpane (Next route, served to Word)
  '/word-addin-dist',    // Built Office Add-in assets (served from /public)
  '/api/auth/site-login',
  '/api/auth/site-logout',
];

function isSiteAuthBypass(pathname: string): boolean {
  return SITE_AUTH_BYPASS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS for API routes (preflight + actual). API routes are NOT site-gated;
  // each route enforces its own auth (Bearer secret, Supabase JWT, RLS).
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return withCors(req, new NextResponse(null, { status: 204 }));
  }
  if (pathname.startsWith('/api/')) {
    return withCors(req, NextResponse.next());
  }

  // Site-wide access gate for HTML pages.
  if (isSiteAuthBypass(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (await verifySiteAuthToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/site-login', req.url);
  const target = pathname + (req.nextUrl.search || '');
  if (target && target !== '/') loginUrl.searchParams.set('next', target);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every request except Next internals and obvious static assets.
  // The function above further routes API hits to CORS-only handling.
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|webmanifest|js|css|map|woff|woff2|ttf|otf|eot|mp4|webm|mp3|wav|pdf)$).*)',
  ],
};
