import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ffmpegBin } from '@/lib/flow-assemble';
import { removeChromaGreenToPng, type ExpressionGridLayout } from '@/lib/flow-image-tools';
import { getPythonCommand } from '@/lib/python-runtime';
import { uploadMediaFile } from '@/lib/storage';
import type { VoiceWord } from '@/lib/voice-resolver';

const run = promisify(execFile);

/**
 * Os 3 Prompts de Ouro (ref. #12 S4ZCcgRx8sc - Eric Michaud) para evitar personagens desenhados "no olhômetro":
 * 1) Vetorizar & medir com OpenCV
 * 2) Auto-auditoria por sobreposição visual (Overlay Audit)
 * 3) Recorte articulado em fantoche/puppet nas juntas
 */
export const PUPPET_GOLDEN_PROMPTS = [
  {
    id: 'opencv_trace',
    title: '1. Vetorizar e Medir via OpenCV (Sem Olhômetro)',
    prompt:
      'This is a picture of my character. Trace it into vectors with OpenCV and measure it. Do not eyeball it.',
  },
  {
    id: 'overlay_audit',
    title: '2. Auto-Auditoria Visual por Sobreposição',
    prompt:
      "Lay your image over my picture and show me where it's off. Keep iterating until it matches.",
  },
  {
    id: 'joint_puppet',
    title: '3. Recorte Articulado em Puppet nas Juntas',
    prompt:
      "Cut this into a puppet at the joints and show me absolutely everything bending. Make sure it's smooth in motion.",
  },
] as const;

export type RhubarbMouthShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface MouthCue {
  start: number;
  end: number;
  shape: RhubarbMouthShape;
}

export interface PuppetJointPart {
  part: 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR';
  url: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  pivotX: number; // 0..1 dentro da peça
  pivotY: number; // 0..1 dentro da peça
}

export interface PuppetRigManifest {
  characterName: string;
  baseCutoutUrl: string;
  width: number;
  height: number;
  segmentationEngine: 'opencv' | 'ffmpeg_proportional';
  parts: Record<'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR', PuppetJointPart>;
  expressions: Record<string, string>;
  accessories: Array<{ label: string; url: string }>;
  createdAt: string;
}

export interface RhubarbRuntimeStatus {
  available: boolean;
  rhubarbPath: string | null;
  note: string;
}

/** Detecta se o executável nativo Rhubarb Lip Sync está disponível no host. */
export function detectRhubarbRuntime(): RhubarbRuntimeStatus {
  const candidates: string[] = [];
  if (process.env.RHUBARB_PATH) candidates.push(process.env.RHUBARB_PATH);
  const pathEnv = process.env.PATH || '';
  const exeNames = process.platform === 'win32' ? ['rhubarb.exe', 'rhubarb'] : ['rhubarb'];
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    for (const exe of exeNames) candidates.push(path.join(dir, exe));
  }
  if (process.platform !== 'win32') {
    candidates.push('/usr/local/bin/rhubarb', '/usr/bin/rhubarb', '/app/rhubarb');
  }
  const found = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  return found
    ? { available: true, rhubarbPath: found, note: 'Rhubarb CLI ativo para análise acústica de fonemas.' }
    : {
        available: false,
        rhubarbPath: null,
        note: 'Rhubarb CLI não encontrado no PATH; usando motor fonêmico determinístico PT-BR ($0) guiado por timestamps de voz.',
      };
}

function charToRhubarbShape(ch: string): RhubarbMouthShape {
  const c = ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!c || /[^a-z]/.test(c)) return 'X';
  if ('pbm'.includes(c)) return 'A';
  if ('fv'.includes(c)) return 'G';
  if ('o'.includes(c)) return 'E';
  if ('uwq'.includes(c)) return 'F';
  if ('a'.includes(c)) return 'D';
  if ('e'.includes(c)) return 'C';
  if ('lr'.includes(c)) return 'H';
  return 'B'; // i, s, z, t, d, n, c, k, g, etc.
}

