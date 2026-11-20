// Baixa um video a partir de um link, extrai frames sequenciais com timestamp e OCR visual
// via credencial de IA do proprio usuario (Gemini, OpenAI, Claude ou OpenRouter) e monta um
// template estrutural replicavel direto no /flow.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { detectPlatform } from './utils'
import { VideoCaptureService, urlToId } from './video-capture'
import { VideoAnalysisService } from './video-analysis'
import { ffmpegBin, transcribeWhisper } from './flow-assemble'
import { callFlowVisionLLM, type FlowProvider, type FlowVisionImage } from './flow-llm'
import {
  extractJson,
  FLOW_SFX,
  FLOW_TRANSITIONS,
  type FlowParams,
  type FlowSfx,
  type FlowTakeKind,
  type FlowTransition,
} from './flow-script'
import { clampSecondsForModel, MAX_TAKES, type FlowProductionMode, type FlowTemplate } from './flow-template-base'
import type {
  BreathPauseSegment,
  CharacterAndEnvBlueprint,
  ClonedBeatSourceType,
  ClonedRecommendedEngine,
  ClonedSceneBeat,
  ClonedStoryBible,
  CloneCustomization,
  FlowClonedStructure,
  ReverseEngineeredEditingMetrics,
} from './flow-clone-types'
import { normalizeHex, recommendBpmRange, validateBrandPalette, type MotionEnergy } from './motion-checks'

const run = promisify(execFile)

interface VideoMeta {
  durationSec: number
  aspect: '9:16' | '16:9'
}

/** Mede duracao real e proporcao (vertical 9:16 vs horizontal 16:9) via ffprobe. */
async function probeVideoMeta(videoPath: string): Promise<VideoMeta> {
  try {
    const { stdout } = await run(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-show_entries', 'format=duration', '-of', 'json', videoPath],
      { timeout: 15000 }
    )
    const parsed = JSON.parse(stdout || '{}')
    const stream = Array.isArray(parsed.streams) ? parsed.streams[0] : undefined
    const w = Number(stream?.width) || 0
    const h = Number(stream?.height) || 0
    const dur = Math.max(4, Math.round(Number(parsed.format?.duration) || 30))
    const aspect: '9:16' | '16:9' = w > 0 && h > 0 && w > h ? '16:9' : '9:16'
    return { durationSec: dur, aspect }
  } catch {
    return { durationSec: 30, aspect: '9:16' }
  }
}

/** Detecta os timestamps exatos de cortes reais de cena via filtro select/showinfo do FFmpeg. */
export async function detectRealSceneCuts(videoPath: string | undefined, durationSec: number): Promise<number[]> {
  if (!videoPath || !fs.existsSync(videoPath)) return []
  try {
    const res = await run(
      ffmpegBin(),
      ['-hide_banner', '-i', videoPath, '-vf', "select='gt(scene,0.28)',showinfo", '-f', 'null', '-'],
      { timeout: 30000, maxBuffer: 8 * 1024 * 1024 }
    ).catch((err: any) => ({ stdout: String(err?.stdout || ''), stderr: String(err?.stderr || '') }))
    const log = `${res.stdout || ''}\n${res.stderr || ''}`
    const cuts: number[] = []
    const re = /pts_time:([0-9]+(?:\.[0-9]+)?)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(log)) !== null) {
      const ts = Number(m[1])
      if (Number.isFinite(ts) && ts > 0.25 && ts < durationSec - 0.25) {
        if (!cuts.length || ts - cuts[cuts.length - 1] >= 0.4) {
          cuts.push(Number(ts.toFixed(2)))
        }
      }
    }
    return cuts
  } catch {
    return []
  }
}

/**
 * Escuta os espacos de respiracao e pausas naturais do audio via FFmpeg silencedetect,
 * permitindo que animacoes, legendas e respiros dramaticos acompanhem o ritmo real.
 */
export async function detectAudioBreathPauses(
  audioOrVideoPath: string | undefined,
  durationSec: number
): Promise<{ pauses: BreathPauseSegment[]; silentRatioPct: number }> {
  if (!audioOrVideoPath || !fs.existsSync(audioOrVideoPath)) {
    return { pauses: [], silentRatioPct: 0 }
  }
  try {
    const res = await run(
      ffmpegBin(),
      ['-hide_banner', '-i', audioOrVideoPath, '-af', 'silencedetect=noise=-32dB:d=0.35', '-vn', '-f', 'null', '-'],
      { timeout: 25000, maxBuffer: 4 * 1024 * 1024 }
    ).catch((err: any) => ({ stdout: String(err?.stdout || ''), stderr: String(err?.stderr || '') }))
    const log = `${res.stdout || ''}\n${res.stderr || ''}`
    const pauses: BreathPauseSegment[] = []
    let openStart: number | null = null
    for (const line of log.split('\n')) {
      const ms = /silence_start:\s*([0-9.]+)/.exec(line)
      if (ms) openStart = Number(ms[1])
      const me = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/.exec(line)
      if (me) {
        const endSec = Number(me[1])
        const durSec = Number(me[2])
        const startSec = openStart !== null ? openStart : Math.max(0, endSec - durSec)
        if (Number.isFinite(durSec) && durSec >= 0.35) {
          pauses.push({
            startSec: Number(startSec.toFixed(2)),
            endSec: Number(endSec.toFixed(2)),
            durationSec: Number(durSec.toFixed(2)),
          })
        }
        openStart = null
      }
    }
    const silentSum = pauses.reduce((acc, p) => acc + p.durationSec, 0)
    const silentRatioPct = durationSec > 0 ? Number(Math.min(100, (silentSum / durationSec) * 100).toFixed(1)) : 0
    return { pauses: pauses.slice(0, 32), silentRatioPct }
  } catch {
    return { pauses: [], silentRatioPct: 0 }
  }
}

