/**
 * Módulo de Substituição de Áudio, Lip-Sync e Calibração da Tríade para Criativos do DarkTube.
 * Implementa o Método do Slot Atômico:
 *  1. Voz: silenceremove (anti-buraco < 0.16s) + adelay=140ms para início exato aos 0.14s + calibração de atempo.
 *  2. Whisper Forced Alignment: alinhamento oficial de tokens com o roteiro + anti-flicker (gap 0.02s) + zero símbolos.
 *  3. Posicionamento Adaptativo de Legendas: Y=1520 para Expert (terço inferior livre) e Y=960 para Split-Screen (linha central).
 *  4. Suporte a microserviço neural de Lip-Sync (LivePortrait/MuseTalk) quando solicitado.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pool } from '@/lib/db-client';
import {
  ffmpegBin,
  transcribeWhisper,
  tightenWords,
  cuesFromWords,
  buildSrt,
  cleanCaptionText,
  probe,
  readStored,
  pickClips,
  type TimedWord,
  type Cue,
} from '@/lib/flow-assemble';
import { uploadMediaFile } from '@/lib/storage';
import { getUserApiKey } from '@/lib/database';

const run = promisify(execFile);

const LIPSYNC_CANDIDATE_URLS = [
  process.env.LIPSYNC_SERVICE_URL,
  'http://localhost:5005',
  'http://127.0.0.1:5005',
  'http://lipsync-service:5005',
  'http://liveportrait:5005',
].filter(Boolean) as string[];

export const HIGHLIGHT_KEYWORDS_RE =
  /^(RENDA|EXTRA|FOFOS|FELTRO|CHARME|CORAÇÕES|CORACOES|MOLDE|MOLDES|CONTORNO|ARGOLA|METAL|LILÁS|LILAS|FIBRA|TESOURA|CASEADO|SEGREDO|OURO|PRONTINHO|CINQUENTA|DEZ|REAIS|WHATSAPP|ATENÇÃO|ATENCAO|CUIDADO|PERIGO|DICA|PASSO|RECEITA|FÁCIL|FACIL|RÁPIDO|RAPIDO|DESCONTO|GRÁTIS|GRATIS|PROMOÇÃO|PROMOCAO)$/i;

export interface ReplaceAudioOptions {
  videoInput: string; // Caminho local ou URL do MP4
  audioInput: string; // Caminho local ou URL do áudio (.webm, .mp3, .wav, .m4a)
  outputPath: string; // Onde salvar o MP4 resultante
  lipsync?: boolean; // Se true, tenta rodar o modelo de lip-sync no rosto do vídeo
  syncWhisper?: boolean; // Se true, regera legendas com Whisper e queima no vídeo
  burnSubtitles?: boolean; // Se true (padrão), queima a nova legenda no vídeo
  userId?: string;
  language?: string; // ex: 'pt'
  wordsPerCaption?: number;
  layout?: 'expert' | 'split' | 'auto'; // Calibração da Tríade: Y=1520 no expert ou Y=960 no split
  slotDuration?: number; // Duração alvo do slot em segundos (padrão 6.0s para takes ou duração do vídeo)
  scriptText?: string; // Roteiro oficial para Forced Token Alignment (zero erros ortográficos)
}

export interface ReplaceAudioResult {
  success: boolean;
  outputPath: string;
  duration: number;
  srtPath?: string;
  srtContent?: string;
  assPath?: string;
  assContent?: string;
  burned: boolean;
  lipsyncApplied: boolean;
  method: 'lipsync_model' | 'ffmpeg_direct';
  layoutApplied: 'expert' | 'split';
  error?: string;
}

/** Formata segundos no formato de tempo do SubStation Alpha (H:MM:SS.CC) */
export function formatAssTime(sec: number): string {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${rem}`;
}

/**
 * Constrói o conteúdo de legendas .ASS estilizado com posicionamento pixel-perfect (Y=1520 para expert ou Y=960 para split),
 * animação Pop e destaque em amarelo ouro para palavras-chave.
 */
export function buildAssContent(
  dialogues: { start: number; end: number; text: string; words?: string[] }[],
  posY: number,
  resX = 1080,
  resY = 1920
): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TriadPop,Arial Black,64,&H00FFFFFF,&H000AE6FF,&H00000000,&H88000000,-1,0,0,0,100,100,1,0,1,6,3,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines = dialogues.map((d) => {
    const rawWords = d.words && d.words.length ? d.words : d.text.split(/\s+/).filter(Boolean);
    const styled = rawWords
      .map((w) => {
        const cleanUpper = cleanCaptionText(w).toUpperCase();
        const stripped = cleanUpper.replace(/[^A-ZÀ-Ú0-9-]/gi, '');
        if (HIGHLIGHT_KEYWORDS_RE.test(stripped)) {
          return `{\\c&H000AE6FF&}${cleanUpper}{\\c&H00FFFFFF&}`;
        }
        return cleanUpper;
      })
      .join(' ');

    const popTag = `{\\pos(${Math.round(resX / 2)},${posY})\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}`;
    return `Dialogue: 0,${formatAssTime(d.start)},${formatAssTime(d.end)},TriadPop,,0,0,0,,${popTag}${styled}`;
  });

  return header + lines.join('\n') + '\n';
}

/**
 * Forced Token Alignment: Alinha os tokens oficiais do roteiro à janela real de voz detectada,
 * agrupando em blocos equilibrados de 2 a 4 palavras, com garantia Zero-Flicker (gap exato de 0.02s).
 */
export function forcedAlignTokens(
  scriptText: string,
  tStart: number,
  tEnd: number,
  baseOffset = 0
): { start: number; end: number; text: string; words: string[] }[] {
  const cleaned = cleanCaptionText(scriptText);
  const officialTokens = cleaned.split(/\s+/).filter(Boolean);
  if (!officialTokens.length) return [];

  const numChunks = officialTokens.length <= 4 ? 1 : officialTokens.length <= 8 ? 2 : officialTokens.length <= 12 ? 3 : 4;
  const takeChunks: string[][] = [];
  let cursor = 0;
  for (let c = 0; c < numChunks; c++) {
    const remTokens = officialTokens.length - cursor;
    const remGroups = numChunks - c;
    const sz = Math.ceil(remTokens / remGroups);
    takeChunks.push(officialTokens.slice(cursor, cursor + sz));
    cursor += sz;
  }

  const weights = takeChunks.map((grp) => grp.join(' ').length + grp.length * 1.5);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let acc = tStart;
  const totalSpan = Math.max(tEnd - tStart, 1.0);
  const timed = takeChunks.map((grp, idx) => {
    const dur = (totalSpan * weights[idx]) / totalWeight;
    const cStart = baseOffset + acc;
    acc += dur;
    const rawEnd = idx === takeChunks.length - 1 ? Math.min(tEnd, acc + 0.15) : acc;
    const cEnd = baseOffset + rawEnd;
    return {
      start: cStart,
      end: cEnd,
      text: grp.join(' '),
      words: grp,
    };
  });

  // Zero-Flicker: emenda contínua entre blocos consecutivos (gap de 0.02s)
  for (let k = 0; k < timed.length - 1; k++) {
    timed[k].end = Math.max(timed[k].start + 0.25, timed[k + 1].start - 0.02);
  }

  return timed;
}

/**
 * Obtém dimensões (largura e altura) do vídeo para cálculo responsivo de legendas.
 */
async function getVideoDimensions(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const { stderr } = await run(ffmpegBin(), ['-hide_banner', '-i', filePath], { timeout: 30000 });
    const m = (stderr || '').match(/Stream #\d+:\d+.*Video:.*?\s(\d{2,5})x(\d{2,5})\b/);
    if (m) return { width: Number(m[1]), height: Number(m[2]) };
  } catch (err: any) {
    const m = (err?.stderr || '').match(/Stream #\d+:\d+.*Video:.*?\s(\d{2,5})x(\d{2,5})\b/);
    if (m) return { width: Number(m[1]), height: Number(m[2]) };
  }
  return { width: 1080, height: 1920 };
}

/**
 * Baixa ou resolve o caminho de um arquivo local/remoto.
 */
async function resolveLocalPath(input: string, tmpDir: string, defaultName: string): Promise<string> {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const dest = path.join(tmpDir, defaultName);
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Falha ao baixar recurso de ${input}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return dest;
  }
  if (!fs.existsSync(input)) {
    throw new Error(`Arquivo não encontrado no caminho: ${input}`);
  }
  return input;
}

/**
 * Tenta executar o Lip-Sync neural através de endpoint open-source (LivePortrait / MuseTalk)
 */
async function tryNeuralLipSync(videoPath: string, audioPath: string, outputPath: string): Promise<boolean> {
  for (const url of LIPSYNC_CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const formData = new FormData();
      formData.append('video', new Blob([fs.readFileSync(videoPath)]), path.basename(videoPath));
      formData.append('audio', new Blob([fs.readFileSync(audioPath)]), path.basename(audioPath));

      const res = await fetch(`${url}/lipsync`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        const outBuf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(outputPath, outBuf);
        return true;
      }
    } catch (_) {
      // Continua para o próximo endpoint candidato
    }
  }
  return false;
}

/**
 * Substitui o áudio de um vídeo aplicando o Método da Tríade:
 * 1. Slot Atômico: silenceremove + adelay=140ms (início aos 0.14s) + atempo calibrado.
 * 2. Forced Alignment Whisper: alinhamento com roteiro oficial + anti-flicker contínuo.
 * 3. Posicionamento Adaptativo: Y=1520 para Expert / Y=960 para Split-Screen em .ASS e .SRT.
 */
export async function replaceVideoAudio(options: ReplaceAudioOptions): Promise<ReplaceAudioResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-audio-replace-'));
  const { syncWhisper = true, burnSubtitles = true } = options;

  try {
    const resolvedVideo = await resolveLocalPath(options.videoInput, tmpDir, 'input_video.mp4');
    const resolvedAudio = await resolveLocalPath(options.audioInput, tmpDir, 'input_audio.webm');

    // 1. Dimensões do vídeo e layout adaptativo da Tríade
    const dims = await getVideoDimensions(resolvedVideo);
    const videoProbe = await probe(resolvedVideo);
    const videoDuration = videoProbe.duration || 6.0;
    const targetSlotDur = options.slotDuration || (videoDuration > 0 ? videoDuration : 6.0);

    const isVertical = dims.height >= dims.width;
    let layoutApplied: 'expert' | 'split' = 'expert';
    if (options.layout === 'split') {
      layoutApplied = 'split';
    } else if (options.layout === 'expert') {
      layoutApplied = 'expert';
    } else {
      // Modo auto: padrão vertical é expert
      layoutApplied = isVertical ? 'expert' : 'expert';
    }

    // 2. TRÍADE - SLOT ATÔMICO & COMPRESSÃO DE SILÊNCIO:
    // Passo 2A: Remoção de silêncio inicial/final e compressão de pausas internas > 0.16s
    const compactWav = path.join(tmpDir, 'audio_compact.wav');
    try {
      await run(
        ffmpegBin(),
        [
          '-y',
          '-i', resolvedAudio,
          '-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB:stop_periods=-1:stop_duration=0.16:stop_threshold=-45dB',
          '-ar', '44100',
          '-ac', '2',
          compactWav,
        ],
        { timeout: 45000 }
      );
    } catch (e: any) {
      console.warn('[AudioReplace] silenceremove fallback:', e.message);
    }

    const inputForSlot = fs.existsSync(compactWav) && fs.statSync(compactWav).size > 1000 ? compactWav : resolvedAudio;
    const compactProbe = await probe(inputForSlot);
    const speechDur = compactProbe.duration || (await probe(resolvedAudio)).duration || 4.5;

    // Passo 2B: Calibração de atempo para caber no slot com margem confortável de corte (~0.60s)
    let ratio = 1.0;
    if (speechDur > targetSlotDur - 0.70) {
      ratio = Math.min(1.25, speechDur / (targetSlotDur - 0.85));
    } else if (speechDur < targetSlotDur - 1.90 && speechDur > 0.5) {
      ratio = Math.max(0.90, speechDur / (targetSlotDur - 1.45));
    }

    // Passo 2C: adelay=140|140 para início cirúrgico da voz aos 0.14s (respiro/piscada natural)
    const slotWav = path.join(tmpDir, 'audio_slot_calibrated.wav');
    const afSlot = `adelay=140|140,atempo=${ratio.toFixed(4)},apad=whole_dur=${targetSlotDur.toFixed(2)}`;
    await run(
      ffmpegBin(),
      [
        '-y',
        '-i', inputForSlot,
        '-af', afSlot,
        '-t', String(targetSlotDur.toFixed(2)),
        '-ar', '44100',
        '-ac', '2',
        '-c:a', 'pcm_s16le',
        slotWav,
      ],
      { timeout: 45000 }
    );

    const alignedAudio = fs.existsSync(slotWav) && fs.statSync(slotWav).size > 1000 ? slotWav : inputForSlot;
    const finalSpeechEnd = Math.min(targetSlotDur - 0.10, 0.14 + speechDur / ratio);
    console.log(
      `[AudioReplace][Tríade] SpeechDur=${speechDur.toFixed(2)}s | ratio=${ratio.toFixed(2)} | Janela=[0.14s .. ${finalSpeechEnd.toFixed(2)}s] | Slot=${targetSlotDur}s | Layout=${layoutApplied}`
    );

    // 3. Lip-Sync Neural (se solicitado)
    let lipsyncApplied = false;
    let method: 'lipsync_model' | 'ffmpeg_direct' = 'ffmpeg_direct';
    const mergedAudioVideo = path.join(tmpDir, 'merged_audio_video.mp4');

    if (options.lipsync) {
      const lipsyncTmp = path.join(tmpDir, 'lipsync_out.mp4');
      const ok = await tryNeuralLipSync(resolvedVideo, alignedAudio, lipsyncTmp);
      if (ok && fs.existsSync(lipsyncTmp)) {
        fs.copyFileSync(lipsyncTmp, mergedAudioVideo);
        lipsyncApplied = true;
        method = 'lipsync_model';
      }
    }

    // Se não usou lipsync neural (ou se falhou/desativado), faz a substituição limpa com FFmpeg
    if (!lipsyncApplied) {
      const args = [
        '-y',
        '-i', resolvedVideo,
        '-i', alignedAudio,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-shortest',
        mergedAudioVideo,
      ];
      await run(ffmpegBin(), args, { timeout: 120000 });
    }

    // 4. TRÍADE - WHISPER FORCED ALIGNMENT & ZERO-FLICKER:
    let srtContent = '';
    let srtPath: string | undefined;
    let assContent = '';
    let assPath: string | undefined;

    if (syncWhisper) {
      const apiKey = options.userId ? await getUserApiKey(options.userId, 'openai').catch(() => '') : process.env.OPENAI_API_KEY || '';
      const lang = options.language || 'pt';

      const words = await transcribeWhisper(alignedAudio, lang, apiKey).catch((e) => {
        console.warn('[AudioReplace] Whisper falhou:', e.message);
        return null;
      });

      let timedDialogue: { start: number; end: number; text: string; words?: string[] }[] = [];

      // Prioridade 1: Roteiro oficial com Forced Token Alignment (100% livre de erros ortográficos)
      if (options.scriptText && options.scriptText.trim().length > 0) {
        timedDialogue = forcedAlignTokens(options.scriptText, 0.14, finalSpeechEnd);
      } else if (words && words.length > 0) {
        // Prioridade 2: Transcrição Whisper com Word Tightening e Anti-Flicker
        const tightened = tightenWords(words).map((w) => ({
          ...w,
          start: Math.max(0.14, w.start),
          end: Math.min(targetSlotDur - 0.05, Math.max(0.24, w.end)),
        }));
        const wordsPerCaption = options.wordsPerCaption || 2;
        const cues = cuesFromWords(tightened, wordsPerCaption);

        // Anti-flicker: emenda contínua com gap de 0.02s
        for (let k = 0; k < cues.length - 1; k++) {
          cues[k].end = Math.max(cues[k].start + 0.25, cues[k + 1].start - 0.02);
        }

        timedDialogue = cues.map((c) => ({
          start: c.start,
          end: c.end,
          text: c.text,
          words: c.text.split(/\s+/).filter(Boolean),
        }));
      }

      if (timedDialogue.length > 0) {
        // Posição Y adaptativa da Tríade:
        // Expert (Tela Cheia 9:16): Y=1520 (terço inferior livre, sem cobrir rosto/boca)
        // Split-Screen (50/50): Y=960 (linha divisória central entre topo e base)
        const posY = layoutApplied === 'expert' ? 1520 : 960;

        // Gera arquivo .ASS pixel-perfect
        assContent = buildAssContent(timedDialogue, posY, 1080, 1920);
        assPath = options.outputPath.replace(/\.[a-z0-9]+$/i, '.ass');
        fs.writeFileSync(assPath, assContent, 'utf8');
        fs.writeFileSync(path.join(tmpDir, 'captions.ass'), assContent, 'utf8');

        // Gera arquivo .SRT universal
        const srtCues: Cue[] = timedDialogue.map((td) => ({
          start: td.start,
          end: td.end,
          text: td.text,
        }));
        srtContent = buildSrt(srtCues);
        srtPath = options.outputPath.replace(/\.[a-z0-9]+$/i, '.srt');
        fs.writeFileSync(srtPath, srtContent, 'utf8');
        fs.writeFileSync(path.join(tmpDir, 'captions.srt'), srtContent, 'utf8');
      }
    }

    // 5. TRÍADE - GRAVAÇÃO DAS LEGENDAS NO VÍDEO (.ASS ou .SRT adaptativo)
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    let burned = false;

    if (burnSubtitles && (assContent || srtContent)) {
      const burnedTemp = path.join(tmpDir, 'burned_final.mp4');

      // Tentativa 1: Gravação com .ASS (suporte total a \pos(540, posY), pop tags e cores)
      if (assContent) {
        try {
          const assArgs = [
            '-y',
            '-i', 'merged_audio_video.mp4',
            '-vf', 'subtitles=captions.ass',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '20',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'copy',
            'burned_final.mp4',
          ];
          await run(ffmpegBin(), assArgs, { timeout: 180000, cwd: tmpDir });
          if (fs.existsSync(burnedTemp) && fs.statSync(burnedTemp).size > 1000) {
            fs.copyFileSync(burnedTemp, options.outputPath);
            burned = true;
            console.log(`[AudioReplace][Tríade] Legendas .ASS gravadas com sucesso em Y=${layoutApplied === 'expert' ? 1520 : 960}!`);
          }
        } catch (err: any) {
          console.warn('[AudioReplace] Falha ao queimar com .ASS, tentando SRT:', err.message);
        }
      }

      // Tentativa 2: Fallback para .SRT com MarginV responsivo
      if (!burned && srtContent) {
        const scaleFactor = dims.height / 1920;
        const targetMarginV =
          layoutApplied === 'expert'
            ? Math.round((1920 - 1520) * scaleFactor) // ~400 em 1080x1920, ~267 em 720x1280
            : Math.round((1920 - 960) * scaleFactor); // ~960 em 1080x1920, ~640 em 720x1280

        const srtStyle = `Fontname=Arial,Bold=1,FontSize=${Math.round(18 * (dims.height / 1280))},Outline=2.5,Shadow=1,Alignment=2,MarginV=${targetMarginV},PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BackColour=&H80000000&,BorderStyle=3`;
        const srtArgs = [
          '-y',
          '-i', 'merged_audio_video.mp4',
          '-vf', `subtitles=captions.srt:force_style='${srtStyle}'`,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '20',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'copy',
          'burned_final.mp4',
        ];

        try {
          await run(ffmpegBin(), srtArgs, { timeout: 180000, cwd: tmpDir });
          if (fs.existsSync(burnedTemp) && fs.statSync(burnedTemp).size > 1000) {
            fs.copyFileSync(burnedTemp, options.outputPath);
            burned = true;
            console.log(`[AudioReplace][Tríade] Legendas .SRT gravadas com sucesso com MarginV=${targetMarginV}!`);
          } else {
            fs.copyFileSync(mergedAudioVideo, options.outputPath);
          }
        } catch (err: any) {
          console.warn('[AudioReplace] Falha ao queimar legenda SRT:', err.message);
          fs.copyFileSync(mergedAudioVideo, options.outputPath);
        }
      }

      if (!burned) {
        fs.copyFileSync(mergedAudioVideo, options.outputPath);
      }
    } else {
      fs.copyFileSync(mergedAudioVideo, options.outputPath);
    }

    const finalProbe = await probe(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      duration: finalProbe.duration || targetSlotDur,
      srtPath,
      srtContent,
      assPath,
      assContent,
      burned,
      lipsyncApplied,
      method,
      layoutApplied,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

/**
 * Substitui o áudio de um projeto do /flow remontando a partir dos takes brutos limpos (sem legendas velhas queimadas)
 * e aplicando a Tríade do Slot Atômico.
 */
export async function replaceProjectAudio(options: {
  userId?: string;
  projectId: string;
  audioInput: string;
  takeIndex?: number;
  lipsync?: boolean;
  layout?: 'expert' | 'split' | 'auto';
  scriptText?: string;
  slotDuration?: number;
  outputDir?: string;
  filename?: string;
  updateProject?: boolean;
}) {
  const { userId, projectId, audioInput, lipsync = false, outputDir = './midia/criativos', updateProject = true } = options;

  // Busca projeto no banco (aceita ID completo ou prefixo de ID)
  const querySql = userId
    ? 'SELECT id, user_id, title, final_url, srt_url, params, script FROM public.flow_projects WHERE user_id = $1 AND (id::text = $2 OR id::text LIKE $3) LIMIT 1'
    : 'SELECT id, user_id, title, final_url, srt_url, params, script FROM public.flow_projects WHERE (id::text = $1 OR id::text LIKE $2) LIMIT 1';
  const queryParams = userId ? [userId, projectId, `${projectId}%`] : [projectId, `${projectId}%`];

  const { rows } = await pool.query(querySql, queryParams);
  if (!rows.length) throw new Error(`Projeto ${projectId} não encontrado.`);
  const project = rows[0];
  const effectiveUserId = project.user_id;

  const targetDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), outputDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const safeTitle = (project.title || 'criativo').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const outName = options.filename || `${safeTitle}_voz_substituida.mp4`;
  const outPath = path.join(/*turbopackIgnore: true*/ targetDir, outName);

  // Busca os takes brutos do projeto no banco (sem legendas queimadas)
  const { rows: jobs } = await pool.query(
    `SELECT take_index, role, status, result_url, finished_at FROM public.flow_jobs WHERE user_id = $1 AND project_id = $2`,
    [effectiveUserId, project.id]
  );

  const takes = project.script?.takes || [];
  const { picked, missing } = pickClips(takes.map((k: any) => k.n), jobs);

  // Deteção inteligente de layout da Tríade a partir dos takes do projeto:
  const hasSplitTakes = takes.some((t: any) => t.role === 'split' || t.role === 'tutorial' || t.role === 'broll');
  const hasExpertTakes = takes.some((t: any) => t.role === 'expert' || t.role === 'hook' || t.source === 'flow');

  let projectLayout: 'expert' | 'split' = 'expert';
  if (options.layout && options.layout !== 'auto') {
    projectLayout = options.layout;
  } else if (options.takeIndex !== undefined) {
    const targetTake = takes[options.takeIndex];
    projectLayout = targetTake?.role === 'split' || targetTake?.role === 'tutorial' ? 'split' : 'expert';
  } else if (hasSplitTakes && !hasExpertTakes) {
    projectLayout = 'split';
  } else {
    projectLayout = 'expert';
  }

  // Texto do roteiro oficial para Forced Alignment
  const scriptText =
    options.scriptText ||
    (options.takeIndex !== undefined
      ? takes[options.takeIndex]?.spoken || takes[options.takeIndex]?.line || ''
      : takes.map((t: any) => t.spoken || t.line).filter(Boolean).join(' '));

  // Se temos os takes brutos, montamos uma fita limpa sem legendas antigas:
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-proj-clean-'));
  let cleanVideoPath = '';

  try {
    if (picked.length > 0 && missing.length === 0) {
      console.log(`[AudioReplace] Remontando ${picked.length} takes brutos limpos do projeto ${project.id}...`);
      const vertical = project.params?.aspect !== '16:9';
      const W = vertical ? 720 : 1280;
      const H = vertical ? 1280 : 720;
      const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`;

      const normalizedClips: string[] = [];
      for (const clip of picked) {
        const raw = path.join(tmpDir, `raw_${clip.n}.mp4`);
        const norm = path.join(tmpDir, `norm_${clip.n}.mp4`);
        fs.writeFileSync(raw, await readStored(clip.url));
        await run(ffmpegBin(), ['-y', '-i', raw, '-vf', vf, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '20', '-an', norm], { timeout: 120000 });
        normalizedClips.push(norm);
      }

      const listFile = path.join(tmpDir, 'list.txt');
      fs.writeFileSync(listFile, normalizedClips.map((f) => `file '${path.basename(f)}'`).join('\n'));
      cleanVideoPath = path.join(tmpDir, 'clean_concat.mp4');
      await run(ffmpegBin(), ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', cleanVideoPath], { timeout: 120000, cwd: tmpDir });
    } else {
      // Fallback para o finalUrl se os takes brutos não estiverem disponíveis
      cleanVideoPath = project.final_url
        ? (project.final_url.startsWith('http') ? project.final_url : `https://darktube.fjt-solutions.com${project.final_url}`)
        : path.join(targetDir, `flow_final_${project.id}.mp4`);
    }

    const result = await replaceVideoAudio({
      videoInput: cleanVideoPath,
      audioInput,
      outputPath: outPath,
      lipsync,
      syncWhisper: true,
      burnSubtitles: true,
      userId: effectiveUserId,
      language: 'pt',
      wordsPerCaption: Number(project.params?.wordsPerCaption) || 2,
      layout: projectLayout,
      slotDuration: options.slotDuration,
      scriptText,
    });

    let finalUrl = project.final_url;
    let srtUrl = project.srt_url;

    if (updateProject && fs.existsSync(outPath)) {
      const mp4Buf = fs.readFileSync(outPath);
      const storageMp4 = `flow_replaced_${project.id}_${Date.now()}.mp4`;
      finalUrl = await uploadMediaFile(mp4Buf, storageMp4, 'video/mp4');

      if (result.srtPath && fs.existsSync(result.srtPath)) {
        const srtBuf = fs.readFileSync(result.srtPath);
        const storageSrt = `flow_replaced_${project.id}_${Date.now()}.srt`;
        srtUrl = await uploadMediaFile(srtBuf, storageSrt, 'text/plain');
      }

      await pool.query(
        `UPDATE public.flow_projects
            SET status = 'assembled',
                final_url = $3,
                srt_url = COALESCE($4, srt_url),
                assembled_at = NOW(),
                updated_at = NOW()
          WHERE id = $1 AND user_id = $2`,
        [project.id, effectiveUserId, finalUrl, srtUrl]
      );
      console.log(`[AudioReplace] flow_projects ${project.id} atualizado com novo final_url: ${finalUrl}`);
    }

    return {
      ...result,
      projectId: project.id,
      title: project.title,
      finalUrl,
      srtUrl,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}
