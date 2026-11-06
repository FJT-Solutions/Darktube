import { pool } from '@/lib/db-client';

let tableReady = false;

export async function ensureCreditsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.user_credits (
      user_id UUID PRIMARY KEY,
      credits INT NOT NULL DEFAULT 500,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  tableReady = true;
}

/**
 * Consulta o saldo atual de créditos do usuário no banco.
 * Se o usuário não tiver registro, cria com 500 créditos padrão de boas-vindas.
 */
export async function getUserCredits(userId: string): Promise<number> {
  await ensureCreditsTable();
  const { rows } = await pool.query(
    `SELECT credits FROM public.user_credits WHERE user_id = $1`,
    [userId]
  );
  if (rows && rows.length > 0) {
    return Number(rows[0].credits) || 0;
  }
  // Cria saldo inicial para o usuário
  await pool.query(
    `INSERT INTO public.user_credits (user_id, credits)
     VALUES ($1, 500)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  return 500;
}

/**
 * Atualiza ou recarrega os créditos do usuário.
 */
export async function setUserCredits(userId: string, credits: number): Promise<number> {
  await ensureCreditsTable();
  const valid = Math.max(0, Math.round(Number(credits) || 0));
  const { rows } = await pool.query(
    `INSERT INTO public.user_credits (user_id, credits, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET credits = $2, updated_at = NOW()
     RETURNING credits`,
    [userId, valid]
  );
  return Number(rows[0]?.credits ?? valid);
}
