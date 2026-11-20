// Montagem do video final de um projeto Flow: normaliza cada take, junta, gera a legenda (.srt)
// com a duracao real dos clipes e tenta queimar a legenda no video.
// Se a queima falhar (ffmpeg sem libass, por exemplo), entrega o video sem legenda e o .srt.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { pool } from '@/lib/db-client'
import { uploadMediaFile } from '@/lib/storage'
import { getFlowTemplate } from '@/lib/flow-templates'
import { getFlowProject, setFlowProjectAssembly } from '@/lib/flow-projects'
import { getUserApiKey } from '@/lib/database'
import type { FlowJob } from '@/lib/flow-jobs'
import { inspectRenderedVideo } from '@/lib/motion-checks'
import { formatDeliveryDuration } from '@/lib/render-timing'

const run = promisify(execFile)
export const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg'

export interface Cue {
  start: number
  end: number
  text: string
}

export function parseProbe(stderr: string): { duration: number; hasAudio: boolean } {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  const duration = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0
  return { duration, hasAudio: /Stream #\d+:\d+.*Audio:/.test(stderr) }
}

export function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000))
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`
}

/**
 * Limpa pontuacao solta, espacos duplicados, une palavras com hifen e aplica a
 * Regra Zero Simbolos pos-Whisper (converte R$/US$/% que o Whisper ITN abrevia de volta para extenso
 * e remove simbolos visuais proibidos como $, #, *, @, /, +, =).
 */
export function cleanCaptionText(text: string): string {
  return String(text || '')
    .replace(/R\$\s*(\d+(?:[.,]\d+)?)/gi, '$1 reais')
    .replace(/\bR\$/gi, 'reais')
    .replace(/US\$\s*(\d+(?:[.,]\d+)?)/gi, '$1 dólares')
    .replace(/\bUS\$/gi, 'dólares')
    .replace(/\$\s*(\d+(?:[.,]\d+)?)/g, '$1')
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1 por cento')
    .replace(/(\S)\s*\+\s*(\S)/g, '$1 mais $2')
    .replace(/[$€£%#*@&_=+<>|\\/\[\]{}()"“”‘’~^`]/g, ' ')
    .replace(/\s+([.,!?;:…])/g, '$1')
    .replace(/(\p{L}|\p{N})\s+-\s*(\p{L}|\p{N})/gu, '$1-$2')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quebra em ate duas linhas equilibradas (no espaco mais perto do meio), sem deixar palavra solta. */
export function wrapCaption(text: string, maxChars = 32): string {
  const t = cleanCaptionText(text)
  if (t.length <= maxChars) return t
  const mid = t.length / 2
  let best = -1
  for (let i = 0; i < t.length; i++) {
    if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  }
  return best < 0 ? t : t.slice(0, best) + '\n' + t.slice(best + 1)
}

export interface TimedWord {
  start: number
  end: number
  word: string
}

/**
 * Palavras com tempo da resposta verbose_json do Whisper. Descarta trechos que o proprio Whisper marca como
 * provavel nao-fala (musica/ruido costumam gerar texto inventado).
 */
