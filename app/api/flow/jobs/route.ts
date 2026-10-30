import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createFlowJob, listFlowJobs, isFlowAgentOnline, getFlowAgentState } from '@/lib/flow-jobs';
import { getRiskSettings, getRiskUsage } from '@/lib/flow-risk';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get('projectId') || undefined;
  const [jobs, agentOnline, state, settings] = await Promise.all([
    listFlowJobs(user.id, 200, projectId),
    isFlowAgentOnline(user.id),
    getFlowAgentState(user.id),
    getRiskSettings(user.id),
  ]);
  const usage = await getRiskUsage(user.id, settings);
  return NextResponse.json({
    success: true,
    agentOnline,
    agent: { capabilities: state?.info?.capabilities ?? null, capabilitiesAt: state?.info?.capabilitiesAt ?? null, mode: state?.info?.mode ?? null, pausedUntil: null, pauseReason: state?.pause_reason ?? null },
    risk: { settings, usage },
    jobs,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  try {
    const body = await req.json();
    const job = await createFlowJob({
      userId: user.id,
      kind: body.kind,
      prompt: body.prompt,
      params: body.params,
      postId: body.postId,
      deadlineMinutes: body.deadlineMinutes,
    });
    const agentOnline = await isFlowAgentOnline(user.id);
    return NextResponse.json({ success: true, agentOnline, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
