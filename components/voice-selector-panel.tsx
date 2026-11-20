"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Mic, PlusCircle, RefreshCw, Upload, Volume2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type VoiceProviderOption = "" | "external" | "elevenlabs" | "edge" | "openai"

export interface VoiceSelectionState {
  voiceProvider: VoiceProviderOption
  voiceId: string
  voiceName: string
  audioPathOrUrl: string
}

export const EMPTY_VOICE_SELECTION: VoiceSelectionState = {
  voiceProvider: "",
  voiceId: "",
  voiceName: "",
  audioPathOrUrl: "",
}

export function validateVoiceStateClient(sel: VoiceSelectionState): string | null {
  if (!sel.voiceProvider) {
    return "Escolha primeiro a origem da voz (Áudio Externo, ElevenLabs, Edge PT-BR ou OpenAI) antes de renderizar."
  }
  if (sel.voiceProvider === "external" && !sel.audioPathOrUrl.trim()) {
    return "Você selecionou Áudio Externo: envie um arquivo ou informe a URL do áudio."
  }
  if (sel.voiceProvider === "elevenlabs" && !sel.voiceId.trim()) {
    return "Você selecionou ElevenLabs: escolha uma voz existente ou crie/clone uma nova voz."
  }
  if (sel.voiceProvider === "edge" && !sel.voiceId.trim()) {
    return "Escolha qual voz neural do Edge TTS (PT-BR) deseja usar."
  }
  if (sel.voiceProvider === "openai" && !sel.voiceId.trim()) {
    return "Escolha qual voz da OpenAI deseja usar."
  }
  return null
}

interface VoiceCatalogResponse {
  elevenlabsConnected: boolean
  openaiConnected: boolean
  elevenlabsError?: string
  elevenlabsVoices: Array<{ id: string; name: string; category: string; previewUrl?: string }>
  edgeVoices: Array<{ id: string; name: string; gender: "male" | "female"; style: string }>
  openaiVoices: Array<{ id: string; name: string; gender: "male" | "female"; note: string }>
}

