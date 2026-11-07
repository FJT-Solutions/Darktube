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
  publish_status?: string | null
  scheduled_at?: string | null
  published_at?: string | null
  publish_platforms?: string[] | null
  publish_error?: string | null
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

    CREATE TABLE IF NOT EXISTS public.dark_clips_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      clip_id UUID,
      title TEXT,
      rendered_video_url TEXT,
      remodel_data JSONB DEFAULT '{}'::jsonb,
      scheduled_at TIMESTAMPTZ,
      status TEXT DEFAULT 'draft',
      target_accounts JSONB DEFAULT '[]'::jsonb,
      published_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      queue_order INT DEFAULT 0
    );
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

function parsePlatforms(raw: unknown): string[] | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return null
}

export async function listFlowProjects(userId: string): Promise<Omit<FlowProject, 'script'>[]> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(
    `SELECT
       fp.id,
       fp.user_id,
       fp.template_id,
       fp.title,
       fp.params,
       fp.provider,
       CASE
         WHEN dp.status = 'published' THEN 'published'
         WHEN dp.status = 'publishing' THEN 'publishing'
         WHEN dp.status = 'scheduled' THEN 'scheduled'
         WHEN dp.status = 'failed' AND (fp.status IN ('publishing', 'scheduled', 'publish_failed') OR dp.created_at >= fp.updated_at) THEN 'publish_failed'
         ELSE fp.status
       END AS status,
       fp.final_url,
       fp.srt_url,
       fp.assemble_error,
       fp.assembled_at,
       fp.created_at,
       fp.updated_at,
       dp.status AS publish_status,
       dp.scheduled_at,
       dp.published_at,
       dp.target_accounts AS publish_platforms,
       dp.error_message AS publish_error
     FROM public.flow_projects fp
     LEFT JOIN LATERAL (
       SELECT status, scheduled_at, published_at, target_accounts, error_message, created_at
       FROM public.dark_clips_posts d
       WHERE d.user_id = fp.user_id
         AND (
           d.remodel_data->>'flow_project_id' = fp.id::text
           OR (fp.final_url IS NOT NULL AND fp.final_url <> '' AND d.rendered_video_url = fp.final_url)
         )
       ORDER BY d.created_at DESC
       LIMIT 1
     ) dp ON TRUE
     WHERE fp.user_id = $1
     ORDER BY fp.created_at DESC
     LIMIT 100`,
    [userId]
  )
  return rows.map((r: any) => ({
    ...r,
    publish_platforms: parsePlatforms(r.publish_platforms),
  }))
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

/** Post mais recente (dark_clips_posts) criado a partir deste projeto Flow (ou vinculado à mesma URL final). */
export async function getLatestFlowPost(userId: string, projectId: string, finalUrl?: string | null): Promise<any | null> {
  await ensureFlowProjectsTable()
  const { rows } = await pool.query(
    `SELECT * FROM public.dark_clips_posts
      WHERE user_id = $1
        AND (
          remodel_data->>'flow_project_id' = $2
          OR ($3::text IS NOT NULL AND $3::text <> '' AND rendered_video_url = $3::text)
        )
      ORDER BY created_at DESC LIMIT 1`,
    [userId, projectId, finalUrl ?? null]
  )
  return rows[0] ?? null
}

export interface FlowPublishInfo {
  status: string
  error: string | null
  publishedAt: string | null
  scheduledAt: string | null
  platforms: string[]
}

/**
 * O post vai para dark_clips_posts e quem atualiza o resultado e o despachante/scheduler. Aqui o projeto acompanha
 * o post mais recente em tempo real: publicado -> 'published', agendado -> 'scheduled', publicando -> 'publishing',
 * falhou -> 'publish_failed' (com horario e plataformas para exibicao clara na tela).
 */
export async function syncFlowPublishStatus(userId: string, project: FlowProject): Promise<{ project: FlowProject; publish: FlowPublishInfo | null }> {
  const post = await getLatestFlowPost(userId, project.id, project.final_url)
  if (!post) return { project, publish: null }
  const publish: FlowPublishInfo = {
    status: post.status,
    error: post.error_message ?? null,
    publishedAt: post.published_at ?? null,
    scheduledAt: post.scheduled_at ?? null,
    platforms: parsePlatforms(post.target_accounts) ?? [],
  }
  const next =
    post.status === 'published'
      ? 'published'
      : post.status === 'publishing'
        ? 'publishing'
        : post.status === 'scheduled'
          ? 'scheduled'
          : post.status === 'failed'
            ? 'publish_failed'
            : null

  const postNewerThanProject = post.created_at ? new Date(post.created_at).getTime() >= new Date(project.updated_at).getTime() : false
  const canApplyFailed = next === 'publish_failed' && (['publishing', 'scheduled', 'publish_failed'].includes(project.status) || postNewerThanProject)
  const canApplyActive = next === 'published' || next === 'publishing' || next === 'scheduled'

  if (next && next !== project.status && (canApplyActive || canApplyFailed)) {
    const updated = await updateFlowProject(userId, project.id, { status: next })
    return {
      project: {
        ...(updated ?? project),
        publish_status: post.status,
        scheduled_at: publish.scheduledAt,
        published_at: publish.publishedAt,
        publish_platforms: publish.platforms,
        publish_error: publish.error,
      },
      publish,
    }
  }
  return {
    project: {
      ...project,
      publish_status: post.status,
      scheduled_at: publish.scheduledAt,
      published_at: publish.publishedAt,
      publish_platforms: publish.platforms,
      publish_error: publish.error,
    },
    publish,
  }
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
