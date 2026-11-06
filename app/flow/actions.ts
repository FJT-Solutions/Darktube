"use server"

import fs from "fs"
import path from "path"
import os from "os"
import { getCurrentUser } from "@/lib/auth-helpers"
import { getUserApiKey } from "@/lib/database"
import { getFlowTemplate, MAX_TAKES, TAKE_SECONDS, clampSecondsForModel } from "@/lib/flow-templates"
import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildTakePrompt,
  carryOverPart,
  summarizeForNextPart,
  takeReference,
  extractJson,
  normalizeScript,
  validateScript,
  type FlowParams,
  type FlowScript,
} from "@/lib/flow-script"
import { callFlowLLM, FLOW_PROVIDERS, type FlowProvider } from "@/lib/flow-llm"
import {
  createFlowProject,
  deleteFlowProject,
  getFlowProject,
  getLatestFlowPost,
  listFlowProjects,
  syncFlowPublishStatus,
  updateFlowProject,
} from "@/lib/flow-projects"
import {
  buildCastPrompt,
  buildSheetPrompt,
  getLibraryCharacter,
  isVoiceOnlyCharacter,
  listFlowLibrary,
  saveToLibrary,
} from "@/lib/flow-characters"
import {
  cancelFlowJob,
  createFlowJob,
  holdProjectTakesForApproval,
  listFlowJobs,
  resumeFlowAgent,
  syncProjectQueuedJobsWithReferences,
} from "@/lib/flow-jobs"
import { assembleFlowProject } from "@/lib/flow-assemble"
import { replaceProjectAudio } from "@/lib/flow-audio-replace"
import { getRiskSettings, getRiskUsage, saveRiskSettings, type RiskSettings } from "@/lib/flow-risk"
import { getSocialAccounts } from "@/lib/social-accounts"
import { deleteDarkClipPost, saveDarkClipPost, updateDarkClipPostStatus } from "@/lib/database"
import { isValidVideoUrl, triggerSocialDispatcher } from "@/lib/social-dispatcher"
import { getUserCredits, setUserCredits, simulateCredits, type SimulationResult } from "@/lib/flow-credits"

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
    if (typeof v === "string") out[k] = v.slice(0, k === "roteiro" || k === "parteAnterior" ? 8000 : 900)
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v
  }
  const takes = Math.round(Number(out.takes) || t.defaults.takes)
  out.takes = Math.min(Math.max(takes, 1), MAX_TAKES)
  out.model = String(out.model || t.defaults.model).slice(0, 60)
  const seconds = Number(out.seconds) || t.defaults.seconds
  out.seconds = clampSecondsForModel(seconds, out.model)
  out.aspect = out.aspect === "16:9" ? "16:9" : "9:16"
  out.quality = out.quality === "720p" ? "720p" : "360p"
  out.refImages = out.refImages === "0" ? "0" : "1"
  out.refPrevVideo =
    out.refPrevVideo === "1" || out.refPrevVideo === "0"
      ? out.refPrevVideo
      : t.mode === "dialogo"
        ? "1"
        : "0"
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

    const { script, issues } = await writeFlowScript(provider, key, t, params)
    const project = await createFlowProject({ userId: user.id, templateId: t.id, params, script, provider })
    return { success: true as const, project, issues: issues.map((i) => i.message) }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Pede o roteiro a IA e confere contra as regras do formato (e os limites do Flow); se houver erro, pede correcao
 * a mesma IA, ate 2 vezes, para o roteiro ja chegar pronto e o usuario nao precisar editar take por take.
 */
