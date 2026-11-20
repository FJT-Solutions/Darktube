import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { ffmpegBin } from '@/lib/flow-assemble';
import { inspectRenderedVideo, type MotionCheckResult } from '@/lib/motion-checks';
import { formatDeliveryDuration } from '@/lib/render-timing';
import type { MouthCue } from '@/lib/puppet-studio';
import type { ThreeJsStoryboard } from '@/lib/threejs-scene-compiler';
import type { VoiceWord } from '@/lib/voice-resolver';

const runExec = promisify(execFile);

export interface RenderThreeJsOptions {
  storyboard: ThreeJsStoryboard;
  words: VoiceWord[];
  mouthCues?: MouthCue[];
  audioPath?: string;
  outputPath: string;
  isDraft?: boolean;
  generateContactSheet?: boolean;
  contactSheetPath?: string;
  onProgress?: (pct: number) => Promise<void> | void;
}

export interface RenderThreeJsResult {
  outputPath: string;
  contactSheetPath?: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  gpuAccelerated: boolean;
  motionCheck: MotionCheckResult;
  qaChecks: {
    scenesSampled: number;
    blankFramesDetected: number;
    passed: boolean;
  };
  renderDurationMs: number;
  renderDurationLabel: string;
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
  const renderStartMs = Date.now();
  const engineRoot = path.resolve(process.cwd(), 'public/threejs-engine');
  if (!fs.existsSync(path.join(engineRoot, 'engine/player.html'))) {
    throw new Error(`Motor Three.js não encontrado em ${engineRoot}`);
  }

  const forceSwift = process.env.THREEJS_FORCE_SWIFTSHADER === '1';
  const wantGpu = !forceSwift && (process.env.THREEJS_USE_GPU === '1' || process.platform !== 'linux');
  const isCpuVpsMedia = !wantGpu && !opts.isDraft && opts.storyboard.qualidade === 'media';
  const scale = opts.isDraft ? 0.5 : (isCpuVpsMedia ? 2 / 3 : 1);
  const width = Math.round(((opts.storyboard.formato?.largura || 1080) * scale) / 2) * 2;
  const height = Math.round(((opts.storyboard.formato?.altura || 1920) * scale) / 2) * 2;
  const fps = opts.isDraft ? Math.min(opts.storyboard.formato?.fps || 24, 24) : (opts.storyboard.formato?.fps || 30);
  const durationSec = Math.max(1, Number(opts.storyboard.duracao || 5));
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_3d_'));
  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  fs.writeFileSync(path.join(jobDir, 'storyboard.json'), JSON.stringify(opts.storyboard), 'utf8');
  fs.writeFileSync(path.join(jobDir, 'palavras.json'), JSON.stringify(opts.words || []), 'utf8');
  if (opts.mouthCues?.length) {
    fs.writeFileSync(path.join(jobDir, 'mouthCues.json'), JSON.stringify(opts.mouthCues), 'utf8');
  }

  let generatedContactSheetPath: string | undefined;
  let qaChecks = { scenesSampled: 0, blankFramesDetected: 0, passed: true };

