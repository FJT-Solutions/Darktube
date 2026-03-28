"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/metrics"
import type { YouTubeVideo } from "@/lib/types"
import { analyzeVideoAction, analyzeExternalVideoAction, generateScriptAction, type ScriptProvider } from "@/app/actions"
import {
  Eye, Clock, Calendar, DollarSign, Sparkles, Wand2, Loader2, CheckCircle2,
  Zap, Wrench, Info, X, Download, CloudUpload, Brain, BookText, Save, ChevronDown,
  LayoutTemplate,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TemplateConfigDialog } from "./template-config-dialog"
import { toast } from "sonner"

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return iso
  }
}

type AnalysisStep = 'idle' | 'downloading' | 'uploading' | 'analyzing' | 'scripting' | 'done' | 'error'

const STEPS: { key: AnalysisStep; label: string; icon: React.ElementType }[] = [
  { key: 'downloading', label: 'Baixando vídeo (360p)...', icon: Download },
  { key: 'uploading', label: 'Enviando para o Gemini...', icon: CloudUpload },
  { key: 'analyzing', label: 'IA assistindo o vídeo...', icon: Brain },
  { key: 'scripting', label: 'Gerando roteiro...', icon: BookText },
]

interface VideoCardProps {
  video: YouTubeVideo
  className?: string
  compact?: boolean
  cpm?: number
  channel?: any
}

