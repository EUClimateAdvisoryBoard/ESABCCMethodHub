'use client';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const apps = [
  {
    id: 'navigator',
    title: 'EU Policy Navigator',
    description: 'Interactive network map of EU climate policies. Explore cross-cutting connections, annotate legislative text, and analyse policy gaps.',
    href: '/policy-navigator',
    color: '#004B7F',
    gradient: 'from-[#004B7F] to-[#007B6C]',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>
    ),
    features: ['97 EU policies mapped', 'Cross-reference analysis', 'Text annotation & tagging', 'Network visualization'],
    status: 'active' as const,
  },
  {
    id: 'scenarios',
    title: 'Data & Scenario Explorer',
    description: 'Eurostat statistics and IPCC / IIASA scenario projections. Compare pathways and their impacts on climate targets.',
    href: '/scenarios',
    color: '#7C3AED',
    gradient: 'from-[#7C3AED] to-[#4F46E5]',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    features: ['Eurostat data explorer', 'IPCC scenario projections', 'Pathway comparison', 'Target tracking'],
    status: 'active' as const,
  },
  {
    id: 'references',
    title: 'Reference Manager',
    description: 'Manage academic papers, policy briefs, and legislative documents. Organize your research with tags, notes, and citation export.',
    href: '/references',
    color: '#D97706',
    gradient: 'from-[#D97706] to-[#B45309]',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
    features: ['Paper library', 'Citation management', 'Tag & organize', 'BibTeX export'],
    status: 'active' as const,
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-grey-50 to-white">
      <SiteHeader />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#007B6C]" />
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/80 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Research Platform
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            EU Policy Method Hub
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            An integrated research platform for EU climate policy analysis. Navigate legislation, build scenarios, and manage your references — all in one place.
          </p>
        </div>
      </section>

      {/* App Cards */}
      <section className="max-w-6xl mx-auto px-6 -mt-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map(app => (
            <Link key={app.id} href={app.href}
              className="group relative bg-white rounded-2xl shadow-lg border border-grey-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              {/* Color bar */}
              <div className={`h-2 bg-gradient-to-r ${app.gradient}`} />

              <div className="p-6">
                {/* Icon + Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl text-white" style={{ backgroundColor: app.color }}>
                    {app.icon}
                  </div>
                  {app.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Title + Description */}
                <h2 className="text-xl font-bold text-tertiary-dark mb-2 group-hover:text-secondary transition">
                  {app.title}
                </h2>
                <p className="text-sm text-tertiary leading-relaxed mb-5">
                  {app.description}
                </p>

                {/* Features */}
                <div className="space-y-2 mb-5">
                  {app.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-tertiary-dark">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={app.color} strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className={`flex items-center gap-2 text-sm font-medium transition ${app.status === 'active' ? 'text-secondary group-hover:gap-3' : 'text-tertiary'}`}>
                  {app.status === 'active' ? 'Open App' : 'Coming Soon'}
                  {app.status === 'active' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info section */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-bold text-tertiary-dark mb-2">Built for EU Policy Researchers</h3>
          <p className="text-sm text-tertiary max-w-xl mx-auto">
            The Method Hub connects policy analysis tools into a unified workflow. Start by exploring policy networks, build scenarios from your findings, and keep all your references organized.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
