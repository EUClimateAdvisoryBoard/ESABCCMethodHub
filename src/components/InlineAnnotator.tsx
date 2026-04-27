'use client';
/**
 * Inline annotator for any text view (#17).
 *
 * Wrap any block of plain text with `<InlineAnnotator hostKind="news"
 * hostId="abc">…</InlineAnnotator>` and users can:
 *   - select a phrase → a small floating pill offers "Annotate"
 *   - click the pill → modal asks for an optional note
 *   - the highlight + note persist in `text_annotations` and re-render
 *     on next visit
 */
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

type HostKind = 'news' | 'policy_article' | 'reference_abstract';

interface Annotation {
  id: string;
  selected: string;
  note: string;
  offset_hint: number;
  created_at: string;
}

interface Props {
  hostKind: HostKind;
  hostId: string;
  /** Workspace to associate the annotation with (optional). */
  workspaceId?: string;
  children: ReactNode;
}

export default function InlineAnnotator({ hostKind, hostId, workspaceId, children }: Props) {
  const { user, session } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pill, setPill] = useState<{ x: number; y: number; selected: string } | null>(null);
  const [composing, setComposing] = useState<{ selected: string; note: string } | null>(null);

  const reload = useCallback(async () => {
    const url = `/api/text-annotations?host_kind=${hostKind}&host_id=${encodeURIComponent(hostId)}`;
    const headers: Record<string, string> = {};
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return;
    const data = await res.json();
    setAnnotations(data.items || []);
  }, [hostKind, hostId, session?.access_token]);

  useEffect(() => { reload(); }, [reload]);

  const onMouseUp = useCallback(() => {
    if (!user) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setPill(null); return; }
    const text = sel.toString().trim();
    if (text.length < 4 || text.length > 500) { setPill(null); return; }
    if (!containerRef.current?.contains(sel.anchorNode)) { setPill(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPill({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 6, selected: text });
  }, [user]);

  async function save() {
    if (!composing || !session?.access_token) return;
    await fetch('/api/text-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        host_kind: hostKind, host_id: hostId,
        selected: composing.selected, note: composing.note,
        workspace_id: workspaceId,
      }),
    });
    setComposing(null);
    reload();
  }

  return (
    <>
      <div ref={containerRef} onMouseUp={onMouseUp}>
        {children}
        {annotations.length > 0 && (
          <div className="mt-3 border-t border-grey-100 dark:border-[var(--mh-border)] pt-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-grey-500">Annotations ({annotations.length})</p>
            {annotations.map(a => (
              <div key={a.id} className="text-xs">
                <p className="bg-yellow-100/70 dark:bg-yellow-900/30 rounded px-1 inline-block">&ldquo;{a.selected}&rdquo;</p>
                {a.note && <p className="text-tertiary dark:text-[var(--mh-fg)]/80 mt-0.5 ml-1">{a.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {pill && (
        <button
          onClick={() => { setComposing({ selected: pill.selected, note: '' }); setPill(null); window.getSelection()?.removeAllRanges(); }}
          style={{ position: 'absolute', top: pill.y, left: pill.x }}
          className="z-50 bg-secondary text-white text-[11px] px-2 py-1 rounded shadow"
        >
          Annotate
        </button>
      )}
      {composing && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40" onClick={() => setComposing(null)}>
          <div className="w-[min(420px,92vw)] bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] rounded-xl shadow-2xl border border-grey-200 dark:border-[var(--mh-border)] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[11px] uppercase tracking-wide text-grey-500 mb-1">Annotation</p>
            <p className="text-sm bg-yellow-100/70 dark:bg-yellow-900/30 rounded px-2 py-1.5 mb-3">&ldquo;{composing.selected}&rdquo;</p>
            <textarea
              value={composing.note}
              onChange={e => setComposing(c => c && { ...c, note: e.target.value })}
              placeholder="Optional note (e.g. conflicts with Art 5(3) ESR)"
              rows={4}
              className="w-full border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setComposing(null)} className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)]">Cancel</button>
              <button onClick={save} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-secondary text-white">Save annotation</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
