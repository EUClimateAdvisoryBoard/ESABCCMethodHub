// ============================================================================
// Citeproc-js Citation Formatting Engine
// Handles CSL-based citation and bibliography formatting
// ============================================================================

import fs from 'fs';
import path from 'path';

// Try to load citeproc - falls back to simple formatting if not available
let CSL: any;
try {
  CSL = require('citeproc');
} catch {
  CSL = null;
  console.warn('citeproc not available, using fallback formatter');
}

// ── CSL Styles Directory ──

const stylesDir = path.join(__dirname, '..', 'csl-styles');
const localesDir = path.join(__dirname, '..', 'csl-locales');

function loadStyle(styleId: string): string | null {
  const filePath = path.join(stylesDir, `${styleId}.csl`);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function loadLocale(lang: string): string | null {
  const filePath = path.join(localesDir, `locales-${lang}.xml`);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ── Format Citations ──

export function formatCitations(
  items: any[],
  styleId: string,
  format: 'html' | 'text' = 'text'
): { citations: string[] } {
  if (!CSL || !loadStyle(styleId)) {
    // Fallback: simple author-date formatting
    return { citations: items.map(item => formatFallbackCitation(item)) };
  }

  try {
    const itemRegistry: Record<string, any> = {};
    items.forEach(item => { itemRegistry[item.id] = item; });

    const sys = {
      retrieveLocale: (lang: string) => loadLocale(lang) || loadLocale('en-US') || '',
      retrieveItem: (id: string) => itemRegistry[id],
    };

    const style = loadStyle(styleId)!;
    const citeproc = new CSL.Engine(sys, style);
    citeproc.setOutputFormat(format);
    citeproc.updateItems(Object.keys(itemRegistry));

    const citations = items.map((item, index) => {
      const citationCluster = {
        citationItems: [{ id: item.id }],
        properties: { noteIndex: index + 1 },
      };
      const result = citeproc.processCitationCluster(
        citationCluster,
        items.slice(0, index).map((_, i) => [`cite-${i}`, i + 1]),
        items.slice(index + 1).map((_, i) => [`cite-${index + 1 + i}`, index + 2 + i])
      );
      return result[1]?.map(([_idx, text]: [number, string]) => text)?.[0] || '';
    });

    return { citations };
  } catch (err) {
    console.error('citeproc error:', err);
    return { citations: items.map(item => formatFallbackCitation(item)) };
  }
}

// ── Generate Bibliography ──

export function generateBibliography(
  items: any[],
  styleId: string,
  format: 'html' | 'text' = 'text'
): { entries: string[]; params?: any } {
  if (!CSL || !loadStyle(styleId)) {
    return { entries: items.map(item => formatFallbackBibEntry(item)) };
  }

  try {
    const itemRegistry: Record<string, any> = {};
    items.forEach(item => { itemRegistry[item.id] = item; });

    const sys = {
      retrieveLocale: (lang: string) => loadLocale(lang) || loadLocale('en-US') || '',
      retrieveItem: (id: string) => itemRegistry[id],
    };

    const style = loadStyle(styleId)!;
    const citeproc = new CSL.Engine(sys, style);
    citeproc.setOutputFormat(format);
    citeproc.updateItems(Object.keys(itemRegistry));

    const [params, entries] = citeproc.makeBibliography();
    return { params, entries };
  } catch (err) {
    console.error('citeproc bibliography error:', err);
    return { entries: items.map(item => formatFallbackBibEntry(item)) };
  }
}

// ── Fallback Formatters (when citeproc not available) ──

function formatFallbackCitation(item: any): string {
  const authors = item.author || [];
  const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.';

  if (authors.length === 0) return `(${year})`;
  if (authors.length === 1) return `(${authors[0].family}, ${year})`;
  if (authors.length === 2) return `(${authors[0].family} & ${authors[1].family}, ${year})`;
  return `(${authors[0].family} et al., ${year})`;
}

function formatFallbackBibEntry(item: any): string {
  const authors = (item.author || [])
    .map((a: any) => `${a.family}${a.given ? ', ' + a.given.charAt(0) + '.' : ''}`)
    .join(', ');
  const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
  const title = item.title || '';
  const journal = item['container-title'] || '';
  const vol = item.volume ? `, ${item.volume}` : '';
  const issue = item.issue ? `(${item.issue})` : '';
  const pages = item.page ? `, ${item.page}` : '';
  const doi = item.DOI ? ` https://doi.org/${item.DOI}` : '';

  return `${authors} (${year}). ${title}. ${journal}${vol}${issue}${pages}.${doi}`;
}
