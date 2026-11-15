import crypto from 'crypto'
import { pool } from '@/lib/db-client'

// Tokens pessoais do MCP: o valor completo aparece uma unica vez; no banco fica so o hash SHA-256.
export interface McpTokenRow {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
}

const MAX_TOKENS_PER_USER = 10
let ready = false

async function ensureTable() {
  if (ready) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.mcp_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      token_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS mcp_tokens_user_idx ON public.mcp_tokens (user_id, created_at DESC);
  `)
  ready = true
}

const hash = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

export async function createMcpToken(userId: string, name: string): Promise<{ token: string; row: McpTokenRow }> {
  await ensureTable()
  const { rows: count } = await pool.query(`SELECT COUNT(*)::int AS n FROM public.mcp_tokens WHERE user_id = $1 AND revoked_at IS NULL`, [userId])
  if ((count[0]?.n || 0) >= MAX_TOKENS_PER_USER) throw new Error(`Limite de ${MAX_TOKENS_PER_USER} tokens ativos. Revogue algum antes de criar outro.`)
  const token = `dtk_${crypto.randomBytes(24).toString('hex')}`
  const { rows } = await pool.query(
    `INSERT INTO public.mcp_tokens (user_id, name, token_hash, prefix) VALUES ($1, $2, $3, $4)
     RETURNING id, name, prefix, created_at, last_used_at`,
    [userId, name.trim().slice(0, 60) || 'Meu agente', hash(token), token.slice(0, 12)]
  )
  return { token, row: rows[0] }
}

export async function listMcpTokens(userId: string): Promise<McpTokenRow[]> {
  await ensureTable()
  const { rows } = await pool.query(
    `SELECT id, name, prefix, created_at, last_used_at FROM public.mcp_tokens WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId]
  )
  return rows
}

export async function revokeMcpToken(userId: string, id: string): Promise<boolean> {
  await ensureTable()
  const { rowCount } = await pool.query(`UPDATE public.mcp_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, [id, userId])
  return (rowCount || 0) > 0
}

/** Devolve o dono do token (e marca o uso), ou null se invalido/revogado. */
export async function findUserByMcpToken(raw: string): Promise<string | null> {
  if (!raw.startsWith('dtk_')) return null
  await ensureTable()
  const { rows } = await pool.query(
    `UPDATE public.mcp_tokens SET last_used_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL RETURNING user_id`,
    [hash(raw)]
  )
  return rows[0]?.user_id || null
}
