"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  getRemodelingTemplateByIdAction, 
  deleteRemodelingTemplateAction, 
  getBlotatoAccountsAction,
  getProductionHistoryAction,
  sendToN8NAction,
  translatePromptAction
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
  Send,
  History,
  Languages,
  Loader2,
  X,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function TranslatedPrompt({ text, label, icon: Icon, colorClass }: { text: string, label: string, icon: any, colorClass: string }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (translated) {
      setShowOriginal(!showOriginal)
      return
    }
    setLoading(true)
    try {
      const { success, translation } = await translatePromptAction(text)
      if (success) {
        setTranslated(translation)
        setShowOriginal(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", colorClass)} />
          <span className={cn("text-[9px] font-bold uppercase", colorClass)}>{label}</span>
        </div>
        <button 
          onClick={handleTranslate}
          className="text-[9px] flex items-center gap-1 text-primary hover:underline font-bold"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <>
              <Languages className="h-2.5 w-2.5" />
              {translated ? (showOriginal ? "Ver Tradução" : "Ver Original") : "Traduzir"}
            </>
          )}
        </button>
      </div>
      <p className={cn(
        "text-[11px] p-2 rounded transition-all duration-300",
        showOriginal ? "text-muted-foreground bg-secondary/10" : "text-primary bg-primary/5 border border-primary/20 italic"
      )}>
        {showOriginal ? text : translated}
      </p>
    </div>
  )
}

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

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
      
      // Se tiver contas vinculadas, buscar os detalhes delas
      if (data.target_accounts && data.target_accounts.length > 0) {
        const allUserAccounts = await getBlotatoAccountsAction()
        // O usuário seleciona pelo account_id + platform (+ page_id opcional)
        // Precisamos garantir que o filtro encontre as contas corretas
        const matched = allUserAccounts.filter((acc: any) => {
           // Checa se o ID interno OU o account_id OU o page_id estão na lista de selecionados
           return data.target_accounts.includes(acc.id) || 
                  data.target_accounts.includes(acc.account_id) ||
                  (acc.page_id && data.target_accounts.includes(acc.page_id)) ||
                  // Caso o target_accounts tenha o formato "platform:id" ou similar usado em alguns fluxos
                  data.target_accounts.some((t: string) => t.includes(acc.account_id))
        })
        setLinkedAccounts(matched)
      }
      // Fetch history
      const histData = await getProductionHistoryAction(id)
      setHistory(histData)
    } catch (err) {
      toast.error("Erro ao carregar detalhes do template.")
    } finally {
      setLoading(false)
    }
  }

  async function handleManualDispatch() {
    if (dispatching) return
    setDispatching(true)
    try {
      const result = await sendToN8NAction(id)
      if (result.success) {
        toast.success("Despachado para o n8n com sucesso!")
        fetchTemplate() // Refresh history
      } else {
        toast.error(result.error || "Erro ao despachar.")
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.")
    } finally {
      setDispatching(false)
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
      <div className="flex-1 flex items-center justify-center">
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
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <Link 
              href="/templates" 
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors mb-2"
            >
              <ChevronLeft className="h-3 w-3" />
              Voltar para Meus Templates
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Ativo" : "Pausado"}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Video className="h-4 w-4" />
              Baseado em: {template.video_title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
                onClick={handleManualDispatch} 
                disabled={dispatching}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-500/20"
            >
              {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {dispatching ? "Despachando..." : "Despachar p/ n8n"}
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

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(var(--primary), 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(var(--primary), 0.2);
          }
        `}</style>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Summary & Strategy */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  ESTRATÉGIA DE MINERAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                      "{analysis.justification}"
                    </p>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  STACK DE PRODUÇÃO (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span>Imagens</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">{aiStack.image || 'Flux Pro'}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs">
                    <Video className="h-3.5 w-3.5 text-purple-500" />
                    <span>Vídeo</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">{aiStack.video || 'Kling AI'}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs">
                    <Mic2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Voz</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">{aiStack.voice || 'ElevenLabs'}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs">
                    <Music className="h-3.5 w-3.5 text-orange-500" />
                    <span>Música</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">{aiStack.music || 'Udio / Suno'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Config Preview */}
            <Card className="bg-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  CONFIGURAÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-4 text-xs">
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
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Horários Agendados</p>
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
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Horários Agendados</p>
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
                <div>
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

            {/* Production History */}
            <Card className="border-emerald-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-500" />
                  HISTÓRICO DE PRODUÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-3">
                    {history.length > 0 ? (
                      history.map((h: any) => (
                        <div key={h.id} className="p-3 rounded-lg border bg-secondary/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={h.status.includes('auto') ? 'secondary' : 'default'} className="text-[8px] uppercase">
                              {h.status === 'sent_auto' ? 'Automático' : 'Manual'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(h.dispatched_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-medium text-emerald-600 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
                            <Check className="h-3 w-3" />
                            Produção Iniciada (+1 Vídeo Unico)
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 opacity-30">
                        <History className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-[10px]">Nenhum despacho realizado.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Blueprint Segments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between bg-zinc-900 text-zinc-100 p-4 rounded-t-xl border-x border-t">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">BLUEPRINT DE PRODUÇÃO</h3>
                  <p className="text-[10px] text-zinc-400">Roteiro técnico estruturado para automação</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{segments.length} Segmentos</span>
                </div>
              </div>
            </div>

            <div className="space-y-0 border rounded-b-xl overflow-hidden bg-card">
              {segments.map((seg: any, idx: number) => (
                <div key={idx} className="group flex border-b last:border-0 hover:bg-secondary/30 transition-all">
                  {/* Index / Time */}
                  <div className="w-20 md:w-24 bg-secondary/50 flex flex-col items-center justify-center border-r p-4 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground mb-1">#{idx + 1}</span>
                    <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary bg-primary/5">
                      {seg.timestamp}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {seg.segment_type || 'Capítulo'}
                      </span>
                      <div className="flex items-center gap-2">
                        {seg.emotion && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 leading-none italic uppercase">
                            {seg.emotion}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Voiceover */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Mic2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase">Locução ({seg.voiceover?.style})</span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed italic">"{seg.voiceover?.text}"</p>
                    </div>

                    {/* Visual */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                      <TranslatedPrompt 
                        text={seg.visual_content?.image_prompt} 
                        label="Prompt de Imagem" 
                        icon={ImageIcon} 
                        colorClass="text-blue-500" 
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
                <div className="p-20 text-center flex flex-col items-center gap-4">
                  <BrainCircuit className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Este blueprint não contém segmentos estruturados.</p>
                  <Button variant="outline" size="sm" onClick={() => router.push("/minerar")}>
                    Gerar novo script
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
