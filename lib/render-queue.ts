import { pool } from '@/lib/db-client';

export type RenderEngine = 'remotion' | 'html_svg' | 'threejs_3d' | 'flow_assemble';
export type RenderJobKind = 'single_scene' | 'full_video';
export type RenderJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface RenderJobRecord {
  id: string;
  seq: number;
  user_id: string;
  engine: RenderEngine;
  kind: RenderJobKind;
  title: string;
  status: RenderJobStatus;
  payload: Record<string, unknown>;
  progress_pct: number;
  result_url: string | null;
  result_meta: Record<string, unknown>;
  error_message: string | null;
  worker_id: string | null;
  heartbeat_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface RenderQueueSnapshot {
  job: RenderJobRecord | null;
  positionInQueue: number;
  activeJob: Pick<RenderJobRecord, 'id' | 'seq' | 'user_id' | 'engine' | 'kind' | 'title' | 'progress_pct' | 'started_at'> | null;
  queuedCount: number;
  recentJobs: RenderJobRecord[];
}

const STALL_TIMEOUT_MINUTES = 6;
const MAX_RUNNING_MINUTES = 15;
const WORKER_INSTANCE_ID = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;

let tableEnsured = false;
let ensureTablePromise: Promise<boolean> | null = null;
let localChain: Promise<unknown> = Promise.resolve();
let localSeqCounter = 0;

function parseJsonSafe(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

function normalizeJobRow(row: any): RenderJobRecord {
  return {
    ...row,
    seq: Number(row.seq || 0),
    progress_pct: Number(row.progress_pct || 0),
    payload: parseJsonSafe(row.payload),
    result_meta: parseJsonSafe(row.result_meta),
  };
}

export async function ensureRenderQueueTable(): Promise<boolean> {
  if (tableEnsured) return true;
  if (ensureTablePromise) return await ensureTablePromise;
  ensureTablePromise = (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.render_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seq BIGSERIAL,
          user_id TEXT NOT NULL,
          engine TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'full_video',
          title TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'queued',
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          progress_pct INT NOT NULL DEFAULT 0,
          result_url TEXT,
          result_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
          error_message TEXT,
          worker_id TEXT,
          heartbeat_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          started_at TIMESTAMPTZ,
          finished_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_render_jobs_fifo ON public.render_jobs (status, seq ASC);
        CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON public.render_jobs (user_id, created_at DESC);
      `);
      tableEnsured = true;
      return true;
    } catch (err: any) {
      console.warn('[RenderQueue] Postgres indisponivel para tabela render_jobs, usando fila FIFO local:', err?.message || err);
      ensureTablePromise = null;
      return false;
    }
  })();
  return await ensureTablePromise;
}

/**
 * Watchdog (Dead-Man Switch): libera a fila automaticamente se algum job travar ou o worker cair no meio.
 */
export async function recoverStaleRenderJobs(): Promise<number> {
  const ok = await ensureRenderQueueTable();
  if (!ok) return 0;
  const { rowCount } = await pool.query(
    `UPDATE public.render_jobs
     SET status = 'failed',
         error_message = COALESCE(error_message, 'Timeout/stall do worker: fila liberada para o próximo usuário'),
         finished_at = NOW()
     WHERE status = 'running'
       AND (
         (heartbeat_at IS NOT NULL AND heartbeat_at < NOW() - ($1::text || ' minutes')::interval)
         OR (started_at IS NOT NULL AND started_at < NOW() - ($2::text || ' minutes')::interval)
       )`,
    [String(STALL_TIMEOUT_MINUTES), String(MAX_RUNNING_MINUTES)]
  );
  return rowCount || 0;
}

export async function enqueueRenderJob(input: {
  userId: string;
  engine: RenderEngine;
  kind?: RenderJobKind;
  title?: string;
  payload?: Record<string, unknown>;
  localOnly?: boolean;
}): Promise<{ job: RenderJobRecord; positionInQueue: number; persistence: 'postgres' | 'memory' }> {
  const kind: RenderJobKind = input.kind === 'single_scene' ? 'single_scene' : 'full_video';
  const title = String(input.title || '').slice(0, 140);
  const ok = input.localOnly ? false : await ensureRenderQueueTable();

  if (!ok) {
    const seq = ++localSeqCounter;
    const now = new Date().toISOString();
    const job: RenderJobRecord = {
      id: `mem_${Date.now()}_${seq}`,
      seq,
      user_id: input.userId,
      engine: input.engine,
      kind,
      title,
      status: 'queued',
      payload: input.payload || {},
      progress_pct: 0,
      result_url: null,
      result_meta: {},
      error_message: null,
      worker_id: null,
      heartbeat_at: null,
      created_at: now,
      started_at: null,
      finished_at: null,
    };
    return { job, positionInQueue: 1, persistence: 'memory' };
  }

  await recoverStaleRenderJobs();
  const { rows } = await pool.query(
    `INSERT INTO public.render_jobs (user_id, engine, kind, title, status, payload)
     VALUES ($1, $2, $3, $4, 'queued', $5::jsonb)
     RETURNING *`,
    [input.userId, input.engine, kind, title, JSON.stringify(input.payload || {})]
  );
  const job = normalizeJobRow(rows[0]);
  const posRes = await pool.query(
    `SELECT COUNT(*)::int AS ahead
     FROM public.render_jobs
     WHERE status IN ('running', 'queued') AND seq < $1`,
    [job.seq]
  );
  return {
    job,
    positionInQueue: Number(posRes.rows[0]?.ahead || 0) + 1,
    persistence: 'postgres',
  };
}

/**
 * Reivindica o proximo job FIFO somente se nao houver nenhum outro job 'running' no cluster.
 * Garante prioridade exclusiva ao pedido inteiro (1 cena ou 1 video completo) ate terminar.
 */
async function tryClaimSpecificOrNextJob(targetJobId: string): Promise<'claimed' | 'wait' | 'gone'> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const running = await client.query(`SELECT id FROM public.render_jobs WHERE status = 'running' LIMIT 1`);
    if (running.rows.length > 0) {
      await client.query('ROLLBACK');
      return 'wait';
    }

    const head = await client.query(
      `SELECT id, status FROM public.render_jobs
       WHERE status = 'queued'
       ORDER BY seq ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (head.rows.length === 0) {
      await client.query('ROLLBACK');
      return 'wait';
    }

    if (head.rows[0].id !== targetJobId) {
      const self = await client.query(`SELECT status FROM public.render_jobs WHERE id = $1`, [targetJobId]);
      await client.query('ROLLBACK');
      if (!self.rows.length || self.rows[0].status !== 'queued') return 'gone';
      return 'wait';
    }

    await client.query(
      `UPDATE public.render_jobs
       SET status = 'running', worker_id = $2, started_at = NOW(), heartbeat_at = NOW()
       WHERE id = $1`,
      [targetJobId, WORKER_INSTANCE_ID]
    );
    await client.query('COMMIT');
    return 'claimed';
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function updateRenderJobProgress(jobId: string, progressPct: number): Promise<void> {
  if (jobId.startsWith('mem_')) return;
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));
  await pool
    .query(`UPDATE public.render_jobs SET progress_pct = $2, heartbeat_at = NOW() WHERE id = $1 AND status = 'running'`, [
      jobId,
      pct,
    ])
    .catch(() => {});
}

export async function completeRenderJob(
  jobId: string,
  resultUrl: string | null,
  resultMeta: Record<string, unknown> = {}
): Promise<void> {
  if (jobId.startsWith('mem_')) return;
  await pool.query(
    `UPDATE public.render_jobs
     SET status = 'done', progress_pct = 100, result_url = $2, result_meta = $3::jsonb, finished_at = NOW(), heartbeat_at = NOW()
     WHERE id = $1`,
    [jobId, resultUrl, JSON.stringify(resultMeta)]
  );
}

export async function failRenderJob(jobId: string, errorMessage: string): Promise<void> {
  if (jobId.startsWith('mem_')) return;
  await pool.query(
    `UPDATE public.render_jobs
     SET status = 'failed', error_message = $2, finished_at = NOW(), heartbeat_at = NOW()
     WHERE id = $1`,
    [jobId, String(errorMessage || 'Erro no render').slice(0, 1000)]
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function executeClaimedJob<T extends { videoUrl?: string | null }>(
  job: RenderJobRecord,
  positionInQueue: number,
  persistence: 'postgres' | 'memory',
  waitTimeoutMs: number,
  executor: (ctx: { jobId: string; onProgress: (pct: number) => Promise<void> }) => Promise<T>
): Promise<T & { queueJobId: string; positionInQueue: number; queueMode: 'postgres' | 'memory' }> {
  if (persistence === 'memory') {
    const task = localChain.then(async () => {
      return await executor({ jobId: job.id, onProgress: async () => {} });
    });
    localChain = task.catch(() => {});
    const out = await task;
    return { ...out, queueJobId: job.id, positionInQueue, queueMode: 'memory' };
  }

  const deadline = Date.now() + waitTimeoutMs;
  while (Date.now() < deadline) {
    await recoverStaleRenderJobs();
    const state = await tryClaimSpecificOrNextJob(job.id);
    if (state === 'claimed') break;
    if (state === 'gone') {
      throw new Error(`Job ${job.id} cancelado ou removido da fila antes de iniciar.`);
    }
    await sleep(1200);
  }

  if (Date.now() >= deadline) {
    await pool
      .query(
        `UPDATE public.render_jobs SET status = 'cancelled', error_message = 'Tempo maximo de espera na fila excedido', finished_at = NOW() WHERE id = $1 AND status = 'queued'`,
        [job.id]
      )
      .catch(() => {});
    throw new Error('Tempo limite aguardando sua vez na fila de renderização.');
  }

  const hbTimer = setInterval(() => {
    pool
      .query(`UPDATE public.render_jobs SET heartbeat_at = NOW() WHERE id = $1 AND status = 'running'`, [job.id])
      .catch(() => {});
  }, 15_000);

  try {
    const out = await executor({
      jobId: job.id,
      onProgress: (pct) => updateRenderJobProgress(job.id, pct),
    });
    await completeRenderJob(job.id, out.videoUrl || null, out as unknown as Record<string, unknown>);
    return { ...out, queueJobId: job.id, positionInQueue, queueMode: 'postgres' };
  } catch (err: any) {
    await failRenderJob(jobIdOrFallback(job.id), err?.message || 'Erro durante renderização');
    throw err;
  } finally {
    clearInterval(hbTimer);
  }
}

function jobIdOrFallback(id: string): string {
  return id;
}

/**
 * Executa um pedido completo (1 cena ou 1 video inteiro) dentro da fila FIFO multi-usuario.
 * Quem iniciou primeiro mantem prioridade exclusiva com todos os workers ate concluir.
 */
export async function runQueuedRenderTask<T extends { videoUrl?: string | null }>(
  opts: {
    userId: string;
    engine: RenderEngine;
    kind?: RenderJobKind;
    title?: string;
    payload?: Record<string, unknown>;
    waitTimeoutMs?: number;
    localOnly?: boolean;
  },
  executor: (ctx: { jobId: string; onProgress: (pct: number) => Promise<void> }) => Promise<T>
): Promise<T & { queueJobId: string; positionInQueue: number; queueMode: 'postgres' | 'memory' }> {
  const { job, positionInQueue, persistence } = await enqueueRenderJob(opts);
  return await executeClaimedJob(job, positionInQueue, persistence, opts.waitTimeoutMs || 15 * 60 * 1000, executor);
}

/**
 * Enfileira o job na fila FIFO e retorna imediatamente a posicao do usuario enquanto executa em background.
 */
export async function enqueueDetachedRenderTask<T extends { videoUrl?: string | null }>(
  opts: {
    userId: string;
    engine: RenderEngine;
    kind?: RenderJobKind;
    title?: string;
    payload?: Record<string, unknown>;
    waitTimeoutMs?: number;
  },
  executor: (ctx: { jobId: string; onProgress: (pct: number) => Promise<void> }) => Promise<T>
): Promise<{ queueJobId: string; positionInQueue: number; queueMode: 'postgres' | 'memory'; status: 'queued' }> {
  const { job, positionInQueue, persistence } = await enqueueRenderJob(opts);
  void executeClaimedJob(job, positionInQueue, persistence, opts.waitTimeoutMs || 15 * 60 * 1000, executor).catch((err) => {
    console.error(`[RenderQueue] Falha no job assíncrono ${job.id}:`, err?.message || err);
  });
  return { queueJobId: job.id, positionInQueue, queueMode: persistence, status: 'queued' };
}

export async function getRenderQueueSnapshot(userId?: string, jobId?: string): Promise<RenderQueueSnapshot> {
  const ok = await ensureRenderQueueTable();
  if (!ok) {
    return { job: null, positionInQueue: 0, activeJob: null, queuedCount: 0, recentJobs: [] };
  }
  await recoverStaleRenderJobs();

  let job: RenderJobRecord | null = null;
  let positionInQueue = 0;

  if (jobId) {
    const { rows } = await pool.query(`SELECT * FROM public.render_jobs WHERE id = $1`, [jobId]);
    if (rows[0]) {
      job = normalizeJobRow(rows[0]);
      if (job.status === 'queued') {
        const aheadRes = await pool.query(
          `SELECT COUNT(*)::int AS ahead FROM public.render_jobs WHERE status IN ('running', 'queued') AND seq < $1`,
          [job.seq]
        );
        positionInQueue = Number(aheadRes.rows[0]?.ahead || 0) + 1;
      } else if (job.status === 'running') {
        positionInQueue = 1;
      }
    }
  }

  const activeRes = await pool.query(
    `SELECT id, seq, user_id, engine, kind, title, progress_pct, started_at
     FROM public.render_jobs WHERE status = 'running' ORDER BY seq ASC LIMIT 1`
  );
  const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.render_jobs WHERE status = 'queued'`);
  const recentRes = userId
    ? await pool.query(`SELECT * FROM public.render_jobs WHERE user_id = $1 ORDER BY seq DESC LIMIT 12`, [userId])
    : await pool.query(`SELECT * FROM public.render_jobs ORDER BY seq DESC LIMIT 12`);

  return {
    job,
    positionInQueue,
    activeJob: activeRes.rows[0] || null,
    queuedCount: Number(countRes.rows[0]?.cnt || 0),
    recentJobs: recentRes.rows.map(normalizeJobRow),
  };
}

export async function cancelRenderJob(userId: string, jobId: string): Promise<boolean> {
  const ok = await ensureRenderQueueTable();
  if (!ok) return false;
  const { rowCount } = await pool.query(
    `UPDATE public.render_jobs
     SET status = 'cancelled', error_message = 'Cancelado pelo usuário', finished_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'queued'`,
    [jobId, userId]
  );
  return (rowCount || 0) > 0;
}
