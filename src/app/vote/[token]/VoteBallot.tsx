'use client';

/**
 * Ballot form. All voting systems are dispatched from here.
 *
 * The form derives its constraints purely from the public vote view returned
 * by `/api/voting/ballot/[token]`. It NEVER fetches anything else and never
 * writes to localStorage so there is no spillover to other tabs the user
 * may have open on the same browser.
 *
 * The layout is mobile-first: bigger touch targets (≥44px), comfortable line
 * heights, full-width controls on phones, and a sticky submit bar at the
 * bottom on small screens so the action stays in reach while scrolling.
 */

import { useEffect, useMemo, useState } from 'react';
import type { PublicVoteView } from '@/lib/voting/types';

type FetchState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; vote: PublicVoteView }
  | { kind: 'submitted' }
  | { kind: 'already' };

/**
 * Per-browser idempotency for shared (universal) voting links. We tag the
 * vote id and the vote's `resetEpoch` (NOT the token) in localStorage so
 * the same browser can't easily submit a second ballot. This is advisory:
 * someone determined could clear storage, but it covers the realistic
 * "double-click submit" / "I forgot I already voted" cases.
 *
 * Including the epoch in the key means an admin "Reset" action — which
 * bumps the epoch on the server — silently invalidates every participant's
 * existing flag and lets them vote again on the same browser.
 */
const LS_KEY_PREFIX = 'esabcc-vote-submitted:';
function lsKey(voteId: string, epoch: number): string {
  return `${LS_KEY_PREFIX}${voteId}:${epoch}`;
}
function hasLocalSubmission(voteId: string, epoch: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(lsKey(voteId, epoch)) === '1';
  } catch {
    return false;
  }
}
function rememberLocalSubmission(voteId: string, epoch: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(lsKey(voteId, epoch), '1');
  } catch {
    /* private mode / quota — best-effort */
  }
}

