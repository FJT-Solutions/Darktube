// Parte pura (sem banco): monta o pedido para a IA, le e confere a resposta e monta o prompt final de cada take.
// O prompt final e montado aqui, e nao pela IA, para garantir sempre o mesmo formato (consistencia
// de personagem e cenario, camera motivada, audio limpo e nenhum texto na imagem).

import { policyReason } from './flow-failure'
import { FlowTemplate, wordLimit, LANGUAGES, LANGUAGE_PROMPT, EMOTIONS, REALISM, REALISM_PROMPT, MAX_TAKES, TAKE_SECONDS, allowedSecondsForModel, clampSecondsForModel, resolveTakeModel, VIDEO_MODELS } from './flow-templates'

export type FlowTakeKind = 'dialogo' | 'narracao' | 'ambiente'

export const FLOW_TRANSITIONS = ['cut', 'white_flash', 'whip_pan', 'zoom_punch', 'crossfade', 'glitch'] as const
export type FlowTransition = (typeof FLOW_TRANSITIONS)[number]

export const FLOW_SFX = ['whoosh', 'camera_click', 'bass_drop', 'paper_rustle', 'pop', 'none'] as const
export type FlowSfx = (typeof FLOW_SFX)[number]

export const FLOW_MEDIA_TYPES = ['ai_flow', 'stock_asset', 'screenshot'] as const
export type FlowMediaType = (typeof FLOW_MEDIA_TYPES)[number]

export interface FlowCharacter {
  id: string
  name: string
  /** Descricao visual fixa (ancora), em ingles: idade aparente, rosto, cabelo, corpo, roupa. */
  description: string
  /** Sotaque e timbre, em ingles curto. */
  voice: string
  sheetUrl?: string
  sheetStatus?: 'gerando' | 'aguardando' | 'aprovada'
  libraryId?: string
}

export interface FlowLocation {
  id: string
  name: string
  description: string
}

export interface FlowTake {
  n: number
  seconds: number
  /** Modelo de video especifico deste take (ex: Veo 3.1 - Quality para dialogos, Veo 3.1 - Lite para objetos/b-roll). */
  model?: string
  /** Id do personagem que fala ("narrator" em narracao, "" em ambiente). */
  speaker: string
  /** Fala no idioma escolhido ("" em ambiente). */
  line: string
  /** Acao fisica concreta da cena, em ingles. */
  action: string
  location: string
  /** Ids dos personagens visiveis neste take. */
  characters: string[]
  /** Som da cena (foley e ambiente), em ingles curto. */
  sound: string
  /** Plano e movimento de camera, em ingles. */
  camera?: string
  /** Funcao narrativa (gancho, virada, payoff...). */
  beat?: string
  /** So no modo Livre: tipo do take (sem isso vale o modo do template). */
  kind?: FlowTakeKind
  /** Efeito de transição de corte para a próxima cena (compilado pelo Remotion). */
  transition?: FlowTransition
  /** Efeito sonoro (SFX) acoplado ao corte. */
  sfx?: FlowSfx
  /** Tipo de mídia deste take: IA gerada pelo Flow ou acervo real da internet. */
  mediaType?: FlowMediaType
  /** URL ou caminho do asset de acervo real quando mediaType !== 'ai_flow'. */
  assetUrl?: string
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
  /** Voz fixa do narrador (em ingles), repetida em todo take narrado para nao mudar de voz entre takes. */
  narratorVoice?: string
  castSheetUrl?: string
  castSheetStatus?: 'gerando' | 'aguardando' | 'aprovada'
}

