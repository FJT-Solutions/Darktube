"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Youtube, Key, Save, LogOut, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { updateSettingsAction, getSettingsAction, getAllProfilesAction, updateUserRoleAction } from "@/app/actions"

export default function SettingsPage() {
    const { session, loading, signOut } = useAuth()
    const router = useRouter()
    const [geminiKey, setGeminiKey] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
    
    // User management state
    const [profiles, setProfiles] = useState<any[]>([])
    const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null)
    const isAdmin = session?.user?.email === 'nathan.jordan@fjt-solutions.com'

    useEffect(() => {
        if (session) {
            getSettingsAction().then(settings => {
                if (settings?.geminiApiKey) setGeminiKey(settings.geminiApiKey)
            })

            if (isAdmin) {
                getAllProfilesAction().then(setProfiles)
            }
        }
    }, [session, isAdmin])

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

    const handleRoleUpdate = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin'
        if (!confirm(`Deseja alterar o cargo deste usuário para ${newRole.toUpperCase()}?`)) return

        setIsUpdatingRole(userId)
        const result = await updateUserRoleAction(userId, newRole as any)
        if (result.success) {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
        }
        setIsUpdatingRole(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
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
                                <CardDescription>Conecte sua conta para minerar seus próprios dados.</CardDescription>
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
                        <CardFooter className="flex flex-col sm:flex-row justify-between items-center border-t border-border/50 pt-8 mt-6 gap-4">
                            <p className="text-xs text-muted-foreground">Suas chaves são criptografadas e salvas no banco de dados.</p>
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving} 
                                className="gap-2 h-11 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-all active:scale-95"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saveStatus === "success" ? "Salvo!" : saveStatus === "error" ? "Erro ao salvar" : "Salvar Alterações"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Admin User Management */}
                {isAdmin && profiles.length > 0 && (
                    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Gerenciamento de Usuários</CardTitle>
                            <CardDescription>Gerencie as permissões dos membros da plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {profiles.map((profile) => (
                                    <div key={profile.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/40">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border/30">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold text-muted-foreground">{(profile.full_name || profile.email)[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{profile.full_name || 'Usuário'}</p>
                                                <p className="text-xs text-muted-foreground">{profile.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                                {profile.role}
                                            </Badge>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                disabled={isUpdatingRole === profile.id || profile.email === 'nathan.jordan@fjt-solutions.com'}
                                                onClick={() => handleRoleUpdate(profile.id, profile.role)}
                                                className="text-xs h-8"
                                            >
                                                {isUpdatingRole === profile.id ? <Loader2 className="h-3 w-3 animate-spin" /> : `Mudar para ${profile.role === 'admin' ? 'User' : 'Admin'}`}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
