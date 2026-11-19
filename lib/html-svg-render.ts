import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { chromium } from 'playwright-core';
import { ffmpegBin } from './flow-assemble';
import { inspectRenderedVideo, type MotionCheckResult } from './motion-checks';
import {
  compileHtmlSvgDocument,
  type HtmlSvgProjectSpec,
} from './html-svg-templates';

export interface HtmlSvgRenderOptions {
  spec: HtmlSvgProjectSpec;
  outputPath: string;
  draft?: boolean;
  audioPath?: string;
}

export interface HtmlSvgRenderResult {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  palette: string[];
  motionCheck: MotionCheckResult;
  timelineIssues: { errors: string[]; warnings: string[] };
}

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

function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream.write(chunk)) return resolve();
    stream.once('drain', resolve);
    stream.once('error', reject);
  });
}

/**
 * Renderiza uma composicao HTML + SVG frame a frame (deterministica via window.__dtSeek)
 * usando Playwright Chromium + FFmpeg, rodando Motion Checks automaticos no MP4 final.
 */
export async function renderHtmlSvgToMp4(opts: HtmlSvgRenderOptions): Promise<HtmlSvgRenderResult> {
  const compiled = compileHtmlSvgDocument(opts.spec, Boolean(opts.draft));
  if (compiled.timelineIssues.errors.length > 0) {
    throw new Error(`Falha na validação pré-render (Motion Checks): ${compiled.timelineIssues.errors.join(' | ')}`);
  }

  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
  });

  const tmpHtml = path.join(os.tmpdir(), `dt_htmlsvg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.html`);
  fs.writeFileSync(tmpHtml, compiled.html, 'utf8');

  const totalFrames = Math.max(1, Math.round(compiled.durationSec * compiled.fps));

  try {
    const page = await browser.newPage({
      viewport: { width: compiled.width, height: compiled.height },
      deviceScaleFactor: 1,
    });

    await page.goto(`file://${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
    }).catch(() => {});

    const hasAudioFile = Boolean(opts.audioPath && fs.existsSync(opts.audioPath));
    const ffArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(compiled.fps),
      '-i', '-',
      ...(hasAudioFile
        ? ['-i', opts.audioPath as string]
        : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
      '-t', compiled.durationSec.toFixed(3),
      '-c:v', 'libx264',
      '-preset', opts.draft ? 'ultrafast' : 'veryfast',
      '-crf', opts.draft ? '24' : '19',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      opts.outputPath,
    ];

    const ff = spawn(ffmpegBin(), ffArgs, { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErr = '';
    ff.stderr.on('data', (d) => {
      ffErr += d.toString();
      if (ffErr.length > 6000) ffErr = ffErr.slice(-6000);
    });
    const ffDone = new Promise<void>((resolve, reject) => {
      ff.on('error', reject);
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg encerrou com código ${code}: ${ffErr.split('\n').slice(-6).join(' | ')}`));
      });
    });

    for (let f = 0; f < totalFrames; f++) {
      const t = f / compiled.fps;
      await page.evaluate(
        ({ timeSec, frameIdx, fpsVal, durVal }) => {
          const w = window as any;
          if (typeof w.__dtSeek === 'function') {
            w.__dtSeek(timeSec, frameIdx, fpsVal, durVal);
          } else if (w.__timelines && typeof w.__timelines === 'object') {
            Object.values(w.__timelines).forEach((tl: any) => {
              if (tl && typeof tl.seek === 'function') tl.seek(timeSec, false);
            });
          }
        },
        { timeSec: t, frameIdx: f, fpsVal: compiled.fps, durVal: compiled.durationSec }
      );
      const buf = await page.screenshot({ type: 'jpeg', quality: opts.draft ? 82 : 92 });
      await writeChunk(ff.stdin, buf);
    }

    ff.stdin.end();
    await ffDone;
  } finally {
    await browser.close().catch(() => {});
    if (fs.existsSync(tmpHtml)) {
      try { fs.unlinkSync(tmpHtml); } catch {}
    }
  }

  const motionCheck = await inspectRenderedVideo(opts.outputPath, {
    ffmpegPath: ffmpegBin(),
    expectedColors: compiled.palette,
  });

  return {
    outputPath: opts.outputPath,
    width: compiled.width,
    height: compiled.height,
    fps: compiled.fps,
    durationSec: compiled.durationSec,
    totalFrames,
    palette: compiled.palette,
    motionCheck,
    timelineIssues: compiled.timelineIssues,
  };
}
