import { NextResponse } from 'next/server';
import { getFlowAgentUser } from '@/lib/flow-auth';
import { pool } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getFlowAgentUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;

  await pool.query(
    `UPDATE public.flow_jobs SET status = 'collecting' WHERE id = $1 AND user_id = $2 AND status = 'running'`,
    [id, user.id]
  );

  return NextResponse.json({ success: true });
}
