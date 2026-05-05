'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import { useAuth } from '@/lib/auth-context';

// ──────────────────────────────────────────────────────────────────────────────
// Brussels Bulletin — production module (promoted from beta on 2026-05).
// Route: /news-feed/brussels-bulletin (subpage of the News module).
//
// Types must mirror the JSON shape returned by /api/brussels-bulletin and
// /api/brussels-bulletin/topics. Layout follows the April 2026 template at
// public/templates/brussels-bulletin-template.docx:
//   Heading1 "Key EU policy developments"
//     Heading2 <topic>          → keyDevelopments[].title
//       Normal <paragraph>      → keyDevelopments[].paragraphs[]
//       ListParagraph <bullet>  → keyDevelopments[].bullets[] (optional)
//   Heading1 "Other developments"
//     Normal "<DD/M>: <body>"   → otherDevelopments[]
//   Heading1 "Relevant documents/reports/articles"
//     Normal <body>             → relevantDocuments[]
// ──────────────────────────────────────────────────────────────────────────────

interface BulletinKeyDevelopment {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}
interface BulletinOtherDevelopment { date: string; body: string }
interface BulletinRelevantDocument { body: string }

interface BulletinJson {
  edition: string;
  period: { from: string; to: string };
  keyDevelopments: BulletinKeyDevelopment[];
  otherDevelopments: BulletinOtherDevelopment[];
  relevantDocuments: BulletinRelevantDocument[];
  sourcesUsed: number;
  generatedAt: string;
  model: string;
}

interface TopicSuggestion {
  title: string;
  summary: string;
  itemCount: number;
}

interface WeightedTopic extends TopicSuggestion {
  /** Whole-number percentage 0-100. Sum across topics must equal 100. */
  weight: number;
}

interface InboundFeedItem {
  id: string;
  title: string;
  summary: string;
  fullText?: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  receivedDate: string;
  url?: string;
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
  url?: string;
  tags: string[];
}

/** Minimal unified shape used for display in the source items list. */
interface DisplayItem {
  id: string;
  title: string;
  date: string;
  sourceLabel: string;
  url?: string;
  summary: string;
  fullText?: string;
  aiSummary?: string;
  tags: string[];
  kind: 'email' | 'post';
}

// ──────────────────────────────────────────────────────────────────────────────
// Word export — clones the official ESABCC template
// (`/templates/brussels-bulletin-template.docx`) and replaces only the
// document body. The output therefore keeps every style, font, header,
// footer and page setting of the source file untouched, and the body is
// rebuilt with the template's own paragraph styles:
//   Title              → "The Brussels Bulletin"
//   Subtitle           → "Overview of recent EU climate policy-related developments"
//   Heading1           → top-level sections
//   Heading2           → topic blocks under "Key EU policy developments"
//   Normal             → body paragraphs (inc. flat lists in the lower sections)
//   ListParagraph      → bullets inside Heading2 topics
//   Strong (run style) → org name above the title
// ──────────────────────────────────────────────────────────────────────────────

const TEMPLATE_INTRO_1 =
  'The overview below contains climate-related news which are considered relevant for the activities of the Advisory Board and are therefore only intended for internal use.';
const TEMPLATE_INTRO_2 =
  'When composing this overview, the Secretariat has striven to cover all relevant topics. Nevertheless, the overview below is not exhaustive.';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A single paragraph in document.xml, optionally styled and centred. */
function p(opts: { style?: string; rStyle?: string; center?: boolean; text: string }): string {
  const pPr: string[] = [];
  if (opts.style) pPr.push(`<w:pStyle w:val="${opts.style}"/>`);
  if (opts.center) pPr.push(`<w:jc w:val="center"/>`);
  const pPrXml = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';
  const rPr = opts.rStyle ? `<w:rPr><w:rStyle w:val="${opts.rStyle}"/></w:rPr>` : '';
  return `<w:p>${pPrXml}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(opts.text)}</w:t></w:r></w:p>`;
}

