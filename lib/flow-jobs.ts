import { pool } from '@/lib/db-client';
import { decideByLimits, getRiskSettings, getRiskUsage, type RiskBand } from '@/lib/flow-risk';

export type FlowJobKind = 'image' | 'video';
export type FlowJobStatus = 'queued' | 'running' | 'done' | 'draft' | 'cancelled';

export interface FlowJobParams {
  aspectRatio?: string;
  model?: string;
  duration?: number;
  resolution?: string;
  count?: number;
}

export interface FlowJob {
  id: string;
  user_id: string;
  kind: FlowJobKind;
  prompt: string;
  params: FlowJobParams;
  engine: string;
  status: FlowJobStatus;
  attempts: number;
  post_id: string | null;
  project_id: string | null;
  take_index: number | null;
  role: string | null;
  result_url: string | null;
  error_message: string | null;
  deadline_at: string | null;
  claimed_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// Um job que falha, expira ou estoura o tempo vira rascunho (nunca cai em outro motor sozinho).
const RUNNING_TIMEOUT_MIN = 20;
const DEFAULT_DEADLINE_MIN = 120;
const MAX_ACTIVE_JOBS_PER_USER = 80;
const AGENT_ONLINE_WINDOW_SEC = 120;

const ALLOWED_ASPECTS = ['9:16', '16:9', '1:1', '3:4', '4:3'];
const ALLOWED_RESOLUTIONS = ['360p', '720p'];

let tablesReady = false;

export async function ensureFlowTablesExist() {
  if (tablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.flow_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      kind TEXT NOT NULL,
      prompt TEXT NOT NULL,
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      engine TEXT NOT NULL DEFAULT 'flow',
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INT NOT NULL DEFAULT 0,
      post_id UUID,
      result_url TEXT,
      error_message TEXT,
      deadline_at TIMESTAMPTZ,
      claimed_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.flow_jobs ADD COLUMN IF NOT EXISTS project_id UUID;
    ALTER TABLE public.flow_jobs ADD COLUMN IF NOT EXISTS take_index INT;
    ALTER TABLE public.flow_jobs ADD COLUMN IF NOT EXISTS role TEXT;
    CREATE INDEX IF NOT EXISTS flow_jobs_user_status_idx ON public.flow_jobs (user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS flow_jobs_project_idx ON public.flow_jobs (project_id, take_index);

    CREATE TABLE IF NOT EXISTS public.flow_agents (
      user_id UUID PRIMARY KEY,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      info JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    ALTER TABLE public.flow_agents ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;
    ALTER TABLE public.flow_agents ADD COLUMN IF NOT EXISTS pause_reason TEXT;
    ALTER TABLE public.flow_agents ADD COLUMN IF NOT EXISTS next_allowed_at TIMESTAMPTZ;
  `);
  tablesReady = true;
}

function cleanParams(raw: any): FlowJobParams {
  const p: FlowJobParams = {};
  if (!raw || typeof raw !== 'object') return p;
  if (ALLOWED_ASPECTS.includes(raw.aspectRatio)) p.aspectRatio = raw.aspectRatio;
  if (ALLOWED_RESOLUTIONS.includes(raw.resolution)) p.resolution = raw.resolution;
  if (typeof raw.model === 'string') p.model = raw.model.slice(0, 60);
  if (Number.isFinite(raw.duration)) p.duration = Math.min(Math.max(Math.round(raw.duration), 2), 12);
  if (Number.isFinite(raw.count)) p.count = Math.min(Math.max(Math.round(raw.count), 1), 4);
  return p;
}

// Expira o que ficou preso: job rodando há demais e job na fila que passou do prazo viram rascunho.
async function expireStaleJobs(userId: string) {
  await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'draft', finished_at = NOW(), error_message = 'Tempo de geração excedido'
      WHERE user_id = $1 AND status = 'running'
        AND claimed_at < NOW() - ($2 || ' minutes')::interval`,
    [userId, String(RUNNING_TIMEOUT_MIN)]
  );
  await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'draft', finished_at = NOW(), error_message = 'Prazo expirou sem o computador ficar online'
      WHERE user_id = $1 AND status = 'queued' AND deadline_at IS NOT NULL AND deadline_at < NOW()`,
    [userId]
  );
}

export async function createFlowJob(input: {
  userId: string;
  kind: FlowJobKind;
  prompt: string;
  params?: any;
  postId?: string | null;
  projectId?: string | null;
  takeIndex?: number | null;
  role?: string | null;
  deadlineMinutes?: number;
}): Promise<FlowJob> {
  await ensureFlowTablesExist();
  const prompt = (input.prompt || '').trim();
  if (!prompt) throw new Error('Prompt é obrigatório.');
  if (prompt.length > 4000) throw new Error('Prompt muito longo (máx. 4000 caracteres).');
  if (input.kind !== 'image' && input.kind !== 'video') throw new Error('Tipo inválido.');

  await expireStaleJobs(input.userId);
  const active = await pool.query(
    `SELECT COUNT(*)::int AS n FROM public.flow_jobs WHERE user_id = $1 AND status IN ('queued','running')`,
    [input.userId]
  );
  if (active.rows[0].n >= MAX_ACTIVE_JOBS_PER_USER) {
    throw new Error(`Limite de ${MAX_ACTIVE_JOBS_PER_USER} jobs ativos atingido.`);
  }

  const minutes = Math.min(Math.max(input.deadlineMinutes ?? DEFAULT_DEADLINE_MIN, 5), 60 * 24);
  const res = await pool.query(
    `INSERT INTO public.flow_jobs (user_id, kind, prompt, params, post_id, project_id, take_index, role, deadline_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + ($9 || ' minutes')::interval)
     RETURNING *`,
    [
      input.userId,
      input.kind,
      prompt,
      JSON.stringify(cleanParams(input.params)),
      input.postId ?? null,
      input.projectId ?? null,
      input.takeIndex ?? null,
      input.role ? input.role.slice(0, 20) : null,
      String(minutes),
    ]
  );
  return res.rows[0];
}

export async function listFlowJobs(userId: string, limit = 50, projectId?: string): Promise<FlowJob[]> {
  await ensureFlowTablesExist();
  await expireStaleJobs(userId);
  const res = projectId
    ? await pool.query(
        `SELECT * FROM public.flow_jobs WHERE user_id = $1 AND project_id = $2 ORDER BY take_index ASC NULLS LAST, created_at ASC LIMIT $3`,
        [userId, projectId, Math.min(limit, 200)]
      )
    : await pool.query(
        `SELECT * FROM public.flow_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, Math.min(limit, 200)]
      );
  return res.rows;
}

export async function getFlowJob(userId: string, id: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(`SELECT * FROM public.flow_jobs WHERE id = $1 AND user_id = $2`, [id, userId]);
  return res.rows[0] ?? null;
}

// Reenvio: volta pra fila, podendo trocar o motor (só 'flow' é consumido pelo agente por enquanto).
export async function retryFlowJob(userId: string, id: string, engine?: string, patchParams?: Partial<FlowJobParams>): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'queued', engine = COALESCE($3, engine), error_message = NULL,
            result_url = NULL, claimed_at = NULL, finished_at = NULL, params = CASE WHEN $5::jsonb IS NOT NULL THEN params || $5::jsonb ELSE params END,
            deadline_at = NOW() + ($4 || ' minutes')::interval
      WHERE id = $1 AND user_id = $2 AND status IN ('draft','cancelled')
      RETURNING *`,
    [id, userId, engine ? engine.slice(0, 30) : null, String(DEFAULT_DEADLINE_MIN), patchParams ? JSON.stringify(cleanParams(patchParams)) : null]
  );
  return res.rows[0] ?? null;
}

export async function cancelFlowJob(userId: string, id: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs SET status = 'cancelled', finished_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status IN ('queued','running')
      RETURNING *`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

export async function touchFlowAgent(userId: string, info: any = {}) {
  await ensureFlowTablesExist();
  await pool.query(
    `INSERT INTO public.flow_agents (user_id, last_seen, info) VALUES ($1, NOW(), $2)
     ON CONFLICT (user_id) DO UPDATE SET last_seen = NOW(), info = EXCLUDED.info`,
    [userId, JSON.stringify(info && typeof info === 'object' ? info : {})]
  );
}

export async function isFlowAgentOnline(userId: string): Promise<boolean> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `SELECT 1 FROM public.flow_agents WHERE user_id = $1 AND last_seen > NOW() - ($2 || ' seconds')::interval`,
    [userId, String(AGENT_ONLINE_WINDOW_SEC)]
  );
  return res.rows.length > 0;
}

