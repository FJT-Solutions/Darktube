import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const run = promisify(execFile)

export type MotionEnergy = 'cinematografico' | 'fluido' | 'cinetico'

export interface BpmRange {
  min: number
  max: number
  label: string
}

export const BPM_RANGES: Record<MotionEnergy, BpmRange> = {
  cinematografico: { min: 60, max: 80, label: '60-80 BPM (Cinematográfico / Premium)' },
  fluido: { min: 90, max: 110, label: '90-110 BPM (Fluido / Narrativo)' },
  cinetico: { min: 115, max: 123, label: '115-123 BPM (Cinético / Sofisticado)' },
}

export interface TimelineStateInput {
  id: string
  atSec: number
  durationSec?: number
  opacityAtStart?: number
  coversSafeZone?: boolean
}

export interface FrozenSegment {
  startSec: number
  endSec: number
  durationSec: number
}

export interface VideoSsimResult {
  ok: boolean
  ssimAll: number
  ssimY: number
}

export interface MotionCheckResult {
  ok: boolean
  frame0Black: boolean
  frame0Pblack: number | null
  durationSec: number
  hasAudio: boolean
  frozenSegments?: FrozenSegment[]
  internalFreezeSegments?: FrozenSegment[]
  warnings: string[]
  errors: string[]
}

function parseFreezeDetectLog(logText: string): FrozenSegment[] {
  const segments: FrozenSegment[] = []
  let curStart: number | null = null
  for (const line of String(logText || '').split('\n')) {
    const mStart = /freeze_start:\s*([0-9.]+)/.exec(line)
    if (mStart) curStart = Number(mStart[1])
    const mDur = /freeze_duration:\s*([0-9.]+)/.exec(line)
    if (mDur && curStart !== null) {
      const d = Number(mDur[1])
      segments.push({
        startSec: Number(curStart.toFixed(2)),
        endSec: Number((curStart + d).toFixed(2)),
        durationSec: Number(d.toFixed(2)),
      })
      curStart = null
    }
  }
  return segments
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function normalizeHex(hex: string): string | null {
  const raw = String(hex || '').trim()
  if (!HEX_RE.test(raw)) return null
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
  }
  return raw.toUpperCase()
}

/**
 * Valida paleta de marca segundo o playbook @leomeethewoo/@m4lkxx:
 * hex valido, sem duplicatas e no maximo `maxColors` (padrao 3) cores fixas.
 */
export function validateBrandPalette(
  colors: string[],
  options?: { allowedPalette?: string[]; maxColors?: number }
): { valid: boolean; normalized: string[]; errors: string[]; warnings: string[] } {
  const maxColors = options?.maxColors ?? 3
  const errors: string[] = []
  const warnings: string[] = []
  const normalized: string[] = []
  const seen = new Set<string>()

  const allowedSet = options?.allowedPalette
    ? new Set(options.allowedPalette.map((c) => normalizeHex(c)).filter(Boolean) as string[])
    : null

  for (const c of colors || []) {
    if (!String(c || '').trim()) continue
    const norm = normalizeHex(c)
    if (!norm) {
      errors.push(`Cor hex inválida na paleta: "${c}"`)
      continue
    }
    if (!seen.has(norm)) {
      seen.add(norm)
      normalized.push(norm)
    }
    if (allowedSet && !allowedSet.has(norm)) {
      errors.push(`Cor fora da paleta da marca (${Array.from(allowedSet).join(', ')}): ${norm}`)
    }
  }

  if (normalized.length > maxColors) {
    warnings.push(`Paleta com ${normalized.length} cores (recomendado até ${maxColors} cores fixas).`)
  }

  return { valid: errors.length === 0, normalized, errors, warnings }
}

/**
 * Garante estados com timestamps monotonicamente crescentes, sem quadro inicial morto (t=0 opaco)
 * e sem marcacao de invasao da safe-zone (rostos/titulos).
 */
