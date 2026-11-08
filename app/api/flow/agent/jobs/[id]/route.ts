import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { getFlowJobLiveness } from '@/lib/flow-jobs';

export const dynamic = 'force-dynamic';

// A extensao confere antes de clicar em gerar (e a cada poucos segundos de espera) se o job ainda vale:
// cancelado, projeto apagado ou devolvido para a fila = alive false, e ela aborta sem gastar credito.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const live = await getFlowJobLiveness(user.id, id);
  return NextResponse.json({ success: true, ...live });
}
