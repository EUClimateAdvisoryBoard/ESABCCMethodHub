/*
 * ESABCC Monitor — service worker.
 *
 * Registers a context menu on LinkedIn pages. When the user right-clicks a
 * post (or anywhere on the page) and picks "Send to ESABCC monitor", this
 * worker injects a content script that reads the post DOM, receives the
 * extracted payload, and POSTs it to the configured ingest endpoint.
 *
 * The same action is available via the browser action (toolbar button) and
 * the Alt+Shift+C keyboard shortcut. The toolbar popup surfaces status /
 * errors so users know their capture landed.
 */

const CONTEXT_MENU_ID = 'esabcc-capture-post';

async function getSettings() {
  const defaults = {
    api_base: '',
    secret: '',
  };
  const stored = await chrome.storage.sync.get(defaults);
  return { ...defaults, ...stored };
}

async function setLastResult(result) {
  await chrome.storage.local.set({ last_result: { ...result, ts: Date.now() } });
}

function postedAtRelativeToIso(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d+)\s*(m|h|d|w|mo|y)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const factor = { m: 60e3, h: 3.6e6, d: 8.64e7, w: 7 * 8.64e7, mo: 30 * 8.64e7, y: 365 * 8.64e7 };
  const ms = factor[unit];
  return ms ? new Date(Date.now() - n * ms).toISOString() : null;
}

async function sendPayload(payload) {
  const { api_base, secret } = await getSettings();
  if (!api_base) {
    const err = 'No API base URL configured. Open the extension options to set it.';
    await setLastResult({ ok: false, error: err });
    await notify('ESABCC Monitor — not configured', err);
    throw new Error(err);
  }

  // Normalise posted_at — LinkedIn often gives relative "22h" strings.
  if (payload.posted_at) {
    const iso = Date.parse(payload.posted_at);
    if (!Number.isFinite(iso)) {
      const rel = postedAtRelativeToIso(payload.posted_at);
      if (rel) payload.posted_at = rel;
    }
  }

  const endpoint = `${api_base.replace(/\/$/, '')}/api/media-monitoring/social/ingest`;
  const headers = { 'Content-Type': 'application/json' };
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await setLastResult({ ok: false, error: `Network error: ${msg}` });
    await notify('ESABCC Monitor — network error', msg);
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const error = `HTTP ${res.status}: ${body.slice(0, 200)}`;
    await setLastResult({ ok: false, error });
    await notify('ESABCC Monitor — ingest failed', error);
    throw new Error(error);
  }

  const data = await res.json().catch(() => ({}));
  const result = {
    ok: true,
    author: payload.author_name || payload.author_handle || '—',
    matched_keywords: data.matched_keywords || [],
    matched_report_slugs: data.matched_report_slugs || [],
  };
  await setLastResult(result);
  const tail = result.matched_report_slugs.length
    ? ` • reports: ${result.matched_report_slugs.join(', ')}`
    : '';
  await notify(
    'Captured',
    `${result.author}${tail}`,
  );
  return result;
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="8" fill="%23004B7F"/><text x="50%25" y="54%25" font-family="sans-serif" font-size="22" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">E</text></svg>',
      title,
      message,
    });
  } catch {
    // notifications permission may be denied; ignore
  }
}

async function captureActiveTab(tab) {
  if (!tab || !tab.id) return;
  if (!tab.url || !/^https:\/\/(www\.)?linkedin\.com\//.test(tab.url)) {
    await notify('ESABCC Monitor', 'Only works on linkedin.com pages.');
    return;
  }

  // Inject the extractor into the tab. The extractor returns the payload.
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractLinkedInPost,
  });

  if (!result || !result.url) {
    await notify('ESABCC Monitor', 'Could not find a LinkedIn post on this page.');
    return;
  }
  await sendPayload(result).catch(() => { /* already logged */ });
}

/** This function is injected into the LinkedIn tab and runs there. */
function extractLinkedInPost() {
  // Use the text the user has selected, if any — that's the most reliable
  // signal that they've picked out a specific post.
  const selection = (window.getSelection && window.getSelection().toString() || '').trim();

  function pickPostNode() {
    // Prefer a post that contains the current selection
    if (selection) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node = sel.anchorNode;
        while (node && node !== document.body) {
          if (node.nodeType === 1) {
            const el = node;
            if (
              el.matches && (
                el.matches('[data-urn*=":activity:"]') ||
                el.matches('[data-id*=":activity:"]') ||
                el.matches('article') ||
                el.matches('.feed-shared-update-v2') ||
                el.matches('.feed-shared-update') ||
                el.matches('.update-components-actor')
              )
            ) return el;
          }
          node = node.parentNode;
        }
      }
    }
    // Fall back to the first post-like element in the viewport
    const candidates = document.querySelectorAll(
      '[data-urn*=":activity:"], [data-id*=":activity:"], .feed-shared-update-v2, article',
    );
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.8) return el;
    }
    return candidates[0] || document.body;
  }

  const node = pickPostNode();
  const urn =
    (node.getAttribute && (node.getAttribute('data-urn') || node.getAttribute('data-id'))) || '';
  const activityId = urn.match(/activity:(\d+)/);
  const permalink = activityId
    ? `https://www.linkedin.com/feed/update/urn:li:activity:${activityId[1]}`
    : location.href;

  function pickText(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector && root.querySelector(sel);
      if (el && el.innerText) return el.innerText.trim();
    }
    return '';
  }

  const content = selection ||
    pickText(node, [
      '.feed-shared-update-v2__description',
      '.update-components-text',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-text',
    ]) || (node.innerText || '').slice(0, 4000);

  const authorNode = node.querySelector && node.querySelector(
    '.update-components-actor__name, .feed-shared-actor__name, [data-anonymize="person-name"]',
  );
  const authorLink = node.querySelector && node.querySelector(
    'a.update-components-actor__meta-link, a.feed-shared-actor__container-link, a[href*="/in/"], a[href*="/company/"]',
  );
  const author_name = authorNode ? authorNode.innerText.trim() : '';
  const author_profile_url = authorLink ? new URL(authorLink.getAttribute('href'), location.origin).href : '';
  const author_handle = (author_profile_url.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/) || [])[1] || '';

  const timeEl = node.querySelector && node.querySelector('time, .update-components-actor__sub-description, .feed-shared-actor__sub-description');
  const timeText = timeEl ? (timeEl.getAttribute('datetime') || timeEl.innerText || '').trim() : '';

  return {
    url: permalink,
    platform: 'linkedin',
    content,
    author_name,
    author_handle,
    author_profile_url,
    posted_at: timeText,
  };
}

/* ------------------------------------------------------------------ */
/*  Wire up entry points                                               */
/* ------------------------------------------------------------------ */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Send to ESABCC monitor',
    contexts: ['page', 'selection', 'link'],
    documentUrlPatterns: ['https://www.linkedin.com/*', 'https://linkedin.com/*'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  await captureActiveTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'capture-current-post') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await captureActiveTab(tab);
});

chrome.action.onClicked.addListener(async (tab) => {
  // Only fires when there is no popup; popup.html normally handles clicks.
  await captureActiveTab(tab);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'capture-now') {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      try {
        await captureActiveTab(tab);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err && err.message });
      }
    })();
    return true; // async
  }
});
