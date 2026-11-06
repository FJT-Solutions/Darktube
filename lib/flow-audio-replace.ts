/**
 * Módulo de Substituição de Áudio e Lip-Sync para Criativos do DarkTube.
 * Permite substituir a voz original de um take ou do vídeo final por um áudio gravado (ex: .webm, .mp3),
 * re-sincronizando legendas Whisper e suportando microserviço de Lip-Sync (LivePortrait/MuseTalk).
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
  probe,
  readStored,
  pickClips,
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

export interface ReplaceAudioOptions {
  videoInput: string; // Caminho local ou URL do MP4
  audioInput: string; // Caminho local ou URL do áudio (.webm, .mp3, .wav, .m4a)
  outputPath: string; // Onde salvar o MP4 resultante
  lipsync?: boolean; // Se true, tenta rodar o modelo de lip-sync no rosto do vídeo
  syncWhisper?: boolean; // Se true, regera o .srt com Whisper e queima no vídeo
  burnSubtitles?: boolean; // Se true (padrão), queima a nova legenda no vídeo
  userId?: string;
  language?: string; // ex: 'pt'
  wordsPerCaption?: number;
}

export interface ReplaceAudioResult {
  success: boolean;
  outputPath: string;
  duration: number;
  srtPath?: string;
  srtContent?: string;
  burned: boolean;
  lipsyncApplied: boolean;
  method: 'lipsync_model' | 'ffmpeg_direct';
  error?: string;
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
 * Substitui o áudio de um vídeo e grava a nova legenda gerada pelo Whisper.
 */
export async function replaceVideoAudio(options: ReplaceAudioOptions): Promise<ReplaceAudioResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-audio-replace-'));
  const { syncWhisper = true, burnSubtitles = true } = options;

  try {
    const resolvedVideo = await resolveLocalPath(options.videoInput, tmpDir, 'input_video.mp4');
    const resolvedAudio = await resolveLocalPath(options.audioInput, tmpDir, 'input_audio.webm');

    // 1. Transcreve o novo áudio com Whisper para obter as palavras exatas e ponto de início da fala
    const apiKey = options.userId ? await getUserApiKey(options.userId, 'openai').catch(() => '') : process.env.OPENAI_API_KEY || '';
    const lang = options.language || 'pt';
    const words = await transcribeWhisper(resolvedAudio, lang, apiKey).catch((e) => {
      console.warn('[AudioReplace] Whisper falhou:', e.message);
      return [];
    });

    // 2. Alinhamento de silêncio inicial do áudio (elimina atrasos no início da fala gravada):
    let alignedAudio = resolvedAudio;
    let trimOffset = 0;
    if (words && words.length > 0) {
      const firstWordStart = words[0].start;
      if (firstWordStart > 0.25) {
        trimOffset = Math.max(0, firstWordStart - 0.1);
        const trimmedAudioPath = path.join(tmpDir, 'audio_trimmed.wav');
        try {
          await run(ffmpegBin(), ['-y', '-ss', String(trimOffset), '-i', resolvedAudio, '-c:a', 'pcm_s16le', trimmedAudioPath], { timeout: 30000 });
          if (fs.existsSync(trimmedAudioPath) && fs.statSync(trimmedAudioPath).size > 1000) {
            alignedAudio = trimmedAudioPath;
            console.log(`[AudioReplace] Cortado ${trimOffset.toFixed(2)}s de silêncio inicial do áudio`);
          } else {
            trimOffset = 0;
          }
        } catch {
          trimOffset = 0;
        }
      }
    }

    // 3. Verifica duração do áudio e do vídeo
    const videoProbe = await probe(resolvedVideo);
    const audioProbe = await probe(alignedAudio);
    const videoDuration = videoProbe.duration || 10;
    const audioDuration = audioProbe.duration || videoDuration;

    let lipsyncApplied = false;
    let method: 'lipsync_model' | 'ffmpeg_direct' = 'ffmpeg_direct';

    const mergedAudioVideo = path.join(tmpDir, 'merged_audio_video.mp4');

    // Se o usuário pediu Lip-Sync, tenta o microserviço neural
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

    // 4. Monta a nova legenda SRT a partir das palavras do Whisper da nova voz
    let srtContent = '';
    let srtPath: string | undefined;

    if (syncWhisper && words && words.length > 0) {
      const adjustedWords = words
        .filter((w) => w.end > trimOffset)
        .map((w) => ({
          ...w,
          start: Math.max(0, w.start - trimOffset),
          end: Math.max(0.1, w.end - trimOffset),
        }))
        .filter((w) => w.start < audioDuration);

      const wordsPerCaption = options.wordsPerCaption || 2;
      const cues = cuesFromWords(tightenWords(adjustedWords), wordsPerCaption);
      srtContent = buildSrt(cues);

      srtPath = options.outputPath.replace(/\.[a-z0-9]+$/i, '.srt');
      fs.writeFileSync(srtPath, srtContent, 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'captions.srt'), srtContent, 'utf8');
    }

    // 5. Queima as novas legendas no vídeo se solicitado (garante que o vídeo exiba o texto falado!)
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    let burned = false;

    if (burnSubtitles && srtContent) {
      // Estilo de legenda com tarja/outline de alta visibilidade
      const style = `Fontname=Arial,Bold=1,FontSize=16,Outline=2.5,Shadow=1,Alignment=2,MarginV=70,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BackColour=&H80000000&,BorderStyle=3`;

      const burnArgs = [
        '-y',
        '-i', 'merged_audio_video.mp4',
        '-vf', `subtitles=captions.srt:force_style='${style}'`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        'burned_final.mp4',
      ];

      try {
        const burnedTemp = path.join(tmpDir, 'burned_final.mp4');
        await run(ffmpegBin(), burnArgs, { timeout: 180000, cwd: tmpDir });
        if (fs.existsSync(burnedTemp) && fs.statSync(burnedTemp).size > 1000) {
          fs.copyFileSync(burnedTemp, options.outputPath);
          burned = true;
          console.log(`[AudioReplace] Legendas Whisper gravadas com sucesso no vídeo MP4 final!`);
        } else {
          fs.copyFileSync(mergedAudioVideo, options.outputPath);
        }
      } catch (err: any) {
        console.warn('[AudioReplace] Falha ao queimar legenda:', err.message);
        fs.copyFileSync(mergedAudioVideo, options.outputPath);
      }
    } else {
      fs.copyFileSync(mergedAudioVideo, options.outputPath);
    }

    const finalProbe = await probe(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      duration: finalProbe.duration || audioDuration,
      srtPath,
      srtContent,
      burned,
      lipsyncApplied,
      method,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

/**
 * Substitui o áudio de um projeto do /flow remontando a partir dos takes brutos limpos (sem legendas velhas queimadas).
 */
export async function replaceProjectAudio(options: {
  userId?: string;
  projectId: string;
  audioInput: string;
  takeIndex?: number;
  lipsync?: boolean;
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
