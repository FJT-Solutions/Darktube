"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Film,
  Sparkles,
  Loader2,
  Copy,
  Download,
  Trash2,
  ArrowLeft,
  Send,
  Save,
  Wifi,
  WifiOff,
  FolderOpen,
  Check,
  ShieldAlert,
  CalendarClock,
  Hammer,
  Upload,
  RefreshCw,
  BookmarkPlus,
  Mic,
  Calculator,
  Zap,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  COMMON_FIELDS,
  FLOW_TEMPLATES,
  LANGUAGES,
  MAX_TAKES,
  REALISM,
  TAKE_SECONDS,
  VIDEO_MODELS,
  allowedSecondsForModel,
  clampSecondsForModel,
  getFlowTemplate,
  templateFieldDefaults,
  wordLimit,
  type FlowField,
  type FlowTemplate,
} from "@/lib/flow-templates"
import { buildTakePrompt, countWords, exportScriptText, takeKind, takeReference, validateScript, type FlowScript, type FlowTake, type FlowTakeKind } from "@/lib/flow-script"
import { FlowCreditSimulator } from "@/components/flow-credit-simulator"
import { PROVIDER_LABEL, type FlowProvider } from "@/lib/flow-llm"
import type { FlowProject } from "@/lib/flow-projects"
import type { FlowLibraryCharacter } from "@/lib/flow-characters"
import {
  deleteFlowProjectAction,
  generateFlowProjectAction,
  createNextPartAction,
  createBlankFlowProjectAction,
  checkFlowScriptAction,
  getFlowProjectAction,
  getFlowProvidersAction,
  listFlowProjectsAction,
  queueFlowProjectAction,
  saveFlowScriptAction,
  regenerateFinalAction,
  assembleFlowProjectAction,
  listFlowAccountsAction,
  publishFlowProjectAction,
  retryFlowPublishAction,
  deleteFlowPublishAction,
  getFlowRiskAction,
  saveFlowRiskAction,
  resumeFlowAgentAction,
  generateCharacterSheetAction,
  generateCastSheetAction,
  syncSheetsAction,
  approveSheetAction,
  clearSheetAction,
  saveCharacterToLibraryAction,
  useLibraryCharacterAction,
  listFlowLibraryAction,
  saveFlowRefOptionsAction,
  replaceFlowAudioAction,
} from "./actions"

type View = "novo" | "projeto" | "projetos"
type ProjectRow = Omit<FlowProject, "script">

interface JobRow {
  id: string
  take_index: number | null
  role: string | null
  status: string
  error_message: string | null
  result_url: string | null
}

const MODE_LABEL: Record<string, string> = { dialogo: "Fala", narracao: "Narração", ambiente: "Sem fala", livre: "Livre" }
const KIND_OPTIONS: { value: FlowTakeKind; label: string }[] = [
  { value: "dialogo", label: "Personagem fala" },
  { value: "narracao", label: "Narrador" },
  { value: "ambiente", label: "Sem fala" },
]

const STATUS_LABEL: Record<string, string> = {
  queued: "Na fila",
  running: "Gerando",
  collecting: "Coletando",
  done: "Pronto",
  draft: "Rascunho",
  cancelled: "Cancelado",
}

const SHEET_STATUS_LABEL: Record<string, string> = {
  gerando: "Gerando no Flow...",
  aguardando: "Aguardando aprovação",
  aprovada: "Aprovada",
}

/** Duracao legivel: "48 s", "3 min 12 s". */
function fmtDuration(totalSec: number): string {
  const t = Math.max(0, Math.round(totalSec))
  if (t < 60) return t + " s"
  const m = Math.floor(t / 60)
  const r = t % 60
  return r ? m + " min " + r + " s" : m + " min"
}

/** Posicao no video final: "1:04". */
function fmtClock(sec: number): string {
  const t = Math.max(0, Math.round(sec))
  return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0")
}

function copyText(text: string, label = "Copiado") {
  navigator.clipboard.writeText(text).then(
    () => toast.success(label),
    () => toast.error("Não foi possível copiar.")
  )
}

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function FieldInput({ field, value, onChange }: { field: FlowField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{field.label}</label>
      {field.type === "select" ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={field.id === "roteiro" ? 8 : 3} maxLength={field.id === "roteiro" ? 8000 : 900} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} maxLength={200} />
      )}
    </div>
  )
}

