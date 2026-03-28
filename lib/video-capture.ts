import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { VideoSource } from './types';
import { detectPlatform } from './utils';

const execFilePromise = promisify(execFile);
const execPromise = promisify(exec);

export interface DownloadResult {
    videoPath?: string;
    audioPath?: string;
    framePaths?: string[];
    isFallback?: boolean;
    duration?: number;
}

export interface VideoMetadata {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    views: number;
    likes: number;
    comments: number;
    uploader: string;
    uploaderId: string;
    uploadDate: string;
    url: string;
    source: VideoSource;
    description: string;
}

/**
 * Decode common HTML entities and numeric codes (e.g. &#xa0;, &amp;).
 */
function decodeHtmlEntities(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\u00A0/g, ' ') // NBSP to normal space
        .trim();
}



/**
 * Generate a safe filesystem ID from a URL
 */
function urlToId(url: string): string {
    const hash = Buffer.from(url).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
    return `ext_${hash}`;
}

/**
 * Format seconds to HH:MM:SS or MM:SS duration string
 */
function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Python script that uses pytubefix to bypass YouTube's PO Token requirement.
 */
function buildPytubefixScript(videoId: string, outputDir: string, frameDir: string): string {
    return `
import sys, os, subprocess, json
try:
    from pytubefix import YouTube
except ImportError:
    print(json.dumps({"error": "pytubefix not installed. Run: pip3 install pytubefix --break-system-packages"}))
    sys.exit(1)

video_id = "${videoId}"
url = f"https://www.youtube.com/watch?v={video_id}"
output_dir = "${outputDir.replace(/\\/g, '/')}"
frame_dir = "${frameDir.replace(/\\/g, '/')}"
os.makedirs(output_dir, exist_ok=True)
os.makedirs(frame_dir, exist_ok=True)

try:
    yt = YouTube(url)
    title = yt.title

    stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
    if not stream:
        stream = yt.streams.filter(file_extension='mp4').order_by('filesize').first()

    video_path = os.path.join(output_dir, f"{video_id}.mp4")
    stream.download(output_path=output_dir, filename=f"{video_id}.mp4")

    probe = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', video_path],
        capture_output=True, text=True
    )
    duration = float(probe.stdout.strip() or 60)
    intervals = max(1, int(duration / 6))

    frame_paths = []
    for i in range(6):
        ts = min(i * intervals, int(duration) - 1)
        fp = os.path.join(frame_dir, f"f_{i:02d}.jpg")
        subprocess.run(
            ['ffmpeg', '-ss', str(ts), '-i', video_path, '-frames:v', '1', '-q:v', '2', fp, '-y'],
            capture_output=True
        )
        if os.path.exists(fp) and os.path.getsize(fp) > 0:
            frame_paths.append(fp)

    audio_path = os.path.join(output_dir, f"{video_id}.aac")
    subprocess.run(
        ['ffmpeg', '-i', video_path, '-t', '60', '-vn', '-c:a', 'aac', '-b:a', '64k', audio_path, '-y'],
        capture_output=True
    )

    result = {
        "success": True,
        "videoPath": video_path,
        "framePaths": frame_paths,
        "audioPath": audio_path if os.path.exists(audio_path) else None,
        "title": title,
        "duration": duration
    }
    print(json.dumps(result))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`.trim();
}

