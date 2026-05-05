/**
 * POST /api/auth/magic-link  { email }
 * ------------------------------------
 * Sends a Supabase-hosted magic-link email to the given address.
 * Used during development and the prototype phase when
 * `AUTH_PROVIDER=supabase`.
 *
 * On EEA-hosted production (`AUTH_PROVIDER=oidc`), this endpoint is
 * inert — magic-link sign-in is replaced by EU Login / Azure AD.
 * The request returns a 200 regardless of whether the email exists
 * (standard "does not leak account existence" practice).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 });
    }

    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Prefer an explicit, configured site URL so the email link points to the
    // public hostname rather than whatever Host header reached the API route.
    // Falls back to the request origin only when the env var is unset.
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, '');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/profile`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Magic link error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