/** Converte lista de palavras com início/fim em cues fonêmicos A..H/X contínuos (fallback $0). */
export function wordsToPhonemeMouthCues(words: VoiceWord[], durationSec?: number): MouthCue[] {
  if (!words?.length) {
    const dur = Math.max(1, Number(durationSec) || 5);
    return [{ start: 0, end: dur, shape: 'X' }];
  }

  const cues: MouthCue[] = [];
  let cursor = 0;

  for (const w of words) {
    const start = Math.max(cursor, Number(w.inicio) || 0);
    const end = Math.max(start + 0.04, Number(w.fim) || start + 0.25);
    if (start - cursor > 0.06) {
      cues.push({ start: +cursor.toFixed(3), end: +start.toFixed(3), shape: 'X' });
    }
    const letters = String(w.palavra || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '');
    if (!letters) {
      cues.push({ start: +start.toFixed(3), end: +end.toFixed(3), shape: 'B' });
    } else {
      // Limita resolucao para ~8-12 mudanças fonêmicas por palavra para naturalidade
      const stepCount = Math.min(8, Math.max(1, letters.length));
      const segDur = (end - start) / stepCount;
      for (let i = 0; i < stepCount; i++) {
        const letterIdx = Math.min(letters.length - 1, Math.floor((i * letters.length) / stepCount));
        const s = start + i * segDur;
        const e = i === stepCount - 1 ? end : start + (i + 1) * segDur;
        const shape = charToRhubarbShape(letters[letterIdx]);
        const prev = cues[cues.length - 1];
        if (prev && prev.shape === shape && Math.abs(prev.end - s) < 0.015) {
          prev.end = +e.toFixed(3);
        } else {
          cues.push({ start: +s.toFixed(3), end: +e.toFixed(3), shape });
        }
      }
    }
    cursor = end;
  }

  const totalDur = Math.max(cursor, Number(durationSec) || cursor);
  if (totalDur - cursor > 0.05) {
    cues.push({ start: +cursor.toFixed(3), end: +totalDur.toFixed(3), shape: 'X' });
  }
  return cues;
}

/**
 * Gera timeline de formas da boca (fonemas A/B/C/D/E/F/G/H/X) usando Rhubarb Lip Sync CLI
 * quando presente no sistema, ou fallback fonêmico determinístico PT-BR guiado por Whisper/VoiceWord ($0).
 */
export async function generateLipSyncMouthCues(opts: {
  audioPath?: string;
  words?: VoiceWord[];
  durationSec?: number;
}): Promise<{ engine: 'rhubarb_cli' | 'phoneme_ptbr'; cues: MouthCue[] }> {
  const runtime = detectRhubarbRuntime();
  if (runtime.available && runtime.rhubarbPath && opts.audioPath && fs.existsSync(opts.audioPath)) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_rhubarb_'));
    try {
      const wavPath = path.join(tmpDir, 'speech.wav');
      await run(
        ffmpegBin(),
        ['-y', '-loglevel', 'error', '-i', opts.audioPath, '-ac', '1', '-ar', '16000', wavPath],
        { timeout: 60_000, windowsHide: true }
      );
      const { stdout } = await run(runtime.rhubarbPath, ['-f', 'json', wavPath], {
        timeout: 120_000,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      });
      const parsed = JSON.parse(stdout || '{}');
      const rawCues: MouthCue[] = Array.isArray(parsed?.mouthCues)
        ? parsed.mouthCues.map((c: any) => ({
            start: +Number(c.start || 0).toFixed(3),
            end: +Number(c.end || 0).toFixed(3),
            shape: (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'].includes(String(c.value))
              ? String(c.value)
              : 'X') as RhubarbMouthShape,
          }))
        : [];
      if (rawCues.length > 0) {
        return { engine: 'rhubarb_cli', cues: rawCues };
      }
    } catch (err: any) {
      console.warn('[PuppetStudio] Falha ao executar Rhubarb CLI, usando fallback PT-BR:', err?.message || err);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }

  return {
    engine: 'phoneme_ptbr',
    cues: wordsToPhonemeMouthCues(opts.words || [], opts.durationSec),
  };
}

