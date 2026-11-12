"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  getRemodelingTemplateByIdAction, 
  deleteRemodelingTemplateAction, 
  getBlotatoAccountsAction,
  translatePromptAction,
} from "@/app/actions"
import { 
  ChevronLeft, 
  LayoutTemplate, 
  Copy, 
  Check, 
  Trash2, 
  Video, 
  ImageIcon, 
  Mic2, 
  Sparkles, 
  Music, 
  Clock,
  ExternalLink,
  Code,
  Zap,
  Target,
  BrainCircuit,
  Settings,
  Instagram,
  Facebook,
  Youtube as YoutubeIcon,
  Globe,
  Languages,
  Loader2,
  X,
  Plus,
  PlayCircle,
  Clapperboard,
  Download,
  Edit
} from "lucide-react"
import { TemplateConfigDialog } from "@/components/template-config-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function VideoPlayerModal({ videoUrl, title }: { videoUrl: string, title: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloading(true)
    try {
      const res = await fetch(videoUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `darktube_render_${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(videoUrl, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500">
            <PlayCircle className="h-3 w-3" />
            Ver Vídeo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none shadow-2xl">
          <DialogHeader className="p-3 sm:p-4 bg-zinc-900/50 backdrop-blur-md border-b border-white/10 flex flex-row items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
              <Clapperboard className="h-4 w-4 text-emerald-500" />
              Visualização de Produção
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="h-8 text-xs gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black font-semibold mr-6"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Baixar MP4
            </Button>
          </DialogHeader>
          <div className="aspect-video w-full bg-black flex items-center justify-center">
            <video 
              src={videoUrl} 
              controls 
              autoPlay 
              className="max-h-[70vh] w-full"
            />
          </div>
          <div className="p-3 sm:p-4 bg-zinc-900/50 border-t border-white/10 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="h-8 text-xs gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black font-semibold"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Baixar MP4
            </Button>
            <Button size="sm" variant="ghost" asChild className="text-white hover:bg-white/10">
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-3 w-3" />
                Abrir em Nova Aba
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
        className="h-7 text-[10px] gap-1 border-blue-500/30 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300"
      >
        {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        Baixar
      </Button>
    </div>
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
    <div className="space-y-1.5 flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", colorClass)} />
          <span className={cn("text-[9px] font-bold uppercase", colorClass)}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isImagePrompt && (
            <button
              onClick={() => handleCopy('midjourney')}
              className="text-[9px] font-mono text-zinc-400 hover:text-primary transition-colors flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded border border-border/40"
              title="Copiar formatado para Midjourney (/imagine prompt:...)"
            >
              MJ 9:16
            </button>
          )}
          <button
            onClick={handleTranslate}
            disabled={loading}
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded border border-border/40"
          >
            {loading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Languages className="h-2.5 w-2.5" />}
            {showTranslation ? "Original" : "PT-BR"}
          </button>
          <button
            onClick={() => handleCopy('plain')}
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 bg-secondary/50 px-1.5 py-0.5 rounded border border-border/40"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-mono bg-background/50 p-2.5 rounded-lg border border-border/40 leading-relaxed break-words">
        {showTranslation && translated ? translated : text}
      </p>
    </div>
  )
}

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])

  useEffect(() => {
    fetchTemplate()
  }, [id])

  async function fetchTemplate() {
    setLoading(true)
    try {
      const data = await getRemodelingTemplateByIdAction(id)
      if (!data) {
        toast.error("Template não encontrado.")
        router.push("/templates")
        return
      }
      setTemplate(data)
      
      if (data.target_accounts && data.target_accounts.length > 0) {
        const allUserAccounts = await getBlotatoAccountsAction()
        const matched = allUserAccounts.filter((acc: any) => {
           return data.target_accounts.includes(acc.id) || 
                  data.target_accounts.includes(acc.account_id) ||
                  (acc.page_id && data.target_accounts.includes(acc.page_id)) ||
                  data.target_accounts.some((t: string) => t.includes(acc.account_id))
        })
        setLinkedAccounts(matched)
      }
    } catch (err) {
      toast.error("Erro ao carregar detalhes do template.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Deseja realmente excluir este blueprint de produção?")) return
    try {
      await deleteRemodelingTemplateAction(id)
      toast.success("Template removido.")
      router.push("/templates")
    } catch (err) {
      toast.error("Erro ao remover template.")
    }
  }

  const copyToClipboard = () => {
    if (!template) return
    const jsonStr = JSON.stringify(template.template_data, null, 2)
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    toast.success("JSON copiado para o n8n!")
    setTimeout(() => setCopied(false), 2000)
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-3 w-3 text-pink-500" />
      case 'facebook': return <Facebook className="h-3 w-3 text-blue-600" />
      case 'youtube': return <YoutubeIcon className="h-3 w-3 text-red-500" />
      default: return <Globe className="h-3 w-3" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground animate-pulse">Carregando Hub de Produção...</p>
        </div>
      </div>
    )
  }

  if (!template) return null

  const analysis = template.template_data?.remodeling_template || template.template_data || {}
  const segments = analysis?.script_base || []
  const aiStack = analysis?.ai_stack || {}

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-3 xs:p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1 min-w-0">
            <Link
              href="/templates"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors mb-2"
            >
              <ChevronLeft className="h-3 w-3" />
              Voltar para Meus Templates
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate max-w-full">{template.name}</h1>
              <Badge variant={template.is_active ? "default" : "secondary"} className="shrink-0">
                {template.is_active ? "Ativo" : "Pausado"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 truncate">
              <Video className="h-4 w-4 shrink-0" />
              <span className="truncate">Baseado em: {template.video_title}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setIsEditing(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm">
              <Edit className="h-4 w-4" />
              Editar Configurações
            </Button>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar Blueprint"}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        {/* Blueprint */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  ESTRATÉGIA DE MINERAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Viabilidade</p>
                    <p className="text-sm font-bold mt-1 text-primary">{analysis.feasibility}</p>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Ritmo</p>
                    <p className="text-sm font-bold mt-1">{analysis.pacing}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Justificativa IA</p>
                  <ScrollArea className="h-[120px] w-full rounded-md pr-4">
                    <p className="text-xs leading-relaxed text-muted-foreground italic">
                      &ldquo;{analysis.justification}&rdquo;
                    </p>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  STACK DE PRODUÇÃO (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                {([
                  { icon: ImageIcon, label: "Imagens", color: "text-blue-500", val: aiStack.image || 'Flux Pro' },
                  { icon: Video, label: "Vídeo", color: "text-purple-500", val: aiStack.video || 'Kling AI' },
                  { icon: Mic2, label: "Voz", color: "text-emerald-500", val: aiStack.voice || 'ElevenLabs' },
                  { icon: Music, label: "Música", color: "text-orange-500", val: aiStack.music || 'Udio / Suno' },
                ] as const).map(({ icon: Icon, label, color, val }) => (
                  <div key={label} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2 text-xs">
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                      <span>{label}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">{val}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-secondary/20">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  CONFIGURAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 grid grid-cols-2 gap-y-4 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Formato</p>
                  <Badge variant="secondary" className="uppercase">{template.format}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Voz Sugerida</p>
                  <p className="font-bold">{template.voice_type}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Frequência</p>
                  <p className="font-bold">{template.post_frequency}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Horários</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.post_times && template.post_times.length > 0 ? (
                      template.post_times.map((t: string) => (
                        <Badge key={t} variant="outline" className="px-1 text-[9px] bg-background/40">{t}</Badge>
                      ))
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">Nenhum</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Canais Vinculados</p>
                  <div className="space-y-1.5 mt-1.5">
                    {linkedAccounts.length > 0 ? (
                      linkedAccounts.map((acc: any) => (
                        <div key={acc.id} className="flex items-center gap-2 px-2 py-1.5 bg-background/50 rounded-md border border-border/10">
                          {getPlatformIcon(acc.platform)}
                          <span className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis font-bold">
                            {acc.label || acc.page_name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 border border-dashed rounded-md bg-background/20 text-center">
                        <span className="text-[9px] text-muted-foreground italic">Nenhuma conta selecionada</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Blueprint */}
          <div className="lg:col-span-2 space-y-0 min-w-0">
            <div className="flex items-center justify-between bg-zinc-900 text-zinc-100 p-3 sm:p-4 rounded-t-xl border-x border-t flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold">BLUEPRINT DE PRODUÇÃO</h3>
                  <p className="text-[10px] text-zinc-400">Roteiro técnico estruturado para automação</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!segments.length) return
                    const allPrompts = segments
                      .map((seg: any, i: number) => `[CENA ${i + 1} - ${seg.segment_type || 'SLIDE'}]:\n${seg.visual_content?.image_prompt || ''}`)
                      .filter(Boolean)
                      .join('\n\n')
                    navigator.clipboard.writeText(allPrompts)
                    toast.success("Todos os prompts visuais do blueprint foram copiados!")
                  }}
                  className="h-7 text-[10px] gap-1.5 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  <Copy className="h-3 w-3 text-primary" />
                  <span className="hidden xs:inline">Copiar Prompts</span>
                </Button>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{segments.length} Segs</span>
                </div>
              </div>
            </div>
            <div className="space-y-0 border rounded-b-xl overflow-hidden bg-card">
              {segments.map((seg: any, idx: number) => (
                <div key={idx} className="group flex flex-col xs:flex-row border-b last:border-0 hover:bg-secondary/30 transition-all">
                  <div className="xs:w-20 md:w-24 bg-secondary/50 flex xs:flex-col items-center justify-between xs:justify-center border-b xs:border-b-0 xs:border-r p-2 xs:p-4 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                    <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary bg-primary/5">
                      {seg.timestamp}
                    </Badge>
                  </div>
                  <div className="flex-1 p-3 sm:p-5 space-y-4 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {seg.segment_type || 'Capítulo'}
                      </span>
                      <div className="flex items-center gap-2">
                        {seg.custom_media_url ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 leading-none border-emerald-500 text-emerald-400 bg-emerald-500/10">
                            Mídia Manual
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 leading-none">
                            IA Automática
                          </Badge>
                        )}
                        {seg.emotion && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 leading-none italic uppercase">
                            {seg.emotion}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Mic2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase">Locução ({seg.voiceover?.style})</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed italic break-words">&ldquo;{seg.voiceover?.text}&rdquo;</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-border/50">
                      <TranslatedPrompt
                        text={seg.visual_content?.image_prompt}
                        label="Prompt de Imagem"
                        icon={ImageIcon}
                        colorClass="text-blue-500"
                        isImagePrompt
                      />
                      <TranslatedPrompt
                        text={seg.visual_content?.animation_instructions}
                        label="Animação / Movimento"
                        icon={Video}
                        colorClass="text-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {segments.length === 0 && (
                <div className="p-12 sm:p-20 text-center flex flex-col items-center gap-4">
                  <BrainCircuit className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Este blueprint não contém segmentos estruturados.</p>
                  <Button variant="outline" size="sm" onClick={() => router.push("/minerar")}>
                    Gerar novo script
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE EDIÇÃO DE TEMPLATE */}
      {isEditing && template && (
        <TemplateConfigDialog
          open={isEditing}
          onOpenChange={setIsEditing}
          initialData={template}
          onSuccess={fetchTemplate}
          video={template.video_data || { title: template.video_title, id: template.video_id }}
          analysis={template.template_data || {}}
          script=""
        />
      )}
    </div>
  )
}