/** Calcula metricas matematicas de edicao (Median Shot Length, CPM, WPM e respirações de áudio). */
function computeEditingMetrics(
  cutTimestamps: number[],
  durationSec: number,
  transcript: string,
  contactSheetPath?: string,
  breathInfo?: { pauses: BreathPauseSegment[]; silentRatioPct: number }
): ReverseEngineeredEditingMetrics {
  const safeDur = Math.max(4, durationSec)
  const sorted = [...cutTimestamps].filter((t) => t > 0 && t < safeDur).sort((a, b) => a - b)
  const boundaries = [0, ...sorted, safeDur]
  const shotLengths: number[] = []
  for (let i = 1; i < boundaries.length; i++) {
    const len = boundaries[i] - boundaries[i - 1]
    if (len > 0.2) shotLengths.push(len)
  }
  shotLengths.sort((a, b) => a - b)
  const mid = Math.floor(shotLengths.length / 2)
  const medianShotLengthSec = shotLengths.length
    ? Number(
        (shotLengths.length % 2 !== 0
          ? shotLengths[mid]
          : (shotLengths[mid - 1] + shotLengths[mid]) / 2
        ).toFixed(2)
      )
    : Number(safeDur.toFixed(2))
  const cutsPerMinute = Number(((sorted.length / safeDur) * 60).toFixed(1))
  const cleanWords = transcript.replace(/\[[0-9.]+s\]/g, '').trim().split(/\s+/).filter(Boolean)
  const wordsPerMinute = cleanWords.length > 0 ? Math.round((cleanWords.length / safeDur) * 60) : 0
  const hookDurationSec = Number((sorted[0] || Math.min(3.5, safeDur)).toFixed(2))

  return {
    detectedCutsCount: sorted.length,
    cutTimestampsSec: sorted.slice(0, 40),
    medianShotLengthSec,
    cutsPerMinute,
    wordsPerMinute,
    hookDurationSec,
    ...(contactSheetPath ? { contactSheetPath } : {}),
    ...(breathInfo?.pauses?.length ? { breathPauses: breathInfo.pauses, silentRatioPct: breathInfo.silentRatioPct } : {}),
  }
}

