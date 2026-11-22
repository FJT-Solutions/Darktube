import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { findBrowserExecutable } from './browser-executable';
import { ffmpegBin } from './flow-assemble';
import { formatDeliveryDuration } from './render-timing';
import { inspectRenderedVideo, type MotionCheckResult } from './motion-checks';
import { searchWikimediaImages } from './threejs-asset-hub';
import { auditContactSheetWithCritic, type VisualCriticReport } from './visual-critic';
import {
  compileHtmlSvgDocument,
  type HtmlSvgProjectSpec,
  type HtmlSvgSceneInput,
} from './html-svg-templates';
import {
  buildDefaultSilhouetteFilmScenes,
  writeSilhouetteAmbientWav,
} from './html-svg-silhouette-film';
import {
  buildDefaultAmpulhetaScenes,
  writeAmpulhetaAmbientWav,
} from './html-svg-ampulheta-doc';
import {
  buildDefaultWhatIfScenes,
  writeWhatIfAmbientWav,
} from './html-svg-whatif-studio';
import { buildDefault3dStageScenes } from './html-svg-3d-stage';

const runExec = promisify(execFile);

export interface HtmlSvgRenderOptions {
  spec: HtmlSvgProjectSpec;
  outputPath: string;
  draft?: boolean;
  audioPath?: string;
  autoEnrichMedia?: boolean;
  generateContactSheet?: boolean;
  contactSheetPath?: string;
}

export interface HtmlSvgRenderResult {
  outputPath: string;
  contactSheetPath?: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  palette: string[];
  motionCheck: MotionCheckResult;
  criticReport?: VisualCriticReport;
  timelineIssues: { errors: string[]; warnings: string[] };
  renderDurationMs: number;
  renderDurationLabel: string;
}

function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stream.write(chunk)) return resolve();
    const onDrain = () => {
      stream.removeListener('error', onError);
      resolve();
    };
    const onError = (err: Error) => {
      stream.removeListener('drain', onDrain);
      reject(err);
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
  });
}

function buildWikimediaSearchQuery(raw: string): string {
  const cleaned = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(teste|v5|v4|editorial|dossie|netflix|doc|vox|papercut|kaz|chart|de|da|do|das|dos|e|o|a|os|as|em|para|por|com|que|uma|um)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(' ').slice(0, 4).join(' ');
}

async function cacheRemoteImageToLocal(url: string, dir: string, index: number): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DarkTube-Studio/1.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return undefined;
    const ctype = String(res.headers.get('content-type') || '').toLowerCase();
    if (!ctype.startsWith('image/')) return undefined;
    const ext = ctype.includes('png') ? '.png' : ctype.includes('webp') ? '.webp' : '.jpg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return undefined;
    const filePath = path.join(dir, `media_${index}_${Date.now()}${ext}`);
    fs.writeFileSync(filePath, buf);
    return `file://${filePath.replace(/\\/g, '/')}`;
  } catch {
    return undefined;
  }
}

