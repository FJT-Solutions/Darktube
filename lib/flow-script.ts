// Parte pura (sem banco): monta o pedido para a IA, le e confere a resposta e monta o prompt final de cada take.
// O prompt final e montado aqui, e nao pela IA, para garantir sempre o mesmo formato (consistencia
// de personagem e cenario, camera motivada, audio limpo e nenhum texto na imagem).

import { FlowTemplate, wordLimit, LANGUAGES, EMOTIONS, REALISM, REALISM_PROMPT, MAX_TAKES, TAKE_SECONDS } from './flow-templates'

export type FlowTakeKind = 'dialogo' | 'narracao' | 'ambiente'

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
  castSheetUrl?: string
  castSheetStatus?: 'gerando' | 'aguardando' | 'aprovada'
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

/** Tipo efetivo do take: no modo Livre cada take decide; nos demais vale o modo do template. */
export function takeKind(take: FlowTake, mode: FlowTemplate['mode']): FlowTakeKind {
  if (mode !== 'livre') return mode
  return take.kind === 'narracao' || take.kind === 'ambiente' ? take.kind : 'dialogo'
}

const SCHEMA = `{
  "title": "string",
  "logline": "one sentence",
  "characters": [{"id": "c1", "name": "string", "description": "fixed visual anchor in English, 25-35 words: apparent age, skin tone, face, exact hair color and cut, build, full outfit with colors and fabrics", "voice": "accent, timbre and delivery in English"}],
  "locations": [{"id": "l1", "name": "string", "description": "full visual description in English: place, time of day, light sources, textures"}],
  "takes": [{"n": 1, "beat": "scene function", "kind": "dialogo | narracao | ambiente", "seconds": 8, "speaker": "character id, narrator or empty", "line": "spoken line or empty", "action": "ONE concrete physical action in English, with the object it touches and the facial expression", "camera": "shot type, lens and movement in English", "location": "location id", "characters": ["visible character ids"], "sound": "specific foley and ambience in English"}],
  "seo": {"title": "string", "caption": "string", "hook": "engagement question", "hashtags": ["#tag"]}
}`

// Palavras que fazem o modelo de video escrever letras na imagem.
const TEXT_TRIGGERS = /\b(tiktok|reels?|shorts?|subtitles?|captions?|title card|signs?|signage|billboards?|newspapers?|headlines?|ui|hud|logos?|text|letters|written|typing on screen|phone screen|screen showing)\b/i

