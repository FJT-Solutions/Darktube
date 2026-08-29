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

  // Direct in-DOM button creation
  function createDirectButton(onClick, customStyles = '') {
    const btn = document.createElement('button');
    btn.className = 'dark-clips-inject-btn';
    btn.setAttribute('type', 'button');
    if (customStyles) {
      btn.style.cssText = customStyles;
    }
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

    const blockerEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];
    blockerEvents.forEach((evt) => {
      btn.addEventListener(evt, (e) => {
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (evt === 'click') {
          e.preventDefault();
          triggerAction(e);
        }
      }, true);
    });

    return btn;
  }

  function injectButtons() {
    try {
      // ── 1. Modal Reel / Post Dialog ──
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        // Look for the user header in the modal (e.g. username • Seguir)
        const modalHeader = dialog.querySelector('header');
        if (modalHeader && !modalHeader.querySelector('.dark-clips-inject-btn')) {
          const btn = createDirectButton(() => {
            const data = extractModalPostData(dialog);
            if (data) sendToDarkClips(data, btn);
          }, 'margin-left: auto !important; margin-right: 8px !important; padding: 6px 12px !important; font-size: 12px !important; flex-shrink: 0 !important;');

          // Insert next to user profile header (before the 3-dots button or at the end of header)
          const menuBtn = modalHeader.querySelector('div[role="button"]:last-child, button:last-child');
          if (menuBtn && menuBtn.parentElement === modalHeader) {
            modalHeader.insertBefore(btn, menuBtn);
          } else {
            modalHeader.appendChild(btn);
          }
        } else if (!modalHeader && !dialog.querySelector('.dark-clips-inject-btn')) {
          // Fallback if header not found (e.g. standalone video modal)
          const mediaContainer = dialog.querySelector('article') ||
                                 dialog.querySelector('video')?.closest('div[style*="flex"]') ||
                                 dialog.querySelector('video')?.parentElement ||
                                 dialog;

          const pos = window.getComputedStyle(mediaContainer).position;
          if (pos === 'static') {
            mediaContainer.style.position = 'relative';
          }

          const btn = createDirectButton(() => {
            const data = extractModalPostData(dialog);
            if (data) sendToDarkClips(data, btn);
          }, 'position: absolute !important; top: 16px !important; right: 16px !important; z-index: 50 !important;');

          mediaContainer.appendChild(btn);
        }
        return; // When modal is open, don't waste cycles on background elements
      }

      // ── 2. Grid Thumbnails (Explore / Profile) ──
      const gridLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"], a[href*="/tv/"]');
      gridLinks.forEach((anchor) => {
        if (anchor.closest('article') || anchor.closest('div[role="dialog"]')) return;

        const href = anchor.getAttribute('href') || '';
        if (href.includes('/audio/') || href.includes('/tagged/') || href.includes('/liked_by/')) return;

        const match = href.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/);
        if (!match) return;

        // Skip tiny navigation / avatar links (must be a post tile)
        const rect = anchor.getBoundingClientRect();
        if (rect.width > 0 && (rect.width < 80 || rect.height < 80)) return;

        if (anchor.querySelector('.dark-clips-inject-btn')) return;

        const pos = window.getComputedStyle(anchor).position;
        if (pos === 'static') {
          anchor.style.position = 'relative';
        }

        const btn = createDirectButton(() => {
          const fullUrl = `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/`;
          const img = anchor.querySelector('img');
          const video = anchor.querySelector('video');
          const thumbUrl = img?.currentSrc || img?.src || video?.getAttribute('poster') || '';
          const profileInfo = getPageProfileInfo();
          sendToDarkClips({
            url: fullUrl,
            videoUrl: fullUrl,
            thumbnailUrl: thumbUrl,
            duration: 15,
            authorName: profileInfo.name,
            authorHandle: profileInfo.handle,
            authorAvatar: profileInfo.avatar,
            originalCaption: img?.getAttribute('alt') || '',
            platform: 'instagram',
            type: match[1].includes('reel') ? 'reel' : 'post',
            metrics: { likes: 0, comments: 0, views: 0 }
          }, btn);
        }, 'position: absolute !important; top: 8px !important; right: 8px !important; z-index: 20 !important;');

        anchor.appendChild(btn);
      });

      // ── 3. Home Feed Posts ──
      const feedArticles = document.querySelectorAll('article:not(div[role="dialog"] article)');
      feedArticles.forEach((article) => {
        if (article.querySelector('.dark-clips-inject-btn')) return;

        const mediaArea = article.querySelector('video')?.parentElement ||
                          article.querySelector('div[style*="padding-bottom"]') ||
                          article.querySelector('img[style*="object-fit"]')?.parentElement ||
                          article;

        const pos = window.getComputedStyle(mediaArea).position;
        if (pos === 'static') {
          mediaArea.style.position = 'relative';
        }

        const btn = createDirectButton(() => {
          const data = extractModalPostData(article);
          if (data) sendToDarkClips(data, btn);
        }, 'position: absolute !important; top: 12px !important; right: 12px !important; z-index: 20 !important;');

        mediaArea.appendChild(btn);
      });

      // ── 4. Standalone Reels View ──
      if (window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/')) {
        const reelVideos = document.querySelectorAll('video');
        reelVideos.forEach((vid) => {
          const wrapper = vid.closest('div[data-pressable-container="true"]') ||
                          vid.closest('section') ||
                          vid.parentElement;
          if (!wrapper || wrapper.querySelector('.dark-clips-inject-btn')) return;

          const pos = window.getComputedStyle(wrapper).position;
          if (pos === 'static') {
            wrapper.style.position = 'relative';
          }

          const btn = createDirectButton(() => {
            const data = extractModalPostData(wrapper);
            if (data) sendToDarkClips(data, btn);
          }, 'position: absolute !important; top: 20px !important; right: 20px !important; z-index: 50 !important;');

          wrapper.appendChild(btn);
        });
      }
    } catch (err) {
      console.error('[DarkClips] Erro em injectButtons:', err);
    }
  }

  setInterval(injectButtons, 1200);

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
