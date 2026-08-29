// Dark Clips - X / Twitter Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-Twitter';
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

      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'IMPORT_CLIP',
          endpoint,
          headers,
          body: {
            platform: 'twitter',
            items: [videoData],
            userId: user?.id || null
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'Sem resposta do background service worker' });
          }
        });
      });

      if (result.success && (result.data?.success || result.data?.clips || result.status === 200)) {
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
        showToast('Vídeo do X/Twitter enviado para o Dark Clips!');
      } else {
        throw new Error(result.error || result.data?.error || 'Erro ao importar');
      }
    } catch (err) {
      console.error('[DarkClips Twitter] Erro:', err);
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

  function extractTweetData(tweetElement) {
    try {
      const currentUrl = window.location.href;

      let authorName = 'X User';
      let authorHandle = '@twitter';
      let authorAvatar = '';

      const userEl = tweetElement.querySelector('div[data-testid="User-Name"]');
      if (userEl) {
        const handleEl = userEl.querySelector('a[href^="/"]');
        if (handleEl) {
          authorHandle = `@${handleEl.getAttribute('href')?.replace(/\//g, '')}`;
        }
        authorName = userEl.querySelector('span')?.textContent || authorHandle;
      }

      const avatarImg = tweetElement.querySelector('img[src*="profile_images"]');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || '';
      }

      let caption = '';
      const textEl = tweetElement.querySelector('div[data-testid="tweetText"]');
      if (textEl) {
        caption = textEl.textContent?.trim() || '';
      }

      return {
        url: currentUrl,
        videoUrl: currentUrl,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'twitter',
        metrics: {}
      };
    } catch {
      return {
        url: window.location.href,
        videoUrl: window.location.href,
        authorName: 'X User',
        authorHandle: '@twitter',
        platform: 'twitter',
        metrics: {}
      };
    }
  }

  function injectButtons() {
    try {
      const tweetsWithVideo = document.querySelectorAll('article[data-testid="tweet"]');

      tweetsWithVideo.forEach((tweet) => {
        if (tweet.querySelector('.dark-clips-inject-btn')) return;
        const video = tweet.querySelector('video');
        if (!video) return;

        const actionGroup = tweet.querySelector('div[role="group"]');
        if (!actionGroup) return;

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
              const data = extractTweetData(tweet);
              sendToDarkClips(data, btn);
            }
          }, true);
        });

        actionGroup.appendChild(btn);
      });
    } catch {}
  }

  setInterval(injectButtons, 1500);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = [];
      document.querySelectorAll('article[data-testid="tweet"]').forEach((t) => {
        if (t.querySelector('video')) {
          videos.push(extractTweetData(t));
        }
      });
      sendResponse({ success: true, videos });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no X!`);
})();
