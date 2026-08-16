// Dark Clips - Instagram Content Script (Continuous Accumulator & Auto-Miner)
(function () {
  const SCRIPT_NAME = 'DarkClips-Instagram';
  const DEFAULT_API_URL = 'https://darktube.fjt-solutions.com';

  // In-memory persistent map of all posts accumulated during this page session
  const accumulatedSessionPosts = new Map();
  let isAutoMining = false;
  let autoMineInterval = null;

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

  async function sendToDarkClips(items, btnElement) {
    if (btnElement) {
      btnElement.classList.add('sending');
      btnElement.innerHTML = '<span>⏳ Enviando...</span>';
    }

    try {
      const { baseUrl, token, user } = await getAuthAndApi();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/dark-clips/import`;

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const list = Array.isArray(items) ? items : [items];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: 'instagram',
          items: list,
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
        showToast(`${list.length} post(s) enviado(s) ao Dark Clips com sucesso!`);
      } else {
        throw new Error(result.error || 'Erro ao importar');
      }
    } catch (err) {
      console.error('[DarkClips] Erro ao enviar:', err);
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

  // Parse metric strings like "12.5K", "1.2M", "15.430 curtidas"
  function parseMetricNumber(str) {
    if (!str) return 0;
    const clean = str.replace(/\./g, '').replace(/,/g, '.').toLowerCase();
    if (clean.includes('k') || clean.includes('mil')) {
      return Math.round(parseFloat(clean) * 1000) || 0;
    }
    if (clean.includes('m') || clean.includes('mi')) {
      return Math.round(parseFloat(clean) * 1000000) || 0;
    }
    const digits = str.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  // Extract author profile info from page URL
  function getPageProfileInfo() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const notProfiles = ['explore', 'reels', 'direct', 'stories', 'p', 'reel'];
    if (pathParts.length > 0 && !notProfiles.includes(pathParts[0])) {
      const handle = `@${pathParts[0]}`;
      const headerTitle = document.querySelector('header h2, header h1, main h2, main h1')?.textContent?.trim();
      const avatarImg = document.querySelector('header img, img[alt*="perfil"], img[alt*="profile"]')?.getAttribute('src') || '';
      return {
        handle,
        name: headerTitle || pathParts[0],
        avatar: avatarImg
      };
    }
    return { handle: '@instagram', name: 'Instagram Creator', avatar: '' };
  }

  // Extract single modal/dialog reel or post
  function extractModalPostData(container) {
    try {
      const video = container.querySelector('video');
      const currentUrl = window.location.href;
      const profileInfo = getPageProfileInfo();

      let authorHandle = profileInfo.handle;
      let authorName = profileInfo.name;
      let authorAvatar = profileInfo.avatar;

      const authorLink = container.querySelector('header a, a[role="link"][href^="/"]');
      if (authorLink) {
        const href = authorLink.getAttribute('href') || '';
        const handle = href.replace(/\//g, '').split('?')[0];
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
      let comments = 0;

      const likesEl = container.querySelector('section button[type="button"] span, span[class*="html-span"]');
      if (likesEl) {
        likes = parseMetricNumber(likesEl.textContent);
      }

      const commentsEls = container.querySelectorAll('ul li');
      if (commentsEls.length > 1) {
        comments = commentsEls.length - 1;
      }

      const isVideo = !!video;
      const isCarousel = !!container.querySelector('div[aria-label*="carrossel"], div[aria-label*="carousel"], ul[class*="carousel"]');

      let thumbUrl = '';
      if (video) {
        thumbUrl = video.getAttribute('poster') || '';
      }
      if (!thumbUrl) {
        const img = container.querySelector('div[role="dialog"] img, article img');
        thumbUrl = img?.currentSrc || img?.src || '';
      }

      return {
        url: currentUrl,
        videoUrl: video ? (video.src || video.querySelector('source')?.src || currentUrl) : currentUrl,
        thumbnailUrl: thumbUrl,
        duration: video ? Math.round(video.duration || 15) : 15,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'instagram',
        type: isVideo ? 'reel' : isCarousel ? 'carousel' : 'post',
        metrics: {
          likes,
          comments,
          views: likes * 5 || 1000
        }
      };
    } catch {
      return null;
    }
  }

  // Extract ALL visible grid posts on Profile, Feed, or Search (contains `/p/` or `/reel/`)
  function scanAndAccumulateGridPosts() {
    const profileInfo = getPageProfileInfo();
    const anchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], div[role="presentation"] a, main a[href]');

    anchors.forEach((a) => {
      const rawHref = a.getAttribute('href');
      if (!rawHref) return;

      if (!rawHref.includes('/p/') && !rawHref.includes('/reel/')) return;

      const cleanPath = rawHref.split('?')[0].split('#')[0];
      const fullUrl = cleanPath.startsWith('http') ? cleanPath : `https://www.instagram.com${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;

      // Extract Thumbnail
      const img = a.querySelector('img');
      let thumbUrl = '';
      if (img) {
        thumbUrl = img.currentSrc || img.src || img.getAttribute('src') || '';
        if (!thumbUrl && img.getAttribute('srcset')) {
          thumbUrl = img.getAttribute('srcset').split(',')[0].split(' ')[0];
        }
      }
      if (!thumbUrl) {
        const bgDiv = a.querySelector('div[style*="background-image"]');
        if (bgDiv) {
          const match = bgDiv.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
          if (match) thumbUrl = match[1];
        }
      }

      const caption = img?.getAttribute('alt') || a.getAttribute('aria-label') || '';

      const isReel = cleanPath.includes('/reel') || !!a.querySelector('svg[aria-label*="Reel"], svg[aria-label*="Vídeo"], svg[aria-label*="Clip"], svg[aria-label*="Reels"]');
      const isCarousel = !!a.querySelector('svg[aria-label*="Carrossel"], svg[aria-label*="Carousel"], svg[aria-label*="Publicação com várias"]');
      const postType = isReel ? 'reel' : isCarousel ? 'carousel' : 'post';

      let likes = 0;
      let comments = 0;
      let views = 0;

      const ariaLabel = a.getAttribute('aria-label') || caption;
      if (ariaLabel) {
        const likeMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:curtidas|likes)/i);
        if (likeMatch) likes = parseMetricNumber(likeMatch[1]);

        const commentMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:comentários|comments)/i);
        if (commentMatch) comments = parseMetricNumber(commentMatch[1]);

        const viewMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:visualizações|views|reproduções)/i);
        if (viewMatch) views = parseMetricNumber(viewMatch[1]);
      }

      const listItems = a.querySelectorAll('ul li, div[class*="Overlay"] span');
      if (listItems.length >= 1 && likes === 0) {
        likes = parseMetricNumber(listItems[0]?.textContent);
      }
      if (listItems.length >= 2 && comments === 0) {
        comments = parseMetricNumber(listItems[1]?.textContent);
      }

      if (views === 0) {
        views = (likes * 4) + (comments * 15);
      }

      const postData = {
        url: fullUrl,
        videoUrl: fullUrl,
        thumbnailUrl: thumbUrl,
        duration: isReel ? 15 : 0,
        authorName: profileInfo.name,
        authorHandle: profileInfo.handle,
        authorAvatar: profileInfo.avatar,
        originalCaption: caption,
        platform: 'instagram',
        type: postType,
        metrics: {
          likes,
          comments,
          views: views || (likes * 4) || 100
        }
      };

      accumulatedSessionPosts.set(fullUrl, postData);
    });

    return Array.from(accumulatedSessionPosts.values());
  }

  // Run periodic and scroll listeners to accumulate posts in real-time
  window.addEventListener('scroll', () => {
    scanAndAccumulateGridPosts();
  }, { passive: true });

  // Initial Scan
  setTimeout(scanAndAccumulateGridPosts, 1000);
  setInterval(scanAndAccumulateGridPosts, 3000);

  // Auto-Miner: Programmatically scrolls down and collects batches of posts
  function startAutoMiner(targetCount = 48, onProgress) {
    if (isAutoMining) return;
    isAutoMining = true;

    showToast(`Iniciando auto-mineração (alvo: ${targetCount} posts)...`);

    let scrollAttempts = 0;
    const maxAttempts = 30;

    autoMineInterval = setInterval(() => {
      window.scrollBy({ top: 1200, behavior: 'smooth' });
      scanAndAccumulateGridPosts();
      scrollAttempts++;

      const currentTotal = accumulatedSessionPosts.size;
      if (onProgress) onProgress(currentTotal);

      if (currentTotal >= targetCount || scrollAttempts >= maxAttempts) {
        stopAutoMiner();
        showToast(`Auto-mineração concluída: ${currentTotal} posts coletados!`);
      }
    }, 600);
  }

  function stopAutoMiner() {
    isAutoMining = false;
    if (autoMineInterval) {
      clearInterval(autoMineInterval);
      autoMineInterval = null;
    }
  }

  // Inject 1 Single Clean Button into Modal / Active Post
  function injectButtons() {
    try {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        if (!dialog.querySelector('.dark-clips-inject-btn')) {
          const btn = createFloatingButton(() => {
            const data = extractModalPostData(dialog);
            if (data) sendToDarkClips(data, btn);
          });
          btn.style.position = 'absolute';
          btn.style.top = '16px';
          btn.style.right = '56px';

          const computedPos = window.getComputedStyle(dialog).position;
          if (computedPos === 'static') dialog.style.position = 'relative';

          dialog.appendChild(btn);
        }
        return;
      }

      const standaloneArticles = document.querySelectorAll('article:not([role="dialog"] article)');
      standaloneArticles.forEach((article) => {
        if (article.querySelector('.dark-clips-inject-btn')) return;

        const video = article.querySelector('video');
        if (!video) return;

        const btn = createFloatingButton(() => {
          const data = extractModalPostData(article);
          if (data) sendToDarkClips(data, btn);
        });
        btn.style.position = 'absolute';
        btn.style.top = '16px';
        btn.style.right = '16px';

        const computedPos = window.getComputedStyle(article).position;
        if (computedPos === 'static') article.style.position = 'relative';

        article.appendChild(btn);
      });
    } catch {}
  }

  function createFloatingButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'dark-clips-inject-btn';
    btn.innerHTML = `
      <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      <span>Dark Clips</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  setInterval(injectButtons, 1500);

  // Message listener for Extension Popup (Scan All Accumulated & Auto-Mine)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      scanAndAccumulateGridPosts();

      let videos = [];
      const seen = new Set();

      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        const modalPost = extractModalPostData(dialog);
        if (modalPost) {
          seen.add(modalPost.url);
          videos.push(modalPost);
        }
      }

      accumulatedSessionPosts.forEach((post) => {
        if (!seen.has(post.url)) {
          seen.add(post.url);
          videos.push(post);
        }
      });

      if (videos.length === 0 && window.location.href.includes('/reel/')) {
        const profileInfo = getPageProfileInfo();
        videos.push({
          url: window.location.href,
          videoUrl: window.location.href,
          authorName: profileInfo.name,
          authorHandle: profileInfo.handle,
          platform: 'instagram',
          type: 'reel',
          metrics: { likes: 0, comments: 0, views: 0 }
        });
      }

      sendResponse({
        success: true,
        videos,
        totalAccumulated: accumulatedSessionPosts.size,
        profile: getPageProfileInfo()
      });
    } else if (request.action === 'START_AUTO_MINE') {
      const target = request.targetCount || 48;
      startAutoMiner(target);
      sendResponse({ success: true, isMining: true });
    } else if (request.action === 'STOP_AUTO_MINE') {
      stopAutoMiner();
      sendResponse({ success: true, isMining: false });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no Instagram (Continuous Accumulator & Auto-Miner)!`);
})();
