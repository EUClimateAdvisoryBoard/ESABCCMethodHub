// ============================================================================
// Word Add-in Taskpane — Main Entry Point
// ============================================================================

import {
  initConnection,
  searchReferences,
  getLibraries,
  syncLibrary,
  getWorkspaceMeta,
  parseChapterTag,
  RefSearchResult,
} from '../services/api';
import {
  insertCitation,
  insertMultiCitation as insertMultiCite,
  generateBibliography as genBib,
  refreshAllCitations as refreshAll,
  getAllCitations,
  getCitationCounts,
  CitationData,
  CitationCount,
} from '../services/citation';

import './taskpane.css';

// ── State ──

let currentLibraryId = '';
let currentStyleId = 'apa';
let citationBasket: CitationData[] = [];
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
// Latest search results (already enriched with workspace metadata), kept so the
// chapter filter can re-render without re-querying.
let currentResults: RefSearchResult[] = [];
// Active chapter filter — '' means "all chapters".
let chapterFilter = '';
// How many times each reference is cited in the document, keyed by refId.
let citationCounts = new Map<string, CitationCount>();

// ── Initialize ──

Office.onReady(async (info) => {
  if (info.host === Office.HostType.Word) {
    await initializeAddin();
  }
});

async function initializeAddin(): Promise<void> {
  const statusEl = document.getElementById('connectionStatus')!;

  try {
    const conn = await initConnection();

    if (conn.bridge) {
      statusEl.textContent = 'Connected via local bridge';
      statusEl.className = 'status connected';
      document.getElementById('bridgeStatus')!.textContent = 'Connected';
      document.getElementById('bridgeStatus')!.className = 'status-badge status-connected';
    } else if (conn.supabase) {
      statusEl.textContent = 'Connected to Supabase (direct)';
      statusEl.className = 'status connected';
      document.getElementById('supabaseStatus')!.textContent = 'Connected';
      document.getElementById('supabaseStatus')!.className = 'status-badge status-connected';
    } else {
      statusEl.textContent = 'No connection available';
      statusEl.className = 'status error';
    }

    // Load libraries
    await loadLibraries();

    // Set up search handler
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    searchInput.addEventListener('input', () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => handleSearch(searchInput.value), 300);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch(searchInput.value);
    });

    // Set up chapter filter
    const chapterFilterEl = document.getElementById('chapterFilter') as HTMLSelectElement;
    chapterFilterEl.addEventListener('change', () => {
      chapterFilter = chapterFilterEl.value;
      renderSearchResults(currentResults);
    });

    // Load how many times each paper is already cited in the document.
    await refreshCitationCounts();

    // Check URL params for initial view
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'bibliography') {
      switchTab('bibliography');
      scanDocumentCitations();
    } else if (view === 'refresh') {
      switchTab('bibliography');
      handleRefreshAll();
    }

    // Update doc info
    updateDocInfo();

  } catch (err) {
    statusEl.textContent = `Error: ${(err as Error).message}`;
    statusEl.className = 'status error';
  }
}

// ── Library Loading ──

async function loadLibraries(): Promise<void> {
  const select = document.getElementById('librarySelect') as HTMLSelectElement;

  try {
    const libraries = await getLibraries();
    select.innerHTML = '';

    if (libraries.length === 0) {
      select.innerHTML = '<option value="">No libraries found</option>';
      return;
    }

    for (const lib of libraries) {
      const option = document.createElement('option');
      option.value = lib.id;
      option.textContent = lib.name;
      select.appendChild(option);
    }

    currentLibraryId = libraries[0].id;
    select.value = currentLibraryId;

    select.addEventListener('change', () => {
      currentLibraryId = select.value;
    });
  } catch {
    select.innerHTML = '<option value="">Failed to load libraries</option>';
  }
}

// ── Search ──

