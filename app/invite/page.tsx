"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Youtube, Send, ShieldCheck, Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function InvitePage() {
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()

    const handleInviteRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await supabase
            .from('invites')
            .insert({ email, name })

        if (error) {
            if (error.code === '23505') {
                setMessage({ type: 'error', text: "Este e-mail já solicitou acesso anteriormente." })
            } else {
                setMessage({ type: 'error', text: error.message })
            }
        } else {
            setMessage({ type: 'success', text: "Solicitação enviada com sucesso! Analisaremos seu perfil em breve." })
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
                <Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Voltar para login</span>
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Solicitar Acesso</h1>
                        <p className="text-balance text-muted-foreground">
                            O DarkTube Miner é uma ferramenta exclusiva para membros aprovados. Nos conte quem você é para avaliarmos sua entrada.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
                        <form onSubmit={handleInviteRequest} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seu Nome Complete</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Seu Nome"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail de Contato</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="marcelo@gmail.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                            </div>

                            {message && (
                                <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
                                    message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                                }`}>
                                    {message.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <ShieldCheck className="h-5 w-5 shrink-0" />}
                                    <p>{message.text}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || message?.type === 'success'}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Solicitar Autorização
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground">
                        Já tem acesso? <Link href="/login" className="text-primary hover:underline">Faça login aqui</Link>
                    </p>
                    <p className="text-center text-[11px] text-muted-foreground">
                        Ao solicitar acesso, você concorda com nossos termos de uso e política de privacidade.
                    </p>
                </div>
            </main>
        </div>
    )
}
