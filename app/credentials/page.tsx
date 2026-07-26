"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Save, Loader2, ArrowLeft, Cpu, Globe, Eye, EyeOff, Sparkles, Plus, Trash2, Instagram, Youtube as YoutubeIcon, Music2, Facebook, RefreshCw } from "lucide-react"
import {
    updateCredentialsAction,
    getCredentialsAction,
    getBlotatoAccountsAction,
    addBlotatoAccountAction,
    removeBlotatoAccountAction,
    fetchBlotatoAccountsFromAPIAction
} from "@/app/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CredentialsPage() {
    const { session, loading } = useAuth()
    const router = useRouter()

    const [keys, setKeys] = useState<Record<string, string>>({
        blotato: "",
        gemini: "",
        openai: "",
        elevenlabs: "",
        claude: "",
        openrouter: "",
        kie_ai: "",
        n8n_webhook: "https://n8n.fjt-solutions.com/webhook/darktube_producao",
        remotion_url: "http://remotion-service:3001/render",
        meta_app_id: "",
        meta_app_secret: "",
        meta_client_token: "",
        meta_access_token: ""
    })

    const [activeTab, setActiveTab] = useState<"media" | "ai">("media")
    const [blotatoAccounts, setBlotatoAccounts] = useState<any[]>([])
    const [apiAccounts, setApiAccounts] = useState<any[]>([])
    const [isRefreshingAPI, setIsRefreshingAPI] = useState(false)
    const [newAccount, setNewAccount] = useState({ platform: "instagram", accountId: "", label: "" })

    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
    const [isSaving, setIsSaving] = useState<string | null>(null)
    const [isAddingAccount, setIsAddingAccount] = useState(false)
    const [syncFailed, setSyncFailed] = useState<boolean | null>(null) // null=not tried, false=ok, true=failed

    useEffect(() => {
        if (session) {
            getCredentialsAction().then(data => {
                if (data) setKeys(prev => ({ ...prev, ...data }))
            })
            fetchBlotatoAccounts()
            handleSyncBlotato(true) // auto-sync silently on load
        }
    }, [session])

    const fetchBlotatoAccounts = async () => {
        const accounts = await getBlotatoAccountsAction()
        setBlotatoAccounts(accounts)
    }

    const handleSave = async (provider: string) => {
        setIsSaving(provider)
        const result = await updateCredentialsAction(provider, keys[provider])
        setIsSaving(null)

        if (result.success) {
            toast.success(`Credencial ${provider} salva com sucesso!`)
        } else {
            toast.error(`Erro ao salvar ${provider}: ${result.error}`)
        }
    }


    const handleAddAccount = async () => {
        if (!newAccount.accountId) {
            toast.error("O ID da conta é obrigatório")
            return
        }

        setIsAddingAccount(true)
        try {
            await addBlotatoAccountAction(newAccount.platform, newAccount.accountId, newAccount.label)
            toast.success("Conta adicionada com sucesso!")
            setNewAccount({ platform: "instagram", accountId: "", label: "" })
            fetchBlotatoAccounts()
        } catch (error: any) {
            toast.error(`Erro ao adicionar conta: ${error.message}`)
        } finally {
            setIsAddingAccount(false)
        }
    }

    const handleRemoveAccount = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover esta conta?")) return

        try {
            await removeBlotatoAccountAction(id)
            toast.success("Conta removida")
            fetchBlotatoAccounts()
        } catch (error: any) {
            toast.error(`Erro ao remover conta: ${error.message}`)
        }
    }

    const handleSyncBlotato = async (silent = false) => {
        if (!silent) setIsRefreshingAPI(true)
        try {
            const result = await fetchBlotatoAccountsFromAPIAction()

            if (result.success && result.accounts) {
                // Fix: use composite key to allow multiple pages for the same parent account
                const alreadyLinkedSet = new Set(
                    blotatoAccounts.map(a => `${a.account_id}_${a.page_id || ''}`)
                )
                const flatAccounts: any[] = []

                for (const acc of result.accounts as any[]) {
                    // Normalize fields as mapped by the simplified server action
                    const accountId = acc.id
                    const displayUsername = acc.username || accountId
                    const platform = acc.platform || 'facebook'
                    const pages = acc.pages || []
                    
                    if (!accountId || !platform) continue

                    const accountImageUrl = platform === 'facebook'
                        ? `https://graph.facebook.com/${accountId}/picture?type=square&width=80`
                        : undefined

                    if (pages.length > 0) {
                        for (const page of pages) {
                            const pid = page.id || page.pageId || page._id
                            // Use empty string to match DB standard
                            const compositeKey = `${accountId}_${pid || ''}`
                            
                            if (!alreadyLinkedSet.has(compositeKey)) {
                                flatAccounts.push({
                                    id: accountId,
                                    platform,
                                    username: displayUsername,
                                    imageUrl: accountImageUrl,
                                    pageId: pid,
                                    pageName: page.name || page.pageName || page.label || page.title,
                                    displayName: `${page.name || page.pageName || page.label || page.title} (${displayUsername})`,
                                    pageImageUrl: pid
                                        ? `https://graph.facebook.com/${pid}/picture?type=square&width=80`
                                        : accountImageUrl,
                                })
                            }
                        }
                    } else {
                        const compositeKey = `${accountId}_`
                        if (!alreadyLinkedSet.has(compositeKey)) {
                            flatAccounts.push({
                                id: accountId,
                                platform,
                                username: displayUsername,
                                imageUrl: accountImageUrl,
                                displayName: displayUsername
                            })
                        }
                    }
                }

                if (flatAccounts.length > 0) {
                    let linkedCount = 0
                    const errors: string[] = []
                    
                    for (const acc of flatAccounts) {
                        try {
                            const result = await addBlotatoAccountAction(
                                acc.platform,
                                acc.id,
                                acc.displayName,
                                acc.pageId,
                                acc.pageName,
                                acc.pageImageUrl || acc.imageUrl
                            )
                            if (result) linkedCount++
                        } catch (e: any) {
                            console.error(`Falha ao sincronizar conta ${acc.id}:`, e)
                            errors.push(acc.displayName)
                        }
                    }
                    
                    if (!silent) {
                        if (linkedCount > 0) {
                            toast.success(`${linkedCount} nova(s) conta(s) vinculada(s) com sucesso!`)
                        }
                        if (errors.length > 0) {
                            toast.warning(`Não foi possível vincular: ${errors.join(', ')}. Verifique se já existem no sistema.`)
                        }
                    }
                    fetchBlotatoAccounts()
                } else if (!silent) {
                    if ((result.accounts as any[]).length > 0) {
                        // Se retornou contas mas nenhuma é nova
                        toast.info("Suas contas do Blotato já estão todas sincronizadas.", {
                             description: `${(result.accounts as any[]).length} conta(s) detectada(s).`
                        })
                    } else {
                        toast.info("Nenhuma conta encontrada no Blotato. Verifique em my.blotato.com.")
                    }
                }

                setApiAccounts([])
                setSyncFailed(false)
            } else {
                setSyncFailed(true)
                if (!silent) toast.error(result.error || "Erro ao buscar contas no Blotato")
            }
        } catch (error: any) {
            setSyncFailed(true)
            if (!silent) toast.error(`Erro: ${error.message}`)
        } finally {
            if (!silent) setIsRefreshingAPI(false)
        }
    }

    const toggleShow = (provider: string) => {
        setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
    }

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />
            case 'tiktok': return <Music2 className="h-4 w-4 text-cyan-400" />
            case 'youtube': return <YoutubeIcon className="h-4 w-4 text-red-500" />
            case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />
            default: return <Globe className="h-4 w-4" />
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                    <Key className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Acesso Restrito</h1>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    Você precisa estar logado para gerenciar suas credenciais de segurança.
                </p>
                <Button onClick={() => router.push('/login')} className="mt-6">
                    Fazer Login
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-8 animate-in fade-in duration-500 overflow-hidden">
            <div className="flex items-center gap-4 mb-8 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-secondary/50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Credenciais</h1>
                    <p className="text-muted-foreground mt-1">Gerencie suas chaves de API e conexões de mídias.</p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex w-full gap-2 p-1.5 bg-secondary/20 border border-border/50 rounded-2xl mb-8 shrink-0">
                <button
                    onClick={() => setActiveTab("media")}
                    style={{ width: '50%' }}
                    className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all min-w-0",
                        activeTab === "media"
                            ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                            : "text-muted-foreground hover:bg-red-600/10"
                    )}
                >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="truncate">Canais e Mídias</span>
                </button>
                <button
                    onClick={() => setActiveTab("ai")}
                    style={{ width: '50%' }}
                    className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all min-w-0",
                        activeTab === "ai"
                            ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                            : "text-muted-foreground hover:bg-red-600/10"
                    )}
                >
                    <Cpu className="h-4 w-4 shrink-0" />
                    <span className="truncate">IA (Inteligência Artificial)</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-8">
                <div className="grid gap-8">
                    {/* CONTENT: CANAIS E MÍDIAS */}
                    {activeTab === "media" && (
                        <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                            {/* BLOTATO KEY */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Globe className="h-5 w-5 text-blue-400" />
                                    <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground">Configurações Blotato</h2>
                                </div>

                                <Card className="border-primary/10 bg-card/40 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="blotato-key">Blotato API / Account ID</Label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative flex-1">
                                                    <Input
                                                        id="blotato-key"
                                                        type={showKeys['blotato'] ? "text" : "password"}
                                                        placeholder="Sua credencial Blotato"
                                                        value={keys.blotato}
                                                        onChange={(e) => setKeys(prev => ({ ...prev, blotato: e.target.value }))}
                                                        className="font-mono bg-background/50 pr-10 h-12"
                                                    />
                                                    <button
                                                        onClick={() => toggleShow('blotato')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showKeys['blotato'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={() => handleSave('blotato')}
                                                    disabled={isSaving === 'blotato'}
                                                    className="shrink-0 h-12 px-6 font-bold"
                                                >
                                                    {isSaving === 'blotato' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                    Salvar
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>

                            {/* SOCIAL MEDIA ACCOUNTS */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between px-1 border-l-2 border-emerald-500/50 pl-4">
                                    <div className="flex items-center gap-2">
                                        <Plus className="h-5 w-5 text-emerald-400" />
                                        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/90">Contas Conectadas</h2>
                                    </div>
                                    <div className="text-[10px] py-1 px-3 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase tracking-widest">
                                        {blotatoAccounts.length} Contas
                                    </div>
                                </div>

                                <Card className="border-emerald-500/10 bg-emerald-500/[0.02] backdrop-blur-md overflow-hidden">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base font-bold text-foreground/90">Adicionar Nova Conta</CardTitle>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <CardDescription className="text-xs text-muted-foreground/70">
                                                Gerencie suas conexões automáticas via Blotato.
                                            </CardDescription>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={() => handleSyncBlotato()}
                                                disabled={isRefreshingAPI}
                                                className="h-9 px-4 text-xs font-bold border bg-background/50 hover:bg-background transition-all shadow-sm group"
                                            >
                                                {isRefreshingAPI ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2 group-hover:rotate-180 transition-transform duration-500" />}
                                                Sincronizar com Blotato
                                            </Button>
                                        </div>
                                    </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* MANUAL FORM — only shown if auto-sync failed */}
                                    {syncFailed === true && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest px-1">Vínculo Manual</Label>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-10">
                                            <div className="sm:col-span-3 space-y-2">
                                                <Label className="text-[10px]">Plataforma</Label>
                                                <select
                                                    value={newAccount.platform}
                                                    onChange={(e) => setNewAccount(prev => ({ ...prev, platform: e.target.value }))}
                                                    className="w-full h-10 px-3 bg-background/50 border border-border/50 rounded-lg text-sm appearance-none outline-primary"
                                                >
                                                    <option value="instagram">Instagram</option>
                                                    <option value="tiktok">TikTok</option>
                                                    <option value="youtube">YouTube</option>
                                                    <option value="facebook">Facebook</option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-3 space-y-2">
                                                <Label className="text-[10px]">ID da Conta/URL</Label>
                                                <Input
                                                    placeholder="@user"
                                                    value={newAccount.accountId}
                                                    onChange={(e) => setNewAccount(prev => ({ ...prev, accountId: e.target.value }))}
                                                    className="h-10 text-sm bg-background/50"
                                                />
                                            </div>
                                            <div className="sm:col-span-2 space-y-2">
                                                <Label className="text-[10px]">Apelido</Label>
                                                <Input
                                                    placeholder="Página X"
                                                    value={newAccount.label}
                                                    onChange={(e) => setNewAccount(prev => ({ ...prev, label: e.target.value }))}
                                                    className="h-10 text-sm bg-background/50"
                                                />
                                            </div>
                                            <div className="sm:col-span-2 space-y-2 flex items-end">
                                                <Button
                                                    onClick={handleAddAccount}
                                                    disabled={isAddingAccount}
                                                    className="w-full h-10 font-bold"
                                                >
                                                    {isAddingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    )}


                                </CardContent>
                                </Card>

                                <div className="grid gap-3 pt-2">
                                    {blotatoAccounts.length === 0 ? (
                                        <div className="p-12 text-center border-2 border-dashed border-border/20 rounded-2xl bg-background/20">
                                            <Globe className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                                            <p className="text-sm text-muted-foreground/60 italic">Nenhuma conta social conectada ainda.</p>
                                        </div>
                                    ) : (
                                        blotatoAccounts.map((acc) => (
                                            <div
                                                key={acc.id}
                                                className="flex items-center justify-between p-4 bg-background/40 border border-white/[0.03] rounded-xl group hover:border-emerald-500/30 transition-all hover:bg-background/60 shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-12 w-12 flex items-center justify-center rounded-xl bg-background border border-white/[0.05] shadow-inner overflow-hidden relative",
                                                        !acc.avatar_url && acc.platform === 'facebook' && "text-blue-500",
                                                        !acc.avatar_url && acc.platform === 'instagram' && "text-pink-500",
                                                        !acc.avatar_url && acc.platform === 'youtube' && "text-red-500",
                                                        !acc.avatar_url && acc.platform === 'tiktok' && "text-foreground"
                                                    )}>
                                                        {acc.avatar_url ? (
                                                            <img 
                                                                src={acc.avatar_url} 
                                                                alt={acc.label || 'Avatar'} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            getPlatformIcon(acc.platform)
                                                        )}
                                                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-white/10 scale-75">
                                                            {getPlatformIcon(acc.platform)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight text-foreground/90">
                                                            {acc.label || acc.page_name || acc.account_id}
                                                            {acc.page_name && acc.label && <span className="text-muted-foreground/60 font-medium ml-1.5 text-xs">({acc.page_name})</span>}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest mt-0.5">
                                                            {acc.platform}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveAccount(acc.id)}
                                                    className="h-10 w-10 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                        </div>
                    )}

                    {/* CONTENT: INTELIGÊNCIA ARTIFICIAL */}
                    {activeTab === "ai" && (
                        <section className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 px-1">
                                <Cpu className="h-5 w-5 text-purple-400" />
                                <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground">Modelos de IA</h2>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    { id: 'gemini', label: 'Google Gemini', color: 'bg-blue-500/10 text-blue-400', desc: 'Análise visual avançada.' },
                                    { id: 'openai', label: 'OpenAI (GPT)', color: 'bg-emerald-500/10 text-emerald-400', desc: 'Textos e transcrições.' },
                                    { id: 'n8n_webhook', label: 'Webhook n8n Produção', color: 'bg-red-500/10 text-red-400', desc: 'URL do disparo de automação no n8n.' },
                                    { id: 'remotion_url', label: 'Servidor Remotion', color: 'bg-cyan-500/10 text-cyan-400', desc: 'URL de renderização via Docker/VPS.' },
                                    { id: 'elevenlabs', label: 'ElevenLabs', color: 'bg-orange-500/10 text-orange-400', desc: 'Dublagem e vozes.' },
                                    { id: 'claude', label: 'Anthropic Claude', color: 'bg-amber-500/10 text-amber-400', desc: 'Análise de roteiro.' },
                                    { id: 'openrouter', label: 'OpenRouter', color: 'bg-indigo-500/10 text-indigo-400', desc: 'Acesso multimodelo.' },
                                    { id: 'kie_ai', label: 'Kie.AI', color: 'bg-pink-500/10 text-pink-400', desc: 'Modelos de nicho (Opcional).' },
                                ].map((ai) => (
                                    <Card key={ai.id} className="border-primary/5 bg-card/30 backdrop-blur-sm overflow-hidden group">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wide">
                                                    <Sparkles className={cn("h-3.5 w-3.5", ai.color.split(' ')[1])} />
                                                    {ai.label}
                                                </CardTitle>
                                                <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter", ai.color)}>
                                                    {keys[ai.id] ? "Conectado" : "Pendente"}
                                                </div>
                                            </div>
                                            <CardDescription className="text-[11px] mt-0.5">{ai.desc}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2">
                                            <div className="flex flex-col gap-3">
                                                <div className="relative">
                                                    <Input
                                                        type={showKeys[ai.id] ? "text" : "password"}
                                                        placeholder="Cole sua API Key aqui"
                                                        value={keys[ai.id]}
                                                        onChange={(e) => setKeys(prev => ({ ...prev, [ai.id]: e.target.value }))}
                                                        className="h-10 text-xs font-mono bg-background/30 pr-8 border-white/5 focus:border-primary/50"
                                                    />
                                                    <button
                                                        onClick={() => toggleShow(ai.id)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {showKeys[ai.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={() => handleSave(ai.id)}
                                                    disabled={isSaving === ai.id}
                                                    size="sm"
                                                    className="w-full h-9 text-xs gap-2 bg-secondary/50 hover:bg-primary transition-all active:scale-95 border border-white/5"
                                                >
                                                    {isSaving === ai.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                    {isSaving === ai.id ? "Salvando..." : "Salvar Chave"}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <footer className="shrink-0 pt-4 pb-2 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Key className="h-3 w-3" />
                    Chaves criptografadas com AES-256 para sua segurança total.
                </p>
            </footer>
        </div>
    )
}
