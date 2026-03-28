"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Youtube, Mail, Loader2, AlertCircle, ArrowRight, ShieldAlert, Search } from "lucide-react"
import { checkUserAccessAction } from "@/app/actions"

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'reset'>('login')
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const access = await checkUserAccessAction(email)

        if (access.status === 'no_access') {
            setMessage({ 
                type: 'error', 
                text: "Você ainda não possui acesso ou convite aprovado. Por favor, solicite seu acesso." 
            })
            setLoading(false)
            return
        }

        if (access.status === 'pending_invite') {
            setMessage({ 
                type: 'error', 
                text: "Sua solicitação de acesso ainda está em análise. Avisaremos por e-mail quando for aprovada." 
            })
            setLoading(false)
            return
        }

        if (access.status === 'blocked') {
            setMessage({ 
                type: 'error', 
                text: "Seu acesso foi suspenso. Entre em contato com o suporte." 
            })
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setMessage({ type: 'error', text: "E-mail ou senha incorretos. Verifique suas credenciais." })
        } else {
            router.push('/dashboard')
        }
        setLoading(false)
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const access = await checkUserAccessAction(email)

        if (access.status === 'no_access' || access.status === 'pending_invite') {
            setMessage({ 
                type: 'error', 
                text: "Não encontramos uma conta aprovada para este e-mail. Solicite seu acesso primeiro." 
            })
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/setup-password`,
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: "Link de recuperação enviado para seu e-mail!" })
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-600/20">
                        <Youtube className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
                </Link>
            </header>

        <main className="flex flex-1 flex-col items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 rounded-none border-0 bg-transparent p-6 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-8 sm:shadow-xl sm:shadow-black/20">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {mode === 'login' ? 'Acesso ao Sistema' : 'Recuperar Senha'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'login' 
                                ? 'Entre com suas credenciais para acessar sua conta.' 
                                : 'Digite seu e-mail para receber um link de recuperação.'}
                        </p>
                    </div>

                    <form onSubmit={mode === 'login' ? handleLogin : handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 w-full rounded-xl border border-border bg-input pl-10 pr-4 text-base transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        {mode === 'login' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                                    <button 
                                        type="button"
                                        onClick={() => setMode('reset')}
                                        className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 w-full rounded-xl border border-border bg-input px-4 text-base transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        )}

                        {message && (
                            <div className={`flex items-start gap-3 rounded-lg p-3 text-xs ${
                                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}>
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p>{message.text}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-12 w-full rounded-xl text-sm font-bold shadow-lg"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'login' ? "Entrar" : "Enviar Link de Recuperação"}
                            </Button>

                            {mode === 'login' && (
                                <Link 
                                    href={email ? `/pending?email=${encodeURIComponent(email)}` : '/pending'} 
                                    className="w-full"
                                >
                                    <button
                                        type="button"
                                        className="h-10 w-full rounded-xl bg-secondary/80 text-[11px] font-black text-foreground hover:bg-secondary transition-all flex items-center justify-center gap-2 shadow-sm border border-border/50"
                                    >
                                        <Search className="h-3 w-3 text-primary" />
                                        CONSULTAR STATUS DO MEU ACESSO
                                    </button>
                                </Link>
                            )}
                        </div>

                        {mode === 'reset' && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Voltar para o Login
                            </button>
                        )}
                    </form>

                    <div className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            Não tem acesso?{" "}
                            <button 
                                onClick={() => router.push('/invite')} 
                                className="font-bold text-primary hover:underline"
                            >
                                Solicitar acesso agora
                                <ArrowRight className="ml-1 inline h-3 w-3" />
                            </button>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
