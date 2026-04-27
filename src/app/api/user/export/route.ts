import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';

/**
 * GET /api/user/export — GDPR Art. 20 (right to data portability).
 *
 * Returns every row of personal data the platform stores about the
 * authenticated user as a single downloadable JSON file. Auth is the
 * user's own Bearer token; never an admin token (this is a self-service
 * right, not an admin tool).
 *
 * The export is structured (one key per source table) and uses ISO-8601
 * timestamps so it is "structured, commonly used and machine-readable" as
 * Art. 20(1) requires.
 */
export async function GET(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const userId = user.id;

  // Fetch each source in parallel. Service-role client bypasses RLS so we
  // can read across all tables in one go, but we still constrain every
  // query by user_id / added_by so the export only ever contains the
  // requester's own data.
  const [
    profileRes,
    annotationsRes,
    commentsRes,
    activityRes,
    personalReadingRes,
    sharedReadingRes,
    upvotesRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('annotations').select('*').eq('user_id', userId),
    supabase.from('comments').select('*').eq('user_id', userId),
    supabase.from('activity_log').select('*').eq('user_id', userId),
    supabase.from('personal_reading_list').select('*').eq('user_id', userId),
    supabase.from('shared_reading_list').select('*').eq('added_by', userId),
    supabase.from('reading_list_upvotes').select('*').eq('user_id', userId),
  ]);

  const exportPayload = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      gdpr_article: 'Article 20 — right to data portability',
      controller: 'ESABCC Secretariat',
      subject_user_id: userId,
      subject_email: user.email,
      notes: [
        'This file contains every row of personal data the platform stores about you.',
        'Server-generated logs (Vercel access logs, Supabase audit logs) are held by',
        'sub-processors and are not included here — request them via the contact in',
        'the privacy policy.',
      ],
    },
    auth_user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
    },
    profile: profileRes.data ?? null,
    annotations: annotationsRes.data ?? [],
    comments: commentsRes.data ?? [],
    activity_log: activityRes.data ?? [],
    personal_reading_list: personalReadingRes.data ?? [],
    shared_reading_list_contributions: sharedReadingRes.data ?? [],
    reading_list_upvotes: upvotesRes.data ?? [],
  };

  const filename = `esabcc-data-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