function buildBodyXml(b: BulletinJson, sectPr: string): string {
  const parts: string[] = [];

  // Header block — same paragraph order/styles as the uploaded template.
  parts.push(p({ rStyle: 'Strong', center: true, text: 'European Scientific Advisory Board on Climate Change' }));
  parts.push(p({ style: 'Title', center: true, text: 'The Brussels Bulletin' }));
  parts.push(p({ style: 'Subtitle', center: true, text: 'Overview of recent EU climate policy-related developments' }));
  parts.push(p({ center: true, text: b.edition }));

  // Boilerplate intro — verbatim copy of the two paragraphs in the template.
  parts.push(p({ text: TEMPLATE_INTRO_1 }));
  parts.push(p({ text: TEMPLATE_INTRO_2 }));

  // Section 1 — Key EU policy developments
  parts.push(p({ style: 'Heading1', text: 'Key EU policy developments' }));
  for (const topic of b.keyDevelopments) {
    parts.push(p({ style: 'Heading2', text: topic.title }));
    for (const para of topic.paragraphs) {
      parts.push(p({ text: para }));
    }
    if (topic.bullets && topic.bullets.length) {
      for (const bullet of topic.bullets) {
        parts.push(p({ style: 'ListParagraph', text: bullet }));
      }
    }
  }

  // Section 2 — Other developments (flat list, "DD/M: <body>")
  if (b.otherDevelopments.length) {
    parts.push(p({ style: 'Heading1', text: 'Other developments' }));
    for (const item of b.otherDevelopments) {
      const text = item.date ? `${item.date}: ${item.body}` : item.body;
      parts.push(p({ text }));
    }
  }

  // Section 3 — Relevant documents/reports/articles (flat list)
  if (b.relevantDocuments.length) {
    parts.push(p({ style: 'Heading1', text: 'Relevant documents/reports/articles' }));
    for (const doc of b.relevantDocuments) {
      parts.push(p({ text: doc.body }));
    }
  }

  return parts.join('') + sectPr;
}

