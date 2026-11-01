import { pool } from '@/lib/db-client'
import type { FlowScript, FlowParams } from '@/lib/flow-script'

export interface FlowProject {
  id: string
  user_id: string
  template_id: string
  title: string
  params: FlowParams
  script: FlowScript
  provider: string
  status: string
  final_url: string | null
  srt_url: string | null
  assemble_error: string | null
  assembled_at: string | null
  created_at: string
  updated_at: string
}

let ready = false

export async function ensureFlowProjectsTable() {
  if (ready) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.flow_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      script JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.flow_projects ADD COLUMN IF NOT EXISTS final_url TEXT;
    ALTER TABLE public.flow_projects ADD COLUMN IF NOT EXISTS srt_url TEXT;
    ALTER TABLE public.flow_projects ADD COLUMN IF NOT EXISTS assemble_error TEXT;
    ALTER TABLE public.flow_projects ADD COLUMN IF NOT EXISTS assembled_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS flow_projects_user_idx ON public.flow_projects (user_id, created_at DESC);
  `)
  ready = true
}

export async function createFlowProject(input: {
  userId: string
  templateId: string
  params: FlowParams
  script: FlowScript
  provider: string
}): Promise<FlowProject> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(
    `INSERT INTO public.flow_projects (user_id, template_id, title, params, script, provider)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.userId, input.templateId, input.script.title, JSON.stringify(input.params), JSON.stringify(input.script), input.provider]
  )
  return rows[0]
}

export async function listFlowProjects(userId: string): Promise<Omit<FlowProject, 'script'>[]> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(
    `SELECT id, user_id, template_id, title, params, provider, status, created_at, updated_at
       FROM public.flow_projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  )
  return rows
}

export async function getFlowProject(userId: string, id: string): Promise<FlowProject | null> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(`SELECT * FROM public.flow_projects WHERE id = $1 AND user_id = $2`, [id, userId])
  return rows[0] ?? null
}

export async function updateFlowProject(
  userId: string,
  id: string,
  patch: { script?: FlowScript; params?: FlowParams; status?: string }
): Promise<FlowProject | null> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(
    `UPDATE public.flow_projects
        SET script = COALESCE($3, script),
            params = COALESCE($4, params),
            status = COALESCE($5, status),
            title = COALESCE($6, title),
            updated_at = NOW()
      WHERE id = $1 AND user_id = $2 RETURNING *`,
    [
      id,
      userId,
      patch.script ? JSON.stringify(patch.script) : null,
      patch.params ? JSON.stringify(patch.params) : null,
      patch.status ?? null,
      patch.script?.title ?? null,
    ]
  )
  return rows[0] ?? null
}

export async function deleteFlowProject(userId: string, id: string): Promise<boolean> {
  await ensureFlowProjectsTable()
  const res = await pool.query(`DELETE FROM public.flow_projects WHERE id = $1 AND user_id = $2`, [id, userId])
  return (res.rowCount ?? 0) > 0
}

/** Post mais recente (dark_clips_posts) criado a partir deste projeto Flow. */
export async function getLatestFlowPost(userId: string, projectId: string): Promise<any | null> {
  const { rows } = await pool.query(
    `SELECT * FROM public.dark_clips_posts
      WHERE user_id = $1 AND remodel_data->>'flow_project_id' = $2
      ORDER BY created_at DESC LIMIT 1`,
    [userId, projectId]
  )
  return rows[0] ?? null
}

export interface FlowPublishInfo {
  status: string
  error: string | null
  publishedAt: string | null
}

/**
 * O post vai para dark_clips_posts e quem atualiza o resultado e o despachante. Aqui o projeto acompanha
 * o post mais recente: publicado -> 'published', falhou -> 'publish_failed' (o erro vem junto para a tela).
 */
export async function syncFlowPublishStatus(userId: string, project: FlowProject): Promise<{ project: FlowProject; publish: FlowPublishInfo | null }> {
  const post = await getLatestFlowPost(userId, project.id)
  if (!post) return { project, publish: null }
  const publish: FlowPublishInfo = { status: post.status, error: post.error_message ?? null, publishedAt: post.published_at ?? null }
  const next = post.status === 'published' ? 'published' : post.status === 'failed' ? 'publish_failed' : null
  if (next && next !== project.status && (project.status === 'publishing' || project.status === 'scheduled' || project.status === 'publish_failed')) {
    const updated = await updateFlowProject(userId, project.id, { status: next })
    return { project: updated ?? project, publish }
  }
  return { project, publish }
}

export async function setFlowProjectAssembly(
  userId: string,
  id: string,
  v: { status: string; finalUrl?: string | null; srtUrl?: string | null; error?: string | null }
) {
  await ensureFlowProjectsTable()
  await pool.query(
    `UPDATE public.flow_projects
        SET status = $3,
            final_url = COALESCE($4, final_url),
            srt_url = COALESCE($5, srt_url),
            assemble_error = $6,
            assembled_at = CASE WHEN $3 = 'assembled' THEN NOW() ELSE assembled_at END,
            updated_at = NOW()
      WHERE id = $1 AND user_id = $2`,
    [id, userId, v.status, v.finalUrl ?? null, v.srtUrl ?? null, v.error ?? null]
  )
}
