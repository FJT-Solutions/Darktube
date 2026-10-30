import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { failFlowJob, pauseFlowAgent } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

// code: 'verification' (Google pediu verificacao) ou 'rate_limit' (403 / "too fast") registram aviso para o usuario, sem pausar a fila.
const ALERTS: Record<string, string> = {
  verification: 'O Google pediu verificação na conta do Flow. Confira a aba do Flow.',
  rate_limit: 'O Flow avisou excesso de pedidos (rate limit) no último take.',
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const job = await failFlowJob(user.id, id, String(body.error || ''));
  if (!job) return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });
  const alertMsg = ALERTS[String(body.code || '')];
  if (alertMsg) await pauseFlowAgent(user.id, 0, alertMsg);
  return NextResponse.json({ success: true, job, paused: false, alert: alertMsg || null });
}
