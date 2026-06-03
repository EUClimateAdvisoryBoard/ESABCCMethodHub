/**
 * Site-wide responsive header with production module navigation, auth controls, and mobile drawer.
 */
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  { href: '/references',        label: 'References',        short: 'References',        group: 'core', topBar: true },
  { href: '/scenarios',         label: 'Data & Scenarios',  short: 'Data',              group: 'core', topBar: true },
  { href: '/news-feed',         label: 'News',              short: 'News',              group: 'core', topBar: true },
  { href: '/policy-navigator',  label: 'Policy Navigator',  short: 'Policy Navigator',  group: 'core', topBar: true },
  { href: '/project-workspace', label: 'Project Workspace', short: 'Project Workspace', group: 'core', topBar: true },
  { href: '/recommendations',   label: 'Recommendations',   short: 'Recommendations',   group: 'core', topBar: true },
  { href: '/voting',            label: 'Voting',            short: 'Voting',            group: 'core', topBar: true },
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Mount flag — drawer is portalled to document.body so we can't render it
  // until after hydration.
  useEffect(() => { setMounted(true); }, []);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open. Uses the scroll-locked utility
  // class (globals.css) so scrollbar width is reserved and no layout shift
  // is visible on desktop browsers.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (menuOpen) {
      document.body.classList.add('scroll-locked');
      return () => { document.body.classList.remove('scroll-locked'); };
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

  const header = (
    <header className="sticky top-0 z-40 border-b border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white/95 dark:bg-[var(--mh-card)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-[var(--mh-card)]/80 pt-[env(safe-area-inset-top)]">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 h-[60px] sm:h-[72px] flex items-center gap-3 sm:gap-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group min-w-0" aria-label="ESABCC MethodHub home">
          <MethodHubLogo className="w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] shrink-0" />
          <span className="text-[11px] sm:text-[13px] leading-[1.15] font-bold text-[#3D5265] dark:text-[var(--mh-fg)] whitespace-nowrap">
            <span className="hidden sm:inline">ESABCC Secretariat</span>
            <span className="sm:hidden">ESABCC</span>
            <br />
            <span className="text-[#00928F] dark:text-[#74CBC8] group-hover:text-[#007a77] transition-colors">
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
          className="md:hidden ml-auto -mr-1 p-3 rounded-lg active:bg-grey-100 dark:active:bg-[var(--mh-border)] transition touch-target text-[#3D5265] dark:text-[var(--mh-fg)]"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="method-hub-drawer"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer is rendered via a portal further below — it must live
          outside this <header>, which has backdrop-blur-md and therefore acts
          as a containing block for any descendant with position: fixed. */}
    </header>
  );

  const drawer = menuOpen && (
    <div id="method-hub-drawer" className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
      <div
        className="drawer-backdrop absolute inset-0 bg-black/40"
        onClick={() => setMenuOpen(false)}
      />
      <div className="drawer-panel absolute top-0 right-0 bottom-0 w-[86%] max-w-[360px] bg-white dark:bg-[var(--mh-card)] text-[#3D5265] dark:text-[var(--mh-fg)] shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-safe">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-[60px] border-b border-grey-200 dark:border-[var(--mh-border)] shrink-0">
              <div className="flex items-center gap-2">
                <MethodHubLogo className="w-[30px] h-[30px]" />
                <span className="text-[12px] font-bold leading-tight">
                  ESABCC
                  <br />
                  <span className="text-[#00928F] dark:text-[#74CBC8]">MethodHub</span>
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2.5 -mr-2 rounded-lg active:bg-grey-100 dark:active:bg-[var(--mh-border)] touch-target text-[#3D5265] dark:text-[var(--mh-fg)]"
                aria-label="Close menu"
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center justify-between px-5 py-4 text-[15px] min-h-[52px] ${
                            active
                              ? 'text-primary dark:text-secondary-lighter font-semibold bg-primary/5 dark:bg-secondary/15 border-l-[3px] border-primary dark:border-secondary'
                              : 'text-[#3D5265] dark:text-[var(--mh-fg)] active:bg-grey-100 dark:active:bg-[var(--mh-border)] border-l-[3px] border-transparent'
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
            <div className="border-t border-grey-200 dark:border-[var(--mh-border)] px-5 py-4 shrink-0">
              {user ? (
                <div className="space-y-3">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F9FA] dark:bg-[var(--mh-bg)] active:bg-grey-100 dark:active:bg-[var(--mh-border)] transition min-h-[60px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#007B6C]/10 dark:bg-secondary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#007B6C] dark:text-secondary-lighter">
                        {(displayName || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#3D5265] dark:text-[var(--mh-fg)] truncate">
                        {displayName || 'Anonymous'}
                      </p>
                      <p className="text-[11px] text-[#3D5265]/50 dark:text-[var(--mh-muted)] truncate">{user.email}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full min-h-[44px] py-2.5 text-[13px] font-medium text-[#3D5265] dark:text-[var(--mh-fg)] border border-grey-300 dark:border-[var(--mh-border)] rounded-lg active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { requireAuth('Sign in to access all features.'); setMenuOpen(false); }}
                  className="w-full min-h-[48px] py-3 text-[14px] font-semibold text-white bg-primary rounded-lg active:bg-primary-dark"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
  );

  return (
    <>
      {header}
      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
