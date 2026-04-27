import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULTS = {
  theme: 'system' as const,
  density: 'comfortable' as const,
  notify_frequency: 'immediate' as const,
  email_digest: false,
  default_citation: 'apa' as const,
  ai_summary_language: 'en' as const,
  onboarding_seen: {} as Record<string, boolean>,
  shortcuts_enabled: true,
  public_profile: false,
};

function tokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) return NextResponse.json({ ...DEFAULTS, anonymous: true });

  const sb = createServerClient(token);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ ...DEFAULTS, anonymous: true });

  const { data } = await sb
    .from('user_preferences')
    .select('*')
    .eq('user_id', u.user.id)
    .maybeSingle();

  return NextResponse.json({ ...DEFAULTS, ...(data || {}) });
}

export async function PUT(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const sb = createServerClient(token);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed: (keyof typeof DEFAULTS)[] = [
    'theme', 'density', 'notify_frequency', 'email_digest',
    'default_citation', 'ai_summary_language', 'onboarding_seen',
    'shortcuts_enabled', 'public_profile',
  ];
  const patch: Record<string, unknown> = { user_id: u.user.id, updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];

  const { data, error } = await sb
    .from('user_preferences')
    .upsert(patch, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...DEFAULTS, ...data });
}
