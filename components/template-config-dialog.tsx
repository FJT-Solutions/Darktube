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
import { LayoutTemplate, Music, Mic2, Calendar, Users, Save, Loader2 } from "lucide-react"
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

  // Form states
  const [name, setName] = useState("")
  const [format, setFormat] = useState<"horizontal" | "vertical">("vertical")
  const [hasMusic, setHasMusic] = useState(true)
  const [musicStyle, setMusicStyle] = useState("epic")
  const [voiceType, setVoiceType] = useState("masculine_br")
  const [frequency, setFrequency] = useState("daily")
  const [intervalDays, setIntervalDays] = useState(1)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setName(`Template: ${video.title.slice(0, 30)}...`)
      fetchAccounts()
    }
  }, [open, video])

  async function fetchAccounts() {
    setFetchingAccounts(true)
    try {
      const result = await getBlotatoAccountsAction()
      setAccounts(result || [])
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            Configurar Template de Remodelagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Template</Label>
            <Input
              id="template-name"
              placeholder="Ex: Dark Storytelling - Mistérios"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Format */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                Formato
              </Label>
              <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                <SelectTrigger>
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
                Voz
              </Label>
              <Select value={voiceType} onValueChange={setVoiceType}>
                <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            {/* Music */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-muted-foreground" />
                Música
              </Label>
              <Select value={musicStyle} onValueChange={setMusicStyle}>
                <SelectTrigger>
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
                Frequência
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
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
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Contas de Destino (Blotato)
            </Label>
            {fetchingAccounts ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 border rounded-lg p-3 max-h-32 overflow-y-auto bg-secondary/20">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center space-x-2">
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
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {acc.label || acc.platform} {acc.page_name ? `(${acc.page_name})` : ""}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic bg-secondary/20 p-3 rounded-lg border border-dashed text-center">
                Nenhuma conta Blotato vinculada. Vincule uma conta para automação.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
