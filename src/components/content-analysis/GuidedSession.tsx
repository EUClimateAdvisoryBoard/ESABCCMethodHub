'use client';
/**
 * Guided session for the Content Analysis workbench (M·05).
 *
 * Unlike the lightweight corner-card `OnboardingTour`, this is a full
 * step-through coaching overlay: it dims the page, spotlights the element a
 * step is about, and parks a card next to it. It is what the brief calls the
 * "guided session at the beginning" — it auto-opens the first time an analyst
 * opens a project workbench (i.e. once they have a source in front of them),
 * walks them through adding codes, applying codes, writing summaries,
 * switching lenses and reading the results, then never nags again.
 *
 * Persistence reuses the per-user `onboarding_seen` flag store, so skipping
 * it (even while offline) sticks across reloads and sign-in. It can be
 * replayed any time from the "Guided tour" button (bump `replayToken`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/lib/preferences-context';

export interface GuidedStep {
  title: string;
  body: React.ReactNode;
  /** CSS selector for the element this step is about. Omit for a centred,
   *  anchorless step (e.g. a welcome panel). */
  anchor?: string;
  /** Fired when the step becomes active — e.g. to switch the host page to the
   *  tab this step describes before its anchor is measured. */
  onEnter?: () => void;
}

interface Props {
  moduleKey: string;
  steps: GuidedStep[];
  /** Only auto-open while true (the workbench is mounted and a source is in
   *  view). When false the tour stays closed even if unseen. */
  active: boolean;
  /** Increment to force-replay the tour from step 0, ignoring the seen flag. */
  replayToken?: number;
}

interface Rect { top: number; left: number; width: number; height: number; }

const PAD = 8;            // spotlight padding around the anchor
const CARD_W = 340;       // card width for placement maths
const GAP = 14;           // gap between spotlight and card

export default function GuidedSession({ moduleKey, steps, active, replayToken = 0 }: Props) {
  const { prefs, markOnboardingSeen } = usePreferences();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Auto-open once per user when the workbench first becomes active.
  useEffect(() => {
    if (!active) return;
    if (prefs.onboarding_seen[moduleKey]) return;
    setStep(0);
    setOpen(true);
  }, [active, moduleKey, prefs.onboarding_seen]);

  // Replay: a token bump always re-opens, regardless of the seen flag.
  const firstReplay = useRef(true);
  useEffect(() => {
    if (firstReplay.current) { firstReplay.current = false; return; }
    setStep(0);
    setOpen(true);
  }, [replayToken]);

  const finish = useCallback(() => {
    setOpen(false);
    markOnboardingSeen(moduleKey);
  }, [markOnboardingSeen, moduleKey]);

  // Keep the current step's anchor selector in a ref so the scroll/resize
  // listener can read it without being re-subscribed on every render. (The
  // `steps` prop is typically an inline array literal that the host recreates
  // on each render, so depending on its identity would thrash the effects.)
  const anchorRef = useRef<string | undefined>(undefined);
  anchorRef.current = steps[step]?.anchor;

  const measure = useCallback(() => {
    const sel = anchorRef.current;
    if (!sel) { setRect(null); return; }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  // Fire the step's onEnter (e.g. switch the host page's tab) once per entry,
  // before we look for its anchor.
  useEffect(() => {
    if (!open) return;
    steps[step]?.onEnter?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // Locate, scroll to and measure the anchor for the active step. A step's
  // onEnter may have just switched the host's tab, so the target section can
  // mount a frame or two later — poll with rAF until it appears (rather than a
  // single fixed timeout that fires before the section exists), scroll it into
  // view once, then keep measuring for a few frames so the spotlight follows
  // the smooth scroll. Depends only on open/step, so it runs once per step
  // entry instead of on every host re-render.
  useEffect(() => {
    if (!open) return;
    const sel = steps[step]?.anchor;
    if (!sel) { setRect(null); return; }

    let raf = 0;
    let frames = 0;
    let scrolled = false;

    const locate = () => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) {
        // Anchor not in the DOM yet (e.g. its tab is still mounting). Keep
        // polling for a short while before falling back to a centred card.
        frames += 1;
        if (frames < 60) { raf = requestAnimationFrame(locate); return; }
        setRect(null);
        return;
      }
      if (!scrolled) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrolled = true;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      // Re-measure for a few frames so the box tracks the smooth scroll.
      frames += 1;
      if (frames < 45) raf = requestAnimationFrame(locate);
    };

    raf = requestAnimationFrame(locate);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, measure]);

  // Keyboard: →/Enter advance, ← back, Esc skip.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open || steps.length === 0) return null;
  const current = steps[step];
  const last = step === steps.length - 1;

  function advance(dir: 1 | -1) {
    const nextIdx = step + dir;
    if (nextIdx < 0) return;
    if (nextIdx >= steps.length) { finish(); return; }
    setStep(nextIdx);
  }

  // Card placement: below the anchor if there's room, otherwise above; clamp
  // into the viewport. Anchorless steps centre the card.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + GAP;
    const placeBelow = below + 200 < vh || rect.top < 220;
    const top = placeBelow ? below : Math.max(GAP, rect.top - GAP - 200);
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    left = Math.min(Math.max(GAP, left), vw - CARD_W - GAP);
    cardStyle = { position: 'fixed', top, left, width: CARD_W };
  } else {
    cardStyle = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: CARD_W,
    };
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Dimmer + spotlight. When a rect exists we cut a hole with a huge
          box-shadow; otherwise a flat scrim. Clicking the scrim advances. */}
      {rect ? (
        <div
          onClick={() => advance(1)}
          className="absolute rounded-md transition-all duration-200 pointer-events-auto"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.55)',
            outline: '2px solid var(--mh-status-primary, #00928F)',
            outlineOffset: 2,
          }}
        />
      ) : (
        <div onClick={() => advance(1)} className="absolute inset-0 bg-[#111827]/55" />
      )}

      {/* Coaching card. */}
      <div
        ref={cardRef}
        style={cardStyle}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-grey-200 dark:border-[var(--mh-border)] rounded-xl shadow-2xl p-5 pointer-events-auto"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wide text-grey-500 font-mono">
            Guided tour · {step + 1} / {steps.length}
          </span>
          <button onClick={finish} className="text-[11px] text-grey-500 hover:underline">Skip</button>
        </div>
        <h3 className="text-sm font-bold mb-1 text-[#3D5265] dark:text-[var(--mh-fg)]">{current.title}</h3>
        <div className="text-[13px] leading-relaxed text-[#3D5265]/80 dark:text-[var(--mh-fg)]/80">
          {current.body}
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-[#00928F]' : 'w-1.5 bg-grey-300'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          {step > 0 && (
            <button
              onClick={() => advance(-1)}
              className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)]"
            >
              Back
            </button>
          )}
          <button
            onClick={() => advance(1)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#00928F] text-white hover:bg-[#006F6C]"
          >
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
