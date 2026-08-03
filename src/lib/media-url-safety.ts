/**
 * Validation for user-supplied feed URLs stored in `media_social_sources`.
 *
 * These URLs are fetched server-side by the social ingestion pipeline, so an
 * unvalidated value is an SSRF vector: it could point the server at cloud
 * metadata endpoints or internal services. Validate at write time (sources
 * API) and again at fetch time (media-social.ts) as defence in depth.
 *
 * Limitation: this checks the URL as written. A public hostname that
 * resolves to a private address (DNS rebinding) is not caught here.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

const BLOCKED_SUFFIXES = ['.internal', '.local', '.localhost'];

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;          // private / loopback / this-net
  if (a === 169 && b === 254) return true;                     // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;            // private
  if (a === 192 && b === 168) return true;                     // private
  if (a === 100 && b >= 64 && b <= 127) return true;           // CGNAT
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h.includes(':')) return false;
  return (
    h === '::' ||
    h === '::1' ||
    h.startsWith('fe80:') || // link-local
    h.startsWith('fc') ||    // unique-local fc00::/7
    h.startsWith('fd') ||
    h.startsWith('::ffff:')  // IPv4-mapped — don't bother parsing, just block
  );
}

export type FeedUrlCheck = { ok: true; url: string } | { ok: false; reason: string };

/**
 * Validate a feed URL before storing or fetching it.
 * Returns the normalised URL string on success.
 */
export function validateFeedUrl(raw: string): FeedUrlCheck {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, reason: 'feed_url is required' };
  if (value.length > 2048) return { ok: false, reason: 'feed_url is too long' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'feed_url is not a valid URL' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'feed_url must use http(s)' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'feed_url must not contain credentials' };
  }

  const host = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTS.has(host) ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s)) ||
    !host.includes('.') ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  ) {
    return { ok: false, reason: 'feed_url host is not allowed' };
  }

  return { ok: true, url: url.toString() };
}
