'use client';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Production modules surfaced in the footer. Beta modules (Brussels Bulletin,
 * Energy System, Media Monitoring, Climate Adaptation/Finance, Maritime &
 * Aviation, FAQ, Fact Sheets) live under `beta/modules/` in the repo and are
 * intentionally not linked here.
 */
const SECTION_MODULES = [
  { href: '/references',       label: 'Reference Manager' },
  { href: '/scenarios',        label: 'Data & Scenario Explorer' },
  { href: '/news-feed',        label: 'Secretariat News' },
  { href: '/policy-navigator', label: 'EU Policy Navigator' },
  { href: '/content-analysis', label: 'Content Analysis' },
];

const SECTION_MORE = [
  { href: '/guide',    label: 'Method guide' },
  { href: '/search',   label: 'Search' },
  { href: '/hub',      label: 'Hub' },
  { href: '/profile',  label: 'Your profile' },
];

interface FooterSectionProps {
  title: string;
  items: { href: string; label: string }[];
}

/**
 * Footer section that renders as a collapsible accordion on mobile and a
 * static list on desktop. Saves a lot of vertical space on phones.
 */
function FooterSection({ title, items }: FooterSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 sm:border-0">
      <button
        type="button"
        className="sm:pointer-events-none sm:cursor-default w-full flex items-center justify-between py-3 sm:py-0 sm:mb-2 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <p className="text-white/90 font-semibold text-[13px] sm:text-[12px]">{title}</p>
        <svg
          className={`sm:hidden transition-transform ${open ? 'rotate-180' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ul
        className={`space-y-2 sm:space-y-1 text-white/60 text-[13px] sm:text-[12px] ${
          open ? 'block pb-4' : 'hidden'
        } sm:block sm:pb-0`}
      >
        {items.map(i => (
          <li key={i.href}>
            <Link href={i.href} className="hover:text-white transition inline-block py-2.5 sm:py-0 min-h-[44px] flex items-center">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="bg-[#3D5265] text-white/80 mt-12 sm:mt-16 pb-safe">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Blurb */}
        <div className="mb-6 sm:mb-0 sm:grid sm:grid-cols-3 sm:gap-6">
          <div className="sm:mb-0 mb-6">
            <p className="text-white font-semibold mb-1 text-[14px] sm:text-[13px]">
              ESABCC Secretariat MethodHub
            </p>
            <p className="text-white/60 leading-relaxed text-[13px] sm:text-[12px]">
              Internal toolbox of the ESABCC Secretariat — built and maintained by <span className="text-white/85">CCE5</span>, packaged for self-hosted deployment on <span className="text-white/85">EEA infrastructure</span>.
            </p>
          </div>
          <FooterSection title="Production modules" items={SECTION_MODULES} />
          <FooterSection title="Utilities" items={SECTION_MORE} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 text-[11px] text-white/50 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between">
          <span>ESABCC Secretariat MethodHub · internal use</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-white/60">
            <Link href="/legal/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/legal/cookies" className="hover:text-white transition">Cookies</Link>
            <Link href="/legal/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/profile" className="hover:text-white transition">Your data</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
