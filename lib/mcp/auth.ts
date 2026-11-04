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
