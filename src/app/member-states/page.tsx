/**
 * /member-states — landing page.
 *
 * Top: geospatial map of the EU-27 with click-to-drill behaviour.
 * Middle: indicator heatmap (status colour per country × indicator).
 * Bottom: directory list of all countries for accessibility / search.
 *
 * The Leaflet map is loaded via next/dynamic ({ ssr:false }) — Leaflet
 * touches `window` on mount.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MemberStatesHeatmap from '@/components/member-states/MemberStatesHeatmap';
import { loadAllEffectiveProfiles } from '@/lib/country-profiles/server';

export const dynamic_ = 'force-dynamic';
export const revalidate = 0;

const MemberStatesMap = dynamic(
  () => import('@/components/member-states/MemberStatesMap'),
  { ssr: false, loading: () => <div className="h-[540px] bg-grey-50 animate-pulse rounded-lg" /> },
);

export default async function MemberStatesLandingPage() {
  const profiles = await loadAllEffectiveProfiles();

  return (
    <>
      <SiteHeader />
      <main className="pt-16 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-wide mx-auto">
        <header className="mb-6">
          <div className="text-[11px] uppercase tracking-wide text-tertiary">EU-27</div>
          <h1 className="text-3xl font-bold text-tertiary-dark mt-1">Member State country profiles</h1>
          <p className="text-sm text-tertiary mt-2 max-w-3xl">
            EEA-style profile for each EU member state, covering GHG emissions, renewable energy,
            energy efficiency, air quality, water, biodiversity, the circular economy, climate
            adaptation and NECP delivery. Click a country on the map or in the heatmap to open
            the full profile. Profiles are editable — main users can save changes directly,
            and you can invite external contributors via a per-country share link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <Link href="/member-states/submissions" className="px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-dark">
              Review submissions →
            </Link>
            <a href="#heatmap" className="px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50">
              Jump to heatmap ↓
            </a>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-base font-bold text-tertiary-dark mb-2">Geospatial overview</h2>
          <p className="text-[12px] text-tertiary mb-3">
            Markers are coloured by the headline GHG trajectory status; marker size scales with
            population. Click a marker for the country summary and an "Open profile" jump.
          </p>
          <MemberStatesMap profiles={profiles} colorBy="ghg" />
        </section>

        <section id="heatmap" className="mb-8 scroll-mt-24">
          <MemberStatesHeatmap profiles={profiles} />
        </section>

        <section>
          <h2 className="text-base font-bold text-tertiary-dark mb-3">Directory</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {profiles
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => (
                <Link
                  key={p.code}
                  href={`/member-states/${p.code}`}
                  className="border border-grey-200 rounded-md p-3 hover:border-primary hover:bg-primary/5"
                >
                  <div className="text-[10px] text-tertiary uppercase tracking-wide">{p.code}</div>
                  <div className="text-sm font-semibold text-tertiary-dark">{p.name}</div>
                  <div className="text-[11px] text-tertiary mt-0.5 line-clamp-2">
                    {p.hero.summary.split('\n')[0]}
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
