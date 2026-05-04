'use client';

/**
 * Ballot form. All voting systems are dispatched from here.
 *
 * The form derives its constraints purely from the public vote view returned
 * by `/api/voting/ballot/[token]`. It NEVER fetches anything else and never
 * writes to localStorage so there is no spillover to other tabs the user
 * may have open on the same browser.
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
    return <p className="text-sm text-[#3D5265]/70">Loading ballot…</p>;
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
    <div>
      <header className="mb-6 sm:mb-8">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#00928F] font-semibold">
          ESABCC · Confidential ballot
        </p>
        <h1 className="mt-2 text-[24px] sm:text-[28px] font-bold text-[#3D5265] leading-tight">
          {vote.title}
        </h1>
        {vote.description ? (
          <p className="mt-3 text-[14px] text-[#3D5265]/80 leading-relaxed">{vote.description}</p>
        ) : null}
        {vote.instructions ? (
          <div className="mt-4 rounded-sm border border-[#E6E7E8] bg-white p-3 text-[13px] text-[#3D5265]/85 leading-relaxed whitespace-pre-line">
            {vote.instructions}
          </div>
        ) : null}
      </header>

      <BallotControls vote={vote} responses={responses} onChange={setResponses} />

      {error ? (
        <p className="mt-4 text-[13px] text-[#B33A3A]">{error}</p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#E6E7E8] pt-6">
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

  const [warning, setWarning] = useState<string | null>(null);

  // Decide what should happen when the user clicks score `s` on option
  // `optId`, given the current responses. We ALWAYS allow a click to
  // un-set the option's current score (toggle off) so the participant
  // can fix a mistake. We BLOCK a click that would push a score above
  // its cap; that path returns the warning text instead.
  function attempt(optId: string, s: number): { kind: 'unset' | 'set' | 'blocked'; message?: string } {
    const current = responses[optId];
    if (current === s) return { kind: 'unset' };
    const cap = caps[String(s)];
    if (cap != null && (counts[String(s)] ?? 0) >= cap) {
      const label = labels[String(s)] ? ` (${labels[String(s)]})` : '';
      return {
        kind: 'blocked',
        message:
          `You can only assign score ${s}${label} to ${cap} option${cap === 1 ? '' : 's'}. ` +
          `To assign it here, change one of your existing ${s}s to a different score first.`,
      };
    }
    return { kind: 'set' };
  }

  function handleClick(optId: string, s: number) {
    const r = attempt(optId, s);
    if (r.kind === 'blocked') {
      setWarning(r.message ?? 'You have reached the limit for this score.');
      return;
    }
    setWarning(null);
    setVal(optId, r.kind === 'unset' ? null : s);
  }

  return (
    <div className="space-y-2">
      {warning ? (
        <div
          role="alert"
          className="rounded-sm border border-[#E87722] bg-[#FBF1ED] px-3 py-2 text-[12.5px] text-[#3D5265] flex items-start gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E87722" strokeWidth="2.5" className="mt-[2px] flex-shrink-0" aria-hidden>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>{warning}</span>
        </div>
      ) : null}

      <div className="rounded-sm border border-dashed border-[#B8BCC2] bg-white px-3 py-2 text-[12px] text-[#3D5265]/80 flex flex-wrap gap-x-4 gap-y-1">
        {scores.map((s) => {
          const cap = caps[String(s)];
          const used = counts[String(s)] ?? 0;
          const atCap = cap != null && used >= cap;
          return (
            <span key={s} className={atCap ? 'text-[#E87722] font-semibold' : ''}>
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
            <li key={opt.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#3D5265]">{opt.label}</p>
                {opt.description ? (
                  <p className="text-[12px] text-[#3D5265]/70 mt-0.5">{opt.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {scores.map((s) => {
                  const isOn = selected === s;
                  // Mirror the runtime check so we can dim buttons that
                  // would be rejected. Toggle-off (isOn) is always allowed.
                  const cap = caps[String(s)];
                  const wouldBeBlocked =
                    !isOn && cap != null && (counts[String(s)] ?? 0) >= cap;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleClick(opt.id, s)}
                      aria-pressed={isOn}
                      aria-disabled={wouldBeBlocked}
                      title={
                        wouldBeBlocked
                          ? `Score ${s} is at its cap of ${cap}. Change one of your existing ${s}s first.`
                          : undefined
                      }
                      className={
                        'min-w-[40px] px-2 py-1 rounded-sm text-[12.5px] font-semibold border transition-colors ' +
                        (isOn
                          ? 'bg-[#00928F] border-[#00928F] text-white'
                          : wouldBeBlocked
                          ? 'bg-[#F4F5F6] border-[#E6E7E8] text-[#8A95A3] cursor-not-allowed hover:border-[#E87722]'
                          : 'bg-white border-[#E6E7E8] text-[#3D5265] hover:border-[#00928F]')
                      }
                    >
                      {s}
                    </button>
                  );
                })}
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
      {vote.options.map((opt) => (
        <li key={opt.id}>
          <label className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-[#FBFBFA]">
            <input
              type="radio"
              name="single"
              checked={selected === opt.id}
              onChange={() => {
                const next: Record<string, boolean> = {};
                next[opt.id] = true;
                // Replace previous selections wholesale.
                for (const k of Object.keys(responses)) if (k !== opt.id) setVal(k, null);
                setVal(opt.id, true);
              }}
              className="mt-1"
            />
            <span>
              <span className="text-[14px] font-medium text-[#3D5265]">{opt.label}</span>
              {opt.description ? (
                <span className="block text-[12px] text-[#3D5265]/70 mt-0.5">{opt.description}</span>
              ) : null}
            </span>
          </label>
        </li>
      ))}
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
      <p className="text-[12px] text-[#3D5265]/70 mb-2">Pick up to {max}.  Selected: {selectedCount}.</p>
      <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden bg-white">
        {vote.options.map((opt) => {
          const checked = responses[opt.id] === true;
          const disabled = !checked && selectedCount >= max;
          return (
            <li key={opt.id}>
              <label
                className={
                  'flex items-start gap-3 px-3 py-3 ' +
                  (disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FBFBFA]')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => setVal(opt.id, e.target.checked ? true : null)}
                  className="mt-1"
                />
                <span>
                  <span className="text-[14px] font-medium text-[#3D5265]">{opt.label}</span>
                  {opt.description ? (
                    <span className="block text-[12px] text-[#3D5265]/70 mt-0.5">{opt.description}</span>
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
          <li key={opt.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div>
              <p className="text-[14px] font-medium text-[#3D5265]">{opt.label}</p>
              {opt.description ? (
                <p className="text-[12px] text-[#3D5265]/70 mt-0.5">{opt.description}</p>
              ) : null}
            </div>
            <div className="flex gap-1.5">
              {([['Approve', true], ['Reject', false]] as const).map(([label, val]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setVal(opt.id, v === val ? null : val)}
                  aria-pressed={v === val}
                  className={
                    'px-2.5 py-1 text-[12px] font-semibold rounded-sm border ' +
                    (v === val
                      ? val
                        ? 'bg-[#00928F] border-[#00928F] text-white'
                        : 'bg-[#3D5265] border-[#3D5265] text-white'
                      : 'bg-white border-[#E6E7E8] text-[#3D5265] hover:border-[#00928F]')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
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
          <li key={opt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#3D5265]">{opt.label}</p>
              {opt.description ? (
                <p className="text-[12px] text-[#3D5265]/70 mt-0.5">{opt.description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVal(opt.id, v === n ? null : n)}
                  aria-label={`${n} of ${max}`}
                  className={
                    'w-7 h-7 rounded-sm border text-[13px] font-semibold ' +
                    (n <= v
                      ? 'bg-[#E87722] border-[#E87722] text-white'
                      : 'bg-white border-[#E6E7E8] text-[#3D5265]')
                  }
                >
                  {n <= v ? '★' : '☆'}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
