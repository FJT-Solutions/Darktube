// Dark Clips - TikTok Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-TikTok';

  function showToast(message, isError = false) {
    const existing = document.querySelector('.dark-clips-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'dark-clips-toast';
    if (isError) toast.style.borderLeftColor = '#ef4444';
    toast.innerHTML = `<span>${isError ? '⚠️' : '⚡'}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  async function getApiUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['darktube_api_url'], (res) => {
        resolve(res.darktube_api_url || 'http://localhost:3000');
      });
    });
  }

  async function sendToDarkClips(videoData, btnElement) {
    if (btnElement) {
      btnElement.classList.add('sending');
      btnElement.innerHTML = '<span>⏳ Enviando...</span>';
    }

    try {
      const baseUrl = await getApiUrl();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/dark-clips/import`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'tiktok',
          items: [videoData]
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
      showToast('Certifique-se de que o DarkTube está rodando em http://localhost:3000', true);
    }
  }

  function extractTikTokData(container) {
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
  }

  function injectButtons() {
    const containers = document.querySelectorAll('div[data-e2e="feed-video"], div[class*="DivVideoItemContainer"], div[class*="DivVideoWrapper"]');

    containers.forEach((container) => {
      if (container.querySelector('.dark-clips-inject-btn')) return;

      const video = container.querySelector('video');
      if (!video) return;

      const btn = document.createElement('button');
      btn.className = 'dark-clips-inject-btn';
      btn.style.position = 'absolute';
      btn.style.top = '20px';
      btn.style.right = '20px';
      btn.innerHTML = `
        <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <span>Dark Clips</span>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const data = extractTikTokData(container);
        sendToDarkClips(data, btn);
      });

      const computedPos = window.getComputedStyle(container).position;
      if (computedPos === 'static') container.style.position = 'relative';

      container.appendChild(btn);
    });
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
    return true;
  });

  console.log(`[${SCRIPT_NAME}] Ativo no TikTok!`);
})();
