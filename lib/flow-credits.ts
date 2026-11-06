import { pool } from '@/lib/db-client';
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

  // Base costs
  let costPerVideo = 0;
  let costPerTakeAvg = 0;

  if (isHybrid) {
    // Na arquitetura híbrida: metade dos takes são diálogos/rostos e metade são b-rolls/objetos
    const dialogueTakes = Math.ceil(takes / 2);
    const brollTakes = takes - dialogueTakes;

    const dialogueModel = isVeo ? (model.includes('Fast') ? 'Veo 3.1 - Fast' : 'Veo 3.1 - Quality') : 'Omni 1.2 Flash';
    const brollModel = isVeo ? 'Veo 3.1 - Lite' : 'Omni 1.1 Flash';

    const dialogueCost = getTakeCreditCost(dialogueModel, sec);
    const brollCost = getTakeCreditCost(brollModel, sec);

    costPerVideo = dialogueTakes * dialogueCost + brollTakes * brollCost;
    costPerTakeAvg = Math.round((costPerVideo / takes) * 10) / 10;
  } else {
    const singleTakeCost = getTakeCreditCost(model, sec);
    costPerVideo = takes * singleTakeCost;
    costPerTakeAvg = singleTakeCost;
  }

  // Pure Quality comparison
  const pureQualityModel = isVeo ? 'Veo 3.1 - Quality' : 'Omni 1.2 Flash';
  const pureQualityTakeCost = getTakeCreditCost(pureQualityModel, sec);
  const pureQualityCostPerVideo = takes * pureQualityTakeCost;
  const pureQualityMaxVideos = pureQualityCostPerVideo > 0 ? Math.floor(credits / pureQualityCostPerVideo) : 0;

  const maxVideosPossible = costPerVideo > 0 ? Math.floor(credits / costPerVideo) : 0;
  const remainingCredits = costPerVideo > 0 ? credits % costPerVideo : credits;
  const totalDurationPerVideo = takes * sec;
  const totalProductionSeconds = maxVideosPossible * totalDurationPerVideo;

  const mins = Math.floor(totalProductionSeconds / 60);
  const remSec = totalProductionSeconds % 60;
  const formattedProductionTime = mins > 0 ? `${mins}m ${remSec}s` : `${remSec}s`;

  const savingsPercent =
    pureQualityCostPerVideo > 0
      ? Math.max(0, Math.round(((pureQualityCostPerVideo - costPerVideo) / pureQualityCostPerVideo) * 100))
      : 0;

  const extraVideosGained = Math.max(0, maxVideosPossible - pureQualityMaxVideos);

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
      pureQualityCostPerVideo,
      pureQualityMaxVideos,
      extraVideosGained,
    },
  };
}

let tableReady = false;

export async function ensureCreditsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.user_credits (
      user_id UUID PRIMARY KEY,
      credits INT NOT NULL DEFAULT 500,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  tableReady = true;
}

/**
 * Consulta o saldo atual de créditos do usuário no banco.
 * Se o usuário não tiver registro, cria com 500 créditos padrão de boas-vindas.
 */
export async function getUserCredits(userId: string): Promise<number> {
  await ensureCreditsTable();
  const { rows } = await pool.query(
    `SELECT credits FROM public.user_credits WHERE user_id = $1`,
    [userId]
  );
  if (rows && rows.length > 0) {
    return Number(rows[0].credits) || 0;
  }
  // Cria saldo inicial para o usuário
  await pool.query(
    `INSERT INTO public.user_credits (user_id, credits)
     VALUES ($1, 500)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  return 500;
}

/**
 * Atualiza ou recarrega os créditos do usuário.
 */
export async function setUserCredits(userId: string, credits: number): Promise<number> {
  await ensureCreditsTable();
  const valid = Math.max(0, Math.round(Number(credits) || 0));
  const { rows } = await pool.query(
    `INSERT INTO public.user_credits (user_id, credits, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET credits = $2, updated_at = NOW()
     RETURNING credits`,
    [userId, valid]
  );
  return Number(rows[0]?.credits ?? valid);
}
