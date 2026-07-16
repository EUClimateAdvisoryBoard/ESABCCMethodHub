'use client';
/**
 * TargetSourceModal — "show me the actual EUR-Lex line" window.
 * -------------------------------------------------------------
 * When a reviewer clicks a target's provision (e.g. "Article 3(1) — Targets
 * for recharging infrastructure…") in the Policy Targets Register, this modal
 * pulls the consolidated EUR-Lex text for that act from the Policy Navigator
 * workspace (`GET /api/policy-text?id=<policy_id>` → `public/data/policy-texts/
 * <policy_id>.txt`) and shows the enacting text in context, with the exact
 * verbatim target passage highlighted and scrolled into view.
 *
 * Matching note: the consolidated text uses non-breaking spaces (U+00A0) and
 * variable whitespace runs, so the stored `target_text` is located with a
 * whitespace-flexible regex rather than a raw `indexOf`. `\s` in JS already
 * matches U+00A0, so splitting the quote on whitespace and re-joining with
 * `\s+` locates the passage and yields its exact offsets in the raw text.
 */
import { useEffect, useRef, useState } from 'react';
import type { PolicyTarget } from '@/data/policy-targets';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a whitespace-flexible regex from a verbatim quote so it matches the
 *  source even when the consolidated text uses non-breaking spaces or
 *  collapsed/expanded runs of whitespace. */
function flexibleQuoteRegex(quote: string): RegExp {
  const body = quote.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(body);
}

interface Located {
  before: string;
  match: string;
  after: string;
  /** True when the shown slice is only a window around the passage, not the
   *  whole act — drives the "context excerpt" hint in the footer. */
  windowed: boolean;
}

/** Locate the verbatim target passage in the full act text and return a
 *  readable context window (the containing article, where detectable) with the
 *  passage split out for highlighting. Returns null when the passage can't be
 *  found — the caller then falls back to the raw text + EUR-Lex link. */
function locate(fullText: string, target: PolicyTarget): Located | null {
  // 1. Exact substring first (cheap, common when whitespace already matches).
  let start = fullText.indexOf(target.target_text);
  let end = start >= 0 ? start + target.target_text.length : -1;

  // 2. Whitespace-flexible fallback (handles U+00A0 / collapsed runs).
  if (start < 0) {
    const m = fullText.match(flexibleQuoteRegex(target.target_text));
    if (m && m.index !== undefined) {
      start = m.index;
      end = m.index + m[0].length;
    }
  }

  if (start < 0 || end <= start) return null;

  // Context window: start at the containing article heading when we can find
  // it, otherwise a little before the passage; end at the next heading, else a
  // little after.
  const artNum = target.article.match(/Article\s+(\d+[a-z]?)/i)?.[1];

  let ctxStart = Math.max(0, start - 260);
  if (artNum) {
    const headingRe = new RegExp(`(^|\\n)(Article\\s+${escapeRegExp(artNum)})\\b`, 'gi');
    let last = -1;
    let hm: RegExpExecArray | null;
    while ((hm = headingRe.exec(fullText)) && hm.index < start) {
      last = hm.index + (hm[1] ? hm[1].length : 0);
    }
    if (last >= 0) ctxStart = last;
  }

  // Next structural heading after the passage bounds the window below.
  let ctxEnd = Math.min(fullText.length, end + 900);
  const nextHeadingRe = /\n(Article\s+\d+[a-z]?\b|CHAPTER\s+[IVXLC]+\b|ANNEX\s+\w+\b)/gi;
  nextHeadingRe.lastIndex = end;
  const nm = nextHeadingRe.exec(fullText);
  if (nm && nm.index > end) ctxEnd = Math.min(ctxEnd, nm.index);

  return {
    before: fullText.slice(ctxStart, start),
    match: fullText.slice(start, end),
    after: fullText.slice(end, ctxEnd),
    windowed: ctxStart > 0 || ctxEnd < fullText.length,
  };
}

