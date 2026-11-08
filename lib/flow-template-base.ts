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

/**
 * Presenca de personagem num take:
 * - 'character': ha uma pessoa com rosto visivel (pode falar com lip-sync se o modo for 'dialogo').
 * - 'faceless': so maos, objetos, comida, paisagem ou silhuetas; nunca rosto nem lip-sync.
 */
export type FlowBeatPresence = 'character' | 'faceless'

/** Funcao narrativa de uma cena (em ingles, vai para a IA do roteiro). */
export interface FlowBeat {
  /** O que a cena precisa entregar. Ex.: "Hook: in media res humiliation or shocking contradiction". */
  fn: string
  /** Plano e movimento de camera. Ex.: "medium two-shot, subtle handheld". */
  camera: string
  /**
   * Opcional. Sem valor, vale o padrao do modo do template (ver `beatPresence`). Em take 'faceless' a fala
   * e vazia ou narracao fora da tela: o roteiro nao deve gerar "Dialogue/lip-sync" nem pedir rosto.
   */
  presence?: FlowBeatPresence
}

/** Presenca efetiva de um beat: o valor explicito ou o padrao do modo ('dialogo' = personagem, demais = sem rosto). */
export function beatPresence(mode: FlowProductionMode, beat?: Pick<FlowBeat, 'presence'>): FlowBeatPresence {
  return beat?.presence ?? (mode === 'dialogo' ? 'character' : 'faceless')
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
  /** Quem fala olha direto para a lente (Expert sobre fundo chroma key). Sem isso o padrao e olhar para o interlocutor, fora do centro. */
  lookAtCamera?: boolean
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
  /** `realismo`: estilo visual (valor de REALISM) que a tela seleciona ao escolher o template. */
  defaults: { takes: number; seconds: number; aspect: string; model: string; quality: string; realismo?: string; wordsPerCaption?: 1 | 2 | 3 }
}

export const WORDS_PER_CAPTION_OPTIONS = [
  { value: '1', label: '1 palavra (dinâmico)' },
  { value: '2', label: '2 palavras (rápido)' },
  { value: '3', label: '3 palavras (curto)' },
]

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

/** Idioma da fala em ingles, para o prompt do Flow (o rotulo de LANGUAGES e so para a tela). */
export const LANGUAGE_PROMPT: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese, with a natural Brazilian accent',
  'pt-PT': 'European Portuguese, with a natural Portugal accent',
  'en-US': 'American English',
  'es-ES': 'Castilian Spanish, with a natural Spain accent',
  'es-MX': 'Mexican Spanish, with a natural Mexican accent',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
}

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
  { value: 'ilustrado2d', label: 'Ilustração 2D (personagem P&B em cenário pintado)' },
  { value: 'stickman2d', label: 'Cartum 2D (bonecos simples, cenário detalhado)' },
  { value: 'avatar3d', label: 'Avatar 3D de blocos (estilo jogo)' },
  { value: 'brinquedo3d', label: 'Maquete 3D de brinquedo (explicador)' },
]

/** Texto em ingles de cada estilo, para o prompt do Flow (o rotulo em portugues e so para a tela). */
export const REALISM_PROMPT: Record<string, string> = {
  cinematografico: 'cinematic 35mm film look, natural skin texture, motivated practical lighting',
  hiper: 'photorealistic, fine natural detail, realistic lighting',
  estilizado: 'stylized cinematic look, bold clean colors, polished finish',
  animacao3d: 'high-end 3D animated film style, expressive characters, soft global illumination',
  massinha: 'handmade claymation and felt stop-motion look, tactile textures, warm light',
  ilustrado2d:
    'hand-painted 2D illustrated animation with limited motion (parallax, steam, light flicker); every person is a flat grayscale ink figure (white and gray, thick black outlines, simple dot eyes) placed inside richly painted, saturated, weathered environments, food and props with painterly texture and warm tungsten light',
  stickman2d:
    'flat 2D cartoon animation in the style of simple web comics: round-headed characters with dot eyes, thin limbs and thick outlines, placed in detailed painted historical backgrounds, bold clean colors, expressive exaggerated reactions, snappy limited animation',
  avatar3d:
    'stylized 3D game-avatar look: blocky toy-like characters with smooth plastic skin and simple faces, bright sunny saturated colors, soft shadows, clean polished render, playful physics-style motion',
  brinquedo3d:
    'clean 3D miniature diorama look: toy-like low-poly buildings and objects on a bright green and blue landscape, soft studio lighting, smooth glossy materials, simple stylized shapes, smooth camera moves',
}

