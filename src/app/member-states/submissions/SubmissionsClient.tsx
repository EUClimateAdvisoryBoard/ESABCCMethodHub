'use client';

/**
 * Approval-queue UI. Renders a list of pending submissions with patch
 * previews and Approve/Reject buttons. Approving optimistically removes
 * the row and refreshes the page so the heatmap reflects the new state.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { cpApi } from '@/lib/country-profiles/client';
import type { CountryProfileSubmission } from '@/data/country-profiles/_types';

interface Props {
  pending: CountryProfileSubmission[];
  decided: CountryProfileSubmission[];
  countryName: (cc: string) => string;
}

export default function SubmissionsClient({ pending, decided, countryName }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  async function approve(id: string) {
    setBusyId(id);
    try {
      await cpApi.approveSubmission(id);
      setRemoved(s => new Set([...s, id]));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }
  async function reject(id: string) {
    const reason = prompt('Reason for rejection (optional)') ?? undefined;
    setBusyId(id);
    try {
      await cpApi.rejectSubmission(id, reason);
      setRemoved(s => new Set([...s, id]));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const visible = pending.filter(p => !removed.has(p.id));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-bold text-tertiary-dark mb-3">
          Pending ({visible.length})
        </h2>
        {visible.length === 0 ? (
          <div className="text-[12px] text-tertiary italic">No pending submissions.</div>
        ) : (
          <ul className="space-y-3">
            {visible.map(s => (
              <li key={s.id} className="border border-grey-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-tertiary">
                      {s.source === 'external' ? 'External submission' : 'Main-user edit'} ·{' '}
                      {new Date(s.submittedAt).toLocaleString()}
                    </div>
                    <div className="text-sm font-bold text-tertiary-dark">
                      {countryName(s.countryCode)}{' '}
                      <span className="text-tertiary-light text-[11px] font-normal">({s.countryCode})</span>
                    </div>
                    <div className="text-[12px] text-tertiary-dark mt-0.5">
                      by {s.contributorName}
                      {s.contributorEmail && <span className="text-tertiary"> · {s.contributorEmail}</span>}
                    </div>
                    {s.message && (
                      <p className="text-[12px] text-tertiary-dark mt-1 bg-grey-50 rounded px-2 py-1">{s.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/member-states/${s.countryCode}`}
                      className="px-2.5 py-1 rounded-md border border-grey-200 text-tertiary-dark text-[11px] hover:bg-grey-50"
                    >
                      View profile
                    </Link>
                    <button
                      disabled={busyId === s.id}
                      onClick={() => reject(s.id)}
                      className="px-2.5 py-1 rounded-md border border-red-200 text-red-700 text-[11px] hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      disabled={busyId === s.id}
                      onClick={() => approve(s.id)}
                      className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] hover:bg-primary-dark disabled:opacity-50"
                    >
                      {busyId === s.id ? 'Working…' : 'Approve & apply'}
                    </button>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="text-[11px] text-primary cursor-pointer">Show patch</summary>
                  <pre className="text-[10px] font-mono bg-grey-50 border border-grey-200 rounded p-2 mt-1 overflow-x-auto max-h-64">
                    {JSON.stringify(s.patch, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-tertiary-dark mb-3">Recent decisions</h2>
        {decided.length === 0 ? (
          <div className="text-[12px] text-tertiary italic">No prior submissions.</div>
        ) : (
          <ul className="space-y-2">
            {decided.map(s => (
              <li
                key={s.id}
                className="border border-grey-100 rounded-md p-3 bg-white flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <div className="text-[11px] text-tertiary">
                    {new Date(s.submittedAt).toLocaleString()} · {s.source}
                  </div>
                  <div className="text-[13px] text-tertiary-dark font-medium">
                    {countryName(s.countryCode)} — {s.contributorName}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${
                    s.state === 'approved' ? 'bg-green-100 text-green-900' :
                    s.state === 'rejected' ? 'bg-red-100 text-red-900' :
                    'bg-grey-100 text-tertiary-dark'
                  }`}
                >
                  {s.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
