import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { saveDarkClip, getDarkClips, deleteDarkClip, getUserApiKey } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth-helpers';
import { VideoCaptureService } from '@/lib/video-capture';
import { uploadThumbnail } from '@/lib/storage';
import { sanitizeVideo } from '@/lib/video-sanitizer';
import { generateAiRemodelForClip } from '../remodel-ai/route';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const clips = await getDarkClips(user?.id);
    return NextResponse.json({ success: true, clips });
  } catch (err: any) {
    console.error('Error fetching dark clips:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { verifyJWT } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    let user = await getCurrentUser();
    const body = await req.json();
    const { 
      urls = [], 
      items = [], // direct metadata items from extension
      platform = 'other',
      userId = null
    } = body;

    // Check token from headers if not found in session cookies
    if (!user) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          user = await verifyJWT(token) as any;
        } catch {}
      }
    }

    const targetUserId = user?.id || userId || null;
    const userOpenAiKey = targetUserId ? await getUserApiKey(targetUserId, 'openai') : null;
    const userGeminiKey = targetUserId ? await getUserApiKey(targetUserId, 'gemini') : null;

    const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
    const sanitizedDir = path.join(baseTmp, 'sanitized_clips');
    if (!fs.existsSync(sanitizedDir)) fs.mkdirSync(sanitizedDir, { recursive: true });

    const results = [];

    // ── 1. Process items directly from extension ──
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        try {
          // Normalize source URL (never accept blob: as videoUrl)
          let sourceUrl = item.url || item.originalUrl || item.videoUrl || '';
          if (sourceUrl.startsWith('blob:')) {
            sourceUrl = item.url || item.originalUrl || '';
          }

          let servedVideoUrl = '';
          let duration = item.duration || 15;
          let thumbUrl = item.thumbnailUrl || item.thumbnail || '';

          // If source is a valid web URL, download and sanitize into local persistent MP4
          if (sourceUrl.startsWith('http') && !sourceUrl.includes('/api/storage/') && !sourceUrl.endsWith('.mp4')) {
            console.log(`[DarkClips Import] Downloading item from source: ${sourceUrl}`);
            const dl = await VideoCaptureService.downloadFromUrl(sourceUrl);
            if (dl.videoPath && fs.existsSync(dl.videoPath)) {
              const sanitizedPath = path.join(sanitizedDir, `sanitized_${path.basename(dl.videoPath)}`);
              await sanitizeVideo(dl.videoPath, sanitizedPath);

              // Upload to database storage for persistent serving
              const fileBuffer = fs.readFileSync(sanitizedPath);
              const filename = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
              await uploadThumbnail(fileBuffer, filename);
              servedVideoUrl = `/api/storage/${filename}`;

              if (dl.framePaths && dl.framePaths.length > 0 && fs.existsSync(dl.framePaths[0])) {
                const frameBuf = fs.readFileSync(dl.framePaths[0]);
                const thumbName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                thumbUrl = await uploadThumbnail(frameBuf, thumbName);
              }
              duration = dl.duration || duration;
            }
          } else if (sourceUrl.startsWith('http')) {
            servedVideoUrl = sourceUrl;
          }

          if (!servedVideoUrl && sourceUrl) {
            servedVideoUrl = sourceUrl;
          }

          const rawHandle = item.authorHandle || item.author_handle || '@creator';
          const author_handle = rawHandle.startsWith('@') ? rawHandle.replace(/^@+/, '@') : `@${rawHandle}`;
          const rawCaption = item.originalCaption || item.caption || item.title || '';

          // Geração automática de Gancho e Textos com IA para este clipe específico
          let remodelData = null;
          try {
            remodelData = await generateAiRemodelForClip({
              originalCaption: rawCaption,
              authorName: item.authorName || item.author_name || 'Viral Creator',
              authorHandle: author_handle,
              platform: item.platform || platform,
              userOpenAiKey,
              userGeminiKey,
            });
          } catch (aiErr) {
            console.warn('[DarkClips Import] Aviso ao gerar IA para clipe importado:', aiErr);
          }

          const saved = await saveDarkClip({
            user_id: targetUserId,
            original_url: sourceUrl,
            platform: item.platform || platform,
            video_url: servedVideoUrl,
            thumbnail_url: thumbUrl,
            duration,
            author_name: item.authorName || item.author_name || 'Viral Creator',
            author_handle,
            author_avatar: item.authorAvatar || item.author_avatar || '',
            original_caption: rawCaption,
            original_metrics: item.metrics || item.original_metrics || {},
            remodel_data: remodelData || {},
            sanitized: true
          });
          results.push(saved);
        } catch (e: any) {
          console.error('[DarkClips Import] Item error:', e);
        }
      }
    }

    // ── 2. Process list of raw URLs ──
    if (Array.isArray(urls) && urls.length > 0) {
      for (const rawUrl of urls) {
        const cleanUrl = rawUrl.trim();
        if (!cleanUrl) continue;

        try {
          console.log(`[DarkClips Import] Downloading & sanitizing URL: ${cleanUrl}`);
          const dl = await VideoCaptureService.downloadFromUrl(cleanUrl);

          let servedVideoUrl = '';
          if (dl.videoPath && fs.existsSync(dl.videoPath)) {
            const sanitizedPath = path.join(sanitizedDir, `sanitized_${path.basename(dl.videoPath)}`);
            await sanitizeVideo(dl.videoPath, sanitizedPath);

            const fileBuffer = fs.readFileSync(sanitizedPath);
            const filename = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
            await uploadThumbnail(fileBuffer, filename);
            servedVideoUrl = `/api/storage/${filename}`;
          }

          let thumbUrl = '';
          if (dl.framePaths && dl.framePaths.length > 0 && fs.existsSync(dl.framePaths[0])) {
            const frameBuf = fs.readFileSync(dl.framePaths[0]);
            const thumbName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            thumbUrl = await uploadThumbnail(frameBuf, thumbName);
          }

          let detectedPlatform = 'other';
          if (cleanUrl.includes('instagram.com')) detectedPlatform = 'instagram';
          else if (cleanUrl.includes('tiktok.com')) detectedPlatform = 'tiktok';
          else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) detectedPlatform = 'youtube';
          else if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) detectedPlatform = 'twitter';
          else if (cleanUrl.includes('facebook.com')) detectedPlatform = 'facebook';

          // Geração automática de Gancho e Textos com IA para a URL importada
          let remodelData = null;
          try {
            remodelData = await generateAiRemodelForClip({
              originalCaption: cleanUrl,
              authorName: 'Viral Creator',
              authorHandle: '@viral',
              platform: detectedPlatform,
              userOpenAiKey,
              userGeminiKey,
            });
          } catch (aiErr) {
            console.warn('[DarkClips Import] Aviso ao gerar IA para URL:', aiErr);
          }

          const saved = await saveDarkClip({
            user_id: targetUserId,
            original_url: cleanUrl,
            platform: detectedPlatform,
            video_url: servedVideoUrl,
            thumbnail_url: thumbUrl,
            duration: dl.duration || 15,
            author_name: 'Viral Creator',
            author_handle: '@viral',
            original_caption: '',
            remodel_data: remodelData || {},
            sanitized: true
          });
          results.push(saved);
        } catch (err: any) {
          console.error(`[DarkClips Import] Error downloading ${cleanUrl}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      clips: results
    });
  } catch (err: any) {
    console.error('Error importing dark clips:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await deleteDarkClip(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
