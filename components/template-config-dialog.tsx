"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  LayoutTemplate, 
  Music, 
  Mic2, 
  Calendar, 
  Users, 
  Save, 
  Loader2, 
  Video, 
  ImageIcon, 
  Sparkles,
  Type
} from "lucide-react"
import { toast } from "sonner"
import { getBlotatoAccountsAction, saveRemodelingTemplateAction } from "@/app/actions"

interface TemplateConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: any
  analysis: any
  script: string
  onSuccess: () => void
}

export function TemplateConfigDialog({
  open,
  onOpenChange,
  video,
  analysis,
  script,
  onSuccess,
}: TemplateConfigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [fetchingAccounts, setFetchingAccounts] = useState(false)
  const [activeTab, setActiveTab] = useState("config")

  // Form states
  const [name, setName] = useState("")
  const [format, setFormat] = useState<"horizontal" | "vertical">("vertical")
  const [hasMusic, setHasMusic] = useState(true)
  const [musicStyle, setMusicStyle] = useState("epic")
  const [voiceType, setVoiceType] = useState("masculine_br")
  const [frequency, setFrequency] = useState("daily")
  const [intervalDays, setIntervalDays] = useState(1)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  const structuredSegments = analysis?.remodeling_template?.script_base || []

  useEffect(() => {
    if (open) {
      setName(`Template: ${video.title?.slice(0, 30)}...` || "Novo Template")
      fetchAccounts()
      
      // Auto-configure based on AI analysis
      if (analysis?.detected_audio_type === 'music_only') {
        setVoiceType("none")
      } else if (analysis?.detected_audio_type === 'voice') {
        setVoiceType("narrator")
      }

      if (analysis?.remodeling_template?.music_style === 'none' || analysis?.remodeling_template?.music_style === 'Sem música') {
        setMusicStyle("none")
      } else if (analysis?.remodeling_template?.music_style) {
        setMusicStyle("epic")
      }
    }
  }, [open, video, analysis])

  async function fetchAccounts() {
    setFetchingAccounts(true)
    try {
      const result = await getBlotatoAccountsAction()
      const data = result || []
      setAccounts(data)
      
      // Auto-select if there's only one account
      if (data.length === 1 && selectedAccounts.length === 0) {
        setSelectedAccounts([data[0].id])
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err)
    } finally {
      setFetchingAccounts(false)
    }
  }

  async function handleSave() {
    if (!name) {
      toast.error("Por favor, dê um nome ao template.")
      return
    }

    setLoading(true)
    try {
      const result = await saveRemodelingTemplateAction({
        video_id: video.id,
        video_title: video.title,
        video_thumbnail: video.thumbnail,
        name,
        template_data: analysis,
        generated_script: script,
        format,
        has_music: hasMusic,
        music_style: musicStyle,
        voice_type: voiceType,
        post_frequency: frequency,
        post_interval_days: intervalDays,
        is_active: true,
        target_accounts: selectedAccounts,
        tags: [],
      })

      if (result.success) {
        toast.success("Template salvo com sucesso!")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Falha ao salvar template.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar template.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Configurar Template de Remodelagem
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start h-10 bg-transparent gap-6 p-0">
              <TabsTrigger 
                value="config" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2"
              >
                Configurações
              </TabsTrigger>
              <TabsTrigger 
                value="roteiro" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 flex items-center gap-1.5"
              >
                Roteiro de Produção
                {structuredSegments.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">{structuredSegments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="config" className="mt-0 space-y-6">
                {/* Template Name */}
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do Template</Label>
                  <Input
                    id="template-name"
                    placeholder="Ex: Dark Storytelling - Mistérios"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Format */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                      Formato
                    </Label>
                    <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                      <SelectTrigger className="bg-secondary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Curto (9:16)</SelectItem>
                        <SelectItem value="horizontal">Longo (16:9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Voice */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Mic2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Voz Base
                    </Label>
                    <Select value={voiceType} onValueChange={setVoiceType}>
                      <SelectTrigger className="bg-secondary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculine_br">Masculina BR</SelectItem>
                        <SelectItem value="feminine_br">Feminina BR</SelectItem>
                        <SelectItem value="narrator">Narrador Profundo</SelectItem>
                        <SelectItem value="none">Sem Voz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Music */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-muted-foreground" />
                      Música
                    </Label>
                    <Select value={musicStyle} onValueChange={setMusicStyle}>
                      <SelectTrigger className="bg-secondary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="epic">Épica</SelectItem>
                        <SelectItem value="lo-fi">Lo-fi Relaxante</SelectItem>
                        <SelectItem value="ambient">Ambiente</SelectItem>
                        <SelectItem value="dramatic">Dramática</SelectItem>
                        <SelectItem value="none">Sem música</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Frequency */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Frequência Postagem
                    </Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="bg-secondary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Accounts */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Contas de Destino (Automática via Blotato)
                  </Label>
                  {fetchingAccounts ? (
                    <div className="flex items-center justify-center p-8 bg-secondary/10 rounded-xl border border-dashed">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : accounts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 border rounded-xl p-4 bg-secondary/10 max-h-40 overflow-y-auto">
                      {accounts.map((acc) => (
                        <div key={acc.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background transition-colors">
                          <Checkbox
                            id={`acc-${acc.id}`}
                            checked={selectedAccounts.includes(acc.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedAccounts([...selectedAccounts, acc.id])
                              else setSelectedAccounts(selectedAccounts.filter((id) => id !== acc.id))
                            }}
                          />
                          <label
                            htmlFor={`acc-${acc.id}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            <span className="font-bold uppercase text-[10px] text-primary mr-2">{acc.platform}</span>
                            {acc.label || acc.page_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-secondary/10 rounded-xl border border-dashed">
                      <p className="text-sm text-muted-foreground">Nenhuma conta vinculada.</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Conecte suas redes na página de Credenciais.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="roteiro" className="mt-0">
                {structuredSegments.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4 bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase">Blueprint de Produção IA</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{structuredSegments.length} Segmentos</span>
                    </div>

                    {structuredSegments.map((seg: any, idx: number) => (
                      <div key={idx} className="group relative border border-border bg-card/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between bg-secondary/30 px-4 py-2 border-b border-border">
                          <span className="text-[10px] font-bold text-muted-foreground">{seg.segment_type || 'SEGMENTO'}</span>
                          <span className="text-xs font-mono font-bold text-primary">{seg.timestamp}</span>
                        </div>
                        <div className="p-4 space-y-4">
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
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <ImageIcon className="h-3 w-3 text-blue-500" />
                                <span className="text-[9px] font-bold text-blue-500 uppercase">Prompt de Imagem</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-3 bg-secondary/20 p-2 rounded">{seg.visual_content?.image_prompt}</p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Video className="h-3 w-3 text-purple-500" />
                                <span className="text-[9px] font-bold text-purple-500 uppercase">Animação / Movimento</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground bg-secondary/20 p-2 rounded">{seg.visual_content?.animation_instructions}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                      <Type className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Nenhum roteiro formatado</p>
                      <p className="text-xs text-muted-foreground max-w-[200px]">Este vídeo não possui segmentos detalhados no momento.</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="p-6 pt-2 border-t bg-secondary/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2 min-w-[140px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
