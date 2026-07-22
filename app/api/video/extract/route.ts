import { NextResponse } from 'next/server';
import { VideoCaptureService } from '@/lib/video-capture';
import { detectPlatform } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth-helpers';

/**
 * POST /api/video/extract
 * Extracts metadata from any video URL using yt-dlp + OpenGraph fallback.
 * Requires authentication.
 * 
 * Body: { url: string }
 * Returns: VideoMetadata compatible with YouTubeVideo card rendering
 */
export async function POST(request: Request) {
    try {
        // SEC-04 FIX: Require authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL é obrigatória' },
                { status: 400 }
            );
        }

        // Basic URL validation
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('invalid protocol');
            }
        } catch {
            return NextResponse.json(
                { error: 'URL inválida. Verifique se começa com http:// ou https://' },
                { status: 400 }
            );
        }

        const source = detectPlatform(url);
        console.log(`[API /video/extract] Extracting from ${source}: ${url}`);

        // Extract metadata using yt-dlp (with OpenGraph fallback)
        const metadata = await VideoCaptureService.extractMetadataFromUrl(url);

        if (!metadata) {
            return NextResponse.json(
                { 
                    error: `Não foi possível extrair informações deste link. ` +
                           `Verifique se o vídeo é público e compartilhável. ` +
                           `Plataformas com login obrigatório (Instagram privado, etc.) podem não funcionar.`,
                    source 
                },
                { status: 422 }
            );
        }

        // Map to YouTubeVideo-compatible format for the frontend
        const videoData = {
            id: metadata.id,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            views: metadata.views,
            likes: metadata.likes,
            comments: metadata.comments,
            duration: formatDurationFromSeconds(metadata.duration),
            publishedAt: metadata.uploadDate || new Date().toISOString().split('T')[0],
            channelId: metadata.uploaderId || `${source}_${metadata.id}`,
            channelName: metadata.uploader,
            description: metadata.description,
            url: metadata.url,
            source: metadata.source,
            originalUrl: url,
            type: 'video' as const,
        };

        return NextResponse.json({
            success: true,
            video: videoData,
            source: metadata.source,
            hasFullMetadata: metadata.views > 0 || metadata.duration > 0,
        });

    } catch (error: any) {
        console.error('[API /video/extract] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno ao extrair vídeo' },
            { status: 500 }
        );
    }
}

function formatDurationFromSeconds(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}
