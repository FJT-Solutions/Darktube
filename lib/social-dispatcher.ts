import path from 'path';
import fs from 'fs';
import { pool } from '@/lib/db-client';
import { logger } from '@/lib/logger';
import { getPythonCommand, safeSpawn } from '@/lib/python-runtime';
import { getUserApiKey } from '@/lib/database';

export function isValidVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Reject raw UUIDs (e.g. 11e526cf-e7fa-4f26-b28d-ea131493a523)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return false;
  }
  return (
    trimmed.startsWith('/api/storage/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

export interface DispatchOptions {
  post: {
    id: string;
    user_id?: string;
    clip_id?: string;
    title?: string;
    rendered_video_url?: string;
    remodel_data?: any;
    target_accounts?: string[];
    scheduled_at?: string;
    status?: string;
  };
  videoUrl?: string;
  targetAccounts?: string[];
  facebookPageId?: string;
  caption?: string;
  hashtags?: string[];
  title?: string;
}

export async function triggerSocialDispatcher(options: DispatchOptions): Promise<{ success: boolean; error?: string }> {
  const { post } = options;
  if (!post || !post.id) {
    return { success: false, error: 'Post ID is required' };
  }

  // 1. Resolve and validate the video URL
  let videoUrl = options.videoUrl || post.rendered_video_url || '';
  if (!isValidVideoUrl(videoUrl)) {
    logger.warn(`[Social Dispatcher] Post ${post.id} não possui vídeo renderizado válido (${videoUrl}). Disparo adiado.`, {
      context: 'Scheduler',
    });
    return { success: false, error: 'Video URL is not valid or ready yet' };
  }

  // 2. Resolve target accounts
  const targetAccounts = options.targetAccounts || post.target_accounts || [];
  if (!targetAccounts || targetAccounts.length === 0) {
    logger.info(`[Social Dispatcher] Post ${post.id} não possui contas de destino selecionadas. Nenhum upload necessário.`, {
      context: 'Scheduler',
    });
    return { success: true };
  }

  // 3. Resolve caption and hashtags
  const remodelData = post.remodel_data || {};
  const caption = options.caption || remodelData?.post_caption || remodelData?.caption || post.title || 'Dark Clip';
  const hashtagsArray = options.hashtags || remodelData?.hashtags || [];
  const hashtagsFormatted = Array.isArray(hashtagsArray)
    ? hashtagsArray.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    : '';
  const fullCaption = `${caption} ${hashtagsFormatted}`.trim();

  // 4. Resolve Facebook Page ID
  const facebookPageId = options.facebookPageId || remodelData?.facebook_page_id || remodelData?.facebookPageId;

  // 5. Resolve local video file or accessible URL
  let videoArg = videoUrl;
  const tempDir = path.resolve(process.cwd(), 'scripts/social-uploader/sessions/temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // If stored in PostgreSQL public.storage_files, export buffer directly to local temp file
  if (videoUrl.includes('/api/storage/')) {
    const filename = path.basename(videoUrl);
    try {
      let sf = await pool.query('SELECT content FROM public.storage_files WHERE filename = $1', [filename]);
      if (sf.rows.length === 0 && filename.startsWith('rendered_')) {
        const altFilename = filename.replace(/^rendered_/, '');
        sf = await pool.query('SELECT content FROM public.storage_files WHERE filename = $1', [altFilename]);
      }
      if (sf.rows.length > 0 && sf.rows[0].content && sf.rows[0].content.length > 10000) {
        const localTempPath = path.join(tempDir, `dispatch_${post.id}.mp4`);
        fs.writeFileSync(localTempPath, sf.rows[0].content);
        videoArg = localTempPath;
        logger.info(`[Social Dispatcher] Vídeo extraído diretamente do storage DB para disco local (${(sf.rows[0].content.length / (1024 * 1024)).toFixed(2)} MB): ${localTempPath}`, {
          context: 'Scheduler',
        });
      }
    } catch (dbErr: any) {
      logger.warn(`[Social Dispatcher] Aviso ao extrair buffer do banco: ${dbErr?.message}`, { context: 'Scheduler' });
    }
  }

  // Fallback: If not exported to local file and is relative URL, format full URL
  if (!fs.existsSync(videoArg) && !videoArg.startsWith('http')) {
    const baseSiteUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    videoArg = `${baseSiteUrl.replace(/\/+$/, '')}${videoArg.startsWith('/') ? '' : '/'}${videoArg}`;
  }

  const platformsArg = targetAccounts.join(',');

  // 6. Update post status to 'publishing' in DB
  try {
    await pool.query(
      `UPDATE public.dark_clips_posts SET
        status = 'publishing',
        rendered_video_url = COALESCE($1, rendered_video_url),
        error_message = NULL
      WHERE id = $2`,
      [videoUrl, post.id]
    );
  } catch (err: any) {
    logger.warn(`[Social Dispatcher] Erro ao atualizar status para publishing: ${err?.message}`, { context: 'Scheduler' });
  }

  // 7. Launch Python dispatcher in background
  try {
    const uploaderScript = path.resolve(process.cwd(), 'scripts/social-uploader/dispatcher.py');
    const logDir = path.resolve(process.cwd(), 'scripts/social-uploader/sessions');
    const logFile = path.join(logDir, 'dispatcher.log');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const outLog = fs.openSync(logFile, 'a');

    const spawnArgs = [
      uploaderScript,
      '--video', videoArg,
      '--caption', fullCaption,
      '--title', post.title || options.title || 'Dark Clip Meme',
      '--video-url', videoArg.startsWith('http') ? videoArg : videoUrl,
      '--platforms', platformsArg,
      '--post-id', post.id,
    ];
    if (facebookPageId) {
      spawnArgs.push('--facebook-page-id', facebookPageId);
    }

    const pythonCmd = getPythonCommand();
    const child = safeSpawn(pythonCmd, ['-u', ...spawnArgs], {
      detached: true,
      stdio: ['ignore', outLog, outLog],
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || '',
      },
    });
    child.unref();

    logger.scheduler(`🚀 Despachante nativo acionado para redes: ${platformsArg} (Post: ${post.id})`, {
      logFile,
      videoArg,
      platforms: platformsArg,
    });
  } catch (uErr: any) {
    logger.error(`Erro ao disparar despachante nativo: ${uErr?.message}`, { context: 'Scheduler' });
    return { success: false, error: uErr?.message };
  }

  // 8. If n8n webhook is configured, notify it
  try {
    let webhookUrl = post.user_id ? await getUserApiKey(post.user_id, 'n8n_webhook') : null;
    if (!webhookUrl) webhookUrl = process.env.N8N_PRODUCTION_WEBHOOK_URL || null;

    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'dark_clips_publish',
          postId: post.id,
          userId: post.user_id,
          videoUrl,
          title: post.title,
          caption,
          hashtags: hashtagsArray,
          targetAccounts,
          scheduledAt: post.scheduled_at,
          timestamp: new Date().toISOString(),
        }),
      });
    }
  } catch (dispatchErr: any) {
    logger.error('Webhook dispatch error:', dispatchErr, { context: 'Scheduler' });
  }

  return { success: true };
}
