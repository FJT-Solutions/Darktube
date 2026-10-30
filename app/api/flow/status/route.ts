import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { isFlowAgentOnline, getFlowAgentState } from '@/lib/flow-jobs';
import { getRiskSettings, getRiskUsage } from '@/lib/flow-risk';

export const dynamic = 'force-dynamic';

// Estado do agente (extensao) e do risk mode, sem a lista de jobs.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const [agentOnline, state, settings] = await Promise.all([isFlowAgentOnline(user.id), getFlowAgentState(user.id), getRiskSettings(user.id)]);
  const usage = await getRiskUsage(user.id, settings);
  return NextResponse.json({
    success: true,
    agentOnline,
    agent: {
      capabilities: state?.info?.capabilities ?? null,
      capabilitiesAt: state?.info?.capabilitiesAt ?? null,
      mode: state?.info?.mode ?? null,
      pausedUntil: null,
      pauseReason: state?.pause_reason ?? null,
    },
    risk: { settings, usage },
  });
}
