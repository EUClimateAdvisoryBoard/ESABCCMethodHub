// ============================================================================
// Word Add-in Taskpane — Main Entry Point
// ============================================================================

import {
  initConnection,
  searchReferences,
  getLibraries,
  isUsingBridge,
  syncLibrary,
  RefSearchResult,
} from '../services/api';
import {
  insertCitation,
  insertMultiCitation as insertMultiCite,
  generateBibliography as genBib,
  refreshAllCitations as refreshAll,
  getAllCitations,
  CitationData,
} from '../services/citation';

import './taskpane.css';

// ── State ──

let currentLibraryId = '';
let currentStyleId = 'apa';
let citationBasket: CitationData[] = [];
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

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
  if (!query.trim() || !currentLibraryId) {
    showEmptyState();
    return;
  }

  const spinner = document.getElementById('searchSpinner')!;
  const refList = document.getElementById('refList')!;

  spinner.classList.remove('hidden');

  try {
    const results = await searchReferences(query, currentLibraryId);
    renderSearchResults(results);
  } catch (err) {
    refList.innerHTML = `<li class="ref-empty">Search error: ${(err as Error).message}</li>`;
  } finally {
    spinner.classList.add('hidden');
  }
}

function renderSearchResults(results: RefSearchResult[]): void {
  const refList = document.getElementById('refList')!;

  if (results.length === 0) {
    refList.innerHTML = '<li class="ref-empty">No references found</li>';
    return;
  }

  refList.innerHTML = results.map(ref => {
    const authors = (ref.authors || [])
      .slice(0, 3)
      .map(a => a.family || a.given || '')
      .join(', ');
    const authorsDisplay = (ref.authors || []).length > 3 ? `${authors} et al.` : authors;

    return `
      <li class="ref-item" data-id="${ref.id}">
        <div class="ref-item-content">
          <div class="ref-title">${escapeHtml(ref.title)}</div>
          <div class="ref-meta">${escapeHtml(authorsDisplay)}${ref.year ? ` (${ref.year})` : ''}</div>
          ${ref.container_title ? `<div class="ref-journal">${escapeHtml(ref.container_title)}</div>` : ''}
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
  document.getElementById('refList')!.innerHTML = '<li class="ref-empty">Type to search your reference library</li>';
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
    if (citations.length === 0) {
      container.innerHTML = '<p class="text-muted">No citations found in the document.</p>';
      return;
    }

    container.innerHTML = `
      <p class="text-muted" style="margin-bottom:8px">${citations.length} citation(s) in document:</p>
      ${citations.map(c => `
        <div class="doc-cite-item">
          <div class="doc-cite-key">${escapeHtml(c.citationKey)}</div>
          <div class="doc-cite-text">${escapeHtml(c.formattedText)}</div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Error scanning: ${(err as Error).message}</p>`;
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
