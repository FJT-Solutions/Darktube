const express = require('express');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;
const OUTPUT_DIR = path.join(__dirname, 'output');
const STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || '';

// Usa Chromium do sistema (instalado no Dockerfile via apt-get)
// Evita download de 90MB do Chrome Headless Shell a cada cold start
const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ||
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/usr/bin/chromium';

console.log('[Remotion Service] Chrome path:', CHROME_PATH);

let bundledLocation = null;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ──────────────────────────────────────────────
// PRÉ-BUNDLE ao iniciar (aquece o servidor)
// ──────────────────────────────────────────────
async function initBundle() {
  console.log('[Remotion Service] Compilando bundle...');
  try {
    const candidates = [
      path.join(__dirname, 'remotion/index.tsx'),
      path.join(__dirname, '../../remotion/index.tsx'),
      path.join(__dirname, '../remotion/index.tsx'),
      '/app/remotion/index.tsx',
    ];
    const entryPoint = candidates.find(c => fs.existsSync(c)) || candidates[0];
    console.log('[Remotion Service] entryPoint localizado:', entryPoint);
    bundledLocation = await bundle({ entryPoint });
    console.log('[Remotion Service] Bundle pronto:', bundledLocation);
  } catch (err) {
    console.error('[Remotion Service] Erro ao compilar bundle:', err);
  }
}

// ──────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bundled: !!bundledLocation });
});

// ──────────────────────────────────────────────
// SERVIR arquivos renderizados
// ──────────────────────────────────────────────
app.use('/storage', express.static(OUTPUT_DIR));

// ──────────────────────────────────────────────
// RENDER — aceita novo formato de payload
//
// Payload esperado do n8n:
// {
//   historyId: string,
//   templateId: string,
//   callbackUrl: string,
//   composition: {
//     scenes: SceneSegment[],
//     format: 'vertical' | 'horizontal',
//     captionStyle: 'pop' | 'karaoke' | 'subtitle',
//     primaryColor: string,
//     accentColor: string,
//     showWatermark: boolean,
//     watermarkText: string,
//     backgroundMusicUrl?: string,
//   }
// }
// ──────────────────────────────────────────────
app.post('/render', async (req, res) => {
  const { historyId, templateId, composition, callbackUrl } = req.body;

  if (!composition || !callbackUrl) {
    return res.status(400).json({ error: 'composition e callbackUrl são obrigatórios' });
  }

  if (!composition.scenes || composition.scenes.length === 0) {
    return res.status(400).json({ error: 'composition.scenes não pode estar vazio' });
  }

  // 202 imediato — render em background
  res.status(202).json({
    success: true,
    message: 'Renderização Remotion iniciada.',
    historyId,
  });

  renderAsync(historyId, composition, callbackUrl);
});

let removeBackground = null;
try {
  const bgRmModule = require('@imgly/background-removal-node');
  removeBackground = bgRmModule.removeBackground;
  console.log('[Remotion Cutout] Módulo @imgly/background-removal-node ativo!');
} catch (err) {
  console.log('[Remotion Cutout] Módulo de remoção de fundo desativado:', err.message);
}

// ──────────────────────────────────────────────
// AUTO-CUTOUT 2.5D — Separa Sujeito de Fundo automaticamente em 1 imagem
// ──────────────────────────────────────────────
async function processSceneCutouts(scenes) {
  if (!removeBackground || !scenes || scenes.length === 0) return;
  console.log('[Remotion Cutout] Analisando auto-recorte 2.5D para cenas...');

  const crypto = require('crypto');

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.imageUrl || scene.subjectImageUrl || scene.foregroundUrl) continue;
    const clean = scene.imageUrl.toLowerCase().split('?')[0];
    if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) continue;

    try {
      const hash = crypto.createHash('md5').update(scene.imageUrl).digest('hex');
      const fgFileName = `cutout_${hash}.png`;
      const fgPath = path.join(OUTPUT_DIR, fgFileName);

      if (fs.existsSync(fgPath)) {
        console.log(`[Remotion Cutout] Camada 2.5D encontrada no cache para cena ${i + 1}`);
        const baseUrl = STORAGE_BASE_URL || `http://localhost:${PORT}`;
        scene.subjectImageUrl = `${baseUrl}/storage/${fgFileName}`;
        continue;
      }

      console.log(`[Remotion Cutout] Gerando camada 2.5D para cena ${i + 1}...`);
      const blob = await removeBackground(scene.imageUrl);
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(fgPath, buffer);

      const baseUrl = STORAGE_BASE_URL || `http://localhost:${PORT}`;
      const fgUrl = `${baseUrl}/storage/${fgFileName}`;

      scene.subjectImageUrl = fgUrl;
      console.log(`[Remotion Cutout] ✅ Cena ${i + 1} camada 2.5D pronta: ${fgUrl}`);
    } catch (err) {
      console.error(`[Remotion Cutout] ⚠️ Cutout da cena ${i + 1} ignorado (fallback KenBurns ativo):`, err.message);
    }
  }
}

