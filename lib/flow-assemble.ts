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

/** Quebra o texto em linhas curtas para caber na tela vertical. */
export function wrapCaption(text: string, maxChars = 30): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.join('\n')
}

export function buildSrt(cues: Cue[]): string {
  return cues
    .filter((c) => c.text.trim())
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${wrapCaption(c.text)}\n`)
    .join('\n')
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
    for (const clip of picked) {
      const raw = path.join(dir, `raw_${clip.n}.mp4`)
      const out = path.join(dir, `norm_${clip.n}.mp4`)
      fs.writeFileSync(raw, await readStored(clip.url))
      const info = await probe(raw)
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

    // Legenda a partir das falas do roteiro, com a duracao real de cada clipe.
    const cues: Cue[] = []
    let at = 0
    takes.forEach((k, i) => {
      if (t.mode !== 'ambiente' && k.line.trim()) cues.push({ start: at + 0.2, end: at + durations[i] - 0.2, text: k.line })
      at += durations[i]
    })
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
