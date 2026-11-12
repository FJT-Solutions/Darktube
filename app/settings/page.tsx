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
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-white/10 shrink-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Configurações</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Preferências e status da sua conta.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* YouTube Connection */}
                <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                                <Youtube className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">Conta conectada ao <span className="uppercase font-black tracking-tighter">DARK<span className="text-red-500">TUBE</span></span>.</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
                        {session ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center shrink-0">
                                        {(session.user?.user_metadata?.avatar_url || session.user?.user_metadata?.picture) ? (
                                            <img 
                                                src={session.user.user_metadata.avatar_url || session.user.user_metadata.picture} 
                                                alt={session.user.user_metadata?.full_name || ""} 
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg sm:text-xl font-bold text-muted-foreground">
                                                {(session.user?.user_metadata?.full_name || "U")[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm sm:text-base truncate">{(session.user as any)?.user_metadata?.full_name || (session.user as any)?.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => signOut()} 
                                    className="text-muted-foreground hover:text-destructive self-start sm:self-auto shrink-0"
                                >
                                    <LogOut className="h-4 w-4 mr-2" /> Sair
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl space-y-4">
                                <Youtube className="h-12 w-12 mx-auto text-muted-foreground/30" />
                                <div className="space-y-1">
                                    <p className="font-medium text-sm sm:text-base">Nenhuma conta conectada</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Faça login para gerenciar suas configurações.</p>
                                </div>
                                <Button onClick={() => router.push('/login')}>
                                    Ir para Login
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
