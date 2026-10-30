import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { touchFlowAgent, getFlowAgentState } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

const MAX_CAPS_BYTES = 8000;

// body: { version, capabilities?, mode? } — capacidades lidas pela extensao na pagina do Flow.
export async function POST(req: Request) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const state = await getFlowAgentState(user.id);
  const info: Record<string, any> = { ...(state?.info ?? {}), version: String(body.version || '').slice(0, 20) };
  if (typeof body.mode === 'string') info.mode = body.mode.slice(0, 20);
  if (body.capabilities && typeof body.capabilities === 'object') {
    const text = JSON.stringify(body.capabilities);
    if (text.length <= MAX_CAPS_BYTES) {
      info.capabilities = body.capabilities;
      info.capabilitiesAt = new Date().toISOString();
    }
  }
  await touchFlowAgent(user.id, info);
  return NextResponse.json({ success: true });
}
