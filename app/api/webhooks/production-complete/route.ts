import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-client';
import { uploadMediaFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const historyId = body.historyId || body.session_id || body.history_id || '';
    const templateId = body.template_id || body.templateId || '';
    const status = body.status || 'completed';
    const videoUrl = body.videoUrl || body.video_url || body.body?.videoUrl || body.body?.video_url || '';
    const error = body.error || body.body?.error || '';

    const isValidUuid = (str: string) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let query = '';
    let queryParams: any[] = [];

    if (status === 'completed') {
      if (isValidUuid(historyId)) {
        query = `UPDATE public.remodeling_history SET status = $1, video_url = $2 WHERE id = $3 RETURNING *`;
        queryParams = ['completed', videoUrl, historyId];
      } else if (isValidUuid(templateId)) {
        query = `UPDATE public.remodeling_history SET status = $1, video_url = $2 WHERE id = (
          SELECT id FROM public.remodeling_history WHERE template_id = $3 ORDER BY dispatched_at DESC LIMIT 1
        ) RETURNING *`;
        queryParams = ['completed', videoUrl, templateId];
      } else {
        query = `UPDATE public.remodeling_history SET status = $1, video_url = $2 WHERE id = (
          SELECT id FROM public.remodeling_history ORDER BY dispatched_at DESC LIMIT 1
        ) RETURNING *`;
        queryParams = ['completed', videoUrl];
      }
    } else {
      if (isValidUuid(historyId)) {
        query = `UPDATE public.remodeling_history SET status = $1, error_message = $2 WHERE id = $3 RETURNING *`;
        queryParams = ['failed', error, historyId];
      } else if (isValidUuid(templateId)) {
        query = `UPDATE public.remodeling_history SET status = $1, error_message = $2 WHERE id = (
          SELECT id FROM public.remodeling_history WHERE template_id = $3 ORDER BY dispatched_at DESC LIMIT 1
        ) RETURNING *`;
        queryParams = ['failed', error, templateId];
      } else {
        query = `UPDATE public.remodeling_history SET status = $1, error_message = $2 WHERE id = (
          SELECT id FROM public.remodeling_history ORDER BY dispatched_at DESC LIMIT 1
        ) RETURNING *`;
        queryParams = ['failed', error];
      }
    }

    const { rows } = await pool.query(query, queryParams);
    console.log(`[Production Webhook] Histórico atualizado com sucesso (${status}).`);

    // Atualizar dark_clips_posts caso o historyId pertença a um render de Dark Clips
    try {
      if (isValidUuid(historyId)) {
        let finalVideoUrl = videoUrl;
        if (status === 'completed' && videoUrl) {
          try {
            const CANDIDATE_URLS = [
              'http://n8n-remotionservice-ry6eh9:3001',
              process.env.REMOTION_SERVICE_URL?.replace(/\/render$/, ''),
              process.env.REMOTION_SERVER_URL,
              'http://localhost:3001',
            ].filter(Boolean) as string[];

            const cleanPath = videoUrl.startsWith('http') ? new URL(videoUrl).pathname : videoUrl;
            for (const base of CANDIDATE_URLS) {
              const fetchUrl = `${base.replace(/\/+$/, '')}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
              try {
                const checkRes = await fetch(fetchUrl);
                if (checkRes.ok) {
                  const arrayBuf = await checkRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuf);
                  if (buffer.length > 10000 && buffer.includes(Buffer.from('moov'))) {
                    const filename = `rendered_darkclip_${historyId}.mp4`;
                    finalVideoUrl = await uploadMediaFile(buffer, filename, 'video/mp4');
                    console.log(`[Production Webhook] ✅ Vídeo final persistido com sucesso no storage DB: ${finalVideoUrl}`);
                    break;
                  }
                }
              } catch (_) {}
            }
          } catch (persistErr) {
            console.warn('[Production Webhook] Falha ao persistir vídeo no storage_files:', persistErr);
          }
        }

        await pool.query(
          `UPDATE public.dark_clips_posts SET
            status = $1,
            rendered_video_url = COALESCE($2, rendered_video_url),
            error_message = $3
           WHERE id = $4`,
          [status === 'completed' ? 'rendered' : 'failed', finalVideoUrl || null, error || null, historyId]
        );
      }
    } catch (dcErr) {
      console.warn('[Production Webhook] Nota ao atualizar dark_clips_posts:', dcErr);
    }

    return NextResponse.json({ success: true, updated: rows[0] || null });
  } catch (error: any) {
    console.error('Erro ao processar webhook de conclusão de produção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar histórico de produção: ' + error.message },
      { status: 500 }
    );
  }
}