export interface FlowParams {
  [key: string]: string | number | boolean | undefined
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

/** Tipo efetivo do take: no modo Livre cada take decide; nos demais vale o modo do template. */
export function takeKind(take: FlowTake, mode: FlowTemplate['mode']): FlowTakeKind {
  if (mode !== 'livre') return mode
  return take.kind === 'narracao' || take.kind === 'ambiente' ? take.kind : 'dialogo'
}

const SCHEMA = `{
  "title": "string",
  "logline": "one sentence",
  "characters": [{"id": "c1", "name": "string", "description": "fixed visual anchor in English, 25-35 words, starting with the age range in words (e.g. 'adult woman in her early thirties'): skin tone, face, exact hair color and cut, build (average, athletic, broad or heavyset), full outfit with colors and fabrics", "voice": "accent, timbre and delivery in English"}],
  "narratorVoice": "only when there is narration: one fixed narrator voice in English (gender, age range, timbre, pacing), used in every narrated take",
  "locations": [{"id": "l1", "name": "string", "description": "full visual description in English: place, time of day, light sources, textures"}],
  "takes": [{"n": 1, "beat": "scene function", "kind": "dialogo | narracao | ambiente", "seconds": 8, "speaker": "character id, narrator or empty", "line": "spoken line or empty", "action": "ONE concrete physical action in English, with the object it touches and the facial expression", "camera": "shot type, lens and movement in English", "location": "location id", "characters": ["visible character ids"], "sound": "specific foley and ambience in English", "transition": "cut | white_flash | whip_pan | zoom_punch | crossfade | glitch", "sfx": "whoosh | camera_click | bass_drop | paper_rustle | pop | none", "mediaType": "ai_flow | stock_asset"}],
  "seo": {"title": "string", "caption": "string", "hook": "engagement question", "hashtags": ["#tag"]}
}`

// Palavras que fazem o modelo de video escrever letras na imagem.
const TEXT_TRIGGERS = /\b(tiktok|reels?|shorts?|subtitles?|captions?|title card|signs?|signage|billboards?|newspapers?|headlines?|ui|hud|logos?|text|letters|written|typing on screen|phone screen|screen showing)\b/i

// Palavras na descricao de pessoas que fazem o Flow recusar por "conteudo envolvendo menores".
const MINOR_WORDS = /\b(child(ren)?|kids?|boys?|girls?|teen(age|ager)?s?|minors?|petite|slender|skinny)\b/i

/** Personagem que so existe como voz (narrador, locutor): nao aparece na imagem nem recebe referencia. */
export function isVoiceOnly(c: FlowCharacter): boolean {
  return (
    /^(narrador|narrator|voz|voice|voiceover|locutor)\b/i.test(c.name || '') ||
    /invisible voice|no visual features|off-screen voice|sem corpo|apenas voz|voz invis[ií]vel|voz em off/i.test(c.description || '')
  )
}

/** Idioma da fala em ingles ("Brazilian Portuguese, with a natural Brazilian accent"), para o prompt do Flow. */
export function spokenLanguage(code: string): string {
  return LANGUAGE_PROMPT[code] ?? languageLabel(code)
}

const DECADES: Record<number, string> = { 2: 'twenties', 3: 'thirties', 4: 'forties', 5: 'fifties', 6: 'sixties', 7: 'seventies', 8: 'eighties', 9: 'nineties' }

/**
 * Troca idade em numero ("apparent age 32") por faixa adulta por extenso ("adult in their early thirties"):
 * deixa claro para o filtro do Flow que a pessoa e adulta. Idades abaixo de 20 ficam como estao.
 */
export function adultAge(text: string): string {
  const words = (n: number) => {
    const d = DECADES[Math.floor(n / 10)]
    if (!d || n < 20) return ''
    return `${n % 10 <= 3 ? 'early' : n % 10 <= 6 ? 'mid' : 'late'} ${d}`
  }
  return String(text || '')
    .replace(/\b(an?)\s+(\d{2})[- ]years?[- ]old\s+(woman|man|person|lady|gentleman)\b/gi, (m, _a, n, who) =>
      words(Number(n)) ? `an adult ${who} in their ${words(Number(n))}` : m
    )
    .replace(/\b(?:apparent(?:ly)?\s+)?aged?\s*:?\s*(?:about|around|approximately|~)?\s*(\d{2})\b(?:\s*(?:years?\s+old|y\/?o))?/gi, (m, n) =>
      words(Number(n)) ? `adult in their ${words(Number(n))}` : m
    )
}

/**
 * Descricao de pessoa pronta para o filtro de menores do Flow: idade por extenso e sem palavras de crianca ou de corpo
 * pequeno ("slender build" vira "average build", "girl" vira "woman"). Vale ja na primeira tentativa.
 */
export function adultWording(text: string): string {
  return adultAge(text)
    .replace(/\b(?:petite|slender|slim|skinny|thin|delicate|small|tiny)\s+(build|frame|figure|body)\b/gi, 'average $1')
    .replace(/\b(?:young|youthful|teenage|girlish|boyish)\s+/gi, '')
    .replace(/\bgirls?\b/gi, (m) => (/s$/i.test(m) ? 'women' : 'woman'))
    .replace(/\bboys?\b/gi, (m) => (/s$/i.test(m) ? 'men' : 'man'))
}

/** Camera do take sem pontuacao final e sem citar outros takes (cada take e gerado sozinho no Flow). */
export function cleanCamera(text: string): string {
  return String(text || '')
    .replace(/\s*,?\s*\b(?:matching|mirroring|same as|identical to|like|as in)\s+(?:the\s+)?(?:exact\s+)?(?:geometry\s+of\s+)?(?:the\s+)?(?:first|previous|opening|last)?\s*(?:take|scene|shot)\b(?:\s*\d+)?/gi, '')
    .replace(/\b(?:slow\s+)?(?:tilt|pan|cut|zoom)\s*(?:-|\s*)?(?:up|away|over|to)\s*(?:the\s+)?(?:chandelier|ceiling|floor|empty\s+wall|roof|lamp)\b/gi, 'medium close-up on character expression')
    .replace(/[\s.;,]+$/, '')
    .trim()
}

/** Estilo visual do take: o estilo escolhido (realismo) e a cara do template, sem textura de pele quando nao ha pessoas. */
function styleFor(t: FlowTemplate | undefined, params: FlowParams, hasPeople: boolean): string {
  const realismo = String(params.realismo || '')
  const realism = REALISM_PROMPT[realismo] || ''
  // Template estilizado (2D, 3D...) com estilo escolhido: a cara do template repete o mesmo estilo ou contradiz a escolha.
  const look = t?.look && !(t.defaults.realismo && realismo) ? t.look : ''
  let s = [realism, look].filter(Boolean).join('; ') || 'cinematic 35mm film look, motivated natural lighting'
  if (!hasPeople) s = s.replace(/,?\s*(?:natural|realistic)\s+skin\s+(?:texture|detail)/gi, '')
  return s.replace(/\s+/g, ' ').replace(/^[\s,;]+|[\s,;.]+$/g, '')
}

const noEnd = (s: string) => String(s || '').trim().replace(/[\s.;,]+$/, '')

export function buildSystemPrompt(t: FlowTemplate, params: FlowParams): string {
  const takes = Number(params.takes) || t.defaults.takes
  const seconds = Number(params.seconds) || t.defaults.seconds
  const lang = languageLabel(String(params.idioma || 'pt-BR'))
  const baseModel = String(params.model || t.defaults.model || 'Omni 1.2 Flash')
  const allowedSecs = allowedSecondsForModel(baseModel)
  const limit = wordLimit(seconds)
  const freeKind = String(params.tipo || 'misto')
  const mode = t.mode === 'livre' && freeKind !== 'misto' ? (freeKind as FlowTakeKind) : t.mode

  const modeRules =
    mode === 'dialogo'
      ? `Characters speak on screen with lip-sync. Each take has exactly ONE speaker (shot / reverse-shot: never two people talking in the same take) and one line of at most ${limit} words. Set "kind" to "dialogo".`
      : mode === 'narracao'
        ? `A single off-screen narrator tells the story. On-screen people never speak (mouths closed). Set "kind" to "narracao", "speaker" to "narrator" and write one narration line of at most ${limit} words per take. Define "narratorVoice" once.`
        : mode === 'ambiente'
          ? `There is no speech at all. Set "kind" to "ambiente", "speaker" and "line" to "" in every take. Describe rich, specific foley in "sound".`
          : `Choose per take: "dialogo" (one on-screen speaker, lip-sync, at most ${limit} words), "narracao" (off-screen narrator, at most ${limit} words) or "ambiente" (no speech). Never two speakers in the same take. If any take is "narracao", define "narratorVoice" once.`

  const beats = t.beats.map((b, i) => `  ${i + 1}. ${b.fn} — camera: ${b.camera}`).join('\n')
  const extra = t.fields
    .map((f) => `${f.label}: ${String(params[f.id] ?? f.default).trim()}`)
    .filter((l) => !l.endsWith(':'))
    .join('\n')
  const emotion = EMOTIONS.find((e) => e.value === params.emocao)?.label
  const realism = REALISM.find((r) => r.value === params.realismo)?.label
  const userScript = String(params.roteiro || '').trim()
  const part = Number(params.parte) || 1
  const prevPart = String(params.parteAnterior || '').trim()
  const series =
    part > 1 && prevPart
      ? `\nSeries: this is PART ${part} of a series of short videos. Previous part:\n${prevPart.slice(0, 6000)}\nSeries rules:\n- Reuse the same characters with the same ids, names, descriptions and voices, the same "narratorVoice" and the same locations while the story stays there; add new characters only if the story needs them.\n- Take 1 opens with a one-line recap hook in ${lang} that a new viewer understands, then the story continues exactly where the previous part ended. Do not repeat events already shown.\n- The last take ends on a cliffhanger that sets up part ${part + 1}; its line invites the viewer to the next part.\n- The title keeps the series name and ends with "Parte ${part}" (in ${lang}).\n`
      : ''

  return `You are a senior screenwriter and director for AI-generated videos (Google Flow: Veo and Omni video models). Reply with ONE JSON object and nothing else, matching this schema:
${SCHEMA}

Structure:
- Write exactly ${takes} takes, numbered from 1.
- Dynamic Take Rhythm: each take specifies its own "seconds" chosen from [${allowedSecs.join(', ')}] based on narrative pacing (valid durations for this model family: ${allowedSecs.join(', ')}s; e.g. shorter takes for punchy hooks/CTA, longer takes for key transformations or dialogue). The overall target duration is approximately ${takes * seconds} seconds total.
- Dynamic Visual Editing & Transitions: for each take, assign a specific cut transition to the next scene ("cut", "white_flash", "whip_pan", "zoom_punch", "crossfade", "glitch") and an accompanying audio SFX ("whoosh", "camera_click", "bass_drop", "paper_rustle", "pop", "none") to maximize viewer retention in Remotion compilation. Hooks and key twists use white_flash or zoom_punch with whoosh or bass_drop; product/ingredient reveals use camera_click; culinary uses crossfade; dynamic shifts use whip_pan.
- Scene functions for this format, in order (if there are more takes than functions, treat them as acts and escalate the middle; if fewer, merge neighbours). Put the function in "beat":
${beats}
${(t.rules || []).map((r) => `- ${r}`).join('\n')}

Writing rules (avoid generic "AI slop"):
- Take 1 opens in media res with a visual hook in the first 1.5 seconds; never open with greetings or encyclopedic sentences ("Did you know...").
- Every take shows ONE concrete physical action tied to its line: a specific object, texture and verb. No vague b-roll.
- "line" holds ONLY words that are spoken aloud, never a description of the action ("A hand slices a tomato" belongs in "action"). A take with no speech and no narration gets an empty "line".
- Spatial coherence: NEVER place an exterior vehicle, street arrival or outdoor event inside an interior room. If characters see a vehicle or visitor arriving, the action must be looking through a window/doorway, OR switch to an exterior location id. The setting must physically match the action.
- Camera framing for dialogue: when characters speak, use shot / reverse-shot with alternating Over-The-Shoulder (OTS) or medium close-ups. STRICTLY PROHIBIT neutral b-roll: NEVER direct the camera away from the actors to film ceilings, chandeliers, walls, floors, empty furniture, or distant decor during a scene. Every shot must frame the face and expressions of the actors.
- Eye-line and 4th wall: characters in dramatic scenes must NEVER look directly into the camera lens (no breaking the fourth wall like a vlog or documentary interview). They must always look slightly off-center toward their dialogue partner across the 180-degree axis.
- Immediate speech delivery: the character starts speaking immediately at the very start of the shot (second 0.1), coupled with an immediate physical micro-action (clenching a fist, stepping closer, holding up an object). Never leave the first 3 seconds silent waiting for speech.
- Grounded dialogue and conflict (no empty melodrama): dialogue must involve concrete nouns and tangible stakes (e.g. a forged document, a failed business, missing money, a named relative, a hidden key, inheritance debts). Prohibit vague, context-free clichés ("you don't know half of what I know", "this car... it cannot be", "the truth is about to appear", "who are you?"). Each line must logically answer or escalate the previous line with real substance.
- Temporary props: items like glasses, documents, phones or keys must be handled and released within the action. Never add temporary props to a character's fixed visual description.
- The takes form ONE continuous story in order: each take starts from the exact state the previous one ended (same positions, props, wardrobe, injuries or stains, time of day and weather); lines read as one sequence, never a new topic. A change of location needs a visible reason in the action.
- Each take is generated on its own, as ONE continuous shot with no cuts: one main action and one camera move. Never refer to other takes ("same as take 1", "continues", "as before"); restate the framing instead.
- Vary the camera on purpose from take to take (close-up, over-the-shoulder, low angle, tracking...). Use the camera of the scene function.
- Spoken lines are natural and short, with contractions and pauses; respect the word limit (about 2.3 words per second). Write numbers and money in words as they are spoken, never with currency symbols.
- The last take pays off and, when it fits, its line connects back to the first line so the video can loop.
- Strict motion discipline & anti-hallucination: describe ONLY ONE restrained, physically plausible movement per take. NEVER use vague, open-ended or kinetic descriptions ("things move around", "energy swirls", "characters gesture wildly") which cause video diffusion models (Veo/Omni) to hallucinate unprompted object sliding, morphing or extra limbs. Unmoved objects, surfaces, props and cookware must remain strictly stationary and anchored.
- Negative constraints compliance: never introduce unscripted background people, extra characters, morphing items, floating hands, or unmotivated camera drifting.
- ${modeRules}
- Character descriptions are fixed anchors of 25-35 words; never change a character's look between takes. Every take names its location id and visible characters.
- Never describe on-screen writing: no screens with text, signs, newspapers, labels, logos or interfaces.
- Spoken lines and the SEO block are written in ${lang}. Everything else (descriptions, actions, camera, sound) is in English.
- Safety: fictional everyday people only (no real or famous people, no look-alikes), no brands or logos, no medical or financial promises, no hate or humiliation of any group.
- Everyone on screen is an adult, with the age range written in words. Never use child or teen words (child, kid, boy, girl, teen, young) or body words such as petite, slender, skinny or tiny: the video platform refuses them. Children's formats use animal, toy or object protagonists.
- Takes without characters are object-only scenes: do not mention people, faces, skin or ages in them (at most anonymous gloved hands when the action needs them).
- At most 2 characters visible per take (one speaker and one listener); crowds stay anonymous and out of focus in the background.
- The action must fit the take length with simple, physically plausible motion: no multi-step choreography, no fast cuts, no transformations of people.
- No copyrighted characters, franchises, celebrities or brand names; no weapons aimed at people, no blood, no injuries, no nudity or intimacy (the video platform refuses them). Suspense comes from light, sound and expressions.
- Content guidance: ${t.brief}
${t.look ? `- Visual look of the format: ${t.look}\n` : ''}${userScript ? `- The user provided a script: keep its spoken lines verbatim and in the same order, split them across the takes and write the visuals. Do not add lines that are not in it.\n` : ''}
Project data:
Template: ${t.name}
${emotion ? `Main emotion: ${emotion}\n` : ''}${realism ? `Visual realism: ${realism}\n` : ''}${extra}
User idea: ${String(params.tema || '').trim() || '(none: propose an original, specific idea)'}${userScript ? `\nUser script:\n${userScript.slice(0, 6000)}` : ''}${series}`
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
const KINDS: FlowTakeKind[] = ['dialogo', 'narracao', 'ambiente']
const SHEET_STATUSES = ['gerando', 'aguardando', 'aprovada'] as const
const parseSheetStatus = (v: any): 'gerando' | 'aguardando' | 'aprovada' | undefined =>
  SHEET_STATUSES.includes(v) ? v : undefined

/** Normaliza a resposta da IA (ou o roteiro editado) para o formato interno, sem confiar em nada. */
export function normalizeScript(raw: any, t: FlowTemplate, params: FlowParams): FlowScript {
  const baseModel = String(params.model || t.defaults.model || 'Omni 1.2 Flash')
  const allowedSecs = allowedSecondsForModel(baseModel)
  const baseSeconds = Number(params.seconds) || t.defaults.seconds
  const characters: FlowCharacter[] = (Array.isArray(raw?.characters) ? raw.characters : [])
    .slice(0, 8)
    .map((c: any, i: number) => {
      const sheetUrl = str(c?.sheetUrl, 300)
      const sheetStatus = parseSheetStatus(c?.sheetStatus)
      const libraryId = str(c?.libraryId, 60)
      return {
        id: str(c?.id, 20) || `c${i + 1}`,
        name: str(c?.name, 60) || `Personagem ${i + 1}`,
        description: str(c?.description, 500),
        voice: str(c?.voice, 160),
        ...(sheetUrl ? { sheetUrl } : {}),
        ...(sheetStatus ? { sheetStatus } : {}),
        ...(libraryId ? { libraryId } : {}),
      }
    })
  const locations: FlowLocation[] = (Array.isArray(raw?.locations) ? raw.locations : [])
    .slice(0, 12)
    .map((l: any, i: number) => ({
      id: str(l?.id, 20) || `l${i + 1}`,
      name: str(l?.name, 60) || `Local ${i + 1}`,
      description: str(l?.description, 600),
    }))
  // A IA as vezes poe a descricao da cena no campo de fala de takes sem personagem; isso vira narracao errada.
  const looksLikeActionText = (text: string, k: any): boolean => {
    if (!text.trim() || str(k?.speaker, 20) || (Array.isArray(k?.characters) && k.characters.length > 0)) return false
    return /^(uma?|o|a|os|as)\s+(m[aã]os?|prato|panela|faca|c[aâ]mera|airfryer|forno)\b/i.test(text.trim()) ||
      /^(an?|the)\s+(gloved\s+)?(hands?|dish|pan|knife|camera)\b/i.test(text.trim())
  }
  const takes: FlowTake[] = (Array.isArray(raw?.takes) ? raw.takes : []).slice(0, MAX_TAKES).map((k: any, i: number) => {
    // No modo Livre cada take pode ter a propria duracao e o proprio tipo.
    const sec = Number(k?.seconds)
    const rawModel = str(k?.model, 40)
    const validModel = VIDEO_MODELS.some((m) => m.value === rawModel) ? rawModel : undefined
    const chars = Array.isArray(k?.characters) ? k.characters.map((x: any) => str(x, 20)).filter(Boolean) : []
    const lineText = str(k?.line, 400)
    const spk = str(k?.speaker, 20)
    const baseModel = String(params.model || t.defaults.model || 'Omni 1.2 Flash')
    const hasSubject = chars.length > 0 || Boolean(lineText.trim()) || Boolean(spk)
    const isHybrid = params.isHybrid !== false && params.isHybrid !== 'false'
    const effModel = isHybrid ? (validModel || resolveTakeModel(baseModel, hasSubject)) : baseModel
    const allowed = allowedSecondsForModel(effModel)
    const seconds = allowed.includes(sec) ? sec : clampSecondsForModel(sec || baseSeconds, effModel)
    const kindRaw = str(k?.kind, 12) as FlowTakeKind
    const kind: FlowTakeKind | undefined = t.mode === 'livre' ? (KINDS.includes(kindRaw) ? kindRaw : 'dialogo') : undefined
    const eff = takeKind({ kind } as FlowTake, t.mode)
    const rawTransition = str(k?.transition, 30)
    const transition: FlowTransition = (FLOW_TRANSITIONS as readonly string[]).includes(rawTransition)
      ? (rawTransition as FlowTransition)
      : 'cut'
    const rawSfx = str(k?.sfx, 30)
    const sfx: FlowSfx = (FLOW_SFX as readonly string[]).includes(rawSfx)
      ? (rawSfx as FlowSfx)
      : 'none'
    const rawMediaType = str(k?.mediaType, 30)
    const mediaType: FlowMediaType = (FLOW_MEDIA_TYPES as readonly string[]).includes(rawMediaType)
      ? (rawMediaType as FlowMediaType)
      : 'ai_flow'
    const assetUrl = str(k?.assetUrl, 500)

    return {
      n: i + 1,
      seconds,
      model: effModel,
      speaker: eff === 'ambiente' ? '' : str(k?.speaker, 20) || (eff === 'narracao' ? 'narrator' : ''),
      line: eff === 'ambiente' || looksLikeActionText(lineText, k) ? '' : lineText,
      action: str(k?.action, 600),
      location: str(k?.location, 20) || locations[0]?.id || '',
      characters: Array.isArray(k?.characters) ? k.characters.map((x: any) => str(x, 20)).filter(Boolean) : [],
      sound: str(k?.sound, 240),
      camera: str(k?.camera, 200),
      beat: str(k?.beat, 160),
      transition,
      sfx,
      mediaType,
      ...(assetUrl ? { assetUrl } : {}),
      ...(kind ? { kind } : {}),
    }
  })
  if (takes.length === 0) throw new Error('A IA não devolveu nenhum take.')
  const seo = raw?.seo || {}
  const castSheetUrl = str(raw?.castSheetUrl, 300)
  const castSheetStatus = parseSheetStatus(raw?.castSheetStatus)
  const narratorVoice = str(raw?.narratorVoice, 200) || str(raw?.narrator?.voice, 200)
  return {
    title: str(raw?.title, 120) || t.name,
    logline: str(raw?.logline, 300),
    characters,
    locations,
    takes,
    ...(narratorVoice ? { narratorVoice } : {}),
    seo: {
      title: str(seo.title, 120),
      caption: str(seo.caption, 600),
      hook: str(seo.hook, 300),
      hashtags: (Array.isArray(seo.hashtags) ? seo.hashtags : [])
        .map((h: any) => str(h, 40))
        .filter(Boolean)
        .slice(0, 15),
    },
    ...(castSheetUrl ? { castSheetUrl } : {}),
    ...(castSheetStatus ? { castSheetStatus } : {}),
  }
}

export interface ScriptIssue {
  take?: number
  /** 'erro' pede correcao a IA; 'aviso' so aparece na tela. */
  level: 'erro' | 'aviso'
  message: string
}

/**
 * Confere o roteiro contra as regras do formato. Os erros voltam para a IA corrigir uma vez;
 * os avisos aparecem para o usuario (no modo Livre tudo vira aviso).
 */
export function validateScript(script: FlowScript, t: FlowTemplate, params: FlowParams): ScriptIssue[] {
  const issues: ScriptIssue[] = []
  const want = Number(params.takes) || t.defaults.takes
  const soft = t.mode === 'livre'
  const lvl = (l: 'erro' | 'aviso') => (soft ? 'aviso' : l)
  if (script.takes.length !== want) issues.push({ level: lvl('erro'), message: `Expected ${want} takes, got ${script.takes.length}.` })
  const charIds = new Set(script.characters.map((c) => c.id))
  const locIds = new Set(script.locations.map((l) => l.id))
  for (const c of script.characters) {
    const w = countWords(c.description)
    if (w < 12 && !isVoiceOnly(c)) issues.push({ level: lvl('erro'), message: `Character "${c.name}" needs a fixed visual anchor of 25-35 words (has ${w}).` })
    const risky = c.description.match(MINOR_WORDS)
    if (risky) issues.push({ level: lvl('erro'), message: `Character "${c.name}" uses "${risky[0]}"; describe an adult with the age range in words and a neutral build (the video platform refuses it).` })
  }
  for (const k of script.takes) {
    const kind = takeKind(k, t.mode)
    const limit = wordLimit(k.seconds)
    const words = countWords(k.line)
    if (kind !== 'ambiente' && words === 0) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} has no spoken line.` })
    if (words > limit) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} line has ${words} words; the limit for ${k.seconds}s is ${limit}.` })
    if (kind === 'dialogo' && k.speaker && !charIds.has(k.speaker)) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} speaker "${k.speaker}" is not a defined character.` })
    if (kind === 'dialogo' && k.speaker && !k.characters.includes(k.speaker)) k.characters.push(k.speaker)
    const onScreen = script.characters.filter((c) => k.characters.includes(c.id) && !isVoiceOnly(c)).length
    if (onScreen > 2) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} shows ${onScreen} characters; keep at most 2 visible per take.` })
    if (k.location && locIds.size && !locIds.has(k.location)) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} uses unknown location "${k.location}".` })
    if (countWords(k.action) < 5) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} needs one concrete physical action (object, verb, expression).` })
    const visual = `${k.action} ${k.camera || ''}`
    const hit = visual.match(TEXT_TRIGGERS)
    if (hit) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} mentions "${hit[0]}", which makes the video model write on screen; describe it without written words.` })
  }
  const first = script.takes[0]?.line || ''
  if (/^(ol[aá]|oi|hello|hi|hey|voc[eê] sabia|did you know|hoje vamos|today we)/i.test(first.trim())) {
    issues.push({ take: 1, level: lvl('erro'), message: 'Take 1 opens with a greeting or encyclopedic sentence; open in media res with a hook.' })
  }
  return issues
}

/** Resumo da parte anterior que vai para a IA ao criar a proxima parte (personagens, cenarios e o que aconteceu). */
export function summarizeForNextPart(script: FlowScript): string {
  const chars = script.characters.map((c) => `- ${c.id} ${c.name}: ${c.description} (voice: ${c.voice || '-'})`).join('\n')
  const locs = script.locations.map((l) => `- ${l.id} ${l.name}: ${l.description}`).join('\n')
  const takes = script.takes.map((k) => `${k.n}. ${clipWords(k.action, 25)}${k.line ? ` | "${k.line}"` : ''}`).join('\n')
  return `Title: ${script.title}\nLogline: ${script.logline}\n${script.narratorVoice ? `narratorVoice: ${script.narratorVoice}\n` : ''}Characters:\n${chars || '- none'}\nLocations:\n${locs || '- none'}\nWhat happened, take by take:\n${takes}\nThe part ended on take ${script.takes.length}.`
}

/**
 * Leva para a nova parte o que ja foi aprovado na anterior: retrato, biblioteca e voz de cada personagem
 * reaproveitado (mesmo id ou mesmo nome), a folha do elenco quando o elenco e o mesmo e a voz do narrador.
 */
export function carryOverPart(prev: FlowScript, next: FlowScript): FlowScript {
  const key = (s: string) => s.trim().toLowerCase()
  const characters = next.characters.map((c) => {
    const old = prev.characters.find((p) => p.id === c.id) ?? prev.characters.find((p) => key(p.name) === key(c.name))
    if (!old) return c
    return { ...c, description: old.description, voice: c.voice || old.voice, sheetUrl: old.sheetUrl, sheetStatus: old.sheetStatus, libraryId: old.libraryId }
  })
  const sameCast = characters.length === prev.characters.length && characters.every((c) => prev.characters.some((p) => p.id === c.id))
  return {
    ...next,
    characters,
    narratorVoice: next.narratorVoice || prev.narratorVoice,
    ...(sameCast && prev.castSheetUrl ? { castSheetUrl: prev.castSheetUrl, castSheetStatus: prev.castSheetStatus } : {}),
  }
}

/** Pedido de correcao enviado a IA quando a conferencia encontra erros. */
export function buildRepairPrompt(script: FlowScript, issues: ScriptIssue[]): string {
  return `Your JSON broke these rules. Fix ONLY these problems, keep everything else identical, and reply with the full corrected JSON object only:
