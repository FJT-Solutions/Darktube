import { pool } from '@/lib/db-client';
import { decideByLimits, getRiskSettings, getRiskUsage, type RiskBand } from '@/lib/flow-risk';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { uploadThumbnail } from '@/lib/storage';

const run = promisify(execFile);
const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';

export type FlowJobKind = 'image' | 'video';
export type FlowJobStatus = 'queued' | 'running' | 'collecting' | 'done' | 'draft' | 'cancelled';

export interface FlowJobParams {
  aspectRatio?: string;
  model?: string;
  duration?: number;
  resolution?: string;
  count?: number;
  /** Folha de personagem: qual personagem do projeto esta imagem representa. */
  characterId?: string;
  /** Imagem de referencia do take (folha do personagem ou do elenco), em /api/storage/... */
  refImageUrl?: string;
  /** Usar o video do take anterior como referencia de continuidade (resolvido na entrega do job). */
  refPrevVideo?: boolean;
  /** Preenchido na entrega: video do take anterior. */
  refVideoUrl?: string;
  /** Preenchido na entrega: ultimo frame (JPEG) do take anterior para continuidade visual. */
  refPrevFrameUrl?: string;
  /** Frame inicial (Start Frame) para o take. */
  firstFrameUrl?: string;
  wordsPerCaption?: number;
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