export async function enrichEditorialMedia(
  spec: HtmlSvgProjectSpec,
  assetDir: string,
  allowAutoSearch: boolean
): Promise<HtmlSvgProjectSpec> {
  const scenes = Array.isArray(spec.scenes) ? spec.scenes : [];
  if (scenes.length === 0) return spec;

  const isEditorial = spec.preset === 'html_svg_netflix_doc' || spec.preset === 'html_svg_vox_papercut';
  let fallbackPool: string[] = [];

  const updatedScenes: HtmlSvgSceneInput[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = { ...scenes[i] };
    let imgUrl = sc.imageUrl ? String(sc.imageUrl).trim() : '';

    if (!imgUrl && isEditorial && allowAutoSearch) {
      const qScene = buildWikimediaSearchQuery(sc.mediaQuery || sc.title || '');
      const qTitle = buildWikimediaSearchQuery(spec.title || '');
      let candidates = qScene ? await searchWikimediaImages(qScene, 6).catch(() => []) : [];
      if (candidates.length === 0 && qTitle && qTitle !== qScene) {
        if (fallbackPool.length === 0) {
          const pool = await searchWikimediaImages(qTitle, 8).catch(() => []);
          fallbackPool = pool.map((c) => c.thumbUrl || c.url).filter(Boolean);
        }
        imgUrl = fallbackPool[i % Math.max(1, fallbackPool.length)] || '';
      } else if (candidates.length > 0) {
        const chosen = candidates.find((c) => c.width >= 480) || candidates[0];
        imgUrl = chosen.thumbUrl || chosen.url;
      }
    }

    if (imgUrl && /^https?:\/\//i.test(imgUrl)) {
      const localUrl = await cacheRemoteImageToLocal(imgUrl, assetDir, i);
      if (localUrl) {
        sc.imageUrl = localUrl;
      } else {
        delete sc.imageUrl;
      }
    } else if (imgUrl) {
      sc.imageUrl = imgUrl;
    }

    if (sc.bgUrl && /^https?:\/\//i.test(String(sc.bgUrl))) {
      const localBg = await cacheRemoteImageToLocal(String(sc.bgUrl), assetDir, i * 100 + 1);
      if (localBg) sc.bgUrl = localBg;
    }

    if (Array.isArray(sc.layers) && sc.layers.length > 0) {
      const nextLayers = [];
      for (let li = 0; li < sc.layers.length; li++) {
        const layer: any = { ...sc.layers[li] };
        const rawUrl = layer.url || layer.bgUrl;
        if (rawUrl && /^https?:\/\//i.test(String(rawUrl))) {
          const localLayerUrl = await cacheRemoteImageToLocal(String(rawUrl), assetDir, i * 100 + 10 + li);
          if (localLayerUrl) {
            if (layer.url) layer.url = localLayerUrl;
            if (layer.bgUrl) layer.bgUrl = localLayerUrl;
          }
        }
        nextLayers.push(layer);
      }
      sc.layers = nextLayers;
    }

    updatedScenes.push(sc);
  }

  return { ...spec, scenes: updatedScenes };
}

/**
 * Mixes per-scene sound effects (scene.sfx, times relative to the retimed cut) over the narration track.
 */
