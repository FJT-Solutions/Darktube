import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

/**
 * Sanitiza o arquivo de vídeo removendo metadados EXIF, device tags e assinaturas antigas
 */
export async function sanitizeVideo(inputPath: string, outputPath: string): Promise<string> {
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
    console.warn(`[Sanitizer] FFmpeg sanitize copy failed, trying full transcode:`, err?.message);
    try {
      await execFilePromise(
        'ffmpeg',
        [
          '-i', inputPath,
          '-map_metadata', '-1',
          '-map_chapters', '-1',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '22',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          outputPath,
          '-y'
        ],
        { timeout: 120000 }
      );
      return outputPath;
    } catch (e: any) {
      console.warn(`[Sanitizer] Full transcode failed, using original file:`, e?.message);
    }
  }
  return inputPath;
}

/**
 * Cria um clipe de vídeo MP4 1080x1920 a partir de uma imagem estática (fallback para posts/fotos)
 */
export async function createVideoFromImage(imagePath: string, outputPath: string, duration = 12): Promise<string> {
  try {
    await execFilePromise(
      'ffmpeg',
      [
        '-loop', '1',
        '-i', imagePath,
        '-c:v', 'libx264',
        '-t', String(duration),
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black',
        '-r', '30',
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
    console.warn(`[Sanitizer] FFmpeg createVideoFromImage error:`, err?.message);
  }
  return outputPath;
}
