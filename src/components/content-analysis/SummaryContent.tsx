'use client';

// ---------------------------------------------------------------------------
// Renders a workspace summary: lightweight markdown plus fenced ```mermaid
// blocks rendered as diagrams. Mermaid is heavy and browser-only, so it's
// dynamically imported inside the diagram component (kept out of the main
// bundle and off the server).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';

interface Part {
  type: 'md' | 'mermaid';
  content: string;
}

/** Split the source into markdown and ```mermaid``` fenced segments. */
function splitParts(src: string): Part[] {
  const parts: Part[] = [];
  const re = /```mermaid[ \t]*\r?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ type: 'md', content: src.slice(last, m.index) });
    parts.push({ type: 'mermaid', content: m[1].trim() });
    last = re.lastIndex;
  }
  if (last < src.length) parts.push({ type: 'md', content: src.slice(last) });
  return parts;
}

export default function SummaryContent({
  markdown,
  className = 'text-[12px] text-tertiary-dark leading-snug',
}: {
  markdown: string;
  className?: string;
}) {
  const parts = splitParts(markdown);
  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.type === 'mermaid' ? (
          <MermaidDiagram key={i} code={p.content} />
        ) : p.content.trim() ? (
          <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
        ) : null,
      )}
    </div>
  );
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mmd-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          fontFamily: 'inherit',
        });
        const { svg } = await mermaid.render(idRef.current, code);
        if (!cancelled) { setSvg(svg); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="my-2 rounded border border-red-200 bg-red-50 p-2">
        <p className="text-[10px] font-semibold text-red-700 mb-1">Diagram error</p>
        <pre className="text-[10px] text-tertiary-dark whitespace-pre-wrap overflow-x-auto">{code}</pre>
        <p className="text-[10px] text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return <div className="my-2 text-[10px] text-tertiary-light italic">Rendering diagram…</div>;
  }

  return (
    <div
      className="my-2 flex justify-center overflow-x-auto rounded border border-grey-200 bg-white p-2 [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
