'use client';

/**
 * Policy Coherence 2.0 — beta module page (block-level ESABCC method).
 *
 * The block-level companion to the act-level coherence board: it runs the
 * same ESABCC method (Moure logic) sentence by sentence. Every act is read
 * against the two 2050 ambitions (climate neutrality, a climate-resilient
 * society); each sentence block is decomposed into objectives (targets) and
 * measures (instruments, financing), tagged to a climate dimension
 * (mitigation / adaptation / mitigation–adaptation) and to one of the four
 * lenses (overarching ambitions, objectives & measures, coherence check,
 * critical assessment). What the blocks reveal is then classified, using the
 * Advisory Board's consistency framework (report §2.1), into POLICY GAPS,
 * POLICY INCONSISTENCIES, AMBITION GAPS and IMPLEMENTATION GAPS, each with a
 * numbered reasoning chain from required change → block evidence →
 * conclusion. The block stays the unit of analysis (data wall + inspector),
 * connected micro-to-macro through the policy × gap-type matrix.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PC2_RULES, runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import { PC2_ML_VERSION, runMlAnalysis } from '@/lib/policy-coherence-2/ml';
import {
  CONFIDENCE_LABEL,
  GAP_META,
  runGapAssessment,
  SUBSTRATE_COMPLETE_THRESHOLD,
  type GapConfidence,
  type GapFinding,
  type GapSeverity,
  type GapType,
} from '@/lib/policy-coherence-2/gaps';
import type { Pc2MlPair, Pc2MlPairKind, Pc2RuleId, Pc2Unit } from '@/lib/policy-coherence-2/types';
import {
  CLIMATE_DIMENSIONS,
  COHERENCE_LENSES,
  OVERARCHING_AMBITIONS,
} from '@/lib/content-analysis/policy-coherence';

// ── Visual vocabulary ──────────────────────────────────────────────────────

type UnitState = 'inert' | 'data' | 'flag-low' | 'flag-medium' | 'flag-high';

const STATE_COLOR: Record<UnitState, string> = {
  inert: '#22304A',
  data: '#14B8A6',
  'flag-low': '#38BDF8',
  'flag-medium': '#F59E0B',
  'flag-high': '#EF4444',
};

const STATE_LABEL: Record<UnitState, string> = {
  inert: 'inert text',
  data: 'data-bearing',
  'flag-low': 'in a gap · low / candidate',
  'flag-medium': 'in a gap · medium',
  'flag-high': 'in a gap · high',
};

const CONF_DARK: Record<GapConfidence, string> = {
  corroborated: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  high: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  medium: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  low: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
};

const GAP_SEV_DARK: Record<GapSeverity, string> = {
  high: 'bg-red-500/15 text-red-300 border-red-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  candidate: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

const CLAIM_DARK: Record<string, string> = {
  target: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  deadline: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  obligation: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  instrument: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  financing: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  monitoring: 'bg-teal-500/15 text-teal-300 border-teal-500/40',
  review: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  flexibility: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  crossref: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

const CLAIM_BAR: Record<string, string> = {
  target: '#34D399',
  deadline: '#818CF8',
  obligation: '#60A5FA',
  instrument: '#A78BFA',
  financing: '#FB923C',
  monitoring: '#2DD4BF',
  review: '#22D3EE',
  flexibility: '#FB7185',
  crossref: '#94A3B8',
};

const ML_CONNECTOR: Record<Pc2MlPairKind, { label: string; color: string }> = {
  'contradiction-candidate': { label: 'contradiction', color: '#EF4444' },
  'tradeoff-candidate': { label: 'trade-off', color: '#F59E0B' },
  'duplication-overlap': { label: 'overlap', color: '#38BDF8' },
};

const PANEL = 'rounded-xl border border-[#1E2C46] bg-[#101B30]';
const GAP_TYPES = Object.keys(GAP_META) as GapType[];

// ── Guided tour ────────────────────────────────────────────────────────────

const TOUR_STEPS: Array<{ target: string; title: string; body: string }> = [
  {
    target: 'pc2-tour-hero',
    title: 'Sentences as data, gaps as the lens',
    body: 'Every policy text is decomposed into addressable data blocks. The Advisory Board’s consistency framework classifies what the blocks reveal: policy gaps, policy inconsistencies, ambition gaps and implementation gaps — each defined exactly as in the assessment report.',
  },
  {
    target: 'pc2-tour-methodology',
    title: 'The methodology, end to end',
    body: 'Five declared stages — segment, extract, detect, classify, qualify — shown as a live pipeline with distribution bars. Severity is qualified separately from confidence: triangulated findings (two independent layers agreeing) rank highest, substrate-limited ones lowest. Every parameter is printed.',
  },
  {
    target: 'pc2-tour-wall',
    title: 'The data wall',
    body: 'Every tile is one sentence block of one act. Teal = carries extracted data; blue/amber/red = implicated in a gap finding (worst severity wins); dark = inert text. Click any tile to open it in the inspector.',
  },
  {
    target: 'pc2-tour-inspector',
    title: 'The block inspector',
    body: 'The selected block as a piece of data: claims as structured fields, neighbours in the act, and every gap finding and ML pair that cites it — with full reasoning. Click any linked block to jump to it.',
  },
  {
    target: 'pc2-tour-findings',
    title: 'The gap matrix',
    body: 'Macro view: acts × gap types, plus the lever-coverage scan that detects policy gaps (levers no block in the corpus drives). Click a matrix cell to filter the findings below; every finding carries a numbered reasoning chain down to the blocks.',
  },
  {
    target: 'pc2-tour-ml',
    title: 'Discovered tensions (ML)',
    body: 'The unsupervised pass mines block pairs that pull against each other: contradictions (which feed the inconsistency column as candidates), trade-offs and near-duplicates, plus cross-act theme clusters.',
  },
  {
    target: 'pc2-tour-rules',
    title: 'The signal rules',
    body: 'The declared block-level rules whose outputs are classified into the four gap types. Disagree with a gap? Audit the rule application and the reasoning chain — both are printed.',
  },
  {
    target: 'pc2-tour-method',
    title: 'Method & caveats',
    body: 'Policy-gap verdicts are corpus-relative; absence-based findings mark where the substrate ends. The full reference guide is linked in the hero.',
  },
];

// ── Small building blocks ──────────────────────────────────────────────────

function GapBadge({ gapType }: { gapType: GapType }) {
  const m = GAP_META[gapType];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em]"
      style={{ color: m.color, borderColor: `${m.color}66`, background: `${m.color}1A` }}
    >
      {m.name}
    </span>
  );
}

function SevBadge({ severity }: { severity: GapSeverity }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] ${GAP_SEV_DARK[severity]}`}
    >
      {severity}
    </span>
  );
}

function ConfBadge({ confidence }: { confidence: GapConfidence }) {
  return (
    <span
      title={CONFIDENCE_LABEL[confidence]}
      className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] ${CONF_DARK[confidence]}`}
    >
      conf · {confidence}
    </span>
  );
}

function BlockChip({
  unit,
  state,
  onSelect,
  active,
}: {
  unit: Pc2Unit;
  state: UnitState;
  onSelect: (id: string) => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(unit.id)}
      className={`group flex items-start gap-2 w-full text-left rounded-lg border px-2.5 py-2 transition ${
        active
          ? 'border-[#E87722] bg-[#E87722]/10'
          : 'border-[#1E2C46] bg-[#0B1322] hover:border-[#3A4D6E]'
      }`}
    >
      <span
        className="mt-[3px] inline-block w-[10px] h-[14px] rounded-[2px] shrink-0"
        style={{ background: STATE_COLOR[state] }}
      />
      <span className="min-w-0">
        <span className="block font-mono text-[9px] text-[#7E92AE] truncate">
          {unit.policyId} · {unit.path}
        </span>
        <span className="block text-[11px] text-[#C6D2E2] leading-snug">
          {unit.text.length > 160 ? unit.text.slice(0, 157) + '…' : unit.text}
        </span>
      </span>
    </button>
  );
}

function ReasoningChain({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-1.5 space-y-1">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-[11px] text-[#9DAEC5] leading-relaxed">
          <span className="font-mono text-[10px] text-[#E87722] shrink-0 tabular-nums">{i + 1}.</span>
          <span className={i === steps.length - 1 ? 'text-[#C6D2E2] font-semibold' : undefined}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PolicyCoherence2Page() {
  const run = useMemo(() => runPolicyCoherence2(), []);

  // ML layer (on demand; gap assessment refreshes when it lands)
  const [mlRequested, setMlRequested] = useState(false);
  const [mlKind, setMlKind] = useState<Pc2MlPairKind>('contradiction-candidate');
  const ml = useMemo(() => (mlRequested ? runMlAnalysis(run) : null), [run, mlRequested]);
  const mlPairs = useMemo(() => (ml ? ml.pairs.filter(p => p.kind === mlKind) : []), [ml, mlKind]);

  // Gap assessment — the page's primary output
  const gaps = useMemo(() => runGapAssessment(run, ml), [run, ml]);

  // Lookups
  const unitById = useMemo(() => new Map(run.units.map(u => [u.id, u])), [run]);
  const gapsByUnit = useMemo(() => {
    const map = new Map<string, GapFinding[]>();
    for (const f of gaps.findings) {
      for (const uid of f.unitIds) (map.get(uid) ?? map.set(uid, []).get(uid)!).push(f);
    }
    return map;
  }, [gaps]);
  const mlPairsByUnit = useMemo(() => {
    const map = new Map<string, Pc2MlPair[]>();
    if (!ml) return map;
    for (const p of ml.pairs) {
      for (const uid of [p.unitA, p.unitB]) (map.get(uid) ?? map.set(uid, []).get(uid)!).push(p);
    }
    return map;
  }, [ml]);

  const stateOf = useMemo(() => {
    const rank: Record<GapSeverity, number> = { high: 3, medium: 2, low: 1, candidate: 1 };
    return (id: string): UnitState => {
      const fs = gapsByUnit.get(id);
      if (fs && fs.length > 0) {
        const worst = Math.max(...fs.map(f => rank[f.severity]));
        return worst === 3 ? 'flag-high' : worst === 2 ? 'flag-medium' : 'flag-low';
      }
      return (unitById.get(id)?.claims.length ?? 0) > 0 ? 'data' : 'inert';
    };
  }, [gapsByUnit, unitById]);

  const unitsByPolicy = useMemo(() => {
    const map = new Map<string, Pc2Unit[]>();
    for (const u of run.units) (map.get(u.policyId) ?? map.set(u.policyId, []).get(u.policyId)!).push(u);
    return map;
  }, [run]);

  const claimKindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of run.units) for (const c of u.claims) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [run]);

  // Selection
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  function selectUnit(id: string, scrollWall = true) {
    setSelectedUnitId(id);
    if (scrollWall) {
      document.getElementById(`tile-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  const selected = selectedUnitId ? unitById.get(selectedUnitId) ?? null : null;
  const selectedNeighbours = useMemo(() => {
    if (!selected) return [];
    const units = unitsByPolicy.get(selected.policyId) ?? [];
    const i = units.findIndex(u => u.id === selected.id);
    return units.slice(Math.max(0, i - 2), i + 3).filter(u => u.id !== selected.id);
  }, [selected, unitsByPolicy]);

  // Gap filters (driven by matrix clicks too)
  const [gapTypeFilter, setGapTypeFilter] = useState<GapType | ''>('');
  const [gapSeverityFilter, setGapSeverityFilter] = useState<GapSeverity | ''>('');
  const [gapConfidenceFilter, setGapConfidenceFilter] = useState<GapConfidence | ''>('');
  const [gapPolicyFilter, setGapPolicyFilter] = useState('');
  const filteredGaps = useMemo(
    () =>
      gaps.findings.filter(
        f =>
          (!gapTypeFilter || f.gapType === gapTypeFilter) &&
          (!gapSeverityFilter || f.severity === gapSeverityFilter) &&
          (!gapConfidenceFilter || f.confidence === gapConfidenceFilter) &&
          (!gapPolicyFilter || f.policyIds.includes(gapPolicyFilter)),
      ),
    [gaps, gapTypeFilter, gapSeverityFilter, gapConfidenceFilter, gapPolicyFilter],
  );
  function focusCell(policyId: string, gapType: GapType) {
    setGapPolicyFilter(policyId);
    setGapTypeFilter(gapType);
    setGapSeverityFilter('');
    document.getElementById('pc2-gap-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Persistence
  const [dbStatus, setDbStatus] = useState('');
  const [writing, setWriting] = useState(false);
  const [mlDbStatus, setMlDbStatus] = useState('');
  const [mlWriting, setMlWriting] = useState(false);

  // Tour
  const [tourStep, setTourStep] = useState<number | null>(null);
  useEffect(() => {
    if (tourStep === null) return;
    if (TOUR_STEPS[tourStep].target === 'pc2-tour-ml') setMlRequested(true);
    document
      .getElementById(TOUR_STEPS[tourStep].target)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [tourStep]);
  const tourClass = (id: string) =>
    tourStep !== null && TOUR_STEPS[tourStep].target === id
      ? ' ring-2 ring-[#E87722] ring-offset-4 ring-offset-[#0B1322] rounded-xl'
      : '';

  async function writeToDatabase() {
    setWriting(true);
    setDbStatus('Writing run to database…');
    try {
      const res = await fetch('/api/policy-coherence-2/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      if (json.persisted === false) setDbStatus('Computed — Supabase not configured, nothing persisted.');
      else if (json.status === 'already-persisted') setDbStatus(`Already in the database — run ${json.runId}.`);
      else setDbStatus(`Persisted run ${json.runId}: ${json.stats.unitCount} blocks, ${json.stats.findingCount} signal findings.`);
    } catch (err) {
      setDbStatus(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setWriting(false);
    }
  }

  async function writeMlToDatabase() {
    setMlWriting(true);
    setMlDbStatus('Writing ML results…');
    try {
      const res = await fetch('/api/policy-coherence-2/ml', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      if (json.persisted === false) setMlDbStatus('Computed — Supabase not configured, nothing persisted.');
      else setMlDbStatus(`Persisted: ${json.stats.contradictionCandidates} contradiction, ${json.stats.tradeoffCandidates} trade-off and ${json.stats.duplicationOverlaps} overlap pairs, ${json.stats.clusters} clusters.`);
    } catch (err) {
      setMlDbStatus(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setMlWriting(false);
    }
  }

  const flaggedCount = run.units.filter(u => (gapsByUnit.get(u.id)?.length ?? 0) > 0).length;
  const matrixRows = gaps.matrix.filter(r => r.total > 0);
  const maxCell = Math.max(1, ...matrixRows.flatMap(r => GAP_TYPES.map(t => r.counts[t])));

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B1322] text-[#E6EBF2] min-h-screen">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* ── Header ────────────────────────────────────────────────── */}
          <section id="pc2-tour-hero" className={`scroll-mt-24${tourClass('pc2-tour-hero')}`}>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#7E92AE]">
              Beta module · M·25
            </p>
            <h1 className="mt-1 text-[26px] sm:text-[32px] font-bold tracking-tight">
              Policy Coherence 2.0
            </h1>
            <p className="mt-1 text-[13px] text-[#9DAEC5]">
              The ESABCC coherence method, block by block: every act read against the two 2050
              ambitions, its sentences split into objectives and measures, tagged to a climate
              dimension, then checked for coherence and gaps.
            </p>
            {/* The two overarching ambitions — the anchor of the method */}
            <div className="mt-3 flex flex-wrap gap-2">
              {OVERARCHING_AMBITIONS.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E8772255] bg-[#E8772214] text-[11px] text-[#F2C19A]"
                  title={a.basis}
                >
                  <span className="text-[#E87722]">◆</span>
                  {a.label}
                </span>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-[#9DAEC5]">
              {run.stats.policyCount} acts · {run.stats.unitCount.toLocaleString('en-GB')} blocks ·{' '}
              {run.stats.claimCount.toLocaleString('en-GB')} claims · {gaps.findings.length} gap
              findings · {flaggedCount} blocks implicated
            </p>

            {/* The four gap types — hover for the report's definition */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {GAP_TYPES.map(t => {
                const m = GAP_META[t];
                return (
                  <span
                    key={t}
                    title={m.definition}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] cursor-help"
                    style={{ color: m.color, borderColor: `${m.color}55`, background: `${m.color}14` }}
                  >
                    {m.name}
                    <span className="text-[#E6EBF2] font-bold tabular-nums">{gaps.countsByType[t]}</span>
                  </span>
                );
              })}
            </div>

            {/* Climate dimensions of the coherence check + the four lenses */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#56688A]">
                Dimensions
              </span>
              {CLIMATE_DIMENSIONS.map(d => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#C6D2E2]"
                  title={d.description}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.label}
                  <span className="font-mono text-[10px] text-[#7E92AE] tabular-nums">
                    {run.stats.byDimension[d.id].toLocaleString('en-GB')}
                  </span>
                </span>
              ))}
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#56688A] ml-2">
                Lenses
              </span>
              {COHERENCE_LENSES.map(l => (
                <span key={l.id} className="text-[11px] text-[#9DAEC5]" title={l.question}>
                  <span className="font-mono text-[#7E92AE]">{l.ordinal}</span> {l.shortName}
                  <span className="font-mono text-[10px] text-[#7E92AE] tabular-nums ml-1">
                    {run.stats.byStep[l.id]}
                  </span>
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTourStep(tourStep === null ? 0 : null)}
                className={`px-3 py-1.5 rounded-lg border border-[#E87722] text-[12px] font-bold transition ${
                  tourStep === null
                    ? 'text-[#E87722] hover:bg-[#E87722]/10'
                    : 'bg-[#E87722] text-white'
                }`}
              >
                {tourStep === null
                  ? 'Guided tour'
                  : `Exit tour (${tourStep + 1}/${TOUR_STEPS.length})`}
              </button>
              <Link
                href="/beta/policy-coherence-2/guide"
                className="px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition"
              >
                Guide
              </Link>
              <button
                onClick={writeToDatabase}
                disabled={writing}
                className="px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition disabled:opacity-50"
              >
                {writing ? 'Writing…' : 'Write run to database'}
              </button>
              <a
                href="/api/policy-coherence-2/export"
                className="px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition"
              >
                JSONL export
              </a>
              <span className="font-mono text-[9.5px] text-[#56688A]">
                engine {run.engineVersion} · gaps {gaps.version} · corpus {run.corpusHash}
              </span>
            </div>
            {dbStatus && <p className="mt-2 text-[11px] text-[#9DAEC5]">{dbStatus}</p>}
          </section>

          {/* ── Methodology overview ──────────────────────────────────── */}
          <section
            id="pc2-tour-methodology"
            className={`mt-10 scroll-mt-24${tourClass('pc2-tour-methodology')}`}
          >
            <h2 className="text-[22px] font-bold">Methodology</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              deterministic end to end · corpus {run.corpusHash} · hover any element for its
              definition
            </p>

            <div className={`${PANEL} p-4 mt-3`}>
              {/* Pipeline */}
              <div className="flex flex-col md:flex-row md:items-stretch gap-2">
                {[
                  {
                    name: 'Segment',
                    metric: run.stats.unitCount.toLocaleString('en-GB'),
                    unit: 'sentence blocks',
                    how: `${run.stats.policyCount} shipped policy texts split into ${run.stats.blockCount.toLocaleString('en-GB')} structural blocks, then into sentence units with stable ids (u-<act>-b<block>-s<sentence>), structural paths and char offsets.`,
                  },
                  {
                    name: 'Extract',
                    metric: run.stats.claimCount.toLocaleString('en-GB'),
                    unit: 'typed claims',
                    how: 'Nine claim kinds (targets with indicator family, year and baseline; deadlines; deontic obligations; instruments; financing; MRV; review; flexibility markers; resolved cross-references) extracted by printed patterns. Descriptive shares are guarded out. No model calls.',
                  },
                  {
                    name: 'Detect',
                    metric: `${run.findings.length}${ml ? ` + ${ml.pairs.length}` : ''}`,
                    unit: ml ? 'rule signals + ML pairs' : 'rule signals (ML on demand)',
                    how: 'Three independent layers: 10 declared signal rules over the claims; an unsupervised statistical pass (TF-IDF vectors, cosine pair mining, clustering); the curated layer (assumption audits, Nilsson interactions, EEA pace data) anchored down to blocks.',
                  },
                  {
                    name: 'Classify',
                    metric: String(gaps.findings.length),
                    unit: 'gap findings',
                    how: "Signals mapped into the Advisory Board's consistency framework. Ambition vs implementation splits on the objective–delivery means score: 0.45 and above means the machinery is in place.",
                  },
                  {
                    name: 'Qualify',
                    metric: String(gaps.countsByConfidence.corroborated + gaps.countsByConfidence.high),
                    unit: 'corroborated / high conf.',
                    how: `Severity (impact if true) is scored separately from confidence (method certainty). Two independent layers agreeing upgrades to corroborated; absence-based findings on incomplete substrates (threshold ${SUBSTRATE_COMPLETE_THRESHOLD}) are downgraded.`,
                  },
                ].map((st, i, arr) => (
                  <div key={st.name} className="flex-1 flex items-center gap-2">
                    <div
                      title={st.how}
                      className="flex-1 rounded-lg border border-[#1E2C46] bg-[#0B1322] px-3 py-2.5 text-center cursor-help hover:border-[#3A4D6E] transition"
                    >
                      <p className="text-[9.5px] uppercase tracking-[0.16em] text-[#7E92AE]">{st.name}</p>
                      <p className="mt-1 font-mono text-[18px] font-bold text-[#E6EBF2] tabular-nums">{st.metric}</p>
                      <p className="text-[9px] text-[#56688A]">{st.unit}</p>
                    </div>
                    {i < arr.length - 1 && <span className="hidden md:block w-3 h-px bg-[#3A4D6E] shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Distributions */}
              <div className="mt-5 grid md:grid-cols-3 gap-x-6 gap-y-4">
                {[
                  {
                    label: 'findings by gap type',
                    segs: GAP_TYPES.map(t => ({
                      label: GAP_META[t].name,
                      count: gaps.countsByType[t],
                      color: GAP_META[t].color,
                    })),
                  },
                  {
                    label: 'by severity',
                    segs: (['high', 'medium', 'low', 'candidate'] as GapSeverity[]).map(sv => ({
                      label: sv,
                      count: gaps.findings.filter(f => f.severity === sv).length,
                      color: { high: '#EF4444', medium: '#F59E0B', low: '#38BDF8', candidate: '#64748B' }[sv],
                    })),
                  },
                  {
                    label: 'by confidence',
                    segs: (['corroborated', 'high', 'medium', 'low'] as GapConfidence[]).map(c => ({
                      label: c,
                      count: gaps.countsByConfidence[c],
                      color: { corroborated: '#34D399', high: '#2DD4BF', medium: '#94A3B8', low: '#64748B' }[c],
                    })),
                  },
                ].map(bar => {
                  const total = Math.max(1, bar.segs.reduce((n, x) => n + x.count, 0));
                  return (
                    <div key={bar.label}>
                      <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#7E92AE]">{bar.label}</p>
                      <div className="mt-1.5 flex h-[14px] rounded-md overflow-hidden bg-[#0B1322]">
                        {bar.segs.map(x =>
                          x.count > 0 ? (
                            <div
                              key={x.label}
                              title={`${x.label}: ${x.count}`}
                              className="cursor-help"
                              style={{ width: `${(x.count / total) * 100}%`, background: x.color }}
                            />
                          ) : null,
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {bar.segs.map(x => (
                          <span key={x.label} className="font-mono text-[9px] text-[#7E92AE]">
                            <span style={{ color: x.color }}>{x.label}</span> {x.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guarantees & limitations as tooltip chips */}
              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#7E92AE] mr-1">guarantees</span>
                {[
                  ['Deterministic', 'Same corpus always yields the same ids, claims, scores and findings; the corpus hash on every artefact proves which snapshot produced it.'],
                  ['All rules printed', 'Signal rules, gap definitions, ML parameters and all thresholds (severity bands, means split 0.45, completeness 0.7, ML cosine 0.3) are on this page; reviewers audit rule applications, not opinions.'],
                  ['Evidence cited', 'Every finding quotes verbatim blocks with stable ids, carries a numbered reasoning chain and names the layer(s) it rests on.'],
                  ['Severity ≠ confidence', 'Impact-if-true and method-certainty are scored separately; triangulated findings rank highest, substrate-limited ones lowest.'],
                  ['Reproducible', 'The JSONL export carries the full chain (blocks, claims, signals, ML pairs, gap findings with reasoning) for independent re-analysis.'],
                ].map(([label, tip]) => (
                  <span
                    key={label}
                    title={tip}
                    className="px-2 py-0.5 rounded border border-teal-500/30 text-teal-300 font-mono text-[10px] cursor-help"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#7E92AE] mr-1">limitations</span>
                {[
                  ['Corpus-relative', `Policy-gap verdicts assert silence of the ${run.stats.policyCount}-act tracked corpus, not of EU law; ingesting more acts can clear or confirm them.`],
                  ['Substrate-bounded', `Where shipped texts are excerpts, absence-based findings are confidence-downgraded and say so. Currently below threshold: ${gaps.substrateIncomplete.join(', ') || 'none'}.`],
                  ['Rule-based extraction', 'Claim extraction is pattern-based; residual false positives surface as low-confidence candidates rather than being silently filtered.'],
                  ['Mid-2026 snapshot', 'The curated layer (pace data, assumption audits) reflects the mid-2026 observation snapshot and carries its sources for re-verification.'],
                  ['Candidates need review', 'ML discoveries and cross-act divergences enter only as candidate severity / low confidence; statistics propose, the analyst disposes.'],
                ].map(([label, tip]) => (
                  <span
                    key={label}
                    title={tip}
                    className="px-2 py-0.5 rounded border border-slate-500/40 text-slate-400 font-mono text-[10px] cursor-help"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── Data wall + inspector ─────────────────────────────────── */}
          <section className="mt-10 grid lg:grid-cols-3 gap-5 items-start">
            <div
              id="pc2-tour-wall"
              className={`lg:col-span-2 ${PANEL} p-4 scroll-mt-24${tourClass('pc2-tour-wall')}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-bold">
                  The data wall{' '}
                  <span className="text-[#7E92AE] font-normal text-[12px]">
                    — {run.stats.unitCount.toLocaleString('en-GB')} blocks, one tile each
                  </span>
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {(Object.keys(STATE_COLOR) as UnitState[]).map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 text-[10px] text-[#9DAEC5]">
                      <span
                        className="inline-block w-[10px] h-[14px] rounded-[2px]"
                        style={{ background: STATE_COLOR[s] }}
                      />
                      {STATE_LABEL[s]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[760px] overflow-y-auto pr-2">
                {run.policies.map(p => {
                  const units = unitsByPolicy.get(p.policyId) ?? [];
                  const row = gaps.matrix.find(r => r.policyId === p.policyId);
                  return (
                    <div key={p.policyId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] font-bold text-[#C6D2E2] truncate">{p.shortTitle}</p>
                        <p className="font-mono text-[9px] text-[#56688A] whitespace-nowrap">
                          {p.unitCount} blocks · {p.claimCount} claims · {row?.total ?? 0} gaps
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-[3px]">
                        {units.map(u => {
                          const st = stateOf(u.id);
                          const isSel = u.id === selectedUnitId;
                          return (
                            <button
                              key={u.id}
                              id={`tile-${u.id}`}
                              onClick={() => selectUnit(u.id, false)}
                              title={`${u.path} — ${u.text.slice(0, 120)}`}
                              className={`w-[10px] h-[15px] rounded-[2px] transition-transform hover:scale-[1.6] hover:z-10 ${
                                isSel ? 'outline outline-2 outline-white scale-[1.5] z-10' : ''
                              }`}
                              style={{ background: STATE_COLOR[st] }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspector */}
            <div
              id="pc2-tour-inspector"
              className={`${PANEL} p-4 lg:sticky lg:top-4 scroll-mt-24${tourClass('pc2-tour-inspector')}`}
            >
              <h2 className="text-[17px] font-bold">Block inspector</h2>
              {!selected ? (
                <div className="mt-3 text-[12px] text-[#9DAEC5] leading-relaxed">
                  <p>
                    Click any tile on the wall — or any block chip anywhere on this page — to
                    open it here as a piece of data.
                  </p>
                  <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                    What the corpus carries
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {claimKindCounts.map(([kind, count]) => (
                      <div key={kind} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] w-[74px] text-[#9DAEC5]">{kind}</span>
                        <div className="flex-1 h-[10px] rounded-sm bg-[#0B1322] overflow-hidden">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${Math.max(3, (count / claimKindCounts[0][1]) * 100)}%`,
                              background: CLAIM_BAR[kind] ?? '#94A3B8',
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#7E92AE] w-9 text-right tabular-nums">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 max-h-[700px] overflow-y-auto pr-1">
                  <p className="font-mono text-[9.5px] text-[#E87722]">{selected.id}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#7E92AE]">
                    {selected.policyId} · {selected.path} · chars {selected.startChar}–{selected.endChar}
                  </p>
                  <p
                    className="mt-2 text-[13px] text-[#E6EBF2] leading-relaxed border-l-2 pl-3"
                    style={{ borderColor: STATE_COLOR[stateOf(selected.id)] }}
                  >
                    {selected.text}
                  </p>

                  {selected.claims.length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                        Extracted data
                      </p>
                      <div className="mt-1.5 space-y-1.5">
                        {selected.claims.map((c, i) => (
                          <div key={i} className="rounded-lg border border-[#1E2C46] bg-[#0B1322] px-2.5 py-1.5">
                            <span className={`inline-block text-[9px] border rounded px-1.5 py-0.5 ${CLAIM_DARK[c.kind] ?? CLAIM_DARK.crossref}`}>
                              {c.kind}
                            </span>
                            <span className="ml-2 text-[11px] text-[#C6D2E2]">{c.detail}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(gapsByUnit.get(selected.id) ?? []).length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                        Gap findings citing this block
                      </p>
                      <div className="mt-1.5 space-y-2">
                        {(gapsByUnit.get(selected.id) ?? []).map(f => (
                          <div
                            key={f.id}
                            className="rounded-lg border bg-[#0B1322] px-2.5 py-2"
                            style={{ borderColor: `${GAP_META[f.gapType].color}55` }}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <GapBadge gapType={f.gapType} />
                              <SevBadge severity={f.severity} />
                              <ConfBadge confidence={f.confidence} />
                            </div>
                            <p className="mt-1 text-[11px] font-bold text-[#C6D2E2] leading-snug">{f.title}</p>
                            <ReasoningChain steps={f.reasoning} />
                            {f.unitIds.filter(id => id !== selected.id).length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {f.unitIds
                                  .filter(id => id !== selected.id)
                                  .slice(0, 3)
                                  .map(id => {
                                    const u = unitById.get(id);
                                    return u ? (
                                      <BlockChip key={id} unit={u} state={stateOf(id)} onSelect={uid => selectUnit(uid)} />
                                    ) : null;
                                  })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(mlPairsByUnit.get(selected.id) ?? []).length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                        ML links
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {(mlPairsByUnit.get(selected.id) ?? []).slice(0, 4).map(p => {
                          const otherId = p.unitA === selected.id ? p.unitB : p.unitA;
                          const u = unitById.get(otherId);
                          const conn = ML_CONNECTOR[p.kind];
                          return u ? (
                            <div key={p.id}>
                              <p className="font-mono text-[9px]" style={{ color: conn.color }}>
                                {conn.label} · score {p.score.toFixed(2)}
                              </p>
                              <BlockChip unit={u} state={stateOf(otherId)} onSelect={uid => selectUnit(uid)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </>
                  )}

                  {selectedNeighbours.length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                        Neighbouring blocks in the act
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {selectedNeighbours.map(u => (
                          <BlockChip key={u.id} unit={u} state={stateOf(u.id)} onSelect={uid => selectUnit(uid)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Gap matrix + lever coverage + findings ────────────────── */}
          <section
            id="pc2-tour-findings"
            className={`mt-10 scroll-mt-24${tourClass('pc2-tour-findings')}`}
          >
            <h2 className="text-[22px] font-bold">The gap matrix</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              click a cell to filter the findings · policy gaps have no row — they are levers no
              act in the corpus drives (left panel)
            </p>

            <div className="mt-4 grid lg:grid-cols-3 gap-5 items-start">
              {/* Lever coverage / policy gaps */}
              <div className={`${PANEL} p-4`}>
                <h3 className="text-[13px] font-bold" style={{ color: GAP_META['policy-gap'].color }}>
                  Lever coverage — policy gaps
                </h3>
                <div className="mt-2 space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {gaps.levers
                    .slice()
                    .sort((a, b) => a.targetBlocks + a.instrumentBlocks - (b.targetBlocks + b.instrumentBlocks))
                    .map(l => {
                      const isGap = gaps.findings.some(f => f.leverId === l.leverId);
                      return (
                        <div
                          key={l.leverId}
                          className="rounded-lg border bg-[#0B1322] px-2.5 py-2"
                          style={{ borderColor: isGap ? `${GAP_META['policy-gap'].color}66` : '#1E2C46' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11.5px] font-bold text-[#C6D2E2]">{l.name}</p>
                            {isGap && (
                              <span
                                className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border"
                                style={{
                                  color: GAP_META['policy-gap'].color,
                                  borderColor: `${GAP_META['policy-gap'].color}66`,
                                }}
                              >
                                gap
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[9px] text-[#7E92AE]">
                            {l.targetBlocks} target · {l.instrumentBlocks} instrument · {l.mentionBlocks} mention blocks
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Matrix heatmap */}
              <div className={`lg:col-span-2 ${PANEL} p-4 overflow-x-auto`}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold pb-2 pr-2">
                        Act
                      </th>
                      {GAP_TYPES.filter(t => t !== 'policy-gap').map(t => (
                        <th key={t} className="text-center pb-2 px-1">
                          <span
                            className="font-mono text-[10px] uppercase tracking-[0.08em] font-bold"
                            style={{ color: GAP_META[t].color }}
                          >
                            {GAP_META[t].name.replace('Policy ', '')}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map(r => (
                      <tr key={r.policyId} className="border-t border-[#1E2C46]">
                        <td className="py-1.5 pr-2 text-[11.5px] text-[#C6D2E2] whitespace-nowrap max-w-[220px] truncate">
                          {r.shortTitle}
                        </td>
                        {GAP_TYPES.filter(t => t !== 'policy-gap').map(t => {
                          const n = r.counts[t];
                          const m = GAP_META[t];
                          return (
                            <td key={t} className="py-1.5 px-1 text-center">
                              <button
                                onClick={() => n > 0 && focusCell(r.policyId, t)}
                                disabled={n === 0}
                                className={`w-full max-w-[120px] mx-auto block rounded-md py-1.5 font-mono text-[11px] tabular-nums transition ${
                                  n > 0 ? 'hover:outline hover:outline-1 hover:outline-white/40 cursor-pointer' : 'cursor-default'
                                }`}
                                style={{
                                  background: n === 0 ? '#0B1322' : `${m.color}${Math.round(20 + 60 * (n / maxCell)).toString(16).padStart(2, '0')}`,
                                  color: n === 0 ? '#3A4D6E' : '#E6EBF2',
                                }}
                              >
                                {n}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Findings list */}
            <div id="pc2-gap-list" className="mt-6 scroll-mt-24">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[15px] font-bold mr-2">
                  Gap findings{' '}
                  <span className="text-[#7E92AE] font-normal text-[12px]">
                    — {filteredGaps.length} of {gaps.findings.length}
                  </span>
                </h3>
                <select
                  value={gapTypeFilter}
                  onChange={e => setGapTypeFilter(e.target.value as GapType | '')}
                  className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]"
                >
                  <option value="">All gap types</option>
                  {GAP_TYPES.map(t => (
                    <option key={t} value={t}>
                      {GAP_META[t].name} ({gaps.countsByType[t]})
                    </option>
                  ))}
                </select>
                <select
                  value={gapSeverityFilter}
                  onChange={e => setGapSeverityFilter(e.target.value as GapSeverity | '')}
                  className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]"
                >
                  <option value="">All severities</option>
                  {(['high', 'medium', 'low', 'candidate'] as GapSeverity[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={gapConfidenceFilter}
                  onChange={e => setGapConfidenceFilter(e.target.value as GapConfidence | '')}
                  className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]"
                >
                  <option value="">All confidence</option>
                  {(['corroborated', 'high', 'medium', 'low'] as GapConfidence[]).map(c => (
                    <option key={c} value={c}>{c} ({gaps.countsByConfidence[c]})</option>
                  ))}
                </select>
                <select
                  value={gapPolicyFilter}
                  onChange={e => setGapPolicyFilter(e.target.value)}
                  className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2] max-w-[240px]"
                >
                  <option value="">All acts</option>
                  {matrixRows.map(r => (
                    <option key={r.policyId} value={r.policyId}>
                      {r.shortTitle} ({r.total})
                    </option>
                  ))}
                </select>
                {(gapTypeFilter || gapPolicyFilter || gapSeverityFilter || gapConfidenceFilter) && (
                  <button
                    onClick={() => { setGapTypeFilter(''); setGapPolicyFilter(''); setGapSeverityFilter(''); setGapConfidenceFilter(''); }}
                    className="text-[11px] text-[#7E92AE] underline"
                  >
                    clear
                  </button>
                )}
              </div>

              <div className="mt-3 grid md:grid-cols-2 gap-3">
                {filteredGaps.slice(0, 40).map(f => (
                  <div
                    key={f.id}
                    className={`${PANEL} p-3.5`}
                    style={{ borderLeft: `3px solid ${GAP_META[f.gapType].color}` }}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <GapBadge gapType={f.gapType} />
                      <SevBadge severity={f.severity} />
                      <ConfBadge confidence={f.confidence} />
                      {f.leverName && (
                        <span className="font-mono text-[9px] text-[#7E92AE]">lever: {f.leverName}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] font-bold text-[#E6EBF2] leading-snug">{f.title}</p>
                    <ReasoningChain steps={f.reasoning} />
                    {f.evidence.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {f.evidence.slice(0, 3).map(ev => {
                          const u = unitById.get(ev.unitId);
                          return u ? (
                            <BlockChip
                              key={ev.unitId}
                              unit={u}
                              state={stateOf(ev.unitId)}
                              onSelect={id => selectUnit(id)}
                              active={ev.unitId === selectedUnitId}
                            />
                          ) : null;
                        })}
                      </div>
                    )}
                    <p className="mt-2 font-mono text-[9px] text-[#56688A]">basis: {f.basis.join(' · ')}</p>
                  </div>
                ))}
              </div>
              {filteredGaps.length > 40 && (
                <p className="mt-2 text-[11px] text-[#7E92AE]">
                  Showing 40 of {filteredGaps.length} — narrow the filters or use the JSONL export.
                </p>
              )}
            </div>
          </section>

          {/* ── ML layer ──────────────────────────────────────────────── */}
          <section id="pc2-tour-ml" className={`mt-10 scroll-mt-24${tourClass('pc2-tour-ml')}`}>
            <h2 className="text-[22px] font-bold">Discovered tensions</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              unsupervised TF-IDF pair mining · deterministic · high-scoring contradictions feed
              the inconsistency column as candidates
            </p>
            {!ml ? (
              <button
                onClick={() => setMlRequested(true)}
                className="mt-3 px-3.5 py-2 rounded-lg bg-[#E87722] text-white text-[12px] font-bold hover:bg-[#F08A3C] transition"
              >
                Run ML pass ({PC2_ML_VERSION})
              </button>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(Object.keys(ML_CONNECTOR) as Pc2MlPairKind[]).map(k => (
                    <button
                      key={k}
                      onClick={() => setMlKind(k)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                        mlKind === k
                          ? 'border-[#E87722] bg-[#E87722]/15 text-[#E6EBF2]'
                          : 'border-[#1E2C46] text-[#9DAEC5] hover:border-[#3A4D6E]'
                      }`}
                    >
                      {ML_CONNECTOR[k].label} ({ml.pairs.filter(p => p.kind === k).length})
                    </button>
                  ))}
                  <span className="w-px h-6 bg-[#1E2C46] mx-1 hidden sm:block" />
                  <button
                    onClick={writeMlToDatabase}
                    disabled={mlWriting}
                    className="px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[11px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition disabled:opacity-50"
                  >
                    {mlWriting ? 'Writing…' : 'Write ML results to database'}
                  </button>
                  {mlDbStatus && <span className="text-[11px] text-[#9DAEC5]">{mlDbStatus}</span>}
                </div>

                <div className="mt-4 grid lg:grid-cols-3 gap-5 items-start">
                  <div className="lg:col-span-2 space-y-3 max-h-[720px] overflow-y-auto pr-1">
                    {mlPairs.slice(0, 40).map(p => {
                      const conn = ML_CONNECTOR[p.kind];
                      const ua = unitById.get(p.unitA);
                      const ub = unitById.get(p.unitB);
                      return (
                        <div key={p.id} className={`${PANEL} p-3.5`}>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                            <div className="min-w-0">
                              {ua && <BlockChip unit={ua} state={stateOf(p.unitA)} onSelect={id => selectUnit(id)} active={p.unitA === selectedUnitId} />}
                            </div>
                            <div className="flex flex-col items-center justify-center px-1">
                              <span className="font-mono text-[9px] uppercase tracking-[0.06em]" style={{ color: conn.color }}>
                                {conn.label}
                              </span>
                              <span className="mt-1 font-mono text-[9px] text-[#7E92AE] tabular-nums">
                                {p.score.toFixed(2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              {ub && <BlockChip unit={ub} state={stateOf(p.unitB)} onSelect={id => selectUnit(id)} active={p.unitB === selectedUnitId} />}
                            </div>
                          </div>
                          <p className="mt-2 text-[10.5px] text-[#9DAEC5] leading-relaxed">
                            {p.signals.join(' · ')}
                            {p.axis ? <span className="text-[#F59E0B]"> · axis: {p.axis}</span> : null}
                          </p>
                        </div>
                      );
                    })}
                    {mlPairs.length > 40 && (
                      <p className="text-[11px] text-[#7E92AE]">
                        Showing 40 of {mlPairs.length} — full set in the JSONL export.
                      </p>
                    )}
                  </div>
                  <div className={`${PANEL} p-4`}>
                    <h3 className="text-[13px] font-bold">Cross-act theme clusters</h3>
                    <div className="mt-2 space-y-2 max-h-[660px] overflow-y-auto pr-1">
                      {ml.clusters.map(c => (
                        <div key={c.id} className="rounded-lg border border-[#1E2C46] bg-[#0B1322] p-2.5">
                          <p className="text-[11.5px] font-bold text-[#C6D2E2]">{c.label}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-[#7E92AE]">
                            {c.size} blocks · {c.policyIds.length} acts{c.axis ? ` · ${c.axis}` : ''}
                          </p>
                          <p className="mt-1 text-[10px] text-[#9DAEC5] leading-relaxed">
                            {c.policyIds.join(' · ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── Signal rules ──────────────────────────────────────────── */}
          <section id="pc2-tour-rules" className={`mt-10 scroll-mt-24${tourClass('pc2-tour-rules')}`}>
            <h2 className="text-[22px] font-bold">The signal rules</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              hover a rule for its full definition · counts are from this run
            </p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-1.5">
              {Object.values(PC2_RULES).map(r => (
                <div
                  key={r.id}
                  title={`${r.rule} (${r.scope}, default severity ${r.defaultSeverity})`}
                  className={`${PANEL} px-2.5 py-2 cursor-help hover:border-[#3A4D6E] transition`}
                >
                  <p className="text-[11px] font-bold text-[#C6D2E2] leading-snug">{r.name}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#7E92AE] tabular-nums">
                    {run.stats.byRule[r.id as Pc2RuleId] ?? 0} signals
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Method note ───────────────────────────────────────────── */}
          <section
            id="pc2-tour-method"
            className={`mt-10 border-t border-[#1E2C46] pt-5 max-w-3xl scroll-mt-24${tourClass('pc2-tour-method')}`}
          >
            <details className="text-[11px] text-[#9DAEC5] leading-relaxed">
              <summary className="cursor-pointer font-bold text-[#C6D2E2] text-[12px]">
                Method note
              </summary>
              <p className="mt-2">
                The classification follows the Advisory Board&apos;s consistency framework,
                applied at the level of individual sentence blocks and rolled up per act.
                Block extraction is deterministic; gap classification is rule-mapped (each
                finding prints its basis); the ambition/implementation split follows the
                report&apos;s own logic: measured pace shortfalls count as implementation
                gaps where the delivery machinery is largely in place (means score 0.45 or
                higher from the objective–delivery checklist) and as ambition gaps where the
                machinery itself is thin. Policy-gap verdicts are corpus-relative by
                construction and say so in their reasoning chains. Where a shipped text is
                an excerpt, absence-based findings mark where the substrate ends. The ML
                pass (TF-IDF vector space, cosine pair mining, centroid clustering) is fully
                deterministic; its contradiction candidates enter the inconsistency column
                only above a printed score threshold and always as candidate severity.
              </p>
            </details>
          </section>

          {/* ── Floating tour card ────────────────────────────────────── */}
          {tourStep !== null && (
            <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] rounded-xl border border-[#2A3B5C] bg-[#101B30] shadow-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#E87722] font-bold">
                  Guided tour · {tourStep + 1} / {TOUR_STEPS.length}
                </p>
                <button
                  onClick={() => setTourStep(null)}
                  aria-label="End tour"
                  className="text-[#7E92AE] hover:text-[#E6EBF2] font-mono text-[10px] uppercase"
                >
                  Close
                </button>
              </div>
              <p className="mt-1.5 text-[13px] font-bold text-[#E6EBF2]">{TOUR_STEPS[tourStep].title}</p>
              <p className="mt-1 text-[11.5px] text-[#9DAEC5] leading-relaxed">{TOUR_STEPS[tourStep].body}</p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setTourStep(Math.max(0, tourStep - 1))}
                  disabled={tourStep === 0}
                  className="px-2.5 py-1 rounded-lg border border-[#2A3B5C] text-[11px] font-bold text-[#9DAEC5] disabled:opacity-40"
                >
                  ← Back
                </button>
                {tourStep < TOUR_STEPS.length - 1 ? (
                  <button
                    onClick={() => setTourStep(tourStep + 1)}
                    className="px-2.5 py-1 rounded-lg bg-[#E87722] text-white text-[11px] font-bold"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setTourStep(null)}
                    className="px-2.5 py-1 rounded-lg bg-teal-500 text-white text-[11px] font-bold"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