async function writeFlowScript(provider: FlowProvider, key: string, t: NonNullable<ReturnType<typeof getFlowTemplate>>, params: FlowParams, adjust?: (s: FlowScript) => FlowScript) {
  const fix = adjust ?? ((s: FlowScript) => s)
  const system = buildSystemPrompt(t, params)
  const text = await callFlowLLM(provider, key, system, "Gere o roteiro agora.")
  let script = fix(normalizeScript(extractJson(text), t, params))
  let issues = validateScript(script, t, params)
  for (let round = 0; round < 2 && issues.some((i) => i.level === "erro"); round++) {
    try {
      const fixed = await callFlowLLM(provider, key, system, buildRepairPrompt(script, issues.filter((i) => i.level === "erro")))
      const repaired = fix(normalizeScript(extractJson(fixed), t, params))
      const after = validateScript(repaired, t, params)
      if (after.filter((i) => i.level === "erro").length > issues.filter((i) => i.level === "erro").length) break
      script = repaired
      issues = after
    } catch {
      break /* fica com a versao atual; os problemas aparecem como aviso */
    }
  }
  return { script, issues }
}

/**
 * Cria a proxima parte (Parte 2, 3...) de um projeto: mesmo template e configuracoes, a IA continua de onde a parte
 * anterior parou, e personagens, retratos aprovados e voz do narrador vem junto (sem gerar retrato de novo).
 */
export async function createNextPartAction(projectId: string) {
  try {
    const user = await requireUser()
    const prev = await getFlowProject(user.id, projectId)
    if (!prev) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(prev.template_id)
    if (!t) throw new Error("Template inválido.")
    const provider = (FLOW_PROVIDERS.includes(prev.provider as FlowProvider) ? prev.provider : FLOW_PROVIDERS[0]) as FlowProvider
    const key = await getUserApiKey(user.id, provider)
    const part = (Number(prev.params.parte) || 1) + 1
    const params = cleanParams({ ...prev.params, parte: part, parteAnterior: summarizeForNextPart(prev.script), roteiro: "" }, t.id)

    const { script, issues } = await writeFlowScript(provider, key, t, params, (s) => carryOverPart(prev.script, s))
    const project = await createFlowProject({ userId: user.id, templateId: t.id, params, script, provider })
    return { success: true as const, project, part, issues: issues.map((i) => i.message) }
  } catch (err) {
    return fail(err)
  }
}

/** Modo Livre sem IA: cria o projeto com takes vazios para o usuario escrever take por take. */
export async function createBlankFlowProjectAction(input: { params: Record<string, any> }) {
  try {
    const user = await requireUser()
    const t = getFlowTemplate("livre")
    if (!t) throw new Error("Template inválido.")
    const params = cleanParams(input.params, t.id)
    const n = Number(params.takes) || t.defaults.takes
    const seconds = Number(params.seconds) || t.defaults.seconds
    const kind = ["dialogo", "narracao", "ambiente"].includes(String(params.tipo)) ? String(params.tipo) : "dialogo"
    const script = normalizeScript(
      {
        title: String(params.tema || "").trim().slice(0, 80) || "Projeto livre",
        characters: [],
        locations: [{ id: "l1", name: "Local 1", description: "" }],
        takes: Array.from({ length: n }, () => ({ seconds, kind, speaker: kind === "narracao" ? "narrator" : "", line: "", action: "", camera: "", sound: "", location: "l1", characters: [] })),
        seo: {},
      },
      t,
      params
    )
    const project = await createFlowProject({ userId: user.id, templateId: t.id, params, script, provider: "manual" })
    return { success: true as const, project }
  } catch (err) {
    return fail(err)
  }
}

