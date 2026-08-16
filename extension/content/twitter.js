// Dark Clips - X / Twitter Content Script
(function () {
  const SCRIPT_NAME = 'DarkClips-Twitter';

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

  async function getAuthAndApi() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['darktube_api_url', 'darktube_token', 'darktube_user'], (res) => {
        resolve({
          baseUrl: res.darktube_api_url || 'http://localhost:3000',
          token: res.darktube_token || null,
          user: res.darktube_user || null
        });
      });
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
          platform: 'twitter',
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
        showToast('Vídeo do X enviado para o Dark Clips!');
      } else {
        throw new Error(result.error || 'Erro ao importar');
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
      showToast('Certifique-se de que o DarkTube está rodando em http://localhost:3000', true);
    }
  }

  function extractTweetData(tweetArticle) {
    const video = tweetArticle.querySelector('video');

    let tweetUrl = window.location.href;
    const timeLink = tweetArticle.querySelector('time')?.closest('a');
    if (timeLink) {
      tweetUrl = timeLink.href;
    }

    let authorName = 'X Creator';
    let authorHandle = '@x';
    let authorAvatar = '';

    const userBlock = tweetArticle.querySelector('div[data-testid="User-Name"]');
    if (userBlock) {
      const links = userBlock.querySelectorAll('a');
      if (links.length > 0) authorName = links[0].textContent?.trim() || authorName;
      if (links.length > 1) authorHandle = links[1].textContent?.trim() || authorHandle;
    }

    const avatarImg = tweetArticle.querySelector('div[data-testid="Tweet-User-Avatar"] img');
    if (avatarImg) {
      authorAvatar = avatarImg.getAttribute('src') || '';
    }

    let caption = '';
    const textEl = tweetArticle.querySelector('div[data-testid="tweetText"]');
    if (textEl) {
      caption = textEl.textContent?.trim() || '';
    }

    return {
      url: tweetUrl,
      videoUrl: video ? (video.src || tweetUrl) : tweetUrl,
      thumbnailUrl: video ? video.getAttribute('poster') || '' : '',
      duration: video ? Math.round(video.duration || 15) : 15,
      authorName,
      authorHandle,
      authorAvatar,
      originalCaption: caption,
      platform: 'twitter',
      metrics: {}
    };
  }

  function injectButtons() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');

    tweets.forEach((tweet) => {
      if (tweet.querySelector('.dark-clips-inject-btn')) return;

      const video = tweet.querySelector('video, div[data-testid="videoPlayer"], div[data-testid="videoComponent"]');
      if (!video) return;

      const actionsRow = tweet.querySelector('div[role="group"]');
      if (!actionsRow) return;

      const btn = document.createElement('button');
      btn.className = 'dark-clips-inject-btn';
      btn.style.marginLeft = 'auto';
      btn.innerHTML = `
        <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <span>Dark Clips</span>
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const data = extractTweetData(tweet);
        sendToDarkClips(data, btn);
      });

      actionsRow.appendChild(btn);
    });
  }

  setInterval(injectButtons, 1500);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = [];
      document.querySelectorAll('article[data-testid="tweet"]').forEach((tweet) => {
        if (tweet.querySelector('video')) {
          videos.push(extractTweetData(tweet));
        }
      });
      sendResponse({ success: true, videos });
    }
    return true;
  });

  console.log(`[${SCRIPT_NAME}] Ativo no X/Twitter!`);
})();
