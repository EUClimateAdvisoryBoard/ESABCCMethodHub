'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

/**
 * Site-wide header for MethodHub.
 *
 * Shows only the **five production modules** — beta modules live under
 * `beta/modules/` in the repository and are intentionally unrouted, so they
 * must not appear in navigation. Promoting a beta module to production means
 * `git mv`-ing it back into `src/app/` and re-adding an entry to `MODULES`.
 *
 * Responsive layout:
 * - Desktop (xl+): full module strip on the right.
 * - Tablet (md–xl): condensed pill strip.
 * - Mobile (<md): compact brand + hamburger opening a full-screen drawer
 *   with grouped sections and large tap targets.
 */

interface Module {
  /** Absolute route path, must resolve to a `src/app/…/page.tsx`. */
  href: string;
  /** Full label used in the mobile drawer. */
  label: string;
  /** Shortened label used in the space-constrained desktop/tablet strip. */
  short?: string;
  /** Grouping bucket used only in the mobile drawer accordion. */
  group?: 'core';
  /** Whether the module also renders in the always-visible top bar. */
  topBar?: boolean;
}

const MODULES: Module[] = [
  { href: '/references',       label: 'References',       short: 'References',       group: 'core', topBar: true },
  { href: '/scenarios',        label: 'Data & Scenarios', short: 'Data',             group: 'core', topBar: true },
  { href: '/news-feed',        label: 'News',             short: 'News',             group: 'core', topBar: true },
  { href: '/policy-navigator', label: 'Policy Navigator', short: 'Policy Navigator', group: 'core', topBar: true },
  { href: '/content-analysis', label: 'Content Analysis', short: 'Content Analysis', group: 'core', topBar: true },
  { href: '/voting',           label: 'Voting',           short: 'Voting',           group: 'core', topBar: true },
  { href: '/eu-climate-councils', label: 'EU Climate Councils', short: 'Climate Councils', group: 'core', topBar: true },
];

const TOP_BAR_MODULES = MODULES.filter(m => m.topBar);

const GROUP_LABELS: Record<NonNullable<Module['group']>, string> = {
  core: 'Production modules',
};

/**
 * Charcoal-sketch suitcase-of-tools mark. Unchanged from previous version.
 */
function MethodHubLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 90" className={className} aria-hidden>
      <defs>
        <filter id="mh-charcoal" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="6" />
          <feDisplacementMap in="SourceGraphic" scale="0.9" />
        </filter>
      </defs>
      <g filter="url(#mh-charcoal)" stroke="#3D5265" strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" strokeWidth="2.6">
          <path d="M 40 14 Q 50 5 60 14" />
          <rect x="12" y="18" width="76" height="66" rx="3" />
          <line x1="12" y1="30" x2="88" y2="30" />
          <rect x="28" y="21" width="7" height="9" />
          <rect x="65" y="21" width="7" height="9" />
        </g>
        <g fill="#3D5265" stroke="none" transform="rotate(45 50 56)">
          <path d="M 42 32 L 58 32 L 58 44 L 54 44 L 54 36 L 46 36 L 46 44 L 42 44 Z" />
          <rect x="47" y="42" width="6" height="28" />
          <circle cx="50" cy="74" r="7" />
          <circle cx="50" cy="74" r="3" fill="#FFFFFF" />
        </g>
        <g fill="#3D5265" stroke="none" transform="rotate(-45 50 56)">
          <rect x="44" y="28" width="12" height="16" rx="2" />
          <rect x="44" y="28" width="12" height="16" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="48" y1="30" x2="48" y2="42" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="52" y1="30" x2="52" y2="42" stroke="#FFFFFF" strokeWidth="0.8" />
          <rect x="46" y="44" width="8" height="3" />
          <rect x="48" y="47" width="4" height="28" />
          <path d="M 46 75 L 54 75 L 52 80 L 48 80 Z" />
        </g>
      </g>
    </svg>
  );
}

