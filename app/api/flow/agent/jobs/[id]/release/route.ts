import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { releaseFlowJob } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

// A extensao devolve o take para a fila quando a tela do Flow nao estava pronta (menu aberto, painel em outro estado).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const job = await releaseFlowJob(user.id, id);
  if (!job) return NextResponse.json({ success: false, error: 'Job não está em execução.' }, { status: 409 });
  console.log(`[FLOW EXTENSION][WARN] take ${job.take_index ?? ''} devolvido para a fila (tela do Flow não estava pronta)`);
  return NextResponse.json({ success: true, job });
}
