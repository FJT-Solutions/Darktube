import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
// same resolution as flow-assemble's ffmpegBin (not imported: it pulls the db client)
const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobeBin = () => process.env.FFPROBE_PATH || (ffmpegBin() === 'ffmpeg' ? 'ffprobe' : ffmpegBin().replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1'));

type Word = { palavra: string; inicio: number; fim: number };

/** A character line spoken inside a scene: the narrator goes silent while it plays, then resumes. */
export interface SceneDialogue {
  /** ready mp3/wav of the line, or `text` (+ voice) to synthesize it on the server */
  url?: string;
  text?: string;
  voiceProvider?: string;
  voiceId?: string;
  voiceGender?: 'male' | 'female';
  volume?: number;
  /** silence before the line starts (default 0.25s) and after it ends (default 0.35s) */
  gapBeforeSec?: number;
  gapAfterSec?: number;
}

async function durationOf(file: string): Promise<number> {
  const { stdout } = await run(ffprobeBin(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { timeout: 30_000, windowsHide: true });
  return Math.max(0, Number(String(stdout).trim()) || 0);
}

const tok = (s: string) => String(s || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/**
 * Opens a silence in the narration right after the last narrated word of every scene that has
 * `dialogue`, places the character line in it as a scene sfx and shifts the following words, so
 * the stage retime (scene starts on its first word) keeps the cuts on the narration.
 * Scene/word mapping mirrors retimeToVoice in html-svg-3d-stage.ts.
 */
export async function insertDialoguePauses<S extends { spokenLine?: string; durationSec?: number; dialogue?: SceneDialogue; sfx?: any[] }>(
  audioPath: string,
  words: Word[],
  scenes: S[],
  workDir: string,
  synth?: (dl: SceneDialogue, outDir: string) => Promise<string>
): Promise<{ audioPath: string; words: Word[]; scenes: S[]; pauses: number }> {
  if (!words?.length || !scenes.some((s) => s.dialogue?.url || s.dialogue?.text) || scenes.some((s) => !String(s.spokenLine || '').trim())) {
    return { audioPath, words, scenes, pauses: 0 };
  }
  const counts = scenes.map((s) => Math.max(1, tok(String(s.spokenLine))));
  const totalTok = counts.reduce((a, b) => a + b, 0);
  const firstIdx: number[] = [];
  let cum = 0;
  for (const c of counts) {
    firstIdx.push(Math.min(words.length - 1, Math.round((cum * words.length) / totalTok)));
    cum += c;
  }

  const out = scenes.map((s) => ({ ...s, sfx: [...(s.sfx || [])] }));
  const shifted = words.map((w) => ({ ...w }));
  // [cut point in the ORIGINAL narration, silence length]
  const cuts: Array<{ at: number; len: number }> = [];
  let offset = 0;
  for (let i = 0; i < out.length; i++) {
    const dl = out[i].dialogue;
    if (!dl?.url && !(dl?.text && synth)) continue;
    let file = dl.url || '';
    if (!file && dl.text && synth) {
      const dir = fs.mkdtempSync(path.join(workDir, `line_${i}_`));
      file = await synth(dl, dir).catch(() => '');
      if (!file) continue;
    } else if (/^https?:\/\//i.test(file)) {
      const res = await fetch(file, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
      if (!res?.ok) continue;
      file = path.join(workDir, `dialogue_${i}${path.extname(new URL(String(dl.url)).pathname) || '.mp3'}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    const d = await durationOf(file).catch(() => 0);
    if (!d) continue;
    const lastIdx = i + 1 < out.length ? Math.max(firstIdx[i], firstIdx[i + 1] - 1) : words.length - 1;
    const before = dl.gapBeforeSec ?? 0.25;
    const len = before + d + (dl.gapAfterSec ?? 0.35);
    const at = words[lastIdx].fim;
    cuts.push({ at, len });
    // scene i starts on its first word (minus the 0.08s lead of the retime); scene 0 starts at 0
    const sceneStart = i === 0 ? 0 : Math.max(0, shifted[firstIdx[i]].inicio - 0.08);
    out[i].sfx.push({ url: `file://${file}`, atSec: +(at + offset + before - sceneStart).toFixed(3), volume: dl.volume ?? 1 });
    for (let k = lastIdx + 1; k < shifted.length; k++) {
      shifted[k].inicio = +(shifted[k].inicio + len).toFixed(3);
      shifted[k].fim = +(shifted[k].fim + len).toFixed(3);
    }
    out[i].durationSec = Number(out[i].durationSec || 0) + len;
    offset += len;
  }
  if (!cuts.length) return { audioPath, words, scenes, pauses: 0 };

  // narration = segments of the original audio with silences spliced at each cut point
  const parts: string[] = [];
  const labels: string[] = [];
  let prev = 0;
  cuts.forEach((c, k) => {
    parts.push(`[0:a]atrim=start=${prev.toFixed(3)}:end=${c.at.toFixed(3)},asetpts=PTS-STARTPTS[n${k}]`);
    parts.push(`aevalsrc=0:d=${c.len.toFixed(3)}:s=44100:c=stereo[z${k}]`);
    parts.push(`[n${k}]aresample=44100,aformat=channel_layouts=stereo[m${k}]`);
    labels.push(`[m${k}][z${k}]`);
    prev = c.at;
  });
  parts.push(`[0:a]atrim=start=${prev.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[tail]`);
  const filter = `${parts.join(';')};${labels.join('')}[tail]concat=n=${cuts.length * 2 + 1}:v=0:a=1[a]`;
  const outPath = path.join(workDir, 'narration_with_pauses.mp3');
  await run(ffmpegBin(), ['-y', '-loglevel', 'error', '-i', audioPath, '-filter_complex', filter, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', outPath], { timeout: 120_000, windowsHide: true });
  return { audioPath: outPath, words: shifted, scenes: out, pauses: cuts.length };
}
