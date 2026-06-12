'use client';

/**
 * Policy Coherence 2.0 — beta module page ("data observatory" redesign).
 *
 * Design thesis: a policy text is not prose here — it is ~2,600 addressable
 * DATA BLOCKS that have to fit together like puzzle pieces. The page makes
 * that physical:
 *
 *   · The DATA WALL renders every sentence unit of every act as a tile,
 *     coloured by state (inert · data-bearing · flagged), so the sheer mass
 *     of blocks — and where the friction sits — is visible at a glance.
 *   · The BLOCK INSPECTOR shows any selected tile as structured data:
 *     extracted claims as fields, step tags, its neighbours in the act, and
 *     its puzzle links (findings + ML pairs that cite it).
 *   · Findings are MISFITS — pairs/sets of blocks that don't come together —
 *     and every evidence chip selects the actual tile on the wall.
 *
 * The module deliberately breaks with the site's light chrome (dark theme):
 * it is an instrument panel over the corpus, not a document page. The
 * analysis engine is unchanged (src/lib/policy-coherence-2/).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { COHERENCE_STEPS } from '@/lib/content-analysis/policy-coherence';
import { PC2_RULES, runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import { PC2_ML_VERSION, runMlAnalysis } from '@/lib/policy-coherence-2/ml';
import type {
  Pc2Finding,
  Pc2MlPair,
  Pc2MlPairKind,
  Pc2RuleId,
  Pc2Severity,
  Pc2Unit,
} from '@/lib/policy-coherence-2/types';

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
  'flag-low': 'flagged · low / info',
  'flag-medium': 'flagged · medium',
  'flag-high': 'flagged · high',
};

const SEVERITY_DARK: Record<Pc2Severity, string> = {
  high: 'bg-red-500/15 text-red-300 border-red-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  info: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

const SEVERITY_EDGE: Record<Pc2Severity, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#38BDF8',
  info: '#38BDF8',
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

const ML_CONNECTOR: Record<Pc2MlPairKind, { icon: string; label: string; color: string }> = {
  'contradiction-candidate': { icon: '⚡', label: 'contradiction', color: '#EF4444' },
  'tradeoff-candidate': { icon: '⇄', label: 'trade-off', color: '#F59E0B' },
  'duplication-overlap': { icon: '≡', label: 'overlap', color: '#38BDF8' },
};

const PANEL = 'rounded-xl border border-[#1E2C46] bg-[#101B30]';

// ── Guided tour ────────────────────────────────────────────────────────────

const TOUR_STEPS: Array<{ target: string; title: string; body: string }> = [
  {
    target: 'pc2-tour-hero',
    title: 'Sentences as data',
    body: 'Every policy text is decomposed into addressable data blocks — one per sentence, each with a stable id, structural path and extracted claims. The counters show the full mass of the corpus. The command bar persists the run to the database and exports JSONL for ML pipelines.',
  },
  {
    target: 'pc2-tour-wall',
    title: 'The data wall',
    body: 'Every tile is one sentence block of one act. Teal = carries extracted data; blue/amber/red = cited by a finding (worst severity wins); dark = inert text. Click any tile to open it in the inspector.',
  },
  {
    target: 'pc2-tour-inspector',
    title: 'The block inspector',
    body: 'The selected block as a piece of data: its claims as structured fields, the four-lens tags, its neighbours in the act, and its puzzle links — every finding and ML pair that cites it. Click any linked block to jump to it.',
  },
  {
    target: 'pc2-tour-findings',
    title: 'Where pieces don’t fit',
    body: 'Each misfit names the printed rule it followed and shows the exact blocks that fail to come together. Triage by severity (high first); click an evidence chip to select that block on the wall.',
  },
  {
    target: 'pc2-tour-ml',
    title: 'Discovered tensions (ML)',
    body: 'The unsupervised pass learns a vector model from the corpus and mines block pairs that pull against each other: ⚡ contradictions, ⇄ trade-offs on contested resource axes, ≡ near-duplicates — plus cross-act theme clusters.',
  },
  {
    target: 'pc2-tour-rules',
    title: 'The rule book',
    body: 'Every finding follows mechanically from one of these printed rules. Disagree with a flag? Audit the rule application — that is the point of declaring them.',
  },
  {
    target: 'pc2-tour-method',
    title: 'Method & caveats',
    body: 'Where a shipped text is an excerpt, absence-based findings mark where the substrate ends, not where the act does. The full reference guide is linked in the hero.',
  },
];

// ── Small building blocks ──────────────────────────────────────────────────

function StatBig({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div>
      <p
        className={`font-mono text-[26px] sm:text-[34px] font-bold leading-none tabular-nums ${
          accent ? 'text-[#E87722]' : 'text-[#E6EBF2]'
        }`}
      >
        {typeof value === 'number' ? value.toLocaleString('en-GB') : value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#7E92AE]">{label}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Pc2Severity }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] ${SEVERITY_DARK[severity]}`}
    >
      {severity}
    </span>
  );
}

/** A clickable reference to one block — the "puzzle piece" chip used by
 *  findings, ML pairs and the inspector's link list. */
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function PolicyCoherence2Page() {
  const run = useMemo(() => runPolicyCoherence2(), []);

  // Selection + lookups
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const unitById = useMemo(() => new Map(run.units.map(u => [u.id, u])), [run]);
  const findingsByUnit = useMemo(() => {
    const map = new Map<string, Pc2Finding[]>();
    for (const f of run.findings) {
      for (const uid of f.unitIds) (map.get(uid) ?? map.set(uid, []).get(uid)!).push(f);
    }
    return map;
  }, [run]);

  const stateOf = useMemo(() => {
    const cache = new Map<string, UnitState>();
    const rank: Record<Pc2Severity, number> = { high: 3, medium: 2, low: 1, info: 1 };
    for (const u of run.units) {
      const fs = findingsByUnit.get(u.id);
      if (fs && fs.length > 0) {
        const worst = Math.max(...fs.map(f => rank[f.severity]));
        cache.set(u.id, worst === 3 ? 'flag-high' : worst === 2 ? 'flag-medium' : 'flag-low');
      } else if (u.claims.length > 0) {
        cache.set(u.id, 'data');
      } else {
        cache.set(u.id, 'inert');
      }
    }
    return (id: string): UnitState => cache.get(id) ?? 'inert';
  }, [run, findingsByUnit]);

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

  // Findings filters
  const [stepFilter, setStepFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const filteredFindings = useMemo(
    () =>
      run.findings.filter(
        f =>
          (!stepFilter || f.stepId === stepFilter) &&
          (!ruleFilter || f.ruleId === ruleFilter) &&
          (!severityFilter || f.severity === severityFilter) &&
          (!policyFilter || f.policyIds.includes(policyFilter)),
      ),
    [run, stepFilter, ruleFilter, severityFilter, policyFilter],
  );

  // ML layer
  const [mlRequested, setMlRequested] = useState(false);
  const [mlKind, setMlKind] = useState<Pc2MlPairKind>('contradiction-candidate');
  const ml = useMemo(() => (mlRequested ? runMlAnalysis(run) : null), [run, mlRequested]);
  const mlPairs = useMemo(() => (ml ? ml.pairs.filter(p => p.kind === mlKind) : []), [ml, mlKind]);
  const mlPairsByUnit = useMemo(() => {
    const map = new Map<string, Pc2MlPair[]>();
    if (!ml) return map;
    for (const p of ml.pairs) {
      for (const uid of [p.unitA, p.unitB]) (map.get(uid) ?? map.set(uid, []).get(uid)!).push(p);
    }
    return map;
  }, [ml]);

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

  // Select a block: open inspector + scroll its tile into view.
  const wallRef = useRef<HTMLDivElement>(null);
  function selectUnit(id: string, scrollWall = true) {
    setSelectedUnitId(id);
    if (scrollWall) {
      document
        .getElementById(`tile-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const selected = selectedUnitId ? unitById.get(selectedUnitId) ?? null : null;
  const selectedNeighbours = useMemo(() => {
    if (!selected) return [];
    const units = unitsByPolicy.get(selected.policyId) ?? [];
    const i = units.findIndex(u => u.id === selected.id);
    return units.slice(Math.max(0, i - 2), i + 3).filter(u => u.id !== selected.id);
  }, [selected, unitsByPolicy]);

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
      else setDbStatus(`Persisted run ${json.runId}: ${json.stats.unitCount} blocks, ${json.stats.findingCount} findings.`);
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
      else setMlDbStatus(`Persisted: ${json.stats.contradictionCandidates} ⚡ · ${json.stats.tradeoffCandidates} ⇄ · ${json.stats.duplicationOverlaps} ≡ · ${json.stats.clusters} clusters.`);
    } catch (err) {
      setMlDbStatus(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setMlWriting(false);
    }
  }

  const flaggedCount = run.units.filter(u => (findingsByUnit.get(u.id)?.length ?? 0) > 0).length;

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B1322] text-[#E6EBF2] min-h-screen">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* ── Hero ──────────────────────────────────────────────────── */}
          <section id="pc2-tour-hero" className={`scroll-mt-24${tourClass('pc2-tour-hero')}`}>
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#E87722] font-bold">
              Beta · M·25 · block-level coherence
            </p>
            <h1 className="mt-2 text-[30px] sm:text-[44px] font-bold leading-[1.05] tracking-tight">
              Every sentence is a piece of data.
              <br />
              <span className="text-[#7E92AE]">Do the pieces fit together?</span>
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] text-[#9DAEC5] leading-relaxed">
              The corpus is decomposed into addressable blocks — one per sentence, each with a
              stable id, a structural path and machine-extracted claims. The four coherence
              lenses then test how the pieces interlock: inside each act and across the whole
              policy space. Where they don&apos;t come together, that&apos;s not noise —
              that&apos;s a finding.
            </p>

            <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-x-6 gap-y-4">
              <StatBig value={run.stats.policyCount} label="acts" />
              <StatBig value={run.stats.blockCount} label="text blocks" />
              <StatBig value={run.stats.unitCount} label="data blocks" accent />
              <StatBig value={run.stats.claimCount} label="extracted claims" />
              <StatBig value={flaggedCount} label="blocks flagged" />
              <StatBig value={run.stats.findingCount} label="misfits found" accent />
            </div>

            {/* Lens strip */}
            <div className="mt-6 grid sm:grid-cols-4 gap-2">
              {COHERENCE_STEPS.map(s => (
                <div key={s.id} className={`${PANEL} px-3 py-2.5`}>
                  <p className="font-mono text-[14px] font-bold text-[#E87722] leading-none">
                    {s.ordinal}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-[#E6EBF2] leading-snug">{s.name}</p>
                  <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#7E92AE]">
                    applied per block
                  </p>
                </div>
              ))}
            </div>

            {/* Command bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTourStep(0)}
                className="px-3.5 py-2 rounded-lg bg-[#E87722] text-white text-[12px] font-bold hover:bg-[#F08A3C] transition"
              >
                ▶ Guided tour
              </button>
              <Link
                href="/beta/policy-coherence-2/guide"
                className="px-3.5 py-2 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition"
              >
                Full guide →
              </Link>
              <span className="w-px h-6 bg-[#1E2C46] mx-1 hidden sm:block" />
              <button
                onClick={writeToDatabase}
                disabled={writing}
                className="px-3.5 py-2 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition disabled:opacity-50"
              >
                {writing ? 'Writing…' : '⛁ Write run to database'}
              </button>
              <a
                href="/api/policy-coherence-2/export"
                className="px-3.5 py-2 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition"
              >
                ⬇ JSONL export
              </a>
              <span className="font-mono text-[9.5px] text-[#56688A]">
                engine {run.engineVersion} · corpus {run.corpusHash}
              </span>
            </div>
            {dbStatus && <p className="mt-2 text-[11px] text-[#9DAEC5]">{dbStatus}</p>}
          </section>

          {/* ── Data wall + inspector ─────────────────────────────────── */}
          <section className="mt-10 grid lg:grid-cols-3 gap-5 items-start">
            <div
              id="pc2-tour-wall"
              ref={wallRef}
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
                  return (
                    <div key={p.policyId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] font-bold text-[#C6D2E2] truncate">
                          {p.shortTitle}
                        </p>
                        <p className="font-mono text-[9px] text-[#56688A] whitespace-nowrap">
                          {p.unitCount} blocks · {p.claimCount} claims · {p.findingCount} misfits
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
                  <p className="mt-2 text-[13px] text-[#E6EBF2] leading-relaxed border-l-2 pl-3"
                     style={{ borderColor: STATE_COLOR[stateOf(selected.id)] }}>
                    {selected.text}
                  </p>

                  {selected.stepIds.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {selected.stepIds.map(s => (
                        <span
                          key={s}
                          className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#E87722] border border-[#E87722]/40 rounded px-1.5 py-0.5"
                        >
                          lens · {s}
                        </span>
                      ))}
                    </div>
                  )}

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

                  {(findingsByUnit.get(selected.id) ?? []).length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[#7E92AE] font-bold">
                        Puzzle links — misfits citing this block
                      </p>
                      <div className="mt-1.5 space-y-2">
                        {(findingsByUnit.get(selected.id) ?? []).map(f => (
                          <div
                            key={f.id}
                            className="rounded-lg border bg-[#0B1322] px-2.5 py-2"
                            style={{ borderColor: `${SEVERITY_EDGE[f.severity]}55` }}
                          >
                            <div className="flex items-center gap-1.5">
                              <SeverityBadge severity={f.severity} />
                              <span className="font-mono text-[9px] text-[#7E92AE]">
                                {PC2_RULES[f.ruleId].name}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-bold text-[#C6D2E2] leading-snug">{f.title}</p>
                            <p className="mt-1 text-[10.5px] text-[#9DAEC5] leading-relaxed">
                              <span className="font-bold text-[#C6D2E2]">Why flagged: </span>
                              {f.detail}
                            </p>
                            <p className="mt-1 text-[9.5px] text-[#56688A] leading-relaxed italic">
                              Rule applied: {PC2_RULES[f.ruleId].rule}
                            </p>
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
                                {conn.icon} {conn.label} · score {p.score.toFixed(2)}
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

          {/* ── Misfits (findings) ────────────────────────────────────── */}
          <section
            id="pc2-tour-findings"
            className={`mt-10 scroll-mt-24${tourClass('pc2-tour-findings')}`}
          >
            <h2 className="text-[22px] font-bold">
              Where the pieces don&apos;t fit{' '}
              <span className="text-[#7E92AE] font-normal text-[13px]">
                — {filteredFindings.length} of {run.findings.length} misfits shown
              </span>
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <select value={stepFilter} onChange={e => setStepFilter(e.target.value)}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]">
                <option value="">All lenses</option>
                {COHERENCE_STEPS.map(s => (
                  <option key={s.id} value={s.id}>{s.ordinal} · {s.shortName}</option>
                ))}
              </select>
              <select value={ruleFilter} onChange={e => setRuleFilter(e.target.value)}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2] max-w-[240px]">
                <option value="">All rules</option>
                {Object.values(PC2_RULES).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({run.stats.byRule[r.id as Pc2RuleId] ?? 0})
                  </option>
                ))}
              </select>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]">
                <option value="">All severities</option>
                {['high', 'medium', 'low', 'info'].map(sv => <option key={sv} value={sv}>{sv}</option>)}
              </select>
              <select value={policyFilter} onChange={e => setPolicyFilter(e.target.value)}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2] max-w-[240px]">
                <option value="">All acts</option>
                {run.policies.map(p => (
                  <option key={p.policyId} value={p.policyId}>{p.shortTitle} ({p.findingCount})</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {filteredFindings.slice(0, 60).map(f => (
                <div
                  key={f.id}
                  className={`${PANEL} p-3.5`}
                  style={{ borderLeft: `3px solid ${SEVERITY_EDGE[f.severity]}` }}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#7E92AE] border border-[#1E2C46] rounded px-1.5 py-0.5">
                      {f.scope}
                    </span>
                    <span className="font-mono text-[9px] text-[#7E92AE]">{PC2_RULES[f.ruleId].name}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-bold text-[#E6EBF2] leading-snug">{f.title}</p>
                  <p className="mt-1 text-[11px] text-[#9DAEC5] leading-relaxed">{f.detail}</p>
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
                        ) : (
                          <p key={ev.unitId} className="text-[10.5px] text-[#9DAEC5] pl-2 border-l border-[#1E2C46]">
                            {ev.policyId} · {ev.path}: “{ev.quote.slice(0, 140)}…”
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredFindings.length > 60 && (
              <p className="mt-2 text-[11px] text-[#7E92AE]">
                Showing 60 of {filteredFindings.length} — narrow the filters or use the JSONL export.
              </p>
            )}
          </section>

          {/* ── ML layer ──────────────────────────────────────────────── */}
          <section id="pc2-tour-ml" className={`mt-10 scroll-mt-24${tourClass('pc2-tour-ml')}`}>
            <h2 className="text-[22px] font-bold">Discovered tensions</h2>
            <p className="mt-1 text-[12px] text-[#9DAEC5] max-w-3xl leading-relaxed">
              The machine-learning pass learns a TF-IDF vector model from the blocks themselves
              and mines pairs that pull against each other — beyond what any declared rule
              names. Deterministic and recomputable; no external model.
            </p>
            {!ml ? (
              <button
                onClick={() => setMlRequested(true)}
                className="mt-3 px-3.5 py-2 rounded-lg bg-[#E87722] text-white text-[12px] font-bold hover:bg-[#F08A3C] transition"
              >
                ▶ Run ML pass ({PC2_ML_VERSION})
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
                      <span style={{ color: ML_CONNECTOR[k].color }}>{ML_CONNECTOR[k].icon}</span>{' '}
                      {ML_CONNECTOR[k].label} ({ml.pairs.filter(p => p.kind === k).length})
                    </button>
                  ))}
                  <span className="w-px h-6 bg-[#1E2C46] mx-1 hidden sm:block" />
                  <button
                    onClick={writeMlToDatabase}
                    disabled={mlWriting}
                    className="px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[11px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition disabled:opacity-50"
                  >
                    {mlWriting ? 'Writing…' : '⛁ Write ML results to database'}
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
                              <span className="text-[20px] leading-none" style={{ color: conn.color }}>
                                {conn.icon}
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

          {/* ── Rule book ─────────────────────────────────────────────── */}
          <section id="pc2-tour-rules" className={`mt-10 scroll-mt-24${tourClass('pc2-tour-rules')}`}>
            <h2 className="text-[22px] font-bold">The rule book</h2>
            <p className="mt-1 text-[12px] text-[#9DAEC5]">
              Every misfit follows mechanically from one of these declared rules.
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {Object.values(PC2_RULES).map(r => (
                <div key={r.id} className={`${PANEL} p-3`}>
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={r.defaultSeverity} />
                    <span className="font-mono text-[9px] text-[#7E92AE]">
                      {r.id} · {r.stepId} · {r.scope}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-bold text-[#E6EBF2]">{r.name}</p>
                  <p className="mt-1 text-[10.5px] text-[#9DAEC5] leading-relaxed">{r.rule}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Method note ───────────────────────────────────────────── */}
          <section
            id="pc2-tour-method"
            className={`mt-10 border-t border-[#1E2C46] pt-5 text-[11px] text-[#9DAEC5] leading-relaxed max-w-3xl space-y-2 scroll-mt-24${tourClass('pc2-tour-method')}`}
          >
            <p className="font-bold text-[#E6EBF2] text-[12px]">Method note</p>
            <p>
              Blocks reuse the Content Analysis block id space and split further into sentence
              units with deterministic ids, so every tile is durably addressable. Claims are
              extracted by declared, deterministic rules; findings follow mechanically from
              the rule book; the curated act-level layer (ex-ante audits, Nilsson goal
              interactions) is anchored down to the blocks carrying the cited provisions,
              never re-authored. Candidate findings are deliberately over-inclusive on the
              cross-policy side — undeclared scope differences are exactly where incoherence
              hides. Where a shipped text is an excerpt of the consolidated act,
              absence-based findings mark where the substrate ends, not necessarily where the
              act does. The ML pass is classical unsupervised learning (TF-IDF vector space,
              cosine pair mining, centroid clustering): fully deterministic and recomputable
              from the printed parameters, with standard final provisions stop-listed so
              drafting convention does not masquerade as coherence signal.
            </p>
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
                  className="text-[#7E92AE] hover:text-[#E6EBF2] text-[14px] leading-none"
                >
                  ✕
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
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => setTourStep(null)}
                    className="px-2.5 py-1 rounded-lg bg-teal-500 text-white text-[11px] font-bold"
                  >
                    Done ✓
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
