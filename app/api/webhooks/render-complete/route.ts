import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Render Complete Webhook] Recebido:', body);

    const historyId = body.historyId || body.session_id || body.history_id;
    const status = body.status || 'completed';
    const videoUrl = body.videoUrl || body.video_url || '';

    if (!historyId) {
      return NextResponse.json(
        { error: 'historyId é obrigatório' },
        { status: 400 }
      );
    }

    if (status === 'completed') {
      const { rows } = await pool.query(
        `
          UPDATE public.remodeling_history
          SET status = $1, video_url = $2
          WHERE id = $3
          RETURNING *
        `,
        ['completed', videoUrl, historyId]
      );

      console.log(`[Render Complete Webhook] Vídeo renderizado com sucesso no BD. History ID: ${historyId}`);
      return NextResponse.json({ success: true, updated: rows[0] });
    } else {
      const { rows } = await pool.query(
        `
          UPDATE public.remodeling_history
          SET status = $1
          WHERE id = $2
          RETURNING *
        `,
        ['failed', historyId]
      );

      console.error(`[Render Complete Webhook] Renderização falhou para History ID: ${historyId}.`);
      return NextResponse.json({ success: true, updated: rows[0] });
    }
  } catch (error: any) {
    console.error('Erro ao processar webhook render-complete:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar histórico de produção' },
      { status: 500 }
    );
  }
}
