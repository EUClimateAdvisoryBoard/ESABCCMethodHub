'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  role: string | null;
  /** Call this to show the login modal — used by components that need auth */
  requireAuth: (reason?: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error?: string }>;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

interface LoginRequest {
  reason?: string;
  resolve: (user: User | null) => void;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, loading: true, displayName: null, role: null,
  requireAuth: async () => null, signOut: async () => {},
  updateDisplayName: async () => ({}), changePassword: async () => ({}),
  refreshProfile: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loginRequest, setLoginRequest] = useState<LoginRequest | null>(null);

  useEffect(() => {
    // GDPR cleanup: erase any persistent guest UUID written by an older
    // build before this fingerprinting pattern was removed.
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('eu-policy-guest-id'); } catch { /* ignore */ }
    }

    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch display name and role when user changes
  const fetchDisplayName = useCallback(async () => {
    if (!user || !supabase) { setDisplayName(null); setRole(null); return; }
    const { data } = await supabase.from('profiles').select('display_name, role').eq('id', user.id).single();
    // GDPR: never fall back to the email local-part — it would leak the
    // email prefix into every comment/annotation byline.
    setDisplayName((data?.display_name as string | null) ?? null);
    setRole(data?.role ?? 'user');
  }, [user]);

  useEffect(() => { fetchDisplayName(); }, [fetchDisplayName]);

  // Resolve pending login request when user signs in
  useEffect(() => {
    if (user && loginRequest) {
      loginRequest.resolve(user);
      setLoginRequest(null);
    }
  }, [user, loginRequest]);

  const requireAuth = useCallback((reason?: string): Promise<User | null> => {
    if (user) return Promise.resolve(user);
    // GDPR: do not synthesise a persistent "guest" identity in localStorage.
    // The previous implementation wrote a UUID to localStorage that survived
    // sessions, effectively fingerprinting the device without consent. If
    // Supabase is not configured the platform is not usable for any feature
    // that needs identity — surface that, do not silently track.
    if (!supabase) {
      // eslint-disable-next-line no-console
      console.warn('Authentication backend is not configured; sign-in required.');
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      setLoginRequest({ reason, resolve });
    });
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setUser(null);
    setSession(null);
    setDisplayName(null);
    setRole(null);
  }, []);

  const updateDisplayName = useCallback(async (name: string): Promise<{ error?: string }> => {
    if (!user || !supabase) return { error: 'Not signed in.' };
    const trimmed = name.trim();
    if (!trimmed) return { error: 'Display name cannot be empty.' };
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
    if (error) return { error: error.message };
    setDisplayName(trimmed);
    return {};
  }, [user]);

  const changePassword = useCallback(async (newPassword: string): Promise<{ error?: string }> => {
    if (!user || !supabase) return { error: 'Not signed in.' };
    if (newPassword.length < 6) return { error: 'Password must be at least 6 characters.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (freshUser) {
      setUser(freshUser);
    }
    await fetchDisplayName();
  }, [fetchDisplayName]);

  const cancelLogin = useCallback(() => {
    loginRequest?.resolve(null);
    setLoginRequest(null);
  }, [loginRequest]);

  return (
    <AuthContext.Provider value={{
      user, session, loading, displayName, role,
      requireAuth, signOut, updateDisplayName, changePassword,
      refreshProfile,
    }}>
      {children}
      {loginRequest && (
        <LoginModal reason={loginRequest.reason} onClose={cancelLogin} />
      )}
    </AuthContext.Provider>
  );
}

// ─── Login Modal ──────────────────────────────────────────────────────────────

