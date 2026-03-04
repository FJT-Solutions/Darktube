"use client"

import { useState } from "react"
import { formatNumber } from "@/lib/metrics"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NICHES } from "@/lib/constants"
import { NicheCategory } from "@/lib/types"
import {
    Flame,
    Target,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Search,
    ChevronRight,
    Brain
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NicheBadge } from "./niche-badge"

interface MiningWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectNiche: (nicheId: string) => void
}

type Step = "goal" | "effort" | "recommendations"

export function MiningWizard({ open, onOpenChange, onSelectNiche }: MiningWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>("goal")
    const [goal, setGoal] = useState<"growth" | "revenue" | "easy">("growth")
    const [effort, setEffort] = useState<"low" | "medium" | "high">("medium")

    const getRecommendations = () => {
        let filtered = [...NICHES]

        if (goal === "revenue") {
            filtered = filtered.sort((a, b) => b.estimatedCpm - a.estimatedCpm)
        } else if (goal === "growth") {
            filtered = filtered.sort((a, b) => b.growthPotential - a.growthPotential)
        } else {
            filtered = filtered.sort((a, b) => a.difficulty - b.difficulty)
        }

        if (effort === "low") {
            filtered = filtered.filter(n => n.difficulty <= 5)
        } else if (effort === "high") {
            filtered = filtered.filter(n => n.difficulty >= 7)
        }

        return filtered.slice(0, 3)
    }

    const handleNext = () => {
        if (currentStep === "goal") setCurrentStep("effort")
        else if (currentStep === "effort") setCurrentStep("recommendations")
    }

    const reset = () => {
        setCurrentStep("goal")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">Assistente de Descoberta</DialogTitle>
                            <DialogDescription>
                                Vamos encontrar o melhor nicho para você.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-6 overflow-y-auto max-h-[60vh]">
                    <div className="pr-1">
                        {currentStep === "goal" && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Qual é o seu objetivo principal?</h4>
                                <div className="grid gap-3">
                                    {[
                                        { id: "growth", label: "Crescimento Rápido", desc: "Foco em visualizações e inscritos velozes.", icon: Flame },
                                        { id: "revenue", label: "Alta Lucratividade", desc: "Foco em CPM alto e anunciantes premium.", icon: Target },
                                        { id: "easy", label: "Facilidade de Produção", desc: "Ideias simples que exigem pouco tempo.", icon: BarChart3 },
                                    ].map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => setGoal(opt.id as any)}
                                            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${goal === opt.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border bg-secondary/50 hover:bg-secondary"
                                                }`}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    setGoal(opt.id as any)
                                                }
                                            }}
                                        >
                                            <div className={`mt-1 rounded-full p-2 ${goal === opt.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                                                <opt.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{opt.label}</div>
                                                <div className="text-xs text-muted-foreground">{opt.desc}</div>
                                            </div>
                                            {goal === opt.id && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === "effort" && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Quanto tempo você pretende dedicar?</h4>
                                <div className="grid gap-3">
                                    {[
                                        { id: "low", label: "Algumas horas/semana", desc: "Produção rápida e automatizada.", level: "Iniciante" },
                                        { id: "medium", label: "Dedicando-se Part-time", desc: "Edição moderada e pesquisa.", level: "Intermediário" },
                                        { id: "high", label: "Foco Total", desc: "Vídeos complexos de alta qualidade.", level: "Avançado" },
                                    ].map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => setEffort(opt.id as any)}
                                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${effort === opt.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border bg-secondary/50 hover:bg-secondary"
                                                }`}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    setEffort(opt.id as any)
                                                }
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{opt.label}</span>
                                                    <span className="text-[10px] font-bold uppercase text-primary">{opt.level}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">{opt.desc}</div>
                                            </div>
                                            {effort === opt.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === "recommendations" && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Nichos Recomendados para Você:</h4>
                                <div className="grid gap-4">
                                    {getRecommendations().map(niche => (
                                        <div
                                            key={niche.id}
                                            className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
                                        >
                                            <div className="flex items-start justify-between">
                                                <NicheBadge niche={niche} showMetrics />
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Potencial</span>
                                                    <span className="text-sm font-bold text-emerald-500">${formatNumber(Math.round((niche.estimatedCpm * 50000) / 1000))}/mês*</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {niche.description}
                                            </p>

                                            <div className="grid grid-cols-1 gap-2 rounded-xl bg-secondary/30 p-4 border border-border/50">
                                                <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-primary/80">
                                                    <Sparkles className="h-3 w-3" />
                                                    Pipeline de Criação IA
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase">Visual</span>
                                                        <span className="text-[10px] font-semibold truncate">{niche.aiWorkflow.visuals.split('(')[0]}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 border-x border-border/50 px-2">
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase">Roteiro</span>
                                                        <span className="text-[10px] font-semibold truncate">{niche.aiWorkflow.script.split('(')[0]}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 pl-1">
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase">Voz</span>
                                                        <span className="text-[10px] font-semibold truncate">{niche.aiWorkflow.voice.split('(')[0]}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group-hover:shadow-lg group-hover:shadow-primary/20"
                                                onClick={() => {
                                                    onSelectNiche(niche.id)
                                                    reset()
                                                }}
                                            >
                                                <span className="flex items-center gap-2">
                                                    Explorar {niche.label}
                                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </span>
                                            </Button>

                                            <p className="text-[9px] text-center text-muted-foreground/60 italic">
                                                *Estimativa baseada em 50k views/mês no nicho
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex sm:justify-between items-center border-t border-border p-6 mt-0">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Passo {currentStep === "goal" ? "1" : currentStep === "effort" ? "2" : "3"} de 3
                    </div>
                    <div className="flex gap-2">
                        {currentStep !== "recommendations" ? (
                            <Button onClick={handleNext} className="h-10 px-6">
                                Próximo
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={reset} className="h-10">
                                    Recomeçar
                                </Button>
                                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10">
                                    Fechar
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
