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
  ClonedBeatSourceType,
  ClonedRecommendedEngine,
  ClonedSceneBeat,
  CloneCustomization,
  FlowClonedStructure,
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

/** Extrai ate 16 frames nitidos e rotulados com o tempo exato para leitura visual + OCR. */
async function extractLabeledFrames(
  videoPath: string | undefined,
  durationSec: number,
  fallbackFrames: string[]
): Promise<FlowVisionImage[]> {
  const out: FlowVisionImage[] = []

  if (videoPath && fs.existsSync(videoPath)) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow_clone_'))
    const count = Math.min(16, Math.max(6, Math.ceil(durationSec / 2.5)))
    const scaleFilter = "scale=w='if(gt(iw,ih),1024,-2)':h='if(gt(iw,ih),-2,1024)'"
    try {
      for (let i = 0; i < count; i++) {
        const ts = count === 1 ? 0 : Math.min(Math.max(0.2, (i * Math.max(durationSec - 0.4, 1)) / (count - 1)), Math.max(0.2, durationSec - 0.2))
        const fp = path.join(tmpDir, `frame_${String(i).padStart(2, '0')}.jpg`)
        try {
          await run(
            ffmpegBin(),
            ['-ss', ts.toFixed(2), '-i', videoPath, '-frames:v', '1', '-vf', scaleFilter, '-q:v', '3', '-y', fp],
            { timeout: 15000 }
          )
          if (fs.existsSync(fp) && fs.statSync(fp).size > 0) {
            out.push({
              dataBase64: fs.readFileSync(fp).toString('base64'),
              mimeType: 'image/jpeg',
              label: `[Frame ${i + 1}/${count} em ${ts.toFixed(1)}s]`,
            })
          }
        } catch {
          // Segue para os demais frames mesmo se um timestamp falhar
        }
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
    if (out.length > 0) return out
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
  return out
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

  const codedCount = beats.filter((b) => b.sourceType === 'coded_html_svg').length
  const engineRaw = String(raw?.recommendedEngine || '').trim().toLowerCase()
  const recommendedEngine: ClonedRecommendedEngine =
    engineRaw === 'html_svg' || engineRaw === 'remotion' || engineRaw === 'flow'
      ? (engineRaw as ClonedRecommendedEngine)
      : codedCount >= Math.ceil(beats.length / 2)
        ? 'html_svg'
        : 'flow'

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
    paletteHex,
    energy,
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

    const frames = await extractLabeledFrames(download.videoPath, meta.durationSec, download.framePaths || [])
    if (frames.length === 0) throw new Error('Não foi possível extrair frames deste vídeo para análise.')

    const system = `You are a senior viral-video reverse engineer and visual OCR analyst.
You will inspect sequential frames extracted from a reference video (plus its audio transcript when available).
Your job is to understand EVERY visual beat, scene cut, camera framing, motion, on-screen OCR text, narrative hook, pacing and audio style so the user can replicate the EXACT structural blueprint while swapping character, story or setting.

Reply with ONE valid JSON object matching this exact schema:
{
  "title": "short descriptive title of the analyzed video (PT-BR)",
  "summary": "2-3 sentences explaining the exact viral structure, hook mechanism and retention pattern (PT-BR)",
  "mode": "dialogo | narracao | ambiente | livre",
  "visualStyle": "cinematografico | natural | suspense | 3d_toy | 2d_ilustrado",
  "pacing": "frenetico | dinamico | equilibrado | cadenciado",
  "language": "pt-BR | en-US | es-ES",
  "recommendedTakes": number (between 2 and 12),
  "recommendedSeconds": 4 | 6 | 8 | 10,
  "recommendedModel": "Omni 1.2 Flash" | "Veo 3.1 - Fast" | "Veo 3.1 - Quality",
  "recommendedEngine": "html_svg | remotion | flow",
  "paletteHex": ["#0B1020", "#38BDF8", "#FACC15"],
  "energy": "cinematografico | fluido | cinetico",
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
      "sourceType": "filmed | ai_generated | coded_html_svg"
    }
  ]
}

Rules:
- Read ALL on-screen text carefully (OCR): headlines, top banners, burned-in captions, product labels, CTAs.
- Group consecutive frames that belong to the same continuous shot/scene into coherent beats (around ${Math.max(3, Math.min(10, Math.round(meta.durationSec / 6)))} beats covering the full ${meta.durationSec}s duration).
- Identify accurately whether characters talk on camera ("dialogo"), there is an off-screen voiceover ("narracao"), only visuals/ambient sound ("ambiente"), or a mix ("livre").
- Always write beat descriptions/summary/title in PT-BR, and camera/action/detectedCharacters/detectedLocations in English.`

    const userPrompt = [
      `URL de origem: ${cleanUrl} (${platform})`,
      `Duração medida: ${meta.durationSec}s | Formato detectado: ${meta.aspect}`,
      `Total de frames anexados em ordem cronológica: ${frames.length}`,
      transcript ? `\nTranscrição do áudio original:\n${transcript.slice(0, 9000)}` : '\n(Sem transcrição de áudio prévia — analise pelos frames e OCR visual.)',
      '\nAnalise os frames abaixo em ordem cronológica, leia todo o OCR visível e devolva o JSON estruturado cobrindo toda a duração do vídeo.',
    ].join('\n')

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
        `Beat ${b.n} (${b.timestamp}, ${b.durationSec}s, kind=${b.kind}, transition=${b.transition}, sfx=${b.sfx}): ${b.beat} | Camera: ${b.camera} | Visual: ${b.action}${b.ocrText ? ` | Original OCR: "${b.ocrText}"` : ''}${b.spokenSummary ? ` | Original line meaning: "${b.spokenSummary}"` : ''}`
    )
    .join('\n')

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
  const lines = [
    `# VIDEO.md — ${s.title}`,
    '',
    `- **Fonte:** ${s.sourceUrl} (${s.sourcePlatform})`,
    `- **Formato & Duração:** ${s.aspect} · ${s.durationSec}s · ${s.beats.length} takes`,
    `- **Estilo & Ritmo:** ${s.visualStyle} · ${s.pacing} · ${bpm.label}`,
    `- **Motor Recomendado:** \`${s.recommendedEngine || 'flow'}\``,
    `- **Paleta Dominante (<=3 hex):** ${paletteLine}`,
    '',
    `## Resumo Estrutural`,
    s.summary || '-',
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
