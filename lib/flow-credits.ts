import { allowedSecondsForModel, clampSecondsForModel } from '@/lib/flow-template-base';

export interface ModelCreditCost {
  model: string;
  label: string;
  family: 'Veo' | 'Omni';
  tier: 'Lite' | 'Fast' | 'Quality' | 'Hybrid';
  costPerSecond: number;
  rates: Record<number, number>; // seconds -> credits
}

/**
 * Consumo de créditos do Google Flow por modelo e duração, em 720p.
 * MEDIDO na tela do Flow (7 nov 2026): Omni 1.2 Flash, barra de 3 a 15 s: 3s 9 | 4s 12 | 5s 15 | 6s 18 | 7s 21 | 8s 24 |
 * 9s 27 | 10s 30 | 11s 36 | 12s 42 | 13s 48 | 14s 54 | 15s 60. Omni 1.1 Flash: 10s 15.
 * ESTIMADO (não conferido): Omni 1.1 nas outras durações (1,5 cred/s) e todos os Veo 3.1. Omni 1.1 e Veo 3.1 saem do Flow em 5 dez.
 * Valor de 360p ainda não medido.
 */
export const MODEL_CREDIT_COSTS: Record<string, ModelCreditCost> = {
  'Omni 1.1 Flash': {
    model: 'Omni 1.1 Flash',
    label: 'Omni 1.1 Flash (Rápido / B-Roll)',
    family: 'Omni',
    tier: 'Lite',
    costPerSecond: 1.5,
    rates: { 10: 15 },
  },
  'Omni 1.2 Flash': {
    model: 'Omni 1.2 Flash',
    label: 'Omni 1.2 Flash (Fala e Lip-Sync)',
    family: 'Omni',
    tier: 'Quality',
    costPerSecond: 3,
    rates: { 3: 9, 4: 12, 5: 15, 6: 18, 7: 21, 8: 24, 9: 27, 10: 30, 11: 36, 12: 42, 13: 48, 14: 54, 15: 60 },
  },
  'Veo 3.1 - Lite': {
    model: 'Veo 3.1 - Lite',
    label: 'Veo 3.1 Lite (Ultra-rápido / B-Roll)',
    family: 'Veo',
    tier: 'Lite',
    costPerSecond: 4.0,
    rates: { 5: 20, 8: 32 },
  },
  'Veo 3.1 - Fast': {
    model: 'Veo 3.1 - Fast',
    label: 'Veo 3.1 Fast (Cinematográfico Balanceado)',
    family: 'Veo',
    tier: 'Fast',
    costPerSecond: 7.0,
    rates: { 5: 35, 8: 56 },
  },
  'Veo 3.1 - Quality': {
    model: 'Veo 3.1 - Quality',
    label: 'Veo 3.1 Quality (Máximo Fotorrealismo)',
    family: 'Veo',
    tier: 'Quality',
    costPerSecond: 10.0,
    rates: { 5: 50, 8: 80 },
  },
};

/**
 * Retorna o custo exato em créditos de um take específico.
 */
export function getTakeCreditCost(model: string, seconds: number): number {
  const cfg = MODEL_CREDIT_COSTS[model] || MODEL_CREDIT_COSTS['Omni 1.2 Flash'] || MODEL_CREDIT_COSTS['Omni 1.1 Flash'];
  const validSec = clampSecondsForModel(seconds, model);
  if (cfg.rates[validSec]) {
    return cfg.rates[validSec];
  }
  return Math.round(validSec * cfg.costPerSecond);
}

export interface SimulationResult {
  userCredits: number;
  model: string;
  secondsPerTake: number;
  takesCount: number;
  totalDurationSeconds: number;
  costPerTake: number;
  costPerVideo: number;
  isHybrid: boolean;
  hybridSavingsPercent: number;
  maxVideosPossible: number;
  remainingCredits: number;
  totalProductionSeconds: number;
  formattedProductionTime: string;
  comparedToPureQuality: {
    pureQualityCostPerVideo: number;
    pureQualityMaxVideos: number;
    extraVideosGained: number;
  };
}

/**
 * Simula a produção completa de vídeos com base no saldo de créditos.
 */
export function simulateCredits({
  userCredits,
  model,
  secondsPerTake,
  takesCount,
  isHybrid = true,
}: {
  userCredits: number;
  model: string;
  secondsPerTake: number;
  takesCount: number;
  isHybrid?: boolean;
}): SimulationResult {
  const credits = Math.max(0, Number(userCredits) || 0);
  const takes = Math.max(1, Number(takesCount) || 4);
  const sec = clampSecondsForModel(Number(secondsPerTake) || 5, model);
  const isVeo = model.toLowerCase().includes('veo');

  // Custo base de referência: 100% dos takes no modelo selecionado
  const baseTakeCost = getTakeCreditCost(model, sec);
  const baseCostPerVideo = takes * baseTakeCost;
  const baseMaxVideos = baseCostPerVideo > 0 ? Math.floor(credits / baseCostPerVideo) : 0;

  let costPerVideo = baseCostPerVideo;
  let costPerTakeAvg = baseTakeCost;
  let savingsPercent = 0;

  if (isHybrid) {
    // Na arquitetura híbrida: metade dos takes são diálogos/rostos e metade são b-rolls/objetos
    const dialogueTakes = Math.ceil(takes / 2);
    const brollTakes = takes - dialogueTakes;

    // Diálogos usam o modelo selecionado como teto; B-rolls usam o modelo econômico (Lite)
    const dialogueModel = model;
    const brollModel = isVeo ? 'Veo 3.1 - Lite' : model;

    const dialogueCost = getTakeCreditCost(dialogueModel, sec);
    const brollCost = getTakeCreditCost(brollModel, sec);

    // O modo híbrido nunca pode custar mais que o modelo base
    const rawHybridCost = dialogueTakes * dialogueCost + brollTakes * brollCost;
    costPerVideo = Math.min(rawHybridCost, baseCostPerVideo);
    costPerTakeAvg = Math.round((costPerVideo / takes) * 10) / 10;

    if (baseCostPerVideo > 0 && costPerVideo < baseCostPerVideo) {
      savingsPercent = Math.round(((baseCostPerVideo - costPerVideo) / baseCostPerVideo) * 100);
    }
  }

  const maxVideosPossible = costPerVideo > 0 ? Math.floor(credits / costPerVideo) : 0;
  const remainingCredits = costPerVideo > 0 ? credits % costPerVideo : credits;
  const totalDurationPerVideo = takes * sec;
  const totalProductionSeconds = maxVideosPossible * totalDurationPerVideo;

  const mins = Math.floor(totalProductionSeconds / 60);
  const remSec = totalProductionSeconds % 60;
  const formattedProductionTime = mins > 0 ? `${mins}m ${remSec}s` : `${remSec}s`;

  const extraVideosGained = Math.max(0, maxVideosPossible - baseMaxVideos);

  return {
    userCredits: credits,
    model,
    secondsPerTake: sec,
    takesCount: takes,
    totalDurationSeconds: totalDurationPerVideo,
    costPerTake: costPerTakeAvg,
    costPerVideo,
    isHybrid,
    hybridSavingsPercent: savingsPercent,
    maxVideosPossible,
    remainingCredits,
    totalProductionSeconds,
    formattedProductionTime,
    comparedToPureQuality: {
      pureQualityCostPerVideo: baseCostPerVideo,
      pureQualityMaxVideos: baseMaxVideos,
      extraVideosGained,
    },
  };
}
