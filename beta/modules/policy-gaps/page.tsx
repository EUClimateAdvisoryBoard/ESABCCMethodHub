'use client';

/**
 * Policy Gap Tracker (beta) — M · 36
 *
 * Tracks every gap and inconsistency the European Scientific Advisory Board
 * on Climate Change identified in its January-2025 report *"Towards EU
 * climate neutrality: Progress, policy gaps and opportunities"* and lets the
 * Secretariat record whether each gap **still exists** today.
 *
 * Features
 *   • Seeded from src/data/policy-gaps.ts (all 12 report chapters).
 *   • Filter by sector / gap type / live status, plus free-text search.
 *   • Summary dashboard (counts by status and type).
 *   • Inline editing of the live status + note; add new rows; delete rows.
 *   • Local persistence (localStorage) so edits survive reloads — no backend.
 *   • One-click export of the current table to a styled .xlsx workbook.
 */

import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import {
  POLICY_GAPS,
  GAP_TYPE_META,
  GAP_STATUS_META,
  GAP_SECTORS,
  GAP_REPORT_META,
  type PolicyGap,
  type GapType,
  type GapStatus,
} from '@/data/policy-gaps';

const STORAGE_KEY = 'esabcc-policy-gaps-v1';
const TYPE_KEYS = Object.keys(GAP_TYPE_META) as GapType[];
const STATUS_KEYS = Object.keys(GAP_STATUS_META) as GapStatus[];

// ── Local-storage helpers ─────────────────────────────────────────────────
function loadGaps(): PolicyGap[] {
  if (typeof window === 'undefined') return POLICY_GAPS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return POLICY_GAPS;
    const parsed = JSON.parse(raw) as PolicyGap[];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* corrupted or unavailable storage — fall back to seed */
  }
  return POLICY_GAPS;
}

function saveGaps(gaps: PolicyGap[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gaps));
  } catch {
    /* private mode / quota — ignore */
  }
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'custom'
  );
}

const EMPTY_DRAFT: Omit<PolicyGap, 'reportStatus'> = {
  id: '',
  sector: GAP_SECTORS[0],
  type: 'policy',
  title: '',
  description: '',
  instrument: '',
  quote: '',
  reference: '',
  currentStatus: 'open',
  statusNote: '',
};

// ── Small presentational atoms ────────────────────────────────────────────
function TypeBadge({ type }: { type: GapType }) {
  const m = GAP_TYPE_META[type];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
      title={m.description}
    >
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: GapStatus }) {
  const m = GAP_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
      <span className="text-[12px]" style={{ color: m.color }}>
        {m.label}
      </span>
    </span>
  );
}

