try { require('dotenv').config(); } catch (_) {}
const express = require('express');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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
// SERVIR arquivos renderizados e bundle do Remotion
// Cache-Control agressivo para que os workers do Chromium
// não façam re-fetch da mesma imagem em cada frame.
// ──────────────────────────────────────────────
app.use('/storage', express.static(OUTPUT_DIR, {
  maxAge: '1h',         // Chromium caches image in memory for 1h
  etag: false,          // Skip ETag computation overhead
  lastModified: false,  // Skip Last-Modified header computation
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=3600, immutable');
  }
}));
app.use('/bundle', (req, res, next) => {
  if (!bundledLocation) return res.status(503).send('Bundle Remotion ainda não está pronto');
  express.static(bundledLocation)(req, res, next);
});

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
  // 1. Dark Clips Direct Video Render
  if (req.body.compositionId === 'DarkClipsVideo' || (req.body.inputProps && !req.body.composition)) {
    return handleDarkClipsRender(req, res);
  }

  // 2. Story / n8n Multi-Scene Video Render
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

// ──────────────────────────────────────────────
// RENDER DARK CLIPS VIDEO (Meme / Clip 9:16)
// ──────────────────────────────────────────────
async function handleDarkClipsRender(req, res) {
  const {
    compositionId = 'DarkClipsVideo',
    inputProps = {},
    durationInFrames: requestedFrames,
    historyId,
    callbackUrl,
  } = req.body;

  const jobId = historyId || `dc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  if (!bundledLocation) {
    return res.status(503).json({ error: 'Bundle Remotion ainda não está pronto' });
  }

  console.log(`[Remotion DarkClips] Iniciando render do clipe ${jobId}...`);

  try {
    const serveUrl = bundledLocation;
    const outputFileName = `darkclip_${jobId}.mp4`;
    const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

    let resolvedVideoUrl = inputProps.videoUrl || '';
    if (resolvedVideoUrl.startsWith('/api/storage/')) {
      resolvedVideoUrl = `https://darktube.fjt-solutions.com${resolvedVideoUrl}`;
    }
    if (resolvedVideoUrl.startsWith('blob:')) {
      console.warn(`[Remotion DarkClips] Ignoring invalid browser blob URL: ${resolvedVideoUrl}`);
      resolvedVideoUrl = '';
    }

    const durationInSeconds = Number(inputProps.durationInSeconds) || 15;
    const durationInFrames = requestedFrames || Math.max(30, Math.round(durationInSeconds * 30));

    const finalInputProps = {
      ...inputProps,
      videoUrl: resolvedVideoUrl,
      durationInSeconds,
    };

    const chromiumArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-breakpad',
      '--mute-audio',
      '--no-first-run',
      '--js-flags=--max-old-space-size=8192',
      '--disable-features=site-per-process,IsolateOrigins',
      '--enable-features=SharedArrayBuffer',
    ];

    const comp = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: finalInputProps,
      durationInFrames,
      fps: 30,
      width: 1080,
      height: 1920,
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: chromiumArgs,
        enableMultiProcessOnLinux: true,
        gl: null,
      },
      timeoutInMilliseconds: 300_000,
      delayRenderTimeoutInMilliseconds: 300_000,
    });

    const concurrency = Math.max(1, Math.min(parseInt(process.env.RENDER_CONCURRENCY || '8', 10), 12));
    console.log(`[Remotion DarkClips] Renderizando ${comp.id} (${durationInFrames} frames, concorrência: ${concurrency})...`);

    await renderMedia({
      composition: comp,
      serveUrl,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency,
      maxRetries: 3,
      imageFormat: 'jpeg',
      jpegQuality: 90,
      inputProps: finalInputProps,
      gl: null,
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: chromiumArgs,
        enableMultiProcessOnLinux: true,
        gl: null,
      },
      onProgress: ({ progress, renderedDoneInFrames }) => {
        const pct = Math.floor(progress * 100);
        const done = renderedDoneInFrames || Math.floor(progress * comp.durationInFrames);
        if (pct % 20 === 0) {
          console.log(`[Remotion DarkClips] Progresso: ${pct}% (${done}/${comp.durationInFrames})`);
        }
      },
      timeoutInMilliseconds: 300_000,
      delayRenderTimeoutInMilliseconds: 300_000,
    });

    const videoUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/storage/${outputFileName}`
      : `/storage/${outputFileName}`;

    console.log(`[Remotion DarkClips] ✅ Render concluído: ${videoUrl}`);

    if (callbackUrl) {
      await sendCallback(callbackUrl, { historyId: jobId, status: 'completed', video_url: videoUrl });
    }
    
    if (!res.headersSent) {
      return res.json({
        success: true,
        videoUrl,
        jobId,
      });
    }
  } catch (err) {
    console.error(`[Remotion DarkClips] ERRO no render ${jobId}:`, err);
    if (callbackUrl) {
      await sendCallback(callbackUrl, { historyId: jobId, status: 'failed', error: err.message });
    }
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message || 'Erro de renderização' });
    }
  }
}

let removeBackground = null;
try {
  const bgRmModule = require('@imgly/background-removal-node');
  removeBackground = bgRmModule.removeBackground;
  console.log('[Remotion Cutout] Módulo @imgly/background-removal-node ativo!');
} catch (err) {
  console.log('[Remotion Cutout] Módulo de remoção de fundo desativado:', err.message);
}

// ──────────────────────────────────────────────
// PRÉ-DOWNLOAD E RECORTE 2.5D DE TODOS OS ASSETS
// Otimiza com sharp (max 1080x1920). Serve via HTTP local para manter
// inputProps leve (sem base64 gigante) e evitar OOM do Chromium.
// ──────────────────────────────────────────────
let sharp = null;
try {
  sharp = require('sharp');
} catch (_) {}

async function preloadAndProcessAllAssets(scenes) {
  if (!scenes || scenes.length === 0) return;
  console.log('[Remotion Assets] Pré-carregando, otimizando e baixando todas as mídias localmente...');

  const crypto = require('crypto');

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // 1. Baixar imageUrl principal se for remoto
    if (scene.imageUrl && scene.imageUrl.startsWith('http') && !scene.imageUrl.includes(`127.0.0.1:${PORT}`)) {
      try {
        const hash = crypto.createHash('md5').update(scene.imageUrl).digest('hex');
        const clean = scene.imageUrl.toLowerCase().split('?')[0];
        const isVideo = clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov');
        const ext = isVideo ? (clean.endsWith('.webm') ? 'webm' : 'mp4') : 'jpg';
        const fileName = `media_${hash}.${ext}`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        if (!fs.existsSync(filePath)) {
          console.log(`[Remotion Assets] Baixando mídia da cena ${i + 1}...`);
          try {
            const res = await fetch(scene.imageUrl, {
              headers: {
                'User-Agent': 'DarkTubeBot/2.0 (compatible; +https://darktube.fjt.solutions; contact@darktube.ai)',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              }
            });
            if (res.ok) {
              let buf = Buffer.from(await res.arrayBuffer());
              if (sharp && !isVideo) {
                try {
                  buf = await sharp(buf)
                    .resize({ width: 1080, height: 1920, fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85, mozjpeg: true })
                    .toBuffer();
                  console.log(`[Remotion Assets] ✅ Cena ${i + 1} otimizada com sharp (${Math.round(buf.length / 1024)}KB JPEG)`);
                } catch (err) {
                  console.warn(`[Remotion Assets] Aviso sharp cena ${i + 1}:`, err.message);
                }
              }
              fs.writeFileSync(filePath, buf);
            } else {
              console.warn(`[Remotion Assets] ⚠️ Servidor remoto retornou HTTP ${res.status} para cena ${i + 1}. Gerando fallback...`);
              if (sharp) {
                const fallbackBuf = await sharp({
                  create: { width: 1080, height: 1080, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } }
                }).jpeg({ quality: 85 }).toBuffer();
                fs.writeFileSync(filePath, fallbackBuf);
              }
            }
          } catch (fetchErr) {
            console.error(`[Remotion Assets] ⚠️ Erro fetch cena ${i + 1}:`, fetchErr.message);
          }
        }

        if (fs.existsSync(filePath)) {
          // ── FIX: Servir via HTTP local (não base64) para manter inputProps leve ──
          // Base64 de 292KB × 3 cenas × 12 workers = ~10MB de JSON por frame → OOM Chromium
          scene.imageUrl = `http://127.0.0.1:${PORT}/storage/${fileName}`;
          console.log(`[Remotion Assets] ✅ Cena ${i + 1} disponível local: /storage/${fileName}`);
        } else {
          scene.imageUrl = ''; // Remove URL quebrada para não travar o Remotion
        }
      } catch (err) {
        console.error(`[Remotion Assets] ⚠️ Falha ao baixar imagem da cena ${i + 1}:`, err.message);
      }
    }

    // 2. Baixar foregroundUrl se já fornecido externamente
    if (scene.foregroundUrl && scene.foregroundUrl.startsWith('http') && !scene.foregroundUrl.includes(`127.0.0.1:${PORT}`)) {
      try {
        const hash = crypto.createHash('md5').update(scene.foregroundUrl).digest('hex');
        const fileName = `fg_${hash}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        if (!fs.existsSync(filePath)) {
          const res = await fetch(scene.foregroundUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            }
          });
          if (res.ok) {
            let buf = Buffer.from(await res.arrayBuffer());
            if (sharp) {
              try {
                buf = await sharp(buf)
                  .resize({ width: 1080, height: 1920, fit: 'inside', withoutEnlargement: true })
                  .png({ compressionLevel: 9 })
                  .toBuffer();
              } catch (_) {}
            }
            fs.writeFileSync(filePath, buf);
          }
        }
        if (fs.existsSync(filePath)) {
          scene.foregroundUrl = `http://127.0.0.1:${PORT}/storage/${fileName}`;
        }
      } catch (err) {
        console.error(`[Remotion Assets] ⚠️ Falha ao baixar foreground da cena ${i + 1}:`, err.message);
      }
    }

    // 3. Processar auto-recorte 2.5D
    // ── FIX: o cutout usa o arquivo em DISCO (não data URI), pois @imgly não suporta "data:" protocol ──
    // Precisamos identificar o arquivo local pelo nome (derivado do hash da URL original)
    if (removeBackground && scene.imageUrl && scene.imageUrl.includes(`127.0.0.1:${PORT}/storage/`)) {
      const localFileName = scene.imageUrl.split('/storage/')[1];
      const isVideoFile = localFileName && (localFileName.endsWith('.mp4') || localFileName.endsWith('.webm'));
      if (localFileName && !isVideoFile && !scene.subjectImageUrl && !scene.foregroundUrl) {
        try {
          const localFilePath = path.join(OUTPUT_DIR, localFileName);
          const hash = crypto.createHash('md5').update(localFilePath).digest('hex');
          const fgFileName = `cutout_${hash}.png`;
          const fgPath = path.join(OUTPUT_DIR, fgFileName);

          if (fs.existsSync(fgPath)) {
            console.log(`[Remotion Cutout] Camada 2.5D encontrada no cache para cena ${i + 1}`);
            scene.subjectImageUrl = `http://127.0.0.1:${PORT}/storage/${fgFileName}`;
          } else if (fs.existsSync(localFilePath)) {
            console.log(`[Remotion Cutout] Gerando camada 2.5D para cena ${i + 1}...`);
            // Passar o caminho local como file:// URL — @imgly suporta file:// e http:// mas NÃO data:
            const fileUrl = `file://${localFilePath}`;
            const blob = await removeBackground(fileUrl);
            let buffer = Buffer.from(await blob.arrayBuffer());

            if (sharp) {
              try {
                buffer = await sharp(buffer)
                  .resize({ width: 1080, height: 1920, fit: 'inside', withoutEnlargement: true })
                  .png({ compressionLevel: 9, effort: 7 })
                  .toBuffer();
                console.log(`[Remotion Cutout] ✅ Cutout otimizado com sharp (${Math.round(buffer.length / 1024)}KB)`);
              } catch (_) {}
            }

            fs.writeFileSync(fgPath, buffer);
            scene.subjectImageUrl = `http://127.0.0.1:${PORT}/storage/${fgFileName}`;
            console.log(`[Remotion Cutout] ✅ Cena ${i + 1} camada 2.5D disponível: /storage/${fgFileName}`);
          }
        } catch (err) {
          console.error(`[Remotion Cutout] ⚠️ Cutout da cena ${i + 1} ignorado:`, err.message);
        }
      }
    }
  }
}

