"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Image as ImageIcon, Sparkles, Scissors, Download, RefreshCw, Layers, Loader2, Copy, Clock } from "lucide-react"
import { computeRenderTiming } from "@/lib/render-timing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { REALISM } from "@/lib/flow-templates"
import {
  createStandaloneFlowImageAction,
  listStandaloneFlowImagesAction,
  cutoutChromaImageAction,
} from "@/app/flow/actions"

interface ImageJobItem {
  id: string
  prompt: string
  status: string
  role: string | null
  result_url: string | null
  error_message: string | null
  created_at: string
  claimed_at?: string | null
  finished_at?: string | null
  params?: { aspectRatio?: string; model?: string }
}

interface CutoutOutput {
  transparentPngUrl: string
  width: number
  height: number
  sprites: Array<{ label: string; url: string }>
}

const ASSET_KIND_OPTIONS = [
  { value: "character", label: "Personagem Avulso (#00FF00 Chroma)" },
  { value: "puppet_sheet", label: "Folha Puppet A-Pose Corpo Inteiro (#00FF00)" },
  { value: "expressions", label: "Folha de Expressões 2×2 / 3×2 (#00FF00)" },
  { value: "accessories", label: "Kit Acessórios & Roupas 2×2 / 3×2 (#00FF00)" },
  { value: "prop", label: "Objeto / Prop Isolado (#00FF00 Chroma)" },
  { value: "background", label: "Cenário / Background Limpo (Sem Pessoas)" },
] as const

