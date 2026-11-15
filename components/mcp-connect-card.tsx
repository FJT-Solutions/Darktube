"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plug, Copy, Trash2, Loader2, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { createMcpTokenAction, listMcpTokensAction, revokeMcpTokenAction } from "@/app/settings/actions"

type Row = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "nunca")

export function McpConnectCard() {
  const [tokens, setTokens] = useState<Row[]>([])
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  const load = async () => {
    const r = await listMcpTokensAction()
    if (r.success) setTokens(r.tokens as Row[])
  }
  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  const create = async () => {
    setBusy(true)
    const r = await createMcpTokenAction(name)
    setBusy(false)
    if (!r.success) return toast.error(r.error || "Não foi possível criar o token.")
    setFresh(r.token)
    setName("")
    load()
  }

  const revoke = async (id: string) => {
    const r = await revokeMcpTokenAction(id)
    if (r.success) {
      toast.success("Token revogado.")
      load()
    } else toast.error("Não foi possível revogar.")
  }

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"))

  const url = `${origin}/api/mcp`
  const shown = fresh || "SEU_TOKEN"
  const cli = `claude mcp add --transport http darktube ${url} --header "Authorization: Bearer ${shown}"`
  const json = JSON.stringify({ mcpServers: { darktube: { type: "http", url, headers: { Authorization: `Bearer ${shown}` } } } }, null, 2)

  return (
    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Conectar ao MCP do DarkTube</CardTitle>
            <CardDescription>Gere um token pessoal para o seu agente (Claude Code, Cursor etc.) criar criativos na sua conta.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2 space-y-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Nome do token (ex: Claude Code do escritório)" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create} disabled={busy} className="shrink-0">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />} Gerar token
          </Button>
        </div>

        {fresh && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
            <p className="text-sm font-medium">Copie agora: este token não será mostrado de novo.</p>
            <div className="flex gap-2">
              <code className="flex-1 min-w-0 truncate rounded-md bg-background/60 px-3 py-2 text-xs">{fresh}</code>
              <Button size="icon" variant="outline" onClick={() => copy(fresh)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Como conectar</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Claude Code (terminal):</p>
            <div className="flex gap-2">
              <pre className="flex-1 min-w-0 overflow-x-auto rounded-md bg-secondary/40 p-3 text-xs">{cli}</pre>
              <Button size="icon" variant="outline" onClick={() => copy(cli)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Outros clientes (arquivo .mcp.json):</p>
            <div className="flex gap-2">
              <pre className="flex-1 min-w-0 overflow-x-auto rounded-md bg-secondary/40 p-3 text-xs">{json}</pre>
              <Button size="icon" variant="outline" onClick={() => copy(json)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tokens ativos</p>
          {tokens.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum token criado ainda.</p>
          ) : (
            tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.prefix}… · criado {fmt(t.created_at)} · último uso {fmt(t.last_used_at)}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => revoke(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
