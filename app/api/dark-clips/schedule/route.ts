import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getDarkClipPosts, saveDarkClipPost, deleteDarkClipPost, updateDarkClipPostStatus } from '@/lib/database';
import { uploadMediaFile } from '@/lib/storage';
import { pool } from '@/lib/db-client';
import { logger } from '@/lib/logger';
import { triggerSocialDispatcher, isValidVideoUrl } from '@/lib/social-dispatcher';

const CANDIDATE_URLS = [
  'http://n8n-remotionservice-ry6eh9:3001',
  process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

export async function GET() {
  try {
    const user = await getCurrentUser();
    const posts = await getDarkClipPosts(user?.id);

    // 1. Auto-reconciliação de renders diretamente do storage do Remotion (mesmo com timeout inicial)
    for (const post of posts) {
      if (!isValidVideoUrl(post.rendered_video_url) || post.status === 'rendering' || post.status === 'failed') {
        for (const baseUrl of CANDIDATE_URLS) {
          const cleanBase = baseUrl.replace(/\/+$/, '');
          const fileCandidate = `${cleanBase}/storage/darkclip_${post.id}.mp4`;
          try {
            const checkRes = await fetch(fileCandidate, { method: 'HEAD' });
            if (checkRes.ok) {
              logger.success(`Vídeo renderizado reconciliado para ${post.id}`, { context: 'Scheduler', data: { fileCandidate } });
              const dlRes = await fetch(fileCandidate);
              if (dlRes.ok) {
                const arrayBuf = await dlRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                // Valida integridade do MP4: tamanho mínimo e presença do átomo 'moov'
                if (buffer.length > 10000 && buffer.includes(Buffer.from('moov'))) {
                  const filename = `rendered_darkclip_${post.id}.mp4`;
                  const permanentUrl = await uploadMediaFile(buffer, filename, 'video/mp4');

                  const targets = Array.isArray(post.target_accounts) ? post.target_accounts : [];
                  const remodel = (post.remodel_data || {}) as any;
                  const shouldDispatch = Boolean(
                    targets.length > 0 &&
                    (post.status === 'publishing' || remodel.dispatch_now || (post.status === 'scheduled' && (!post.scheduled_at || new Date(post.scheduled_at) <= new Date())))
                  );

                  const nextStatus = shouldDispatch ? 'publishing' : (post.status === 'scheduled' ? 'scheduled' : 'rendered');
                  await pool.query(
                    'UPDATE public.dark_clips_posts SET status = $1, rendered_video_url = $2, error_message = NULL WHERE id = $3',
                    [nextStatus, permanentUrl, post.id]
                  );
                  post.status = nextStatus as any;
                  post.rendered_video_url = permanentUrl;
                  post.error_message = undefined;

                  if (shouldDispatch) {
                    logger.info(`[Scheduler] Disparando auto-dispatch reconciliado para ${post.id}...`, { context: 'Scheduler' });
                    await triggerSocialDispatcher({
                      post: { ...post, rendered_video_url: permanentUrl },
                      videoUrl: permanentUrl,
                    });
                  }
                  break;
                } else {
                  logger.debug(`Arquivo detectado para ${post.id}, aguardando átomo 'moov'...`, { context: 'Scheduler' });
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    // 2. Limpeza de URLs inválidas (ex: UUIDs temporários inseridos por versões antigas)
    for (const post of posts) {
      if (post.rendered_video_url && !isValidVideoUrl(post.rendered_video_url)) {
        await pool.query('UPDATE public.dark_clips_posts SET rendered_video_url = NULL WHERE id = $1', [post.id]);
        post.rendered_video_url = undefined;
      }
    }

    // 3. Verificação de posts agendados cujo horário já chegou
    for (const post of posts) {
      const targets = Array.isArray(post.target_accounts) ? post.target_accounts : [];
      if (
        post.status === 'scheduled' &&
        post.scheduled_at &&
        new Date(post.scheduled_at) <= new Date() &&
        isValidVideoUrl(post.rendered_video_url) &&
        targets.length > 0
      ) {
        logger.info(`[Scheduler] Horário atingido para post agendado ${post.id}. Despachando...`, { context: 'Scheduler' });
        await triggerSocialDispatcher({ post });
        post.status = 'publishing' as any;
      }
    }

    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (body.action === 'mark_published' && body.postId) {
      await updateDarkClipPostStatus(body.postId, 'published', body.renderedVideoUrl);
      return NextResponse.json({ success: true });
    }

    const {
      postId,
      clipId,
      title,
      renderedVideoUrl,
      remodelData,
      scheduledAt,
      targetAccounts = [],
      dispatchNow = false,
      facebookPageId,
    } = body;

    // Se postId não foi fornecido explicitamente, procura registro existente para este clipId
    let targetPostId = postId;
    if (!targetPostId && clipId) {
      const existing = await pool.query(
        'SELECT id, rendered_video_url FROM public.dark_clips_posts WHERE clip_id = $1 ORDER BY created_at DESC LIMIT 1',
        [clipId]
      );
      if (existing.rows.length > 0) {
        targetPostId = existing.rows[0].id;
      }
    }

    const validVideo = isValidVideoUrl(renderedVideoUrl) ? renderedVideoUrl : undefined;

    const post = await saveDarkClipPost({
      id: targetPostId || undefined,
      user_id: user?.id,
      clip_id: clipId,
      title: title || remodelData?.headline_main || 'Dark Clip Meme',
      rendered_video_url: validVideo,
      remodel_data: {
        ...(remodelData || {}),
        facebook_page_id: facebookPageId,
        dispatch_now: Boolean(dispatchNow),
      },
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      status: dispatchNow ? 'publishing' : 'scheduled',
      target_accounts: targetAccounts,
    });

    // Se dispatchNow foi solicitado
    if (dispatchNow) {
      if (isValidVideoUrl(post.rendered_video_url)) {
        await triggerSocialDispatcher({
          post,
          videoUrl: post.rendered_video_url,
          targetAccounts,
          facebookPageId,
          title: post.title,
        });
      } else {
        logger.info(`[Scheduler] Post ${post.id} salvo com status 'publishing', aguardando renderização do MP4 para despacho.`, {
          context: 'Scheduler',
        });
      }
    }

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    logger.error('Erro na rota schedule API:', err, { context: 'Scheduler' });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await deleteDarkClipPost(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
