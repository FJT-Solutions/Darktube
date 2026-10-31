import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { listFlowLogs, clearFlowLogs } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const limit = Number(params.get('limit')) || 100;
  const projectId = params.get('projectId') || undefined;
  const logs = await listFlowLogs(user.id, limit, projectId);
  return NextResponse.json({ success: true, logs });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get('projectId') || undefined;
  await clearFlowLogs(user.id, projectId);
  return NextResponse.json({ success: true });
}
