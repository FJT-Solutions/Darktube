// Dark Clips - Instagram Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-Instagram';
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
          platform: 'instagram',
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
        showToast('Vídeo enviado com sucesso para o Dark Clips!');
      } else {
        throw new Error(result.error || 'Erro ao importar');
      }
    } catch (err) {
      console.error('[DarkClips] Erro ao enviar:', err);
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

  function extractReelData(container) {
    try {
      const video = container.querySelector('video');
      const currentUrl = window.location.href;

      let authorHandle = '@instagram';
      let authorName = 'Instagram Creator';
      let authorAvatar = '';

      const authorLink = container.querySelector('header a, a[role="link"][href^="/"]');
      if (authorLink) {
        const handle = authorLink.getAttribute('href')?.replace(/\//g, '');
        if (handle && !['explore', 'reels', 'direct', 'stories'].includes(handle)) {
          authorHandle = `@${handle}`;
          authorName = authorLink.textContent?.trim() || handle;
        }
      }

      const avatarImg = container.querySelector('header img, img[alt*="perfil"], img[alt*="profile"]');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || '';
      }

      let caption = '';
      const captionEl = container.querySelector('h1, span._ap3a, div[class*="caption"], div[class*="Description"]');
      if (captionEl) {
        caption = captionEl.textContent?.trim() || '';
      }

      let likes = 0;
      const likesEl = container.querySelector('button[type="button"] span, span[class*="html-span"]');
      if (likesEl) {
        const txt = likesEl.textContent?.replace(/\D/g, '');
        if (txt) likes = parseInt(txt, 10);
      }

      return {
        url: currentUrl,
        videoUrl: video ? (video.src || video.querySelector('source')?.src || currentUrl) : currentUrl,
        thumbnailUrl: video ? video.getAttribute('poster') || '' : '',
        duration: video ? Math.round(video.duration || 15) : 15,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'instagram',
        metrics: { likes }
      };
    } catch (e) {
      return {
        url: window.location.href,
        videoUrl: window.location.href,
        authorName: 'Instagram Creator',
        authorHandle: '@instagram',
        platform: 'instagram',
        metrics: {}
      };
    }
  }

  function injectButtons() {
    try {
      const reelContainers = document.querySelectorAll('article, div[role="dialog"], div[data-blade-container="true"], section > main');

      reelContainers.forEach((container) => {
        if (container.querySelector('.dark-clips-inject-btn')) return;

        const video = container.querySelector('video');
        if (!video) return;

        const btn = document.createElement('button');
        btn.className = 'dark-clips-inject-btn';
        btn.style.position = 'absolute';
        btn.style.top = '16px';
        btn.style.right = '16px';
        btn.innerHTML = `
          <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span>Dark Clips</span>
        `;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const data = extractReelData(container);
          sendToDarkClips(data, btn);
        });

        const computedPos = window.getComputedStyle(container).position;
        if (computedPos === 'static') container.style.position = 'relative';

        container.appendChild(btn);
      });
    } catch {}
  }

  setInterval(injectButtons, 1500);

  // Synchronous response without returning true
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = [];
      const seen = new Set();

      document.querySelectorAll('video').forEach((v) => {
        const container = v.closest('article') || v.closest('div[role="dialog"]') || v.parentElement;
        if (container) {
          const data = extractReelData(container);
          if (data.url && !seen.has(data.url)) {
            seen.add(data.url);
            videos.push(data);
          }
        }
      });

      if (videos.length === 0 && window.location.href.includes('/reel/')) {
        videos.push({
          url: window.location.href,
          videoUrl: window.location.href,
          authorName: 'Instagram Creator',
          authorHandle: '@instagram',
          platform: 'instagram'
        });
      }

      sendResponse({ success: true, videos });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no Instagram!`);
})();
