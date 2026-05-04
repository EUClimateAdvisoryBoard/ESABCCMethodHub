/**
 * Standalone layout for the public ballot route.
 *
 * Externals reaching `/vote/<token>` see ONLY this subtree — no SiteHeader,
 * no SiteFooter, no module navigation, no consent banner pointing back into
 * the Hub. The root layout already strips Method Hub chrome on /vote/* via
 * `MethodHubChrome`; this file just adds a minimal wrapper.
 *
 * We also opt this whole subtree out of indexing.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ballot — ESABCC',
  robots: { index: false, follow: false, nocache: true },
};

export default function PublicVoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#3D5265] antialiased">
      <main id="main" className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {children}
      </main>
    </div>
  );
}
