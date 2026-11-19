import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { chromium } from 'playwright-core';
import { ffmpegBin } from '@/lib/flow-assemble';
import { inspectRenderedVideo, type MotionCheckResult } from '@/lib/motion-checks';
import type { ThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import type { VoiceWord } from '@/lib/voice-resolver';

export interface RenderThreeJsOptions {
  storyboard: ThreeJsStoryboard;
  words: VoiceWord[];
  audioPath?: string;
  outputPath: string;
  isDraft?: boolean;
  onProgress?: (pct: number) => Promise<void> | void;
}

export interface RenderThreeJsResult {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  motionCheck: MotionCheckResult;
}

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
};

function findBrowserExecutable(): string | undefined {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];
  return candidates.find((p) => fs.existsSync(p));
}

function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer, isDead?: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isDead?.() || (stream as any).destroyed || (stream as any).writableEnded) {
      return reject(new Error('Stream do FFmpeg encerrado inesperadamente durante escrita de frame.'));
    }
    if (stream.write(chunk)) return resolve();
    const cleanup = () => {
      stream.off('drain', onDrain);
      stream.off('error', onError);
      stream.off('close', onClose);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('FFmpeg stdin fechou antes de concluir o drain.'));
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
    stream.once('close', onClose);
  });
}

function startThreeJsStaticServer(engineRoot: string, jobDir: string): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
    let targetFile = '';
    if (pathname.startsWith('/threejs-engine/')) {
      const rel = pathname.slice('/threejs-engine/'.length);
      targetFile = path.join(engineRoot, rel);
      if (!targetFile.startsWith(engineRoot)) {
        res.writeHead(403).end('forbidden');
        return;
      }
    } else if (pathname.startsWith('/job/')) {
      const rel = pathname.slice('/job/'.length);
      targetFile = path.join(jobDir, rel);
      if (!targetFile.startsWith(jobDir)) {
        res.writeHead(403).end('forbidden');
        return;
      }
    } else {
      res.writeHead(404).end('not found');
      return;
    }

    fs.readFile(targetFile, (err, data) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME_MAP[path.extname(targetFile)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('Porta HTTP inválida'));
      resolve({ server, port: addr.port });
    });
  });
}

export async function renderThreeJsToMp4(opts: RenderThreeJsOptions): Promise<RenderThreeJsResult> {
  const engineRoot = path.resolve(process.cwd(), 'public/threejs-engine');
  if (!fs.existsSync(path.join(engineRoot, 'engine/player.html'))) {
    throw new Error(`Motor Three.js não encontrado em ${engineRoot}`);
  }

  const scale = opts.isDraft ? 0.5 : 1;
  const width = Math.round((opts.storyboard.formato?.largura || 1080) * scale);
  const height = Math.round((opts.storyboard.formato?.altura || 1920) * scale);
  const fps = opts.isDraft ? Math.min(opts.storyboard.formato?.fps || 24, 24) : (opts.storyboard.formato?.fps || 30);
  const durationSec = Math.max(1, Number(opts.storyboard.duracao || 5));
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_3d_'));
  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  fs.writeFileSync(path.join(jobDir, 'storyboard.json'), JSON.stringify(opts.storyboard), 'utf8');
  fs.writeFileSync(path.join(jobDir, 'palavras.json'), JSON.stringify(opts.words || []), 'utf8');

  const { server, port } = await startThreeJsStaticServer(engineRoot, jobDir);
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--mute-audio',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      `--window-size=${width},${height}`,
    ],
  });

  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') pageErrors.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
    page.on('response', (r) => {
      if (r.status() >= 400) pageErrors.push(`HTTP ${r.status()} em ${r.url()}`);
    });
    await page.goto(
      `http://127.0.0.1:${port}/threejs-engine/engine/player.html?projeto=job&render=1&w=${width}&h=${height}`,
      { waitUntil: 'load', timeout: 60_000 }
    );
    await page.waitForFunction('window.__pronto === true || window.__erro', undefined, { timeout: 60_000 }).catch((e) => {
      throw new Error(`${e.message}${pageErrors.length ? ' | Detalhes página: ' + pageErrors.slice(0, 4).join(' ; ') : ''}`);
    });
    const pageErr = await page.evaluate(() => (window as any).__erro);
    if (pageErr) throw new Error(`Erro no player 3D: ${pageErr}`);

    const hasAudio = Boolean(opts.audioPath && fs.existsSync(opts.audioPath));
    const ffArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(fps),
      '-i', '-',
      ...(hasAudio
        ? ['-i', opts.audioPath as string]
        : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
      '-t', durationSec.toFixed(3),
      '-c:v', 'libx264',
      '-preset', opts.isDraft ? 'veryfast' : 'medium',
      '-crf', opts.isDraft ? '26' : '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      opts.outputPath,
    ];

    const ff = spawn(ffmpegBin(), ffArgs, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErr = '';
    ff.stdin.on('error', (err) => {
      ffErr += `\n[stdin] ${err.message}`;
    });
    ff.stderr.on('data', (d) => {
      ffErr += d.toString();
      if (ffErr.length > 5000) ffErr = ffErr.slice(-5000);
    });
    const ffDone = new Promise<void>((resolve, reject) => {
      ff.on('error', reject);
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg 3D falhou (${code}): ${ffErr.split('\n').slice(-5).join(' | ')}`));
      });
    });

    let lastPct = -1;
    for (let i = 0; i < totalFrames; i++) {
      if (ff.exitCode !== null || ff.killed) {
        throw new Error(`FFmpeg encerrou antes do fim no frame ${i}/${totalFrames}: ${ffErr.split('\n').slice(-5).join(' | ')}`);
      }
      const t = i / fps;
      await page.evaluate((sec) => (window as any).renderAt(sec), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: opts.isDraft ? 80 : 94, timeout: 30_000 });
      await writeChunk(ff.stdin, buf, () => ff.exitCode !== null || ff.killed);
      const pct = Math.floor(((i + 1) / totalFrames) * 95);
      if (opts.onProgress && pct >= lastPct + 10) {
        lastPct = pct;
        await opts.onProgress(pct);
      }
    }

    ff.stdin.end();
    await ffDone;
  } finally {
    await browser.close().catch(() => {});
    server.close();
    fs.rmSync(jobDir, { recursive: true, force: true });
  }

  const motionCheck = await inspectRenderedVideo(opts.outputPath, { ffmpegPath: ffmpegBin() });
  return {
    outputPath: opts.outputPath,
    width,
    height,
    fps,
    durationSec,
    totalFrames,
    motionCheck,
  };
}
