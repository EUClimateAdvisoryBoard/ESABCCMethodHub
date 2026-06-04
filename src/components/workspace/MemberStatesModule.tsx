/**
 * Member State space — Policy Gap workspace module.
 *
 * Renders the full EEA-style country-profile experience inside the project
 * workspace shell:
 *   - Choropleth map with an indicator picker (top of the page)
 *   - EU-27 × indicator heatmap (below the map)
 *   - Country directory + entry points into per-country profile, edit,
 *     external-contributor share-link and the approval queue
 *
 * The underlying data store is shared with the standalone /member-states
 * route — both views read the same merged seed + draft data via the
 * /api/member-states/profiles API, so an approved submission shows up
 * everywhere at once.
 */
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cpApi } from '@/lib/country-profiles/client';
import type { CountryProfile } from '@/data/country-profiles/_types';
import MemberStatesHeatmap from '@/components/member-states/MemberStatesHeatmap';
import DownloadMenu from './DownloadMenu';
import CollaborationPanel from './CollaborationPanel';
import type { SheetSpec, DocBlock } from '@/lib/exports';

const MemberStatesMap = dynamic(
  () => import('@/components/member-states/MemberStatesMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[540px] bg-grey-50 animate-pulse rounded-lg" />
    ),
  },
);

/**
 * Industrial sub-sectors in scope for the Industry Project's member-state view,
 * taken in the wider sense of industry. Surfaced as a reference frame so the
 * shared country profiles are read through an industrial-transition lens.
 */
const INDUSTRY_SUBSECTORS = [
  'Iron & steel',
  'Cement & lime',
  'Chemicals & fertilisers',
  'Refining',
  'Non-ferrous metals (aluminium)',
  'Pulp & paper',
  'Glass & ceramics',
  'Clean-tech manufacturing',
];

export default function MemberStatesModule({
  projectId,
  industryFocus = false,
}: {
  projectId: string;
  industryFocus?: boolean;
}) {
  const [profiles, setProfiles] = useState<CountryProfile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cpApi
      .listProfiles()
      .then(res => { if (!cancelled) setProfiles(res.profiles); })
      .catch(e => { if (!cancelled) setErr(e instanceof Error ? e.message : 'load failed'); });
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-[12px] text-red-900">
        Failed to load country profiles: {err}
      </div>
    );
  }

  if (!profiles) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-grey-50 animate-pulse rounded" />
        <div className="h-[540px] bg-grey-50 animate-pulse rounded" />
        <div className="h-64 bg-grey-50 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">
            Member State space{industryFocus ? ' — industrial transition' : ''}
          </h2>
          <p className="text-sm text-tertiary mt-1 max-w-3xl">
            {industryFocus ? (
              <>
                EEA-style profile for each EU member state, read through an
                industrial-transition lens — industrial emissions and energy
                use, electrification and the hydrogen / CCU-CCS build-out, the
                clean-tech manufacturing footprint and circularity, alongside the
                shared per-country indicators. Use the map to pivot between
                indicators; the heatmap sorts countries; clicking a country opens
                the full profile.
              </>
            ) : (
              <>
                A profile for each of the 27 EU countries — emissions, renewables,
                energy efficiency, air, water, biodiversity, the circular economy,
                adaptation and national energy &amp; climate plans. Use the{' '}
                <strong>map</strong> to switch between topics, read the{' '}
                <strong>heatmap</strong> below to rank countries, and click any
                country to open its full profile.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[12px] items-center">
          <DownloadMenu
            filename="member-state-directory"
            data={{ getSheets: () => [buildDirectorySheet(profiles)] }}
            text={{ getBlocks: () => buildDirectoryDoc(profiles) }}
          />
          <Link
            href="/member-states/submissions"
            className="px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-dark"
          >
            Review submissions →
          </Link>
          <Link
            href="/member-states"
            className="px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50"
            title="Open the same view as a standalone full-width page"
          >
            Open in standalone view ↗
          </Link>
        </div>
      </header>

      {industryFocus && (
        <section className="bg-secondary/5 border border-secondary/20 rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-secondary mb-2">
            Industrial sub-sectors in scope
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_SUBSECTORS.map(s => (
              <span
                key={s}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-secondary/30 text-tertiary-dark"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-tertiary mt-2 max-w-3xl">
            Use the country directory and map below to assess where the EU&rsquo;s
            energy-intensive industry sits, and where the electrification,
            hydrogen and clean-tech build-out is concentrated. Capture
            member-state-specific findings in the discussion thread at the foot of
            this page.
          </p>
        </section>
      )}

      <section>
        <MemberStatesMap profiles={profiles} />
      </section>

      <section>
        <MemberStatesHeatmap profiles={profiles} />
      </section>

      <section>
        <h3 className="text-sm font-bold text-tertiary-dark mb-0.5">Browse countries</h3>
        <p className="text-xs text-tertiary mb-2">Click a country to open its full profile.</p>
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
                  {p.hero.summary?.split('\n')[0] ?? ''}
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-grey-200 p-4">
        <CollaborationPanel
          projectId={projectId}
          target={{ kind: 'module', id: 'member-states' }}
          heading="Review & discussion — Member State space"
        />
      </section>
    </div>
  );
}

/** Build a one-sheet directory workbook (code, name, summary). */
function buildDirectorySheet(profiles: CountryProfile[]): SheetSpec {
  return {
    name: 'Member states',
    title: 'EU member state directory',
    headers: ['Code', 'Country', 'Summary'],
    rows: profiles
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(p => [p.code, p.name, p.hero.summary?.split('\n')[0] ?? '']),
  };
}

/** Build a Word overview listing each member state with its summary line. */
function buildDirectoryDoc(profiles: CountryProfile[]): DocBlock[] {
  const blocks: DocBlock[] = [
    { type: 'heading', level: 1, text: 'EU member state directory' },
  ];
  for (const p of profiles.slice().sort((a, b) => a.name.localeCompare(b.name))) {
    blocks.push({ type: 'heading', level: 3, text: `${p.name} (${p.code})` });
    const summary = p.hero.summary?.split('\n')[0];
    if (summary) blocks.push({ type: 'paragraph', text: summary });
  }
  return blocks;
}
