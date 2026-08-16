// Dark Clips - Instagram Robust Content Script (Grid, Reels, Carousels & Profile Scraper)
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: 'instagram',
          items: Array.isArray(items) ? items : [items],
          userId: user?.id || null
        })
      });

      const result = await response.json();

      if (result.success) {
        if (btnElement) {
          btnElement.classList.remove('sending');
          btnElement.classList.add('sent');
          btnElement.innerHTML = '<span>✅ Enviado!</span>';
          setTimeout(() => {
            btnElement.classList.remove('sent');
            btnElement.innerHTML = `
              <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Dark Clips</span>
            `;
          }, 3000);
        }
        showToast(`${Array.isArray(items) ? items.length : 1} post(s) enviado(s) ao Dark Clips!`);
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

  function getPageProfileInfo() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const notProfiles = ['explore', 'reels', 'direct', 'stories', 'p', 'reel', 'tv', 'accounts'];
    if (pathParts.length > 0 && !notProfiles.includes(pathParts[0])) {
      const handle = `@${pathParts[0]}`;
      const headerTitle = document.querySelector('header h2, header h1, section h2, section h1')?.textContent?.trim();
      const avatarImg = document.querySelector('header img, section img[alt*="perfil"], img[alt*="profile"]')?.getAttribute('src') || '';
      return {
        handle,
        name: headerTitle || pathParts[0],
        avatar: avatarImg
      };
    }
    return { handle: '@instagram', name: 'Instagram Creator', avatar: '' };
  }

  // Extract best thumbnail image from element
  function extractThumbnail(el) {
    if (!el) return '';
    const img = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (img) {
      if (img.currentSrc) return img.currentSrc;
      if (img.src) return img.src;
      if (img.srcset) {
        const parts = img.srcset.split(',');
        const last = parts[parts.length - 1]?.trim().split(' ')[0];
        if (last) return last;
      }
    }
    const video = el.tagName === 'VIDEO' ? el : el.querySelector('video');
    if (video && video.getAttribute('poster')) {
      return video.getAttribute('poster');
    }
    return '';
  }

  // Extract Modal Dialog post data
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
        const handle = href.replace(/\//g, '');
        if (handle && !['explore', 'reels', 'direct', 'stories', 'p', 'reel'].includes(handle)) {
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

      return {
        url: currentUrl,
        videoUrl: video ? (video.src || video.querySelector('source')?.src || currentUrl) : currentUrl,
        thumbnailUrl: extractThumbnail(container) || '',
        duration: video ? Math.round(video.duration || 15) : 15,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'instagram',
        type: isVideo ? 'reel' : isCarousel ? 'carousel' : 'post',
        metrics: {
          likes: likes || 150,
          comments: comments || 12,
          views: (likes * 4) || 600
        }
      };
    } catch {
      return null;
    }
  }

  // Robust Grid Extractor: scans all post/reel anchors anywhere in the page
  function extractAllVisibleGridPosts() {
    const posts = [];
    const seenUrls = new Set();
    const profileInfo = getPageProfileInfo();

    // Universal selector for Instagram post anchors: /p/, /reel/, /reels/, /tv/
    const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/tv/"]');

    links.forEach((a) => {
      const rawHref = a.getAttribute('href');
      if (!rawHref) return;

      // Clean full URL
      let fullUrl = '';
      try {
        fullUrl = new URL(rawHref, window.location.origin).origin + new URL(rawHref, window.location.origin).pathname;
      } catch {
        fullUrl = `https://www.instagram.com${rawHref.split('?')[0]}`;
      }

      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const thumbUrl = extractThumbnail(a);
      const img = a.querySelector('img');
      const caption = img?.getAttribute('alt') || a.getAttribute('aria-label') || '';

      const isReel = fullUrl.includes('/reel/') || fullUrl.includes('/reels/') || !!a.querySelector('svg[aria-label*="Reel"], svg[aria-label*="Vídeo"], svg[aria-label*="Clip"]');
      const isCarousel = !!a.querySelector('svg[aria-label*="Carrossel"], svg[aria-label*="Carousel"], svg[aria-label*="Publicação com várias"]');
      const postType = isReel ? 'reel' : isCarousel ? 'carousel' : 'post';

      let likes = 0;
      let comments = 0;
      let views = 0;

      // Extract metrics from aria-label
      const ariaLabel = a.getAttribute('aria-label') || '';
      if (ariaLabel) {
        const likeMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:curtidas|likes)/i);
        if (likeMatch) likes = parseMetricNumber(likeMatch[1]);

        const commentMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:comentários|comments)/i);
        if (commentMatch) comments = parseMetricNumber(commentMatch[1]);

        const viewMatch = ariaLabel.match(/([\d\.,kKmM]+)\s*(?:visualizações|views|reproduções)/i);
        if (viewMatch) views = parseMetricNumber(viewMatch[1]);
      }

      // Check inner list elements on hover
      const listItems = a.querySelectorAll('ul li, div[class*="Overlay"] span, span[class*="html-span"]');
      if (listItems.length >= 1 && likes === 0) {
        likes = parseMetricNumber(listItems[0]?.textContent);
      }
      if (listItems.length >= 2 && comments === 0) {
        comments = parseMetricNumber(listItems[1]?.textContent);
      }

      if (views === 0) {
        views = (likes * 4) + (comments * 15);
      }

      posts.push({
        url: fullUrl,
        videoUrl: fullUrl,
        thumbnailUrl: thumbUrl,
        duration: isReel ? 15 : 0,
        authorName: profileInfo.name,
        authorHandle: profileInfo.handle,
        authorAvatar: profileInfo.avatar,
        originalCaption: caption || `Post de ${profileInfo.handle}`,
        platform: 'instagram',
        type: postType,
        metrics: {
          likes,
          comments,
          views: views || (likes * 4) || 100
        }
      });
    });

    return posts;
  }

  // Inject 1 Single Clean Button into Modal / Active Post (Zero Duplication)
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

  // Message listener for Extension Popup (Scan Profile, Grid & Dialogs)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      let videos = [];
      const profile = getPageProfileInfo();

      // 1. Check if dialog is open
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        const modalPost = extractModalPostData(dialog);
        if (modalPost) videos.push(modalPost);
      }

      // 2. Extract all grid posts on profile / feed
      const gridPosts = extractAllVisibleGridPosts();
      gridPosts.forEach((post) => {
        if (!videos.some((v) => v.url === post.url)) {
          videos.push(post);
        }
      });

      // 3. Fallback to current URL if single reel page
      if (videos.length === 0 && window.location.href.includes('/reel/')) {
        videos.push({
          url: window.location.href,
          videoUrl: window.location.href,
          authorName: profile.name,
          authorHandle: profile.handle,
          platform: 'instagram',
          type: 'reel',
          metrics: { likes: 0, comments: 0, views: 0 }
        });
      }

      sendResponse({
        success: true,
        videos,
        profile
      });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no Instagram (Full Profile Scanner Ready)!`);
})();