export default function VoteBallot({ token }: { token: string }) {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [responses, setResponses] = useState<Record<string, number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/voting/ballot/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: 'invalid', message: json.error ?? 'This link is not valid.' });
          return;
        }
        const vote = json as PublicVoteView;
        if (vote.alreadySubmitted) {
          setState({ kind: 'already' });
          return;
        }
        if (vote.status !== 'open') {
          setState({ kind: 'invalid', message: 'This vote is not currently open.' });
          return;
        }
        if (vote.closesAt && new Date(vote.closesAt) < new Date()) {
          setState({ kind: 'invalid', message: 'This vote has closed.' });
          return;
        }
        // Per-browser idempotency for shared links: if THIS browser has
        // already submitted to THIS vote, show the thank-you screen instead
        // of letting the user submit twice. Soft enforcement only — the
        // server hasn't capped this token.
        if (vote.isShared && hasLocalSubmission(vote.id, vote.resetEpoch)) {
          setState({ kind: 'submitted' });
          return;
        }
        setState({ kind: 'ready', vote });
      } catch {
        if (!cancelled) setState({ kind: 'invalid', message: 'Could not load the ballot. Please try again later.' });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.kind === 'loading') {
    return <p className="text-[15px] text-[#3D5265]/70">Loading ballot…</p>;
  }
  if (state.kind === 'invalid') {
    return <ResultPanel headline="Unable to open this ballot" body={state.message} />;
  }
  if (state.kind === 'submitted') {
    return (
      <ResultPanel
        headline="Thanks for submitting your response."
        body="Your ballot has been recorded. You can close this tab now."
      />
    );
  }
  if (state.kind === 'already') {
    return (
      <ResultPanel
        headline="This link has already been used."
        body="If you believe this is an error, please contact the meeting organiser."
      />
    );
  }

  const { vote } = state;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/voting/ballot/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not submit your ballot.');
      } else {
        rememberLocalSubmission(vote.id, vote.resetEpoch);
        setState({ kind: 'submitted' });
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Bottom padding reserves space for the mobile sticky submit bar so the
    // last option isn't hidden behind it.
    <div className="pb-32 sm:pb-0">
      <header className="mb-5 sm:mb-8">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#00928F] font-semibold">
          ESABCC · Confidential ballot
        </p>
        <h1 className="mt-2 text-[22px] sm:text-[28px] font-bold text-[#3D5265] leading-tight">
          {vote.title}
        </h1>
        {vote.description ? (
          <p className="mt-3 text-[15px] sm:text-[14px] text-[#3D5265]/85 leading-relaxed">{vote.description}</p>
        ) : null}
        {vote.instructions ? (
          <div className="mt-4 rounded-sm border border-[#E6E7E8] bg-white p-3 sm:p-4 text-[14px] sm:text-[13px] text-[#3D5265]/85 leading-relaxed whitespace-pre-line">
            {vote.instructions}
          </div>
        ) : null}
      </header>

      <BallotControls vote={vote} responses={responses} onChange={setResponses} />

      {error ? (
        <p className="mt-4 text-[14px] text-[#B33A3A]" role="alert">{error}</p>
      ) : null}

      {/* Inline footer — visible on tablet/desktop. */}
      <div className="mt-8 hidden sm:flex items-center justify-between gap-3 border-t border-[#E6E7E8] pt-6">
        <p className="text-[11.5px] text-[#3D5265]/60 max-w-md leading-snug">
          {vote.isShared
            ? 'Your response cannot be edited after submission. Please only submit once.'
            : 'Your response is single-use and cannot be edited after submission.'}
        </p>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center justify-center px-5 py-2.5 text-[13.5px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit ballot'}
        </button>
      </div>

      {/* Sticky submit bar — visible on phones. Sits above the iOS home
          indicator via env(safe-area-inset-bottom). */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E7E8] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full inline-flex items-center justify-center px-5 py-3.5 text-[16px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90 disabled:opacity-50 shadow-sm"
        >
          {submitting ? 'Submitting…' : 'Submit ballot'}
        </button>
        <p className="mt-2 text-[11.5px] text-[#3D5265]/60 leading-snug text-center">
          {vote.isShared
            ? 'Your response cannot be edited after submission. Please only submit once.'
            : 'Your response is single-use and cannot be edited after submission.'}
        </p>
      </div>
    </div>
  );
}

function ResultPanel({ headline, body }: { headline: string; body: string }) {
  return (
    <div className="rounded-sm border border-[#E6E7E8] bg-white p-6">
      <h1 className="text-[20px] font-bold text-[#3D5265]">{headline}</h1>
      <p className="mt-3 text-[14px] text-[#3D5265]/80 leading-relaxed">{body}</p>
    </div>
  );
}

function BallotControls({
  vote,
  responses,
  onChange,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  onChange: (next: Record<string, number | boolean>) => void;
}) {
  const setVal = (id: string, val: number | boolean | null) => {
    const next = { ...responses };
    if (val === null) delete next[id];
    else next[id] = val;
    onChange(next);
  };

  switch (vote.votingSystem) {
    case 'priority_ranking':
      return <PriorityRankingControls vote={vote} responses={responses} setVal={setVal} />;
    case 'single_choice':
      return <SingleChoiceControls vote={vote} responses={responses} setVal={setVal} />;
    case 'multi_choice':
      return <MultiChoiceControls vote={vote} responses={responses} setVal={setVal} />;
    case 'approval':
      return <ApprovalControls vote={vote} responses={responses} setVal={setVal} />;
    case 'star':
      return <StarControls vote={vote} responses={responses} setVal={setVal} />;
    case 'average_ranking':
    case 'ranked_voting':
      return <RankingControls vote={vote} responses={responses} onChange={onChange} />;
  }
}

function PriorityRankingControls({
  vote,
  responses,
  setVal,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  setVal: (id: string, val: number | boolean | null) => void;
}) {
  const scores = vote.config.scores ?? [];
  const caps = vote.config.maxPerScore ?? {};
  const labels = vote.config.scoreLabels ?? {};
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of Object.values(responses)) {
      if (typeof v === 'number') c[String(v)] = (c[String(v)] ?? 0) + 1;
    }
    return c;
  }, [responses]);

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-dashed border-[#B8BCC2] bg-white px-3 py-2 text-[12.5px] text-[#3D5265]/80 flex flex-wrap gap-x-4 gap-y-1">
        {scores.map((s) => {
          const cap = caps[String(s)];
          const used = counts[String(s)] ?? 0;
          const overCap = cap != null && used > cap;
          return (
            <span key={s} className={overCap ? 'text-[#B33A3A] font-semibold' : ''}>
              <span className="font-mono mr-1">{s}</span>
              {labels[String(s)] ? <span className="text-[#8A95A3]">({labels[String(s)]})</span> : null}
              <span className="ml-1 text-[#8A95A3]">
                {used}{cap != null ? ` / max ${cap}` : ''}
              </span>
            </span>
          );
        })}
      </div>

      <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
        {vote.options.map((opt) => {
          const selected = responses[opt.id];
          return (
            <li key={opt.id} className="px-3 py-3 sm:py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] sm:text-[14px] font-medium text-[#3D5265] leading-snug">{opt.label}</p>
                  {opt.description ? (
                    <p className="text-[13px] sm:text-[12px] text-[#3D5265]/70 mt-0.5 leading-snug">{opt.description}</p>
                  ) : null}
                </div>
                <div
                  className="grid sm:flex sm:flex-wrap sm:items-center gap-1.5"
                  style={{
                    // On mobile, give every score an equal-width column so
                    // the row never wraps awkwardly with one button on a
                    // second line. Falls back to flex-wrap on sm+.
                    gridTemplateColumns: `repeat(${Math.max(1, scores.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {scores.map((s) => {
                    const isOn = selected === s;
                    const label = labels[String(s)];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          // Already on → clicking removes the score (always allowed).
                          if (isOn) {
                            setVal(opt.id, null);
                            return;
                          }
                          // Block selecting a score that has already reached its cap.
                          // Tell the voter to free a slot first instead of silently
                          // letting them go over and rejecting on submit.
                          const cap = caps[String(s)];
                          const usedNow = counts[String(s)] ?? 0;
                          if (cap != null && usedNow >= cap) {
                            const lbl = labels[String(s)] ?? `score ${s}`;
                            window.alert(
                              `You can only give ${lbl} (${s}) to ${cap} option${cap === 1 ? '' : 's'}. ` +
                                `Please untick another option first.`,
                            );
                            return;
                          }
                          setVal(opt.id, s);
                        }}
                        aria-pressed={isOn}
                        title={label ? `${label} (score ${s})` : `score ${s}`}
                        className={
                          'min-h-[44px] sm:min-h-0 sm:min-w-[44px] px-2 sm:px-2.5 py-2 sm:py-1 ' +
                          'rounded-sm text-[13.5px] sm:text-[12.5px] font-semibold border transition-colors capitalize ' +
                          'flex items-center justify-center gap-1 leading-tight ' +
                          (isOn
                            ? 'bg-[#00928F] border-[#00928F] text-white'
                            : 'bg-white border-[#E6E7E8] text-[#3D5265] hover:border-[#00928F] active:bg-[#F1F5F4]')
                        }
                      >
                        {label ? (
                          <>
                            <span className="truncate">{label}</span>
                            <span className={'font-mono normal-case ' + (isOn ? 'opacity-80' : 'text-[#8A95A3]')}>
                              ·{s}
                            </span>
                          </>
                        ) : (
                          s
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SingleChoiceControls({
  vote,
  responses,
  setVal,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  setVal: (id: string, val: number | boolean | null) => void;
}) {
  const selected = Object.entries(responses).find(([, v]) => v === true)?.[0] ?? null;
  return (
    <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
      {vote.options.map((opt) => {
        const isSel = selected === opt.id;
        return (
          <li key={opt.id}>
            <label
              className={
                'flex items-start gap-3 px-3 py-4 sm:py-3 cursor-pointer min-h-[52px] ' +
                (isSel ? 'bg-[#E6F5F4]/60' : 'hover:bg-[#FBFBFA] active:bg-[#F1F5F4]')
              }
            >
              <input
                type="radio"
                name="single"
                checked={isSel}
                onChange={() => {
                  for (const k of Object.keys(responses)) if (k !== opt.id) setVal(k, null);
                  setVal(opt.id, true);
                }}
                className="mt-1 w-5 h-5 accent-[#00928F]"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] sm:text-[14px] font-medium text-[#3D5265] leading-snug">{opt.label}</span>
                {opt.description ? (
                  <span className="block text-[13px] sm:text-[12px] text-[#3D5265]/70 mt-1 leading-snug">{opt.description}</span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function MultiChoiceControls({
  vote,
  responses,
  setVal,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  setVal: (id: string, val: number | boolean | null) => void;
}) {
  const max = vote.config.maxSelections ?? vote.options.length;
  const selectedCount = Object.values(responses).filter((v) => v === true).length;
  return (
    <div>
      <p className="text-[13px] sm:text-[12px] text-[#3D5265]/75 mb-2">
        Pick up to {max}.  Selected: <span className="font-semibold text-[#3D5265]">{selectedCount}</span>.
      </p>
      <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
        {vote.options.map((opt) => {
          const checked = responses[opt.id] === true;
          const disabled = !checked && selectedCount >= max;
          return (
            <li key={opt.id}>
              <label
                className={
                  'flex items-start gap-3 px-3 py-4 sm:py-3 min-h-[52px] ' +
                  (disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FBFBFA] active:bg-[#F1F5F4]') +
                  (checked ? ' bg-[#E6F5F4]/60' : '')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => setVal(opt.id, e.target.checked ? true : null)}
                  className="mt-1 w-5 h-5 accent-[#00928F]"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] sm:text-[14px] font-medium text-[#3D5265] leading-snug">{opt.label}</span>
                  {opt.description ? (
                    <span className="block text-[13px] sm:text-[12px] text-[#3D5265]/70 mt-1 leading-snug">{opt.description}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ApprovalControls({
  vote,
  responses,
  setVal,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  setVal: (id: string, val: number | boolean | null) => void;
}) {
  return (
    <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
      {vote.options.map((opt) => {
        const v = responses[opt.id];
        return (
          <li key={opt.id} className="px-3 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] sm:text-[14px] font-medium text-[#3D5265] leading-snug">{opt.label}</p>
                {opt.description ? (
                  <p className="text-[13px] sm:text-[12px] text-[#3D5265]/70 mt-1 leading-snug">{opt.description}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-1.5">
                {([['Approve', true], ['Reject', false]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setVal(opt.id, v === val ? null : val)}
                    aria-pressed={v === val}
                    className={
                      'min-h-[44px] px-3 py-2 text-[14px] sm:text-[12px] font-semibold rounded-sm border transition-colors ' +
                      (v === val
                        ? val
                          ? 'bg-[#00928F] border-[#00928F] text-white'
                          : 'bg-[#3D5265] border-[#3D5265] text-white'
                        : 'bg-white border-[#E6E7E8] text-[#3D5265] hover:border-[#00928F] active:bg-[#F1F5F4]')
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RankingControls({
  vote,
  responses,
  onChange,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  onChange: (next: Record<string, number | boolean>) => void;
}) {
  const N = vote.options.length;
  const isIRV = vote.votingSystem === 'ranked_voting';
  // For average_ranking we always rank every option. IRV defaults to optional
  // ranks so partial ballots are allowed; we surface that distinction in the
  // hint copy.
  const requireAll = vote.config.requireAllRanked ?? !isIRV;

  // Local order state — the array index *is* the rank. Initialised once
  // from the existing responses (to survive a parent re-render) and from
  // vote.options order otherwise so first-time voters see a deterministic
  // starting layout to drag from.
  const initialOrder = useMemo(() => {
    const sorted = [...vote.options].sort((a, b) => {
      const ra = typeof responses[a.id] === 'number' ? (responses[a.id] as number) : Number.POSITIVE_INFINITY;
      const rb = typeof responses[b.id] === 'number' ? (responses[b.id] as number) : Number.POSITIVE_INFINITY;
      return ra - rb;
    });
    return sorted.map((o) => o.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [order, setOrder] = useState<string[]>(initialOrder);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Push position-derived ranks back to the parent on every reorder. We
  // skip writing if responses is already in sync to avoid an infinite
  // re-render loop with the parent's onChange.
  useEffect(() => {
    const next: Record<string, number | boolean> = {};
    order.forEach((id, i) => {
      next[id] = i + 1;
    });
    // Cheap equality check.
    const sameSize = Object.keys(responses).length === order.length;
    if (sameSize) {
      let same = true;
      for (const id of order) {
        if (responses[id] !== next[id]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    setOrder((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }

  const optionById: Record<string, typeof vote.options[number]> = {};
  for (const o of vote.options) optionById[o.id] = o;

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-dashed border-[#B8BCC2] bg-white px-3 py-2 text-[13px] sm:text-[12px] text-[#3D5265]/85 leading-snug">
        <span className="sm:hidden">
          {isIRV
            ? `Use the ▲ / ▼ buttons to rank from your top choice (#1) to your last choice. Lower number = higher preference.`
            : `Use the ▲ / ▼ buttons to order every option from best (#1) to worst (#${N}).`}
          {' '}{requireAll ? 'All options must be ranked.' : 'Partial rankings allowed.'}
        </span>
        <span className="hidden sm:inline">
          {isIRV
            ? 'Drag to rank from your top choice (left, #1) to your last choice (right). On touch, use ←/→.'
            : `Drag to order every option from best (left, #1) to worst (right, #${N}). On touch, use ←/→.`}
          {' '}{requireAll ? 'All options must be ranked.' : 'Partial rankings allowed.'}
        </span>
      </div>

      {/* Mobile: vertical list with up/down buttons. Desktop: drag-and-drop chips row. */}
      <ol
        className="sm:hidden flex flex-col gap-2 p-2 rounded-sm border border-[#E6E7E8] bg-[#FBFBFA]"
      >
        {order.map((id, i) => {
          const opt = optionById[id];
          if (!opt) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-2 px-3 py-3 rounded-sm border border-[#E6E7E8] bg-white text-[14px] text-[#3D5265]"
              aria-label={`${opt.label}, current rank ${i + 1} of ${N}`}
            >
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-sm bg-[#00928F]/10 text-[#00928F] font-mono text-[14px] font-semibold tabular-nums shrink-0"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 font-medium leading-snug">
                <span className="block truncate" title={opt.label}>{opt.label}</span>
                {opt.description ? (
                  <span className="block text-[12px] text-[#3D5265]/65 mt-0.5 truncate">{opt.description}</span>
                ) : null}
              </span>
              <span className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => reorder(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${opt.label} up`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-[#E6E7E8] bg-white text-[#3D5265] disabled:opacity-30 active:bg-[#F1F5F4]"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => reorder(i, i + 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${opt.label} down`}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-[#E6E7E8] bg-white text-[#3D5265] disabled:opacity-30 active:bg-[#F1F5F4]"
                >
                  ▼
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <ol
        className="hidden sm:flex flex-wrap gap-2 p-2 rounded-sm border border-[#E6E7E8] bg-[#FBFBFA]"
        // Allow drops onto the list as a whole — handlers on the cards
        // narrow the drop position. Without preventDefault on dragOver the
        // browser refuses to fire the drop event.
        onDragOver={(e) => e.preventDefault()}
      >
        {order.map((id, i) => {
          const opt = optionById[id];
          if (!opt) return null;
          const dragging = dragIdx === i;
          const over = overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragIdx(i);
                e.dataTransfer.effectAllowed = 'move';
                // Required by Firefox to start the drag.
                try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* ignore */ }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overIdx !== i) setOverIdx(i);
              }}
              onDragLeave={() => {
                if (overIdx === i) setOverIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) reorder(dragIdx, i);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={
                'group relative flex items-center gap-2 px-3 py-2 min-w-[160px] max-w-[260px] ' +
                'rounded-sm border bg-white text-[13px] text-[#3D5265] cursor-grab active:cursor-grabbing select-none transition ' +
                (dragging ? 'opacity-50 ' : '') +
                (over ? 'border-[#00928F] ring-2 ring-[#00928F]/30 ' : 'border-[#E6E7E8] ')
              }
              aria-grabbed={dragging}
              aria-label={`${opt.label}, current rank ${i + 1} of ${N}`}
            >
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-[#00928F]/10 text-[#00928F] font-mono text-[12px] font-semibold tabular-nums"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate font-medium" title={opt.label}>{opt.label}</span>
              <span className="flex flex-col -my-1">
                <button
                  type="button"
                  onClick={() => reorder(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${opt.label} earlier`}
                  className="px-1 text-[11px] text-[#3D5265]/60 hover:text-[#00928F] disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => reorder(i, i + 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${opt.label} later`}
                  className="px-1 text-[11px] text-[#3D5265]/60 hover:text-[#00928F] disabled:opacity-30"
                >
                  →
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StarControls({
  vote,
  responses,
  setVal,
}: {
  vote: PublicVoteView;
  responses: Record<string, number | boolean>;
  setVal: (id: string, val: number | boolean | null) => void;
}) {
  const max = vote.config.maxStars ?? 5;
  return (
    <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
      {vote.options.map((opt) => {
        const v = typeof responses[opt.id] === 'number' ? (responses[opt.id] as number) : 0;
        return (
          <li key={opt.id} className="px-3 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] sm:text-[14px] font-medium text-[#3D5265] leading-snug">{opt.label}</p>
                {opt.description ? (
                  <p className="text-[13px] sm:text-[12px] text-[#3D5265]/70 mt-1 leading-snug">{opt.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-1">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVal(opt.id, v === n ? null : n)}
                    aria-label={`${n} of ${max}`}
                    className={
                      'w-11 h-11 sm:w-7 sm:h-7 rounded-sm border text-[18px] sm:text-[13px] font-semibold flex items-center justify-center ' +
                      (n <= v
                        ? 'bg-[#E87722] border-[#E87722] text-white'
                        : 'bg-white border-[#E6E7E8] text-[#3D5265] active:bg-[#F1F5F4]')
                    }
                  >
                    {n <= v ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
