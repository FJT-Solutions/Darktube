"use client"

import { Youtube, Clock, RefreshCw, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

export default function PendingPage() {
    const { signOut } = useAuth()
    const router = useRouter()

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary animate-pulse">
                        <Clock className="h-10 w-10 text-primary" />
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesso Pendente</h1>
                        <p className="text-balance text-muted-foreground">
                            Sua conta está aguardando aprovação de um administrador. Você será notificado por e-mail assim que seu acesso for liberado.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-6">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background transition-all hover:opacity-90"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Verificar Status Novamente
                        </button>
                        
                        <button
                            onClick={async () => {
                                await signOut()
                                router.push('/login')
                            }}
                            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                        >
                            <LogOut className="h-4 w-4" />
                            Sair e Voltar ao Login
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
