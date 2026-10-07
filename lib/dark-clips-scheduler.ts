/**
 * lib/dark-clips-scheduler.ts
 * Background scheduler daemon for DarkTube.
 * Automatically checks and dispatches due scheduled posts to connected social networks.
 */

import { pool } from '@/lib/db-client';
import { logger } from '@/lib/logger';
import { triggerSocialDispatcher, isValidVideoUrl, isDispatcherBusy } from '@/lib/social-dispatcher';

let isChecking = false;
let schedulerInterval: NodeJS.Timeout | null = null;

export async function checkDueScheduledPosts(): Promise<number> {
  if (isChecking) {
    return 0;
  }
  if (isDispatcherBusy()) {
    logger.info('[Scheduler Daemon] Envio de post em andamento no despachante. Aguardando conclusão para o próximo agendado.', {
      context: 'Scheduler',
    });
    return 0;
  }

  isChecking = true;
  let dispatchedCount = 0;

  try {
    // Recupera eventuais posts que ficaram em 'publishing' órfãos há mais de 15 minutos se o processo reiniciou
    await pool.query(
      `UPDATE public.dark_clips_posts
       SET status = 'scheduled',
           error_message = 'Reiniciado automaticamente pelo scheduler após timeout'
       WHERE status = 'publishing'
         AND scheduled_at IS NOT NULL
         AND scheduled_at < NOW() - INTERVAL '15 minutes'`
    );

    // 1. Encontra o próximo post agendado com horário atingido e vídeo pronto (LIMIT 1 para despacho estritamente sequencial)
    // Também inclui posts que foram marcados indevidamente como 'rendered' mas possuem scheduled_at vencido
    const { rows: duePosts } = await pool.query(
      `SELECT * FROM public.dark_clips_posts
       WHERE (
         (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW())
         OR
         (status = 'rendered' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW() AND target_accounts IS NOT NULL)
       )
       AND rendered_video_url IS NOT NULL
       ORDER BY scheduled_at ASC
       LIMIT 1`
    );

    for (const post of duePosts) {
      const targets = typeof post.target_accounts === 'string'
        ? JSON.parse(post.target_accounts)
        : (post.target_accounts || []);

      if (!Array.isArray(targets) || targets.length === 0) {
        continue;
      }

      if (!isValidVideoUrl(post.rendered_video_url)) {
        continue;
      }

      logger.info(`[Scheduler Daemon] ⏰ Horário atingido para post agendado ${post.id} (${post.title}). Despachando para ${targets.join(', ')}...`, {
        context: 'Scheduler',
      });

      // Atualiza o status atomicamente no banco para 'publishing' para evitar disparos duplicados
      await pool.query(
        `UPDATE public.dark_clips_posts SET
           status = 'publishing',
           error_message = NULL
         WHERE id = $1`,
        [post.id]
      );

      const remodel = typeof post.remodel_data === 'string'
        ? JSON.parse(post.remodel_data)
        : (post.remodel_data || {});

      try {
        await triggerSocialDispatcher({
          post: { ...post, status: 'publishing', target_accounts: targets, remodel_data: remodel },
          videoUrl: post.rendered_video_url,
          targetAccounts: targets,
          facebookPageId: remodel.facebook_page_id || remodel.facebookPageId,
          caption: remodel.post_caption || remodel.caption || post.title,
          hashtags: remodel.hashtags || [],
          title: post.title,
          accountMap: remodel.selected_accounts_by_platform || remodel.selectedAccountsByPlatform,
        });
        dispatchedCount++;
      } catch (dispatchErr: any) {
        logger.error(`[Scheduler Daemon] Falha ao despachar post agendado ${post.id}: ${dispatchErr?.message}`, {
          context: 'Scheduler',
        });
        await pool.query(
          `UPDATE public.dark_clips_posts SET
             status = 'failed',
             error_message = $1
           WHERE id = $2`,
          [`Falha no disparo agendado: ${dispatchErr?.message}`, post.id]
        );
      }
    }
  } catch (err: any) {
    logger.error(`[Scheduler Daemon] Erro na verificação de posts agendados: ${err?.message}`, {
      context: 'Scheduler',
    });
  } finally {
    isChecking = false;
  }

  return dispatchedCount;
}

export function startDarkClipsScheduler(intervalMs = 30000): void {
  if (schedulerInterval) {
    return;
  }

  logger.info(`[Scheduler Daemon] 🚀 Iniciando monitoramento contínuo de postagens agendadas (intervalo: ${intervalMs / 1000}s)`, {
    context: 'Scheduler',
  });

  // Executa uma verificação inicial após 5s
  setTimeout(() => {
    checkDueScheduledPosts().catch(() => {});
  }, 5000);

  schedulerInterval = setInterval(() => {
    checkDueScheduledPosts().catch(() => {});
  }, intervalMs);

  // Evita que o timer segure o encerramento do processo em testes
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
}

export function stopDarkClipsScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[Scheduler Daemon] Monitor de postagens agendadas interrompido.', {
      context: 'Scheduler',
    });
  }
}
