import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth-helpers';
import { CloudAuthManager } from '@/lib/cloud-auth-manager';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId é obrigatório' }, { status: 400 });
    }

    const session = CloudAuthManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sessão não encontrada ou expirada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { action, platform, sessionId, type, x, y, text, key, deltaY } = body;

    // Inicia o Navegador Visual Remoto
    if (action === 'start') {
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Plataforma é obrigatória' }, { status: 400 });
      }

      const generatedId = sessionId || `remote_${platform}_${crypto.randomBytes(6).toString('hex')}`;
      const session = CloudAuthManager.startSession({
        sessionId: generatedId,
        userId: user?.id,
        platform,
      });

      return NextResponse.json({ success: true, session });
    }

    // Interação do usuário com o navegador (clique, digitação, rolagem, reload)
    if (action === 'interact') {
      if (!sessionId || !type) {
        return NextResponse.json({ success: false, error: 'sessionId e type são obrigatórios' }, { status: 400 });
      }

      const ok = CloudAuthManager.interact(sessionId, { type, x, y, text, key, deltaY });
      const current = CloudAuthManager.getSession(sessionId);
      return NextResponse.json({ success: ok, session: current });
    }

    // Cancela e fecha o navegador
    if (action === 'cancel') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId é obrigatório' }, { status: 400 });
      }

      CloudAuthManager.cancelSession(sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
