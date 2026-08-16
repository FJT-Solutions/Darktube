// Dark Clips Popup Logic
document.addEventListener('DOMContentLoaded', async () => {
  const videoCountEl = document.getElementById('video-count');
  const captureAllBtn = document.getElementById('capture-all-btn');
  const videosListEl = document.getElementById('videos-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const statusText = document.getElementById('status-text');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const apiUrlInput = document.getElementById('api-url');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const openStudioLink = document.getElementById('open-studio-link');

  let detectedVideos = [];

  // Load saved settings
  chrome.storage.local.get(['darktube_api_url'], (res) => {
    const url = res.darktube_api_url || 'http://localhost:3000';
    apiUrlInput.value = url;
    if (openStudioLink) openStudioLink.href = `${url.replace(/\/$/, '')}/dark-clips`;
  });

  // Settings toggle
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // Save settings
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

  // Scan current active tab
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
          statusText.textContent = 'Abra Instagram, TikTok, Shorts ou X';
          return;
        }

        detectedVideos = response.videos || [];
        renderList();
        statusText.textContent = `${detectedVideos.length} vídeo(s) pronto(s)`;
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
          <span>Abra o Instagram Reels, TikTok, Shorts ou X para minerar clipes.</span>
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

  async function sendItems(items, btnElement) {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.textContent = '⏳ Enviando...';
    }

    try {
      const baseUrl = await getApiUrl();
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/dark-clips/import`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: items[0]?.platform || 'other',
          items
        })
      });

      const data = await res.json();

      if (data.success) {
        if (btnElement) {
          btnElement.textContent = '✅ Enviado!';
          btnElement.style.color = '#10b981';
          btnElement.style.borderColor = '#10b981';
        }
        statusText.textContent = `✅ ${items.length} vídeo(s) enviado(s) ao Dark Clips!`;
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

  // Initial scan
  scanCurrentTab();
});
