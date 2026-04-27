'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

// ──────────────────────────────────────────────────────────────────────────────
// Types — must mirror the JSON returned by /api/brussels-bulletin
// ──────────────────────────────────────────────────────────────────────────────

interface BulletinSubItem { title: string; body: string }
interface BulletinMainTopic { title: string; paragraphs: string[] }
interface BulletinJson {
  edition: string;
  period: { from: string; to: string };
  intro: string;
  keyDevelopments: { main: BulletinMainTopic[]; other: BulletinSubItem[] };
  importantReports: BulletinSubItem[];
  sourcesUsed: number;
  generatedAt: string;
  model: string;
  fallback?: boolean;
  fallbackReason?: 'no-api-key' | 'llm-error' | 'parse-error';
  fallbackDetail?: string;
}

function fallbackBannerText(b: BulletinJson): string {
  if (b.fallbackReason === 'llm-error') {
    return `LLM call failed — falling back to tag-based grouping.${b.fallbackDetail ? ` (${b.fallbackDetail})` : ''}`;
  }
  if (b.fallbackReason === 'parse-error') {
    return `The LLM returned an unparseable response — falling back to tag-based grouping.${b.fallbackDetail ? ` (${b.fallbackDetail})` : ''}`;
  }
  return 'Local fallback (no LLM API key set) — text is grouped from tags, not AI-generated.';
}

interface InboundFeedItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  receivedDate: string;
  tags: string[];
  from: string;
}

interface CustomFeedItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  addedDate: string;
  tags: string[];
}

/** Minimal unified shape used for display in the source items list. */
interface DisplayItem {
  id: string;
  title: string;
  date: string;
  sourceLabel: string;
  kind: 'email' | 'post';
}

// ──────────────────────────────────────────────────────────────────────────────
// Word export — emits an HTML document Word can open. Headings use the same
// label hierarchy as `public/templates/brussels-bulletin-template.docx`:
//   Title          → "The Brussels Bulletin"
//   Subtitle       → "Overview of recent EU climate policy-related developments"
//   Heading 1      → top-level sections (Key EU policy developments / Important reports)
//   Heading 2      → main topics inside Key EU policy developments
//   Heading 4      → "Other developments" subtopics + report items
// ──────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildWordHtml(b: BulletinJson): string {
  const styles = `
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    .header { text-align: center; border-bottom: 3px solid #00665A; padding-bottom: 16px; margin-bottom: 24px; }
    .header .org { font-size: 11pt; color: #00665A; letter-spacing: 0.5px; }
    h1.doc-title { font-size: 26pt; color: #00665A; margin: 4px 0; }
    .doc-subtitle { font-size: 13pt; color: #1f3b4d; margin: 0 0 4px; font-style: italic; }
    .doc-edition { font-size: 11pt; color: #1f3b4d; margin: 0; }
    p.intro { font-size: 10.5pt; color: #374151; line-height: 1.5; margin-bottom: 24px; }
    h2.section { font-size: 16pt; color: #00665A; border-bottom: 2px solid #00665A; padding-bottom: 4px; margin-top: 28px; }
    h3.topic { font-size: 13pt; color: #1f3b4d; margin-top: 20px; margin-bottom: 6px; }
    h4.subtopic { font-size: 11pt; color: #00665A; font-weight: bold; margin-top: 14px; margin-bottom: 4px; }
    p.body { font-size: 10.5pt; color: #1f2937; line-height: 1.5; margin: 4px 0 8px; text-align: justify; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
  `;

  const main = b.keyDevelopments.main
    .map(
      (t) => `
        <h3 class="topic">${escapeHtml(t.title)}</h3>
        ${t.paragraphs.map((p) => `<p class="body">${escapeHtml(p)}</p>`).join('')}
      `
    )
    .join('');

  const other = b.keyDevelopments.other.length
    ? `
      <h3 class="topic">Other developments</h3>
      ${b.keyDevelopments.other
        .map(
          (s) => `
            <h4 class="subtopic">${escapeHtml(s.title)}</h4>
            <p class="body">${escapeHtml(s.body)}</p>
          `
        )
        .join('')}
    `
    : '';

  const reports = b.importantReports.length
    ? `
      <h2 class="section">Important reports</h2>
      ${b.importantReports
        .map(
          (s) => `
            <h4 class="subtopic">${escapeHtml(s.title)}</h4>
            <p class="body">${escapeHtml(s.body)}</p>
          `
        )
        .join('')}
    `
    : '';

  return `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>The Brussels Bulletin — ${escapeHtml(b.edition)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="header">
    <div class="org">European Scientific Advisory Board on Climate Change</div>
    <h1 class="doc-title">The Brussels Bulletin</h1>
    <p class="doc-subtitle">Overview of recent EU climate policy-related developments</p>
    <p class="doc-edition">${escapeHtml(b.edition)} &mdash; ${escapeHtml(b.period.from)} to ${escapeHtml(b.period.to)}</p>
  </div>

  <p class="intro">${escapeHtml(b.intro)}</p>

  <h2 class="section">Key EU policy developments</h2>
  ${main}
  ${other}

  ${reports}

  <div class="footer">
    Prepared by the ESABCC Secretariat ${b.fallback ? `(local fallback — ${escapeHtml(b.fallbackReason || 'no-api-key')}${b.fallbackDetail ? `: ${escapeHtml(b.fallbackDetail)}` : ''})` : `using ${escapeHtml(b.model)}`}
    &middot; Generated ${new Date(b.generatedAt).toLocaleString('en-GB')}
    &middot; ${b.sourcesUsed} source items
  </div>
</body>
</html>`;
}