// ──────────────────────────────────────────────
// WATCHDOG: Mata Chromium zumbi após render (sucesso ou falha)
// ──────────────────────────────────────────────
function killZombieChromium() {
  try {
    execSync('killall -9 chromium 2>/dev/null || true', { stdio: 'pipe', timeout: 5000 });
    execSync('killall -9 chrome_crashpad_handler 2>/dev/null || true', { stdio: 'pipe', timeout: 5000 });
    console.log('[Remotion Watchdog] Chromium cleanup executado.');
  } catch (_) {
    // Silencioso — pode não haver processos para matar
  }
}

// ──────────────────────────────────────────────
// RENDER ASSÍNCRONO (com watchdog triplo)
// ──────────────────────────────────────────────
async function renderAsync(historyId, composition, callbackUrl) {
  const outputFilePath = path.join(OUTPUT_DIR, `render_${historyId || Date.now()}.mp4`);

  console.log(`[Remotion Render] Iniciando job: ${historyId}`);

  // ── WATCHDOG 1: Timeout global absoluto (baseado no número de frames) ──
  // Regra: máximo de 3 segundos de render por frame, mínimo 10 min, máximo 60 min
  const scenesList = composition.scenes || [];
  let estimatedFrames = 0;
  const fps = 30;
  const DEFAULT_TRANSITION_FRAMES = 18;
  for (let i = 0; i < scenesList.length; i++) {
    const scene = scenesList[i];
    estimatedFrames += Math.round((scene.durationSeconds || 5) * fps);
    if (i < scenesList.length - 1) {
      const tStyle = scene.transitionIn || 'fade';
      const tFrames = scene.transitionDurationFrames || (tStyle === 'none' ? 0 : DEFAULT_TRANSITION_FRAMES);
      estimatedFrames -= tFrames;
    }
  }
  const MAX_RENDER_SECONDS = Math.max(600, Math.min(3600, estimatedFrames * 3));
  console.log(`[Remotion Watchdog] Timeout global: ${MAX_RENDER_SECONDS}s (${(MAX_RENDER_SECONDS / 60).toFixed(1)} min) para ~${estimatedFrames} frames`);

  // ── WATCHDOG 2: Stall detector — aborta se sem progresso por 10 minutos ──
  const STALL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos sem progresso = abort
  let lastProgressTime = Date.now();
  let lastProgressPercent = -1;
  let stallCheckInterval = null;
  let renderAborted = false;

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

  // Timer global de watchdog
  const globalWatchdog = setTimeout(() => {
    console.error(`[Remotion Watchdog] ⛔ TIMEOUT GLOBAL: render excedeu ${MAX_RENDER_SECONDS}s. Forçando abort!`);
    renderAborted = true;
    if (abortController) abortController.abort();
    killZombieChromium();
  }, MAX_RENDER_SECONDS * 1000);

  // Intervalo de stall detection (checa a cada 60s)
  stallCheckInterval = setInterval(() => {
    const elapsed = Date.now() - lastProgressTime;
    if (elapsed > STALL_TIMEOUT_MS) {
      console.error(`[Remotion Watchdog] ⛔ STALL DETECTADO: sem progresso por ${(elapsed / 60000).toFixed(1)} min (último: ${lastProgressPercent}%). Forçando abort!`);
      renderAborted = true;
      if (abortController) abortController.abort();
      killZombieChromium();
    }
  }, 60_000);

  try {
    if (!bundledLocation) await initBundle();

    // Pré-carrega e baixa todos os assets localmente + gera recortes 2.5D
    await preloadAndProcessAllAssets(composition.scenes);

    // Determinar dimensões pelo format
    const isVertical = (composition.format || 'vertical') === 'vertical';
    const width  = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    // ── Calcular duração total EXATA em frames (30fps) ──
    let calcFrames = 0;
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

    // Serve o bundle via HTTP em 127.0.0.1 no Express
    const serveUrl = `http://127.0.0.1:${PORT}/bundle`;

    const chromiumArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-breakpad',
      '--mute-audio',
      '--no-first-run',
      '--js-flags=--max-old-space-size=12288',
      '--disable-features=site-per-process,IsolateOrigins',
      '--enable-features=SharedArrayBuffer',
    ];

    const comp = await selectComposition({
      serveUrl,
      id: 'ShortVideo',
      inputProps,
      durationInFrames,
      fps,
      width,
      height,
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: chromiumArgs,
        enableMultiProcessOnLinux: true,
        gl: null,
      },
      timeoutInMilliseconds: 300_000,
      delayRenderTimeoutInMilliseconds: 300_000,
    });

    // Concorrência dinâmica: respeita RENDER_CONCURRENCY (.env) ou payload (padrão: 6, máx: 16)
    const rawConcurrency = parseInt(composition.concurrency || process.env.RENDER_CONCURRENCY || '6', 10);
    const concurrency = Math.max(1, Math.min(rawConcurrency, 16));
    console.log(`[Remotion Render] Concorrência ativa: ${concurrency} workers (V8 heap: 12288MB, SHM: 12GB)`);

    let lastPercent = -1;
    await renderMedia({
      composition: comp,
      serveUrl,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency,
      maxRetries: 5,
      imageFormat: 'jpeg',
      jpegQuality: 85,
      inputProps,
      gl: null,
      browserExecutable: CHROME_PATH,
      chromiumOptions: {
        disableWebSecurity: true,
        args: chromiumArgs,
        enableMultiProcessOnLinux: true,
        gl: null,
      },
      onProgress: ({ progress, renderedDoneInFrames }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== lastPercent) {
          lastPercent = pct;
          lastProgressPercent = pct;
          lastProgressTime = Date.now(); // Reset stall detector
          const doneFrames = renderedDoneInFrames || Math.floor(progress * comp.durationInFrames);
          console.log(`[Remotion Render] Renderizando: ${pct}% concluído (${doneFrames}/${comp.durationInFrames} frames)`);
        }
      },
      timeoutInMilliseconds: 300_000,
      delayRenderTimeoutInMilliseconds: 300_000,
    });

    if (renderAborted) throw new Error('Render abortado pelo watchdog (timeout ou stall)');

    console.log(`[Remotion Render] Concluído (vídeo silencioso): ${outputFilePath}`);

    // Mixar áudio via FFmpeg pós-renderização
    await mixAudioWithFFmpeg(outputFilePath, composition, historyId);
    console.log(`[Remotion Render] Concluído com áudio: ${outputFilePath}`);

    const videoUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/render_${historyId}.mp4`
      : `/storage/render_${historyId}.mp4`;

    await sendCallback(callbackUrl, { historyId, status: 'completed', video_url: videoUrl });

  } catch (error) {
    console.error(`[Remotion Render] ERRO job ${historyId}:`, error);
    await sendCallback(callbackUrl, {
      historyId,
      status: 'failed',
      error: renderAborted
        ? `Render abortado pelo watchdog após ${MAX_RENDER_SECONDS}s ou stall de 10min (último progresso: ${lastProgressPercent}%)`
        : (error.message || 'Erro de renderização Remotion'),
    });
  } finally {
    // ── WATCHDOG 3: Cleanup obrigatório (sempre executa) ──
    clearTimeout(globalWatchdog);
    if (stallCheckInterval) clearInterval(stallCheckInterval);
    killZombieChromium();
    console.log(`[Remotion Watchdog] Job ${historyId} finalizado. Todos os watchdogs desativados.`);
  }
}
// ──────────────────────────────────────────────
// MIXAR ÁUDIO VIA FFMPEG (pós-processamento, sem delayRender no Remotion)
// ──────────────────────────────────────────────
async function mixAudioWithFFmpeg(silentVideoPath, composition, historyId) {
  const { scenes = [], backgroundMusicUrl } = composition;
  const workDir = path.join('/tmp', `remotion_audio_${historyId}`);
  fs.mkdirSync(workDir, { recursive: true });

  const resolveAudio = async (audioUrl, localPath) => {
    if (!audioUrl) return null;
    if (audioUrl.startsWith('data:')) {
      const commaIdx = audioUrl.indexOf(',');
      if (commaIdx === -1) return null;
      fs.writeFileSync(localPath, Buffer.from(audioUrl.slice(commaIdx + 1), 'base64'));
      return localPath;
    }
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      try {
        const res = await fetch(audioUrl);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(localPath, buf);
        return localPath;
      } catch { return null; }
    }
    return fs.existsSync(audioUrl) ? audioUrl : null;
  };

  const resolvedAudios = await Promise.all(
    scenes.map((scene, i) => resolveAudio(scene.audioUrl, path.join(workDir, `nar_${i}.mp3`)))
  );

  const hasNarration = resolvedAudios.some(Boolean);
  const bgmPath = backgroundMusicUrl
    ? await resolveAudio(backgroundMusicUrl, path.join(workDir, 'bgm.mp3'))
    : null;

  if (!hasNarration && !bgmPath) {
    console.log('[Remotion FFmpeg] Nenhum áudio disponível, vídeo permanece mudo.');
    return silentVideoPath;
  }

  const outputPath = path.join(workDir, 'final_with_audio.mp4');

  let inputs = [`-i "${silentVideoPath}"`];
  let filterParts = [];
  let audioInputIdx = 1;
  let narrationChunks = [];
  let timeOffset = 0;

  // Adicionar narrações com delay por cena
  scenes.forEach((scene, i) => {
    const resolved = resolvedAudios[i];
    if (!resolved) { timeOffset += scene.durationSeconds || 5; return; }
    inputs.push(`-i "${resolved}"`);
    const delay = Math.round(timeOffset * 1000);
    filterParts.push(`[${audioInputIdx}:a]adelay=${delay}|${delay}[nar${i}]`);
    narrationChunks.push(`[nar${i}]`);
    audioInputIdx++;
    timeOffset += scene.durationSeconds || 5;
  });

  // Consolidar narrações
  if (narrationChunks.length === 1) {
    filterParts.push(`${narrationChunks[0]}anull[narration]`);
  } else if (narrationChunks.length > 1) {
    filterParts.push(`${narrationChunks.join('')}amix=inputs=${narrationChunks.length}:normalize=0:dropout_transition=0[narration]`);
  }

  // Adicionar BGM se existir
  let finalAudio = '';
  if (bgmPath) {
    inputs.push(`-i "${bgmPath}"`);
    filterParts.push(`[${audioInputIdx}:a]volume=0.12[bgm]`);
    if (narrationChunks.length > 0) {
      filterParts.push('[narration][bgm]amix=inputs=2:normalize=0:dropout_transition=0[audio_out]');
      finalAudio = '[audio_out]';
    } else {
      finalAudio = '[bgm]';
    }
  } else {
    finalAudio = narrationChunks.length > 0 ? '[narration]' : '';
  }

  const filterGraph = filterParts.join('; ');
  const ffmpegCmd = [
    'ffmpeg -y',
    inputs.join(' '),
    `-filter_complex "${filterGraph}"`,
    `-map 0:v -map "${finalAudio}"`,
    '-c:v copy -c:a aac -b:a 128k -shortest',
    `"${outputPath}"`,
  ].join(' ');

  console.log('[Remotion FFmpeg] Mixando áudio...');
  execSync(ffmpegCmd, { timeout: 300_000, stdio: 'pipe' });

  // Substituir o arquivo original pelo com áudio
  fs.renameSync(outputPath, silentVideoPath);
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}

  console.log('[Remotion FFmpeg] Áudio mixado com sucesso.');
  return silentVideoPath;
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

