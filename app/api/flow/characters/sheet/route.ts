import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-helpers"
import { getFlowProject, updateFlowProject } from "@/lib/flow-projects"
import type { FlowScript } from "@/lib/flow-script"
import { uploadMediaFile } from "@/lib/storage"

export const dynamic = "force-dynamic"

const MAX_BYTES = 8 * 1024 * 1024
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Não autenticado." }, { status: 401 })
    }

    const form = await req.formData()
    const projectId = String(form.get("projectId") || "").trim()
    const target = String(form.get("characterId") || form.get("target") || "").trim()
    const file = form.get("file")

    if (!projectId || !target) {
      return NextResponse.json({ success: false, error: "Informe o projeto e o personagem." }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Arquivo de imagem ausente." }, { status: 400 })
    }
    const ext = EXT_BY_MIME[file.type]
    if (!ext) {
      return NextResponse.json({ success: false, error: "Envie uma imagem PNG, JPG ou WebP." }, { status: 415 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "A imagem deve ter no máximo 8 MB." }, { status: 413 })
    }

    const project = await getFlowProject(user.id, projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado." }, { status: 404 })
    }

    if (target !== "cast" && !project.script.characters.some((c) => c.id === target)) {
      return NextResponse.json({ success: false, error: "Personagem não encontrado." }, { status: 404 })
    }

    const safeTarget = target.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "char"
    const filename = `flow_sheet_${projectId}_${safeTarget}_${Date.now()}.${ext}`
    const url = await uploadMediaFile(Buffer.from(await file.arrayBuffer()), filename, file.type)

    const nextScript: FlowScript =
      target === "cast"
        ? {
            ...project.script,
            castSheetUrl: url,
            castSheetStatus: "aprovada",
          }
        : {
            ...project.script,
            characters: project.script.characters.map((c) =>
              c.id === target ? { ...c, sheetUrl: url, sheetStatus: "aprovada" } : c
            ),
          }

    const updated = await updateFlowProject(user.id, projectId, { script: nextScript })
    return NextResponse.json({
      success: true,
      url,
      project: updated ?? { ...project, script: nextScript },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Erro ao enviar a imagem." },
      { status: 500 }
    )
  }
}
