/**
 * Darktube Motion Design Engine — Math & Closed-Form Physics
 * Baseado nos padrões dos principais estúdios de IA (Movez, Twoclipping, Video-Shotcraft)
 * 
 * Fornece física determinística para Remotion e renderizadores headless.
 * Evita o aspecto rígido de "PowerPoint" com molas amortecidas de inércia contínua.
 */

export interface SpringConfig {
  k?: number; // Rigidez (Stiffness)
  d?: number; // Amortecimento (Damping)
}

/**
 * Mola amortecida fechada analítica (0 -> 1).
 * Não depende de simulação frame a frame ou acumulador de estado.
 * É uma função pura do tempo `t` (em segundos).
 */
export function closedFormSpring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/**
 * Função track(): permite que um valor mude para múltiplos destinos em tempos diferentes
 * sem quebrar a continuidade do movimento (sem solavancos ou resets).
 * 
 * @param t Tempo atual em segundos
 * @param keys Array ordenado de par [tempo, valorAlvo]
 */
export function track(
  t: number,
  keys: [number, number][],
  k = 170,
  d = 26
): number {
  if (!keys || keys.length === 0) return 0;
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [targetTime, targetVal] = keys[i];
    const prevVal = keys[i - 1][1];
    v += (targetVal - prevVal) * closedFormSpring(t - targetTime, k, d);
  }
  return v;
}

/**
 * Indicador com efeito esticamento elástico (Leading & Trailing edges).
 * O início avança mais rápido que o final ao se deslocar entre abas/cards.
 */
export function indicator(t: number, stops: [number, number][], width = 120) {
  const lead = track(t, stops, 320, 30);
  const trail = track(t, stops, 140, 22);
  return {
    left: Math.min(lead, trail),
    right: Math.max(lead, trail) + width,
    width: Math.abs(lead - trail) + width,
  };
}

/**
 * Troca de visibilidade/opacidade suave durante morph de containers.
 * O elemento entra após o início da transição e sai antes da próxima.
 */
export function swapAlpha(t: number, tIn: number, tOut: number): number {
  const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  return Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1));
}

/**
 * Tempo em loop contínuo determinístico sem costuras (seam).
 */
export const loopT = (t: number, dur: number): number => ((t % dur) + dur) % dur;

/**
 * Gerador de ruído pseudo-aleatório com semente (Mulberry32).
 * NUNCA use Math.random() em vídeos determinísticos, pois cada frame renderizado
 * em paralelo necessita da mesma semente para não piscar/tremer (flicker).
 */
export function createRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