async function downloadDocx(b: BulletinJson): Promise<void> {
  const res = await fetch('/templates/brussels-bulletin-template.docx');
  if (!res.ok) throw new Error(`Could not load template (${res.status})`);
  const tplBuf = await res.arrayBuffer();

  const zip = await JSZip.loadAsync(tplBuf);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Template is missing word/document.xml');
  const docXml = await docFile.async('string');

  // Preserve the original sectPr (page size, margins, header/footer refs).
  const sectStart = docXml.lastIndexOf('<w:sectPr');
  const sectEnd = docXml.indexOf('</w:sectPr>', sectStart);
  if (sectStart < 0 || sectEnd < 0) throw new Error('Template sectPr not found');
  const sectPr = docXml.substring(sectStart, sectEnd + '</w:sectPr>'.length);

  // Replace only the body contents — keep the <w:body> opening tag (and the
  // surrounding <w:document> with all its xmlns declarations) and the
  // closing </w:body></w:document> from the original file.
  const bodyOpen = docXml.indexOf('<w:body>') + '<w:body>'.length;
  const bodyClose = docXml.lastIndexOf('</w:body>');
  const newDocXml =
    docXml.substring(0, bodyOpen) +
    buildBodyXml(b, sectPr) +
    docXml.substring(bodyClose);

  zip.file('word/document.xml', newDocXml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Brussels_Bulletin_${b.period.from}_${b.period.to}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ──────────────────────────────────────────────────────────────────────────────
// Background report (.md) — a structured dump of every source item in the
// selected window with its title, source, date, URL and summary. Designed to
// be fed verbatim into a more capable external LLM (Claude Opus, Gemini Ultra,
// GPT-5, …) so it can produce a higher-quality bulletin than the in-product
// model. Includes a ready-to-use prompt at the top, the list of weighted
// topics (when available), and — when the in-product bulletin has already been
// generated — the JSON output as a baseline draft.
// ──────────────────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return d;
  return t.toISOString().split('T')[0];
}

function escapeMd(s: string): string {
  // Markdown is permissive — only the most-disruptive chars need escaping.
  return s.replace(/\r\n?/g, '\n');
}

function buildBackgroundReport(opts: {
  from: string;
  to: string;
  items: DisplayItem[];
  topics: WeightedTopic[];
  bulletin: BulletinJson | null;
}): string {
  const { from, to, items, topics, bulletin } = opts;
  const generatedAt = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`# Brussels Bulletin — Background Report`);
  lines.push('');
  lines.push(`**Period:** ${from} → ${to}`);
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Source items:** ${items.length}`);
  lines.push('');
  lines.push(`> Internal use only. This file packages every source item the ESABCC Secretariat has on file for the period above, together with optional weighted topics and (if already produced) the in-product bulletin draft. Pass it to a more capable LLM to produce a higher-quality bulletin.`);
  lines.push('');

  lines.push(`## Instructions for the downstream LLM`);
  lines.push('');
  lines.push(`You are the European Scientific Advisory Board on Climate Change Secretariat. Produce **The Brussels Bulletin** — an internal periodic overview of EU climate-policy developments — for the period **${from} → ${to}**.`);
  lines.push('');
  lines.push(`Use **only** the source items in the "Source items" section. Do not invent facts, do not add citations or links, and do not include a bibliography. Write in the formal style of EU policy briefs.`);
  lines.push('');
  lines.push(`Structure the bulletin in three sections, in this order:`);
  lines.push('');
  lines.push(`1. **Key EU policy developments** — for each major topic, a short heading followed by 2–4 paragraphs, optionally with bullets.`);
  lines.push(`2. **Other developments** — flat list of single-paragraph items, each prefixed with the date in DD/M format (e.g. "27/3:").`);
  lines.push(`3. **Relevant documents/reports/articles** — flat list of one paragraph per published document, study or article.`);
  lines.push('');
  lines.push(`Target body length ~1500 words. Respect the per-topic weights below within ±20%; drop topics with weight 0. Headings must be short and carry no trailing punctuation.`);
  lines.push('');

  if (topics.length) {
    lines.push(`## Topic weights`);
    lines.push('');
    lines.push(`| # | Topic | Weight | Item count | Summary |`);
    lines.push(`|---|---|---:|---:|---|`);
    topics.forEach((t, i) => {
      const summary = (t.summary || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      lines.push(`| ${i + 1} | ${t.title.replace(/\|/g, '\\|')} | ${t.weight}% | ${t.itemCount} | ${summary} |`);
    });
    lines.push('');
  } else {
    lines.push(`## Topic weights`);
    lines.push('');
    lines.push(`_No topics selected yet — let the downstream LLM cluster the source items below into 4–8 overarching themes and weight them by editorial importance._`);
    lines.push('');
  }

  if (bulletin) {
    lines.push(`## In-product bulletin draft (baseline)`);
    lines.push('');
    lines.push(`The following draft was produced by the in-product LLM (${bulletin.model}). Use it as a baseline; you are free to restructure, expand or rewrite.`);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(bulletin, null, 2));
    lines.push('```');
    lines.push('');
  }

  lines.push(`## Source items (${items.length})`);
  lines.push('');
  lines.push(`Each item below is one piece of evidence. The "Full content" field, when present, is the verbatim body of the forwarded email or post — prefer it when reasoning. "AI summary" was produced by an in-product summariser and is included for orientation only. "Short summary" is an editor-written lede when it differs from both.`);
  lines.push('');

  if (items.length === 0) {
    lines.push(`_No source items in the selected window._`);
    lines.push('');
  } else {
    items.forEach((it, i) => {
      lines.push(`### ${i + 1}. ${escapeMd(it.title || '(untitled)')}`);
      lines.push('');
      lines.push(`- **Source:** ${escapeMd(it.sourceLabel || '—')}`);
      lines.push(`- **Date:** ${fmtDate(it.date)}`);
      lines.push(`- **Kind:** ${it.kind === 'email' ? 'forwarded email' : 'secretariat post'}`);
      if (it.url && it.url !== '#') {
        lines.push(`- **URL:** ${it.url}`);
      }
      if (it.tags && it.tags.length) {
        lines.push(`- **Tags:** ${it.tags.join(', ')}`);
      }
      lines.push('');
      if (it.aiSummary) {
        lines.push(`**AI summary**`);
        lines.push('');
        lines.push(escapeMd(it.aiSummary));
        lines.push('');
      }
      // Prefer the full email body (fullText) over the short summary —
      // this is the verbatim content the downstream LLM should reason
      // over. Fall back to summary when fullText is missing (e.g. for
      // secretariat posts, which don't have a separate body field).
      const bodyText = it.fullText || it.summary;
      if (bodyText) {
        lines.push(`**Full content**`);
        lines.push('');
        lines.push(escapeMd(bodyText));
        lines.push('');
      }
      // Keep the short summary too when it differs from the full text and
      // from the AI summary — it sometimes carries an editor-written lede
      // that's worth preserving.
      if (
        it.summary &&
        it.summary !== it.fullText &&
        it.summary !== it.aiSummary
      ) {
        lines.push(`**Short summary**`);
        lines.push('');
        lines.push(escapeMd(it.summary));
        lines.push('');
      }
      lines.push(`---`);
      lines.push('');
    });
  }

  lines.push(`_End of background report. Generated by ESABCC MethodHub on ${generatedAt}._`);
  lines.push('');

  return lines.join('\n');
}

