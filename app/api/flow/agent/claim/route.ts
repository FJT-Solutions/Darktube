import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { claimNextFlowJob, touchFlowAgent, getFlowAgentState } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

// Ultimo motivo impresso por usuario: "sem job" repetido nao enche o log da VPS.
const lastReason = new Map<string, string>();

export async function POST(req: Request) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  // Mantem as capacidades ja enviadas: o heartbeat completo e que as atualiza.
  const state = await getFlowAgentState(user.id);
  await touchFlowAgent(user.id, state?.info ?? {});
  const result = await claimNextFlowJob(user.id);

  const who = String(user.id).slice(0, 8);
  if (result.job) {
    lastReason.delete(user.id);
    console.log(`[FLOW EXTENSION][INFO] claim user=${who} job entregue: ${result.job.kind} take ${result.job.take_index ?? '-'} (projeto ${String(result.job.project_id ?? '-').slice(0, 8)})`);
  } else if (lastReason.get(user.id) !== String(result.reason)) {
    lastReason.set(user.id, String(result.reason));
    console.log(`[FLOW EXTENSION][INFO] claim user=${who} sem job: ${result.reason ?? '-'}${result.retryAfterSec ? ` (aguardar ${result.retryAfterSec}s)` : ''}`);
  }
  return NextResponse.json({ success: true, ...result });
}
