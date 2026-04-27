'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * The sectoral policy module has been merged into the EU Policy Navigator
 * and now lives as the "Sectoral overview" section on /policy-navigator.
 * This stub preserves the old URL by redirecting to the merged page.
 */
export default function SectoralPolicyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/policy-navigator#sectoral-overview');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-lg font-bold text-tertiary-dark mb-2">
          Sectoral Policy has moved
        </h1>
        <p className="text-sm text-tertiary mb-4">
          It is now part of the EU Policy Navigator as the “Sectoral overview” section.
        </p>
        <Link
          href="/policy-navigator#sectoral-overview"
          className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
        >
          Continue to EU Policy Navigator →
        </Link>
      </div>
    </div>
  );
}
