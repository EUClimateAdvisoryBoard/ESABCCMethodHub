// ---------------------------------------------------------------------------
// Figure (screenshot / image) upload for workspace prose surfaces.
//
// Reuses the existing public `reference-pdfs` Supabase bucket (anon can
// upload/read) under a `summary-figures/` prefix, so no new bucket / RLS
// migration is needed. Returns a public URL the markdown renderer embeds as
// `![figure](url)`.
// ---------------------------------------------------------------------------

import { supabase } from '../supabase';

const BUCKET = 'reference-pdfs';
const PREFIX = 'summary-figures';
const MAX_BYTES = 15 * 1024 * 1024;

function extFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/svg+xml') return 'svg';
  return 'png';
}

export interface FigureUploadResult {
  ok: boolean;
  publicUrl?: string;
  error?: string;
}

export async function uploadFigure(data: Blob): Promise<FigureUploadResult> {
  if (!supabase) return { ok: false, error: 'Image storage is not configured.' };
  if (!data.type.startsWith('image/')) return { ok: false, error: 'Only image files are supported.' };
  if (data.size > MAX_BYTES) return { ok: false, error: 'Image is too large (max 15 MB).' };

  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `${PREFIX}/${id}.${extFor(data.type)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(key, data, {
    contentType: data.type || 'image/png',
    upsert: false,
    cacheControl: '3600',
  });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { ok: true, publicUrl: pub.publicUrl };
}
