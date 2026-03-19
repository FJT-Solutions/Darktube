"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getAllProfilesAction, updateUserRoleAction, updateUserStatusAction, deleteUserAction, resendAccessAction } from "@/app/actions"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppShell } from "@/components/layout/app-shell"
import { 
    Loader2, 
    Users, 
    Shield, 
    User, 
    Search, 
    MoreHorizontal, 
    Ban, 
    CheckCircle2, 
    Trash2, 
    Mail, 
    Send,
    AlertCircle,
    UserCheck,
    UserX
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AdminUsersPage() {
    const { session, profile: myProfile, loading: authLoading } = useAuth()
    const { toggleSidebar } = useAppShell()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isProcessing, setIsProcessing] = useState<string | null>(null)

    const isAdmin = myProfile?.role === 'admin'

    useEffect(() => {
        if (isAdmin) {
            loadUsers()
        }
    }, [isAdmin])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const data = await getAllProfilesAction()
            setUsers(data)
        } catch (error) {
            toast.error("Erro ao carregar usuários")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin'
        if (!confirm(`Mudar cargo para ${newRole}?`)) return
        
        setIsProcessing(userId)
        try {
            const result = await updateUserRoleAction(userId, newRole) as any
            if (result.success) {
                toast.success("Cargo atualizado")
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            } else {
                toast.error(result.error || "Erro ao atualizar")
            }
        } finally {
            setIsProcessing(null)
        }
    }

    const handleUpdateStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'blocked' ? 'approved' : 'blocked'
        const actionLabel = newStatus === 'blocked' ? 'Arquivar/Bloquear' : 'Reativar'
        
        if (!confirm(`${actionLabel} este usuário?`)) return
        
        setIsProcessing(userId)
        try {
            const result = await updateUserStatusAction(userId, newStatus) as any
            if (result.success) {
                toast.success(newStatus === 'blocked' ? "Usuário arquivado" : "Usuário reativado")
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
            } else {
                toast.error(result.error || "Erro ao atualizar")
            }
        } finally {
            setIsProcessing(null)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm("AVISO CRÍTICO: Isso excluirá permanentemente o usuário e seus dados de acesso. Deseja continuar?")) return
        
        setIsProcessing(userId)
        try {
            const result = await deleteUserAction(userId)
            if (result.success) {
                toast.success("Usuário removido permanentemente")
                setUsers(prev => prev.filter(u => u.id !== userId))
            } else {
                toast.error(result.error || "Erro ao remover")
            }
        } finally {
            setIsProcessing(null)
        }
    }

    const handleResendAccess = async (email: string, name: string, userId: string) => {
        setIsProcessing(userId)
        try {
            const result = await resendAccessAction(email, name)
            if (result.success) {
                toast.success("E-mail de acesso reenviado com sucesso")
            } else {
                toast.error(result.error || "Falha ao enviar e-mail")
            }
        } catch (error) {
            toast.error("Erro inesperado ao reenviar")
        } finally {
            setIsProcessing(null)
        }
    }

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase()) || 
        (u.full_name || "").toLowerCase().includes(search.toLowerCase())
    )

    if (authLoading || loading) {
        return (
            <div className="flex h-screen items-center justify-center">
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
                title="Gerenciar Membros" 
                description="Administração central de usuários e permissões"
                onMenuToggle={toggleSidebar}
            />
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    {/* Stats & Search */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/10">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total de Membros</p>
                                <p className="text-2xl font-bold">{users.length}</p>
                            </Card>
                            <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/10">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ativos</p>
                                <p className="text-2xl font-bold text-green-500">{users.filter(u => u.status === 'approved').length}</p>
                            </Card>
                        </div>
                        
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Buscar membro..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <Card className="border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border/50 bg-secondary/20">
                                        <th className="px-6 py-4 font-semibold text-muted-foreground">Usuário</th>
                                        <th className="px-6 py-4 font-semibold text-muted-foreground">Cargo</th>
                                        <th className="px-6 py-4 font-semibold text-muted-foreground">Status do Perfil</th>
                                        <th className="px-6 py-4 font-semibold text-muted-foreground">Registro / Senha</th>
                                        <th className="px-6 py-4 font-semibold text-right text-muted-foreground">Ações Gerais</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground opacity-50">
                                                Nenhum membro encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="border-b border-border/20 hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                            {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-foreground">{user.full_name || "Sem nome"}</span>
                                                                {user.isAuthOnly && (
                                                                    <Badge variant="outline" className="text-[9px] h-4 border-yellow-500/50 text-yellow-500 bg-yellow-500/5">
                                                                        Resíduo / Remanescente
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={user.role === 'admin' ? "default" : "secondary"} className="gap-1.5 font-medium">
                                                        {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                        {user.role === 'admin' ? 'Administrador' : 'Membro'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn(
                                                            "font-medium",
                                                            user.status === 'approved' && "border-green-500/30 text-green-500 bg-green-500/5",
                                                            user.status === 'blocked' && "border-destructive/30 text-destructive bg-destructive/5",
                                                            user.status === 'pending' && "border-yellow-500/30 text-yellow-500 bg-yellow-500/5"
                                                        )}
                                                    >
                                                        {user.status === 'approved' ? 'Aprovado' : user.status === 'blocked' ? 'Arquivado' : 'Pendente'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <Badge variant="outline" className={cn(
                                                            "font-medium gap-1.5 shrink-0",
                                                            user.isRegistered ? "border-blue-500/30 text-blue-500 bg-blue-500/5" : "border-yellow-500/30 text-yellow-500 bg-yellow-500/5"
                                                        )}>
                                                            {user.isRegistered ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                                            {user.isRegistered ? 'Senha Definida' : 'Senha Pendente'}
                                                        </Badge>
                                                        {!user.isRegistered && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-7 text-[10px] text-primary hover:bg-primary/10 gap-1.5"
                                                                onClick={() => handleResendAccess(user.email, user.full_name, user.id)}
                                                                disabled={isProcessing === user.id}
                                                            >
                                                                <Send className="h-3 w-3" /> Reenviar Convite
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-primary hover:bg-primary/10"
                                                            title="Mudar Cargo"
                                                            onClick={() => handleUpdateRole(user.id, user.role)}
                                                            disabled={isProcessing === user.id || user.email === 'nathan.jordan@fjt-solutions.com'}
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                        </Button>
                                                        
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn("h-8 w-8 hover:bg-secondary", user.status === 'blocked' ? "text-green-500" : "text-yellow-500")}
                                                            title={user.status === 'blocked' ? "Reativar" : "Arquivar"}
                                                            onClick={() => handleUpdateStatus(user.id, user.status)}
                                                            disabled={isProcessing === user.id || user.email === 'nathan.jordan@fjt-solutions.com'}
                                                        >
                                                            {user.status === 'blocked' ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                        </Button>

                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            title="Excluir"
                                                            onClick={() => handleDelete(user.id)}
                                                            disabled={isProcessing === user.id || user.email === 'nathan.jordan@fjt-solutions.com'}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-primary">Informações do Administrador:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li><strong>Senha Definida:</strong> Indica que o usuário já completou o cadastro e confirmou o e-mail/definiu senha.</li>
                                <li><strong>Reenviar Convite:</strong> Gera um novo link de acesso seguro e envia por e-mail para usuários travados ou que receberam links inválidos anteriormente.</li>
                                <li><strong>Arquivar:</strong> Bloqueia o acesso imediatamente via middleware, sem excluir os dados do usuário.</li>
                                <li><strong>Excluir:</strong> Remove permanentemente o perfil na base de dados e a conta no Supabase Auth.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
