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
    const { action, platform, mode, username, password, sessionId, code } = body;

    if (action === 'start') {
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Plataforma é obrigatória' }, { status: 400 });
      }

      const generatedId = sessionId || `auth_${platform}_${crypto.randomBytes(6).toString('hex')}`;
      const session = CloudAuthManager.startSession({
        sessionId: generatedId,
        userId: user?.id,
        platform,
        mode: mode || 'credentials',
        username: username || '',
        password: password || '',
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'submit_2fa') {
      if (!sessionId || !code) {
        return NextResponse.json({ success: false, error: 'sessionId e code são obrigatórios' }, { status: 400 });
      }

      const ok = CloudAuthManager.submit2FACode(sessionId, code);
      return NextResponse.json({ success: ok });
    }

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