function LoginModal({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'magic'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (m: 'login' | 'signup' | 'forgot' | 'magic') => {
    setMode(m); setError(''); setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (!supabase) {
      setError('Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setSubmitting(false);
      return;
    }

    // ── Forgot Password ──
    if (mode === 'forgot') {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to send reset email.'); }
        else { setMessage('If an account exists with this email, you will receive a password reset link.'); }
      } catch { setError('Network error. Please try again.'); }
      setSubmitting(false);
      return;
    }

    // ── Magic Link ──
    if (mode === 'magic') {
      try {
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to send magic link.'); }
        else { setMessage('Check your email! Click the magic link to sign in instantly.'); }
      } catch { setError('Network error. Please try again.'); }
      setSubmitting(false);
      return;
    }

    // ── Sign Up ──
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter your name.');
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setSubmitting(false);
        return;
      }

      // Use server-side signup (auto-confirms, no email verification)
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName: displayName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Account creation failed.');
          setSubmitting(false);
          return;
        }

        // Auto-sign in after successful signup
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError('Account created! Please sign in with your credentials.');
          setMode('login');
        }
        // Auth state listener will close modal automatically
      } catch {
        setError('Network error. Please try again.');
      }
      setSubmitting(false);
      return;
    }

    // ── Sign In ──
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setSubmitting(false); return; }
    setSubmitting(false);
  };

  const title = {
    login: 'Welcome Back',
    signup: 'Create Account',
    forgot: 'Reset Password',
    magic: 'Magic Link Sign In',
  }[mode];

  const subtitle = {
    login: reason || 'Sign in to your ESABCC MethodHub account.',
    signup: reason || 'Join the ESABCC MethodHub community.',
    forgot: 'Enter your email and we\'ll send you a password reset link.',
    magic: 'Enter your email and we\'ll send you a sign-in link. No password needed.',
  }[mode];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Logo / icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#004B7F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {mode === 'magic' ? (
                <>
                  <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5" />
                  <path d="M9 16l-5 5" />
                  <path d="M15 4l-6 6" />
                </>
              ) : mode === 'forgot' ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                  <circle cx="12" cy="16" r="1" />
                </>
              ) : (
                <>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </>
              )}
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-tertiary-dark text-center mb-1">{title}</h2>
        <p className="text-sm text-tertiary text-center mb-6">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-tertiary-dark mb-1.5">Full Name *</label>
              <input type="text" required placeholder="e.g. Maria Schmidt" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-grey-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secondary/40 focus:border-secondary focus:outline-none transition" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-tertiary-dark mb-1.5">Email Address *</label>
            <input type="email" required placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-grey-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secondary/40 focus:border-secondary focus:outline-none transition" />
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-xs font-semibold text-tertiary-dark mb-1.5">Password *</label>
              <input type="password" required placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-grey-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secondary/40 focus:border-secondary focus:outline-none transition" />
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-tertiary-dark mb-1.5">Confirm Password *</label>
              <input type="password" required placeholder="Repeat your password" minLength={6} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-grey-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-secondary/40 focus:border-secondary focus:outline-none transition" />
            </div>
          )}

          {error && <p className="text-xs text-accent-red bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-xs text-secondary bg-green-50 rounded-lg px-3 py-2">{message}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-secondary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-secondary-dark disabled:opacity-50 transition">
            {submitting ? 'Please wait...'
              : mode === 'login' ? 'Sign In'
              : mode === 'signup' ? 'Create Account'
              : mode === 'forgot' ? 'Send Reset Link'
              : 'Send Magic Link'}
          </button>
        </form>

        {/* Forgot password link (only on login) */}
        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button onClick={() => switchMode('forgot')}
              className="text-xs text-tertiary hover:text-secondary transition hover:underline">
              Forgot your password?
            </button>
          </div>
        )}

        {/* Alternative sign-in methods */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-grey-100"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-tertiary/60">or</span></div>
            </div>
            <button
              onClick={() => switchMode('magic')}
              type="button"
              className="mt-3 w-full border border-grey-300 text-tertiary-dark py-2.5 rounded-lg font-medium text-sm hover:bg-grey-50 transition flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Sign in with Magic Link
            </button>
          </div>
        )}

        {/* Mode switching footer */}
        <div className="mt-5 pt-4 border-t border-grey-100">
          <p className="text-xs text-tertiary text-center">
            {mode === 'login' ? (
              <>Don&apos;t have an account? <button onClick={() => switchMode('signup')} className="text-secondary font-semibold hover:underline">Sign up</button></>
            ) : mode === 'signup' ? (
              <>Already have an account? <button onClick={() => switchMode('login')} className="text-secondary font-semibold hover:underline">Sign in</button></>
            ) : (
              <button onClick={() => switchMode('login')} className="text-secondary font-semibold hover:underline">Back to Sign In</button>
            )}
          </p>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-grey-400 hover:text-tertiary-dark transition">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
