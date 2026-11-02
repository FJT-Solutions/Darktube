// Tipos e listas comuns dos templates da aba Flow (sem os templates em si, para o catalogo
// importar daqui sem dependencia circular).

/**
 * dialogo: personagens falam na tela (lip-sync) | narracao: narrador fora da tela | ambiente: sem fala
 * livre: o usuario decide take por take (cada take tem o seu "kind").
 */
export type FlowProductionMode = 'dialogo' | 'narracao' | 'ambiente' | 'livre'

export interface FlowFieldOption {
  value: string
  label: string
}

export interface FlowField {
  id: string
  label: string
  type: 'select' | 'text' | 'textarea'
  options?: FlowFieldOption[]
  default: string
  placeholder?: string
  help?: string
}

/** Funcao narrativa de uma cena (em ingles, vai para a IA do roteiro). */
export interface FlowBeat {
  /** O que a cena precisa entregar. Ex.: "Hook: in media res humiliation or shocking contradiction". */
  fn: string
  /** Plano e movimento de camera. Ex.: "medium two-shot, subtle handheld". */
  camera: string
}

export interface FlowTemplate {
  id: string
  /** Grupo na tela (ex.: Histórias, Vendas, Curiosidades). */
  niche: string
  subniche: string
  name: string
  description: string
  mode: FlowProductionMode
  /** 'curto' (Reels/Shorts/TikTok, 20-60 s) ou 'longo' (YouTube, 3-10 min). */
  length: 'curto' | 'longo'
  /** Viral do momento (2025-2026) ou formato atemporal. */
  trend: 'viral' | 'atemporal'
  /** Campos exclusivos do template (os comuns vem de COMMON_FIELDS). */
  fields: FlowField[]
  /** Orientacao de conteudo enviada a IA, em ingles curto. */
  brief: string
  /**
   * Estrutura de cenas, em ordem. Se houver mais takes que beats, a IA distribui os beats como atos
   * (ex.: o meio se repete em escalada); se houver menos, junta beats vizinhos.
   */
  beats: FlowBeat[]
  /** Regras extras do formato, em ingles (ex.: "second-person narration", "end with a cliffhanger"). */
  rules?: string[]
  /** Estilo visual padrao do formato, em ingles (ex.: "35mm film grain, noir lighting"). */
  look?: string
  defaults: { takes: number; seconds: number; aspect: string; model: string; quality: string }
}

export const LANGUAGES: FlowFieldOption[] = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'en-US', label: 'Inglês (EUA)' },
  { value: 'es-ES', label: 'Espanhol (Espanha)' },
  { value: 'es-MX', label: 'Espanhol (México)' },
  { value: 'fr-FR', label: 'Francês' },
  { value: 'de-DE', label: 'Alemão' },
  { value: 'it-IT', label: 'Italiano' },
]

export const EMOTIONS: FlowFieldOption[] = [
  { value: 'empatia', label: 'Empatia' },
  { value: 'tensao', label: 'Tensão' },
  { value: 'raiva', label: 'Indignação' },
  { value: 'medo', label: 'Medo' },
  { value: 'tristeza', label: 'Tristeza' },
  { value: 'alegria', label: 'Alegria' },
  { value: 'amor', label: 'Afeto' },
  { value: 'surpresa', label: 'Surpresa' },
  { value: 'esperanca', label: 'Esperança' },
  { value: 'humor', label: 'Humor' },
  { value: 'curiosidade', label: 'Curiosidade' },
  { value: 'calma', label: 'Calma' },
]

export const REALISM: FlowFieldOption[] = [
  { value: 'cinematografico', label: 'Cinematográfico (película, textura natural)' },
  { value: 'hiper', label: 'Hiper-realista (detalhe fino)' },
  { value: 'estilizado', label: 'Estilizado (cores fortes, acabamento limpo)' },
  { value: 'animacao3d', label: 'Animação 3D (estilo filme de animação)' },
  { value: 'massinha', label: 'Massinha / feltro (stop motion)' },
]

/** Texto em ingles de cada estilo, para o prompt do Flow (o rotulo em portugues e so para a tela). */
export const REALISM_PROMPT: Record<string, string> = {
  cinematografico: 'cinematic 35mm film look, natural skin texture, motivated practical lighting',
  hiper: 'photorealistic, fine natural detail, realistic lighting',
  estilizado: 'stylized cinematic look, bold clean colors, polished finish',
  animacao3d: 'high-end 3D animated film style, expressive characters, soft global illumination',
  massinha: 'handmade claymation and felt stop-motion look, tactile textures, warm light',
}

export const VIDEO_MODELS: FlowFieldOption[] = [
  { value: 'Omni 1.1 Flash', label: 'Omni 1.1 Flash' },
  { value: 'Veo 3.1 - Lite', label: 'Veo 3.1 Lite' },
  { value: 'Veo 3.1 - Fast', label: 'Veo 3.1 Fast' },
  { value: 'Veo 3.1 - Quality', label: 'Veo 3.1 Quality' },
]

export const TAKE_SECONDS = [4, 6, 8, 10]

/** Maximo de takes por projeto (60 x 10 s = 10 min, para os formatos longos). */
export const MAX_TAKES = 60

/**
 * Limite de palavras por take: ~2,3 palavras por segundo (4 s: 9, 6 s: 13, 8 s: 18, 10 s: 23).
 * Acima disso o modelo acelera a fala, perde o lip-sync ou corta a ultima palavra.
 */
export function wordLimit(seconds: number): number {
  return Math.max(3, Math.floor(seconds * 2.3))
}

export const COMMON_FIELDS: FlowField[] = [
  {
    id: 'tema',
    label: 'Tema ou ideia (opcional)',
    type: 'textarea',
    default: '',
    placeholder: 'Descreva a história ou o assunto. Se deixar vazio, a IA sugere um.',
  },
]