  const { server, port } = await startThreeJsStaticServer(engineRoot, jobDir);
  const executablePath = findBrowserExecutable();
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--mute-audio',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    `--window-size=${width},${height}`,
  ];
  const swiftArgs = [...baseArgs, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const gpuArgs = [...baseArgs, '--use-gl=angle'];

  let gpuAccelerated = wantGpu;
  const { chromium } = await import('playwright-core');
  let browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: wantGpu ? gpuArgs : swiftArgs,
  }).catch(async () => {
    gpuAccelerated = false;
    return await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: swiftArgs,
    });
  });

  try {
    let page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const pageErrors: string[] = [];
    const attachListeners = (p: typeof page) => {
      p.on('console', (m) => {
        if (m.type() === 'error') pageErrors.push(m.text());
      });
      p.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
      p.on('response', (r) => {
        if (r.status() >= 400) pageErrors.push(`HTTP ${r.status()} em ${r.url()}`);
      });
    };
    attachListeners(page);
    const playerUrl = `http://127.0.0.1:${port}/threejs-engine/engine/player.html?projeto=job&render=1&w=${width}&h=${height}`;
    await page.goto(playerUrl, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction('window.__pronto === true || window.__erro', undefined, { timeout: 60_000 }).catch((e) => {
      throw new Error(`${e.message}${pageErrors.length ? ' | Detalhes página: ' + pageErrors.slice(0, 4).join(' ; ') : ''}`);
    });
    let pageErr = await page.evaluate(() => (window as any).__erro);
    if (pageErr && gpuAccelerated) {
      // Fallback automático para SwiftShader se WebGL de hardware falhar no host
      await browser.close().catch(() => {});
      gpuAccelerated = false;
      pageErrors.length = 0;
      browser = await chromium.launch({
        ...(executablePath ? { executablePath } : {}),
        headless: true,
        args: swiftArgs,
      });
      page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      attachListeners(page);
      await page.goto(playerUrl, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForFunction('window.__pronto === true || window.__erro', undefined, { timeout: 60_000 });
      pageErr = await page.evaluate(() => (window as any).__erro);
    }
    if (pageErr) throw new Error(`Erro no player 3D: ${pageErr}`);

    // Pre-Render Contact Sheet QA Gate: captura 1 still por cena antes de renderizar o MP4 inteiro
    if (opts.generateContactSheet !== false && Array.isArray(opts.storyboard.cenas) && opts.storyboard.cenas.length > 0) {
      const sampleScenes = opts.storyboard.cenas.slice(0, 16);
      const stillFiles: string[] = [];
      let blankCount = 0;
      for (let sIdx = 0; sIdx < sampleScenes.length; sIdx++) {
        const sc = sampleScenes[sIdx];
        const sIni = Number(sc.inicio || 0);
        const sFim = Number(sc.fim || sIni + 2);
        const midT = Math.min(durationSec, Math.max(0, sIni + (sFim - sIni) * 0.5));
        await page.evaluate((sec) => (window as any).renderAt(sec), midT);
        const shotBuf = await page.screenshot({ type: 'jpeg', quality: 82, timeout: 25_000 });
        if (shotBuf.length < 1500) blankCount++;
        const shotFile = path.join(jobDir, `qa_${String(sIdx).padStart(2, '0')}.jpg`);
        fs.writeFileSync(shotFile, shotBuf);
        stillFiles.push(shotFile);
      }
      qaChecks = {
        scenesSampled: stillFiles.length,
        blankFramesDetected: blankCount,
        passed: blankCount === 0,
      };
      if (stillFiles.length > 0) {
        const cols = Math.min(4, Math.ceil(Math.sqrt(stillFiles.length)));
        const rows = Math.max(1, Math.ceil(stillFiles.length / cols));
        const targetSheet =
          opts.contactSheetPath ||
          opts.outputPath.replace(/\.mp4$/i, '_contact_sheet.jpg');
        try {
          await runExec(
            ffmpegBin(),
            [
              '-y',
              '-loglevel',
              'error',
              '-i',
              path.join(jobDir, 'qa_%02d.jpg'),
              '-vf',
              `scale=320:-1,tile=${cols}x${rows}:padding=6:color=0x0f172a`,
              '-frames:v',
              '1',
              targetSheet,
            ],
            { timeout: 30_000, windowsHide: true }
          );
          if (fs.existsSync(targetSheet)) generatedContactSheetPath = targetSheet;
        } catch (sheetErr: any) {
          console.warn('[ThreeJS QA] Aviso ao gerar Contact Sheet:', sheetErr?.message || sheetErr);
        }
      }
    }

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
  const renderDurationMs = Math.max(0, Date.now() - renderStartMs);
  const renderDurationLabel = formatDeliveryDuration(renderDurationMs);
  console.log(
    `[ThreeJS Render] ✅ MP4 renderizado em ${renderDurationLabel} (${totalFrames} frames, ${durationSec}s, QA=${qaChecks.scenesSampled} cenas)`
  );

  return {
    outputPath: opts.outputPath,
    contactSheetPath: generatedContactSheetPath,
    width,
    height,
    fps,
    durationSec,
    totalFrames,
    gpuAccelerated,
    motionCheck,
    qaChecks,
    renderDurationMs,
    renderDurationLabel,
  };
}
