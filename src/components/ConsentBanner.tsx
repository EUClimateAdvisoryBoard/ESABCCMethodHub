'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'esabcc-consent-v1';

type ConsentState = {
  acknowledged_at: string;
  optional_storage: boolean;
};

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota / privacy mode */ }
}

/**
 * GDPR cookie / local-storage banner.
 *
 * The platform only uses strictly-necessary cookies (Supabase session) by
 * default, so this banner is informational rather than a hard gate. The
 * user explicitly opts in to optional local-storage features (e.g. news
 * feed reading-list state); without that opt-in, those features fall back
 * to in-memory state for the session.
 *
 * The choice is stored in localStorage itself — strictly necessary because
 * persisting "user has acknowledged the notice" is required to honour the
 * notice on subsequent visits.
 */
export default function ConsentBanner() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readConsent());
    setHydrated(true);
  }, []);

  if (!hydrated || state) return null;

  const acceptAll = () => {
    const s: ConsentState = {
      acknowledged_at: new Date().toISOString(),
      optional_storage: true,
    };
    writeConsent(s);
    setState(s);
  };

  const necessaryOnly = () => {
    const s: ConsentState = {
      acknowledged_at: new Date().toISOString(),
      optional_storage: false,
    };
    writeConsent(s);
    setState(s);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie and local-storage notice"
      className="fixed inset-x-0 z-[55] bg-[#3D5265] text-white shadow-2xl bottom-bottom-nav pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-[13px] sm:text-[13px] leading-relaxed text-white/85 sm:max-w-[60ch]">
          <span className="hidden sm:inline">
            The ESABCC Method Hub stores a session cookie so you can stay signed in.
            With your consent, optional UI features (news-feed reading list, Brussels
            Bulletin draft history) also use browser local-storage. AI summarisation
            requires a separate opt-in in your profile.{' '}
          </span>
          <span className="sm:hidden">
            We use a session cookie so you stay signed in. Optional features can also
            use local-storage with your consent.{' '}
          </span>
          <Link href="/legal/cookies" className="underline hover:text-white">
            Cookie notice
          </Link>{' '}
          ·{' '}
          <Link href="/legal/privacy" className="underline hover:text-white">
            Privacy
          </Link>
          .
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={necessaryOnly}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 text-[13px] sm:text-xs font-semibold border border-white/40 rounded hover:bg-white/10 active:bg-white/15 transition min-h-[44px]"
          >
            <span className="sm:hidden">Necessary</span>
            <span className="hidden sm:inline">Necessary only</span>
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 text-[13px] sm:text-xs font-semibold bg-white text-[#3D5265] rounded hover:bg-white/90 active:bg-white/80 transition min-h-[44px]"
          >
            <span className="sm:hidden">Allow all</span>
            <span className="hidden sm:inline">Allow optional</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Read consent state synchronously. Returns null until the user has
 * interacted with the banner. Other components can use this to decide
 * whether to write to localStorage.
 */
export function useConsent(): ConsentState | null {
  const [state, setState] = useState<ConsentState | null>(null);
  useEffect(() => {
    setState(readConsent());
    const handler = () => setState(readConsent());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  return state;
}

export function clearConsent() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
