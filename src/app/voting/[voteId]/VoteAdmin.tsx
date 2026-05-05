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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteBundle, VoteToken } from '@/lib/voting/types';

export default function VoteAdmin({ initial }: { initial: VoteBundle }) {
  const router = useRouter();
  const [bundle, setBundle] = useState<VoteBundle>(initial);
  // When the parent re-renders with a fresh bundle (e.g. after router.refresh()
  // following a ballot submission elsewhere), pull those new tokens/ballots
  // into local state. Without this useEffect, useState(initial) snapshots the
  // first render forever and the Submissions counter never advances.
  useEffect(() => {
    setBundle(initial);
  }, [initial]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tokens minted in this browser session — we keep the raw string here so
  // the admin can copy them; on page reload we lose them, on purpose.
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Edit-mode for vote metadata (title / description / instructions). The
  // options list is intentionally not editable here — adding or removing
  // options after ballots have been submitted would silently invalidate
  // those ballots.
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(bundle.vote.title);
  const [draftDesc, setDraftDesc] = useState(bundle.vote.description ?? '');
  const [draftInstructions, setDraftInstructions] = useState(bundle.vote.instructions ?? '');
  const [savingEdit, setSavingEdit] = useState(false);

  function startEditing() {
    setDraftTitle(bundle.vote.title);
    setDraftDesc(bundle.vote.description ?? '');
    setDraftInstructions(bundle.vote.instructions ?? '');
    setEditing(true);
    setError(null);
  }

  async function saveEdit() {
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/voting/votes/${bundle.vote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDesc || undefined,
          instructions: draftInstructions || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save changes.');
      setBundle((b) => ({ ...b, vote: json.vote }));
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  function ballotUrl(token: string) {
    return `${baseOrigin}/vote/${encodeURIComponent(token)}`;
  }

  async function postTokens(payload: {
    count: number;
    labels: string[];
    maxUses: number | null;
  }) {
    const res = await fetch(`/api/voting/votes/${bundle.vote.id}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Could not generate tokens.');
    const fresh = json.tokens as VoteToken[];
    setBundle((b) => ({ ...b, tokens: [...b.tokens, ...fresh] }));
    const reveal: Record<string, boolean> = {};
    for (const t of fresh) reveal[t.token] = true;
    setRevealed((r) => ({ ...r, ...reveal }));
  }

  async function generateUniversal() {
    setCreating(true);
    setError(null);
    try {
      await postTokens({ count: 1, labels: ['Universal link'], maxUses: null });
    } catch (err) {
      setError((err as Error).message);
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

  async function resetVote() {
    const ok = window.confirm(
      `Reset "${bundle.vote.title}"?\n\n` +
        '• Every submitted ballot will be permanently deleted.\n' +
        '• Every voting link will be reset to unused, so the same links can be reused.\n' +
        '• Browsers that already voted will be allowed to vote again.\n\n' +
        'This cannot be undone.',
    );
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/voting/votes/${bundle.vote.id}/reset`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not reset the vote.');
        return;
      }
      // Reflect the reset locally: drop ballots, clear token usage, bump epoch.
      setBundle((b) => ({
        vote: json.vote,
        tokens: b.tokens.map((t) => ({ ...t, usedAt: null, useCount: 0 })),
        ballots: [],
      }));
      router.refresh();
    } catch {
      setError('Network error.');
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
              onClick={() => router.refresh()}
              title="Pull the latest ballot count from the server"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12.5px] font-semibold border border-[#3D5265]/40 text-[#3D5265] rounded-sm hover:border-[#3D5265]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M21 12a9 9 0 1 1-3.5-7.1" />
                <path d="M21 4v5h-5" />
              </svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={startEditing}
              disabled={editing}
              className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#3D5265]/40 text-[#3D5265] rounded-sm disabled:opacity-50"
            >
              Edit
            </button>
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
        {editing ? (
          <div className="mt-4 space-y-3">
            <label className="block text-[12.5px]">
              <span className="block font-semibold mb-1">Title</span>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="block text-[12.5px]">
              <span className="block font-semibold mb-1">Description</span>
              <textarea
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[60px]"
              />
            </label>
            <label className="block text-[12.5px]">
              <span className="block font-semibold mb-1">Instructions</span>
              <textarea
                value={draftInstructions}
                onChange={(e) => setDraftInstructions(e.target.value)}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[120px] whitespace-pre-line"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit || !draftTitle.trim()}
                className="px-3 py-1.5 text-[12.5px] font-semibold text-white bg-[#00928F] rounded-sm disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#E6E7E8] text-[#3D5265] rounded-sm"
              >
                Cancel
              </button>
              <span className="text-[11.5px] text-[#3D5265]/60 ml-2">
                Options and voting system can&apos;t be edited here — changing them after ballots come in would invalidate existing submissions.
              </span>
            </div>
          </div>
        ) : bundle.vote.description ? (
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
        <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-3">Voting link</h2>
        <p className="text-[12.5px] text-[#3D5265]/75 mb-4">
          One universal link to share with every participant — anyone with
          the link can submit a ballot, and browsers that have already voted
          are auto-redirected to the thank-you screen. Treat the link like
          a password.
        </p>

        <div className="rounded-sm border border-[#E6E7E8] p-3 bg-[#FBFBFA]">
          <h3 className="text-[12.5px] font-semibold text-[#3D5265]">Universal link</h3>
          <p className="text-[11.5px] text-[#3D5265]/70 mt-0.5 mb-2">
            One link, unlimited submissions.
          </p>
          <button
            type="button"
            onClick={generateUniversal}
            disabled={creating}
            className="px-3 py-1.5 text-[12.5px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Generating…' : '+ Generate universal link'}
          </button>
        </div>
        {error ? <p className="mt-2 text-[12.5px] text-[#B33A3A]">{error}</p> : null}

        {bundle.tokens.length > 0 ? (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] text-[#3D5265]/70">
                {bundle.tokens.reduce((acc, t) => acc + (t.useCount ?? 0), 0)} ballots
                across {bundle.tokens.length} link{bundle.tokens.length === 1 ? '' : 's'}
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
                    <th className="text-left px-3 py-2">Kind</th>
                    <th className="text-right px-3 py-2">Submissions</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E7E8]">
                  {bundle.tokens.map((t) => {
                    const url = ballotUrl(t.token);
                    const showRaw = revealed[t.token];
                    const isUniversal = t.maxUses === null;
                    const isSingleUse = t.maxUses === 1;
                    const usedCount = t.useCount ?? 0;
                    const exhausted = t.maxUses != null && usedCount >= t.maxUses;
                    return (
                      <tr key={t.token}>
                        <td className="px-3 py-2 text-[12.5px] text-[#3D5265]">{t.label ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-[11.5px] break-all">
                          {showRaw ? url : `${url.slice(0, baseOrigin.length + 8)}…`}
                        </td>
                        <td className="px-3 py-2">
                          {isUniversal ? (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#00928F]">universal</span>
                          ) : isSingleUse ? (
                            <span className={
                              'font-mono text-[10.5px] uppercase tracking-[0.08em] ' +
                              (exhausted ? 'text-[#E87722]' : 'text-[#3D5265]/70')
                            }>
                              {exhausted ? 'used' : 'single-use'}
                            </span>
                          ) : (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#3D5265]/70">
                              {usedCount} / {t.maxUses}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-[12px]">
                          {usedCount}
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

      <section className="rounded-sm border border-[#B33A3A]/30 bg-[#FBF1ED]/40 p-4 sm:p-5">
        <h2 className="text-[14px] font-mono uppercase tracking-[0.12em] text-[#B33A3A] mb-2">Danger zone</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[12.5px] text-[#3D5265]/80 max-w-2xl">
            Reset this vote — deletes every submitted ballot, marks every link
            as unused so the same URLs can be shared again, and bumps the
            reset epoch (currently <span className="font-mono">{bundle.vote.resetEpoch ?? 0}</span>)
            so participants who already voted can vote a second time from the
            same browser. This cannot be undone.
          </div>
          <button
            type="button"
            onClick={resetVote}
            className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-white bg-[#B33A3A] rounded-sm hover:opacity-90"
          >
            Reset vote
          </button>
        </div>
      </section>
    </div>
  );
}