export interface ClaimResult {
  job: FlowJob | null;
  /** Por que nao saiu job agora (para a extensao e a tela). */
  reason?: 'running' | 'empty' | 'paused' | 'gap' | 'limit_hour' | 'limit_day';
  retryAfterSec?: number;
  /** Faixa de risco no momento da entrega. */
  band?: RiskBand;
  overLimit?: boolean;
}

export async function getFlowAgentState(userId: string) {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `SELECT last_seen, info, paused_until, pause_reason, next_allowed_at FROM public.flow_agents WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function pauseFlowAgent(userId: string, _minutes: number, reason: string) {
  await ensureFlowTablesExist();
  await pool.query(
    `INSERT INTO public.flow_agents (user_id, last_seen, paused_until, pause_reason)
     VALUES ($1, NOW(), NULL, $2)
     ON CONFLICT (user_id) DO UPDATE SET paused_until = NULL, pause_reason = EXCLUDED.pause_reason`,
    [userId, reason.slice(0, 200)]
  );
}

export async function resumeFlowAgent(userId: string) {
  await ensureFlowTablesExist();
  await pool.query(`UPDATE public.flow_agents SET paused_until = NULL, pause_reason = NULL WHERE user_id = $1`, [userId]);
}

// Entrega o próximo job ao agente. Um por vez por usuário, respeitando intervalo e limites configurados pelo usuário.
export async function claimNextFlowJob(userId: string): Promise<ClaimResult> {
  await ensureFlowTablesExist();
  await expireStaleJobs(userId);
  const busy = await pool.query(
    `SELECT 1 FROM public.flow_jobs WHERE user_id = $1 AND status = 'running' LIMIT 1`,
    [userId]
  );
  if (busy.rows.length > 0) return { job: null, reason: 'running' };

  const queued = await pool.query(
    `SELECT 1 FROM public.flow_jobs WHERE user_id = $1 AND engine = 'flow' AND status = 'queued' LIMIT 1`,
    [userId]
  );
  if (queued.rows.length === 0) return { job: null, reason: 'empty' };

  const state = await getFlowAgentState(userId);
  const now = Date.now();
  if (state?.next_allowed_at && new Date(state.next_allowed_at).getTime() > now) {
    return { job: null, reason: 'gap', retryAfterSec: Math.ceil((new Date(state.next_allowed_at).getTime() - now) / 1000) };
  }

  const settings = await getRiskSettings(userId);
  const decision = decideByLimits(await getRiskUsage(userId, settings), settings);
  if (!decision.allowed) {
    return { job: null, reason: decision.reason as 'limit_hour' | 'limit_day', retryAfterSec: decision.retryAfterSec, band: decision.band };
  }

  const res = await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'running', claimed_at = NOW(), attempts = attempts + 1
      WHERE id = (
        SELECT id FROM public.flow_jobs
         WHERE user_id = $1 AND engine = 'flow' AND status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING *`,
    [userId]
  );
  const job: FlowJob | null = res.rows[0] ?? null;
  if (job && settings.minGapSec > 0) {
    // Proxima geracao respeita o intervalo minimo escolhido pelo usuario (com leve variacao se >= 15s).
    const jitter = settings.minGapSec >= 15 ? Math.floor(Math.random() * 15) : 0;
    const gap = settings.minGapSec + jitter;
    await pool.query(
      `INSERT INTO public.flow_agents (user_id, last_seen, next_allowed_at)
       VALUES ($1, NOW(), NOW() + ($2 || ' seconds')::interval)
       ON CONFLICT (user_id) DO UPDATE SET next_allowed_at = EXCLUDED.next_allowed_at`,
      [userId, String(gap)]
    );
  }
  return { job, band: decision.band, overLimit: decision.reason === 'over_limit' };
}

export async function completeFlowJob(userId: string, id: string, resultUrl: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs SET status = 'done', result_url = $3, finished_at = NOW(), error_message = NULL
      WHERE id = $1 AND user_id = $2 AND status = 'running'
      RETURNING *`,
    [id, userId, resultUrl]
  );
  return res.rows[0] ?? null;
}

// Falha vira rascunho: o usuário reenvia ao Flow ou escolhe outro motor.
export async function failFlowJob(userId: string, id: string, message: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs SET status = 'draft', error_message = $3, finished_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'running'
      RETURNING *`,
    [id, userId, (message || 'Falha na geração').slice(0, 500)]
  );
  return res.rows[0] ?? null;
}
