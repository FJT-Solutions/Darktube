import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pool } from '@/lib/db-client';
import { uploadMediaFile } from '@/lib/storage';
import { createFlowJob, getFlowJob, listFlowJobs, type FlowJob } from '@/lib/flow-jobs';
import { normalizeRealism, REALISM_PROMPT } from '@/lib/flow-template-base';
import { adultAge } from '@/lib/flow-script';

const run = promisify(execFile);
const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobeBin = () => process.env.FFPROBE_PATH || 'ffprobe';

export type ChromaAssetKind = 'character' | 'expressions' | 'prop' | 'background' | 'puppet_sheet' | 'accessories' | 'cast_sheet';
export type ExpressionGridLayout = '2x2' | '3x2';

export interface BuildNanoBananaPromptInput {
  kind: ChromaAssetKind;
  description: string;
  realismo?: string;
  chromaGreen?: boolean;
  gridLayout?: ExpressionGridLayout;
  hasRefImage?: boolean;
  /** Uma entrada por célula da grade (expressions/cast_sheet): pose + expressão, ex. "deitado dormindo, olhos fechados". */
  poseList?: string[];
  /** Só para background: direção da câmera dentro do cômodo (ex. "da porta olhando para a cama"). */
  cameraAngle?: string;
}

export interface ChromaCutoutOptions {
  inputSource: string | Buffer;
  outputFilename?: string;
  similarity?: number;
  blend?: number;
  despill?: boolean;
  sliceGrid?: ExpressionGridLayout;
  downloadLocal?: boolean;
  outputDir?: string;
}

export interface ChromaSpriteOutput {
  label: string;
  url: string;
  localPath: string | null;
}

export interface ChromaCutoutResult {
  transparentPngUrl: string;
  localFile: string | null;
  width: number;
  height: number;
  sprites: ChromaSpriteOutput[];
}

const STYLIZED_REALISMS = ['estilizado', 'animacao3d', 'massinha', 'ilustrado2d', 'stickman2d', 'avatar3d', 'brinquedo3d'];

const CHROMA_BACKDROP_CLAUSE =
  'Solid pure flat chroma-key green background (#00FF00), perfectly uniform #00FF00 backdrop with zero gradient, zero floor shadow, zero green spill on the subject, crisp silhouette edges ready for keying, even studio lighting, no text, no watermark.';

/**
 * Monta o prompt otimizado para o Nano Banana (Google Flow kind: 'image') com suporte nativo
 * a fundo verde chroma (#00FF00) para personagens, folhas de expressões e objetos/props.
 */
