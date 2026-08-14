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
// ──────────────────────────────────────────────
app.use('/storage', express.static(OUTPUT_DIR));
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
// PRÉ-DOWNLOAD E RECORTE 2.5D DE TODOS OS ASSETS
// Garante 0% de requisições externas durante a renderização do Remotion
// ──────────────────────────────────────────────
async function preloadAndProcessAllAssets(scenes) {
  if (!scenes || scenes.length === 0) return;
  console.log('[Remotion Assets] Pré-carregando e baixando todas as mídias localmente...');

  const crypto = require('crypto');

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // 1. Baixar imageUrl principal se for remoto
    if (scene.imageUrl && scene.imageUrl.startsWith('http') && !scene.imageUrl.includes(`127.0.0.1:${PORT}`)) {
      try {
        const hash = crypto.createHash('md5').update(scene.imageUrl).digest('hex');
        const clean = scene.imageUrl.toLowerCase().split('?')[0];
        const ext = clean.endsWith('.png') ? 'png' : clean.endsWith('.webp') ? 'webp' : clean.endsWith('.mp4') ? 'mp4' : 'jpg';
        const fileName = `media_${hash}.${ext}`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        if (!fs.existsSync(filePath)) {
          console.log(`[Remotion Assets] Baixando mídia da cena ${i + 1}...`);
          const res = await fetch(scene.imageUrl);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(filePath, buf);
          }
        }
        if (fs.existsSync(filePath)) {
          scene.imageUrl = `http://127.0.0.1:${PORT}/storage/${fileName}`;
          console.log(`[Remotion Assets] ✅ Cena ${i + 1} imagem local: /storage/${fileName}`);
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
          const res = await fetch(scene.foregroundUrl);
          if (res.ok) {
            fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
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
    if (removeBackground && scene.imageUrl && !scene.subjectImageUrl && !scene.foregroundUrl) {
      const clean = scene.imageUrl.toLowerCase().split('?')[0];
      if (!clean.endsWith('.mp4') && !clean.endsWith('.webm') && !clean.endsWith('.mov')) {
        try {
          const hash = crypto.createHash('md5').update(scene.imageUrl).digest('hex');
          const fgFileName = `cutout_${hash}.png`;
          const fgPath = path.join(OUTPUT_DIR, fgFileName);

          if (fs.existsSync(fgPath)) {
            console.log(`[Remotion Cutout] Camada 2.5D encontrada no cache para cena ${i + 1}`);
            scene.subjectImageUrl = `http://127.0.0.1:${PORT}/storage/${fgFileName}`;
            continue;
          }

          console.log(`[Remotion Cutout] Gerando camada 2.5D para cena ${i + 1}...`);
          const blob = await removeBackground(scene.imageUrl);
          const buffer = Buffer.from(await blob.arrayBuffer());
          fs.writeFileSync(fgPath, buffer);

          scene.subjectImageUrl = `http://127.0.0.1:${PORT}/storage/${fgFileName}`;
          console.log(`[Remotion Cutout] ✅ Cena ${i + 1} camada 2.5D pronta: /storage/${fgFileName}`);
        } catch (err) {
          console.error(`[Remotion Cutout] ⚠️ Cutout da cena ${i + 1} ignorado:`, err.message);
        }
      }
    }
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

    // Pré-carrega e baixa todos os assets localmente + gera recortes 2.5D
    await preloadAndProcessAllAssets(composition.scenes);

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

    // Serve o bundle via HTTP em 127.0.0.1 no Express
    const serveUrl = `http://127.0.0.1:${PORT}/bundle`;

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

    // Concorrência estável: 4 a 6 workers é o ideal para evitar lock de CPU e esgotamento de memória em vídeos longos
    const rawConcurrency = parseInt(composition.concurrency || process.env.RENDER_CONCURRENCY || '4', 10);
    const concurrency = Math.max(1, Math.min(rawConcurrency, 6));
    console.log(`[Remotion Render] Concorrência ativa: ${concurrency} frames simultâneos em paralelo`);

    let lastPercent = -1;
    await renderMedia({
      composition: comp,
      serveUrl,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency,
      imageFormat: 'jpeg',
      jpegQuality: 82,
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
          const doneFrames = renderedDoneInFrames || Math.floor(progress * comp.durationInFrames);
          console.log(`[Remotion Render] Renderizando: ${pct}% concluído (${doneFrames}/${comp.durationInFrames} frames)`);
        }
      },
      timeoutInMilliseconds: 300_000,
      delayRenderTimeoutInMilliseconds: 300_000,
    });

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
      error: error.message || 'Erro de renderização Remotion',
    });
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

