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
  Waves,
  Globe,
  Cpu,
  CheckCircle2,
  Zap,
  Copy,
  Link2,
  Upload,
  ExternalLink,
  CalendarDays,
} from "lucide-react"
import { toast } from "sonner"
import { getBlotatoAccountsAction, saveRemodelingTemplateAction, translatePromptAction } from "@/app/actions"
import { cn } from "@/lib/utils"

const WEEKDAYS = [
  { id: 'mon', label: 'Segunda-feira', short: 'Seg' },
  { id: 'tue', label: 'Terça-feira', short: 'Ter' },
  { id: 'wed', label: 'Quarta-feira', short: 'Qua' },
  { id: 'thu', label: 'Quinta-feira', short: 'Qui' },
  { id: 'fri', label: 'Sexta-feira', short: 'Sex' },
  { id: 'sat', label: 'Sábado', short: 'Sáb' },
  { id: 'sun', label: 'Domingo', short: 'Dom' },
]

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
  type: 'image' | 'video' | 'music' | 'voice' | 'editor'
  billing: 'per_image' | 'per_video' | 'per_second' | 'per_track' | 'per_1k_chars'
  brand: string
  detail?: string
  recommended?: boolean
  isLocal?: boolean
}

const MODEL_PRICES: Record<string, ModelEntry> = {
  // ── LOCAL & DIRECT APIs ──────────────────────────────────────
  'gemini-2.5-flash-image':      { label: 'Gemini 2.5 Flash Image (Nano Banana)', credits: 0, usd: 0.039, type: 'image', billing: 'per_image', brand: 'Google Direct API', recommended: true, detail: 'Veloz e consistente', isLocal: true },
  'gemini-3.1-flash-image-1k':   { label: 'Gemini 3.1 Flash Image 1K (Nano Banana Pro)', credits: 0, usd: 0.067, type: 'image', billing: 'per_image', brand: 'Google Direct API', detail: 'Fidelidade e texto aprimorado', isLocal: true },
  'gemini-3.1-flash-image-2k':   { label: 'Gemini 3.1 Flash Image 2K (Nano Banana 2)', credits: 0, usd: 0.101, type: 'image', billing: 'per_image', brand: 'Google Direct API', detail: 'Alta resolução 2K', isLocal: true },
  'imagen-4-fast':               { label: 'Google Imagen 4 Fast',          credits: 0, usd: 0.02,  type: 'image', billing: 'per_image', brand: 'Google Direct API', detail: 'Geração rápida', isLocal: true },
  'imagen-4-standard':           { label: 'Google Imagen 4 Standard',      credits: 0, usd: 0.04,  type: 'image', billing: 'per_image', brand: 'Google Direct API', detail: 'Excelente fotorealismo', isLocal: true },
  'imagen-4-ultra':              { label: 'Google Imagen 4 Ultra',         credits: 0, usd: 0.06,  type: 'image', billing: 'per_image', brand: 'Google Direct API', detail: 'Qualidade máxima', isLocal: true },
  'gpt-image-1.5':               { label: 'GPT Image 1.5 (Standard)',      credits: 0, usd: 0.03,  type: 'image', billing: 'per_image', brand: 'OpenAI Direct API', detail: 'Equilibrado e versátil', isLocal: true },
  'gpt-image-2':                 { label: 'GPT Image 2 (Premium)',         credits: 0, usd: 0.04,  type: 'image', billing: 'per_image', brand: 'OpenAI Direct API', recommended: true, detail: 'Alta consistência estilística', isLocal: true },
  
  'none-video':                  { label: 'Sem Gerador de Vídeo (Apenas Imagens + Remotion/Hyperframes)', credits: 0, usd: 0, type: 'video', billing: 'per_video', brand: 'Remotion / Hyperframes (VPS)', recommended: true, detail: 'Economiza custo · Animação de imagens via código', isLocal: true },
  'gemini-veo-3.1-lite-1080p':   { label: 'Gemini Veo 3.1 Lite (1080p)',   credits: 0, usd: 0.08,  type: 'video', billing: 'per_second', brand: 'Google Direct API', detail: 'Geração econômica 1080p', isLocal: true },
  'gemini-veo-3.1-fast-1080p':   { label: 'Gemini Veo 3.1 Fast (1080p)',   credits: 0, usd: 0.12,  type: 'video', billing: 'per_second', brand: 'Google Direct API', recommended: true, detail: 'Geração veloz 1080p', isLocal: true },
  'gemini-veo-3.1-standard-1080p': { label: 'Gemini Veo 3.1 Standard (1080p)', credits: 0, usd: 0.40,  type: 'video', billing: 'per_second', brand: 'Google Direct API', detail: 'Cinematográfico padrão', isLocal: true },
  'gemini-omni':                 { label: 'Gemini Omni (Multimodal)',      credits: 0, usd: 0.25,  type: 'video', billing: 'per_second', brand: 'Google Direct API', detail: 'Sincronização labial (Não Oficial)', isLocal: true },
  
  'remotion-engine':             { label: 'Remotion Engine (Docker VPS)',   credits: 0, usd: 0, type: 'editor', billing: 'per_video',  brand: 'Remotion (VPS)',     recommended: true, detail: 'Renderização Headless 18 Cores', isLocal: true },
  'edge-tts-docker':             { label: 'Edge TTS (Docker VPS)',          credits: 0, usd: 0, type: 'voice', billing: 'per_1k_chars', brand: 'Edge-TTS (VPS)',    recommended: true, detail: 'Vozes Neurais Gratuitas', isLocal: true },
  // ── IMAGE ─────────────────────────────────────────────────────
  'flux-kontext-pro':        { label: 'Flux Kontext Pro',       credits: 5,    usd: 0.025,  type: 'image', billing: 'per_image', brand: 'Flux',        recommended: true },
  'flux-kontext-max':        { label: 'Flux Kontext Max',       credits: 10,   usd: 0.05,   type: 'image', billing: 'per_image', brand: 'Flux' },
  'gpt-image-1':             { label: 'GPT-Image-1 (4o)',       credits: 20,   usd: 0.10,   type: 'image', billing: 'per_image', brand: 'OpenAI' },
  'gemini-2.5-flash-image-kie': { label: 'Gemini 2.5 Flash Image (Nano Banana)', credits: 8, usd: 0.039, type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', recommended: true, detail: 'Veloz e consistente' },
  'gemini-3.1-flash-image-1k-kie': { label: 'Gemini 3.1 Flash Image 1K (Nano Banana Pro)', credits: 13, usd: 0.067, type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', detail: 'Fidelidade e texto aprimorado' },
  'gemini-3.1-flash-image-2k-kie': { label: 'Gemini 3.1 Flash Image 2K (Nano Banana 2)', credits: 20, usd: 0.101, type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', detail: 'Alta resolução 2K' },
  'imagen-4-fast-kie':       { label: 'Google Imagen 4 Fast',      credits: 4,   usd: 0.02,   type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', detail: 'Geração rápida' },
  'imagen-4-standard-kie':   { label: 'Google Imagen 4 Standard',  credits: 8,   usd: 0.04,   type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', recommended: true, detail: 'Excelente fotorealismo' },
  'imagen-4-ultra-kie':      { label: 'Google Imagen 4 Ultra',     credits: 12,  usd: 0.06,   type: 'image', billing: 'per_image', brand: 'Google (Kie.ai)', detail: 'Qualidade máxima' },
  'seedream-3.0':            { label: 'Seedream 3.0',           credits: 3.5,  usd: 0.0175, type: 'image', billing: 'per_image', brand: 'ByteDance' },
  'seedream-5.0-lite':       { label: 'Seedream 5.0 Lite',      credits: 5.5,  usd: 0.0275, type: 'image', billing: 'per_image', brand: 'ByteDance' },
  'ideogram-v3-turbo':       { label: 'Ideogram V3 Turbo',      credits: 3.5,  usd: 0.0175, type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'ideogram-v3-balanced':    { label: 'Ideogram V3 Balanced',   credits: 7,    usd: 0.035,  type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'ideogram-v3-quality':     { label: 'Ideogram V3 Quality',    credits: 10,   usd: 0.05,   type: 'image', billing: 'per_image', brand: 'Ideogram' },
  'recraft-v3':              { label: 'Recraft V3',             credits: 8,    usd: 0.04,   type: 'image', billing: 'per_image', brand: 'Recraft' },
  'grok-imagine':            { label: 'Grok Imagine',           credits: 12,   usd: 0.06,   type: 'image', billing: 'per_image', brand: 'xAI (Grok)' },
  'wan-2.7-image':           { label: 'Wan 2.7 Image',          credits: 6,    usd: 0.03,   type: 'image', billing: 'per_image', brand: 'Wan (Alibaba)' },
  // ── VIDEO ─────────────────────────────────────────────────────
  'none-video-kie':              { label: 'Sem Gerador de Vídeo (Apenas Imagens + Remotion/Hyperframes)', credits: 0, usd: 0, type: 'video', billing: 'per_video', brand: 'Remotion / Hyperframes (VPS)', recommended: true, detail: 'Economiza créditos · Animação de imagens via código' },
  'seedance-2-fast-720p':        { label: 'Seedance-2 Fast 720p',         credits: 33,    usd: 0.165,  type: 'video', billing: 'per_video',  brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-fast-720p-input':  { label: 'Seedance-2 Fast 720p +Input',  credits: 20,    usd: 0.10,   type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Com input vídeo' },
  'seedance-2-fast-480p':        { label: 'Seedance-2 Fast 480p',         credits: 15.5,  usd: 0.0775, type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-720p':             { label: 'Seedance-2 720p',              credits: 41,    usd: 0.205,  type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Sem input vídeo' },
  'seedance-2-720p-input':       { label: 'Seedance-2 720p +Input',       credits: 25,    usd: 0.125,  type: 'video', billing: 'per_second', brand: 'ByteDance',         detail: 'Com input vídeo' },
  'kling-2.6-10s':               { label: 'Kling 2.6 · 10s sem áudio',    credits: 110,   usd: 0.55,   type: 'video', billing: 'per_video',  brand: 'Kling',             recommended: true },
  'kling-2.6-10s-audio':         { label: 'Kling 2.6 · 10s c/ áudio',     credits: 220,   usd: 1.10,   type: 'video', billing: 'per_video',  brand: 'Kling',             detail: 'Áudio nativo' },
  'kling-2.6-5s':                { label: 'Kling 2.6 · 5s sem áudio',     credits: 55,    usd: 0.275,  type: 'video', billing: 'per_video',  brand: 'Kling' },
  'kling-2.6-5s-audio':          { label: 'Kling 2.6 · 5s c/ áudio',      credits: 110,   usd: 0.55,   type: 'video', billing: 'per_video',  brand: 'Kling',             detail: 'Áudio nativo' },
  'kling-2.5-turbo':             { label: 'Kling 2.5 Turbo · 5s',         credits: 40,    usd: 0.20,   type: 'video', billing: 'per_video',  brand: 'Kling',             recommended: true, detail: 'Geração veloz de alta consistência' },
  'kling-3.0-high':              { label: 'Kling 3.0 High Quality · 10s', credits: 150,   usd: 0.75,   type: 'video', billing: 'per_video',  brand: 'Kling',             detail: 'Fidelidade de elite e dinâmica superior' },
  'runway-gen3-turbo':           { label: 'Runway Gen-3 Alpha Turbo',     credits: 45,    usd: 0.225,  type: 'video', billing: 'per_video',  brand: 'Runway',            recommended: true, detail: 'Transições cinematográficas rápidas' },
  'luma-dream-machine':          { label: 'Luma Dream Machine v1.5',      credits: 35,    usd: 0.175,  type: 'video', billing: 'per_video',  brand: 'Luma',              detail: 'Movimentos de câmera realistas fluidos' },
  'wan-2.6-i2v-5s-720p':         { label: 'Wan 2.6 I2V 5s 720p',          credits: 70,    usd: 0.35,   type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'wan-2.6-v2v-10s-720p':        { label: 'Wan 2.6 V2V 10s 720p',         credits: 140,   usd: 0.70,   type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)',     recommended: true },
  'wan-2.6-i2v-10s-1080p':       { label: 'Wan 2.6 I2V 10s 1080p',        credits: 209.5, usd: 1.0475, type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'wan-2.6-i2v-15s-1080p':       { label: 'Wan 2.6 I2V 15s 1080p',        credits: 315,   usd: 1.575,  type: 'video', billing: 'per_video',  brand: 'Wan (Alibaba)' },
  'sora-2':                      { label: 'Sora 2',                        credits: 35,    usd: 0.175,  type: 'video', billing: 'per_video',  brand: 'OpenAI',            recommended: true },
  'sora-2-pro':                  { label: 'Sora 2 Pro',                    credits: 330,   usd: 1.65,   type: 'video', billing: 'per_video',  brand: 'OpenAI',            detail: 'Alta qualidade' },
  'gemini-veo-fast-kie':         { label: 'Gemini Veo 3.1 Fast',           credits: 60,  usd: 0.30,  type: 'video', billing: 'per_video', brand: 'Google (Kie.ai)', detail: 'Geração rápida de clips' },
  'gemini-veo-standard-kie':     { label: 'Gemini Veo 3.1 Standard',       credits: 100, usd: 0.50,  type: 'video', billing: 'per_video', brand: 'Google (Kie.ai)', recommended: true, detail: 'Fidelidade equilibrada' },
  'gemini-veo-quality-kie':      { label: 'Gemini Veo 3.1 Quality',        credits: 250, usd: 1.25,  type: 'video', billing: 'per_video', brand: 'Google (Kie.ai)', detail: 'Cinematográfico ultra real' },
  'gemini-omni-kie':             { label: 'Gemini Omni (Multimodal)',      credits: 120, usd: 0.60,  type: 'video', billing: 'per_video', brand: 'Google (Kie.ai)', detail: 'Sincronização labial' },
  'hailuo-2.3':                  { label: 'Hailuo 2.3',                    credits: 90,    usd: 0.45,   type: 'video', billing: 'per_video',  brand: 'Hailuo (MiniMax)' },
  'grok-extend-10s-720p':        { label: 'Grok Extend 10s 720p',          credits: 30,    usd: 0.15,   type: 'video', billing: 'per_video',  brand: 'xAI (Grok)' },
  'grok-extend-5s-720p':         { label: 'Grok Extend 5s 720p',           credits: 15,    usd: 0.075,  type: 'video', billing: 'per_video',  brand: 'xAI (Grok)' },
  // ── MUSIC ─────────────────────────────────────────────────────
  'suno-v4':                     { label: 'Suno V4',                        credits: 12,    usd: 0.06,   type: 'music', billing: 'per_track',  brand: 'Suno',              recommended: true },
  'suno-v4.5':                   { label: 'Suno V4.5',                     credits: 18,    usd: 0.09,   type: 'music', billing: 'per_track',  brand: 'Suno',              detail: 'Alta qualidade' },
  'suno-v5':                     { label: 'Suno V5.0 / 5.5',               credits: 25,    usd: 0.125,  type: 'music', billing: 'per_track',  brand: 'Suno',              detail: 'Qualidade acústica e instrumental de elite', recommended: true },
  'udio-v2':                     { label: 'Udio V2',                       credits: 15,    usd: 0.075,  type: 'music', billing: 'per_track',  brand: 'Udio' },
  // ── VOICE (TTS) ───────────────────────────────────────────────
  'elevenlabs-turbo':            { label: 'ElevenLabs Turbo v2.5',         credits: 8,     usd: 0.04,   type: 'voice', billing: 'per_1k_chars', brand: 'ElevenLabs',      recommended: true,  detail: 'Baixa latência' },
  'elevenlabs-v2':               { label: 'ElevenLabs V2',                 credits: 12,    usd: 0.06,   type: 'voice', billing: 'per_1k_chars', brand: 'ElevenLabs',      detail: 'Alta qualidade' },
  'fish-audio-v1':               { label: 'Fish Audio V1',                 credits: 6,     usd: 0.03,   type: 'voice', billing: 'per_1k_chars', brand: 'Fish Audio' },
  // ── MANUAL (LLMS EXTERNAS) ───────────────────────────────────
  'manual-image':                { label: 'Geração Manual (Midjourney / ChatGPT / Leonardo AI)', credits: 0, usd: 0, type: 'image', billing: 'per_image', brand: 'Manual (LLM Externa)', detail: 'Geração por fora usando sua assinatura', isLocal: true },
  'manual-video':                { label: 'Geração Manual de Vídeo (Sora / Kling Web / Runway Web)', credits: 0, usd: 0, type: 'video', billing: 'per_video', brand: 'Manual (LLM Externa)', detail: 'Geração de vídeo por fora usando sua assinatura', isLocal: true },
  'manual-none-video':           { label: 'Sem Gerador de Vídeo (Apenas Imagens + Remotion/Hyperframes)', credits: 0, usd: 0, type: 'video', billing: 'per_video', brand: 'Manual (LLM Externa)', recommended: true, detail: 'Economiza tempo — Animação de imagens via código', isLocal: true },
  'manual-voice':                { label: 'Geração Manual (ElevenLabs Web / Gravador)', credits: 0, usd: 0, type: 'voice', billing: 'per_1k_chars', brand: 'Manual (LLM Externa)', detail: 'Voz gerada por fora pelo usuário', isLocal: true },
  'manual-music':                { label: 'Geração Manual (Suno Web / Udio Web / Royalty Free)', credits: 0, usd: 0, type: 'music', billing: 'per_track', brand: 'Manual (LLM Externa)', detail: 'Música gerada por fora pelo usuário', isLocal: true },

}

function getGroupedModels(type: 'image' | 'video' | 'music' | 'voice' | 'editor', engineMode: 'local' | 'kie' | 'manual' = 'local') {
  const groups: Record<string, { id: string; entry: ModelEntry }[]> = {}
  Object.entries(MODEL_PRICES).forEach(([id, entry]) => {
    if (entry.type !== type) return
    if (type !== 'editor') {
      const isModelLocal = !!entry.isLocal
      const isManual = entry.brand.includes('Manual')
      if (engineMode === 'local' && (!isModelLocal || isManual)) return
      if (engineMode === 'kie' && (isModelLocal || isManual)) return
      if (engineMode === 'manual' && !isManual) return
    }

    if (!groups[entry.brand]) groups[entry.brand] = []
    groups[entry.brand].push({ id, entry })
  })
  return groups
}

function formatBilling(entry: ModelEntry): string {
  if (entry.credits === 0 && entry.usd === 0) return 'Sem custo de API · LLM Externa / Self-Hosted'
  if (entry.isLocal) {
    if (entry.billing === 'per_second') return `API Direta · $${entry.usd}/seg`
    if (entry.billing === 'per_1k_chars') return `API Direta · $${entry.usd}/1k chars`
    if (entry.type === 'image') return `API Direta · $${entry.usd}/img`
    return `API Direta · $${entry.usd}/vídeo`
  }
  if (entry.billing === 'per_second') return `${entry.credits} cr/seg · $${entry.usd}/seg`
  if (entry.billing === 'per_1k_chars') return `${entry.credits} cr/1k chars · $${entry.usd}`
  if (entry.billing === 'per_track') return `${entry.credits} cr/faixa · $${entry.usd}`
  if (entry.type === 'image') return `${entry.credits} cr/img · $${entry.usd}`
  return `${entry.credits} cr/vídeo · $${entry.usd}`
}

// ─── Translated Prompt (EN→PT-BR) ───────────────────────────────
export function TranslatedPrompt({ text, label, icon: Icon, colorClass, isImagePrompt = false }: { text: string, label: string, icon: any, colorClass: string, isImagePrompt?: boolean }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (translated) { setShowTranslation(!showTranslation); return }
    setLoading(true)
    try {
      const { success, translation, error } = await translatePromptAction(text)
      if (success && translation) { 
        setTranslated(translation); 
        setShowTranslation(true) 
      } else {
        toast.error(error || "Erro ao traduzir")
      }
    } catch (err) { 
      console.error(err)
      toast.error("Erro na comunicação com a API")
    }
    finally { setLoading(false) }
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className={cn("text-xs font-bold uppercase", colorClass)}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isImagePrompt && (
            <button
              onClick={() => handleCopy('midjourney')}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors flex items-center gap-1"
              title="Copiar formatado para Midjourney (/imagine)"
            >
              <Sparkles className="h-2.5 w-2.5" />
              /imagine Midjourney
            </button>
          )}
          <button
            onClick={() => handleCopy('plain')}
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copiado!" : "Copiar Prompt"}
          </button>
          <button onClick={handleTranslate} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground font-bold ml-1" disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Languages className="h-3 w-3" />{showTranslation ? "🇺🇸 Original" : "🇧🇷 PT-BR"}</>}
          </button>
        </div>
      </div>
      <p className={cn("text-sm leading-relaxed p-3 rounded-lg transition-all font-mono text-xs select-all", showTranslation ? "text-primary bg-primary/5 border border-primary/20 italic" : "text-foreground/80 bg-secondary/30 border border-border/40")}>
        {showTranslation ? translated : text}
      </p>
    </div>
  )
}

// ─── Model Selector Component ───────────────────────────────────
function ModelSelector({ type, value, onChange, disabled, label, icon: Icon, iconColor, engineMode }: {
  type: 'image' | 'video' | 'music' | 'voice' | 'editor', value: string, onChange: (v: string) => void,
  disabled?: boolean, label: string, icon: any, iconColor: string, engineMode?: 'local' | 'kie' | 'manual'
}) {
  const groups = getGroupedModels(type, engineMode || 'local')
  return (
    <div className={cn("space-y-2 max-w-full overflow-hidden", disabled && "opacity-40 pointer-events-none")}>
      <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
        <span className="truncate">{label}</span>
        {disabled && <Badge variant="outline" className="text-[9px] ml-1 shrink-0">Desabilitado</Badge>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-secondary/20 h-auto py-2.5 px-3 min-h-[48px] w-full max-w-full overflow-hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] max-w-[90vw] sm:max-w-md">
          {Object.entries(groups).map(([brand, models]) => (
            <SelectGroup key={brand}>
              <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{brand}</SelectLabel>
              {models.map(({ id, entry }) => (
                <SelectItem key={id} value={id}>
                  <div className="flex flex-col items-start leading-tight py-0.5 max-w-full overflow-hidden text-left">
                    <span className="flex items-center gap-1.5 font-bold text-xs truncate max-w-full">
                      {entry.label}
                      {entry.recommended && <Badge className="text-[8px] h-3.5 px-1 bg-emerald-600 text-white shrink-0">REC</Badge>}
                    </span>
                    <span className="text-[11px] opacity-70 truncate max-w-full block">{formatBilling(entry)}{entry.detail ? ` · ${entry.detail}` : ''}</span>
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
  const [engineMode, setEngineMode] = useState<'local' | 'kie' | 'manual'>('local')
  const [imageModel, setImageModel] = useState("gemini-2.5-flash-image")
  const [thumbnailModel, setThumbnailModel] = useState("gemini-2.5-flash-image")
  const [videoModel, setVideoModel] = useState("gemini-veo-3.1-fast-1080p")
  const [musicModel, setMusicModel] = useState("suno-v4")
  const [voiceModel, setVoiceModel] = useState("edge-tts-docker")
  const [renderModel, setRenderModel] = useState("remotion-engine")
  const [kiePackage, setKiePackage] = useState<'economic' | 'standard' | 'quality'>('standard')
  const [frequency, setFrequency] = useState("weekly")
  const [postDays, setPostDays] = useState<string[]>(['mon', 'wed', 'fri'])
  const [postTimes, setPostTimes] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  // ── Dual-Engine fields ──
  const [captionStyle, setCaptionStyle] = useState<'pop' | 'karaoke' | 'subtitle'>('pop')
  const [animationMix, setAnimationMix] = useState<'varied' | 'kenburns' | 'zoom-punch'>('varied')
  const [transitionStyle, setTransitionStyle] = useState<'fade' | 'slide-up' | 'zoom-in'>('fade')
  const [language, setLanguage] = useState('pt')
  const [voice, setVoice] = useState('pt-BR-FranciscaNeural')

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
        setEngineMode(initialData.engine_mode || 'local')
        
        const rawImgModel = initialData.image_model
        if (rawImgModel === "gemini-2.5-flash" || rawImgModel === "gemini-nanobanana" || !rawImgModel) {
          setImageModel("gemini-2.5-flash-image")
        } else {
          setImageModel(rawImgModel)
        }
        
        setThumbnailModel(initialData.thumbnail_model || initialData.image_model || "gemini-2.5-flash-image")

        const rawVidModel = initialData.video_model
        if (rawVidModel === "remotion-engine" || rawVidModel === "gemini-veo-standard" || !rawVidModel) {
          setVideoModel("gemini-veo-3.1-fast-1080p")
        } else {
          setVideoModel(rawVidModel)
        }

        setMusicModel(initialData.music_model || "suno-v4")
        setVoiceModel(initialData.voice_model || "edge-tts-docker")
        setRenderModel(initialData.render_model || "remotion-engine")
        setFrequency(initialData.post_frequency || "weekly")
        setPostDays(initialData.post_days || ['mon', 'wed', 'fri'])
        setPostTimes(initialData.post_times || [])
        setSelectedAccounts(initialData.target_accounts || [])
        // Dual-Engine
        setCaptionStyle(initialData.caption_style || 'pop')
        setAnimationMix(initialData.animation_mix || 'varied')
        setTransitionStyle(initialData.transition_style || 'fade')
        setLanguage(initialData.language || 'pt')
        setVoice(initialData.voice || 'pt-BR-FranciscaNeural')
      } else {
        setName(`Template: ${video?.title?.slice(0, 30)}...` || "Novo Template")
        setEngineMode('local')

        const recImg = String(parsedScriptData.recommended_image_model || tpl?.ai_stack?.image || "").toLowerCase()
        if (recImg.includes("flux")) {
          setEngineMode("kie")
          setImageModel("flux-kontext-pro")
          setThumbnailModel("flux-kontext-pro")
        } else if (recImg.includes("ideogram")) {
          setEngineMode("kie")
          setImageModel("ideogram-v3-balanced")
          setThumbnailModel("flux-kontext-pro")
        } else {
          setImageModel("gemini-2.5-flash-image")
          setThumbnailModel("gemini-2.5-flash-image")
        }

        setVideoModel("gemini-veo-3.1-fast-1080p")
        setVoiceModel("edge-tts-docker")
        setRenderModel("remotion-engine")
        // Auto-detect from Gemini script output
        const detectedVoice = parsedScriptData.detected_voice_type || tpl?.detected_voice_type
        if (detectedVoice && ["masculine_br", "feminine_br", "narrator"].includes(detectedVoice)) {
          setVoiceType(detectedVoice)
        } else if (detectedVoice === "none" || analysis?.detected_audio_type === 'music_only' || analysis?.detected_audio_type === 'none') {
          setVoiceType("none")
        } else {
          setVoiceType("masculine_br")
        }

        const rawMusic = String(parsedScriptData.detected_music_style || tpl?.detected_music_style || tpl?.music_style || "").toLowerCase()
        if (rawMusic.includes("lo-fi") || rawMusic.includes("lofi") || rawMusic.includes("relax")) {
          setMusicStyle("lo-fi")
        } else if (rawMusic.includes("ambient") || rawMusic.includes("suspense")) {
          setMusicStyle("ambient")
        } else if (rawMusic.includes("dramatic") || rawMusic.includes("intense")) {
          setMusicStyle("dramatic")
        } else if (rawMusic.includes("electronic") || rawMusic.includes("synth") || rawMusic.includes("pop")) {
          setMusicStyle("electronic")
        } else if (rawMusic === "none" || analysis?.detected_audio_type === 'none') {
          setMusicStyle("none")
        } else {
          setMusicStyle("epic")
        }
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
  const thumbEntry = MODEL_PRICES[thumbnailModel] || imgEntry
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
  const totalThumb = Math.round((thumbEntry?.credits || 0) * 10) / 10
  const totalVid = vidEntry?.billing === 'per_second'
    ? Math.round((vidEntry?.credits || 0) * avgDuration * segmentsCount * 10) / 10
    : Math.round((vidEntry?.credits || 0) * segmentsCount * 10) / 10
  const totalMus = hasMusic ? Math.round((musEntry?.credits || 0) * 10) / 10 : 0
  const totalVoi = hasVoice ? Math.round((voiEntry?.credits || 0) * segmentsCount * 10) / 10 : 0
  const totalCredits = Math.round((totalImg + totalThumb + totalVid + totalMus + totalVoi) * 10) / 10
  const totalUSD = (totalCredits * 0.005).toFixed(2)

  // Local/Direct API USD Costs
  const totalLocalImgUSD = (imgEntry?.usd || 0) * segmentsCount
  const totalLocalThumbUSD = (thumbEntry?.usd || 0)
  const totalLocalVidUSD = vidEntry?.billing === 'per_second'
    ? (vidEntry?.usd || 0) * avgDuration * segmentsCount
    : (vidEntry?.usd || 0) * segmentsCount
  const totalLocalVoiUSD = hasVoice ? (voiEntry?.usd || 0) * segmentsCount : 0
  const totalLocalUSD = (totalLocalImgUSD + totalLocalThumbUSD + totalLocalVidUSD + totalLocalVoiUSD).toFixed(2)

  async function handleSave() {
    if (!name) { toast.error("Dê um nome ao template."); setCurrentStep(1); return }
    setLoading(true)
    try {
      const payload = {
        video_id: video.id, video_title: video.title, video_thumbnail: video.thumbnail,
        name, template_data: analysis, generated_script: script,
        format, has_music: hasMusic, music_style: musicStyle, voice_type: voiceType,
        voice_language: voiceLanguage,
        engine_mode: engineMode,
        image_model: imageModel, thumbnail_model: thumbnailModel, video_model: videoModel,
        music_model: musicModel, voice_model: voiceModel,
        render_model: renderModel,
        post_frequency: frequency, post_days: postDays, post_interval_days: 1,
        post_times: postTimes, is_active: true, target_accounts: selectedAccounts, tags: [],
        // Dual-Engine (render_engine is auto-decided by n8n)
        caption_style: captionStyle,
        animation_mix: animationMix,
        transition_style: transitionStyle,
        language,
        voice,
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
      <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
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
        <ScrollArea className="flex-1 min-h-0 w-full">
          <div className="p-6 space-y-6 max-w-full overflow-x-hidden">

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

            {/* ═══ STEP 2: Modelos IA & Provedor ═══ */}
            {currentStep === 2 && (<>
              <div className="space-y-1 mb-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Provedor de Geração & Renderização
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha entre o servidor local (APIs Diretas + Remotion VPS) ou a API do Kie.ai.
                </p>
              </div>

              {/* ── CAPTION & ANIMATION SECTION ── */}
              <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 mb-4">
                <h4 className="text-sm font-bold mb-1 flex items-center gap-2">
                  <span className="text-base">🎞️</span> Estilo da Animação do Vídeo
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Defina o estilo das legendas e a movimentação visual. O sistema seleciona o motor ideal (Remotion / Hyperframes) automaticamente.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Estilo das Legendas</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { value: 'pop', label: 'Pop Dinâmica', desc: 'MrBeast Style' },
                        { value: 'karaoke', label: 'Iluminada', desc: 'Sincronizada' },
                        { value: 'subtitle', label: 'Clássica', desc: 'Rodapé tradicional' },
                      ] as const).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setCaptionStyle(opt.value)}
                          className={cn(
                            "p-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center gap-0.5",
                            captionStyle === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/50 text-muted-foreground hover:bg-secondary/60"
                          )}
                        >
                          <span className="truncate w-full text-center">{opt.label}</span>
                          <span className="font-normal opacity-70 text-[10px] truncate w-full text-center">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Movimento da Câmera</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { value: 'varied', label: 'Dinamismo Variado', desc: 'Recomendado' },
                        { value: 'kenburns', label: 'Zoom Suave', desc: 'Ken Burns' },
                        { value: 'zoom-punch', label: 'Zoom Impacto', desc: 'Dramático' },
                      ] as const).map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setAnimationMix(opt.value)}
                          className={cn(
                            "p-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-center gap-0.5",
                            animationMix === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/50 text-muted-foreground hover:bg-secondary/60"
                          )}
                        >
                          <span className="truncate w-full text-center">{opt.label}</span>
                          <span className="font-normal opacity-70 text-[10px] truncate w-full text-center">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Language + Voice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Idioma do Vídeo</label>
                    <select
                      value={language}
                      onChange={e => {
                        const lang = e.target.value
                        setLanguage(lang)
                        const defaults: Record<string, string> = {
                          'pt': 'pt-BR-FranciscaNeural',
                          'en': 'en-US-JennyNeural',
                          'es': 'es-ES-ElviraNeural',
                          'de': 'de-DE-KatjaNeural',
                          'fr': 'fr-FR-DeniseNeural',
                          'ja': 'ja-JP-NanamiNeural',
                        }
                        if (defaults[lang]) setVoice(defaults[lang])
                      }}
                      className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm"
                    >
                      <option value="pt">🇧🇷 Português (BR)</option>
                      <option value="en">🇺🇸 English (US)</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="ja">🇯🇵 日本語</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Voz (Edge-TTS)</label>
                    <select
                      value={voice}
                      onChange={e => setVoice(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm"
                    >
                      {language === 'pt' && (<>
                        <option value="pt-BR-FranciscaNeural">Francisca (Feminina)</option>
                        <option value="pt-BR-AntonioNeural">Antonio (Masculino)</option>
                        <option value="pt-PT-DuarteNeural">Duarte PT (Masculino)</option>
                      </>)}
                      {language === 'en' && (<>
                        <option value="en-US-JennyNeural">Jenny (Feminina)</option>
                        <option value="en-US-GuyNeural">Guy (Masculino)</option>
                        <option value="en-GB-SoniaNeural">Sonia GB (Feminina)</option>
                      </>)}
                      {language === 'es' && (<>
                        <option value="es-ES-ElviraNeural">Elvira (Feminina)</option>
                        <option value="es-ES-AlvaroNeural">Álvaro (Masculino)</option>
                      </>)}
                      {language === 'de' && (<>
                        <option value="de-DE-KatjaNeural">Katja (Feminina)</option>
                        <option value="de-DE-ConradNeural">Conrad (Masculino)</option>
                      </>)}
                      {language === 'fr' && (<>
                        <option value="fr-FR-DeniseNeural">Denise (Feminina)</option>
                        <option value="fr-FR-HenriNeural">Henri (Masculino)</option>
                      </>)}
                      {language === 'ja' && (<>
                        <option value="ja-JP-NanamiNeural">Nanami (Feminina)</option>
                        <option value="ja-JP-KeitaNeural">Keita (Masculino)</option>
                      </>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mode Selector Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-secondary/30 border border-border/50 rounded-xl mb-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('local')
                    setImageModel('gemini-2.5-flash-image')
                    setThumbnailModel('gemini-2.5-flash-image')
                    setVideoModel('gemini-veo-3.1-fast-1080p')
                    setVoiceModel('edge-tts-docker')
                    setRenderModel('remotion-engine')
                  }}
                  className={cn(
                    "py-3 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-center whitespace-nowrap",
                    engineMode === 'local'
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  <Cpu className="h-4 w-4 shrink-0" />
                  <span>Direct API (Local)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKiePackage('standard')
                    setEngineMode('kie')
                    setImageModel('ideogram-v3-balanced')
                    setThumbnailModel('flux-kontext-pro')
                    setVideoModel('seedance-2-720p')
                    setVoiceModel('elevenlabs-turbo')
                    setMusicModel('suno-v4')
                    setRenderModel('remotion-engine')
                  }}
                  className={cn(
                    "py-3 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-center whitespace-nowrap",
                    engineMode === 'kie'
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Kie.ai (Créditos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('manual')
                    setImageModel('manual-image')
                    setThumbnailModel('manual-image')
                    setVideoModel('manual-video')
                    setVoiceModel('edge-tts-docker')
                    setRenderModel('remotion-engine')
                  }}
                  className={cn(
                    "py-3 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-center whitespace-nowrap",
                    engineMode === 'manual'
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                      : "text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>Manual (Fora de API)</span>
                </button>
              </div>

              {engineMode === 'local' && (
                <div className="space-y-4 animate-in fade-in duration-300 max-w-full overflow-hidden">
                  <ModelSelector type="image" value={imageModel} onChange={setImageModel} engineMode={engineMode} label="1. Geração de Imagens das Cenas (Google Gemini / OpenAI Direct)" icon={ImageIcon} iconColor="text-blue-500" />
                  <ModelSelector type="image" value={thumbnailModel} onChange={setThumbnailModel} engineMode={engineMode} label="2. Geração da Thumbnail / Capa HD (Google Gemini / OpenAI Direct)" icon={ImageIcon} iconColor="text-pink-500" />
                  <ModelSelector type="video" value={videoModel} onChange={setVideoModel} engineMode={engineMode} label="3. Geração de Clips de Vídeo (Google Gemini Veo / Omni / Flow)" icon={Video} iconColor="text-purple-500" />
                  <ModelSelector type="voice" value={voiceModel} onChange={setVoiceModel} engineMode={engineMode} disabled={!hasVoice} label={hasVoice ? "4. Geração de Voz (TTS Local / Docker)" : "Modelo de Voz (desabilitado)"} icon={Volume2} iconColor="text-emerald-500" />
                  <ModelSelector type="editor" value={renderModel} onChange={setRenderModel} engineMode={engineMode} label="5. Edição & Renderização Final (Remotion VPS)" icon={LayoutTemplate} iconColor="text-cyan-400" />

                  {/* Cost breakdown Local */}
                  <div className="bg-emerald-500/5 rounded-xl p-4 sm:p-5 border border-emerald-500/10 space-y-4 max-w-full overflow-hidden">
                    <p className="text-xs font-bold text-emerald-500 uppercase">Estimativa de Custo Direct API (Fatura Google/OpenAI)</p>
                    {vidEntry?.billing === 'per_second' && (
                      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Modelo de vídeo cobrado por segundo da API do Google (~{Math.round(avgDuration)}s/cena).</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Imagens (Direct API)</span>
                        <span className="text-lg font-bold text-blue-500">${totalLocalImgUSD.toFixed(2)}</span> <span className="text-xs text-muted-foreground">USD</span>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Vídeos (Veo / Omni)</span>
                        <span className="text-lg font-bold text-purple-500">${totalLocalVidUSD.toFixed(2)}</span> <span className="text-xs text-muted-foreground">USD</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-sm font-bold flex-wrap gap-2">
                      <span className="text-muted-foreground">Total Direct API (Google/OpenAI):</span>
                      <span className="text-emerald-500 text-base">${totalLocalUSD} USD</span>
                    </div>
                  </div>
                </div>
              )}

              {engineMode === 'kie' && (
                <div className="space-y-4 animate-in fade-in duration-300 max-w-full overflow-hidden">
                  {/* Preset Packages Selector */}
                  <div className="space-y-2 p-4 bg-secondary/20 border border-purple-500/20 rounded-xl max-w-full overflow-hidden">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      <span>Pacote de Modelos Kie.ai (Pré-definições)</span>
                    </Label>
                    <div className="flex w-full gap-2 p-1.5 bg-background rounded-lg border border-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setKiePackage('economic')
                          setImageModel('seedream-3.0')
                          setThumbnailModel('seedream-3.0')
                          setVideoModel('seedance-2-fast-720p')
                          setVoiceModel('elevenlabs-turbo')
                          setMusicModel('suno-v4')
                        }}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all min-w-0 truncate",
                          kiePackage === 'economic'
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/40"
                        )}
                      >
                        Econômico
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKiePackage('standard')
                          setImageModel('ideogram-v3-balanced')
                          setThumbnailModel('flux-kontext-pro')
                          setVideoModel('seedance-2-720p')
                          setVoiceModel('elevenlabs-turbo')
                          setMusicModel('suno-v4')
                        }}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all min-w-0 truncate",
                          kiePackage === 'standard'
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/40"
                        )}
                      >
                        Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKiePackage('quality')
                          setImageModel('ideogram-v3-quality')
                          setThumbnailModel('flux-kontext-max')
                          setVideoModel('runway-gen3-turbo')
                          setVoiceModel('elevenlabs-v2')
                          setMusicModel('suno-v5')
                        }}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all min-w-0 truncate",
                          kiePackage === 'quality'
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/40"
                        )}
                      >
                        Qualidade
                      </button>
                    </div>
                  </div>

                  <ModelSelector type="image" value={imageModel} onChange={setImageModel} engineMode={engineMode} label="1. Geração de Imagens das Cenas (Kie.ai)" icon={ImageIcon} iconColor="text-blue-500" />
                  <ModelSelector type="image" value={thumbnailModel} onChange={setThumbnailModel} engineMode={engineMode} label="2. Geração da Thumbnail / Capa HD (Kie.ai)" icon={ImageIcon} iconColor="text-pink-500" />
                  <ModelSelector type="video" value={videoModel} onChange={setVideoModel} engineMode={engineMode} label="3. Geração de Vídeo / Motion AI (Kie.ai)" icon={Video} iconColor="text-purple-500" />
                  <ModelSelector type="voice" value={voiceModel} onChange={setVoiceModel} engineMode={engineMode} disabled={!hasVoice} label={hasVoice ? "4. Geração de Voz (TTS Kie.ai)" : "Modelo de Voz (desabilitado — sem voz na etapa 1)"} icon={Volume2} iconColor="text-emerald-500" />
                  <ModelSelector type="music" value={musicModel} onChange={setMusicModel} engineMode={engineMode} disabled={!hasMusic} label={hasMusic ? "5. Modelo de Música (Kie.ai)" : "Modelo de Música (desabilitado — sem música na etapa 1)"} icon={Music} iconColor="text-amber-500" />
                  <ModelSelector type="editor" value={renderModel} onChange={setRenderModel} engineMode={engineMode} label="6. Edição & Renderização Final (Remotion VPS)" icon={LayoutTemplate} iconColor="text-cyan-400" />

                  {/* Cost breakdown */}
                  <div className="bg-primary/5 rounded-xl p-4 sm:p-5 border border-primary/10 space-y-4 max-w-full overflow-hidden">
                    <p className="text-xs font-bold text-primary uppercase">Estimativa de Custo por Vídeo (Kie.ai)</p>
                    {vidEntry?.billing === 'per_second' && (
                      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Modelo de vídeo cobrado por segundo (~{Math.round(avgDuration)}s/cena).</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Imagens ({segmentsCount} cenas)</span>
                        <span className="text-lg font-bold text-blue-500">{totalImg}</span> <span className="text-xs text-muted-foreground">cr</span>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <span className="text-xs text-muted-foreground font-bold uppercase block mb-1">Thumbnail (1 capa HD)</span>
                        <span className="text-lg font-bold text-pink-500">{totalThumb}</span> <span className="text-xs text-muted-foreground">cr</span>
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
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-primary font-bold uppercase">Total Estimado</span>
                      <div className="text-right">
                        <span className="text-xl font-black text-primary">{totalCredits}</span> <span className="text-xs text-muted-foreground">créditos</span>
                        <p className="text-xs text-emerald-500 font-bold">≈ ${totalUSD} USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {engineMode === 'manual' && (
                <div className="space-y-4 animate-in fade-in duration-300 max-w-full overflow-hidden">
                  <ModelSelector type="image" value={imageModel} onChange={setImageModel} engineMode={engineMode} label="1. Geração de Imagens das Cenas (Por fora / Suas IAs)" icon={ImageIcon} iconColor="text-blue-500" />
                  <ModelSelector type="image" value={thumbnailModel} onChange={setThumbnailModel} engineMode={engineMode} label="2. Capa do Vídeo / Thumbnail (Por fora / Suas IAs)" icon={ImageIcon} iconColor="text-pink-500" />
                  <ModelSelector type="video" value={videoModel} onChange={setVideoModel} engineMode={engineMode} label="3. Geração de Vídeo / Motion (Por fora / Suas IAs)" icon={Video} iconColor="text-purple-500" />

                  {/* Voice options: Edge TTS (Internal Free) or Manual (External) */}
                  <div className="space-y-2 max-w-full overflow-hidden">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                      <Volume2 className="h-4 w-4 shrink-0" />
                      <span>4. Geração de Voz (Escolha o Método)</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVoiceModel('edge-tts-docker')}
                        className={cn(
                          "p-3 rounded-lg border text-left text-xs transition-all min-w-0 max-w-full overflow-hidden",
                          voiceModel === 'edge-tts-docker'
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                            : "border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                        )}
                      >
                        <p className="font-bold text-xs text-foreground truncate">🎙️ Edge TTS (Interno Gratuito)</p>
                        <p className="text-[10px] opacity-70 mt-0.5 break-words leading-tight">Sintetiza vozes neurais automaticamente no n8n</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVoiceModel('manual-voice')}
                        className={cn(
                          "p-3 rounded-lg border text-left text-xs transition-all min-w-0 max-w-full overflow-hidden",
                          voiceModel === 'manual-voice'
                            ? "border-purple-500 bg-purple-500/10 text-purple-400 font-bold"
                            : "border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground"
                        )}
                      >
                        <p className="font-bold text-xs text-foreground truncate">✍️ Voz Externa / Manual</p>
                        <p className="text-[10px] opacity-70 mt-0.5 break-words leading-tight">Gerada no ElevenLabs Web ou gravada por fora</p>
                      </button>
                    </div>
                  </div>

                  <ModelSelector type="editor" value={renderModel} onChange={setRenderModel} engineMode={engineMode} label="5. Edição & Renderização Final (n8n / Remotion VPS)" icon={LayoutTemplate} iconColor="text-cyan-400" />

                  <div className="bg-amber-500/10 rounded-xl p-4 sm:p-5 border border-amber-500/20 space-y-3 max-w-full overflow-hidden">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                      <p className="text-xs font-bold text-amber-400 uppercase truncate">Modo Manual: Suas IAs Externas + Editor n8n Remotion</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      Neste modo, a geração de mídias é feita por fora pelas suas IAs contratadas (Midjourney, Sora, ChatGPT, etc.).
                      Você fará o upload das mídias na <strong>Central de Criação (Manual)</strong>.
                      A voz pode ser gerada gratuitamente pelo <strong>Edge TTS interno</strong> ou fornecida por você. O <strong>n8n + Remotion Engine</strong> fará toda a montagem e edição final automaticamente!
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                      <span className="text-muted-foreground">Custo de API no Darktube:</span>
                      <span className="text-emerald-400">$0.00 USD (Custo zero de API de mídias)</span>
                    </div>
                  </div>
                </div>
              )}
            </>)}

            {/* ═══ STEP 3: Publicação ═══ */}
            {currentStep === 3 && (<>
              {/* Frequência de Postagem */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-primary" /> Frequência de Postagem
                </Label>
                <Select value={frequency} onValueChange={(val) => {
                  setFrequency(val)
                  if (val === 'daily') {
                    setPostDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
                  }
                }}>
                  <SelectTrigger className="bg-secondary/20 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária (Todos os dias)</SelectItem>
                    <SelectItem value="weekly">Semanal (Dias específicos da semana)</SelectItem>
                    <SelectItem value="biweekly">Quinzenal (Dias específicos a cada 2 semanas)</SelectItem>
                    <SelectItem value="monthly">Mensal (Dias específicos no mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dias da Semana (Seletor Interativo) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-purple-400" /> Dias da Semana para Postagem
                  </Label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPostDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])}
                      className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold transition-colors"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostDays(['mon', 'tue', 'wed', 'thu', 'fri'])}
                      className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold transition-colors"
                    >
                      Seg-Sex
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostDays(['sat', 'sun'])}
                      className="px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold transition-colors"
                    >
                      Sáb-Dom
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 p-2 bg-secondary/10 border border-border/60 rounded-xl">
                  {WEEKDAYS.map((day) => {
                    const isSelected = postDays.includes(day.id)
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (postDays.length > 1) {
                              setPostDays(postDays.filter(d => d !== day.id))
                            }
                          } else {
                            setPostDays([...postDays, day.id])
                          }
                        }}
                        className={cn(
                          "py-2.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border text-center",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20"
                            : "bg-background/80 hover:bg-secondary/60 border-border text-muted-foreground"
                        )}
                      >
                        <span>{day.short}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Agendado para ({postDays.length} {postDays.length === 1 ? 'dia' : 'dias'}):{" "}
                    <strong className="text-foreground font-semibold">
                      {postDays.length === 7
                        ? "Todos os dias da semana"
                        : WEEKDAYS.filter(d => postDays.includes(d.id)).map(d => d.label).join(", ")}
                    </strong>
                  </span>
                </div>
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
                  <SummaryCard label="Imagem (Cenas)" value={imgEntry?.label || imageModel} sub={`${imgEntry?.credits || 0} cr/img`} />
                  <SummaryCard label="Capa / Thumbnail" value={thumbEntry?.label || thumbnailModel} sub={`${thumbEntry?.credits || 0} cr/capa`} />
                  <SummaryCard label="Vídeo" value={vidEntry?.label || videoModel} sub={formatBilling(vidEntry!)} />
                  {hasVoice && <SummaryCard label="Voz (TTS)" value={voiEntry?.label || voiceModel} sub={formatBilling(voiEntry!)} />}
                  {hasMusic && musicModel !== 'none' && musEntry && <SummaryCard label="Música" value={musEntry?.label || musicModel} sub={formatBilling(musEntry!)} />}
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
                <p className="text-xs font-bold text-primary uppercase">Publicação & Agendamento</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SummaryCard label="Frequência" value={frequency === 'daily' ? 'Diária' : frequency === 'weekly' ? 'Semanal' : frequency === 'biweekly' ? 'Quinzenal' : 'Mensal'} />
                  <SummaryCard label="Dias Selecionados" value={postDays.length === 7 ? 'Todos os dias' : WEEKDAYS.filter(d => postDays.includes(d.id)).map(d => d.short).join(', ')} />
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
