'use client';

/**
 * Per-vote admin pane. Lets the Method Hub user:
 *  - generate single-use tokens and copy/share their public links;
 *  - flip the vote between draft / open / closed;
 *  - inspect option list and current ballot tally.
 *
 * The tokens table shows the raw token string only the first time it is
 * minted (returned by POST /tokens). Re-loads show used/unused state but
 * truncate the secret. This keeps the page useful while limiting passive
 * exposure when the screen is shared.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteBundle, VoteToken } from '@/lib/voting/types';

export default function VoteAdmin({ initial }: { initial: VoteBundle }) {
  const router = useRouter();
  const [bundle, setBundle] = useState<VoteBundle>(initial);
  const [count, setCount] = useState(15);
  const [genLabels, setGenLabels] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tokens minted in this browser session — we keep the raw string here so
  // the admin can copy them; on page reload we lose them, on purpose.
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  function ballotUrl(token: string) {
    return `${baseOrigin}/vote/${encodeURIComponent(token)}`;
  }

  async function generate() {
    setCreating(true);
    setError(null);
    try {
      const labels = genLabels
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await fetch(`/api/voting/votes/${bundle.vote.id}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, labels }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not generate tokens.');
      } else {
        const fresh = json.tokens as VoteToken[];
        setBundle((b) => ({ ...b, tokens: [...b.tokens, ...fresh] }));
        const reveal: Record<string, boolean> = {};
        for (const t of fresh) reveal[t.token] = true;
        setRevealed((r) => ({ ...r, ...reveal }));
        setGenLabels('');
      }
    } catch {
      setError('Network error.');
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(status: 'open' | 'closed' | 'draft') {
    const res = await fetch(`/api/voting/votes/${bundle.vote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const json = await res.json();
      setBundle((b) => ({ ...b, vote: json.vote }));
      router.refresh();
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — older browsers
    }
  }

  function copyAll() {
    const lines = bundle.tokens.map((t) => `${t.label ?? ''}\t${ballotUrl(t.token)}`);
    copy(lines.join('\n'));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-[#E6E7E8] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70">Status</h2>
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm border border-[#E6E7E8]">
            {bundle.vote.status}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setStatus('open')}
              disabled={bundle.vote.status === 'open'}
              className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#00928F] text-[#00928F] rounded-sm disabled:opacity-50"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setStatus('closed')}
              disabled={bundle.vote.status === 'closed'}
              className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#E87722] text-[#E87722] rounded-sm disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
        {bundle.vote.description ? (
          <p className="mt-3 text-[13px] text-[#3D5265]/80">{bundle.vote.description}</p>
        ) : null}
      </section>

      <section className="rounded-sm border border-[#E6E7E8] bg-white p-4 sm:p-5">
        <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-3">Options</h2>
        <ol className="list-decimal pl-5 space-y-1 text-[13px] text-[#3D5265]">
          {bundle.vote.options.map((o) => (
            <li key={o.id}>
              {o.label}
              {o.description ? <span className="text-[12px] text-[#3D5265]/70"> — {o.description}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-sm border border-[#E6E7E8] bg-white p-4 sm:p-5">
        <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-3">Voting links</h2>
        <p className="text-[12.5px] text-[#3D5265]/75 mb-3">
          Each link is single-use and cannot be reused once submitted.
          Share them privately — anyone with a link can cast a ballot, so
          treat them like passwords.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12.5px]">
            <span className="block font-semibold mb-1">How many?</span>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="w-24 rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="flex-1 min-w-[240px] text-[12.5px]">
            <span className="block font-semibold mb-1">Labels (optional, one per line)</span>
            <textarea
              value={genLabels}
              onChange={(e) => setGenLabels(e.target.value)}
              placeholder="e.g. AB Member 1\nAB Member 2"
              className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[60px]"
            />
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={creating}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Generating…' : '+ Generate links'}
          </button>
        </div>
        {error ? <p className="mt-2 text-[12.5px] text-[#B33A3A]">{error}</p> : null}

        {bundle.tokens.length > 0 ? (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-[#3D5265]/70">
                {bundle.tokens.filter((t) => t.usedAt).length} / {bundle.tokens.length} used
              </p>
              <button
                type="button"
                onClick={copyAll}
                className="text-[12px] font-semibold text-[#00928F] hover:underline"
              >
                Copy all (label + URL, tab-separated)
              </button>
            </div>
            <div className="overflow-x-auto rounded-sm border border-[#E6E7E8]">
              <table className="min-w-full text-[12.5px]">
                <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  <tr>
                    <th className="text-left px-3 py-2">Label</th>
                    <th className="text-left px-3 py-2">Link</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E7E8]">
                  {bundle.tokens.map((t) => {
                    const url = ballotUrl(t.token);
                    const showRaw = revealed[t.token];
                    return (
                      <tr key={t.token}>
                        <td className="px-3 py-2 text-[12.5px] text-[#3D5265]">{t.label ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-[11.5px] break-all">
                          {showRaw ? url : `${url.slice(0, baseOrigin.length + 8)}…`}
                        </td>
                        <td className="px-3 py-2">
                          {t.usedAt ? (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#E87722]">used</span>
                          ) : (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#00928F]">unused</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => copy(url)}
                            className="text-[12px] font-semibold text-[#00928F] hover:underline mr-3"
                          >
                            Copy URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevealed((r) => ({ ...r, [t.token]: !r[t.token] }))}
                            className="text-[12px] text-[#3D5265]/70 hover:text-[#3D5265]"
                          >
                            {showRaw ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-sm border border-[#E6E7E8] bg-white p-4 sm:p-5">
        <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-2">Submissions</h2>
        <p className="text-[13px] text-[#3D5265]">
          {bundle.ballots.length} ballot{bundle.ballots.length === 1 ? '' : 's'} recorded so far.
        </p>
        <p className="mt-2 text-[12.5px]">
          <a className="text-[#00928F] font-semibold hover:underline" href={`/voting/${bundle.vote.id}/results`}>
            Open results & analysis →
          </a>
        </p>
      </section>
    </div>
  );
}
