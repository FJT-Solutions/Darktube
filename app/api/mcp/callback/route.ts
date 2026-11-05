import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log('[MCP DarkTube Callback] Recebido callback do Remotion:', body);

    return NextResponse.json({
      success: true,
      message: 'Callback do Remotion recebido com sucesso',
      receivedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[MCP DarkTube Callback] Erro ao processar callback:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
