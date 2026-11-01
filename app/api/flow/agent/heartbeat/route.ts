import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { touchFlowAgent, getFlowAgentState } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

const MAX_CAPS_BYTES = 8000;

// Ultimo estado impresso por usuario: o log da VPS so ganha linha quando algo muda (ou a cada 10 min).
const lastPrinted = new Map<string, { key: string; at: number }>();

// body: { version, build?, capabilities?, mode? } — capacidades lidas pela extensao na pagina do Flow.
export async function POST(req: Request) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const state = await getFlowAgentState(user.id);
  const info: Record<string, any> = { ...(state?.info ?? {}), version: String(body.version || '').slice(0, 20) };
  if (typeof body.build === 'string') info.build = body.build.slice(0, 60);
  if (typeof body.mode === 'string') info.mode = body.mode.slice(0, 20);
  if (body.capabilities && typeof body.capabilities === 'object') {
    const text = JSON.stringify(body.capabilities);
    if (text.length <= MAX_CAPS_BYTES) {
      info.capabilities = body.capabilities;
      info.capabilitiesAt = new Date().toISOString();
    }
  }
  await touchFlowAgent(user.id, info);

  const key = `${info.version}|${info.build ?? '-'}|${info.mode ?? '-'}`;
  const prev = lastPrinted.get(user.id);
  if (!prev || prev.key !== key || Date.now() - prev.at > 10 * 60 * 1000) {
    lastPrinted.set(user.id, { key, at: Date.now() });
    console.log(`[FLOW EXTENSION][INFO] heartbeat user=${String(user.id).slice(0, 8)} versao=${info.version} build=${info.build ?? 'sem-build (extensao antiga)'} modo=${info.mode ?? '-'}`);
  }
  return NextResponse.json({ success: true });
}