/** Confere o roteiro atual (avisos na tela, inclusive no modo Livre). */
export async function checkFlowScriptAction(id: string) {
  try {
    const user = await requireUser()
    const p = await getFlowProject(user.id, id)
    if (!p) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(p.template_id)
    if (!t) throw new Error("Template inválido.")
    return { success: true as const, issues: validateScript(normalizeScript(p.script, t, p.params), t, p.params) }
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
    const found = await getFlowProject(user.id, id)
    if (!found) throw new Error("Projeto não encontrado.")
    const { project, publish } = await syncFlowPublishStatus(user.id, found)
    return { success: true as const, project, publish }
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
    // No modo Livre o usuario escreve os takes: sem acao descrita o Flow nao tem o que gerar.
    const empty = project.script.takes.filter((k) => !k.action.trim()).map((k) => k.n)
    if (empty.length) throw new Error(`Descreva a ação (o que acontece na cena) dos takes: ${empty.join(", ")}.`)

    const created = []
    for (const take of project.script.takes) {
      // Referencias aprovadas (folha do personagem ou do elenco) e o take anterior como video de continuidade.
      const ref = takeReference(project.script, take, project.params)
      const job = await createFlowJob({
        userId: user.id,
        kind: "video",
        prompt: buildTakePrompt(project.script, take, project.params, t, ref),
        params: {
          aspectRatio: String(project.params.aspect),
          duration: take.seconds,
          resolution: String(project.params.quality),
          model: take.model || String(project.params.model),
          ...(ref.refImageUrl ? { refImageUrl: ref.refImageUrl } : {}),
          ...(ref.refPrevVideo ? { refPrevVideo: true } : {}),
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
    const finalRef = (take: (typeof takes)[number]) => takeReference(project.script, take, { ...project.params, refPrevVideo: "0" })
    for (const take of takes) {
      await createFlowJob({
        userId: user.id,
        kind: "video",
        // 720p usa a mesma folha de referencia (o video do take anterior fica so nos rascunhos).
        prompt: buildTakePrompt(project.script, take, project.params, t, finalRef(take)),
        params: { aspectRatio: String(project.params.aspect), duration: take.seconds, resolution: "720p", model: take.model || String(project.params.model), ...(finalRef(take).refImageUrl ? { refImageUrl: finalRef(take).refImageUrl } : {}) },
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
export async function assembleFlowProjectAction(id: string, options?: { wordsPerCaption?: number }) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    const busy = project.status === "assembling" && Date.now() - new Date(project.updated_at).getTime() < 15 * 60 * 1000
    if (busy) throw new Error("A montagem já está em andamento.")
    if (options?.wordsPerCaption) {
      await updateFlowProject(user.id, id, { params: { ...project.params, wordsPerCaption: options.wordsPerCaption } })
    }
    assembleFlowProject(user.id, id).catch((e) => console.error("[Flow] montagem falhou:", e?.message))
    return { success: true as const }
  } catch (err) {
    return fail(err)
  }
}

/** Substitui o áudio/voz de um projeto montado por um áudio enviado pelo usuário, remontando sobre takes limpos e queimando novas legendas Whisper. */
export async function replaceFlowAudioAction(projectId: string, formData: FormData) {
  try {
    const user = await requireUser()
    const file = formData.get("audio") as File | null
    if (!file) throw new Error("Arquivo de áudio não enviado.")

    const lipsync = formData.get("lipsync") === "true"

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = path.extname(file.name) || ".webm"
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-user-audio-"))
    const tmpAudioPath = path.join(tmpDir, `input_${Date.now()}${ext}`)
    fs.writeFileSync(tmpAudioPath, buffer)

    try {
      const result = await replaceProjectAudio({
        userId: user.id,
        projectId,
        audioInput: tmpAudioPath,
        lipsync,
        updateProject: true,
      })

      return {
        success: true as const,
        finalUrl: result.finalUrl,
        srtUrl: result.srtUrl,
        burned: result.burned,
        lipsyncApplied: result.lipsyncApplied,
      }
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    }
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
  input: { accounts: Record<string, string>; scheduledAt?: string; dispatchNow: boolean; facebookPageId?: string }
) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    if (!isValidVideoUrl(project.final_url)) throw new Error("Monte o vídeo final antes de publicar.")

    // Trava de seguranca anti-duplicacao / idempotencia: impede cliques multiplos concorrentes
    if (project.status === "publishing") {
      const updatedAt = new Date(project.updated_at).getTime()
      if (Date.now() - updatedAt < 5 * 60 * 1000) {
        throw new Error("Este projeto já está sendo publicado no momento. Aguarde a confirmação das redes.")
      }
    }

    const latestPost = await getLatestFlowPost(user.id, id)
    if (latestPost && latestPost.status === "publishing") {
      const postAge = Date.now() - new Date(latestPost.created_at).getTime()
      if (postAge < 5 * 60 * 1000) {
        throw new Error("Já existe uma publicação em andamento para este vídeo. Aguarde a conclusão.")
      }
    }

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
        facebook_page_id: accounts.facebook ? input.facebookPageId || undefined : undefined,
        selected_accounts_by_platform: accounts,
      } as any,
      scheduled_at: scheduledAt,
      status: input.dispatchNow ? "publishing" : "scheduled",
      target_accounts: platforms,
    })

    if (input.dispatchNow) {
      await triggerSocialDispatcher({
        post,
        videoUrl: post.rendered_video_url,
        targetAccounts: platforms,
        title: post.title,
        accountMap: accounts,
        facebookPageId: accounts.facebook ? input.facebookPageId || undefined : undefined,
      })
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

// Reenvia a ultima publicacao do projeto que falhou (mesmas contas, pagina e legenda).
export async function retryFlowPublishAction(id: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, id)
    if (!project) throw new Error("Projeto não encontrado.")
    const post = await getLatestFlowPost(user.id, id)
    if (!post) throw new Error("Nenhuma publicação encontrada para este projeto.")
    if (post.status !== "failed") throw new Error("Só dá para reenviar uma publicação que falhou.")
    const remodel = typeof post.remodel_data === "string" ? JSON.parse(post.remodel_data) : post.remodel_data || {}
    await updateDarkClipPostStatus(post.id, "publishing")
    await updateFlowProject(user.id, id, { status: "publishing" })
    const targets: string[] = typeof post.target_accounts === "string" ? JSON.parse(post.target_accounts) : post.target_accounts || []
    await triggerSocialDispatcher({
      post: { ...post, status: "publishing", remodel_data: remodel },
      videoUrl: post.rendered_video_url,
      targetAccounts: targets,
      title: post.title,
      accountMap: remodel.selected_accounts_by_platform,
      facebookPageId: remodel.facebook_page_id || undefined,
    })
    return { success: true as const }
  } catch (err) {
    return fail(err)
  }
}

// Exclui a ultima publicacao que falhou e devolve o projeto para "montado", pronto para publicar de novo.
export async function deleteFlowPublishAction(id: string) {
  try {
    const user = await requireUser()
    const post = await getLatestFlowPost(user.id, id)
    if (!post) throw new Error("Nenhuma publicação encontrada para este projeto.")
    if (post.status !== "failed") throw new Error("Só dá para excluir uma publicação que falhou.")
    await deleteDarkClipPost(post.id)
    await updateFlowProject(user.id, id, { status: "assembled" })
    return { success: true as const }
  } catch (err) {
    return fail(err)
  }
}

export async function generateCharacterSheetAction(projectId: string, characterId: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, projectId)
    if (!project) throw new Error("Projeto não encontrado.")
    const c = project.script.characters.find((x) => x.id === characterId)
    if (!c) throw new Error("Personagem não encontrado.")
    if (isVoiceOnlyCharacter(c)) throw new Error("Narradores e vozes off-screen não precisam de imagem de referência.")
    if (!c.description.trim()) throw new Error("Preencha a descrição do personagem antes de gerar a folha.")

    await holdProjectTakesForApproval(user.id, project.id)

    const job = await createFlowJob({
      userId: user.id,
      kind: "image",
      prompt: buildSheetPrompt(c, String(project.params.realismo || "")),
      params: { aspectRatio: "16:9", model: "Nano Banana Pro", characterId },
      projectId: project.id,
      role: "character_sheet",
    })

    const nextScript: FlowScript = {
      ...project.script,
      characters: project.script.characters.map((x) =>
        x.id === characterId ? { ...x, sheetStatus: "gerando" } : x
      ),
    }
    const updated = await updateFlowProject(user.id, project.id, { script: nextScript })
    return { success: true as const, project: updated ?? { ...project, script: nextScript }, jobId: job.id }
  } catch (err) {
    return fail(err)
  }
}

export async function generateCastSheetAction(projectId: string) {
  try {
    const user = await requireUser()
    const project = await getFlowProject(user.id, projectId)
    if (!project) throw new Error("Projeto não encontrado.")
    const chars = project.script.characters
    if (chars.length < 2) throw new Error("Adicione pelo menos 2 personagens para gerar a folha do elenco.")
    if (chars.some((c) => !c.description.trim())) {
      throw new Error("Preencha a descrição de todos os personagens antes de gerar a folha do elenco.")
    }

    await holdProjectTakesForApproval(user.id, project.id)

    const job = await createFlowJob({
      userId: user.id,
      kind: "image",
      prompt: buildCastPrompt(chars, String(project.params.realismo || "")),
      params: { aspectRatio: "16:9", model: "Nano Banana Pro" },
      projectId: project.id,
      role: "cast_sheet",
    })

    const nextScript: FlowScript = {
      ...project.script,
      castSheetStatus: "gerando",
    }
    const updated = await updateFlowProject(user.id, project.id, { script: nextScript })
    return { success: true as const, project: updated ?? { ...project, script: nextScript }, jobId: job.id }
  } catch (err) {
    return fail(err)
  }
}

export async function syncSheetsAction(projectId: string) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")
    const jobs = await listFlowJobs(user.id, 200, projectId)
    const script: FlowScript = JSON.parse(JSON.stringify(current.script))
    let changed = false

    const charSheetJobs = jobs.filter((j) => j.role === "character_sheet" && j.status !== "cancelled")
    const generatingChars = script.characters.filter((x) => x.sheetStatus === "gerando")
    const sheetErrors: Record<string, string> = {}

    for (const c of script.characters) {
      if (c.sheetStatus === "aprovada") continue
      const expectedPrompt = buildSheetPrompt(c, String(current.params?.realismo || ""))
      const matching = charSheetJobs.filter(
        (j) => (j.params as any)?.characterId === c.id || j.prompt === expectedPrompt
      )
      let latest = matching[matching.length - 1]
      if (!latest && c.sheetStatus === "gerando" && generatingChars.length === 1) {
        latest = charSheetJobs[charSheetJobs.length - 1]
      }
      // A folha deu erro (job em rascunho): destrava o card em vez de deixar "Gerando no Flow..." para sempre.
      if (latest && latest.status === "draft" && c.sheetStatus === "gerando") {
        sheetErrors[c.id] = latest.error_message || "O Flow não gerou a folha."
        c.sheetStatus = c.sheetUrl ? "aguardando" : undefined
        changed = true
        continue
      }
      if (!latest || latest.status !== "done" || !latest.result_url) continue
      if (!c.sheetStatus && !c.sheetUrl && latest.finished_at && new Date(latest.finished_at).getTime() < new Date(current.updated_at).getTime()) {
        continue
      }
      if (c.sheetUrl !== latest.result_url || c.sheetStatus !== "aguardando") {
        c.sheetUrl = latest.result_url
        c.sheetStatus = "aguardando"
        changed = true
      }
    }

    if (script.castSheetStatus !== "aprovada") {
      const castJobs = jobs.filter((j) => j.role === "cast_sheet" && j.status !== "cancelled")
      const latestCast = castJobs[castJobs.length - 1]
      if (latestCast && latestCast.status === "done" && latestCast.result_url) {
        const clearedAfter =
          !script.castSheetStatus &&
          !script.castSheetUrl &&
          latestCast.finished_at &&
          new Date(latestCast.finished_at).getTime() < new Date(current.updated_at).getTime()
        if (!clearedAfter && (script.castSheetUrl !== latestCast.result_url || script.castSheetStatus !== "aguardando")) {
          script.castSheetUrl = latestCast.result_url
          script.castSheetStatus = "aguardando"
          changed = true
        }
      }
    }

    // O mesmo para a folha do elenco.
    if (script.castSheetStatus === "gerando") {
      const castJobs = jobs.filter((j) => j.role === "cast_sheet" && j.status !== "cancelled")
      const lastCast = castJobs[castJobs.length - 1]
      if (lastCast && lastCast.status === "draft") {
        sheetErrors["cast"] = lastCast.error_message || "O Flow não gerou a folha do elenco."
        script.castSheetStatus = script.castSheetUrl ? "aguardando" : undefined
        changed = true
      }
    }

    const project = changed ? (await updateFlowProject(user.id, projectId, { script })) ?? { ...current, script } : current
    return { success: true as const, project, sheetErrors }
  } catch (err) {
    return fail(err)
  }
}

