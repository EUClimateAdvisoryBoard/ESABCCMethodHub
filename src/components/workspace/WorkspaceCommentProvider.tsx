/**
 * Right-click-to-comment for the whole Project Workspace.
 * -------------------------------------------------------
 * Wrap any part of a project in <WorkspaceCommentProvider projectId> and
 * every descendant tagged as a comment target becomes discussable:
 *
 *   • Right-click the region  → a small "Comment" context menu opens.
 *   • Click an inline marker  → the same thread opens.
 *
 * Tag a region either declaratively, by spreading `commentTarget(kind, id,
 * label)` onto any element (works on server-rendered markup too)…
 *
 *   <header {...commentTarget('project', project.id, project.name)}>…
 *
 * …or visibly, by dropping a <CommentMarker kind id label /> badge, which
 * also shows the live comment count.
 *
 * Threads themselves reuse <WorkspaceComments>, so @-mentions, replies,
 * resolve and DB persistence all come for free. The provider fetches the
 * project's comments once to seed per-target counts, then keeps them in
 * sync as threads are opened and posted to.
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { pwApi } from '@/lib/project-workspace/client';
import WorkspaceComments from './WorkspaceComments';

export interface CommentTarget {
  kind: string;
  id: string;
}

/** Stable key for the per-target count map. */
function keyOf(kind: string, id: string) {
  return `${kind}:${id}`;
}

/**
 * Spread onto any element to make it right-clickable for comments. The
 * data-attributes are read by the provider's context-menu handler, so this
 * works on server-rendered elements that can't take React props/hooks.
 */
export function commentTarget(kind: string, id: string, label: string) {
  return {
    'data-comment-kind': kind,
    'data-comment-id': id,
    'data-comment-label': label,
  } as const;
}

interface Ctx {
  projectId: string;
  counts: Record<string, number>;
  open: (target: CommentTarget, label: string) => void;
}

const WorkspaceCommentContext = createContext<Ctx | null>(null);

export function useWorkspaceComments() {
  return useContext(WorkspaceCommentContext);
}

interface MenuState {
  x: number;
  y: number;
  target: CommentTarget;
  label: string;
}

interface PanelState {
  target: CommentTarget;
  label: string;
  /** Anchor point the panel opens from (clamped into the viewport). */
  x: number;
  y: number;
}

export default function WorkspaceCommentProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  // Seed per-target counts from a single project-wide fetch.
  useEffect(() => {
    let live = true;
    pwApi.listComments(projectId).then(list => {
      if (!live) return;
      const next: Record<string, number> = {};
      for (const c of list) next[keyOf(c.targetKind, c.targetId)] = (next[keyOf(c.targetKind, c.targetId)] ?? 0) + 1;
      setCounts(next);
    });
    return () => {
      live = false;
    };
  }, [projectId]);

  const openFrom = useCallback((target: CommentTarget, label: string, x: number, y: number) => {
    setMenu(null);
    // Clamp so the ~360px panel stays on screen.
    const px = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 380);
    const py = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 200);
    setPanel({ target, label, x: Math.max(8, px), y: Math.max(8, py) });
  }, []);

  const open = useCallback(
    (target: CommentTarget, label: string) => {
      const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
      const cy = typeof window !== 'undefined' ? window.innerHeight / 3 : 200;
      openFrom(target, label, cx, cy);
    },
    [openFrom]
  );

  function onContextMenu(e: React.MouseEvent) {
    const el = (e.target as HTMLElement | null)?.closest('[data-comment-id]') as HTMLElement | null;
    if (!el) return; // not a comment target — let the browser's own menu show
    const kind = el.getAttribute('data-comment-kind');
    const id = el.getAttribute('data-comment-id');
    if (!kind || !id) return;
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      target: { kind, id },
      label: el.getAttribute('data-comment-label') || 'this item',
    });
  }

  // Dismiss the context menu on any outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const ctx = useMemo<Ctx>(() => ({ projectId, counts, open }), [projectId, counts, open]);

  return (
    <WorkspaceCommentContext.Provider value={ctx}>
      <div onContextMenu={onContextMenu}>{children}</div>

      {menu && (
        <div
          className="fixed z-[60] min-w-[180px] rounded-lg border border-grey-200 bg-white shadow-xl py-1"
          style={{ left: menu.x, top: menu.y }}
          onClick={e => e.stopPropagation()}
          role="menu"
        >
          <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wide text-tertiary-light truncate">
            {menu.label}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => openFrom(menu.target, menu.label, menu.x, menu.y)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-tertiary-dark hover:bg-primary/10 hover:text-primary"
          >
            <SpeechIcon className="w-3.5 h-3.5 shrink-0" />
            {counts[keyOf(menu.target.kind, menu.target.id)]
              ? `View comments (${counts[keyOf(menu.target.kind, menu.target.id)]})`
              : 'Add a comment'}
          </button>
        </div>
      )}

      {panel && (
        <CommentPanel
          projectId={projectId}
          panel={panel}
          onClose={() => setPanel(null)}
          onCountChange={n =>
            setCounts(prev => ({ ...prev, [keyOf(panel.target.kind, panel.target.id)]: n }))
          }
        />
      )}
    </WorkspaceCommentContext.Provider>
  );
}

function CommentPanel({
  projectId,
  panel,
  onClose,
  onCountChange,
}: {
  projectId: string;
  panel: PanelState;
  onClose: () => void;
  onCountChange: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // Defer so the opening click doesn't immediately close the panel.
    const t = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[61] w-[360px] max-w-[92vw] max-h-[70vh] overflow-y-auto rounded-xl border border-grey-200 bg-white shadow-2xl p-4"
      style={{ left: panel.x, top: panel.y }}
      role="dialog"
      aria-label={`Comments on ${panel.label}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light">Comments on</p>
          <p className="text-sm font-bold text-tertiary-dark truncate">{panel.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 text-tertiary hover:text-tertiary-dark rounded p-1 -mt-1 -mr-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <WorkspaceComments
        projectId={projectId}
        target={panel.target}
        title="Discussion"
        compact
        onCountChange={onCountChange}
      />
    </div>
  );
}

/**
 * Visible comment affordance. Shows a speech-bubble icon and, when the
 * target has any comments, a count. Clicking opens the thread — the same
 * one the right-click menu reaches.
 */
export function CommentMarker({
  kind,
  id,
  label,
  className = '',
}: {
  kind: string;
  id: string;
  label: string;
  className?: string;
}) {
  const ctx = useWorkspaceComments();
  if (!ctx) return null;
  const count = ctx.counts[keyOf(kind, id)] ?? 0;
  return (
    <button
      type="button"
      onClick={() => ctx.open({ kind, id }, label)}
      title={count ? `${count} comment${count === 1 ? '' : 's'} — click to view, or right-click the area` : 'Add a comment (or right-click the area)'}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        count
          ? 'border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20'
          : 'border-grey-200 text-tertiary hover:border-secondary/40 hover:text-secondary'
      } ${className}`}
    >
      <SpeechIcon className="w-3.5 h-3.5" />
      {count > 0 ? count : 'Comment'}
    </button>
  );
}

function SpeechIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