export function buildNanoBananaAssetPrompt(input: BuildNanoBananaPromptInput): string {
  const kind: ChromaAssetKind = input.kind || 'character';
  const rawDesc = (input.description || '').trim().replace(/\.+$/, '');
  const desc = kind === 'character' || kind === 'expressions' ? adultAge(rawDesc) : rawDesc;
  const normRealismo = normalizeRealism(input.realismo || 'cinematografico');
  const styleDesc = REALISM_PROMPT[normRealismo] || REALISM_PROMPT.cinematografico;
  const isStylized = STYLIZED_REALISMS.includes(normRealismo);
  const useGreen = kind === 'background' ? Boolean(input.chromaGreen) : input.chromaGreen !== false;
  const backdrop = useGreen ? CHROMA_BACKDROP_CLAUSE : 'Clean neutral studio backdrop, soft even lighting, no text, no watermark.';
  const refClause = input.hasRefImage
    ? 'Strictly preserve the exact same character identity, face shape, hairstyle, skin tone, clothing and color palette shown in the attached reference image. '
    : '';
  const singleFrameGuard =
    'Single continuous full-bleed scene filling the entire frame; NO split screen, NO stacked panels, NO diptych, NO collage, NO borders.';

  if (kind === 'expressions') {
    const grid = input.gridLayout === '3x2' ? '3x2' : '2x2';
    const count = grid === '3x2' ? 6 : 4;
    const custom = (input.poseList || []).map((p) => String(p || '').trim()).filter(Boolean).slice(0, count);
    const exprList = custom.length
      ? custom.map((p, i) => `${i + 1}) ${p}`).join(', ')
      : grid === '3x2'
        ? '1) happy smiling, 2) shocked surprised, 3) angry intense, 4) sad worried, 5) thoughtful curious, 6) confident smirk'
        : '1) happy smiling, 2) shocked surprised, 3) angry intense, 4) sad worried';
    return `Character expression sheet arranged in a clean ${grid} grid (${count} separate FULL-BODY figures, head to toe with feet and hands completely visible and never cropped, of the exact same fictional original adult character, each figure fully inside its own cell with generous margin on all sides and spacing between cells): ${refClause}${desc}. Visual style strictly uniform across all ${count} portraits: ${styleDesc}.${isStylized ? ' NO photorealistic skin texture.' : ''} The ${count} poses/expressions in reading order from top-left to bottom-right are: ${exprList}. Identical face, hair, skin tone and outfit in every cell. ${backdrop} No grid border lines, no labels, no numbers, no text, no watermark.`.slice(
      0,
      3900
    );
  }

  if (kind === 'puppet_sheet') {
    return `Full-body character turnaround front view in a clean neutral standing A-pose for 2D/2.5D joint puppet rigging: ${refClause}${desc}. Rendered strictly in style: ${styleDesc}.${isStylized ? ' Stylized flat vector/cartoon look, crisp dark outlines, NO photorealism.' : ''} Head to toe completely inside frame with generous margins, arms slightly angled outward away from torso, legs shoulder-width apart, clear separate hands and feet, even flat studio lighting, ${backdrop} Single character only, no overlapping limbs, no split screen, no text, no watermark.`.slice(
      0,
      3900
    );
  }

  if (kind === 'accessories') {
    const grid = input.gridLayout === '3x2' ? '3x2' : '2x2';
    const count = grid === '3x2' ? 6 : 4;
    return `Clean ${grid} sticker sheet of ${count} separate detachable character accessories, outfits and props matching: ${refClause}${desc}. Rendered in style: ${styleDesc}.${isStylized ? ' Consistent cartoon outline style, NO photorealism.' : ''} Generous uniform spacing between each item so every piece can be cropped cleanly without touching neighbours, ${backdrop} No grid border lines, no labels, no numbers, no text, no watermark.`.slice(
      0,
      3900
    );
  }

  if (kind === 'cast_sheet') {
    const grid = input.gridLayout === '3x2' ? '3x2' : '2x2';
    const count = grid === '3x2' ? 6 : 4;
    const custom = (input.poseList || []).map((p) => String(p || '').trim()).filter(Boolean).slice(0, count);
    const cellList = custom.length ? ` The ${count} cells in reading order from top-left to bottom-right are: ${custom.map((p, i) => `${i + 1}) ${p}`).join(', ')}.` : '';
    return `Clean character cast, poses & key props reference sheet arranged in a tidy ${grid} layout with generous spacing between each item: ${refClause}${desc}. Rendered strictly in style: ${styleDesc}.${isStylized ? ' Consistent cartoon outline style, NO photorealism.' : ''} Every character figure is FULL-BODY, head to toe, hands and feet never cropped and fully inside its cell with margin. Preserve exact face, hair, skin tone and clothing across every figure and include the requested action poses and isolated story props cleanly separated so each piece can be cropped individually.${cellList} ${backdrop} No grid lines, no labels, no text, no watermark.`.slice(
      0,
      3900
    );
  }

  if (kind === 'prop') {
    return `Isolated studio product/object render of: ${desc}. Rendered in style: ${styleDesc}. Centered full object completely visible inside frame with margin around all edges, ${singleFrameGuard} ${backdrop}`.slice(
      0,
      3900
    );
  }

  if (kind === 'background') {
    return `Wide establishing background plate without any people or characters: ${desc}.${input.cameraAngle ? ` Camera angle and viewpoint: ${String(input.cameraAngle).trim()}; keep the room layout geometrically consistent with that viewpoint.` : ''} Visual style: ${styleDesc}. Atmospheric depth, clean composition ready to receive foreground characters. ${singleFrameGuard} No text, no watermark.`.slice(
      0,
      3900
    );
  }

  // Default: 'character'
  return `Full-body or waist-up character reference portrait of a fictional original adult character: ${refClause}${desc}. Rendered strictly in this visual style: ${styleDesc}.${isStylized ? ' Consistent stylized art, NO photorealism.' : ''} Single character centered in frame with clear silhouette, facing the camera, ${backdrop} Single character only, ${singleFrameGuard} no turnaround, no text, no watermark.`.slice(
    0,
    3900
  );
}

