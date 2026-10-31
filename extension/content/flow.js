// Dark Clips Companion: automacao da pagina do Google Flow.
// Faz o que uma pessoa faria: abre as configuracoes, escolhe, digita o prompt, clica em gerar,
// espera o resultado e devolve a midia. Para na hora se aparecer verificacao ou limite.
// Nenhuma rede daqui: quem fala com o darktube e o background (flow-agent.js).
(() => {
  if (window.__dtFlowLoaded) return;
  window.__dtFlowLoaded = true;

  const S = window.DT_FLOW_SEL;
  const RX = window.DT_FLOW_RX;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    const box = ed ? ed.closest('flow-prompt-box, form, [class*="prompt"]') || ed.parentElement : null;
    if (box) {
      const b = $('button.settings-trigger-button, .settings-trigger-button', box)
        || $$('button', box).find((btn) => /nano banana|veo|omni|\bvideo\b|\bx\d\b|\b\d+s\b/i.test(txt(btn)));
      if (b) return b;
    }
    return $('button.settings-trigger-button, .settings-trigger-button')
      || $$('button').find((btn) => !btn.closest('header, nav, flow-top-bar') && /nano banana|veo|omni|\bvideo\b|\bx\d\b/i.test(txt(btn)));
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
    const rx = kind === 'video' ? /^\s*video\b/i : /^\s*image\b/i;
    // 1. Procura botao, tab ou toggle com o texto ou aria-label "Video" ou "Image" no topo do painel
    const candidates = $$('button, [role=tab], [role=radio], mat-button-toggle, .mat-mdc-button-toggle', panel);
    const r = candidates.find((el) => rx.test(txt(el)) || (el.getAttribute('aria-label') && rx.test(el.getAttribute('aria-label'))))
      || (kind === 'video' ? radios(panel).find((x) => hasIcon(x, 'videocam')) : $(S.radioGroup, panel) && $$(S.radio, $(S.radioGroup, panel))[0]);

    if (!r) throw err('mode_missing', `Não achei a opção de ${kind === 'video' ? 'vídeo' : 'imagem'}.`);

    const isChecked = isOn(r)
      || r.getAttribute('aria-selected') === 'true'
      || r.classList.contains('active')
      || r.classList.contains('selected')
      || r.classList.contains('mat-button-toggle-checked');

    if (!isChecked) {
      r.click();
      await human(500, 1000);
    }
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
    if (p.model) await chooseModel(panel, p.model); // o modelo vem primeiro: as opcoes mudam com ele
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
      for (const attr of ['src', 'data-src', 'data-video-url', 'data-url', 'data-media-url', 'data-download-url']) {
        const val = el.getAttribute ? el.getAttribute(attr) : '';
        if (val && (/\.mp4\b/i.test(val) || /storage\.googleapis\.com/i.test(val) || /blob:https/i.test(val))) {
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

  function isTileGenerating(tile) {
    if (!tile) return false;
    if (tile.matches && tile.matches(S.pendingTile)) return true;
    if ($('mat-spinner, mat-progress-spinner, mat-progress-bar, [role=progressbar], .mat-mdc-progress-spinner, .mat-mdc-progress-bar, .spinner', tile)) {
      return true;
    }
    const t = txt(tile);
    if (/\b(\d{1,3}%|generating|gerando|criando|loading)\b/i.test(t)) {
      return true;
    }
    const img = $('img', tile);
    const hasImage = img && (img.naturalWidth > 40 || (img.src && !img.src.startsWith('data:')));
    const hasVideo = $('video', tile);
    const hasBadge = /\b(360p|720p|1080p|\d+s)\b/i.test(t);
    const hasPlay = $$('mat-icon, button, [role=button]', tile).some((el) => /play/i.test(txt(el)) || /play|reproduzir/i.test(el.getAttribute('aria-label') || ''));

    if (!hasImage && !hasVideo && !hasBadge && !hasPlay) {
      return true;
    }
    return false;
  }

  async function generate(job) {
    const count = Math.min(Math.max(Number((job.params || {}).count) || 1, 1), 4);
    dtLog(`Iniciando geração (${job.kind}).`, { params: job.params, count, prompt: String(job.prompt || '').slice(0, 300) });
    await closeAccountDrawer();
    await closeLayers();
    await ensureDirectMode();
    await writePrompt(job.prompt);
    dtLog('Prompt escrito na caixa do Flow.');

    // Registra os elementos, URLs e digitais dos tiles que JA EXISTIAM antes deste take
    const prevTiles = new Set($$(S.videoTile));
    const prevFps = new Set($$(S.videoTile).map(tileFp));
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

    const btn = $(S.generate);
    if (!btn) throw err('generate_missing', 'Não achei o botão de gerar.');
    if (!(await until(() => !btn.disabled, 10000))) throw err('generate_disabled', 'O botão de gerar ficou desabilitado.');
    await human(500, 1500);
    btn.click();
    dtLog('Botão de gerar clicado.', { creditsHint: hint });
    await sleep(2000);

    const limit = job.kind === 'video' ? 12 * 60 * 1000 : 4 * 60 * 1000;
    const t0 = Date.now();
    let lastShape = '';
    for (;;) {
      await sleep(2500);
      const prob = classifyProblem();
      if (prob) throw err(prob.code, prob.msg);
      if (job.kind === 'image') {
        const fresh = unseen($$(tileSel()));
        const bad = fresh.find((t) => !t.matches(S.pendingTile) && RX.failure.test(txt(t)));
        if (bad) throw err('failed', 'O Flow recusou a geração: ' + txt(bad).slice(0, 180));
        const ready = $$(S.imageTileImg).filter((i) => !i.closest('[data-dt-seen]'));
        if (ready.length >= count) dtLog('Imagem gerada detectada.', { prontas: ready.length, mediaId: ready[0].getAttribute('data-media-id') }, 'success');
        if (ready.length >= count) return { ...(await capture('image', ready[0], knownOldUrls)), costHint: hint };
      } else {
        const currentTiles = $$(S.videoTile);
        // O Google Flow insere novos videos no INICIO da galeria (topo/esquerda).
        // Filtra somente tiles que NAO existiam antes deste clique:
        const newTiles = currentTiles.filter((t) => !t.hasAttribute('data-dt-old') && !prevTiles.has(t) && !prevFps.has(tileFp(t)));
        const bad = newTiles.find((t) => !isTileGenerating(t) && RX.failure.test(txt(t)));
        if (bad) throw err('failed', 'O Flow recusou a geração: ' + txt(bad).slice(0, 180));

        const pending = newTiles.filter(isTileGenerating);
        const ready = newTiles.filter((t) => !isTileGenerating(t));
        const shape = `${currentTiles.length}/${newTiles.length}/${pending.length}/${ready.length}`;
        if (shape !== lastShape) {
          lastShape = shape;
          dtLog('Tiles depois de gerar.', { total: currentTiles.length, novos: newTiles.length, gerando: pending.length, prontos: ready.length, segundos: Math.round((Date.now() - t0) / 1000) });
        }
        if (ready.length >= count && pending.length === 0) {
          // O take novo fica sempre na posicao 0 (topo da galeria)
          const targetTile = ready[0];
          dtLog('Tile gerado detectado.', describeTile(targetTile), 'success');
          const out = await capture('video', targetTile, knownOldUrls);
          targetTile.setAttribute('data-dt-seen', '1');
          targetTile.setAttribute('data-dt-old', '1');
          seenTileKeys.add(tileKey(targetTile));
          prevTiles.add(targetTile);
          prevFps.add(tileFp(targetTile));
          await closeLayers();
          return { ...out, costHint: hint };
        }
      }
      if (Date.now() - t0 > limit) throw err('timeout', 'O Flow não terminou a geração no tempo esperado.');
    }
  }

  async function runJob(job) {
    curJob = job;
    try {
      dtLog('Job iniciado na aba do Flow.', { kind: job.kind, take: job.take_index, params: job.params });
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
      models: items.map((t) => t.replace(/\d{1,4}\s*(credits|créditos|cr)\b.*$/i, '').trim()).filter(Boolean).slice(0, 12),
      costs: items.filter((t) => /\d\s*(credits|créditos|cr)\b/i.test(t)).map((t) => t.slice(0, 80)).slice(0, 12),
    };
  }

  async function scan() {
    const caps = {
      scannedAt: new Date().toISOString(),
      path: location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id'),
      selectors: {
        editor: !!$(S.editor),
        generate: !!$(S.generate),
        settingsBtn: !!$(S.settingsBtn),
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
