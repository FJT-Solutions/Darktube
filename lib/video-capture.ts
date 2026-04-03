import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { VideoSource } from './types';
import { detectPlatform } from './utils';

const execFilePromise = promisify(execFile);
const execPromise = promisify(exec);

/**
 * Resolve local standalone binary inside Dokploy/Docker containers,
 * or fallback to global system PATH when running in local dev.
 */
function getYtDlpPath(): string {
    // Check common locations in Docker/standalone
    const possiblePaths = [
        path.join(process.cwd(), 'yt-dlp'),
        '/app/yt-dlp',
        path.join(process.cwd(), '.next/standalone/yt-dlp')
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`[VideoCaptureService] Encontrado yt-dlp em: ${p}`);
            return p;
        }
    }
    
    console.warn(`[VideoCaptureService] yt-dlp não encontrado em caminhos fixos, usando fallback: 'yt-dlp'`);
    return 'yt-dlp'; // Fallback to system PATH
}

/**
 * Get universal arguments for yt-dlp with anti-bot heuristics and cookie support.
 */
function getUniversalYtDlpArgs(url: string, cookiesPath?: string): string[] {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const args = [
        '--no-warnings',
        '--no-playlist',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    if (isYouTube) {
        // web_creator and mweb have higher success rate on server IPs in 2026
        args.push('--extractor-args', 'youtube:player_client=web_creator,mweb,ios,android');
        
        if (cookiesPath && fs.existsSync(cookiesPath)) {
            args.push('--cookies', cookiesPath);
        }
    }

    return args;
}

/**
 * Manages temporary cookies file from environment variable.
 */
function handleYoutubeCookies(): { path: string | null; cleanup: () => void } {
    const cookiesContent = process.env.YOUTUBE_COOKIES;
    if (!cookiesContent || cookiesContent.trim().length < 10) {
        return { path: null, cleanup: () => {} };
    }

    try {
        const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(baseTmp)) fs.mkdirSync(baseTmp, { recursive: true });
        
        const cookiesPath = path.join(baseTmp, `cookies_${Date.now()}.txt`);
        fs.writeFileSync(cookiesPath, cookiesContent);
        console.log(`[VideoCaptureService] Using provided YouTube cookies from environment variable.`);
        
        return { 
            path: cookiesPath, 
            cleanup: () => {
                try { if (fs.existsSync(cookiesPath)) fs.unlinkSync(cookiesPath); } catch {}
            } 
        };
    } catch (err) {
        console.error(`[VideoCaptureService] Error handling YOUTUBE_COOKIES:`, err);
        return { path: null, cleanup: () => {} };
    }
}

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
    yt = YouTube(url, client='ANDROID')
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
    import traceback
    err_str = "".join(traceback.format_exception(type(e), e, e.__traceback__))
    print(json.dumps({"error": str(e), "traceback": err_str}))
    sys.exit(0)