export function validateTimelineStates(
  states: TimelineStateInput[],
  totalDurationSec?: number
): { valid: boolean; frame0Visible: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (!Array.isArray(states) || states.length === 0) {
    return { valid: false, frame0Visible: false, errors: ['Timeline sem estados definidos.'], warnings }
  }

  let prevAt = -Infinity
  let frame0Visible = false

  for (const st of states) {
    if (!Number.isFinite(st.atSec) || st.atSec < 0) {
      errors.push(`Timestamp inválido em "${st.id}": ${st.atSec}`)
      continue
    }
    if (st.atSec < prevAt) {
      errors.push(`Estado "${st.id}" fora de ordem cronológica (${st.atSec}s < ${prevAt}s).`)
    }
    prevAt = st.atSec

    if (st.durationSec !== undefined && (!Number.isFinite(st.durationSec) || st.durationSec <= 0)) {
      errors.push(`Duração inválida no estado "${st.id}": ${st.durationSec}`)
    }
    if (totalDurationSec !== undefined && st.atSec > totalDurationSec) {
      warnings.push(`Estado "${st.id}" inicia após o fim do vídeo (${st.atSec}s > ${totalDurationSec}s).`)
    }
    if (st.atSec <= 0.05 && (st.opacityAtStart === undefined || st.opacityAtStart > 0)) {
      frame0Visible = true
    }
    if (st.coversSafeZone) {
      warnings.push(`Estado "${st.id}" marcado com sobreposição na safe-zone (rosto/título).`)
    }
  }

  if (!frame0Visible) {
    errors.push('Frame 0 sem elemento visível (risco de tela preta inicial).')
  }

  return { valid: errors.length === 0, frame0Visible, errors, warnings }
}

export function recommendBpmRange(energy: MotionEnergy): BpmRange {
  return BPM_RANGES[energy] || BPM_RANGES.fluido
}

export function isBpmInEnergyRange(bpm: number, energy: MotionEnergy): boolean {
  const range = recommendBpmRange(energy)
  return Number.isFinite(bpm) && bpm >= range.min && bpm <= range.max
}

export function parseBlackframeStderr(stderr: string): { isBlack: boolean; pblack: number | null } {
  const m = /frame:\s*0\b[^\n]*\bpblack:(\d+)/.exec(stderr || '')
  if (!m) return { isBlack: false, pblack: null }
  const pblack = Number(m[1])
  return { isBlack: Number.isFinite(pblack) && pblack >= 95, pblack }
}

/**
 * Verifica no MP4 renderizado via ffmpeg se o Frame 0 nao esta preto, se a duracao e valida e se ha trilha de audio.
 */
export async function inspectRenderedVideo(
  videoPath: string,
  options?: { ffmpegPath?: string; expectedColors?: string[]; allowedPalette?: string[] }
): Promise<MotionCheckResult> {
  const warnings: string[] = []
  const errors: string[] = []
  const bin = options?.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg'

  if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size < 256) {
    return {
      ok: false,
      frame0Black: true,
      frame0Pblack: 100,
      durationSec: 0,
      hasAudio: false,
      warnings,
      errors: [`Arquivo de vídeo ausente ou vazio: ${videoPath}`],
    }
  }

  let stderr = ''
  try {
    const res = await run(
      bin,
      ['-v', 'info', '-i', videoPath, '-vframes', '1', '-vf', 'blackframe=amount=95:threshold=24', '-f', 'null', '-'],
      { timeout: 30000 }
    )
    stderr = `${res.stdout || ''}\n${res.stderr || ''}`
  } catch (err: any) {
    stderr = `${err?.stdout || ''}\n${err?.stderr || err?.message || ''}`
  }

  const durMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  const durationSec = durMatch ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]) : 0
  const hasAudio = /Stream #\d+:\d+.*Audio:/.test(stderr)
  const { isBlack, pblack } = parseBlackframeStderr(stderr)

  if (durationSec <= 0) errors.push('Duração do vídeo não detectada ou igual a zero.')
  if (isBlack) warnings.push(`Frame 0 detectado como preto (${pblack}% escuro) — verificar abertura.`)
  if (!hasAudio) warnings.push('Vídeo sem trilha de áudio detectada.')

  if (options?.expectedColors?.length) {
    const pal = validateBrandPalette(options.expectedColors, { allowedPalette: options.allowedPalette })
    errors.push(...pal.errors)
    warnings.push(...pal.warnings)
  }

  // Lição #4 Fable 5.2 / Reverify: detecta trechos congelados (> 2.5s sem mudança visual) + estagnação no sujeito central
  let frozenSegments: FrozenSegment[] = []
  let internalFreezeSegments: FrozenSegment[] = []
  try {
    const fRes = await run(
      bin,
      ['-hide_banner', '-i', videoPath, '-vf', 'freezedetect=n=0.0005:d=2.5', '-an', '-f', 'null', '-'],
      { timeout: 30000 }
    ).catch((err: any) => ({ stdout: String(err?.stdout || ''), stderr: String(err?.stderr || '') }))
    frozenSegments = parseFreezeDetectLog(`${fRes.stdout || ''}\n${fRes.stderr || ''}`)
    if (frozenSegments.length > 0 && durationSec > 4) {
      warnings.push(`Detectado(s) ${frozenSegments.length} trecho(s) estático(s) >= 2.5s (${frozenSegments.map((s) => `${s.startSec}s-${s.endSec}s`).join(', ')}).`)
    }
  } catch {}

  try {
    const cRes = await run(
      bin,
      ['-hide_banner', '-i', videoPath, '-vf', 'crop=iw*0.55:ih*0.65:iw*0.225:ih*0.2,freezedetect=n=0.0008:d=3.5', '-an', '-f', 'null', '-'],
      { timeout: 30000 }
    ).catch((err: any) => ({ stdout: String(err?.stdout || ''), stderr: String(err?.stderr || '') }))
    internalFreezeSegments = parseFreezeDetectLog(`${cRes.stdout || ''}\n${cRes.stderr || ''}`)
    if (internalFreezeSegments.length > 0 && durationSec > 6) {
      warnings.push(
        `Sujeito central com pouca ação interna >= 3.5s (${internalFreezeSegments.map((s) => `${s.startSec}s-${s.endSec}s`).join(', ')}).`
      )
    }
  } catch {}

  return {
    ok: errors.length === 0,
    frame0Black: isBlack,
    frame0Pblack: pblack,
    durationSec,
    hasAudio,
    frozenSegments,
    internalFreezeSegments,
    warnings,
    errors,
  }
}

