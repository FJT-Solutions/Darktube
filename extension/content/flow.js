// Dark Clips Companion: automacao da pagina do Google Flow.
// Faz o que uma pessoa faria: abre as configuracoes, escolhe, digita o prompt, clica em gerar,
// espera o resultado e devolve a midia. Para na hora se aparecer verificacao ou limite.
// Nenhuma rede daqui: quem fala com o darktube e o background (flow-agent.js).
(() => {
  if (window.__dtFlowLoaded) return;
  window.__dtFlowLoaded = true;

  const S = window.DT_FLOW_SEL;
  const RX = window.DT_FLOW_RX;
  // Com a aba em segundo plano o Chrome atrasa os timers para 1 vez por minuto. Durante um job o segundo plano
  // da extensao manda "FLOW_WAKE" a cada 2 s; cada espera termina no que vier primeiro: o timer ou um despertar
  // depois do tempo pedido. Assim a aba escondida roda quase na velocidade normal, sem precisar ficar visivel.
  const wakeWaiters = new Set();
  const sleep = (ms) =>
    new Promise((r) => {
      const t0 = Date.now();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        wakeWaiters.delete(check);
        r();
      };
      const check = () => {
        if (Date.now() - t0 >= ms) finish();
      };
      const timer = setTimeout(finish, ms);
      wakeWaiters.add(check);
    });
  const wakeAll = () => Array.from(wakeWaiters).forEach((f) => f());

  // Keep-alive por áudio silencioso: o Chromium nunca suspende abas que estejam reproduzindo áudio.
  // Timers, WebSockets e renderização continuam ativos mesmo em segundo plano ou na janela fantasma.
  let silentAudioCtx = null;
  function startSilentAudioKeepAlive() {
    try {
      if (!silentAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          silentAudioCtx = new AudioCtx();
          const osc = silentAudioCtx.createOscillator();
          const gain = silentAudioCtx.createGain();
          gain.gain.value = 0.00001;
          osc.connect(gain);
          gain.connect(silentAudioCtx.destination);
          osc.start();
        }
      }
      if (silentAudioCtx && silentAudioCtx.state === 'suspended') {
        silentAudioCtx.resume().catch(() => {});
      }
      if (!document.getElementById('__dt_silent_audio')) {
        const audio = document.createElement('audio');
        audio.id = '__dt_silent_audio';
        audio.loop = true;
        audio.volume = 0.01;
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        audio.style.display = 'none';
        (document.body || document.documentElement).appendChild(audio);
        audio.play().catch(() => {});
      }
    } catch (_) {}
  }
  startSilentAudioKeepAlive();
  window.addEventListener('click', () => startSilentAudioKeepAlive(), { capture: true, passive: true });
  const rand = (a, b) => a + Math.random() * (b - a);
  const human = (a = 350, b = 1100) => sleep(rand(a, b));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const err = (code, msg) => Object.assign(new Error(msg || code), { code });
  const MAX_BYTES = 60 * 1024 * 1024;

  // Log para o painel do darktube (o background guarda e envia em lote).
  let curJob = null;
  const shortUrl = (u) => String(u || '').slice(0, 200);
  function dtLog(message, data = null, level = 'info') {
    try {
      let safe = null;
      if (data != null) {
        try {
          safe = JSON.parse(JSON.stringify(data));
        } catch (_) {
          safe = { unserializable: String(data).slice(0, 200) };
        }
      }
      chrome.runtime.sendMessage(
        {
          type: 'FLOW_LOG',
          log: { message, data: safe, level, timestamp: Date.now(), jobId: curJob && curJob.id, projectId: curJob && curJob.project_id },
        },
        () => void chrome.runtime.lastError
      );
    } catch (_) {
      /* extensao recarregada: sem para quem logar */
    }
  }

  async function until(fn, timeout = 15000, step = 250) {
    const t0 = Date.now();
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() - t0 > timeout) return null;
      await sleep(step);
    }
  }

  function pressEscape() {
    const opts = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
    window.dispatchEvent(new KeyboardEvent('keydown', opts));
    document.dispatchEvent(new KeyboardEvent('keydown', opts));
    if (document.activeElement) {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', opts));
      document.activeElement.dispatchEvent(new KeyboardEvent('keyup', opts));
    }
    window.dispatchEvent(new KeyboardEvent('keyup', opts));
    document.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  const ACCOUNT_SEL = '[aria-label*="Google Account" i], [aria-label*="Conta Google" i]';
  const ACCOUNT_SIGNATURE = /google flow credits|sign out of all accounts|sair de todas as contas|manage subscription|switch account/i;

  // Gaveta/menu da conta aberta. O botao que abre a gaveta tambem tem esse aria-label, entao so conta
  // o que NAO e botao/link, ou um painel visivel com o texto tipico da conta.
  function accountDrawers() {
    const byLabel = $$(ACCOUNT_SEL).filter((el) => vis(el) && !/^(button|a)$/i.test(el.tagName) && el.getAttribute('role') !== 'button');
    const bySig = $$('[role=dialog], [role=menu], .cdk-overlay-pane, [class*="drawer" i], [class*="account" i]').filter(
      (el) => vis(el) && ACCOUNT_SIGNATURE.test(txt(el)) && txt(el).length < 1500
    );
    return Array.from(new Set([...byLabel, ...bySig]));
  }

  async function closeAccountDrawer(force = false) {
    const drawers = accountDrawers();
    if (!drawers.length && !force) return;
    if (drawers.length) dtLog('Gaveta da conta Google aberta: fechando.', { drawers: drawers.length });
    for (const d of drawers) {
      const closeBtn = $('button[aria-label*="Close" i], button[aria-label*="Fechar" i], .close-button', d);
      if (closeBtn) {
        closeBtn.click();
        await sleep(200);
      }
    }
    for (let i = 0; i < 3; i++) {
      pressEscape();
      await sleep(200);
    }
    if (accountDrawers().length || force) {
      const canvas = $('main, flow-canvas, .canvas, [role=main], div.ProseMirror');
      if (canvas) canvas.click();
      await sleep(300);
    }
    if (accountDrawers().length) dtLog('A gaveta da conta continua aberta apos fechar.', null, 'warn');
  }

  async function closeLayers() {
    for (let i = 0; i < 5 && ($(S.overlay) || vis($(S.settingsPanel))); i++) {
      if (i === 0) dtLog('Fechando camadas/overlays da pagina.', { backdrop: !!$(S.overlay), settings: !!vis($(S.settingsPanel)) });
      pressEscape();
      if ($(S.overlay)) {
        const main = $('main, [role=main], flow-canvas, .canvas');
        if (i > 0 && main) main.click();
      }
      await sleep(300);
    }
    if ($(S.overlay)) dtLog('Backdrop ainda presente apos fechar as camadas.', null, 'warn');
    await closeAccountDrawer();
  }

  // ---------- problemas que exigem parar ----------

  function alertText() {
    return $$(S.alerts)
      .filter((el) => {
        if (!vis(el)) return false;
        // Ignora a gaveta da conta Google (que contem informacoes normais de conta e rodape recaptcha)
        const t = txt(el);
        if (/google flow credits|sign out of all accounts|manage subscription|switch account/i.test(t)) return false;
        return true;
      })
      .map(txt)
      .join(' | ')
      .slice(0, 600);
  }

  function classifyProblem() {
    const t = alertText();
    if (!t) return null;
    if (RX.verification.test(t)) return { code: 'verification', msg: t };
    if (RX.rateLimit.test(t)) return { code: 'rate_limit', msg: t };
    return null;
  }

  // ---------- configuracoes ----------

  const panelEl = () => {
    const p = $(S.settingsPanel);
    return vis(p) ? p : null;
  };

  const settingsBtnEl = () => {
    const ed = $(S.editor);
    const box = ed ? ed.closest('flow-prompt-box, flow-base-prompt-box, form, [class*="prompt"]') || ed.parentElement : null;
    if (box) {
      const b = $('button.settings-trigger-button, .settings-trigger-button', box)
        || $$('button', box).find((btn) => /nano banana|veo|omni|\bvideo\b|\bx\d\b|\b\d+s\b/i.test(txt(btn)));
      if (b) return b;
    }
    return $('button.settings-trigger-button, .settings-trigger-button')
      || $$('button').find((btn) => !btn.closest('header, nav, flow-top-bar') && /nano banana|veo|omni|\bvideo\b|\bx\d\b/i.test(txt(btn)));
  };

  // Botao de gerar ("->") visivel dentro da caixa de prompt ativa.
  // No modo imagem o seletor global $(S.generate) pode devolver um botao oculto/inativo fora da caixa atual.
  const generateBtnEl = () => {
    const ed = $(S.editor);
    const box = $('flow-base-prompt-box') || (ed ? ed.closest('flow-prompt-box, flow-base-prompt-box, form, [class*="prompt"]') || ed.parentElement : null);
    const scopes = box ? [box, document] : [document];
    for (const root of scopes) {
      const direct = $$(S.generate, root).find(vis)
        || $$('flow-generate-icon-button button, button.generate-icon-button, button[type=submit]', root).find(vis);
      if (direct) return direct;
    }
    if (box) {
      const sb = settingsBtnEl();
      const byIconOrLabel = $$('button, [role=button]', box).filter(vis).find((b) => {
        if (b === sb) return false;
        const icons = $$('mat-icon, i, [class*="icon"]', b).map(txt).join(' ');
        const label = (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + txt(b) + ' ' + icons;
        return /\b(arrow_forward|arrow_upward|east|send|subdirectory_arrow_left|north_east|generate|create|submit|gerar|criar|enviar)\b/i.test(label);
      });
      if (byIconOrLabel) return byIconOrLabel;
      if (sb && vis(sb)) {
        const sr = sb.getBoundingClientRect();
        const rightBtns = $$('button, [role=button]', box)
          .filter((b) => b !== sb && vis(b) && b.getBoundingClientRect().left >= sr.right - 12)
          .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
        if (rightBtns[0]) return rightBtns[0];
      }
    }
    return $$(S.generate).find(vis) || $(S.generate);
  };

  async function openSettings() {
    await closeLayers();
    for (let i = 0; i < 4 && !panelEl(); i++) {
      const b = settingsBtnEl() || $(S.settingsBtn);
      if (!b) throw err('settings_btn_missing', 'Não achei o botão de configurações do Flow.');
      b.click(); // as vezes o primeiro clique e ignorado
      await until(panelEl, 2500);
    }
    const p = panelEl();
    if (!p) throw err('settings_panel_missing', 'Não consegui abrir as configurações do Flow.');
    return p;
  }

  async function closeSettings() {
    for (let i = 0; i < 4 && panelEl(); i++) {
      pressEscape();
      await sleep(400);
    }
    if (panelEl()) throw err('settings_close_failed', 'Não consegui fechar as configurações do Flow.');
  }

  const radios = (panel) => $$(S.radio, panel);
  // Remove o nome do icone (ex.: "crop_16_9 16:9" -> "16:9") que vem colado ao rotulo.
  const rlabel = (r) => (r.getAttribute('aria-label') || txt(r)).trim().replace(/^[a-z]+(?:_[a-z0-9]+)+\s+/, '');
  const hasIcon = (r, name) => $$('mat-icon', r).some((i) => txt(i) === name);
  const isOn = (r) => r.getAttribute('aria-checked') === 'true' || r.classList.contains('mat-mdc-radio-checked');

  async function pickRadio(panel, re, what) {
    const r = radios(panel).find((x) => re.test(rlabel(x)));
    if (!r) throw err('option_missing', `A opção "${what}" não está disponível nesta conta ou modelo.`);
    if (!isOn(r)) {
      r.click();
      await human(250, 650);
    }
  }

  async function setMode(panel, kind) {
    const rx = kind === 'video' ? /^\s*(videocam\s+)?video\b/i : /^\s*(image\s+)?image\b/i;
    // 1. O radio do modo tem o icone (videocam / image) e o rotulo; procura primeiro pelo icone, depois pelo texto.
    const candidates = $$('button, [role=tab], [role=radio], mat-button-toggle, .mat-mdc-button-toggle', panel);
    const r = radios(panel).find((x) => hasIcon(x, kind === 'video' ? 'videocam' : 'image') && rx.test(txt(x)))
      || radios(panel).find((x) => hasIcon(x, kind === 'video' ? 'videocam' : 'image'))
      || candidates.find((el) => rx.test(txt(el)) || (el.getAttribute('aria-label') && rx.test(el.getAttribute('aria-label'))));

    if (!r) throw err('mode_missing', `Não achei a opção de ${kind === 'video' ? 'vídeo' : 'imagem'}.`);

    const isChecked = isOn(r)
      || r.getAttribute('aria-selected') === 'true'
      || r.classList.contains('active')
      || r.classList.contains('selected')
      || r.classList.contains('mat-button-toggle-checked');

    if (!isChecked) {
      realClick(r);
      await human(500, 1000);
      if (!(isOn(r) || r.getAttribute('aria-selected') === 'true' || r.classList.contains('selected') || r.classList.contains('mat-button-toggle-checked'))) {
        r.click();
        await human(400, 800);
      }
    }
    dtLog('Modo escolhido: ' + (kind === 'video' ? 'vídeo' : 'imagem') + '.', { opcao: txt(r).slice(0, 30) });
  }

  async function chooseModel(panel, name) {
    const btn = $$(S.modelBtn, panel).find((b) => /nano banana|veo|omni|imagen/i.test(txt(b))) || $(S.modelBtn, panel);
    if (!btn) throw err('model_btn_missing', 'Não achei o seletor de modelo.');
    if (norm(txt(btn)).includes(norm(name))) return;
    btn.click();
    await human(400, 900);
    const item = $$(S.menuItem).find((i) => norm(txt(i)).includes(norm(name)));
    if (!item) {
      pressEscape();
      throw err('model_missing', `O modelo "${name}" não está disponível nesta conta.`);
    }
    item.click();
    await human(500, 1000);
  }

  async function maybePickRadio(panel, re) {
    const r = radios(panel).find((x) => re.test(rlabel(x)));
    if (!r) return false;
    if (!isOn(r)) {
      r.click();
      await human(250, 650);
    }
    return true;
  }

  async function configure(job) {
    const p = job.params || {};
    const count = Math.min(Math.max(Number(p.count) || 1, 1), 4);
    const panel = await openSettings();
    await setMode(panel, job.kind);
    if (p.model) {
      // o modelo vem primeiro: as opcoes mudam com ele
      try {
        await chooseModel(panel, p.model);
      } catch (e) {
        // Imagem: os modelos sao outros (Nano Banana...). Sem o pedido, usa o que estiver selecionado em vez de falhar.
        if (job.kind !== 'image' || !e || e.code !== 'model_missing') throw e;
        dtLog(`O modelo "${p.model}" não existe no modo imagem; usando o modelo já selecionado.`, { atual: txt($(S.modelBtn, panel) || document.createElement('i')).slice(0, 40) }, 'warn');
      }
    }
    if (p.aspectRatio) await maybePickRadio(panel, new RegExp('^\\s*' + esc(p.aspectRatio) + '\\s*$'));

    let hasResolution = false;
    let hasDuration = false;
    if (job.kind === 'video') {
      // Modelos como Omni 1.1 Flash tem opcoes de resolucao (360p, 720p).
      // Modelos como Veo 3.1 (Lite, Fast, Quality) possuem resolucao e duracao unicas/fixas (sem radio no modal).
      if (p.resolution) {
        hasResolution = await maybePickRadio(panel, new RegExp('^\\s*' + esc(p.resolution)));
      }
      if (p.duration) {
        hasDuration = await maybePickRadio(panel, new RegExp('^\\s*' + Number(p.duration) + 's\\s*$'));
      }
    }
    await maybePickRadio(panel, new RegExp('^\\s*x' + count + '\\s*$'));
    await closeSettings();

    // Confere o resumo mostrado no botao apenas para opcoes que realmente existiam no painel deste modelo
    const summary = txt(settingsBtnEl() || $(S.settingsBtn));
    const need = [];
    if (job.kind === 'video') {
      if (p.resolution && hasResolution) need.push(p.resolution);
      if (p.duration && hasDuration) need.push(p.duration + 's');
    }
    const miss = need.filter((n) => !summary.includes(n));
    if (miss.length) throw err('config_mismatch', `As configurações não foram aplicadas (aparece "${summary}").`);
    // O resumo comeca com o modo ("Video · 360p..." / "Image · ..."): gerar video no lugar de imagem gasta credito a toa.
    const wantMode = job.kind === 'video' ? /^\s*video\b/i : /^\s*image\b/i;
    const summaryMode = summary.replace(/^[a-z_]+\s+(?=[A-Z])/, '');
    if (/^\s*(video|image)\b/i.test(summaryMode) && !wantMode.test(summaryMode)) {
      throw err('config_mismatch', `O Flow ficou no modo errado (aparece "${summary}").`);
    }
  }

  // ---------- prompt ----------

  async function ensureDirectMode() {
    const t = $(S.agentToggle);
    if (t && t.getAttribute('aria-pressed') === 'true') {
      t.click(); // geracao direta, sem o modo agente do Flow
      await human(400, 800);
    }
  }

  async function writePrompt(text) {
    const ed = $(S.editor);
    if (!ed) throw err('editor_missing', 'Não achei a caixa de prompt do Flow. Abra um projeto.');
    ed.focus();
    await sleep(200);
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    const lines = String(text).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) document.execCommand('insertLineBreak', false); // Enter sozinho enviaria o prompt
      if (lines[i]) document.execCommand('insertText', false, lines[i]);
    }
    try {
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(text) }));
      ed.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (_) {}
    await human(300, 700);
    const head = String(text).slice(0, 24).replace(/\s+/g, ' ');
    if (!txt($(S.editor)).includes(head.slice(0, 16))) throw err('prompt_not_written', 'O prompt não foi escrito na caixa do Flow.');
  }

  // ---------- geracao e captura ----------

  const seenTileKeys = new Set();
  function tileKey(el) {
    if (!el) return '';
    return (
      el.getAttribute('data-media-id') ||
      el.getAttribute('id') ||
      (el.querySelector && el.querySelector('[data-media-id]') && el.querySelector('[data-media-id]').getAttribute('data-media-id')) ||
      el.dataset.dtKey ||
      (el.dataset.dtKey = 'dt_' + Math.random().toString(36).slice(2, 9))
    );
  }

  const tileSel = () => [S.imageTile, S.videoTile, S.pendingTile].join(', ');
  const unseen = (list) => list.filter((t) => !t.hasAttribute('data-dt-seen') && !seenTileKeys.has(tileKey(t)));

  function getVideoSrc(v) {
    if (!v) return '';
    return (
      v.currentSrc ||
      v.src ||
      (v.querySelector && v.querySelector('source') && v.querySelector('source').src) ||
      v.getAttribute('src') ||
      ''
    );
  }

  function blobToB64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  function tileFp(el) {
    if (!el) return '';
    const id = el.getAttribute('data-media-id') || $('[data-media-id]', el)?.getAttribute('data-media-id') || '';
    if (id) return 'id:' + id;
    const img = $('img', el);
    const src = (img && (img.src || img.currentSrc)) || '';
    if (src && !src.startsWith('data:')) {
      return 'img:' + src.split('?')[0].split('/').slice(-3).join('/');
    }
    const vid = $('video', el);
    const vsrc = (vid && (vid.src || vid.currentSrc)) || '';
    if (vsrc && !vsrc.startsWith('data:')) {
      return 'vid:' + vsrc.split('?')[0].split('/').slice(-3).join('/');
    }
    return el.__dtFp || (el.__dtFp = 'fp_' + Math.random().toString(36).slice(2, 9));
  }

  function wakeUpElement(node) {
    if (!node) return;
    try {
      const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { left: 100, top: 100, width: 50, height: 50 };
      const clientX = (rect.left || 0) + (rect.width || 0) / 2;
      const clientY = (rect.top || 0) + (rect.height || 0) / 2;
      const mouseOpts = { bubbles: true, cancelable: true, view: window, clientX, clientY };
      const pointerOpts = { bubbles: true, cancelable: true, view: window, clientX, clientY, pointerType: 'mouse', isPrimary: true };

      node.dispatchEvent(new PointerEvent('pointerover', pointerOpts));
      node.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
      node.dispatchEvent(new PointerEvent('pointerenter', pointerOpts));
      node.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
      node.dispatchEvent(new PointerEvent('pointermove', pointerOpts));
      node.dispatchEvent(new MouseEvent('mousemove', mouseOpts));
      node.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
      node.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      node.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
      node.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
      if (typeof node.click === 'function') node.click();
    } catch (_) {}
  }

  function wakeUpTile(tile) {
    if (!tile) return;
    wakeUpElement(tile);
    const interactive = $$(
      'button, [role=button], mat-icon, img, .mat-mdc-button-base, [class*="chip"], [class*="badge"], [class*="play"], [aria-label*="play" i]',
      tile
    );
    for (const item of interactive) {
      wakeUpElement(item);
    }
    if (tile.shadowRoot) {
      const shadowInteractive = Array.from(tile.shadowRoot.querySelectorAll('button, img, [role=button], mat-icon'));
      for (const item of shadowInteractive) {
        wakeUpElement(item);
      }
    }
  }

  function getVideoSourceFromTile(tile, knownOldUrls) {
    if (!tile) return '';

    // 1. Tags <video> estritamente DENTRO do tile (ou de seu shadowRoot)
    const vids = [
      ...$$('video', tile),
      ...(tile.shadowRoot ? Array.from(tile.shadowRoot.querySelectorAll('video')) : []),
    ];
    for (const v of vids) {
      const s = getVideoSrc(v);
      if (s && s.length > 5 && !s.startsWith('data:') && (!knownOldUrls || !knownOldUrls.has(s))) {
        return s;
      }
    }

    // 2. Links diretos dentro do tile
    const links = [
      ...$$('a[href]', tile),
      ...(tile.shadowRoot ? Array.from(tile.shadowRoot.querySelectorAll('a[href]')) : []),
    ];
    for (const a of links) {
      const h = a.href || a.getAttribute('href') || '';
      if (/\.mp4\b/i.test(h) || /googlevideo\.com/i.test(h) || /storage\.googleapis\.com/i.test(h)) {
        if (!knownOldUrls || !knownOldUrls.has(h)) return h;
      }
    }

    // 3. Atributos nos elementos do tile
    const allDesc = [
      tile,
      ...$$('*', tile),
      ...(tile.shadowRoot ? Array.from(tile.shadowRoot.querySelectorAll('*')) : []),
    ];
    for (const el of allDesc) {
      // Posters (<img>) tambem moram em storage.googleapis.com: nunca sao o video.
      if (el.tagName === 'IMG' || el.tagName === 'PICTURE') continue;
      for (const attr of ['src', 'data-src', 'data-video-url', 'data-url', 'data-media-url', 'data-download-url']) {
        const val = el.getAttribute ? el.getAttribute(attr) : '';
        const looksVideo = /\.(mp4|webm)\b/i.test(val || '') || /\/video\//i.test(val || '') || /^blob:/i.test(val || '');
        const looksImage = /\.(png|jpe?g|webp|gif)\b/i.test(val || '') || /\/image\//i.test(val || '');
        if (val && looksVideo && !looksImage) {
          if (!knownOldUrls || !knownOldUrls.has(val)) return val;
        }
      }
      try {
        const jsUrl = el.videoUrl || el.mediaUrl || (el.media && el.media.url) || (el.__data && el.__data.url);
        if (typeof jsUrl === 'string' && jsUrl.length > 10 && (!knownOldUrls || !knownOldUrls.has(jsUrl))) {
          return jsUrl;
        }
      } catch (_) {}
    }

    return '';
  }

  function getVideoSourceFromModal(knownOldUrls) {
    const dialogs = $$('[role=dialog], mat-dialog-container, flow-media-viewer, flow-video-player, flow-lightbox, .cdk-overlay-pane')
      .filter((d) => vis(d) && !d.closest('[aria-label*="Account" i], [aria-label*="Conta" i]'));

    for (const d of dialogs) {
      const vids = $$('video', d);
      for (const v of vids) {
        // NUNCA aceita <video> que pertenca a outro flow-video-tile na grade
        if (v.closest(S.videoTile)) continue;
        const s = getVideoSrc(v);
        if (s && s.length > 5 && !s.startsWith('data:') && (!knownOldUrls || !knownOldUrls.has(s))) {
          return s;
        }
      }
      const links = $$('a[href]', d);
      for (const a of links) {
        const h = a.href || '';
        if (/\.mp4\b/i.test(h) || /storage\.googleapis\.com/i.test(h)) {
          if (!knownOldUrls || !knownOldUrls.has(h)) return h;
        }
      }
    }
    return '';
  }

  const BADGE_SEL = 'button, [role=button], [class*="chip"], [class*="play"], mat-icon';

  // Resumo do tile para o log: o que existe dentro dele agora.
  function describeTile(tile) {
    if (!tile) return null;
    const inner = [...$$(BADGE_SEL, tile), ...(tile.shadowRoot ? Array.from(tile.shadowRoot.querySelectorAll(BADGE_SEL)) : [])];
    return {
      tag: tile.tagName.toLowerCase(),
      mediaId: tile.getAttribute('data-media-id') || ($('[data-media-id]', tile) && $('[data-media-id]', tile).getAttribute('data-media-id')) || null,
      videos: $$('video', tile).map((v) => ({ src: shortUrl(getVideoSrc(v)), readyState: v.readyState })),
      imgs: $$('img', tile).length,
      links: $$('a[href]', tile).length,
      shadowRoot: !!tile.shadowRoot,
      buttons: inner.slice(0, 12).map((b) => `${b.tagName.toLowerCase()}:${(b.getAttribute('aria-label') || txt(b)).slice(0, 30)}`),
      text: txt(tile).slice(0, 80),
    };
  }

  // Badge de resolucao/play (canto superior esquerdo do flow-video-tile: "play 360p"/"play 720p").
  function findPlayBadges(tile) {
    const box = tile.getBoundingClientRect();
    const cands = [...$$(BADGE_SEL, tile), ...(tile.shadowRoot ? Array.from(tile.shadowRoot.querySelectorAll(BADGE_SEL)) : [])];
    const score = (el) => {
      const t = txt(el) + ' ' + (el.getAttribute('aria-label') || '');
      let sc = 0;
      if (/\b(360p|720p|1080p)\b/i.test(t)) sc += 3;
      if (/play|reproduzir|▶/i.test(t)) sc += 3;
      const r = el.getBoundingClientRect();
      if (sc && r.width && box.width && r.left - box.left < box.width * 0.5 && r.top - box.top < box.height * 0.35) sc += 2;
      return sc;
    };
    const picked = new Map();
    for (const el of cands) {
      const sc = score(el);
      if (sc <= 0) continue;
      const target = el.closest('button, [role=button]') || el;
      picked.set(target, Math.max(sc, picked.get(target) || 0));
    }
    return Array.from(picked.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([el]) => el);
  }

  // pointerdown + pointerup + click direto no badge para o player carregar o video.
  function clickPlayBadge(tile) {
    const badges = findPlayBadges(tile);
    for (const b of badges) {
      const r = b.getBoundingClientRect();
      const clientX = r.left + r.width / 2;
      const clientY = r.top + r.height / 2;
      const mo = { bubbles: true, cancelable: true, view: window, clientX, clientY };
      const po = { ...mo, pointerType: 'mouse', isPrimary: true };
      try {
        b.dispatchEvent(new PointerEvent('pointerdown', po));
        b.dispatchEvent(new MouseEvent('mousedown', mo));
        b.dispatchEvent(new PointerEvent('pointerup', po));
        b.dispatchEvent(new MouseEvent('mouseup', mo));
        b.dispatchEvent(new MouseEvent('click', mo));
      } catch (_) {}
    }
    return badges.map((b) => ({ tag: b.tagName.toLowerCase(), text: txt(b).slice(0, 30), aria: (b.getAttribute('aria-label') || '').slice(0, 40) }));
  }

  const viewerDialogs = () =>
    $$('[role=dialog], mat-dialog-container, flow-media-viewer, flow-video-player, flow-lightbox, .cdk-overlay-pane').filter(
      (d) => vis(d) && !d.closest('[aria-label*="Account" i], [aria-label*="Conta" i]')
    );

  async function capture(kind, el, knownOldUrls) {
    let src = '';
    let via = '';
    dtLog(`Captura de ${kind} iniciada.`, describeTile(el));
    if (kind === 'image') {
      const img = $('img', el) || el;
      src = img.currentSrc || img.src || '';
      via = 'img';
    } else {
      try {
        el.scrollIntoView({ block: 'center', behavior: 'instant' }); // galerias carregam o player so com o tile visivel
      } catch (_) {}

      // 1. Tenta pegar direto se ja houver no proprio tile
      src = getVideoSourceFromTile(el, knownOldUrls);
      if (src) via = 'tile';

      // 2. Se nao encontrou, acorda o tile e clica no badge de play/resolucao
      if (!src) {
        dtLog('Nenhum <video> no tile ainda: acordando o tile e clicando no badge de play.', describeTile(el));
        wakeUpTile(el);
        const clicked = clickPlayBadge(el);
        dtLog(clicked.length ? 'Badge de play/resolução clicado.' : 'Nenhum badge de play/resolução encontrado no tile.', { badges: clicked }, clicked.length ? 'info' : 'warn');
        await sleep(600);
        src = getVideoSourceFromTile(el, knownOldUrls);
        if (src) via = 'tile';
        else {
          src = getVideoSourceFromModal(knownOldUrls);
          if (src) via = 'visualizador';
        }
      }

      // 3. Aguarda o player disponibilizar o video no tile ou no visualizador
      const t0 = Date.now();
      let stepCount = 0;
      let viewerWaits = 0;
      while (Date.now() - t0 < 35000 && !src) {
        await sleep(500);
        src = getVideoSourceFromTile(el, knownOldUrls);
        if (src) {
          via = 'tile';
          break;
        }
        src = getVideoSourceFromModal(knownOldUrls);
        if (src) {
          via = 'visualizador';
          break;
        }

        // A cada ~3 segundos, insiste em acordar o tile novamente
        if (Date.now() - t0 > (stepCount + 1) * 3000) {
          stepCount++;
          const viewers = viewerDialogs();
          if (viewers.length && viewerWaits < 2) {
            // Um visualizador ja abriu: clicar de novo poderia fecha-lo. Espera o <video> aparecer.
            viewerWaits++;
            dtLog(`Tentativa ${stepCount}: visualizador aberto sem <video> ainda, aguardando.`, { dialogs: viewers.map((d) => d.tagName.toLowerCase()) });
            continue;
          }
          if (viewers.length) {
            dtLog(`Tentativa ${stepCount}: visualizador sem <video>, fechando e tentando de novo.`, null, 'warn');
            pressEscape();
            viewerWaits = 0;
            await sleep(300);
          }
          wakeUpTile(el);
          const clicked = clickPlayBadge(el);
          if (stepCount % 2 === 0) {
            try {
              el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
            } catch (_) {}
          }
          dtLog(`Tentativa ${stepCount} de capturar o vídeo (${Math.round((Date.now() - t0) / 1000)}s).`, { badges: clicked, tile: describeTile(el) });
        }
      }

      // Se abriu algum modal de visualizacao, fecha com Escape
      if (viewerDialogs().length) {
        pressEscape();
        await sleep(200);
      }
    }
    if (!src) {
      dtLog('Captura falhou: nenhum arquivo de vídeo/imagem encontrado.', { tile: describeTile(el), html: String(el.outerHTML || '').slice(0, 1500), dialogs: viewerDialogs().length }, 'error');
      throw err('capture_failed', 'Não encontrei o arquivo gerado na página.');
    }
    dtLog(`Fonte ${kind} encontrada (${via}).`, { url: shortUrl(src) });
    try {
      const res = await fetch(src, { credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (blob.size > MAX_BYTES) throw err('too_big', 'Arquivo grande demais.');
      dtLog(`Mídia lida pela página com sucesso.`, { url: shortUrl(src), bytes: blob.size, type: blob.type }, 'success');
      return { ok: true, kind, mime: blob.type, b64: await blobToB64(blob) };
    } catch (e) {
      if (e && e.code === 'too_big') {
        dtLog('Arquivo grande demais.', { url: shortUrl(src) }, 'error');
        throw e;
      }
      // A pagina nao deixou ler (CORS): o background tenta baixar pela URL, se ela for publica.
      if (/^https?:/i.test(src)) {
        dtLog('A página não deixou ler a mídia; o background baixará pela URL.', { url: shortUrl(src), reason: String((e && e.message) || e) }, 'warn');
        return { ok: true, kind, url: src };
      }
      dtLog('Não consegui ler a mídia gerada.', { url: shortUrl(src), reason: String((e && e.message) || e) }, 'error');
      throw err('capture_failed', 'Não consegui ler a mídia gerada.');
    }
  }

  function costHint() {
    const b = $(S.settingsBtn);
    const scope = (b && b.closest('form, flow-base-prompt-box')) || b;
    const m = /(\d{1,4})\s*(credits|créditos|cr)\b/i.exec(txt(scope));
    return m ? Number(m[1]) : null;
  }

  // Estado de um tile da galeria. "8%" sozinho tambem conta como gerando (o \b depois do % nao casava).
  const GEN_RX = /(\d{1,3}\s?%|\bgenerating\b|\bgerando\b|\bcriando\b|\bloading\b|\bqueued\b|\bna fila\b)/i;
  const RES_RX = /\b\d{3,4}p\b/i;
  // Tile que o Flow recusou ("warning Failed This prompt might violate our policies..."): continua dentro do
  // tile pendente, entao sem esta checagem parecia "gerando" para sempre.
  // Politica ("prominent people") x falha generica e passageira ("failed to generate") x outra.
  const failCode = (msg) =>
    /polic|violat|prominent|pessoas|people/i.test(msg) ? 'policy' : /failed to generate|something went wrong|try again|unable to generate|couldn.t generate/i.test(msg) ? 'gen_failed' : 'failed';
  const FAILED_RX = /\bfailed\b|might violate|violate our polic|will be refunded|não foi possível gerar|geração falhou|falhou/i;
  function tileState(tile) {
    const t = txt(tile);
    const spinner = !!$('mat-spinner, mat-progress-spinner, mat-progress-bar, [role=progressbar], .mat-mdc-progress-spinner, .mat-mdc-progress-bar, .spinner', tile);
    const pending = !!(tile.matches && tile.matches(S.pendingTile));
    const img = $('img', tile);
    const hasImg = !!img && (img.naturalWidth > 40 || (img.src && !img.src.startsWith('data:')));
    const hasVideo = !!$('video', tile);
    // O Flow desenha a recusa num componente proprio (flow-error-tile: "Failed", Retry / Reuse prompt / Delete).
    const failed = !!$('flow-error-tile, .error-tile', tile) || (FAILED_RX.test(t) && !hasVideo);
    return { generating: !failed && (pending || spinner || GEN_RX.test(t)), failed, hasImg, hasVideo, badge: RES_RX.test(t), text: t.slice(0, 60) };
  }
  function isTileGenerating(tile) {
    return !!tile && tileState(tile).generating;
  }

  // ---------- visualizador do Flow (tela inteira dentro da pagina, nao e um dialogo) ----------

  function realClick(node) {
    if (!node) return;
    try {
      const r = node.getBoundingClientRect ? node.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const clientX = r.left + r.width / 2;
      const clientY = r.top + r.height / 2;
      const mo = { bubbles: true, cancelable: true, view: window, clientX, clientY };
      const po = { ...mo, pointerType: 'mouse', isPrimary: true };
      node.dispatchEvent(new PointerEvent('pointerdown', po));
      node.dispatchEvent(new MouseEvent('mousedown', mo));
      node.dispatchEvent(new PointerEvent('pointerup', po));
      node.dispatchEvent(new MouseEvent('mouseup', mo));
      node.dispatchEvent(new MouseEvent('click', mo)); // um unico clique: dois cliques fechariam o que o primeiro abriu
    } catch (_) {}
  }

  // Clicar num tile abre a rota /project/:id/edit/:id (visualizador/editor do video).
  const inEditRoute = () => /\/edit\//.test(location.pathname);

  // O <video> do visualizador: visivel, com fonte. Fora da rota de edicao nao pode estar num tile da galeria;
  // dentro dela o proprio player pode ser um flow-video-tile (tem barra de progresso), entao vale qualquer <video>.
  function viewerVideoEl() {
    const edit = inEditRoute();
    return (
      $$('video').find((v) => {
        if (!vis(v)) return false;
        if (!edit && (v.closest(S.videoTile) || v.closest(S.imageTile))) return false;
        const s = getVideoSrc(v);
        return !!s && s.length > 5 && !s.startsWith('data:');
      }) || null
    );
  }

  // Aberto = tem <video> do visualizador ou a pagina esta na rota de edicao.
  const viewerOpen = () => !!viewerVideoEl() || inEditRoute();

  // Maior imagem/video/canvas visivel da tela (o "palco" do visualizador), para retrato e clique de play.
  function viewerStage() {
    let best = null;
    let bestArea = 0;
    for (const el of $$('video, img, canvas')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    return bestArea > 20000 ? best : null;
  }

  // URLs de midia que a pagina ja baixou (so as de video, nunca imagem), da mais nova para a mais antiga.
  function mediaFromTimeline(sinceMs) {
    try {
      return performance
        .getEntriesByType('resource')
        .filter((e) => e.startTime >= sinceMs && e.initiatorType !== 'img' && e.initiatorType !== 'css' && (e.initiatorType === 'video' || /\.mp4\b|\.webm\b|videoplayback|\/video\//i.test(e.name)) && !/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(e.name))
        .map((e) => e.name)
        .reverse();
    } catch (_) {
      return [];
    }
  }

  // Endereco do poster do tile sem sufixo (?query ou "=..."): a URL do video usa o mesmo codigo com outro sufixo.
  function tileThumbBase(tile) {
    const img = $('img', tile);
    const src = img ? img.currentSrc || img.src || '' : '';
    if (!/^https?:/i.test(src)) return '';
    return src.split('?')[0].split('=')[0];
  }

  // Possiveis URLs do video do tile: o que a pagina ja pediu com o codigo do poster (ex.: ...=mm,18,15),
  // midia de video pedida depois do clique e, por fim, sufixos de formato conhecidos do Google.
  function videoUrlCandidates(base, sinceMs) {
    const out = [];
    const seen = new Set();
    const add = (url, from) => {
      if (url && !seen.has(url) && /^https?:/i.test(url)) {
        seen.add(url);
        out.push({ url, from });
      }
    };
    let entries = [];
    try {
      entries = performance.getEntriesByType('resource').slice().reverse();
    } catch (_) {}
    if (base) {
      for (const e of entries) {
        if (e.initiatorType !== 'img' && e.name.startsWith(base) && e.name.length > base.length) add(e.name, 'timeline-poster');
      }
    }
    for (const u of mediaFromTimeline(sinceMs)) add(u, 'timeline-midia');
    if (base) {
      for (const suf of ['=mm,18,15', '=m18', '=m22']) add(base + suf, 'palpite');
    }
    return out;
  }

  // Le a URL e confere os bytes sem registrar erro: devolve { blob } se for video, ou { why }.
  async function probeVideoUrl(u) {
    try {
      const res = await fetch(u, { credentials: 'include' });
      if (!res.ok) return { why: 'http ' + res.status };
      const blob = await res.blob();
      if (blob.size > MAX_BYTES) return { why: 'grande demais ' + blob.size };
      if (!(await looksLikeVideo(blob))) return { why: `não é vídeo (${blob.type || '?'}, ${blob.size} bytes)` };
      return { blob };
    } catch (e) {
      // Erro de rede/CORS na pagina (redirecionamento para outro dominio): o segundo plano baixa e confere os bytes.
      const viaBg = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'FLOW_PROBE_URL', url: u }, (r) => {
            void chrome.runtime.lastError;
            resolve(r || null);
          });
        } catch (_) {
          resolve(null);
        }
      });
      if (viaBg && viaBg.ok && viaBg.b64) {
        const bin = atob(viaBg.b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { blob: new Blob([bytes], { type: viaBg.mime || 'video/mp4' }) };
      }
      return { why: viaBg && viaBg.why ? 'segundo plano: ' + viaBg.why : String((e && e.message) || e).slice(0, 60) };
    }
  }

  // Diagnostico: abre o menu "Download media" do visualizador, registra as opcoes e fecha com Escape.
  async function snapshotDownloadMenu() {
    const btn = $$('button').find((b) => vis(b) && /download/i.test(b.getAttribute('aria-label') || ''));
    if (!btn) {
      dtLog('Botão de download não encontrado no visualizador.', null, 'warn');
      return;
    }
    realClick(btn);
    await sleep(900);
    const overlay = $('.cdk-overlay-container');
    if (overlay && txt(overlay)) dtSnapshot('menu de download', overlay, 'warn');
    else dtLog('O botão de download não abriu um menu.', null, 'warn');
    pressEscape();
    await sleep(300);
  }

  // O player pode so mostrar o poster ate alguem clicar em play: tenta o palco e botoes de play fora da galeria.
  function tryPlayViewer() {
    const stage = viewerStage();
    const playBtn = $$('button, [role=button]').find((b) => {
      if (!vis(b)) return false;
      const ic = $('mat-icon', b);
      const t = ic ? txt(ic) : '';
      return /^(play_arrow|play_circle|play_circle_filled|slideshow)$/.test(t) && !b.closest('flow-tile-hover-footer');
    });
    dtLog('Tentando iniciar o player do visualizador.', { palco: stage ? stage.tagName.toLowerCase() : null, botaoPlay: !!playBtn });
    if (playBtn) realClick(playBtn);
    else if (stage) realClick(stage);
  }

  async function closeViewer() {
    for (let i = 0; i < 3; i++) {
      if (!viewerOpen()) return true;
      const clean = (b) => txt(b).replace(/^[a-z]+(?:_[a-z0-9]+)*\s+/, '');
      const done = $$('button, [role=button]').find((b) => vis(b) && /^(done|concluído|concluido|concluir|fechar|close)$/i.test(clean(b)));
      const back = $$('button').find((b) => {
        if (!vis(b)) return false;
        const ic = $('mat-icon', b);
        return (ic && txt(ic) === 'arrow_back') || /^(back|voltar)$/i.test(b.getAttribute('aria-label') || '');
      });
      const target = done || back;
      // Ultima tentativa na rota de edicao sem botao reconhecido: voltar no historico.
      const viaHistory = !target && i >= 1 && inEditRoute();
      dtLog(target ? 'Fechando o visualizador pelo botão.' : viaHistory ? 'Fechando o visualizador voltando no histórico.' : 'Fechando o visualizador com Escape.', { botao: target ? clean(target) || 'voltar' : viaHistory ? 'history.back' : 'Escape' });
      if (target) realClick(target);
      else if (viaHistory) history.back();
      else pressEscape();
      await until(() => !viewerOpen(), 4000, 300);
    }
    const closed = !viewerOpen();
    if (!closed) dtLog('O visualizador não fechou.', null, 'warn');
    return closed;
  }

  const normText = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // Texto da pagina SEM a caixa de prompt e campos de entrada: ela ainda guarda o prompt digitado
  // e faria qualquer visualizador parecer o certo.
  function pageTextWithoutInputs() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('[contenteditable], textarea, input, flow-base-prompt-box, flow-prompt-box, script, style, noscript').forEach((e) => e.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // O visualizador mostra o prompt do video aberto. Compara com o prompt do job para nao pegar o take de outro projeto.
  function promptMatches(prompt, bodyText) {
    const p = normText(prompt);
    const b = normText(bodyText);
    const m = /\[scene \d+ of \d+\]/i.exec(p);
    if (!m) return { known: false };
    const i = b.indexOf(m[0]);
    if (i < 0) return { known: false };
    let seg = b.slice(i, i + 240);
    const cut = seg.search(/\.\.\.|…/);
    if (cut >= 40) seg = seg.slice(0, cut);
    seg = seg.trim();
    if (seg.length < 40) return { known: false, seg };
    return { known: true, match: p.startsWith(seg.slice(0, 160)), seg: seg.slice(0, 90) };
  }

  // Confere os primeiros bytes: MP4 tem "ftyp" na posicao 4; WebM comeca com 1A 45 DF A3.
  async function looksLikeVideo(blob) {
    try {
      const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      const ascii = String.fromCharCode(...b.slice(4, 8));
      return ascii === 'ftyp' || (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3);
    } catch (_) {
      return /^video\//i.test(blob.type || '');
    }
  }

  async function fetchMedia(kind, src) {
    try {
      const res = await fetch(src, { credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (blob.size > MAX_BYTES) throw err('too_big', 'Arquivo grande demais.');
      if (kind === 'video' && !(await looksLikeVideo(blob))) {
        dtLog('O arquivo lido não é um vídeo (provavelmente a miniatura). Descartado.', { url: shortUrl(src), bytes: blob.size, type: blob.type }, 'error');
        throw err('not_video', 'O arquivo encontrado não é um vídeo.');
      }
      dtLog('Mídia lida pela página com sucesso.', { url: shortUrl(src), bytes: blob.size, type: blob.type }, 'success');
      return { ok: true, kind, mime: blob.type, b64: await blobToB64(blob) };
    } catch (e) {
      if (e && (e.code === 'too_big' || e.code === 'not_video')) throw e;
      if (/^https?:/i.test(src)) {
        dtLog('A página não deixou ler a mídia; o background baixará pela URL.', { url: shortUrl(src), reason: String((e && e.message) || e) }, 'warn');
        return { ok: true, kind, url: src };
      }
      dtLog('Não consegui ler a mídia gerada.', { url: shortUrl(src), reason: String((e && e.message) || e) }, 'error');
      throw err('capture_failed', 'Não consegui ler a mídia gerada.');
    }
  }

  // ---------- retrato da pagina: estrutura compacta e SEM dados pessoais, enviada ao log ----------

  const SNAP_MAX_NODES = 220;
  const SNAP_MAX_DEPTH = 9;
  const SNAP_CHUNK = 4500; // o log aceita 8000 caracteres por entrada (com o escape do JSON)

  function snapClean(s) {
    return String(s || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
      .replace(/\b[A-Za-z0-9_-]{28,}\b/g, '<token>');
  }

  // Endereco de midia: so o host e o fim do caminho, nunca a parte assinada (?query).
  function snapUrl(u) {
    try {
      if (/^blob:/i.test(u)) return 'blob:';
      if (/^data:/i.test(u)) return 'data:';
      const x = new URL(u, location.href);
      return x.host + '/…/' + x.pathname.split('/').slice(-2).join('/');
    } catch (_) {
      return String(u).slice(0, 40);
    }
  }

  function ancestor(el, n) {
    let e = el;
    for (let i = 0; i < n && e && e.parentElement && e.parentElement !== document.body; i++) e = e.parentElement;
    return e;
  }

  function snapOutline(root) {
    if (!root) return [];
    const lines = [];
    let nodes = 0;
    const walk = (el, depth) => {
      if (nodes >= SNAP_MAX_NODES || depth > SNAP_MAX_DEPTH) return;
      const tag = el.tagName.toLowerCase();
      if (/^(script|style|noscript|svg|path|defs|link|meta)$/.test(tag)) return;
      nodes++;
      const cls = (typeof el.className === 'string' ? el.className : '')
        .split(/\s+/)
        .filter((c) => c && !/^ng-|^_ng|^cdk-|^mat-mdc-(?!button|menu)/.test(c))
        .slice(0, 3)
        .join('.');
      let s = '  '.repeat(depth) + tag + (cls ? '.' + cls : '');
      for (const a of ['role', 'aria-label', 'aria-selected', 'aria-checked', 'aria-pressed', 'aria-disabled', 'disabled', 'type', 'data-media-id']) {
        const v = el.getAttribute && el.getAttribute(a);
        if (v != null && v !== '') s += `[${a}=${a === 'data-media-id' ? String(v).slice(0, 6) : snapClean(v).slice(0, 30)}]`;
      }
      if (/^(img|video|source|a|iframe)$/.test(tag)) {
        const u = el.currentSrc || el.getAttribute('src') || el.getAttribute('href');
        if (u) s += ` @${snapClean(snapUrl(u))}`;
      }
      if (tag === 'video') s += ` rs=${el.readyState}`;
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (own) s += ` "${snapClean(own).slice(0, 40)}"`;
      lines.push(s);
      for (const c of el.children) walk(c, depth + 1);
      if (el.shadowRoot) for (const c of el.shadowRoot.children) walk(c, depth + 1);
    };
    walk(root, 0);
    return lines;
  }

  // Envia o retrato de uma regiao ao log (em ate 3 partes). Devolve quantas partes foram geradas.
  function dtSnapshot(label, root, level = 'info') {
    const lines = snapOutline(root);
    if (!lines.length) {
      dtLog(`Retrato "${label}": região não encontrada.`, null, 'warn');
      return 0;
    }
    const text = lines.join('\n');
    const parts = [];
    for (let i = 0; i < text.length; i += SNAP_CHUNK) parts.push(text.slice(i, i + SNAP_CHUNK));
    const sent = parts.slice(0, 3);
    sent.forEach((p, i) => dtLog(`Retrato "${label}" (${i + 1}/${sent.length})`, { outline: p, nos: lines.length }, level));
    return sent.length;
  }

  function snapshotFailure(tile) {
    dtSnapshot('galeria: tile candidato e vizinhos', ancestor(tile, 2), 'warn');
    const v = viewerVideoEl();
    if (v) dtSnapshot('visualizador aberto', ancestor(v, 6), 'warn');
    else if (inEditRoute()) {
      // Visualizador aberto sem <video> reconhecido: registra tudo o que ajuda a achar o player e o botao de fechar.
      const botoes = $$('button, [role=button]')
        .filter((b) => vis(b))
        .slice(0, 40)
        .map((b) => {
          const ic = $('mat-icon', b);
          return snapClean((b.getAttribute('aria-label') || (ic ? txt(ic) : '') || txt(b)).slice(0, 30));
        });
      dtLog(
        'Diagnóstico do visualizador sem vídeo.',
        {
          rota: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id'),
          videos: $$('video').map((x) => ({ src: snapClean(snapUrl(getVideoSrc(x))), rs: x.readyState, visivel: vis(x), emTile: !!x.closest(S.videoTile) })),
          midias: mediaFromTimeline(0).slice(0, 5).map((u) => snapClean(snapUrl(u))),
          botoes,
        },
        'warn'
      );
      const stage = viewerStage();
      if (stage) dtSnapshot('visualizador: palco', ancestor(stage, 5), 'warn');
    }
  }

  // Retrato manual (botao do popup): tudo o que estiver na tela agora.
  async function snapshotAll() {
    let parts = 0;
    const ed = $(S.editor);
    if (ed) parts += dtSnapshot('caixa de prompt', ancestor(ed, 3));
    const panel = panelEl();
    parts += panel ? dtSnapshot('painel de ajustes', panel) : 0;
    const tile = $(S.videoTile) || $(S.imageTile);
    if (tile) parts += dtSnapshot('galeria: primeiro tile e vizinhos', ancestor(tile, 2));
    const gen = $$(S.videoTile).find((t) => tileState(t).generating);
    if (gen) parts += dtSnapshot('tile gerando', gen);
    const v = viewerVideoEl();
    if (v) parts += dtSnapshot('visualizador', ancestor(v, 6));
    parts += await snapshotReferences(!!ed);
    dtLog('Retrato da página concluído.', { partes: parts, rota: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id') }, 'success');
    return parts;
  }

  // ---------- teste de envio de imagem (base para anexar as folhas de personagem) ----------

  // Imagem PNG pequena e identificavel, feita na hora (sem baixar nada).
  function testPng() {
    return new Promise((resolve) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext && c.getContext('2d');
      if (!g) {
        // Sem canvas: PNG 8x8 laranja embutida.
        const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4/58BK2IYlRIBAPg2/w6bR6qJAAAAAElFTkSuQmCC';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return resolve(new File([bytes], 'darktube-teste-referencia.png', { type: 'image/png' }));
      }
      const grad = g.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#f59e0b');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(128, 128, 60, 0, Math.PI * 2);
      g.fill();
      c.toBlob((b) => resolve(new File([b], 'darktube-teste-referencia.png', { type: 'image/png' })), 'image/png');
    });
  }

  // Chips de referencia na caixa de prompt (o Flow cria o chip so depois de processar a imagem enviada).
  const ingredientChips = () =>
    Math.max(
      $$('flow-ingredient-chip').length,
      $$('flow-image-ingredient-chip, flow-video-ingredient-chip').length,
      $$('flow-ingredient-bar img.chip-image, flow-ingredient-bar .chip-container').length
    );

  // Abre o menu "+", entrega a imagem ao campo de arquivo do Flow por codigo (sem a janela do Windows),
  // registra o que mudou (biblioteca, chip de ingrediente) e fecha o menu.
  async function uploadTest() {
    dtLog('Teste de envio: início.', { chipsAntes: ingredientChips(), camposArquivo: fileInputsInfo().length });
    const plus = $$('button').find((b) => vis(b) && /add ingredients/i.test(b.getAttribute('aria-label') || ''));
    if (!plus) throw new Error('Não achei o botão "+" da caixa de prompt (abra um projeto do Flow).');
    realClick(plus);
    const menu = await until(() => $('flow-add-menu-popover-content'), 6000, 250);
    if (!menu) throw new Error('O menu "+" não abriu.');
    let input = await until(() => $('input[type=file]'), 3000, 250);
    if (!input) {
      // Alguns menus so criam o campo ao clicar em enviar: clica e captura, sem abrir a janela do Windows.
      const up = $('.sidebar-upload-btn') || $$('button', menu).find((b) => /upload|enviar/i.test(txt(b) + (b.getAttribute('aria-label') || '')));
      const origClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') {
          input = this;
          return;
        }
        return origClick.apply(this, arguments);
      };
      try {
        if (up) realClick(up);
        await until(() => input || $('input[type=file]'), 3000, 200);
        input = input || $('input[type=file]');
      } finally {
        HTMLInputElement.prototype.click = origClick;
      }
    }
    if (!input) {
      pressEscape();
      throw new Error('O Flow não criou o campo de envio de arquivo.');
    }
    const file = await testPng();
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    dtLog('Teste de envio: imagem entregue ao campo de arquivo.', { accept: input.getAttribute('accept'), multiple: input.multiple, bytes: file.size });

    // Espera algum sinal: chip novo na caixa de prompt, item novo na biblioteca, barra de envio ou erro do Flow.
    const t0 = Date.now();
    let seen = '';
    for (; Date.now() - t0 < 30000; ) {
      await sleep(1000);
      if (ingredientChips() > 0) {
        seen = 'imagem anexada como ingrediente';
        break;
      }
      const pop = $('flow-add-menu-popover-content');
      const t = txt(pop || document.body);
      if (/upload(ing|ed)|enviando|carregando|processing/i.test(t)) seen = seen || 'envio em andamento';
      if (/darktube-teste-referencia/i.test(t) || $$('img', pop || document).some((i) => /darktube-teste/i.test(i.alt || ''))) {
        seen = 'imagem apareceu na biblioteca';
        break;
      }
      if (/failed|error|erro|not supported|não suportad/i.test(t) && /upload|envio/i.test(t)) {
        seen = 'o Flow mostrou erro no envio';
        break;
      }
    }
    const menuNow = $('.cdk-overlay-container');
    if (menuNow && txt(menuNow)) dtSnapshot('teste de envio: menu depois do envio', menuNow, 'info');
    const ed = $(S.editor);
    if (ed) dtSnapshot('teste de envio: caixa de prompt depois do envio', ancestor(ed, 3), 'info');
    const result = seen || 'sem sinal visível em 30 s (confira a biblioteca do projeto)';
    dtLog('Teste de envio: ' + result + '.', { chipsDepois: ingredientChips() }, seen && !/erro/.test(seen) ? 'success' : 'warn');
    for (let i = 0; i < 3 && $('flow-add-menu-popover-content'); i++) {
      pressEscape();
      await sleep(400);
    }
    return result;
  }

  // ---------- referencias do take (folha do personagem/elenco e video do take anterior) ----------

  async function fetchRefFile(url, fallbackName) {
    const r = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'FLOW_FETCH_REF', url }, (resp) => {
          void chrome.runtime.lastError;
          resolve(resp || null);
        });
      } catch (_) {
        resolve(null);
      }
    });
    if (!r || !r.ok || !r.b64) throw new Error('não consegui baixar a referência (' + ((r && r.why) || 'sem resposta') + ')');
    const bin = atob(r.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const name = (String(url).split('/').pop() || fallbackName).replace(/[^\w.-]/g, '_');
    return new File([bytes], name, { type: r.mime || (/\.mp4$/i.test(name) ? 'video/mp4' : 'image/png') });
  }

  // Envia o arquivo pela biblioteca do menu "+" (mesmo caminho do teste de envio).
  async function uploadToLibrary(file) {
    const plus = $$('button').find((b) => vis(b) && /add ingredients/i.test(b.getAttribute('aria-label') || ''));
    if (!plus) return false;
    realClick(plus);
    if (!(await until(() => $('flow-add-menu-popover-content'), 6000, 250))) return false;
    const input = await until(() => $('input[type=file]'), 3000, 250);
    if (!input) return false;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(4000);
    for (let i = 0; i < 3 && $('flow-add-menu-popover-content'); i++) {
      pressEscape();
      await sleep(400);
    }
    return true;
  }

  // Anexa um arquivo como ingrediente: soltar na caixa, colar, ou enviar e escolher na biblioteca.
  async function attachFile(file) {
    if (await attachByDrop(file)) return 'soltar';
    if (await attachByPaste(file)) return 'colar';
    if ((await uploadToLibrary(file)) && (await attachFromLibrary(file.name.replace(/\.[a-z0-9]+$/i, '')))) return 'biblioteca';
    await clearDragOverlay();
    return '';
  }

  // Referencias do job: 1 imagem (folha) e 1 video (take anterior). Sem sucesso, segue sem referencia (com aviso).
  async function attachJobReferences(job) {
    const p = job.params || {};
    const refs = [];
    if (p.refImageUrl) refs.push(['imagem de referência (folha)', p.refImageUrl, 'referencia.png']);
    if (p.refVideoUrl) refs.push(['vídeo do take anterior', p.refVideoUrl, 'take-anterior.mp4']);
    for (const [label, url, name] of refs) {
      try {
        const file = await fetchRefFile(url, name);
        const t0 = Date.now();
        const how = await attachFile(file);
        dtLog(how ? 'Referência anexada: ' + label + ' (' + how + ').' : 'Não consegui anexar a ' + label + '; o take segue sem ela.', { bytes: file.size, chips: ingredientChips(), segundos: Math.round((Date.now() - t0) / 1000) }, how ? 'success' : 'warn');
      } catch (e) {
        dtLog('Referência não anexada (' + label + '): ' + String((e && e.message) || e).slice(0, 160), null, 'warn');
      }
    }
  }

  // ---------- anexar uma imagem como referencia (ingrediente) na caixa de prompt ----------

  const promptBox = () => $('flow-base-prompt-box') || ($(S.editor) && ancestor($(S.editor), 4));

  // Remove todos os chips de ingrediente da caixa de prompt (clique no X de cada um).
  async function clearIngredients() {
    for (let i = 0; i < 6 && ingredientChips() > 0; i++) {
      const chip = $('flow-ingredient-chip button.chip-container, flow-ingredient-chip');
      if (!chip) break;
      realClick(chip);
      await sleep(300);
      const x = $$('flow-ingredient-chip mat-icon, flow-ingredient-chip button').find((e) => /cancel|close|remove|delete/i.test(txt(e) + ' ' + (e.getAttribute('aria-label') || '')));
      if (x) realClick(x);
      await sleep(500);
    }
    return ingredientChips() === 0;
  }

  // Caminho 1: soltar o arquivo sobre a caixa de prompt (como arrastar do computador).
  // Area "Drop media / + Add reference" que o Flow abre sobre a pagina quando algo e arrastado para ela.
  const dropZoneEl = () => {
    const cand = $$('div, span, button, p, flow-media-upload').filter((e) => {
      const t = txt(e);
      // o "+" do botao pode vir como texto de icone ("add Add reference"): so o fim do texto importa
      return t.length > 0 && t.length < 40 && /(^|\s)add reference$|^drop media$/i.test(t) && vis(e);
    });
    // Prefere o container clicavel/maior da area "Add reference" (nao o texto solto).
    return cand.find((e) => /add reference/i.test(txt(e)) && (e.closest('button, [role=button], [class*=drop], [class*=upload]') || e)) || cand[0] || null;
  };

  // Desfaz um arrasto que ficou pela metade: sem isso a area de soltar fica por cima e esconde a caixa de prompt.
  async function clearDragOverlay() {
    for (let i = 0; i < 3 && dropZoneEl(); i++) {
      const dt = new DataTransfer();
      for (const el of [dropZoneEl(), document.body, document.documentElement].filter(Boolean)) {
        for (const type of ['dragleave', 'dragend']) el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      }
      pressEscape();
      await sleep(500);
    }
    return !dropZoneEl();
  }

  // Caminho 1: arrastar o arquivo para a pagina e SOLTAR na area "Add reference" que o Flow abre (alvo certo do drop).
  async function attachByDrop(file) {
    const box = promptBox();
    const editor = $(S.editor) || box;
    if (!editor) return false;
    const before = ingredientChips();
    const dt = new DataTransfer();
    dt.items.add(file);
    const fire = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    // 1) o arrasto entra na pagina: o Flow mostra a area de soltar
    for (const type of ['dragenter', 'dragover']) {
      fire(document.body, type);
      await sleep(150);
    }
    const zone = await until(() => dropZoneEl(), 2500, 150);
    // 2) solta onde o Flow espera (a area aberta); sem ela, na caixa de prompt
    const target = zone || editor;
    dtLog('Anexar soltando o arquivo.', { areaDeSoltar: zone ? snapClean(txt(zone)).slice(0, 30) : null });
    for (const type of ['dragenter', 'dragover', 'drop']) {
      fire(target, type);
      await sleep(150);
    }
    const ok = !!(await until(() => ingredientChips() > before, 45000, 500)); // o Flow processa a imagem antes de mostrar o chip
    // 3) sempre deixa a pagina limpa (a area de soltar nao pode ficar por cima da caixa de prompt)
    const clean = await clearDragOverlay();
    if (!clean) dtLog('A área de soltar do Flow ficou aberta.', null, 'warn');
    return ok;
  }

  // Caminho 2: colar a imagem na caixa de prompt.
  async function attachByPaste(file) {
    const ed = $(S.editor);
    if (!ed) return false;
    const before = ingredientChips();
    ed.focus();
    const dt = new DataTransfer();
    dt.items.add(file);
    ed.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    return !!(await until(() => ingredientChips() > before, 15000, 500));
  }

  // Caminho 3: escolher pelo nome na biblioteca do menu "+" (imagem ja enviada antes).
  async function attachFromLibrary(name) {
    const before = ingredientChips();
    const plus = $$('button').find((b) => vis(b) && /add ingredients/i.test(b.getAttribute('aria-label') || ''));
    if (!plus) return false;
    realClick(plus);
    const menu = await until(() => $('flow-add-menu-popover-content'), 6000, 250);
    if (!menu) return false;
    const search = $('input.search-input, input[aria-label="Search assets"]', menu);
    if (search) {
      search.focus();
      search.value = name;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'e' }));
      await sleep(1500);
    }
    const list = $('flow-add-menu-asset-list', menu);
    if (list) dtSnapshot('anexar: lista da biblioteca', list, 'info');
    // Item da lista: algo clicavel com a imagem ou o nome do arquivo.
    const items = $$('[role=option], .asset-item, flow-add-menu-asset-item, cdk-virtual-scroll-viewport [class*=asset]', menu).filter((e) => vis(e));
    const item = items.find((e) => new RegExp(name.replace(/[.*+?^()[\]{}|]/g, ''), 'i').test(txt(e) + ' ' + ($('img', e)?.alt || ''))) || items[0];
    dtLog('Anexar pela biblioteca: itens na lista.', { itens: items.length, escolhido: item ? snapClean(txt(item).slice(0, 60)) : null });
    if (!item) return false;
    realClick(item);
    await sleep(1200);
    const pane = $('flow-add-menu-detail-pane', menu);
    if (pane) dtSnapshot('anexar: painel de detalhe', pane, 'info');
    const addBtn = $$('button', pane || menu).find((b) => vis(b) && /^(add|adicionar|use|usar|insert|inserir|add to prompt|select|selecionar)/i.test((txt(b) || b.getAttribute('aria-label') || '').replace(/^[a-z_]+\s+/, '')));
    dtLog('Anexar pela biblioteca: botão de adicionar.', { achado: !!addBtn, texto: addBtn ? txt(addBtn).slice(0, 40) : null });
    if (addBtn) realClick(addBtn);
    const ok = !!(await until(() => ingredientChips() > before, 6000, 400));
    for (let i = 0; i < 3 && $('flow-add-menu-popover-content'); i++) {
      pressEscape();
      await sleep(400);
    }
    return ok;
  }

  async function attachTest() {
    dtLog('Teste de anexar: início.', { chipsAntes: ingredientChips() });
    await clearIngredients();
    const file = await testPng();
    const tries = [
      ['soltar na caixa de prompt', () => attachByDrop(file)],
      ['colar na caixa de prompt', () => attachByPaste(file)],
      ['escolher na biblioteca do menu "+"', () => attachFromLibrary('darktube-teste-referencia')],
    ];
    const worked = [];
    for (const [label, fn] of tries) {
      let ok = false;
      try {
        ok = await fn();
      } catch (e) {
        dtLog('Teste de anexar: erro em "' + label + '".', { erro: String((e && e.message) || e).slice(0, 160) }, 'warn');
      }
      dtLog('Teste de anexar: ' + label + ' -> ' + (ok ? 'FUNCIONOU' : 'não funcionou') + '.', { chips: ingredientChips() }, ok ? 'success' : 'info');
      if (ok) {
        worked.push(label);
        const ed = $(S.editor);
        if (ed) dtSnapshot('anexar: caixa de prompt com a referência', ancestor(ed, 3), 'info');
        await clearIngredients();
      }
      await sleep(800);
    }
    const result = worked.length ? 'funcionou por: ' + worked.join(', ') : 'nenhum caminho anexou a imagem';
    dtLog('Teste de anexar: ' + result + '.', { chipsNoFim: ingredientChips() }, worked.length ? 'success' : 'warn');
    return result;
  }

  // ---------- mapeamento de imagens de referencia (Ingredients / Characters do Flow) ----------

  // Campos de envio de arquivo da pagina: e por eles que a extensao vai anexar as folhas de personagem.
  function fileInputsInfo() {
    return $$('input[type=file]').map((i) => ({
      accept: i.getAttribute('accept') || '',
      multiple: i.multiple,
      visivel: vis(i),
      dentro: [1, 2, 3, 4]
        .map((n) => ancestor(i, n))
        .filter(Boolean)
        .map((e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter((c) => c && !/^ng-|^_ng|^cdk-/.test(c)).slice(0, 2).join('.') : ''))
        .join(' < '),
    }));
  }

  // Itens do menu lateral do Flow (All media, Videos, Characters, Scenes...), com o caminho do link.
  function sideNavInfo() {
    return $$('a[href], nav button, [role=navigation] button, [role=link]')
      .filter((e) => vis(e) && txt(e).length > 1 && txt(e).length < 40)
      .slice(0, 30)
      .map((e) => {
        const href = e.getAttribute('href') || '';
        return snapClean(txt(e).replace(/^[a-z]+(?:_[a-z0-9]+)*\s+/, '')) + (href ? ' -> ' + snapClean(href.replace(/[0-9a-f-]{20,}/gi, ':id')) : '');
      });
  }

  // Retrato das partes que importam para referencias: menu/janela aberta pelo usuario, campos de arquivo,
  // menu lateral, conteudo da pagina quando nao e a do projeto e o menu "+ Add ingredients" (aberto e fechado sozinho).
  async function snapshotReferences(hasEditor) {
    let parts = 0;
    const overlay = $('.cdk-overlay-container');
    if (overlay && txt(overlay)) parts += dtSnapshot('menu ou janela aberta', overlay);
    if (!hasEditor) {
      const main = $('main') || $('[role=main]') || viewerStage()?.parentElement || null;
      if (main) parts += dtSnapshot('conteúdo da página', ancestor(main, 1));
    }
    dtLog('Referências: campos de arquivo e menu lateral.', { arquivos: fileInputsInfo(), menu: sideNavInfo() });
    parts += 1;
    const addBtn = hasEditor && !running ? $$('button').find((b) => vis(b) && /add ingredients|ingredient|adicionar/i.test(b.getAttribute('aria-label') || '')) : null;
    if (addBtn && !(overlay && txt(overlay))) {
      realClick(addBtn);
      await sleep(900);
      const menu = $('.cdk-overlay-container');
      if (menu && txt(menu)) parts += dtSnapshot('menu + Add ingredients', menu);
      else dtLog('O botão "Add ingredients" não abriu um menu.', null, 'warn');
      dtLog('Campos de arquivo com o menu aberto.', { arquivos: fileInputsInfo() });
      pressEscape();
      await sleep(300);
    }
    return parts;
  }

  // Captura do video: abre o visualizador de cada candidato (do mais novo para o mais antigo),
  // confere o prompt, le o <video> e fecha pelo botao Done.
  async function captureVideo(job, candidates, knownOldUrls) {
    const list = candidates.slice(0, 4);
    let snappedGallery = false;
    let snappedViewer = false;
    let snappedMenu = false;
    for (let n = 0; n < list.length; n++) {
      const tile = list[n];
      dtLog(`Captura do vídeo: candidato ${n + 1}/${list.length}.`, describeTile(tile));
      try {
        tile.scrollIntoView({ block: 'center', behavior: 'instant' });
      } catch (_) {}
      await sleep(400);

      // Se o proprio tile ja traz o <video> com fonte, usa direto.
      const direct = getVideoSourceFromTile(tile, knownOldUrls);
      if (direct) {
        dtLog('Vídeo encontrado dentro do próprio tile.', { url: shortUrl(direct) });
        return fetchMedia('video', direct);
      }

      const thumbBase = tileThumbBase(tile);
      // Primeiro tenta o arquivo direto, sem abrir a tela de edicao: so URLs ligadas ao poster DESTE tile
      // (a midia solta da timeline pode ser de outro take, entao fica de fora).
      const pre = videoUrlCandidates(thumbBase, Infinity);
      if (pre.length) {
        dtLog('Testando o arquivo direto, sem abrir o visualizador.', { candidatos: pre.map((c) => ({ de: c.from, url: snapClean(snapUrl(c.url)) })) });
        for (const c of pre.slice(0, 6)) {
          const r = await probeVideoUrl(c.url);
          dtLog(r.blob ? 'Mídia de vídeo lida (direto).' : 'URL descartada (direto).', { de: c.from, url: snapClean(snapUrl(c.url)), motivo: r.why, bytes: r.blob ? r.blob.size : undefined }, r.blob ? 'success' : 'info');
          if (r.blob) return { ok: true, kind: 'video', mime: r.blob.type || 'video/mp4', b64: await blobToB64(r.blob) };
        }
      }

      const clickedAt = performance.now();
      realClick($('img', tile) || tile);
      // A rota de edicao pode demorar a abrir: espera ate 12 s e repete o clique uma vez se nada mudou em 6 s.
      let opened = await until(() => viewerOpen(), 6000, 300);
      if (!opened) {
        dtLog('O clique não abriu o visualizador; clicando de novo.', { rota: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id') }, 'warn');
        realClick($('img', tile) || tile);
        opened = await until(() => viewerOpen(), 6000, 300);
      }
      let v = opened ? await until(() => viewerVideoEl(), 3000, 300) : null;
      if (!v && opened) {
        // O Scene Builder desenha o video num <canvas> e so mostra o poster ate o play: tenta o play.
        tryPlayViewer();
        v = await until(() => viewerVideoEl(), 4000, 300);
      }
      let src = v ? getVideoSrc(v) : '';
      if (!src && opened) {
        // Sem <video>: procura o arquivo pela URL do tile (midia que a propria pagina pediu) e confere os bytes.
        const cands = videoUrlCandidates(thumbBase, clickedAt - 500);
        dtLog('Sem <video>; testando URLs de mídia.', { candidatos: cands.map((c) => ({ de: c.from, url: snapClean(snapUrl(c.url)), sufixo: snapClean(c.url.slice(thumbBase ? thumbBase.length : 0, (thumbBase ? thumbBase.length : 0) + 24)) })) });
        const body0 = pageTextWithoutInputs();
        const pm0 = promptMatches(job.prompt, body0);
        if (pm0.known && !pm0.match) {
          dtLog('Este visualizador é de outro take; tentando o próximo candidato.', { visto: pm0.seg }, 'warn');
          await closeViewer();
          continue;
        }
        for (const c of cands.slice(0, 8)) {
          const r = await probeVideoUrl(c.url);
          dtLog(r.blob ? 'Mídia de vídeo lida.' : 'URL descartada.', { de: c.from, url: snapClean(snapUrl(c.url)), motivo: r.why, bytes: r.blob ? r.blob.size : undefined }, r.blob ? 'success' : 'info');
          if (r.blob) {
            await closeViewer();
            return { ok: true, kind: 'video', mime: r.blob.type || 'video/mp4', b64: await blobToB64(r.blob) };
          }
        }
        if (!snappedMenu) {
          snappedMenu = true;
          await snapshotDownloadMenu();
        }
      }
      if (!src) {
        dtLog('O visualizador não abriu ou não trouxe <video>.', { tile: describeTile(tile), rota: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id') }, 'warn');
        if (!snappedGallery) {
          snappedGallery = true;
          snapshotFailure(tile);
        }
        await closeViewer();
        continue;
      }
      await sleep(600);
      const body = pageTextWithoutInputs();
      const pm = promptMatches(job.prompt, body);
      dtLog('Visualizador aberto.', { src: shortUrl(src), prompt: pm, texto: body.slice(0, 160) });
      if (pm.known && !pm.match) {
        dtLog('Este visualizador é de outro take; tentando o próximo candidato.', { visto: pm.seg }, 'warn');
        await closeViewer();
        continue;
      }
      if (!pm.known) {
        dtLog('Não consegui conferir o prompt no visualizador; aceitando o candidato mais novo.', { prompt: pm }, 'warn');
        if (!snappedViewer) {
          snappedViewer = true;
          dtSnapshot('visualizador (prompt não localizado)', ancestor(v, 6), 'warn');
        }
      }
      try {
        const out = await fetchMedia('video', src);
        await closeViewer();
        return out;
      } catch (e) {
        await closeViewer();
        throw e;
      }
    }
    if (!snappedGallery && list[0]) snapshotFailure(list[0]);
    dtLog('Captura falhou: nenhum candidato rendeu um vídeo.', { candidatos: list.length, html: String((list[0] && list[0].outerHTML) || '').slice(0, 1200) }, 'error');
    throw err('capture_failed', 'Não encontrei o arquivo gerado na página.');
  }

  // Pergunta ao segundo plano e nunca fica esperando para sempre: sem resposta em "ms", segue com null.
  function askBg(msg, ms = 8000) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (!done) {
          done = true;
          resolve(v);
        }
      };
      setTimeout(() => finish(null), ms);
      try {
        chrome.runtime.sendMessage(msg, (r) => {
          void chrome.runtime.lastError;
          finish(r || null);
        });
      } catch (_) {
        finish(null);
      }
    });
  }

  // Traz a aba do Flow para a frente se estiver escondida e espera ela ficar visivel (ate 4 s).
  async function ensureVisible(forcar) {
    const resp = await askBg({ type: 'FLOW_ENSURE_VISIBLE', forcar: !!forcar }, 6000);
    await until(() => document.visibilityState === 'visible', 4000, 250);
    return resp ? { ...resp, forcar: !!forcar } : { ok: false, forcar: !!forcar };
  }

  async function restoreVisible() {
    await askBg({ type: 'FLOW_RESTORE_VISIBLE' }, 6000);
  }

  // Clique real: o segundo plano liga o depurador do navegador na aba por um instante e envia um clique de mouse
  // de verdade (evento confiavel), que o Flow nao distingue do clique de uma pessoa. "ativar" deixa a aba do Flow
  // como a ativa da propria janela durante o clique (e devolve a aba anterior depois).
  async function trustedClick(el, ativar) {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const resp = await askBg({ type: 'FLOW_TRUSTED_CLICK', x, y, ativar: !!ativar }, 12000);
    dtLog('Clique real (depurador).', { ...(resp || { ok: false, why: 'sem resposta do segundo plano' }), x, y, ativar: !!ativar });
    return resp;
  }

  // Tenta iniciar a geracao por varios caminhos, do mais simples ao mais forte, e para no primeiro que funcionar
  // (cada clique que "pega" cria uma geracao, entao nunca continua depois de um sucesso). Devolve o nome do caminho ou ''.
  async function clickGenerate(btn, prevImageIds, descBtn, kind) {
    const tilesBefore = $$(tileSel()).length;
    const started = () =>
      $$(tileSel()).length > tilesBefore ||
      $$(S.pendingTile).some((t) => !t.closest('[data-dt-old]')) ||
      $$(S.imageTileImg).some((i) => !i.closest('[data-dt-seen]') && !prevImageIds.has(i.getAttribute('data-media-id'))) ||
      !txt($(S.editor) || document.createElement('i'));
    const pressAndClick = (target) => {
      if (!target) return;
      try {
        if (typeof target.focus === 'function') target.focus();
        const r = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
        const clientX = r.left + r.width / 2;
        const clientY = r.top + r.height / 2;
        const mo = { bubbles: true, cancelable: true, view: window, clientX, clientY, button: 0, buttons: 1 };
        const po = { ...mo, pointerType: 'mouse', isPrimary: true };
        target.dispatchEvent(new PointerEvent('pointerdown', po));
        target.dispatchEvent(new MouseEvent('mousedown', mo));
        target.dispatchEvent(new PointerEvent('pointerup', { ...po, buttons: 0 }));
        target.dispatchEvent(new MouseEvent('mouseup', { ...mo, buttons: 0 }));
      } catch (_) {}
      if (typeof target.click === 'function') target.click();
    };
    const simple = [
      'clique',
      () => {
        const b = generateBtnEl() || btn;
        pressAndClick(b);
      },
    ];
    const real = [
      'clique real (depurador)',
      async () => {
        const b = generateBtnEl() || btn;
        if (b) await trustedClick(b, false);
      },
    ];
    const attempts = [
      // Imagem: o clique feito por codigo e ignorado pelo Flow, entao vai direto ao clique real (sem esperar o simples).
      ...(kind === 'image' ? [real, simple] : [simple, real]),
      ['clique no mundo da página', async () => {
        const b = generateBtnEl() || btn;
        if (!b) return;
        b.setAttribute('data-dt-gen', '1');
        const resp = await askBg({ type: 'FLOW_MAIN_CLICK', selector: '[data-dt-gen="1"]' }, 8000);
        b.removeAttribute('data-dt-gen');
        dtLog('Clique no mundo da página.', resp);
      }],
      ['clique real com a aba ativa', async () => {
        const b = generateBtnEl() || btn;
        if (b) await trustedClick(b, true);
      }],
      ['clique completo', () => {
        const b = generateBtnEl() || btn;
        const icon = b && $('mat-icon, svg, span, i', b);
        const host = b && b.closest('flow-generate-icon-button');
        if (icon) realClick(icon);
        realClick(b);
        if (b && typeof b.click === 'function') b.click();
        if (host && host !== b) {
          realClick(host);
          if (typeof host.click === 'function') host.click();
        }
        const form = b && b.closest('form');
        if (form && typeof form.requestSubmit === 'function') {
          try { form.requestSubmit(); } catch (_) {}
        }
      }],
      ['Enter', () => {
        const ed = $(S.editor);
        if (ed) {
          ed.focus();
          try {
            const sel = window.getSelection && window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.selectNodeContents(ed);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch (_) {}
          for (const type of ['keydown', 'keypress', 'keyup']) {
            ed.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          }
        }
      }],
    ];
    let how = '';
    for (const [label, fire] of attempts) {
      await fire();
      if (await until(started, label === 'clique' ? 10000 : 6000, 400)) {
        how = label;
        break;
      }
      const box = promptBox();
      dtLog(
        `A geração não começou com ${label}; tentando de outro jeito.`,
        {
          btn: descBtn(generateBtnEl() || btn),
          noCentro: (() => {
            // O que um clique de usuario atingiria no centro do botao (pode ser outro elemento por cima).
            const b = generateBtnEl() || btn;
            const r = b && b.getBoundingClientRect();
            const el = r && document.elementFromPoint ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
            return el ? { ...descBtn(el), igualAoBotao: el === b, dentroDoBotao: b.contains(el) } : null;
          })(),
          botoesCaixa: box ? $$('button, [role=button]', box).filter(vis).map(descBtn) : [],
          foco: { aba: document.hasFocus ? document.hasFocus() : null, visivel: document.visibilityState },
        },
        'warn'
      );
    }
    return how;
  }

  // Laboratorio: com o prompt ja escrito na caixa do Flow, tenta iniciar a geracao pelos caminhos, um de cada vez,
  // e registra qual funcionou. Para no primeiro (uma geracao so; no modo imagem o Nano Banana nao gasta credito).
  async function clickLab() {
    const ed = $(S.editor);
    if (!ed || !txt(ed)) throw new Error('Escreva um prompt curto na caixa do Flow antes (ex.: "a red apple on a table").');
    const btn = generateBtnEl();
    if (!btn) throw new Error('Não achei o botão de gerar.');
    const summary = txt(settingsBtnEl() || $(S.settingsBtn)).slice(0, 60);
    dtLog('Laboratório de clique: início.', { resumoDoBotao: summary, aba: { foco: document.hasFocus ? document.hasFocus() : null, visivel: document.visibilityState } });
    const prevImageIds = new Set($$('img[data-media-id]').map((i) => i.getAttribute('data-media-id')));
    const descBtn = (b) => (b ? { tag: b.tagName.toLowerCase(), aria: b.getAttribute('aria-label'), disabled: !!b.disabled, vis: vis(b) } : null);
    const how = await clickGenerate(btn, prevImageIds, descBtn);
    const result = how ? 'funcionou por: ' + how : 'nenhum caminho iniciou a geração';
    dtLog('Laboratório de clique: ' + result + '.', { aba: { foco: document.hasFocus ? document.hasFocus() : null, visivel: document.visibilityState } }, how ? 'success' : 'warn');
    return result;
  }

  async function generate(job) {
    const count = Math.min(Math.max(Number((job.params || {}).count) || 1, 1), 4);
    dtLog(`Iniciando geração (${job.kind}).`, { params: job.params, count, prompt: String(job.prompt || '').slice(0, 300) });
    await closeAccountDrawer();
    await closeLayers();
    await ensureDirectMode();
    await writePrompt(job.prompt);
    dtLog('Prompt escrito na caixa do Flow.');
    await attachJobReferences(job);

    // Registra os elementos, URLs e digitais dos tiles que JA EXISTIAM antes deste take
    const prevTiles = new Set($$(S.videoTile));
    const prevFps = new Set($$(S.videoTile).map(tileFp));
    const prevImageIds = new Set($$('img[data-media-id]').map((i) => i.getAttribute('data-media-id')));
    const prevImageSrcs = new Set($$('img').map((i) => (i.currentSrc || i.src || '').split('?')[0]).filter(Boolean));
    const knownOldUrls = new Set();
    $$('video').forEach((v) => {
      const s = getVideoSrc(v);
      if (s) knownOldUrls.add(s);
    });
    $$('flow-video-tile img, flow-image-tile img').forEach((img) => {
      const s = img.currentSrc || img.src;
      if (s && !s.startsWith('data:')) knownOldUrls.add(s);
    });
    $$(tileSel()).forEach((t) => {
      t.setAttribute('data-dt-old', '1');
      t.setAttribute('data-dt-seen', '1');
      seenTileKeys.add(tileKey(t));
    });
    const hint = costHint();
    dtLog('Tiles antes de gerar.', { videoTiles: $$(S.videoTile).length, imageTiles: $$(S.imageTile).length, pendingTiles: $$(S.pendingTile).length, knownUrls: knownOldUrls.size });

    const descBtn = (b) => {
      if (!b) return null;
      const r = b.getBoundingClientRect ? b.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const ic = $('mat-icon, i, svg', b);
      return {
        tag: b.tagName.toLowerCase(),
        type: b.getAttribute('type'),
        cls: String(b.className || '').slice(0, 70),
        aria: b.getAttribute('aria-label'),
        disabled: !!b.disabled || b.getAttribute('aria-disabled') === 'true',
        vis: vis(b),
        icon: ic ? txt(ic).slice(0, 25) || ic.tagName.toLowerCase() : null,
        text: txt(b).slice(0, 30),
        host: b.parentElement ? b.parentElement.tagName.toLowerCase() : null,
        rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      };
    };

    let btn = generateBtnEl();
    if (!btn) throw err('generate_missing', 'Não achei o botão de gerar.');
    if (!(await until(() => {
      const b = generateBtnEl() || btn;
      return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
    }, job.params && (job.params.refImageUrl || job.params.refVideoUrl) ? 60000 : 10000))) {
      dtLog('Botão de gerar permaneceu desabilitado.', { btn: descBtn(generateBtnEl() || btn), todos: $$(S.generate).map(descBtn) }, 'warn');
      throw err('generate_disabled', 'O botão de gerar ficou desabilitado.');
    }
    btn = generateBtnEl() || btn;
    dtLog('Botão de gerar localizado.', { escolhido: descBtn(btn), seletoresGenerate: $$(S.generate).map(descBtn) });
    await human(500, 1500);
    // Confirma que a geracao comecou (tile novo, pendente, imagem nova ou a caixa de prompt esvaziou).
    // No modo imagem o clique simples as vezes nao vale: tenta de novo com clique completo (incluindo icone/host) e depois com Enter.
    // O Flow so aceita a geracao com a aba visivel (as falhas "failed to generate" aconteceram com a aba escondida).
    startSilentAudioKeepAlive();
    const vis0 = document.visibilityState;
    let visInfo = null;
    if (vis0 !== 'visible') {
      visInfo = await ensureVisible(false);
      if (document.visibilityState !== 'visible') visInfo = await ensureVisible(true);
    }
    dtLog('Visibilidade da aba na hora de gerar.', { antes: vis0, depois: document.visibilityState, foco: document.hasFocus ? document.hasFocus() : null, ajuste: visInfo });
    try {
      const how = await clickGenerate(btn, prevImageIds, descBtn, job.kind);
      if (!how) throw err('generate_disabled', 'O Flow não começou a gerar depois de clicar em gerar.');
      dtLog('Botão de gerar clicado.', { creditsHint: hint, como: how });
      await sleep(2000);

      const limit = job.kind === 'video' ? 12 * 60 * 1000 : 4 * 60 * 1000;
      const t0 = Date.now();
      let lastShape = '';
      const readySince = new Map();
      for (;;) {
        await sleep(2500);
        const prob = classifyProblem();
        if (prob) throw err(prob.code, prob.msg);
        if (job.kind === 'image') {
          const fresh = unseen($$(tileSel()));
          const bad = fresh.find((t) => !t.matches(S.pendingTile) && RX.failure.test(txt(t)));
          if (bad) {
            const m = txt(bad).replace(/^warning\s*/i, '').slice(0, 180);
            dtLog('O Flow recusou esta imagem.', { code: failCode(m), motivo: m }, 'error');
            throw err(failCode(m), 'O Flow recusou a geração: ' + m);
          }
          const ready = $$(S.imageTileImg).filter(
            (i) => !i.closest('[data-dt-seen]') && !prevImageIds.has(i.getAttribute('data-media-id')) && !prevImageSrcs.has((i.currentSrc || i.src || '').split('?')[0])
          );
          if (ready.length >= count) dtLog('Imagem gerada detectada.', { prontas: ready.length, mediaId: ready[0].getAttribute('data-media-id') }, 'success');
          if (ready.length >= count) return { ...(await capture('image', ready[0], knownOldUrls)), costHint: hint };
        } else {
          const currentTiles = $$(S.videoTile);
          // O Google Flow insere novos videos no INICIO da galeria (topo/esquerda).
          // Filtra somente tiles que NAO existiam antes deste clique:
          const newTiles = currentTiles.filter((t) => !t.hasAttribute('data-dt-old') && !prevTiles.has(t) && !prevFps.has(tileFp(t)));
          const states = newTiles.map((t) => ({ t, s: tileState(t) }));
          const bad = states.find((x) => x.s.failed || (!x.s.generating && RX.failure.test(txt(x.t))));
          if (bad) {
            const msg = txt(bad.t).replace(/^warning\s*/i, '').slice(0, 220);
            const code = failCode(msg);
            dtLog('O Flow recusou este take.', { code, motivo: msg }, 'error');
            throw err(code, 'O Flow recusou a geração: ' + msg);
          }

          const now = Date.now();
          for (const x of states) {
            if (!x.s.generating && (x.s.badge || x.s.hasImg || x.s.hasVideo)) {
              if (!readySince.has(x.t)) readySince.set(x.t, now);
            } else readySince.delete(x.t);
          }
          const pending = states.filter((x) => x.s.generating);
          // Pronto = sem "%"/spinner, com o selo de resolucao (ou imagem) e estavel por alguns segundos.
          const stable = (x) => readySince.has(x.t) && now - readySince.get(x.t) >= 4000 && (x.s.badge || x.s.hasVideo || now - readySince.get(x.t) >= 15000);
          const readyTiles = states.filter(stable).map((x) => x.t);
          // Um tile que acabou de ficar pronto ainda esta "esquentando": espera, para nao capturar so os outros.
          const warming = states.filter((x) => readySince.has(x.t) && !stable(x));
          const shape = `${currentTiles.length}/${newTiles.length}/${pending.length}/${readyTiles.length}`;
          if (shape !== lastShape) {
            lastShape = shape;
            dtLog('Tiles depois de gerar.', { total: currentTiles.length, novos: newTiles.length, gerando: pending.length, prontos: readyTiles.length, estados: states.slice(0, 4).map((x) => x.s), segundos: Math.round((now - t0) / 1000) });
          }
          if (readyTiles.length >= count && pending.length === 0 && warming.length === 0) {
            dtLog('Tile gerado detectado.', describeTile(readyTiles[0]), 'success');
            const out = await captureVideo(job, readyTiles, knownOldUrls);
            for (const t of readyTiles) {
              t.setAttribute('data-dt-seen', '1');
              t.setAttribute('data-dt-old', '1');
              seenTileKeys.add(tileKey(t));
              prevTiles.add(t);
              prevFps.add(tileFp(t));
            }
            await closeLayers();
            return { ...out, costHint: hint };
          }
        }
        if (Date.now() - t0 > limit) throw err('timeout', 'O Flow não terminou a geração no tempo esperado.');
      }
    } finally {
      if (visInfo) await restoreVisible();
    }
  }

  async function runJob(job) {
    curJob = job;
    try {
      dtLog('Job iniciado na aba do Flow.', { kind: job.kind, take: job.take_index, params: job.params });
      await closeViewer(); // um visualizador esquecido aberto esconderia a galeria e a caixa de prompt
      // Menu "+" (biblioteca de midia) ou outro popover aberto pelo usuario cobre o painel de ajustes.
      for (let i = 0; i < 4 && $('flow-add-menu-popover-content, .cdk-overlay-pane .flow-menu-panel'); i++) {
        if (i === 0) dtLog('Fechando o menu "+" (biblioteca de mídia) que estava aberto.');
        if (i < 2) pressEscape();
        else {
          // Escape nao fechou: clica fora (fundo do overlay) ou no proprio botao "+" para alternar.
          const backdrop = $('.cdk-overlay-backdrop');
          const plus = $$('button').find((b) => /add ingredients/i.test(b.getAttribute('aria-label') || ''));
          realClick(backdrop || plus || document.body);
        }
        await sleep(400);
      }
      await closeLayers();
      if (ingredientChips() > 0) {
        dtLog('Removendo referências que sobraram do take anterior.', { chips: ingredientChips() });
        await clearIngredients();
      }
      const prob = classifyProblem();
      if (prob) throw err(prob.code, prob.msg);
      if (!$(S.editor)) throw err('no_project', 'Abra um projeto do Flow (a caixa de prompt não apareceu).');
      await configure(job);
      dtLog('Configurações aplicadas.', { summary: txt(settingsBtnEl() || $(S.settingsBtn)).slice(0, 80) });
      const out = await generate(job);
      dtLog('Geração e captura concluídas.', null, 'success');
      return out;
    } catch (e) {
      dtLog('Job falhou: ' + String((e && e.message) || e).slice(0, 300), { code: (e && e.code) || 'error' }, 'error');
      return { ok: false, error: String((e && e.message) || e).slice(0, 300), code: (e && e.code) || 'error' };
    }
  }

  // ---------- ensaio: so le, nunca gera ----------

  async function listModels(panel) {
    const btn = $$(S.modelBtn, panel).find((b) => /nano banana|veo|omni|imagen/i.test(txt(b))) || $(S.modelBtn, panel);
    if (!btn) return { models: [], costs: [] };
    btn.click();
    await human(400, 800);
    const items = $$(S.menuItem).filter(vis).map(txt);
    pressEscape();
    await sleep(300);
    return {
      // Tira o nome do icone colado ao rotulo (ex.: "volume_up Omni 1.1 Flash") e o custo no fim.
      models: items
        .map((t) => t.replace(/\d{1,4}\s*(credits|créditos|cr)\b.*$/i, '').replace(/^(?:[a-z]+(?:_[a-z0-9]+)+\s+)+/, '').trim())
        .filter(Boolean)
        .slice(0, 12),
      costs: items.filter((t) => /\d\s*(credits|créditos|cr)\b/i.test(t)).map((t) => t.slice(0, 80)).slice(0, 12),
    };
  }

  async function scan() {
    const caps = {
      scannedAt: new Date().toISOString(),
      path: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id'),
      selectors: {
        editor: !!$(S.editor),
        generate: !!(generateBtnEl() || $(S.generate)),
        settingsBtn: !!(settingsBtnEl() || $(S.settingsBtn)),
        agentToggle: !!$(S.agentToggle),
        imageTiles: $$(S.imageTile).length,
        videoTiles: $$(S.videoTile).length,
        pendingTiles: $$(S.pendingTile).length,
      },
      imageModels: [], videoModels: [], formats: [], quantities: [], durations: [], resolutions: [], costs: [],
      credits: null, plan: null,
    };
    if (!caps.selectors.editor || (!caps.selectors.settingsBtn && !settingsBtnEl())) {
      caps.note = 'Abra um projeto do Flow para o ensaio ler as opções.';
      return caps;
    }
    const panel = await openSettings();
    for (const kind of ['image', 'video']) {
      caps.diag = caps.diag || {};
      try {
        await setMode(panel, kind);
      } catch (e) {
        caps.diag[kind] = {
          modeError: String((e && e.message) || e).slice(0, 120),
          panel: $$('[role], button', panel).map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('role') || ''}]:${(el.getAttribute('aria-label') || txt(el)).slice(0, 24)}`).slice(0, 30),
        };
        continue;
      }
      await human(400, 800);
      const labels = radios(panel).map(rlabel);
      caps.diag[kind] = { radios: labels.slice(0, 16), modelBtns: $$(S.modelBtn, panel).map((b) => txt(b).slice(0, 40)).slice(0, 6) };
      const uniq = (a) => Array.from(new Set(a));
      caps.formats = uniq(caps.formats.concat(labels.filter((l) => /^\d+:\d+$/.test(l))));
      caps.quantities = uniq(caps.quantities.concat(labels.filter((l) => /^x\d$/.test(l))));
      if (kind === 'video') {
        caps.durations = uniq(caps.durations.concat(labels.filter((l) => /^\d+s$/.test(l))));
        caps.resolutions = uniq(caps.resolutions.concat(labels.filter((l) => /^\d{3,4}p/.test(l)).map((l) => l.match(/^\d{3,4}p/)[0])));
      }
      const m = await listModels(panel);
      if (kind === 'image') caps.imageModels = m.models;
      else caps.videoModels = m.models;
      caps.costs = caps.costs.concat(m.costs).slice(0, 16);
    }
    await closeSettings();
    const creditRx = /(\d[\d.,]{0,8})\s*(?:[A-Za-zÀ-ú]+\s+){0,3}?(credits|créditos)\b/i;
    const readCredits = () => {
      const cm = creditRx.exec(document.body.innerText || document.body.textContent || '');
      return cm ? Number(cm[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) || null : null;
    };
    caps.credits = readCredits();
    if (caps.credits == null) {
      // Os creditos ficam no menu da conta: abre, le e fecha (so leitura).
      const acc = $$('button, a, [role=button]').find((b) => /google account|conta google/i.test(b.getAttribute('aria-label') || ''));
      if (acc) {
        dtLog('Ensaio: abrindo o menu da conta para ler os créditos.');
        acc.click();
        await human(600, 1200);
        caps.credits = readCredits();
        await closeAccountDrawer(true);
      } else {
        caps.diag = Object.assign(caps.diag || {}, { account: 'botão da conta não encontrado' });
      }
    }
    return caps;
  }

  // ---------- mensagens do background ----------

  let running = false;
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'FLOW_SNAPSHOT') {
      snapshotAll()
        .then((partes) => sendResponse({ ok: true, partes }))
        .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
      return true;
    }
    if (msg.type === 'FLOW_CLICK_LAB') {
      if (running) {
        sendResponse({ ok: false, error: 'Há um take gerando.' });
        return;
      }
      clickLab()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
      return true;
    }
    if (msg.type === 'FLOW_ATTACH_TEST') {
      if (running) {
        sendResponse({ ok: false, error: 'Há um take gerando.' });
        return;
      }
      attachTest()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
      return true;
    }
    if (msg.type === 'FLOW_UPLOAD_TEST') {
      if (running) {
        sendResponse({ ok: false, error: 'Há um take gerando.' });
        return;
      }
      uploadTest()
        .then((result) => sendResponse({ ok: true, result }))
        .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
      return true;
    }
    if (msg.type === 'FLOW_WAKE') {
      wakeAll();
      sendResponse({ ok: true, busy: running });
      return;
    }
    if (msg.type === 'FLOW_PING') {
      sendResponse({ ok: true, ready: !!$(S.editor), busy: running, path: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id') });
      return;
    }
    if (msg.type === 'FLOW_SCAN') {
      if (running) {
        sendResponse({ ok: false, error: 'busy' });
        return;
      }
      running = true;
      scan().then(
        (caps) => sendResponse({ ok: true, caps }),
        (e) => sendResponse({ ok: false, error: String((e && e.message) || e) })
      ).finally(() => (running = false));
      return true;
    }
    if (msg.type === 'FLOW_RUN_JOB') {
      if (running) {
        sendResponse({ started: false, error: 'busy' });
        return;
      }
      running = true;
      sendResponse({ started: true }); // a resposta final volta por FLOW_JOB_RESULT (pode levar minutos)
      runJob(msg.job)
        .then((result) => chrome.runtime.sendMessage({ type: 'FLOW_JOB_RESULT', jobId: msg.job.id, result }))
        .catch(() => {})
        .finally(() => {
          running = false;
          curJob = null;
        });
    }
  });
})();