function downloadDocx(b: BulletinJson) {
  const html = buildWordHtml(b);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Brussels_Bulletin_${b.period.from}_${b.period.to}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

function defaultPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function BrusselsBulletinPage() {
  const init = defaultPeriod();
  const { session } = useAuth();
  const [dateFrom, setDateFrom] = useState(init.from);
  const [dateTo, setDateTo] = useState(init.to);
  const [generating, setGenerating] = useState(false);
  const [bulletin, setBulletin] = useState<BulletinJson | null>(null);
  const [error, setError] = useState<string>('');
  const [inbound, setInbound] = useState<InboundFeedItem[]>([]);
  const [customPosts, setCustomPosts] = useState<CustomFeedItem[]>([]);
  const [history, setHistory] = useState<{ date: string; title: string; model: string }[]>([]);

  // Load history once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bb-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // Pull current inbound items so the user can see what feeds the bulletin
  const refreshInbound = useCallback(async () => {
    try {
      const res = await fetch('/api/inbound-email?items=1');
      if (!res.ok) return;
      const data = (await res.json()) as { items?: InboundFeedItem[] };
      setInbound(data.items || []);
    } catch {
      /* ignore */
    }
  }, []);

  // Pull secretariat feed posts
  const refreshCustomPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-posts');
      if (!res.ok) return;
      const data = (await res.json()) as { items?: CustomFeedItem[] };
      setCustomPosts(data.items || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshInbound();
    refreshCustomPosts();
    const id = setInterval(() => { refreshInbound(); refreshCustomPosts(); }, 60000);
    return () => clearInterval(id);
  }, [refreshInbound, refreshCustomPosts]);

  function inPeriod(dateStr: string): boolean {
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return true;
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
    return t >= from && t <= to;
  }

  const inboundInPeriod: DisplayItem[] = inbound
    .filter((it) => inPeriod(it.publishedDate || it.receivedDate))
    .map((it) => ({
      id: it.id,
      title: it.title,
      date: (it.publishedDate || it.receivedDate || '').split('T')[0],
      sourceLabel: it.sourceLabel,
      kind: 'email' as const,
    }));

  const postsInPeriod: DisplayItem[] = customPosts
    .filter((it) => inPeriod(it.publishedDate || it.addedDate))
    .map((it) => ({
      id: it.id,
      title: it.title,
      date: (it.publishedDate || it.addedDate || '').split('T')[0],
      sourceLabel: it.sourceLabel,
      kind: 'post' as const,
    }));

  const itemsInPeriod: DisplayItem[] = [...inboundInPeriod, ...postsInPeriod].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  const generate = useCallback(async () => {
    setGenerating(true);
    setError('');
    setBulletin(null);
    try {
      const res = await fetch('/api/brussels-bulletin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ from: dateFrom, to: dateTo }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { bulletin: BulletinJson };
      setBulletin(data.bulletin);
      const entry = {
        date: new Date().toISOString().split('T')[0],
        title: `Brussels Bulletin ${dateFrom} → ${dateTo}`,
        model: data.bulletin.fallback ? 'fallback' : data.bulletin.model,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        try {
          localStorage.setItem('bb-history', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#007B6C] to-[#00665A]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
          <Link href="/news-feed" className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition mb-3">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to News Feed
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Brussels Bulletin Generator</h1>
          <p className="text-sm text-white/60 max-w-2xl">
            Generate the periodic Brussels Bulletin from forwarded-email items and secretariat posts in the news feed. Pick a period, click
            generate, and Claude assembles the bulletin in the same structure as the official ESABCC template.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Reference template ─────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-2">Reference Template</h2>
          <p className="text-xs text-tertiary mb-3">
            The export below mirrors the layout of the official ESABCC template (October 2025 edition):
            title &middot; subtitle &middot; intro &middot; <em>Key EU policy developments</em> with main topics
            and <em>Other developments</em> subtopics &middot; <em>Important reports</em>.
          </p>
          <a
            href="/templates/brussels-bulletin-template.docx"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline font-medium"
            download
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download official template (.docx)
          </a>
        </section>

        {/* ── Configuration ──────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">Period</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-tertiary-dark block mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-tertiary-dark block mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
          </div>

          <div className="text-xs text-tertiary">
            <span className="font-medium text-tertiary-dark">{itemsInPeriod.length}</span>{' '}
            feed item{itemsInPeriod.length !== 1 ? 's' : ''} in this window
            {(inboundInPeriod.length > 0 || postsInPeriod.length > 0) && (
              <span className="text-tertiary/70">
                {' '}({inboundInPeriod.length} email{inboundInPeriod.length !== 1 ? 's' : ''}, {postsInPeriod.length} secretariat post{postsInPeriod.length !== 1 ? 's' : ''})
              </span>
            )}
            {' '}(out of {inbound.length + customPosts.length} total).
            {inbound.length === 0 && customPosts.length === 0 && (
              <span className="block mt-1 text-amber-600">
                No feed items yet — forward newsletters or post items to the News Feed first.
              </span>
            )}
          </div>
        </section>

        {/* ── Sample of input items ──────────────────────────────── */}
        {itemsInPeriod.length > 0 && (
          <section className="bg-white rounded-lg border border-grey-200 p-5">
            <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-3">Source items used</h2>
            <ul className="space-y-1.5 text-xs text-tertiary max-h-48 overflow-y-auto pr-2">
              {itemsInPeriod.slice(0, 30).map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <span className="text-tertiary/60 shrink-0">{it.date}</span>
                  <span
                    className={`shrink-0 px-1 py-0.5 rounded text-[10px] font-medium ${
                      it.kind === 'post'
                        ? 'bg-teal-50 text-teal-700'
                        : 'bg-grey-100 text-tertiary/70'
                    }`}
                  >
                    {it.kind === 'post' ? 'post' : 'email'}
                  </span>
                  <span className="text-tertiary-dark truncate">{it.title}</span>
                </li>
              ))}
              {itemsInPeriod.length > 30 && (
                <li className="text-tertiary/60 italic">… and {itemsInPeriod.length - 30} more</li>
              )}
            </ul>
          </section>
        )}

        {/* ── Generate ───────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            onClick={generate}
            disabled={generating || itemsInPeriod.length === 0}
            className="px-5 py-2.5 bg-secondary text-white font-medium rounded hover:bg-secondary-dark disabled:opacity-50 transition text-sm"
          >
            {generating ? 'Generating bulletin…' : 'Generate Brussels Bulletin'}
          </button>
          <div className="text-xs text-tertiary">
            <p>
              Uses the configured LLM —{' '}
              <code className="bg-grey-100 px-1 rounded">GEMINI_API_KEY</code>,{' '}
              <code className="bg-grey-100 px-1 rounded">ANTHROPIC_API_KEY</code>, or{' '}
              <code className="bg-grey-100 px-1 rounded">OPENAI_API_KEY</code> (Gemini preferred, free tier).
            </p>
            <p className="text-[10px]">Falls back to local tag-based grouping otherwise.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
            <strong>Could not generate bulletin:</strong> {error}
          </div>
        )}

        {generating && (
          <div className="bg-surface-teal rounded-lg p-5 text-center">
            <div className="animate-spin w-8 h-8 border-3 border-secondary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-tertiary-dark font-medium">Generating Brussels Bulletin…</p>
            <p className="text-xs text-tertiary mt-1">
              Sending {itemsInPeriod.length} items to the LLM
            </p>
          </div>
        )}

        {/* ── Preview (matches template structure) ────────────────── */}
        {bulletin && (
          <section className="bg-white rounded-lg border border-grey-200 overflow-hidden">
            <div className="bg-[#00665A] p-6 text-center">
              <p className="text-white/70 text-[11px] uppercase tracking-wider">European Scientific Advisory Board on Climate Change</p>
              <h2 className="text-2xl font-bold text-white mt-1">The Brussels Bulletin</h2>
              <p className="text-white/80 text-xs italic mt-1">Overview of recent EU climate policy-related developments</p>
              <p className="text-white/60 text-xs mt-1">
                {bulletin.edition} &middot; {bulletin.period.from} → {bulletin.period.to}
              </p>
              {bulletin.fallback && (
                <p className="text-amber-200 text-[11px] mt-2">
                  {fallbackBannerText(bulletin)}
                </p>
              )}
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-tertiary leading-relaxed italic border-l-2 border-grey-200 pl-4">{bulletin.intro}</p>

              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-grey-200 pb-1 mb-3">
                  Key EU policy developments
                </h3>
                {bulletin.keyDevelopments.main.map((t, i) => (
                  <div key={i} className="mb-5">
                    <h4 className="text-base font-semibold text-tertiary-dark mb-2">{t.title}</h4>
                    {t.paragraphs.map((p, j) => (
                      <p key={j} className="text-sm text-tertiary leading-relaxed mb-2">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}

                {bulletin.keyDevelopments.other.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-tertiary-dark mb-2">Other developments</h4>
                    {bulletin.keyDevelopments.other.map((s, i) => (
                      <div key={i} className="mb-3">
                        <p className="text-sm font-semibold text-secondary mb-0.5">{s.title}</p>
                        <p className="text-sm text-tertiary leading-relaxed">{s.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {bulletin.importantReports.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-grey-200 pb-1 mb-3">
                    Important reports
                  </h3>
                  {bulletin.importantReports.map((s, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-sm font-semibold text-secondary mb-0.5">{s.title}</p>
                      <p className="text-sm text-tertiary leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-grey-200 pt-4 text-xs text-grey-400 text-center">
                Prepared by ESABCC Secretariat &middot;{' '}
                {bulletin.fallback ? 'local fallback' : bulletin.model} &middot; {bulletin.sourcesUsed} source items
              </div>
            </div>
          </section>
        )}

        {/* ── Export ──────────────────────────────────────────────── */}
        {bulletin && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadDocx(bulletin)}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark transition"
            >
              Download as Word (.doc)
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(bulletin, null, 2));
                alert('Bulletin JSON copied to clipboard.');
              }}
              className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition"
            >
              Copy JSON
            </button>
            <button
              onClick={generate}
              className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition"
            >
              Regenerate
            </button>
          </div>
        )}

        {/* ── History ────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="bg-white rounded-lg border border-grey-200 p-5">
            <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-3">Generation History</h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-grey-100 pb-2 last:border-0">
                  <div>
                    <p className="text-tertiary-dark font-medium">{h.title}</p>
                    <p className="text-[10px] text-grey-400">{h.date}</p>
                  </div>
                  <span className="text-xs text-tertiary">{h.model}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── API Key Notice ─────────────────────────────────────── */}
        <div className="bg-surface-blue rounded-lg p-4 text-xs text-tertiary">
          <p className="font-medium text-tertiary-dark mb-1">LLM API Integration</p>
          <p>
            Set any one of <code className="bg-white px-1 rounded">GEMINI_API_KEY</code>,{' '}
            <code className="bg-white px-1 rounded">ANTHROPIC_API_KEY</code>, or{' '}
            <code className="bg-white px-1 rounded">OPENAI_API_KEY</code> in your Vercel project environment
            variables to enable AI generation. Gemini has a free tier at aistudio.google.com/apikey.
            Without any key, the page still produces a tag-based grouping so the structure can be reviewed.
          </p>
        </div>
      </div>
    </div>
  );
}
