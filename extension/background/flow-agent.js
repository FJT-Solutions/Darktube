// Dark Clips Companion: agente do Google Flow (service worker).
// Avisa o darktube que esta online, pega um job por vez, manda a aba do Flow gerar e devolve a midia.
// Toda a rede passa por aqui (o content script do Flow nao fala com o darktube).
// Por padrao so faz o ENSAIO (le as opcoes da conta). Gerar de verdade exige ligar no popup.

const FLOW_VERSION = '1.3.29';
const FLOW_BUILD = '2026-11-08-jobs-orfaos-e-duracao-barra'; // confirma que a extensao recarregada e a nova
const GHOST_LEFT = -10000;
const GHOST_TOP = -10000;
// Falhas de tela (menu aberto, painel em outro estado): o take volta para a fila em vez de virar rascunho.
const FLOW_UI_CODES = ['editor_missing', 'generate_disabled', 'generate_missing', 'mode_missing', 'model_btn_missing', 'option_missing', 'prompt_not_written', 'settings_btn_missing', 'settings_close_failed', 'settings_panel_missing', 'config_mismatch', 'no_project'];
const FLOW_ALARM = 'flow-tick';
// Vigia por tipo: a pagina tem o proprio limite (imagem 3 min, video 9 min) e o vigia so cobre a pagina travada, entao fica logo acima.
const FLOW_JOB_TIMEOUT_MS = { image: 5 * 60 * 1000, video: 11 * 60 * 1000 };
const FLOW_SCAN_EVERY_MS = 20 * 60 * 1000;
const FLOW_DEFAULT_BASE = 'https://darktube.fjt-solutions.com';

const flowJson = { 'Content-Type': 'application/json' };

let flowTicking = false;

// ---------- logs: tudo que a extensao faz vai para o painel do darktube ----------
const FLOW_LOG_FLUSH_MS = 400;
const FLOW_LOG_BUFFER_MAX = 300;
let flowLogBuf = [];
let flowLogTimer = null;
let flowLogFlushing = false;
let flowLastTickLog = '';
let flowForceLogsUntil = 0;

function flowLog(message, data, level, ids) {
  flowLogBuf.push({
    message: String(message || '').slice(0, 1000),
    level: level || 'info',
    data: data == null ? undefined : data,
    timestamp: (ids && ids.timestamp) || Date.now(),
    jobId: (ids && ids.jobId) || undefined,
    projectId: (ids && ids.projectId) || undefined,
  });
  if (flowLogBuf.length > FLOW_LOG_BUFFER_MAX) flowLogBuf = flowLogBuf.slice(-FLOW_LOG_BUFFER_MAX);
  if (!flowLogTimer) flowLogTimer = setTimeout(flowLogFlush, FLOW_LOG_FLUSH_MS);
}

// Avisos de ciclo repetidos (ex.: "Nada na fila.") so entram quando mudam.
function flowLogTick(message, data, level) {
  if (flowLastTickLog === message) return;
  flowLastTickLog = message;
  flowLog(message, data, level);
}

async function flowLogFlush() {
  flowLogTimer = null;
  if (flowLogFlushing || !flowLogBuf.length) return;
  flowLogFlushing = true;
  const batch = flowLogBuf.splice(0, 100);
  const stat = async (o) => {
    try {
      await chrome.storage.local.set({ flow_logstat: { at: Date.now(), ...o } });
    } catch (_) {}
  };
  try {
    const c = await flowCfg();
    if (!c.darktube_token) return await stat({ ok: false, err: 'sem login no popup' }); // sem login nao ha para onde mandar: descarta
    // agente desligado: nada e enviado, exceto durante um retrato manual pedido pelo usuario
    if (!c.flow_enabled && Date.now() > flowForceLogsUntil) return await stat({ ok: true, off: true });
    const res = await fetch(c.base + '/api/flow/agent/logs', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + c.darktube_token, ...flowJson },
      body: JSON.stringify({ logs: batch }),
    });
    await stat({ ok: res.ok, status: res.status, sent: batch.length });
    if (!res.ok && res.status !== 401) throw new Error(String(res.status));
  } catch (e) {
    await stat({ ok: false, err: String((e && e.message) || e).slice(0, 80) });
    flowLogBuf = batch.concat(flowLogBuf).slice(-FLOW_LOG_BUFFER_MAX); // sem rede: tenta de novo no proximo envio
  } finally {
    flowLogFlushing = false;
    if (flowLogBuf.length && !flowLogTimer) flowLogTimer = setTimeout(flowLogFlush, FLOW_LOG_FLUSH_MS * 5);
  }
}

chrome.alarms.create(FLOW_ALARM, { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === FLOW_ALARM) flowTick();
});

async function flowCfg() {
  const c = await chrome.storage.local.get([
    'darktube_token', 'darktube_api_url', 'flow_enabled', 'flow_live', 'flow_always_ghost', 'flow_caps', 'flow_current',
  ]);
  c.base = (c.darktube_api_url || FLOW_DEFAULT_BASE).replace(/\/+$/, '');
  return c;
}

async function flowStatus(state, extra) {
  await chrome.storage.local.set({ flow_status: { state, at: Date.now(), ...(extra || {}) } });
}

async function flowApi(c, path, init) {
  const res = await fetch(c.base + path, {
    ...(init || {}),
    headers: { Authorization: 'Bearer ' + c.darktube_token, ...((init && init.headers) || {}) },
  });
  if (res.status === 401) throw new Error('Sessão do darktube expirada. Entre de novo no popup.');
  return res.json().catch(() => ({}));
}

async function flowHeartbeat(c, caps) {
  const body = { version: FLOW_VERSION, build: FLOW_BUILD, mode: c.flow_live ? 'live' : 'dry' };
  const cached = caps || (c.flow_caps && c.flow_caps.data);
  if (cached) body.capabilities = cached;
  return flowApi(c, '/api/flow/agent/heartbeat', { method: 'POST', headers: flowJson, body: JSON.stringify(body) });
}