export function wordsFromWhisper(json: any): TimedWord[] {
  const out: TimedWord[] = []
  const push = (w: any) => {
    const word = String(w?.word ?? '').trim()
    const start = Number(w?.start)
    const end = Number(w?.end)
    if (word && Number.isFinite(start) && Number.isFinite(end) && end >= start) out.push({ start, end, word })
  }
  // Se a API devolveu words direto no topo (padrao OpenAI verbose_json com timestamp_granularities[]=word):
  if (Array.isArray(json?.words) && json.words.length > 0) {
    for (const w of json.words) push(w)
    return out.sort((a, b) => a.start - b.start)
  }
  // Caso venha agrupado por segments:
  const segs: any[] = Array.isArray(json?.segments) ? json.segments : []
  if (segs.some((s) => Array.isArray(s?.words))) {
    for (const s of segs) {
      if (Number(s?.no_speech_prob ?? 0) > 0.8) continue
      for (const w of s.words || []) push(w)
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

/**
 * O Whisper costuma esticar a primeira palavra de um trecho para tras (engole a musica/silencio antes dela)
 * e a ultima para frente. Limita cada palavra a uma duracao plausivel pelo tamanho:
 * a que comeca um trecho perde o inicio; as demais perdem o fim.
 */
export function tightenWords(words: TimedWord[]): TimedWord[] {
  return words.map((w, i) => {
    const maxDur = Math.max(0.3, 0.2 + 0.09 * w.word.replace(/[^\p{L}\p{N}]/gu, '').length)
    if (w.end - w.start <= maxDur) return w
    const prev = words[i - 1]
    const startsChunk = !prev || w.start - prev.end > 0.3
    return startsChunk ? { ...w, start: w.end - maxDur } : { ...w, end: w.start + maxDur }
  })
}

/** Agrupa palavras em frases curtas (1 a 3 palavras): quebra apos pontuacao, a cada maxWords palavras ou numa pausa longa. */
export function cuesFromWords(words: TimedWord[], maxWords = 2, maxGap = 0.5): Cue[] {
  const cues: Cue[] = []
  let cur: TimedWord[] = []
  const flush = () => {
    if (cur.length) {
      const raw = cur.map((w) => w.word).join(' ')
      cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cleanCaptionText(raw) })
    }
    cur = []
  }
  for (const w of words) {
    if (cur.length && w.start - cur[cur.length - 1].end > maxGap) flush()
    cur.push(w)
    if (cur.length >= maxWords || /[.!?;:…]$/.test(w.word)) flush()
  }
  flush()
  // Uma folga curta no fim de cada frase, sem invadir a seguinte.
  return cues.map((c, i) => ({ ...c, end: Math.min(c.end + 0.1, cues[i + 1] ? cues[i + 1].start - 0.02 : c.end + 0.1) }))
}

/** Escapa texto para Dialogue do formato SubStation Alpha (.ass). */
function escapeAssText(s: string): string {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')').replace(/\r?\n/g, ' ').trim()
}

