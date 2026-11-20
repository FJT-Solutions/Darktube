"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Box,
  Sparkles,
  Play,
  Loader2,
  Download,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Film,
  Layers,
  Mic,
  Link2,
  Cpu,
  Image as ImageIcon,
  Volume2,
  Wand2,
  FileJson,
  Scissors,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { formatDeliveryDuration } from "@/lib/render-timing"
import { StudioV5Tabs } from "@/components/studio-v5-tabs"
import {
  EMPTY_VOICE_SELECTION,
  VoiceSelectorPanel,
  validateVoiceStateClient,
  type VoiceSelectionState,
} from "@/components/voice-selector-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

interface LocalModel {
  id: string
  name: string
  source: string
  license: string
  glbUrl: string
  tags: string[]
  thumbnailUrl?: string
}

interface RemoteCandidate {
  id: string
  name: string
  source: "polyhaven" | "polypizza" | "sketchfab" | "local"
  license: string
  tags: string[]
  thumbnailUrl?: string
  downloadUrl?: string
}

interface WikimediaItem {
  id: string
  title: string
  url: string
  thumbUrl: string
  license: string
  artist: string
}

interface SfxItem {
  id: string
  name: string
  source: string
  license: string
  durationSec: number
  previewUrl: string
  tags: string[]
}

interface QueueJob {
  id: string
  engine: string
  kind: string
  title: string
  status: string
  progress_pct?: number
  progress?: number
  error_message?: string | null
  result_url?: string | null
  result_meta?: any
  result_json?: any
  created_at: string
  started_at?: string | null
  finished_at?: string | null
  timing?: {
    totalDeliveryMs?: number | null
    totalDeliveryLabel?: string | null
    deliveryTimeMs?: number | null
    deliveryTimeLabel?: string | null
    renderDurationMs?: number | null
    renderDurationLabel?: string | null
    queueWaitMs?: number | null
    queueWaitLabel?: string | null
    elapsedMs?: number | null
    elapsedLabel?: string | null
    isRunning?: boolean
  }
}

const QUICK_IDEAS = [
  "Como é feito o asfalto de uma rodovia camada por camada em 60 segundos",
  "Como uma casa é construída do zero: fundação, pilares, paredes e telhado",
  "Como funciona uma fábrica de cimento e asfalto passo a passo",
  "Como engenheiros constroem uma ponte sobre um rio sem ela cair",
]

