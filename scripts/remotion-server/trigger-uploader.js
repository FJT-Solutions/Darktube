/**
 * trigger-uploader.js - Dispara o despachante de redes sociais em background
 */

const { spawn } = require('child_process');
const path = require('path');

function triggerSocialUpload({
  outputFilePath,
  title = '',
  caption = '',
  link = '',
  videoUrl = '',
  platforms = 'all'
}) {
  try {
    const uploaderScript = path.resolve(__dirname, '../social-uploader/dispatcher.py');
    const finalCaption = caption || title || 'Novo clipe DarkTube #shorts #viral';

    console.log(`[Social Uploader] 🚀 Disparando upload multicanal em background...`);

    const fs = require('fs');
    let pythonCmd = process.env.PYTHON_CMD;
    if (!pythonCmd) {
      if (process.platform === 'win32') {
        pythonCmd = 'python';
      } else if (fs.existsSync('/usr/bin/python3')) {
        pythonCmd = '/usr/bin/python3';
      } else if (fs.existsSync('/usr/bin/python')) {
        pythonCmd = '/usr/bin/python';
      } else {
        pythonCmd = 'python3';
      }
    }

    const child = spawn(pythonCmd, [
      uploaderScript,
      '--video', outputFilePath,
      '--caption', finalCaption,
      '--title', title || 'DarkTube Clip',
      '--link', link,
      '--video-url', videoUrl,
      '--platforms', platforms
    ], {
      detached: true,
      stdio: 'ignore'
    });

    child.on('error', (err) => {
      console.warn(`[Social Uploader] Erro ao spawnar processo python (${pythonCmd}):`, err.message);
    });

    child.unref();
    console.log(`[Social Uploader] ✅ Processo em background iniciado com sucesso (PID: ${child.pid}).`);
    return true;
  } catch (err) {
    console.warn(`[Social Uploader] Aviso ao iniciar upload em background:`, err.message);
    return false;
  }
}

module.exports = { triggerSocialUpload };
