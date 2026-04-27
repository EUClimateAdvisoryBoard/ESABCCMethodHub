'use client';

// ---------------------------------------------------------------------------
// ToastHost — typed toast system with the system-status taxonomy.
//
// Five tones, one meaning each:
//   primary   — primary-action confirmations (e.g. "Imported · Undo")
//   info      — neutral info ("Synced 12 s ago")
//   success   — completion ("Exported FF55-baseline.png")
//   warning   — partial / soft-failure ("3 of 12 imports skipped")
//   danger    — destructive errors ("Couldn't reach Crossref")
//
// Use:
//   import { showToast } from '@/components/ui/ToastHost';
//   showToast({ tone: 'success', message: 'Exported FF55-baseline.png' });
//   showToast({
//     tone: 'primary',
//     message: 'Moved Just Transition under Carbon Pricing',
//     actionLabel: 'Undo',
//     onAction: () => moveBack(),
//     timeoutMs: 15000,
//   });
//
// Back-compat: keeps listening for the legacy `mh:undo` event so the
// existing showUndoToast helper (UndoToastHost.tsx) keeps working with
// the new visual language. Both can coexist; new code should call
// showToast() directly.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from 'react';

export type ToastTone = 'primary' | 'info' | 'success' | 'warning' | 'danger';

export type ToastDetail = {
  id?: string;
  tone?: ToastTone;
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  timeoutMs?: number;
};

type Toast = ToastDetail & { id: string; tone: ToastTone };

const TONE_CLASS: Record<ToastTone, string> = {
  primary: 'border-[var(--mh-status-primary)]',
  info:    'border-[var(--mh-status-info)]',
  success: 'border-[var(--mh-status-success)]',
  warning: 'border-[var(--mh-status-warning)]',
  danger:  'border-[var(--mh-status-danger)]',
};

const TONE_DOT: Record<ToastTone, string> = {
  primary: 'bg-[var(--mh-status-primary)]',
  info:    'bg-[var(--mh-status-info)]',
  success: 'bg-[var(--mh-status-success)]',
  warning: 'bg-[var(--mh-status-warning)]',
  danger:  'bg-[var(--mh-status-danger)]',
};

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const push = useCallback((detail: ToastDetail) => {
    if (!detail || typeof detail.message !== 'string') return;
    const id = detail.id || newId();
    const tone: ToastTone = detail.tone ?? 'primary';
    const timeoutMs = detail.timeoutMs ?? (tone === 'danger' ? 9000 : 5000);
    setToasts(ts => [...ts, { ...detail, id, tone }]);
    if (timeoutMs > 0) setTimeout(() => dismiss(id), timeoutMs);
  }, [dismiss]);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (detail) push(detail);
    }
    // Back-compat with the legacy UndoToastHost event shape:
    //   { message, onUndo, timeoutMs }
    function onLegacyUndo(e: Event) {
      const d = (e as CustomEvent<{ message: string; onUndo: () => void; timeoutMs?: number }>).detail;
      if (!d || typeof d.message !== 'string' || typeof d.onUndo !== 'function') return;
      push({
        tone: 'primary',
        message: d.message,
        actionLabel: 'Undo',
        onAction: d.onUndo,
        timeoutMs: d.timeoutMs ?? 15000,
      });
    }
    window.addEventListener('mh:toast', onToast as EventListener);
    window.addEventListener('mh:undo', onLegacyUndo as EventListener);
    return () => {
      window.removeEventListener('mh:toast', onToast as EventListener);
      window.removeEventListener('mh:undo', onLegacyUndo as EventListener);
    };
  }, [push]);

  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 pointer-events-none max-w-[min(92vw,420px)]"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.tone === 'danger' ? 'alert' : 'status'}
          className={`pointer-events-auto bg-[var(--mh-card)] text-[var(--mh-fg)] rounded-lg shadow-lg border-l-4 border-y border-r border-[var(--mh-border)] ${TONE_CLASS[t.tone]} px-4 py-3 flex items-start gap-3`}
          style={{ boxShadow: 'var(--mh-shadow-lg)' }}
        >
          <span aria-hidden="true" className={`mt-1.5 inline-block h-2 w-2 rounded-full ${TONE_DOT[t.tone]}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium" style={{ fontSize: 'var(--mh-text-sm)', lineHeight: 'var(--mh-leading-snug)' }}>
              {t.message}
            </p>
            {t.description ? (
              <p className="text-[var(--mh-muted)] mt-0.5" style={{ fontSize: 'var(--mh-text-xs)', lineHeight: 'var(--mh-leading-base)' }}>
                {t.description}
              </p>
            ) : null}
          </div>
          {t.actionLabel && t.onAction ? (
            <button
              type="button"
              onClick={async () => { await t.onAction!(); dismiss(t.id); }}
              className="mh-focus mh-motion-fast text-[var(--mh-status-primary)] font-semibold whitespace-nowrap"
              style={{ fontSize: 'var(--mh-text-sm)' }}
            >
              {t.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="mh-focus mh-motion-fast text-[var(--mh-muted)] hover:text-[var(--mh-fg)]"
            style={{ fontSize: 'var(--mh-text-md)', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function showToast(detail: ToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mh:toast', { detail }));
}
