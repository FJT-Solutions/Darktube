const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateCompositionHTML } = require('./template-generator');

const app  = express();
app.use(express.json({ limit: '50mb' }));

const PORT       = process.env.PORT || 3002;
const OUTPUT_DIR = path.join(__dirname, 'output');
const STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || '';

// Garantir diretório de output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ──────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hyperframes-service',
    version: '1.0.0',
  });
});

// ──────────────────────────────────────────────
// RENDER — Vídeo completo (async)
// ──────────────────────────────────────────────
app.post('/render', async (req, res) => {
  const { historyId, templateId, payload, callbackUrl } = req.body;

  if (!payload || !callbackUrl) {
    return res.status(400).json({ error: 'payload e callbackUrl são obrigatórios' });
  }

  // Responde 202 imediatamente
  res.status(202).json({
    success: true,
    message: 'Renderização HyperFrames iniciada em background.',
    historyId,
  });

  // Dispara render em background
  renderVideoAsync(historyId, payload, callbackUrl);
});

// ──────────────────────────────────────────────
// THUMBNAIL — Apenas 1 frame PNG (síncrono)
// ──────────────────────────────────────────────
app.post('/thumbnail', async (req, res) => {
  const { historyId, payload } = req.body;

  if (!payload) {
    return res.status(400).json({ error: 'payload é obrigatório' });
  }

  const workDir     = path.join('/tmp', `hf_thumb_${historyId || Date.now()}`);
  const thumbPath   = path.join(OUTPUT_DIR, `thumb_${historyId || Date.now()}.jpg`);

  try {
    fs.mkdirSync(workDir, { recursive: true });

    // Gerar HTML da composição
    const html = generateCompositionHTML(payload);
    fs.writeFileSync(path.join(workDir, 'index.html'), html);

    // Renderizar apenas frame 0 como PNG
    const silentVideo = path.join(workDir, 'silent.mp4');
    execSync(
      `${path.join(__dirname, 'node_modules/.bin/hyperframes')} render ${workDir} --output ${silentVideo}`,
      { timeout: 120000, stdio: 'pipe' }
    );

    // Extrair frame 0 (thumbnail)
    execSync(
      `ffmpeg -y -i "${silentVideo}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbPath}"`,
      { stdio: 'pipe' }
    );

    const thumbnailUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/thumb_${historyId}.jpg`
      : `/storage/thumb_${historyId}.jpg`;

    res.json({ success: true, thumbnailUrl });

  } catch (err) {
    console.error('[HyperFrames /thumbnail] Erro:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
  }
});

// ──────────────────────────────────────────────
// SERVIR arquivos de output (vídeos/thumbnails)
// ──────────────────────────────────────────────
app.use('/storage', express.static(OUTPUT_DIR));

// ──────────────────────────────────────────────
// RENDER ASSÍNCRONO
// ──────────────────────────────────────────────
async function renderVideoAsync(historyId, payload, callbackUrl) {
  const workDir    = path.join('/tmp', `hf_${historyId}`);
  const videoPath  = path.join(OUTPUT_DIR, `render_${historyId}.mp4`);
  const thumbPath  = path.join(OUTPUT_DIR, `thumb_${historyId}.jpg`);
  const silentPath = path.join(workDir, 'silent.mp4');
  const finalPath  = path.join(workDir, 'final.mp4');

  console.log(`[HyperFrames] Iniciando render job: ${historyId}`);

  try {
    // 1. Criar diretório de trabalho
    fs.mkdirSync(workDir, { recursive: true });

    // 2. Gerar HTML da composição
    console.log(`[HyperFrames] Gerando HTML para job: ${historyId}`);
    const html = generateCompositionHTML(payload);
    fs.writeFileSync(path.join(workDir, 'index.html'), html);

    // 3. Render visual (sem áudio) via Hyperframes CLI
    console.log(`[HyperFrames] Renderizando vídeo visual: ${historyId}`);
    execSync(
      `${path.join(__dirname, 'node_modules/.bin/hyperframes')} render ${workDir} --output ${silentPath}`,
      { timeout: 600000, stdio: 'pipe' } // 10 minutos max
    );
    console.log(`[HyperFrames] Vídeo visual renderizado: ${historyId}`);

    // 4. Extrair thumbnail (frame em 1s)
    execSync(
      `ffmpeg -y -i "${silentPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbPath}"`,
      { stdio: 'pipe' }
    );
    console.log(`[HyperFrames] Thumbnail extraída: ${historyId}`);

    // 5. Mixar áudio com FFmpeg
    await mixAudioTracks(silentPath, payload, finalPath);
    console.log(`[HyperFrames] Áudio mixado: ${historyId}`);

    // 6. Mover para output final
    fs.renameSync(finalPath, videoPath);

    const videoUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/render_${historyId}.mp4`
      : `/storage/render_${historyId}.mp4`;

    const thumbnailUrl = STORAGE_BASE_URL
      ? `${STORAGE_BASE_URL}/thumb_${historyId}.jpg`
      : `/storage/thumb_${historyId}.jpg`;

    console.log(`[HyperFrames] Render concluído: ${historyId}`);

    // 7. Callback de sucesso
    await sendCallback(callbackUrl, {
      historyId,
      status: 'completed',
      videoUrl,
      thumbnailUrl,
    });

  } catch (error) {
    console.error(`[HyperFrames] ERRO no job ${historyId}:`, error.message);

    await sendCallback(callbackUrl, {
      historyId,
      status: 'failed',
      error: error.message || 'Erro de renderização HyperFrames',
    });

  } finally {
    // Limpar diretório de trabalho
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ──────────────────────────────────────────────
// MIXAR ÁUDIO COM FFMPEG
// Combina: narração por cena + música de fundo
// ──────────────────────────────────────────────
async function mixAudioTracks(silentVideoPath, payload, outputPath) {
  const { scenes = [], backgroundMusicUrl } = payload;

  // Coletar URLs de narração únicas por cena
  const narrationUrls = scenes
    .map(s => s.audioUrl)
    .filter(Boolean);

  // Se não há narração nem música, apenas copia o vídeo
  if (narrationUrls.length === 0 && !backgroundMusicUrl) {
    fs.copyFileSync(silentVideoPath, outputPath);
    return;
  }

  // Montar inputs do ffmpeg
  let inputs    = [`-i "${silentVideoPath}"`];
  let filterParts = [];
  let audioInputIdx = 1;

  // === Narração por segmento ===
  if (narrationUrls.length > 0) {
    // Montar concatenação das narrações com delay por cena
    let narrationChunks = [];
    let timeOffset = 0;

    scenes.forEach((scene, i) => {
      if (!scene.audioUrl) {
        timeOffset += scene.durationSeconds || 5;
        return;
      }

      let audioInput = scene.audioUrl;
      if (audioInput.startsWith('data:')) {
        const base64Data = audioInput.split(',')[1];
        if (base64Data) {
          const localAudioPath = path.join(path.dirname(silentVideoPath), `audio_scene_${i}.mp3`);
          fs.writeFileSync(localAudioPath, Buffer.from(base64Data, 'base64'));
          audioInput = localAudioPath;
        }
      }

      inputs.push(`-i "${audioInput}"`);
      const idx = audioInputIdx++;
      const delay = Math.round(timeOffset * 1000); // ms

      filterParts.push(`[${idx}:a]adelay=${delay}|${delay}[nar${i}]`);
      narrationChunks.push(`[nar${i}]`);
      timeOffset += scene.durationSeconds || 5;
    });

    if (narrationChunks.length > 0) {
      // Mixar todas as narrações em um stream
      filterParts.push(`${narrationChunks.join('')}amix=inputs=${narrationChunks.length}:normalize=0[narration]`);
    }
  }

  // === Música de fundo ===
  if (backgroundMusicUrl) {
    inputs.push(`-i "${backgroundMusicUrl}"`);
    const bgIdx = audioInputIdx++;
    filterParts.push(`[${bgIdx}:a]volume=0.12[bgm]`);
  }

  // === Mistura final ===
  let finalAudioLabel;

  if (narrationUrls.length > 0 && backgroundMusicUrl) {
    filterParts.push('[narration][bgm]amix=inputs=2:normalize=0[audio_out]');
    finalAudioLabel = '[audio_out]';
  } else if (narrationUrls.length > 0) {
    finalAudioLabel = '[narration]';
  } else if (backgroundMusicUrl) {
    finalAudioLabel = '[bgm]';
  }

  const filterComplex = filterParts.join('; ');
  const ffmpegCmd = [
    'ffmpeg -y',
    inputs.join(' '),
    filterComplex ? `-filter_complex "${filterComplex}"` : '',
    filterComplex ? `-map 0:v -map "${finalAudioLabel}"` : '-map 0:v',
    '-c:v copy',
    '-c:a aac -b:a 192k',
    '-shortest',
    `"${outputPath}"`
  ].filter(Boolean).join(' ');

  console.log('[HyperFrames FFmpeg] Executando mixagem de áudio...');
  execSync(ffmpegCmd, { timeout: 120000, stdio: 'pipe' });
}

// ──────────────────────────────────────────────
// HELPER — Disparar callback
// ──────────────────────────────────────────────
async function sendCallback(url, body) {
  try {
    let targetUrl = url || '';
    if (targetUrl.includes('localhost:5678')) {
      targetUrl = targetUrl.replace('http://localhost:5678', 'https://n8n.fjt-solutions.com');
    }
    const fetch = (await import('node-fetch')).default;
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(`[HyperFrames] Callback enviado para: ${targetUrl}`);
  } catch (err) {
    console.error('[HyperFrames] Erro ao enviar callback:', err.message);
  }
}

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[HyperFrames Service] Rodando na porta ${PORT}`);
  console.log(`[HyperFrames Service] Output dir: ${OUTPUT_DIR}`);
});
