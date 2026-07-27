"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  getRemodelingTemplatesAction,
  getProductionHistoryAction,
  sendToN8NAction,
  uploadUserMediaAction,
  saveRemodelingTemplateAction,
  translatePromptAction,
  deleteProductionHistoryAction,
} from "@/app/actions"
import {
  Clapperboard,
  Sparkles,
  Send,
  Loader2,
  ExternalLink,
  Mic2,
  Copy,
  ImageIcon,
  History,
  Check,
  AlertCircle,
  ChevronRight,
  BrainCircuit,
  PlayCircle,
  Upload,
  Languages,
  Video,
  Code,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function VideoPlayerModal({ videoUrl, title }: { videoUrl: string; title: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500">
          <PlayCircle className="h-3 w-3" />
          Ver Vídeo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none shadow-2xl">
        <DialogHeader className="p-4 bg-zinc-900/50 backdrop-blur-md border-b border-white/10">
          <DialogTitle className="text-white flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-emerald-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-black flex items-center justify-center">
          <video src={videoUrl} controls className="w-full h-full object-contain" autoPlay={false} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TranslatedPrompt({ text, label, icon: Icon, colorClass, isImagePrompt = false }: { text: string, label: string, icon: any, colorClass: string, isImagePrompt?: boolean }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!text) return null

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (translated) {
      setShowTranslation(!showTranslation)
      return
    }
    setLoading(true)
    try {
      const { success, translation } = await translatePromptAction(text)
      if (success && translation) {
        setTranslated(translation)
        setShowTranslation(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (format: 'plain' | 'midjourney' = 'plain') => {
    const targetText = showTranslation && translated ? translated : text
    const textToCopy = format === 'midjourney' ? `/imagine prompt: ${targetText} --ar 9:16 --v 6.0` : targetText
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success(format === 'midjourney' ? "Prompt Midjourney copiado!" : "Prompt copiado para a área de transferência!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", colorClass)} />
          <span className={cn("text-[9px] font-bold uppercase", colorClass)}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isImagePrompt && (
            <button
              onClick={() => handleCopy('midjourney')}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors flex items-center gap-1"
              title="Copiar formatado para Midjourney (/imagine)"
            >
              <Sparkles className="h-2.5 w-2.5" />
              /imagine Midjourney
            </button>
          )}
          <button
            onClick={() => handleCopy('plain')}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button 
            onClick={handleTranslate}
            className="text-[9px] flex items-center gap-1 text-muted-foreground hover:text-foreground font-bold ml-1"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <>
                <Languages className="h-2.5 w-2.5" />
                {showTranslation ? "Original (EN)" : "Traduzir PT-BR"}
              </>
            )}
          </button>
        </div>
      </div>
      <p className={cn(
        "text-[11px] p-2 rounded transition-all duration-300 font-mono select-all leading-relaxed",
        showTranslation ? "text-primary bg-primary/5 border border-primary/20 italic" : "text-muted-foreground bg-secondary/10 border border-border/30"
      )}>
        {showTranslation ? translated : text}
      </p>
    </div>
  )
}

type CreationMode = "auto" | "manual"

export default function CriacaoPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<CreationMode>("auto")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState<string | null>(null)
  const [uploadingIdx, setUploadingIdx] = useState<{ templateId: string; idx: number } | null>(null)
  const [recentHistory, setRecentHistory] = useState<any[]>([])

  useEffect(() => {
    fetchAll()

    const handleUpdate = () => fetchAll()
    window.addEventListener("production-status-changed", handleUpdate)

    return () => {
      window.removeEventListener("production-status-changed", handleUpdate)
    }
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const data = await getRemodelingTemplatesAction()
      setTemplates(data || [])
      const firstFive = (data || []).slice(0, 5)
      const histories = await Promise.all(firstFive.map((t: any) => getProductionHistoryAction(t.id)))
      const flat = histories
        .flat()
        .sort((a: any, b: any) => new Date(b.dispatched_at).getTime() - new Date(a.dispatched_at).getTime())
        .slice(0, 10)
      setRecentHistory(flat)
    } catch {
      toast.error("Erro ao carregar dados de criação.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteHistory(id: string) {
    try {
      const res = await deleteProductionHistoryAction(id)
      if (res.success) {
        toast.success("Registro removido do histórico.")
        setRecentHistory((prev) => prev.filter((h) => h.id !== id))
      } else {
        toast.error(res.error || "Erro ao remover.")
      }
    } catch {
      toast.error("Erro ao excluir histórico.")
    }
  }

  async function handleDispatch(templateId: string) {
    setDispatching(templateId)
    try {
      const res = await sendToN8NAction(templateId)
      if (res.success) {
        toast.success("Despachado para o n8n com sucesso!")
        fetchAll()
      } else {
        toast.error(res.error || "Erro ao despachar.")
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.")
    } finally {
      setDispatching(null)
    }
  }

  async function handleSegmentMedia(template: any, idx: number, url: string) {
    const updated = { ...template }
    const templateData = { ...(updated.template_data || {}) }
    const remodeling = { ...(templateData.remodeling_template || templateData || {}) }
    const scriptBase = [...(remodeling.script_base || [])]
    if (scriptBase[idx]) {
      scriptBase[idx] = { ...scriptBase[idx], custom_media_url: url }
      remodeling.script_base = scriptBase
      if (templateData.remodeling_template) templateData.remodeling_template = remodeling
      else Object.assign(templateData, remodeling)
      updated.template_data = templateData
      setTemplates(prev => prev.map(t => t.id === template.id ? updated : t))
      try {
        await saveRemodelingTemplateAction({
          id: template.id,
          name: template.name,
          format: template.format,
          voiceType: template.voice_type,
          postTimes: template.post_times,
          postFrequency: template.post_frequency,
          isActive: template.is_active,
          templateData,
          videoTitle: template.video_title,
          targetAccounts: template.target_accounts,
        })
      } catch {
        toast.error("Erro ao salvar mídia.")
      }
    }
  }

  async function handleFileUpload(template: any, idx: number, file: File) {
    setUploadingIdx({ templateId: template.id, idx })
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadUserMediaAction(formData)
      if (res.success && res.url) {
        await handleSegmentMedia(template, idx, res.url)
        toast.success(`Mídia "${file.name}" salva na cena ${idx + 1}!`)
      } else {
        toast.error(res.error || "Erro ao enviar mídia.")
      }
    } catch {
      toast.error("Erro no upload.")
    } finally {
      setUploadingIdx(null)
    }
  }

  const exportRoteiro = (template: any) => {
    const analysis = template.template_data?.remodeling_template || template.template_data || {}
    const segments = analysis?.script_base || []
    if (!segments.length) return
    const text = segments
      .map((seg: any, i: number) =>
        [
          `═══════════════════════════════`,
          `CENA ${i + 1} · ${seg.segment_type || "SLIDE"} · ${seg.timestamp}`,
          `═══════════════════════════════`,
          `LOCUÇÃO:\n"${seg.voiceover?.text}"`,
          ``,
          `PROMPT DE IMAGEM:\n${seg.visual_content?.image_prompt || "(sem prompt)"}`,
          ``,
          `ANIMAÇÃO:\n${seg.visual_content?.animation_instructions || "(sem instrução)"}`,
        ].join("\n")
      )
      .join("\n\n")
    navigator.clipboard.writeText(text)
    toast.success("Roteiro copiado para a área de transferência!")
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Clapperboard className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground animate-pulse">Carregando Central de Criação...</p>
        </div>
      </div>
    )
  }

  const modeConfig = [
    { mode: "auto" as CreationMode, emoji: "🤖", label: "Automático", desc: "IA gera todas as mídias e monta o vídeo automaticamente via n8n.", color: "emerald" },
    { mode: "manual" as CreationMode, emoji: "✍️", label: "Manual", desc: "Faça upload/defina as mídias das cenas geradas externamente e envie para o n8n editar.", color: "purple" },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        {/* Header */}
        <div className="border-b pb-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Central de Criação</h1>
              <p className="text-muted-foreground text-sm">Escolha o modo e acione seus templates</p>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium">Modo de criação:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modeConfig.map(({ mode, emoji, label, desc }) => {
              const isSelected = selectedMode === mode
              const borderClass = isSelected
                ? mode === "auto" ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                  : "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                : "border-border bg-card hover:bg-secondary/30"
              const checkClass = mode === "auto" ? "bg-emerald-500" : "bg-purple-500"
              const iconClass = mode === "auto" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-purple-500/10 border-purple-500/20"
              return (
                <button
                  key={mode}
                  onClick={() => { setSelectedMode(mode); setExpandedId(null) }}
                  className={cn("relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-left", borderClass)}
                >
                  {isSelected && (
                    <span className={cn("absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center", checkClass)}>
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center text-xl", iconClass)}>{emoji}</div>
                  <div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Seus Templates ({templates.length})
            </h2>
            <Link href="/templates">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                Gerenciar Templates
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-20 border rounded-xl bg-card">
              <BrainCircuit className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum template encontrado.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/minerar")}>
                Criar primeiro template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const analysis = template.template_data?.remodeling_template || template.template_data || {}
                const segments: any[] = analysis?.script_base || []
                const isExpanded = expandedId === template.id
                const isDispatching = dispatching === template.id
                const filledSegments = segments.filter((s: any) => s.custom_media_url).length

                const isManualReady = segments.length > 0 && filledSegments === segments.length

                return (
                  <div key={template.id} className="border rounded-xl bg-card overflow-hidden transition-all">
                    {/* Row */}
                    <div className="flex items-center justify-between p-4 gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Clapperboard className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{template.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{template.video_title}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Badge variant={template.is_active ? "default" : "secondary"} className="text-[10px]">
                          {template.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground hidden md:block">{segments.length} cenas</span>

                        {selectedMode === "auto" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedId(isExpanded ? null : template.id)}
                              className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 h-8 text-xs"
                            >
                              <Code className="h-3 w-3" />
                              Prompts & Roteiro
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDispatch(template.id)}
                              disabled={isDispatching}
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none h-8 text-xs"
                            >
                              {isDispatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              {isDispatching ? "Enviando..." : "Despachar Auto"}
                            </Button>
                          </>
                        )}

                        {selectedMode === "manual" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedId(isExpanded ? null : template.id)}
                              className="gap-1.5 border-purple-500/30 hover:bg-purple-500/10 text-purple-400 h-8 text-xs"
                            >
                              <Upload className="h-3 w-3" />
                              {filledSegments}/{segments.length} Mídias & Prompts
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDispatch(template.id)}
                              disabled={isDispatching || !isManualReady}
                              title={!isManualReady ? `Preencha todas as ${segments.length} mídias para habilitar o despacho (${filledSegments}/${segments.length} prontas)` : ""}
                              className={cn(
                                "gap-1.5 text-white border-none h-8 text-xs transition-all",
                                isManualReady
                                  ? "bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20"
                                  : "bg-purple-950/40 text-purple-400/50 cursor-not-allowed border border-purple-500/10"
                              )}
                            >
                              {isDispatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              {isDispatching ? "Enviando..." : isManualReady ? "Despachar Manual" : `Despachar (${filledSegments}/${segments.length})`}
                            </Button>
                          </>
                        )}

                        <Link href={`/templates/${template.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Abrir template">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Auto Expanded: View Script & Translated Prompts */}
                    {isExpanded && selectedMode === "auto" && (
                      <div className="border-t bg-secondary/5 p-4 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/40">
                          <div>
                            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <Code className="h-3.5 w-3.5" /> Roteiro e Prompts (Automático)
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Estes prompts e falas serão processados e gerados automaticamente ao despachar para o n8n.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportRoteiro(template)}
                            className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 h-7 text-[11px]"
                          >
                            <Copy className="h-3 w-3" />
                            Exportar Roteiro
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {segments.map((seg: any, idx: number) => (
                            <div key={idx} className="bg-card rounded-lg border p-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary bg-primary/5">
                                  #{idx + 1} · {seg.timestamp} · {seg.segment_type}
                                </Badge>
                                {seg.emotion && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase italic">
                                    {seg.emotion}
                                  </Badge>
                                )}
                              </div>
                              {seg.voiceover?.text && (
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                                    <Mic2 className="h-2.5 w-2.5" /> Locução
                                  </p>
                                  <p className="text-xs italic text-foreground/80 leading-relaxed">&ldquo;{seg.voiceover?.text}&rdquo;</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                                <TranslatedPrompt
                                  text={seg.visual_content?.image_prompt}
                                  label="Prompt de Imagem"
                                  icon={ImageIcon}
                                  colorClass="text-blue-400"
                                  isImagePrompt
                                />
                                <TranslatedPrompt
                                  text={seg.visual_content?.animation_instructions}
                                  label="Animação / Movimento"
                                  icon={Video}
                                  colorClass="text-purple-400"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Expanded: Script, Prompts & Scene Media Upload */}
                    {isExpanded && selectedMode === "manual" && (
                      <div className="border-t bg-secondary/5 p-4 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/40">
                          <div>
                            <p className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5" /> Roteiro, Prompts e Mídias por Cena
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Copie os prompts em inglês para sua IA de escolha (ou traduza para PT-BR), faça o upload das mídias por cena e despache.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportRoteiro(template)}
                              className="gap-1.5 border-purple-500/30 hover:bg-purple-500/10 text-purple-400 h-7 text-[11px]"
                            >
                              <Copy className="h-3 w-3" />
                              Exportar Roteiro
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDispatch(template.id)}
                              disabled={isDispatching || !isManualReady}
                              title={!isManualReady ? `Preencha todas as ${segments.length} mídias para habilitar o despacho (${filledSegments}/${segments.length} prontas)` : ""}
                              className={cn(
                                "gap-1.5 text-white border-none h-7 text-[11px] transition-all",
                                isManualReady
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "bg-purple-950/40 text-purple-400/50 cursor-not-allowed border border-purple-500/10"
                              )}
                            >
                              {isDispatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              {isDispatching ? "Enviando..." : isManualReady ? "Despachar Manual p/ n8n" : `Aguardando Mídias (${filledSegments}/${segments.length})`}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {segments.map((seg: any, idx: number) => {
                            const isUploadingThis = uploadingIdx?.templateId === template.id && uploadingIdx?.idx === idx
                            return (
                              <div key={idx} className="bg-card rounded-lg border p-3.5 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary bg-primary/5">
                                      #{idx + 1} · {seg.timestamp}
                                    </Badge>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                      {seg.segment_type}
                                    </span>
                                  </div>
                                  {seg.custom_media_url ? (
                                    <Badge variant="outline" className="text-[9px] h-5 px-2 border-emerald-500 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Mídia Carregada
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[9px] h-5 px-2 text-amber-400 bg-amber-500/10 border-amber-500/20">
                                      Sem Mídia Manual
                                    </Badge>
                                  )}
                                </div>

                                {/* Voiceover */}
                                {seg.voiceover?.text && (
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                                      <Mic2 className="h-2.5 w-2.5" /> Locução
                                    </p>
                                    <p className="text-xs italic text-foreground/80 leading-relaxed">&ldquo;{seg.voiceover?.text}&rdquo;</p>
                                  </div>
                                )}

                                {/* Prompts em Inglês com botão de tradução PT-BR */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                                  <TranslatedPrompt
                                    text={seg.visual_content?.image_prompt}
                                    label="Prompt de Imagem"
                                    icon={ImageIcon}
                                    colorClass="text-blue-400"
                                    isImagePrompt
                                  />
                                  <TranslatedPrompt
                                    text={seg.visual_content?.animation_instructions}
                                    label="Animação / Movimento"
                                    icon={Video}
                                    colorClass="text-purple-400"
                                  />
                                </div>

                                {/* Media Upload Controls */}
                                <div className="pt-2 border-t border-border/40 space-y-1.5">
                                  <label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-purple-400">
                                      <Upload className="h-3 w-3" /> Mídia da Cena (Cole a URL ou Faça Upload)
                                    </span>
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Cole a URL da mídia gerada..."
                                      value={seg.custom_media_url || ""}
                                      onChange={(e) => handleSegmentMedia(template, idx, e.target.value)}
                                      className="text-xs h-8 rounded-lg border bg-input px-3 font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors flex-1"
                                    />
                                    <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold cursor-pointer transition-colors shrink-0">
                                      {isUploadingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                      <span>{isUploadingThis ? "..." : "Upload Arquivo"}</span>
                                      <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        disabled={!!isUploadingThis}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleFileUpload(template, idx, file)
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>

                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Histórico Global Recente */}
        <Card className="border-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-500" />
              PRODUÇÕES RECENTES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px] pr-3">
              <div className="space-y-2.5">
                {recentHistory.length > 0 ? (
                  recentHistory.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/5 gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {h.status === "completed" ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 shrink-0">
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Concluído</span>
                          </div>
                        ) : h.status === "failed" ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 shrink-0">
                            <AlertCircle className="h-3 w-3 text-rose-400" />
                            <span>Falhou</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 shrink-0 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                            <span>Processando...</span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.dispatched_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={h.status?.includes("auto") ? "secondary" : "default"} className="text-[8px] uppercase">
                          {h.status === "sent_auto" ? "Auto" : "Manual"}
                        </Badge>
                        {h.video_url && <VideoPlayerModal videoUrl={h.video_url} title="Produção" />}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-rose-400 opacity-70 hover:opacity-100"
                          onClick={() => handleDeleteHistory(h.id)}
                          title="Excluir do histórico"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-30">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-[10px]">Nenhuma produção realizada ainda.</p>
                    <p className="text-[9px] mt-1">Use um dos modos acima para iniciar.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
