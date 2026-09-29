import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { pool } from '@/lib/db-client';
import { logger } from '@/lib/logger';
import { saveDarkClipPost, ensureDarkClipsTablesExist } from '@/lib/database';
import { processNextQueueItem, setQueuePaused, getIsQueuePaused } from '@/lib/dark-clips-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDarkClipsTablesExist();
    const user = await getCurrentUser();

    // 1. Post ativo em 'rendering'
    const activeRes = await pool.query(`
      SELECT p.*, c.thumbnail_url, c.duration as clip_duration, c.author_handle, c.platform as clip_platform
      FROM public.dark_clips_posts p
      LEFT JOIN public.dark_clips c ON c.id = p.clip_id
      WHERE p.status = 'rendering'
      ORDER BY p.created_at DESC
      LIMIT 1
    `);

    // 2. Posts na fila ('queued')
    const queuedRes = await pool.query(`
      SELECT p.*, c.thumbnail_url, c.duration as clip_duration, c.author_handle, c.platform as clip_platform
      FROM public.dark_clips_posts p
      LEFT JOIN public.dark_clips c ON c.id = p.clip_id
      WHERE p.status = 'queued'
      ORDER BY p.queue_order ASC, p.created_at ASC
    `);

    // Se houver itens na fila e nenhum ativo renderizando, garante que o worker inicie
    if (queuedRes.rows.length > 0 && activeRes.rows.length === 0 && !getIsQueuePaused()) {
      setTimeout(() => processNextQueueItem(), 100);
    }

    return NextResponse.json({
      success: true,
      isPaused: getIsQueuePaused(),
      activeItem: activeRes.rows[0] || null,
      queuedItems: queuedRes.rows,
      totalQueued: queuedRes.rows.length,
    });
  } catch (err: any) {
    logger.error(`[Queue GET] Erro ao buscar status da fila: ${err.message}`, { context: 'Queue' });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDarkClipsTablesExist();
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      action,
      clipIds = [],
      mode = 'publish', // 'render' | 'publish'
      targetAccounts = [],
      intervalMinutes = 15,
      facebookPageId,
      selectedAccountsByPlatform,
      activePreset,
      customOptions = {},
    } = body;

    // Ações de controle da fila (pausar, retomar, limpar)
    if (action === 'pause') {
      setQueuePaused(true);
      return NextResponse.json({ success: true, isPaused: true });
    }

    if (action === 'resume') {
      setQueuePaused(false);
      setTimeout(() => processNextQueueItem(), 500);
      return NextResponse.json({ success: true, isPaused: false });
    }

    if (action === 'clear') {
      await pool.query(`DELETE FROM public.dark_clips_posts WHERE status = 'queued'`);
      return NextResponse.json({ success: true, message: 'Fila limpa com sucesso.' });
    }

    if (!Array.isArray(clipIds) || clipIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum clipe informado para a fila.' }, { status: 400 });
    }

    // Busca os clipes no banco
    const clipsQuery = await pool.query(
      `SELECT * FROM public.dark_clips WHERE id = ANY($1::uuid[])`,
      [clipIds]
    );
    const foundClips = clipsQuery.rows;

    if (foundClips.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum clipe válido encontrado.' }, { status: 404 });
    }

    // Ordena os clipes encontrados na mesma ordem do array recebido
    const clipMap = new Map(foundClips.map((c) => [c.id, c]));
    const orderedClips = clipIds.map((id) => clipMap.get(id)).filter(Boolean);

    const now = Date.now();
    const createdPosts = [];

    for (let i = 0; i < orderedClips.length; i++) {
      const clip = orderedClips[i];
      const clipRemodel = typeof clip.remodel_data === 'string' ? JSON.parse(clip.remodel_data) : (clip.remodel_data || {});

      // Calcula o agendamento escalonado: primeiro post sai agora (ou logo após render), os demais a cada intervalMinutes
      const scheduledTime = mode === 'publish'
        ? new Date(now + (i * intervalMinutes * 60 * 1000)).toISOString()
        : null;

      const title = clipRemodel.headline_main || clip.author_handle || `Dark Clip #${i + 1}`;
      const caption = clipRemodel.post_caption || clip.original_caption || '';
      const hashtags = clipRemodel.hashtags || [];

      // Monta remodel_data com as configurações do preset ativo e da postagem
      const mergedRemodelData = {
        ...clipRemodel,
        facebook_page_id: facebookPageId,
        selected_accounts_by_platform: selectedAccountsByPlatform,
        dispatch_now: mode === 'publish' && i === 0, // Primeiro post pode disparar imediatamente
        post_caption: caption,
        hashtags: hashtags,
        profile_header: activePreset?.profile_header,
        headline_style: activePreset?.headline_style,
        video_placement: activePreset?.video_placement,
        background_style: activePreset?.background_style,
        watermark_style: activePreset?.watermark_style,
        footer_style: activePreset?.footer_style,
        arrows_list: activePreset?.arrows_list || [],
        ...customOptions,
      };

      const post = await saveDarkClipPost({
        user_id: user?.id,
        clip_id: clip.id,
        title,
        status: 'queued',
        queue_order: i + 1,
        target_accounts: mode === 'publish' ? targetAccounts : [],
        scheduled_at: scheduledTime || undefined,
        remodel_data: mergedRemodelData,
      });

      createdPosts.push(post);
    }

    logger.info(`[Queue] ${createdPosts.length} clipes enfileirados com sucesso. Modo: ${mode}`, { context: 'Queue' });

    // Inicia o processamento da fila de forma assíncrona
    setTimeout(() => {
      processNextQueueItem();
    }, 500);

    return NextResponse.json({
      success: true,
      enqueuedCount: createdPosts.length,
      posts: createdPosts,
    });
  } catch (err: any) {
    logger.error(`[Queue POST] Erro ao enfileirar clipes: ${err.message}`, { context: 'Queue' });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (postId) {
      await pool.query(`DELETE FROM public.dark_clips_posts WHERE id = $1 AND status = 'queued'`, [postId]);
      return NextResponse.json({ success: true, message: 'Item removido da fila.' });
    }

    await pool.query(`DELETE FROM public.dark_clips_posts WHERE status = 'queued'`);
    return NextResponse.json({ success: true, message: 'Fila limpa com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