${issues.map((i) => `- ${i.message}`).join('\n')}

Current JSON:
${JSON.stringify(script)}`
}

/** Ultima linha de todo prompt: o modelo de video costuma escrever legenda quando ha fala. */
const CLEAN_FRAME = 'Clean frame: no subtitles, captions, on-screen text, logos or watermarks.'

const NARRATOR_VOICE = 'warm, clear adult narrator voice with steady storytelling pacing'

/** Referencias que vao anexadas ao take (vem de takeReference). */
export interface TakeRef {
  refImageUrl?: string
  refPrevVideo?: boolean
  /** Linha avulsa sobre a referencia (formato antigo, anexada no fim do prompt). */
  promptLine?: string
  /** 'portrait': retrato de um personagem | 'cast': folha do elenco. */
  refKind?: 'portrait' | 'cast'
  /** Personagem do retrato (refKind 'portrait'). */
  refCharacterId?: string
}

/**
 * Prompt final de um take, na ordem que o Veo e o Omni seguem melhor: formato e estilo, camera, quem aparece,
 * a acao, a fala, o cenario e o som, cada um em uma frase propria. Direcao em ingles, fala no idioma escolhido.
 * Pessoas, idade e "nao e pessoa real" so aparecem quando ha personagem na cena (em cena so de objetos esse texto
 * fazia o Flow recusar por politica). A referencia anexada e citada junto do personagem que ela mostra.
 * `t` aceita o template inteiro (usa a cara visual dele) ou so o modo, como antes.
 */
export function buildTakePrompt(
  script: FlowScript,
  take: FlowTake,
  params: FlowParams,
  t: FlowTemplate | FlowTemplate['mode'],
  ref?: TakeRef
): string {
  const tpl = typeof t === 'string' ? undefined : t
  const mode = typeof t === 'string' ? t : t.mode
  const total = script.takes.length
  const aspect = String(params.aspect || '9:16')
  const lang = spokenLanguage(String(params.idioma || 'pt-BR'))
  const loc = script.locations.find((l) => l.id === take.location) ?? script.locations[0]
  const visible = script.characters.filter((c) => take.characters.includes(c.id) && !isVoiceOnly(c))
  const speaker = script.characters.find((c) => c.id === take.speaker)
  const kind = takeKind(take, mode)
  const hasRef = !!ref?.refImageUrl
  const style = styleFor(tpl, params, visible.length > 0)

  // Nivel de compactacao: 0 completo; 1 sem a linha de continuidade e com quem nao fala resumido;
  // 2 tambem resume cenario e estilo; 3 tambem resume quem fala. So passa de 0 quando o prompt estoura o limite.
  const compose = (level: number): string => {
    const lines: string[] = []
    // A primeira linha comeca com "[Scene N of M]": identifica o take na galeria do Flow.
    lines.push(
      `[Scene ${take.n} of ${total}] ${take.seconds}-second ${aspect === '16:9' ? 'horizontal 16:9' : 'vertical 9:16'} video, one continuous shot. Visual style: ${level >= 2 ? clipWords(style, 25) : style}.`
    )
    lines.push(`Camera: ${cleanCamera(take.camera || '') || 'cinematic framing with one subtle, motivated camera move'}.`)
    if (visible.length) {
      const cast =
        hasRef && ref?.refKind === 'cast'
          ? `the attached reference image shows the cast from left to right (${script.characters
              .filter((c) => !isVoiceOnly(c))
              .map((c) => c.name)
              .join(', ')}), keep their faces, hair and outfits exactly as in it; `
          : ''
      const who = visible
        .map((c) => {
          const inRef = hasRef && ref?.refKind === 'portrait' && ref.refCharacterId === c.id
          const max = level >= 3 ? 18 : level >= 1 && c.id !== take.speaker ? 15 : 0
          const desc = noEnd(adultWording(c.description))
          return `${c.name}${inRef ? ' (the person in the attached reference image: same face, hair, skin tone and outfit)' : ''}: ${max ? clipWords(desc, max) : desc}`
        })
        .join('; ')
      lines.push(`Subject (fictional adults, not based on any real or famous person): ${cast}${who}.`)
    }
    lines.push(`Action: ${stripOnScreenText(noEnd(take.action))}.`)
    // O take anterior ancora a continuidade (posicao, objetos, expressao) sem citar "take N", que o modelo nao conhece.
    const prev = script.takes.find((k) => k.n === take.n - 1)
    if (prev?.action && level <= 1) lines.push(`This shot picks up right after: ${clipWords(noEnd(prev.action), 22)}.`)
    // Take sem ninguem na imagem (so maos e comida) nao tem boca para dublar: a fala vira narracao fora da tela, em vez de
    // "speaks... lip-sync" contra "no faces", que se contradizem.
    const offscreenLine = kind === 'dialogo' && !!take.line && visible.length === 0
    if (offscreenLine) {
      lines.push(`Narration: an off-screen narrator (${noEnd(script.narratorVoice || NARRATOR_VOICE)}) says in ${lang}: ${noEnd(take.line)}.`)
    } else if (kind === 'dialogo' && take.line) {
      const name = speaker?.name ?? 'The character'
      // Expert sobre fundo chroma key fala para a lente; no dialogo comum o olhar vai para o interlocutor, fora do centro.
      const gaze = tpl?.lookAtCamera || params.olharCamera === true || params.olharCamera === 'true'
        ? `looking straight into the camera lens from the first frame to the last, eyes locked on the lens, head and body facing forward and still, never turning or glancing away`
        : `looking at the conversation partner off-center and never looking directly into the camera lens`
      lines.push(`Dialogue: ${name}${speaker?.voice ? ` (voice: ${noEnd(speaker.voice)})` : ''} speaks right from the start in ${lang}: "${noEnd(take.line)}". Only ${name} speaks, with precise lip-sync, ${gaze}.`)
    } else if (kind === 'narracao' && take.line) {
      lines.push(
        `Narration: an off-screen narrator (${noEnd(script.narratorVoice || NARRATOR_VOICE)}) says in ${lang}: ${noEnd(take.line)}.${visible.length ? ' Nobody on screen speaks; mouths stay closed.' : ''}`
      )
    }
    if (loc) lines.push(`Setting: ${level >= 2 ? clipWords(noEnd(loc.description), 30) : noEnd(loc.description)}.`)
    lines.push(`Sound: ${noEnd(take.sound || 'subtle natural ambience')}.${kind === 'ambiente' || !take.line ? ' No speech.' : ''} No background music.`)
    if (hasRef && visible.length === 0) lines.push('Use the reference image only for kitchen, props and lighting continuity: do not render any person from it.')
    else if (hasRef) lines.push('Use the reference image only for identity: ignore its plain backdrop and place everyone inside the setting above.')
    if (total > 1 && level === 0) lines.push(`Continuity: same ${visible.length ? 'characters, outfits, ' : ''}setting, lighting and color grading as the other scenes of this video.`)
    const hasHandsInAction = /\b(hands?|fingers?|grasp(?:ing|s)?|hold(?:ing|s)?|pour(?:ing|s)?|stir(?:ring|s)?|knead(?:ing|s)?|slic(?:ing|es)?|pull(?:ing|s)?|open(?:ing|s)?|clos(?:ing|es)?|plac(?:ing|es)?|touch(?:ing|es)?)\b/i.test(take.action)
    if (visible.length > 0) {
      lines.push(
        level >= 2
          ? 'Negative constraints: no unprompted motion, no extra people, no deformed limbs, static background stays stable.'
          : 'Negative constraints: no unprompted character wandering or sudden erratic gestures, no random extra people or bystanders, no deformed anatomy, no floating or extra fingers, no morphing objects. Static environment and props stay strictly stable and stationary.'
      )
    } else if (hasHandsInAction) {
      lines.push(
        level >= 2
          ? 'Negative constraints: no telekinesis or autonomous appliance opening, no faces, no floating hands, no extra fingers, no morphing appliances.'
          : 'Negative constraints: no telekinesis, ghost movement or appliances opening by themselves without a hand firmly grasping the handle; no faces, no full human bodies, no extra bystanders; no disconnected or floating hands, no extra or mutated fingers, no backward-bending joints, no hand-orientation flipping between cuts; appliances and cookware must never morph, change models, or show unprompted digital screen numbers or HUD icons.'
      )
    } else {
      lines.push(
        level >= 2
          ? 'Negative constraints: strictly no humans, no faces, no extra people, no warping or sliding objects, static items stay stable.'
          : 'Negative constraints: strictly no unscripted human figures, no faces, no random extra people, no floating hands. No unprompted object sliding, floating, morphing or warping. All tabletop items, surfaces, cookware and background props remain completely stationary and physically stable.'
      )
    }
    lines.push(CLEAN_FRAME)
    // Simbolos de moeda costumam derrubar a geracao no Flow: escreve por extenso.
    return lines.join('\n').replace(/R\$\s?([\d.,]+)/g, '$1 reais').replace(/[$€£]/g, ' ')
  }
  let out = compose(0)
  for (let level = 1; level <= 3 && out.length > MAX_PROMPT_CHARS; level++) out = compose(level)
  return out
}

/**
 * Tamanho maximo do prompt de um take. Prompt longo dilui a acao e o modelo passa a ignorar detalhes; acima disso
 * o take e compactado sozinho (ver compose em buildTakePrompt), sem o usuario precisar editar nada.
 */
export const MAX_PROMPT_CHARS = 2200

/** Primeiras `n` palavras do texto (sem cortar no meio da palavra). */
function clipWords(text: string, n: number): string {
  const w = String(text || '').trim().split(/\s+/)
  return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ').replace(/[\s,;:]+$/, '')
}

/** Texto completo para baixar ou copiar. */
export function exportScriptText(script: FlowScript, params: FlowParams, t: FlowTemplate | FlowTemplate['mode']): string {
  const out: string[] = [`${script.title}`, script.logline, '']
  for (const k of script.takes) {
    out.push(`===== TAKE ${k.n} (${k.seconds}s)${k.beat ? ` · ${k.beat}` : ''} =====`)
    if (k.line) out.push(`Fala: ${k.line}`)
    out.push(buildTakePrompt(script, k, params, t, takeReference(script, k, params)), '')
  }
  out.push('===== SEO =====', `Título: ${script.seo.title}`, `Legenda: ${script.seo.caption}`, `Gancho: ${script.seo.hook}`, `Hashtags: ${script.seo.hashtags.join(' ')}`)
  return out.join('\n')
}

/**
 * Texto escrito dentro da imagem (cartao, placa, legenda) e o que mais derruba take no filtro do Flow e o modelo ainda
 * erra a grafia; o texto entra na montagem com FFmpeg. Troca "card with 'RECEITA' in bold" por um cartao liso.
 */
export function stripOnScreenText(text: string): string {
  return String(text || '')
    .replace(/\b(card|sign|signboard|banner|board|label|poster|screen|tag|note)\s+(?:with|reading|saying|that says|showing|displaying)\s+(?:the (?:words?|text)\s+)?["'“‘][^"'”’\n]{1,60}["'”’](?:\s+(?:in|on)\s+[\w\s-]{0,25}?(?:letters|font|text|bold|print))?/gi, 'blank $1 with no writing')
    .replace(/\b(?:CTA|call-to-action) (card|sign|banner|board)\b/gi, 'blank plain $1 with no writing')
    .replace(/,?\s*(?:with\s+)?(?:bold |big |large |glowing |neon )?(?:on-screen |written |printed )?(?:text|words|letters|captions?|subtitles?|logos?|watermarks?) (?:overlay|appearing|reading|saying)[^,.]*/gi, '')
}

// Realismo de pele e rosto: o que mais aciona o filtro de "pessoa conhecida".
const PHOTO_STYLE = /photorealistic|hyper-?realistic|ultra-?realistic|realistic (?:lighting|skin)|fine natural detail|natural skin/i
const PHOTO_WORDS =/,?\s*\b(?:photorealistic|hyper-?realistic|ultra-?realistic|fine natural detail|(?:natural|realistic) skin (?:texture|detail)|sharp detailed facial features)\b/gi
const ADULTS_NOTE = 'Everyone shown is clearly an adult.'

/**
 * Versao do prompt para nova tentativa apos recusa por politica. Muda so o que o motivo da recusa aponta e mantem
 * personagens, cenario, acao, fala e som, para a cena continuar encaixando com a anterior e a seguinte.
 * - "minors": idade em numero vira faixa adulta por extenso, palavras de corpo pequeno saem, e cena sem personagem
 *   perde todo texto sobre pessoas e idade (prompts antigos tinham isso mesmo em cena so de objetos).
 * - "prominent people" ou 2a tentativa: tira o realismo de pele e rosto do estilo, mantendo o meio (2D, 3D...).
 * Sem motivo reconhecido, a 1a tentativa repete o prompt (o filtro do Flow varia de uma vez para outra).
 * Aplicar de novo no resultado nao muda nada.
 */
export function softenFlowPrompt(prompt: string, reason = '', attempt = 2): string {
  const minors = policyReason(reason) === 'minors'
  const famous = policyReason(reason) === 'famous'
  if (attempt < 2 && !minors && !famous) return stripOnScreenText(prompt)
  const style = famous || attempt >= 2
  const lines = String(prompt || '').split('\n')
  const hasPeople = lines.some((l) => l.startsWith('Subject') || l.startsWith('[Characters'))
  return lines
    .map((l) => {
      let x = stripOnScreenText(l)
      if (style && x.startsWith('[Scene')) {
        // Estilo com realismo de foto vira o estilo suave inteiro (tirar so as palavras deixava "Visual style:, realistic
        // lighting."); estilos 2D, 3D e massinha ficam como estao.
        x = x.replace(/Visual style:(.*)$/, (m, s) => (PHOTO_STYLE.test(s) ? 'Visual style: cinematic film look, natural soft lighting.' : m))
      } else if (style && x.startsWith('[Style & Constraints]:')) {
        x = x.replace(PHOTO_WORDS, '')
      }
      if (minors && (x.startsWith('Subject') || x.startsWith('[Characters'))) {
        x = adultWording(x)
        if (!x.includes(ADULTS_NOTE)) x = `${x.replace(/\s+$/, '')} ${ADULTS_NOTE}`
      }
      if (minors && !hasPeople) {
        // Formato antigo: o fecho falava de pessoas e idade mesmo em cena sem ninguem.
        x = x
          .replace(/\s*Fictional original characters, everyday ordinary people, not based on any real or famous person\./, '')
          .replace(/no name or age labels, /, '')
          .replace(/,?\s*(?:natural|realistic) skin (?:texture|detail)/gi, '')
          .replace(/floating characters, /, '')
          .replace(/name labels, age labels, written names, /, '')
      }
      return x
    })
    .join('\n')
}

/**
 * Ultima tentativa automatica depois de recusa por politica: pede a IA do projeto para reescrever so o que pode ter
 * acionado o filtro, mantendo a cena, a ordem das linhas e as falas palavra por palavra.
 */
export function buildPolicyRewritePrompt(prompt: string, reason: string): { system: string; user: string } {
  const system = `You fix prompts for Google Flow video models (Veo and Omni) that Google's safety filter refused. Reply with ONE JSON object only: {"prompt": "the rewritten prompt"}.
