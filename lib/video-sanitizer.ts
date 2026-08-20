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