export default function PolicyGapsPage() {
  const [gaps, setGaps] = useState<PolicyGap[]>(POLICY_GAPS);
  const [hydrated, setHydrated] = useState(false);

  // filters
  const [q, setQ] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<PolicyGap, 'reportStatus'>>(EMPTY_DRAFT);
  const [exporting, setExporting] = useState(false);

  // load persisted state once on mount
  useEffect(() => {
    setGaps(loadGaps());
    setHydrated(true);
  }, []);

  // persist on every change (after hydration so we don't clobber the store)
  useEffect(() => {
    if (hydrated) saveGaps(gaps);
  }, [gaps, hydrated]);

  // ── Derived: filtered rows ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return gaps.filter((g) => {
      if (sectorFilter !== 'all' && g.sector !== sectorFilter) return false;
      if (typeFilter !== 'all' && g.type !== typeFilter) return false;
      if (statusFilter !== 'all' && g.currentStatus !== statusFilter) return false;
      if (!needle) return true;
      return (
        g.title.toLowerCase().includes(needle) ||
        g.description.toLowerCase().includes(needle) ||
        g.instrument.toLowerCase().includes(needle) ||
        g.quote.toLowerCase().includes(needle) ||
        g.statusNote.toLowerCase().includes(needle)
      );
    });
  }, [gaps, q, sectorFilter, typeFilter, statusFilter]);

  // ── Derived: summary counts ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const byStatus: Record<GapStatus, number> = {
      open: 0,
      'partially-addressed': 0,
      addressed: 0,
      unknown: 0,
    };
    const byType: Record<GapType, number> = {
      policy: 0,
      ambition: 0,
      implementation: 0,
      inconsistency: 0,
    };
    for (const g of gaps) {
      byStatus[g.currentStatus] = (byStatus[g.currentStatus] ?? 0) + 1;
      byType[g.type] = (byType[g.type] ?? 0) + 1;
    }
    return { byStatus, byType, total: gaps.length };
  }, [gaps]);

  // ── Mutations ───────────────────────────────────────────────────────────
  function updateGap(id: string, patch: Partial<PolicyGap>) {
    setGaps((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function deleteGap(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('Delete this gap from your tracker?')) return;
    setGaps((prev) => prev.filter((g) => g.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function resetToReport() {
    if (typeof window !== 'undefined' && !window.confirm('Discard all edits and additions and reset to the report baseline?')) {
      return;
    }
    setGaps(POLICY_GAPS);
    setEditingId(null);
  }

  function commitAdd() {
    if (!draft.title.trim()) {
      if (typeof window !== 'undefined') window.alert('Please give the gap a title.');
      return;
    }
    const existingIds = new Set(gaps.map((g) => g.id));
    let base = draft.id.trim() || slugify(draft.title);
    let id = base;
    let n = 2;
    while (existingIds.has(id)) id = `${base}-${n++}`;
    const newGap: PolicyGap = { ...draft, id, reportStatus: 'open' };
    setGaps((prev) => [newGap, ...prev]);
    setDraft(EMPTY_DRAFT);
    setShowAdd(false);
  }

  // ── Excel export ────────────────────────────────────────────────────────
  async function exportExcel() {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ESABCC Method Hub — Policy Gap Tracker';
      wb.created = new Date();

      // ── Gaps sheet ──
      const ws = wb.addWorksheet('Policy gaps', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      ws.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Sector', key: 'sector', width: 20 },
        { header: 'Gap type', key: 'type', width: 18 },
        { header: 'Title', key: 'title', width: 42 },
        { header: 'Finding', key: 'description', width: 60 },
        { header: 'Exact report quote', key: 'quote', width: 75 },
        { header: 'EU instrument(s)', key: 'instrument', width: 40 },
        { header: 'Report reference', key: 'reference', width: 30 },
        { header: 'Report baseline', key: 'reportStatus', width: 16 },
        { header: 'Still exists? (current)', key: 'currentStatus', width: 22 },
        { header: 'Status note', key: 'statusNote', width: 50 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003399' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
      headerRow.height = 26;

      const statusLabel: Record<GapStatus, string> = {
        open: 'Still open',
        'partially-addressed': 'Partially addressed',
        addressed: 'Addressed',
        unknown: 'To review',
      };

      // export the current filtered view
      filtered.forEach((g) => {
        const row = ws.addRow({
          id: g.id,
          sector: g.sector,
          type: GAP_TYPE_META[g.type].label,
          title: g.title,
          description: g.description,
          quote: g.quote,
          instrument: g.instrument,
          reference: g.reference,
          reportStatus: 'Open (Jan 2025)',
          currentStatus: statusLabel[g.currentStatus],
          statusNote: g.statusNote,
        });
        row.alignment = { vertical: 'top', wrapText: true };
        // colour the current-status cell
        const color = GAP_STATUS_META[g.currentStatus].color.replace('#', 'FF');
        row.getCell('currentStatus').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color },
        };
        row.getCell('currentStatus').font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });
      ws.autoFilter = { from: 'A1', to: 'K1' };

      // ── Summary sheet ──
      const sum = wb.addWorksheet('Summary');
      sum.columns = [
        { header: 'Metric', key: 'k', width: 34 },
        { header: 'Value', key: 'v', width: 16 },
      ];
      sum.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sum.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003399' } };
      sum.addRow({ k: 'Report', v: GAP_REPORT_META.title });
      sum.addRow({ k: 'Author', v: GAP_REPORT_META.author });
      sum.addRow({ k: 'Published', v: GAP_REPORT_META.published });
      sum.addRow({ k: 'Exported (rows in view)', v: filtered.length });
      sum.addRow({ k: 'Total gaps tracked', v: gaps.length });
      sum.addRow({ k: '', v: '' });
      sum.addRow({ k: '— By current status —', v: '' });
      STATUS_KEYS.forEach((s) => sum.addRow({ k: GAP_STATUS_META[s].label, v: stats.byStatus[s] }));
      sum.addRow({ k: '', v: '' });
      sum.addRow({ k: '— By gap type —', v: '' });
      TYPE_KEYS.forEach((t) => sum.addRow({ k: GAP_TYPE_META[t].label, v: stats.byType[t] }));

      const buffer = await wb.xlsx.writeBuffer();
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `esabcc-policy-gaps_${stamp}.xlsx`);
    } catch (err) {
      console.error('Policy-gaps Excel export failed', err);
      if (typeof window !== 'undefined') {
        window.alert(`Excel export failed: ${(err as Error)?.message ?? 'unknown error'}`);
      }
    } finally {
      setExporting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Policy Gap Tracker"
        subtitle={
          <>
            Every policy gap, ambition gap, implementation gap and inconsistency identified by the
            Advisory Board in{' '}
            <a
              href={GAP_REPORT_META.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#00928F] underline-offset-2"
            >
              “{GAP_REPORT_META.title}”
            </a>{' '}
            ({GAP_REPORT_META.published}) — with an editable, exportable record of whether each gap
            still exists.
          </>
        }
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <section aria-label="Summary" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] p-3">
            <div className="text-[22px] font-bold">{stats.total}</div>
            <div className="text-[11px] uppercase tracking-wide text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
              Gaps tracked
            </div>
          </div>
          {STATUS_KEYS.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] p-3"
            >
              <div className="text-[22px] font-bold" style={{ color: GAP_STATUS_META[s].color }}>
                {stats.byStatus[s]}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
                {GAP_STATUS_META[s].label}
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] p-3">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
              {TYPE_KEYS.map((t) => (
                <span key={t} style={{ color: GAP_TYPE_META[t].color }} className="font-semibold">
                  {stats.byType[t]} {GAP_TYPE_META[t].label.replace(' gap', '')}
                </span>
              ))}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-[#3D5265]/70 dark:text-[var(--mh-muted)] mt-1">
              By type
            </div>
          </div>
        </section>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gaps, instruments, notes…"
            className="flex-1 min-w-[200px] rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2 text-[13px] outline-none focus:border-[#00928F]"
          />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-2 text-[13px]"
          >
            <option value="all">All sectors</option>
            {GAP_SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-2 text-[13px]"
          >
            <option value="all">All types</option>
            {TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {GAP_TYPE_META[t].label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-2 text-[13px]"
          >
            <option value="all">All statuses</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {GAP_STATUS_META[s].label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setShowAdd((v) => !v);
              setDraft(EMPTY_DRAFT);
            }}
            className="rounded-md bg-[#003399] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#00287a]"
          >
            + Add gap
          </button>
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="rounded-md bg-[#007B6C] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#006456] disabled:opacity-60"
          >
            {exporting ? 'Exporting…' : '⭳ Export Excel'}
          </button>
          <button
            onClick={resetToReport}
            className="rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] px-3 py-2 text-[13px] font-medium hover:bg-[#F3F5F7] dark:hover:bg-[var(--mh-card)]"
            title="Discard all edits and reload the report baseline"
          >
            Reset
          </button>
        </section>

        {/* ── Add form ──────────────────────────────────────────────────── */}
        {showAdd && (
          <section className="mb-6 rounded-lg border border-[#00928F]/40 bg-[#00928F]/5 p-4">
            <h2 className="text-[14px] font-bold mb-3">Add a new gap</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-[12px] font-medium">
                Title
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                  placeholder="Short headline for the gap"
                />
              </label>
              <label className="text-[12px] font-medium">
                Sector
                <select
                  value={draft.sector}
                  onChange={(e) => setDraft({ ...draft, sector: e.target.value })}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                >
                  {GAP_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium">
                Gap type
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as GapType })}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                >
                  {TYPE_KEYS.map((t) => (
                    <option key={t} value={t}>
                      {GAP_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium sm:col-span-2 lg:col-span-3">
                Finding / description
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                />
              </label>
              <label className="text-[12px] font-medium">
                EU instrument(s)
                <input
                  value={draft.instrument}
                  onChange={(e) => setDraft({ ...draft, instrument: e.target.value })}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                />
              </label>
              <label className="text-[12px] font-medium">
                Report reference
                <input
                  value={draft.reference}
                  onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
                  placeholder="e.g. Ch. 4 Energy supply, p. 55"
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                />
              </label>
              <label className="text-[12px] font-medium">
                Current status
                <select
                  value={draft.currentStatus}
                  onChange={(e) => setDraft({ ...draft, currentStatus: e.target.value as GapStatus })}
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                >
                  {STATUS_KEYS.map((s) => (
                    <option key={s} value={s}>
                      {GAP_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-medium sm:col-span-2 lg:col-span-3">
                Exact report quote (optional)
                <textarea
                  value={draft.quote}
                  onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                  rows={2}
                  placeholder="Paste the verbatim sentence from the report, if any"
                  className="mt-1 w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1.5 text-[13px] font-normal"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={commitAdd}
                className="rounded-md bg-[#003399] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#00287a]"
              >
                Save gap
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-md border border-[#D6DAE0] dark:border-[var(--mh-border)] px-3 py-1.5 text-[13px]"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="text-[12px] text-[#3D5265]/70 dark:text-[var(--mh-muted)] mb-2">
          Showing {filtered.length} of {gaps.length} gaps
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)]">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#F3F5F7] dark:bg-[var(--mh-card)] text-left">
                <th className="px-3 py-2 font-semibold">Sector</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Gap</th>
                <th className="px-3 py-2 font-semibold">Instrument</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Still exists?</th>
                <th className="px-3 py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const editing = editingId === g.id;
                return (
                  <tr
                    key={g.id}
                    className="border-t border-[#E6E7E8] dark:border-[var(--mh-border)] align-top"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-[12px]">{g.sector}</td>
                    <td className="px-3 py-3">
                      <TypeBadge type={g.type} />
                    </td>
                    <td className="px-3 py-3 max-w-[420px]">
                      <div className="font-semibold">{g.title}</div>
                      <div className="mt-1 text-[12px] text-[#3D5265]/80 dark:text-[var(--mh-muted)]">
                        {g.description}
                      </div>
                      {g.quote && (
                        <blockquote className="mt-2 border-l-2 border-[#00928F]/60 pl-2 text-[12px] italic text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
                          “{g.quote}”
                        </blockquote>
                      )}
                      {g.reference && (
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-[#3D5265]/50 dark:text-[var(--mh-muted)]">
                          {g.reference}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-[220px] text-[12px] text-[#3D5265]/80 dark:text-[var(--mh-muted)]">
                      {g.instrument}
                    </td>
                    <td className="px-3 py-3 min-w-[180px]">
                      {editing ? (
                        <div className="space-y-2">
                          <select
                            value={g.currentStatus}
                            onChange={(e) =>
                              updateGap(g.id, { currentStatus: e.target.value as GapStatus })
                            }
                            className="w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1 text-[12px]"
                          >
                            {STATUS_KEYS.map((s) => (
                              <option key={s} value={s}>
                                {GAP_STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={g.statusNote}
                            onChange={(e) => updateGap(g.id, { statusNote: e.target.value })}
                            rows={3}
                            placeholder="Evidence / developments since the report…"
                            className="w-full rounded border border-[#D6DAE0] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-2 py-1 text-[12px]"
                          />
                        </div>
                      ) : (
                        <div>
                          <StatusDot status={g.currentStatus} />
                          {g.statusNote && (
                            <div className="mt-1 text-[12px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
                              {g.statusNote}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      {editing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-[#007B6C] px-2.5 py-1 text-[12px] font-semibold text-white"
                        >
                          Done
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => setEditingId(g.id)}
                            className="text-[12px] font-semibold text-[#003399] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteGap(g.id)}
                            className="text-[12px] text-[#B83230] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[#3D5265]/60">
                    No gaps match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[12px] text-[#3D5265]/60 dark:text-[var(--mh-muted)] max-w-3xl">
          Provenance: every listed gap is a finding the report explicitly tags as a policy,
          ambition or implementation gap (or inconsistency). The italic quote under each is the{' '}
          <strong>verbatim sentence</strong> copied from the report, with the exact chapter and
          page; the finding text is a light paraphrase of that quote. Baseline: the Board judged
          every gap <strong>open</strong> at the January-2025 report. The “Still exists?” column and
          notes are a live working record — edits and added rows are saved in your browser only. Use{' '}
          <em>Export Excel</em> to share a snapshot, or <em>Reset</em> to return to the report
          baseline.
        </p>
      </main>
    </div>
  );
}
