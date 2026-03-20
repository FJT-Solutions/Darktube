"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Youtube, Lock, Loader2, AlertCircle, CheckCircle } from "lucide-react"

export default function SetupPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // Parse the hash fragment from the URL to get the auth tokens
        const hash = window.location.hash
        
        if (!hash) {
            setStatus({ type: 'error', text: "Link inválido. Por favor, solicite um novo link de acesso." })
            return
        }

        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const errorCode = params.get('error_code')

        if (errorCode) {
            setStatus({ type: 'error', text: "Este link de acesso expirou ou já foi utilizado. Por favor, solicite um novo." })
            return
        }

        if (!accessToken || !refreshToken) {
            setStatus({ type: 'error', text: "Link inválido. Tokens de autenticação não encontrados." })
            return
        }

        // Exchange the tokens to establish the INVITED USER's session
        // This is critical — it prevents modifying the admin's session
        const establishSession = async () => {
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            })

            if (error || !data.session) {
                setStatus({ type: 'error', text: "Não foi possível validar seu link. Solicite um novo convite." })
                return
            }

            // Session established for the INVITED USER
            setUserEmail(data.session.user.email ?? null)
            setSessionReady(true)
            
            // Clear the hash from URL to prevent re-use issues
            window.history.replaceState(null, '', window.location.pathname)
        }

        establishSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!sessionReady) {
            setStatus({ type: 'error', text: "Sessão não estabelecida. Recarregue a página." })
            return
        }

        if (password !== confirmPassword) {
            setStatus({ type: 'error', text: "As senhas não coincidem." })
            return
        }

        if (password.length < 6) {
            setStatus({ type: 'error', text: "A senha deve ter pelo menos 6 caracteres." })
            return
        }

        setLoading(true)
        setStatus(null)

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setStatus({ type: 'error', text: error.message })
        } else {
            setStatus({ type: 'success', text: "Senha criada com sucesso! Redirecionando..." })
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#050506]">
            <header className="flex h-16 items-center justify-center border-b border-white/5 bg-[#050506]">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                        <Youtube className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">DarkTube</span>
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-xl">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Criar sua Senha de Acesso
                        </h1>
                        <p className="text-sm text-zinc-400">
                            {userEmail ? `Definindo senha para ${userEmail}` : 'Validando seu link de acesso...'}
                        </p>
                    </div>

                    {!sessionReady && !status && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                        </div>
                    )}

                    {sessionReady && (
                        <form onSubmit={handleSetupPassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white transition-all focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Confirmar Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white transition-all focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {status && (
                                <div className={`flex items-start gap-3 rounded-lg p-3 text-xs ${
                                    status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                    {status.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                                    <p>{status.text}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex h-11 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Configuração"}
                            </button>
                        </form>
                    )}

                    {status && !sessionReady && (
                        <div className={`flex items-start gap-3 rounded-lg p-3 text-xs ${
                            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                            {status.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                            <p>{status.text}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
