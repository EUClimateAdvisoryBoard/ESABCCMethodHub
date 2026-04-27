document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

const captureBtn = document.getElementById('capture');
const status = document.getElementById('status');

async function renderLastResult() {
  const { last_result } = await chrome.storage.local.get({ last_result: null });
  if (!last_result) {
    status.innerHTML = '<span class="muted">No captures yet.</span>';
    return;
  }
  if (last_result.ok) {
    const chips = (last_result.matched_report_slugs || [])
      .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
      .join('');
    status.innerHTML = `<span class="ok">✓ Captured</span> <strong>${escapeHtml(last_result.author || '')}</strong><br />${chips}`;
  } else {
    status.innerHTML = `<span class="err">✗ ${escapeHtml(last_result.error || 'Unknown error')}</span>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true;
  status.innerHTML = '<span class="muted">Capturing…</span>';
  try {
    await chrome.runtime.sendMessage({ type: 'capture-now' });
  } catch (err) {
    status.innerHTML = `<span class="err">${escapeHtml(err.message || String(err))}</span>`;
  }
  await new Promise((r) => setTimeout(r, 300));
  await renderLastResult();
  captureBtn.disabled = false;
});

renderLastResult();