async function handleSearch(query: string): Promise<void> {
  // No query → keep the prompt-to-search empty state.
  if (!query.trim()) {
    currentResults = [];
    updateChapterFilterOptions();
    showEmptyState();
    return;
  }

  const spinner = document.getElementById('searchSpinner')!;
  const refList = document.getElementById('refList')!;

  spinner.classList.remove('hidden');

  try {
    const results = await searchReferences(query, currentLibraryId);

    // Enrich each result with the project-workspace context — the whole-
    // document summary, chapter classification and notes — so the author can
    // see why a paper is in the library and filter by chapter before citing.
    try {
      const meta = await getWorkspaceMeta(results.map(r => r.id));
      for (const ref of results) {
        ref.summary = meta.summaries[ref.id] ?? ref.summary ?? null;
        ref.chapters = meta.chapters[ref.id] ?? [];
        if (!ref.notes && meta.notes[ref.id]) ref.notes = meta.notes[ref.id];
      }
    } catch {
      // Enrichment is best-effort; the core search results still render.
    }

    currentResults = results;
    updateChapterFilterOptions();
    renderSearchResults(results);
  } catch (err) {
    currentResults = [];
    updateChapterFilterOptions();
    refList.innerHTML = `<li class="ref-empty">Search error: ${(err as Error).message}</li>`;
  } finally {
    spinner.classList.add('hidden');
  }
}

// Populate the chapter filter dropdown from the chapters present in the current
// result set, so the filter only ever offers chapters the author can actually
// select down to.
function updateChapterFilterOptions(): void {
  const wrap = document.getElementById('chapterFilterWrap')!;
  const select = document.getElementById('chapterFilter') as HTMLSelectElement;

  const seen = new Map<string, string>(); // id → display name
  for (const ref of currentResults) {
    for (const id of ref.chapters || []) {
      const parsed = parseChapterTag(id);
      if (parsed && !seen.has(id)) seen.set(id, parsed.name);
    }
  }

  if (seen.size === 0) {
    wrap.classList.add('hidden');
    chapterFilter = '';
    return;
  }

  wrap.classList.remove('hidden');
  const sorted = Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  // Preserve the current selection if it is still available.
  if (chapterFilter && !seen.has(chapterFilter)) chapterFilter = '';

  select.innerHTML =
    `<option value="">All chapters</option>` +
    sorted.map(([id, name]) => `<option value="${escapeAttr(id)}">${escapeHtml(name)}</option>`).join('');
  select.value = chapterFilter;
}

function renderSearchResults(results: RefSearchResult[]): void {
  const refList = document.getElementById('refList')!;

  const visible = chapterFilter
    ? results.filter(r => (r.chapters || []).includes(chapterFilter))
    : results;

  if (results.length === 0) {
    refList.innerHTML = '<li class="ref-empty">No references found</li>';
    return;
  }

  if (visible.length === 0) {
    refList.innerHTML = '<li class="ref-empty">No references in the selected chapter</li>';
    return;
  }

  refList.innerHTML = visible.map(ref => {
    const authors = (ref.authors || [])
      .slice(0, 3)
      .map(a => a.family || a.given || '')
      .join(', ');
    const authorsDisplay = (ref.authors || []).length > 3 ? `${authors} et al.` : authors;

    const count = citationCounts.get(ref.id)?.count || 0;
    const countBadge = count > 0
      ? `<span class="cite-count" title="Already cited ${count} time(s) in this document">cited ${count}×</span>`
      : '';

    const chapterChips = (ref.chapters || [])
      .map(id => parseChapterTag(id))
      .filter((c): c is { name: string; color: string } => c !== null)
      .map(c => `<span class="chapter-chip" style="background:${escapeAttr(c.color)}1a;color:${escapeAttr(c.color)};border-color:${escapeAttr(c.color)}55">${escapeHtml(c.name)}</span>`)
      .join('');

    const summary = ref.summary || ref.abstract || '';
    const summaryBlock = summary
      ? `<div class="ref-summary"><span class="ref-block-label">Summary</span> ${escapeHtml(truncate(summary, 320))}</div>`
      : '';
    const notesBlock = ref.notes
      ? `<div class="ref-notes"><span class="ref-block-label">Notes</span> ${escapeHtml(truncate(ref.notes, 320))}</div>`
      : '';

    return `
      <li class="ref-item" data-id="${ref.id}">
        <div class="ref-item-content">
          <div class="ref-title">${escapeHtml(ref.title)}${countBadge}</div>
          <div class="ref-meta">${escapeHtml(authorsDisplay)}${ref.year ? ` (${ref.year})` : ''}</div>
          ${ref.container_title ? `<div class="ref-journal">${escapeHtml(ref.container_title)}</div>` : ''}
          ${chapterChips ? `<div class="chapter-chips">${chapterChips}</div>` : ''}
          ${summaryBlock}
          ${notesBlock}
          <div class="ref-key">[${escapeHtml(ref.citation_key || '')}]</div>
        </div>
        <div class="ref-actions">
          <button class="btn btn-insert" onclick="handleInsertSingle('${ref.id}', '${escapeAttr(ref.citation_key)}', ${escapeAttr(JSON.stringify(ref.csl_json))})">
            Insert
          </button>
          <button class="btn btn-add-basket" onclick="handleAddToBasket('${ref.id}', '${escapeAttr(ref.citation_key)}', ${escapeAttr(JSON.stringify(ref.csl_json))})">
            +
          </button>
        </div>
      </li>
    `;
  }).join('');
}

