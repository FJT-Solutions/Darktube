"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Youtube, Key, Save, LogOut, Loader2, ArrowLeft } from "lucide-react"
import { updateSettingsAction, getSettingsAction } from "@/app/actions"
import { toast } from "sonner"

export default function SettingsPage() {
    const { session, loading, signOut } = useAuth()
    const router = useRouter()
    const [geminiKey, setGeminiKey] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

    useEffect(() => {
        if (session) {
            getSettingsAction().then(settings => {
                if (settings?.geminiApiKey) setGeminiKey(settings.geminiApiKey)
            })
        }
    }, [session])

    const handleSave = async () => {
        setIsSaving(true)
        setSaveStatus("idle")
        const result = await updateSettingsAction({ geminiApiKey: geminiKey })
        setIsSaving(false)
        setSaveStatus(result.success ? "success" : "error")

        if (result.success) {
            toast.success("Configurações salvas com sucesso!")
            setTimeout(() => setSaveStatus("idle"), 3000)
        } else {
            toast.error("Erro ao salvar configurações")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4 lg:p-8">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-white/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                    <p className="text-muted-foreground mt-1">Gerencie suas conexões e chaves de API.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* YouTube Connection */}
                <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Youtube className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <CardTitle>Conexão YouTube</CardTitle>
                                <CardDescription>Conta conectada ao DarkTube.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {session ? (
                            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                                        {(session.user?.user_metadata?.avatar_url || session.user?.user_metadata?.picture) ? (
                                            <img 
                                                src={session.user.user_metadata.avatar_url || session.user.user_metadata.picture} 
                                                alt={session.user.user_metadata?.full_name || ""} 
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl font-bold text-muted-foreground">
                                                {(session.user?.user_metadata?.full_name || "U")[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{(session.user as any)?.user_metadata?.full_name || (session.user as any)?.name}</p>
                                        <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
                                    <LogOut className="h-4 w-4 mr-2" /> Sair
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl space-y-4">
                                <Youtube className="h-12 w-12 mx-auto text-muted-foreground/30" />
                                <div className="space-y-1">
                                    <p className="font-medium">Nenhuma conta conectada</p>
                                    <p className="text-sm text-muted-foreground">Faça login para gerenciar suas configurações.</p>
                                </div>
                                <Button onClick={() => router.push('/login')} className="bg-primary hover:bg-primary/90 text-white">
                                    Ir para Login
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {session && (
                    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Credenciais de IA</CardTitle>
                                    <CardDescription>Configure suas chaves para análise avançada de canais.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                                <Input
                                    id="gemini-key"
                                    type="password"
                                    placeholder="Paste your API key here..."
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    className="font-mono bg-background/50"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Necessária para a **Validação Visual Real**. Obtenha sua chave gratuita em <a href="https://aistudio.google.com/" target="_blank" className="text-primary underline">Google AI Studio</a>.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-between items-center border-t border-border/50 pt-8 mt-6 gap-4">
                            <p className="text-xs text-muted-foreground text-center sm:text-left">Suas chaves são criptografadas e salvas com segurança no banco de dados.</p>
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving} 
                                className="w-full sm:w-auto gap-2 h-11 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all active:scale-95"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saveStatus === "success" ? "Salvo!" : saveStatus === "error" ? "Erro ao salvar" : "Salvar Alterações"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    )
}
