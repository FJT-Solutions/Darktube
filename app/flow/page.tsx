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
} from "lucide-react"
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
  REALISM,
  TAKE_SECONDS,
  VIDEO_MODELS,
  getFlowTemplate,
  templateFieldDefaults,
  wordLimit,
  type FlowField,
  type FlowTemplate,
} from "@/lib/flow-templates"
import { buildTakePrompt, countWords, exportScriptText, type FlowScript } from "@/lib/flow-script"
import { PROVIDER_LABEL, type FlowProvider } from "@/lib/flow-llm"
import type { FlowProject } from "@/lib/flow-projects"
import {
  deleteFlowProjectAction,
  generateFlowProjectAction,
  getFlowProjectAction,
  getFlowProvidersAction,
  listFlowProjectsAction,
  queueFlowProjectAction,
  saveFlowScriptAction,
  regenerateFinalAction,
  assembleFlowProjectAction,
  listFlowAccountsAction,
  publishFlowProjectAction,
  getFlowRiskAction,
  saveFlowRiskAction,
  resumeFlowAgentAction,
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

const STATUS_LABEL: Record<string, string> = {
  queued: "Na fila",
  running: "Gerando",
  done: "Pronto",
  draft: "Rascunho",
  cancelled: "Cancelado",
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
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} maxLength={900} />
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
    setSeconds(t.defaults.seconds)
    setAspect(t.defaults.aspect)
    setModel(t.defaults.model)
    setQuality(t.defaults.quality)
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
      params: { ...values, idioma, realismo, takes, seconds, aspect, model, quality },
    })
    setGenerating(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setProject(res.project as FlowProject)
    setView("projeto")
    toast.success("Roteiro gerado e salvo.")
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
        <div className="flex gap-2">
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

      {view === "novo" && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Templates</p>
            {FLOW_TEMPLATES.map((t) => (
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
                  <Badge variant="outline">{t.mode}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.niche} · {t.subniche}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
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
                <Slider min={2} max={40} step={1} value={[takes]} onValueChange={(v) => setTakes(v[0])} />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Segundos por take</label>
                  <Select value={String(seconds)} onValueChange={(v) => setSeconds(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAKE_SECONDS.map((s) => <SelectItem key={s} value={String(s)}>{s}s</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {template.mode !== "ambiente" && (
                    <p className="text-xs text-muted-foreground">Fala: até {wordLimit(seconds)} palavras</p>
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
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VIDEO_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>

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
                {generating ? "Gerando roteiro..." : "Gerar roteiro"}
              </Button>
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
          <p className="text-xs text-muted-foreground">
            Conta detectada pela extensão
            {caps.plan ? ` · plano ${caps.plan}` : ""}
            {caps.credits != null ? ` · ${caps.credits} créditos` : ""}
            {Array.isArray(caps.videoModels) && caps.videoModels.length ? ` · modelos de vídeo: ${caps.videoModels.join(", ")}` : ""}
            {agent.capabilitiesAt ? ` (${new Date(agent.capabilitiesAt).toLocaleString("pt-BR")})` : ""}
          </p>
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
  const [confirming, setConfirming] = useState(false)
  const [queueing, setQueueing] = useState(false)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [agentOnline, setAgentOnline] = useState(false)
  const [approved, setApproved] = useState<Set<number>>(new Set())
  const [accounts, setAccounts] = useState<{ id: string; platform: string; name: string }[]>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [when, setWhen] = useState("")
  const [now, setNow] = useState(true)
  const [busy, setBusy] = useState("")

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

  const refreshProject = useCallback(async () => {
    const res = await getFlowProjectAction(project.id)
    if (res.success) {
      setProject(res.project as FlowProject)
      onChanged(res.project as FlowProject)
    }
  }, [project.id, onChanged])

  useEffect(() => {
    loadJobs()
    const t = setInterval(() => {
      loadJobs()
      if (project.status === "assembling" || project.status === "publishing") refreshProject()
    }, 6000)
    return () => clearInterval(t)
  }, [loadJobs, refreshProject, project.status])

  useEffect(() => {
    listFlowAccountsAction().then((r) => r.success && setAccounts(r.accounts))
  }, [])

  const params = project.params
  const status = project.status
  const overCount = useMemo(
    () => (template.mode === "ambiente" ? 0 : script.takes.filter((t) => countWords(t.line) > wordLimit(t.seconds)).length),
    [script, template.mode]
  )

  // Melhor job de cada take: o final (720p) pronto, senao o primeiro pronto, senao o ultimo da lista.
  const bestJob = (n: number) => {
    const list = jobs.filter((j) => j.take_index === n)
    const done = list.filter((j) => j.status === "done" && j.result_url)
    return done.find((j) => j.role === "take_final") ?? done[0] ?? list[list.length - 1]
  }
  const allDone = script.takes.every((t) => bestJob(t.n)?.status === "done")
  const drafts = script.takes.filter((t) => bestJob(t.n)?.status === "done" && bestJob(t.n)?.role !== "take_final")
  const queuedAny = jobs.length > 0

  const setLine = (n: number, line: string) => {
    setScript((s) => ({ ...s, takes: s.takes.map((t) => (t.n === n ? { ...t, line } : t)) }))
    setDirty(true)
  }

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
    const res = await fetch(`/api/flow/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry" }) })
    const json = await res.json()
    if (json.success) {
      toast.success("Take de volta na fila.")
      loadJobs()
    } else toast.error(json.error || "Não foi possível reenviar.")
  }

  const toggle = (n: number) =>
    setApproved((s) => {
      const c = new Set(s)
      if (c.has(n)) c.delete(n)
      else c.add(n)
      return c
    })

  const speakerName = (id: string) => script.characters.find((c) => c.id === id)?.name ?? (id === "narrator" ? "Narrador" : "")
  const exportText = () => exportScriptText(script, params, template.mode)

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
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{script.title}</h2>
        <p className="text-sm text-muted-foreground">{script.logline}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {template.name} · {script.takes.length} takes de {params.seconds}s · {String(params.model)} · {String(params.quality)}
        </p>
      </div>

      {script.characters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {script.characters.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-1 p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                {c.voice && <p className="text-xs text-muted-foreground">Voz: {c.voice}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {script.takes.map((t) => {
          const words = countWords(t.line)
          const limit = wordLimit(t.seconds)
          const over = template.mode !== "ambiente" && words > limit
          const job = bestJob(t.n)
          const prompt = buildTakePrompt(script, t, params, template.mode)
          return (
            <Card key={t.n}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    Take {t.n} <span className="text-xs font-normal text-muted-foreground">· {t.seconds}s</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {job && (
                      <Badge variant={job.status === "done" ? "default" : "outline"}>
                        {STATUS_LABEL[job.status] ?? job.status}
                        {job.role === "take_final" ? " (720p)" : ""}
                      </Badge>
                    )}
                    {job?.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => retryJob(job.id)}>
                        Reenviar
                      </Button>
                    )}
                  </div>
                </div>
                {job?.status === "done" && job.result_url && (
                  <video src={job.result_url} controls preload="metadata" className="max-h-72 rounded-md bg-black" />
                )}
                {template.mode !== "ambiente" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{speakerName(t.speaker) || "Fala"}</span>
                      <span className={cn(over && "font-semibold text-destructive")}>{words}/{limit} palavras</span>
                    </div>
                    <Textarea value={t.line} onChange={(e) => setLine(t.n, e.target.value)} rows={2} maxLength={400} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t.action}</p>
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
          {queuedAny ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="h-4 w-4" /> Enviado. Os takes acima mostram o andamento.
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
                Vão para a fila <strong>{script.takes.length} takes</strong> de {String(params.seconds)}s em <strong>{String(params.quality)}</strong>, modelo <strong>{String(params.model)}</strong>.
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
          <p className="text-sm text-muted-foreground">Junta os takes (usando a versão 720p quando existir), grava a legenda a partir das falas e gera o arquivo .srt.</p>
          <Button
            disabled={!allDone || status === "assembling" || busy === "asm"}
            onClick={async () => {
              if (await run("asm", () => assembleFlowProjectAction(project.id), "Montagem iniciada.")) refreshProject()
            }}
          >
            {status === "assembling" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}
            {status === "assembling" ? "Montando..." : "Montar vídeo final"}
          </Button>
          {!allDone && <p className="text-xs text-muted-foreground">Disponível quando todos os takes estiverem prontos.</p>}
          {status === "assemble_failed" && project.assemble_error && <p className="text-sm text-destructive">{project.assemble_error}</p>}
          {project.final_url && (
            <div className="space-y-2">
              <video src={project.final_url} controls preload="metadata" className="max-h-96 rounded-md bg-black" />
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="text-primary underline" href={project.final_url} download>Baixar vídeo</a>
                {project.srt_url && <a className="text-primary underline" href={project.srt_url} download>Baixar legenda (.srt)</a>}
              </div>
              {project.assemble_error && <p className="text-xs text-muted-foreground">{project.assemble_error}</p>}
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
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" checked={now} onChange={() => setNow(true)} /> Publicar agora</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={!now} onChange={() => setNow(false)} /> Agendar</label>
              {!now && <Input type="datetime-local" className="h-8 w-56" value={when} onChange={(e) => setWhen(e.target.value)} />}
            </div>
            <Button
              disabled={busy === "pub" || Object.keys(picked).length === 0}
              onClick={async () => {
                const res = await publishFlowProjectAction(project.id, { accounts: picked, dispatchNow: now, scheduledAt: now ? undefined : when ? new Date(when).toISOString() : undefined })
                if (!res.success) return void toast.error(res.error)
                toast.success(now ? "Enviado para publicação." : "Postagem agendada.")
                if (res.warning) toast.warning(res.warning)
                refreshProject()
              }}
            >
              <Send className="mr-2 h-4 w-4" /> {now ? "Publicar agora" : "Agendar postagem"}
            </Button>
            {(status === "scheduled" || status === "publishing") && (
              <p className="text-xs text-muted-foreground">{status === "scheduled" ? "Agendado." : "Em publicação."} O andamento aparece em Dark Clips.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