function assTime(sec: number): string {
  const s = Math.max(0, Number(sec) || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rem = (s % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${rem}`
}

/**
 * Gera legendas .ASS estilizadas em alta legibilidade (Montserrat Bold, CAIXA ALTA, contorno preto, sombra,
 * animação pop e destaque em amarelo ouro palavra por palavra sincronizado com os timestamps reais do Whisper).
 */
export function buildFlowAss(words: TimedWord[] | null, cues: Cue[], width: number, height: number, maxWords = 2): string {
  const vertical = height >= width
  const fontSize = vertical ? Math.round(height * 0.044) : Math.round(height * 0.062)
  const outline = vertical ? 4.5 : 3.6
  const shadow = vertical ? 2.4 : 2.0
  const marginV = vertical ? Math.round(height * 0.16) : Math.round(height * 0.09)
  const marginH = vertical ? 52 : 90

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: FlowViral,Montserrat,${fontSize},&H00FFFFFF,&H000AE6FF,&H00000000,&H99000000,-1,0,0,0,100,100,0.8,0,1,${outline},${shadow},2,${marginH},${marginH},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const events: string[] = []
  if (words && words.length > 0) {
    // Agrupa palavras em blocos curtos (maxWords) preservando pausas e pontuação:
    const groups: TimedWord[][] = []
    let cur: TimedWord[] = []
    for (const w of words) {
      const cleanW = cleanCaptionText(w.word)
      if (!cleanW) continue
      if (cur.length && w.start - cur[cur.length - 1].end > 0.45) {
        groups.push(cur)
        cur = []
      }
      cur.push({ ...w, word: cleanW })
      if (cur.length >= maxWords || /[.!?;:…]$/.test(w.word)) {
        groups.push(cur)
        cur = []
      }
    }
    if (cur.length) groups.push(cur)

    for (let gi = 0; gi < groups.length; gi++) {
      const grp = groups[gi]
      const nextGroupStart = groups[gi + 1]?.[0]?.start
      const groupEndLimit = nextGroupStart !== undefined ? Math.min(grp[grp.length - 1].end + 0.14, nextGroupStart - 0.01) : grp[grp.length - 1].end + 0.14

      for (let wi = 0; wi < grp.length; wi++) {
        const start = grp[wi].start
        const nextWordStart = grp[wi + 1]?.start
        const rawEnd = nextWordStart !== undefined ? nextWordStart : groupEndLimit
        const end = Math.max(start + 0.06, Math.min(rawEnd, groupEndLimit))

        const rendered = grp
          .map((item, idx) => {
            const label = escapeAssText(item.word.toUpperCase())
            if (idx === wi) return `{\\c&H000AE6FF&}${label}{\\c&H00FFFFFF&}`
            return label
          })
          .join(' ')

        const pop = wi === 0 ? '{\\fscx92\\fscy92\\t(0,65,\\fscx104\\fscy104)\\t(65,135,\\fscx100\\fscy100)}' : ''
        events.push(`Dialogue: 0,${assTime(start)},${assTime(end)},FlowViral,,0,0,0,,${pop}${rendered}`)
      }
    }
  } else {
    for (const c of cues) {
      const txt = escapeAssText(cleanCaptionText(c.text).toUpperCase())
      if (!txt) continue
      const pop = '{\\fscx92\\fscy92\\t(0,65,\\fscx104\\fscy104)\\t(65,135,\\fscx100\\fscy100)}'
      events.push(`Dialogue: 0,${assTime(c.start)},${assTime(c.end)},FlowViral,,0,0,0,,${pop}${txt}`)
    }
  }

  return header + events.join('\n') + '\n'
}

export function buildSrt(cues: Cue[]): string {
  return cues
    .filter((c) => c.text.trim())
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${wrapCaption(c.text)}\n`)
    .join('\n')
}

/** Janela estimada da fala quando nao da para medir o audio: ~2,6 palavras/s, comecando um pouco depois do inicio. */
export function estimateSpeech(text: string, clipSeconds: number): { start: number; end: number } {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const start = Math.min(0.4, Math.max(clipSeconds * 0.05, 0))
  const speak = Math.max(1.5, words / 2.6 + 0.4)
  const end = Math.min(start + speak, Math.max(clipSeconds - 0.2, start + 0.5))
  return { start, end }
}

/** Trechos COM som, a partir da saida do filtro silencedetect do ffmpeg. */
export function parseVoiced(stderr: string, duration: number): { start: number; end: number }[] {
  const silent: { start: number; end: number }[] = []
  let open: number | null = null
  for (const line of stderr.split(/\r?\n/)) {
    const a = /silence_start:\s*(-?\d+(?:\.\d+)?)/.exec(line)
    if (a) open = Math.max(0, Number(a[1]))
    const b = /silence_end:\s*(-?\d+(?:\.\d+)?)/.exec(line)
    if (b && open !== null) {
      silent.push({ start: open, end: Number(b[1]) })
      open = null
    }
  }
  if (open !== null) silent.push({ start: open, end: duration })
  const voiced: { start: number; end: number }[] = []
  let at = 0
  for (const sl of silent.sort((x, y) => x.start - y.start)) {
    if (sl.start - at >= 0.25) voiced.push({ start: at, end: sl.start })
    at = Math.max(at, sl.end)
  }
  if (duration - at >= 0.25) voiced.push({ start: at, end: duration })
  return voiced
}

/**
 * Janela da fala medida no audio (primeiro ao ultimo trecho com som). Devolve null quando a medida nao e confiavel:
 * sem silencio nenhum (musica/ambiente cobrindo o clipe todo) ou janela curta demais.
 */
export function speechWindow(voiced: { start: number; end: number }[], duration: number): { start: number; end: number } | null {
  if (!voiced.length || duration <= 0) return null
  const start = voiced[0].start
  const end = voiced[voiced.length - 1].end
  const covered = voiced.reduce((n, v) => n + (v.end - v.start), 0)
  if (voiced.length === 1 && covered >= duration * 0.9) return null
  if (end - start < 0.8) return null
  return { start: Math.max(0.1, start), end: Math.min(duration - 0.1, end) }
}

/** Divide a fala em trechos curtos (1 a 3 palavras), preferindo quebrar apos pontuacao. */
export function splitCaption(text: string, maxWords = 2): string[] {
  const cleaned = cleanCaptionText(text)
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  if (words.length <= maxWords) return [cleanCaptionText(words.join(' '))]
  const chunks: string[] = []
  let cur: string[] = []
  for (const w of words) {
    cur.push(w)
    if (cur.length >= maxWords || /[.!?;:…]$/.test(w)) {
      chunks.push(cleanCaptionText(cur.join(' ')))
      cur = []
    }
  }
  if (cur.length) {
    chunks.push(cleanCaptionText(cur.join(' ')))
  }
  return chunks
}

/** Distribui as frases dentro da janela [start, end], proporcional ao tamanho de cada uma. */
export function timeChunks(chunks: string[], start: number, end: number): Cue[] {
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1
  const span = Math.max(end - start, 0.5)
  let at = start
  return chunks.map((text, i) => {
    const len = (text.length / total) * span
    const cue = { start: at, end: i === chunks.length - 1 ? start + span : at + len - 0.05, text }
    at += len
    return cue
  })
}

/** Para cada take, escolhe o clipe pronto de melhor qualidade (final 720p antes do rascunho). */
export function pickClips(takeNumbers: number[], jobs: Pick<FlowJob, 'take_index' | 'role' | 'status' | 'result_url' | 'finished_at'>[]) {
  const picked: { n: number; url: string; final: boolean }[] = []
  const missing: number[] = []
  for (const n of takeNumbers) {
    const done = jobs.filter((j) => j.take_index === n && j.status === 'done' && j.result_url)
    const best =
      done.filter((j) => j.role === 'take_final').sort((a, b) => String(b.finished_at).localeCompare(String(a.finished_at)))[0] ??
      done.filter((j) => j.role === 'take').sort((a, b) => String(b.finished_at).localeCompare(String(a.finished_at)))[0]
    if (best?.result_url) picked.push({ n, url: best.result_url, final: best.role === 'take_final' })
    else missing.push(n)
  }
  return { picked, missing }
}

export async function probe(file: string) {
  try {
    await run(ffmpegBin(), ['-hide_banner', '-i', file], { timeout: 60000 })
    return parseProbe('')
  } catch (err: any) {
    return parseProbe(String(err?.stderr || ''))
  }
}

/** Mede em que parte do clipe ha voz (silencedetect). Null se nao der para medir com seguranca. */
async function detectVoice(file: string, duration: number) {
  try {
    const { stderr } = await run(ffmpegBin(), ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=noise=-32dB:d=0.3', '-f', 'null', '-'], { timeout: 120000 })
    return speechWindow(parseVoiced(String(stderr || ''), duration), duration)
  } catch {
    return null
  }
}

// Servidor Whisper da OpenAI oficial como padrao definitivo (com fallback procedural de roteiro).
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'

/** Transcreve o audio com tempo por palavra via OpenAI Whisper oficial (whisper-1). */
export async function transcribeWhisper(file: string, language?: string, customApiKey?: string, promptHint?: string): Promise<TimedWord[] | null> {
  const apiKey = customApiKey
  if (!apiKey) {
    console.warn('[Flow] Chave OpenAI nao encontrada nas Credenciais do usuario (Credenciais > IA > OpenAI).')
    return null
  }
  try {
    // So o audio, mono 16 kHz: formato leve aceito nativamente pela OpenAI
    const audio = path.join(path.dirname(file), path.basename(file, path.extname(file)) + '_speech.m4a')
    await run(ffmpegBin(), ['-y', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'aac', '-b:a', '64k', audio], { timeout: 120000 })
    const fd = new FormData()
    fd.append('file', new Blob([fs.readFileSync(audio)], { type: 'audio/m4a' }), 'speech.m4a')
    fd.append('model', 'whisper-1')
    fd.append('response_format', 'verbose_json')
    fd.append('timestamp_granularities[]', 'word')
    if (language) fd.append('language', language)
    if (promptHint && promptHint.trim()) fd.append('prompt', promptHint.trim().slice(0, 600))

    const res = await fetch(OPENAI_WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: fd,
      signal: AbortSignal.timeout(300000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 160)}`)
    }

    const json = await res.json()
    const words = wordsFromWhisper(json)
    return words.length ? words : null
  } catch (err: any) {
    console.error(`[Flow] Erro no Whisper da OpenAI: ${String(err?.message || err).slice(0, 200)}`)
    return null
  }
}

export async function readStored(url: string): Promise<Buffer> {
  const filename = decodeURIComponent(url.split('/').pop() || '')
  const { rows } = await pool.query(`SELECT content FROM public.storage_files WHERE filename = $1`, [filename])
  if (!rows[0]?.content) throw new Error(`Arquivo não encontrado no armazenamento: ${filename}`)
  return rows[0].content as Buffer
}

const REMOTION_URLS = [
  process.env.REMOTION_SERVER_URL,
  process.env.REMOTION_SERVICE_URL?.replace(/\/render\/?$/, ''),
  'http://n8n-remotionservice-ry6eh9:3001',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(Boolean) as string[]

export type FlowCtaOverlay = { title: string; subtitle?: string; accent?: string; position?: 'top' | 'center' | 'bottom'; startSec?: number; seconds?: number }

/** Renderiza a faixa de CTA no Remotion (WebM com alfa) e sobrepoe no video final. Devolve o novo arquivo, ou null. */
async function applyCtaOverlay(dir: string, input: string, cta: FlowCtaOverlay, totalSec: number, vertical: boolean): Promise<string | null> {
  const seconds = Math.min(Math.max(Number(cta.seconds) || 3, 1), 8)
  // Por padrao entra nos ultimos segundos, onde o CTA conta.
  const start = Math.max(0, Number.isFinite(Number(cta.startSec)) && cta.startSec !== undefined ? Number(cta.startSec) : totalSec - seconds - 0.5)
  const body = JSON.stringify({ title: cta.title, subtitle: cta.subtitle, accent: cta.accent, position: cta.position, seconds, width: vertical ? 1080 : 1920, height: vertical ? 1920 : 1080 })
  let webm: Buffer | null = null
  for (const base of REMOTION_URLS) {
    try {
      const r = await fetch(`${base.replace(/\/$/, '')}/render-cta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(120000) })
      if (r.ok) { webm = Buffer.from(await r.arrayBuffer()); break }
    } catch { /* tenta a proxima URL */ }
  }
  if (!webm || webm.length < 1000) return null
  fs.writeFileSync(path.join(dir, 'cta.webm'), webm)
  await run(
    ffmpegBin(),
    ['-y', '-i', path.basename(input), '-itsoffset', start.toFixed(2), '-c:v', 'libvpx', '-i', 'cta.webm',
      '-filter_complex', '[0:v][1:v]overlay=eof_action=pass:format=auto,format=yuv420p[v]', '-map', '[v]', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', 'final_cta.mp4'],
    { timeout: 300000, cwd: dir }
  )
  const out = path.join(dir, 'final_cta.mp4')
  return fs.existsSync(out) && fs.statSync(out).size > 1000 ? out : null
}

