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
import DownloadMenu from './DownloadMenu';
import CollaborationPanel from './CollaborationPanel';
import type { DocBlock } from '@/lib/exports';

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
            A free-form space to write. Type on the left and see it formatted on
            the right. For a heading start a line with <code>#</code>, wrap text
            in <code>**stars**</code> for <strong>bold</strong>, and begin a line
            with <code>-</code> for a bullet list. Everything saves on its own.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-tertiary-light">
            {busy
              ? 'Saving…'
              : error
                ? <span className="text-red-700">Save failed: {error}</span>
                : lastSavedAt
                  ? `Saved · ${lastSavedAt.toLocaleTimeString()}`
                  : 'Unsaved'}
          </p>
          <DownloadMenu
            filename={moduleName.toLowerCase().replace(/\s+/g, '-') || 'notes'}
            text={{ getBlocks: () => markdownToDocBlocks(moduleName, content) }}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-tertiary-light mb-1">
            Write
          </span>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start typing your notes…"
            spellCheck
            className="w-full min-h-[420px] px-3 py-2 border border-grey-200 rounded text-sm font-mono leading-relaxed bg-white focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-tertiary-light mb-1">
            Preview
          </span>
          <div
            className="min-h-[420px] px-4 py-3 bg-white border border-grey-200 rounded text-sm leading-relaxed prose-pw"
            aria-label="Preview"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-grey-200 p-4">
        <CollaborationPanel
          projectId={projectId}
          target={{ kind: 'module', id: moduleId }}
          heading={`Review & discussion — ${moduleName}`}
        />
      </div>
    </div>
  );
}

/** Convert the scratchpad's light Markdown into Word document blocks. */
function markdownToDocBlocks(title: string, src: string): DocBlock[] {
  const blocks: DocBlock[] = [{ type: 'heading', level: 1, text: title || 'Notes' }];
  const lines = src.split('\n');
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length > 0) {
      blocks.push({ type: 'bullets', items: bullets });
      bullets = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const lvl = Math.min(h[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level: lvl, text: stripInline(h[2]) });
      continue;
    }
    const li = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      bullets.push(stripInline(li[1]));
      continue;
    }
    flush();
    blocks.push({ type: 'paragraph', text: stripInline(line) });
  }
  flush();
  return blocks;
}

/** Strip the lightweight Markdown markers so Word shows clean text. */
function stripInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
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
