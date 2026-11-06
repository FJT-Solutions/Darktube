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
 * Tabela oficial de consumo de créditos do Google Flow por modelo e duração:
 * - Omni 1.1 Flash: ~2.5 cred/s (4s: 10 | 6s: 15 | 8s: 20 | 10s: 25)
 * - Omni 1.2 Flash: ~3.75 cred/s (4s: 15 | 6s: 22 | 8s: 30 | 10s: 38)
 * - Veo 3.1 - Lite: ~4 cred/s (5s: 20 | 8s: 32)
 * - Veo 3.1 - Fast: ~7 cred/s (5s: 35 | 8s: 56)
 * - Veo 3.1 - Quality: ~10 cred/s (5s: 50 | 8s: 80)
 */
export const MODEL_CREDIT_COSTS: Record<string, ModelCreditCost> = {
  'Omni 1.1 Flash': {
    model: 'Omni 1.1 Flash',
    label: 'Omni 1.1 Flash (Rápido / B-Roll)',
    family: 'Omni',
    tier: 'Lite',
    costPerSecond: 2.5,
    rates: { 4: 10, 6: 15, 8: 20, 10: 25 },
  },
  'Omni 1.2 Flash': {
    model: 'Omni 1.2 Flash',
    label: 'Omni 1.2 Flash (Fala e Lip-Sync)',
    family: 'Omni',
    tier: 'Quality',
    costPerSecond: 3.75,
    rates: { 4: 15, 6: 22, 8: 30, 10: 38 },
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
  const cfg = MODEL_CREDIT_COSTS[model] || MODEL_CREDIT_COSTS['Omni 1.1 Flash'];
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
    const brollModel = isVeo ? 'Veo 3.1 - Lite' : 'Omni 1.1 Flash';

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