export const VIDEO_MODELS: FlowFieldOption[] = [
  { value: 'Omni 1.2 Flash', label: 'Omni 1.2 Flash' },
  { value: 'Omni 1.1 Flash', label: 'Omni 1.1 Flash' },
  { value: 'Veo 3.1 - Lite', label: 'Veo 3.1 Lite' },
  { value: 'Veo 3.1 - Fast', label: 'Veo 3.1 Fast' },
  { value: 'Veo 3.1 - Quality', label: 'Veo 3.1 Quality' },
]

export const TAKE_SECONDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

/** Dia em que o Flow tira o Omni 1.1 e o Veo 3.1 do menu (aviso do proprio Flow: "Disponivel ate 5 de dez."). */
export const OLD_MODELS_SUNSET = '2026-12-05'

/** Modelo que sobra depois da data acima. */
export const CURRENT_VIDEO_MODEL = 'Omni 1.2 Flash'

/** Omni 1.1 e Veo 3.1 ja sairam do Flow? Depois disso so existe o Omni 1.2 Flash. */
export function oldModelsRetired(now: number = Date.now()): boolean {
  return now >= Date.parse(OLD_MODELS_SUNSET + 'T00:00:00Z')
}

/** Troca um modelo que ja saiu do Flow pelo atual; antes da data devolve o mesmo modelo. */
export function effectiveVideoModel(model?: string, now: number = Date.now()): string {
  const m = String(model || '')
  if (!m) return m
  if (oldModelsRetired(now) && /veo|omni 1.1/i.test(m)) return CURRENT_VIDEO_MODEL
  return m
}

/**
 * Duracoes em segundos permitidas nativamente por cada modelo no Google Flow:
 * - Omni 1.2 Flash: barra de arrastar de 3 a 15 s, de 1 em 1 s (medido na tela do Flow).
 * - Omni 1.1 Flash: 4s, 6s, 8s ou 10s.
 * - Veo 3.1: 5s ou 8s por geracao (nao conferido de novo; sai do Flow em 5 de dezembro).
 */
export function allowedSecondsForModel(model?: string): number[] {
  const m = String(effectiveVideoModel(model)).toLowerCase()
  if (m.includes('veo')) {
    return [5, 8]
  }
  if (m.includes('omni 1.2')) {
    return TAKE_SECONDS.slice()
  }
  return [4, 6, 8, 10]
}

/**
 * Valida e ajusta a duração do take para o valor permitido mais próximo do modelo.
 */
export function clampSecondsForModel(seconds: number, model?: string): number {
  const allowed = allowedSecondsForModel(model)
  if (allowed.includes(seconds)) return seconds
  return allowed.reduce((prev, curr) => (Math.abs(curr - seconds) < Math.abs(prev - seconds) ? curr : prev), allowed[0])
}

/**
 * Resolução inteligente do modelo por take (Arquitetura Híbrida de Custos & Fidelidade):
 * - Familia Veo: takes com close de pessoas, rostos ou dialogo lip-sync usam o modelo base selecionado
 *   (Veo 3.1 - Quality / Fast). Takes sem pessoas (b-roll, comida, objetos, cenarios) usam Veo 3.1 - Lite,
 *   economizando creditos e tempo sem criar inconsistencias esteticas (mesma familia e resolucao 720p).
 * - Familia Omni: takes com lip-sync de fala usam Omni 1.2 Flash; todos os takes usam Omni 1.2 Flash (so um Omni 1.1 escolhido de proposito continua 1.1).
 */
export function resolveTakeModel(baseModel: string, hasCharacterOrDialogue: boolean): string {
  const m = String(effectiveVideoModel(baseModel) || '')
  if (m.toLowerCase().includes('veo')) {
    if (m === 'Veo 3.1 - Lite') return 'Veo 3.1 - Lite'
    if (!hasCharacterOrDialogue) {
      return 'Veo 3.1 - Lite'
    }
    return m || 'Veo 3.1 - Fast'
  }
  if (m.toLowerCase().includes('omni')) {
    if (m === 'Omni 1.1 Flash') return 'Omni 1.1 Flash'
    // Omni 1.2 em todos os takes (b-roll incluso): o 1.1 sai do Flow em 5/12 e recusou take com referencia no teste.
    return 'Omni 1.2 Flash'
  }
  return m || 'Omni 1.2 Flash'
}

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
