"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Link2,
  ScanEye,
  Loader2,
  Sparkles,
  FileText,
  Film,
  UserCheck,
  MapPin,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROVIDER_LABEL, type FlowProvider } from "@/lib/flow-llm"
import type { FlowProject } from "@/lib/flow-projects"
import type { FlowClonedStructure } from "@/lib/flow-clone-types"
import {
  LANGUAGES,
  MAX_TAKES,
  REALISM,
  VIDEO_MODELS,
  allowedSecondsForModel,
  clampSecondsForModel,
  wordLimit,
} from "@/lib/flow-templates"
import { analyzeVideoLinkForFlowAction, createProjectFromCloneAction } from "@/app/flow/actions"

const MODE_LABEL: Record<string, string> = {
  dialogo: "Diálogo (fala na tela)",
  narracao: "Narração (voz em off)",
  ambiente: "Sem fala (visual/ASMR)",
  livre: "Misto",
}

interface FlowClonePanelProps {
  providers: string[]
  defaultProvider: string
  onProjectCreated: (project: FlowProject) => void
}

export function FlowClonePanel({ providers, defaultProvider, onProjectCreated }: FlowClonePanelProps) {
  const [url, setUrl] = useState("")
  const [provider, setProvider] = useState(defaultProvider || providers[0] || "")
  const [analyzing, setAnalyzing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [structure, setStructure] = useState<FlowClonedStructure | null>(null)

  const [newTheme, setNewTheme] = useState("")
  const [newCharacter, setNewCharacter] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [keepInstructions, setKeepInstructions] = useState("")

  const [takes, setTakes] = useState(5)
  const [seconds, setSeconds] = useState(6)
  const [aspect, setAspect] = useState<"9:16" | "16:9">("9:16")
  const [model, setModel] = useState("Omni 1.2 Flash")
  const [quality, setQuality] = useState("360p")
  const [idioma, setIdioma] = useState("pt-BR")
  const [realismo, setRealismo] = useState("cinematografico")
  const [wordsPerCaption, setWordsPerCaption] = useState(2)
  const [isHybrid, setIsHybrid] = useState(true)

  const activeProvider = provider || defaultProvider || providers[0] || ""

  const handleAnalyze = async () => {
    if (!activeProvider) {
      toast.error("Salve uma chave de IA em Credenciais primeiro.")
      return
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("Cole um link válido começando com http:// ou https://.")
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeVideoLinkForFlowAction({ url: url.trim(), provider: activeProvider })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const st = res.structure
      setStructure(st)
      setTakes(Math.min(MAX_TAKES, Math.max(1, st.recommendedTakes || st.beats.length || 5)))
      setModel(st.recommendedModel || "Omni 1.2 Flash")
      setSeconds(clampSecondsForModel(st.recommendedSeconds || 6, st.recommendedModel || "Omni 1.2 Flash"))
      setAspect(st.aspect === "16:9" ? "16:9" : "9:16")
      if (LANGUAGES.some((l) => l.value === st.language)) setIdioma(st.language)
      if (REALISM.some((r) => r.value === st.visualStyle)) setRealismo(st.visualStyle)
      toast.success(`Estrutura extraída com ${st.framesAnalyzed} frames e ${st.beats.length} cenas!`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCreate = async () => {
    if (!structure) return
    if (!activeProvider) {
      toast.error("Salve uma chave de IA em Credenciais primeiro.")
      return
    }
    setCreating(true)
    try {
      const res = await createProjectFromCloneAction({
        structure,
        provider: activeProvider,
        custom: { newTheme, newCharacter, newLocation, keepInstructions },
        params: {
          idioma,
          realismo,
          takes,
          seconds,
          aspect,
          model,
          isHybrid,
          quality: model.toLowerCase().includes("omni") ? quality : undefined,
          wordsPerCaption,
        },
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success("Roteiro replicado e pronto para produzir no Flow!")
      if (res.issues?.length) toast.warning(`Confira o roteiro: ${res.issues.length} ponto(s) fora das regras do formato.`)
      onProjectCreated(res.project as FlowProject)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5 min-w-0">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ScanEye className="h-5 w-5 text-primary shrink-0" />
              <span>Clonar Estrutura de Vídeo por Link (Frame a Frame + OCR)</span>
            </CardTitle>
            <Badge variant="outline" className="text-[11px]">YouTube · Reels · TikTok · Shorts</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            O DarkTube baixa o vídeo, lê os frames em ordem com OCR visual usando a sua própria credencial de IA (Gemini Vision, OpenAI ou Claude) e monta a mesma estrutura para você trocar personagem, história ou ambiente e produzir na hora.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="space-y-1.5 min-w-0">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Link do vídeo de referência</span>
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/... ou https://youtube.com/shorts/..."
                disabled={analyzing || creating}
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-sm font-medium block">IA com Visão / OCR (Credenciais)</label>
              {providers.length === 0 ? (
                <p className="text-xs text-muted-foreground pt-2">
                  Sem chave salva.{" "}
                  <Link href="/credentials" className="text-primary underline">Configurar</Link>
                </p>
              ) : (
                <Select value={activeProvider} onValueChange={setProvider} disabled={analyzing || creating}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p} value={p}>{PROVIDER_LABEL[p as FlowProvider] ?? p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={analyzing || creating || !activeProvider || !url.trim()} className="w-full sm:w-auto font-semibold">
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanEye className="mr-2 h-4 w-4" />}
            {analyzing ? "Baixando vídeo, extraindo frames e lendo OCR..." : structure ? "Reanalisar link" : "Baixar e Analisar Estrutura"}
          </Button>
        </CardContent>
      </Card>

      {structure && (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] items-start min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{structure.title}</span>
                </CardTitle>
                <Badge variant="secondary" className="text-[11px] shrink-0">
                  {PROVIDER_LABEL[structure.providerUsed] ?? structure.providerUsed}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{structure.summary}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-[10px]">
                  <Clock className="mr-1 h-3 w-3" /> {structure.durationSec}s
                </Badge>
                <Badge variant="outline" className="text-[10px]">{structure.aspect}</Badge>
                <Badge variant="outline" className="text-[10px]">{MODE_LABEL[structure.mode] ?? structure.mode}</Badge>
                <Badge variant="outline" className="text-[10px]">{structure.framesAnalyzed} frames analisados</Badge>
                <Badge variant="outline" className="text-[10px]">Ritmo: {structure.pacing}</Badge>
              </div>
              {structure.usedFallbackThumbs && (
                <p className="text-[11px] text-amber-500 flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>A plataforma limitou o download direto do MP4; a análise usou os quadros/capas disponíveis.</span>
                </p>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {structure.ocrTexts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Textos OCR capturados na tela ({structure.ocrTexts.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-2.5">
                    {structure.ocrTexts.map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[11px] font-normal max-w-full whitespace-normal text-left">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5" /> Esqueleto de Cenas Extraído ({structure.beats.length} beats)
                </p>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {structure.beats.map((b) => (
                    <div key={b.n} className="rounded-lg border bg-card/60 p-3 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-foreground">#{b.n} · {b.beat}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] font-mono">{b.timestamp}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{b.transition}</Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground"><span className="font-medium text-foreground/80">Câmera:</span> {b.camera}</p>
                      <p className="text-muted-foreground"><span className="font-medium text-foreground/80">Ação:</span> {b.action}</p>
                      {b.ocrText && (
                        <p className="text-sky-600 dark:text-sky-400">
                          <span className="font-medium">OCR na tela:</span> &ldquo;{b.ocrText}&rdquo;
                        </p>
                      )}
                      {b.spokenSummary && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          <span className="font-medium">Fala/Sentido:</span> &ldquo;{b.spokenSummary}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>Replicar Estrutura &amp; Customizar para Produzir</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Mude apenas o que quiser (história, personagem ou ambiente). A estrutura de retenção, ganchos, planos e transições será replicada.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium block">Nova História / Tema / Produto (opcional)</label>
                <Textarea
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  rows={2}
                  maxLength={900}
                  placeholder="Ex.: Trocar por receita de panqueca proteica de banana pronta em 3 minutos (deixe vazio para manter o tema original adaptado)"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Novo Personagem (opcional)</span>
                  </label>
                  <Input
                    value={newCharacter}
                    onChange={(e) => setNewCharacter(e.target.value)}
                    maxLength={300}
                    placeholder={structure.detectedCharacters[0] ? `Original: ${structure.detectedCharacters[0].slice(0, 45)}...` : "Ex.: Chef mulher de 35 anos, avental verde"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Novo Ambiente / Cenário (opcional)</span>
                  </label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    maxLength={300}
                    placeholder={structure.detectedLocations[0] ? `Original: ${structure.detectedLocations[0].slice(0, 45)}...` : "Ex.: Cozinha moderna iluminada com bancada de madeira"}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium block">O que manter / Observações extras (opcional)</label>
                <Input
                  value={keepInstructions}
                  onChange={(e) => setKeepInstructions(e.target.value)}
                  maxLength={500}
                  placeholder="Ex.: Manter o mesmo tom de curiosidade no gancho e fechar com CTA para comentar 'EU QUERO'"
                />
              </div>

              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Quantidade de takes</label>
                  <Badge variant="secondary" className="font-mono text-xs">{takes} takes</Badge>
                </div>
                <Slider min={1} max={MAX_TAKES} step={1} value={[takes]} onValueChange={(v) => setTakes(v[0])} />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Modelo de vídeo</label>
                  <Select
                    value={model}
                    onValueChange={(m) => {
                      setModel(m)
                      setSeconds((prev) => clampSecondsForModel(prev, m))
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VIDEO_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Segundos por take</label>
                  <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allowedSecondsForModel(model).map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}s (até {wordLimit(s)} palavras)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Formato</label>
                  <Select value={aspect} onValueChange={(v) => setAspect(v === "16:9" ? "16:9" : "9:16")}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 (vertical)</SelectItem>
                      <SelectItem value="16:9">16:9 (horizontal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Idioma</label>
                  <Select value={idioma} onValueChange={setIdioma}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Estilo visual</label>
                  <Select value={realismo} onValueChange={setRealismo}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REALISM.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Palavras por legenda</label>
                  <Select value={String(wordsPerCaption)} onValueChange={(v) => setWordsPerCaption(Number(v))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 palavra (dinâmico)</SelectItem>
                      <SelectItem value="2">2 palavras (rápido)</SelectItem>
                      <SelectItem value="3">3 palavras (curto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {model.toLowerCase().includes("omni") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium block">Qualidade</label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360p">360p (rascunho)</SelectItem>
                      <SelectItem value="720p">720p (final)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Modo Híbrido Inteligente</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Economiza créditos nos B-rolls mantendo fidelidade nos diálogos.</p>
                </div>
                <Switch checked={isHybrid} onCheckedChange={setIsHybrid} />
              </div>

              <Button onClick={handleCreate} disabled={creating || analyzing} className="w-full h-10 font-semibold">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {creating ? "Montando roteiro replicado..." : "Gerar Roteiro Replicado e Produzir Agora"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