function showEmptyState(): void {
  document.getElementById('refList')!.innerHTML =
    '<li class="ref-empty">Type to search your reference library</li>';
}

// ── Citation Insertion (exposed to HTML onclick) ──

(window as any).handleInsertSingle = async function(refId: string, citationKey: string, cslJson: any): Promise<void> {
  const authors = cslJson.author || [];
  const year = cslJson.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
  let fallbackText: string;
  if (authors.length === 0) fallbackText = `(${year})`;
  else if (authors.length === 1) fallbackText = `(${authors[0].family}, ${year})`;
  else if (authors.length === 2) fallbackText = `(${authors[0].family} & ${authors[1].family}, ${year})`;
  else fallbackText = `(${authors[0].family} et al., ${year})`;

  try {
    await insertCitation({ refId, citationKey, cslJson, formattedText: fallbackText }, currentStyleId);
    await refreshCitationCounts();
    renderSearchResults(currentResults);
    showStatus('Citation inserted', 'connected');
  } catch (err) {
    showStatus(`Error: ${(err as Error).message}`, 'error');
  }
};

(window as any).handleAddToBasket = function(refId: string, citationKey: string, cslJson: any): void {
  if (citationBasket.some(c => c.refId === refId)) return;

  const authors = cslJson.author || [];
  const year = cslJson.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
  const fallbackText = authors.length > 0 ? `${authors[0].family}, ${year}` : `${year}`;

  citationBasket.push({ refId, citationKey, cslJson, formattedText: fallbackText });
  updateBasketUI();
};

function updateBasketUI(): void {
  const basket = document.getElementById('citationBasket')!;
  const list = document.getElementById('basketList')!;
  const count = document.getElementById('basketCount')!;

  if (citationBasket.length === 0) {
    basket.classList.add('hidden');
    return;
  }

  basket.classList.remove('hidden');
  count.textContent = citationBasket.length.toString();

  list.innerHTML = citationBasket.map((c, i) => `
    <li class="basket-item">
      <span>${escapeHtml(c.citationKey)}</span>
      <button class="btn btn-ghost btn-sm" onclick="removeFromBasket(${i})">&times;</button>
    </li>
  `).join('');
}

(window as any).removeFromBasket = function(index: number): void {
  citationBasket.splice(index, 1);
  updateBasketUI();
};

(window as any).insertMultiCitation = async function(): Promise<void> {
  if (citationBasket.length === 0) return;

  try {
    await insertMultiCite(citationBasket, currentStyleId);
    citationBasket = [];
    updateBasketUI();
    await refreshCitationCounts();
    renderSearchResults(currentResults);
    showStatus('Group citation inserted', 'connected');
  } catch (err) {
    showStatus(`Error: ${(err as Error).message}`, 'error');
  }
};

(window as any).clearBasket = function(): void {
  citationBasket = [];
  updateBasketUI();
};

// ── Bibliography ──

