/**
 * Past recommendations tracker for the Project Workspace.
 * -------------------------------------------------------
 * Reads recommendations from the DB (initial set seeded from the 2024
 * ESABCC report). Users can:
 *   • Add a new recommendation,
 *   • Edit title, summary and area,
 *   • Change the implementation status,
 *   • Log dated uptake events, with optional source URL,
 *   • Remove an individual event, and
 *   • Delete a recommendation entirely.
 */
'use client';

import { useState } from 'react';
import {
  RECOMMENDATION_REPORTS,
  RECOMMENDATION_TAG_OPTIONS,
  type PastRecommendation,
  type RecommendationReport,
  type RecommendationStatus,
} from '@/data/esabcc-recommendations';
import { pwApi } from '@/lib/project-workspace/client';
import DownloadMenu from './DownloadMenu';
import CollaborationPanel from './CollaborationPanel';
import type { SheetSpec, DocBlock } from '@/lib/exports';

/** Known reports offered in the report picker. */
const REPORT_OPTIONS: RecommendationReport[] = Object.values(RECOMMENDATION_REPORTS);

const STATUS_COLORS: Record<RecommendationStatus, string> = {
  'not-addressed': 'bg-red-100 text-red-800 border-red-200',
  'in-progress': 'bg-amber-100 text-amber-800 border-amber-200',
  'partially': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'addressed': 'bg-green-100 text-green-800 border-green-200',
};
const STATUS_LABELS: Record<RecommendationStatus, string> = {
  'not-addressed': 'Not addressed',
  'in-progress': 'In progress',
  'partially': 'Partially addressed',
  'addressed': 'Addressed',
};
const STATUSES: RecommendationStatus[] = ['not-addressed', 'in-progress', 'partially', 'addressed'];

interface Props {
  projectId: string;
  initial: PastRecommendation[];
}

