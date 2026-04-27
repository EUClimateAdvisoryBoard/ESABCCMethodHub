'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from './NotificationBell';

// NOTE: SiteHeader is the live header since early 2026; this legacy component
// is kept only because a few internal routes still import <Navigation />.
// The list below mirrors SiteHeader: five production modules only. Beta
// modules live under `beta/modules/` and are intentionally unreachable.
const NAV_ITEMS = [
  { href: '/',                 label: 'Method Hub'       },
  { href: '/references',       label: 'References'       },
  { href: '/scenarios',        label: 'Scenarios'        },
  { href: '/news-feed',        label: 'News Feed'        },
  { href: '/policy-navigator', label: 'Policy Navigator' },
  { href: '/content-analysis', label: 'Content Analysis' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, displayName, requireAuth, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Close the mobile drawer on route change.
  useEffect(() => {
    setOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-primary text-white shadow-md pt-safe">
        <div className="max-w-wide mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 font-bold text-base sm:text-lg tracking-tight min-w-0"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="hidden sm:inline truncate">EU Policy Method Hub</span>
            <span className="sm:hidden truncate">Method Hub</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 lg:px-4 py-2 rounded text-xs lg:text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <NotificationBell />

            <div className="relative ml-3">
              {user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm transition"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="max-w-[120px] truncate">
                    {displayName || 'Anonymous'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => requireAuth('Sign in to annotate and comment on policies.')}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm font-medium transition"
                >
                  Sign In
                </button>
              )}
              {showUserMenu && user && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-grey-200 py-1 z-50">
                    <p className="px-4 py-2 text-xs text-tertiary truncate">{user.email}</p>
                    <hr className="border-grey-100" />
                    <button
                      onClick={() => { signOut(); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-tertiary-dark hover:bg-grey-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile controls: bell + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <NotificationBell />
            <button
              className="p-3 -mr-2 touch-target"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
                {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setOpen(false)}
        />
        {/* Panel */}
        <aside
          id="mobile-nav-drawer"
          className={`absolute top-0 right-0 h-full w-[86%] max-w-sm bg-white shadow-2xl
            flex flex-col transform transition-transform duration-250 ease-out ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <div className="flex items-center justify-between px-5 h-14 border-b border-grey-200 bg-primary text-white pt-safe">
            <span className="font-bold tracking-tight">Menu</span>
            <button
              className="p-2 -mr-2 touch-target"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-5 py-4 text-[15px] border-b border-grey-100 ${
                  isActive(item.href)
                    ? 'bg-surface-blue text-primary font-semibold'
                    : 'text-tertiary-dark'
                }`}
              >
                <span>{item.label}</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </nav>

          <div className="border-t border-grey-200 p-5 pb-safe">
            {user ? (
              <>
                <p className="text-xs text-tertiary mb-2 truncate">
                  Signed in as <span className="font-semibold text-tertiary-dark">{displayName || user.email}</span>
                </p>
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="w-full py-3 rounded bg-primary text-white font-medium text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { requireAuth(); setOpen(false); }}
                className="w-full py-3 rounded bg-primary text-white font-medium text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
