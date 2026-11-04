import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { claimNextFlowJob, touchFlowAgent, getFlowAgentState, previousTakeLastFrame } from '@/lib/flow-jobs';

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
  const job: any = result.job;
  // O video bruto (MP4) nao vai para a extensao porque anexado como video faz o Omni tentar
  // editar a fala daquele video e falhar com "Unable to edit the speech in this video".
  // Em vez disso, se houver refPrevVideo, extrai e envia o ULTIMO FRAME (JPEG) como imagem de continuidade!
  if (job?.params?.refPrevVideo && job.project_id && Number(job.take_index) > 1) {
    const lastFrame = await previousTakeLastFrame(user.id, job.project_id, Number(job.take_index)).catch(() => null);
    if (lastFrame) {
      job.params.refPrevFrameUrl = lastFrame;
      if (!job.params.refImageUrl) job.params.refImageUrl = lastFrame;
    }
  }
  if (job?.params?.refVideoUrl) delete job.params.refVideoUrl;
  if (result.job) {
    lastReason.delete(user.id);
    console.log(`[FLOW EXTENSION][INFO] claim user=${who} job entregue: ${result.job.kind} take ${result.job.take_index ?? '-'} (projeto ${String(result.job.project_id ?? '-').slice(0, 8)})`);
  } else if (lastReason.get(user.id) !== String(result.reason)) {
    lastReason.set(user.id, String(result.reason));
    console.log(`[FLOW EXTENSION][INFO] claim user=${who} sem job: ${result.reason ?? '-'}${result.retryAfterSec ? ` (aguardar ${result.retryAfterSec}s)` : ''}`);
  }
  return NextResponse.json({ success: true, ...result });
}
