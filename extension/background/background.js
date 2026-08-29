// Dark Clips - Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DarkClips] Extensão instalada com sucesso.');
  chrome.storage.local.get(['darktube_api_url'], (result) => {
    if (!result.darktube_api_url) {
      chrome.storage.local.set({ darktube_api_url: 'https://darktube.fjt-solutions.com' });
    }
  });
});

// Cookie & API bridge for content scripts (bypasses page CSP and CORS restrictions)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_COOKIES') {
    try {
      chrome.cookies.getAll({ domain: request.domain || 'instagram.com' }, (cookies) => {
        const sanitized = (cookies || []).map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          expirationDate: c.expirationDate || 9999999999
        }));
        sendResponse({ cookies: sanitized });
      });
    } catch (err) {
      sendResponse({ cookies: [], error: err.message });
    }
    return true;
  }

  if (request.action === 'IMPORT_CLIP') {
    (async () => {
      try {
        const { endpoint, headers, body } = request;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: headers || { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        sendResponse({ success: res.ok, data, status: res.status });
      } catch (err) {
        console.error('[DarkClips Background] Fetch error:', err);
        sendResponse({ success: false, error: err.message || 'Falha de rede' });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
