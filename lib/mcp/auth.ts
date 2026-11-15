/**
 * Autenticação para endpoints e requisições do MCP DarkTube.
 */
export function validateMcpAuth(req: Request): { authorized: boolean; error?: string } {
  const secret = process.env.DARKTUBE_MCP_SECRET || process.env.DARKTUBE_API_KEY;
  
  // Se nenhum segredo estiver configurado em ambiente de desenvolvimento, permite
  if (!secret) {
    return { authorized: true };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { authorized: false, error: 'Header Authorization ausente.' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== secret) {
    return { authorized: false, error: 'Token de autorização inválido.' };
  }

  return { authorized: true };
}

/**
 * Autenticacao completa: segredo global (compatibilidade, usa o usuario padrao) ou token pessoal "dtk_..." (usa o dono do token).
 */
export async function resolveMcpAuth(req: Request): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('authorization')
  const token = (authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (token.startsWith('dtk_')) {
    const { findUserByMcpToken } = await import('@/lib/mcp/tokens')
    const userId = await findUserByMcpToken(token).catch(() => null)
    return userId ? { authorized: true, userId } : { authorized: false, error: 'Token do MCP inválido ou revogado.' }
  }
  return validateMcpAuth(req)
}