export function buildSystemPrompt(t: FlowTemplate, params: FlowParams): string {
  const takes = Number(params.takes) || t.defaults.takes
  const seconds = Number(params.seconds) || t.defaults.seconds
  const lang = languageLabel(String(params.idioma || 'pt-BR'))
  const limit = wordLimit(seconds)
  const freeKind = String(params.tipo || 'misto')
  const mode = t.mode === 'livre' && freeKind !== 'misto' ? (freeKind as FlowTakeKind) : t.mode

  const modeRules =
    mode === 'dialogo'
      ? `Characters speak on screen with lip-sync. Each take has exactly ONE speaker (shot / reverse-shot: never two people talking in the same take) and one line of at most ${limit} words. Set "kind" to "dialogo".`
      : mode === 'narracao'
        ? `A single off-screen narrator tells the story. On-screen people never speak (mouths closed). Set "kind" to "narracao", "speaker" to "narrator" and write one narration line of at most ${limit} words per take.`
        : mode === 'ambiente'
          ? `There is no speech at all. Set "kind" to "ambiente", "speaker" and "line" to "" in every take. Describe rich, specific foley in "sound".`
          : `Choose per take: "dialogo" (one on-screen speaker, lip-sync, at most ${limit} words), "narracao" (off-screen narrator, at most ${limit} words) or "ambiente" (no speech). Never two speakers in the same take.`

  const beats = t.beats.map((b, i) => `  ${i + 1}. ${b.fn} — camera: ${b.camera}`).join('\n')
  const extra = t.fields
    .map((f) => `${f.label}: ${String(params[f.id] ?? f.default).trim()}`)
    .filter((l) => !l.endsWith(':'))
    .join('\n')
  const emotion = EMOTIONS.find((e) => e.value === params.emocao)?.label
  const realism = REALISM.find((r) => r.value === params.realismo)?.label
  const userScript = String(params.roteiro || '').trim()

  return `You are a senior screenwriter and director for AI-generated videos (Google Veo). Reply with ONE JSON object and nothing else, matching this schema:
${SCHEMA}

Structure:
- Write exactly ${takes} takes, each ${seconds} seconds long, numbered from 1.
- Scene functions for this format, in order (if there are more takes than functions, treat them as acts and escalate the middle; if fewer, merge neighbours). Put the function in "beat":
${beats}
${(t.rules || []).map((r) => `- ${r}`).join('\n')}

Writing rules (avoid generic "AI slop"):
- Take 1 opens in media res with a visual hook in the first 1.5 seconds; never open with greetings or encyclopedic sentences ("Did you know...").
- Every take shows ONE concrete physical action tied to its line: a specific object, texture and verb. No vague b-roll.
- Vary the camera on purpose from take to take (close-up, over-the-shoulder, low angle, tracking...). Use the camera of the scene function.
- Spoken lines are natural and short, with contractions and pauses; respect the word limit (about 2.3 words per second).
- The last take pays off and, when it fits, its line connects back to the first line so the video can loop.
- ${modeRules}
- Character descriptions are fixed anchors of 25-35 words; never change a character's look between takes. Every take names its location id and visible characters.
- Never describe on-screen writing: no screens with text, signs, newspapers, labels, logos or interfaces.
- Spoken lines and the SEO block are written in ${lang}. Everything else (descriptions, actions, camera, sound) is in English.
- Safety: fictional everyday people only (no real or famous people, no look-alikes), no brands or logos, no minors in danger, no medical or financial promises, no hate or humiliation of any group.
- Content guidance: ${t.brief}
${t.look ? `- Visual look of the format: ${t.look}\n` : ''}${userScript ? `- The user provided a script: keep its spoken lines verbatim and in the same order, split them across the takes and write the visuals. Do not add lines that are not in it.\n` : ''}
Project data:
Template: ${t.name}
${emotion ? `Main emotion: ${emotion}\n` : ''}${realism ? `Visual realism: ${realism}\n` : ''}${extra}
User idea: ${String(params.tema || '').trim() || '(none: propose an original, specific idea)'}${userScript ? `\nUser script:\n${userScript.slice(0, 6000)}` : ''}`
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
  const takes: FlowTake[] = (Array.isArray(raw?.takes) ? raw.takes : []).slice(0, MAX_TAKES).map((k: any, i: number) => {
    // No modo Livre cada take pode ter a propria duracao e o proprio tipo.
    const sec = Number(k?.seconds)
    const seconds = t.mode === 'livre' && TAKE_SECONDS.includes(sec) ? sec : baseSeconds
    const kindRaw = str(k?.kind, 12) as FlowTakeKind
    const kind: FlowTakeKind | undefined = t.mode === 'livre' ? (KINDS.includes(kindRaw) ? kindRaw : 'dialogo') : undefined
    const eff = takeKind({ kind } as FlowTake, t.mode)
    return {
      n: i + 1,
      seconds,
      speaker: eff === 'ambiente' ? '' : str(k?.speaker, 20) || (eff === 'narracao' ? 'narrator' : ''),
      line: eff === 'ambiente' ? '' : str(k?.line, 400),
      action: str(k?.action, 600),
      location: str(k?.location, 20) || locations[0]?.id || '',
      characters: Array.isArray(k?.characters) ? k.characters.map((x: any) => str(x, 20)).filter(Boolean) : [],
      sound: str(k?.sound, 240),
      camera: str(k?.camera, 200),
      beat: str(k?.beat, 160),
      ...(kind ? { kind } : {}),
    }
  })
  if (takes.length === 0) throw new Error('A IA não devolveu nenhum take.')
  const seo = raw?.seo || {}
  const castSheetUrl = str(raw?.castSheetUrl, 300)
  const castSheetStatus = parseSheetStatus(raw?.castSheetStatus)
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
    if (w < 12) issues.push({ level: lvl('erro'), message: `Character "${c.name}" needs a fixed visual anchor of 25-35 words (has ${w}).` })
  }
  for (const k of script.takes) {
    const kind = takeKind(k, t.mode)
    const limit = wordLimit(k.seconds)
    const words = countWords(k.line)
    if (kind !== 'ambiente' && words === 0) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} has no spoken line.` })
    if (words > limit) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} line has ${words} words; the limit for ${k.seconds}s is ${limit}.` })
    if (kind === 'dialogo' && k.speaker && !charIds.has(k.speaker)) issues.push({ take: k.n, level: lvl('erro'), message: `Take ${k.n} speaker "${k.speaker}" is not a defined character.` })
    if (kind === 'dialogo' && k.speaker && !k.characters.includes(k.speaker)) k.characters.push(k.speaker)
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

