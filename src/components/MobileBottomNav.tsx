'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDevice } from '@/lib/useDevice';

/**
 * Thumb-reachable bottom tab bar for mobile. Appears only on viewports
 * under 768px, hidden entirely on tablets and desktops. Shows four primary
 * production modules in the tab strip and a "More" button that opens a
 * bottom sheet with the remaining production routes (no beta links).
 *
 * The four primary tabs are Hub / Data / News / Map; the fifth and later
 * production modules (References, Content Analysis, Sectors) show up in
 * the overflow sheet. Beta modules live under `beta/modules/` and are
 * intentionally unreachable from every navigation surface.
 *
 * The component adds `has-bottom-nav` to the body element so page content
 * can reserve space via CSS (see globals.css).
 */

const PRIMARY = [
  {
    href: '/',
    label: 'Hub',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: '/scenarios',
    label: 'Data',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: '/news-feed',
    label: 'News',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2Z" />
        <path d="M18 9h2v8a2 2 0 0 1-2 2" />
        <path d="M8 9h6M8 13h6M8 17h4" />
      </svg>
    ),
  },
  {
    href: '/policy-navigator',
    label: 'Map',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" />
      </svg>
    ),
  },
];

// Overflow sheet — production modules not surfaced in the primary tab bar,
// plus the global search. Beta modules (Adaptation, Energy System, etc.)
// live under `beta/modules/` and are intentionally unreachable.
const OVERFLOW = [
  { href: '/references',                          label: 'References' },
  { href: '/content-analysis',                    label: 'Content Analysis' },
  { href: '/policy-navigator#sectoral-overview',  label: 'Sectors' },
  { href: '/search',                              label: 'Search' },
];

export default function MobileBottomNav() {
  const { isMobile, hydrated } = useDevice();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Toggle body class so pages can leave room for the bar
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobile && hydrated) {
      document.body.classList.add('has-bottom-nav');
    } else {
      document.body.classList.remove('has-bottom-nav');
    }
    return () => document.body.classList.remove('has-bottom-nav');
  }, [isMobile, hydrated]);

  // Close the "more" sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Prevent hydration flash: only render after client-side mount
  if (!hydrated || !isMobile) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="drawer-backdrop absolute inset-0 z-[60] bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="drawer-panel absolute bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl pb-safe shadow-2xl">
            <div className="flex justify-center pt-2 pb-1">
              <span className="block w-10 h-1 bg-grey-300 rounded-full" />
            </div>
            <div className="px-2 pt-2 pb-4">
              <p className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-wider text-tertiary">
                All modules
              </p>
              <div className="grid grid-cols-2 gap-1">
                {OVERFLOW.map(m => (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-lg text-[14px] font-medium ${
                      isActive(m.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-tertiary-dark active:bg-grey-100'
                    }`}
                  >
                    <span>{m.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-grey-200 pb-safe"
        aria-label="Primary mobile navigation"
      >
        <div className="grid grid-cols-5 h-16">
          {PRIMARY.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-tertiary'
                }`}
              >
                <span className={active ? 'text-primary' : 'text-tertiary-dark/80'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-tertiary transition-colors active:text-primary"
            aria-label="More modules"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