// ──────────────────────────────────────────────
// PRÉ-CARREGAMENTO DE ÁUDIO (evita HTTP Range timeouts no HTML5 <audio> do Chrome)
// ──────────────────────────────────────────────
async function processSceneAudios(composition) {
  if (!composition) return;
  const scenes = composition.scenes || [];
  console.log('[Remotion Audio] Pré-carregando áudios das cenas...');

  const fetchAudioAsBase64 = async (url) => {
    if (!url || !url.startsWith('http')) return url;
    try {
      const res = await fetch(url);
      if (!res.ok) return url;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = url.split('?')[0].endsWith('.wav') ? 'audio/wav' : 'audio/mp3';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error(`[Remotion Audio] ⚠️ Falha ao pré-carregar áudio (${url}):`, err.message);
      return url;
    }
  };

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.audioUrl) {
      scene.audioUrl = await fetchAudioAsBase64(scene.audioUrl);
    }
  }

  if (composition.backgroundMusicUrl) {
    composition.backgroundMusicUrl = await fetchAudioAsBase64(composition.backgroundMusicUrl);
  }
}

// ──────────────────────────────────────────────
// RENDER ASSÍNCRONO
// ──────────────────────────────────────────────
async function renderAsync(historyId, composition, callbackUrl) {
  const outputFilePath = path.join(OUTPUT_DIR, `render_${historyId || Date.now()}.mp4`);

  console.log(`[Remotion Render] Iniciando job: ${historyId}`);

  try {
    if (!bundledLocation) await initBundle();

    // Tenta gerar camadas 2.5D automaticamente para imagens de 1 camada
    await processSceneCutouts(composition.scenes);

    // Pré-carrega áudios para Base64 para buscar sem latência de rede
    await processSceneAudios(composition);

    // Determinar dimensões pelo format
    const isVertical = (composition.format || 'vertical') === 'vertical';
    const width  = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    // ── Calcular duração total EXATA em frames (30fps) descontando a sobreposição de transições ──
    const fps = 30;
    const DEFAULT_TRANSITION_FRAMES = 18;

    let calcFrames = 0;
    const scenesList = composition.scenes || [];
    for (let i = 0; i < scenesList.length; i++) {
      const scene = scenesList[i];
      const sceneDur = Math.round((scene.durationSeconds || 5) * fps);
      calcFrames += sceneDur;
      if (i < scenesList.length - 1) {
        const tStyle = scene.transitionIn || 'fade';
        const tFrames = scene.transitionDurationFrames || (tStyle === 'none' ? 0 : DEFAULT_TRANSITION_FRAMES);
        calcFrames -= tFrames;
      }
    }
    const durationInFrames = Math.max(30, calcFrames);
    console.log(`[Remotion Render] Duração exata calculada: ${durationInFrames} frames (${(durationInFrames / fps).toFixed(2)}s) para ${scenesList.length} cenas`);

    // inputProps = o que o ShortVideoComposition recebe via useVideoConfig + props
    const inputProps = {
      scenes:              composition.scenes,
      captionStyle:        composition.captionStyle        || 'pop',
      primaryColor:        composition.primaryColor        || '#EAB308',
      accentColor:         composition.accentColor         || '#FFFFFF',
      showWatermark:       composition.showWatermark       ?? true,
      watermarkText:       composition.watermarkText       || 'DarkTube AI',
      backgroundMusicUrl:  composition.backgroundMusicUrl  || '',
      format:              composition.format              || 'vertical',
    };

    const comp = await selectComposition({
      serveUrl: bundledLocation,
      id: 'ShortVideo',
      inputProps,
      // Override das dimensões dinâmicas
      durationInFrames,
      fps,
      width,
      height,
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        enableMultiProcessOnLinux: true,
      },
      timeoutInMilliseconds: 180_000,
      delayRenderTimeoutInMilliseconds: 180_000,
    });

    // ── Concorrência controlada para evitar OOM Kill ──
    // Exit 137 = OOM Kill. Com Chrome headless cada frame usa ~200-300MB.
    // 2 frames simultâneos é seguro para containers com 1-2GB de RAM.
    // Ajuste RENDER_CONCURRENCY no Dokploy se a VPS tiver mais memória disponível.
    const concurrency = parseInt(composition.concurrency || process.env.RENDER_CONCURRENCY || '8', 10);
    console.log(`[Remotion Render] Concorrência ativa: ${concurrency} frames simultâneos em paralelo`);

    let lastPercent = -1;
    await renderMedia({
      composition: comp,
      serveUrl: bundledLocation,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency,
      imageFormat: 'jpeg',
      jpegQuality: 82,
      inputProps,
      // Usa Chromium do sistema — sem download, sem OOM por download paralelo
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        enableMultiProcessOnLinux: true,
      },
      onProgress: ({ progress, renderedDoneInFrames }) => {
        const pct = Math.floor(progress * 100);
        if (pct % 2 === 0 && pct !== lastPercent) {
          lastPercent = pct;
          const doneFrames = renderedDoneInFrames || Math.floor(progress * comp.durationInFrames);
          console.log(`[Remotion Render] Renderizando: ${pct}% concluído (${doneFrames}/${comp.durationInFrames} frames)`);
        }
      },
      // Timeout por frame — evita hang se o browser travar
      timeoutInMilliseconds: 180_000,
      delayRenderTimeoutInMilliseconds: 180_000,
    });

    console.log(`[Remotion Render] Concluído: ${outputFilePath}`);

    const videoUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/render_${historyId}.mp4`
      : `/storage/render_${historyId}.mp4`;

    await sendCallback(callbackUrl, { historyId, status: 'completed', video_url: videoUrl });

  } catch (error) {
    console.error(`[Remotion Render] ERRO job ${historyId}:`, error);
    await sendCallback(callbackUrl, {
      historyId,
      status: 'failed',
      error: error.message || 'Erro de renderização Remotion',
    });
  }
}

async function sendCallback(url, body) {
  // n8n gera resumeUrl com localhost:5678, que não funciona entre containers Docker
  const N8N_EXTERNAL = process.env.N8N_EXTERNAL_URL || 'https://n8n.fjt-solutions.com';
  let fixedUrl = url;
  if (fixedUrl.includes('localhost:5678') || fixedUrl.includes('127.0.0.1:5678')) {
    fixedUrl = fixedUrl
      .replace('http://localhost:5678', N8N_EXTERNAL)
      .replace('http://127.0.0.1:5678', N8N_EXTERNAL);
    console.log(`[Remotion Callback] URL corrigida: ${fixedUrl}`);
  }

  const attempts = [fixedUrl];
  // Se a URL original era diferente, tentar também a original como fallback
  if (fixedUrl !== url) attempts.push(url);

  for (const tryUrl of attempts) {
    try {
      const resp = await fetch(tryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      console.log(`[Remotion Callback] Enviado com sucesso para ${tryUrl} (HTTP ${resp.status})`);
      return;
    } catch (err) {
      console.error(`[Remotion Callback] Falha em ${tryUrl}: ${err.message}`);
    }
  }
  console.error('[Remotion Callback] Todas as tentativas de callback falharam.');
}

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Remotion Service] Porta ${PORT}`);
  initBundle();
});

