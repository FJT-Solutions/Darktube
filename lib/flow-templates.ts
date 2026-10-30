// Templates da aba Flow. Cada template e um ponto de partida editavel: define o formulario,
// o modo de producao e as regras que a IA do roteiro recebe. Os textos aqui sao proprios.

export type FlowProductionMode = 'dialogo' | 'narracao' | 'ambiente'

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

export interface FlowTemplate {
  id: string
  niche: string
  subniche: string
  name: string
  description: string
  mode: FlowProductionMode
  /** Campos exclusivos do template (os comuns vem de COMMON_FIELDS). */
  fields: FlowField[]
  /** Orientacao de conteudo enviada a IA, em ingles curto. */
  brief: string
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
]

export const REALISM: FlowFieldOption[] = [
  { value: 'cinematografico', label: 'Cinematográfico (película, textura natural)' },
  { value: 'hiper', label: 'Hiper-realista (poros, reflexos, detalhes finos)' },
  { value: 'estilizado', label: 'Estilizado (cores fortes, acabamento limpo)' },
]

export const VIDEO_MODELS: FlowFieldOption[] = [
  { value: 'Omni 1.1 Flash', label: 'Omni 1.1 Flash' },
  { value: 'Veo 3.1 - Lite', label: 'Veo 3.1 Lite' },
  { value: 'Veo 3.1 - Fast', label: 'Veo 3.1 Fast' },
  { value: 'Veo 3.1 - Quality', label: 'Veo 3.1 Quality' },
]

export const TAKE_SECONDS = [4, 6, 8, 10]

/** Limite de palavras por take (cerca de 1,5 palavra por segundo, como nos apps de referencia). */
export function wordLimit(seconds: number): number {
  return Math.max(3, Math.floor(seconds * 1.5))
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

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'novelinha-dramatica',
    niche: 'Histórias',
    subniche: 'Novelinha dramática',
    name: 'Novelinha dramática',
    description: 'Mini novela com personagens que falam, gancho forte no primeiro take e virada no final.',
    mode: 'dialogo',
    fields: [
      {
        id: 'genero',
        label: 'Gênero',
        type: 'select',
        default: 'familiar',
        options: [
          { value: 'familiar', label: 'Drama familiar' },
          { value: 'superacao', label: 'Superação' },
          { value: 'roca', label: 'Vida no campo' },
          { value: 'comedia', label: 'Comédia popular' },
          { value: 'suspense', label: 'Suspense com virada' },
          { value: 'romance', label: 'Romance' },
        ],
      },
      {
        id: 'personagens',
        label: 'Personagens principais',
        type: 'select',
        default: '2',
        options: [
          { value: '2', label: '2 personagens' },
          { value: '3', label: '3 personagens' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'empatia', options: EMOTIONS },
    ],
    brief:
      'Short dramatic soap-opera story with adult characters. Take 1 is a strong hook. Conflict escalates, ends with a twist or emotional resolution.',
    defaults: { takes: 6, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'produto-tiktok-shop',
    niche: 'Vendas',
    subniche: 'Produto (TikTok Shop)',
    name: 'Vídeo de produto',
    description: 'Apresentação curta de um produto: unboxing, demonstração ou pessoa falando pra câmera.',
    mode: 'dialogo',
    fields: [
      { id: 'produto', label: 'Produto', type: 'text', default: '', placeholder: 'Ex.: garrafa térmica 1 litro' },
      {
        id: 'beneficios',
        label: 'Benefícios reais (um por linha)',
        type: 'textarea',
        default: '',
        placeholder: 'Só o que o produto realmente faz. Sem promessas de saúde ou resultado.',
      },
      {
        id: 'estilo',
        label: 'Estilo do vídeo',
        type: 'select',
        default: 'unboxing',
        options: [
          { value: 'unboxing', label: 'Unboxing' },
          { value: 'demonstracao', label: 'Demonstração de uso' },
          { value: 'apresentador', label: 'Pessoa falando pra câmera' },
        ],
      },
    ],
    brief:
      'Product showcase for social commerce. One presenter. Honest, specific benefits only. No health claims, no guaranteed results, no brand logos. Ends with a clear call to action.',
    defaults: { takes: 5, seconds: 6, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'historias-reais',
    niche: 'Curiosidades',
    subniche: 'Histórias e fatos narrados',
    name: 'História ou fato narrado',
    description: 'Um narrador conta uma história ou curiosidade sobre imagens cinematográficas.',
    mode: 'narracao',
    fields: [
      { id: 'assunto', label: 'Assunto', type: 'text', default: '', placeholder: 'Ex.: o faroleiro que ficou 40 anos na ilha' },
      {
        id: 'base',
        label: 'Base da história',
        type: 'select',
        default: 'ficcional',
        options: [
          { value: 'ficcional', label: 'Ficção inspirada em fatos' },
          { value: 'curiosidade', label: 'Curiosidade (sem inventar dados)' },
        ],
      },
      { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'surpresa', options: EMOTIONS },
    ],
    brief:
      'Narrated short. A single off-screen narrator tells the story; visuals illustrate it with no speaking on-screen characters. Do not invent statistics or real names; mark fiction as fiction.',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
  {
    id: 'animais-natureza',
    niche: 'Natureza',
    subniche: 'Animais e natureza (sem fala)',
    name: 'Animais e natureza',
    description: 'Cenas contemplativas ou fofas com som ambiente, sem fala.',
    mode: 'ambiente',
    fields: [
      { id: 'animal', label: 'Animal ou cenário', type: 'text', default: '', placeholder: 'Ex.: filhotes de raposa na neve' },
      {
        id: 'clima',
        label: 'Clima',
        type: 'select',
        default: 'relaxante',
        options: [
          { value: 'relaxante', label: 'Relaxante' },
          { value: 'fofo', label: 'Fofo' },
          { value: 'epico', label: 'Épico' },
        ],
      },
    ],
    brief:
      'Wordless nature or animal clips with rich natural ambient sound. No dialogue, no narration. Each take is a distinct, beautiful moment with consistent subject and location.',
    defaults: { takes: 6, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
  },
]

export function getFlowTemplate(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id)
}

export function templateFieldDefaults(t: FlowTemplate): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of [...COMMON_FIELDS, ...t.fields]) out[f.id] = f.default
  return out
}
