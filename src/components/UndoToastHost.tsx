'use client';

// ---------------------------------------------------------------------------
// Back-compat shim. The original UndoToastHost has been replaced by the
// typed ToastHost at src/components/ui/ToastHost.tsx, which listens to the
// same 'mh:undo' events. This file keeps the showUndoToast() helper alive
// so existing callers (e.g. profile/collections) don't need to change.
//
// Prefer showToast() from '@/components/ui/ToastHost' in new code.
// ---------------------------------------------------------------------------

type LegacyUndoToastDetail = {
  id?: string;
  message: string;
  onUndo: () => void | Promise<void>;
  timeoutMs?: number;
};

export function showUndoToast(detail: LegacyUndoToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mh:undo', { detail }));
}

// Default export kept as a no-op render so legacy `import UndoToastHost`
// callers don't crash if any still exist outside src/.
export default function UndoToastHost() {
  return null;
}
