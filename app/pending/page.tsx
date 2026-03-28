"use client"

import { Suspense } from "react"
import { Youtube, Clock, RefreshCw, LogOut, Zap, ShieldAlert, Mail, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { checkUserAccessAction } from "@/app/actions"

function PendingContent() {
    const { signOut, user, profile: authProfile } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryEmail = searchParams.get('email')
    
    const [publicStatus, setPublicStatus] = useState<'pending' | 'approved' | 'blocked' | 'not_found' | 'loading' | null>(null)
    const [displayEmail, setDisplayEmail] = useState("")
    const [emailInput, setEmailInput] = useState("")

    const handleCheck = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!emailInput) return
        
        setPublicStatus('loading')
        setDisplayEmail(emailInput)
        const result = await checkUserAccessAction(emailInput)
        if (result.status === 'pending_invite') setPublicStatus('pending')
        else if (result.status === 'has_access') setPublicStatus('approved')
        else if (result.status === 'blocked') setPublicStatus('blocked')
        else setPublicStatus('not_found')
    }

    useEffect(() => {
        const checkStatus = async () => {
            if (user) {
                setDisplayEmail(authProfile?.email || user?.email || "")
                return
            }

            if (queryEmail) {
                setPublicStatus('loading')
                setDisplayEmail(queryEmail)
                setEmailInput(queryEmail)
                const result = await checkUserAccessAction(queryEmail)
                if (result.status === 'pending_invite') setPublicStatus('pending')
                else if (result.status === 'has_access') setPublicStatus('approved')
                else if (result.status === 'blocked') setPublicStatus('blocked')
                else setPublicStatus('not_found')
            }
        }
        checkStatus()
    }, [user, authProfile, queryEmail])

    const isPending = (user && authProfile?.status === 'pending') || publicStatus === 'pending'
    const isApproved = publicStatus === 'approved'
    const isBlocked = publicStatus === 'blocked'
    const isNotFound = publicStatus === 'not_found'
    const isLoading = publicStatus === 'loading'

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md space-y-10 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                        {(isPending || isLoading) && <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping duration-[3000ms]" />}
                        <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary shadow-lg border border-primary/10 ${isPending || isLoading ? 'shadow-primary/5' : ''}`}>
                            {isLoading ? <RefreshCw className="h-10 w-10 text-primary animate-spin" /> : 
                             isApproved ? <Zap className="h-10 w-10 text-emerald-500" /> :
                             isBlocked ? <ShieldAlert className="h-10 w-10 text-destructive" /> :
                             isNotFound ? <Youtube className="h-10 w-10 text-muted-foreground" /> :
                             <Clock className="h-10 w-10 text-primary" />}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                            {isLoading ? 'Consultando...' :
                             isApproved ? <>Acesso <span className="text-emerald-500 italic">Liberado!</span></> :
                             isBlocked ? <>Acesso <span className="text-destructive italic">Suspenso</span></> :
                             isNotFound ? <>Não <span className="text-muted-foreground italic">Encontrado</span></> :
                             <>Acesso <span className="text-primary italic">Pendente</span></>}
                        </h1>

                        <div className="mx-auto max-w-[320px] space-y-4 py-2">
                            {(!user && !isLoading) ? (
                                <form onSubmit={handleCheck} className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="email"
                                            placeholder="Digite seu e-mail para validar"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            className="h-12 w-full rounded-xl border border-border bg-input pl-10 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!emailInput}
                                        className="h-10 w-full rounded-xl bg-primary text-[11px] font-black text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        VERIFICAR STATUS AGORA
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">E-mail verificado</p>
                                    <p className="truncate text-lg font-semibold text-foreground">{displayEmail || "..."}</p>
                                </div>
                            )}
                        </div>

                        <p className="text-balance text-muted-foreground text-sm leading-relaxed px-4">
                            {isLoading ? 'Aguarde um momento enquanto verificamos o status da sua solicitação...' :
                             isApproved ? 'Boa notícia! Sua solicitação foi aprovada. Você já pode acessar a plataforma com suas credenciais.' :
                             isBlocked ? 'Infelizmente seu acesso foi suspenso. Se você acredita que isso é um erro, entre em contato com o suporte.' :
                             isNotFound ? 'Não encontramos nenhuma solicitação de acesso para este e-mail. Caso ainda não tenha pedido, solicite no login.' :
                             'Sua conta está sob revisão. Nossa equipe de administradores está analisando sua solicitação para garantir a segurança da plataforma.'}
                        </p>

                        {!isLoading && displayEmail && (
                            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider border ${
                                isApproved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                isBlocked ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                'bg-muted text-muted-foreground border-border/50'
                            }`}>
                                {isApproved ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                Status: {isApproved ? 'Aprovado' : isBlocked ? 'Bloqueado' : isNotFound ? 'Não Encontrado' : 'Aguardando Aprovação'}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 pt-4 px-2">
                        {isApproved ? (
                            <Link href="/login" className="w-full">
                                <Button className="h-14 w-full rounded-2xl text-sm font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                    FAZER LOGIN AGORA
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : user && (
                            <button
                                onClick={() => window.location.reload()}
                                className="group relative flex h-14 items-center justify-center gap-3 rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
                                ATUALIZAR STATUS
                            </button>
                        )}
                        
                        <button
                            onClick={async () => {
                                if (user) await signOut()
                                router.push('/login')
                            }}
                            className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm text-sm font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground hover:border-border"
                        >
                            <LogOut className="h-4 w-4" />
                            {user ? 'Sair da conta' : 'Voltar ao Login'}
                        </button>
                    </div>

                    {user && (
                        <p className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em] font-medium">
                            ID: {user?.id?.slice(0, 8)}...
                        </p>
                    )}
                </div>
            </main>
        </div>
    )
}

export default function PendingPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <PendingContent />
        </Suspense>
    )
}
