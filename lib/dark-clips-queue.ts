import { pool } from '@/lib/db-client';
import { logger } from '@/lib/logger';

let isQueuePaused = false;
let isQueueWorkerRunning = false;

export function setQueuePaused(paused: boolean) {
  isQueuePaused = paused;
  logger.info(`[DarkClips Queue] Fila ${paused ? 'PAUSADA' : 'RETOMADA'} pelo usuário.`, { context: 'Queue' });
}

export function getIsQueuePaused(): boolean {
  return isQueuePaused;
}

/**
 * Processa o próximo item pendente da fila com concorrência estrita = 1.
 * É seguro chamá-la múltiplas vezes concorrentes (possui trava atômica em memória).
 */
export async function processNextQueueItem() {
  if (isQueuePaused) {
    logger.debug('[DarkClips Queue] Fila pausada. Nenhum item será iniciado.', { context: 'Queue' });
    return;
  }

  if (isQueueWorkerRunning) {
    logger.debug('[DarkClips Queue] Worker já está ativo no momento.', { context: 'Queue' });
    return;
  }

  isQueueWorkerRunning = true;
  try {
    // 1. Verifica se já existe algum clipe com status 'rendering'
    const renderingCheck = await pool.query(`
      SELECT id, created_at, scheduled_at 
      FROM public.dark_clips_posts 
      WHERE status = 'rendering'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (renderingCheck.rows.length > 0) {
      const activeRender = renderingCheck.rows[0];
      const activeTime = new Date(activeRender.created_at).getTime();
      const now = Date.now();
      // Se estiver renderizando há menos de 15 minutos, respeita o lock para não sobrecarregar o Remotion
      if (now - activeTime < 15 * 60 * 1000) {
        logger.debug(`[DarkClips Queue] Post ${activeRender.id} ainda está em renderização. Fila aguardando término...`, { context: 'Queue' });
        return;
      } else {
        logger.warn(`[DarkClips Queue] Post ${activeRender.id} em 'rendering' há mais de 15 min. Liberando lock...`, { context: 'Queue' });
      }
    }

    // 2. Busca o próximo item com status 'queued' ordenado por queue_order ASC
    const nextItemRes = await pool.query(`
      SELECT p.*, c.video_url as source_clip_video_url, c.duration as clip_duration, c.original_url, c.author_handle
      FROM public.dark_clips_posts p
      LEFT JOIN public.dark_clips c ON c.id = p.clip_id
      WHERE p.status = 'queued'
      ORDER BY p.queue_order ASC, p.created_at ASC
      LIMIT 1
    `);

    if (nextItemRes.rows.length === 0) {
      logger.debug('[DarkClips Queue] Fila vazia ou todos os itens concluídos.', { context: 'Queue' });
      return;
    }

    const nextPost = nextItemRes.rows[0];
    logger.info(`[DarkClips Queue] 🚀 Iniciando processamento do item da fila: ${nextPost.id} (Clipe: ${nextPost.clip_id})`, { context: 'Queue' });

    // Atualiza status do post para 'rendering'
    await pool.query(`UPDATE public.dark_clips_posts SET status = 'rendering' WHERE id = $1`, [nextPost.id]);

    const remodelData = typeof nextPost.remodel_data === 'string' ? JSON.parse(nextPost.remodel_data) : (nextPost.remodel_data || {});
    const targetAccounts = typeof nextPost.target_accounts === 'string' ? JSON.parse(nextPost.target_accounts) : (nextPost.target_accounts || []);

    const port = process.env.PORT || 3000;
    const internalUrl = `http://127.0.0.1:${port}/api/dark-clips/render`;

    // Dispara render internamente via POST /api/dark-clips/render
    try {
      const renderRes = await fetch(internalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: nextPost.clip_id,
          title: nextPost.title || 'Dark Clip Render',
          durationInSeconds: nextPost.clip_duration || 30,
          targetAccounts,
          facebookPageId: remodelData.facebook_page_id,
          dispatchNow: remodelData.dispatch_now ?? false,
          scheduledAt: nextPost.scheduled_at,
          postCaption: remodelData.post_caption,
          postHashtags: remodelData.hashtags,
          selectedAccountsByPlatform: remodelData.selected_accounts_by_platform,
          accountMap: remodelData.selected_accounts_by_platform,
          inputProps: remodelData.inputProps || {
            videoUrl: nextPost.source_clip_video_url,
            durationInSeconds: nextPost.clip_duration || 30,
            profileHeader: remodelData.profile_header,
            headlineStyle: remodelData.headline_style,
            videoPlacement: remodelData.video_placement,
            backgroundStyle: remodelData.background_style,
            watermarkStyle: remodelData.watermark_style,
            footerStyle: remodelData.footer_style,
            arrowsList: remodelData.arrows_list || [],
          },
        }),
      });

      const data = await renderRes.json();
      logger.info(`[DarkClips Queue] Render do item ${nextPost.id} concluído com sucesso`, { context: 'Queue', data: { success: data.success } });
    } catch (renderFetchErr: any) {
      logger.warn(`[DarkClips Queue] Chamada HTTP de render para ${nextPost.id} encerrou (${renderFetchErr.message}). O webhook continuará o processo.`, { context: 'Queue' });
    }

    // Após concluir, aguarda 2 segundos e chama o próximo da fila
    setTimeout(() => {
      processNextQueueItem();
    }, 2000);

  } catch (err: any) {
    logger.error(`[DarkClips Queue] Erro no worker da fila: ${err.message}`, { context: 'Queue' });
  } finally {
    isQueueWorkerRunning = false;
  }
}
