/**
 * Site-wide access gate (server-enforced).
 *
 * Replaces the legacy client-side PasswordGate component. The password is
 * read from env (`SITE_PASSWORD`) on the server only — it never reaches
 * the JS bundle. Authentication state is stored in an HttpOnly, SameSite=Lax
 * cookie carrying an HMAC-signed expiry timestamp; verification happens in
 * Edge middleware before any page renders.
 *
 * Edge-runtime safe (uses Web Crypto, no Node `crypto`).
 */

export const SITE_AUTH_COOKIE = 'esabcc_site_auth';
export const SITE_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const DEV_FALLBACK_SECRET = 'dev-only-site-auth-secret-do-not-use-in-prod';

function getSecret(): string {
  const s = process.env.SITE_AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SITE_AUTH_SECRET must be set (>=16 chars) in production');
  }
  return DEV_FALLBACK_SECRET;
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}

export async function issueSiteAuthToken(): Promise<string> {
  const exp = Date.now() + SITE_AUTH_MAX_AGE_SECONDS * 1000;
  const sig = await hmac(String(exp));
  return `${exp}.${sig}`;
}

export async function verifySiteAuthToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expTs = Number(exp);
  if (!Number.isFinite(expTs) || expTs < Date.now()) return false;
  const expected = await hmac(exp);
  return timingSafeEqual(sig, expected);
}

export function checkSitePassword(submitted: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return false;
  if (typeof submitted !== 'string') return false;
  if (submitted.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < submitted.length; i++) {
    diff |= submitted.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
