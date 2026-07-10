'use client';

/**
 * SummerPrepGate — a lightweight client-side password gate for the
 * "Summer Prep" beta module (M · 35, formerly M · 37) and every one of its
 * sub-modules.
 *
 * The Secretariat asked for a single shared passphrase to open the Summer
 * Prep workspace. Because the whole `beta/` tree is an internal prototype
 * surface (no backend auth), this gate is deliberately client-only: it
 * compares the typed passphrase against a constant and, on success, records
 * the unlock in `sessionStorage` so that navigating between the sub-modules
 * (Overview Industry, Policy Gap Tracker, Indicator Check, …) does not
 * re-prompt for the rest of the browser session.
 *
 * This is NOT a security boundary — it keeps casual eyes out of an in-progress
 * working surface, nothing more. Anyone reading the bundle can find the value.
 * Do not put anything genuinely sensitive behind it.
 */

import { useEffect, useState, type ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';

const PASSPHRASE = 'seb1104';
const STORAGE_KEY = 'esabcc-summer-prep-unlocked-v1';

export default function SummerPrepGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  // Read the unlock flag once on mount (client only, avoids SSR mismatch).
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') setUnlocked(true);
    } catch {
      /* private mode / storage disabled — stay locked, allow manual entry */
    }
    setHydrated(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (entry.trim() === PASSPHRASE) {
      setUnlocked(true);
      setError(false);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore persistence failure — the session stays unlocked in memory */
      }
    } else {
      setError(true);
    }
  }

  // Before hydration we render nothing gate-specific to avoid a flash of the
  // lock screen for already-unlocked sessions.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-white dark:bg-[var(--mh-bg)]">
        <SiteHeader />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-16 sm:py-24">
        <div className="w-full rounded-2xl border border-[#E6E7E8] bg-white p-6 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded bg-[#FF9933] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded bg-[#F3F5F7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
              M · 35 — Summer Prep
            </span>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003399] text-[18px] text-white"
            >
              🔒
            </span>
            <h1 className="text-[22px] font-bold leading-tight">Summer Prep</h1>
          </div>
          <p className="mb-5 text-[13px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
            A protected working space bundling the industry &amp; transport prep for the next
            progress report — the Overview Industry surface, the Policy Gap Tracker and three new
            internal notes. Enter the passphrase to continue.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <label className="block text-[12px] font-semibold uppercase tracking-wide text-[#54728C] dark:text-[var(--mh-muted)]">
              Passphrase
              <input
                type="password"
                autoFocus
                value={entry}
                onChange={(e) => {
                  setEntry(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Enter passphrase…"
                className="mt-1 w-full rounded-md border border-[#D6DAE0] bg-white px-3 py-2.5 text-[14px] font-normal normal-case tracking-normal text-[#3D5265] outline-none focus:border-[#00928F] dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]"
                aria-invalid={error}
              />
            </label>
            {error && (
              <p className="text-[12px] font-medium text-[#B83230]">
                That passphrase is not correct. Please try again.
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-[#003399] px-3 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#00287a]"
            >
              Unlock Summer Prep
            </button>
          </form>

          <p className="mt-5 text-[11px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
            This is an internal prototype gate, not a security control. It stays unlocked for the
            rest of this browser session once you enter the passphrase.
          </p>
        </div>
      </main>
    </div>
  );
}
