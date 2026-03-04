import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

export const VideoCaptureService = {
    /**
     * Extracts strategic keyframes from a YouTube video.
     */
    async extractFrames(videoId: string, count: number = 5): Promise<string[]> {
        const outputDir = path.join(process.cwd(), 'tmp', 'frames', videoId);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        try {
            // 1. Get duration and stream URL
            const { stdout: durationStr } = await execPromise(`yt-dlp --get-duration "https://www.youtube.com/watch?v=${videoId}"`);
            const { stdout: streamUrl } = await execPromise(`yt-dlp -g -f "bestvideo[ext=mp4]/best[ext=mp4]/best" "https://www.youtube.com/watch?v=${videoId}"`);

            const url = streamUrl.trim();
            const durationParts = durationStr.trim().split(':').map(Number);
            let totalSeconds = 0;
            if (durationParts.length === 3) totalSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
            else if (durationParts.length === 2) totalSeconds = durationParts[0] * 60 + durationParts[1];
            else totalSeconds = durationParts[0] || 0;

            const framePaths: string[] = [];
            // Sample at 10%, 30%, 50%, 70%, 90%
            const samplePoints = [0.1, 0.3, 0.5, 0.7, 0.9];

            for (let i = 0; i < Math.min(count, samplePoints.length); i++) {
                const timestamp = Math.floor(totalSeconds * samplePoints[i]);
                const outputPath = path.join(outputDir, `frame_${i}.jpg`);

                // Fast seek (-ss before -i) + 1 frame capture
                await execPromise(`ffmpeg -ss ${timestamp} -i "${url}" -frames:v 1 -q:v 2 "${outputPath}" -y`);
                framePaths.push(outputPath);
            }

            return framePaths;
        } catch (error) {
            console.error('Error in VideoCaptureService:', error);
            throw new Error('Falha ao capturar frames do vídeo. Verifique se ffmpeg e yt-dlp estão configurados.');
        }
    },

    /**
     * Cleans up temporary frames for a video.
     */
    async cleanup(videoId: string) {
        const outputDir = path.join(process.cwd(), 'tmp', 'frames', videoId);
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
    }
};
