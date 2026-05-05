'use client';
import { useState } from 'react';

export default function LoginForm({ next, hasError }: { next: string; hasError: boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(hasError ? 'Incorrect password. Please try again.' : '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/site-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ password, next }),
      });
      if (res.ok) {
        window.location.assign(next && next.startsWith('/') ? next : '/');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Incorrect password. Please try again.');
      setPassword('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#004B7F] via-[#005a94] to-[#007B6C]">
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="relative w-full max-w-md mx-4 my-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#004B7F] to-[#007B6C] text-white mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#3D5265]">ESABCC Method Hub</h1>
            <p className="text-sm text-[#3D5265]/60 mt-1">
              European Scientific Advisory Board on Climate Change
            </p>
          </div>

          {/* Form posts to the API directly so it works without JS too. */}
          <form
            method="POST"
            action="/api/auth/site-login"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <input type="hidden" name="next" value={next} />
            <div>
              <label htmlFor="password" className="block text-[14px] sm:text-sm font-medium text-[#3D5265] mb-2">
                Enter Access Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                inputMode="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] text-base sm:text-sm focus:ring-2 focus:ring-[#007B6C]/40 focus:border-[#007B6C] focus:outline-none transition"
              />
            </div>

            {error && (
              <p className="text-[13px] sm:text-sm text-red-600 flex items-start gap-1.5" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#004B7F] to-[#007B6C] text-white py-3 min-h-[48px] rounded-lg font-medium text-[14px] sm:text-sm hover:opacity-90 active:opacity-80 transition shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Access Method Hub'}
            </button>
          </form>

          <p className="text-xs text-center text-[#3D5265]/40 mt-6">
            Access restricted to authorized ESABCC personnel
          </p>
        </div>
      </div>
    </div>
  );
}
