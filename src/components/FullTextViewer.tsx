'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Citation, Annotation, TagDef, Policy, PolicyConnection } from '@/lib/types';
import { buildContentAnalysisUrl } from '@/lib/contentAnalysisLinks';
import { fetchAnnotations, fetchTags, saveAnnotationRemote, updateAnnotationRemote, deleteAnnotationRemote, addCustomTagRemote, getTagColor } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

interface Props {
  policyId: string;
  text: string;
  citations: Citation[];
  policyConnections?: (PolicyConnection & { source_title?: string; target_title?: string })[];
  allPolicies?: Policy[];
  onAnnotationsChange?: () => void;
  /** Optional search query from URL — auto-scrolls to and highlights matching text */
  highlightQuery?: string;
  /** Optional full citation text — used as the note on AI-generated annotations */
  highlightCitation?: string;
}

interface PolicyRef { start: number; end: number; policyId: string; policyTitle: string; }
interface Span { start: number; end: number; type: 'citation' | 'annotation' | 'policy-ref'; data: Citation | (Annotation & { user_display_name?: string }) | PolicyRef; }

export default function FullTextViewer({ policyId, text, citations, policyConnections, allPolicies, onAnnotationsChange, highlightQuery, highlightCitation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<(Annotation & { user_display_name?: string })[]>([]);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string; x: number; y: number } | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editTag, setEditTag] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showAnnotationGuide, setShowAnnotationGuide] = useState(true);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [customTagName, setCustomTagName] = useState('');
  const [customTagColor, setCustomTagColor] = useState('#6B7280');
  const { requireAuth, user } = useAuth();
  // Keep a ref to the authenticated user so handleSave always has the latest value
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Retroactively fix annotations whose stored char offsets no longer match
  // the text_excerpt. Older annotations were saved with buggy offsets caused
  // by `range.startOffset` being relative to the inner text node rather than
  // the containing segment. This attempts to relocate each annotation by
  // searching for its text_excerpt in the canonical text.
  const reconcileAnnotations = useCallback((anns: (Annotation & { user_display_name?: string })[]): (Annotation & { user_display_name?: string })[] => {
    return anns.map(a => {
      if (!a.text_excerpt) return a;
      const currentSlice = text.slice(a.char_start, a.char_end);
      if (currentSlice === a.text_excerpt) return a;
      // Try exact match first
      let idx = text.indexOf(a.text_excerpt);
      // Fallback: normalize whitespace for matching
      if (idx === -1) {
        const normalized = a.text_excerpt.replace(/\s+/g, ' ').trim();
        if (normalized) {
          const normText = text.replace(/\s+/g, ' ');
          const normIdx = normText.indexOf(normalized);
          if (normIdx !== -1) {
            // Map normalized index back to raw text index approximately
            // by walking through text and counting matching chars.
            let rawIdx = 0;
            let nIdx = 0;
            let prevSpace = false;
            while (rawIdx < text.length && nIdx < normIdx) {
              const ch = text[rawIdx];
              const isSpace = /\s/.test(ch);
              if (isSpace) {
                if (!prevSpace) nIdx++;
                prevSpace = true;
              } else {
                nIdx++;
                prevSpace = false;
              }
              rawIdx++;
            }
            idx = rawIdx;
          }
        }
      }
      if (idx === -1) return a; // Cannot reconcile — leave as-is
      return { ...a, char_start: idx, char_end: idx + a.text_excerpt.length };
    });
  }, [text]);

  useEffect(() => {
    fetchAnnotations(policyId).then(anns => setAnnotations(reconcileAnnotations(anns)));
    fetchTags().then(setTags);
  }, [policyId, reconcileAnnotations]);

  // Listen for scroll-to events from annotation panel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.charStart != null && containerRef.current) {
        const el = containerRef.current.querySelector(`[data-start="${detail.charStart}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Flash highlight effect
          el.classList.add('annotation-flash');
          setTimeout(() => el.classList.remove('annotation-flash'), 2000);
        }
      }
    };
    window.addEventListener('scroll-to-annotation', handler);
    return () => window.removeEventListener('scroll-to-annotation', handler);
  }, []);

  // Auto-scroll to the highlighted article and create a permanent
  // "AI generated" annotation so the referenced passage stays marked.
  // Char offsets must come from the RAW `text` prop (not the DOM) so they
  // match the coordinate system used by the `segments` useMemo below.
  useEffect(() => {
    if (!highlightQuery || !containerRef.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      let charStart = -1;
      let charEnd = -1;
      let matchedText = '';

      // Helper: find article by searching raw text for "Article N" at line start
      const findArticle = (artId: string): { start: number; end: number } | null => {
        const regex = new RegExp(`^Article\\s+${artId}\\b[^\\n]*`, 'm');
        const m = text.match(regex);
        if (m && m.index !== undefined) return { start: m.index, end: m.index + m[0].length };
        return null;
      };

      // 1. Article reference — accepts both "Article 9" and "Art. 4(3)" / "Art 10a"
      const artMatch = highlightQuery.match(/^(?:Article|Art\.?)\s+(\d+[a-z]*(?:-\d+[a-z]*)?)/i);
      if (artMatch) {
        const rawId = artMatch[1];
        // Try exact id first (e.g. "3ga"), then the base number (e.g. "3"),
        // then the first segment of a range ("3g-3ge" → "3g").
        const candidates = [rawId];
        const firstInRange = rawId.split('-')[0];
        if (firstInRange !== rawId) candidates.push(firstInRange);
        const baseNum = rawId.match(/^\d+/)?.[0];
        if (baseNum && !candidates.includes(baseNum)) candidates.push(baseNum);
        for (const candidate of candidates) {
          const found = findArticle(candidate);
          if (found) {
            charStart = found.start;
            charEnd = found.end;
            matchedText = text.slice(charStart, charEnd);
            break;
          }
        }
      }

      // 2. Annex reference (e.g. "ANNEX II", "Annex IIa") — case-insensitive
      if (charStart < 0) {
        const annexMatch = highlightQuery.match(/^Annex\s+([IVX\d]+[a-z]*)/i);
        if (annexMatch) {
          const annexId = annexMatch[1];
          // Prefer the formal heading "ANNEX <id>" at line start; fall back to
          // the first inline mention anywhere in the text so the reader still
          // lands near the relevant passage.
          const headingRegex = new RegExp(`^ANNEX\\s+${annexId}\\b[^\\n]*`, 'im');
          const headingMatch = text.match(headingRegex);
          if (headingMatch && headingMatch.index !== undefined) {
            charStart = headingMatch.index;
            charEnd = headingMatch.index + headingMatch[0].length;
            matchedText = text.slice(charStart, charEnd);
          } else {
            const inlineRegex = new RegExp(`Annex\\s+${annexId}\\b`, 'i');
            const inlineMatch = text.match(inlineRegex);
            if (inlineMatch && inlineMatch.index !== undefined) {
              charStart = inlineMatch.index;
              charEnd = inlineMatch.index + inlineMatch[0].length;
              matchedText = text.slice(charStart, charEnd);
            }
          }
        }
      }

      // 3. Recital reference — accepts "(31)", "Recital 5", "Recital 5-7"
      if (charStart < 0) {
        const recitalMatch = highlightQuery.match(/^(?:Recital\s+(\d+)(?:\s*[-–]\s*\d+)?|\((\d+)\))/i);
        if (recitalMatch) {
          const num = recitalMatch[1] || recitalMatch[2];
          const regex = new RegExp(`^\\(${num}\\)\\s[^\\n]*`, 'm');
          const m = text.match(regex);
          if (m && m.index !== undefined) {
            charStart = m.index;
            // Cap recital highlight to first 200 chars to avoid huge spans
            charEnd = Math.min(m.index + m[0].length, m.index + 200);
            matchedText = text.slice(charStart, charEnd);
          }
        }
      }

      // 4. Section reference (e.g. "Section 2.4", "2.4", "2.1.1") — used by
      //    Communications and strategies that structure content by numbered
      //    headings rather than formal recitals/articles.
      if (charStart < 0) {
        const sectionMatch = highlightQuery.match(/^(?:Section\s+)?(\d+(?:\.\d+)+)/i);
        if (sectionMatch) {
          const secNum = sectionMatch[1];
          const regex = new RegExp(`^${secNum.replace(/\./g, '\\.')}\\.?\\s+\\S[^\\n]*`, 'm');
          const m = text.match(regex);
          if (m && m.index !== undefined) {
            charStart = m.index;
            charEnd = m.index + m[0].length;
            matchedText = text.slice(charStart, charEnd);
          }
        }
      }

      // 5. Raw text search fallback
      if (charStart < 0) {
        const idx = text.toLowerCase().indexOf(highlightQuery.toLowerCase());
        if (idx !== -1) {
          charStart = idx;
          charEnd = idx + highlightQuery.length;
          matchedText = text.slice(charStart, charEnd);
        }
      }

      // Abort if we couldn't locate the reference
      if (charStart < 0 || charEnd <= charStart) return;

      // Create permanent in-memory annotation (re-render will render it inline)
      const alreadyExists = annotations.some(
        a => a.tag === 'sectoral_policy_link' && a.char_start === charStart
      );
      if (!alreadyExists) {
        const aiAnnotation: Annotation & { user_display_name?: string } = {
          id: `ai-link-${charStart}`,
          policy_id: policyId,
          tag: 'sectoral_policy_link',
          text_excerpt: matchedText || highlightQuery,
          char_start: charStart,
          char_end: charEnd,
          note: highlightCitation
            ? `AI-generated — ${highlightCitation}`
            : `AI-generated — connection from Sectoral Policy Overview`,
          created_at: new Date().toISOString(),
          user_display_name: 'AI-generated',
        };
        setAnnotations(prev => [...prev, aiAnnotation]);
      }

      // Scroll to the annotation after React re-renders with the new span
      requestAnimationFrame(() => {
        setTimeout(() => {
          const c = containerRef.current;
          if (!c) return;
          const el = c.querySelector(`[data-start="${charStart}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [highlightQuery, highlightCitation, text, policyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect references to other policies in the text
  const policyRefs = useMemo(() => {
    if (!allPolicies || allPolicies.length === 0) return [];
    const refs: PolicyRef[] = [];
    // Build search terms: map from searchable name → policy id + display title
    const searchTerms: { pattern: string; id: string; title: string }[] = [];
    for (const p of allPolicies) {
      if (p.id === policyId) continue; // Skip self-references
      // Add short_title
      searchTerms.push({ pattern: p.short_title, id: p.id, title: p.short_title });
      // Add common abbreviations and alternative names
      const abbrevMap: Record<string, string[]> = {
        'eu-ets-directive': ['EU ETS', 'Emissions Trading System', 'ETS Directive'],
        'effort-sharing-regulation': ['Effort Sharing Regulation', 'ESR'],
        'lulucf-regulation': ['LULUCF'],
        'renewable-energy-directive': ['RED II', 'RED III', 'Renewable Energy Directive'],
        'energy-efficiency-directive': ['Energy Efficiency Directive', 'EED'],
        'cbam-regulation': ['CBAM', 'Carbon Border Adjustment'],
        'taxonomy-regulation': ['EU Taxonomy', 'Taxonomy Regulation'],
        'sfdr': ['SFDR', 'Sustainable Finance Disclosure'],
        'csrd': ['CSRD', 'Corporate Sustainability Reporting'],
        'co2-cars-regulation': ['CO2 standards for cars', 'CO2 emission standards'],
        'afir-regulation': ['AFIR', 'Alternative Fuels Infrastructure'],
        'epbd-recast': ['EPBD', 'Energy Performance of Buildings'],
        'eu-green-deal': ['European Green Deal', 'Green Deal'],
        'fit-for-55': ['Fit for 55'],
        'social-climate-fund': ['Social Climate Fund'],
        'methane-regulation': ['Methane Regulation'],
        'nature-restoration-law': ['Nature Restoration Law', 'Nature Restoration'],
        'governance-regulation': ['Governance Regulation', 'Energy Union Governance'],
        'industrial-emissions-directive': ['Industrial Emissions Directive', 'IED'],
        'net-zero-industry-act': ['Net-Zero Industry Act', 'NZIA'],
        'critical-raw-materials-act': ['Critical Raw Materials Act', 'CRM Act'],
        'deforestation-regulation': ['Deforestation Regulation', 'EUDR'],
        'fueleu-maritime': ['FuelEU Maritime'],
        'refueleu-aviation': ['ReFuelEU Aviation', 'SAF Regulation'],
        'ai-act': ['AI Act', 'Artificial Intelligence Act'],
        'digital-services-act': ['Digital Services Act', 'DSA'],
        'digital-markets-act': ['Digital Markets Act', 'DMA'],
        'data-act': ['Data Act'],
        'batteries-regulation': ['Batteries Regulation'],
        'csddd': ['CSDDD', 'Corporate Sustainability Due Diligence'],
        'f-gas-regulation': ['F-Gas Regulation', 'F-gas Regulation'],
        'eu-climate-law': ['European Climate Law', 'Climate Law'],
        'cyber-resilience-act': ['Cyber Resilience Act', 'CRA'],
        'nis2-directive': ['NIS2', 'NIS 2 Directive'],
        'dora-regulation': ['DORA', 'Digital Operational Resilience'],
        'reach-regulation': ['REACH'],
        'european-chips-act': ['Chips Act', 'European Chips Act'],
        'horizon-europe': ['Horizon Europe'],
        'ten-t-regulation': ['TEN-T'],
        'euro-7-regulation': ['Euro 7'],
        'packaging-waste-regulation': ['Packaging Waste Regulation'],
        'waste-framework-directive': ['Waste Framework Directive'],
        'single-use-plastics-directive': ['Single-Use Plastics'],
        'water-framework-directive': ['Water Framework Directive'],
        'foreign-subsidies-regulation': ['Foreign Subsidies Regulation'],
        'anti-coercion-instrument': ['Anti-Coercion Instrument'],
        'ecodesign-sustainable-products': ['Ecodesign Regulation', 'Ecodesign for Sustainable Products'],
        'cap-strategic-plans': ['CAP Strategic Plans', 'Common Agricultural Policy'],
        'platform-workers-directive': ['Platform Workers Directive'],
      };
      const abbrevs = abbrevMap[p.id];
      if (abbrevs) {
        for (const a of abbrevs) {
          searchTerms.push({ pattern: a, id: p.id, title: p.short_title });
        }
      }
    }
    // Sort by pattern length descending so longer matches take priority
    searchTerms.sort((a, b) => b.pattern.length - a.pattern.length);

    // Find all occurrences in text
    const lowerText = text.toLowerCase();
    const usedRanges: { start: number; end: number }[] = [];
    for (const term of searchTerms) {
      const lowerPattern = term.pattern.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerPattern, searchFrom);
        if (idx === -1) break;
        const end = idx + term.pattern.length;
        // Check word boundaries (don't match inside words)
        const before = idx > 0 ? lowerText[idx - 1] : ' ';
        const after = end < lowerText.length ? lowerText[end] : ' ';
        const isWordBoundary = /[\s,;:.()\[\]"'\/\-]/.test(before) && /[\s,;:.()\[\]"'\/\-]/.test(after);
        // Check no overlap with existing refs
        const overlaps = usedRanges.some(r => idx < r.end && end > r.start);
        if (isWordBoundary && !overlaps) {
          refs.push({ start: idx, end, policyId: term.id, policyTitle: term.title });
          usedRanges.push({ start: idx, end });
        }
        searchFrom = idx + 1;
      }
    }
    return refs;
  }, [text, allPolicies, policyId]);

  // Build ordered, non-overlapping spans — annotations take priority over policy-refs
  const segments = useMemo(() => {
    // Priority order: annotations > citations > policy-refs
    const annSpans = annotations.map(a => ({ start: a.char_start, end: a.char_end, type: 'annotation' as const, data: a, priority: 0 }));
    const citeSpans = citations.map(c => ({ start: c.char_start, end: c.char_end, type: 'citation' as const, data: c, priority: 1 }));
    const refSpans = policyRefs.map(r => ({ start: r.start, end: r.end, type: 'policy-ref' as const, data: r, priority: 2 }));
    // Sort by priority first (annotations win), then by position
    const allSpans = [...annSpans, ...citeSpans, ...refSpans].sort((a, b) => a.priority - b.priority || a.start - b.start);

    // Remove overlapping spans (higher priority spans already placed first)
    const usedRanges: { start: number; end: number }[] = [];
    const spans: Span[] = [];
    for (const span of allSpans) {
      const overlaps = usedRanges.some(r => span.start < r.end && span.end > r.start);
      if (!overlaps) {
        spans.push(span);
        usedRanges.push({ start: span.start, end: span.end });
      }
    }
    spans.sort((a, b) => a.start - b.start);

    const result: { text: string; span: Span | null; start: number }[] = [];
    let pos = 0;
    for (const span of spans) {
      if (span.start < pos) continue;
      if (span.start > pos) result.push({ text: text.slice(pos, span.start), span: null, start: pos });
      result.push({ text: text.slice(span.start, span.end), span, start: span.start });
      pos = span.end;
    }
    if (pos < text.length) result.push({ text: text.slice(pos), span: null, start: pos });
    return result;
  }, [text, citations, annotations, policyRefs]);

  // Handle text selection — require auth before showing popover
  const handleMouseUp = useCallback(async () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    if (!selectedText.trim()) return;

    // Find the segment elements containing the selection start/end. A segment
    // can wrap multiple inner spans (one per line) so `range.startOffset` is
    // relative to the inner text node — NOT the segment. We must compute the
    // distance from the segment root to the selection start/end by measuring
    // the text length of a sub-range from segment-start to selection-start.
    const resolveElement = (node: Node): Element | null => {
      if (node.nodeType === Node.ELEMENT_NODE) return node as Element;
      return node.parentElement;
    };
    const startEl = resolveElement(range.startContainer)?.closest('[data-start]') as HTMLElement | null;
    const endEl = resolveElement(range.endContainer)?.closest('[data-start]') as HTMLElement | null;
    if (!startEl) return;

    const segStart = parseInt(startEl.getAttribute('data-start') || '0');
    // Measure chars from start of the segment element to the selection start
    const startProbe = document.createRange();
    startProbe.selectNodeContents(startEl);
    startProbe.setEnd(range.startContainer, range.startOffset);
    const offsetInStartSeg = startProbe.toString().length;
    let charStart = segStart + offsetInStartSeg;

    let charEnd: number;
    if (endEl) {
      const segEnd = parseInt(endEl.getAttribute('data-start') || '0');
      const endProbe = document.createRange();
      endProbe.selectNodeContents(endEl);
      endProbe.setEnd(range.endContainer, range.endOffset);
      charEnd = segEnd + endProbe.toString().length;
    } else {
      charEnd = charStart + selectedText.length;
    }

    // Sanity-check: if the computed slice doesn't match the actual selection,
    // try to relocate by searching for the selected text nearby.
    if (text.slice(charStart, charEnd) !== selectedText) {
      const nearbyIdx = text.indexOf(selectedText, Math.max(0, charStart - 500));
      if (nearbyIdx !== -1 && Math.abs(nearbyIdx - charStart) < 500) {
        charStart = nearbyIdx;
        charEnd = nearbyIdx + selectedText.length;
      }
    }

    // Require auth before allowing annotation
    const authedUser = await requireAuth('Sign in to annotate policy text.');
    if (!authedUser) return;
    // Store authed user in ref immediately so handleSave can access it
    userRef.current = authedUser;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelection({
      start: charStart, end: charEnd, text: selectedText,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
    setNewTag(tags[0]?.name || 'policy_gap');
    setNewNote('');
    setShowAnnotationGuide(false);
  }, [tags, requireAuth, text]);

  const handleSave = useCallback(async () => {
    const currentUser = userRef.current;
    if (!selection || !currentUser) return;
    setSaving(true);

    // Optimistically add annotation to UI immediately
    const optimisticAnn: Annotation & { user_display_name?: string } = {
      id: crypto.randomUUID(),
      policy_id: policyId,
      tag: newTag,
      text_excerpt: selection.text,
      char_start: selection.start,
      char_end: selection.end,
      note: newNote,
      created_at: new Date().toISOString(),
      user_display_name: 'Guest',
    };
    setAnnotations(prev => [...prev, optimisticAnn]);
    setSelection(null);
    setSaving(false);
    onAnnotationsChange?.();

    // Then persist in background
    try {
      await saveAnnotationRemote({
        policy_id: policyId,
        tag: newTag,
        text_excerpt: selection.text,
        char_start: selection.start,
        char_end: selection.end,
        note: newNote,
      }, currentUser.id);
      // Refresh to get the real saved annotation (with correct id)
      const updated = await fetchAnnotations(policyId);
      setAnnotations(updated);
      onAnnotationsChange?.();
    } catch (err) {
      console.error('Failed to save annotation:', err);
      // Optimistic update already shown, so user still sees it
    }
  }, [selection, newTag, newNote, policyId, onAnnotationsChange]);

  // Render a text segment with proper formatting
  const renderTextSegment = (segText: string, segStart: number, key: number) => {
    const lines = segText.split('\n');
    return (
      <span key={key} data-start={segStart}>
        {lines.map((line, li) => {
          const trimmed = line.trim();

          // Regulation/Directive title (all caps header)
          if (/^(REGULATION|DIRECTIVE|COMMUNICATION|CHAPTER|TITLE)\s/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <strong className="text-primary font-bold text-base block mt-6 mb-2 border-b border-primary/20 pb-1">{line}</strong>
              </span>
            );
          }

          // Article headers
          if (/^Article\s+\d+/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <strong className="text-primary font-bold text-base block mt-5 mb-1" id={`art-${trimmed.match(/\d+/)?.[0]}`}>{line}</strong>
              </span>
            );
          }

          // Section headers (Chapter, Title headings with em-dash)
          if (/^(CHAPTER|TITLE)\s+[IVX\d]+/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <strong className="text-tertiary-dark font-bold text-sm block mt-6 mb-2 uppercase tracking-wide border-b border-grey-200 pb-1">{line}</strong>
              </span>
            );
          }

          // Whereas recitals
          if (/^\(\d+\)\s/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <span className="block pl-6 -indent-6 my-1 text-tertiary">{line}</span>
              </span>
            );
          }

          // Sub-items (a), (b), etc.
          if (/^\([a-z]\)\s/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <span className="block pl-8 -indent-4 my-0.5">{line}</span>
              </span>
            );
          }

          // Sub-sub items (i), (ii), etc.
          if (/^\([ivx]+\)\s/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <span className="block pl-12 -indent-4 my-0.5">{line}</span>
              </span>
            );
          }

          // Numbered paragraphs 1., 2., etc.
          if (/^\d+\.\s/.test(trimmed) && trimmed.length > 10) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <span className="block pl-4 -indent-4 my-1">{line}</span>
              </span>
            );
          }

          // "Done at" closing
          if (/^Done at/.test(trimmed)) {
            return (
              <span key={li}>
                {li > 0 && '\n'}
                <span className="block mt-6 italic text-tertiary">{line}</span>
              </span>
            );
          }

          return <span key={li}>{li > 0 && '\n'}{line}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Annotation guide banner */}
      {showAnnotationGuide && annotations.length === 0 && (
        <div className="mb-4 bg-secondary/5 border border-secondary/20 rounded-lg p-3 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-tertiary-dark mb-1">Annotate this document</p>
            <p className="text-xs text-tertiary">Select any text to add annotations with tags like <span className="inline-block px-1.5 py-0.5 rounded text-white text-xs" style={{backgroundColor: '#8B5CF6'}}>quantitative target</span>, <span className="inline-block px-1.5 py-0.5 rounded text-white text-xs" style={{backgroundColor: '#EF4444'}}>policy gap</span>, <span className="inline-block px-1.5 py-0.5 rounded text-white text-xs" style={{backgroundColor: '#10B981'}}>strong commitment</span>, and more.</p>
          </div>
          <button onClick={() => setShowAnnotationGuide(false)} className="text-tertiary hover:text-tertiary-dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Annotation statistics bar — clicking a tag badge scrolls to the first annotation with that tag */}
      {annotations.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-tertiary font-medium">{annotations.length} annotation{annotations.length !== 1 ? 's' : ''}</span>
          <span className="text-grey-300">|</span>
          {Object.entries(annotations.reduce<Record<string, number>>((acc, a) => { acc[a.tag] = (acc[a.tag] || 0) + 1; return acc; }, {}))
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const first = annotations.find(a => a.tag === tag);
                  if (!first || !containerRef.current) return;
                  const el = containerRef.current.querySelector(`[data-start="${first.char_start}"]`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('annotation-flash');
                    setTimeout(() => el.classList.remove('annotation-flash'), 2000);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:ring-2 hover:ring-offset-1 transition cursor-pointer"
                style={{ backgroundColor: `${getTagColor(tag)}15` }}
                title={`Jump to first "${tag.replace(/_/g, ' ')}" annotation`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTagColor(tag) }} />
                <span className="text-tertiary-dark">{tag.replace(/_/g, ' ')} ({count})</span>
              </button>
            ))}
        </div>
      )}

      {/* Annotation gutter (M·04 #7) — small dots in the left margin marking
          where each annotation lives in the document. Click a dot to jump.
          Positions are recomputed on annotations change + resize via the
          AnnotationGutter sub-component. */}
      <AnnotationGutter
        containerRef={containerRef}
        annotations={annotations}
        onJump={(charStart) => {
          if (typeof window === 'undefined') return;
          window.dispatchEvent(new CustomEvent('scroll-to-annotation', { detail: { charStart } }));
        }}
      />

      {/* Document body */}
      <div ref={containerRef} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp}
        className="font-serif text-[15px] leading-[1.8] text-tertiary-dark whitespace-pre-wrap selection:bg-secondary/20 cursor-text">
        {segments.map((seg, i) => {
          if (seg.span?.type === 'citation') {
            const cite = seg.span.data as Citation;
            return (
              <a key={i} data-start={seg.start} href={`/policy-navigator/policy/?id=${cite.cited_policy_id}`}
                className="text-secondary underline decoration-secondary/30 hover:decoration-secondary hover:bg-secondary/5 transition-colors rounded px-0.5"
                title={`References: ${cite.cited_policy_title}`}>
                {seg.text}
              </a>
            );
          }
          if (seg.span?.type === 'policy-ref') {
            const ref = seg.span.data as PolicyRef;
            return (
              <Link key={i} data-start={seg.start} href={buildContentAnalysisUrl({ policyId: ref.policyId })}
                className="text-secondary font-medium underline decoration-secondary/30 decoration-dotted hover:decoration-secondary hover:decoration-solid hover:bg-secondary/5 transition-colors rounded px-0.5 cursor-pointer"
                title={`Go to: ${ref.policyTitle} — Opens in Content Analysis module`}>
                {seg.text}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline ml-0.5 -mt-0.5 opacity-40" style={{ verticalAlign: 'middle' }}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            );
          }
          if (seg.span?.type === 'annotation') {
            const ann = seg.span.data as Annotation & { user_display_name?: string };
            const isHovered = hoveredAnnotation === ann.id;
            const isEditing = editingAnnotation === ann.id;
            const tagColor = getTagColor(ann.tag);
            return (
              <span key={i} data-start={seg.start}
                className="ann-highlight relative cursor-pointer rounded px-0.5 -mx-0.5 transition-all duration-200"
                style={{
                  backgroundColor: `${tagColor}30`,
                  borderBottom: `3px solid ${tagColor}`,
                  boxShadow: isHovered ? `0 0 0 2px ${tagColor}60, inset 0 -4px 0 ${tagColor}20` : 'none',
                  outline: isHovered ? `1px solid ${tagColor}40` : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingAnnotation === ann.id) {
                    setEditingAnnotation(null);
                  } else {
                    setEditingAnnotation(ann.id);
                    setEditTag(ann.tag);
                    setEditNote(ann.note || '');
                    setHoveredAnnotation(null);
                  }
                }}
                onMouseEnter={() => { if (!isEditing) setHoveredAnnotation(ann.id); }}
                onMouseLeave={() => setHoveredAnnotation(null)}>
                {/* Small tag indicator on the left edge */}
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 -mb-0.5" style={{ backgroundColor: tagColor, verticalAlign: 'middle' }} />
                {seg.text}
                {/* Hover tooltip */}
                {isHovered && !isEditing && (
                  <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white rounded-lg shadow-xl border border-grey-200 p-3 text-left pointer-events-none"
                    style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px', lineHeight: '1.4', whiteSpace: 'normal' }}>
                    <span className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tagColor }} />
                      <span className="font-bold text-tertiary-dark uppercase tracking-wider" style={{ fontSize: '10px' }}>{ann.tag.replace(/_/g, ' ')}</span>
                    </span>
                    {ann.note && <span className="block text-tertiary-dark mb-1">{ann.note}</span>}
                    <span className="block text-grey-400" style={{ fontSize: '10px' }}>
                      {ann.user_display_name && <>{ann.user_display_name} &middot; </>}
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                    <span className="block text-secondary mt-1.5 font-medium" style={{ fontSize: '10px' }}>Click to edit</span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                  </span>
                )}
                {/* Edit popover */}
                {isEditing && (
                  <span className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-white rounded-xl shadow-2xl border border-grey-200 p-4 text-left"
                    style={{ fontFamily: 'system-ui, sans-serif', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'normal' }}
                    onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-tertiary-dark flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Annotation
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); setEditingAnnotation(null); }}
                        className="text-grey-400 hover:text-tertiary-dark">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </span>
                    {/* Tag selector for edit */}
                    <span className="block text-xs font-medium text-tertiary-dark uppercase tracking-wider mb-1.5">Tag</span>
                    <span className="flex flex-wrap gap-1.5 mb-3">
                      {tags.slice(0, 8).map(t => (
                        <button key={t.name} onClick={(e) => { e.stopPropagation(); setEditTag(t.name); }}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition ${editTag === t.name ? 'border-transparent text-white font-medium' : 'border-grey-200 text-tertiary-dark hover:border-grey-300'}`}
                          style={editTag === t.name ? { backgroundColor: getTagColor(t.name) } : {}}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTagColor(t.name) }} />
                          {t.name.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </span>
                    {/* Note editor */}
                    <span className="block text-xs font-medium text-tertiary-dark uppercase tracking-wider mb-1.5">Note</span>
                    <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)}
                      className="w-full text-sm border border-grey-200 rounded-lg px-3 py-2 mb-3 h-16 resize-none focus:ring-2 focus:ring-secondary/40 focus:outline-none"
                      style={{ fontFamily: 'system-ui, sans-serif' }}
                      onClick={(e) => e.stopPropagation()} />
                    {/* Action buttons */}
                    <span className="flex gap-2">
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        await updateAnnotationRemote(ann.id, { tag: editTag, note: editNote });
                        const updated = await fetchAnnotations(policyId);
                        setAnnotations(updated);
                        setEditingAnnotation(null);
                        onAnnotationsChange?.();
                      }} className="flex-1 bg-secondary text-white text-xs py-2 rounded-lg font-medium hover:bg-secondary-dark transition">
                        Save Changes
                      </button>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this annotation?')) {
                          await deleteAnnotationRemote(ann.id);
                          const updated = await fetchAnnotations(policyId);
                          setAnnotations(updated);
                          setEditingAnnotation(null);
                          onAnnotationsChange?.();
                        }
                      }} className="px-3 bg-red-50 text-red-600 text-xs py-2 rounded-lg font-medium hover:bg-red-100 transition">
                        Delete
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingAnnotation(null); }}
                        className="px-3 bg-grey-100 text-tertiary text-xs py-2 rounded-lg font-medium hover:bg-grey-200 transition">
                        Cancel
                      </button>
                    </span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                  </span>
                )}
              </span>
            );
          }
          return renderTextSegment(seg.text, seg.start, i);
        })}
      </div>

      {/* Selection popover for creating annotations */}
      {selection && (
        <div className="absolute z-40 bg-white rounded-xl shadow-2xl border border-grey-200 p-4 sm:p-5 w-[calc(100%-1rem)] sm:w-80 left-2 sm:left-auto"
          style={{
            ...( typeof window !== 'undefined' && window.innerWidth >= 640
              ? { left: Math.max(0, Math.min(selection.x - 160, (containerRef.current?.offsetWidth || 600) - 320)), top: selection.y - 240 }
              : { top: Math.max(8, selection.y - 280) }
            ),
          }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <p className="text-sm font-bold text-tertiary-dark">Add Annotation</p>
          </div>

          {/* Selected text preview */}
          <div className="bg-grey-50 rounded-lg p-2.5 mb-3 border-l-3 border-secondary">
            <p className="text-xs text-tertiary line-clamp-3 italic">&ldquo;{selection.text}&rdquo;</p>
          </div>

          {/* Tag selector — top 5 visible, rest in dropdown */}
          <label className="text-xs font-medium text-tertiary-dark uppercase tracking-wider mb-1.5 block">Tag</label>
          {(() => {
            // Sort tags: most-used first based on annotations
            const tagUsage = annotations.reduce<Record<string, number>>((acc, a) => { acc[a.tag] = (acc[a.tag] || 0) + 1; return acc; }, {});
            const sortedTags = [...tags].sort((a, b) => (tagUsage[b.name] || 0) - (tagUsage[a.name] || 0));
            const topTags = sortedTags.slice(0, 5);
            const moreTags = sortedTags.slice(5);
            return (
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {topTags.map(t => (
                    <button key={t.name} onClick={() => { setNewTag(t.name); setShowAllTags(false); }}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all ${newTag === t.name ? 'border-transparent text-white font-medium' : 'border-grey-200 text-tertiary-dark hover:border-grey-300'}`}
                      style={newTag === t.name ? { backgroundColor: getTagColor(t.name), boxShadow: `0 0 0 2px ${getTagColor(t.name)}` } : {}}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getTagColor(t.name) }} />
                      <span className="truncate">{t.name.replace(/_/g, ' ')}</span>
                    </button>
                  ))}
                </div>

                {/* More tags dropdown */}
                {(moreTags.length > 0 || true) && (
                  <div className="mt-1.5 relative">
                    <button onClick={() => { setShowAllTags(!showAllTags); setShowAddTag(false); }}
                      className="text-xs text-secondary hover:underline flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={showAllTags ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                      </svg>
                      {showAllTags ? 'Show less' : `More tags (${moreTags.length})`}
                    </button>

                    {showAllTags && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {moreTags.map(t => (
                          <button key={t.name} onClick={() => { setNewTag(t.name); setShowAllTags(false); }}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all ${newTag === t.name ? 'border-transparent text-white font-medium' : 'border-grey-200 text-tertiary-dark hover:border-grey-300'}`}
                            style={newTag === t.name ? { backgroundColor: getTagColor(t.name), boxShadow: `0 0 0 2px ${getTagColor(t.name)}` } : {}}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getTagColor(t.name) }} />
                            <span className="truncate">{t.name.replace(/_/g, ' ')}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add new tag */}
                    <button onClick={() => { setShowAddTag(!showAddTag); setShowAllTags(false); }}
                      className="mt-1.5 text-xs text-secondary hover:underline flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                      </svg>
                      Add custom tag
                    </button>

                    {showAddTag && (
                      <div className="mt-1.5 p-2.5 border border-grey-200 rounded-lg bg-grey-50">
                        <input type="text" value={customTagName} onChange={e => setCustomTagName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                          placeholder="tag_name" className="w-full text-xs border border-grey-300 rounded px-2 py-1 mb-1.5 focus:ring-1 focus:ring-secondary/40" />
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="text-xs text-tertiary">Color:</label>
                          <input type="color" value={customTagColor} onChange={e => setCustomTagColor(e.target.value)}
                            className="w-6 h-6 rounded border-0 cursor-pointer" />
                          <span className="text-xs text-tertiary">{customTagColor}</span>
                        </div>
                        <button onClick={async () => {
                          if (!customTagName) return;
                          const tag: TagDef = { name: customTagName, color: customTagColor, description: '' };
                          await addCustomTagRemote(tag, user?.id || '');
                          const updatedTags = await fetchTags();
                          setTags(updatedTags);
                          setNewTag(customTagName);
                          setShowAddTag(false);
                          setCustomTagName('');
                        }} disabled={!customTagName}
                          className="w-full text-xs bg-secondary text-white py-1 rounded font-medium hover:bg-secondary-dark disabled:opacity-50 transition">
                          Create Tag
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Note input */}
          <label className="text-xs font-medium text-tertiary-dark uppercase tracking-wider mb-1.5 block">Note (optional)</label>
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder="Why is this noteworthy?"
            className="w-full text-sm border border-grey-200 rounded-lg px-3 py-2 mb-3 h-20 resize-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/40 transition" />

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-secondary text-white text-sm py-2 rounded-lg font-medium hover:bg-secondary-dark disabled:opacity-50 transition flex items-center justify-center gap-1.5">
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  Save Annotation
                </>
              )}
            </button>
            <button onClick={() => setSelection(null)}
              className="px-4 bg-grey-100 text-tertiary text-sm py-2 rounded-lg font-medium hover:bg-grey-200 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CSS for flash animation */}
      <style jsx>{`
        .annotation-flash {
          animation: flash-highlight 2s ease-out;
        }
        @keyframes flash-highlight {
          0%, 30% { outline: 3px solid #3B82F6; outline-offset: 2px; background-color: rgba(59, 130, 246, 0.15) !important; }
          100% { outline: 0px solid transparent; outline-offset: 0px; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnnotationGutter (M·04 #7) — left-side dots, one per annotation.
// Positions are derived after mount by querying [data-start="<charStart>"]
// inside the document body and reading offsetTop. ResizeObserver re-runs
// the calculation when the body reflows (e.g., on viewport change).
// ---------------------------------------------------------------------------
function AnnotationGutter({
  containerRef,
  annotations,
  onJump,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  annotations: { id: string; char_start: number; char_end: number }[];
  onJump: (charStart: number) => void;
}) {
  const [marks, setMarks] = useState<{ id: string; top: number; charStart: number }[]>([]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const compute = () => {
      const containerTop = node.getBoundingClientRect().top;
      const found: { id: string; top: number; charStart: number }[] = [];
      for (const a of annotations) {
        const el = node.querySelector(`[data-start="${a.char_start}"]`) as HTMLElement | null;
        if (!el) continue;
        const top = el.getBoundingClientRect().top - containerTop;
        if (Number.isFinite(top)) found.push({ id: a.id, top, charStart: a.char_start });
      }
      setMarks(found);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(node);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [annotations, containerRef]);

  if (marks.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-0 bottom-0 pointer-events-none"
      style={{ width: 16, transform: 'translateX(-22px)' }}
    >
      {marks.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onJump(m.charStart)}
          title="Jump to annotation"
          className="mh-focus mh-motion-fast absolute pointer-events-auto rounded-full"
          style={{
            top: m.top,
            left: 0,
            width: 8,
            height: 8,
            background: 'var(--mh-status-info)',
            border: '1px solid var(--mh-card)',
            transform: 'translateY(2px)',
          }}
        />
      ))}
    </div>
  );
}
