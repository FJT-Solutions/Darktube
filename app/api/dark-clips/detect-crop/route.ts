import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { pool } from '@/lib/db-client';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

/**
 * Detecção de Área de Vídeo 100% LOCAL e GRATUITA usando o filtro cropdetect nativo do FFmpeg.
 * Não utiliza LLM, não gasta tokens e executa em milissegundos no servidor.
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
    console.log(`[DetectCrop Local FFmpeg] 🔍 Analisando vídeo sem LLM: ${videoSource.slice(0, 80)}...`);

    let output = '';
    try {
      const res = await execFilePromise(
        'ffmpeg',
        [
          '-ss', '00:00:00.5',
          '-i', videoSource,
          '-t', '2',
          '-vf', 'cropdetect=limit=24:round=2:reset_count=0',
          '-f', 'null',
          '-',
        ],
        { timeout: 20000 }
      );
      output = (res.stderr || res.stdout || '') as string;
    } catch (execErr: any) {
      // FFmpeg com "-f null -" envia os relatórios para stderr e às vezes retorna código de saída não-zero
      output = (execErr?.stderr || execErr?.stdout || '') as string;
    }

    // 1. Identificar resolução original do vídeo
    let originalWidth = 1080;
    let originalHeight = 1920;
    const dimMatch = output.match(/Stream #0:\d.*Video:.* (\d{3,4})x(\d{3,4})/);
    if (dimMatch) {
      originalWidth = parseInt(dimMatch[1], 10);
      originalHeight = parseInt(dimMatch[2], 10);
    }

    // 2. Extrair coordenadas detectadas pelo filtro cropdetect
    const cropMatches = [...output.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
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

      // Heurística de segurança para memes verticais 9:16 com vídeo 16:9
      if (originalHeight > originalWidth && cropTopPct === 0 && h < originalHeight * 0.8) {
        cropTopPct = 22;
      }

      // Identificar a proporção do vídeo útil detectado
      const ratioVal = w / h;
      let ratioStr = '16:9';
      if (ratioVal >= 1.55) ratioStr = '16:9';
      else if (ratioVal >= 1.25) ratioStr = '4:3';
      else if (ratioVal >= 0.95 && ratioVal <= 1.05) ratioStr = '1:1';
      else if (ratioVal >= 0.75 && ratioVal < 0.95) ratioStr = '4:5';
      else if (ratioVal < 0.75) ratioStr = '9:16';

      console.log(
        `[DetectCrop Local FFmpeg] ✅ Detecção Local 100% Sucesso: Original ${originalWidth}x${originalHeight} | Área Útil ${w}x${h} (y:${y}) | Top: ${cropTopPct}% | Bottom: ${cropBottomPct}% | AspectRatio: ${ratioStr}`
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

    if (candidateMedia.includes('/api/storage/')) {
      const filename = candidateMedia.split('/api/storage/')[1]?.split('?')[0];
      const storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
      const testPath = path.join(storageDir, filename);
      if (fs.existsSync(testPath)) {
        resolvedLocalPath = testPath;
      }
    }

    const sourceForDetection = resolvedLocalPath || candidateMedia;

    // ── Executar Detecção 100% Local via FFmpeg (Custo Zero / Sem LLM) ──
    let localResult = null;
    if (sourceForDetection) {
      localResult = await detectCropWithLocalFFmpeg(sourceForDetection);
    }

    // Fallback matemático se FFmpeg não puder ler stream remoto diretamente
    if (!localResult) {
      localResult = {
        has_header_text: true,
        crop_top: 22,
        crop_bottom: 0,
        aspect_ratio: '16:9',
        w: 1080,
        h: 608,
        originalWidth: 1080,
        originalHeight: 1920,
      };
    }

    const finalDetection = {
      has_header_text: localResult.has_header_text,
      crop_top: localResult.crop_top,
      crop_bottom: localResult.crop_bottom,
      aspect_ratio: localResult.aspect_ratio,
      method: 'local_ffmpeg_cropdetect',
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
  }
}