export function VoiceSelectorPanel({
  value,
  onChange,
  compact = false,
  title = "Seleção Explícita de Voz (sem cascata automática)",
}: {
  value: VoiceSelectionState
  onChange: (next: VoiceSelectionState) => void
  compact?: boolean
  title?: string
}) {
  const [catalog, setCatalog] = useState<VoiceCatalogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingExternal, setUploadingExternal] = useState(false)
  const [showCloneForm, setShowCloneForm] = useState(false)
  const [cloneName, setCloneName] = useState("")
  const [cloneDesc, setCloneDesc] = useState("")
  const [cloneFile, setCloneFile] = useState<File | null>(null)
  const [cloning, setCloning] = useState(false)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/studio-3d/voices", { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setCatalog(data)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  async function handleUploadExternalFile(file: File | null) {
    if (!file) return
    setUploadingExternal(true)
    try {
      const form = new FormData()
      form.append("action", "upload_external")
      form.append("audio", file)
      const res = await fetch("/api/studio-3d/voices", { method: "POST", body: form })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao enviar áudio externo.")
        return
      }
      onChange({
        voiceProvider: "external",
        voiceId: "",
        voiceName: file.name,
        audioPathOrUrl: data.audioUrl,
      })
      toast.success(`Áudio "${file.name}" carregado para a VPS!`)
    } catch {
      toast.error("Erro ao enviar arquivo de áudio.")
    } finally {
      setUploadingExternal(false)
    }
  }

  async function handleCloneElevenLabs() {
    if (!cloneName.trim()) {
      toast.error("Informe um nome para a nova voz da ElevenLabs.")
      return
    }
    if (!cloneFile) {
      toast.error("Selecione um arquivo de áudio (.mp3, .wav ou .webm) com amostra limpa da voz.")
      return
    }
    setCloning(true)
    try {
      const form = new FormData()
      form.append("action", "clone_elevenlabs")
      form.append("name", cloneName.trim())
      if (cloneDesc.trim()) form.append("description", cloneDesc.trim())
      form.append("audio", cloneFile)
      const res = await fetch("/api/studio-3d/voices", { method: "POST", body: form })
      const data = await res.json()
      if (!data?.success) {
        toast.error(data?.error || "Falha ao clonar voz na ElevenLabs.")
        return
      }
      toast.success(`Voz "${data.name}" criada na ElevenLabs e selecionada!`)
      setShowCloneForm(false)
      setCloneName("")
      setCloneDesc("")
      setCloneFile(null)
      await loadCatalog()
      onChange({
        voiceProvider: "elevenlabs",
        voiceId: data.voiceId,
        voiceName: data.name,
        audioPathOrUrl: "",
      })
    } catch {
      toast.error("Erro de comunicação ao clonar voz na ElevenLabs.")
    } finally {
      setCloning(false)
    }
  }

  const selectedEleven = catalog?.elevenlabsVoices?.find((v) => v.id === value.voiceId)

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Mic className="h-3.5 w-3.5 text-primary" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {value.voiceProvider ? (
            <Badge variant="secondary" className="text-[10px]">
              {value.voiceProvider === "external"
                ? "Áudio Externo"
                : value.voiceProvider === "elevenlabs"
                  ? `ElevenLabs: ${value.voiceName || value.voiceId || "selecione"}`
                  : value.voiceProvider === "edge"
                    ? `Edge PT-BR: ${value.voiceName || value.voiceId}`
                    : `OpenAI: ${value.voiceId}`}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
              Escolha obrigatória
            </Badge>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={loadCatalog}
            disabled={loading}
            title="Atualizar vozes disponíveis"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Select
        value={value.voiceProvider}
        onValueChange={(nextProv) => {
          const prov = nextProv as VoiceProviderOption
          if (prov === "edge") {
            const first = catalog?.edgeVoices?.[0]
            onChange({
              voiceProvider: "edge",
              voiceId: first?.id || "pt-BR-FranciscaNeural",
              voiceName: first?.name || "Francisca Neural (PT-BR)",
              audioPathOrUrl: "",
            })
          } else if (prov === "openai") {
            onChange({
              voiceProvider: "openai",
              voiceId: "onyx",
              voiceName: "Onyx (OpenAI)",
              audioPathOrUrl: "",
            })
          } else {
            onChange({
              voiceProvider: prov,
              voiceId: "",
              voiceName: "",
              audioPathOrUrl: prov === "external" ? value.audioPathOrUrl : "",
            })
          }
        }}
      >
        <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
          <SelectValue placeholder="Perguntar / escolher origem da voz antes de gerar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="external">1. Áudio Externo (enviar seu áudio gravado / MP3)</SelectItem>
          <SelectItem value="elevenlabs">2. ElevenLabs (usar voz da conta ou clonar nova voz)</SelectItem>
          <SelectItem value="edge">3. Edge TTS PT-BR (vozes neurais brasileiras — $0)</SelectItem>
          <SelectItem value="openai">4. OpenAI TTS (opcional — sotaque internacional)</SelectItem>
        </SelectContent>
      </Select>

      {value.voiceProvider === "external" && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/50 shrink-0">
              {uploadingExternal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadingExternal ? "Enviando..." : "Enviar arquivo de áudio"}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleUploadExternalFile(e.target.files?.[0] || null)}
              />
            </label>
            <Input
              className="h-8 text-xs"
              value={value.audioPathOrUrl}
              onChange={(e) =>
                onChange({
                  ...value,
                  audioPathOrUrl: e.target.value,
                  voiceName: e.target.value.split("/").pop() || "Áudio externo",
                })
              }
              placeholder="Ou cole /api/storage/... ou URL https://... do áudio"
            />
          </div>
          {value.audioPathOrUrl && (
            <audio controls src={value.audioPathOrUrl} className="w-full h-8" />
          )}
        </div>
      )}

      {value.voiceProvider === "elevenlabs" && (
        <div className="space-y-2 pt-1">
          {!catalog?.elevenlabsConnected && (
            <p className="text-[11px] text-amber-600">
              Chave ElevenLabs não detectada nas suas Credenciais (`/credentials`). Cadastre sua chave ou escolha outra origem.
            </p>
          )}
          {catalog?.elevenlabsError && (
            <p className="text-[11px] text-destructive">{catalog.elevenlabsError}</p>
          )}
          {catalog?.elevenlabsVoices && catalog.elevenlabsVoices.length > 0 && (
            <div className="space-y-1.5">
              <Select
                value={value.voiceId}
                onValueChange={(vid) => {
                  const found = catalog.elevenlabsVoices.find((v) => v.id === vid)
                  onChange({
                    ...value,
                    voiceId: vid,
                    voiceName: found?.name || vid,
                  })
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Escolha uma voz ElevenLabs da sua conta..." />
                </SelectTrigger>
                <SelectContent>
                  {catalog.elevenlabsVoices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEleven?.previewUrl && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Volume2 className="h-3.5 w-3.5 shrink-0" />
                  <audio controls preload="none" src={selectedEleven.previewUrl} className="w-full h-7" />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              className="h-7 text-xs font-mono flex-1"
              value={value.voiceId}
              onChange={(e) => onChange({ ...value, voiceId: e.target.value, voiceName: e.target.value })}
              placeholder="Ou cole o voice_id manual da ElevenLabs..."
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px] shrink-0"
              onClick={() => setShowCloneForm((s) => !s)}
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              {showCloneForm ? "Fechar clonagem" : "Criar / Clonar Voz"}
            </Button>
          </div>

          {showCloneForm && (
            <div className="rounded-md border bg-background p-2.5 space-y-2 text-xs">
              <p className="font-medium">Clonar nova voz na sua conta ElevenLabs:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  className="h-7 text-xs"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="Nome da voz (ex: Narrador Dark)"
                />
                <Input
                  className="h-7 text-xs"
                  value={cloneDesc}
                  onChange={(e) => setCloneDesc(e.target.value)}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="file"
                  accept="audio/*"
                  className="text-[11px] flex-1"
                  onChange={(e) => setCloneFile(e.target.files?.[0] || null)}
                />
                <Button type="button" size="sm" className="h-7 text-xs" disabled={cloning} onClick={handleCloneElevenLabs}>
                  {cloning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PlusCircle className="h-3 w-3 mr-1" />}
                  Criar Voz na ElevenLabs
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {value.voiceProvider === "edge" && (
        <div className="pt-1">
          <Select
            value={value.voiceId}
            onValueChange={(vid) => {
              const found = catalog?.edgeVoices?.find((v) => v.id === vid)
              onChange({
                ...value,
                voiceId: vid,
                voiceName: found?.name || vid,
              })
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Escolha a voz neural PT-BR..." />
            </SelectTrigger>
            <SelectContent>
              {(catalog?.edgeVoices || [
                { id: "pt-BR-FranciscaNeural", name: "Francisca Neural (PT-BR)", gender: "female", style: "Natural, clara" },
                { id: "pt-BR-AntonioNeural", name: "Antônio Neural (PT-BR)", gender: "male", style: "Documentário" },
              ]).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} — {v.style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.voiceProvider === "openai" && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] text-amber-600">
            Nota: as vozes OpenAI (`tts-1-hd`) têm leve sotaque internacional em PT-BR.
          </p>
          <Select
            value={value.voiceId}
            onValueChange={(vid) => {
              const found = catalog?.openaiVoices?.find((v) => v.id === vid)
              onChange({
                ...value,
                voiceId: vid,
                voiceName: found?.name || vid,
              })
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Escolha a voz OpenAI..." />
            </SelectTrigger>
            <SelectContent>
              {(catalog?.openaiVoices || [
                { id: "onyx", name: "Onyx (OpenAI)", gender: "male", note: "Grave" },
                { id: "nova", name: "Nova (OpenAI)", gender: "female", note: "Expressiva" },
              ]).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} — {v.note}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
