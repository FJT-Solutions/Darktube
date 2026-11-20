import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pool } from '@/lib/db-client';
import { cleanCaptionText, ffmpegBin, srtTime, wrapCaption } from '@/lib/flow-assemble';
import { formatDeliveryDuration } from '@/lib/render-timing';
import { uploadMediaFile } from '@/lib/storage';
import {
  resolveVoiceWithTimestamps,
  type VoiceGender,
  type VoiceProviderChoice,
} from '@/lib/voice-resolver';

const runExec = promisify(execFile);

export interface AutoClipCandidate {
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  peakSec: number;
  energyScore: number;
  viralScore: number;
  reason: string;
}

export interface AnalyzeLivePeaksResult {
  sourceUrl: string;
  durationSec: number;
  peaksFound: number;
  clips: AutoClipCandidate[];
  audioSourceNote: string;
}

export function findYtDlpBinary(): string {
  const candidates = [
    process.env.YTDLP_PATH,
    path.join(process.cwd(), 'yt-dlp'),
    '/app/yt-dlp',
    path.join(process.cwd(), '.next', 'standalone', 'yt-dlp'),
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return 'yt-dlp';
}

function buildCookieFile(): { path?: string; cleanup: () => void } {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw || raw.trim().length < 10) return { cleanup: () => {} };
  try {
    const fp = path.join(os.tmpdir(), `dt_ac_cookies_${Date.now()}.txt`);
    fs.writeFileSync(fp, raw, 'utf8');
    return {
      path: fp,
      cleanup: () => {
        try {
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {}
      },
    };
  } catch {
    return { cleanup: () => {} };
  }
}

async function resolveInputMedia(src: string, outDir: string, fallbackName: string): Promise<string> {
  const trimmed = String(src || '').trim();
  if (!trimmed) throw new Error('Origem de áudio/vídeo vazia.');

  if (trimmed.startsWith('/api/storage/')) {
    const fn = decodeURIComponent(trimmed.replace('/api/storage/', '').split('?')[0]);
    const res = await pool.query(`SELECT content FROM public.storage_files WHERE filename = $1 LIMIT 1`, [fn]);
    if (!res.rows[0]?.content) {
      throw new Error(`Arquivo "${fn}" não encontrado no storage do DarkTube.`);
    }
    const dst = path.join(outDir, fn);
    fs.writeFileSync(dst, res.rows[0].content);
    return dst;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const abs = path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(abs)) return abs;
    if (fs.existsSync(trimmed)) return trimmed;
    throw new Error(`Arquivo local não encontrado: ${trimmed}`);
  }

  // URL HTTP direta de arquivo de mídia (.mp3, .wav, .m4a, .mp4, .webm)
  const cleanUrl = trimmed.split('?')[0].toLowerCase();
  if (/\.(mp3|wav|m4a|ogg|aac|mp4|mov|webm)$/.test(cleanUrl)) {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`Falha ao baixar mídia (${res.status}) de ${trimmed}`);
    const ext = path.extname(cleanUrl) || '.mp4';
    const dst = path.join(outDir, `${fallbackName}${ext}`);
    fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
    return dst;
  }

  return trimmed;
}

/**
 * Pipeline Audio-First ($0, ref. #30): baixa APENAS o áudio quando possível e encontra os picos de
 * energia vocal (gritos, risadas, debates intensos) para recortar os melhores momentos virais.
 */
