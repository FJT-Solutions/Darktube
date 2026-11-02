import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getFlowJob, retryFlowJob, cancelFlowJob } from '@/lib/flow-jobs';
import { getFlowProject } from '@/lib/flow-projects';
import { getFlowTemplate } from '@/lib/flow-templates';
import { buildTakePrompt } from '@/lib/flow-script';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const job = await getFlowJob(user.id, id);
  if (!job) return NextResponse.json({ success: false, error: 'Job não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, job });
}

// Prompt atual do take (roteiro e formato mais recentes), para o reenvio nao repetir um prompt antigo.
async function currentTakePrompt(userId: string, jobId: string): Promise<string | undefined> {
  const job = await getFlowJob(userId, jobId);
  if (!job?.project_id || job.take_index == null) return undefined;
  const project = await getFlowProject(userId, job.project_id);
  const t = project ? getFlowTemplate(project.template_id) : null;
  const take = project?.script?.takes?.find((k) => k.n === job.take_index);
  return project && t && take ? buildTakePrompt(project.script, take, project.params, t.mode) : undefined;
}

// action: 'retry' (rascunho/cancelado volta pra fila, opcionalmente em outro motor) | 'cancel'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const job = body.action === 'retry'
    ? await retryFlowJob(user.id, id, body.engine, body.params, await currentTakePrompt(user.id, id).catch(() => undefined))
    : body.action === 'cancel'
      ? await cancelFlowJob(user.id, id)
      : null;
  if (!job) return NextResponse.json({ success: false, error: 'Ação inválida ou job em estado incompatível.' }, { status: 409 });
  return NextResponse.json({ success: true, job });
}