export function FlowImageStudioPanel() {
  const [assetKind, setAssetKind] = useState<"character" | "expressions" | "prop" | "background" | "puppet_sheet" | "accessories">("character")
  const [description, setDescription] = useState("")
  const [realismo, setRealismo] = useState("ilustrado2d")
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16")
  const [gridLayout, setGridLayout] = useState<"2x2" | "3x2">("2x2")
  const [chromaGreen, setChromaGreen] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<ImageJobItem[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [cutouts, setCutouts] = useState<Record<string, CutoutOutput>>({})
  const [cuttingId, setCuttingId] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    const res = await listStandaloneFlowImagesAction()
    setLoadingJobs(false)
    if (res.success) setJobs(res.jobs as ImageJobItem[])
  }, [])

  useEffect(() => {
    loadJobs()
    const t = setInterval(loadJobs, 8000)
    return () => clearInterval(t)
  }, [loadJobs])

  const handleKindChange = (k: "character" | "expressions" | "prop" | "background" | "puppet_sheet" | "accessories") => {
    setAssetKind(k)
    setChromaGreen(k !== "background")
    if (k === "expressions" || k === "accessories") setAspectRatio("1:1")
    if (k === "puppet_sheet") setAspectRatio("9:16")
  }

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Descreva o personagem, folha de expressões, objeto ou cenário.")
      return
    }
    setSubmitting(true)
    const res = await createStandaloneFlowImageAction({
      assetKind,
      description,
      realismo,
      aspectRatio,
      chromaGreen,
      gridLayout,
    })
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Imagem enfileirada no Nano Banana (Google Flow)!")
    loadJobs()
  }

  const handleCutout = async (job: ImageJobItem, sliceGrid?: "2x2" | "3x2") => {
    if (!job.result_url) return
    setCuttingId(job.id)
    const res = await cutoutChromaImageAction({
      imageUrl: job.result_url,
      jobId: job.id,
      sliceGrid,
    })
    setCuttingId(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setCutouts((prev) => ({ ...prev, [job.id]: res.cutout }))
    toast.success(
      res.cutout.sprites?.length
        ? `Fundo verde removido + ${res.cutout.sprites.length} expressões PNG fatiadas!`
        : "Fundo verde #00FF00 removido → PNG Transparente pronto!"
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr] items-start min-w-0">
      <Card className="min-w-0">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-emerald-500" />
              <span>Estúdio Nano Banana (#00FF00)</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
              Chroma Key + PNG
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Gere personagens, folhas de expressões, objetos em fundo verde (#00FF00) ou cenários no Flow e recorte em PNG transparente para animar a $0.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium block">Tipo de Peça Visual</label>
            <Select value={assetKind} onValueChange={(v) => handleKindChange(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium block">Descrição do Personagem / Objeto / Cenário</label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                assetKind === "expressions"
                  ? "Ex: Jovem investigador de moletom verde-esmeralda, cabelo escuro curto, traço 2D editorial..."
                  : assetKind === "prop"
                    ? "Ex: Relógio de bolso antigo dourado com engrenagens aparentes..."
                    : assetKind === "background"
                      ? "Ex: Interior de cabine de elevador metálico escuro com iluminação azul no teto..."
                      : "Ex: Detetive de sobretudo azul-marinho e chapéu fedora, iluminação dramática..."
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Estilo Visual</label>
              <Select value={realismo} onValueChange={setRealismo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REALISM.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Proporção</label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                  <SelectItem value="1:1">1:1 (Quadrado / Sprites)</SelectItem>
                  <SelectItem value="16:9">16:9 (Horizontal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(assetKind === "expressions" || assetKind === "accessories") && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Grade para Fatiamento Automático</label>
              <Select value={gridLayout} onValueChange={(v) => setGridLayout(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2x2">Grade 2×2 (4 expressões: Feliz, Chocado, Bravo, Triste)</SelectItem>
                  <SelectItem value="3x2">Grade 3×2 (6 expressões: + Pensativo e Confiante)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-emerald-400">Fundo Verde Puro (#00FF00)</p>
              <p className="text-[11px] text-muted-foreground">
                Permite remover o fundo com 1 clique e baixar PNG transparente (RGBA).
              </p>
            </div>
            <Switch checked={chromaGreen} onCheckedChange={setChromaGreen} />
          </div>

          <Button onClick={handleGenerate} disabled={submitting} className="w-full font-semibold">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {submitting ? "Enfileirando no Nano Banana..." : "Gerar Imagem no Nano Banana"}
          </Button>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Galeria Nano Banana & Recorte Chroma (#00FF00)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Imagens geradas pela sua conta no Flow. Clique em Recortar PNG para extrair o fundo transparente.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadJobs} disabled={loadingJobs}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingJobs ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhuma imagem do Nano Banana encontrada ainda. Gere sua primeira peça ao lado!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.map((j) => {
                const cut = cutouts[j.id]
                const isExpr = j.role === "expression_sheet" || j.role === "accessories_sheet"
                const timing = computeRenderTiming({
                  createdAt: j.created_at,
                  startedAt: j.claimed_at || j.created_at,
                  finishedAt: j.finished_at,
                })
                return (
                  <div key={j.id} className="rounded-xl border bg-card/60 p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {j.role || "image"} · {j.params?.aspectRatio || "9:16"}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          {timing.totalDeliveryLabel && (
                            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {j.status === "done" ? `Entrega: ${timing.totalDeliveryLabel}` : timing.totalDeliveryLabel}
                            </Badge>
                          )}
                          <Badge
                            variant={j.status === "done" ? "default" : "outline"}
                            className={j.status === "done" ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                          >
                            {j.status === "done" ? "Pronta" : j.status}
                          </Badge>
                        </div>
                      </div>

                      {j.result_url ? (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="relative rounded-lg overflow-hidden border bg-black/40 aspect-square flex items-center justify-center">
                            <img src={j.result_url} alt="Nano Banana Output" className="max-h-60 object-contain" />
                          </div>
                          {cut && (
                            <div className="rounded-lg border border-emerald-500/40 bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:16px_16px] p-2 space-y-2">
                              <p className="text-[11px] font-bold text-emerald-400 text-center">
                                PNG Transparente Recortado (RGBA)
                              </p>
                              <img src={cut.transparentPngUrl} alt="PNG Transparente" className="max-h-52 mx-auto object-contain" />
                              {cut.sprites?.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  {cut.sprites.map((sp) => (
                                    <a
                                      key={sp.label}
                                      href={sp.url}
                                      download
                                      className="rounded border border-white/10 bg-black/40 p-1.5 text-center hover:border-emerald-400 transition"
                                    >
                                      <img src={sp.url} alt={sp.label} className="h-20 mx-auto object-contain" />
                                      <span className="block text-[10px] font-semibold uppercase text-emerald-300 mt-1">
                                        {sp.label} (PNG)
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed h-36 flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
                          {j.error_message || "Aguardando extensão do Google Flow processar o Nano Banana..."}
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground line-clamp-2" title={j.prompt}>
                        {j.prompt}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          navigator.clipboard.writeText(j.prompt)
                          toast.success("Prompt copiado!")
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Prompt
                      </Button>

                      {j.result_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={cuttingId === j.id}
                            onClick={() => handleCutout(j, isExpr ? "2x2" : undefined)}
                          >
                            {cuttingId === j.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Scissors className="h-3 w-3 mr-1 text-emerald-400" />
                            )}
                            {isExpr ? "Recortar + Fatiar 2×2" : "Recortar #00FF00 → PNG"}
                          </Button>
                          {!isExpr && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={cuttingId === j.id}
                              onClick={() => handleCutout(j, "2x2")}
                            >
                              <Layers className="h-3 w-3 mr-1 text-sky-400" />
                              Fatiar 2×2
                            </Button>
                          )}
                          <a
                            href={cut?.transparentPngUrl || j.result_url}
                            download
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold ml-auto"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {cut ? "Baixar PNG" : "Baixar"}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
