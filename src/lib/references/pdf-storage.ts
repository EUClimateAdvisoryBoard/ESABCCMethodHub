// ---------------------------------------------------------------------------
// PDF storage via Supabase Storage
//
// PDFs for custom references are stored in the public `reference-pdfs`
// bucket.  The bucket has permissive RLS policies (anon + authenticated can
// upload/read/delete) so the client SDK can talk directly to it without an
// extra API hop.
// ---------------------------------------------------------------------------

import { supabase } from '../supabase';

const BUCKET = 'reference-pdfs';

// Sanitize a reference id so it's safe as an object key.  Storage keys must
// be ASCII; we replace anything outside [A-Za-z0-9._-] with `_`.
function safeKey(refId: string): string {
  return refId.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
}

function objectKey(refId: string): string {
  return `${safeKey(refId)}.pdf`;
}

export interface UploadResult {
  ok: boolean;
  publicUrl?: string;
  error?: string;
}

// Upload (or replace) the PDF for a reference.  `data` may be a File from a
// file input, a Blob fetched via the proxy, or an ArrayBuffer.  Returns the
// public URL on success.
export async function uploadPdf(
  refId: string,
  data: Blob | File | ArrayBuffer,
): Promise<UploadResult> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client not configured' };
  }
  const key = objectKey(refId);
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, blob, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { ok: true, publicUrl: publicData.publicUrl };
}

// Delete the PDF for a reference (no-op if it doesn't exist).
export async function deletePdf(refId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client not configured' };
  }
  const key = objectKey(refId);
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Convenience: get the public URL for a ref's PDF without checking if it
// exists.  Use this when you know the upload succeeded.
export function getPdfPublicUrl(refId: string): string | null {
  if (!supabase) return null;
  const key = objectKey(refId);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
