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

// ──────────────────────────────────────────────
// RENDER ASSÍNCRONO
// ──────────────────────────────────────────────
async function renderAsync(historyId, composition, callbackUrl) {
  const outputFilePath = path.join(OUTPUT_DIR, `render_${historyId || Date.now()}.mp4`);

  console.log(`[Remotion Render] Iniciando job: ${historyId}`);

  try {
    if (!bundledLocation) await initBundle();

    // Determinar dimensões pelo format
    const isVertical = (composition.format || 'vertical') === 'vertical';
    const width  = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    // Calcular duração total em frames (30fps)
    const fps = 30;
    const totalSeconds = composition.scenes.reduce(
      (sum, s) => sum + (s.durationSeconds || 5), 0
    );
    const durationInFrames = Math.ceil(totalSeconds * fps);

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
    });

    await renderMedia({
      composition: comp,
      serveUrl: bundledLocation,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency: 14, // 14 vCPUs da VPS
      imageFormat: 'jpeg',
      jpegQuality: 82,
      inputProps,
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

