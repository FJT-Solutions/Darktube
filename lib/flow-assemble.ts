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

/** Quebra em ate duas linhas equilibradas (no espaco mais perto do meio), sem deixar palavra solta. */
export function wrapCaption(text: string, maxChars = 30): string {
  const t = text.trim().replace(/\s+/g, ' ')
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
  const segs: any[] = Array.isArray(json?.segments) ? json.segments : []
  if (segs.some((s) => Array.isArray(s?.words))) {
    for (const s of segs) {
      if (Number(s?.no_speech_prob ?? 0) > 0.6 || Number(s?.avg_logprob ?? 0) < -1.2) continue
      for (const w of s.words || []) push(w)
    }
  } else {
    for (const w of Array.isArray(json?.words) ? json.words : []) push(w)
  }
  return out.sort((a, b) => a.start - b.start)
}

/** Agrupa palavras em frases curtas: quebra apos pontuacao, a cada maxWords palavras ou numa pausa longa. */
export function cuesFromWords(words: TimedWord[], maxWords = 6, maxGap = 0.7): Cue[] {
  const cues: Cue[] = []
  let cur: TimedWord[] = []
  const flush = () => {
    if (cur.length) cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map((w) => w.word).join(' ') })
    cur = []
  }
  for (const w of words) {
    if (cur.length && w.start - cur[cur.length - 1].end > maxGap) flush()
    cur.push(w)
    if (cur.length >= maxWords || (cur.length >= 3 && /[.!?;:…]$/.test(w.word))) flush()
  }
  flush()
  // Uma folga curta no fim de cada frase, sem invadir a seguinte.
  return cues.map((c, i) => ({ ...c, end: Math.min(c.end + 0.15, cues[i + 1] ? cues[i + 1].start - 0.02 : c.end + 0.15) }))
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

/** Divide a fala em frases curtas (ate maxWords palavras), preferindo quebrar apos pontuacao. */
export function splitCaption(text: string, maxWords = 6): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords + 1) return words.length ? [words.join(' ')] : []
  const chunks: string[] = []
  let cur: string[] = []
  for (const w of words) {
    cur.push(w)
    if ((cur.length >= 3 && /[.!?;:…]$/.test(w)) || cur.length >= maxWords) {
      chunks.push(cur.join(' '))
      cur = []
    }
  }
  if (cur.length) {
    if (chunks.length && cur.length < 3) chunks[chunks.length - 1] += ' ' + cur.join(' ')
    else chunks.push(cur.join(' '))
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

// Servidor Whisper proprio (API compativel com a da OpenAI). FLOW_WHISPER_URL=off desliga.
const whisperUrl = () => process.env.FLOW_WHISPER_URL || 'https://whisper.fjt-solutions.com/v1/audio/transcriptions'

/** Transcreve o audio do video com tempo por palavra. Null se o servidor falhar ou nao achar fala. */
async function transcribeWhisper(file: string, language?: string): Promise<TimedWord[] | null> {
  const url = whisperUrl()
  if (url === 'off') return null
  try {
    // So o audio, mono 16 kHz: arquivo pequeno e e o formato que o Whisper usa por dentro.
    const audio = path.join(path.dirname(file), 'speech.m4a')
    await run(ffmpegBin(), ['-y', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'aac', '-b:a', '64k', audio], { timeout: 120000 })
    const fd = new FormData()
    fd.append('file', new Blob([fs.readFileSync(audio)], { type: 'audio/mp4' }), 'speech.m4a')
    fd.append('model', process.env.FLOW_WHISPER_MODEL || 'Systran/faster-whisper-medium')
    fd.append('response_format', 'verbose_json')
    fd.append('timestamp_granularities[]', 'word')
    if (language) fd.append('language', language)
    const res = await fetch(url, { method: 'POST', body: fd, signal: AbortSignal.timeout(300000) })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const words = wordsFromWhisper(await res.json())
    return words.length ? words : null
  } catch (err: any) {
    console.log(`[Flow] whisper indisponível, usando o texto do roteiro: ${String(err?.message || err).slice(0, 120)}`)
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

    // Legenda: 1) transcricao com tempo por palavra (Whisper) do video ja unido; mostra o que e falado, quando e falado.
    // 2) sem Whisper, cai no texto do roteiro com a janela medida/estimada por take.
    const cues: Cue[] = []
    const hasLines = t.mode !== 'ambiente' && takes.some((k) => k.line.trim())
    const words = hasLines ? await transcribeWhisper(joined, String(project.params.idioma || '').split('-')[0].toLowerCase() || undefined) : null
    if (words) {
      cues.push(...cuesFromWords(words))
      console.log(`[Flow] legenda: whisper ${words.length} palavras em ${cues.length} frases`)
    }
    let at = 0
    for (let i = 0; i < takes.length && !words; i++) {
      const k = takes[i]
      if (t.mode !== 'ambiente' && k.line.trim()) {
        const dur = durations[i]
        // Janela medida no audio quando possivel; senao estimada pelo tamanho da fala. Nunca o clipe inteiro.
        const voice = hasAudio[i] ? await detectVoice(normalized[i], dur) : null
        const win = voice ?? estimateSpeech(k.line, dur)
        console.log(`[Flow] legenda take ${k.n}: ${voice ? 'voz medida' : 'estimada'} ${win.start.toFixed(1)}s-${win.end.toFixed(1)}s de ${dur.toFixed(1)}s`)
        cues.push(...timeChunks(splitCaption(k.line), at + win.start, at + win.end))
      }
      at += durations[i]
    }
    const srt = buildSrt(cues)

    let finalFile = joined
    let burned = false
    if (srt) {
      fs.writeFileSync(path.join(dir, 'captions.srt'), srt, 'utf8')
      const style = `FontSize=${vertical ? 16 : 20},Outline=2,Shadow=0,Alignment=2,MarginV=${vertical ? 90 : 40},PrimaryColour=&H00FFFFFF&`
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
      error: srt && !burned ? 'Legenda não foi gravada no vídeo (ffmpeg sem suporte). O arquivo .srt está disponível.' : null,
    })
    return { finalUrl, srtUrl, burned, takes: picked.length, seconds: Math.round(durations.reduce((a, b) => a + b, 0)) }
  } catch (err: any) {
    await setFlowProjectAssembly(userId, projectId, { status: 'assemble_failed', error: String(err?.message || err).slice(0, 400) }).catch(() => {})
    throw err
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
