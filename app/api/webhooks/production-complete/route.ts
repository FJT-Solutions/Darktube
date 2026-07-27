import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const historyId = body.historyId || body.session_id || body.history_id;
    const status = body.status || 'completed';
    const videoUrl = body.videoUrl || body.video_url || '';
    const error = body.error || '';

    if (!historyId || !status) {
      return NextResponse.json(
        { error: 'historyId e status são obrigatórios' },
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

      console.log(`[Remotion Webhook] Vídeo renderizado com sucesso. History ID: ${historyId}`);
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

      console.error(`[Remotion Webhook] Renderização falhou para History ID: ${historyId}. Erro: ${error}`);
      return NextResponse.json({ success: true, updated: rows[0] });
    }
  } catch (error: any) {
    console.error('Erro ao processar webhook de conclusão de produção:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar histórico de produção' },
      { status: 500 }
    );
  }
}
