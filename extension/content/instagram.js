// Dark Clips - Instagram Content Script (Posts, Reels & Carrossel Extractor)
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
    const itemList = Array.isArray(items) ? items : [items];
    if (itemList.length === 0) return;

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
          items: itemList,
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
        showToast(`${itemList.length} item(ns) enviado(s) para o Dark Clips!`);
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

  // Get current page profile author if on a user profile page
  function getPageProfileAuthor() {
    let authorHandle = '@instagram';
    let authorName = 'Instagram Creator';
    let authorAvatar = '';

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1 && !['explore', 'reels', 'direct', 'stories', 'p', 'reel'].includes(pathParts[0])) {
      authorHandle = `@${pathParts[0]}`;
      authorName = pathParts[0];
    }

    // Try finding profile header elements
    const headerTitle = document.querySelector('header h2, header h1, section h2');
    if (headerTitle) {
      authorName = headerTitle.textContent?.trim() || authorName;
    }

    const headerAvatar = document.querySelector('header img, section img[alt*="profile"], section img[alt*="perfil"]');
    if (headerAvatar) {
      authorAvatar = headerAvatar.getAttribute('src') || '';
    }

    return { authorHandle, authorName, authorAvatar };
  }

  // Extract single modal or open post data
  function extractModalOrFeedPostData(container) {
    try {
      const video = container.querySelector('video');
      const img = container.querySelector('div[role="presentation"] img, article img[decoding="auto"]');
      
      // Determine post URL
      let postUrl = window.location.href;
      const permalinkEl = container.querySelector('a[href*="/p/"], a[href*="/reel/"]');
      if (permalinkEl) {
        const href = permalinkEl.getAttribute('href');
        if (href) {
          postUrl = href.startsWith('http') ? href : `https://www.instagram.com${href}`;
        }
      }

      // Author extraction
      const pageAuthor = getPageProfileAuthor();
      let authorHandle = pageAuthor.authorHandle;
      let authorName = pageAuthor.authorName;
      let authorAvatar = pageAuthor.authorAvatar;

      const authorLink = container.querySelector('header a, a[role="link"][href^="/"]');
      if (authorLink) {
        const handle = authorLink.getAttribute('href')?.replace(/\//g, '');
        if (handle && !['explore', 'reels', 'direct', 'stories', 'p', 'reel'].includes(handle)) {
          authorHandle = `@${handle}`;
          authorName = authorLink.textContent?.trim() || handle;
        }
      }

      const avatarImg = container.querySelector('header img, img[alt*="perfil"], img[alt*="profile"]');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || authorAvatar;
      }

      // Caption extraction
      let caption = '';
      const captionEl = container.querySelector('h1, span._ap3a, div[class*="caption"], div[class*="Description"]');
      if (captionEl) {
        caption = captionEl.textContent?.trim() || '';
      } else if (img && img.getAttribute('alt')) {
        caption = img.getAttribute('alt') || '';
      }

      // Likes count
      let likes = 0;
      const likesEl = container.querySelector('button[type="button"] span, span[class*="html-span"]');
      if (likesEl) {
        const txt = likesEl.textContent?.replace(/\D/g, '');
        if (txt) likes = parseInt(txt, 10) || 0;
      }

      // Media URL
      let videoUrl = video ? (video.src || video.querySelector('source')?.src || postUrl) : postUrl;
      let thumbnailUrl = video ? video.getAttribute('poster') || '' : (img ? img.src : '');

      return {
        url: postUrl,
        videoUrl,
        thumbnailUrl,
        duration: video ? Math.round(video.duration || 15) : 15,
        authorName,
        authorHandle,
        authorAvatar,
        originalCaption: caption,
        platform: 'instagram',
        metrics: { likes }
      };
    } catch (e) {
      return null;
    }
  }

  // Extract all posts on the page (Grid items, Feed, Open Modals)
  function getAllPageInstagramPosts() {
    const posts = [];
    const seenUrls = new Set();
    const pageAuthor = getPageProfileAuthor();

    // 1. Check open modal or full article view first
    const modal = document.querySelector('div[role="dialog"], article');
    if (modal) {
      const modalData = extractModalOrFeedPostData(modal);
      if (modalData && modalData.url) {
        seenUrls.add(modalData.url.split('?')[0]);
        posts.push(modalData);
      }
    }

    // 2. Extract from Profile Grid / Explore Grid / Feed links
    const postLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
    postLinks.forEach((link) => {
      let href = link.getAttribute('href') || '';
      if (!href) return;

      const cleanHref = href.startsWith('http') ? href.split('?')[0] : `https://www.instagram.com${href.split('?')[0]}`;
      if (seenUrls.has(cleanHref)) return;
      seenUrls.add(cleanHref);

      // Thumbnail & Caption from inner image
      const img = link.querySelector('img');
      const thumbnailUrl = img ? (img.getAttribute('src') || '') : '';
      const caption = img ? (img.getAttribute('alt') || '') : '';

      posts.push({
        url: cleanHref,
        videoUrl: cleanHref,
        thumbnailUrl,
        duration: 15,
        authorName: pageAuthor.authorName,
        authorHandle: pageAuthor.authorHandle,
        authorAvatar: pageAuthor.authorAvatar,
        originalCaption: caption,
        platform: 'instagram',
        metrics: {}
      });
    });

    // 3. Extract any standalone videos on page
    document.querySelectorAll('video').forEach((video) => {
      const container = video.closest('article') || video.closest('div[role="dialog"]');
      if (container) {
        const data = extractModalOrFeedPostData(container);
        if (data && data.url) {
          const clean = data.url.split('?')[0];
          if (!seenUrls.has(clean)) {
            seenUrls.add(clean);
            posts.push(data);
          }
        }
      }
    });

    return posts;
  }

  // Inject buttons without duplicate
  function injectButtons() {
    try {
      // 1. Modals & Feed Articles (Inject strictly ONCE per article/dialog)
      const mainPosts = document.querySelectorAll('article, div[role="dialog"]');
      mainPosts.forEach((container) => {
        // If child article exists inside dialog, only inject in article
        if (container.getAttribute('role') === 'dialog' && container.querySelector('article')) {
          return;
        }

        // Avoid double injection
        if (container.dataset.darkClipsInjected === 'true' || container.querySelector('.dark-clips-inject-btn')) {
          return;
        }

        const videoOrImg = container.querySelector('video') || container.querySelector('img');
        if (!videoOrImg) return;

        container.dataset.darkClipsInjected = 'true';

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
          const data = extractModalOrFeedPostData(container);
          if (data) sendToDarkClips([data], btn);
        });

        const computedPos = window.getComputedStyle(container).position;
        if (computedPos === 'static') container.style.position = 'relative';

        container.appendChild(btn);
      });
    } catch (err) {
      console.warn('[DarkClips] Injection check:', err);
    }
  }

  setInterval(injectButtons, 1500);

  // Synchronous response to popup for Bulk / Single Extraction
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_VIDEOS') {
      const videos = getAllPageInstagramPosts();
      sendResponse({ success: true, videos });
    }
  });

  console.log(`[${SCRIPT_NAME}] Ativo no Instagram (Posts, Reels, Carrossel & Grade de Perfil)!`);
})();
