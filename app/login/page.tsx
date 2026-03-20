"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Youtube, Mail, Loader2, AlertCircle, ArrowRight } from "lucide-react"

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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <Youtube className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">DarkTube <span className="text-primary">Miner</span></span>
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'login' ? "Entrar" : "Enviar Link de Recuperação"}
                        </button>

                        {mode === 'reset' && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-center text-xs font-bold text-muted-foreground hover:text-white transition-colors"
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
