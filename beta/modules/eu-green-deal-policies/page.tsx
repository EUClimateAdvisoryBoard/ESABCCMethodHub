'use client';

/**
 * EU Green Deal Policy Tracker (beta module M·39) — scaffolding.
 *
 * Full implementation lands in a follow-up commit: complete register of the
 * EGDSF legislative initiatives from ETC CE Report 2024/8 Annex 2 (April 2024
 * snapshot), updated to July 2026 with EUR-Lex / legislative-train links and
 * the 2025-26 simplification/omnibus reopenings, plus a Figure-1.2-style
 * chart splitting adopted acts into stable vs reopened.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function EuGreenDealPoliciesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-10 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary-light">
          M·39 — EU Green Deal Policy Tracker (beta)
        </p>
        <h1 className="mt-1 text-2xl font-bold text-tertiary-dark">
          EGDSF legislative initiatives — adopted, ongoing, planned, reopened
        </h1>
        <p className="mt-3 max-w-text text-sm leading-relaxed text-tertiary">
          Data collection in progress — the AI research pass over ETC CE Report 2024/8
          Annex 2 and the 2025-26 simplification agenda is running. This page is a
          placeholder so the route compiles; the tracker ships in the next commit.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
