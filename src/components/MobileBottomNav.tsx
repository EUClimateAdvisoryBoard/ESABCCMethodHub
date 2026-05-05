'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDevice } from '@/lib/useDevice';

/**
 * Thumb-reachable bottom tab bar for mobile. Appears only on viewports
 * under 768px, hidden entirely on tablets and desktops.
 *
 * Surfaces all six production modules (M·01 References, M·02 Data,
 * M·03 News, M·04 Policy, M·05 Analysis, M·06 Vote) directly in the
 * tab strip. Hub is reachable via the header logo. Beta modules live
 * under `beta/modules/` and are intentionally unreachable from every
 * navigation surface.
 *
 * The component adds `has-bottom-nav` to the body element so page
 * content can reserve space via CSS (see globals.css).
 */

const MODULES = [
  {
    href: '/references',
    label: 'Refs',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 4h10a3 3 0 0 1 3 3v13H7a2 2 0 0 0-2 2z" />
        <path d="M5 4v16" />
        <path d="M9 9h6M9 13h6" />
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
    label: 'Policy',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" />
      </svg>
    ),
  },
  {
    href: '/content-analysis',
    label: 'Analysis',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <circle cx="11" cy="14" r="2.4" />
        <path d="m13 16 2.5 2.5" />
      </svg>
    ),
  },
  {
    href: '/voting',
    label: 'Vote',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    ),
  },
];

export default function MobileBottomNav() {
  const { isMobile, hydrated } = useDevice();
  const pathname = usePathname();

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

  // Prevent hydration flash: only render after client-side mount
  if (!hydrated || !isMobile) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-grey-200 pb-safe"
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-6 h-16">
        {MODULES.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-none transition-colors ${
                active ? 'text-primary' : 'text-tertiary'
              }`}
            >
              <span className={active ? 'text-primary' : 'text-tertiary-dark/80'}>
                {item.icon}
              </span>
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
