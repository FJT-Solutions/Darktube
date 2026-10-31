// Risk mode: limites recomendados de geracao no Flow e de postagem, por usuario.
// Os numeros padrao sao conservadores e ajustaveis; nao sao uma regra do Google.

import { pool } from '@/lib/db-client'

export interface RiskSettings {
  /** Se ligado, o sistema continua gerando/postando acima do recomendado (com aviso de risco). */
  riskMode: boolean
  hourlyLimit: number
  dailyLimit: number
  /** Intervalo minimo entre duas geracoes, em segundos (o sistema soma um atraso aleatorio). */
  minGapSec: number
  postsPerDay: number
}

export const DEFAULT_RISK: RiskSettings = {
  riskMode: false,
  hourlyLimit: 10,
  dailyLimit: 40,
  minGapSec: 45,
  postsPerDay: 6,
}

export type RiskBand = 'safe' | 'alert' | 'risk'

export interface RiskUsage {
  generationsHour: number
  generationsDay: number
  posts24h: number
  bandGenerations: RiskBand
  bandPosts: RiskBand
}

let ready = false

async function ensureRiskTable() {
  if (ready) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.flow_risk (
      user_id UUID PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  ready = true
}

const clamp = (v: any, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

export function sanitizeRisk(raw: any): RiskSettings {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    riskMode: r.riskMode === true,
    hourlyLimit: clamp(r.hourlyLimit, 1, 10000, DEFAULT_RISK.hourlyLimit),
    dailyLimit: clamp(r.dailyLimit, 1, 50000, DEFAULT_RISK.dailyLimit),
    minGapSec: clamp(r.minGapSec, 0, 3600, DEFAULT_RISK.minGapSec),
    postsPerDay: clamp(r.postsPerDay, 1, 1000, DEFAULT_RISK.postsPerDay),
  }
}

export function bandOf(count: number, limit: number): RiskBand {
  if (count >= limit) return 'risk'
  if (count >= limit * 0.7) return 'alert'
  return 'safe'
}

export async function getRiskSettings(userId: string): Promise<RiskSettings> {
  await ensureRiskTable()
  const { rows } = await pool.query(`SELECT settings FROM public.flow_risk WHERE user_id = $1`, [userId])
  return sanitizeRisk(rows[0]?.settings)
}

export async function saveRiskSettings(userId: string, patch: Partial<RiskSettings>): Promise<RiskSettings> {
  await ensureRiskTable()
  const merged = sanitizeRisk({ ...(await getRiskSettings(userId)), ...patch })
  await pool.query(
    `INSERT INTO public.flow_risk (user_id, settings, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
    [userId, JSON.stringify(merged)]
  )
  return merged
}

export async function getRiskUsage(userId: string, s?: RiskSettings): Promise<RiskUsage> {
  const settings = s ?? (await getRiskSettings(userId))
  const gens = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('running', 'done') AND claimed_at > NOW() - INTERVAL '1 hour')::int AS h,
       COUNT(*) FILTER (WHERE status IN ('running', 'done') AND claimed_at > NOW() - INTERVAL '24 hours')::int AS d
     FROM public.flow_jobs WHERE user_id = $1`,
    [userId]
  )
  let posts = 0
  try {
    const p = await pool.query(
      `SELECT COUNT(*)::int AS n FROM public.dark_clips_posts
        WHERE user_id = $1 AND status IN ('scheduled','publishing','published')
          AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    )
    posts = p.rows[0]?.n ?? 0
  } catch {
    posts = 0 // tabela de posts ainda nao existe para este banco
  }
  const h = gens.rows[0]?.h ?? 0
  const d = gens.rows[0]?.d ?? 0
  const worst = (a: RiskBand, b: RiskBand): RiskBand => (a === 'risk' || b === 'risk' ? 'risk' : a === 'alert' || b === 'alert' ? 'alert' : 'safe')
  return {
    generationsHour: h,
    generationsDay: d,
    posts24h: posts,
    bandGenerations: worst(bandOf(h, settings.hourlyLimit), bandOf(d, settings.dailyLimit)),
    bandPosts: bandOf(posts, settings.postsPerDay),
  }
}

export interface ClaimDecision {
  allowed: boolean
  /** Motivo quando nao permitido, ou 'over_limit' quando permitido acima do recomendado. */
  reason?: 'limit_hour' | 'limit_day' | 'over_limit'
  retryAfterSec?: number
  band: RiskBand
}

/** Decide se a proxima geracao pode sair agora (sem considerar pausa e intervalo, que ficam na fila). */
export function decideByLimits(usage: RiskUsage, s: RiskSettings): ClaimDecision {
  const overHour = usage.generationsHour >= s.hourlyLimit
  const overDay = usage.generationsDay >= s.dailyLimit
  if (!overHour && !overDay) return { allowed: true, band: usage.bandGenerations }
  if (s.riskMode) return { allowed: true, reason: 'over_limit', band: 'risk' }
  return {
    allowed: false,
    reason: overDay ? 'limit_day' : 'limit_hour',
    retryAfterSec: overDay ? 1800 : 300,
    band: 'risk',
  }
}
