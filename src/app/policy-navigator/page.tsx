'use client';

/**
 * M · 04 — EU Policy Navigator (production)
 * -----------------------------------------
 * Route: `/policy-navigator`
 *
 * A network map of EU climate laws. Each node is a policy (regulation,
 * directive, decision) and each edge is a structural relationship
 * (amends, repeals, cites, implements). The Secretariat uses this to
 * trace why a given provision exists, which acts depend on it, and which
 * 2030 / 2040 / 2050 milestones it ties into.
 *
 * Data shape:
 *
 *   - `src/data/policies.ts`           — master list of tracked acts.
 *   - `src/data/sectoral-policies.ts`  — sector groupings + milestone map.
 *   - `/api/policy-text/**`            — consolidated EUR-Lex text on demand.
 *   - `/api/policy-news`               — news items linked to each act.
 *
 * Heavy visualisation components (PolicyNetworkGraph, FullTextViewer,
 * PolicyGapExplorer) are loaded dynamically to keep the initial bundle
 * reasonable.
 *
 * Ingestion:
 *
 *   scripts/fetch-eurlex-texts.js              — consolidates CELEX texts.
 *   scripts/prefetch-eurlex-bodies.mjs         — warms the full-text cache.
 *
 * Legacy routes `/policy` and `/policy-text` redirect here (see
 * `next.config.js`).
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { policies } from '@/data/policies';
import {
  SECTORS,
  SECTOR_POLICIES,
  type SectorId,
  type SectorPolicy,
  getCitationLinks,
} from '@/data/sectoral-policies';
import PageHero from '@/components/PageHero';
import OnboardingTour from '@/components/OnboardingTour';
import MobilePolicyList from '@/components/MobilePolicyList';
import CommentSection from '@/components/CommentSection';
import ConnectionTypesLegend from '@/components/ConnectionTypesLegend';
import ConnectionDetailPanel from '@/components/ConnectionDetailPanel';
import NetworkManager from '@/components/NetworkManager';
import EditConnectionModal from '@/components/EditConnectionModal';
import ApprovalProgress from '@/components/ApprovalProgress';
import ConnectionsReviewTable from '@/components/ConnectionsReviewTable';
import { useIsMobile } from '@/lib/useDevice';
import { useConnectionOverrides, type EnrichedConnection } from '@/lib/useConnectionOverrides';
import { useNetworks } from '@/lib/useNetworks';
import { EmptyState } from '@/components/ui/StateView';
import { FilterPill, FilterPillRow } from '@/components/ui/FilterPill';
import PolicyAnnotationsPanel from '@/components/workspace/PolicyAnnotationsBadge';
import { usePromotedPolicyEdits } from '@/lib/project-workspace/usePromotedPolicyEdits';
import NavigatorMasterCodes from '@/components/NavigatorMasterCodes';
import NavigatorObjectiveChecklist from '@/components/NavigatorObjectiveChecklist';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';
import {
  getDescendantIds,
  getRootCodes,
  getMasterCodeChildren,
  getMasterCode,
} from '@/lib/content-analysis/master-code-catalog';

const PolicyNetworkGraph = dynamic(() => import('@/components/PolicyNetworkGraph'), { ssr: false });
const LegislativeCalendar = dynamic(() => import('@/components/LegislativeCalendar'), { ssr: false });

// Read mode (item 4.2 in the major UI/UX review re-rank) is a fourth tab
// that lists policies for direct reading rather than network exploration —
// 80 % of sessions actually want to *read* a policy, not graph-walk it.
type TopTab = 'read' | 'policy-map' | 'review-connections' | 'sectoral-overview';

const DOMAIN_COLORS: Record<string, string> = {
  climate: '#007B6C', energy: '#FF9933', transport: '#6667AB',
  finance: '#004B7F', 'cross-cutting': '#3D5265', security: '#B83230',
  defense: '#808285', agriculture: '#00928F', industry: '#A530B8',
  digital: '#2D7DD2', trade: '#8B6914', circular_economy: '#2E8B57',
  health: '#C14040', environment: '#228B22', social: '#C77DBA',
  justice: '#7B3F61', migration: '#D4762C', education: '#4682B4',
  consumer: '#B8860B', fisheries: '#1E90FF',
};

const INSTRUMENT_COLORS: Record<string, string> = {
  'cap-and-trade': '#004B7F',
  regulation: '#0065A4',
  standard: '#007B6C',
  target: '#6667AB',
  fund: '#D97706',
  directive: '#478EA5',
  tax: '#B83230',
  disclosure: '#8B5CF6',
};

export default function PolicyNavigatorPage() {
  const {
    getGraphData,
    enrichedConnections,
    editedCount,
    verificationCounts,
  } = useConnectionOverrides();
  const { nodes, links } = useMemo(() => getGraphData(), [getGraphData]);
  const totalConnections = enrichedConnections.length;
  const pendingCount = verificationCounts.unverified;
  const domains = [...new Set(policies.map(p => p.domain))];
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'graph' | 'review' | 'calendar' | 'sectors'>('graph');
  const [topTab, setTopTab] = useState<TopTab>('policy-map');

  // Sectoral overview state
  const [selectedSector, setSelectedSector] = useState<SectorId | 'all'>('all');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('all');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  // Desktop view mode (M·04 #5): same data, two shapes. List view reuses
  // the mobile list component so we don't duplicate render logic.
  const [desktopView, setDesktopView] = useState<'graph' | 'list'>('graph');

  // Deep-link landing (M·04 #4 + item 4.1 from the major UI/UX review re-rank):
  //
  //   ?article=<policyId>/<articleNumber> → redirect to the policy-text page,
  //     so cross-module deep-links (news → article, M·05 → article) land
  //     directly on the readable article rather than the graph. The
  //     downstream page handles scroll-into-view + ring pulse via its
  //     existing `highlight=` flow.
  //
  //   ?policy=<id> → expand the matching card on the graph view and pulse
  //     a ring around it for 600 ms (existing M·04 #4 behaviour). The param
  //     is stripped after landing so subsequent navigation stays clean.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    // Article deep-link — accepts "policy/article" or two separate params.
    const articleParam = params.get('article');
    let policyForArticle: string | null = null;
    let articleNumber: string | null = null;
    if (articleParam) {
      const slash = articleParam.indexOf('/');
      if (slash > 0) {
        policyForArticle = articleParam.slice(0, slash);
        articleNumber = articleParam.slice(slash + 1);
      } else {
        policyForArticle = params.get('policy');
        articleNumber = articleParam;
      }
    }
    if (policyForArticle && articleNumber) {
      const target = `/policy-navigator/policy-text?id=${encodeURIComponent(policyForArticle)}&highlight=${encodeURIComponent('Article ' + articleNumber)}`;
      window.location.replace(target);
      return;
    }

    const id = params.get('policy');
    if (!id) return;
    setExpanded(id);
    setTimeout(() => {
      const el = document.getElementById(`policy-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('mh-ring-pulse');
      setTimeout(() => el.classList.remove('mh-ring-pulse'), 700);
    }, 80);
    params.delete('policy');
    window.history.replaceState({}, '', window.location.pathname + (params.toString() ? `?${params}` : ''));
  }, []);

  // Network + connection-focus state
  const { getNetwork } = useNetworks();
  const [activeNetworkId, setActiveNetworkId] = useState<string | null>(null);
  const activeNetwork = getNetwork(activeNetworkId);
  const networkPolicyIds = useMemo(
    () => (activeNetwork ? new Set(activeNetwork.policyIds) : null),
    [activeNetwork],
  );
  const [focusedConnection, setFocusedConnection] = useState<EnrichedConnection | null>(null);
  const [editingConnection, setEditingConnection] = useState<EnrichedConnection | null>(null);

  const handleLinkClick = useCallback(
    (payload: { sourceId: string; targetId: string; connection_type: string }) => {
      const match = enrichedConnections.find(
        c =>
          c.source_policy_id === payload.sourceId &&
          c.target_policy_id === payload.targetId &&
          c.connection_type === payload.connection_type,
      );
      if (match) setFocusedConnection(match);
    },
    [enrichedConnections],
  );

  const selectedCodeDescendants = useMemo(
    () => (selectedCode ? getDescendantIds(selectedCode) : null),
    [selectedCode]
  );

  const filteredSectorPolicies = useMemo(() => {
    return SECTOR_POLICIES.filter(p => {
      if (selectedSector !== 'all' && !p.sectors.includes(selectedSector))
        return false;
      if (selectedInstrument !== 'all' && p.instrumentType !== selectedInstrument)
        return false;
      if (query) {
        const hay = (p.name + ' ' + (p.acronym || '') + ' ' + p.meaning).toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (selectedCodeDescendants) {
        const pTags = POLICY_MASTER_TAGS[p.id] ?? [];
        if (!pTags.some(t => selectedCodeDescendants.has(t))) return false;
      }
      return true;
    });
  }, [selectedSector, selectedInstrument, query, selectedCodeDescendants]);

  const instruments = Array.from(
    new Set(SECTOR_POLICIES.map(p => p.instrumentType)),
  ).sort();

  /* ─────────────────────────────────────────────────────────
     MOBILE LAYOUT — tab-switchable for the three heavy widgets
     ───────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-white">
        <PageHero
          title="Policy Navigator"
          subtitle="Explore EU climate legislation and cross-cutting connections. Pinch to zoom the graph."
        />

        {/* Compact stats */}
        <section className="bg-white border-b border-grey-200">
          <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            <div className="whitespace-nowrap">
              <span className="font-bold text-primary text-base">{policies.length}</span>
              <span className="text-tertiary ml-1">Policies</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-bold text-secondary text-base">{links.length}</span>
              <span className="text-tertiary ml-1">Links</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-bold text-tertiary text-base">{domains.length}</span>
              <span className="text-tertiary ml-1">Domains</span>
            </div>
          </div>
          {/* Horizontal legend scroller */}
          <div className="px-4 pb-3 scroll-x">
            <div className="flex gap-3 w-max">
              {domains.map(d => (
                <span
                  key={d}
                  className="flex items-center gap-1 text-[10px] text-tertiary whitespace-nowrap"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: DOMAIN_COLORS[d] }}
                  />
                  <span className="capitalize">{d.replace('_', ' ')}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky tab bar */}
        <div className="sticky top-[60px] z-30 bg-white border-b border-grey-200">
          <div className="flex">
            {[
              { id: 'graph' as const, label: 'Graph' },
              { id: 'review' as const, label: 'Review' },
              { id: 'calendar' as const, label: 'Calendar' },
              { id: 'sectors' as const, label: 'Sectors' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 py-3 text-[13px] font-medium transition touch-target ${
                  mobileTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-tertiary border-b-2 border-transparent'
                }`}
                aria-pressed={mobileTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active tab content */}
        <section className="px-3 py-3">
          {mobileTab === 'graph' && (
            nodes.length > 0 ? (
              <div className="space-y-2">
                {totalConnections > 0 && (
                  <ApprovalProgress
                    approved={verificationCounts.verified}
                    rejected={verificationCounts.rejected}
                    needsReview={verificationCounts.needs_review}
                    pending={verificationCounts.unverified}
                    total={totalConnections}
                    onGotoReview={() => setMobileTab('review')}
                  />
                )}
                <div className="bg-white rounded shadow-sm border border-grey-200 px-3">
                  <NetworkManager
                    activeNetworkId={activeNetworkId}
                    onChange={setActiveNetworkId}
                  />
                </div>
                <div
                  className="bg-white rounded shadow-sm border border-grey-200 overflow-hidden"
                  style={{ height: 'clamp(360px, calc(100vh - 320px), 80vh)' }}
                >
                  <PolicyNetworkGraph
                    nodes={nodes}
                    links={links}
                    networkPolicyIds={networkPolicyIds}
                    onLinkClick={handleLinkClick}
                  />
                </div>
                <details className="md:hidden bg-white rounded shadow-sm border border-grey-200">
                  <summary className="px-3 py-2.5 text-[13px] font-medium text-tertiary-dark cursor-pointer touch-target">
                    Browse as list
                  </summary>
                  <div className="border-t border-grey-100">
                    <MobilePolicyList policies={policies} />
                  </div>
                </details>
                {focusedConnection && (
                  <ConnectionDetailPanel
                    connection={focusedConnection}
                    onClose={() => setFocusedConnection(null)}
                    onEdit={() => {
                      setEditingConnection(focusedConnection);
                      setFocusedConnection(null);
                    }}
                  />
                )}
                <ConnectionTypesLegend />
              </div>
            ) : (
              <div className="bg-white rounded shadow-sm border border-grey-200 p-6 text-center">
                <h2 className="text-base font-bold text-tertiary-dark mb-2">No policy data</h2>
                <p className="text-sm text-tertiary">
                  Add data to <code className="bg-grey-100 px-1 rounded text-xs">src/data/policies.ts</code>.
                </p>
              </div>
            )
          )}

          {mobileTab === 'review' && (
            <div className="space-y-3">
              {totalConnections > 0 && (
                <ApprovalProgress
                  approved={verificationCounts.verified}
                  rejected={verificationCounts.rejected}
                  needsReview={verificationCounts.needs_review}
                  pending={verificationCounts.unverified}
                  total={totalConnections}
                />
              )}
              <ConnectionsReviewTable />
            </div>
          )}

          {mobileTab === 'calendar' && (
            <div
              className="bg-white rounded shadow-sm border border-grey-200 overflow-hidden"
              style={{ height: 'clamp(320px, calc(100vh - 260px), 80vh)' }}
            >
              <LegislativeCalendar />
            </div>
          )}

          {mobileTab === 'sectors' && (
            <div className="space-y-3">
              {/* Sector filter pills */}
              <div className="bg-white rounded shadow-sm border border-grey-200 p-3">
                <h2 className="text-sm font-bold text-tertiary-dark mb-2">Sectoral Overview</h2>
                <p className="text-[11px] text-tertiary mb-3">
                  EU climate policies by sector, with milestones to 2030, 2040 and 2050.
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedSector('all')}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                      selectedSector === 'all'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-tertiary border-grey-200'
                    }`}
                  >
                    All ({SECTOR_POLICIES.length})
                  </button>
                  {SECTORS.map(s => {
                    const count = SECTOR_POLICIES.filter(p => p.sectors.includes(s.id)).length;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSector(s.id)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${
                          selectedSector === s.id
                            ? 'text-white border-transparent'
                            : 'bg-white text-tertiary-dark border-grey-200'
                        }`}
                        style={
                          selectedSector === s.id
                            ? { backgroundColor: s.color, borderColor: s.color }
                            : undefined
                        }
                      >
                        {s.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search + instrument filter */}
              <div className="bg-white rounded shadow-sm border border-grey-200 p-3">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search sectoral policies…"
                  className="w-full px-3 py-2 border border-grey-200 rounded text-sm mb-2"
                />
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedInstrument('all')}
                    className={`text-[10px] px-2 py-1 rounded ${
                      selectedInstrument === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-grey-50 text-tertiary border border-grey-200'
                    }`}
                  >
                    All
                  </button>
                  {instruments.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedInstrument(t)}
                      className={`text-[10px] px-2 py-1 rounded ${
                        selectedInstrument === t ? 'text-white' : 'text-tertiary border border-grey-200 bg-grey-50'
                      }`}
                      style={
                        selectedInstrument === t
                          ? { backgroundColor: INSTRUMENT_COLORS[t] || '#0065A4' }
                          : undefined
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sector info card */}
              {selectedSector !== 'all' && (() => {
                const sec = SECTORS.find(s => s.id === selectedSector);
                if (!sec) return null;
                return (
                  <div className="bg-white rounded shadow-sm border border-grey-200 p-3">
                    <div
                      className="h-1 rounded-full mb-2"
                      style={{ backgroundColor: sec.color }}
                    />
                    <h3 className="text-sm font-bold text-tertiary-dark">{sec.name}</h3>
                    <p className="text-[11px] text-tertiary mt-1 leading-relaxed">{sec.description}</p>
                    <p className="text-[10px] text-tertiary-light mt-1">
                      ~{sec.sharePercent > 0 ? '+' : ''}{sec.sharePercent}% of EU GHG
                    </p>
                    <div className="mt-2 pt-2 border-t border-grey-100">
                      <p className="text-[10px] text-tertiary uppercase tracking-wide mb-0.5">Headline target</p>
                      <p className="text-[11px] text-tertiary-dark leading-relaxed">{sec.targetLanguage}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Policy cards */}
              {filteredSectorPolicies.length === 0 && (
                <EmptyState
                  title="No policies match your filters"
                  body="Try widening the year range, removing a sector filter, or clearing the text search."
                />
              )}
              {filteredSectorPolicies.map(p => (
                <SectorPolicyCard
                  key={p.id}
                  policy={p}
                  expanded={expanded === p.id}
                  onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                  activeCodeId={selectedCode}
                  onCodeFilter={setSelectedCode}
                />
              ))}
            </div>
          )}

        </section>

        {/* Instructions — stack */}
        <section className="px-4 pb-10 space-y-3">
          {[
            { title: 'Explore', desc: 'Tap nodes to open a policy\'s details and citations.' },
            { title: 'Annotate', desc: 'Select text in any document to tag policy gaps or strong commitments.' },
            { title: 'Analyse', desc: 'Use Analytics to visualise tag distributions and cross-cutting themes.' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded shadow-sm border border-grey-200 p-4">
              <h3 className="font-bold text-tertiary-dark text-sm mb-1">{item.title}</h3>
              <p className="text-[13px] text-tertiary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        {editingConnection && (
          <EditConnectionModal
            connection={editingConnection}
            onClose={() => setEditingConnection(null)}
          />
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     DESKTOP LAYOUT — three-column info + graph + sidebar
     ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white">
      <OnboardingTour
        moduleKey="policy-navigator"
        steps={[
          { title: 'Network of EU climate policies', body: 'Each node is a tracked EU act. Click to jump to the policy detail page; drag to rearrange.', anchor: '[data-tour="graph-canvas"]' },
          { title: 'Edge thickness = trust', body: 'Thicker lines are verified connections; thinner ones still need review. Hover any edge to see the relationship type.', anchor: '[data-tour="graph-canvas"]' },
          { title: 'Hover to focus', body: 'Hover a node and the graph dims everything but the 1-hop neighbourhood. Click for the full policy page.', anchor: '[data-tour="graph-canvas"]' },
          { title: 'Mini-map for orientation', body: 'The bottom-right overview shows where you are at any zoom. Click anywhere in it to jump the main view there.', anchor: '[data-tour="mini-map"]' },
          { title: 'Graph or list', body: 'Same data, two shapes. Switch to List for a scrollable column when you are briefing someone.', anchor: '[data-tour="view-toggle"]' },
          { title: 'Sectoral milestones', body: 'Scroll down for the 2030 / 2040 / 2050 milestones per sector.' },
        ]}
      />
      <PageHero
        title="EU Policy Navigator"
        subtitle="Interactive scientific tool for exploring EU climate legislation. Start with the cross-cutting network map above, then jump to the sectoral overview below for sector-by-sector milestones to 2030, 2040 and 2050."
      />

      {/* Stats bar */}
      <section className="bg-white border-b border-grey-200">
        <div className="max-w-wide mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap gap-4 sm:gap-8 text-[13px] sm:text-sm">
          <div>
            <span className="font-bold text-primary text-base sm:text-lg">{policies.length}</span>{' '}
            <span className="text-tertiary">Policies</span>
          </div>
          <div>
            <span className="font-bold text-secondary text-base sm:text-lg">{links.length}</span>{' '}
            <span className="text-tertiary">Connections</span>
          </div>
          <div>
            <span className="font-bold text-tertiary text-base sm:text-lg">{domains.length}</span>{' '}
            <span className="text-tertiary">Domains</span>
          </div>
          <div>
            <span className="font-bold text-primary text-base sm:text-lg">{SECTOR_POLICIES.length}</span>{' '}
            <span className="text-tertiary">Sectoral policies</span>
          </div>
          <div>
            <span className="font-bold text-secondary text-base sm:text-lg">{SECTORS.length}</span>{' '}
            <span className="text-tertiary">Sectors</span>
          </div>
          <div className="flex gap-2 items-center sm:ml-auto flex-wrap">
            {domains.map(d => (
              <span key={d} className="flex items-center gap-1.5 text-xs text-tertiary">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: DOMAIN_COLORS[d] }}
                />
                <span className="capitalize hidden md:inline">{d.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          TOP TAB BAR — three primary sections
         ============================================================ */}
      <section className="sticky top-0 z-20 bg-white border-b border-grey-200 shadow-sm">
        <div className="max-w-wide mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Policy Navigator sections">
            {[
              { id: 'read' as const, label: 'Policies', desc: 'Browse and read policy text directly', badge: null as number | null },
              {
                id: 'review-connections' as const,
                label: 'Review connections',
                desc: 'Approve, edit or reject every connection on the map',
                badge: pendingCount || null,
              },
              { id: 'policy-map' as const, label: 'Policy Map', desc: 'Network graph + calendar', badge: null as number | null },
              { id: 'sectoral-overview' as const, label: 'Sectoral Overview', desc: 'Sector-by-sector milestones', badge: null as number | null },
            ].map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={topTab === t.id}
                onClick={() => setTopTab(t.id)}
                className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap inline-flex items-center gap-2 ${
                  topTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-tertiary hover:text-tertiary-dark'
                }`}
                title={t.desc}
              >
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      topTab === t.id ? 'bg-primary text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                    title={`${t.badge} connections pending human review`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PART 0 — READ MODE (item 4.2 in the major UI/UX review re-rank)
          A clean reader-first surface: no graph, no force layout, just a
          searchable list of policies that opens the readable text view in
          one click. Reuses the existing /policy-navigator/policy-text route
          so no new layout is invented.
         ============================================================ */}
      {topTab === 'read' && (
        <section id="read" className="max-w-wide mx-auto px-6 pt-8 pb-12">
          <div className="mb-5 max-w-text">
            <p className="text-[10px] tracking-[0.18em] uppercase text-primary font-semibold mb-1">Read mode</p>
            <h2 className="text-[22px] font-bold text-tertiary-dark">Browse and read policy text</h2>
            <p className="text-sm text-tertiary mt-1">
              {policies.length} policies. Click any title to open the article view with full text, citations and connections.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-grey-200 divide-y divide-grey-100">
            {policies.map(p => (
              <Link
                key={p.id}
                href={`/policy-navigator/policy-text/?id=${encodeURIComponent(p.id)}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-grey-50 mh-focus mh-motion-fast"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: DOMAIN_COLORS[p.domain] || '#3D5265' }}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-tertiary capitalize">
                      {p.domain.replace('_', ' ')}
                    </span>
                    {p.celex_number && (
                      <span className="text-[10px] font-mono text-grey-500">· {p.celex_number}</span>
                    )}
                    <span className="text-[10px] text-grey-500 capitalize">· {p.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm font-semibold text-tertiary-dark truncate">{p.short_title || p.title}</p>
                </div>
                <span className="shrink-0 text-tertiary group-hover:text-secondary" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          PART 1 — POLICY MAP (network graph + calendar)
         ============================================================ */}
      {topTab === 'policy-map' && (
      <>
      <section id="policy-map" className="max-w-wide mx-auto px-6 pt-8 pb-2">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-primary font-semibold mb-1">
              Part 1
            </p>
            <h2 className="text-xl font-bold text-tertiary-dark">Policy map</h2>
            <p className="text-sm text-tertiary mt-1">
              Click any node to explore a policy, its connections and citations.
            </p>
          </div>
          <a
            href="#sectoral-overview"
            className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary transition"
          >
            Jump to sectoral overview
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </a>
        </div>
        {totalConnections > 0 && (
          <ApprovalProgress
            approved={verificationCounts.verified}
            rejected={verificationCounts.rejected}
            needsReview={verificationCounts.needs_review}
            pending={verificationCounts.unverified}
            total={totalConnections}
            onGotoReview={() => setTopTab('review-connections')}
          />
        )}
      </section>

      {/* Graph + Calendar */}
      <section className="max-w-wide mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Network Graph — 3/4 width on desktop, full on mobile */}
          <div className="lg:col-span-3 space-y-3">
            {nodes.length > 0 ? (
              <>
                <div className="bg-white rounded shadow-sm border border-grey-200 px-4">
                  <NetworkManager
                    activeNetworkId={activeNetworkId}
                    onChange={setActiveNetworkId}
                  />
                  {editedCount > 0 && (
                    <p className="text-[10px] text-amber-700 pb-2 -mt-1">
                      {editedCount} connection{editedCount === 1 ? '' : 's'} edited locally in this browser.
                    </p>
                  )}
                </div>
                {/* Desktop view-mode toggle — same data, two shapes (M·04 #5). */}
                <div className="flex items-center justify-end mb-2">
                  <div data-tour="view-toggle" role="radiogroup" aria-label="View mode" className="inline-flex rounded-md border border-[var(--mh-border)] overflow-hidden bg-[var(--mh-card)]">
                    {(['graph', 'list'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={desktopView === m}
                        onClick={() => setDesktopView(m)}
                        className={`mh-focus mh-motion-fast px-2.5 py-1 capitalize ${desktopView === m ? 'bg-[var(--mh-status-primary)] text-white' : 'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)]'}`}
                        style={{ fontSize: 'var(--mh-text-2xs)', fontWeight: 600 }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {desktopView === 'graph' ? (
                  <div data-tour="graph-canvas" className="bg-white rounded shadow-sm border border-grey-200 h-[60vh] sm:h-[70vh] min-h-[380px] sm:min-h-[500px]">
                    <PolicyNetworkGraph
                      nodes={nodes}
                      links={links}
                      networkPolicyIds={networkPolicyIds}
                      onLinkClick={handleLinkClick}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded shadow-sm border border-grey-200">
                    <MobilePolicyList policies={policies} />
                  </div>
                )}
                {focusedConnection && (
                  <ConnectionDetailPanel
                    connection={focusedConnection}
                    onClose={() => setFocusedConnection(null)}
                    onEdit={() => {
                      setEditingConnection(focusedConnection);
                      setFocusedConnection(null);
                    }}
                  />
                )}
                <ConnectionTypesLegend />
              </>
            ) : (
              <div className="bg-white rounded shadow-sm border border-grey-200 flex items-center justify-center h-[50vh] min-h-[320px]">
                <div className="text-center px-6">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-grey-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <path d="M2 12h20" />
                  </svg>
                  <h2 className="text-xl font-bold text-tertiary-dark mb-2">No Policy Data Yet</h2>
                  <p className="text-sm text-tertiary max-w-md">
                    Add policy data to{' '}
                    <code className="bg-grey-100 px-1.5 py-0.5 rounded text-xs">src/data/policies.ts</code>{' '}
                    to populate the interactive network graph.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Legislative Calendar sidebar — full width on mobile, 1/4 on desktop */}
          <div className="lg:col-span-1 h-auto lg:h-[70vh] lg:min-h-[500px]">
            <LegislativeCalendar />
          </div>
        </div>
      </section>
      </>
      )}

      {/* ============================================================
          PART 2 — REVIEW CONNECTIONS (Excel-style approval workbench)
         ============================================================ */}
      {topTab === 'review-connections' && (
        <section className="max-w-wide mx-auto px-3 sm:px-6 pt-8 pb-10 space-y-4">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-primary font-semibold mb-1">
              Review workbench
            </p>
            <h2 className="text-xl font-bold text-tertiary-dark">
              Approve connections between policies
            </h2>
            <p className="text-sm text-tertiary mt-1 max-w-3xl leading-relaxed">
              This is your control room. Every link between two policies on the Policy Map
              starts here as a proposal that needs a human to sign off on it. Use the table
              below like a spreadsheet — edit any cell inline, then approve, reject, or
              flag rows for more information. Decisions update the map in real time.
            </p>
          </div>
          {totalConnections > 0 && (
            <ApprovalProgress
              approved={verificationCounts.verified}
              rejected={verificationCounts.rejected}
              needsReview={verificationCounts.needs_review}
              pending={verificationCounts.unverified}
              total={totalConnections}
            />
          )}
          <ConnectionsReviewTable />
          <ConnectionTypesLegend defaultOpen={false} />
        </section>
      )}

      {/* ============================================================
          PART 3 — SECTORAL OVERVIEW (was /sectoral-policy)
         ============================================================ */}
      {topTab === 'sectoral-overview' && (
      <section id="sectoral-overview" className="border-t border-grey-200 bg-grey-50/40 scroll-mt-20">
        <div className="max-w-wide mx-auto px-6 pt-10 pb-4">
          <p className="text-[10px] tracking-[0.18em] uppercase text-primary font-semibold mb-1">
            Part 2
          </p>
          <h2 className="text-xl font-bold text-tertiary-dark">Sectoral overview</h2>
          <p className="text-sm text-tertiary mt-1 max-w-3xl">
            EU climate policies organised by the sector(s) they target, with plain-language meaning,
            current and future requirements and binding milestones for 2030, 2040 and 2050.
          </p>
          <div className="flex flex-wrap gap-3 text-[11px] text-tertiary mt-3">
            <span>{SECTOR_POLICIES.length} sectoral policies</span>
            <span>·</span>
            <span>{SECTORS.length} sectors</span>
          </div>
        </div>

        {/* Sector strip */}
        <div className="border-y border-grey-200 bg-white">
          <div className="max-w-wide mx-auto px-6 py-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedSector('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                selectedSector === 'all'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-tertiary border-grey-200 hover:border-primary'
              }`}
            >
              All sectors ({SECTOR_POLICIES.length})
            </button>
            {SECTORS.map(s => {
              const count = SECTOR_POLICIES.filter(p => p.sectors.includes(s.id)).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSector(s.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                    selectedSector === s.id
                      ? 'text-white border-transparent'
                      : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
                  }`}
                  style={
                    selectedSector === s.id
                      ? { backgroundColor: s.color, borderColor: s.color }
                      : undefined
                  }
                >
                  {s.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky active-filter summary (M·04 #6). Mirrors the news + scenarios
            pattern: only renders when filters deviate from default; each pill
            has its own × to clear; counts visible. */}
        {(selectedSector !== 'all' || selectedInstrument !== 'all' || query.trim() !== '' || selectedCode !== null) && (
          <div className="max-w-wide mx-auto px-6">
            <FilterPillRow sticky>
              <span
                className="uppercase tracking-wide font-semibold text-[var(--mh-muted)] pr-1"
                style={{ fontSize: 'var(--mh-text-2xs)' }}
              >
                Filtered by
              </span>
              {selectedSector !== 'all' && (
                <FilterPill
                  label={`Sector: ${SECTORS.find(s => s.id === selectedSector)?.name ?? selectedSector}`}
                  count={filteredSectorPolicies.length}
                  active
                  onClick={() => setSelectedSector('all')}
                  onClear={() => setSelectedSector('all')}
                />
              )}
              {selectedInstrument !== 'all' && (
                <FilterPill
                  label={`Instrument: ${selectedInstrument}`}
                  active
                  onClick={() => setSelectedInstrument('all')}
                  onClear={() => setSelectedInstrument('all')}
                />
              )}
              {query.trim() !== '' && (
                <FilterPill
                  label={`Search: "${query.trim().slice(0, 24)}"`}
                  active
                  onClick={() => setQuery('')}
                  onClear={() => setQuery('')}
                />
              )}
              {selectedCode !== null && (
                <FilterPill
                  label={`Code: ${selectedCode}`}
                  count={filteredSectorPolicies.length}
                  active
                  onClick={() => setSelectedCode(null)}
                  onClear={() => setSelectedCode(null)}
                />
              )}
              <button
                type="button"
                onClick={() => { setSelectedSector('all'); setSelectedInstrument('all'); setQuery(''); setSelectedCode(null); }}
                className="mh-focus mh-motion-fast text-[var(--mh-muted)] hover:text-[var(--mh-status-danger)] underline"
                style={{ fontSize: 'var(--mh-text-2xs)' }}
              >
                Clear all
              </button>
            </FilterPillRow>
          </div>
        )}

        <div className="max-w-wide mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white rounded-xl border border-grey-200 p-4">
              <h3 className="text-sm font-bold text-tertiary-dark mb-3">Search</h3>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search sectoral policies…"
                className="w-full px-3 py-2 border border-grey-200 rounded text-sm"
              />
              <h3 className="text-sm font-bold text-tertiary-dark mt-4 mb-2">
                Instrument type
              </h3>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedInstrument('all')}
                  className={`text-[10px] px-2 py-1 rounded ${
                    selectedInstrument === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-grey-50 text-tertiary border border-grey-200'
                  }`}
                >
                  All
                </button>
                {instruments.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedInstrument(t)}
                    className={`text-[10px] px-2 py-1 rounded ${
                      selectedInstrument === t ? 'text-white' : 'text-tertiary border border-grey-200 bg-grey-50'
                    }`}
                    style={
                      selectedInstrument === t
                        ? { backgroundColor: INSTRUMENT_COLORS[t] || '#0065A4' }
                        : undefined
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <SLRCodeFilter
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              policyCount={filteredSectorPolicies.length}
              totalCount={SECTOR_POLICIES.length}
            />

            {selectedSector !== 'all' && (
              <div className="bg-white rounded-xl border border-grey-200 p-4">
                {(() => {
                  const sec = SECTORS.find(s => s.id === selectedSector);
                  if (!sec) return null;
                  return (
                    <>
                      <div
                        className="h-1 rounded-full mb-3"
                        style={{ backgroundColor: sec.color }}
                      />
                      <h3 className="text-sm font-bold text-tertiary-dark">
                        {sec.name}
                      </h3>
                      <p className="text-[11px] text-tertiary mt-1 leading-relaxed">
                        {sec.description}
                      </p>
                      <p className="text-[10px] text-tertiary-light mt-2">
                        ~{sec.sharePercent > 0 ? '+' : ''}{sec.sharePercent}% of EU GHG
                      </p>
                      <div className="mt-3 pt-3 border-t border-grey-100">
                        <p className="text-[10px] text-tertiary uppercase tracking-wide mb-1">
                          Headline target
                        </p>
                        <p className="text-[11px] text-tertiary-dark leading-relaxed">
                          {sec.targetLanguage}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="bg-white rounded-xl border border-grey-200 p-4">
              <h3 className="text-xs font-bold text-tertiary-dark mb-2">
                Sector contribution to EU GHG
              </h3>
              <div className="space-y-1">
                {SECTORS.filter(s => s.sharePercent !== 0).map(s => (
                  <div key={s.id}>
                    <div className="flex justify-between text-[10px] text-tertiary mb-0.5">
                      <span>{s.name}</span>
                      <span className={s.sharePercent < 0 ? 'text-green-700' : 'text-tertiary-dark'}>
                        {s.sharePercent > 0 ? '+' : ''}{s.sharePercent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-grey-100 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(Math.abs(s.sharePercent) * 3.5, 100)}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-tertiary-light mt-2">
                Approximate shares. LULUCF shown as net sink.
              </p>
            </div>
          </aside>

          {/* Main list */}
          <main className="space-y-3">
            {filteredSectorPolicies.length === 0 && (
              <EmptyState
                title="No policies match your filters"
                body="Try widening the year range, removing a sector filter, or clearing the text search."
              />
            )}
            {filteredSectorPolicies.map(p => (
              <SectorPolicyCard
                key={p.id}
                policy={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                activeCodeId={selectedCode}
                onCodeFilter={setSelectedCode}
              />
            ))}

            <div className="bg-white rounded-xl border border-grey-200 p-4 mt-4">
              <CommentSection policyId="sectoral-policy" />
            </div>
          </main>
        </div>
      </section>
      )}

      {/* Instructions */}
      <section className="max-w-wide mx-auto px-3 sm:px-6 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {[
            { title: 'Explore Connections', desc: 'Click any policy node to see its details, connections to other legislation, and citation analysis.' },
            { title: 'Annotate & Tag',     desc: 'Select text in any policy document to add tags like "policy gap", "ambiguity", or "strong commitment".' },
            { title: 'Analyse Patterns',    desc: 'Use the Analytics dashboard to visualise tag distributions, connection patterns, and cross-cutting themes.' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded shadow-sm border border-grey-200 p-4 sm:p-5">
              <h3 className="font-bold text-tertiary-dark text-sm mb-2">{item.title}</h3>
              <p className="text-[13px] sm:text-sm text-tertiary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {editingConnection && (
        <EditConnectionModal
          connection={editingConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  );
}

function SectorPolicyCard({
  policy,
  expanded,
  onToggle,
  activeCodeId,
  onCodeFilter,
}: {
  policy: SectorPolicy;
  expanded: boolean;
  onToggle: () => void;
  activeCodeId: string | null;
  onCodeFilter: (codeId: string | null) => void;
}) {
  const color = INSTRUMENT_COLORS[policy.instrumentType] || '#0065A4';
  // Promoted edits from the Project Workspace shadow the bundled SECTOR_POLICIES
  // text — only fetched once the card is opened so we don't hammer the API.
  const promoted = usePromotedPolicyEdits(policy.id, expanded);
  const meaning = promoted.meaning ?? policy.meaning;
  const currentRequirement = promoted.currentRequirement ?? policy.currentRequirement;
  const futureRequirement = promoted.futureRequirement ?? policy.futureRequirement;
  return (
    <div id={`policy-${policy.id}`} className="bg-white rounded-xl border border-grey-200 overflow-hidden rounded-lg">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-grey-50 transition"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-1 rounded-full shrink-0 self-stretch"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-tertiary-dark">
                {policy.name}
              </h3>
              {policy.acronym && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: color + '20', color }}
                >
                  {policy.acronym}
                </span>
              )}
              <span className="text-[9px] text-tertiary-light uppercase tracking-wide">
                {policy.instrumentType}
              </span>
              {policy.inForce && (
                <span className="text-[9px] text-tertiary">in force {policy.inForce}</span>
              )}
            </div>
            <p className="text-[11px] text-tertiary leading-relaxed line-clamp-2">
              {meaning}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {policy.sectors.map(s => {
                const sec = SECTORS.find(x => x.id === s);
                if (!sec) return null;
                return (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: sec.color + '20', color: sec.color }}
                  >
                    {sec.name}
                  </span>
                );
              })}
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-grey-100 p-4 bg-grey-50 text-[12px] text-tertiary-dark leading-relaxed space-y-3">
          <NavigatorMasterCodes
            policyId={policy.id}
            activeCodeId={activeCodeId}
            onCodeFilter={onCodeFilter}
          />
          <NavigatorObjectiveChecklist policyId={policy.id} />
          <div>
            <p className="text-[10px] text-tertiary uppercase tracking-wide font-bold mb-1 flex items-center gap-1">
              What it means
              {promoted.meaning && (
                <PromotedBadge title="Promoted edit from the Project Workspace" />
              )}
            </p>
            <p>{meaning}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={`rounded p-3 border ${
                promoted.currentRequirement
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-grey-200'
              }`}
            >
              <p className="text-[10px] text-tertiary uppercase tracking-wide font-bold mb-1 flex items-center gap-1">
                Current requirement
                {promoted.currentRequirement && (
                  <PromotedBadge title="Promoted edit from the Project Workspace" />
                )}
              </p>
              <p className="text-[11px]">{currentRequirement}</p>
            </div>
            <div
              className={`rounded p-3 border ${
                promoted.futureRequirement
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-grey-200'
              }`}
            >
              <p className="text-[10px] text-tertiary uppercase tracking-wide font-bold mb-1 flex items-center gap-1">
                Future requirement
                {promoted.futureRequirement && (
                  <PromotedBadge title="Promoted edit from the Project Workspace" />
                )}
              </p>
              <p className="text-[11px]">{futureRequirement}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-tertiary uppercase tracking-wide font-bold mb-2">
              Milestones
            </p>
            <div className="space-y-1.5">
              {policy.keyMilestones.map((m, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: color }}
                  >
                    {m.year}
                  </span>
                  <span className="text-[11px]">{m.requirement}</span>
                </div>
              ))}
            </div>
          </div>
          {policy.articleCitations && policy.articleCitations.length > 0 && (() => {
            const links = getCitationLinks(policy);
            return (
              <div className="pt-2 border-t border-grey-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[10px] text-tertiary uppercase tracking-wide font-bold">
                    Legal basis (article-level citations)
                  </p>
                  <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider border border-blue-100">
                    AI-generated links
                  </span>
                </div>
                <ul className="space-y-1">
                  {links.map((link, i) => {
                    const isExternal = link.url.startsWith('http');
                    return (
                      <li key={i} className="text-[10px] text-tertiary-dark flex gap-1.5 items-start">
                        <span className="text-tertiary select-none shrink-0 mt-px">-</span>
                        <a
                          href={link.url}
                          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="group flex-1 hover:text-secondary transition-colors"
                          title={
                            link.hasHighlight
                              ? 'Open in Content Analysis module — scrolls to referenced article'
                              : isExternal
                                ? 'Open on EUR-Lex (external)'
                                : 'Open in Content Analysis module'
                          }
                        >
                          <span className="group-hover:underline decoration-secondary/40">{link.citation}</span>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="inline ml-1 -mt-0.5 opacity-30 group-hover:opacity-70 transition-opacity text-secondary"
                            style={{ verticalAlign: 'middle' }}
                          >
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
          <div className="flex flex-wrap gap-3 text-[10px] text-tertiary-light pt-2 border-t border-grey-200">
            {policy.ceLexId && (
              <a
                href={`https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${policy.ceLexId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                CELEX: {policy.ceLexId} ↗
              </a>
            )}
            {policy.adopted && <span>Adopted: {policy.adopted}</span>}
            <span>Scope: {policy.scope}</span>
            {policy.sourceUrl && (
              <a
                href={policy.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                Official source ↗
              </a>
            )}
          </div>
          <PolicyAnnotationsPanel policyId={policy.id} />
        </div>
      )}
    </div>
  );
}

/** Sidebar widget: filter the sectoral overview by master taxonomy code.
 *  Shows root codes with per-code policy counts; clicking a root expands
 *  to show its immediate children. */
function SLRCodeFilter({
  selectedCode,
  onSelect,
  policyCount,
  totalCount,
}: {
  selectedCode: string | null;
  onSelect: (codeId: string | null) => void;
  policyCount: number;
  totalCount: number;
}) {
  const [openRoot, setOpenRoot] = useState<string | null>(null);
  // The assessment-checklist branch is a per-policy review lens, not a
  // thematic code — it lives in NavigatorObjectiveChecklist, not here.
  const roots = useMemo(
    () => getRootCodes().filter(r => r.id !== 'root-assessment'),
    []
  );

  function policyCountFor(codeId: string): number {
    const desc = getDescendantIds(codeId);
    return SECTOR_POLICIES.filter(p =>
      (POLICY_MASTER_TAGS[p.id] ?? []).some(t => desc.has(t))
    ).length;
  }

  return (
    <div className="bg-white rounded-xl border border-grey-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-tertiary-dark">Filter by SLR code</h3>
        {selectedCode && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[10px] text-secondary hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {selectedCode && (
        <p className="text-[10px] text-tertiary mb-2">
          Showing {policyCount} / {totalCount} policies with code{' '}
          <span className="font-semibold text-tertiary-dark">
            {getMasterCode(selectedCode)?.name ?? selectedCode}
          </span>
        </p>
      )}
      <div className="space-y-1">
        {roots.map(root => {
          const children = getMasterCodeChildren(root.id);
          const isOpen = openRoot === root.id;
          const rootCount = policyCountFor(root.id);
          return (
            <div key={root.id}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(selectedCode === root.id ? null : root.id)}
                  className={`flex-1 text-left flex items-center gap-1.5 text-[11px] px-2 py-1 rounded transition-colors ${
                    selectedCode === root.id
                      ? 'text-white'
                      : 'hover:bg-grey-50 text-tertiary-dark'
                  }`}
                  style={selectedCode === root.id ? { backgroundColor: root.color } : undefined}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: root.color }}
                  />
                  <span className="flex-1">{root.name}</span>
                  <span className="text-[10px] opacity-60">{rootCount}</span>
                </button>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenRoot(isOpen ? null : root.id)}
                    className="text-[10px] text-tertiary-light hover:text-tertiary px-1"
                  >
                    {isOpen ? '▴' : '▾'}
                  </button>
                )}
              </div>
              {isOpen && children.length > 0 && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {children.map(child => {
                    const childCount = policyCountFor(child.id);
                    if (childCount === 0) return null;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => onSelect(selectedCode === child.id ? null : child.id)}
                        className={`w-full text-left flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded transition-colors ${
                          selectedCode === child.id
                            ? 'text-white'
                            : 'hover:bg-grey-50 text-tertiary'
                        }`}
                        style={selectedCode === child.id ? { backgroundColor: child.color } : undefined}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: child.color }}
                        />
                        <span className="flex-1">{child.name}</span>
                        <span className="opacity-60">{childCount}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromotedBadge({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider border border-blue-200"
    >
      Promoted edit
    </span>
  );
}
