'use client';
/**
 * M·36 — Policy Targets Register (beta).
 * --------------------------------------
 * A reviewable table of every target / goal / objective / commitment extracted
 * VERBATIM from the enacting terms of the EU climate acquis, one row per target.
 * Columns 1–11 follow the agreed schema; column 12 is a human-confirmation
 * checkbox — rows are grey until a reviewer ticks them, then turn green. The
 * whole table (with confirmation status) is downloadable as Excel or CSV.
 *
 * The dataset is recall-first (agents + regex, see scripts/build-policy-targets.mjs)
 * so reviewers are expected to prune/confirm rather than hunt for omissions.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import {
  policyTargets,
  computeStats,
  COLUMNS,
  LABEL_META,
  OBLIGATION_META,
  TYPE_META,
  CLIMATE_META,
  type PolicyTarget,
} from '@/data/policy-targets';
import { useTargetConfirmations } from '@/lib/useTargetConfirmations';
import TargetSourceModal from './TargetSourceModal';

type FilterKey = 'policy' | 'document_type' | 'target_label' | 'obligation' | 'target_type' | 'climate_relevance';

function uniqueSorted<T>(xs: T[]): T[] {
  return [...new Set(xs)].sort() as T[];
}

function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span className="inline-block text-[10.5px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color, background: bg ?? color + '18' }}>
      {label}
    </span>
  );
}

export default function PolicyTargetsRegisterPage() {
  const { isConfirmed, toggle, setMany, count, hydrated } = useTargetConfirmations();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    policy: 'all', document_type: 'all', target_label: 'all', obligation: 'all', target_type: 'all', climate_relevance: 'all',
  });
  const [timeline, setTimeline] = useState<'all' | 'timebound' | 'unspecified'>('all');
  const [confirmView, setConfirmView] = useState<'all' | 'confirmed' | 'unconfirmed'>('all');
  // Relevance lens — defaults to "relevant" so the register opens on the targets
  // that materially bear on the climate/energy transition, hiding the peripheral
  // institutional/procedural commitments carried by the resilience/health/cohesion acts.
  const [relevanceView, setRelevanceView] = useState<'all' | 'relevant' | 'peripheral'>('relevant');
  const [downloading, setDownloading] = useState(false);
  // Target whose EUR-Lex source text is open in the reader modal (null = closed).
  const [sourceTarget, setSourceTarget] = useState<PolicyTarget | null>(null);

  const options = useMemo(() => ({
    policy: uniqueSorted(policyTargets.map((t) => t.policy_short)),
    document_type: uniqueSorted(policyTargets.map((t) => t.document_type)),
    target_label: uniqueSorted(policyTargets.map((t) => t.target_label)),
    obligation: uniqueSorted(policyTargets.map((t) => t.obligation)),
    target_type: uniqueSorted(policyTargets.map((t) => t.target_type)),
    climate_relevance: uniqueSorted(policyTargets.map((t) => t.climate_relevance)),
  }), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policyTargets.filter((t) => {
      if (filters.policy !== 'all' && t.policy_short !== filters.policy) return false;
      if (filters.document_type !== 'all' && t.document_type !== filters.document_type) return false;
      if (filters.target_label !== 'all' && t.target_label !== filters.target_label) return false;
      if (filters.obligation !== 'all' && t.obligation !== filters.obligation) return false;
      if (filters.target_type !== 'all' && t.target_type !== filters.target_type) return false;
      if (filters.climate_relevance !== 'all' && t.climate_relevance !== filters.climate_relevance) return false;
      if (relevanceView === 'relevant' && !t.relevant) return false;
      if (relevanceView === 'peripheral' && t.relevant) return false;
      if (timeline === 'timebound' && !t.timeline) return false;
      if (timeline === 'unspecified' && t.timeline) return false;
      if (confirmView === 'confirmed' && !isConfirmed(t.id)) return false;
      if (confirmView === 'unconfirmed' && isConfirmed(t.id)) return false;
      if (q && !t.target_text.toLowerCase().includes(q) && !t.policy_name.toLowerCase().includes(q) && !t.article.toLowerCase().includes(q) && !t.indicators.join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, filters, relevanceView, timeline, confirmView, isConfirmed]);

  const stats = useMemo(() => computeStats(policyTargets), []);

  // ── Exports ────────────────────────────────────────────────────────────
  const rowRecords = (rows: PolicyTarget[]) => rows.map((t) => {
    const rec: Record<string, string> = {};
    for (const c of COLUMNS) rec[c.header] = c.value(t);
    rec['12 · Human confirmed'] = isConfirmed(t.id) ? 'Yes' : 'No';
    return rec;
  });

  const downloadCSV = () => {
    const headers = [...COLUMNS.map((c) => c.header), '12 · Human confirmed'];
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(esc).join(',')];
    for (const rec of rowRecords(filtered)) lines.push(headers.map((h) => esc(rec[h])).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eu-policy-targets.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const fileSaverMod: any = await import('file-saver');
      const saveAs = fileSaverMod.saveAs || fileSaverMod.default?.saveAs || fileSaverMod.default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ESABCC Method Hub — Policy Targets Register';
      const ws = wb.addWorksheet('Policy targets', { views: [{ state: 'frozen', ySplit: 1 }] });
      const cols = [...COLUMNS, { key: 'confirmed', header: '12 · Human confirmed', width: 16 } as any];
      ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00928F' } };
      ws.getRow(1).alignment = { vertical: 'middle', wrapText: true };
      for (const t of filtered) {
        const confirmedRow = isConfirmed(t.id);
        const row = ws.addRow({
          ...Object.fromEntries(COLUMNS.map((c) => [c.key, c.value(t)])),
          confirmed: confirmedRow ? 'Yes' : 'No',
        });
        row.alignment = { vertical: 'top', wrapText: true };
        if (confirmedRow) {
          row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F6EC' } }; });
        }
      }
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'eu-policy-targets.xlsx');
    } finally {
      setDownloading(false);
    }
  };

  const shownIds = filtered.map((t) => t.id);

  return (
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)]">
      <SiteHeader />
      <PageHero
        title="Policy Targets Register"
        subtitle="Every target, goal, objective and commitment extracted verbatim from the enacting terms (articles/annexes, not preambles) of the EU climate acquis — one row per target, classified by obligation, type, timeline and climate-relevance, and downloadable as Excel."
      />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-4">
          <Stat n={stats.total} label="Targets" color="#00928F" />
          <Stat n={stats.relevant} label="Relevant (lens)" color="#0d9488" />
          <Stat n={stats.policies} label="Policies" color="#3D5265" />
          <Stat n={stats.mandatory} label="Mandatory" color="#b91c1c" />
          <Stat n={stats.quantitative} label="Quantitative" color="#0f766e" />
          <Stat n={stats.byClimate.mitigation + stats.byClimate.both} label="Mitigation" color={CLIMATE_META.mitigation.color} />
          <Stat n={stats.byClimate.adaptation + stats.byClimate.both} label="Adaptation" color={CLIMATE_META.adaptation.color} />
        </div>

        {/* Methodology + review note */}
        <details className="mb-4 rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3.5 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)]">
          <summary className="cursor-pointer font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">About this register — sourcing, columns & the human-confirm workflow</summary>
          <div className="mt-2.5 space-y-2 leading-relaxed">
            <p><strong>Sourcing.</strong> Each <em>Target text</em> is a verbatim slice of the act&rsquo;s enacting terms (articles/annexes) in the consolidated EUR-Lex text — the preamble/recitals are excluded. Candidates were gathered by a fan-out of reading agents (recall-first) plus a regex safety-net, then every quote was validated as an exact source substring before being kept.</p>
            <p><strong>Obligation</strong> is read from the instrument type (regulations/directives bind; communications/strategies are soft law) and the modal verb (&ldquo;shall&rdquo; → mandatory, &ldquo;should&rdquo; → voluntary). <strong>Type</strong> is quantitative when a number/%/date threshold is present, else qualitative. <strong>Climate-relevance</strong> flags mitigation and/or adaptation.</p>
            <p><strong>Relevance lens.</strong> The register spans the climate acquis plus the resilience, health and cohesion acts that were added for their transition-relevant provisions — which also carry many generic institutional, procedural or non-climate commitments. Each row is flagged <em>relevant</em> when it states a substantive target that materially bears on the climate/energy transition (mitigation, adaptation/resilience, energy, climate-linked environment/nature, clean-tech/industry, or finance channelled to those ends), or <em>peripheral</em> otherwise. The <em>Relevance</em> filter defaults to <em>relevant</em>, so the register opens on the transition-material targets; set it to <em>all</em> (or <em>peripheral</em>) to see the rest. Flags start from a deterministic rule and are refined per row by the fact-check pass.</p>
            <p><strong>Review (column 12).</strong> Because extraction favours recall, every row starts <span className="px-1 rounded bg-grey-200 text-tertiary-dark">grey / unconfirmed</span>. Tick <em>Confirmed</em> to mark a row human-verified — it turns <span className="px-1 rounded" style={{ background: '#E7F6EC', color: '#15803d' }}>green</span>. Confirmations are saved in your browser and included in the Excel/CSV export. This is a screening aid — always check against the source act.</p>
          </div>
        </details>

        {/* Toolbar */}
        <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3 mb-3 flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search target text, act, article, indicator…"
            className="flex-1 min-w-[200px] text-sm px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] text-tertiary-dark dark:text-[var(--mh-fg)]" />
          <Sel label="Relevance" value={relevanceView} set={(v) => setRelevanceView(v as any)} opts={['relevant', 'peripheral']} cap />
          <Sel label="Policy" value={filters.policy} set={(v) => setFilters({ ...filters, policy: v })} opts={options.policy} />
          <Sel label="Type" value={filters.document_type} set={(v) => setFilters({ ...filters, document_type: v })} opts={options.document_type} cap />
          <Sel label="Label" value={filters.target_label} set={(v) => setFilters({ ...filters, target_label: v })} opts={options.target_label} cap />
          <Sel label="Obligation" value={filters.obligation} set={(v) => setFilters({ ...filters, obligation: v })} opts={options.obligation} cap />
          <Sel label="Target type" value={filters.target_type} set={(v) => setFilters({ ...filters, target_type: v })} opts={options.target_type} cap />
          <Sel label="Climate" value={filters.climate_relevance} set={(v) => setFilters({ ...filters, climate_relevance: v })} opts={options.climate_relevance} cap />
          <Sel label="Timeline" value={timeline} set={(v) => setTimeline(v as any)} opts={['timebound', 'unspecified']} />
          <Sel label="Review" value={confirmView} set={(v) => setConfirmView(v as any)} opts={['confirmed', 'unconfirmed']} />
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-[12.5px]">
          <span className="text-tertiary dark:text-[var(--mh-muted)]">
            <strong className="text-tertiary-dark dark:text-[var(--mh-fg)]">{filtered.length}</strong> shown · {stats.relevant} relevant of {stats.total} · {hydrated ? count : '…'} confirmed
            {relevanceView === 'relevant' && <span className="ml-1 italic">(peripheral rows hidden — switch <em>Relevance</em> to <em>all</em> to include them)</span>}
          </span>
          <button onClick={() => setMany(shownIds, true)} className="px-2.5 py-1 rounded border border-green-300 text-green-700 bg-green-50 hover:bg-green-100">Confirm all shown</button>
          <button onClick={() => setMany(shownIds, false)} className="px-2.5 py-1 rounded border border-grey-300 text-tertiary hover:bg-grey-100">Clear shown</button>
          <div className="ml-auto flex gap-2">
            <Link href="/beta/policy-targets/summary" className="px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] font-medium hover:bg-grey-100">
              ▤ Summary &amp; figures
            </Link>
            <button onClick={downloadExcel} disabled={downloading} className="px-3 py-1.5 rounded-md bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50">
              {downloading ? 'Preparing…' : '⬇ Download Excel'}
            </button>
            <button onClick={downloadCSV} className="px-3 py-1.5 rounded-md border border-grey-300 text-tertiary-dark dark:text-[var(--mh-fg)] font-medium hover:bg-grey-100">⬇ CSV</button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-grey-100 dark:bg-[var(--mh-bg)] text-left text-tertiary-dark dark:text-[var(--mh-fg)]">
                <Th w="52px">✓ Conf.</Th>
                <Th w="34px">#</Th>
                <Th w="200px">Name of policy</Th>
                <Th w="96px">Type</Th>
                <Th w="110px">Policy area</Th>
                <Th w="420px">Target text (verbatim)</Th>
                <Th w="104px">Label</Th>
                <Th w="96px">Obligation</Th>
                <Th w="104px">Target type</Th>
                <Th w="150px">Timeline</Th>
                <Th w="180px">Indicators</Th>
                <Th w="140px">Climate</Th>
                <Th w="70px">Source</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const confirmed = isConfirmed(t.id);
                return (
                  <tr key={t.id}
                    className={`align-top border-t border-grey-100 dark:border-[var(--mh-border)] transition-colors ${confirmed ? 'bg-green-50 dark:bg-[#12261a]' : 'bg-grey-50/40 dark:bg-transparent'}`}
                    style={confirmed ? { boxShadow: 'inset 3px 0 0 #22c55e' } : { boxShadow: 'inset 3px 0 0 #cbd5e1' }}>
                    <td className="px-2 py-2 text-center">
                      <input type="checkbox" checked={confirmed} onChange={() => toggle(t.id)} className="w-4 h-4 accent-green-600 cursor-pointer" aria-label="Human confirmed" />
                    </td>
                    <td className="px-2 py-2 text-tertiary tabular-nums">{t.target_number}</td>
                    <td className="px-2 py-2">
                      <span className="font-medium text-tertiary-dark dark:text-[var(--mh-fg)]">{t.policy_short}</span>
                      {t.celex_number && <div className="text-[10.5px] text-tertiary">CELEX {t.celex_number}</div>}
                    </td>
                    <td className="px-2 py-2 capitalize text-tertiary-dark dark:text-[var(--mh-fg)]">{t.document_type}</td>
                    <td className="px-2 py-2 text-tertiary-dark dark:text-[var(--mh-fg)]">{t.policy_area}</td>
                    <td className="px-2 py-2 text-tertiary-dark dark:text-[var(--mh-fg)]">
                      <div className="leading-snug">{t.target_text}</div>
                      <button
                        type="button"
                        onClick={() => setSourceTarget(t)}
                        title="Show the verbatim source text from EUR-Lex (Policy Navigator workspace)"
                        className="group mt-1 inline-flex items-start gap-1 text-left text-[10.5px] text-secondary hover:text-primary hover:underline decoration-secondary/40"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-px opacity-70 group-hover:opacity-100">
                          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                        </svg>
                        <span>{t.article || 'View source text'}</span>
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <Badge label={LABEL_META[t.target_label].label} color={LABEL_META[t.target_label].color} />
                      {!t.relevant && <div className="mt-1"><Badge label="Peripheral" color="#94a3b8" bg="#f1f5f9" /></div>}
                    </td>
                    <td className="px-2 py-2"><Badge label={OBLIGATION_META[t.obligation].label} color={OBLIGATION_META[t.obligation].color} bg={OBLIGATION_META[t.obligation].bg} /></td>
                    <td className="px-2 py-2"><Badge label={TYPE_META[t.target_type].label} color={TYPE_META[t.target_type].color} /></td>
                    <td className="px-2 py-2 text-tertiary-dark dark:text-[var(--mh-fg)]">{t.timeline || <span className="text-tertiary italic">unspecified</span>}</td>
                    <td className="px-2 py-2 text-tertiary-dark dark:text-[var(--mh-fg)]">{t.indicators.length ? t.indicators.join('; ') : <span className="text-tertiary">—</span>}</td>
                    <td className="px-2 py-2"><Badge label={CLIMATE_META[t.climate_relevance].label} color={CLIMATE_META[t.climate_relevance].color} /></td>
                    <td className="px-2 py-2"><a href={t.eurlex_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">EUR-Lex ↗</a></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="text-center text-tertiary py-12">No targets match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TargetSourceModal target={sourceTarget} onClose={() => setSourceTarget(null)} />
    </div>
  );
}

function Stat({ n, label, color }: { n: number | string; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2">
      <div className="text-[20px] font-bold leading-none" style={{ color }}>{n}</div>
      <div className="text-[10.5px] text-tertiary dark:text-[var(--mh-muted)] mt-1">{label}</div>
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w: string }) {
  return <th className="px-2 py-2 font-semibold border-b border-grey-200 dark:border-[var(--mh-border)]" style={{ minWidth: w, width: w }}>{children}</th>;
}

function Sel({ label, value, set, opts, cap }: { label: string; value: string; set: (v: string) => void; opts: string[]; cap?: boolean }) {
  return (
    <select value={value} onChange={(e) => set(e.target.value)} title={label}
      className="text-[12.5px] px-2 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] text-tertiary-dark dark:text-[var(--mh-fg)]">
      <option value="all">{label}: all</option>
      {opts.map((o) => <option key={o} value={o}>{cap ? o.charAt(0).toUpperCase() + o.slice(1) : o}</option>)}
    </select>
  );
}