export default function FlowPage() {
  const [view, setView] = useState<View>("novo")
  const [templateId, setTemplateId] = useState(FLOW_TEMPLATES[0].id)
  const template = getFlowTemplate(templateId) as FlowTemplate

  const [values, setValues] = useState<Record<string, string>>(() => templateFieldDefaults(FLOW_TEMPLATES[0]))
  const [idioma, setIdioma] = useState("pt-BR")
  const [realismo, setRealismo] = useState("cinematografico")
  const [takes, setTakes] = useState(FLOW_TEMPLATES[0].defaults.takes)
  const [seconds, setSeconds] = useState(FLOW_TEMPLATES[0].defaults.seconds)
  const [aspect, setAspect] = useState(FLOW_TEMPLATES[0].defaults.aspect)
  const [model, setModel] = useState(FLOW_TEMPLATES[0].defaults.model)
  const [quality, setQuality] = useState(FLOW_TEMPLATES[0].defaults.quality)
  const [wordsPerCaption, setWordsPerCaption] = useState<number>(() => FLOW_TEMPLATES[0].defaults.wordsPerCaption ?? 2)
  const [showSimulator, setShowSimulator] = useState(false)
  const [isHybrid, setIsHybrid] = useState(true)

  const [lengthFilter, setLengthFilter] = useState<"todos" | "curto" | "longo">("todos")
  const [trendFilter, setTrendFilter] = useState<"todos" | "viral" | "atemporal">("todos")
  const shownTemplates = FLOW_TEMPLATES.filter(
    (t) => t.id === "livre" || ((lengthFilter === "todos" || t.length === lengthFilter) && (trendFilter === "todos" || t.trend === trendFilter))
  )

  const [providers, setProviders] = useState<string[]>([])
  const [provider, setProvider] = useState("")
  const [generating, setGenerating] = useState(false)

  const [project, setProject] = useState<FlowProject | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])

  useEffect(() => {
    getFlowProvidersAction().then((res) => {
      if (res.success) {
        setProviders(res.providers)
        setProvider((p) => p || res.providers[0] || "")
      }
    })
  }, [])

  const pickTemplate = (id: string) => {
    const t = getFlowTemplate(id)
    if (!t) return
    setTemplateId(id)
    setValues(templateFieldDefaults(t))
    setTakes(t.defaults.takes)
    setSeconds(clampSecondsForModel(t.defaults.seconds, t.defaults.model))
    setAspect(t.defaults.aspect)
    setModel(t.defaults.model)
    setQuality(t.defaults.quality)
    setRealismo(t.defaults.realismo ?? "cinematografico")
    setWordsPerCaption(t.defaults.wordsPerCaption ?? (t.trend === "viral" ? 1 : 2))
  }

  const loadProjects = useCallback(async () => {
    const res = await listFlowProjectsAction()
    if (res.success) setProjects(res.projects as ProjectRow[])
    else toast.error(res.error)
  }, [])

  const generate = async () => {
    if (!provider) {
      toast.error("Salve uma chave de IA em Credenciais primeiro.")
      return
    }
    setGenerating(true)
    const res = await generateFlowProjectAction({
      templateId,
      provider,
      params: { ...values, idioma, realismo, takes, seconds, aspect, model, isHybrid, quality: model.toLowerCase().includes("omni") ? quality : undefined, wordsPerCaption },
    })
    setGenerating(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setProject(res.project as FlowProject)
    setView("projeto")
    toast.success("Roteiro gerado e salvo.")
    if (res.issues?.length) toast.warning(`Confira o roteiro: ${res.issues.length} ponto(s) fora das regras do formato.`)
  }

  const startBlank = async () => {
    setGenerating(true)
    const res = await createBlankFlowProjectAction({ params: { ...values, idioma, realismo, takes, seconds, aspect, model, isHybrid, quality: model.toLowerCase().includes("omni") ? quality : undefined, wordsPerCaption } })
    setGenerating(false)
    if (!res.success) return void toast.error(res.error)
    setProject(res.project as FlowProject)
    setView("projeto")
    toast.success("Projeto em branco criado: escreva cada take.")
  }

  const openProject = async (id: string) => {
    const res = await getFlowProjectAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setProject(res.project as FlowProject)
    setView("projeto")
  }

  const removeProject = async (id: string) => {
    if (!window.confirm("Apagar este projeto?")) return
    await deleteFlowProjectAction(id)
    loadProjects()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Flow</h1>
            <p className="text-sm text-muted-foreground">Roteiro, takes e vídeos pelo Google Flow, com os créditos da sua conta.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showSimulator ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSimulator((s) => !s)}
          >
            <Calculator className="mr-1.5 h-4 w-4 text-amber-500" /> Simulador de créditos
          </Button>
          <Button variant={view === "novo" ? "default" : "outline"} size="sm" onClick={() => setView("novo")}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Novo projeto
          </Button>
          <Button
            variant={view === "projetos" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setView("projetos")
              loadProjects()
            }}
          >
            <FolderOpen className="mr-1.5 h-4 w-4" /> Meus projetos
          </Button>
        </div>
      </div>

      <SafetyPanel />

      {showSimulator && (
        <FlowCreditSimulator
          currentModel={model}
          currentSeconds={seconds}
          currentTakes={takes}
          currentIsHybrid={isHybrid}
          onClose={() => setShowSimulator(false)}
          onApplyConfig={(m, s, tk, hybrid) => {
            setModel(m)
            setSeconds(s)
            setTakes(tk)
            if (typeof hybrid === "boolean") setIsHybrid(hybrid)
            setShowSimulator(false)
            toast.success(`Parâmetros aplicados: ${tk} takes de ${s}s no modelo ${m}`)
          }}
        />
      )}

      {view === "novo" && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Templates</p>
            <div className="flex flex-wrap gap-1">
              {(["todos", "curto", "longo"] as const).map((v) => (
                <Button key={v} size="sm" variant={lengthFilter === v ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setLengthFilter(v)}>
                  {v === "todos" ? "Todos" : v === "curto" ? "Curtos" : "Longos"}
                </Button>
              ))}
              {(["todos", "viral", "atemporal"] as const).map((v) => (
                <Button key={"t" + v} size="sm" variant={trendFilter === v ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setTrendFilter(v)}>
                  {v === "todos" ? "Qualquer" : v === "viral" ? "Virais" : "Atemporais"}
                </Button>
              ))}
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {shownTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTemplate(t.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  t.id === templateId ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">{MODE_LABEL[t.mode] ?? t.mode}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.niche} · {t.subniche}</p>
                <div className="mt-1 flex gap-1">
                  <Badge variant="secondary" className="text-[10px]">{t.length === "longo" ? "Longo" : "Curto"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{t.trend === "viral" ? "Viral" : "Atemporal"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{t.defaults.takes} × {t.defaults.seconds} s ≈ {fmtDuration(t.defaults.takes * t.defaults.seconds)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...COMMON_FIELDS, ...template.fields].map((f) => (
                <FieldInput key={f.id} field={f} value={values[f.id] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))} />
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Idioma da fala e do texto</label>
                  <Select value={idioma} onValueChange={setIdioma}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Estilo visual</label>
                  <Select value={realismo} onValueChange={setRealismo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REALISM.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Quantidade de takes</label>
                  <span className="text-sm font-semibold">{takes}</span>
                </div>
                <Slider min={1} max={MAX_TAKES} step={1} value={[takes]} onValueChange={(v) => setTakes(v[0])} />
                <p className="text-xs text-muted-foreground">Duração total: {takes} takes × {seconds} s = <span className="font-semibold text-foreground">{fmtDuration(takes * seconds)}</span></p>
              </div>

              {/* Condição de presença de fala no template atual */}
              {(() => {
                const hasSpeech =
                  template.mode !== "ambiente" &&
                  values.voz !== "sem_voz" &&
                  values.fala !== "sem_fala" &&
                  values.tipo_fala !== "ambiente" &&
                  values.narracao !== "sem_voz"

                return (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Segundos por take</label>
                          <span className="text-[10px] text-muted-foreground">Ritmo por cena</span>
                        </div>
                        <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {allowedSecondsForModel(model).map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                {s}s {model.includes("Veo") ? "(Veo)" : "(Omni)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasSpeech ? (
                          <p className="text-xs text-muted-foreground">Fala: até {wordLimit(seconds)} palavras por take</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Cena sem fala: ação e ambientação</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Formato</label>
                        <Select value={aspect} onValueChange={setAspect}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9:16">9:16 (vertical)</SelectItem>
                            <SelectItem value="16:9">16:9 (horizontal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Modelo de vídeo</label>
                        <Select
                          value={model}
                          onValueChange={(m) => {
                            setModel(m)
                            setSeconds((prev) => clampSecondsForModel(prev, m))
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {VIDEO_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {model.toLowerCase().includes("omni") ? (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Qualidade</label>
                          <Select value={quality} onValueChange={setQuality}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="360p">360p (rascunho)</SelectItem>
                              <SelectItem value="720p">720p (final)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      {hasSpeech ? (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Palavras por legenda</label>
                          <Select value={String(wordsPerCaption)} onValueChange={(v) => setWordsPerCaption(Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 palavra (dinâmico)</SelectItem>
                              <SelectItem value="2">2 palavras (rápido)</SelectItem>
                              <SelectItem value="3">3 palavras (curto)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1.5 opacity-60">
                          <label className="text-sm font-medium">Palavras por legenda</label>
                          <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-xs text-muted-foreground">
                            Sem fala (legendas inativas)
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium">Modo Híbrido Inteligente</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                            {isHybrid ? "Economiza até 53% de créditos" : "100% no modelo base"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Preserva máxima fidelidade nos diálogos e rebaixa automaticamente B-rolls para Lite da mesma família.
                        </p>
                      </div>
                      <Switch checked={isHybrid} onCheckedChange={setIsHybrid} />
                    </div>
                  </>
                )
              })()}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">IA do roteiro</label>
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma chave de IA salva.{" "}
                    <Link href="/credentials" className="text-primary underline">Adicionar em Credenciais</Link>
                  </p>
                ) : (
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p} value={p}>{PROVIDER_LABEL[p as FlowProvider] ?? p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button onClick={generate} disabled={generating || !provider} className="w-full">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generating ? "Gerando roteiro..." : template.mode === "livre" ? "Montar com IA (completa o que faltar)" : "Gerar roteiro"}
              </Button>
              {template.mode === "livre" && (
                <Button variant="outline" onClick={startBlank} disabled={generating} className="w-full">
                  Começar em branco (escrevo cada take, sem IA)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === "projetos" && (
        <div className="space-y-2">
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>}
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => openProject(p.id)}>
                <p className="truncate font-medium">{p.title || "Sem título"}</p>
                <p className="text-xs text-muted-foreground">
                  {getFlowTemplate(p.template_id)?.name ?? p.template_id} · {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
              </button>
              <Badge variant="outline">{p.status === "queued" ? "Na fila do Flow" : "Rascunho"}</Badge>
              <Button variant="ghost" size="icon" onClick={() => removeProject(p.id)} aria-label="Apagar projeto">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {view === "projeto" && project && (
        <ProjectView
          key={project.id}
          project={project}
          onBack={() => setView("novo")}
          onChanged={(p) => setProject(p)}
        />
      )}
    </div>
  )
}

import type { RiskSettings, RiskUsage, RiskBand } from "@/lib/flow-risk"

interface StatusData {
  agentOnline: boolean
  agent: { capabilities: any; capabilitiesAt: string | null; mode: string | null; pausedUntil: string | null; pauseReason: string | null }
  risk: { settings: RiskSettings; usage: RiskUsage }
}

const BAND_COLOR: Record<RiskBand, string> = { safe: "bg-emerald-500", alert: "bg-amber-500", risk: "bg-red-500" }
const BAND_LABEL: Record<RiskBand, string> = { safe: "Seguro", alert: "Atenção", risk: "Risco" }

function bandFor(value: number, limit: number): RiskBand {
  return value >= limit ? "risk" : value >= limit * 0.7 ? "alert" : "safe"
}

function UsageBar({ label, value, limit, band }: { label: string; value: number; limit: number; band: RiskBand }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{limit} · {BAND_LABEL[band]}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", BAND_COLOR[band])} style={{ width: `${Math.min(100, (value / Math.max(limit, 1)) * 100)}%` }} />
      </div>
    </div>
  )
}

function SafetyPanel() {
  const [data, setData] = useState<StatusData | null>(null)
  const [draft, setDraft] = useState<RiskSettings | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/flow/status", { cache: "no-store" })
      const json = await res.json()
      if (json.success) {
        setData(json)
        setDraft((d) => d ?? json.risk.settings)
      }
    } catch {
      /* sem rede */
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [load])

  if (!data || !draft) return null
  const { agent, risk } = data
  const caps = agent.capabilities
  const s = risk.settings
  const u = risk.usage

  const save = async () => {
    setSaving(true)
    const res = await saveFlowRiskAction(draft)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Limites salvos.")
    load()
  }

  const num = (k: "hourlyLimit" | "dailyLimit" | "minGapSec" | "postsPerDay") => (
    <Input type="number" className="h-8 w-24" value={String(draft[k])} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
  )

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.agentOnline ? "default" : "outline"} className="gap-1">
            {data.agentOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {data.agentOnline ? "Extensão online" : "Extensão offline"}
          </Badge>
          {agent.mode && <Badge variant="outline">{agent.mode === "dry" ? "Modo ensaio (não gera)" : "Gerando de verdade"}</Badge>}
          <Badge variant="outline" className="gap-1">
            <ShieldAlert className="h-3 w-3" /> Gerações: {BAND_LABEL[u.bandGenerations]} · Postagens: {BAND_LABEL[u.bandPosts]}
          </Badge>
        </div>

        {agent.pauseReason && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <span><strong>Aviso do Flow:</strong> {agent.pauseReason} (a fila não foi pausada).</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await resumeFlowAgentAction()
                load()
              }}
            >
              Ocultar aviso
            </Button>
          </div>
        )}

        {u.bandGenerations === "risk" && !s.riskMode && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm">
            Você atingiu o limite configurado de gerações. Os próximos takes ficam em espera. Você pode aumentar os limites ou ativar o modo de risco abaixo (por sua conta e risco).
          </p>
        )}
        {u.bandGenerations === "risk" && s.riskMode && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm">
            Você passou do limite configurado e o modo de risco está ligado (por sua conta e risco).
          </p>
        )}

        {caps && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Leitura da conta pela extensão
              {agent.capabilitiesAt ? ` (${new Date(agent.capabilitiesAt).toLocaleString("pt-BR")})` : ""}
              {caps.note ? ` · ${caps.note}` : ""}
            </p>
            <p>
              Créditos: {caps.credits != null ? caps.credits : "não detectado"} · Modelos de vídeo:{" "}
              {Array.isArray(caps.videoModels) && caps.videoModels.length ? caps.videoModels.join(", ") : "não detectado"} · Modelos de imagem:{" "}
              {Array.isArray(caps.imageModels) && caps.imageModels.length ? caps.imageModels.join(", ") : "não detectado"}
            </p>
            {caps.diag && <p>Detalhe: {JSON.stringify(caps.diag).slice(0, 600)}</p>}
            {caps.selectors && (
              <p>
                Diagnóstico da página: {Object.entries(caps.selectors as Record<string, unknown>).map(([k, v]) => `${k}=${typeof v === "boolean" ? (v ? "ok" : "NÃO achou") : String(v)}`).join(" · ")}
                {caps.path ? ` · rota ${caps.path}` : ""}
              </p>
            )}
          </div>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-medium">Segurança e limites (controle por sua conta e risco)</summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <UsageBar label="Gerações na última hora" value={u.generationsHour} limit={s.hourlyLimit} band={bandFor(u.generationsHour, s.hourlyLimit)} />
              <UsageBar label="Gerações em 24 horas" value={u.generationsDay} limit={s.dailyLimit} band={bandFor(u.generationsDay, s.dailyLimit)} />
              <UsageBar label="Postagens em 24 horas" value={u.posts24h} limit={s.postsPerDay} band={u.bandPosts} />
            </div>
            <div className="flex flex-wrap items-end gap-3 text-xs">
              <label className="space-y-1">Por hora {num("hourlyLimit")}</label>
              <label className="space-y-1">Por dia {num("dailyLimit")}</label>
              <label className="space-y-1">Intervalo mín. (s) {num("minGapSec")}</label>
              <label className="space-y-1">Postagens/dia {num("postsPerDay")}</label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.riskMode} onChange={(e) => setDraft({ ...draft, riskMode: e.target.checked })} />
                Ignorar bloqueio de limites (conta e risco)
              </label>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar limites
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Você tem controle total sobre os limites e o intervalo (use 0s se não quiser espera entre takes). Automatizar o Flow é por sua conta e risco — recomendamos usar uma conta Google secundária.
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

function ProjectView({
  project: initial,
  onBack,
  onChanged,
}: {
  project: FlowProject
  onBack: () => void
  onChanged: (p: FlowProject) => void
}) {
  const [project, setProject] = useState<FlowProject>(initial)
  const template = getFlowTemplate(project.template_id) as FlowTemplate
  const [script, setScript] = useState<FlowScript>(initial.script)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingPart, setCreatingPart] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [queueing, setQueueing] = useState(false)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [agentOnline, setAgentOnline] = useState(false)
  const [publish, setPublish] = useState<{ status: string; error: string | null; publishedAt: string | null } | null>(null)
  const [risk, setRisk] = useState<{ riskMode: boolean; hourlyLimit: number; dailyLimit: number; minGapSec: number } | null>(null)
  const [approved, setApproved] = useState<Set<number>>(new Set())
  const [accounts, setAccounts] = useState<{ id: string; platform: string; name: string }[]>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  // Paginas do Facebook sincronizadas (as mesmas do Dark Clips); o Reel vai para a pagina escolhida.
  const [fbPages, setFbPages] = useState<{ id: string; name: string }[]>([])
  const [fbPage, setFbPage] = useState("")
  const [when, setWhen] = useState("")
  const [now, setNow] = useState(true)
  const [busy, setBusy] = useState("")
  const [sheetBusy, setSheetBusy] = useState("")
  const [library, setLibrary] = useState<FlowLibraryCharacter[]>([])
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null)
  const [audioLipsync, setAudioLipsync] = useState<boolean>(false)

  const handleReplaceAudio = async () => {
    if (!selectedAudioFile || !project.id) return
    setBusy("audio_replace")
    try {
      const fd = new FormData()
      fd.append("audio", selectedAudioFile)
      fd.append("lipsync", String(audioLipsync))
      const res = await replaceFlowAudioAction(project.id, fd)
      if (!res.success) {
        toast.error(res.error || "Falha ao processar a substituição de áudio.")
        return
      }
      toast.success(
        res.lipsyncApplied
          ? "Nova voz aplicada com Lip-Sync e legendas Whisper gravadas!"
          : "Nova voz aplicada com legendas Whisper gravadas com sucesso!"
      )
      setSelectedAudioFile(null)
      await refreshProject()
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao processar a nova voz.")
    } finally {
      setBusy("")
    }
  }

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/flow/jobs?projectId=${project.id}`, { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setJobs(data.jobs)
        setAgentOnline(!!data.agentOnline)
      }
    } catch {
      /* sem rede: mantem o ultimo estado */
    }
  }, [project.id])

  const loadLibrary = useCallback(async () => {
    const res = await listFlowLibraryAction()
    if (res.success) setLibrary(res.characters)
  }, [])

  const applyProjectFromSheet = useCallback(
    (updated: FlowProject, fullCharId?: string) => {
      setProject(updated)
      onChanged(updated)
      setScript((prev) => ({
        ...prev,
        castSheetUrl: updated.script.castSheetUrl,
        castSheetStatus: updated.script.castSheetStatus,
        characters: prev.characters.map((c) => {
          const uc = updated.script.characters.find((x) => x.id === c.id)
          if (!uc) return c
          if (fullCharId === c.id) return { ...uc }
          return {
            ...c,
            sheetUrl: uc.sheetUrl,
            sheetStatus: uc.sheetStatus,
            libraryId: uc.libraryId,
          }
        }),
      }))
    },
    [onChanged]
  )

  const refreshProject = useCallback(async () => {
    const res = await getFlowProjectAction(project.id)
    if (res.success) {
      setProject(res.project as FlowProject)
      onChanged(res.project as FlowProject)
      setPublish(res.publish ?? null)
    }
  }, [project.id, onChanged])

  // Consulta rapida (6 s) so enquanto algo anda: take na fila/gerando, montagem ou publicacao.
  // Parado, consulta a cada 30 s so para o status da extensao.
  const jobsMoving = jobs.some((j) => j.status === "queued" || j.status === "running")
  const projectMoving = project.status === "assembling" || project.status === "publishing"
  useEffect(() => {
    loadJobs()
    const t = setInterval(() => {
      loadJobs()
      if (projectMoving) refreshProject()
    }, jobsMoving || projectMoving ? 6000 : 30000)
    return () => clearInterval(t)
  }, [loadJobs, refreshProject, jobsMoving, projectMoving])

  // Enquanto houver folha 'gerando', chama syncSheetsAction a cada 8 s.
  const anySheetGenerating =
    script.castSheetStatus === "gerando" ||
    script.characters.some((c) => c.sheetStatus === "gerando")

  useEffect(() => {
    if (!anySheetGenerating) return
    const runSync = async () => {
      const res = await syncSheetsAction(project.id)
      if (res.success && res.project) {
        applyProjectFromSheet(res.project as FlowProject)
        const errs = Object.entries((res as any).sheetErrors || {})
        for (const [who, msg] of errs) toast.error((who === "cast" ? "Folha do elenco" : "Folha do personagem") + ": " + String(msg).slice(0, 160) + " Use Refazer para tentar de novo.")
      }
      loadJobs()
    }
    runSync()
    const timer = setInterval(runSync, 8000)
    return () => clearInterval(timer)
  }, [anySheetGenerating, project.id, applyProjectFromSheet, loadJobs])

  // Ao abrir um projeto ja publicado/agendado, busca o resultado do post.
  useEffect(() => {
    if (["publishing", "scheduled", "published", "publish_failed"].includes(project.status)) refreshProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  useEffect(() => {
    getFlowRiskAction().then((r) => r.success && setRisk(r.settings))
    loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    listFlowAccountsAction().then((r) => r.success && setAccounts(r.accounts))
    fetch("/api/social", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const pages = Array.isArray(d?.facebookPages) ? d.facebookPages : []
        setFbPages(pages)
        if (pages[0]) setFbPage((p) => p || pages[0].id)
      })
      .catch(() => {})
  }, [])

  const params = project.params
  const status = project.status
  const overCount = useMemo(
    () => (template.mode === "ambiente" ? 0 : script.takes.filter((t) => countWords(t.line) > wordLimit(t.seconds)).length),
    [script, template.mode]
  )

  const takeJobs = useMemo(
    () => jobs.filter((j) => j.role === "take" || j.role === "take_final" || !j.role),
    [jobs]
  )

  // Melhor job de cada take: o final (720p) pronto, senao o primeiro pronto, senao o ultimo da lista.
  const bestJob = (n: number) => {
    const list = takeJobs.filter((j) => j.take_index === n)
    const done = list.filter((j) => j.status === "done" && j.result_url)
    return done.find((j) => j.role === "take_final") ?? done[0] ?? list[list.length - 1]
  }
  const allDone = script.takes.every((t) => bestJob(t.n)?.status === "done")
  const drafts = script.takes.filter((t) => bestJob(t.n)?.status === "done" && bestJob(t.n)?.role !== "take_final")
  const queuedAny = takeJobs.length > 0

  // Edicao do roteiro: qualquer campo do take, dos personagens e dos cenarios (no modo Livre, tudo).
  const edit = (fn: (s: FlowScript) => FlowScript) => {
    setScript(fn)
    setDirty(true)
  }
  const setTake = (n: number, patch: Partial<FlowTake>) => edit((s) => ({ ...s, takes: s.takes.map((t) => (t.n === n ? { ...t, ...patch } : t)) }))
  const setLine = (n: number, line: string) => setTake(n, { line })
  const renumber = (takes: FlowTake[]) => takes.map((t, i) => ({ ...t, n: i + 1 }))
  const addTake = () =>
    edit((s) => {
      const last = s.takes[s.takes.length - 1]
      const blank: FlowTake = { n: 0, seconds: last?.seconds ?? (Number(params.seconds) || 8), speaker: "", line: "", action: "", location: last?.location ?? s.locations[0]?.id ?? "", characters: [], sound: "", camera: "", kind: last?.kind ?? "dialogo" }
      return { ...s, takes: renumber([...s.takes, blank]) }
    })
  const removeTake = (n: number) => edit((s) => ({ ...s, takes: renumber(s.takes.filter((t) => t.n !== n)) }))
  const addCharacter = () =>
    edit((s) => ({ ...s, characters: [...s.characters, { id: "c" + (s.characters.length + 1) + (Date.now() % 1000), name: "Personagem " + (s.characters.length + 1), description: "", voice: "" }] }))
  const setCharacter = (id: string, patch: Partial<FlowScript["characters"][number]>) =>
    edit((s) => ({ ...s, characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const removeCharacter = (id: string) =>
    edit((s) => ({ ...s, characters: s.characters.filter((c) => c.id !== id) }))
  const addLocation = () => edit((s) => ({ ...s, locations: [...s.locations, { id: "l" + (s.locations.length + 1) + (Date.now() % 1000), name: "Local " + (s.locations.length + 1), description: "" }] }))
  const setLocation = (id: string, patch: { name?: string; description?: string }) =>
    edit((s) => ({ ...s, locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const free = template.mode === "livre"
  // Conferencia ao vivo contra as regras do formato (copia: a conferencia ajusta campos).
  const issues = useMemo(() => validateScript(JSON.parse(JSON.stringify(script)), template, params), [script, template, params])

  const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setBusy(key)
    const res = await fn()
    setBusy("")
    if (!res.success) {
      toast.error(res.error || "Falhou.")
      return false
    }
    toast.success(okMsg)
    return true
  }

  const save = async () => {
    setSaving(true)
    const res = await saveFlowScriptAction(project.id, script)
    setSaving(false)
    if (!res.success) return void toast.error(res.error)
    setProject(res.project as FlowProject)
    onChanged(res.project as FlowProject)
    setDirty(false)
    toast.success("Alterações salvas.")
  }

  const ensureSavedIfDirty = async (): Promise<boolean> => {
    if (!dirty) return true
    const res = await saveFlowScriptAction(project.id, script)
    if (!res.success) {
      toast.error(res.error)
      return false
    }
    setProject(res.project as FlowProject)
    onChanged(res.project as FlowProject)
    setDirty(false)
    return true
  }

  const handleGenerateCharSheet = async (characterId: string) => {
    setSheetBusy(`gen_${characterId}`)
    if (!(await ensureSavedIfDirty())) {
      setSheetBusy("")
      return
    }
    const res = await generateCharacterSheetAction(project.id, characterId)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject)
    loadJobs()
    toast.success("Folha do personagem enviada para a fila do Flow.")
  }

  const handleGenerateCastSheet = async () => {
    setSheetBusy("gen_cast")
    if (!(await ensureSavedIfDirty())) {
      setSheetBusy("")
      return
    }
    const res = await generateCastSheetAction(project.id)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject)
    loadJobs()
    toast.success("Folha do elenco enviada para a fila do Flow.")
  }

  const handleUploadSheet = async (target: string, file: File | undefined) => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 8 MB.")
      return
    }
    setSheetBusy(`up_${target}`)
    if (!(await ensureSavedIfDirty())) {
      setSheetBusy("")
      return
    }
    try {
      const fd = new FormData()
      fd.append("projectId", project.id)
      fd.append("characterId", target)
      fd.append("file", file)
      const res = await fetch("/api/flow/characters/sheet", { method: "POST", body: fd })
      const json = await res.json()
      setSheetBusy("")
      if (!json.success) {
        toast.error(json.error || "Não foi possível enviar a imagem.")
        return
      }
      applyProjectFromSheet(json.project as FlowProject)
      toast.success("Imagem enviada e aprovada.")
    } catch {
      setSheetBusy("")
      toast.error("Erro de rede ao enviar a imagem.")
    }
  }

  const handleApproveSheet = async (target: string) => {
    setSheetBusy(`ap_${target}`)
    const res = await approveSheetAction(project.id, target)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject)
    toast.success("Folha aprovada.")
  }

  const handleClearSheet = async (target: string) => {
    setSheetBusy(`rm_${target}`)
    const res = await clearSheetAction(project.id, target)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject)
    loadJobs()
    toast.success("Folha removida.")
  }

  const handleSaveToLibrary = async (characterId: string) => {
    setSheetBusy(`lib_save_${characterId}`)
    if (!(await ensureSavedIfDirty())) {
      setSheetBusy("")
      return
    }
    const res = await saveCharacterToLibraryAction(project.id, characterId)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject)
    loadLibrary()
    toast.success("Personagem salvo na biblioteca.")
  }

  const handleUseFromLibrary = async (characterId: string, libraryId: string) => {
    if (!libraryId || libraryId === "_") return
    setSheetBusy(`lib_use_${characterId}`)
    if (!(await ensureSavedIfDirty())) {
      setSheetBusy("")
      return
    }
    const res = await useLibraryCharacterAction(project.id, characterId, libraryId)
    setSheetBusy("")
    if (!res.success) return void toast.error(res.error)
    applyProjectFromSheet(res.project as FlowProject, characterId)
    toast.success("Personagem carregado da biblioteca.")
  }

  const refImagesOn = String(params.refImages ?? "1") !== "0"
  const refPrevVideoDefault = template.mode === "dialogo" ? "1" : "0"
  const refPrevVideoOn = String(params.refPrevVideo ?? refPrevVideoDefault) === "1"

  const handleRefOptionChange = async (patch: { refImages?: string; refPrevVideo?: string }) => {
    const res = await saveFlowRefOptionsAction(project.id, patch)
    if (!res.success) return void toast.error(res.error)
    setProject(res.project as FlowProject)
    onChanged(res.project as FlowProject)
    toast.success("Opções de referência atualizadas.")
  }

  const queue = async () => {
    if (dirty) return void toast.error("Salve as alterações antes de enviar.")
    setQueueing(true)
    const res = await queueFlowProjectAction(project.id)
    setQueueing(false)
    setConfirming(false)
    if (!res.success) return void toast.error(res.error)
    toast.success(`${res.queued} takes na fila do Flow.`)
    refreshProject()
    loadJobs()
  }

  const retryJob = async (id: string) => {
    const res = await fetch(`/api/flow/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry", params: { model: project.params.model, resolution: project.params.quality, aspectRatio: project.params.aspect } }) })
    const json = await res.json()
    if (json.success) {
      toast.success("Take de volta na fila.")
      loadJobs()
    } else toast.error(json.error || "Não foi possível reenviar.")
  }

  const retryAllFailed = async () => {
    const failed = jobs.filter((j) => j.status === "draft")
    if (failed.length === 0) return
    let count = 0
    for (const j of failed) {
      const res = await fetch(`/api/flow/jobs/${j.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "retry",
          params: { model: project.params.model, resolution: project.params.quality, aspectRatio: project.params.aspect },
        }),
      })
      const json = await res.json()
      if (json.success) count++
    }
    toast.success(`${count} take(s) reenviado(s) para a fila.`)
    loadJobs()
  }

  const toggle = (n: number) =>
    setApproved((s) => {
      const c = new Set(s)
      if (c.has(n)) c.delete(n)
      else c.add(n)
      return c
    })

  const speakerName = (id: string) => script.characters.find((c) => c.id === id)?.name ?? (id === "narrator" ? "Narrador" : "")
  const exportText = () => exportScriptText(script, params, template)
  const part = Number(params.parte) || 1

  // Parte 2, 3...: a IA continua a historia com os mesmos personagens e retratos aprovados; abre o projeto novo.
  const nextPart = async () => {
    if (dirty) {
      toast.error("Salve o roteiro antes de criar a próxima parte.")
      return
    }
    setCreatingPart(true)
    const res = await createNextPartAction(project.id)
    setCreatingPart(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Parte ${res.part} criada com os mesmos personagens.`)
    if (res.issues?.length) toast.warning(`Confira o roteiro: ${res.issues.length} ponto(s) fora das regras do formato.`)
    onChanged(res.project as FlowProject)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={agentOnline ? "default" : "outline"} className="gap-1">
            {agentOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {agentOnline ? "Computador online" : "Computador offline"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => copyText(exportText(), "Roteiro copiado")}>
            <Copy className="mr-1.5 h-4 w-4" /> Copiar tudo
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadText(`${script.title || "roteiro"}.txt`, exportText())}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar .txt
          </Button>
          <Button variant="outline" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar
          </Button>
          <Button size="sm" onClick={nextPart} disabled={creatingPart} title="A IA continua a história de onde esta parte parou, com os mesmos personagens">
            {creatingPart ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Criar parte {part + 1}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{script.title}</h2>
        <p className="text-sm text-muted-foreground">{script.logline}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {template.name} · {script.takes.length} takes · total {fmtDuration(script.takes.reduce((n, k) => n + k.seconds, 0))} · {String(params.model)} · {String(params.quality)}
        </p>
      </div>

      {(script.characters.length > 0 || free) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Personagens{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (descrição fixa em inglês: idade, rosto, cabelo, corpo, roupa; 25 a 35 palavras)
              </span>
            </p>
            <Button size="sm" variant="outline" onClick={addCharacter}>Adicionar personagem</Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={refImagesOn}
                onChange={(e) => handleRefOptionChange({ refImages: e.target.checked ? "1" : "0" })}
              />
              Usar as folhas aprovadas como referência
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={refPrevVideoOn}
                onChange={(e) => handleRefOptionChange({ refPrevVideo: e.target.checked ? "1" : "0" })}
              />
              Usar o take anterior como vídeo de referência
            </label>
          </div>

          <Card className="border-dashed">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Folha do elenco (cenas com mais de um personagem)</p>
                  <p className="text-xs text-muted-foreground">
                    Imagem 16:9 com os personagens lado a lado para manter a aparência quando contracenam no mesmo take.
                  </p>
                </div>
                <Badge variant={script.castSheetStatus === "aprovada" ? "default" : "outline"}>
                  {script.castSheetStatus ? (SHEET_STATUS_LABEL[script.castSheetStatus] ?? script.castSheetStatus) : "Sem folha"}
                </Badge>
              </div>

              {script.castSheetUrl && (
                <img
                  src={script.castSheetUrl}
                  alt="Folha do elenco"
                  className="max-h-44 rounded-md border bg-muted object-contain"
                />
              )}

              <input
                ref={(el) => {
                  fileInputRefs.current["cast"] = el
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  handleUploadSheet("cast", f)
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!sheetBusy || script.castSheetStatus === "gerando" || script.characters.length < 2}
                  onClick={handleGenerateCastSheet}
                >
                  {sheetBusy === "gen_cast" || script.castSheetStatus === "gerando" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Gerar folha no Flow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!sheetBusy}
                  onClick={() => fileInputRefs.current["cast"]?.click()}
                >
                  {sheetBusy === "up_cast" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Enviar imagem
                </Button>
                {script.castSheetStatus === "aguardando" && (
                  <Button
                    size="sm"
                    disabled={!!sheetBusy}
                    onClick={() => handleApproveSheet("cast")}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                  </Button>
                )}
                {(script.castSheetUrl || script.castSheetStatus) && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!!sheetBusy || script.castSheetStatus === "gerando" || script.characters.length < 2}
                      onClick={handleGenerateCastSheet}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refazer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={!!sheetBusy}
                      onClick={() => handleClearSheet("cast")}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {script.characters.map((c) => {
              const isVoiceOnly =
                /^(narrador|narrator|voz|voice|locutor)\b/i.test(c.name || "") ||
                /invisible voice|no visual features|off-screen voice|sem corpo|apenas voz|voz invis[ií]vel/i.test(c.description || "")
              return (
              <Card key={c.id}>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Input value={c.name} onChange={(e) => setCharacter(c.id, { name: e.target.value })} maxLength={60} />
                    {isVoiceOnly ? (
                      <Badge variant="secondary" className="shrink-0 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[11px]">
                        🎙️ Voz de narração
                      </Badge>
                    ) : (
                      <Badge variant={c.sheetStatus === "aprovada" ? "default" : "outline"} className="shrink-0">
                        {c.sheetStatus ? (SHEET_STATUS_LABEL[c.sheetStatus] ?? c.sheetStatus) : "Sem retrato"}
                      </Badge>
                    )}
                  </div>

                  {c.sheetUrl && (
                    <img
                      src={c.sheetUrl}
                      alt={`Retrato de ${c.name}`}
                      className="max-h-40 w-full rounded-md border bg-muted object-contain"
                    />
                  )}

                  <Textarea
                    value={c.description}
                    onChange={(e) => setCharacter(c.id, { description: e.target.value })}
                    rows={3}
                    maxLength={500}
                    placeholder="Ex.: 35-year-old fictional woman, olive skin, shoulder-length curly dark hair, faded navy jumpsuit..."
                  />
                  <Input
                    value={c.voice}
                    onChange={(e) => setCharacter(c.id, { voice: e.target.value })}
                    maxLength={160}
                    placeholder="Voz (ex.: warm, calm Brazilian accent)"
                  />
                  <p className="text-[11px] text-muted-foreground">{countWords(c.description)} palavras</p>

                  <input
                    ref={(el) => {
                      fileInputRefs.current[c.id] = el
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      handleUploadSheet(c.id, f)
                    }}
                  />

                  {!isVoiceOnly ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={!!sheetBusy || c.sheetStatus === "gerando"}
                        onClick={() => handleGenerateCharSheet(c.id)}
                      >
                        {sheetBusy === `gen_${c.id}` || c.sheetStatus === "gerando" ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                        )}
                        Gerar retrato no Flow
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={!!sheetBusy}
                        onClick={() => fileInputRefs.current[c.id]?.click()}
                      >
                        {sheetBusy === `up_${c.id}` ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1 h-3.5 w-3.5" />
                        )}
                        Enviar imagem
                      </Button>
                      {c.sheetStatus === "aguardando" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={!!sheetBusy}
                          onClick={() => handleApproveSheet(c.id)}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                        </Button>
                      )}
                      {(c.sheetUrl || c.sheetStatus) && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            disabled={!!sheetBusy || c.sheetStatus === "gerando"}
                            onClick={() => handleGenerateCharSheet(c.id)}
                          >
                            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refazer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-destructive"
                            disabled={!!sheetBusy}
                            onClick={() => handleClearSheet(c.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={!!sheetBusy}
                        onClick={() => handleSaveToLibrary(c.id)}
                      >
                        {sheetBusy === `lib_save_${c.id}` ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
                        )}
                        Salvar na biblioteca
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                      <span className="italic">🎙️ Voz em off (sem corpo físico em cena: não precisa de retrato).</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        disabled={!!sheetBusy}
                        onClick={() => removeCharacter(c.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  )}

                  <div className="pt-1">
                    <Select
                      value={c.libraryId && library.some((l) => l.id === c.libraryId) ? c.libraryId : "_"}
                      onValueChange={(v) => handleUseFromLibrary(c.id, v)}
                      disabled={library.length === 0 || !!sheetBusy}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Usar da biblioteca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">
                          {library.length === 0 ? "Usar da biblioteca (vazia)" : "Usar da biblioteca..."}
                        </SelectItem>
                        {library.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.sheet_url ? "· com folha" : "· sem folha"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        </div>
      )}

      {(free || script.locations.length > 0) && (
        <details className="rounded-lg border p-3" open={free}>
          <summary className="cursor-pointer text-sm font-medium">Cenários ({script.locations.length})</summary>
          <div className="mt-3 space-y-2">
            {script.locations.map((l) => (
              <div key={l.id} className="grid gap-2 sm:grid-cols-[160px_1fr]">
                <Input value={l.name} onChange={(e) => setLocation(l.id, { name: e.target.value })} maxLength={60} />
                <Textarea value={l.description} onChange={(e) => setLocation(l.id, { description: e.target.value })} rows={2} maxLength={600} placeholder="Descrição em inglês: lugar, hora do dia, luz, texturas" />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLocation}>Adicionar cenário</Button>
          </div>
        </details>
      )}

      {issues.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-medium text-amber-500">Conferência do roteiro ({issues.length})</p>
            {issues.slice(0, 12).map((i, k) => <p key={k} className="text-xs text-muted-foreground">• {i.message}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {script.takes.map((t) => {
          const words = countWords(t.line)
          const limit = wordLimit(t.seconds)
          const kind = takeKind(t, template.mode)
          const over = kind !== "ambiente" && words > limit
          const job = bestJob(t.n)
          const prompt = buildTakePrompt(script, t, params, template, takeReference(script, t, params))
          return (
            <Card key={t.n}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    Take {t.n} <span className="text-xs font-normal text-muted-foreground">· {t.seconds}s{t.model ? ` · ${t.model}` : ""} · {fmtClock(script.takes.slice(0, t.n - 1).reduce((n, k) => n + k.seconds, 0))}–{fmtClock(script.takes.slice(0, t.n).reduce((n, k) => n + k.seconds, 0))}{t.beat ? " · " + t.beat : ""}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {job && (
                      <Badge variant={job.status === "done" ? "default" : "outline"}>
                        {STATUS_LABEL[job.status] ?? job.status}
                        {job.role === "take_final" ? " (720p)" : ""}
                      </Badge>
                    )}
                    {job?.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => retryJob(job.id)}>Reenviar</Button>
                    )}
                    {job?.status === "done" && (
                      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => retryJob(job.id)}>Regerar</Button>
                    )}
                  </div>
                </div>
                {job?.status === "done" && job.result_url && (
                  // Com o video final pronto, os takes so carregam ao dar play: menos videos pesando na pagina.
                  <div className="space-y-1.5">
                    <video src={job.result_url} controls preload={project.final_url ? "none" : "metadata"} className="max-h-72 rounded-md bg-black" />
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                      href={`${job.result_url}${job.result_url.includes("?") ? "&" : "?"}download=1`}
                      download={`take_${t.n}.mp4`}
                    >
                      <Download className="h-3 w-3" /> Baixar take {t.n}
                    </a>
                  </div>
                )}
                {free && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select value={kind} onValueChange={(v) => setTake(t.n, { kind: v as FlowTakeKind, ...(v === "ambiente" ? { line: "", speaker: "" } : v === "narracao" ? { speaker: "narrator" } : {}) })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(t.seconds)} onValueChange={(v) => setTake(t.n, { seconds: Number(v) })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{allowedSecondsForModel(t.model || String(params.model)).map((x) => <SelectItem key={x} value={String(x)}>{x}s</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => removeTake(t.n)} disabled={script.takes.length <= 1}>Remover take</Button>
                  </div>
                )}
                {kind === "dialogo" && script.characters.length > 0 && (
                  <Select value={t.speaker || "_"} onValueChange={(v) => setTake(t.n, { speaker: v === "_" ? "" : v, characters: v !== "_" && !t.characters.includes(v) ? [...t.characters, v] : t.characters })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Quem fala" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Quem fala...</SelectItem>
                      {script.characters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {kind !== "ambiente" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{speakerName(t.speaker) || "Fala"}</span>
                      <span className={cn(over && "font-semibold text-destructive")}>{words}/{limit} palavras</span>
                    </div>
                    <Textarea value={t.line} onChange={(e) => setLine(t.n, e.target.value)} rows={2} maxLength={400} />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Ação da cena (em inglês: uma ação concreta, o objeto e a expressão)</label>
                  <Textarea value={t.action} onChange={(e) => setTake(t.n, { action: e.target.value })} rows={2} maxLength={600} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={t.camera || ""} onChange={(e) => setTake(t.n, { camera: e.target.value })} maxLength={200} placeholder="Câmera (ex.: close-up, slow push-in)" />
                  <Input value={t.sound} onChange={(e) => setTake(t.n, { sound: e.target.value })} maxLength={240} placeholder="Som (ex.: rain on glass, distant traffic)" />
                </div>
                {(free || script.locations.length > 1 || script.characters.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {script.locations.length > 0 && (
                      <Select value={t.location || script.locations[0]?.id} onValueChange={(v) => setTake(t.n, { location: v })}>
                        <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{script.locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {script.characters.map((c) => {
                      const on = t.characters.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={cn("rounded-md border px-2 py-0.5", on && "border-primary bg-primary/10")}
                          onClick={() => setTake(t.n, { characters: on ? t.characters.filter((x) => x !== c.id) : [...t.characters, c.id] })}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {job?.status === "draft" && job.error_message && <p className="text-xs text-destructive">{job.error_message}</p>}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Prompt do Flow</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-[11px]">{prompt}</pre>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(prompt, `Prompt do take ${t.n} copiado`)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar prompt
                  </Button>
                </details>
              </CardContent>
            </Card>
          )
        })}
        {free && (
          <Button variant="outline" className="w-full" onClick={addTake} disabled={script.takes.length >= MAX_TAKES}>
            Adicionar take
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Título, legenda e hashtags
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(`${script.seo.title}\n\n${script.seo.caption}\n\n${script.seo.hook}\n\n${script.seo.hashtags.join(" ")}`, "SEO copiado")}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copiar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Título:</span> {script.seo.title}</p>
          <p><span className="text-muted-foreground">Legenda:</span> {script.seo.caption}</p>
          <p><span className="text-muted-foreground">Gancho:</span> {script.seo.hook}</p>
          <p className="text-muted-foreground">{script.seo.hashtags.join(" ")}</p>
        </CardContent>
      </Card>

      <Card className="border-primary/40">
        <CardContent className="space-y-3 p-4">
          <p className="font-medium">1. Gerar os vídeos no Google Flow</p>
          {(() => {
            // Estimativa com os limites atuais: cada take leva ~1,5 min no Flow + o intervalo minimo entre geracoes.
            if (!risk) return null
            const pending = script.takes.filter((t) => bestJob(t.n)?.status !== "done").length
            if (pending === 0) return null
            const perTakeMin = 1.5 + (risk.minGapSec || 0) / 60
            const byGap = Math.max(1, Math.floor(60 / perTakeMin))
            const perHour = risk.riskMode ? byGap : Math.max(1, Math.min(risk.hourlyLimit || byGap, byGap))
            const perDay = risk.riskMode ? perHour * 24 : Math.max(1, risk.dailyLimit || perHour * 24)
            const days = Math.ceil(pending / perDay)
            const hours = pending / perHour
            const text =
              days > 1
                ? "cerca de " + days + " dias (limite de " + perDay + " gerações por dia)"
                : hours < 1
                  ? "cerca de " + Math.max(1, Math.round(hours * 60)) + " min"
                  : "cerca de " + (Math.round(hours * 10) / 10).toString().replace(".", ",") + " h"
            return (
              <p className={cn("text-xs", days > 1 || hours > 2 ? "text-amber-500" : "text-muted-foreground")}>
                Com os seus limites atuais ({risk.riskMode ? "limites ignorados" : risk.hourlyLimit + " por hora, " + risk.dailyLimit + " por dia"}, intervalo de {risk.minGapSec}s), os {pending} takes que faltam levam {text} para gerar. Você pode mudar os limites no painel de segurança.
              </p>
            )
          })()}
          {queuedAny ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="h-4 w-4" /> Enviado. Os takes acima mostram o andamento.
              {takeJobs.some((j) => j.status === "draft") && (
                <Button size="sm" variant="outline" className="ml-3" onClick={retryAllFailed}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Reenviar falhas ({takeJobs.filter((j) => j.status === "draft").length})
                </Button>
              )}
              {!agentOnline && " A extensão ainda não está online neste computador."}
            </p>
          ) : !confirming ? (
            <>
              <p className="text-sm text-muted-foreground">Cada take usa créditos da sua conta do Flow. O custo exato aparece no Flow na hora de gerar.</p>
              <Button onClick={() => setConfirming(true)} disabled={overCount > 0 || dirty}>
                <Send className="mr-2 h-4 w-4" /> Revisar e enviar para a fila do Flow
              </Button>
              {overCount > 0 && <p className="text-xs text-destructive">{overCount} take(s) com fala acima do limite. Ajuste antes de enviar.</p>}
            </>
          ) : (
            <div className="space-y-3 rounded-lg border p-3 text-sm">
              <p>
                Vão para a fila <strong>{script.takes.length} takes</strong> de {String(params.seconds)}s{String(params.model).toLowerCase().includes("omni") ? ` em ${String(params.quality)}` : ""}, modelo <strong>{String(params.model)}</strong>.
              </p>
              <p className="text-muted-foreground">Isso gasta créditos do seu Flow. Os vídeos só são gerados com a extensão aberta no seu Chrome, logada na conta do Flow.</p>
              <div className="flex gap-2">
                <Button onClick={queue} disabled={queueing}>
                  {queueing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Confirmar envio
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {drafts.length > 0 && String(params.quality) === "360p" && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="font-medium">2. Aprovar os rascunhos e gerar a versão final (720p)</p>
            <p className="text-sm text-muted-foreground">Marque os takes que ficaram bons. Só eles serão refeitos em 720p, o que economiza créditos. Os rascunhos continuam guardados.</p>
            <div className="flex flex-wrap gap-2">
              {drafts.map((t) => (
                <label key={t.n} className={cn("flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm", approved.has(t.n) && "border-primary bg-primary/5")}>
                  <input type="checkbox" checked={approved.has(t.n)} onChange={() => toggle(t.n)} /> Take {t.n}
                </label>
              ))}
            </div>
            <Button
              disabled={approved.size === 0 || busy === "final"}
              onClick={async () => {
                if (await run("final", () => regenerateFinalAction(project.id, [...approved]), "Takes aprovados enviados para 720p.")) {
                  setApproved(new Set())
                  loadJobs()
                }
              }}
            >
              {busy === "final" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Gerar {approved.size || ""} em 720p
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-medium">3. Montar o vídeo final</p>
          <p className="text-sm text-muted-foreground">Junta os takes (usando a versão 720p quando existir) e gera a legenda a partir do que é falado: nos vídeos curtos ela é gravada no vídeo; nos longos sai só o arquivo .srt, para ativar no YouTube.</p>
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Palavras por legenda</label>
              <Select
                value={String(project.params?.wordsPerCaption ?? 2)}
                onValueChange={(v) => {
                  setProject({ ...project, params: { ...project.params, wordsPerCaption: Number(v) } })
                }}
              >
                <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 palavra (dinâmico)</SelectItem>
                  <SelectItem value="2">2 palavras (rápido)</SelectItem>
                  <SelectItem value="3">3 palavras (curto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!allDone || status === "assembling" || busy === "asm"}
              onClick={async () => {
                if (await run("asm", () => assembleFlowProjectAction(project.id, { wordsPerCaption: Number(project.params?.wordsPerCaption ?? 2) }), "Montagem iniciada.")) refreshProject()
              }}
            >
              {status === "assembling" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}
              {status === "assembling" ? "Montando..." : "Montar vídeo final"}
            </Button>
          </div>
          {!allDone && <p className="text-xs text-muted-foreground">Disponível quando todos os takes estiverem prontos.</p>}
          {status === "assemble_failed" && project.assemble_error && <p className="text-sm text-destructive">{project.assemble_error}</p>}
          {project.final_url && (
            <div className="space-y-2">
              <video src={project.final_url} controls preload="metadata" className="max-h-96 rounded-md bg-black" />
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="text-primary underline" href={`${project.final_url}${project.final_url.includes('?') ? '&' : '?'}download=1`} download={project.final_url.split('/').pop()}>Baixar vídeo</a>
                {project.srt_url && <a className="text-primary underline" href={`${project.srt_url}${project.srt_url.includes('?') ? '&' : '?'}download=1`} download={project.srt_url.split('/').pop()}>Baixar legenda (.srt)</a>}
              </div>
              {project.assemble_error && <p className="text-xs text-muted-foreground">{project.assemble_error}</p>}
            </div>
          )}

          {(allDone || project.final_url) && (
            <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Mic className="h-4 w-4 text-primary" /> Substituir Voz por Áudio Externo / Gravação
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie um arquivo de áudio (.webm, .mp3, .wav, .m4a). O DarkTube corta o silêncio inicial, remonta sobre os takes limpos e queima as novas legendas Whisper.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.webm,.mp3,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setSelectedAudioFile(f)
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={busy === "audio_replace"}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {selectedAudioFile ? selectedAudioFile.name : "Escolher arquivo de áudio..."}
                </Button>

                {selectedAudioFile && (
                  <Button
                    size="sm"
                    disabled={busy === "audio_replace"}
                    onClick={handleReplaceAudio}
                  >
                    {busy === "audio_replace" ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {busy === "audio_replace" ? "Processando Whisper & FFmpeg..." : "Aplicar Nova Voz"}
                  </Button>
                )}

                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={audioLipsync}
                    onChange={(e) => setAudioLipsync(e.target.checked)}
                  />
                  Ativar Lip-Sync neural (LivePortrait)
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {project.final_url && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-1.5 font-medium"><CalendarClock className="h-4 w-4" /> 4. Publicar ou agendar</p>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta conectada. Conecte em Credenciais.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => {
                  const on = picked[a.platform] === a.id
                  return (
                    <label key={a.platform + a.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm", on && "border-primary bg-primary/5")}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked((p) => {
                            const c = { ...p }
                            if (c[a.platform] === a.id) delete c[a.platform]
                            else c[a.platform] = a.id
                            return c
                          })
                        }
                      />
                      {a.platform} · {a.name}
                    </label>
                  )
                })}
              </div>
            )}
            {picked.facebook && (
              fbPages.length > 0 ? (
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  Página do Facebook:
                  <select className="h-8 rounded-md border bg-background px-2 text-sm" value={fbPage} onChange={(e) => setFbPage(e.target.value)}>
                    {fbPages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              ) : (
                <p className="text-xs text-amber-500">Nenhuma página do Facebook sincronizada: o Reel vai para a página padrão do Meta Business Suite. Sincronize as páginas em Credenciais.</p>
              )
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" checked={now} onChange={() => setNow(true)} /> Publicar agora</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={!now} onChange={() => setNow(false)} /> Agendar</label>
              {!now && <Input type="datetime-local" className="h-8 w-56" value={when} onChange={(e) => setWhen(e.target.value)} />}
            </div>
            <Button
              disabled={busy === "pub" || status === "publishing" || Object.keys(picked).length === 0}
              onClick={async () => {
                if (busy === "pub" || status === "publishing") return
                setBusy("pub")
                try {
                  const res = await publishFlowProjectAction(project.id, {
                    accounts: picked,
                    dispatchNow: now,
                    scheduledAt: now ? undefined : when ? new Date(when).toISOString() : undefined,
                    facebookPageId: picked.facebook ? fbPage || undefined : undefined,
                  })
                  if (!res.success) {
                    toast.error(res.error)
                    return
                  }
                  toast.success(now ? "Enviado para publicação." : "Postagem agendada.")
                  if (res.warning) toast.warning(res.warning)
                  await refreshProject()
                } finally {
                  setBusy("")
                }
              }}
            >
              {busy === "pub" || status === "publishing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {now ? "Publicando..." : "Agendando..."}
                </>
              ) : status === "published" ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {now ? "Publicar novamente" : "Agendar postagem"}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {now ? "Publicar agora" : "Agendar postagem"}
                </>
              )}
            </Button>
            {status === "publishing" && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Em publicação nas redes selecionadas... O andamento também aparece em Dark Clips.
              </p>
            )}
            {status === "scheduled" && (
              <p className="text-xs text-muted-foreground">Agendado. O andamento também aparece em Dark Clips.</p>
            )}
            {status === "published" && (
              <p className="text-sm font-medium text-emerald-500">
                ✓ Publicado com sucesso{publish?.publishedAt ? ` em ${new Date(publish.publishedAt).toLocaleString("pt-BR")}` : ""}.
              </p>
            )}
            {status === "publish_failed" && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Falha na publicação{publish?.error ? `: ${publish.error}` : "."}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === "repub"}
                    onClick={async () => {
                      if (await run("repub", () => retryFlowPublishAction(project.id), "Publicação reenviada.")) refreshProject()
                    }}
                  >
                    {busy === "repub" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Reenviar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy === "delpub"}
                    onClick={async () => {
                      if (!confirm("Excluir esta publicação que falhou? O vídeo montado continua guardado.")) return
                      if (await run("delpub", () => deleteFlowPublishAction(project.id), "Publicação excluída.")) refreshProject()
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
