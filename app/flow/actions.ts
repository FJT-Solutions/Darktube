"use server"

import { getCurrentUser } from "@/lib/auth-helpers"
import { getUserApiKey } from "@/lib/database"
import { getFlowTemplate, TAKE_SECONDS } from "@/lib/flow-templates"
import {
  buildSystemPrompt,
  buildTakePrompt,
  extractJson,
  normalizeScript,
  type FlowParams,
  type FlowScript,
} from "@/lib/flow-script"
import { callFlowLLM, FLOW_PROVIDERS, type FlowProvider } from "@/lib/flow-llm"
import {
  createFlowProject,
  deleteFlowProject,
  getFlowProject,
  listFlowProjects,
  updateFlowProject,
} from "@/lib/flow-projects"
import { createFlowJob, resumeFlowAgent } from "@/lib/flow-jobs"
import { assembleFlowProject } from "@/lib/flow-assemble"
import { getRiskSettings, getRiskUsage, saveRiskSettings, type RiskSettings } from "@/lib/flow-risk"
import { getSocialAccounts } from "@/lib/social-accounts"
import { saveDarkClipPost } from "@/lib/database"
import { isValidVideoUrl, triggerSocialDispatcher } from "@/lib/social-dispatcher"

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autenticado.")
  return user
}

function fail(err: unknown) {
  return { success: false as const, error: err instanceof Error ? err.message : "Erro inesperado." }
}

/** Quais provedores de IA o usuario ja configurou em Credenciais. */
export async function getFlowProvidersAction() {
  try {
    const user = await requireUser()
    const keys = await Promise.all(FLOW_PROVIDERS.map((p) => getUserApiKey(user.id, p)))
    return { success: true as const, providers: FLOW_PROVIDERS.filter((_, i) => !!keys[i]) }
  } catch (err) {
    return fail(err)
  }
}

function cleanParams(raw: Record<string, any>, templateId: string): FlowParams {
  const t = getFlowTemplate(templateId)
  if (!t) throw new Error("Template inválido.")
  const out: FlowParams = {}
  for (const [k, v] of Object.entries(raw || {})) {
    if (typeof v === "string") out[k] = v.slice(0, 900)
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v
  }
  const takes = Math.round(Number(out.takes) || t.defaults.takes)
  out.takes = Math.min(Math.max(takes, 2), 40)
  const seconds = Number(out.seconds) || t.defaults.seconds
  out.seconds = TAKE_SECONDS.includes(seconds) ? seconds : t.defaults.seconds
  out.aspect = out.aspect === "16:9" ? "16:9" : "9:16"
  out.model = String(out.model || t.defaults.model).slice(0, 60)
  out.quality = out.quality === "720p" ? "720p" : "360p"
  return out
}

export async function generateFlowProjectAction(input: { templateId: string; params: Record<string, any>; provider: string }) {
  try {
    const user = await requireUser()
    const t = getFlowTemplate(input.templateId)
    if (!t) throw new Error("Template inválido.")
    if (!FLOW_PROVIDERS.includes(input.provider as FlowProvider)) throw new Error("Provedor de IA inválido.")
    const provider = input.provider as FlowProvider
    const key = await getUserApiKey(user.id, provider)
    const params = cleanParams(input.params, t.id)

    const system = buildSystemPrompt(t, params)
    const text = await callFlowLLM(provider, key, system, "Gere o roteiro agora.")
    const script = normalizeScript(extractJson(text), t, params)
    const project = await createFlowProject({ userId: user.id, templateId: t.id, params, script, provider })
    return { success: true as const, project }
  } catch (err) {
    return fail(err)
  }
}

export async function listFlowProjectsAction() {
  try {
    const user = await requireUser()
    return { success: true as const, projects: await listFlowProjects(user.id) }
  } catch (err) {
    return fail(err)
  }
}

export async function getFlowProjectAction(id: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    return { success: true as const, project }
  } catch (err) {
    return fail(err)
  }
}

export async function saveFlowScriptAction(id: string, script: FlowScript) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, id)
    if (!current) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(current.template_id)
    if (!t) throw new Error("Template inválido.")
    // Revalida a estrutura inteira: o cliente so pode alterar o conteudo, nunca o formato.
    const safe = normalizeScript(script, t, current.params)
    const project = await updateFlowProject(user.id, id, { script: safe })
    return { success: true as const, project }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteFlowProjectAction(id: string) {
  try {
    const user = await requireUser()
    return { success: await deleteFlowProject(user.id, id) }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Manda os takes para a fila do Flow, na ordem. A extensao pega um por vez, do mais antigo
 * para o mais novo, entao a ordem de criacao ja garante a ordem das cenas.
 */
export async function queueFlowProjectAction(id: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(project.template_id)
    if (!t) throw new Error("Template inválido.")

    const created = []
    for (const take of project.script.takes) {
      const job = await createFlowJob({
        userId: user.id,
        kind: "video",
        prompt: buildTakePrompt(project.script, take, project.params, t.mode),
        params: {
          aspectRatio: String(project.params.aspect),
          duration: take.seconds,
          resolution: String(project.params.quality),
          model: String(project.params.model),
        },
        projectId: project.id,
        takeIndex: take.n,
        role: "take",
        deadlineMinutes: 60 * 12,
      })
      created.push(job.id)
    }
    await updateFlowProject(user.id, id, { status: "queued" })
    return { success: true as const, queued: created.length }
  } catch (err) {
    return fail(err)
  }
}

/** Gera a versao final (720p) so dos takes aprovados. Os rascunhos continuam guardados. */
export async function regenerateFinalAction(id: string, takeNumbers: number[]) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(project.template_id)
    if (!t) throw new Error("Template inválido.")
    const wanted = new Set(takeNumbers.map((n) => Math.round(Number(n))))
    const takes = project.script.takes.filter((k) => wanted.has(k.n))
    if (takes.length === 0) throw new Error("Escolha pelo menos um take.")
    for (const take of takes) {
      await createFlowJob({
        userId: user.id,
        kind: "video",
        prompt: buildTakePrompt(project.script, take, project.params, t.mode),
        params: { aspectRatio: String(project.params.aspect), duration: take.seconds, resolution: "720p", model: String(project.params.model) },
        projectId: project.id,
        takeIndex: take.n,
        role: "take_final",
        deadlineMinutes: 60 * 12,
      })
    }
    return { success: true as const, queued: takes.length }
  } catch (err) {
    return fail(err)
  }
}