export default function RecommendationsModule({ projectId, initial }: Props) {
  const [recs, setRecs] = useState<PastRecommendation[]>(initial);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  async function updateStatus(id: string, status: RecommendationStatus) {
    setBusy(true);
    try {
      await pwApi.patchRecommendation(id, { status });
      setRecs(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
    } finally {
      setBusy(false);
    }
  }

  async function updateText(
    id: string,
    fields: { title?: string; summary?: string; area?: string }
  ) {
    setBusy(true);
    try {
      await pwApi.patchRecommendation(id, fields);
      setRecs(prev => prev.map(r => (r.id === id ? { ...r, ...fields } : r)));
    } finally {
      setBusy(false);
    }
  }

  async function updateTags(id: string, tags: string[]) {
    setBusy(true);
    try {
      await pwApi.patchRecommendation(id, { tags });
      setRecs(prev =>
        prev.map(r => (r.id === id ? { ...r, tags: tags.length > 0 ? tags : undefined } : r))
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateReport(id: string, report: RecommendationReport | undefined) {
    setBusy(true);
    try {
      await pwApi.patchRecommendation(id, {
        reportId: report?.id ?? '',
        reportLabel: report?.label ?? '',
        reportUrl: report?.url ?? '',
      });
      setRecs(prev => prev.map(r => (r.id === id ? { ...r, report } : r)));
    } finally {
      setBusy(false);
    }
  }

  async function addEvent(
    id: string,
    occurredAt: string,
    note: string,
    sourceUrl?: string
  ) {
    setBusy(true);
    try {
      const res = await pwApi.addRecommendationEvent({
        recommendationId: id,
        occurredAt,
        note,
        sourceUrl,
      });
      setRecs(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                uptakeEvents: [
                  ...r.uptakeEvents,
                  { id: res.event.id, date: occurredAt, note, sourceUrl },
                ].sort((a, b) => a.date.localeCompare(b.date)),
              }
            : r
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(recId: string, eventId: string) {
    setBusy(true);
    try {
      await pwApi.deleteRecommendationEvent(eventId);
      setRecs(prev =>
        prev.map(r =>
          r.id === recId
            ? { ...r, uptakeEvents: r.uptakeEvents.filter(e => e.id !== eventId) }
            : r
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function createRecommendation(fields: {
    area: string;
    title: string;
    summary: string;
    status: RecommendationStatus;
    report?: RecommendationReport;
  }) {
    setBusy(true);
    try {
      const { report, ...rest } = fields;
      // New recommendations added inside a sector-focused project inherit that
      // sector's tag so the data stays coherent with how it was seeded.
      const tags = projectId === 'industry-project' ? ['industry'] : undefined;
      const res = await pwApi.createRecommendation({
        projectId,
        ...rest,
        reportId: report?.id,
        reportLabel: report?.label,
        reportUrl: report?.url,
        tags,
      });
      const created: PastRecommendation = {
        ...fields,
        id: res.recommendation.id,
        uptakeEvents: [],
        tags,
      };
      setRecs(prev => [...prev, created]);
      setOpenId(created.id);
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function removeRecommendation(id: string) {
    if (!confirm('Remove this recommendation and all of its uptake events? This cannot be undone.')) return;
    setBusy(true);
    try {
      await pwApi.deleteRecommendation(id);
      setRecs(prev => prev.filter(r => r.id !== id));
      if (openId === id) setOpenId(null);
    } finally {
      setBusy(false);
    }
  }

  // Group recommendations by their source report, preserving first-seen order.
  const reportGroups = (() => {
    const order: string[] = [];
    const byId = new Map<
      string,
      { id: string; label: string; url?: string; recs: PastRecommendation[] }
    >();
    for (const r of recs) {
      const id = r.report?.id ?? '__unlabelled__';
      let g = byId.get(id);
      if (!g) {
        g = { id, label: r.report?.label ?? 'Unlabelled', url: r.report?.url, recs: [] };
        byId.set(id, g);
        order.push(id);
      }
      g.recs.push(r);
    }
    return order.map(id => byId.get(id)!);
  })();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">Past recommendations tracker</h2>
          <p className="text-sm text-tertiary mt-1 max-w-2xl">
            Recommendations from every ESABCC{' '}
            <a
              href="https://climate-advisory-board.europa.eu/reports-and-publications"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-primary"
            >
              report and advice
            </a>{' '}
            published to date, each labelled with the source publication and
            grouped below by report. Edit text, change status, set the source
            report, log dated uptake events, or add and remove recommendations
            as new advice is published.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DownloadMenu
            filename="esabcc-recommendations-tracker"
            data={{ getSheets: () => buildRecsSheets(recs) }}
            text={{ getBlocks: () => buildRecsDoc(reportGroups) }}
          />
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark"
            >
              + Add recommendation
            </button>
          )}
        </div>
      </header>

      {adding && (
        <AddRecommendationForm
          busy={busy}
          onCreate={createRecommendation}
          onCancel={() => setAdding(false)}
        />
      )}

      {recs.length === 0 ? (
        <p className="text-sm text-tertiary-light italic px-4 py-6 text-center bg-white border border-dashed border-grey-200 rounded-xl">
          No recommendations yet. Use “Add recommendation” to create the first one.
        </p>
      ) : (
        <div className="space-y-6">
          {reportGroups.map(g => (
            <section key={g.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                  {g.label}
                </h3>
                {g.url && (
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] underline text-primary"
                  >
                    report
                  </a>
                )}
                <span className="text-[10px] text-tertiary-light">
                  {g.recs.length} {g.recs.length === 1 ? 'rec' : 'recs'}
                </span>
              </div>
              <ul className="space-y-3">
                {g.recs.map(r => (
                  <li
                    key={r.id}
                    className="bg-white border border-grey-200 rounded-xl overflow-hidden"
                  >
            <button
              type="button"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-grey-50"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    {r.area}
                  </p>
                  {r.report && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">
                      {r.report.label}
                    </span>
                  )}
                  {r.tags?.map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium text-tertiary-dark mt-0.5">{r.title}</p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </button>
            {openId === r.id && (
              <div className="px-4 py-3 border-t border-grey-100 space-y-3">
                <EditableText
                  label="Area"
                  value={r.area}
                  busy={busy}
                  onSave={v => updateText(r.id, { area: v })}
                  multiline={false}
                />
                <EditableText
                  label="Title"
                  value={r.title}
                  busy={busy}
                  onSave={v => updateText(r.id, { title: v })}
                  multiline={false}
                />
                <EditableText
                  label="Summary"
                  value={r.summary}
                  busy={busy}
                  onSave={v => updateText(r.id, { summary: v })}
                  multiline
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    Status
                  </span>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => updateStatus(r.id, s)}
                      className={`text-[11px] px-2 py-1 rounded border ${
                        r.status === s
                          ? STATUS_COLORS[s]
                          : 'border-grey-200 text-tertiary hover:bg-grey-50'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    Source report
                  </span>
                  <select
                    value={r.report?.id ?? ''}
                    disabled={busy}
                    onChange={e =>
                      updateReport(
                        r.id,
                        REPORT_OPTIONS.find(o => o.id === e.target.value)
                      )
                    }
                    className="text-[11px] px-2 py-1 border border-grey-200 rounded bg-white"
                  >
                    <option value="">— Unlabelled —</option>
                    {REPORT_OPTIONS.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {r.report?.url && (
                    <a
                      href={r.report.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] underline text-primary"
                    >
                      open report
                    </a>
                  )}
                </div>

                <TagEditor
                  tags={r.tags ?? []}
                  busy={busy}
                  onChange={tags => updateTags(r.id, tags)}
                />

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">
                    Uptake events
                  </p>
                  {r.uptakeEvents.length === 0 && (
                    <p className="text-xs text-tertiary-light italic">
                      No events recorded.
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {r.uptakeEvents.map((e, idx) => (
                      <li key={e.id ?? idx} className="text-xs text-tertiary-dark flex items-start gap-2">
                        <span className="flex-1">
                          <span className="font-mono text-tertiary">{e.date}</span>{' '}
                          — {e.note}{' '}
                          {e.sourceUrl && (
                            <a
                              href={e.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-primary"
                            >
                              source
                            </a>
                          )}
                        </span>
                        {e.id && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => deleteEvent(r.id, e.id!)}
                            className="text-[10px] text-red-600 hover:underline disabled:opacity-50"
                            aria-label="Remove event"
                          >
                            remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <AddEventForm onAdd={(d, n, u) => addEvent(r.id, d, n, u)} busy={busy} />
                </div>

                <div className="pt-2 border-t border-grey-100">
                  <CollaborationPanel
                    projectId={projectId}
                    target={{ kind: 'recommendation', id: r.id }}
                    heading="Review & discussion"
                    compact
                  />
                </div>

                <div className="pt-2 border-t border-grey-100 flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeRecommendation(r.id)}
                    className="text-[11px] px-3 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove recommendation
                  </button>
                </div>
              </div>
            )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Build Excel sheets for the recommendations tracker (recs + uptake events). */
function buildRecsSheets(recs: PastRecommendation[]): SheetSpec[] {
  const recSheet: SheetSpec = {
    name: 'Recommendations',
    title: 'ESABCC recommendations tracker',
    headers: ['Area', 'Title', 'Summary', 'Status', 'Report', 'Uptake events'],
    rows: recs.map(r => [
      r.area,
      r.title,
      r.summary,
      STATUS_LABELS[r.status],
      r.report?.label ?? '',
      r.uptakeEvents.length,
    ]),
  };
  const eventRows = recs.flatMap(r =>
    r.uptakeEvents.map(e => [r.title, e.date, e.note, e.sourceUrl ?? ''])
  );
  const sheets: SheetSpec[] = [recSheet];
  if (eventRows.length > 0) {
    sheets.push({
      name: 'Uptake events',
      headers: ['Recommendation', 'Date', 'Note', 'Source'],
      rows: eventRows,
    });
  }
  return sheets;
}

/** Build a Word document of the tracker, grouped by source report. */
function buildRecsDoc(
  groups: { id: string; label: string; url?: string; recs: PastRecommendation[] }[]
): DocBlock[] {
  const blocks: DocBlock[] = [
    { type: 'heading', level: 1, text: 'ESABCC recommendations tracker' },
  ];
  for (const g of groups) {
    blocks.push({ type: 'heading', level: 2, text: g.label });
    for (const r of g.recs) {
      blocks.push({ type: 'heading', level: 3, text: r.title });
      blocks.push({
        type: 'paragraph',
        text: `${r.area ? r.area + '  ·  ' : ''}Status: ${STATUS_LABELS[r.status]}`,
        italic: true,
      });
      if (r.summary) blocks.push({ type: 'paragraph', text: r.summary });
      if (r.uptakeEvents.length > 0) {
        blocks.push({
          type: 'bullets',
          items: r.uptakeEvents.map(
            e => `${e.date} — ${e.note}${e.sourceUrl ? ` (${e.sourceUrl})` : ''}`
          ),
        });
      }
    }
  }
  return blocks;
}

function AddRecommendationForm({
  busy,
  onCreate,
  onCancel,
}: {
  busy: boolean;
  onCreate: (fields: {
    area: string;
    title: string;
    summary: string;
    status: RecommendationStatus;
    report?: RecommendationReport;
  }) => void;
  onCancel: () => void;
}) {
  const [area, setArea] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<RecommendationStatus>('not-addressed');
  const [reportId, setReportId] = useState<string>(REPORT_OPTIONS[0]?.id ?? '');

  const canSave = title.trim() !== '';

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide text-tertiary-light font-semibold">
        New recommendation
      </p>
      <label className="block text-[11px] text-tertiary">
        <span className="block mb-1">Area / chapter</span>
        <input
          value={area}
          onChange={e => setArea(e.target.value)}
          placeholder="e.g. KR14 · Carbon pricing"
          className="w-full px-2 py-1 border border-grey-200 rounded text-sm"
        />
      </label>
      <label className="block text-[11px] text-tertiary">
        <span className="block mb-1">Title <span className="text-red-600">*</span></span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What does the Board recommend?"
          className="w-full px-2 py-1 border border-grey-200 rounded text-sm"
        />
      </label>
      <label className="block text-[11px] text-tertiary">
        <span className="block mb-1">Summary</span>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          placeholder="Operative ask + main mapped instrument(s)…"
          className="w-full px-2 py-1 border border-grey-200 rounded text-sm"
        />
      </label>
      <label className="block text-[11px] text-tertiary">
        <span className="block mb-1">Initial status</span>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as RecommendationStatus)}
          className="px-2 py-1 border border-grey-200 rounded text-sm bg-white"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-tertiary">
        <span className="block mb-1">Source report</span>
        <select
          value={reportId}
          onChange={e => setReportId(e.target.value)}
          className="px-2 py-1 border border-grey-200 rounded text-sm bg-white"
        >
          <option value="">— Unlabelled —</option>
          {REPORT_OPTIONS.map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !canSave}
          onClick={() => onCreate({
            area: area.trim(),
            title: title.trim(),
            summary: summary.trim(),
            status,
            report: REPORT_OPTIONS.find(o => o.id === reportId),
          })}
          className="px-3 py-1 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded-md border border-grey-200 text-xs text-tertiary hover:bg-grey-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

function EditableText({
  label,
  value,
  onSave,
  busy,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  busy: boolean;
  multiline: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="group">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
            {label}
          </span>
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="text-[10px] text-primary underline opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            Edit
          </button>
        </div>
        <p
          className={
            multiline
              ? 'text-sm text-tertiary leading-relaxed whitespace-pre-wrap'
              : 'text-sm font-medium text-tertiary-dark'
          }
        >
          {value || <span className="italic text-tertiary-light">(empty)</span>}
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={4}
          className="w-full px-2 py-1 border border-grey-200 rounded text-sm"
        />
      ) : (
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full px-2 py-1 border border-grey-200 rounded text-sm"
        />
      )}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          disabled={busy || draft === value}
          onClick={() => {
            onSave(draft.trim());
            setEditing(false);
          }}
          className="px-3 py-1 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 py-1 rounded-md border border-grey-200 text-xs text-tertiary hover:bg-grey-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/**
 * Sector-tag editor. Tags decide which sector-focused project a recommendation
 * surfaces in — e.g. the Industry Project tracks everything tagged `industry`.
 * Suggested tags come from RECOMMENDATION_TAG_OPTIONS but any free-form tag is
 * allowed.
 */
function TagEditor({
  tags,
  busy,
  onChange,
}: {
  tags: string[];
  busy: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setDraft('');
  }
  function remove(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  const suggestions = RECOMMENDATION_TAG_OPTIONS.filter(o => !tags.includes(o));

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1.5">
        Sector tags
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && (
          <span className="text-[11px] text-tertiary-light italic">No tags yet.</span>
        )}
        {tags.map(t => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 inline-flex items-center gap-1"
          >
            #{t}
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(t)}
              className="text-secondary/70 hover:text-secondary disabled:opacity-50"
              aria-label={`Remove ${t} tag`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a tag (e.g. industry)"
          className="px-2 py-1 border border-grey-200 rounded text-xs w-full sm:w-auto sm:min-w-[160px]"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => add(draft)}
          className="text-[11px] px-2 py-1 rounded border border-grey-200 text-tertiary hover:bg-grey-50 disabled:opacity-50"
        >
          Add tag
        </button>
        {suggestions.slice(0, 6).map(o => (
          <button
            key={o}
            type="button"
            disabled={busy}
            onClick={() => add(o)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-grey-300 text-tertiary-light hover:bg-grey-50 disabled:opacity-50"
          >
            + {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddEventForm({
  onAdd,
  busy,
}: {
  onAdd: (date: string, note: string, sourceUrl?: string) => void;
  busy: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  return (
    <div className="mt-2 flex flex-wrap gap-2 items-end">
      <label className="text-[10px] text-tertiary">
        <span className="block mb-0.5">Date</span>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-2 py-1 border border-grey-200 rounded text-xs"
        />
      </label>
      <label className="text-[10px] text-tertiary flex-1 w-full sm:w-auto sm:min-w-[200px]">
        <span className="block mb-0.5">Note</span>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. -90% target enacted via Reg (EU) 2026/667"
          className="w-full px-2 py-1 border border-grey-200 rounded text-xs"
        />
      </label>
      <label className="text-[10px] text-tertiary flex-1 w-full sm:w-auto sm:min-w-[200px]">
        <span className="block mb-0.5">Source URL (optional)</span>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full px-2 py-1 border border-grey-200 rounded text-xs"
        />
      </label>
      <button
        type="button"
        disabled={!note || busy}
        onClick={() => {
          onAdd(date, note, url || undefined);
          setNote('');
          setUrl('');
        }}
        className="px-3 py-1 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
      >
        Add event
      </button>
    </div>
  );
}