export function VideoCard({ video, className, compact, cpm, channel }: VideoCardProps) {
  const estimatedRevenue = cpm ? (video.views / 1000) * cpm : 0

  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<AnalysisStep>('idle')
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [script, setScript] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'analysis' | 'script'>('analysis')
  const [scriptProvider, setScriptProvider] = useState<ScriptProvider>('gemini')
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  // Use stored analysis from video if already analyzed
  const storedAnalysis = useMemo(() => {
    if (video.aiAnalysis) {
      try { return JSON.parse(video.aiAnalysis) } catch { return null }
    }
    return null
  }, [video.aiAnalysis])

  const analysis = analysisResult || storedAnalysis

  function openDialog() {
    setDialogOpen(true)
    if (!analysis) {
      runAnalysis()
    }
  }

  async function runAnalysis() {
    setStep('downloading')
    setErrorMsg('')
    setAnalysisResult(null)
    setScript('')

    try {
      // Determine if this is an external video (non-YouTube source)
      const isExternal = video.source && video.source !== 'youtube' && video.originalUrl

      // Step 1-3: Visual analysis (download + upload + Gemini)
      const uploadTimer = setTimeout(() => setStep('uploading'), 3000)
      const analyzeTimer = setTimeout(() => setStep('analyzing'), 8000)

      let result: any
      if (isExternal) {
        result = await analyzeExternalVideoAction(video.originalUrl!, video)
      } else {
        result = await analyzeVideoAction(video, channel)
      }

      clearTimeout(uploadTimer)
      clearTimeout(analyzeTimer)

      if (!result.success || !result.analysis) {
        setStep('error')
        setErrorMsg(result.error || 'Falha na análise. Tente novamente.')
        return
      }

      setAnalysisResult(result.analysis)
      setTranscript(result.transcript || '')

      // Step 4: Generate script
      setStep('scripting')
      const scriptResult = await generateScriptAction(
        video.id,
        video.title,
        JSON.stringify(result.analysis),
        result.transcript || '',
        scriptProvider
      )

      if (scriptResult.success && scriptResult.script) {
        setScript(scriptResult.script)
      }

      setStep('done')
    } catch (err: any) {
      setStep('error')
      setErrorMsg(err?.message || 'Erro inesperado.')
    }
  }

  async function reGenerateScript() {
    if (!analysis) return
    setScript('')
    setIsGeneratingScript(true)
    const r = await generateScriptAction(video.id, video.title, JSON.stringify(analysis), transcript, scriptProvider)
    if (r.success && r.script) setScript(r.script)
    setIsGeneratingScript(false)
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === step)
  const isDone = step === 'done'
  const isError = step === 'error'

  if (compact) {
    return (
      <div className={cn("group flex gap-3", className)}>
        <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
          {video.duration && (
            <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">{video.duration}</span>
          )}
          {video.source && video.source !== 'youtube' && (
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">{video.source}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium text-card-foreground hover:text-primary transition-colors">{video.title}</a>
          <p className="text-xs text-muted-foreground">{video.channelName}</p>
          <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(video.views)}</span>
            {video.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(video.publishedAt)}</span>}
            {estimatedRevenue > 0 && <span className="flex items-center gap-1 text-emerald-500 font-medium"><DollarSign className="h-3 w-3" />{estimatedRevenue < 10 ? estimatedRevenue.toFixed(2) : formatNumber(Math.round(estimatedRevenue))}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn("group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5", className)}>
        <div className="relative aspect-video overflow-hidden bg-secondary">
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
          {video.duration && (
            <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">{video.duration}</span>
          )}
          {video.source && video.source !== 'youtube' && (
            <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-sm">{video.source}</span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium text-card-foreground hover:text-primary transition-colors">{video.title}</a>
          <Link href={`/canal/${encodeURIComponent(video.channelId)}`} className="text-xs text-muted-foreground hover:text-primary transition-colors truncate" title={video.channelName}>{video.channelName}</Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 shrink-0"><Eye className="h-2.5 w-2.5" />{formatNumber(video.views)}</span>
            <span className="flex items-center gap-1 shrink-0"><Clock className="h-2.5 w-2.5" />{video.duration}</span>
            {video.publishedAt && <span className="flex items-center gap-1 shrink-0"><Calendar className="h-2.5 w-2.5" />{formatDate(video.publishedAt)}</span>}
            {estimatedRevenue > 0 && <span className="flex items-center gap-1 text-emerald-500 font-medium shrink-0"><DollarSign className="h-2.5 w-2.5" />{estimatedRevenue < 10 ? estimatedRevenue.toFixed(2) : formatNumber(Math.round(estimatedRevenue))}</span>}
          </div>

          {/* AI Section */}
          <div className="mt-3 pt-3 border-t border-border/50">
            {analysis ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">IA: {analysis.feasibility}</span>
                  </div>
                  <button onClick={openDialog} className="text-[9px] text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
                    Ver detalhes
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                    <Eye className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.visualStyle}</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                    <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.pacing}</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50">
                    <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">{analysis.productionMethod}</span>
                  </div>
                  <div className="ml-auto text-[8px] text-muted-foreground/60 font-mono">
                    {Math.round((analysis.confidence || 0) * 100)}% conf.
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={openDialog}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary/80 hover:bg-primary/10 hover:text-primary py-2 text-[10px] font-semibold transition-all group/ai"
              >
                <Wand2 className="h-3 w-3 transition-transform group-hover/ai:rotate-12" />
                <span>Analisar com Gemini Vision</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              Análise Visual — Gemini 2.5 Flash
            </DialogTitle>
          </DialogHeader>

          {/* Progress Steps */}
          {!isDone && !isError && step !== 'idle' && (
            <div className="space-y-3 py-4">
              <div className="text-xs font-medium text-muted-foreground text-center mb-4">
                Isso pode levar alguns minutos. A IA está assistindo o vídeo completo...
              </div>
              {STEPS.map((s, i) => {
                const isPast = currentStepIndex > i
                const isCurrent = STEPS[currentStepIndex]?.key === s.key
                return (
                  <div key={s.key} className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
                    isCurrent && "bg-primary/10 border border-primary/20",
                    isPast && "opacity-50",
                  )}>
                    {isPast
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : isCurrent
                        ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                    }
                    <s.icon className={cn("h-4 w-4 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm", isCurrent ? "text-foreground font-medium" : "text-muted-foreground")}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <p className="font-semibold mb-1">Falha na análise</p>
              <p className="text-xs opacity-80">{errorMsg}</p>
              <button
                onClick={runAnalysis}
                className="mt-3 text-xs font-medium underline underline-offset-2 hover:opacity-70"
              >Tentar novamente</button>
            </div>
          )}

          {/* Results */}
          {isDone && analysis && (
            <div className="space-y-4">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase">Análise Visual · {analysis.feasibility}</span>
                </div>
                <span className="text-xs text-muted-foreground italic">{analysis.style}</span>
                <span className="ml-auto text-xs text-muted-foreground/60 font-mono">{Math.round((analysis.confidence || 0) * 100)}%</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
                <button onClick={() => setActiveTab('analysis')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-all font-medium", activeTab === 'analysis' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  Template de Análise
                </button>
                <button onClick={() => setActiveTab('script')} className={cn("flex-1 text-xs py-1.5 rounded-md transition-all font-medium", activeTab === 'script' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  Roteiro Gerado
                </button>
              </div>

              {activeTab === 'analysis' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Estilo Visual', value: analysis.visualStyle },
                      { label: 'Ritmo', value: analysis.pacing },
                      { label: 'Produção', value: analysis.productionMethod },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-secondary/50 p-2 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {analysis.justification && (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <p className="text-[10px] font-bold text-primary uppercase mb-1">Veredito Técnico</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{analysis.justification}</p>
                    </div>
                  )}

                  {analysis.remodelingTip && (
                    <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Dica de Remodelagem</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{analysis.remodelingTip}</p>
                    </div>
                  )}

                  {analysis.remodeling_template?.thumbnail_prompt && (
                    <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Prompt para Thumbnail</p>
                      <p className="text-xs text-foreground/70 leading-relaxed font-mono">{analysis.remodeling_template.thumbnail_prompt}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'script' && (
                <div className="space-y-3">
                  {/* Script provider selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground shrink-0">Gerar com:</label>
                    <select
                      value={scriptProvider}
                      onChange={e => setScriptProvider(e.target.value as ScriptProvider)}
                      className="text-xs rounded-md bg-secondary border border-border px-2 py-1 text-foreground flex-1"
                    >
                      <option value="gemini">Gemini (Google)</option>
                      <option value="openai">GPT-4o (OpenAI)</option>
                      <option value="claude">Claude (Anthropic)</option>
                    </select>
                    <button
                      onClick={reGenerateScript}
                      disabled={isGeneratingScript}
                      className="text-xs px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isGeneratingScript ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gerar'}
                    </button>
                  </div>

                  {script ? (
                    <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">{script}</pre>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-6">
                      Selecione o provider e clique em "Gerar" para criar o roteiro.
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <div className="pt-2 border-t border-border/50">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Configurar e Salvar Template
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TemplateConfigDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        video={video}
        analysis={analysis}
        script={script}
        onSuccess={() => {
          setDialogOpen(false)
          // The page will revalidate via server actions
        }}
      />
    </>
  )
}