function downloadBackgroundReport(opts: {
  from: string;
  to: string;
  items: DisplayItem[];
  topics: WeightedTopic[];
  bulletin: BulletinJson | null;
}): void {
  const md = buildBackgroundReport(opts);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Brussels_Bulletin_background_${opts.from}_${opts.to}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
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


type WizardStep = 1 | 2 | 3;

interface HistoryEntry {
  date: string;
  title: string;
  model: string;
}

export default function BrusselsBulletinPage() {
  const init = defaultPeriod();
  const { session } = useAuth();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [dateFrom, setDateFrom] = useState(init.from);
  const [dateTo, setDateTo] = useState(init.to);

  // Step 1 — topic discovery
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [topics, setTopics] = useState<WeightedTopic[]>([]);

  // Step 3 — bulletin generation
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [bulletin, setBulletin] = useState<BulletinJson | null>(null);
  const [exportError, setExportError] = useState('');

  // Source items in window (read-only context for steps 1/2)
  const [inbound, setInbound] = useState<InboundFeedItem[]>([]);
  const [customPosts, setCustomPosts] = useState<CustomFeedItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bb-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const refreshInbound = useCallback(async () => {
    try {
      const res = await fetch('/api/inbound-email?items=1');
      if (!res.ok) return;
      const data = (await res.json()) as { items?: InboundFeedItem[] };
      setInbound(data.items || []);
    } catch { /* ignore */ }
  }, []);

  const refreshCustomPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-posts');
      if (!res.ok) return;
      const data = (await res.json()) as { items?: CustomFeedItem[] };
      setCustomPosts(data.items || []);
    } catch { /* ignore */ }
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
      url: it.url,
      summary: it.summary,
      fullText: it.fullText,
      aiSummary: it.aiSummary,
      tags: it.tags || [],
      kind: 'email' as const,
    }));

  const postsInPeriod: DisplayItem[] = customPosts
    .filter((it) => inPeriod(it.publishedDate || it.addedDate))
    .map((it) => ({
      id: it.id,
      title: it.title,
      date: (it.publishedDate || it.addedDate || '').split('T')[0],
      sourceLabel: it.sourceLabel,
      url: it.url,
      summary: it.summary,
      aiSummary: it.aiSummary,
      tags: it.tags || [],
      kind: 'post' as const,
    }));

  const itemsInPeriod: DisplayItem[] = [...inboundInPeriod, ...postsInPeriod].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  const onDownloadBackground = useCallback(() => {
    setExportError('');
    try {
      downloadBackgroundReport({
        from: dateFrom,
        to: dateTo,
        items: itemsInPeriod,
        topics,
        bulletin,
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Background export failed');
    }
  }, [dateFrom, dateTo, itemsInPeriod, topics, bulletin]);

  // ── Step 1: ask the LLM for up to 10 overarching topics ──────────────────
  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    setTopics([]);
    setBulletin(null);
    try {
      const res = await fetch('/api/brussels-bulletin/topics', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ from: dateFrom, to: dateTo }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        topics?: TopicSuggestion[]; error?: string; message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      const list = data.topics || [];
      if (list.length === 0) throw new Error('No topics returned by the LLM.');
      // Default each weight to a flat share that sums to exactly 100.
      const base = Math.floor(100 / list.length);
      const remainder = 100 - base * list.length;
      const weighted: WeightedTopic[] = list.map((t, i) => ({
        ...t,
        weight: base + (i < remainder ? 1 : 0),
      }));
      setTopics(weighted);
      setStep(2);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [dateFrom, dateTo, session]);

  // ── Step 2: weight helpers ───────────────────────────────────────────────
  const totalWeight = topics.reduce((s, t) => s + (Number.isFinite(t.weight) ? t.weight : 0), 0);
  const weightsValid = Math.round(totalWeight) === 100;

  const setTopicWeight = (i: number, val: number) => {
    setTopics((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, weight: Math.max(0, Math.min(100, Math.round(val))) } : t)),
    );
  };

  const normalizeWeights = () => {
    setTopics((prev) => {
      const sum = prev.reduce((s, t) => s + (t.weight || 0), 0);
      if (sum <= 0) {
        const base = Math.floor(100 / prev.length);
        const remainder = 100 - base * prev.length;
        return prev.map((t, i) => ({ ...t, weight: base + (i < remainder ? 1 : 0) }));
      }
      const scaled = prev.map((t) => ({ ...t, weight: (t.weight / sum) * 100 }));
      const rounded = scaled.map((t) => ({ ...t, weight: Math.round(t.weight) }));
      const diff = 100 - rounded.reduce((s, t) => s + t.weight, 0);
      if (diff !== 0) {
        // Distribute the rounding remainder onto the largest topic(s).
        const idx = rounded
          .map((t, i) => ({ i, w: t.weight }))
          .sort((a, b) => b.w - a.w)[0].i;
        rounded[idx].weight += diff;
      }
      return rounded;
    });
  };

  // ── Step 3: generate the bulletin from weighted topics ───────────────────
  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerateError('');
    setBulletin(null);
    try {
      const payload = {
        from: dateFrom,
        to: dateTo,
        topics: topics
          .filter((t) => t.weight > 0)
          .map((t) => ({ title: t.title, weight: t.weight })),
      };
      const res = await fetch('/api/brussels-bulletin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        bulletin?: BulletinJson; error?: string; message?: string;
      };
      if (!res.ok || !data.bulletin) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setBulletin(data.bulletin);
      setStep(3);
      const entry: HistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        title: `Brussels Bulletin ${dateFrom} → ${dateTo}`,
        model: data.bulletin.model,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        try { localStorage.setItem('bb-history', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [dateFrom, dateTo, topics, session]);

  const onDownloadDocx = useCallback(async () => {
    if (!bulletin) return;
    setExportError('');
    try {
      await downloadDocx(bulletin);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [bulletin]);

  const consentBlocked = (analyzeError + generateError).includes('AI generation is opt-in');

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#007B6C] to-[#00665A]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/news-feed"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition mb-3"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to News Feed
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Brussels Bulletin Generator</h1>
          <p className="text-sm text-white/60 max-w-2xl">
            Three-step wizard. (1) Pick a period and let Claude identify up to 10 overarching
            topics. (2) Allocate a weight to each topic — those weights set the share of the
            bulletin devoted to it. (3) Generate the bulletin and download it as a Word file
            using the official ESABCC template, or as a detailed background report (.md) to
            feed into a more capable external LLM.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {([1, 2, 3] as WizardStep[]).map((n, i) => {
            const active = step === n;
            const done = step > n;
            const label = n === 1 ? 'Period & topics' : n === 2 ? 'Weights' : 'Generate';
            return (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (n === 1) setStep(1);
                    if (n === 2 && topics.length > 0) setStep(2);
                    if (n === 3 && bulletin) setStep(3);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition ${
                    active
                      ? 'bg-secondary text-white'
                      : done
                      ? 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                      : 'bg-grey-100 text-tertiary'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      active ? 'bg-white/20' : done ? 'bg-secondary text-white' : 'bg-white text-tertiary'
                    }`}
                  >
                    {n}
                  </span>
                  {label}
                </button>
                {i < 2 && <span className="text-tertiary/40">›</span>}
              </div>
            );
          })}
        </div>

        {/* Consent-blocked banner — short-circuits the wizard with a link */}
        {consentBlocked && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
            <strong>AI generation is opt-in.</strong> Open{' '}
            <Link href="/profile" className="underline font-medium">
              your profile → Your data → AI summarisation consent
            </Link>{' '}
            to enable it (GDPR Art. 6(1)(a)).
          </div>
        )}

        {/* Reference template + downstream export */}
        <section className="bg-white rounded-lg border border-grey-200 p-5">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-2">Templates &amp; raw export</h2>
          <p className="text-xs text-tertiary mb-3">
            The Word export below is built by cloning the official ESABCC template and replacing
            its body, so all styles, fonts, headers and page setup match the template exactly.
            The background report is a Markdown dump of every source item — title, source, date,
            URL, tags, the AI summary <em>and the full email body verbatim</em> — plus a
            ready-to-use prompt. Pass it to a more capable external LLM (Claude Opus, Gemini
            Ultra, GPT-5, …) to produce a higher-quality bulletin.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <a
              href="/templates/brussels-bulletin-template.docx"
              className="inline-flex items-center justify-center gap-2 text-[13px] sm:text-xs px-3 py-2 sm:py-0 min-h-[44px] sm:min-h-0 text-secondary hover:underline font-medium"
              download
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download official template (.docx)
            </a>
            <button
              type="button"
              onClick={onDownloadBackground}
              disabled={itemsInPeriod.length === 0}
              className="inline-flex items-center justify-center gap-2 text-[13px] sm:text-xs px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded border border-secondary text-secondary hover:bg-secondary/5 active:bg-secondary/10 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              title={itemsInPeriod.length === 0
                ? 'Pick a period that contains at least one feed item'
                : 'Download a Markdown background report containing every source item plus a downstream-LLM prompt'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Download background report (.md) · {itemsInPeriod.length} item{itemsInPeriod.length !== 1 ? 's' : ''}
            </button>
          </div>
        </section>

        {/* ── Step 1 — Period & topic discovery ───────────────────────── */}
        {step === 1 && (
          <>
            <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
              <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">
                Step 1 · Period
              </h2>
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
                    {' '}({inboundInPeriod.length} email{inboundInPeriod.length !== 1 ? 's' : ''},{' '}
                    {postsInPeriod.length} secretariat post{postsInPeriod.length !== 1 ? 's' : ''})
                  </span>
                )}
                {inbound.length === 0 && customPosts.length === 0 && (
                  <span className="block mt-1 text-amber-600">
                    No feed items yet — forward newsletters or post items to the News Feed first.
                  </span>
                )}
              </div>
            </section>

            {itemsInPeriod.length > 0 && (
              <section className="bg-white rounded-lg border border-grey-200 p-5">
                <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-3">Source items used</h2>
                <ul className="space-y-1.5 text-xs text-tertiary max-h-48 overflow-y-auto pr-2">
                  {itemsInPeriod.slice(0, 30).map((it) => (
                    <li key={it.id} className="flex items-center gap-2">
                      <span className="text-tertiary/60 shrink-0">{it.date}</span>
                      <span
                        className={`shrink-0 px-1 py-0.5 rounded text-[10px] font-medium ${
                          it.kind === 'post' ? 'bg-teal-50 text-teal-700' : 'bg-grey-100 text-tertiary/70'
                        }`}
                      >
                        {it.kind}
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

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={analyze}
                disabled={analyzing || itemsInPeriod.length === 0}
                className="px-5 py-2.5 bg-secondary text-white font-medium rounded hover:bg-secondary-dark disabled:opacity-50 transition text-sm"
              >
                {analyzing ? 'Analysing topics…' : 'Analyse topics →'}
              </button>
              <p className="text-xs text-tertiary">
                Claude will read every item in the window and propose up to 10 overarching topics.
              </p>
            </div>

            {analyzeError && !consentBlocked && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                <strong>Could not analyse topics:</strong> {analyzeError}
              </div>
            )}
          </>
        )}

        {/* ── Step 2 — Topic weights ──────────────────────────────────── */}
        {step === 2 && (
          <>
            <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">
                    Step 2 · Allocate weights
                  </h2>
                  <p className="text-xs text-tertiary mt-1">
                    Each weight is the percentage of the bulletin devoted to that topic. Weights
                    must sum to <strong>100%</strong>. A topic at 0% will be dropped.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold ${weightsValid ? 'text-secondary' : 'text-red-600'}`}>
                    {Math.round(totalWeight)}%
                  </div>
                  <button
                    onClick={normalizeWeights}
                    className="text-[11px] text-tertiary hover:text-tertiary-dark underline"
                  >
                    Normalise to 100%
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {topics.map((t, i) => (
                  <div key={i} className="border border-grey-100 rounded p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-tertiary-dark truncate">{t.title}</p>
                        <span className="text-[10px] text-tertiary/70 shrink-0">
                          {t.itemCount} item{t.itemCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {t.summary && <p className="text-xs text-tertiary leading-relaxed">{t.summary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={t.weight}
                          onChange={(e) => setTopicWeight(i, parseInt(e.target.value || '0', 10))}
                          className="w-16 border border-grey-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-secondary/30"
                        />
                        <span className="text-xs text-tertiary">%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={t.weight}
                        onChange={(e) => setTopicWeight(i, parseInt(e.target.value, 10))}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition"
              >
                ← Back
              </button>
              <button
                onClick={generate}
                disabled={generating || !weightsValid}
                className="px-5 py-2.5 bg-secondary text-white font-medium rounded hover:bg-secondary-dark disabled:opacity-50 transition text-sm"
              >
                {generating ? 'Generating bulletin…' : 'Generate bulletin →'}
              </button>
              <button
                onClick={onDownloadBackground}
                disabled={itemsInPeriod.length === 0}
                className="px-4 py-2 border border-secondary text-secondary text-sm font-medium rounded hover:bg-secondary/5 transition disabled:opacity-40"
                title="Download a Markdown background report including these weighted topics"
              >
                Download background report (.md)
              </button>
              {!weightsValid && (
                <p className="text-xs text-red-600">
                  Weights currently sum to {Math.round(totalWeight)}%. Adjust or click "Normalise to 100%".
                </p>
              )}
            </div>

            {generateError && !consentBlocked && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                <strong>Could not generate bulletin:</strong> {generateError}
              </div>
            )}
          </>
        )}

        {/* ── Step 3 — Preview & export ───────────────────────────────── */}
        {step === 3 && bulletin && (
          <>
            <section className="bg-white rounded-lg border border-grey-200 overflow-hidden">
              <div className="bg-[#00665A] p-6 text-center">
                <p className="text-white/70 text-[11px] uppercase tracking-wider">European Scientific Advisory Board on Climate Change</p>
                <h2 className="text-2xl font-bold text-white mt-1">The Brussels Bulletin</h2>
                <p className="text-white/80 text-xs italic mt-1">Overview of recent EU climate policy-related developments</p>
                <p className="text-white/60 text-xs mt-1">
                  {bulletin.edition} &middot; {bulletin.period.from} → {bulletin.period.to}
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-xs text-tertiary leading-relaxed border-l-2 border-grey-200 pl-4 space-y-2">
                  <p>{TEMPLATE_INTRO_1}</p>
                  <p>{TEMPLATE_INTRO_2}</p>
                </div>

                {bulletin.keyDevelopments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-grey-200 pb-1 mb-3">
                      Key EU policy developments
                    </h3>
                    {bulletin.keyDevelopments.map((t, i) => (
                      <div key={i} className="mb-5">
                        <h4 className="text-base font-semibold text-tertiary-dark mb-2">{t.title}</h4>
                        {t.paragraphs.map((para, j) => (
                          <p key={j} className="text-sm text-tertiary leading-relaxed mb-2">{para}</p>
                        ))}
                        {t.bullets && t.bullets.length > 0 && (
                          <ul className="list-disc pl-5 text-sm text-tertiary space-y-1">
                            {t.bullets.map((b, j) => <li key={j}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {bulletin.otherDevelopments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-grey-200 pb-1 mb-3">
                      Other developments
                    </h3>
                    <div className="space-y-2">
                      {bulletin.otherDevelopments.map((o, i) => (
                        <p key={i} className="text-sm text-tertiary leading-relaxed">
                          {o.date && <span className="font-semibold text-tertiary-dark">{o.date}: </span>}
                          {o.body}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {bulletin.relevantDocuments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-grey-200 pb-1 mb-3">
                      Relevant documents/reports/articles
                    </h3>
                    <div className="space-y-2">
                      {bulletin.relevantDocuments.map((d, i) => (
                        <p key={i} className="text-sm text-tertiary leading-relaxed">{d.body}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-grey-200 pt-4 text-xs text-grey-400 text-center">
                  Prepared by ESABCC Secretariat &middot; {bulletin.model} &middot; {bulletin.sourcesUsed} source items
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onDownloadDocx}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark transition"
              >
                Download as Word (.docx)
              </button>
              <button
                onClick={onDownloadBackground}
                className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded hover:bg-secondary-dark transition"
                title="Markdown export with every source item, weighted topics, and the in-product draft as a baseline — feed it to a more capable external LLM"
              >
                Download background report (.md)
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
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition"
              >
                ← Adjust weights
              </button>
              <button
                onClick={generate}
                disabled={generating}
                className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition disabled:opacity-50"
              >
                {generating ? 'Regenerating…' : 'Regenerate'}
              </button>
            </div>

            {exportError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                <strong>Could not export:</strong> {exportError}
              </div>
            )}
          </>
        )}

        {/* History */}
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

        <div className="bg-surface-blue rounded-lg p-4 text-xs text-tertiary">
          <p className="font-medium text-tertiary-dark mb-1">LLM API Integration</p>
          <p>
            Set any one of <code className="bg-white px-1 rounded">GEMINI_API_KEY</code>,{' '}
            <code className="bg-white px-1 rounded">ANTHROPIC_API_KEY</code>, or{' '}
            <code className="bg-white px-1 rounded">OPENAI_API_KEY</code> in your Vercel project
            environment variables to enable AI generation. Gemini has a free tier at
            aistudio.google.com/apikey. The background report (.md) needs no API key — it ships
            the raw source items so you can run a more capable external LLM offline.
          </p>
        </div>
      </div>
    </div>
  );
}
