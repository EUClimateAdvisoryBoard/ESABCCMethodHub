'use client';

/**
 * Wrapper for Method Hub-only chrome (mobile bottom nav, command palette,
 * keyboard shortcuts, the in-app context drawer and the consent banner).
 *
 * These components reveal Method Hub navigation, hotkeys and module names —
 * none of which should leak to externals casting a ballot under /vote/<token>.
 * This wrapper hides every one of them on `/vote/*` so the public ballot
 * page is fully isolated from the rest of the app.
 *
 * The Toast host is always mounted because the ballot page also surfaces
 * success / failure toasts; it shows nothing about the rest of the Hub.
 */

import { usePathname } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import ConsentBanner from '@/components/ConsentBanner';
import CommandPalette from '@/components/CommandPalette';
import ContextDrawer from '@/components/ContextDrawer';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export default function MethodHubChrome() {
  const pathname = usePathname() ?? '';
  const isPublicBallot = pathname === '/vote' || pathname.startsWith('/vote/');
  if (isPublicBallot) return null;
  return (
    <>
      <MobileBottomNav />
      <ConsentBanner />
      <CommandPalette />
      <ContextDrawer />
      <KeyboardShortcuts />
    </>
  );
}
