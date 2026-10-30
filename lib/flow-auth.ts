import { getCurrentUser, type SessionUser } from '@/lib/auth-helpers';
import { verifyJWT } from '@/lib/crypto';

// Usado pelas rotas /api/flow/agent (públicas no proxy): aceita o Bearer da extensão ou o cookie de sessão.
export async function getFlowAgentUser(req: Request): Promise<SessionUser | null> {
  let user: SessionUser | null = null;
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    user = (await verifyJWT(header.substring(7))) as SessionUser | null;
  }
  if (!user) user = await getCurrentUser();
  if (!user?.id || user.status !== 'approved') return null;
  return user;
}