export async function approveSheetAction(projectId: string, target: string) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")

    let nextScript: FlowScript
    if (target === "cast") {
      if (!current.script.castSheetUrl) throw new Error("Nenhuma folha do elenco para aprovar.")
      nextScript = { ...current.script, castSheetStatus: "aprovada" }
    } else {
      const c = current.script.characters.find((x) => x.id === target)
      if (!c || !c.sheetUrl) throw new Error("Nenhuma folha do personagem para aprovar.")
      nextScript = {
        ...current.script,
        characters: current.script.characters.map((x) =>
          x.id === target ? { ...x, sheetStatus: "aprovada" } : x
        ),
      }
    }
    const project = await updateFlowProject(user.id, projectId, { script: nextScript })
    await syncProjectQueuedJobsWithReferences(user.id, projectId, nextScript, current.params, current.template_id)
    return { success: true as const, project: project ?? { ...current, script: nextScript } }
  } catch (err) {
    return fail(err)
  }
}

export async function clearSheetAction(projectId: string, target: string) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")

    const jobs = await listFlowJobs(user.id, 200, projectId)
    let nextScript: FlowScript
    if (target === "cast") {
      for (const j of jobs) {
        if (j.role === "cast_sheet" && (j.status === "queued" || j.status === "running")) {
          await cancelFlowJob(user.id, j.id)
        }
      }
      const copy: FlowScript = { ...current.script }
      delete copy.castSheetUrl
      delete copy.castSheetStatus
      nextScript = copy
    } else {
      const c = current.script.characters.find((x) => x.id === target)
      if (!c) throw new Error("Personagem não encontrado.")
      const expectedPrompt = buildSheetPrompt(c, String(current.params?.realismo || ""))
      for (const j of jobs) {
        if (
          j.role === "character_sheet" &&
          (j.status === "queued" || j.status === "running") &&
          ((j.params as any)?.characterId === target || j.prompt === expectedPrompt)
        ) {
          await cancelFlowJob(user.id, j.id)
        }
      }
      nextScript = {
        ...current.script,
        characters: current.script.characters.map((x) => {
          if (x.id !== target) return x
          const copy = { ...x }
          delete copy.sheetUrl
          delete copy.sheetStatus
          return copy
        }),
      }
    }
    const project = await updateFlowProject(user.id, projectId, { script: nextScript })
    await syncProjectQueuedJobsWithReferences(user.id, projectId, nextScript, current.params, current.template_id)
    return { success: true as const, project: project ?? { ...current, script: nextScript } }
  } catch (err) {
    return fail(err)
  }
}

