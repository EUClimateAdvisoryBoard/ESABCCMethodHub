'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type ReviewStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'needs_changes';

interface SubmissionRow {
  id: string;
  callSlug: string;
  submitterName: string;
  submitterEmail: string;
  institution: string;
  modelName: string;
  scenarioName: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  publicUrl: string | null;
  storagePath: string | null;
  rowCount: number | null;
  headers: string[];
  missingColumns: string[];
  yearColumns: string[];
  validationOk: boolean;
  validationNotes: string;
  reviewStatus: ReviewStatus;
  reviewNotes: string;
  createdAt: string;
  reviewedAt: string | null;
}

const STATUS_FILTERS: { key: ReviewStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under review' },
  { key: 'needs_changes', label: 'Needs changes' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_COLOURS: Record<ReviewStatus, string> = {
  pending: 'bg-grey-100 text-grey-700',
  under_review: 'bg-blue-100 text-blue-700',
  needs_changes: 'bg-accent-orange/20 text-accent-orange',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-accent-red/20 text-accent-red',
};

export default function SecretariatSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === 'all'
          ? '/api/scenario-submissions'
          : `/api/scenario-submissions?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, reviewStatus: ReviewStatus) => {
    const reviewNotes = notesDraft[id];
    await fetch('/api/scenario-submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reviewStatus, reviewNotes }),
    });
    load();
  };

  const counts = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.reviewStatus] = (acc[s.reviewStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="bg-gradient-to-r from-[#004B7F] to-[#007B6C]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition mb-3">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Data &amp; Scenario Explorer
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Secretariat — Scenario Submissions
          </h1>
          <p className="text-sm text-white/80 max-w-3xl">
            Screen and triage scenario datasets uploaded through the public
            submission portal. Every row is a single upload; open it to inspect the
            file, validation results, and contributor metadata, then set its review
            status.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href="/scenarios/upload"
              className="inline-flex items-center gap-1.5 bg-white text-primary font-medium px-3 py-1.5 rounded hover:bg-white/90 transition">
              Open public upload portal
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition border ${
                filter === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
              }`}>
              {f.label}
              {f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 rounded text-xs font-medium bg-grey-100 text-tertiary-dark hover:bg-grey-200 transition">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-tertiary">Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-lg border border-grey-200 p-8 text-center">
            <p className="text-sm text-tertiary">No submissions yet.</p>
            <p className="text-xs text-tertiary mt-2">
              Share the upload portal link at{' '}
              <code className="text-primary">/scenarios/upload</code> to start
              collecting scenario data.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-grey-200 divide-y divide-grey-100">
            {submissions.map((s) => {
              const isOpen = expanded === s.id;
              return (
                <div key={s.id} className="p-4">
                  <div
                    className="flex flex-wrap items-start justify-between gap-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : s.id)}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-tertiary-dark truncate">
                          {s.modelName || 'Unknown model'}
                          {s.scenarioName ? ` · ${s.scenarioName}` : ''}
                        </p>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[s.reviewStatus]}`}>
                          {s.reviewStatus.replace('_', ' ')}
                        </span>
                        {!s.validationOk && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red">
                            validation issues
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-tertiary mt-0.5 truncate">
                        {s.fileName} · {(s.fileSize / 1024).toFixed(1)} KB
                        {s.rowCount != null ? ` · ${s.rowCount} rows` : ''}
                      </p>
                      <p className="text-[11px] text-tertiary mt-0.5">
                        From {s.submitterName || 'anonymous'}{' '}
                        {s.submitterEmail && (
                          <>
                            &lt;
                            <a
                              href={`mailto:${s.submitterEmail}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}>
                              {s.submitterEmail}
                            </a>
                            &gt;
                          </>
                        )}
                        {s.institution && ` · ${s.institution}`} ·{' '}
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-3 border-t border-grey-100 pt-3">
                      {s.description && (
                        <div>
                          <p className="text-[10px] font-bold text-tertiary-dark uppercase tracking-wider mb-1">
                            Contributor notes
                          </p>
                          <p className="text-xs text-tertiary whitespace-pre-wrap">
                            {s.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-grey-50 rounded p-2">
                          <p className="font-bold text-tertiary-dark mb-1">
                            Validation
                          </p>
                          <p className="text-tertiary">
                            {s.validationOk
                              ? 'OK — required columns present'
                              : s.validationNotes || 'Issues detected'}
                          </p>
                          {s.yearColumns.length > 0 && (
                            <p className="text-tertiary mt-1">
                              Year columns: {s.yearColumns.join(', ')}
                            </p>
                          )}
                          {s.missingColumns.length > 0 && (
                            <p className="text-accent-red mt-1">
                              Missing: {s.missingColumns.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="bg-grey-50 rounded p-2">
                          <p className="font-bold text-tertiary-dark mb-1">File</p>
                          {s.publicUrl ? (
                            <a
                              href={s.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline break-all">
                              Download {s.fileName}
                            </a>
                          ) : (
                            <p className="text-tertiary">
                              Stored path: <code>{s.storagePath || '—'}</code>
                            </p>
                          )}
                        </div>
                      </div>

                      {s.headers.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-tertiary-dark uppercase tracking-wider mb-1">
                            Detected columns
                          </p>
                          <p className="text-[11px] font-mono text-tertiary break-words">
                            {s.headers.join(', ')}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-tertiary-dark uppercase tracking-wider block mb-1">
                          Review notes
                        </label>
                        <textarea
                          value={notesDraft[s.id] ?? s.reviewNotes}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({
                              ...prev,
                              [s.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Internal notes for the Secretariat…"
                          className="w-full border border-grey-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            'under_review',
                            'needs_changes',
                            'accepted',
                            'rejected',
                          ] as ReviewStatus[]
                        ).map((st) => (
                          <button
                            key={st}
                            onClick={() => updateStatus(s.id, st)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition ${STATUS_COLOURS[st]} hover:opacity-80`}>
                            Mark {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
