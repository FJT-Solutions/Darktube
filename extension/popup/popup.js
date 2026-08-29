// Dark Clips Popup Logic (Grid Extraction, Smart Filters & Auto-Injected Healing)
document.addEventListener('DOMContentLoaded', async () => {
  const videoCountEl = document.getElementById('video-count');
  const actionCountLabel = document.getElementById('action-count-label');
  const captureAllBtn = document.getElementById('capture-all-btn');
  const captureBtnText = document.getElementById('capture-btn-text');
  const videosListEl = document.getElementById('videos-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const statusText = document.getElementById('status-text');
  const filterPills = document.querySelectorAll('.filter-pill');

  // Auth UI elements
  const userLoggedInView = document.getElementById('user-logged-in-view');
  const userLoggedOutView = document.getElementById('user-logged-out-view');
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayEmail = document.getElementById('user-display-email');
  const userAvatarInitial = document.getElementById('user-avatar-initial');
  const logoutBtn = document.getElementById('logout-btn');
  const loginForm = document.getElementById('login-form');
  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const loginErrorMsg = document.getElementById('login-error-msg');

  let rawDetectedVideos = [];
  let displayedVideos = [];
  let currentFilter = 'all'; // 'all' | 'likes' | 'comments' | 'views' | 'top3'
  let currentUser = null;
  let currentToken = null;

  const DARKTUBE_BASE_URL = 'https://darktube.fjt-solutions.com';

  // 1. Load initial auth state
  chrome.storage.local.get(['darktube_user', 'darktube_token', 'darktube_api_url'], (res) => {
    if (!res.darktube_api_url || res.darktube_api_url.includes('fjt.solutions')) {
      chrome.storage.local.set({ darktube_api_url: DARKTUBE_BASE_URL });
    }
    if (res.darktube_user && res.darktube_token) {
      currentUser = res.darktube_user;
      currentToken = res.darktube_token;
      renderAuthState(true);
    } else {
      renderAuthState(false);
    }
  });

  // 2. Auth State Renderer
  function renderAuthState(isLoggedIn) {
    if (isLoggedIn && currentUser) {
      userLoggedInView.classList.remove('hidden');
      userLoggedOutView.classList.add('hidden');
      userDisplayName.textContent = currentUser.name || 'Minha Conta';
      userDisplayEmail.textContent = currentUser.email || '';
      userAvatarInitial.textContent = (currentUser.name || currentUser.email || 'D').charAt(0).toUpperCase();
      statusText.textContent = `Logado: ${currentUser.name || currentUser.email}`;
    } else {
      userLoggedInView.classList.add('hidden');
      userLoggedOutView.classList.remove('hidden');
      loginErrorMsg.classList.add('hidden');
    }
  }

  // 3. Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    if (!email || !password) return;

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Conectando...';
    loginErrorMsg.classList.add('hidden');

    try {
      const endpoint = `${DARKTUBE_BASE_URL}/api/auth/extension-login`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success && data.token && data.user) {
        currentUser = data.user;
        currentToken = data.token;

        chrome.storage.local.set({
          darktube_user: data.user,
          darktube_token: data.token,
          darktube_api_url: DARKTUBE_BASE_URL
        }, () => {
          loginPasswordInput.value = '';
          renderAuthState(true);
        });
      } else {
        throw new Error(data.error || 'Credenciais inválidas.');
      }
    } catch (err) {
      console.error(err);
      loginErrorMsg.textContent = err.message || 'Falha ao conectar no DarkTube.';
      loginErrorMsg.classList.remove('hidden');
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = 'Entrar na Conta';
    }
  });

  // 4. Handle Logout
  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['darktube_user', 'darktube_token'], () => {
      currentUser = null;
      currentToken = null;
      renderAuthState(false);
      statusText.textContent = 'Pronto para minerar';
    });
  });

  // Helper for Self-Healing Tab Communication (Dynamic Script Injection Fallback)
  async function sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, async (res) => {
        if (chrome.runtime.lastError || !res) {
          try {
            const tab = await chrome.tabs.get(tabId);
            if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('vivaldi://')) {
              return resolve(null);
            }

            let scriptFile = 'content/instagram.js';
            if (tab.url.includes('tiktok.com')) scriptFile = 'content/tiktok.js';
            else if (tab.url.includes('youtube.com')) scriptFile = 'content/youtube.js';
            else if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) scriptFile = 'content/twitter.js';

            await chrome.scripting.executeScript({
              target: { tabId },
              files: [scriptFile]
            });
            await chrome.scripting.insertCSS({
              target: { tabId },
              files: ['content/content.css']
            }).catch(() => {});

            // Retry communication after dynamic script injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, message, (secondRes) => {
                if (chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve(secondRes);
                }
              });
            }, 300);
          } catch {
            resolve(null);
          }
        } else {
          resolve(res);
        }
      });
    });
  }

  // 5. Scan current active tab
  async function scanCurrentTab() {
    statusText.textContent = 'Escaneando página & perfil...';
    videosListEl.innerHTML = '<div class="empty-state"><span>Procurando posts e reels na página...</span></div>';

    // Animate refresh button
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      refreshBtn.setAttribute('disabled', 'disabled');
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        statusText.textContent = 'Nenhuma aba ativa';
        return;
      }

      const response = await sendMessageToTab(tab.id, { action: 'GET_PAGE_VIDEOS' });

      if (!response || !response.videos) {
        rawDetectedVideos = [];
        applyFilterAndRender();
        statusText.textContent = currentUser ? `Logado: ${currentUser.name}` : 'Pronto para minerar';
        return;
      }

      rawDetectedVideos = response.videos || [];
      applyFilterAndRender();

      const profileName = response.profile?.handle || response.profile?.name;
      statusText.textContent = profileName && profileName !== '@instagram'
        ? `${rawDetectedVideos.length} post(s) em ${profileName}`
        : `${rawDetectedVideos.length} post(s) detectado(s)`;
    } catch (err) {
      console.error(err);
      statusText.textContent = 'Erro ao escanear';
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        refreshBtn.removeAttribute('disabled');
      }
    }
  }

  // 6. Filter & Sorting Logic
  function applyFilterAndRender() {
    let list = [...rawDetectedVideos];

    if (currentFilter === 'likes') {
      list.sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0));
    } else if (currentFilter === 'comments') {
      list.sort((a, b) => (b.metrics?.comments || 0) - (a.metrics?.comments || 0));
    } else if (currentFilter === 'views') {
      list.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
    } else if (currentFilter === 'top3') {
      list.sort((a, b) => {
        const scoreA = (a.metrics?.likes || 0) + ((a.metrics?.comments || 0) * 3) + (a.metrics?.views || 0);
        const scoreB = (b.metrics?.likes || 0) + ((b.metrics?.comments || 0) * 3) + (b.metrics?.views || 0);
        return scoreB - scoreA;
      });
      list = list.slice(0, 3);
    }

    displayedVideos = list;
    renderList();
  }

  function formatCount(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function renderList() {
    videoCountEl.textContent = displayedVideos.length;
    actionCountLabel.textContent = currentFilter === 'top3'
      ? 'top 3 posts virais selecionados'
      : `${rawDetectedVideos.length} post(s) detectado(s)`;

    captureAllBtn.disabled = displayedVideos.length === 0;
    captureBtnText.textContent = currentFilter === 'top3'
      ? 'Capturar Top 3 Virais ao DarkTube'
      : `Capturar ${displayedVideos.length} Posts ao DarkTube`;

    if (displayedVideos.length === 0) {
      videosListEl.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">Nenhum post detectado</p>
          <span class="empty-desc">Abra qualquer perfil, feed ou reel no Instagram, TikTok, Shorts ou X.</span>
        </div>
      `;
      return;
    }

    videosListEl.innerHTML = '';
    displayedVideos.forEach((post, idx) => {
      const item = document.createElement('div');
      item.className = 'video-item';

      const typeLabel = post.type === 'reel' ? '🎬 Reel' : post.type === 'carousel' ? '📸 Carrossel' : '🖼️ Post';
      const typeClass = post.type === 'reel' ? 'type-reel' : post.type === 'carousel' ? 'type-carousel' : 'type-post';

      const likesCount = formatCount(post.metrics?.likes);
      const commentsCount = formatCount(post.metrics?.comments);

      item.innerHTML = `
        <div class="video-item-left">
          ${post.thumbnailUrl ? `<img src="${post.thumbnailUrl}" class="video-thumb" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="video-thumb fallback-thumb" style="display:none; align-items:center; justify-content:center; background:#181820; font-size:16px;">🎬</div>` : '<div class="video-thumb fallback-thumb" style="display:flex; align-items:center; justify-content:center; background:#181820; font-size:16px;">🎬</div>'}
          <div class="video-meta">
            <div class="video-top-row">
              <span class="video-author">${post.authorHandle || post.authorName || 'Criador'}</span>
              <span class="type-pill ${typeClass}">${typeLabel}</span>
            </div>
            <span class="video-caption" title="${post.originalCaption || ''}">${post.originalCaption || post.url}</span>
            <div class="metrics-row">
              <span class="metric-item metric-likes">❤️ ${likesCount}</span>
              <span class="metric-item metric-comments">💬 ${commentsCount}</span>
            </div>
          </div>
        </div>
        <button class="btn-send-single" data-idx="${idx}">
          ⚡ Enviar
        </button>
      `;

      const sendBtn = item.querySelector('.btn-send-single');
      sendBtn.addEventListener('click', () => sendItems([post], sendBtn));

      videosListEl.appendChild(item);
    });
  }

  // 7. Send Items with User Token
  async function sendItems(items, btnElement) {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.textContent = '⏳ Enviando...';
    }

    try {
      const endpoint = `${DARKTUBE_BASE_URL}/api/dark-clips/import`;

      const headers = { 'Content-Type': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: items[0]?.platform || 'instagram',
          items,
          userId: currentUser?.id || null
        })
      });

      const data = await res.json();

      if (data.success) {
        if (btnElement) {
          btnElement.textContent = '✅ Enviado!';
          btnElement.style.color = '#10b981';
          btnElement.style.borderColor = '#10b981';
        }
        statusText.textContent = `✅ ${items.length} post(s) enviado(s) ao DarkTube!`;
      } else {
        throw new Error(data.error || 'Falha ao importar');
      }
    } catch (err) {
      console.error(err);
      if (btnElement) {
        btnElement.textContent = '❌ Erro';
        btnElement.disabled = false;
      }
      statusText.textContent = '❌ Erro de conexão com DarkTube';
    }
  }

  captureAllBtn.addEventListener('click', () => {
    if (displayedVideos.length > 0) {
      sendItems(displayedVideos, captureAllBtn);
    }
  });

  // Filter clicks
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      applyFilterAndRender();
    });
  });

  // Auto-Miner Action (Infinite Scroll & Session Accumulator)
  const autoMineBtn = document.getElementById('auto-mine-btn');
  let isMiningState = false;

  autoMineBtn?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (isMiningState) {
      await sendMessageToTab(tab.id, { action: 'STOP_AUTO_MINE' });
      isMiningState = false;
      autoMineBtn.classList.remove('mining');
      autoMineBtn.innerHTML = '<span>🚀 Rastrear Mais</span>';
      return;
    }

    isMiningState = true;
    autoMineBtn.classList.add('mining');
    autoMineBtn.innerHTML = '<span>⏳ Rastreando...</span>';
    statusText.textContent = 'Auto-minerando perfil no Instagram...';

    try {
      await sendMessageToTab(tab.id, { action: 'START_AUTO_MINE', targetCount: 48 });

      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        const response = await sendMessageToTab(tab.id, { action: 'GET_PAGE_VIDEOS' });

        if (response && response.videos) {
          rawDetectedVideos = response.videos;
          applyFilterAndRender();
          statusText.textContent = `🚀 Minerados: ${rawDetectedVideos.length} posts`;
        }

        if (pollCount >= 15 || !isMiningState) {
          clearInterval(pollInterval);
          isMiningState = false;
          autoMineBtn.classList.remove('mining');
          autoMineBtn.innerHTML = '<span>🚀 Rastrear Mais</span>';
        }
      }, 800);
    } catch (e) {
      console.error(e);
      isMiningState = false;
      autoMineBtn.classList.remove('mining');
      autoMineBtn.innerHTML = '<span>🚀 Rastrear Mais</span>';
    }
  });

  refreshBtn.addEventListener('click', () => {
    scanCurrentTab();
  });

  // Initial tab scan
  scanCurrentTab();
});