interface Props {
  target: PolicyTarget | null;
  onClose: () => void;
}

export default function TargetSourceModal({ target, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(null);
  /** Raw act text kept for the "passage not found" fallback render. */
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const markRef = useRef<HTMLElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  useEffect(() => {
    if (!target) {
      setLocated(null);
      setRawFallback(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLocated(null);
    setRawFallback(null);
    setSource(null);

    fetch(`/api/policy-text?id=${encodeURIComponent(target.policy_id)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.full_text) {
          setError(data.error || 'The consolidated EUR-Lex text for this act is not available in the workspace.');
          return;
        }
        setSource(data.source ?? null);
        const hit = locate(data.full_text as string, target);
        if (hit) setLocated(hit);
        else setRawFallback(data.full_text as string);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the act text.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [target]);

  // Scroll the highlighted passage into view once it renders.
  useEffect(() => {
    if (!located || !markRef.current) return;
    const t = setTimeout(() => {
      markRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(t);
  }, [located]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Source text — ${target.article}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl bg-white dark:bg-[var(--mh-card)] shadow-2xl border border-grey-200 dark:border-[var(--mh-border)] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-grey-200 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] font-semibold">
                {target.policy_short}
                {target.celex_number && <span className="ml-1.5 font-normal">· CELEX {target.celex_number}</span>}
              </p>
              <h2 className="text-[14px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)] leading-snug mt-0.5">
                {target.article || 'Target source text'}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-md text-tertiary hover:text-tertiary-dark hover:bg-grey-200/60 dark:hover:bg-[var(--mh-border)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading && (
            <div className="flex items-center gap-2.5 text-[13px] text-tertiary dark:text-[var(--mh-muted)] py-10 justify-center">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading the act text from the Policy Navigator workspace…
            </div>
          )}

          {!loading && error && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-tertiary-dark dark:text-[var(--mh-fg)] mb-1 font-medium">Source text unavailable</p>
              <p className="text-[12px] text-tertiary dark:text-[var(--mh-muted)] max-w-md mx-auto leading-relaxed">{error}</p>
            </div>
          )}

          {!loading && located && (
            <>
              <p className="text-[11px] text-tertiary dark:text-[var(--mh-muted)] mb-3 leading-relaxed">
                The highlighted passage is the verbatim target text as it appears in the consolidated EUR-Lex text of this act.
              </p>
              <div className="font-serif text-[14px] leading-[1.75] text-tertiary-dark dark:text-[var(--mh-fg)] whitespace-pre-wrap">
                {located.before}
                <mark
                  ref={markRef}
                  className="rounded px-0.5 py-px"
                  style={{ backgroundColor: '#fde68a', color: '#3f2d00', boxShadow: '0 0 0 2px #fbbf24' }}
                >
                  {located.match}
                </mark>
                {located.after}
              </div>
            </>
          )}

          {!loading && !error && !located && rawFallback && (
            <>
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2">
                <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Couldn&rsquo;t pinpoint the exact line automatically — showing the start of the act. Use your browser find (Ctrl/⌘+F) for the passage, or open the authoritative version on EUR-Lex below.
                </p>
              </div>
              <div className="font-serif text-[14px] leading-[1.75] text-tertiary-dark dark:text-[var(--mh-fg)] whitespace-pre-wrap">
                {rawFallback.slice(0, 4000)}
                {rawFallback.length > 4000 && '\n\n…'}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-5 py-2.5 border-t border-grey-200 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)] flex items-center justify-between gap-3">
          <p className="text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">
            {source === 'local'
              ? 'Consolidated text · Policy Navigator workspace'
              : source === 'eurlex'
                ? 'Fetched live from EUR-Lex'
                : 'Policy Navigator workspace'}
            {located?.windowed && ' · context excerpt'}
          </p>
          {target.eurlex_url && (
            <a
              href={target.eurlex_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-secondary hover:underline"
            >
              Open on EUR-Lex
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
