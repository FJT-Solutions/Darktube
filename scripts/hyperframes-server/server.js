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

let removeBackground = null;
try {
  const bgRmModule = require('@imgly/background-removal-node');
  removeBackground = bgRmModule.removeBackground;
  console.log('[HyperFrames Cutout] Módulo @imgly/background-removal-node ativo!');
} catch (err) {
  console.log('[HyperFrames Cutout] Módulo de remoção de fundo desativado:', err.message);
}

// ──────────────────────────────────────────────
// AUTO-CUTOUT 2.5D — Separa Sujeito de Fundo em 1 imagem para HyperFrames
// ──────────────────────────────────────────────
async function processSceneCutouts(scenes) {
  if (!removeBackground || !scenes || scenes.length === 0) return;
  console.log('[HyperFrames Cutout] Analisando auto-recorte 2.5D para cenas...');

  const crypto = require('crypto');

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.imageUrl || scene.subjectImageUrl || scene.foregroundUrl) continue;
    const clean = scene.imageUrl.toLowerCase().split('?')[0];
    if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) continue;

    try {
      const hash = crypto.createHash('md5').update(scene.imageUrl).digest('hex');
      const fgFileName = `cutout_hf_${hash}.png`;
      const fgPath = path.join(OUTPUT_DIR, fgFileName);

      if (fs.existsSync(fgPath)) {
        console.log(`[HyperFrames Cutout] Camada 2.5D encontrada no cache para cena ${i + 1}`);
        const baseUrl = STORAGE_BASE_URL || `http://localhost:${PORT}`;
        scene.subjectImageUrl = `${baseUrl}/storage/${fgFileName}`;
        continue;
      }

      console.log(`[HyperFrames Cutout] Gerando camada 2.5D para cena ${i + 1}...`);
      const blob = await removeBackground(scene.imageUrl);
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(fgPath, buffer);

      const baseUrl = STORAGE_BASE_URL || `http://localhost:${PORT}`;
      const fgUrl = `${baseUrl}/storage/${fgFileName}`;

      scene.subjectImageUrl = fgUrl;
      console.log(`[HyperFrames Cutout] ✅ Cena ${i + 1} camada 2.5D pronta: ${fgUrl}`);
    } catch (err) {
      console.error(`[HyperFrames Cutout] ⚠️ Cutout da cena ${i + 1} ignorado:`, err.message);
    }
  }
}

