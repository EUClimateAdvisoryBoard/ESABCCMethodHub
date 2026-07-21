/**
 * Policy clustering — the first step of the policy coherence analysis.
 * ---------------------------------------------------------------------
 * For each system (energy supply, buildings, agri-food, and others to
 * follow), every relevant EU policy or measure is sorted into one of four
 * categories describing the type of governing resource it uses —
 * information, law, money, or institutional capacity — and tagged for
 * whether it serves mitigation, adaptation, or both. This produces the
 * structured inventory the coherence analysis proper (`PolicyCoherenceBoard`)
 * needs before it can look for gaps, overlaps and conflicts across and
 * within these clusters.
 *
 * The four-category framework (originally "NATO": Nodality, Authority,
 * Treasure, Organization) is Daniel Henstra's policy-instruments typology —
 * see the citation in the intro card below.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  CLUSTER_CATEGORY_IDS,
  CLUSTER_CATEGORY_LABEL,
  CLUSTER_CATEGORY_SUBTITLE,
  CLUSTER_CATEGORY_BODY,
  CLUSTER_CATEGORY_COLOR,
  CLUSTER_RELEVANCE_LABEL,
  CLUSTER_SYSTEMS,
  clusterItemMatches,
  type ClusterItem,
  type ClusterRelevance,
} from '@/lib/content-analysis/policy-clustering';

type RelevanceFilter = 'all' | ClusterRelevance;

const RELEVANCE_FILTERS: RelevanceFilter[] = ['all', 'M', 'A', 'MA'];

export default function PolicyClusteringBoard() {
  const [systemId, setSystemId] = useState(CLUSTER_SYSTEMS[0]?.id ?? '');
  const [relevance, setRelevance] = useState<RelevanceFilter>('all');
  const [detailItem, setDetailItem] = useState<ClusterItem | null>(null);

  const system = useMemo(
    () => CLUSTER_SYSTEMS.find(s => s.id === systemId) ?? CLUSTER_SYSTEMS[0] ?? null,
    [systemId],
  );

  const byCategory = useMemo(() => {
    const m: Record<string, ClusterItem[]> = {};
    if (!system) return m;
    for (const cat of CLUSTER_CATEGORY_IDS) {
      m[cat] = system.items.filter(i => i.category === cat && clusterItemMatches(i, relevance));
    }
    return m;
  }, [system, relevance]);

  return (
    <div className="space-y-4">
      {/* Intro card — what this is doing, plus the Henstra citation */}
      <div className="border border-[#E6E7E8] rounded-md bg-white p-3.5 space-y-2">
        <p className="text-[12.5px] text-[#3D5265] leading-relaxed">
          <strong className="text-[#232019]">What this is doing.</strong> For each system, every relevant
          EU policy or measure is sorted into one of four categories describing the type of governing
          resource it uses — information, law, money, or institutional capacity — and tagged for whether
          it serves mitigation, adaptation, or both. This produces a structured inventory per system: the
          input needed before the coherence analysis proper, which looks for gaps, overlaps, and
          conflicts across and within these clusters (e.g. mitigation instruments that are well-resourced
          with binding rules and funding, while adaptation sits mostly at the information/persuasion level
          with no binding backing).
        </p>
        <p className="text-[11.5px] text-[#8A95A3] leading-relaxed">
          The four-category framework (originally &ldquo;NATO&rdquo;: Nodality, Authority, Treasure,
          Organization) is from Daniel Henstra&rsquo;s policy-instruments typology.{' '}
          <a
            href="https://doi.org/10.1080/14693062.2015.1015946"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00928F] underline underline-offset-2 hover:text-[#085041]"
          >
            Henstra, D. (2015). The tools of climate adaptation policy: analysing instruments and
            instrument selection. <em>Climate Policy</em>. doi:10.1080/14693062.2015.1015946
          </a>
        </p>
      </div>

      {/* The four categories — quick reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {CLUSTER_CATEGORY_IDS.map(cat => (
          <div
            key={cat}
            className="rounded-md border border-[#E6E7E8] bg-white p-3"
            style={{ borderLeft: `3px solid ${CLUSTER_CATEGORY_COLOR[cat]}` }}
          >
            <p className="text-[12.5px] font-semibold text-[#232019]">{CLUSTER_CATEGORY_LABEL[cat]}</p>
            <p className="text-[10.5px] text-[#8A95A3] mb-1.5">{CLUSTER_CATEGORY_SUBTITLE[cat]}</p>
            <p className="text-[11.5px] text-[#3D5265] leading-relaxed">{CLUSTER_CATEGORY_BODY[cat]}</p>
          </div>
        ))}
      </div>

      {/* System tabs */}
      <div className="border-b border-[#E6E7E8] flex items-center gap-1 flex-wrap">
        {CLUSTER_SYSTEMS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setSystemId(s.id); setDetailItem(null); }}
            className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition ${
              system?.id === s.id
                ? 'border-[#00928F] text-[#00928F]'
                : 'border-transparent text-[#8A95A3] hover:text-[#3D5265]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Relevance filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {RELEVANCE_FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setRelevance(f)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              relevance === f
                ? 'bg-[#232019] text-white border-[#232019]'
                : 'bg-white text-[#3D5265] border-[#C9C3B3] hover:border-[#8A95A3]'
            }`}
          >
            {f === 'all' ? 'All' : CLUSTER_RELEVANCE_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Cluster grid — one column per category */}
      {system && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {CLUSTER_CATEGORY_IDS.map(cat => (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-[#3D5265] mb-1.5 leading-snug">
                {CLUSTER_CATEGORY_LABEL[cat]}{' '}
                <span className="font-normal text-[#8A95A3]">({byCategory[cat]?.length ?? 0})</span>
              </p>
              <div className="space-y-1">
                {(byCategory[cat] ?? []).map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="w-full text-left text-[12px] leading-snug rounded-md border border-[#E6E7E8] bg-white px-2.5 py-1.5 hover:border-[#C9C3B3] transition"
                    style={{ borderLeft: `3px solid ${CLUSTER_CATEGORY_COLOR[cat]}` }}
                  >
                    {item.name}
                  </button>
                ))}
                {(byCategory[cat] ?? []).length === 0 && (
                  <p className="text-[11px] text-[#8A95A3] italic px-0.5">None under this filter.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {detailItem && (
        <div className="border border-[#E6E7E8] rounded-md bg-white p-3.5">
          <span
            className="inline-block text-[10.5px] px-2.5 py-0.5 rounded-full mb-1.5"
            style={{
              backgroundColor: `${CLUSTER_CATEGORY_COLOR[detailItem.category]}1a`,
              color: CLUSTER_CATEGORY_COLOR[detailItem.category],
            }}
          >
            {CLUSTER_CATEGORY_LABEL[detailItem.category]} · {CLUSTER_RELEVANCE_LABEL[detailItem.relevance]}
          </span>
          <h4 className="text-[14px] font-semibold text-[#232019] mt-0.5 mb-1">{detailItem.name}</h4>
          <p className="text-[12.5px] text-[#3D5265] leading-relaxed">{detailItem.desc}</p>
        </div>
      )}

      <p className="text-[10.5px] text-[#8A95A3]">
        Draft working tool — instrument lists are a first pass and should be checked against current
        legislation before use in the final coherence analysis.
      </p>
    </div>
  );
}
