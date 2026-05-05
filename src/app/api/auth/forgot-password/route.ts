/**
 * POST /api/auth/forgot-password  { email }
 * -----------------------------------------
 * Triggers a Supabase-hosted password-reset email for the given
 * address. Used during development when `AUTH_PROVIDER=supabase`.
 *
 * On EEA-hosted production (`AUTH_PROVIDER=oidc`), this endpoint is
 * unreachable — password management belongs to EU Login / Azure AD
 * and is out of MethodHub's scope.
 *
 * Returns 200 regardless of account existence to avoid leaking
 * which emails are registered.
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
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, '');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/profile`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
