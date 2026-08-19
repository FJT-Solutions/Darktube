// Dark Clips - TikTok Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-TikTok';
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
          resolve({
            baseUrl: res?.darktube_api_url || DEFAULT_API_URL,
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
          platform: 'tiktok',
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
        showToast('Vídeo do TikTok enviado para o Dark Clips!');
      } else {
        throw new Error(result.error || 'Erro ao importar');
      }
    } catch (err) {
      console.error('[DarkClips TikTok] Erro:', err);
      if (btnElement) {
        btnElement.classList.remove('sending');
        btnElement.innerHTML = '<span>❌ Falha ao enviar</span>';
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

  function extractTikTokData(container) {
    try {
      const video = container.querySelector('video');
      const currentUrl = window.location.href;

      let authorHandle = '@tiktok';
      let authorName = 'TikTok Creator';
      let authorAvatar = '';

      const authorLink = container.querySelector('a[data-e2e="video-author-uniqueid"], a[href^="/@"]');
      if (authorLink) {
        authorHandle = authorLink.getAttribute('href')?.replace(/\//g, '') || '@tiktok';
        if (!authorHandle.startsWith('@')) authorHandle = `@${authorHandle}`;
        authorName = authorLink.textContent?.trim() || authorHandle;
      }

      const avatarImg = container.querySelector('img[class*="Avatar"], a[data-e2e="video-author-avatar"] img');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || '';
      }

      let caption = '';
      const descEl = container.querySelector('div[data-e2e="video-desc"], h1[data-e2e="browse-video-desc"]');
      if (descEl) {
        caption = descEl.textContent?.trim() || '';
      }

      return {
        url: currentUrl,
        videoUrl: video ? (video.src || currentUrl) : currentUrl,
        thumbnailUrl: video ? video.getAttribute('poster') || '' : '',
        duration: video ? Math.round(video.duration || 15) : 15,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'tiktok',
        metrics: {}
      };
    } catch {
      return {
        url: window.location.href,
        videoUrl: window.location.href,
        authorName: 'TikTok Creator',
        authorHandle: '@tiktok',
        platform: 'tiktok',
        metrics: {}
      };
    }
  }

  function injectButtons() {
    try {
      const containers = document.querySelectorAll('div[data-e2e="feed-video"], div[class*="DivVideoItemContainer"], div[class*="DivVideoWrapper"]');

      containers.forEach((container) => {
        if (container.querySelector('.dark-clips-inject-btn')) return;

        const video = container.querySelector('video');
        if (!video) return;

        const onClick = () => {
          const data = extractTikTokData(container);
          sendToDarkClips(data, btn);
        };

        const btn = document.createElement('button');
        btn.className = 'dark-clips-inject-btn';
        btn.setAttribute('type', 'button');
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
              onClick();
            }
          }, true);
        });

        const computedPos = window.getComputedStyle(container).position;
        if (computedPos === 'static') container.style.position = 'relative';

        container.appendChild(btn);
      });
    } catch {}
  }

  setInterval(injectButtons, 1500);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = [];
      document.querySelectorAll('video').forEach((v) => {
        const container = v.closest('div[data-e2e="feed-video"]') || v.parentElement;
        if (container) {
          videos.push(extractTikTokData(container));
        }
      });
      if (videos.length === 0 && window.location.href.includes('/video/')) {
        videos.push({
          url: window.location.href,
          videoUrl: window.location.href,
          authorName: 'TikTok Creator',
          authorHandle: '@tiktok',
          platform: 'tiktok'
        });
      }
      sendResponse({ success: true, videos });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no TikTok!`);
})();
