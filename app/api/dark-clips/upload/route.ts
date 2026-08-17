import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { saveDarkClip } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth-helpers';
import { verifyJWT } from '@/lib/crypto';
import { pool } from '@/lib/db-client';

const execFilePromise = promisify(execFile);

/**
 * Sanitiza o arquivo de vídeo removendo metadados EXIF, device tags e assinaturas antigas
 */
async function sanitizeVideo(inputPath: string, outputPath: string): Promise<string> {
  try {
    await execFilePromise(
      'ffmpeg',
      [
        '-i', inputPath,
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        outputPath,
        '-y'
      ],
      { timeout: 60000 }
    );
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      return outputPath;
    }
  } catch (err: any) {
    console.warn(`[Upload Sanitizer] FFmpeg copy failed, falling back to original:`, err?.message);
  }
  return inputPath;
}

/**
 * Gera thumbnail do vídeo usando FFmpeg (se disponível)
 */
async function generateVideoThumbnail(videoPath: string, thumbPath: string): Promise<boolean> {
  try {
    await execFilePromise(
      'ffmpeg',
      [
        '-ss', '00:00:00.500',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        thumbPath,
        '-y'
      ],
      { timeout: 15000 }
    );
    return fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 200;
  } catch (err: any) {
    console.warn(`[Upload Thumbnail] FFmpeg thumb generation failed:`, err?.message);
    return false;
  }
}

/**
 * Obtém a duração do vídeo usando FFprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execFilePromise(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ],
      { timeout: 10000 }
    );
    const dur = parseFloat(stdout.trim());
    if (!isNaN(dur) && dur > 0) return Math.round(dur);
  } catch {
    // fallback
  }
  return 15;
}

export async function POST(req: Request) {
  try {
    let user = await getCurrentUser();

    if (!user) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          user = (await verifyJWT(token)) as any;
        } catch {}
      }
    }

    const targetUserId = user?.id || null;

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      const singleFile = formData.get('file') as File;
      if (singleFile) files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo de vídeo foi enviado.' }, { status: 400 });
    }

    const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
    const uploadTmpDir = path.join(baseTmp, 'direct_uploads');
    if (!fs.existsSync(uploadTmpDir)) fs.mkdirSync(uploadTmpDir, { recursive: true });

    const results = [];

    for (const file of files) {
      try {
        const originalName = file.name || `video_${Date.now()}.mp4`;
        const cleanName = originalName.replace(/\.[^/.]+$/, '');
        const extension = path.extname(originalName).toLowerCase() || '.mp4';
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const tempInputPath = path.join(uploadTmpDir, `raw_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`);
        fs.writeFileSync(tempInputPath, fileBuffer);

        const tempSanitizedPath = path.join(uploadTmpDir, `sanitized_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
        const finalVideoPath = await sanitizeVideo(tempInputPath, tempSanitizedPath);

        const duration = await getVideoDuration(finalVideoPath);

        // Gera thumbnail se possível
        const tempThumbPath = path.join(uploadTmpDir, `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
        const thumbOk = await generateVideoThumbnail(finalVideoPath, tempThumbPath);

        // Upload do vídeo para storage_files
        const finalBuffer = fs.readFileSync(finalVideoPath);
        const storedVideoFilename = `uploaded_clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
        
        await pool.query(`
          INSERT INTO public.storage_files (filename, mime_type, content)
          VALUES ($1, $2, $3)
          ON CONFLICT (filename)
          DO UPDATE SET content = EXCLUDED.content, mime_type = EXCLUDED.mime_type
        `, [storedVideoFilename, 'video/mp4', finalBuffer]);

        const servedVideoUrl = `/api/storage/${storedVideoFilename}`;

        let servedThumbUrl = '';
        if (thumbOk && fs.existsSync(tempThumbPath)) {
          const thumbBuffer = fs.readFileSync(tempThumbPath);
          const storedThumbFilename = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          await pool.query(`
            INSERT INTO public.storage_files (filename, mime_type, content)
            VALUES ($1, $2, $3)
            ON CONFLICT (filename)
            DO UPDATE SET content = EXCLUDED.content, mime_type = EXCLUDED.mime_type
          `, [storedThumbFilename, 'image/jpeg', thumbBuffer]);
          servedThumbUrl = `/api/storage/${storedThumbFilename}`;
        }

        // Cleanup temp files
        try {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          if (fs.existsSync(tempSanitizedPath)) fs.unlinkSync(tempSanitizedPath);
          if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
        } catch {}

        const saved = await saveDarkClip({
          user_id: targetUserId || undefined,
          original_url: originalName,
          platform: 'upload',
          video_url: servedVideoUrl,
          thumbnail_url: servedThumbUrl,
          duration: duration || 15,
          author_name: 'Upload Direto',
          author_handle: '@meu-video',
          author_avatar: '',
          original_caption: cleanName,
          original_metrics: {},
          sanitized: true,
        });

        results.push(saved);
      } catch (fileErr: any) {
        console.error(`[Direct Video Upload] Error processing ${file.name}:`, fileErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      clips: results,
    });
  } catch (err: any) {
    console.error('[Direct Video Upload] Internal Server Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
