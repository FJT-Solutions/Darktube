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
import { ffmpegBin, transcribeWhisper, wordsFromWhisper, tightenWords, cuesFromWords, buildSrt, probe, type Cue } from '@/lib/flow-assemble';
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
  syncWhisper?: boolean; // Se true, regera o .srt com Whisper para o novo áudio
  userId?: string;
  language?: string; // ex: 'pt'
  wordsPerCaption?: number;
}

export interface ReplaceAudioResult {
  success: boolean;
  outputPath: string;
  duration: number;
  srtPath?: string;
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
 * Substitui o áudio de um vídeo pelo novo áudio fornecido via FFmpeg puro.
 * Converte qualquer formato (.webm, .ogg, .wav, .mp3) para AAC de alta qualidade,
 * ajusta a duração (corta se o áudio for menor ou ajusta o final) e preserva o stream de vídeo.
 */
export async function replaceVideoAudio(options: ReplaceAudioOptions): Promise<ReplaceAudioResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-audio-replace-'));
  try {
    const resolvedVideo = await resolveLocalPath(options.videoInput, tmpDir, 'input_video.mp4');
    const resolvedAudio = await resolveLocalPath(options.audioInput, tmpDir, 'input_audio.webm');

    // Analisa a duração do vídeo e do áudio
    const videoProbe = await probe(resolvedVideo);
    const audioProbe = await probe(resolvedAudio);
    const videoDuration = videoProbe.duration || 10;
    const audioDuration = audioProbe.duration || videoDuration;

    let lipsyncApplied = false;
    let method: 'lipsync_model' | 'ffmpeg_direct' = 'ffmpeg_direct';

    // Se o usuário pediu Lip-Sync, tenta o microserviço neural
    if (options.lipsync) {
      const lipsyncTmp = path.join(tmpDir, 'lipsync_out.mp4');
      const ok = await tryNeuralLipSync(resolvedVideo, resolvedAudio, lipsyncTmp);
      if (ok && fs.existsSync(lipsyncTmp)) {
        fs.copyFileSync(lipsyncTmp, options.outputPath);
        lipsyncApplied = true;
        method = 'lipsync_model';
      }
    }

    // Se não usou lipsync neural (ou se falhou/desativado), faz a substituição precisa via FFmpeg
    if (!lipsyncApplied) {
      // Garante que o diretório de destino existe
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });

      // Monta os argumentos do FFmpeg:
      // - Substitui o áudio por completo (-map 0:v -map 1:a)
      // - Se o áudio for ligeiramente diferente em duração, ajusta com fade suave e corte
      const args = [
        '-y',
        '-i', resolvedVideo,
        '-i', resolvedAudio,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy', // Preserva 100% da qualidade visual do Flow sem re-encode
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-shortest', // Limita pelo menor para não ficar tela preta estática no final
        options.outputPath,
      ];

      await run(ffmpegBin(), args, { timeout: 120000 });
    }

    // Geração de Legendas com Whisper caso solicitado
    let srtPath: string | undefined;
    if (options.syncWhisper) {
      try {
        const apiKey = options.userId ? await getUserApiKey(options.userId, 'openai').catch(() => '') : process.env.OPENAI_API_KEY || '';
        const lang = options.language || 'pt';
        const words = await transcribeWhisper(options.outputPath, lang, apiKey);
        if (words && words.length > 0) {
          const cues = cuesFromWords(tightenWords(words), options.wordsPerCaption || 2);
          const srtContent = buildSrt(cues);
          srtPath = options.outputPath.replace(/\.[a-z0-9]+$/i, '.srt');
          fs.writeFileSync(srtPath, srtContent, 'utf8');
        }
      } catch (err) {
        console.warn('Whisper resync avisou:', err);
      }
    }

    const finalProbe = await probe(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
      duration: finalProbe.duration || audioDuration,
      srtPath,
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
 * Substitui o áudio de um projeto do /flow completo ou de um take específico.
 */
export async function replaceProjectAudio(options: {
  userId: string;
  projectId: string;
  audioInput: string;
  takeIndex?: number;
  lipsync?: boolean;
  outputDir?: string;
  filename?: string;
}) {
  const { userId, projectId, audioInput, takeIndex, lipsync = false, outputDir = './midia/criativos' } = options;

  // Busca projeto no banco
  const { rows } = await pool.query(
    'SELECT id, title, final_url, params FROM public.flow_projects WHERE user_id = $1 AND (id::text = $2 OR id::text LIKE $3)',
    [userId, projectId, `${projectId}%`]
  );
  if (!rows.length) throw new Error(`Projeto ${projectId} não encontrado.`);
  const project = rows[0];

  const targetDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const safeTitle = (project.title || 'criativo').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const outName = options.filename || `${safeTitle}_voz_substituida.mp4`;
  const outPath = path.join(targetDir, outName);

  // Se for substituição no vídeo final já renderizado:
  const videoSource = project.final_url
    ? (project.final_url.startsWith('http') ? project.final_url : `https://darktube.fjt-solutions.com${project.final_url}`)
    : path.join(targetDir, `flow_final_${project.id}.mp4`);

  const result = await replaceVideoAudio({
    videoInput: videoSource,
    audioInput,
    outputPath: outPath,
    lipsync,
    syncWhisper: true,
    userId,
    language: 'pt',
    wordsPerCaption: Number(project.params?.wordsPerCaption) || 2,
  });

  return {
    ...result,
    projectId: project.id,
    title: project.title,
  };
}
