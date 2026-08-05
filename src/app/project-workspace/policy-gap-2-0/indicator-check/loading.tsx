/**
 * Route-level loading skeleton for the Indicator Check dashboard.
 * ----------------------------------------------------------------
 * The page is `force-dynamic` over a Supabase read (`listIndicators`,
 * including a possible `ensureSeedDataFor` backfill write on first load), so
 * a cold connection can leave navigation hanging with no visible feedback.
 * This mirrors the page's own layout (hero, four summary tiles, a card
 * grid) as pulsing placeholders so the shell appears instantly.
 */
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[var(--mh-bg)]">
      <SiteHeader />

      {/* Hero placeholder */}
      <section className="border-b border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 sm:py-8 lg:py-12">
          <div className="h-4 w-20 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
          <div className="mt-4 h-7 w-72 max-w-full animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)] sm:h-8 sm:w-96" />
          <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
          <div className="mt-2 h-4 w-5/6 max-w-2xl animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary tile placeholders */}
        <section aria-hidden className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E6E7E8] p-3 dark:border-[var(--mh-border)]"
            >
              <div className="h-6 w-10 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
            </div>
          ))}
        </section>

        {/* Controls placeholder */}
        <section aria-hidden className="mb-4 flex flex-wrap items-center gap-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-[#F3F5F7] dark:bg-[var(--mh-card)]" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-[#F3F5F7] dark:bg-[var(--mh-card)]" />
          <div className="h-9 w-40 animate-pulse rounded-md bg-[#F3F5F7] dark:bg-[var(--mh-card)]" />
        </section>

        {/* Card placeholders */}
        <section aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#E6E7E8] bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
              <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
              <div className="mt-4 h-8 w-full animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
            </div>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
