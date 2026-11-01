// Dark Clips Companion: agente do Google Flow (service worker).
// Avisa o darktube que esta online, pega um job por vez, manda a aba do Flow gerar e devolve a midia.
// Toda a rede passa por aqui (o content script do Flow nao fala com o darktube).
// Por padrao so faz o ENSAIO (le as opcoes da conta). Gerar de verdade exige ligar no popup.

const FLOW_VERSION = '1.2.6';
const FLOW_BUILD = '2026-11-01-sonda-segundo-plano'; // aparece no log da VPS: confirma que a extensao recarregada e a nova
const FLOW_ALARM = 'flow-tick';
const FLOW_JOB_TIMEOUT_MS = 15 * 60 * 1000;
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
    'darktube_token', 'darktube_api_url', 'flow_enabled', 'flow_live', 'flow_caps', 'flow_current',
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

async function flowFail(c, jobId, error, code) {
  try {
    await flowApi(c, `/api/flow/agent/jobs/${jobId}/fail`, {
      method: 'POST', headers: flowJson, body: JSON.stringify({ error: String(error || 'Falha').slice(0, 400), code: code || '' }),
    });
  } catch (e) {
    /* sem rede: o servidor expira o job sozinho */
  }
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
      await new Promise((r) => setTimeout(r, 400));
      res = await trySend();
    } catch (e) {
      /* aba protegida ou fechada */
    }
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
      if (Date.now() - c.flow_current.startedAt > FLOW_JOB_TIMEOUT_MS) {
        flowLog('Vigia: a aba do Flow não respondeu a tempo.', null, 'error', c.flow_current);
        await flowFail(c, c.flow_current.jobId, 'A aba do Flow não respondeu a tempo.', 'timeout');
        await chrome.storage.local.remove('flow_current');
        // Nao pega outro job no mesmo ciclo: a pagina pode estar travada.
        return void (await flowStatus('falhou', { msg: 'A aba do Flow não respondeu a tempo.', code: 'timeout' }));
      } else {
        await flowHeartbeat(c);
        return void (await flowStatus('gerando', { jobId: c.flow_current.jobId }));
      }
    }

    await flowHeartbeat(c);
    const tab = await flowFindTab();
    if (!tab) {
      flowLogTick('Nenhuma aba do Google Flow aberta.', null, 'warn');
      return void (await flowStatus('sem_aba', { msg: 'Abra o Google Flow em uma aba deste Chrome.' }));
    }
    const ping = await flowAsk(tab.id, { type: 'FLOW_PING' });
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

    const claim = await flowApi(c, '/api/flow/agent/claim', { method: 'POST' });
    if (!claim || !claim.job) {
      const why = { empty: 'Nada na fila.', paused: 'Pausado pelo darktube.', gap: 'Aguardando o intervalo entre gerações.', limit_hour: 'Limite por hora atingido.', limit_day: 'Limite diário atingido.', running: 'Há um job em andamento.' };
      const reason = claim && claim.reason;
      // Fila vazia de verdade (e nao "em espera"/"limite"): unico momento seguro para o ensaio.
      if (reason === 'empty') await scanIdle();
      flowLogTick(why[reason] || 'Nada na fila.', { reason });
      return void (await flowStatus('aguardando', { msg: why[reason] || 'Nada na fila.' }));
    }
    flowLastTickLog = '';
    await chrome.storage.local.set({ flow_current: { jobId: claim.job.id, projectId: claim.job.project_id || null, kind: claim.job.kind, startedAt: Date.now() } });
    flowLog(`Job recebido: ${claim.job.kind} (take ${claim.job.take_index ?? '-'})`, { params: claim.job.params, prompt: String(claim.job.prompt || '').slice(0, 300) }, 'info', { jobId: claim.job.id, projectId: claim.job.project_id });
    await flowStatus('gerando', { jobId: claim.job.id });
    const started = await flowAsk(tab.id, { type: 'FLOW_RUN_JOB', job: claim.job });
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
    if (!r.ok) {
      flowLog('Falha na geração: ' + (r.error || 'sem detalhe'), { code: r.code }, 'error', ids);
      await flowFail(c, msg.jobId, r.error || 'Falha na geração.', r.code);
      return void (await flowStatus('falhou', { msg: r.error, code: r.code }));
    }
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'FLOW_JOB_RESULT') {
    flowHandleResult(msg).finally(() => sendResponse({ ok: true }));
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
  if (msg.type === 'FLOW_TICK_NOW') {
    flowTick().finally(() => sendResponse({ ok: true }));
    return true;
  }
});
