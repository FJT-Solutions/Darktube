"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getPendingInvitesAction, approveInviteAction, declineInviteAction } from "@/app/actions"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppShell } from "@/components/layout/app-shell"
import { Loader2, UserPlus, Mail, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function AdminInvitesPage() {
    const { session, profile, loading: authLoading } = useAuth()
    const { toggleSidebar } = useAppShell()
    const router = useRouter()
    const [invites, setInvites] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const isAdmin = profile?.role === 'admin'

    useEffect(() => {
        if (isAdmin) {
            loadInvites()
        }
    }, [isAdmin])

    async function loadInvites() {
        setLoading(true)
        try {
            const data = await getPendingInvitesAction()
            setInvites(data || [])
        } catch (error) {
            console.error("Error loading invites:", error)
            toast.error("Erro ao carregar solicitações")
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove(id: string) {
        setProcessingId(id)
        try {
            const result = await approveInviteAction(id)
            if (result.success) {
                toast.success("Solicitação aprovada com sucesso! E-mail enviado.")
                setInvites(prev => prev.filter(i => i.id !== id))
                router.refresh()
            } else {
                console.error("Approval error:", result.error)
                toast.error(`Erro: ${result.error}`)
            }
        } catch (error) {
            console.error("Unexpected error:", error)
            toast.error("Ocorreu um erro inesperado")
        } finally {
            setProcessingId(null)
        }
    }

    async function handleDecline(id: string) {
        if (!confirm("Tem certeza que deseja recusar este acesso?")) return
        
        setProcessingId(id)
        try {
            const result = await declineInviteAction(id)
            if (result.success) {
                toast.success("Solicitação recusada com sucesso.")
                setInvites(prev => prev.filter(i => i.id !== id))
                router.refresh()
            } else {
                toast.error(`Erro: ${result.error}`)
            }
        } catch (error) {
            toast.error("Ocorreu um erro inesperado")
        } finally {
            setProcessingId(null)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="flex h-screen flex-col items-center justify-center p-4 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h1 className="text-2xl font-bold">Acesso Restrito</h1>
                <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
                <Button onClick={() => window.location.href = '/'}>Voltar para Home</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <Header 
                title="Convites" 
                description="Gerencie os convites e acessos pendentes"
                onMenuToggle={toggleSidebar}
            />
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Pendentes</CardTitle>
                                    <CardDescription>
                                        Existem {invites.length} convites aguardando sua revisão.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {invites.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-xl opacity-50">
                                        <p>Nenhum convite pendente no momento.</p>
                                    </div>
                                ) : (
                                    invites.map((invite) => (
                                        <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                                                    {invite.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{invite.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Mail className="h-3 w-3" /> {invite.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                                        <Clock className="h-3 w-3" /> Solicidado em: {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                                                    onClick={() => handleApprove(invite.id)}
                                                    disabled={processingId === invite.id}
                                                >
                                                    {processingId === invite.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    )}
                                                    Aprovar Acesso
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2"
                                                    onClick={() => handleDecline(invite.id)}
                                                    disabled={processingId === invite.id}
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Recusar
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
