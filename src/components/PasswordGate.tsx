'use client';
import { useState, useEffect, ReactNode } from 'react';

const CORRECT_PASSWORD = 'ESABCC192168';
const STORAGE_KEY = 'esabcc-auth-token';

// Routes that bypass password protection (e.g. Word Add-in taskpane)
const PUBLIC_ROUTES = ['/word-addin'];

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip auth for public routes (Word Add-in)
    if (PUBLIC_ROUTES.some(r => window.location.pathname.startsWith(r))) {
      setAuthenticated(true);
      setChecking(false);
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === CORRECT_PASSWORD) {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, CORRECT_PASSWORD);
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#004B7F] to-[#007B6C]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
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
        <div className="relative w-full max-w-md mx-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Logo */}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#3D5265] mb-1.5">
                  Enter Access Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#007B6C]/40 focus:border-[#007B6C] focus:outline-none transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#004B7F] to-[#007B6C] text-white py-3 rounded-lg font-medium text-sm hover:opacity-90 transition shadow-lg"
              >
                Access Method Hub
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

  return <>{children}</>;
}