export default function Studio3dPage() {
  const [topic, setTopic] = useState(QUICK_IDEAS[0])
  const [kind, setKind] = useState<"full_video" | "single_scene">("full_video")
  const [durationSec, setDurationSec] = useState("60")
  const [aspect, setAspect] = useState<"9:16" | "16:9" | "1:1">("9:16")
  const [quality, setQuality] = useState<"alta" | "media" | "basica">("media")
  const [voiceSel, setVoiceSel] = useState<VoiceSelectionState>(EMPTY_VOICE_SELECTION)
  const [backend, setBackend] = useState<"threejs" | "blender">("threejs")
  const [runtimeStatus, setRuntimeStatus] = useState<{
    blender?: { available: boolean; note: string }
    rhubarb?: { available: boolean; note: string }
  } | null>(null)

  const [generating, setGenerating] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [spokenScript, setSpokenScript] = useState("")
  const [storyboardText, setStoryboardText] = useState("")
  const [metaInfo, setMetaInfo] = useState<{ providerUsed?: string; sceneCount?: number; auditFixes?: string[]; usedGlbModels?: string[] } | null>(null)

  // Biblioteca V2 ($0): 3D + Wikimedia + SFX CC0
  const [assetType, setAssetType] = useState<"3d" | "wikimedia" | "sfx">("3d")
  const [assetQuery, setAssetQuery] = useState("")
  const [searchingAssets, setSearchingAssets] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [localModels, setLocalModels] = useState<LocalModel[]>([])
  const [remoteModels, setRemoteModels] = useState<RemoteCandidate[]>([])
  const [wikimediaItems, setWikimediaItems] = useState<WikimediaItem[]>([])
  const [sfxItems, setSfxItems] = useState<SfxItem[]>([])
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [sourcesChecked, setSourcesChecked] = useState<string[]>([])
  const [directGlbUrl, setDirectGlbUrl] = useState("")
  const [directGlbName, setDirectGlbName] = useState("")

  // Fila FIFO ao vivo
  const [queueData, setQueueData] = useState<{
    activeJob: QueueJob | null
    queuedJobs: QueueJob[]
    recentJobs: QueueJob[]
  }>({ activeJob: null, queuedJobs: [], recentJobs: [] })
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoadingQueue(true)
    try {
      const res = await fetch("/api/render-queue", { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setQueueData({
          activeJob: data.activeJob || null,
          queuedJobs: Array.isArray(data.queuedJobs) ? data.queuedJobs : [],
          recentJobs: Array.isArray(data.recentJobs) ? data.recentJobs : [],
        })
      }
    } catch {
    } finally {
      if (!silent) setLoadingQueue(false)
    }
  }, [])

  const fetchAssets = useCallback(async (q = "", modeOverride?: "3d" | "wikimedia" | "sfx") => {
    const mode = modeOverride || assetType
    setSearchingAssets(true)
    try {
      const res = await fetch(`/api/studio-3d/assets?type=${mode}&q=${encodeURIComponent(q)}&limit=18`, { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        if (mode === "wikimedia") {
          setWikimediaItems(Array.isArray(data.images) ? data.images : [])
        } else if (mode === "sfx") {
          setSfxItems(Array.isArray(data.items) ? data.items : [])
        } else {
          setLocalModels(data.local || [])
          setRemoteModels(data.remote || [])
          setSourcesChecked(data.sourcesChecked || [])
        }
      } else {
        toast.error(data?.error || "Erro ao consultar Acervo V2.")
      }
    } catch {
      toast.error("Falha ao consultar Acervo V2.")
    } finally {
      setSearchingAssets(false)
    }
  }, [assetType])

  useEffect(() => {
    fetchQueue()
    fetchAssets("", "3d")
    fetch("/api/studio-3d/blender-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setRuntimeStatus({ blender: d.blender, rhubarb: d.rhubarb })
      })
      .catch(() => {})
    const timer = setInterval(() => fetchQueue(true), 4000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchQueue])

  useEffect(() => {
    if (!queueData.activeJob) return
    const tick = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [queueData.activeJob])

  async function handleGenerate(mode: "llm" | "preset") {
    setGenerating(true)
    try {
      const res = await fetch("/api/studio-3d/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          topic,
          kind,
          durationSec: Number(durationSec) || 60,
          aspect,
          quality,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Não foi possível gerar o roteiro 3D.")
        return
      }
      setSpokenScript(data.spokenScript || "")
      setStoryboardText(JSON.stringify(data.storyboard, null, 2))
      setMetaInfo({
        providerUsed: data.providerUsed,
        sceneCount: data.sceneCount,
        auditFixes: data.auditFixes || [],
        usedGlbModels: data.usedGlbModels || [],
      })
      toast.success(`Roteiro 3D gerado com ${data.sceneCount} cena(s) (${data.providerUsed}).`)
    } catch {
      toast.error("Erro de comunicação ao gerar roteiro 3D.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleEnqueueRender() {
    if (!storyboardText.trim()) {
      toast.error("Gere o roteiro 3D primeiro antes de renderizar.")
      return
    }
    let parsedStoryboard: any
    try {
      parsedStoryboard = JSON.parse(storyboardText)
    } catch {
      toast.error("O JSON do storyboard possui um erro de sintaxe.")
      return
    }

    const voiceErr = validateVoiceStateClient(voiceSel)
    if (voiceErr) {
      toast.error(voiceErr)
      return
    }

    const guessedGender: "male" | "female" = /francisca|thalita|brenda|nova|shimmer/i.test(voiceSel.voiceId)
      ? "female"
      : "male"

    setRendering(true)
    try {
      const res = await fetch("/api/studio-3d/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedStoryboard?.titulo || topic,
          spokenScript,
          storyboard: parsedStoryboard,
          kind,
          aspect,
          quality,
          backend,
          fallbackToThreeJs: true,
          isDraft: quality === "basica",
          voiceProvider: voiceSel.voiceProvider,
          voiceId: voiceSel.voiceId || undefined,
          voiceName: voiceSel.voiceName || undefined,
          audioPathOrUrl: voiceSel.audioPathOrUrl || undefined,
          voiceGender: guessedGender,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao enfileirar render 3D.")
        return
      }
      toast.success(`Job enfileirado na Fila FIFO (posição ${data.positionInQueue || data.queuePosition || data.position || 1})!`)
      fetchQueue(true)
    } catch {
      toast.error("Erro ao enviar job para a Fila FIFO.")
    } finally {
      setRendering(false)
    }
  }

  async function handleDownloadRemote(item: RemoteCandidate) {
    setDownloadingId(item.id)
    try {
      const res = await fetch("/api/studio-3d/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: item.source,
          assetId: item.id,
          url: item.downloadUrl,
          name: item.name,
          license: item.license,
          thumbnailUrl: item.thumbnailUrl,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Erro ao baixar modelo 3D.")
        return
      }
      setLocalModels(data.local || [])
      toast.success(`Modelo "${item.name}" salvo na biblioteca local ($0)!`)
    } catch {
      toast.error("Erro de rede ao baixar modelo 3D.")
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDownloadDirectUrl() {
    if (!directGlbUrl.trim()) return
    setDownloadingId("direct_url")
    try {
      const res = await fetch("/api/studio-3d/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "url",
          url: directGlbUrl.trim(),
          name: directGlbName.trim() || undefined,
          license: "CC0",
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Erro ao importar .glb.")
        return
      }
      setLocalModels(data.local || [])
      setDirectGlbUrl("")
      setDirectGlbName("")
      toast.success(`Modelo "${data.model?.name}" importado para /threejs-engine/models/!`)
    } catch {
      toast.error("Falha ao baixar URL .glb.")
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      toast.success("URL copiada!")
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 1800)
    } catch {
      toast.error("Não foi possível copiar URL.")
    }
  }

  async function handleSaveBuiltinSfx(sfxId: string) {
    setDownloadingId(sfxId)
    try {
      const res = await fetch("/api/studio-3d/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "sfx_builtin", assetId: sfxId }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Erro ao gerar MP3 CC0.")
        return
      }
      toast.success(`SFX "${sfxId}" pronto em ${data.sfx?.url}!`)
      await handleCopyUrl(data.sfx?.url || `/threejs-engine/sfx/${sfxId}.mp3`)
    } catch {
      toast.error("Erro ao gerar arquivo SFX CC0.")
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleCancelJob(jobId: string) {
    try {
      const res = await fetch(`/api/render-queue?jobId=${encodeURIComponent(jobId)}`, { method: "DELETE" })
      const data = await res.json()
      if (data?.success) {
        toast.success("Job cancelado na fila.")
        fetchQueue(true)
      } else {
        toast.error("Não foi possível cancelar (job já em execução ou finalizado).")
      }
    } catch {
      toast.error("Erro ao cancelar job.")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Box className="h-7 w-7 text-primary" />
              Estúdio 3D ($0)
            </h2>
            <Badge variant="secondary" className="text-xs">V5 · Three.js + Blender + Puppet + Social</Badge>
            {runtimeStatus?.blender && (
              <Badge variant={runtimeStatus.blender.available ? "default" : "outline"} className="text-[11px]">
                {runtimeStatus.blender.available ? "Blender EEVEE ativo" : "Blender auto-fallback Three.js"}
              </Badge>
            )}
            {runtimeStatus?.rhubarb && (
              <Badge variant={runtimeStatus.rhubarb.available ? "default" : "outline"} className="text-[11px]">
                {runtimeStatus.rhubarb.available ? "Rhubarb Lip-Sync" : "Fonemas PT-BR $0"}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Diretor 3D com IA, Puppet Rig articulado, Acervo V2 CC0 (.glb/Wikimedia/SFX), Virais SVG e Auto-Clipper/Streamer 24/7 na Fila FIFO.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            {queueData.activeJob ? "1 render ativo" : "Fila livre"} · {queueData.queuedJobs.length} aguardando
          </Badge>
          <Button variant="outline" size="sm" onClick={() => fetchQueue()} disabled={loadingQueue}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingQueue ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="criar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="criar" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Vídeo 3D
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Acervo V2 ({localModels.length})
          </TabsTrigger>
          <TabsTrigger value="fila" className="gap-1.5 text-xs">
            <Film className="h-3.5 w-3.5" /> Fila FIFO ({queueData.queuedJobs.length + (queueData.activeJob ? 1 : 0)})
          </TabsTrigger>
          <TabsTrigger value="puppet" className="gap-1.5 text-xs">
            <Wand2 className="h-3.5 w-3.5" /> Puppet Studio
          </TabsTrigger>
          <TabsTrigger value="virais" className="gap-1.5 text-xs">
            <FileJson className="h-3.5 w-3.5" /> Virais & Lote
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5 text-xs">
            <Scissors className="h-3.5 w-3.5" /> Lives & Streamer
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: DIRETOR 3D + RENDER */}
        <TabsContent value="criar" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base">1. Briefing & Configurações</CardTitle>
                <CardDescription>
                  O Diretor 3D usa a LLM das suas Credenciais e os modelos .glb do seu acervo local automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Tema ou ideia do vídeo</label>
                  <Textarea
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Como uma casa é construída do zero passo a passo..."
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setTopic(idea)}
                        className="text-[11px] px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
                      >
                        {idea.slice(0, 42)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Modo</label>
                    <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_video">Vídeo completo</SelectItem>
                        <SelectItem value="single_scene">1 cena de teste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Duração (seg)</label>
                    <Select value={durationSec} onValueChange={setDurationSec}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30s</SelectItem>
                        <SelectItem value="45">45s</SelectItem>
                        <SelectItem value="60">60s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Formato</label>
                    <Select value={aspect} onValueChange={(v) => setAspect(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16 (Reels/Shorts)</SelectItem>
                        <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                        <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Qualidade Visual</label>
                    <Select value={quality} onValueChange={(v) => setQuality(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="media">Média 30fps (Bloom + Grade — Recomendado VPS)</SelectItem>
                        <SelectItem value="alta">Alta 30fps (1080p + GTAO + Bloom — Ideal GPU)</SelectItem>
                        <SelectItem value="basica">Rascunho 24fps (540p rápido)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> Motor 3D
                    </label>
                    <Select value={backend} onValueChange={(v) => setBackend(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="threejs">Three.js Articulated ($0)</SelectItem>
                        <SelectItem value="blender">
                          Blender EEVEE {runtimeStatus?.blender?.available ? "(Ativo)" : "(Auto-fallback Three.js)"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <VoiceSelectorPanel value={voiceSel} onChange={setVoiceSel} compact />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button className="flex-1" onClick={() => handleGenerate("llm")} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Gerar Roteiro 3D (IA)
                  </Button>
                  <Button variant="outline" onClick={() => handleGenerate("preset")} disabled={generating}>
                    Carregar Preset Cratera
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">2. Roteiro & Storyboard 3D</CardTitle>
                  <CardDescription>
                    Revise a narração e as cenas JSON antes de mandar para a Fila FIFO de renderização.
                  </CardDescription>
                </div>
                {metaInfo && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary">{metaInfo.sceneCount} cenas</Badge>
                    <Badge variant="outline">{metaInfo.providerUsed}</Badge>
                    {metaInfo.usedGlbModels && metaInfo.usedGlbModels.length > 0 && (
                      <Badge className="bg-emerald-600">{metaInfo.usedGlbModels.length} .glb</Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Narração falada (PT-BR)</label>
                  <Textarea
                    rows={3}
                    value={spokenScript}
                    onChange={(e) => setSpokenScript(e.target.value)}
                    placeholder="A narração gerada pelo Diretor 3D aparecerá aqui..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Storyboard 3D (JSON editável)</label>
                  <Textarea
                    rows={12}
                    className="font-mono text-xs"
                    value={storyboardText}
                    onChange={(e) => setStoryboardText(e.target.value)}
                    placeholder='Clique em "Gerar Roteiro 3D (IA)" ou "Carregar Preset Cratera" para preencher as cenas...'
                  />
                </div>
                <Button className="w-full" size="lg" onClick={handleEnqueueRender} disabled={rendering || !storyboardText.trim()}>
                  {rendering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Renderizar MP4 na Fila FIFO ($0)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: ACERVO V2 GRATUITO ($0) — 3D + WIKIMEDIA + SFX */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Acervo V2 ($0): Modelos 3D, Fotos Históricas e SFX CC0</CardTitle>
                    <CardDescription>
                      Poly Haven + Sketchfab Free (com SKETCHFAB_API_TOKEN), Wikimedia Commons e banco sonoro CC0. Fontes 3D: {sourcesChecked.join(", ") || "local"}.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={assetType === "3d" ? "default" : "outline"}
                      onClick={() => {
                        setAssetType("3d")
                        fetchAssets(assetQuery, "3d")
                      }}
                    >
                      <Box className="h-3.5 w-3.5 mr-1" /> 3D (.glb)
                    </Button>
                    <Button
                      size="sm"
                      variant={assetType === "wikimedia" ? "default" : "outline"}
                      onClick={() => {
                        setAssetType("wikimedia")
                        fetchAssets(assetQuery || "chernobyl", "wikimedia")
                      }}
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1" /> Wikimedia
                    </Button>
                    <Button
                      size="sm"
                      variant={assetType === "sfx" ? "default" : "outline"}
                      onClick={() => {
                        setAssetType("sfx")
                        fetchAssets(assetQuery, "sfx")
                      }}
                    >
                      <Volume2 className="h-3.5 w-3.5 mr-1" /> SFX CC0
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    fetchAssets(assetQuery, assetType)
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder={
                      assetType === "wikimedia"
                        ? "Busque fotos históricas/reais (ex: chernobyl, titanic, apollo 11)..."
                        : assetType === "sfx"
                          ? "Busque ou filtre efeitos sonoros (ex: whoosh, vault, pop, impact)..."
                          : "Busque modelos 3D em inglês (ex: barrel, lantern, wheel, dragon, generator)..."
                    }
                  />
                  <Button type="submit" disabled={searchingAssets}>
                    {searchingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
                    Buscar
                  </Button>
                </form>

                {assetType === "3d" && (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {remoteModels.map((item) => (
                      <div key={`${item.source}_${item.id}`} className="rounded-lg border p-2.5 flex flex-col justify-between gap-2 bg-card">
                        <div className="space-y-1.5">
                          {item.thumbnailUrl && (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className="w-full h-28 object-cover rounded-md bg-muted"
                            />
                          )}
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.license}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{item.source}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full h-7 text-xs"
                          disabled={downloadingId === item.id}
                          onClick={() => handleDownloadRemote(item)}
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1" />
                          )}
                          Salvar na Biblioteca
                        </Button>
                      </div>
                    ))}
                    {!searchingAssets && remoteModels.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-full py-6 text-center">
                        Nenhum modelo remoto encontrado para este termo. Tente palavras em inglês (ex: barrel, table, wheel, crate).
                      </p>
                    )}
                  </div>
                )}

                {assetType === "wikimedia" && (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {wikimediaItems.map((img) => (
                      <div key={img.id} className="rounded-lg border p-2.5 flex flex-col justify-between gap-2 bg-card">
                        <div className="space-y-1.5">
                          <img src={img.thumbUrl} alt={img.title} className="w-full h-28 object-cover rounded-md bg-muted" />
                          <p className="text-xs font-semibold line-clamp-2">{img.title}</p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="truncate">{img.artist}</span>
                            <Badge variant="outline" className="text-[9px]">{img.license}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="secondary" className="w-full h-7 text-xs" onClick={() => handleCopyUrl(img.url)}>
                          {copiedUrl === img.url ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                          Copiar URL p/ Netflix Doc
                        </Button>
                      </div>
                    ))}
                    {!searchingAssets && wikimediaItems.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-full py-6 text-center">
                        Nenhuma foto encontrada no Wikimedia Commons. Tente um termo em inglês (ex: nuclear plant, earth, skyscraper).
                      </p>
                    )}
                  </div>
                )}

                {assetType === "sfx" && (
                  <div className="space-y-2">
                    {sfxItems.map((sfx) => (
                      <div key={sfx.id} className="rounded-lg border p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{sfx.name}</span>
                            <Badge variant="outline" className="text-[10px]">{sfx.license}</Badge>
                            <span className="text-[11px] text-muted-foreground">{sfx.durationSec}s</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{sfx.tags.join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <audio controls preload="none" src={sfx.previewUrl} className="h-8 w-44" />
                          {sfx.source === "builtin_cc0" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingId === sfx.id}
                              onClick={() => handleSaveBuiltinSfx(sfx.id)}
                            >
                              {downloadingId === sfx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                              Gerar MP3
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" /> Importar URL .glb (CC0)
                  </CardTitle>
                  <CardDescription>Cole o link direto de qualquer .glb (Kenney, Quaternius, Poly Pizza).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Input
                    value={directGlbName}
                    onChange={(e) => setDirectGlbName(e.target.value)}
                    placeholder="Nome curto (ex: moinho_agua)"
                  />
                  <Input
                    value={directGlbUrl}
                    onChange={(e) => setDirectGlbUrl(e.target.value)}
                    placeholder="https://.../modelo.glb"
                  />
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={downloadingId === "direct_url" || !directGlbUrl.trim()}
                    onClick={handleDownloadDirectUrl}
                  >
                    {downloadingId === "direct_url" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                    Baixar para Biblioteca Local
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Biblioteca Local ({localModels.length})</CardTitle>
                  <CardDescription>Disponíveis instantaneamente para o Diretor 3D usar a $0.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {localModels.map((m) => (
                    <div key={m.id} className="rounded-md border p-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{m.glbUrl}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{m.source}</Badge>
                    </div>
                  ))}
                  {localModels.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Nenhum .glb salvo ainda. Busque ao lado e clique em &quot;Salvar na Biblioteca&quot;.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ABA 3: FILA FIFO AO VIVO */}
        <TabsContent value="fila" className="space-y-4">
          {queueData.activeJob && (() => {
            const pct = queueData.activeJob.progress_pct ?? queueData.activeJob.progress ?? 0
            const baseIso = queueData.activeJob.started_at || queueData.activeJob.created_at
            const elapsedMs = Math.max(0, nowTick - (Date.parse(baseIso) || nowTick))
            return (
              <Card className="border-primary/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Renderizando Agora (Prioridade Exclusiva FIFO)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs gap-1">
                        <Clock className="h-3 w-3 text-amber-500" /> {formatDeliveryDuration(elapsedMs)}
                      </Badge>
                      <Badge>{queueData.activeJob.engine}</Badge>
                    </div>
                  </div>
                  <CardDescription>{queueData.activeJob.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground">{pct}% concluído · cronômetro ao vivo</p>
                </CardContent>
              </Card>
            )
          })()}

          {queueData.queuedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aguardando na Fila ({queueData.queuedJobs.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {queueData.queuedJobs.map((j, idx) => (
                  <div key={j.id} className="flex items-center justify-between rounded-md border p-2.5 text-xs">
                    <div>
                      <span className="font-semibold">#{idx + 1} · {j.title}</span>
                      <span className="ml-2 text-muted-foreground">({j.engine} · {j.kind})</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleCancelJob(j.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico Recente de Renders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {queueData.recentJobs.map((j) => {
                const videoUrl = j.result_url || j.result_meta?.videoUrl || j.result_json?.videoUrl
                const contactSheetUrl = j.result_meta?.contactSheetUrl || j.result_json?.contactSheetUrl
                const deliveryLabel = j.timing?.totalDeliveryLabel || j.timing?.deliveryTimeLabel || j.result_meta?.deliveryTimeLabel
                const renderLabel = j.timing?.renderDurationLabel || j.result_meta?.renderDurationLabel
                const waitLabel = j.timing?.queueWaitLabel
                const isDone = j.status === "done" || j.status === "completed"
                return (
                  <div key={j.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : j.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-sm font-semibold truncate">{j.title}</span>
                        <Badge variant="outline" className="text-[10px]">{j.engine}</Badge>
                        {(j.result_meta?.voiceLabel || j.result_meta?.voiceUsed) && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Mic className="h-3 w-3" /> {j.result_meta.voiceLabel || j.result_meta.voiceUsed}
                          </Badge>
                        )}
                        {deliveryLabel && (
                          <Badge variant="secondary" className="text-[10px] gap-1 font-mono">
                            <Clock className="h-3 w-3" /> Entrega: {deliveryLabel}
                          </Badge>
                        )}
                        {renderLabel && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Render: {renderLabel}{waitLabel ? ` · Fila: ${waitLabel}` : ""}
                          </span>
                        )}
                      </div>
                      {j.error_message && <p className="text-xs text-destructive">{j.error_message}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {contactSheetUrl && (
                        <a
                          href={contactSheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> QA Grid
                        </a>
                      )}
                      {videoUrl && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" /> Abrir / Baixar MP4
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
              {queueData.recentJobs.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nenhum render recente na fila ainda.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABAS V5: PUPPET STUDIO, VIRAIS & LOTE, LIVES & STREAMER IA 24/7 */}
        <StudioV5Tabs onJobEnqueued={() => fetchQueue(true)} />
      </Tabs>
    </div>
  )
}
