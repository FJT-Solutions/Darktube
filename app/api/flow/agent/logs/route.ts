import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { addFlowLogs } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

// A extensao manda { logs: [...] } (lote) ou um unico { message, level, data, jobId, projectId }.
export async function POST(req: Request) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  try {
    const body = await req.json();
    const entries = Array.isArray(body?.logs) ? body.logs : body && body.message ? [body] : [];
    if (entries.length > 0) {
      for (const e of entries) {
        const lvl = (e.level || 'info').toUpperCase();
        const extra = e.data ? ` | ${typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}` : '';
        console.log(`[FLOW EXTENSION][${lvl}] ${e.message}${extra}`);
      }
      await addFlowLogs(user.id, entries);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
