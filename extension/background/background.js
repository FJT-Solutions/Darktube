// Dark Clips - Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DarkClips] Extensão instalada com sucesso.');
  chrome.storage.local.get(['darktube_api_url'], (result) => {
    if (!result.darktube_api_url) {
      chrome.storage.local.set({ darktube_api_url: 'https://darktube.fjt-solutions.com' });
    }
  });
});
