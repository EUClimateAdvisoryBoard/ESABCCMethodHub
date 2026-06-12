'use client';

/**
 * Policy Coherence 2.0 — beta module page.
 *
 * The block-level successor to the four-step coherence model: instead of
 * grading each act as one unit, the actual policy texts from the content-
 * analysis corpus are split sentence by sentence and the four lenses —
 * ① ex-ante design vs world development, ② coherence across policy goals,
 * ③ goals vs means, ④ policy evaluation — are applied to every unit. Each
 * unit is modular (stable id, structural path, char offsets) but stays part
 * of the bigger policy file, so within-policy and cross-policy
 * inconsistencies surface with provision-level detail.
 *
 * The engine lives in `src/lib/policy-coherence-2/` and runs identically in
 * the browser (this page, instant) and on the server
 * (`/api/policy-coherence-2/analyze`, which persists units + claims +
 * findings to Supabase as the durable, ML-ready substrate).
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { COHERENCE_STEPS } from '@/lib/content-analysis/policy-coherence';
import { PC2_RULES, runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import type {
  Pc2Finding,
  Pc2RuleId,
  Pc2Severity,
  Pc2Unit,
} from '@/lib/policy-coherence-2/types';

const SEVERITY_STYLE: Record<Pc2Severity, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

const CLAIM_STYLE: Record<string, string> = {
  target: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  deadline: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  obligation: 'bg-blue-50 text-blue-700 border-blue-200',
  instrument: 'bg-violet-50 text-violet-700 border-violet-200',
  financing: 'bg-orange-50 text-orange-700 border-orange-200',
  monitoring: 'bg-teal-50 text-teal-700 border-teal-200',
  review: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  flexibility: 'bg-rose-50 text-rose-700 border-rose-200',
  crossref: 'bg-grey-100 text-tertiary border-grey-200',
};

function SeverityBadge({ severity }: { severity: Pc2Severity }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] ${SEVERITY_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

function FindingCard({ finding }: { finding: Pc2Finding }) {
  const rule = PC2_RULES[finding.ruleId];
  return (
    <div className="border border-grey-200 rounded-lg bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={finding.severity} />
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-tertiary border border-grey-200 rounded px-1.5 py-0.5">
          {finding.scope}
        </span>
        <span className="font-mono text-[9px] text-tertiary">{rule.name}</span>
        {finding.tier && (
          <span className="font-mono text-[9px] text-tertiary">· tier {finding.tier}</span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] font-bold text-tertiary-dark leading-snug">
        {finding.title}
      </p>
      <p className="mt-1 text-[11.5px] text-tertiary leading-relaxed">{finding.detail}</p>
      <p className="mt-1 font-mono text-[9.5px] text-tertiary">
        {finding.policyIds.join(' · ')}
      </p>
      {finding.evidence.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {finding.evidence.map(ev => (
            <blockquote
              key={ev.unitId}
              className="border-l-2 border-grey-200 pl-2 text-[11px] text-tertiary leading-relaxed"
            >
              <span className="font-mono text-[9px] text-tertiary block">
                {ev.policyId} · {ev.path} · {ev.unitId}
              </span>
              “{ev.quote}”
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

function UnitRow({ unit, findings }: { unit: Pc2Unit; findings: Pc2Finding[] }) {
  return (
    <div
      className={`rounded border px-2 py-1.5 ${
        findings.length > 0 ? 'border-amber-200 bg-amber-50/40' : 'border-grey-100 bg-white'
      }`}
    >
      <p className="text-[11.5px] text-tertiary-dark leading-relaxed">{unit.text}</p>
      {(unit.claims.length > 0 || unit.stepIds.length > 0 || findings.length > 0) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {unit.stepIds.map(s => (
            <span
              key={s}
              className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-primary border border-grey-200 rounded px-1 py-0.5"
            >
              {s}
            </span>
          ))}
          {unit.claims.map((c, i) => (
            <span
              key={i}
              title={c.detail}
              className={`text-[9px] border rounded px-1 py-0.5 ${CLAIM_STYLE[c.kind] ?? CLAIM_STYLE.crossref}`}
            >
              {c.kind}
              {c.kind === 'target' && c.value !== undefined ? ` ${c.value}%` : ''}
              {c.kind === 'target' && c.year ? ` @${c.year}` : ''}
            </span>
          ))}
          {findings.map(f => (
            <span
              key={f.id}
              title={f.title}
              className={`text-[9px] border rounded px-1 py-0.5 ${SEVERITY_STYLE[f.severity]}`}
            >
              ⚑ {PC2_RULES[f.ruleId].name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PolicyCoherence2Page() {
  const run = useMemo(() => runPolicyCoherence2(), []);

  const [stepFilter, setStepFilter] = useState<string>('');
  const [ruleFilter, setRuleFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [policyFilter, setPolicyFilter] = useState<string>('');
  const [selectedPolicy, setSelectedPolicy] = useState<string>(
    run.policies[0]?.policyId ?? '',
  );
  const [dbStatus, setDbStatus] = useState<string>('');
  const [writing, setWriting] = useState(false);

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

  const policyUnits = useMemo(
    () => run.units.filter(u => u.policyId === selectedPolicy),
    [run, selectedPolicy],
  );
  const findingsByUnit = useMemo(() => {
    const map = new Map<string, Pc2Finding[]>();
    for (const f of run.findings) {
      for (const uid of f.unitIds) (map.get(uid) ?? map.set(uid, []).get(uid)!).push(f);
    }
    return map;
  }, [run]);
  const unitGroups = useMemo(() => {
    const groups: Array<{ path: string; units: Pc2Unit[] }> = [];
    for (const u of policyUnits) {
      const last = groups[groups.length - 1];
      if (last && last.path === u.path) last.units.push(u);
      else groups.push({ path: u.path, units: [u] });
    }
    return groups;
  }, [policyUnits]);

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
      if (json.persisted === false) {
        setDbStatus('Computed, but Supabase is not configured — nothing persisted.');
      } else if (json.status === 'already-persisted') {
        setDbStatus(
          `This exact run (corpus ${json.corpusHash}) is already in the database — run ${json.runId}.`,
        );
      } else {
        setDbStatus(
          `Persisted run ${json.runId}: ${json.stats.unitCount} units, ${json.stats.claimCount} claims, ${json.stats.findingCount} findings.`,
        );
      }
    } catch (err) {
      setDbStatus(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setWriting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · Block-level four-step coherence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            Policy Coherence 2.0
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            The actual policy texts of the corpus, split sentence by sentence, with the
            four-step coherence model applied to every unit. Each unit is modular — stable id,
            structural path, exact offsets — yet stays part of the bigger policy file, so
            inconsistencies inside an act and across acts surface at provision level. Every
            unit, claim and finding can be written to the database as a durable substrate for
            downstream machine-learning extraction.
          </p>
        </section>

        {/* The four steps, applied block by block */}
        <section className="mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {COHERENCE_STEPS.map(s => (
            <div key={s.id} className="border border-grey-200 rounded-lg bg-white p-3">
              <p className="font-mono text-[18px] font-bold text-primary leading-none">
                {s.ordinal}
              </p>
              <p className="mt-1 text-[12px] font-bold text-tertiary-dark leading-snug">
                {s.name}
              </p>
              <p className="mt-1 text-[10.5px] text-tertiary leading-relaxed">{s.question}</p>
              <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-tertiary">
                applied per sentence unit
              </p>
            </div>
          ))}
        </section>

        {/* Run stats + persistence controls */}
        <section className="mb-6 border border-grey-200 rounded-lg bg-grey-50 p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-tertiary">
            <span>
              <span className="font-bold text-tertiary-dark">{run.stats.policyCount}</span>{' '}
              policies with shipped text
            </span>
            <span>
              <span className="font-bold text-tertiary-dark">{run.stats.blockCount}</span>{' '}
              blocks
            </span>
            <span>
              <span className="font-bold text-tertiary-dark">{run.stats.unitCount}</span>{' '}
              sentence units
            </span>
            <span>
              <span className="font-bold text-tertiary-dark">{run.stats.claimCount}</span>{' '}
              extracted claims
            </span>
            <span>
              <span className="font-bold text-tertiary-dark">{run.stats.findingCount}</span>{' '}
              findings
              <span className="ml-1.5 inline-flex gap-1 align-middle">
                {(['high', 'medium', 'low', 'info'] as Pc2Severity[]).map(sv => (
                  <span
                    key={sv}
                    className={`px-1 rounded border font-mono text-[9px] ${SEVERITY_STYLE[sv]}`}
                  >
                    {run.stats.bySeverity[sv]} {sv}
                  </span>
                ))}
              </span>
            </span>
            <span className="font-mono text-[9.5px]">
              engine {run.engineVersion} · corpus {run.corpusHash}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={writeToDatabase}
              disabled={writing}
              className="px-3 py-1.5 rounded bg-primary text-white text-[12px] font-bold disabled:opacity-50"
            >
              {writing ? 'Writing…' : 'Write analysis to database'}
            </button>
            <a
              href="/api/policy-coherence-2/export"
              className="px-3 py-1.5 rounded border border-grey-200 bg-white text-[12px] font-bold text-tertiary-dark"
            >
              Download ML export (JSONL)
            </a>
            {dbStatus && <span className="text-[11px] text-tertiary">{dbStatus}</span>}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Findings explorer */}
          <section>
            <h2 className="text-lg font-bold text-tertiary-dark mb-2">
              Findings ({filteredFindings.length})
            </h2>
            <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
              <select
                value={stepFilter}
                onChange={e => setStepFilter(e.target.value)}
                className="border border-grey-200 rounded px-1.5 py-1 bg-white text-tertiary"
              >
                <option value="">All steps</option>
                {COHERENCE_STEPS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.ordinal} · {s.shortName}
                  </option>
                ))}
              </select>
              <select
                value={ruleFilter}
                onChange={e => setRuleFilter(e.target.value)}
                className="border border-grey-200 rounded px-1.5 py-1 bg-white text-tertiary max-w-[230px]"
              >
                <option value="">All rules</option>
                {Object.values(PC2_RULES).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({run.stats.byRule[r.id as Pc2RuleId] ?? 0})
                  </option>
                ))}
              </select>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="border border-grey-200 rounded px-1.5 py-1 bg-white text-tertiary"
              >
                <option value="">All severities</option>
                {['high', 'medium', 'low', 'info'].map(sv => (
                  <option key={sv} value={sv}>
                    {sv}
                  </option>
                ))}
              </select>
              <select
                value={policyFilter}
                onChange={e => setPolicyFilter(e.target.value)}
                className="border border-grey-200 rounded px-1.5 py-1 bg-white text-tertiary max-w-[230px]"
              >
                <option value="">All policies</option>
                {run.policies.map(p => (
                  <option key={p.policyId} value={p.policyId}>
                    {p.shortTitle} ({p.findingCount})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 max-h-[860px] overflow-y-auto pr-1">
              {filteredFindings.slice(0, 80).map(f => (
                <FindingCard key={f.id} finding={f} />
              ))}
              {filteredFindings.length > 80 && (
                <p className="text-[11px] text-tertiary">
                  Showing 80 of {filteredFindings.length} — narrow the filters or use the
                  JSONL export for the full set.
                </p>
              )}
              {filteredFindings.length === 0 && (
                <p className="text-[11px] text-tertiary">No findings match the filters.</p>
              )}
            </div>
          </section>

          {/* Block-by-block policy explorer */}
          <section>
            <h2 className="text-lg font-bold text-tertiary-dark mb-2">
              Block-by-block explorer
            </h2>
            <select
              value={selectedPolicy}
              onChange={e => setSelectedPolicy(e.target.value)}
              className="mb-2 border border-grey-200 rounded px-1.5 py-1 bg-white text-[11px] text-tertiary w-full max-w-md"
            >
              {run.policies.map(p => (
                <option key={p.policyId} value={p.policyId}>
                  {p.shortTitle} — {p.unitCount} units · {p.claimCount} claims ·{' '}
                  {p.findingCount} findings
                </option>
              ))}
            </select>
            <div className="space-y-1.5 max-h-[860px] overflow-y-auto pr-1">
              {unitGroups.map((g, gi) => (
                <details
                  key={`${g.path}-${gi}`}
                  open={g.units.some(u => (findingsByUnit.get(u.id)?.length ?? 0) > 0)}
                  className="border border-grey-200 rounded-lg bg-grey-50"
                >
                  <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-bold text-tertiary-dark">
                    {g.path}{' '}
                    <span className="font-normal text-tertiary">
                      · {g.units.length} unit{g.units.length === 1 ? '' : 's'}
                    </span>
                  </summary>
                  <div className="px-2 pb-2 space-y-1">
                    {g.units.map(u => (
                      <UnitRow
                        key={u.id}
                        unit={u}
                        findings={findingsByUnit.get(u.id) ?? []}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Rule book */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Declared rules</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.values(PC2_RULES).map(r => (
              <div key={r.id} className="border border-grey-200 rounded-lg bg-white p-3">
                <div className="flex items-center gap-1.5">
                  <SeverityBadge severity={r.defaultSeverity} />
                  <span className="font-mono text-[9px] text-tertiary">
                    {r.id} · step {r.stepId} · {r.scope}
                  </span>
                </div>
                <p className="mt-1 text-[12px] font-bold text-tertiary-dark">{r.name}</p>
                <p className="mt-1 text-[10.5px] text-tertiary leading-relaxed">{r.rule}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-grey-200 pt-4 text-[11px] text-tertiary leading-relaxed max-w-3xl space-y-2">
          <p className="font-bold text-tertiary-dark text-[12px]">Method note</p>
          <p>
            Policy Coherence 2.0 reuses the four-step model of the act-level coherence board
            (Assumption-Based Planning · Nilsson goal-interaction scale · goals/means
            congruence · distance-to-target evaluation) but changes the unit of analysis: the
            shipped policy texts are split into structural blocks (recitals, articles,
            headings — the same block id space the Content Analysis workbench uses) and each
            block into sentence units. Typed claims are extracted from every unit by declared,
            deterministic rules — no model calls — and all findings follow mechanically from
            the rule book above, quoting the exact units they rest on. The curated act-level
            layer (ex-ante assumption audits, Nilsson interactions) is anchored down to the
            blocks carrying the cited provisions, never re-authored.
          </p>
          <p>
            Candidate findings are deliberately over-inclusive on the cross-policy side:
            divergent same-family targets are flagged for human review even where scopes may
            legitimately differ, because undeclared scope differences are precisely where
            cross-policy incoherence hides. Where the shipped text is an excerpt of the
            consolidated act, absence-based findings (missing MRV, orphan goals) mark where
            the substrate ends, not necessarily where the act does — ingesting the full
            EUR-Lex text upgrades them automatically on the next run. “Write analysis to
            database” persists the full run (units, claims, findings) to Supabase with
            deterministic ids, so every block remains referenceable and the corpus can feed
            downstream machine-learning extraction via the JSONL export.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
