"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Youtube, Key, Save, LogOut, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { updateSettingsAction, getSettingsAction } from "@/app/actions"

export default function SettingsPage() {
    const { data: session, status } = useSession()
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
            setTimeout(() => setSaveStatus("idle"), 3000)
        }
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground mt-1">Gerencie suas conexões e chaves de API.</p>
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
                                <CardDescription>Conecte sua conta para minerar seus próprios dados.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {session ? (
                            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20">
                                        <img src={session.user?.image || ""} alt={session.user?.name || ""} />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{session.user?.name}</p>
                                        <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                                        <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Conectado
                                        </Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-destructive">
                                    <LogOut className="h-4 w-4 mr-2" /> Desconectar
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl space-y-4">
                                <Youtube className="h-12 w-12 mx-auto text-muted-foreground/30" />
                                <div className="space-y-1">
                                    <p className="font-medium">Nenhuma conta conectada</p>
                                    <p className="text-sm text-muted-foreground">Conecte sua conta Google para começar.</p>
                                </div>
                                <Button onClick={() => signIn("google")} className="bg-red-600 hover:bg-red-700 text-white">
                                    Conectar Canal YouTube
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {status === "authenticated" && (
                    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Credenciais de IA</CardTitle>
                                    <CardDescription>Configure suas chaves para análise avançada.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                                <Input
                                    id="gemini-key"
                                    type="password"
                                    placeholder="Cole sua chave aqui..."
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    className="font-mono bg-background/50"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Necessária para a **Validação Visual Real**. Obtenha em <a href="https://aistudio.google.com/" target="_blank" className="text-primary underline">Google AI Studio</a>.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t border-border/50 pt-6">
                            <p className="text-xs text-muted-foreground">Suas chaves são criptografadas e salvas no banco de dados.</p>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
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
