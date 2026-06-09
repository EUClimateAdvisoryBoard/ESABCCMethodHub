// ---------------------------------------------------------------------------
// Durable PDF cache for the content-analysis ingestion pipeline.
//
// The ingest routes cache extracted PDFs under `.cache/content-analysis/`, but
// on Vercel that filesystem is *ephemeral* — it lives only as long as the
// serverless instance that wrote it. A later request to serve the PDF
// (`/api/content-analysis/pdf?celex=…`) almost always lands on a different
// instance with an empty `.cache`, so the PDF pane 404s with
// "Couldn't load PDF. Re-ingest the document." even though the document was
// ingested successfully earlier.
//
// To survive instance recycling we mirror every ingested PDF into durable
// Supabase Storage (the same public `reference-pdfs` bucket the reference
// manager already uses) under a `content-analysis/<celex>.pdf` key, and have
// the PDF route fall back to it whenever the local `.cache` misses.
//
// All operations are best-effort: when Supabase isn't configured (local dev,
// CI, self-hosted Postgres) every function degrades to a no-op / miss and the
// caller keeps relying on the local `.cache` exactly as before.
// ---------------------------------------------------------------------------

import { getServerSupabase } from '@/lib/supabase-server';

// Reuse the reference manager's public bucket so we don't need a second bucket
// provisioned in every environment. Content-analysis PDFs are namespaced under
// a folder so they never collide with reference-id keyed objects.
const BUCKET = 'reference-pdfs';
const PREFIX = 'content-analysis';

/** Storage object key for a celex (or synthetic reference cache key). The
 *  celex is already validated `/^[0-9A-Z]{8,20}$/` by the routes, but we
 *  sanitise defensively so this can never escape the prefix. */
function objectKey(celex: string): string {
  const safe = celex.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
  return `${PREFIX}/${safe}.pdf`;
}

/**
 * Mirror an ingested PDF into durable storage so it outlives the serverless
 * instance that ingested it. Best-effort: failures (and a missing Supabase
 * config) are swallowed because the local `.cache` still serves the PDF for
 * the current instance's lifetime.
 */
export async function putDurablePdf(
  celex: string,
  bytes: Uint8Array | Buffer | ArrayBuffer,
): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) return;
  const body =
    bytes instanceof Buffer
      ? bytes
      : bytes instanceof ArrayBuffer
        ? Buffer.from(bytes)
        : Buffer.from(bytes);
  try {
    await sb.storage.from(BUCKET).upload(objectKey(celex), body, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });
  } catch {
    /* best-effort — the local cache still serves the PDF this session */
  }
}

/**
 * Fetch a previously-ingested PDF back from durable storage. Returns the
 * bytes, or `null` on a miss / when Supabase isn't configured so the caller
 * can fall through to its own 404 handling.
 */
export async function getDurablePdf(celex: string): Promise<Buffer | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.storage.from(BUCKET).download(objectKey(celex));
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}
