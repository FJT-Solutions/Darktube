// Dark Clips Popup Logic with User Authentication
document.addEventListener('DOMContentLoaded', async () => {
  const videoCountEl = document.getElementById('video-count');
  const captureAllBtn = document.getElementById('capture-all-btn');
  const videosListEl = document.getElementById('videos-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const statusText = document.getElementById('status-text');
  const statusDot = document.getElementById('status-dot');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const apiUrlInput = document.getElementById('api-url');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const openStudioLink = document.getElementById('open-studio-link');

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

  let detectedVideos = [];
  let currentUser = null;
  let currentToken = null;

  // 1. Load initial settings and auth state
  chrome.storage.local.get(['darktube_api_url', 'darktube_user', 'darktube_token'], (res) => {
    const url = res.darktube_api_url || 'http://localhost:3000';
    apiUrlInput.value = url;
    if (openStudioLink) openStudioLink.href = `${url.replace(/\/$/, '')}/dark-clips`;

    if (res.darktube_user && res.darktube_token) {
      currentUser = res.darktube_user;
      currentToken = res.darktube_token;
      renderAuthState(true);
    } else {
      renderAuthState(false);
    }
  });

  // Settings toggle
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Save server settings
  saveSettingsBtn.addEventListener('click', () => {
    const val = apiUrlInput.value.trim() || 'http://localhost:3000';
    chrome.storage.local.set({ darktube_api_url: val }, () => {
      saveSettingsBtn.textContent = 'Salvo!';
      setTimeout(() => (saveSettingsBtn.textContent = 'Salvar'), 1500);
      if (openStudioLink) openStudioLink.href = `${val.replace(/\/$/, '')}/dark-clips`;
    });
  });

  async function getApiUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['darktube_api_url'], (res) => {
        resolve(res.darktube_api_url || 'http://localhost:3000');
      });
    });
  }

  // 2. Auth State Renderer
  function renderAuthState(isLoggedIn) {
    if (isLoggedIn && currentUser) {
      userLoggedInView.classList.remove('hidden');
      userLoggedOutView.classList.add('hidden');
      userDisplayName.textContent = currentUser.name || 'Minha Conta';
      userDisplayEmail.textContent = currentUser.email || '';
      userAvatarInitial.textContent = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
      statusText.textContent = `Logado como ${currentUser.name || currentUser.email}`;
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
      const baseUrl = await getApiUrl();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/auth/extension-login`;

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
          darktube_token: data.token
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
      statusText.textContent = 'Desconectado';
    });
  });

  // 5. Scan current active tab
  async function scanCurrentTab() {
    statusText.textContent = 'Escaneando página...';
    videosListEl.innerHTML = '<div class="empty-state"><span>Procurando vídeos na aba atual...</span></div>';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        statusText.textContent = 'Nenhuma aba ativa';
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_VIDEOS' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.videos) {
          detectedVideos = [];
          renderList();
          statusText.textContent = currentUser ? `Logado: ${currentUser.name}` : 'Pronto para minerar';
          return;
        }

        detectedVideos = response.videos || [];
        renderList();
        statusText.textContent = `${detectedVideos.length} vídeo(s) detectado(s)`;
      });
    } catch (err) {
      console.error(err);
      statusText.textContent = 'Erro ao escanear';
    }
  }

  function renderList() {
    videoCountEl.textContent = detectedVideos.length;
    captureAllBtn.disabled = detectedVideos.length === 0;

    if (detectedVideos.length === 0) {
      videosListEl.innerHTML = `
        <div class="empty-state">
          <p>Nenhum vídeo detectado nesta aba.</p>
          <span>Abra Instagram Reels, TikTok, Shorts ou X para minerar clipes.</span>
        </div>
      `;
      return;
    }

    videosListEl.innerHTML = '';
    detectedVideos.forEach((video, idx) => {
      const item = document.createElement('div');
      item.className = 'video-item';
      item.innerHTML = `
        <div class="video-meta">
          <span class="video-author">${video.authorHandle || video.authorName || 'Criador Viral'}</span>
          <span class="video-caption">${video.originalCaption || video.url || 'Vídeo sem legenda'}</span>
        </div>
        <button class="btn-send-single" data-idx="${idx}">
          ⚡ Enviar
        </button>
      `;

      const sendBtn = item.querySelector('.btn-send-single');
      sendBtn.addEventListener('click', () => sendItems([video], sendBtn));

      videosListEl.appendChild(item);
    });
  }

  // 6. Send Items with User Token
  async function sendItems(items, btnElement) {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.textContent = '⏳ Enviando...';
    }

    try {
      const baseUrl = await getApiUrl();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/dark-clips/import`;

      const headers = { 'Content-Type': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: items[0]?.platform || 'other',
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
        statusText.textContent = `✅ Enviado para a conta de ${currentUser ? currentUser.name : 'DarkTube'}!`;
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
    if (detectedVideos.length > 0) {
      sendItems(detectedVideos, captureAllBtn);
    }
  });

  refreshBtn.addEventListener('click', scanCurrentTab);

  // Initial tab scan
  scanCurrentTab();
});