export async function assembleFlowProject(userId: string, projectId: string) {
  const assembleStartMs = Date.now()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowasm-'))
  try {
    const project = await getFlowProject(userId, projectId)
    if (!project) throw new Error('Projeto não encontrado.')
    const t = getFlowTemplate(project.template_id)
    if (!t) throw new Error('Template inválido.')
    await setFlowProjectAssembly(userId, projectId, { status: 'assembling' })

    const { rows: jobs } = await pool.query(
      `SELECT take_index, role, status, result_url, finished_at FROM public.flow_jobs WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    )
    const takes = project.script.takes
    const { picked, missing } = pickClips(takes.map((k) => k.n), jobs)
    if (missing.length) throw new Error(`Faltam takes prontos: ${missing.join(', ')}.`)

    const vertical = project.params.aspect !== '16:9'
    const W = vertical ? 720 : 1280
    const H = vertical ? 1280 : 720
    const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`

    const normalized: string[] = []
    const durations: number[] = []
    const hasAudio: boolean[] = []
    const fallbackCuesList: Cue[] = []
    const openAiApiKey = (await getUserApiKey(userId, 'openai').catch(() => '')) || ''
    const wordsPerCaption = Math.min(Math.max(Number((project.params as any)?.wordsPerCaption) || 2, 1), 3)
    const lang = String(project.params.idioma || '').split('-')[0].toLowerCase() || undefined
    let at = 0

    for (let i = 0; i < picked.length; i++) {
      const clip = picked[i]
      const k = takes.find((t) => t.n === clip.n) ?? takes[i]
      const raw = path.join(dir, `raw_${clip.n}.mp4`)
      const norm = path.join(dir, `norm_${clip.n}.mp4`)
      const trimmed = path.join(dir, `trimmed_${clip.n}.mp4`)
      fs.writeFileSync(raw, await readStored(clip.url))
      const info = await probe(raw)
      hasAudio.push(info.hasAudio)
      const args = info.hasAudio
        ? ['-y', '-i', raw, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', norm]
        : ['-y', '-i', raw, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-map', '0:v', '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', norm]
      await run(ffmpegBin(), args, { timeout: 300000 })

      let clipFile = norm
      let dur = (await probe(norm)).duration || k?.seconds || 6
      let trimOffset = 0

      // Corte inteligente de silêncio inicial com re-encode preciso (nunca -c copy, que corta no keyframe e gera deriva):
      if (t.mode !== 'ambiente' && k?.line?.trim() && info.hasAudio) {
        const voiceWin = await detectVoice(norm, dur)
        const preStart = voiceWin?.start ?? 0
        if (preStart > 0.35 && preStart < dur - 1.0) {
          trimOffset = Math.max(0, preStart - 0.14)
          console.log(`[Flow] take ${clip.n}: cortando ${trimOffset.toFixed(2)}s de silêncio inicial (voz aos ${preStart.toFixed(2)}s)`)
          try {
            await run(
              ffmpegBin(),
              ['-y', '-ss', trimOffset.toFixed(3), '-i', norm, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-avoid_negative_ts', 'make_zero', trimmed],
              { timeout: 120000 }
            )
            if (fs.existsSync(trimmed) && fs.statSync(trimmed).size > 1000) {
              clipFile = trimmed
              dur = (await probe(trimmed)).duration || Math.max(0.5, dur - trimOffset)
            } else {
              trimOffset = 0
            }
          } catch {
            trimOffset = 0
          }
        }
        const win = voiceWin || estimateSpeech(k.line, dur)
        const chunks = splitCaption(k.line, wordsPerCaption)
        if (chunks.length) {
          const fallbackCues = timeChunks(chunks, Math.max(0, win.start - trimOffset), Math.max(0.2, Math.min(dur - 0.05, win.end - trimOffset))).map((c) => ({
            ...c,
            start: at + c.start,
            end: at + Math.min(c.end, dur - 0.05),
          }))
          fallbackCuesList.push(...fallbackCues)
        }
      }

      normalized.push(clipFile)
      durations.push(dur)
      at += dur
    }

    const list = path.join(dir, 'list.txt')
    fs.writeFileSync(list, normalized.map((f) => `file '${path.basename(f)}'`).join('\n'))
    const joined = path.join(dir, 'joined.mp4')
    await run(ffmpegBin(), ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined], { timeout: 300000, cwd: dir })

    // Sincronia exata: transcreve o audio FINAL de joined.mp4 inteiro via Whisper (0 ms de deriva entre takes),
    // passando as falas oficiais do roteiro como guia de vocabulário/nomes próprios.
    const spokenLines = picked
      .map((clip, idx) => (takes.find((tk) => tk.n === clip.n) ?? takes[idx])?.line || '')
      .filter(Boolean)
      .join(' ')
    let joinedWords: TimedWord[] | null = null
    if (t.mode !== 'ambiente' && spokenLines.trim()) {
      const rawWords = await transcribeWhisper(joined, lang, openAiApiKey, spokenLines)
      if (rawWords && rawWords.length > 0) {
        joinedWords = tightenWords(rawWords)
        console.log(`[Flow] legenda sincronizada no video final joined.mp4: OpenAI Whisper ${joinedWords.length} palavras (${wordsPerCaption} pal/leg)`)
      }
    }

    const cues = joinedWords ? cuesFromWords(joinedWords, wordsPerCaption) : fallbackCuesList
    const srt = buildSrt(cues)

    const pr = (project.params || {}) as Record<string, any>
    const noBurnCaptions = pr.noCaptions === true || pr.noCaptions === 'true' || pr.burnCaptions === false || pr.burnCaptions === 'false'

    let finalFile = joined
    let burned = false
    // Curtos: legenda gravada no video (retencao no feed, muita gente assiste sem som), exceto quando noCaptions/burnCaptions=false.
    // Longos (YouTube 16:9): so o .srt, que vira legenda ativavel e traduzivel no YouTube e nao cobre a imagem.
    const burn = !noBurnCaptions && (!!srt || (joinedWords && joinedWords.length > 0)) && t.length !== 'longo'
    if (srt) fs.writeFileSync(path.join(dir, 'captions.srt'), srt, 'utf8')
    if (burn) {
      const assContent = buildFlowAss(joinedWords, cues, W, H, wordsPerCaption)
      fs.writeFileSync(path.join(dir, 'captions.ass'), assContent, 'utf8')
      const fontsDir = path.join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/')
      const burnedFile = path.join(dir, 'final.mp4')
      try {
        await run(
          ffmpegBin(),
          ['-y', '-i', 'joined.mp4', '-vf', `ass=captions.ass:fontsdir='${fontsDir}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', 'final.mp4'],
          { timeout: 300000, cwd: dir }
        )
        if (fs.existsSync(burnedFile) && fs.statSync(burnedFile).size > 1000) {
          finalFile = burnedFile
          burned = true
        }
      } catch {
        // Fallback para SRT estilizado se o filtro ass falhar
        try {
          const style = `Fontname=Montserrat-Bold,Bold=1,FontSize=${vertical ? 18 : 15},Outline=2.5,Shadow=1.2,Alignment=2,MarginV=${vertical ? 75 : 35},PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BackColour=&H80000000&`
          await run(
            ffmpegBin(),
            ['-y', '-i', 'joined.mp4', '-vf', `subtitles=captions.srt:fontsdir='${fontsDir}':force_style='${style}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', 'final.mp4'],
            { timeout: 300000, cwd: dir }
          )
          if (fs.existsSync(burnedFile) && fs.statSync(burnedFile).size > 1000) {
            finalFile = burnedFile
            burned = true
          }
        } catch {
          burned = false
        }
      }
    }

    // CTA animado (Remotion, fundo transparente): o Flow nao desenha texto, ele entra aqui, na edicao.
    let ctaApplied = false
    const cta: FlowCtaOverlay = {
      title: String(pr.ctaTitle || '').trim(),
      subtitle: String(pr.ctaSubtitle || '').trim() || undefined,
      accent: String(pr.ctaAccent || '').trim() || undefined,
      position: ['top', 'center', 'bottom'].includes(pr.ctaPosition) ? pr.ctaPosition : undefined,
      startSec: pr.ctaStartSec !== undefined && pr.ctaStartSec !== '' ? Number(pr.ctaStartSec) : undefined,
      seconds: pr.ctaSeconds ? Number(pr.ctaSeconds) : undefined,
    }
    if (cta.title) {
      const total = durations.reduce((a, b) => a + b, 0)
      const out = await applyCtaOverlay(dir, finalFile, cta, total, vertical).catch((err: any) => {
        console.error(`[Flow] CTA animado não aplicado: ${String(err?.message || err).slice(0, 200)}`)
        return null
      })
      if (out) {
        finalFile = out
        ctaApplied = true
      }
    }

    const motionCheck = await inspectRenderedVideo(finalFile, {
      ffmpegPath: ffmpegBin(),
      expectedColors: cta.accent ? [cta.accent] : undefined,
    })
    if (motionCheck.warnings.length) {
      console.warn(`[Flow] Motion check avisos (${projectId}):`, motionCheck.warnings.join(' | '))
    }
    if (!motionCheck.ok && motionCheck.durationSec <= 0) {
      throw new Error(`Falha na validação Motion Check: ${motionCheck.errors.join('; ')}`)
    }

    const finalUrl = await uploadMediaFile(fs.readFileSync(finalFile), `flow_final_${projectId}.mp4`, 'video/mp4')
    const srtUrl = srt ? await uploadMediaFile(Buffer.from(srt, 'utf8'), `flow_final_${projectId}.srt`, 'text/plain') : null
    await setFlowProjectAssembly(userId, projectId, {
      status: 'assembled',
      finalUrl,
      srtUrl,
      error: burn && !burned ? 'Legenda não foi gravada no vídeo (ffmpeg sem suporte). O arquivo .srt está disponível.' : null,
    })
    const assembleDurationMs = Math.max(0, Date.now() - assembleStartMs)
    const assembleDurationLabel = formatDeliveryDuration(assembleDurationMs)
    console.log(`[Flow] ✅ Montagem do projeto ${projectId} concluída em ${assembleDurationLabel} (${picked.length} takes)`)
    return {
      finalUrl,
      srtUrl,
      burned,
      ctaApplied,
      motionCheck,
      takes: picked.length,
      seconds: Math.round(durations.reduce((a, b) => a + b, 0)),
      assembleDurationMs,
      assembleDurationLabel,
    }
  } catch (err: any) {
    await setFlowProjectAssembly(userId, projectId, { status: 'assemble_failed', error: String(err?.message || err).slice(0, 400) }).catch(() => {})
    throw err
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export interface ChromaKeyOptions {
  color?: string
  similarity?: number
  blend?: number
  scaleW?: number
  scaleH?: number
  posX?: string
  posY?: string
}

/**
 * Compõe o Expert (gravado com fundo verde) sobre o B-Roll de fundo usando chromakey nativo do FFmpeg.
 * Remove a cor verde sólida (#00FF00) com suavização de bordas e posiciona o torso recortado
 * no terço inferior direito (PiP) sem bordas duras, mantendo o áudio da fala do expert.
 */
export async function compositeChromaKeyOverlay(
  bgVideoPath: string,
  expertGreenVideoPath: string,
  outputPath: string,
  options?: ChromaKeyOptions
): Promise<string> {
  const color = options?.color || '0x00FF00'
  const similarity = options?.similarity ?? 0.15
  const blend = options?.blend ?? 0.05
  const scaleW = options?.scaleW ?? 480
  const scaleH = options?.scaleH ?? 480
  const posX = options?.posX || 'W-w-20'
  const posY = options?.posY || 'H-h-40'

  const filter =
    `[1:v]chromakey=${color}:${similarity}:${blend},scale=${scaleW}:${scaleH}[expert];` +
    `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[bg];` +
    `[bg][expert]overlay=x=${posX}:y=${posY}[out]`

  await run(ffmpegBin(), [
    '-y',
    '-i', bgVideoPath,
    '-i', expertGreenVideoPath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    outputPath
  ], { timeout: 300000 })

  return outputPath
}

