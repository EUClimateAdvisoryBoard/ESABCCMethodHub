/**
 * Past recommendations tracker for the Project Workspace.
 * -------------------------------------------------------
 * Reads recommendations from the DB (initial set seeded from the 2024
 * ESABCC report). Users can change the implementation status and log
 * dated uptake events ("2040 target picked up by Regulation (EU)
 * 2026/667") with optional source URLs.
 */
'use client';

import { useState } from 'react';
import type { PastRecommendation, RecommendationStatus } from '@/data/esabcc-recommendations';
import { pwApi } from '@/lib/project-workspace/client';

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

interface Props {
  initial: PastRecommendation[];
}

export default function RecommendationsModule({ initial }: Props) {
  const [recs, setRecs] = useState<PastRecommendation[]>(initial);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

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
    fields: { title?: string; summary?: string }
  ) {
    setBusy(true);
    try {
      await pwApi.patchRecommendation(id, fields);
      setRecs(prev => prev.map(r => (r.id === id ? { ...r, ...fields } : r)));
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
      await pwApi.addRecommendationEvent({
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
                  { date: occurredAt, note, sourceUrl },
                ].sort((a, b) => a.date.localeCompare(b.date)),
              }
            : r
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-tertiary-dark">Past recommendations tracker</h2>
        <p className="text-sm text-tertiary mt-1 max-w-2xl">
          Recommendations from the January 2024 ESABCC report{' '}
          <a
            href="https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-primary"
          >
            Towards EU climate neutrality
          </a>
          . Update the status and log dated uptake events (e.g. enactment of the −90% 2040 target).
        </p>
      </header>

      <ul className="space-y-3">
        {recs.map(r => (
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
                <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                  {r.area}
                </p>
                <p className="text-sm font-medium text-tertiary-dark">{r.title}</p>
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
                  {(['not-addressed', 'in-progress', 'partially', 'addressed'] as const).map(s => (
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
                      <li key={idx} className="text-xs text-tertiary-dark">
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
                      </li>
                    ))}
                  </ul>
                  <AddEventForm onAdd={(d, n, u) => addEvent(r.id, d, n, u)} busy={busy} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
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
          {value}
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
          disabled={busy || !draft.trim() || draft === value}
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
          Cancel
        </button>
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
      <label className="text-[10px] text-tertiary flex-1 min-w-[200px]">
        <span className="block mb-0.5">Note</span>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. -90% target enacted via Reg (EU) 2026/667"
          className="w-full px-2 py-1 border border-grey-200 rounded text-xs"
        />
      </label>
      <label className="text-[10px] text-tertiary flex-1 min-w-[200px]">
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
