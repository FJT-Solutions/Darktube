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
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isReset, setIsReset] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // Verificar se é um fluxo de reset de senha pelo hash da URL
        if (window.location.hash.includes('type=recovery')) {
            setIsReset(true)
        }
        
        // Verificar se há uma sessão ativa
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Se não houver sessão, talvez o link expirou ou é inválido
                setStatus({ type: 'error', text: "O link de configuração de senha expirou ou é inválido. Por favor, solicite suporte." })
            }
        }
        checkSession()
    }, [supabase.auth])

    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        
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
                    <span className="text-lg font-bold tracking-tight text-white">DarkTube <span className="text-red-500">Miner</span></span>
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-xl">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            {isReset ? 'Redefinir sua Senha' : 'Criar sua Senha'}
                        </h1>
                        <p className="text-sm text-zinc-400">
                            {isReset ? 'Digite sua nova senha de acesso.' : 'Configure sua senha de acesso para começar a minerar.'}
                        </p>
                    </div>

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
                            disabled={loading || (status?.type === 'error' && status.text.includes('expirou'))}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Configuração"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}
