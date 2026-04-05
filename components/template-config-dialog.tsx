"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  Type,
  Check,
  Plus,
  Clock,
  X,
  Languages,
  Info,
  ChevronLeft,
  ArrowRight,
  FileText,
  Volume2,
  Globe,
  Waves,
} from "lucide-react"
import { toast } from "sonner"
import { getBlotatoAccountsAction, saveRemodelingTemplateAction, translatePromptAction } from "@/app/actions"
import { cn } from "@/lib/utils"

// ─── TIME OPTIONS (every minute) ─────────────────────────────────
const HOUR_OPTIONS = Array.from({ length: 1440 }, (_, i) => {
  const h = Math.floor(i / 60).toString().padStart(2, '0')
  const m = (i % 60).toString().padStart(2, '0')
  return `${h}h${m}`
})

// ─── Kie.ai Official Pricing Catalog ────────────────────────────
interface ModelEntry {
  label: string
  credits: number
  usd: number
  type: 'image' | 'video' | 'music' | 'voice'
  billing: 'per_image' | 'per_video' | 'per_second' | 'per_track' | 'per_1k_chars'
  brand: string
  detail?: string
  recommended?: boolean
}

const MODEL_PRICES: Record<string, ModelEntry> = {
  // ── IMAGE ─────────────────────────────────────────────────────
  'flux-kontext-pro':        { label: 'Flux Kontext Pro',       credits: 5,    usd: 0.025,  type: 'image', billing: 'per_image', brand: 'Flux',        recommended: true },
  'flux-kontext-max':        { label: 'Flux Kontext Max',       credits: 10,   usd: 0.05,   type: 'image', billing: 'per_image', brand: 'Flux' },
  'gpt-image-1':             { label: 'GPT-Image-1 (4o)',       credits: 20,   usd: 0.10,   type: 'image', billing: 'per_image', brand: 'OpenAI' },
  'gpt-image-1.5':           { label: 'GPT-Image-1.5',          credits: 6,    usd: 0.03,   type: 'image', billing: 'per_image', brand: 'OpenAI',      recommended: true },
  'seedream-3.0':            { label: 'Seedream 3.0',           credits: 3.5,  usd: 0.0175, type: 'image', billing: 'per_image', brand: 'ByteDance' },
  'seedream-5.0-lite':       { label: 'Seedream 5.0 Lite',      credits: 5.5,  usd: 0.0275, type: 'image', billing: 'per_image', brand: 'ByteDance' },
  'ideogram-v3-turbo':       { label: 'Ideogram V3 Turbo',      credits: 3.5,  usd: 0.0175, type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'ideogram-v3-balanced':    { label: 'Ideogram V3 Balanced',   credits: 7,    usd: 0.035,  type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'ideogram-v3-quality':     { label: 'Ideogram V3 Quality',    credits: 10,   usd: 0.05,   type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'recraft-v3':              { label: 'Recraft V3',             credits: 8,    usd: 0.04,   type: 'image', billing: 'per_image', brand: 'Recraft' },
  'grok-imagine':            { label: 'Grok Imagine',           credits: 12,   usd: 0.06,   type: 'image', billing: 'per_image', brand: 'xAI (Grok)' },
  'imagen-4':                { label: 'Imagen 4',               credits: 10,   usd: 0.05,   type: 'image', billing: 'per_image', brand: 'Google' },
  'wan-2.7-image':           { label: 'Wan 2.7 Image',          credits: 6,    usd: 0.03,   type: 'image', billing: 'per_image', brand: 'Wan (Alibaba)' },
  // ── VIDEO ─────────────────────────────────────────────────────
  'seedance-2-fast-720p':        { label: 'Seedance-2 Fast 720p',         credits: 33,    usd: 0.165,  type: 'video', billing: 'per_video',  brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-fast-720p-input':  { label: 'Seedance-2 Fast 720p +Input',  credits: 20,    usd: 0.10,   type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Com input vídeo' },
  'seedance-2-fast-480p':        { label: 'Seedance-2 Fast 480p',         credits: 15.5,  usd: 0.0775, type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-720p':             { label: 'Seedance-2 720p',              credits: 41,    usd: 0.205,  type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-720p-input':       { label: 'Seedance-2 720p +Input',       credits: 25,    usd: 0.125,  type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Com input vídeo' },
  'kling-2.6-10s':               { label: 'Kling 2.6 · 10s sem áudio',    credits: 110,   usd: 0.55,   type: 'video', billing: 'per_video',  brand: 'Kling',             recommended: true },
  'kling-2.6-10s-audio':         { label: 'Kling 2.6 · 10s c/ áudio',     credits: 220,   usd: 1.10,   type: 'video', billing: 'per_video',  brand: 'Kling',             detail: 'Áudio nativo' },
  'kling-2.6-5s':                { label: 'Kling 2.6 · 5s sem áudio',     credits: 55,    usd: 0.275,  type: 'video', billing: 'per_video',  brand: 'Kling' },
  'kling-2.6-5s-audio':          { label: 'Kling 2.6 · 5s c/ áudio',      credits: 110,   usd: 0.55,   type: 'video', billing: 'per_video',  brand: 'Kling',             detail: 'Áudio nativo' },
  'wan-2.6-i2v-5s-720p':         { label: 'Wan 2.6 I2V 5s 720p',          credits: 70,    usd: 0.35,   type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'wan-2.6-v2v-10s-720p':        { label: 'Wan 2.6 V2V 10s 720p',         credits: 140,   usd: 0.70,   type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)',     recommended: true },
  'wan-2.6-i2v-10s-1080p':       { label: 'Wan 2.6 I2V 10s 1080p',        credits: 209.5, usd: 1.0475, type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'wan-2.6-i2v-15s-1080p':       { label: 'Wan 2.6 I2V 15s 1080p',        credits: 315,   usd: 1.575,  type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'sora-2':                      { label: 'Sora 2',                        credits: 35,    usd: 0.175,  type: 'video', billing: 'per_video',  brand: 'OpenAI',            recommended: true },
  'sora-2-pro':                  { label: 'Sora 2 Pro',                    credits: 330,   usd: 1.65,   type: 'video', billing: 'per_video',  brand: 'OpenAI',            detail: 'Alta qualidade' },
  'veo-3.1-fast':                { label: 'Veo 3.1 Fast',                  credits: 60,    usd: 0.30,   type: 'video', billing: 'per_video',  brand: 'Google',            detail: '~8s' },
  'veo-3.1-quality':             { label: 'Veo 3.1 Quality',               credits: 250,   usd: 1.25,   type: 'video', billing: 'per_video',  brand: 'Google',            detail: '~8s, alta fidelidade' },
  'hailuo-2.3':                  { label: 'Hailuo 2.3',                    credits: 90,    usd: 0.45,   type: 'video', billing: 'per_video',  brand: 'Hailuo (MiniMax)' },
  'grok-extend-10s-720p':        { label: 'Grok Extend 10s 720p',          credits: 30,    usd: 0.15,   type: 'video', billing: 'per_video',  brand: 'xAI (Grok)' },
  'grok-extend-5s-720p':         { label: 'Grok Extend 5s 720p',           credits: 15,    usd: 0.075,  type: 'video', billing: 'per_video',  brand: 'xAI (Grok)' },
  // ── MUSIC ─────────────────────────────────────────────────────
  'suno-v4':                     { label: 'Suno V4',                        credits: 12,    usd: 0.06,   type: 'music', billing: 'per_track',  brand: 'Suno',              recommended: true },
  'suno-v4.5':                   { label: 'Suno V4.5',                     credits: 18,    usd: 0.09,   type: 'music', billing: 'per_track',  brand: 'Suno',              detail: 'Alta qualidade' },
  'udio-v2':                     { label: 'Udio V2',                       credits: 15,    usd: 0.075,  type: 'music', billing: 'per_track',  brand: 'Udio' },
  // ── VOICE (TTS) ───────────────────────────────────────────────
  'elevenlabs-turbo':            { label: 'ElevenLabs Turbo v2.5',         credits: 8,     usd: 0.04,   type: 'voice', billing: 'per_1k_chars', brand: 'ElevenLabs',      recommended: true,  detail: 'Baixa latência' },
  'elevenlabs-v2':               { label: 'ElevenLabs V2',                 credits: 12,    usd: 0.06,   type: 'voice', billing: 'per_1k_chars', brand: 'ElevenLabs',      detail: 'Alta qualidade' },
  'fish-audio-v1':               { label: 'Fish Audio V1',                 credits: 6,     usd: 0.03,   type: 'voice', billing: 'per_1k_chars', brand: 'Fish Audio' },
}

function getGroupedModels(type: 'image' | 'video' | 'music' | 'voice') {
  const groups: Record<string, { id: string; entry: ModelEntry }[]> = {}
  Object.entries(MODEL_PRICES).forEach(([id, entry]) => {
    if (entry.type !== type) return
    if (!groups[entry.brand]) groups[entry.brand] = []
    groups[entry.brand].push({ id, entry })
  })
  return groups
}

function formatBilling(entry: ModelEntry): string {
  if (entry.billing === 'per_second') return `${entry.credits} cr/seg · $${entry.usd}/seg`
  if (entry.billing === 'per_1k_chars') return `${entry.credits} cr/1k chars · $${entry.usd}`
  if (entry.billing === 'per_track') return `${entry.credits} cr/faixa · $${entry.usd}`
  if (entry.type === 'image') return `${entry.credits} cr/img · $${entry.usd}`
  return `${entry.credits} cr/vídeo · $${entry.usd}`
}

// ─── Translated Prompt (EN→PT-BR) ───────────────────────────────
export function TranslatedPrompt({ text, label, icon: Icon, colorClass }: { text: string, label: string, icon: any, colorClass: string }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (translated) { setShowTranslation(!showTranslation); return }
    setLoading(true)
    try {
      const { success, translation } = await translatePromptAction(text)
      if (success) { setTranslated(translation || text); setShowTranslation(true) }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className={cn("text-xs font-bold uppercase", colorClass)}>{label}</span>
        </div>
        <button onClick={handleTranslate} className="text-xs flex items-center gap-1.5 text-primary hover:underline font-bold" disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Languages className="h-3 w-3" />{showTranslation ? "🇺🇸 Original" : "🇧🇷 PT-BR"}</>}
        </button>
      </div>
      <p className={cn("text-sm leading-relaxed p-3 rounded-lg transition-all", showTranslation ? "text-primary bg-primary/5 border border-primary/20 italic" : "text-foreground/80 bg-secondary/30")}>
        {showTranslation ? translated : text}
      </p>
    </div>
  )
}

// ─── Model Selector Component ───────────────────────────────────
function ModelSelector({ type, value, onChange, disabled, label, icon: Icon, iconColor }: {
  type: 'image' | 'video' | 'music' | 'voice', value: string, onChange: (v: string) => void,
  disabled?: boolean, label: string, icon: any, iconColor: string
}) {
  const groups = getGroupedModels(type)
  return (
    <div className={cn("space-y-3", disabled && "opacity-40 pointer-events-none")}>
      <Label className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn("h-4 w-4", iconColor)} />
        {label}
        {disabled && <Badge variant="outline" className="text-[9px] ml-1">Desabilitado</Badge>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-secondary/20 h-12">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Object.entries(groups).map(([brand, models]) => (
            <SelectGroup key={brand}>
              <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{brand}</SelectLabel>
              {models.map(({ id, entry }) => (
                <SelectItem key={id} value={id}>
                  <div className="flex flex-col items-start leading-tight py-0.5">
                    <span className="flex items-center gap-1.5 font-bold text-sm">
                      {entry.label}
                      {entry.recommended && <Badge className="text-[8px] h-3.5 px-1 bg-emerald-600 text-white">REC</Badge>}
                    </span>
                    <span className="text-xs opacity-60">{formatBilling(entry)}{entry.detail ? ` · ${entry.detail}` : ''}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Wizard Steps ───────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Identidade", description: "Nome, formato, voz e música" },
  { id: 2, title: "Modelos IA", description: "Seleção de modelos e estimativa de custos" },
  { id: 3, title: "Publicação", description: "Frequência, horários e contas" },
  { id: 4, title: "Resumo", description: "Revisão geral e confirmação" },
]

interface TemplateConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: any
  analysis: any
  script: string
  onSuccess: () => void
  initialData?: any
}

export function TemplateConfigDialog({
  open, onOpenChange, video, analysis, script, onSuccess, initialData,
}: TemplateConfigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [fetchingAccounts, setFetchingAccounts] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [name, setName] = useState("")
  const [format, setFormat] = useState<"horizontal" | "vertical">("vertical")
  const [musicStyle, setMusicStyle] = useState("epic")
  const [voiceType, setVoiceType] = useState("masculine_br")
  const [voiceLanguage, setVoiceLanguage] = useState("pt-BR")
  const [imageModel, setImageModel] = useState("flux-kontext-pro")
  const [videoModel, setVideoModel] = useState("kling-2.6-10s")
  const [musicModel, setMusicModel] = useState("suno-v4")
  const [voiceModel, setVoiceModel] = useState("elevenlabs-turbo")
  const [frequency, setFrequency] = useState("daily")
  const [postTimes, setPostTimes] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  const isEdit = !!initialData
  const tpl = analysis?.remodeling_template || {}

  let parsedScriptData: any = {}
  try {
    if (script) {
      const cleanJson = script.includes('```json') ? script.split('```json')[1].split('```')[0].trim() : script.trim()
      parsedScriptData = JSON.parse(cleanJson)
    }
  } catch (e) {
    console.warn("Could not parse script in TemplateConfigDialog")
  }

  const structuredSegments = parsedScriptData.script_base || tpl?.script_base || []
  const segmentsCount = structuredSegments.length || 1
  const hasVoice = voiceType !== "none"
  const hasMusic = musicStyle !== "none"
  const generatedMusicPrompt = parsedScriptData.music_prompt || tpl?.music_prompt || ""
  const generatedSfxPrompt = parsedScriptData.sfx_prompt || tpl?.sfx_prompt || ""

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      if (initialData) {
        setName(initialData.name); setFormat(initialData.format)
        setMusicStyle(initialData.music_style); setVoiceType(initialData.voice_type)
        setVoiceLanguage(initialData.voice_language || "pt-BR")
        setImageModel(initialData.image_model || "flux-kontext-pro")
        setVideoModel(initialData.video_model || "kling-2.6-10s")
        setMusicModel(initialData.music_model || "suno-v4")
        setVoiceModel(initialData.voice_model || "elevenlabs-turbo")
        setFrequency(initialData.post_frequency)
        setPostTimes(initialData.post_times || [])
        setSelectedAccounts(initialData.target_accounts || [])
      } else {
        setName(`Template: ${video?.title?.slice(0, 30)}...` || "Novo Template")
        // Auto-detect from Gemini script output
        const detectedVoice = parsedScriptData.detected_voice_type || tpl?.detected_voice_type
        if (detectedVoice && ["masculine_br", "feminine_br", "narrator", "none"].includes(detectedVoice)) {
          setVoiceType(detectedVoice)
        } else if (analysis?.detected_audio_type === 'music_only') {
          setVoiceType("none")
        }
        const detectedMusic = parsedScriptData.detected_music_style || tpl?.detected_music_style
        if (detectedMusic && ["epic", "lo-fi", "ambient", "dramatic", "electronic", "none"].includes(detectedMusic)) {
          setMusicStyle(detectedMusic)
        }
        // Auto-detect recommended models
        const recImg = parsedScriptData.recommended_image_model || tpl?.recommended_image_model
        if (recImg && MODEL_PRICES[recImg]?.type === 'image') setImageModel(recImg)
        const recVid = parsedScriptData.recommended_video_model || tpl?.recommended_video_model
        if (recVid && MODEL_PRICES[recVid]?.type === 'video') setVideoModel(recVid)
        // Auto-detect voice language
        const detectedLang = parsedScriptData.detected_voice_language || tpl?.detected_voice_language
        if (detectedLang && ["pt-BR","en-US","es-ES","fr-FR","de-DE","ja-JP","zh-CN"].includes(detectedLang)) {
          setVoiceLanguage(detectedLang)
        }
      }
      fetchAccounts()
    }
  }, [open, video, analysis, initialData])

  async function fetchAccounts() {
    setFetchingAccounts(true)
    try {
      const result = await getBlotatoAccountsAction()
      const data = result || []
      setAccounts(data)
      if (data.length === 1 && selectedAccounts.length === 0) setSelectedAccounts([data[0].id])
    } catch (err) { console.error(err) }
    finally { setFetchingAccounts(false) }
  }

  // ── Cost Calculation ──────────────────────────────────────────
  const imgEntry = MODEL_PRICES[imageModel]
  const vidEntry = MODEL_PRICES[videoModel]
  const musEntry = MODEL_PRICES[musicModel]
  const voiEntry = MODEL_PRICES[voiceModel]

  function estimateSegmentDuration(): number {
    if (structuredSegments.length === 0) return 5
    let total = 0
    structuredSegments.forEach((seg: any) => {
      if (seg.timestamp) {
        const parts = seg.timestamp.split('-')
        if (parts.length === 2) {
          const toSec = (t: string) => { const p = t.trim().split(':'); return p.length === 2 ? parseInt(p[0]) * 60 + parseInt(p[1]) : parseInt(p[0]) }
          total += toSec(parts[1]) - toSec(parts[0])
        }
      }
    })
    return total > 0 ? total / structuredSegments.length : 5
  }

  const avgDuration = estimateSegmentDuration()
  const totalImg = Math.round((imgEntry?.credits || 0) * segmentsCount * 10) / 10
  const totalVid = vidEntry?.billing === 'per_second'
    ? Math.round((vidEntry?.credits || 0) * avgDuration * segmentsCount * 10) / 10
    : Math.round((vidEntry?.credits || 0) * segmentsCount * 10) / 10
  const totalMus = hasMusic ? Math.round((musEntry?.credits || 0) * 10) / 10 : 0
  const totalVoi = hasVoice ? Math.round((voiEntry?.credits || 0) * segmentsCount * 10) / 10 : 0
  const totalCredits = Math.round((totalImg + totalVid + totalMus + totalVoi) * 10) / 10
  const totalUSD = (totalCredits * 0.005).toFixed(2)

  async function handleSave() {
    if (!name) { toast.error("Dê um nome ao template."); setCurrentStep(1); return }
    setLoading(true)
    try {
      const payload = {
        video_id: video.id, video_title: video.title, video_thumbnail: video.thumbnail,
        name, template_data: analysis, generated_script: script,
        format, has_music: hasMusic, music_style: musicStyle, voice_type: voiceType,
        voice_language: voiceLanguage,
        image_model: imageModel, video_model: videoModel,
        music_model: musicModel, voice_model: voiceModel,
        post_frequency: frequency, post_interval_days: 1,
        post_times: postTimes, is_active: true, target_accounts: selectedAccounts, tags: [],
      }
      const result = isEdit
        ? await (await import("@/app/actions")).updateRemodelingTemplateAction(initialData.id, payload)
        : await saveRemodelingTemplateAction(payload)
      if (result.success) { toast.success(isEdit ? "Template atualizado!" : "Template salvo!"); onSuccess(); onOpenChange(false) }
      else toast.error(result.error || "Falha na operação.")
    } catch (err: any) { toast.error(err.message || "Erro ao salvar.") }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            {isEdit ? "Editar Template" : "Configurar Template"}
          </DialogTitle>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                return (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all",
                        isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                        isCompleted && "bg-emerald-500 text-white",
                        !isActive && !isCompleted && "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                      title={step.title}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-0.5 mx-1.5 rounded-full transition-colors", currentStep > step.id ? "bg-emerald-500" : "bg-secondary")} />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{STEPS[currentStep - 1].title}</span>
              {" — "}{STEPS[currentStep - 1].description}
            </p>
          </div>
        </DialogHeader>

        {/* CONTENT */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">

            {/* ═══ STEP 1: Identidade ═══ */}
            {currentStep === 1 && (<>
              <div className="space-y-3">
                <Label htmlFor="tpl-name" className="text-sm font-semibold">Nome do Template</Label>
                <Input id="tpl-name" placeholder="Ex: Dark Storytelling - Cosmos" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/20 h-11 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" /> Formato
                  </Label>
                  <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                    <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Curto (9:16)</SelectItem>
                      <SelectItem value="horizontal">Longo (16:9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Mic2 className="h-4 w-4 text-muted-foreground" /> Voz Base
                  </Label>
                  <Select value={voiceType} onValueChange={setVoiceType}>
                    <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculine_br">Masculina</SelectItem>
                      <SelectItem value="feminine_br">Feminina</SelectItem>
                      <SelectItem value="narrator">Narrador Profundo</SelectItem>
                      <SelectItem value="none">Sem Voz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voice language - only when voice is enabled */}
              {hasVoice && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4 text-muted-foreground" /> Idioma da Voz
                    {tpl?.detected_voice_language && (
                      <Badge variant="outline" className="text-[9px] ml-1 border-emerald-500/30 text-emerald-500">Auto-detectado</Badge>
                    )}
                  </Label>
                  <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                    <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                      <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                      <SelectItem value="fr-FR">🇫🇷 Français</SelectItem>
                      <SelectItem value="de-DE">🇩🇪 Deutsch</SelectItem>
                      <SelectItem value="ja-JP">🇯🇵 日本語</SelectItem>
                      <SelectItem value="zh-CN">🇨🇳 中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Music className="h-4 w-4 text-muted-foreground" /> Estilo Musical
                </Label>
                <Select value={musicStyle} onValueChange={setMusicStyle}>
                  <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="epic">Épica / Cinematográfica</SelectItem>
                    <SelectItem value="lo-fi">Lo-fi Relaxante</SelectItem>
                    <SelectItem value="ambient">Ambiente / Suspense</SelectItem>
                    <SelectItem value="dramatic">Dramática / Intensa</SelectItem>
                    <SelectItem value="electronic">Eletrônica</SelectItem>
                    <SelectItem value="none">Sem música</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="bg-secondary/20 rounded-xl p-4 border space-y-2">
                <p className="text-xs text-muted-foreground font-bold uppercase">Preview</p>
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg border-2 border-primary/20 flex items-center justify-center text-xs font-bold text-muted-foreground", format === 'vertical' ? 'w-10 h-16' : 'w-16 h-10')}>
                    {format === 'vertical' ? '9:16' : '16:9'}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">{name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasVoice ? (voiceType === 'narrator' ? '🎙️ Narrador' : voiceType === 'masculine_br' ? '🎙️ Masc.' : '🎙️ Fem.') : '🔇 Sem voz'}
                      {hasVoice && ` (${voiceLanguage})`}
                      {' · '}
                      {hasMusic ? `🎵 ${musicStyle}` : '🔇 Sem música'}
                    </p>
                  </div>
                </div>
              </div>
            </>)}

            {/* ═══ STEP 2: Modelos IA ═══ */}
            {currentStep === 2 && (<>
              <div className="space-y-1 mb-2">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Modelos de Geração Kie.ai
                </h3>
                <p className="text-sm text-muted-foreground">
                  {segmentsCount} {segmentsCount === 1 ? 'cena' : 'cenas'} · ~{Math.round(avgDuration)}s/cena
                </p>
              </div>

              <ModelSelector type="image" value={imageModel} onChange={setImageModel} label="Modelo de Imagem" icon={ImageIcon} iconColor="text-blue-500" />
              <ModelSelector type="video" value={videoModel} onChange={setVideoModel} label="Modelo de Vídeo" icon={Video} iconColor="text-purple-500" />
              <ModelSelector type="voice" value={voiceModel} onChange={setVoiceModel} disabled={!hasVoice} label={hasVoice ? "Modelo de Voz (TTS)" : "Modelo de Voz (desabilitado — sem voz na etapa 1)"} icon={Volume2} iconColor="text-emerald-500" />
              <ModelSelector type="music" value={musicModel} onChange={setMusicModel} disabled={!hasMusic} label={hasMusic ? "Modelo de Música" : "Modelo de Música (desabilitado — sem música na etapa 1)"} icon={Music} iconColor="text-amber-500" />

              {/* Cost breakdown */}
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/10 space-y-4">
                <p className="text-xs font-bold text-primary uppercase">Estimativa de Custo por Vídeo</p>
                {vidEntry?.billing === 'per_second' && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    Modelo de vídeo cobrado por segundo (~{Math.round(avgDuration)}s/cena).
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background rounded-lg p-3 border">
                    <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Imagens</span>
                    <span className="text-lg font-bold text-blue-500">{totalImg}</span> <span className="text-xs text-muted-foreground">cr</span>
                  </div>
                  <div className="bg-background rounded-lg p-3 border">
                    <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Vídeos</span>
                    <span className="text-lg font-bold text-purple-500">{totalVid}</span> <span className="text-xs text-muted-foreground">cr</span>
                  </div>
                  {hasVoice && (
                    <div className="bg-background rounded-lg p-3 border">
                      <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Voz</span>
                      <span className="text-lg font-bold text-emerald-500">{totalVoi}</span> <span className="text-xs text-muted-foreground">cr</span>
                    </div>
                  )}
                  {hasMusic && (
                    <div className="bg-background rounded-lg p-3 border">
                      <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Música</span>
                      <span className="text-lg font-bold text-amber-500">{totalMus}</span> <span className="text-xs text-muted-foreground">cr</span>
                    </div>
                  )}
                </div>
                <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 flex items-center justify-between">
                  <span className="text-sm text-primary font-bold uppercase">Total Estimado</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-primary">{totalCredits}</span> <span className="text-xs text-muted-foreground">créditos</span>
                    <p className="text-xs text-emerald-500 font-bold">≈ ${totalUSD} USD</p>
                  </div>
                </div>
              </div>
            </>)}

            {/* ═══ STEP 3: Publicação ═══ */}
            {currentStep === 3 && (<>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Frequência de Postagem
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduling */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" /> Horários de Postagem
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-xl overflow-hidden bg-secondary/10 flex flex-col">
                    <div className="p-2.5 bg-secondary/20 text-xs uppercase font-bold text-muted-foreground border-b text-center">Selecione</div>
                    <ScrollArea className="h-[220px]">
                      <div className="p-2 space-y-1">
                        {HOUR_OPTIONS.map((time) => (
                          <button key={time} onClick={() => {
                            if (postTimes.includes(time)) setPostTimes(postTimes.filter(t => t !== time))
                            else setPostTimes([...postTimes, time].sort())
                          }} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group",
                            postTimes.includes(time) ? "bg-primary text-primary-foreground font-bold" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          )}>
                            <span>{time}</span>
                            {postTimes.includes(time) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="border rounded-xl bg-secondary/5 p-4 flex flex-col gap-3">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Agendados ({postTimes.length})</Label>
                    {postTimes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {postTimes.map(time => (
                          <Badge key={time} variant="secondary" className="pl-2.5 pr-1 py-1.5 gap-1.5 bg-background border text-sm">
                            {time}
                            <button onClick={() => setPostTimes(postTimes.filter(t => t !== time))} className="p-0.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                        <Clock className="h-10 w-10 mb-2" /><p className="text-sm">Selecione horários à esquerda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Accounts */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-primary" /> Contas de Destino (Blotato)
                </Label>
                {fetchingAccounts ? (
                  <div className="flex items-center justify-center p-6 bg-secondary/10 rounded-xl border border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : accounts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 border rounded-xl p-4 bg-secondary/10">
                    {accounts.map((acc) => (
                      <div key={acc.id} className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-background transition-colors">
                        <Checkbox id={`acc-${acc.id}`} checked={selectedAccounts.includes(acc.id)} onCheckedChange={(c) => {
                          if (c) setSelectedAccounts([...selectedAccounts, acc.id])
                          else setSelectedAccounts(selectedAccounts.filter(id => id !== acc.id))
                        }} />
                        <label htmlFor={`acc-${acc.id}`} className="text-sm font-medium cursor-pointer flex-1">
                          <span className="font-bold uppercase text-xs text-primary mr-2">{acc.platform}</span>
                          {acc.label || acc.page_name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-secondary/10 rounded-xl border border-dashed">
                    <p className="text-sm text-muted-foreground">Nenhuma conta vinculada.</p>
                  </div>
                )}
              </div>
            </>)}

            {/* ═══ STEP 4: Resumo ═══ */}
            {currentStep === 4 && (<>
              <div className="space-y-1 mb-4">
                <h3 className="text-base font-bold">Resumo da Configuração</h3>
                <p className="text-sm text-muted-foreground">Revise todas as configurações antes de salvar o template.</p>
              </div>

              {/* Config summary grid */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Nome" value={name} />
                <SummaryCard label="Formato" value={format === 'vertical' ? 'Curto (9:16)' : 'Longo (16:9)'} />
                <SummaryCard label="Voz" value={hasVoice ? voiceType.replace('_', ' ') : 'Sem voz'} sub={hasVoice ? voiceLanguage : undefined} />
                <SummaryCard label="Música" value={hasMusic ? musicStyle : 'Sem música'} />
              </div>

              {/* Models */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary uppercase">Modelos Selecionados</p>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Imagem" value={imgEntry?.label || imageModel} sub={`${imgEntry?.credits || 0} cr/img`} />
                  <SummaryCard label="Vídeo" value={vidEntry?.label || videoModel} sub={formatBilling(vidEntry!)} />
                  {hasVoice && <SummaryCard label="Voz (TTS)" value={voiEntry?.label || voiceModel} sub={formatBilling(voiEntry!)} />}
                  {hasMusic && <SummaryCard label="Música" value={musEntry?.label || musicModel} sub={formatBilling(musEntry!)} />}
                </div>
              </div>

              {/* Cost */}
              <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-sm text-primary font-bold uppercase">Custo Total Estimado</span>
                  <p className="text-xs text-muted-foreground">{segmentsCount} cenas · ~{Math.round(avgDuration)}s/cena</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">{totalCredits}</span> <span className="text-sm text-muted-foreground">cr</span>
                  <p className="text-sm text-emerald-500 font-bold">≈ ${totalUSD} USD</p>
                </div>
              </div>

              {/* Publication */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary uppercase">Publicação</p>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Frequência" value={frequency === 'daily' ? 'Diária' : frequency === 'weekly' ? 'Semanal' : frequency === 'biweekly' ? 'Quinzenal' : 'Mensal'} />
                  <SummaryCard label="Horários" value={postTimes.length > 0 ? postTimes.join(', ') : 'Nenhum agendado'} />
                </div>
              </div>

              {/* Accounts */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary uppercase">Contas de Destino ({selectedAccounts.length})</p>
                {selectedAccounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAccounts.map(id => {
                      const acc = accounts.find(a => a.id === id)
                      return acc ? (
                        <Badge key={id} variant="secondary" className="py-1.5 px-3 text-sm bg-background border">
                          <span className="font-bold uppercase text-xs text-primary mr-1.5">{acc.platform}</span>
                          {acc.label || acc.page_name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma conta selecionada.</p>
                )}
              </div>

              {/* AI Prompts (music/sfx/voice) */}
              {(generatedMusicPrompt || generatedSfxPrompt) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-primary uppercase">Prompts de Produção (IA)</p>
                  {generatedMusicPrompt && (
                    <TranslatedPrompt text={generatedMusicPrompt} label="Prompt de Música (Suno/Udio)" icon={Music} colorClass="text-amber-500" />
                  )}
                  {generatedSfxPrompt && (
                    <TranslatedPrompt text={generatedSfxPrompt} label="Sound Design Global (SFX)" icon={Waves} colorClass="text-cyan-500" />
                  )}
                </div>
              )}

              {/* Script preview */}
              {structuredSegments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-primary uppercase">Roteiro ({structuredSegments.length} Segmentos)</p>
                  {structuredSegments.map((seg: any, idx: number) => (
                    <div key={idx} className="border bg-card/50 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between bg-secondary/30 px-4 py-2.5 border-b">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{seg.segment_type || 'SEGMENTO'}</span>
                        <span className="text-sm font-mono font-bold text-primary">{seg.timestamp}</span>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mic2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500 uppercase">Locução ({seg.voiceover?.style})</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed italic p-3 bg-secondary/20 rounded-lg">&ldquo;{seg.voiceover?.text}&rdquo;</p>
                        </div>
                        {/* Voice direction */}
                        {seg.voice_direction && (
                          <TranslatedPrompt text={seg.voice_direction} label="Direção de Voz (TTS)" icon={Volume2} colorClass="text-emerald-500" />
                        )}
                        {/* Sound design */}
                        {seg.sound_design && (
                          <TranslatedPrompt text={seg.sound_design} label="Sound Design (SFX)" icon={Waves} colorClass="text-cyan-500" />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
                          <TranslatedPrompt text={seg.visual_content?.image_prompt} label="Prompt de Imagem" icon={ImageIcon} colorClass="text-blue-500" />
                          <TranslatedPrompt text={seg.visual_content?.animation_instructions} label="Animação" icon={Video} colorClass="text-purple-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-secondary/5 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onOpenChange(false)} disabled={loading} className="gap-2">
            {currentStep > 1 ? <><ChevronLeft className="h-4 w-4" /> Voltar</> : "Cancelar"}
          </Button>
          <span className="text-xs text-muted-foreground">Etapa {currentStep} de {STEPS.length}</span>
          {currentStep < STEPS.length ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} className="gap-2">Próximo <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={handleSave} disabled={loading} className="gap-2 min-w-[160px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Atualizar Template" : "Salvar Template"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Summary Card (Step 4) ──────────────────────────────────────
function SummaryCard({ label, value, sub }: { label: string, value: string, sub?: string }) {
  return (
    <div className="bg-secondary/20 rounded-lg p-3 border">
      <p className="text-xs text-muted-foreground font-bold uppercase mb-1">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