`.trim();
}

export const VideoCaptureService = {
    /**
     * Download YouTube video via pytubefix (existing flow)
     */
    async downloadVideo(videoId: string): Promise<DownloadResult> {
        console.log(`[VideoCaptureService] Redirecionando ${videoId} para pipeline universal (yt-dlp)...`);
        return this.downloadFromUrl(`https://www.youtube.com/watch?v=${videoId}`);
    },

    /**
     * Extract metadata from any video URL.
     * YouTube: uses official Data API v3 (yt-dlp gets blocked by anti-bot).
     * Other platforms: uses yt-dlp → OpenGraph fallback chain.
     */
    async extractMetadataFromUrl(url: string): Promise<VideoMetadata | null> {
        const source = detectPlatform(url);
        
        // YouTube: use official API v3 directly (yt-dlp gets anti-bot blocked on servers)
        if (source === 'youtube') {
            console.log(`[VideoCaptureService] Extracting YouTube metadata via API v3: ${url}`);
            const apiResult = await this.extractYouTubeViaAPI(url);
            if (apiResult) return apiResult;
            // Fallback to oEmbed if API key missing or quota exceeded
            console.warn(`[VideoCaptureService] YouTube API v3 failed, trying oEmbed`);
            const oEmbedResult = await this.extractYouTubeOEmbed(url);
            if (oEmbedResult) return oEmbedResult;
            return this.extractOpenGraphMetadata(url, source);
        }
        
        // Non-YouTube: use yt-dlp → OpenGraph fallback
        try {
            console.log(`[VideoCaptureService] Extracting metadata from ${source}: ${url}`);
            const { path: cookies, cleanup } = handleYoutubeCookies();
            let data: any;
            try {
                const { stdout } = await execFilePromise(
                    getYtDlpPath(),
                    [
                        ...getUniversalYtDlpArgs(url, cookies),
                        '--dump-json', 
                        '--no-download', 
                        url
                    ],
                    { timeout: 30000 }
                );
                data = JSON.parse(stdout.trim());
            } finally {
                cleanup();
            }
            
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
     * YouTube Data API v3: returns full metadata (views, likes, duration, date).
     * Uses the same API key already configured in the project.
     */
    async extractYouTubeViaAPI(url: string): Promise<VideoMetadata | null> {
        try {
            const apiKey = process.env.YOUTUBE_API_KEY;
            if (!apiKey) {
                console.warn('[VideoCaptureService] YOUTUBE_API_KEY not configured');
                return null;
            }

            const videoIdMatch = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
            const videoId = videoIdMatch?.[1];
            if (!videoId) {
                console.warn('[VideoCaptureService] Could not extract YouTube video ID');
                return null;
            }

            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`;
            const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
            
            if (!response.ok) {
                console.warn(`[VideoCaptureService] YouTube API returned ${response.status}`);
                return null;
            }

            const data = await response.json();
            const item = data.items?.[0];
            if (!item) {
                console.warn('[VideoCaptureService] YouTube API returned no items');
                return null;
            }

            // Parse ISO 8601 duration (PT1H2M3S) to seconds
            const durationStr = item.contentDetails?.duration || '';
            const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const hours = parseInt(durationMatch?.[1] || '0', 10);
            const minutes = parseInt(durationMatch?.[2] || '0', 10);
            const seconds = parseInt(durationMatch?.[3] || '0', 10);
            const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

            const publishedAt = item.snippet?.publishedAt || '';
            const uploadDate = publishedAt ? publishedAt.split('T')[0] : '';

            console.log(`[VideoCaptureService] YouTube API v3 success: "${item.snippet?.title}"`);

            return {
                id: videoId,
                title: decodeHtmlEntities(item.snippet?.title || 'Sem título'),
                thumbnail: item.snippet?.thumbnails?.maxres?.url ||
                    item.snippet?.thumbnails?.high?.url ||
                    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: totalSeconds,
                views: parseInt(item.statistics?.viewCount || '0', 10),
                likes: parseInt(item.statistics?.likeCount || '0', 10),
                comments: parseInt(item.statistics?.commentCount || '0', 10),
                uploader: decodeHtmlEntities(item.snippet?.channelTitle || 'Desconhecido'),
                uploaderId: item.snippet?.channelId || '',
                uploadDate,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                source: 'youtube' as VideoSource,
                description: decodeHtmlEntities((item.snippet?.description || '').slice(0, 500)),
            };
        } catch (error: any) {
            console.warn(`[VideoCaptureService] YouTube API v3 error: ${error.message}`);
            return null;
        }
    },

    /**
     * YouTube-specific fallback: oEmbed API returns lightweight JSON (~500 bytes).
     * No yt-dlp or HTML parsing needed.
     */
    async extractYouTubeOEmbed(url: string): Promise<VideoMetadata | null> {
        try {
            console.log(`[VideoCaptureService] Trying YouTube oEmbed for: ${url}`);
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(10000) });
            
            if (!response.ok) {
                console.warn(`[VideoCaptureService] oEmbed returned ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            // Extrair video ID da URL para construir thumbnail de alta qualidade
            const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            const videoId = videoIdMatch?.[1] || '';
            
            return {
                id: videoId || urlToId(url),
                title: decodeHtmlEntities(data.title || 'Sem título'),
                thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : (data.thumbnail_url || ''),
                duration: 0, // oEmbed não fornece duração
                views: 0,    // oEmbed não fornece views
                likes: 0,
                comments: 0,
                uploader: decodeHtmlEntities(data.author_name || 'Desconhecido'),
                uploaderId: '',
                uploadDate: '',
                url,
                source: 'youtube' as VideoSource,
                description: '',
            };
        } catch (error: any) {
            console.warn(`[VideoCaptureService] YouTube oEmbed failed: ${error.message}`);
            return null;
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
            // Use Node.js native fetch instead of curl to avoid external binary dependency
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                },
                signal: controller.signal,
                redirect: 'follow',
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.warn(`[VideoCaptureService] OpenGraph fetch returned ${response.status}`);
                return null;
            }
            
            const html = await response.text();
            const getMeta = (property: string): string => {
                const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
                const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
                return regex.exec(html)?.[1] || altRegex.exec(html)?.[1] || '';
            };
            
            const title = getMeta('og:title') || getMeta('twitter:title') || '';
            const rawThumbnail = getMeta('og:image') || getMeta('twitter:image') || '';
            const thumbnail = this.maybeProxyThumbnail(rawThumbnail);
            
            // Extrair views/likes do título OG (Facebook pattern: "4.5M views · 25K reactions | Title")
            let views = 0;
            let likes = 0;
            const ogTitle = getMeta('og:title') || '';
            const viewsMatch = ogTitle.match(/([\d,.]+)\s*([MKmk])?\s*(?:views?|vues?|visualizaç)/i);
            if (viewsMatch) {
                let num = parseFloat(viewsMatch[1].replace(',', '.'));
                if (viewsMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
                if (viewsMatch[2]?.toUpperCase() === 'K') num *= 1_000;
                views = Math.round(num);
            }
            const reactionsMatch = ogTitle.match(/([\d,.]+)\s*([MKmk])?\s*(?:reactions?|réactions?|curtidas)/i);
            if (reactionsMatch) {
                let num = parseFloat(reactionsMatch[1].replace(',', '.'));
                if (reactionsMatch[2]?.toUpperCase() === 'M') num *= 1_000_000;
                if (reactionsMatch[2]?.toUpperCase() === 'K') num *= 1_000;
                likes = Math.round(num);
            }
            const duration = 0;
            const uploadDate = getMeta('og:updated_time') || getMeta('article:published_time') || '';
            
            if (!title && !thumbnail && duration === 0) {
                console.warn(`[VideoCaptureService] No OpenGraph data found for: ${url}`);
                return null;
            }
            
            return {
                id: urlToId(url),
                title: decodeHtmlEntities(title || 'Vídeo Externo'),
                thumbnail,
                duration,
                views,
                likes,
                comments: 0,
                uploader: decodeHtmlEntities(getMeta('og:site_name') || source),
                uploaderId: '',
                uploadDate: uploadDate.split('T')[0], // YYYY-MM-DD
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
        const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
        const outputDir = path.join(baseTmp, 'videos');
        const frameDir = path.join(baseTmp, 'frames', fileId);

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
            const { path: cookies, cleanup } = handleYoutubeCookies();
            try {
                // SEC-02 FIX: Use execFile with args array
                await execFilePromise(
                    getYtDlpPath(),
                    [
                        ...getUniversalYtDlpArgs(url, cookies),
                        '-f', 'worst[ext=mp4]/worst', 
                        '-o', videoPath, 
                        url
                    ],
                    { timeout: 180000 }
                );
            } finally {
                cleanup();
            }

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
