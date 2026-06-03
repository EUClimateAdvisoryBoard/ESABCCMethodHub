// ---------------------------------------------------------------------------
// Lightweight, dependency-free Markdown → HTML for workspace prose surfaces
// (document summaries, custom notes). Deliberately limited: headings, bullet
// and numbered lists, bold / italic / inline code, links, and inline images
// (`![alt](url)`) so users can drop screenshots / figures into the text.
//
// Styling is inlined on each element so the output renders correctly wherever
// it's dropped, without depending on a global stylesheet (Tailwind's preflight
// strips default list/heading styles).
//
// Output is built from escaped text; only URLs matched by a strict
// `https?://…` pattern reach an attribute, so the rendered HTML is safe to
// inject with dangerouslySetInnerHTML.
// ---------------------------------------------------------------------------

const IMG_STYLE =
  'max-width:100%;height:auto;display:block;margin:8px 0;border:1px solid #E6E7E8;border-radius:6px';
const UL_STYLE = 'list-style:disc;padding-left:1.25rem;margin:4px 0';
const OL_STYLE = 'list-style:decimal;padding-left:1.25rem;margin:4px 0';
const H_STYLE = 'font-weight:600;margin:8px 0 4px';
const P_STYLE = 'margin:4px 0';
const CODE_STYLE = 'background:#F1F3F5;padding:1px 4px;border-radius:3px;font-size:0.9em';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Inline formatting applied to already-escaped text. Image before link, so
 *  `![alt](url)` isn't mis-parsed as a link. */
export function renderInlineMarkdown(s: string): string {
  return s
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
      `<img src="$2" alt="$1" style="${IMG_STYLE}" />`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, `<code style="${CODE_STYLE}">$1</code>`)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" style="color:#00928F;text-decoration:underline">$1</a>',
    );
}

export function renderMarkdown(src: string): string {
  if (!src.trim()) return '';
  const lines = src.split('\n');
  const out: string[] = [];
  let inList = false;
  let inOl = false;
  const closeLists = () => {
    if (inList) { out.push('</ul>'); inList = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) { closeLists(); continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeLists();
      const lvl = h[1].length;
      out.push(`<h${lvl} style="${H_STYLE}">${renderInlineMarkdown(escapeHtml(h[2]))}</h${lvl}>`);
      continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inList) { out.push(`<ul style="${UL_STYLE}">`); inList = true; }
      out.push(`<li>${renderInlineMarkdown(escapeHtml(ul[1]))}</li>`);
      continue;
    }

    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inOl) { out.push(`<ol style="${OL_STYLE}">`); inOl = true; }
      out.push(`<li>${renderInlineMarkdown(escapeHtml(ol[1]))}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p style="${P_STYLE}">${renderInlineMarkdown(escapeHtml(line))}</p>`);
  }
  closeLists();
  return out.join('\n');
}