interface ProportionalBox {
  part: 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR';
  x: number;
  y: number;
  w: number;
  h: number;
  pivotX: number;
  pivotY: number;
}

const DEFAULT_PART_LAYOUT: ProportionalBox[] = [
  { part: 'head', x: 0.28, y: 0.02, w: 0.44, h: 0.27, pivotX: 0.5, pivotY: 0.88 },
  { part: 'torso', x: 0.27, y: 0.26, w: 0.46, h: 0.34, pivotX: 0.5, pivotY: 0.78 },
  { part: 'armL', x: 0.04, y: 0.25, w: 0.26, h: 0.35, pivotX: 0.85, pivotY: 0.14 },
  { part: 'armR', x: 0.70, y: 0.25, w: 0.26, h: 0.35, pivotX: 0.15, pivotY: 0.14 },
  { part: 'legL', x: 0.26, y: 0.57, w: 0.24, h: 0.41, pivotX: 0.55, pivotY: 0.08 },
  { part: 'legR', x: 0.50, y: 0.57, w: 0.24, h: 0.41, pivotX: 0.45, pivotY: 0.08 },
];

async function tryDetectTightForegroundBBox(
  pngPath: string,
  width: number,
  height: number
): Promise<{ ok: boolean; bbox: [number, number, number, number]; engine: 'opencv' | 'ffmpeg_proportional' }> {
  const py = getPythonCommand();
  const script = `
import json, sys
try:
    import cv2
    img = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED)
    if img is None or len(img.shape) < 3 or img.shape[2] < 4:
        print(json.dumps({"ok": False}))
        sys.exit(0)
    alpha = img[:, :, 3]
    _, mask = cv2.threshold(alpha, 24, 255, cv2.THRESH_BINARY)
    pts = cv2.findNonZero(mask)
    if pts is None:
        print(json.dumps({"ok": False}))
        sys.exit(0)
    x, y, w, h = cv2.boundingRect(pts)
    print(json.dumps({"ok": True, "bbox": [int(x), int(y), int(w), int(h)]}))
except Exception:
    print(json.dumps({"ok": False}))
`.trim();

  try {
    const { stdout } = await run(py, ['-c', script, pngPath], { timeout: 15_000, windowsHide: true });
    const parsed = JSON.parse(stdout || '{}');
    if (parsed?.ok && Array.isArray(parsed.bbox) && parsed.bbox[2] > 20 && parsed.bbox[3] > 20) {
      return {
        ok: true,
        bbox: parsed.bbox as [number, number, number, number],
        engine: 'opencv',
      };
    }
  } catch {}
  return { ok: false, bbox: [0, 0, width, height], engine: 'ffmpeg_proportional' };
}

/**
 * Converte uma imagem de personagem em fundo #00FF00 (mais folhas opcionais de expressões/acessórios)
 * em um Puppet Rig articulado pronto para Depth Buffer 2.5D + Sticker Swap no Three.js.
 */
