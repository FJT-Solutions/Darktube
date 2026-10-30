// Dark Clips Companion: agente do Google Flow (service worker).
// Avisa o darktube que esta online, pega um job por vez, manda a aba do Flow gerar e devolve a midia.
// Toda a rede passa por aqui (o content script do Flow nao fala com o darktube).
// Por padrao so faz o ENSAIO (le as opcoes da conta). Gerar de verdade exige ligar no popup.

const FLOW_VERSION = '1.1.0';
const FLOW_ALARM = 'flow-tick';
const FLOW_JOB_TIMEOUT_MS = 15 * 60 * 1000;
const FLOW_SCAN_EVERY_MS = 20 * 60 * 1000;
const FLOW_DEFAULT_BASE = 'https://darktube.fjt-solutions.com';

let flowTicking = false;

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

const flowJson = { 'Content-Type': 'application/json' };

async function flowHeartbeat(c, caps) {
  const body = { version: FLOW_VERSION, mode: c.flow_live ? 'live' : 'dry' };
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

async function flowTick() {
  if (flowTicking) return;
  flowTicking = true;
  try {
    const c = await flowCfg();
    if (!c.darktube_token || !c.flow_enabled) return void (await flowStatus('desligado'));

    // Vigia: um job que ficou sem resposta da pagina por muito tempo.
    if (c.flow_current) {
      if (Date.now() - c.flow_current.startedAt > FLOW_JOB_TIMEOUT_MS) {
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
    if (!tab) return void (await flowStatus('sem_aba', { msg: 'Abra o Google Flow em uma aba deste Chrome.' }));
    const ping = await flowAsk(tab.id, { type: 'FLOW_PING' });
    if (!ping || !ping.ready) return void (await flowStatus('sem_projeto', { msg: 'Abra um projeto do Flow (com a caixa de prompt).' }));
    if (ping.busy) return void (await flowStatus('ocupado'));

    // Ensaio periodico: le as opcoes da conta e manda ao darktube.
    const stale = !c.flow_caps || Date.now() - c.flow_caps.at > FLOW_SCAN_EVERY_MS;
    if (stale) {
      const r = await flowAsk(tab.id, { type: 'FLOW_SCAN' });
      if (r && r.ok) {
        await chrome.storage.local.set({ flow_caps: { at: Date.now(), data: r.caps } });
        await flowHeartbeat(c, r.caps);
      }
    }

    if (!c.flow_live) return void (await flowStatus('ensaio', { msg: 'Modo ensaio: lê a conta, mas não gera nada.' }));

    const claim = await flowApi(c, '/api/flow/agent/claim', { method: 'POST' });
    if (!claim || !claim.job) {
      const why = { empty: 'Nada na fila.', paused: 'Pausado pelo darktube.', gap: 'Aguardando o intervalo entre gerações.', limit_hour: 'Limite por hora atingido.', limit_day: 'Limite diário atingido.', running: 'Há um job em andamento.' };
      return void (await flowStatus('aguardando', { msg: why[claim && claim.reason] || 'Nada na fila.' }));
    }
    await chrome.storage.local.set({ flow_current: { jobId: claim.job.id, kind: claim.job.kind, startedAt: Date.now() } });
    await flowStatus('gerando', { jobId: claim.job.id });
    const started = await flowAsk(tab.id, { type: 'FLOW_RUN_JOB', job: claim.job });
    if (!started || !started.started) {
      await flowFail(c, claim.job.id, 'A aba do Flow não aceitou o trabalho.', 'tab');
      await chrome.storage.local.remove('flow_current');
    }
  } catch (e) {
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
  try {
    if (!r.ok) {
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
    } else {
      throw new Error('A página não devolveu a mídia.');
    }
    const mime = flowMime(blob.type, r.kind);
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const fd = new FormData();
    fd.append('file', new File([blob], 'flow.' + ext, { type: mime }));
    const up = await fetch(`${c.base}/api/flow/agent/jobs/${msg.jobId}/complete`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + c.darktube_token }, body: fd,
    });
    if (!up.ok) throw new Error('O darktube recusou o arquivo (' + up.status + ').');
    await flowStatus('concluido', { jobId: msg.jobId });
  } catch (e) {
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
  if (msg.type === 'FLOW_SCAN_NOW') {
    (async () => {
      const c = await flowCfg();
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
  if (msg.type === 'FLOW_TICK_NOW') {
    flowTick().finally(() => sendResponse({ ok: true }));
    return true;
  }
});
