'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Rich "summary deck" — viewer + editor for whole-document content-analysis
// summaries. A deck is an ordered list of slides:
//   • text       — a free-text note,
//   • diagram     — a SmartArt-style flowchart (process / list / cycle /
//                   hierarchy), rendered with plain CSS (no dependency),
//   • image       — a screenshot (data-URL), the heavy payload that makes the
//                   lazy-load worthwhile.
//
// Turning the previously text-only summary into a little interactive
// presentation: analysts can sketch a flow, drop in a screenshot of a chart,
// and annotate it — instead of staring at a wall of text.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type {
  SummaryBlock,
  SummaryDiagramBlock,
  SummaryDiagramLayout,
  SummaryImageBlock,
  SummaryMermaidBlock,
  SummaryTextBlock,
} from '@/lib/content-analysis/types';

/** Soft cap mirrored from the API (8 MB of base64 per screenshot). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const LAYOUT_LABELS: Record<SummaryDiagramLayout, string> = {
  process: 'Process →',
  list: 'List',
  cycle: 'Cycle ↻',
  hierarchy: 'Hierarchy',
};

function newBlockId(): string {
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Diagram renderer (shared by viewer + editor preview) ─────────────────────

/** A single SmartArt-style node box. */
function DiagramBox({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div
      className={`px-2.5 py-1.5 rounded-md border text-[11px] leading-snug text-center max-w-[180px] ${
        muted
          ? 'border-dashed border-grey-300 text-tertiary-light bg-white'
          : 'border-secondary/40 bg-secondary/10 text-tertiary-dark'
      }`}
    >
      {text || <span className="italic text-tertiary-light">(empty)</span>}
    </div>
  );
}