/** Pedido de correcao enviado a IA quando a conferencia encontra erros. */
export function buildRepairPrompt(script: FlowScript, issues: ScriptIssue[]): string {
  return `Your JSON broke these rules. Fix ONLY these problems, keep everything else identical, and reply with the full corrected JSON object only:
${issues.map((i) => `- ${i.message}`).join('\n')}

Current JSON:
${JSON.stringify(script)}`
}

/** Texto que fecha todo prompt: cena limpa, sem texto, sem musica inventada, personagens ficticios. */
const CLEAN =
  'Pure cinematography, clean frame: no on-screen text, no subtitles, no captions, no name or age labels, no watermarks, no logos, no UI overlays. Fictional original characters, everyday ordinary people, not based on any real or famous person.'

const NEGATIVE =
  'white background, blank studio backdrop, plain backdrop, floating characters, text overlays, subtitles, captions, name labels, age labels, written names, any text or letters in the image, watermark, logos, background music'

/** Prompt final de um take no formato de 6 blocos que o Veo entende melhor (direcao em ingles, fala no idioma). */
export function buildTakePrompt(script: FlowScript, take: FlowTake, params: FlowParams, mode: FlowTemplate['mode']): string {
  const total = script.takes.length
  const aspect = String(params.aspect || '9:16')
  const lang = languageLabel(String(params.idioma || 'pt-BR'))
  const look = REALISM_PROMPT[String(params.realismo || '')] || 'cinematic 35mm film look, natural skin texture'
  const loc = script.locations.find((l) => l.id === take.location) ?? script.locations[0]
  const visible = script.characters.filter((c) => take.characters.includes(c.id))
  const speaker = script.characters.find((c) => c.id === take.speaker)
  const kind = takeKind(take, mode)

  const lines: string[] = []
  // A primeira linha comeca com "[Scene N of M]": a extensao usa isso para conferir o take no Flow.
  lines.push(
    `[Scene ${take.n} of ${total}] ${take.seconds} seconds, ${aspect === '16:9' ? 'horizontal 16:9' : 'vertical 9:16'}. Camera: ${take.camera || 'cinematic framing with motivated, subtle camera movement'}.`
  )
  if (visible.length) {
    lines.push(
      `[Characters (fictional, original, not based on any real or famous person; keep identical in every scene)]: ${visible
        .map((c) => `${c.name}, who looks like this: ${c.description}`)
        .join(' | ')}`
    )
  }
  let act = take.action.trim()
  if (act && !/[.!?]$/.test(act)) act += '.'
  if (kind === 'dialogo' && take.line) {
    const who = speaker?.name ?? 'The character'
    act += ` ${who} says in ${lang}${speaker?.voice ? ` in a ${speaker.voice} voice` : ''}: "${take.line}" Natural lip-sync, only ${who} speaks.`
  } else if (kind === 'narracao') {
    act += ' Nobody on screen speaks; mouths stay closed.'
  }
  lines.push(`[Action & Dialogue]: ${act}`)
  if (loc) lines.push(`[Environment & Lighting]: ${loc.description}`)
  const speech =
    kind === 'dialogo' && take.line
      ? 'clear natural voice of the speaker'
      : kind === 'narracao' && take.line
        ? `off-screen voiceover narration in ${lang}: "${take.line}"`
        : 'no speech'
  lines.push(`[Audio]: native audio, ${speech}; ${take.sound || 'subtle natural ambience'}; no background music.`)
  if (visible.length) {
    lines.push('[Background Override]: place the characters inside the environment described above; ignore any plain or white background from reference images.')
  }
  lines.push(`[Style & Constraints]: ${look}, consistent lighting and color across scenes. ${CLEAN}`)
  lines.push(`[Negative Prompt]: ${NEGATIVE}`)
  // Simbolos de moeda costumam derrubar a geracao no Flow: escreve por extenso.
  return lines.join('\n').replace(/R\$\s?([\d.,]+)/g, '$1 reais').replace(/[$€£]/g, ' ')
}

