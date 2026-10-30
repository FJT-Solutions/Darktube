// Parte pura (sem banco): monta o pedido para a IA, le a resposta e monta o prompt final de cada take.
// O prompt final e montado aqui, e nao pela IA, para garantir sempre o mesmo formato (consistencia
// de personagem e cenario, e a regra do fundo branco).

import { FlowTemplate, wordLimit, LANGUAGES, EMOTIONS, REALISM } from './flow-templates'

export interface FlowCharacter {
  id: string
  name: string
  /** Descricao visual fixa, em ingles. */
  description: string
  /** Sotaque e timbre, em ingles curto. */
  voice: string
}

export interface FlowLocation {
  id: string
  name: string
  description: string
}

export interface FlowTake {
  n: number
  seconds: number
  /** Id do personagem que fala ("narrator" em modo narracao, "" em ambiente). */
  speaker: string
  /** Fala no idioma escolhido ("" em ambiente). */
  line: string
  /** Acao e enquadramento, em ingles. */
  action: string
  location: string
  /** Ids dos personagens visiveis neste take. */
  characters: string[]
  /** Som ambiente, em ingles curto. */
  sound: string
}

export interface FlowSeo {
  title: string
  caption: string
  hook: string
  hashtags: string[]
}

export interface FlowScript {
  title: string
  logline: string
  characters: FlowCharacter[]
  locations: FlowLocation[]
  takes: FlowTake[]
  seo: FlowSeo
}

export interface FlowParams {
  [key: string]: string | number
}

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code
}

export function countWords(text: string): number {
  return (text || '').trim().split(/\s+/).filter(Boolean).length
}

export function takeOverLimit(take: FlowTake): boolean {
  return countWords(take.line) > wordLimit(take.seconds)
}

const SCHEMA = `{
  "title": "string",
  "logline": "one sentence",
  "characters": [{"id": "c1", "name": "string", "description": "fixed physical description in English: age, face, hair, build, outfit", "voice": "accent and timbre in English"}],
  "locations": [{"id": "l1", "name": "string", "description": "full visual description in English of the place"}],
  "takes": [{"n": 1, "seconds": 6, "speaker": "character id", "line": "spoken line", "action": "action and camera in English", "location": "location id", "characters": ["character ids visible"], "sound": "ambient sound in English"}],
  "seo": {"title": "string", "caption": "string", "hook": "engagement question", "hashtags": ["#tag"]}
}`

export function buildSystemPrompt(t: FlowTemplate, params: FlowParams): string {
  const takes = Number(params.takes) || t.defaults.takes
  const seconds = Number(params.seconds) || t.defaults.seconds
  const lang = languageLabel(String(params.idioma || 'pt-BR'))
  const limit = wordLimit(seconds)

  const modeRules =
    t.mode === 'dialogo'
      ? `Characters speak on screen. Each take has exactly one speaker and one short line of at most ${limit} words. Use only the characters you define.`
      : t.mode === 'narracao'
        ? `A single off-screen narrator reads the story. Define no on-screen characters (characters array may be empty). Set "speaker" to "narrator" and write one narration line of at most ${limit} words per take.`
        : `There is no speech at all. Set "speaker" to "" and "line" to "" in every take. Describe rich natural sound in "sound".`

  const extra = t.fields
    .map((f) => `${f.label}: ${params[f.id] ?? f.default}`)
    .filter((l) => !l.endsWith(': '))
    .join('\n')

  const emotion = EMOTIONS.find((e) => e.value === params.emocao)?.label
  const realism = REALISM.find((r) => r.value === params.realismo)?.label

  return `You are a screenwriter for short vertical AI videos. Reply with ONE JSON object and nothing else, matching this schema:
${SCHEMA}

Rules:
- Write exactly ${takes} takes, each ${seconds} seconds long (numbered from 1).
- Spoken lines and the SEO block are written in ${lang}. Everything else (descriptions, actions, sound) is in English.
- ${modeRules}
- Take 1 is a strong hook. The last take closes the story.
- Character descriptions are fixed: never change a character's look between takes. Every take names its location id and the visible characters.
- Safety: no real people, no brands or logos, no minors in danger, no medical or financial promises, no hate or humiliation of any group.
- Content guidance: ${t.brief}

Project data:
Template: ${t.name}
${emotion ? `Main emotion: ${emotion}\n` : ''}${realism ? `Visual realism: ${realism}\n` : ''}${extra}
User idea: ${String(params.tema || '').trim() || '(none: propose an original idea)'}`
}

export function extractJson(text: string): any {
  let s = (text || '').trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b === -1) throw new Error('A IA não devolveu um JSON válido.')
  return JSON.parse(s.slice(a, b + 1))
}