    CREATE TABLE IF NOT EXISTS public.flow_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      job_id UUID,
      project_id UUID,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS flow_logs_user_idx ON public.flow_logs (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS flow_logs_job_idx ON public.flow_logs (job_id, created_at DESC);
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
  if (typeof raw.characterId === 'string') p.characterId = raw.characterId.slice(0, 40);
  if (typeof raw.refImageUrl === 'string' && /^\/api\/storage\/[\w.-]+$/.test(raw.refImageUrl)) p.refImageUrl = raw.refImageUrl.slice(0, 200);
  if (raw.refPrevVideo === true) p.refPrevVideo = true;
  if (typeof raw.refPrevFrameUrl === 'string' && /^\/api\/storage\/[\w.-]+$/.test(raw.refPrevFrameUrl)) p.refPrevFrameUrl = raw.refPrevFrameUrl.slice(0, 200);
  if (typeof raw.firstFrameUrl === 'string' && /^\/api\/storage\/[\w.-]+$/.test(raw.firstFrameUrl)) p.firstFrameUrl = raw.firstFrameUrl.slice(0, 200);
  if (Number.isFinite(raw.wordsPerCaption)) p.wordsPerCaption = Math.min(Math.max(Math.round(raw.wordsPerCaption), 1), 3);
  return p;
}

/** Video pronto do take anterior do mesmo projeto (o final em 720p se houver), para referencia de continuidade. */
export async function previousTakeVideo(userId: string, projectId: string, takeIndex: number): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT result_url FROM public.flow_jobs
      WHERE user_id = $1 AND project_id = $2 AND take_index = $3 AND status = 'done' AND result_url IS NOT NULL
        AND role IN ('take', 'take_final')
      ORDER BY (role = 'take_final') DESC, finished_at DESC LIMIT 1`,
    [userId, projectId, takeIndex - 1]
  );
  return rows[0]?.result_url ?? null;
}

/** Extrai o ultimo frame (JPEG) do video do take anterior para ser usado como imagem de referencia ou start frame no Flow. */
export async function previousTakeLastFrame(userId: string, projectId: string, takeIndex: number): Promise<string | null> {
  const cacheName = `flow_lastframe_${projectId}_take_${takeIndex - 1}.jpg`;

  // 1. Verifica se o frame ja foi extraido e salvo em storage_files
  const cached = await pool.query(
    `SELECT filename FROM public.storage_files WHERE filename = $1 LIMIT 1`,
    [cacheName]
  );
  if (cached.rows.length > 0) {
    return `/api/storage/${cacheName}`;
  }

  // 2. Busca o video do take anterior
  const prevUrl = await previousTakeVideo(userId, projectId, takeIndex);
  if (!prevUrl) return null;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darktube-frame-'));
  const tempVideo = path.join(tempDir, 'prev.mp4');
  const tempFrame = path.join(tempDir, 'lastframe.jpg');

  try {
    const filenameMatch = prevUrl.match(/\/api\/storage\/([\w.-]+)/);
    if (filenameMatch) {
      const fileRow = await pool.query(
        `SELECT content FROM public.storage_files WHERE filename = $1 LIMIT 1`,
        [filenameMatch[1]]
      );
      if (fileRow.rows[0]?.content) {
        fs.writeFileSync(tempVideo, fileRow.rows[0].content);
      }
    } else if (/^https?:\/\//i.test(prevUrl)) {
      const res = await fetch(prevUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tempVideo, buf);
    }

    if (!fs.existsSync(tempVideo) || fs.statSync(tempVideo).size < 1000) return null;

    // Extrai o ultimo frame via FFmpeg (-sseof -0.2 captura o frame imediatamente anterior ao final do video)
    await run(ffmpegBin(), ['-y', '-sseof', '-0.2', '-i', tempVideo, '-update', '1', '-q:v', '2', tempFrame], { timeout: 30000 });

    if (fs.existsSync(tempFrame) && fs.statSync(tempFrame).size > 100) {
      const frameBuffer = fs.readFileSync(tempFrame);
      const url = await uploadThumbnail(frameBuffer, cacheName);
      return url;
    }
    return null;
  } catch (err) {
    console.warn(`[Flow] Falha ao extrair ultimo frame do take ${takeIndex - 1}:`, err);
    return null;
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// Expira o que ficou preso: job rodando há demais e job na fila que passou do prazo viram rascunho.
async function expireStaleJobs(userId: string) {
  await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'draft', finished_at = NOW(), error_message = 'Tempo de geração excedido'
      WHERE user_id = $1 AND status IN ('running', 'collecting')
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
export async function retryFlowJob(userId: string, id: string, engine?: string, patchParams?: Partial<FlowJobParams>, prompt?: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'queued', engine = COALESCE($3, engine), error_message = NULL, prompt = COALESCE($6, prompt),
            result_url = NULL, claimed_at = NULL, finished_at = NULL, params = (CASE WHEN $5::jsonb IS NOT NULL THEN params || $5::jsonb ELSE params END) - 'policyRetries',
            deadline_at = NOW() + ($4 || ' minutes')::interval
      WHERE id = $1 AND user_id = $2 AND status IN ('draft','cancelled','done')
      RETURNING *`,
    [id, userId, engine ? engine.slice(0, 30) : null, String(DEFAULT_DEADLINE_MIN), patchParams ? JSON.stringify(cleanParams(patchParams)) : null, prompt || null]
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

/** Cancela takes de um projeto que estejam na fila ou rodando para aguardar a aprovação da folha. */
export async function holdProjectTakesForApproval(userId: string, projectId: string) {
  await ensureFlowTablesExist();
  await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'draft', error_message = 'Aguardando aprovação da folha de personagem'
      WHERE user_id = $1 AND project_id = $2 AND status IN ('queued','running') AND role IN ('take','take_final')`,
    [userId, projectId]
  );
}

/** Atualiza prompts e parâmetros dos takes de um projeto na fila quando a folha de personagem é aprovada. */
export async function syncProjectQueuedJobsWithReferences(
  userId: string,
  projectId: string,
  script: any,
  params: any,
  templateId: string
) {
  try {
    const { getFlowTemplate } = await import('@/lib/flow-templates');
    const { takeReference, buildTakePrompt } = await import('@/lib/flow-script');
    const t = getFlowTemplate(templateId);
    if (!t || !script?.takes) return;
    const { rows: queuedJobs } = await pool.query(
      `SELECT id, take_index, params, role FROM public.flow_jobs
        WHERE user_id = $1 AND project_id = $2 AND status IN ('queued', 'draft') AND role IN ('take', 'take_final')`,
      [userId, projectId]
    );
    for (const j of queuedJobs) {
      const take = script.takes.find((k: any) => k.n === j.take_index);
      if (!take) continue;
      const isFinal = j.role === 'take_final';
      const ref = takeReference(script, take, isFinal ? { ...(params || {}), refPrevVideo: '0' } : params || {});
      const newPrompt = buildTakePrompt(script, take, params || {}, t, ref);
      const newParams = {
        ...(j.params || {}),
        ...(ref.refImageUrl ? { refImageUrl: ref.refImageUrl } : {}),
        ...(ref.refPrevVideo ? { refPrevVideo: true } : {}),
      };
      if (!ref.refImageUrl) delete newParams.refImageUrl;
      await pool.query(
        `UPDATE public.flow_jobs SET prompt = $3, params = $4 WHERE id = $1 AND user_id = $2`,
        [j.id, userId, newPrompt, JSON.stringify(newParams)]
      );
    }
  } catch (e) {
    console.error('[Flow] Erro ao sincronizar referências nos jobs:', e);
  }
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
    `SELECT 1 FROM public.flow_jobs WHERE user_id = $1 AND status IN ('running', 'collecting') LIMIT 1`,
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
    const diff = Math.ceil((new Date(state.next_allowed_at).getTime() - now) / 1000);
    if (diff > 3) {
      await pool.query(`UPDATE public.flow_agents SET next_allowed_at = NULL WHERE user_id = $1`, [userId]);
    } else {
      return { job: null, reason: 'gap', retryAfterSec: diff };
    }
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
           -- Trava de segurança: takes só saem da fila se o projeto NÃO tiver folhas aguardando aprovação ou gerando
           AND (
             role IN ('character_sheet', 'cast_sheet')
             OR project_id IS NULL
             OR NOT EXISTS (
               SELECT 1 FROM public.flow_projects p
                WHERE p.id = project_id
                  AND (
                    p.script->>'castSheetStatus' IN ('gerando', 'aguardando')
                    OR (
                      jsonb_typeof(p.script->'characters') = 'array'
                      AND EXISTS (
                        SELECT 1 FROM jsonb_array_elements(p.script->'characters') AS c
                         WHERE c->>'sheetStatus' IN ('gerando', 'aguardando')
                           AND NOT (
                             LOWER(COALESCE(c->>'name', '')) ~ '^(narrador|narrator|voz|voice|locutor)\b'
                             OR LOWER(COALESCE(c->>'description', '')) ~ '(invisible voice|no visual features|off-screen voice|sem corpo|apenas voz|voz invis)'
                           )
                      )
                    )
                  )
             )
           )
         -- Folhas de personagem (curtas e pedidas na hora) passam na frente dos takes; dentro de cada grupo, ordem de chegada.
         ORDER BY (role IN ('character_sheet', 'cast_sheet')) DESC, created_at ASC
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
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')
      RETURNING *`,
    [id, userId, resultUrl]
  );
  return res.rows[0] ?? null;
}

