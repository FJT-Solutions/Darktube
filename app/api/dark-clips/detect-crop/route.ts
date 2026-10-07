import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { pool } from '@/lib/db-client';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

/**
 * Detecção de Área de Vídeo 100% LOCAL e GRATUITA usando FFmpeg.
 * Combina tblend (diferença temporal para remover cabeçalhos/textos estáticos)
 * e cropdetect (remoção de barras pretas e letterboxing).
 */
export async function detectCropWithLocalFFmpeg(videoSource: string): Promise<{
  has_header_text: boolean;
  crop_top: number;
  crop_bottom: number;
  aspect_ratio: string;
  w: number;
  h: number;
  originalWidth: number;
  originalHeight: number;
} | null> {
  try {
    console.log(`[DetectCrop Local FFmpeg] 🔍 Analisando vídeo: ${videoSource.slice(0, 80)}...`);

    let output = '';
    // 1. Tenta detecção por movimento (diferença entre frames consecutivos elimina textos e avatares estáticos congelados)
    try {
      const res = await execFilePromise(
        'ffmpeg',
        [
          '-ss', '00:00:01',
          '-i', videoSource,
          '-t', '3',
          '-vf', 'tblend=all_mode=difference,cropdetect=limit=12:round=2:reset_count=0',
          '-f', 'null',
          '-',
        ],
        { timeout: 20000 }
      );
      output = (res.stderr || res.stdout || '') as string;
    } catch (execErr: any) {
      output = (execErr?.stderr || execErr?.stdout || '') as string;
    }

    // 2. Extrair coordenadas detectadas
    let cropMatches = [...output.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];

    // Se tblend não gerou matches ou teve poucos, tenta cropdetect simples (detecta barras pretas puras)
    if (cropMatches.length === 0) {
      try {
        const res2 = await execFilePromise(
          'ffmpeg',
          [
            '-ss', '00:00:01',
            '-i', videoSource,
            '-t', '3',
            '-vf', 'cropdetect=limit=24:round=2:reset_count=0',
            '-f', 'null',
            '-',
          ],
          { timeout: 20000 }
        );
        const out2 = (res2.stderr || res2.stdout || '') as string;
        cropMatches = [...out2.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
        if (cropMatches.length > 0) {
          output = out2;
        }
      } catch (execErr2: any) {
        const out2 = (execErr2?.stderr || execErr2?.stdout || '') as string;
        cropMatches = [...out2.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
        if (cropMatches.length > 0) {
          output = out2;
        }
      }
    }

    // 3. Identificar resolução original do vídeo
    let originalWidth = 1080;
    let originalHeight = 1920;
    const dimMatch = output.match(/Stream #0:\d.*Video:.* (\d{3,4})x(\d{3,4})/);
    if (dimMatch) {
      originalWidth = parseInt(dimMatch[1], 10);
      originalHeight = parseInt(dimMatch[2], 10);
    }

    if (cropMatches.length > 0) {
      // Pega os últimos valores convergidos
      const lastMatch = cropMatches[cropMatches.length - 1];
      const w = parseInt(lastMatch[1], 10);
      const h = parseInt(lastMatch[2], 10);
      const x = parseInt(lastMatch[3], 10);
      const y = parseInt(lastMatch[4], 10);

      // Calcular % de corte do topo e base
      let cropTopPct = Math.round((y / originalHeight) * 100);
      const remainingBottom = originalHeight - (y + h);
      let cropBottomPct = Math.max(0, Math.round((remainingBottom / originalHeight) * 100));

      // Identificar a proporção do vídeo útil detectado
      const ratioVal = w / h;
      let ratioStr = '16:9';
      if (ratioVal >= 1.55) ratioStr = '16:9';
      else if (ratioVal >= 1.25) ratioStr = '4:3';
      else if (ratioVal >= 0.95 && ratioVal <= 1.05) ratioStr = '1:1';
      else if (ratioVal >= 0.75 && ratioVal < 0.95) ratioStr = '4:5';
      else if (ratioVal < 0.75) ratioStr = '9:16';

      console.log(
        `[DetectCrop Local FFmpeg] ✅ Detecção FFmpeg: Original ${originalWidth}x${originalHeight} | Área Útil ${w}x${h} (y:${y}) | Top: ${cropTopPct}% | Bottom: ${cropBottomPct}% | AspectRatio: ${ratioStr}`
      );

      return {
        has_header_text: cropTopPct > 5,
        crop_top: cropTopPct,
        crop_bottom: cropBottomPct,
        aspect_ratio: ratioStr,
        w,
        h,
        originalWidth,
        originalHeight,
      };
    }
  } catch (err: any) {
    console.warn('[DetectCrop Local FFmpeg] Aviso no processamento local:', err?.message);
  }
  return null;
}

export async function POST(req: Request) {
  let tempVideoPath = '';
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      clipId,
      thumbnailUrl,
      videoUrl,
    } = body;

    let targetThumbnail = thumbnailUrl || '';
    let targetVideo = videoUrl || '';

    // Se tiver clipId, busca no banco
    if (clipId && (!targetThumbnail || !targetVideo)) {
      try {
        const { rows } = await pool.query('SELECT * FROM public.dark_clips WHERE id = $1', [clipId]);
        if (rows.length > 0) {
          if (!targetThumbnail) targetThumbnail = rows[0].thumbnail_url || '';
          if (!targetVideo) targetVideo = rows[0].video_url || '';
        }
      } catch (e) {}
    }

    const candidateMedia = targetVideo || targetThumbnail || '';
    let resolvedLocalPath = '';

    // Se o vídeo for do storage PostgreSQL, extrai para arquivo temporário no disco
    if (candidateMedia.includes('/api/storage/')) {
      const filename = candidateMedia.split('/api/storage/')[1]?.split('?')[0];
      try {
        const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
        const testPath = path.join(storageDir, filename);
        if (fs.existsSync(testPath)) {
          resolvedLocalPath = testPath;
        } else {
          // Extrai buffer do PostgreSQL
          const sf = await pool.query('SELECT content FROM public.storage_files WHERE filename = $1', [filename]);
          if (sf.rows.length > 0 && sf.rows[0].content) {
            const tmpDir = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            tempVideoPath = path.join(tmpDir, `detect_${Date.now()}_${filename}`);
            fs.writeFileSync(tempVideoPath, sf.rows[0].content);
            resolvedLocalPath = tempVideoPath;
          }
        }
      } catch (extractErr: any) {
        console.warn('[DetectCrop] Aviso ao obter buffer do PostgreSQL:', extractErr?.message);
      }
    }

    const sourceForDetection = resolvedLocalPath || candidateMedia;

    // ── Executar Detecção 100% Local via FFmpeg ──
    let localResult = null;
    if (sourceForDetection) {
      localResult = await detectCropWithLocalFFmpeg(sourceForDetection);
    }

    // Fallback seguro se FFmpeg não puder ler
    if (!localResult) {
      localResult = {
        has_header_text: false,
        crop_top: 0,
        crop_bottom: 0,
        aspect_ratio: '9:16',
        w: 1080,
        h: 1920,
        originalWidth: 1080,
        originalHeight: 1920,
      };
    }

    const finalDetection = {
      has_header_text: localResult.has_header_text,
      crop_top: localResult.crop_top,
      crop_bottom: localResult.crop_bottom,
      aspect_ratio: localResult.aspect_ratio,
      method: 'local_ffmpeg_motion_cropdetect',
      cost: 'R$ 0,00 (100% Gratuito)',
    };

    // Atualiza o banco com a informação se tiver clipId
    if (clipId) {
      try {
        await pool.query(
          `UPDATE public.dark_clips SET 
            remodel_data = jsonb_set(
              COALESCE(remodel_data::jsonb, '{}'::jsonb),
              '{detected_crop}',
              $1::jsonb
            )
           WHERE id = $2`,
          [JSON.stringify(finalDetection), clipId]
        );
      } catch (dbErr) {}
    }

    return NextResponse.json({
      success: true,
      detection: finalDetection,
    });
  } catch (err: any) {
    console.error('[DetectCrop] Erro geral na rota:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try { fs.unlinkSync(tempVideoPath); } catch (_) {}
    }
  }
}
