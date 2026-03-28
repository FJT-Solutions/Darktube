import { YoutubeTranscript } from 'youtube-transcript';
import { VideoCaptureService, type DownloadResult, detectPlatform, urlToId } from './video-capture';
import { GeminiVisionService, type RemodelingTemplate } from './gemini-vision';

export type { RemodelingTemplate } from './gemini-vision';

export interface AIAnalysisResult extends RemodelingTemplate {
    transcript?: string;
}

export const VideoAnalysisService = {
    async getTranscript(videoId: string): Promise<string> {
        try {
            const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' })
                .catch(() => YoutubeTranscript.fetchTranscript(videoId));
            return items.map(i => i.text).join(' ');
        } catch (error) {
            console.warn(`[VideoAnalysisService] No transcript for ${videoId}`);
            return '';
        }
    },

    async performVisualAnalysis(videoId: string, apiKey?: string): Promise<AIAnalysisResult> {
        let downloadResult: DownloadResult | null = null;
        const transcript = await this.getTranscript(videoId);

        try {
            console.log(`[VideoAnalysisService] Downloading via pytubefix for ${videoId}...`);
            downloadResult = await VideoCaptureService.downloadVideo(videoId);

            console.log(`[VideoAnalysisService] Sending to Gemini 2.5 Flash...`);
            const template = await GeminiVisionService.analyzeVideo({
                videoPath: downloadResult.videoPath,
                framePaths: downloadResult.framePaths,
                audioPath: downloadResult.audioPath,
                transcript,
            }, apiKey);

            return { ...template, transcript };
        } finally {
            if (videoId) {
                await VideoCaptureService.cleanupVideo(videoId).catch(e =>
                    console.warn('[VideoAnalysisService] Cleanup warning:', e)
                );
            }
        }
    },

    /**
     * Analyze video from any external URL (non-YouTube or YouTube share links).
     * Uses yt-dlp for download + frame extraction, then Gemini for analysis.
     */
    async performExternalAnalysis(url: string, apiKey?: string): Promise<AIAnalysisResult> {
        const source = detectPlatform(url);
        const fileId = urlToId(url);
        let transcript = '';

        // For YouTube URLs, try to get transcript
        if (source === 'youtube') {
            const videoIdMatch = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (videoIdMatch) {
                transcript = await this.getTranscript(videoIdMatch[1]);
            }
        }

        try {
            console.log(`[VideoAnalysisService] Downloading ${source} video via yt-dlp: ${url}`);
            const downloadResult = await VideoCaptureService.downloadFromUrl(url);

            console.log(`[VideoAnalysisService] Sending ${source} video to Gemini 2.5 Flash...`);
            const template = await GeminiVisionService.analyzeVideo({
                videoPath: downloadResult.videoPath,
                framePaths: downloadResult.framePaths,
                audioPath: downloadResult.audioPath,
                transcript,
            }, apiKey);

            return { ...template, transcript };
        } finally {
            await VideoCaptureService.cleanupVideo(fileId).catch(e =>
                console.warn('[VideoAnalysisService] External cleanup warning:', e)
            );
        }
    },
};

