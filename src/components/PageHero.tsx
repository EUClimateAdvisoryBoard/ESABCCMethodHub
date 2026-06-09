import { ReactNode } from 'react';
import HeroBackButton from './HeroBackButton';

/**
 * Minimal per-module hero. Uses the same colour palette as the hub —
 * a smart "Back" control (returns to the previous view, not always the
 * landing page) plus a MethodHub overview link, a title with a teal
 * underline, and an optional subtitle/metadata row.
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
        <HeroBackButton />
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