export const VideoCaptureService = {
    /**
     * Download YouTube video via pytubefix (existing flow)
     */
    async downloadVideo(videoId: string): Promise<DownloadResult> {
        const outputDir = path.join(process.cwd(), 'tmp', 'videos');
        const frameDir = path.join(process.cwd(), 'tmp', 'frames', videoId);

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

        const cachedVideo = path.join(outputDir, `${videoId}.mp4`);
        if (fs.existsSync(cachedVideo) && fs.statSync(cachedVideo).size > 100000) {
            console.log(`[VideoCaptureService] Using cached video for ${videoId}`);
            const frames = fs.readdirSync(frameDir)
                .filter(f => f.endsWith('.jpg'))
                .map(f => path.join(frameDir, f));
            return { videoPath: cachedVideo, framePaths: frames, isFallback: false };
        }

        const script = buildPytubefixScript(videoId, outputDir, frameDir);
        const scriptPath = path.join(outputDir, `${videoId}_dl.py`);
        fs.writeFileSync(scriptPath, script);

        try {
            console.log(`[VideoCaptureService] Downloading ${videoId} via pytubefix...`);
            const { stdout } = await execFilePromise('python3', [scriptPath], { timeout: 180000 });
            const result = JSON.parse(stdout.trim());

            if (result.error) {
                throw new Error(`pytubefix: ${result.error}`);
            }

            console.log(`[VideoCaptureService] Success: ${result.framePaths?.length} frames`);
            return {
                videoPath: result.videoPath,
                framePaths: result.framePaths || [],
                audioPath: result.audioPath || undefined,
                duration: result.duration || 0,
                isFallback: false,
            };
        } catch (error: any) {
            console.error(`[VideoCaptureService] pytubefix failed: ${error.message}`);
            
            const thumbPath = path.join(frameDir, 'thumb.jpg');
            try {
                await execFilePromise('curl', ['-s', '-L', '-o', thumbPath, `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`], { timeout: 10000 });
                if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 1000) {
                    console.warn(`[VideoCaptureService] Using thumbnail-only fallback for ${videoId}`);
                    return { framePaths: [thumbPath], isFallback: true };
                }
            } catch {}

            throw new Error(`Não foi possível acessar o vídeo. Verifique se ele é público e não tem restrição de idade. Detalhe: ${error.message}`);
        } finally {
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        }
    },

    /**
     * Extract metadata from any video URL using yt-dlp.
     * Falls back to OpenGraph if yt-dlp fails.
     */
    async extractMetadataFromUrl(url: string): Promise<VideoMetadata | null> {
        const source = detectPlatform(url);
        
        try {
            console.log(`[VideoCaptureService] Extracting metadata from ${source}: ${url}`);
            // SEC-02 FIX: Use execFile with args array to prevent command injection
            const { stdout } = await execFilePromise(
                'yt-dlp',
                ['--dump-json', '--no-download', '--no-warnings', '--no-playlist', url],
                { timeout: 30000 }
            );
            
            const data = JSON.parse(stdout.trim());
            
            let uploadDate = '';
            if (data.upload_date) {
                const d = data.upload_date;
                uploadDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
            }
            
            return {
                id: data.id || urlToId(url),
                title: decodeHtmlEntities(data.title || data.fulltitle || 'Sem título'),
                thumbnail: this.maybeProxyThumbnail(data.thumbnail || data.thumbnails?.[data.thumbnails.length - 1]?.url || ''),
                duration: data.duration || 0,
                views: data.view_count || 0,
                likes: data.like_count || 0,
                comments: data.comment_count || 0,
                uploader: decodeHtmlEntities(data.uploader || data.channel || data.creator || 'Desconhecido'),
                uploaderId: data.channel_id || data.uploader_id || '',
                uploadDate,
                url: data.webpage_url || url,
                source,
                description: decodeHtmlEntities((data.description || '').slice(0, 500)),
            };
        } catch (error: any) {
            console.warn(`[VideoCaptureService] yt-dlp metadata failed: ${error.message}`);
            return this.extractOpenGraphMetadata(url, source);
        }
    },

    /**
     * Determine if a thumbnail URL needs to be proxied.
     * Use case: Meta (FB, IG) blocks direct access (403).
     */
    maybeProxyThumbnail(url: string | null | undefined): string {
        if (!url) return '';
        
        // Domínios problemáticos que frequentemente retornam 403
        const needsProxy = [
            'fbcdn.net',
            'cdninstagram.com',
            'static.xx.fbcdn.net',
            'tiktokcdn.com'
        ].some(domain => url.includes(domain));

        if (needsProxy) {
            return `/api/proxy/image?url=${encodeURIComponent(url)}`;
        }
        
        return url;
    },

    /**
     * Fallback: Extract basic metadata from Open Graph meta tags.
     */
    async extractOpenGraphMetadata(url: string, source: VideoSource): Promise<VideoMetadata | null> {
        try {
            console.log(`[VideoCaptureService] Falling back to OpenGraph for: ${url}`);
            // SEC-02 FIX: Use execFile with args array
            const { stdout } = await execFilePromise(
                'curl',
                ['-sL', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '--max-time', '10', url],
                { timeout: 15000 }
            );
            
            const html = stdout;
            const getMeta = (property: string): string => {
                const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
                const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
                return regex.exec(html)?.[1] || altRegex.exec(html)?.[1] || '';
            };
            
            const title = getMeta('og:title') || getMeta('twitter:title') || '';
            const rawThumbnail = getMeta('og:image') || getMeta('twitter:image') || '';
            const thumbnail = this.maybeProxyThumbnail(rawThumbnail);
            
            // Tentar extrair duração de tags de vídeo (comum em FB/IG)
            // FB costuma usar og:video:duration (segundos) ou formatos ISO
            const durationStr = getMeta('video:duration') || getMeta('og:video:duration') || getMeta('video:duration_sec') || '0';
            
            let duration = 0;
            if (durationStr.startsWith('PT')) {
                // Parse ISO8601 duration (ex: PT1M30S)
                const m = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (m) {
                    const h = parseInt(m[1] || '0', 10);
                    const min = parseInt(m[2] || '0', 10);
                    const s = parseInt(m[3] || '0', 10);
                    duration = h * 3600 + min * 60 + s;
                }
            } else {
                duration = parseInt(durationStr, 10) || 0;
            }
            
            if (!title && !thumbnail && duration === 0) {
                console.warn(`[VideoCaptureService] No OpenGraph data found for: ${url}`);
                return null;
            }
            
            return {
                id: urlToId(url),
                title: decodeHtmlEntities(title || 'Vídeo Externo'),
                thumbnail,
                duration,
                views: 0,
                likes: 0,
                comments: 0,
                uploader: decodeHtmlEntities(getMeta('og:site_name') || source),
                uploaderId: '',
                uploadDate: '',
                url,
                source,
                description: decodeHtmlEntities((getMeta('og:description') || getMeta('twitter:description') || '').slice(0, 500)),
            };
        } catch (error: any) {
            console.error(`[VideoCaptureService] OpenGraph extraction failed: ${error.message}`);
            return null;
        }
    },

    /**
     * Download video from ANY URL using yt-dlp (universal).
     */
    async downloadFromUrl(url: string): Promise<DownloadResult> {
        const fileId = urlToId(url);
        const outputDir = path.join(process.cwd(), 'tmp', 'videos');
        const frameDir = path.join(process.cwd(), 'tmp', 'frames', fileId);

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

        // Check cache
        const cachedVideo = path.join(outputDir, `${fileId}.mp4`);
        if (fs.existsSync(cachedVideo) && fs.statSync(cachedVideo).size > 100000) {
            console.log(`[VideoCaptureService] Using cached video for ${fileId}`);
            const frames = fs.readdirSync(frameDir)
                .filter(f => f.endsWith('.jpg'))
                .map(f => path.join(frameDir, f));
            if (frames.length > 0) return { videoPath: cachedVideo, framePaths: frames, isFallback: false };
        }

        try {
            console.log(`[VideoCaptureService] Downloading via yt-dlp: ${url}`);
            
            const videoPath = path.join(outputDir, `${fileId}.mp4`);
            // SEC-02 FIX: Use execFile with args array
            await execFilePromise(
                'yt-dlp',
                ['--no-warnings', '--no-playlist', '-f', 'worst[ext=mp4]/worst', '-o', videoPath, url],
                { timeout: 180000 }
            );

            if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size < 10000) {
                throw new Error('Download produziu arquivo vazio ou muito pequeno');
            }

            // Extract duration using ffprobe
            let duration = 60;
            try {
                const { stdout: probeOut } = await execFilePromise(
                    'ffprobe',
                    ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
                    { timeout: 10000 }
                );
                duration = parseFloat(probeOut.trim()) || 60;
            } catch {}

            const intervals = Math.max(1, Math.floor(duration / 6));
            const framePaths: string[] = [];

            // Extract 6 frames evenly distributed
            for (let i = 0; i < 6; i++) {
                const ts = Math.min(i * intervals, Math.floor(duration) - 1);
                const fp = path.join(frameDir, `f_${String(i).padStart(2, '0')}.jpg`);
                try {
                    await execFilePromise(
                        'ffmpeg',
                        ['-ss', String(ts), '-i', videoPath, '-frames:v', '1', '-q:v', '2', fp, '-y'],
                        { timeout: 10000 }
                    );
                    if (fs.existsSync(fp) && fs.statSync(fp).size > 0) {
                        framePaths.push(fp);
                    }
                } catch {}
            }

            // Extract 60s audio
            const audioPath = path.join(outputDir, `${fileId}.aac`);
            try {
                await execFilePromise(
                    'ffmpeg',
                    ['-i', videoPath, '-t', '60', '-vn', '-c:a', 'aac', '-b:a', '64k', audioPath, '-y'],
                    { timeout: 30000 }
                );
            } catch {}

            console.log(`[VideoCaptureService] yt-dlp success: ${framePaths.length} frames`);
            return {
                videoPath,
                framePaths,
                audioPath: fs.existsSync(audioPath) ? audioPath : undefined,
                isFallback: false,
            };
        } catch (error: any) {
            console.error(`[VideoCaptureService] yt-dlp download failed: ${error.message}`);

            // Fallback: grab thumbnail via metadata
            try {
                const meta = await this.extractMetadataFromUrl(url);
                if (meta?.thumbnail) {
                    const thumbPath = path.join(frameDir, 'thumb.jpg');
                    await execFilePromise(
                        'curl',
                        ['-sL', '-o', thumbPath, meta.thumbnail],
                        { timeout: 10000 }
                    );
                    if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 1000) {
                        console.warn(`[VideoCaptureService] Using thumbnail-only fallback`);
                        return { framePaths: [thumbPath], isFallback: true };
                    }
                }
            } catch {}

            throw new Error(
                `Não foi possível baixar o vídeo. Verifique se o link é público e compartilhável. ` +
                `Algumas plataformas (Instagram, TikTok) podem bloquear downloads de servidores. ` +
                `Detalhe: ${error.message}`
            );
        }
    },

    async cleanupVideo(videoId: string) {
        const video = path.join(process.cwd(), 'tmp', 'videos', `${videoId}.mp4`);
        const audio = path.join(process.cwd(), 'tmp', 'videos', `${videoId}.aac`);
        const frames = path.join(process.cwd(), 'tmp', 'frames', videoId);
        if (fs.existsSync(video)) fs.unlinkSync(video);
        if (fs.existsSync(audio)) fs.unlinkSync(audio);
        if (fs.existsSync(frames)) fs.rmSync(frames, { recursive: true, force: true });
    },

    async cleanupAll() {
        const vDir = path.join(process.cwd(), 'tmp', 'videos');
        const fDir = path.join(process.cwd(), 'tmp', 'frames');
        if (fs.existsSync(vDir)) fs.rmSync(vDir, { recursive: true, force: true });
        if (fs.existsSync(fDir)) fs.rmSync(fDir, { recursive: true, force: true });
    }
};

export { formatDuration, urlToId };