/** Texto completo para baixar ou copiar. */
export function exportScriptText(script: FlowScript, params: FlowParams, mode: FlowTemplate['mode']): string {
  const out: string[] = [`${script.title}`, script.logline, '']
  for (const k of script.takes) {
    out.push(`===== TAKE ${k.n} (${k.seconds}s)${k.beat ? ` · ${k.beat}` : ''} =====`)
    if (k.line) out.push(`Fala: ${k.line}`)
    out.push(buildTakePrompt(script, k, params, mode), '')
  }
  out.push('===== SEO =====', `Título: ${script.seo.title}`, `Legenda: ${script.seo.caption}`, `Gancho: ${script.seo.hook}`, `Hashtags: ${script.seo.hashtags.join(' ')}`)
  return out.join('\n')
}

/**
 * Versao do prompt para nova tentativa apos recusa por politica ("prominent people"): troca SO o estilo
 * (hiper-realismo de pele/rosto e o que mais aciona o filtro) e reforca que os personagens sao ficticios.
 * Personagens, cenario, acao, fala e som ficam identicos, para a cena continuar encaixando com a anterior e a seguinte.
 */
export function softenFlowPrompt(prompt: string): string {
  const soft = 'cinematic film look, natural soft lighting, consistent lighting and color across scenes; fictional characters only.'
  return prompt
    .split('\n')
    .map((l) => {
      if (l.startsWith('[Global Style & Realism]:')) return `[Global Style & Realism]: ${soft}`
      if (l.startsWith('[Style & Constraints]:')) return `[Style & Constraints]: ${soft} ${CLEAN}`
      if (l.startsWith('[Characters (keep identical in every scene)]:')) {
        return l.replace('[Characters (keep identical in every scene)]:', '[Characters (fictional, original, not based on any real or famous person; keep identical in every scene)]:')
      }
      return l
    })
    .join('\n')
}

/**
 * Referencias de um take (o Flow aceita 1 imagem e 1 video por take): com 1 personagem visivel, a folha dele;
 * com 2 ou mais, a folha do elenco (ou, sem ela, a folha de quem fala). So folhas aprovadas.
 * Devolve tambem a linha que avisa o modelo no prompt.
 */
export function takeReference(script: FlowScript, take: FlowTake, params: FlowParams): { refImageUrl?: string; refPrevVideo?: boolean; promptLine?: string } {
  const out: { refImageUrl?: string; refPrevVideo?: boolean; promptLine?: string } = {}
  if (String(params.refImages ?? '1') !== '0') {
    const isVoiceOnly = (c: FlowCharacter) => /^(narrador|narrator|voz|voice|locutor)\b/i.test(c.name || '') || /invisible voice|no visual features|off-screen voice|sem corpo|apenas voz|voz invis[ií]vel/i.test(c.description || '')
    const visible = script.characters.filter((c) => take.characters.includes(c.id) && !isVoiceOnly(c))
    const ok = (c?: FlowCharacter) => (c && c.sheetStatus === 'aprovada' && c.sheetUrl ? c.sheetUrl : undefined)
    if (visible.length === 1 && ok(visible[0])) {
      out.refImageUrl = ok(visible[0])
      out.promptLine = `[Reference Image]: the attached image is the character reference portrait of ${visible[0].name}; keep ${visible[0].name}'s facial features, hair, skin tone and outfit identical to the person in the reference portrait. Ignore its plain background.`
    } else if (visible.length > 1 && script.castSheetStatus === 'aprovada' && script.castSheetUrl) {
      out.refImageUrl = script.castSheetUrl
      const order = script.characters.filter((c) => visible.includes(c)).map((c) => c.name).join(', ')
      out.promptLine = `[Reference Image]: the attached image shows the cast from left to right (${script.characters.map((c) => c.name).join(', ')}); in this scene appear ${order}. Keep their faces, hair and outfits exactly as in it. Ignore its plain background and layout.`
    } else if (visible.length > 1) {
      const sp = script.characters.find((c) => c.id === take.speaker)
      if (ok(sp)) {
        out.refImageUrl = ok(sp)
        out.promptLine = `[Reference Image]: the attached image is the reference portrait of ${sp!.name}; keep ${sp!.name}'s face, hair and outfit identical to the reference portrait.`
      }
    }
  }
  if (String(params.refPrevVideo ?? '0') === '1' && take.n > 1) out.refPrevVideo = true
  return out
}