const str = (v: any, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Normaliza a resposta da IA para o formato interno, sem confiar em nada. */
export function normalizeScript(raw: any, t: FlowTemplate, params: FlowParams): FlowScript {
  const seconds = Number(params.seconds) || t.defaults.seconds
  const characters: FlowCharacter[] = (Array.isArray(raw?.characters) ? raw.characters : [])
    .slice(0, 6)
    .map((c: any, i: number) => ({
      id: str(c?.id, 20) || `c${i + 1}`,
      name: str(c?.name, 60) || `Personagem ${i + 1}`,
      description: str(c?.description, 500),
      voice: str(c?.voice, 120),
    }))
  const locations: FlowLocation[] = (Array.isArray(raw?.locations) ? raw.locations : [])
    .slice(0, 8)
    .map((l: any, i: number) => ({
      id: str(l?.id, 20) || `l${i + 1}`,
      name: str(l?.name, 60) || `Local ${i + 1}`,
      description: str(l?.description, 600),
    }))
  const takes: FlowTake[] = (Array.isArray(raw?.takes) ? raw.takes : []).slice(0, 80).map((k: any, i: number) => ({
    n: i + 1,
    seconds,
    speaker: t.mode === 'ambiente' ? '' : str(k?.speaker, 20) || (t.mode === 'narracao' ? 'narrator' : ''),
    line: t.mode === 'ambiente' ? '' : str(k?.line, 400),
    action: str(k?.action, 600),
    location: str(k?.location, 20) || locations[0]?.id || '',
    characters: Array.isArray(k?.characters) ? k.characters.map((x: any) => str(x, 20)).filter(Boolean) : [],
    sound: str(k?.sound, 200),
  }))
  if (takes.length === 0) throw new Error('A IA não devolveu nenhum take.')
  const seo = raw?.seo || {}
  return {
    title: str(raw?.title, 120) || t.name,
    logline: str(raw?.logline, 300),
    characters,
    locations,
    takes,
    seo: {
      title: str(seo.title, 120),
      caption: str(seo.caption, 600),
      hook: str(seo.hook, 300),
      hashtags: (Array.isArray(seo.hashtags) ? seo.hashtags : [])
        .map((h: any) => str(h, 40))
        .filter(Boolean)
        .slice(0, 15),
    },
  }
}

const NEGATIVE =
  'white background, blank studio backdrop, plain backdrop, floating characters, text overlays, subtitles, watermark, logos'

/** Prompt final de um take, no formato que o Flow recebe. */
export function buildTakePrompt(script: FlowScript, take: FlowTake, params: FlowParams, mode: FlowTemplate['mode']): string {
  const total = script.takes.length
  const aspect = String(params.aspect || '9:16')
  const lang = languageLabel(String(params.idioma || 'pt-BR'))
  const realism = REALISM.find((r) => r.value === params.realismo)?.label ?? 'cinematic'
  const loc = script.locations.find((l) => l.id === take.location) ?? script.locations[0]
  const visible = script.characters.filter((c) => take.characters.includes(c.id))
  const speaker = script.characters.find((c) => c.id === take.speaker)

  const lines: string[] = []
  lines.push(`[Scene ${take.n} of ${total}] ${take.seconds} seconds, ${aspect === '16:9' ? 'horizontal 16:9' : 'vertical 9:16'}.`)
  if (visible.length) {
    lines.push(`[Characters (keep identical in every scene)]: ${visible.map((c) => `${c.name}: ${c.description}`).join(' | ')}`)
  }
  if (loc) lines.push(`[Environment & Scene Setting]: ${loc.description}`)
  lines.push(`[Action & Camera]: ${take.action}`)
  if (mode === 'dialogo' && take.line) {
    const who = speaker?.name ?? 'The character'
    lines.push(`[Dialogue]: ${who} says in ${lang}: "${take.line}"${speaker?.voice ? ` Voice: ${speaker.voice}.` : ''} Natural lip-sync.`)
  } else if (mode === 'narracao' && take.line) {
    lines.push(`[Voice-over]: A calm narrator says in ${lang}: "${take.line}" (off-screen, no on-screen speaker).`)
  }
  lines.push(`[Audio]: native audio. ${take.sound || 'subtle natural ambience'}.${mode === 'ambiente' ? ' No speech.' : ''}`)
  if (visible.length) {
    lines.push('[Background Override]: place the characters inside the environment described above; ignore any plain or white background from reference images.')
  }
  lines.push(`[Global Style & Realism]: ${realism}, consistent lighting and color across scenes.`)
  lines.push(`[Negative Prompt]: ${NEGATIVE}`)
  return lines.join('\n')
}

/** Texto completo para baixar ou copiar. */
export function exportScriptText(script: FlowScript, params: FlowParams, mode: FlowTemplate['mode']): string {
  const out: string[] = [`${script.title}`, script.logline, '']
  for (const k of script.takes) {
    out.push(`===== TAKE ${k.n} (${k.seconds}s) =====`)
    if (k.line) out.push(`Fala: ${k.line}`)
    out.push(buildTakePrompt(script, k, params, mode), '')
  }
  out.push('===== SEO =====', `Título: ${script.seo.title}`, `Legenda: ${script.seo.caption}`, `Gancho: ${script.seo.hook}`, `Hashtags: ${script.seo.hashtags.join(' ')}`)
  return out.join('\n')
}
