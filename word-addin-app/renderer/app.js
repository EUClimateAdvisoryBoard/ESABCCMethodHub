/**
 * ESABCC Reference Manager - Renderer Application Logic
 */

(function () {
  'use strict';

  // ==================== State ====================

  const PASSWORD = 'ESABCC192168';
  const PAGE_SIZE = 30;

  let allReferences = [];
  let filteredReferences = [];
  let selectedRefIds = new Set();
  let bibReferences = []; // references added to bibliography
  let currentPage = 1;
  let activeDetailRef = null;
  let annotationCounts = {};

  // ==================== DOM References ====================

  const $loginScreen = document.getElementById('login-screen');
  const $appScreen = document.getElementById('app-screen');
  const $loginPassword = document.getElementById('login-password');
  const $loginBtn = document.getElementById('login-btn');
  const $loginError = document.getElementById('login-error');

  const $searchInput = document.getElementById('search-input');
  const $filterType = document.getElementById('filter-type');
  const $filterYearFrom = document.getElementById('filter-year-from');
  const $filterYearTo = document.getElementById('filter-year-to');
  const $filterAuthor = document.getElementById('filter-author');
  const $resultCount = document.getElementById('result-count');

  const $refList = document.getElementById('ref-list');
  const $detailPanel = document.getElementById('detail-panel');
  const $pagination = document.getElementById('pagination');

  const $toast = document.getElementById('toast');

  // ==================== Auth ====================

  function checkAuth() {
    if (localStorage.getItem('esabcc_auth') === PASSWORD) {
      showApp();
    }
  }

  function attemptLogin() {
    const pw = $loginPassword.value.trim();
    if (pw === PASSWORD) {
      localStorage.setItem('esabcc_auth', PASSWORD);
      $loginError.textContent = '';
      showApp();
    } else {
      $loginError.textContent = 'Invalid password.';
      $loginPassword.value = '';
      $loginPassword.focus();
    }
  }

  function logout() {
    localStorage.removeItem('esabcc_auth');
    $appScreen.classList.remove('active');
    $loginScreen.style.display = 'flex';
    $loginPassword.value = '';
  }

  $loginBtn.addEventListener('click', attemptLogin);
  $loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
  document.getElementById('btn-logout').addEventListener('click', logout);

  // ==================== App Initialization ====================

  async function showApp() {
    $loginScreen.style.display = 'none';
    $appScreen.classList.add('active');
    await loadData();
  }

  async function loadData() {
    try {
      allReferences = await window.api.loadReferences();
      annotationCounts = await window.api.getAllAnnotationsCount();
    } catch (err) {
      allReferences = [];
      annotationCounts = {};
      console.error('Failed to load references:', err);
    }
    applyFilters();
  }

  // ==================== Filtering & Search ====================

  function applyFilters() {
    const query = $searchInput.value.trim().toLowerCase();
    const typeFilter = $filterType.value;
    const yearFrom = parseInt($filterYearFrom.value) || 0;
    const yearTo = parseInt($filterYearTo.value) || 9999;
    const authorFilter = $filterAuthor.value.trim().toLowerCase();

    filteredReferences = allReferences.filter((ref) => {
      // Type filter
      if (typeFilter && ref.type !== typeFilter) return false;

      // Year range
      const yr = parseInt(ref.year) || 0;
      if (yr < yearFrom || yr > yearTo) return false;

      // Author filter
      if (authorFilter && !(ref.authors || '').toLowerCase().includes(authorFilter)) return false;

      // Full-text search
      if (query) {
        const haystack = [
          ref.title,
          ref.authors,
          ref.journal,
          ref.doi,
          ref.year,
          ref.type,
          ref.fullCitation,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    currentPage = 1;
    renderList();
    renderPagination();
    updateResultCount();
  }

  let searchDebounce;
  function onSearchChange() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFilters, 200);
  }

  $searchInput.addEventListener('input', onSearchChange);
  $filterType.addEventListener('change', applyFilters);
  $filterYearFrom.addEventListener('input', onSearchChange);
  $filterYearTo.addEventListener('input', onSearchChange);
  $filterAuthor.addEventListener('input', onSearchChange);

  function updateResultCount() {
    const total = filteredReferences.length;
    const selected = selectedRefIds.size;
    let text = `${total.toLocaleString()} reference${total !== 1 ? 's' : ''}`;
    if (selected > 0) {
      text += ` | ${selected} selected`;
    }
    $resultCount.textContent = text;
  }

  // ==================== Rendering ====================

  function renderList() {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const page = filteredReferences.slice(start, end);

    if (page.length === 0) {
      $refList.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);font-size:13px;">No references found matching your criteria.</div>';
      return;
    }

    $refList.innerHTML = page
      .map((ref) => {
        const isSelected = selectedRefIds.has(ref.id);
        const noteCount = annotationCounts[ref.id] || 0;
        return `
        <div class="ref-item ${isSelected ? 'selected' : ''}" data-id="${ref.id}">
          <input type="checkbox" class="ref-checkbox" ${isSelected ? 'checked' : ''} data-id="${ref.id}">
          <div class="ref-body">
            <div class="ref-title">${escapeHtml(ref.title)}</div>
            <div class="ref-authors">${escapeHtml(ref.authors)}</div>
            <div class="ref-meta">
              <span class="ref-type-badge ${ref.type}">${ref.type}</span>
              <span class="ref-meta-item">${escapeHtml(ref.year)}</span>
              ${ref.journal ? `<span class="ref-meta-item">${escapeHtml(ref.journal)}</span>` : ''}
              ${ref.doi ? `<span class="ref-meta-item">DOI: ${escapeHtml(ref.doi)}</span>` : ''}
              ${noteCount > 0 ? `<span class="ref-annotation-indicator">[${noteCount} note${noteCount > 1 ? 's' : ''}]</span>` : ''}
            </div>
          </div>
        </div>`;
      })
      .join('');

    // Event listeners
    $refList.querySelectorAll('.ref-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('ref-checkbox')) return;
        const id = el.dataset.id;
        openDetail(id);
      });
    });

    $refList.querySelectorAll('.ref-checkbox').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = cb.dataset.id;
        if (cb.checked) {
          selectedRefIds.add(id);
        } else {
          selectedRefIds.delete(id);
        }
        renderList();
        updateResultCount();
      });
    });
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredReferences.length / PAGE_SIZE));
    if (totalPages <= 1) {
      $pagination.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Previous</button>`;

    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      html += `<button data-page="1">1</button>`;
      if (startPage > 2) html += `<span class="page-info">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="page-info">...</span>`;
      html += `<button data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;
    html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next</button>`;

    $pagination.innerHTML = html;

    $pagination.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p >= 1 && p <= totalPages) {
          currentPage = p;
          renderList();
          renderPagination();
          $refList.scrollTop = 0;
        }
      });
    });
  }

  // ==================== Detail Panel ====================

  async function openDetail(refId) {
    const ref = allReferences.find((r) => r.id === refId);
    if (!ref) return;

    activeDetailRef = ref;
    $detailPanel.classList.add('open');

    const annotations = await window.api.getAnnotations(refId);
    const tags = await window.api.getTags(refId);

    $detailPanel.innerHTML = `
      <div class="detail-header">
        <button class="detail-close" id="detail-close-btn">&times;</button>
        <div class="detail-title">${escapeHtml(ref.title)}</div>
        <div class="detail-authors">${escapeHtml(ref.authors)} (${escapeHtml(ref.year)})</div>
        <div class="detail-meta-grid">
          <span class="detail-meta-label">Type</span>
          <span class="detail-meta-value"><span class="ref-type-badge ${ref.type}">${ref.type}</span></span>
          ${ref.journal ? `<span class="detail-meta-label">Journal</span><span class="detail-meta-value">${escapeHtml(ref.journal)}</span>` : ''}
          ${ref.volume ? `<span class="detail-meta-label">Volume</span><span class="detail-meta-value">${escapeHtml(ref.volume)}${ref.issue ? '(' + escapeHtml(ref.issue) + ')' : ''}</span>` : ''}
          ${ref.pages ? `<span class="detail-meta-label">Pages</span><span class="detail-meta-value">${escapeHtml(ref.pages)}</span>` : ''}
          ${ref.doi ? `<span class="detail-meta-label">DOI</span><span class="detail-meta-value"><a href="https://doi.org/${encodeURIComponent(ref.doi)}" target="_blank">${escapeHtml(ref.doi)}</a></span>` : ''}
          ${ref.url ? `<span class="detail-meta-label">URL</span><span class="detail-meta-value"><a href="${escapeHtml(ref.url)}" target="_blank">${escapeHtml(ref.url)}</a></span>` : ''}
        </div>
      </div>

      <div class="detail-actions">
        <button class="primary-action" id="btn-insert-citation">Insert Citation</button>
        <button id="btn-insert-full-ref">Insert Full Reference</button>
        <button id="btn-add-to-bib">Add to Bibliography</button>
        <button id="btn-find-similar">Find Similar</button>
        <button id="btn-add-to-collection-detail">Add to Collection</button>
      </div>

      <div class="detail-citation">
        <div class="detail-section-title">Full Citation</div>
        <div class="citation-text">${escapeHtml(ref.fullCitation)}</div>
      </div>

      <div class="detail-annotations">
        <div class="detail-section-title">Annotations & Notes</div>
        <div class="annotation-form">
          <textarea id="annotation-input" placeholder="Add a note or annotation..."></textarea>
          <button id="btn-save-annotation">Save</button>
        </div>
        <div class="annotation-list" id="annotation-list">
          ${annotations
            .map(
              (a) => `
            <div class="annotation-item" style="background:${a.color}22; border-color:${a.color}55;">
              <button class="annotation-delete" data-id="${a.id}">&times;</button>
              <div>${escapeHtml(a.note)}</div>
              <div class="annotation-date">${formatDate(a.created_at)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;

    // Bind detail events
    document.getElementById('detail-close-btn').addEventListener('click', closeDetail);

    document.getElementById('btn-insert-citation').addEventListener('click', async () => {
      const citation = formatInlineCitation(ref);
      await window.api.copyToClipboard(citation);
      showToast('Citation copied: ' + citation);
    });

    document.getElementById('btn-insert-full-ref').addEventListener('click', async () => {
      await window.api.copyToClipboard(ref.fullCitation);
      showToast('Full reference copied to clipboard.');
    });

    document.getElementById('btn-add-to-bib').addEventListener('click', () => {
      addToBibliography(ref);
    });

    document.getElementById('btn-find-similar').addEventListener('click', () => {
      switchTab('similar');
      document.getElementById('similar-query').value = ref.title;
      searchSimilarPapers(ref.title);
    });

    document.getElementById('btn-add-to-collection-detail').addEventListener('click', () => {
      showAddToCollectionModal(ref.id);
    });

    document.getElementById('btn-save-annotation').addEventListener('click', async () => {
      const input = document.getElementById('annotation-input');
      const note = input.value.trim();
      if (!note) return;
      await window.api.saveAnnotation({ refId: ref.id, note, color: '#FFECB3' });
      annotationCounts = await window.api.getAllAnnotationsCount();
      openDetail(ref.id); // refresh
      renderList();
    });

    // Delete annotation handlers
    $detailPanel.querySelectorAll('.annotation-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        await window.api.deleteAnnotation(id);
        annotationCounts = await window.api.getAllAnnotationsCount();
        openDetail(ref.id);
        renderList();
      });
    });
  }

  function closeDetail() {
    $detailPanel.classList.remove('open');
    activeDetailRef = null;
  }

  // ==================== Citation Formatting ====================

  function formatInlineCitation(ref) {
    // Extract first author surname
    let surname = ref.authors;
    if (surname.includes(',')) {
      surname = surname.split(',')[0].trim();
    }
    // Handle "et al." case
    if (ref.authors.includes('et al.')) {
      if (surname.endsWith(' et al.')) {
        surname = surname.replace(' et al.', '');
      }
      return `(${surname} et al., ${ref.year})`;
    }
    return `(${surname}, ${ref.year})`;
  }

  // ==================== Bibliography ====================

  function addToBibliography(ref) {
    if (bibReferences.find((r) => r.id === ref.id)) {
      showToast('Reference already in bibliography.');
      return;
    }
    bibReferences.push(ref);
    renderBibliography();
    showToast('Added to bibliography.');
  }

  function renderBibliography() {
    const $content = document.getElementById('bib-content');
    if (bibReferences.length === 0) {
      $content.innerHTML = '<div class="bib-empty">No references added. Select references in the Library tab and click "Add to Bibliography".</div>';
      return;
    }

    // Sort alphabetically by first author
    const sorted = [...bibReferences].sort((a, b) =>
      (a.authors || '').localeCompare(b.authors || '')
    );

    $content.innerHTML =
      '<div class="bib-list">' +
      sorted
        .map(
          (ref) => `
        <div class="bib-entry">
          <button class="bib-remove" data-id="${ref.id}" title="Remove">&times;</button>
          <span>${escapeHtml(ref.fullCitation)}</span>
        </div>`
        )
        .join('') +
      '</div>';

    $content.querySelectorAll('.bib-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        bibReferences = bibReferences.filter((r) => r.id !== btn.dataset.id);
        renderBibliography();
      });
    });
  }

  document.getElementById('bib-copy').addEventListener('click', async () => {
    if (bibReferences.length === 0) {
      showToast('No references in bibliography.');
      return;
    }
    const sorted = [...bibReferences].sort((a, b) =>
      (a.authors || '').localeCompare(b.authors || '')
    );
    const text = sorted.map((r) => r.fullCitation).join('\n\n');
    await window.api.copyToClipboard(text);
    showToast('Bibliography copied to clipboard (' + sorted.length + ' references).');
  });

  document.getElementById('bib-clear').addEventListener('click', () => {
    bibReferences = [];
    renderBibliography();
  });

  // Also allow adding selected references to bibliography
  document.getElementById('btn-select-all').addEventListener('click', () => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const page = filteredReferences.slice(start, end);
    page.forEach((ref) => selectedRefIds.add(ref.id));
    renderList();
    updateResultCount();
  });

  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    selectedRefIds.clear();
    renderList();
    updateResultCount();
  });

  // ==================== Similar Papers (Semantic Scholar) ====================

  let similarSearchAbort = null;

  async function searchSimilarPapers(query) {
    const $results = document.getElementById('similar-results');
    const $btn = document.getElementById('similar-search-btn');

    if (!query || !query.trim()) {
      $results.innerHTML = '<div class="similar-status">Enter a paper title to search.</div>';
      return;
    }

    if (similarSearchAbort) {
      similarSearchAbort.abort();
    }
    similarSearchAbort = new AbortController();

    $btn.disabled = true;
    $btn.textContent = 'Searching...';
    $results.innerHTML = '<div class="similar-status"><span class="loading-spinner"></span> Searching Semantic Scholar...</div>';

    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query.trim())}&limit=10&fields=title,authors,year,abstract,externalIds,venue,citationCount,url`;
      const resp = await fetch(url, { signal: similarSearchAbort.signal });

      if (!resp.ok) {
        throw new Error(`API returned ${resp.status}`);
      }

      const data = await resp.json();
      const papers = data.data || [];

      if (papers.length === 0) {
        $results.innerHTML = '<div class="similar-status">No related papers found.</div>';
      } else {
        $results.innerHTML =
          '<div class="similar-results">' +
          papers
            .map((p) => {
              const authors = (p.authors || []).map((a) => a.name).join(', ');
              const doi = p.externalIds && p.externalIds.DOI ? p.externalIds.DOI : null;
              return `
              <div class="similar-paper">
                <div class="similar-paper-title">${escapeHtml(p.title || 'Untitled')}</div>
                <div class="similar-paper-authors">${escapeHtml(authors || 'Unknown authors')}</div>
                <div class="similar-paper-meta">
                  ${p.year ? p.year + ' | ' : ''}${p.venue ? escapeHtml(p.venue) + ' | ' : ''}${p.citationCount != null ? p.citationCount + ' citations' : ''}
                </div>
                ${p.abstract ? `<div class="similar-paper-abstract">${escapeHtml(p.abstract)}</div>` : ''}
                <div class="similar-paper-actions">
                  ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank">View on S2</a>` : ''}
                  ${doi ? `<a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank">DOI</a>` : ''}
                  <button class="btn-copy-s2-citation" data-authors="${escapeAttr(authors)}" data-year="${p.year || ''}" data-title="${escapeAttr(p.title || '')}">Copy Citation</button>
                </div>
              </div>`;
            })
            .join('') +
          '</div>';

        $results.querySelectorAll('.btn-copy-s2-citation').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const a = btn.dataset.authors;
            const y = btn.dataset.year;
            const t = btn.dataset.title;
            const citation = `${a}, ${y}, '${t}'.`;
            await window.api.copyToClipboard(citation);
            showToast('Citation copied.');
          });
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      $results.innerHTML = `<div class="similar-status">Search failed: ${escapeHtml(err.message)}. Please try again.</div>`;
    } finally {
      $btn.disabled = false;
      $btn.textContent = 'Search';
    }
  }

  document.getElementById('similar-search-btn').addEventListener('click', () => {
    const q = document.getElementById('similar-query').value;
    searchSimilarPapers(q);
  });

  document.getElementById('similar-query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = document.getElementById('similar-query').value;
      searchSimilarPapers(q);
    }
  });

  // ==================== Collections ====================

  async function renderCollections() {
    const collections = await window.api.getCollections();
    const $list = document.getElementById('collections-list');

    if (collections.length === 0) {
      $list.innerHTML = '<div class="bib-empty">No collections yet. Create one to organise your references.</div>';
      return;
    }

    $list.innerHTML = collections
      .map(
        (c) => `
      <div class="collection-card" data-id="${c.id}">
        <div>
          <div class="collection-name">${escapeHtml(c.name)}</div>
          ${c.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${escapeHtml(c.description)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="collection-count">${c.ref_count} ref${c.ref_count !== 1 ? 's' : ''}</span>
          <button class="collection-delete" data-id="${c.id}" title="Delete collection">&times;</button>
        </div>
      </div>`
      )
      .join('');

    $list.querySelectorAll('.collection-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this collection?')) {
          await window.api.deleteCollection(parseInt(btn.dataset.id));
          renderCollections();
        }
      });
    });

    $list.querySelectorAll('.collection-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const cid = parseInt(card.dataset.id);
        const refIds = await window.api.getCollectionRefs(cid);
        // Filter the library to show only these refs
        selectedRefIds = new Set(refIds);
        switchTab('library');
        renderList();
        updateResultCount();
        showToast(`Showing ${refIds.length} references from collection.`);
      });
    });
  }

  // New collection modal
  document.getElementById('btn-new-collection').addEventListener('click', () => {
    document.getElementById('modal-new-collection').classList.remove('hidden');
    document.getElementById('modal-collection-name').value = '';
    document.getElementById('modal-collection-desc').value = '';
    document.getElementById('modal-collection-name').focus();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-new-collection').classList.add('hidden');
  });

  document.getElementById('modal-create').addEventListener('click', async () => {
    const name = document.getElementById('modal-collection-name').value.trim();
    if (!name) return;
    const desc = document.getElementById('modal-collection-desc').value.trim();
    await window.api.createCollection({ name, description: desc });
    document.getElementById('modal-new-collection').classList.add('hidden');
    renderCollections();
    showToast('Collection created.');
  });

  // Add to collection modal
  async function showAddToCollectionModal(refId) {
    const collections = await window.api.getCollections();
    const $overlay = document.getElementById('modal-add-to-collection');
    const $list = document.getElementById('modal-collection-list');

    if (collections.length === 0) {
      $list.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">No collections. Create one first.</p>';
    } else {
      $list.innerHTML = collections
        .map(
          (c) => `
        <div class="collection-card" style="cursor:pointer;margin-bottom:4px;" data-cid="${c.id}">
          <div class="collection-name">${escapeHtml(c.name)}</div>
          <span class="collection-count">${c.ref_count} refs</span>
        </div>`
        )
        .join('');

      $list.querySelectorAll('.collection-card').forEach((card) => {
        card.addEventListener('click', async () => {
          const cid = parseInt(card.dataset.cid);
          await window.api.addToCollection({ collectionId: cid, refId });
          $overlay.classList.add('hidden');
          showToast('Reference added to collection.');
          renderCollections();
        });
      });
    }

    $overlay.classList.remove('hidden');
  }

  document.getElementById('modal-atc-cancel').addEventListener('click', () => {
    document.getElementById('modal-add-to-collection').classList.add('hidden');
  });

  // ==================== Tab Navigation ====================

  function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));

    if (tabName === 'bibliography') renderBibliography();
    if (tabName === 'collections') renderCollections();
  }

  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ==================== Toast ====================

  let toastTimeout;
  function showToast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $toast.classList.remove('show'), 2500);
  }

  // ==================== Utilities ====================

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'Z');
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // ==================== Keyboard Shortcuts ====================

  document.addEventListener('keydown', (e) => {
    // Escape to close detail panel
    if (e.key === 'Escape') {
      closeDetail();
      document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.add('hidden'));
    }
    // Ctrl+F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      $searchInput.focus();
      $searchInput.select();
    }
  });

  // ==================== Init ====================

  checkAuth();
  renderBibliography();
})();
