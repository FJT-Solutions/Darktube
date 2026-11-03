import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { addFlowLogs, failFlowJob, MAX_GEN_RETRIES, MAX_POLICY_RETRIES, pauseFlowAgent, requeueAfterGenFailure, requeueAfterPolicy } from '@/lib/flow-jobs';
import { softenFlowPrompt } from '@/lib/flow-script';

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
  const code = String(body.code || '');

  // Recusa por politica: a mesma cena volta para a fila sozinha. 1a nova tentativa com o prompt identico (o filtro
  // do Flow varia de uma vez para outra); 2a com so a linha de estilo suavizada. O conteudo da cena nao muda.
  if (code === 'policy') {
    const retry = await requeueAfterPolicy(user.id, id, (prompt, attempt) => (attempt === 1 ? prompt : softenFlowPrompt(prompt)));
    if (retry) {
      const msg = `O Flow recusou o take ${retry.job.take_index ?? ''} por política; nova tentativa automática ${retry.attempt}/${MAX_POLICY_RETRIES}${retry.attempt === 1 ? ' (mesmo prompt)' : ' (estilo suavizado, mesma cena)'}.`;
      console.log(`[Flow] ${msg}`);
      await addFlowLogs(user.id, { message: msg, level: 'warn', jobId: id, projectId: retry.job.project_id ?? null }).catch(() => {});
      return NextResponse.json({ success: true, job: retry.job, retried: retry.attempt });
    }
  }

  // Falha generica do Flow: volta para a fila ate 2 vezes (a extensao espera alguns minutos antes de pegar de novo).
  if (code === 'gen_failed') {
    const retry = await requeueAfterGenFailure(user.id, id);
    if (retry) {
      const msg = `O Flow falhou ao gerar o take ${retry.job.take_index ?? ''} (falha genérica); nova tentativa automática ${retry.attempt}/${MAX_GEN_RETRIES}.`;
      console.log(`[Flow] ${msg}`);
      await addFlowLogs(user.id, { message: msg, level: 'warn', jobId: id, projectId: retry.job.project_id ?? null }).catch(() => {});
      return NextResponse.json({ success: true, job: retry.job, retried: retry.attempt });
    }
  }

  const error = String(body.error || '') + (code === 'gen_failed' ? ` (falhou também nas ${MAX_GEN_RETRIES} novas tentativas automáticas)` : '') + (code === 'policy' ? ` (recusado também nas ${MAX_POLICY_RETRIES} novas tentativas automáticas)` : '');
  const job = await failFlowJob(user.id, id, error);
  if (!job) return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });
  const alertMsg = ALERTS[code];
  if (alertMsg) await pauseFlowAgent(user.id, 0, alertMsg);
  return NextResponse.json({ success: true, job, paused: false, alert: alertMsg || null });
}