Rules:
- Keep the same scene: same lines in the same order with the same labels ("[Scene ...", "Camera:", "Subject", "Action:", "Dialogue:", "Narration:", "Setting:", "Sound:"...), same camera, setting, sound and story beat.
- Keep every spoken line inside double quotes exactly, word for word.
- Keep each character's identity anchors (hair, skin tone, outfit) and keep everyone clearly adult.
- Change only what could trigger the refusal: ages, body descriptions, physical closeness, violence, weapons, injuries, real or famous people, brands, logos, anything that could be read as involving minors.
- Remove any text, words or letters that must appear inside the image (cards, signs, labels, screens): use a plain blank object instead.
- Same length or shorter.`
  return { system, user: `Refusal reason: ${String(reason || 'policy').slice(0, 300)}\n\nPrompt:\n${prompt}` }
}

/** Aceita a reescrita da IA so se ela mantiver o formato do take e todas as falas entre aspas. */
export function acceptPolicyRewrite(original: string, raw: string): string | null {
  let text = ''
  try {
    text = String(extractJson(raw)?.prompt || '').trim()
  } catch {
    return null
  }
  if (!text.startsWith('[Scene') || text.length > Math.max(2600, original.length * 1.3)) return null
  const quotes = original.match(/"[^"\n]+"/g) || []
  if (quotes.some((q) => !text.includes(q))) return null
  // A fala (Dialogue/Narration) tem que voltar identica, linha inteira: a narracao nao vai entre aspas.
  const rewritten = text.split('\n').map((l) => l.trim())
  const spoken = original.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('Dialogue:') || l.startsWith('Narration:'))
  if (spoken.some((l) => !rewritten.includes(l))) return null
  return text
}

/**
 * Referencias de um take (o Flow aceita 1 imagem e 1 video por take): com 1 personagem visivel, a folha dele;
 * com 2 ou mais, a folha do elenco (ou, sem ela, a folha de quem fala). So folhas aprovadas.
 * Devolve tambem a linha que avisa o modelo no prompt.
 */
export function takeReference(script: FlowScript, take: FlowTake, params: FlowParams): TakeRef {
  const out: TakeRef = {}
  if (String(params.refImages ?? '1') !== '0') {
    const visible = script.characters.filter((c) => take.characters.includes(c.id) && !isVoiceOnly(c))
    const ok = (c?: FlowCharacter) => (c && c.sheetStatus === 'aprovada' && c.sheetUrl ? c.sheetUrl : undefined)
    if (visible.length === 1 && ok(visible[0])) {
      out.refImageUrl = ok(visible[0])
      out.refKind = 'portrait'
      out.refCharacterId = visible[0].id
      out.promptLine = `[Reference Image]: the attached image is the character reference portrait of ${visible[0].name}; keep ${visible[0].name}'s facial features, hair, skin tone and outfit identical to the person in the reference portrait. Ignore its plain background.`
    } else if (visible.length > 1 && script.castSheetStatus === 'aprovada' && script.castSheetUrl) {
      out.refImageUrl = script.castSheetUrl
      out.refKind = 'cast'
      const order = script.characters.filter((c) => visible.includes(c)).map((c) => c.name).join(', ')
      out.promptLine = `[Reference Image]: the attached image shows the cast from left to right (${script.characters.map((c) => c.name).join(', ')}); in this scene appear ${order}. Keep their faces, hair and outfits exactly as in it. Ignore its plain background and layout.`
    } else if (visible.length > 1) {
      const sp = script.characters.find((c) => c.id === take.speaker)
      if (ok(sp)) {
        out.refImageUrl = ok(sp)
        out.refKind = 'portrait'
        out.refCharacterId = sp!.id
        out.promptLine = `[Reference Image]: the attached image is the reference portrait of ${sp!.name}; keep ${sp!.name}'s face, hair and outfit identical to the reference portrait.`
      }
    }
  }
  if (String(params.refPrevVideo ?? '0') === '1' && take.n > 1) out.refPrevVideo = true
  return out
}