(window as any).generateBibliography = async function(): Promise<void> {
  showStatus('Generating bibliography...', '');
  try {
    const count = await genBib(currentStyleId);
    showStatus(`Bibliography generated (${count} entries)`, 'connected');
    await scanDocumentCitations();
  } catch (err) {
    showStatus(`Error: ${(err as Error).message}`, 'error');
  }
};

(window as any).refreshAllCitations = async function(): Promise<void> {
  await handleRefreshAll();
};

async function handleRefreshAll(): Promise<void> {
  showStatus('Refreshing citations...', '');
  try {
    const count = await refreshAll(currentStyleId);
    showStatus(`Refreshed ${count} citation(s)`, 'connected');
    await scanDocumentCitations();
  } catch (err) {
    showStatus(`Error: ${(err as Error).message}`, 'error');
  }
}

async function scanDocumentCitations(): Promise<void> {
  const container = document.getElementById('docCitations')!;

  try {
    const citations = await getAllCitations();
    await refreshCitationCounts();

    if (citations.length === 0) {
      container.innerHTML = '<p class="text-muted">No citations found in the document.</p>';
      return;
    }

    // One row per unique paper, with how many times it is cited. Most-cited
    // papers first so the heavily-leaned-on sources are obvious.
    const perPaper = Array.from(citationCounts.values()).sort((a, b) => b.count - a.count);
    // Best-effort formatted text per paper, pulled from the first citation that
    // references it.
    const textByRef = new Map<string, string>();
    for (const c of citations) {
      const ids = c.refId.split(',').map(s => s.trim());
      for (const id of ids) if (!textByRef.has(id)) textByRef.set(id, c.formattedText);
    }

    const totalControls = citations.length;
    container.innerHTML = `
      <p class="text-muted" style="margin-bottom:8px">${perPaper.length} paper(s) across ${totalControls} citation(s) in document:</p>
      ${perPaper.map(p => `
        <div class="doc-cite-item">
          <div class="doc-cite-head">
            <span class="doc-cite-key">${escapeHtml(p.citationKey)}</span>
            <span class="cite-count" title="Cited ${p.count} time(s)">cited ${p.count}×</span>
          </div>
          <div class="doc-cite-text">${escapeHtml(textByRef.get(p.refId) || '')}</div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Error scanning: ${(err as Error).message}</p>`;
  }
}

// Recount how many times each paper is cited in the document and cache it.
async function refreshCitationCounts(): Promise<void> {
  try {
    citationCounts = await getCitationCounts();
  } catch {
    // Keep the previous counts on failure rather than clearing the badges.
  }
}

// ── Settings ──

(window as any).onStyleChange = function(): void {
  const select = document.getElementById('styleSelect') as HTMLSelectElement;
  currentStyleId = select.value;
};

(window as any).checkBridgeConnection = async function(): Promise<void> {
  const conn = await initConnection();
  const bridgeEl = document.getElementById('bridgeStatus')!;
  const supabaseEl = document.getElementById('supabaseStatus')!;

  bridgeEl.textContent = conn.bridge ? 'Connected' : 'Not connected';
  bridgeEl.className = `status-badge ${conn.bridge ? 'status-connected' : 'status-disconnected'}`;
  supabaseEl.textContent = conn.supabase ? 'Connected' : 'Not connected';
  supabaseEl.className = `status-badge ${conn.supabase ? 'status-connected' : 'status-disconnected'}`;
};

// ── Tab Navigation ──

(window as any).switchTab = function(tabId: string): void {
  switchTab(tabId);
};

function switchTab(tabId: string): void {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

// ── Helpers ──

async function updateDocInfo(): Promise<void> {
  try {
    const citations = await getAllCitations();
    const el = document.getElementById('docInfo')!;
    el.textContent = `${citations.length} citation(s) in document`;
  } catch {
    // ignore
  }
}

function showStatus(message: string, type: string): void {
  const el = document.getElementById('connectionStatus')!;
  el.textContent = message;
  el.className = `status ${type}`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str: string): string {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max).replace(/\s+$/, '')}…`;
}
