import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { addFlowLogs, failFlowJob, MAX_GEN_RETRIES, MAX_POLICY_RETRIES, MAX_UNUSUAL_RETRIES, pauseFlowAgent, requeueAfterGenFailure, requeueAfterPolicy, requeueAfterUnusual } from '@/lib/flow-jobs';
import { acceptPolicyRewrite, buildPolicyRewritePrompt, softenFlowPrompt } from '@/lib/flow-script';
import { getFlowProject } from '@/lib/flow-projects';
import { getUserApiKey } from '@/lib/database';
import { callFlowLLM, FLOW_PROVIDERS, type FlowProvider } from '@/lib/flow-llm';
import { classifyFlowFailure, policyReason } from '@/lib/flow-failure';

export const dynamic = 'force-dynamic';

// Ultima tentativa por politica: a IA do proprio projeto reescreve so o que pode ter acionado o filtro.
// Sem IA (sem chave, erro ou resposta fora do formato) devolve null e o take segue com a versao suavizada.
async function rewriteWithLlm(userId: string, projectId: string | null, prompt: string, reason: string): Promise<string | null> {
  if (!projectId) return null;
  const project = await getFlowProject(userId, projectId).catch(() => null);
  const provider = String(project?.provider || '') as FlowProvider;
  if (!FLOW_PROVIDERS.includes(provider)) return null;
  const key = await getUserApiKey(userId, provider).catch(() => '');
  if (!key) return null;
  const { system, user } = buildPolicyRewritePrompt(prompt, reason);
  const raw = await callFlowLLM(provider, key, system, user).catch(() => '');
  return raw ? acceptPolicyRewrite(prompt, raw) : null;
}

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
  // A extensao antiga (ou uma tela do Flow em portugues) pode mandar 'failed' para uma recusa por politica ou para uma
  // falha passageira ("Esta geracao talvez viole nossas politicas", "Unable to edit the speech"): reclassifica pelo
  // texto, nos dois idiomas, para elas entrarem na nova tentativa automatica em vez de virar rascunho.
  const code = classifyFlowFailure(String(body.code || ''), String(body.error || ''));

  // Recusa por politica: a mesma cena volta para a fila sozinha, com o prompt ajustado ao motivo da recusa
  // (1a e 2a tentativas, ver softenFlowPrompt) e, na 3a, reescrito pela IA do projeto. A cena nao muda.
  if (code === 'policy') {
    const reason = String(body.error || '');
    let byLlm = false;
    const retry = await requeueAfterPolicy(user.id, id, async (prompt, attempt, job) => {
      const soft = softenFlowPrompt(prompt, reason, attempt);
      if (attempt < 3) return soft;
      const rewritten = await rewriteWithLlm(user.id, job.project_id ?? null, soft, reason);
      byLlm = !!rewritten;
      return rewritten || soft;
    });
    if (retry) {
      const how = byLlm ? ' (reescrito pela IA do projeto, mesma cena)' : ' (texto na imagem removido e prompt ajustado, mesma cena)';
      const msg = `O Flow recusou o take ${retry.job.take_index ?? ''} por política; nova tentativa automática ${retry.attempt}/${MAX_POLICY_RETRIES}${how}.`;
      console.log(`[Flow] ${msg}`);
      await addFlowLogs(user.id, { message: msg, level: 'warn', jobId: id, projectId: retry.job.project_id ?? null }).catch(() => {});
      return NextResponse.json({ success: true, job: retry.job, retried: retry.attempt });
    }
  }

  // "Atividade incomum" (sem cobranca): mesma cena, prompt identico, ate 2 vezes; a extensao pausa a fila e recarrega a aba.
  // Nao e o prompt que falha, entao nao se suaviza nada. Depois disso vira rascunho com o motivo.
  if (code === 'unusual') {
    const retry = await requeueAfterUnusual(user.id, id);
    if (retry) {
      const msg = `O Google sinalizou atividade incomum no take ${retry.job.take_index ?? ''}; a fila pausa uns 10 min e a mesma cena tenta de novo (${retry.attempt}/${MAX_UNUSUAL_RETRIES}).`;
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

  const error = String(body.error || '') + (code === 'gen_failed' ? ` (falhou também nas ${MAX_GEN_RETRIES} novas tentativas automáticas)` : '') + (code === 'policy' ? ` (recusado também nas ${MAX_POLICY_RETRIES} novas tentativas automáticas)` : '') + (code === 'unusual' ? ` (o Google sinalizou atividade incomum também nas ${MAX_UNUSUAL_RETRIES} novas tentativas; tente mais tarde)` : '');
  const job = await failFlowJob(user.id, id, error);
  if (!job) return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });
  const alertMsg = ALERTS[code];
  if (alertMsg) await pauseFlowAgent(user.id, 0, alertMsg);
  return NextResponse.json({ success: true, job, paused: false, alert: alertMsg || null });
}