export async function analyzeLiveAudioPeaks(opts: {
  sourceUrl?: string;
  audioPathOrUrl?: string;
  minClipSec?: number;
  maxClipSec?: number;
  topN?: number;
}): Promise<AnalyzeLivePeaksResult> {
  const minClipSec = Math.max(12, Math.min(45, Number(opts.minClipSec) || 22));
  const maxClipSec = Math.max(minClipSec + 4, Math.min(75, Number(opts.maxClipSec) || 40));
  const topN = Math.max(1, Math.min(8, Number(opts.topN) || 4));
  const target = String(opts.audioPathOrUrl || opts.sourceUrl || '').trim();
  if (!target) {
    throw new Error('Informe "sourceUrl" ou "audioPathOrUrl" da live/podcast para analisar.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_autoclip_ana_'));
  const cookies = buildCookieFile();

  try {
    let localAudioPath = '';
    let audioSourceNote = '';

    const resolved = await resolveInputMedia(target, tmpDir, 'input_media');
    if (fs.existsSync(resolved)) {
      localAudioPath = resolved;
      audioSourceNote = 'Áudio/mídia carregado diretamente sem necessidade de scraping externo.';
    } else {
      // Link web (YouTube / Twitch / Kick): baixar apenas stream de áudio leve (Audio-First)
      const ytDlp = findYtDlpBinary();
      const outTpl = path.join(tmpDir, 'audio_only.%(ext)s');
      const args = [
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '5',
        ...(cookies.path ? ['--cookies', cookies.path] : []),
        ...(resolved.includes('youtube.com') || resolved.includes('youtu.be')
          ? ['--extractor-args', 'youtube:player_client=web_creator,mweb,ios']
          : []),
        '-o', outTpl,
        resolved,
      ];
      await runExec(ytDlp, args, { timeout: 240_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith('audio_only'));
      if (!files.length) {
        throw new Error('yt-dlp não retornou faixa de áudio para esta URL.');
      }
      localAudioPath = path.join(tmpDir, files[0]);
      audioSourceNote = 'Pipeline Audio-First: apenas a faixa de áudio foi baixada com yt-dlp para economizar largura e CPU.';
    }

    // Extrai PCM s16le 8kHz mono para medir RMS por segundo em milissegundos
    const pcmPath = path.join(tmpDir, 'mono8k.pcm');
    await runExec(
      ffmpegBin(),
      ['-y', '-loglevel', 'error', '-i', localAudioPath, '-ac', '1', '-ar', '8000', '-f', 's16le', pcmPath],
      { timeout: 120_000, windowsHide: true }
    );

    const pcmBuf = fs.readFileSync(pcmPath);
    const bytesPerSec = 8000 * 2;
    const totalSec = Math.max(1, Math.floor(pcmBuf.length / bytesPerSec));
    const secRms: number[] = [];

    for (let s = 0; s < totalSec; s++) {
      const startB = s * bytesPerSec;
      const endB = Math.min(pcmBuf.length, startB + bytesPerSec);
      let sumSq = 0;
      let count = 0;
      for (let off = startB; off + 1 < endB; off += 2) {
        const sample = pcmBuf.readInt16LE(off) / 32768;
        sumSq += sample * sample;
        count++;
      }
      secRms.push(count > 0 ? Math.sqrt(sumSq / count) : 0);
    }

    const avgRms = secRms.reduce((a, b) => a + b, 0) / Math.max(1, secRms.length);
    const peakCandidates = secRms
      .map((rms, sec) => ({ sec, rms }))
      .sort((a, b) => b.rms - a.rms);

    const picked: AutoClipCandidate[] = [];
    const targetSpan = Math.round((minClipSec + maxClipSec) / 2);

    for (const cand of peakCandidates) {
      if (picked.length >= topN) break;
      const startSec = Math.max(0, Math.round(cand.sec - targetSpan * 0.35));
      const endSec = Math.min(totalSec, Math.max(startSec + minClipSec, Math.min(totalSec, startSec + targetSpan)));
      if (endSec - startSec < Math.min(8, totalSec)) continue;

      const overlaps = picked.some((p) => !(endSec <= p.startSec + 4 || startSec >= p.endSec - 4));
      if (overlaps) continue;

      const rel = avgRms > 0 ? cand.rms / avgRms : 1;
      const viralScore = Math.max(55, Math.min(99, Math.round(62 + Math.min(37, (rel - 1) * 26))));
      picked.push({
        index: picked.length + 1,
        startSec,
        endSec,
        durationSec: +(endSec - startSec).toFixed(1),
        peakSec: cand.sec,
        energyScore: +cand.rms.toFixed(4),
        viralScore,
        reason:
          rel >= 1.55
            ? 'Pico agudo de entusiasmo / debate / risada acima da média da transmissão.'
            : 'Trecho sustentado com fala densa e variação dinâmica forte.',
      });
    }

    if (picked.length === 0) {
      picked.push({
        index: 1,
        startSec: 0,
        endSec: Math.min(totalSec, targetSpan),
        durationSec: Math.min(totalSec, targetSpan),
        peakSec: Math.floor(Math.min(totalSec, targetSpan) / 2),
        energyScore: +avgRms.toFixed(4),
        viralScore: 70,
        reason: 'Corte inicial automático do bloco de abertura.',
      });
    }

    picked.sort((a, b) => a.startSec - b.startSec);
    picked.forEach((p, idx) => {
      p.index = idx + 1;
    });

    return {
      sourceUrl: target,
      durationSec: totalSec,
      peaksFound: picked.length,
      clips: picked,
      audioSourceNote,
    };
  } finally {
    cookies.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export interface RenderAutoClipInput {
  userId: string;
  sourceUrl: string;
  startSec: number;
  endSec: number;
  layout?: 'vertical_center' | 'split_screen';
  gameplayUrl?: string;
  commentIntroText?: string;
  voiceProvider?: VoiceProviderChoice;
  voiceGender?: VoiceGender;
  voiceId?: string;
  voiceName?: string;
  audioPathOrUrl?: string;
  title?: string;
  burnCaptions?: boolean;
  onProgress?: (pct: number) => Promise<void> | void;
}

export interface RenderAutoClipResult {
  videoUrl: string;
  durationSec: number;
  width: number;
  height: number;
  layoutUsed: 'vertical_center' | 'split_screen';
  hasCommentIntro: boolean;
  renderDurationMs: number;
  renderDurationLabel: string;
}

/**
 * Corta apenas o trecho escolhido [startSec..endSec] de uma live/podcast, monta enquadramento
 * 9:16 (Vertical Center ou Split-Screen) e opcionalmente injeta um bloco inicial no Modo Comentário (TTS).
 */
export async function renderAutoLiveClip(input: RenderAutoClipInput): Promise<RenderAutoClipResult> {
  const startMs = Date.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt_autoclip_ren_'));
  const cookies = buildCookieFile();

  const startSec = Math.max(0, Number(input.startSec) || 0);
  const endSec = Math.max(startSec + 4, Number(input.endSec) || startSec + 25);
  const clipDur = Math.min(90, endSec - startSec);
  const layout: 'vertical_center' | 'split_screen' = input.layout === 'split_screen' ? 'split_screen' : 'vertical_center';

  try {
    if (input.onProgress) await input.onProgress(10);

    // 1. Obter vídeo apenas no trecho desejado
    let sectionPath = '';
    const resolved = await resolveInputMedia(input.sourceUrl, tmpDir, 'src_clip');
    if (fs.existsSync(resolved)) {
      sectionPath = path.join(tmpDir, 'clip_section.mp4');
      await runExec(
        ffmpegBin(),
        [
          '-y',
          '-loglevel', 'error',
          '-ss', startSec.toFixed(2),
          '-t', clipDur.toFixed(2),
          '-i', resolved,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-c:a', 'aac',
          '-ar', '44100',
          '-ac', '2',
          sectionPath,
        ],
        { timeout: 180_000, windowsHide: true }
      );
    } else {
      const ytDlp = findYtDlpBinary();
      sectionPath = path.join(tmpDir, 'clip_section.mp4');
      const secArg = `*${Math.floor(startSec)}-${Math.ceil(startSec + clipDur)}`;
      await runExec(
        ytDlp,
        [
          '--no-warnings',
          '--no-playlist',
          '--no-check-certificates',
          '--download-sections', secArg,
          '--force-keyframes-at-cuts',
          '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4',
          ...(cookies.path ? ['--cookies', cookies.path] : []),
          '-o', sectionPath,
          resolved,
        ],
        { timeout: 240_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }
      );
    }

    if (!fs.existsSync(sectionPath)) {
      throw new Error('Não foi possível cortar o trecho da live.');
    }
    if (input.onProgress) await input.onProgress(40);

    // 2. Renderizar layout 9:16 principal (split_screen ou vertical_center com fundo desfocado)
    const verticalClip = path.join(tmpDir, 'clip_916.mp4');
    if (layout === 'split_screen') {
      let bottomInputPath: string | null = null;
      if (input.gameplayUrl) {
        try {
          const gp = await resolveInputMedia(input.gameplayUrl, tmpDir, 'gameplay_bg');
          if (fs.existsSync(gp)) bottomInputPath = gp;
        } catch {}
      }

      if (bottomInputPath) {
        await runExec(
          ffmpegBin(),
          [
            '-y', '-loglevel', 'error',
            '-i', sectionPath,
            '-stream_loop', '-1', '-i', bottomInputPath,
            '-t', clipDur.toFixed(2),
            '-filter_complex',
            '[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[top];[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[bot];[top][bot]vstack=inputs=2[v]',
            '-map', '[v]', '-map', '0:a?',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            verticalClip,
          ],
          { timeout: 180_000, windowsHide: true }
        );
      } else {
        // Metade inferior cinemática em espelho escuro + brilho estilizado se gameplay não for fornecida
        await runExec(
          ffmpegBin(),
          [
            '-y', '-loglevel', 'error',
            '-i', sectionPath,
            '-filter_complex',
            '[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[top];[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,boxblur=16:4,eq=brightness=-0.18:saturation=1.25,setsar=1[bot];[top][bot]vstack=inputs=2[v]',
            '-map', '[v]', '-map', '0:a?',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            verticalClip,
          ],
          { timeout: 180_000, windowsHide: true }
        );
      }
    } else {
      await runExec(
        ffmpegBin(),
        [
          '-y', '-loglevel', 'error',
          '-i', sectionPath,
          '-filter_complex',
          '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=22:6,eq=brightness=-0.22,setsar=1[bg];[0:v]scale=1080:-2:force_original_aspect_ratio=decrease,setsar=1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]',
          '-map', '[v]', '-map', '0:a?',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
          verticalClip,
        ],
        { timeout: 180_000, windowsHide: true }
      );
    }

    if (input.onProgress) await input.onProgress(68);

    // 3. Opcional: Modo Comentário (intro TTS narrada com legenda Zero-Símbolos)
    const commentClean = cleanCaptionText(input.commentIntroText || '');
    let finalMp4 = verticalClip;
    let finalDuration = clipDur;
    let hasCommentIntro = false;

    if (commentClean.length >= 6) {
      if (!input.voiceProvider) {
        throw new Error('Modo Comentário exige seleção explícita do provedor de voz (voiceProvider).');
      }
      const voiceRes = await resolveVoiceWithTimestamps({
        userId: input.userId,
        scriptText: commentClean,
        outputDir: tmpDir,
        audioPathOrUrl: input.audioPathOrUrl,
        voiceProvider: input.voiceProvider,
        voiceGender: input.voiceGender || 'male',
        voiceId: input.voiceId,
        voiceName: input.voiceName,
        language: 'pt-BR',
      });
      const introDur = Math.max(2.2, Math.min(18, voiceRes.durationSec + 0.35));
      const introMp4 = path.join(tmpDir, 'comment_intro.mp4');

      // Card estilizado usando o primeiro frame borrado do próprio corte
      const srtPath = path.join(tmpDir, 'intro.srt');
      fs.writeFileSync(
        srtPath,
        `1\n${srtTime(0)} --> ${srtTime(introDur)}\n${wrapCaption(commentClean, 34)}\n`,
        'utf8'
      );

      const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      try {
        await runExec(
          ffmpegBin(),
          [
            '-y', '-loglevel', 'error',
            '-t', introDur.toFixed(2), '-i', verticalClip,
            '-i', voiceRes.audioPath,
            '-filter_complex',
            `[0:v]boxblur=12:4,eq=brightness=-0.28,subtitles='${escapedSrt}':force_style='FontSize=20,Bold=1,PrimaryColour=&H000AD6FF,OutlineColour=&H00000000,Outline=2,Alignment=10'[v]`,
            '-map', '[v]', '-map', '1:a',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
            '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            '-shortest', introMp4,
          ],
          { timeout: 120_000, windowsHide: true }
        );
      } catch {
        // Fallback sem libass se o FFmpeg do host não suportar subtitles filter
        await runExec(
          ffmpegBin(),
          [
            '-y', '-loglevel', 'error',
            '-t', introDur.toFixed(2), '-i', verticalClip,
            '-i', voiceRes.audioPath,
            '-filter_complex', '[0:v]boxblur=14:4,eq=brightness=-0.25[v]',
            '-map', '[v]', '-map', '1:a',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
            '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            '-shortest', introMp4,
          ],
          { timeout: 120_000, windowsHide: true }
        );
      }

      if (fs.existsSync(introMp4)) {
        const joinedMp4 = path.join(tmpDir, 'joined_autoclip.mp4');
        await runExec(
          ffmpegBin(),
          [
            '-y', '-loglevel', 'error',
            '-i', introMp4,
            '-i', verticalClip,
            '-filter_complex', '[0:v]fps=30,setsar=1[v0];[1:v]fps=30,setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]',
            '-map', '[v]', '-map', '[a]',
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
            joinedMp4,
          ],
          { timeout: 180_000, windowsHide: true }
        );
        finalMp4 = joinedMp4;
        finalDuration = +(introDur + clipDur).toFixed(1);
        hasCommentIntro = true;
      }
    }

    if (input.onProgress) await input.onProgress(90);

    const fileName = `autoclip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp4`;
    const videoUrl = await uploadMediaFile(fs.readFileSync(finalMp4), fileName, 'video/mp4');
    const elapsedMs = Math.max(0, Date.now() - startMs);
    const renderDurationLabel = formatDeliveryDuration(elapsedMs);
    console.log(`[AutoClipper] ✅ Corte ${layout} entregue em ${renderDurationLabel} (${finalDuration}s)`);

    return {
      videoUrl,
      durationSec: finalDuration,
      width: 1080,
      height: 1920,
      layoutUsed: layout,
      hasCommentIntro,
      renderDurationMs: elapsedMs,
      renderDurationLabel,
    };
  } finally {
    cookies.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