// Falha vira rascunho: o usuário reenvia ao Flow ou escolhe outro motor.
/** Devolve um job em execucao para a fila sem gastar a tentativa (problema na tela do Flow, nao no take). */
export async function releaseFlowJob(userId: string, id: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs SET status = 'queued', claimed_at = NULL, error_message = NULL,
            deadline_at = NOW() + ($3 || ' minutes')::interval
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')
      RETURNING *`,
    [id, userId, String(DEFAULT_DEADLINE_MIN)]
  );
  return res.rows[0] ?? null;
}

export const MAX_GEN_RETRIES = 2;

/**
 * Falha generica do Flow ("Sorry, this video failed to generate"): costuma ser passageira. Devolve a MESMA cena para a
 * fila (prompt identico) ate MAX_GEN_RETRIES vezes; a espera entre tentativas e feita pela extensao. Null = acabaram.
 */
export async function requeueAfterGenFailure(userId: string, id: string): Promise<{ job: FlowJob; attempt: number } | null> {
  await ensureFlowTablesExist();
  const { rows } = await pool.query(`SELECT * FROM public.flow_jobs WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')`, [id, userId]);
  const job = rows[0] as FlowJob | undefined;
  if (!job) return null;
  const done = Number((job.params as any)?.genRetries) || 0;
  if (done >= MAX_GEN_RETRIES) return null;
  const attempt = done + 1;
  const res = await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'queued', error_message = NULL, result_url = NULL, claimed_at = NULL, finished_at = NULL,
            params = params || jsonb_build_object('genRetries', $3::int),
            deadline_at = NOW() + ($4 || ' minutes')::interval
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')
      RETURNING *`,
    [id, userId, attempt, String(DEFAULT_DEADLINE_MIN)]
  );
  return res.rows[0] ? { job: res.rows[0], attempt } : null;
}

// 1a: mesmo prompt ou ajustado ao motivo; 2a: tambem sem realismo de pele; 3a: reescrito pela IA do projeto.
export const MAX_POLICY_RETRIES = 3;

/**
 * Recusa por politica do Flow: devolve a MESMA cena para a fila (mantem a ordem dos takes) com o prompt dado,
 * ate MAX_POLICY_RETRIES vezes. Devolve null quando as tentativas acabaram (o chamador marca como rascunho).
 */
export async function requeueAfterPolicy(
  userId: string,
  id: string,
  buildPrompt: (prompt: string, attempt: number, job: FlowJob) => string | Promise<string>
): Promise<{ job: FlowJob; attempt: number } | null> {
  await ensureFlowTablesExist();
  const { rows } = await pool.query(
    `SELECT * FROM public.flow_jobs WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')`,
    [id, userId]
  );
  const job = rows[0] as FlowJob | undefined;
  if (!job) return null;
  const done = Number((job.params as any)?.policyRetries) || 0;
  if (done >= MAX_POLICY_RETRIES) return null;
  const attempt = done + 1;
  const nextPrompt = (await buildPrompt(job.prompt, attempt, job)) || job.prompt;
  const res = await pool.query(
    `UPDATE public.flow_jobs
        SET status = 'queued', prompt = $3, error_message = NULL, result_url = NULL,
            claimed_at = NULL, finished_at = NULL,
            params = params || jsonb_build_object('policyRetries', $4::int),
            deadline_at = NOW() + ($5 || ' minutes')::interval
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')
      RETURNING *`,
    [id, userId, nextPrompt, attempt, String(DEFAULT_DEADLINE_MIN)]
  );
  return res.rows[0] ? { job: res.rows[0], attempt } : null;
}