export async function buildPuppetRigFromChromaPng(opts: {
  imageSource: string | Buffer;
  characterName: string;
  expressionsSheetSource?: string | Buffer;
  gridLayout?: ExpressionGridLayout;
  accessoriesSheetSource?: string | Buffer;
  outputBaseName?: string;
}): Promise<PuppetRigManifest> {
  const baseSlug = String(opts.outputBaseName || opts.characterName || `puppet_${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .slice(0, 48);

  const baseCut = await removeChromaGreenToPng({
    inputSource: opts.imageSource,
    outputFilename: `${baseSlug}_base`,
    downloadLocal: false,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_puppet_rig_'));
  const parts: Partial<Record<ProportionalBox['part'], PuppetJointPart>> = {};
  let segmentationEngine: 'opencv' | 'ffmpeg_proportional' = 'ffmpeg_proportional';

  try {
    // Rebaixa a imagem RGBA do storage ou URL para fatiamento das 6 juntas
    const basePngPath = path.join(tmpDir, 'base_rgba.png');
    if (typeof opts.imageSource === 'string' && fs.existsSync(opts.imageSource)) {
      const cutTmp = await removeChromaGreenToPng({
        inputSource: opts.imageSource,
        outputFilename: `${baseSlug}_tmp`,
        downloadLocal: true,
        outputDir: tmpDir,
      });
      if (cutTmp.localFile && fs.existsSync(cutTmp.localFile)) {
        fs.copyFileSync(cutTmp.localFile, basePngPath);
      }
    } else {
      const cutTmp = await removeChromaGreenToPng({
        inputSource: opts.imageSource,
        outputFilename: `${baseSlug}_tmp`,
        downloadLocal: true,
        outputDir: tmpDir,
      });
      if (cutTmp.localFile && fs.existsSync(cutTmp.localFile)) {
        fs.copyFileSync(cutTmp.localFile, basePngPath);
      }
    }

    const W = Math.max(64, baseCut.width || 1024);
    const H = Math.max(64, baseCut.height || 1024);
    const detect = fs.existsSync(basePngPath)
      ? await tryDetectTightForegroundBBox(basePngPath, W, H)
      : { ok: false, bbox: [0, 0, W, H] as [number, number, number, number], engine: 'ffmpeg_proportional' as const };
    segmentationEngine = detect.engine;
    const [bx, by, bw, bh] = detect.bbox;

    for (const layout of DEFAULT_PART_LAYOUT) {
      const cropX = Math.max(0, Math.min(W - 8, Math.round(bx + bw * layout.x)));
      const cropY = Math.max(0, Math.min(H - 8, Math.round(by + bh * layout.y)));
      const cropW = Math.max(8, Math.min(W - cropX, Math.round(bw * layout.w)));
      const cropH = Math.max(8, Math.min(H - cropY, Math.round(bh * layout.h)));
      let partUrl = baseCut.transparentPngUrl;

      if (fs.existsSync(basePngPath)) {
        const partFile = path.join(tmpDir, `${baseSlug}_${layout.part}.png`);
        await run(
          ffmpegBin(),
          ['-y', '-loglevel', 'error', '-i', basePngPath, '-vf', `crop=${cropW}:${cropH}:${cropX}:${cropY}`, '-frames:v', '1', partFile],
          { timeout: 25_000, windowsHide: true }
        );
        const fileName = `${baseSlug}_${layout.part}_${Date.now()}.png`;
        try {
          partUrl = await uploadMediaFile(fs.readFileSync(partFile), fileName, 'image/png');
        } catch {
          partUrl = baseCut.transparentPngUrl;
        }
      }

      parts[layout.part] = {
        part: layout.part,
        url: partUrl,
        xPct: layout.x,
        yPct: layout.y,
        wPct: layout.w,
        hPct: layout.h,
        pivotX: layout.pivotX,
        pivotY: layout.pivotY,
      };
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  const expressions: Record<string, string> = {};
  if (opts.expressionsSheetSource) {
    const expCut = await removeChromaGreenToPng({
      inputSource: opts.expressionsSheetSource,
      outputFilename: `${baseSlug}_expr`,
      sliceGrid: opts.gridLayout || '2x2',
      downloadLocal: false,
    });
    for (const sp of expCut.sprites) {
      expressions[sp.label] = sp.url;
    }
  }

  const accessories: Array<{ label: string; url: string }> = [];
  if (opts.accessoriesSheetSource) {
    const accCut = await removeChromaGreenToPng({
      inputSource: opts.accessoriesSheetSource,
      outputFilename: `${baseSlug}_acc`,
      sliceGrid: opts.gridLayout || '2x2',
      downloadLocal: false,
    });
    accCut.sprites.forEach((sp, i) => {
      accessories.push({ label: `item_${i + 1}`, url: sp.url });
    });
  }

  return {
    characterName: opts.characterName || 'Personagem Puppet',
    baseCutoutUrl: baseCut.transparentPngUrl,
    width: baseCut.width,
    height: baseCut.height,
    segmentationEngine,
    parts: parts as PuppetRigManifest['parts'],
    expressions,
    accessories,
    createdAt: new Date().toISOString(),
  };
}