export function SummaryDiagram({ block }: { block: SummaryDiagramBlock }) {
  const nodes = block.nodes;
  const body = (() => {
    if (nodes.length === 0) {
      return <p className="text-[11px] italic text-tertiary-light">No steps yet.</p>;
    }
    switch (block.layout) {
      case 'list':
        return (
          <ol className="space-y-1.5 w-full">
            {nodes.map((n, i) => (
              <li key={n.id} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1"><DiagramBox text={n.text} /></div>
              </li>
            ))}
          </ol>
        );
      case 'hierarchy': {
        const [root, ...children] = nodes;
        return (
          <div className="flex flex-col items-center gap-0 w-full">
            <DiagramBox text={root.text} />
            {children.length > 0 && (
              <>
                <div className="w-px h-3 bg-grey-300" aria-hidden />
                <div className="flex flex-wrap items-start justify-center gap-2 pt-0.5 border-t border-grey-200 w-full">
                  {children.map(c => (
                    <DiagramBox key={c.id} text={c.text} />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }
      case 'cycle':
      case 'process':
      default:
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {nodes.map((n, i) => (
              <div key={n.id} className="flex items-center gap-1.5">
                <DiagramBox text={n.text} />
                {i < nodes.length - 1 && <span className="text-secondary text-sm" aria-hidden>→</span>}
              </div>
            ))}
            {block.layout === 'cycle' && nodes.length > 1 && (
              <span className="text-[10px] text-tertiary-light italic ml-1">↻ back to start</span>
            )}
          </div>
        );
    }
  })();

  return (
    <figure className="rounded-md border border-grey-200 bg-grey-50/60 p-2.5">
      {block.title && (
        <figcaption className="text-[11px] font-semibold text-tertiary-dark mb-2">{block.title}</figcaption>
      )}
      {body}
    </figure>
  );
}

// ── Mermaid renderer (shared by viewer + editor preview) ─────────────────────

/** Renders Mermaid source to SVG. Mermaid is heavy and browser-only, so it's
 *  imported lazily inside the effect (kept out of the main bundle / off the
 *  server) and rendered with securityLevel 'strict'. */
function MermaidRender({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mmd-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    const src = code.trim();
    if (!src) { setSvg(''); setError(null); return; }
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          fontFamily: 'inherit',
        });
        const { svg } = await mermaid.render(idRef.current, src);
        if (!cancelled) { setSvg(svg); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-2">
        <p className="text-[10px] font-semibold text-red-700 mb-1">Diagram error</p>
        <p className="text-[10px] text-red-600">{error}</p>
      </div>
    );
  }
  if (!svg) {
    return <p className="text-[10px] text-tertiary-light italic">Rendering diagram…</p>;
  }
  return (
    <div
      className="flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function SummaryMermaid({ block }: { block: SummaryMermaidBlock }) {
  return (
    <figure className="rounded-md border border-grey-200 bg-grey-50/60 p-2.5">
      {block.title && (
        <figcaption className="text-[11px] font-semibold text-tertiary-dark mb-2">{block.title}</figcaption>
      )}
      <MermaidRender code={block.code} />
    </figure>
  );
}

// ── Viewer ───────────────────────────────────────────────────────────────────

function ViewerBlock({ block }: { block: SummaryBlock }) {
  if (block.kind === 'text') {
    return (
      <p className="text-[12px] text-tertiary-dark whitespace-pre-wrap leading-snug">{block.text}</p>
    );
  }
  if (block.kind === 'mermaid') {
    return <SummaryMermaid block={block} />;
  }
  if (block.kind === 'image') {
    return (
      <figure className="space-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.src}
          alt={block.alt || block.caption || 'Summary screenshot'}
          className="max-w-full rounded-md border border-grey-200"
        />
        {block.caption && (
          <figcaption className="text-[10px] text-tertiary-light">{block.caption}</figcaption>
        )}
      </figure>
    );
  }
  return <SummaryDiagram block={block} />;
}

/** Read-only render of a deck. */
export function SummaryDeckViewer({ blocks }: { blocks: SummaryBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-3">
      {blocks.map(b => (
        <div key={b.id}>
          <ViewerBlock block={b} />
        </div>
      ))}
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Per-block editor card. */
function EditorBlock({
  block,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: {
  block: SummaryBlock;
  index: number;
  total: number;
  onChange: (b: SummaryBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const label =
    block.kind === 'text'
      ? 'Text'
      : block.kind === 'image'
        ? 'Screenshot'
        : block.kind === 'mermaid'
          ? 'Flowchart'
          : 'Diagram (legacy)';

  return (
    <div className="rounded-md border border-grey-200 bg-white p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-tertiary-light">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="px-1 text-tertiary-light hover:text-tertiary disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="px-1 text-tertiary-light hover:text-tertiary disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-1 text-tertiary-light hover:text-red-700"
            title="Remove slide"
          >
            ✕
          </button>
        </div>
      </div>

      {block.kind === 'text' && (
        <textarea
          value={block.text}
          onChange={e => onChange({ ...block, text: e.target.value } as SummaryTextBlock)}
          rows={3}
          placeholder="Write a note…"
          className="w-full px-2 py-1.5 border border-grey-200 rounded text-[12px] leading-snug resize-y"
        />
      )}

      {block.kind === 'image' && (
        <ImageBlockEditor block={block} onChange={onChange} />
      )}

      {block.kind === 'diagram' && (
        <DiagramBlockEditor block={block} onChange={onChange} />
      )}

      {block.kind === 'mermaid' && (
        <MermaidBlockEditor block={block} onChange={onChange} />
      )}
    </div>
  );
}

function MermaidBlockEditor({
  block,
  onChange,
}: {
  block: SummaryMermaidBlock;
  onChange: (b: SummaryBlock) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title ?? ''}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Diagram title (optional)"
        className="w-full px-2 py-1 border border-grey-200 rounded text-[11px] font-semibold"
      />
      <textarea
        value={block.code}
        onChange={e => onChange({ ...block, code: e.target.value })}
        rows={6}
        spellCheck={false}
        placeholder={'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Stop]'}
        className="w-full px-2 py-1.5 border border-grey-200 rounded text-[11px] leading-snug resize-y font-mono"
      />
      <p className="text-[9px] text-tertiary-light">
        Write{' '}
        <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="text-secondary hover:underline">
          Mermaid
        </a>{' '}
        syntax — flowcharts, sequence diagrams, and more.
      </p>
      {block.code.trim() && (
        <div className="pt-2 border-t border-grey-100">
          <p className="text-[9px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">Preview</p>
          <MermaidRender code={block.code} />
        </div>
      )}
    </div>
  );
}

function ImageBlockEditor({
  block,
  onChange,
}: {
  block: SummaryImageBlock;
  onChange: (b: SummaryBlock) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Not an image file.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > MAX_IMAGE_BYTES) {
      setError('Image is too large (max ~6 MB). Try a smaller screenshot.');
      return;
    }
    setError(null);
    onChange({ ...block, src: dataUrl });
  };

  return (
    <div
      className="space-y-2"
      onPaste={e => {
        const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
        if (item) {
          e.preventDefault();
          void ingest(item.getAsFile());
        }
      }}
    >
      {block.src ? (
        <div className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt || 'screenshot'} className="max-w-full rounded border border-grey-200" />
          <button
            type="button"
            onClick={() => onChange({ ...block, src: '' })}
            className="text-[10px] text-tertiary-light hover:text-red-700"
          >
            Replace image
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 border border-dashed border-grey-300 rounded text-[11px] text-tertiary-light hover:border-secondary hover:text-secondary transition"
        >
          Click to upload — or paste a screenshot here
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => void ingest(e.target.files?.[0])}
      />
      <input
        type="text"
        value={block.caption ?? ''}
        onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full px-2 py-1 border border-grey-200 rounded text-[11px]"
      />
      {error && <p className="text-[10px] text-red-700">{error}</p>}
    </div>
  );
}

function DiagramBlockEditor({
  block,
  onChange,
}: {
  block: SummaryDiagramBlock;
  onChange: (b: SummaryBlock) => void;
}) {
  const setNodeText = (id: string, text: string) =>
    onChange({ ...block, nodes: block.nodes.map(n => (n.id === id ? { ...n, text } : n)) });
  const addNode = () =>
    onChange({ ...block, nodes: [...block.nodes, { id: newBlockId(), text: '' }] });
  const removeNode = (id: string) =>
    onChange({ ...block, nodes: block.nodes.filter(n => n.id !== id) });
  const moveNode = (idx: number, dir: -1 | 1) => {
    const next = [...block.nodes];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ ...block, nodes: next });
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title ?? ''}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Diagram title (optional)"
        className="w-full px-2 py-1 border border-grey-200 rounded text-[11px] font-semibold"
      />
      <div className="flex flex-wrap gap-1">
        {(Object.keys(LAYOUT_LABELS) as SummaryDiagramLayout[]).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => onChange({ ...block, layout: l })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
              block.layout === l
                ? 'bg-secondary text-white border-secondary'
                : 'border-grey-200 text-tertiary hover:border-secondary'
            }`}
          >
            {LAYOUT_LABELS[l]}
          </button>
        ))}
      </div>
      {block.layout === 'hierarchy' && (
        <p className="text-[9px] text-tertiary-light italic">
          First step is the top node; the rest become its branches.
        </p>
      )}
      <div className="space-y-1">
        {block.nodes.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1">
            <span className="text-[10px] text-tertiary-light w-4 text-right">{i + 1}.</span>
            <input
              type="text"
              value={n.text}
              onChange={e => setNodeText(n.id, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className="flex-1 px-2 py-1 border border-grey-200 rounded text-[11px]"
            />
            <button type="button" onClick={() => moveNode(i, -1)} disabled={i === 0} className="px-1 text-tertiary-light hover:text-tertiary disabled:opacity-30" title="Move up">↑</button>
            <button type="button" onClick={() => moveNode(i, 1)} disabled={i === block.nodes.length - 1} className="px-1 text-tertiary-light hover:text-tertiary disabled:opacity-30" title="Move down">↓</button>
            <button type="button" onClick={() => removeNode(n.id)} className="px-1 text-tertiary-light hover:text-red-700" title="Remove step">✕</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addNode}
        className="text-[11px] text-secondary hover:underline"
      >
        + Add step
      </button>
      {block.nodes.length > 0 && (
        <div className="pt-2 border-t border-grey-100">
          <p className="text-[9px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">Preview</p>
          <SummaryDiagram block={block} />
        </div>
      )}
    </div>
  );
}

/**
 * Full deck editor: a lead-text field plus an ordered, reorderable list of
 * slides (text / flowchart / screenshot). Local working copy is owned by the
 * parent panel; this component just renders the controls.
 */
export function SummaryDeckEditor({
  blocks,
  onChange,
}: {
  blocks: SummaryBlock[];
  onChange: (next: SummaryBlock[]) => void;
}) {
  const updateAt = (index: number, b: SummaryBlock) =>
    onChange(blocks.map((x, i) => (i === index ? b : x)));
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  const add = (kind: SummaryBlock['kind']) => {
    const base = { id: newBlockId() };
    const block: SummaryBlock =
      kind === 'text'
        ? { ...base, kind: 'text', text: '' }
        : kind === 'image'
          ? { ...base, kind: 'image', src: '', caption: '' }
          : kind === 'mermaid'
            ? { ...base, kind: 'mermaid', title: '', code: 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Stop]' }
            : { ...base, kind: 'diagram', layout: 'process', title: '', nodes: [{ id: newBlockId(), text: '' }] };
    onChange([...blocks, block]);
  };

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => (
        <EditorBlock
          key={b.id}
          block={b}
          index={i}
          total={blocks.length}
          onChange={nb => updateAt(i, nb)}
          onMove={dir => move(i, dir)}
          onDelete={() => remove(i)}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] text-tertiary-light">Add slide:</span>
        <button type="button" onClick={() => add('text')} className="px-2 py-0.5 rounded border border-grey-200 text-[11px] text-tertiary hover:border-secondary hover:text-secondary transition">+ Text</button>
        <button type="button" onClick={() => add('mermaid')} className="px-2 py-0.5 rounded border border-grey-200 text-[11px] text-tertiary hover:border-secondary hover:text-secondary transition">+ Flowchart</button>
        <button type="button" onClick={() => add('image')} className="px-2 py-0.5 rounded border border-grey-200 text-[11px] text-tertiary hover:border-secondary hover:text-secondary transition">+ Screenshot</button>
      </div>
    </div>
  );
}
