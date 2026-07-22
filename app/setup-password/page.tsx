"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Youtube, Lock, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { verifySetupTokenAction, setupPasswordAction } from "@/app/actions"

export default function SetupPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        if (!token) {
            setStatus({ type: 'error', text: "Link inválido. Por favor, solicite um novo link de acesso." })
            return
        }

        const establishSession = async () => {
            const result = await verifySetupTokenAction(token)

            if (!result.success || !result.email) {
                setStatus({ type: 'error', text: result.error || "Não foi possível validar seu link. Solicite um novo convite." })
                return
            }

            setUserEmail(result.email)
            setSessionReady(true)
        }

        establishSession()
    }, [])

    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        if (!token || !sessionReady) {
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

        const result = await setupPasswordAction(token, password)

        if (!result.success) {
            setStatus({ type: 'error', text: result.error || "Ocorreu um erro ao definir sua senha." })
        } else {
            setStatus({ type: 'success', text: "Senha criada com sucesso! Redirecionando..." })
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="flex h-16 items-center justify-center border-b border-border bg-background">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/20">
                        <Youtube className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase">DARK<span className="text-red-600">TUBE</span></span>
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Criar sua Senha de Acesso
                        </h1>
                        <p className="text-sm text-muted-foreground">
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
                                        className="h-11 w-full rounded-xl border border-border bg-input pl-10 pr-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none"
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
                                        className="h-11 w-full rounded-xl border border-border bg-input pl-10 pr-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none"
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

                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-12 w-full rounded-xl text-sm font-black shadow-lg"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Configuração"}
                            </Button>
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
