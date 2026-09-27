import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { saveDarkClipPost, getUserApiKey } from '@/lib/database';
import { uploadMediaFile } from '@/lib/storage';
import { pool } from '@/lib/db-client';
import { VideoCaptureService } from '@/lib/video-capture';
import { sanitizeVideo } from '@/lib/video-sanitizer';
import { generateAiRemodelForClip } from '../remodel-ai/route';
import { logger } from '@/lib/logger';
import { triggerSocialDispatcher } from '@/lib/social-dispatcher';
import fs from 'fs';
import path from 'path';

const CANDIDATE_URLS = [
  'http://n8n-remotionservice-ry6eh9:3001',
  process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
  process.env.REMOTION_SERVER_URL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[];

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Global in-memory set to prevent concurrent duplicate renders of the same clip
const activeClipRenders = new Set<string>();

export async function POST(req: Request) {
  let activeLockClipId: string | null = null;
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      clipId,
      title = 'Dark Clip Render',
      inputProps,
      durationInSeconds = 15,
      remodelData,
      targetAccounts = [],
      facebookPageId,
      dispatchNow = false,
      scheduledAt,
      postCaption,
      postHashtags,
    } = body;

    if (!inputProps || !inputProps.videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL e inputProps são obrigatórios.' }, { status: 400 });
    }

    if (clipId) {
      if (activeClipRenders.has(clipId)) {
        console.warn(`[DarkClips Render] Tentativa de render duplicado bloqueada para o clipe: ${clipId}`);
        return NextResponse.json({
          success: false,
          error: 'Este vídeo já está sendo produzido no momento. Aguarde a conclusão do render atual.',
          isAlreadyRendering: true,
        }, { status: 409 });
      }
      activeClipRenders.add(clipId);
      activeLockClipId = clipId;
    }

    let sourceVideoUrl = inputProps.videoUrl || '';

    let clipRecord = null;
    if (clipId) {
      try {
        const clipRes = await pool.query('SELECT * FROM public.dark_clips WHERE id = $1', [clipId]);
        if (clipRes.rows.length > 0) {
          clipRecord = clipRes.rows[0];
        }
      } catch (e) {}
    }

    // Auto-heal de URLs blob: antigas ou links web que ainda não foram baixados
    if (sourceVideoUrl.startsWith('blob:') || (sourceVideoUrl.startsWith('http') && !sourceVideoUrl.includes('/api/storage/') && !sourceVideoUrl.endsWith('.mp4'))) {
      if (clipRecord) {
        try {
          const originalUrl = (clipRecord.original_url && !clipRecord.original_url.startsWith('blob:')) ? clipRecord.original_url : (sourceVideoUrl.startsWith('blob:') ? '' : sourceVideoUrl);
          if (originalUrl && originalUrl.startsWith('http') && !originalUrl.includes('/api/storage/')) {
            logger.info(`Auto-healing clipe ${clipId} a partir de: ${originalUrl.slice(0, 60)}...`, { context: 'Render' });
            const dl = await VideoCaptureService.downloadFromUrl(originalUrl);
            if (dl.videoPath && fs.existsSync(dl.videoPath)) {
              const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp');
              const sanitizedDir = path.join(baseTmp, 'sanitized_clips');
              if (!fs.existsSync(sanitizedDir)) fs.mkdirSync(sanitizedDir, { recursive: true });
              const sanitizedPath = path.join(sanitizedDir, `sanitized_${path.basename(dl.videoPath)}`);
              await sanitizeVideo(dl.videoPath, sanitizedPath);

              const fileBuffer = fs.readFileSync(sanitizedPath);
              const filename = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
              sourceVideoUrl = await uploadMediaFile(fileBuffer, filename, 'video/mp4');

              // Atualizar registro no banco para que nunca mais tenha blob:
              await pool.query('UPDATE public.dark_clips SET video_url = $1 WHERE id = $2', [sourceVideoUrl, clipId]);
              logger.success(`Clipe recuperado e persistido com sucesso`, { context: 'Render', data: { sourceVideoUrl } });
            }
          }
        } catch (healErr: any) {
          logger.warn(`Aviso ao recuperar vídeo original: ${healErr.message}`, { context: 'Render' });
        }
      }
    }

    if (sourceVideoUrl.startsWith('blob:')) {
      return NextResponse.json({
        success: false,
        error: 'Este clipe foi minerado com uma URL temporária blob:. Por favor, reimporte o post com a extensão atualizada.',
      }, { status: 400 });
    }

    // ── Resolução Automática de Gancho de IA para o Vídeo ──
    const targetUserId = user?.id || null;
    let finalRemodelData = remodelData || {};
    const isGenericHeadline = !inputProps.headline?.mainText || inputProps.headline.mainText === 'Meu amigo: "Comprei um mic novo, mano."';

    if (isGenericHeadline && clipRecord) {
      const parsedRemodel = typeof clipRecord.remodel_data === 'string' ? JSON.parse(clipRecord.remodel_data) : (clipRecord.remodel_data || {});
      if (parsedRemodel?.headline_main) {
        inputProps.headline = {
          ...inputProps.headline,
          mainText: parsedRemodel.headline_main,
          subText: parsedRemodel.headline_sub || inputProps.headline?.subText,
        };
        finalRemodelData = parsedRemodel;
      } else {
        try {
          const userOpenAiKey = targetUserId ? await getUserApiKey(targetUserId, 'openai') : null;
          const userGeminiKey = targetUserId ? await getUserApiKey(targetUserId, 'gemini') : null;
          const generated = await generateAiRemodelForClip({
            originalCaption: clipRecord.original_caption || '',
            authorName: clipRecord.author_name || '',
            authorHandle: clipRecord.author_handle || '@darkclips',
            platform: clipRecord.platform || 'instagram',
            mainTextMode: inputProps.headline?.mainTextMode || 'ai',
            mainTextFixed: inputProps.headline?.mainText || '',
            mainTextMaxWords: inputProps.headline?.mainTextMaxWords || 8,
            subTextMode: inputProps.headline?.subTextMode || 'ai',
            subTextFixed: inputProps.headline?.subText || '',
            subTextMaxWords: inputProps.headline?.subTextMaxWords || 6,
            ctaMode: inputProps.footer?.mode || 'manual',
            fixedCta: inputProps.footer?.text || '',
            ctaMaxWords: inputProps.footer?.maxWords || 6,
            userOpenAiKey,
            userGeminiKey,
          });
          if (generated?.headline_main) {
            inputProps.headline = {
              ...inputProps.headline,
              mainText: generated.headline_main,
              subText: generated.headline_sub || inputProps.headline?.subText,
            };
            finalRemodelData = generated;
            await pool.query('UPDATE public.dark_clips SET remodel_data = $1 WHERE id = $2', [JSON.stringify(generated), clipId]);
          }
        } catch (genErr) {
          console.warn('[DarkClips Render] Aviso ao auto-gerar gancho de IA:', genErr);
        }
      }
    }

    // 1. Criar registro imediato no Histórico de Produções
    const postTitle = title || finalRemodelData.headline_main || clipRecord?.author_handle || 'Dark Clip Render';
    const isFutureSchedule = Boolean(scheduledAt && new Date(scheduledAt) > new Date());
    const initialStatus = dispatchNow ? 'publishing' : (isFutureSchedule ? 'scheduled' : 'rendering');

    const initialPost = await saveDarkClipPost({
      user_id: user?.id,
      clip_id: clipId,
      title: postTitle,
      remodel_data: {
        ...(finalRemodelData || {}),
        headline_main: inputProps.headline?.mainText || finalRemodelData?.headline_main,
        headline_sub: inputProps.headline?.subText || finalRemodelData?.headline_sub,
        cta_text: inputProps.footer?.text || finalRemodelData?.cta_text,
        post_caption: postCaption || finalRemodelData?.post_caption,
        hashtags: postHashtags || finalRemodelData?.hashtags,
        facebook_page_id: facebookPageId,
        dispatch_now: Boolean(dispatchNow),
      },
      status: initialStatus,
      target_accounts: targetAccounts || [],
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
    });

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://darktube.fjt-solutions.com'}/api/webhooks/production-complete`;

    // 2. Disparo assíncrono para o container do Remotion com polling inteligente de storage
    (async () => {
      let renderedVideoUrl = '';
      let lastError = '';
      let activeBaseUrl = '';

      const finalizeRenderedPost = async (url: string) => {
        renderedVideoUrl = url;
        const shouldDispatch = Boolean(
          (initialStatus === 'publishing' || dispatchNow || (initialStatus === 'scheduled' && (!scheduledAt || new Date(scheduledAt) <= new Date()))) &&
          targetAccounts && targetAccounts.length > 0
        );
        const nextStatus = shouldDispatch ? 'publishing' : (initialStatus === 'scheduled' ? 'scheduled' : 'rendered');
        await pool.query(
          'UPDATE public.dark_clips_posts SET status = $1, rendered_video_url = $2, error_message = NULL WHERE id = $3',
          [nextStatus, url, initialPost.id]
        );
        if (shouldDispatch) {
          logger.info(`Iniciando auto-dispatch para ${initialPost.id} após render...`, { context: 'Render' });
          await triggerSocialDispatcher({
            post: {
              ...initialPost,
              status: 'publishing',
              rendered_video_url: url,
              target_accounts: targetAccounts,
              remodel_data: {
                ...initialPost.remodel_data,
                facebook_page_id: facebookPageId,
                post_caption: postCaption,
                hashtags: postHashtags,
              },
            },
            videoUrl: url,
            targetAccounts,
            facebookPageId,
            caption: postCaption,
            hashtags: postHashtags,
            title: postTitle,
          });
        }
      };

      // ── Enquadramento de Vídeo ──
      // Respeita os parâmetros manuais do usuário. A detecção temporal de cabeçalhos estáticos
      let effectiveVideoPlacement = { ...(inputProps.videoPlacement || {}) };
      if (!effectiveVideoPlacement.fitMode && !effectiveVideoPlacement.fit_mode) {
        effectiveVideoPlacement.fitMode = 'contain';
      }

      let serverConnected = false;

      for (const baseUrl of CANDIDATE_URLS) {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const renderEndpoint = cleanBase.endsWith('/render') ? cleanBase : `${cleanBase}/render`;
        logger.info(`Despachando para Remotion Server em ${cleanBase} (Job: ${initialPost.id})`, { context: 'Render' });

        try {
          activeBaseUrl = cleanBase;
          const res = await fetch(renderEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              compositionId: 'DarkClipsVideo',
              historyId: initialPost.id,
              callbackUrl,
              inputProps: {
                ...inputProps,
                videoPlacement: effectiveVideoPlacement,
                videoUrl: sourceVideoUrl,
                durationInSeconds: durationInSeconds || 30,
              },
              durationInFrames: Math.round((durationInSeconds || 30) * 30),
            }),
          });

          serverConnected = true;

          if (res.ok) {
            const data = await res.json();
            const rawUrl = data.videoUrl || data.url || '';
            if (rawUrl) {
              logger.success(`Render concluído via ${cleanBase}. Persistindo no storage...`, { context: 'Render' });

              try {
                const fetchUrl = rawUrl.startsWith('http') ? rawUrl : `${cleanBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                const videoStreamRes = await fetch(fetchUrl);
                if (videoStreamRes.ok) {
                  const arrayBuf = await videoStreamRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuf);
                  const filename = `rendered_${path.basename(rawUrl)}`;
                  renderedVideoUrl = await uploadMediaFile(buffer, filename, 'video/mp4');
                  logger.success(`MP4 persistido com sucesso`, { context: 'Render', data: { renderedVideoUrl } });
                }
              } catch (persistErr: any) {
                logger.warn(`Aviso ao persistir MP4 no storage: ${persistErr.message}`, { context: 'Render' });
                renderedVideoUrl = rawUrl;
              }

              if (renderedVideoUrl) {
                await finalizeRenderedPost(renderedVideoUrl);
                break;
              }
            }
          } else {
            lastError = await res.text();
            logger.warn(`Resposta não-OK de ${cleanBase}: ${lastError}`, { context: 'Render' });
          }
        } catch (err: any) {
          lastError = err?.message;
          logger.debug(`Endpoint ${cleanBase} não respondeu: ${lastError}`, { context: 'Render' });
        }
      }

      // Se a conexão HTTP com um servidor ativo encerrou (timeout natural após 5 min), o Remotion continua processando em background.
      // Vamos monitorar a saída do storage do Remotion por até 12 minutos APENAS se algum servidor respondeu.
      if (!renderedVideoUrl && serverConnected && activeBaseUrl) {
        logger.info(`Monitorando storage do Remotion em ${activeBaseUrl}...`, { context: 'Render' });
        const expectedFileUrl = `${activeBaseUrl}/storage/darkclip_${initialPost.id}.mp4`;
        const startTime = Date.now();
        const maxWaitMs = 12 * 60 * 1000; // 12 minutos

        while (Date.now() - startTime < maxWaitMs) {
          await new Promise((resolve) => setTimeout(resolve, 6000));
          try {
            const checkRes = await fetch(expectedFileUrl, { method: 'HEAD' });
            if (checkRes.ok) {
              logger.info(`Arquivo detectado no Remotion via polling: ${expectedFileUrl}`, { context: 'Render' });
              const dlRes = await fetch(expectedFileUrl);
              if (dlRes.ok) {
                const arrayBuf = await dlRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                // Valida integridade do MP4: tamanho mínimo e presença do átomo 'moov'
                if (buffer.length > 10000 && buffer.includes(Buffer.from('moov'))) {
                  const filename = `rendered_darkclip_${initialPost.id}.mp4`;
                  renderedVideoUrl = await uploadMediaFile(buffer, filename, 'video/mp4');
                  await finalizeRenderedPost(renderedVideoUrl);
                  logger.success(`Render íntegro salvo com sucesso após polling`, { context: 'Render', data: { renderedVideoUrl } });
                  break;
                } else {
                  logger.debug(`Arquivo detectado (${buffer.length} bytes), aguardando átomo 'moov'...`, { context: 'Render' });
                }
              }
            }
          } catch (pollErr: any) {}
        }
      }

      if (!renderedVideoUrl && lastError) {
        logger.error(`Render falhou definitivamente para ${initialPost.id}: ${lastError}`, { context: 'Render' });
        try {
          await pool.query('UPDATE public.dark_clips_posts SET status = $1, error_message = $2 WHERE id = $3', ['failed', lastError, initialPost.id]);
        } catch (e) {}
      }

      if (activeLockClipId) {
        activeClipRenders.delete(activeLockClipId);
      }
    })().catch((bgErr) => {
      logger.error('Erro inesperado em background render:', bgErr, { context: 'Render' });
      if (activeLockClipId) activeClipRenders.delete(activeLockClipId);
    });

    // Resposta imediata para a interface não travar e o card entrar no Histórico
    return NextResponse.json({
      success: true,
      message: 'Renderização iniciada com sucesso em segundo plano no Remotion.',
      post: initialPost,
      status: 'rendering',
    });
  } catch (err: any) {
    console.error('Error in dark-clips render API:', err);
    if (activeLockClipId) {
      activeClipRenders.delete(activeLockClipId);
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
