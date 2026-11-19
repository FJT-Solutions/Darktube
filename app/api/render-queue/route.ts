import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { cancelRenderJob, getRenderQueueSnapshot } from '@/lib/render-queue';
import { resolveMcpAuth } from '@/lib/mcp/auth';
import { resolveDefaultUserId } from '@/lib/mcp/darktube-tools';

async function resolveRequestUser(req: NextRequest): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (user?.id) return String(user.id);
  } catch {}
  try {
    const auth = await resolveMcpAuth(req);
    if (auth.authorized && auth.userId) return auth.userId;
  } catch {}
  return await resolveDefaultUserId();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId') || undefined;
    const userId = await resolveRequestUser(req);
    const snapshot = await getRenderQueueSnapshot(userId, jobId);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao consultar fila' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Parametro jobId é obrigatório' }, { status: 400 });
    }
    const userId = await resolveRequestUser(req);
    const cancelled = await cancelRenderJob(userId, jobId);
    return NextResponse.json({ success: cancelled, jobId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erro ao cancelar job' }, { status: 500 });
  }
}
