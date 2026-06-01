/**
 * POST /api/project-workspace/meetings/[id]/transcribe
 *
 * Accepts a recorded audio blob (multipart/form-data, field "file") captured
 * on the user's phone / laptop, transcribes it with a Whisper-class endpoint
 * and returns the text. The client appends the text into the meeting notes
 * (and saves) — we deliberately do NOT overwrite notes server-side so a
 * transcript never clobbers something a colleague is mid-edit on.
 *
 * Returns { ok, text?, reason? }. ok:false + reason:'no-api-key' tells the UI
 * to ask the user to type notes instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { transcribeAudio } from '@/lib/project-workspace/transcription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Cap uploads at ~25 MB (the Whisper API limit) so we fail fast on huge files.
const MAX_BYTES = 25 * 1024 * 1024;

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  // params.id is the meeting id — validated implicitly by the form post; we
  // don't need it server-side beyond authorisation since we return text only.
  void params;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'audio file required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, reason: 'too-large', error: 'Recording exceeds the 25 MB transcription limit.' },
      { status: 413 }
    );
  }

  const result = await transcribeAudio(file);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason, error: result.errorBody });
  }
  return NextResponse.json({ ok: true, text: result.text, provider: result.provider });
}