export async function saveCharacterToLibraryAction(projectId: string, characterId: string) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")
    const c = current.script.characters.find((x) => x.id === characterId)
    if (!c) throw new Error("Personagem não encontrado.")

    const saved = await saveToLibrary(user.id, c)
    const nextScript: FlowScript = {
      ...current.script,
      characters: current.script.characters.map((x) =>
        x.id === characterId ? { ...x, libraryId: saved.id } : x
      ),
    }
    const project = await updateFlowProject(user.id, projectId, { script: nextScript })
    return {
      success: true as const,
      character: saved,
      project: project ?? { ...current, script: nextScript },
    }
  } catch (err) {
    return fail(err)
  }
}

export async function useLibraryCharacterAction(projectId: string, characterId: string, libraryId: string) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")
    const libChar = await getLibraryCharacter(user.id, libraryId)
    if (!libChar) throw new Error("Personagem da biblioteca não encontrado.")

    const nextScript: FlowScript = {
      ...current.script,
      characters: current.script.characters.map((x) => {
        if (x.id !== characterId) return x
        const next = {
          ...x,
          name: libChar.name,
          description: libChar.description,
          voice: libChar.voice,
          libraryId: libChar.id,
        }
        if (libChar.sheet_url) {
          next.sheetUrl = libChar.sheet_url
          next.sheetStatus = "aprovada"
        } else {
          delete next.sheetUrl
          delete next.sheetStatus
        }
        return next
      }),
    }
    const project = await updateFlowProject(user.id, projectId, { script: nextScript })
    await syncProjectQueuedJobsWithReferences(user.id, projectId, nextScript, current.params, current.template_id)
    return { success: true as const, project: project ?? { ...current, script: nextScript } }
  } catch (err) {
    return fail(err)
  }
}

