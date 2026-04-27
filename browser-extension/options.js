const apiInput = document.getElementById('api_base');
const secretInput = document.getElementById('secret');
const status = document.getElementById('status');

chrome.storage.sync.get({ api_base: '', secret: '' }).then(({ api_base, secret }) => {
  apiInput.value = api_base;
  secretInput.value = secret;
});

document.getElementById('save').addEventListener('click', async () => {
  const api_base = apiInput.value.trim().replace(/\/$/, '');
  const secret = secretInput.value.trim();
  if (api_base && !/^https?:\/\//i.test(api_base)) {
    status.textContent = 'API base URL must start with http:// or https://';
    status.style.color = '#B83230';
    return;
  }
  await chrome.storage.sync.set({ api_base, secret });
  status.textContent = 'Saved.';
  status.style.color = '#007B6C';
  setTimeout(() => (status.textContent = ''), 2000);
});
