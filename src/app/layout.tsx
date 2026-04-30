import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { PreferencesProvider } from '@/lib/preferences-context';
import MobileBottomNav from '@/components/MobileBottomNav';
import ConsentBanner from '@/components/ConsentBanner';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import CommandPalette from '@/components/CommandPalette';
import ContextDrawer from '@/components/ContextDrawer';
import ToastHost from '@/components/ui/ToastHost';
import { TooltipProvider } from '@/components/ui/Tooltip';

// Inter Variable via next/font — loaded with display:swap so we never blank
// the page while the font is fetching. The Segoe UI / system stack remains
// the fallback (preserved in globals.css body), so anything that can't reach
// Google Fonts still renders cleanly.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--mh-font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  ),
  title: 'ESABCC Method Hub',
  description: 'Integrated research platform for EU climate policy analysis — European Scientific Advisory Board on Climate Change',
  applicationName: 'ESABCC Method Hub',
  appleWebApp: {
    capable: true,
    title: 'ESABCC Method Hub',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: 'ESABCC Method Hub',
    description: 'Integrated research platform for EU climate policy analysis — European Scientific Advisory Board on Climate Change',
    images: [{ url: '/apple-icon.svg', width: 180, height: 180, alt: 'ESABCC Method Hub' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#3D5265' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Skip-link target for keyboard users (WCAG 2.4.1). The visible only-on-focus
          link sits at the very top of <body>; pressing Tab once exposes it. */}
      <body className="min-h-screen">
        <a href="#main" className="mh-skip-link">Skip to main content</a>
        <AuthProvider>
          <PreferencesProvider>
            {/* Single TooltipProvider at the root so every <Tooltip> /
                <ProvenanceChip> in the app picks up consistent open/close
                timings without re-mounting a Radix provider per page. */}
            <TooltipProvider delayDuration={150} skipDelayDuration={80}>
              {children}
              <MobileBottomNav />
              <ConsentBanner />
              <CommandPalette />
              <ContextDrawer />
              <KeyboardShortcuts />
              <ToastHost />
            </TooltipProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
