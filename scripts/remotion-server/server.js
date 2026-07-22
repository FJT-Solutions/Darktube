const express = require('express');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
let bundledLocation = null;

// Pre-bundle the Remotion compositions on server startup
async function initBundle() {
  console.log('[Remotion Service] Iniciando compilação do bundle Remotion...');
  try {
    const entryPoint = path.join(__dirname, '../../remotion/index.tsx');
    bundledLocation = await bundle({
      entryPoint,
    });
    console.log('[Remotion Service] Bundle compilado com sucesso em:', bundledLocation);
  } catch (err) {
    console.error('[Remotion Service] Erro ao compilar bundle:', err);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', bundled: !!bundledLocation });
});

app.post('/render', async (req, res) => {
  const { historyId, templateId, payload, callbackUrl } = req.body;

  if (!payload || !callbackUrl) {
    return res.status(400).json({ error: 'payload e callbackUrl são obrigatórios' });
  }

  // Responder 202 imediatamente (Render assíncrono em background)
  res.status(202).json({
    success: true,
    message: 'Renderização iniciada em background na VPS (n8n Project).',
    historyId,
  });

  // Executar renderização em background
  try {
    if (!bundledLocation) {
      await initBundle();
    }

    const compositionId = payload.compositionId || 'ShortVideo';
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilePath = path.join(outputDir, `render_${historyId || Date.now()}.mp4`);

    console.log(`[Remotion Render] Iniciando renderização para Job: ${historyId} com concorrência: 14`);

    const composition = await selectComposition({
      serveUrl: bundledLocation,
      id: compositionId,
      inputProps: payload,
    });

    await renderMedia({
      composition,
      serveUrl: bundledLocation,
      outputLocation: outputFilePath,
      codec: 'h264',
      concurrency: 14, // 14 vCPUs da VPS Hetzner
      imageFormat: 'jpeg',
      jpegQuality: 80,
    });

    console.log(`[Remotion Render] Renderização concluída: ${outputFilePath}`);

    // Disparar Webhook de conclusão de volta ao Darktube
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyId,
        status: 'completed',
        videoUrl: `/storage/${path.basename(outputFilePath)}`,
      }),
    });
  } catch (error) {
    console.error(`[Remotion Render] Erro ao renderizar vídeo ${historyId}:`, error);

    // Notificar falha via Webhook
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId,
          status: 'failed',
          error: error.message || 'Erro de renderização no Remotion',
        }),
      });
    } catch (e) {
      console.error('Erro ao enviar callback de erro:', e);
    }
  }
});

app.listen(PORT, () => {
  console.log(`[Remotion Service] Rodando na porta ${PORT}`);
  initBundle();
});