/**
 * Calcula similaridade estrutural (SSIM) entre dois MP4s na mesma escala (padrão HyperFrames V7).
 */
export async function measureVideoSsim(
  candidateVideoPath: string,
  referenceVideoPath: string,
  ffmpegPath?: string
): Promise<VideoSsimResult> {
  const bin = ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg'
  if (!fs.existsSync(candidateVideoPath) || !fs.existsSync(referenceVideoPath)) {
    return { ok: false, ssimAll: 0, ssimY: 0 }
  }
  try {
    const res = await run(
      bin,
      [
        '-hide_banner',
        '-i', candidateVideoPath,
        '-i', referenceVideoPath,
        '-lavfi', '[0:v]scale=480:270,setsar=1[a];[1:v]scale=480:270,setsar=1[b];[a][b]ssim=shortest=1',
        '-f', 'null', '-',
      ],
      { timeout: 60000 }
    ).catch((err: any) => ({ stdout: String(err?.stdout || ''), stderr: String(err?.stderr || '') }))
    const log = `${res.stdout || ''}\n${res.stderr || ''}`
    const m = /SSIM\s+Y:([0-9.]+)\s+[^\n]*All:([0-9.]+)/i.exec(log)
    if (!m) return { ok: false, ssimAll: 0, ssimY: 0 }
    return {
      ok: true,
      ssimY: Number(Number(m[1]).toFixed(4)),
      ssimAll: Number(Number(m[2]).toFixed(4)),
    }
  } catch {
    return { ok: false, ssimAll: 0, ssimY: 0 }
  }
}

export interface ReadabilitySceneInput {
  title?: string
  subtitle?: string
  durationSec?: number
}

/**
 * Auditor de tempo minimo de leitura (portado de Lemo-Opuscar readcheck.mjs):
 * garante permanencia suficiente para leitura (~15 caracteres/s + 1.4s de fixacao).
 */
export function checkReadabilityTiming(scenes: ReadabilitySceneInput[]): { warnings: string[] } {
  const warnings: string[] = []
  ;(scenes || []).forEach((sc, idx) => {
    const dur = Number(sc.durationSec) || 0
    const visibleText = `${String(sc.title || '').trim()} ${String(sc.subtitle || '').trim()}`.trim()
    if (!visibleText || dur <= 0) return
    const minRecommended = Number((visibleText.length / 15 + 1.4).toFixed(1))
    if (dur < minRecommended && dur < 2.2) {
      warnings.push(
        `Cena ${idx + 1} com pouco tempo de leitura (${dur.toFixed(1)}s para ${visibleText.length} chars; recomendado >= ${minRecommended}s).`
      )
    }
  })
  return { warnings }
}
