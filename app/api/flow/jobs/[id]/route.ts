import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getFlowJob, retryFlowJob, cancelFlowJob } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const job = await getFlowJob(user.id, id);
  if (!job) return NextResponse.json({ success: false, error: 'Job não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, job });
}

// action: 'retry' (rascunho/cancelado volta pra fila, opcionalmente em outro motor) | 'cancel'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const job = body.action === 'retry'
    ? await retryFlowJob(user.id, id, body.engine)
    : body.action === 'cancel'
      ? await cancelFlowJob(user.id, id)
      : null;
  if (!job) return NextResponse.json({ success: false, error: 'Ação inválida ou job em estado incompatível.' }, { status: 409 });
  return NextResponse.json({ success: true, job });
}