// Estado guardado por FLOW_ENSURE_VISIBLE para devolver a aba/janela anteriores depois da geracao.
let flowVisRestore = null;
let flowVisTimer = null;
async function flowRestoreVisible() {
  clearTimeout(flowVisTimer);
  const r = flowVisRestore;
  flowVisRestore = null;
  if (!r) return;
  try {
    const c = await flowCfg();
    if (c.flow_always_ghost !== false) return; // janela fantasma fica no lugar offscreen
    if (r.wasMinimized) await chrome.windows.update(r.windowId, { state: 'minimized' });
    if (r.previousTabId) await chrome.tabs.update(r.previousTabId, { active: true });
    if (r.previousWindowId) await chrome.windows.update(r.previousWindowId, { focused: true });
  } catch (e) {
    /* aba ou janela ja fechada */
  }
}

// Injeta na página do Flow (mundo MAIN) o override da Page Visibility API.
// O Flow acredita que a aba está sempre visível e com foco, mesmo se minimizada ou fora da tela.
async function flowInjectMainSpoof(tabId) {
  if (!tabId || !chrome.scripting) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (window.__dtVisibilitySpoofed) return;
        window.__dtVisibilitySpoofed = true;
        try {
          Object.defineProperty(Document.prototype, 'visibilityState', { get: () => 'visible', configurable: true });
          Object.defineProperty(Document.prototype, 'hidden', { get: () => false, configurable: true });
          Object.defineProperty(Document.prototype, 'webkitHidden', { get: () => false, configurable: true });
          Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
          Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
          const stopVis = (e) => {
            if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          };
          window.addEventListener('visibilitychange', stopVis, true);
          document.addEventListener('visibilitychange', stopVis, true);
          window.addEventListener('webkitvisibilitychange', stopVis, true);
          document.addEventListener('webkitvisibilitychange', stopVis, true);
          document.hasFocus = () => true;
        } catch (_) {}
      },
    });
  } catch (_) {}
}

// Aba escondida: o Chrome atrasa os timers dela para 1 vez por minuto. Enquanto ha job, acorda a aba a cada 2 s
// (sem trazer para a frente nem trocar de aba) e impede que o Chrome a descarregue para poupar memoria.
let flowWakeTimer = null;
function flowKeepAwake(tabId) {
  if (flowWakeTimer || !tabId) return;
  flowInjectMainSpoof(tabId).catch(() => {});
  try {
    chrome.tabs.update(tabId, { autoDiscardable: false }, () => void chrome.runtime.lastError);
  } catch (_) {}
  flowWakeTimer = setInterval(async () => {
    const cur = (await chrome.storage.local.get(['flow_current'])).flow_current;
    if (!cur) {
      clearInterval(flowWakeTimer);
      flowWakeTimer = null;
      return;
    }
    try {
      chrome.tabs.sendMessage(tabId, { type: 'FLOW_WAKE' }, () => void chrome.runtime.lastError);
    } catch (_) {}
  }, 2000);
}

async function flowFail(c, jobId, error, code) {
  try {
    await flowApi(c, `/api/flow/agent/jobs/${jobId}/fail`, {
      method: 'POST', headers: flowJson, body: JSON.stringify({ error: String(error || 'Falha').slice(0, 400), code: code || '' }),
    });
  } catch (e) {
    /* sem rede: o servidor expira o job sozinho */
  }
}

// Pergunta ao darktube se o job em andamento ainda vale. Null = sem resposta (rede); so um "nao vale" explicito aborta.
async function flowJobAlive(c, jobId) {
  try {
    const r = await flowApi(c, `/api/flow/agent/jobs/${jobId}`, { method: 'GET' });
    if (r && r.success && typeof r.alive === 'boolean') return r;
  } catch (e) {
    /* sem rede: segue como estava */
  }
  return null;
}

// Job em andamento cancelado (ou de projeto apagado): avisa a aba para parar e libera a fila. True se abortou.
async function flowAbortIfDead(c) {
  const cur = c.flow_current;
  if (!cur) return false;
  const live = await flowJobAlive(c, cur.jobId);
  // done/draft logo apos o envio: e a propria extensao fechando o job (corrida com este vigia), nao um cancelamento.
  if (!live || live.alive || live.status === 'done' || live.status === 'draft') return false;
  flowLog('O job em andamento foi cancelado (ou o projeto foi apagado); a extensão parou e liberou a fila.', { status: live.status, motivo: live.reason }, 'warn', cur);
  const t = cur.tabId ? { id: cur.tabId } : await flowFindTab();
  if (t) await flowAsk(t.id, { type: 'FLOW_ABORT', jobId: cur.jobId });
  await chrome.storage.local.remove('flow_current');
  return true;
}

async function flowFindTab() {
  const tabs = await chrome.tabs.query({ url: 'https://flow.google.com/*' });
  return tabs.find((t) => /\/project\//.test(t.url || '')) || tabs[0] || null;
}

async function flowAsk(tabId, msg) {
  const trySend = () =>
    new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, msg, (resp) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(resp || null);
        });
      } catch (e) {
        resolve(null);
      }
    });

  let res = await trySend();
  if (res === null && chrome.scripting) {
    // Auto-cura: se a extensao foi recarregada e a aba perdeu a conexao, injeta os scripts automaticamente
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/flow-selectors.js', 'content/flow.js'],
      });
      await flowInjectMainSpoof(tabId);
      await new Promise((r) => setTimeout(r, 400));
      res = await trySend();
    } catch (e) {
      /* aba protegida ou fechada */
    }
  } else if (res !== null) {
    flowInjectMainSpoof(tabId).catch(() => {});
  }
  return res;
}

