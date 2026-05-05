import Link from 'next/link';
import { ReactNode } from 'react';

/**
 * Minimal per-module hero. Uses the same colour palette as the hub —
 * a small "Back to MethodHub overview" return link, a title with
 * teal underline, and an optional subtitle/metadata row.
 *
 * Responsive:
 *   - Mobile:  tighter vertical padding, smaller title, full-width children
 *   - Tablet:  same layout, slightly larger type
 *   - Desktop: generous padding + wider headline
 */
export default function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)]">
      {/* Skip-link target: any page that ships PageHero gets a #main anchor.
          Hidden visually but reachable by the skip link in the root layout. */}
      <span id="main" tabIndex={-1} className="sr-only" aria-hidden="true">Main content</span>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8 lg:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] sm:text-[13px] text-[#E87722] hover:text-[#c45f14] active:text-[#c45f14] transition mb-3 sm:mb-4 py-1.5 -ml-1 pl-1 min-h-[40px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to MethodHub overview</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <h1 className="text-[20px] xs:text-[22px] sm:text-[24px] lg:text-[30px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)] leading-tight break-words">
          <span className="inline border-b-2 border-[#00928F] pb-1">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-3 sm:mt-4 text-[14px] sm:text-[14px] text-[#3D5265]/80 dark:text-[var(--mh-muted)] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-3 sm:mt-3">{children}</div>}
      </div>
    </section>
  );
}
