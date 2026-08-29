// Dark Clips - Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DarkClips] Extensão instalada com sucesso.');
  chrome.storage.local.get(['darktube_api_url'], (result) => {
    if (!result.darktube_api_url) {
      chrome.storage.local.set({ darktube_api_url: 'https://darktube.fjt-solutions.com' });
    }
  });
});

// Cookie bridge for content scripts (content scripts cannot call chrome.cookies directly)
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
    return true; // Keep channel open for async response
  }
});
