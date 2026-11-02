// Templates da aba Flow. Os tipos e listas comuns ficam em flow-template-base.ts e o catalogo de formatos
// em flow-template-catalog.ts; aqui ficam o modo Livre e as funcoes de acesso.

import { COMMON_FIELDS, EMOTIONS, type FlowTemplate } from './flow-template-base'
import { FLOW_TEMPLATE_CATALOG } from './flow-template-catalog'

export * from './flow-template-base'

/**
 * Modo Livre: o usuario monta o video como quiser (dentro dos limites do Flow). Pode colar um roteiro
 * pronto, descrever a ideia ou comecar em branco e escrever take por take; cada take escolhe se tem fala,
 * narracao ou so ambiente.
 */
export const FLOW_FREE_TEMPLATE: FlowTemplate = {
  id: 'livre',
  niche: 'Livre',
  subniche: 'Monte do seu jeito',
  name: 'Livre (monte do seu jeito)',
  description: 'Você decide tudo: cole um roteiro pronto, descreva a ideia ou comece em branco e escreva take por take.',
  mode: 'livre',
  length: 'curto',
  trend: 'atemporal',
  fields: [
    {
      id: 'roteiro',
      label: 'Roteiro pronto (opcional)',
      type: 'textarea',
      default: '',
      placeholder: 'Cole aqui o seu roteiro. As falas serão mantidas como você escreveu; a IA só divide em takes e descreve as cenas.',
    },
    {
      id: 'tipo',
      label: 'Tipo de fala principal',
      type: 'select',
      default: 'misto',
      options: [
        { value: 'misto', label: 'A IA decide por take' },
        { value: 'dialogo', label: 'Personagens falando' },
        { value: 'narracao', label: 'Narrador' },
        { value: 'ambiente', label: 'Sem fala' },
      ],
    },
    { id: 'emocao', label: 'Emoção principal', type: 'select', default: 'curiosidade', options: EMOTIONS },
  ],
  brief:
    "Follow the user's idea or script faithfully. If a script is provided, keep its spoken lines verbatim and in order, split them into takes and write the visuals. Fill only what the user did not specify.",
  beats: [
    { fn: 'Hook: the strongest moment or line of the idea, in the first seconds', camera: 'close-up or medium close-up' },
    { fn: 'Development', camera: 'vary the framing from take to take' },
    { fn: 'Turn or peak moment', camera: 'push-in or dramatic angle' },
    { fn: 'Payoff', camera: 'wide or close-up, as the story needs' },
  ],
  defaults: { takes: 5, seconds: 8, aspect: '9:16', model: 'Omni 1.1 Flash', quality: '360p' },
}

export const FLOW_TEMPLATES: FlowTemplate[] = [FLOW_FREE_TEMPLATE, ...FLOW_TEMPLATE_CATALOG]

export function getFlowTemplate(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id)
}

export function templateFieldDefaults(t: FlowTemplate): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of [...COMMON_FIELDS, ...t.fields]) out[f.id] = f.default
  return out
}