/** Extrai ate 16 frames nitidos priorizando cortes reais detectados e gera Contact Sheet visual em disco. */
async function extractLabeledFrames(
  videoPath: string | undefined,
  durationSec: number,
  fallbackFrames: string[],
  cutTimestamps: number[] = [],
  fileId: string = 'clip'
): Promise<{ frames: FlowVisionImage[]; contactSheetPath?: string }> {
  const out: FlowVisionImage[] = []
  let contactSheetPath: string | undefined

  if (videoPath && fs.existsSync(videoPath)) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow_clone_'))
    const scaleFilter = "scale=w='if(gt(iw,ih),1024,-2)':h='if(gt(iw,ih),-2,1024)'"
    const isLongForm = durationSec > 90
    const cutTargets = cutTimestamps
      .map((ts) => Math.min(Math.max(0.2, ts + 0.15), Math.max(0.3, durationSec - 0.2)))
      .slice(0, isLongForm ? 6 : 14)

    const uniformTargets: number[] = []
    const uniformCount = isLongForm ? 12 : Math.min(16, Math.max(6, Math.ceil(durationSec / 2.5)))
    for (let i = 0; i < uniformCount; i++) {
      const ts =
        uniformCount === 1
          ? 0.2
          : Math.min(Math.max(0.2, (i * Math.max(durationSec - 0.4, 1)) / (uniformCount - 1)), Math.max(0.2, durationSec - 0.2))
      uniformTargets.push(Number(ts.toFixed(2)))
    }

    const targets: number[] = [0.2]
    const priorityOrder = isLongForm ? [...uniformTargets, ...cutTargets] : [...cutTargets, ...uniformTargets]
    for (const ts of priorityOrder) {
      if (targets.length >= 16) break
      const minGap = isLongForm ? Math.max(1.5, durationSec / 28) : 0.85
      if (!targets.some((existing) => Math.abs(existing - ts) < minGap)) {
        targets.push(Number(ts.toFixed(2)))
      }
    }
    targets.sort((a, b) => a - b)

    const savedPaths: string[] = []
    try {
      for (let i = 0; i < targets.length; i++) {
        const ts = targets[i]
        const fp = path.join(tmpDir, `frame_${String(i).padStart(2, '0')}.jpg`)
        try {
          await run(
            ffmpegBin(),
            ['-ss', ts.toFixed(2), '-i', videoPath, '-frames:v', '1', '-vf', scaleFilter, '-q:v', '3', '-y', fp],
            { timeout: 15000 }
          )
          if (fs.existsSync(fp) && fs.statSync(fp).size > 0) {
            savedPaths.push(fp)
            const isCut = cutTargets.some((c) => Math.abs(c - ts) < 0.2)
            out.push({
              dataBase64: fs.readFileSync(fp).toString('base64'),
              mimeType: 'image/jpeg',
              label: `[Frame ${i + 1}/${targets.length} em ${ts.toFixed(1)}s${isCut ? ' • PÓS-CORTE' : ''}]`,
            })
          }
        } catch {
          // Segue para os demais frames mesmo se um timestamp falhar
        }
      }

      const stripCandidates = isLongForm
        ? [0.2, Number((durationSec * 0.42).toFixed(1)), Number((durationSec * 0.80).toFixed(1))]
        : [0.2, ...cutTimestamps.slice(0, 2)].slice(0, 3)
      for (let sIdx = 0; sIdx < stripCandidates.length; sIdx++) {
        const anchor = stripCandidates[sIdx]
        const subPaths: string[] = []
        for (let k = 0; k < 4; k++) {
          const st = Math.min(Math.max(0.1, durationSec - 0.15), anchor + k * 0.45)
          const subFp = path.join(tmpDir, `strip_${sIdx}_${k}.jpg`)
          await run(
            ffmpegBin(),
            ['-ss', st.toFixed(2), '-i', videoPath, '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '4', '-y', subFp],
            { timeout: 10000 }
          ).catch(() => {})
          if (fs.existsSync(subFp)) subPaths.push(subFp)
        }
        if (subPaths.length === 4) {
          const stripOut = path.join(tmpDir, `strip_tile_${sIdx}.jpg`)
          await run(
            ffmpegBin(),
            ['-y', '-i', path.join(tmpDir, `strip_${sIdx}_%d.jpg`), '-vf', 'tile=4x1:padding=4:color=#0f172a', '-q:v', '3', stripOut],
            { timeout: 12000 }
          ).catch(() => {})
          if (fs.existsSync(stripOut) && fs.statSync(stripOut).size > 500) {
            out.push({
              dataBase64: fs.readFileSync(stripOut).toString('base64'),
              mimeType: 'image/jpeg',
              label: `[Tira Temporal _strip Cena ${sIdx + 1} (${anchor.toFixed(1)}s..${(anchor + 1.35).toFixed(1)}s) — observe direção de câmera e movimento]`,
            })
          }
        }
      }

      if (savedPaths.length >= 4) {
        const cols = savedPaths.length >= 9 ? 4 : savedPaths.length >= 4 ? 2 : savedPaths.length
        const rows = Math.ceil(savedPaths.length / cols)
        const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp/contact_sheets' : path.join(process.cwd(), 'tmp', 'contact_sheets')
        fs.mkdirSync(baseTmp, { recursive: true })
        const sheetOut = path.join(baseTmp, `contact_${fileId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpg`)
        try {
          await run(
            ffmpegBin(),
            [
              '-y',
              '-pattern_type',
              'glob',
              '-i',
              path.join(tmpDir, 'frame_*.jpg'),
              '-vf',
              `scale=360:-2,tile=${cols}x${rows}:padding=6:color=#111827`,
              '-q:v',
              '3',
              sheetOut,
            ],
            { timeout: 20000 }
          ).catch(async () => {
            // Windows FFmpeg nao aceita -pattern_type glob; usa sequencia numerada frame_%02d.jpg
            await run(
              ffmpegBin(),
              [
                '-y',
                '-i',
                path.join(tmpDir, 'frame_%02d.jpg'),
                '-vf',
                `scale=360:-2,tile=${cols}x${rows}:padding=6:color=#111827`,
                '-q:v',
                '3',
                sheetOut,
              ],
              { timeout: 20000 }
            )
          })
          if (fs.existsSync(sheetOut) && fs.statSync(sheetOut).size > 1000) {
            contactSheetPath = sheetOut
          }
        } catch {
          // Contact sheet e opcional; frames individuais ja estao em memoria
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
    if (out.length > 0) return { frames: out, contactSheetPath }
  }

  for (let i = 0; i < Math.min(fallbackFrames.length, 16); i++) {
    const f = fallbackFrames[i]
    if (f && fs.existsSync(f)) {
      out.push({
        dataBase64: fs.readFileSync(f).toString('base64'),
        mimeType: 'image/jpeg',
        label: `[Frame/Capa ${i + 1}]`,
      })
    }
  }
  return { frames: out }
}

function normalizeStructure(
  raw: any,
  ctx: {
    url: string
    platform: string
    durationSec: number
    aspect: '9:16' | '16:9'
    transcript: string
    framesAnalyzed: number
    provider: FlowProvider
    usedFallbackThumbs: boolean
    editingMetrics?: ReverseEngineeredEditingMetrics
  }
): FlowClonedStructure {
  const modeRaw = String(raw?.mode || '').trim().toLowerCase()
  const mode: FlowProductionMode = (['dialogo', 'narracao', 'ambiente', 'livre'] as const).includes(modeRaw as any)
    ? (modeRaw as FlowProductionMode)
    : ctx.transcript.trim().length > 15
      ? 'livre'
      : 'ambiente'

  const rawModel = String(raw?.recommendedModel || '').trim()
  const recommendedModel =
    rawModel && /(omni|veo)/i.test(rawModel)
      ? rawModel
      : mode === 'dialogo' || mode === 'livre'
        ? 'Omni 1.2 Flash'
        : 'Veo 3.1 - Fast'

  const rawSeconds = Number(raw?.recommendedSeconds) || 6
  const recommendedSeconds = clampSecondsForModel(rawSeconds, recommendedModel)

  const rawBeats: any[] = Array.isArray(raw?.beats) ? raw.beats : []
  const beats: ClonedSceneBeat[] = rawBeats.slice(0, MAX_TAKES).map((b, i) => {
    const kindRaw = String(b?.kind || '').trim().toLowerCase()
    const kind: FlowTakeKind = (['dialogo', 'narracao', 'ambiente'] as const).includes(kindRaw as any)
      ? (kindRaw as FlowTakeKind)
      : mode === 'ambiente' || mode === 'narracao' || mode === 'dialogo'
        ? mode
        : 'dialogo'
    const tr = String(b?.transition || '').trim()
    const transition: FlowTransition = (FLOW_TRANSITIONS as readonly string[]).includes(tr) ? (tr as FlowTransition) : 'cut'
    const sfxRaw = String(b?.sfx || '').trim()
    const sfx: FlowSfx = (FLOW_SFX as readonly string[]).includes(sfxRaw) ? (sfxRaw as FlowSfx) : 'none'
    const presence = String(b?.presence || '').trim().toLowerCase() === 'faceless' ? 'faceless' : 'character'
    const stRaw = String(b?.sourceType || '').trim().toLowerCase()
    const sourceType: ClonedBeatSourceType =
      stRaw === 'coded_html_svg' || stRaw === 'coded' || stRaw === 'html_svg'
        ? 'coded_html_svg'
        : stRaw === 'ai_generated' || stRaw === 'ai'
          ? 'ai_generated'
          : 'filmed'
    return {
      n: i + 1,
      timestamp: String(b?.timestamp || `${i * recommendedSeconds}s-${(i + 1) * recommendedSeconds}s`).slice(0, 30),
      durationSec: Math.max(4, Math.min(10, Math.round(Number(b?.durationSec) || recommendedSeconds))),
      beat: String(b?.beat || `Cena ${i + 1}`).slice(0, 220),
      kind,
      camera: String(b?.camera || 'medium close-up, steady framing').slice(0, 180),
      action: String(b?.action || '').slice(0, 260),
      ocrText: String(b?.ocrText || '').slice(0, 240),
      spokenSummary: String(b?.spokenSummary || '').slice(0, 240),
      transition,
      sfx,
      presence,
      sourceType,
      ...(Array.isArray(b?.visualComponents) && b.visualComponents.length
        ? { visualComponents: b.visualComponents.map((vc: any) => String(vc || '').trim()).filter(Boolean).slice(0, 8) }
        : {}),
      ...(b?.scriptVisualBinding ? { scriptVisualBinding: String(b.scriptVisualBinding).slice(0, 220) } : {}),
    }
  })

  if (beats.length === 0) {
    const fallbackTakes = Math.min(MAX_TAKES, Math.max(3, Math.round(ctx.durationSec / recommendedSeconds)))
    for (let i = 0; i < fallbackTakes; i++) {
      beats.push({
        n: i + 1,
        timestamp: `${i * recommendedSeconds}s-${(i + 1) * recommendedSeconds}s`,
        durationSec: recommendedSeconds,
        beat: i === 0 ? 'Gancho inicial de atenção' : i === fallbackTakes - 1 ? 'Fechamento / Payoff' : `Desenvolvimento ${i}`,
        kind: mode === 'ambiente' ? 'ambiente' : mode === 'narracao' ? 'narracao' : 'dialogo',
        camera: i === 0 ? 'close-up, slight push-in' : 'medium shot, motivated camera',
        action: String(raw?.summary || 'Main action matching the reference pacing').slice(0, 200),
        ocrText: '',
        spokenSummary: '',
        transition: i === 0 ? 'zoom_punch' : 'cut',
        sfx: i === 0 ? 'whoosh' : 'none',
        presence: mode === 'ambiente' ? 'faceless' : 'character',
      })
    }
  }

  const recommendedTakes = Math.min(MAX_TAKES, Math.max(2, Math.round(Number(raw?.recommendedTakes) || beats.length)))
  const ocrTexts: string[] = Array.isArray(raw?.ocrTexts)
    ? raw.ocrTexts.map((t: any) => String(t || '').trim()).filter(Boolean).slice(0, 30)
    : Array.from(new Set(beats.map((b) => b.ocrText).filter(Boolean)))

  const rawPal: string[] = Array.isArray(raw?.paletteHex)
    ? raw.paletteHex.map((c: any) => normalizeHex(String(c || ''))).filter(Boolean) as string[]
    : []
  const paletteHex = validateBrandPalette(rawPal, { maxColors: 3 }).normalized.slice(0, 3)

  const energyRaw = String(raw?.energy || '').trim().toLowerCase()
  const energy: MotionEnergy =
    energyRaw === 'cinematografico' || energyRaw === 'cinetico' ? energyRaw : 'fluido'

  const VALID_ENGINES: readonly ClonedRecommendedEngine[] = [
    'bean_2d_3d',
    'stickman_2d_3d',
    'netflix_doc',
    'dossie_2d',
    'mapa_3d',
    'atlas_3d',
    'fern_3d',
    'html_svg',
    'remotion',
    'flow',
  ]
  const codedCount = beats.filter((b) => b.sourceType === 'coded_html_svg').length
  const engineRaw = String(raw?.recommendedEngine || '').trim().toLowerCase()
  const recommendedEngine: ClonedRecommendedEngine = (VALID_ENGINES as readonly string[]).includes(engineRaw)
    ? (engineRaw as ClonedRecommendedEngine)
    : codedCount >= Math.ceil(beats.length / 2)
      ? 'html_svg'
      : 'flow'

  const rawBible = raw?.storyBible && typeof raw.storyBible === 'object' ? raw.storyBible : null
  const storyBible: ClonedStoryBible = {
    seriesTitle: String(rawBible?.seriesTitle || raw?.title || 'Série Viral DarkTube').slice(0, 120),
    characterArchetype: String(
      rawBible?.characterArchetype ||
        (Array.isArray(raw?.detectedCharacters) && raw.detectedCharacters[0]) ||
        'Protagonista expressivo consistente'
    ).slice(0, 180),
    characterVisualLock: String(
      rawBible?.characterVisualLock ||
        (Array.isArray(raw?.detectedCharacters) ? raw.detectedCharacters.join('; ') : 'Consistência visual fixa por sprite/âncora')
    ).slice(0, 320),
    worldSettingLock: String(
      rawBible?.worldSettingLock ||
        (Array.isArray(raw?.detectedLocations) ? raw.detectedLocations.join('; ') : 'Cenário contínuo com iluminação dramática')
    ).slice(0, 260),
    recurringHookFormula: String(rawBible?.recurringHookFormula || beats[0]?.beat || 'Gancho visual e pergunta aberta nos primeiros 2s').slice(0, 220),
    cliffhangerFormula: String(
      rawBible?.cliffhangerFormula || beats[beats.length - 1]?.beat || 'Fechamento com revelação ou gancho para Parte 2'
    ).slice(0, 220),
    captionStyle: String(rawBible?.captionStyle || '2 palavras em destaque inferior com contorno forte').slice(0, 160),
  }

  const rawBp = raw?.characterAndEnvBlueprint && typeof raw.characterAndEnvBlueprint === 'object' ? raw.characterAndEnvBlueprint : null
  const toStrList = (arr: any, max = 8): string[] =>
    Array.isArray(arr) ? arr.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, max) : []
  const characterAndEnvBlueprint: CharacterAndEnvBlueprint | undefined = rawBp
    ? {
        characterRigStyle: String(rawBp.characterRigStyle || '').slice(0, 220),
        characterProportions: String(rawBp.characterProportions || '').slice(0, 220),
        clothingAndProps: toStrList(rawBp.clothingAndProps, 8),
        environmentLayers: toStrList(rawBp.environmentLayers, 8),
        hudAndOverlayGrammar: toStrList(rawBp.hudAndOverlayGrammar, 8),
        internalMotionTriggers: toStrList(rawBp.internalMotionTriggers, 8),
      }
    : undefined

  return {
    sourceUrl: ctx.url,
    sourcePlatform: ctx.platform,
    title: String(raw?.title || 'Estrutura clonada de vídeo').slice(0, 120),
    summary: String(raw?.summary || '').slice(0, 600),
    durationSec: Number(raw?.durationSec) || ctx.durationSec,
    aspect: raw?.aspect === '16:9' ? '16:9' : ctx.aspect,
    mode,
    visualStyle: String(raw?.visualStyle || 'cinematografico').slice(0, 60),
    pacing: String(raw?.pacing || 'dinamico').slice(0, 60),
    language: String(raw?.language || 'pt-BR').slice(0, 20),
    ocrTexts,
    transcript: ctx.transcript.slice(0, 10000),
    detectedCharacters: Array.isArray(raw?.detectedCharacters)
      ? raw.detectedCharacters.map((c: any) => String(c || '').trim()).filter(Boolean).slice(0, 6)
      : [],
    detectedLocations: Array.isArray(raw?.detectedLocations)
      ? raw.detectedLocations.map((l: any) => String(l || '').trim()).filter(Boolean).slice(0, 6)
      : [],
    beats,
    framesAnalyzed: ctx.framesAnalyzed,
    recommendedTakes,
    recommendedSeconds,
    recommendedModel,
    recommendedEngine,
    ...(raw?.recommendedPreset ? { recommendedPreset: String(raw.recommendedPreset).trim().slice(0, 60) } : {}),
    paletteHex,
    energy,
    ...(ctx.editingMetrics ? { editingMetrics: ctx.editingMetrics } : {}),
    storyBible,
    ...(characterAndEnvBlueprint ? { characterAndEnvBlueprint } : {}),
    providerUsed: ctx.provider,
    usedFallbackThumbs: ctx.usedFallbackThumbs,
  }
}

/**
 * Baixa o video de um link, extrai frames + audio/transcricao e faz engenharia reversa
 * frame a frame com OCR usando a credencial do usuario (Gemini, OpenAI, Claude ou OpenRouter).
 */
export async function analyzeVideoStructureFromLink(input: {
  url: string
  provider: FlowProvider
  apiKey: string
  openaiKey?: string | null
  fallbackCredentials?: Array<{ provider: FlowProvider; apiKey: string }>
}): Promise<FlowClonedStructure> {
  const cleanUrl = input.url.trim()
  if (!/^https?:\/\//i.test(cleanUrl)) throw new Error('Cole uma URL válida começando com http:// ou https://.')
  const platform = detectPlatform(cleanUrl)
  const fileId = urlToId(cleanUrl)
  let transcript = ''
  let fullAudioTmp = ''

  if (platform === 'youtube') {
    const match = cleanUrl.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (match) transcript = await VideoAnalysisService.getTranscript(match[1]).catch(() => '')
  }

  try {
    const download = await VideoCaptureService.downloadFromUrl(cleanUrl)
    const meta = download.videoPath ? await probeVideoMeta(download.videoPath) : { durationSec: 30, aspect: '9:16' as const }

    // Se houver chave OpenAI (ou do usuario), transcreve o audio completo (ate 5 min; o download padrao corta em 60s)
    const whisperKey = input.openaiKey || (input.provider === 'openai' ? input.apiKey : '')
    if (!transcript && whisperKey && (download.audioPath || download.videoPath)) {
      let audioSrc = download.audioPath || download.videoPath!
      if (meta.durationSec > 60 && download.videoPath && fs.existsSync(download.videoPath)) {
        fullAudioTmp = path.join(os.tmpdir(), `flow_clone_full_${Date.now()}.mp3`)
        try {
          await run(ffmpegBin(), ['-y', '-i', download.videoPath, '-t', '300', '-vn', '-ac', '1', '-b:a', '32k', fullAudioTmp], { timeout: 30000 })
          if (fs.existsSync(fullAudioTmp) && fs.statSync(fullAudioTmp).size > 1000) audioSrc = fullAudioTmp
        } catch {}
      }
      const words = await transcribeWhisper(audioSrc, undefined, whisperKey).catch(() => null)
      if (words && words.length > 0) {
        transcript = words.map((w) => `[${w.start.toFixed(1)}s] ${w.word}`).join(' ')
      }
    }

    const realCuts = await detectRealSceneCuts(download.videoPath, meta.durationSec)
    const breathInfo = await detectAudioBreathPauses(download.audioPath || download.videoPath, meta.durationSec)
    const { frames, contactSheetPath } = await extractLabeledFrames(
      download.videoPath,
      meta.durationSec,
      download.framePaths || [],
      realCuts,
      fileId
    )
    if (frames.length === 0) throw new Error('Não foi possível extrair frames deste vídeo para análise.')
    const editingMetrics = computeEditingMetrics(realCuts, meta.durationSec, transcript, contactSheetPath, breathInfo)

    const system = `You are a senior viral-video reverse engineer and visual OCR analyst.
You will inspect sequential frames extracted from a reference video (plus exact detected cut timestamps, editing math and audio transcript when available).
Your job is to understand EVERY visual beat, scene cut, camera framing, motion, on-screen OCR text, narrative hook, pacing and audio style so the user can replicate the EXACT structural blueprint while swapping character, story or setting.

Reply with ONE valid JSON object matching this exact schema:
{
  "title": "short descriptive title of the analyzed video (PT-BR)",
  "summary": "2-3 sentences explaining the exact viral structure, hook mechanism and retention pattern (PT-BR)",
  "mode": "dialogo | narracao | ambiente | livre",
  "visualStyle": "cinematografico | natural | suspense | 3d_toy | 2d_ilustrado | bean_2d_3d | fern_3d | dossie_2d | mapa_3d",
  "pacing": "frenetico | dinamico | equilibrado | cadenciado",
  "language": "pt-BR | en-US | es-ES",
  "recommendedTakes": number (between 2 and 12),
  "recommendedSeconds": 4 | 6 | 8 | 10,
  "recommendedModel": "Omni 1.2 Flash" | "Veo 3.1 - Fast" | "Veo 3.1 - Quality",
  "recommendedEngine": "bean_2d_3d | stickman_2d_3d | netflix_doc | dossie_2d | mapa_3d | atlas_3d | fern_3d | html_svg | remotion | flow",
  "recommendedPreset": "html_svg_ampulheta_doc | html_svg_silhouette_film | html_svg_2d_puppet | html_svg_vox_papercut | html_svg_netflix_doc | cartoon_25d_demo | null",
  "paletteHex": ["#0B1020", "#38BDF8", "#FACC15"],
  "energy": "cinematografico | fluido | cinetico",
  "characterAndEnvBlueprint": {
    "characterRigStyle": "descrição técnica da anatomia, traço, olhos, cabelo/barba, braços e pernas dos personagens (PT-BR)",
    "characterProportions": "proporção cabeça/tronco/pernas, se aparecem de corpo inteiro, atrás de mesa ou em perfil (PT-BR)",
    "clothingAndProps": ["peças de figurino e objetos recorrentes em cena"],
    "environmentLayers": ["camadas de fundo, horizonte, texturas, iluminação e profundidade"],
    "hudAndOverlayGrammar": ["selos de data/ano, legendas de local, barras/pílulas de tópicos, cards comparativos"],
    "internalMotionTriggers": ["micro-movimentos contínuos que mantêm cenas longas vivas sem parecer frozen"]
  },
  "storyBible": {
    "seriesTitle": "nome/conceito da série ou formato replicável (PT-BR)",
    "characterArchetype": "arquétipo do personagem recorrente ou narrador visual (PT-BR)",
    "characterVisualLock": "regras visuais fixas de contorno/traço/figurino para manter 100% de consistência (PT-BR)",
    "worldSettingLock": "regras de cenário, iluminação e profundidade entre episódios (PT-BR)",
    "recurringHookFormula": "fórmula de gancho dos primeiros 2 segundos (PT-BR)",
    "cliffhangerFormula": "fórmula de fechamento/comentário/gancho para parte 2 (PT-BR)",
    "captionStyle": "posição, quantidade de palavras, tipografia e cor da legenda observada (PT-BR)"
  },
  "ocrTexts": ["exact text read on screen across frames, in chronological order"],
  "detectedCharacters": ["visual summary of each recurring person/character seen in the video (in English, adult wording)"],
  "detectedLocations": ["visual summary of each environment/location seen in the video (in English)"],
  "beats": [
    {
      "n": 1,
      "timestamp": "0.0s-4.0s",
      "durationSec": 4 | 6 | 8 | 10,
      "beat": "narrative function of this beat (in PT-BR, e.g. 'Gancho visual com pergunta provocativa')",
      "kind": "dialogo | narracao | ambiente",
      "camera": "exact framing, lens & movement seen (in English, e.g. 'tight close-up, eye-level, subtle handheld')",
      "action": "concrete visual action seen in these frames (in English)",
      "ocrText": "exact on-screen text / caption / title visible in this beat, or empty string",
      "spokenSummary": "what is spoken or communicated in this beat (in the video language), or empty string",
      "transition": "cut | white_flash | whip_pan | zoom_punch | crossfade | glitch",
      "sfx": "whoosh | camera_click | bass_drop | paper_rustle | pop | none",
      "presence": "character | faceless",
      "sourceType": "filmed | ai_generated | coded_html_svg",
      "visualComponents": ["explicit visual components/layers in frame with positions (e.g. bg_blurred_shelves, fg_silhouette_runner, prop_phone_530)"],
      "scriptVisualBinding": "how what is spoken/read in this timestamp connects 1:1 to a concrete component visible on screen"
    }
  ]
}

Rules:
- Read ALL on-screen text carefully (OCR): headlines, top banners, burned-in captions, product labels, CTAs.
- Group consecutive frames that belong to the same continuous shot/scene into coherent beats (around ${Math.max(3, Math.min(16, Math.round(meta.durationSec / (meta.durationSec > 90 ? 18 : 6))))} beats covering the full ${meta.durationSec}s duration, not only the first minute).
- Identify accurately whether characters talk on camera ("dialogo"), there is an off-screen voiceover ("narracao"), only visuals/ambient sound ("ambiente"), or a mix ("livre").
- Always write beat descriptions/summary/title in PT-BR, and camera/action/detectedCharacters/detectedLocations in English.`

    const userPrompt = [
      `URL de origem: ${cleanUrl} (${platform})`,
      `Duração medida: ${meta.durationSec}s | Formato detectado: ${meta.aspect}`,
      `Métricas matemáticas de edição (FFmpeg scdet + silencedetect): ${editingMetrics.detectedCutsCount} cortes reais detectados | Duração mediana do plano: ${editingMetrics.medianShotLengthSec}s | Cortes/min: ${editingMetrics.cutsPerMinute} | WPM: ${editingMetrics.wordsPerMinute} | Silêncio/Respiração: ${editingMetrics.silentRatioPct ?? 0}%`,
      editingMetrics.cutTimestampsSec.length ? `Timestamps dos cortes reais (s): ${editingMetrics.cutTimestampsSec.join(', ')}` : '',
      editingMetrics.breathPauses?.length ? `Pausas de respiração/silêncio detectadas no áudio (s): ${editingMetrics.breathPauses.slice(0, 12).map((p) => `${p.startSec}-${p.endSec}s`).join(', ')}` : '',
      `Total de frames e tiras temporais anexados em ordem cronológica: ${frames.length}`,
      transcript ? `\nTranscrição do áudio original:\n${transcript.slice(0, 9000)}` : '\n(Sem transcrição de áudio prévia — analise pelos frames e OCR visual.)',
      '\nAnalise os frames abaixo em ordem cronológica, leia todo o OCR visível, preencha o objeto storyBible para permitir clonagem em série/estilo e devolva o JSON estruturado cobrindo toda a duração do vídeo.',
    ]
      .filter(Boolean)
      .join('\n')

    const candidates: Array<{ provider: FlowProvider; apiKey: string }> = [
      { provider: input.provider, apiKey: input.apiKey },
      ...(input.fallbackCredentials || []).filter((c) => c.provider !== input.provider && Boolean(c.apiKey)),
    ]
    let rawText = ''
    let usedProvider: FlowProvider = input.provider
    let lastErr: unknown = null
    for (const c of candidates) {
      try {
        rawText = await callFlowVisionLLM(c.provider, c.apiKey, system, userPrompt, frames)
        usedProvider = c.provider
        lastErr = null
        break
      } catch (err) {
        lastErr = err
      }
    }
    if (lastErr) throw lastErr
    const parsed = extractJson(rawText)

    return normalizeStructure(parsed, {
      url: cleanUrl,
      platform,
      durationSec: meta.durationSec,
      aspect: meta.aspect,
      transcript,
      framesAnalyzed: frames.length,
      provider: usedProvider,
      usedFallbackThumbs: Boolean(download.isFallback),
      editingMetrics,
    })
  } finally {
    if (fullAudioTmp && fs.existsSync(fullAudioTmp)) {
      try { fs.unlinkSync(fullAudioTmp) } catch {}
    }
    await VideoCaptureService.cleanupVideo(fileId).catch(() => {})
    const baseTmp = process.env.NODE_ENV === 'production' ? '/app/tmp' : path.join(process.cwd(), 'tmp')
    try {
      const v = path.join(baseTmp, 'videos', `${fileId}.mp4`)
      const a = path.join(baseTmp, 'videos', `${fileId}.aac`)
      const f = path.join(baseTmp, 'frames', fileId)
      if (fs.existsSync(v)) fs.unlinkSync(v)
      if (fs.existsSync(a)) fs.unlinkSync(a)
      if (fs.existsSync(f)) fs.rmSync(f, { recursive: true, force: true })
    } catch {}
  }
}

/**
 * Converte a estrutura extraida + substituicoes do usuario em um FlowTemplate dinamico
 * (id 'livre' para compatibilidade total com edicao, checks, montagem e publicacao).
 */
export function buildCloneTemplateAndParams(
  structure: FlowClonedStructure,
  custom: CloneCustomization,
  baseParams: FlowParams
): { template: FlowTemplate; params: FlowParams } {
  const newTheme = String(custom.newTheme || '').trim()
  const newCharacter = String(custom.newCharacter || '').trim()
  const newLocation = String(custom.newLocation || '').trim()
  const keepInstructions = String(custom.keepInstructions || '').trim()

  const ocrBlock = structure.ocrTexts.length
    ? `On-screen OCR texts captured from original video (use as hook/copy pacing inspiration for spoken lines, never draw text inside generated video frames):\n- ${structure.ocrTexts.join('\n- ')}`
    : ''

  const beatsSummary = structure.beats
    .map(
      (b) =>
        `Beat ${b.n} (${b.timestamp}, ${b.durationSec}s, kind=${b.kind}, transition=${b.transition}, sfx=${b.sfx}): ${b.beat} | Camera: ${b.camera} | Visual: ${b.action}${b.visualComponents?.length ? ` | Components: [${b.visualComponents.join(', ')}]` : ''}${b.scriptVisualBinding ? ` | Script->Visual: ${b.scriptVisualBinding}` : ''}${b.ocrText ? ` | Original OCR: "${b.ocrText}"` : ''}${b.spokenSummary ? ` | Original line meaning: "${b.spokenSummary}"` : ''}`
    )
    .join('\n')
  const breathRule = structure.editingMetrics?.breathPauses?.length
    ? `- AUDIO BREATHING & SILENCE TIMING: Reference audio has ${structure.editingMetrics.silentRatioPct ?? 0}% breathing/pause space (${structure.editingMetrics.breathPauses.slice(0, 6).map((p) => `${p.startSec}s-${p.endSec}s`).join(', ')}). Leave intentional visual holds and scene cuts on natural breathing pauses.`
    : ''

  const template: FlowTemplate = {
    id: 'livre',
    niche: 'Clonado',
    subniche: structure.sourcePlatform,
    name: `Clonado: ${structure.title}`.slice(0, 80),
    description: structure.summary || 'Roteiro replicado a partir da estrutura de um vídeo de referência.',
    mode: 'livre',
    length: structure.durationSec > 90 ? 'longo' : 'curto',
    trend: 'viral',
    fields: [],
    brief: [
      `CLONE THE EXACT NARRATIVE STRUCTURE, PACING, CAMERA RHYTHM AND SCENE-BY-SCENE PROGRESSION OF THE ANALYZED REFERENCE VIDEO.`,
      `Original summary: ${structure.summary}`,
      `Original style & pacing: ${structure.visualStyle} / ${structure.pacing}`,
      structure.detectedCharacters.length ? `Original characters (before user swap): ${structure.detectedCharacters.join('; ')}` : '',
      structure.detectedLocations.length ? `Original locations (before user swap): ${structure.detectedLocations.join('; ')}` : '',
      ocrBlock,
      `User adaptation directives (CRITICAL — apply these changes while strictly keeping the original structural skeleton, hooks, timing, transitions and visual energy):`,
      newTheme
        ? `- NEW STORY / NICHE / OFFER: Replace the original subject/story completely with: "${newTheme}". Adapt every beat's spoken lines and concrete actions to fit this new story while preserving each beat's psychological function (hook, escalation, turn, payoff).`
        : `- Keep the same core topic/angle as the reference video, rewritten naturally as an original production (never copy trademarked names or watermarks).`,
      newCharacter
        ? `- NEW CHARACTER(S): Replace the original character(s) with: "${newCharacter}". Write their fixed 25-35 word adult visual anchor in English accordingly.`
        : `- Keep character archetypes structurally equivalent to the original, as original fictional adult characters.`,
      newLocation
        ? `- NEW LOCATION / ENVIRONMENT: Replace the original setting(s) with: "${newLocation}". Match the original framing and lighting mood inside this new environment.`
        : `- Keep locations structurally equivalent to the original video.`,
      keepInstructions ? `- EXTRA USER INSTRUCTIONS: ${keepInstructions}` : '',
      `- SCRIPT-TO-VISUAL LOCK (MANDATORY): Everything the script mentions in a beat MUST appear visually via concrete on-screen components/props — zero generic filler shots.`,
      breathRule,
      `Original beat-by-beat skeleton:\n${beatsSummary}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    beats: structure.beats.map((b) => ({
      fn: `${b.beat} (preserve ${b.durationSec}s rhythm, transition=${b.transition}, sfx=${b.sfx}${b.ocrText ? `; adapt hook "${b.ocrText}" into spoken delivery` : ''})`,
      camera: b.camera,
      presence: b.presence,
    })),
    rules: [
      'Preserve the exact structural beat order, hook intensity and transitions (transition/sfx per take) from the analyzed reference video.',
      'Replicate the visual framing progression (camera field) adapted cleanly to the new character/environment.',
    ],
    defaults: {
      takes: structure.recommendedTakes,
      seconds: structure.recommendedSeconds,
      aspect: structure.aspect,
      model: structure.recommendedModel,
      quality: '360p',
      wordsPerCaption: 2,
    },
  }

  const params: FlowParams = {
    ...baseParams,
    tema: newTheme || structure.title,
    tipo: structure.mode === 'livre' ? 'misto' : structure.mode,
    cloneSourceUrl: structure.sourceUrl,
    cloneTitle: structure.title,
  }

  return { template, params }
}

/**
 * Exporta a estrutura analisada no formato aberto VIDEO.md (padrao rea-video),
 * classificando cada take (filmed / ai_generated / coded_html_svg), paleta hex e faixa de BPM.
 */
export function formatCloneAsVideoMd(s: FlowClonedStructure): string {
  const bpm = recommendBpmRange((s.energy as MotionEnergy) || 'fluido')
  const paletteLine = s.paletteHex?.length ? s.paletteHex.join(', ') : '(não detectada — usar até 3 cores hex)'
  const m = s.editingMetrics
  const lines = [
    `# VIDEO.md — ${s.title}`,
    '',
    `- **Fonte:** ${s.sourceUrl} (${s.sourcePlatform})`,
    `- **Formato & Duração:** ${s.aspect} · ${s.durationSec}s · ${s.beats.length} takes`,
    `- **Estilo & Ritmo:** ${s.visualStyle} · ${s.pacing} · ${bpm.label}`,
    `- **Motor Recomendado:** \`${s.recommendedEngine || 'flow'}\`${s.recommendedPreset ? ` · Preset: \`${s.recommendedPreset}\`` : ''}`,
    `- **Paleta Dominante (<=3 hex):** ${paletteLine}`,
    ...(m
      ? [
          `- **Métricas Reais de Edição:** ${m.detectedCutsCount} cortes (${m.cutsPerMinute} cortes/min) · Plano mediano: ${m.medianShotLengthSec}s · Gancho inicial: ${m.hookDurationSec}s${m.wordsPerMinute ? ` · Fala: ${m.wordsPerMinute} WPM` : ''}${m.breathPauses?.length ? ` · Respirações/Silêncios: ${m.breathPauses.length} pausas (${m.silentRatioPct ?? 0}%)` : ''}`,
          ...(m.contactSheetPath ? [`- **Contact Sheet Visual:** \`${m.contactSheetPath}\``] : []),
        ]
      : []),
    '',
    `## Resumo Estrutural`,
    s.summary || '-',
    ...(s.storyBible
      ? [
          '',
          `## Story Bible & Skill Replicável`,
          `- **Série / Formato:** ${s.storyBible.seriesTitle}`,
          `- **Arquétipo do Personagem:** ${s.storyBible.characterArchetype}`,
          `- **Trava Visual (Consistência):** ${s.storyBible.characterVisualLock}`,
          `- **Ambiente / Luz:** ${s.storyBible.worldSettingLock}`,
          `- **Fórmula de Gancho (0–3s):** ${s.storyBible.recurringHookFormula}`,
          `- **Fórmula de Fechamento:** ${s.storyBible.cliffhangerFormula}`,
          `- **Estilo de Legenda:** ${s.storyBible.captionStyle}`,
        ]
      : []),
    ...(s.characterAndEnvBlueprint
      ? [
          '',
          `## Blueprint de Personagem & Ambiente (Rig 2D)`,
          `- **Rig & Traço:** ${s.characterAndEnvBlueprint.characterRigStyle}`,
          `- **Proporções & Poses:** ${s.characterAndEnvBlueprint.characterProportions}`,
          ...(s.characterAndEnvBlueprint.clothingAndProps.length
            ? [`- **Figurino & Props:** ${s.characterAndEnvBlueprint.clothingAndProps.join(', ')}`]
            : []),
          ...(s.characterAndEnvBlueprint.environmentLayers.length
            ? [`- **Camadas de Ambiente:** ${s.characterAndEnvBlueprint.environmentLayers.join(', ')}`]
            : []),
          ...(s.characterAndEnvBlueprint.hudAndOverlayGrammar.length
            ? [`- **Gramática HUD / Overlays:** ${s.characterAndEnvBlueprint.hudAndOverlayGrammar.join(', ')}`]
            : []),
          ...(s.characterAndEnvBlueprint.internalMotionTriggers.length
            ? [`- **Movimento Contínuo Anti-Frozen:** ${s.characterAndEnvBlueprint.internalMotionTriggers.join(', ')}`]
            : []),
        ]
      : []),
    '',
    `## Beats Plano a Plano`,
    '',
    '| # | Tempo | Origem Visual | Tipo | Câmera | Transição / SFX | OCR / Fala |',
    '|---|---|---|---|---|---|---|',
  ]

  for (const b of s.beats) {
    const ocrOrSpeech = [b.ocrText ? `OCR: "${b.ocrText}"` : '', b.spokenSummary ? `Fala: "${b.spokenSummary}"` : '']
      .filter(Boolean)
      .join(' / ')
      .replace(/\|/g, '\\|')
    lines.push(
      `| ${b.n} | ${b.timestamp} (${b.durationSec}s) | \`${b.sourceType || 'filmed'}\` | ${b.kind} | ${b.camera.replace(/\|/g, '\\|')} | ${b.transition} / ${b.sfx} | ${ocrOrSpeech || '-'} |`
    )
  }

  if (s.transcript) {
    lines.push('', '## Transcrição', '', s.transcript.slice(0, 3000))
  }

  return lines.join('\n')
}