export async function failFlowJob(userId: string, id: string, message: string): Promise<FlowJob | null> {
  await ensureFlowTablesExist();
  const res = await pool.query(
    `UPDATE public.flow_jobs SET status = 'draft', error_message = $3, finished_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'collecting')
      RETURNING *`,
    [id, userId, (message || 'Falha na geração').slice(0, 500)]
  );
  return res.rows[0] ?? null;
}

// ---------- logs da extensao (aparecem em tempo real no painel do Flow) ----------

export interface FlowLogEntry {
  id: string;
  user_id: string;
  job_id: string | null;
  project_id: string | null;
  level: string;
  message: string;
  data: any;
  created_at: string;
}

const LOG_LEVELS = ['info', 'warn', 'error', 'success'];
const MAX_LOG_BATCH = 100;
const MAX_LOG_DATA_CHARS = 8000;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown) => (typeof v === 'string' && UUID_RX.test(v) ? v : null);

// Aceita um item ou um lote. Cada item pode trazer o proprio horario (timestamp em ms) para manter a ordem real.
export async function addFlowLogs(
  userId: string,
  entries:
    | { message: string; level?: string; jobId?: string | null; projectId?: string | null; data?: any; timestamp?: number }
    | Array<{ message: string; level?: string; jobId?: string | null; projectId?: string | null; data?: any; timestamp?: number }>
) {
  await ensureFlowTablesExist();
  const list = (Array.isArray(entries) ? entries : [entries]).slice(0, MAX_LOG_BATCH);
  for (const e of list) {
    const message = String(e?.message ?? '').trim().slice(0, 1000);
    if (!message) continue;
    const level = LOG_LEVELS.includes(String(e.level)) ? String(e.level) : 'info';
    let data: string | null = null;
    if (e.data !== undefined && e.data !== null) {
      try {
        const s = JSON.stringify(e.data);
        data = s.length > MAX_LOG_DATA_CHARS ? JSON.stringify({ truncated: s.slice(0, MAX_LOG_DATA_CHARS) }) : s;
      } catch {
        data = null;
      }
    }
    const ts = Number.isFinite(e.timestamp) ? new Date(e.timestamp as number) : null;
    await pool.query(
      `INSERT INTO public.flow_logs (user_id, job_id, project_id, level, message, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, COALESCE($7::timestamptz, NOW()))`,
      [userId, asUuid(e.jobId), asUuid(e.projectId), level, message, data, ts && !isNaN(ts.getTime()) ? ts.toISOString() : null]
    );
  }
}

// Com projectId traz os logs daquele projeto e os gerais da extensao (sem projeto, ex.: o vigia periodico).
export async function listFlowLogs(userId: string, limit = 100, projectId?: string): Promise<FlowLogEntry[]> {
  await ensureFlowTablesExist();
  const n = Math.min(Math.max(Math.round(limit) || 100, 1), 500);
  const res = projectId && asUuid(projectId)
    ? await pool.query(
        `SELECT * FROM public.flow_logs WHERE user_id = $1 AND (project_id = $2 OR project_id IS NULL) ORDER BY created_at DESC LIMIT $3`,
        [userId, projectId, n]
      )
    : await pool.query(`SELECT * FROM public.flow_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, n]);
  return res.rows;
}

export async function clearFlowLogs(userId: string, projectId?: string) {
  await ensureFlowTablesExist();
  if (projectId && asUuid(projectId)) {
    await pool.query(`DELETE FROM public.flow_logs WHERE user_id = $1 AND (project_id = $2 OR project_id IS NULL)`, [userId, projectId]);
  } else {
    await pool.query(`DELETE FROM public.flow_logs WHERE user_id = $1`, [userId]);
  }
}

export async function countQueuedJobs(userId: string): Promise<number> {
  await ensureFlowTablesExist();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM public.flow_jobs WHERE user_id = $1 AND status = 'queued'`,
    [userId]
  );
  return rows[0]?.n ?? 0;
}
