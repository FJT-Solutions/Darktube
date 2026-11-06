"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Coins,
  Calculator,
  Sparkles,
  TrendingUp,
  Zap,
  Film,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import {
  simulateCredits,
  MODEL_CREDIT_COSTS,
  type SimulationResult,
} from "@/lib/flow-credits"
import { allowedSecondsForModel, clampSecondsForModel, VIDEO_MODELS } from "@/lib/flow-template-base"
import { getUserCreditsAction, setUserCreditsAction } from "@/app/flow/actions"
import { toast } from "sonner"

interface FlowCreditSimulatorProps {
  currentModel?: string
  currentSeconds?: number
  currentTakes?: number
  onApplyConfig?: (model: string, seconds: number, takes: number) => void
  className?: string
}

const PRESET_CREDITS = [500, 1000, 2500, 5000]

export function FlowCreditSimulator({
  currentModel = "Veo 3.1 - Quality",
  currentSeconds = 5,
  currentTakes = 4,
  onApplyConfig,
  className,
}: FlowCreditSimulatorProps) {
  // Saldo real do usuário vindo do backend
  const [accountCredits, setAccountCredits] = useState<number>(1000)
  const [simCredits, setSimCredits] = useState<number>(1000)
  const [loadingCredits, setLoadingCredits] = useState<boolean>(true)
  const [savingCredits, setSavingCredits] = useState<boolean>(false)

  // Parâmetros de simulação
  const [simModel, setSimModel] = useState<string>(currentModel)
  const [simSeconds, setSimSeconds] = useState<number>(currentSeconds)
  const [simTakes, setSimTakes] = useState<number>(currentTakes)
  const [isHybrid, setIsHybrid] = useState<boolean>(true)
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  // Carrega créditos reais da conta
  const loadCredits = useCallback(async () => {
    try {
      setLoadingCredits(true)
      const res = await getUserCreditsAction()
      if (res.success) {
        setAccountCredits(res.credits)
        setSimCredits(res.credits)
      }
    } catch {
      // Fallback gracioso
    } finally {
      setLoadingCredits(false)
    }
  }, [])

  useEffect(() => {
    loadCredits()
  }, [loadCredits])

  // Sincroniza com parâmetros do formulário caso o usuário mude lá fora
  useEffect(() => {
    if (currentModel) setSimModel(currentModel)
  }, [currentModel])

  useEffect(() => {
    if (currentSeconds) setSimSeconds(currentSeconds)
  }, [currentSeconds])

  useEffect(() => {
    if (currentTakes) setSimTakes(currentTakes)
  }, [currentTakes])

  // Trata troca de modelo ajustando segundos para durações permitidas
  const handleModelChange = (model: string) => {
    setSimModel(model)
    const clamped = clampSecondsForModel(simSeconds, model)
    setSimSeconds(clamped)
  }

  // Permite salvar o novo saldo na conta
  const handleSaveAsDefaultCredits = async () => {
    try {
      setSavingCredits(true)
      const res = await setUserCreditsAction(simCredits)
      if (res.success) {
        setAccountCredits(res.credits)
        toast.success(`Saldo da conta atualizado para ${res.credits} créditos!`)
      }
    } catch {
      toast.error("Erro ao atualizar créditos da conta.")
    } finally {
      setSavingCredits(false)
    }
  }

  // Cálculo da simulação em tempo real
  const simResult: SimulationResult = useMemo(() => {
    return simulateCredits({
      userCredits: simCredits,
      model: simModel,
      secondsPerTake: simSeconds,
      takesCount: simTakes,
      isHybrid,
    })
  }, [simCredits, simModel, simSeconds, simTakes, isHybrid])

  const allowedSeconds = useMemo(() => allowedSecondsForModel(simModel), [simModel])

  return (
    <Card className={`border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-background to-background ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Simulador de Créditos e Capacidade de Produção
                <Badge variant="outline" className="border-amber-500/40 text-amber-500 font-normal">
                  Google Flow
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Simule quantos vídeos completos você consegue produzir conforme o modelo e a duração dos takes
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Coins className="h-3.5 w-3.5" />
              <span>Saldo na Conta: {loadingCredits ? "..." : accountCredits.toLocaleString("pt-BR")} cred</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Recolher" : "Expandir Simulador"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Seção 1: Configuração do Saldo e Simulação */}
          <div className="grid gap-4 rounded-xl border bg-muted/30 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1 text-foreground">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  Saldo para Simulação
                </span>
                <span className="font-bold text-amber-500">{simCredits.toLocaleString("pt-BR")} cred</span>
              </div>
              <Input
                type="number"
                min={0}
                step={50}
                className="h-8 font-semibold"
                value={simCredits}
                onChange={(e) => setSimCredits(Math.max(0, Number(e.target.value) || 0))}
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {PRESET_CREDITS.map((p) => (
                  <Button
                    key={p}
                    variant={simCredits === p ? "default" : "outline"}
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setSimCredits(p)}
                  >
                    {p}
                  </Button>
                ))}
                {simCredits !== accountCredits && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground underline"
                    onClick={() => setSimCredits(accountCredits)}
                  >
                    Resetar saldo
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Modelo de Vídeo</label>
              <Select value={simModel} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {MODEL_CREDIT_COSTS[simModel]?.costPerSecond || 4} cred/segundo
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Segundos por Take</label>
              <Select
                value={String(simSeconds)}
                onValueChange={(v) => setSimSeconds(Number(v))}
              >
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedSeconds.map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">
                      {s} segundos {simModel.includes("Veo") ? "(Nativo Veo)" : "(Nativo Omni)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Custo do take: ~{getTakeSingleCost(simModel, simSeconds)} cred
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-foreground">Takes por Vídeo</span>
                <span className="font-semibold text-primary">{simTakes} takes ({simTakes * simSeconds}s)</span>
              </div>
              <Slider
                min={1}
                max={15}
                step={1}
                value={[simTakes]}
                onValueChange={(v) => setSimTakes(v[0])}
                className="py-1"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Duração total:</span>
                <span className="text-[11px] font-semibold text-foreground">
                  {Math.floor((simTakes * simSeconds) / 60)}m {(simTakes * simSeconds) % 60}s
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Toggle da Arquitetura Híbrida Inteligente */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="rounded bg-emerald-500/10 p-1 text-emerald-500">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Arquitetura Híbrida Inteligente (Quality nos Diálogos + Lite no B-Roll)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Preserva máximo fotorrealismo nos rostos e economiza até 60% de créditos em tomadas de produtos e cenários
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isHybrid ? "default" : "outline"} className="text-xs">
                {isHybrid ? `Economia: ~${simResult.hybridSavingsPercent}%` : "100% no Modelo Base"}
              </Badge>
              <Switch checked={isHybrid} onCheckedChange={setIsHybrid} />
            </div>
          </div>

          {/* Seção 3: Cartões de Resultados em Tempo Real */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-3.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Capacidade Total</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">{simResult.maxVideosPossible}</span>
                <span className="text-xs font-semibold text-amber-500">vídeos completos</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Equivale a <strong>{simResult.formattedProductionTime}</strong> de material pronto
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Custo por Vídeo</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{simResult.costPerVideo}</span>
                <span className="text-xs text-muted-foreground">créditos</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Média de <strong>{simResult.costPerTake} cred</strong> por take
              </p>
            </div>

            <div className="rounded-xl border bg-card p-3.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sobra de Créditos</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{simResult.remainingCredits}</span>
                <span className="text-xs text-muted-foreground">créditos restantes</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {simResult.remainingCredits >= simResult.costPerTake
                  ? `Dá para gerar mais ${Math.floor(simResult.remainingCredits / simResult.costPerTake)} takes avulsos`
                  : "Aproveitamento quase total do saldo"}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Ganho com o Híbrido</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{simResult.comparedToPureQuality.extraVideosGained}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">vídeos extras</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Comparado ao uso de 100% Quality em todos os takes
              </p>
            </div>
          </div>

          {/* Seção 4: Ações e Aplicação no Projeto */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Parâmetros 100% compatíveis com os limites nativos do Google Flow</span>
            </div>

            <div className="flex items-center gap-2">
              {simCredits !== accountCredits && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleSaveAsDefaultCredits}
                  disabled={savingCredits}
                >
                  <RefreshCw className={`h-3 w-3 ${savingCredits ? "animate-spin" : ""}`} />
                  Salvar este saldo na Conta
                </Button>
              )}

              {onApplyConfig && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                  onClick={() => onApplyConfig(simModel, simSeconds, simTakes)}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Aplicar Configurações no Projeto
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function getTakeSingleCost(model: string, seconds: number): number {
  const cfg = MODEL_CREDIT_COSTS[model] || MODEL_CREDIT_COSTS["Omni 1.1 Flash"]
  const validSec = clampSecondsForModel(seconds, model)
  return cfg.rates[validSec] || Math.round(validSec * cfg.costPerSecond)
}
