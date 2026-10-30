import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { claimNextFlowJob, touchFlowAgent, getFlowAgentState } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  // Mantem as capacidades ja enviadas: o heartbeat completo e que as atualiza.
  const state = await getFlowAgentState(user.id);
  await touchFlowAgent(user.id, state?.info ?? {});
  const result = await claimNextFlowJob(user.id);
  return NextResponse.json({ success: true, ...result });
}