flowLog('Agente Flow iniciado.', { version: FLOW_VERSION, build: FLOW_BUILD }, 'info');

async function flowTick() {
  if (flowTicking) return;
  flowTicking = true;
  try {
    flowLogFlush(); // garante o envio de logs que ficaram para tras
    const c = await flowCfg();
    if (!c.darktube_token || !c.flow_enabled) return void (await flowStatus('desligado'));

    // Vigia: um job que ficou sem resposta da pagina por muito tempo.
    if (c.flow_current) {
      // Cancelado, projeto apagado ou devolvido a fila pelo servidor: nao espera nem gasta credito com um job sem dono.
      if (await flowAbortIfDead(c)) return void (await flowStatus('aguardando', { msg: 'Job cancelado; fila liberada.' }));
      if (Date.now() - c.flow_current.startedAt > (FLOW_JOB_TIMEOUT_MS[c.flow_current.kind] || FLOW_JOB_TIMEOUT_MS.video)) {
        flowLog('Vigia: a aba do Flow não respondeu a tempo.', null, 'error', c.flow_current);
        await flowFail(c, c.flow_current.jobId, 'A aba do Flow não respondeu a tempo.', 'timeout');
        await chrome.storage.local.remove('flow_current');
        // Nao pega outro job no mesmo ciclo: a pagina pode estar travada.
        return void (await flowStatus('falhou', { msg: 'A aba do Flow não respondeu a tempo.', code: 'timeout' }));
      } else {
        // Job orfao: a extensao foi recarregada ou a aba recarregou no meio do take e a pagina nao esta mais
        // trabalhando nele. Em vez de esperar o vigia (20 min), devolve o take para a fila na hora.
        if (Date.now() - c.flow_current.startedAt > 45000) {
          const t = c.flow_current.tabId ? { id: c.flow_current.tabId } : await flowFindTab();
          const ping = t ? await flowAsk(t.id, { type: 'FLOW_PING' }) : null;
          if (ping && ping.ok && !ping.busy) {
            flowLog('O take em andamento foi interrompido (extensão ou aba recarregada); ele volta para a fila.', null, 'warn', c.flow_current);
            try {
              await flowApi(c, `/api/flow/agent/jobs/${c.flow_current.jobId}/release`, { method: 'POST' });
            } catch (_) {}
            await chrome.storage.local.remove('flow_current');
            return void (await flowStatus('aguardando', { msg: 'Take interrompido devolvido para a fila.' }));
          }
        }
        await flowHeartbeat(c);
        if (c.flow_current.tabId) flowKeepAwake(c.flow_current.tabId); // o segundo plano pode ter reiniciado no meio do job
        return void (await flowStatus('gerando', { jobId: c.flow_current.jobId }));
      }
    }

    const hb = await flowHeartbeat(c);
    let tab = await flowFindTab();
    if (!tab) {
      if (c.flow_live && hb && hb.queuedCount > 0) {
        flowLog(`Jobs detectados na fila (${hb.queuedCount}). Abrindo Google Flow em segundo plano...`);
        try {
          const lastProject = (await chrome.storage.local.get(['flow_last_project_url'])).flow_last_project_url;
          const openUrl = lastProject || 'https://flow.google.com/';
          const win = await chrome.windows.create({
            url: openUrl,
            focused: false,
            left: GHOST_LEFT,
            top: GHOST_TOP,
            width: 620,
            height: 860,
            state: 'normal',
          });
          if (win && win.id) {
            await chrome.windows.update(win.id, { left: GHOST_LEFT, top: GHOST_TOP, focused: false }).catch(() => {});
            await chrome.storage.local.set({ flow_auto_window_id: win.id, flow_ghost_active: true });
            await new Promise((r) => setTimeout(r, 5000));
            tab = await flowFindTab();
          }
        } catch (e) {
          flowLog('Falha ao abrir janela automática do Flow: ' + (e && e.message), null, 'warn');
        }
      }
      if (!tab) {
        flowLogTick('Nenhuma aba do Google Flow aberta.', null, 'warn');
        return void (await flowStatus('sem_aba', { msg: 'Abra o Google Flow em uma aba deste Chrome.' }));
      }
    }
    if (tab && c.flow_always_ghost !== false) {
      try {
        const tabsInWin = await chrome.tabs.query({ windowId: tab.windowId });
        if (tabsInWin.length > 1) {
          const ghostWin = await chrome.windows.create({ tabId: tab.id, focused: false, left: GHOST_LEFT, top: GHOST_TOP, width: 620, height: 860, state: 'normal' });
          if (ghostWin && ghostWin.id) {
            await chrome.windows.update(ghostWin.id, { left: GHOST_LEFT, top: GHOST_TOP, focused: false }).catch(() => {});
            await chrome.storage.local.set({ flow_auto_window_id: ghostWin.id, flow_ghost_active: true });
            tab = { id: tab.id, windowId: ghostWin.id };
          }
        } else {
          const w = await chrome.windows.get(tab.windowId).catch(() => null);
          const notGhost = w && (Math.abs(w.left - GHOST_LEFT) > 200 || Math.abs(w.top - GHOST_TOP) > 200);
          if (notGhost && (c.flow_current || (hb && hb.queuedCount > 0))) {
            await chrome.windows.update(tab.windowId, { state: 'normal', left: GHOST_LEFT, top: GHOST_TOP, width: 620, height: 860, focused: false }).catch(() => {});
            await chrome.storage.local.set({ flow_ghost_active: true });
          }
        }
      } catch (_) {}
    }
    let ping = await flowAsk(tab.id, { type: 'FLOW_PING' });
    if (ping && !ping.ready && (ping.path === '/' || ping.path === '')) {
      flowLog('Flow aberto na página inicial. Entrando em um projeto...');
      await flowAsk(tab.id, { type: 'FLOW_AUTO_ENTER_PROJECT' });
      await new Promise((r) => setTimeout(r, 4000));
      ping = await flowAsk(tab.id, { type: 'FLOW_PING' });
    }
    if (!ping || !ping.ready) {
      flowLogTick('Aba do Flow sem projeto aberto (caixa de prompt não encontrada).', { ping }, 'warn');
      return void (await flowStatus('sem_projeto', { msg: 'Abra um projeto do Flow (com a caixa de prompt).' }));
    }
    if (ping.busy) return void (await flowStatus('ocupado'));

    // Ensaio periodico: le as opcoes da conta (abre o menu da conta). So roda em repouso:
    // nunca com job em andamento nem com job esperando na fila (veja o claim abaixo).
    const stale = !c.flow_caps || Date.now() - c.flow_caps.at > FLOW_SCAN_EVERY_MS;
    const scanIdle = async () => {
      if (!stale) return;
      flowLog('Ensaio: lendo opções e créditos da conta (sem jobs na fila).');
      const r = await flowAsk(tab.id, { type: 'FLOW_SCAN' });
      if (r && r.ok) {
        await chrome.storage.local.set({ flow_caps: { at: Date.now(), data: r.caps } });
        await flowHeartbeat(c, r.caps);
        flowLog('Ensaio concluído.', { credits: r.caps && r.caps.credits }, 'success');
      } else {
        flowLog('Ensaio falhou.', { error: r && r.error }, 'warn');
      }
    };

    if (!c.flow_live) {
      await scanIdle(); // modo ensaio nunca gera: nao ha fila para proteger
      return void (await flowStatus('ensaio', { msg: 'Modo ensaio: lê a conta, mas não gera nada.' }));
    }

    // Depois de um problema de tela (menu aberto, painel diferente), espera antes de pegar o proximo take.
    const holdCfg = await chrome.storage.local.get(['flow_hold_until', 'flow_hold_msg']);
    const hold = holdCfg.flow_hold_until || 0;
    if (hold > Date.now()) {
      const wait = Math.ceil((hold - Date.now()) / 1000);
      const why = holdCfg.flow_hold_msg || 'A tela do Flow não estava pronta. Feche menus e janelas abertos no Flow.';
      return void (await flowStatus('aguardando', { msg: `${why} Nova tentativa em ${wait} s.` }));
    }
    if (holdCfg.flow_hold_msg) await chrome.storage.local.remove('flow_hold_msg');

    const claim = await flowApi(c, '/api/flow/agent/claim', { method: 'POST' });
    if (!claim || !claim.job) {
      const why = { empty: 'Nada na fila.', paused: 'Pausado pelo darktube.', gap: 'Aguardando o intervalo entre gerações.', limit_hour: 'Limite por hora atingido.', limit_day: 'Limite diário atingido.', running: 'Há um job em andamento.' };
      const reason = claim && claim.reason;
      // Fila vazia de verdade (e nao "em espera"/"limite"): unico momento seguro para o ensaio.
      if (reason === 'empty') {
        await scanIdle();
        try {
          const auto = (await chrome.storage.local.get(['flow_auto_window_id'])).flow_auto_window_id;
          if (auto) {
            flowLog('Fila de takes finalizada com sucesso. Fechando janela automática do Google Flow.');
            await chrome.windows.remove(auto).catch(() => {});
            await chrome.storage.local.remove(['flow_auto_window_id', 'flow_ghost_active']);
          }
        } catch (_) {}
      }
      flowLogTick(why[reason] || 'Nada na fila.', { reason });
      return void (await flowStatus('aguardando', { msg: why[reason] || 'Nada na fila.' }));
    }
    flowLastTickLog = '';
    await chrome.storage.local.set({ flow_current: { jobId: claim.job.id, projectId: claim.job.project_id || null, kind: claim.job.kind, startedAt: Date.now(), tabId: tab.id } });
    flowLog(`Job recebido: ${claim.job.kind} (take ${claim.job.take_index ?? '-'})`, { params: claim.job.params, prompt: String(claim.job.prompt || '').slice(0, 300) }, 'info', { jobId: claim.job.id, projectId: claim.job.project_id });
    await flowStatus('gerando', { jobId: claim.job.id });
    const started = await flowAsk(tab.id, { type: 'FLOW_RUN_JOB', job: claim.job });
    if (started && started.started) flowKeepAwake(tab.id);
    if (!started || !started.started) {
      flowLog('A aba do Flow não aceitou o trabalho.', { started }, 'error', { jobId: claim.job.id, projectId: claim.job.project_id });
      await flowFail(c, claim.job.id, 'A aba do Flow não aceitou o trabalho.', 'tab');
      await chrome.storage.local.remove('flow_current');
    }
  } catch (e) {
    flowLogTick('Erro no ciclo da extensão: ' + String((e && e.message) || e).slice(0, 200), null, 'error');
    await flowStatus('erro', { msg: String((e && e.message) || e).slice(0, 200) });
  } finally {
    flowTicking = false;
  }
}

