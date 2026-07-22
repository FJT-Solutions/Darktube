import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { pool } from '@/lib/db-client';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { templateId, originalVideoId, payload } = body;

    if (!templateId || !payload) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes (templateId, payload)' },
        { status: 400 }
      );
    }

    // 1. Inserir registro na tabela remodeling_history com status 'rendering'
    const { rows } = await pool.query(
      `
        INSERT INTO public.remodeling_history (template_id, original_video_id, payload, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        templateId,
        originalVideoId || null,
        JSON.stringify(payload),
        'rendering',
      ]
    );

    const historyRecord = rows[0];

    // 2. URL do microserviço Remotion (Projeto n8n no Dokploy)
    const REMOTION_SERVICE_URL =
      process.env.REMOTION_SERVICE_URL || 'http://remotion-service:3001/render';

    // 3. Disparo assíncrono para o container do Remotion no Dokploy
    fetch(REMOTION_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyId: historyRecord.id,
        templateId,
        payload,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://darktube:3000'}/api/webhooks/production-complete`,
      }),
    }).catch((err) => {
      console.error('Erro ao acionar container do Remotion no Dokploy:', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Renderização iniciada em segundo plano na VPS (Projeto n8n).',
        historyId: historyRecord.id,
        status: 'rendering',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Erro ao iniciar renderização Remotion:', error);
    return NextResponse.json(
      { error: 'Falha ao processar solicitação de renderização.' },
      { status: 500 }
    );
  }
}