async function mixSceneSfx(
  videoPath: string,
  scenes: HtmlSvgSceneInput[],
  cuts: Array<{ start: number; end: number }>,
  assetDir: string,
  durationSec: number
): Promise<void> {
  const items: Array<{ file: string; atMs: number; volume: number }> = [];
  for (let i = 0; i < scenes.length && i < cuts.length; i++) {
    for (const fx of scenes[i].sfx || []) {
      if (!fx?.url) continue;
      let file = fx.url.startsWith('file://') ? fx.url.replace(/^file:\/\//, '') : fx.url;
      if (/^https?:\/\//i.test(file)) {
        const res = await fetch(file, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) continue;
        file = path.join(assetDir, `sfx_${items.length}${path.extname(new URL(fx.url).pathname) || '.mp3'}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      }
      if (!fs.existsSync(file)) continue;
      const at = cuts[i].start + Math.max(0, Number(fx.atSec) || 0);
      if (at >= durationSec) continue;
      items.push({ file, atMs: Math.round(at * 1000), volume: Math.max(0, Math.min(2, Number(fx.volume ?? 0.8))) });
    }
  }
  if (!items.length) return;
  const tmpOut = videoPath.replace(/\.mp4$/i, '_sfx.mp4');
  const inputs = items.flatMap((it) => ['-i', it.file]);
  const chains = items.map((it, k) => `[${k + 1}:a]adelay=${it.atMs}|${it.atMs},volume=${it.volume}[s${k}]`);
  const filter = `${chains.join(';')};[0:a]${items.map((_, k) => `[s${k}]`).join('')}amix=inputs=${items.length + 1}:normalize=0:duration=first[a]`;
  await runExec(
    ffmpegBin(),
    ['-y', '-loglevel', 'error', '-i', videoPath, ...inputs, '-filter_complex', filter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', tmpOut],
    { timeout: 120_000, windowsHide: true }
  );
  fs.renameSync(tmpOut, videoPath);
}

/**
 * Renderiza uma composicao HTML + SVG frame a frame (deterministica via window.__dtSeek)
 * usando Playwright Chromium + FFmpeg, rodando Motion Checks automaticos no MP4 final.
 */
export async function renderHtmlSvgToMp4(opts: HtmlSvgRenderOptions): Promise<HtmlSvgRenderResult> {
  const renderStartMs = Date.now();
  const assetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_htmlsvg_assets_'));
  const enrichedSpec = await enrichEditorialMedia(opts.spec, assetDir, opts.autoEnrichMedia !== false);
  const compiled = compileHtmlSvgDocument(enrichedSpec, Boolean(opts.draft));
  if (compiled.timelineIssues.errors.length > 0) {
    fs.rmSync(assetDir, { recursive: true, force: true });
    throw new Error(`Falha na validação pré-render (Motion Checks): ${compiled.timelineIssues.errors.join(' | ')}`);
  }

  fs.mkdirSync(path.dirname(opts.outputPath), { recursive: true });
  const { chromium } = await import('playwright-core');
  const executablePath = findBrowserExecutable({
    preferFullChrome: false,
    defaultExecutablePath: chromium.executablePath(),
  });
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
  });

  const tmpHtml = path.join(os.tmpdir(), `dt_htmlsvg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.html`);
  fs.writeFileSync(tmpHtml, compiled.html, 'utf8');

  const totalFrames = Math.max(1, Math.round(compiled.durationSec * compiled.fps));
  let generatedContactSheetPath: string | undefined;
  let blankFramesDetected = 0;
  let scenesSampled = 0;

  try {
    const page = await browser.newPage({
      viewport: { width: compiled.width, height: compiled.height },
      deviceScaleFactor: 1,
    });

    await page.goto(`file://${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const imgs = Array.from(document.images || []);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              })
        )
      );
    }).catch(() => {});

    const sceneCuts: Array<{ start: number; end: number }> = await page
      .evaluate(() => ((window as any).__dtScenes || []) as Array<{ start: number; end: number }>)
      .catch(() => []);

    // Contact Sheet QA pré-render (#05/#19): amostra 1 still por cena (ou 4 pontos) antes do encode final
    if (opts.generateContactSheet !== false) {
      const sampleTimes: number[] = [];
      const scenesList =
        Array.isArray(enrichedSpec.scenes) && enrichedSpec.scenes.length > 0
          ? enrichedSpec.scenes
          : enrichedSpec.preset === 'html_svg_silhouette_film'
            ? buildDefaultSilhouetteFilmScenes()
            : enrichedSpec.preset === 'html_svg_ampulheta_doc'
              ? buildDefaultAmpulhetaScenes()
              : enrichedSpec.preset === 'html_svg_whatif_studio'
                ? buildDefaultWhatIfScenes()
                : enrichedSpec.preset === 'html_svg_3d_stage'
                  ? buildDefault3dStageScenes()
                  : [];
      if (sceneCuts.length > 0) {
        for (const c of sceneCuts.slice(0, 16)) sampleTimes.push(Math.min(compiled.durationSec - 0.05, c.start + (c.end - c.start) * 0.55));
      } else if (scenesList.length > 0 && !enrichedSpec.customHtml) {
        let cur = 0;
        for (const sc of scenesList.slice(0, 16)) {
          const d = Math.max(1.5, Math.min(20, Number(sc.durationSec) || 4));
          sampleTimes.push(Math.min(compiled.durationSec - 0.05, cur + d * 0.52));
          cur += d;
        }
      } else {
        for (let k = 0; k < 4; k++) {
          sampleTimes.push(Math.min(compiled.durationSec - 0.05, ((k + 0.5) / 4) * compiled.durationSec));
        }
      }
      const stillFiles: string[] = [];
      for (let sIdx = 0; sIdx < sampleTimes.length; sIdx++) {
        const stSec = Math.max(0, sampleTimes[sIdx]);
        await page.evaluate(
          ({ timeSec, fpsVal, durVal }) => {
            const w = window as any;
            if (typeof w.__dtSeek === 'function') w.__dtSeek(timeSec, Math.round(timeSec * fpsVal), fpsVal, durVal);
          },
          { timeSec: stSec, fpsVal: compiled.fps, durVal: compiled.durationSec }
        );
        const shotBuf = await page.screenshot({ type: 'jpeg', quality: 82 });
        if (shotBuf.length < 1500) blankFramesDetected++;
        const shotPath = path.join(assetDir, `qa_${String(sIdx).padStart(2, '0')}.jpg`);
        fs.writeFileSync(shotPath, shotBuf);
        stillFiles.push(shotPath);
      }
      scenesSampled = stillFiles.length;
      if (stillFiles.length > 0) {
        const cols = Math.min(4, Math.ceil(Math.sqrt(stillFiles.length)));
        const rows = Math.max(1, Math.ceil(stillFiles.length / cols));
        const targetSheet = opts.contactSheetPath || opts.outputPath.replace(/\.mp4$/i, '_contact_sheet.jpg');
        try {
          await runExec(
            ffmpegBin(),
            [
              '-y',
              '-loglevel',
              'error',
              '-i',
              path.join(assetDir, 'qa_%02d.jpg'),
              '-vf',
              `scale=320:-1,tile=${cols}x${rows}:padding=6:color=0x0f172a`,
              '-frames:v',
              '1',
              targetSheet,
            ],
            { timeout: 30_000, windowsHide: true }
          );
          if (fs.existsSync(targetSheet)) generatedContactSheetPath = targetSheet;
        } catch {}
      }
    }

    let resolvedAudioPath = opts.audioPath && fs.existsSync(opts.audioPath) ? opts.audioPath : undefined;
    if (!resolvedAudioPath && enrichedSpec.preset === 'html_svg_silhouette_film') {
      const ambientScenes =
        Array.isArray(enrichedSpec.scenes) && enrichedSpec.scenes.length > 0
          ? enrichedSpec.scenes
          : buildDefaultSilhouetteFilmScenes();
      try {
        resolvedAudioPath = writeSilhouetteAmbientWav(
          path.join(assetDir, 'silhouette_ambient.wav'),
          ambientScenes,
          compiled.durationSec
        );
      } catch {}
    } else if (!resolvedAudioPath && enrichedSpec.preset === 'html_svg_ampulheta_doc') {
      try {
        resolvedAudioPath = writeAmpulhetaAmbientWav(
          path.join(assetDir, 'ampulheta_ambient.wav'),
          compiled.durationSec
        );
      } catch {}
    } else if (!resolvedAudioPath && enrichedSpec.preset === 'html_svg_whatif_studio') {
      try {
        resolvedAudioPath = writeWhatIfAmbientWav(
          path.join(assetDir, 'whatif_ambient.wav'),
          compiled.durationSec
        );
      } catch {}
    }

    const hasAudioFile = Boolean(resolvedAudioPath && fs.existsSync(resolvedAudioPath));
    const ffArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(compiled.fps),
      '-i', '-',
      ...(hasAudioFile
        ? ['-i', resolvedAudioPath as string]
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

    if (hasAudioFile && sceneCuts.length > 0) {
      await mixSceneSfx(opts.outputPath, enrichedSpec.scenes || [], sceneCuts, assetDir, compiled.durationSec).catch((e) => {
        console.warn(`[HTML+SVG Render] SFX ignorados: ${e?.message || e}`);
      });
    }
  } finally {
    await browser.close().catch(() => {});
    if (fs.existsSync(tmpHtml)) {
      try { fs.unlinkSync(tmpHtml); } catch {}
    }
    fs.rmSync(assetDir, { recursive: true, force: true });
  }

  const motionCheck = await inspectRenderedVideo(opts.outputPath, {
    ffmpegPath: ffmpegBin(),
    expectedColors: compiled.palette,
  });
  const criticReport = await auditContactSheetWithCritic({
    contactSheetPath: generatedContactSheetPath,
    title: enrichedSpec.title || 'HTML+SVG Video',
    styleLabel: enrichedSpec.preset || 'html_svg',
    expectedScenes: scenesSampled,
    blankFramesDetected,
    occlusionsRemaining: 0,
  });

  const renderDurationMs = Math.max(0, Date.now() - renderStartMs);
  const renderDurationLabel = formatDeliveryDuration(renderDurationMs);
  console.log(`[HTML+SVG Render] ✅ MP4 renderizado em ${renderDurationLabel} (${totalFrames} frames, ${compiled.durationSec}s, Crítico=${criticReport.score}/10)`);

  return {
    outputPath: opts.outputPath,
    contactSheetPath: generatedContactSheetPath,
    width: compiled.width,
    height: compiled.height,
    fps: compiled.fps,
    durationSec: compiled.durationSec,
    totalFrames,
    palette: compiled.palette,
    motionCheck,
    criticReport,
    timelineIssues: compiled.timelineIssues,
    renderDurationMs,
    renderDurationLabel,
  };
}