/** Monta o video final em segundo plano. A tela acompanha pelo status do projeto. */
export async function assembleFlowProjectAction(id: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    const busy = project.status === "assembling" && Date.now() - new Date(project.updated_at).getTime() < 15 * 60 * 1000
    if (busy) throw new Error("A montagem já está em andamento.")
    assembleFlowProject(user.id, id).catch((e) => console.error("[Flow] montagem falhou:", e?.message))
    return { success: true as const }
  } catch (err) {
    return fail(err)
  }
}

export async function listFlowAccountsAction() {
  try {
    const user = await requireUser()
    const all = await getSocialAccounts(user.id)
    return {
      success: true as const,
      accounts: all
        .filter((a) => a.connected && !a.expired)
        .map((a) => ({ id: a.id, platform: a.platform, name: a.name })),
    }
  } catch (err) {
    return fail(err)
  }
}

export async function getFlowRiskAction() {
  try {
    const user = await requireUser()
    const settings = await getRiskSettings(user.id)
    return { success: true as const, settings, usage: await getRiskUsage(user.id, settings) }
  } catch (err) {
    return fail(err)
  }
}

export async function saveFlowRiskAction(patch: Partial<RiskSettings>) {
  try {
    const user = await requireUser()
    const settings = await saveRiskSettings(user.id, patch)
    return { success: true as const, settings, usage: await getRiskUsage(user.id, settings) }
  } catch (err) {
    return fail(err)
  }
}

export async function resumeFlowAgentAction() {
  try {
    const user = await requireUser()
    await resumeFlowAgent(user.id)
    return { success: true as const }
  } catch (err) {
    return fail(err)
  }
}

/** Publica agora ou agenda o video final nas contas escolhidas, pelo despachante que ja existe. */
export async function publishFlowProjectAction(
  id: string,
  input: { accounts: Record<string, string>; scheduledAt?: string; dispatchNow: boolean }
) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    if (!isValidVideoUrl(project.final_url)) throw new Error("Monte o vídeo final antes de publicar.")

    const connected = await getSocialAccounts(user.id)
    const accounts: Record<string, string> = {}
    for (const [platform, accId] of Object.entries(input.accounts || {})) {
      const acc = connected.find((a) => a.platform === platform && a.id === accId && a.connected && !a.expired)
      if (acc) accounts[platform] = acc.id
    }
    const platforms = Object.keys(accounts)
    if (platforms.length === 0) throw new Error("Escolha pelo menos uma conta conectada.")

    const settings = await getRiskSettings(user.id)
    const usage = await getRiskUsage(user.id, settings)
    const overPosts = usage.posts24h >= settings.postsPerDay
    if (overPosts && !settings.riskMode) {
      throw new Error(
        `Você já tem ${usage.posts24h} postagens nas últimas 24 horas (recomendado: ${settings.postsPerDay}). Ative o modo de risco para postar acima disso.`
      )
    }

    let scheduledAt = new Date().toISOString()
    if (!input.dispatchNow) {
      const when = input.scheduledAt ? new Date(input.scheduledAt) : null
      if (!when || Number.isNaN(when.getTime())) throw new Error("Informe a data e a hora do agendamento.")
      if (when.getTime() < Date.now() - 60_000) throw new Error("O horário do agendamento já passou.")
      scheduledAt = when.toISOString()
    }

    const seo = project.script.seo
    const post = await saveDarkClipPost({
      user_id: user.id,
      title: seo.title || project.script.title,
      rendered_video_url: project.final_url as string,
      remodel_data: {
        post_caption: [seo.caption, seo.hook].filter(Boolean).join("\n\n"),
        hashtags: seo.hashtags,
        flow_project_id: project.id,
        dispatch_now: input.dispatchNow,
        selected_accounts_by_platform: accounts,
      } as any,
      scheduled_at: scheduledAt,
      status: input.dispatchNow ? "publishing" : "scheduled",
      target_accounts: platforms,
    })

    if (input.dispatchNow) {
      await triggerSocialDispatcher({ post, videoUrl: post.rendered_video_url, targetAccounts: platforms, title: post.title, accountMap: accounts })
    } else {
      try {
        const { checkDueScheduledPosts } = await import("@/lib/dark-clips-scheduler")
        checkDueScheduledPosts().catch(() => {})
      } catch {}
    }
    await updateFlowProject(user.id, id, { status: input.dispatchNow ? "publishing" : "scheduled" })
    return { success: true as const, postId: post.id, warning: overPosts ? "Acima do limite recomendado de postagens: risco de bloqueio nas redes." : undefined }
  } catch (err) {
    return fail(err)
  }
}