function flowB64ToBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// MP4 tem "ftyp" na posicao 4; WebM comeca com 1A 45 DF A3.
async function flowIsVideoBlob(blob) {
  try {
    const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    return String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp' || (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3);
  } catch (_) {
    return false;
  }
}

async function flowBlobToB64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function flowMime(blobType, kind) {
  const ok = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'];
  if (ok.includes(blobType)) return blobType;
  return kind === 'video' ? 'video/mp4' : 'image/png';
}

async function flowHandleResult(msg) {
  const c = await flowCfg();
  const cur = c.flow_current;
  if (!cur || cur.jobId !== msg.jobId) return;
  const r = msg.result || {};
  const ids = { jobId: msg.jobId, projectId: cur.projectId };
  try {
    if (!r.ok && r.code === 'cancelled') {
      // A pagina parou porque o job foi cancelado ou o projeto apagado: nada a devolver ao servidor.
      flowLog('Job cancelado; nada foi gerado.', null, 'warn', ids);
      return void (await flowStatus('aguardando', { msg: 'Job cancelado; fila liberada.' }));
    }
    if (!r.ok && FLOW_UI_CODES.includes(r.code)) {
      // Problema de tela (menu/janela aberta, painel em outro estado): nao queima o take. Ele volta para a fila e o
      // agente espera 2 min. So na 3a vez seguida vira rascunho, para o usuario ver.
      const n = ((await chrome.storage.local.get(['flow_ui_fail'])).flow_ui_fail || 0) + 1;
      if (n < 3) {
        await chrome.storage.local.set({ flow_ui_fail: n, flow_hold_until: Date.now() + 15000 });
        flowLog(`A tela do Flow não estava pronta (${r.error || r.code}). O take volta para a fila; nova tentativa em instantes (${n}/2).`, { code: r.code }, 'warn', ids);
        try {
          await flowApi(c, `/api/flow/agent/jobs/${msg.jobId}/release`, { method: 'POST' });
        } catch (_) {}
        return void (await flowStatus('aguardando', { msg: 'A tela do Flow não estava pronta; feche menus e janelas abertos. Nova tentativa em 2 min.' }));
      }
      await chrome.storage.local.set({ flow_ui_fail: 0 });
    }
    if (r.ok || !FLOW_UI_CODES.includes(r.code)) await chrome.storage.local.set({ flow_ui_fail: 0 });
    if (!r.ok) {
      flowLog('Falha na geração: ' + (r.error || 'sem detalhe'), { code: r.code }, 'error', ids);
      await flowFail(c, msg.jobId, r.error || 'Falha na geração.', r.code);
      // Falha generica do Flow: o servidor devolve o take para a fila; espera alguns minutos antes de pegar de novo.
      if (r.code === 'gen_failed') await chrome.storage.local.set({ flow_hold_until: Date.now() + 20000, flow_hold_msg: 'O Flow falhou ao gerar; nova tentativa automática em instantes.' });
      return void (await flowStatus('falhou', { msg: r.error, code: r.code }));
    }
    // Notifica o DarkTube que a geração no Flow terminou e a mídia está sendo coletada
    try {
      await flowApi(c, `/api/flow/agent/jobs/${msg.jobId}/collecting`, { method: 'POST' });
    } catch (_) {}
    let blob;
    if (r.b64) {
      blob = flowB64ToBlob(r.b64, r.mime || '');
    } else if (r.url) {
      const dl = await fetch(r.url, { credentials: 'include' });
      if (!dl.ok) throw new Error('Não foi possível baixar a mídia (' + dl.status + ').');
      blob = await dl.blob();
      if (r.kind === 'video' && !(await flowIsVideoBlob(blob))) {
        flowLog('O arquivo baixado pela URL não é um vídeo; descartado.', { bytes: blob.size, type: blob.type }, 'error', ids);
        await flowFail(c, msg.jobId, 'O arquivo encontrado não é um vídeo.', 'capture_failed');
        return void (await flowStatus('falhou', { msg: 'O arquivo encontrado não é um vídeo.', code: 'capture_failed' }));
      }
    } else {
      throw new Error('A página não devolveu a mídia.');
    }
    flowLog('Mídia recebida pela extensão.', { via: r.b64 ? 'base64' : 'url', bytes: blob.size, type: blob.type }, 'info', ids);
    const mime = flowMime(blob.type, r.kind);
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const fd = new FormData();
    fd.append('file', new File([blob], 'flow.' + ext, { type: mime }));
    const up = await fetch(`${c.base}/api/flow/agent/jobs/${msg.jobId}/complete`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + c.darktube_token }, body: fd,
    });
    if (!up.ok) throw new Error('O darktube recusou o arquivo (' + up.status + ').');
    flowLog('Mídia enviada ao darktube. Job concluído.', null, 'success', ids);
    await flowStatus('concluido', { jobId: msg.jobId });
  } catch (e) {
    flowLog('Erro ao enviar a mídia: ' + String((e && e.message) || e).slice(0, 200), null, 'error', ids);
    await flowFail(c, msg.jobId, String((e && e.message) || e), 'upload');
    await flowStatus('erro', { msg: String((e && e.message) || e).slice(0, 200) });
  } finally {
    await chrome.storage.local.remove('flow_current');
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'FLOW_JOB_RESULT') {
    flowHandleResult(msg).finally(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'FLOW_JOB_ALIVE') {
    // A pagina confere antes de clicar em gerar e durante a espera. A rede passa por aqui (a pagina nao fala com o darktube).
    (async () => {
      const c = await flowCfg();
      const live = c.darktube_token ? await flowJobAlive(c, String(msg.jobId || '')) : null;
      sendResponse(live ? { ok: true, alive: live.alive, status: live.status, reason: live.reason } : { ok: false });
    })();
    return true;
  }
  if (msg.type === 'FLOW_LOG') {
    const l = msg.log || {};
    flowLog(l.message, l.data, l.level, l);
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'FLOW_SCAN_NOW') {
    (async () => {
      const c = await flowCfg();
      if (c.flow_current) return sendResponse({ ok: false, error: 'Há um job em andamento; a leitura da conta espera ele terminar.' });
      const tab = await flowFindTab();
      if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
      const r = await flowAsk(tab.id, { type: 'FLOW_SCAN' });
      if (r && r.ok) {
        await chrome.storage.local.set({ flow_caps: { at: Date.now(), data: r.caps } });
        if (c.darktube_token) await flowHeartbeat(c, r.caps).catch(() => {});
        sendResponse({ ok: true, caps: r.caps });
      } else {
        sendResponse({ ok: false, error: (r && r.error) || 'A aba do Flow não respondeu.' });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_PROBE_URL') {
    // A pagina nao consegue ler algumas URLs de midia (redirecionam para outro dominio sem CORS); o segundo plano
    // tem permissao de host, baixa, confere se e video e devolve os bytes.
    (async () => {
      try {
        const res = await fetch(String(msg.url || ''), { credentials: 'include' });
        if (!res.ok) return sendResponse({ ok: false, why: 'http ' + res.status });
        const blob = await res.blob();
        if (blob.size > 60 * 1024 * 1024) return sendResponse({ ok: false, why: 'grande demais ' + blob.size });
        if (!(await flowIsVideoBlob(blob))) return sendResponse({ ok: false, why: 'não é vídeo (' + (blob.type || '?') + ', ' + blob.size + ' bytes)' });
        sendResponse({ ok: true, mime: blob.type || 'video/mp4', b64: await flowBlobToB64(blob), size: blob.size });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 60) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_HELLO') {
    // O popup pergunta qual versao do segundo plano esta rodando: arquivos do popup atualizam sozinhos
    // no disco, mas o segundo plano so atualiza ao recarregar a extensao em chrome://extensions.
    sendResponse({ ok: true, version: FLOW_VERSION, build: FLOW_BUILD });
    return;
  }
  if (msg.type === 'FLOW_SNAPSHOT_NOW') {
    // Espera alguns segundos para o usuario deixar a tela no estado desejado (painel aberto, tile gerando...).
    (async () => {
      const tab = await flowFindTab();
      if (!tab) return sendResponse({ ok: false, error: 'Abra o Google Flow primeiro.' });
      const wait = Math.min(Math.max(Number(msg.delayMs) || 6000, 0), 15000);
      flowForceLogsUntil = Date.now() + wait + 30000;
      await new Promise((r) => setTimeout(r, wait));
      const r = await flowAsk(tab.id, { type: 'FLOW_SNAPSHOT' });
      await flowLogFlush();
      sendResponse(r && r.ok ? { ok: true, partes: r.partes } : { ok: false, error: (r && r.error) || 'A aba do Flow não respondeu.' });
    })();
    return true;
  }
  if (msg.type === 'FLOW_UPLOAD_TEST_NOW') {
    // Teste: a aba envia uma imagem pequena para a biblioteca de midia do projeto (so com a fila parada).
    (async () => {
      const c = await flowCfg();
      if (c.flow_current) return sendResponse({ ok: false, error: 'Há um take gerando; teste com a fila parada.' });
      const tab = await flowFindTab();
      if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
      flowForceLogsUntil = Date.now() + 90000;
      const r = await flowAsk(tab.id, { type: 'FLOW_UPLOAD_TEST' });
      await flowLogFlush();
      sendResponse(r && r.ok ? { ok: true, result: r.result } : { ok: false, error: (r && r.error) || 'A aba do Flow não respondeu.' });
    })();
    return true;
  }
  if (msg.type === 'FLOW_TRUSTED_CLICK') {
    // Clique de mouse de verdade (confiavel) pelo depurador do navegador. A barra amarela "depurando" aparece so
    // enquanto o depurador esta ligado (cerca de 1 s). Com "ativar", a aba do Flow vira a ativa da propria janela
    // durante o clique e a aba anterior volta depois.
    (async () => {
      const tabId = sender && sender.tab && sender.tab.id;
      if (!tabId || !chrome.debugger) return sendResponse({ ok: false, why: 'sem aba ou sem permissão debugger' });
      const target = { tabId };
      const send = (method, params) =>
        new Promise((resolve, reject) =>
          chrome.debugger.sendCommand(target, method, params || {}, (r) => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(r)))
        );
      let attached = false;
      let previous = null;
      try {
        if (msg.ativar) {
          const tab = await chrome.tabs.get(tabId);
          const act = await chrome.tabs.query({ windowId: tab.windowId, active: true });
          if (act[0] && act[0].id !== tabId) previous = act[0].id;
          if (!tab.active) {
            await chrome.tabs.update(tabId, { active: true });
            await new Promise((r) => setTimeout(r, 600));
          }
        }
        await new Promise((resolve, reject) => chrome.debugger.attach(target, '1.3', () => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())));
        attached = true;
        try { await send('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch (e) { /* opcional */ }
        const x = Number(msg.x) || 0;
        const y = Number(msg.y) || 0;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 6, y: y - 4, button: 'none', buttons: 0 });
        await new Promise((r) => setTimeout(r, 120));
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
        await new Promise((r) => setTimeout(r, 120));
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        await new Promise((r) => setTimeout(r, 80));
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 140) });
      } finally {
        if (attached) {
          await new Promise((r) => setTimeout(r, 400));
          try { chrome.debugger.detach(target, () => void chrome.runtime.lastError); } catch (e) {}
        }
        if (previous) {
          try { await chrome.tabs.update(previous, { active: true }); } catch (e) {}
        }
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_NETLOG_INSTALL') {
    // Registra (so leitura) as chamadas de rede do Flow no mundo da pagina; o content script le o resumo no atributo data-dt-net.
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!tabId || !chrome.scripting) return sendResponse({ ok: false });
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            if (window.__dtNetHook) return;
            window.__dtNetHook = true;
            const buf = [];
            const clean = (s) => String(s || '').replace(/[A-Za-z0-9_-]{40,}/g, '<token>').replace(/[ \t\r\n]+/g, ' ').slice(0, 320);
            const push = (e) => {
              buf.push(e);
              if (buf.length > 30) buf.shift();
              try { document.documentElement.setAttribute('data-dt-net', JSON.stringify(buf)); } catch (_) {}
            };
            const path = (u) => { try { const x = new URL(u, location.href); return x.host + x.pathname.slice(0, 90); } catch (_) { return String(u).slice(0, 90); } };
            const rf = window.fetch;
            window.fetch = function (input, init) {
              const t0 = Date.now();
              const m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
              const u = typeof input === 'string' ? input : (input && input.url) || '';
              const p = rf.apply(this, arguments);
              if (m !== 'GET' || /generate|video|image|media|upload|batch|operation/i.test(u)) {
                p.then((r) => {
                  const e = { t: new Date().toISOString().slice(11, 19), m, p: path(u), s: r.status, ms: Date.now() - t0 };
                  if (r.status >= 400 || /generate|video/i.test(u)) {
                    try { r.clone().text().then((b) => { e.b = clean(b); push(e); }).catch(() => push(e)); } catch (_) { push(e); }
                  } else push(e);
                }).catch((er) => push({ t: new Date().toISOString().slice(11, 19), m, p: path(u), s: 0, err: String(er).slice(0, 80) }));
              }
              return p;
            };
            const ro = XMLHttpRequest.prototype.open, rs = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function (m, u) { this.__dt = { m: String(m).toUpperCase(), u }; return ro.apply(this, arguments); };
            XMLHttpRequest.prototype.send = function () {
              const d = this.__dt, t0 = Date.now();
              if (d && d.m !== 'GET') this.addEventListener('loadend', () => push({ t: new Date().toISOString().slice(11, 19), m: d.m, p: path(d.u), s: this.status, ms: Date.now() - t0, b: this.status >= 400 ? clean(this.responseText) : undefined }));
              return rs.apply(this, arguments);
            };
          },
        });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 120) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_ENSURE_VISIBLE') {
    // O Flow so aceita a geracao com a aba visivel. Se a aba esta escondida (minimizada, atras de outra aba da janela),
    // traz a aba para a frente sem roubar o foco do que o usuario esta fazendo (a janela e restaurada se estiver
    // minimizada e a aba vira a ativa da propria janela). Com "forcar", tambem foca a janela. A situacao anterior e
    // guardada e devolvida por FLOW_RESTORE_VISIBLE.
    (async () => {
      const tabId = sender && sender.tab && sender.tab.id;
      if (!tabId) return sendResponse({ ok: false, why: 'sem aba' });
      try {
        const tab = await chrome.tabs.get(tabId);
        const win = await chrome.windows.get(tab.windowId);
        const act = await chrome.tabs.query({ windowId: tab.windowId, active: true });
        const last = await chrome.windows.getLastFocused().catch(() => null);
        flowVisRestore = {
          tabId,
          windowId: tab.windowId,
          previousTabId: act[0] && act[0].id !== tabId ? act[0].id : null,
          previousWindowId: last && last.id !== tab.windowId ? last.id : null,
          wasMinimized: win.state === 'minimized',
        };
        const c = await flowCfg();
        if (c.flow_always_ghost !== false) {
          // Mantem a janela estavel na coordenada fantasma
          await chrome.windows.update(tab.windowId, {
            state: 'normal',
            focused: false,
            left: GHOST_LEFT,
            top: GHOST_TOP,
            width: 620,
            height: 860,
          }).catch(() => {});
        } else if (win.state === 'minimized') {
          await chrome.windows.update(tab.windowId, {
            state: 'normal',
            focused: false,
          }).catch(() => {});
        }
        if (!tab.active) await chrome.tabs.update(tabId, { active: true }).catch(() => {});
        // NUNCA foca a janela (focused: false) para jamais roubar foco ou sobrepor a tela do usuario
        clearTimeout(flowVisTimer);
        flowVisTimer = setTimeout(() => flowRestoreVisible(), 60000); // rede de seguranca
        sendResponse({ ok: true, estado: win.state, ativa: tab.active, forcar: false });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 120) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_RESTORE_VISIBLE') {
    flowRestoreVisible().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'FLOW_OWN_WINDOW') {
    // Move a aba do Flow para uma janela propria (pequena, num canto): ela fica visivel sem atrapalhar as outras abas.
    (async () => {
      try {
        const tab = await flowFindTab();
        if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
        const tabs = await chrome.tabs.query({ windowId: tab.windowId });
        if (tabs.length === 1) return sendResponse({ ok: true, ja: true });
        await chrome.windows.create({ tabId: tab.id, focused: false, width: 560, height: 800, state: 'normal' });
        sendResponse({ ok: true, ja: false });
      } catch (e) {
        sendResponse({ ok: false, error: String((e && e.message) || e).slice(0, 120) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_GHOST_STATUS') {
    (async () => {
      try {
        const tab = await flowFindTab();
        if (!tab) return sendResponse({ ok: false, isGhost: false });
        const win = await chrome.windows.get(tab.windowId);
        const st = await chrome.storage.local.get(['flow_ghost_active']);
        const isGhost = !!st.flow_ghost_active || (win.left != null && win.left < -1500);
        sendResponse({ ok: true, isGhost });
      } catch (_) {
        sendResponse({ ok: false, isGhost: false });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_GHOST_WINDOW') {
    // Janela Fantasma: move a janela do Flow para fora das coordenadas do monitor (ex: left: -3200, top: 0)
    // mantendo state: 'normal'. A janela continua 100% ativa para o Windows e Chromium (GPU e WebSockets sem corte)
    // mas invisível para o usuário. Clicar novamente restaura a janela para o centro da tela.
    (async () => {
      try {
        const tab = await flowFindTab();
        if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
        const win = await chrome.windows.get(tab.windowId);
        const st = await chrome.storage.local.get(['flow_ghost_active', 'flow_prev_pos']);
        const isGhost = !!st.flow_ghost_active || (win.left != null && win.left < -5000) || (win.top != null && win.top < -5000);

        if (msg.action === 'show' || (msg.action !== 'hide' && isGhost)) {
          // Trazer de volta para a tela visível
          const pos = st.flow_prev_pos || { left: 80, top: 80, width: 620, height: 860 };
          await chrome.windows.update(tab.windowId, {
            state: 'normal',
            left: Math.max(pos.left != null ? pos.left : 80, 40),
            top: Math.max(pos.top != null ? pos.top : 80, 40),
            width: Math.max(pos.width || 620, 400),
            height: Math.max(pos.height || 860, 500),
            focused: true,
          });
          await chrome.storage.local.set({ flow_ghost_active: false });
          sendResponse({ ok: true, isGhost: false });
        } else {
          // Salvar posição e mover para fora da tela (janela fantasma)
          if (win.left != null && win.left > -4000 && win.top != null && win.top > -4000) {
            await chrome.storage.local.set({ flow_prev_pos: { left: win.left, top: win.top, width: win.width, height: win.height } });
          }
          const tabs = await chrome.tabs.query({ windowId: tab.windowId });
          let targetWinId = tab.windowId;
          if (tabs.length > 1) {
            const created = await chrome.windows.create({ tabId: tab.id, focused: false, width: 620, height: 860, state: 'normal' });
            targetWinId = created.id;
          }
          await chrome.windows.update(targetWinId, {
            state: 'normal',
            left: -10000,
            top: -10000,
            width: 620,
            height: 860,
            focused: false,
          });
          await chrome.storage.local.set({ flow_ghost_active: true });
          sendResponse({ ok: true, isGhost: true });
        }
      } catch (e) {
        sendResponse({ ok: false, error: String((e && e.message) || e).slice(0, 120) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_MAIN_CLICK') {
    // Clique dentro do "mundo" da pagina (nao no da extensao), no elemento que esta de fato no centro do botao:
    // e onde cai o clique de um usuario. Alguns botoes do Flow ignoram o clique feito pelo mundo isolado.
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!tabId || !chrome.scripting) return sendResponse({ ok: false, why: 'sem aba ou sem scripting' });
        const res = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          args: [String(msg.selector || '')],
          func: (sel) => {
            const btn = document.querySelector(sel);
            if (!btn) return { found: false };
            try { btn.scrollIntoView({ block: 'nearest' }); } catch (e) {}
            const r = btn.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            const top = document.elementFromPoint(x, y) || btn;
            const mo = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0, buttons: 1 };
            const po = { ...mo, pointerType: 'mouse', isPrimary: true };
            top.dispatchEvent(new PointerEvent('pointerover', { ...po, buttons: 0 }));
            top.dispatchEvent(new MouseEvent('mouseover', { ...mo, buttons: 0 }));
            top.dispatchEvent(new PointerEvent('pointerdown', po));
            top.dispatchEvent(new MouseEvent('mousedown', mo));
            top.dispatchEvent(new PointerEvent('pointerup', { ...po, buttons: 0 }));
            top.dispatchEvent(new MouseEvent('mouseup', { ...mo, buttons: 0 }));
            top.dispatchEvent(new MouseEvent('click', { ...mo, buttons: 0 }));
            try { if (typeof top.click === 'function') top.click(); } catch (_) {}
            try { if (btn && btn !== top && typeof btn.click === 'function') btn.click(); } catch (_) {}
            try { const form = btn && btn.closest('form'); if (form && typeof form.requestSubmit === 'function') form.requestSubmit(); } catch (_) {}
            return { found: true, igualAoBotao: top === btn, dentroDoBotao: btn.contains(top), noCentro: top.tagName.toLowerCase() + '.' + String(top.className || '').slice(0, 60) };
          },
        });
        sendResponse({ ok: true, info: res && res[0] && res[0].result });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 120) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_FETCH_REF') {
    // A aba do Flow nao le o darktube (outro dominio): o segundo plano baixa a referencia e devolve os bytes.
    (async () => {
      try {
        const c = await flowCfg();
        const u = String(msg.url || '');
        const url = /^https?:/i.test(u) ? u : c.base + (u.startsWith('/') ? u : '/' + u);
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return sendResponse({ ok: false, why: 'http ' + res.status });
        const blob = await res.blob();
        if (blob.size > 40 * 1024 * 1024) return sendResponse({ ok: false, why: 'grande demais' });
        sendResponse({ ok: true, mime: blob.type || '', b64: await flowBlobToB64(blob), size: blob.size });
      } catch (e) {
        sendResponse({ ok: false, why: String((e && e.message) || e).slice(0, 80) });
      }
    })();
    return true;
  }
  if (msg.type === 'FLOW_CLICK_LAB_NOW') {
    (async () => {
      const c = await flowCfg();
      if (c.flow_current) return sendResponse({ ok: false, error: 'Há um take gerando; teste com a fila parada.' });
      const tab = await flowFindTab();
      if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
      flowForceLogsUntil = Date.now() + 180000;
      const r = await flowAsk(tab.id, { type: 'FLOW_CLICK_LAB' });
      await flowLogFlush();
      sendResponse(r && r.ok ? { ok: true, result: r.result } : { ok: false, error: (r && r.error) || 'A aba do Flow não respondeu.' });
    })();
    return true;
  }
  if (msg.type === 'FLOW_ATTACH_TEST_NOW') {
    (async () => {
      const c = await flowCfg();
      if (c.flow_current) return sendResponse({ ok: false, error: 'Há um take gerando; teste com a fila parada.' });
      const tab = await flowFindTab();
      if (!tab) return sendResponse({ ok: false, error: 'Abra um projeto do Flow primeiro.' });
      flowForceLogsUntil = Date.now() + 120000;
      const r = await flowAsk(tab.id, { type: 'FLOW_ATTACH_TEST' });
      await flowLogFlush();
      sendResponse(r && r.ok ? { ok: true, result: r.result } : { ok: false, error: (r && r.error) || 'A aba do Flow não respondeu.' });
    })();
    return true;
  }
  if (msg.type === 'FLOW_TICK_NOW') {
    flowTick().finally(() => sendResponse({ ok: true }));
    return true;
  }
});
