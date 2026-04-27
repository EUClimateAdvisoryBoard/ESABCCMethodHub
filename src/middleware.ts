import { NextRequest, NextResponse } from 'next/server';

/**
 * GDPR/security middleware.
 *
 * Handles dynamic CORS for /api/* — the Office host set we need to
 * accept (word.office.com, outlook.office.com, *.officeapps.live.com,
 * *.office.microsoft.com) can't be expressed as a single static
 * Access-Control-Allow-Origin value. Origins are matched against an
 * allowlist and reflected back per-request with Vary: Origin so caches
 * stay honest.
 *
 * Localhost is allowed in development so the Word add-in dev build and
 * the main web app can share the API.
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

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    const res = new NextResponse(null, { status: 204 });
    return withCors(req, res);
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return withCors(req, NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
