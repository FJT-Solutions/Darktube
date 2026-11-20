"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Check,
  Copy,
  Download,
  FileJson,
  Loader2,
  Mic,
  Play,
  Radio,
  Scissors,
  Sparkles,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface GoldenPrompt {
  id: string
  title: string
  prompt: string
}

interface PeakClip {
  index: number
  startSec: number
  endSec: number
  durationSec: number
  peakSec: number
  viralScore: number
  reason: string
}

const SAMPLE_BATCH_PRESETS: Record<string, any[]> = {
  html_svg_netflix_doc: [
    {
      engine: "html_svg",
      preset: "html_svg_netflix_doc",
      title: "O Mistério do Sarcófago de Chernobil",
      aspect: "9:16",
      isDraft: true,
      scriptText:
        "Em abril de mil novecentos e oitenta e seis, engenheiros correram contra o tempo para erguer uma muralha de concreto sobre o reator quatro.",
      scenes: [
        {
          badge: "1986",
          yearLabel: "1986",
          title: "O Colapso do Reator Quatro",
          subtitle: "Operação emergencial em temperatura extrema",
          spokenLine: "A corrida para conter a radiação mudou a engenharia para sempre.",
          metricValue: "200.000",
          metricLabel: "LIQUIDATÁRIOS MOBILIZADOS",
          callout: "ZONA DE EXCLUSÃO",
          durationSec: 4.5,
        },
        {
          badge: "2016",
          yearLabel: "2016",
          title: "O Novo Arco de Aço",
          subtitle: "A maior estrutura móvel terrestre já construída",
          spokenLine: "Trinta e seis mil toneladas deslizaram sobre trilhos até selar a cúpula antiga.",
          metricValue: "36.000 t",
          metricLabel: "ARCO DE CONFINAMENTO",
          durationSec: 4.5,
        },
      ],
    },
  ],
  html_svg_vox_papercut: [
    {
      engine: "html_svg",
      preset: "html_svg_vox_papercut",
      title: "Por que a Lua Controla as Marés",
      aspect: "9:16",
      isDraft: true,
      scriptText:
        "Mesmo distante trezentos e oitenta mil quilômetros, a gravidade lunar puxa trilhões de toneladas de água duas vezes ao dia.",
      scenes: [
        {
          badge: "EXPLICADOR 01",
          title: "A Força Invisível da Gravidade Lunar",
          subtitle: "Dois bojos oceânicos acompanham a órbita ao redor da Terra",
          spokenLine: "A lua estica os oceanos criando duas grandes ondas ao redor do planeta.",
          metricValue: "384 mil km",
          metricLabel: "DISTÂNCIA MÉDIA DA TERRA",
          callout: "12 FPS PAPERCUT",
          durationSec: 4.5,
        },
      ],
    },
  ],
  html_svg_kaz_chart: [
    {
      engine: "html_svg",
      preset: "html_svg_kaz_chart",
      title: "Custo de Render por Vídeo: IA vs Código",
      aspect: "9:16",
      isDraft: true,
      scriptText:
        "Veja a diferença real entre pagar créditos a cada segundo e renderizar vídeos determinísticos em código local.",
      scenes: [
        {
          badge: "COMPARATIVO",
          title: "Custo por Centena de Vídeos",
          subtitle: "Créditos externos contra motor local procedural",
          spokenLine: "Enquanto APIs externas escalam em dólar, o motor local roda em custo zero.",
          metricValue: "98 por cento",
          metricLabel: "ECONOMIA DIRETA",
          chartItems: [
            { label: "Flow API", value: 180, color: "#FB7185" },
            { label: "SaaS 3D", value: 120, color: "#FACC15" },
            { label: "DarkTube V5", value: 4, color: "#22C55E" },
          ],
          durationSec: 5,
        },
      ],
    },
  ],
  html_svg_paper_finance: [
    {
      engine: "html_svg",
      preset: "html_svg_paper_finance",
      title: "Regra dos Juros Compostos em 20 Segundos",
      aspect: "9:16",
      isDraft: true,
      scriptText:
        "Nos primeiros anos a curva parece lenta, mas depois do décimo ano os rendimentos superam todos os aportes.",
      scenes: [
        {
          badge: "FINANÇAS 01",
          title: "Quando a Curva Vira Exponencial",
          subtitle: "Tempo multiplicando capital sem aportes gigantes",
          spokenLine: "A paciência na base cria a subida vertical na segunda metade do ciclo.",
          metricValue: "4x MAIOR",
          metricLabel: "EFEITO DO ANO 15 AO 25",
          durationSec: 5,
        },
      ],
    },
  ],
}