export default function SiteHeader() {
  const { user, displayName, requireAuth, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [menuOpen]);

  // ESC to close
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href + '/'));

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6E7E8] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 pt-safe">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-[60px] sm:h-[72px] flex items-center gap-3 sm:gap-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group min-w-0">
          <MethodHubLogo className="w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] shrink-0" />
          <span className="text-[11px] sm:text-[13px] leading-[1.15] font-bold text-[#3D5265] whitespace-nowrap">
            <span className="hidden sm:inline">ESABCC Secretariat</span>
            <span className="sm:hidden">ESABCC</span>
            <br />
            <span className="text-[#00928F] group-hover:text-[#007a77] transition-colors">
              MethodHub
            </span>
          </span>
        </Link>

        {/* Desktop module nav */}
        <nav className="hidden xl:flex items-center gap-0.5 ml-auto text-[12px] text-[#3D5265] whitespace-nowrap">
          {TOP_BAR_MODULES.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className={`px-2.5 py-1.5 rounded transition-colors ${
                isActive(m.href)
                  ? 'bg-[#EEF1F2] text-[#00928F] font-semibold'
                  : 'hover:bg-[#EEF1F2] hover:text-[#00928F]'
              }`}
            >
              {m.short || m.label}
            </Link>
          ))}
        </nav>

        {/* Tablet nav — condensed pills, single line */}
        <nav className="hidden md:flex xl:hidden items-center gap-0.5 ml-auto text-[11px] text-[#3D5265] whitespace-nowrap">
          {TOP_BAR_MODULES.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className={`px-1.5 py-1 rounded transition-colors ${
                isActive(m.href)
                  ? 'bg-[#EEF1F2] text-[#00928F] font-semibold'
                  : 'hover:bg-[#EEF1F2] hover:text-[#00928F]'
              }`}
            >
              {m.short || m.label}
            </Link>
          ))}
        </nav>

        {/* Sign in / Profile (desktop/tablet) */}
        <div className="hidden md:flex items-center pl-2 border-l border-[#E6E7E8] gap-2">
          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-[11px] text-[#3D5265] hover:text-[#00928F] transition"
              >
                <span className="w-6 h-6 rounded-full bg-[#007B6C]/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#007B6C]">
                    {(displayName || user.email || '?')[0].toUpperCase()}
                  </span>
                </span>
                {displayName || 'Anonymous'}
              </Link>
              <span className="text-[#E6E7E8]">·</span>
              <button
                onClick={signOut}
                className="text-[11px] text-[#3D5265]/60 hover:text-[#00928F] transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => requireAuth('Sign in to access all features.')}
              className="text-[11px] text-white bg-[#007B6C] hover:bg-[#006B5E] px-3 py-1.5 rounded-lg font-medium transition"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto -mr-1 p-3 rounded-lg active:bg-grey-100 transition touch-target"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="method-hub-drawer"
        >
          <svg width="24" height="24" fill="none" stroke="#3D5265" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer — full-screen slide-in from right */}
      {menuOpen && (
        <div id="method-hub-drawer" className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="drawer-backdrop absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="drawer-panel absolute top-0 right-0 bottom-0 w-[86%] max-w-[360px] bg-white shadow-2xl flex flex-col pt-safe pb-safe">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-[60px] border-b border-grey-200 shrink-0">
              <div className="flex items-center gap-2">
                <MethodHubLogo className="w-[30px] h-[30px]" />
                <span className="text-[12px] font-bold text-[#3D5265] leading-tight">
                  ESABCC
                  <br />
                  <span className="text-[#00928F]">MethodHub</span>
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2.5 -mr-2 rounded-lg active:bg-grey-100 touch-target"
                aria-label="Close menu"
              >
                <svg width="22" height="22" fill="none" stroke="#3D5265" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* Drawer links */}
            <div className="flex-1 overflow-y-auto">
              {(['core'] as const).map(group => {
                const items = MODULES.filter(m => m.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="py-2">
                    <p className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-[0.1em] text-tertiary/70 font-semibold">
                      {GROUP_LABELS[group]}
                    </p>
                    {items.map(m => {
                      const active = isActive(m.href);
                      return (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center justify-between px-5 py-3.5 text-[15px] ${
                            active
                              ? 'text-primary font-semibold bg-primary/5 border-l-[3px] border-primary'
                              : 'text-[#3D5265] active:bg-grey-100 border-l-[3px] border-transparent'
                          }`}
                        >
                          <span>{m.label}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Drawer footer with auth */}
            <div className="border-t border-grey-200 px-5 py-4 shrink-0">
              {user ? (
                <div className="space-y-3">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F9FA] active:bg-grey-100 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#007B6C]/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#007B6C]">
                        {(displayName || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#3D5265] truncate">
                        {displayName || 'Anonymous'}
                      </p>
                      <p className="text-[11px] text-[#3D5265]/50 truncate">{user.email}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D5265" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full py-2.5 text-[12px] font-medium text-[#3D5265] border border-grey-300 rounded-lg active:bg-grey-100"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { requireAuth('Sign in to access all features.'); setMenuOpen(false); }}
                  className="w-full py-3 text-[14px] font-semibold text-white bg-primary rounded-lg active:bg-primary-dark"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
