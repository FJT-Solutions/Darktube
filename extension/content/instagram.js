// Dark Clips - Instagram Content Script (Universal Scanner, Continuous Accumulator & Auto-Miner)
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
          let baseUrl = res?.darktube_api_url || DEFAULT_API_URL;
          // Force production URL if localhost or old invalid format was saved in storage
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

  async function getInstagramCookies() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'GET_COOKIES', domain: 'instagram.com' }, (response) => {
          if (chrome.runtime.lastError || !response?.cookies) {
            resolve([]);
          } else {
            resolve(response.cookies);
          }
        });
      } catch {
        resolve([]);
      }
    });
  }

  async function sendToDarkClips(items, btnElement) {
    console.log('[DarkClips] Enviando dados ao servidor:', items);
    if (!items || (Array.isArray(items) && items.length === 0)) {
      showToast('Nenhum dado de vídeo encontrado para enviar', true);
      return;
    }

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

      // Captura cookies do Instagram via background service worker
      const sessionCookies = await getInstagramCookies();
      console.log(`[DarkClips] ${sessionCookies.length} cookies capturados para autenticação.`);

      // Dispara o fetch através do Background Service Worker para burlar CSP e CORS do Instagram
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'IMPORT_CLIP',
          endpoint,
          headers,
          body: {
            platform: 'instagram',
            items: list,
            userId: user?.id || null,
            sessionCookies
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'Sem resposta do background service worker' });
          }
        });
      });

      console.log('[DarkClips] Resposta do servidor DarkTube:', result);

      if (result.success && (result.data?.success || result.data?.clips || result.status === 200)) {
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
        showToast(`${list.length} post(s) enviado(s) ao Dark Clips!`);
      } else {
        throw new Error(result.error || result.data?.error || 'Erro retornado pelo servidor');
      }
    } catch (err) {
      console.error('[DarkClips] Erro ao enviar:', err);
      if (btnElement) {
        btnElement.classList.remove('sending');
        btnElement.innerHTML = '<span>❌ Erro</span>';
        setTimeout(() => {
          btnElement.innerHTML = `
            <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span>Dark Clips</span>
          `;
        }, 3000);
      }
      showToast(`Erro ao enviar: ${err.message || 'Falha de conexão'}`, true);
    }
  }

  function parseMetricNumber(str) {
    if (!str) return 0;
    const clean = String(str).replace(/\./g, '').replace(/,/g, '.').toLowerCase();
    if (clean.includes('k') || clean.includes('mil')) {
      return Math.round(parseFloat(clean) * 1000) || 0;
    }
    if (clean.includes('m') || clean.includes('mi')) {
      return Math.round(parseFloat(clean) * 1000000) || 0;
    }
    const digits = String(str).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function getPageProfileInfo() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const notProfiles = ['explore', 'reels', 'direct', 'stories', 'p', 'reel', 'tv'];
    if (pathParts.length > 0 && !notProfiles.includes(pathParts[0])) {
      const handle = `@${pathParts[0]}`;
      const headerTitle = document.querySelector('header h2, header h1, main h2, main h1, h2')?.textContent?.trim();
      const avatarImg = document.querySelector('header img, img[alt*="perfil"], img[alt*="profile"]')?.getAttribute('src') || '';
      return {
        handle,
        name: headerTitle || pathParts[0],
        avatar: avatarImg
      };
    }
    return { handle: '@instagram', name: 'Instagram Creator', avatar: '' };
  }

  function extractModalPostData(container) {
    try {
      const video = container.querySelector('video');
      const profileInfo = getPageProfileInfo();

      // 1. Resolve Post/Reel URL accurately (ignoring /audio/ and secondary links)
      let resolvedUrl = '';
      const allCandidateLinks = Array.from(container.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/tv/"]'));
      for (const link of allCandidateLinks) {
        const rawHref = link.getAttribute('href') || link.href || '';
        if (rawHref.includes('/audio/') || rawHref.includes('/tagged/') || rawHref.includes('/liked_by/')) continue;
        const match = rawHref.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
        if (match) {
          resolvedUrl = `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/`;
          break;
        }
      }

      if (!resolvedUrl) {
        const currentUrl = window.location.href.split('?')[0].split('#')[0];
        const match = currentUrl.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
        if (match && !currentUrl.includes('/audio/')) {
          resolvedUrl = `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/`;
        }
      }

      if (!resolvedUrl) {
        // Look in parent elements up to body
        let parent = container.parentElement;
        while (parent && parent !== document.body && !resolvedUrl) {
          const pLinks = Array.from(parent.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
          for (const pl of pLinks) {
            const h = pl.getAttribute('href') || pl.href || '';
            if (h.includes('/audio/')) continue;
            const pm = h.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
            if (pm) {
              resolvedUrl = `https://www.instagram.com/${pm[1] === 'reels' ? 'reel' : pm[1]}/${pm[2]}/`;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }

      if (!resolvedUrl) {
        resolvedUrl = window.location.href.split('?')[0];
      }

      // 2. Resolve Author Info
      let authorHandle = profileInfo.handle;
      let authorName = profileInfo.name;
      let authorAvatar = profileInfo.avatar;

      const authorLink = container.querySelector('header a, a[role="link"][href^="/"], div[role="dialog"] a[href^="/"]');
      if (authorLink) {
        const href = authorLink.getAttribute('href') || '';
        const handle = href.replace(/\//g, '').split('?')[0];
        if (handle && !['explore', 'reels', 'direct', 'stories', 'home', 'tags'].includes(handle)) {
          authorHandle = `@${handle.replace(/^@+/, '')}`;
          authorName = authorLink.textContent?.trim() || handle;
        }
      }

      const avatarImg = container.querySelector('header img, img[alt*="perfil"], img[alt*="profile"], img[alt*="Avatar"]');
      if (avatarImg) {
        authorAvatar = avatarImg.getAttribute('src') || '';
      }

      // 3. Resolve Caption
      let caption = '';
      const captionEl = container.querySelector('h1, span._ap3a, div[class*="caption"], div[class*="Description"], span[class*="_a9zs"]');
      if (captionEl) {
        caption = captionEl.textContent?.trim() || '';
      }

      // 4. Resolve Metrics (Likes / Comments)
      let likes = 0;
      let comments = 0;

      const likesEl = container.querySelector('a[href*="/liked_by/"] span, a[href*="liked_by"], section button[type="button"] span, span[class*="html-span"]');
      if (likesEl) {
        likes = parseMetricNumber(likesEl.textContent);
      }
      if (!likes) {
        const allSpans = Array.from(container.querySelectorAll('span, a, div'));
        for (const sp of allSpans) {
          const txt = sp.textContent || '';
          if ((txt.includes('curtida') || txt.includes('curtidas') || txt.includes('like') || txt.includes('likes')) && /\d/.test(txt)) {
            likes = parseMetricNumber(txt);
            if (likes > 0) break;
          }
        }
      }

      const commentsEls = container.querySelectorAll('ul li, div[role="button"][tabindex="0"]');
      if (commentsEls.length > 1) {
        comments = commentsEls.length - 1;
      }
      const commentCountEl = container.querySelector('a[href*="/comments/"] span');
      if (commentCountEl) {
        const parsed = parseMetricNumber(commentCountEl.textContent);
        if (parsed > comments) comments = parsed;
      } else {
        const allSpans = Array.from(container.querySelectorAll('span'));
        for (const sp of allSpans) {
          const txt = sp.textContent || '';
          if (txt.includes('comentário') || txt.includes('comment')) {
            const parsed = parseMetricNumber(txt);
            if (parsed > 0) {
              comments = parsed;
              break;
            }
          }
        }
      }

      const isVideo = !!video || resolvedUrl.includes('/reel/') || resolvedUrl.includes('/reels/');
      const isCarousel = !!container.querySelector('div[aria-label*="carrossel"], div[aria-label*="carousel"], ul[class*="carousel"]');

      let directMediaUrl = '';
      if (video) {
        const vSrc = video.currentSrc || video.src || '';
        if (vSrc && !vSrc.startsWith('blob:')) {
          directMediaUrl = vSrc;
        }
      }

      let thumbUrl = '';
      if (video) {
        thumbUrl = video.getAttribute('poster') || '';
      }
      if (!thumbUrl) {
        const img = container.querySelector('div[role="dialog"] img, article img, img[style*="object-fit"]');
        thumbUrl = img?.currentSrc || img?.src || '';
      }

      return {
        url: resolvedUrl,
        videoUrl: directMediaUrl || resolvedUrl,
        directMediaUrl,
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
    } catch (err) {
      console.error('[DarkClips] Erro em extractModalPostData:', err);
      const profileInfo = getPageProfileInfo();
      return {
        url: window.location.href.split('?')[0],
        videoUrl: window.location.href.split('?')[0],
        thumbnailUrl: '',
        duration: 15,
        authorName: profileInfo.name,
        authorHandle: profileInfo.handle,
        authorAvatar: profileInfo.avatar,
        originalCaption: '',
        platform: 'instagram',
        type: 'reel',
        metrics: { likes: 0, comments: 0, views: 0 }
      };
    }
  }

  // Multi-Layer Universal Scanner for ALL posts on Profile Grid, Explore, Feed, or Search
  function scanAndAccumulateGridPosts() {
    const profileInfo = getPageProfileInfo();

    // ── LAYER 1: Scan ALL <a> tags on page ──
    const allAnchors = Array.from(document.querySelectorAll('a'));
    
    allAnchors.forEach((a) => {
      const rawHref = a.getAttribute('href') || a.href || '';
      if (!rawHref) return;

      // Filter only post or reel links, explicitly excluding audio and tagged links
      if (!rawHref.includes('/p/') && !rawHref.includes('/reel/') && !rawHref.includes('/reels/') && !rawHref.includes('/tv/')) {
        return;
      }
      if (rawHref.includes('/audio/') || rawHref.includes('/tagged/') || rawHref.includes('/liked_by/')) {
        return;
      }

      const cleanPath = rawHref.split('?')[0].split('#')[0];
      const match = cleanPath.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
      if (!match) return;

      const postTypeKey = match[1];
      const shortcode = match[2];
      const fullUrl = `https://www.instagram.com/${postTypeKey === 'reels' ? 'reel' : postTypeKey}/${shortcode}/`;

      // Extract Thumbnail
      let thumbUrl = '';
      const img = a.querySelector('img') || a.parentElement?.querySelector('img');
      if (img) {
        thumbUrl = img.currentSrc || img.src || img.getAttribute('src') || '';
        if (!thumbUrl && img.getAttribute('srcset')) {
          thumbUrl = img.getAttribute('srcset').split(',')[0].split(' ')[0];
        }
      }
      if (!thumbUrl) {
        const bgDiv = a.querySelector('div[style*="background-image"]');
        if (bgDiv) {
          const m = bgDiv.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
          if (m) thumbUrl = m[1];
        }
      }

      const caption = img?.getAttribute('alt') || a.getAttribute('aria-label') || '';

      const isReel = postTypeKey.includes('reel') || !!a.querySelector('svg[aria-label*="Reel"], svg[aria-label*="Vídeo"], svg[aria-label*="Clip"], svg[aria-label*="Reels"]');
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

    // ── LAYER 2: Scan all images inside main / article whose ancestor is a link ──
    const gridImgs = document.querySelectorAll('main img, article img, div[role="main"] img');
    gridImgs.forEach((img) => {
      const parentLink = img.closest('a');
      if (parentLink) {
        const href = parentLink.getAttribute('href') || parentLink.href || '';
        if (href && (href.includes('/p/') || href.includes('/reel/'))) {
          const cleanPath = href.split('?')[0];
          const fullUrl = cleanPath.startsWith('http') ? cleanPath : `https://www.instagram.com${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
          if (!accumulatedSessionPosts.has(fullUrl)) {
            accumulatedSessionPosts.set(fullUrl, {
              url: fullUrl,
              videoUrl: fullUrl,
              thumbnailUrl: img.currentSrc || img.src || '',
              duration: href.includes('/reel/') ? 15 : 0,
              authorName: profileInfo.name,
              authorHandle: profileInfo.handle,
              authorAvatar: profileInfo.avatar,
              originalCaption: img.getAttribute('alt') || '',
              platform: 'instagram',
              type: href.includes('/reel/') ? 'reel' : 'post',
              metrics: { likes: 0, comments: 0, views: 0 }
            });
          }
        }
      }
    });

    return Array.from(accumulatedSessionPosts.values());
  }

  // Real-time Listeners
  window.addEventListener('scroll', () => {
    scanAndAccumulateGridPosts();
  }, { passive: true });

  setTimeout(scanAndAccumulateGridPosts, 500);
  setInterval(scanAndAccumulateGridPosts, 2500);

  // Auto-Miner: Smooth Scroll & Collection
  function startAutoMiner(targetCount = 48) {
    if (isAutoMining) return;
    isAutoMining = true;

    showToast(`Iniciando auto-mineração (alvo: ${targetCount} posts)...`);

    let scrollAttempts = 0;
    const maxAttempts = 25;

    autoMineInterval = setInterval(() => {
      window.scrollBy({ top: 1100, behavior: 'smooth' });
      scanAndAccumulateGridPosts();
      scrollAttempts++;

      const currentTotal = accumulatedSessionPosts.size;

      if (currentTotal >= targetCount || scrollAttempts >= maxAttempts) {
        stopAutoMiner();
        showToast(`Auto-mineração concluída: ${currentTotal} posts coletados!`);
      }
    }, 650);
  }

  function stopAutoMiner() {
    isAutoMining = false;
    if (autoMineInterval) {
      clearInterval(autoMineInterval);
      autoMineInterval = null;
    }
  }

  // Map to track: container → button (so we can update position on scroll/resize)
  const injectedContainerMap = new WeakMap();
  const floatingButtons = []; // [{btn, getRect}]

  function repositionFloatingButtons() {
    floatingButtons.forEach(({ btn, getRect }) => {
      try {
        const rect = getRect();
        if (!rect || rect.width === 0) {
          btn.style.display = 'none';
          return;
        }
        btn.style.display = 'inline-flex';
        btn.style.top = `${rect.top + 12}px`;
        btn.style.left = `${rect.right - 140}px`;
      } catch {}
    });
  }

  window.addEventListener('scroll', repositionFloatingButtons, { passive: true });
  window.addEventListener('resize', repositionFloatingButtons, { passive: true });
  setInterval(repositionFloatingButtons, 300);

  function injectButtons() {
    try {
      // 1. Check if a modal dialog is open
      const openModal = document.querySelector('div[role="dialog"]');

      if (openModal) {
        // When modal is open: inject ONLY ONE button on the modal's main video
        if (!injectedContainerMap.has(openModal)) {
          const video = openModal.querySelector('video');
          // Only inject if there's a real video or a legit reel/post link inside the modal
          const hasReelLink = !!openModal.querySelector('a[href*="/reel/"], a[href*="/p/"]');
          if (video || hasReelLink) {
            const targetRef = video || openModal;
            const btn = createFloatingButton(() => {
              const data = extractModalPostData(openModal);
              if (data) sendToDarkClips(data, btn);
            });
            document.body.appendChild(btn);
            injectedContainerMap.set(openModal, btn);
            floatingButtons.push({ btn, getRect: () => targetRef.getBoundingClientRect() });
            repositionFloatingButtons();
          }
        }
        // Hide all non-modal buttons while the modal is open
        floatingButtons.forEach(({ btn, getRect }) => {
          try {
            const isForModal = btn.dataset.isModal === 'true';
            if (!isForModal && btn.parentElement) {
              btn.style.display = 'none';
            }
          } catch {}
        });
        return; // Don't inject on anything else while modal is open
      }

      // 2. No modal open: inject on feed/reel standalone videos
      // Only target videos that are large enough to be main content (not avatars/ads)
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((video) => {
        // Skip tiny videos (avatar-like, preview icons, etc.)
        const rect = video.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) return;

        const container =
          video.closest('article') ||
          video.closest('div[data-pressable-container="true"]') ||
          video.closest('section') ||
          video.parentElement;

        if (!container || injectedContainerMap.has(container)) return;

        const btn = createFloatingButton(() => {
          const data = extractModalPostData(container);
          if (data) sendToDarkClips(data, btn);
        });
        document.body.appendChild(btn);
        injectedContainerMap.set(container, btn);
        floatingButtons.push({ btn, getRect: () => video.getBoundingClientRect() });
        repositionFloatingButtons();
      });

      // 3. Standalone articles (images/carousels) — only those with a real reel or post link
      const standaloneArticles = document.querySelectorAll('article');
      standaloneArticles.forEach((article) => {
        if (injectedContainerMap.has(article)) return;
        if (article.querySelector('video')) return; // handled above

        // Only inject if article has a real post/reel link (not comment section)
        const hasPostLink = !!article.querySelector('a[href*="/p/"], a[href*="/reel/"]');
        if (!hasPostLink) return;

        const mediaEl = article.querySelector('img[style*="object-fit"], div[role="button"] img') || article;
        const imgRect = mediaEl?.getBoundingClientRect?.();
        if (!imgRect || imgRect.width < 100) return;

        const btn = createFloatingButton(() => {
          const data = extractModalPostData(article);
          if (data) sendToDarkClips(data, btn);
        });
        document.body.appendChild(btn);
        injectedContainerMap.set(article, btn);
        floatingButtons.push({ btn, getRect: () => mediaEl.getBoundingClientRect() });
        repositionFloatingButtons();
      });

      // Re-show any hidden feed buttons (modal was closed)
      floatingButtons.forEach(({ btn }) => {
        try {
          if (btn.style.display === 'none' && btn.dataset.isModal !== 'true') {
            btn.style.display = 'inline-flex';
          }
        } catch {}
      });
    } catch (err) {
      console.error('[DarkClips] Erro em injectButtons:', err);
    }
  }

  function createFloatingButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'dark-clips-inject-btn';
    btn.setAttribute('type', 'button');
    btn.style.cssText = `
      position: fixed !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    `;
    btn.innerHTML = `
      <svg class="dark-clips-icon" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      <span>Dark Clips</span>
    `;

    let isTriggering = false;
    const triggerAction = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if (isTriggering) return;
      isTriggering = true;
      setTimeout(() => { isTriggering = false; }, 1500);

      console.log('[DarkClips] Botão clicado pelo usuário! Disparando envio...');
      showToast('Enviando clipe ao DarkTube...');
      try {
        onClick();
      } catch (err) {
        console.error('[DarkClips] Erro na ação do botão:', err);
        showToast('Erro ao capturar dados do vídeo', true);
      }
    };

    btn.onclick = triggerAction;
    btn.onpointerdown = (e) => { e.stopPropagation(); };
    btn.onmousedown = (e) => { e.stopPropagation(); };
    btn.addEventListener('click', triggerAction, true);
    btn.addEventListener('pointerup', triggerAction, true);

    return btn;
  }

  setInterval(injectButtons, 1500);

  // Message listener for Extension Popup
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

  console.log(`[${SCRIPT_NAME}] Ativo no Instagram (Multi-Layer Scanner & Auto-Miner Ready)!`);
})();
