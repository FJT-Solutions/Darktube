// Dark Clips - YouTube Shorts Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-YouTube';
  const DEFAULT_API_URL = 'https://darktube.fjt-solutions.com';

  function showToast(message, isError = false) {
    try {
      const existing = document.querySelector('.dark-clips-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'dark-clips-toast';
      if (isError) toast.style.borderLeftColor = '#ef4444';
      toast.innerHTML = `<span>${isError ? '⚠️' : '⚡'}</span> <span>${message}</span>`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    } catch {}
  }

  async function getAuthAndApi() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['darktube_api_url', 'darktube_token', 'darktube_user'], (res) => {
          let baseUrl = res?.darktube_api_url || DEFAULT_API_URL;
          if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('fjt.solutions')) {
            baseUrl = DEFAULT_API_URL;
          }
          resolve({
            baseUrl: baseUrl.replace(/\/$/, ''),
            token: res?.darktube_token || null,
            user: res?.darktube_user || null
          });
        });
      } catch {
        resolve({ baseUrl: DEFAULT_API_URL, token: null, user: null });
      }
    });
  }

  async function sendToDarkClips(videoData, btnElement) {
    if (btnElement) {
      btnElement.classList.add('sending');
      btnElement.innerHTML = '<span>⏳ Enviando...</span>';
    }

    try {
      const { baseUrl, token, user } = await getAuthAndApi();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/dark-clips/import`;

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: 'youtube',
          items: [videoData],
          userId: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        if (btnElement) {
          btnElement.classList.remove('sending');
          btnElement.classList.add('sent');
          btnElement.innerHTML = '<span>✅ Enviado ao Dark Clips!</span>';
          setTimeout(() => {
            btnElement.classList.remove('sent');
            btnElement.innerHTML = `
              <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Dark Clips</span>
            `;
          }, 3000);
        }
        showToast('Shorts do YouTube enviado para o Dark Clips!');
      } else {
        throw new Error(result.error || 'Erro ao importar');
      }
    } catch (err) {
      console.error('[DarkClips YouTube] Erro:', err);
      if (btnElement) {
        btnElement.classList.remove('sending');
        btnElement.innerHTML = '<span>❌ Falha</span>';
        setTimeout(() => {
          btnElement.innerHTML = `
            <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span>Dark Clips</span>
          `;
        }, 3000);
      }
      showToast('Falha ao conectar com https://darktube.fjt-solutions.com', true);
    }
  }

  function extractShortsData(container) {
    try {
      const currentUrl = window.location.href;

      let authorName = 'YouTube Creator';
      let authorHandle = '@channel';
      let authorAvatar = '';

      const channelLink = container.querySelector('a.yt-spec-button-shape-next, a[href^="/@"]');
      if (channelLink) {
        authorHandle = channelLink.getAttribute('href')?.replace(/\//g, '') || '@channel';
        if (!authorHandle.startsWith('@')) authorHandle = `@${authorHandle}`;
        authorName = channelLink.textContent?.trim() || authorHandle;
      }

      const avatarImg = container.querySelector('#channel-avatar img, img[alt*="avatar"]');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || '';
      }

      let caption = '';
      const titleEl = container.querySelector('h2.title, h2[class*="title"], yt-formatted-string[class*="title"]');
      if (titleEl) {
        caption = titleEl.textContent?.trim() || '';
      }

      return {
        url: currentUrl,
        videoUrl: currentUrl,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'youtube',
        metrics: {}
      };
    } catch {
      return {
        url: window.location.href,
        videoUrl: window.location.href,
        authorName: 'YouTube Creator',
        authorHandle: '@channel',
        platform: 'youtube',
        metrics: {}
      };
    }
  }

  function injectButtons() {
    try {
      const shortsContainers = document.querySelectorAll('ytd-reel-video-renderer[is-active], ytd-reel-video-renderer, ytd-shorts');

      shortsContainers.forEach((container) => {
        if (container.querySelector('.dark-clips-inject-btn')) return;

        const actionsBar = container.querySelector('#actions, #button-bar');
        if (!actionsBar) return;

        const btn = document.createElement('button');
        btn.setAttribute('type', 'button');
        btn.className = 'dark-clips-inject-btn';
        btn.innerHTML = `
          <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span>Dark Clips</span>
        `;

        const blockerEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];
        blockerEvents.forEach((evt) => {
          btn.addEventListener(evt, (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (evt === 'click') {
              e.preventDefault();
              const data = extractShortsData(container);
              if (data) sendToDarkClips(data, btn);
            }
          }, true);
        }); actionsBar.prepend(btn);
      });
    } catch {}
  }

  setInterval(injectButtons, 1500);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = [];
      if (window.location.href.includes('/shorts/')) {
        videos.push(extractShortsData(document));
      }
      sendResponse({ success: true, videos });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no YouTube Shorts!`);
})();