// ──────────────────────────────────────────────
// PRÉ-CARREGAMENTO DE ÁUDIO (evita HTTP Range timeouts)
// ──────────────────────────────────────────────
async function processSceneAudios(composition) {
  if (!composition) return;
  const scenes = composition.scenes || [];
  console.log('[HyperFrames Audio] Pré-carregando áudios das cenas...');

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
      console.error(`[HyperFrames Audio] ⚠️ Falha ao pré-carregar áudio (${url}):`, err.message);
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

    // 1.5 Auto-cutout 2.5D para imagens de 1 camada
    if (payload && payload.scenes) {
      await processSceneCutouts(payload.scenes);
      await processSceneAudios(payload);
    }

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

    // 3.5. Corrigir vídeo invertido (bug do Headless Chromium — eixo Y invertido no captura)
    // O Puppeteer/Chromium em modo headless captura frames com o eixo Y espelhado.
    // A correção correta é rotacionar 180° (não apenas vflip que só espelha 1 eixo).
    const correctedPath = path.join(workDir, 'corrected.mp4');
    execSync(
      `ffmpeg -y -i "${silentPath}" -vf "rotate=PI" -c:v libx264 -preset fast -crf 18 -c:a copy "${correctedPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    );
    fs.renameSync(correctedPath, silentPath);
    console.log(`[HyperFrames] Correção de orientação (rotate=PI) aplicada: ${historyId}`);

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
// HELPER — Resolver audioUrl para path local
// Suporta: data:audio/mp3;base64,... | http(s):// | caminho local
// ──────────────────────────────────────────────
async function resolveAudioToLocalPath(audioUrl, localPath) {
  if (!audioUrl || typeof audioUrl !== 'string') return null;

  // data: URI — decodificar base64
  if (audioUrl.startsWith('data:')) {
    const commaIdx = audioUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const base64Data = audioUrl.slice(commaIdx + 1);
    fs.writeFileSync(localPath, Buffer.from(base64Data, 'base64'));
    return localPath;
  }

  // URL HTTP/HTTPS — baixar para arquivo local
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    const fetch = (await import('node-fetch')).default;
    const resp = await fetch(audioUrl);
    if (!resp.ok) {
      throw new Error(`Falha ao baixar áudio ${audioUrl}: HTTP ${resp.status}`);
    }
    const buffer = await resp.buffer();
    fs.writeFileSync(localPath, buffer);
    return localPath;
  }

  // Caminho local já existente
  if (fs.existsSync(audioUrl)) return audioUrl;

  return null;
}

// ──────────────────────────────────────────────
// MIXAR ÁUDIO COM FFMPEG
// Combina: narração por cena + música de fundo
// ──────────────────────────────────────────────
async function mixAudioTracks(silentVideoPath, payload, outputPath) {
  const { scenes = [], backgroundMusicUrl } = payload;
  const workDir = path.dirname(silentVideoPath);

  // Resolver todos os audioUrls para paths locais em paralelo
  const resolvedAudios = await Promise.all(
    scenes.map(async (scene, i) => {
      if (!scene.audioUrl) return null;
      const localPath = path.join(workDir, `audio_scene_${i}.mp3`);
      try {
        return await resolveAudioToLocalPath(scene.audioUrl, localPath);
      } catch (err) {
        console.error(`[HyperFrames] Erro ao resolver áudio da cena ${i}:`, err.message);
        return null;
      }
    })
  );

  // Verificar se há narração ou música
  const hasNarration = resolvedAudios.some(Boolean);
  const hasBGM = !!backgroundMusicUrl;

  // Se não há nada de áudio, apenas copia o vídeo
  if (!hasNarration && !hasBGM) {
    fs.copyFileSync(silentVideoPath, outputPath);
    console.log('[HyperFrames FFmpeg] Nenhum áudio encontrado, copiando vídeo sem áudio.');
    return;
  }

  // Montar inputs e filtros do FFmpeg
  let inputs      = [`-i "${silentVideoPath}"`];
  let filterParts = [];
  let audioInputIdx = 1;
  let narrationChunks = [];
  let timeOffset = 0;

  // === Narração por segmento ===
  scenes.forEach((scene, i) => {
    const resolvedPath = resolvedAudios[i];
    if (!resolvedPath) {
      timeOffset += scene.durationSeconds || 5;
      return;
    }

    inputs.push(`-i "${resolvedPath}"`);
    const idx   = audioInputIdx++;
    const delay = Math.round(timeOffset * 1000); // milissegundos

    filterParts.push(`[${idx}:a]adelay=${delay}|${delay}[nar${i}]`);
    narrationChunks.push(`[nar${i}]`);
    timeOffset += scene.durationSeconds || 5;
  });

  // Consolidar narrações em um único stream
  if (narrationChunks.length === 1) {
    // Com 1 narração, não usar amix — apenas renomear o label
    filterParts.push(`${narrationChunks[0]}anull[narration]`);
  } else if (narrationChunks.length > 1) {
    filterParts.push(`${narrationChunks.join('')}amix=inputs=${narrationChunks.length}:normalize=0:dropout_transition=0[narration]`);
  }

  // === Música de fundo ===
  if (hasBGM) {
    const bgmLocalPath = path.join(workDir, 'bgm.mp3');
    let bgmInput = backgroundMusicUrl;
    try {
      const resolved = await resolveAudioToLocalPath(backgroundMusicUrl, bgmLocalPath);
      if (resolved) bgmInput = resolved;
    } catch (err) {
      console.error('[HyperFrames] Erro ao resolver BGM:', err.message);
    }
    inputs.push(`-i "${bgmInput}"`);
    const bgIdx = audioInputIdx++;
    filterParts.push(`[${bgIdx}:a]volume=0.12[bgm]`);
  }

  // === Mistura final ===
  let finalAudioLabel;

  if (hasNarration && hasBGM) {
    filterParts.push('[narration][bgm]amix=inputs=2:normalize=0:dropout_transition=0[audio_out]');
    finalAudioLabel = '[audio_out]';
  } else if (hasNarration) {
    finalAudioLabel = '[narration]';
  } else {
    finalAudioLabel = '[bgm]';
  }

  const filterComplex = filterParts.join('; ');
  const ffmpegCmd = [
    'ffmpeg -y',
    inputs.join(' '),
    `-filter_complex "${filterComplex}"`,
    `-map 0:v -map "${finalAudioLabel}"`,
    '-c:v copy',
    '-c:a aac -b:a 192k',
    '-shortest',
    `"${outputPath}"`
  ].join(' ');

  console.log('[HyperFrames FFmpeg] Executando mixagem de áudio...');
  console.log('[HyperFrames FFmpeg] Cmd:', ffmpegCmd.substring(0, 300) + '...');
  execSync(ffmpegCmd, { timeout: 180000, stdio: 'pipe' });
  console.log('[HyperFrames FFmpeg] Mixagem concluída.');
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