export async function listFlowLibraryAction() {
  try {
    const user = await requireUser()
    const characters = await listFlowLibrary(user.id)
    return { success: true as const, characters }
  } catch (err) {
    return fail(err)
  }
}

export async function saveFlowRefOptionsAction(
  projectId: string,
  input: { refImages?: string | boolean; refPrevVideo?: string | boolean }
) {
  try {
    const user = await requireUser()
    const current = await getFlowProject(user.id, projectId)
    if (!current) throw new Error("Projeto não encontrado.")
    const t = getFlowTemplate(current.template_id)
    const defaultPrev = t?.mode === "dialogo" ? "1" : "0"
    const nextParams: FlowParams = {
      ...current.params,
      refImages:
        input.refImages !== undefined
          ? input.refImages === "0" || input.refImages === false
            ? "0"
            : "1"
          : String(current.params.refImages ?? "1") === "0"
            ? "0"
            : "1",
      refPrevVideo:
        input.refPrevVideo !== undefined
          ? input.refPrevVideo === "1" || input.refPrevVideo === true
            ? "1"
            : "0"
          : String(current.params.refPrevVideo ?? defaultPrev) === "1"
            ? "1"
            : "0",
    }
    const project = await updateFlowProject(user.id, projectId, { params: nextParams })
    return { success: true as const, project: project ?? { ...current, params: nextParams } }
  } catch (err) {
    return fail(err)
  }
}

/** Obtém o saldo de créditos do usuário logado */
export async function getUserCreditsAction() {
  try {
    const user = await requireUser()
    const credits = await getUserCredits(user.id)
    return { success: true as const, credits }
  } catch (err) {
    return fail(err)
  }
}

/** Atualiza o saldo de créditos do usuário logado */
export async function setUserCreditsAction(credits: number) {
  try {
    const user = await requireUser()
    const updated = await setUserCredits(user.id, credits)
    return { success: true as const, credits: updated }
  } catch (err) {
    return fail(err)
  }
}

/** Simula quantos vídeos podem ser produzidos com base nos créditos, modelo e segundos por take */
export async function simulateCreditsAction(input: {
  credits?: number
  model: string
  secondsPerTake: number
  takesCount: number
  isHybrid?: boolean
}) {
  try {
    const user = await requireUser()
    const userCredits = input.credits !== undefined ? input.credits : await getUserCredits(user.id)
    const result = simulateCredits({
      userCredits,
      model: input.model,
      secondsPerTake: input.secondsPerTake,
      takesCount: input.takesCount,
      isHybrid: input.isHybrid !== false,
    })
    return { success: true as const, result }
  } catch (err) {
    return fail(err)
  }
}
