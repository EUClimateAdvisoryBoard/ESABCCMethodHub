/**
 * Body for the "Custom" project-workspace module kind.
 * ----------------------------------------------------
 * A persisted scratchpad — markdown-friendly textarea on the left, live
 * preview on the right. Stored per (project, module) in
 * `pw_custom_module_content` via /api/project-workspace/custom-module-content.
 *
 * Until the user opens a richer purpose-built module, this gives every "+ Add
 * module → Custom" a real surface to write into instead of the previous
 * "wire up your own content here" placeholder.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { pwApi } from '@/lib/project-workspace/client';

interface Props {
  projectId: string;
  moduleId: string;
  moduleName: string;
  initialContent: string;
}

export default function CustomNotesModule({
  projectId,
  moduleId,
  moduleName,
  initialContent,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialContent ? new Date() : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave after 800 ms of inactivity, so the user does not have to think
  // about saving but also so we don't hammer the API on every keystroke.
  useEffect(() => {
    if (content === saved) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        await pwApi.saveCustomContent(projectId, moduleId, content);
        setSaved(content);
        setLastSavedAt(new Date());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, saved, projectId, moduleId]);

  const preview = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className="space-y-3">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">{moduleName}</h2>
          <p className="text-xs text-tertiary mt-1 max-w-2xl">
            Free-form notes for this module. Supports basic Markdown
            (<code>#</code> headings, <code>**bold**</code>, <code>-</code> lists,
            <code>[links](url)</code>). Saved automatically.
          </p>
        </div>
        <p className="text-[11px] text-tertiary-light">
          {busy
            ? 'Saving…'
            : error
              ? <span className="text-red-700">Save failed: {error}</span>
              : lastSavedAt
                ? `Saved · ${lastSavedAt.toLocaleTimeString()}`
                : 'Unsaved'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start typing your notes…"
          spellCheck
          className="w-full min-h-[420px] px-3 py-2 border border-grey-200 rounded text-sm font-mono leading-relaxed bg-white focus:outline-none focus:border-primary"
        />
        <div
          className="min-h-[420px] px-4 py-3 bg-white border border-grey-200 rounded text-sm leading-relaxed prose-pw"
          aria-label="Preview"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    </div>
  );
}

/** Tiny, deliberately limited Markdown→HTML for the preview pane. */
function renderMarkdown(src: string): string {
  if (!src.trim()) {
    return '<p class="text-tertiary-light italic">Preview will appear here.</p>';
  }
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const lines = src.split('\n');
  const out: string[] = [];
  let inList = false;
  let inOl = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      out.push('');
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(escape(h[2]))}</h${lvl}>`);
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(escape(ul[1]))}</li>`);
      continue;
    }
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inline(escape(ol[1]))}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
    out.push(`<p>${inline(escape(line))}</p>`);
  }
  if (inList) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
}

function inline(s: string): string {
  // bold, italic, code, links — applied to already-escaped text.
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
}
