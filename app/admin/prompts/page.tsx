"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { 
  getSystemPromptsAction, 
  saveSystemPromptAction, 
  resetSystemPromptAction
} from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Save, 
  RotateCcw, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles, 
  Info, 
  ShieldAlert,
  Cpu,
  Terminal,
} from "lucide-react"
import { toast } from "sonner"
import type { SystemPromptItem } from "@/lib/default-prompts"

export default function AdminPromptsPage() {
  const { profile, loading: authLoading } = useAuth()
  const [prompts, setPrompts] = useState<SystemPromptItem[]>([])
  const [activePromptId, setActivePromptId] = useState<string>("gemini_vision")
  const [currentContent, setCurrentContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadPrompts()
    } else {
      setLoading(false)
    }
  }, [isAdmin])

  async function loadPrompts() {
    setLoading(true)
    try {
      const res = await getSystemPromptsAction()
      if (res.success && res.prompts) {
        setPrompts(res.prompts)
        const current = res.prompts.find(p => p.id === activePromptId) || res.prompts[0]
        if (current) {
          setActivePromptId(current.id)
          setCurrentContent(current.content)
        }
      } else {
        toast.error(res.error || "Erro ao carregar prompts do sistema.")
      }
    } catch (err: any) {
      toast.error("Falha ao carregar prompts.")
    } finally {
      setLoading(false)
    }
  }

  const activePrompt = prompts.find(p => p.id === activePromptId)

  function handleSelectPrompt(prompt: SystemPromptItem) {
    setActivePromptId(prompt.id)
    setCurrentContent(prompt.content)
  }

  async function handleSave() {
    if (!activePrompt) return
    setSaving(true)
    try {
      const res = await saveSystemPromptAction(activePrompt.id, currentContent)
      if (res.success) {
        toast.success(`Prompt "${activePrompt.name}" atualizado com sucesso!`)
        setPrompts(prev => prev.map(p => {
          if (p.id === activePrompt.id) {
            return {
              ...p,
              content: currentContent,
              isCustomized: currentContent.trim() !== p.defaultContent.trim()
            }
          }
          return p
        }))
      } else {
        toast.error(res.error || "Erro ao salvar o prompt.")
      }
    } catch (err: any) {
      toast.error("Erro de conexão ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!activePrompt) return
    setResetting(true)
    try {
      const res = await resetSystemPromptAction(activePrompt.id)
      if (res.success) {
        toast.success(`Prompt "${activePrompt.name}" restaurado para a versão padrão.`)
        const defaultText = activePrompt.defaultContent
        setCurrentContent(defaultText)
        setPrompts(prev => prev.map(p => {
          if (p.id === activePrompt.id) {
            return {
              ...p,
              content: defaultText,
              isCustomized: false
            }
          }
          return p
        }))
      } else {
        toast.error(res.error || "Erro ao restaurar o prompt.")
      }
    } catch (err: any) {
      toast.error("Erro ao restaurar prompt.")
    } finally {
      setResetting(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(currentContent)
    setCopied(true)
    toast.success("Prompt copiado para a área de transferência!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Acesso Restrito a Administradores</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta área é exclusiva para administradores da plataforma Darktube configurarem os prompts do sistema.
        </p>
      </div>
    )
  }

  const isChanged = activePrompt ? currentContent.trim() !== activePrompt.content.trim() : false

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Terminal className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciador de Prompts do Sistema</h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold uppercase text-[10px] px-2 py-0.5">
              Administração
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e personalize em tempo real as instruções de sistema dos modelos de IA.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Prompt Selector Tabs */}
          <div className="lg:col-span-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Prompts de Produção ({prompts.length})
            </p>
            <div className="space-y-2">
              {prompts.map((p) => {
                const isActive = p.id === activePromptId
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPrompt(p)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      isActive
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card hover:bg-secondary/40 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold text-sm truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {p.name}
                      </span>
                      {p.isCustomized ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] shrink-0 font-bold">
                          Editado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80 font-mono">
                      <Cpu className="h-3 w-3 text-primary" />
                      <span>{p.targetModel}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Info Box */}
            <Card className="bg-secondary/10 border-border/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                  <Info className="h-3.5 w-3.5" /> Como Funciona
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  As edições realizadas aqui são salvas no banco de dados e entram em ação <strong>imediatamente</strong> para todas as análises e gerações.
                </p>
                <p>
                  Você pode restaurar qualquer prompt para a versão padrão original do sistema a qualquer momento clicando em <strong>Restaurar Padrão</strong>.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Code Editor & Actions */}
          <div className="lg:col-span-8 space-y-4">
            {activePrompt && (
              <Card className="border-border shadow-lg overflow-hidden">
                <CardHeader className="bg-secondary/20 border-b p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">{activePrompt.name}</CardTitle>
                        {activePrompt.isCustomized ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold">
                            Personalizado no Banco
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            Versão Padrão do Sistema
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {activePrompt.description}
                      </CardDescription>
                    </div>

                    {/* Action buttons top */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-1.5 text-xs h-9"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={resetting || !activePrompt.isCustomized}
                        className="gap-1.5 text-xs text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/10 h-9"
                      >
                        {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        Restaurar Padrão
                      </Button>
                    </div>
                  </div>

                  {/* Variables badges */}
                  {activePrompt.variables.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-border/40 space-y-1.5">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase">
                        Variáveis Dinâmicas Substituídas em Tempo de Execução:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activePrompt.variables.map((v) => (
                          <Badge key={v.name} variant="secondary" className="font-mono text-[11px] bg-background/80 border px-2 py-0.5" title={v.description}>
                            <span className="text-primary font-bold mr-1">{v.name}</span>
                            <span className="text-muted-foreground text-[10px]">({v.description})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* Editor Content Area */}
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Editor de Instruções (System Prompt)</span>
                      <span>{currentContent.length} caracteres</span>
                    </div>
                    <Textarea
                      value={currentContent}
                      onChange={(e) => setCurrentContent(e.target.value)}
                      rows={22}
                      className="font-mono text-xs leading-relaxed bg-black/40 border-border/80 focus:border-primary p-4 rounded-xl resize-y"
                      placeholder="Digite as instruções do prompt de sistema..."
                    />
                  </div>

                  {/* Save Footer Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {isChanged ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> Alterações não salvas no editor
                        </span>
                      ) : (
                        <span>Pronto para execução em produção</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="gap-2 min-w-[160px] shadow-lg shadow-primary/20"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Prompt
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
