'use client';
/**
 * Global keyboard shortcuts host + visible cheat sheet.
 *
 * Shortcuts are dispatched as `CustomEvent('mh:shortcut', { detail: action })`
 * so each module can opt in. The dispatcher only fires when:
 *   - shortcuts_enabled is true in the user's preferences
 *   - the focused element is not an input / textarea / contenteditable
 *
 * The cheat sheet opens on `?` (Shift+/) and lists every registered binding.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferences } from '@/lib/preferences-context';

type Binding = {
  combo: string;
  description: string;
  /** Either a navigation target … */
  href?: string;
  /** … or a custom-event name dispatched on window. */
  action?: string;
};

const BINDINGS: Binding[] = [
  { combo: '⌘K / Ctrl+K', description: 'Open the global command palette' },
  { combo: '?',           description: 'Show / hide this cheat sheet' },
  { combo: 'g h',         description: 'Go to home', href: '/' },
  { combo: 'g r',         description: 'Go to References (M·01)', href: '/references' },
  { combo: 'g d',         description: 'Go to Data & Scenarios (M·02)', href: '/scenarios' },
  { combo: 'g n',         description: 'Go to News (M·03)', href: '/news-feed' },
  { combo: 'g p',         description: 'Go to Policy Navigator (M·04)', href: '/policy-navigator' },
  { combo: 'g c',         description: 'Go to Content Analysis (M·05)', href: '/content-analysis' },
  { combo: 'g w',         description: 'Go to My Workbench', href: '/profile/workbench' },
  { combo: 'g i',         description: 'Go to Inbox', href: '/profile/inbox' },
  { combo: 'g s',         description: 'Go to Preferences', href: '/profile/preferences' },
  { combo: 'j',           description: 'Next item in list (where supported)', action: 'list:next' },
  { combo: 'k',           description: 'Previous item in list (where supported)', action: 'list:prev' },
  { combo: 's',           description: 'Save / bookmark current item', action: 'list:save' },
  { combo: 'r',           description: 'Add to reading list', action: 'list:reading-list' },
  { combo: 'a',           description: 'Annotate selection', action: 'list:annotate' },
  { combo: 'c',           description: 'Comment on current item', action: 'list:comment' },
  { combo: 'n',           description: 'New item in current module (where supported)', action: 'list:new' },
  { combo: 'esc',         description: 'Close drawer / palette / modal' },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function KeyboardShortcuts() {
  const { prefs } = usePreferences();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    if (!prefs.shortcuts_enabled) return;
    let gTimer: ReturnType<typeof setTimeout> | null = null;
    function dispatchAction(action: string) {
      window.dispatchEvent(new CustomEvent('mh:shortcut', { detail: action }));
    }
    function onKey(e: KeyboardEvent) {
      // Always allow `?` toggle, even if shortcut disabled would feel broken.
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault(); setOpen(o => !o); return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘K already handled by palette.

      if (pendingG) {
        const map: Record<string, string> = {
          h: '/', r: '/references', d: '/scenarios', n: '/news-feed',
          p: '/policy-navigator', c: '/content-analysis',
          w: '/profile/workbench', i: '/profile/inbox', s: '/profile/preferences',
        };
        const target = map[e.key.toLowerCase()];
        if (target) { e.preventDefault(); router.push(target); }
        setPendingG(false);
        if (gTimer) clearTimeout(gTimer);
        return;
      }
      if (e.key === 'g') {
        setPendingG(true);
        gTimer = setTimeout(() => setPendingG(false), 1200);
        return;
      }
      const single: Record<string, string> = {
        j: 'list:next', k: 'list:prev', s: 'list:save', r: 'list:reading-list',
        a: 'list:annotate', c: 'list:comment', n: 'list:new',
      };
      if (single[e.key]) { e.preventDefault(); dispatchAction(single[e.key]); return; }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [prefs.shortcuts_enabled, pendingG, open, router]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[min(560px,92vw)] max-h-[80vh] overflow-y-auto bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] rounded-xl shadow-2xl border border-grey-200 dark:border-[var(--mh-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey-100 dark:border-[var(--mh-border)]">
          <h2 className="text-base font-bold">Keyboard shortcuts</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-grey-500 hover:text-grey-900 dark:hover:text-white">✕</button>
        </div>
        <ul className="px-5 py-4 space-y-1.5 text-sm">
          {BINDINGS.map(b => (
            <li key={b.combo} className="flex items-baseline gap-3">
              <kbd className="text-[11px] font-semibold border border-grey-200 dark:border-[var(--mh-border)] rounded px-1.5 py-0.5 min-w-[88px] text-center">
                {b.combo}
              </kbd>
              <span className="text-grey-600 dark:text-grey-400">{b.description}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-grey-500 px-5 pb-4">
          Tip: shortcuts can be disabled per-user in <a href="/profile/preferences" className="underline">Preferences</a>.
        </p>
      </div>
    </div>
  );
}
