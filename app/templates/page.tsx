"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getRemodelingTemplatesAction, deleteRemodelingTemplateAction, updateTemplateStatusAction } from "@/app/actions"
import { 
  LayoutTemplate, 
  Trash2, 
  Play, 
  Pause, 
  Eye, 
  Clock, 
  Calendar,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Wrench,
  Search,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { formatNumber } from "@/lib/metrics"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const data = await getRemodelingTemplatesAction()
      setTemplates(data || [])
    } catch (err) {
      toast.error("Erro ao carregar templates.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este template?")) return
    try {
      await deleteRemodelingTemplateAction(id)
      setTemplates(templates.filter(t => t.id !== id))
      toast.success("Template excluído.")
    } catch (err) {
      toast.error("Erro ao excluir template.")
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
    try {
      await updateTemplateStatusAction(id, !currentStatus)
      setTemplates(templates.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t))
      toast.success(`Template ${!currentStatus ? 'ativado' : 'pausado'}.`)
    } catch (err) {
      toast.error("Erro ao atualizar status.")
    }
  }

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.video_title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meus Templates</h2>
          <p className="text-muted-foreground">
            Gerencie seus blueprints de remodelagem e estratégias de automação.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[280px] rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden group flex flex-col">
              <div className="relative aspect-video overflow-hidden bg-secondary">
                <img 
                  src={template.video_thumbnail} 
                  alt={template.video_title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={template.is_active ? "default" : "secondary"} className="shadow-lg backdrop-blur-md">
                    {template.is_active ? "Ativo" : "Pausado"}
                  </Badge>
                  <Badge variant="outline" className="bg-black/50 text-white border-none backdrop-blur-md">
                    {template.format === 'vertical' ? 'Short' : 'Video'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold line-clamp-1">{template.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleStatus(template.id, template.is_active)}>
                        {template.is_active ? (
                          <><Pause className="mr-2 h-4 w-4" /> Pausar</>
                        ) : (
                          <><Play className="mr-2 h-4 w-4" /> Ativar</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="text-xs line-clamp-1">
                  Base: {template.video_title}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex-1">
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] h-5 py-0">
                    <Mic2 className="mr-1 h-3 w-3" /> {template.voice_type?.includes('br') ? 'PT-BR' : 'EN'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5 py-0">
                    <Calendar className="mr-1 h-3 w-3" /> {template.post_frequency}
                  </Badge>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-1">
                  <div className="rounded bg-secondary/50 p-1.5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase">Estilo</p>
                    <p className="text-[10px] font-semibold truncate">{template.template_data?.visualStyle}</p>
                  </div>
                  <div className="rounded bg-secondary/50 p-1.5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase">Ritmo</p>
                    <p className="text-[10px] font-semibold truncate">{template.template_data?.pacing}</p>
                  </div>
                  <div className="rounded bg-secondary/50 p-1.5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase">Conf.</p>
                    <p className="text-[10px] font-semibold">{Math.round((template.template_data?.confidence || 0) * 100)}%</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t bg-secondary/10">
                <Button variant="ghost" className="w-full justify-between h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary mt-3" asChild>
                  <Link href={`/templates/${template.id}`}>
                    Abrir Estratégia
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-secondary/20 rounded-2xl border-2 border-dashed border-border/50">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <LayoutTemplate className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Nenhum template salvo</h3>
          <p className="text-muted-foreground text-sm max-w-xs text-center mt-2">
            Comece minerando vídeos e usando o Gemini Vision para criar seus blueprints de inteligência.
          </p>
          <Button asChild className="mt-6">
            <Link href="/minerar">Ir para Mineração</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function Mic2(props: any) { return <Sparkles {...props} /> } // Helper placeholder or import correct one
