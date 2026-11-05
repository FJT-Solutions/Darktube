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

/** Limpa pontuacao solta, espacos duplicados e une palavras com hifen (ex: "terca -feira" -> "terca-feira"). */
export function cleanCaptionText(text: string): string {
  return text
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

async function probe(file: string) {
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
async function transcribeWhisper(file: string, language?: string, customApiKey?: string): Promise<TimedWord[] | null> {
  const apiKey = customApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[Flow] OPENAI_API_KEY nao configurada (nem no perfil do usuario nem no ambiente).')
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

async function readStored(url: string): Promise<Buffer> {
  const filename = decodeURIComponent(url.split('/').pop() || '')
  const { rows } = await pool.query(`SELECT content FROM public.storage_files WHERE filename = $1`, [filename])
  if (!rows[0]?.content) throw new Error(`Arquivo não encontrado no armazenamento: ${filename}`)
  return rows[0].content as Buffer
}

export async function assembleFlowProject(userId: string, projectId: string) {
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
    for (const clip of picked) {
      const raw = path.join(dir, `raw_${clip.n}.mp4`)
      const out = path.join(dir, `norm_${clip.n}.mp4`)
      fs.writeFileSync(raw, await readStored(clip.url))
      const info = await probe(raw)
      hasAudio.push(info.hasAudio)
      const args = info.hasAudio
        ? ['-y', '-i', raw, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out]
        : ['-y', '-i', raw, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-map', '0:v', '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out]
      await run(ffmpegBin(), args, { timeout: 300000 })
      normalized.push(out)
      const outInfo = await probe(out)
      durations.push(outInfo.duration || takes.find((k) => k.n === clip.n)?.seconds || 6)
    }

    const list = path.join(dir, 'list.txt')
    fs.writeFileSync(list, normalized.map((f) => `file '${path.basename(f)}'`).join('\n'))
    const joined = path.join(dir, 'joined.mp4')
    await run(ffmpegBin(), ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined], { timeout: 300000, cwd: dir })

    // Legenda, take por take: Whisper da OpenAI (chave do usuário ou ambiente) com fallback procedural de roteiro.
    const userOpenAiKey = await getUserApiKey(userId, 'openai').catch(() => '')
    const openAiApiKey = userOpenAiKey || process.env.OPENAI_API_KEY || ''
    const wordsPerCaption = Math.min(Math.max(Number((project.params as any)?.wordsPerCaption) || 2, 1), 3)
    const cues: Cue[] = []
    const lang = String(project.params.idioma || '').split('-')[0].toLowerCase() || undefined
    let at = 0
    for (let i = 0; i < takes.length; i++) {
      const k = takes[i]
      const dur = durations[i]
      if (t.mode !== 'ambiente' && k.line.trim()) {
        const words = hasAudio[i] ? await transcribeWhisper(normalized[i], lang, openAiApiKey) : null
        if (words && words.length) {
          const takeCues = cuesFromWords(tightenWords(words).filter((w) => w.start < dur), wordsPerCaption).map((c) => ({
            ...c,
            start: at + c.start,
            end: at + Math.min(c.end, dur - 0.05),
          }))
          cues.push(...takeCues)
          console.log(`[Flow] legenda take ${k.n}: OpenAI whisper ${words.length} palavras, ${takeCues.length} frases (${wordsPerCaption} pal/leg), ${(takeCues[0]?.start - at).toFixed(1)}s-${(takeCues[takeCues.length - 1]?.end - at).toFixed(1)}s`)
        } else {
          // Fallback procedural: gera legendas a partir do texto do roteiro sincronizado com o áudio ou duração
          const chunks = splitCaption(k.line, wordsPerCaption)
          if (chunks.length) {
            const voiceWin = hasAudio[i] ? await detectVoice(normalized[i], dur) : null
            const win = voiceWin || estimateSpeech(k.line, dur)
            const fallbackCues = timeChunks(chunks, win.start, win.end).map((c) => ({
              ...c,
              start: at + c.start,
              end: at + Math.min(c.end, dur - 0.05),
            }))
            cues.push(...fallbackCues)
            console.log(`[Flow] legenda take ${k.n} (fallback roteiro): ${chunks.length} frases sincronizadas a partir do roteiro (${win.start.toFixed(1)}s-${win.end.toFixed(1)}s)`)
          } else {
            console.log(`[Flow] take ${k.n}: nenhuma legenda gerada`)
          }
        }
      }
      at += dur
    }
    const srt = buildSrt(cues)

    let finalFile = joined
    let burned = false
    // Curtos: legenda gravada no video (retencao no feed, muita gente assiste sem som).
    // Longos (YouTube 16:9): so o .srt, que vira legenda ativavel e traduzivel no YouTube e nao cobre a imagem.
    const burn = !!srt && t.length !== 'longo'
    if (srt) fs.writeFileSync(path.join(dir, 'captions.srt'), srt, 'utf8')
    if (burn) {
      fs.writeFileSync(path.join(dir, 'captions.srt'), srt, 'utf8')
      // Legenda estilo social media limpa/normal: fonte encorpada (Bold), contorno e sombra suaves, margem segura
      const style = `Fontname=Arial,Bold=1,FontSize=${vertical ? 24 : 22},Outline=3,Shadow=1.5,Alignment=2,MarginV=${vertical ? 110 : 45},PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BackColour=&H80000000&`
      const burnedFile = path.join(dir, 'final.mp4')
      try {
        await run(
          ffmpegBin(),
          ['-y', '-i', 'joined.mp4', '-vf', `subtitles=captions.srt:force_style='${style}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', 'final.mp4'],
          { timeout: 300000, cwd: dir }
        )
        if (fs.existsSync(burnedFile) && fs.statSync(burnedFile).size > 1000) {
          finalFile = burnedFile
          burned = true
        }
      } catch {
        burned = false // segue sem legenda queimada; o .srt continua disponivel
      }
    }

    const finalUrl = await uploadMediaFile(fs.readFileSync(finalFile), `flow_final_${projectId}.mp4`, 'video/mp4')
    const srtUrl = srt ? await uploadMediaFile(Buffer.from(srt, 'utf8'), `flow_final_${projectId}.srt`, 'text/plain') : null
    await setFlowProjectAssembly(userId, projectId, {
      status: 'assembled',
      finalUrl,
      srtUrl,
      error: burn && !burned ? 'Legenda não foi gravada no vídeo (ffmpeg sem suporte). O arquivo .srt está disponível.' : null,
    })
    return { finalUrl, srtUrl, burned, takes: picked.length, seconds: Math.round(durations.reduce((a, b) => a + b, 0)) }
  } catch (err: any) {
    await setFlowProjectAssembly(userId, projectId, { status: 'assemble_failed', error: String(err?.message || err).slice(0, 400) }).catch(() => {})
    throw err
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
