/**
 * POST /api/auth/signup
 * ---------------------
 * Development / prototype sign-up path used when
 * `AUTH_PROVIDER=supabase`. Creates a user row via the service role
 * and, if the email matches the admin allowlist
 * (`isAdminEmail` from `@/lib/admin-emails`), elevates the account.
 *
 * On EEA-hosted production (`AUTH_PROVIDER=oidc`), this route is
 * unreachable — users are provisioned through EU Login / Azure AD
 * at first sign-in and this endpoint is not exposed in the
 * deployed surface.
 *
 * Never log the request body; the email is PII.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';
import { isAdminEmail } from '@/lib/admin-emails';

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Email, password, and display name are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 500 });
    }

    if (!hasServiceRole()) {
      return NextResponse.json({ error: 'Service role key is required for account creation.' }, { status: 500 });
    }

    // Create user with auto-confirm (no email verification)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName.trim() },
    });

    if (error) {
      // Supabase returns 422 for duplicate emails
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Set admin role if the email is in the configured ADMIN_EMAILS allowlist.
    // GDPR: addresses are configured via env var, never hard-coded in source.
    if (data.user && isAdminEmail(email)) {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