async function resolveInputToTempFile(inputSource: string | Buffer, tempDir: string): Promise<string> {
  const inFile = path.join(tempDir, 'input_source.png');
  if (Buffer.isBuffer(inputSource)) {
    fs.writeFileSync(inFile, inputSource);
    return inFile;
  }

  const trimmed = String(inputSource || '').trim();
  if (!trimmed) throw new Error('Fonte de imagem vazia para recorte Chroma Key.');

  // 1. Caminho local no disco
  if (fs.existsSync(trimmed)) {
    fs.copyFileSync(trimmed, inFile);
    return inFile;
  }

  // 2. Storage interno (/api/storage/nome.ext ou URL contendo /api/storage/nome.ext)
  const storageMatch = trimmed.match(/\/api\/storage\/([\w.-]+)/i);
  if (storageMatch) {
    const { rows } = await pool.query(`SELECT content FROM public.storage_files WHERE filename = $1 LIMIT 1`, [
      storageMatch[1],
    ]);
    if (rows[0]?.content) {
      fs.writeFileSync(inFile, rows[0].content);
      return inFile;
    }
  }

  // 3. URL HTTP/HTTPS externa
  if (/^https?:\/\//i.test(trimmed)) {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`Falha ao baixar imagem (${res.status}): ${trimmed}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(inFile, buf);
    return inFile;
  }

  throw new Error(`Não foi possível localizar a imagem para recorte: "${trimmed}"`);
}

async function probeImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const { stdout } = await run(
      ffprobeBin(),
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', filePath],
      { timeout: 15000, windowsHide: true }
    );
    const parsed = JSON.parse(stdout || '{}');
    const st = parsed?.streams?.[0] || {};
    return { width: Number(st.width) || 1024, height: Number(st.height) || 1024 };
  } catch {
    return { width: 1024, height: 1024 };
  }
}

/**
 * Remove o fundo verde (#00FF00) via FFmpeg (colorkey + despill verde -> PNG 32-bit RGBA transparente)
 * e opcionalmente fatia uma folha de expressões (2x2 ou 3x2) em sprites PNG individuais.
 */