export function StudioV5Tabs({ onJobEnqueued }: { onJobEnqueued: () => void }) {
  // === 1. PUPPET STUDIO ===
  const [rhubarbInfo, setRhubarbInfo] = useState<{ available: boolean; note: string } | null>(null)
  const [goldenPrompts, setGoldenPrompts] = useState<GoldenPrompt[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [charName, setCharName] = useState("Apresentador DarkTube")
  const [puppetImageUrl, setPuppetImageUrl] = useState("")
  const [expressionsUrl, setExpressionsUrl] = useState("")
  const [gridLayout, setGridLayout] = useState<"2x2" | "3x2">("2x2")
  const [accessoriesUrl, setAccessoriesUrl] = useState("")
  const [buildingRig, setBuildingRig] = useState(false)
  const [rigResult, setRigResult] = useState<any>(null)
  const [lipText, setLipText] = useState("Olá pessoal, bem-vindos ao nosso estúdio três D com custo zero!")
  const [lipResult, setLipResult] = useState<{ engine: string; cues: any[] } | null>(null)
  const [testingLip, setTestingLip] = useState(false)

  // === 2. PRESETS VIRAIS & LOTE ===
  const [batchJson, setBatchJson] = useState(() => JSON.stringify(SAMPLE_BATCH_PRESETS.html_svg_netflix_doc, null, 2))
  const [submittingBatch, setSubmittingBatch] = useState(false)

  // === 3. AUTO-CLIPPER & STREAMER IA 24/7 ===
  const [liveUrl, setLiveUrl] = useState("")
  const [minClipSec, setMinClipSec] = useState("22")
  const [maxClipSec, setMaxClipSec] = useState("40")
  const [analyzingLive, setAnalyzingLive] = useState(false)
  const [detectedClips, setDetectedClips] = useState<PeakClip[]>([])
  const [clipLayout, setClipLayout] = useState<"vertical_center" | "split_screen">("split_screen")
  const [gameplayUrl, setGameplayUrl] = useState("")
  const [commentIntroText, setCommentIntroText] = useState("")
  const [renderingClipIdx, setRenderingClipIdx] = useState<number | null>(null)

  const [personaName, setPersonaName] = useState("Luna IA")
  const [niche, setNiche] = useState("Mistérios Históricos, Ciência e Curiosidades")
  const [voiceName, setVoiceName] = useState("pt-BR-FranciscaNeural")
  const [llmModel, setLlmModel] = useState("gemini-2.5-flash")
  const [obsSceneName, setObsSceneName] = useState("Cena_Live_24_7")
  const [triggerComments, setTriggerComments] = useState(true)
  const [triggerGifts, setTriggerGifts] = useState(true)
  const [generatingKit, setGeneratingKit] = useState(false)
  const [kitBundle, setKitBundle] = useState<{
    configJson: string
    pythonBotScript: string
    obsOverlayHtml: string
    setupGuideMd: string
  } | null>(null)

  const loadPuppetStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/studio-3d/puppet", { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setRhubarbInfo(data.rhubarb || null)
        setGoldenPrompts(Array.isArray(data.goldenPrompts) ? data.goldenPrompts : [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadPuppetStatus()
  }, [loadPuppetStatus])

  async function copyText(id: string, txt: string) {
    try {
      await navigator.clipboard.writeText(txt)
      setCopiedId(id)
      toast.success("Copiado para a área de transferência!")
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800)
    } catch {
      toast.error("Não foi possível copiar automaticamente.")
    }
  }

  function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBuildRig() {
    if (!puppetImageUrl.trim()) {
      toast.error("Informe a URL (/api/storage/... ou HTTP) da folha #00FF00 do personagem.")
      return
    }
    setBuildingRig(true)
    try {
      const res = await fetch("/api/studio-3d/puppet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "build_rig",
          characterName: charName,
          imageUrl: puppetImageUrl.trim(),
          expressionsUrl: expressionsUrl.trim() || undefined,
          gridLayout,
          accessoriesUrl: accessoriesUrl.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao recortar juntas do Puppet.")
        return
      }
      setRigResult(data.rig)
      toast.success(`Puppet Rig criado via ${data.rig?.segmentationEngine || "recorte"}!`)
    } catch {
      toast.error("Erro de comunicação com Puppet Studio.")
    } finally {
      setBuildingRig(false)
    }
  }

  async function handleTestLipSync() {
    const tokens = lipText.trim().split(/\s+/).filter(Boolean)
    if (!tokens.length) return
    setTestingLip(true)
    try {
      let cur = 0.08
      const words = tokens.map((palavra) => {
        const dur = Math.max(0.16, Math.min(0.55, palavra.length * 0.065))
        const w = { palavra, inicio: +cur.toFixed(3), fim: +(cur + dur).toFixed(3) }
        cur += dur + 0.04
        return w
      })
      const res = await fetch("/api/studio-3d/puppet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lipsync", words, durationSec: +(cur + 0.2).toFixed(2) }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao calcular fonemas.")
        return
      }
      setLipResult({ engine: data.engine, cues: data.cues || [] })
      toast.success(`${(data.cues || []).length} cues fonêmicos gerados (${data.engine}).`)
    } catch {
      toast.error("Erro ao testar Lip-Sync.")
    } finally {
      setTestingLip(false)
    }
  }

  async function handleSubmitBatch() {
    let parsed: any[]
    try {
      const val = JSON.parse(batchJson)
      parsed = Array.isArray(val) ? val : [val]
    } catch {
      toast.error("JSON inválido. Confira colchetes, chaves e vírgulas.")
      return
    }
    setSubmittingBatch(true)
    try {
      const res = await fetch("/api/remotion/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed, limit: 20 }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao enfileirar lote.")
        return
      }
      toast.success(`${data.totalQueued} vídeo(s) enfileirado(s) na Fila FIFO!`)
      onJobEnqueued()
    } catch {
      toast.error("Erro de rede ao enviar lote para a Fila FIFO.")
    } finally {
      setSubmittingBatch(false)
    }
  }

  async function handleAnalyzeLive() {
    if (!liveUrl.trim()) {
      toast.error("Cole a URL da live/podcast ou caminho de áudio para analisar.")
      return
    }
    setAnalyzingLive(true)
    setDetectedClips([])
    try {
      const res = await fetch("/api/dark-clips/auto-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          sourceUrl: liveUrl.trim(),
          minClipSec: Number(minClipSec) || 22,
          maxClipSec: Number(maxClipSec) || 40,
          topN: 4,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao analisar picos de áudio da transmissão.")
        return
      }
      setDetectedClips(Array.isArray(data.clips) ? data.clips : [])
      toast.success(`${data.peaksFound || 0} picos virais detectados em ${data.durationSec}s de áudio!`)
    } catch {
      toast.error("Erro ao executar pipeline Audio-First.")
    } finally {
      setAnalyzingLive(false)
    }
  }

  async function handleRenderClip(clip: PeakClip) {
    setRenderingClipIdx(clip.index)
    try {
      const res = await fetch("/api/dark-clips/auto-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render",
          sourceUrl: liveUrl.trim(),
          startSec: clip.startSec,
          endSec: clip.endSec,
          layout: clipLayout,
          gameplayUrl: gameplayUrl.trim() || undefined,
          commentIntroText: commentIntroText.trim() || undefined,
          title: `Corte Viral #${clip.index} (${clip.startSec}s-${clip.endSec}s)`,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Erro ao enfileirar render do corte.")
        return
      }
      toast.success(`Corte #${clip.index} enfileirado na Fila FIFO (posição ${data.positionInQueue || data.queuePosition || 1})!`)
      onJobEnqueued()
    } catch {
      toast.error("Erro ao enfileirar corte.")
    } finally {
      setRenderingClipIdx(null)
    }
  }

  async function handleGenerateStreamerKit() {
    setGeneratingKit(true)
    try {
      const res = await fetch("/api/social/streamer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaName,
          niche,
          voiceName,
          llmModel,
          obsSceneName,
          triggerOnComments: triggerComments,
          triggerOnGifts: triggerGifts,
        }),
      })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Erro ao gerar kit Streamer IA.")
        return
      }
      setKitBundle({
        configJson: data.configJson,
        pythonBotScript: data.pythonBotScript,
        obsOverlayHtml: data.obsOverlayHtml,
        setupGuideMd: data.setupGuideMd,
      })
      toast.success("Kit Streamer IA 24/7 ($0) gerado com sucesso!")
    } catch {
      toast.error("Falha ao comunicar com gerador Streamer IA.")
    } finally {
      setGeneratingKit(false)
    }
  }

  return (
    <>
      {/* ABA 4: PUPPET STUDIO & STICKER SWAP */}
      <TabsContent value="puppet" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" /> Recorte Articulado & Sticker Swap ($0)
                </CardTitle>
                <Badge variant={rhubarbInfo?.available ? "default" : "outline"} className="text-[11px]">
                  {rhubarbInfo?.available ? "Rhubarb CLI ativo" : "Fonemas PT-BR $0"}
                </Badge>
              </div>
              <CardDescription>
                Transforma folha #00FF00 em boneco 2.5D com 6 juntas (`head`, `torso`, `armL`, `armR`, `legL`, `legR`) e grade de rostos trocáveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nome do Personagem</label>
                  <Input value={charName} onChange={(e) => setCharName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Grade de Expressões</label>
                  <Select value={gridLayout} onValueChange={(v) => setGridLayout(v as "2x2" | "3x2")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x2">Grade 2x2 (4 rostos)</SelectItem>
                      <SelectItem value="3x2">Grade 3x2 (6 rostos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Imagem Base A-Pose #00FF00 (`/api/storage/...` ou URL)</label>
                <Input
                  value={puppetImageUrl}
                  onChange={(e) => setPuppetImageUrl(e.target.value)}
                  placeholder="/api/storage/flow_img_puppet.png"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Folha de Expressões (opcional)</label>
                  <Input
                    value={expressionsUrl}
                    onChange={(e) => setExpressionsUrl(e.target.value)}
                    placeholder="/api/storage/expressões.png"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Acessórios #00FF00 (opcional)</label>
                  <Input
                    value={accessoriesUrl}
                    onChange={(e) => setAccessoriesUrl(e.target.value)}
                    placeholder="/api/storage/acessorios.png"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleBuildRig} disabled={buildingRig}>
                {buildingRig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
                Recortar Boneco nas Juntas ($0)
              </Button>

              {rigResult && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Rig: {rigResult.characterName}</span>
                    <Badge variant="secondary">{rigResult.segmentationEngine}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    {Object.entries(rigResult.parts || {}).map(([partKey, partVal]: [string, any]) => (
                      <div key={partKey} className="rounded border bg-background p-1.5 truncate">
                        {partKey}: ({partVal?.wPct?.toFixed?.(2) || 0}x{partVal?.hPct?.toFixed?.(2) || 0})
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => copyText("rig_json", JSON.stringify(rigResult, null, 2))}
                  >
                    {copiedId === "rig_json" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    Copiar JSON do Puppet para Storyboard 3D
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" /> Testador Rápido de Lip-Sync (Rhubarb / PT-BR)
                </CardTitle>
                <CardDescription>{rhubarbInfo?.note || "Converta falas em fonemas A–H e X antes de renderizar."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Textarea rows={2} value={lipText} onChange={(e) => setLipText(e.target.value)} />
                <Button size="sm" variant="secondary" onClick={handleTestLipSync} disabled={testingLip}>
                  {testingLip ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                  Gerar Cues de Boca
                </Button>
                {lipResult && (
                  <div className="rounded border p-2 text-[11px] font-mono bg-muted/40 max-h-28 overflow-y-auto">
                    Motor: {lipResult.engine} · Total: {lipResult.cues.length} cues · Amostra:{" "}
                    {lipResult.cues
                      .slice(0, 14)
                      .map((c) => `${c.shape}(${c.start}s)`)
                      .join(" ")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Os 3 Prompts de Ouro (OpenCV & Overlay Audit)</CardTitle>
                <CardDescription>Evite ilustrações &ldquo;no olhômetro&rdquo;: copie e use ao inspecionar personagens vetoriais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {goldenPrompts.map((gp) => (
                  <div key={gp.id} className="rounded-md border p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{gp.title}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText(gp.id, gp.prompt)}>
                        {copiedId === gp.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-muted-foreground font-mono text-[11px]">{gp.prompt}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ABA 5: PRESETS VIRAIS $0 & LOTE JSON */}
      <TabsContent value="virais" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" /> Presets Virais HTML+SVG V2 & Enfileirador em Lote ($0)
            </CardTitle>
            <CardDescription>
              Carregue um dos 4 novos formatos de alto RPM ou cole uma matriz JSON com até 20 itens (`html_svg` ou `threejs_3d`) para renderização sequencial na Fila FIFO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setBatchJson(JSON.stringify(SAMPLE_BATCH_PRESETS.html_svg_netflix_doc, null, 2))}>
                1. Netflix Doc (Ken Burns + 35mm)
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBatchJson(JSON.stringify(SAMPLE_BATCH_PRESETS.html_svg_vox_papercut, null, 2))}>
                2. VOX Papercut (12 FPS + Marca-Texto)
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBatchJson(JSON.stringify(SAMPLE_BATCH_PRESETS.html_svg_kaz_chart, null, 2))}>
                3. Kaz Chart (Barras Animadas)
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBatchJson(JSON.stringify(SAMPLE_BATCH_PRESETS.html_svg_paper_finance, null, 2))}>
                4. Caderno Finanças + Stickman
              </Button>
            </div>
            <Textarea
              rows={15}
              className="font-mono text-xs"
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
            />
            <Button className="w-full" size="lg" onClick={handleSubmitBatch} disabled={submittingBatch}>
              {submittingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Enfileirar Lote Data-in, Video-out na Fila FIFO ($0)
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ABA 6: AUTO-CLIPPER DE LIVES & STREAMER IA 24/7 */}
      <TabsContent value="social" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" /> Auto-Clipper de Lives & Podcasts (Audio-First $0)
              </CardTitle>
              <CardDescription>
                Baixa primeiro apenas o áudio leve para achar os maiores picos de energia viral e recorta só o trecho escolhido em 9:16 com Modo Comentário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">URL da Live / Podcast ou Arquivo `/api/storage/...`</label>
                <Input
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://youtube.com/... ou /api/storage/live.mp4"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mín. (seg)</label>
                  <Input value={minClipSec} onChange={(e) => setMinClipSec(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Máx. (seg)</label>
                  <Input value={maxClipSec} onChange={(e) => setMaxClipSec(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Enquadramento</label>
                  <Select value={clipLayout} onValueChange={(v) => setClipLayout(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split_screen">Split-Screen 9:16</SelectItem>
                      <SelectItem value="vertical_center">Vertical Blur 9:16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  value={gameplayUrl}
                  onChange={(e) => setGameplayUrl(e.target.value)}
                  placeholder="Gameplay inferior (opcional, URL/storage)"
                />
                <Input
                  value={commentIntroText}
                  onChange={(e) => setCommentIntroText(e.target.value)}
                  placeholder="Modo Comentário: intro TTS (opcional)"
                />
              </div>
              <Button className="w-full" onClick={handleAnalyzeLive} disabled={analyzingLive}>
                {analyzingLive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Detectar Picos Virais via Áudio ($0)
              </Button>

              {detectedClips.length > 0 && (
                <div className="space-y-2 pt-2">
                  {detectedClips.map((c) => (
                    <div key={c.index} className="rounded-lg border p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">Corte #{c.index} ({c.startSec}s–{c.endSec}s)</span>
                          <Badge className="text-[10px]">Score {c.viralScore}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.reason}</p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={renderingClipIdx === c.index}
                        onClick={() => handleRenderClip(c)}
                      >
                        {renderingClipIdx === c.index ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                        Renderizar 9:16
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Gerador de Kit Streamer IA 24/7 ($0)
              </CardTitle>
              <CardDescription>
                Gera bot Python (`TikFinity + LLM + Edge TTS`) e Overlay transparente para OBS Studio responder comentários e presentes ao vivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nome do Streamer IA</label>
                  <Input value={personaName} onChange={(e) => setPersonaName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Voz Edge TTS</label>
                  <Input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nicho da Live</label>
                  <Input value={niche} onChange={(e) => setNiche(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Cena no OBS Studio</label>
                  <Input value={obsSceneName} onChange={(e) => setObsSceneName(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={triggerComments} onChange={(e) => setTriggerComments(e.target.checked)} />
                  Responder Comentários
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={triggerGifts} onChange={(e) => setTriggerGifts(e.target.checked)} />
                  Agradecer Presentes / Gifts
                </label>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-muted-foreground">Modelo:</span>
                  <Input className="h-7 w-40 text-xs" value={llmModel} onChange={(e) => setLlmModel(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleGenerateStreamerKit} disabled={generatingKit}>
                {generatingKit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
                Gerar Pacote Streamer IA 24/7 ($0)
              </Button>

              {kitBundle && (
                <div className="rounded-lg border p-3 space-y-2.5 bg-muted/30 text-xs">
                  <p className="font-semibold">Pacote pronto para baixar (TikFinity + OBS + Edge TTS):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadFile("streamer_config.json", kitBundle.configJson, "application/json")}>
                      <Download className="h-3 w-3 mr-1" /> config.json
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadFile("streamer_bot.py", kitBundle.pythonBotScript, "text/x-python")}>
                      <Download className="h-3 w-3 mr-1" /> bot.py
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadFile("obs_overlay.html", kitBundle.obsOverlayHtml, "text/html")}>
                      <Download className="h-3 w-3 mr-1" /> overlay.html
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadFile("GUIA_LIVE_24_7.md", kitBundle.setupGuideMd, "text/markdown")}>
                      <Download className="h-3 w-3 mr-1" /> GUIA.md
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </>
  )
}