export async function removeChromaGreenToPng(opts: ChromaCutoutOptions): Promise<ChromaCutoutResult> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_chroma_'));
  try {
    const inFile = await resolveInputToTempFile(opts.inputSource, tempDir);
    const { width, height } = await probeImageDimensions(inFile);

    const sim = Math.min(0.6, Math.max(0.08, Number(opts.similarity ?? 0.28)));
    const blend = Math.min(0.4, Math.max(0.02, Number(opts.blend ?? 0.1)));
    const despillFilter = opts.despill === false ? '' : ',despill=type=green:mix=0.45:expand=0';
    const keyFilter = `colorkey=0x00FF00:${sim}:${blend}${despillFilter},format=rgba`;

    const outPng = path.join(tempDir, 'cutout_rgba.png');
    await run(ffmpegBin(), ['-y', '-loglevel', 'error', '-i', inFile, '-vf', keyFilter, '-frames:v', '1', outPng], {
      timeout: 45000,
      windowsHide: true,
    });

    const baseName = String(opts.outputFilename || `chroma_cutout_${Date.now()}`)
      .replace(/\.png$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 70);
    const finalName = `${baseName}.png`;
    const pngBuf = fs.readFileSync(outPng);

    let transparentPngUrl = `/api/storage/${finalName}`;
    try {
      transparentPngUrl = await uploadMediaFile(pngBuf, finalName, 'image/png');
    } catch {
      // Caso banco não esteja acessível localmente, mantém entrega via disco local
    }

    let localFile: string | null = null;
    if (opts.downloadLocal) {
      const targetDir = path.resolve(process.cwd(), opts.outputDir || './midia/criativos');
      fs.mkdirSync(targetDir, { recursive: true });
      localFile = path.join(targetDir, finalName);
      fs.copyFileSync(outPng, localFile);
    }

    const sprites: ChromaSpriteOutput[] = [];
    if (opts.sliceGrid === '2x2' || opts.sliceGrid === '3x2') {
      const cols = opts.sliceGrid === '3x2' ? 3 : 2;
      const rows = 2;
      const cellW = Math.floor(width / cols);
      const cellH = Math.floor(height / rows);
      const labels =
        opts.sliceGrid === '3x2'
          ? ['happy', 'shocked', 'angry', 'sad', 'thinking', 'smirk']
          : ['happy', 'shocked', 'angry', 'sad'];

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const label = labels[idx] || `expr_${idx + 1}`;
          const cellPng = path.join(tempDir, `cell_${label}.png`);
          const cropFilter = `crop=${cellW}:${cellH}:${c * cellW}:${r * cellH},${keyFilter}`;
          await run(
            ffmpegBin(),
            ['-y', '-loglevel', 'error', '-i', inFile, '-vf', cropFilter, '-frames:v', '1', cellPng],
            { timeout: 30000, windowsHide: true }
          );
          const spriteName = `${baseName}_${label}.png`;
          const spriteBuf = fs.readFileSync(cellPng);
          let spriteUrl = `/api/storage/${spriteName}`;
          try {
            spriteUrl = await uploadMediaFile(spriteBuf, spriteName, 'image/png');
          } catch {}

          let spriteLocal: string | null = null;
          if (opts.downloadLocal) {
            const targetDir = path.resolve(process.cwd(), opts.outputDir || './midia/criativos');
            spriteLocal = path.join(targetDir, spriteName);
            fs.copyFileSync(cellPng, spriteLocal);
          }
          sprites.push({ label, url: spriteUrl, localPath: spriteLocal });
          idx++;
        }
      }
    }

    return {
      transparentPngUrl,
      localFile,
      width,
      height,
      sprites,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

export interface StandaloneFlowImageRequest {
  userId: string;
  assetKind?: ChromaAssetKind;
  description?: string;
  customPrompt?: string;
  realismo?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  chromaGreen?: boolean;
  gridLayout?: ExpressionGridLayout;
  poseList?: string[];
  cameraAngle?: string;
  autoCutout?: boolean;
  refImageUrl?: string;
  refImageUrls?: string[];
  waitForSeconds?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}

/**
 * Enfileira uma imagem avulsa no Nano Banana (Google Flow kind: 'image') para personagem,
 * folha de expressões, prop/objeto em #00FF00 ou cenário, e opcionalmente aguarda + recorta o PNG transparente.
 */
export async function createStandaloneFlowImageJob(req: StandaloneFlowImageRequest) {
  const assetKind: ChromaAssetKind = req.assetKind || 'character';
  const chromaGreen = assetKind === 'background' ? Boolean(req.chromaGreen) : req.chromaGreen !== false;
  const cleanRefUrl = typeof req.refImageUrl === 'string' && req.refImageUrl.trim() ? req.refImageUrl.trim() : undefined;
  const cleanRefUrls = Array.isArray(req.refImageUrls)
    ? req.refImageUrls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 4)
    : undefined;
  const hasRefImage = Boolean(cleanRefUrl || (cleanRefUrls && cleanRefUrls.length > 0));
  const prompt = (req.customPrompt || '').trim()
    ? String(req.customPrompt).trim()
    : buildNanoBananaAssetPrompt({
        kind: assetKind,
        description: req.description || 'Original stylized character',
        realismo: req.realismo,
        chromaGreen,
        gridLayout: req.gridLayout,
        poseList: req.poseList,
        cameraAngle: req.cameraAngle,
        hasRefImage,
      });

  const role =
    assetKind === 'expressions'
      ? 'expression_sheet'
      : assetKind === 'puppet_sheet'
        ? 'puppet_sheet'
        : assetKind === 'cast_sheet'
          ? 'cast_sheet'
          : assetKind === 'accessories'
          ? 'accessories_sheet'
          : assetKind === 'prop'
            ? 'prop_chroma'
            : assetKind === 'background'
              ? 'background_plate'
              : 'standalone_image';

  const job = await createFlowJob({
    userId: req.userId,
    kind: 'image',
    prompt,
    params: {
      aspectRatio: req.aspectRatio || '9:16',
      model: 'Nano Banana Pro',
      ...(cleanRefUrl ? { refImageUrl: cleanRefUrl } : {}),
      ...(cleanRefUrls?.length ? { refImageUrls: cleanRefUrls } : {}),
    },
    role,
    deadlineMinutes: 360,
  });

  const waitSec = Math.max(0, Math.min(600, Math.round(Number(req.waitForSeconds) || 0)));
  let finalJob: FlowJob = job;

  if (waitSec > 0) {
    const deadline = Date.now() + waitSec * 1000;
    while (Date.now() < deadline) {
      const found = await getFlowJob(req.userId, job.id);
      if (found) {
        finalJob = found;
        if (found.status === 'done' || found.status === 'draft' || found.status === 'cancelled') break;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  let cutout: ChromaCutoutResult | null = null;
  if (finalJob.status === 'done' && finalJob.result_url && chromaGreen && req.autoCutout !== false) {
    cutout = await removeChromaGreenToPng({
      inputSource: finalJob.result_url,
      outputFilename: `chroma_${assetKind}_${finalJob.id.slice(0, 8)}`,
      sliceGrid: assetKind === 'expressions' || assetKind === 'accessories' ? req.gridLayout || '2x2' : undefined,
      downloadLocal: req.downloadLocal,
      outputDir: req.outputDir,
    });
  }

  return {
    job: finalJob,
    prompt,
    assetKind,
    chromaGreen,
    cutout,
  };
}

/**
 * Consulta um job de imagem avulsa no Flow e opcionalmente realiza o recorte #00FF00 ao concluir.
 */
export async function getStandaloneFlowImageJobStatus(opts: {
  userId: string;
  jobId: string;
  autoCutout?: boolean;
  chromaGreen?: boolean;
  gridLayout?: ExpressionGridLayout;
  similarity?: number;
  blend?: number;
  downloadLocal?: boolean;
  outputDir?: string;
}) {
  const job = await getFlowJob(opts.userId, opts.jobId);
  if (!job) return null;

  const isSheet = job.role === 'expression_sheet' || job.role === 'accessories_sheet';
  const isBg = job.role === 'background_plate';
  const shouldChroma = opts.chromaGreen ?? !isBg;
  let cutout: ChromaCutoutResult | null = null;

  if (job.status === 'done' && job.result_url && shouldChroma && opts.autoCutout !== false) {
    cutout = await removeChromaGreenToPng({
      inputSource: job.result_url,
      outputFilename: `chroma_${job.role || 'image'}_${job.id.slice(0, 8)}`,
      sliceGrid: isSheet ? opts.gridLayout || '2x2' : undefined,
      similarity: opts.similarity,
      blend: opts.blend,
      downloadLocal: opts.downloadLocal,
      outputDir: opts.outputDir,
    });
  }

  return { job, cutout };
}

export async function listStandaloneFlowImageJobs(userId: string, limit = 40): Promise<FlowJob[]> {
  const all = await listFlowJobs(userId, Math.min(200, limit * 3));
  return all.filter((j) => j.kind === 'image').slice(0, limit);
}
